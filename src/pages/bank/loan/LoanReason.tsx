import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { LoanViewReason } from '../../../api/types';
import { TReasonWindow } from '../../../components/terminal';
import { LOAN_VIEW_REASONS } from '../../../lib/format';

/** 대출·경보 상세를 열기 전 조회 사유 입력 창 */
export function LoanReasonWindow({
  to,
  target,
  defaultReason,
  onClose,
}: {
  /** 사유를 고르면 갈 주소 */
  to: string;
  target: { label: string; value: ReactNode }[];
  defaultReason: LoanViewReason;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  return (
    <TReasonWindow
      reasons={LOAN_VIEW_REASONS}
      defaultReason={defaultReason}
      target={target}
      onClose={onClose}
      onOpen={(reason) => {
        // 탭은 화면을 살려 두므로, 창을 먼저 닫아야 목록으로 돌아왔을 때 창이 다시 뜨지 않습니다.
        onClose();
        navigate(to, { state: { reason } });
      }}
    />
  );
}
