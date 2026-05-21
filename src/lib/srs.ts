// SM-2 spaced repetition
// quality: 0 (again), 3 (hard), 4 (good), 5 (easy)
export type Rating = "again" | "hard" | "good" | "easy";

export function scheduleNext(card: { ease: number; interval_days: number; reps: number }, rating: Rating) {
  const q = rating === "again" ? 0 : rating === "hard" ? 3 : rating === "good" ? 4 : 5;
  let { ease, interval_days, reps } = card;
  let lapses = 0;

  if (q < 3) {
    reps = 0;
    interval_days = 1;
    lapses = 1;
  } else {
    if (reps === 0) interval_days = 1;
    else if (reps === 1) interval_days = 6;
    else interval_days = Math.round(interval_days * ease);
    reps += 1;
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  const due = new Date();
  due.setDate(due.getDate() + interval_days);

  return {
    ease,
    interval_days,
    reps,
    lapses,
    due_at: due.toISOString(),
    last_reviewed_at: new Date().toISOString(),
  };
}
