/* 심사 단말 화면에서 쓰는 촘촘한 UI 조각들 */
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router';
import { useScreenActive } from '../lib/screen-active';
import { useFKeys, type FKey } from '../lib/useFKeys';
import './terminal.css';

export type TTone = 'ok' | 'bad' | 'warn' | 'violet' | 'blue' | 'gray';

/** ★ [R0100] (1100) 화면 이름 + 오른쪽 버튼·기준일 */
export function TTitle({
  code,
  num,
  title,
  right,
  asOf = '2026-11-23',
}: {
  code: string;
  num: string;
  title: ReactNode;
  right?: ReactNode;
  asOf?: string;
}) {
  return (
    <div className="tt-title">
      <span className="tt-title__star" aria-hidden="true">
        ★
      </span>
      <b className="tt-title__code">[{code}]</b>
      <h1>
        ({num}) {title}
      </h1>
      <span className="tt-spacer" />
      {right}
      <span className="tt-muted">기준일 {asOf}</span>
    </div>
  );
}

/** 조회 조건 줄. [조회[F2]] 버튼과 F2 키로 onSearch를 부릅니다. */
export function TCond({
  children,
  onSearch,
  onReset,
}: {
  children: ReactNode;
  onSearch: () => void;
  onReset?: () => void;
}) {
  useFKeys({ F2: onSearch });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch();
  };
  return (
    <form className="tt-cond" onSubmit={submit}>
      {children}
      <span className="tt-spacer" />
      {onReset && (
        <button type="button" className="tb" onClick={onReset}>
          초기화
        </button>
      )}
      <button className="tb tb--primary">조회[F2]</button>
    </form>
  );
}

/** 조회 조건의 라벨 + 입력 */
export function TField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="tt-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TWarn({ children }: { children: ReactNode }) {
  return <p className="tt-warn">✕ {children}</p>;
}

/** ■ 구역 제목 */
export function TSection({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <div className="tt-section">
      <i aria-hidden="true" />
      <h2>{title}</h2>
      <span className="tt-spacer" />
      {right && <span className="tt-muted">{right}</span>}
    </div>
  );
}

export type KVCell = {
  label: string;
  value: ReactNode;
  /** 노란 칸: 입력할 수 있는 값 */
  req?: boolean;
  right?: boolean;
  strong?: boolean;
  tone?: TTone;
};

/** 라벨 | 값 격자 */
export function TKV({ rows, labelWidth = 120 }: { rows: KVCell[][]; labelWidth?: number }) {
  return (
    <div className="tt-kv">
      {rows.map((row, i) => (
        <div key={i} className="tt-kv__row">
          {row.map((c) => (
            <div key={c.label} className="tt-kv__pair">
              <span className="tt-kv__label" style={{ width: labelWidth }}>
                {c.label}
              </span>
              <span
                className={`tt-kv__value${c.req ? ' is-req' : ''}${c.right ? ' is-right' : ''}${
                  c.strong ? ' is-strong' : ''
                }${c.tone ? ` tt-c--${c.tone}` : ''}`}
              >
                {c.value}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function TTag({ tone = 'blue', children }: { tone?: TTone; children: ReactNode }) {
  return <span className={`tt-tag tt-tag--${tone}`}>{children}</span>;
}

export type FKeyButton = {
  label: string;
  fkey?: FKey;
  onClick?: () => void;
  kind?: 'primary' | 'danger';
  disabled?: boolean;
};

/** 화면 아래 기능키 버튼 줄. 버튼에 붙은 기능키(F3 등)로도 누를 수 있습니다. */
export function TFKeys({ keys }: { keys: FKeyButton[] }) {
  useFKeys(
    Object.fromEntries(
      keys
        .filter((k) => k.fkey && k.onClick && !k.disabled)
        .map((k) => [k.fkey as FKey, k.onClick]),
    ),
  );
  return (
    <div className="tt-fkeys">
      {keys.map((k) => (
        <button
          key={k.label}
          type="button"
          className={`tb${k.kind ? ` tb--${k.kind}` : ''}`}
          disabled={k.disabled}
          onClick={k.onClick}
        >
          {k.label}
          {k.fkey && `[${k.fkey}]`}
        </button>
      ))}
    </div>
  );
}

export function TLoading() {
  return (
    <p className="tt-state" role="status">
      조회 중입니다…
    </p>
  );
}

export function TError({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <p className="tt-state tt-state--error" role="alert">
      {error.message}{' '}
      {onRetry && (
        <button type="button" className="tb tb--sm" onClick={onRetry}>
          다시 조회
        </button>
      )}
    </p>
  );
}

/** 단말 창 모양의 팝업. Esc로 닫힙니다. */
export function TWindow({
  title,
  onClose,
  children,
  actions,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
}) {
  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  // 뒤에 숨은 탭의 팝업은 열린 상태만 기억하고 그리지 않습니다. 그 탭으로 돌아오면 다시 보입니다.
  const active = useScreenActive();
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    (boxRef.current?.querySelector<HTMLElement>('select, input') ?? boxRef.current)?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
  if (!active) return null;
  return createPortal(
    <div className="tt-overlay">
      <div
        ref={boxRef}
        className="tt-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="tt-window__bar">
          <b id={titleId}>{title}</b>
          <span className="tt-spacer" />
          <button type="button" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="tt-window__body">
          {children}
          <div className="tt-window__actions">{actions}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** [R0220] 조회 사유 입력 창. 사유를 고른 뒤에만 상세가 열립니다. */
export function TReasonWindow<R extends string>({
  reasons,
  defaultReason,
  target,
  onClose,
  onOpen,
}: {
  reasons: readonly R[];
  defaultReason?: R;
  /** 조회 대상 설명 (신청번호·대상) */
  target?: { label: string; value: ReactNode }[];
  onClose: () => void;
  onOpen: (reason: R) => void;
}) {
  const [reason, setReason] = useState<R>(defaultReason ?? reasons[0]);
  const [memo, setMemo] = useState('');
  return (
    <TWindow
      title="[R0220] 조회 사유 입력"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="tb" onClick={onClose}>
            취소[Esc]
          </button>
          <button type="button" className="tb tb--primary" onClick={() => onOpen(reason)}>
            확인[Enter]
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onOpen(reason);
        }}
      >
        <TSection title="조회 대상" />
        <TKV
          labelWidth={100}
          rows={[
            ...(target ?? []).map((t) => [{ label: t.label, value: t.value }]),
            [
              {
                label: '조회 사유',
                req: true,
                value: (
                  <select
                    className="tf tf--req"
                    aria-label="조회 사유"
                    value={reason}
                    onChange={(e) => setReason(e.target.value as R)}
                  >
                    {reasons.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ),
              },
            ],
            [
              {
                label: '상세 사유',
                value: (
                  <input
                    className="tf"
                    aria-label="상세 사유 (선택)"
                    placeholder="(선택) 예: 11월 신규 신청 심사"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                  />
                ),
              },
            ],
          ]}
        />
        {/* Enter로 확인되도록 숨은 제출 버튼 */}
        <button type="submit" hidden />
      </form>
      <TWarn>
        상세 정보는 사유를 고른 뒤에 열리며, 조회자·일시·사유가 처리·조회 기록에 남습니다.
      </TWarn>
    </TWindow>
  );
}

/** 상세 화면 앞의 조회 사유 확인 (단말형). 목록에서 사유를 골랐으면 바로 엽니다. */
export function TReasonGate<R extends string>({
  reasons,
  back,
  children,
}: {
  reasons: readonly R[];
  back: string;
  children: (reason: R) => ReactNode;
}) {
  const navigate = useNavigate();
  const state = useLocation().state as { reason?: R } | null;
  const passed = state?.reason && reasons.includes(state.reason) ? state.reason : undefined;
  const [reason, setReason] = useState<R | undefined>(passed);
  if (!reason) {
    return <TReasonWindow<R> reasons={reasons} onClose={() => navigate(back)} onOpen={setReason} />;
  }
  return <>{children(reason)}</>;
}
