// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 1 (C1) Step 2
//             docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 6 (C6) — trophic pair seed
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §DD-RIVAL-SEED
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md §7 (:77-80)
//             — Rival AI Foundation C1 — 2026-06-24 —
//
//             W6.1 C1 (design docs/superpowers/specs/2026-08-12-w6.1-combat-production-design.md §4
//             D2): `ensurePlayerRivals`/`seedTrophicPairs` gain an optional `executor?: Tx` so
//             `OnboardingGrantService.grantWelcomeAssets` can call BOTH on its OWN transaction — the
//             ONLY production writer this design adds (§0.2: 0 prod writers before this chunk). `Tx`
//             = the SAME house alias `friction-budget.repository.ts:87`/`money-holding.repository.ts:45`
//             already extract (`Parameters<Parameters<DrizzleClient['transaction']>[0]>[0]` — never
//             guessed, always exactly what `db.transaction(async (tx) => …)` infers). `(executor ??
//             this.db)` is the SAME fallback both precedents use — a bare call (e.g. the `_test`
//             `/v1/_test/rival/ensure` seam, `rival-state.repository.ts:42`) still opens its own
//             pool-backed statement, byte-identical to before this chunk.
//             -- W6.1 C1 — 2026-08-13 --
//
// `RivalSeedService` — per-player 4-rival static baseline seeding.
//
// DD-RIVAL-SEED: UPSERT all 4 rivals for a player using static canon baselines.
// Idempotent via DO NOTHING on conflict (composite PK player_id + rival_key).
// ZERO Math.random() — purely deterministic from static baselines.
//
// Static baselines (canon-chiffré, rival_ai_mechanics.md :77-80):
//   Coil:        expansionary  | flip_threshold=70 | observe=1 | orient=2 | commit=3 | intel_mode=pull
//   Tarcum:      consolidating | flip_threshold=70 | observe=2 | orient=4 | commit=1 | intel_mode=push
//   Iron Throat: defensive     | flip_threshold=70 | observe=5 | orient=1 | commit=0 | intel_mode=push
//   Saltline:    consolidating | flip_threshold=70 | observe=3 | orient=2 | commit=2 | intel_mode=push
//     [PROV-Y26Q2 OQ-A1]: Saltline regime/commit/intel_mode are provisional — calibration deferred to
//     lot B (DD-RIVAL-SEED OQ-A1 — exact values TBD pending B competitive dynamics).
//
// All other defaults:
//   regime_pressure=0, saturation_pressure=0, mode_stability_ticks=0,
//   route_integrity=null (for all rivals at C1; Coil route_integrity seeded in C5),
//   dominance_rank=null (OQ-A8: written by B), vulnerable_axis=null (OQ-A8: written by B).
//
// R2.2 / P6: all rival_state fields beyond player_id + rival_key are server-only.
// Anti-fabrication: zero Date.now(), zero Math.random(). Purely structural.
// Zero-regression: ADDITIVE only — no existing rows touched.

import { Injectable, Inject } from '@nestjs/common';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { rivalState, rivalPairPressure } from '../../../db/schema/conflict_rival';
import type { RivalKey, RivalRegime, IntelMode } from './rival-ai.types';

/** W6.1 C1 — a Drizzle transaction handle (the `tx` arg of `db.transaction`), the SAME house alias
 *  `friction-budget.repository.ts:87`/`money-holding.repository.ts:45` already extract. Lets the two
 *  methods below run EITHER on their own pool-backed statement (`executor` omitted — the `_test` seam's
 *  shape, unchanged) OR on a CALLER's already-open transaction (`OnboardingGrantService.
 *  grantWelcomeAssets`'s own `tx` — the ONLY reason a repository can safely join a transaction it did
 *  not open itself: `db/index.ts:30` is pool-backed, so a bare `this.db` call inside another service's
 *  transaction would take a DIFFERENT connection). */
export type Tx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

// ─── Static baseline type ─────────────────────────────────────────────────────

interface RivalBaseline {
  readonly rival_key: RivalKey;
  readonly regime: RivalRegime;
  readonly flip_threshold: number;
  readonly observe_interval_ticks: number;
  readonly orient_latency_ticks: number;
  readonly commit_delay_ticks: number;
  readonly intel_mode: IntelMode;
}

// ─── Canon-chiffré baselines ──────────────────────────────────────────────────
//
// rival_ai_mechanics.md :77 (Coil)
// rival_ai_mechanics.md :78 (Tarcum)
// rival_ai_mechanics.md :79 (Iron Throat)
// [PROV-Y26Q2 OQ-A1] (Saltline — provisional, calibration deferred to lot B)

const RIVAL_BASELINES: readonly RivalBaseline[] = [
  {
    rival_key:              'coil',
    regime:                 'expansionary',
    flip_threshold:         70,
    observe_interval_ticks: 1,
    orient_latency_ticks:   2,
    commit_delay_ticks:     3,
    intel_mode:             'pull',
  },
  {
    rival_key:              'tarcum',
    regime:                 'consolidating',
    flip_threshold:         70,
    observe_interval_ticks: 2,
    orient_latency_ticks:   4,
    commit_delay_ticks:     1,
    intel_mode:             'push',
  },
  {
    rival_key:              'iron_throat',
    regime:                 'defensive',
    flip_threshold:         70,
    observe_interval_ticks: 5,
    orient_latency_ticks:   1,
    commit_delay_ticks:     0,
    intel_mode:             'push',
  },
  // [PROV-Y26Q2 OQ-A1]: Saltline baseline is provisional pending lot-B calibration.
  {
    rival_key:              'saltline',
    regime:                 'consolidating',
    flip_threshold:         70,
    observe_interval_ticks: 3,
    orient_latency_ticks:   2,
    commit_delay_ticks:     2,
    intel_mode:             'push',
  },
] as const;

// ─── Canon-relevant trophic suppression pairs (C6 seed — OQ-A9) ──────────────
//
// The trophic gap pair set (§9.3, design :720): the CANON-RELEVANT ~4 directed pairs
// [PROV-Y26Q2 OQ-A9] — NOT the full 4×3 cross-product (12 pairs).
//
// Interpretation (canon-derived from rival ecology per :77-80 + §3.5):
//   Coil (EXPANSIONARY) suppresses Tarcum: the expansionary rival holds back the
//     consolidating rival's growth into contested blocks.
//   Coil (EXPANSIONARY) suppresses Saltline: the same expansion frontier pushes
//     Saltline's pool out of the acquisition corridor.
//   Iron Throat (DEFENSIVE) suppresses Tarcum: the enforcement-heavy rival clamps
//     Tarcum's consolidation at the shared boundary.
//   Iron Throat (DEFENSIVE) suppresses Saltline: Iron Throat's infrastructure presence
//     keeps Saltline's distributed agents out of the defended zone.
//
// = 4 directed pairs: (coil→tarcum), (coil→saltline), (iron_throat→tarcum), (iron_throat→saltline).
// [PROV-Y26Q2 OQ-A9]: the exact pair set is canon-silent — this is the PROPOSED default
//   pending the calibration TD. Reviewer⊥ will ratify or adjust at gate.
//
// All rows seed at: enforcement_pressure=0, top_enforcer_active=true (enforcer is present).

interface TrophicPairSeed {
  readonly rival_a_key: RivalKey; // the suppressing rival
  readonly rival_b_key: RivalKey; // the suppressed secondary
}

const TROPHIC_PAIRS: readonly TrophicPairSeed[] = [
  // Coil (EXPANSIONARY) suppresses two rivals it out-competes on the expansion frontier.
  { rival_a_key: 'coil', rival_b_key: 'tarcum'      }, // OQ-A9 [PROV-Y26Q2]: Coil→Tarcum
  { rival_a_key: 'coil', rival_b_key: 'saltline'    }, // OQ-A9 [PROV-Y26Q2]: Coil→Saltline

  // Iron Throat (DEFENSIVE) suppresses two rivals within its enforcement perimeter.
  { rival_a_key: 'iron_throat', rival_b_key: 'tarcum'   }, // OQ-A9 [PROV-Y26Q2]: Iron Throat→Tarcum
  { rival_a_key: 'iron_throat', rival_b_key: 'saltline' }, // OQ-A9 [PROV-Y26Q2]: Iron Throat→Saltline
] as const;

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class RivalSeedService {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * DD-RIVAL-SEED: UPSERT all 4 rivals for the player using static baselines.
   *
   * Uses DO NOTHING on conflict — idempotent (safe to call 2× back-to-back per C1 spec).
   * No Math.random(). Purely deterministic from `RIVAL_BASELINES`.
   *
   * Default column values on insert:
   *   regime_pressure=0, saturation_pressure=0, mode_stability_ticks=0,
   *   route_integrity=null, dominance_rank=null, vulnerable_axis=null.
   *
   * C6: also seeds the canon-relevant trophic pairs via seedTrophicPairs (OQ-A9).
   *
   * W6.1 C1: `executor` optionally threads a CALLER's already-open `tx` (design D2) — omitted, this
   * runs on `this.db` exactly as before (the `_test` seam's byte-identical shape).
   */
  async ensurePlayerRivals(playerId: string, executor?: Tx): Promise<void> {
    const db = executor ?? this.db;
    const rows = RIVAL_BASELINES.map((b) => ({
      player_id:              playerId,
      rival_key:              b.rival_key,
      regime:                 b.regime,
      regime_pressure:        0,
      flip_threshold:         b.flip_threshold,
      observe_interval_ticks: b.observe_interval_ticks,
      orient_latency_ticks:   b.orient_latency_ticks,
      commit_delay_ticks:     b.commit_delay_ticks,
      saturation_pressure:    0,
      intel_mode:             b.intel_mode,
      mode_stability_ticks:   0,
      route_integrity:        null,
      dominance_rank:         null,
      vulnerable_axis:        null,
    }));

    await db
      .insert(rivalState)
      .values(rows)
      .onConflictDoNothing();

    // C6: seed the canon-relevant trophic suppression pairs (OQ-A9 [PROV-Y26Q2]).
    await this.seedTrophicPairs(playerId, executor);
  }

  /**
   * C6: Seed the canon-relevant trophic suppression pairs for the player.
   *
   * Seeds TROPHIC_PAIRS (4 directed pairs, OQ-A9 [PROV-Y26Q2]) with:
   *   enforcement_pressure=0, top_enforcer_active=true.
   *
   * Idempotent via DO NOTHING on conflict (PK: player_id + rival_a_key + rival_b_key).
   * No Math.random(). Purely deterministic from TROPHIC_PAIRS.
   *
   * [PROV-Y26Q2 OQ-A9]: the exact pair set is canon-silent — this PROPOSED default
   * seeds the 4 most ecologically relevant pairs for the conflict layer calibration TD.
   *
   * W6.1 C1: `executor` optionally threads a CALLER's already-open `tx` (design D2) — SAME contract as
   * `ensurePlayerRivals`, which is also this method's own caller when it self-invokes above.
   */
  async seedTrophicPairs(playerId: string, executor?: Tx): Promise<void> {
    const db = executor ?? this.db;
    const rows = TROPHIC_PAIRS.map((p) => ({
      player_id:            playerId,
      rival_a_key:          p.rival_a_key,
      rival_b_key:          p.rival_b_key,
      enforcement_pressure: 0,
      top_enforcer_active:  true,
    }));

    await db
      .insert(rivalPairPressure)
      .values(rows)
      .onConflictDoNothing();
  }

}
