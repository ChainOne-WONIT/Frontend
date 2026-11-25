import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import logoMark from '../assets/logo-mark.svg';
import emblem from '../assets/woori-emblem.webp';
import type { BankRole } from '../api/types';
import { Icon, type IconName } from '../components/Icon';
import { useAuth } from '../lib/auth-context';
import { BANK_HOME } from '../lib/format';
import './CorpLayout.css';
import './BankLayout.css';

type Menu = { to: string; label: string; icon: IconName; end?: boolean }[];

/** 역할별 메뉴와 상단 바 제목. 여신 담당은 화면을 만들 때 여기에 더합니다. */
const ROLES: Partial<Record<BankRole, { home: string; menu: Menu; titles: [RegExp, string][] }>> = {
  review: {
    home: BANK_HOME.review!,
    menu: [
      { to: '/bank/review', label: '대시보드', icon: 'grid', end: true },
      { to: '/bank/review/applications', label: '심사', icon: 'clipboardCheck' },
      { to: '/bank/review/companies', label: '기업 심사 정보', icon: 'idCard' },
      { to: '/bank/review/chain', label: '체인 조회', icon: 'link' },
    ],
    titles: [
      [/^\/bank\/review\/applications\/.+/, '심사 상세'],
      [/^\/bank\/review\/applications/, '심사'],
      [/^\/bank\/review\/companies/, '기업 심사 정보'],
      [/^\/bank\/review\/chain/, '체인 조회'],
      [/^\/bank\/review/, '대시보드'],
    ],
  },
  ops: {
    home: BANK_HOME.ops!,
    menu: [
      { to: '/bank/ops', label: '대시보드', icon: 'grid', end: true },
      { to: '/bank/ops/signups', label: '가입 승인', icon: 'userCheck' },
      { to: '/bank/ops/settings', label: '설정값 관리', icon: 'sliders' },
      { to: '/bank/ops/logs', label: '처리·조회 기록', icon: 'history' },
    ],
    titles: [
      [/^\/bank\/ops\/signups\/.+/, '가입 신청 상세'],
      [/^\/bank\/ops\/signups/, '가입 승인'],
      [/^\/bank\/ops\/settings/, '설정값 관리'],
      [/^\/bank\/ops\/logs/, '처리·조회 기록'],
      [/^\/bank\/ops/, '대시보드'],
    ],
  },
};

/** 은행 백오피스 틀: 기업 화면과 같은 상단 바 + 아래 떠 있는 메뉴, 배경은 우리금융 엠블럼 */
export function BankLayout() {
  const { user: authUser, signOut } = useAuth();
  const user = authUser?.type === 'bank' ? authUser : null;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const conf = user ? ROLES[user.role] : undefined;
  const title = conf?.titles.find(([re]) => re.test(pathname))?.[1] ?? '';

  const logout = async () => {
    await signOut();
    navigate('/login?type=bank', { replace: true });
  };

  return (
    <div className="corp bank">
      <div className="bank__bg" aria-hidden="true">
        <span className="bank__emblem">
          <img src={emblem} alt="" />
        </span>
        <span className="bank__dim" />
      </div>
      <header className="topbar">
        <Link to={conf?.home ?? '/login?type=bank'} className="topbar__brand">
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
          <span className="topbar__avatar">{user?.name.slice(0, 1)}</span>
          <span>
            <b>{user?.name}</b>
            <span className="small muted">{user?.roleLabel}</span>
          </span>
        </span>
      </header>
      <main className="corp__body">
        <Outlet />
        <footer className="corp__foot">© Chain-One</footer>
      </main>

      <nav className="dock" aria-label={`${user?.roleLabel ?? '은행'} 메뉴`}>
        {(conf?.menu ?? []).map((m) => (
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
