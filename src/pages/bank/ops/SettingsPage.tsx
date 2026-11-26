import { useState } from 'react';
import { useNavigate } from 'react-router';
import { getSettings, updateSettings } from '../../../api/ops';
import type { OpsSettings, SettingsOverview } from '../../../api/types';
import {
  TError,
  TFKeys,
  TKV,
  TLoading,
  TSection,
  TTitle,
  TWarn,
  type KVCell,
} from '../../../components/terminal';
import { useAsync } from '../../../lib/useAsync';

type Group = keyof OpsSettings;
type Field = { group: Group; key: string; label: string; unit: string };

const SECTIONS: { title: string; right: string; rows: Field[][]; note?: string }[] = [
  {
    title: '등급 기준 (예측 부실확률)',
    right: '안정 기준 < 제외 기준',
    rows: [
      [
        { group: 'grade', key: 'stableBelow', label: '안정 기준 (미만)', unit: '%' },
        { group: 'grade', key: 'excludeFrom', label: '제외 기준 (이상)', unit: '%' },
        { group: 'grade', key: 'perOrderRatio', label: '건별 한도 비율', unit: '%' },
      ],
    ],
    note: '4%는 신보 일반보증 부실률을 참고한 값이고 8%는 설계값입니다.',
  },
  {
    title: '경보 가중치',
    right: '(단위: 점)',
    rows: [
      [
        { group: 'weights', key: 'payDelay', label: '지급 지연', unit: '점' },
        { group: 'weights', key: 'repayDelay', label: '상환 지연', unit: '점' },
        { group: 'weights', key: 'orderDrop', label: '발주 급감', unit: '점' },
      ],
      [
        { group: 'weights', key: 'deliveryDelay', label: '납품 지연', unit: '점' },
        { group: 'weights', key: 'event', label: '이벤트 (체납·등급 하락)', unit: '점' },
      ],
    ],
  },
  {
    title: '경보 단계 기준',
    right: '관심 < 주의 < 경보',
    rows: [
      [
        { group: 'stages', key: 'watch', label: '관심', unit: '점 이상' },
        { group: 'stages', key: 'caution', label: '주의', unit: '점 이상' },
        { group: 'stages', key: 'alert', label: '경보', unit: '점 이상' },
      ],
    ],
  },
];
const ALL = SECTIONS.flatMap((s) => s.rows.flat());

type Form = Record<string, string>;
const fid = (f: Field) => `${f.group}.${f.key}`;
const valueOf = (s: OpsSettings, f: Field) => (s[f.group] as Record<string, number>)[f.key];
const toForm = (s: OpsSettings): Form =>
  Object.fromEntries(ALL.map((f) => [fid(f), String(valueOf(s, f))]));
function fromForm(form: Form, base: OpsSettings): OpsSettings {
  const next = structuredClone(base);
  for (const f of ALL) (next[f.group] as Record<string, number>)[f.key] = Number(form[fid(f)]);
  return next;
}

/** [O0300] 설정값 관리 (단말형) */
export function SettingsPage() {
  const { data, error, loading, reload, setData } = useAsync(getSettings, []);
  return (
    <>
      <TTitle code="O0300" num="3100" title="설정값 관리" />
      <TWarn>
        운영 역할만 바꿀 수 있습니다. 바꾸면 변경 기록이 남고, 이후 판정부터 적용됩니다. 노란 칸이
        수정할 수 있는 값입니다.
      </TWarn>
      {loading && !data ? (
        <TLoading />
      ) : error || !data ? (
        <TError error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />
      ) : (
        <SettingsForm data={data} onSaved={setData} />
      )}
    </>
  );
}

function SettingsForm({
  data,
  onSaved,
}: {
  data: SettingsOverview;
  onSaved: (d: SettingsOverview) => void;
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>(() => toForm(data.settings));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const initial = toForm(data.settings);
  const changed = ALL.filter((f) => form[fid(f)] !== initial[fid(f)]);

  const save = async () => {
    if (!changed.length) return;
    if (Object.values(form).some((v) => v.trim() === '' || !Number.isFinite(Number(v)))) {
      setMsg({ ok: false, text: '모든 칸에 숫자를 입력해 주세요.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await updateSettings(fromForm(form, data.settings));
      onSaved(res);
      setForm(toForm(res.settings));
      setMsg({ ok: true, text: '저장했습니다. 이후 판정부터 적용됩니다.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const cell = (f: Field): KVCell => {
    const isChanged = form[fid(f)] !== initial[fid(f)];
    return {
      label: f.label,
      req: true,
      value: (
        <>
          <input
            className={`tf tf--req${isChanged ? ' tf--changed' : ''}`}
            type="number"
            min="0"
            max="100"
            aria-label={f.label}
            value={form[fid(f)]}
            onChange={(e) => {
              setMsg(null);
              setForm((p) => ({ ...p, [fid(f)]: e.target.value }));
            }}
          />
          <span className="tt-muted">{f.unit}</span>
        </>
      ),
    };
  };

  return (
    <>
      {SECTIONS.map((sec) => (
        <div key={sec.title} className="tt-group">
          <TSection title={sec.title} right={sec.right} />
          <TKV labelWidth={130} rows={sec.rows.map((r) => r.map(cell))} />
          {sec.note && <p className="tt-note">※ {sec.note}</p>}
        </div>
      ))}

      {changed.length > 0 && (
        <TWarn>
          바뀐 값:{' '}
          {changed
            .map(
              (f) =>
                `${f.label} ${initial[fid(f)]} → ${form[fid(f)]}${f.unit.replace(' 이상', '')}`,
            )
            .join(', ')}{' '}
          (저장 전). 저장[F7]을 누르면 처리·조회 기록에 남습니다.
        </TWarn>
      )}
      {msg && (
        <p className={msg.ok ? 'tt-note tt-c--ok' : 'tt-warn'} role={msg.ok ? 'status' : 'alert'}>
          {msg.ok ? '● ' : '✕ '}
          {msg.text}
        </p>
      )}

      <TSection title="변경 기록" right="삭제할 수 없습니다" />
      <table className="tt-table">
        <thead>
          <tr>
            <th>일자</th>
            <th>변경자</th>
            <th>내용</th>
          </tr>
        </thead>
        <tbody>
          {data.logs.map((l, i) => (
            <tr key={i}>
              <td className="c">{l.date}</td>
              <td>{l.actor}</td>
              <td>{l.text}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <TFKeys
        keys={[
          { label: '처리·조회 기록', fkey: 'F6', onClick: () => navigate('/bank/ops/logs') },
          {
            label: '되돌리기',
            disabled: !changed.length || busy,
            onClick: () => {
              setForm(initial);
              setMsg(null);
            },
          },
          {
            label: '저장',
            fkey: 'F7',
            kind: 'primary',
            disabled: !changed.length || busy,
            onClick: save,
          },
        ]}
      />
    </>
  );
}
