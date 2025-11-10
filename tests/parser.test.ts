import { describe, expect, it } from 'vitest'

import { validateOptions } from '../src/parser'

describe('validateOptions', () => {
  it('should set default values for missing options', () => {
    const options = validateOptions({})
    expect(options.delimiter).toBe(',')
    expect(options.newline).toBe('\n')
    expect(options.quoteChar).toBe('"')
    expect(options.escapeChar).toBe('"')
    expect(options.comments).toBe(false)
    expect(options.ignoreLastRow).toBe(false)
  })

  it('should return the same options if all are provided', () => {
    const inputOptions = {
      delimiter: ';',
      newline: '\r\n',
      quoteChar: '\'',
      escapeChar: '\\',
      comments: '#',
      ignoreLastRow: true,
    }
    const options = validateOptions(inputOptions)
    expect(options).toEqual(inputOptions)
  })
})
