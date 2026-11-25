import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getRiskAlerts } from '../../../api/loan';
import type { RiskAlert } from '../../../api/types';
import { ReasonModal } from '../../../components/Modal';
import { Card, ErrorBox, Loading, Note, Pill } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { dot, LOAN_VIEW_REASONS } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { STAGE_TONE } from './loan-format';
import '../review/review.css';
import './loan.css';

/** 여신 04 · 리스크 경보 */
export function RiskAlertsPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getRiskAlerts, []);
  const [target, setTarget] = useState<RiskAlert | null>(null);

  return (
    <>
      <PageHead
        title="리스크 경보"
        sub={
          data
            ? `지급 지연 ${data.weights.payDelay}, 상환 지연 ${data.weights.repayDelay}, 발주 급감 ${data.weights.orderDrop}, 납품 지연 ${data.weights.deliveryDelay}, 이벤트 ${data.weights.event}. 부도·회생 신청·휴폐업은 바로 경보.`
            : '신호별 점수를 더해 경보 단계를 정합니다. 부도·회생 신청·휴폐업은 바로 경보.'
        }
        right={data && <span className="small muted">{dot(data.asOf)} 기준</span>}
      />

      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <div className="grid-4">
            {[
              ['경보 기업', `${data.stats.alertCompanies}곳`],
              ['주의 이상', `${data.stats.cautionOrAbove}곳`],
              ['이번 주 새 신호', `${data.stats.newSignalsThisWeek}건`],
              ['조치 완료', `${data.stats.actionsDone}건`],
            ].map(([label, value]) => (
              <div key={label} className="card kpi">
                <div className="kpi__head">{label}</div>
                <div className="kpi__value">
                  <b>{value}</b>
                </div>
              </div>
            ))}
          </div>

          <Card title="경보 기업">
            {data.alerts.length === 0 ? (
              <p className="empty">경보 기업이 없습니다.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>기업</th>
                    <th>신호</th>
                    <th>점수</th>
                    <th>단계</th>
                    <th>최근 조치</th>
                    <th aria-label="상세" />
                  </tr>
                </thead>
                <tbody>
                  {data.alerts.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <b>{a.companyName}</b>
                      </td>
                      <td>
                        {a.immediate && <Pill tone="bad">즉시 경보 · {a.immediate}</Pill>}{' '}
                        {a.signals.map((s) => s.label).join(', ')}
                      </td>
                      <td className="num">{a.score}점</td>
                      <td>
                        <Pill tone={STAGE_TONE[a.stage]}>{a.stage}</Pill>
                      </td>
                      <td>{a.actions[0] ? `${a.actions[0].type} · ${a.actions[0].at}` : '—'}</td>
                      <td className="rv-cell-act">
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => setTarget(a)}
                        >
                          상세
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="점수 기준">
            <div className="ln-stages">
              <span>
                <Pill tone="warn">관심</Pill> {data.stages.watch}점 이상
              </span>
              <span>
                <Pill tone="warn">주의</Pill> {data.stages.caution}점 이상
              </span>
              <span>
                <Pill tone="bad">경보</Pill> {data.stages.alert}점 이상
              </span>
              <span>
                <Pill tone="bad">즉시 경보</Pill> 부도 · 회생 신청 · 휴폐업
              </span>
            </div>
          </Card>

          <Note>
            자동으로 한도를 줄이거나 대출을 막지 않습니다. 주의 표시는 대출 승인 화면에 따라
            나옵니다.
          </Note>
        </>
      )}

      {target && (
        <ReasonModal
          reasons={LOAN_VIEW_REASONS}
          defaultReason="사후관리"
          onClose={() => setTarget(null)}
          onOpen={(reason) => navigate(`/bank/loan/alerts/${target.id}`, { state: { reason } })}
        />
      )}
    </>
  );
}
