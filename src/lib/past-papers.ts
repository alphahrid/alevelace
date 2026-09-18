/**
 * Curated links to the official Cambridge (CAIE) and Pearson Edexcel past paper,
 * mark scheme and grade threshold pages for every subject on A-Level Ace.
 *
 * We never host exam papers ourselves — they are copyright of the boards — so every
 * entry points at the awarding body's own page, plus well-known free archives.
 */

export type BoardKey = "cambridge" | "edexcel";

export type ArchiveLink = { label: string; url: string };

export type BoardPapers = {
  board: BoardKey;
  boardLabel: string;
  /** Official syllabus / qualification code, e.g. 9702. */
  code: string;
  /** Official past papers + mark schemes page. */
  papersUrl: string;
  /** Official grade threshold / grade boundary page. */
  thresholdsUrl: string;
  /** Free mirrors that bundle papers and mark schemes by series. */
  archives: ArchiveLink[];
  note?: string;
};

export type SubjectPapers = {
  slug: string;
  name: string;
  boards: BoardPapers[];
};

const CIE_PAPERS = (slugCode: string) =>
  `https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-${slugCode}/past-papers/`;
const CIE_THRESHOLDS = (slugCode: string) =>
  `https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-${slugCode}/grade-threshold-tables/`;

const PEARSON_BOUNDARIES =
  "https://qualifications.pearson.com/en/support/support-topics/results-certification/grade-boundaries.html";

const cie = (slugCode: string, code: string, archives: ArchiveLink[], note?: string): BoardPapers => ({
  board: "cambridge",
  boardLabel: "Cambridge (CAIE)",
  code,
  papersUrl: CIE_PAPERS(slugCode),
  thresholdsUrl: CIE_THRESHOLDS(slugCode),
  archives,
  note,
});

const edexcel = (
  code: string,
  papersUrl: string,
  archives: ArchiveLink[],
  note?: string,
): BoardPapers => ({
  board: "edexcel",
  boardLabel: "Pearson Edexcel",
  code,
  papersUrl,
  thresholdsUrl: PEARSON_BOUNDARIES,
  archives,
  note,
});

const pmt = (path: string): ArchiveLink => ({
  label: "Physics & Maths Tutor archive",
  url: `https://www.physicsandmathstutor.com/past-papers/${path}/`,
});

const papaCambridge = (path: string): ArchiveLink => ({
  label: "PapaCambridge archive",
  url: `https://pastpapers.papacambridge.com/papers/caie/${path}`,
});

const PEARSON_SUBJECT = (file: string) =>
  `https://qualifications.pearson.com/en/qualifications/edexcel-a-levels/${file}.html`;

export const PAST_PAPERS: SubjectPapers[] = [
  {
    slug: "physics",
    name: "Physics",
    boards: [
      cie("physics-9702", "9702", [pmt("a-level-physics-cie"), papaCambridge("as-and-a-level-physics-9702")]),
      edexcel("9PH0", PEARSON_SUBJECT("physics-2015"), [pmt("a-level-physics")]),
    ],
  },
  {
    slug: "chemistry",
    name: "Chemistry",
    boards: [
      cie("chemistry-9701", "9701", [pmt("a-level-chemistry-cie"), papaCambridge("as-and-a-level-chemistry-9701")]),
      edexcel("9CH0", PEARSON_SUBJECT("chemistry-2015"), [pmt("a-level-chemistry")]),
    ],
  },
  {
    slug: "biology",
    name: "Biology",
    boards: [
      cie("biology-9700", "9700", [pmt("a-level-biology-cie"), papaCambridge("as-and-a-level-biology-9700")]),
      edexcel("9BI0", PEARSON_SUBJECT("biology-a-2015"), [pmt("a-level-biology")]),
    ],
  },
  {
    slug: "mathematics",
    name: "Mathematics",
    boards: [
      cie("mathematics-9709", "9709", [pmt("a-level-maths-cie"), papaCambridge("as-and-a-level-mathematics-9709")]),
      edexcel("9MA0", PEARSON_SUBJECT("mathematics-2017"), [pmt("a-level-maths-edexcel")]),
    ],
  },
  {
    slug: "further-mathematics",
    name: "Further Mathematics",
    boards: [
      cie("further-mathematics-9231", "9231", [papaCambridge("as-and-a-level-further-mathematics-9231")]),
      edexcel("9FM0", PEARSON_SUBJECT("mathematics-2017"), [pmt("a-level-maths-edexcel")]),
    ],
  },
  {
    slug: "computer-science",
    name: "Computer Science",
    boards: [
      cie("computer-science-9618", "9618", [papaCambridge("as-and-a-level-computer-science-9618")]),
      edexcel("9CP0", PEARSON_SUBJECT("computer-science-2015"), [pmt("a-level-computer-science")]),
    ],
  },
  {
    slug: "business",
    name: "Business",
    boards: [
      cie("business-9609", "9609", [papaCambridge("as-and-a-level-business-9609")]),
      edexcel("9BS0", PEARSON_SUBJECT("business-2015"), [pmt("a-level-business")]),
    ],
  },
  {
    slug: "economics",
    name: "Economics",
    boards: [
      cie("economics-9708", "9708", [papaCambridge("as-and-a-level-economics-9708")]),
      edexcel("9EC0", PEARSON_SUBJECT("economics-a-2015"), [pmt("a-level-economics")]),
    ],
  },
  {
    slug: "psychology",
    name: "Psychology",
    boards: [
      cie("psychology-9990", "9990", [papaCambridge("as-and-a-level-psychology-9990")]),
      edexcel("9PS0", PEARSON_SUBJECT("psychology-2015"), [pmt("a-level-psychology")]),
    ],
  },
  {
    slug: "law",
    name: "Law",
    boards: [
      cie("law-9084", "9084", [papaCambridge("as-and-a-level-law-9084")]),
      edexcel(
        "AQA 7162 / OCR H418",
        "https://www.aqa.org.uk/subjects/law/as-and-a-level/law-7162/assessment-resources",
        [{ label: "OCR Law past papers", url: "https://www.ocr.org.uk/qualifications/as-and-a-level/law-h015-h415-from-2017/assessment/" }],
        "Pearson Edexcel does not offer an A-Level in Law — practise with Cambridge 9084, AQA 7162 or OCR instead.",
      ),
    ],
  },
];

export function papersForSubject(slug: string): SubjectPapers | undefined {
  return PAST_PAPERS.find((p) => p.slug === slug);
}

/**
 * Indicative raw-mark percentages for each grade. Real thresholds are published
 * per series by the boards — always check the official threshold table.
 */
export const INDICATIVE_THRESHOLDS: { grade: string; pct: string; note: string }[] = [
  { grade: "A*", pct: "88%+", note: "A2 / full A-Level only" },
  { grade: "A", pct: "78–87%", note: "highest grade available on AS-only papers" },
  { grade: "B", pct: "68–77%", note: "" },
  { grade: "C", pct: "58–67%", note: "" },
  { grade: "D", pct: "48–57%", note: "" },
  { grade: "E", pct: "38–47%", note: "minimum pass" },
];
