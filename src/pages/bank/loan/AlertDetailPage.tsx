import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { addAlertAction, getAlertDetail } from '../../../api/loan';
import type { AlertActionType, LoanViewReason } from '../../../api/types';
import {
  TError,
  TFKeys,
  TKV,
  TLoading,
  TReasonGate,
  TSection,
  TTag,
  TTitle,
  type TTone,
} from '../../../components/terminal';
import { LOAN_VIEW_REASONS, won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { GRADE_TONE } from '../review/review-format';
import { STAGE_TONE } from './loan-format';
import './loan.css';

const LIST = '/bank/loan/alerts';
const ACTIONS: AlertActionType[] = ['관찰 강화', '거래처 통지', '담당자 면담', '조치 완료'];

/** [L0320] 경보 상세 (단말형). 조회 사유를 고른 뒤에만 열립니다. */
export function AlertDetailPage() {
  const { id = '' } = useParams();
  return (
    <TReasonGate reasons={LOAN_VIEW_REASONS} back={LIST}>
      {(reason) => <DetailView id={id} reason={reason} />}
    </TReasonGate>
  );
}

function DetailView({ id, reason }: { id: string; reason: LoanViewReason }) {
  const navigate = useNavigate();
  const {
    data: a,
    error,
    loading,
    reload,
    setData,
  } = useAsync(() => getAlertDetail(id, reason), [id, reason]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const act = async (type: AlertActionType) => {
    if (!a) return;
    setBusy(true);
    setMsg(null);
    try {
      setData(await addAlertAction(a.id, type));
      setMsg({ ok: true, text: `"${type}" 조치를 기록했습니다.` });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TTitle
        code="L0320"
        num="3200"
        title={a ? `경보 상세 · ${a.companyName}` : '경보 상세'}
        right={
          <>
            {a && <TTag tone={STAGE_TONE[a.stage]}>{a.stage}</TTag>}
            <button type="button" className="tb" onClick={() => navigate(LIST)}>
              목록[F3]
            </button>
          </>
        }
      />
      {loading && !a ? (
        <TLoading />
      ) : error || !a ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TSection title="기업 정보" right={`조회 사유: ${reason} · 조회 기록 저장됨`} />
          <TKV
            labelWidth={100}
            rows={[
              [
                { label: '기업', value: a.companyName, strong: true },
                { label: '체인 위치', value: a.tier },
                { label: '업종', value: a.industry },
              ],
              [
                { label: '점수', value: `${a.score}점`, strong: true, tone: STAGE_TONE[a.stage] },
                {
                  label: '단계',
                  value: (
                    <>
                      <TTag tone={STAGE_TONE[a.stage]}>{a.stage}</TTag>
                      {a.immediate && <TTag tone="bad">즉시 경보 · {a.immediate}</TTag>}
                    </>
                  ),
                },
                {
                  label: '단계 기준',
                  value: `관심 ${a.stages.watch} / 주의 ${a.stages.caution} / 경보 ${a.stages.alert}`,
                },
              ],
            ]}
          />

          <div className="tt-halves">
            <div>
              <TSection title="점수와 신호" right="가중치는 운영 설정값" />
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>신호</th>
                    <th>내용</th>
                    <th>점수</th>
                  </tr>
                </thead>
                <tbody>
                  {a.signals.map((s, i) => (
                    <tr key={i}>
                      <td>{s.label}</td>
                      <td>{s.detail}</td>
                      <td className="r tt-c--bad">
                        <b>+{s.points}</b>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <b>합계</b>
                    </td>
                    <td />
                    <td className="r tt-c--bad">
                      <b>{a.score}</b>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <TSection title="조치 기록" right="자동으로 한도를 줄이지 않음" />
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>조치</th>
                    <th>처리자</th>
                    <th>일자</th>
                  </tr>
                </thead>
                <tbody>
                  {a.actions.length === 0 && (
                    <tr className="tt-empty">
                      <td colSpan={3}>아직 조치 기록이 없습니다.</td>
                    </tr>
                  )}
                  {a.actions.map((x, i) => (
                    <tr key={i}>
                      <td>
                        <b>{x.type}</b>
                      </td>
                      <td>{x.by}</td>
                      <td className="c">{x.at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ln-actions">
                {ACTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="tb tb--sm"
                    disabled={busy}
                    onClick={() => act(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <TSection
            title="전이 계산: 엮인 기업"
            right="경보가 생기면 대상 기업과 직접 거래처의 등급을 다시 산출"
          />
          <table className="tt-table">
            <thead>
              <tr>
                <th>기업</th>
                <th>거리</th>
                <th>의존도</th>
                <th>노출</th>
                <th>등급</th>
                <th>위험도</th>
              </tr>
            </thead>
            <tbody>
              {a.propagation.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={6}>엮인 기업 정보가 없습니다.</td>
                </tr>
              )}
              {a.propagation.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td>
                  <td className="c">{p.distance}단계</td>
                  <td className="r">{p.dependency}%</td>
                  <td className="r">{won(p.exposure)}</td>
                  <td className="c">
                    <TTag tone={GRADE_TONE[p.grade] as TTone}>{p.grade}</TTag>
                  </td>
                  <td>
                    <span className="ln-riskbar">
                      <span className="bar">
                        <i
                          className={`ln-risk--${p.risk >= 40 ? 'high' : p.risk >= 15 ? 'mid' : 'low'}`}
                          style={{ width: `${p.risk}%` }}
                        />
                      </span>
                      <b>{p.risk}</b>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="tt-note">
            ※ 위험도 계산식의 계수는 설계값입니다. 관찰 등급은 같은 충격에도 더 높게 잡습니다.
          </p>

          {msg && (
            <p
              className={msg.ok ? 'tt-note tt-c--ok' : 'tt-warn'}
              role={msg.ok ? 'status' : 'alert'}
            >
              {msg.ok ? '● ' : '✕ '}
              {msg.text}
            </p>
          )}

          <TFKeys
            keys={[
              { label: '목록', fkey: 'F3', onClick: () => navigate(LIST) },
              { label: '체인 조회', fkey: 'F6', onClick: () => navigate('/bank/loan/chain') },
              { label: '조치 완료', fkey: 'F8', disabled: busy, onClick: () => act('조치 완료') },
              {
                label: '관찰 강화 기록',
                fkey: 'F7',
                kind: 'primary',
                disabled: busy,
                onClick: () => act('관찰 강화'),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
