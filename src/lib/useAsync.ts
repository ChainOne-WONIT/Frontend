import { useCallback, useEffect, useState } from 'react';

interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  reload: () => void;
  setData: (d: T) => void;
}

/** API를 불러오고 로딩·오류 상태를 관리합니다. deps가 바뀌거나 reload를 부르면 다시 불러옵니다. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [tick, setTick] = useState(0);
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
  const setData = useCallback(
    (data: T) => setResult((p) => ({ ...p, data, error: undefined })),
    [],
  );

  return { data: result.data, error: result.error, loading: result.key !== key, reload, setData };
}
