import { useState } from 'react';
import { getCompanyReviews, updateCompanyReview } from '../../../api/bank';
import type { CompanyReviewInfo, CompanyReviewOverview } from '../../../api/types';
import { Modal } from '../../../components/Modal';
import { Card, Checkbox, ErrorBox, Loading, Pill } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { dot } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { eok, GRADE_TONE } from './review-format';
import './review.css';

const FLAGS: [
  keyof Pick<CompanyReviewInfo, 'overdue' | 'taxArrears' | 'closed' | 'bankruptcy'>,
  string,
][] = [
  ['overdue', '현재 연체'],
  ['taxArrears', '세금 체납'],
  ['closed', '휴·폐업'],
  ['bankruptcy', '부도·회생'],
];

/** 심사 04 · 기업 심사 정보 관리 */
export function CompanyReviewPage() {
  const { data, error, loading, reload, setData } = useAsync(getCompanyReviews, []);
  const [editing, setEditing] = useState<CompanyReviewInfo | null>(null);

  return (
    <>
      <PageHead
        title="기업 심사 정보 관리"
        sub="실제 서비스라면 신용정보원, 국세청 조회로 채워지는 값입니다. 데모에서는 가상 데이터를 넣어 두고 여기서 고칩니다."
        right={data && <span className="small muted">{dot(data.asOf)} 기준</span>}
      />

      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <Card
            title="기업별 심사 정보"
            right={<span className="small muted">수정하면 기록이 남습니다</span>}
          >
            <ul className="list">
              {data.companies.map((c) => (
                <li key={c.id} className="list__item">
                  <div className="list__main">
                    <div className="list__title">
                      {c.name} <Pill tone={GRADE_TONE[c.grade]}>{c.grade}</Pill>
                    </div>
                    <div className="list__sub">
                      업력 {c.years}년 · 매출 {eok(c.revenue)} · 부채비율 {c.debtRatio}% · 예측
                      부실확률 {c.pd}%
                    </div>
                  </div>
                  <div className="rv-flags">
                    {FLAGS.map(([k, label]) => (
                      <span key={k} className={`rv-flag${c[k] ? ' rv-flag--bad' : ''}`}>
                        {label}: {c[k] ? '있음' : '없음'}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => setEditing(c)}
                  >
                    수정
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="최근 수정 기록">
            {data.logs.length === 0 ? (
              <p className="empty">수정 기록이 없습니다.</p>
            ) : (
              <ul className="list">
                {data.logs.map((l, i) => (
                  <li key={i} className="list__item rv-log">
                    <span className="num muted">{l.date}</span>
                    <span className="muted">{l.actor}</span>
                    <b>{l.text}</b>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {editing && (
        <EditModal
          company={editing}
          onClose={() => setEditing(null)}
          onSaved={(d) => {
            setData(d);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function EditModal({
  company: c,
  onClose,
  onSaved,
}: {
  company: CompanyReviewInfo;
  onClose: () => void;
  onSaved: (d: CompanyReviewOverview) => void;
}) {
  const [years, setYears] = useState(String(c.years));
  const [revenue, setRevenue] = useState(String(Math.round(c.revenue / 1e8)));
  const [debtRatio, setDebtRatio] = useState(String(c.debtRatio));
  const [flags, setFlags] = useState({
    overdue: c.overdue,
    taxArrears: c.taxArrears,
    closed: c.closed,
    bankruptcy: c.bankruptcy,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const nums = [Number(years), Number(revenue), Number(debtRatio)];
    if (
      nums.some((n) => !Number.isFinite(n) || n < 0) ||
      [years, revenue, debtRatio].some((v) => v.trim() === '')
    ) {
      setError('업력, 매출, 부채비율은 0 이상의 숫자로 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onSaved(
        await updateCompanyReview(c.id, {
          years: nums[0],
          revenue: Math.round(nums[1] * 1e8),
          debtRatio: nums[2],
          ...flags,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`${c.name} 심사 정보 수정`}
      desc="바꾼 내용은 최근 수정 기록에 남습니다."
      onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--outline" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="btn btn--primary" disabled={busy} onClick={save}>
            {busy ? '저장 중…' : '저장'}
          </button>
        </>
      }
    >
      <div className="form-grid rv-edit">
        <label className="field">
          <span className="field__label">업력 (년)</span>
          <input
            className="input"
            type="number"
            min="0"
            value={years}
            onChange={(e) => setYears(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">매출 (억 원)</span>
          <input
            className="input"
            type="number"
            min="0"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
          />
        </label>
        <label className="field form-grid__full">
          <span className="field__label">부채비율 (%)</span>
          <input
            className="input"
            type="number"
            min="0"
            value={debtRatio}
            onChange={(e) => setDebtRatio(e.target.value)}
          />
        </label>
        <div className="form-grid__full rv-edit__flags">
          {FLAGS.map(([k, label]) => (
            <Checkbox
              key={k}
              checked={flags[k]}
              onChange={(v) => setFlags((f) => ({ ...f, [k]: v }))}
            >
              {label} 있음
            </Checkbox>
          ))}
        </div>
      </div>
      {error && (
        <p className="field__error rv-gap" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
