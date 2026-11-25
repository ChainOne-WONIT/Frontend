/* 은행 여신 담당 목업 동작. 모든 기업·거래 데이터는 가상입니다. */
import { ApiError, mockDelay } from '../api/client';
import type {
  AlertActionType,
  AlertDetail,
  LoanDashboard,
  LoanDetail,
  LoanList,
  LoanRow,
  LoanViewReason,
  RiskAlert,
  RiskAlerts,
  RiskEvent,
  RiskEvents,
  RiskEventType,
} from '../api/types';
import { won } from '../lib/format';
import { bankSummary } from './bank';
import { alertBase, computeAlerts, DONE_BEFORE, events, loans, paymentDelays } from './loan-data';
import { addAudit, nowStamp, settings } from './shared';

const AS_OF = '2026-11-23';
const OFFICER = '이도윤(여신)';
const today = () => nowStamp().slice(0, 10);
const addDays = (d: string, n: number) => {
  const t = new Date(d + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

const toRow = (l: (typeof loans)[number]): LoanRow => {
  const {
    id,
    companyName,
    orderId,
    orderItem,
    counterpartyName,
    amount,
    status,
    appliedAt,
    executedAt,
    dueDate,
  } = l;
  return {
    id,
    companyName,
    orderId,
    orderItem,
    counterpartyName,
    amount,
    status,
    appliedAt,
    executedAt,
    dueDate,
    flagCount: l.flags.length,
  };
};

const toDetail = (l: (typeof loans)[number]): LoanDetail => ({
  ...l,
  flagCount: l.flags.length,
  ratio: settings.grade.perOrderRatio,
});

// ---------- 대시보드 ----------
export function mockLoanDashboard(): Promise<LoanDashboard> {
  return mockDelay({
    asOf: AS_OF,
    ...bankSummary(),
    pendingLoans: loans.filter((l) => l.status === 'PENDING').map(toRow),
    alerts: computeAlerts(),
  });
}

// ---------- 대출 ----------
export function mockLoans(): Promise<LoanList> {
  return mockDelay({
    asOf: AS_OF,
    pending: loans.filter((l) => l.status === 'PENDING').map(toRow),
    loans: loans.filter((l) => l.status !== 'PENDING').map(toRow),
    paymentDelays,
  });
}

function findLoan(id: string) {
  const l = loans.find((x) => x.id === id);
  if (!l) throw new ApiError('대출을 찾을 수 없습니다.', 404, 'NOT_FOUND');
  return l;
}

export function mockLoanDetail(id: string, reason: LoanViewReason): Promise<LoanDetail> {
  try {
    const l = findLoan(id);
    addAudit({
      actor: OFFICER,
      kind: '조회',
      content: `대출 상세 조회 (사유: ${reason})`,
      target: `${l.id} ${l.companyName}`,
    });
    return mockDelay(toDetail(l));
  } catch (e) {
    return Promise.reject(e);
  }
}

export function mockCheckLoanFlag(id: string, flagId: string): Promise<LoanDetail> {
  try {
    const l = findLoan(id);
    const f = l.flags.find((x) => x.id === flagId);
    if (!f) throw new ApiError('확인 항목을 찾을 수 없습니다.', 404, 'NOT_FOUND');
    f.checked = !f.checked;
    return mockDelay(toDetail(l));
  } catch (e) {
    return Promise.reject(e);
  }
}

export function mockApproveLoan(id: string): Promise<LoanDetail> {
  try {
    const l = findLoan(id);
    if (l.status !== 'PENDING' && l.status !== 'HOLD')
      throw new ApiError('승인할 수 있는 대출이 아닙니다.', 409, 'INVALID_STATE');
    l.status = 'EXECUTED';
    l.executedAt = today();
    l.dueDate = l.dueDate ?? addDays(today(), 90);
    l.decidedBy = OFFICER;
    l.decidedAt = today();
    l.holdReason = undefined;
    l.limit = { ...l.limit, used: l.limit.used + l.amount };
    addAudit({
      actor: OFFICER,
      kind: '처리',
      content: `대출 승인·실행: ${won(l.amount)}`,
      target: `${l.id} ${l.companyName}`,
    });
    return mockDelay(toDetail(l));
  } catch (e) {
    return Promise.reject(e);
  }
}

export function mockHoldLoan(id: string, reason: string): Promise<LoanDetail> {
  try {
    if (!reason.trim()) throw new ApiError('보류 사유를 입력해 주세요.', 400, 'REASON_REQUIRED');
    const l = findLoan(id);
    if (l.status !== 'PENDING')
      throw new ApiError('승인 대기 중인 대출만 보류할 수 있습니다.', 409, 'INVALID_STATE');
    l.status = 'HOLD';
    l.holdReason = reason.trim();
    l.decidedBy = OFFICER;
    l.decidedAt = today();
    addAudit({
      actor: OFFICER,
      kind: '처리',
      content: `대출 보류: ${l.holdReason}`,
      target: `${l.id} ${l.companyName}`,
    });
    return mockDelay(toDetail(l));
  } catch (e) {
    return Promise.reject(e);
  }
}

// ---------- 리스크 경보 ----------
function alertsOverview(): RiskAlerts {
  const alerts = computeAlerts();
  const weekStart = addDays(AS_OF, -6);
  const doneNow = alerts.filter((a) => a.actions.at(-1)?.type === '조치 완료').length;
  return {
    asOf: AS_OF,
    stats: {
      alertCompanies: alerts.length,
      cautionOrAbove: alerts.filter((a) => a.stage === '주의' || a.stage === '경보').length,
      // 기존 신호 3건 + 이번 주에 새로 등록한 이벤트
      newSignalsThisWeek:
        3 +
        events.filter((e) => !e.cancelled && e.occurredAt >= weekStart && e.id.startsWith('EV-N'))
          .length,
      actionsDone: DONE_BEFORE + doneNow,
    },
    stages: settings.stages,
    weights: settings.weights,
    alerts,
  };
}

export function mockRiskAlerts(): Promise<RiskAlerts> {
  return mockDelay(alertsOverview());
}

export function mockAlertDetail(id: string, reason: LoanViewReason): Promise<AlertDetail> {
  const a = computeAlerts().find((x) => x.id === id);
  if (!a) return Promise.reject(new ApiError('경보를 찾을 수 없습니다.', 404, 'NOT_FOUND'));
  addAudit({
    actor: OFFICER,
    kind: '조회',
    content: `경보 상세 조회 (사유: ${reason})`,
    target: a.companyName,
  });
  return mockDelay({ ...a, stages: settings.stages });
}

export function mockAlertAction(id: string, type: AlertActionType): Promise<AlertDetail> {
  const base = alertBase.find((x) => x.id === id);
  if (!base) return Promise.reject(new ApiError('경보를 찾을 수 없습니다.', 404, 'NOT_FOUND'));
  base.actions.unshift({ type, by: OFFICER, at: today() });
  addAudit({
    actor: OFFICER,
    kind: '처리',
    content: `경보 조치: ${type}`,
    target: base.companyName,
  });
  return mockDelay({
    ...(computeAlerts().find((x) => x.id === id) as RiskAlert),
    stages: settings.stages,
  });
}

// ---------- 이벤트 신호 ----------
const SEVERE: RiskEventType[] = ['부도', '회생 신청', '휴·폐업'];
const COMPANIES = [
  '한성모터스(주)',
  '에이스정밀(주)',
  '청운테크(주)',
  '동진산업(주)',
  '대광금속(주)',
  '세진테크(주)',
  '세림소재(주)',
];
let seq = 0;

function eventsOverview(): RiskEvents {
  return { asOf: AS_OF, companies: COMPANIES, events };
}

export function mockRiskEvents(): Promise<RiskEvents> {
  return mockDelay(eventsOverview());
}

/** 새 이벤트는 그 기업의 경보 신호에 더해집니다. 부도·회생 신청·휴폐업은 바로 경보. */
export function mockRegisterEvent(req: {
  companyName: string;
  type: RiskEventType;
  occurredAt: string;
  detail?: string;
}): Promise<RiskEvents> {
  if (!req.companyName || !req.type || !req.occurredAt)
    return Promise.reject(
      new ApiError('기업, 이벤트 종류, 발생일을 모두 골라 주세요.', 400, 'INVALID'),
    );
  const ev: RiskEvent = {
    id: `EV-N${++seq}`,
    companyName: req.companyName,
    type: req.type,
    detail: req.detail?.trim() || undefined,
    occurredAt: req.occurredAt,
    registeredBy: OFFICER,
    cancelled: false,
  };
  events.unshift(ev);

  let alert = alertBase.find((a) => a.companyName === req.companyName);
  if (!alert) {
    alert = {
      id: `AL-N${seq}`,
      companyName: req.companyName,
      tier: '협력사',
      industry: '-',
      signals: [],
      actions: [],
      propagation: [],
    };
    alertBase.push(alert);
  }
  if (SEVERE.includes(req.type)) {
    alert.immediate = req.type;
  }
  alert.signals.push({
    kind: 'event',
    label: `이벤트: ${req.type}`,
    detail: `${req.occurredAt} 발생${ev.detail ? ` · ${ev.detail}` : ''}${SEVERE.includes(req.type) ? ' · 즉시 경보' : ''}`,
    eventId: ev.id,
  });
  addAudit({
    actor: OFFICER,
    kind: '처리',
    content: `이벤트 등록: ${req.type}`,
    target: req.companyName,
  });
  return mockDelay(eventsOverview());
}

export function mockCancelEvent(id: string): Promise<RiskEvents> {
  const ev = events.find((e) => e.id === id);
  if (!ev) return Promise.reject(new ApiError('이벤트를 찾을 수 없습니다.', 404, 'NOT_FOUND'));
  if (ev.cancelled)
    return Promise.reject(new ApiError('이미 취소된 이벤트입니다.', 409, 'ALREADY_CANCELLED'));
  ev.cancelled = true;
  for (const a of alertBase) {
    const before = a.signals.length;
    a.signals = a.signals.filter((s) => s.eventId !== id);
    if (a.signals.length !== before && a.immediate === ev.type) {
      // 다른 중대 이벤트가 남아 있지 않으면 즉시 경보를 풉니다.
      const stillSevere = events.find(
        (e) =>
          !e.cancelled &&
          e.companyName === a.companyName &&
          SEVERE.includes(e.type) &&
          e.id.startsWith('EV-N'),
      );
      a.immediate = stillSevere?.type;
    }
  }
  addAudit({
    actor: OFFICER,
    kind: '처리',
    content: `이벤트 등록 취소: ${ev.type}`,
    target: ev.companyName,
  });
  return mockDelay(eventsOverview());
}
