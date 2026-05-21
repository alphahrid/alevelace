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

export const generateFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topicId: string; count?: number }) =>
    z.object({ topicId: z.string().uuid(), count: z.number().min(3).max(20).default(10) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: topic } = await supabase.from("topics").select("name, subjects(name)").eq("id", data.topicId).single();
    if (!topic) throw new Error("Topic not found");
    const topicLabel = `${(topic as { subjects: { name: string } | null }).subjects?.name} — ${(topic as { name: string }).name}`;

    const result = await callAIJSON(
      [
        { role: "system", content: "You are an A-Level study coach. Generate concise, exam-relevant flashcards. For maths, use LaTeX with $...$ or $$...$$ delimiters. Keep fronts as crisp question/term, backs as 1-3 sentences." },
        { role: "user", content: `Make ${data.count} A-Level flashcards for the topic: ${topicLabel}. Cover key definitions, formulas, common pitfalls and exam-typical applications.` },
      ],
      {
        name: "create_flashcards",
        description: "Return a batch of flashcards",
        parameters: {
          type: "object",
          properties: {
            cards: {
              type: "array",
              items: {
                type: "object",
                properties: { front: { type: "string" }, back: { type: "string" } },
                required: ["front", "back"],
              },
            },
          },
          required: ["cards"],
        },
      }
    );

    const rows = (result.cards as Array<{ front: string; back: string }>).map((c) => ({
      user_id: userId,
      topic_id: data.topicId,
      front: c.front,
      back: c.back,
    }));
    const { error, data: inserted } = await supabase.from("flashcards").insert(rows).select("id");
    if (error) throw new Error(error.message);
    return { created: inserted?.length || 0 };
  });

export const generateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topicId: string; count?: number; board?: "cambridge" | "edexcel" | "both" }) =>
    z.object({
      topicId: z.string().uuid(),
      count: z.number().min(3).max(15).default(8),
      board: z.enum(["cambridge", "edexcel", "both"]).default("both"),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: topic } = await supabase.from("topics").select("name, subjects(name)").eq("id", data.topicId).single();
    if (!topic) throw new Error("Topic not found");
    const topicLabel = `${(topic as { subjects: { name: string } | null }).subjects?.name} — ${(topic as { name: string }).name}`;

    const result = await callAIJSON(
      [
        { role: "system", content: "You write A-Level exam-style questions. Mix MCQ (4 choices) with short-answer items. Use LaTeX for maths. Make answers and explanations precise." },
        { role: "user", content: `Generate ${data.count} A-Level practice questions for: ${topicLabel}. Exam board flavour: ${data.board}. Roughly 60% MCQ, 40% short answer. For MCQ, the answer must exactly match one of the choices.` },
      ],
      {
        name: "create_quiz",
        description: "Return practice questions",
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
                },
                required: ["type", "prompt", "answer", "explanation"],
              },
            },
          },
          required: ["questions"],
        },
      }
    );

    const rows = (result.questions as Array<{ type: "mcq" | "short"; prompt: string; choices?: string[]; answer: string; explanation: string; difficulty?: number }>)
      .map((q) => ({
        user_id: userId,
        topic_id: data.topicId,
        board: data.board,
        type: q.type,
        prompt: q.prompt,
        choices: q.type === "mcq" ? (q.choices ?? null) : null,
        answer: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty ?? 2,
      }));
    const { error, data: inserted } = await supabase.from("quiz_questions").insert(rows).select("*");
    if (error) throw new Error(error.message);
    return { created: inserted?.length || 0 };
  });

export const gradeShortAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { prompt: string; modelAnswer: string; userAnswer: string }) =>
    z.object({
      prompt: z.string().min(1).max(4000),
      modelAnswer: z.string().min(1).max(4000),
      userAnswer: z.string().min(0).max(8000),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const result = await callAIJSON(
      [
        { role: "system", content: "You are an A-Level examiner. Mark the candidate's answer against the model answer. Return a score 0-1, whether it is essentially correct, and concise constructive feedback (1-3 sentences)." },
        { role: "user", content: `Question:\n${data.prompt}\n\nModel answer:\n${data.modelAnswer}\n\nCandidate answer:\n${data.userAnswer || "(no answer given)"}` },
      ],
      {
        name: "grade",
        description: "Mark the answer",
        parameters: {
          type: "object",
          properties: {
            score: { type: "number", minimum: 0, maximum: 1 },
            correct: { type: "boolean" },
            feedback: { type: "string" },
          },
          required: ["score", "correct", "feedback"],
        },
      }
    );
    return result as { score: number; correct: boolean; feedback: string };
  });
