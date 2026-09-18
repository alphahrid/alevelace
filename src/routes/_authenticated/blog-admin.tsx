import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Newspaper, Trash2, Eye, EyeOff } from "lucide-react";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  read_minutes: number;
  published: boolean;
};

export const Route = createFileRoute("/_authenticated/blog-admin")({
  head: () => ({
    meta: [
      { title: "Write a blog article | A-Level Ace" },
      { name: "description", content: "Admin editor for publishing A-Level Ace blog articles." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Blog editor — A-Level Ace" },
      { property: "og:description", content: "Write and publish study guides for A-Level Ace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BlogAdmin,
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);

function BlogAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [minutes, setMinutes] = useState("5");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setIsAdmin(false);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    const admin = !!roles?.some((r) => r.role === "admin");
    setIsAdmin(admin);
    if (!admin) return;
    const { data } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, content, tags, read_minutes, published")
      .order("published_at", { ascending: false });
    setPosts((data as Post[]) || []);
  };

  useEffect(() => { void load(); }, []);

  const publish = async () => {
    if (!title.trim() || !excerpt.trim() || !content.trim()) {
      return toast.error("Title, summary and article text are all required.");
    }
    setSaving(true);
    const { error } = await supabase.from("blog_posts").insert({
      slug: slugify(title),
      title: title.trim(),
      excerpt: excerpt.trim(),
      content,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      read_minutes: Number(minutes) || 5,
      published: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Article published");
    setTitle(""); setExcerpt(""); setContent(""); setTags(""); setMinutes("5");
    void load();
  };

  const toggle = async (p: Post) => {
    const { error } = await supabase.from("blog_posts").update({ published: !p.published }).eq("id", p.id);
    if (error) return toast.error(error.message);
    setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, published: !x.published } : x)));
  };

  const remove = async (p: Post) => {
    const { error } = await supabase.from("blog_posts").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    toast.success("Article deleted");
  };

  if (isAdmin === null) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold tracking-tight">Editor access only</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          This page is for A-Level Ace editors. You can read every published article on the{" "}
          <Link to="/blog" className="text-primary hover:underline">blog</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
        <Newspaper className="size-7 text-primary" /> Blog editor
      </h1>
      <p className="text-muted-foreground mt-1">Write in Markdown — headings, lists, bold and maths all render on the public blog.</p>

      <div className="mt-8 rounded-xl border bg-card p-6 space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="How to revise Chemistry organic mechanisms" />
          {title && <p className="text-xs text-muted-foreground mt-1">URL: /blog/{slugify(title)}</p>}
        </div>
        <div>
          <Label htmlFor="excerpt">Short summary (used in search results and social previews)</Label>
          <Input id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="chemistry, revision" />
          </div>
          <div>
            <Label htmlFor="minutes">Read time (minutes)</Label>
            <Input id="minutes" type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="content">Article (Markdown)</Label>
          <Textarea id="content" rows={14} value={content} onChange={(e) => setContent(e.target.value)} className="font-mono text-sm" />
        </div>
        <Button onClick={() => void publish()} disabled={saving}>{saving ? "Publishing…" : "Publish article"}</Button>
      </div>

      <h2 className="text-lg font-semibold mt-10 mb-3">All articles</h2>
      <div className="rounded-xl border bg-card divide-y">
        {posts.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="font-medium truncate">{p.title}</div>
              <div className="text-xs text-muted-foreground truncate">/blog/{p.slug} · {p.published ? "published" : "draft"}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => void toggle(p)} aria-label={p.published ? "Unpublish" : "Publish"}>
                {p.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void remove(p)} aria-label="Delete article">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
