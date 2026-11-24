import type { ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Icon } from '../components/Icon';
import { Logo } from '../components/ui';
import { useAuth } from '../lib/auth-context';
import './CorpLayout.css';

const MENU = [
  { to: '/corp', label: '홈', end: true },
  { to: '/corp/orders', label: '발주' },
  { to: '/corp/fund', label: '생산자금' },
  { to: '/corp/alerts', label: '경보' },
  { to: '/corp/me', label: '내 정보' },
];

const TITLES: [RegExp, string][] = [
  [/^\/corp\/orders\/new/, '발주 등록'],
  [/^\/corp\/orders\/.+/, '발주 상세'],
  [/^\/corp\/orders/, '발주'],
  [/^\/corp\/fund/, '생산자금'],
  [/^\/corp\/alerts/, '경보'],
  [/^\/corp\/me/, '내 정보'],
  [/^\/corp/, '홈'],
];

export function CorpLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? '';

  const logout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="corp">
      <aside className="side">
        <Logo size={44} subtitle="공급망 생산자금 플랫폼" />
        <div className="side__ws">
          <span className="small muted">기업 워크스페이스</span>
          <b>{user?.companyName}</b>
        </div>
        <nav className="side__menu" aria-label="기업 메뉴">
          {MENU.map((m) => (
            <NavLink key={m.to} to={m.to} end={m.end} className="side__item">
              {m.label}
            </NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <div className="side__msg">
          <b>이어진 만큼 든든하게</b>
          <p className="small muted">
            우리 기업의 오늘을 확인하고
            <br />
            다음 발주를 준비하세요.
          </p>
        </div>
        <button type="button" className="side__logout" onClick={logout}>
          <Icon name="logout" size={18} />
          로그아웃
        </button>
      </aside>

      <div className="corp__main">
        <header className="topbar">
          <b className="topbar__title">{title}</b>
          <span className="spacer" />
          <span className="small muted">최근 접속 2026.11.23 09:30</span>
          <span className="topbar__sep" />
          <span className="topbar__bell" aria-label="알림 3건">
            <Icon name="bell" size={20} />
            <span className="topbar__count">3</span>
          </span>
          <span className="topbar__user">
            <span className="topbar__avatar">{user?.companyName.slice(0, 1)}</span>
            <span>
              <b>{user?.companyName}</b>
              <span className="small muted">{user?.userName}</span>
            </span>
          </span>
        </header>
        <main className="corp__body">
          <Outlet />
          <footer className="corp__foot">© Chain-One</footer>
        </main>
      </div>
    </div>
  );
}

export function PageHead({
  title,
  sub,
  right,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {right && <div className="page-head__right">{right}</div>}
    </div>
  );
}
