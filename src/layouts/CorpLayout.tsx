import type { ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import logoMark from '../assets/logo-mark.svg';
import { ChristmasArt } from '../components/ChristmasArt';
import { Icon, type IconName } from '../components/Icon';
import { useAuth } from '../lib/auth-context';
import './CorpLayout.css';

const MENU: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/corp', label: '홈', icon: 'home', end: true },
  { to: '/corp/orders', label: '발주', icon: 'doc' },
  { to: '/corp/fund', label: '생산자금', icon: 'bank' },
  { to: '/corp/alerts', label: '경보', icon: 'bell' },
  { to: '/corp/me', label: '내 정보', icon: 'user' },
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
  // 홈은 화면 위쪽을 큰 히어로가 채우므로 상단 바를 따로 그리지 않습니다.
  const isHome = pathname === '/corp' || pathname === '/corp/';

  const logout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className={`corp${isHome ? ' corp--home' : ''}`}>
      {/* 크리스마스 시즌 배경: 로그인 화면과 같은 그림과 눈. 시즌이 끝나면 이 줄만 지우면 됩니다. */}
      <ChristmasArt background className="corp__bg" />
      {!isHome && (
        <header className="topbar">
          <Link to="/corp" className="topbar__brand">
            <span className="topbar__logo">
              <img src={logoMark} alt="" width={28} height={22} />
            </span>
            Chain-One
          </Link>
          <span className="topbar__sep" />
          <b className="topbar__title">{title}</b>
          <span className="spacer" />
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
      )}
      <main className="corp__body">
        <Outlet />
        <footer className="corp__foot">© Chain-One</footer>
      </main>

      {/* 화면 아래 가운데에 떠 있는 메뉴 */}
      <nav className="dock" aria-label="기업 메뉴">
        {MENU.map((m) => (
          <NavLink key={m.to} to={m.to} end={m.end} className="dock__item">
            <Icon name={m.icon} size={20} />
            <span>{m.label}</span>
          </NavLink>
        ))}
        <span className="dock__sep" />
        <button type="button" className="dock__item" onClick={logout}>
          <Icon name="logout" size={20} />
          <span>로그아웃</span>
        </button>
      </nav>
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
