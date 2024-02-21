import { StoresInitializer } from './stores.ts'
import { Maybe, getValue, hasValue, identity, isClient, noop } from './utils.ts'

// ----------------------------------------
// Type definitions

export type Query = {
  key?: Record<string, any>
  pageParam?: any
  response?: any
  data?: any
  error?: any
}

export type QueryState<T extends Query> = QueryStatus<T> & {
  key: T['key'] extends Record<string, any> ? T['key'] : Record<string, never>
  isWaiting: boolean
  isRefetching: boolean
  isRefetchError: boolean
  isPreviousData: boolean
  isOptimisticData: boolean
  error: T['error'] | undefined
  errorUpdatedAt: number | undefined
  retryCount: number
  isGoingToRetry: boolean
} & Pagination<T['pageParam']>

type QueryStatus<T extends Query> =
  | {
      status: 'pending'
      isPending: true
      isSuccess: false
      isError: false
      data: undefined
      response: undefined
      responseUpdatedAt: undefined
    }
  | {
      status: 'success'
      isPending: false
      isSuccess: true
      isError: false
      data: T['data']
      response: T['response']
      responseUpdatedAt: number | undefined // Undefined to trigger refetch (when invalidate query)
    }
  | {
      status: 'error'
      isPending: false
      isSuccess: false
      isError: true
      data: undefined | T['data']
      response: undefined | T['response']
      responseUpdatedAt: undefined
    }

type Pagination<T> = {
  pageParam: Maybe<T>
  pageParams: Maybe<T>[]
  hasNextPage: boolean
  isWaitingNextPage: boolean
  retryNextPageCount: number
  isGoingToRetryNextPage: boolean
}

export type QueryStoreApi<T extends Query> = {
  internal: {
    timeout: {
      retry?: number
      retryNextPage?: number
      refetchInterval?: number
      garbageCollection?: number
    }
    promise: { fetch?: Promise<QueryState<T>>; fetchNextPage?: Promise<QueryState<T>> }
    ignoreResponse: { fetch: boolean; fetchNextPage: boolean }
  }
  fetch: {
    (): Promise<QueryState<T>>
    cacheFirst: () => Promise<QueryState<T>>
  }
  fetchNextPage: () => Promise<QueryState<T>>
  reset: () => void
  invalidate: () => void
  optimisticUpdate: (response: T['response'] | ((prevState: QueryState<T>) => T['response'])) => {
    revert: () => void
    invalidate: () => void
  }
}

export type InitQueryOptions<T extends Query> = {
  queryFn: (key: T['key'], state: QueryState<T>) => Promise<T['response']>
  staleTime?: number
  enabled?: boolean | ((key: T['key']) => boolean)
  onSuccess?: (response: T['response'], stateBeforeCallQuery: QueryState<T>) => void
  onError?: (error: T['error'], stateBeforeCallQuery: QueryState<T>) => void
  onSettled?: (stateBeforeCallQuery: QueryState<T>) => void
  select?: (response: T['response'], state: QueryState<T>) => T['data']
  getNextPageParam?: (
    lastPage: T['response'],
    stateBeforeCallQuery: QueryState<T>,
  ) => Maybe<T['pageParam']>
  maxRetryCount?: number | ((error: T['error'], prevState: QueryState<T>) => number)
  retryDelay?: number | ((error: T['error'], prevState: QueryState<T>) => number)
  refetchInterval?: number | false | ((state: QueryState<T>) => number | false)
}

// ----------------------------------------
// Source code

const getSuccessState = <R, D, P>(response: R, data: D, pageParams: P[]) => {
  const pageParam = pageParams[pageParams.length - 1]
  return {
    status: 'success' as const,
    isPending: false as const,
    isSuccess: true as const,
    isError: false as const,
    isWaiting: false,
    isRefetching: false,
    isRefetchError: false,
    isPreviousData: false,
    isOptimisticData: false,
    data,
    response,
    responseUpdatedAt: Date.now(),
    error: undefined,
    errorUpdatedAt: undefined,
    retryCount: 0,
    pageParam,
    pageParams: pageParams,
    hasNextPage: hasValue(pageParam),
  }
}

const getErrorState = <E, P>(error: E, pageParams: P[]) => {
  const pageParam = pageParams[pageParams.length - 1]
  return {
    isWaiting: false,
    isRefetching: false,
    error,
    errorUpdatedAt: Date.now(),
    pageParam,
    hasNextPage: hasValue(pageParam),
  }
}

export const initQuery = <T extends Query>(options: InitQueryOptions<T>) => {
  const {
    queryFn,
    staleTime = 2000, // 2 seconds
    enabled = true,
    onSuccess = noop,
    onError,
    onSettled = noop,
    select = identity as NonNullable<InitQueryOptions<T>['select']>,
    getNextPageParam = () => undefined,
    maxRetryCount = 1,
    retryDelay = 2000, // 2 seconds
    refetchInterval = false,
  } = options

  const initializer: StoresInitializer<
    QueryState<T>,
    T['key'] extends Record<string, any> ? T['key'] : Record<string, never>,
    QueryStoreApi<T>
  > = (store) => {
    const { set, get, getInitial, getSubscribers, key } = store

    store.internal = {
      timeout: {},
      promise: {},
      ignoreResponse: { fetch: true, fetchNextPage: true },
    }

    const getRetryProps = (error: T['error'], retryCount: number) => {
      const prevState = get()
      const maxRetryCountValue = getValue(maxRetryCount, error, prevState) || 0
      const delay = getValue(retryDelay, error, prevState) || 1
      return { shouldRetry: retryCount < maxRetryCountValue, delay }
    }

    const fetch = (): Promise<QueryState<T>> => {
      const state = get()

      // 🔴
      if (!getValue(enabled, key)) return Promise.resolve(state)
      if (state.isWaiting) return store.internal.promise.fetch!

      // 🟢
      store.internal.promise.fetch = new Promise<QueryState<T>>((resolve) => {
        let __newData: T['data']
        const __newPageParams: Maybe<T['pageParam']>[] = [state.pageParams[0]]

        const callQuery = (innerResolve = resolve) => {
          store.internal.ignoreResponse.fetch = false
          set({ isGoingToRetry: false, isWaiting: true, isRefetching: !state.isPending })

          const stateBeforeCallQuery = {
            ...get(),
            pageParam: __newPageParams[__newPageParams.length - 1],
          }
          queryFn(key, stateBeforeCallQuery)
            .then((response) => {
              if (store.internal.ignoreResponse.fetch) {
                set({ isWaiting: false, isRefetching: false })
                return innerResolve(get())
              }
              const nextPageParam = getNextPageParam(response, stateBeforeCallQuery)
              __newPageParams.push(nextPageParam)
              __newData = select(response, { ...stateBeforeCallQuery, data: __newData })
              if (hasValue(nextPageParam) && __newPageParams.length < state.pageParams.length) {
                return callQuery(resolve)
              }
              set(getSuccessState(response, __newData, __newPageParams))
              innerResolve(get())
              onSuccess(response, stateBeforeCallQuery)
              const refetchIntervalValue = isClient && getValue(refetchInterval, get())
              if (refetchIntervalValue) {
                store.internal.timeout.refetchInterval = window.setTimeout(
                  fetch,
                  refetchIntervalValue,
                )
              }
            })
            .catch((error: T['error']) => {
              const prevState = get()
              const { shouldRetry, delay } = getRetryProps(error, prevState.retryCount)
              if (shouldRetry) {
                set({ isWaiting: false, isGoingToRetry: true })
                if (isClient) {
                  store.internal.timeout.retry = window.setTimeout(() => {
                    set({ retryCount: prevState.retryCount + 1 })
                    callQuery(innerResolve)
                  }, delay)
                }
                return
              }
              const nextState = getErrorState(error, __newPageParams)
              const isRefetchError = prevState.isSuccess && !prevState.isPreviousData
              if (isRefetchError) set({ ...nextState, isRefetchError })
              else set({ ...nextState, status: 'error' })
              innerResolve(get())
              if (onError) onError(error, stateBeforeCallQuery)
              else console.error(error, get())
            })
            .finally(() => {
              onSettled(stateBeforeCallQuery)
            })
        }
        callQuery()
      })

      clearTimeout(store.internal.timeout.refetchInterval) // Cancel refetch interval
      clearTimeout(store.internal.timeout.retry) // Cancel retry
      return store.internal.promise.fetch
    }

    store.fetch = Object.assign(fetch, {
      cacheFirst: () => {
        const state = get()
        const isStale = !state.responseUpdatedAt || Date.now() > state.responseUpdatedAt + staleTime
        if (!isStale) return Promise.resolve(state)
        return fetch()
      },
    })

    store.fetchNextPage = (): Promise<QueryState<T>> => {
      const state = get()

      // 🔴
      if (typeof options.getNextPageParam !== 'function') {
        console.warn('Calling fetchNextPage with invalid getNextPageParam option')
        return Promise.resolve(state)
      }
      if (state.isPending) return Promise.resolve(fetch())
      if (state.isRefetching && state.isGoingToRetry) {
        // Wait the retry process, and trigger fetchNextPage after that
        return store.internal.promise.fetch!.then(() => store.fetchNextPage())
      }
      if (!getValue(enabled, key) || !state.hasNextPage) return Promise.resolve(state)
      if (state.isWaitingNextPage) return store.internal.promise.fetchNextPage!

      // 🟢
      store.internal.promise.fetchNextPage = new Promise<QueryState<T>>((resolve) => {
        set({ isWaitingNextPage: true, isGoingToRetryNextPage: false })
        const stateBeforeCallQuery = get()
        queryFn(key, stateBeforeCallQuery)
          .then((response) => {
            if (store.internal.ignoreResponse.fetchNextPage) {
              set({ isWaitingNextPage: false })
              return resolve(get())
            }
            const newPageParam = getNextPageParam(response, stateBeforeCallQuery)
            set({
              isWaitingNextPage: false,
              response,
              responseUpdatedAt: Date.now(),
              data: select(response, get()),
              pageParam: newPageParam,
              pageParams: stateBeforeCallQuery.pageParams.concat(newPageParam),
              hasNextPage: hasValue(newPageParam),
            })
            resolve(get())
            onSuccess(response, stateBeforeCallQuery)
            const refetchIntervalValue = isClient && getValue(refetchInterval, get())
            if (refetchIntervalValue) {
              store.internal.timeout.refetchInterval = window.setTimeout(
                fetch,
                refetchIntervalValue,
              )
            }
          })
          .catch((error: T['error']) => {
            const prevState = get()
            const { shouldRetry, delay } = getRetryProps(error, prevState.retryNextPageCount)
            if (shouldRetry) {
              set({ isWaitingNextPage: false, isGoingToRetryNextPage: true })
              store.internal.timeout.retryNextPage = window.setTimeout(() => {
                set({ retryNextPageCount: prevState.retryNextPageCount + 1 })
                resolve(store.fetchNextPage())
              }, delay)
              return
            }
            set({ isWaitingNextPage: false, error, errorUpdatedAt: Date.now() })
            resolve(get())
            if (onError) onError(error, stateBeforeCallQuery)
            else console.error(error, get())
          })
          .finally(() => {
            onSettled(stateBeforeCallQuery)
          })
      })

      store.internal.ignoreResponse.fetch = true // Cancel refetching process
      clearTimeout(store.internal.timeout.retryNextPage) // Cancel retry next page
      clearTimeout(store.internal.timeout.refetchInterval) // Cancel refetch interval
      return store.internal.promise.fetchNextPage
    }

    store.reset = () => {
      clearTimeout(store.internal.timeout.retry)
      clearTimeout(store.internal.timeout.retryNextPage)
      clearTimeout(store.internal.timeout.refetchInterval)
      store.internal.ignoreResponse.fetch = true
      store.internal.ignoreResponse.fetchNextPage = true
      set(getInitial())
    }

    store.invalidate = () => {
      set({ responseUpdatedAt: undefined })
      if (getSubscribers().size > 0) fetch()
    }

    store.optimisticUpdate = (
      response: T['response'] | ((prevState: QueryState<T>) => T['response']),
    ) => {
      const prevState = get()
      const optimisticResponse = getValue(response, prevState)
      set({
        isOptimisticData: true,
        response: optimisticResponse,
        data: select(optimisticResponse, prevState),
      })
      store.internal.ignoreResponse.fetch = true
      store.internal.ignoreResponse.fetchNextPage = true
      const revert = () => {
        set({
          isOptimisticData: false,
          response: prevState.response,
          data: prevState.data,
        })
      }
      return { revert, invalidate: store.invalidate }
    }

    return {
      key,
      status: 'pending',
      isPending: true,
      isSuccess: false,
      isError: false,
      isWaiting: false,
      isRefetching: false,
      isRefetchError: false,
      isPreviousData: false,
      isOptimisticData: false,
      data: undefined,
      response: undefined,
      responseUpdatedAt: undefined,
      error: undefined,
      errorUpdatedAt: undefined,
      retryCount: 0,
      isGoingToRetry: false,
      pageParam: undefined,
      pageParams: [undefined],
      hasNextPage: false,
      isWaitingNextPage: false,
      retryNextPageCount: 0,
      isGoingToRetryNextPage: false,
    }
  }

  return initializer
}
