import { useState } from 'react';
import { approveSignup, getSignupApprovals, rejectSignup } from '../../../api/ops';
import type { SignupApplication } from '../../../api/types';
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
  TWindow,
} from '../../../components/terminal';
import { downloadCsv } from '../../../lib/csv';
import { useAsync } from '../../../lib/useAsync';
import { SignupReasonWindow } from './OpsReason';

/** [O0210] 기업 가입 승인 (단말형) */
export function SignupApprovalsPage() {
  const { data, error, loading, reload, setData } = useAsync(getSignupApprovals, []);
  const [nameDraft, setNameDraft] = useState('');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [viewing, setViewing] = useState<SignupApplication | null>(null);
  const [rejecting, setRejecting] = useState<SignupApplication | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const match = (s: SignupApplication) => !name || s.companyName.includes(name.trim());
  const pending = (data?.pending ?? []).filter(match);
  const sel = pending.find((s) => s.id === selected) ?? pending[0];

  const approve = async (s?: SignupApplication) => {
    if (!s) return;
    setBusy(true);
    setMsg(null);
    try {
      setData(await approveSignup(s.id));
      setMsg({ ok: true, text: `${s.companyName} 가입을 승인했습니다.` });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const consent = (s: SignupApplication) => (
    <>
      금융{' '}
      <TTag tone={s.consents.financialInfo ? 'ok' : 'gray'}>
        {s.consents.financialInfo ? '동의' : '미동의'}
      </TTag>{' '}
      신용{' '}
      <TTag tone={s.consents.creditInfo ? 'ok' : 'gray'}>
        {s.consents.creditInfo ? '동의' : '미동의'}
      </TTag>
    </>
  );

  return (
    <>
      <TTitle code="O0210" num="2100" title="기업 가입 승인" asOf={data?.asOf} />
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
        협력사가 직접 가입하면 운영 담당이 확인하고 승인합니다. 원청 계정은 은행이 발급합니다.
        반려하려면 사유가 필요합니다.
      </TWarn>

      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TSection
            title="승인 대기"
            right={`총 ${pending.length}건 · 기업명을 누르면 가입 신청 상세`}
          />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>기업명</th>
                <th>아이디</th>
                <th>사업자번호</th>
                <th>대표</th>
                <th>업종</th>
                <th>신청일</th>
                <th>선택 동의</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={9}>승인을 기다리는 가입 신청이 없습니다.</td>
                </tr>
              )}
              {pending.map((s, i) => (
                <tr
                  key={s.id}
                  className={`is-link${sel?.id === s.id ? ' is-hl' : ''}`}
                  onClick={() => setSelected(s.id)}
                  onDoubleClick={() => setViewing(s)}
                >
                  <td className="c">{i + 1}</td>
                  <td>
                    <button type="button" className="tt-link" onClick={() => setViewing(s)}>
                      {s.companyName}
                    </button>
                  </td>
                  <td>{s.loginId}</td>
                  <td className="c">{s.bizNo}</td>
                  <td>{s.ceoName}</td>
                  <td>{s.industry}</td>
                  <td className="c">{s.appliedAt.slice(5)}</td>
                  <td>{consent(s)}</td>
                  <td className="act">
                    <button type="button" className="tb tb--sm" onClick={() => setViewing(s)}>
                      상세
                    </button>{' '}
                    <button
                      type="button"
                      className="tb tb--sm tb--primary"
                      disabled={busy}
                      onClick={() => approve(s)}
                    >
                      승인
                    </button>{' '}
                    <button
                      type="button"
                      className="tb tb--sm tb--danger"
                      disabled={busy}
                      onClick={() => setRejecting(s)}
                    >
                      반려
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {msg && (
            <p
              className={msg.ok ? 'tt-note tt-c--ok' : 'tt-warn'}
              role={msg.ok ? 'status' : 'alert'}
            >
              {msg.ok ? '● ' : '✕ '}
              {msg.text}
            </p>
          )}

          <div className="tt-halves">
            <div>
              <TSection title="반려" right={`${data.rejected.length}건`} />
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>기업명</th>
                    <th>반려일</th>
                    <th>사유</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rejected.length === 0 && (
                    <tr className="tt-empty">
                      <td colSpan={3}>반려한 신청이 없습니다.</td>
                    </tr>
                  )}
                  {data.rejected.map((s) => (
                    <tr key={s.id} className="is-link" onDoubleClick={() => setViewing(s)}>
                      <td>{s.companyName}</td>
                      <td className="c">{s.decidedAt?.slice(5)}</td>
                      <td>{s.rejectReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <TSection title="최근 승인" right={`${data.approved.length}건`} />
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>기업명</th>
                    <th>승인일</th>
                    <th>처리자</th>
                  </tr>
                </thead>
                <tbody>
                  {data.approved.map((s) => (
                    <tr key={s.id} className="is-link" onDoubleClick={() => setViewing(s)}>
                      <td>{s.companyName}</td>
                      <td className="c">{s.decidedAt}</td>
                      <td>{s.decidedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="tt-note">
            ※ 외부 조회 없이 신청 정보로 판단합니다. 실제 서비스라면 국세청 사업자 상태 조회를
            거칩니다.
          </p>

          <TFKeys
            keys={[
              {
                label: '엑셀 저장',
                fkey: 'F9',
                onClick: () =>
                  downloadCsv('가입신청.csv', [
                    [
                      '신청번호',
                      '기업명',
                      '아이디',
                      '사업자번호',
                      '대표',
                      '업종',
                      '신청일',
                      '상태',
                    ],
                    ...[...data.pending, ...data.rejected, ...data.approved].map((s) => [
                      s.id,
                      s.companyName,
                      s.loginId,
                      s.bizNo,
                      s.ceoName,
                      s.industry,
                      s.appliedAt,
                      s.status,
                    ]),
                  ]),
              },
              {
                label: '상세 조회',
                fkey: 'F4',
                disabled: !sel,
                onClick: () => sel && setViewing(sel),
              },
              {
                label: '반려',
                fkey: 'F8',
                kind: 'danger',
                disabled: !sel || busy,
                onClick: () => sel && setRejecting(sel),
              },
              {
                label: '승인',
                fkey: 'F7',
                kind: 'primary',
                disabled: !sel || busy,
                onClick: () => approve(sel),
              },
            ]}
          />
        </>
      )}

      {viewing && <SignupReasonWindow app={viewing} onClose={() => setViewing(null)} />}
      {rejecting && (
        <RejectWindow
          app={rejecting}
          onClose={() => setRejecting(null)}
          onDone={(text) => {
            setRejecting(null);
            setMsg({ ok: true, text });
          }}
          onData={setData}
        />
      )}
    </>
  );
}

function RejectWindow({
  app,
  onClose,
  onDone,
  onData,
}: {
  app: SignupApplication;
  onClose: () => void;
  onDone: (text: string) => void;
  onData: (d: Awaited<ReturnType<typeof rejectSignup>>) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason.trim()) {
      setError('반려 사유를 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      onData(await rejectSignup(app.id, reason.trim()));
      onDone(`${app.companyName} 가입을 반려했습니다.`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <TWindow
      title="[O0210] 가입 반려"
      onClose={onClose}
      actions={
        <>
          <button type="button" className="tb" onClick={onClose}>
            취소[Esc]
          </button>
          <button type="button" className="tb tb--danger" disabled={busy} onClick={submit}>
            반려
          </button>
        </>
      }
    >
      <TKV
        labelWidth={90}
        rows={[
          [{ label: '대상', value: `${app.companyName} · ${app.loginId}` }],
          [
            {
              label: '반려 사유',
              req: true,
              value: (
                <input
                  className="tf tf--req"
                  aria-label="반려 사유"
                  placeholder="예: 사업자등록번호와 상호가 일치하지 않음"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                />
              ),
            },
          ],
        ]}
      />
      {error && <p className="tt-warn">✕ {error}</p>}
      <TWarn>반려 사유는 신청한 기업에게 안내되고, 처리 기록에 남습니다.</TWarn>
    </TWindow>
  );
}
