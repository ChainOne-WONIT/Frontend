import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getLoans } from '../../../api/loan';
import type { LoanRow } from '../../../api/types';
import { ReasonModal } from '../../../components/Modal';
import { Card, ErrorBox, Loading, Pill } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { dot, LOAN_VIEW_REASONS, won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { LOAN_STATUS_LABEL, LOAN_STATUS_TONE } from './loan-format';
import '../review/review.css';
import './loan.css';

/** 여신 02 · 생산자금 대출 */
export function LoansPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getLoans, []);
  const [target, setTarget] = useState<LoanRow | null>(null);

  const detail = (l: LoanRow) => (
    <button type="button" className="btn btn--outline btn--sm" onClick={() => setTarget(l)}>
      상세
    </button>
  );
  const status = (l: LoanRow) => (
    <Pill tone={LOAN_STATUS_TONE[l.status]}>{LOAN_STATUS_LABEL[l.status]}</Pill>
  );

  return (
    <>
      <PageHead
        title="생산자금 대출"
        sub="협력사가 수락된 발주를 근거로 신청한 생산자금을 승인하고 실행합니다."
        right={data && <span className="small muted">{dot(data.asOf)} 기준</span>}
      />

      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <Card title="승인 대기" right={<Pill tone="warn">{data.pending.length}건</Pill>}>
            {data.pending.length === 0 ? (
              <p className="empty">승인을 기다리는 대출이 없습니다.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>대출번호</th>
                    <th>신청 기업</th>
                    <th>근거 발주 (발주처)</th>
                    <th>신청 금액</th>
                    <th>확인 항목</th>
                    <th>상태</th>
                    <th aria-label="상세" />
                  </tr>
                </thead>
                <tbody>
                  {data.pending.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <b>{l.id}</b>
                      </td>
                      <td>{l.companyName}</td>
                      <td>
                        {l.orderId} · {l.orderItem} ({l.counterpartyName})
                      </td>
                      <td className="num">{won(l.amount)}</td>
                      <td>{l.flagCount ? <Pill tone="warn">{l.flagCount}개</Pill> : '없음'}</td>
                      <td>{status(l)}</td>
                      <td className="rv-cell-act">{detail(l)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="대출 현황">
            <table className="table">
              <thead>
                <tr>
                  <th>대출번호</th>
                  <th>기업</th>
                  <th>근거 발주</th>
                  <th>금액</th>
                  <th>실행 · 만기</th>
                  <th>상태</th>
                  <th aria-label="상세" />
                </tr>
              </thead>
              <tbody>
                {data.loans.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <b>{l.id}</b>
                    </td>
                    <td>{l.companyName}</td>
                    <td>
                      {l.orderId} · {l.orderItem}
                    </td>
                    <td className="num">{won(l.amount)}</td>
                    <td className="num">
                      {l.executedAt ?? '—'} · {l.dueDate ?? '—'}
                    </td>
                    <td>{status(l)}</td>
                    <td className="rv-cell-act">{detail(l)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card
            title="대금 지급 지연"
            right={<span className="small muted">받는 기업이 "받지 못함"을 누른 발주</span>}
          >
            {data.paymentDelays.length === 0 ? (
              <p className="empty">지급 지연이 없습니다.</p>
            ) : (
              <ul className="list">
                {data.paymentDelays.map((d) => (
                  <li key={d.orderId} className="list__item">
                    <div className="list__main">
                      <div className="list__title">
                        {d.orderId} · {d.item}
                      </div>
                      <div className="list__sub">
                        {d.from} → {d.to} · {won(d.amount)} · 지급 예정일 {d.payDueDate}
                      </div>
                    </div>
                    <Pill tone="bad">지급 지연</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {target && (
        <ReasonModal
          reasons={LOAN_VIEW_REASONS}
          defaultReason={target.status === 'PENDING' ? '승인 심사' : '사후관리'}
          onClose={() => setTarget(null)}
          onOpen={(reason) => navigate(`/bank/loan/loans/${target.id}`, { state: { reason } })}
        />
      )}
    </>
  );
}
