import { parse } from '../src/index'
import { toUrl } from '../src/url'
import { describe, expect, test } from 'vitest'

describe('parse', () => {
  test.each([1, 5, 10, 20, 1_000])('parses text in chunks of size %d', async (chunkSize) => {
    const text = 'hello, csvremote!!!'
    const { url, fileSize, revoke } = toUrl(text)
    let result = ''
    for await (const chunk of parse(url, { chunkSize, fileSize })) {
      result += chunk
    }
    revoke()
    expect(result).toBe(text)
  })
  test.each([0, -1, 1.5, NaN, Infinity])('throws if chunkSize is invalid: %d', async (chunkSize) => {
    const text = 'hello, csvremote!!!'
    const { url, fileSize, revoke } = toUrl(text)
    const iterator = parse(url, { chunkSize, fileSize })
    await expect(() => iterator.next()).rejects.toThrow()
    revoke()
  })
})
