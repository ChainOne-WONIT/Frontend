import './RiskGauge.css';

/** 점수 구간: 0~39 안정(초록) · 40~69 주의(주황) · 70~100 위험(빨강) */
const BANDS = [
  { from: 0, to: 40, color: '#6cc56c', tone: 'ok' },
  { from: 40, to: 70, color: '#e8a33d', tone: 'warn' },
  { from: 70, to: 100, color: '#d9534f', tone: 'bad' },
] as const;

const CX = 120;
const CY = 118;
const R = 92;

/** 점수(0~100)를 반원 위의 좌표로: 0은 왼쪽 끝, 100은 오른쪽 끝 */
function point(score: number, r = R) {
  const a = Math.PI * (1 - score / 100);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
}

function arc(from: number, to: number) {
  const [x1, y1] = point(from);
  const [x2, y2] = point(to);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function bandOf(score: number) {
  return BANDS.find((b) => score < b.to) ?? BANDS[BANDS.length - 1];
}

/** 신용위험 반원 게이지: 초록·주황·빨강 구간, 바늘, 가운데 점수 */
export function RiskGauge({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, score));
  const band = bandOf(s);
  // 바늘은 가운데 점수 아래까지만 오도록 짧게
  const [nx, ny] = point(s, 48);
  return (
    <svg
      className="gauge"
      viewBox="0 0 240 160"
      role="img"
      aria-label={`신용위험 점수 100점 중 ${Math.round(s)}점`}
    >
      {BANDS.map((b, i) => (
        <path
          key={b.from}
          d={arc(b.from + (i ? 0.6 : 0), b.to - (i < BANDS.length - 1 ? 0.6 : 0))}
          stroke={b.color}
          strokeWidth="18"
          fill="none"
          strokeLinecap={i === 0 || i === BANDS.length - 1 ? 'round' : 'butt'}
        />
      ))}
      <line
        x1={CX}
        y1={CY}
        x2={nx}
        y2={ny}
        stroke="#0b1f3a"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx={CX} cy={CY} r="7" fill="#0b1f3a" />
      {/* 점수는 가운데에. 바늘 위에 그리고 흰 테두리를 둘러 겹쳐도 잘 읽히게 합니다 */}
      <text x={CX} y={CY - 40} textAnchor="middle" className="gauge__score" fill={band.color}>
        {Math.round(s)}
      </text>
      <text x={CX - R} y={CY + 26} textAnchor="middle" className="gauge__tick">
        0
      </text>
      <text x={CX + R} y={CY + 26} textAnchor="middle" className="gauge__tick">
        100
      </text>
      <text x={CX} y={CY + 30} textAnchor="middle" className="gauge__max">
        / 100
      </text>
    </svg>
  );
}
