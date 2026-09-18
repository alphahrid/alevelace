import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { AppFooter } from "@/components/AppFooter";
import { Markdown } from "@/components/Markdown";
import { supabase } from "@/integrations/supabase/client";
import { Clock, ArrowLeft } from "lucide-react";

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  read_minutes: number;
  published_at: string;
  author_name: string;
};

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("blog_posts")
      .select("slug, title, excerpt, content, tags, read_minutes, published_at, author_name")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    if (!data) throw notFound();
    return { post: data as Post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Article unavailable | A-Level Ace" }, { name: "robots", content: "noindex" }] };
    }
    const { post } = loaderData;
    const url = `https://alevelace.lovable.app/blog/${post.slug}`;
    return {
      meta: [
        { title: `${post.title} | A-Level Ace` },
        { name: "description", content: post.excerpt },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.excerpt },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "article:author", content: post.author_name },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            datePublished: post.published_at,
            author: { "@type": "Person", name: post.author_name },
            publisher: { "@type": "Organization", name: "A-Level Ace", url: "https://alevelace.lovable.app" },
            mainEntityOfPage: url,
          }),
        },
      ],
    };
  },
  component: BlogPost,
});

function BlogPost() {
  const { post } = Route.useLoaderData();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-14 w-full">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="size-3.5" /> All articles
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mt-4">{post.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>By {post.author_name}</span>
          <span>{new Date(post.published_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
          <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {post.read_minutes} min read</span>
          {post.tags.map((t) => (
            <span key={t} className="rounded bg-muted px-1.5 py-0.5">{t}</span>
          ))}
        </div>
        <div className="mt-8">
          <Markdown>{post.content}</Markdown>
        </div>

        <div className="mt-12 rounded-xl border bg-card p-6">
          <div className="font-semibold">Put this into practice</div>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link to="/plan" className="text-primary hover:underline">Build your study plan</Link>
            <Link to="/mock" className="text-primary hover:underline">Sit a timed mock exam</Link>
            <Link to="/flashcards" className="text-primary hover:underline">Review your flashcards</Link>
            <Link to="/past-papers" className="text-primary hover:underline">Find past papers</Link>
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
