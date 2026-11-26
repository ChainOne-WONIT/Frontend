import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getRiskAlerts } from '../../../api/loan';
import type { AlertStage, RiskAlert } from '../../../api/types';
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
import { useAsync } from '../../../lib/useAsync';
import { LoanReasonWindow } from './LoanReason';
import { STAGE_TONE } from './loan-format';

const WEIGHT_LABEL: [keyof RiskAlertsWeights, string][] = [
  ['payDelay', '지급 지연'],
  ['repayDelay', '상환 지연'],
  ['orderDrop', '발주 급감'],
  ['deliveryDelay', '납품 지연'],
  ['event', '이벤트 (체납·신용등급 하락)'],
];
type RiskAlertsWeights = {
  payDelay: number;
  repayDelay: number;
  orderDrop: number;
  deliveryDelay: number;
  event: number;
};

/** [L0310] 리스크 경보 (단말형) */
export function RiskAlertsPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getRiskAlerts, []);
  const [draft, setDraft] = useState<{ stage: '' | AlertStage; name: string }>({
    stage: '',
    name: '',
  });
  const [filter, setFilter] = useState(draft);
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<RiskAlert | null>(null);

  const list = (data?.alerts ?? []).filter(
    (a) =>
      (!filter.stage || a.stage === filter.stage) &&
      (!filter.name || a.companyName.includes(filter.name.trim())),
  );
  const sel = list.find((a) => a.id === selected) ?? list[0];

  return (
    <>
      <TTitle code="L0310" num="3100" title="리스크 경보" asOf={data?.asOf} />
      <TCond
        onSearch={() => {
          setFilter(draft);
          reload();
        }}
        onReset={() => setDraft({ stage: '', name: '' })}
      >
        <TField label="단계">
          <select
            className="tf"
            value={draft.stage}
            onChange={(e) => setDraft({ ...draft, stage: e.target.value as '' | AlertStage })}
          >
            <option value="">관심 이상 전체</option>
            <option value="관심">관심</option>
            <option value="주의">주의</option>
            <option value="경보">경보</option>
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
        {data
          ? `지급 지연 ${data.weights.payDelay}, 상환 지연 ${data.weights.repayDelay}, 발주 급감 ${data.weights.orderDrop}, 납품 지연 ${data.weights.deliveryDelay}, 이벤트 ${data.weights.event}점을 더해 단계를 정합니다. 부도·회생 신청·휴폐업은 바로 경보.`
          : '신호별 점수를 더해 경보 단계를 정합니다.'}
      </TWarn>

      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TSection title="경보 현황" right="(단위: 곳 · 건)" />
          <TKV
            rows={[
              [
                {
                  label: '경보 기업',
                  value: `${data.stats.alertCompanies}곳`,
                  right: true,
                  strong: true,
                  tone: 'bad',
                },
                {
                  label: '주의 이상',
                  value: `${data.stats.cautionOrAbove}곳`,
                  right: true,
                  strong: true,
                  tone: 'warn',
                },
                {
                  label: '이번 주 새 신호',
                  value: `${data.stats.newSignalsThisWeek}건`,
                  right: true,
                  strong: true,
                },
                {
                  label: '조치 완료',
                  value: `${data.stats.actionsDone}건`,
                  right: true,
                  strong: true,
                  tone: 'ok',
                },
              ],
            ]}
          />

          <TSection
            title="경보 기업"
            right={`총 ${list.length}곳 · 행을 두 번 누르면 상세(조회 사유 입력)`}
          />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>기업</th>
                <th>신호</th>
                <th>점수</th>
                <th>단계</th>
                <th>최근 조치</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={7}>조건에 맞는 경보 기업이 없습니다.</td>
                </tr>
              )}
              {list.map((a, i) => (
                <tr
                  key={a.id}
                  className={`is-link${sel?.id === a.id ? ' is-hl' : ''}`}
                  onClick={() => setSelected(a.id)}
                  onDoubleClick={() => setTarget(a)}
                >
                  <td className="c">{i + 1}</td>
                  <td>
                    <b>{a.companyName}</b>
                  </td>
                  <td>
                    {a.immediate && <TTag tone="bad">즉시 경보 · {a.immediate}</TTag>}{' '}
                    {a.signals.map((s) => s.label).join(' · ')}
                  </td>
                  <td className="r">{a.score}점</td>
                  <td className="c">
                    <TTag tone={STAGE_TONE[a.stage]}>{a.stage}</TTag>
                  </td>
                  <td>{a.actions[0] ? `${a.actions[0].type} · ${a.actions[0].at}` : '—'}</td>
                  <td className="act">
                    <button type="button" className="tb tb--sm" onClick={() => setTarget(a)}>
                      상세
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="tt-halves">
            <div>
              <TSection title="경보 단계 기준" right="운영 설정값" />
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>단계</th>
                    <th>기준</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="c">
                      <TTag tone="warn">관심</TTag>
                    </td>
                    <td>{data.stages.watch}점 이상</td>
                  </tr>
                  <tr>
                    <td className="c">
                      <TTag tone="bad">주의</TTag>
                    </td>
                    <td>{data.stages.caution}점 이상</td>
                  </tr>
                  <tr>
                    <td className="c">
                      <TTag tone="bad">경보</TTag>
                    </td>
                    <td>{data.stages.alert}점 이상</td>
                  </tr>
                  <tr>
                    <td className="c">
                      <TTag tone="bad">즉시 경보</TTag>
                    </td>
                    <td>부도 · 회생 신청 · 휴폐업</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <TSection title="신호별 가중치" right="운영 설정값 · (단위: 점)" />
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>신호</th>
                    <th>점수</th>
                  </tr>
                </thead>
                <tbody>
                  {WEIGHT_LABEL.map(([k, l]) => (
                    <tr key={k}>
                      <td>{l}</td>
                      <td className="r">{data.weights[k]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="tt-note">
            ※ 자동으로 한도를 줄이거나 대출을 막지 않습니다. 주의 표시는 대출 승인 화면에 따라
            나옵니다.
          </p>

          <TFKeys
            keys={[
              { label: '이벤트 등록', fkey: 'F6', onClick: () => navigate('/bank/loan/events') },
              {
                label: '엑셀 저장',
                fkey: 'F9',
                onClick: () =>
                  downloadCsv('리스크경보.csv', [
                    ['기업', '신호', '점수', '단계', '최근 조치'],
                    ...list.map((a) => [
                      a.companyName,
                      a.signals.map((s) => s.label).join('·'),
                      a.score,
                      a.stage,
                      a.actions[0]?.type ?? '',
                    ]),
                  ]),
              },
              {
                label: '경보 상세',
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
          to={`/bank/loan/alerts/${target.id}`}
          defaultReason="사후관리"
          target={[
            { label: '경보 기업', value: <b>{target.companyName}</b> },
            { label: '단계 · 점수', value: `${target.stage} · ${target.score}점` },
          ]}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}
