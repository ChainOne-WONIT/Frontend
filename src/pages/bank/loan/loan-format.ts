import type { AlertStage, LoanStatus } from '../../../api/types';
import type { PillTone } from '../../../lib/format';

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  PENDING: '승인 대기',
  HOLD: '보류',
  EXECUTED: '실행',
  OVERDUE: '연체',
  REPAID: '상환 완료',
};

export const LOAN_STATUS_TONE: Record<LoanStatus, PillTone> = {
  PENDING: 'warn',
  HOLD: 'gray',
  EXECUTED: 'default',
  OVERDUE: 'bad',
  REPAID: 'ok',
};

export const STAGE_TONE: Record<AlertStage, PillTone> = {
  정상: 'ok',
  관심: 'warn',
  주의: 'warn',
  경보: 'bad',
};
