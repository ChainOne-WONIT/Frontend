import { useState, type FormEvent, type ReactNode } from 'react';
import { checkLoginId, signupCorp } from '../../api/signup';
import type { ConsentKey, SignupResponse } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Checkbox, Note } from '../../components/ui';

const INDUSTRIES = [
  '자동차 부품 제조',
  '금속 가공',
  '도금·표면처리',
  '소재 절단',
  '플라스틱 사출',
  '전장 부품',
  '기타 제조',
];
const EMAIL_DOMAINS = ['naver.com', 'gmail.com', 'daum.net', 'kakao.com'];

const ID_RE = /^[a-z0-9]{6,20}$/;
const PW_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,20}$/;

const empty = {
  loginId: '',
  password: '',
  password2: '',
  biz1: '',
  biz2: '',
  biz3: '',
  name: '',
  ceoName: '',
  industry: '',
  zipCode: '',
  address: '',
  addressDetail: '',
  managerName: '',
  department: '',
  position: '',
  phone1: '010',
  phone2: '',
  phone3: '',
  emailId: '',
  emailDomain: '',
};
type Form = typeof empty;
type Errors = Partial<Record<keyof Form | 'biz' | 'phone' | 'email', string>>;

interface Props {
  consents: Record<ConsentKey, boolean>;
  onBack: () => void;
  onDone: (r: SignupResponse) => void;
}

export function InfoStep({ consents, onBack, onDone }: Props) {
  const [f, setF] = useState<Form>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [idCheck, setIdCheck] = useState<{ id: string; ok: boolean } | null>(null);
  const [notify, setNotify] = useState({
    orderProgress: { email: true, sms: true },
    riskAlert: { email: true, sms: false },
  });
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = (k: keyof Form) => (e: { target: { value: string } }) => {
    const v = e.target.value;
    setF((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
    if (k === 'loginId') setIdCheck(null);
  };
  const digits = (k: keyof Form, max: number) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value.replace(/\D/g, '').slice(0, max) }));

  const runIdCheck = async () => {
    if (!ID_RE.test(f.loginId)) {
      setErrors((p) => ({ ...p, loginId: '아이디는 영문 소문자와 숫자 6~20자로 입력해 주세요.' }));
      return;
    }
    try {
      const r = await checkLoginId(f.loginId);
      setIdCheck({ id: f.loginId, ok: r.available });
      setErrors((p) => ({ ...p, loginId: r.available ? undefined : '이미 쓰이는 아이디입니다.' }));
    } catch (e) {
      setErrors((p) => ({ ...p, loginId: (e as Error).message }));
    }
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!ID_RE.test(f.loginId)) e.loginId = '아이디는 영문 소문자와 숫자 6~20자로 입력해 주세요.';
    else if (!idCheck || idCheck.id !== f.loginId || !idCheck.ok)
      e.loginId = '아이디 중복확인을 해 주세요.';
    if (!PW_RE.test(f.password))
      e.password = '영문, 숫자, 특수문자를 각각 1자 이상 포함해 8~20자로 입력해 주세요.';
    if (f.password2 !== f.password || !f.password2) e.password2 = '비밀번호가 일치하지 않습니다.';
    if (f.biz1.length !== 3 || f.biz2.length !== 2 || f.biz3.length !== 5)
      e.biz = '사업자등록번호 10자리를 입력해 주세요.';
    if (!f.name.trim()) e.name = '기업명을 입력해 주세요.';
    if (!f.ceoName.trim()) e.ceoName = '대표자 성명을 입력해 주세요.';
    if (!f.industry) e.industry = '업종을 선택해 주세요.';
    if (!f.zipCode.trim() || !f.address.trim()) e.address = '우편번호와 기본 주소를 입력해 주세요.';
    if (!f.managerName.trim()) e.managerName = '담당자 성명을 입력해 주세요.';
    if (f.phone1.length < 3 || f.phone2.length < 3 || f.phone3.length !== 4)
      e.phone = '휴대폰 번호를 확인해 주세요.';
    if (!f.emailId.trim() || !/^[\w.-]+\.[a-z]{2,}$/i.test(f.emailDomain))
      e.email = '이메일 주소를 확인해 주세요.';
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setSubmitError('');
    if (Object.keys(e).length) {
      setSubmitError('입력하지 않았거나 형식이 맞지 않는 항목이 있습니다.');
      return;
    }
    setBusy(true);
    try {
      const r = await signupCorp({
        consents,
        account: { loginId: f.loginId, password: f.password },
        company: {
          bizNo: `${f.biz1}-${f.biz2}-${f.biz3}`,
          name: f.name.trim(),
          ceoName: f.ceoName.trim(),
          industry: f.industry,
          zipCode: f.zipCode.trim(),
          address: f.address.trim(),
          addressDetail: f.addressDetail.trim(),
        },
        manager: {
          name: f.managerName.trim(),
          department: f.department.trim(),
          position: f.position.trim(),
          phone: `${f.phone1}-${f.phone2}-${f.phone3}`,
          email: `${f.emailId.trim()}@${f.emailDomain.trim()}`,
        },
        notifications: notify,
      });
      onDone(r);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const inp = (k: keyof Form, ph: string, width: number, extra: Record<string, unknown> = {}) => (
    <input
      className={`input${errors[k] ? ' input--error' : ''}`}
      style={{ width }}
      placeholder={ph}
      value={f[k]}
      onChange={set(k)}
      aria-label={ph}
      {...extra}
    />
  );

  return (
    <form onSubmit={submit} noValidate>
      <Note>
        가입 신청 후 은행 담당자가 확인하고 승인하면 로그인할 수 있습니다. 기업당 하나의 계정만 만들
        수 있습니다.
      </Note>

      <section className="card form-card">
        <div className="form-card__head">
          <h2>회원가입 양식</h2>
          <span className="small muted">
            <span className="req">*</span> 표시는 필수 항목입니다.
          </span>
        </div>

        <Group title="계정 정보">
          <Row
            label="아이디"
            required
            error={errors.loginId}
            help={
              idCheck?.ok && idCheck.id === f.loginId
                ? '사용할 수 있는 아이디입니다.'
                : '영문 소문자와 숫자 6~20자'
            }
          >
            {inp('loginId', '아이디를 입력해 주세요', 260, { autoComplete: 'username' })}
            <button type="button" className="btn btn--primary btn--sm" onClick={runIdCheck}>
              중복확인
            </button>
          </Row>
          <Row
            label="비밀번호"
            required
            error={errors.password}
            help="영문, 숫자, 특수문자를 각각 1자 이상 포함해 8~20자"
          >
            {inp('password', '비밀번호를 입력해 주세요', 260, {
              type: 'password',
              autoComplete: 'new-password',
            })}
          </Row>
          <Row label="비밀번호 확인" required error={errors.password2}>
            {inp('password2', '비밀번호를 다시 입력해 주세요', 260, {
              type: 'password',
              autoComplete: 'new-password',
            })}
          </Row>
        </Group>

        <Group title="기업 정보">
          <Row
            label="사업자등록번호"
            required
            error={errors.biz}
            help="이미 가입된 사업자등록번호는 다시 가입할 수 없습니다."
          >
            <input
              className={`input${errors.biz ? ' input--error' : ''}`}
              style={{ width: 90 }}
              placeholder="000"
              value={f.biz1}
              onChange={digits('biz1', 3)}
              inputMode="numeric"
              aria-label="사업자등록번호 앞 3자리"
            />
            <span className="dash">-</span>
            <input
              className={`input${errors.biz ? ' input--error' : ''}`}
              style={{ width: 70 }}
              placeholder="00"
              value={f.biz2}
              onChange={digits('biz2', 2)}
              inputMode="numeric"
              aria-label="사업자등록번호 가운데 2자리"
            />
            <span className="dash">-</span>
            <input
              className={`input${errors.biz ? ' input--error' : ''}`}
              style={{ width: 120 }}
              placeholder="00000"
              value={f.biz3}
              onChange={digits('biz3', 5)}
              inputMode="numeric"
              aria-label="사업자등록번호 뒤 5자리"
            />
          </Row>
          <Row
            label="기업명"
            required
            error={errors.name}
            help="사업자등록증의 상호와 같게 입력해 주세요."
          >
            {inp('name', '기업명을 입력해 주세요', 320)}
          </Row>
          <Row label="대표자 성명" required error={errors.ceoName}>
            {inp('ceoName', '대표자 성명', 200)}
          </Row>
          <Row label="업종" required error={errors.industry}>
            <select
              className={`input${errors.industry ? ' input--error' : ''}`}
              style={{ width: 260 }}
              value={f.industry}
              onChange={set('industry')}
              aria-label="업종"
            >
              <option value="">업종을 선택해 주세요</option>
              {INDUSTRIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Row>
          <Row label="사업장 주소" required error={errors.address}>
            {inp('zipCode', '우편번호', 120, { inputMode: 'numeric' })}
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() =>
                alert(
                  '우편번호 검색은 주소 검색 서비스와 연결할 예정입니다. 지금은 직접 입력해 주세요.',
                )
              }
            >
              <Icon name="search" size={16} />
              우편번호 검색
            </button>
            {inp('address', '기본 주소', 280)}
            {inp('addressDetail', '상세 주소', 200)}
          </Row>
        </Group>

        <Group title="담당자 정보">
          <Row label="담당자 성명" required error={errors.managerName}>
            {inp('managerName', '담당자 성명', 200)}
          </Row>
          <Row label="부서 / 직위">
            {inp('department', '부서', 200)}
            {inp('position', '직위', 160)}
          </Row>
          <Row
            label="휴대폰 번호"
            required
            error={errors.phone}
            help="가입 승인 결과를 문자로 알려 드립니다."
          >
            <input
              className={`input${errors.phone ? ' input--error' : ''}`}
              style={{ width: 90 }}
              value={f.phone1}
              onChange={digits('phone1', 3)}
              inputMode="numeric"
              aria-label="휴대폰 앞자리"
            />
            <span className="dash">-</span>
            <input
              className={`input${errors.phone ? ' input--error' : ''}`}
              style={{ width: 100 }}
              placeholder="0000"
              value={f.phone2}
              onChange={digits('phone2', 4)}
              inputMode="numeric"
              aria-label="휴대폰 가운데 자리"
            />
            <span className="dash">-</span>
            <input
              className={`input${errors.phone ? ' input--error' : ''}`}
              style={{ width: 100 }}
              placeholder="0000"
              value={f.phone3}
              onChange={digits('phone3', 4)}
              inputMode="numeric"
              aria-label="휴대폰 뒷자리"
            />
          </Row>
          <Row label="이메일" required error={errors.email}>
            {inp('emailId', '이메일 아이디', 200)}
            <span className="dash">@</span>
            {inp('emailDomain', '직접 입력', 180)}
            <select
              className="input"
              style={{ width: 150 }}
              value=""
              onChange={(e) => setF((p) => ({ ...p, emailDomain: e.target.value }))}
              aria-label="이메일 도메인 선택"
            >
              <option value="">선택</option>
              {EMAIL_DOMAINS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Row>
        </Group>

        <div className="group">
          <h3 className="group__title">
            알림 수신 설정 <span className="pill pill--gray">선택</span>
          </h3>
          <div className="notify">
            {(
              [
                ['orderProgress', '발주 · 대출 진행 알림', '발주 수락, 대출 실행, 상환 일정 안내'],
                [
                  'riskAlert',
                  '공급망 리스크 경보 알림',
                  '체인으로 이어진 기업에 위험 신호가 생겼을 때 안내',
                ],
              ] as const
            ).map(([k, title, desc]) => (
              <div key={k} className="notify__row">
                <b>{title}</b>
                <span className="small muted">{desc}</span>
                <span className="spacer" />
                {(['email', 'sms'] as const).map((ch) => (
                  <Checkbox
                    key={ch}
                    checked={notify[k][ch]}
                    onChange={(v) => setNotify((p) => ({ ...p, [k]: { ...p[k], [ch]: v } }))}
                  >
                    {ch === 'email' ? '이메일' : '문자(SMS)'}
                  </Checkbox>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {submitError && (
        <p className="field__error center" role="alert">
          {submitError}
        </p>
      )}
      <div className="signup__actions">
        <button type="button" className="btn btn--outline" onClick={onBack}>
          <Icon name="arrowLeft" size={18} />
          이전 단계
        </button>
        <button
          type="button"
          className="btn btn--gray"
          onClick={() => {
            setF(empty);
            setErrors({});
            setIdCheck(null);
            setSubmitError('');
          }}
        >
          <Icon name="refresh" size={18} />
          다시 작성
        </button>
        <button className="btn btn--primary" disabled={busy}>
          {busy ? '신청 중…' : '가입 신청하기'}
          <Icon name="check" size={18} />
        </button>
      </div>
    </form>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="group">
      <h3 className="group__title">{title}</h3>
      <div className="group__table">{children}</div>
    </div>
  );
}

function Row({
  label,
  required,
  error,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div className="frow">
      <div className="frow__label">
        {label}
        {required && <span className="req"> *</span>}
      </div>
      <div className="frow__value">
        <div className="frow__inputs">{children}</div>
        {error ? (
          <span className="field__error">※ {error}</span>
        ) : (
          help && <span className="field__help">※ {help}</span>
        )}
      </div>
    </div>
  );
}
