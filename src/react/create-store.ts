import { type InitStoreOptions, initStore } from '../vanilla.ts';
import { useSyncStore } from './use-sync-store.ts';

export const createStore = <TState extends Record<string, any>>(
  initialState: TState,
  options?: InitStoreOptions<TState>,
) => {
  const store = initStore(initialState, options);
  const useStore = <TStateSlice = TState>(selector?: (state: TState) => TStateSlice) =>
    useSyncStore(store, selector);

  return Object.assign(useStore, store);
};
