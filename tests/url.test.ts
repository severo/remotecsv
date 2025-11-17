import { describe, expect, it } from 'vitest'

import type { ParseResult } from '../src/types'
import { parseURL } from '../src/url'
import { toUrl } from '../src/utils'
import { PARSE_TESTS } from './cases'

function* parseMock(text: string): Generator<ParseResult, void, unknown> {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(text)
  yield {
    row: [text],
    errors: [],
    meta: {
      byteOffset: 0,
      byteCount: bytes.length,
      charCount: text.length,
      newline: '\n',
      // quote: '"',
      delimiter: ',',
    },
  }
}

describe('parseURL, while mocking parse, ', () => {
  it.each([1, 2, 3, 10, 17, 18, 19, 20, 21, 1_000, undefined])('accepts chunk size of %s', async (chunkSize) => {
    const text = 'hello, csvremote!!!' // length: 19
    const { url, fileSize, revoke } = toUrl(text)
    let result = ''
    let bytes = 0
    // passing 'to: fileSize - 1' for Node.js bug: https://github.com/nodejs/node/issues/60382
    for await (const { row, meta: { byteOffset, byteCount } } of parseURL(url, { chunkSize, lastByte: fileSize - 1, parse: parseMock })) {
      result += row
      expect(byteOffset).toBe(bytes)
      bytes += byteCount
    }
    revoke()
    expect(result).toBe(text)
    expect(bytes).toBe(fileSize)
  })

  it.each([0, -1, 1.5, NaN, Infinity])('throws if chunkSize is invalid: %s', async (chunkSize) => {
    const text = 'hello, csvremote!!!'
    const { url, fileSize, revoke } = toUrl(text)
    const iterator = parseURL(url, { chunkSize, lastByte: fileSize - 1 })
    await expect(iterator.next()).rejects.toThrow()
    revoke()
  })

  it.each([
    [undefined, undefined, 'hello, csvremote!!!'],
    [undefined, 5, 'hello,'],
    [1, undefined, 'ello, csvremote!!!'],
    [0, 0, 'h'],
    [0, 5, 'hello,'],
    [2, 5, 'llo,'],
    [5, 5, ','],
  ])('accepts valid firstByte: %s and lastByte: %s', async (firstByte, lastByte, expected) => {
    const text = 'hello, csvremote!!!'
    const { url, revoke } = toUrl(text)
    let result = ''
    // implicit assertation in the loop: no exceptions thrown
    for await (const { row } of parseURL(url, { firstByte, lastByte, parse: parseMock })) {
      result += row[0]
    }
    revoke()
    if (lastByte !== undefined) {
      // due to https://github.com/nodejs/node/issues/60382, on affected Node.js versions,
      // there would be an extra space at the end
      expect(result).toBe(expected)
    }
  })

  it.each([
    [-1, undefined],
    [NaN, undefined],
    [Infinity, undefined],
    [0, NaN],
    [0, Infinity],
    [0, -2],
    // [0, -1], // now allowed
    // [5, 0], // now allowed
  ])('throws for invalid from: %s or lastByte: %s', async (firstByte, lastByte) => {
    const text = 'hello, csvremote!!!'
    const { url, revoke } = toUrl(text)
    const iterator = parseURL(url, { chunkSize: 10, firstByte, lastByte })
    await expect(iterator.next()).rejects.toThrow()
    revoke()
  })

  it('uses the requestInit option, allowing to pass an abort signal', async () => {
    const text = 'hello, csvremote!!!'
    const { url, revoke } = toUrl(text)
    const controller = new AbortController()
    const iterator = parseURL(url, { requestInit: { signal: controller.signal } })
    controller.abort()
    await expect(iterator.next()).rejects.toThrow(/abort/i)
    revoke()
  })

  it('throws if parse yields more bytes than provided', async () => {
    const text = 'hello, csvremote!!!'
    const { url, revoke } = toUrl(text)
    function* parseMock(text: string) {
      // yield more bytes than provided
      yield {
        row: [],
        errors: [],
        meta: {
          byteOffset: 0,
          byteCount: 2 * text.length,
          charCount: 2 * text.length,
          newline: '\n' as const,
          // quote: '"',
          delimiter: ',',
        },
      }
    }
    const iterator = parseURL(url, {
      chunkSize: 5,
      parse: parseMock,
    })
    await expect(iterator.next()).rejects.toThrow()
    revoke()
  })
})

describe('Papaparse high-level tests', () => {
  PARSE_TESTS.forEach((test) => {
    it(test.description, async () => {
      const config: Parameters<typeof parseURL>[1] = test.config || {}
      const { url, fileSize, revoke } = toUrl(test.text)
      const result = []
      for await (const r of parseURL(url, { ...config, lastByte: fileSize - 1 })) {
        result.push(r)
      }
      revoke()
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

describe('parseURL', () => {
  it('throws if URL is invalid', async () => {
    const iterator = parseURL('http://invalid.invalid/', { chunkSize: 10 })
    await expect(iterator.next()).rejects.toThrow()
  })
  it.for([1, 2, 3, 5, 9, 14])('with known delimiter and newline, accepts chunk size of %s bytes.', async (chunkSize) => {
    const text = 'a,b,c\n1,2,3\n4,5,6\n7,8,9\na,b,c\n1,2,3\n4,5,6\n7,8,9\na,b,c\n1,2,3\n4,5,6\n7,8,9\n'
    const { url, fileSize, revoke } = toUrl(text)
    const result = []
    let bytes = 0
    for await (const { row, meta: { byteOffset, byteCount } } of parseURL(url, { chunkSize, lastByte: fileSize - 1 })) {
      result.push(row)
      expect(byteOffset).toBe(bytes)
      bytes += byteCount
    }
    revoke()
    expect(result).toEqual(text.split('\n').map(line => line.split(',')))
    expect(bytes).toBe(fileSize)
  })
  it.each([undefined, true, false])('should respect the stripBOM option (%s), and count the bytes correctly', async (stripBOM) => {
    const text = '\ufeffhello, csvremote!!!'
    const { url, fileSize, revoke } = toUrl(text)
    const result = []
    for await (const r of parseURL(url, { stripBOM, lastByte: fileSize - 1 })) {
      result.push(r)
    }
    revoke()
    expect(result.length).toBe(1)
    const data = result.map(({ row }) => row)
    expect(data).toEqual([(stripBOM ?? true) ? ['hello', ' csvremote!!!'] : ['\ufeffhello', ' csvremote!!!']])
    // includes BOM bytes, independently of stripBOM
    expect(result[0]?.meta.byteCount).toBe(fileSize)
  })

  it.for([
    { firstByte: 0, expected: { row: ['👉🏿', '1'], charCount: 6 } },
    // There is no way to know that '👉' and '🏿' were part of a combined emoji.
    { firstByte: 0, lastByte: 3, expected: { row: ['👉'], charCount: 2 } },
    { firstByte: 1, expected: { row: ['🏿', '1'], charCount: 4, invalidByteCount: 3 } },
    { firstByte: 2, expected: { row: ['🏿', '1'], charCount: 4, invalidByteCount: 2 } },
    { firstByte: 3, expected: { row: ['🏿', '1'], charCount: 4, invalidByteCount: 1 } },
    { firstByte: 4, expected: { row: ['🏿', '1'], charCount: 4 } },
    { firstByte: 4, lastByte: 7, expected: { row: ['🏿'], charCount: 2 } },
    { firstByte: 5, expected: { row: ['', '1'], charCount: 2, invalidByteCount: 3 } },
    { firstByte: 6, expected: { row: ['', '1'], charCount: 2, invalidByteCount: 2 } },
    { firstByte: 7, expected: { row: ['', '1'], charCount: 2, invalidByteCount: 1 } },
    { firstByte: 8, expected: { row: ['', '1'], charCount: 2 } },
  ])('should support cutting 👉🏿 emoji: firstByte=$firstByte, lastByte=$lastByte', async ({ firstByte, lastByte, expected: { row, charCount, invalidByteCount } }) => {
    // 👉🏿 uses 8 bytes in UTF-8.
    const text = '👉🏿,1'
    const { url, fileSize, revoke } = toUrl(text)
    lastByte ??= fileSize - 1
    const result = []
    for await (const r of parseURL(url, { firstByte, lastByte, delimiter: ',', newline: '\n' })) {
      result.push(r)
    }
    revoke()

    const expectedByteOffset = firstByte + (invalidByteCount ?? 0)
    expect(result.length).toBe(1)
    expect(result).toEqual([{
      errors: invalidByteCount === undefined
        ? []
        : [{
            type: 'Decoding',
            code: 'InvalidData',
            message: `Skipped ${invalidByteCount} invalid byte(s) at the start of the range`,
          }],
      row,
      meta: {
        byteOffset: expectedByteOffset,
        byteCount: lastByte - expectedByteOffset + 1,
        charCount, // TODO(SL): define what is a "character" (UTF-16 code point? grapheme?)
        delimiter: ',',
        newline: '\n',
      },
    }])
    expect((result[0]?.meta.byteCount ?? -Infinity) + (result[0]?.meta.byteOffset ?? -Infinity)).toBe(lastByte + 1)
  })

  it('should search invalid bytes over multiple chunks if needed', async () => {
    const text = '👉,1'
    const { url, fileSize, revoke } = toUrl(text)
    const result = []
    // There are 3 invalid bytes at start, when starting at byte 1. Using chunkSize=1 to force multiple iterations.
    for await (const r of parseURL(url, { chunkSize: 1, firstByte: 1, lastByte: fileSize - 1, delimiter: ',', newline: '\n' })) {
      result.push(r)
    }
    revoke()

    expect(result.length).toBe(1)
    expect(result).toEqual([{
      errors: [{
        type: 'Decoding',
        code: 'InvalidData',
        message: 'Skipped 3 invalid byte(s) at the start of the range',
      }],
      row: ['', '1'],
      meta: {
        byteOffset: 4,
        byteCount: fileSize - 4,
        charCount: 2,
        delimiter: ',',
        newline: '\n',
      },
    }])
  })

  it('should report invalid data in multiple rows', async () => {
    const text = '👉a,b\n1,2'
    const { url, fileSize, revoke } = toUrl(text)
    const result = []
    for await (const r of parseURL(url, { firstByte: 3, lastByte: fileSize - 1, delimiter: ',', newline: '\n' })) {
      result.push(r)
    }
    revoke()
    expect(result.length).toBe(2)
    expect(result).toEqual([
      {
        errors: [{
          type: 'Decoding',
          code: 'InvalidData',
          message: 'Skipped 1 invalid byte(s) at the start of the range',
        }],
        row: ['a', 'b'],
        meta: {
          byteOffset: 4,
          byteCount: 4,
          charCount: 4,
          delimiter: ',',
          newline: '\n',
        },
      },
      {
        errors: [],
        row: ['1', '2'],
        meta: {
          byteOffset: 8,
          byteCount: 3,
          charCount: 3,
          delimiter: ',',
          newline: '\n',
        },
      },
    ])
  })
})
