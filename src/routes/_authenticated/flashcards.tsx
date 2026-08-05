import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import { ReadAloud } from "@/components/ReadAloud";
import { Layers, UploadCloud, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { scheduleNext, type Rating } from "@/lib/srs";
import { flashcardsFromDocument } from "@/lib/flashcards.functions";
import { cn } from "@/lib/utils";

type Card = {
  id: string; front: string; back: string; ease: number; interval_days: number;
  reps: number; lapses: number; topic_id: string; due_at: string;
};
type Topic = { id: string; name: string; subject_id: string };
type Subject = { id: string; name: string };

const RATINGS: Array<{ value: Rating; label: string; hint: string; className: string }> = [
  { value: "again", label: "Again", hint: "Reset — see it tomorrow", className: "bg-destructive/10 hover:bg-destructive/20 border-destructive/40" },
  { value: "hard", label: "Hard", hint: "Shorter interval", className: "bg-warning/10 hover:bg-warning/20 border-warning/40" },
  { value: "good", label: "Good", hint: "Normal interval", className: "bg-primary/10 hover:bg-primary/20 border-primary/40" },
  { value: "easy", label: "Easy", hint: "Longer interval", className: "bg-success/10 hover:bg-success/20 border-success/40" },
];

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards & spaced repetition — A-Level Ace" },
      { name: "description", content: "Anki-style A-Level flashcards with SM-2 spaced repetition. Import your own PDF or text notes and turn them into active-recall decks." },
      { property: "og:title", content: "Flashcards & spaced repetition — A-Level Ace" },
      { property: "og:description", content: "Anki-style A-Level flashcards with SM-2 spaced repetition and AI deck imports." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://alevelace.lovable.app/flashcards" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://alevelace.lovable.app/flashcards" }],
  }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const [queue, setQueue] = useState<Card[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [show, setShow] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [importTopic, setImportTopic] = useState("");
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importDoc = useServerFn(flashcardsFromDocument);

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: due }, { count }, { data: prof }] = await Promise.all([
      supabase.from("flashcards").select("*").eq("user_id", u.user.id).lte("due_at", new Date().toISOString()).order("due_at").limit(60),
      supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", u.user.id),
      supabase.from("profiles").select("selected_subjects").eq("id", u.user.id).single(),
    ]);
    setQueue((due as Card[]) || []);
    setTotalCards(count || 0);
    const ids = (prof?.selected_subjects as string[] | null) || [];
    if (ids.length) {
      const [{ data: subs }, { data: tps }] = await Promise.all([
        supabase.from("subjects").select("id, name").in("id", ids),
        supabase.from("topics").select("id, name, subject_id").in("subject_id", ids).order("position"),
      ]);
      setSubjects((subs as Subject[]) || []);
      setTopics((tps as Topic[]) || []);
      setImportTopic((prev) => prev || ((tps as Topic[] | null)?.[0]?.id ?? ""));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const current = queue[0];

  const rate = async (rating: Rating) => {
    if (!current) return;
    const next = scheduleNext(current, rating);
    setQueue((q) => q.slice(1));
    setShow(false);
    const { error } = await supabase
      .from("flashcards")
      .update({
        ease: next.ease, interval_days: next.interval_days, reps: next.reps,
        lapses: current.lapses + next.lapses, due_at: next.due_at, last_reviewed_at: next.last_reviewed_at,
      })
      .eq("id", current.id);
    if (error) toast.error("Could not save your review");
  };

  const groupedTopics = useMemo(() => {
    return subjects.map((s) => ({ subject: s, list: topics.filter((t) => t.subject_id === s.id) })).filter((g) => g.list.length > 0);
  }, [subjects, topics]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!importTopic) return toast.error("Pick a topic for the new deck first.");
    setImporting(true);
    try {
      const file = files[0];
      const isImageLike = file.type.startsWith("image/") || file.type === "application/pdf";
      let payload: { topicId: string; sourceName: string; text?: string; images?: string[] };
      if (isImageLike) {
        const dataUrl = await new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result));
          fr.onerror = () => rej(new Error("Could not read the file"));
          fr.readAsDataURL(file);
        });
        payload = { topicId: importTopic, sourceName: file.name, images: [dataUrl] };
      } else {
        const text = await file.text();
        payload = { topicId: importTopic, sourceName: file.name, text };
      }
      const r = await importDoc({ data: payload });
      toast.success(`${r.created} flashcards added from ${file.name}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Layers className="size-7 text-primary" /> Flashcards
        </h1>
        <p className="text-muted-foreground mt-1">
          SM-2 spaced repetition across every deck. {totalCards} cards total · {queue.length} due now.
        </p>
      </header>

      {current ? (
        <section aria-live="polite">
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide answer" : "Reveal answer"}
            className="w-full text-left rounded-2xl border bg-card p-6 min-h-56 transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{show ? "Answer" : "Question — tap to flip"}</div>
            <div className={cn("transition-opacity duration-200", show ? "opacity-100" : "opacity-100")}>
              <Markdown>{show ? current.back : current.front}</Markdown>
            </div>
          </button>

          <div className="mt-3 flex items-center gap-2">
            <ReadAloud text={show ? current.back : current.front} />
            <Button variant="ghost" size="sm" onClick={() => setShow((s) => !s)}>
              <RotateCcw className="size-4 mr-1.5" />Flip
            </Button>
          </div>

          {show && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => void rate(r.value)}
                  aria-label={`Rate this card ${r.label} — ${r.hint}`}
                  className={cn("rounded-lg border px-3 py-3 text-sm font-medium min-h-11 transition", r.className)}
                >
                  {r.label}
                  <span className="block text-[10px] font-normal text-muted-foreground">{r.hint}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border bg-card p-8 text-center">
          <Sparkles className="size-6 text-primary mx-auto mb-2" />
          <div className="font-semibold">Nothing due right now</div>
          <p className="text-sm text-muted-foreground mt-1">
            Import notes below, generate cards from a topic in <Link to="/subjects" className="text-primary hover:underline">Subjects</Link>,
            or turn an AI note into a deck from <Link to="/notes" className="text-primary hover:underline">Notes</Link>.
          </p>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-2">Import notes into a deck</h2>
        <p className="text-sm text-muted-foreground mb-3">Drop a PDF, image of handwritten notes, or a .txt / .md file. AI turns it into active-recall cards.</p>

        {groupedTopics.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            Pick your subjects in <Link to="/subjects" className="text-primary hover:underline">Subjects</Link> to start importing.
          </div>
        ) : (
          <>
            <label htmlFor="import-topic" className="text-xs uppercase tracking-wider text-muted-foreground">Deck topic</label>
            <select
              id="import-topic"
              value={importTopic}
              onChange={(e) => setImportTopic(e.target.value)}
              className="mt-1 mb-3 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {groupedTopics.map((g) => (
                <optgroup key={g.subject.id} label={g.subject.name}>
                  {g.list.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </optgroup>
              ))}
            </select>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
              className={cn(
                "rounded-xl border-2 border-dashed p-8 text-center transition",
                dragging ? "border-primary bg-primary/5" : "border-muted",
              )}
            >
              <UploadCloud className="size-6 mx-auto text-muted-foreground mb-2" />
              <div className="text-sm font-medium">{importing ? "Reading your notes…" : "Drag & drop a file here"}</div>
              <div className="text-xs text-muted-foreground mt-1">PDF, PNG/JPG, TXT or MD</div>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.pdf,image/*"
                className="sr-only"
                aria-label="Choose a notes file to convert into flashcards"
                onChange={(e) => void handleFiles(e.target.files)}
              />
              <Button className="mt-3" variant="outline" size="sm" disabled={importing} onClick={() => fileRef.current?.click()}>
                Choose file
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
