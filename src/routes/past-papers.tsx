import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Gauge, Timer, Layers } from "lucide-react";
import { PAST_PAPERS, INDICATIVE_THRESHOLDS, type BoardKey } from "@/lib/past-papers";
import { cn } from "@/lib/utils";

const TITLE = "A-Level past papers, mark schemes & grade thresholds | A-Level Ace";
const DESCRIPTION =
  "Official Cambridge (CAIE) and Pearson Edexcel A-Level past papers, mark schemes and grade threshold tables for Physics, Chemistry, Biology, Maths, Further Maths, Computer Science, Business, Economics, Psychology and Law.";

export const Route = createFileRoute("/past-papers")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "A-Level past papers & mark schemes" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://alevelace.lovable.app/past-papers" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://alevelace.lovable.app/past-papers" }],
  }),
  component: PastPapersPage,
});

function PastPapersPage() {
  const [board, setBoard] = useState<BoardKey>("cambridge");

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1 max-w-5xl mx-auto px-6 py-14 w-full">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="size-8 text-primary" /> Past papers &amp; mark schemes
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Every link below goes straight to the awarding body's own past paper, mark scheme and grade threshold pages —
          Cambridge International and Pearson Edexcel — plus trusted free archives that group papers by series.
        </p>

        <div className="mt-6 inline-flex rounded-lg border p-1 bg-card">
          {(["cambridge", "edexcel"] as BoardKey[]).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBoard(b)}
              aria-pressed={board === b}
              className={cn(
                "px-4 py-1.5 text-sm rounded-md transition font-medium",
                board === b ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {b === "cambridge" ? "Cambridge (CAIE)" : "Pearson Edexcel"}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          {PAST_PAPERS.map((subject) => {
            const entry = subject.boards.find((x) => x.board === board);
            if (!entry) return null;
            return (
              <article key={subject.slug} className="rounded-xl border bg-card p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-semibold">{subject.name}</h2>
                  <span className="text-xs font-mono text-muted-foreground">{entry.code}</span>
                </div>
                {entry.note && <p className="text-xs text-muted-foreground mt-2">{entry.note}</p>}
                <div className="mt-3 space-y-1.5 text-sm">
                  <a href={entry.papersUrl} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1.5 text-primary hover:underline">
                    <ExternalLink className="size-3.5" /> Papers &amp; mark schemes ({entry.boardLabel})
                  </a>
                  <a href={entry.thresholdsUrl} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1.5 text-primary hover:underline">
                    <Gauge className="size-3.5" /> Grade thresholds
                  </a>
                  {entry.archives.map((a) => (
                    <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                      <ExternalLink className="size-3.5" /> {a.label}
                    </a>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/mock">
                    <Button size="sm" variant="outline"><Timer className="size-3.5 mr-1" /> Sit a timed mock</Button>
                  </Link>
                  <Link to="/flashcards">
                    <Button size="sm" variant="ghost"><Layers className="size-3.5 mr-1" /> Flashcards</Button>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">Indicative grade thresholds</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Boards publish real thresholds for every series — use the official tables above. These raw-mark percentages
            are the standard A-Level Ace uses to predict your grade after a marked mock.
          </p>
          <div className="mt-4 rounded-xl border bg-card divide-y">
            {INDICATIVE_THRESHOLDS.map((t) => (
              <div key={t.grade} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-semibold w-10">{t.grade}</span>
                <span className="font-mono">{t.pct}</span>
                <span className="text-xs text-muted-foreground flex-1 text-right">{t.note}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            A-Level Ace does not host exam papers. All papers and mark schemes remain the copyright of Cambridge
            Assessment International Education and Pearson Education Ltd.
          </p>
        </section>

        <div className="mt-10 rounded-xl border bg-card p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-semibold">Turn a past paper into a study plan</div>
            <p className="text-sm text-muted-foreground mt-1">Mark a paper, log the losses, and we build your next week around the gaps.</p>
          </div>
          <Link to="/plan"><Button>Open my study plan</Button></Link>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
