import { createError } from 'dev-disk'

type UrlParams = Record<string, string | number | boolean | null | undefined>

export const encodeObjectToQueryString = (params: UrlParams) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map((kv) => (kv as [string, string | number | boolean]).map(encodeURIComponent).join('='))
    .join('&')

type SendReqOptions<TPayload, TParams extends UrlParams> = Omit<RequestInit, 'body'> & {
  url: string
  payload?: TPayload
  params?: TParams
  gql?: string
}

const send = async <TResponse, TPayload, TParams extends UrlParams>({
  url,
  params,
  payload,
  gql,
  ...options
}: SendReqOptions<TPayload, TParams>) => {
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

type SendReq = {
  get: <TResponse, TParams extends UrlParams>(
    options: Omit<RequestInit, 'body'> & { url: string; params?: TParams },
  ) => Promise<TResponse>
  post: <TResponse, TPayload, TParams extends UrlParams>(
    options: Omit<RequestInit, 'body'> & { url: string; params?: TParams; payload?: TPayload },
  ) => Promise<TResponse>
  put: <TResponse, TPayload, TParams extends UrlParams>(
    options: Omit<RequestInit, 'body'> & { url: string; params?: TParams; payload?: TPayload },
  ) => Promise<TResponse>
  delete: <TResponse, TPayload, TParams extends UrlParams>(
    options: Omit<RequestInit, 'body'> & { url: string; params?: TParams; payload?: TPayload },
  ) => Promise<TResponse>
  gql: <TResponse, TPayload>(
    options: Omit<RequestInit, 'body'> & { url: string; gql: string; payload?: TPayload },
  ) => Promise<TResponse>
}

export const sendReq: SendReq = {
  /**
   * Send HTTP request with GET method.
   */
  get: (options) => send({ method: 'get', ...options }),
  /**
   * Send HTTP request with POST method.
   */
  post: (options) => send({ method: 'post', ...options }),
  /**
   * Send HTTP request with PUT method.
   */
  put: (options) => send({ method: 'put', ...options }),
  /**
   * Send HTTP request with DELETE method.
   */
  delete: (options) => send({ method: 'delete', ...options }),
  /**
   * Send HTTP request for GraphQL server.
   */
  gql: (options) => send({ method: 'post', ...options }),
}
