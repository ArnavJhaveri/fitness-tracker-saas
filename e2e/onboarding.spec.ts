/**
 * E2E: Onboarding wizard
 *
 * Walks the wizard end-to-end: pick intents → fill profile → walk
 * through the conditional steps → finish. Verifies the dashboard banner
 * is gone after completion (i.e. onboarded_at was persisted and the
 * SETTINGS_KEY cache invalidation worked).
 *
 * REQUIREMENTS:
 *   - A FRESH Supabase test user that has NEVER finished onboarding
 *     (user_settings.onboarded_at IS NULL). The /onboarding route
 *     redirects to /dashboard for already-onboarded users, so the
 *     primary E2E user (who's signed in via auth.setup.ts) is unusable
 *     for this spec after the first successful run.
 *   - Set E2E_FRESH_USER_EMAIL + E2E_FRESH_USER_PASSWORD in env to
 *     enable. Tests are skipped otherwise so CI doesn't fail without
 *     the credentials.
 *
 * Suggested operational setup: have the CI job reset onboarded_at = null
 * for the fresh-user row before this spec runs, so it's always
 * repeatable. A simple SQL trigger or seed script can do that.
 */
import { test, expect } from "@playwright/test";

// This spec needs its OWN sign-in flow rather than the cached session,
// because the cached session is the regular E2E user (already onboarded).
test.use({ storageState: { cookies: [], origins: [] } });

const FRESH_EMAIL = process.env.E2E_FRESH_USER_EMAIL;
const FRESH_PASSWORD = process.env.E2E_FRESH_USER_PASSWORD;

test.describe("Onboarding wizard", () => {
  test.skip(
    !FRESH_EMAIL || !FRESH_PASSWORD,
    "E2E_FRESH_USER_EMAIL + E2E_FRESH_USER_PASSWORD not set — see spec comment.",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(FRESH_EMAIL!);
    await page.getByLabel("Password").fill(FRESH_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();

    // First-time user redirects to /onboarding rather than /dashboard.
    await page.waitForURL(/onboarding/);
  });

  test("shows the welcome step with intent picker", async ({ page }) => {
    // The first step asks "what do you want to track?" — should expose
    // togglable intent options as either checkboxes or pressable buttons.
    await expect(page.getByText(/what.*(track|focus|goals)/i)).toBeVisible();
  });

  test("walks through the wizard with body-comp intents and lands on dashboard", async ({
    page,
  }) => {
    // Step 1: pick a body-comp intent so the phase step is in scope and
    // we exercise the longest possible path.
    await page.getByText(/lose weight/i).click();

    await page.getByRole("button", { name: /continue/i }).click();

    // Step 2: profile. All fields are optional — fill the minimum that
    // makes downstream TDEE math computable so the phase step's
    // suggestion isn't blank.
    await page.getByLabel(/full name/i).fill("E2E User");

    // Sex select — pick whichever option the test user prefers; "male"
    // exists in the registry as a stable choice. Playwright's selectOption
    // takes a literal string label, not a regex, so use the canonical
    // capitalisation the form uses.
    const sexSelect = page.getByLabel(/sex.*birth/i);
    if (await sexSelect.count()) {
      await sexSelect.selectOption({ label: "Male" });
    }

    await page.getByRole("button", { name: /continue/i }).click();

    // Step 3 (nutrition) is shown because lose_weight gates it on.
    // Skip it by leaving fields blank and continuing.
    if (
      await page
        .getByText(/diet|nutrition/i)
        .first()
        .isVisible({ timeout: 1_000 })
    ) {
      await page.getByRole("button", { name: /continue/i }).click();
    }

    // Step 4: defaults. Defaults are pre-populated (timezone, week start,
    // notifications off) — just continue.
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 5: first-phase. lose_weight gates this on. Skip past by
    // pressing Finish if it's the last step, otherwise continue.
    const finishBtn = page.getByRole("button", { name: /finish/i });
    if (await finishBtn.isVisible().catch(() => false)) {
      await finishBtn.click();
    }

    // Should land on /dashboard.
    await page.waitForURL(/dashboard/, { timeout: 10_000 });

    // The "complete onboarding" banner should NOT appear — onboarded_at
    // was set and the cache was invalidated.
    await expect(page.getByText(/finish setup|complete.*onboarding/i)).not.toBeVisible({
      timeout: 5_000,
    });
  });

  test("Skip-for-now button completes onboarding without the wizard", async ({ page }) => {
    // Confirms the skip path actually persists onboarded_at — earlier
    // bug where Skip flushed defaults but never marked the user as
    // onboarded, so /onboarding bounced them right back.
    await page.getByRole("button", { name: /skip for now/i }).click();
    await page.waitForURL(/dashboard/, { timeout: 10_000 });
    // Reload — if onboarded_at didn't persist, the page would redirect
    // back to /onboarding.
    await page.reload();
    await expect(page).toHaveURL(/dashboard/);
  });
});
