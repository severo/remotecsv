import { describe, expect, it, test } from 'vitest'

import { parseChunk } from '../src/chunk'
import { cases, PARSE_TESTS } from './cases'

describe('parseChunk', () => {
  test('decodes a UTF-8 bytes array', () => {
    const text = 'hello, csvremote!!!'
    const encoder = new TextEncoder()
    const bytes = encoder.encode(text)
    let i = 0
    for (const result of parseChunk(bytes)) {
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
    const encoder = new TextEncoder()
    const bytes = encoder.encode(input)
    const results = [...parseChunk(bytes)]

    expect(results.map(({ row }) => row)).toEqual(expected.rows)
    // TODO(SL): check the metadata and the errors too
  })
})

describe('High-level tests', () => {
  PARSE_TESTS.forEach((test) => {
    it(test.description, () => {
      const config: Parameters<typeof parseChunk>[1] = test.config || {}
      const encoder = new TextEncoder()
      const bytes = encoder.encode(test.input)
      const result = [...parseChunk(bytes, config)]
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
