// Client-side "Export as Printable Exam PDF" — opens a new window with
// A4-formatted HTML and calls print(). The user saves as PDF from the
// browser print dialog.

export type PrintQuestion = {
  index: number;
  type: "mcq" | "short";
  prompt: string;
  choices?: string[] | null;
  answer: string;
  explanation?: string;
  userAnswer?: string;
  correct?: boolean;
  score?: number;
  feedback?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Very small markdown-ish transformer for the print doc: preserve line breaks,
// bold **x**, and keep $...$ math as inline text (readable in print).
function md(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

export type ExamPdfOptions = {
  title: string;
  subject?: string;
  board?: string;
  questions: PrintQuestion[];
  includeMarkScheme?: boolean;
  score?: number | null;
  total?: number | null;
  grade?: string | null;
};

/** Pure builder — returns the print-ready A4 HTML document for a paper. */
export function buildExamHtml(opts: ExamPdfOptions): string {
  const { title, subject, board, questions, includeMarkScheme = true, score, total, grade } = opts;
  const now = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const html = `<!doctype html>
<html lang="en">

<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", Georgia, serif; font-size: 11pt; line-height: 1.45; color: #000; margin: 0; }
  .cover { text-align: center; padding: 40mm 10mm; page-break-after: always; }
  .cover .eyebrow { font-size: 10pt; letter-spacing: 3px; text-transform: uppercase; color: #555; }
  .cover h1 { font-size: 22pt; margin: 6mm 0 4mm; }
  .cover .meta { margin-top: 6mm; font-size: 11pt; }
  .cover .box { border: 1px solid #000; padding: 6mm; margin: 12mm auto 0; max-width: 120mm; text-align: left; font-size: 10pt; }
  .cover .box p { margin: 2mm 0; }
  h2.section { font-size: 13pt; border-bottom: 1px solid #000; padding-bottom: 2mm; margin-top: 8mm; }
  .q { margin: 6mm 0; page-break-inside: avoid; }
  .q .num { font-weight: bold; margin-right: 3mm; }
  .q .prompt { }
  .choices { margin: 2mm 0 0 8mm; }
  .choices .choice { margin: 1mm 0; }
  .lines { margin-top: 3mm; }
  .lines .line { border-bottom: 1px solid #999; height: 8mm; }
  .ms { page-break-before: always; }
  .ms .q { border-left: 3px solid #000; padding-left: 4mm; }
  .ms .ans { font-weight: bold; }
  .ms .expl { color: #333; margin-top: 1mm; font-size: 10pt; }
  .footer { position: fixed; bottom: 6mm; left: 0; right: 0; text-align: center; font-size: 8pt; color: #666; }
  .score { display: inline-block; border: 1px solid #000; padding: 2mm 4mm; margin-left: 3mm; font-weight: bold; }
</style>
</head>
<body>

<div class="cover">
  <div class="eyebrow">A-Level · ${escapeHtml(board || "Cambridge / Edexcel")}</div>
  <h1>${escapeHtml(title)}</h1>
  ${subject ? `<div class="meta">${escapeHtml(subject)}</div>` : ""}
  <div class="meta">${escapeHtml(now)}</div>
  ${typeof score === "number" && typeof total === "number"
    ? `<div class="meta" style="margin-top:8mm">Score <span class="score">${score} / ${total}</span>${grade ? ` &nbsp; Grade <span class="score">${escapeHtml(grade)}</span>` : ""}</div>`
    : ""}
  <div class="box">
    <p><strong>Candidate name:</strong> _______________________________</p>
    <p><strong>Centre number:</strong> _____________ &nbsp; <strong>Candidate number:</strong> _____________</p>
    <p><strong>Time allowed:</strong> ${Math.max(20, questions.length * 2)} minutes</p>
    <p><strong>Instructions:</strong> Answer <strong>all</strong> questions. Write your answers in the spaces provided. Show all working.</p>
  </div>
</div>

<h2 class="section">Question Paper</h2>

${questions.map((q) => `
  <div class="q">
    <div><span class="num">${q.index}.</span> <span class="prompt">${md(q.prompt)}</span></div>
    ${q.type === "mcq" && q.choices
      ? `<div class="choices">${q.choices.map((c, i) => `<div class="choice">${String.fromCharCode(65 + i)}. ${md(c)}</div>`).join("")}</div>
         <div style="margin-top:3mm">Answer: <strong>_____</strong></div>`
      : `<div class="lines">${Array.from({ length: 5 }).map(() => `<div class="line"></div>`).join("")}</div>`}
  </div>
`).join("")}

${includeMarkScheme ? `
<div class="ms">
  <h2 class="section">Mark Scheme</h2>
  <p style="font-size:10pt;color:#444">Model answers with accept-list and mark points. Award marks generously for equivalent working.</p>
  ${questions.map((q) => `
    <div class="q">
      <div><span class="num">${q.index}.</span> <span class="ans">${md(q.answer)}</span></div>
      ${q.explanation ? `<div class="expl">${md(q.explanation)}</div>` : ""}
      ${typeof q.correct === "boolean" && q.userAnswer !== undefined ? `
        <div class="expl">
          <strong>Candidate response:</strong> ${md(q.userAnswer || "(blank)")}<br/>
          <strong>Result:</strong> ${q.correct ? "✓ Correct" : `✗ ${typeof q.score === "number" ? Math.round(q.score * 100) + "%" : "Incorrect"}`}
          ${q.feedback ? `<br/><em>${md(q.feedback)}</em>` : ""}
        </div>` : ""}
    </div>
  `).join("")}
</div>` : ""}

<div class="footer">A-Level Ace · Generated ${escapeHtml(now)}</div>

<script>
  window.addEventListener("load", function () {
    setTimeout(function () { window.focus(); window.print(); }, 250);
  });
</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) {
    alert("Please allow pop-ups to export the printable paper.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
