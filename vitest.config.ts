import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
        },
      },
      {

        test: {
          name: 'browser',
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            // https://vitest.dev/guide/browser/playwright
            instances: [
              { browser: 'chromium' },
              { browser: 'firefox' },
              // webkit is not working on my machine
              // { browser: 'webkit' },
            ],
          },
        },
      },
    ],
  },
})
