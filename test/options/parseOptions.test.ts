import { describe, expect, it } from 'vitest'

import { validateAndGuessParseOptions, validateAndSetDefaultParseOptions } from '../../src/options/parseOptions'

describe('validateAndGuessParseOptions', () => {
  it('should return valid options when all are provided', () => {
    const inputOptions = {
      delimiter: ';',
      newline: '\r\n' as const,
      quoteChar: '\'',
      escapeChar: '\\',
      comments: '#',
      initialState: 'inQuotes' as const,
      stripBOM: false,
    }
    const { parseOptions, error } = validateAndGuessParseOptions(inputOptions, { text: '' })
    expect(error).toBeUndefined()
    expect(parseOptions).toEqual(inputOptions)
  })

  it('should guess missing delimiter', () => {
    const csvText = 'name;age;city\nAlice;30;New York\nBob;25;Los Angeles'
    const inputOptions = {
      newline: '\n' as const,
      quoteChar: '"',
      escapeChar: '"',
      comments: false,
      initialState: 'default' as const,
    }
    const { parseOptions, error } = validateAndGuessParseOptions(inputOptions, { text: csvText })
    expect(error).toBeUndefined()
    expect(parseOptions.delimiter).toBe(';')
  })

  it('should return an error when delimiter cannot be guessed', () => {
    const csvText = 'name age city\nAlice 30 New York\nBob 25 Los Angeles'
    const inputOptions = {
      newline: '\n' as const,
      quoteChar: '"',
      escapeChar: '"',
      comments: false,
      initialState: 'default' as const,
    }
    const { parseOptions, error } = validateAndGuessParseOptions(inputOptions, { text: csvText })
    expect(error).toBeDefined()
    expect(error?.type).toBe('Delimiter')
    expect(parseOptions.delimiter).toBe(',')
  })

  it.each([
    { text: '"na\nme","age","city"\n"Alice","30","New York"\n"Bob","25","Los Angeles"', expectedState: 'default' as const },
    { text: 'na\nme","age","city"\n"Alice","30","New York"\n"Bob","25","Los Angeles"', expectedState: 'inQuotes' as const },
  ])('should detect initial state: $expectedState', ({ text, expectedState }) => {
    const inputOptions = {
      delimiter: ',',
      newline: '\n' as const,
      quoteChar: '"',
      escapeChar: '"',
      comments: false,
      initialState: 'detect' as const,
    }
    const { parseOptions, error } = validateAndGuessParseOptions(inputOptions, { text })
    expect(error).toBeUndefined()
    expect(parseOptions.initialState).toBe(expectedState)
  })
})

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
      initialState: 'inQuotes' as const,
      stripBOM: false,
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
    expect(options.initialState).toBe('default')
  })

  it('throws for invalid options', () => {
    expect(() => validateAndSetDefaultParseOptions({ initialState: 'detect' })).toThrow()
  })
})
