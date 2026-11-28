import { useCallback, useEffect, useState } from 'react';

/** 화면에서 데이터를 바꿨을 때 window에 보내는 이벤트 이름 */
export const DATA_CHANGED = 'chainone:data-changed';

interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
  setData: (d: T) => void;
}

/**
 * API를 불러오고 로딩·오류 상태를 관리합니다. deps가 바뀌거나 reload를 부르면 다시 불러옵니다.
 * refreshOnChange: 다른 화면(다른 탭)에서 처리하면 다시 불러옵니다. 단말은 탭 화면을 살려 두므로
 * 목록·대시보드에 씁니다. 조회 사유를 남기는 상세 조회에는 쓰지 않습니다 (조회 기록이 늘어납니다).
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  opts: { refreshOnChange?: boolean } = {},
): AsyncState<T> {
  const [tick, setTick] = useState(0);
  const { refreshOnChange = false } = opts;
  useEffect(() => {
    if (!refreshOnChange) return;
    const on = () => setTick((t) => t + 1);
    window.addEventListener(DATA_CHANGED, on);
    return () => window.removeEventListener(DATA_CHANGED, on);
  }, [refreshOnChange]);
  const key = JSON.stringify([...deps, tick]);
  const [result, setResult] = useState<{ key: string; data?: T; error?: Error }>({ key: '' });

  useEffect(() => {
    let alive = true;
    fn().then(
      (data) => alive && setResult({ key, data }),
      (error: Error) => alive && setResult((p) => ({ key, data: p.data, error })),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  // setData는 화면에서 처리(저장·확정 등)를 마친 뒤 부릅니다. 단말의 처리 기록·알림이 새로 불러오도록 알립니다.
  const setData = useCallback((data: T) => {
    setResult((p) => ({ ...p, data, error: undefined }));
    window.dispatchEvent(new Event(DATA_CHANGED));
  }, []);

  return { data: result.data, error: result.error, loading: result.key !== key, reload, setData };
}
