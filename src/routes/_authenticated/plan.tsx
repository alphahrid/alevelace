import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import { CalendarCheck, Sparkles, Target, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { generateStudyPlan, type StudyPlan } from "@/lib/plan.functions";
import { useBoard, BOARD_LABEL } from "@/lib/board";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "Personalised A-Level study plan — A-Level Ace" },
      {
        name: "description",
        content: "A 7-day A-Level study plan built from your real mock results and flashcard performance, with daily topics, tasks and timings.",
      },
      { property: "og:title", content: "Personalised A-Level study plan — A-Level Ace" },
      { property: "og:description", content: "Daily topic recommendations driven by your mock marks and spaced-repetition data." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://alevelace.lovable.app/plan" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://alevelace.lovable.app/plan" }],
  }),
  component: PlanPage,
});

const LEVELS: Array<{ value: "as" | "a2" | "full"; label: string }> = [
  { value: "as", label: "AS only" },
  { value: "a2", label: "A2 only" },
  { value: "full", label: "Full A-Level" },
];

const MINUTES = [45, 90, 120, 180];

function PlanPage() {
  const { board } = useBoard();
  const [level, setLevel] = useState<"as" | "a2" | "full">("full");
  const [minutes, setMinutes] = useState(90);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [due, setDue] = useState(0);
  const build = useServerFn(generateStudyPlan);

  const run = async () => {
    setLoading(true);
    try {
      const r = await build({ data: { board, level, minutesPerDay: minutes } });
      setPlan(r.plan);
      setDue(r.cardsDueNow);
      toast.success("Your plan is ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build your plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <CalendarCheck className="size-7 text-primary" /> Study plan
        </h1>
        <p className="text-muted-foreground mt-1">
          Daily topics chosen from your mock marks and flashcard performance — {BOARD_LABEL[board]}.
        </p>
      </header>

      <section className="rounded-2xl border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Syllabus scope</div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Syllabus scope">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLevel(l.value)}
                  aria-pressed={level === l.value}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm min-h-11",
                    level === l.value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Minutes per day</div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Minutes per day">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  aria-pressed={minutes === m}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm min-h-11",
                    minutes === m ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent",
                  )}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>
        </div>
        <Button className="mt-5 w-full sm:w-auto" onClick={() => void run()} disabled={loading} aria-label="Build my personalised study plan">
          <Sparkles className="size-4 mr-1.5" />
          {loading ? "Analysing your results…" : plan ? "Rebuild plan" : "Build my plan"}
        </Button>
      </section>

      {plan && (
        <div className="mt-8 space-y-6" aria-live="polite">
          <section className="rounded-2xl border bg-gradient-to-br from-primary/10 to-transparent p-5">
            <div className="font-semibold text-lg">{plan.headline}</div>
            <p className="text-sm text-muted-foreground mt-1 flex items-start gap-2">
              <Target className="size-4 mt-0.5 shrink-0 text-primary" /> {plan.focus}
            </p>
            {due > 0 && (
              <p className="text-xs text-muted-foreground mt-2">{due} flashcards are due right now — clear them first each day.</p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Your next 7 days</h2>
            <ol className="space-y-3">
              {plan.days.map((d, i) => (
                <li key={`${d.day}-${i}`} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="font-medium">
                      {d.day} · <span className="text-primary">{d.subject}</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3.5" /> {d.minutes} min
                    </span>
                  </div>
                  <div className="text-sm mt-1 text-muted-foreground">{d.topics.join(" · ")}</div>
                  <ul className="mt-2 space-y-1 text-sm list-disc pl-5">
                    {d.tasks.map((t, j) => (
                      <li key={j}><Markdown>{t}</Markdown></li>
                    ))}
                  </ul>
                  <div className="mt-2 text-xs text-muted-foreground italic">{d.why}</div>
                </li>
              ))}
            </ol>
          </section>

          {plan.weakTopics.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="size-5 text-warning" /> Weak topics to fix
              </h2>
              <ul className="space-y-2">
                {plan.weakTopics.map((w, i) => (
                  <li key={i} className="rounded-lg border bg-card p-3">
                    <div className="text-sm font-medium">{w.topic}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{w.reason}</div>
                    <div className="text-xs mt-1"><span className="font-medium">Fix:</span> {w.fix}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
