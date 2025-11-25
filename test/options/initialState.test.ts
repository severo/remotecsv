import { describe, expect, it } from 'vitest'

import { getScore, isBetterScore } from '../../src/options/initialState'

describe('getScore', () => {
  it('should return correct score for simple CSV', () => {
    const text = `name,age,city\nAlice,30,New York\nBob,25,Los Angeles\nCharlie,35,Chicago`
    const result = getScore({
      parseOptions: {
        delimiter: ',',
        newline: '\n',
        quoteChar: '"',
        escapeChar: '\\',
      },
      text,
    })
    expect(result).toEqual({
      columns: 3,
      ratio: 1,
    })
  })

  it('should return correct score for TSV with different newline', () => {
    const text = `name\tage\tcity\r\nAlice\t30\tNew York\r\nBob\t25\tLos Angeles\r\nCharlie\t35\tChicago`
    const result = getScore({
      parseOptions: {
        delimiter: '\t',
        newline: '\r\n',
        quoteChar: '"',
        escapeChar: '\\',
      },
      text,
    })
    expect(result).toEqual({
      columns: 3,
      ratio: 1,
    })
  })

  it.each([
    { initialState: 'default' as const, expected: { columns: 3, ratio: 1 } },
    { initialState: 'inQuotes' as const, expected: { columns: 3, ratio: 1 } },
  ])('should return correct score for CSV with quoted fields', ({ initialState, expected }) => {
    const text = '"a\na\na\na",b,c\n1,2,3\n4,5,6'
    const result = getScore({
      parseOptions: {
        delimiter: ',',
        newline: '\n',
        quoteChar: '"',
        escapeChar: '\\',
        initialState,
      },
      text,
    })
    expect(result).toEqual(expected)
  })

  it.each([
    { initialState: 'default' as const, expected: { columns: 3, ratio: 0.5 } },
    { initialState: 'inQuotes' as const, expected: { columns: 3, ratio: 1 } },
  ])('should return correct score for CSV that starts in middle of a quoted field', ({ initialState, expected }) => {
    const text = 'a\na\na\na",b,c\n1,2,3\n4,5,6'
    const result = getScore({
      parseOptions: {
        delimiter: ',',
        newline: '\n',
        quoteChar: '"',
        escapeChar: '\\',
        initialState,
      },
      text,
    })
    expect(result).toEqual(expected)
  })

  it.each([
    { previewLines: 30, columns: 3, ratio: 29 / 30 },
    { previewLines: undefined, columns: 3, ratio: 9 / 10 },
    { previewLines: 10, columns: 3, ratio: 9 / 10 },
    { previewLines: 5, columns: 3, ratio: 4 / 5 },
    { previewLines: 2, columns: 3, ratio: 0.5 },
    { previewLines: 1, columns: 1, ratio: 1 },
    { previewLines: 0, columns: 0, ratio: 0 },
  ])('should not process more than previewLines: $previewLines', ({ previewLines, columns, ratio }) => {
    const text = `a\n,b,c\n` + `a,b,c\n`.repeat(100) + `d,e,f\n`
    const result = getScore({
      parseOptions: {
        delimiter: ',',
        newline: '\n',
        quoteChar: '"',
        escapeChar: '\\',
      },
      text,
      previewLines,
    })
    expect(result).toEqual({
      columns,
      ratio,
    })
  })

  it('should ignore empty lines in scoring', () => {
    const text = `a,b,c\n\n\n1,2,3\n4,5,6\n\n`
    const result = getScore({
      parseOptions: {
        delimiter: ',',
        newline: '\n',
        quoteChar: '"',
        escapeChar: '\\',
      },
      text,
    })
    expect(result).toEqual({
      columns: 3,
      ratio: 1,
    })
  })
})

describe('isBetterScore', () => {
  it('should determine better score based on ratio', () => {
    const best = { columns: 3, ratio: 0.8 }
    const candidate = { columns: 3, ratio: 0.9 }
    expect(isBetterScore({ best, candidate })).toBe(true)
  })

  it('should determine not better score when ratio is lower', () => {
    const best = { columns: 4, ratio: 0.9 }
    const candidate = { columns: 4, ratio: 0.8 }
    expect(isBetterScore({ best, candidate })).toBe(false)
  })

  it('should determine better score when columns are higher with same ratio', () => {
    const best = { columns: 3, ratio: 0.9 }
    const candidate = { columns: 4, ratio: 0.9 }
    expect(isBetterScore({ best, candidate })).toBe(true)
  })

  it('should determine not better score when columns are lower with same ratio', () => {
    const best = { columns: 5, ratio: 0.8 }
    const candidate = { columns: 4, ratio: 0.8 }
    expect(isBetterScore({ best, candidate })).toBe(false)
  })

  it('should determine not better score when both columns and ratio are equal', () => {
    const best = { columns: 5, ratio: 0.9 }
    const candidate = { columns: 5, ratio: 0.9 }
    expect(isBetterScore({ best, candidate })).toBe(false)
  })
})
