import { request, USE_MOCK } from './client';
import type { BankLoginResponse, BankNetworkStatus, LoginResponse } from './types';
import * as mock from '../mocks/db';
import { mockLoginBank } from '../mocks/bank';

/** 기업 로그인 — POST /api/auth/corp/login */
export function loginCorp(loginId: string, password: string): Promise<LoginResponse> {
  if (USE_MOCK) return mock.mockLoginCorp(loginId, password);
  return request('POST', '/api/auth/corp/login', { loginId, password });
}

/** 은행 로그인 전 접속 망 확인 — GET /api/auth/bank/network */
export function checkBankNetwork(): Promise<BankNetworkStatus> {
  if (USE_MOCK) return mock.mockBankNetwork();
  return request('GET', '/api/auth/bank/network');
}

/** 은행 직원 로그인 — POST /api/auth/bank/login */
export function loginBank(employeeNo: string, password: string): Promise<BankLoginResponse> {
  if (USE_MOCK) return mockLoginBank(employeeNo, password);
  return request('POST', '/api/auth/bank/login', { employeeNo, password });
}

/** 로그아웃 — POST /api/auth/logout */
export function logout(): Promise<void> {
  if (USE_MOCK) return Promise.resolve();
  return request('POST', '/api/auth/logout');
}
