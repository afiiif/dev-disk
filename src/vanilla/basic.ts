export type Maybe<T> = T | null | undefined;

/**
 * Empty function.
 */
export const noop = () => {};

/**
 * Identity function.
 *
 * It accepts 1 argument, and simply return it.
 *
 * `const identity = value => value`
 */
export const identity = <T>(value: T) => value;

/**
 * If the value is a function, it will invoke the function.\
 * If the value is not a function, it will just return it.
 */
export const getValue = <T, P extends any[]>(
  valueOrComputeValueFn: T | ((...params: P) => T),
  ...params: P
) => {
  if (typeof valueOrComputeValueFn === 'function') {
    return (valueOrComputeValueFn as (...params: P) => T)(...params);
  }
  return valueOrComputeValueFn;
};

/**
 * Check if a value is not `undefined` and not `null`.
 */
export const hasValue = (value: any) => value !== undefined && value !== null;

/**
 * Get a swaped key-value object.
 */
export const swapKeyValue = <K extends string | number, V extends string | number>(
  obj: Record<K, V>,
): Record<V, K> => {
  const result = {} as Record<V, K>;
  for (const key in obj) result[obj[key]] = key;
  return result;
};

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
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Split string into 2 parts.
 *
 * @example
 * ```js
 * split2('Lorem_Ipsum_Dolor_Sit_Amet', '_');
 * // Output: ['Lorem', 'Ipsum_Dolor_Sit_Amet']
 * ```
 */
export const split2 = (str: string, separator: string) => {
  const [firstPart, ...restParts] = str.split(separator);
  return [firstPart, restParts.join(separator)];
};

/**
 * A super minimalist className utility.\
 * Basically it wipes out the falsy values and then concat the string.
 *
 * @example
 * ```js
 * const isDisabled = false;
 * const className = cn('foo', 'bar', isDisabled && 'baz');
 * // Output: 'foo bar'
 * ```
 */
export const cn = (...classNames: (string | boolean | undefined | null)[]) =>
  classNames.filter(Boolean).join(' ');

/**
 * Check if this runs on browser.
 */
export const isClient = typeof window !== 'undefined' && !('Deno' in window);
