import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { loginCorp } from '../../api/auth';
import { USE_MOCK } from '../../api/client';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../lib/auth-context';
import { MOCK_ACCOUNT } from '../../mocks/db';

export function CorpLogin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password) {
      setError('아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await loginCorp(loginId.trim(), password);
      signIn(res.accessToken, res.user);
      navigate('/corp', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <header className="login__head">
        <h1>기업 로그인</h1>
        <p className="muted">
          원청·협력사 계정으로 로그인합니다. 기업 로그인은 접속 망과 관계없이 어디서나 이용할 수
          있습니다.
        </p>
      </header>

      <form className="login__box" onSubmit={submit} noValidate>
        <span className="login__box-label">직접 로그인</span>
        <div className="login__inputs">
          <label className="icon-input">
            <Icon name="user" size={18} />
            <span className="sr-only">아이디</span>
            <input
              className="input"
              placeholder="아이디"
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />
          </label>
          <label className="icon-input">
            <Icon name="lock" size={18} />
            <span className="sr-only">비밀번호</span>
            <input
              className="input"
              type="password"
              placeholder="비밀번호"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn--primary btn--block" disabled={busy}>
          <Icon name="login" size={18} />
          {busy ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <div className="login__links">
        <span className="small muted">비밀번호 5회 오류 시 계정이 잠깁니다.</span>
        <span className="login__links-right">
          <Link to="/signup" className="link-strong">
            협력사 회원가입
          </Link>
          <button
            type="button"
            className="link-plain"
            onClick={() => alert('아이디·비밀번호 찾기는 은행 담당자에게 문의해 주세요.')}
          >
            아이디 · 비밀번호 찾기
          </button>
        </span>
      </div>

      {USE_MOCK && (
        <p className="mock-hint">
          목업 모드 · 시연 계정 <b>{MOCK_ACCOUNT.loginId}</b> / <b>{MOCK_ACCOUNT.password}</b>
        </p>
      )}
    </div>
  );
}
