import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CommunityCounter } from "@/components/CommunityCounter";
import { ExamCountdown } from "@/components/ExamCountdown";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Flame, BookOpen, ClipboardCheck, Layers, ArrowRight, Trophy, AlertTriangle, MessageSquareText, Sparkles, Timer, Bell, FileText, Plus } from "lucide-react";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { toast } from "sonner";

type Subject = { id: string; slug: string; name: string; color: string; description: string | null };
type Topic = { id: string; name: string; subject_id: string };
type Attempt = { id: string; topic_id: string | null; subject_id: string | null; score: number; total: number };
type Card = { id: string; topic_id: string; ease: number; reps: number };
type Session = { occurred_on: string; minutes: number };
type PastPaper = { id: string; subject_id: string; paper_label: string; score: number; total: number; grade: string | null; taken_on: string };

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
  const [pastPapers, setPastPapers] = useState<PastPaper[]>([]);
  const [ppForm, setPpForm] = useState({ subjectId: "", paper_label: "", score: "", total: "", grade: "" });
  const [savingPp, setSavingPp] = useState(false);

  const load = async () => {
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
    const [{ data: at }, { data: cs }, { data: ss }, { count }, { data: pp }] = await Promise.all([
      supabase.from("quiz_attempts").select("id, topic_id, subject_id, score, total").eq("user_id", uid).gt("total", 0).order("started_at", { ascending: false }).limit(200),
      supabase.from("flashcards").select("id, topic_id, ease, reps").eq("user_id", uid),
      supabase.from("study_sessions").select("occurred_on, minutes").eq("user_id", uid).order("occurred_on", { ascending: false }).limit(120),
      supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", uid).lte("due_at", new Date().toISOString()),
      supabase.from("past_paper_scores").select("id, subject_id, paper_label, score, total, grade, taken_on").eq("user_id", uid).order("taken_on", { ascending: false }).limit(20),
    ]);
    setAttempts((at as Attempt[]) || []);
    setCards((cs as Card[]) || []);
    setSessions((ss as Session[]) || []);
    setDueCount(count || 0);
    setPastPapers((pp as PastPaper[]) || []);
  };

  useEffect(() => {
    load();
    let uid: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      uid = u.user.id;
      channel = supabase
        .channel(`dashboard:${uid}:${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "flashcards", filter: `user_id=eq.${uid}` }, () => load())
        .on("postgres_changes", { event: "*", schema: "public", table: "quiz_attempts", filter: `user_id=eq.${uid}` }, () => load())
        .on("postgres_changes", { event: "*", schema: "public", table: "study_sessions", filter: `user_id=eq.${uid}` }, () => load())
        .subscribe();
    })();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
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

  // Mastery per subject — weighted by evidence with Bayesian shrinkage.
  // Quiz: weight = total marks. Card: per-card score from SM-2 ease + reps,
  // weight = min(reps, 5). Final = 60% quiz + 40% cards if both exist,
  // otherwise whichever side has data. Shrinkage pulls low-evidence subjects
  // toward 0 so a single lucky quiz can't show "100% A* ready".
  const subjectMastery = useMemo(() => {
    const SHRINK = 8;
    return subjects.map((sub) => {
      const subTopicIds = new Set(topics.filter((t) => t.subject_id === sub.id).map((t) => t.id));
      const subAttempts = attempts.filter((a) => a.subject_id === sub.id || (a.topic_id && subTopicIds.has(a.topic_id)));
      const quizMarks = subAttempts.reduce((a, x) => a + x.total, 0);
      const quizScore = subAttempts.reduce((a, x) => a + x.score, 0);
      const quizPct = quizMarks ? quizScore / quizMarks : 0;

      const subCards = cards.filter((c) => subTopicIds.has(c.topic_id));
      const reviewed = subCards.filter((c) => c.reps > 0);
      let cardWeight = 0;
      let cardScoreSum = 0;
      for (const c of reviewed) {
        const easeNorm = Math.min(1, Math.max(0, (c.ease - 1.3) / 1.5));
        const repsFactor = Math.min(1, c.reps / 4);
        const cardScore = easeNorm * (0.6 + 0.4 * repsFactor);
        const w = Math.min(c.reps, 5);
        cardScoreSum += cardScore * w;
        cardWeight += w;
      }
      const cardPct = cardWeight ? cardScoreSum / cardWeight : 0;

      // Past papers — strongest signal (real exam conditions). Weight = total marks.
      const subPapers = pastPapers.filter((p) => p.subject_id === sub.id);
      const ppMarks = subPapers.reduce((a, p) => a + p.total, 0);
      const ppScore = subPapers.reduce((a, p) => a + p.score, 0);
      const ppPct = ppMarks ? ppScore / ppMarks : 0;
      const ppWeight = ppMarks * 1.5; // past papers count 1.5x normal evidence

      const sources = [
        { pct: quizPct, w: quizMarks },
        { pct: cardPct, w: cardWeight },
        { pct: ppPct, w: ppWeight },
      ].filter((s) => s.w > 0);
      const totalW = sources.reduce((a, s) => a + s.w, 0);
      const raw = totalW ? sources.reduce((a, s) => a + s.pct * s.w, 0) / totalW : 0;

      const evidence = quizMarks + cardWeight + ppWeight;
      const shrunk = evidence === 0 ? 0 : (raw * evidence) / (evidence + SHRINK);
      const mastery = Math.round(shrunk * 100);
      return { ...sub, mastery, samples: evidence };
    });
  }, [subjects, topics, attempts, cards, pastPapers]);


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
        <div className="mt-4"><CommunityCounter /></div>
      </header>

      <section className="grid sm:grid-cols-3 gap-4 mb-6">
        <Stat icon={Flame} label="Day streak" value={`${streak}`} tint="bg-warning/15 text-warning-foreground" />
        <Stat icon={Layers} label="Cards due today" value={`${dueCount}`} tint="bg-primary/10 text-primary" />
        <Stat icon={ClipboardCheck} label="Minutes today" value={`${minutesToday}`} tint="bg-success/15 text-success-foreground" />
      </section>

      <ExamCountdown />



      {/* Spaced Repetition Smart Alert */}
      {dueCount > 0 && (
        <section className="mb-8 rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
            <Bell className="size-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{dueCount} flashcard{dueCount === 1 ? "" : "s"} due for review today</div>
            <div className="text-sm text-muted-foreground">Reviewing now keeps your SM-2 streak alive and locks in long-term recall.</div>
          </div>
          <Link to="/subjects"><Button size="sm" className="gap-1">Review now <ArrowRight className="size-4" /></Button></Link>
        </section>
      )}


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

      {/* Past Paper Active Recall */}
      <section className="rounded-2xl border bg-card p-6 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="size-4 text-primary" />
          <div className="text-sm font-semibold tracking-wide">Past Paper Active Recall</div>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Log real past-paper scores — they feed directly into your A* Readiness Index with extra weight.</p>

        <form
          className="grid sm:grid-cols-6 gap-2 mb-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!ppForm.subjectId || !ppForm.paper_label || !ppForm.score || !ppForm.total) { toast.error("Fill all required fields"); return; }
            const score = parseInt(ppForm.score, 10), total = parseInt(ppForm.total, 10);
            if (isNaN(score) || isNaN(total) || total <= 0 || score < 0 || score > total) { toast.error("Invalid score"); return; }
            setSavingPp(true);
            try {
              const { data: u } = await supabase.auth.getUser();
              if (!u.user) return;
              const { error } = await supabase.from("past_paper_scores").insert({
                user_id: u.user.id, subject_id: ppForm.subjectId, paper_label: ppForm.paper_label,
                score, total, grade: ppForm.grade || null,
              });
              if (error) throw new Error(error.message);
              toast.success("Past paper logged — A* index updated");
              setPpForm({ subjectId: "", paper_label: "", score: "", total: "", grade: "" });
              await load();
            } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
            finally { setSavingPp(false); }
          }}
        >
          <select className="sm:col-span-2 rounded-md border bg-background px-3 py-2 text-sm" value={ppForm.subjectId} onChange={(e) => setPpForm((f) => ({ ...f, subjectId: e.target.value }))}>
            <option value="">Subject…</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Input className="sm:col-span-2" placeholder="e.g. June 2025 Paper 1" value={ppForm.paper_label} onChange={(e) => setPpForm((f) => ({ ...f, paper_label: e.target.value }))} />
          <Input type="number" min={0} placeholder="Score" value={ppForm.score} onChange={(e) => setPpForm((f) => ({ ...f, score: e.target.value }))} />
          <div className="flex gap-2">
            <Input type="number" min={1} placeholder="Total" value={ppForm.total} onChange={(e) => setPpForm((f) => ({ ...f, total: e.target.value }))} />
          </div>
          <Input className="sm:col-span-2" placeholder="Grade (optional, e.g. A*)" value={ppForm.grade} onChange={(e) => setPpForm((f) => ({ ...f, grade: e.target.value }))} />
          <Button type="submit" disabled={savingPp} className="sm:col-span-4 gap-1"><Plus className="size-4" /> {savingPp ? "Saving…" : "Log paper"}</Button>
        </form>

        {pastPapers.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border-t">No papers logged yet.</div>
        ) : (
          <ul className="divide-y border-t">
            {pastPapers.slice(0, 5).map((p) => {
              const sub = subjects.find((s) => s.id === p.subject_id);
              const pct = Math.round((p.score / p.total) * 100);
              return (
                <li key={p.id} className="py-3 flex items-center gap-3 text-sm">
                  <div className="size-2 rounded-full" style={{ background: sub?.color || "#888" }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.paper_label}</div>
                    <div className="text-xs text-muted-foreground">{sub?.name || "—"} · {new Date(p.taken_on).toLocaleDateString()}</div>
                  </div>
                  {p.grade && <div className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">{p.grade}</div>}
                  <div className="text-right tabular-nums">
                    <div className="font-semibold">{p.score}/{p.total}</div>
                    <div className="text-xs text-muted-foreground">{pct}%</div>
                  </div>
                </li>
              );
            })}
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
