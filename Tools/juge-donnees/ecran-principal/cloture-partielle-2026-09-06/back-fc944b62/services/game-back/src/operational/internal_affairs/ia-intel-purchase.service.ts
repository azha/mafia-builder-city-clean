// IMPLEMENTS: docs/superpowers/plans/2026-07-01-04d-B-internal-affairs-plan.md C7 (intel-op)
//             docs/superpowers/specs/2026-08-13-w6.3-04d-player-surface-design.md §3 C4 (property guard)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/internal_affairs_corruption_discovery.md
//               §Player observable signals (:111-117) + §Mitigations (:119-125)
//             Architecture: direct service (Fixer = projection-only label, NO DSL binding — plan gap #6)
//             Global constraints: R2.2/P5 (suspicion_level SERVER-ONLY) + determinism + R2.3 tunables
//             — 04d-B C7 — 2026-07-02 — / W6.3 C4 — 2026-08-13 —
//
// `IAIntelPurchaseService` — Fixer-mediated intel-op that reveals the target's suspicion band.
//
// The Fixer is a SECURITY-archetype label (lieutenant-archetype.ts:65 role_id 11).
// It is **projection-only** — no DSL binding exists for it (plan gap #6).
// This service is called DIRECTLY by the game layer (not via DSL).
// "Fixer-mediated" in the canon means the Fixer conceptually initiates it; in code it is a
// direct service invocation.
//
// ⛔⛔ W6.3 C4 — THE POINT OF SÉCURITÉ. Pre-W6.3, this method took a raw `targetId` (the
// `internal_affairs_targets` PK) and looked it up with ZERO ownership check — no join on
// `player_id`, no `cooperators` containment, no `_hasReferentAccess` call. `playerId` served
// ONLY to debit the caller and stamp the row. `internal_affairs_targets` is GLOBAL and has no
// `player_id` column (the player↔target link is the SERVER-ONLY `cooperators` jsonb) — hoisting
// the OLD method onto a player route as-is would have been an IDOR of BOTH read and debit
// (W6.3 §1.3.3). ⇒ The signature changes: `targetId: string` → `actorRef: string, actorType:
// IATargetType`, and the FIRST statement of the method is now the ownership guard —
// `IATargetService.resolveOwnedTarget` (REUSE, `_hasReferentAccess` verbatim underneath) —
// BEFORE the old lookup, BEFORE the debit. A caller who names a referent they do not own gets
// 404, and NOTHING is debited or written.
//
// `buyApproxBandReveal(playerId, actorRef, actorType)`:
//   0. [W6.3 C4] Resolve `{ target_id }` via `IATargetService.resolveOwnedTarget` — 404 if
//      `playerId` does not legitimately own `actorRef`, OR no target row exists yet (nothing to
//      reveal). This is BEFORE any other read.
//   1. Read target from DB by the RESOLVED `target_id` (server-side lookup — never a client id).
//   2. Read 3 band cut-points from registry (R2.3 — NO literal inline):
//        bandCutWatching      = tunables.intelBandCutWatching          (0.30 [PROV-Y26Q2])
//        bandCutInvestigating = tunables.openInvestigationThreshold    (0.60, existing key)
//        bandCutRevealing     = tunables.discoverySecondSuspicionThreshold (0.85, existing key)
//   3. Map suspicion_level → IATargetSuspicionBandBucket via pure function (deterministic):
//        silent:        suspicion_level < bandCutWatching
//        watching:      bandCutWatching <= level < bandCutInvestigating
//        investigating: bandCutInvestigating <= level < bandCutRevealing
//        revealing:     level >= bandCutRevealing
//   4. Read cost from registry: internal_affairs.intel_purchase_cost_cents (R2.3 getter).
//   5. Atomically debit from economy_states.cash_cents (guarded: 402 if insufficient).
//      Pattern mirrors LegalCaseRepository.debitCash (legal-case.repository.ts:605).
//   6. Insert ia_intel_purchases row with revealed_band + cost_cents.
//   7. Return { purchaseId, band, costCents } — NEVER suspicion_level (R2.2/P5).
//
// R2.3 — ALL 3 band cut-points are registry-sourced (NO literal inline):
//   - bandCutWatching:      `internal_affairs.intel_band_cut_watching` (new key, gdd/14 §IA C7)
//   - bandCutInvestigating: `internal_affairs.open_investigation_threshold` (existing key C2)
//   - bandCutRevealing:     `internal_affairs.discovery_second_suspicion_threshold` (existing key C2 decision #3)
// R2.2/P5: suspicion_level is SERVER-ONLY (never in the return value or any client endpoint).
// Determinism: NO Math.random(), NO Date.now(). Band = pure function of DB state + registry cuts.

import { Injectable, Logger, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { ApiError } from '../../protocol/api-error';
import { internalAffairsTarget, iaIntelPurchase } from '../../db/schema/internal_affairs';
import { economyState } from '../../db/schema/player_economy_state';
import { IATunables } from './ia.tunables';
import { IATargetService, type IATargetType } from './ia-target.service';

// ── IATargetSuspicionBandBucket ───────────────────────────────────────────────────────────────────

/**
 * The player-facing suspicion band bucket.
 *
 * R2.2/P5: the RAW `suspicion_level` float is SERVER-ONLY. This bucket is the ONLY revelation
 * the player can obtain via the paid Fixer intel-op. The band CANNOT be decoded back to the float.
 *
 * - `silent`       : no visible IA pressure.
 * - `watching`     : low-level alert (IA is passive-monitoring).
 * - `investigating`: active probe (investigation open — surveillance window running).
 * - `revealing`    : near-discovery (suspicion critically high).
 *
 * Mirrors the `ia_suspicion_band` pgEnum in db/schema/internal_affairs.ts.
 */
export type IATargetSuspicionBandBucket = 'silent' | 'watching' | 'investigating' | 'revealing';

/**
 * Pure function: suspicion_level + registry cut-points → IATargetSuspicionBandBucket.
 *
 * Deterministic: same inputs → same output. NO Math.random, NO Date.now.
 * R2.2/P5: the float is consumed server-side only — the bucket is the output.
 * R2.3: cut-points come from the registry (callers must pass tunable values, not literals).
 *
 * @param suspicionLevel       - Server-only float 0..1 (from internal_affairs_targets.suspicion_level).
 * @param bandCutWatching      - `internal_affairs.intel_band_cut_watching` (default 0.30) [PROV-Y26Q2].
 * @param bandCutInvestigating - `internal_affairs.open_investigation_threshold` (default 0.60).
 * @param bandCutRevealing     - `internal_affairs.discovery_second_suspicion_threshold` (default 0.85).
 *
 * @internal — exported for C8 IAProjectionService reuse (P5 wall band reveal).
 *             C8 MUST pass the same tunable values (not literals) when calling this function.
 */
export function suspicionLevelToBand(
  suspicionLevel: number,
  bandCutWatching: number,
  bandCutInvestigating: number,
  bandCutRevealing: number,
): IATargetSuspicionBandBucket {
  if (suspicionLevel >= bandCutRevealing)     return 'revealing';
  if (suspicionLevel >= bandCutInvestigating) return 'investigating';
  if (suspicionLevel >= bandCutWatching)      return 'watching';
  return 'silent';
}

// ── IAIntelPurchaseResult ─────────────────────────────────────────────────────────────────────────

/**
 * Return value of `buyApproxBandReveal`.
 *
 * R2.2/P5: `suspicion_level` is ABSENT. Only the band bucket is returned.
 * The purchase_id is provided for E2E assertion (row existence proof).
 * costCents is a clear transaction value (DD-P5: player-facing cash information).
 */
export interface IAIntelPurchaseResult {
  /** The ia_intel_purchases row PK (for E2E assertion — row existence proof). */
  readonly purchaseId: string;
  /**
   * The suspicion band revealed — the ONLY numeric-adjacent information the player receives.
   * NEVER the raw `suspicion_level` float (R2.2/P5).
   */
  readonly band: IATargetSuspicionBandBucket;
  /**
   * Cash cost in cents (clear transaction value, player-visible per DD-P5).
   * Matches the debited amount from economy_states.cash_cents.
   */
  readonly costCents: number;
}

// ── IAIntelPurchaseService ────────────────────────────────────────────────────────────────────────

@Injectable()
export class IAIntelPurchaseService {
  private readonly logger = new Logger(IAIntelPurchaseService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: IATunables,
    private readonly iaTarget: IATargetService,
  ) {}

  /**
   * `buyApproxBandReveal` — Fixer-mediated intel-op: reveals the target's suspicion band.
   *
   * Called DIRECTLY by the game layer. The Fixer (lieutenant-archetype.ts:65 role_id 11) is the
   * conceptual mediator, but there is NO DSL binding for it (projection-only label — plan gap #6).
   * This service IS the direct invocation path.
   *
   * Algorithm:
   *   0. [W6.3 C4 — THE GUARD] `IATargetService.resolveOwnedTarget(playerId, actorRef, actorType)`
   *      — 404 if `playerId` does not legitimately own `actorRef` (REUSE `_hasReferentAccess`
   *      verbatim), OR if no target row exists for it. This happens BEFORE step 1, BEFORE the
   *      debit at step 5 — no circularity: `IAIntelPurchaseService` and `IATargetService` are
   *      both providers of `InternalAffairsModule`.
   *   1. Read `suspicion_level` from DB for the RESOLVED `target_id` (server-only).
   *   2. Read 3 band cut-points from registry (R2.3 — NO literal inline):
   *        bandCutWatching      ← tunables.intelBandCutWatching          [PROV-Y26Q2]
   *        bandCutInvestigating ← tunables.openInvestigationThreshold    (existing key)
   *        bandCutRevealing     ← tunables.discoverySecondSuspicionThreshold (existing key)
   *   3. Map → IATargetSuspicionBandBucket (pure function, NO Math.random, NO literals).
   *   4. Read `ia_intel_purchase_cost_cents` from registry (R2.3 getter, never inline).
   *   5. Atomically debit from `economy_states.cash_cents`:
   *      UPDATE economy_states SET cash_cents = cash_cents - cost
   *      WHERE player_id = playerId AND cash_cents >= cost
   *      If 0 rows updated → HTTP 402 (insufficient funds).
   *   6. INSERT ia_intel_purchases row (purchaseId, playerId, targetId, revealed_band, cost_cents).
   *   7. Return { purchaseId, band, costCents } — NO `suspicion_level` (R2.2/P5).
   *
   * R2.2/P5: `suspicion_level` is SERVER-ONLY. The band IS the only revelation.
   * R2.3: ALL tunables (cost + 3 band cuts) are registry getters only, NO literals.
   * Determinism: NO Math.random, NO Date.now. Band = pure function of DB state + registry.
   *
   * @throws ApiError('RESOURCE_NOT_FOUND') if `playerId` does not own `actorRef`, or no target exists.
   * @throws HttpException(402) if insufficient cash balance.
   */
  async buyApproxBandReveal(
    playerId: string,
    actorRef: string,
    actorType: IATargetType,
  ): Promise<IAIntelPurchaseResult> {
    // ── 0. [W6.3 C4] THE GUARD — BEFORE any lookup, BEFORE any debit ────────────────────────────
    // `resolveOwnedTarget` REUSEs `_hasReferentAccess` verbatim (`ia-target.service.ts:516-551`):
    // deny-by-default for the 3 reserved-inert types, owner-scoped join for `lawyer`/`clerk`.
    // A referent `playerId` does not own, OR one with no accrued suspicion (no target row yet),
    // both resolve to the SAME 404 — existence-masking, the same convention every other player
    // route in this codebase applies (D7).
    const owned = await this.iaTarget.resolveOwnedTarget(playerId, actorRef, actorType);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `No IA target reachable for actorRef=${actorRef} (actorType=${actorType}) owned by this player.`,
      });
    }
    const targetId = owned.target_id;

    // ── 1. Read target suspicion_level (server-only) — by the RESOLVED target_id ────────────────
    const [targetRow] = await this.db
      .select({
        target_id:       internalAffairsTarget.target_id,
        suspicion_level: internalAffairsTarget.suspicion_level,  // SERVER-ONLY (R2.2/P5)
      })
      .from(internalAffairsTarget)
      .where(eq(internalAffairsTarget.target_id, targetId))
      .limit(1);

    if (!targetRow) {
      // Unreachable in practice — `resolveOwnedTarget` already proved this row exists a moment
      // ago (charte ch27: no concurrent test workers). Kept as a defensive 404, not an assert.
      throw new HttpException(
        `IA target ${targetId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // ── 2. Read band cut-points from registry (R2.3 — NO literal inline) ────────────────────────
    //
    // All 3 cut-points are registry-sourced (gdd/14 §Internal Affairs):
    //   bandCutWatching:      NEW key `internal_affairs.intel_band_cut_watching` (0.30 [PROV-Y26Q2])
    //   bandCutInvestigating: existing key `internal_affairs.open_investigation_threshold` (0.60)
    //   bandCutRevealing:     existing key `internal_affairs.discovery_second_suspicion_threshold` (0.85)
    //
    // Canonical reuse: the band ladder is architecturally aligned with the investigation lifecycle
    // thresholds. The same thresholds that trigger investigation opening and discovery also drive
    // the player-facing band projection. No literal 0.30, 0.60, or 0.85 in this method (R2.3).
    const bandCutWatching      = this.tunables.intelBandCutWatching;              // 0.30 [PROV-Y26Q2]
    const bandCutInvestigating = this.tunables.openInvestigationThreshold;        // 0.60
    const bandCutRevealing     = this.tunables.discoverySecondSuspicionThreshold; // 0.85

    // ── 3. Map suspicion_level → band (pure function, SERVER-SIDE only) ─────────────────────────
    // The suspicion_level float is consumed here and discarded — the band bucket is ALL that
    // surfaces from this computation (R2.2/P5).
    const band = suspicionLevelToBand(
      targetRow.suspicion_level,
      bandCutWatching,
      bandCutInvestigating,
      bandCutRevealing,
    );

    // ── 4. Read cost from registry (R2.3: getter, never inline) ─────────────────────────────────
    const costCents = this.tunables.intelPurchaseCostCents; // 800000 default ($8k)

    // ── 5. Atomically debit from economy_states (guarded by WHERE cash_cents >= cost) ──────────
    // Pattern: LegalCaseRepository.debitCash (legal-case.repository.ts:605).
    // No negative-balance: the WHERE clause prevents debit below 0.
    const debitResult = await this.db
      .update(economyState)
      .set({ cash_cents: sql`${economyState.cash_cents} - ${BigInt(costCents)}` })
      .where(
        and(
          eq(economyState.player_id, playerId),
          sql`${economyState.cash_cents} >= ${BigInt(costCents)}`,
        ),
      )
      .returning({ cash_cents: economyState.cash_cents });

    if (debitResult.length === 0) {
      // 402 Payment Required: the player cannot afford the intel op.
      throw new HttpException(
        `Insufficient funds: Fixer intel-op costs ${costCents} cents (${costCents / 100} in-game dollars)`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // ── 6. Insert ia_intel_purchases row ─────────────────────────────────────────────────────────
    const [purchaseRow] = await this.db
      .insert(iaIntelPurchase)
      .values({
        player_id:     playerId,
        target_id:     targetId,
        revealed_band: band,
        cost_cents:    BigInt(costCents),
      })
      .returning({ purchase_id: iaIntelPurchase.purchase_id });

    this.logger.log(
      `[IAIntelPurchaseService] buyApproxBandReveal: ` +
        `player=${playerId} target=${targetId} band=${band} ` +
        `costCents=${costCents} purchaseId=${purchaseRow.purchase_id}. ` +
        `R2.2/P5: suspicion_level NOT returned (band bucket only). ` +
        `R2.3: ALL cuts from registry (watchingCut=${bandCutWatching} ` +
          `investigatingCut=${bandCutInvestigating} revealingCut=${bandCutRevealing}). ` +
        `Fixer: DIRECT service call (projection-only label, no DSL binding — plan gap #6). ` +
        `Deterministic: NO Math.random, NO Date.now.`,
    );

    // ── 7. Return { purchaseId, band, costCents } ── NEVER suspicion_level ───────────────────────
    return {
      purchaseId: purchaseRow.purchase_id,
      band,
      costCents,
    };
  }
}
