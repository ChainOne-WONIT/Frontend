import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getCompanyReviews, updateCompanyReview } from '../../../api/bank';
import type { CompanyReviewInfo, CompanyReviewOverview, GradeLabel } from '../../../api/types';
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
  type TTone,
} from '../../../components/terminal';
import { downloadCsv } from '../../../lib/csv';
import { useAsync } from '../../../lib/useAsync';
import { useFKeys } from '../../../lib/useFKeys';
import { GRADE_TONE } from './review-format';

type FlagKey = 'overdue' | 'taxArrears' | 'closed' | 'bankruptcy';
const FLAGS: [FlagKey, string][] = [
  ['overdue', '현재 연체'],
  ['taxArrears', '세금 체납'],
  ['closed', '휴·폐업'],
  ['bankruptcy', '부도·회생'],
];

type Filter = { name: string; grade: '' | GradeLabel; flag: '' | FlagKey };
const EMPTY: Filter = { name: '', grade: '', flag: '' };

/** [R0310] 기업 심사 정보: 검색 + 기업별 심사 정보. [수정]을 누르면 수정 창이 뜹니다. */
export function CompanyReviewPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload, setData } = useAsync(getCompanyReviews, [], {
    refreshOnChange: true,
  });
  const [draft, setDraft] = useState<Filter>(EMPTY);
  const [filter, setFilter] = useState<Filter>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const list = (data?.companies ?? []).filter(
    (c) =>
      (!filter.name || c.name.includes(filter.name.trim())) &&
      (!filter.grade || c.grade === filter.grade) &&
      (!filter.flag || c[filter.flag]),
  );
  const editing = data?.companies.find((c) => c.id === editId) ?? null;
  const goLogs = () => navigate('/bank/review/companies/logs');

  return (
    <>
      <TTitle
        code="R0310"
        num="3100"
        title="기업 심사 정보"
        asOf={data?.asOf}
        right={
          <button type="button" className="tb" onClick={goLogs}>
            수정 이력 조회 ›
          </button>
        }
      />
      <TCond
        onSearch={() => {
          setFilter(draft);
          reload();
        }}
        onReset={() => {
          setDraft(EMPTY);
          setFilter(EMPTY);
        }}
      >
        <TField label="기업명">
          <input
            className="tf"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </TField>
        <TField label="등급">
          <select
            className="tf"
            value={draft.grade}
            onChange={(e) => setDraft({ ...draft, grade: e.target.value as Filter['grade'] })}
          >
            <option value="">전체</option>
            <option value="안정">안정</option>
            <option value="관찰">관찰</option>
            <option value="제외">제외</option>
          </select>
        </TField>
        <TField label="플래그">
          <select
            className="tf"
            value={draft.flag}
            onChange={(e) => setDraft({ ...draft, flag: e.target.value as Filter['flag'] })}
          >
            <option value="">전체</option>
            {FLAGS.map(([k, l]) => (
              <option key={k} value={k}>
                {l} 있음
              </option>
            ))}
          </select>
        </TField>
      </TCond>
      <TWarn>
        실제 서비스라면 신용정보원, 국세청 조회로 채워지는 값입니다. 데모에서는 가상 데이터를 넣어
        두고 여기서 고칩니다. 수정하면 기록이 남습니다.
      </TWarn>

      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TSection
            title="기업별 심사 정보"
            right={`총 ${list.length}개 기업 · [수정]을 누르면 수정 창이 열립니다`}
          />
          {saved && (
            <p className="tt-note tt-c--ok" role="status">
              ● {saved}
            </p>
          )}
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>기업명</th>
                <th>등급</th>
                <th>업력</th>
                <th>매출(억)</th>
                <th>부채비율</th>
                <th>예측부실확률</th>
                {FLAGS.map(([k, l]) => (
                  <th key={k}>{l}</th>
                ))}
                <th>수정</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={12}>조건에 맞는 기업이 없습니다.</td>
                </tr>
              )}
              {list.map((c, i) => (
                <tr key={c.id} className={editId === c.id ? 'is-hl' : undefined}>
                  <td className="c">{i + 1}</td>
                  <td>{c.name}</td>
                  <td className="c">
                    <TTag tone={GRADE_TONE[c.grade] as TTone}>{c.grade}</TTag>
                  </td>
                  <td className="r">{c.years}년</td>
                  <td className="r">{Math.round(c.revenue / 1e8).toLocaleString()}</td>
                  <td className="r">{c.debtRatio}%</td>
                  <td className="r">{c.pd}%</td>
                  {FLAGS.map(([k]) => (
                    <td key={k} className="c">
                      {c[k] ? <TTag tone="bad">있음</TTag> : <span className="tt-muted">없음</span>}
                    </td>
                  ))}
                  <td className="act">
                    <button
                      type="button"
                      className="tb tb--sm"
                      aria-label={`${c.name} 수정`}
                      onClick={() => {
                        setSaved(null);
                        setEditId(c.id);
                      }}
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {editing && (
            <EditWindow
              key={editing.id}
              company={editing}
              onClose={() => setEditId(null)}
              onSaved={(d) => {
                setData(d);
                setEditId(null);
                setSaved(`${editing.name} 심사 정보를 저장했습니다. 수정 이력에 남았습니다.`);
              }}
            />
          )}

          <TFKeys
            keys={[
              {
                label: '한도 신청 심사',
                fkey: 'F4',
                onClick: () => navigate('/bank/review/applications'),
              },
              { label: '체인 조회', fkey: 'F6', onClick: () => navigate('/bank/review/chain') },
              { label: '수정 이력 조회', fkey: 'F8', onClick: goLogs },
              {
                label: '엑셀 저장',
                fkey: 'F9',
                onClick: () =>
                  downloadCsv('기업심사정보.csv', [
                    [
                      '기업명',
                      '등급',
                      '업력',
                      '매출(억)',
                      '부채비율',
                      '예측부실확률',
                      ...FLAGS.map(([, l]) => l),
                    ],
                    ...list.map((c) => [
                      c.name,
                      c.grade,
                      c.years,
                      Math.round(c.revenue / 1e8),
                      `${c.debtRatio}%`,
                      `${c.pd}%`,
                      ...FLAGS.map(([k]) => (c[k] ? '있음' : '없음')),
                    ]),
                  ]),
              },
            ]}
          />
        </>
      )}
    </>
  );
}

/** [R0311] 선택 기업 수정 창: 화면 위에 떠서 고치고 저장합니다. Esc로 닫힙니다. */
function EditWindow({
  company: c,
  onSaved,
  onClose,
}: {
  company: CompanyReviewInfo;
  onSaved: (d: CompanyReviewOverview) => void;
  onClose: () => void;
}) {
  const [years, setYears] = useState(String(c.years));
  const [revenue, setRevenue] = useState(String(Math.round(c.revenue / 1e8)));
  const [debt, setDebt] = useState(String(c.debtRatio));
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>({
    overdue: c.overdue,
    taxArrears: c.taxArrears,
    closed: c.closed,
    bankruptcy: c.bankruptcy,
  });
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    const nums = [years, revenue, debt].map(Number);
    if (
      [years, revenue, debt].some((v) => v.trim() === '') ||
      nums.some((n) => !Number.isFinite(n) || n < 0)
    ) {
      setErr('업력, 매출, 부채비율은 0 이상의 숫자로 입력해 주세요.');
      return;
    }
    if (!reason.trim()) {
      setErr('수정 사유를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      onSaved(
        await updateCompanyReview(
          c.id,
          { years: nums[0], revenue: Math.round(nums[1] * 1e8), debtRatio: nums[2], ...flags },
          reason,
        ),
      );
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };
  useFKeys({ F7: save });

  const num = (v: string, set: (s: string) => void, unit: string, label: string) => (
    <>
      <input
        className="tf tf--req"
        type="number"
        min="0"
        aria-label={label}
        value={v}
        onChange={(e) => set(e.target.value)}
        style={{ width: 90 }}
      />
      <span className="tt-muted">{unit}</span>
    </>
  );

  return (
    <TWindow
      title="[R0311] 선택 기업 수정"
      width={620}
      onClose={onClose}
      actions={
        <>
          <button type="button" className="tb" onClick={onClose}>
            취소[Esc]
          </button>
          <button
            type="button"
            className="tb tb--primary"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? '저장 중…' : '저장[F7]'}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TSection title="대상 기업" />
        <TKV
          labelWidth={100}
          rows={[
            [
              { label: '기업명', value: c.name, strong: true },
              {
                label: '등급 · 부실확률',
                value: (
                  <>
                    <TTag tone={GRADE_TONE[c.grade] as TTone}>{c.grade}</TTag> {c.pd}%
                  </>
                ),
              },
            ],
          ]}
        />
        <TSection title="재무 정보" right="노란 칸은 수정할 수 있는 항목" />
        <TKV
          labelWidth={100}
          rows={[
            [
              { label: '업력', req: true, value: num(years, setYears, '년', '업력') },
              { label: '매출', req: true, value: num(revenue, setRevenue, '억원', '매출') },
            ],
            [{ label: '부채비율', req: true, value: num(debt, setDebt, '%', '부채비율') }],
          ]}
        />
        <TSection title="위험 플래그" />
        <TKV
          labelWidth={100}
          rows={[FLAGS.slice(0, 2), FLAGS.slice(2)].map((pair) =>
            pair.map(([k, l]) => ({
              label: l,
              value: (
                <span className="tt-radio" role="radiogroup" aria-label={l}>
                  {[true, false].map((v) => (
                    <label key={String(v)}>
                      <input
                        type="radio"
                        name={`${c.id}-${k}`}
                        checked={flags[k] === v}
                        onChange={() => setFlags((f) => ({ ...f, [k]: v }))}
                      />
                      {v ? '있음' : '없음'}
                    </label>
                  ))}
                </span>
              ),
            })),
          )}
        />
        <TKV
          labelWidth={100}
          rows={[
            [
              {
                label: '수정 사유',
                req: true,
                value: (
                  <input
                    className="tf tf--req"
                    aria-label="수정 사유"
                    placeholder="예: 국세청 체납 확인 (11-20)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{ width: '100%' }}
                  />
                ),
              },
            ],
          ]}
        />
        {err && (
          <p className="tt-warn" role="alert">
            ✕ {err}
          </p>
        )}
      </form>
    </TWindow>
  );
}
