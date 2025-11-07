import { describe, expect, test } from 'vitest'

import { parseChunk } from '../src/chunk'

describe('parseChunk', () => {
  test('decodes a UTF-8 bytes array', () => {
    const text = 'hello, csvremote!!!'
    const encoder = new TextEncoder()
    const bytes = encoder.encode(text)
    let i = 0
    for (const result of parseChunk({ bytes })) {
      i++
      expect(result).toEqual({
        data: [text],
        metadata: {
          byteCount: bytes.length,
        },
      })
    }
    // For now: only one iteration per chunk
    expect(i).toBe(1)
  })
})
