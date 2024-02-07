import { useEffect, useMemo, useRef, useState } from 'react'
import { shallow } from '../vanilla/shallow.ts'
import { InitStoreOptions, SetState, StoreApi, initStore } from '../vanilla/store.ts'
import { Maybe, getValue, identity, noop } from '../vanilla/utils.ts'

// ----------------------------------------
// Type definitions

export type UseStores<TKey extends Record<string, any>, T extends Record<string, any>> = {
  <U = T>(...args: [Maybe<TKey>, ((state: T) => U)?] | [((state: T) => U)?]): U
  getStore: (key?: Maybe<TKey>) => StoreApi<T>
  use: {
    setInitialValue: (key: Maybe<TKey>, value: SetState<T>) => void
  }
}

export type StoresInitializer<TKey extends Record<string, any>, T extends Record<string, any>> =
  | T
  | ((store: StoreApi<T> & { key: TKey; keyHash: string }) => T)

export type CreateStoresOptions<
  TKey extends Record<string, any>,
  T extends Record<string, any>,
> = InitStoreOptions<T> & {
  hashKeyFn?: (obj: TKey) => string
  onBeforeChangeKey?: (nextKey: TKey, prevKey: TKey) => void
  onStoreInitialized?: (key: TKey, keyHash: string) => void
}

// ----------------------------------------
// Source code

export const hashStoreKey = (obj?: any) => JSON.stringify(obj, Object.keys(obj).sort())

export const createStores = <TKey extends Record<string, any>, T extends Record<string, any>>(
  initializer: StoresInitializer<TKey, T>,
  options: CreateStoresOptions<TKey, T> = {},
): UseStores<TKey, T> => {
  // prettier-ignore
  const {
    hashKeyFn = hashStoreKey,
    onBeforeChangeKey = noop,
    onStoreInitialized = noop,
  } = options

  const defaultKey = {} as TKey

  const stores = new Map<string, StoreApi<T>>()
  const getStore = (_key?: Maybe<TKey>) => {
    const key = _key || defaultKey
    const keyHash = hashKeyFn(key)
    if (!stores.has(keyHash)) {
      stores.set(
        keyHash,
        initStore((store) => getValue(initializer, { key, keyHash, ...store }), options),
      )
      onStoreInitialized(key, keyHash)
    }
    return stores.get(keyHash)!
  }

  const useStores = <U = T>(
    ..._args: [Maybe<TKey>, ((state: T) => U)?] | [((state: T) => U)?]
  ): U => {
    const args = typeof _args[0] === 'function' ? [defaultKey, _args[0]] : _args
    const [_key, selector = identity as (state: T) => U] = args as [Maybe<TKey>, (state: T) => U]

    const key = _key || defaultKey
    const keyHash = hashKeyFn(key)

    const prevKey = useRef(key)
    const prevKeyHash = useRef(keyHash)

    const store = useMemo(() => getStore(key), [keyHash])
    const [, forceUpdate] = useState({})

    useEffect(() => {
      prevKey.current = key
      prevKeyHash.current = keyHash
      return store.subscribe((nextState, prevState) => {
        const prev = selector(prevState)
        const next = selector(nextState)
        !shallow(prev, next) && forceUpdate({})
      })
    }, [keyHash])

    if (keyHash !== prevKeyHash.current) onBeforeChangeKey(key, prevKey.current)

    return selector(store.get())
  }

  const use: UseStores<TKey, T>['use'] = {
    setInitialValue: (key, value) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useState(() => {
        // Note: Put `store.set(value)` inside of useState to ensure it is only invoked once.
        const store = getStore(key)
        if (store.getSubscribers().size > 0) {
          console.warn(
            'The store already have subscriber.',
            'Consider calling setInitialValue on higher component, before any component subscribed.',
          )
        }
        store.set(value)
      })
    },
  }

  return Object.assign(useStores, {
    getStore,
    use,
  })
}
