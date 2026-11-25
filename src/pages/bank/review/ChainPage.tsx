import { Fragment, useId, useState } from 'react';
import { getChains } from '../../../api/bank';
import type { AlertStage, Chain, ChainQuery } from '../../../api/types';
import { Icon } from '../../../components/Icon';
import { Card, ErrorBox, Loading, Note, StatusPill } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { dot, won } from '../../../lib/format';
import { useAsync } from '../../../lib/useAsync';
import { STAGE_KEY } from './review-format';
import './review.css';

const STAGES: AlertStage[] = ['정상', '관심', '주의', '경보'];
type Tier = NonNullable<ChainQuery['tier']>;
const TIERS: ('전체' | Tier)[] = ['전체', '1차', '2차', '3차'];

/** 심사 05 · 발주 체인 조회: 기업을 검색하면 그 기업이 들어 있는 체인을 모두 보여 줍니다. */
export function ChainPage() {
  const [company, setCompany] = useState<string | undefined>();
  const [tier, setTier] = useState<'전체' | Tier>('전체');
  const query: ChainQuery = { company, tier: tier === '전체' ? undefined : tier };
  const { data, error, loading, reload } = useAsync(() => getChains(query), [company, tier]);

  const chains = data?.chains ?? [];
  const orderTotal = chains.reduce((s, c) => s + c.orderTotal, 0);
  const loanBalance = chains.reduce((s, c) => s + c.loanBalance, 0);
  // 여러 체인에 같은 발주가 들어 있을 수 있어 발주 번호로 한 번만 보여 줍니다.
  const rows = [...new Map(chains.flatMap((c) => c.rows).map((r) => [r.orderId, r])).values()];

  return (
    <>
      <PageHead
        title="발주 체인"
        sub="수락된 발주를 회사끼리 이어 자동으로 만든 체인입니다. 심사와 여신 담당만 전체를 봅니다."
        right={data && <span className="small muted">{dot(data.asOf)} 기준</span>}
      />

      {error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <div className="rv-kpis">
            <div className="card kpi">
              <div className="kpi__head">
                {company ? '검색한 기업이 들어 있는 체인' : '전체 체인'}
              </div>
              <div className="kpi__value">
                <b>{chains.length}개</b>
              </div>
            </div>
            <div className="card kpi">
              <div className="kpi__head">시작 기업의 발주 합계</div>
              <div className="kpi__value">
                <b>{won(orderTotal)}</b>
              </div>
            </div>
            <div className="card kpi">
              <div className="kpi__head">체인 안 대출 잔액 합계</div>
              <div className="kpi__value">
                <b>{won(loanBalance)}</b>
                {orderTotal > 0 && (
                  <span className="small muted">
                    발주 대비 {Math.round((loanBalance / orderTotal) * 100)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <Card
            title="발주 체인"
            right={
              <div className="rv-picker">
                <span className="small muted">기업</span>
                <select
                  className="input rv-select rv-select--tier"
                  aria-label="구분"
                  value={tier}
                  onChange={(e) => setTier(e.target.value as typeof tier)}
                >
                  {TIERS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <CompanySearch
                  companies={data.companies}
                  selected={company}
                  onSelect={setCompany}
                />
              </div>
            }
          >
            <p className="small muted rv-chaincap">
              {company
                ? `검색한 기업: ${company} · ${tier === '전체' ? '' : `${tier}로 `}들어 있는 체인 ${chains.length}개`
                : `전체 체인 ${chains.length}개 · 기업을 검색하면 그 기업이 들어 있는 체인만 보입니다.`}
            </p>
            <div className={`rv-chains${loading ? ' is-loading' : ''}`}>
              {chains.length === 0 ? (
                <p className="empty">
                  {company} 기업이 {tier}로 들어 있는 체인이 없습니다.
                </p>
              ) : (
                chains.map((c) => <ChainMap key={c.id} chain={c} focus={company} />)
              )}
            </div>
            <div className="rv-legend">
              {STAGES.map((s) => (
                <span key={s} className={`rv-legend__item rv-legend__item--${STAGE_KEY[s]}`}>
                  {s}
                </span>
              ))}
              {company && <span className="rv-legend__focus">검색한 기업</span>}
            </div>
            <Note>
              테두리 색이 경보 단계입니다. 대출 합계가 시작 기업의 발주보다 커져도 막지 않고, 이
              지표로 지켜봅니다.
            </Note>
          </Card>

          <Card title="체인 안의 발주와 대출">
            {rows.length === 0 ? (
              <p className="empty">보여 줄 발주가 없습니다.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>발주</th>
                    <th>내는 기업 → 받는 기업</th>
                    <th>발주금액</th>
                    <th>발주 상태</th>
                    <th>연결 대출</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.orderId}
                      className={
                        company && (r.from === company || r.to === company)
                          ? 'rv-row-focus'
                          : undefined
                      }
                    >
                      <td>
                        <b>{r.orderId}</b>
                      </td>
                      <td>
                        {r.from} → {r.to}
                      </td>
                      <td className="num">{won(r.amount)}</td>
                      <td>
                        <StatusPill status={r.status} />
                      </td>
                      <td className={r.loan?.statusLabel === '연체' ? 'rv-overdue' : undefined}>
                        {r.loan
                          ? `${r.loan.id} · ${won(r.loan.amount)} · ${r.loan.statusLabel}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </>
  );
}

/** 체인 하나: 기업 상자와 발주 번호 연결고리. 검색한 기업은 크게 강조하고 나머지는 흐리게. */
function ChainMap({ chain: c, focus }: { chain: Chain; focus?: string }) {
  const hasFocus = !!focus && c.nodes.some((n) => n.name === focus);
  return (
    <section className="rv-chain">
      <div className="rv-chain__head">
        <b>{c.rootName}에서 시작하는 체인</b>
        <span className="small muted">
          {c.id} · 발주 {won(c.orderTotal)} · 대출 잔액 {won(c.loanBalance)}
        </span>
      </div>
      <div className={`rv-chainmap${hasFocus ? ' has-focus' : ''}`}>
        {c.nodes.map((n, i) => {
          const isFocus = n.name === focus;
          return (
            <Fragment key={n.name}>
              {i > 0 && (
                <div className="rv-link">
                  <b>{c.links[i - 1]?.orderId}</b>
                  <span className="rv-link__arrow" aria-hidden="true" />
                </div>
              )}
              <div
                className={`rv-node rv-node--${STAGE_KEY[n.stage]}${isFocus ? ' is-focus' : ''}`}
                aria-current={isFocus || undefined}
              >
                {isFocus && (
                  <span className="rv-node__badge">
                    <Icon name="search" size={12} strokeWidth={2.5} />
                    검색한 기업 · {n.tier}
                  </span>
                )}
                <b>{n.name}</b>
                <span>
                  {n.tier} · {n.stage}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}

/** 기업 이름 검색. 목록에는 기업 이름만 한 번씩 나옵니다. */
function CompanySearch({
  companies,
  selected,
  onSelect,
}: {
  companies: string[];
  selected?: string;
  onSelect: (name: string | undefined) => void;
}) {
  const [query, setQuery] = useState(selected ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const q = query.trim();
  const matches = companies.filter((c) => !q || c.includes(q));

  const choose = (name: string) => {
    onSelect(name);
    setQuery(name);
    setOpen(false);
  };
  const clear = () => {
    onSelect(undefined);
    setQuery('');
  };

  return (
    <div className="rv-search">
      <Icon name="search" size={16} />
      <input
        className="input"
        role="combobox"
        aria-label="기업 이름 검색"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="기업 이름 검색"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
          if (!e.target.value.trim()) onSelect(undefined);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && open && matches[active]) {
            e.preventDefault();
            choose(matches[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {query && (
        <button type="button" className="rv-search__clear" aria-label="검색 지우기" onClick={clear}>
          <Icon name="close" size={14} />
        </button>
      )}
      {open && (
        <ul className="rv-search__list" id={listId} role="listbox">
          {matches.length === 0 ? (
            <li className="rv-search__empty">맞는 기업이 없습니다.</li>
          ) : (
            matches.map((name, i) => (
              <li
                key={name}
                role="option"
                aria-selected={selected === name}
                className={i === active ? 'is-active' : undefined}
                // 입력 칸에서 초점이 빠져 목록이 닫히기 전에 고르도록 mousedown에서 처리합니다.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(name);
                }}
                onMouseEnter={() => setActive(i)}
              >
                {name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
