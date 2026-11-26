import { useNavigate } from 'react-router';
import type { SignupApplication } from '../../../api/types';
import { TReasonWindow } from '../../../components/terminal';
import { SIGNUP_VIEW_REASONS } from '../../../lib/format';

/** 가입 신청 상세를 열기 전 조회 사유 입력 창 */
export function SignupReasonWindow({
  app,
  onClose,
}: {
  app: SignupApplication;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  return (
    <TReasonWindow
      reasons={SIGNUP_VIEW_REASONS}
      defaultReason={app.status === 'PENDING' ? '가입 심사' : '사후 점검'}
      target={[
        { label: '신청번호', value: <b>{app.id}</b> },
        { label: '대상', value: `${app.companyName} · ${app.loginId}` },
      ]}
      onClose={onClose}
      onOpen={(reason) => navigate(`/bank/ops/signups/${app.id}`, { state: { reason } })}
    />
  );
}
