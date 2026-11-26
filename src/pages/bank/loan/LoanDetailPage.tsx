import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { approveLoan, checkLoanFlag, getLoanDetail, holdLoan } from '../../../api/loan';
import type { LoanDetail, LoanViewReason } from '../../../api/types';
import {
  TError,
  TFKeys,
  TKV,
  TLoading,
  TReasonGate,
  TSection,
  TTag,
  TTitle,
  TWarn,
  type TTone,
} from '../../../components/terminal';
import { flowLabel, LOAN_VIEW_REASONS, won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { GRADE_TONE } from '../review/review-format';
import { LOAN_STATUS_LABEL, LOAN_STATUS_TONE, STAGE_TONE } from './loan-format';

const LIST = '/bank/loan/loans';

/** [L0220] 대출 상세 (단말형). 조회 사유를 고른 뒤에만 열립니다. */
export function LoanDetailPage() {
  const { id = '' } = useParams();
  return (
    <TReasonGate reasons={LOAN_VIEW_REASONS} back={LIST}>
      {(reason) => <DetailView id={id} reason={reason} />}
    </TReasonGate>
  );
}

function DetailView({ id, reason }: { id: string; reason: LoanViewReason }) {
  const navigate = useNavigate();
  const { data, error, loading, reload, setData } = useAsync(
    () => getLoanDetail(id, reason),
    [id, reason],
  );
  const [holdReason, setHoldReason] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const d = data;
  const run = async (fn: () => Promise<LoanDetail>, done: string) => {
    setBusy(true);
    setMsg(null);
    try {
      setData(await fn());
      setMsg({ ok: true, text: done });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const approve = () => d && run(() => approveLoan(d.id), '승인하고 실행했습니다.');
  const hold = () => {
    if (!d) return;
    if (!holdReason.trim()) {
      setMsg({ ok: false, text: '보류하려면 사유를 입력해 주세요.' });
      return;
    }
    run(() => holdLoan(d.id, holdReason.trim()), '보류했습니다.');
  };
  const toggleFlag = (flagId: string) =>
    d &&
    checkLoanFlag(d.id, flagId).then(setData, (e: Error) => setMsg({ ok: false, text: e.message }));

  const open = d?.status === 'PENDING' || d?.status === 'HOLD';

  return (
    <>
      <TTitle
        code="L0220"
        num="2200"
        title={d ? `대출 상세 · ${d.companyName}` : '대출 상세'}
        right={
          <>
            {d && <TTag tone={LOAN_STATUS_TONE[d.status]}>{LOAN_STATUS_LABEL[d.status]}</TTag>}
            <button type="button" className="tb" onClick={() => navigate(LIST)}>
              목록[F3]
            </button>
          </>
        }
      />
      {loading && !d ? (
        <TLoading />
      ) : error || !d ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TSection title="신청 정보" right={`조회 사유: ${reason} · 조회 기록 저장됨`} />
          <TKV
            labelWidth={110}
            rows={[
              [
                { label: '대출번호', value: d.id, strong: true },
                { label: '신청기업', value: d.companyName, strong: true },
                { label: '신청일', value: d.appliedAt },
              ],
              [
                { label: '만기', value: `${d.dueDate ?? '-'} (납기일 + 60일)` },
                { label: '대금 수령 계좌', value: d.account },
                { label: '처리자', value: d.decidedBy ?? '—' },
              ],
            ]}
          />

          <div className="tt-halves">
            <div>
              <TSection title="신청 내용" />
              <TKV
                labelWidth={100}
                rows={[
                  [{ label: '신청 금액', value: won(d.amount), strong: true }],
                  [
                    {
                      label: '근거 발주',
                      value: (
                        <>
                          <b>
                            {d.orderId} · {d.orderItem}
                          </b>
                          <TTag tone="blue">{flowLabel(d.orderStatus)}</TTag>
                        </>
                      ),
                    },
                  ],
                  [
                    {
                      label: '발주금액',
                      value: `${won(d.orderAmount)} (${d.ratio}% = ${won((d.orderAmount * d.ratio) / 100)})`,
                    },
                  ],
                  [{ label: '발주 체인', value: d.chainPath.join(' ▶ ') }],
                  [{ label: '한도', value: `${won(d.limit.amount)} 중 사용 ${won(d.limit.used)}` }],
                  [
                    {
                      label: '등급 · 경보',
                      value: (
                        <>
                          <TTag tone={GRADE_TONE[d.grade] as TTone}>{d.grade}</TTag>
                          <TTag tone={STAGE_TONE[d.alertStage]}>{d.alertStage}</TTag>
                        </>
                      ),
                    },
                  ],
                ]}
              />
            </div>
            <div>
              <TSection
                title="확인 항목 표시"
                right={
                  d.flags.length ? `${d.flags.length}개 · 거절 사유가 아니라 들여다볼 곳` : '없음'
                }
              />
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>항목</th>
                    <th>확인</th>
                  </tr>
                </thead>
                <tbody>
                  {d.flags.length === 0 && (
                    <tr className="tt-empty">
                      <td colSpan={2}>들여다볼 확인 항목이 없습니다.</td>
                    </tr>
                  )}
                  {d.flags.map((f) => (
                    <tr key={f.id} className={f.checked ? undefined : 'is-hl'}>
                      <td>
                        <b>{f.title}</b>
                        <div className="tt-muted">{f.detail}</div>
                      </td>
                      <td className="act">
                        <button
                          type="button"
                          className={`tb tb--sm${f.checked ? ' tt-c--ok' : ''}`}
                          aria-pressed={f.checked}
                          onClick={() => toggleFlag(f.id)}
                        >
                          {f.checked ? '확인함 ✓' : '확인'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="tt-note">※ 이 단계에서 등급으로 다시 평가하지 않습니다.</p>
            </div>
          </div>

          <TSection title="처리" right={open ? '보류하려면 사유 필수' : '처리 완료'} />
          {open ? (
            <>
              <TKV
                labelWidth={120}
                rows={[
                  ...(d.status === 'HOLD'
                    ? [
                        [
                          {
                            label: '보류 내역',
                            value: `${d.decidedAt} · ${d.decidedBy} · 사유: ${d.holdReason}`,
                          },
                        ],
                      ]
                    : [
                        [
                          {
                            label: '보류할 때 사유',
                            req: true,
                            value: (
                              <input
                                className="tf tf--req"
                                aria-label="보류할 때 사유"
                                placeholder="예: 납품 일정 확인 후 재검토"
                                value={holdReason}
                                onChange={(e) => setHoldReason(e.target.value)}
                              />
                            ),
                          },
                        ],
                      ]),
                  [
                    {
                      label: '실행 계좌',
                      value: `${d.companyName} 대금 수령 계좌 ${d.account} (대금이 들어오면 이 계좌에서 회수)`,
                    },
                  ],
                ]}
              />
              <TWarn>
                승인하면 바로 실행되어 위 계좌로 지급됩니다. 경보 표시는 참고용이며 자동으로 대출을
                막지 않습니다.
              </TWarn>
            </>
          ) : (
            <TKV
              labelWidth={110}
              rows={[
                [
                  {
                    label: '결과',
                    value: LOAN_STATUS_LABEL[d.status],
                    strong: true,
                    tone: LOAN_STATUS_TONE[d.status],
                  },
                  { label: '실행일', value: d.executedAt ?? '—' },
                  { label: '만기일', value: d.dueDate ?? '—' },
                  { label: '처리자', value: d.decidedBy ?? '—' },
                ],
              ]}
            />
          )}

          {msg && (
            <p
              className={msg.ok ? 'tt-note tt-c--ok' : 'tt-warn'}
              role={msg.ok ? 'status' : 'alert'}
            >
              {msg.ok ? '● ' : '✕ '}
              {msg.text}
            </p>
          )}

          <TFKeys
            keys={[
              { label: '목록', fkey: 'F3', onClick: () => navigate(LIST) },
              { label: '체인 조회', fkey: 'F6', onClick: () => navigate('/bank/loan/chain') },
              {
                label: '보류',
                fkey: 'F8',
                kind: 'danger',
                disabled: busy || d.status !== 'PENDING',
                onClick: hold,
              },
              {
                label: '승인하고 실행',
                fkey: 'F7',
                kind: 'primary',
                disabled: busy || !open,
                onClick: approve,
              },
            ]}
          />
        </>
      )}
    </>
  );
}
