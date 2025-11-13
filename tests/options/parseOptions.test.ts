import { describe, expect, it } from 'vitest'

import { validateAndSetDefaultParseOptions } from '../../src/options/parseOptions'

describe('validateAndSetDefaultParseOptions', () => {
  it('should set default values for missing options', () => {
    const options = validateAndSetDefaultParseOptions({})
    expect(options.delimiter).toBe(',')
    expect(options.newline).toBe('\n')
    expect(options.quoteChar).toBe('"')
    expect(options.escapeChar).toBe('"')
    expect(options.comments).toBe(false)
  })

  it('should return the same options if all are provided', () => {
    const inputOptions = {
      delimiter: ';',
      newline: '\r\n' as const,
      quoteChar: '\'',
      escapeChar: '\\',
      comments: '#',
    }
    const options = validateAndSetDefaultParseOptions(inputOptions)
    expect(options).toEqual(inputOptions)
  })

  it('should handle partial options', () => {
    const inputOptions = {
      delimiter: '\t',
      comments: '//',
      quoteChar: '\'',
    }
    const options = validateAndSetDefaultParseOptions(inputOptions)
    expect(options.delimiter).toBe('\t')
    expect(options.newline).toBe('\n')
    expect(options.quoteChar).toBe('\'')
    expect(options.escapeChar).toBe('\'')
    expect(options.comments).toBe('//')
  })
})
