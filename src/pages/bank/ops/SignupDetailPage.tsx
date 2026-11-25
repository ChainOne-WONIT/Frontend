import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { approveSignup, getSignupDetail, rejectSignup } from '../../../api/ops';
import type { SignupApprovals, SignupDetail, SignupViewReason } from '../../../api/types';
import { Icon } from '../../../components/Icon';
import { ReasonModal } from '../../../components/Modal';
import { Card, ErrorBox, KeyValue, Loading, Note, Pill } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { SIGNUP_VIEW_REASONS } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import '../review/review.css';
import './ops.css';

const LIST = '/bank/ops/signups';

const STATUS: Record<SignupDetail['status'], [string, 'warn' | 'ok' | 'bad']> = {
  PENDING: ['승인 대기', 'warn'],
  APPROVED: ['승인', 'ok'],
  REJECTED: ['반려', 'bad'],
};

/**
 * 운영 02-1 · 가입 신청 상세.
 * 목록에서 조회 사유를 고르고 들어오면 바로 열립니다. 주소로 바로 들어오면 여기서 사유를 먼저 고릅니다.
 */
export function SignupDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const state = useLocation().state as { reason?: SignupViewReason } | null;
  const passed =
    state?.reason && SIGNUP_VIEW_REASONS.includes(state.reason) ? state.reason : undefined;
  const [reason, setReason] = useState<SignupViewReason | undefined>(passed);

  if (!reason) {
    return (
      <ReasonModal
        reasons={SIGNUP_VIEW_REASONS}
        onClose={() => navigate(LIST)}
        onOpen={setReason}
      />
    );
  }
  return <DetailView id={id} reason={reason} />;
}

function DetailView({ id, reason }: { id: string; reason: SignupViewReason }) {
  const { data, error, loading, reload, setData } = useAsync(
    () => getSignupDetail(id, reason),
    [id, reason],
  );

  if (loading) return <Loading />;
  if (error || !data)
    return <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />;

  const d = data;
  const [statusLabel, statusTone] = STATUS[d.status];
  // 승인·반려 뒤에는 목록 응답에서 이 신청의 바뀐 상태만 가져와 화면에 반영합니다.
  const applyResult = (list: SignupApprovals) => {
    const next = [...list.pending, ...list.approved, ...list.rejected].find((x) => x.id === d.id);
    if (next) setData({ ...d, ...next });
  };
  const yesNo = (v: boolean) => <Pill tone={v ? 'default' : 'gray'}>{v ? '받음' : '안 받음'}</Pill>;
  const notiRow = (label: string, v: { email: boolean; sms: boolean }): [string, ReactNode] => [
    label,
    <span key={label} className="row-gap small muted">
      이메일 {yesNo(v.email)} SMS {yesNo(v.sms)}
    </span>,
  ];

  return (
    <>
      <PageHead
        title={`${d.companyName} 가입 신청`}
        sub={`신청 ${d.appliedTime} · 아이디 ${d.loginId} · 협력사 직접 가입`}
        right={
          <>
            <Pill tone={statusTone}>{statusLabel}</Pill>
            <Link to={LIST} className="btn btn--outline btn--sm">
              목록으로
            </Link>
          </>
        }
      />
      <p className="small muted rv-reason">
        <Icon name="info" size={14} /> 조회 사유: {reason} · 이 조회는 처리·조회 기록에 남습니다.
      </p>

      <div className="grid-2">
        <Card title="업체 정보">
          <KeyValue
            rows={[
              ['기업명', <b key="n">{d.companyName}</b>],
              ['사업자등록번호', d.bizNo],
              ['대표자 성명', d.ceoName],
              ['업종', d.industry],
              [
                '사업장 주소',
                `(${d.zipCode}) ${d.address}${d.addressDetail ? `, ${d.addressDetail}` : ''}`,
              ],
            ]}
          />
        </Card>
        <Card title="담당자 정보">
          <KeyValue
            rows={[
              ['담당자 성명', <b key="m">{d.manager.name}</b>],
              [
                '부서 / 직위',
                [d.manager.department, d.manager.position].filter(Boolean).join(' / ') || '-',
              ],
              ['휴대폰 번호', d.manager.phone],
              ['이메일', d.manager.email],
              ['아이디', d.loginId],
            ]}
          />
        </Card>
      </div>

      <div className="grid-2">
        <Card title="약관 동의" right={<span className="small muted">{d.appliedAt} 동의</span>}>
          <ul className="list">
            {d.consentList.map((c) => (
              <li key={c.key} className="list__item ops-consent">
                <span className={`ops-tag${c.required ? ' ops-tag--req' : ''}`}>
                  {c.required ? '필수' : '선택'}
                </span>
                <span className="list__main">{c.label}</span>
                <Pill tone={c.agreed ? 'ok' : 'gray'}>{c.agreed ? '동의' : '미동의'}</Pill>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="알림 설정">
          <KeyValue
            rows={[
              notiRow('발주 진행 알림', d.notifications.orderProgress),
              notiRow('리스크 경보 알림', d.notifications.riskAlert),
            ]}
          />
          <p className="small muted" style={{ marginTop: 12 }}>
            가입이 승인되면 담당자 이메일로 로그인 안내가 발송됩니다.
          </p>
        </Card>
      </div>

      <Card
        title="자동 확인"
        right={<span className="small muted">신청 정보만으로 확인한 결과입니다</span>}
      >
        <ul className="list">
          {d.checks.map((c) => (
            <li key={c.label} className="list__item rv-check">
              <span className="list__main">{c.label}</span>
              <Pill tone={c.ok ? 'ok' : 'bad'}>{c.result}</Pill>
            </li>
          ))}
        </ul>
      </Card>

      {d.status === 'PENDING' ? (
        <DecisionCard id={d.id} onDone={applyResult} />
      ) : (
        <Card title="처리 결과" right={<Pill tone={statusTone}>{statusLabel}</Pill>}>
          <KeyValue
            rows={[
              ['처리일', d.decidedAt ?? '-'],
              ['처리자', d.decidedBy ?? '-'],
              ...(d.status === 'REJECTED'
                ? ([['반려 사유', d.rejectReason ?? '-']] as [string, ReactNode][])
                : []),
            ]}
          />
        </Card>
      )}

      <Note>
        외부 조회 없이 신청 정보로 판단합니다. 실제 서비스라면 국세청 사업자 상태 조회를 거칩니다.
      </Note>
    </>
  );
}

function DecisionCard({ id, onDone }: { id: string; onDone: (list: SignupApprovals) => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (approve: boolean) => {
    if (!approve && !reason.trim()) {
      setError('반려하려면 사유를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onDone(approve ? await approveSignup(id) : await rejectSignup(id, reason.trim()));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Card title="처리">
      <label className="field">
        <span className="field__label">반려할 때 사유 (반려 시 필수)</span>
        <input
          className={`input${error ? ' input--error' : ''}`}
          placeholder="예: 사업자등록번호와 상호가 일치하지 않음"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {error && (
        <p className="field__error rv-gap" role="alert">
          {error}
        </p>
      )}
      <div className="detail-action rv-gap">
        <button
          type="button"
          className="btn btn--primary"
          disabled={busy}
          onClick={() => run(true)}
        >
          가입 승인
        </button>
        <button
          type="button"
          className="btn btn--danger"
          disabled={busy}
          onClick={() => run(false)}
        >
          반려
        </button>
      </div>
    </Card>
  );
}
