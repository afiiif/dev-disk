/* eslint-disable react-hooks/refs */

import { useCallback, useRef } from 'react';

/**
 * Returns a stable function reference that always calls the latest version
 * of the provided function.
 *
 * This hook is useful when passing callbacks to dependencies that require
 * referential stability (e.g. `useEffect`, event listeners, or memoized
 * components) while still ensuring the callback logic stays up-to-date.
 */
export const useStableFn = <T extends (...args: any[]) => any>(fn: T): T => {
  const fn_ = useRef(fn);
  fn_.current = fn;
  return useCallback((...args: Parameters<T>) => fn_.current(...args), []) as T;
};
