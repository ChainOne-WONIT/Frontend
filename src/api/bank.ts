import { request, USE_MOCK } from './client';
import type {
  ChainQuery,
  ChainView,
  CompanyReviewOverview,
  CompanyReviewPatch,
  KoditResultRequest,
  ReviewApplications,
  ReviewDashboard,
  ReviewDecisionRequest,
  ReviewDetail,
  ViewReason,
} from './types';
import * as mock from '../mocks/bank';

/** 심사 대시보드 — GET /api/bank/review/dashboard */
export function getReviewDashboard(): Promise<ReviewDashboard> {
  if (USE_MOCK) return mock.mockReviewDashboard();
  return request('GET', '/api/bank/review/dashboard');
}

/** 한도 신청 목록 — GET /api/bank/review/applications */
export function getReviewApplications(): Promise<ReviewApplications> {
  if (USE_MOCK) return mock.mockReviewApplications();
  return request('GET', '/api/bank/review/applications');
}

/** 한도 신청 상세 — GET /api/bank/review/applications/{id}?reason= (조회 기록이 남습니다) */
export function getReviewDetail(id: string, reason: ViewReason): Promise<ReviewDetail> {
  if (USE_MOCK) return mock.mockReviewDetail(id, reason);
  return request(
    'GET',
    `/api/bank/review/applications/${encodeURIComponent(id)}?reason=${encodeURIComponent(reason)}`,
  );
}

/** 판정 확정 — POST /api/bank/review/applications/{id}/decision { result, reason? } */
export function decideReview(id: string, body: ReviewDecisionRequest): Promise<ReviewDetail> {
  if (USE_MOCK) return mock.mockReviewDecision(id, body);
  return request('POST', `/api/bank/review/applications/${encodeURIComponent(id)}/decision`, body);
}

/** 신보 승인 결과 입력 — POST /api/bank/review/applications/{id}/kodit */
export function submitKoditResult(id: string, body: KoditResultRequest): Promise<ReviewDetail> {
  if (USE_MOCK) return mock.mockKoditResult(id, body);
  return request('POST', `/api/bank/review/applications/${encodeURIComponent(id)}/kodit`, body);
}

/** 기업 심사 정보 — GET /api/bank/review/companies */
export function getCompanyReviews(): Promise<CompanyReviewOverview> {
  if (USE_MOCK) return mock.mockCompanyReviews();
  return request('GET', '/api/bank/review/companies');
}

/** 기업 심사 정보 수정 — PATCH /api/bank/review/companies/{id} */
export function updateCompanyReview(
  id: string,
  patch: CompanyReviewPatch,
): Promise<CompanyReviewOverview> {
  if (USE_MOCK) return mock.mockUpdateCompanyReview(id, patch);
  return request('PATCH', `/api/bank/review/companies/${encodeURIComponent(id)}`, patch);
}

/** 발주 체인 조회 — GET /api/bank/chains?company=&tier= */
export function getChains(q: ChainQuery = {}): Promise<ChainView> {
  if (USE_MOCK) return mock.mockChains(q);
  const params = new URLSearchParams();
  if (q.company) params.set('company', q.company);
  if (q.tier) params.set('tier', q.tier);
  const qs = params.toString();
  return request('GET', `/api/bank/chains${qs ? `?${qs}` : ''}`);
}
