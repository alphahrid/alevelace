import { createFileRoute, Link, useServerFn } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import { ArrowLeft, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { scheduleNext, type Rating } from "@/lib/srs";
import { generateFlashcards } from "@/lib/ai.functions";

type Card = { id: string; front: string; back: string; ease: number; interval_days: number; reps: number; lapses: number };

export const Route = createFileRoute("/_authenticated/topic/$topicId/cards")({
  component: Cards,
});

function Cards() {
  const { topicId } = Route.useParams();
  const [topicName, setTopicName] = useState("");
  const [queue, setQueue] = useState<Card[]>([]);
  const [allCount, setAllCount] = useState(0);
  const [show, setShow] = useState(false);
  const [generating, setGenerating] = useState(false);
  const gen = useServerFn(generateFlashcards);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: t } = await supabase.from("topics").select("name").eq("id", topicId).single();
    setTopicName((t as { name: string } | null)?.name || "");
    const { data: due } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", u.user.id)
      .eq("topic_id", topicId)
      .lte("due_at", new Date().toISOString())
      .order("due_at")
      .limit(50);
    setQueue((due as Card[]) || []);
    const { count } = await supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", u.user.id).eq("topic_id", topicId);
    setAllCount(count || 0);
    setShow(false);
  };

  useEffect(() => { load(); }, [topicId]);

  const rate = async (r: Rating) => {
    const card = queue[0];
    if (!card) return;
    const next = scheduleNext(card, r);
    await supabase.from("flashcards").update(next).eq("id", card.id);
    setQueue((q) => q.slice(1));
    setShow(false);
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("study_sessions").insert({ user_id: u.user.id, topic_id: topicId, activity: "cards", minutes: 1 });
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await gen({ data: { topicId, count: 10 } });
      toast.success(`Generated ${res.created} cards`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally { setGenerating(false); }
  };

  const current = queue[0];

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link to="/topic/$topicId" params={{ topicId }} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <div className="flex items-end justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flashcards · {topicName}</h1>
          <p className="text-sm text-muted-foreground">{allCount} cards total · {queue.length} due now</p>
        </div>
        <Button variant="outline" onClick={generate} disabled={generating}>
          <Sparkles className="size-4 mr-2" /> {generating ? "Generating…" : "Generate cards"}
        </Button>
      </div>

      {!current ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          {allCount === 0 ? (
            <>
              <p className="font-medium mb-2">No cards yet</p>
              <p className="text-sm text-muted-foreground mb-4">Generate a starter deck with AI.</p>
              <Button onClick={generate} disabled={generating}><Sparkles className="size-4 mr-2" /> Generate cards</Button>
            </>
          ) : (
            <>
              <p className="font-medium mb-1">All caught up</p>
              <p className="text-sm text-muted-foreground">No cards due right now. Come back tomorrow.</p>
            </>
          )}
        </div>
      ) : (
        <div>
          <div className="rounded-xl border bg-card p-6 min-h-[240px]">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Front</div>
            <Markdown>{current.front}</Markdown>
            {show && (
              <>
                <hr className="my-4" />
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Back</div>
                <Markdown>{current.back}</Markdown>
              </>
            )}
          </div>
          <div className="mt-4 flex justify-center">
            {!show ? (
              <Button size="lg" onClick={() => setShow(true)}><RotateCcw className="size-4 mr-2" /> Show answer</Button>
            ) : (
              <div className="grid grid-cols-4 gap-2 w-full">
                <Button variant="destructive" onClick={() => rate("again")}>Again</Button>
                <Button variant="outline" onClick={() => rate("hard")}>Hard</Button>
                <Button onClick={() => rate("good")}>Good</Button>
                <Button variant="secondary" onClick={() => rate("easy")}>Easy</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
