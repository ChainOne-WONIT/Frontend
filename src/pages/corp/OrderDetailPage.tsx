import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { getOrder, orderAction, requestLoan } from '../../api/corp';
import type { OrderAction, OrderDetail } from '../../api/types';
import {
  Card,
  ErrorBox,
  KeyValue,
  Loading,
  Note,
  OrderFlow,
  Pill,
  StatusPill,
} from '../../components/ui';
import { PageHead } from '../../layouts/CorpLayout';
import { addDaysLabel, won } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';

const CONFIRM: Partial<Record<OrderAction, string>> = {
  reject: '이 발주를 반려할까요? 반려하면 되돌릴 수 없습니다.',
  cancel: '이 발주를 취소할까요? 취소하면 되돌릴 수 없습니다.',
  reportUnpaid: '대금을 받지 못했다고 신고할까요? 은행 담당자에게 알림이 갑니다.',
};

export function OrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: o, error, loading, reload, setData } = useAsync(() => getOrder(id), [id]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  if (loading && !o) return <Loading />;
  if (error || !o)
    return <ErrorBox error={error ?? new Error('발주를 찾을 수 없습니다.')} onRetry={reload} />;

  const received = o.direction === 'received';

  const run = async (action: OrderAction) => {
    if (CONFIRM[action] && !confirm(CONFIRM[action])) return;
    setBusy(true);
    setActionError('');
    try {
      setData(await orderAction(o.id, action));
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const applyLoan = async () => {
    setBusy(true);
    setActionError('');
    try {
      setData(await requestLoan(o.id));
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const btn = (label: string, action: OrderAction, kind = 'primary') => (
    <button
      type="button"
      className={`btn btn--${kind}`}
      disabled={busy}
      onClick={() => run(action)}
    >
      {label}
    </button>
  );

  const action = received ? receivedAction(o, btn) : sentAction(o, btn);

  const rows: [string, ReactNode][] = [
    [received ? '보낸 기업' : '내는 기업', o.senderName],
    ['받는 기업', o.receiverName],
    ['품목 · 수량', `${o.item} · ${o.quantity.toLocaleString()}${o.unit}`],
    ['발주금액', won(o.amount)],
    ['납기일', o.dueDate],
    ['납품 장소', o.place],
    ['지급 예정일', o.payDueDate],
  ];
  if (received && o.account) rows.push(['대금 받을 계좌', o.account]);
  if (o.deliveredAt) {
    rows.push([
      '납품일(수령일)',
      o.receivedAt ? `${o.deliveredAt} (수령 확인 ${o.receivedAt})` : o.deliveredAt,
    ]);
    rows.push(['지급 기한', `${addDaysLabel(o.deliveredAt, 60)} (납품일부터 60일)`]);
  }

  return (
    <>
      <PageHead
        title={`${o.id} · ${o.item}`}
        sub={`${received ? '받은 발주' : '낸 발주'}  ·  ${received ? '보낸 기업' : '받는 기업'} ${o.counterpartyName}`}
        right={
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => navigate(`/corp/orders?tab=${o.direction}`)}
          >
            목록으로
          </button>
        }
      />

      <Card title="진행 상황" right={<StatusPill status={o.status} />}>
        {['REJECTED', 'CANCELED'].includes(o.status) ? (
          <Note tone="bad">이 발주는 {o.status === 'REJECTED' ? '반려' : '취소'}되었습니다.</Note>
        ) : (
          <div className="detail-flow">
            <OrderFlow status={o.status} />
            {action}
          </div>
        )}
        {actionError && (
          <p className="field__error" role="alert" style={{ marginTop: 10 }}>
            {actionError}
          </p>
        )}
      </Card>

      <div className="grid-2">
        <Card title="발주 내용">
          <KeyValue rows={rows} />
        </Card>
        <Card title="처리 기록">
          <ul className="list">
            {o.history.map((h, i) => (
              <li key={i} className="list__item">
                <span className="muted num" style={{ width: 96 }}>
                  {h.date}
                </span>
                <div className="list__main">
                  <div className="list__title">{h.action}</div>
                  <div className="list__sub">{h.actor}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {received ? <LoanCard o={o} busy={busy} onApply={applyLoan} /> : <PaymentCard o={o} />}
    </>
  );
}

type Btn = (label: string, action: OrderAction, kind?: string) => ReactNode;

/** 받는 기업 입장의 할 일 */
function receivedAction(o: OrderDetail, btn: Btn): ReactNode {
  switch (o.status) {
    case 'PENDING':
      return (
        <div className="detail-action">
          {btn('수락', 'accept')}
          {btn('반려', 'reject', 'danger')}
          <span className="small muted">
            수락하면 이 발주를 근거로 생산자금을 신청할 수 있습니다.
          </span>
        </div>
      );
    case 'ACCEPTED':
      return (
        <div className="detail-action">
          {btn('납품 등록', 'deliver')}
          <span className="small muted">
            납품을 마치면 등록해 주세요. 보낸 기업이 수령을 확인합니다.
          </span>
        </div>
      );
    case 'DELIVERED':
      return (
        <Waiting>
          보낸 기업의 수령 확인을 기다리고 있습니다. 납품 등록 후 10일이 지나면 자동으로 수령
          처리됩니다. (자동 수령 {addDaysLabel(o.deliveredAt!, 10)})
        </Waiting>
      );
    case 'RECEIVED':
      return (
        <Waiting>
          보낸 기업의 대금 지급을 기다리고 있습니다. 지급 기한 {addDaysLabel(o.deliveredAt!, 60)}{' '}
          (납품일부터 60일)
        </Waiting>
      );
    case 'PAID':
      return (
        <div className="detail-action">
          {btn('받았음', 'confirmPayment')}
          {btn('받지 못함', 'reportUnpaid', 'danger')}
          <span className="small muted">
            {o.senderName}가 {won(o.amount)} 지급을 등록했습니다{o.paidAt ? ` (${o.paidAt})` : ''}.
            계좌 입금을 확인해 주세요.
          </span>
        </div>
      );
    case 'COMPLETED':
      return (
        <Note tone="ok">
          대금 {won(o.amount)}을 받았습니다{o.completedAt ? ` (${o.completedAt})` : ''}.
          {o.loan ? ` 생산자금 대출 ${o.loan.id}은 입금된 대금에서 자동으로 회수되었습니다.` : ''}
        </Note>
      );
    default:
      return null;
  }
}

/** 낸 기업 입장의 할 일 */
function sentAction(o: OrderDetail, btn: Btn): ReactNode {
  switch (o.status) {
    case 'PENDING':
      return (
        <div className="detail-action">
          {btn('발주 취소', 'cancel', 'danger')}
          <span className="small muted">
            받는 기업이 수락하기 전에는 내는 기업이 발주를 취소할 수 있습니다.
          </span>
        </div>
      );
    case 'ACCEPTED':
      return (
        <Waiting>
          {o.receiverName}가 수락했습니다. 받는 기업의 납품을 기다리고 있습니다. (납기 {o.dueDate})
        </Waiting>
      );
    case 'DELIVERED':
      return (
        <div className="detail-action">
          {btn('수령 확인', 'receive')}
          <span className="small muted">
            {o.receiverName}가 {o.deliveredAt}에 납품을 등록했습니다. 10일이 지나면 자동으로 수령
            처리됩니다.
          </span>
        </div>
      );
    case 'RECEIVED':
      return (
        <div className="detail-action">
          {btn(`대금 지급 등록 (${won(o.amount)} 전액)`, 'pay')}
          <span className="small muted">
            지급 기한 {addDaysLabel(o.deliveredAt!, 60)} (납품일부터 60일)
          </span>
        </div>
      );
    case 'PAID':
      return (
        <Waiting>
          {o.paidAt ? `${o.paidAt}에 ` : ''}지급을 등록했습니다. 받는 기업의 입금 확인을 기다리고
          있습니다.
        </Waiting>
      );
    case 'COMPLETED':
      return (
        <Note tone="ok">
          지급이 완료되었습니다. {o.receiverName}가 {won(o.amount)} 입금을 확인했습니다.
        </Note>
      );
    default:
      return null;
  }
}

function Waiting({ children }: { children: ReactNode }) {
  return (
    <div className="detail-action">
      <Pill tone="gray">대기 중</Pill>
      <span className="small muted">{children}</span>
    </div>
  );
}

function LoanCard({ o, busy, onApply }: { o: OrderDetail; busy: boolean; onApply: () => void }) {
  return (
    <Card
      title="이 발주로 받은 생산자금"
      right={<span className="small muted">발주금액의 80%까지, 거래 상대별 한도 안에서</span>}
    >
      {o.loan ? (
        <div className="list__item">
          <div className="list__main">
            <div className="list__title">
              {o.loan.id} · {won(o.loan.amount)}
            </div>
            <div className="list__sub">
              실행 {o.loan.executedAt}
              {o.loan.status === 'REPAID'
                ? ` · 상환 ${o.loan.repaidAt} (대금에서 자동 회수)`
                : ` · 만기 ${o.loan.dueDate} · 대금이 들어오면 자동 회수`}
            </div>
          </div>
          <Pill tone={o.loan.status === 'REPAID' ? 'ok' : 'default'}>
            {o.loan.status === 'REPAID' ? '상환 완료' : '실행'}
          </Pill>
        </div>
      ) : o.loanAvailable ? (
        <div className="list__item">
          <div className="list__main">
            <div className="list__title">신청 가능 금액 {won(o.loanAvailable.amount)}</div>
            <div className="list__sub">{o.loanAvailable.reason}</div>
          </div>
          <button type="button" className="btn btn--primary" disabled={busy} onClick={onApply}>
            생산자금 신청
          </button>
        </div>
      ) : (
        <Note tone="warn">
          {o.status === 'PENDING'
            ? '수락 전 발주라 지금은 생산자금을 신청할 수 없습니다. 수락하면 바로 신청할 수 있습니다.'
            : '이 발주로는 지금 생산자금을 신청할 수 없습니다.'}
        </Note>
      )}
    </Card>
  );
}

function PaymentCard({ o }: { o: OrderDetail }) {
  const state =
    o.status === 'COMPLETED'
      ? ['지급 완료', 'ok']
      : o.status === 'PAID'
        ? ['지급 등록', 'default']
        : ['지급 전', 'gray'];
  const showAccount = ['RECEIVED', 'PAID', 'COMPLETED'].includes(o.status);
  return (
    <Card title="대금 지급" right={<Pill tone={state[1] as 'ok'}>{state[0]}</Pill>}>
      <KeyValue
        rows={[
          ['지급할 금액', `${won(o.amount)} (발주금액 전액)`],
          [
            '입금할 계좌',
            showAccount && o.account
              ? `${o.account} (예금주 ${o.receiverName})`
              : '수령 확인 후 안내됩니다',
          ],
          ['지급 예정일', o.payDueDate],
          [
            '지급 기한',
            o.deliveredAt
              ? `${addDaysLabel(o.deliveredAt, 60)} (납품일부터 60일)`
              : '납품일부터 60일',
          ],
          ['지급 등록일', o.paidAt ?? '—'],
        ]}
      />
      <div style={{ marginTop: 12 }}>
        <Note>
          {showAccount
            ? '받는 기업이 지정한 계좌입니다. 대금은 이 계좌로 지급해 주세요.'
            : '받는 기업의 생산자금 대출 정보는 보이지 않습니다. 대금 지급 일정만 확인할 수 있습니다.'}
        </Note>
      </div>
    </Card>
  );
}
