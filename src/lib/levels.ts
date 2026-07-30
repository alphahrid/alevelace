export type SyllabusLevel = "as" | "a2";
export type LevelFilter = "as" | "a2" | "full";

export const LEVEL_LABEL: Record<SyllabusLevel, string> = {
  as: "AS Level",
  a2: "A2 Level",
};

export const FILTER_OPTIONS: Array<{ value: LevelFilter; label: string; short: string }> = [
  { value: "as", label: "AS Only", short: "AS" },
  { value: "a2", label: "A2 Only", short: "A2" },
  { value: "full", label: "Full A-Level", short: "Full" },
];

/** AS Level caps at grade A — only A2 / full A-Level can reach A*. */
export function gradeForPercent(pct: number, filter: LevelFilter): string {
  const capped = filter === "as";
  if (pct >= 90) return capped ? "A" : "A*";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "E";
}

export function topGrade(filter: LevelFilter): string {
  return filter === "as" ? "A" : "A*";
}

/** Readiness ceiling label for the AS-only track. */
export function readinessLabelFor(readiness: number, filter: LevelFilter) {
  const top = topGrade(filter);
  if (readiness >= 85) return { label: `${top} ready`, tone: "text-success-foreground" };
  if (readiness >= 70) return { label: filter === "as" ? "On track for A" : "On track for A", tone: "text-primary" };
  if (readiness >= 55) return { label: "Solid B — push for A", tone: "text-warning-foreground" };
  if (readiness >= 35) return { label: "Foundations forming", tone: "text-warning-foreground" };
  return { label: "Just getting started", tone: "text-muted-foreground" };
}

export function levelsFor(filter: LevelFilter): SyllabusLevel[] {
  return filter === "full" ? ["as", "a2"] : [filter];
}
