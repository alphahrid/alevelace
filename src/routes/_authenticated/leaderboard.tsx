import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Flame, Clock, Target, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = { rank: number; label: string; username: string; value: number; is_me: boolean; user_id: string };
type Metric = "xp" | "streak" | "readiness";

const METRICS: Array<{ key: Metric; label: string; icon: typeof Flame; unit: string }> = [
  { key: "xp", label: "Weekly XP / Study Time", icon: Clock, unit: "min" },
  { key: "streak", label: "Longest Active Streak", icon: Flame, unit: "days" },
  { key: "readiness", label: "Highest A* Readiness", icon: Target, unit: "%" },
];

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — A-Level Ace" },
      { name: "description", content: "Global and friends leaderboards for weekly study time, longest revision streak and A* Readiness Index." },
      { property: "og:title", content: "A-Level Ace Leaderboard" },
      { property: "og:description", content: "Compete on weekly XP, streaks and A* readiness with fellow A-Level students." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [metric, setMetric] = useState<Metric>("xp");
  const [friends, setFriends] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase.rpc("leaderboard", { _metric: metric, _friends: friends }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.error(error);
      setRows(((data as Row[]) || []));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [metric, friends]);

  const unit = METRICS.find((m) => m.key === metric)!.unit;

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Trophy className="size-7 text-primary" /> Leaderboard</h1>
        <p className="text-muted-foreground mt-1">Where you stand against other A-Level Ace students.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
          {METRICS.map((m) => (
            <button key={m.key} onClick={() => setMetric(m.key)}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition inline-flex items-center gap-1.5",
                metric === m.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <m.icon className="size-3.5" /> {m.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border bg-muted/40 p-1">
          <button onClick={() => setFriends(false)}
            className={cn("rounded-md px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5", !friends ? "bg-background shadow-sm" : "text-muted-foreground")}>
            <Globe className="size-3.5" /> Global
          </button>
          <button onClick={() => setFriends(true)}
            className={cn("rounded-md px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5", friends ? "bg-background shadow-sm" : "text-muted-foreground")}>
            <Users className="size-3.5" /> Friends
          </button>
        </div>
      </div>

      <section className="rounded-2xl border bg-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {friends ? <>You aren't following anyone yet — find peers on the <Link to="/social" className="text-primary hover:underline">social feed</Link>.</> : "No ranked students yet. Study today to take the top spot."}
          </div>
        ) : (
          <ol className="divide-y">
            {rows.map((r) => (
              <li key={r.user_id} className={cn("flex items-center gap-3 px-4 py-3", r.is_me && "bg-primary/5")}>
                <div className={cn("size-8 rounded-full grid place-items-center text-xs font-bold",
                  r.rank === 1 ? "bg-warning/30 text-warning-foreground" :
                  r.rank === 2 ? "bg-muted text-foreground" :
                  r.rank === 3 ? "bg-warning/15 text-warning-foreground" : "bg-muted/60 text-muted-foreground")}>
                  {r.rank}
                </div>
                <div className="flex-1 min-w-0">
                  {r.username ? (
                    <Link to="/profile/$username" params={{ username: r.username }} className="font-medium truncate hover:text-primary">
                      {r.label}
                    </Link>
                  ) : (
                    <span className="font-medium truncate">{r.label}</span>
                  )}
                  {r.is_me && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary text-primary-foreground">You</span>}
                  {r.username && <div className="text-xs text-muted-foreground truncate">@{r.username}</div>}
                </div>
                <div className="text-sm font-bold tabular-nums">{Math.round(r.value)}<span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span></div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
