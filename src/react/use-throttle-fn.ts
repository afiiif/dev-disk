import { useEffect, useMemo, useRef } from 'react';

/**
 * Throttles a function.
 *
 * @param {Function} fn Function to be throttled.
 * @param {number} delay Delay in milliseconds.
 */
export const useThrottleFn = <T extends any[]>(fn: (...params: T) => void, delay: number) => {
  const timeout = useRef(0);

  const nextParams = useRef<T>([] as any as T);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const throttledFnMemoized = useMemo(() => {
    const throttledFn = (...params: T) => {
      nextParams.current = params;
      if (!timeout.current) {
        timeout.current = setTimeout(() => {
          fnRef.current(...nextParams.current!);
          timeout.current = 0;
        }, delay);
      }
    };
    throttledFn.cancel = () => {
      clearTimeout(timeout.current);
      timeout.current = 0;
    };
    return throttledFn;
  }, [delay]);

  useEffect(() => {
    return () => throttledFnMemoized.cancel();
  }, [throttledFnMemoized]);

  return throttledFnMemoized;
};
