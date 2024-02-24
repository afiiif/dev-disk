// import { useEffect, useMemo, useRef } from 'react'
// That doesn't work in ESM, because React libs are CJS only.
// See: https://github.com/pmndrs/valtio/issues/452
// The following is a workaround until ESM is supported.
import ReactExports from 'react'

const { useEffect, useMemo, useRef } = ReactExports

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
