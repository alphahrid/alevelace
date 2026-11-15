REVOKE UPDATE (readiness) ON public.profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.enforce_study_session_leaderboard_limits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  existing_minutes integer;
BEGIN
  IF NEW.minutes < 0 OR NEW.minutes > 600 THEN
    RAISE EXCEPTION 'Study session duration is outside the allowed range';
  END IF;
  IF NEW.occurred_on > CURRENT_DATE OR NEW.occurred_on < CURRENT_DATE - 6 THEN
    RAISE EXCEPTION 'Study sessions must be dated within the last seven days';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text || ':study-sessions', 0));

  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(SUM(s.minutes), 0)::integer INTO existing_minutes
    FROM public.study_sessions s
    WHERE s.user_id = NEW.user_id
      AND s.occurred_on BETWEEN CURRENT_DATE - 6 AND CURRENT_DATE
      AND s.id <> OLD.id;
  ELSE
    SELECT COALESCE(SUM(s.minutes), 0)::integer INTO existing_minutes
    FROM public.study_sessions s
    WHERE s.user_id = NEW.user_id
      AND s.occurred_on BETWEEN CURRENT_DATE - 6 AND CURRENT_DATE;
  END IF;

  IF existing_minutes + NEW.minutes > 2400 THEN
    RAISE EXCEPTION 'Study time exceeds the allowed seven-day total';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_study_session_leaderboard_limits ON public.study_sessions;
CREATE TRIGGER enforce_study_session_leaderboard_limits
BEFORE INSERT OR UPDATE OF user_id, minutes, occurred_on ON public.study_sessions
FOR EACH ROW EXECUTE FUNCTION public.enforce_study_session_leaderboard_limits();

CREATE OR REPLACE FUNCTION public.enforce_quiz_attempt_leaderboard_limits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  existing_score integer;
BEGIN
  IF NEW.score < 0 OR NEW.total < 0 OR NEW.total > 200 OR NEW.score > NEW.total THEN
    RAISE EXCEPTION 'Quiz score must be within the paper mark total';
  END IF;
  IF NEW.started_at > now() + interval '5 minutes'
     OR NEW.started_at < now() - interval '7 days' THEN
    RAISE EXCEPTION 'Quiz attempts must be dated within the last seven days';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text || ':quiz-attempts', 0));

  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(SUM(a.score), 0)::integer INTO existing_score
    FROM public.quiz_attempts a
    WHERE a.user_id = NEW.user_id
      AND a.started_at >= now() - interval '7 days'
      AND a.finished_at IS NOT NULL
      AND a.total > 0
      AND a.id <> OLD.id;
  ELSE
    SELECT COALESCE(SUM(a.score), 0)::integer INTO existing_score
    FROM public.quiz_attempts a
    WHERE a.user_id = NEW.user_id
      AND a.started_at >= now() - interval '7 days'
      AND a.finished_at IS NOT NULL
      AND a.total > 0;
  END IF;

  IF NEW.finished_at IS NOT NULL AND NEW.total > 0 AND existing_score + NEW.score > 1000 THEN
    RAISE EXCEPTION 'Quiz scores exceed the allowed seven-day total';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_quiz_attempt_leaderboard_limits ON public.quiz_attempts;
CREATE TRIGGER enforce_quiz_attempt_leaderboard_limits
BEFORE INSERT OR UPDATE OF user_id, score, total, started_at, finished_at ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.enforce_quiz_attempt_leaderboard_limits();