// IMPLEMENTS: docs/superpowers/specs/2026-06-06-phase-03-grow-house-design.md §4-T2 (GrowService + controller —
//             POST /v1/operational/grow-house/:id/plant; the PLANT action of the grow_house cultivation loop) +
//             docs/tech/09_data_model/schema_operational_chain.md §7.11 (grow_session — current_stage='stage_1' at
//             plant, started_at_tick, T0) +
//             docs/tech/04a_operational_systems/real_estate.md §202 (the M1 money convention the seed cost reuses)
//             -- session:2026-06-06 (Phase 3 vector #3 — grow_house — Task 2) --
//
// `GrowService` — the player-triggered PLANT action of the grow_house cultivation loop (T2). A grow_house is built
// (Spine/Verge, T1); this action pays a cheap SEED cost and starts a `grow_session` at stage_1 (the grow cycle / tend /
// harvest are T3-T5). The seed cost is deliberately well below the equivalent precursor ORDER cost (the make-vs-buy
// saving — grow cheap-but-slow-and-hot vs order fast-but-dear).
//
// THE ACTION (GrowService.plant(playerId, buildingId, precursorType)):
//   1) VALIDATE: read the player's building_operational_state row. Not owned / not converted (no row) → 404
//      RESOURCE_NOT_FOUND. The row exists but operational_type ≠ 'grow_house' → 409 RESOURCE_STATE_CONFLICT (WRONG_TYPE —
//      only a grow_house cultivates; a lab/stash/specialized_lab cannot plant). This matches the existing operational
//      error conventions (404 not-found/not-owned, 409 wrong-state — SpecializedLabService / RepairService precedent).
//   2) PRECURSOR GATE: the chosen precursor must be GROWABLE (plant-derived: verdant_root_extract / lull_resin /
//      glass_lily — T1's isGrowablePrecursor). A non-growable precursor (the synthetic pyralin/thalmite/garnet_salt, or
//      an unknown string) → 422 VALIDATION_FAILED.
//   3) ALREADY_GROWING GATE: one active grow per building (schema §7.11). An existing in-progress grow_session on this
//      building → 409 RESOURCE_STATE_CONFLICT (ALREADY_GROWING — finish/harvest it first).
//   4) DEBIT + START (atomic, guarded — REUSE the specialized-lab / repair guarded-debit pattern): debit economy_states
//      by the seed cost with a `cash_cents >= cost` guard IN the UPDATE. Insufficient balance → 409
//      RESOURCE_STATE_CONFLICT (INSUFFICIENT_FUNDS — no state change, the tx rolls back). Success → INSERT a stage_1
//      grow_session (started_at_tick = stage_started_at_tick = the player's current tick, tend_count 0) in the SAME tx.
//
// IDEMPOTENCY: the mutating POST is subject to the existing IdempotencyInterceptor (REUSE — a retried plant with the same
// Idempotency-Key replays the memorized response, NO re-execution → no double-debit / no duplicate grow_session). This
// service does not re-implement idempotency; it just runs the guarded transaction (the interceptor wraps the handler,
// exactly as it wraps the upgrade-tier / repair / purchase / convert POSTs).

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { isGrowablePrecursor } from '../substance/substance-config';
import { GrowRepository, type GrowPrecursorType } from './grow.repository';
import { seedCostCents } from './grow-tunables';

@Injectable()
export class GrowService {
  private readonly logger = new Logger(GrowService.name);

  constructor(private readonly repo: GrowRepository) {}

  /**
   * Plant a growable precursor in a player-owned grow_house (the cultivation loop's PLANT action). Validates ownership +
   * the grow_house type + the growable precursor + no active grow on this building, debits the grounded seed cost
   * atomically-guarded, and INSERTs a stage_1 grow_session in the SAME tx.
   *
   * Errors (the existing operational conventions): not owned / not converted (no operational row) → 404
   * RESOURCE_NOT_FOUND; not a grow_house → 409 RESOURCE_STATE_CONFLICT (WRONG_TYPE); a non-growable precursor → 422
   * VALIDATION_FAILED; an active grow already on this building → 409 RESOURCE_STATE_CONFLICT (ALREADY_GROWING);
   * insufficient cash → 409 RESOURCE_STATE_CONFLICT (INSUFFICIENT_FUNDS, no change).
   *
   * Returns { grow_session_id } (the new grow id — NOT the raw seed cents / post-debit balance; R2.2 — the player
   * surface is the qualitative grow projection added in T7).
   */
  async plant(
    playerId: string,
    buildingId: string,
    precursorType: string,
  ): Promise<{ grow_session_id: string }> {
    const normalizedPrecursor = String(precursorType ?? '').toLowerCase();

    const state = await this.repo.getPlantTargetState(playerId, buildingId);
    if (!state) {
      // No operational-state row for this player+building → not owned / not converted.
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${buildingId} is not a player-owned operational building for this player.`,
      });
    }
    if (state.operational_type !== 'grow_house') {
      // Only a grow_house cultivates — a lab/stash/specialized_lab has no grow lever.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} is not a grow_house (operational_type='${state.operational_type}') — only a grow_house can plant.`,
      });
    }

    // The chosen precursor must be plant-derived (T1's registry-derived growable set) — a synthetic / unknown → 422.
    if (!isGrowablePrecursor(normalizedPrecursor)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `precursor_type must be a GROWABLE plant-derived precursor (VERDANT_ROOT_EXTRACT | LULL_RESIN | GLASS_LILY), got "${precursorType}".`,
      });
    }

    // One active grow per building (schema §7.11) — an in-progress grow_session blocks a second plant.
    if (await this.repo.hasActiveGrowSession(playerId, buildingId)) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} already has an active grow — harvest it before planting again.`,
      });
    }

    const cost = seedCostCents(); // R2.3: grow.seed_cost_ratio × the STANDARD conversion reference (NOT inline).
    const currentTick = await this.repo.getCurrentTick(playerId);

    const result = await this.repo.debitSeedAndCreateGrowSession({
      playerId,
      buildingId,
      precursorType: normalizedPrecursor as GrowPrecursorType, // narrowed by isGrowablePrecursor above.
      seedCostCents: cost,
      currentTick,
    });
    if (result === null) {
      // The guarded debit affected 0 rows → insufficient balance (the wallet would have gone negative). No state change.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Insufficient cash to cover the seed cost.',
      });
    }

    this.logger.log(
      `plant: player=${playerId} building=${buildingId} precursor=${normalizedPrecursor} ` +
        `→ grow_session=${result.growSessionId} (stage_1 @${currentTick})`,
    );
    return { grow_session_id: result.growSessionId };
  }

  /**
   * Tend a player-owned in-progress grow_session (husbandry lever B — one tend banked per stage). Validates the
   * grow_session exists AND belongs to this player (404 RESOURCE_NOT_FOUND — a foreign / nonexistent id is invisible),
   * is NOT completed (409 — a completed grow awaits harvest, cannot be tended), and is NOT already tended in the CURRENT
   * stage (409 ALREADY_TENDED). On success the atomic guarded UPDATE bumps tend_count by one and stamps
   * tended_in_stage = current_stage (the per-stage guard `tended_in_stage IS DISTINCT FROM current_stage` is INSIDE the
   * UPDATE → a double-call can never double-count). One tend per stage; tend_count max = stage_count over the cycle.
   *
   * IDEMPOTENCY: the mutating POST is subject to the existing IdempotencyInterceptor (REUSE — a retried tend with the
   * same Idempotency-Key replays the memorized response, NO re-execution). Even WITHOUT idempotency, the per-stage guard
   * keeps tend_count bounded to one increment per stage (the interceptor and the guard are belt-and-braces).
   *
   * Returns { tended: true } (NOT the raw tend_count — R2.2; the player surface is the qualitative husbandry projection
   * added in T7).
   */
  async tend(playerId: string, growSessionId: string): Promise<{ tended: true }> {
    const state = await this.repo.getTendTargetState(playerId, growSessionId);
    if (!state) {
      // No grow_session with this id for THIS player → not found / not owned (cross-player invisible).
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `grow_session ${growSessionId} is not a grow owned by this player.`,
      });
    }
    if (state.current_stage === 'completed') {
      // A completed grow awaits T5 harvest — it has no tendable stage left.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `grow_session ${growSessionId} is completed — a completed grow cannot be tended.`,
      });
    }

    const outcome = await this.repo.tendGrowSession(playerId, growSessionId);
    if (outcome.result === 'completed') {
      // The grow advanced to completed between the validation read and the guarded UPDATE (a benign race).
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `grow_session ${growSessionId} is completed — a completed grow cannot be tended.`,
      });
    }
    if (outcome.result === 'already_tended') {
      // The current stage is already tended (the per-stage guard refused) → ALREADY_TENDED, tend_count unchanged.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `grow_session ${growSessionId} is already tended in its current stage (one tend per stage).`,
      });
    }

    this.logger.log(`tend: player=${playerId} grow_session=${growSessionId} → tended (stage ${state.current_stage})`);
    return { tended: true };
  }
}
