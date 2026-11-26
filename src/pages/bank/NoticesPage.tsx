import { useState } from 'react';
import { getBankNotices } from '../../api/notices';
import type { BankNotices } from '../../api/types';
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
  type TTone,
} from '../../components/terminal';
import { TERMINAL_ROLES } from '../../layouts/terminal-config';
import { useAuth } from '../../lib/auth-context';
import { useAsync } from '../../lib/useAsync';
import './notices.css';

type Kind = BankNotices['notices'][number]['kind'];
const KIND_TONE: Record<Kind, TTone> = { 공지: 'blue', 규정: 'violet', 점검: 'warn', 안내: 'gray' };
const PREFIX = { review: 'R', loan: 'L', ops: 'O' } as const;

/** [R/L/O0900] 공지·규정 (단말형): 역할별 공지와 업무 규정 */
export function NoticesPage() {
  const { user } = useAuth();
  const role = user?.type === 'bank' ? user.role : 'review';
  const conf = TERMINAL_ROLES[role];
  const { data, error, loading, reload } = useAsync(() => getBankNotices(conf.name), [conf.name]);

  const [draft, setDraft] = useState<{ kind: '' | Kind; q: string }>({ kind: '', q: '' });
  const [filter, setFilter] = useState(draft);
  const [selected, setSelected] = useState<string | null>(null);

  const q = filter.q.trim();
  const has = (texts: string[]) => !q || texts.some((t) => t.includes(q));
  const notices = (data?.notices ?? []).filter(
    (n) => (!filter.kind || n.kind === filter.kind) && has([n.title, ...n.body]),
  );
  const rules = (data?.rules ?? []).filter((r) => has([r.title, ...r.body]));
  const sel = notices.find((n) => n.id === selected) ?? notices[0];

  return (
    <>
      <TTitle code={`${PREFIX[role]}0900`} num="9100" title="공지·규정" asOf={data?.asOf} />
      <TCond
        onSearch={() => {
          setFilter(draft);
          reload();
        }}
        onReset={() => setDraft({ kind: '', q: '' })}
      >
        <TField label="구분">
          <select
            className="tf"
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as '' | Kind })}
          >
            <option value="">전체</option>
            <option value="공지">공지</option>
            <option value="규정">규정</option>
            <option value="점검">점검</option>
            <option value="안내">안내</option>
          </select>
        </TField>
        <TField label="검색어">
          <input
            className="tf"
            placeholder="제목·내용에서 찾기"
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          />
        </TField>
      </TCond>

      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <>
          <TSection
            title="공지사항"
            right={`${conf.name} 담당에게 보이는 공지 ${notices.length}건 · 행을 누르면 아래에 내용`}
          />
          <table className="tt-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>구분</th>
                <th>제목</th>
                <th>대상</th>
                <th>게시일</th>
                <th>게시자</th>
              </tr>
            </thead>
            <tbody>
              {notices.length === 0 && (
                <tr className="tt-empty">
                  <td colSpan={6}>조건에 맞는 공지가 없습니다.</td>
                </tr>
              )}
              {notices.map((n, i) => (
                <tr
                  key={n.id}
                  className={`is-link${sel?.id === n.id ? ' is-hl' : ''}`}
                  onClick={() => setSelected(n.id)}
                >
                  <td className="c">{i + 1}</td>
                  <td className="c">
                    <TTag tone={KIND_TONE[n.kind]}>{n.kind}</TTag>
                  </td>
                  <td>
                    <b>{n.title}</b>
                  </td>
                  <td className="c">{n.audience.length === 3 ? '전체' : n.audience.join('·')}</td>
                  <td className="c">{n.postedAt}</td>
                  <td>{n.author}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {sel && (
            <>
              <TSection title="공지 내용" right={sel.id} />
              <TKV
                labelWidth={90}
                rows={[
                  [
                    { label: '제목', value: sel.title, strong: true },
                    { label: '구분', value: <TTag tone={KIND_TONE[sel.kind]}>{sel.kind}</TTag> },
                  ],
                  [
                    { label: '게시', value: `${sel.postedAt} · ${sel.author}` },
                    {
                      label: '대상',
                      value: sel.audience.length === 3 ? '전체' : sel.audience.join(' · '),
                    },
                  ],
                ]}
              />
              <div className="nt-body">
                {sel.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </>
          )}

          <TSection
            title="체인원 공급망 생산자금 업무 규정"
            right={`2026-11-23 시행 · ${rules.length}개 조항${q ? ` (검색어 "${q}")` : ''}`}
          />
          <div className="nt-toc" aria-label="조항 바로가기">
            {rules.map((r) => (
              <a key={r.no} href={`#rule-${r.no}`}>
                제{r.no}조 {r.title}
              </a>
            ))}
          </div>
          <div className="nt-rules">
            {rules.length === 0 && <p className="tt-state">검색어와 맞는 조항이 없습니다.</p>}
            {rules.map((r) => (
              <section key={r.no} id={`rule-${r.no}`} className="nt-rule">
                <h3>
                  제{r.no}조 ({r.title})
                </h3>
                {r.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </section>
            ))}
          </div>
          <p className="tt-note">
            ※ 규정에 나오는 기준값(등급 기준, 건별 한도 비율, 경보 가중치·단계)은 운영 담당의
            설정값을 따릅니다.
          </p>

          <TFKeys
            keys={[{ label: '인쇄', fkey: 'F9', kind: 'primary', onClick: () => window.print() }]}
          />
        </>
      )}
    </>
  );
}
