import { InitMutation, MutationState, initMutation } from '../vanilla/mutation.ts'
import { InitStoreOptions } from '../vanilla/store.ts'
import { createStore } from './create-store.ts'

// ----------------------------------------
// Type definitions

export type CreateMutationOptions<
  TResponse = any,
  TVar = undefined,
  TError = unknown,
> = InitStoreOptions<MutationState<TResponse, TVar, TError>> & InitMutation<TResponse, TVar, TError>

// ----------------------------------------
// Source code

export const createMutation = <TResponse = any, TVar = undefined, TError = unknown>(
  options: CreateMutationOptions<TResponse, TVar, TError>,
) => {
  const initializer = initMutation(options)
  return createStore(initializer, options)
}
