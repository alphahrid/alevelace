import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { AppFooter } from "@/components/AppFooter";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, Clock } from "lucide-react";

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  read_minutes: number;
  published_at: string;
  author_name: string;
};

const TITLE = "A-Level Ace blog — study tips, exam technique & revision guides";
const DESCRIPTION =
  "Practical A-Level revision guides: study techniques that work, how to use CIE and Edexcel past papers, mock exam strategy, spaced repetition and building a study plan.";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "A-Level Ace blog" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://alevelace.lovable.app/blog" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://alevelace.lovable.app/blog" }],
  }),
  loader: async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select("slug, title, excerpt, tags, read_minutes, published_at, author_name, og_image")
      .eq("published", true)
      .order("published_at", { ascending: false });
    return { posts: (data as Post[]) || [] };
  },
  component: BlogIndex,
});

function BlogIndex() {
  const { posts } = Route.useLoaderData();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-14 w-full">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
          <Newspaper className="size-8 text-primary" /> The A-Level Ace blog
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Revision technique, exam-board specifics and the study habits that separate a B script from an A* one.
        </p>

        <div className="mt-8 space-y-4">
          {posts.length === 0 && (
            <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
              No articles published yet — check back soon.
            </div>
          )}
          {posts.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="block rounded-xl border bg-card p-6 hover:border-primary/40 transition"
            >
              <h2 className="text-xl font-semibold tracking-tight">{p.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{p.excerpt}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {p.read_minutes} min read</span>
                <span>{new Date(p.published_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                {p.tags.map((t) => (
                  <span key={t} className="rounded bg-muted px-1.5 py-0.5">{t}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 grid sm:grid-cols-3 gap-3 text-sm">
          <Link to="/plan" className="rounded-xl border bg-card p-4 hover:border-primary/40 transition font-medium">Build a study plan →</Link>
          <Link to="/mock" className="rounded-xl border bg-card p-4 hover:border-primary/40 transition font-medium">Sit a timed mock →</Link>
          <Link to="/past-papers" className="rounded-xl border bg-card p-4 hover:border-primary/40 transition font-medium">Find past papers →</Link>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
