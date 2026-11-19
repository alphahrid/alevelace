REVOKE EXECUTE ON FUNCTION public.current_streaks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_streaks() TO service_role;

ALTER TABLE public.quiz_attempts ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.force_client_rows_unverified()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user <> 'service_role' AND current_user <> 'postgres' THEN
    NEW.verified := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quiz_attempts_force_unverified ON public.quiz_attempts;
CREATE TRIGGER quiz_attempts_force_unverified BEFORE INSERT OR UPDATE ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.force_client_rows_unverified();
DROP TRIGGER IF EXISTS study_sessions_force_unverified ON public.study_sessions;
CREATE TRIGGER study_sessions_force_unverified BEFORE INSERT OR UPDATE ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.force_client_rows_unverified();

CREATE TABLE public.answer_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  user_answer text NOT NULL DEFAULT '',
  correct boolean NOT NULL,
  score real NOT NULL,
  feedback text,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.answer_grades TO authenticated;
GRANT ALL ON public.answer_grades TO service_role;
ALTER TABLE public.answer_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own answer grades readable" ON public.answer_grades FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX answer_grades_user_idx ON public.answer_grades(user_id, created_at);

CREATE OR REPLACE FUNCTION public.leaderboard(_metric text DEFAULT 'xp'::text, _friends boolean DEFAULT false)
 RETURNS TABLE(rank integer, user_id uuid, username text, label text, value numeric, is_me boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH scope AS (
    SELECT p.id, p.username, COALESCE(NULLIF(p.display_name,''), p.username) AS label, p.readiness
    FROM public.profiles p
    WHERE NOT _friends
       OR p.id = auth.uid()
       OR p.id IN (SELECT f.following_id FROM public.follows f WHERE f.follower_id = auth.uid())
  ),
  xp AS (
    SELECT s.user_id, SUM(s.minutes)::numeric AS v
    FROM public.study_sessions s
    WHERE s.verified AND s.occurred_on >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY s.user_id
  ),
  quizxp AS (
    SELECT a.user_id, SUM(a.score)::numeric * 10 AS v
    FROM public.quiz_attempts a
    WHERE a.verified AND a.started_at >= now() - INTERVAL '7 days'
    GROUP BY a.user_id
  ),
  vals AS (
    SELECT sc.id, sc.username, sc.label,
      CASE _metric
        WHEN 'streak' THEN COALESCE(st.streak, 0)::numeric
        WHEN 'readiness' THEN ROUND(sc.readiness::numeric, 1)
        ELSE COALESCE(xp.v,0) + COALESCE(q.v,0)
      END AS v
    FROM scope sc
    LEFT JOIN public.current_streaks() st ON st.user_id = sc.id
    LEFT JOIN xp ON xp.user_id = sc.id
    LEFT JOIN quizxp q ON q.user_id = sc.id
  )
  SELECT ROW_NUMBER() OVER (ORDER BY v.v DESC, v.username)::int,
         v.id, v.username, v.label, v.v, (v.id = auth.uid())
  FROM vals v
  WHERE auth.uid() IS NOT NULL AND v.v > 0
  ORDER BY 1
  LIMIT 50;
$function$;

CREATE OR REPLACE FUNCTION public.public_profile(_username text)
 RETURNS TABLE(user_id uuid, username text, display_name text, bio text, readiness real, streak integer, followers integer, following integer, is_following boolean, is_me boolean, week_minutes integer, joined timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.username, p.display_name, p.bio, p.readiness,
    COALESCE((SELECT st.streak FROM public.current_streaks() st WHERE st.user_id = p.id), 0),
    (SELECT COUNT(*)::int FROM public.follows f WHERE f.following_id = p.id),
    (SELECT COUNT(*)::int FROM public.follows f WHERE f.follower_id = p.id),
    EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = p.id),
    (p.id = auth.uid()),
    COALESCE((SELECT SUM(s.minutes)::int FROM public.study_sessions s
              WHERE s.user_id = p.id AND s.verified AND s.occurred_on >= CURRENT_DATE - INTERVAL '7 days'), 0),
    p.created_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND lower(p.username) = lower(_username);
$function$;