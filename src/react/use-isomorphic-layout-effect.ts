import { useEffect, useLayoutEffect } from 'react'
import { isClient } from 'dev-disk'

/**
 * Does exactly same as `useLayoutEffect`.\
 * It will use `useEffect` in **server-side** to prevent warning from Next.js.
 */
export const useIsomorphicLayoutEffect = isClient ? useLayoutEffect : useEffect
