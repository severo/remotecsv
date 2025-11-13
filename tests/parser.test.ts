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
})
