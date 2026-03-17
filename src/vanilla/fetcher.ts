import { createError } from './error.ts';

type UrlParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Get query string (search params) from an object.
 */
export const objectToQueryString = (params: UrlParams): string => {
  let qs = '';
  for (const key in params) {
    const value = params[key];
    if (value === undefined || value === null) continue;
    if (qs) qs += '&';
    qs += encodeURIComponent(key);
    qs += '=';
    qs += encodeURIComponent(String(value));
  }
  return qs;
};

type SendReqOptions = Omit<RequestInit, 'body'> & {
  url: string;
  payload?: any;
  params?: UrlParams;
  gql?: string;
};
const send = async <TResponse>({ url, params, payload, gql, ...options }: SendReqOptions) => {
  const defaultOptions: RequestInit = {};
  if (gql) {
    defaultOptions.method = 'POST';
    defaultOptions.body = JSON.stringify({ query: gql, variables: payload });
  } else if (payload !== undefined) {
    defaultOptions.body = JSON.stringify(payload);
  }

  const finalUrl = params ? `${url}?${objectToQueryString(params)}` : url;
  const finalOptions = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...defaultOptions,
    ...options,
  };

  const res = await fetch(finalUrl, finalOptions);

  const contentType = res.headers.get('content-type');
  const isJsonFile = /\.json(\?.+)?$/i.test(finalUrl);

  if (contentType?.includes('application/json') || isJsonFile) {
    const resJson = await res.json();

    if (!res.ok) {
      throw createError('Fetch error', {
        contentType,
        status: res.status,
        statusText: res.statusText,
        response: resJson,
        request: finalOptions,
      });
    }

    if (gql) {
      if (resJson.errors) {
        throw createError('Error GraphQL response', {
          contentType,
          status: res.status,
          statusText: res.statusText,
          response: resJson.errors,
          request: finalOptions,
        });
      }
      return resJson.data as TResponse;
    }

    return resJson as TResponse;
  }

  // Try getting raw text response, then throw error with that text response.
  const resText = await res.text().catch(() => undefined);
  throw createError('Response type is not a JSON', {
    contentType,
    status: res.status,
    statusText: res.statusText,
    response: resText,
    request: finalOptions,
  });
};

type BaseOptions = Omit<RequestInit, 'body' | 'method'> & { url: string; params?: UrlParams };

/**
 * Send HTTP request.
 */
export const sendReq = {
  /**
   * Send HTTP request with GET method.
   */
  get: <TResponse>(options: BaseOptions) => send<TResponse>({ method: 'get', ...options }),
  /**
   * Send HTTP request with POST method.
   */
  post: <TResponse>(options: BaseOptions & { payload?: any }) =>
    send<TResponse>({ method: 'post', ...options }),
  /**
   * Send HTTP request with PUT method.
   */
  put: <TResponse>(options: BaseOptions & { payload?: any }) =>
    send<TResponse>({ method: 'put', ...options }),
  /**
   * Send HTTP request with DELETE method.
   */
  delete: <TResponse>(options: BaseOptions & { payload?: any }) =>
    send<TResponse>({ method: 'delete', ...options }),
};

/**
 * Send HTTP request for GraphQL server.
 */
export const sendReqGQL = <TResponse>(
  options: BaseOptions & { method?: RequestInit['method']; payload?: any },
) => send<TResponse>({ ...options, method: options.method || 'post' });
