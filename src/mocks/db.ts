/* 백엔드 연결 전까지 쓰는 목업 데이터와 동작. 모든 기업·거래 데이터는 가상입니다. */
import { ApiError, mockDelay } from '../api/client';
import type {
  AlertsOverview,
  BankNetworkStatus,
  CorpHome,
  Counterparty,
  CreateOrderRequest,
  FundOverview,
  LoginResponse,
  MyInfo,
  OrderAction,
  OrderDetail,
  OrderDirection,
  OrderStatus,
  OrderSummary,
  SignupRequest,
  SignupResponse,
} from '../api/types';
import { addSignupApplication } from './shared';

const ME = { id: 'X', name: '한성모터스(주)' };
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => {
  const t = new Date(d + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

// ---------- 로그인 ----------
export const MOCK_ACCOUNT = { loginId: 'hansung', password: 'chainone1!' };
const failCount: Record<string, number> = {};

export function mockLoginCorp(loginId: string, password: string): Promise<LoginResponse> {
  const id = loginId.trim();
  if ((failCount[id] ?? 0) >= 5) {
    return Promise.reject(
      new ApiError(
        '비밀번호를 5회 잘못 입력해 계정이 잠겼습니다. 은행 담당자에게 문의해 주세요.',
        423,
        'LOCKED',
      ),
    );
  }
  if (id === 'daegwang01') {
    return Promise.reject(
      new ApiError(
        '가입 승인 전입니다. 은행 승인 후 로그인할 수 있습니다.',
        403,
        'PENDING_APPROVAL',
      ),
    );
  }
  if (id !== MOCK_ACCOUNT.loginId || password !== MOCK_ACCOUNT.password) {
    failCount[id] = (failCount[id] ?? 0) + 1;
    const left = 5 - failCount[id];
    return Promise.reject(
      new ApiError(
        left > 0
          ? `아이디 또는 비밀번호가 맞지 않습니다. (${failCount[id]}/5회, ${left}회 더 틀리면 계정이 잠깁니다)`
          : '비밀번호를 5회 잘못 입력해 계정이 잠겼습니다. 은행 담당자에게 문의해 주세요.',
        401,
        left > 0 ? 'INVALID_CREDENTIALS' : 'LOCKED',
      ),
    );
  }
  failCount[id] = 0;
  return mockDelay({
    accessToken: 'mock-token-hansung',
    user: {
      type: 'corp',
      loginId: id,
      companyId: ME.id,
      companyName: ME.name,
      companyRole: '원청기업',
      userName: '기업 관리자',
    },
  });
}

/** 목업에서는 주소에 ?network=internal 을 붙이면 내부망 접속으로 봅니다. */
export function mockBankNetwork(): Promise<BankNetworkStatus> {
  const internal = new URLSearchParams(location.search).get('network') === 'internal';
  return mockDelay(
    internal
      ? { allowed: true, networkName: '우리은행 내부망', ip: '10.24.118.52' }
      : { allowed: false, networkName: '외부망 (인터넷)', ip: '211.234.15.87' },
    500,
  );
}

// ---------- 회원가입 ----------
const takenIds = new Set(['hansung', 'ace', 'chungwoon', 'dongjin', 'daegwang01']);

export function mockCheckLoginId(loginId: string) {
  return mockDelay({ available: !takenIds.has(loginId) });
}

export function mockSignup(req: SignupRequest): Promise<SignupResponse> {
  if (takenIds.has(req.account.loginId)) {
    return Promise.reject(new ApiError('이미 쓰이는 아이디입니다.', 409, 'DUPLICATE_LOGIN_ID'));
  }
  if (req.company.bizNo === '101-81-10001') {
    return Promise.reject(
      new ApiError(
        '이미 가입된 사업자등록번호입니다. 기업당 하나의 계정만 만들 수 있습니다.',
        409,
        'DUPLICATE_BIZ_NO',
      ),
    );
  }
  takenIds.add(req.account.loginId);
  addSignupApplication(
    {
      loginId: req.account.loginId,
      companyName: req.company.name,
      bizNo: req.company.bizNo,
      ceoName: req.company.ceoName,
      industry: req.company.industry,
      email: req.manager.email,
      consents: {
        financialInfo: req.consents.financialInfo,
        creditInfo: req.consents.creditInfo,
      },
    },
    {
      zipCode: req.company.zipCode,
      address: req.company.address,
      addressDetail: req.company.addressDetail,
      manager: req.manager,
      notifications: req.notifications,
    },
  );
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return mockDelay(
    {
      loginId: req.account.loginId,
      companyName: req.company.name,
      bizNo: req.company.bizNo,
      appliedAt: `${today().replaceAll('-', '.')}  ${pad(now.getHours())}:${pad(now.getMinutes())}`,
      status: 'PENDING',
    },
    600,
  );
}

// ---------- 발주 ----------
interface MockOrder extends OrderDetail {
  limitBalance?: number;
}

const ACCOUNT = '우리은행 1005-301-882200';

function order(
  id: string,
  direction: OrderDirection,
  item: string,
  counterpartyName: string,
  amount: number,
  dueDate: string,
  status: OrderStatus,
  extra: Partial<MockOrder> = {},
): MockOrder {
  const received = direction === 'received';
  const sender = received ? counterpartyName : ME.name;
  const receiver = received ? ME.name : counterpartyName;
  // 목업 날짜가 오늘보다 미래로 가지 않게 맞춥니다.
  const created = [addDays(dueDate, -60), addDays(today(), -40)].sort()[0];
  const cap = (d: string) => (d > today() ? today() : d);
  const history = [{ date: created, action: '발주 등록', actor: sender }];
  const steps: [OrderStatus, string, string][] = [
    ['ACCEPTED', '수락', receiver],
    ['DELIVERED', '납품 등록', receiver],
    ['RECEIVED', '수령 확인', sender],
    ['PAID', '지급 등록', sender],
    ['COMPLETED', '받았음 확인 · 지급 완료', receiver],
  ];
  const order: OrderStatus[] = [
    'PENDING',
    'ACCEPTED',
    'DELIVERED',
    'RECEIVED',
    'PAID',
    'COMPLETED',
  ];
  const reached = order.indexOf(status);
  steps.forEach(([s, action, actor], i) => {
    if (reached >= order.indexOf(s))
      history.push({ date: cap(addDays(created, 1 + i * 8)), action, actor });
  });
  return {
    id,
    item,
    direction,
    counterpartyName,
    amount,
    dueDate,
    status,
    senderName: sender,
    receiverName: receiver,
    quantity: Math.round(amount / 155000),
    unit: '개',
    place: received
      ? `${counterpartyName.replace('(주)', '')} 울산 2공장`
      : '한성모터스(주) 화성 1공장',
    payDueDate: addDays(dueDate, 50),
    account: received ? ACCOUNT : '우리은행 1005-402-221100',
    deliveredAt: reached >= 2 ? history[2]?.date : undefined,
    receivedAt: reached >= 3 ? history[3]?.date : undefined,
    paidAt: reached >= 4 ? history[4]?.date : undefined,
    completedAt: reached >= 5 ? history[5]?.date : undefined,
    history,
    ...extra,
  };
}

const orders: MockOrder[] = [
  order(
    'PO-2051',
    'received',
    '시트 프레임 어셈블리',
    '대한오토(주)',
    1_240_000_000,
    '2027-01-28',
    'PENDING',
    {
      quantity: 8000,
      unit: '세트',
      limitBalance: 840_000_000,
    },
  ),
  order(
    'PO-2047',
    'received',
    '전장 하네스 모듈',
    '대한오토(주)',
    680_000_000,
    '2027-01-15',
    'PENDING',
    {
      limitBalance: 840_000_000,
    },
  ),
  order(
    'PO-2039',
    'received',
    '브레이크 캘리퍼',
    '미래모빌리티(주)',
    320_000_000,
    '2026-12-30',
    'PENDING',
    {
      limitBalance: 400_000_000,
    },
  ),
  order(
    'PO-2026',
    'received',
    '도어 트림 패널',
    '대한오토(주)',
    900_000_000,
    '2026-12-18',
    'DELIVERED',
    {
      loan: {
        id: 'LN-12',
        amount: 600_000_000,
        status: 'EXECUTED',
        executedAt: '2026-11-06',
        dueDate: '2027-02-16',
      },
    },
  ),
  order(
    'PO-2018',
    'received',
    '스티어링 브래킷',
    '미래모빌리티(주)',
    410_000_000,
    '2026-12-05',
    'RECEIVED',
    {
      loan: {
        id: 'LN-9',
        amount: 320_000_000,
        status: 'EXECUTED',
        executedAt: '2026-10-02',
        dueDate: '2027-02-03',
      },
    },
  ),
  order(
    'PO-1996',
    'received',
    '범퍼 마운트',
    '대한오토(주)',
    550_000_000,
    '2026-11-10',
    'COMPLETED',
    {
      loan: {
        id: 'LN-4',
        amount: 440_000_000,
        status: 'REPAID',
        executedAt: '2026-08-21',
        repaidAt: '2026-11-12',
      },
    },
  ),
  order(
    'PO-1001',
    'sent',
    '도어 모듈 브래킷',
    '에이스정밀(주)',
    1_000_000_000,
    '2027-01-20',
    'ACCEPTED',
  ),
  order(
    'PO-1004',
    'sent',
    '와이어 하네스 커넥터',
    '청운테크(주)',
    450_000_000,
    '2026-12-26',
    'DELIVERED',
  ),
  order(
    'PO-1007',
    'sent',
    '알루미늄 다이캐스팅',
    '동진산업(주)',
    720_000_000,
    '2026-12-12',
    'RECEIVED',
  ),
  order(
    'PO-1009',
    'sent',
    '고무 실링 부품',
    '에이스정밀(주)',
    180_000_000,
    '2027-02-05',
    'PENDING',
  ),
  order('PO-1012', 'sent', '프레스 패널', '청운테크(주)', 560_000_000, '2027-02-14', 'PENDING'),
];

function todoOf(o: OrderDetail): string | undefined {
  if (o.direction === 'sent')
    return { DELIVERED: '수령 확인', RECEIVED: '대금 지급' }[o.status as string];
  return { PENDING: '수락', ACCEPTED: '납품 등록', PAID: '입금 확인' }[o.status as string];
}

function availableLoan(o: MockOrder): OrderDetail['loanAvailable'] {
  if (o.direction !== 'received' || o.loan) return null;
  // 수락된 뒤 대금을 받기 전까지(수락·납품 등록·수령 확인) 신청할 수 있습니다.
  if (!['ACCEPTED', 'DELIVERED', 'RECEIVED'].includes(o.status)) return null;
  const max = o.amount * 0.8;
  const amount = Math.min(max, o.limitBalance ?? max);
  return {
    amount,
    reason:
      amount < max
        ? `발주금액의 80%와 ${o.counterpartyName} 거래용 한도 잔액 중 작은 금액`
        : '발주금액의 80%',
  };
}

function toSummary(o: MockOrder): OrderSummary {
  return {
    id: o.id,
    item: o.item,
    direction: o.direction,
    counterpartyName: o.counterpartyName,
    amount: o.amount,
    dueDate: o.dueDate,
    status: o.status,
    todo: todoOf(o),
  };
}

function toDetail(o: MockOrder): OrderDetail {
  const { limitBalance: _lb, ...rest } = o;
  void _lb;
  return { ...rest, todo: todoOf(o), loanAvailable: availableLoan(o) };
}

export function mockOrders(direction?: OrderDirection) {
  return mockDelay(orders.filter((o) => !direction || o.direction === direction).map(toSummary));
}

export function mockOrder(id: string) {
  const o = orders.find((x) => x.id === id);
  if (!o) return Promise.reject(new ApiError('발주를 찾을 수 없습니다.', 404, 'NOT_FOUND'));
  return mockDelay(toDetail(o));
}

export function mockOrderAction(id: string, action: OrderAction): Promise<OrderDetail> {
  const o = orders.find((x) => x.id === id);
  if (!o) return Promise.reject(new ApiError('발주를 찾을 수 없습니다.', 404, 'NOT_FOUND'));
  const d = today();
  const push = (a: string, actor = ME.name) => o.history.push({ date: d, action: a, actor });
  const rules: Record<OrderAction, [OrderDirection, OrderStatus, () => void]> = {
    accept: ['received', 'PENDING', () => ((o.status = 'ACCEPTED'), push('수락'))],
    reject: ['received', 'PENDING', () => ((o.status = 'REJECTED'), push('반려'))],
    deliver: [
      'received',
      'ACCEPTED',
      () => (
        (o.status = 'DELIVERED'),
        (o.deliveredAt = d),
        push(`납품 등록 (${o.quantity.toLocaleString()}${o.unit})`)
      ),
    ],
    confirmPayment: [
      'received',
      'PAID',
      () => {
        o.status = 'COMPLETED';
        o.completedAt = d;
        push('받았음 확인 · 지급 완료');
        if (o.loan) Object.assign(o.loan, { status: 'REPAID', repaidAt: d });
      },
    ],
    reportUnpaid: ['received', 'PAID', () => push('받지 못함 신고')],
    cancel: ['sent', 'PENDING', () => ((o.status = 'CANCELED'), push('발주 취소'))],
    receive: [
      'sent',
      'DELIVERED',
      () => ((o.status = 'RECEIVED'), (o.receivedAt = d), push('수령 확인')),
    ],
    pay: ['sent', 'RECEIVED', () => ((o.status = 'PAID'), (o.paidAt = d), push('지급 등록'))],
  };
  const [dir, from, run] = rules[action];
  if (o.direction !== dir || o.status !== from) {
    return Promise.reject(
      new ApiError('지금 상태에서는 처리할 수 없습니다.', 409, 'INVALID_STATE'),
    );
  }
  run();
  return mockDelay(toDetail(o));
}

export function mockRequestLoan(orderId: string) {
  const o = orders.find((x) => x.id === orderId);
  const avail = o && availableLoan(o);
  if (!o || !avail)
    return Promise.reject(new ApiError('지금은 신청할 수 없습니다.', 409, 'NOT_ELIGIBLE'));
  o.loan = {
    id: 'LN-' + (16 + orders.filter((x) => x.loan).length),
    amount: avail.amount,
    status: 'EXECUTED',
    executedAt: today(),
    dueDate: addDays(o.dueDate, 60),
  };
  o.history.push({ date: today(), action: `생산자금 실행 (${o.loan.id})`, actor: '우리은행' });
  return mockDelay(toDetail(o));
}

const counterparties: Counterparty[] = [
  { id: 'A', name: '에이스정밀(주)', bizNo: '124-81-20011' },
  { id: 'C', name: '청운테크(주)', bizNo: '135-86-30022' },
  { id: 'E', name: '동진산업(주)', bizNo: '140-81-40033' },
];

export function mockCounterparties() {
  return mockDelay(counterparties);
}

export function mockCreateOrder(req: CreateOrderRequest) {
  const cp = counterparties.find((c) => c.id === req.receiverId);
  if (!cp) return Promise.reject(new ApiError('받는 기업을 선택해 주세요.', 400, 'INVALID'));
  const id = 'PO-' + (1013 + orders.filter((o) => o.direction === 'sent').length);
  const o = order(id, 'sent', req.item, cp.name, req.amount, req.dueDate, 'PENDING', {
    quantity: req.quantity,
    place: req.place,
    payDueDate: req.payDueDate,
    history: [{ date: today(), action: '발주 등록', actor: ME.name }],
  });
  orders.push(o);
  return mockDelay(toDetail(o));
}

// ---------- 홈 ----------
export function mockHome(): Promise<CorpHome> {
  const received = orders.filter((o) => o.direction === 'received' && o.status !== 'COMPLETED');
  const sent = orders.filter(
    (o) => o.direction === 'sent' && !['COMPLETED', 'CANCELED'].includes(o.status),
  );
  const toDeliver = sent.filter((o) => o.status === 'DELIVERED').length;
  const toPay = sent.filter((o) => o.status === 'RECEIVED').length;
  return mockDelay({
    company: {
      name: ME.name,
      industry: '자동차 부품 조립',
      ceoName: '이한성',
      bizNo: '101-81-10001',
    },
    asOf: today(),
    summary: {
      receivedPending: received.filter((o) => o.status === 'PENDING').length,
      sentTodo: toDeliver + toPay,
      sentTodoDetail: `수령 확인 ${toDeliver}건 · 대금 지급 등록 ${toPay}건`,
      limitBalance: 1_240_000_000,
      limitApproved: 3_000_000_000,
      limitUsed: 1_760_000_000,
      alertCount: 1,
    },
    received: received.map(toSummary),
    sent: sent.map(toSummary),
  });
}

// ---------- 생산자금 ----------
export function mockFund(): Promise<FundOverview> {
  const received = orders.filter((o) => o.direction === 'received');
  return mockDelay({
    limits: [
      {
        counterpartyId: 'D',
        counterpartyName: '대한오토(주)',
        status: 'APPROVED',
        amount: 2_200_000_000,
        used: 1_360_000_000,
        expireAt: '2027-10-30',
      },
      {
        counterpartyId: 'M',
        counterpartyName: '미래모빌리티(주)',
        status: 'APPROVED',
        amount: 800_000_000,
        used: 400_000_000,
        expireAt: '2027-08-14',
      },
      {
        counterpartyId: 'H',
        counterpartyName: '한빛오토텍(주)',
        status: 'KODIT_REVIEW',
        appliedAt: '2026-11-18',
      },
      { counterpartyId: 'S', counterpartyName: '세원기공(주)', status: 'NONE' },
    ],
    grade: {
      label: '안정',
      pd: 1.2,
      score: 28,
      reasons: [
        { text: '부채비율이 상승했습니다. (205% → 230%)', kind: 'warn' },
        { text: '최근 매출액이 전년 동기 대비 4% 감소했습니다.', kind: 'warn' },
        { text: '업력 28년, 연체 없이 거래를 이어 오고 있습니다.', kind: 'good' },
      ],
    },
    applicable: received
      .filter((o) => !['COMPLETED', 'REJECTED'].includes(o.status))
      .map((o) => {
        const av = availableLoan(o);
        return {
          orderId: o.id,
          item: o.item,
          counterpartyName: o.counterpartyName,
          amount: o.amount,
          status: o.status,
          availableAmount: av?.amount,
          blockedReason: av
            ? undefined
            : o.loan
              ? `이미 대출이 실행 중입니다 (${o.loan.id})`
              : '수락 전 발주입니다. 수락하면 신청할 수 있습니다.',
        };
      }),
    loans: received
      .filter((o) => o.loan)
      .map((o) => ({
        ...o.loan!,
        orderLabel: `${o.id} · ${o.item} · ${o.counterpartyName}`,
        requestedAt: o.loan!.executedAt ?? '',
      })),
  });
}

// ---------- 경보 ----------
export function mockAlerts(): Promise<AlertsOverview> {
  return mockDelay({
    current: [
      {
        companyName: '동진산업(주)',
        stage: '주의',
        reasons: ['상환 지연 12일 (+20)', '발주 급감, 전월 대비 -45% (+20)', '납품 지연 2건 (+10)'],
        impact: '진행 중인 발주 1건 7억 2,000만 원 · 내 거래의 19%',
      },
    ],
    resolved: [
      {
        companyName: '청운테크(주)',
        stage: '정상',
        reasons: ['지급 지연이 해소되었습니다.'],
        impact: '',
        resolvedAt: '2026-11-10',
      },
      {
        companyName: '에이스정밀(주)',
        stage: '정상',
        reasons: ['납품 지연이 해소되었습니다.'],
        impact: '',
        resolvedAt: '2026-10-28',
      },
    ],
  });
}

// ---------- 내 정보 ----------
const myInfo: MyInfo = {
  company: {
    name: ME.name,
    bizNo: '101-81-10001',
    ceoName: '이한성',
    industry: '자동차 부품 조립',
    address: '경기도 화성시 우정읍 화성로 1200',
    email: 'buy@hansung.example',
  },
  consents: [
    {
      key: 'terms',
      label: '이용약관, 플랫폼 정보 공유',
      required: true,
      agreed: true,
      agreedAt: '2026-03-02',
    },
    {
      key: 'financialInfo',
      label: '금융거래정보 제공 (경보 목적)',
      required: false,
      agreed: true,
      agreedAt: '2026-03-02',
    },
    {
      key: 'creditInfo',
      label: '신용정보 제공 (경보 목적)',
      required: false,
      agreed: true,
      agreedAt: '2026-03-02',
    },
  ],
  account: {
    loginId: 'hansung',
    accountType: '원청기업 (은행 발급 계정)',
    lastLogin: '2026.11.23 09:30',
    passwordChangedAt: '2026-09-01',
  },
};

export function mockMyInfo() {
  return mockDelay(myInfo);
}

export function mockUpdateConsent(key: string, agreed: boolean) {
  const c = myInfo.consents.find((x) => x.key === key);
  if (!c || c.required)
    return Promise.reject(new ApiError('필수 항목은 바꿀 수 없습니다.', 400, 'INVALID'));
  c.agreed = agreed;
  c.agreedAt = today();
  return mockDelay(myInfo);
}
