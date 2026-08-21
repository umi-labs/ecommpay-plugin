import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './dev',
  testMatch: '**/e2e.spec.{ts,js}',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    launchOptions: {
      // The cloud sandbox ships a pinned Chromium; use it directly rather than
      // downloading, and disable the sandbox since tests run as root here.
      executablePath: process.env.PW_CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
  webServer: {
    command: 'pnpm dev',
    reuseExistingServer: true,
    url: 'http://localhost:3000/admin',
    timeout: 300_000,
  },
})
