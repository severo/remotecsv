import { describe, expect, it } from 'vitest'

import { parseString } from '../src/string'
import { testEmptyLine } from '../src/utils'
import { cases, PARSE_TESTS } from './cases'

describe('parseString', () => {
  it('decodes a string', () => {
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
          newline: '\n' as const,
          byteCount: bytes.length,
        },
      })
    }
    // For now: only one iteration per chunk
    expect(i).toBe(1)
  })
  it.for(cases)('$description', ({ input, expected }) => {
    const results = [...parseString(input)]

    expect(results.map(({ row }) => row)).toEqual(expected.rows)
    // TODO(SL): check the metadata and the errors too
  })

  it.for([
    { description: '', input: 'a,b,c\n\nd,e,f', expected: [['a', 'b', 'c'], ['d', 'e', 'f']] },
    { description: ', with newline at end of input', input: 'a,b,c\r\n\r\nd,e,f\r\n', expected: [['a', 'b', 'c'], ['d', 'e', 'f']] },
    { description: ', with empty input', input: '', expected: [] },
    { description: ', with first line only whitespace', input: ' \na,b,c', expected: [[' '], ['a', 'b', 'c']] },
    { description: ', with comments', input: '#comment line 1\n#comment line 2\na,b,c\n#comment line 3\nd,e,f\n', expected: [['a', 'b', 'c'], ['d', 'e', 'f']] },
  ])('works together with testEmptyLine to skip empty lines$description', ({ input, expected }) => {
    const results = [...parseString(input, { comments: '#' })].filter(({ row }) => !testEmptyLine(row, true))

    expect(results.map(({ row }) => row)).toEqual(expected)
  })

  it.for([
    { description: '', input: 'a,b\n\n,\nc,d\n , \n""," "\n\t,\t\n,,,,\n', expected: [['a', 'b'], ['c', 'd']] },
    { description: ', with quotes and delimiters as content', input: 'a,b\n\n,\nc,d\n" , ",","\n""" """,""""""\n\n\n', expected: [['a', 'b'], ['c', 'd'], [' , ', ','], ['" "', '""']] },
  ])('works together with testEmptyLine to skip empty lines, in greedy mode$description', ({ input, expected }) => {
    const results = [...parseString(input)].filter(({ row }) => !testEmptyLine(row, 'greedy'))

    expect(results.map(({ row }) => row)).toEqual(expected)
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
