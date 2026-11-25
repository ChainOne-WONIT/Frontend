import { Link } from 'react-router';
import { getOpsDashboard } from '../../../api/ops';
import { Card, ErrorBox, KeyValue, Loading, Pill } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { dot, won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import '../review/review.css';
import './ops.css';

/** 운영 01 · 대시보드 */
export function OpsDashboardPage() {
  const { data, error, loading, reload } = useAsync(getOpsDashboard, []);

  if (loading) return <Loading />;
  if (error || !data)
    return <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />;

  const { counts: c, product: p } = data;
  const usage = p.guaranteeTotal ? (p.approvedLimitSum / p.guaranteeTotal) * 100 : 0;
  const tiles = [
    { label: '심사 대기', value: `${c.reviewPending}건`, sub: '한도 신청' },
    { label: '승인 대기 대출', value: `${c.loanPending}건`, sub: '생산자금 신청' },
    { label: '경보 기업', value: `${c.alertCompanies}곳`, sub: '관심 이상' },
    {
      label: '가입 승인 대기',
      value: `${c.signupPending}건`,
      sub: '기업 가입 신청',
      to: '/bank/ops/signups',
    },
  ];

  return (
    <>
      <PageHead
        title="운영 담당 대시보드"
        sub="평소에는 목록과 집계만 보입니다. 상세는 조회 사유를 고른 뒤에 열립니다."
        right={<span className="small muted">{dot(data.asOf)} 기준</span>}
      />

      <div className="grid-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={`card kpi rv-tile${t.to ? ' rv-tile--main' : ' rv-tile--dim'}`}
          >
            <div className="kpi__head">
              {t.label}
              {t.to && (
                <Link to={t.to} className="link-more">
                  바로가기 ›
                </Link>
              )}
            </div>
            <div className="kpi__value">
              <b>{t.value}</b>
            </div>
            <span className="small muted">{t.sub}</span>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <Card
          title="가입 승인 대기"
          right={
            <Link to="/bank/ops/signups" className="link-more">
              전체 보기 ›
            </Link>
          }
        >
          {data.pendingSignups.length === 0 ? (
            <p className="empty">승인을 기다리는 가입 신청이 없습니다.</p>
          ) : (
            <ul className="list">
              {data.pendingSignups.map((s) => (
                <li key={s.id} className="list__item">
                  <div className="list__main">
                    <div className="list__title">{s.companyName}</div>
                    <div className="list__sub">
                      {s.industry} · 신청 {s.appliedAt}
                    </div>
                  </div>
                  <Pill tone="warn">승인 대기</Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="최근 처리 기록"
          right={
            <Link to="/bank/ops/logs" className="link-more">
              전체 보기 ›
            </Link>
          }
        >
          <ul className="list">
            {data.recentLogs.map((l) => (
              <li key={l.id} className="list__item rv-log">
                <span className="num muted">{l.at.slice(0, 10)}</span>
                <b>
                  {l.actor} · {l.content} · {l.target}
                </b>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="상품 전체 한도" right={<span className="small muted">은행 특별출연 기준</span>}>
        <KeyValue
          rows={[
            ['보증 공급 총액', <b key="a">{won(p.guaranteeTotal)}</b>],
            [
              '승인된 업체별 한도 합계',
              <b key="b">
                {won(p.approvedLimitSum)} (소진율 {usage.toFixed(1)}%)
              </b>,
            ],
            ['대출 잔액 합계', <b key="c">{won(p.loanBalanceSum)}</b>],
          ]}
        />
        <div className="bar rv-usage" aria-label={`소진율 ${usage.toFixed(1)}%`}>
          <i style={{ width: `${Math.min(100, usage)}%` }} />
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          누계 기준이라 기업이 상환해도 소진율은 내려가지 않습니다. 기업별로 나눈 한도는 없습니다.
        </p>
      </Card>
    </>
  );
}
