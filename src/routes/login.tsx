import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — A-Level Ace" },
      {
        name: "description",
        content:
          "Sign in to A-Level Ace to continue your CIE or Edexcel revision: AI tutoring, flashcard reviews, quizzes and timed mock exams.",
      },
      { property: "og:title", content: "Sign in — A-Level Ace" },
      {
        property: "og:description",
        content: "Log back in to your A-Level Ace revision dashboard and keep your streak alive.",
      },
      { property: "og:url", content: "/login" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://alevelace.lovable.app/login" }],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  };

  const onGoogle = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) { setBusy(false); return toast.error("Google sign-in failed"); }
    if (res.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="size-12 mx-auto rounded-xl bg-primary text-primary-foreground grid place-items-center mb-3">
            <GraduationCap className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to keep mastering your A-Levels.</p>
        </div>
        <Button variant="outline" className="w-full" onClick={onGoogle} disabled={busy}>
          Continue with Google
        </Button>
        <div className="relative text-center text-xs text-muted-foreground">
          <span className="bg-background px-2 relative z-10">or with email</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        </div>
        <form onSubmit={onEmail} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>Sign in</Button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          New here? <Link to="/signup" className="text-primary hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
