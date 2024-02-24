// import { useEffect, useLayoutEffect } from 'react'
// That doesn't work in ESM, because React libs are CJS only.
// See: https://github.com/pmndrs/valtio/issues/452
// The following is a workaround until ESM is supported.
import ReactExports from 'react'
import { isClient } from 'dev-disk'

const { useEffect, useLayoutEffect } = ReactExports

/**
 * Does exactly same as `useLayoutEffect`.\
 * It will use `useEffect` in **server-side** to prevent warning from Next.js.
 */
export const useIsomorphicLayoutEffect = isClient ? useLayoutEffect : useEffect
