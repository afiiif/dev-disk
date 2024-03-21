import { useRef, useState } from 'react'
import { StoreApi, identity, shallow } from 'dev-disk'
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.ts'

export const useSyncStoreSlice = <TState extends Record<string, any>, TStateSlice>(
  store: StoreApi<TState>,
  selector: (state: TState) => TStateSlice = identity as (state: TState) => TStateSlice,
) => {
  const [, reRender] = useState({})

  const selectorRef = useRef(selector)
  selectorRef.current = selector

  useIsomorphicLayoutEffect(
    () =>
      store.subscribe((state, prevState) => {
        const prevSlice = selectorRef.current(prevState)
        const nextSlice = selectorRef.current(state)
        if (!shallow(prevSlice, nextSlice)) reRender({})
      }),
    [store],
  )

  return selector(store.get())
}

export const useSyncStoresSlice = <TState extends Record<string, any>, TStateSlice>(
  stores: StoreApi<TState>[],
  selector: (state: TState) => TStateSlice = identity as (state: TState) => TStateSlice,
) => {
  const [, reRender] = useState({})

  const selectorRef = useRef(selector)
  selectorRef.current = selector

  useIsomorphicLayoutEffect(() => {
    const unsubscribeFns = stores.map((store) =>
      store.subscribe((state, prevState) => {
        const prevSlice = selectorRef.current(prevState)
        const nextSlice = selectorRef.current(state)
        if (!shallow(prevSlice, nextSlice)) reRender({})
      }),
    )
    return () => unsubscribeFns.forEach((unsubscribe) => unsubscribe())
  }, [stores])

  return stores.map(({ get }) => selector(get()))
}
