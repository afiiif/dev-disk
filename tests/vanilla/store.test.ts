import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreApi, initStore } from 'dev-disk'

describe('initStore', () => {
  const initialData = {
    count: 0,
    text: 'initial',
  }

  const storeInitializer = vi.fn(() => initialData)
  const onFirstSubscribe = vi.fn()
  const onSubscribe = vi.fn()
  const onUnsubscribe = vi.fn()
  const onLastUnsubscribe = vi.fn()

  const options = { onFirstSubscribe, onSubscribe, onUnsubscribe, onLastUnsubscribe }

  let store: StoreApi<typeof initialData>

  beforeEach(() => {
    store = initStore(storeInitializer, options)
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes the store with initial data', () => {
    expect(storeInitializer).toHaveBeenCalledTimes(1)
    expect(store.get()).toEqual(initialData)
  })

  it('calls store event handler when subscriber is added/removed', () => {
    const subscriber1 = vi.fn()
    const subscriber2 = vi.fn()

    const unsub1 = store.subscribe(subscriber1)
    expect(onFirstSubscribe).toHaveBeenCalledWith(initialData)
    expect(onSubscribe).toHaveBeenCalledWith(initialData)
    expect(store.getSubscribers().size).toEqual(1)

    const unsub2 = store.subscribe(subscriber2)
    expect(onSubscribe).toHaveBeenCalledWith(initialData)
    expect(onSubscribe).toHaveBeenCalledTimes(2)
    expect(onFirstSubscribe).toHaveBeenCalledTimes(1)
    expect(store.getSubscribers().size).toEqual(2)

    unsub1()
    expect(onUnsubscribe).toHaveBeenCalledWith(initialData)
    expect(onLastUnsubscribe).not.toHaveBeenCalled()
    expect(store.getSubscribers().size).toEqual(1)

    unsub2()
    expect(onUnsubscribe).toHaveBeenCalledWith(initialData)

    expect(onFirstSubscribe).toHaveBeenCalledTimes(1)
    expect(onSubscribe).toHaveBeenCalledTimes(2)
    expect(onUnsubscribe).toHaveBeenCalledTimes(2)
    expect(onLastUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('updates the store data when set is called', () => {
    store.set({ count: 1 })
    expect(store.get().count).toEqual(1)
    expect(store.get().text).toEqual('initial')

    store.set((prev) => ({ count: prev.count + 3 }))
    expect(store.get().count).toEqual(4)
    expect(store.get().text).toEqual('initial')
    expect(store.getInitial()).toEqual({ count: 0, text: 'initial' })
  })

  it('call subscribers when set is called', () => {
    const subscriber1 = vi.fn()
    const subscriber2 = vi.fn()

    store.subscribe(subscriber1)
    store.subscribe(subscriber2)

    store.set({ count: 2 })
    expect(subscriber1).toHaveBeenCalledWith(store.get(), { count: 0, text: 'initial' })
    expect(subscriber2).toHaveBeenCalledWith(store.get(), { count: 0, text: 'initial' })
  })

  it('calls intercept', () => {
    const intercept = vi.fn((nextState, prevState) => {
      return nextState.count > 2 ? prevState : nextState
    })
    store = initStore(storeInitializer, { intercept })

    const subscriber = vi.fn()
    store.subscribe(subscriber)

    store.set({ count: 2 })
    expect(store.get().count).toEqual(2)

    store.set({ count: 3 })
    expect(intercept).toHaveBeenCalledWith(
      { count: 3, text: 'initial' },
      { count: 2, text: 'initial' },
    )
    expect(intercept).toHaveBeenCalledTimes(2)
    expect(subscriber).toHaveBeenCalledWith({ count: 2, text: 'initial' }, initialData)
    expect(store.get().count).toEqual(2)
  })
})
