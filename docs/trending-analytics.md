# Trending Analytics & Cron Setup (Phase 3)

_Last updated: 2025-09-26_

This checklist captures the Supabase jobs and ETL flows needed before Phase 3 features (trending insights + personalization) go live.

**Status notes:**
- 2025-09-26: `/api/trending` live with Supabase data; homepage trending rail displays job freshness and fallback state.
- 2025-09-26: Deck builder recommendations panel consumes the same metrics via `/api/recommendations`.


## 1. Data Sources & Schedule

| Job | Frequency | Source | Destination |
| --- | --- | --- | --- |
| `scryfall_bulk` | Daily @ 03:00 UTC | [Scryfall bulk files](https://scryfall.com/docs/api/bulk-data) (`oracle_cards`, `default_cards`) | Upsert into `cards`, `printings`, `card_tags` (editorial) |
| `price_snapshot` | Daily @ 04:00 UTC (after Scryfall) | MTGGoldfish price API | Append to `prices`, refresh `card_daily_metrics.price_avg`/`price_change` |
| `telemetry_rollup` | Hourly | `event_log`, `imports`, `deck_cards` | Aggregate into `card_daily_metrics` & `deck_daily_metrics` |
| `trending_refresh` | Hourly (after rollup) | `card_daily_metrics`, `deck_daily_metrics`, `prices` | Compute `trending_snapshots` + cache `/api/trending` |

> Tip: Use [Supabase Cron](https://supabase.com/docs/guides/functions/schedule-functions) to trigger each job via Edge Functions. Log every run to `ingestion_job_runs`.

## 2. Edge Function Outline

Each cron job should:

1. Insert a row into `ingestion_job_runs` with `status='running'`.
2. Perform work (fetch external data, upsert, aggregate) inside a try/catch.
3. Update `status` to `succeeded` or `failed`, capturing `error_message` and any summary data in `metadata`.

Recommended metadata schema:
```json
{
  "duration_ms": 1250,
  "records_upserted": 4200,
  "warnings": ["Scryfall throttled, retried"],
  "job_window": "2025-09-26"
}
```

## 3. Aggregation SQL Snippets

**Card rollup (hourly telemetry snapshot)**
```sql
insert into card_daily_metrics (id, card_id, metric_date, views, unique_users, deck_inclusions, price_avg, price_change)
select
  gen_random_uuid(),
  subject_id,
  current_date,
  count(*) filter (where event_type = 'card_viewed') as views,
  count(distinct user_id) as unique_users,
  count(*) filter (where event_type = 'deck_card_added') as deck_inclusions,
  avg(price.retail) as price_avg,
  avg(price.retail) - lag(avg(price.retail)) over (partition by subject_id order by current_date) as price_change
from event_log el
left join prices price on price.printing_id = el.subject_id
where el.occurred_at >= date_trunc('day', now())
  and el.event_type in ('card_viewed', 'deck_card_added')
group by subject_id
on conflict (card_id, metric_date)
do update set
  views = excluded.views,
  unique_users = excluded.unique_users,
  deck_inclusions = excluded.deck_inclusions,
  price_avg = excluded.price_avg,
  price_change = excluded.price_change,
  created_at = now();
```

**Deck rollup (hourly)**
```sql
insert into deck_daily_metrics (id, deck_id, metric_date, views, unique_users, imports, exports, bridge_requests, win_rate)
select
  gen_random_uuid(),
  subject_id,
  current_date,
  count(*) filter (where event_type = 'deck_viewed') as views,
  count(distinct user_id) as unique_users,
  count(*) filter (where event_type = 'deck_imported') as imports,
  count(*) filter (where event_type = 'export_completed') as exports,
  count(*) filter (where event_type = 'bridge_initiated') as bridge_requests,
  avg((context->>'win_rate')::numeric) as win_rate
from event_log
where occurred_at >= date_trunc('day', now())
  and event_type in ('deck_viewed', 'deck_imported', 'export_completed', 'bridge_initiated')
group by subject_id
on conflict (deck_id, metric_date)
do update set
  views = excluded.views,
  unique_users = excluded.unique_users,
  imports = excluded.imports,
  exports = excluded.exports,
  bridge_requests = excluded.bridge_requests,
  win_rate = excluded.win_rate,
  created_at = now();
```

**Trending refresh**
```sql
insert into trending_snapshots (id, scope, subject_id, period, trend_score, components)
select
  gen_random_uuid(),
  'card'::TrendingScope,
  metrics.card_id,
  'daily'::TrendingPeriod,
  (views * 0.35 + deck_inclusions * 0.35 + coalesce(price_growth, 0) * 0.15 + coalesce(scarcity, 0) * 0.15) as trend_score,
  jsonb_build_object(
    'views', views,
    'deck_inclusions', deck_inclusions,
    'price_growth', price_growth,
    'scarcity', scarcity
  )
from (
  select
    card_id,
    views,
    deck_inclusions,
    coalesce(price_change / nullif(price_avg, 0), 0) as price_growth,
    greatest(0, 1 - inventory_ratio) as scarcity
  from card_daily_metrics
  where metric_date = current_date
) metrics
on conflict (subject_id, period)
do update set
  trend_score = excluded.trend_score,
  components = excluded.components,
  calculated_at = now();
```

> Adjust weighting once we have enough telemetry; storing raw components lets us tweak the formula without recomputing history.

## 4. API & Caching

- Create `GET /api/trending` that reads from `trending_snapshots`, supports `scope`, `period`, `format`, and `limit` params, and caches responses in the Next.js edge cache.
- Prime the homepage (cards + decks rails) by calling the endpoint during build/export so GitHub Pages has a static trending snapshot.

## 5. Monitoring

- Add an alert if any job remains in `status='running'` for >15 minutes.
- Record success/failure counts in Supabase Logs or ship metrics to Grafana later.
- Surface the latest `trending_refresh` timestamp in the admin dashboard so merchandisers know freshness.

With these pieces in place we can surface reliable trending insights and feed personalization models in upcoming sprints.
## 6. Local Job Shortcuts

- `npm run jobs:telemetry` aggregates the current day's telemetry into `card_daily_metrics` and `deck_daily_metrics`.
- `npm run jobs:trending` recomputes `trending_snapshots` using the latest daily metrics.
- `npm run jobs:seed` injects a sample card/deck plus baseline metrics so the UI shows data before cron jobs are wired up.
