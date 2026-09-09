// IMPLEMENTS: docs/superpowers/plans/2026-07-01-04d-B-internal-affairs-plan.md C8 (★ P5 wall)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/internal_affairs_corruption_discovery.md
//               §Player observable signals (:111-117) + §P5 strict (:73,152)
//             Mirror: services/game-back/src/citysim/police_memory/police_memory.projection.service.ts
//             — 04d-B C8 — 2026-07-02
//
// `IAProjectionService` — the P5 projection wall for Internal Affairs G9.
//
// R2.2/P5 (CENTRAL for G9 — canon :73,152):
//   `suspicion_level` (float), `cooperators` (jsonb), `weight_per_player` (jsonb),
//   `detection_events` (jsonb) are SERVER-ONLY — NEVER exposed on any client endpoint.
//   This service is the ONLY IA surface that returns player-facing derived values.
//
// Public surface:
//   `getActorStatus(playerId, targetNpcId): Promise<ActorStatusIndicator>`
//     — canon actor status 4-state: `steady | nervous | unavailable | gone`.
//     — derived from server-side `suspicion_level` + investigation/discovery state.
//     — PLAYER-ISOLATED: scoped to actors relevant to the requesting player.
//     — NO scalars in return value (R2.2/P5).
//
// Actor status derivation (server-side only, pure function of DB row state):
//   Precedence (highest first):
//     `gone`        : `discovered_at IS NOT NULL` — actor arrested by IA.
//     `unavailable` : `investigation_id IS NOT NULL` (AND `discovered_at IS NULL`) — under active surveillance.
//     `nervous`     : `suspicion_level >= intelBandCutWatching` — suspicion building, no investigation yet.
//     `steady`      : default — below watching threshold, no investigation.
//
//   Derivation is PURE (no writes, no RNG, no Date.now(), no Math.random()).
//   The `suspicion_level` float is consumed server-side ONLY — never returned.
//
// Player isolation:
//   The projection checks server-side that `playerId` appears in the JSONB `cooperators` list.
//   If the player is not a cooperator, the actor appears `steady` from their perspective
//   (they have no IA involvement with that actor — from their view, the actor is stable).
//   The `cooperators` list itself is NEVER returned (SERVER-ONLY, R2.2/P5).
//   If no IA target exists for `targetNpcId`, the actor is also `steady` (no IA tracking yet).
//
// R2.3: the `intelBandCutWatching` threshold used in the `nervous` derivation is registry-sourced
//   via `IATunables.intelBandCutWatching` (never inlined). Same cut-point reused from C7 (DRY).
//
// Grep-zero invariant (P5 wall):
//   The public interface `ActorStatusResult` contains ONLY `status: ActorStatusIndicator`.
//   It does NOT contain: `suspicion_level`, `cooperators`, `weight_per_player`, `detection_events`,
//   `investigation_id`, `target_id`, or any raw IA scalar.
//   E2E spec `ia_p5_wall.spec.ts` asserts this structurally (recursive key scan + SQL grep-zero).

import { Injectable, Logger, Inject } from '@nestjs/common';
import { eq, isNotNull } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { internalAffairsTarget } from '../../db/schema/internal_affairs';
import { lawyer } from '../../db/schema/legal';
import { recruitmentCandidates } from '../../db/schema/recruitment';
import { IATunables } from './ia.tunables';

// ── ActorStatusIndicator ─────────────────────────────────────────────────────────────────────────

/**
 * Player-facing actor status indicator (P5 strict — canon §Unity :131).
 *
 * R2.2/P5: derived from server-side `suspicion_level` + investigation/discovery state.
 * NO `suspicion_level` percentage is exposed — only this 4-state qualitative bucket.
 *
 * - `steady`      : actor is operating normally. No IA pressure on this actor.
 *                   (`suspicion_level < intelBandCutWatching` AND no investigation, no discovery)
 * - `nervous`     : actor is showing behavioral changes. IA is passively monitoring.
 *                   (`suspicion_level >= intelBandCutWatching` AND no open investigation)
 * - `unavailable` : actor is temporarily unavailable. Under active IA investigation (surveillance).
 *                   (`investigation_id IS NOT NULL` AND `discovered_at IS NULL`)
 * - `gone`        : actor has been arrested by IA and is permanently unavailable.
 *                   (`discovered_at IS NOT NULL`)
 *
 * Canon reference: internal_affairs_corruption_discovery.md §Unity :131
 *   "Display 4 states: steady | nervous | unavailable | gone. NO suspicion_level percentage shown."
 */
export type ActorStatusIndicator = 'steady' | 'nervous' | 'unavailable' | 'gone';

// ── ActorStatusResult — the P5-projection return value ──────────────────────────────────────────

/**
 * Return value of `getActorStatus`.
 *
 * R2.2/P5 STRUCTURAL GUARANTEE: this interface contains ONLY `status`.
 * The following fields are NEVER present: `suspicion_level`, `cooperators`,
 * `weight_per_player`, `detection_events`, `investigation_id`, `target_id`.
 * Grep-zero asserted by `ia_p5_wall.spec.ts`.
 */
export interface ActorStatusResult {
  /**
   * The qualitative actor status (4-state).
   * NEVER a float or scalar — always one of: steady | nervous | unavailable | gone.
   */
  readonly status: ActorStatusIndicator;
}

// ── ActorSummary — W6.3 C3: one row of `listActorStatuses` ──────────────────────────────────────

/**
 * One entry of `IAProjectionService.listActorStatuses` (W6.3 C3 — `GET /v1/me/internal-affairs/actors`).
 *
 * `actorRef` is the referent's OWN identifier (a `lawyer_id` or `candidate_id`) — NOT
 * `internal_affairs_targets.target_id` (that pivot NEVER leaves `IATargetService`, W6.3 §3 C3).
 * `actorType` is restricted to the 2 LIVE types (`lawyer` | `clerk`) — the 3 reserved-inert types
 * have no referent table, so they can never appear in a player's OWN roster (`_hasReferentAccess`
 * deny-by-default).
 */
export interface ActorSummary {
  readonly actorRef: string;
  readonly actorType: 'lawyer' | 'clerk';
  readonly status: ActorStatusIndicator;
}

// ── IAProjectionService ──────────────────────────────────────────────────────────────────────────

@Injectable()
export class IAProjectionService {
  private readonly logger = new Logger(IAProjectionService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: IATunables,
  ) {}

  /**
   * `getActorStatus` — player-facing actor status for a given corrupt actor (targetNpcId).
   *
   * **R2.2/P5 (CENTRAL for G9):**
   *   - Returns ONLY `{ status: ActorStatusIndicator }`.
   *   - `suspicion_level`, `cooperators`, `weight_per_player`, `detection_events` are read
   *     server-side but NEVER returned (P5 wall invariant).
   *
   * **Player isolation (R5 / plan §C8 bullet 5):**
   *   - Checks server-side that `playerId` is in the `cooperators` JSONB list.
   *   - If not a cooperator (or if no IA target exists for `targetNpcId`), returns `steady`.
   *   - The `cooperators` list itself is NEVER returned (SERVER-ONLY).
   *   - `playerId` comes from the request context (not a spoofable URL param — enforced by
   *     the calling controller/middleware in production; in _test routes the body param is used).
   *
   * **Actor status derivation (pure — no writes, no RNG):**
   *   Precedence (highest priority first):
   *   1. `gone`        — `discovered_at IS NOT NULL`: actor arrested by IA.
   *   2. `unavailable` — `investigation_id IS NOT NULL`: under active surveillance.
   *   3. `nervous`     — `suspicion_level >= intelBandCutWatching` (registry R2.3): pressure building.
   *   4. `steady`      — default: no IA pressure, actor operating normally.
   *
   * **R2.3:** the `intelBandCutWatching` threshold is registry-sourced (IATunables getter),
   *   never inlined. Same cut-point reused from C7's `buyApproxBandReveal` (DRY).
   *
   * **Determinism:** NO `Math.random()`, NO `Date.now()`. Pure function of DB state + registry.
   *
   * @param playerId     — the requesting player's UUID (scope isolation key — server-side only).
   * @param targetNpcId  — the NPC UUID of the corrupt actor (e.g., lawyer_id from `lawyers` table).
   * @returns `{ status: ActorStatusIndicator }` — NEVER `suspicion_level` or any raw scalar.
   */
  async getActorStatus(playerId: string, targetNpcId: string): Promise<ActorStatusResult> {
    // ── 1. Look up IA target by target_npc_id (server-side read, no client output) ──────────────
    // We select ONLY the fields needed for the derivation (not all columns — no accidental leak).
    // None of these fields appear in the return value (R2.2/P5 wall).
    const [row] = await this.db
      .select({
        target_id:        internalAffairsTarget.target_id,        // internal (not returned)
        target_type:      internalAffairsTarget.target_type,      // internal (not returned)
        suspicion_level:  internalAffairsTarget.suspicion_level,  // SERVER-ONLY (R2.2/P5)
        cooperators:      internalAffairsTarget.cooperators,      // SERVER-ONLY (R2.2/P5)
        investigation_id: internalAffairsTarget.investigation_id, // internal (not returned)
        discovered_at:    internalAffairsTarget.discovered_at,    // internal (not returned)
      })
      .from(internalAffairsTarget)
      .where(eq(internalAffairsTarget.target_npc_id, targetNpcId))
      .limit(1);

    if (!row) {
      // No IA target for this NPC: actor is not tracked by IA → steady from player's perspective.
      this.logger.debug(
        `[IAProjectionService] getActorStatus: no IA target for targetNpcId=${targetNpcId} ` +
          `— returning 'steady' (no IA tracking yet). playerId=${playerId}`,
      );
      return { status: 'steady' };
    }

    // ── 2. Player isolation check (server-side only — cooperators NEVER returned) ───────────────
    // Check if the requesting player is in the cooperators JSONB list.
    // The cooperators list is SERVER-ONLY (R2.2/P5): we check it here and discard it.
    // If the player is not a cooperator, they have no IA involvement → actor appears steady.
    const cooperators = (row.cooperators as string[] | null) ?? [];
    if (!cooperators.includes(playerId)) {
      // Player has not contributed to this actor's suspicion → steady from their perspective.
      // Do NOT reveal that an IA target exists (isolation: only show actors relevant to player).
      this.logger.debug(
        `[IAProjectionService] getActorStatus: playerId=${playerId} NOT in cooperators ` +
          `for targetNpcId=${targetNpcId} (target_id=${row.target_id}) ` +
          `— returning 'steady' (player isolation).`,
      );
      return { status: 'steady' };
    }

    // ── 3. Derive actor status (pure function — server-side only, no raw scalars returned) ──────
    //
    // Precedence (highest first):
    //   gone        : discovered_at IS NOT NULL — actor arrested.
    //   unavailable : investigation_id IS NOT NULL — under active surveillance.
    //   nervous     : suspicion_level >= intelBandCutWatching — pressure building.
    //   steady      : default.
    //
    // `suspicion_level` is consumed here server-side and NEVER forwarded (P5 wall).
    // `investigation_id` and `discovered_at` are status signals consumed server-side only.
    // R2.3: bandCutWatching sourced from registry getter (not inline literal 0.30).
    const bandCutWatching = this.tunables.intelBandCutWatching; // 0.30 default [PROV-Y26Q2]

    const status: ActorStatusIndicator = (() => {
      if (row.discovered_at !== null) {
        // Actor has been discovered (arrested) by IA. Permanent.
        return 'gone';
      }
      if (row.investigation_id !== null) {
        // Active IA investigation: actor is under surveillance and temporarily unavailable.
        return 'unavailable';
      }
      if (row.suspicion_level >= bandCutWatching) {
        // Suspicion is building but no investigation yet. Actor is becoming nervous.
        return 'nervous';
      }
      // Default: no IA pressure — actor is operating normally.
      return 'steady';
    })();

    this.logger.debug(
      `[IAProjectionService] getActorStatus: ` +
        `playerId=${playerId} targetNpcId=${targetNpcId} target_id=${row.target_id} ` +
        `derivedStatus=${status} ` +
        `(discovered_at=${row.discovered_at?.toISOString() ?? 'null'} ` +
        `investigation_id=${row.investigation_id ?? 'null'} ` +
        `suspicion_band_cut=${bandCutWatching}). ` +
        `R2.2/P5: suspicion_level=${row.suspicion_level.toFixed(4)} NOT returned (server-only).`,
    );

    // ── 4. Return ONLY { status } — no raw scalars, no server-only fields ───────────────────────
    // Grep-zero invariant: the returned object carries ONLY the `status` bucket.
    // Any addition of `suspicion_level`/`cooperators`/`weight_per_player`/`detection_events` here
    // is a P5 violation and will be caught by the structural grep in ia_p5_wall.spec.ts.
    return { status };
  }

  /**
   * `listActorStatuses` — W6.3 C3: enumerate the referents `playerId` OWNS (their `lawyers` and
   * `recruitment_candidates` rows — EXACTLY the set `_hasReferentAccess` recognizes,
   * `ia-target.service.ts:516-551`), then derive each one's `ActorStatusIndicator` via
   * `getActorStatus`.
   *
   * ⛔ Does NOT enumerate from `cooperators` (SERVER-ONLY, `internal_affairs.ts:139-140`) — that
   * would leak the EXISTENCE of an IA target the player never legitimately owns a referent for.
   * The player's own roster (lawyers/candidates) is the ONLY legitimate enumeration source — the
   * SAME two tables `_hasReferentAccess` already trusts for ownership.
   *
   * `port_inspector` / `broker` / `judge_aide` never appear (no referent table — a player cannot
   * "own" a referent that structurally does not exist, W6.3 §1.3.2).
   *
   * R2.2/P5: each row is `{ actorRef, actorType, status }` — NO `suspicion_level`,
   * `cooperators`, `weight_per_player`, `investigation_id`, or `target_id` (that pivot never
   * leaves `IATargetService`).
   *
   * @param playerId — the requesting player's UUID (server-side only, never client-supplied).
   */
  async listActorStatuses(playerId: string): Promise<ActorSummary[]> {
    const [lawyers, candidates] = await Promise.all([
      this.db.select({ ref: lawyer.lawyer_id }).from(lawyer).where(eq(lawyer.player_id, playerId)),
      this.db
        .select({ ref: recruitmentCandidates.candidate_id })
        .from(recruitmentCandidates)
        .where(eq(recruitmentCandidates.player_id, playerId)),
    ]);

    const referents: Array<{ actorRef: string; actorType: 'lawyer' | 'clerk' }> = [
      ...lawyers.map((l) => ({ actorRef: l.ref, actorType: 'lawyer' as const })),
      ...candidates.map((c) => ({ actorRef: c.ref, actorType: 'clerk' as const })),
    ];

    const results = await Promise.all(
      referents.map(async (r) => {
        const { status } = await this.getActorStatus(playerId, r.actorRef);
        return { actorRef: r.actorRef, actorType: r.actorType, status };
      }),
    );

    this.logger.debug(
      `[IAProjectionService] listActorStatuses: playerId=${playerId} ` +
        `lawyers=${lawyers.length} candidates=${candidates.length} → ${results.length} actors.`,
    );

    return results;
  }
}
