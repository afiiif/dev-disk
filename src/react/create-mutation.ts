import {
  InitMutationOptions,
  InitStoreOptions,
  MutateFn,
  Mutation,
  MutationState,
  StoreApi,
  initMutation,
} from 'dev-disk'
import { UseStore, createStore } from './create-store.ts'

// ----------------------------------------
// Type definitions

export type UseMutation<T extends Mutation> = UseStore<
  MutationState<T>,
  StoreApi<MutationState<T>> & {
    mutate: MutateFn<T>
    reset: () => void
  }
>

export type CreateMutationOptions<T extends Mutation> = InitStoreOptions<MutationState<T>> &
  InitMutationOptions<T>

// ----------------------------------------
// Source code

export const createMutation = <T extends Mutation>(
  options: CreateMutationOptions<T>,
): UseMutation<T> => {
  const initializer = initMutation(options)
  return createStore(initializer, options)
}
