import { describe, expect, it } from 'vitest'

import { parseText } from '../src/text'
import { isEmptyLine } from '../src/utils'
import { PARSE_TESTS } from './cases'

describe('parseText', () => {
  it('decodes a string', () => {
    const text = 'hello, csvremote!!!'
    const encoder = new TextEncoder()
    const bytes = encoder.encode(text)
    let i = 0
    for (const result of parseText(text)) {
      i++
      expect(result).toEqual({
        row: ['hello', ' csvremote!!!'],
        errors: [],
        meta: {
          delimiter: ',',
          newline: '\n' as const,
          byteOffset: 0,
          byteCount: bytes.length,
          charCount: text.length,
        },
      })
    }
    // For now: only one iteration per chunk
    expect(i).toBe(1)
  })

  it.for([
    { description: '', text: 'a,b,c\n\nd,e,f', expected: [['a', 'b', 'c'], ['d', 'e', 'f']] },
    { description: ', with newline at end of text', text: 'a,b,c\r\n\r\nd,e,f\r\n', expected: [['a', 'b', 'c'], ['d', 'e', 'f']] },
    { description: ', with empty text', text: '', expected: [] },
    { description: ', with first line only whitespace', text: ' \na,b,c', expected: [[' '], ['a', 'b', 'c']] },
    { description: ', with comments', text: '#comment line 1\n#comment line 2\na,b,c\n#comment line 3\nd,e,f\n', expected: [['a', 'b', 'c'], ['d', 'e', 'f']] },
  ])('works together with isEmptyLine to skip empty lines$description', ({ text, expected }) => {
    const results = [...parseText(text, { comments: '#' })].filter(({ row }) => !isEmptyLine(row))

    expect(results.map(({ row }) => row)).toEqual(expected)
  })

  it.for([
    { description: '', text: 'a,b\n\n,\nc,d\n , \n""," "\n\t,\t\n,,,,\n', expected: [['a', 'b'], ['c', 'd']] },
    { description: ', with quotes and delimiters as content', text: 'a,b\n\n,\nc,d\n" , ",","\n""" """,""""""\n\n\n', expected: [['a', 'b'], ['c', 'd'], [' , ', ','], ['" "', '""']] },
  ])('works together with isEmptyLine to skip empty lines, in greedy mode$description', ({ text, expected }) => {
    const results = [...parseText(text)].filter(({ row }) => !isEmptyLine(row, { greedy: true }))

    expect(results.map(({ row }) => row)).toEqual(expected)
  })

  it('detects that the initial state is inQuotes', () => {
    const text = 'a\na\na\na","b\nb",c\n"1\n1",2,3\n"4\n4",5,6'
    const result = [...parseText(text, { initialState: 'detect' })]
    const data = result.map(({ row }) => row)
    expect(data).toStrictEqual([
      ['a\na\na\na', 'b\nb', 'c'],
      ['1\n1', '2', '3'],
      ['4\n4', '5', '6'],
    ])
  })

  it('detects that the initial state is default', () => {
    const text = '"a\na\na\na","b\nb",c\n"1\n1",2,3\n"4\n4",5,6'
    const result = [...parseText(text, { initialState: 'detect' })]
    const data = result.map(({ row }) => row)
    expect(data).toStrictEqual([
      ['a\na\na\na', 'b\nb', 'c'],
      ['1\n1', '2', '3'],
      ['4\n4', '5', '6'],
    ])
  })
})

describe('Papaparse high-level tests', () => {
  PARSE_TESTS.forEach((test) => {
    it(test.description, () => {
      const config: Parameters<typeof parseText>[1] = test.config || {}
      const result = [...parseText(test.text, config)]
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
      if (test.expected.meta?.charCount !== undefined) {
        const charCount = result.reduce((acc, { meta }) => acc + (meta.charCount || 0), 0)
        expect(charCount).toBe(test.expected.meta?.charCount)
      }
      if (test.expected.meta?.newline !== undefined) {
        const newlines = new Set(result.map(({ meta }) => meta.newline as string))
        expect(newlines.size).toBe(1)
        expect(newlines.has(test.expected.meta?.newline)).toBe(true)
      }
      if (test.expected.meta?.delimiter !== undefined) {
        const delimiters = new Set(result.map(({ meta }) => meta.delimiter))
        expect(delimiters.size).toBe(1)
        expect(delimiters.has(test.expected.meta?.delimiter)).toBe(true)
      }
    })
  })
})
