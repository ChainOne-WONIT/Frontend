import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getLoans } from '../../../api/loan';
import type { LoanRow, LoanStatus } from '../../../api/types';
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
import { won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { LoanReasonWindow } from './LoanReason';
import { LOAN_STATUS_LABEL, LOAN_STATUS_TONE } from './loan-format';

/** 대출 현황에 나오는 상태 (승인 대기·보류는 승인 대기 화면에서 봅니다) */
const DONE: LoanStatus[] = ['EXECUTED', 'OVERDUE', 'REPAID'];

type Filter = { status: '' | LoanStatus; name: string };
const EMPTY: Filter = { status: '', name: '' };

/** [L0220] 대출 현황 (단말형). 실행된 생산자금 대출의 실행·만기·상환 상태를 봅니다. */
export function LoansPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getLoans, []);
  const [draft, setDraft] = useState<Filter>(EMPTY);
  const [filter, setFilter] = useState<Filter>(EMPTY);
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<LoanRow | null>(null);

  const done = (data?.loans ?? []).filter((l) => DONE.includes(l.status));
  const rows = done.filter(
    (l) =>
      (!filter.status || l.status === filter.status) &&
      (!filter.name || l.companyName.includes(filter.name.trim())),
  );
  const sel = rows.find((l) => l.id === selected) ?? rows[0];
  const count = (s: LoanStatus) => done.filter((l) => l.status === s).length;
  const balance = done
    .filter((l) => l.status === 'EXECUTED' || l.status === 'OVERDUE')
    .reduce((s, l) => s + l.amount, 0);

  return (
    <>
      <TTitle code="L0220" num="2200" title="대출 현황" asOf={data?.asOf} />
      <TCond
        onSearch={() => {
          setFilter(draft);
          reload();
        }}
        onReset={() => setDraft(EMPTY)}
      >
        <TField label="상태">
          <select
            className="tf"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as Filter['status'] })}
          >
            <option value="">전체</option>
            {DONE.map((s) => (
              <option key={s} value={s}>
                {LOAN_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </TField>
        <TField label="기업명">
          <input
            className="tf"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </TField>
      </TCond>
      <TWarn>
        실행된 생산자금 대출입니다. 대금이 들어오면 대금 수령 계좌에서 자동으로 회수됩니다. 상세는
        조회 사유를 고른 뒤에 열립니다.
      </TWarn>

      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TSection title="상태별 건수" right="(단위: 건)" />
          <TKV
            labelWidth={90}
            rows={[
              [
                { label: '실행', value: count('EXECUTED'), right: true, strong: true },
                { label: '연체', value: count('OVERDUE'), right: true, strong: true, tone: 'bad' },
                {
                  label: '상환 완료',
                  value: count('REPAID'),
                  right: true,
                  strong: true,
                  tone: 'ok',
                },
                { label: '대출 잔액', value: won(balance), right: true, strong: true },
              ],
            ]}
          />

          <TSection title="대출 목록" right={`총 ${rows.length}건 · 행을 두 번 누르면 상세`} />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>대출번호</th>
                <th>기업</th>
                <th>근거 발주 (발주처)</th>
                <th>금액</th>
                <th>실행일</th>
                <th>만기일</th>
                <th>상태</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={9}>조건에 맞는 대출이 없습니다.</td>
                </tr>
              )}
              {rows.map((l, i) => (
                <tr
                  key={l.id}
                  className={`is-link${sel?.id === l.id ? ' is-hl' : ''}`}
                  onClick={() => setSelected(l.id)}
                  onDoubleClick={() => setTarget(l)}
                >
                  <td className="c">{i + 1}</td>
                  <td className="c">{l.id}</td>
                  <td>{l.companyName}</td>
                  <td>
                    {l.orderId} · {l.orderItem} ({l.counterpartyName})
                  </td>
                  <td className="r">{won(l.amount)}</td>
                  <td className="c">{l.executedAt ?? '—'}</td>
                  <td className="c">{l.dueDate ?? '—'}</td>
                  <td className="c">
                    <TTag tone={LOAN_STATUS_TONE[l.status]}>{LOAN_STATUS_LABEL[l.status]}</TTag>
                  </td>
                  <td className="act">
                    <button type="button" className="tb tb--sm" onClick={() => setTarget(l)}>
                      상세
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <TFKeys
            keys={[
              { label: '리스크 경보', fkey: 'F5', onClick: () => navigate('/bank/loan/alerts') },
              { label: '체인 조회', fkey: 'F6', onClick: () => navigate('/bank/loan/chain') },
              {
                label: '엑셀 저장',
                fkey: 'F9',
                onClick: () =>
                  downloadCsv('대출현황.csv', [
                    ['대출번호', '기업', '근거 발주', '금액', '실행일', '만기', '상태'],
                    ...rows.map((l) => [
                      l.id,
                      l.companyName,
                      l.orderId,
                      l.amount,
                      l.executedAt ?? '',
                      l.dueDate ?? '',
                      LOAN_STATUS_LABEL[l.status],
                    ]),
                  ]),
              },
              {
                label: '상세 조회',
                fkey: 'F4',
                kind: 'primary',
                disabled: !sel,
                onClick: () => sel && setTarget(sel),
              },
            ]}
          />
        </>
      )}

      {target && (
        <LoanReasonWindow
          to={`/bank/loan/loans/${target.id}`}
          defaultReason="사후관리"
          target={[
            { label: '대출번호', value: <b>{target.id}</b> },
            { label: '대상', value: `${target.companyName} · ${won(target.amount)}` },
          ]}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}
