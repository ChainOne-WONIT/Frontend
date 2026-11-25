import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { approveLoan, checkLoanFlag, getLoanDetail, holdLoan } from '../../../api/loan';
import type { LoanDetail, LoanViewReason } from '../../../api/types';
import { ReasonGate } from '../../../components/ReasonGate';
import { Card, ErrorBox, KeyValue, Loading, Note, Pill, StatusPill } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { LOAN_VIEW_REASONS, won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { GRADE_TONE } from '../review/review-format';
import { LOAN_STATUS_LABEL, LOAN_STATUS_TONE, STAGE_TONE } from './loan-format';
import '../review/review.css';
import './loan.css';

const LIST = '/bank/loan/loans';

/** 여신 03 · 대출 상세 */
export function LoanDetailPage() {
  const { id = '' } = useParams();
  return (
    <ReasonGate reasons={LOAN_VIEW_REASONS} back={LIST}>
      {(reason) => <DetailView id={id} reason={reason} />}
    </ReasonGate>
  );
}

function DetailView({ id, reason }: { id: string; reason: LoanViewReason }) {
  const { data, error, loading, reload, setData } = useAsync(
    () => getLoanDetail(id, reason),
    [id, reason],
  );
  const [flagBusy, setFlagBusy] = useState('');

  if (loading) return <Loading />;
  if (error || !data)
    return <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />;

  const d = data;
  const toggleFlag = async (flagId: string) => {
    setFlagBusy(flagId);
    try {
      setData(await checkLoanFlag(d.id, flagId));
    } finally {
      setFlagBusy('');
    }
  };

  return (
    <>
      <PageHead
        title={`${d.id} · ${d.companyName}`}
        sub={`신청 ${d.appliedAt}  ·  만기 ${d.dueDate ?? '-'} (납기일 + 60일)  ·  조회 사유: ${reason}`}
        right={
          <>
            <Pill tone={LOAN_STATUS_TONE[d.status]}>{LOAN_STATUS_LABEL[d.status]}</Pill>
            <Link to={LIST} className="btn btn--outline btn--sm">
              목록으로
            </Link>
          </>
        }
      />

      <div className="grid-2">
        <Card title="신청 내용">
          <KeyValue
            rows={[
              ['신청 금액', <b key="a">{won(d.amount)}</b>],
              [
                '근거 발주',
                <span key="o" className="row-gap">
                  <b>
                    {d.orderId} · {d.orderItem}
                  </b>
                  <StatusPill status={d.orderStatus} />
                </span>,
              ],
              [
                '발주금액',
                <b key="m">
                  {won(d.orderAmount)} ({d.ratio}% = {won((d.orderAmount * d.ratio) / 100)})
                </b>,
              ],
              ['발주 체인', <b key="c">{d.chainPath.join(' → ')}</b>],
              ['한도', <b key="l">{`${won(d.limit.amount)} 중 사용 ${won(d.limit.used)}`}</b>],
              [
                '등급 · 경보',
                <span key="g" className="row-gap">
                  <Pill tone={GRADE_TONE[d.grade]}>{d.grade}</Pill>
                  <Pill tone={STAGE_TONE[d.alertStage]}>{d.alertStage}</Pill>
                </span>,
              ],
            ]}
          />
        </Card>

        <Card
          title="확인 항목 표시"
          right={
            <Pill tone={d.flags.length ? 'warn' : 'ok'}>
              {d.flags.length ? `${d.flags.length}개` : '없음'}
            </Pill>
          }
        >
          {d.flags.length === 0 ? (
            <p className="empty">들여다볼 확인 항목이 없습니다.</p>
          ) : (
            <ul className="list">
              {d.flags.map((f) => (
                <li key={f.id} className="list__item">
                  <div className="list__main">
                    <div className="list__title">{f.title}</div>
                    <div className="list__sub">{f.detail}</div>
                  </div>
                  <button
                    type="button"
                    className={`ln-check${f.checked ? ' is-on' : ''}`}
                    aria-pressed={f.checked}
                    disabled={flagBusy === f.id}
                    onClick={() => toggleFlag(f.id)}
                  >
                    {f.checked ? '확인함 ✓' : '확인'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="rv-gap">
            <Note>
              표시는 거절 사유가 아니라 들여다볼 곳을 알려 주는 것입니다. 이 단계에서 등급으로 다시
              평가하지 않습니다.
            </Note>
          </div>
        </Card>
      </div>

      {d.status === 'PENDING' || d.status === 'HOLD' ? (
        <DecisionCard detail={d} onDone={setData} />
      ) : (
        <Card
          title="처리 결과"
          right={<Pill tone={LOAN_STATUS_TONE[d.status]}>{LOAN_STATUS_LABEL[d.status]}</Pill>}
        >
          <KeyValue
            rows={[
              ['실행일', d.executedAt ?? '-'],
              ['만기일', d.dueDate ?? '-'],
              ['처리자', d.decidedBy ?? '-'],
              ['지급 계좌', `${d.companyName} 대금 수령 계좌 ${d.account}`],
            ]}
          />
        </Card>
      )}
    </>
  );
}

function DecisionCard({
  detail: d,
  onDone,
}: {
  detail: LoanDetail;
  onDone: (d: LoanDetail) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (approve: boolean) => {
    if (!approve && !reason.trim()) {
      setError('보류하려면 사유를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onDone(approve ? await approveLoan(d.id) : await holdLoan(d.id, reason.trim()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="처리" right={d.status === 'HOLD' && <Pill tone="gray">보류 중</Pill>}>
      {d.status === 'HOLD' && (
        <p className="small muted" style={{ marginBottom: 12 }}>
          {d.decidedAt} 보류 · {d.decidedBy} · 사유: {d.holdReason}
        </p>
      )}
      {d.status === 'PENDING' && (
        <label className="field">
          <span className="field__label">보류할 때 사유 (보류 시 필수)</span>
          <input
            className={`input${error ? ' input--error' : ''}`}
            placeholder="예: 납품 일정 확인 후 재검토"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      )}
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
          승인하고 실행
        </button>
        {d.status === 'PENDING' && (
          <button
            type="button"
            className="btn btn--danger"
            disabled={busy}
            onClick={() => run(false)}
          >
            보류
          </button>
        )}
      </div>
      <p className="small muted rv-gap">
        실행하면 {d.companyName} 대금 수령 계좌({d.account})로 지급되고, 대금이 들어오면 그 계좌에서
        회수합니다.
      </p>
    </Card>
  );
}
