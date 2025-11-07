import { describe, expect, it } from 'vitest'

import { getNewline } from '../src/newline.js'

describe('getNewline', () => {
  it('returns the default newline string', () => {
    expect(getNewline()).toBe('\n')
  })
})
