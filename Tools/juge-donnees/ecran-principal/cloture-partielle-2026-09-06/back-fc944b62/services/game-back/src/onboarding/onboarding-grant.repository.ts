// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1a-onboarding-funnel-design.md §4 chunk C3 (D10/D10.1/D10.2)
//             -- W1.1-a C3 -- 2026-08-09 --
//
// `OnboardingGrantRepository` — the chemin d'écriture NEUF the welcome grant needs (design §0.3-bis:
// NO existing production write-site ever seeds `building_operational_state.conversion_stage =
// 'operational'` DIRECTLY — the only other site is the tick-driven `applySetupBatch` flip,
// `real-estate.repository.ts:497-517`, which never runs in production, §0.6). This repository owns
// EXACTLY these two INSERTs and nothing else (D10) — it does NOT debit `economy_states` (D6, the
// grant is FREE — no cost to make lie), does NOT touch `RealEstateRepository` (BL-2, explicitly
// rejected by the ⊥ review — the capacity is NEVER added to the shared operational domain).
//
// ★★ STRUCTURAL GUARD (D10.2) — see `onboarding-grant.service.ts`'s header for the full account: this
// class is declared in `providers:` and ABSENT from `exports:` in every module that needs it
// (AuthModule this chunk; SessionModule re-provisions the SAME pair later, C6). Un-injectable outside
// those two modules — a boot-time DI failure, not a review miss.
//
// `executor?: OnboardingGrantTx` — the optional-tx-threading idiom this dépôt already NAMES as its own
// house form (design §0.11): `core_loops/demolition/friction-budget.repository.ts:86,177-178` +
// `replacement-option.repository.ts:8,29,74`. Type extracted via `Parameters<…>` (never guessed);
// omitted → falls back to `this.db`; threaded → the caller's ALREADY-OPEN transaction (here: the
// grant's own tx, opened by `OnboardingGrantService.grantWelcomeAssets` — D1.1 pt 2, the whole grant
// commits or rolls back as ONE unit, claim included).

import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { building } from '../db/schema/city_state';
import { buildingOperationalState } from '../db/schema/operational_chain';
import type { M1OperationalType } from '../operational/real_estate/conversion-tunables';

/** ★ the Drizzle transaction-callback client type — verbatim the `FrictionTx`/`money-holding.ts:46`
 *  extraction idiom (design §0.11, IM-1): NEVER guessed, always `Parameters<...>` off the real
 *  `DrizzleClient['transaction']` signature. */
export type OnboardingGrantTx = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

/** The params `insertOperationalBuilding` needs for ONE building — everything the caller (the
 *  service, which owns the 4-building loop + the tunable/clock resolution, R2.3) has already
 *  resolved into plain values; this repository does no tunable/clock reads of its own (D10 —
 *  "ces deux INSERT et rien d'autre"). */
export interface OnboardingBuildingGrantParams {
  playerId: string;
  blockId: number;
  buildingTypeIndex: number;
  operationalType: M1OperationalType;
  /** `buildings.acquired_at_tick` — mirrors `real-estate.repository.ts:216`'s COALESCE(game_minute, 0);
   *  resolved once by the caller (a fresh account has no `city_sim_clock` row, design §0.6). */
  gameMinute: number;
  /** `building_operational_state.last_maintained_at_game_day` — mirrors `applySetupBatch:512`'s
   *  `gameDay` bind param; MUST be posed in the SAME insert as `maintenanceDueInDays` below (D10.1 —
   *  posing one without the other creates one of two distinct maintenance-exemption defects). */
  gameDay: number;
  /** `building_operational_state.maintenance_due_in_days` — I7, `conversionTunables.
   *  initialMaintenanceIntervalDays`, resolved by the caller (R2.3 — the service resolves tunables,
   *  the repository takes plain numbers, `conversion-tunables.ts`'s own header convention). */
  maintenanceDueInDays: number;
}

@Injectable()
export class OnboardingGrantRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Insert ONE already-OPERATIONAL building — the two rows design D10's table specifies:
   *   `buildings`                 → ownership='player', structural_state='operational',
   *                                  acquired_at_tick=gameMinute (mirrors :216)
   *   `building_operational_state` → conversion_stage='operational' DIRECTLY (the capacity new to
   *                                  this lot, §0.3-bis) + setup_remaining_ticks=0 (conversion is
   *                                  already finished) + became_operational_at=now() (mirrors
   *                                  applySetupBatch:511) + the two maintenance columns TOGETHER
   *                                  (D10.1). `structural_state`/`cover_quality`/`cold_storage_capable`/
   *                                  `lab_tier`/`hub_tier`/`lapse_phase` are left to their schema
   *                                  DEFAULTS (all already 'operational-building-day-1'-correct — the
   *                                  D10 table does not name them, so this repository does not
   *                                  override them).
   * NO debit anywhere (D6 — the grant is free; `economy_states` is never referenced by this file).
   */
  async insertOperationalBuilding(
    params: OnboardingBuildingGrantParams,
    executor?: OnboardingGrantTx,
  ): Promise<{ buildingId: string }> {
    const tx = executor ?? this.db;

    const [row] = await tx
      .insert(building)
      .values({
        player_id: params.playerId,
        block_id: params.blockId,
        building_type: params.buildingTypeIndex,
        ownership: 'player',
        structural_state: 'operational',
        acquired_at_tick: params.gameMinute,
      })
      .returning({ building_id: building.building_id });

    await tx.insert(buildingOperationalState).values({
      building_id: row.building_id,
      player_id: params.playerId,
      operational_type: params.operationalType,
      // The capacity NEW to this lot (design §0.3-bis) — every other production write-site seeds
      // 'gutting' (`debitAndCreateOperationalState:358`); this is the ONLY site that seeds
      // 'operational' directly, and it is reachable ONLY through this repository (D10.2).
      conversion_stage: 'operational',
      setup_remaining_ticks: 0, // the conversion is already finished — nothing left to tick.
      became_operational_at: sql`now()`, // mirrors applySetupBatch:511
      // D10.1 — the two maintenance columns land TOGETHER, in this SAME insert. Posing one without
      // the other creates one of two distinct defects (either "exempt from maintenance forever" or
      // "overdue on day one") — never split across two writes.
      maintenance_due_in_days: params.maintenanceDueInDays,
      last_maintained_at_game_day: params.gameDay,
    });

    return { buildingId: row.building_id };
  }
}
