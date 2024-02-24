import { useEffect, useMemo, useRef } from 'react'

/**
 * Throttles a function.
 *
 * @param {Function} fn Function to be throttled.
 * @param {number} delay Delay in milliseconds.
 */
export const useThrottleFn = <T extends any[]>(fn: (...params: T) => void, delay: number) => {
  const timeout = useRef<NodeJS.Timeout>()

  const nextParams = useRef<T>()
  const fnRef = useRef(fn)
  fnRef.current = fn

  const throttledFnMemoized = useMemo(() => {
    const throttledFn = (...params: T) => {
      nextParams.current = params
      if (!timeout.current) {
        timeout.current = setTimeout(() => {
          fnRef.current(...nextParams.current!)
          timeout.current = undefined
        }, delay)
      }
    }
    throttledFn.cancel = () => {
      clearTimeout(timeout.current)
      timeout.current = undefined
    }
    return throttledFn
  }, [delay])

  useEffect(() => {
    return () => throttledFnMemoized.cancel()
  }, [throttledFnMemoized])

  return throttledFnMemoized
}
