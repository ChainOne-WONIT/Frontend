import { useState } from 'react';
import { Link } from 'react-router';
import characters from '../../assets/characters.png';
import type { ConsentKey, SignupResponse } from '../../api/types';
import { Icon, type IconName } from '../../components/Icon';
import { Logo } from '../../components/ui';
import { DoneStep } from './DoneStep';
import { InfoStep } from './InfoStep';
import { TermsStep } from './TermsStep';
import './signup.css';

const STEPS: [string, IconName][] = [
  ['약관동의', 'doc'],
  ['업체정보 입력', 'idCard'],
  ['가입완료', 'clipboardCheck'],
];

export function SignupPage() {
  const [step, setStep] = useState(0);
  const [consents, setConsents] = useState<Record<ConsentKey, boolean>>({
    terms: false,
    privacy: false,
    platformShare: false,
    financialInfo: false,
    creditInfo: false,
  });
  const [result, setResult] = useState<SignupResponse>();

  const go = (n: number) => {
    setStep(n);
    window.scrollTo(0, 0);
  };

  return (
    <div className="signup">
      <header className="signup__nav">
        <Link to="/login" className="signup__brand">
          <Logo size={45} />
        </Link>
        <span className="spacer" />
        <span className="small muted">이미 계정이 있으신가요?</span>
        <Link to="/login" className="btn btn--soft btn--sm">
          <Icon name="login" size={16} />
          기업 로그인
        </Link>
      </header>

      <section className="signup__hero">
        <div>
          <nav className="signup__crumb" aria-label="현재 위치">
            <Icon name="home" size={14} /> 홈 <Icon name="chevronRight" size={12} /> <b>회원가입</b>
          </nav>
          <h1>기업 회원가입</h1>
          <p className="muted">
            체인원 협력사 회원가입 페이지입니다. 원청 기업은 은행에서 계정을 발급해 드립니다.
          </p>
        </div>
        <img className="signup__art" src={characters} alt="" />
      </section>

      <main className="signup__body">
        <ol className="stepper">
          {STEPS.map(([label, icon], i) => {
            const state = i < step ? 'done' : i === step ? 'active' : 'todo';
            return (
              <li
                key={label}
                className={`stepper__item stepper__item--${state}`}
                aria-current={i === step ? 'step' : undefined}
              >
                <span className="stepper__icon">
                  <Icon
                    name={state === 'done' ? 'check' : icon}
                    size={22}
                    strokeWidth={state === 'done' ? 2.6 : 2}
                  />
                </span>
                <span>
                  <span className="stepper__no">STEP 0{i + 1}</span>
                  <span className="stepper__label">{label}</span>
                </span>
                {state === 'done' && <span className="stepper__done">완료</span>}
              </li>
            );
          })}
        </ol>

        {step === 0 && (
          <TermsStep consents={consents} onChange={setConsents} onNext={() => go(1)} />
        )}
        {step === 1 && (
          <InfoStep
            consents={consents}
            onBack={() => go(0)}
            onDone={(r) => {
              setResult(r);
              go(2);
            }}
          />
        )}
        {step === 2 && result && <DoneStep result={result} />}
      </main>

      <footer className="signup__foot">© Chain-One</footer>
    </div>
  );
}
