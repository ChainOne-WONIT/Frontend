import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ReasonModal } from './Modal';

/**
 * 상세 화면 앞의 조회 사유 확인.
 * 목록에서 사유를 고르고 들어오면 바로 열고, 주소로 바로 들어오면 여기서 사유를 먼저 고릅니다.
 */
export function ReasonGate<R extends string>({
  reasons,
  back,
  children,
}: {
  reasons: readonly R[];
  /** 사유를 고르지 않고 닫으면 돌아갈 곳 */
  back: string;
  children: (reason: R) => ReactNode;
}) {
  const navigate = useNavigate();
  const state = useLocation().state as { reason?: R } | null;
  const passed = state?.reason && reasons.includes(state.reason) ? state.reason : undefined;
  const [reason, setReason] = useState<R | undefined>(passed);

  if (!reason) {
    return <ReasonModal<R> reasons={reasons} onClose={() => navigate(back)} onOpen={setReason} />;
  }
  return <>{children(reason)}</>;
}
