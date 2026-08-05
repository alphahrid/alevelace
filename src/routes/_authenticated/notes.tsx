import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import { ReadAloud } from "@/components/ReadAloud";
import { LevelTabs } from "@/components/LevelTabs";
import { generateNote } from "@/lib/notes.functions";
import { flashcardsFromNote } from "@/lib/flashcards.functions";
import type { LevelFilter, SyllabusLevel } from "@/lib/levels";
import { levelsFor } from "@/lib/levels";
import { BookMarked, ChevronDown, ChevronRight, Sparkles, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";

type Subject = { id: string; slug: string; name: string; color: string };
type Topic = { id: string; name: string; subject_id: string; level: SyllabusLevel; position: number; syllabus_ref: string | null };
type Note = { id: string; title: string; content: string; level: SyllabusLevel; topic_id: string | null; subject_id: string | null; updated_at: string };

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "Study Vaults — AI A-Level Notes | A-Level Ace" },
      { name: "description", content: "ZNotes-style AI revision notes for AS and A2 Physics, Chemistry, Biology, Maths and Further Maths — written to CIE and Edexcel mark schemes." },
      { property: "og:title", content: "Study Vaults — AI A-Level Notes" },
      { property: "og:description", content: "Collapsible AS/A2 chapter trees with mark-scheme-accurate notes and KaTeX formulae." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://alevelace.lovable.app/notes" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://alevelace.lovable.app/notes" }],
  }),
  component: NotesHub,
});

function NotesHub() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [filter, setFilter] = useState<LevelFilter>("full");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<Note | null>(null);
  const [busyTopic, setBusyTopic] = useState<string | null>(null);
  const [noneSelected, setNoneSelected] = useState(false);

  const gen = useServerFn(generateNote);
  const toCards = useServerFn(flashcardsFromNote);
  const [convertingNote, setConvertingNote] = useState<string | null>(null);

  const turnIntoFlashcards = async (noteId: string) => {
    setConvertingNote(noteId);
    try {
      const r = await toCards({ data: { noteId } });
      toast.success(`${r.created} flashcards added — study them in Flashcards.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build flashcards");
    } finally {
      setConvertingNote(null);
    }
  };

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: prof } = await supabase.from("profiles").select("selected_subjects").eq("id", u.user.id).maybeSingle();
    const chosen: string[] = ((prof as { selected_subjects: string[] } | null)?.selected_subjects) || [];
    setNoneSelected(chosen.length === 0);
    let finalSubs: Subject[] = [];
    if (chosen.length) {
      const { data: subs } = await supabase.from("subjects").select("id, slug, name, color").in("id", chosen).order("name");
      finalSubs = (subs as Subject[]) || [];
    }
    setSubjects(finalSubs);
    if (finalSubs.length) {
      const { data: tps } = await supabase
        .from("topics")
        .select("id, name, subject_id, level, position, syllabus_ref")
        .in("subject_id", finalSubs.map((s) => s.id))
        .order("position");
      setTopics((tps as Topic[]) || []);
    }
    const { data: ns } = await supabase
      .from("notes")
      .select("id, title, content, level, topic_id, subject_id, updated_at")
      .eq("user_id", u.user.id)
      .order("updated_at", { ascending: false });
    setNotes((ns as Note[]) || []);
  };

  useEffect(() => { void load(); }, []);

  const allowed = useMemo(() => levelsFor(filter), [filter]);
  const visibleTopics = useMemo(() => topics.filter((t) => allowed.includes(t.level)), [topics, allowed]);

  const noteFor = (topicId: string, level: SyllabusLevel) => notes.find((n) => n.topic_id === topicId && n.level === level);

  const makeNote = async (topic: Topic) => {
    setBusyTopic(topic.id);
    try {
      const n = await gen({ data: { topicId: topic.id, level: topic.level } });
      toast.success("Notes generated");
      setNotes((prev) => [n as Note, ...prev]);
      setActive(n as Note);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate notes");
    } finally {
      setBusyTopic(null);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setNotes((p) => p.filter((n) => n.id !== id));
    if (active?.id === id) setActive(null);
    toast.success("Note deleted");
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookMarked className="size-7 text-primary" /> Study Vaults
        </h1>
        <p className="text-muted-foreground mt-1">
          ZNotes-style AI revision notes, grouped by AS and A2 — written to {" "}
          <span className="font-medium text-foreground">CIE &amp; Edexcel</span> mark-scheme wording.
        </p>
        <div className="mt-4"><LevelTabs value={filter} onChange={setFilter} /></div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,22rem)_1fr] gap-6">
        {/* Chapter tree */}
        <div className="space-y-4">
          {subjects.length === 0 && (
            <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              {noneSelected ? (
                <>Pick your subjects in <Link to="/subjects" className="text-primary hover:underline">Subjects</Link> and they'll appear here.</>
              ) : "No subjects available."}
            </div>
          )}
          {subjects.map((s) => {
            const subTopics = visibleTopics.filter((t) => t.subject_id === s.id);
            if (subTopics.length === 0) return null;
            const groups: Array<{ level: SyllabusLevel; label: string }> = [
              { level: "as", label: "AS Level" },
              { level: "a2", label: "A2 Level" },
            ].filter((g) => allowed.includes(g.level as SyllabusLevel)) as Array<{ level: SyllabusLevel; label: string }>;

            return (
              <section key={s.id} className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderLeft: `4px solid ${s.color}` }}>
                  <div className="size-7 rounded-md grid place-items-center text-xs font-bold" style={{ backgroundColor: s.color + "22", color: s.color }}>{s.name[0]}</div>
                  <div className="font-semibold text-sm">{s.name}</div>
                </div>
                {groups.map((g) => {
                  const key = `${s.id}:${g.level}`;
                  const list = subTopics.filter((t) => t.level === g.level);
                  if (list.length === 0) return null;
                  const isOpen = open[key] ?? true;
                  return (
                    <div key={key} className="border-b last:border-b-0">
                      <button
                        onClick={() => setOpen((o) => ({ ...o, [key]: !isOpen }))}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50"
                      >
                        {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        {g.label} <span className="ml-auto normal-case tracking-normal">{list.length}</span>
                      </button>
                      {isOpen && (
                        <ul className="pb-2">
                          {list.map((t) => {
                            const n = noteFor(t.id, t.level);
                            return (
                              <li key={t.id} className="px-3">
                                <div className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${active?.topic_id === t.id ? "bg-primary/10" : "hover:bg-muted/60"}`}>
                                  <button className="flex-1 text-left truncate" onClick={() => n && setActive(n)}>
                                    {t.name}
                                    {t.syllabus_ref && <span className="ml-1.5 text-[10px] text-muted-foreground">{t.syllabus_ref}</span>}
                                  </button>
                                  {n ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success-foreground">Saved</span>
                                  ) : (
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" disabled={busyTopic === t.id} onClick={() => void makeNote(t)}>
                                      {busyTopic === t.id ? "…" : <><Sparkles className="size-3 mr-1" />Make</>}
                                    </Button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>

        {/* Reader */}
        <div className="rounded-xl border bg-card p-6 min-h-[24rem]">
          {!active ? (
            <div className="h-full grid place-items-center text-center text-sm text-muted-foreground py-16">
              <div>
                <BookMarked className="size-8 mx-auto mb-3 opacity-50" />
                Pick a chapter on the left, or hit <span className="font-medium text-foreground">Make</span> to generate mark-scheme-aligned notes.
              </div>
            </div>
          ) : (
            <article>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{active.title}</h2>
                  <div className="text-xs text-muted-foreground">Updated {new Date(active.updated_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-1">
                  <ReadAloud text={active.content} label="Listen" />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={convertingNote === active.id}
                    aria-label={`Turn ${active.title} into flashcards`}
                    onClick={() => void turnIntoFlashcards(active.id)}
                  >
                    <Layers className="size-4 mr-1.5" />
                    {convertingNote === active.id ? "Building…" : "Turn into flashcards"}
                  </Button>
                  {active.topic_id && (
                    <Link to="/topic/$topicId" params={{ topicId: active.topic_id }}>
                      <Button size="sm" variant="outline">Open topic</Button>
                    </Link>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => void remove(active.id)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
              <div className="prose-sm max-w-none"><Markdown>{active.content}</Markdown></div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
