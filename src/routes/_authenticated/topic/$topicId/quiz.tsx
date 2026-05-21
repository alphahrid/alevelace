import { createFileRoute, Link, useServerFn } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/Markdown";
import { ArrowLeft, Sparkles, Check, X } from "lucide-react";
import { toast } from "sonner";
import { generateQuiz, gradeShortAnswer } from "@/lib/ai.functions";

type Q = { id: string; type: "mcq" | "short"; prompt: string; choices: string[] | null; answer: string; explanation: string };

export const Route = createFileRoute("/_authenticated/topic/$topicId/quiz")({
  component: Quiz,
});

function Quiz() {
  const { topicId } = Route.useParams();
  const [topicName, setTopicName] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState<null | { correct: boolean; score: number; feedback?: string }>(null);
  const [score, setScore] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [grading, setGrading] = useState(false);
  const gen = useServerFn(generateQuiz);
  const grade = useServerFn(gradeShortAnswer);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: t } = await supabase.from("topics").select("name").eq("id", topicId).single();
    setTopicName((t as { name: string } | null)?.name || "");
    const { data } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("user_id", u.user.id)
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false })
      .limit(10);
    setQuestions((data as Q[]) || []);
    setIdx(0); setScore(0); setAnswer(""); setRevealed(null);
  };

  useEffect(() => { load(); }, [topicId]);

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await gen({ data: { topicId, count: 8 } });
      toast.success(`Generated ${r.created} questions`);
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setGenerating(false); }
  };

  const q = questions[idx];

  const submit = async () => {
    if (!q) return;
    if (q.type === "mcq") {
      const correct = answer === q.answer;
      setRevealed({ correct, score: correct ? 1 : 0 });
      if (correct) setScore((s) => s + 1);
    } else {
      setGrading(true);
      try {
        const r = await grade({ data: { prompt: q.prompt, modelAnswer: q.answer, userAnswer: answer } });
        setRevealed({ correct: r.correct, score: r.score, feedback: r.feedback });
        if (r.correct) setScore((s) => s + 1);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Grading failed");
      } finally { setGrading(false); }
    }
  };

  const next = async () => {
    if (idx + 1 >= questions.length) {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("quiz_attempts").insert({
          user_id: u.user.id,
          topic_id: topicId,
          mode: "quiz",
          score,
          total: questions.length,
          finished_at: new Date().toISOString(),
        });
        await supabase.from("study_sessions").insert({ user_id: u.user.id, topic_id: topicId, activity: "quiz", minutes: Math.max(2, questions.length) });
      }
      toast.success(`Quiz complete: ${score} / ${questions.length}`);
      await load();
      return;
    }
    setIdx((i) => i + 1);
    setAnswer(""); setRevealed(null);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link to="/topic/$topicId" params={{ topicId }} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <div className="flex items-end justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quiz · {topicName}</h1>
          {q && <p className="text-sm text-muted-foreground">Question {idx + 1} of {questions.length} · Score {score}</p>}
        </div>
        <Button variant="outline" onClick={generate} disabled={generating}>
          <Sparkles className="size-4 mr-2" /> {generating ? "Generating…" : "New set"}
        </Button>
      </div>

      {!q ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="font-medium mb-2">No questions yet</p>
          <p className="text-sm text-muted-foreground mb-4">Generate exam-style questions with AI.</p>
          <Button onClick={generate} disabled={generating}><Sparkles className="size-4 mr-2" /> Generate quiz</Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6">
          <Markdown>{q.prompt}</Markdown>

          <div className="mt-4 space-y-2">
            {q.type === "mcq" && q.choices ? (
              q.choices.map((c) => {
                const selected = answer === c;
                const isAnswer = revealed && c === q.answer;
                const wrong = revealed && selected && c !== q.answer;
                return (
                  <button
                    key={c}
                    onClick={() => !revealed && setAnswer(c)}
                    disabled={!!revealed}
                    className={`w-full text-left rounded-md border px-3 py-2 transition ${
                      isAnswer ? "border-success bg-success/10" : wrong ? "border-destructive bg-destructive/10" : selected ? "border-primary bg-primary/5" : "hover:bg-muted"
                    }`}
                  >
                    <Markdown>{c}</Markdown>
                  </button>
                );
              })
            ) : (
              <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={!!revealed} placeholder="Type your answer…" rows={4} />
            )}
          </div>

          {revealed && (
            <div className={`mt-4 rounded-md border p-3 ${revealed.correct ? "border-success bg-success/10" : "border-destructive bg-destructive/10"}`}>
              <div className="flex items-center gap-2 font-medium mb-1">
                {revealed.correct ? <Check className="size-4" /> : <X className="size-4" />}
                {revealed.correct ? "Correct" : "Not quite"} {q.type === "short" && `· score ${Math.round(revealed.score * 100)}%`}
              </div>
              {revealed.feedback && <div className="text-sm mb-2">{revealed.feedback}</div>}
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-2 mb-1">Model answer</div>
              <Markdown>{q.answer}</Markdown>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-3 mb-1">Explanation</div>
              <Markdown>{q.explanation}</Markdown>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            {!revealed ? (
              <Button onClick={submit} disabled={!answer || grading}>{grading ? "Marking…" : "Submit"}</Button>
            ) : (
              <Button onClick={next}>{idx + 1 >= questions.length ? "Finish" : "Next question"}</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
