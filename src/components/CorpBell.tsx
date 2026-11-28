import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { getAlerts, getOrders } from '../api/corp';
import { useAsync } from '../lib/useAsync';
import { workTodo } from '../pages/corp/order-work';
import { Icon } from './Icon';
import './CorpBell.css';

type Item = { key: string; tag: string; title: string; desc: string; to: string; alert?: boolean };

/**
 * 기업 화면 오른쪽 위 알림 버튼.
 * 숫자는 내가 할 일(발주 작업중과 같은 기준) + 거래처 경보입니다.
 * 누르면 알림마다 짧은 설명이 나오고, 하나를 누르면 그 화면으로 갑니다.
 */
export function CorpBell({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const orders = useAsync(() => getOrders(), [pathname], { refreshOnChange: true });
  const alerts = useAsync(getAlerts, [pathname], { refreshOnChange: true });
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // 창 밖을 누르거나 Esc를 누르면 닫습니다.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items: Item[] = [
    ...(alerts.data?.current ?? []).map((a) => ({
      key: `alert-${a.companyName}`,
      tag: `거래처 경보 · ${a.stage}`,
      title: a.companyName,
      desc: a.reasons[0] ?? '',
      to: '/corp/alerts',
      alert: true,
    })),
    ...(orders.data ?? []).flatMap((o) => {
      const todo = workTodo(o);
      return todo
        ? [
            {
              key: o.id,
              tag: `할 일 · ${todo}`,
              title: `${o.id} ${o.item}`,
              desc: `${o.direction === 'received' ? '받은 발주' : '낸 발주'} · ${o.counterpartyName}`,
              to: `/corp/orders/${o.id}`,
            },
          ]
        : [];
    }),
  ];
  const loaded = !!orders.data && !!alerts.data;

  return (
    <div className={`cbell ${className}`} ref={boxRef}>
      <button
        type="button"
        className="cbell__btn"
        aria-label={`알림 ${items.length}건`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="bell" size={20} />
        {items.length > 0 && <i className="cbell__count">{items.length}</i>}
      </button>
      {open && (
        <div className="cbell__panel" role="dialog" aria-label="알림">
          <div className="cbell__head">
            <b>알림</b>
            <span className="small muted">
              내가 할 일 {items.filter((x) => !x.alert).length} · 거래처 경보{' '}
              {items.filter((x) => x.alert).length}
            </span>
          </div>
          {!loaded ? (
            <p className="cbell__empty">불러오는 중입니다…</p>
          ) : items.length === 0 ? (
            <p className="cbell__empty">새 알림이 없습니다.</p>
          ) : (
            <ul className="cbell__list">
              {items.map((x) => (
                <li key={x.key}>
                  <button
                    type="button"
                    className={`cbell__item${x.alert ? ' is-alert' : ''}`}
                    onClick={() => {
                      setOpen(false);
                      navigate(x.to);
                    }}
                  >
                    <span className="cbell__tag">{x.tag}</span>
                    <b>{x.title}</b>
                    <span className="cbell__desc">{x.desc}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
