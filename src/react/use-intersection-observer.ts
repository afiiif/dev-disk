// import { useEffect, useRef } from 'react'
// That doesn't work in ESM, because React libs are CJS only.
// See: https://github.com/pmndrs/valtio/issues/452
// The following is a workaround until ESM is supported.
import ReactExports from 'react'
import { noop } from 'dev-disk'

const { useEffect, useRef } = ReactExports

type Props = IntersectionObserverInit & {
  onIntersect?: (isIntersecting: boolean, entry?: IntersectionObserverEntry) => void
  onEnter?: (entry?: IntersectionObserverEntry) => void
  onLeave?: (entry?: IntersectionObserverEntry) => void
  enabled?: boolean
}

/**
 * Track intersection of a DOM element with a top-level document's viewport or with an ancestor element using Intersection Observer API.
 */
export const useIntersectionObserver = <T extends Element = HTMLDivElement>({
  onIntersect = noop,
  onEnter = noop,
  onLeave = noop,
  enabled = true,
  ...options
}: Props) => {
  const ref = useRef<T | null>(null)

  const handlerRef = useRef<Partial<Props>>()
  handlerRef.current = { onIntersect, onEnter, onLeave }

  useEffect(() => {
    if (!enabled || !ref.current || typeof IntersectionObserver !== 'function') return

    const observer = new IntersectionObserver(([entry]) => {
      handlerRef.current!.onIntersect!(entry.isIntersecting, entry)
      if (entry.isIntersecting) handlerRef.current!.onEnter!(entry)
      else handlerRef.current!.onLeave!(entry)
    }, options)

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [enabled, options.root, options.rootMargin, options.threshold])

  return ref
}
