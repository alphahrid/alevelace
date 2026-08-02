import { describe, expect, it } from "vitest";
import { buildExamHtml } from "@/lib/print-exam";

const questions = [
  {
    index: 1,
    type: "mcq" as const,
    prompt: "State the SI unit of force.",
    choices: ["Newton", "Joule", "Watt", "Pascal"],
    answer: "Newton",
    explanation: "B1 for newton (N).",
  },
  {
    index: 2,
    type: "short" as const,
    prompt: "Derive $v^2 = u^2 + 2as$.",
    answer: "M1 substitute t; A1 rearrange.",
    explanation: "M1/A1 as shown.",
    userAnswer: "Used $s = ut + \\tfrac12 at^2$",
    correct: false,
    score: 0.5,
    feedback: "Lost A1 — no final rearrangement.",
  },
];

describe("printable exam PDF export", () => {
  const html = buildExamHtml({
    title: "Physics — Theory Paper",
    subject: "Physics",
    board: "Cambridge (CAIE)",
    questions,
    includeMarkScheme: true,
    score: 1.5,
    total: 2,
    grade: "B",
  });

  it("emits an A4 print stylesheet and auto-print hook", () => {
    expect(html).toContain("@page { size: A4;");
    expect(html).toContain("window.print()");
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });

  it("renders the cover with board, subject, score and grade", () => {
    expect(html).toContain("Cambridge (CAIE)");
    expect(html).toContain("Physics");
    expect(html).toContain("1.5 / 2");
    expect(html).toContain("Grade <span class=\"score\">B</span>");
  });

  it("renders every question with lettered MCQ choices", () => {
    expect(html).toContain("State the SI unit of force.");
    expect(html).toContain("A. Newton");
    expect(html).toContain("D. Pascal");
    expect(html).toContain("Derive $v^2 = u^2 + 2as$.");
  });

  it("includes the mark scheme and candidate feedback when requested", () => {
    expect(html).toContain("Mark Scheme");
    expect(html).toContain("M1 substitute t; A1 rearrange.");
    expect(html).toContain("Lost A1 — no final rearrangement.");
    expect(html).toContain("Candidate response:");
  });

  it("omits the mark scheme for a blank practice paper", () => {
    const paperOnly = buildExamHtml({ title: "Physics", questions, includeMarkScheme: false });
    expect(paperOnly).not.toContain("Mark Scheme");
    expect(paperOnly).toContain("State the SI unit of force.");
  });

  it("escapes HTML in question text so scripts cannot leak into the paper", () => {
    const evil = buildExamHtml({
      title: "T",
      questions: [{ index: 1, type: "short", prompt: "<script>alert(1)</script>", answer: "x" }],
    });
    expect(evil).not.toContain("<script>alert(1)</script>");
    expect(evil).toContain("&lt;script&gt;");
  });
});
