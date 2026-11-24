import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getFund, requestLoan } from '../../api/corp';
import type { FundOverview, LimitStatus } from '../../api/types';
import { Icon } from '../../components/Icon';
import { RiskGauge } from '../../components/RiskGauge';
import { Card, ErrorBox, Loading, Note, Pill, StatusPill } from '../../components/ui';
import { PageHead } from '../../layouts/CorpLayout';
import { won, type PillTone } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';

const LIMIT_LABEL: Record<LimitStatus, [string, PillTone]> = {
  APPROVED: ['승인', 'ok'],
  KODIT_REVIEW: ['신보 심사 중', 'warn'],
  REVIEW: ['심사 중', 'warn'],
  EXCLUDED: ['제외', 'bad'],
  NONE: ['미신청', 'gray'],
};

const GRADE_TONE: Record<FundOverview['grade']['label'], PillTone> = {
  안정: 'ok',
  관찰: 'warn',
  제외: 'bad',
};

export function FundPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getFund, []);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  if (loading && !data) return <Loading />;
  if (error || !data)
    return <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />;

  const apply = async (orderId: string) => {
    setBusy(orderId);
    setMsg('');
    try {
      const o = await requestLoan(orderId);
      setMsg(`${o.loan?.id} 생산자금 ${won(o.loan?.amount)}이 실행되었습니다.`);
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <PageHead
        title="생산자금"
        sub="수락된 발주를 근거로, 거래 상대별 한도 안에서 발주금액의 80%까지 빌릴 수 있습니다."
      />
      {msg && <Note tone="ok">{msg}</Note>}

      <div className="grid-side">
        <Card title="거래 상대별 한도">
          <ul className="list">
            {data.limits.map((l) => {
              const [label, tone] = LIMIT_LABEL[l.status];
              return (
                <li key={l.counterpartyId} className="list__item">
                  <div className="list__main">
                    <div className="list__title">
                      {l.counterpartyName} 거래용 한도{' '}
                      {l.status !== 'NONE' && <Pill tone={tone}>{label}</Pill>}
                    </div>
                    {l.status === 'APPROVED' ? (
                      <>
                        <div className="list__sub">
                          {won(l.amount)} · 사용 {won(l.used)} · 잔액{' '}
                          <b>{won((l.amount ?? 0) - (l.used ?? 0))}</b> · 보증 만료 {l.expireAt}
                        </div>
                        <div className="bar" style={{ marginTop: 8 }}>
                          <i
                            style={{
                              width: `${Math.round(((l.used ?? 0) / (l.amount || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </>
                    ) : l.status === 'NONE' ? (
                      <div className="list__sub">수락된 발주가 있어 한도를 신청할 수 있습니다.</div>
                    ) : (
                      <div className="list__sub">
                        신청일 {l.appliedAt} · 신용보증기금 보증 심사 중
                      </div>
                    )}
                  </div>
                  {l.status === 'NONE' && (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => alert('한도 신청 화면은 백엔드 연결 후 이어서 만듭니다.')}
                    >
                      한도 신청
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="신용위험 평가" className="risk-card">
          <RiskGauge score={data.grade.score} />
          <div className="risk__summary">
            <Pill tone={GRADE_TONE[data.grade.label]}>{data.grade.label}</Pill>
            <span>
              추정 부실확률 <b>{data.grade.pd}%</b>
            </span>
          </div>
          <ul className="risk__reasons">
            {data.grade.reasons.map((r) => (
              <li key={r.text} className={`risk__reason risk__reason--${r.kind}`}>
                <Icon name={r.kind === 'warn' ? 'alert' : 'check'} size={17} />
                {r.text}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 14 }}>
            <Note>
              등급은 본인과 은행만 봅니다. 거래처에는 보이지 않고, 대출 금액을 깎지 않습니다.
            </Note>
          </div>
        </Card>
      </div>

      <Card title="생산자금 신청" right={<span className="small muted">진행 중인 받은 발주</span>}>
        <ul className="list">
          {data.applicable.map((a) => (
            <li key={a.orderId} className="list__item">
              <div className="list__main">
                <div className="list__title">
                  {a.orderId} · {a.item} · {a.counterpartyName}
                </div>
                <div className="list__sub">발주금액 {won(a.amount)}</div>
              </div>
              <StatusPill status={a.status} />
              {a.availableAmount ? (
                <>
                  <span className="small muted">신청 가능 금액</span>
                  <b className="num" style={{ color: 'var(--blue)' }}>
                    {won(a.availableAmount)}
                  </b>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    disabled={busy === a.orderId}
                    onClick={() => apply(a.orderId)}
                  >
                    신청
                  </button>
                </>
              ) : (
                <span className="small" style={{ color: 'var(--amber)', fontWeight: 500 }}>
                  {a.blockedReason}
                </span>
              )}
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => navigate(`/corp/orders/${a.orderId}`)}
              >
                발주 보기
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="대출 현황">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 100 }}>대출번호</th>
              <th>근거 발주</th>
              <th style={{ width: 150 }}>금액</th>
              <th style={{ width: 150 }}>실행일</th>
              <th style={{ width: 130 }}>만기 · 상환</th>
              <th style={{ width: 110 }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {data.loans.map((l) => (
              <tr key={l.id}>
                <td>
                  <b>{l.id}</b>
                </td>
                <td>{l.orderLabel}</td>
                <td className="num">{won(l.amount)}</td>
                <td className="num">{l.executedAt}</td>
                <td className="num">{l.status === 'REPAID' ? l.repaidAt : l.dueDate}</td>
                <td>
                  <Pill tone={l.status === 'REPAID' ? 'ok' : 'default'}>
                    {l.status === 'REPAID' ? '상환 완료' : '실행'}
                  </Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
