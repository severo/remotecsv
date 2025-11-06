import { describe, expect, test } from 'vitest'

import { parse } from '../src/parse'
import { toUrl } from '../src/url'

describe('parse', () => {
  test.each([1, 2, 3, 10, 17, 18, 19, 20, 21, 1_000, undefined])('accepts chunk size of %s', async (chunkSize) => {
    const text = 'hello, csvremote!!!' // length: 19
    const { url, fileSize, revoke } = toUrl(text)
    let result = ''
    let bytes = 0
    // passing 'to: fileSize - 1' for Node.js bug: https://github.com/nodejs/node/issues/60382
    for await (const { data, metadata: { offset, byteCount } } of parse(url, { chunkSize, lastByte: fileSize - 1 })) {
      result += data
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
    const iterator = parse(url, { chunkSize, lastByte: fileSize - 1 })
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
    for await (const { data } of parse(url, { firstByte, lastByte })) {
      result += data
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
    const iterator = parse(url, { chunkSize: 10, firstByte, lastByte })
    await expect(iterator.next()).rejects.toThrow()
    revoke()
  })
})
