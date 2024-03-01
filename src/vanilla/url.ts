/**
 * Get query string (search params) from an object.
 */
export const objectToQueryString = (
  params: Record<string, string | number | boolean | null | undefined>,
) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map((kv) => (kv as [string, string | number | boolean]).map(encodeURIComponent).join('='))
    .join('&')

/**
 * Get object from query string (search params).
 */
export const queryStringToObject = <T extends Record<string | number, any>>(
  queryString: string,
): T => {
  const params = new URLSearchParams(queryString)
  const paramsObj = Object.fromEntries([...params.keys()].map((val) => [val, params.get(val)]))
  return paramsObj as T
}
