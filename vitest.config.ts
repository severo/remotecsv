import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

declare module 'vitest' {
  export interface ProvidedContext {
    withNodeWorkaround: (boolean | undefined)[]
  }
}

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          globals: true,
          provide: {
            withNodeWorkaround: [true],
          },
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
          globals: true,

          provide: {
            withNodeWorkaround: [true, false, undefined],
          },
        },
      },
    ],
  },
})
