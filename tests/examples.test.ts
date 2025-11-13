import { describe, expect, it } from 'vitest'

import { parseURL } from '../src'
import type { ParseResult } from '../src/types'

describe('README examples', () => {
  it('parses a remote CSV file', async () => {
    const rows = []
    for await (const { row } of parseURL('https://data.source.coop/severo/csv-papaparse-test-files/sample.csv')) {
      rows.push(row)
    }
    expect(rows).toEqual([['A', 'B', 'C'], ['X', 'Y', 'Z']])
  })
  it('parses a remote CSV, and we can use Array.fromAsync for convenience', async () => {
    // @ts-expect-error ts(2345) - fromAsync is available now
    const rows = await Array.fromAsync(
      parseURL('https://data.source.coop/severo/csv-papaparse-test-files/sample.csv'),
      async (result: ParseResult) => result.row,
    )
    expect(rows).toEqual([['A', 'B', 'C'], ['X', 'Y', 'Z']])
  })
})
