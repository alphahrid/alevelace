import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Subject = { id: string; slug: string; name: string; color: string; description: string | null };

export const Route = createFileRoute("/_authenticated/subjects")({
  head: () => ({ meta: [{ title: "Subjects — A-Level Ace" }] }),
  component: Subjects,
});

function Subjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  useEffect(() => {
    supabase.from("subjects").select("*").order("name").then(({ data }) => setSubjects((data as Subject[]) || []));
  }, []);
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">All subjects</h1>
      <p className="text-muted-foreground mt-1 mb-8">Pick a subject to see its topic tree.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s) => (
          <Link key={s.id} to="/subjects/$slug" params={{ slug: s.slug }} className="rounded-xl border bg-card p-5 hover:border-primary/40 transition">
            <div className="size-10 rounded-md mb-3 grid place-items-center font-bold" style={{ backgroundColor: s.color + "22", color: s.color }}>{s.name[0]}</div>
            <div className="font-semibold">{s.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
