import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UseStore, createStore } from 'dev-disk/react'
import { renderHook } from '../test-utils'

describe('createStore', () => {
  type Store = { counter: number; increment: () => void }
  let useCounter: UseStore<Store>

  beforeEach(() => {
    useCounter = createStore<Store>(({ set }) => ({
      counter: 1,
      increment: () => set((prev) => ({ counter: prev.counter + 1 })),
    }))
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes the state with the initial data', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.counter).toEqual(1)
    expect(useCounter.$.get().counter).toEqual(1)
  })

  it('subscribes to state changes', () => {
    const hook1 = renderHook(() => useCounter())
    const hook2 = renderHook(() => useCounter())

    expect(hook1.result.current.counter).toEqual(1)
    expect(hook2.result.current.counter).toEqual(1)

    act(() => {
      hook1.result.current.increment()
    })
    expect(hook1.result.current.counter).toEqual(2)
    expect(hook2.result.current.counter).toEqual(2)

    act(() => {
      useCounter.$.set((p) => ({ counter: p.counter + 5 }))
    })
    expect(hook1.result.current.counter).toEqual(7)
    expect(hook2.result.current.counter).toEqual(7)
    expect(useCounter.$.get().counter).toEqual(7)
  })

  it('is able to be used with custom selector', () => {
    const useMyStore = createStore(() => ({ a: 1, b: 10, c: 100 }))
    const hook1 = renderHook(() => useMyStore((state) => state.a))
    const hook2 = renderHook(() => useMyStore((state) => [state.b, state.c > 101] as const))

    expect(hook1.result.current).toEqual(1)
    expect(hook2.result.current).toEqual([10, false])

    act(() => {
      useMyStore.$.set({ a: 2 })
    })
    expect(hook1.result.current).toEqual(2)
    expect(hook1.results.length).toEqual(2) // Re-rendered
    expect(hook2.results.length).toEqual(1) // Not re-rendered because of shallow selector

    act(() => {
      useMyStore.$.set((p) => ({ c: p.c + 1 }))
    })
    expect(hook2.result.current).toEqual([10, false])
    expect(hook2.results.length).toEqual(1) // Not re-rendered because of shallow selector

    act(() => {
      useMyStore.$.set((p) => ({ c: p.c + 1 }))
    })
    expect(hook2.result.current).toEqual([10, true])
    expect(hook2.results.length).toEqual(2) // Re-rendered
    expect(hook1.results.length).toEqual(2) // Not re-rendered because of shallow selector

    act(() => {
      useMyStore.$.set({ b: 20 })
    })
    expect(hook2.result.current).toEqual([20, true])
    expect(hook2.results.length).toEqual(3) // Re-rendered
    expect(hook1.results.length).toEqual(2) // Not re-rendered because of shallow selector

    expect(useMyStore.$.getSubscribers().size).toEqual(2)
    expect(useMyStore.$.getInitial()).toEqual({ a: 1, b: 10, c: 100 })
  })
})
