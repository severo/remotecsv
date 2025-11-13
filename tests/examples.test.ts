import { describe, expect, it } from 'vitest'

import { parseURL } from '../src'

describe('README examples', () => {
  it('parses a remote CSV file', async () => {
    const rows = []
    for await (const { row } of parseURL('https://data.source.coop/severo/csv-papaparse-test-files/sample.csv')) {
      rows.push(row)
    }
    expect(rows).toEqual([['A', 'B', 'C'], ['X', 'Y', 'Z']])
  })
})
