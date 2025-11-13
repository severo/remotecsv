import { describe, expect, it } from 'vitest'

import { parse } from '../src/parser'
import { CORE_PARSER_TESTS } from './cases'

describe('Papaparse core parser tests', () => {
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

describe('parse', () => {
  it('should not parse the last row if ignoreLastRow is true', () => {
    const input = 'a,b,c\n1,2,3\n4,5,6\n7,8,9'
    const config = { ignoreLastRow: true }
    const result = [...parse(input, config)]
    const data = result.map(({ row }) => row)
    expect(data).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ])
  })

  it.each([undefined, true, false])('should respect the stripBOM option, and count the bytes correctly', (stripBOM) => {
    const input = '\ufeffA,B\nX,Y'
    const result = [...parse(input, { stripBOM })]
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
    const input = 'A\ufeff,B\nX,Y'
    const result = [...parse(input, { stripBOM: true })]
    const data = result.map(({ row }) => row)
    const meta = result.map(({ meta }) => meta)
    expect(data).toEqual([
      ['A\ufeff', 'B'],
      ['X', 'Y'],
    ])
    expect(meta[0]?.byteCount).toBe(7) // 'A\ufeff,B\n' (7 bytes)
    expect(meta[1]?.byteCount).toBe(3) // 'X,Y' (3 bytes)
  })

  it('should return one row with an empty string for empty input', () => {
    const input = ''
    const result = [...parse(input, {})]
    const data = result.map(({ row }) => row)
    const meta = result.map(({ meta }) => meta)
    expect(data).toEqual([['']])
    expect(meta[0]?.byteCount).toBe(0)
  })

  it('should return two rows with two empty strings for input with only a newline', () => {
    const input = '\n'
    const result = [...parse(input, {})]
    const data = result.map(({ row }) => row)
    const meta = result.map(({ meta }) => meta)
    expect(data).toEqual([[''], ['']])
    expect(meta[0]?.byteCount).toBe(1) // '\n'
    expect(meta[1]?.byteCount).toBe(0) // ''
  })
})
