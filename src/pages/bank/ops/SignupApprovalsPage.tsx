import { useState } from 'react';
import { useNavigate } from 'react-router';
import { approveSignup, getSignupApprovals, rejectSignup } from '../../../api/ops';
import type { SignupApplication } from '../../../api/types';
import { Modal, ReasonModal } from '../../../components/Modal';
import { Card, ErrorBox, Loading, Note, Pill } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { dot, SIGNUP_VIEW_REASONS } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import './ops.css';

/** 운영 02 · 기업 가입 승인 */
export function SignupApprovalsPage() {
  const { data, error, loading, reload, setData } = useAsync(getSignupApprovals, []);
  const [busyId, setBusyId] = useState('');
  const [actionError, setActionError] = useState('');
  const [rejecting, setRejecting] = useState<SignupApplication | null>(null);
  const [viewing, setViewing] = useState<SignupApplication | null>(null);
  const navigate = useNavigate();

  // 기업 이름을 누르면 조회 사유를 고른 뒤 가입 신청 상세로 갑니다.
  const nameButton = (s: SignupApplication) => (
    <div className="list__title">
      <button type="button" className="ops-name" onClick={() => setViewing(s)}>
        {s.companyName}
      </button>
    </div>
  );

  const approve = async (s: SignupApplication) => {
    setBusyId(s.id);
    setActionError('');
    try {
      setData(await approveSignup(s.id));
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <>
      <PageHead
        title="기업 가입 승인"
        sub="협력사가 직접 가입하면 운영 담당이 확인하고 승인합니다. 원청 계정은 은행이 발급합니다."
        right={data && <span className="small muted">{dot(data.asOf)} 기준</span>}
      />

      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <Card title="승인 대기" right={<Pill tone="warn">{data.pending.length}건</Pill>}>
            {actionError && (
              <p className="field__error" role="alert">
                {actionError}
              </p>
            )}
            {data.pending.length === 0 ? (
              <p className="empty">승인을 기다리는 가입 신청이 없습니다.</p>
            ) : (
              <ul className="list">
                {data.pending.map((s) => (
                  <li key={s.id} className="list__item">
                    <div className="list__main">
                      {nameButton(s)}
                      <div className="list__sub">
                        아이디 {s.loginId} · {s.bizNo} · 대표 {s.ceoName} · {s.industry} · {s.email}{' '}
                        · 신청 {s.appliedAt}
                      </div>
                      <div className="ops-consents">
                        선택 동의:
                        <span>금융거래정보</span>
                        <Pill tone={s.consents.financialInfo ? 'ok' : 'gray'}>
                          {s.consents.financialInfo ? '동의' : '미동의'}
                        </Pill>
                        <span>신용정보</span>
                        <Pill tone={s.consents.creditInfo ? 'ok' : 'gray'}>
                          {s.consents.creditInfo ? '동의' : '미동의'}
                        </Pill>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={!!busyId}
                      onClick={() => approve(s)}
                    >
                      {busyId === s.id ? '처리 중…' : '승인'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      disabled={!!busyId}
                      onClick={() => setRejecting(s)}
                    >
                      반려
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="반려">
            {data.rejected.length === 0 ? (
              <p className="empty">반려한 신청이 없습니다.</p>
            ) : (
              <ul className="list">
                {data.rejected.map((s) => (
                  <li key={s.id} className="list__item">
                    <div className="list__main">
                      {nameButton(s)}
                      <div className="list__sub">
                        {s.decidedAt} 반려 · 사유: {s.rejectReason}
                      </div>
                    </div>
                    <Pill tone="bad">반려</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="최근 승인">
            <ul className="list">
              {data.approved.map((s) => (
                <li key={s.id} className="list__item">
                  <div className="list__main">
                    {nameButton(s)}
                    <div className="list__sub">
                      {s.decidedAt} 승인 · {s.decidedBy}
                    </div>
                  </div>
                  <Pill tone="ok">승인</Pill>
                </li>
              ))}
            </ul>
          </Card>

          <Note>
            외부 조회 없이 신청 정보로 판단합니다. 실제 서비스라면 국세청 사업자 상태 조회를
            거칩니다.
          </Note>
        </>
      )}

      {viewing && (
        <ReasonModal
          reasons={SIGNUP_VIEW_REASONS}
          defaultReason={viewing.status === 'PENDING' ? '가입 심사' : '사후 점검'}
          onClose={() => setViewing(null)}
          onOpen={(reason) => navigate(`/bank/ops/signups/${viewing.id}`, { state: { reason } })}
        />
      )}
      {rejecting && (
        <RejectModal
          target={rejecting}
          onClose={() => setRejecting(null)}
          onDone={(d) => {
            setData(d);
            setRejecting(null);
          }}
        />
      )}
    </>
  );
}

function RejectModal({
  target,
  onClose,
  onDone,
}: {
  target: SignupApplication;
  onClose: () => void;
  onDone: (d: Awaited<ReturnType<typeof rejectSignup>>) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      setError('반려 사유를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onDone(await rejectSignup(target.id, reason.trim()));
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`${target.companyName} 가입 반려`}
      desc="반려 사유는 신청한 기업에게 안내되고, 처리 기록에 남습니다."
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--outline" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="btn btn--danger" disabled={busy} onClick={submit}>
            {busy ? '처리 중…' : '반려'}
          </button>
        </>
      }
    >
      <label className="field modal__field">
        <span className="modal__label">반려 사유</span>
        <input
          className={`input${error ? ' input--error' : ''}`}
          placeholder="예: 사업자등록번호와 상호가 일치하지 않음"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {error && (
        <p className="field__error" role="alert" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </Modal>
  );
}
