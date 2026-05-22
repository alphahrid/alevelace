import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Markdown } from "@/components/Markdown";
import { Timer, ArrowLeft, Sparkles, Check, X } from "lucide-react";
import { toast } from "sonner";
import { generateMockExam } from "@/lib/mock.functions";
import { gradeShortAnswer } from "@/lib/ai.functions";

type Q = { id: string; type: "mcq" | "short"; prompt: string; choices: string[] | null; answer: string; explanation: string };
type Result = { questionId: string; correct: boolean; score: number; userAnswer: string; feedback?: string };

const SECONDS_PER_Q = 90; // 1m30 per question

export const Route = createFileRoute("/_authenticated/mock/$subjectId")({
  component: MockExam,
});

function MockExam() {
  const { subjectId } = Route.useParams();
  const navigate = useNavigate();
  const [subjectName, setSubjectName] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"intro" | "exam" | "marking" | "done">("intro");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef<number>(0);

  const gen = useServerFn(generateMockExam);
  const grade = useServerFn(gradeShortAnswer);

  useEffect(() => {
    supabase.from("subjects").select("name").eq("id", subjectId).single().then(({ data }) => {
      setSubjectName((data as { name: string } | null)?.name || "");
    });
  }, [subjectId]);

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
      const r = await gen({ data: { subjectId, count: 12 } });
      setQuestions(r.questions as Q[]);
      setAttemptId(r.attemptId);
      setSecondsLeft((r.questions as Q[]).length * SECONDS_PER_Q);
      startedAt.current = Date.now();
      setPhase("exam");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start");
    } finally { setBusy(false); }
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

    const { data: u } = await supabase.auth.getUser();
    if (u.user && attemptId) {
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
    }
    setPhase("done");
  };

  const totalScore = useMemo(() => results.reduce((a, r) => a + r.score, 0), [results]);
  const pct = questions.length ? Math.round((totalScore / questions.length) * 100) : 0;
  const grade_letter = pct >= 90 ? "A*" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "E";

  if (phase === "intro") {
    return (
      <div className="p-6 sm:p-8 max-w-2xl mx-auto">
        <Link to="/mock" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="size-4" /> Mocks</Link>
        <h1 className="text-3xl font-bold tracking-tight mt-2">{subjectName} mock exam</h1>
        <div className="rounded-xl border bg-card p-6 mt-6 space-y-3">
          <div className="flex items-center gap-2 text-sm"><Timer className="size-4 text-primary" /> 12 questions · ~18 minutes</div>
          <div className="text-sm text-muted-foreground">A full-board flavoured paper (Cambridge & Edexcel). Once you start, the timer runs — you can navigate freely between questions. AI marks every answer with feedback.</div>
          <Button onClick={start} disabled={busy} size="lg" className="mt-2"><Sparkles className="size-4 mr-2" />{busy ? "Preparing paper…" : "Start mock"}</Button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="p-6 sm:p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Paper marked</h1>
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          <Stat label="Score" value={`${totalScore} / ${questions.length}`} />
          <Stat label="Percentage" value={`${pct}%`} />
          <Stat label="Predicted grade" value={grade_letter} highlight />
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
                {r?.feedback && (<><div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Feedback</div><div className="text-sm">{r.feedback}</div></>)}
                <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Model answer</div>
                <Markdown>{q.answer}</Markdown>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex gap-2">
          <Button onClick={() => navigate({ to: "/dashboard" })}>Back to dashboard</Button>
          <Button variant="outline" onClick={() => navigate({ to: "/mock" })}>Another paper</Button>
        </div>
      </div>
    );
  }

  // exam
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
              <Textarea value={answers[q.id] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} rows={5} placeholder="Type your answer…" />
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
            <div className="text-sm text-muted-foreground">AI is grading short-answer responses.</div>
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

// Avoid unused-import warning for icons
void Check; void X;
