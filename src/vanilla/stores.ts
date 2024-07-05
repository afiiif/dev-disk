import { getHash } from './hash.ts'
import { InitStoreOptions, StoreApi, initStore } from './store.ts'
import { Maybe, getValue } from './utils.ts'

// ----------------------------------------
// Type definitions

export type StoreApiWithKey<
  T extends Record<string, any>,
  TKey extends Record<string, any>,
  TProps extends Record<string, any> = Record<string, never>,
> = StoreApi<T> & TProps & { key: TKey; keyHash: string }

export type StoresApi<
  T extends Record<string, any>,
  TKey extends Record<string, any>,
  TProps extends Record<string, any> = Record<string, never>,
> = {
  stores: Map<string, StoreApiWithKey<T, TKey, TProps>>
  getStore: (key?: Maybe<TKey>) => StoreApiWithKey<T, TKey, TProps>
}

export type StoresInitializer<
  T extends Record<string, any>,
  TKey extends Record<string, any>,
  TProps extends Record<string, any> = Record<string, never>,
> = T | ((store: StoreApiWithKey<T, TKey, TProps>) => T)

export type InitStoresOptions<
  T extends Record<string, any>,
  TKey extends Record<string, any>,
> = InitStoreOptions<T> & {
  hashKeyFn?: (obj: TKey) => string
}

// ----------------------------------------
// Source code

export const initStores = <
  T extends Record<string, any>,
  TKey extends Record<string, any>,
  TProps extends Record<string, any> = Record<string, never>,
>(
  initializer: StoresInitializer<T, TKey, TProps>,
  options: InitStoresOptions<T, TKey> = {},
): StoresApi<T, TKey, TProps> => {
  const { hashKeyFn = getHash } = options

  const stores = new Map<string, StoreApiWithKey<T, TKey, TProps>>()

  const getStore = (_key?: Maybe<TKey>) => {
    const key = _key || ({} as TKey)
    const keyHash = hashKeyFn(key)
    if (!stores.has(keyHash)) {
      const store = initStore<T, { key: TKey; keyHash: string } & TProps>((storeApi) => {
        storeApi.key = key
        storeApi.keyHash = keyHash
        return getValue(initializer, storeApi)
      }, options)
      stores.set(keyHash, store)
    }
    return stores.get(keyHash)!
  }

  return {
    stores,
    getStore,
  }
}
