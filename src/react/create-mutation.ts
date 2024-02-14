import { InitMutationOptions, Mutation, MutationState, initMutation } from '../vanilla/mutation.ts'
import { InitStoreOptions } from '../vanilla/store.ts'
import { createStore } from './create-store.ts'

// ----------------------------------------
// Type definitions

export type CreateMutationOptions<T extends Mutation> = InitStoreOptions<MutationState<T>> &
  InitMutationOptions<T>

// ----------------------------------------
// Source code

export const createMutation = <T extends Mutation>(options: CreateMutationOptions<T>) => {
  const initializer = initMutation(options)
  return createStore(initializer, options)
}
