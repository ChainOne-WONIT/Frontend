import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getHome } from '../../api/corp';
import type { OrderSummary } from '../../api/types';
import logoMark from '../../assets/logo-mark.svg';
import { Icon } from '../../components/Icon';
import { ErrorBox, Loading, StatusPill } from '../../components/ui';
import { useAuth } from '../../lib/auth-context';
import { dot, won } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import './home.css';

/** 납기까지 남은 날 (D-12, D-day, D+3) */
function dday(due: string): string {
  const today = new Date(new Date().toDateString()).getTime();
  const d = Math.round((new Date(due + 'T00:00:00').getTime() - today) / 86400000);
  return d === 0 ? 'D-day' : d > 0 ? `D-${d}` : `D+${-d}`;
}

const RING_R = 54;
const RING_C = 2 * Math.PI * RING_R;

/** 기업 홈: 위쪽 큰 히어로(한도·요약) + 그 아래 오늘 할 일과 최근 발주 */
export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getHome, []);
  const [tab, setTab] = useState<'received' | 'sent'>('received');

  if (loading) return <Loading />;
  if (error || !data)
    return <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />;

  const { company, summary: s } = data;
  const left = s.limitApproved ? 1 - s.limitUsed / s.limitApproved : 0;
  const list: OrderSummary[] = tab === 'received' ? data.received : data.sent;
  const tasks = [
    ...data.received
      .filter((o) => o.status === 'PENDING')
      .map((o) => ({ o, label: '수락할지 확인' })),
    ...data.sent.filter((o) => o.todo).map((o) => ({ o, label: o.todo as string })),
  ];
  const open = (id: string) => navigate(`/corp/orders/${id}`);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero__inner">
          <header className="hero__bar">
            <span className="hero__brand">
              <span className="hero__logo">
                <img src={logoMark} alt="" width={30} height={24} />
              </span>
              Chain-One
            </span>
            <span className="spacer" />
            <span className="hero__date">{dot(data.asOf)} 기준</span>
            <span className="hero__bell" aria-label="알림 3건">
              <Icon name="bell" size={20} />
              <i>3</i>
            </span>
            <span className="hero__me">
              <span>{user?.companyName.slice(0, 1)}</span>
              {user?.companyName}
            </span>
          </header>

          <div className="hero__body">
            <div className="hero__left">
              <p className="hero__eyebrow">
                {company.industry} · 대표 {company.ceoName} · 사업자등록번호 {company.bizNo}
              </p>
              <h1>{company.name}</h1>
              <div className="hero__fund">
                <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
                  <circle cx="66" cy="66" r={RING_R} className="hero__ring-bg" />
                  <circle
                    cx="66"
                    cy="66"
                    r={RING_R}
                    className="hero__ring"
                    strokeDasharray={`${RING_C * left} ${RING_C}`}
                    transform="rotate(-90 66 66)"
                  />
                  <text x="66" y="61" textAnchor="middle" className="hero__ring-label">
                    남은 한도
                  </text>
                  <text x="66" y="83" textAnchor="middle" className="hero__ring-value">
                    {Math.round(left * 100)}%
                  </text>
                </svg>
                <div>
                  <span className="hero__fund-label">생산자금 한도 잔액</span>
                  <b className="hero__fund-value">
                    {won(s.limitBalance).replace(/\s?원$/, '')}
                    <small>원</small>
                  </b>
                  <span className="hero__fund-meta">
                    승인 한도 {won(s.limitApproved)} · 사용 {won(s.limitUsed)}
                  </span>
                </div>
              </div>
            </div>

            <div className="hero__cards">
              <button type="button" onClick={() => navigate('/corp/orders?tab=received')}>
                <span>받은 발주 · 수락 대기</span>
                <b>{s.receivedPending}건</b>
              </button>
              <button type="button" onClick={() => navigate('/corp/orders?tab=sent')}>
                <span>내가 할 일</span>
                <b>{s.sentTodo}건</b>
                <small>{s.sentTodoDetail}</small>
              </button>
              <button type="button" className="is-alert" onClick={() => navigate('/corp/alerts')}>
                <span>거래처 경보</span>
                <b>{s.alertCount}곳</b>
                <small>직접 거래하는 상대만 보입니다</small>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="home__panels">
        <section className="panel panel--tasks">
          <h2>
            오늘 할 일 <span className="panel__count">{tasks.length}</span>
          </h2>
          {tasks.length === 0 ? (
            <p className="empty">오늘 처리할 일이 없어요.</p>
          ) : (
            <ul className="tasks">
              {tasks.map(({ o, label }) => (
                <li key={o.id}>
                  <span className={`tasks__dot tasks__dot--${o.direction}`} />
                  <div>
                    <b>{label}</b>
                    <span>
                      {o.id} · {o.item} · {o.counterpartyName}
                    </span>
                  </div>
                  <button type="button" aria-label={`${o.id} 열기`} onClick={() => open(o.id)}>
                    <Icon name="arrowRight" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="tasks__legend">
            <span>
              <i className="tasks__dot tasks__dot--received" /> 받은 발주
            </span>
            <span>
              <i className="tasks__dot tasks__dot--sent" /> 낸 발주
            </span>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2>최근 발주</h2>
            <div className="seg" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'received'}
                className={tab === 'received' ? 'is-on' : ''}
                onClick={() => setTab('received')}
              >
                받은 발주 {data.received.length}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'sent'}
                className={tab === 'sent' ? 'is-on' : ''}
                onClick={() => setTab('sent')}
              >
                낸 발주 {data.sent.length}
              </button>
            </div>
            <span className="spacer" />
            <button
              type="button"
              className="link-more"
              onClick={() => navigate(`/corp/orders?tab=${tab}`)}
            >
              전체 보기 ›
            </button>
          </div>
          <ul className="orders">
            {list.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => open(o.id)}>
                  <span className="orders__icon">{o.item.slice(0, 1)}</span>
                  <span className="orders__main">
                    <b>{o.item}</b>
                    <span>
                      {o.id} · {tab === 'received' ? '보낸 기업' : '받는 기업'} {o.counterpartyName}
                    </span>
                  </span>
                  <span className="orders__amt">{won(o.amount)}</span>
                  <span className="orders__dday">{dday(o.dueDate)}</span>
                  <StatusPill status={o.status} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
