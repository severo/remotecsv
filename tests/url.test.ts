import { describe, expect, it } from 'vitest'

import type { ParseResult } from '../src/types'
import { parseUrl } from '../src/url'
import { toUrl } from '../src/utils'
import { PARSE_TESTS } from './cases'

function* parseMock(input: string): Generator<ParseResult, void, unknown> {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(input)
  yield {
    row: [input],
    errors: [],
    meta: {
      byteCount: bytes.length,
      offset: 0,
      newline: '\n',
      // quote: '"',
      delimiter: ',',
      cursor: input.length,
    },
  }
}

describe('parseUrl, while mocking parse, ', () => {
  it.each([1, 2, 3, 10, 17, 18, 19, 20, 21, 1_000, undefined])('accepts chunk size of %s', async (chunkSize) => {
    const text = 'hello, csvremote!!!' // length: 19
    const { url, fileSize, revoke } = toUrl(text)
    let result = ''
    let bytes = 0
    // passing 'to: fileSize - 1' for Node.js bug: https://github.com/nodejs/node/issues/60382
    for await (const { row, meta: { offset, byteCount } } of parseUrl(url, { chunkSize, lastByte: fileSize - 1, parse: parseMock })) {
      result += row
      expect(offset).toBe(bytes)
      bytes += byteCount
    }
    revoke()
    expect(result).toBe(text)
    expect(bytes).toBe(fileSize)
  })
  it.each([0, -1, 1.5, NaN, Infinity])('throws if chunkSize is invalid: %s', async (chunkSize) => {
    const text = 'hello, csvremote!!!'
    const { url, fileSize, revoke } = toUrl(text)
    const iterator = parseUrl(url, { chunkSize, lastByte: fileSize - 1 })
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
    for await (const { row } of parseUrl(url, { firstByte, lastByte, parse: parseMock })) {
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
    const iterator = parseUrl(url, { chunkSize: 10, firstByte, lastByte })
    await expect(iterator.next()).rejects.toThrow()
    revoke()
  })
  it('uses the requestInit option, allowing to pass an abort signal', async () => {
    const text = 'hello, csvremote!!!'
    const { url, revoke } = toUrl(text)
    const controller = new AbortController()
    const iterator = parseUrl(url, { requestInit: { signal: controller.signal } })
    controller.abort()
    await expect(iterator.next()).rejects.toThrow(/abort/i)
    revoke()
  })
  it('keeps bytes between iterations, and might not consume all the bytes', async () => {
    const text = 'hello, csvremote!!!'
    const { url, fileSize, revoke } = toUrl(text)
    function* parseMock(input: string) {
      // only yield the first two bytes, decoded as text
      const encoder = new TextEncoder()
      const bytes = encoder.encode(input)
      const decoder = new TextDecoder('utf-8')
      const slice = bytes.slice(0, 2)
      const decoded = decoder.decode(slice)
      yield {
        row: [decoded],
        errors: [],
        meta: {
          byteCount: slice.length,
          offset: 0,
          newline: '\n',
          // quote: '"',
          delimiter: ',',
          cursor: decoded.length,
        },
      }
    }
    let result = ''
    let bytes = 0
    let i = 0
    for await (const { row, meta: { offset, byteCount } } of parseUrl(url, {
      chunkSize: 5,
      lastByte: fileSize - 1,
      parse: parseMock,
    })) {
      i++
      result += row[0]
      expect(offset).toBe(bytes)
      bytes += byteCount
    }
    revoke()
    expect(i).toBeGreaterThan(1) // ensure multiple iterations
    expect(result).toBe(text.slice(0, i * 2)) // each iteration yields 2 bytes, in order
    expect(bytes).toBe(i * 2) // each iteration yields 2 bytes, not all the bytes are consumed
  })
  it('keeps bytes between iterations and might consume all the bytes', async () => {
    const text = 'hello, csvremote!!!'
    const { url, fileSize, revoke } = toUrl(text)
    function* parseMock(text: string) {
      // only process up to the first comma
      const splits = text.split(',')
      const firstPart = splits[0] + (splits.length > 1 ? ',' : '')
      const encoder = new TextEncoder()
      const firstPartBytes = encoder.encode(firstPart)
      const byteCount = firstPartBytes.length
      yield {
        row: [firstPart],
        errors: [],
        meta: {
          byteCount,
          offset: 0,
          newline: '\n',
          // quote: '"',
          delimiter: ',',
          cursor: firstPart.length,
        },
      }
    }
    let result = ''
    let bytes = 0
    let i = 0
    for await (const { row, meta: { offset, byteCount } } of parseUrl(url, {
      chunkSize: 10,
      lastByte: fileSize - 1,
      parse: parseMock,
    })) {
      expect(offset).toBe(bytes)
      if (i === 0) {
        expect(row).toStrictEqual(['hello,'])
      }
      else {
        expect(row).toStrictEqual([' csvremote!!!'])
      }
      i++
      result += row[0]
      bytes += byteCount
    }
    revoke()
    expect(i).toBe(2)
    expect(result).toBe(text)
    expect(bytes).toBe(fileSize)
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
          byteCount: 2 * text.length,
          offset: 0,
          newline: '\n',
          // quote: '"',
          delimiter: ',',
          cursor: 0, // wrong too
        },
      }
    }
    const iterator = parseUrl(url, {
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
      const config: Parameters<typeof parseUrl>[1] = test.config || {}
      const { url, fileSize, revoke } = toUrl(test.input)
      const result = []
      for await (const r of parseUrl(url, { ...config, lastByte: fileSize - 1 })) {
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
      // TODO(SL): meta test
    })
  })
})
