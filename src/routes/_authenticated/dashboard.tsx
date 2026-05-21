import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Flame, BookOpen, ClipboardCheck, Layers, ArrowRight } from "lucide-react";

type Subject = { id: string; slug: string; name: string; color: string; description: string | null };

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — A-Level Ace" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: prof } = await supabase.from("profiles").select("display_name, selected_subjects").eq("id", u.user.id).single();
      setName(prof?.display_name || "Student");
      if (prof?.selected_subjects?.length) {
        const { data: subs } = await supabase.from("subjects").select("*").in("id", prof.selected_subjects);
        setSubjects((subs as Subject[]) || []);
      }
      const { count } = await supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", u.user.id).lte("due_at", new Date().toISOString());
      setDueCount(count || 0);

      const { data: sessions } = await supabase.from("study_sessions").select("occurred_on, minutes").eq("user_id", u.user.id).order("occurred_on", { ascending: false }).limit(60);
      const days = new Set<string>((sessions || []).map((s) => s.occurred_on));
      let s = 0;
      const cur = new Date();
      while (days.has(cur.toISOString().slice(0, 10))) { s++; cur.setDate(cur.getDate() - 1); }
      setStreak(s);
      const today = new Date().toISOString().slice(0, 10);
      setMinutes((sessions || []).filter((x) => x.occurred_on === today).reduce((a, b) => a + (b.minutes || 0), 0));
    })();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {name}</h1>
        <p className="text-muted-foreground mt-1">Pick up where you left off.</p>
      </header>

      <section className="grid sm:grid-cols-3 gap-4 mb-8">
        <Stat icon={Flame} label="Day streak" value={`${streak}`} tint="bg-warning/15 text-warning-foreground" />
        <Stat icon={Layers} label="Cards due today" value={`${dueCount}`} tint="bg-primary/10 text-primary" />
        <Stat icon={ClipboardCheck} label="Minutes today" value={`${minutes}`} tint="bg-success/15 text-success-foreground" />
      </section>

      <section className="mb-8">
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-lg font-semibold">Your subjects</h2>
          <Link to="/subjects" className="text-sm text-primary hover:underline">Browse all</Link>
        </div>
        {subjects.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <BookOpen className="size-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">No subjects selected yet.</p>
            <Link to="/subjects"><Button>Browse subjects</Button></Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((s) => (
              <Link
                key={s.id}
                to="/subjects/$slug"
                params={{ slug: s.slug }}
                className="rounded-xl border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition group"
              >
                <div className="size-10 rounded-md mb-3" style={{ backgroundColor: s.color + "22", color: s.color }}>
                  <div className="size-full grid place-items-center font-bold">{s.name[0]}</div>
                </div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</div>
                <div className="mt-3 text-sm text-primary opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                  Open <ArrowRight className="size-3" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tint }: { icon: typeof Flame; label: string; value: string; tint: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
      <div className={`size-10 rounded-md grid place-items-center ${tint}`}><Icon className="size-5" /></div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
