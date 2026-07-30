import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Flame, Target, Clock, UserPlus, UserCheck, Award } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  readiness: number;
  streak: number;
  week_minutes: number;
  followers: number;
  following: number;
  is_following: boolean;
  is_me: boolean;
  joined: string;
};

export const Route = createFileRoute("/_authenticated/profile/$username")({
  component: ProfilePage,
});

function badges(p: Profile) {
  const out: Array<{ label: string; tone: string }> = [];
  if (p.streak >= 30) out.push({ label: "🔥 30-day streak", tone: "bg-warning/20 text-warning-foreground" });
  else if (p.streak >= 7) out.push({ label: "🔥 7-day streak", tone: "bg-warning/15 text-warning-foreground" });
  if (p.readiness >= 85) out.push({ label: "🏆 A* ready", tone: "bg-success/15 text-success-foreground" });
  else if (p.readiness >= 70) out.push({ label: "🎯 Grade A track", tone: "bg-primary/10 text-primary" });
  if (p.week_minutes >= 300) out.push({ label: "⏱ 5h+ this week", tone: "bg-primary/10 text-primary" });
  if (p.followers >= 5) out.push({ label: "🤝 Study mentor", tone: "bg-accent text-accent-foreground" });
  if (out.length === 0) out.push({ label: "🌱 Getting started", tone: "bg-muted text-muted-foreground" });
  return out;
}

function studyLevel(minutesish: number) {
  return Math.max(1, Math.floor(minutesish / 120) + 1);
}

function ProfilePage() {
  const { username } = Route.useParams();
  const [p, setP] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.rpc("public_profile", { _username: username });
    if (error) console.error(error);
    setP(((data as Profile[]) || [])[0] ?? null);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [username]);

  const toggleFollow = async () => {
    if (!p) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(false); return; }
    if (p.is_following) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", u.user.id).eq("following_id", p.user_id);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: u.user.id, following_id: p.user_id });
      if (error) toast.error(error.message);
    }
    await load();
    setBusy(false);
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading profile…</div>;
  if (!p) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold">Student not found</h1>
        <p className="text-muted-foreground mt-1">No public profile exists for @{username}.</p>
        <Link to="/social" className="inline-block mt-4"><Button variant="outline">Back to study circle</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <Link to="/social" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="size-4" /> Study circle</Link>

      <header className="mt-4 rounded-2xl border bg-card p-6 flex flex-wrap items-center gap-4">
        <div className="size-16 rounded-full bg-primary/10 text-primary grid place-items-center text-2xl font-bold">
          {(p.display_name || p.username)[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{p.display_name || p.username}</h1>
          <div className="text-sm text-muted-foreground">@{p.username} · Level {studyLevel(p.week_minutes + p.streak * 20)} · joined {new Date(p.joined).toLocaleDateString()}</div>
          {p.bio && <p className="text-sm mt-2">{p.bio}</p>}
          <div className="text-xs text-muted-foreground mt-2">{p.followers} followers · {p.following} following</div>
        </div>
        {!p.is_me && (
          <Button onClick={() => void toggleFollow()} disabled={busy} variant={p.is_following ? "outline" : "default"}>
            {p.is_following ? <><UserCheck className="size-4 mr-1" /> Following</> : <><UserPlus className="size-4 mr-1" /> Follow</>}
          </Button>
        )}
      </header>

      <section className="grid sm:grid-cols-3 gap-4 mt-6">
        <Stat icon={Flame} label="Study streak" value={`${p.streak} days`} tint="bg-warning/15 text-warning-foreground" />
        <Stat icon={Clock} label="Minutes this week" value={`${p.week_minutes}`} tint="bg-primary/10 text-primary" />
        <Stat icon={Target} label="A* Readiness" value={`${Math.round(p.readiness || 0)}%`} tint="bg-success/15 text-success-foreground" />
      </section>

      <section className="rounded-2xl border bg-card p-6 mt-6">
        <div className="text-sm font-semibold mb-2">A* Readiness Index</div>
        <Progress value={Math.round(p.readiness || 0)} />
      </section>

      <section className="rounded-2xl border bg-card p-6 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Award className="size-4 text-primary" />
          <div className="text-sm font-semibold">Recent badges</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {badges(p).map((b) => (
            <span key={b.label} className={`text-xs font-medium px-2.5 py-1 rounded-full ${b.tone}`}>{b.label}</span>
          ))}
        </div>
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
