import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MODEL, callAIJSON, paperStyleBrief, boardLabel } from "@/lib/mock.helpers";

export const generateMockExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    subjectId: string;
    count?: number;
    board?: "cambridge" | "edexcel" | "both";
    paperType?: "mcq" | "theory" | "practical";
    topicIds?: string[];
    level?: "as" | "a2" | "full";
  }) =>
    z.object({
      subjectId: z.string().uuid(),
      count: z.number().min(5).max(25).default(12),
      board: z.enum(["cambridge", "edexcel", "both"]).default("both"),
      paperType: z.enum(["mcq", "theory", "practical"]).default("theory"),
      topicIds: z.array(z.string().uuid()).default([]),
      level: z.enum(["as", "a2", "full"]).default("full"),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: subject } = await supabase.from("subjects").select("name").eq("id", data.subjectId).single();
    if (!subject) throw new Error("Subject not found");

    let tq = supabase
      .from("topics")
      .select("id, name, syllabus_ref, level")
      .eq("subject_id", data.subjectId);
    if (data.topicIds.length) tq = tq.in("id", data.topicIds);
    else if (data.level !== "full") tq = tq.eq("level", data.level);
    const { data: topics } = await tq.order("position").limit(40);

    const { data: notes } = await supabase
      .from("notes")
      .select("title, content")
      .eq("user_id", userId)
      .eq("subject_id", data.subjectId)
      .order("updated_at", { ascending: false })
      .limit(4);
    const noteContext = (notes || [])
      .map((n: { title: string; content: string }) => `### ${n.title}\n${(n.content || "").slice(0, 1200)}`)
      .join("\n\n");

    const topicList = (topics || [])
      .map((t: { name: string; syllabus_ref: string | null; level: string }) => `${t.name} [${String(t.level).toUpperCase()}${t.syllabus_ref ? ` · ${t.syllabus_ref}` : ""}]`)
      .join("; ") || "core syllabus";

    const style = paperStyleBrief(data.paperType);

    const result = await callAIJSON(
      [
        {
          role: "system",
          content: `You write realistic A-Level mock-exam questions in the style of **${boardLabel(data.board)}**. Use authentic A-Level command words ("State", "Describe", "Explain", "Calculate", "Derive", "Evaluate"). For maths/sciences, ALL equations MUST use KaTeX ($...$ inline, $$...$$ display). Model answers and explanations MUST read like a board mark scheme (list mark points M1/A1/B1, units required, accept-list of equivalent answers).\n\nPAPER BRIEF: ${style.brief}`,
        },
        {
          role: "user",
          content: `Build a ${data.count}-question A-Level ${style.label} for the subject "${(subject as { name: string }).name}". Cover: ${topicList}. Exam board flavour: ${data.board}. Mix: ${style.mix}.${noteContext ? `\n\nThe student has revised from these AI notes — pull questions from this material where possible:\n${noteContext}` : ""}`,
        },
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
      .map((q, i) => ({
        user_id: userId,
        topic_id: topicIds[i % topicIds.length] ?? fallbackTopicId,
        board: data.board,
        type: data.paperType === "mcq" ? "mcq" as const : q.type,
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

/** Mark a photographed / scanned handwritten paper against the generated mark scheme. */
export const markUploadedPaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { images: string[]; markScheme: Array<{ index: number; prompt: string; answer: string }> }) =>
    z.object({
      images: z.array(z.string().startsWith("data:image/")).min(1).max(6),
      markScheme: z.array(z.object({
        index: z.number().int(),
        prompt: z.string().min(1).max(4000),
        answer: z.string().min(1).max(4000),
      })).min(1).max(30),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("exam_boards").eq("id", userId).single();
    const boards = (profile?.exam_boards as string[] | null) || ["both"];
    const label = boards.length === 1 && boards[0] !== "both"
      ? boardLabel(boards[0] as "cambridge" | "edexcel")
      : boardLabel("both");

    const scheme = data.markScheme
      .map((q) => `Q${q.index}. ${q.prompt}\nMARK SCHEME: ${q.answer}`)
      .join("\n\n");

    const apiKey = process.env["LOVABLE_API_KEY"]!;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: `You are a senior **${label}** A-Level examiner marking a scanned/photographed candidate script. Read the handwriting carefully. For each question, award marks point-by-point (M1/A1/B1), apply real past-paper mark schemes strictly (units, significant figures, command-word structure), and give concise constructive feedback. If a question cannot be found in the images, score 0 and say "not attempted / not legible". Use KaTeX for maths.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Mark this script against the following paper and mark scheme.\n\n${scheme}` },
              ...data.images.map((url) => ({ type: "image_url", image_url: { url } })),
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "mark_script",
            description: "Per-question marks for the uploaded script",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "integer" },
                      transcribed: { type: "string" },
                      score: { type: "number", minimum: 0, maximum: 1 },
                      correct: { type: "boolean" },
                      feedback: { type: "string" },
                    },
                    required: ["index", "score", "correct", "feedback"],
                  },
                },
                overall: { type: "string" },
              },
              required: ["results"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "mark_script" } },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limited — try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add funds in Workspace settings.");
      throw new Error(`AI error ${res.status}`);
    }
    const json = await res.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("Could not read the uploaded paper");
    return JSON.parse(args) as {
      results: Array<{ index: number; transcribed?: string; score: number; correct: boolean; feedback: string }>;
      overall?: string;
    };
  });
