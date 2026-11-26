import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getOpsDashboard } from '../../../api/ops';
import type { SignupApplication } from '../../../api/types';
import {
  TError,
  TFKeys,
  TKV,
  TLoading,
  TSection,
  TTag,
  TTitle,
  TWarn,
} from '../../../components/terminal';
import { useAsync } from '../../../lib/useAsync';
import { SignupReasonWindow } from './OpsReason';

const eok = (n: number) => (n / 1e8).toFixed(1);

/** [O0100] 운영 대시보드 (단말형) */
export function OpsDashboardPage() {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useAsync(getOpsDashboard, []);
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<SignupApplication | null>(null);
  const sel = data?.pendingSignups.find((s) => s.id === selected) ?? data?.pendingSignups[0];

  return (
    <>
      <TTitle
        code="O0100"
        num="1100"
        title="운영 대시보드 (운영역)"
        asOf={data?.asOf}
        right={
          <button type="button" className="tb" onClick={() => navigate('/bank/ops/logs')}>
            처리 기록
          </button>
        }
      />
      <TWarn>
        가입 신청 상세는 조회 사유를 입력한 뒤에 열리며, 모든 조회와 설정 변경은 처리·조회 기록에
        남습니다.
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
                  label: '가입 승인 대기',
                  value: `${data.counts.signupPending}건`,
                  right: true,
                  strong: true,
                  tone: 'warn',
                },
                {
                  label: '심사 대기',
                  value: `${data.counts.reviewPending}건`,
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
                  label: '경보 기업',
                  value: `${data.counts.alertCompanies}곳`,
                  right: true,
                  strong: true,
                  tone: 'bad',
                },
              ],
              [
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
                {
                  label: '대출 잔액 합계',
                  value: eok(data.product.loanBalanceSum),
                  right: true,
                  strong: true,
                },
                {
                  label: '잔여 보증 여력',
                  value: eok(data.product.guaranteeTotal - data.product.approvedLimitSum),
                  right: true,
                  strong: true,
                },
              ],
            ]}
          />

          <TSection
            title="가입 승인 대기"
            right={`총 ${data.pendingSignups.length}건 · 행을 두 번 누르면 상세(조회 사유 입력)`}
          />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>신청번호</th>
                <th>기업명</th>
                <th>업종</th>
                <th>신청일</th>
                <th>선택 동의</th>
                <th>상태</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {data.pendingSignups.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={8}>승인을 기다리는 가입 신청이 없습니다.</td>
                </tr>
              )}
              {data.pendingSignups.map((s, i) => (
                <tr
                  key={s.id}
                  className={`is-link${sel?.id === s.id ? ' is-hl' : ''}`}
                  onClick={() => setSelected(s.id)}
                  onDoubleClick={() => setTarget(s)}
                >
                  <td className="c">{i + 1}</td>
                  <td className="c">{s.id}</td>
                  <td>
                    <b>{s.companyName}</b>
                  </td>
                  <td>{s.industry}</td>
                  <td className="c">{s.appliedAt}</td>
                  <td>
                    금융{' '}
                    <TTag tone={s.consents.financialInfo ? 'ok' : 'gray'}>
                      {s.consents.financialInfo ? '동의' : '미동의'}
                    </TTag>{' '}
                    신용{' '}
                    <TTag tone={s.consents.creditInfo ? 'ok' : 'gray'}>
                      {s.consents.creditInfo ? '동의' : '미동의'}
                    </TTag>
                  </td>
                  <td className="c">
                    <TTag tone="warn">승인 대기</TTag>
                  </td>
                  <td className="act">
                    <button type="button" className="tb tb--sm" onClick={() => setTarget(s)}>
                      상세
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <TSection title="최근 처리 기록" right="모든 역할 · 최근 순" />
          <table className="tt-table">
            <thead>
              <tr>
                <th>일시</th>
                <th>처리자</th>
                <th>구분</th>
                <th>내용</th>
                <th>대상</th>
              </tr>
            </thead>
            <tbody>
              {data.recentLogs.map((l) => (
                <tr key={l.id}>
                  <td className="c">{l.at.slice(5)}</td>
                  <td>{l.actor}</td>
                  <td className="c">
                    <TTag tone={l.kind === '조회' ? 'blue' : 'ok'}>{l.kind}</TTag>
                  </td>
                  <td>{l.content}</td>
                  <td>{l.target}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <TFKeys
            keys={[
              { label: '설정값 관리', fkey: 'F5', onClick: () => navigate('/bank/ops/settings') },
              { label: '처리·조회 기록', fkey: 'F6', onClick: () => navigate('/bank/ops/logs') },
              {
                label: '가입 승인',
                fkey: 'F4',
                kind: 'primary',
                onClick: () => navigate('/bank/ops/signups'),
              },
            ]}
          />
        </>
      )}

      {target && <SignupReasonWindow app={target} onClose={() => setTarget(null)} />}
    </>
  );
}
