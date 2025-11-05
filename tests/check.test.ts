import { describe, expect, it } from 'vitest'
import { setChunkSize } from '../src/check'
import { defaultChunkSize } from '../src/constants'

describe('setChunkSize', () => {
  it('returns the provided valid chunk size', () => {
    expect(setChunkSize(512)).toBe(512)
  })
  it('returns default chunk size if undefined', () => {
    expect(setChunkSize(undefined)).toBe(defaultChunkSize)
  })
  it.for([0, -1])('throws error for non-positive chunk size', (chunkSize) => {
    expect(() => setChunkSize(chunkSize)).toThrow()
  })
  it.for([1.5])('throws error for non-integer chunk size', (chunkSize) => {
    expect(() => setChunkSize(chunkSize)).toThrow()
  })
})
