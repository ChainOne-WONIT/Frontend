/* 은행 역할들이 함께 쓰는 목업 상태: 설정값, 처리·조회 기록, 기업 가입 신청. 모두 가상 데이터입니다. */
import type { AuditLog, OpsSettings, SignupApplication, SignupExtra } from '../api/types';

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD HH:mm' (지금 시각) */
export function nowStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------- 설정값 (운영 담당만 바꿈) ----------
export const settings: OpsSettings = {
  grade: { stableBelow: 4, excludeFrom: 8, perOrderRatio: 80 },
  weights: { payDelay: 40, repayDelay: 20, orderDrop: 20, deliveryDelay: 10, event: 10 },
  stages: { watch: 40, caution: 50, alert: 60 },
};

export const settingLogs: { date: string; actor: string; text: string }[] = [
  { date: '2026-11-20', actor: '박서진(운영)', text: '주의 기준 45점 → 50점' },
  { date: '2026-10-02', actor: '박서진(운영)', text: '지급 지연 가중치 30점 → 40점' },
];

// ---------- 처리·조회 기록 (고치거나 지울 수 없음) ----------
let seq = 100;
export const auditLogs: AuditLog[] = [
  {
    id: 'AU-10',
    at: '2026-11-23 10:12',
    actor: '이도윤(여신)',
    kind: '조회',
    content: '대출 상세 조회 (사유: 승인 심사)',
    target: 'LN-14 청운테크(주)',
  },
  {
    id: 'AU-9',
    at: '2026-11-22 16:40',
    actor: '박서진(운영)',
    kind: '조회',
    content: '가입 신청 조회',
    target: '세림소재(주)',
  },
  {
    id: 'AU-8',
    at: '2026-11-21 14:03',
    actor: '김하늘(심사)',
    kind: '조회',
    content: '심사 상세 조회 (사유: 한도 심사)',
    target: 'LA-31 동진산업(주)',
  },
  {
    id: 'AU-7',
    at: '2026-11-21 11:20',
    actor: '이도윤(여신)',
    kind: '처리',
    content: '경보 조치: 관찰 강화',
    target: '동진산업(주)',
  },
  {
    id: 'AU-6',
    at: '2026-11-20 09:55',
    actor: '박서진(운영)',
    kind: '처리',
    content: '설정값 변경: 주의 기준 45 → 50',
    target: '경보 단계 기준',
  },
  {
    id: 'AU-5',
    at: '2026-11-20 09:31',
    actor: '김하늘(심사)',
    kind: '처리',
    content: '기업 심사 정보 수정: 세금 체납 없음 → 있음',
    target: '동진산업(주)',
  },
  {
    id: 'AU-4',
    at: '2026-11-15 15:08',
    actor: '이도윤(여신)',
    kind: '처리',
    content: '이벤트 등록: 체납',
    target: '동진산업(주)',
  },
  {
    id: 'AU-3',
    at: '2026-11-13 10:47',
    actor: '이도윤(여신)',
    kind: '처리',
    content: '대출 승인',
    target: 'LN-1 에이스정밀(주)',
  },
  {
    id: 'AU-2',
    at: '2026-11-12 17:22',
    actor: '김하늘(심사)',
    kind: '처리',
    content: '신보 승인 결과 입력: 8억 원',
    target: 'LA-27 에이스정밀(주)',
  },
  {
    id: 'AU-1',
    at: '2026-11-11 13:15',
    actor: '김하늘(심사)',
    kind: '처리',
    content: '한도 심사 통과로 확정',
    target: 'LA-27 에이스정밀(주)',
  },
];

export function addAudit(entry: Omit<AuditLog, 'id' | 'at'>) {
  auditLogs.unshift({ id: `AU-${++seq}`, at: nowStamp(), ...entry });
}

// ---------- 기업 가입 신청 ----------
export const signupApps: SignupApplication[] = [
  {
    id: 'SU-12',
    loginId: 'daegwang01',
    companyName: '대광금속(주)',
    bizNo: '123-45-67890',
    ceoName: '정대광',
    industry: '금속 가공',
    email: 'dk@daegwang.example',
    appliedAt: '2026-11-23',
    consents: { financialInfo: true, creditInfo: true },
    status: 'PENDING',
  },
  {
    id: 'SU-11',
    loginId: 'serim',
    companyName: '세림소재(주)',
    bizNo: '214-86-55021',
    ceoName: '한세림',
    industry: '플라스틱 사출',
    email: 'admin@serim.example',
    appliedAt: '2026-11-22',
    consents: { financialInfo: true, creditInfo: false },
    status: 'PENDING',
  },
  {
    id: 'SU-9',
    loginId: 'mirae',
    companyName: '미래부품(주)',
    bizNo: '305-81-44120',
    ceoName: '오미래',
    industry: '전장 부품',
    email: 'ceo@mirae.example',
    appliedAt: '2026-11-14',
    consents: { financialInfo: true, creditInfo: true },
    status: 'REJECTED',
    decidedAt: '2026-11-15',
    decidedBy: '박서진(운영)',
    rejectReason: '사업자등록번호와 상호가 일치하지 않음',
  },
  {
    id: 'SU-5',
    loginId: 'dongjin',
    companyName: '동진산업(주)',
    bizNo: '412-81-90233',
    ceoName: '이동진',
    industry: '판금 가공',
    email: 'info@dongjin.example',
    appliedAt: '2026-05-01',
    consents: { financialInfo: true, creditInfo: true },
    status: 'APPROVED',
    decidedAt: '2026-05-02',
    decidedBy: '박서진(운영)',
  },
  {
    id: 'SU-3',
    loginId: 'chungwoon',
    companyName: '청운테크(주)',
    bizNo: '128-86-31107',
    ceoName: '박청운',
    industry: '표면 처리',
    email: 'admin@chungwoon.example',
    appliedAt: '2026-03-11',
    consents: { financialInfo: true, creditInfo: true },
    status: 'APPROVED',
    decidedAt: '2026-03-12',
    decidedBy: '박서진(운영)',
  },
];

const extra = (
  appliedTime: string,
  zipCode: string,
  address: string,
  addressDetail: string,
  manager: SignupExtra['manager'],
  orderSms = true,
  riskSms = false,
): SignupExtra => ({
  appliedTime,
  zipCode,
  address,
  addressDetail,
  manager,
  notifications: {
    orderProgress: { email: true, sms: orderSms },
    riskAlert: { email: true, sms: riskSms },
  },
});

/** 가입 신청서의 나머지 내용 (주소·담당자·알림 설정) */
export const signupExtras: Record<string, SignupExtra> = {
  'SU-12': extra('2026-11-23 10:42', '15588', '경기도 안산시 단원구 성곡로 112', '2층', {
    name: '김민수',
    department: '영업관리팀',
    position: '과장',
    phone: '010-2345-6789',
    email: 'dk@daegwang.example',
  }),
  'SU-11': extra(
    '2026-11-22 15:18',
    '18449',
    '경기도 화성시 동탄산단 8길 27',
    '',
    {
      name: '최유진',
      department: '경영지원팀',
      position: '대리',
      phone: '010-8812-0457',
      email: 'admin@serim.example',
    },
    false,
    false,
  ),
  'SU-9': extra('2026-11-14 09:05', '31409', '충청남도 아산시 둔포면 아산밸리로 55', 'B동', {
    name: '오미래',
    department: '대표이사실',
    position: '대표',
    phone: '010-3301-7720',
    email: 'ceo@mirae.example',
  }),
  'SU-5': extra(
    '2026-05-01 14:30',
    '14988',
    '경기도 시흥시 엠티브이북로 30',
    '',
    {
      name: '이정훈',
      department: '총무팀',
      position: '팀장',
      phone: '010-5521-3390',
      email: 'info@dongjin.example',
    },
    true,
    true,
  ),
  'SU-3': extra(
    '2026-03-11 11:12',
    '15079',
    '경기도 시흥시 공단1대로 204',
    '3층',
    {
      name: '박소연',
      department: '재무팀',
      position: '차장',
      phone: '010-7745-1180',
      email: 'admin@chungwoon.example',
    },
    true,
    true,
  ),
};

/** 기업 회원가입 신청이 들어오면 운영 담당의 승인 대기 목록에 올립니다. */
export function addSignupApplication(
  app: Omit<SignupApplication, 'id' | 'status' | 'appliedAt'>,
  detail: Omit<SignupExtra, 'appliedTime'>,
) {
  const id = `SU-${++seq}`;
  const now = nowStamp();
  signupApps.unshift({ id, status: 'PENDING', appliedAt: now.slice(0, 10), ...app });
  signupExtras[id] = { appliedTime: now, ...detail };
}
