import { Maybe, getValue, noop } from './utils.ts'

// ----------------------------------------
// Type definitions

export type SetState<T> = Partial<T> | ((state: T) => Partial<T>)

export type Subscriber<T> = (state: T, prevState: T) => void

export type StoreApi<T extends Record<string, any>> = {
  set: (value: SetState<T>, silent?: boolean) => void
  get: () => T
  getInitial: () => T
  subscribe: (subscriber: Subscriber<T>) => () => void
  getSubscribers: () => Set<Subscriber<T>>
}

export type StoreInitializer<
  T extends Record<string, any>,
  TProps extends Record<string, any> = Record<string, never>,
> = T | ((store: StoreApi<T> & TProps) => T)

export type InitStoreOptions<T extends Record<string, any>> = {
  intercept?: (nextState: T, prevState: T) => void | Maybe<Partial<T>>
  onFirstSubscribe?: (state: T) => void
  onSubscribe?: (state: T) => void
  onUnsubscribe?: (state: T) => void
  onLastUnsubscribe?: (state: T) => void
}

// ----------------------------------------
// Source code

export const initStore = <
  T extends Record<string, any>,
  TProps extends Record<string, any> = Record<string, never>,
>(
  initializer: StoreInitializer<T, TProps>,
  options: InitStoreOptions<T> = {},
): StoreApi<T> & TProps => {
  const {
    intercept,
    onFirstSubscribe = noop,
    onSubscribe = noop,
    onUnsubscribe = noop,
    onLastUnsubscribe = noop,
  } = options

  let state: T
  const get = () => state
  const getInitial = () => initialState

  const subscribers = new Set<Subscriber<T>>()
  const getSubscribers = () => subscribers

  const set = (value: SetState<T>, silent?: boolean) => {
    const prevState = state
    state = { ...state, ...getValue(value, state) }
    if (intercept) state = { ...state, ...intercept(state, prevState) }
    if (!silent) subscribers.forEach((subscriber) => subscriber(state, prevState))
  }

  const subscribe = (subscriber: Subscriber<T>) => {
    subscribers.add(subscriber)
    if (subscribers.size === 1) onFirstSubscribe(state)
    onSubscribe(state)
    return () => {
      subscribers.delete(subscriber)
      onUnsubscribe(state)
      if (subscribers.size === 0) onLastUnsubscribe(state)
    }
  }

  const store = { set, get, getInitial, subscribe, getSubscribers } as StoreApi<T> & TProps
  const initialState: T = getValue(initializer, store)
  state = initialState
  return store
}
