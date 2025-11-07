import { describe, expect, it } from 'vitest'

import { getDelimiter } from '../src/delimiter.js'

describe('getDelimiter', () => {
  it('returns the default delimiter', () => {
    expect(getDelimiter()).toBe(',')
  })
})
