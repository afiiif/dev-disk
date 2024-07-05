/* eslint-disable no-prototype-builtins */

// ----------------------------------------
//
// Codes below are copied from:
// https://github.com/TanStack/query/blob/v5.50.1/packages/query-core/src/utils.ts#L205
//
// ----------------------------------------

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
