import { describe, expect, it } from 'vitest'

import { validateComments } from '../../src/options/comments'
import { BAD_DELIMITERS } from '../../src/options/constants'

describe('validateComments', () => {
  it('should return undefined when comments is undefined', () => {
    expect(validateComments(undefined)).toBeUndefined()
  })

  it('should return false when comments is false', () => {
    expect(validateComments(false)).toBe(false)
  })

  it('should return "#" when comments is true', () => {
    expect(validateComments(true)).toBe('#')
  })

  it('should throw an error when comments is the same as delimiter', () => {
    expect(() => validateComments(',', ',')).toThrow('Comment character same as delimiter')
  })

  it('should throw an error for invalid comment characters', () => {
    BAD_DELIMITERS.forEach((badChar) => {
      expect(() => validateComments(badChar)).toThrow(`Invalid comment character: ${badChar}`)
    })
  })

  it('should return the comment character when valid', () => {
    expect(validateComments(';')).toBe(';')
    expect(validateComments('//')).toBe('//')
  })
})
