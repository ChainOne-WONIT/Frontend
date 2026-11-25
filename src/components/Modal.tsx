import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ViewReason } from '../api/types';
import { VIEW_REASONS } from '../lib/format';

/** 화면 가운데 뜨는 대화상자. Esc나 바깥을 누르면 닫힙니다. */
export function Modal({
  title,
  desc,
  onClose,
  children,
  actions,
}: {
  title: ReactNode;
  desc?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  actions: ReactNode;
}) {
  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);

  // onClose가 렌더마다 새로 만들어져도 초점이 다시 옮겨지지 않도록 ref로 들고 있습니다.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    // 열리면 첫 입력 칸(없으면 대화상자)에 초점을 둡니다.
    const first = boxRef.current?.querySelector<HTMLElement>('select, input, textarea');
    (first ?? boxRef.current)?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 화면 틀(상단 바·하단 메뉴)보다 위에 덮이도록 body 바로 아래에 그립니다.
  return createPortal(
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={boxRef}
        className="modal__box"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 id={titleId} className="modal__title">
          {title}
        </h2>
        {desc && <p className="modal__desc">{desc}</p>}
        {children}
        <div className="modal__actions">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * 상세 조회 사유 선택. 사유를 고른 뒤에만 상세가 열리고, 조회 기록이 남습니다.
 * reasons를 주지 않으면 심사 담당의 사유 목록을 씁니다.
 */
export function ReasonModal<R extends string = ViewReason>({
  onClose,
  onOpen,
  reasons = VIEW_REASONS as unknown as readonly R[],
  defaultReason,
}: {
  onClose: () => void;
  onOpen: (reason: R) => void;
  reasons?: readonly R[];
  defaultReason?: R;
}) {
  const [reason, setReason] = useState<R>(defaultReason ?? reasons[0]);
  const id = useId();
  return (
    <Modal
      title="상세 조회 사유 선택"
      desc="상세 정보는 사유를 고른 뒤에 열리고, 조회 기록이 남습니다."
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--outline" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onOpen(reason)}>
            열기
          </button>
        </>
      }
    >
      <label className="field modal__field" htmlFor={id}>
        <span className="modal__label">조회 사유</span>
        <select
          id={id}
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value as R)}
        >
          {reasons.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
    </Modal>
  );
}
