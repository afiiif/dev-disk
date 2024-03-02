import { describe, expect, it, vi } from 'vitest'
import { useIntersectionObserver } from 'dev-disk/react'
import { renderHook } from '../test-utils'

type Props = IntersectionObserverInit & {
  onIntersect?: (isIntersecting: boolean, entry?: IntersectionObserverEntry) => void
  onEnter?: (entry?: IntersectionObserverEntry) => void
  onLeave?: (entry?: IntersectionObserverEntry) => void
  enabled?: boolean
}

describe('useIntersectionObserver', () => {
  it('returns a ref', () => {
    const { result } = renderHook(() => useIntersectionObserver({}))
    expect(result.current).toHaveProperty('current', null)
  })

  it('should not create an IntersectionObserver if not enabled', () => {
    const observe = vi.fn()
    const disconnect = vi.fn()
    ;(window as any).IntersectionObserver = vi.fn(() => ({ observe, disconnect }))

    const { result, rerender } = renderHook(
      ({ enabled }) => {
        return useIntersectionObserver({ enabled })
      },
      {
        initialProps: { enabled: false },
      },
    )

    const element = document.createElement('div')
    result.current.current = element
    expect((window as any).IntersectionObserver).not.toHaveBeenCalled()

    rerender({ enabled: true })
    expect((window as any).IntersectionObserver).toHaveBeenCalledTimes(1)
    expect(observe).toHaveBeenCalledTimes(1)
    expect(observe).toHaveBeenCalledWith(expect.any(HTMLDivElement))
    ;(window as any).IntersectionObserver.mockClear()
    delete (window as any).IntersectionObserver
  })

  it('triggers onIntersect, onEnter, and onLeave callbacks', () => {
    const observe = vi.fn()
    const disconnect = vi.fn()
    let callback: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {}
    ;(window as any).IntersectionObserver = vi.fn((callbackParam: any) => {
      callback = callbackParam
      return {
        observe,
        disconnect,
      }
    })

    const onIntersect = vi.fn()
    const onEnter = vi.fn()
    const onLeave = vi.fn()

    const { result, rerender } = renderHook(
      (props: Props) => {
        return useIntersectionObserver(props)
      },
      {
        initialProps: { enabled: false },
      },
    )
    const element = document.createElement('div')
    result.current.current = element

    rerender({ enabled: true, onIntersect, onEnter, onLeave })
    callback([{ isIntersecting: true }])
    expect(onIntersect).toHaveBeenCalledTimes(1)
    expect(onIntersect).toHaveBeenCalledWith(true, { isIntersecting: true })
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onLeave).not.toHaveBeenCalled()

    callback([{ isIntersecting: false }])
    expect(onIntersect).toHaveBeenCalledTimes(2)
    expect(onIntersect).toHaveBeenCalledWith(false, { isIntersecting: false })
    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onLeave).toHaveBeenCalledTimes(1)
    ;(window as any).IntersectionObserver.mockClear()
    delete (window as any).IntersectionObserver
  })
})
