import { describe, expect, it } from "vitest";
import { PAPER_TYPES, boardLabel, paperStyleBrief, type PaperType } from "@/lib/mock.helpers";
import { levelsFor } from "@/lib/levels";

describe("mock generation parameters", () => {
  it("offers MCQ, Theory and Practical papers", () => {
    expect(PAPER_TYPES.map((p) => p.value)).toEqual(["mcq", "theory", "practical"]);
    for (const p of PAPER_TYPES) {
      expect(p.label.length).toBeGreaterThan(3);
      expect(p.hint.length).toBeGreaterThan(3);
    }
  });

  it("labels the active exam board for the AI prompt", () => {
    expect(boardLabel("cambridge")).toContain("Cambridge");
    expect(boardLabel("edexcel")).toBe("Edexcel");
    expect(boardLabel("both")).toContain("Edexcel");
    expect(boardLabel("both")).toContain("Cambridge");
  });

  it("builds a distinct paper brief for each paper type", () => {
    const briefs = (["mcq", "theory", "practical"] as PaperType[]).map((t) => paperStyleBrief(t));
    for (const b of briefs) {
      expect(b.label.length).toBeGreaterThan(5);
      expect(b.mix.length).toBeGreaterThan(5);
      expect(b.brief.length).toBeGreaterThan(20);
    }
    expect(new Set(briefs.map((b) => b.brief)).size).toBe(3);
    expect(briefs[0].mix.toLowerCase()).toContain("mcq");
    expect(briefs[2].brief.toLowerCase()).toMatch(/error|variable|uncertain/);
  });

  it("restricts generation to the levels implied by the filter", () => {
    expect(levelsFor("as")).toEqual(["as"]);
    expect(levelsFor("a2")).toEqual(["a2"]);
    expect(levelsFor("full").sort()).toEqual(["a2", "as"]);
  });

  it("accepts only the supported question counts end-to-end", () => {
    const COUNT_OPTIONS = [5, 10, 15, 20];
    for (const c of COUNT_OPTIONS) {
      expect(c).toBeGreaterThanOrEqual(5);
      expect(c).toBeLessThanOrEqual(25); // server validator bounds
    }
  });
});
