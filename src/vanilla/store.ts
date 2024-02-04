import { Maybe, getValue, noop } from './utils.ts'

export type SetState<T> = Partial<T> | ((state: T) => Partial<T>)

export type Subscriber<T> = (state: T, prevState: T) => void

export type StoreApi<T> = {
  getState: () => T
  setState: (value: SetState<T>, silent?: boolean) => void
  subscribe: (subscriber: Subscriber<T>) => () => void
  getSubscribers: () => Set<Subscriber<T>>
}

export type StoreInitializer<T> =
  | T
  | ((
      setState: StoreApi<T>['setState'],
      getState: StoreApi<T>['getState'],
      store: StoreApi<T>,
    ) => T)

export type InitStoreOptions<T> = {
  intercept?: (nextState: T, prevState: T) => void | Maybe<Partial<T>>
  onFirstSubscribe?: (state: T) => void
  onSubscribe?: (state: T) => void
  onUnsubscribe?: (state: T) => void
  onLastUnsubscribe?: (state: T) => void
}

export const initStore = <T extends Record<string, any>>(
  initializer: StoreInitializer<T>,
  options: InitStoreOptions<T> = {},
): StoreApi<T> => {
  const {
    intercept,
    onFirstSubscribe = noop,
    onSubscribe = noop,
    onUnsubscribe = noop,
    onLastUnsubscribe = noop,
  } = options

  let state: T
  const getState = () => state

  const subscribers = new Set<Subscriber<T>>()
  const getSubscribers = () => subscribers

  const setState = (value: SetState<T>, silent = false) => {
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

  const api = { getState, setState, subscribe, getSubscribers }
  const initialState = getValue(initializer, setState, getState, api)
  state = initialState
  return api
}
