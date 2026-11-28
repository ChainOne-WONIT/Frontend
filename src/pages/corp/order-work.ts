import type { OrderSummary } from '../../api/types';

/**
 * 내가 처리해야 남은 일. 발주 상세에서 누를 버튼과 같습니다.
 * 받은 발주는 수락, 낸 발주는 수령 확인·대금 지급 등록입니다.
 * 낸 발주의 수락 대기(발주 취소만 할 수 있음)는 넣지 않습니다.
 * 발주 화면의 작업중 탭, 홈의 내가 할 일, 알림 버튼이 같은 기준을 씁니다.
 */
export function workTodo(o: OrderSummary): string | null {
  if (o.direction === 'received') return o.status === 'PENDING' ? '수락' : null;
  if (o.status === 'DELIVERED') return '수령 확인';
  if (o.status === 'RECEIVED') return '대금 지급 등록';
  return null;
}
