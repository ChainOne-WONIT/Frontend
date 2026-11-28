import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getLoans } from '../../../api/loan';
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
import { LOAN_STATUS_LABEL, LOAN_STATUS_TONE } from './loan-format';

const DAY = 24 * 60 * 60 * 1000;

/** 기준일과 지급 예정일 사이의 날짜 수 (YYYY-MM-DD) */
function daysLate(asOf: string, due: string) {
  return Math.max(0, Math.round((Date.parse(asOf.slice(0, 10)) - Date.parse(due)) / DAY));
}

/** [L0240] 대금 지급 지연 (단말형). 받는 기업이 "받지 못함"을 누른 발주를 봅니다. */
export function PaymentDelaysPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getLoans, [], { refreshOnChange: true });
  const [draft, setDraft] = useState('');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const asOf = data?.asOf ?? '';
  const rows = (data?.paymentDelays ?? [])
    .filter((d) => !name || d.from.includes(name.trim()) || d.to.includes(name.trim()))
    .map((d) => ({ ...d, late: daysLate(asOf, d.payDueDate) }))
    .sort((a, b) => b.late - a.late);
  const sel = rows.find((d) => d.orderId === selected) ?? rows[0];
  const sum = rows.reduce((s, d) => s + d.amount, 0);

  /* 대금을 받지 못한 기업은 그 대금으로 대출을 갚으므로, 그 기업의 대출을 함께 봅니다. */
  const related = sel
    ? [...(data?.pending ?? []), ...(data?.loans ?? [])].filter(
        (l) => l.companyName === sel.to && l.status !== 'REPAID',
      )
    : [];

  return (
    <>
      <TTitle code="L0240" num="2400" title="대금 지급 지연" asOf={data?.asOf} />
      <TCond
        onSearch={() => {
          setName(draft);
          reload();
        }}
        onReset={() => setDraft('')}
      >
        <TField label="기업명">
          <input className="tf" value={draft} onChange={(e) => setDraft(e.target.value)} />
        </TField>
      </TCond>
      <TWarn>
        지급 예정일이 지났는데 받는 기업이 "받지 못함"을 누른 발주입니다. 지급 지연은 내는 기업의
        리스크 경보 신호로 더해집니다.
      </TWarn>

      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TKV
            labelWidth={90}
            rows={[
              [
                {
                  label: '지연 건수',
                  value: `${rows.length}건`,
                  right: true,
                  strong: true,
                  tone: rows.length ? 'bad' : undefined,
                },
                { label: '지연 금액', value: won(sum), right: true, strong: true },
                {
                  label: '최장 지연',
                  value: rows.length ? `${rows[0].late}일` : '—',
                  right: true,
                  strong: true,
                },
              ],
            ]}
          />

          <TSection
            title="지급 지연 발주"
            right={`총 ${rows.length}건 · 행을 누르면 아래에 관련 대출`}
          />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>발주</th>
                <th>품목</th>
                <th>내는 기업 → 받는 기업</th>
                <th>금액</th>
                <th>지급 예정일</th>
                <th>지연 일수</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={8}>지급 지연이 없습니다.</td>
                </tr>
              )}
              {rows.map((d, i) => (
                <tr
                  key={d.orderId}
                  className={`is-link${sel?.orderId === d.orderId ? ' is-hl' : ''}`}
                  onClick={() => setSelected(d.orderId)}
                >
                  <td className="c">{i + 1}</td>
                  <td className="c">
                    <b>{d.orderId}</b>
                  </td>
                  <td>{d.item}</td>
                  <td>
                    {d.from} → {d.to}
                  </td>
                  <td className="r">{won(d.amount)}</td>
                  <td className="c">{d.payDueDate}</td>
                  <td className="r">{d.late}일</td>
                  <td className="c">
                    <TTag tone="bad">지급 지연</TTag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sel && (
            <>
              <TSection
                title={`받는 기업의 대출 · ${sel.to}`}
                right="대금이 들어오지 않으면 회수가 늦어질 수 있는 대출"
              />
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>대출번호</th>
                    <th>근거 발주</th>
                    <th>금액</th>
                    <th>만기일</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {related.length === 0 && (
                    <tr className="tt-empty">
                      <td colSpan={5}>남아 있는 대출이 없습니다.</td>
                    </tr>
                  )}
                  {related.map((l) => (
                    <tr key={l.id}>
                      <td className="c">{l.id}</td>
                      <td>
                        {l.orderId} · {l.orderItem}
                      </td>
                      <td className="r">{won(l.amount)}</td>
                      <td className="c">{l.dueDate ?? '—'}</td>
                      <td className="c">
                        <TTag tone={LOAN_STATUS_TONE[l.status]}>{LOAN_STATUS_LABEL[l.status]}</TTag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <TFKeys
            keys={[
              { label: '리스크 경보', fkey: 'F5', onClick: () => navigate('/bank/loan/alerts') },
              {
                label: '체인 조회',
                fkey: 'F6',
                onClick: () =>
                  navigate(
                    sel
                      ? `/bank/loan/chain?company=${encodeURIComponent(sel.from)}`
                      : '/bank/loan/chain',
                  ),
              },
              {
                label: '엑셀 저장',
                fkey: 'F9',
                onClick: () =>
                  downloadCsv('대금지급지연.csv', [
                    ['발주', '품목', '내는 기업', '받는 기업', '금액', '지급 예정일', '지연 일수'],
                    ...rows.map((d) => [
                      d.orderId,
                      d.item,
                      d.from,
                      d.to,
                      d.amount,
                      d.payDueDate,
                      d.late,
                    ]),
                  ]),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
