import { getValue, noop } from './basic.ts';

export type SetState<TState> = Partial<TState> | ((state: TState) => Partial<TState>);

export type Subscriber<TState> = (state: TState, prevState: TState) => void;

export type StoreApi<TState extends Record<string, any>> = {
  setState: (value: SetState<TState>) => void;
  getState: () => TState;
  subscribe: (subscriber: Subscriber<TState>) => () => void;
  getSubscribers: () => Set<Subscriber<TState>>;
};

export type InitStoreOptions<TState extends Record<string, any>> = {
  onFirstSubscribe?: (state: TState) => void;
  onSubscribe?: (state: TState) => void;
  onUnsubscribe?: (state: TState) => void;
  onLastUnsubscribe?: (state: TState) => void;
};

export const initStore = <TState extends Record<string, any>>(
  initialState: TState,
  options: InitStoreOptions<TState> = {},
): StoreApi<TState> => {
  const {
    onFirstSubscribe = noop,
    onSubscribe = noop,
    onUnsubscribe = noop,
    onLastUnsubscribe = noop,
  } = options;

  const subscribers = new Set<Subscriber<TState>>();
  const getSubscribers = () => subscribers;
  const subscribe = (subscriber: Subscriber<TState>) => {
    subscribers.add(subscriber);
    if (subscribers.size === 1) onFirstSubscribe(state);
    onSubscribe(state);
    return () => {
      subscribers.delete(subscriber);
      onUnsubscribe(state);
      if (subscribers.size === 0) onLastUnsubscribe(state);
    };
  };

  let state = initialState;
  const getState = () => state;
  const setState = (value: SetState<TState>) => {
    const prevState = state;
    state = { ...state, ...getValue(value, state) };
    subscribers.forEach((subscriber) => subscriber(state, prevState));
  };

  return {
    getState,
    setState,
    subscribe,
    getSubscribers,
  };
};
