import { defineConfig, devices } from "@playwright/test";

const adminApp = process.env.E2E_ADMIN_APP ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "admin-app",
      testMatch: /admin/,
      use: { ...devices["Desktop Chrome"], baseURL: adminApp },
    },
  ],
});
