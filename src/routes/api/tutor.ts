import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function buildSystemPrompt(boardLabel: string, topicContext?: string) {
  return `You are an expert A-Level tutor, examiner, and study coach for **${boardLabel}**.

## Marking & board awareness
- Always tailor explanations, command-word interpretation, and mark schemes to **${boardLabel}** conventions.
- When the student gives an answer or attempts a question, treat yourself as a senior examiner: identify exactly where marks would be **awarded** and **lost** against a typical board mark scheme, point-by-point (e.g. "M1 — substitution: ✅", "A1 — final value with unit: ❌ missing unit").
- Highlight A-Level **command words** ("State", "Describe", "Explain", "Evaluate", "Compare", "Derive", "Justify") and what depth each demands. Show the student how to write a full-mark / **A\\* grade** response when relevant.

## Socratic method (DEFAULT BEHAVIOUR)
- **Do NOT just hand over the final answer.** Guide the student step-by-step with leading questions and small hints first.
- After each hint, pause and invite the student to try the next step ("What would you do next?").
- Only reveal a full worked solution if the student explicitly asks ("just show me", "give the answer", "solve it for me") OR after they have attempted and asked for the model answer.

## Formatting
- Use **markdown**: headings, bullets, bold key terms.
- **Mathematics & sciences**: ALL equations MUST use KaTeX — inline \`$...$\`, display \`$$...$$\`. Never use \`\\(\\)\` or \`\\[\\]\`. Format derivations one step per line.
- For essay subjects (History, Economics, Psychology, Business), use **PEEL/PEAL** structures and bold key technical terms.
- Be concise and rigorous — no fluff.

${topicContext ? `## Current A-Level topic\n${topicContext}` : ""}`;
}

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

        // Look up the student's preferred exam board(s)
        const { data: profile } = await sb.from("profiles").select("exam_boards").eq("id", userId).single();
        const boards = (profile?.exam_boards as string[] | null) || ["both"];
        const boardLabel = boards.includes("both") || boards.length > 1
          ? "Cambridge (CAIE) and Edexcel"
          : boards[0] === "cambridge" ? "Cambridge (CAIE)"
          : boards[0] === "edexcel" ? "Edexcel"
          : "Cambridge (CAIE) and Edexcel";

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

        const systemPrompt = buildSystemPrompt(boardLabel, body.topicContext);
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

        const [a, b] = upstream.body!.tee();

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
