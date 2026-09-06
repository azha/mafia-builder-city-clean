// IMPLEMENTS: docs/superpowers/plans/2026-07-10-p3-A-session-spine-plan.md §C6 (HL provider #1 —
//             DAMAGED_BUILDING_REPAIR)
//             Design: docs/superpowers/specs/2026-07-10-p3-A-session-spine-design.md §8 ("player
//             buildings in `structural_state='damaged'` (raid aftermath; impact ∝ building count
//             halted, urgency ∝ days damaged)").
//             Substrate (verified this chunk): `building_operational_state.structural_state`
//             (`operational_chain.ts:90` — Phase-2b raid/repair §7.4, the RAID-aftermath enum, DISTINCT
//             from `buildings.structural_state` city-state) written 'damaged' by
//             `raid.repository.ts` (executeRaid); `building_raid.raided_at_tick` (`operational_chain.
//             ts:324-336`) — one row per raid, the ONLY persisted timestamp for "how long damaged"
//             (game-minute tick, not a real timestamptz); `city_sim_clock.game_minute` — the player's
//             current in-game tick, REUSE the SAME "coalesce missing clock to 0" pattern as
//             `raid.repository.ts#getCurrentTick`.
//             — P3-A C6 — 2026-07-10
//
// `DamagedBuildingHlCardProvider` — ONE aggregate candidate (design's own "impact ∝ building COUNT
// halted" wording is aggregate, not per-building) when the player has ≥1 currently-damaged building:
//   impact  = damagedCount / totalOwnedCount (ratio — self-normalizing, no external magic number)
//   urgency = clamp(daysDamaged(oldest raid among damaged buildings) / horizonDays, 0, 1)
//     daysDamaged = (city_sim_clock.game_minute − oldestRaid.raided_at_tick) / 1440 (the codebase's
//     OWN 1440-game-minutes-per-day convention — verified `ia-decay.service.ts`/`legal-case.service.ts`
//     /`effluent-stoichiometry.service.ts`, all `Math.floor(gameMinute / 1440)`).
// Deterministic (D13): no Math.random, no Date.now — every input is persisted state (2 queries, both
// simple equality/inArray filters — no aggregation SQL needed at this per-player row cardinality).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { buildingOperationalState } from '../../../db/schema/operational_chain';
import { buildingRaid } from '../../../db/schema/operational_chain';
import { citySimClock } from '../../../db/schema/city_sim_clock';
import { coreLoopsTunables } from '../../../core_loops/core-loops-tunables';
import { clamp01, HL_CARD_PROVIDER_CATALOGUE, HlCardProviderType, type HlCardCandidate, type HlCardProvider } from '../hl-card-types';

const CATALOGUE_CODE = HL_CARD_PROVIDER_CATALOGUE.find((e) => e.key === HlCardProviderType.DAMAGED_BUILDING_REPAIR)!.code;

@Injectable()
export class DamagedBuildingHlCardProvider implements HlCardProvider {
  readonly providerType = HlCardProviderType.DAMAGED_BUILDING_REPAIR;

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  async getCandidates(playerId: string): Promise<HlCardCandidate[]> {
    const rows = await this.db
      .select({ buildingId: buildingOperationalState.building_id, structuralState: buildingOperationalState.structural_state })
      .from(buildingOperationalState)
      .where(eq(buildingOperationalState.player_id, playerId));

    const total = rows.length;
    const damagedIds = rows.filter((r) => r.structuralState === 'damaged').map((r) => r.buildingId);
    if (total === 0 || damagedIds.length === 0) return [];

    const raids = await this.db
      .select({ buildingId: buildingRaid.building_id, raidedAtTick: buildingRaid.raided_at_tick })
      .from(buildingRaid)
      .where(and(eq(buildingRaid.player_id, playerId), inArray(buildingRaid.building_id, damagedIds)));

    let oldestRaidTick: number | null = null;
    for (const r of raids) {
      if (oldestRaidTick === null || r.raidedAtTick < oldestRaidTick) oldestRaidTick = r.raidedAtTick;
    }

    const clockRows = await this.db
      .select({ gameMinute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    const gameMinute = clockRows[0]?.gameMinute ?? 0; // no clock row yet → 0 (mirrors raid.repository.ts#getCurrentTick)

    const daysDamaged = oldestRaidTick === null ? 0 : Math.max(0, (gameMinute - oldestRaidTick) / 1440);
    const horizonDays = coreLoopsTunables.hlDamagedBuildingUrgencyHorizonDays;

    return [
      {
        providerType: this.providerType,
        decisionTypeCode: CATALOGUE_CODE,
        impact: clamp01(damagedIds.length / total),
        urgency: clamp01(daysDamaged / horizonDays),
        targetRef: { entity: 'building_operational_state', building_ids: [...damagedIds].sort() },
        options: [
          { label: 'hl.option.damaged_building.repair_via_queue' },
          { label: 'hl.option.damaged_building.leave_damaged' },
        ],
      },
    ];
  }
}
