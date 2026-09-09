// IMPLEMENTS: docs/tech/18_api_protocol/idempotency.md §TTL et expiration + §Tunables référencés
//             -- session:2026-06-02 (Phase 0 Task 5) --
//             -- lot-2 (TD-060/061): added `pendingGraceSeconds` (T.api.idempotency_pending_grace_s) --
//
// Protocol-layer tunables (`T.api.*`).
//
// R2.3: numeric values live ONLY in the registry. BUT — unlike T.db.* (which
// are materialized in gdd/14 §Infrastructure DB) — `T.api.idempotency_ttl_h` is
// NOT YET backported to gdd/14. The registry note is explicit:
//
//   projects/mafia_city_game/gdd/14_tunable_constants.md (T.db.persistence.* note):
//   « REUSE conceptuel tunables T.auth.* 17 + T.api.* 18 : ... idempotency_ttl_h ...
//     (les 17 + 1 des 18 non encore backportés gdd/14 ... — REUSE conceptuel ICI ;
//     promotion future indépendante chunks 17/18) »
//
//   And idempotency.md §TTL et expiration only gives the ORDER OF MAGNITUDE:
//   « TTL par défaut : T.api.idempotency_ttl_h (ordre de grandeur "heures-jours" en gdd/14) ».
//
// So there is no canonical default/range to mirror yet. We therefore surface the
// value as an env-overridable PLACEHOLDER default (24h — within the documented
// "heures-jours" band) so the layer is functional, and FLAG it: when chunk 18's
// T.api.idempotency_ttl_h is backported to gdd/14 with a real default/range,
// update this map in the SAME commit (R9.3 propagation) and replace the
// placeholder with the registry value. The 4 versioning T.api.* tunables ARE
// materialized in gdd/14 (chunk 22 backport) but are not needed by this layer.
//
// PROVISOIRE KEY: T.api.idempotency_ttl_h (gdd/14 §Auth/API not yet backported).
// Precedence: DB-override > env > default (Phase-23 TunablesStore).
//
// T8 CAPTURE NOTE (Phase-23): `ttlSeconds` below is a derived getter (resolves
// idempotency_ttl_h in HOURS then multiplies by 3600). The consumer
// (idempotency.interceptor.ts) accesses this getter INSIDE a request-handler method —
// i.e. at runtime, not at module load — so the getter evaluates the current
// TunablesStore snapshot on each call. No load-time capture. A DB override of
// T.api.idempotency_ttl_h will take effect on the next request (correct behavior).
// Noted for T8: the `* 3600` conversion is inside the getter (not a static const),
// which is the correct phase-23 pattern for derived-unit values.
//
// lot-2 ADDITION: `pendingGraceSeconds` (T.api.idempotency_pending_grace_s) — PLACEHOLDER.
// Same status as idempotency_ttl_h: not yet backported to gdd/14; placeholder default of 30s.
// (idempotency.md §Tunables line 243). R9.3 propagation: update with gdd/14 backport of ch18.

import { TunablesStore } from '../config/tunables-store';

export const protocolTunables = {
  idempotency: {
    /**
     * T.api.idempotency_ttl_h (PLACEHOLDER — not yet in gdd/14, see header).
     * Exposed in seconds for the Redis `SET ... EX <seconds>` native TTL
     * (idempotency.md §Stockage: "TTL natif Redis = T.api.idempotency_ttl_h (en secondes)").
     * Derived getter: resolves hours from TunablesStore, returns hours * 3600.
     * (DB-override > env > default — Phase-23).
     */
    get ttlSeconds(): number {
      return TunablesStore.resolveInt('T.api.idempotency_ttl_h', 'IDEMPOTENCY_TTL_HOURS', 24) * 3600;
    },

    /**
     * T.api.idempotency_pending_grace_s (PLACEHOLDER — not yet in gdd/14, see header).
     * The window (in seconds) during which a PENDING lock is considered "in-flight" before
     * it becomes re-acquirable by a later request with the same key (orphaned PENDING recovery).
     * idempotency.md §Concurrence lines 145-152 + §Tunables line 243.
     *
     * Default: 30s (a reasonable grace window for typical request processing). Override via
     * IDEMPOTENCY_PENDING_GRACE_SECONDS env or DB-override (Phase-23 TunablesStore).
     */
    get pendingGraceSeconds(): number {
      return TunablesStore.resolveInt(
        'T.api.idempotency_pending_grace_s',
        'IDEMPOTENCY_PENDING_GRACE_SECONDS',
        30,
      );
    },
  },
};
