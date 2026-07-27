CREATE OR REPLACE FUNCTION public.weekly_streak_leaderboard()
RETURNS TABLE (rank int, label text, streak int, is_me boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT DISTINCT user_id, occurred_on
    FROM public.study_sessions
    WHERE occurred_on >= (CURRENT_DATE - INTERVAL '60 days')
  ),
  tagged AS (
    SELECT user_id, occurred_on,
      (occurred_on - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY occurred_on))::int)::date AS grp
    FROM days
  ),
  runs AS (
    SELECT user_id, grp, COUNT(*)::int AS len, MAX(occurred_on) AS last_day
    FROM tagged GROUP BY user_id, grp
  ),
  cur AS (
    SELECT user_id, len AS streak
    FROM runs
    WHERE last_day IN (CURRENT_DATE, CURRENT_DATE - INTERVAL '1 day')
  ),
  ranked AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY streak DESC, user_id)::int AS rnk,
      user_id,
      streak
    FROM cur
    WHERE streak > 0
  )
  SELECT
    r.rnk AS rank,
    'Student ' || upper(substring(md5(r.user_id::text), 1, 4)) AS label,
    r.streak AS streak,
    (r.user_id = auth.uid()) AS is_me
  FROM ranked r
  ORDER BY r.rnk
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.weekly_streak_leaderboard() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.weekly_streak_leaderboard() FROM anon, public;