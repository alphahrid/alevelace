import { test, expect } from "@playwright/test";

/**
 * Core student journey: mock exam builder → generated paper → print mode → AI grade breakdown.
 *
 * Requires an authenticated Supabase session. Provide it via env before running:
 *   E2E_SUPABASE_STORAGE_KEY  (e.g. sb-<project>-auth-token)
 *   E2E_SUPABASE_SESSION_JSON (the session JSON stored under that key)
 * Run with: bunx playwright test
 */
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";
const storageKey = process.env.E2E_SUPABASE_STORAGE_KEY;
const sessionJson = process.env.E2E_SUPABASE_SESSION_JSON;

test.describe("mock exam journey", () => {
  test.skip(!storageKey || !sessionJson, "Needs E2E_SUPABASE_* session env vars");

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(
      ([k, v]) => window.localStorage.setItem(k as string, v as string),
      [storageKey!, sessionJson!],
    );
  });

  test("builds, runs and marks a mock paper", async ({ page }) => {
    await page.goto(`${BASE}/mock`);
    const start = page.getByRole("button", { name: /Start Mock Exam for/i }).first();
    await expect(start).toBeVisible();
    await start.click();

    // Builder
    await expect(page.getByRole("heading", { name: /mock builder/i })).toBeVisible();
    await page.getByRole("button", { name: "Pick topics" }).click();
    await page.getByLabel("Search syllabus topics").fill("a");
    await page.getByRole("button", { name: "Select all listed topics" }).click();
    await page.getByRole("button", { name: "5 questions" }).click();

    // PDF export toggle is present and switchable
    const msToggle = page.getByLabel(/Include mark scheme and grader rubric/i).first();
    await expect(msToggle).toBeVisible();
    await msToggle.click();

    // Keyboard accessibility: the generate control is reachable and labelled
    const generate = page.getByRole("button", { name: /Generate mock paper and start the timed exam/i });
    await expect(generate).toBeVisible();
    await generate.click();

    // Simulator: timer, question, print control
    await expect(page.getByText(/Question 1 of/i)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/^\d{2}:\d{2}$/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Print or save this paper as a PDF/i })).toBeVisible();

    // Answer everything then finish
    const box = page.getByPlaceholder(/Type your answer/i);
    if (await box.count()) await box.first().fill("Test answer for marking.");
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Finish paper" }).click();

    // Grade breakdown
    await expect(page.getByRole("heading", { name: /Paper marked/i })).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText("Predicted grade")).toBeVisible();
    await expect(page.getByText(/Mark scheme/i).first()).toBeVisible();
  });
});
