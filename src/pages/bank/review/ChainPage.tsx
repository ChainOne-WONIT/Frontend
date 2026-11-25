import { Fragment, useState } from 'react';
import { getChain } from '../../../api/bank';
import type { AlertStage } from '../../../api/types';
import { Card, ErrorBox, Loading, Note, StatusPill } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { dot, won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { STAGE_KEY } from './review-format';
import './review.css';

const STAGES: AlertStage[] = ['정상', '관심', '주의', '경보'];

/** 심사 05 · 발주 체인 조회 */
export function ChainPage() {
  const [rootId, setRootId] = useState<string | undefined>();
  const { data, error, loading, reload } = useAsync(() => getChain(rootId), [rootId]);

  return (
    <>
      <PageHead
        title="발주 체인"
        sub="수락된 발주를 회사끼리 이어 자동으로 만든 체인입니다. 심사와 여신 담당만 전체를 봅니다."
        right={data && <span className="small muted">{dot(data.asOf)} 기준</span>}
      />

      {error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <div className="rv-kpis">
            <div className="card kpi">
              <div className="kpi__head">시작 기업의 발주 합계</div>
              <div className="kpi__value">
                <b>{won(data.orderTotal)}</b>
              </div>
            </div>
            <div className="card kpi">
              <div className="kpi__head">체인 안 대출 잔액 합계</div>
              <div className="kpi__value">
                <b>{won(data.loanBalance)}</b>
              </div>
            </div>
            <div className="card kpi">
              <div className="kpi__head">발주 대비 대출</div>
              <div className="kpi__value">
                <b>
                  {data.orderTotal ? Math.round((data.loanBalance / data.orderTotal) * 100) : 0}%
                </b>
              </div>
            </div>
          </div>

          <Card
            title="발주 체인"
            right={
              <label className="row-gap small muted">
                체인의 시작 기업
                <select
                  className="input rv-select"
                  value={data.rootId}
                  onChange={(e) => setRootId(e.target.value)}
                >
                  {data.roots.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
            }
          >
            <div className={`rv-chainmap${loading ? ' is-loading' : ''}`}>
              {data.nodes.map((n, i) => (
                <Fragment key={n.name}>
                  {i > 0 && (
                    <div className="rv-link">
                      <b>{data.links[i - 1]?.orderId}</b>
                      <span className="rv-link__arrow" aria-hidden="true" />
                      <span>{won(data.links[i - 1]?.amount)}</span>
                    </div>
                  )}
                  <div className={`rv-node rv-node--${STAGE_KEY[n.stage]}`}>
                    <b>{n.name}</b>
                    <span>
                      {n.tier} · {n.stage}
                    </span>
                  </div>
                </Fragment>
              ))}
            </div>
            <div className="rv-legend">
              {STAGES.map((s) => (
                <span key={s} className={`rv-legend__item rv-legend__item--${STAGE_KEY[s]}`}>
                  {s}
                </span>
              ))}
            </div>
            <Note>
              테두리 색이 경보 단계입니다. 대출 합계가 시작 기업의 발주보다 커져도 막지 않고, 이
              지표로 지켜봅니다.
            </Note>
          </Card>

          <Card title="체인 안의 발주와 대출">
            <table className="table">
              <thead>
                <tr>
                  <th>발주</th>
                  <th>내는 기업 → 받는 기업</th>
                  <th>발주금액</th>
                  <th>발주 상태</th>
                  <th>연결 대출</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.orderId}>
                    <td>
                      <b>{r.orderId}</b>
                    </td>
                    <td>
                      {r.from} → {r.to}
                    </td>
                    <td className="num">{won(r.amount)}</td>
                    <td>
                      <StatusPill status={r.status} />
                    </td>
                    <td className={r.loan?.statusLabel === '연체' ? 'rv-overdue' : undefined}>
                      {r.loan
                        ? `${r.loan.id} · ${won(r.loan.amount)} · ${r.loan.statusLabel}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
