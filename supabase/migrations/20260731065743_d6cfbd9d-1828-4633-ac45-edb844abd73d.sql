CREATE OR REPLACE FUNCTION public.community_stats()
RETURNS TABLE(total integer, active_week integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM public.profiles),
    (SELECT COUNT(DISTINCT s.user_id)::int FROM public.study_sessions s
      WHERE s.occurred_on >= CURRENT_DATE - INTERVAL '7 days');
$$;

REVOKE ALL ON FUNCTION public.community_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_stats() TO authenticated;