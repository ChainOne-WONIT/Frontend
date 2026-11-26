import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { approveSignup, getSignupDetail, rejectSignup } from '../../../api/ops';
import type { SignupApprovals, SignupViewReason } from '../../../api/types';
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
} from '../../../components/terminal';
import { SIGNUP_VIEW_REASONS } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';

const LIST = '/bank/ops/signups';
const STATUS = {
  PENDING: ['승인 대기', 'warn'],
  APPROVED: ['승인', 'ok'],
  REJECTED: ['반려', 'bad'],
} as const;

/** [O0220] 가입 신청 상세 (단말형). 조회 사유를 고른 뒤에만 열립니다. */
export function SignupDetailPage() {
  const { id = '' } = useParams();
  return (
    <TReasonGate reasons={SIGNUP_VIEW_REASONS} back={LIST}>
      {(reason) => <DetailView id={id} reason={reason} />}
    </TReasonGate>
  );
}

function DetailView({ id, reason }: { id: string; reason: SignupViewReason }) {
  const navigate = useNavigate();
  const {
    data: d,
    error,
    loading,
    reload,
    setData,
  } = useAsync(() => getSignupDetail(id, reason), [id, reason]);
  const [rejectReason, setRejectReason] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // 승인·반려 뒤에는 목록 응답에서 이 신청의 바뀐 상태만 가져와 화면에 반영합니다.
  const apply = (list: SignupApprovals) => {
    if (!d) return;
    const next = [...list.pending, ...list.approved, ...list.rejected].find((x) => x.id === d.id);
    if (next) setData({ ...d, ...next });
  };
  const run = async (approve: boolean) => {
    if (!d) return;
    if (!approve && !rejectReason.trim()) {
      setMsg({ ok: false, text: '반려하려면 사유를 입력해 주세요.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      apply(approve ? await approveSignup(d.id) : await rejectSignup(d.id, rejectReason.trim()));
      setMsg({ ok: true, text: approve ? '가입을 승인했습니다.' : '가입을 반려했습니다.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const yes = (v: boolean, on = '받음', off = '안 받음') => (
    <TTag tone={v ? 'blue' : 'gray'}>{v ? on : off}</TTag>
  );
  const pending = d?.status === 'PENDING';

  return (
    <>
      <TTitle
        code="O0220"
        num="2200"
        title={d ? `가입 신청 상세 · ${d.companyName}` : '가입 신청 상세'}
        right={
          <>
            {d && <TTag tone={STATUS[d.status][1]}>{STATUS[d.status][0]}</TTag>}
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
            labelWidth={100}
            rows={[
              [
                { label: '신청번호', value: d.id, strong: true },
                { label: '신청 일시', value: d.appliedTime },
                { label: '가입 구분', value: '협력사 직접 가입' },
              ],
            ]}
          />

          <div className="tt-halves">
            <div>
              <TSection title="업체 정보" />
              <TKV
                labelWidth={110}
                rows={[
                  [{ label: '기업명', value: d.companyName, strong: true }],
                  [{ label: '사업자등록번호', value: d.bizNo }],
                  [{ label: '대표자 성명', value: d.ceoName }],
                  [{ label: '업종', value: d.industry }],
                  [
                    {
                      label: '사업장 주소',
                      value: `(${d.zipCode}) ${d.address}${d.addressDetail ? `, ${d.addressDetail}` : ''}`,
                    },
                  ],
                ]}
              />
            </div>
            <div>
              <TSection title="담당자 정보" />
              <TKV
                labelWidth={110}
                rows={[
                  [{ label: '담당자 성명', value: d.manager.name, strong: true }],
                  [
                    {
                      label: '부서 / 직위',
                      value:
                        [d.manager.department, d.manager.position].filter(Boolean).join(' / ') ||
                        '-',
                    },
                  ],
                  [{ label: '휴대폰 번호', value: d.manager.phone }],
                  [{ label: '이메일', value: d.manager.email }],
                  [{ label: '아이디', value: d.loginId }],
                ]}
              />
            </div>
          </div>

          <div className="tt-halves">
            <div>
              <TSection title="약관 동의" right={`${d.appliedAt} 동의`} />
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>구분</th>
                    <th>항목</th>
                    <th>동의</th>
                  </tr>
                </thead>
                <tbody>
                  {d.consentList.map((c) => (
                    <tr key={c.key}>
                      <td className="c">
                        <TTag tone={c.required ? 'blue' : 'gray'}>
                          {c.required ? '필수' : '선택'}
                        </TTag>
                      </td>
                      <td>{c.label}</td>
                      <td className="c">
                        <TTag tone={c.agreed ? 'ok' : 'gray'}>{c.agreed ? '동의' : '미동의'}</TTag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <TSection title="알림 설정 · 자동 확인" />
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>알림</th>
                    <th>이메일</th>
                    <th>SMS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>발주 진행 알림</td>
                    <td className="c">{yes(d.notifications.orderProgress.email)}</td>
                    <td className="c">{yes(d.notifications.orderProgress.sms)}</td>
                  </tr>
                  <tr>
                    <td>리스크 경보 알림</td>
                    <td className="c">{yes(d.notifications.riskAlert.email)}</td>
                    <td className="c">{yes(d.notifications.riskAlert.sms)}</td>
                  </tr>
                </tbody>
              </table>
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>확인 항목</th>
                    <th>결과</th>
                  </tr>
                </thead>
                <tbody>
                  {d.checks.map((c) => (
                    <tr key={c.label} className={c.ok ? undefined : 'is-hl'}>
                      <td>{c.label}</td>
                      <td className="c">
                        <TTag tone={c.ok ? 'ok' : 'bad'}>{c.result}</TTag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <TSection title="처리" right={pending ? '반려하려면 사유 필수' : '처리 완료'} />
          {pending ? (
            <>
              <TKV
                labelWidth={100}
                rows={[
                  [
                    {
                      label: '반려 사유',
                      req: true,
                      value: (
                        <input
                          className="tf tf--req"
                          aria-label="반려 사유"
                          placeholder="예: 사업자등록번호와 상호가 일치하지 않음"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                      ),
                    },
                  ],
                ]}
              />
              <TWarn>
                승인하면 담당자 이메일로 로그인 안내가 발송됩니다. 외부 조회 없이 신청 정보로
                판단합니다.
              </TWarn>
            </>
          ) : (
            <TKV
              labelWidth={100}
              rows={[
                [
                  {
                    label: '결과',
                    value: STATUS[d.status][0],
                    strong: true,
                    tone: STATUS[d.status][1],
                  },
                  { label: '처리일', value: d.decidedAt ?? '—' },
                  { label: '처리자', value: d.decidedBy ?? '—' },
                  { label: '반려 사유', value: d.rejectReason ?? '—' },
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
                label: '반려',
                fkey: 'F8',
                kind: 'danger',
                disabled: busy || !pending,
                onClick: () => run(false),
              },
              {
                label: '가입 승인',
                fkey: 'F7',
                kind: 'primary',
                disabled: busy || !pending,
                onClick: () => run(true),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
