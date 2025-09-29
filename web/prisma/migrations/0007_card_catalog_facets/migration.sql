-- Card catalog facets and legality table
CREATE TABLE IF NOT EXISTS card_format_legalities (
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  format text NOT NULL,
  status text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, format)
);

CREATE INDEX IF NOT EXISTS card_format_legalities_format_status_idx
  ON card_format_legalities (format, status);

DROP VIEW IF EXISTS card_catalog_view;

CREATE VIEW card_catalog_view AS
WITH price_stats AS (
  SELECT
    prt.card_id,
    MIN(p.retail) FILTER (WHERE p.currency = 'USD') AS price_low,
    MAX(p.retail) FILTER (WHERE p.currency = 'USD') AS price_high
  FROM printings prt
  JOIN prices p ON p.printing_id = prt.id
  GROUP BY prt.card_id
),
trend_stats AS (
  SELECT
    ts.subject_id AS card_id,
    AVG(ts.trend_score) AS popularity
  FROM trending_snapshots ts
  WHERE ts.scope = 'card'
  GROUP BY ts.subject_id
)
SELECT
  c.id AS card_id,
  c.name,
  c.set_code,
  c.mana_cost,
  c.cmc,
  c.type_line,
  COALESCE(string_to_array(trim(split_part(c.type_line, E'—', 1)), ' '), ARRAY[]::text[]) AS card_types,
  CASE
    WHEN c.type_line ILIKE '%—%'
      THEN string_to_array(trim(split_part(c.type_line, E'—', 2)), ' ')
    ELSE ARRAY[]::text[]
  END AS subtypes,
  c.color_identity,
  c.color_identity AS colors,
  c.rarity,
  COALESCE(c.image_uris ->> 'png', c.image_uris ->> 'large', c.image_uris ->> 'normal', c.image_uris ->> 'small') AS image_url,
  c.oracle_text,
  COALESCE(
    array_remove(array_agg(DISTINCT CASE WHEN cfl.status IN ('legal', 'restricted', 'suspended') THEN cfl.format END), NULL),
    ARRAY[]::text[]
  ) AS formats,
  ts.popularity,
  ps.price_low,
  ps.price_high
FROM cards c
LEFT JOIN card_format_legalities cfl ON cfl.card_id = c.id
LEFT JOIN price_stats ps ON ps.card_id = c.id
LEFT JOIN trend_stats ts ON ts.card_id = c.id
GROUP BY c.id, ts.popularity, ps.price_low, ps.price_high;
