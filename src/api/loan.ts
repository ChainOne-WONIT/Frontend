import { request, USE_MOCK } from './client';
import type {
  AlertActionType,
  AlertDetail,
  LoanDashboard,
  LoanDetail,
  LoanList,
  LoanViewReason,
  RiskAlerts,
  RiskEvents,
  RiskEventType,
} from './types';
import * as mock from '../mocks/loan';

const enc = encodeURIComponent;

/** 여신 대시보드 — GET /api/bank/loan/dashboard */
export function getLoanDashboard(): Promise<LoanDashboard> {
  if (USE_MOCK) return mock.mockLoanDashboard();
  return request('GET', '/api/bank/loan/dashboard');
}

/** 생산자금 대출 목록 — GET /api/bank/loans */
export function getLoans(): Promise<LoanList> {
  if (USE_MOCK) return mock.mockLoans();
  return request('GET', '/api/bank/loans');
}

/** 대출 상세 — GET /api/bank/loans/{id}?reason= (조회 기록이 남습니다) */
export function getLoanDetail(id: string, reason: LoanViewReason): Promise<LoanDetail> {
  if (USE_MOCK) return mock.mockLoanDetail(id, reason);
  return request('GET', `/api/bank/loans/${enc(id)}?reason=${enc(reason)}`);
}

/** 확인 항목 확인 표시 — POST /api/bank/loans/{id}/flags/{flagId}/check */
export function checkLoanFlag(id: string, flagId: string): Promise<LoanDetail> {
  if (USE_MOCK) return mock.mockCheckLoanFlag(id, flagId);
  return request('POST', `/api/bank/loans/${enc(id)}/flags/${enc(flagId)}/check`);
}

/** 승인하고 실행 — POST /api/bank/loans/{id}/approve */
export function approveLoan(id: string): Promise<LoanDetail> {
  if (USE_MOCK) return mock.mockApproveLoan(id);
  return request('POST', `/api/bank/loans/${enc(id)}/approve`);
}

/** 보류 — POST /api/bank/loans/{id}/hold { reason } */
export function holdLoan(id: string, reason: string): Promise<LoanDetail> {
  if (USE_MOCK) return mock.mockHoldLoan(id, reason);
  return request('POST', `/api/bank/loans/${enc(id)}/hold`, { reason });
}

/** 리스크 경보 — GET /api/bank/alerts */
export function getRiskAlerts(): Promise<RiskAlerts> {
  if (USE_MOCK) return mock.mockRiskAlerts();
  return request('GET', '/api/bank/alerts');
}

/** 경보 상세 — GET /api/bank/alerts/{id}?reason= (조회 기록이 남습니다) */
export function getAlertDetail(id: string, reason: LoanViewReason): Promise<AlertDetail> {
  if (USE_MOCK) return mock.mockAlertDetail(id, reason);
  return request('GET', `/api/bank/alerts/${enc(id)}?reason=${enc(reason)}`);
}

/** 경보 조치 기록 — POST /api/bank/alerts/{id}/actions { type } */
export function addAlertAction(id: string, type: AlertActionType): Promise<AlertDetail> {
  if (USE_MOCK) return mock.mockAlertAction(id, type);
  return request('POST', `/api/bank/alerts/${enc(id)}/actions`, { type });
}

/** 이벤트 신호 목록 — GET /api/bank/events */
export function getRiskEvents(): Promise<RiskEvents> {
  if (USE_MOCK) return mock.mockRiskEvents();
  return request('GET', '/api/bank/events');
}

/** 이벤트 등록 — POST /api/bank/events */
export function registerEvent(body: {
  companyName: string;
  type: RiskEventType;
  occurredAt: string;
  detail?: string;
}): Promise<RiskEvents> {
  if (USE_MOCK) return mock.mockRegisterEvent(body);
  return request('POST', '/api/bank/events', body);
}

/** 이벤트 등록 취소 — POST /api/bank/events/{id}/cancel */
export function cancelEvent(id: string): Promise<RiskEvents> {
  if (USE_MOCK) return mock.mockCancelEvent(id);
  return request('POST', `/api/bank/events/${enc(id)}/cancel`);
}
