import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/Markdown";
import { Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };
type Topic = { id: string; name: string; syllabus_ref: string | null; subject_id: string };
type Subject = { id: string; name: string };

export const Route = createFileRoute("/_authenticated/topic/$topicId/tutor")({
  component: Tutor,
});

function Tutor() {
  const { topicId } = Route.useParams();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: t } = await supabase.from("topics").select("*").eq("id", topicId).single();
      setTopic(t as Topic);
      if (t) {
        const { data: s } = await supabase.from("subjects").select("id,name").eq("id", (t as Topic).subject_id).single();
        setSubject(s as Subject);
      }
      // Reuse most recent conv for topic, else create
      const { data: convs } = await supabase
        .from("tutor_conversations")
        .select("id")
        .eq("user_id", u.user.id)
        .eq("topic_id", topicId)
        .order("updated_at", { ascending: false })
        .limit(1);
      let convId = convs?.[0]?.id;
      if (!convId) {
        const { data: created } = await supabase
          .from("tutor_conversations")
          .insert({ user_id: u.user.id, topic_id: topicId, title: (t as Topic | null)?.name || "Tutor" })
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
        setMessages(((msgs as Msg[]) || []).filter((m) => m.role !== "system" as const));
      }
    })();
  }, [topicId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !conversationId || busy) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMessages((p) => [...p, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          conversationId,
          userMessage: userMsg.content,
          topicContext: subject && topic ? `${subject.name} — ${topic.name}` : undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({ error: "Error" }));
        toast.error(j.error || "Tutor error");
        setBusy(false);
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
      // Log study session minute
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("study_sessions").insert({
          user_id: u.user.id,
          topic_id: topicId,
          subject_id: topic?.subject_id ?? null,
          activity: "tutor",
          minutes: 2,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b px-6 py-3 flex items-center gap-3">
        <Link to="/topic/$topicId" params={{ topicId }} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="font-semibold">{topic?.name || "Tutor"}</div>
          <div className="text-xs text-muted-foreground">{subject?.name}</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <p className="font-medium text-foreground mb-2">Ask anything about {topic?.name}</p>
              <p className="text-sm">Worked solutions, conceptual questions, exam strategy — all on the table.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                {m.role === "assistant" ? <Markdown>{m.content || "…"}</Markdown> : <div className="whitespace-pre-wrap">{m.content}</div>}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t bg-card px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Ask a question, paste a problem, or request a worked example…"
            className="min-h-12 resize-none"
            rows={2}
          />
          <Button onClick={send} disabled={busy || !input.trim()} size="lg">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
