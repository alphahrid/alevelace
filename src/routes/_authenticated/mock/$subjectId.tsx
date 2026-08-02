import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Markdown } from "@/components/Markdown";
import { Timer, ArrowLeft, Sparkles, Printer, Upload, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { generateMockExam, markUploadedPaper } from "@/lib/mock.functions";
import { PAPER_TYPES, type PaperType } from "@/lib/mock.helpers";
import { gradeShortAnswer } from "@/lib/ai.functions";
import { useBoard, BOARD_LABEL } from "@/lib/board";
import { LevelTabs } from "@/components/LevelTabs";
import { exportExamPdf } from "@/lib/print-exam";
import type { LevelFilter, SyllabusLevel } from "@/lib/levels";
import { levelsFor } from "@/lib/levels";
import { cn } from "@/lib/utils";

type Q = { id: string; type: "mcq" | "short"; prompt: string; choices: string[] | null; answer: string; explanation: string };
type Result = { questionId: string; correct: boolean; score: number; userAnswer: string; feedback?: string };
type Topic = { id: string; name: string; level: SyllabusLevel; syllabus_ref: string | null };

const SECONDS_PER_Q = 90;
const COUNT_OPTIONS = [5, 10, 15, 20];

export const Route = createFileRoute("/_authenticated/mock/$subjectId")({
  component: MockExam,
});

/** Real past-paper style grade thresholds live in @/lib/mock-grade (unit-tested). */


function MockExam() {
  const { subjectId } = Route.useParams();
  const navigate = useNavigate();
  const [subjectName, setSubjectName] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"setup" | "exam" | "marking" | "done">("setup");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef<number>(0);

  // builder state
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("full");
  const [allTopics, setAllTopics] = useState(true);
  const [pickedTopics, setPickedTopics] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [paperType, setPaperType] = useState<PaperType>("theory");

  const { board } = useBoard();
  const gen = useServerFn(generateMockExam);
  const grade = useServerFn(gradeShortAnswer);
  const markUpload = useServerFn(markUploadedPaper);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: t }] = await Promise.all([
        supabase.from("subjects").select("name").eq("id", subjectId).single(),
        supabase.from("topics").select("id, name, level, syllabus_ref").eq("subject_id", subjectId).order("position"),
      ]);
      setSubjectName((s as { name: string } | null)?.name || "");
      setTopics((t as Topic[]) || []);
    })();
  }, [subjectId]);

  const allowedLevels = useMemo(() => levelsFor(levelFilter), [levelFilter]);
  const visibleTopics = useMemo(() => topics.filter((t) => allowedLevels.includes(t.level)), [topics, allowedLevels]);

  useEffect(() => {
    if (phase !== "exam") return;
    const t = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "exam" && secondsLeft === 0) void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft]);

  const start = async () => {
    setBusy(true);
    try {
      const topicIds = allTopics ? [] : pickedTopics;
      if (!allTopics && topicIds.length === 0) {
        toast.error("Pick at least one topic, or choose all syllabus topics.");
        return;
      }
      const r = await gen({ data: { subjectId, count, board, paperType, topicIds, level: levelFilter } });
      setQuestions(r.questions as Q[]);
      setAttemptId(r.attemptId);
      setSecondsLeft((r.questions as Q[]).length * SECONDS_PER_Q);
      startedAt.current = Date.now();
      setPhase("exam");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start");
    } finally { setBusy(false); }
  };

  const persist = async (out: Result[], score: number, duration: number) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user || !attemptId) return;
    await supabase.from("quiz_attempts").update({
      score, total: questions.length, duration_seconds: duration, finished_at: new Date().toISOString(),
    }).eq("id", attemptId);
    const answerRows = out.map((r) => {
      const q = questions.find((x) => x.id === r.questionId)!;
      return {
        attempt_id: attemptId, user_id: u.user!.id, question_id: q.id,
        question_prompt: q.prompt, user_answer: r.userAnswer,
        correct: r.correct, score: r.score, ai_feedback: r.feedback || null,
      };
    });
    await supabase.from("attempt_answers").insert(answerRows);
    await supabase.from("study_sessions").insert({ user_id: u.user.id, subject_id: subjectId, activity: "mock", minutes: Math.max(5, Math.round(duration / 60)) });
  };

  const submit = async () => {
    if (phase === "marking" || phase === "done") return;
    setPhase("marking");
    const duration = Math.round((Date.now() - startedAt.current) / 1000);
    const out: Result[] = [];
    let score = 0;
    for (const q of questions) {
      const userAnswer = answers[q.id] || "";
      if (q.type === "mcq") {
        const correct = userAnswer.trim() === q.answer.trim();
        if (correct) score++;
        out.push({ questionId: q.id, correct, score: correct ? 1 : 0, userAnswer });
      } else {
        try {
          const r = await grade({ data: { prompt: q.prompt, modelAnswer: q.answer, userAnswer } });
          if (r.correct) score++;
          out.push({ questionId: q.id, correct: r.correct, score: r.score, userAnswer, feedback: r.feedback });
        } catch {
          out.push({ questionId: q.id, correct: false, score: 0, userAnswer, feedback: "Marking unavailable" });
        }
      }
    }
    setResults(out);
    await persist(out, score, duration);
    setPhase("done");
  };

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    if (files.length > 6) return toast.error("Up to 6 images at a time.");
    setPhase("marking");
    try {
      const images = await Promise.all(Array.from(files).map((f) => new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = () => rej(new Error("Could not read file"));
        fr.readAsDataURL(f);
      })));
      const bad = images.find((i) => !i.startsWith("data:image/"));
      if (bad) throw new Error("Please upload photos or images of your script (PNG/JPG).");
      const r = await markUpload({
        data: {
          images,
          markScheme: questions.map((q, i) => ({ index: i + 1, prompt: q.prompt, answer: q.answer })),
        },
      });
      const out: Result[] = questions.map((q, i) => {
        const m = r.results.find((x) => x.index === i + 1);
        return {
          questionId: q.id,
          correct: m?.correct ?? false,
          score: m?.score ?? 0,
          userAnswer: m?.transcribed || "(from uploaded script)",
          feedback: m?.feedback || "Not found in the uploaded pages.",
        };
      });
      const score = out.filter((o) => o.correct).length;
      setResults(out);
      await persist(out, score, Math.round((Date.now() - startedAt.current) / 1000));
      if (r.overall) toast.success(r.overall.slice(0, 160));
      setPhase("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not mark the upload");
      setPhase("exam");
    }
  };

  const printPaper = (withMarkScheme: boolean) => {
    exportExamPdf({
      title: `${subjectName} — ${PAPER_TYPES.find((p) => p.value === paperType)?.label ?? "Mock Paper"}`,
      subject: subjectName,
      board: BOARD_LABEL[board],
      includeMarkScheme: withMarkScheme,
      questions: questions.map((q, i) => ({
        index: i + 1,
        type: q.type,
        prompt: q.prompt,
        choices: q.choices,
        answer: q.answer,
        explanation: q.explanation,
        ...(phase === "done" ? {
          userAnswer: results.find((r) => r.questionId === q.id)?.userAnswer,
          correct: results.find((r) => r.questionId === q.id)?.correct,
          score: results.find((r) => r.questionId === q.id)?.score,
          feedback: results.find((r) => r.questionId === q.id)?.feedback,
        } : {}),
      })),
      ...(phase === "done" ? { score: totalScore, total: questions.length, grade: gradeInfo.grade } : {}),
    });
  };

  const totalScore = useMemo(() => results.reduce((a, r) => a + r.score, 0), [results]);
  const pct = questions.length ? Math.round((totalScore / questions.length) * 100) : 0;
  const gradeInfo = gradeFor(pct, levelFilter);

  // ---------- setup / builder ----------
  if (phase === "setup") {
    return (
      <div className="p-6 sm:p-8 max-w-3xl mx-auto">
        <Link to="/mock" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="size-4" /> Mocks</Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">{subjectName} mock builder</h1>
        <p className="text-muted-foreground mt-1">Tailored to <span className="font-medium text-foreground">{BOARD_LABEL[board]}</span> and your own AI notes.</p>

        <div className="mt-6 space-y-5">
          <section className="rounded-xl border bg-card p-5">
            <div className="text-sm font-semibold mb-1">1 · Syllabus level</div>
            <p className="text-xs text-muted-foreground mb-3">AS caps at grade A; A2 / Full A-Level reach A*.</p>
            <LevelTabs value={levelFilter} onChange={(v) => { setLevelFilter(v); setPickedTopics([]); }} />
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="text-sm font-semibold mb-3">2 · Topics</div>
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant={allTopics ? "default" : "outline"} onClick={() => setAllTopics(true)}>All syllabus topics</Button>
              <Button size="sm" variant={!allTopics ? "default" : "outline"} onClick={() => setAllTopics(false)}>Pick topics</Button>
            </div>
            {!allTopics && (
              <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                {visibleTopics.length === 0 && <div className="p-3 text-sm text-muted-foreground">No topics at this level.</div>}
                {visibleTopics.map((t) => {
                  const on = pickedTopics.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPickedTopics((p) => on ? p.filter((x) => x !== t.id) : [...p, t.id])}
                      className={cn("w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition", on ? "bg-primary/10" : "hover:bg-muted/60")}
                    >
                      <span className={cn("size-4 rounded border grid place-items-center text-[10px]", on && "bg-primary text-primary-foreground border-primary")}>{on ? "✓" : ""}</span>
                      <span className="flex-1 truncate">{t.name}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">{t.level}{t.syllabus_ref ? ` · ${t.syllabus_ref}` : ""}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {!allTopics && <div className="text-xs text-muted-foreground mt-2">{pickedTopics.length} selected</div>}
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="text-sm font-semibold mb-3">3 · Question count</div>
            <div className="flex flex-wrap gap-2">
              {COUNT_OPTIONS.map((c) => (
                <Button key={c} size="sm" variant={count === c ? "default" : "outline"} onClick={() => setCount(c)}>{c} questions</Button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Timer: {Math.round((count * SECONDS_PER_Q) / 60)} minutes</div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="text-sm font-semibold mb-3">4 · Paper type</div>
            <div className="grid sm:grid-cols-3 gap-2">
              {PAPER_TYPES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPaperType(p.value)}
                  className={cn("rounded-lg border p-3 text-left transition", paperType === p.value ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:border-primary/40")}
                >
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{p.hint}</div>
                </button>
              ))}
            </div>
          </section>

          <Button onClick={() => void start()} disabled={busy} size="lg" className="w-full">
            <Sparkles className="size-4 mr-2" />{busy ? "Building your paper…" : "Generate & start mock"}
          </Button>
        </div>
      </div>
    );
  }

  // ---------- results ----------
  if (phase === "done") {
    return (
      <div className="p-6 sm:p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Paper marked</h1>
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          <Stat label="Score" value={`${totalScore.toFixed(1)} / ${questions.length}`} />
          <Stat label="Percentage" value={`${pct}%`} />
          <Stat label="Predicted grade" value={gradeInfo.grade} highlight />
        </div>

        <div className="mt-5 rounded-xl border bg-primary/5 border-primary/30 p-5 flex items-start gap-3">
          <PartyPopper className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{gradeInfo.hype}</div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => printPaper(true)}><Printer className="size-4 mr-2" />Download / Print PDF</Button>
        </div>

        <div className="mt-8 space-y-4">
          {questions.map((q, i) => {
            const r = results.find((x) => x.questionId === q.id);
            return (
              <div key={q.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Q{i + 1} · {q.type === "mcq" ? "MCQ" : "Short"}</div>
                  <div className={`text-xs font-medium px-2 py-0.5 rounded ${r?.correct ? "bg-success/15 text-success-foreground" : "bg-destructive/15 text-destructive-foreground"}`}>
                    {r?.correct ? "Correct" : `${Math.round((r?.score || 0) * 100)}%`}
                  </div>
                </div>
                <div className="mt-2"><Markdown>{q.prompt}</Markdown></div>
                <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Your answer</div>
                <div className="text-sm whitespace-pre-wrap">{r?.userAnswer || <em className="text-muted-foreground">No answer</em>}</div>
                {r?.feedback && (<><div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Examiner feedback</div><div className="text-sm"><Markdown>{r.feedback}</Markdown></div></>)}
                <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Mark scheme</div>
                <Markdown>{q.answer}</Markdown>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => navigate({ to: "/dashboard" })}>Back to dashboard</Button>
          <Button variant="outline" onClick={() => navigate({ to: "/mock" })}>Another paper</Button>
        </div>
      </div>
    );
  }

  // ---------- exam ----------
  const q = questions[idx];
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const answeredCount = Object.values(answers).filter((v) => v && v.trim().length > 0).length;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="sticky top-14 md:top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-4 bg-background/85 backdrop-blur border-b flex items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-semibold">{subjectName} · Mock</div>
          <div className="text-xs text-muted-foreground">{answeredCount} / {questions.length} answered</div>
        </div>
        <div className={`tabular-nums font-mono text-lg font-bold px-3 py-1 rounded-md ${secondsLeft < 60 ? "bg-destructive/15 text-destructive-foreground" : "bg-primary/10 text-primary"}`}>
          {mm}:{ss}
        </div>
        <Button size="sm" variant="outline" onClick={() => { if (confirm("Submit paper now?")) void submit(); }} disabled={phase !== "exam"}>Submit</Button>
      </div>

      <Progress value={((idx + 1) / questions.length) * 100} className="mb-4" />

      <div className="flex flex-wrap gap-2 mb-4">
        <Button size="sm" variant="outline" onClick={() => printPaper(false)}><Printer className="size-4 mr-1.5" />Print paper</Button>
        <Button size="sm" variant="outline" onClick={() => printPaper(true)}><Printer className="size-4 mr-1.5" />Print + mark scheme</Button>
        <label className="inline-flex">
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void onUpload(e.target.files)} />
          <span className="inline-flex items-center h-8 px-3 rounded-md border text-sm cursor-pointer hover:bg-muted">
            <Upload className="size-4 mr-1.5" />Upload written script
          </span>
        </label>
      </div>

      {q && (
        <div className="rounded-xl border bg-card p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Question {idx + 1} of {questions.length}</div>
          <Markdown>{q.prompt}</Markdown>
          <div className="mt-4 space-y-2">
            {q.type === "mcq" && q.choices ? (
              q.choices.map((c) => {
                const selected = answers[q.id] === c;
                return (
                  <button key={c} onClick={() => setAnswers((a) => ({ ...a, [q.id]: c }))}
                    className={`w-full text-left rounded-md border px-3 py-2 transition ${selected ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                    <Markdown>{c}</Markdown>
                  </button>
                );
              })
            ) : (
              <>
                <Textarea value={answers[q.id] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} rows={5} placeholder="Type your answer… use $x^2$ for maths" />
                <div className="text-[11px] text-muted-foreground">Maths supported — wrap equations in <code>$…$</code> or <code>$$…$$</code>.</div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between mt-4">
        <Button variant="outline" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>Previous</Button>
        {idx + 1 < questions.length ? (
          <Button onClick={() => setIdx((i) => i + 1)}>Next</Button>
        ) : (
          <Button onClick={() => void submit()}>Finish paper</Button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {questions.map((qq, i) => {
          const done = (answers[qq.id] || "").trim().length > 0;
          return (
            <button key={qq.id} onClick={() => setIdx(i)}
              className={`size-8 rounded text-xs font-medium border transition ${
                i === idx ? "border-primary bg-primary text-primary-foreground" : done ? "border-success bg-success/15" : "hover:bg-muted"
              }`}>{i + 1}</button>
          );
        })}
      </div>

      {phase === "marking" && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur grid place-items-center">
          <div className="rounded-xl border bg-card p-6 text-center">
            <Sparkles className="size-6 text-primary mx-auto mb-2 animate-pulse" />
            <div className="font-semibold">Marking your paper…</div>
            <div className="text-sm text-muted-foreground">Applying M1/A1/B1 mark-scheme rules.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? "bg-primary/10 border-primary/30" : "bg-card"}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

void Timer;
