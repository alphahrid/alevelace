import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/Markdown";
import { Sparkles, Check, X, ArrowRight, Target } from "lucide-react";
import { toast } from "sonner";
import { gradeShortAnswer } from "@/lib/ai.functions";

type CommandWord = "State" | "Describe" | "Explain" | "Suggest" | "Evaluate";

type Drill = {
  command: CommandWord;
  prompt: string;
  modelAnswer: string;
  subject: string;
  structure: string;
};

const DRILLS: Drill[] = [
  {
    command: "State",
    subject: "Physics",
    prompt: "State Newton's second law of motion.",
    structure: "One concise sentence. No explanation, no derivation. Include the mathematical form if it's a named law.",
    modelAnswer: "The resultant force on an object is directly proportional to its rate of change of momentum, i.e. $F = \\frac{dp}{dt}$; for constant mass, $F = ma$.",
  },
  {
    command: "Describe",
    subject: "Biology",
    prompt: "Describe the process of active transport across a cell membrane.",
    structure: "Sequence of steps in order, no need to justify *why*. Use precise terminology (carrier protein, ATP hydrolysis, conformational change).",
    modelAnswer: "A specific carrier protein in the membrane binds the solute on one side. ATP is hydrolysed to ADP + Pi, causing the carrier protein to change shape (conformational change). The solute is released on the opposite side, against its concentration gradient. The carrier returns to its original shape and can bind another molecule.",
  },
  {
    command: "Explain",
    subject: "Chemistry",
    prompt: "Explain why the boiling point of HF is higher than that of HCl.",
    structure: "Point → *because* → link back to the question. Every claim needs a mechanism/reason; 'because' or 'therefore' phrases score the marks.",
    modelAnswer: "HF contains H bonded to a highly electronegative F atom, so HF molecules form **hydrogen bonds** between the δ+ H of one molecule and the lone pair of F on another. Hydrogen bonds are significantly stronger than the permanent dipole–dipole forces present between HCl molecules. Therefore more energy is needed to overcome the intermolecular forces in HF, giving it a higher boiling point.",
  },
  {
    command: "Suggest",
    subject: "Economics",
    prompt: "Suggest two reasons why a firm might choose to remain small despite economies of scale being available.",
    structure: "This is an APPLIED command — the answer isn't in your notes verbatim. Give two plausible, reasoned points. Each must include a *because*/*so that* link, not just a bullet.",
    modelAnswer: "1. The firm may operate in a **niche market** with limited demand, so expanding output would create excess supply and force prices down, reducing profitability. 2. The owner may value **personal control** and quality oversight; growing larger would require delegation and could lead to diseconomies of scale (communication/coordination failures) that outweigh cost savings.",
  },
  {
    command: "Evaluate",
    subject: "Economics",
    prompt: "Evaluate the extent to which a rise in the UK base interest rate will reduce inflation.",
    structure: "Present TWO sides, then judge. Structure: (1) point *for*, (2) counter-point / limitation, (3) 'It depends on...' factors, (4) **judgement** with reasoning. Never just list; weigh.",
    modelAnswer: "**For:** A higher base rate raises the cost of borrowing and rewards saving, reducing consumer C and investment I, so AD shifts left and demand-pull inflation eases.\n\n**Against:** If inflation is **cost-push** (e.g. imported energy prices), higher rates cannot reduce the underlying cost, and may worsen firm costs via higher loan repayments.\n\n**It depends on:** the time lag (~18 months) before monetary policy takes full effect; consumer confidence; the exchange-rate response (a stronger £ imports disinflation); household debt levels.\n\n**Judgement:** Effective for demand-pull inflation *in the long run*, but limited against supply-side shocks. Overall, likely to reduce inflation but at the cost of slower growth in the short run — a trade-off central to Bank of England decision-making.",
  },
];

export const Route = createFileRoute("/_authenticated/command-words")({
  head: () => ({
    meta: [
      { title: "Command Word Trainer — A-Level Ace" },
      { name: "description", content: "Drill CIE/Edexcel A-Level command words: State, Describe, Explain, Suggest, Evaluate. AI marks against the required structure." },
    ],
  }),
  component: CommandWordTrainer,
});

function CommandWordTrainer() {
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState<null | { correct: boolean; score: number; feedback: string }>(null);
  const [grading, setGrading] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const grade = useServerFn(gradeShortAnswer);

  const drill = DRILLS[idx];
  const total = DRILLS.length;
  const pct = useMemo(() => (attempted ? Math.round((correctCount / attempted) * 100) : 0), [attempted, correctCount]);

  useEffect(() => { setAnswer(""); setRevealed(null); }, [idx]);

  const submit = async () => {
    if (!answer.trim()) { toast.error("Write an answer first"); return; }
    setGrading(true);
    try {
      const structuredPrompt =
        `Command word: **${drill.command}**\n` +
        `Required structure per official mark scheme: ${drill.structure}\n\n` +
        `Question: ${drill.prompt}\n\n` +
        `IMPORTANT: Grade STRICTLY on whether the candidate followed the ${drill.command} structure. ` +
        `A technically correct answer written in the wrong command-word format should score at most 0.5.`;
      const r = await grade({ data: { prompt: structuredPrompt, modelAnswer: drill.modelAnswer, userAnswer: answer } });
      setRevealed(r);
      setAttempted((a) => a + 1);
      if (r.correct) setCorrectCount((c) => c + 1);
      // Log study minute
      const { data: u } = await supabase.auth.getUser();
      if (u.user) await supabase.from("study_sessions").insert({ user_id: u.user.id, activity: "command-words", minutes: 2 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Grading failed");
    } finally { setGrading(false); }
  };

  const next = () => setIdx((i) => (i + 1) % total);

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <Target className="size-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Command Word Trainer</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Drill the five decisive A-Level command words. The AI examiner marks strictly against the required structure.</p>
        <div className="mt-3 text-xs text-muted-foreground">
          Drill <span className="font-semibold text-foreground">{idx + 1} / {total}</span> · Session score <span className="font-semibold text-foreground">{correctCount}/{attempted}</span> ({pct}%)
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {DRILLS.map((d, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${
              i === idx ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >{d.command}</button>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="inline-flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Command</span>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{drill.command}</span>
          </div>
          <div className="text-xs text-muted-foreground">{drill.subject}</div>
        </div>
        <div className="text-lg font-medium"><Markdown>{drill.prompt}</Markdown></div>

        <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
          <div className="font-semibold text-primary mb-1">Required structure</div>
          <div className="text-foreground/80">{drill.structure}</div>
        </div>

        <Textarea
          className="mt-4"
          rows={7}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={`Write your ${drill.command.toLowerCase()} answer…`}
          disabled={!!revealed || grading}
        />

        {revealed && (
          <div className={`mt-4 rounded-md border p-3 ${revealed.correct ? "border-success bg-success/10" : "border-destructive bg-destructive/10"}`}>
            <div className="flex items-center gap-2 font-medium mb-1">
              {revealed.correct ? <Check className="size-4" /> : <X className="size-4" />}
              {revealed.correct ? "Meets the command word structure" : "Structure needs work"} · {Math.round(revealed.score * 100)}%
            </div>
            <div className="text-sm">{revealed.feedback}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mt-3 mb-1">A* model answer</div>
            <Markdown>{drill.modelAnswer}</Markdown>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          {!revealed ? (
            <Button onClick={submit} disabled={grading || !answer.trim()}>
              <Sparkles className="size-4 mr-2" /> {grading ? "Marking…" : "Submit for AI marking"}
            </Button>
          ) : (
            <Button onClick={next}>Next drill <ArrowRight className="size-4 ml-1" /></Button>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-5 text-xs text-muted-foreground">
        <div className="font-semibold text-foreground mb-2">Command-word cheat sheet</div>
        <ul className="space-y-1.5">
          <li><span className="font-semibold text-foreground">State:</span> One line, no explanation. Recall of a fact/law.</li>
          <li><span className="font-semibold text-foreground">Describe:</span> What happens, in sequence. No <em>why</em>.</li>
          <li><span className="font-semibold text-foreground">Explain:</span> Give reasons — every point needs "because"/"so that".</li>
          <li><span className="font-semibold text-foreground">Suggest:</span> Apply knowledge to an unfamiliar context; give plausible reasoned ideas.</li>
          <li><span className="font-semibold text-foreground">Evaluate:</span> Both sides + "it depends on…" + a reasoned judgement.</li>
        </ul>
      </div>
    </div>
  );
}
