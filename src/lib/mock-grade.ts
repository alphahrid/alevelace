import type { LevelFilter } from "./levels";

export type GradeBreakdown = { grade: string; hype: string };

/**
 * Real past-paper style grade thresholds (percentage of raw marks).
 * AS-only papers cap at grade A; A2 / Full A-Level papers can reach A*.
 */
export function gradeFor(pct: number, level: LevelFilter): GradeBreakdown {
  const capped = level === "as";
  if (pct >= 88)
    return {
      grade: capped ? "A" : "A*",
      hype: "Outstanding — that's an A* script. Keep this standard and the real paper is yours! 🏆",
    };
  if (pct >= 78)
    return { grade: "A", hype: "Brilliant work! You're an A candidate — tighten the last few mark points for that A*. 🚀" };
  if (pct >= 68)
    return { grade: "B", hype: "Strong B! Good job — nail the command words and A* is genuinely in reach. 💪" };
  if (pct >= 58)
    return { grade: "C", hype: "Solid foundation. Review the missed mark points and you'll jump a whole grade. Keep pushing! 📈" };
  if (pct >= 48)
    return { grade: "D", hype: "You're building it. Every mark point you learn here is one you won't lose in the exam. Keep going! 🔨" };
  if (pct >= 38)
    return { grade: "E", hype: "Early days — that's fine. Redo the notes for the weak topics and sit this paper again. You've got this. 🌱" };
  return { grade: "U", hype: "Don't sweat it — this is data, not a verdict. Generate AI notes for these topics, then come straight back. 🌱" };
}

/** Percentage of raw marks from an AI-marked results array. */
export function percentFor(totalScore: number, questionCount: number): number {
  return questionCount ? Math.round((totalScore / questionCount) * 100) : 0;
}
