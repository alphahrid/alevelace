import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarClock, Pencil } from "lucide-react";
import { toast } from "sonner";

function daysBetween(target: string) {
  const t = new Date(`${target}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - now.getTime()) / 86_400_000);
}

function encouragement(days: number) {
  if (days < 0) return "Exams done — legend. Time to celebrate! 🎉";
  if (days === 0) return "It's today. Trust the reps you've put in — go get that A*! 🔥";
  if (days <= 7) return "Final week: past papers only, plus your weakest mark-scheme points. You're so close! 🔥";
  if (days <= 30) return "One month out — daily flashcards + one timed mock a week is the A* formula. 💪";
  if (days <= 90) return "Plenty of runway. Build notes now so revision later is pure recall. 📚";
  return "Early start = unfair advantage. Two topics a week and you'll cruise. 🚀";
}

export function ExamCountdown() {
  const [date, setDate] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("exam_date").eq("id", u.user.id).maybeSingle();
      const d = (data as { exam_date: string | null } | null)?.exam_date ?? null;
      setDate(d);
      setDraft(d ?? "");
      if (!d) setEditing(true);
    })();
  }, []);

  const save = async () => {
    if (!draft) return toast.error("Pick your exam date first.");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setSaving(false);
    const { error } = await supabase.from("profiles").update({ exam_date: draft }).eq("id", u.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setDate(draft);
    setEditing(false);
    toast.success("Exam countdown set");
  };

  const days = date ? daysBetween(date) : null;

  return (
    <section className="mb-8 rounded-2xl border-2 border-warning/30 bg-gradient-to-r from-warning/10 via-warning/5 to-transparent p-5">
      <div className="flex items-start gap-4">
        <div className="size-12 rounded-xl bg-warning/15 text-warning-foreground grid place-items-center shrink-0">
          <CalendarClock className="size-6" />
        </div>
        <div className="flex-1 min-w-0">
          {editing || days === null ? (
            <>
              <div className="font-semibold">Set your A-Level exam date</div>
              <div className="text-sm text-muted-foreground mb-3">We'll count down the days and keep you on pace.</div>
              <div className="flex flex-wrap items-center gap-2">
                <Input type="date" value={draft} onChange={(e) => setDraft(e.target.value)} className="w-44" />
                <Button size="sm" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Start countdown"}</Button>
                {date && <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(date); }}>Cancel</Button>}
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-bold">
                ⏳ {days < 0 ? "0" : days} day{Math.abs(days) === 1 ? "" : "s"} left until your A-Level Exams!
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">{encouragement(days)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Target: {new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </>
          )}
        </div>
        {!editing && days !== null && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil className="size-4" /></Button>
        )}
      </div>
    </section>
  );
}
