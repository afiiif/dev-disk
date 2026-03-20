import { useRef, useState } from 'react';
import {
  type InitStoreOptions,
  type SetState,
  type StoreApi,
  getHash,
  hasValue,
  identity,
  initStore,
  isClient,
  noop,
  shallow,
} from '../vanilla.ts';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect.ts';

export type QueryState<TData> = {
  isPending: boolean;
  isRevalidating: boolean;
  isRetrying: boolean;
  retryCount: number;
} & (
  | {
      state: 'INITIAL';
      isSuccess: false;
      isError: false;
      data: undefined;
      dataUpdatedAt: undefined;
      error: undefined;
      errorUpdatedAt: undefined;
    }
  | {
      state: 'SUCCESS';
      isSuccess: true;
      isError: false;
      data: TData;
      dataUpdatedAt: number;
      error: undefined;
      errorUpdatedAt: undefined;
    }
  | {
      state: 'ERROR';
      isSuccess: false;
      isError: true;
      data: undefined;
      dataUpdatedAt: undefined;
      error: any;
      errorUpdatedAt: number;
    }
  | {
      state: 'SUCCESS_BUT_REVALIDATION_ERROR';
      isSuccess: true;
      isError: false;
      data: TData;
      dataUpdatedAt: number;
      error: any;
      errorUpdatedAt: number;
    }
);

export type QueryOptions<TData, TVariable extends Record<string, any>> = InitStoreOptions<
  QueryState<TData>
> & {
  staleTime?: number; // milliseconds
  gcTime?: number; // milliseconds
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  onSuccess?: (data: TData, variable: TVariable, stateBeforeExecute: QueryState<TData>) => void;
  onError?: (error: any, variable: TVariable, stateBeforeExecute: QueryState<TData>) => void;
  shouldRetry?: (error: any, currentState: QueryState<TData>) => [true, number] | [false];
};

export const createQuery = <TData, TVariable extends Record<string, any> = never>(
  queryFn: (variable: TVariable, currentState: QueryState<TData>) => Promise<TData>,
  options: QueryOptions<TData, TVariable> = {},
) => {
  const {
    staleTime = 2500, // 2.5 seconds,
    gcTime = 5 * 60 * 1000, // 5 minutes
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    onSuccess = noop,
    onError,
    shouldRetry: shouldRetryFn = (_, s) => (s.retryCount === 0 ? [true, 1500] : [false]),
  } = options;

  type TState = QueryState<TData>;

  const initialState = {
    isPending: false,
    isRevalidating: false,
    isRetrying: false,
    retryCount: 0,
    state: 'INITIAL',
    isSuccess: false,
    isError: false,
    data: undefined,
    dataUpdatedAt: undefined,
    error: undefined,
    errorUpdatedAt: undefined,
  } as TState;

  const stores = new Map<string, StoreApi<TState>>();

  const configureStoreEvents = (keyHash: string): InitStoreOptions<TState> => {
    const revalidate = () => internals.get(keyHash)!.revalidate();
    return {
      ...options,
      onFirstSubscribe: (state, store) => {
        options.onFirstSubscribe?.(state, store);
        // Cancel garbage collection timeout
        const { metadata } = internals.get(keyHash)!;
        clearTimeout(metadata.garbageCollectionTimeoutId);
        // Attach window events
        if (isClient) {
          if (revalidateOnFocus) window.addEventListener('focus', revalidate);
          if (revalidateOnReconnect) window.addEventListener('online', revalidate);
        }
      },
      onLastUnsubscribe: (state, store) => {
        options.onLastUnsubscribe?.(state, store);
        // Start garbage collection timeout
        const { metadata } = internals.get(keyHash)!;
        metadata.garbageCollectionTimeoutId = setTimeout(() => {
          store.setState(initialState);
        }, gcTime);
        // Cancel retry
        clearTimeout(metadata.retryTimeoutId);
        store.setState({ retryCount: 0 });
        // Detach window events
        if (isClient) {
          if (revalidateOnFocus) window.removeEventListener('focus', revalidate);
          if (revalidateOnReconnect) window.removeEventListener('online', revalidate);
        }
      },
    };
  };

  // -------

  type Internal = {
    metadata: {
      promise?: Promise<TState> | undefined;
      retryTimeoutId?: number;
      retryResolver?: ((value: TState | PromiseLike<TState>) => void) | undefined;
      garbageCollectionTimeoutId?: number;
    };
    execute: () => Promise<TState>;
    revalidate: () => Promise<TState>;
  };
  const internals = new Map<string, Internal>();

  const configureInternals = (
    store: StoreApi<TState>,
    key: TVariable,
    keyHash: string,
  ): Internal => ({
    metadata: {},
    execute: () => execute(store, key, keyHash),
    revalidate: () => revalidate(store, key, keyHash),
  });

  const execute = async (store: StoreApi<TState>, key: TVariable, keyHash: string) => {
    const { metadata } = internals.get(keyHash)!;
    if (metadata.promise) return metadata.promise;
    clearTimeout(metadata.retryTimeoutId);

    const createPromise = () => {
      const promise = new Promise<TState>((resolve) => {
        const stateBeforeExecute = store.getState();
        store.setState({
          isPending: true,
          isRevalidating: stateBeforeExecute.state === 'SUCCESS',
          isRetrying: !!metadata.retryResolver,
          retryCount: metadata.retryResolver ? stateBeforeExecute.retryCount + 1 : 0,
        });
        queryFn(key, stateBeforeExecute)
          .then((data) => {
            store.setState({
              isPending: false,
              isRevalidating: false,
              isRetrying: false,
              retryCount: 0,
              state: 'SUCCESS',
              isSuccess: true,
              isError: false,
              data,
              dataUpdatedAt: Date.now(),
              error: undefined,
              errorUpdatedAt: undefined,
            });
            resolve(store.getState());
            metadata.retryResolver?.(store.getState());
            metadata.retryResolver = undefined;
            onSuccess(data, key, stateBeforeExecute);
          })
          .catch((error) => {
            store.setState({
              isPending: false,
              isRevalidating: false,
              isRetrying: false,
            });
            const [shouldRetry, retryDelay] = shouldRetryFn(error, store.getState());
            if (shouldRetry) {
              metadata.retryResolver = resolve;
              metadata.retryTimeoutId = setTimeout(createPromise, retryDelay);
            } else {
              const state = store.getState();
              store.setState({
                isPending: false,
                isRevalidating: false,
                isRetrying: false,
                retryCount: 0,
                state: state.data ? 'SUCCESS_BUT_REVALIDATION_ERROR' : 'ERROR',
                error,
                errorUpdatedAt: Date.now(),
              });
              if (onError) onError(error, key, stateBeforeExecute);
              else console.error(state);
              resolve(state);
              metadata.retryResolver?.(state);
              metadata.retryResolver = undefined;
            }
          })
          .finally(() => {
            metadata.promise = undefined;
          });
      });
      metadata.promise = promise;
      return promise;
    };
    return createPromise();
  };

  const revalidate = async (store: StoreApi<TState>, key: TVariable, keyHash: string) => {
    const { metadata } = internals.get(keyHash)!;
    if (metadata.promise) return metadata.promise;
    const state = store.getState();
    if (state.dataUpdatedAt && state.dataUpdatedAt + staleTime > Date.now()) return state;
    return execute(store, key, keyHash);
  };

  // -------

  const getStore = (key: TVariable = {} as TVariable) => {
    const keyHash = getHash(key);
    let store: StoreApi<TState>;
    if (stores.has(keyHash)) {
      store = stores.get(keyHash)!;
    } else {
      store = initStore(initialState, configureStoreEvents(keyHash));
      stores.set(keyHash, store);
      internals.set(keyHash, configureInternals(store, key, keyHash));
    }

    const useStore = <TStateSlice = TState>(
      options: {
        enabled?: boolean;
        keepPreviousData?: boolean;
      } = {},
      selector: (state: TState) => TStateSlice = identity as (state: TState) => TStateSlice,
    ) => {
      // Store subscription & reactivity
      const [, reRender] = useState({});
      const selectorRef = useRef(selector);
      selectorRef.current = selector;
      useIsomorphicLayoutEffect(
        () =>
          store.subscribe((state, prevState) => {
            const prevSlice = selectorRef.current(prevState);
            const nextSlice = selectorRef.current(state);
            if (!shallow(prevSlice, nextSlice)) reRender({});
          }),
        [store],
      );

      // Execute queryFn on mount & on re-render
      useIsomorphicLayoutEffect(() => {
        if (options.enabled !== false) revalidate(store, key, keyHash);
      }, [store, options.enabled]);

      // Handle keepPreviousData
      const storeState = store.getState();
      const lastSuccessData = useRef({
        data: storeState.data,
        dataUpdatedAt: storeState.dataUpdatedAt,
      });
      if (hasValue(storeState.data)) {
        lastSuccessData.current = {
          data: storeState.data,
          dataUpdatedAt: storeState.dataUpdatedAt,
        };
      }
      let storeStateToBeUsed = storeState;
      if (options.keepPreviousData && !hasValue(storeState.data)) {
        const hasPreviousData = hasValue(lastSuccessData.current.data);
        if (hasPreviousData) {
          storeStateToBeUsed = { ...storeState, ...lastSuccessData.current } as TState;
        }
      }

      return selector(storeStateToBeUsed);
    };

    return Object.assign(useStore, {
      subscribe: store.subscribe,
      getSubscribers: store.getSubscribers,
      getState: store.getState,
      setState: (value: SetState<TState>) => {
        console.debug('Manual setState (not via provided actions) on query store');
        store.setState(value);
      },
      ...internals.get(keyHash)!,
    });
  };

  return getStore;
};
