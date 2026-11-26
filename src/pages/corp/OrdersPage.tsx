import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { getOrders } from '../../api/corp';
import type { OrderDirection, OrderStatus } from '../../api/types';
import { Icon } from '../../components/Icon';
import { ErrorBox, Loading, Note, StatusPill } from '../../components/ui';
import { PageHead } from '../../layouts/CorpLayout';
import { won } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { CompanySearchModal } from './CompanySearchModal';

const DONE: OrderStatus[] = ['COMPLETED', 'REJECTED', 'CANCELED'];
type Filter = 'all' | 'open' | 'done';

export function OrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: OrderDirection = params.get('tab') === 'sent' ? 'sent' : 'received';
  const filter = (params.get('filter') as Filter) || 'all';
  const { data, error, loading, reload } = useAsync(() => getOrders(), []);
  const [searching, setSearching] = useState(false);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    next.set(k, v);
    setParams(next, { replace: true });
  };

  const all = data ?? [];
  const recvCount = all.filter((o) => o.direction === 'received').length;
  const sentCount = all.filter((o) => o.direction === 'sent').length;
  const list = all
    .filter((o) => o.direction === tab)
    .filter((o) =>
      filter === 'all'
        ? true
        : filter === 'done'
          ? DONE.includes(o.status)
          : !DONE.includes(o.status),
    );

  return (
    <>
      <PageHead
        title="발주"
        sub="받은 발주는 수락하거나 반려하고, 낸 발주는 진행 상황을 확인합니다."
        right={
          <button type="button" className="btn btn--primary" onClick={() => setSearching(true)}>
            <Icon name="search" size={18} />
            기업 검색
          </button>
        }
      />

      <div className="row-between">
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'received'}
            className={tab === 'received' ? 'is-on' : ''}
            onClick={() => setParam('tab', 'received')}
          >
            받은 발주 {recvCount}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'sent'}
            className={tab === 'sent' ? 'is-on' : ''}
            onClick={() => setParam('tab', 'sent')}
          >
            낸 발주 {sentCount}
          </button>
        </div>
        <div className="tabs">
          {(
            [
              ['all', '전체'],
              ['open', '진행 중'],
              ['done', '완료'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              className={filter === k ? 'is-on' : ''}
              onClick={() => setParam('filter', k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <section className="card">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} onRetry={reload} />
        ) : list.length === 0 ? (
          <p className="empty">해당하는 발주가 없습니다.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>발주번호</th>
                <th>품목</th>
                <th style={{ width: 170 }}>{tab === 'received' ? '보낸 기업' : '받는 기업'}</th>
                <th style={{ width: 150 }}>발주금액</th>
                <th style={{ width: 120 }}>납기일</th>
                <th style={{ width: 150 }}>상태</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="is-link" onClick={() => navigate(`/corp/orders/${o.id}`)}>
                  <td>
                    <b>{o.id}</b>
                  </td>
                  <td>
                    {o.item}{' '}
                    {o.direction === 'sent' && o.todo && (
                      <span className="todo-tag">할 일 · {o.todo}</span>
                    )}
                  </td>
                  <td>{o.counterpartyName}</td>
                  <td className="num">{won(o.amount)}</td>
                  <td className="num">{o.dueDate}</td>
                  <td>
                    <StatusPill status={o.status} />
                  </td>
                  <td>
                    <button type="button" className="btn btn--outline btn--sm">
                      보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Note>
        수락된 발주만 생산자금 신청의 근거가 됩니다. 수락 전 발주는 내는 기업이 취소할 수 있습니다.
      </Note>
      {searching && (
        <CompanySearchModal
          onClose={() => setSearching(false)}
          onOrder={(c) => navigate('/corp/orders/new', { state: { receiverId: c.id } })}
        />
      )}
    </>
  );
}
