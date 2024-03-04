import {
  ActFn,
  AsyncAction,
  AsyncActionState,
  InitAsyncActionOptions,
  InitStoreOptions,
  StoreApi,
  getAsyncActionStoreInitializer,
} from 'dev-disk'
import { UseStore, createStore } from './create-store.ts'

// ----------------------------------------
// Type definitions

export type UseAsyncAction<T extends AsyncAction> = UseStore<
  AsyncActionState<T>,
  StoreApi<AsyncActionState<T>> & { act: ActFn<T>; reset: () => void }
>

export type CreateAsyncActionOptions<T extends AsyncAction> = InitStoreOptions<
  AsyncActionState<T>
> &
  InitAsyncActionOptions<T>

// ----------------------------------------
// Source code

export const createAsyncAction = <T extends AsyncAction>(
  options: CreateAsyncActionOptions<T>,
): UseAsyncAction<T> => {
  const initializer = getAsyncActionStoreInitializer(options)
  return createStore(initializer, options)
}
