import { test, expect } from '@playwright/test'
import { tests } from '../common/index.test'

for (const { name, prepare, expected } of tests) {
  test(name, async () => {
    const result = await prepare()
    expect(result).toBe(expected)
  })
}
