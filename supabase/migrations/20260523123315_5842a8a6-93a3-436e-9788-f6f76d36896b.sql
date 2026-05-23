
-- Past paper score logging — feeds into A* Readiness Index
CREATE TABLE public.past_paper_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  board exam_board NOT NULL DEFAULT 'both',
  paper_label TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0),
  total INTEGER NOT NULL CHECK (total > 0),
  grade TEXT,
  taken_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.past_paper_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own past papers all" ON public.past_paper_scores FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX past_paper_scores_user_idx ON public.past_paper_scores(user_id, taken_on DESC);

-- Public flashcard templates: starter packs per topic, readable by all auth users
CREATE TABLE public.flashcard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.flashcard_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates read" ON public.flashcard_templates FOR SELECT TO authenticated USING (true);
CREATE INDEX flashcard_templates_topic_idx ON public.flashcard_templates(topic_id);

-- Public quiz question templates
CREATE TABLE public.quiz_question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  type question_type NOT NULL,
  board exam_board NOT NULL DEFAULT 'both',
  prompt TEXT NOT NULL,
  choices JSONB,
  answer TEXT NOT NULL,
  explanation TEXT,
  mark_scheme TEXT,
  difficulty INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_question_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qtemplates read" ON public.quiz_question_templates FOR SELECT TO authenticated USING (true);
CREATE INDEX quiz_question_templates_topic_idx ON public.quiz_question_templates(topic_id);
