-- 0035_standing_order_single_active.sql — schema_lieutenant.md §5 (standing_order — the Single-active invariant: at most
--   ONE status='active' standing_order row per lieutenant, spec §5). PALIMPSEST §3.2 (forward-only).
-- IMPLEMENTS: Phase 25 / L3 Standing Order Expiry backend (docs/superpowers/specs/2026-06-11-phase-25-standing-order-expiry-design.md
--             §5 Invariants — Single-active) / final-review hardening (Finder B #3). ONLY ADDS — no table/column/enum is
--             redefined or dropped: ONE NEW partial-unique index on the EXISTING "standing_order".
-- WHY: `StandingOrderService.issue` enforces Single-active with a read-then-insert (getActiveOrInjecting → 409 if an active
--      order exists). That guard is the clean SEQUENTIAL path, but it is a TOCTOU: two CONCURRENT issues for the SAME
--      lieutenant can both pass the read (no active row yet) and both INSERT → two status='active' rows, violating the
--      invariant. A PARTIAL-unique index on (lieutenant_id) WHERE status='active' enforces it at the DB level: the second
--      concurrent insert hits a unique violation, which the service maps to the SAME 409 (isUniqueViolation → 409), so the
--      invariant holds under concurrency, not merely sequentially. The read-then-check stays the common-path 409; the index
--      is the race backstop (defense-in-depth — the guard and the index agree on the error the caller sees).
-- SCOPE OF THE PARTIAL PREDICATE: only 'active' rows are constrained. A lieutenant may accumulate MANY non-active rows —
--      'lapsed' (incl. HOLD_LAST still-injecting), 'revoked', 'promoted' — over a re-issue history (the (4) PROMOTION /
--      (7) COHERENCE flows issue→lapse→re-issue repeatedly); only the single LIVE 'active' order is unique. RENEW re-arming a
--      lapsed HOLD_LAST order back to 'active' is safe: Single-active means no OTHER active order can co-exist (issue 409s
--      while a HOLD_LAST order is still injecting), so the re-arm never collides. No existing flow creates two active rows,
--      so the index is satisfied by all current data; it only forecloses the concurrent-race corruption.
-- INDEX (not a column / not a CHECK — a partial unique index is the right tool for "unique among a subset of rows"):
CREATE UNIQUE INDEX IF NOT EXISTS "standing_order_one_active_per_lieutenant"
  ON "standing_order" ("lieutenant_id")
  WHERE "status" = 'active';
