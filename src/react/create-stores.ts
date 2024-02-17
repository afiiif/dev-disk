// import { useDebugValue, useSyncExternalStore } from 'react'
// That doesn't work in ESM, because React libs are CJS only.
// See: https://github.com/pmndrs/valtio/issues/452
// The following is a workaround until ESM is supported.
import ReactExports from 'react'
import { InitStoresOptions, StoresApi, StoresInitializer, initStores } from '../vanilla/stores.ts'
import { Maybe, hashStoreKey, identity, noop } from '../vanilla/utils.ts'
import { useSyncStoreSlice } from './use-sync-store-slice.ts'

const { useEffect, useMemo, useRef } = ReactExports

// ----------------------------------------
// Type definitions

export type UseStores<
  T extends Record<string, any>,
  TKey extends Record<string, any>,
  TProps extends Record<string, any> = Record<string, never>,
> = StoresApi<T, TKey, TProps> & {
  <U = T>(...args: [Maybe<TKey>, ((state: T) => U)?] | [((state: T) => U)?]): U
}

export type CreateStoresOptions<
  T extends Record<string, any>,
  TKey extends Record<string, any>,
> = InitStoresOptions<T, TKey> & {
  onBeforeChangeKey?: (nextKey: TKey, prevKey: TKey) => void
}

// ----------------------------------------
// Source code

export const createStores = <
  T extends Record<string, any>,
  TKey extends Record<string, any>,
  TProps extends Record<string, any> = Record<string, never>,
>(
  initializer: StoresInitializer<T, TKey, TProps>,
  options: CreateStoresOptions<T, TKey> = {},
): UseStores<T, TKey, TProps> => {
  // prettier-ignore
  const {
    hashKeyFn = hashStoreKey,
    onBeforeChangeKey = noop,
  } = options

  const defaultKey = {} as TKey

  const storesApi = initStores(initializer, options)

  const useStores = <U = T>(
    ..._args: [Maybe<TKey>, ((state: T) => U)?] | [((state: T) => U)?]
  ): U => {
    const args = typeof _args[0] === 'function' ? [defaultKey, _args[0]] : _args
    const [_key, selector = identity as (state: T) => U] = args as [Maybe<TKey>, (state: T) => U]

    const key = _key || defaultKey
    const keyHash = hashKeyFn(key)

    const prevKey = useRef(key)
    const prevKeyHash = useRef(keyHash)

    useEffect(() => {
      prevKey.current = key
      prevKeyHash.current = keyHash
    }, [keyHash])

    if (keyHash !== prevKeyHash.current) onBeforeChangeKey(key, prevKey.current)

    const store = useMemo(() => storesApi.getStore(key), [keyHash])

    return useSyncStoreSlice(store, selector)
  }

  return Object.assign(useStores, storesApi)
}
