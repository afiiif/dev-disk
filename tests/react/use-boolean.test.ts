import { act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useBoolean } from 'dev-disk/react'
import { renderHook } from '../test-utils'

describe('useBoolean', () => {
  it('returns initial value', () => {
    const hook1 = renderHook(() => useBoolean())
    const hook2 = renderHook(() => useBoolean(true))
    const hook3 = renderHook(() => useBoolean(false))

    expect(hook1.result.current[0]).toBe(false)
    expect(hook2.result.current[0]).toBe(true)
    expect(hook3.result.current[0]).toBe(false)
  })

  it('sets the boolean state', () => {
    const { result } = renderHook(() => useBoolean())
    const [, actions] = result.current

    act(() => {
      actions.toggle()
    })
    expect(result.current[0]).toBe(true)

    act(() => {
      actions.toggle()
    })
    expect(result.current[0]).toBe(false)

    act(() => {
      actions.setFalse()
    })
    expect(result.current[0]).toBe(false)

    act(() => {
      actions.setTrue()
    })
    expect(result.current[0]).toBe(true)
  })
})
