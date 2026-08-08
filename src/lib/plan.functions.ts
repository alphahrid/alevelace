import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAIJSON } from "@/lib/mock.helpers";

const PlanTool = {
  name: "emit_study_plan",
  description: "Return a personalised A-Level daily study plan derived from the student's real performance data.",
  parameters: {
    type: "object",
    properties: {
      headline: { type: "string", description: "One motivating sentence about the week ahead." },
      focus: { type: "string", description: "The single biggest priority this week, one sentence." },
      days: {
        type: "array",
        description: "Exactly 7 consecutive days starting today.",
        items: {
          type: "object",
          properties: {
            day: { type: "string", description: "Weekday name, e.g. Monday." },
            subject: { type: "string" },
            topics: { type: "array", items: { type: "string" }, description: "1–3 specific syllabus topics." },
            tasks: { type: "array", items: { type: "string" }, description: "2–4 concrete tasks (e.g. '20 due flashcards', '6-mark Explain question')." },
            minutes: { type: "number", description: "Recommended total minutes, 30–150." },
            why: { type: "string", description: "Short evidence-based reason, referencing their scores or card lapses." },
          },
          required: ["day", "subject", "topics", "tasks", "minutes", "why"],
          additionalProperties: false,
        },
      },
      weakTopics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topic: { type: "string" },
            reason: { type: "string" },
            fix: { type: "string", description: "One actionable fix." },
          },
          required: ["topic", "reason", "fix"],
          additionalProperties: false,
        },
      },
    },
    required: ["headline", "focus", "days", "weakTopics"],
    additionalProperties: false,
  },
};

const SYSTEM = `You are an A-Level examiner-turned-study-coach. You build ruthless, realistic daily study plans.
Rules:
- Base every recommendation on the supplied evidence (mock/quiz marks per topic, flashcard lapses, cards due, streak). Never invent data.
- Weakest evidence gets the most time; strong topics get short spaced-retrieval only.
- Respect the student's exam board wording and level (AS caps at grade A, A2/full at A*).
- Tasks must be concrete and doable in the stated minutes; always include due flashcards when cards are due.
- Keep any maths in KaTeX ($...$).`;

export type StudyPlan = {
  headline: string;
  focus: string;
  days: Array<{ day: string; subject: string; topics: string[]; tasks: string[]; minutes: number; why: string }>;
  weakTopics: Array<{ topic: string; reason: string; fix: string }>;
};

/** Build a personalised 7-day plan from the student's mock results and SRS performance. */
export const generateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { board?: "cambridge" | "edexcel" | "both"; level?: "as" | "a2" | "full"; minutesPerDay?: number }) =>
    z
      .object({
        board: z.enum(["cambridge", "edexcel", "both"]).default("both"),
        level: z.enum(["as", "a2", "full"]).default("full"),
        minutesPerDay: z.number().int().min(20).max(300).default(90),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 30 * 864e5).toISOString();

    const [{ data: prof }, { data: attempts }, { data: cards }, { data: sessions }, { data: papers }] = await Promise.all([
      supabase.from("profiles").select("selected_subjects, exam_date, readiness").eq("id", userId).maybeSingle(),
      supabase
        .from("quiz_attempts")
        .select("mode, score, total, topic_id, subject_id, started_at")
        .eq("user_id", userId)
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .limit(80),
      supabase
        .from("flashcards")
        .select("topic_id, ease, reps, lapses, due_at, interval_days")
        .eq("user_id", userId)
        .limit(600),
      supabase.from("study_sessions").select("minutes, occurred_on, activity").eq("user_id", userId).gte("occurred_on", since.slice(0, 10)).limit(200),
      supabase.from("past_paper_scores").select("paper_label, score, total, grade, taken_on, subject_id").eq("user_id", userId).limit(40),
    ]);

    const subjectIds = ((prof?.selected_subjects as string[] | null) ?? []).slice(0, 12);
    const [{ data: subjects }, { data: topics }] = await Promise.all([
      subjectIds.length ? supabase.from("subjects").select("id, name").in("id", subjectIds) : Promise.resolve({ data: [] as never[] }),
      subjectIds.length
        ? supabase.from("topics").select("id, name, subject_id, level, syllabus_ref").in("subject_id", subjectIds).limit(600)
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const subjectName = new Map((subjects as Array<{ id: string; name: string }> | null ?? []).map((s) => [s.id, s.name]));
    const topicMeta = new Map(
      ((topics as Array<{ id: string; name: string; subject_id: string; level: string }> | null) ?? []).map((t) => [
        t.id,
        { name: t.name, subject: subjectName.get(t.subject_id) ?? "", level: t.level },
      ]),
    );

    // Aggregate mark performance per topic.
    const perTopic = new Map<string, { score: number; total: number }>();
    for (const a of (attempts as Array<{ topic_id: string | null; score: number; total: number }> | null) ?? []) {
      if (!a.topic_id || !a.total) continue;
      const cur = perTopic.get(a.topic_id) ?? { score: 0, total: 0 };
      perTopic.set(a.topic_id, { score: cur.score + a.score, total: cur.total + a.total });
    }
    const markEvidence = [...perTopic.entries()]
      .map(([id, v]) => {
        const m = topicMeta.get(id);
        return { topic: m?.name ?? "Unknown topic", subject: m?.subject ?? "", level: m?.level ?? "", pct: Math.round((v.score / v.total) * 100), marks: v.total };
      })
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 25);

    // Aggregate SRS health per topic.
    const now = Date.now();
    const perCardTopic = new Map<string, { n: number; due: number; lapses: number; ease: number }>();
    for (const c of (cards as Array<{ topic_id: string; ease: number; lapses: number; due_at: string }> | null) ?? []) {
      const cur = perCardTopic.get(c.topic_id) ?? { n: 0, due: 0, lapses: 0, ease: 0 };
      cur.n += 1;
      cur.ease += c.ease ?? 2.5;
      cur.lapses += c.lapses ?? 0;
      if (new Date(c.due_at).getTime() <= now) cur.due += 1;
      perCardTopic.set(c.topic_id, cur);
    }
    const cardEvidence = [...perCardTopic.entries()]
      .map(([id, v]) => {
        const m = topicMeta.get(id);
        return { topic: m?.name ?? "Unknown topic", subject: m?.subject ?? "", cards: v.n, due: v.due, lapses: v.lapses, avgEase: +(v.ease / v.n).toFixed(2) };
      })
      .sort((a, b) => b.lapses - a.lapses || b.due - a.due)
      .slice(0, 25);

    const totalDue = cardEvidence.reduce((s, c) => s + c.due, 0);
    const weekMinutes = ((sessions as Array<{ minutes: number }> | null) ?? []).reduce((s, x) => s + (x.minutes ?? 0), 0);

    const evidence = {
      board: data.board,
      levelFilter: data.level,
      minutesPerDay: data.minutesPerDay,
      examDate: prof?.exam_date ?? null,
      readiness: prof?.readiness ?? 0,
      last30DaysStudyMinutes: weekMinutes,
      cardsDueNow: totalDue,
      subjects: [...subjectName.values()],
      weakestByMarks: markEvidence,
      flashcardHealth: cardEvidence,
      pastPapers: (papers as Array<{ paper_label: string; score: number; total: number; grade: string | null }> | null) ?? [],
      untestedTopics: [...topicMeta.values()]
        .filter((t) => ![...perTopic.keys()].some((id) => topicMeta.get(id)?.name === t.name))
        .slice(0, 20)
        .map((t) => `${t.subject}: ${t.name}`),
    };

    if (evidence.subjects.length === 0) throw new Error("Pick your subjects first so the plan can target your syllabus.");

    const json = await callAIJSON(
      [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Today is ${new Date().toDateString()}. Build my next 7 days of study using ONLY this evidence:\n\n${JSON.stringify(evidence, null, 1)}`,
        },
      ],
      PlanTool,
    );

    return { plan: json as unknown as StudyPlan, cardsDueNow: totalDue };
  });
