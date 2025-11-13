import { describe, expect, it } from 'vitest'

import { validateEscapeChar } from '../../src/options/escapeChar'

describe('validateEscapeChar', () => {
  it('should return undefined if no escape character is provided', () => {
    expect(validateEscapeChar()).toBeUndefined()
  })

  it('should throw an error if the escape character is not a single character string', () => {
    expect(() => validateEscapeChar('ab')).toThrowError('Escape character must be a single character string.')
  })

  it('should return the escape character if it is valid', () => {
    expect(validateEscapeChar('a')).toBe('a')
  })
})
