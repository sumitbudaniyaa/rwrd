import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Mobile Customer (375px)',
      testMatch: /customer-flow\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: 'Desktop Admin & Portal',
      testMatch: /(admin-flow|portal-flow)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
