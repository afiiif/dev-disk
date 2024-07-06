/**
 * Create an Error instance with custom props.
 */
export const createError = (message: string, props: Record<string, any>) => {
  const error = Object.assign(new Error(message), props)
  return error
}

/**
 * Higher-order function to prevent a function throwing error when invoked.
 *
 * It returns an array `[value, error]` instead.\
 * It makes error-first handling possible.
 *
 * Check the result using `if` statement, no more `try-catch` statement.
 *
 * @example
 * ```js
 * const [value, error] = noThrow(JSON.parse)(data);
 * if (error) return showToast('Invalid JSON-string input');
 * ```
 */
export const noThrow =
  <A extends any[], R>(fn: (...args: A) => R) =>
  (...args: A): [R, undefined?] | [undefined, unknown] => {
    try {
      const result = fn(...args)
      return [result]
    } catch (err) {
      return [undefined, err]
    }
  }

/**
 * Higher-order function to prevent an async function throwing promise-rejection error when invoked.
 *
 * It returns an array `[value, error]` instead.\
 * It makes error-first handling possible.
 *
 * Check the result using `if` statement, no more `try-catch` statement.
 *
 * @example
 * ```js
 * const [value, error] = await noReject(getProductDetail)({ id: 3 });
 * if (error) return showToast('Error getting product detail');
 * ```
 */
export const noReject =
  <A extends any[], R>(fn: (...args: A) => Promise<R>) =>
  async (...args: A): Promise<[R, undefined?] | [undefined, unknown]> => {
    try {
      const result = await fn(...args)
      return [result]
    } catch (err) {
      return [undefined, err]
    }
  }
