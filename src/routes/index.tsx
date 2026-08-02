import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, Sparkles, Brain, Layers, ClipboardCheck, MessageSquareText } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "A-Level Ace — Master every A-Level subject with AI" },
      { name: "description", content: "AI tutor, smart flashcards, exam-style quizzes and mock papers for Cambridge and Edexcel A-Levels." },
      { property: "og:title", content: "A-Level Ace" },
      { property: "og:description", content: "Master A-Levels with AI tutoring, flashcards and quizzes." },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://alevelace.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "A-Level subjects on A-Level Ace",
          itemListElement: [
            "Physics",
            "Chemistry",
            "Biology",
            "Business",
            "Computer Science",
            "Mathematics",
            "Further Mathematics",
          ].map((subject, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Course",
              name: `A-Level ${subject}`,
              description: `AI-guided AS and A2 ${subject} revision with notes, flashcards, quizzes and mock exams for CIE and Edexcel.`,
              educationalLevel: "A-Level (AS & A2)",
              provider: {
                "@type": "Organization",
                name: "A-Level Ace",
                url: "https://alevelace.lovable.app",
              },
            },
          })),
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <GraduationCap className="size-5" />
            </div>
            <span className="font-semibold tracking-tight">A-Level Ace</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/signup"><Button size="sm">Get started</Button></Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground mb-6">
          <Sparkles className="size-3" /> Cambridge · Edexcel · powered by AI
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl mx-auto">
          Master any A-Level subject — theory and maths.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          An AI tutor that explains anything, spaced-repetition flashcards that stick, and exam-style quizzes that mark your work. Built for Cambridge and Edexcel.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/signup"><Button size="lg">Start learning free</Button></Link>
          <Link to="/login"><Button size="lg" variant="outline">I have an account</Button></Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: MessageSquareText, title: "AI tutor chat", body: "Ask anything, get step-by-step worked solutions with proper maths notation." },
          { icon: Layers, title: "Spaced repetition", body: "Auto-generated flashcards reviewed at the perfect interval." },
          { icon: ClipboardCheck, title: "Exam-style quizzes", body: "MCQ and short-answer practice, marked with feedback." },
          { icon: Brain, title: "Mock papers", body: "Timed practice across a whole subject, with end-of-paper breakdown." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border bg-card p-5">
            <div className="size-9 rounded-md bg-primary/10 text-primary grid place-items-center mb-3">
              <f.icon className="size-5" />
            </div>
            <div className="font-semibold">{f.title}</div>
            <div className="text-sm text-muted-foreground mt-1">{f.body}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
