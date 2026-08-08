/**
 * Anki-compatible export helpers.
 *
 * Anki imports plain-text (TSV/CSV) files natively, including deck routing and
 * scheduling-friendly tags, so we generate a `.txt` (tab separated, Anki's own
 * recommended format) and a `.csv` fallback for spreadsheets. Both are pure
 * string builders so they can be unit tested.
 */

export type ExportCard = {
  front: string;
  back: string;
  deck?: string | null;
  tags?: string[];
  due_at?: string | null;
  interval_days?: number | null;
  ease?: number | null;
  reps?: number | null;
};

const ROOT_DECK = "A-Level Ace";

export function deckName(card: ExportCard) {
  const sub = (card.deck ?? "").trim();
  return sub ? `${ROOT_DECK}::${sub.replace(/::/g, "-")}` : ROOT_DECK;
}

/** Anki tags cannot contain spaces. */
export function normalizeTag(tag: string) {
  return tag.trim().replace(/\s+/g, "-").replace(/[",]/g, "");
}

function inlineHtml(value: string) {
  // Preserve line breaks inside a single TSV/CSV field.
  return value.replace(/\r?\n/g, "<br>").replace(/\t/g, " ").trim();
}

function csvField(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function cardTags(card: ExportCard) {
  const base = (card.tags ?? []).map(normalizeTag).filter(Boolean);
  const sched: string[] = [];
  if (typeof card.interval_days === "number") sched.push(`interval-${Math.max(0, Math.round(card.interval_days))}d`);
  if (typeof card.reps === "number") sched.push(`reps-${Math.max(0, Math.round(card.reps))}`);
  return [...base, ...sched].join(" ");
}

/** Anki's native tab-separated import format (with deck + tags columns). */
export function buildAnkiTsv(cards: ExportCard[]) {
  const header = [
    "#separator:tab",
    "#html:true",
    "#notetype:Basic",
    "#deck column:3",
    "#tags column:4",
  ];
  const rows = cards.map((c) =>
    [inlineHtml(c.front), inlineHtml(c.back), deckName(c), cardTags(c)].join("\t"),
  );
  return [...header, ...rows].join("\n") + "\n";
}

/** Spreadsheet-friendly CSV, including the spaced-repetition state. */
export function buildAnkiCsv(cards: ExportCard[]) {
  const header = ["Front", "Back", "Deck", "Tags", "Due", "IntervalDays", "Ease", "Reps"];
  const rows = cards.map((c) =>
    [
      inlineHtml(c.front),
      inlineHtml(c.back),
      deckName(c),
      cardTags(c),
      c.due_at ?? "",
      String(c.interval_days ?? 0),
      String(c.ease ?? 2.5),
      String(c.reps ?? 0),
    ]
      .map(csvField)
      .join(","),
  );
  return [header.map(csvField).join(","), ...rows].join("\n") + "\n";
}

export function exportFilename(format: "tsv" | "csv", now = new Date()) {
  const stamp = now.toISOString().slice(0, 10);
  return `alevel-ace-flashcards-${stamp}.${format === "tsv" ? "txt" : "csv"}`;
}

/** Browser download of a generated export. */
export function downloadExport(contents: string, filename: string) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
