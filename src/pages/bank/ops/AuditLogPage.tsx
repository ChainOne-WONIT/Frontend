import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getAuditLogs } from '../../../api/ops';
import type { AuditQuery } from '../../../api/types';
import {
  TCond,
  TError,
  TField,
  TFKeys,
  TKV,
  TLoading,
  TSection,
  TTag,
  TTitle,
  TWarn,
} from '../../../components/terminal';
import { downloadCsv } from '../../../lib/csv';
import { useAsync } from '../../../lib/useAsync';

const DEFAULT: AuditQuery = { from: '2026-11-01', to: '' };
const ROLES = ['심사', '여신', '운영'];

/** [O0400] 처리·조회 기록 (단말형, 열람만) */
export function AuditLogPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<AuditQuery>(DEFAULT);
  const [target, setTarget] = useState('');
  const [query, setQuery] = useState<AuditQuery & { target?: string }>(DEFAULT);
  const { data, error, loading, reload } = useAsync(
    () => getAuditLogs(query),
    [query.from, query.to, query.actor, query.kind],
    { refreshOnChange: true },
  );
  const set = (patch: AuditQuery) => setDraft((d) => ({ ...d, ...patch }));

  // 대상은 화면에서 거릅니다 (기업명·번호 일부로 찾기)
  const logs = (data?.logs ?? []).filter((l) => !query.target || l.target.includes(query.target));
  const count = (pred: (actor: string, kind: string) => boolean) =>
    logs.filter((l) => pred(l.actor, l.kind)).length;

  return (
    <>
      <TTitle code="O0400" num="4100" title="처리·조회 기록" asOf={data?.asOf} />
      <TCond
        onSearch={() => {
          setQuery({ ...draft, target: target.trim() || undefined });
          reload();
        }}
        onReset={() => {
          setDraft(DEFAULT);
          setTarget('');
        }}
      >
        <TField label="기간">
          <input
            className="tf"
            type="date"
            aria-label="시작일"
            value={draft.from ?? ''}
            onChange={(e) => set({ from: e.target.value })}
          />
          ~
          <input
            className="tf"
            type="date"
            aria-label="종료일"
            value={draft.to ?? ''}
            onChange={(e) => set({ to: e.target.value })}
          />
        </TField>
        <TField label="처리자">
          <select
            className="tf"
            value={draft.actor ?? ''}
            onChange={(e) => set({ actor: e.target.value || undefined })}
          >
            <option value="">전체</option>
            {data?.actors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </TField>
        <TField label="구분">
          <select
            className="tf"
            value={draft.kind ?? ''}
            onChange={(e) => set({ kind: (e.target.value || undefined) as AuditQuery['kind'] })}
          >
            <option value="">전체</option>
            <option value="조회">조회</option>
            <option value="처리">처리</option>
          </select>
        </TField>
        <TField label="대상">
          <input className="tf" value={target} onChange={(e) => setTarget(e.target.value)} />
        </TField>
      </TCond>
      <TWarn>
        열람만 할 수 있습니다. 고치거나 지울 수 없습니다. 상세 화면을 열 때 고른 조회 사유가 함께
        남습니다.
      </TWarn>

      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TSection title="기록 목록" right={`총 ${logs.length}건 · 최근 순`} />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>일시</th>
                <th>처리자</th>
                <th>구분</th>
                <th>내용</th>
                <th>대상</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={6}>조건에 맞는 기록이 없습니다.</td>
                </tr>
              )}
              {logs.map((l, i) => (
                <tr key={l.id}>
                  <td className="c">{i + 1}</td>
                  <td className="c">
                    <b>{l.at}</b>
                  </td>
                  <td>{l.actor}</td>
                  <td className="c">
                    <TTag tone={l.kind === '조회' ? 'blue' : 'ok'}>{l.kind}</TTag>
                  </td>
                  <td>{l.content}</td>
                  <td>{l.target}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <TSection title="구분별 건수" right="조회한 조건 기준" />
          <TKV
            labelWidth={80}
            rows={[
              [
                {
                  label: '조회',
                  value: `${count((_, k) => k === '조회')}건`,
                  right: true,
                  strong: true,
                  tone: 'blue',
                },
                {
                  label: '처리',
                  value: `${count((_, k) => k === '처리')}건`,
                  right: true,
                  strong: true,
                  tone: 'ok',
                },
                ...ROLES.map((r) => ({
                  label: r,
                  value: `${count((a) => a.includes(`(${r})`))}건`,
                  right: true,
                  strong: true,
                })),
              ],
            ]}
          />
          <p className="tt-note">※ 기록은 5년간 보관합니다.</p>

          <TFKeys
            keys={[
              { label: '설정값 관리', fkey: 'F5', onClick: () => navigate('/bank/ops/settings') },
              {
                label: '엑셀 저장',
                fkey: 'F9',
                kind: 'primary',
                onClick: () =>
                  downloadCsv('처리조회기록.csv', [
                    ['일시', '처리자', '구분', '내용', '대상'],
                    ...logs.map((l) => [l.at, l.actor, l.kind, l.content, l.target]),
                  ]),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
