import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, BookMarked, ListChecks, Timer } from "lucide-react";
import { ExaminerTrapDoor } from "@/components/ExaminerTrapDoor";
import { ReadAloud } from "@/components/ReadAloud";
import { LevelTabs } from "@/components/LevelTabs";
import { levelsFor, type LevelFilter, type SyllabusLevel } from "@/lib/levels";

type Subject = { id: string; name: string; slug: string; color: string; description: string | null };
type Topic = { id: string; name: string; slug: string; syllabus_ref: string | null; position: number; level: SyllabusLevel };

export const Route = createFileRoute("/_authenticated/subjects/$slug")({
  component: SubjectPage,
});

function SubjectPage() {
  const { slug } = Route.useParams();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [filter, setFilter] = useState<LevelFilter>("full");

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("subjects").select("*").eq("slug", slug).maybeSingle();
      if (!s) throw notFound();
      setSubject(s as Subject);
      const { data: t } = await supabase.from("topics").select("*").eq("subject_id", (s as Subject).id).order("position");
      setTopics((t as Topic[]) || []);
    })();
  }, [slug]);

  const visibleTopics = topics.filter((t) => levelsFor(filter).includes(t.level));
  const firstTopic = visibleTopics[0];

  if (!subject) return <div className="p-8">Loading…</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link to="/subjects" className="text-sm text-muted-foreground hover:text-foreground">← All subjects</Link>
      <div className="flex items-center gap-3 mt-2 mb-2">
        <div className="size-12 rounded-lg grid place-items-center font-bold text-xl" style={{ backgroundColor: subject.color + "22", color: subject.color }}>{subject.name[0]}</div>
        <h1 className="text-3xl font-bold tracking-tight flex-1">{subject.name}</h1>
        {subject.description && <ReadAloud text={`${subject.name}. ${subject.description}`} label="Summary" />}
      </div>
      <p className="text-muted-foreground mb-6">{subject.description}</p>

      <section className="grid sm:grid-cols-3 gap-3 mb-8">
        <Link to="/notes" className="rounded-xl border bg-card p-4 hover:border-primary/40 transition">
          <div className="flex items-center gap-2 font-medium text-sm"><BookMarked className="size-4 text-primary" /> Generate / view AI notes</div>
          <p className="text-xs text-muted-foreground mt-1">AS &amp; A2 chapter chunks in mark-scheme wording.</p>
        </Link>
        {firstTopic ? (
          <Link to="/topic/$topicId/quiz" params={{ topicId: firstTopic.id }} className="rounded-xl border bg-card p-4 hover:border-primary/40 transition">
            <div className="flex items-center gap-2 font-medium text-sm"><ListChecks className="size-4 text-primary" /> Take topic quiz</div>
            <p className="text-xs text-muted-foreground mt-1">Starts with {firstTopic.name}.</p>
          </Link>
        ) : (
          <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No topics for this level yet.</div>
        )}
        <Link to="/mock/$subjectId" params={{ subjectId: subject.id }} className="rounded-xl border bg-card p-4 hover:border-primary/40 transition">
          <div className="flex items-center gap-2 font-medium text-sm"><Timer className="size-4 text-primary" /> Start subject mock exam</div>
          <p className="text-xs text-muted-foreground mt-1">Timed, board-tailored, AI-marked.</p>
        </Link>
      </section>

      <div className="mb-8">
        <ExaminerTrapDoor subjectName={subject.name} />
      </div>


      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold">Topics</h2>
        <LevelTabs value={filter} onChange={setFilter} />
      </div>
      <div className="space-y-2">
        {topics.filter((t) => levelsFor(filter).includes(t.level)).length === 0 && (
          <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground text-center">No topics for this level yet.</div>
        )}
        {topics.filter((t) => levelsFor(filter).includes(t.level)).map((t) => (
          <Link
            key={t.id}
            to="/topic/$topicId"
            params={{ topicId: t.id }}
            className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:border-primary/40 transition"
          >
            <div>
              <div className="font-medium flex items-center gap-2">
                {t.name}
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{t.level}</span>
              </div>
              {t.syllabus_ref && <div className="text-xs text-muted-foreground">{t.syllabus_ref}</div>}
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
