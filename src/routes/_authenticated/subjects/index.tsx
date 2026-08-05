import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Subject = { id: string; slug: string; name: string; color: string; description: string | null };

export const Route = createFileRoute("/_authenticated/subjects")({
  head: () => ({
    meta: [
      { title: "Your subjects — A-Level Ace" },
      { name: "description", content: "Choose your A-Level subjects and jump straight into AI notes, topic quizzes and mock exams." },
      { property: "og:title", content: "Your A-Level subjects" },
      { property: "og:description", content: "Select subjects and open notes, quizzes and mocks in one tap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Subjects,
});

function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setUserId(u.user?.id ?? null);
      const [{ data: subs }, { data: prof }] = await Promise.all([
        supabase.from("subjects").select("*").order("name"),
        u.user ? supabase.from("profiles").select("selected_subjects").eq("id", u.user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setSubjects((subs as Subject[]) || []);
      setSelected(((prof as { selected_subjects: string[] } | null)?.selected_subjects) || []);
    })();
  }, []);

  const toggle = async (id: string) => {
    if (!userId) return;
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    setSelected(next);
    const { error } = await supabase.from("profiles").update({ selected_subjects: next }).eq("id", userId);
    if (error) {
      setSelected(selected);
      toast.error(error.message);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Your subjects</h1>
      <p className="text-muted-foreground mt-1 mb-8">
        Tap a card to add it to your study plan — selections are saved to your profile. Open a subject for its full syllabus tree, AI notes, quizzes and mocks.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s) => {
          const on = selected.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() => void toggle(s.id)}
              className={cn(
                "rounded-xl border bg-card p-5 text-left transition",
                on ? "border-primary ring-1 ring-primary/30 bg-primary/[0.03]" : "hover:border-primary/40"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="size-10 rounded-md mb-3 grid place-items-center font-bold" style={{ backgroundColor: s.color + "22", color: s.color }}>
                  {s.name[0]}
                </div>
                <span
                  className={cn(
                    "size-6 rounded-full grid place-items-center border text-xs",
                    on ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground"
                  )}
                >
                  {on && <Check className="size-4" />}
                </span>
              </div>
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</div>
              <div className={cn("text-[11px] font-medium mt-2", on ? "text-primary" : "text-muted-foreground")}>
                {on ? "Selected" : "Tap to select"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
