import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getLoanDashboard } from '../../../api/loan';
import type { LoanRow, RiskAlert } from '../../../api/types';
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
import { eok, LOAN_STATUS_LABEL, LOAN_STATUS_TONE, STAGE_TONE } from './loan-format';

type Target = { kind: 'loan'; loan: LoanRow } | { kind: 'alert'; alert: RiskAlert };

/** [L0100] 여신 대시보드 (단말형) */
export function LoanDashboardPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getLoanDashboard, []);
  const [nameDraft, setNameDraft] = useState('');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<Target | null>(null);

  const match = (n: string) => !name || n.includes(name.trim());
  const loans = (data?.pendingLoans ?? []).filter((l) => match(l.companyName));
  const alerts = (data?.alerts ?? []).filter((a) => match(a.companyName));
  const sel = loans.find((l) => l.id === selected) ?? loans[0];

  return (
    <>
      <TTitle
        code="L0100"
        num="1100"
        title="여신 대시보드 (여신역)"
        asOf={data?.asOf}
        right={
          <button type="button" className="tb" onClick={() => navigate('/bank/loan/loans')}>
            전체 대출
          </button>
        }
      />
      <TCond
        onSearch={() => {
          setName(nameDraft);
          reload();
        }}
        onReset={() => setNameDraft('')}
      >
        <TField label="기업명">
          <input className="tf" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
        </TField>
      </TCond>
      <TWarn>
        대출·경보 상세는 조회 사유를 입력한 뒤에 열리며, 모든 조회는 처리·조회 기록에 남습니다.
        자동으로 한도를 줄이거나 대출을 막지 않습니다.
      </TWarn>

      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TSection title="업무 현황" right="(단위: 건 · 억원)" />
          <TKV
            rows={[
              [
                {
                  label: '승인 대기 대출',
                  value: `${data.counts.loanPending}건`,
                  right: true,
                  strong: true,
                  tone: 'warn',
                },
                {
                  label: '경보 기업 (관심 이상)',
                  value: `${data.counts.alertCompanies}곳`,
                  right: true,
                  strong: true,
                  tone: 'bad',
                },
                {
                  label: '주의 이상',
                  value: `${data.alerts.filter((a) => a.stage === '주의' || a.stage === '경보').length}곳`,
                  right: true,
                  strong: true,
                },
                {
                  label: '심사 대기',
                  value: `${data.counts.reviewPending}건`,
                  right: true,
                  strong: true,
                },
              ],
              [
                {
                  label: '가입 승인 대기',
                  value: `${data.counts.signupPending}건`,
                  right: true,
                  strong: true,
                },
                {
                  label: '대출 잔액 합계',
                  value: eok(data.product.loanBalanceSum),
                  right: true,
                  strong: true,
                },
                {
                  label: '보증 공급 총액',
                  value: eok(data.product.guaranteeTotal),
                  right: true,
                  strong: true,
                },
                {
                  label: '승인 한도 합계',
                  value: `${eok(data.product.approvedLimitSum)} (${((data.product.approvedLimitSum / data.product.guaranteeTotal) * 100).toFixed(1)}%)`,
                  right: true,
                  strong: true,
                },
              ],
            ]}
          />

          <TSection
            title="승인 대기 대출"
            right={`총 ${loans.length}건 · 행을 두 번 누르면 상세(조회 사유 입력)`}
          />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>대출번호</th>
                <th>신청기업</th>
                <th>근거 발주 (발주처)</th>
                <th>신청 금액</th>
                <th>확인 항목</th>
                <th>상태</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {loans.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={8}>승인을 기다리는 대출이 없습니다.</td>
                </tr>
              )}
              {loans.map((l, i) => (
                <tr
                  key={l.id}
                  className={`is-link${sel?.id === l.id ? ' is-hl' : ''}`}
                  onClick={() => setSelected(l.id)}
                  onDoubleClick={() => setTarget({ kind: 'loan', loan: l })}
                >
                  <td className="c">{i + 1}</td>
                  <td className="c">{l.id}</td>
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
                    <button
                      type="button"
                      className="tb tb--sm"
                      onClick={() => setTarget({ kind: 'loan', loan: l })}
                    >
                      상세
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <TSection title="경보 기업" right="점수는 운영 설정 가중치로 계산" />
          <table className="tt-table">
            <thead>
              <tr>
                <th>기업</th>
                <th>단계</th>
                <th>점수</th>
                <th>신호</th>
                <th>최근 조치</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={6}>경보 기업이 없습니다.</td>
                </tr>
              )}
              {alerts.map((a) => (
                <tr
                  key={a.id}
                  className="is-link"
                  onDoubleClick={() => setTarget({ kind: 'alert', alert: a })}
                >
                  <td>
                    <b>{a.companyName}</b>
                  </td>
                  <td className="c">
                    <TTag tone={STAGE_TONE[a.stage]}>{a.stage}</TTag>
                  </td>
                  <td className="r">{a.score}점</td>
                  <td>
                    {a.immediate && <TTag tone="bad">즉시 경보 · {a.immediate}</TTag>}{' '}
                    {a.signals.map((s) => `${s.label} +${s.points}`).join(' · ')}
                  </td>
                  <td>
                    {a.actions[0] ? `${a.actions[0].type} · ${a.actions[0].at.slice(5)}` : '—'}
                  </td>
                  <td className="act">
                    <button
                      type="button"
                      className="tb tb--sm"
                      onClick={() => setTarget({ kind: 'alert', alert: a })}
                    >
                      상세
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <TSection title="상품 한도 현황" right="(단위: 억원)" />
          <table className="tt-table">
            <thead>
              <tr>
                <th>구분</th>
                <th>금액</th>
                <th>비율</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['보증 공급 총액', data.product.guaranteeTotal],
                  ['승인된 업체별 한도 합계', data.product.approvedLimitSum],
                  ['대출 잔액 합계', data.product.loanBalanceSum],
                  ['잔여 보증 여력', data.product.guaranteeTotal - data.product.approvedLimitSum],
                ] as const
              ).map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td className="r">{eok(v)}</td>
                  <td className="r">{((v / data.product.guaranteeTotal) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <TFKeys
            keys={[
              { label: '리스크 경보', fkey: 'F5', onClick: () => navigate('/bank/loan/alerts') },
              { label: '이벤트 등록', fkey: 'F6', onClick: () => navigate('/bank/loan/events') },
              {
                label: '엑셀 저장',
                fkey: 'F9',
                onClick: () =>
                  downloadCsv('승인대기대출.csv', [
                    ['대출번호', '신청기업', '근거 발주', '발주처', '신청 금액', '확인 항목'],
                    ...loans.map((l) => [
                      l.id,
                      l.companyName,
                      l.orderId,
                      l.counterpartyName,
                      l.amount,
                      l.flagCount,
                    ]),
                  ]),
              },
              {
                label: '대출 상세',
                fkey: 'F4',
                kind: 'primary',
                disabled: !sel,
                onClick: () => sel && setTarget({ kind: 'loan', loan: sel }),
              },
            ]}
          />
        </>
      )}

      {target?.kind === 'loan' && (
        <LoanReasonWindow
          to={`/bank/loan/loans/${target.loan.id}`}
          defaultReason="승인 심사"
          target={[
            { label: '대출번호', value: <b>{target.loan.id}</b> },
            { label: '대상', value: `${target.loan.companyName} · ${won(target.loan.amount)}` },
          ]}
          onClose={() => setTarget(null)}
        />
      )}
      {target?.kind === 'alert' && (
        <LoanReasonWindow
          to={`/bank/loan/alerts/${target.alert.id}`}
          defaultReason="사후관리"
          target={[
            { label: '경보 기업', value: <b>{target.alert.companyName}</b> },
            { label: '단계 · 점수', value: `${target.alert.stage} · ${target.alert.score}점` },
          ]}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}
