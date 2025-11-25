import { describe, expect, it } from 'vitest'

import { type ParseResult, parseURL } from '../src'

describe('README examples', () => {
  it('parses a remote CSV file', async () => {
    const rows = []
    for await (const { row } of parseURL('https://data.source.coop/severo/csv-papaparse-test-files/sample.csv')) {
      rows.push(row)
    }
    expect(rows).toEqual([['A', 'B', 'C'], ['X', 'Y', 'Z']])
  })

  it('parses a remote CSV, and we can use Array.fromAsync for convenience', async () => {
    // The test might fail if fromAsync is not yet available in the node.js version running the tests

    // @ts-expect-error ts(2345) - fromAsync is available now
    const rows = await Array.fromAsync(
      parseURL('https://data.source.coop/severo/csv-papaparse-test-files/sample.csv'),
      async (result: ParseResult) => result.row,
    )
    expect(rows).toEqual([['A', 'B', 'C'], ['X', 'Y', 'Z']])
  })
})
