import { request, USE_MOCK } from './client';
import type {
  AlertsOverview,
  CorpHome,
  Counterparty,
  CreateOrderRequest,
  FundOverview,
  MyInfo,
  OrderAction,
  OrderDetail,
  OrderDirection,
  OrderSummary,
} from './types';
import * as mock from '../mocks/db';

/** 기업 홈 — GET /api/corp/home */
export function getHome(): Promise<CorpHome> {
  if (USE_MOCK) return mock.mockHome();
  return request('GET', '/api/corp/home');
}

/** 발주 목록 — GET /api/orders?direction=received|sent */
export function getOrders(direction?: OrderDirection): Promise<OrderSummary[]> {
  if (USE_MOCK) return mock.mockOrders(direction);
  return request('GET', `/api/orders${direction ? `?direction=${direction}` : ''}`);
}

/** 발주 상세 — GET /api/orders/{id} */
export function getOrder(id: string): Promise<OrderDetail> {
  if (USE_MOCK) return mock.mockOrder(id);
  return request('GET', `/api/orders/${encodeURIComponent(id)}`);
}

const ACTION_PATH: Record<OrderAction, string> = {
  accept: 'accept',
  reject: 'reject',
  cancel: 'cancel',
  deliver: 'deliver',
  receive: 'receive',
  pay: 'payment',
  confirmPayment: 'payment/confirm',
  reportUnpaid: 'payment/unpaid',
};

/** 발주 진행 처리 — POST /api/orders/{id}/{action} */
export function orderAction(id: string, action: OrderAction): Promise<OrderDetail> {
  if (USE_MOCK) return mock.mockOrderAction(id, action);
  return request('POST', `/api/orders/${encodeURIComponent(id)}/${ACTION_PATH[action]}`);
}

/** 발주 등록 — POST /api/orders */
export function createOrder(body: CreateOrderRequest): Promise<OrderDetail> {
  if (USE_MOCK) return mock.mockCreateOrder(body);
  return request('POST', '/api/orders', body);
}

/** 발주를 낼 수 있는 기업 목록 — GET /api/companies/counterparties */
export function getCounterparties(): Promise<Counterparty[]> {
  if (USE_MOCK) return mock.mockCounterparties();
  return request('GET', '/api/companies/counterparties');
}

/** 생산자금 현황 — GET /api/funds */
export function getFund(): Promise<FundOverview> {
  if (USE_MOCK) return mock.mockFund();
  return request('GET', '/api/funds');
}

/** 생산자금 신청 — POST /api/funds/loans { orderId } */
export function requestLoan(orderId: string): Promise<OrderDetail> {
  if (USE_MOCK) return mock.mockRequestLoan(orderId);
  return request('POST', '/api/funds/loans', { orderId });
}

/** 거래처 경보 — GET /api/alerts */
export function getAlerts(): Promise<AlertsOverview> {
  if (USE_MOCK) return mock.mockAlerts();
  return request('GET', '/api/alerts');
}

/** 내 정보 — GET /api/corp/me */
export function getMyInfo(): Promise<MyInfo> {
  if (USE_MOCK) return mock.mockMyInfo();
  return request('GET', '/api/corp/me');
}

/** 선택 동의 변경 — PATCH /api/corp/me/consents/{key} { agreed } */
export function updateConsent(key: string, agreed: boolean): Promise<MyInfo> {
  if (USE_MOCK) return mock.mockUpdateConsent(key, agreed);
  return request('PATCH', `/api/corp/me/consents/${key}`, { agreed });
}
