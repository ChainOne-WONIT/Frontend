import { useState, type FormEvent } from 'react';
import { getAuditLogs } from '../../../api/ops';
import type { AuditQuery } from '../../../api/types';
import { ErrorBox, Loading, Note, Pill } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { dot } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import './ops.css';

const DEFAULT: AuditQuery = { from: '2026-11-01', to: '' };

/** 운영 04 · 처리·조회 기록 (열람만) */
export function AuditLogPage() {
  const [draft, setDraft] = useState<AuditQuery>(DEFAULT);
  const [query, setQuery] = useState<AuditQuery>(DEFAULT);
  const { data, error, loading, reload } = useAsync(() => getAuditLogs(query), [query]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setQuery({ ...draft });
  };
  const set = (patch: AuditQuery) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <>
      <PageHead
        title="처리·조회 기록"
        sub="열람만 할 수 있습니다. 고치거나 지울 수 없습니다."
        right={data && <span className="small muted">{dot(data.asOf)} 기준</span>}
      />

      <form className="ops-filter" onSubmit={submit}>
        <label className="field">
          <span className="field__label">기간</span>
          <span className="ops-range">
            <input
              className="input"
              type="date"
              aria-label="시작일"
              value={draft.from ?? ''}
              onChange={(e) => set({ from: e.target.value })}
            />
            ~
            <input
              className="input"
              type="date"
              aria-label="종료일"
              value={draft.to ?? ''}
              onChange={(e) => set({ to: e.target.value })}
            />
          </span>
        </label>
        <label className="field">
          <span className="field__label">처리자</span>
          <select
            className="input"
            value={draft.actor ?? ''}
            onChange={(e) => set({ actor: e.target.value || undefined })}
          >
            <option value="">전체</option>
            {data?.actors.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">구분</span>
          <select
            className="input"
            value={draft.kind ?? ''}
            onChange={(e) => set({ kind: (e.target.value || undefined) as AuditQuery['kind'] })}
          >
            <option value="">전체</option>
            <option>조회</option>
            <option>처리</option>
          </select>
        </label>
        <button className="btn btn--primary">조회</button>
      </form>

      <section className="card">
        {loading && !data ? (
          <Loading />
        ) : error || !data ? (
          <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
        ) : data.logs.length === 0 ? (
          <p className="empty">조건에 맞는 기록이 없습니다.</p>
        ) : (
          <table className={`table${loading ? ' ops-loading' : ''}`}>
            <thead>
              <tr>
                <th>일시</th>
                <th>처리자</th>
                <th>구분</th>
                <th>내용</th>
                <th>대상</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => (
                <tr key={l.id}>
                  <td className="num">
                    <b>{l.at}</b>
                  </td>
                  <td>{l.actor}</td>
                  <td>
                    <Pill tone={l.kind === '조회' ? 'default' : 'ok'}>{l.kind}</Pill>
                  </td>
                  <td>{l.content}</td>
                  <td>{l.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Note>상세 화면을 열 때 고른 조회 사유가 함께 남습니다. 기록은 5년간 보관합니다.</Note>
    </>
  );
}
