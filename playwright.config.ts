import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const authFile = path.resolve('playwright/.auth/user.json');

export default defineConfig({
  testDir: './tests',

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 1 : 0,

  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,

      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },

      dependencies: ['setup'],
    },
  ],
});