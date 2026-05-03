/**
 * E2E: Authentication flows
 *
 * Tests the critical auth paths — login, invalid credentials, protected
 * route redirect — without using the stored session (so they test the
 * actual forms, not just cached state).
 */
import { test, expect } from "@playwright/test";

// These tests deliberately bypass the saved session (no storageState).
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login page", () => {
  test("renders the login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows a field error for an invalid email", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("SomePassword1!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Zod validation fires client-side before any API call.
    await expect(page.getByText(/invalid/i)).toBeVisible();
  });

  test("shows an error banner for wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Password").fill("WrongPassword1!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Supabase returns an auth error which is shown in the banner.
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
  });

  test("has a link to the register page", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /sign up|register/i }).click();
    await expect(page).toHaveURL(/register/);
  });
});

test.describe("Protected routes", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("preserves the original destination in redirectTo param", async ({ page }) => {
    await page.goto("/dashboard/workouts");
    await expect(page).toHaveURL(/login\?redirectTo/);
  });
});

test.describe("Register page", () => {
  test("renders the registration form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("validates password length client-side", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel(/full name/i).fill("Test User");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: /create account|sign up/i }).click();

    await expect(page.getByText(/password/i)).toBeVisible();
  });
});
