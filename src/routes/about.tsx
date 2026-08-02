import { createFileRoute, Link } from "@tanstack/react-router";
import { AppFooter } from "@/components/AppFooter";
import { GraduationCap, Sparkles, Timer, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About A-Level Ace — AI revision for CIE & Edexcel" },
      { name: "description", content: "A-Level Ace is an AI revision platform for Cambridge and Edexcel A-Level students, founded by Tasfia Tahmid Hridita." },
      { property: "og:title", content: "About A-Level Ace" },
      { property: "og:description", content: "AI tutoring, spaced repetition, mock exams and study vaults for AS and A2 students." },
      { property: "og:url", content: "/about" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://alevelace.lovable.app/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <GraduationCap className="size-5" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">About A-Level Ace</h1>
        </div>

        <p className="text-muted-foreground">
          A-Level Ace is an AI-powered revision platform built specifically for Cambridge (CAIE) and Pearson Edexcel
          A-Level students. Everything — tutoring, marking, notes and mocks — is written against real board mark-scheme
          conventions, split cleanly into AS Level and A2 Level so you always revise the right syllabus.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          <Feature icon={Sparkles} title="Socratic AI tutor" body="Guides you step by step and shows exactly where marks are won and lost." />
          <Feature icon={Timer} title="Timed mock exams" body="Full papers, AI-marked, with predicted grades and printable PDFs." />
          <Feature icon={BookMarked} title="Study Vaults" body="ZNotes-style AS/A2 chapter notes with KaTeX formulae." />
        </div>

        <div className="mt-10">
          <Link to="/dashboard"><Button size="lg">Open the app</Button></Link>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

function Feature({ icon: Icon, title, body }: { icon: typeof Sparkles; title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <Icon className="size-5 text-primary mb-2" />
      <div className="font-semibold text-sm">{title}</div>
      <p className="text-xs text-muted-foreground mt-1">{body}</p>
    </div>
  );
}
