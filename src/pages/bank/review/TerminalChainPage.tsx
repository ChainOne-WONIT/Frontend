import { Fragment, useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { getChains } from '../../../api/bank';
import type { AlertStage, ChainQuery } from '../../../api/types';
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
import { flowLabel, STATUS_TONE, won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import './terminal-chain.css';

type Tier = NonNullable<ChainQuery['tier']>;
const STAGE_CLASS: Record<AlertStage, string> = {
  정상: 'ok',
  관심: 'watch',
  주의: 'caution',
  경보: 'alert',
};
const eok = (n: number) => (n / 1e8).toFixed(1);
const orderTone = (s: Parameters<typeof flowLabel>[0]): TTone => {
  const t = STATUS_TONE[s];
  return t === 'default' ? 'blue' : t === 'teal' ? 'ok' : (t as TTone);
};

/** [R0400] 발주 체인 조회 (단말형): 기업을 검색하면 그 기업이 들어 있는 체인을 모두 보여 줍니다. */
export function TerminalChainPage() {
  const navigate = useNavigate();
  const listId = useId();
  const [tierDraft, setTierDraft] = useState<'' | Tier>('');
  const [nameDraft, setNameDraft] = useState('');
  const [query, setQuery] = useState<ChainQuery>({});
  const { data, error, loading, reload } = useAsync(
    () => getChains(query),
    [query.company, query.tier],
  );

  const search = () => {
    const name = nameDraft.trim();
    setQuery({ company: name || undefined, tier: tierDraft || undefined });
    reload();
  };
  const reset = () => {
    setTierDraft('');
    setNameDraft('');
    setQuery({});
  };

  const chains = data?.chains ?? [];
  const orderTotal = chains.reduce((s, c) => s + c.orderTotal, 0);
  const loanBalance = chains.reduce((s, c) => s + c.loanBalance, 0);
  const rows = chains.flatMap((c) => c.rows.map((r) => ({ ...r, chainId: c.id })));
  const uniq = [...new Map(rows.map((r) => [r.orderId, r])).values()];
  const focus = query.company;
  const unknown = !!focus && !!data && !data.companies.includes(focus);

  return (
    <>
      <TTitle code="R0400" num="4100" title="발주 체인 조회" asOf={data?.asOf} />
      <TCond onSearch={search} onReset={reset}>
        <TField label="구분">
          <select
            className="tf"
            value={tierDraft}
            onChange={(e) => setTierDraft(e.target.value as '' | Tier)}
          >
            <option value="">0:전체</option>
            <option value="1차">1:1차</option>
            <option value="2차">2:2차</option>
            <option value="3차">3:3차</option>
          </select>
        </TField>
        <TField label="기업">
          <input
            className="tf tf--req"
            list={listId}
            placeholder="기업 이름 검색"
            aria-label="기업 이름 검색"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            style={{ width: 200 }}
          />
          <datalist id={listId}>
            {data?.companies.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </TField>
        <span className="tt-muted">
          {tierDraft
            ? `※ 검색한 기업이 ${tierDraft}로 들어 있는 체인만`
            : '※ 검색한 기업이 들어 있는 체인 모두'}
        </span>
      </TCond>
      <TWarn>
        수락된 발주를 회사끼리 이어 자동으로 만든 체인입니다. 심사와 여신 담당만 전체를 봅니다.
      </TWarn>

      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TSection title="조회 요약" right="(단위: 억원)" />
          <TKV
            rows={[
              [
                {
                  label: focus ? '조회된 체인' : '전체 체인',
                  value: `${chains.length}개`,
                  right: true,
                  strong: true,
                },
                { label: '시작 기업 발주 합계', value: eok(orderTotal), right: true, strong: true },
                { label: '체인 대출 잔액', value: eok(loanBalance), right: true, strong: true },
                {
                  label: '발주 대비 대출',
                  value: orderTotal ? `${Math.round((loanBalance / orderTotal) * 100)}%` : '—',
                  right: true,
                  strong: true,
                  tone: 'warn',
                },
              ],
            ]}
          />

          <TSection
            title="발주 체인"
            right={
              focus
                ? `◆ 노란 칸 = 검색한 기업 (${focus}) · 테두리 색 = 경보 단계`
                : '테두리 색 = 경보 단계 (정상 초록 · 관심 주황 · 주의 빨강)'
            }
          />
          <div className={`tc-grid${loading ? ' is-loading' : ''}`}>
            {unknown ? (
              <p className="tt-state">{focus} 기업을 찾을 수 없습니다. 목록에서 골라 주세요.</p>
            ) : chains.length === 0 ? (
              <p className="tt-state">
                {focus} 기업이 {query.tier}로 들어 있는 체인이 없습니다.
              </p>
            ) : (
              chains.map((c) => (
                <div key={c.id} className="tc-row">
                  <div className="tc-label">
                    <b>{c.id}</b>
                    <span>{c.rootName} 시작</span>
                    <small>
                      발주 {eok(c.orderTotal)} · 대출 {eok(c.loanBalance)}
                    </small>
                  </div>
                  <div className="tc-flow">
                    {c.nodes.map((n, i) => {
                      const isFocus = n.name === focus;
                      return (
                        <Fragment key={n.name}>
                          {i > 0 && (
                            <span className="tc-link">
                              <b>{c.links[i - 1]?.orderId}</b>
                              <span aria-hidden="true">────▶</span>
                            </span>
                          )}
                          <span
                            className={`tc-node tc-node--${STAGE_CLASS[n.stage]}${isFocus ? ' is-focus' : ''}`}
                            aria-current={isFocus || undefined}
                          >
                            <b>
                              {isFocus && '◆ '}
                              {n.name}
                            </b>
                            <small>
                              {n.tier === '시작 기업' ? '시작' : n.tier} · {n.stage}
                              {isFocus && ' · 검색 기업'}
                            </small>
                          </span>
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <TSection
            title="체인 안의 발주와 대출"
            right={focus ? '검색한 기업이 낸·받은 발주는 노란색' : `${uniq.length}건`}
          />
          <table className="tt-table">
            <thead>
              <tr>
                <th>발주</th>
                <th>체인</th>
                <th>내는 기업 → 받는 기업</th>
                <th>발주금액</th>
                <th>발주 상태</th>
                <th>연결 대출</th>
              </tr>
            </thead>
            <tbody>
              {uniq.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={6}>보여 줄 발주가 없습니다.</td>
                </tr>
              )}
              {uniq.map((r) => (
                <tr
                  key={r.orderId}
                  className={focus && (r.from === focus || r.to === focus) ? 'is-hl' : undefined}
                >
                  <td className="c">
                    <b>{r.orderId}</b>
                  </td>
                  <td className="c">{r.chainId}</td>
                  <td>
                    {r.from} → {r.to}
                  </td>
                  <td className="r">{won(r.amount)}</td>
                  <td className="c">
                    <TTag tone={orderTone(r.status)}>{flowLabel(r.status)}</TTag>
                  </td>
                  <td className={r.loan?.statusLabel === '연체' ? 'tt-c--bad' : undefined}>
                    {r.loan ? `${r.loan.id} · ${won(r.loan.amount)} · ${r.loan.statusLabel}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <TFKeys
            keys={[
              {
                label: '기업 심사 정보',
                fkey: 'F5',
                onClick: () => navigate('/bank/review/companies'),
              },
              {
                label: '한도 신청 심사',
                fkey: 'F4',
                onClick: () => navigate('/bank/review/applications'),
              },
              {
                label: '엑셀 저장',
                fkey: 'F9',
                onClick: () =>
                  downloadCsv('발주체인.csv', [
                    [
                      '발주',
                      '체인',
                      '내는 기업',
                      '받는 기업',
                      '발주금액',
                      '발주 상태',
                      '연결 대출',
                    ],
                    ...uniq.map((r) => [
                      r.orderId,
                      r.chainId,
                      r.from,
                      r.to,
                      r.amount,
                      flowLabel(r.status),
                      r.loan ? `${r.loan.id} ${r.loan.statusLabel}` : '',
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
