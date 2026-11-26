import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCompanyDetail, searchCompanies } from '../../api/corp';
import type { CompanyPublicInfo } from '../../api/types';
import { Icon } from '../../components/Icon';
import { ErrorBox, KeyValue, Loading } from '../../components/ui';
import { useAsync } from '../../lib/useAsync';
import './company-search.css';

/** 설립일로 업력(년) */
function yearsSince(date: string) {
  const d = new Date(date + 'T00:00:00');
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) y -= 1;
  return Math.max(0, y);
}

/**
 * 기업 검색 창: 이름·업종·사업자등록번호로 찾고, 기업을 누르면 공개된 기본 정보를 보여 줍니다.
 * [발주 등록하기]를 누르면 그 기업을 받는 기업으로 고른 채 발주 등록 화면으로 갑니다.
 */
export function CompanySearchModal({
  onClose,
  onOrder,
}: {
  onClose: () => void;
  onOrder: (c: CompanyPublicInfo) => void;
}) {
  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const list = useAsync(() => searchCompanies(submitted), [submitted]);

  return createPortal(
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={boxRef}
        className="modal__box cs"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="cs__head">
          {pickedId && (
            <button type="button" className="cs__back" onClick={() => setPickedId(null)}>
              <Icon name="arrowLeft" size={16} />
              검색 결과
            </button>
          )}
          <h2 id={titleId} className="modal__title">
            {pickedId ? '기업 정보' : '기업 검색'}
          </h2>
          <span className="spacer" />
          <button type="button" className="cs__close" aria-label="닫기" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {pickedId ? (
          <CompanyDetail id={pickedId} onOrder={onOrder} />
        ) : (
          <>
            <form
              className="cs__search"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(query);
              }}
            >
              <label className="cs__input">
                <Icon name="search" size={18} />
                <span className="sr-only">기업 검색어</span>
                <input
                  className="input"
                  autoFocus
                  placeholder="기업명, 업종, 사업자등록번호로 검색"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSubmitted(e.target.value);
                  }}
                />
              </label>
              <button className="btn btn--primary">검색</button>
            </form>
            <p className="small muted cs__hint">체인원에 가입한 회원 기업만 나옵니다.</p>

            <div
              className={`cs__list${list.loading ? ' is-loading' : ''}`}
              aria-live="polite"
              aria-busy={list.loading}
            >
              {list.loading && !list.data ? (
                <Loading label="찾는 중입니다" />
              ) : list.error ? (
                <ErrorBox error={list.error} onRetry={list.reload} />
              ) : list.data && list.data.length === 0 ? (
                <p className="empty">검색어와 맞는 기업이 없습니다.</p>
              ) : (
                <ul className="list">
                  {list.data?.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="cs__item" onClick={() => setPickedId(c.id)}>
                        <span className="cs__avatar" aria-hidden="true">
                          {c.name.slice(0, 1)}
                        </span>
                        <span className="list__main">
                          <span className="list__title">{c.name}</span>
                          <span className="list__sub">
                            {c.industry} · {c.address.split(' ').slice(0, 2).join(' ')} · {c.bizNo}
                          </span>
                        </span>
                        <Icon name="chevronRight" size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function CompanyDetail({ id, onOrder }: { id: string; onOrder: (c: CompanyPublicInfo) => void }) {
  const { data: c, error, loading, reload } = useAsync(() => getCompanyDetail(id), [id]);
  if (loading && !c) return <Loading />;
  if (error || !c)
    return <ErrorBox error={error ?? new Error('정보가 없습니다.')} onRetry={reload} />;

  return (
    <div className="cs__detail">
      <div className="cs__profile">
        <span className="cs__avatar cs__avatar--lg" aria-hidden="true">
          {c.name.slice(0, 1)}
        </span>
        <div>
          <b className="cs__name">{c.name}</b>
          <span className="small muted">
            {c.industry} · 업력 {yearsSince(c.establishedOn)}년
          </span>
        </div>
      </div>

      <KeyValue
        rows={[
          ['대표자', c.ceoName],
          ['업종', c.industry],
          ['사업자등록번호', c.bizNo],
          ['설립일', `${c.establishedOn} (업력 ${yearsSince(c.establishedOn)}년)`],
          ['주소', c.address],
          ['대표 전화', c.phone],
          [
            '홈페이지',
            c.url ? (
              <a key="u" href={`https://${c.url}`} target="_blank" rel="noreferrer noopener">
                {c.url}
              </a>
            ) : (
              '—'
            ),
          ],
          [
            '우리 회사와의 거래',
            c.myOrders.received + c.myOrders.sent
              ? `받은 발주 ${c.myOrders.received}건 · 낸 발주 ${c.myOrders.sent}건`
              : '아직 거래가 없습니다',
          ],
        ]}
      />

      <button type="button" className="btn btn--primary btn--block" onClick={() => onOrder(c)}>
        <Icon name="plus" size={18} />
        {c.name}에 발주 등록하기
      </button>
    </div>
  );
}
