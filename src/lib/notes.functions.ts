import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-3-flash-preview";

export const generateNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topicId: string; level: "as" | "a2" }) =>
    z.object({ topicId: z.string().uuid(), level: z.enum(["as", "a2"]) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: topic } = await supabase
      .from("topics")
      .select("id, name, subject_id, syllabus_ref, subjects(name)")
      .eq("id", data.topicId)
      .single();
    if (!topic) throw new Error("Topic not found");

    const t = topic as unknown as { id: string; name: string; subject_id: string; syllabus_ref: string | null; subjects: { name: string } | null };

    const { data: profile } = await supabase.from("profiles").select("exam_boards").eq("id", userId).single();
    const boards = (profile?.exam_boards as string[] | null) || ["both"];
    const boardLabel = boards.includes("both") || boards.length > 1
      ? "Cambridge (CAIE) and Edexcel"
      : boards[0] === "cambridge" ? "Cambridge (CAIE)" : "Edexcel";

    const levelLabel = data.level === "as" ? "AS Level" : "A2 Level";

    const apiKey = process.env.LOVABLE_API_KEY!;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You write ZNotes/Study-Vault style revision notes for **${boardLabel} ${levelLabel}** students.

Rules:
- Output **markdown only** (no preamble, no closing remarks).
- Structure: \`## Syllabus statement\`, \`## Core theory\`, \`## Key definitions\` (bold term — mark-scheme-accurate wording), \`## Key formulae\`, \`## Worked example\`, \`## Mark scheme traps\` (what loses marks and why), \`## A* checklist\`.
- Definitions MUST be phrased exactly the way a ${boardLabel} mark scheme would accept them.
- ALL mathematics/science equations MUST use KaTeX: inline \`$...$\`, display \`$$...$$\`. Never \\( \\) or \\[ \\].
- Use tight bullets, bold key terms, no fluff. Aim for a dense one-page revision sheet.`,
          },
          {
            role: "user",
            content: `Write ${levelLabel} revision notes for: ${t.subjects?.name ?? "A-Level"} — ${t.name}${t.syllabus_ref ? ` (syllabus ref ${t.syllabus_ref})` : ""}.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limited — try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add funds in Workspace settings.");
      throw new Error(`AI error ${res.status}`);
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "";
    if (!content.trim()) throw new Error("No note content returned");

    const title = `${t.name} — ${levelLabel}`;
    const { data: inserted, error } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        subject_id: t.subject_id,
        topic_id: t.id,
        level: data.level,
        title,
        content,
      })
      .select("id, title, content, level, topic_id, subject_id, updated_at")
      .single();
    if (error) throw new Error(error.message);

    return inserted;
  });
