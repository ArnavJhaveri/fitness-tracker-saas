/**
 * E2E: Nutrition page + log-food flow
 *
 * Smoke-tests the path "open nutrition → toggle log-food panel → search,
 * select a food, set quantity, log it → see it appear in the meal card →
 * delete it". Hits the unified LogFoodFlow which replaced the old
 * three-step wizard, plus the meal-grouping logic.
 *
 * The food-catalogue search assumes the seed data contains at least one
 * common food matching "chicken" — every Phase-1 seed loads chicken
 * breast, oats, etc. If the seed data is rebuilt without those staples
 * the search test will need an updated query.
 */
import { test, expect } from "@playwright/test";

test.describe("Nutrition page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/nutrition");
    await expect(page.getByRole("heading", { name: /nutrition/i })).toBeVisible();
  });

  test("renders the today's-macros card", async ({ page }) => {
    await expect(page.getByText(/today's macros/i)).toBeVisible();
  });

  test("opens and closes the log-food panel", async ({ page }) => {
    await page
      .getByRole("button", { name: /log food/i })
      .first()
      .click();

    // The expanded card shows a meal-type radiogroup and a search input.
    await expect(page.getByRole("radiogroup", { name: /meal type/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /search food catalogue/i })).toBeVisible();

    // Close button is aria-labelled "Close".
    await page.getByRole("button", { name: /^close$/i }).click();
    await expect(page.getByRole("radiogroup", { name: /meal type/i })).not.toBeVisible();
  });

  test("searches the food catalogue and shows results", async ({ page }) => {
    await page
      .getByRole("button", { name: /log food/i })
      .first()
      .click();

    const search = page.getByRole("textbox", { name: /search food catalogue/i });
    await search.fill("chicken");

    // Debounced 250ms — give it a generous window.
    await expect(page.getByRole("button", { name: /chicken/i }).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("logs a food and shows it in a meal card, then deletes it", async ({ page }) => {
    await page
      .getByRole("button", { name: /log food/i })
      .first()
      .click();

    // Pick a meal type — radiogroup options are labelled with their human
    // names (Breakfast / Lunch / Dinner / Snack).
    await page.getByRole("radio", { name: /snack/i }).click();

    // Search and select the first match.
    await page.getByRole("textbox", { name: /search food catalogue/i }).fill("chicken");
    const firstMatch = page.getByRole("button", { name: /chicken/i }).first();
    await expect(firstMatch).toBeVisible({ timeout: 5_000 });
    await firstMatch.click();

    // The quantity input appears post-selection; default 100g is fine.
    await expect(page.getByRole("spinbutton", { name: /quantity in grams/i })).toBeVisible();

    // Log it. The submit button label switches between "Add", "Log food",
    // or "Add to meal" depending on flow state — match permissively.
    await page.getByRole("button", { name: /^(add|log food|add to meal)/i }).click();

    // The meal card for "Snack" should now contain the food name.
    await expect(page.getByText(/snack/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/chicken/i).first()).toBeVisible();

    // Best-effort cleanup: hover the food row and click its remove button.
    // Hover-only opacity-0 → opacity-100 styling is preserved by Playwright's
    // forced hover. If the row layout changes we'll fall back to deleting
    // the whole meal via the trash button on the meal card.
    const foodRow = page
      .getByText(/chicken/i)
      .first()
      .locator("..")
      .locator("..");
    const removeBtn = foodRow.getByRole("button", { name: /remove chicken/i });
    if (await removeBtn.count()) {
      await removeBtn.click({ force: true });
    } else {
      // Fall back to deleting the parent meal.
      await page
        .getByRole("button", { name: /delete meal/i })
        .first()
        .click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: /delete/i })
        .click();
    }
  });
});
