import { describe, expect, it } from 'vitest'

import { getQuote } from '../src/quote.js'

describe('getQuote', () => {
  it('returns the default quote character', () => {
    expect(getQuote()).toBe('"')
  })
})
