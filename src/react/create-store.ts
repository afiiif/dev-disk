import { useState } from 'react'
import {
  InitStoreOptions,
  SetState,
  StoreApi,
  StoreInitializer,
  initStore,
} from '../vanilla/store.ts'
import { useSyncStoreSlice } from './use-sync-store-slice.ts'

// ----------------------------------------
// Type definitions

export type UseStore<
  T extends Record<string, any>,
  TProps extends Record<string, any> = Record<string, never>,
> = StoreApi<T> &
  TProps & {
    <U = T>(selector?: (state: T) => U): U
  }

// ----------------------------------------
// Source code

export const createStore = <
  T extends Record<string, any>,
  TProps extends Record<string, any> = Record<string, never>,
>(
  initializer: StoreInitializer<T, TProps>,
  options: InitStoreOptions<T> = {},
): UseStore<T, TProps> => {
  const storeApi = initStore(initializer, options)

  const useStore = <U = T>(selector?: (state: T) => U) => {
    return useSyncStoreSlice(storeApi, selector)
  }

  return Object.assign(useStore, storeApi)
}

export const useInitialValue = <T extends Record<string, any>>(
  storeApi: StoreApi<T>,
  value: SetState<T>,
) => {
  useState(() => {
    // Note: Put `storeApi.set(value)` inside of useState to ensure it is only invoked once.
    if (storeApi.getSubscribers().size > 0) {
      console.warn(
        'The store already have subscriber.',
        'Consider calling setInitialValue on higher component, before any component subscribed.',
      )
    }
    storeApi.set(value)
  })
}
