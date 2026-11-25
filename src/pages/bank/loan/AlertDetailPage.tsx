import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { addAlertAction, getAlertDetail } from '../../../api/loan';
import type { AlertActionType, LoanViewReason } from '../../../api/types';
import { ReasonGate } from '../../../components/ReasonGate';
import { Card, ErrorBox, Loading, Note, Pill } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { LOAN_VIEW_REASONS, won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { STAGE_TONE } from './loan-format';
import '../review/review.css';
import './loan.css';

const LIST = '/bank/loan/alerts';
const ACTIONS: AlertActionType[] = ['관찰 강화', '거래처 통지', '담당자 면담', '조치 완료'];

/** 여신 05 · 경보 상세 */
export function AlertDetailPage() {
  const { id = '' } = useParams();
  return (
    <ReasonGate reasons={LOAN_VIEW_REASONS} back={LIST}>
      {(reason) => <DetailView id={id} reason={reason} />}
    </ReasonGate>
  );
}

function DetailView({ id, reason }: { id: string; reason: LoanViewReason }) {
  const { data, error, loading, reload, setData } = useAsync(
    () => getAlertDetail(id, reason),
    [id, reason],
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  if (loading) return <Loading />;
  if (error || !data)
    return <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />;

  const a = data;
  const st = a.stages;
  const act = async (type: AlertActionType) => {
    setBusy(true);
    setActionError('');
    try {
      setData(await addAlertAction(a.id, type));
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        title={a.companyName}
        sub={`${a.tier}  ·  ${a.industry}  ·  조회 사유: ${reason}`}
        right={
          <>
            <Pill tone={STAGE_TONE[a.stage]}>{a.stage}</Pill>
            <Link to={LIST} className="btn btn--outline btn--sm">
              목록으로
            </Link>
          </>
        }
      />

      <div className="grid-2">
        <Card title="점수와 신호">
          <div className="ln-score">
            <b className={`ln-score__num ln-score__num--${STAGE_TONE[a.stage]}`}>{a.score}점</b>
            <span className="small muted">
              관심 {st.watch} / 주의 {st.caution} / 경보 {st.alert}
            </span>
            {a.immediate && <Pill tone="bad">즉시 경보 · {a.immediate}</Pill>}
          </div>
          <ul className="list">
            {a.signals.map((s, i) => (
              <li key={i} className="list__item">
                <div className="list__main">
                  <div className="list__title">{s.label}</div>
                  <div className="list__sub">{s.detail}</div>
                </div>
                <b className="ln-points">+{s.points}</b>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="조치 기록">
          {a.actions.length === 0 ? (
            <p className="empty">아직 조치 기록이 없습니다.</p>
          ) : (
            <ul className="list">
              {a.actions.map((x, i) => (
                <li key={i} className="list__item">
                  <div className="list__main">
                    <div className="list__title">{x.type}</div>
                    <div className="list__sub">
                      {x.by} · {x.at}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="ln-actions rv-gap">
            {ACTIONS.map((t) => (
              <button
                key={t}
                type="button"
                className="btn btn--outline btn--sm"
                disabled={busy}
                onClick={() => act(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {actionError && (
            <p className="field__error rv-gap" role="alert">
              {actionError}
            </p>
          )}
          <div className="rv-gap">
            <Note>자동으로 한도를 줄이거나 대출을 막지 않습니다.</Note>
          </div>
        </Card>
      </div>

      <Card
        title="전이 계산: 엮인 기업"
        right={
          <span className="small muted">
            경보가 생기면 대상 기업과 직접 거래처의 등급을 다시 산출합니다
          </span>
        }
      >
        {a.propagation.length === 0 ? (
          <p className="empty">엮인 기업 정보가 없습니다.</p>
        ) : (
          <ul className="list">
            {a.propagation.map((p) => (
              <li key={p.name} className="list__item">
                <div className="list__main">
                  <div className="list__title">{p.name}</div>
                  <div className="list__sub">
                    거리 {p.distance}단계 · 의존도 {p.dependency}% · 노출 {won(p.exposure)} · 등급{' '}
                    {p.grade}
                  </div>
                </div>
                <div className="ln-risk">
                  <div className="bar">
                    <i
                      className={`ln-risk--${p.risk >= 40 ? 'high' : p.risk >= 15 ? 'mid' : 'low'}`}
                      style={{ width: `${p.risk}%` }}
                    />
                  </div>
                  <span className="small muted">위험도 {p.risk}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Note>위험도 계산식의 계수는 설계값입니다. 관찰 등급은 같은 충격에도 더 높게 잡습니다.</Note>
    </>
  );
}
