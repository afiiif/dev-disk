import { StoreInitializer } from './store.ts'
import { noop } from './utils.ts'

// ----------------------------------------
// Type definitions

export type Mutation = {
  variables?: any
  response?: any
  error?: any
}

export type MutationState<T extends Mutation> = {
  isWaiting: boolean
  isSuccess: boolean
  isError: boolean
  response: T['response'] | undefined
  responseUpdatedAt: number | undefined
  variables: T['variables'] | undefined
  error: T['error'] | undefined
  errorUpdatedAt: number | undefined
}

export type MutateFn<T extends Mutation> = T['variables'] extends undefined
  ? () => Promise<{ response?: T['response']; error?: T['error']; variables?: T['variables'] }>
  : (
      variables: T['variables'],
    ) => Promise<{ response?: T['response']; error?: T['error']; variables?: T['variables'] }>

export type InitMutationOptions<T extends Mutation> = {
  mutationFn: (variables: T['variables'], state: MutationState<T>) => Promise<T['response']>
  onMutate?: (variables: T['variables'], stateBeforeMutate: MutationState<T>) => void
  onSuccess?: (
    response: T['response'],
    variables: T['variables'],
    stateBeforeMutate: MutationState<T>,
  ) => void
  onError?: (
    error: T['error'],
    variables: T['variables'],
    stateBeforeMutate: MutationState<T>,
  ) => void
  onSettled?: (variables: T['variables'], stateBeforeMutate: MutationState<T>) => void
}

// ----------------------------------------
// Source code

export const initMutation = <T extends Mutation>(options: InitMutationOptions<T>) => {
  // prettier-ignore
  const {
    mutationFn,
    onMutate = noop,
    onSuccess = noop,
    onError,
    onSettled = noop,
  } = options

  const initializer: StoreInitializer<
    MutationState<T>,
    { mutate: MutateFn<T>; reset: () => void }
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
          .catch((error: T['error']) => {
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
    }) as MutateFn<T>

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
