import { describe, expect, it } from 'vitest'

import { validateQuoteChar } from '../../src/options/quoteChar'

describe('validateQuoteChar', () => {
  it('should return the default quote character when none is provided', () => {
    expect(validateQuoteChar()).toBe('"')
  })

  it('should return the provided quote character', () => {
    expect(validateQuoteChar('\'')).toBe('\'')
    expect(validateQuoteChar('`')).toBe('`')
  })
})
