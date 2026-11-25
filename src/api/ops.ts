import { request, USE_MOCK } from './client';
import type {
  AuditLogs,
  AuditQuery,
  OpsDashboard,
  OpsSettings,
  SettingsOverview,
  SignupApprovals,
  SignupDetail,
  SignupViewReason,
} from './types';
import * as mock from '../mocks/ops';

/** 운영 대시보드 — GET /api/bank/ops/dashboard */
export function getOpsDashboard(): Promise<OpsDashboard> {
  if (USE_MOCK) return mock.mockOpsDashboard();
  return request('GET', '/api/bank/ops/dashboard');
}

/** 기업 가입 신청 목록 — GET /api/bank/ops/signups */
export function getSignupApprovals(): Promise<SignupApprovals> {
  if (USE_MOCK) return mock.mockSignupApprovals();
  return request('GET', '/api/bank/ops/signups');
}

/** 가입 승인 — POST /api/bank/ops/signups/{id}/approve */
export function approveSignup(id: string): Promise<SignupApprovals> {
  if (USE_MOCK) return mock.mockApproveSignup(id);
  return request('POST', `/api/bank/ops/signups/${encodeURIComponent(id)}/approve`);
}

/** 가입 반려 — POST /api/bank/ops/signups/{id}/reject { reason } */
export function rejectSignup(id: string, reason: string): Promise<SignupApprovals> {
  if (USE_MOCK) return mock.mockRejectSignup(id, reason);
  return request('POST', `/api/bank/ops/signups/${encodeURIComponent(id)}/reject`, { reason });
}

/** 설정값 — GET /api/bank/ops/settings */
export function getSettings(): Promise<SettingsOverview> {
  if (USE_MOCK) return mock.mockSettings();
  return request('GET', '/api/bank/ops/settings');
}

/** 설정값 저장 — PUT /api/bank/ops/settings */
export function updateSettings(body: OpsSettings): Promise<SettingsOverview> {
  if (USE_MOCK) return mock.mockUpdateSettings(body);
  return request('PUT', '/api/bank/ops/settings', body);
}

/** 처리·조회 기록 — GET /api/bank/ops/audit-logs?from=&to=&actor=&kind= */
export function getAuditLogs(q: AuditQuery): Promise<AuditLogs> {
  if (USE_MOCK) return mock.mockAuditLogs(q);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v) params.set(k, v);
  const qs = params.toString();
  return request('GET', `/api/bank/ops/audit-logs${qs ? `?${qs}` : ''}`);
}

/** 가입 신청 상세 — GET /api/bank/ops/signups/{id}?reason= (조회 기록이 남습니다) */
export function getSignupDetail(id: string, reason: SignupViewReason): Promise<SignupDetail> {
  if (USE_MOCK) return mock.mockSignupDetail(id, reason);
  return request(
    'GET',
    `/api/bank/ops/signups/${encodeURIComponent(id)}?reason=${encodeURIComponent(reason)}`,
  );
}
