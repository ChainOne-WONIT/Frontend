import { useEffect, useRef } from 'react';

export type FKey = 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9';

/**
 * 단말 화면의 기능키(F2 조회, F3 목록 …)를 연결합니다.
 * 입력 칸에서 글자를 치는 중에도 기능키는 동작합니다. 브라우저 기본 동작(F5 새로고침 등)은 막습니다.
 */
export function useFKeys(map: Partial<Record<FKey, (() => void) | undefined>>) {
  const ref = useRef(map);
  useEffect(() => {
    ref.current = map;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const fn = ref.current[e.key as FKey];
      if (!fn) return;
      e.preventDefault();
      fn();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** 툴바의 [조회] 버튼처럼 화면 밖에서 기능키를 누른 것과 같은 효과를 냅니다. */
export function pressFKey(key: FKey) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}
