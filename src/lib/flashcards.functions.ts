import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAIJSON } from "@/lib/mock.helpers";

const CardsTool = {
  name: "emit_flashcards",
  description: "Return active-recall flashcards extracted from the supplied study material.",
  parameters: {
    type: "object",
    properties: {
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            front: { type: "string", description: "A single active-recall question or cue." },
            back: { type: "string", description: "Mark-scheme-accurate answer. KaTeX with $...$ for maths." },
          },
          required: ["front", "back"],
          additionalProperties: false,
        },
      },
    },
    required: ["cards"],
    additionalProperties: false,
  },
};

const SYSTEM = `You convert A-Level study material into Anki-style active-recall flashcards.
Rules:
- One idea per card. Fronts are questions or cues, never "Notes on X".
- Backs use exam-board mark-scheme wording, tight and complete.
- All maths/science equations in KaTeX: inline $...$, display $$...$$. Never \\( \\).
- Prefer definitions, formulae, mechanisms, command-word structures and common exam traps.`;

type Card = { front: string; back: string };

async function persist(
  supabase: { from: (t: string) => any },
  userId: string,
  topicId: string,
  cards: Card[],
) {
  const clean = cards
    .filter((c) => c.front?.trim() && c.back?.trim())
    .slice(0, 40)
    .map((c) => ({ user_id: userId, topic_id: topicId, front: c.front.trim(), back: c.back.trim() }));
  if (clean.length === 0) throw new Error("No usable flashcards could be extracted.");
  const { error } = await supabase.from("flashcards").insert(clean);
  if (error) throw new Error(error.message);
  return { created: clean.length };
}

/** Convert an existing AI note into a flashcard deck for the note's topic. */
export const flashcardsFromNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { noteId: string }) => z.object({ noteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: note } = await supabase
      .from("notes")
      .select("id, title, content, topic_id")
      .eq("id", data.noteId)
      .eq("user_id", userId)
      .single();
    if (!note?.topic_id) throw new Error("This note is not linked to a syllabus topic.");

    const json = await callAIJSON(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Create 12–18 flashcards from these notes titled "${note.title}":\n\n${String(note.content).slice(0, 12000)}` },
      ],
      CardsTool,
    );
    return persist(supabase as never, userId, note.topic_id as string, (json.cards as Card[]) || []);
  });

/** Convert pasted/extracted document text (or an uploaded page image) into a deck. */
export const flashcardsFromDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topicId: string; text?: string; images?: string[]; sourceName?: string }) =>
    z
      .object({
        topicId: z.string().uuid(),
        text: z.string().max(40000).optional(),
        images: z.array(z.string().startsWith("data:")).max(6).optional(),
        sourceName: z.string().max(200).optional(),
      })
      .refine((v) => (v.text && v.text.trim().length > 40) || (v.images && v.images.length > 0), {
        message: "Upload a text/markdown file with real content, or page images of your notes.",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const userContent: unknown = data.images?.length
      ? [
          { type: "text", text: `Extract 12–20 flashcards from these pages of notes${data.sourceName ? ` (${data.sourceName})` : ""}.` },
          ...data.images.map((url) => ({ type: "image_url", image_url: { url } })),
        ]
      : `Create 12–20 flashcards from this study material${data.sourceName ? ` (${data.sourceName})` : ""}:\n\n${data.text!.slice(0, 20000)}`;

    const json = await callAIJSON(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent as string },
      ],
      CardsTool,
    );
    return persist(supabase as never, userId, data.topicId, (json.cards as Card[]) || []);
  });
