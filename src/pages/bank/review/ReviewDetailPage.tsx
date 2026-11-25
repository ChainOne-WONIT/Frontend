import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { decideReview, getReviewDetail, submitKoditResult } from '../../../api/bank';
import type { ReviewDetail, ViewReason } from '../../../api/types';
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
import { flowLabel, STATUS_TONE, VIEW_REASONS, won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { GRADE_TONE, REVIEW_STATUS_LABEL } from './review-format';

const LIST = '/bank/review/applications';
const RS_TONE = {
  REVIEW: 'warn',
  KODIT_REVIEW: 'violet',
  APPROVED: 'ok',
  EXCLUDED: 'bad',
} as const;
const ORDER_TONE = (t: string): TTone =>
  t === 'warn'
    ? 'warn'
    : t === 'ok'
      ? 'ok'
      : t === 'violet'
        ? 'violet'
        : t === 'bad'
          ? 'bad'
          : 'blue';
const CHECK_SOURCE: Record<string, string> = {
  '현재 연체': '신용정보원',
  '세금 체납': '국세청',
  '휴·폐업': '국세청',
  '부도·회생 이력': '법원 공고',
  '수락된 발주': '발주 상태',
};

/** [R0220] 심사 상세 (단말형). 조회 사유를 고른 뒤에만 열립니다. */
export function ReviewDetailPage() {
  const { id = '' } = useParams();
  return (
    <TReasonGate reasons={VIEW_REASONS} back={LIST}>
      {(reason) => <DetailView id={id} reason={reason} />}
    </TReasonGate>
  );
}

function DetailView({ id, reason }: { id: string; reason: ViewReason }) {
  const navigate = useNavigate();
  const { data, error, loading, reload, setData } = useAsync(
    () => getReviewDetail(id, reason),
    [id, reason],
  );
  // 판정
  const [why, setWhy] = useState('');
  // 신보 결과
  const [amount, setAmount] = useState('');
  const [expireAt, setExpireAt] = useState('');
  const [koditReason, setKoditReason] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const d = data;
  const run = async (fn: () => Promise<ReviewDetail>, done: string) => {
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
  const decide = (result: 'PASS' | 'EXCLUDE') => {
    if (!d) return;
    if (result !== d.systemDecision && !why.trim()) {
      setMsg({ ok: false, text: '시스템 판정과 다르게 확정하려면 사유를 입력해 주세요.' });
      return;
    }
    run(
      () => decideReview(d.id, { result, reason: why.trim() || undefined }),
      `${result === 'PASS' ? '통과' : '제외'}로 확정했습니다.`,
    );
  };
  const kodit = (approved: boolean) => {
    if (!d) return;
    const n = Math.round(Number(amount) * 1e8);
    if (approved && !(n > 0)) {
      setMsg({ ok: false, text: '승인 한도(억원)를 입력해 주세요.' });
      return;
    }
    run(
      () =>
        submitKoditResult(
          d.id,
          approved
            ? { approved, amount: n, expireAt: expireAt || undefined }
            : { approved, reason: koditReason.trim() || undefined },
        ),
      approved ? '신보 승인 결과를 저장했습니다.' : '신보 거절로 저장했습니다.',
    );
  };

  const isReview = d?.status === 'REVIEW';
  const isKodit = d?.status === 'KODIT_REVIEW';

  return (
    <>
      <TTitle
        code="R0220"
        num="2200"
        title={d ? `심사 상세 · ${d.companyName}` : '심사 상세'}
        right={
          <>
            {d && <TTag tone={RS_TONE[d.status]}>{REVIEW_STATUS_LABEL[d.status]}</TTag>}
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
                { label: '신청번호', value: d.id, strong: true },
                { label: '신청기업', value: d.companyName, strong: true },
                { label: '거래상대 (발주처)', value: d.counterpartyName },
              ],
              [
                { label: '신청일', value: d.appliedAt },
                { label: '대금 수령 계좌', value: d.account },
                { label: '약정 동의', value: `${d.consentCount}개 항목 · ${d.consentAt}` },
              ],
            ]}
          />

          <div className="tt-halves">
            <div>
              <TSection title="① 자격 확인 (규칙)" right={`${d.checks.length}개 항목`} />
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>항목</th>
                    <th>결과</th>
                    <th>근거</th>
                  </tr>
                </thead>
                <tbody>
                  {d.checks.map((c) => (
                    <tr key={c.label} className={c.ok ? undefined : 'is-hl'}>
                      <td>{c.label}</td>
                      <td className="c">
                        <TTag tone={c.ok ? 'ok' : 'bad'}>{c.ok ? '문제 없음' : '문제 있음'}</TTag>
                      </td>
                      <td>{CHECK_SOURCE[c.label] ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <TSection
                title="② 등급 (모델)"
                right={`안정 ${d.grade.stableBelow}% 미만 / 제외 ${d.grade.excludeFrom}% 이상`}
              />
              <TKV
                labelWidth={100}
                rows={[
                  [
                    {
                      label: '예측 부실확률',
                      value: (
                        <>
                          <b
                            className={`tt-c--${GRADE_TONE[d.grade.label]}`}
                            style={{ fontSize: 14 }}
                          >
                            {d.pd}%
                          </b>
                          <TTag tone={GRADE_TONE[d.grade.label] as TTone}>{d.grade.label}</TTag>
                        </>
                      ),
                    },
                    {
                      label: '시스템 판정',
                      value: d.systemDecision === 'PASS' ? '통과' : '제외',
                      strong: true,
                      tone: d.systemDecision === 'PASS' ? 'ok' : 'bad',
                    },
                  ],
                ]}
              />
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>판정에 크게 영향을 준 항목</th>
                    <th>방향</th>
                    <th>기여</th>
                  </tr>
                </thead>
                <tbody>
                  {d.grade.factors.map((f) => (
                    <tr key={f.text}>
                      <td>{f.text}</td>
                      <td className="c">
                        <TTag tone={f.delta > 0 ? 'bad' : 'ok'}>
                          {f.delta > 0 ? '위험 ↑' : '위험 ↓'}
                        </TTag>
                      </td>
                      <td className="r">{f.delta > 0 ? `+${f.delta}` : f.delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <TSection title="근거 발주와 체인" />
          <TKV
            labelWidth={100}
            rows={[
              [
                { label: '발주번호', value: d.order.id, strong: true },
                { label: '품목', value: d.order.item },
                { label: '발주금액', value: won(d.order.amount), strong: true },
                {
                  label: '발주 상태',
                  value: (
                    <TTag tone={ORDER_TONE(STATUS_TONE[d.order.status])}>
                      {flowLabel(d.order.status)}
                    </TTag>
                  ),
                },
              ],
              [
                { label: '납기', value: d.order.dueDate },
                { label: '수량', value: `${d.order.quantity.toLocaleString()}${d.order.unit}` },
                { label: '납품 장소', value: d.order.place },
                { label: '체인 위치', value: `${d.chainPath.length - 1}차 협력사` },
              ],
              [
                {
                  label: '발주 연결',
                  value: d.chainPath.map((n, i) => (
                    <span key={n}>
                      {i > 0 && '  ▶  '}
                      {i === d.chainPath.length - 1 ? <b className="tt-c--blue">{n}</b> : n}
                    </span>
                  )),
                },
              ],
            ]}
          />

          <TSection title="판정" right="시스템 판정과 다르게 확정하면 사유 필수" />
          {isReview ? (
            <>
              <TKV
                labelWidth={120}
                rows={[
                  [
                    {
                      label: '시스템 판정',
                      value: (
                        <>
                          <TTag tone={d.systemDecision === 'PASS' ? 'ok' : 'bad'}>
                            {d.systemDecision === 'PASS' ? '통과' : '제외'}
                          </TTag>
                          <span className="tt-muted">
                            {d.checks
                              .filter((c) => !c.ok)
                              .map((c) => c.label)
                              .join(' · ') || '자격 확인 문제 없음'}{' '}
                            · 예측 부실확률 {d.pd}%
                          </span>
                        </>
                      ),
                    },
                    { label: '담당자', value: '김하늘 (심사역)' },
                  ],
                  [
                    {
                      label: '다르게 확정할 사유',
                      req: true,
                      value: (
                        <input
                          className="tf tf--req"
                          aria-label="시스템 판정과 다르게 확정할 사유"
                          placeholder="예: 연체가 해소되어 최근 3개월 정상 상환 중"
                          value={why}
                          onChange={(e) => setWhy(e.target.value)}
                        />
                      ),
                    },
                  ],
                ]}
              />
              <TWarn>
                자동 평가만으로 거절을 확정하지 않습니다. 시스템 판정과 다르게 확정하려면 사유가
                필요합니다.
              </TWarn>
            </>
          ) : (
            <TKV
              labelWidth={120}
              rows={[
                [
                  {
                    label: '확정 결과',
                    value: d.decision ? (d.decision.result === 'PASS' ? '통과' : '제외') : '-',
                    strong: true,
                    tone: d.decision?.result === 'PASS' ? 'ok' : 'bad',
                  },
                  {
                    label: '처리자 · 일자',
                    value: d.decision ? `${d.decision.by} · ${d.decision.at}` : '-',
                  },
                  { label: '사유', value: d.decision?.reason ?? '—' },
                ],
              ]}
            />
          )}

          <TSection
            title="신보 승인 결과 입력"
            right={
              isKodit
                ? '신보 회신 내용을 입력합니다'
                : isReview
                  ? '판정을 통과로 확정한 뒤에 입력할 수 있습니다'
                  : '입력 완료'
            }
          />
          {d.status === 'APPROVED' || d.status === 'EXCLUDED' ? (
            <TKV
              labelWidth={110}
              rows={[
                [
                  {
                    label: '결과',
                    value: REVIEW_STATUS_LABEL[d.status],
                    strong: true,
                    tone: d.status === 'APPROVED' ? 'ok' : 'bad',
                  },
                  { label: '승인 한도', value: d.amount ? won(d.amount) : '—' },
                  { label: '만료일', value: d.expireAt ?? '—' },
                  { label: '제외 사유', value: d.excludeReason ?? '—' },
                ],
              ]}
            />
          ) : (
            <TKV
              labelWidth={110}
              rows={[
                [
                  {
                    label: '승인 한도 (억원)',
                    req: isKodit,
                    value: (
                      <input
                        className={`tf${isKodit ? ' tf--req' : ''}`}
                        type="number"
                        min="0"
                        step="0.1"
                        aria-label="승인 한도 (억원)"
                        disabled={!isKodit}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    ),
                  },
                  {
                    label: '만료일',
                    value: (
                      <input
                        className="tf"
                        type="date"
                        aria-label="만료일"
                        disabled={!isKodit}
                        value={expireAt}
                        onChange={(e) => setExpireAt(e.target.value)}
                      />
                    ),
                  },
                  {
                    label: '신보 거절 사유',
                    value: (
                      <input
                        className="tf"
                        aria-label="신보 거절 사유"
                        disabled={!isKodit}
                        value={koditReason}
                        onChange={(e) => setKoditReason(e.target.value)}
                      />
                    ),
                  },
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
              {
                label: '기업 심사 정보',
                fkey: 'F5',
                onClick: () => navigate('/bank/review/companies'),
              },
              { label: '체인 조회', fkey: 'F6', onClick: () => navigate('/bank/review/chain') },
              ...(isKodit
                ? [
                    {
                      label: '신보 거절 저장',
                      fkey: 'F8' as const,
                      kind: 'danger' as const,
                      disabled: busy,
                      onClick: () => kodit(false),
                    },
                    {
                      label: '신보 승인 저장',
                      fkey: 'F7' as const,
                      kind: 'primary' as const,
                      disabled: busy,
                      onClick: () => kodit(true),
                    },
                  ]
                : [
                    {
                      label: '제외로 확정',
                      fkey: 'F8' as const,
                      kind: 'danger' as const,
                      disabled: busy || !isReview,
                      onClick: () => decide('EXCLUDE'),
                    },
                    {
                      label: '통과로 확정',
                      fkey: 'F7' as const,
                      kind: 'primary' as const,
                      disabled: busy || !isReview,
                      onClick: () => decide('PASS'),
                    },
                  ]),
            ]}
          />
        </>
      )}
    </>
  );
}
