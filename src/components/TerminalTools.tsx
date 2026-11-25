/* 단말 툴바의 메모·계산기: 화면을 가리지 않는 작은 창 */
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import './TerminalTools.css';

function ToolWindow({
  title,
  onClose,
  left,
  children,
}: {
  title: string;
  onClose: () => void;
  left: number;
  children: ReactNode;
}) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 창 안에 초점이 있을 때 Esc로 닫습니다.
    const el = boxRef.current;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    el?.addEventListener('keydown', onKey);
    return () => el?.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div ref={boxRef} className="tw" style={{ left }} role="dialog" aria-label={title}>
      <div className="tw__bar">
        <b>{title}</b>
        <button type="button" aria-label={`${title} 닫기`} onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="tw__body">{children}</div>
    </div>
  );
}

const readMemo = (key: string) => {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
};

/** 메모: 이 브라우저에 담당자별로 저장됩니다. */
export function MemoPanel({ owner, onClose }: { owner: string; onClose: () => void }) {
  const key = `chainone.memo.${owner}`;
  const [text, setText] = useState(() => readMemo(key));
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, text);
        setSavedAt(new Date().toTimeString().slice(0, 5));
      } catch {
        setSavedAt(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [key, text]);

  return (
    <ToolWindow title="메모" onClose={onClose} left={150}>
      <textarea
        className="tw-memo"
        autoFocus
        aria-label="메모 내용"
        placeholder="심사 중 메모를 적어 두세요. 이 브라우저에만 저장됩니다."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="tw-row">
        <span className="tw-muted">{savedAt ? `${savedAt} 저장됨` : '자동 저장'}</span>
        <span className="tw-spacer" />
        <button type="button" className="tb tb--sm" onClick={() => setText('')}>
          지우기
        </button>
      </div>
    </ToolWindow>
  );
}

type Op = '+' | '-' | '×' | '÷';
const apply = (a: number, b: number, op: Op) =>
  op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : b === 0 ? NaN : a / b;
const show = (n: number) =>
  Number.isFinite(n)
    ? Number(n.toPrecision(12)).toLocaleString('ko-KR', { maximumFractionDigits: 10 })
    : '오류';

/** 계산기: 사칙연산. 창 안에서 키보드 숫자·연산자·Enter·Backspace도 됩니다. */
export function CalculatorPanel({ onClose }: { onClose: () => void }) {
  const [entry, setEntry] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);
  const [line, setLine] = useState('');

  /** 숫자(또는 '00', '.')를 이어 붙입니다 */
  const digit = (d: string) => {
    if (fresh) {
      setEntry(d === '.' ? '0.' : d === '00' ? '0' : d);
      setFresh(false);
      return;
    }
    if (d === '.' && entry.includes('.')) return;
    if (entry.replace(/[^0-9]/g, '').length + d.length > 15) return;
    setEntry(entry === '0' && d !== '.' ? (d === '00' ? '0' : d) : entry + d);
  };
  const operate = (next: Op | '=') => {
    const cur = Number(entry);
    const result = acc !== null && op && !fresh ? apply(acc, cur, op) : (acc ?? cur);
    if (next === '=') {
      setLine(acc !== null && op ? `${show(acc)} ${op} ${show(cur)} =` : '');
      setEntry(String(result));
      setAcc(null);
      setOp(null);
    } else {
      setAcc(result);
      setOp(next);
      setLine(`${show(result)} ${next}`);
      setEntry(String(result));
    }
    setFresh(true);
  };
  const clear = () => {
    setEntry('0');
    setAcc(null);
    setOp(null);
    setFresh(true);
    setLine('');
  };
  const back = () => {
    if (fresh) return;
    setEntry(entry.length > 1 ? entry.slice(0, -1) : '0');
  };

  const onKey = (e: ReactKeyboardEvent) => {
    const k = e.key;
    if (/^[0-9.]$/.test(k)) digit(k);
    else if (k === '+' || k === '-') operate(k);
    else if (k === '*') operate('×');
    else if (k === '/') operate('÷');
    else if (k === 'Enter' || k === '=') operate('=');
    else if (k === 'Backspace') back();
    else if (k === 'Delete' || k.toLowerCase() === 'c') clear();
    else return;
    e.preventDefault();
  };

  const keys: [string, () => void, string?][] = [
    ['C', clear, 'fn'],
    ['←', back, 'fn'],
    ['÷', () => operate('÷'), 'op'],
    ['×', () => operate('×'), 'op'],
    ...['7', '8', '9'].map((d) => [d, () => digit(d)] as [string, () => void]),
    ['-', () => operate('-'), 'op'],
    ...['4', '5', '6'].map((d) => [d, () => digit(d)] as [string, () => void]),
    ['+', () => operate('+'), 'op'],
    ...['1', '2', '3'].map((d) => [d, () => digit(d)] as [string, () => void]),
    ['=', () => operate('='), 'eq'],
    ['0', () => digit('0')],
    ['00', () => digit('00')],
    ['.', () => digit('.')],
  ];

  return (
    <ToolWindow title="계산기" onClose={onClose} left={420}>
      <div
        className="tw-calc"
        tabIndex={0}
        onKeyDown={onKey}
        aria-label="계산기 (키보드로 입력할 수 있습니다)"
        autoFocus
      >
        <div className="tw-calc__screen" aria-live="polite">
          <small>{line || ' '}</small>
          <b>{show(Number(entry))}</b>
        </div>
        <div className="tw-calc__keys">
          {keys.map(([label, fn, kind]) => (
            <button
              key={label}
              type="button"
              className={kind ? `is-${kind}` : undefined}
              onClick={fn}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </ToolWindow>
  );
}
