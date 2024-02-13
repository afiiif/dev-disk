import { StoreInitializer } from './store.ts'
import { noop } from './utils.ts'

// ----------------------------------------
// Type definitions

export type MutationState<TResponse = any, TVar = undefined, TError = unknown> = {
  isWaiting: boolean
  isSuccess: boolean
  isError: boolean
  response: TResponse | undefined
  responseUpdatedAt: number | undefined
  variables: TVar | undefined
  error: TError | undefined
  errorUpdatedAt: number | undefined
}

export type MutateFn<TResponse = any, TVar = undefined, TError = unknown> = TVar extends undefined
  ? () => Promise<{ response?: TResponse; error?: TError; variables?: TVar }>
  : (variables: TVar) => Promise<{ response?: TResponse; error?: TError; variables?: TVar }>

export type InitMutation<TResponse = any, TVar = undefined, TError = unknown> = {
  mutationFn: (variables: TVar, state: MutationState<TResponse, TVar, TError>) => Promise<TResponse>
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

export const initMutation = <TResponse = any, TVar = undefined, TError = unknown>(
  options: InitMutation<TResponse, TVar, TError>,
) => {
  // prettier-ignore
  const {
    mutationFn,
    onMutate = noop,
    onSuccess = noop,
    onError,
    onSettled = noop,
  } = options

  const initializer: StoreInitializer<
    MutationState<TResponse, TVar, TError>,
    { mutate: MutateFn<TResponse, TVar, TError>; reset: () => void }
  > = (storeApi) => {
    const { set, get, getInitial } = storeApi

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
            resolve({ response, variables })
            onSuccess(response, variables, stateBeforeMutate)
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
            resolve({ error, variables })
            if (onError) onError(error, variables, stateBeforeMutate)
            else console.error(error, variables, get())
          })
          .finally(() => {
            onSettled(variables, stateBeforeMutate)
          })
      })
    }) as MutateFn<TResponse, TVar, TError>

    storeApi.reset = () => set(getInitial())

    return {
      isWaiting: false,
      isSuccess: false,
      isError: false,
      response: undefined,
      responseUpdatedAt: undefined,
      variables: undefined,
      error: undefined,
      errorUpdatedAt: undefined,
    }
  }

  return initializer
}
