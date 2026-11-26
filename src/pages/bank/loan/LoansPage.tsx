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

type Filter = { status: '' | LoanStatus; name: string };
const EMPTY: Filter = { status: '', name: '' };

/** [L0210] 생산자금 대출 (단말형) */
export function LoansPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getLoans, []);
  const [draft, setDraft] = useState<Filter>(EMPTY);
  const [filter, setFilter] = useState<Filter>(EMPTY);
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<LoanRow | null>(null);

  const match = (l: LoanRow) =>
    (!filter.status || l.status === filter.status) &&
    (!filter.name || l.companyName.includes(filter.name.trim()));
  const pending = (data?.pending ?? []).filter(match);
  const loans = (data?.loans ?? []).filter(match);
  const all = [...pending, ...loans];
  const sel = all.find((l) => l.id === selected) ?? pending[0];
  const count = (s: LoanStatus) => all.filter((l) => l.status === s).length;

  const row = (l: LoanRow, i: number, done: boolean) => (
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
        {l.orderId} · {l.orderItem}
        {!done && ` (${l.counterpartyName})`}
      </td>
      <td className="r">{won(l.amount)}</td>
      {done ? (
        <td className="c">
          {l.executedAt ?? '—'} · {l.dueDate ?? '—'}
        </td>
      ) : (
        <td className="c">{l.flagCount ? <TTag tone="warn">{l.flagCount}개</TTag> : '없음'}</td>
      )}
      <td className="c">
        <TTag tone={LOAN_STATUS_TONE[l.status]}>{LOAN_STATUS_LABEL[l.status]}</TTag>
      </td>
      <td className="act">
        <button type="button" className="tb tb--sm" onClick={() => setTarget(l)}>
          상세
        </button>
      </td>
    </tr>
  );

  return (
    <>
      <TTitle code="L0210" num="2100" title="생산자금 대출" asOf={data?.asOf} />
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
            {(Object.keys(LOAN_STATUS_LABEL) as LoanStatus[]).map((s) => (
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
        협력사가 수락된 발주를 근거로 신청한 생산자금을 승인하고 실행합니다. 상세는 조회 사유를
        입력한 뒤에 열립니다.
      </TWarn>

      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TSection title="승인 대기" right={`총 ${pending.length}건 · 행을 두 번 누르면 상세`} />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>대출번호</th>
                <th>신청 기업</th>
                <th>근거 발주 (발주처)</th>
                <th>신청 금액</th>
                <th>확인 항목</th>
                <th>상태</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={8}>조건에 맞는 대출이 없습니다.</td>
                </tr>
              )}
              {pending.map((l, i) => row(l, i, false))}
            </tbody>
          </table>

          <TSection title="대출 현황" right={`${loans.length}건`} />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>대출번호</th>
                <th>기업</th>
                <th>근거 발주</th>
                <th>금액</th>
                <th>실행 · 만기</th>
                <th>상태</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={8}>조건에 맞는 대출이 없습니다.</td>
                </tr>
              )}
              {loans.map((l, i) => row(l, i, true))}
            </tbody>
          </table>

          <TSection title="대금 지급 지연" right='받는 기업이 "받지 못함"을 누른 발주' />
          <table className="tt-table">
            <thead>
              <tr>
                <th>발주</th>
                <th>품목</th>
                <th>내는 기업 → 받는 기업</th>
                <th>금액</th>
                <th>지급 예정일</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {data.paymentDelays.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={6}>지급 지연이 없습니다.</td>
                </tr>
              )}
              {data.paymentDelays.map((d) => (
                <tr key={d.orderId}>
                  <td className="c">
                    <b>{d.orderId}</b>
                  </td>
                  <td>{d.item}</td>
                  <td>
                    {d.from} → {d.to}
                  </td>
                  <td className="r">{won(d.amount)}</td>
                  <td className="c">{d.payDueDate}</td>
                  <td className="c">
                    <TTag tone="bad">지급 지연</TTag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <TSection title="상태별 건수" right="(단위: 건)" />
          <TKV
            rows={[
              [
                {
                  label: '승인 대기',
                  value: count('PENDING'),
                  right: true,
                  strong: true,
                  tone: 'warn',
                },
                { label: '보류', value: count('HOLD'), right: true, strong: true },
                { label: '실행', value: count('EXECUTED'), right: true, strong: true },
                { label: '연체', value: count('OVERDUE'), right: true, strong: true, tone: 'bad' },
                {
                  label: '상환 완료',
                  value: count('REPAID'),
                  right: true,
                  strong: true,
                  tone: 'ok',
                },
              ],
            ]}
            labelWidth={90}
          />

          <TFKeys
            keys={[
              { label: '리스크 경보', fkey: 'F5', onClick: () => navigate('/bank/loan/alerts') },
              { label: '체인 조회', fkey: 'F6', onClick: () => navigate('/bank/loan/chain') },
              {
                label: '엑셀 저장',
                fkey: 'F9',
                onClick: () =>
                  downloadCsv('생산자금대출.csv', [
                    ['대출번호', '기업', '근거 발주', '금액', '실행일', '만기', '상태'],
                    ...all.map((l) => [
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
          defaultReason={target.status === 'PENDING' ? '승인 심사' : '사후관리'}
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
