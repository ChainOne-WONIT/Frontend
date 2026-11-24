import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { createOrder, getCounterparties } from '../../api/corp';
import { Card, KeyValue, Note } from '../../components/ui';
import { PageHead } from '../../layouts/CorpLayout';
import { addDaysLabel, won } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';

const today = new Date().toISOString().slice(0, 10);

export function OrderNewPage() {
  const navigate = useNavigate();
  const cps = useAsync(getCounterparties, []);
  const [f, setF] = useState({
    receiverId: '',
    item: '',
    quantity: '',
    amountMan: '',
    dueDate: addDaysLabel(today, 45),
    place: '한성모터스(주) 화성 1공장',
    payDueDate: addDaysLabel(today, 95),
    memo: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const amount = Number(f.amountMan || 0) * 10_000;
  const payLimit = addDaysLabel(f.dueDate, 60);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (
      !f.receiverId ||
      !f.item.trim() ||
      !Number(f.quantity) ||
      !amount ||
      !f.dueDate ||
      !f.place.trim() ||
      !f.payDueDate
    ) {
      setError('모든 필수 항목을 입력해 주세요.');
      return;
    }
    if (f.payDueDate > payLimit) {
      setError(`대금 지급 예정일은 납기일부터 60일 이내(${payLimit}까지)여야 합니다.`);
      return;
    }
    setBusy(true);
    try {
      const o = await createOrder({
        receiverId: f.receiverId,
        item: f.item.trim(),
        quantity: Number(f.quantity),
        amount,
        dueDate: f.dueDate,
        place: f.place.trim(),
        payDueDate: f.payDueDate,
        memo: f.memo.trim() || undefined,
      });
      navigate(`/corp/orders/${o.id}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        title="발주 등록"
        sub="가입된 기업에게 발주를 냅니다. 받는 기업이 수락하면 발주 체인에 자동으로 이어집니다."
      />
      <div className="grid-side">
        <Card title="발주 정보">
          <form className="form-grid" onSubmit={submit} noValidate>
            <label className="field">
              <span className="field__label">받는 기업 (가입된 기업 중에서 선택) *</span>
              <select className="input" value={f.receiverId} onChange={set('receiverId')}>
                <option value="">
                  {cps.loading ? '불러오는 중…' : '받는 기업을 선택해 주세요'}
                </option>
                {cps.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.bizNo}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">품목 *</span>
              <input
                className="input"
                placeholder="예: 도어 힌지 브래킷"
                value={f.item}
                onChange={set('item')}
              />
            </label>
            <label className="field">
              <span className="field__label">수량 (개) *</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder="12000"
                value={f.quantity}
                onChange={(e) =>
                  setF((p) => ({ ...p, quantity: e.target.value.replace(/\D/g, '') }))
                }
              />
            </label>
            <label className="field">
              <span className="field__label">발주금액 (만원) *</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder="24000"
                value={f.amountMan}
                onChange={(e) =>
                  setF((p) => ({ ...p, amountMan: e.target.value.replace(/\D/g, '') }))
                }
              />
            </label>
            <label className="field">
              <span className="field__label">납기일 *</span>
              <input className="input" type="date" value={f.dueDate} onChange={set('dueDate')} />
            </label>
            <label className="field">
              <span className="field__label">납품 장소 *</span>
              <input className="input" value={f.place} onChange={set('place')} />
            </label>
            <label className="field">
              <span className="field__label">대금 지급 예정일 (납기일부터 60일 이내) *</span>
              <input
                className="input"
                type="date"
                value={f.payDueDate}
                max={payLimit}
                onChange={set('payDueDate')}
              />
            </label>
            <label className="field">
              <span className="field__label">메모 (선택)</span>
              <input
                className="input"
                placeholder="예: 1차 시제품 포함"
                value={f.memo}
                onChange={set('memo')}
              />
            </label>
            {error && (
              <p className="field__error form-grid__full" role="alert">
                {error}
              </p>
            )}
            <div className="form-grid__full row-gap">
              <button className="btn btn--primary" disabled={busy}>
                {busy ? '등록 중…' : '등록'}
              </button>
              <button
                type="button"
                className="btn btn--gray"
                onClick={() => navigate('/corp/orders?tab=sent')}
              >
                취소
              </button>
            </div>
          </form>
        </Card>
        <Card title="등록 전 확인">
          <KeyValue
            rows={[
              ['발주금액', won(amount)],
              ['받는 기업 신청 가능', `최대 ${won(amount * 0.8)}`],
              ['지급 기한', payLimit],
            ]}
          />
          <div className="stack">
            <Note>
              받는 기업은 수락한 발주를 근거로 발주금액의 80%까지 생산자금을 신청할 수 있습니다.
            </Note>
            <Note tone="warn">
              수락 전에는 언제든 발주를 취소할 수 있습니다. 수락 후에는 받는 기업과 협의해야 합니다.
            </Note>
          </div>
        </Card>
      </div>
    </>
  );
}
