/* 여신 목업 상태: 대출, 리스크 경보, 이벤트 신호. 모두 가상 데이터입니다.
 * 심사 목업(bank.ts)도 집계에 쓰므로 여기서는 공통 상태(shared.ts)만 가져옵니다. */
import type { AlertStage, LoanDetail, RiskAlert, RiskEvent, RiskSignalKind } from '../api/types';
import { settings } from './shared';

type LoanRecord = Omit<LoanDetail, 'flagCount'>;

const flag = (id: string, title: string, detail: string) => ({ id, title, detail, checked: false });

export const loans: LoanRecord[] = [
  {
    id: 'LN-14',
    companyName: '청운테크(주)',
    orderId: 'PO-1002',
    orderItem: '브래킷 도금',
    counterpartyName: '에이스정밀(주)',
    amount: 320_000_000,
    status: 'PENDING',
    appliedAt: '2026-11-22',
    dueDate: '2027-03-06',
    orderAmount: 400_000_000,
    ratio: 80,
    orderStatus: 'ACCEPTED',
    chainPath: ['한성모터스(주)', '에이스정밀(주)', '청운테크(주)'],
    limit: { amount: 500_000_000, used: 0 },
    grade: '관찰',
    alertStage: '관심',
    account: '1005-402-551200',
    flags: [
      flag('F1', '첫 거래 상대와의 1억 원 이상 발주', '에이스정밀(주)와의 첫 발주입니다.'),
      flag('F2', '평소 발주 규모의 3배 이상', '최근 6개월 평균 1억 3,000만 원 대비 3.1배'),
    ],
  },
  {
    id: 'LN-15',
    companyName: '에이스정밀(주)',
    orderId: 'PO-1008',
    orderItem: '도어 힌지 브래킷',
    counterpartyName: '한성모터스(주)',
    amount: 200_000_000,
    status: 'PENDING',
    appliedAt: '2026-11-23',
    dueDate: '2027-02-28',
    orderAmount: 500_000_000,
    ratio: 80,
    orderStatus: 'DELIVERED',
    chainPath: ['한성모터스(주)', '에이스정밀(주)'],
    limit: { amount: 800_000_000, used: 500_000_000 },
    grade: '안정',
    alertStage: '정상',
    account: '1005-118-330921',
    flags: [],
  },
  ...(
    [
      [
        'LN-1',
        '에이스정밀(주)',
        'PO-1001',
        '도어 모듈 브래킷',
        '한성모터스(주)',
        500_000_000,
        'EXECUTED',
        '2026-11-13',
        '2027-03-21',
      ],
      [
        'LN-12',
        '한성모터스(주)',
        'PO-2031',
        '루프 레일',
        '대한오토(주)',
        600_000_000,
        'EXECUTED',
        '2026-11-06',
        '2027-02-16',
      ],
      [
        'LN-9',
        '한성모터스(주)',
        'PO-2018',
        '스티어링 브래킷',
        '미래모빌리티(주)',
        320_000_000,
        'EXECUTED',
        '2026-10-02',
        '2027-02-03',
      ],
      [
        'LN-7',
        '동진산업(주)',
        'PO-1003',
        '강판 절단',
        '청운테크(주)',
        80_000_000,
        'OVERDUE',
        '2026-09-20',
        '2026-11-11',
      ],
      [
        'LN-4',
        '한성모터스(주)',
        'PO-1996',
        '범퍼 마운트',
        '대한오토(주)',
        440_000_000,
        'REPAID',
        '2026-08-21',
        '2026-12-10',
      ],
    ] as const
  ).map(
    ([
      id,
      companyName,
      orderId,
      orderItem,
      counterpartyName,
      amount,
      status,
      executedAt,
      dueDate,
    ]): LoanRecord => ({
      id,
      companyName,
      orderId,
      orderItem,
      counterpartyName,
      amount,
      status,
      appliedAt: executedAt,
      executedAt,
      dueDate,
      orderAmount: Math.round(amount / 0.8),
      ratio: 80,
      orderStatus: 'ACCEPTED',
      chainPath: [counterpartyName, companyName],
      limit: { amount: amount * 2, used: amount },
      grade: companyName === '동진산업(주)' ? '제외' : '안정',
      alertStage: companyName === '동진산업(주)' ? '주의' : '정상',
      account: '1005-***-******',
      flags: [],
      decidedBy: '이도윤(여신)',
      decidedAt: executedAt,
    }),
  ),
];

export const paymentDelays = [
  {
    orderId: 'PO-0994',
    item: '표면 코팅',
    from: '청운테크(주)',
    to: '동진산업(주)',
    amount: 90_000_000,
    payDueDate: '2026-11-05',
  },
];

/** 신호의 기본 내용. 점수는 운영 설정의 경보 가중치로 매번 계산합니다. */
export type BaseSignal = { kind: RiskSignalKind; label: string; detail: string; eventId?: string };

export const alertBase: (Omit<RiskAlert, 'signals' | 'score' | 'stage' | 'immediate'> & {
  signals: BaseSignal[];
  /** 부도·회생 신청·휴폐업 이벤트로 바로 경보 */
  immediate?: string;
})[] = [
  {
    id: 'AL-1',
    companyName: '동진산업(주)',
    tier: '3차 협력사',
    industry: '소재 절단',
    signals: [
      { kind: 'repayDelay', label: '상환 지연', detail: 'LN-7 만기 2026-11-11 · 12일 지연' },
      { kind: 'orderDrop', label: '발주 급감', detail: '전월 대비 -45%' },
      { kind: 'deliveryDelay', label: '납품 지연', detail: '최근 30일 2건' },
    ],
    actions: [{ type: '관찰 강화', by: '이도윤(여신)', at: '2026-11-21' }],
    propagation: [
      {
        name: '청운테크(주)',
        distance: 1,
        dependency: 62,
        exposure: 100_000_000,
        grade: '관찰',
        risk: 48,
      },
      {
        name: '에이스정밀(주)',
        distance: 2,
        dependency: 18,
        exposure: 400_000_000,
        grade: '안정',
        risk: 14,
      },
      {
        name: '한성모터스(주)',
        distance: 3,
        dependency: 5,
        exposure: 1_000_000_000,
        grade: '안정',
        risk: 4,
      },
    ],
  },
  {
    id: 'AL-2',
    companyName: '청운테크(주)',
    tier: '2차 협력사',
    industry: '표면 처리',
    signals: [
      {
        kind: 'payDelay',
        label: '지급 지연',
        detail: 'PO-0994 지급 예정일 2026-11-05 · 18일 지연',
      },
    ],
    actions: [],
    propagation: [
      {
        name: '에이스정밀(주)',
        distance: 1,
        dependency: 40,
        exposure: 400_000_000,
        grade: '안정',
        risk: 26,
      },
      {
        name: '동진산업(주)',
        distance: 1,
        dependency: 35,
        exposure: 90_000_000,
        grade: '제외',
        risk: 22,
      },
      {
        name: '한성모터스(주)',
        distance: 2,
        dependency: 8,
        exposure: 1_000_000_000,
        grade: '안정',
        risk: 6,
      },
    ],
  },
];

/** 이번 주(목업 기준일 주간) 이전에 이미 끝낸 조치 수 */
export const DONE_BEFORE = 1;

/* 등록된 이벤트. 이 목록의 예전 이벤트는 이미 위 신호에 반영된 것으로 보고,
 * 이 화면에서 새로 등록한 이벤트만 신호(이벤트 +점수 또는 즉시 경보)로 더해집니다. */
export const events: RiskEvent[] = [
  {
    id: 'EV-3',
    companyName: '동진산업(주)',
    type: '체납',
    occurredAt: '2026-11-15',
    registeredBy: '이도윤(여신)',
    cancelled: false,
  },
  {
    id: 'EV-2',
    companyName: '청운테크(주)',
    type: '신용등급 하락',
    detail: 'BB → BB-',
    occurredAt: '2026-11-08',
    registeredBy: '이도윤(여신)',
    cancelled: false,
  },
  {
    id: 'EV-1',
    companyName: '세진테크(주)',
    type: '체납',
    occurredAt: '2026-10-02',
    registeredBy: '이도윤(여신)',
    cancelled: true,
  },
];

export const STAGE_ORDER: AlertStage[] = ['정상', '관심', '주의', '경보'];

/** 여신 대시보드·공통 집계에 쓰는 숫자 */
export function loanCounts() {
  const balance = loans
    .filter((l) => l.status === 'EXECUTED' || l.status === 'OVERDUE')
    .reduce((s, l) => s + l.amount, 0);
  return {
    loanPending: loans.filter((l) => l.status === 'PENDING').length,
    alertCompanies: computeAlerts().length,
    /** 이 목록 밖의 대출 잔액(6억 3,000만 원)을 더한 합계 */
    loanBalance: balance + 630_000_000,
  };
}

/** 신호 점수와 경보 단계를 운영 설정값으로 계산합니다. 정상 단계인 기업은 빠집니다. */
export function computeAlerts(): RiskAlert[] {
  const w = settings.weights;
  const st = settings.stages;
  return alertBase
    .map((a) => {
      const signals = a.signals.map(({ kind, label, detail }) => ({
        kind,
        label,
        detail,
        points: w[kind],
      }));
      const score = signals.reduce((s, x) => s + x.points, 0);
      const stage: AlertStage = a.immediate
        ? '경보'
        : score >= st.alert
          ? '경보'
          : score >= st.caution
            ? '주의'
            : score >= st.watch
              ? '관심'
              : '정상';
      return { ...a, signals, score, stage };
    })
    .filter((a) => a.stage !== '정상')
    .sort(
      (x, y) => STAGE_ORDER.indexOf(y.stage) - STAGE_ORDER.indexOf(x.stage) || y.score - x.score,
    );
}
