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

  it('parses only the first 10 rows', async () => {
    const url = 'https://data.source.coop/severo/csv-papaparse-test-files/verylong-sample.csv'
    const rows = []
    let count = 0
    for await (const { row } of parseURL(url)) {
      rows.push(row)
      count++
      if (count >= 10) {
        break
      }
    }
    expect(rows.length).toBe(10)
  })

  it('fetches a specific byte range', { timeout: 10_000 }, async () => {
    const url = 'https://data.source.coop/severo/csv-papaparse-test-files/verylong-sample.csv'
    const results = []
    for await (const result of parseURL(url, {
      firstByte: 30_000,
      lastByte: 30_250,
    })) {
      results.push(result)
    }
    // The first row might be incomplete, depending on how well the user picked the byte range
    expect(results[0]?.row).toEqual(['', 'ABC'])
    results.slice(1, 8).forEach((r) => {
      expect(r.row.length).toEqual(3)
    })
    // The last row might be incomplete, depending on how well the user picked the byte range
    expect(results[8]?.row).toEqual(['Lore'])

    const first = results[1]
    const last = results[7]
    if (!first || !last) {
      throw new Error('Expected results to have more rows')
    }
    const options = {
      firstByte: first.meta.byteOffset,
      lastByte: last.meta.byteOffset + last.meta.byteCount - 1,
    }
    // Re-fetch the same range again to verify byte offsets and counts are correct
    const rows = []
    for await (const { row } of parseURL(url, options)) {
      rows.push(row)
    }
    expect(rows).toEqual([
      ...results.slice(1, 8).map(r => r.row),
      [''], // When the last row contains a line ending, an extra empty row is produced
    ])
  })
})
