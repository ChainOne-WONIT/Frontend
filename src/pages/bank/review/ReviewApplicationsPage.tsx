import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getReviewApplications } from '../../../api/bank';
import type { ReviewApplication } from '../../../api/types';
import { ReasonModal } from '../../../components/Modal';
import { Card, ErrorBox, Loading, Note, Pill } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { dot, won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { REVIEW_STATUS_LABEL, REVIEW_STATUS_TONE } from './review-format';
import './review.css';

/** 심사 02 · 한도 신청 심사 */
export function ReviewApplicationsPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getReviewApplications, []);
  const [target, setTarget] = useState<ReviewApplication | null>(null);

  const detailButton = (a: ReviewApplication) => (
    <button type="button" className="btn btn--outline btn--sm" onClick={() => setTarget(a)}>
      상세
    </button>
  );

  return (
    <>
      <PageHead
        title="한도 신청 심사"
        sub="협력사가 거래 상대별로 신청한 한도를 심사하고, 신용보증기금 승인 결과를 입력합니다."
        right={data && <span className="small muted">{dot(data.asOf)} 기준</span>}
      />

      {loading ? (
        <Loading />
      ) : error || !data ? (
        <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <Card title="심사 대기" right={<Pill tone="warn">{data.pending.length}건</Pill>}>
            {data.pending.length === 0 ? (
              <p className="empty">심사할 신청이 없습니다.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>신청 기업</th>
                    <th>거래 상대 (발주처)</th>
                    <th>신청일</th>
                    <th>예측 부실확률</th>
                    <th>상태</th>
                    <th aria-label="상세" />
                  </tr>
                </thead>
                <tbody>
                  {data.pending.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <b>{a.companyName}</b>
                      </td>
                      <td>{a.counterpartyName} 거래용</td>
                      <td className="num">{a.appliedAt}</td>
                      <td className="num">{a.pd}%</td>
                      <td>
                        <Pill tone={REVIEW_STATUS_TONE[a.status]}>
                          {REVIEW_STATUS_LABEL[a.status]}
                        </Pill>
                      </td>
                      <td className="rv-cell-act">{detailButton(a)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="심사 완료">
            <table className="table">
              <thead>
                <tr>
                  <th>신청 기업</th>
                  <th>거래 상대 (발주처)</th>
                  <th>신청일</th>
                  <th>결과</th>
                  <th>상태</th>
                  <th aria-label="상세" />
                </tr>
              </thead>
              <tbody>
                {data.done.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <b>{a.companyName}</b>
                    </td>
                    <td>{a.counterpartyName} 거래용</td>
                    <td className="num">{a.appliedAt}</td>
                    <td>
                      {a.status === 'APPROVED'
                        ? `${won(a.amount)} · 만료 ${a.expireAt}`
                        : a.excludeReason}
                    </td>
                    <td>
                      <Pill tone={REVIEW_STATUS_TONE[a.status]}>
                        {REVIEW_STATUS_LABEL[a.status]}
                      </Pill>
                    </td>
                    <td className="rv-cell-act">{detailButton(a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Note>
            상세 화면을 열려면 조회 사유를 골라야 합니다. 조회 기록은 처리·조회 기록에 남습니다.
          </Note>
        </>
      )}

      {target && (
        <ReasonModal
          defaultReason={
            target.status === 'KODIT_REVIEW'
              ? '신보 승인 결과 입력'
              : target.status === 'REVIEW'
                ? '한도 심사'
                : '사후 점검'
          }
          onClose={() => setTarget(null)}
          onOpen={(reason) =>
            navigate(`/bank/review/applications/${target.id}`, { state: { reason } })
          }
        />
      )}
    </>
  );
}
