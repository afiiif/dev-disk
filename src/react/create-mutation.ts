import { InitStoreOptions } from '../vanilla/store.ts'
import { noop } from '../vanilla/utils.ts'
import { createStore } from './create-store.ts'

// ----------------------------------------
// Type definitions

export type MutationState<TResponse = any, TVar = undefined, TError = unknown> = {
  isWaiting: boolean
  isSuccess: boolean
  isError: boolean
  response?: TResponse | undefined
  responseUpdatedAt?: number | undefined
  variables?: TVar | undefined
  error?: TError | undefined
  errorUpdatedAt?: number | undefined
}

export type MutateFn<TResponse = any, TVar = undefined, TError = unknown> = TVar extends undefined
  ? () => Promise<{ response?: TResponse; error?: TError; variables?: TVar }>
  : (variables: TVar) => Promise<{ response?: TResponse; error?: TError; variables?: TVar }>

export type CreateMutationOptions<
  TResponse = any,
  TVar = undefined,
  TError = unknown,
> = InitStoreOptions<MutationState<TResponse, TVar, TError>> & {
  onMutate?: (variables: TVar, stateBeforeMutate: MutationState<TResponse, TVar, TError>) => void
  onSuccess?: (
    response: TResponse,
    variables: TVar,
    stateBeforeMutate: MutationState<TResponse, TVar, TError>,
  ) => void
  onError?: (
    error: TError,
    variables: TVar,
    stateBeforeMutate: MutationState<TResponse, TVar, TError>,
  ) => void
  onSettled?: (variables: TVar, stateBeforeMutate: MutationState<TResponse, TVar, TError>) => void
}

// ----------------------------------------
// Source code

export const createMutation = <TResponse = any, TVar = undefined, TError = unknown>(
  mutationFn: (
    variables: TVar,
    state: MutationState<TResponse, TVar, TError>,
  ) => Promise<TResponse>,
  options: CreateMutationOptions<TResponse, TVar, TError>,
) => {
  const {
    onMutate = noop,
    onSuccess = noop,
    onError,
    onSettled = noop,
    ...createStoreOptions
  } = options

  return createStore<
    MutationState<TResponse, TVar, TError>,
    { mutate: MutateFn<TResponse, TVar, TError> }
  >((storeApi) => {
    const { get, set } = storeApi

    storeApi.mutate = ((variables) => {
      set({ isWaiting: true })
      const stateBeforeMutate = get()
      onMutate(variables, stateBeforeMutate)
      return new Promise((resolve) => {
        mutationFn(variables, stateBeforeMutate)
          .then((response) => {
            set({
              isWaiting: false,
              isSuccess: true,
              isError: false,
              response,
              responseUpdatedAt: Date.now(),
              variables,
              error: undefined,
              errorUpdatedAt: undefined,
            })
            onSuccess(response, variables, stateBeforeMutate)
            resolve({ response, variables })
          })
          .catch((error: TError) => {
            set({
              isWaiting: false,
              isSuccess: false,
              isError: true,
              variables,
              error,
              errorUpdatedAt: Date.now(),
            })
            if (onError) onError(error, variables, stateBeforeMutate)
            else console.error(error, variables, get())
            resolve({ error, variables })
          })
          .finally(() => {
            onSettled(variables, stateBeforeMutate)
          })
      })
    }) as MutateFn<TResponse, TVar, TError>

    return {
      isWaiting: false,
      isSuccess: false,
      isError: false,
      // response: undefined,
      // responseUpdatedAt: undefined,
      // variables: undefined,
      // error: undefined,
      // errorUpdatedAt: undefined,
    }
  }, createStoreOptions)
}
