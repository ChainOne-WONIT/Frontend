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

/** 은행 직원 역할: 심사 · 여신 · 운영 */
export type BankRole = 'review' | 'loan' | 'ops';

export interface BankUser {
  type: 'bank';
  employeeNo: string;
  name: string;
  role: BankRole;
  /** 예: '심사 담당' */
  roleLabel: string;
}

export type AppUser = CorpUser | BankUser;

export interface LoginResponse {
  accessToken: string;
  user: CorpUser;
}

export interface BankLoginResponse {
  accessToken: string;
  user: BankUser;
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

/**
 * 기업 검색에서 다른 회원 기업에게 보여 주는 공개 정보.
 * ERD의 Company 중 외부에 알려도 되는 항목만 담습니다.
 * 아이디·비밀번호·가입 상태·로그인 실패 횟수·잠금 여부·영업이익·사업보고서코드·위험등급과
 * 심사재료(CreditInfo: 연체·체납·부채 등)는 넣지 않습니다.
 */
export interface CompanyPublicInfo {
  id: string;
  /** company_name */
  name: string;
  /** ceo_name */
  ceoName: string;
  /** industry */
  industry: string;
  /** business_no (사업자등록번호는 공개 정보) */
  bizNo: string;
  /** established_on */
  establishedOn: string;
  /** address */
  address: string;
  /** phone (대표 전화) */
  phone: string;
  /** company_url */
  url?: string;
  /** stock_code (상장사만) */
  stockCode?: string;
}

/** 기업 상세: 공개 정보 + 우리 회사와의 거래 건수 (내 발주 기록으로 계산) */
export interface CompanyPublicDetail extends CompanyPublicInfo {
  myOrders: { received: number; sent: number };
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
    /** 추정 부실확률 (%) */
    pd: number;
    /** 신용위험 점수 0~100 (높을수록 위험) */
    score: number;
    /** 판정 근거 문장. warn = 위험을 높인 항목, good = 위험을 낮춘 항목 */
    reasons: { text: string; kind: 'warn' | 'good' }[];
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

// ---------- 은행 · 심사 ----------
/** 심사 중 · 신보 심사 중 · 승인 · 제외 */
export type ReviewStatus = 'REVIEW' | 'KODIT_REVIEW' | 'APPROVED' | 'EXCLUDED';
export type GradeLabel = '안정' | '관찰' | '제외';

/** 협력사가 거래 상대(발주처)별로 낸 한도 신청 */
export interface ReviewApplication {
  id: string;
  companyId: string;
  companyName: string;
  /** 거래 상대 (발주처) */
  counterpartyName: string;
  appliedAt: string;
  /** 예측 부실확률 (%) */
  pd: number;
  status: ReviewStatus;
  /** 승인된 한도 */
  amount?: number;
  expireAt?: string;
  /** 제외 사유 */
  excludeReason?: string;
}

export interface ReviewDashboard {
  asOf: string;
  counts: {
    reviewPending: number;
    loanPending: number;
    alertCompanies: number;
    signupPending: number;
  };
  product: {
    /** 보증 공급 총액 */
    guaranteeTotal: number;
    /** 승인된 업체별 한도 합계 */
    approvedLimitSum: number;
    /** 대출 잔액 합계 */
    loanBalanceSum: number;
  };
  /** 오늘 볼 심사 */
  today: ReviewApplication[];
  /** 신보 심사 중 건수 */
  koditPending: number;
  /** 오늘 이 담당자가 처리한 건수 */
  todayDone: number;
  /** 경보 기업 (심사 참고, 여신 경보와 연동) */
  alerts: {
    id: string;
    companyName: string;
    stage: AlertStage;
    score: number;
    signals: { label: string; points: number }[];
    lastAction?: string;
    /** 이 기업의 진행 중인 한도 신청 */
    applicationId?: string;
  }[];
  /** 최근 처리·조회 내역 (이 담당자) */
  recentLogs: AuditLog[];
}

/** 로그인한 뒤 내가 한 처리·조회 */
export interface MyActivity {
  since: string;
  items: AuditLog[];
}

/** 단말 오른쪽 알림메시지 */
export interface BankMessages {
  messages: { at: string; title: string; detail: string }[];
}

export interface ReviewApplications {
  asOf: string;
  pending: ReviewApplication[];
  done: ReviewApplication[];
}

/** 상세 조회 사유. 상세를 열 때마다 조회 기록에 남습니다. */
export type ViewReason = '한도 심사' | '신보 승인 결과 입력' | '사후 점검' | '고객 문의 대응';

export interface ReviewDetail extends ReviewApplication {
  account: string;
  consentCount: number;
  consentAt: string;
  /** ① 자격 확인 (규칙): ok=false 면 문제 있음 */
  checks: { label: string; ok: boolean }[];
  /** ② 등급 (모델) */
  grade: {
    label: GradeLabel;
    /** 판정에 크게 영향을 준 항목. delta > 0 이면 위험을 높임 */
    factors: { text: string; delta: number }[];
    /** 등급 기준 (운영 설정값): 안정 기준 미만 / 제외 기준 이상 */
    stableBelow: number;
    excludeFrom: number;
  };
  /** 근거 발주 */
  order: {
    id: string;
    item: string;
    amount: number;
    dueDate: string;
    quantity: number;
    unit: string;
    place: string;
    status: OrderStatus;
  };
  /** 발주 연결: 시작 기업 → … → 신청 기업 */
  chainPath: string[];
  /** 규칙과 모델로 낸 시스템 판정 */
  systemDecision: 'PASS' | 'EXCLUDE';
  /** 담당자가 확정한 판정 */
  decision?: { result: 'PASS' | 'EXCLUDE'; reason?: string; by: string; at: string };
}

export interface ReviewDecisionRequest {
  result: 'PASS' | 'EXCLUDE';
  /** 시스템 판정과 다르게 확정할 때 필수 */
  reason?: string;
}

export interface KoditResultRequest {
  approved: boolean;
  amount?: number;
  expireAt?: string;
  reason?: string;
}

export interface CompanyReviewInfo {
  id: string;
  name: string;
  grade: GradeLabel;
  /** 업력 (년) */
  years: number;
  /** 매출 (원) */
  revenue: number;
  /** 부채비율 (%) */
  debtRatio: number;
  pd: number;
  overdue: boolean;
  taxArrears: boolean;
  closed: boolean;
  bankruptcy: boolean;
}

export type CompanyReviewPatch = Partial<
  Pick<
    CompanyReviewInfo,
    'years' | 'revenue' | 'debtRatio' | 'overdue' | 'taxArrears' | 'closed' | 'bankruptcy'
  >
>;

export interface CompanyReviewOverview {
  asOf: string;
  companies: CompanyReviewInfo[];
  logs: { date: string; actor: string; text: string }[];
}

/** 체인 안에서의 위치: 시작 기업(원청) → 1차 → 2차 → 3차 협력사 */
export type ChainTier = '시작 기업' | '1차' | '2차' | '3차';

/** 수락된 발주를 회사끼리 이어 만든 체인 하나 */
export interface Chain {
  id: string;
  /** 시작 기업 */
  rootName: string;
  /** 시작 기업의 발주 합계 */
  orderTotal: number;
  /** 체인 안 대출 잔액 합계 */
  loanBalance: number;
  /** 시작 기업부터 차례로 */
  nodes: { name: string; tier: ChainTier; stage: AlertStage }[];
  /** nodes[i] → nodes[i+1] 사이의 발주 번호 (금액은 연결고리에 보이지 않음) */
  links: { orderId: string }[];
  rows: {
    orderId: string;
    from: string;
    to: string;
    amount: number;
    status: OrderStatus;
    loan?: { id: string; amount: number; statusLabel: string };
  }[];
}

export interface ChainQuery {
  /**
   * 검색한 기업. 없으면 모든 체인.
   * 둘 이상이면 그 기업들끼리 주고받은 발주(방향 상관없이)가 있는 체인만 돌려줍니다.
   */
  companies?: string[];
  /** 검색한 기업이 이 구분으로 들어 있는 체인만 */
  tier?: Exclude<ChainTier, '시작 기업'>;
}

export interface ChainView {
  asOf: string;
  /** 검색할 수 있는 기업 이름 (중복 없음) */
  companies: string[];
  chains: Chain[];
}

// ---------- 은행 · 공통 ----------
/** 은행 역할 공통 집계 (대시보드 위 숫자 4칸과 상품 전체 한도) */
export interface BankSummary {
  counts: {
    reviewPending: number;
    loanPending: number;
    alertCompanies: number;
    signupPending: number;
  };
  product: ReviewDashboard['product'];
}

/** 처리·조회 기록 한 줄. 고치거나 지울 수 없습니다. */
export interface AuditLog {
  id: string;
  /** 'YYYY-MM-DD HH:mm' */
  at: string;
  /** 예: '김하늘(심사)' */
  actor: string;
  kind: '조회' | '처리';
  content: string;
  target: string;
}

// ---------- 은행 · 운영 ----------
export interface SignupApplication {
  id: string;
  loginId: string;
  companyName: string;
  bizNo: string;
  ceoName: string;
  industry: string;
  email: string;
  appliedAt: string;
  /** 선택 동의 */
  consents: { financialInfo: boolean; creditInfo: boolean };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decidedAt?: string;
  decidedBy?: string;
  rejectReason?: string;
}

/** 가입 신청서에 적힌 나머지 내용 (상세 화면에서만 보임) */
export interface SignupExtra {
  /** 'YYYY-MM-DD HH:mm' */
  appliedTime: string;
  zipCode: string;
  address: string;
  addressDetail: string;
  manager: SignupRequest['manager'];
  notifications: SignupRequest['notifications'];
}

/** 가입 신청 상세 — 운영 02-1 */
export interface SignupDetail extends SignupApplication, SignupExtra {
  consentList: { key: ConsentKey; label: string; required: boolean; agreed: boolean }[];
  /** 신청 정보만으로 확인한 결과 */
  checks: { label: string; result: string; ok: boolean }[];
}

/** 가입 신청 상세를 열 때 고르는 조회 사유 */
export type SignupViewReason = '가입 심사' | '고객 문의 대응' | '사후 점검';

export interface SignupApprovals {
  asOf: string;
  pending: SignupApplication[];
  rejected: SignupApplication[];
  approved: SignupApplication[];
}

export interface OpsDashboard extends BankSummary {
  asOf: string;
  pendingSignups: SignupApplication[];
  recentLogs: AuditLog[];
}

export interface OpsSettings {
  /** 등급 기준 (예측 부실확률 %) */
  grade: { stableBelow: number; excludeFrom: number; perOrderRatio: number };
  /** 경보 가중치 (점) */
  weights: {
    payDelay: number;
    repayDelay: number;
    orderDrop: number;
    deliveryDelay: number;
    event: number;
  };
  /** 경보 단계 기준 (점 이상) */
  stages: { watch: number; caution: number; alert: number };
}

export interface SettingsOverview {
  settings: OpsSettings;
  logs: { date: string; actor: string; text: string }[];
}

export interface AuditQuery {
  from?: string;
  to?: string;
  actor?: string;
  kind?: AuditLog['kind'];
}

export interface AuditLogs {
  asOf: string;
  actors: string[];
  logs: AuditLog[];
}

// ---------- 은행 · 여신 ----------
/** 승인 대기 · 보류 · 실행 · 연체 · 상환 완료 */
export type LoanStatus = 'PENDING' | 'HOLD' | 'EXECUTED' | 'OVERDUE' | 'REPAID';

/** 여신 담당이 대출·경보 상세를 열 때 고르는 조회 사유 */
export type LoanViewReason = '승인 심사' | '사후관리' | '고객 문의 대응';

export interface LoanRow {
  id: string;
  companyName: string;
  orderId: string;
  orderItem: string;
  /** 근거 발주의 발주처 */
  counterpartyName: string;
  amount: number;
  status: LoanStatus;
  /** 확인 항목 표시 개수 */
  flagCount: number;
  appliedAt: string;
  executedAt?: string;
  dueDate?: string;
}

export interface LoanList {
  asOf: string;
  pending: LoanRow[];
  loans: LoanRow[];
  /** 받는 기업이 "받지 못함"을 누른 발주 */
  paymentDelays: {
    orderId: string;
    item: string;
    from: string;
    to: string;
    amount: number;
    payDueDate: string;
  }[];
}

export interface LoanDetail extends LoanRow {
  orderAmount: number;
  /** 건별 한도 비율 (%) */
  ratio: number;
  orderStatus: OrderStatus;
  chainPath: string[];
  limit: { amount: number; used: number };
  grade: GradeLabel;
  alertStage: AlertStage;
  /** 대금 수령 계좌 (실행·회수 계좌) */
  account: string;
  /** 들여다볼 곳을 알려 주는 표시. 거절 사유가 아닙니다. */
  flags: { id: string; title: string; detail: string; checked: boolean }[];
  holdReason?: string;
  decidedBy?: string;
  decidedAt?: string;
}

export type RiskSignalKind = 'payDelay' | 'repayDelay' | 'orderDrop' | 'deliveryDelay' | 'event';

export interface RiskSignal {
  kind: RiskSignalKind;
  label: string;
  detail: string;
  /** 운영 설정의 경보 가중치 */
  points: number;
}

export type AlertActionType = '관찰 강화' | '거래처 통지' | '담당자 면담' | '조치 완료';

export interface RiskAlert {
  id: string;
  companyName: string;
  /** 예: '3차 협력사' */
  tier: string;
  industry: string;
  signals: RiskSignal[];
  score: number;
  stage: AlertStage;
  /** 부도·회생 신청·휴폐업으로 바로 경보 */
  immediate?: string;
  actions: { type: AlertActionType; by: string; at: string }[];
  /** 전이 계산: 엮인 기업 */
  propagation: {
    name: string;
    distance: number;
    /** 의존도 (%) */
    dependency: number;
    exposure: number;
    grade: GradeLabel;
    /** 위험도 0~100 */
    risk: number;
  }[];
}

export interface RiskAlerts {
  asOf: string;
  stats: {
    alertCompanies: number;
    cautionOrAbove: number;
    newSignalsThisWeek: number;
    actionsDone: number;
  };
  /** 운영 설정의 경보 단계 기준과 가중치 */
  stages: OpsSettings['stages'];
  weights: OpsSettings['weights'];
  alerts: RiskAlert[];
}

/** 경보 상세: 점수 기준을 함께 돌려줍니다 */
export interface AlertDetail extends RiskAlert {
  stages: OpsSettings['stages'];
}

export interface LoanDashboard extends BankSummary {
  asOf: string;
  pendingLoans: LoanRow[];
  alerts: RiskAlert[];
}

export type RiskEventType = '체납' | '신용등급 하락' | '부도' | '회생 신청' | '휴·폐업';

export interface RiskEvent {
  id: string;
  companyName: string;
  type: RiskEventType;
  detail?: string;
  occurredAt: string;
  registeredBy: string;
  cancelled: boolean;
}

export interface RiskEvents {
  asOf: string;
  companies: string[];
  events: RiskEvent[];
}

// ---------- 은행 · 공지·규정 ----------
export type BankRoleName = '심사' | '여신' | '운영';

export interface BankNotices {
  asOf: string;
  /** 이 역할이 볼 공지 (전체 공지 포함) */
  notices: {
    id: string;
    kind: '공지' | '규정' | '점검' | '안내';
    title: string;
    audience: BankRoleName[];
    postedAt: string;
    author: string;
    body: string[];
  }[];
  /** 업무 규정 조항 */
  rules: { no: number; title: string; body: string[] }[];
}
