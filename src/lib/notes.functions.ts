import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-3-flash-preview";

/**
 * Per-subject A* note blueprints. Each returns the section structure plus the
 * evaluation framework that the official mark schemes reward top-band marks for.
 */
function blueprintFor(subjectName: string): string {
  const s = subjectName.toLowerCase();

  if (s.includes("econom")) {
    return `SUBJECT BLUEPRINT — ECONOMICS (A* target)
- State clearly whether the topic sits in **Microeconomics** or **Macroeconomics** and which paper it is assessed on (Paper 1-4 / Units 1-4).
- Sections: \`## Syllabus statement\`, \`## Definitions (mark-scheme wording)\`, \`## Diagram\`, \`## Analysis chain\`, \`## Evaluation (AJIM)\`, \`## Policy trade-offs\`, \`## Real-world example\`, \`## A* checklist\`.
- \`## Diagram\`: describe the diagram in words a student can redraw — exact **axis labels with units** (e.g. y-axis "Price (£)", x-axis "Quantity (units per period)"), every curve label (D₁, S₁, S₂, MC, MSC), original and new equilibria (P₁Q₁ → P₂Q₂), shaded welfare areas, and shift arrows. Warn that unlabelled axes/curves score zero.
- \`## Analysis chain\`: give explicit cause → effect → effect chains ("costs rise → S shifts left → P rises → Qd contracts").
- \`## Evaluation (AJIM)\`: use the AJIM structure — **A**nswer the question directly, **J**ustification with theory, **I**t depends on (elasticity, time period, magnitude, ceteris paribus), **M**ost important factor with a reasoned judgement. Evaluation must be woven per point, never bolted on at the end.
- Distinguish movement along a curve from a shift of a curve wherever relevant.`;
  }

  if (s.includes("law")) {
    return `SUBJECT BLUEPRINT — LAW (A* target)
- State whether the topic is **Substantive Law** (Criminal / Contract / Tort) or **Legal System & Concepts** (sources, courts, justice, morality).
- Sections: \`## Syllabus statement\`, \`## Key statutory provisions\`, \`## Legal tests (element by element)\`, \`## Leading cases\`, \`## Application method\`, \`## Evaluation & reform\`, \`## 20/30-mark essay plan\`, \`## A* checklist\`.
- \`## Key statutory provisions\`: cite the Act, year and section precisely (e.g. Theft Act 1968 s.1(1)).
- \`## Leading cases\`: give **case name (year)** followed by the ratio in one line — group by the element each case establishes. Never state a rule without its authority.
- \`## Legal tests\`: break each test into numbered elements (e.g. negligence: duty → breach → causation → remoteness → damage) with the authority beside each element.
- \`## Application method\`: IRAC/ILAC — Issue, Rule (with authority), Application to facts, Conclusion.
- \`## Evaluation & reform\`: balanced criticism, Law Commission proposals, competing policy arguments, and a reasoned conclusion — the structure top-band 20/30-mark essays require.`;
  }

  if (s.includes("psych")) {
    return `SUBJECT BLUEPRINT — PSYCHOLOGY (A* target)
- Anchor the topic to its **approach** (Biological, Cognitive, Social, Learning) and note the assessed skill (core study knowledge, application, or research methods).
- Sections: \`## Syllabus statement\`, \`## Key terms (mark-scheme wording)\`, \`## Approach & assumptions\`, \`## Core studies\`, \`## Research methods notes\`, \`## Evaluation (GRAVE)\`, \`## Application\`, \`## A* checklist\`.
- \`## Core studies\`: for each named study give researcher(s) and year, aim, method/design, sample, procedure in ordered steps, quantitative and qualitative results, and conclusion.
- \`## Research methods notes\`: independent/dependent variables, operationalisation, controls, design type, sampling technique, and the data type produced.
- \`## Evaluation (GRAVE)\`: cover every letter explicitly — **G**eneralisability (sample, culture, era), **R**eliability (standardisation, inter-rater, replicability), **A**pplication (real-world usefulness), **V**alidity (internal, ecological, demand characteristics), **E**thics (consent, deception, protection, right to withdraw). Each point must be a full PEEL-style argument, not a one-word label.`;
  }

  if (s.includes("business")) {
    return `SUBJECT BLUEPRINT — BUSINESS (A* target)
- Sections: \`## Syllabus statement\`, \`## Definitions (mark-scheme wording)\`, \`## Core theory & models\`, \`## Calculations\`, \`## Application to context\`, \`## Evaluation & judgement\`, \`## A* checklist\`.
- Every model (Ansoff, Porter, Maslow, break-even, ratios) must include what it is, how it is used, and its limitations.
- Show every formula in KaTeX with a worked numerical example and correct units (£, %, units per period).
- Evaluation must weigh short vs long run, stakeholder conflict, and cost vs benefit, ending in a justified judgement.`;
  }

  if (s.includes("computer")) {
    return `SUBJECT BLUEPRINT — COMPUTER SCIENCE (A* target)
- Sections: \`## Syllabus statement\`, \`## Definitions (mark-scheme wording)\`, \`## Core theory\`, \`## Worked example / trace table\`, \`## Pseudocode\`, \`## Mark scheme traps\`, \`## A* checklist\`.
- Give pseudocode in fenced code blocks using the board's own pseudocode conventions; include trace tables where algorithms are assessed.
- Show binary/hex/two's-complement conversions step by step.`;
  }

  // Sciences and mathematics
  return `SUBJECT BLUEPRINT — SCIENCE / MATHEMATICS (A* target)
- Sections: \`## Syllabus statement\`, \`## Core theory\`, \`## Key definitions\` (bold term — mark-scheme-accurate wording), \`## Key formulae\`, \`## Derivations\`, \`## Required practical / procedure\`, \`## Worked example\`, \`## Mark scheme traps\`, \`## A* checklist\`.
- \`## Derivations\`: show every algebraic step in order, stating each assumption; never jump from the starting equation to the result.
- \`## Required practical / procedure\`: apparatus, method in numbered steps, variables (independent, dependent, controlled), key measurements and precision, main sources of error, uncertainty treatment, safety precautions, and graph-plotting rules (what to plot to obtain a straight line, gradient and intercept meaning). For pure Mathematics, replace this section with \`## Method patterns\` listing the standard solution routes examiners expect.
- Annotate marks explicitly as **M1** (method), **A1** (accuracy, correct units and significant figures) and **B1** (standalone/definition) so the student knows where each mark is earned.`;
}

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
