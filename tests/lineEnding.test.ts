import { describe, expect, it } from 'vitest'

import { getLineEnding } from '../src/lineEnding.js'

describe('getLineEnding', () => {
  it('returns the default line ending string', () => {
    expect(getLineEnding()).toBe('\n')
  })
})
