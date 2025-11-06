import { parse } from '../src/parse'
import { toUrl } from '../src/url'
import { describe, expect, test } from 'vitest'

describe('parse', () => {
  test.each([1, 5, 10, 20, 1_000, undefined])('accepts chunk size of %s', async (chunkSize) => {
    const text = 'hello, csvremote!!!'
    const { url, fileSize, revoke } = toUrl(text)
    let result = ''
    let bytes = 0
    // passing 'to: fileSize - 1' for Node.js bug: https://github.com/nodejs/node/issues/60382
    for await (const { text, offset, byteCount } of parse(url, { chunkSize, to: fileSize - 1 })) {
      result += text
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
    const iterator = parse(url, { chunkSize, to: fileSize - 1 })
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
  ])('accepts valid from: %s and to: %s', async (from, to, expected) => {
    const text = 'hello, csvremote!!!'
    const { url, revoke } = toUrl(text)
    let result = ''
    // implicit assertation in the loop: no exceptions thrown
    for await (const { text } of parse(url, { from, to })) {
      result += text
    }
    revoke()
    if (to !== undefined) {
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
  ])('throws for invalid from: %s or to: %s', async (from, to) => {
    const text = 'hello, csvremote!!!'
    const { url, revoke } = toUrl(text)
    const iterator = parse(url, { chunkSize: 10, from, to })
    await expect(iterator.next()).rejects.toThrow()
    revoke()
  })
})
