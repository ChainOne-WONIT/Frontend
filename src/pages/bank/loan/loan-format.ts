import type { AlertStage, LoanStatus } from '../../../api/types';
import type { TTone } from '../../../components/terminal';

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  PENDING: '승인 대기',
  HOLD: '보류',
  EXECUTED: '실행',
  OVERDUE: '연체',
  REPAID: '상환 완료',
};

export const LOAN_STATUS_TONE: Record<LoanStatus, TTone> = {
  PENDING: 'warn',
  HOLD: 'gray',
  EXECUTED: 'blue',
  OVERDUE: 'bad',
  REPAID: 'ok',
};

export const STAGE_TONE: Record<AlertStage, TTone> = {
  정상: 'ok',
  관심: 'warn',
  주의: 'bad',
  경보: 'bad',
};

/** 2_130_000_000 → '21.3' (억원) */
export const eok = (n: number) => (n / 1e8).toFixed(1);
