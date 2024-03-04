import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UseQuery, createQuery } from 'dev-disk/react'
import { renderHook } from '../test-utils'

describe('createQuery for single query without param', () => {
  type MyQuery = {
    response: { id: number; name: string }
  }
  let useQuery: UseQuery<MyQuery>

  let queryFn = vi.fn()

  beforeEach(() => {
    queryFn = vi.fn().mockImplementation(async () => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ id: 1, name: 'test' }), 44)
      })
    })
    useQuery = createQuery<MyQuery>({ queryFn })
  })

  it('returns initial pending state', () => {
    const { result } = renderHook(() => useQuery())
    expect(result.current.status).toBe('empty')
    expect(result.current.isEmpty).toBe(true)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.data).toBe(undefined)
    expect(result.current.response).toBe(undefined)
    expect(result.current.responseUpdatedAt).toBe(undefined)
    expect(result.current.error).toBe(undefined)
    expect(result.current.errorUpdatedAt).toBe(undefined)
  })

  it('dedupes & updates state after successful fetch', async () => {
    const hook1 = renderHook(() => useQuery())
    const hook2 = renderHook(() => useQuery())
    expect(queryFn).toHaveBeenCalledTimes(1)
    expect(queryFn).toHaveBeenCalledWith({}, useQuery.$.get())

    await waitFor(() => {
      const { current } = hook1.result
      expect(current.isWaiting).toBe(true) // Waiting promise to be resolved
      expect(current.status).toBe('empty')
      expect(current.isEmpty).toBe(true)
      expect(current.isSuccess).toBe(false)
      expect(current.isError).toBe(false)
    })

    await waitFor(() => {
      const { current } = hook1.result
      expect(current.isWaiting).toBe(false) // And the promise resolved
      expect(current.status).toBe('success')
      expect(current.isEmpty).toBe(false)
      expect(current.isSuccess).toBe(true)
      expect(current.isError).toBe(false)
      expect(current.data).toEqual({ id: 1, name: 'test' })
      expect(current.response).toEqual({ id: 1, name: 'test' })
      expect(current.responseUpdatedAt).not.toBe(undefined)
      expect(typeof current.responseUpdatedAt).toBe('number')
      expect(current.error).toBe(undefined)
      expect(current.errorUpdatedAt).toBe(undefined)
      expect(hook2.result.current).toBe(current)
    })
  })

  it('updates state after failed fetch, and retries after failed fetch', async () => {
    queryFn = vi.fn().mockImplementation(async () => {
      // Always error
      return new Promise((_resolve, reject) => {
        setTimeout(() => reject(new Error('Test error')), 44)
      })
    })
    useQuery = createQuery<MyQuery>({ queryFn })

    const hook1 = renderHook(() => useQuery())
    const hook2 = renderHook(() => useQuery())

    await waitFor(() => {
      const { current } = hook1.result
      expect(current.isWaiting).toBe(true)
      expect(hook2.result.current.isWaiting).toBe(true)
    })
    await waitFor(() => {
      const { current } = hook1.result
      // On retry delay period
      expect(current.isWaiting).toBe(false)
      expect(current.isGoingToRetry).toBe(true)
      expect(hook2.result.current.isGoingToRetry).toBe(true)
      // Status has not been updated yet
      expect(current.status).toBe('empty')
      expect(current.isEmpty).toBe(true)
      expect(current.isSuccess).toBe(false)
      expect(current.isError).toBe(false)
      expect(current.data).toBe(undefined)
      expect(current.response).toBe(undefined)
      expect(current.responseUpdatedAt).toBe(undefined)
      expect(current.error).toBe(undefined)
      expect(current.errorUpdatedAt).toBe(undefined)
    })
    expect(queryFn).toHaveBeenCalledTimes(1)

    await waitFor(
      () => {
        const { current } = hook1.result
        expect(current.isWaiting).toBe(true)
        expect(hook2.result.current.isWaiting).toBe(true)
      },
      { timeout: 1600 },
    )

    await waitFor(() => {
      const { current } = hook1.result
      expect(current.status).toBe('error')
      expect(current.isEmpty).toBe(false)
      expect(current.isSuccess).toBe(false)
      expect(current.isError).toBe(true)
      expect(current.isWaiting).toBe(false)
      expect(current.isGoingToRetry).toBe(false)
      expect(current.data).toBe(undefined)
      expect(current.response).toBe(undefined)
      expect(current.responseUpdatedAt).toBe(undefined)
      expect(current.error).toEqual(new Error('Test error'))
      expect(current.errorUpdatedAt).not.toBe(undefined)
      expect(typeof current.errorUpdatedAt).toBe('number')
      expect(hook2.result.current).toBe(current)
    })
    expect(queryFn).toHaveBeenCalledTimes(2)
  })
})
