import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, UserPlus, UserCheck, Activity, Flame, Swords } from "lucide-react";
import { InstagramBanner } from "@/components/InstagramBanner";
import { CommunityCounter } from "@/components/CommunityCounter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SearchRow = { user_id: string; username: string; display_name: string; readiness: number; is_following: boolean };
type FeedRow = { username: string; label: string; kind: string; detail: string; at: string };

export const Route = createFileRoute("/_authenticated/social")({
  head: () => ({
    meta: [
      { title: "Social feed — A-Level Ace" },
      { name: "description", content: "Find A-Level peers, follow their revision progress and see when friends log study sessions or ace a quiz." },
      { property: "og:title", content: "A-Level Ace social feed" },
      { property: "og:description", content: "Follow study partners and keep each other accountable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SocialPage,
});

function SocialPage() {
  const [tab, setTab] = useState<"following" | "discover">("following");
  const [feed, setFeed] = useState<FeedRow[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("following_feed").then(({ data }) => {
      setFeed((data as FeedRow[]) || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (tab !== "discover") return;
    const id = setTimeout(() => {
      supabase.rpc("search_profiles", { _q: q }).then(({ data }) => setResults((data as SearchRow[]) || []));
    }, 250);
    return () => clearTimeout(id);
  }, [q, tab]);

  const toggleFollow = async (row: SearchRow) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (row.is_following) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", u.user.id).eq("following_id", row.user_id);
      if (error) return toast.error(error.message);
      toast.success(`Unfollowed @${row.username}`);
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: u.user.id, following_id: row.user_id });
      if (error) return toast.error(error.message);
      toast.success(`Following @${row.username}`);
    }
    setResults((rs) => rs.map((r) => (r.user_id === row.user_id ? { ...r, is_following: !r.is_following } : r)));
  };

  const challenge = async (row: SearchRow) => {
    const link = `${window.location.origin}/mock`;
    try {
      await navigator.clipboard.writeText(`I'm challenging you to a 1v1 A-Level Ace quiz! Beat my score: ${link}`);
      toast.success(`Challenge link copied — DM it to @${row.username}`, {
        description: "Both of you take the same subject mock, then compare scores on the leaderboard.",
      });
    } catch {
      toast.error("Couldn't copy the challenge link");
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Users className="size-7 text-primary" /> Study circle</h1>
        <p className="text-muted-foreground mt-1">Follow peers and watch their revision streaks in real time.</p>
        <div className="mt-4"><CommunityCounter /></div>
      </header>

      <div className="mb-6">
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search students by @username…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setTab("discover"); }}
          />
        </div>
      </div>

      <div className="inline-flex rounded-lg border bg-muted/40 p-1 mb-6">
        {(["following", "discover"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("rounded-md px-4 py-1.5 text-xs font-medium capitalize transition", tab === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "discover" ? (
        <section>
          {results.length === 0 ? (
            <div className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">No students found.</div>
          ) : (
            <ul className="rounded-xl border bg-card divide-y">
              {results.map((r) => (
                <li key={r.user_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center font-bold text-sm">
                    {(r.display_name || r.username || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to="/profile/$username" params={{ username: r.username }} className="font-medium hover:text-primary truncate block">
                      {r.display_name || r.username}
                    </Link>
                    <div className="text-xs text-muted-foreground">@{r.username} · {Math.round(r.readiness || 0)}% A* readiness</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant={r.is_following ? "outline" : "default"} onClick={() => void toggleFollow(r)}>
                      {r.is_following ? <><UserCheck className="size-4 mr-1" /> Following</> : <><UserPlus className="size-4 mr-1" /> Follow</>}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void challenge(r)}>
                      <Swords className="size-4 mr-1" /> Challenge
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section>
          {loading ? (
            <div className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : feed.length === 0 ? (
            <div className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">
              Nothing here yet — switch to <button className="text-primary hover:underline" onClick={() => setTab("discover")}>Discover</button> and follow some peers.
            </div>
          ) : (
            <ul className="rounded-xl border bg-card divide-y">
              {feed.map((f, i) => (
                <li key={`${f.username}-${f.at}-${i}`} className="flex items-start gap-3 px-4 py-3">
                  <div className="size-8 rounded-full bg-muted grid place-items-center shrink-0">
                    {f.kind === "quiz" ? <Activity className="size-4 text-primary" /> : <Flame className="size-4 text-warning-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <Link to="/profile/$username" params={{ username: f.username }} className="font-medium hover:text-primary">{f.label}</Link>
                      <span className="text-muted-foreground"> {f.detail}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(f.at).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="mt-8">
        <InstagramBanner />
      </div>
    </div>
  );
}
