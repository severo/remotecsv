import { describe, expect, it } from 'vitest'

import { parse } from '../src/parser'
import { CORE_PARSER_TESTS } from './cases'

describe('Papaparse core parser tests', () => {
  CORE_PARSER_TESTS.forEach((test) => {
    it(test.description, () => {
      const config = test.config || {}
      const result = [...parse(test.text, config)]
      const data = result.map(({ row }) => row)
      const errors = result.flatMap(({ errors }) => errors)
      expect(data).toEqual(test.expected.data)
      expect(errors).toEqual(test.expected.errors)
      if (test.expected.meta?.charCount !== undefined) {
        const charCount = result.reduce((acc, { meta }) => acc + (meta.charCount || 0), 0)
        expect(charCount).toBe(test.expected.meta?.charCount)
      }
      if (test.expected.meta?.newline !== undefined) {
        const newlines = new Set<string>(result.map(({ meta }) => meta.newline as string))
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

describe('parse', () => {
  it('should not parse the last row if ignoreLastRow is true', () => {
    const text = 'a,b,c\n1,2,3\n4,5,6\n7,8,9'
    const config = { ignoreLastRow: true }
    const result = [...parse(text, config)]
    const data = result.map(({ row }) => row)
    expect(data).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ])
  })

  it.each([undefined, true, false])('should respect the stripBOM option (%s), and count the bytes correctly', (stripBOM) => {
    const text = '\ufeffA,B\nX,Y'
    const result = [...parse(text, { stripBOM })]
    const data = result.map(({ row }) => row)
    const meta = result.map(({ meta }) => meta)
    expect(data).toEqual([
      [(stripBOM ?? true) ? 'A' : '\ufeffA', 'B'],
      ['X', 'Y'],
    ])
    expect(meta[0]?.byteCount).toBe(7) // '\ufeffA,B\n' (7 bytes)
    expect(meta[1]?.byteCount).toBe(3) // 'X,Y' (3 bytes)
  })

  it('should not strip BOM if not at the start', () => {
    const text = 'A\ufeff,B\nX,Y'
    const result = [...parse(text, { stripBOM: true })]
    const data = result.map(({ row }) => row)
    const meta = result.map(({ meta }) => meta)
    expect(data).toEqual([
      ['A\ufeff', 'B'],
      ['X', 'Y'],
    ])
    expect(meta[0]?.byteCount).toBe(7) // 'A\ufeff,B\n' (7 bytes)
    expect(meta[1]?.byteCount).toBe(3) // 'X,Y' (3 bytes)
  })

  it('should return one row with an empty string for empty text', () => {
    const text = ''
    const result = [...parse(text)]
    const data = result.map(({ row }) => row)
    const meta = result.map(({ meta }) => meta)
    expect(data).toEqual([['']])
    expect(meta[0]?.byteCount).toBe(0)
  })

  it('should return two rows with two empty strings for text with only a newline', () => {
    const text = '\n'
    const result = [...parse(text)]
    const data = result.map(({ row }) => row)
    const meta = result.map(({ meta }) => meta)
    expect(data).toEqual([[''], ['']])
    expect(meta[0]?.byteCount).toBe(1) // '\n'
    expect(meta[1]?.byteCount).toBe(0) // ''
  })
  it.each([
    { description: 'closed', text: 'a,b,"c"' },
    { description: 'not closed', text: 'a,b,"c' },
  ])('returns without the last row, if the quote is $description', ({ text }) => {
    // this test is really only to please the coverage gods
    const result = [...parse(text, { ignoreLastRow: true })]
    const data = result.map(({ row }) => row)
    const errors = result.flatMap(({ errors: rowErrors }, row) => rowErrors.map(error => ({ ...error, row })))
    expect(data).toEqual([])
    expect(errors).toEqual([])
  })

  it('should handle characters with length > 1 correctly', () => {
    const text = 'a,b,😊\n1,2,😂'
    const result = [...parse(text)]
    const data = result.map(({ row }) => row)
    const meta = result.map(({ meta }) => meta)
    expect(data).toEqual([
      ['a', 'b', '😊'],
      ['1', '2', '😂'],
    ])

    expect(meta[0]?.byteOffset).toBe(0)
    expect(meta[0]?.byteCount).toBe(9) // 'a,b,😊\n' (9 bytes)
    expect(meta[0]?.charCount).toBe(7) // 'a,b,😊\n' (7 characters, 😊 counts for 1 character)

    expect(meta[1]?.byteOffset).toBe(9)
    expect(meta[1]?.byteCount).toBe(8) // '1,2,😂' (8 bytes)
    expect(meta[1]?.charCount).toBe(6) // '1,2,😂' (6 characters, 😂 counts for 2 characters!)

    expect((meta[1]?.byteOffset ?? NaN) + (meta[1]?.byteCount ?? NaN)).toBe(new TextEncoder().encode(text).length) // total bytes
  })
})
