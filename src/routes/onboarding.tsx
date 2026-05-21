import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GraduationCap, Check } from "lucide-react";

type Subject = { id: string; name: string; slug: string; color: string; description: string | null };

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [boards, setBoards] = useState<Set<"cambridge" | "edexcel">>(new Set(["cambridge", "edexcel"]));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("subjects").select("*").order("name").then(({ data }) => setSubjects((data as Subject[]) || []));
  }, []);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleBoard = (b: "cambridge" | "edexcel") => {
    const next = new Set(boards);
    next.has(b) ? next.delete(b) : next.add(b);
    if (next.size === 0) return;
    setBoards(next);
  };

  const onSave = async () => {
    if (selected.size === 0) return toast.error("Pick at least one subject");
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const examBoards = boards.size === 2 ? ["both"] : Array.from(boards);
    const { error } = await supabase.from("profiles").update({
      selected_subjects: Array.from(selected),
      exam_boards: examBoards as ("cambridge" | "edexcel" | "both")[],
      onboarded: true,
    }).eq("id", u.user!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-10 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Set up your study plan</h1>
            <p className="text-sm text-muted-foreground">Pick your exam board(s) and subjects. You can change these later.</p>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-3">Exam boards</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["cambridge", "edexcel"] as const).map((b) => (
              <button
                key={b}
                onClick={() => toggleBoard(b)}
                className={`rounded-lg border p-4 text-left transition ${boards.has(b) ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{b}</span>
                  {boards.has(b) && <Check className="size-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{b === "cambridge" ? "CAIE / Cambridge International" : "Pearson Edexcel"}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-3">Your subjects</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map((s) => {
              const on = selected.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={`rounded-lg border p-4 text-left transition ${on ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.name}</span>
                    {on && <Check className="size-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={busy} size="lg">Save & continue</Button>
        </div>
      </div>
    </div>
  );
}
