import { parse } from '../src/parse'
import { toUrl } from '../src/url'
import { describe, expect, test } from 'vitest'

describe('parse', () => {
  test.each([1, 5, 10, 20, 1_000, undefined])('accepts chunk size of %d', async (chunkSize) => {
    const text = 'hello, csvremote!!!'
    const { url, fileSize, revoke } = toUrl(text)
    let result = ''
    let bytes = 0
    for await (const { text, offset, byteCount } of parse(url, { chunkSize, to: fileSize - 1 })) {
      result += text
      expect(offset).toBe(bytes)
      bytes += byteCount
    }
    revoke()
    expect(result).toBe(text)
    expect(bytes).toBe(fileSize)
  })
  test('accepts undefined chunk size', async () => {
    const text = 'hello, csvremote!!!'
    const { url, fileSize, revoke } = toUrl(text)
    let result = ''
    let bytes = 0
    for await (const { text, offset, byteCount } of parse(url, { to: fileSize - 1 })) {
      result += text
      expect(offset).toBe(bytes)
      bytes += byteCount
    }
    revoke()
    expect(result).toBe(text)
    expect(bytes).toBe(fileSize)
  })
  test.each([0, -1, 1.5, NaN, Infinity])('throws if chunkSize is invalid: %d', async (chunkSize) => {
    const text = 'hello, csvremote!!!'
    const { url, fileSize, revoke } = toUrl(text)
    const iterator = parse(url, { chunkSize, to: fileSize - 1 })
    await expect(iterator.next()).rejects.toThrow()
    revoke()
  })
  test.each([
    [undefined, undefined],
    [undefined, 5],
    [0, undefined],
    [0, 0],
    [0, 5],
    [5, 5],
  ])('accepts valid from: %d and to: %d', async (from, to) => {
    const text = 'hello, csvremote!!!'
    const { url, revoke } = toUrl(text)
    const iterator = parse(url, { chunkSize: 10, from, to })
    await expect(iterator.next()).resolves.not.toThrow()
    revoke()
  })
  test.each([
    [-1, undefined],
    [NaN, undefined],
    [Infinity, undefined],
    [0, -1],
    [0, NaN],
    [0, Infinity],
    [5, 0],
  ])('throws for invalid from: %d or to: %d', async (from, to) => {
    const text = 'hello, csvremote!!!'
    const { url, revoke } = toUrl(text)
    const iterator = parse(url, { chunkSize: 10, from, to })
    await expect(iterator.next()).rejects.toThrow()
    revoke()
  })
})
