import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { checkBankNetwork, loginBank } from '../../api/auth';
import { USE_MOCK } from '../../api/client';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../lib/auth-context';
import { useAsync } from '../../lib/useAsync';
import { MOCK_BANK_ACCOUNT } from '../../mocks/bank';

export function BankLogin({ onCorp }: { onCorp: () => void }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const net = useAsync(checkBankNetwork, []);
  const [employeeNo, setEmployeeNo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const blocked = !net.loading && (!!net.error || !net.data?.allowed);
  const allowed = !net.loading && !!net.data?.allowed;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allowed) return;
    if (!employeeNo.trim() || !password) {
      setError('직원번호와 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await loginBank(employeeNo.trim(), password);
      if (res.user.role !== 'review') {
        // 지금은 심사 담당 화면만 있습니다.
        setError(`${res.user.roleLabel} 화면은 아직 준비 중입니다.`);
        return;
      }
      signIn(res.accessToken, res.user);
      navigate('/bank/review', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <header className="login__head">
        <h1>은행 백오피스 로그인</h1>
        <p className="muted">
          은행 직원 개인 계정으로 로그인합니다. 은행 로그인은 지정된 내부망에서만 이용할 수
          있습니다.
        </p>
      </header>

      {net.loading && (
        <div className="net-badge net-badge--checking" role="status">
          <span className="spinner" />
          접속 망을 확인하고 있습니다…
        </div>
      )}

      {allowed && net.data && (
        <div className="net-badge" role="status">
          <Icon name="wifi" size={18} />
          <b>{net.data.networkName}에 연결되어 있습니다</b>
          <span className="spacer" />
          <span className="small">접속 IP {net.data.ip}</span>
        </div>
      )}

      {blocked && (
        <>
          <div className="net-alert" role="alert">
            <div className="net-alert__title">
              <Icon name="wifiOff" size={22} />
              은행 내부망에 연결되어 있지 않습니다.
            </div>
            <p>
              은행 로그인은 지정된 내부망에서만 사용할 수 있습니다.
              <br />
              내부망에 연결한 후 다시 접속하세요.
            </p>
          </div>
          <table className="net-table">
            <thead>
              <tr>
                <th>접속 망</th>
                <th>접속 IP</th>
                <th>접속 상태</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{net.data?.networkName ?? '확인할 수 없음'}</td>
                <td className="num">{net.data?.ip ?? '-'}</td>
                <td className="net-table__bad">접속 차단</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <form className={`login__box${blocked ? ' is-disabled' : ''}`} onSubmit={submit} noValidate>
        <span className="login__box-label">직접 로그인</span>
        <div className="login__inputs">
          <label className="icon-input">
            <Icon name="user" size={18} />
            <span className="sr-only">직원번호</span>
            <input
              className="input"
              placeholder="직원번호"
              autoComplete="username"
              disabled={!allowed}
              value={employeeNo}
              onChange={(e) => setEmployeeNo(e.target.value)}
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
              disabled={!allowed}
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
        <button className="btn btn--primary btn--block" disabled={!allowed || busy}>
          <Icon name={allowed ? 'login' : 'lock'} size={18} />
          {allowed ? (busy ? '로그인 중…' : '로그인') : '로그인할 수 없습니다'}
        </button>
      </form>

      {blocked ? (
        <div className="login__actions">
          <button type="button" className="btn btn--outline" onClick={net.reload}>
            <Icon name="refresh" size={18} />
            다시 확인
          </button>
          <button type="button" className="btn btn--soft" onClick={onCorp}>
            <Icon name="building" size={18} />
            기업 로그인으로 이동
          </button>
        </div>
      ) : (
        <div className="login__links">
          <span className="small muted">비밀번호 5회 오류 시 계정이 잠깁니다.</span>
          <span className="small muted">계정 발급 문의: 디지털전략부</span>
        </div>
      )}

      {USE_MOCK && (
        <p className="mock-hint">
          목업 모드 · 주소에 <b>?type=bank&amp;network=internal</b> 을 붙이면 내부망 접속 화면을 볼
          수 있습니다. 심사 담당 시연 계정 <b>{MOCK_BANK_ACCOUNT.employeeNo}</b> /{' '}
          <b>{MOCK_BANK_ACCOUNT.password}</b>
        </p>
      )}
    </div>
  );
}
