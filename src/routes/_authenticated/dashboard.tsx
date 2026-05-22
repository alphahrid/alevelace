import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Flame, BookOpen, ClipboardCheck, Layers, ArrowRight, Trophy, AlertTriangle, MessageSquareText, Sparkles, Timer } from "lucide-react";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

type Subject = { id: string; slug: string; name: string; color: string; description: string | null };
type Topic = { id: string; name: string; subject_id: string };
type Attempt = { id: string; topic_id: string | null; subject_id: string | null; score: number; total: number };
type Card = { id: string; topic_id: string; ease: number; reps: number };
type Session = { occurred_on: string; minutes: number };

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — A-Level Ace" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const uid = u.user.id;
      const { data: prof } = await supabase.from("profiles").select("display_name, selected_subjects").eq("id", uid).single();
      setName(prof?.display_name || "Student");
      const selected: string[] = prof?.selected_subjects || [];
      if (selected.length) {
        const [{ data: subs }, { data: tps }] = await Promise.all([
          supabase.from("subjects").select("*").in("id", selected),
          supabase.from("topics").select("id, name, subject_id").in("subject_id", selected),
        ]);
        setSubjects((subs as Subject[]) || []);
        setTopics((tps as Topic[]) || []);
      }
      const [{ data: at }, { data: cs }, { data: ss }, { count }] = await Promise.all([
        supabase.from("quiz_attempts").select("id, topic_id, subject_id, score, total").eq("user_id", uid).gt("total", 0).order("started_at", { ascending: false }).limit(200),
        supabase.from("flashcards").select("id, topic_id, ease, reps").eq("user_id", uid),
        supabase.from("study_sessions").select("occurred_on, minutes").eq("user_id", uid).order("occurred_on", { ascending: false }).limit(120),
        supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", uid).lte("due_at", new Date().toISOString()),
      ]);
      setAttempts((at as Attempt[]) || []);
      setCards((cs as Card[]) || []);
      setSessions((ss as Session[]) || []);
      setDueCount(count || 0);
    })();
  }, []);

  // Streak + minutes today
  const { streak, minutesToday } = useMemo(() => {
    const days = new Set<string>(sessions.map((s) => s.occurred_on));
    let s = 0;
    const cur = new Date();
    while (days.has(cur.toISOString().slice(0, 10))) { s++; cur.setDate(cur.getDate() - 1); }
    const today = new Date().toISOString().slice(0, 10);
    const m = sessions.filter((x) => x.occurred_on === today).reduce((a, b) => a + (b.minutes || 0), 0);
    return { streak: s, minutesToday: m };
  }, [sessions]);

  // Mastery per subject: 60% avg quiz pct + 40% normalized flashcard ease
  const subjectMastery = useMemo(() => {
    return subjects.map((sub) => {
      const subTopicIds = new Set(topics.filter((t) => t.subject_id === sub.id).map((t) => t.id));
      const subAttempts = attempts.filter((a) => a.subject_id === sub.id || (a.topic_id && subTopicIds.has(a.topic_id)));
      const quizPct = subAttempts.length
        ? subAttempts.reduce((acc, a) => acc + (a.total ? a.score / a.total : 0), 0) / subAttempts.length
        : 0;
      const subCards = cards.filter((c) => subTopicIds.has(c.topic_id));
      const reviewedCards = subCards.filter((c) => c.reps > 0);
      const easeAvg = reviewedCards.length
        ? reviewedCards.reduce((a, c) => a + c.ease, 0) / reviewedCards.length
        : 0;
      const easeNorm = easeAvg ? Math.min(1, Math.max(0, (easeAvg - 1.3) / 1.3)) : 0;
      const samples = subAttempts.length + reviewedCards.length;
      const mastery = samples === 0 ? 0 : Math.round((quizPct * 0.6 + easeNorm * 0.4) * 100);
      return { ...sub, mastery, samples };
    });
  }, [subjects, topics, attempts, cards]);

  // Weak topics: lowest pct topics with at least 1 attempt
  const weakTopics = useMemo(() => {
    const map = new Map<string, { total: number; score: number }>();
    attempts.forEach((a) => {
      if (!a.topic_id) return;
      const m = map.get(a.topic_id) || { total: 0, score: 0 };
      m.total += a.total; m.score += a.score;
      map.set(a.topic_id, m);
    });
    const list = Array.from(map.entries())
      .map(([topicId, v]) => {
        const t = topics.find((x) => x.id === topicId);
        const sub = t ? subjects.find((s) => s.id === t.subject_id) : null;
        const pct = v.total ? Math.round((v.score / v.total) * 100) : 0;
        return { topicId, name: t?.name || "Unknown", subject: sub?.name || "", color: sub?.color || "#888", pct, attempts: v.total };
      })
      .filter((x) => x.pct < 75)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5);
    return list;
  }, [attempts, topics, subjects]);

  // A* Readiness Index: avg of subject mastery weighted by sample count, floored at 0
  const readiness = useMemo(() => {
    if (subjectMastery.length === 0) return 0;
    const withData = subjectMastery.filter((s) => s.samples > 0);
    if (withData.length === 0) return 0;
    const totalSamples = withData.reduce((a, s) => a + s.samples, 0);
    return Math.round(withData.reduce((a, s) => a + s.mastery * s.samples, 0) / totalSamples);
  }, [subjectMastery]);

  const readinessLabel =
    readiness >= 85 ? { label: "A* ready", tone: "text-success-foreground" } :
    readiness >= 70 ? { label: "On track for A", tone: "text-primary" } :
    readiness >= 55 ? { label: "Solid B — push for A", tone: "text-warning-foreground" } :
    readiness >= 35 ? { label: "Foundations forming", tone: "text-warning-foreground" } :
    { label: "Just getting started", tone: "text-muted-foreground" };

  const radial = [{ name: "Readiness", value: readiness, fill: "var(--color-primary)" }];

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {name}</h1>
        <p className="text-muted-foreground mt-1">Pick up where you left off.</p>
      </header>

      <section className="grid sm:grid-cols-3 gap-4 mb-8">
        <Stat icon={Flame} label="Day streak" value={`${streak}`} tint="bg-warning/15 text-warning-foreground" />
        <Stat icon={Layers} label="Cards due today" value={`${dueCount}`} tint="bg-primary/10 text-primary" />
        <Stat icon={ClipboardCheck} label="Minutes today" value={`${minutesToday}`} tint="bg-success/15 text-success-foreground" />
      </section>

      {/* A* Progress Tracker */}
      <section className="grid lg:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border bg-card p-6 lg:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="size-4 text-primary" />
            <div className="text-sm font-semibold tracking-wide">A* Readiness Index</div>
          </div>
          <div className="text-xs text-muted-foreground mb-2">Blended from quiz scores and flashcard recall.</div>
          <div className="h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={radial} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "var(--color-muted)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
              <div>
                <div className="text-4xl font-bold tabular-nums">{readiness}%</div>
                <div className={`text-xs font-medium ${readinessLabel.tone}`}>{readinessLabel.label}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold tracking-wide">Mastery by subject</div>
              <div className="text-xs text-muted-foreground">Across {subjectMastery.length} subjects</div>
            </div>
            <Link to="/mock" className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Timer className="size-3" /> Run a mock</Link>
          </div>
          {subjectMastery.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectMastery} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fill: "var(--color-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-popover-foreground)" }} formatter={(v: number) => [`${v}%`, "Mastery"]} />
                  <Bar dataKey="mastery" radius={[6, 6, 6, 6]}>
                    {subjectMastery.map((s) => <Cell key={s.id} fill={s.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Weak topics */}
      <section className="rounded-2xl border bg-card p-6 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="size-4 text-warning-foreground" />
          <div className="text-sm font-semibold tracking-wide">Weak topics</div>
          <div className="text-xs text-muted-foreground">— start here to lift your A* index fastest</div>
        </div>
        {weakTopics.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No weak spots yet — try a quiz or mock to surface gaps.</div>
        ) : (
          <ul className="divide-y">
            {weakTopics.map((w) => (
              <li key={w.topicId} className="py-3 flex items-center gap-3">
                <div className="size-2 rounded-full" style={{ background: w.color }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{w.name}</div>
                  <div className="text-xs text-muted-foreground">{w.subject} · {w.attempts} attempts</div>
                </div>
                <div className="w-28 hidden sm:block"><Progress value={w.pct} /></div>
                <div className="w-12 text-right text-sm tabular-nums font-semibold">{w.pct}%</div>
                <div className="flex gap-1">
                  <Link to="/topic/$topicId/tutor" params={{ topicId: w.topicId }}>
                    <Button size="sm" variant="outline" className="gap-1"><MessageSquareText className="size-3.5" /><span className="hidden sm:inline">Tutor</span></Button>
                  </Link>
                  <Link to="/topic/$topicId/quiz" params={{ topicId: w.topicId }}>
                    <Button size="sm" className="gap-1"><Sparkles className="size-3.5" /><span className="hidden sm:inline">Practice</span></Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Subjects */}
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
            {subjectMastery.map((s) => (
              <Link key={s.id} to="/subjects/$slug" params={{ slug: s.slug }} className="rounded-xl border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition group">
                <div className="flex items-start justify-between">
                  <div className="size-10 rounded-md grid place-items-center font-bold" style={{ backgroundColor: s.color + "22", color: s.color }}>{s.name[0]}</div>
                  <div className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded bg-muted">{s.mastery}%</div>
                </div>
                <div className="font-semibold mt-3">{s.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</div>
                <Progress value={s.mastery} className="mt-3 h-1.5" />
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

function EmptyChart() {
  return (
    <div className="h-56 grid place-items-center text-sm text-muted-foreground">
      Take a quiz or review flashcards to start tracking mastery.
    </div>
  );
}
