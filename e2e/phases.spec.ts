/**
 * E2E: Phase creation, pivot, and end flows
 *
 * Phases are the most state-sensitive feature in the app — they touch
 * the unique-active-per-user partial index, the pivot RPC, and the
 * "phases never rewrite history" rule. Manual QA misses the order-of-
 * operations bugs (e.g. ending a phase that's already in 'planned'
 * status), so we want at least a smoke flow at the UI layer.
 *
 * The test creates a phase with a unique name, uses it through pivot or
 * end, and tears it down. Multiple Playwright projects (chromium +
 * mobile) running concurrently against the same Supabase test user
 * would normally collide on the unique-active-per-user index — we
 * mitigate by ending any active phase at the start of each test.
 */
import { test, expect } from "@playwright/test";

const NAME_PREFIX = "e2e-phase";

function uniqueName() {
  return `${NAME_PREFIX}-${Date.now()}`;
}

/**
 * Helper: end the current active phase if one exists. Lets each test
 * start from a known "companion mode" baseline regardless of what the
 * previous run left behind.
 */
async function endActivePhaseIfAny(page: import("@playwright/test").Page) {
  await page.goto("/phases");
  const endBtn = page.getByRole("button", { name: /end phase/i });
  if (await endBtn.isVisible().catch(() => false)) {
    await endBtn.click();
    // Toast.confirm is a role="alertdialog" with a "Delete"-style confirm
    // button. End-phase uses the same primitive; the confirm label is
    // "Yes, end" or similar. Be permissive.
    const dialog = page.getByRole("alertdialog");
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole("button").last().click();
    }
    // Wait for the empty-companion-mode state to surface.
    await expect(page.getByText(/companion mode/i)).toBeVisible({ timeout: 10_000 });
  }
}

test.describe("Phases page", () => {
  test.beforeEach(async ({ page }) => {
    await endActivePhaseIfAny(page);
    await page.goto("/phases");
    await expect(page.getByRole("heading", { name: /phases/i })).toBeVisible();
  });

  test("renders companion-mode hero when there's no active phase", async ({ page }) => {
    await expect(page.getByText(/companion mode/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /start a phase/i })).toBeVisible();
  });

  test("validates that a phase requires a name", async ({ page }) => {
    await page.getByRole("button", { name: /start a phase/i }).click();

    // Try to submit empty.
    await page.getByRole("button", { name: /start phase/i }).click();
    // The custom validation message is set by the form itself before the
    // network call; the native `required` attribute also blocks submit.
    // Either way, the submit shouldn't have closed the form.
    await expect(page.getByLabel(/phase name/i)).toBeVisible();
  });

  test("creates a phase, surfaces it as active, then ends it", async ({ page }) => {
    const name = uniqueName();

    await page.getByRole("button", { name: /start a phase/i }).click();
    await page.getByLabel(/phase name/i).fill(name);
    // Default phase type is 'cut'; default start date is today. That's
    // enough to satisfy createPhaseSchema.
    await page.getByRole("button", { name: /start phase/i }).click();

    // Active card now shows the phase name.
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /end phase/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /pivot to a new phase/i })).toBeVisible();

    // Tear down so other tests start clean.
    await endActivePhaseIfAny(page);
  });

  test("opens the pivot form from an active phase", async ({ page }) => {
    // Pre-create the phase to pivot away from.
    const name = uniqueName();
    await page.getByRole("button", { name: /start a phase/i }).click();
    await page.getByLabel(/phase name/i).fill(name);
    await page.getByRole("button", { name: /start phase/i }).click();
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /pivot to a new phase/i }).click();
    await expect(page.getByRole("heading", { name: /pivot from/i })).toBeVisible();
    // Form's submit changes from "Start phase" → "Pivot now" in pivot mode.
    await expect(page.getByRole("button", { name: /pivot now/i })).toBeVisible();

    // Cancel without submitting (don't actually persist a pivot — the rpc
    // is exercised by the unit tests for db/phases). Then clean up the
    // active phase.
    await page.getByRole("button", { name: /cancel/i }).click();
    await endActivePhaseIfAny(page);
  });
});
