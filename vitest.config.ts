import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

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
            screenshotFailures: false,
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
