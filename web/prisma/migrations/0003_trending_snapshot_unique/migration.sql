-- Remove older trending snapshots so the unique index can be created cleanly
DELETE FROM public.trending_snapshots t
USING public.trending_snapshots newer
WHERE t.scope = newer.scope
  AND t.subject_id = newer.subject_id
  AND t.period = newer.period
  AND t.calculated_at < newer.calculated_at;

CREATE UNIQUE INDEX IF NOT EXISTS trending_snapshots_scope_subject_period_key
  ON public.trending_snapshots (scope, subject_id, period);
