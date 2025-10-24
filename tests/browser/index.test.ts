import { test, expect } from '@playwright/test'
import { parse } from '../../src'

test('parse', async () => {
  const text = 'hello, csvremote!!!'
  let result = ''
  for await (const chunk of parse(text, { chunkSize: 5, isUrl: false })) {
    result += chunk
  }
  expect(result).toBe(text)
})
