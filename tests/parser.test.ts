import { describe, expect, it } from 'vitest'

import { parse, validateOptions } from '../src/parser'
import { CORE_PARSER_TESTS } from './cases'

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

  it('should handle partial options', () => {
    const inputOptions = {
      delimiter: '\t',
      comments: '//',
      quoteChar: '\'',
    }
    const options = validateOptions(inputOptions)
    expect(options.delimiter).toBe('\t')
    expect(options.newline).toBe('\n')
    expect(options.quoteChar).toBe('\'')
    expect(options.escapeChar).toBe('\'')
    expect(options.comments).toBe('//')
    expect(options.ignoreLastRow).toBe(false)
  })
})

describe('Core parser tests', () => {
  CORE_PARSER_TESTS.forEach((test) => {
    it(test.description, () => {
      const config = test.config || {}
      const result = [...parse(test.input, config)]
      const data = result.map(({ row }) => row)
      const errors = result.flatMap(({ errors: rowErrors }, row) => rowErrors.map(error => ({ ...error, row })))
      expect(data).toEqual(test.expected.data)
      expect(errors).toEqual(test.expected.errors)
      // TODO(SL): meta test
    })
  })
})
