/**
 * E2E: Dashboard and core navigation
 * Uses the pre-authenticated session from auth.setup.ts.
 */
import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("renders the overview page", async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
    // The overview should always have at least one stat card visible.
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("shows the sidebar navigation on desktop", async ({ page }) => {
    await expect(page.getByRole("navigation", { name: /sidebar/i })).toBeVisible();
  });

  test("navigates to workouts page", async ({ page }) => {
    await page
      .getByRole("link", { name: /workouts/i })
      .first()
      .click();
    await expect(page).toHaveURL(/workouts/);
    await expect(page.getByRole("heading", { name: /workouts/i })).toBeVisible();
  });

  test("navigates to nutrition page", async ({ page }) => {
    await page
      .getByRole("link", { name: /nutrition/i })
      .first()
      .click();
    await expect(page).toHaveURL(/nutrition/);
  });

  test("navigates to sleep page", async ({ page }) => {
    await page.getByRole("link", { name: /sleep/i }).first().click();
    await expect(page).toHaveURL(/sleep/);
  });

  test("navigates to water page", async ({ page }) => {
    await page.getByRole("link", { name: /water/i }).first().click();
    await expect(page).toHaveURL(/water/);
  });
});

test.describe("Mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  test("shows the bottom tab bar on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.getByRole("navigation", { name: /mobile navigation/i });
    await expect(nav).toBeVisible();
  });

  test("bottom nav highlights the active tab", async ({ page }) => {
    await page.goto("/dashboard/workouts");
    const workoutTab = page.getByRole("link", { name: /workout/i });
    await expect(workoutTab).toHaveClass(/indigo/);
  });
});

test.describe("API health endpoint", () => {
  test("returns 200 OK with healthy status", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});
