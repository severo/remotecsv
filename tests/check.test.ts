import { describe, expect, it } from 'vitest'
import { checkStrictlyPositiveInteger, checkNonNegativeInteger } from '../src/check'

describe('checkStrictlyPositiveInteger', () => {
  it.for([1, 100])('returns the provided valid integer', (value) => {
    expect(checkStrictlyPositiveInteger(value)).toBe(value)
  })
  it('accepts undefined', () => {
    expect(checkStrictlyPositiveInteger(undefined)).toBe(undefined)
  })
  it.for([0, -1])('throws error for non-positive value', (value) => {
    expect(() => checkStrictlyPositiveInteger(value)).toThrow()
  })
  it.for([1.5, NaN, -Infinity, Infinity])('throws error for non-integer value', (value) => {
    expect(() => checkStrictlyPositiveInteger(value)).toThrow()
  })
})

describe('checkNonNegativeInteger', () => {
  it.for([0, 1, 100])('returns the provided valid integer', (value) => {
    expect(checkNonNegativeInteger(value)).toBe(value)
  })
  it('accepts undefined', () => {
    expect(checkNonNegativeInteger(undefined)).toBe(undefined)
  })
  it.for([-1])('throws error for negative value', (value) => {
    expect(() => checkNonNegativeInteger(value)).toThrow()
  })
  it.for([1.5, NaN, -Infinity, Infinity])('throws error for non-integer value', (value) => {
    expect(() => checkNonNegativeInteger(value)).toThrow()
  })
})
