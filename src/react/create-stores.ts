import { useEffect, useMemo, useRef, useState } from 'react'
import { shallow } from '../vanilla/shallow.ts'
import { SetState } from '../vanilla/store.ts'
import { InitStoresOptions, StoresApi, StoresInitializer, initStores } from '../vanilla/stores.ts'
import { Maybe, hashStoreKey, identity, noop } from '../vanilla/utils.ts'

// ----------------------------------------
// Type definitions

export type UseStores<
  T extends Record<string, any>,
  TKey extends Record<string, any>,
  TProps extends Record<string, any> = Record<string, never>,
> = StoresApi<T, TKey, TProps> & {
  <U = T>(...args: [Maybe<TKey>, ((state: T) => U)?] | [((state: T) => U)?]): U
  useInitialValue: (key: Maybe<TKey>, value: SetState<T>) => void
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

  const { stores, getStore } = initStores(initializer, options)

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

  const useInitialValue = (key: Maybe<TKey>, value: SetState<T>) => {
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
  }

  return Object.assign(useStores, {
    stores,
    getStore,
    useInitialValue,
  })
}