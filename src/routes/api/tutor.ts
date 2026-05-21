import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SYSTEM = `You are an expert A-Level tutor for Cambridge (CAIE) and Edexcel. Be concise, clear, and rigorous.
- Use markdown formatting (headings, bullet points, code blocks where appropriate).
- For mathematics, use LaTeX delimited by $...$ for inline and $$...$$ for display equations. NEVER use \\( \\) or \\[ \\].
- For derivations and worked solutions, show every step with a brief justification.
- Reference the relevant A-Level topic context the user provides. If unsure, say so and ask a clarifying question.
- For essays/theory subjects, give structured answers with key terms in bold.`;

export const Route = createFileRoute("/api/tutor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") || "";
        const token = authHeader.replace("Bearer ", "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const sb = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: userData, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        const body = (await request.json()) as { conversationId: string; topicContext?: string; userMessage: string };
        if (!body.conversationId || !body.userMessage) return new Response("Bad request", { status: 400 });

        // Load history
        const { data: history } = await sb
          .from("tutor_messages")
          .select("role, content")
          .eq("conversation_id", body.conversationId)
          .order("created_at", { ascending: true })
          .limit(40);

        // Persist user message
        await sb.from("tutor_messages").insert({
          conversation_id: body.conversationId,
          user_id: userId,
          role: "user",
          content: body.userMessage,
        });

        const systemPrompt = SYSTEM + (body.topicContext ? `\n\nCurrent A-Level topic: ${body.topicContext}` : "");
        const messages = [
          { role: "system", content: systemPrompt },
          ...(history || []).map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: body.userMessage },
        ];

        const apiKey = process.env.LOVABLE_API_KEY!;
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages, stream: true }),
        });

        if (!upstream.ok) {
          const status = upstream.status;
          if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { "Content-Type": "application/json" } });
          if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Workspace settings." }), { status: 402, headers: { "Content-Type": "application/json" } });
          const txt = await upstream.text();
          console.error("AI upstream error", status, txt);
          return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        // Tee the stream so we can persist while streaming to client
        const [a, b] = upstream.body!.tee();

        // Persist asynchronously
        (async () => {
          try {
            const reader = b.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            let assistant = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              let i;
              while ((i = buf.indexOf("\n")) !== -1) {
                let line = buf.slice(0, i);
                buf = buf.slice(i + 1);
                if (line.endsWith("\r")) line = line.slice(0, -1);
                if (!line.startsWith("data: ")) continue;
                const j = line.slice(6).trim();
                if (j === "[DONE]") break;
                try {
                  const parsed = JSON.parse(j);
                  const c = parsed.choices?.[0]?.delta?.content;
                  if (c) assistant += c;
                } catch {}
              }
            }
            if (assistant) {
              await sb.from("tutor_messages").insert({
                conversation_id: body.conversationId,
                user_id: userId,
                role: "assistant",
                content: assistant,
              });
              await sb.from("tutor_conversations").update({ updated_at: new Date().toISOString() }).eq("id", body.conversationId);
            }
          } catch (e) {
            console.error("persist error", e);
          }
        })();

        return new Response(a, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
