import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getCompanyReviewLogs } from '../../../api/bank';
import type { CompanyReviewLogQuery } from '../../../api/types';
import {
  TCond,
  TError,
  TField,
  TFKeys,
  TLoading,
  TSection,
  TTitle,
  TWarn,
} from '../../../components/terminal';
import { downloadCsv } from '../../../lib/csv';
import { useScreenActive } from '../../../lib/screen-active';
import { useAsync } from '../../../lib/useAsync';

const EMPTY: Required<CompanyReviewLogQuery> = { company: '', actor: '', from: '', to: '' };

/** [R0320] 수정 이력 조회: 기업 심사 정보를 누가, 언제, 무엇을, 왜 고쳤는지 검색합니다. */
export function CompanyReviewLogsPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(EMPTY);
  const [query, setQuery] = useState(EMPTY);
  const { data, error, loading, reload } = useAsync(
    () => getCompanyReviewLogs(query),
    [query.company, query.actor, query.from, query.to],
  );
  // 탭은 화면을 살려 두므로, 다른 탭에서 수정하고 돌아오면 이력을 새로 불러옵니다.
  const active = useScreenActive();
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) reload();
  }
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setDraft({ ...draft, [k]: e.target.value });
  const logs = data?.logs ?? [];
  const filtered = Object.values(query).some(Boolean);

  return (
    <>
      <TTitle
        code="R0320"
        num="3200"
        title="수정 이력 조회"
        asOf={data?.asOf}
        right={
          <button type="button" className="tb" onClick={() => navigate('/bank/review/companies')}>
            기업 심사 정보 ›
          </button>
        }
      />
      <TCond
        onSearch={() => {
          setQuery({ ...draft, company: draft.company.trim() });
          reload();
        }}
        onReset={() => {
          setDraft(EMPTY);
          setQuery(EMPTY);
        }}
      >
        <TField label="기업명">
          <input className="tf" value={draft.company} onChange={set('company')} />
        </TField>
        <TField label="수정자">
          <select className="tf" value={draft.actor} onChange={set('actor')}>
            <option value="">전체</option>
            {data?.actors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </TField>
        <TField label="수정일">
          <input
            className="tf"
            type="date"
            aria-label="수정일 시작"
            value={draft.from}
            max={draft.to || undefined}
            onChange={set('from')}
          />
          <span className="tt-muted">~</span>
          <input
            className="tf"
            type="date"
            aria-label="수정일 끝"
            value={draft.to}
            min={draft.from || undefined}
            onChange={set('to')}
          />
        </TField>
      </TCond>
      <TWarn>기업 심사 정보를 고치면 자동으로 남는 기록입니다. 삭제하거나 고칠 수 없습니다.</TWarn>

      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TSection
            title="최근 수정 이력"
            right={`${filtered ? '조회 결과' : '전체'} ${logs.length}건 · 최근 순`}
          />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>수정일</th>
                <th>기업명</th>
                <th>수정자</th>
                <th>수정 내용</th>
                <th>수정 사유</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={6}>조건에 맞는 수정 이력이 없습니다.</td>
                </tr>
              )}
              {logs.map((l, i) => (
                <tr key={`${l.date}-${l.companyId}-${i}`}>
                  <td className="c">{i + 1}</td>
                  <td className="c">{l.date}</td>
                  <td>{l.companyName}</td>
                  <td className="c">{l.actor}</td>
                  <td>{l.text}</td>
                  <td>{l.reason ?? <span className="tt-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <TFKeys
            keys={[
              {
                label: '기업 심사 정보',
                fkey: 'F5',
                onClick: () => navigate('/bank/review/companies'),
              },
              {
                label: '엑셀 저장',
                fkey: 'F9',
                onClick: () =>
                  downloadCsv('기업심사정보_수정이력.csv', [
                    ['수정일', '기업명', '수정자', '수정 내용', '수정 사유'],
                    ...logs.map((l) => [l.date, l.companyName, l.actor, l.text, l.reason ?? '']),
                  ]),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
