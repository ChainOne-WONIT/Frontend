/* 은행 운영 담당 목업 동작. 모든 기업·거래 데이터는 가상입니다. */
import { ApiError, mockDelay } from '../api/client';
import type {
  AuditLogs,
  AuditQuery,
  OpsDashboard,
  OpsSettings,
  SettingsOverview,
  SignupApprovals,
  SignupDetail,
  SignupViewReason,
} from '../api/types';
import { bankSummary } from './bank';
import {
  addAudit,
  auditLogs,
  nowStamp,
  settingLogs,
  settings,
  signupApps,
  signupExtras,
} from './shared';

const AS_OF = '2026-11-23';
const OPERATOR = '박서진(운영)';

export function mockOpsDashboard(): Promise<OpsDashboard> {
  return mockDelay({
    asOf: AS_OF,
    ...bankSummary(),
    pendingSignups: signupApps.filter((s) => s.status === 'PENDING'),
    recentLogs: auditLogs.slice(0, 3),
  });
}

function approvals(): SignupApprovals {
  return {
    asOf: AS_OF,
    pending: signupApps.filter((s) => s.status === 'PENDING'),
    rejected: signupApps.filter((s) => s.status === 'REJECTED'),
    approved: signupApps.filter((s) => s.status === 'APPROVED'),
  };
}

export function mockSignupApprovals(): Promise<SignupApprovals> {
  return mockDelay(approvals());
}

function pendingApp(id: string) {
  const s = signupApps.find((x) => x.id === id);
  if (!s) throw new ApiError('가입 신청을 찾을 수 없습니다.', 404, 'NOT_FOUND');
  if (s.status !== 'PENDING') throw new ApiError('이미 처리한 신청입니다.', 409, 'ALREADY_DECIDED');
  return s;
}

export function mockApproveSignup(id: string): Promise<SignupApprovals> {
  try {
    const s = pendingApp(id);
    s.status = 'APPROVED';
    s.decidedAt = nowStamp().slice(0, 10);
    s.decidedBy = OPERATOR;
    addAudit({ actor: OPERATOR, kind: '처리', content: '기업 가입 승인', target: s.companyName });
    return mockDelay(approvals());
  } catch (e) {
    return Promise.reject(e);
  }
}

export function mockRejectSignup(id: string, reason: string): Promise<SignupApprovals> {
  try {
    if (!reason.trim()) throw new ApiError('반려 사유를 입력해 주세요.', 400, 'REASON_REQUIRED');
    const s = pendingApp(id);
    s.status = 'REJECTED';
    s.decidedAt = nowStamp().slice(0, 10);
    s.decidedBy = OPERATOR;
    s.rejectReason = reason.trim();
    addAudit({
      actor: OPERATOR,
      kind: '처리',
      content: `기업 가입 반려: ${s.rejectReason}`,
      target: s.companyName,
    });
    return mockDelay(approvals());
  } catch (e) {
    return Promise.reject(e);
  }
}

export function mockSettings(): Promise<SettingsOverview> {
  return mockDelay({ settings, logs: settingLogs });
}

const LABELS: { [G in keyof OpsSettings]: Record<keyof OpsSettings[G], [string, string]> } = {
  grade: {
    stableBelow: ['안정 기준', '%'],
    excludeFrom: ['제외 기준', '%'],
    perOrderRatio: ['건별 한도 비율', '%'],
  },
  weights: {
    payDelay: ['지급 지연 가중치', '점'],
    repayDelay: ['상환 지연 가중치', '점'],
    orderDrop: ['발주 급감 가중치', '점'],
    deliveryDelay: ['납품 지연 가중치', '점'],
    event: ['이벤트 가중치', '점'],
  },
  stages: {
    watch: ['관심 기준', '점'],
    caution: ['주의 기준', '점'],
    alert: ['경보 기준', '점'],
  },
};

export function mockUpdateSettings(next: OpsSettings): Promise<SettingsOverview> {
  const g = next.grade;
  const st = next.stages;
  const all = Object.values(next).flatMap((grp) => Object.values(grp) as number[]);
  if (all.some((v) => !Number.isFinite(v) || v < 0 || v > 100))
    return Promise.reject(new ApiError('모든 값은 0~100 사이로 입력해 주세요.', 400, 'INVALID'));
  if (g.stableBelow >= g.excludeFrom)
    return Promise.reject(new ApiError('안정 기준은 제외 기준보다 작아야 합니다.', 400, 'INVALID'));
  if (!(st.watch < st.caution && st.caution < st.alert))
    return Promise.reject(
      new ApiError('경보 단계 기준은 관심 < 주의 < 경보 순서여야 합니다.', 400, 'INVALID'),
    );

  const changes: string[] = [];
  for (const group of Object.keys(LABELS) as (keyof OpsSettings)[]) {
    const labels = LABELS[group] as Record<string, [string, string]>;
    const cur = settings[group] as Record<string, number>;
    const nv = next[group] as Record<string, number>;
    for (const key of Object.keys(labels)) {
      if (cur[key] === nv[key]) continue;
      const [label, unit] = labels[key];
      changes.push(`${label} ${cur[key]}${unit} → ${nv[key]}${unit}`);
      cur[key] = nv[key];
    }
  }
  const today = nowStamp().slice(0, 10);
  for (const text of changes) {
    settingLogs.unshift({ date: today, actor: OPERATOR, text });
    addAudit({ actor: OPERATOR, kind: '처리', content: `설정값 변경: ${text}`, target: '설정값' });
  }
  return mockDelay({ settings, logs: settingLogs });
}

export function mockAuditLogs(q: AuditQuery): Promise<AuditLogs> {
  const logs = auditLogs.filter(
    (l) =>
      (!q.from || l.at.slice(0, 10) >= q.from) &&
      (!q.to || l.at.slice(0, 10) <= q.to) &&
      (!q.actor || l.actor === q.actor) &&
      (!q.kind || l.kind === q.kind),
  );
  return mockDelay({ asOf: AS_OF, actors: [...new Set(auditLogs.map((l) => l.actor))], logs });
}

const CONSENT_LABELS: [SignupDetail['consentList'][number]['key'], string, boolean][] = [
  ['terms', '서비스 이용약관', true],
  ['privacy', '개인정보 수집 및 이용 동의', true],
  ['platformShare', '플랫폼 정보 공유 동의', true],
  ['financialInfo', '금융거래정보 제공 동의 (리스크 경보 목적)', false],
  ['creditInfo', '신용정보 제공 동의 (리스크 경보 목적)', false],
];

export function mockSignupDetail(id: string, reason: SignupViewReason): Promise<SignupDetail> {
  const s = signupApps.find((x) => x.id === id);
  const e = signupExtras[id];
  if (!s || !e)
    return Promise.reject(new ApiError('가입 신청을 찾을 수 없습니다.', 404, 'NOT_FOUND'));
  addAudit({
    actor: OPERATOR,
    kind: '조회',
    content: `가입 신청 조회 (사유: ${reason})`,
    target: s.companyName,
  });

  // 신청 정보만으로 확인 (실제 서비스라면 국세청 사업자 상태 조회를 거칩니다)
  const others = signupApps.filter((x) => x.id !== id && x.status !== 'REJECTED');
  const sameBiz = others.find((x) => x.bizNo === s.bizNo);
  const sameId = others.find((x) => x.loginId === s.loginId);
  const bizOk = /^\d{3}-\d{2}-\d{5}$/.test(s.bizNo);
  const checks = [
    { label: '사업자등록번호 형식', result: bizOk ? '정상' : '형식 오류', ok: bizOk },
    {
      label: '같은 사업자등록번호로 가입한 기업',
      result: sameBiz ? sameBiz.companyName : '없음',
      ok: !sameBiz,
    },
    { label: '필수 약관 동의', result: '3개 모두 동의', ok: true },
    { label: '아이디 중복', result: sameId ? '있음' : '없음', ok: !sameId },
  ];
  const agreed: Record<string, boolean> = {
    terms: true,
    privacy: true,
    platformShare: true,
    ...s.consents,
  };
  return mockDelay({
    ...s,
    ...e,
    consentList: CONSENT_LABELS.map(([key, label, required]) => ({
      key,
      label,
      required,
      agreed: agreed[key],
    })),
    checks,
  });
}
