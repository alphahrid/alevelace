// Pure helpers for filtering syllabus data by the user's selected subjects
// and AS / A2 level filter. Kept side-effect free so they are unit-testable.

import type { LevelFilter, SyllabusLevel } from "./levels";
import { levelsFor } from "./levels";

export type SubjectLike = { id: string; name: string };
export type TopicLike = { id: string; name: string; level: SyllabusLevel; subject_id?: string };

/**
 * Keeps only the subjects the user selected in their profile, in the order the
 * subjects were provided. An empty selection means nothing is shown (the UI
 * prompts the user to pick subjects instead of silently showing everything).
 */
export function filterSelectedSubjects<T extends SubjectLike>(
  subjects: T[],
  selectedIds: string[] | null | undefined,
): T[] {
  if (!selectedIds || selectedIds.length === 0) return [];
  const set = new Set(selectedIds);
  return subjects.filter((s) => set.has(s.id));
}

/** True when a subject should appear in Notes / Mocks / filters. */
export function isSubjectSelected(subjectId: string, selectedIds: string[] | null | undefined): boolean {
  return !!selectedIds && selectedIds.includes(subjectId);
}

/** Filters topics down to the levels allowed by an AS / A2 / Full filter. */
export function filterTopicsByLevel<T extends TopicLike>(topics: T[], level: LevelFilter): T[] {
  const allowed = levelsFor(level);
  return topics.filter((t) => allowed.includes(t.level));
}
