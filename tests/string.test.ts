import { describe, expect, it, test } from 'vitest'

import { parseString } from '../src/string'
import { cases, PARSE_TESTS } from './cases'

describe('parseString', () => {
  test('decodes a string', () => {
    const text = 'hello, csvremote!!!'
    const encoder = new TextEncoder()
    const bytes = encoder.encode(text)
    let i = 0
    for (const result of parseString(text)) {
      i++
      expect(result).toEqual({
        row: ['hello', ' csvremote!!!'],
        errors: [],
        meta: {
          cursor: text.length,
          offset: 0,
          delimiter: ',',
          newline: '\n',
          // quote: '"',
          byteCount: bytes.length,
        },
      })
    }
    // For now: only one iteration per chunk
    expect(i).toBe(1)
  })
  test.for(cases)('$description', ({ input, expected }) => {
    const results = [...parseString(input)]

    expect(results.map(({ row }) => row)).toEqual(expected.rows)
    // TODO(SL): check the metadata and the errors too
  })
})

describe('Papaparse high-level tests', () => {
  PARSE_TESTS.forEach((test) => {
    it(test.description, () => {
      const config: Parameters<typeof parseString>[1] = test.config || {}
      const result = [...parseString(test.input, config)]
      const data = result.map(({ row }) => row)
      const errors = result.flatMap(({ errors: rowErrors }, row) => rowErrors.map((error) => {
        if (error.code === 'UndetectableDelimiter') {
          // no 'row' in this error (papaparse)
          return error
        }
        return { ...error, row }
      }))
      expect(data).toEqual(test.expected.data)
      expect(errors).toEqual(test.expected.errors)
      // TODO(SL): meta test
    })
  })
})
