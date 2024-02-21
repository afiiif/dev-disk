import { InitQueryOptions, Maybe, Query, QueryState, getValue, initQuery, isClient } from 'dev-disk'
import { CreateStoresOptions, createStores } from './create-stores.ts'

// ----------------------------------------
// Type definitions

export type CreateQueryOptions<T extends Query> = InitQueryOptions<T> &
  CreateStoresOptions<
    QueryState<T>,
    T['key'] extends Record<string, any> ? T['key'] : Record<string, never>
  > & {
    fetchOnMount?: boolean | 'always' | ((key: T['key']) => boolean | 'always')
    fetchOnWindowFocus?: boolean | 'always' | ((key: T['key']) => boolean | 'always')
    fetchOnReconnect?: boolean | 'always' | ((key: T['key']) => boolean | 'always')
    keepPreviousData?: boolean
    gcTime?: number
  }

// ----------------------------------------
// Source code

export const createQuery = <T extends Query>(options: CreateQueryOptions<T>) => {
  const initializer = initQuery(options)

  const defaultFetchOnWindowFocus = options.fetchOnMount ?? true
  const defaultFetchOnReconnect = options.fetchOnMount ?? true
  const {
    fetchOnMount = true,
    fetchOnWindowFocus = defaultFetchOnWindowFocus,
    fetchOnReconnect = defaultFetchOnReconnect,
    refetchInterval = false,
    keepPreviousData,
    gcTime = 5 * 60 * 1000, // 5 minutes
  } = options

  const useQuery = createStores(
    initializer,
    (() => {
      const windowFocusHandler = () => {
        useQuery.$.stores.forEach((store) => {
          if (store.getSubscribers().size === 0) return
          const result = getValue(fetchOnWindowFocus, store.key)
          if (result === 'always') store.fetch()
          else if (result) store.fetch.cacheFirst()
        })
      }

      const reconnectHandler = () => {
        useQuery.$.stores.forEach((store) => {
          if (store.getSubscribers().size === 0) return
          const result = getValue(fetchOnReconnect, store.key)
          if (result === 'always') store.fetch()
          else if (result) store.fetch.cacheFirst()
        })
      }

      return {
        ...options,

        // onFirstSubscribe:
        //  - Run refetch interval
        //  - Handle fetchOnWindowFocus & fetchOnReconnect
        //  - Cancel garbage collection timeout
        onFirstSubscribe: (state) => {
          const store = useQuery.$.getStore(state.key)
          if (state.isSuccess) {
            const refetchIntervalValue = isClient && getValue(refetchInterval, state)
            if (refetchIntervalValue) {
              store.internal.timeout.refetchInterval = window.setTimeout(
                store.fetch,
                refetchIntervalValue,
              )
            }
          }
          if (isClient) {
            if (fetchOnWindowFocus) window.addEventListener('focus', windowFocusHandler)
            if (fetchOnReconnect) window.addEventListener('online', reconnectHandler)
          }
          clearTimeout(store.internal.timeout.garbageCollection)
          options.onFirstSubscribe?.(state)
        },

        // onSubscribe:
        //  - Handle fetchOnMount
        onSubscribe: (state) => {
          const store = useQuery.$.getStore(state.key)
          const result = getValue(fetchOnMount, store.key)
          if (result === 'always') store.fetch()
          else if (result) store.fetch.cacheFirst()
          options.onSubscribe?.(state)
        },

        // onLastUnsubscribe:
        //  - Start garbage collection timeout
        //  - Cancel retry, retryNextPage, refetchInterval
        //  - Reset retry counter
        //  - Detach window event handler
        //    (disable fetchOnWindowFocus & fetchOnReconnect since it has no subscribers anymore)
        onLastUnsubscribe: (state) => {
          let totalSubs = 0
          useQuery.$.stores.forEach((store) => {
            if (store.getSubscribers()) totalSubs++
          })
          if (isClient && totalSubs === 0) {
            if (fetchOnWindowFocus) window.removeEventListener('focus', windowFocusHandler)
            if (fetchOnReconnect) window.removeEventListener('online', reconnectHandler)
          }
          const store = useQuery.$.getStore(state.key)
          store.set({ retryCount: 0, retryNextPageCount: 0 })
          clearTimeout(store.internal.timeout.retry)
          clearTimeout(store.internal.timeout.retryNextPage)
          clearTimeout(store.internal.timeout.refetchInterval)
          if (isClient && gcTime !== Infinity) {
            store.internal.timeout.garbageCollection = window.setTimeout(store.reset, gcTime)
          }
          options.onLastUnsubscribe?.(state)
        },

        // onBeforeChangeKey:
        //  - Handle keepPreviousData
        onBeforeChangeKey: (nextKey, prevKey) => {
          const pStore = useQuery.$.getStore(prevKey)
          const nStore = useQuery.$.getStore(nextKey)
          if (keepPreviousData) {
            const nextData = nStore.get()
            const prevData = pStore.get()
            if (prevData.data && !nextData.data) {
              nStore.set({
                status: 'success',
                isPending: false,
                isSuccess: true,
                isError: false,
                data: prevData.data,
                response: prevData.response,
                isPreviousData: true,
              })
            }
          }
          options.onBeforeChangeKey?.(nextKey, prevKey)
        },
      }
    })(),
  )

  const fetch = Object.assign((key?: Maybe<T['key']>) => useQuery.$.getStore(key as any).fetch(), {
    cacheFirst: (key?: Maybe<T['key']>) => useQuery.$.getStore(key as any).fetch.cacheFirst(),
  })

  const fetchNextPage = (key?: Maybe<T['key']>) => useQuery.$.getStore(key as any).fetchNextPage()

  const reset = (key?: Maybe<T['key']>) => {
    if (key) useQuery.$.getStore(key as any).reset()
    else useQuery.$.stores.forEach((store) => store.reset())
  }

  const invalidate = (key?: Maybe<T['key']>) => {
    if (key) useQuery.$.getStore(key as any).invalidate()
    else useQuery.$.stores.forEach((store) => store.invalidate())
  }

  const optimisticUpdate = (
    key: Maybe<T['key']>,
    response: T['response'] | ((prevState: QueryState<T>) => T['response']),
  ) => useQuery.$.getStore(key as any).optimisticUpdate(response)

  const useSuspend = (
    key?: T['key'] extends Record<string, any> ? T['key'] : Record<string, never>,
  ) => {
    const state = useQuery(key)
    const store = useQuery.$.getStore(key)
    if (state.isPending) throw store.fetch()
    if (state.isError) throw store.get().error
    return state
  }

  return Object.assign(useQuery, {
    $: {
      ...useQuery.$,
      fetch,
      fetchNextPage,
      reset,
      invalidate,
      optimisticUpdate,
      useSuspend,
    },
  })
}
