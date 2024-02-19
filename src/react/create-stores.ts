// import { useDebugValue, useSyncExternalStore } from 'react'
// That doesn't work in ESM, because React libs are CJS only.
// See: https://github.com/pmndrs/valtio/issues/452
// The following is a workaround until ESM is supported.
import ReactExports from 'react'
import {
  InitStoresOptions,
  Maybe,
  StoresApi,
  StoresInitializer,
  hashStoreKey,
  identity,
  initStores,
  noop,
} from 'dev-disk'
import { useSyncStoreSlice, useSyncStoresSlice } from './use-sync-store-slice.ts'

const { useMemo, useRef } = ReactExports

// ----------------------------------------
// Type definitions

export type UseStores<
  T extends Record<string, any>,
  TKey extends Record<string, any>,
  TProps extends Record<string, any> = Record<string, never>,
> = StoresApi<T, TKey, TProps> & {
  <U = T>(...args: [Maybe<TKey>, ((state: T) => U)?] | [((state: T) => U)?]): U
} & {
  useMultiple: <U = T>(options: { keys: TKey[]; selector?: (state: T) => U }) => U[]
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

    const prev = useRef({ key, keyHash })
    if (keyHash !== prev.current.keyHash) onBeforeChangeKey(key, prev.current.key)
    prev.current = { key, keyHash }

    const store = useMemo(() => storesApi.getStore(key), [keyHash])
    return useSyncStoreSlice(store, selector)
  }

  const useMultiple = <U = T>(options: { keys: TKey[]; selector?: (state: T) => U }) => {
    const { keys, selector } = options
    const keyHashes = keys.map((key) => hashKeyFn(key))
    const keyHashesJoined = keyHashes.join('_')

    const prev = useRef({ keys, keyHashes, keyHashesJoined })
    if (keyHashesJoined !== prev.current.keyHashesJoined) {
      keyHashes.forEach((keyHash, i) => {
        if (keyHash !== prev.current.keyHashes[i]) onBeforeChangeKey(keys[i], prev.current.keys[i])
      })
    }
    prev.current = { keys, keyHashes, keyHashesJoined }

    const stores = useMemo(() => keys.map((key) => storesApi.getStore(key)), [keyHashesJoined])
    return useSyncStoresSlice(stores, selector)
  }

  return Object.assign(useStores, { ...storesApi, useMultiple })
}
