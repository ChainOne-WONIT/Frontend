import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getReviewApplications } from '../../../api/bank';
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
import { won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { ReviewReasonWindow } from './ReviewReason';
import { GRADE_TONE, REVIEW_STATUS_LABEL } from './review-format';

const STATUS_TONE: Record<ReviewStatus, TTone> = {
  REVIEW: 'warn',
  KODIT_REVIEW: 'violet',
  APPROVED: 'ok',
  EXCLUDED: 'bad',
};
const gradeOf = (pd: number) => (pd < 4 ? '안정' : pd >= 8 ? '제외' : '관찰');

type Filter = {
  scope: '' | 'pending' | 'done';
  status: '' | ReviewStatus;
  from: string;
  to: string;
  name: string;
};
const EMPTY: Filter = { scope: '', status: '', from: '2026-08-01', to: '', name: '' };

/** [R0210] 한도 신청 심사 (단말형) */
export function ReviewApplicationsPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getReviewApplications, []);
  const [draft, setDraft] = useState<Filter>(EMPTY);
  const [filter, setFilter] = useState<Filter>(EMPTY);
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<ReviewApplication | null>(null);

  const match = (a: ReviewApplication) =>
    (!filter.status || a.status === filter.status) &&
    (!filter.from || a.appliedAt >= filter.from) &&
    (!filter.to || a.appliedAt <= filter.to) &&
    (!filter.name || a.companyName.includes(filter.name.trim()));
  const pending = filter.scope === 'done' ? [] : (data?.pending ?? []).filter(match);
  const done = filter.scope === 'pending' ? [] : (data?.done ?? []).filter(match);
  const all = [...pending, ...done];
  const sel = all.find((a) => a.id === selected) ?? pending[0];
  const count = (s: ReviewStatus) => all.filter((a) => a.status === s).length;

  const row = (a: ReviewApplication, i: number, result: boolean) => (
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
      {result ? (
        <td>
          {a.status === 'APPROVED' ? `${won(a.amount)} · 만료 ${a.expireAt}` : a.excludeReason}
        </td>
      ) : (
        <>
          <td className="r">{a.pd}%</td>
          <td className="c">
            <TTag tone={GRADE_TONE[gradeOf(a.pd)] as TTone}>{gradeOf(a.pd)}</TTag>
          </td>
        </>
      )}
      <td className="c">
        <TTag tone={STATUS_TONE[a.status]}>{REVIEW_STATUS_LABEL[a.status]}</TTag>
      </td>
      <td className="act">
        <button type="button" className="tb tb--sm" onClick={() => setTarget(a)}>
          상세
        </button>
      </td>
    </tr>
  );

  return (
    <>
      <TTitle code="R0210" num="2100" title="한도 신청 심사" asOf={data?.asOf} />
      <TCond onSearch={() => (setFilter(draft), reload())} onReset={() => setDraft(EMPTY)}>
        <TField label="조회구분">
          <select
            className="tf"
            value={draft.scope}
            onChange={(e) => setDraft({ ...draft, scope: e.target.value as Filter['scope'] })}
          >
            <option value="">0:전체</option>
            <option value="pending">1:심사 대기</option>
            <option value="done">2:심사 완료</option>
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
        <TField label="상태">
          <select
            className="tf"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as Filter['status'] })}
          >
            <option value="">0:전체</option>
            {(Object.keys(REVIEW_STATUS_LABEL) as ReviewStatus[]).map((s, i) => (
              <option key={s} value={s}>
                {i + 1}:{REVIEW_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </TField>
        <TField label="신청기업">
          <input
            className="tf"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </TField>
      </TCond>
      <TWarn>
        협력사가 거래 상대별로 신청한 한도를 심사하고, 신용보증기금 승인 결과를 입력합니다. 상세는
        조회 사유를 입력한 뒤에 열립니다.
      </TWarn>

      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TSection title="심사 대기" right={`총 ${pending.length}건 · 행을 두 번 누르면 상세`} />
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
              {pending.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={9}>조건에 맞는 신청이 없습니다.</td>
                </tr>
              )}
              {pending.map((a, i) => row(a, i, false))}
            </tbody>
          </table>

          <TSection title="심사 완료" right={`${done.length}건`} />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>신청번호</th>
                <th>신청기업</th>
                <th>거래상대 (발주처)</th>
                <th>신청일</th>
                <th>결과</th>
                <th>상태</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {done.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={8}>조건에 맞는 신청이 없습니다.</td>
                </tr>
              )}
              {done.map((a, i) => row(a, i, true))}
            </tbody>
          </table>

          <TSection title="건수 요약" right="(단위: 건)" />
          <TKV
            rows={[
              [
                {
                  label: '심사 중',
                  value: count('REVIEW'),
                  right: true,
                  strong: true,
                  tone: 'warn',
                },
                { label: '신보 심사 중', value: count('KODIT_REVIEW'), right: true, strong: true },
                { label: '승인', value: count('APPROVED'), right: true, strong: true, tone: 'ok' },
                { label: '제외', value: count('EXCLUDED'), right: true, strong: true, tone: 'bad' },
              ],
            ]}
          />
          <p className="tt-note">
            ※ 상세 화면을 열려면 조회 사유를 골라야 합니다. 조회 기록은 처리·조회 기록에 남습니다.
          </p>

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
                  downloadCsv('한도신청심사.csv', [
                    ['신청번호', '신청기업', '거래상대', '신청일', '예측부실확률', '상태'],
                    ...all.map((a) => [
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
