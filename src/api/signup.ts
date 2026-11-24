import { request, USE_MOCK } from './client';
import type { SignupRequest, SignupResponse } from './types';
import * as mock from '../mocks/db';

/** 아이디 중복 확인 — GET /api/signup/check-id?loginId= */
export function checkLoginId(loginId: string): Promise<{ available: boolean }> {
  if (USE_MOCK) return mock.mockCheckLoginId(loginId);
  return request('GET', `/api/signup/check-id?loginId=${encodeURIComponent(loginId)}`);
}

/** 기업 회원가입 신청 — POST /api/signup/corp */
export function signupCorp(body: SignupRequest): Promise<SignupResponse> {
  if (USE_MOCK) return mock.mockSignup(body);
  return request('POST', '/api/signup/corp', body);
}
