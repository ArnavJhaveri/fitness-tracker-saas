import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for end-to-end tests.
 *
 * Tests run against the locally built Next.js app (npm run build + start).
 * For CI, the app is started via webServer before tests begin.
 * For local development, start the dev server first: npm run dev
 */
export default defineConfig({
  testDir: "./e2e",
  // Each test file runs sequentially within itself; files run in parallel.
  fullyParallel: true,
  // Fail fast — don't retry flaky tests in CI.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ...(process.env.CI ? [["github"] as ["github"]] : []),
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    // Capture trace on first retry so failures are diagnosable.
    trace: "on-first-retry",
    // Capture screenshot on failure.
    screenshot: "only-on-failure",
    // Record video on failure.
    video: "on-first-retry",
  },
  projects: [
    // Auth setup — runs first and saves the signed-in session to disk
    // so individual tests don't have to sign in every time.
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
    // Mobile viewport — critical for a fitness PWA.
    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 14"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  // Start the Next.js app automatically in CI.
  webServer: process.env.CI
    ? {
        command: "npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          NODE_ENV: "production",
        },
      }
    : undefined,
});
