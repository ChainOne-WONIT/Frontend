/* 은행 백오피스(심사) 목업 데이터와 동작. 모든 기업·거래 데이터는 가상입니다. */
import { ApiError, mockDelay } from '../api/client';
import type {
  BankLoginResponse,
  BankUser,
  BankSummary,
  ChainView,
  CompanyReviewInfo,
  CompanyReviewOverview,
  CompanyReviewPatch,
  GradeLabel,
  KoditResultRequest,
  ReviewApplication,
  ReviewApplications,
  ReviewDashboard,
  ReviewDecisionRequest,
  ReviewDetail,
  ViewReason,
} from '../api/types';
import { won } from '../lib/format';
import { addAudit, settings, signupApps } from './shared';

const AS_OF = '2026-11-23';
const REVIEWER = '김하늘(심사)';
const today = () => new Date().toISOString().slice(0, 10);
const addYear = (d: string) => `${Number(d.slice(0, 4)) + 1}${d.slice(4)}`;

// ---------- 로그인 ----------
/** 시연용 은행 직원 계정. 여신 담당 화면은 아직 없습니다. */
export const MOCK_BANK_ACCOUNTS: (BankUser & { password: string; ready: boolean })[] = [
  {
    type: 'bank',
    employeeNo: 'review01',
    password: 'chainone1!',
    name: '김하늘',
    role: 'review',
    roleLabel: '심사 담당',
    ready: true,
  },
  {
    type: 'bank',
    employeeNo: 'ops01',
    password: 'chainone1!',
    name: '박서진',
    role: 'ops',
    roleLabel: '운영 담당',
    ready: true,
  },
  {
    type: 'bank',
    employeeNo: 'loan01',
    password: 'chainone1!',
    name: '이도윤',
    role: 'loan',
    roleLabel: '여신 담당',
    ready: false,
  },
];

export function mockLoginBank(employeeNo: string, password: string): Promise<BankLoginResponse> {
  const acc = MOCK_BANK_ACCOUNTS.find((a) => a.employeeNo === employeeNo);
  if (!acc || acc.password !== password) {
    return Promise.reject(
      new ApiError('직원번호 또는 비밀번호가 맞지 않습니다.', 401, 'INVALID_CREDENTIALS'),
    );
  }
  if (!acc.ready) {
    return Promise.reject(
      new ApiError(`${acc.roleLabel} 화면은 아직 준비 중입니다.`, 501, 'NOT_IMPLEMENTED'),
    );
  }
  const { type, name, role, roleLabel } = acc;
  return mockDelay({
    accessToken: `mock-token-${employeeNo}`,
    user: { type, employeeNo, name, role, roleLabel },
  });
}

// ---------- 기업 심사 정보 ----------
const companies: CompanyReviewInfo[] = [
  {
    id: 'X',
    name: '한성모터스(주)',
    grade: '안정',
    years: 28,
    revenue: 164_000_000_000,
    debtRatio: 230,
    pd: 1.2,
    overdue: false,
    taxArrears: false,
    closed: false,
    bankruptcy: false,
  },
  {
    id: 'A',
    name: '에이스정밀(주)',
    grade: '안정',
    years: 14,
    revenue: 12_000_000_000,
    debtRatio: 160,
    pd: 2.1,
    overdue: false,
    taxArrears: false,
    closed: false,
    bankruptcy: false,
  },
  {
    id: 'B',
    name: '청운테크(주)',
    grade: '관찰',
    years: 7,
    revenue: 3_800_000_000,
    debtRatio: 210,
    pd: 5.3,
    overdue: false,
    taxArrears: false,
    closed: false,
    bankruptcy: false,
  },
  {
    id: 'C',
    name: '동진산업(주)',
    grade: '제외',
    years: 3,
    revenue: 900_000_000,
    debtRatio: 340,
    pd: 9.4,
    overdue: false,
    taxArrears: true,
    closed: false,
    bankruptcy: false,
  },
  {
    id: 'D',
    name: '대광금속(주)',
    grade: '안정',
    years: 11,
    revenue: 6_400_000_000,
    debtRatio: 180,
    pd: 3.1,
    overdue: false,
    taxArrears: false,
    closed: false,
    bankruptcy: false,
  },
];

const editLogs: CompanyReviewOverview['logs'] = [
  { date: '2026-11-20', actor: REVIEWER, text: '동진산업(주) · 세금 체납 없음 → 있음' },
  { date: '2026-11-12', actor: REVIEWER, text: '청운테크(주) · 부채비율 190% → 210%' },
];

/** 예측 부실확률로 등급: 안정 기준 미만 안정 · 제외 기준 이상 제외 · 그 사이 관찰 (운영 설정값) */
function gradeOf(pd: number): GradeLabel {
  const g = settings.grade;
  return pd < g.stableBelow ? '안정' : pd >= g.excludeFrom ? '제외' : '관찰';
}

// ---------- 한도 신청 ----------
const applications: ReviewApplication[] = [
  {
    id: 'LA-31',
    companyId: 'C',
    companyName: '동진산업(주)',
    counterpartyName: '청운테크(주)',
    appliedAt: '2026-11-20',
    pd: 9.4,
    status: 'REVIEW',
  },
  {
    id: 'LA-32',
    companyId: 'D',
    companyName: '대광금속(주)',
    counterpartyName: '에이스정밀(주)',
    appliedAt: '2026-11-22',
    pd: 3.1,
    status: 'REVIEW',
  },
  {
    id: 'LA-29',
    companyId: 'B',
    companyName: '청운테크(주)',
    counterpartyName: '에이스정밀(주)',
    appliedAt: '2026-11-18',
    pd: 5.3,
    status: 'KODIT_REVIEW',
  },
  {
    id: 'LA-27',
    companyId: 'A',
    companyName: '에이스정밀(주)',
    counterpartyName: '한성모터스(주)',
    appliedAt: '2026-11-11',
    pd: 2.1,
    status: 'APPROVED',
    amount: 800_000_000,
    expireAt: '2027-11-12',
  },
  {
    id: 'LA-22',
    companyId: 'X',
    companyName: '한성모터스(주)',
    counterpartyName: '대한오토(주)',
    appliedAt: '2026-10-28',
    pd: 1.2,
    status: 'APPROVED',
    amount: 2_200_000_000,
    expireAt: '2027-10-30',
  },
  {
    id: 'LA-18',
    companyId: 'X',
    companyName: '한성모터스(주)',
    counterpartyName: '미래모빌리티(주)',
    appliedAt: '2026-08-12',
    pd: 1.2,
    status: 'APPROVED',
    amount: 800_000_000,
    expireAt: '2027-08-14',
  },
  {
    id: 'LA-20',
    companyId: 'E',
    companyName: '세진테크(주)',
    counterpartyName: '청운테크(주)',
    appliedAt: '2026-10-05',
    pd: 4.6,
    status: 'EXCLUDED',
    excludeReason: '세금 체납',
  },
];

interface Extra {
  account: string;
  factors: { text: string; delta: number }[];
  order: ReviewDetail['order'];
  chainPath: string[];
  decision?: ReviewDetail['decision'];
}

const extras: Record<string, Extra> = {
  'LA-31': {
    account: '1005-402-778800',
    factors: [
      { text: '최근 6개월 연체 2회', delta: 2.6 },
      { text: '부채비율 340%', delta: 1.5 },
      { text: '거래 기간 1년 미만', delta: 0.9 },
    ],
    order: {
      id: 'PO-1003',
      item: '강판 절단',
      amount: 100_000_000,
      dueDate: '2026-12-20',
      quantity: 6000,
      unit: '개',
      place: '청운테크(주) 시흥공장',
      status: 'ACCEPTED',
    },
    chainPath: ['한성모터스(주)', '에이스정밀(주)', '청운테크(주)', '동진산업(주)'],
  },
  'LA-32': {
    account: '1005-881-204417',
    factors: [
      { text: '업력 10년 이상', delta: -1.2 },
      { text: '최근 1년 연체 없음', delta: -0.8 },
      { text: '부채비율 180%', delta: 0.4 },
    ],
    order: {
      id: 'PO-1012',
      item: '알루미늄 주물',
      amount: 240_000_000,
      dueDate: '2026-12-28',
      quantity: 3200,
      unit: '개',
      place: '에이스정밀(주) 안산공장',
      status: 'ACCEPTED',
    },
    chainPath: ['한성모터스(주)', '에이스정밀(주)', '대광금속(주)'],
  },
  'LA-29': {
    account: '1005-317-662090',
    factors: [
      { text: '부채비율 210%', delta: 1.1 },
      { text: '매출 감소 (전년 대비 -12%)', delta: 0.9 },
      { text: '거래 기간 5년 이상', delta: -0.6 },
    ],
    order: {
      id: 'PO-1002',
      item: '브래킷 도금',
      amount: 400_000_000,
      dueDate: '2026-12-15',
      quantity: 20000,
      unit: '개',
      place: '에이스정밀(주) 안산공장',
      status: 'PENDING',
    },
    chainPath: ['한성모터스(주)', '에이스정밀(주)', '청운테크(주)'],
    decision: { result: 'PASS', by: REVIEWER, at: '2026-11-19' },
  },
};

function find(id: string) {
  const a = applications.find((x) => x.id === id);
  if (!a) throw new ApiError('신청을 찾을 수 없습니다.', 404, 'NOT_FOUND');
  return a;
}

function toDetail(a: ReviewApplication): ReviewDetail {
  const c = companies.find((x) => x.id === a.companyId);
  const e = extras[a.id] ?? {
    account: '-',
    factors: [],
    order: {
      id: '-',
      item: '-',
      amount: 0,
      dueDate: '-',
      quantity: 0,
      unit: '',
      place: '-',
      status: 'ACCEPTED' as const,
    },
    chainPath: [a.counterpartyName, a.companyName],
  };
  const checks = [
    { label: '현재 연체', ok: !c?.overdue },
    { label: '세금 체납', ok: !c?.taxArrears },
    { label: '휴·폐업', ok: !c?.closed },
    { label: '부도·회생 이력', ok: !c?.bankruptcy },
    { label: '수락된 발주', ok: e.order.status !== 'PENDING' || a.status !== 'REVIEW' },
  ];
  const label = gradeOf(a.pd);
  return {
    ...a,
    account: e.account,
    consentCount: 5,
    consentAt: a.appliedAt,
    checks,
    grade: {
      label,
      factors: e.factors,
      stableBelow: settings.grade.stableBelow,
      excludeFrom: settings.grade.excludeFrom,
    },
    order: e.order,
    chainPath: e.chainPath,
    systemDecision: checks.every((x) => x.ok) && label !== '제외' ? 'PASS' : 'EXCLUDE',
    decision: e.decision,
  };
}

// ---------- API ----------
/** 이 목록 밖에서 이미 승인된 한도 합계 (상품 전체 한도 집계용) */
const OTHER_APPROVED_LIMIT = 800_000_000;

/** 은행 역할 공통 집계. 운영 대시보드에서도 씁니다. */
export function bankSummary(): BankSummary {
  const approved = applications.filter((a) => a.status === 'APPROVED');
  return {
    counts: {
      reviewPending: applications.filter(
        (a) => a.status === 'REVIEW' || a.status === 'KODIT_REVIEW',
      ).length,
      loanPending: 2,
      alertCompanies: 2,
      signupPending: signupApps.filter((s) => s.status === 'PENDING').length,
    },
    product: {
      guaranteeTotal: 20_000_000_000,
      approvedLimitSum: OTHER_APPROVED_LIMIT + approved.reduce((s, a) => s + (a.amount ?? 0), 0),
      loanBalanceSum: 2_130_000_000,
    },
  };
}

export function mockReviewDashboard(): Promise<ReviewDashboard> {
  return mockDelay({
    asOf: AS_OF,
    ...bankSummary(),
    today: applications.filter((a) => a.status === 'REVIEW' || a.status === 'KODIT_REVIEW'),
  });
}

export function mockReviewApplications(): Promise<ReviewApplications> {
  return mockDelay({
    asOf: AS_OF,
    pending: applications.filter((a) => a.status === 'REVIEW' || a.status === 'KODIT_REVIEW'),
    done: applications.filter((a) => a.status === 'APPROVED' || a.status === 'EXCLUDED'),
  });
}

export function mockReviewDetail(id: string, reason: ViewReason): Promise<ReviewDetail> {
  try {
    const a = find(id);
    addAudit({
      actor: REVIEWER,
      kind: '조회',
      content: `심사 상세 조회 (사유: ${reason})`,
      target: `${a.id} ${a.companyName}`,
    });
    return mockDelay(toDetail(a));
  } catch (e) {
    return Promise.reject(e);
  }
}

export function mockReviewDecision(id: string, req: ReviewDecisionRequest): Promise<ReviewDetail> {
  try {
    const a = find(id);
    const d = toDetail(a);
    if (a.status !== 'REVIEW')
      throw new ApiError('이미 판정한 신청입니다.', 409, 'ALREADY_DECIDED');
    if (req.result !== d.systemDecision && !req.reason?.trim())
      throw new ApiError(
        '시스템 판정과 다르게 확정하려면 사유를 입력해 주세요.',
        400,
        'REASON_REQUIRED',
      );
    const decision = {
      result: req.result,
      reason: req.reason?.trim() || undefined,
      by: REVIEWER,
      at: today(),
    };
    extras[id] = {
      ...(extras[id] ?? {
        account: d.account,
        factors: [],
        order: d.order,
        chainPath: d.chainPath,
      }),
      decision,
    };
    addAudit({
      actor: REVIEWER,
      kind: '처리',
      content: `한도 심사 ${req.result === 'PASS' ? '통과' : '제외'}로 확정`,
      target: `${a.id} ${a.companyName}`,
    });
    if (req.result === 'PASS') {
      a.status = 'KODIT_REVIEW';
    } else {
      a.status = 'EXCLUDED';
      a.excludeReason =
        req.reason?.trim() || d.checks.find((c) => !c.ok)?.label || `예측 부실확률 ${a.pd}%`;
    }
    return mockDelay(toDetail(a));
  } catch (e) {
    return Promise.reject(e);
  }
}

export function mockKoditResult(id: string, req: KoditResultRequest): Promise<ReviewDetail> {
  try {
    const a = find(id);
    if (a.status !== 'KODIT_REVIEW')
      throw new ApiError('신보 심사 중인 신청이 아닙니다.', 409, 'INVALID_STATE');
    if (req.approved) {
      if (!req.amount || req.amount <= 0)
        throw new ApiError('승인 한도를 입력해 주세요.', 400, 'INVALID');
      a.status = 'APPROVED';
      a.amount = req.amount;
      a.expireAt = req.expireAt || addYear(today());
    } else {
      a.status = 'EXCLUDED';
      a.excludeReason = req.reason?.trim() || '신보 거절';
    }
    addAudit({
      actor: REVIEWER,
      kind: '처리',
      content: req.approved ? `신보 승인 결과 입력: ${won(a.amount)}` : '신보 거절 입력',
      target: `${a.id} ${a.companyName}`,
    });
    return mockDelay(toDetail(a));
  } catch (e) {
    return Promise.reject(e);
  }
}

export function mockCompanyReviews(): Promise<CompanyReviewOverview> {
  return mockDelay({ asOf: AS_OF, companies, logs: editLogs });
}

const FIELD_LABEL: Record<keyof CompanyReviewPatch, string> = {
  years: '업력',
  revenue: '매출',
  debtRatio: '부채비율',
  overdue: '현재 연체',
  taxArrears: '세금 체납',
  closed: '휴·폐업',
  bankruptcy: '부도·회생',
};

function show(key: keyof CompanyReviewPatch, v: number | boolean) {
  if (typeof v === 'boolean') return v ? '있음' : '없음';
  if (key === 'debtRatio') return `${v}%`;
  if (key === 'years') return `${v}년`;
  return `${Math.round(v / 1e8).toLocaleString()}억`;
}

export function mockUpdateCompanyReview(
  id: string,
  patch: CompanyReviewPatch,
): Promise<CompanyReviewOverview> {
  const c = companies.find((x) => x.id === id);
  if (!c) return Promise.reject(new ApiError('기업을 찾을 수 없습니다.', 404, 'NOT_FOUND'));
  const changes: string[] = [];
  const oldDebt = c.debtRatio;
  for (const k of Object.keys(patch) as (keyof CompanyReviewPatch)[]) {
    const v = patch[k];
    if (v === undefined || v === c[k]) continue;
    changes.push(`${FIELD_LABEL[k]} ${show(k, c[k])} → ${show(k, v)}`);
    (c as unknown as Record<string, unknown>)[k] = v;
  }
  if (changes.length) {
    // 데모: 부채비율이 바뀌면 그만큼 부실확률도 조금 움직입니다 (100%p당 0.5%p).
    if (c.debtRatio !== oldDebt) {
      c.pd = Math.max(0.5, Math.round((c.pd + (c.debtRatio - oldDebt) / 200) * 10) / 10);
      applications.filter((a) => a.companyId === id).forEach((a) => (a.pd = c.pd));
    }
    c.grade = gradeOf(c.pd);
    addAudit({
      actor: REVIEWER,
      kind: '처리',
      content: `기업 심사 정보 수정: ${changes.join(', ')}`,
      target: c.name,
    });
    editLogs.unshift({
      date: today(),
      actor: REVIEWER,
      text: `${c.name} · ${changes.join(', ')}`,
    });
  }
  return mockDelay({ asOf: AS_OF, companies, logs: editLogs });
}

// ---------- 체인 ----------
const chains: Record<string, Omit<ChainView, 'asOf' | 'roots' | 'rootId'>> = {
  X: {
    orderTotal: 1_500_000_000,
    loanBalance: 910_000_000,
    nodes: [
      { name: '한성모터스(주)', tier: '시작 기업', stage: '정상' },
      { name: '에이스정밀(주)', tier: '1차', stage: '정상' },
      { name: '청운테크(주)', tier: '2차', stage: '관심' },
      { name: '동진산업(주)', tier: '3차', stage: '주의' },
    ],
    links: [
      { orderId: 'PO-1001', amount: 1_000_000_000 },
      { orderId: 'PO-1002', amount: 400_000_000 },
      { orderId: 'PO-1003', amount: 100_000_000 },
    ],
    rows: [
      {
        orderId: 'PO-1001',
        from: '한성모터스(주)',
        to: '에이스정밀(주)',
        amount: 1_000_000_000,
        status: 'ACCEPTED',
        loan: { id: 'LN-1', amount: 500_000_000, statusLabel: '실행' },
      },
      {
        orderId: 'PO-1002',
        from: '에이스정밀(주)',
        to: '청운테크(주)',
        amount: 400_000_000,
        status: 'PENDING',
        loan: { id: 'LN-14', amount: 320_000_000, statusLabel: '승인 대기' },
      },
      {
        orderId: 'PO-1003',
        from: '청운테크(주)',
        to: '동진산업(주)',
        amount: 100_000_000,
        status: 'ACCEPTED',
        loan: { id: 'LN-7', amount: 80_000_000, statusLabel: '연체' },
      },
      {
        orderId: 'PO-1008',
        from: '한성모터스(주)',
        to: '에이스정밀(주)',
        amount: 500_000_000,
        status: 'DELIVERED',
      },
    ],
  },
  M: {
    orderTotal: 800_000_000,
    loanBalance: 300_000_000,
    nodes: [
      { name: '미래모빌리티(주)', tier: '시작 기업', stage: '정상' },
      { name: '한성모터스(주)', tier: '1차', stage: '정상' },
      { name: '대광금속(주)', tier: '2차', stage: '정상' },
    ],
    links: [
      { orderId: 'PO-2018', amount: 600_000_000 },
      { orderId: 'PO-2044', amount: 200_000_000 },
    ],
    rows: [
      {
        orderId: 'PO-2018',
        from: '미래모빌리티(주)',
        to: '한성모터스(주)',
        amount: 600_000_000,
        status: 'RECEIVED',
        loan: { id: 'LN-9', amount: 300_000_000, statusLabel: '실행' },
      },
      {
        orderId: 'PO-2044',
        from: '한성모터스(주)',
        to: '대광금속(주)',
        amount: 200_000_000,
        status: 'ACCEPTED',
      },
    ],
  },
};
const ROOTS = [
  { id: 'X', name: '한성모터스(주)' },
  { id: 'M', name: '미래모빌리티(주)' },
];

export function mockChain(rootId?: string): Promise<ChainView> {
  const id = rootId && chains[rootId] ? rootId : 'X';
  return mockDelay({ asOf: AS_OF, roots: ROOTS, rootId: id, ...chains[id] });
}
