import { useState, type FormEvent } from 'react';
import { cancelEvent, getRiskEvents, registerEvent } from '../../../api/loan';
import type { RiskEventType, RiskEvents } from '../../../api/types';
import { Card, ErrorBox, Loading, Note } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { dot } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import '../review/review.css';
import './loan.css';

const TYPES: RiskEventType[] = ['체납', '신용등급 하락', '부도', '회생 신청', '휴·폐업'];
const todayStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** 여신 06 · 이벤트 신호 등록 */
export function EventsPage() {
  const { data, error, loading, reload, setData } = useAsync(getRiskEvents, []);

  return (
    <>
      <PageHead
        title="이벤트 신호 등록"
        sub="실제 서비스라면 신용평가사, 법원 공고, 공시, 국세청에서 받아 오는 정보입니다. 데모에서는 여기서 등록합니다."
        right={data && <span className="small muted">{dot(data.asOf)} 기준</span>}
      />
      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <NewEventCard companies={data.companies} onDone={setData} />
          <EventList data={data} onDone={setData} />
        </>
      )}
    </>
  );
}

function NewEventCard({
  companies,
  onDone,
}: {
  companies: string[];
  onDone: (d: RiskEvents) => void;
}) {
  const [companyName, setCompanyName] = useState(companies[0] ?? '');
  const [type, setType] = useState<RiskEventType>('체납');
  const [occurredAt, setOccurredAt] = useState(todayStr);
  const [detail, setDetail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      onDone(await registerEvent({ companyName, type, occurredAt, detail }));
      setDetail('');
      setMsg({
        ok: true,
        text: `${companyName} · ${type} 이벤트를 등록했습니다. 리스크 경보에 반영됩니다.`,
      });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="새 이벤트">
      <form onSubmit={submit}>
        <div className="ln-form">
          <label className="field">
            <span className="field__label">기업</span>
            <select
              className="input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">이벤트 종류</span>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as RiskEventType)}
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">발생일</span>
            <input
              className="input"
              type="date"
              required
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </label>
          {type === '신용등급 하락' && (
            <label className="field">
              <span className="field__label">등급 변화 (선택)</span>
              <input
                className="input"
                placeholder="예: BB → BB-"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              />
            </label>
          )}
        </div>
        <div className="rv-gap">
          <button className="btn btn--primary" disabled={busy}>
            {busy ? '등록 중…' : '등록'}
          </button>
        </div>
      </form>
      {msg && (
        <div className="rv-gap">
          <Note tone={msg.ok ? 'ok' : 'bad'}>{msg.text}</Note>
        </div>
      )}
      <div className="rv-gap">
        <Note tone="warn">
          부도, 회생 신청, 휴·폐업은 점수와 관계없이 바로 경보가 됩니다. 체납과 신용등급 하락은
          이벤트 점수가 더해집니다.
        </Note>
      </div>
    </Card>
  );
}

function EventList({ data, onDone }: { data: RiskEvents; onDone: (d: RiskEvents) => void }) {
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const cancel = async (id: string) => {
    setBusyId(id);
    setError('');
    try {
      onDone(await cancelEvent(id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <Card title="등록된 이벤트">
      {error && (
        <p className="field__error" role="alert" style={{ marginBottom: 10 }}>
          {error}
        </p>
      )}
      {data.events.length === 0 ? (
        <p className="empty">등록된 이벤트가 없습니다.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>기업</th>
              <th>이벤트</th>
              <th>발생일</th>
              <th>등록자</th>
              <th aria-label="등록 취소" />
            </tr>
          </thead>
          <tbody>
            {data.events.map((e) => (
              <tr key={e.id} className={e.cancelled ? 'ln-cancelled' : undefined}>
                <td>
                  <b>{e.companyName}</b>
                </td>
                <td>
                  {e.type}
                  {e.detail && ` (${e.detail})`}
                </td>
                <td className="num">{e.occurredAt}</td>
                <td>{e.registeredBy}</td>
                <td className="rv-cell-act">
                  {e.cancelled ? (
                    <span className="small muted">취소됨</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      disabled={busyId === e.id}
                      onClick={() => cancel(e.id)}
                    >
                      등록 취소
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
