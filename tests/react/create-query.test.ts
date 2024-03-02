import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UseQuery, createQuery } from 'dev-disk/react'
import { renderHook } from '../test-utils'

describe('createQuery', () => {
  describe('Single query - without param', () => {
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
      expect(result.current.status).toBe('pending')
      expect(result.current.isPending).toBe(true)
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

        expect(current.status).toBe('success')
        expect(current.isPending).toBe(false)
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
  })
})
