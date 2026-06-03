import { defineConfig } from '@playwright/test'

const PORT = 4173
const isCI = !!process.env.CI

/**
 * E2E config. The app is built + served in `e2e` mode (local/mock mode, no
 * Supabase — see .env.e2e) so the suite is deterministic and network-free.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'npm run e2e:serve',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
