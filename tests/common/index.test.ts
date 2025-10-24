import { test as pTest, expect as pExpect } from '@playwright/test'
import { expect as vExpect } from 'vitest'

import { parse } from '../../src'

export function launch({ expect, test }: {
  expect: typeof pExpect
  test: typeof pTest
} | {
  expect: typeof vExpect
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  test: any
}): void {
  test('parse', async () => {
    const text = 'hello, csvremote!!!'
    let result = ''
    for await (const chunk of parse(text, { chunkSize: 5, isUrl: false })) {
      result += chunk
    }
    expect(result).toBe(text)
  })
}
