import { describe, expect, it } from 'vitest'

import { toUrl } from '../src/url'

describe('toUrl', () => {
  it('creates a valid blob URL and revokes it', async () => {
    const text = 'Hello, world!'
    const { url, revoke } = toUrl(text)
    expect(url).toMatch(/^blob:/)
    // After revocation, fetching the URL should fail
    revoke()
    await expect(fetch(url)).rejects.toThrow()
  })
  it('includes an extra space to fix Node.js issue and returns correct file size', async () => {
    const text = 'Sample text in ASCII (1 char = 1 byte)'
    const { url, fileSize } = toUrl(text)
    expect(fileSize).toBe(text.length)

    // Fetch the blob URL to verify its content
    const response = await fetch(url)
    expect(response.ok).toBe(true)

    // +1 for the extra space (added to fix Node.js issue)
    expect(response.headers.get('Content-Length')).toBe(String(fileSize + 1))

    // Check for the extra space
    const data = await response.text()
    expect(data.at(-1)).toBe(' ')

    // Check the original text, after removing the extra space
    expect(data.slice(0, -1)).toBe(text)
  })
  it('correctly calculates file size for multi-byte characters', async () => {
    const text = 'こんにちは' // "Hello" in Japanese, 5 characters but more than 5 bytes
    const { fileSize } = toUrl(text)
    const encoder = new TextEncoder()
    const encoded = encoder.encode(text)
    expect(fileSize).toBe(encoded.length)
  })
  it('allows an empty string', async () => {
    const text = ''
    const { url, fileSize } = toUrl(text)
    expect(fileSize).toBe(0)

    const response = await fetch(url)
    expect(response.ok).toBe(true)
    expect(response.headers.get('Content-Length')).toBe('1') // 1 byte for the extra space

    const data = await response.text()
    expect(data).toBe(' ') // only the extra space
  })
})
