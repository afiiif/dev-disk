import { useRef } from 'react';
import { getHash } from '../vanilla.ts';

/**
 * Returns a stable object reference together with a deterministic hash.
 *
 * If the hash of the provided object changes, the stored reference will be
 * updated. Otherwise, the previous object reference is reused to preserve
 * referential stability across renders.
 *
 * This is useful when you want to:
 * - detect structural changes in objects
 * - stabilize object references for dependency arrays
 * - memoize values based on deep equality rather than reference equality
 */
export const useStableObject = <T>(obj: T): [T, string] => {
  const value = useRef<[T, string]>([obj, getHash(obj)]);

  const newHash = getHash(obj);
  if (value.current[1] !== newHash) {
    value.current = [obj, newHash];
  }

  return value.current;
};
