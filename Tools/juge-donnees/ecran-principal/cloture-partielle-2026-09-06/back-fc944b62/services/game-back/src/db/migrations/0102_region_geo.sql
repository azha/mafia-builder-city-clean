-- migration 0102: region + region_country_map tables + player.region_id additive column (04d-C C1b)
-- Canon: docs/superpowers/plans/2026-07-03-04d-C-meta-market-plan.md §2.2 + decision #1/#c
-- R9.3: backported to docs/tech/09_data_model/schema_region.md same-commit + schema_player.md §2 additive column.
-- Anti-fabrication: no Math.random(), no non-deterministic defaults. Seed is static reference data [PROV-Y26Q2].
-- Zero-regression: ADDITIVE only. player.region_id is NULL (no backfill — lazy assignment via RegionService).
-- RGPD (decision #b): region_id = derived geo-region ONLY (IP never stored). No IP column anywhere.
-- Granularity: country (decision #c — US as one bloc; subdivision deferred TD).
-- FK: region_country_map.region_id → region(region_id). player.region_id → region(region_id) NULL.
-- Seed: ~10 canon-analog regions [PROV-Y26Q2] + 'unknown' fallback + country→region mapping.

--> statement-breakpoint

-- region: real-world player groupings (static reference, seeded at migration time).
-- ~10 canon-analog [PROV-Y26Q2] regions + 'unknown' fallback.
-- region_id varchar(16) PK (short hyphenated key, e.g. 'eu-west').
-- display_name varchar(64) NOT NULL — human-readable label for BO display.
-- active boolean DEFAULT true — inactive regions hidden from aggregation reads (BO-managed).
CREATE TABLE IF NOT EXISTS "region" (
  "region_id"    varchar(16) NOT NULL PRIMARY KEY,
  "display_name" varchar(64) NOT NULL,
  "active"       boolean     NOT NULL DEFAULT true
);

--> statement-breakpoint

-- region_country_map: ISO-3166-1-alpha-2 country code → region_id.
-- PK: country_code char(2). FK: region_id → region(region_id) NOT NULL.
-- Countries absent → caller falls back to 'unknown'.
-- Granularity: country level (decision #c — GeoLite2-Country edition, no subdivision).
CREATE TABLE IF NOT EXISTS "region_country_map" (
  "country_code" varchar(2)  NOT NULL PRIMARY KEY,
  "region_id"    varchar(16) NOT NULL
    REFERENCES "region"("region_id")
);

--> statement-breakpoint

CREATE INDEX "region_country_map_region_idx"
  ON "region_country_map" ("region_id");

--> statement-breakpoint

-- Seed ~10 regions [PROV-Y26Q2] + 'unknown' fallback.
-- Ordered: 'unknown' first (FK target used below; also the default fallback).
INSERT INTO "region" ("region_id", "display_name", "active") VALUES
  ('unknown',  'Unknown / Fallback',        true),
  ('eu-west',  'EU West',                   true),
  ('eu-east',  'EU East / CIS',             true),
  ('us-east',  'North America',             true),
  ('latam',    'Latin America',             true),
  ('sea',      'Southeast Asia',            true),
  ('oce',      'Oceania',                   true),
  ('me-af',    'Middle East & Africa',      true),
  ('ap-ne',    'Asia Pacific NE',           true),
  ('ap-sc',    'Asia Pacific SC',           true)
ON CONFLICT ("region_id") DO NOTHING;

--> statement-breakpoint

-- Seed country → region mapping (ISO-3166-1-alpha-2, country granularity, decision #c).
-- EU West (eu-west): AT BE CH CY CZ DE DK EE ES FI FR GB GR HR HU IE IT LT LU LV MT NL NO PL PT RO SE SI SK BG
INSERT INTO "region_country_map" ("country_code", "region_id") VALUES
  ('AT', 'eu-west'), ('BE', 'eu-west'), ('CH', 'eu-west'), ('CY', 'eu-west'),
  ('CZ', 'eu-west'), ('DE', 'eu-west'), ('DK', 'eu-west'), ('EE', 'eu-west'),
  ('ES', 'eu-west'), ('FI', 'eu-west'), ('FR', 'eu-west'), ('GB', 'eu-west'),
  ('GR', 'eu-west'), ('HR', 'eu-west'), ('HU', 'eu-west'), ('IE', 'eu-west'),
  ('IT', 'eu-west'), ('LT', 'eu-west'), ('LU', 'eu-west'), ('LV', 'eu-west'),
  ('MT', 'eu-west'), ('NL', 'eu-west'), ('NO', 'eu-west'), ('PL', 'eu-west'),
  ('PT', 'eu-west'), ('RO', 'eu-west'), ('SE', 'eu-west'), ('SI', 'eu-west'),
  ('SK', 'eu-west'), ('BG', 'eu-west'),
  -- EU East / CIS (eu-east): AL AM AZ BA BY GE KZ MD ME MK RS RU TR UA XK
  ('AL', 'eu-east'), ('AM', 'eu-east'), ('AZ', 'eu-east'), ('BA', 'eu-east'),
  ('BY', 'eu-east'), ('GE', 'eu-east'), ('KZ', 'eu-east'), ('MD', 'eu-east'),
  ('ME', 'eu-east'), ('MK', 'eu-east'), ('RS', 'eu-east'), ('RU', 'eu-east'),
  ('TR', 'eu-east'), ('UA', 'eu-east'), ('XK', 'eu-east'),
  -- North America (us-east): US CA MX (country granularity — US as one bloc, decision #c)
  ('US', 'us-east'), ('CA', 'us-east'), ('MX', 'latam'),
  -- Latin America (latam): BR AR CO CL PE VE EC BO PY UY HN GT SV NI CR PA DO CU TT JM HT
  ('BR', 'latam'), ('AR', 'latam'), ('CO', 'latam'), ('CL', 'latam'),
  ('PE', 'latam'), ('VE', 'latam'), ('EC', 'latam'), ('BO', 'latam'),
  ('PY', 'latam'), ('UY', 'latam'), ('HN', 'latam'), ('GT', 'latam'),
  ('SV', 'latam'), ('NI', 'latam'), ('CR', 'latam'), ('PA', 'latam'),
  ('DO', 'latam'), ('CU', 'latam'), ('TT', 'latam'), ('JM', 'latam'),
  ('HT', 'latam'), ('PR', 'latam'), ('BB', 'latam'), ('GD', 'latam'),
  ('LC', 'latam'), ('VC', 'latam'), ('AG', 'latam'), ('KN', 'latam'),
  ('DM', 'latam'), ('BS', 'latam'),
  -- Southeast Asia (sea): SG MY ID PH TH VN MM KH LA BN TL
  ('SG', 'sea'), ('MY', 'sea'), ('ID', 'sea'), ('PH', 'sea'),
  ('TH', 'sea'), ('VN', 'sea'), ('MM', 'sea'), ('KH', 'sea'),
  ('LA', 'sea'), ('BN', 'sea'), ('TL', 'sea'),
  -- Oceania (oce): AU NZ FJ PG SB VU WS TO
  ('AU', 'oce'), ('NZ', 'oce'), ('FJ', 'oce'), ('PG', 'oce'),
  ('SB', 'oce'), ('VU', 'oce'), ('WS', 'oce'), ('TO', 'oce'),
  -- Middle East & Africa (me-af): AE SA IL EG ZA NG KE GH MA ET TZ SN CM CI TN LY SD
  ('AE', 'me-af'), ('SA', 'me-af'), ('IL', 'me-af'), ('EG', 'me-af'),
  ('ZA', 'me-af'), ('NG', 'me-af'), ('KE', 'me-af'), ('GH', 'me-af'),
  ('MA', 'me-af'), ('ET', 'me-af'), ('TZ', 'me-af'), ('SN', 'me-af'),
  ('CM', 'me-af'), ('CI', 'me-af'), ('TN', 'me-af'), ('LY', 'me-af'),
  ('SD', 'me-af'), ('SO', 'me-af'), ('CD', 'me-af'), ('AO', 'me-af'),
  ('MZ', 'me-af'), ('UG', 'me-af'), ('RW', 'me-af'), ('MG', 'me-af'),
  ('ZM', 'me-af'), ('ZW', 'me-af'), ('MW', 'me-af'), ('BW', 'me-af'),
  ('NA', 'me-af'), ('JO', 'me-af'), ('LB', 'me-af'), ('IQ', 'me-af'),
  ('IR', 'me-af'), ('KW', 'me-af'), ('QA', 'me-af'), ('BH', 'me-af'),
  ('OM', 'me-af'), ('YE', 'me-af'),
  -- Asia Pacific NE (ap-ne): JP KR CN TW HK MO
  ('JP', 'ap-ne'), ('KR', 'ap-ne'), ('CN', 'ap-ne'), ('TW', 'ap-ne'),
  ('HK', 'ap-ne'), ('MO', 'ap-ne'),
  -- Asia Pacific SC (ap-sc): IN PK BD LK NP AF
  ('IN', 'ap-sc'), ('PK', 'ap-sc'), ('BD', 'ap-sc'), ('LK', 'ap-sc'),
  ('NP', 'ap-sc'), ('AF', 'ap-sc')
ON CONFLICT ("country_code") DO NOTHING;

--> statement-breakpoint

-- player.region_id: ADDITIVE NULLABLE column (backfill lazy via RegionService at next login/action).
-- varchar(16) FK → region(region_id). NULL for pre-C1b players until assigned.
-- NO backfill of existing rows (lazy: NULL stays NULL; assigned to 'unknown' on first action).
-- Zero-regression: nullable column with no DEFAULT → existing INSERT statements without region_id stay valid.
ALTER TABLE "player"
  ADD COLUMN IF NOT EXISTS "region_id" varchar(16)
  REFERENCES "region"("region_id");

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "region" TO app_rw;

--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON "region_country_map" TO app_rw;
