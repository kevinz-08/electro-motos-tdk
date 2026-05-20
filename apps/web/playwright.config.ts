import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Configura el estado de autenticación antes de correr los tests que lo necesitan
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },
    // Tests públicos — sin sesión
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /checkout\.spec\.ts/,
    },
    // Tests autenticados — dependen del setup
    {
      name: 'chromium-auth',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      testMatch: /checkout\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
