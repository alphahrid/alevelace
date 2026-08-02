import { describe, expect, it } from "vitest";
import { gradeFor, percentFor } from "@/lib/mock-grade";

describe("AI marking grade breakdown", () => {
  it("awards A* only on A2 / full A-Level papers", () => {
    expect(gradeFor(92, "full").grade).toBe("A*");
    expect(gradeFor(92, "a2").grade).toBe("A*");
    expect(gradeFor(92, "as").grade).toBe("A");
  });

  it("maps each raw percentage band to the right grade", () => {
    const bands: Array<[number, string]> = [
      [100, "A*"],
      [88, "A*"],
      [87, "A"],
      [78, "A"],
      [77, "B"],
      [68, "B"],
      [67, "C"],
      [58, "C"],
      [57, "D"],
      [48, "D"],
      [47, "E"],
      [38, "E"],
      [37, "U"],
      [0, "U"],
    ];
    for (const [pct, grade] of bands) {
      expect(gradeFor(pct, "full").grade, `pct ${pct}`).toBe(grade);
    }
  });

  it("always returns a motivational message", () => {
    for (const pct of [0, 40, 60, 80, 95]) {
      expect(gradeFor(pct, "full").hype.length).toBeGreaterThan(10);
    }
  });

  it("converts partial-credit marks into a percentage", () => {
    // AI marking can return fractional scores (e.g. 0.5 for a partial M1).
    expect(percentFor(7.5, 10)).toBe(75);
    expect(percentFor(0, 10)).toBe(0);
    expect(percentFor(0, 0)).toBe(0);
  });

  it("end-to-end: fractional AI scores produce a grade", () => {
    const results = [1, 1, 0.5, 1, 0, 1, 1, 0.5, 1, 1];
    const total = results.reduce((a, b) => a + b, 0); // 8
    const pct = percentFor(total, results.length); // 80
    const breakdown = gradeFor(pct, "full");
    expect(pct).toBe(80);
    expect(breakdown.grade).toBe("A");
  });
});
