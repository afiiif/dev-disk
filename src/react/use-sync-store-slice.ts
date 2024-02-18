// import { useDebugValue, useSyncExternalStore } from 'react'
// That doesn't work in ESM, because React libs are CJS only.
// See: https://github.com/pmndrs/valtio/issues/452
// The following is a workaround until ESM is supported.
import ReactExports from 'react'
import { shallow } from '../vanilla/shallow.ts'
import { StoreApi } from '../vanilla/store.ts'
import { identity } from '../vanilla/utils.ts'

const { useCallback, useDebugValue, useMemo, useRef, useSyncExternalStore } = ReactExports

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

export const useSyncStoresSlice = <TState extends Record<string, any>, TStateSlice>(
  stores: StoreApi<TState>[],
  selector: (state: TState) => TStateSlice = identity as (state: TState) => TStateSlice,
) => {
  const selectorRef = useRef(selector)
  selectorRef.current = selector

  const slices = useSyncExternalStore<TStateSlice[]>(
    useCallback(
      (onStoreChange) => {
        const unsubscribeFns = stores.map((store) => store.subscribe(onStoreChange))
        return () => {
          unsubscribeFns.forEach((unsubscribe) => unsubscribe())
        }
      },
      [stores],
    ),
    useMemo(() => {
      let slices: TStateSlice[]
      return () => {
        const nextSlices = []
        let isEqual = true
        for (let i = 0; i < stores.length; i++) {
          nextSlices[i] = selectorRef.current(stores[i].get())
          if (!shallow(slices[i], nextSlices[i])) isEqual = false
        }
        return isEqual ? slices : nextSlices
      }
    }, [stores]),
    useMemo(() => {
      let slices: TStateSlice[]
      return () => {
        const nextSlices = []
        let isEqual = true
        for (let i = 0; i < stores.length; i++) {
          nextSlices[i] = selectorRef.current(stores[i].getInitial())
          if (!shallow(slices[i], nextSlices[i])) isEqual = false
        }
        return isEqual ? slices : nextSlices
      }
    }, [stores]),
  )
  useDebugValue(slices)
  return slices
}
