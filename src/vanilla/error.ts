/**
 * Create an Error instance with custom props.
 */
export const createError = (message: string, props: Record<string, any>) => {
  const error = Object.assign(new Error(message), props);
  return error;
};

/**
 * Higher-order function to prevent a function throwing error when invoked.
 *
 * It returns `[value, error]` instead, enabling error-first handling without `try/catch`.
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
      const result = fn(...args);
      return [result];
    } catch (err) {
      return [undefined, err];
    }
  };

/**
 * Prevent a Promise from throwing a rejection error.
 *
 * It returns `[value, error]` instead, enabling error-first handling without `try/catch`.
 *
 * @example
 * ```ts
 * const [value, error] = await noReject(getProductDetail({ id: 3 }))
 * if (error) return showToast('Error getting product detail')
 * ```
 */
export const noReject = async <R>(
  promise: Promise<R>,
): Promise<[R, undefined?] | [undefined, unknown]> => {
  try {
    const result = await promise;
    return [result];
  } catch (err) {
    return [undefined, err];
  }
};
