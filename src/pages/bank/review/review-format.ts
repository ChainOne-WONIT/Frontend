import type { AlertStage, GradeLabel, ReviewStatus } from '../../../api/types';
import type { PillTone } from '../../../lib/format';

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  REVIEW: '심사 중',
  KODIT_REVIEW: '신보 심사 중',
  APPROVED: '승인',
  EXCLUDED: '제외',
};

export const REVIEW_STATUS_TONE: Record<ReviewStatus, PillTone> = {
  REVIEW: 'warn',
  KODIT_REVIEW: 'violet',
  APPROVED: 'ok',
  EXCLUDED: 'bad',
};

export const GRADE_TONE: Record<GradeLabel, PillTone> = { 안정: 'ok', 관찰: 'warn', 제외: 'bad' };

export const STAGE_KEY: Record<AlertStage, string> = {
  정상: 'ok',
  관심: 'watch',
  주의: 'caution',
  경보: 'alert',
};

/** 164_000_000_000 → '1,640억' */
export const eok = (n: number) => `${Math.round(n / 1e8).toLocaleString()}억`;
