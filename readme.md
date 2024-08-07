# Dev Disk 💽

The tiny utility library for JavaScript/TypeScript project.

This library is intentionally minimalist, designed to handle **most cases**.  
It's deliberately not built to handle rare cases to keep its size from becoming bloated.

Basically it is the improved version & unnecessary-utilities-removed version of my previous libraries:

- [FloppyDisk.js](https://floppy-disk.vercel.app/)
- [React Power-Ups](https://afiiif.github.io/react-power-ups/)

Also, **Dev Disk** supports ESM & CommonJS ✅  
You can check it out at [https://www.npmjs.com/package/dev-disk](https://www.npmjs.com/package/dev-disk).

## Composition

- Vanilla JS 👉 `import { ... } from "dev-disk"`
- React JS 👉 `import { ... } from "dev-disk/react"`

_If you're interested in diving deeper, feel free to check out the source code._

## Vanilla JS Utilities

### Common Helpers

- [`noop`](./src/vanilla/utils.ts) - Empty function
- [`identity`](./src/vanilla/utils.ts) - Identity function
- [`hasValue`](./src/vanilla/utils.ts) - Check if a value is not `undefined` and not `null`
- [`isObject`](./src/vanilla/utils.ts) - Check if a value is object (`Record<string, any>`)
- [`getValue`](./src/vanilla/utils.ts) - If the value is a function, it will get the returned value, otherwise it will get the value
- [`getHash`](./src/vanilla/utils.ts) - Get stable hash (string) from object/array
- [`swapKeyValue`](./src/vanilla/utils.ts) - Get a swaped key-value object
- [`sleep`](./src/vanilla/utils.ts) - Delay the next operation for a specific duration
- [`split2`](./src/vanilla/utils.ts) - Split string into 2 parts
- [`cn`](./src/vanilla/utils.ts) - A minimalist `className` utility
- [`shallow`](./src/vanilla/shallow.ts) - Shallow compare

### Error Handling

- [`createError`](./src/vanilla/error-handling.ts) - Create an Error instance with custom props
- [`noThrow`](./src/vanilla/error-handling.ts) - Higher-order function to prevent a function throwing error when invoked
- [`noReject`](./src/vanilla/error-handling.ts) - Higher-order function to prevent an async function throwing promise-rejection error when invoked

### Data-Fetching Related

- [`objectToQueryString`](./src/vanilla/url.ts) - Convert object to search param (string)
- [`queryStringToObject`](./src/vanilla/url.ts) - Convert search param (string) to object
- [`http`](./src/vanilla/fetcher.ts) - Minimalist abstraction for `fetch` API
  - `http.get`
  - `http.post`
  - `http.put`
  - `http.delete`
  - `http.gql`

### Publish-Subscribe Pattern

- [`initStore`](./src/vanilla/store.ts) - Create vanilla JS store that can be subscribed
- [`initStores`](./src/vanilla/stores.ts) - Same as `initStore` but for multiple stores, publish/subscribe/access the value using a store-key (that will be serialized into a string).

## React JS Utilities

- [`useIsomorphicLayoutEffect`](./src/react/use-isomorphic-layout-effect.ts) - Basically just `useLayoutEffect` without warning
- [`useBoolean`](./src/react/use-boolean.ts) - Handle boolean state with useful utility functions
- [`useDebounceFn`](./src/react/use-debounce-fn.ts) - Debounces a function
- [`useThrottleFn`](./src/react/use-throttle-fn.ts) - Throttles a function
- [`useIntersectionObserver`](./src/react/use-intersection-observer.ts) - Track intersection of a DOM element

### Global-State Manager Using Publish-Subscribe Pattern

- [`createStore`](./src/react/create-store.ts) - Just like Zustand's, but with store event & auto shallow compare (see vanilla [`initStore`](./src/vanilla/store.ts))
- [`createStores`](./src/react/create-stores.ts) - React implementation for vanilla [`initStores`](./src/vanilla/stores.ts)
- [`createQuery`](./src/react/create-query.ts) - Just like react-query's `useQuery`, but using Zustand's pattern.
- [`createAsyncAction`](./src/react/create-async-action.ts) - Just like react-query's `useMutation`, but using Zustand's pattern
