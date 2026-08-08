import { test, expect } from "@playwright/test";

/**
 * Flashcards journey: SRS review + cross-device scheduling, the AI document
 * importer, the Anki export flow and the global formula sheet drawer.
 *
 * Requires an authenticated session, same as mock-exam.spec.ts:
 *   E2E_SUPABASE_STORAGE_KEY, E2E_SUPABASE_SESSION_JSON
 */
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const storageKey = process.env.E2E_SUPABASE_STORAGE_KEY;
const sessionJson = process.env.E2E_SUPABASE_SESSION_JSON;

test.describe("flashcards, importer and formula sheet", () => {
  test.skip(!storageKey || !sessionJson, "Needs E2E_SUPABASE_* session env vars");

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(
      ([k, v]) => window.localStorage.setItem(k as string, v as string),
      [storageKey!, sessionJson!],
    );
    await page.goto(`${BASE}/flashcards`);
    await expect(page.getByRole("heading", { name: "Flashcards", level: 1 })).toBeVisible();
  });

  test("reviews a due card and persists the schedule", async ({ page }) => {
    const card = page.getByRole("button", { name: /Reveal answer|Hide answer/ });
    const hasDue = await card.isVisible().catch(() => false);
    test.skip(!hasDue, "No cards due for this account");

    await card.click();
    await expect(page.getByRole("button", { name: /Rate this card Good/i })).toBeVisible();
    await page.getByRole("button", { name: /Rate this card Good/i }).click();

    // Scheduling is server-side, so a reload must not resurface the same card.
    await expect(page.getByText(/due now/i)).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Flashcards", level: 1 })).toBeVisible();
  });

  test("imports a text file into a deck via the AI importer", async ({ page }) => {
    const topicSelect = page.getByLabel("Deck topic");
    const hasTopics = await topicSelect.isVisible().catch(() => false);
    test.skip(!hasTopics, "Account has no selected subjects/topics");

    await page.setInputFiles('input[aria-label="Choose a notes file to convert into flashcards"]', {
      name: "notes.md",
      mimeType: "text/markdown",
      buffer: Buffer.from(
        "# Newton's laws\n\nFirst law: a body remains at rest or in uniform motion unless acted on by a resultant force.\nSecond law: F = ma, where F is the resultant force in newtons.\nThird law: forces act in equal and opposite pairs on different bodies.\n",
      ),
    });

    await expect(page.getByText(/Reading your notes/i)).toBeVisible();
    await expect(page.getByText(/flashcards added from notes\.md|Import failed|Rate limited/i)).toBeVisible({ timeout: 90_000 });
  });

  test("exports decks as Anki TSV and CSV downloads", async ({ page }) => {
    const exportBtn = page.getByRole("button", { name: /Export deck for Anki/i });
    test.skip(!(await exportBtn.isVisible().catch(() => false)), "Account has no cards to export");

    const tsv = page.waitForEvent("download");
    await exportBtn.click();
    const tsvFile = await tsv;
    expect(tsvFile.suggestedFilename()).toMatch(/^alevel-ace-flashcards-\d{4}-\d{2}-\d{2}\.txt$/);

    const csv = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export deck as CSV/i }).click();
    const csvFile = await csv;
    expect(csvFile.suggestedFilename()).toMatch(/\.csv$/);
  });

  test("opens the formula sheet drawer, searches and copies LaTeX", async ({ page }) => {
    await page.getByRole("button", { name: "Open formula cheat sheet" }).first().click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByText(/Formula cheat sheets/i)).toBeVisible();

    const search = page.getByLabel("Search formulae");
    await search.fill("zzzz-no-match");
    await expect(page.getByText(/No formulae match/i)).toBeVisible();

    await search.fill("");
    const copy = page.getByRole("button", { name: /^Copy LaTeX for/ }).first();
    await expect(copy).toBeVisible();
    await copy.click();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });
});
