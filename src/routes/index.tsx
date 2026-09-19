import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { AppFooter } from "@/components/AppFooter";
import { Sparkles, Brain, Layers, ClipboardCheck, MessageSquareText, CalendarCheck, Timer, FileText } from "lucide-react";

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
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground mb-6">
          <Sparkles className="size-3" /> Cambridge · Edexcel · powered by AI
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl mx-auto">
          Master any A-Level subject — theory and maths.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          An AI tutor that explains anything, spaced-repetition flashcards that stick, timed mock exams marked to real
          mark schemes, and every official CIE and Edexcel past paper one click away.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup"><Button size="lg">Start learning free</Button></Link>
          <Link to="/past-papers"><Button size="lg" variant="outline">Browse past papers</Button></Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          10 subjects · AS &amp; A2 · <Link to="/blog" className="underline underline-offset-2 hover:text-foreground">read the study guides</Link>
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <section className="max-w-6xl mx-auto px-6 pb-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HomeLink to="/plan" icon={CalendarCheck} title="Personalised study plan" body="A 7-day plan built from your marks, mocks and flashcard health." />
        <HomeLink to="/mock" icon={Timer} title="Timed mock exams" body="Build a paper by topic and question count, then get M1/A1/B1 marking." />
        <HomeLink to="/flashcards" icon={Layers} title="Flashcards" body="Spaced repetition that syncs across devices, exportable to Anki." />
        <HomeLink to="/past-papers" icon={FileText} title="Past papers" body="Official CIE and Edexcel papers, mark schemes and grade thresholds." />
      </section>

      <div className="mt-auto">
        <AppFooter />
      </div>
    </div>
  );
}

function HomeLink({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: "/plan" | "/mock" | "/flashcards" | "/past-papers";
  icon: typeof Sparkles;
  title: string;
  body: string;
}) {
  return (
    <Link to={to} className="rounded-xl border bg-card p-5 hover:border-primary/40 transition">
      <Icon className="size-5 text-primary mb-2" />
      <div className="font-semibold text-sm">{title}</div>
      <p className="text-xs text-muted-foreground mt-1">{body}</p>
    </Link>
  );
}
