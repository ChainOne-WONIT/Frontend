import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { ConsentKey } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Checkbox, Note } from '../../components/ui';
import { TERMS } from './terms';

interface Props {
  consents: Record<ConsentKey, boolean>;
  onChange: (c: Record<ConsentKey, boolean>) => void;
  onNext: () => void;
}

export function TermsStep({ consents, onChange, onNext }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState<ConsentKey | null>(null);
  const [error, setError] = useState('');

  const allChecked = TERMS.every((t) => consents[t.key]);
  const requiredOk = TERMS.filter((t) => t.required).every((t) => consents[t.key]);

  const setAll = (v: boolean) =>
    onChange(Object.fromEntries(TERMS.map((t) => [t.key, v])) as Record<ConsentKey, boolean>);
  const set = (k: ConsentKey, v: boolean) => {
    setError('');
    onChange({ ...consents, [k]: v });
  };

  const next = () => {
    if (!requiredOk) {
      setError('필수 항목에 모두 동의해야 다음 단계로 넘어갈 수 있습니다.');
      return;
    }
    onNext();
  };

  return (
    <>
      <Note>회원으로 가입하려면 아래 약관을 읽어 보신 후 동의해 주세요.</Note>

      <section className="card terms">
        <div className="terms__all">
          <Checkbox checked={allChecked} onChange={setAll}>
            <b className="terms__all-label">모든 약관에 전체 동의합니다</b>
            <span className="small muted">(선택 항목 포함)</span>
          </Checkbox>
        </div>

        {TERMS.filter((t) => t.required).map((t) => (
          <article key={t.key} className="term">
            <header className="term__head">
              <h3>{t.title}</h3>
              <span className="pill pill--bad">필수</span>
            </header>
            <div className="term__body" tabIndex={0} aria-label={`${t.title} 본문`}>
              {t.body!.map((line, i) =>
                /^(제\d+조|\d+\.)/.test(line) ? <b key={i}>{line}</b> : <p key={i}>{line}</p>,
              )}
            </div>
            <footer className="term__foot">
              <Checkbox checked={consents[t.key]} onChange={(v) => set(t.key, v)}>
                위 내용을 확인하였으며, 동의합니다.
              </Checkbox>
            </footer>
          </article>
        ))}

        {TERMS.filter((t) => !t.required).map((t) => (
          <article key={t.key} className="term term--optional">
            <div className="term__row">
              <Checkbox checked={consents[t.key]} onChange={(v) => set(t.key, v)}>
                <b>{t.title}</b>
              </Checkbox>
              <span className="pill pill--gray">선택</span>
              <span className="spacer" />
              <button
                type="button"
                className="term__toggle"
                aria-expanded={open === t.key}
                onClick={() => setOpen(open === t.key ? null : t.key)}
              >
                {open === t.key ? '접기' : '내용 보기'}
                <Icon name="chevronRight" size={14} className={open === t.key ? 'rot' : ''} />
              </button>
            </div>
            <p className="term__summary">{t.summary}</p>
            {open === t.key && (
              <p className="term__summary small">
                제공받는 자: 우리은행, 체인으로 이어진 직접 거래 기업 · 보유 기간: 동의 철회 또는
                회원 탈퇴 시까지 · 동의하지 않아도 가입할 수 있습니다.
              </p>
            )}
          </article>
        ))}

        <p className="small muted terms__opt-note">
          <Icon name="info" size={16} /> 선택 항목에 동의하지 않아도 가입할 수 있습니다. 동의하지
          않은 정보는 리스크 경보에 쓰이지 않습니다.
        </p>
      </section>

      {error && (
        <p className="field__error center" role="alert">
          {error}
        </p>
      )}
      <div className="signup__actions">
        <button type="button" className="btn btn--gray" onClick={() => navigate('/login')}>
          동의하지 않습니다
        </button>
        <button type="button" className="btn btn--primary" onClick={next}>
          동의하고 다음으로
          <Icon name="arrowRight" size={18} />
        </button>
      </div>
    </>
  );
}
