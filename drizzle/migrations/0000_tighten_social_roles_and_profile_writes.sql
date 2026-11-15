CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND _user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = _role
    )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.following_feed()
RETURNS TABLE(kind text, username text, label text, detail text, at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH friends AS (
    SELECT f.following_id AS id
    FROM public.follows f
    WHERE f.follower_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.follows back
        WHERE back.follower_id = f.following_id
          AND back.following_id = auth.uid()
      )
  )
  SELECT * FROM (
    SELECT 'study'::text,
           p.username,
           COALESCE(NULLIF(p.display_name, ''), p.username),
           s.activity || ' — ' || s.minutes || ' min',
           s.created_at
    FROM public.study_sessions s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.user_id IN (SELECT id FROM friends)
    UNION ALL
    SELECT 'quiz'::text,
           p.username,
           COALESCE(NULLIF(p.display_name, ''), p.username),
           a.mode || ' — ' || a.score || '/' || a.total,
           a.started_at
    FROM public.quiz_attempts a
    JOIN public.profiles p ON p.id = a.user_id
    WHERE a.user_id IN (SELECT id FROM friends) AND a.total > 0
  ) activity_feed
  ORDER BY 5 DESC
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.following_feed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.following_feed() TO authenticated;

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, exam_boards, selected_subjects, onboarded, username, bio, level_filter, exam_date)
  ON public.profiles TO authenticated;

ALTER TABLE public.tutor_messages
  ADD CONSTRAINT tutor_messages_role_allowed
  CHECK (role IN ('user', 'assistant')) NOT VALID;
