import { describe, expect, it } from 'vitest'

import { guessLineEndings, validateNewline } from '../../src/options/newline'

describe('validateNewline', () => {
  it('should return undefined when no newline is provided', () => {
    expect(validateNewline()).toBeUndefined()
  })

  it('should return the provided valid newline', () => {
    expect(validateNewline('\n')).toBe('\n')
    expect(validateNewline('\r')).toBe('\r')
    expect(validateNewline('\r\n')).toBe('\r\n')
  })

  it('should throw an error for invalid newline', () => {
    expect(() => validateNewline('invalid')).toThrow('Invalid newline: invalid')
    expect(() => validateNewline('')).toThrow('Invalid newline: ')
    expect(() => validateNewline(' ')).toThrow('Invalid newline:  ')
  })
})

describe('guessLineEndings', () => {
  it('should guess \\n as line ending', () => {
    const input = 'line1\nline2\nline3'
    expect(guessLineEndings(input, '"')).toBe('\n')
  })

  it('should guess \\r as line ending', () => {
    const input = 'line1\rline2\rline3'
    expect(guessLineEndings(input, '"')).toBe('\r')
  })

  it('should guess \\r\\n as line ending', () => {
    const input = 'line1\r\nline2\r\nline3'
    expect(guessLineEndings(input, '"')).toBe('\r\n')
  })

  it('should ignore quoted newlines', () => {
    const input = 'line1,"line2\nwith newline",line3\r\nline4'
    expect(guessLineEndings(input, '"')).toBe('\r\n')
  })

  it.for([
    { input: 'line1\rline2\nline3\r\nline4\nline5\r', expected: '\r' },
    { input: 'line1\nline2\rline3\r\nline4\nline5\n', expected: '\n' },
    { input: 'line1\r\nline2\rline3\nline4\r\nline5\r\n', expected: '\r\n' },
  ])('should handle mixed line endings', ({ input, expected }) => {
    expect(guessLineEndings(input, '"')).toBe(expected)
  })
})
