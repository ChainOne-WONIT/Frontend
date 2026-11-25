import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { decideReview, getReviewDetail, submitKoditResult } from '../../../api/bank';
import type { ReviewDetail, ViewReason } from '../../../api/types';
import { Icon } from '../../../components/Icon';
import { ReasonModal } from '../../../components/Modal';
import { Card, ErrorBox, KeyValue, Loading, Note, Pill, StatusPill } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { VIEW_REASONS, won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { GRADE_TONE, REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from './review-format';
import './review.css';

const LIST = '/bank/review/applications';

/**
 * 심사 03 · 심사 상세.
 * 목록에서 조회 사유를 고르고 들어오면 바로 열립니다. 주소로 바로 들어오면 여기서 사유를 먼저 고릅니다.
 */
export function ReviewDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const state = useLocation().state as { reason?: ViewReason } | null;
  const passed = state?.reason && VIEW_REASONS.includes(state.reason) ? state.reason : undefined;
  const [reason, setReason] = useState<ViewReason | undefined>(passed);

  if (!reason) {
    return <ReasonModal onClose={() => navigate(LIST)} onOpen={setReason} />;
  }
  return <DetailView id={id} reason={reason} />;
}

function DetailView({ id, reason }: { id: string; reason: ViewReason }) {
  const { data, error, loading, reload, setData } = useAsync(
    () => getReviewDetail(id, reason),
    [id, reason],
  );

  if (loading) return <Loading />;
  if (error || !data)
    return <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />;

  const d = data;
  const maxDelta = Math.max(1, ...d.grade.factors.map((f) => Math.abs(f.delta)));

  return (
    <>
      <PageHead
        title={`${d.companyName} · ${d.counterpartyName} 거래용 한도`}
        sub={`신청 ${d.appliedAt}  ·  대금 수령 계좌 ${d.account}  ·  약정 ${d.consentCount}개 항목 동의 ${d.consentAt}`}
        right={
          <>
            <Pill tone={REVIEW_STATUS_TONE[d.status]}>{REVIEW_STATUS_LABEL[d.status]}</Pill>
            <Link to={LIST} className="btn btn--outline btn--sm">
              목록으로
            </Link>
          </>
        }
      />
      <p className="small muted rv-reason">
        <Icon name="info" size={14} /> 조회 사유: {reason} · 이 조회는 기록에 남습니다.
      </p>

      <div className="grid-2">
        <Card title="① 자격 확인 (규칙)">
          <ul className="list">
            {d.checks.map((c) => (
              <li key={c.label} className="list__item rv-check">
                <span className="list__main">{c.label}</span>
                <Pill tone={c.ok ? 'ok' : 'bad'}>{c.ok ? '문제 없음' : '문제 있음'}</Pill>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="② 등급 (모델)">
          <div className="rv-grade">
            <b className={`rv-grade__pd rv-grade__pd--${GRADE_TONE[d.grade.label]}`}>{d.pd}%</b>
            <Pill tone={GRADE_TONE[d.grade.label]}>{d.grade.label}</Pill>
            <span className="small muted">예측 부실확률 · 안정 4% 미만 / 제외 8% 이상</span>
          </div>
          <h3 className="rv-sub">판정에 크게 영향을 준 항목</h3>
          <ul className="rv-factors">
            {d.grade.factors.map((f) => (
              <li key={f.text}>
                <div className="row-between">
                  <span>{f.text}</span>
                  <span className={f.delta > 0 ? 'rv-up' : 'rv-down'}>
                    {f.delta > 0 ? `위험을 높임 +${f.delta}` : `위험을 낮춤 ${f.delta}`}
                  </span>
                </div>
                <div className="bar">
                  <i
                    className={f.delta > 0 ? 'rv-bar-up' : 'rv-bar-down'}
                    style={{ width: `${(Math.abs(f.delta) / maxDelta) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="근거 발주와 체인">
        <p className="rv-chain">발주 연결: {d.chainPath.join(' → ')}</p>
        <div className="list__item rv-order">
          <div className="list__main">
            <div className="list__title">
              {d.order.id} · {d.order.item} · {won(d.order.amount)}
            </div>
            <div className="list__sub">
              납기 {d.order.dueDate} · 수량 {d.order.quantity.toLocaleString()}
              {d.order.unit} · {d.order.place}
            </div>
          </div>
          <StatusPill status={d.order.status} />
        </div>
      </Card>

      {d.status === 'REVIEW' && <DecisionCard detail={d} onDone={setData} />}
      {d.status === 'KODIT_REVIEW' && <KoditCard detail={d} onDone={setData} />}
      {(d.status === 'APPROVED' || d.status === 'EXCLUDED') && <ResultCard detail={d} />}
    </>
  );
}

/** 판정: 시스템 판정과 다르게 확정하려면 사유가 꼭 있어야 합니다. */
function DecisionCard({
  detail,
  onDone,
}: {
  detail: ReviewDetail;
  onDone: (d: ReviewDetail) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sys = detail.systemDecision;

  const decide = async (result: 'PASS' | 'EXCLUDE') => {
    if (result !== sys && !reason.trim()) {
      setError('시스템 판정과 다르게 확정하려면 사유를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onDone(await decideReview(detail.id, { result, reason: reason.trim() || undefined }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="판정"
      right={
        <span className="row-gap small muted">
          시스템 판정
          <Pill tone={sys === 'PASS' ? 'ok' : 'bad'}>{sys === 'PASS' ? '통과' : '제외'}</Pill>
        </span>
      }
    >
      <label className="field">
        <span className="field__label">시스템 판정과 다르게 확정할 때 사유 (필수)</span>
        <input
          className={`input${error ? ' input--error' : ''}`}
          placeholder="예: 연체가 해소되어 최근 3개월 정상 상환 중"
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
          onClick={() => decide('PASS')}
        >
          통과로 확정
        </button>
        <button
          type="button"
          className="btn btn--danger"
          disabled={busy}
          onClick={() => decide('EXCLUDE')}
        >
          제외로 확정
        </button>
      </div>
      <div className="rv-gap">
        <Note tone="warn">
          자동 평가만으로 거절을 확정하지 않습니다. 시스템 판정과 다르게 확정하려면 사유가
          필요합니다.
        </Note>
      </div>
    </Card>
  );
}

/** 심사 통과 뒤 신용보증기금 승인 결과를 입력합니다. */
function KoditCard({
  detail,
  onDone,
}: {
  detail: ReviewDetail;
  onDone: (d: ReviewDetail) => void;
}) {
  const [amountEok, setAmountEok] = useState('');
  const [expireAt, setExpireAt] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (approved: boolean) => {
    const amount = Math.round(Number(amountEok) * 1e8);
    if (approved && !(amount > 0)) {
      setError('승인 한도를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onDone(
        await submitKoditResult(
          detail.id,
          approved
            ? { approved, amount, expireAt: expireAt || undefined }
            : { approved, reason: reason.trim() || undefined },
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="신보 승인 결과 입력" right={<Pill tone="violet">신보 심사 중</Pill>}>
      {detail.decision && (
        <p className="small muted" style={{ marginBottom: 14 }}>
          은행 심사: {detail.decision.result === 'PASS' ? '통과' : '제외'} 확정 ·{' '}
          {detail.decision.by} · {detail.decision.at}
        </p>
      )}
      <div className="form-grid rv-kodit">
        <label className="field">
          <span className="field__label">승인 한도 (억 원)</span>
          <input
            className="input"
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            placeholder="예: 3"
            value={amountEok}
            onChange={(e) => setAmountEok(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">만료일 (비우면 1년 뒤)</span>
          <input
            className="input"
            type="date"
            value={expireAt}
            onChange={(e) => setExpireAt(e.target.value)}
          />
        </label>
        <label className="field form-grid__full">
          <span className="field__label">신보가 거절한 경우 사유</span>
          <input
            className="input"
            placeholder="예: 보증 한도 초과"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      </div>
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
          onClick={() => submit(true)}
        >
          승인으로 저장
        </button>
        <button
          type="button"
          className="btn btn--danger"
          disabled={busy}
          onClick={() => submit(false)}
        >
          신보 거절로 저장
        </button>
      </div>
    </Card>
  );
}

function ResultCard({ detail: d }: { detail: ReviewDetail }) {
  return (
    <Card
      title="심사 결과"
      right={<Pill tone={REVIEW_STATUS_TONE[d.status]}>{REVIEW_STATUS_LABEL[d.status]}</Pill>}
    >
      <KeyValue
        rows={[
          ...(d.status === 'APPROVED'
            ? ([
                ['승인 한도', <b key="a">{won(d.amount)}</b>],
                ['만료일', d.expireAt ?? '-'],
              ] as [string, ReactNode][])
            : ([['제외 사유', d.excludeReason ?? '-']] as [string, ReactNode][])),
          ...(d.decision
            ? ([
                [
                  '은행 심사',
                  `${d.decision.result === 'PASS' ? '통과' : '제외'} 확정 · ${d.decision.by} · ${d.decision.at}${d.decision.reason ? ` · 사유: ${d.decision.reason}` : ''}`,
                ],
              ] as [string, ReactNode][])
            : []),
        ]}
      />
    </Card>
  );
}
