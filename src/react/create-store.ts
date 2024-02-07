import { useEffect, useState } from 'react'
import { shallow } from '../vanilla/shallow.ts'
import {
  InitStoreOptions,
  SetState,
  StoreApi,
  StoreInitializer,
  initStore,
} from '../vanilla/store.ts'
import { identity } from '../vanilla/utils.ts'

// ----------------------------------------
// Type definitions

export type UseStore<T extends Record<string, any>> = {
  <U = T>(selector?: (state: T) => U): U
  useInitialValue: (value: SetState<T>) => void
} & StoreApi<T>

// ----------------------------------------
// Source code

export const createStore = <T extends Record<string, any>>(
  initializer: StoreInitializer<T>,
  options: InitStoreOptions<T> = {},
): UseStore<T> => {
  const store = initStore(initializer, options)

  const useStore = <U = T>(selector: (state: T) => U = identity as (state: T) => U) => {
    const [, forceUpdate] = useState({})

    useEffect(() => {
      return store.subscribe((nextState, prevState) => {
        const prev = selector(prevState)
        const next = selector(nextState)
        !shallow(prev, next) && forceUpdate({})
      })
    }, [])

    return selector(store.get())
  }

  const useInitialValue: UseStore<T>['useInitialValue'] = (value) => {
    useState(() => {
      // Note: Put `store.set(value)` inside of useState to ensure it is only invoked once.
      if (store.getSubscribers().size > 0) {
        console.warn(
          'The store already have subscriber.',
          'Consider calling setInitialValue on higher component, before any component subscribed.',
        )
      }
      store.set(value)
    })
  }

  return Object.assign(useStore, { ...store, useInitialValue })
}
