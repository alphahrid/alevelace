import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/Markdown";
import { Send, Sparkles, Atom, Calculator, FlaskConical, BookOpen, Landmark, Dna } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  { icon: Calculator, label: "Maths", prompt: "Walk me through differentiating $y = x^2 \\sin(3x)$ using the product rule." },
  { icon: Atom, label: "Physics", prompt: "Explain simple harmonic motion and derive $T = 2\\pi\\sqrt{m/k}$." },
  { icon: FlaskConical, label: "Chemistry", prompt: "Explain Le Chatelier's principle with an equilibrium example." },
  { icon: Dna, label: "Biology", prompt: "Describe the process of DNA replication semi-conservatively." },
  { icon: Landmark, label: "Economics", prompt: "Evaluate the impact of a rise in interest rates on aggregate demand (PEEL)." },
  { icon: BookOpen, label: "English Lit", prompt: "How does Shakespeare use imagery of light and darkness in Macbeth?" },
];

export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({
    meta: [
      { title: "AI Tutor — A-Level Ace" },
      { name: "description", content: "Chat with an A-Level AI tutor across every subject. Socratic guidance, markdown and KaTeX math." },
    ],
  }),
  component: TutorPage,
});

function TutorPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: convs } = await supabase
        .from("tutor_conversations")
        .select("id")
        .eq("user_id", u.user.id)
        .is("topic_id", null)
        .order("updated_at", { ascending: false })
        .limit(1);
      let convId = convs?.[0]?.id;
      if (!convId) {
        const { data: created } = await supabase
          .from("tutor_conversations")
          .insert({ user_id: u.user.id, title: "General tutor" })
          .select("id")
          .single();
        convId = created?.id;
      }
      setConversationId(convId || null);
      if (convId) {
        const { data: msgs } = await supabase
          .from("tutor_messages")
          .select("role, content")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true });
        setMessages((((msgs as unknown) as Msg[]) || []).filter((m) => m.role === "user" || m.role === "assistant"));
      }
      inputRef.current?.focus();
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendText = async (text: string) => {
    if (!text.trim() || !conversationId || busy) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((p) => [...p, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ conversationId, userMessage: userMsg.content }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({ error: "Error" }));
        toast.error(j.error || "Tutor error");
        setMessages((p) => p.slice(0, -1));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") break;
          try {
            const parsed = JSON.parse(j);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setMessages((p) => {
                const copy = [...p];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("study_sessions").insert({
          user_id: u.user.id,
          activity: "tutor",
          minutes: 2,
        });
      }
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
      <header className="border-b px-4 sm:px-6 py-3 flex items-center gap-3">
        <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <Sparkles className="size-5" />
        </div>
        <div>
          <div className="font-semibold">AI Tutor</div>
          <div className="text-xs text-muted-foreground">Board-aware · Socratic · Markdown & KaTeX</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="py-8">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">What can I help you master today?</h1>
              <p className="text-muted-foreground mt-2 text-sm">Pick a starter, or type your own question. I'll guide you Socratically and mark your attempts like an examiner.</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-6">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => void sendText(s.prompt)}
                    className="text-left rounded-xl border bg-card p-4 hover:bg-accent/40 transition"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <s.icon className="size-4 text-primary" /> {s.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                  {m.role === "assistant" ? <Markdown>{m.content || "…"}</Markdown> : <div className="whitespace-pre-wrap">{m.content}</div>}
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t bg-card px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendText(input); }
            }}
            placeholder="Ask any A-Level question — maths, sciences, essays…"
            className="min-h-12 resize-none"
            rows={2}
          />
          <Button onClick={() => void sendText(input)} disabled={busy || !input.trim()} size="lg">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
