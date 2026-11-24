import { getAlerts } from '../../api/corp';
import type { AlertStage } from '../../api/types';
import { Card, ErrorBox, Loading, Note, Pill } from '../../components/ui';
import { PageHead } from '../../layouts/CorpLayout';
import type { PillTone } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';

const STAGES: [AlertStage, string, string][] = [
  ['정상', '경보 없음', 'ok'],
  ['관심', '40점 이상', 'watch'],
  ['주의', '50점 이상', 'caution'],
  ['경보', '60점 이상 · 부도·회생 즉시', 'alert'],
];
const TONE: Record<AlertStage, PillTone> = { 정상: 'ok', 관심: 'warn', 주의: 'warn', 경보: 'bad' };

export function AlertsPage() {
  const { data, error, loading, reload } = useAsync(getAlerts, []);

  return (
    <>
      <PageHead
        title="거래처 경보"
        sub="직접 거래하는 상대에게 생긴 경보만 보입니다. 그 너머의 기업, 등급, 대출 금액은 보이지 않습니다."
      />
      <div className="grid-4">
        {STAGES.map(([s, d, k]) => (
          <div key={s} className={`stage stage--${k}`}>
            <b>{s}</b>
            <span className="small muted">{d}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <Card
            title="현재 경보"
            right={<Pill tone={data.current.length ? 'bad' : 'ok'}>{data.current.length}곳</Pill>}
          >
            {data.current.length === 0 ? (
              <p className="empty">직접 거래처에 생긴 경보가 없습니다.</p>
            ) : (
              <ul className="list">
                {data.current.map((a) => (
                  <li key={a.companyName} className="list__item">
                    <div className="list__main">
                      <div className="list__title">
                        {a.companyName} <Pill tone={TONE[a.stage]}>{a.stage}</Pill>
                      </div>
                      <p style={{ margin: '6px 0 2px', fontSize: 14 }}>
                        근거: {a.reasons.join(' · ')}
                      </p>
                      <div className="list__sub">나에게 미치는 영향: {a.impact}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="최근 해제된 경보">
            <ul className="list">
              {data.resolved.map((a) => (
                <li key={a.companyName} className="list__item">
                  <div className="list__main">
                    <div className="list__title">{a.companyName}</div>
                    <div className="list__sub">
                      {a.resolvedAt} 해제 · {a.reasons.join(' · ')}
                    </div>
                  </div>
                  <Pill tone="ok">관심 → 정상</Pill>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
      <Note>
        경보는 거래를 막지 않습니다. 진행 중인 발주의 납기와 대금 일정을 미리 점검해 주세요.
      </Note>
    </>
  );
}
