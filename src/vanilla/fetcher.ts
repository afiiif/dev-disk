import { createError } from './utils.ts'

type UrlParams = Record<string, string | number | boolean | null | undefined>

export const encodeObjectToQueryString = (params: UrlParams) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map((kv) => (kv as [string, string | number | boolean]).map(encodeURIComponent).join('='))
    .join('&')

export const simpleFetch = async <TResponse, TPayload>({
  url,
  params,
  payload,
  gql,
  ...options
}: Omit<RequestInit, 'body'> & { url: string; payload?: TPayload } & (
    | { params?: UrlParams; gql?: never }
    | { params?: never; gql?: string }
  )) => {
  const defaultOptions: RequestInit = {}
  if (gql) {
    defaultOptions.method = 'POST'
    defaultOptions.body = JSON.stringify({ query: gql, variables: payload })
  } else if (options.method && options.method.toLowerCase() !== 'get') {
    defaultOptions.body = payload === undefined ? null : JSON.stringify(payload)
  }

  const finalUrl = params ? [url, encodeObjectToQueryString(params)].join('?') : url

  const finalOptions = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...defaultOptions,
    ...options,
  }

  const res = await fetch(finalUrl, finalOptions)

  const contentType = res.headers.get('content-type')
  const isJsonFile = /\.json(\?.+)?$/i.test(finalUrl)

  if (contentType?.includes('application/json') || isJsonFile) {
    const resJson = await res.json()

    if (gql) {
      if (resJson.errors) {
        throw createError('Error GraphQL response', {
          contentType,
          status: res.status,
          statusText: res.statusText,
          response: resJson.errors,
          request: finalOptions,
        })
      }
      return resJson.data as TResponse
    }

    if (res.ok) return resJson as TResponse

    throw createError('Fetch error', {
      contentType,
      status: res.status,
      statusText: res.statusText,
      response: resJson,
      request: finalOptions,
    })
  }

  // Try getting raw text response, then throw error with that text response.
  const resText = await res.text().catch(() => undefined)
  throw createError('Response type is not a JSON', {
    contentType,
    status: res.status,
    statusText: res.statusText,
    response: resText,
    request: finalOptions,
  })
}
