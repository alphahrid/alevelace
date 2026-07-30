-- 1. Syllabus level
DO $$ BEGIN
  CREATE TYPE public.syllabus_level AS ENUM ('as','a2');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS level public.syllabus_level NOT NULL DEFAULT 'as';

-- Heuristic initial split: later-positioned topics are A2
UPDATE public.topics t SET level = 'a2'
WHERE t.position >= 4;

-- 2. Profile extensions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS readiness real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level_filter text NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.profiles
SET username = lower(regexp_replace(coalesce(nullif(display_name,''), 'student'), '[^a-zA-Z0-9]+', '', 'g')) || substring(md5(id::text),1,4)
WHERE username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (lower(username));

-- 3. Follows
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows readable to signed in" ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "own follows insert" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "own follows delete" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- 4. Notes vault
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid,
  topic_id uuid,
  level public.syllabus_level NOT NULL DEFAULT 'as',
  paper text,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notes all" ON public.notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS notes_user_topic_idx ON public.notes (user_id, topic_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS notes_touch ON public.notes;
CREATE TRIGGER notes_touch BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. Streak helper
CREATE OR REPLACE FUNCTION public.current_streaks()
RETURNS TABLE(user_id uuid, streak int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH days AS (
    SELECT DISTINCT s.user_id, s.occurred_on
    FROM public.study_sessions s
    WHERE s.occurred_on >= (CURRENT_DATE - INTERVAL '120 days')
  ),
  tagged AS (
    SELECT d.user_id, d.occurred_on,
      (d.occurred_on - (ROW_NUMBER() OVER (PARTITION BY d.user_id ORDER BY d.occurred_on))::int)::date AS grp
    FROM days d
  ),
  runs AS (
    SELECT t.user_id, t.grp, COUNT(*)::int AS len, MAX(t.occurred_on) AS last_day
    FROM tagged t GROUP BY t.user_id, t.grp
  )
  SELECT r.user_id, r.len
  FROM runs r
  WHERE r.last_day IN (CURRENT_DATE, CURRENT_DATE - INTERVAL '1 day');
$$;
REVOKE ALL ON FUNCTION public.current_streaks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_streaks() TO authenticated;

-- 6. Unified leaderboard
CREATE OR REPLACE FUNCTION public.leaderboard(_metric text DEFAULT 'xp', _friends boolean DEFAULT false)
RETURNS TABLE(rank int, user_id uuid, username text, label text, value numeric, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    WHERE s.occurred_on >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY s.user_id
  ),
  quizxp AS (
    SELECT a.user_id, SUM(a.score)::numeric * 10 AS v
    FROM public.quiz_attempts a
    WHERE a.started_at >= now() - INTERVAL '7 days'
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
  WHERE v.v > 0
  ORDER BY 1
  LIMIT 50;
$$;
REVOKE ALL ON FUNCTION public.leaderboard(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leaderboard(text, boolean) TO authenticated;

-- 7. Peer search
CREATE OR REPLACE FUNCTION public.search_profiles(_q text)
RETURNS TABLE(user_id uuid, username text, display_name text, readiness real, is_following boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.readiness,
    EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = p.id)
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND (p.username ILIKE '%' || _q || '%' OR COALESCE(p.display_name,'') ILIKE '%' || _q || '%')
  ORDER BY p.username
  LIMIT 20;
$$;
REVOKE ALL ON FUNCTION public.search_profiles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;

-- 8. Public profile view
CREATE OR REPLACE FUNCTION public.public_profile(_username text)
RETURNS TABLE(user_id uuid, username text, display_name text, bio text, readiness real,
              streak int, followers int, following int, is_following boolean, is_me boolean,
              week_minutes int, joined timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.bio, p.readiness,
    COALESCE((SELECT st.streak FROM public.current_streaks() st WHERE st.user_id = p.id), 0),
    (SELECT COUNT(*)::int FROM public.follows f WHERE f.following_id = p.id),
    (SELECT COUNT(*)::int FROM public.follows f WHERE f.follower_id = p.id),
    EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = p.id),
    (p.id = auth.uid()),
    COALESCE((SELECT SUM(s.minutes)::int FROM public.study_sessions s
              WHERE s.user_id = p.id AND s.occurred_on >= CURRENT_DATE - INTERVAL '7 days'), 0),
    p.created_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND lower(p.username) = lower(_username);
$$;
REVOKE ALL ON FUNCTION public.public_profile(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.public_profile(text) TO authenticated;

-- 9. Following activity feed
CREATE OR REPLACE FUNCTION public.following_feed()
RETURNS TABLE(kind text, username text, label text, detail text, at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH friends AS (
    SELECT f.following_id AS id FROM public.follows f WHERE f.follower_id = auth.uid()
  )
  SELECT * FROM (
    SELECT 'study'::text,
           p.username,
           COALESCE(NULLIF(p.display_name,''), p.username),
           s.activity || ' — ' || s.minutes || ' min',
           s.created_at
    FROM public.study_sessions s
    JOIN public.profiles p ON p.id = s.user_id
    WHERE s.user_id IN (SELECT id FROM friends)
    UNION ALL
    SELECT 'quiz'::text,
           p.username,
           COALESCE(NULLIF(p.display_name,''), p.username),
           a.mode || ' — ' || a.score || '/' || a.total,
           a.started_at
    FROM public.quiz_attempts a
    JOIN public.profiles p ON p.id = a.user_id
    WHERE a.user_id IN (SELECT id FROM friends) AND a.total > 0
  ) x
  ORDER BY 5 DESC
  LIMIT 50;
$$;
REVOKE ALL ON FUNCTION public.following_feed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.following_feed() TO authenticated;

-- 10. Ensure new signups get a username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    lower(regexp_replace(COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)), '[^a-zA-Z0-9]+', '', 'g')) || substring(md5(new.id::text),1,4)
  );
  RETURN new;
END; $$;