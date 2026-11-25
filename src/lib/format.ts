import type { BankRole, OrderStatus, SignupViewReason, ViewReason } from '../api/types';

/** 1_240_000_000 → '12억 4,000만 원' */
export function won(n: number | undefined | null): string {
  const v = Math.round(n ?? 0);
  if (!v) return '0원';
  const eok = Math.floor(v / 1e8);
  const man = Math.round((v % 1e8) / 1e4);
  const parts = [];
  if (eok) parts.push(`${eok.toLocaleString()}억`);
  if (man) parts.push(`${man.toLocaleString()}만`);
  return `${parts.join(' ')} 원`;
}

/** '2026-11-23' → '2026.11.23' */
export const dot = (d: string) => d.replaceAll('-', '.');

/** 날짜에 n일을 더한 'YYYY-MM-DD' */
export function addDaysLabel(d: string, n: number): string {
  const t = new Date(d + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: '수락 대기',
  ACCEPTED: '수락',
  DELIVERED: '납품 등록',
  RECEIVED: '수령 확인',
  PAID: '지급 등록',
  COMPLETED: '지급 완료',
  REJECTED: '반려',
  CANCELED: '취소',
};

/** 진행 단계마다 색을 다르게: 수락 대기(주황) → 수락 및 납품 등록(보라) → 수령 확인(파랑) → 지급 등록(청록) → 지급 완료(초록) */
export const STATUS_TONE: Record<OrderStatus, PillTone> = {
  PENDING: 'warn',
  ACCEPTED: 'violet',
  DELIVERED: 'violet',
  RECEIVED: 'default',
  PAID: 'teal',
  COMPLETED: 'ok',
  REJECTED: 'bad',
  CANCELED: 'gray',
};

export type PillTone = 'default' | 'warn' | 'ok' | 'bad' | 'gray' | 'violet' | 'teal';

/**
 * 화면에 보이는 진행 단계. 수락과 납품 등록은 한 단계("수락 및 납품 등록")로 묶습니다.
 */
export const FLOW_STEPS = ['수락 대기', '수락 및 납품 등록', '수령 확인', '지급 등록', '지급 완료'];

export function flowIndex(status: OrderStatus): number {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'ACCEPTED':
    case 'DELIVERED':
      return 1;
    case 'RECEIVED':
      return 2;
    case 'PAID':
      return 3;
    case 'COMPLETED':
      return 4;
    default:
      return -1;
  }
}

/** 진행 단계 표시용 라벨 (수락·납품 등록은 묶어서 표시) */
export function flowLabel(status: OrderStatus): string {
  const i = flowIndex(status);
  return i >= 0 ? FLOW_STEPS[i] : STATUS_LABEL[status];
}

/** 은행 상세 조회 사유 */
export const VIEW_REASONS: ViewReason[] = [
  '한도 심사',
  '신보 승인 결과 입력',
  '사후 점검',
  '고객 문의 대응',
];

/** 은행 직원이 로그인하면 처음 볼 화면. 화면이 아직 없는 역할(여신)은 빠져 있습니다. */
export const BANK_HOME: Partial<Record<BankRole, string>> = {
  review: '/bank/review',
  ops: '/bank/ops',
};

/** 운영 담당이 가입 신청 상세를 열 때 고르는 사유 */
export const SIGNUP_VIEW_REASONS: SignupViewReason[] = ['가입 심사', '고객 문의 대응', '사후 점검'];
