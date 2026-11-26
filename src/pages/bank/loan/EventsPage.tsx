import { useState } from 'react';
import { useNavigate } from 'react-router';
import { cancelEvent, getRiskEvents, registerEvent } from '../../../api/loan';
import type { RiskEvents, RiskEventType } from '../../../api/types';
import {
  TError,
  TFKeys,
  TKV,
  TLoading,
  TSection,
  TTitle,
  TWarn,
} from '../../../components/terminal';
import { downloadCsv } from '../../../lib/csv';
import { useAsync } from '../../../lib/useAsync';

const TYPES: RiskEventType[] = ['체납', '신용등급 하락', '부도', '회생 신청', '휴·폐업'];
const todayStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** [L0400] 이벤트 신호 등록 (단말형) */
export function EventsPage() {
  const { data, error, loading, reload, setData } = useAsync(getRiskEvents, []);
  return (
    <>
      <TTitle code="L0400" num="4100" title="이벤트 신호 등록" asOf={data?.asOf} />
      <TWarn>
        실제 서비스라면 신용평가사, 법원 공고, 공시, 국세청에서 받아 오는 정보입니다. 데모에서는
        여기서 등록합니다.
      </TWarn>
      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <EventsBody data={data} onChange={setData} />
      )}
    </>
  );
}

function EventsBody({ data, onChange }: { data: RiskEvents; onChange: (d: RiskEvents) => void }) {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState(data.companies[0] ?? '');
  const [type, setType] = useState<RiskEventType>('체납');
  const [occurredAt, setOccurredAt] = useState(todayStr);
  const [detail, setDetail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const register = async () => {
    setBusy(true);
    setMsg(null);
    try {
      onChange(await registerEvent({ companyName, type, occurredAt, detail }));
      setDetail('');
      setMsg({
        ok: true,
        text: `${companyName} · ${type} 이벤트를 등록했습니다. 리스크 경보에 반영됩니다.`,
      });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const cancel = async (id: string) => {
    setBusy(true);
    setMsg(null);
    try {
      onChange(await cancelEvent(id));
      setMsg({ ok: true, text: '등록을 취소했습니다. 리스크 경보에서도 빠집니다.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TSection title="새 이벤트" right="노란 칸은 꼭 입력" />
      <TKV
        labelWidth={110}
        rows={[
          [
            {
              label: '기업',
              req: true,
              value: (
                <select
                  className="tf tf--req"
                  aria-label="기업"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                >
                  {data.companies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              ),
            },
            {
              label: '이벤트 종류',
              req: true,
              value: (
                <select
                  className="tf tf--req"
                  aria-label="이벤트 종류"
                  value={type}
                  onChange={(e) => setType(e.target.value as RiskEventType)}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ),
            },
            {
              label: '발생일',
              req: true,
              value: (
                <input
                  className="tf tf--req"
                  type="date"
                  aria-label="발생일"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                />
              ),
            },
          ],
          [
            {
              label: '등급 변화 (선택)',
              value: (
                <input
                  className="tf"
                  aria-label="등급 변화 (선택)"
                  placeholder="신용등급 하락일 때 예: BB → BB-"
                  disabled={type !== '신용등급 하락'}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                />
              ),
            },
          ],
        ]}
      />
      <TWarn>
        부도, 회생 신청, 휴·폐업은 점수와 관계없이 바로 경보가 됩니다. 체납과 신용등급 하락은 이벤트
        점수가 더해집니다.
      </TWarn>
      {msg && (
        <p className={msg.ok ? 'tt-note tt-c--ok' : 'tt-warn'} role={msg.ok ? 'status' : 'alert'}>
          {msg.ok ? '● ' : '✕ '}
          {msg.text}
        </p>
      )}

      <TSection title="등록된 이벤트" right={`${data.events.length}건 · 취소된 이벤트는 흐리게`} />
      <table className="tt-table">
        <thead>
          <tr>
            <th>순번</th>
            <th>기업</th>
            <th>이벤트</th>
            <th>발생일</th>
            <th>등록자</th>
            <th>처리</th>
          </tr>
        </thead>
        <tbody>
          {data.events.length === 0 && (
            <tr className="tt-empty">
              <td colSpan={6}>등록된 이벤트가 없습니다.</td>
            </tr>
          )}
          {data.events.map((e, i) => (
            <tr key={e.id} className={e.cancelled ? 'tt-dim' : undefined}>
              <td className="c">{i + 1}</td>
              <td>
                <b>{e.companyName}</b>
              </td>
              <td>
                {e.type}
                {e.detail && ` (${e.detail})`}
              </td>
              <td className="c">{e.occurredAt}</td>
              <td>{e.registeredBy}</td>
              <td className="act">
                {e.cancelled ? (
                  <span className="tt-muted">취소됨</span>
                ) : (
                  <button
                    type="button"
                    className="tb tb--sm tb--danger"
                    disabled={busy}
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

      <TFKeys
        keys={[
          { label: '리스크 경보', fkey: 'F5', onClick: () => navigate('/bank/loan/alerts') },
          {
            label: '엑셀 저장',
            fkey: 'F9',
            onClick: () =>
              downloadCsv('이벤트신호.csv', [
                ['기업', '이벤트', '발생일', '등록자', '상태'],
                ...data.events.map((e) => [
                  e.companyName,
                  e.type + (e.detail ? ` (${e.detail})` : ''),
                  e.occurredAt,
                  e.registeredBy,
                  e.cancelled ? '취소됨' : '등록',
                ]),
              ]),
          },
          { label: '등록', fkey: 'F7', kind: 'primary', disabled: busy, onClick: register },
        ]}
      />
    </>
  );
}
