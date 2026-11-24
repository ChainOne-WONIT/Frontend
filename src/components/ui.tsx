import type { ReactNode } from 'react';
import logoMark from '../assets/logo-mark.svg';
import { flowIndex, FLOW_STEPS, flowLabel, STATUS_TONE, type PillTone } from '../lib/format';
import type { OrderStatus } from '../api/types';
import { Icon } from './Icon';

export function Logo({ size = 44, subtitle }: { size?: number; subtitle?: string }) {
  return (
    <div className="logo">
      <img src={logoMark} alt="" width={size} height={(size * 120) / 150} />
      <div>
        <div className="logo__name">Chain-One</div>
        {subtitle && <div className="logo__sub">{subtitle}</div>}
      </div>
    </div>
  );
}

export function Pill({ tone = 'default', children }: { tone?: PillTone; children: ReactNode }) {
  return <span className={`pill${tone === 'default' ? '' : ` pill--${tone}`}`}>{children}</span>;
}

export function StatusPill({ status }: { status: OrderStatus }) {
  return <Pill tone={STATUS_TONE[status]}>{flowLabel(status)}</Pill>;
}

export function Card({
  title,
  right,
  children,
  className = '',
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <div className="card__head">
          {title && <h2 className="card__title">{title}</h2>}
          <span className="spacer" />
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Note({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warn' | 'bad' | 'ok';
  children: ReactNode;
}) {
  return (
    <div className={`note${tone === 'info' ? '' : ` note--${tone}`}`}>
      <Icon name="info" size={18} className="note__icon" />
      <div>{children}</div>
    </div>
  );
}

export function Loading({ label = '불러오는 중입니다' }: { label?: string }) {
  return (
    <div className="state-box" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="state-box state-box--error" role="alert">
      {error.message}
      {onRetry && (
        <button type="button" className="btn btn--outline btn--sm" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}

/** 발주 진행 단계 (수락 대기 → 수락 및 납품 등록 → 수령 확인 → 지급 등록 → 지급 완료) */
export function OrderFlow({ status }: { status: OrderStatus }) {
  const idx = flowIndex(status);
  const last = FLOW_STEPS.length - 1;
  return (
    <ol className="flow" aria-label="진행 단계">
      {FLOW_STEPS.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? (i === last ? 'complete' : 'current') : 'todo';
        return (
          <li
            key={s}
            className={`flow__step flow__step--${state}`}
            aria-current={i === idx ? 'step' : undefined}
          >
            {i < idx && <Icon name="check" size={13} strokeWidth={3} />}
            {s}
          </li>
        );
      })}
    </ol>
  );
}

export function KeyValue({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="kv">
      {rows.map(([k, v]) => (
        <div className="kv__row" key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Checkbox({
  checked,
  onChange,
  children,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="checkbox">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}
