-- 0016_world_geography_seed.sql — Phase 1 / Task 0. Idempotent GLOBAL geography seed.
-- IMPLEMENTS: docs/tech/09_data_model/schema_world_geography.md §4 (seed déterministe & idempotent)
--             + §5 (D1 bank_side split 9/9, D2 block_count = 30 + ((id*7) % 51), D3 coordinates,
--             D4 6 threnny_edges). PALIMPSEST §3.2 (forward-only).
-- Idempotence: every INSERT is `ON CONFLICT (id) DO NOTHING` (brennar_city.md §Docker "upsert par id").
-- The MigrationRunner also skips an already-applied .sql (drizzle.__drizzle_migrations) — double safety.

-- ===== 18 districts (VALUES explicites — petite table) =====
-- block_count déterministe via la formule §5 D2 (range exact 30..80) — calculée par la DB, jamais
-- hand-typée. bank_side selon le split §5 D1 (nord = tidewater/spine/stack ; sud = lattice/glass/verge).
INSERT INTO "districts" ("id", "district_key", "profile", "index_label", "name_canonical", "bank_side", "block_count")
SELECT v.id, v.district_key, v.profile::district_profile, v.index_label, v.name_canonical, v.bank_side::bank_side,
       30 + ((v.id * 7) % 51) AS block_count
FROM (VALUES
  ( 1, 'tidewater-1', 'tidewater', '1', 'Tidewater-1', 'north'),
  ( 2, 'tidewater-2', 'tidewater', '2', 'Tidewater-2', 'north'),
  ( 3, 'tidewater-3', 'tidewater', '3', 'Tidewater-3', 'north'),
  ( 4, 'spine-a',     'spine',     'a', 'Spine-A',     'north'),
  ( 5, 'spine-b',     'spine',     'b', 'Spine-B',     'north'),
  ( 6, 'spine-c',     'spine',     'c', 'Spine-C',     'north'),
  ( 7, 'spine-d',     'spine',     'd', 'Spine-D',     'north'),
  ( 8, 'lattice-a',   'lattice',   'a', 'Lattice-A',   'south'),
  ( 9, 'lattice-b',   'lattice',   'b', 'Lattice-B',   'south'),
  (10, 'lattice-c',   'lattice',   'c', 'Lattice-C',   'south'),
  (11, 'stack-1',     'stack',     '1', 'Stack-1',     'north'),
  (12, 'stack-2',     'stack',     '2', 'Stack-2',     'north'),
  (13, 'glass-1',     'glass',     '1', 'Glass-1',     'south'),
  (14, 'glass-2',     'glass',     '2', 'Glass-2',     'south'),
  (15, 'glass-3',     'glass',     '3', 'Glass-3',     'south'),
  (16, 'verge-a',     'verge',     'a', 'Verge-A',     'south'),
  (17, 'verge-b',     'verge',     'b', 'Verge-B',     'south'),
  (18, 'verge-c',     'verge',     'c', 'Verge-C',     'south')
) AS v(id, district_key, profile, index_label, name_canonical, bank_side)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- ===== ~N blocks via generate_series (JAMAIS hand-typés ~900 rows) =====
-- block.id global = (district_id - 1) * 100 + local_index (offset 100/district, pas de collision
-- car block_count <= 80 < 100). coordinates = grille locale {"x": (n-1)%10, "y": (n-1)/10}.
INSERT INTO "blocks" ("id", "district_id", "coordinates")
SELECT (d.id - 1) * 100 + g.n AS id,
       d.id                   AS district_id,
       jsonb_build_object('x', (g.n - 1) % 10, 'y', (g.n - 1) / 10) AS coordinates
FROM "districts" d
CROSS JOIN LATERAL generate_series(1, d.block_count) AS g(n)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- ===== 6 threnny_edges (VALUES explicites — set raisonné nord<->sud, §5 D4) =====
-- Chaque edge relie strictement un district nord à un district sud (invariant testé E2E).
-- inspection_queue_district_id = district riverain dont la queue MIS per-player traite la traversée.
INSERT INTO "threnny_edges" ("id", "edge_type", "north_district_id", "south_district_id", "inspection_queue_district_id")
VALUES
  (1, 'bridge',  1,  8,  1),   -- Tidewater-1 <-> Lattice-A   (queue: Tidewater-1)
  (2, 'bridge',  4, 13, 13),   -- Spine-A     <-> Glass-1      (queue: Glass-1)
  (3, 'bridge', 11, 16, 11),   -- Stack-1     <-> Verge-A      (queue: Stack-1)
  (4, 'bridge',  7, 10,  7),   -- Spine-D     <-> Lattice-C    (queue: Spine-D)
  (5, 'ferry',   3, 15,  3),   -- Tidewater-3 <-> Glass-3      (queue: Tidewater-3)
  (6, 'ferry',  12, 18, 18)    -- Stack-2     <-> Verge-C      (queue: Verge-C)
ON CONFLICT ("id") DO NOTHING;
