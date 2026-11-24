/* 백엔드와 주고받는 데이터 형태. 백엔드 스펙이 정해지면 여기만 맞추면 됩니다. */

// ---------- 인증 ----------
export type LoginType = 'corp' | 'bank';

export interface CorpUser {
  type: 'corp';
  loginId: string;
  companyId: string;
  companyName: string;
  /** 원청기업 | 협력사 */
  companyRole: string;
  userName: string;
}

export interface LoginResponse {
  accessToken: string;
  user: CorpUser;
}

export interface BankNetworkStatus {
  allowed: boolean;
  /** 예: '우리은행 내부망', '외부망 (인터넷)' */
  networkName: string;
  ip: string;
}

// ---------- 회원가입 ----------
export type ConsentKey = 'terms' | 'privacy' | 'platformShare' | 'financialInfo' | 'creditInfo';

export interface SignupRequest {
  consents: Record<ConsentKey, boolean>;
  account: { loginId: string; password: string };
  company: {
    bizNo: string;
    name: string;
    ceoName: string;
    industry: string;
    zipCode: string;
    address: string;
    addressDetail: string;
  };
  manager: {
    name: string;
    department: string;
    position: string;
    phone: string;
    email: string;
  };
  notifications: {
    orderProgress: { email: boolean; sms: boolean };
    riskAlert: { email: boolean; sms: boolean };
  };
}

export interface SignupResponse {
  loginId: string;
  companyName: string;
  bizNo: string;
  appliedAt: string;
  status: 'PENDING';
}

// ---------- 발주 ----------
export type OrderStatus =
  | 'PENDING' // 수락 대기
  | 'ACCEPTED' // 수락
  | 'DELIVERED' // 납품 등록
  | 'RECEIVED' // 수령 확인
  | 'PAID' // 지급 등록
  | 'COMPLETED' // 지급 완료
  | 'REJECTED' // 반려
  | 'CANCELED'; // 취소

export type OrderDirection = 'received' | 'sent';

export interface OrderSummary {
  id: string;
  item: string;
  direction: OrderDirection;
  /** 받은 발주면 보낸 기업, 낸 발주면 받는 기업 */
  counterpartyName: string;
  amount: number;
  dueDate: string;
  status: OrderStatus;
  /** 내가 해야 할 일 (예: '수령 확인', '대금 지급') */
  todo?: string;
}

export interface OrderHistory {
  date: string;
  action: string;
  actor: string;
}

export interface OrderLoan {
  id: string;
  amount: number;
  status: 'EXECUTED' | 'REPAID' | 'PENDING' | 'HOLD';
  executedAt?: string;
  dueDate?: string;
  repaidAt?: string;
}

export interface OrderDetail extends OrderSummary {
  senderName: string;
  receiverName: string;
  quantity: number;
  unit: string;
  place: string;
  payDueDate: string;
  /** 받는 기업이 지정한 대금 수령 계좌 */
  account?: string;
  deliveredAt?: string;
  receivedAt?: string;
  paidAt?: string;
  completedAt?: string;
  history: OrderHistory[];
  /** 받은 발주일 때만: 이 발주로 받은 생산자금 */
  loan?: OrderLoan;
  /** 받은 발주일 때만: 지금 신청 가능한 생산자금 */
  loanAvailable?: { amount: number; reason: string } | null;
}

export type OrderAction =
  | 'accept'
  | 'reject'
  | 'cancel'
  | 'deliver'
  | 'receive'
  | 'pay'
  | 'confirmPayment'
  | 'reportUnpaid';

export interface CreateOrderRequest {
  receiverId: string;
  item: string;
  quantity: number;
  amount: number;
  dueDate: string;
  place: string;
  payDueDate: string;
  memo?: string;
}

export interface Counterparty {
  id: string;
  name: string;
  bizNo: string;
}

// ---------- 홈 ----------
export interface CorpHome {
  company: { name: string; industry: string; ceoName: string; bizNo: string };
  asOf: string;
  summary: {
    receivedPending: number;
    sentTodo: number;
    sentTodoDetail: string;
    limitBalance: number;
    limitApproved: number;
    limitUsed: number;
    alertCount: number;
  };
  received: OrderSummary[];
  sent: OrderSummary[];
}

// ---------- 생산자금 ----------
export type LimitStatus = 'APPROVED' | 'KODIT_REVIEW' | 'REVIEW' | 'EXCLUDED' | 'NONE';

export interface CounterpartyLimit {
  counterpartyId: string;
  counterpartyName: string;
  status: LimitStatus;
  amount?: number;
  used?: number;
  expireAt?: string;
  appliedAt?: string;
}

export interface FundOverview {
  limits: CounterpartyLimit[];
  grade: {
    label: '안정' | '관찰' | '제외';
    pd: number;
    factors: { name: string; effect: number }[];
  };
  applicable: {
    orderId: string;
    item: string;
    counterpartyName: string;
    amount: number;
    status: OrderStatus;
    availableAmount?: number;
    blockedReason?: string;
  }[];
  loans: (OrderLoan & { orderLabel: string; requestedAt: string })[];
}

// ---------- 경보 ----------
export type AlertStage = '정상' | '관심' | '주의' | '경보';

export interface PartnerAlert {
  companyName: string;
  stage: AlertStage;
  reasons: string[];
  impact: string;
  resolvedAt?: string;
}

export interface AlertsOverview {
  current: PartnerAlert[];
  resolved: PartnerAlert[];
}

// ---------- 내 정보 ----------
export interface MyInfo {
  company: {
    name: string;
    bizNo: string;
    ceoName: string;
    industry: string;
    address: string;
    email: string;
  };
  consents: {
    key: ConsentKey;
    label: string;
    required: boolean;
    agreed: boolean;
    agreedAt: string;
  }[];
  account: { loginId: string; accountType: string; lastLogin: string; passwordChangedAt: string };
}
