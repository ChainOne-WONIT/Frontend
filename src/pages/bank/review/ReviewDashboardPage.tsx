import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getReviewDashboard } from '../../../api/bank';
import type { ReviewApplication, ReviewStatus } from '../../../api/types';
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
  type TTone,
} from '../../../components/terminal';
import { downloadCsv } from '../../../lib/csv';
import { useAsync } from '../../../lib/useAsync';
import { ReviewReasonWindow } from './ReviewReason';
import { GRADE_TONE, REVIEW_STATUS_LABEL } from './review-format';

const eok = (n: number) => (n / 1e8).toFixed(1);
const STATUS_TONE = {
  REVIEW: 'warn',
  KODIT_REVIEW: 'violet',
  APPROVED: 'ok',
  EXCLUDED: 'bad',
} as const;
const gradeOf = (pd: number) => (pd < 4 ? '안정' : pd >= 8 ? '제외' : '관찰');

type Filter = { kind: '' | ReviewStatus; from: string; to: string; name: string };
const EMPTY: Filter = { kind: '', from: '2026-11-01', to: '', name: '' };

/** [R0100] 심사 대시보드 (단말형) */
export function ReviewDashboardPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getReviewDashboard, [], {
    refreshOnChange: true,
  });
  const [draft, setDraft] = useState<Filter>(EMPTY);
  const [filter, setFilter] = useState<Filter>(EMPTY);
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<ReviewApplication | null>(null);

  const list = (data?.today ?? []).filter(
    (a) =>
      (!filter.kind || a.status === filter.kind) &&
      (!filter.from || a.appliedAt >= filter.from) &&
      (!filter.to || a.appliedAt <= filter.to) &&
      (!filter.name || a.companyName.includes(filter.name.trim())),
  );
  const sel = list.find((a) => a.id === selected) ?? list[0];

  const search = () => {
    setFilter(draft);
    reload();
  };

  return (
    <>
      <TTitle
        code="R0100"
        num="1100"
        title="심사 대시보드 (심사역)"
        asOf={data?.asOf}
        right={
          <button
            type="button"
            className="tb"
            onClick={() => navigate('/bank/review/applications')}
          >
            전체 목록
          </button>
        }
      />
      <TCond onSearch={search} onReset={() => setDraft(EMPTY)}>
        <TField label="조회구분">
          <select
            className="tf"
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as Filter['kind'] })}
          >
            <option value="">전체</option>
            <option value="REVIEW">심사 중</option>
            <option value="KODIT_REVIEW">신보 심사 중</option>
          </select>
        </TField>
        <TField label="신청기간">
          <input
            className="tf"
            type="date"
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
          ~
          <input
            className="tf"
            type="date"
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
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
        상세 화면은 조회 사유를 입력한 뒤에 열리며, 모든 조회는 처리·조회 기록에 남습니다. 자동
        평가만으로 거절을 확정하지 않습니다.
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
                  label: '심사 대기',
                  value: `${data.counts.reviewPending}건`,
                  right: true,
                  strong: true,
                  tone: 'warn',
                },
                {
                  label: '신보 심사 중',
                  value: `${data.koditPending}건`,
                  right: true,
                  strong: true,
                },
                {
                  label: '승인 대기 대출',
                  value: `${data.counts.loanPending}건`,
                  right: true,
                  strong: true,
                },
                {
                  label: '경보 기업 (관심 이상)',
                  value: `${data.counts.alertCompanies}곳`,
                  right: true,
                  strong: true,
                  tone: 'bad',
                },
              ],
              [
                {
                  label: '가입 승인 대기',
                  value: `${data.counts.signupPending}건`,
                  right: true,
                  strong: true,
                },
                { label: '오늘 처리', value: `${data.todayDone}건`, right: true, strong: true },
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
            title="심사 대기 목록"
            right={`총 ${list.length}건 · 행을 두 번 누르면 상세(조회 사유 입력)`}
          />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>신청번호</th>
                <th>신청기업</th>
                <th>거래상대 (발주처)</th>
                <th>신청일</th>
                <th>예측부실확률</th>
                <th>등급</th>
                <th>상태</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={9}>조건에 맞는 신청이 없습니다.</td>
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
                  <td className="c">{a.id}</td>
                  <td>{a.companyName}</td>
                  <td>{a.counterpartyName}</td>
                  <td className="c">{a.appliedAt}</td>
                  <td className="r">{a.pd}%</td>
                  <td className="c">
                    <TTag tone={GRADE_TONE[gradeOf(a.pd)] as TTone}>{gradeOf(a.pd)}</TTag>
                  </td>
                  <td className="c">
                    <TTag tone={STATUS_TONE[a.status]}>{REVIEW_STATUS_LABEL[a.status]}</TTag>
                  </td>
                  <td className="act">
                    <button type="button" className="tb tb--sm" onClick={() => setTarget(a)}>
                      상세
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <TSection
            title="경보 기업 (심사 참고)"
            right="여신 담당 경보와 연동 · 자동으로 한도를 줄이지 않음"
          />
          <table className="tt-table">
            <thead>
              <tr>
                <th>기업</th>
                <th>단계</th>
                <th>점수</th>
                <th>신호</th>
                <th>최근 조치</th>
                <th>진행 중 신청</th>
              </tr>
            </thead>
            <tbody>
              {data.alerts.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={6}>경보 기업이 없습니다.</td>
                </tr>
              )}
              {data.alerts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.companyName}</b>
                  </td>
                  <td className="c">
                    <TTag tone={a.stage === '관심' ? 'warn' : 'bad'}>{a.stage}</TTag>
                  </td>
                  <td className="r">{a.score}점</td>
                  <td>{a.signals.map((s) => `${s.label} +${s.points}`).join(' · ')}</td>
                  <td>{a.lastAction ?? '—'}</td>
                  <td className="c">{a.applicationId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="tt-halves">
            <div>
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
                      [
                        '잔여 보증 여력',
                        data.product.guaranteeTotal - data.product.approvedLimitSum,
                      ],
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
              <p className="tt-note">※ 누계 기준이라 기업이 상환해도 소진율은 내려가지 않습니다.</p>
            </div>
            <div>
              <TSection title="최근 처리 내역" right="이 담당자" />
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>일시</th>
                    <th>구분</th>
                    <th>내용</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentLogs.map((l) => (
                    <tr key={l.id}>
                      <td className="c">{l.at.slice(5)}</td>
                      <td className="c">{l.kind}</td>
                      <td>
                        {l.target} · {l.content}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <TFKeys
            keys={[
              {
                label: '기업 심사 정보',
                fkey: 'F5',
                onClick: () => navigate('/bank/review/companies'),
              },
              { label: '체인 조회', fkey: 'F6', onClick: () => navigate('/bank/review/chain') },
              {
                label: '엑셀 저장',
                fkey: 'F9',
                onClick: () =>
                  downloadCsv('심사대기목록.csv', [
                    ['신청번호', '신청기업', '거래상대', '신청일', '예측부실확률', '상태'],
                    ...list.map((a) => [
                      a.id,
                      a.companyName,
                      a.counterpartyName,
                      a.appliedAt,
                      `${a.pd}%`,
                      REVIEW_STATUS_LABEL[a.status],
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

      {target && <ReviewReasonWindow app={target} onClose={() => setTarget(null)} />}
    </>
  );
}
