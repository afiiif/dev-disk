import { useDebugValue, useMemo, useRef, useSyncExternalStore } from 'react'
import { shallow } from '../vanilla/shallow.ts'
import { StoreApi } from '../vanilla/store.ts'
import { identity } from '../vanilla/utils.ts'

const useMemoShallowSelector = <TState, TStateSlice>(
  getState: () => TState,
  selector: (state: TState) => TStateSlice,
) => {
  const selectorRef = useRef(selector)
  selectorRef.current = selector
  return useMemo(() => {
    let slice: TStateSlice
    return () => {
      const state = getState()
      const nextSlice = selectorRef.current(state)
      if (!shallow(slice, nextSlice)) slice = nextSlice
      return slice
    }
  }, [getState])
}

export const useSyncStoreSlice = <TState extends Record<string, any>, TStateSlice>(
  store: StoreApi<TState>,
  selector: (state: TState) => TStateSlice = identity as (state: TState) => TStateSlice,
) => {
  const slice = useSyncExternalStore<TStateSlice>(
    store.subscribe,
    useMemoShallowSelector(store.get, selector),
    useMemoShallowSelector(store.getInitial, selector),
  )
  useDebugValue(slice)
  return slice
}
