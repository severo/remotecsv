import { describe, expect, it } from 'vitest'

import { checkIntegerGreaterOrEqualThan } from '../../src/options/check'

describe('checkIntegerGreaterOrEqualThan', () => {
  it.for([1, 100])('returns the provided valid integer', (value) => {
    expect(checkIntegerGreaterOrEqualThan(value, 1)).toBe(value)
  })
  it.for([0, -1])('accepts negative minimum value', (minValue) => {
    expect(checkIntegerGreaterOrEqualThan(0, minValue)).toBe(0)
  })
  it('accepts undefined', () => {
    expect(checkIntegerGreaterOrEqualThan(undefined, 1)).toBe(undefined)
  })
  it.for([0, -1])('throws error for lower value', (value) => {
    expect(() => checkIntegerGreaterOrEqualThan(value, 1)).toThrow()
  })
  it.for([1.5, NaN, -Infinity, Infinity])('throws error for non-integer value', (value) => {
    expect(() => checkIntegerGreaterOrEqualThan(value, 1)).toThrow()
  })
})
