import { useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { AuthLayout } from '../../layouts/AuthLayout';
import type { LoginType } from '../../api/types';
import { BankLogin } from './BankLogin';
import { CorpLogin } from './CorpLogin';
import './login.css';

export function LoginPage() {
  const [params, setParams] = useSearchParams();
  const type: LoginType = params.get('type') === 'bank' ? 'bank' : 'corp';

  const select = (t: LoginType) => {
    const next = new URLSearchParams(params);
    if (t === 'bank') next.set('type', 'bank');
    else next.delete('type');
    setParams(next, { replace: true });
  };

  const top = (
    <>
      <span className="small muted">로그인 유형</span>
      <div className="type-toggle" role="tablist" aria-label="로그인 유형">
        {(
          [
            ['corp', '기업', 'building'],
            ['bank', '은행', 'bank'],
          ] as const
        ).map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={type === key}
            className={`type-toggle__btn${type === key ? ' is-on' : ''}`}
            onClick={() => select(key)}
          >
            <Icon name={icon} size={16} />
            {label}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <AuthLayout top={top}>
      {type === 'bank' ? <BankLogin onCorp={() => select('corp')} /> : <CorpLogin />}
    </AuthLayout>
  );
}
