import { describe, it, expect } from "vitest";
import { buildAnkiTsv, buildAnkiCsv, deckName, normalizeTag, exportFilename } from "@/lib/anki-export";

const cards = [
  { front: "State Newton's\nfirst law", back: "A body stays at rest\tor uniform motion", deck: "Physics — Forces", tags: ["as", "mechanics"], interval_days: 6, reps: 2, ease: 2.6, due_at: "2026-08-20T00:00:00.000Z" },
  { front: 'Define "mole"', back: "Amount containing $6.02\\times10^{23}$ particles", deck: null, tags: [], interval_days: 0, reps: 0 },
];

describe("anki export", () => {
  it("nests decks under the app root deck", () => {
    expect(deckName(cards[0])).toBe("A-Level Ace::Physics — Forces");
    expect(deckName(cards[1])).toBe("A-Level Ace");
  });

  it("normalises tags for Anki (no spaces)", () => {
    expect(normalizeTag("Further Maths ")).toBe("Further-Maths");
  });

  it("emits Anki TSV headers and one row per card", () => {
    const tsv = buildAnkiTsv(cards);
    const lines = tsv.trim().split("\n");
    expect(lines[0]).toBe("#separator:tab");
    expect(lines).toContain("#deck column:3");
    expect(lines).toContain("#tags column:4");
    expect(lines).toHaveLength(5 + cards.length);
    const first = lines[5].split("\t");
    expect(first[0]).toBe("State Newton's<br>first law");
    expect(first[1]).not.toContain("\t");
    expect(first[3]).toContain("interval-6d");
    expect(first[3]).toContain("reps-2");
  });

  it("emits CSV with scheduling state and escaped quotes", () => {
    const csv = buildAnkiCsv(cards);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe('"Front","Back","Deck","Tags","Due","IntervalDays","Ease","Reps"');
    expect(lines[1]).toContain('"2026-08-20T00:00:00.000Z"');
    expect(lines[2]).toContain('Define ""mole""');
    expect(lines[2]).toContain('"2.5"');
  });

  it("names files with the export date and extension", () => {
    const d = new Date("2026-08-08T03:00:00Z");
    expect(exportFilename("tsv", d)).toBe("alevel-ace-flashcards-2026-08-08.txt");
    expect(exportFilename("csv", d)).toBe("alevel-ace-flashcards-2026-08-08.csv");
  });
});
