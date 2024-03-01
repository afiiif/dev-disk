import { describe, expect, it } from 'vitest'
import { shallow } from 'dev-disk'

describe('shallow', () => {
  it('compares primitive values', () => {
    expect(shallow(true, true)).toBe(true)
    expect(shallow(true, false)).toBe(false)

    expect(shallow(1, 1)).toBe(true)
    expect(shallow(1, 2)).toBe(false)

    expect(shallow('foo', 'foo')).toBe(true)
    expect(shallow('foo', 'bar')).toBe(false)

    expect(shallow(undefined, undefined)).toBe(true)
    expect(shallow(null, null)).toBe(true)
    expect(shallow(NaN, NaN)).toBe(true)
    expect(shallow(undefined, null)).toBe(false)
    expect(shallow(undefined, NaN)).toBe(false)
    expect(shallow(null, NaN)).toBe(false)
  })

  it('compares objects', () => {
    expect(shallow({ foo: 'bar', asd: 123 }, { foo: 'bar', asd: 123 })).toBe(true)
    expect(shallow({ foo: 'bar', asd: 123 }, { foo: 'bar', foobar: true })).toBe(false)
    expect(shallow({ foo: 'bar', asd: 123 }, { foo: 'bar', asd: 123, foobar: true })).toBe(false)
  })

  it('compares arrays', () => {
    expect(shallow([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(shallow([1, 2, 3], [2, 3, 4])).toBe(false)
    expect(shallow([0, null, NaN], [0, null, NaN])).toBe(true)

    expect(shallow([{ foo: 'bar' }, { asd: 123 }], [{ foo: 'bar' }, { asd: 123 }])).toBe(false)
    expect(shallow([{ foo: 'bar' }], [{ foo: 'bar', asd: 123 }])).toBe(false)
  })

  it('compares Sets', () => {
    expect(shallow(new Set(['bar', 123]), new Set(['bar', 123]))).toBe(true)
    expect(shallow(new Set(['bar', 123]), new Set(['bar', 2]))).toBe(false)
    expect(shallow(new Set(['bar', 123]), new Set(['bar', 123, true]))).toBe(false)
  })

  it('compares Maps', () => {
    function createMap<T extends object>(obj: T) {
      return new Map(Object.entries(obj))
    }

    expect(shallow(createMap({ foo: 'bar', asd: 123 }), createMap({ foo: 'bar', asd: 123 }))).toBe(
      true,
    )

    expect(
      shallow(createMap({ foo: 'bar', asd: 123 }), createMap({ foo: 'bar', foobar: true })),
    ).toBe(false)

    expect(
      shallow(
        createMap({ foo: 'bar', asd: 123 }),
        createMap({ foo: 'bar', asd: 123, foobar: true }),
      ),
    ).toBe(false)
  })

  it('compares functions', () => {
    function firstFn() {
      return { foo: 'bar' }
    }
    function secondFn() {
      return { foo: 'bar' }
    }
    expect(shallow(firstFn, firstFn)).toBe(true)
    expect(shallow(secondFn, secondFn)).toBe(true)
    expect(shallow(firstFn, secondFn)).toBe(false)
  })
})

describe('unsupported cases', () => {
  it('date', () => {
    expect(
      shallow(new Date('2022-07-19T00:00:00.000Z'), new Date('2022-07-20T00:00:00.000Z')),
    ).not.toBe(false)
  })
})
