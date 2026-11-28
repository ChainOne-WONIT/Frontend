import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getLoans } from '../../../api/loan';
import type { LoanRow } from '../../../api/types';
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

type Filter = { status: '' | 'PENDING' | 'HOLD'; flag: '' | 'Y' | 'N'; name: string };
const EMPTY: Filter = { status: '', flag: '', name: '' };

/** [L0210] 승인 대기 (단말형). 아직 실행하지 않은 신청(승인 대기·보류)을 모아 봅니다. */
export function LoanPendingPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getLoans, [], { refreshOnChange: true });
  const [draft, setDraft] = useState<Filter>(EMPTY);
  const [filter, setFilter] = useState<Filter>(EMPTY);
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<LoanRow | null>(null);

  /* 보류된 신청도 다시 승인할 수 있으므로 이 화면에 둡니다. */
  const open = [
    ...(data?.pending ?? []),
    ...(data?.loans ?? []).filter((l) => l.status === 'HOLD'),
  ];
  const rows = open.filter(
    (l) =>
      (!filter.status || l.status === filter.status) &&
      (!filter.flag || (filter.flag === 'Y' ? l.flagCount > 0 : l.flagCount === 0)) &&
      (!filter.name || l.companyName.includes(filter.name.trim())),
  );
  const sel = rows.find((l) => l.id === selected) ?? rows[0];
  const sum = rows.reduce((s, l) => s + l.amount, 0);

  return (
    <>
      <TTitle code="L0210" num="2100" title="승인 대기" asOf={data?.asOf} />
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
            <option value="PENDING">{LOAN_STATUS_LABEL.PENDING}</option>
            <option value="HOLD">{LOAN_STATUS_LABEL.HOLD}</option>
          </select>
        </TField>
        <TField label="확인 항목">
          <select
            className="tf"
            value={draft.flag}
            onChange={(e) => setDraft({ ...draft, flag: e.target.value as Filter['flag'] })}
          >
            <option value="">전체</option>
            <option value="Y">있음</option>
            <option value="N">없음</option>
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
        협력사가 수락된 발주를 근거로 신청한 생산자금입니다. 상세에서 확인 항목을 살펴본 뒤 승인하고
        실행하거나 보류합니다. 상세는 조회 사유를 고른 뒤에 열립니다.
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
                  label: '승인 대기',
                  value: `${open.filter((l) => l.status === 'PENDING').length}건`,
                  right: true,
                  strong: true,
                  tone: 'warn',
                },
                {
                  label: '보류',
                  value: `${open.filter((l) => l.status === 'HOLD').length}건`,
                  right: true,
                  strong: true,
                },
                {
                  label: '확인 항목 있음',
                  value: `${open.filter((l) => l.flagCount > 0).length}건`,
                  right: true,
                  strong: true,
                },
                { label: '신청 금액 합계', value: won(sum), right: true, strong: true },
              ],
            ]}
          />

          <TSection title="승인 대기 목록" right={`총 ${rows.length}건 · 행을 두 번 누르면 상세`} />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>대출번호</th>
                <th>신청일</th>
                <th>신청 기업</th>
                <th>근거 발주 (발주처)</th>
                <th>신청 금액</th>
                <th>확인 항목</th>
                <th>상태</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={9}>조건에 맞는 신청이 없습니다.</td>
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
                  <td className="c">{l.appliedAt}</td>
                  <td>{l.companyName}</td>
                  <td>
                    {l.orderId} · {l.orderItem} ({l.counterpartyName})
                  </td>
                  <td className="r">{won(l.amount)}</td>
                  <td className="c">
                    {l.flagCount ? <TTag tone="warn">{l.flagCount}개</TTag> : '없음'}
                  </td>
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
          <p className="tt-note">
            ※ 확인 항목은 거절 사유가 아니라 들여다볼 곳입니다. 경보 표시는 대출을 자동으로 막지
            않습니다.
          </p>

          <TFKeys
            keys={[
              { label: '대출 현황', fkey: 'F5', onClick: () => navigate('/bank/loan/loans') },
              { label: '체인 조회', fkey: 'F6', onClick: () => navigate('/bank/loan/chain') },
              {
                label: '엑셀 저장',
                fkey: 'F9',
                onClick: () =>
                  downloadCsv('승인대기.csv', [
                    [
                      '대출번호',
                      '신청일',
                      '기업',
                      '근거 발주',
                      '발주처',
                      '금액',
                      '확인 항목',
                      '상태',
                    ],
                    ...rows.map((l) => [
                      l.id,
                      l.appliedAt,
                      l.companyName,
                      l.orderId,
                      l.counterpartyName,
                      l.amount,
                      l.flagCount,
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
          defaultReason="승인 심사"
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
