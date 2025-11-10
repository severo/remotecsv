import { describe, expect, it, test } from 'vitest'

import type { ParseResult } from '../src/types'
import { parseUrl } from '../src/url'
import { toUrl } from '../src/utils'

function* parseChunkMock(bytes: Uint8Array): Generator<ParseResult, void, unknown> {
  const decoder = new TextDecoder('utf-8')
  const decoded = decoder.decode(bytes)
  yield {
    row: [decoded],
    errors: [],
    meta: {
      byteCount: bytes.length,
      offset: 0,
      newline: '\n',
      // quote: '"',
      delimiter: ',',
      cursor: decoded.length,
    },
  }
}

describe('parseUrl, while mocking parseChunk, ', () => {
  test.each([1, 2, 3, 10, 17, 18, 19, 20, 21, 1_000, undefined])('accepts chunk size of %s', async (chunkSize) => {
    const text = 'hello, csvremote!!!' // length: 19
    const { url, fileSize, revoke } = toUrl(text)
    let result = ''
    let bytes = 0
    // passing 'to: fileSize - 1' for Node.js bug: https://github.com/nodejs/node/issues/60382
    for await (const { row, meta: { offset, byteCount } } of parseUrl(url, { chunkSize, lastByte: fileSize - 1, parseChunk: parseChunkMock })) {
      result += row
      expect(offset).toBe(bytes)
      bytes += byteCount
    }
    revoke()
    expect(result).toBe(text)
    expect(bytes).toBe(fileSize)
  })
  test.each([0, -1, 1.5, NaN, Infinity])('throws if chunkSize is invalid: %s', async (chunkSize) => {
    const text = 'hello, csvremote!!!'
    const { url, fileSize, revoke } = toUrl(text)
    const iterator = parseUrl(url, { chunkSize, lastByte: fileSize - 1 })
    await expect(iterator.next()).rejects.toThrow()
    revoke()
  })
  test.each([
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
    for await (const { row } of parseUrl(url, { firstByte, lastByte, parseChunk: parseChunkMock })) {
      result += row[0]
    }
    revoke()
    if (lastByte !== undefined) {
      // due to https://github.com/nodejs/node/issues/60382, on affected Node.js versions,
      // there would be an extra space at the end
      expect(result).toBe(expected)
    }
  })
  test.each([
    [-1, undefined],
    [NaN, undefined],
    [Infinity, undefined],
    [0, -1],
    [0, NaN],
    [0, Infinity],
    [5, 0],
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
    function* parseChunkMock(bytes: Uint8Array) {
      // only yield the first two bytes, decoded as text
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
      parseChunk: parseChunkMock,
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
    function* parseChunkMock(bytes: Uint8Array) {
      // only process up to the first comma
      const decoder = new TextDecoder('utf-8')
      const text = decoder.decode(bytes)
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
      parseChunk: parseChunkMock,
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
  it('throws if parseChunk yields more bytes than provided', async () => {
    const text = 'hello, csvremote!!!'
    const { url, revoke } = toUrl(text)
    function* parseChunkMock(bytes: Uint8Array) {
      // yield more bytes than provided
      yield {
        row: [],
        errors: [],
        meta: {
          byteCount: 2 * bytes.length,
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
      parseChunk: parseChunkMock,
    })
    await expect(iterator.next()).rejects.toThrow()
    revoke()
  })
})
