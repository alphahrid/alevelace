DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users ORDER BY created_at ASC LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  author_name text NOT NULL DEFAULT 'Tasfia Tahmid Hridita',
  read_minutes integer NOT NULL DEFAULT 5,
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published posts are public" ON public.blog_posts;
CREATE POLICY "Published posts are public" ON public.blog_posts
  FOR SELECT TO anon, authenticated USING (published = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert posts" ON public.blog_posts;
CREATE POLICY "Admins insert posts" ON public.blog_posts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update posts" ON public.blog_posts;
CREATE POLICY "Admins update posts" ON public.blog_posts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete posts" ON public.blog_posts;
CREATE POLICY "Admins delete posts" ON public.blog_posts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS blog_posts_touch ON public.blog_posts;
CREATE TRIGGER blog_posts_touch BEFORE UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.blog_posts (slug, title, excerpt, content, tags, read_minutes) VALUES
('a-level-study-tips-that-actually-work',
 'A-Level study tips that actually work (and the ones that waste your time)',
 'Highlighting and re-reading feel productive but barely move your grade. Here are the study habits that do.',
 $md$## Stop re-reading, start retrieving

Re-reading a chapter feels like learning because it feels easy. Retrieval — closing the book and writing everything you remember — feels hard, which is exactly why it works.

**Do this instead:** after any topic, shut the notes and write the definitions, equations and key steps from memory. Only then check what you missed.

## 1. Work in mark points, not in paragraphs

Examiners award M1 (method), A1 (accuracy) and B1 (stand-alone fact) marks. When you revise, ask "which mark am I earning with this sentence?" If a sentence earns nothing, cut it.

## 2. Learn the command words

"State" wants one line. "Explain" wants a cause and a consequence. "Evaluate" wants both sides plus a justified judgement. Losing marks here is the most common avoidable mistake in A-Level scripts.

## 3. Space your reviews

Reviewing a card on day 1, 3, 7, 16 and 35 beats five reviews in one evening. Spaced repetition is why flashcards with scheduling beat a pile of paper cards.

## 4. Do timed papers early

Most students do past papers in the final month. Start in month one, untimed at first, then timed. Exam technique is a skill, not a fact — it needs reps.

## 5. Track what you get wrong

Keep one list of every mark you lost and why. Patterns appear fast: unlabelled axes, missing units, no evaluation, arithmetic slips. Fixing a pattern fixes dozens of future marks.

## Put it together

Notes for understanding, flashcards for recall, timed papers for technique, and a weekly review of your error list. That loop, repeated, is what an A* looks like from the inside.$md$,
 ARRAY['study tips','exam technique'], 6),
('how-to-use-past-papers-properly',
 'How to use CIE and Edexcel past papers properly',
 'A paper you mark generously teaches you nothing. Here is a marking routine that turns every paper into grade gains.',
 $md$## Papers are practice, mark schemes are the syllabus

The mark scheme tells you the exact wording examiners pay for. Treat it as the real specification.

### The routine

1. **Pick the right paper.** Match your board and your syllabus code — Cambridge 9702 Physics is not Edexcel 9PH0.
2. **Time it.** Use the real minutes-per-mark rate. Roughly one mark per minute is a safe pace for most written papers.
3. **Mark harshly.** If your wording is not in the mark scheme, you do not get the mark. Being generous now is expensive in June.
4. **Convert to a grade.** Use the grade threshold table for that exact series — boundaries move every session.
5. **Log the losses.** One line per lost mark: topic, what the scheme wanted, what you wrote.

### Do not start with the newest paper

Save the two most recent series for full dress rehearsals near the exam. Use older series while you are still learning.

### Redo, do not just read

Two weeks after marking, redo the questions you lost marks on. If you can produce the mark-scheme wording cold, it has stuck.$md$,
 ARRAY['past papers','exam technique'], 5),
('mock-exam-strategy',
 'Mock exam strategy: how to simulate exam day',
 'Mocks are only useful if they are uncomfortable. Set them up like the real thing.',
 $md$## Make the conditions real

Phone in another room. One pen, one calculator, a clock in view, no notes. Sit the whole paper in one sitting.

## Plan your minutes before question 1

Write the finish time for each section in the margin. Most lost marks in mocks are unfinished questions, not wrong ones.

## Answer in mark-scheme order

Lead with the technical term, then the explanation, then the example. Examiners scan for the keyword.

## After the paper

- Total your marks and convert with a real threshold table.
- Split the losses into three buckets: **did not know**, **knew but mis-read**, **ran out of time**. Each bucket has a different fix.
- Rewrite three answers to full-mark standard, using the mark scheme wording.

## How often?

One full mock per subject per month during the year, then weekly in the final six weeks. Frequency beats perfection.$md$,
 ARRAY['mock exams','exam technique'], 4),
('flashcards-spaced-repetition-guide',
 'Flashcards and spaced repetition for A-Level, done right',
 'Good cards ask one thing, in mark-scheme language. Bad cards are paragraphs with a question mark.',
 $md$## One card, one idea

If a card needs a paragraph to answer, split it. "State Newton's second law" and "Explain why a rocket accelerates as it burns fuel" are different cards.

## Write the answer like the mark scheme

Your card answer should be the wording that earns the mark, not your own paraphrase. You will repeat what you rehearse.

## Use the scheduler, trust the scheduler

Spaced repetition puts a card in front of you just before you would forget it. Grading yourself honestly — Again, Hard, Good, Easy — is what makes the schedule accurate.

## Good card types for A-Level

- Definitions and units
- Equations with the condition they apply under
- Required practical steps and the reason for each
- Evaluation frameworks (AJIM for Economics, GRAVE for Psychology)
- Case citations and legal tests for Law

## Ten minutes daily beats two hours weekly

Cards are maintenance, not learning. Learn from notes, keep it with cards, prove it with papers.$md$,
 ARRAY['flashcards','revision'], 5),
('a-star-study-plan-template',
 'Building an A* study plan you will actually follow',
 'A plan that assumes a perfect week fails in week two. Build one around your weakest topics and your real free time.',
 $md$## Start from evidence, not optimism

List your topics, then score each one honestly: confident, shaky, blank. Your plan is the shaky and blank list, in order of exam weight.

## Weekly shape that works

- **Four short sessions** on weak topics: notes, then questions on the same topic.
- **Daily flashcard review** — ten minutes, non-negotiable.
- **One timed paper section** per subject per week.
- **One review slot** to reread your lost-marks log.

## Size sessions to your real day

Forty-five focused minutes with the phone away beats three distracted hours. If a plan needs six hours a day, it is a fantasy, not a plan.

## Re-plan weekly, not daily

Every Sunday, move the topics you still lose marks on back to the top. A plan that never changes is not reading your results.

## Leave slack

Two empty slots a week absorb illness, school deadlines and bad days. Plans without slack break permanently at the first missed session.$md$,
 ARRAY['study plan','revision'], 5)
ON CONFLICT (slug) DO NOTHING;