-- 1. Exam countdown target date
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exam_date date;

-- 2. Re-scope owner policies from `public` role to `authenticated`
DROP POLICY IF EXISTS "own answers all" ON public.attempt_answers;
CREATE POLICY "own answers all" ON public.attempt_answers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own flashcards all" ON public.flashcards;
CREATE POLICY "own flashcards all" ON public.flashcards FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own past papers all" ON public.past_paper_scores;
CREATE POLICY "own past papers all" ON public.past_paper_scores FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own attempts all" ON public.quiz_attempts;
CREATE POLICY "own attempts all" ON public.quiz_attempts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own questions all" ON public.quiz_questions;
CREATE POLICY "own questions all" ON public.quiz_questions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own sessions all" ON public.study_sessions;
CREATE POLICY "own sessions all" ON public.study_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own convs all" ON public.tutor_conversations;
CREATE POLICY "own convs all" ON public.tutor_conversations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own msgs all" ON public.tutor_messages;
CREATE POLICY "own msgs all" ON public.tutor_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own profile select" ON public.profiles;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "own profile insert" ON public.profiles;
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. follows: follows are create/delete only — never editable
REVOKE UPDATE ON public.follows FROM anon, authenticated;
DROP POLICY IF EXISTS "follows are never updatable" ON public.follows;
CREATE POLICY "follows are never updatable" ON public.follows AS RESTRICTIVE FOR UPDATE
  TO anon, authenticated USING (false) WITH CHECK (false);

-- 4. Tighten anon grants on user-owned tables (all policies scope to auth.uid())
REVOKE ALL ON public.attempt_answers FROM anon;
REVOKE ALL ON public.flashcards FROM anon;
REVOKE ALL ON public.past_paper_scores FROM anon;
REVOKE ALL ON public.quiz_attempts FROM anon;
REVOKE ALL ON public.quiz_questions FROM anon;
REVOKE ALL ON public.study_sessions FROM anon;
REVOKE ALL ON public.tutor_conversations FROM anon;
REVOKE ALL ON public.tutor_messages FROM anon;
REVOKE ALL ON public.notes FROM anon;
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.follows FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attempt_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.past_paper_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;

-- 5. SECURITY DEFINER functions: pin search_path, restrict EXECUTE to signed-in users
ALTER FUNCTION public.community_stats() SET search_path = public;
ALTER FUNCTION public.current_streaks() SET search_path = public;
ALTER FUNCTION public.following_feed() SET search_path = public;
ALTER FUNCTION public.leaderboard(text, boolean) SET search_path = public;
ALTER FUNCTION public.public_profile(text) SET search_path = public;
ALTER FUNCTION public.search_profiles(text) SET search_path = public;
ALTER FUNCTION public.weekly_streak_leaderboard() SET search_path = public;

REVOKE ALL ON FUNCTION public.community_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_streaks() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.following_feed() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leaderboard(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.public_profile(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_profiles(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.weekly_streak_leaderboard() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.community_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_streaks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.following_feed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.weekly_streak_leaderboard() TO authenticated;

-- trigger-only functions must never be API callable
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
