// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C5 (endpoints list/
//             pick — the pick-shortcut into the EXISTING purchase flow, zero new purchase write-path)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §7 (★#5:
//             "il pré-résout (block, type) et délègue — zéro nouveau write-path d'achat") + §15
//             (`GET /v1/friction/replacement-options` / `POST /v1/friction/replacement-options/:id/pick`).
//             Pattern: `DecommissionService` (confirm-guard-then-repo-call shape) + `RealEstateController
//             #purchase` (the governor.commit wrap this pick delegates through, at the CONTROLLER layer —
//             see `replacement-option.controller.ts`, this service does NOT call the governor itself).
//             — P3-E C5 — 2026-07-17
//
// `ReplacementOptionService` — `listOpenOptions` (buckets-only DTO) + `resolveAndClosePick` (the I9
// guarded close — 404 if the option doesn't exist/isn't the player's, 409 if it exists but is no longer
// open: already picked, already expired, or already closed as the LOSER of a concurrent sibling pick).
// `resolveAndClosePick` does NOT itself call the purchase flow — it returns the resolved (block, type)
// pair, which `ReplacementOptionController.pick` then feeds to `RealEstateService.purchase` wrapped in the
// SAME `StructuralDecisionGovernorService.commit(BUILDING_ACQUISITION, ...)` the real
// `POST /v1/operational/building/purchase` endpoint uses (design §7: "le précédent exact du «replace»
// 04f-A ... the player's OWN follow-up purchase/convert call, not a new endpoint" — the governance wrap is
// PART of "the existing purchase flow", not a bypass of it).

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { ApiError } from '../../protocol/api-error';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { BUILDING_TYPE_ORDER } from '../../operational/real_estate/real-estate.service';
import type { M1OperationalType } from '../../operational/real_estate/conversion-tunables';
import { ReplacementOptionRepository, type OpenReplacementOptionRow } from './replacement-option.repository';

/** R2.2-safe list DTO — the qualitative buckets ONLY, plus the type identity a player needs to actually
 *  choose between the 2 options (a type name is not a "raw scalar" — it is the categorical descriptor the
 *  whole player-facing purchase flow already surfaces, e.g. `convert()`'s own `operational_type` body key).
 *  snake_case fields (this codebase's own wire-body convention, `BuildingOperationalProjection`'s own
 *  `setup_state`/`cover_band`/`operational_type` precedent) — this type IS the wire shape, the controller
 *  returns it unchanged (mirrors `real-estate.projection.service.ts`'s own DTO-owns-the-wire-shape idiom). */
export interface ReplacementOptionDto {
  readonly id: string;
  readonly freed_block_id: number;
  readonly candidate_building_type: string;
  readonly rank: 1 | 2;
  readonly projected: Record<string, unknown>;
}

function toDto(row: OpenReplacementOptionRow): ReplacementOptionDto {
  return {
    id: row.id,
    freed_block_id: row.freedBlockId,
    candidate_building_type: BUILDING_TYPE_ORDER[row.candidateBuildingTypeIndex] ?? 'unknown',
    rank: row.rank,
    projected: row.projected,
  };
}

@Injectable()
export class ReplacementOptionService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly repo: ReplacementOptionRepository,
  ) {}

  /** `GET /v1/friction/replacement-options` (§15) — the player's OPEN options, optionally scoped to one
   *  `freedBlockId` (query filter). */
  async listOpenOptions(playerId: string, freedBlockId?: number): Promise<ReplacementOptionDto[]> {
    const rows = await this.repo.listOpen(playerId, freedBlockId);
    return rows.map(toDto);
  }

  /**
   * The I9 guarded resolve+close (★#5 "pré-résout (block, type) et délègue"). 404 `RESOURCE_NOT_FOUND` if
   * `optionId` isn't a replacement option belonging to this player; 409 `REPLACEMENT_OPTION_ALREADY_CLOSED`
   * if it exists but the guarded close matched 0 rows for it (already picked / already expired / closed as
   * the loser of a concurrent sibling pick, I9). On success: the sibling (same `source_building_id`) is
   * ALSO closed in the SAME statement (I9 — "ferme la sœur même statement"); returns `{ freedBlockId,
   * candidateBuildingType }` for the caller to feed into the EXISTING purchase flow.
   */
  async resolveAndClosePick(playerId: string, optionId: string): Promise<{ freedBlockId: number; candidateBuildingType: string }> {
    const existing = await this.repo.getForPlayer(optionId, playerId);
    if (!existing) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `replacement option ${optionId} does not exist for this player.` });
    }

    const gameMinute = await this.currentGameMinute(playerId);
    const won = await this.repo.resolveAndClosePair(playerId, optionId, existing.source_building_id, gameMinute);
    if (!won) {
      throw new ApiError('REPLACEMENT_OPTION_ALREADY_CLOSED', {
        message: `replacement option ${optionId} is no longer open (already picked, expired, or closed by a concurrent pick).`,
      });
    }

    const candidateBuildingType = BUILDING_TYPE_ORDER[won.candidateBuildingTypeIndex] as M1OperationalType | undefined;
    if (!candidateBuildingType) {
      // Defensive — candidate_building_type is ALWAYS a valid BUILDING_TYPE_ORDER index (the scorer's own
      // invariant, replacement-option-scorer.ts) — never reached on a genuine row.
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `replacement option ${optionId} has a corrupt candidate type index.` });
    }
    return { freedBlockId: won.freedBlockId, candidateBuildingType };
  }

  /** The player's current game-minute (the SAME `COALESCE(..., 0)` fallback `DecommissionRepository`/
   *  `RealEstateRepository` already establish for a player with no `city_sim_clock` row yet). */
  private async currentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db.select({ game_minute: citySimClock.game_minute }).from(citySimClock).where(eq(citySimClock.player_id, playerId)).limit(1);
    return rows[0]?.game_minute ?? 0;
  }
}
