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
})

describe('guessLineEndings', () => {
  it('should guess \\n as line ending', () => {
    const text = 'line1\nline2\nline3'
    expect(guessLineEndings(text, '"')).toBe('\n')
  })

  it('should guess \\r as line ending', () => {
    const text = 'line1\rline2\rline3'
    expect(guessLineEndings(text, '"')).toBe('\r')
  })

  it('should guess \\r\\n as line ending', () => {
    const text = 'line1\r\nline2\r\nline3'
    expect(guessLineEndings(text, '"')).toBe('\r\n')
  })

  it('should ignore quoted newlines', () => {
    const text = 'line1,"line2\nwith newline",line3\r\nline4'
    expect(guessLineEndings(text, '"')).toBe('\r\n')
  })

  it.for([
    { text: 'line1\rline2\nline3\r\nline4\nline5\r', expected: '\r' },
    { text: 'line1\nline2\rline3\r\nline4\nline5\n', expected: '\n' },
    { text: 'line1\r\nline2\rline3\nline4\r\nline5\r\n', expected: '\r\n' },
  ])('should handle mixed line endings', ({ text, expected }) => {
    expect(guessLineEndings(text, '"')).toBe(expected)
  })
})
