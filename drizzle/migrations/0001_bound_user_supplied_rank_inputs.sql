ALTER TABLE public.study_sessions
  ADD CONSTRAINT study_sessions_minutes_reasonable
  CHECK (minutes BETWEEN 0 AND 600) NOT VALID;

ALTER TABLE public.quiz_attempts
  ADD CONSTRAINT quiz_attempts_score_within_total
  CHECK (score >= 0 AND total BETWEEN 0 AND 200 AND score <= total) NOT VALID;

ALTER TABLE public.quiz_attempts
  ADD CONSTRAINT quiz_attempts_duration_reasonable
  CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 0 AND 86400) NOT VALID;

DROP POLICY IF EXISTS "topics read" ON public.topics;
CREATE POLICY "topics read" ON public.topics
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
  ));

DROP POLICY IF EXISTS "templates read" ON public.flashcard_templates;
CREATE POLICY "templates read" ON public.flashcard_templates
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
  ));

DROP POLICY IF EXISTS "qtemplates read" ON public.quiz_question_templates;
CREATE POLICY "qtemplates read" ON public.quiz_question_templates
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
  ));

DROP POLICY IF EXISTS "subjects read" ON public.subjects;
CREATE POLICY "subjects read" ON public.subjects
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid()
  ));