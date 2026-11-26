import { Fragment, useId, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { getChains } from '../../../api/bank';
import type { AlertStage, Chain, ChainQuery } from '../../../api/types';
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
import { useAuth } from '../../../lib/auth-context';
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
/** "(A(주), B(주))" · "A(주), B(주)" → ['A(주)', 'B(주)']. 이름 안의 (주)는 그대로 둡니다. */
const parseNames = (s: string) => {
  let t = s.trim();
  if (t.startsWith('(') && t.endsWith(')') && t.includes(',')) t = t.slice(1, -1);
  return [
    ...new Set(
      t
        .split(/[,，]/)
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ];
};

type ChainItem = Chain;
type ChainRow = Chain['rows'][number];

/**
 * 발주 체인에서 네모 상자를 눌렀을 때 아래에 펼치는 정보.
 * 앞쪽(그 기업이 받은 발주)과 뒤쪽(그 기업이 낸 발주)을 나란히 보여 줍니다.
 * 중간 기업(예: 1차)이면 양쪽이 모두 채워지고, 시작 기업·끝 기업이면 한쪽만 채워집니다.
 */
function NodeDetail({
  chain,
  node,
  name,
  onClose,
}: {
  chain: ChainItem;
  node: ChainItem['nodes'][number];
  name: (n: string) => ReactNode;
  onClose: () => void;
}) {
  const received = chain.rows.filter((r) => r.to === node.name);
  const sent = chain.rows.filter((r) => r.from === node.name);
  const sum = (rs: ChainRow[]) => rs.reduce((s, r) => s + r.amount, 0);
  const loanSum = (rs: ChainRow[]) => rs.reduce((s, r) => s + (r.loan?.amount ?? 0), 0);
  const side = (title: string, rs: ChainRow[], other: 'from' | 'to', empty: string) => (
    <div className="tc-side">
      <div className="tc-side-head">
        <b>{title}</b>
        {rs.length > 0 && (
          <span>
            {rs.length}건 · 발주 {won(sum(rs))} · 대출 {won(loanSum(rs))}
          </span>
        )}
      </div>
      <table className="tt-table">
        <thead>
          <tr>
            <th>발주</th>
            <th>{other === 'from' ? '내는 기업' : '받는 기업'}</th>
            <th>발주금액</th>
            <th>발주 상태</th>
            <th>연결 대출</th>
          </tr>
        </thead>
        <tbody>
          {rs.length === 0 && (
            <tr className="tt-empty">
              <td colSpan={5}>{empty}</td>
            </tr>
          )}
          {rs.map((r) => (
            <tr key={r.orderId}>
              <td className="c">
                <b>{r.orderId}</b>
              </td>
              <td>{name(r[other])}</td>
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
    </div>
  );
  return (
    <div className="tc-detail" role="region" aria-label={`${node.name} 앞뒤 발주와 대출`}>
      <div className="tc-detail-head">
        <span>
          <b>{node.name}</b> · {chain.id} 안에서 {node.tier} · 경보 {node.stage}
        </span>
        <button type="button" className="tb" onClick={onClose}>
          닫기
        </button>
      </div>
      <div className="tc-sides">
        {side('받은 발주 (앞 기업에서)', received, 'from', '시작 기업이라 받은 발주가 없습니다.')}
        {side('낸 발주 (뒤 기업으로)', sent, 'to', '체인의 끝 기업이라 낸 발주가 없습니다.')}
      </div>
    </div>
  );
}

/** 체인 화면 종류: 발주 체인 그림만 / 체인 안의 발주와 대출 표만 / 둘 다 */
export type ChainPageView = 'chains' | 'loans' | 'both';

/**
 * 발주 체인 조회 (단말형): 기업을 검색하면 그 기업이 들어 있는 체인을 모두 보여 줍니다.
 * 심사는 [R0400] 발주 체인 조회(view="chains")와 [R0410] 체인 대출 현황(view="loans")으로 나눠 쓰고,
 * 여신은 [L0500] 한 화면(view="both")으로 씁니다.
 * 검색 조건은 주소(?company=&tier=)에 담아, 두 화면을 오가도 그대로 남습니다.
 */
export function TerminalChainPage({ view = 'both' }: { view?: ChainPageView }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoan = user?.type === 'bank' && user.role === 'loan';
  const keys = isLoan
    ? {
        code: 'L0500',
        num: '5100',
        title: '발주 체인 조회',
        f5: ['리스크 경보', '/bank/loan/alerts'],
        f4: ['생산자금 대출', '/bank/loan/loans'],
      }
    : view === 'loans'
      ? {
          code: 'R0410',
          num: '4200',
          title: '체인 대출 현황',
          f5: ['기업 심사 정보', '/bank/review/companies'],
          f4: ['한도 신청 심사', '/bank/review/applications'],
        }
      : {
          code: 'R0400',
          num: '4100',
          title: '발주 체인 조회',
          f5: ['기업 심사 정보', '/bank/review/companies'],
          f4: ['한도 신청 심사', '/bank/review/applications'],
        };
  // 짝이 되는 화면 (심사만): 발주 체인 조회 ↔ 체인 대출 현황
  const other =
    view === 'chains'
      ? { label: '체인 대출 현황', path: '/bank/review/chain-loans' }
      : view === 'loans'
        ? { label: '발주 체인 조회', path: '/bank/review/chain' }
        : null;

  const listId = useId();
  const [params, setParams] = useSearchParams();
  const tierParam = params.get('tier');
  const focusNames = params.getAll('company').flatMap(parseNames);
  const companyKey = focusNames.join('\n');
  const query: ChainQuery = {
    companies: focusNames.length ? focusNames : undefined,
    tier: tierParam === '1차' || tierParam === '2차' || tierParam === '3차' ? tierParam : undefined,
  };
  const [tierDraft, setTierDraft] = useState<'' | Tier>(query.tier ?? '');
  const [nameDraft, setNameDraft] = useState(focusNames.join(', '));
  /** 발주 체인에서 누른 네모 상자 (체인 번호 + 기업 이름). 다시 누르면 닫힙니다. */
  const [picked, setPicked] = useState<{ chainId: string; name: string } | null>(null);
  const pick = (chainId: string, name: string) =>
    setPicked((p) => (p?.chainId === chainId && p.name === name ? null : { chainId, name }));
  // 탭은 화면을 살려 두므로, 짝 화면 버튼처럼 다른 검색 조건을 들고 들어오면 입력 칸도 맞춥니다.
  const urlKey = `${companyKey}|${query.tier ?? ''}`;
  const [seenKey, setSeenKey] = useState(urlKey);
  if (urlKey !== seenKey) {
    setSeenKey(urlKey);
    setNameDraft(focusNames.join(', '));
    setTierDraft(query.tier ?? '');
    setPicked(null);
  }
  const { data, error, loading, reload } = useAsync(
    () => getChains(query),
    [companyKey, query.tier],
  );

  const search = () => {
    const next = new URLSearchParams();
    parseNames(nameDraft).forEach((n) => next.append('company', n));
    if (tierDraft) next.set('tier', tierDraft);
    setParams(next, { replace: true });
    reload();
  };
  const reset = () => {
    setTierDraft('');
    setNameDraft('');
    setParams(new URLSearchParams(), { replace: true });
  };
  const goOther = () => other && navigate(`${other.path}${params.toString() ? `?${params}` : ''}`);

  const chains = data?.chains ?? [];
  const orderTotal = chains.reduce((s, c) => s + c.orderTotal, 0);
  const loanBalance = chains.reduce((s, c) => s + c.loanBalance, 0);
  const rows = chains.flatMap((c) => c.rows.map((r) => ({ ...r, chainId: c.id })));
  const focusSet = new Set(focusNames);
  const focus = focusNames.length ? focusNames.join(', ') : undefined;
  /** 둘 이상 검색: 그 기업들끼리 주고받은 발주만 (A → B, B → A 모두) */
  const isPair = focusNames.length > 1;
  const isFocus = (n: string) => focusSet.has(n);
  const uniq = [...new Map(rows.map((r) => [r.orderId, r])).values()];
  const involves = (r: (typeof uniq)[number]) =>
    isPair ? isFocus(r.from) && isFocus(r.to) : isFocus(r.from) || isFocus(r.to);
  // 체인 대출 현황(심사)은 검색한 기업이 낸·받은 발주만 보여 줍니다. 한 화면(여신)은 전체를 두고 색으로 표시합니다.
  const onlyMine = view === 'loans' && !!focus;
  /** 검색한 기업 이름은 눈에 띄게 표시합니다 */
  const name = (n: string) =>
    isFocus(n) ? (
      <mark className="tc-hit" aria-label={`${n} (검색한 기업)`}>
        {n}
      </mark>
    ) : (
      n
    );
  const shown = onlyMine ? uniq.filter(involves) : uniq;
  const missing = data ? focusNames.filter((n) => !data.companies.includes(n)) : [];
  const unknown = missing.length > 0;

  return (
    <>
      <TTitle
        code={keys.code}
        num={keys.num}
        title={keys.title}
        asOf={data?.asOf}
        right={
          other && (
            <button type="button" className="tb" onClick={goOther}>
              {other.label} ›
            </button>
          )
        }
      />
      <TCond onSearch={search} onReset={reset}>
        <TField label="구분">
          <select
            className="tf"
            value={tierDraft}
            onChange={(e) => setTierDraft(e.target.value as '' | Tier)}
          >
            <option value="">전체</option>
            <option value="1차">1차</option>
            <option value="2차">2차</option>
            <option value="3차">3차</option>
          </select>
        </TField>
        <TField label="기업">
          <input
            className="tf tf--req"
            list={listId}
            placeholder="기업 이름 (여럿은 쉼표로)"
            aria-label="기업 이름 검색, 여러 기업은 쉼표로 구분"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            style={{ width: 260 }}
          />
          <datalist id={listId}>
            {data?.companies.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </TField>
        <span className="tt-muted">
          {parseNames(nameDraft).length > 1
            ? '※ 검색한 기업끼리 주고받은 발주 (양쪽 방향 모두)'
            : tierDraft
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

          {view !== 'loans' && (
            <>
              <TSection
                title="발주 체인"
                right={
                  focus
                    ? `노란 칸 = 검색한 기업 (${focus}) · 테두리 색 = 경보 단계`
                    : '테두리 색 = 경보 단계 (정상 초록 · 관심 주황 · 주의 빨강)'
                }
              />
              <div className={`tc-grid${loading ? ' is-loading' : ''}`}>
                {unknown ? (
                  <p className="tt-state">
                    {missing.join(', ')} 기업을 찾을 수 없습니다. 목록에서 골라 주세요.
                  </p>
                ) : chains.length === 0 ? (
                  <p className="tt-state">
                    {isPair
                      ? `${focus} 기업끼리 주고받은 발주가 있는 체인이 없습니다.`
                      : `${focus} 기업이 ${query.tier}로 들어 있는 체인이 없습니다.`}
                  </p>
                ) : (
                  chains.map((c) => {
                    const sel = picked?.chainId === c.id ? picked.name : null;
                    const selNode = sel ? c.nodes.find((n) => n.name === sel) : undefined;
                    return (
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
                            const hit = isFocus(n.name);
                            return (
                              <Fragment key={n.name}>
                                {i > 0 && (
                                  <span className="tc-link">
                                    <b>{c.links[i - 1]?.orderId}</b>
                                    <span aria-hidden="true">────▶</span>
                                  </span>
                                )}
                                <button
                                  type="button"
                                  className={`tc-node tc-node--${STAGE_CLASS[n.stage]}${hit ? ' is-focus' : ''}${sel === n.name ? ' is-picked' : ''}`}
                                  aria-current={hit || undefined}
                                  aria-expanded={sel === n.name}
                                  title="눌러서 앞뒤 발주와 대출 보기"
                                  onClick={() => pick(c.id, n.name)}
                                >
                                  <b>{n.name}</b>
                                  <small>
                                    {n.tier === '시작 기업' ? '시작' : n.tier} · {n.stage}
                                    {hit && ' · 검색 기업'}
                                  </small>
                                </button>
                              </Fragment>
                            );
                          })}
                        </div>
                        {selNode && (
                          <NodeDetail
                            chain={c}
                            node={selNode}
                            name={name}
                            onClose={() => setPicked(null)}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {view !== 'chains' && (
            <>
              <TSection
                title="체인 안의 발주와 대출"
                right={
                  onlyMine
                    ? isPair
                      ? `${focus} 기업끼리 주고받은 발주 ${shown.length}건 (양쪽 방향)`
                      : `${focus}이(가) 낸·받은 발주 ${shown.length}건`
                    : focus
                      ? isPair
                        ? '검색한 기업끼리 주고받은 발주는 노란색'
                        : '검색한 기업이 낸·받은 발주는 노란색'
                      : `${shown.length}건`
                }
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
                  {shown.length === 0 && (
                    <tr className="tt-empty">
                      <td colSpan={6}>보여 줄 발주가 없습니다.</td>
                    </tr>
                  )}
                  {shown.map((r) => (
                    <tr
                      key={r.orderId}
                      className={focus && !onlyMine && involves(r) ? 'is-hl' : undefined}
                    >
                      <td className="c">
                        <b>{r.orderId}</b>
                      </td>
                      <td className="c">{r.chainId}</td>
                      <td>
                        {name(r.from)} <span className="tc-arrow">→</span> {name(r.to)}
                        {focus && !isPair && involves(r) && (
                          <span className="tc-dir">
                            <TTag tone={isFocus(r.from) ? 'violet' : 'blue'}>
                              {isFocus(r.from) ? '낸 발주' : '받은 발주'}
                            </TTag>
                          </span>
                        )}
                      </td>
                      <td className="r">{won(r.amount)}</td>
                      <td className="c">
                        <TTag tone={orderTone(r.status)}>{flowLabel(r.status)}</TTag>
                      </td>
                      <td className={r.loan?.statusLabel === '연체' ? 'tt-c--bad' : undefined}>
                        {r.loan
                          ? `${r.loan.id} · ${won(r.loan.amount)} · ${r.loan.statusLabel}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <TFKeys
            keys={[
              { label: keys.f5[0], fkey: 'F5', onClick: () => navigate(keys.f5[1]) },
              { label: keys.f4[0], fkey: 'F4', onClick: () => navigate(keys.f4[1]) },
              ...(other ? [{ label: other.label, fkey: 'F6' as const, onClick: goOther }] : []),
              {
                label: '엑셀 저장',
                fkey: 'F9',
                onClick: () =>
                  downloadCsv(view === 'loans' ? '체인대출현황.csv' : '발주체인.csv', [
                    [
                      '발주',
                      '체인',
                      '내는 기업',
                      '받는 기업',
                      '발주금액',
                      '발주 상태',
                      '연결 대출',
                    ],
                    ...shown.map((r) => [
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
