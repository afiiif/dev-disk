import { StoreInitializer } from './store.ts'
import { noop } from './utils.ts'

// ----------------------------------------
// Type definitions

export type AsyncAction = {
  variables?: any
  response?: any
  error?: any
}

export type AsyncActionState<T extends AsyncAction> = {
  isWaiting: boolean
  isSuccess: boolean
  isError: boolean
  response: T['response'] | undefined
  responseUpdatedAt: number | undefined
  variables: T['variables'] | undefined
  error: T['error'] | undefined
  errorUpdatedAt: number | undefined
}

export type ActFn<T extends AsyncAction> = T['variables'] extends undefined
  ? () => Promise<{ response?: T['response']; error?: T['error']; variables?: T['variables'] }>
  : (
      variables: T['variables'],
    ) => Promise<{ response?: T['response']; error?: T['error']; variables?: T['variables'] }>

export type InitAsyncActionOptions<T extends AsyncAction> = {
  actionFn: (variables: T['variables'], state: AsyncActionState<T>) => Promise<T['response']>
  onSuccess?: (
    response: T['response'],
    variables: T['variables'],
    stateBeforeMutate: AsyncActionState<T>,
  ) => void
  onError?: (
    error: T['error'],
    variables: T['variables'],
    stateBeforeMutate: AsyncActionState<T>,
  ) => void
  onSettled?: (variables: T['variables'], stateBeforeMutate: AsyncActionState<T>) => void
}

// ----------------------------------------
// Source code

export const getAsyncActionStoreInitializer = <T extends AsyncAction>(
  options: InitAsyncActionOptions<T>,
) => {
  // prettier-ignore
  const {
    actionFn,
    onSuccess = noop,
    onError,
    onSettled = noop,
  } = options

  const initializer: StoreInitializer<AsyncActionState<T>, { act: ActFn<T>; reset: () => void }> = (
    storeApi,
  ) => {
    const { set, get, getInitial } = storeApi

    storeApi.act = ((variables) => {
      set({ isWaiting: true })
      const stateBeforeMutate = get()
      return new Promise((resolve) => {
        actionFn(variables, stateBeforeMutate)
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
    }) as ActFn<T>

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
