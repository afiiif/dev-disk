export type Maybe<T> = T | null | undefined

/**
 * Check if this runs on browser.
 */
export const isClient = typeof window !== 'undefined' && !('Deno' in window)

/**
 * Empty function.
 */
export const noop = () => {}

/**
 * Identity function.
 *
 * It accepts 1 argument, and simply return it.
 *
 * `const identity = value => value`
 */
export const identity = <T>(value: T) => value

/**
 * Check if a value is not `undefined` and not `null`.
 */
export const hasValue = (value: any) => value !== undefined && value !== null

/**
 * Check if a value is object.
 */
export const isObject = (value: any) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * If the value is a function, it will invoke the function.\
 * If the value is not a function, it will just return it.
 */
export const getValue = <T, P extends any[]>(
  valueOrComputeValueFn: T | ((...params: P) => T),
  ...params: P
) => {
  if (typeof valueOrComputeValueFn === 'function') {
    return (valueOrComputeValueFn as (...params: P) => T)(...params)
  }
  return valueOrComputeValueFn
}

/**
 * Get a swaped key-value object.
 */
export const swapKeyValue = <K extends string | number, V extends string | number>(
  obj: Record<K, V>,
): Record<V, K> => {
  const result = {} as Record<V, K>
  for (const key in obj) result[obj[key]] = key
  return result
}

/**
 * Delay the next operation for a specific duration (in milliseconds).
 *
 * @example
 * ```js
 * doSomething();
 * await sleep(5000); // delay next operation by 5 seconds
 * doSomethingElse();
 * ```
 */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
