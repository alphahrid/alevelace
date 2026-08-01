export const MODEL = "google/gemini-3-flash-preview";

export type PaperType = "mcq" | "theory" | "practical";

export const PAPER_TYPES: Array<{ value: PaperType; label: string; hint: string }> = [
  { value: "mcq", label: "MCQ Paper", hint: "Paper 1 / Unit 1 — speed, trap options, elimination" },
  { value: "theory", label: "Theory Paper", hint: "Paper 2 / 4 — structured, mark-scheme keywords" },
  { value: "practical", label: "Practical Paper", hint: "Paper 3 / 5 — variables, errors, graphs, uncertainty" },
];

export function boardLabel(board: "cambridge" | "edexcel" | "both") {
  return board === "both"
    ? "Cambridge (CAIE) and Edexcel"
    : board === "cambridge"
      ? "Cambridge (CAIE)"
      : "Edexcel";
}

export function paperStyleBrief(paperType: PaperType) {
  switch (paperType) {
    case "mcq":
      return {
        label: "multiple-choice paper (Paper 1 / Unit 1 style)",
        mix: "100% MCQ with exactly 4 plausible choices; include at least one classic distractor per item; the answer must exactly match one of the choices",
        brief: "Every question is a 4-option MCQ. Distractors must encode the real misconceptions examiners target (unit slips, sign errors, reversed definitions). Explanations must show the fast elimination route.",
      };
    case "practical":
      return {
        label: "practical / alternative-to-practical paper (Paper 3 / 5 style)",
        mix: "~30% MCQ, ~70% short answer",
        brief: "Focus on experimental design: independent/dependent/control variables, apparatus choice and precision, sources of error, safety precautions, tabulating raw data, graph plotting rules (axes, units, best-fit, gradient/intercept meaning), absolute vs percentage uncertainty and error propagation.",
      };
    default:
      return {
        label: "structured theory paper (Paper 2 / 4 style)",
        mix: "~25% MCQ, ~75% structured short answer",
        brief: "Structured, multi-mark theory items. Mark schemes must list explicit mark points with command-word structure (State = recall only, Describe = what happens, Explain = because…, Evaluate = both sides + judgement).",
      };
  }
}

export async function callAIJSON(
  messages: Array<{ role: string; content: string }>,
  tool: { name: string; description: string; parameters: unknown },
) {
  const apiKey = process.env["LOVABLE_API_KEY"]!;
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
