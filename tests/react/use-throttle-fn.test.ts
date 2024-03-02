import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useThrottleFn } from 'dev-disk/react'
import { renderHook } from '../test-utils'

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useThrottleFn', () => {
  it('throttles the function', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottleFn(callback, 1000))

    result.current('test')
    expect(callback).toHaveBeenCalledTimes(0)

    vi.advanceTimersByTime(500)
    result.current('test2')
    expect(callback).toHaveBeenCalledTimes(0)

    vi.advanceTimersByTime(500)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('test2')

    vi.advanceTimersByTime(500)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('test2')
  })

  it('clears the timeout', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useThrottleFn(callback, 1000))

    result.current('test')
    result.current.cancel() // Clear timeout

    vi.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(0)
  })
})
