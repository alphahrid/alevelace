import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { signOut } from "@/lib/auth";

type Subject = { id: string; name: string; slug: string; color: string };

export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

function Settings() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [boards, setBoards] = useState<Set<"cambridge" | "edexcel">>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", u.user.id).single();
      const p = prof as { display_name: string | null; selected_subjects: string[]; exam_boards: string[] } | null;
      setName(p?.display_name || "");
      setSelected(new Set(p?.selected_subjects || []));
      const b = new Set<"cambridge" | "edexcel">();
      (p?.exam_boards || []).forEach((x) => {
        if (x === "both") { b.add("cambridge"); b.add("edexcel"); }
        else if (x === "cambridge" || x === "edexcel") b.add(x);
      });
      setBoards(b);
      const { data: subs } = await supabase.from("subjects").select("*").order("name");
      setSubjects((subs as Subject[]) || []);
    })();
  }, []);

  const save = async () => {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const examBoards = boards.size === 2 ? ["both"] : Array.from(boards);
    if (examBoards.length === 0) examBoards.push("both");
    const { error } = await supabase.from("profiles").update({
      display_name: name,
      selected_subjects: Array.from(selected),
      exam_boards: examBoards as ("cambridge" | "edexcel" | "both")[],
    }).eq("id", u.user!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-1">Settings</h1>
      <p className="text-muted-foreground mb-8">Update your profile, exam boards and subjects.</p>

      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-semibold mb-3">Profile</h2>
          <div className="space-y-1.5 max-w-sm">
            <Label htmlFor="n">Display name</Label>
            <Input id="n" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">Exam boards</h2>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            {(["cambridge", "edexcel"] as const).map((b) => (
              <button
                key={b}
                onClick={() => {
                  const n = new Set(boards);
                  n.has(b) ? n.delete(b) : n.add(b);
                  setBoards(n);
                }}
                className={`rounded-lg border p-3 text-left capitalize ${boards.has(b) ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
              >
                <div className="flex items-center justify-between font-medium">{b}{boards.has(b) && <Check className="size-4 text-primary" />}</div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">Subjects</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map((s) => {
              const on = selected.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    const n = new Set(selected);
                    n.has(s.id) ? n.delete(s.id) : n.add(s.id);
                    setSelected(n);
                  }}
                  className={`rounded-lg border p-3 text-left ${on ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                >
                  <div className="flex items-center justify-between font-medium">{s.name}{on && <Check className="size-4 text-primary" />}</div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>Sign out</Button>
          <Button onClick={save} disabled={busy}>Save changes</Button>
        </div>
      </div>
    </div>
  );
}
