import { useState } from 'react';
import { getSettings, updateSettings } from '../../../api/ops';
import type { OpsSettings, SettingsOverview } from '../../../api/types';
import { Card, ErrorBox, Loading, Note } from '../../../components/ui';
import { PageHead } from '../../../layouts/CorpLayout';
import { useAsync } from '../../../lib/useAsync';
import '../review/review.css';
import './ops.css';

type Group = keyof OpsSettings;
type Field = { group: Group; key: string; label: string; unit: string };

const SECTIONS: { title: string; fields: Field[]; note?: string }[] = [
  {
    title: '등급 기준 (예측 부실확률)',
    fields: [
      { group: 'grade', key: 'stableBelow', label: '안정 기준 (미만)', unit: '%' },
      { group: 'grade', key: 'excludeFrom', label: '제외 기준 (이상)', unit: '%' },
      { group: 'grade', key: 'perOrderRatio', label: '건별 한도 비율', unit: '%' },
    ],
    note: '4%는 신보 일반보증 부실률을 참고한 값이고 8%는 설계값입니다.',
  },
  {
    title: '경보 가중치',
    fields: [
      { group: 'weights', key: 'payDelay', label: '지급 지연', unit: '점' },
      { group: 'weights', key: 'repayDelay', label: '상환 지연', unit: '점' },
      { group: 'weights', key: 'orderDrop', label: '발주 급감', unit: '점' },
      { group: 'weights', key: 'deliveryDelay', label: '납품 지연', unit: '점' },
      { group: 'weights', key: 'event', label: '이벤트 (체납·신용등급 하락)', unit: '점' },
    ],
  },
  {
    title: '경보 단계 기준',
    fields: [
      { group: 'stages', key: 'watch', label: '관심', unit: '점 이상' },
      { group: 'stages', key: 'caution', label: '주의', unit: '점 이상' },
      { group: 'stages', key: 'alert', label: '경보', unit: '점 이상' },
    ],
  },
];

type Form = Record<string, string>;
const id = (f: Field) => `${f.group}.${f.key}`;

function toForm(s: OpsSettings): Form {
  const form: Form = {};
  for (const sec of SECTIONS)
    for (const f of sec.fields) form[id(f)] = String((s[f.group] as Record<string, number>)[f.key]);
  return form;
}

function fromForm(form: Form, base: OpsSettings): OpsSettings {
  const next = structuredClone(base);
  for (const sec of SECTIONS)
    for (const f of sec.fields)
      (next[f.group] as Record<string, number>)[f.key] = Number(form[id(f)]);
  return next;
}

/** 운영 03 · 설정값 관리 */
export function SettingsPage() {
  const { data, error, loading, reload, setData } = useAsync(getSettings, []);
  if (loading) return <Loading />;
  if (error || !data)
    return <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />;
  return <SettingsForm data={data} onSaved={setData} />;
}

function SettingsForm({
  data,
  onSaved,
}: {
  data: SettingsOverview;
  onSaved: (d: SettingsOverview) => void;
}) {
  const [form, setForm] = useState<Form>(() => toForm(data.settings));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const initial = toForm(data.settings);
  const dirty = Object.keys(form).some((k) => form[k] !== initial[k]);

  const save = async () => {
    if (Object.values(form).some((v) => v.trim() === '' || !Number.isFinite(Number(v)))) {
      setError('모든 칸에 숫자를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await updateSettings(fromForm(form, data.settings));
      onSaved(res);
      setForm(toForm(res.settings));
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        title="설정값 관리"
        sub="운영 역할만 바꿀 수 있습니다. 바꾸면 변경 기록이 남고, 이후 판정부터 적용됩니다."
        right={
          <button
            type="button"
            className="btn btn--primary"
            disabled={!dirty || busy}
            onClick={save}
          >
            {busy ? '저장 중…' : '저장'}
          </button>
        }
      />
      {error && <Note tone="bad">{error}</Note>}
      {saved && !dirty && !error && <Note tone="ok">저장했습니다. 이후 판정부터 적용됩니다.</Note>}

      {SECTIONS.map((sec) => (
        <Card key={sec.title} title={sec.title}>
          <div className="ops-fields">
            {sec.fields.map((f) => (
              <label key={id(f)} className="field">
                <span className="field__label">{f.label}</span>
                <span className="ops-unit">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="100"
                    inputMode="decimal"
                    value={form[id(f)]}
                    onChange={(e) => {
                      setSaved(false);
                      setForm((p) => ({ ...p, [id(f)]: e.target.value }));
                    }}
                  />
                  <span>{f.unit}</span>
                </span>
              </label>
            ))}
          </div>
          {sec.note && (
            <p className="small muted" style={{ marginTop: 12 }}>
              {sec.note}
            </p>
          )}
        </Card>
      ))}

      <Card title="변경 기록">
        <ul className="list">
          {data.logs.map((l, i) => (
            <li key={i} className="list__item rv-log">
              <span className="num muted">{l.date}</span>
              <span className="muted">{l.actor}</span>
              <b>{l.text}</b>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
