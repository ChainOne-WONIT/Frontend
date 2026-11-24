import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { getHome } from '../../api/corp';
import type { OrderSummary } from '../../api/types';
import { Card, ErrorBox, Loading, Pill, StatusPill } from '../../components/ui';
import { PageHead } from '../../layouts/CorpLayout';
import { dot, won } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';

export function HomePage() {
  const { data, error, loading, reload } = useAsync(getHome, []);
  if (loading) return <Loading />;
  if (error || !data)
    return <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />;
  const { company, summary: s } = data;

  return (
    <>
      <PageHead
        title={company.name}
        sub={`${company.industry}  ·  대표 ${company.ceoName}  ·  사업자등록번호 ${company.bizNo}`}
        right={<span className="small muted">{dot(data.asOf)} 기준</span>}
      />

      <div className="grid-4">
        <Kpi
          label="받은 발주 · 수락 대기"
          value={String(s.receivedPending)}
          unit="건"
          desc="내용을 확인하고 수락하거나 반려하세요"
          chip={<Pill tone="warn">확인 필요</Pill>}
        />
        <Kpi
          label="낸 발주 · 내가 할 일"
          value={String(s.sentTodo)}
          unit="건"
          desc={s.sentTodoDetail}
          chip={<Pill>할 일</Pill>}
        />
        <Kpi
          label="생산자금 한도 잔액"
          value={won(s.limitBalance).replace(' 원', '')}
          unit="원"
          desc={`승인 한도 ${won(s.limitApproved)} · 사용 ${won(s.limitUsed)}`}
          bar={s.limitApproved ? s.limitUsed / s.limitApproved : 0}
        />
        <Kpi
          label="거래처 경보"
          value={String(s.alertCount)}
          unit="곳"
          desc="직접 거래하는 상대만 보입니다"
          chip={<Pill tone="bad">주의</Pill>}
          danger
        />
      </div>

      <div className="grid-2">
        <OrderList title="받은 발주" orders={data.received} dirLabel="보낸 기업" />
        <OrderList title="낸 발주" orders={data.sent} dirLabel="받는 기업" />
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  unit,
  desc,
  chip,
  bar,
  danger,
}: {
  label: string;
  value: string;
  unit: string;
  desc: string;
  chip?: ReactNode;
  bar?: number;
  danger?: boolean;
}) {
  return (
    <section className="card kpi">
      <div className="kpi__head">
        <span className="muted">{label}</span>
        {chip}
      </div>
      <div className={`kpi__value${danger ? ' is-danger' : ''}`}>
        <b className="num">{value}</b>
        <span>{unit}</span>
      </div>
      {bar !== undefined && (
        <div className="bar">
          <i style={{ width: `${Math.round(bar * 100)}%` }} />
        </div>
      )}
      <span className="small muted">{desc}</span>
    </section>
  );
}

function OrderList({
  title,
  orders,
  dirLabel,
}: {
  title: string;
  orders: OrderSummary[];
  dirLabel: string;
}) {
  const navigate = useNavigate();
  const tab = orders[0]?.direction ?? 'received';
  return (
    <Card
      title={
        <>
          {title} <span className="pill pill--gray">{orders.length}건</span>
        </>
      }
      right={
        <Link to={`/corp/orders?tab=${tab}`} className="link-more">
          전체 보기 ›
        </Link>
      }
    >
      {orders.length === 0 ? (
        <p className="empty">{title}가 없습니다.</p>
      ) : (
        <ul className="list">
          {orders.map((o) => (
            <li key={o.id} className="list__item">
              <div className="list__main">
                <div className="list__title">
                  {o.id} <span className="muted">·</span>{' '}
                  <span style={{ fontWeight: 500 }}>{o.item}</span>
                  {o.direction === 'sent' && o.todo && (
                    <span className="todo-tag">할 일 · {o.todo}</span>
                  )}
                </div>
                <div className="list__sub">
                  {dirLabel} {o.counterpartyName} · {won(o.amount)} · 납기 {o.dueDate}
                </div>
              </div>
              <StatusPill status={o.status} />
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => navigate(`/corp/orders/${o.id}`)}
              >
                보기
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
