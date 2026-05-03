import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom so React components can render without a real browser.
    environment: "jsdom",
    // Import jest-dom matchers globally so every test file gets
    // .toBeInTheDocument(), .toHaveValue(), etc. without an explicit import.
    setupFiles: ["./src/__tests__/setup.ts"],
    globals: true,
    // Only run unit tests — E2E tests live in e2e/ and are run by Playwright.
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "e2e/**"],
    // Collect coverage from the src directory but exclude generated/config files.
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/__tests__/**",
        "src/types/**",
        "src/app/layout.tsx",
        "src/app/globals.css",
      ],
      thresholds: {
        // These floors ensure coverage reporting stays functional and
        // regressions (deleting tests) are caught by CI. They are intentionally
        // low because Phase 4 only introduced unit tests for pure utility
        // functions. Raise them as component and API route tests are added.
        // Target: 60% / 55% by Phase 6.
        lines: 5,
        functions: 5,
        branches: 5,
        statements: 5,
      },
    },
  },
  resolve: {
    alias: {
      // Mirror the tsconfig paths so imports like "@/lib/..." resolve correctly.
      "@": resolve(__dirname, "./src"),
    },
  },
});
