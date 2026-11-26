import { request, USE_MOCK } from './client';
import type { BankNotices, BankRoleName } from './types';
import { mockBankNotices } from '../mocks/notices';

/** 공지·규정 — GET /api/bank/notices?role= */
export function getBankNotices(role: BankRoleName): Promise<BankNotices> {
  if (USE_MOCK) return mockBankNotices(role);
  return request('GET', `/api/bank/notices?role=${encodeURIComponent(role)}`);
}
