import { useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { getOrders } from '../../api/corp';
import type { OrderDirection, OrderStatus, OrderSummary } from '../../api/types';
import { Icon } from '../../components/Icon';
import { ErrorBox, Loading, Note, StatusPill } from '../../components/ui';
import { PageHead } from '../../layouts/CorpLayout';
import { FLOW_STEPS, flowLabel, STATUS_LABEL, won } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { CompanySearchModal } from './CompanySearchModal';
import { workTodo } from './order-work';
import './orders.css';

const DONE: OrderStatus[] = ['COMPLETED', 'REJECTED', 'CANCELED'];
/** 상태 선택 상자 항목: 진행 단계 순서, 그다음 반려·취소 */
const STATUS_OPTIONS = [...FLOW_STEPS, STATUS_LABEL.REJECTED, STATUS_LABEL.CANCELED];
type Filter = 'all' | 'open' | 'done';
/** 받은 발주 · 낸 발주 · 작업중(내가 버튼을 눌러야 하는 발주) */
type Tab = OrderDirection | 'working';

export function OrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = tabParam === 'sent' || tabParam === 'working' ? tabParam : 'received';
  const filter = (params.get('filter') as Filter) || 'all';
  const { data, error, loading, reload } = useAsync(() => getOrders(), []);
  const [searching, setSearching] = useState(false);
  const listId = useId();
  const [company, setCompany] = useState(() => params.get('company') ?? '');

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };
  // 받은 발주와 낸 발주는 거래 기업이 다르므로, 탭을 바꾸면 검색어를 비웁니다.
  const switchTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    next.delete('company');
    next.delete('status');
    next.delete('dir');
    setCompany('');
    setParams(next, { replace: true });
  };

  const all = data ?? [];
  const recvCount = all.filter((o) => o.direction === 'received').length;
  const sentCount = all.filter((o) => o.direction === 'sent').length;
  const working = all.filter((o) => workTodo(o));
  const inTab = (o: OrderSummary) => (tab === 'working' ? !!workTodo(o) : o.direction === tab);
  // 거래 기업 검색: 받은 발주는 보낸 기업, 낸 발주는 받는 기업 이름으로 찾습니다.
  // 입력 값은 화면 상태로 둡니다. 주소 값을 바로 쓰면 한글 조합 중 글자가 겹쳐 들어갑니다.
  // 주소(?company=)에는 조합이 끝난 값만 담아 새로고침해도 남게 합니다.
  const keyword = company.trim();
  const partners = [...new Set(all.filter(inTab).map((o) => o.counterpartyName))].sort((a, b) =>
    a.localeCompare(b, 'ko'),
  );
  const partnerLabel =
    tab === 'received' ? '보낸 기업' : tab === 'sent' ? '받는 기업' : '거래 기업';
  // 상태 선택: 표의 상태 표시와 같은 이름(수락·납품 등록은 한 단계)으로 고릅니다.
  const status = params.get('status') ?? '';
  // 작업중 탭에서만: 받은 발주 / 낸 발주로 나눠 봅니다.
  const dirParam = params.get('dir');
  const dir: '' | OrderDirection =
    tab === 'working' && (dirParam === 'received' || dirParam === 'sent') ? dirParam : '';
  const tabOrders = all.filter(inTab).filter((o) => !dir || o.direction === dir);
  const list = tabOrders
    .filter((o) => !keyword || o.counterpartyName.includes(keyword))
    .filter((o) => !status || flowLabel(o.status) === status)
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
            발주 기업 탐색
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
            onClick={() => switchTab('received')}
          >
            받은 발주 {recvCount}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'sent'}
            className={tab === 'sent' ? 'is-on' : ''}
            onClick={() => switchTab('sent')}
          >
            낸 발주 {sentCount}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'working'}
            className={tab === 'working' ? 'is-on' : ''}
            title="수락 · 수령 확인 · 대금 지급 등록을 해야 하는 발주"
            onClick={() => switchTab('working')}
          >
            작업중 {working.length}
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

      <form className="orders-search" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="orders-search__input">
          <Icon name="search" size={18} />
          <span className="sr-only">{partnerLabel} 검색</span>
          <input
            className="input"
            list={listId}
            placeholder={`${partnerLabel} 이름으로 검색`}
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              if (!(e.nativeEvent as InputEvent).isComposing) setParam('company', e.target.value);
            }}
            onCompositionEnd={(e) => setParam('company', e.currentTarget.value)}
          />
          <datalist id={listId}>
            {partners.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        {tab === 'working' && (
          <label className="orders-search__status">
            <span className="sr-only">구분</span>
            <select className="input" value={dir} onChange={(e) => setParam('dir', e.target.value)}>
              <option value="">받은·낸 발주 전체</option>
              <option value="received">
                받은 발주 ({working.filter((o) => o.direction === 'received').length})
              </option>
              <option value="sent">
                낸 발주 ({working.filter((o) => o.direction === 'sent').length})
              </option>
            </select>
          </label>
        )}
        <label className="orders-search__status">
          <span className="sr-only">상태</span>
          <select
            className="input"
            value={status}
            onChange={(e) => setParam('status', e.target.value)}
          >
            <option value="">상태 전체</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s} ({tabOrders.filter((o) => flowLabel(o.status) === s).length})
              </option>
            ))}
          </select>
        </label>
        {company && (
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => {
              setCompany('');
              setParam('company', '');
            }}
          >
            지우기
          </button>
        )}
        <span className="small muted">
          {keyword || status ? `검색 결과 ${list.length}건` : `거래 기업 ${partners.length}곳`}
        </span>
      </form>

      <section className="card">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox error={error} onRetry={reload} />
        ) : list.length === 0 ? (
          <p className="empty">
            {keyword || status
              ? '검색 조건에 맞는 발주가 없습니다.'
              : tab === 'working'
                ? '지금 처리할 발주가 없습니다.'
                : '해당하는 발주가 없습니다.'}
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>발주번호</th>
                <th>품목</th>
                {tab === 'working' && <th style={{ width: 90 }}>구분</th>}
                <th style={{ width: 170 }}>{partnerLabel}</th>
                <th style={{ width: 150 }}>발주금액</th>
                <th style={{ width: 120 }}>납기일</th>
                <th style={{ width: 150 }}>상태</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td>
                    <b>{o.id}</b>
                  </td>
                  <td>
                    {o.item}{' '}
                    {tab === 'working' ? (
                      <span className="todo-tag">할 일 · {workTodo(o)}</span>
                    ) : (
                      o.direction === 'sent' &&
                      o.todo && <span className="todo-tag">할 일 · {o.todo}</span>
                    )}
                  </td>
                  {tab === 'working' && (
                    <td>{o.direction === 'received' ? '받은 발주' : '낸 발주'}</td>
                  )}
                  <td>{o.counterpartyName}</td>
                  <td className="num">{won(o.amount)}</td>
                  <td className="num">{o.dueDate}</td>
                  <td>
                    <StatusPill status={o.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      onClick={() => navigate(`/corp/orders/${o.id}`)}
                    >
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
