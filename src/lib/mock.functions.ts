import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-3-flash-preview";

async function callAIJSON(messages: Array<{ role: string; content: string }>, tool: { name: string; description: string; parameters: unknown }) {
  const apiKey = process.env.LOVABLE_API_KEY!;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: [{ type: "function", function: tool }],
      tool_choice: { type: "function", function: { name: tool.name } },
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limited — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add funds in Workspace settings.");
    throw new Error(`AI error ${res.status}`);
  }
  const data = await res.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No structured output from AI");
  return JSON.parse(args);
}

export const generateMockExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subjectId: string; count?: number; board?: "cambridge" | "edexcel" | "both" }) =>
    z.object({
      subjectId: z.string().uuid(),
      count: z.number().min(5).max(25).default(12),
      board: z.enum(["cambridge", "edexcel", "both"]).default("both"),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: subject } = await supabase.from("subjects").select("name").eq("id", data.subjectId).single();
    const { data: topics } = await supabase.from("topics").select("id, name").eq("subject_id", data.subjectId).limit(20);
    if (!subject) throw new Error("Subject not found");
    const topicList = (topics || []).map((t: { name: string }) => t.name).join(", ") || "core syllabus";

    const result = await callAIJSON(
      [
        { role: "system", content: `You write realistic A-Level mock-exam questions in the style of **${data.board === "both" ? "Cambridge (CAIE) and Edexcel" : data.board === "cambridge" ? "Cambridge (CAIE)" : "Edexcel"}**, blending MCQ and short-answer items across the whole syllabus. Use authentic A-Level command words ("State", "Describe", "Explain", "Calculate", "Derive", "Evaluate"). For maths/sciences, ALL equations MUST use KaTeX ($...$ inline, $$...$$ display). Model answers and explanations MUST read like a board mark scheme (list mark points M1/A1/B1, units required, accept-list of equivalent answers).` },
        { role: "user", content: `Build a ${data.count}-question A-Level mock paper for the subject "${(subject as { name: string }).name}". Cover broadly: ${topicList}. Exam board flavour: ${data.board}. ~50% MCQ, ~50% short answer. For MCQ, the answer must exactly match one of the choices.` },
      ],
      {
        name: "create_mock",
        description: "A mock exam paper",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["mcq", "short"] },
                  prompt: { type: "string" },
                  choices: { type: "array", items: { type: "string" } },
                  answer: { type: "string" },
                  explanation: { type: "string" },
                  difficulty: { type: "integer", minimum: 1, maximum: 5 },
                  topic_hint: { type: "string" },
                },
                required: ["type", "prompt", "answer", "explanation"],
              },
            },
          },
          required: ["questions"],
        },
      }
    );

    const topicIds = (topics || []).map((t: { id: string }) => t.id);
    const fallbackTopicId = topicIds[0];
    if (!fallbackTopicId) throw new Error("No topics available for this subject");

    const rows = (result.questions as Array<{ type: "mcq" | "short"; prompt: string; choices?: string[]; answer: string; explanation: string; difficulty?: number }>)
      .map((q) => ({
        user_id: userId,
        topic_id: fallbackTopicId,
        board: data.board,
        type: q.type,
        prompt: q.prompt,
        choices: q.type === "mcq" ? (q.choices ?? null) : null,
        answer: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty ?? 3,
      }));

    const { data: inserted, error } = await supabase.from("quiz_questions").insert(rows).select("*");
    if (error) throw new Error(error.message);

    const { data: attempt, error: aErr } = await supabase.from("quiz_attempts").insert({
      user_id: userId,
      subject_id: data.subjectId,
      mode: "mock",
      score: 0,
      total: inserted?.length || 0,
    }).select("id").single();
    if (aErr) throw new Error(aErr.message);

    return { attemptId: (attempt as { id: string }).id, questions: inserted };
  });
