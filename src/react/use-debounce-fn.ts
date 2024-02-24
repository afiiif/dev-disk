import { useEffect, useMemo, useRef } from 'react'

/**
 * Debounces a function.
 *
 * @param {Function} fn Function to be debounced.
 * @param {number} delay Delay in milliseconds.
 */
export const useDebounceFn = <T extends any[]>(fn: (...params: T) => void, delay: number) => {
  const timeout = useRef<NodeJS.Timeout>()

  const fnRef = useRef(fn)
  fnRef.current = fn

  const debouncedFnMemoized = useMemo(() => {
    const debouncedFn = (...params: T) => {
      clearTimeout(timeout.current)
      timeout.current = setTimeout(() => {
        fnRef.current(...params)
      }, delay)
    }
    debouncedFn.cancel = () => clearTimeout(timeout.current)
    return debouncedFn
  }, [delay])

  useEffect(() => {
    return () => debouncedFnMemoized.cancel()
  }, [debouncedFnMemoized])

  return debouncedFnMemoized
}
