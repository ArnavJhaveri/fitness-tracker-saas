/**
 * Auth setup — runs once before all other E2E tests.
 * Signs in with a dedicated test user and saves the session to disk.
 * Other test files load the saved session via `storageState` to avoid
 * repeating the sign-in flow on every test.
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_USER_EMAIL and E2E_USER_PASSWORD must be set.\n" +
        "Create a dedicated Supabase test user and add these to your .env.local.",
    );
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for redirect to dashboard — confirms the auth flow succeeded.
  await page.waitForURL("**/dashboard**");
  await expect(page).toHaveURL(/dashboard/);

  // Save the authenticated browser state so other tests inherit the session.
  await page.context().storageState({ path: authFile });
});
