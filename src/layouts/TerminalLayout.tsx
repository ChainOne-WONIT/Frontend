import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { getBankMessages, getMyActivity } from '../api/bank';
import { Icon, type IconName } from '../components/Icon';
import { TWindow } from '../components/terminal';
import { CalculatorPanel, MemoPanel } from '../components/TerminalTools';
import { useAuth } from '../lib/auth-context';
import { pressFKey } from '../lib/useFKeys';
import { DATA_CHANGED, useAsync } from '../lib/useAsync';
import './TerminalLayout.css';

/** 심사 단말의 화면 목록: 화면 번호 · 이름 · 주소 */
const REVIEW_SCREENS = [
  { code: 'R0100', title: '대시보드', path: '/bank/review', match: /^\/bank\/review\/?$/ },
  {
    code: 'R0220',
    title: '심사 상세',
    path: '/bank/review/applications',
    match: /^\/bank\/review\/applications\/.+/,
  },
  {
    code: 'R0210',
    title: '한도 신청 심사',
    path: '/bank/review/applications',
    match: /^\/bank\/review\/applications\/?$/,
  },
  {
    code: 'R0310',
    title: '기업 심사 정보',
    path: '/bank/review/companies',
    match: /^\/bank\/review\/companies/,
  },
  {
    code: 'R0400',
    title: '발주 체인 조회',
    path: '/bank/review/chain',
    match: /^\/bank\/review\/chain/,
  },
] as const;

type Tab = { code: string; title: string; path: string };

type ToolAct = 'search' | 'print' | 'memo' | 'calc';
const TOOLS: { label: string; act: ToolAct; hint: string }[] = [
  { label: '조회', act: 'search', hint: '지금 화면을 다시 조회합니다 (F2)' },
  { label: '인쇄', act: 'print', hint: '지금 화면을 인쇄합니다' },
  { label: '메모', act: 'memo', hint: '메모 창을 엽니다' },
  { label: '계산기', act: 'calc', hint: '계산기 창을 엽니다' },
];

/** 왼쪽 아이콘 줄: 심사 업무 바로가기와 단말 기능 */
const RAIL_LINKS: { label: string; to: string; icon: IconName; end?: boolean; hint: string }[] = [
  { label: '업무', to: '/bank/review', icon: 'grid', end: true, hint: '심사 대시보드' },
  {
    label: '심사',
    to: '/bank/review/applications',
    icon: 'clipboardCheck',
    hint: '한도 신청 심사 (F4)',
  },
  { label: '기업', to: '/bank/review/companies', icon: 'idCard', hint: '기업 심사 정보 (F5)' },
  { label: '체인', to: '/bank/review/chain', icon: 'link', hint: '발주 체인 조회 (F6)' },
];

const HELP: [string, string][] = [
  ['F2', '조회 (툴바 [조회]와 같음)'],
  ['F3', '목록으로 (심사 상세)'],
  ['F4', '상세 조회 / 한도 신청 심사'],
  ['F5', '기업 심사 정보'],
  ['F6', '발주 체인 조회'],
  ['F7', '통과로 확정 · 신보 승인 저장 · 수정 저장'],
  ['F8', '제외로 확정 · 신보 거절 저장'],
  ['F9', '엑셀(CSV) 저장'],
  ['Enter / Esc', '조회 사유 창 확인 / 닫기'],
];

/** 메뉴 트리. to가 없는 항목은 이 화면에서 쓰지 않는(권한 밖) 메뉴입니다. */
const TREE: {
  label: string;
  depth: number;
  to?: string;
  end?: boolean;
  group?: boolean;
  match?: RegExp;
}[] = [
  { label: '심사 업무', depth: 0, group: true },
  { label: '대시보드', depth: 1, to: '/bank/review', end: true },
  { label: '한도 신청 심사', depth: 1, to: '/bank/review/applications', end: true },
  { label: '심사 상세 (조회 사유)', depth: 2, match: /^\/bank\/review\/applications\/.+/ },
  { label: '신보 승인 결과 입력', depth: 2, match: /^\/bank\/review\/applications\/.+/ },
  { label: '기업 정보', depth: 0, group: true },
  { label: '기업 심사 정보', depth: 1, to: '/bank/review/companies' },
  { label: '수정 이력 조회', depth: 2, match: /^\/bank\/review\/companies/ },
  { label: '체인', depth: 0, group: true },
  { label: '발주 체인 조회', depth: 1, to: '/bank/review/chain' },
  { label: '체인 대출 현황', depth: 2, match: /^\/bank\/review\/chain/ },
  { label: '여신 연계', depth: 0, group: true },
  { label: '처리·조회 기록', depth: 0, group: true },
  { label: '공지·규정', depth: 0, group: true },
];

/** '심사 상세 조회 (사유: 한도 심사)' → 제목 '심사 상세 조회', 자세히 '사유: 한도 심사' */
function activityTitle(content: string) {
  return content.replace(/\s*\(.*\)$/, '').split(':')[0];
}
function activityDetail(content: string) {
  const paren = content.match(/\((.*)\)$/)?.[1];
  const colon = content
    .replace(/\s*\(.*\)$/, '')
    .split(':')
    .slice(1)
    .join(':')
    .trim();
  return [colon, paren].filter(Boolean).join(' · ');
}

function screenOf(pathname: string) {
  return REVIEW_SCREENS.find((s) => s.match.test(pathname)) ?? REVIEW_SCREENS[0];
}

function clock() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 은행 영업점 단말 느낌의 심사 화면 틀 */
export function TerminalLayout() {
  const { user: authUser, loginAt, signOut } = useAuth();
  const user = authUser?.type === 'bank' ? authUser : null;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = screenOf(pathname);

  // 열어 둔 화면 탭: 화면에 들어가면 탭이 생기고, ×로 닫습니다.
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [seenPath, setSeenPath] = useState<string | null>(null);
  // 주소가 바뀐 때에만 렌더 중에 탭 목록을 맞춥니다 (effect 안에서 상태를 바꾸지 않음).
  // 탭을 닫는 순간에는 주소가 아직 그대로라서, 닫은 탭이 다시 생기지 않습니다.
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setTabs((prev) =>
      prev.some((t) => t.code === current.code)
        ? prev.map((t) => (t.code === current.code ? { ...t, path: pathname } : t))
        : [...prev, { code: current.code, title: current.title, path: pathname }],
    );
  }

  const closeTab = (code: string) => {
    const rest = tabs.filter((t) => t.code !== code);
    if (rest.length === 0) return; // 마지막 화면은 닫지 않습니다
    setTabs(rest);
    if (code === current.code) navigate(rest.at(-1)?.path ?? '/bank/review');
  };

  const [now, setNow] = useState(clock);
  useEffect(() => {
    const t = setInterval(() => setNow(clock()), 30_000);
    return () => clearInterval(t);
  }, []);

  const msgs = useAsync(getBankMessages, [pathname]);
  // 로그인한 뒤 내가 한 처리·조회. 화면을 옮길 때마다 새로 불러옵니다.
  const since = loginAt ?? clock().slice(0, 10) + ' 00:00';
  const activity = useAsync(
    () => getMyActivity(user?.employeeNo ?? '', since),
    [pathname, since, user?.employeeNo],
  );
  const [panel, setPanel] = useState<'msgs' | 'mine'>('msgs');
  // 처리(확정·저장 등)를 하면 처리 기록과 알림을 바로 새로 불러옵니다.
  const reloadActivity = activity.reload;
  const reloadMsgs = msgs.reload;
  useEffect(() => {
    const on = () => {
      reloadActivity();
      reloadMsgs();
    };
    window.addEventListener(DATA_CHANGED, on);
    return () => window.removeEventListener(DATA_CHANGED, on);
  }, [reloadActivity, reloadMsgs]);

  const logout = async () => {
    await signOut();
    navigate('/login?type=bank', { replace: true });
  };

  const [memoOpen, setMemoOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [msgsOpen, setMsgsOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const tool = (act: ToolAct) => {
    // 조회: 대시보드로 가고, 이미 대시보드면 다시 조회합니다.
    if (act === 'search') {
      if (current.code === 'R0100') pressFKey('F2');
      else navigate('/bank/review');
    }
    if (act === 'print') window.print();
    if (act === 'memo') setMemoOpen((v) => !v);
    if (act === 'calc') setCalcOpen((v) => !v);
  };
  const pressed = (act: ToolAct) =>
    act === 'memo' ? memoOpen : act === 'calc' ? calcOpen : undefined;

  return (
    <div className={`tm${msgsOpen ? '' : ' tm--nomsgs'}`}>
      <header className="tm-top">
        <Link to="/bank/review" className="tm-logo">
          <span className="tm-logo__mark" aria-hidden="true">
            <i />
            <i />
          </span>
          Chain-One 심사단말
        </Link>
        <div className="tm-tools">
          {TOOLS.map((t) => (
            <button
              key={t.label}
              type="button"
              className={`tm-tool${pressed(t.act) ? ' is-on' : ''}`}
              title={t.hint}
              aria-pressed={pressed(t.act)}
              onClick={() => tool(t.act)}
            >
              <span className="tm-tool__icon" aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>
        <span className="tm-spacer" />
        <nav className="tm-topmenu">
          <button
            type="button"
            className={msgsOpen && panel === 'mine' ? 'is-on' : undefined}
            onClick={() => {
              setPanel('mine');
              setMsgsOpen(true);
            }}
          >
            처리 기록 <b className="tm-badge tm-badge--blue">{activity.data?.items.length ?? 0}</b>
          </button>
          <button
            type="button"
            className={msgsOpen && panel === 'msgs' ? 'is-on' : undefined}
            onClick={() => {
              setPanel('msgs');
              setMsgsOpen(true);
            }}
          >
            알림 <b className="tm-badge">{msgs.data?.messages.length ?? 0}</b>
          </button>
          <button type="button" onClick={logout}>
            로그아웃
          </button>
        </nav>
      </header>

      <nav className="tm-rail" aria-label="바로가기">
        {RAIL_LINKS.map((r) => (
          <NavLink key={r.to} to={r.to} end={r.end} className="tm-rail__item" title={r.hint}>
            <Icon name={r.icon} size={16} />
            {r.label}
          </NavLink>
        ))}
        <span className="tm-rail__sep" />
        <button
          type="button"
          className={`tm-rail__item${msgsOpen ? ' is-on' : ''}`}
          title="오른쪽 알림메시지 보기/숨기기"
          aria-pressed={msgsOpen}
          onClick={() => setMsgsOpen((v) => !v)}
        >
          <Icon name="bell" size={16} />
          알림
        </button>
        <button
          type="button"
          className="tm-rail__item"
          title="기능키·화면 사용법"
          onClick={() => setHelpOpen(true)}
        >
          <Icon name="info" size={16} />
          도움말
        </button>
        <span className="tm-spacer" />
        <button type="button" className="tm-rail__item" title="로그아웃" onClick={logout}>
          <Icon name="logout" size={16} />
          종료
        </button>
      </nav>

      <nav className="tm-tree" aria-label="심사 메뉴">
        <div className="tm-tree__tabs">
          <span className="is-on">기본메뉴</span>
          <span>나의메뉴</span>
        </div>
        <div className="tm-tree__group">심사</div>
        <ul>
          {TREE.map((t) =>
            t.to ? (
              <li key={t.label} style={{ paddingLeft: 6 + t.depth * 14 }}>
                <NavLink to={t.to} end={t.end} className="tm-tree__link">
                  · {t.label}
                </NavLink>
              </li>
            ) : (
              <li
                key={t.label}
                style={{ paddingLeft: 6 + t.depth * 14 }}
                className={`${t.group ? 'tm-tree__head' : 'tm-tree__sub'}${t.match?.test(pathname) ? ' is-on' : ''}`}
              >
                {t.group ? `▾ ${t.label}` : `· ${t.label}`}
              </li>
            ),
          )}
        </ul>
      </nav>

      <main className="tm-main">
        <div className="tm-crumb">★ 나의메뉴 &gt; 심사 &gt; {current.title}</div>
        <div className="tm-tabs" role="tablist" aria-label="열어 둔 화면">
          {tabs.map((t) => (
            <span
              key={t.code}
              role="tab"
              aria-selected={t.code === current.code}
              className={`tm-tab${t.code === current.code ? ' is-on' : ''}`}
            >
              <Link to={t.path} title={t.title}>
                {t.code}
              </Link>
              <button type="button" aria-label={`${t.title} 닫기`} onClick={() => closeTab(t.code)}>
                ×
              </button>
            </span>
          ))}
        </div>
        <section className="tm-screen">
          <Outlet />
        </section>
      </main>

      {msgsOpen && (
        <aside className="tm-msgs" aria-label="알림메시지">
          <div className="tm-msgs__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={panel === 'msgs'}
              className={panel === 'msgs' ? 'is-on' : undefined}
              onClick={() => setPanel('msgs')}
            >
              알림메시지
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={panel === 'mine'}
              className={panel === 'mine' ? 'is-on' : undefined}
              onClick={() => setPanel('mine')}
            >
              내 처리 기록
            </button>
          </div>
          {panel === 'msgs' ? (
            <ul>
              {msgs.data?.messages.map((m, i) => (
                <li key={i}>
                  <span>
                    <em>{m.at}</em> <b>{m.title}</b>
                  </span>
                  <small>{m.detail}</small>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="tm-msgs__since">
                로그인 {since.slice(11)} 이후 · {activity.data?.items.length ?? 0}건
              </p>
              {activity.data && activity.data.items.length === 0 ? (
                <p className="tm-msgs__empty">
                  로그인한 뒤 처리하거나 조회한 내용이 아직 없습니다.
                </p>
              ) : (
                <ul>
                  {activity.data?.items.map((l) => (
                    <li key={l.id}>
                      <span>
                        <em>{l.at.slice(11)}</em>{' '}
                        <i className={`tm-kind tm-kind--${l.kind === '조회' ? 'view' : 'act'}`}>
                          {l.kind}
                        </i>{' '}
                        <b>{activityTitle(l.content)}</b>
                      </span>
                      <small>
                        {l.target}
                        {activityDetail(l.content) && ` · ${activityDetail(l.content)}`}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </aside>
      )}

      {helpOpen && (
        <TWindow
          title="도움말 · 기능키"
          onClose={() => setHelpOpen(false)}
          actions={
            <button type="button" className="tb tb--primary" onClick={() => setHelpOpen(false)}>
              닫기[Esc]
            </button>
          }
        >
          <table className="tt-table">
            <thead>
              <tr>
                <th>키</th>
                <th>동작</th>
              </tr>
            </thead>
            <tbody>
              {HELP.map(([k, v]) => (
                <tr key={k}>
                  <td className="c">
                    <b>{k}</b>
                  </td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="tt-note">
            ※ 표의 행은 한 번 누르면 선택, 두 번 누르면 상세(조회 사유 입력)로 갑니다. 상세 조회는
            모두 처리·조회 기록에 남습니다.
          </p>
        </TWindow>
      )}
      {memoOpen && (
        <MemoPanel owner={user?.employeeNo ?? 'guest'} onClose={() => setMemoOpen(false)} />
      )}
      {calcOpen && <CalculatorPanel onClose={() => setCalcOpen(false)} />}

      <footer className="tm-status">
        <span className="tm-status__ok">● 온라인</span>
        <span>내부망 접속</span>
        <span>조회 기록 저장 중</span>
        <span className="tm-spacer" />
        <span>심사부</span>
        <span>사번 {user?.employeeNo}</span>
        <b>
          {user?.name} ({user?.roleLabel})
        </b>
        <span>{now}</span>
      </footer>
    </div>
  );
}
