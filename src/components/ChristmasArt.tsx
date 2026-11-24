import type { CSSProperties } from 'react';
import characters from '../assets/characters.png';
import './ChristmasArt.css';

/**
 * 로그인 화면 캐릭터 그림 (크리스마스 버전)
 * 원본 그림 위에 산타모자와 눈 내리는 효과를 겹쳐 그립니다.
 * 좌표는 원본 그림(524×381) 기준입니다.
 */

// [모자 가운데 x, 모자 밑단 y, 너비, 기울기(도)]
const HATS: [number, number, number, number][] = [
  [148, 106, 80, 12], // 곰
  [280, 76, 64, -8], // 원숭이 (원래 모자를 덮음)
  [396, 110, 80, 10], // 노란 벌
  [210, 170, 70, -10], // 파란 벌
  [322, 160, 68, 14], // 분홍 벌
  [265, 238, 54, -6], // 병아리
];

function SantaHat({ x, y, w, tilt }: { x: number; y: number; w: number; tilt: number }) {
  const s = w / 100;
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`}>
      {/* 모자 몸통 */}
      <path
        d="M-44 -4 C-38 -46 -14 -76 22 -78 C44 -79 60 -66 62 -50 C52 -58 38 -56 30 -44 C38 -30 44 -16 44 -4 Z"
        fill="#e03131"
      />
      {/* 그림자 */}
      <path d="M8 -4 C14 -30 22 -52 30 -44 C38 -30 44 -16 44 -4 Z" fill="#b42318" opacity="0.55" />
      {/* 하이라이트 */}
      <path
        d="M-30 -14 C-26 -40 -10 -62 12 -68"
        stroke="#ff8787"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      {/* 흰 털 테두리 */}
      <rect x="-54" y="-14" width="108" height="24" rx="12" fill="#ffffff" />
      <rect x="-54" y="-2" width="108" height="12" rx="6" fill="#e7eef5" />
      {/* 방울 */}
      <circle cx="62" cy="-50" r="13" fill="#ffffff" />
      <circle cx="58" cy="-54" r="5" fill="#ffffff" opacity="0.9" />
      <circle cx="66" cy="-45" r="6" fill="#e7eef5" />
    </g>
  );
}

/*
 * 눈송이: 멀리(작고 흐리고 느림) · 중간 · 가까이(크고 조금 빠르고 살짝 번짐) 3겹으로 나눕니다.
 * 각 눈송이는 아래로 천천히 떨어지면서(fall) 좌우로 살랑입니다(sway).
 * 매번 같은 모양이 나오도록 고정된 값으로 만듭니다.
 */
const LAYERS = [
  { share: 0.5, size: [2, 3.5], fall: [24, 32], sway: [8, 14], opacity: [0.45, 0.7], blur: 0 },
  { share: 0.35, size: [3.5, 5.5], fall: [17, 23], sway: [12, 22], opacity: [0.7, 0.9], blur: 0 },
  { share: 0.15, size: [6, 8.5], fall: [12, 16], sway: [18, 30], opacity: [0.85, 1], blur: 0.8 },
] as const;

const FLAKE_COUNT = 64;
const FLAKES = Array.from({ length: FLAKE_COUNT }, (_, i) => {
  const r = (n: number) => (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
  const between = ([a, b]: readonly [number, number], n: number) => a + (b - a) * r(n);
  const pick = i / FLAKE_COUNT;
  const layer =
    pick < LAYERS[0].share
      ? LAYERS[0]
      : pick < LAYERS[0].share + LAYERS[1].share
        ? LAYERS[1]
        : LAYERS[2];
  const fall = between(layer.fall, 3);
  return {
    left: r(1) * 100,
    size: between(layer.size, 2),
    fall,
    delay: -r(4) * fall, // 처음부터 화면 곳곳에 흩어져 있도록
    sway: between(layer.sway, 5) * (r(7) > 0.5 ? 1 : -1),
    swayTime: 4 + r(6) * 4,
    opacity: between(layer.opacity, 8),
    blur: layer.blur,
  };
});

export function ChristmasArt({ className = '' }: { className?: string }) {
  return (
    <div className={`xmas ${className}`}>
      <img className="xmas__img" src={characters} alt="산타모자를 쓴 체인원 캐릭터들과 내리는 눈" />
      <svg
        className="xmas__hats"
        viewBox="0 0 524 381"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        {HATS.map(([x, y, w, tilt], i) => (
          <SantaHat key={i} x={x} y={y} w={w} tilt={tilt} />
        ))}
      </svg>
      <div className="xmas__snow" aria-hidden="true">
        {FLAKES.map((f, i) => (
          <span
            key={i}
            className="xmas__fall"
            style={{
              left: `${f.left}%`,
              animationDuration: `${f.fall}s`,
              animationDelay: `${f.delay}s`,
            }}
          >
            <span
              className="xmas__flake"
              style={
                {
                  width: f.size,
                  height: f.size,
                  opacity: f.opacity,
                  filter: f.blur ? `blur(${f.blur}px)` : undefined,
                  animationDuration: `${f.swayTime}s`,
                  animationDelay: `${f.delay}s`,
                  '--sway': `${f.sway}px`,
                } as CSSProperties
              }
            />
          </span>
        ))}
      </div>
    </div>
  );
}
