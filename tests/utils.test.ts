import { describe, expect, it } from 'vitest'

import { decode, escapeRegExp, isEmptyLine, toURL } from '../src/utils'

describe('toURL', () => {
  it('creates a valid blob URL and revokes it', async () => {
    const text = 'Hello, world!'
    const { url, revoke } = toURL(text)
    expect(url).toMatch(/^blob:/)
    // After revocation, fetching the URL should fail
    revoke()
    await expect(fetch(url)).rejects.toThrow()
  })
  it('includes an extra space to fix Node.js issue and returns correct file size', async () => {
    const text = 'Sample text in ASCII (1 char = 1 byte)'
    const { url, fileSize } = toURL(text)
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
    const { fileSize } = toURL(text)
    const encoder = new TextEncoder()
    const encoded = encoder.encode(text)
    expect(fileSize).toBe(encoded.length)
  })
  it('allows an empty string', async () => {
    const text = ''
    const { url, fileSize } = toURL(text)
    expect(fileSize).toBe(0)

    const response = await fetch(url)
    expect(response.ok).toBe(true)
    expect(response.headers.get('Content-Length')).toBe('1') // 1 byte for the extra space

    const data = await response.text()
    expect(data).toBe(' ') // only the extra space
  })
})

describe('escapeRegExp', () => {
  it('escapes special regex characters', () => {
    const text = 'Hello. How are you? (I hope you\'re well!) *$^+[]{}|\\'
    const escaped = escapeRegExp(text)
    expect(escaped).toBe('Hello\\. How are you\\? \\(I hope you\'re well!\\) \\*\\$\\^\\+\\[\\]\\{\\}\\|\\\\')
  })
})

describe('isEmptyLine', () => {
  it.for([undefined, {}, { greedy: false }])('detects empty lines correctly with options being: %s (same behavior!)', (options) => {
    expect(isEmptyLine([''], options)).toBe(true)
    expect(isEmptyLine(['\t'], options)).toBe(false)
    expect(isEmptyLine(['   '], options)).toBe(false)
    expect(isEmptyLine(['', ''], options)).toBe(false)
    expect(isEmptyLine(['data'], options)).toBe(false)
  })

  it('detects empty lines correctly with options {greedy: true}', () => {
    const options = { greedy: true }
    expect(isEmptyLine([''], options)).toBe(true)
    expect(isEmptyLine(['   '], options)).toBe(true)
    expect(isEmptyLine([' \t', ' '], options)).toBe(true)
    expect(isEmptyLine(['data'], options)).toBe(false)
  })
})

describe('decode', () => {
  it.for([
    '\ufeffhello, csvremote!!!',
    'hello, \ufeffcsvremote!!!',
    'hello, csvremote!!!\ufeff',
  ])('should not strip the BOM', (text) => {
    expect(decode(new TextEncoder().encode(text))).toEqual({
      text,
      invalidByteCount: 0,
    })
  })

  it('should strip invalid bytes at the start if specified', () => {
    // Invalid UTF-8 bytes: 0xFF, 0xFE
    const invalidBytes = new Uint8Array([0xFF, 0xFE, 0x68, 0x65, 0x6C, 0x6C, 0x6F]) // "hello"
    expect(decode(invalidBytes, { stripInvalidBytesAtStart: true })).toEqual({
      text: 'hello',
      invalidByteCount: 2,
    })
  })

  it('should throw on invalid bytes if not stripping', () => {
    // Invalid UTF-8 bytes: 0xFF, 0xFE
    const invalidBytes = new Uint8Array([0xFF, 0xFE, 0x68, 0x65, 0x6C, 0x6C, 0x6F]) // "hello"
    expect(() => decode(invalidBytes)).toThrow()
  })

  it('should return all bytes as invalid if all are invalid', () => {
    const invalidBytes = new Uint8Array([0xFF, 0xFE, 0xFF, 0xFE])
    expect(decode(invalidBytes, { stripInvalidBytesAtStart: true })).toEqual({
      text: '',
      invalidByteCount: 4,
    })
  })

  it('should handle valid UTF-8 bytes correctly', () => {
    const validBytes = new TextEncoder().encode('Valid UTF-8 text')
    expect(decode(validBytes, { stripInvalidBytesAtStart: true })).toEqual({
      text: 'Valid UTF-8 text',
      invalidByteCount: 0,
    })
  })

  it('should handle empty byte array', () => {
    const emptyBytes = new Uint8Array([])
    expect(decode(emptyBytes, { stripInvalidBytesAtStart: true })).toEqual({
      text: '',
      invalidByteCount: 0,
    })
  })
})
