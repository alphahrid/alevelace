import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Timer, ArrowRight } from "lucide-react";
import { filterSelectedSubjects } from "@/lib/subject-filter";

type Subject = { id: string; slug: string; name: string; color: string };
type Attempt = { id: string; subject_id: string | null; score: number; total: number; started_at: string; finished_at: string | null };

export const Route = createFileRoute("/_authenticated/mock")({
  head: () => ({ meta: [{ title: "Mock exams — A-Level Ace" }] }),
  component: MockIndex,
});

function MockIndex() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: prof } = await supabase.from("profiles").select("selected_subjects").eq("id", u.user.id).single();
      if (prof?.selected_subjects?.length) {
        const { data: subs } = await supabase.from("subjects").select("*").in("id", prof.selected_subjects);
        setSubjects(filterSelectedSubjects((subs as Subject[]) || [], prof.selected_subjects));
      }
      const { data: at } = await supabase.from("quiz_attempts").select("*").eq("user_id", u.user.id).eq("mode", "mock").order("started_at", { ascending: false }).limit(10);
      setAttempts((at as Attempt[]) || []);
    })();
  }, []);

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Timer className="size-7 text-primary" /> Mock exams</h1>
        <p className="text-muted-foreground mt-1">Full timed papers, AI-marked with a feedback breakdown.</p>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {subjects.length === 0 && (
          <div className="col-span-full rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Pick subjects in <Link to="/subjects" className="text-primary hover:underline">Subjects</Link> first.
          </div>
        )}
        {subjects.map((s) => (
          <div key={s.id} className="rounded-xl border bg-card p-5">
            <div className="size-10 rounded-md mb-3 grid place-items-center font-bold" style={{ backgroundColor: s.color + "22", color: s.color }}>{s.name[0]}</div>
            <div className="font-semibold">{s.name}</div>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Build a custom paper — choose topics, question count and MCQ / Theory / Practical.</p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => navigate({ to: "/mock/$subjectId", params: { subjectId: s.id } })}
            >
              Start mock <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        ))}
      </section>

      {attempts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent attempts</h2>
          <div className="rounded-xl border bg-card divide-y">
            {attempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <div className="font-medium">{a.finished_at ? "Completed" : "In progress"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(a.started_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{a.score} / {a.total}</div>
                  <div className="text-xs text-muted-foreground">{a.total > 0 ? Math.round((a.score / a.total) * 100) : 0}%</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
