import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Flame } from "lucide-react";

type Row = { rank: number; label: string; streak: number; is_me: boolean };

export function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("weekly_streak_leaderboard");
      if (!error) setRows((data as Row[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <section className="rounded-2xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="size-4 text-primary" />
        <div className="text-sm font-semibold tracking-wide">A* Challenger Leaderboard</div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Top revision streaks this week — anonymised. Study today to keep your streak alive.</p>

      {loading ? (
        <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">No active streaks yet. Study today to claim the top spot.</div>
      ) : (
        <ol className="divide-y">
          {rows.map((r) => (
            <li key={r.rank} className={`py-2.5 flex items-center gap-3 ${r.is_me ? "bg-primary/5 -mx-2 px-2 rounded-md" : ""}`}>
              <div className={`size-7 rounded-full grid place-items-center text-xs font-bold ${
                r.rank === 1 ? "bg-warning/30 text-warning-foreground" :
                r.rank === 2 ? "bg-muted text-foreground" :
                r.rank === 3 ? "bg-warning/15 text-warning-foreground" :
                "bg-muted/60 text-muted-foreground"
              }`}>{r.rank}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {r.label}
                  {r.is_me && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary text-primary-foreground">You</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold tabular-nums">
                <Flame className="size-3.5 text-warning-foreground" />
                {r.streak}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
