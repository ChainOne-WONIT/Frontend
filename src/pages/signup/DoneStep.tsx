import { Link } from 'react-router';
import type { SignupResponse } from '../../api/types';
import { Icon } from '../../components/Icon';

export function DoneStep({ result }: { result: SignupResponse }) {
  const steps = [
    ['가입 신청', '완료', 'done'],
    ['은행 승인 검토', '진행 중', 'now'],
    ['서비스 이용 시작', '승인 후', 'todo'],
  ] as const;

  return (
    <section className="card done">
      <div className="done__ring">
        <span>
          <Icon name="check" size={34} strokeWidth={3} color="#fff" />
        </span>
      </div>
      <h2>회원가입 신청이 완료되었습니다</h2>
      <p className="muted">
        은행 담당자가 가입 정보를 확인한 뒤 승인하면 체인원을 이용하실 수 있습니다.
        <br />
        승인 결과는 담당자 휴대폰 문자와 이메일로 알려 드립니다.
      </p>

      <ol className="timeline">
        {steps.map(([label, sub, st]) => (
          <li key={label} className={`timeline__item timeline__item--${st}`}>
            <span className="timeline__dot">
              <Icon
                name={st === 'done' ? 'check' : st === 'now' ? 'clock' : 'login'}
                size={18}
                strokeWidth={st === 'done' ? 3 : 2}
              />
            </span>
            <b>{label}</b>
            <span className="small">{sub}</span>
          </li>
        ))}
      </ol>

      <dl className="summary">
        {(
          [
            ['아이디', result.loginId],
            ['기업명', result.companyName],
            ['사업자등록번호', result.bizNo],
            ['신청 일시', result.appliedAt],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <div>
          <dt>가입 상태</dt>
          <dd>
            <span className="pill pill--warn">
              <Icon name="clock" size={14} /> 승인 대기
            </span>
          </dd>
        </div>
      </dl>

      <div className="note done__note">
        <Icon name="info" size={18} />
        승인 전에는 로그인할 수 없습니다. 승인 진행 상황은 은행 담당자에게 문의해 주세요.
      </div>

      <div className="signup__actions">
        <Link to="/login" className="btn btn--primary">
          <Icon name="login" size={18} />
          로그인 화면으로
        </Link>
      </div>
    </section>
  );
}
