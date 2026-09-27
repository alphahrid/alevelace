-- 1. Tighten follows visibility
DROP POLICY IF EXISTS "follows readable to signed in" ON public.follows;
CREATE POLICY "own follow rows are readable" ON public.follows FOR SELECT TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- 2. New blog posts
INSERT INTO public.blog_posts (slug, title, excerpt, content, tags, read_minutes, og_image, published, published_at)
VALUES
(
  'cie-vs-edexcel-a-level-differences',
  'CIE vs Edexcel A-Level: the differences that actually cost you marks',
  'Paper structures, command words, mark-scheme style and maths formula booklets compared — and how to revise for the board you are actually sitting.',
  $md$Both Cambridge International (CAIE/CIE) and Pearson Edexcel award A-Levels that universities treat identically. The syllabus content overlaps heavily. What differs is **how you are asked** and **how you are marked** — and that is where students lose grades.

## 1. Paper architecture

- **CIE** typically splits a subject into 4–5 papers across AS and A2: a multiple-choice paper, structured-question papers, and a separate practical or data-analysis paper in the sciences.
- **Edexcel** uses 3 larger units for most linear A-Levels, each mixing short answers, extended responses and synoptic questions, with practical skills assessed *inside* the written papers rather than in a standalone practical exam.

**What this changes for you:** CIE rewards drilling question types separately (MCQ speed, structured recall, practical technique). Edexcel rewards stamina and synoptic linking across topics inside one long paper.

## 2. Command words

CIE publishes a tight command-word glossary and marks to it almost literally: *state* wants a single fact with no explanation, *explain* wants cause and consequence, *suggest* wants applied reasoning in an unfamiliar context, *compare* wants explicit linked comparisons ("whereas").

Edexcel leans more on *assess*, *evaluate*, *to what extent*, *justify* — levels-marked questions where the grade depends on the **quality of judgement**, not the number of points.

> Rule of thumb: CIE asks you to be precise. Edexcel asks you to be decisive.

## 3. Mark-scheme style

CIE mark schemes are point-based with M1/A1/B1 annotations in maths and physics: you get method, accuracy and independent marks, and a lost method mark can still let you keep accuracy marks with "error carried forward".

Edexcel uses levels of response for extended answers (Level 1–3 or 1–4 bands), where an answer with fewer facts but genuine evaluation outscores a list of facts.

## 4. Maths and formulae

- CIE Mathematics (9709) and Further Mathematics (9231) give a formula list but expect more derivation from first principles.
- Edexcel Maths (9MA0) provides a formula booklet with more standard results, and questions lean harder on modelling assumptions and contextual interpretation.

In both, **unlabelled working loses method marks**. Write the formula, substitute, then evaluate — three lines, three chances to be credited.

## 5. Sciences and practicals

CIE Paper 3/5 practical and planning papers test apparatus choice, variable control, uncertainty and graph-drawing conventions explicitly. Edexcel embeds those same skills as short questions inside the theory papers, plus a Core Practical list you are expected to know by name.

## 6. Essay subjects

In Economics, Business, Law and Psychology the evaluation framework matters more than the board:

- Use **AJIM** in Economics (Answer, Justification, It depends on, Most important factor).
- Use **IRAC** in Law (Issue, Rule with authority, Application, Conclusion).
- Use **GRAVE** in Psychology (Generalisability, Reliability, Application, Validity, Ethics).

Edexcel gives more credit for sustained judgement; CIE gives more credit for balanced, clearly signposted analysis chains.

## How to revise for *your* board

1. Set your board once in A-Level Ace — every note, quiz, mock and tutor answer then follows that board's conventions.
2. Practise the command words your board actually uses, not a generic list.
3. Do at least three past papers from your board before touching another board's papers; use the other board only for extra content practice, never for exam technique.
4. Mark your own answers against the real mark scheme, then let the AI marker show you where the M1/A1/B1 or level boundary sat.

Same content, different game. Learn the game you are sitting.$md$,
  ARRAY['exam boards','CIE','Edexcel','exam technique'],
  8,
  'https://alevelace.lovable.app/og/blog-boards.jpg',
  true,
  now()
),
(
  'as-to-a2-progression-guide',
  'From AS to A2: how to step up without losing your AS marks',
  'A2 is not "more AS". Here is what changes in depth, synoptic linking and grading — and a term-by-term plan for making the jump to A*.',
  $md$AS Level caps at grade A. A* only exists at the end of A2. That single fact reshapes how you should study in your second year.

## What actually changes

**1. Depth over coverage.** AS asks *what* and *how*. A2 asks *why*, *how much* and *what if*. A physics AS question wants the equation; the A2 version wants you to justify an assumption and discuss a limiting case.

**2. Synoptic questions.** A2 papers deliberately cross chapters — thermodynamics with kinetics, macro policy with micro market failure, tort with criminal liability. If you revise chapter-by-chapter and stop there, synoptic marks vanish.

**3. Grading weight.** Your final grade is the whole qualification. A weak AS is recoverable in a linear Edexcel A-Level, and with CIE you can resit AS components. But A2 papers usually carry the harder marks and the A* boundary, so A2 technique is where the grade is won.

**4. Longer extended responses.** 15-, 20- and 30-mark questions appear. Marks come from structure and judgement, not extra facts.

## The term-by-term plan

### Term 1 — rebuild the AS foundation fast
Spend the first four weeks re-testing AS content with flashcards and short quizzes, not re-reading it. Anything below 70% recall goes on a fix list. A2 content built on shaky AS content collapses under synoptic questions.

### Term 2 — learn A2 content in exam-answer form
For each new chapter write the answer you would give in the exam, not a summary: definition, mechanism, worked example, evaluation. Generate the chapter in your Study Vault, then immediately turn it into flashcards so recall builds while you learn.

### Term 3 — synoptic and timing
Move to full timed papers. Every paper you sit, log the marks per topic. Your weakest two topics get all your revision time for the following week. Practise the 20-mark questions under time pressure — most students can write a good essay, far fewer can write one in 25 minutes.

### Final 6 weeks — mark-scheme fluency
Mark everything against real mark schemes. Learn the phrases the examiner wants. In maths and sciences, learn where M1, A1 and B1 sit in the standard question shapes so you always show the creditable step.

## Habits that carry AS marks forward

- Keep AS flashcards in your review rotation all year — spaced repetition costs minutes a day and prevents the classic A2 collapse in AS-assessed content.
- Keep a single running error log. Re-read it before every mock.
- Track readiness per topic rather than "how much I studied". A-Level Ace's readiness index blends quiz marks, mock marks and flashcard health so the weak topic is visible before the exam finds it.

## The A* mindset shift

Grade A students know the content. A* students know the **mark scheme**. From day one of A2, every answer you write should be written to be marked, not to be understood. That is the whole gap.$md$,
  ARRAY['AS Level','A2','study plan','A*'],
  7,
  'https://alevelace.lovable.app/og/blog-default.jpg',
  true,
  now()
),
(
  'how-to-use-study-vaults-for-a-star-notes',
  'How to use Study Vaults to build A* notes (not pretty notes)',
  'A practical workflow for turning AS and A2 chapter notes into mark-scheme-shaped answers, flashcards and exam practice.',
  $md$Most revision notes fail for one reason: they are written to be read, not to be marked. Study Vaults are built the other way round — every chapter is generated against the official CIE or Edexcel specification and the board's mark-scheme conventions.

## What a Study Vault chapter contains

- **Precise definitions** in the wording the mark scheme accepts.
- **Mechanisms and derivations** step by step, with the creditable lines marked M1/A1/B1 in maths and the sciences.
- **Required practicals** with apparatus, variables, uncertainties and graph conventions.
- **Subject-specific evaluation frameworks** — AJIM in Economics, IRAC and case authorities in Law, GRAVE in Psychology.
- **Mark scheme traps** — the exact places students lose marks in that chapter.

## The four-step workflow

### 1. Generate the chapter *before* the lesson, skim it *after*
Open your subject, pick AS Level or A2 Level, generate the chapter. Read it once before class so the lesson lands on structure you already have, then re-read it after and mark anything that felt new.

### 2. Turn the chapter into flashcards the same day
Use **Turn into Flashcards** on the note. You get spaced-repetition cards from the definitions and key steps, scheduled automatically and synced across your devices. Ten minutes of reviews a day beats a weekend of re-reading.

### 3. Quiz the chapter, then read the traps
Take the topic quiz straight after. Whatever you drop, go back to the "Mark scheme traps" section and the Examiner Trap Door for that topic — it lists the top mark-losing mistakes with how to avoid each one.

### 4. Convert notes into answers
Close the note and write the exam answer from memory. Then compare against the chapter. The gap between what you wrote and what the note says is exactly your revision list — nothing else in the chapter needs your time.

## Getting more out of it

- **Split AS and A2 deliberately.** Revise the level you are being assessed on. AS caps at grade A; A2 is where A* is decided.
- **Set your board first.** A Cambridge 9702 chapter and an Edexcel 9PH0 chapter are not the same document — the vault follows whichever board you have selected.
- **Print with the mark scheme.** Export a chapter or a built mock as an A4 PDF with the grader rubric included when you want to work away from a screen.
- **Ask the tutor from inside the chapter.** If a derivation does not click, ask the AI tutor for the Socratic version — it walks you to the step instead of handing you the answer, and tells you where the marks sit.
- **Let the study plan drive it.** Your 7-day plan already knows your weak topics from mocks and flashcard health. Follow it instead of picking chapters by mood.

## A realistic weekly rhythm

| When | What |
| --- | --- |
| Daily, 10 min | Flashcard reviews that are due |
| 3x a week, 30 min | One vault chapter + its topic quiz |
| Weekly, 60 min | One timed mock section, AI-marked |
| Weekly, 15 min | Re-read your error log and trap list |

That is roughly four hours a week per subject, and it is structured entirely around being marked. Do it for a term and the readiness index moves — because the thing it measures is the thing the examiner measures.$md$,
  ARRAY['Study Vaults','notes','A*','revision workflow'],
  7,
  'https://alevelace.lovable.app/og/blog-study-vaults.jpg',
  true,
  now()
)
ON CONFLICT (slug) DO NOTHING;