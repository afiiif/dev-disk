/* eslint-disable no-prototype-builtins */

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
 * Create an Error instance with custom props.
 */
export const createError = (message: string, props: Record<string, any>) => {
  const error = Object.assign(new Error(message), props)
  return error
}

const hasObjectPrototype = (value: any) => {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export const isPlainArray = (value: any) => {
  return Array.isArray(value) && value.length === Object.keys(value).length
}

export const isPlainObject = (value: any) => {
  if (!hasObjectPrototype(value)) return false

  // If has no constructor
  const ctor = value.constructor
  if (typeof ctor === 'undefined') return true

  // If has modified prototype
  const prot = ctor.prototype
  if (!hasObjectPrototype(prot)) return false

  // If constructor does not have an Object-specific method
  if (!prot.hasOwnProperty('isPrototypeOf')) return false

  // Most likely a plain Object
  return true
}

/**
 * Get stable hash string from any value.
 */
export const getHash = (value?: any) =>
  // Copied from: https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts
  JSON.stringify(value, (_, val) =>
    isPlainObject(val)
      ? Object.keys(val)
          .sort()
          .reduce((result, key) => {
            result[key] = val[key]
            return result
          }, {} as any)
      : val,
  )

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
