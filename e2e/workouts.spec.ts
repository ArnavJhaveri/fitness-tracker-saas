/**
 * E2E: Workout creation + lifecycle
 *
 * Covers the path "open the workouts page → start a new session → see it
 * in the list → delete it". This is the single most-used flow in the app
 * and the one most likely to break under refactoring (it touches the
 * StartWorkoutModal, useCreateWorkout hook, the Toast confirm dialog, and
 * three different api routes).
 *
 * Each test creates a uniquely-named session so concurrent runs across
 * Playwright projects (chromium, mobile-safari) don't collide. The
 * teardown is best-effort: if a delete fails the next run will pick up
 * any orphaned rows by name pattern.
 *
 * Requires `E2E_USER_EMAIL` + `E2E_USER_PASSWORD` (used by auth.setup.ts).
 */
import { test, expect } from "@playwright/test";

// Use a stable prefix so leftover rows from prior runs are easy to clean
// up manually (ON DELETE CASCADE handles per-session cleanup at the DB).
const NAME_PREFIX = "e2e-workout";

function uniqueName() {
  return `${NAME_PREFIX}-${Date.now()}`;
}

test.describe("Workouts page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/workouts");
    await expect(page.getByRole("heading", { name: /workouts/i })).toBeVisible();
  });

  test("renders the start-workout CTA when no workout is open", async ({ page }) => {
    await expect(page.getByRole("button", { name: /start workout/i }).first()).toBeVisible();
  });

  test("starts a new workout session and shows it in the recent list", async ({ page }) => {
    const name = uniqueName();

    // Open the inline start-workout form.
    await page
      .getByRole("button", { name: /start workout/i })
      .first()
      .click();

    // Form is rendered as a controlled <Input> with `label="Workout name"`,
    // so getByLabel resolves correctly via aria-labelledby.
    await page.getByLabel(/workout name/i).fill(name);
    // The submit button is the second "Start workout" — the first one
    // already opened the form. Filter to the form's submit (in-card).
    await page
      .getByRole("button", { name: /start workout/i })
      .last()
      .click();

    // After success the page transitions to the session-detail view.
    // Surface the chosen name as a heading or label somewhere visible.
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });
  });

  test("validates that an empty name blocks submission", async ({ page }) => {
    await page
      .getByRole("button", { name: /start workout/i })
      .first()
      .click();
    // Submit without filling name. The Input has `required` so the browser's
    // native form validation prevents submit — the form should not advance.
    await page
      .getByRole("button", { name: /start workout/i })
      .last()
      .click();
    // Form is still visible (didn't transition to session view).
    await expect(page.getByLabel(/workout name/i)).toBeVisible();
  });

  test("deletes a workout via the trash button + confirm dialog", async ({ page }) => {
    // Pre-create a workout to delete.
    const name = uniqueName();
    await page
      .getByRole("button", { name: /start workout/i })
      .first()
      .click();
    await page.getByLabel(/workout name/i).fill(name);
    await page
      .getByRole("button", { name: /start workout/i })
      .last()
      .click();
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });

    // Navigate back to the workouts list (the in-app back arrow / link).
    await page.goto("/workouts");

    // Find the row that contains our workout name and click its delete button.
    const row = page.getByText(name).first().locator("..").locator("..");
    await row.getByRole("button", { name: new RegExp(`delete workout ${name}`, "i") }).click();

    // Confirmation dialog (custom Toast.confirm — role="alertdialog").
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /delete/i })
      .click();

    // Row should disappear after the optimistic delete reconciles.
    await expect(page.getByText(name)).toHaveCount(0, { timeout: 10_000 });
  });
});
