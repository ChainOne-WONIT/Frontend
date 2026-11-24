import type { ReactNode } from 'react';
import logoMark from '../assets/logo-mark.svg';
import { ChristmasArt } from '../components/ChristmasArt';
import './AuthLayout.css';

/** 로그인 화면: 왼쪽 브랜드 패널 + 오른쪽 로그인 영역 */
export function AuthLayout({ top, children }: { top?: ReactNode; children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth__brand">
        <div className="auth__logo">
          <span className="auth__logo-box">
            <img src={logoMark} alt="" width={42} height={34} />
          </span>
          <div>
            <div className="auth__logo-name">Chain-One</div>
            <div className="auth__logo-sub">체인원 · 공급망 생산자금 플랫폼</div>
          </div>
        </div>
        <div className="auth__hero">
          {/* 크리스마스 시즌 그림. 시즌이 끝나면 characters.png 이미지로 되돌리면 됩니다. */}
          <ChristmasArt className="auth__art" />
          <p className="auth__caption">
            체인원과 함께!
            <br />
            이어진 만큼 든든하게!
          </p>
        </div>
        <p className="auth__foot">
          ※ 본 시스템의 모든 기업·거래 데이터는 프로젝트 시연용 가상 데이터입니다.
        </p>
      </aside>
      <main className="auth__main">
        <div className="auth__top">{top}</div>
        <div className="auth__content">{children}</div>
      </main>
    </div>
  );
}
