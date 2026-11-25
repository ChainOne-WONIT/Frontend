import { useNavigate } from 'react-router';
import type { ReviewApplication } from '../../../api/types';
import { TReasonWindow } from '../../../components/terminal';
import { VIEW_REASONS } from '../../../lib/format';

/** 한도 신청의 상세를 열기 전 조회 사유 입력 창 */
export function ReviewReasonWindow({
  app,
  onClose,
}: {
  app: ReviewApplication;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  return (
    <TReasonWindow
      reasons={VIEW_REASONS}
      defaultReason={
        app.status === 'KODIT_REVIEW'
          ? '신보 승인 결과 입력'
          : app.status === 'REVIEW'
            ? '한도 심사'
            : '사후 점검'
      }
      target={[
        { label: '신청번호', value: <b>{app.id}</b> },
        { label: '대상', value: `${app.companyName} · ${app.counterpartyName} 거래용 한도` },
      ]}
      onClose={onClose}
      onOpen={(reason) => navigate(`/bank/review/applications/${app.id}`, { state: { reason } })}
    />
  );
}
