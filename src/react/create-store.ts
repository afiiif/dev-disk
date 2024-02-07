import { useEffect, useRef, useState } from 'react'
import { shallow } from '../vanilla/shallow.ts'
import {
  InitStoreOptions,
  SetState,
  StoreApi,
  StoreInitializer,
  initStore,
} from '../vanilla/store.ts'
import { identity } from '../vanilla/utils.ts'

export type UseStore<T> = {
  <U = T>(selector?: (state: T) => U): U
  use: {
    setInitialValue: (value: SetState<T>) => void
  }
} & StoreApi<T>

export const createStore = <T extends Record<string, any>>(
  initializer: StoreInitializer<T>,
  options: InitStoreOptions<T> = {},
) => {
  const store = initStore(initializer, options)

  const useStore = <U = T>(selector: (state: T) => U = identity as (state: T) => U) => {
    const refSelector = useRef(selector)
    const refInitialState = useRef<U>()
    useState(() => {
      // Prevent re-compute selector(store.get())
      refInitialState.current = selector(store.get())
    })

    const [state, setState] = useState(refInitialState.current)

    useEffect(() => {
      const curr = refSelector.current(store.get())
      if (!shallow(curr, refInitialState.current)) setState(curr)
      return store.subscribe((nextState, prevState) => {
        const prev = refSelector.current(prevState)
        const next = refSelector.current(nextState)
        !shallow(prev, next) && setState(next)
      })
    }, [])

    return state
  }

  const use = {
    setInitialValue: (value: SetState<T>) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useState(() => {
        if (store.getSubscribers().size > 0) {
          return console.warn(
            'Cannot perform setInitialValues because the store already have subscriber',
          )
        }
        store.set(value)
      })
    },
  }

  Object.assign(useStore, store)
  Object.assign(useStore, { use })

  return useStore as UseStore<T>
}
