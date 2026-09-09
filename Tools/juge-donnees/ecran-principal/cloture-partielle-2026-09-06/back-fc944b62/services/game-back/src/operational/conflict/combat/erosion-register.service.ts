// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 5 (C5) Step 4
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §3.4
//             Canon: docs/tech/04b_combat_and_conflict/combat_mechanics.md §2.4 (Erosion Register)
//             — Combat & Escalation B C5 — 2026-06-25 —
//
// `ErosionRegisterService` — the §2.4 Erosion Register mechanic.
//
// degradeRegister(rivalKey, registerId, gameMinute):
//   - Decrements current_value_bucket one step (dominant→strong→standard→weakened→crippled).
//   - For MUSCLE/INFRASTRUCTURE: REUSES the raid path (DIV-B2) on the rival's held block.
//   - Always calls A's recordAttack (per-register pattern accrual, §3.6 Adaptive Skin).
//   - If registerId === vulnerable_axis: calls A's recordPressure (regime shift trigger, §3.1).
//   - Inserts a combat_event of type 'degrade_register'.
//
// getRegisters(rivalKey): returns 5 register entries with P6 strip (NO dominance_rank, NO vulnerable_axis).
//
// ensureRegisters: UPSERT 5 rows per rival at 'standard' (idempotent seed).
//
// degradeRegisterIntel: forward slot for C lot (STUB — not implemented in C5).
//
// DETERMINISM: no Math.random(), no Date.now(). Bucket steps are deterministic enum transitions.
// P6: dominance_rank + vulnerable_axis NEVER in public API (getRegisters strips them — the P6 wall).
// DIV-B2: MUSCLE/INFRASTRUCTURE degradation REUSES the live executeRaid path.
// Zero-regression: ADDITIVE only — no existing service modified (only new rows + new calls).

import { Injectable, Inject, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { rivalErosionRegister } from '../../../db/schema/conflict_rival';
import { RaidRepository } from '../../enforcement/raid.repository';
import { RegimeSwitchingService } from '../rival/regime-switching.service';
import { AdaptiveSkinService } from '../rival/adaptive-skin.service';
import { CombatRepository } from './combat.repository';
import type { RivalKey } from '../rival/rival-ai.types';

// ── ErosionRegisterId domain ──────────────────────────────────────────────────────────────────────

export type ErosionRegisterId = 'muscle' | 'finance' | 'intel' | 'infrastructure' | 'leadership';

/** All 5 erosion register ids (canon :195). */
export const EROSION_REGISTER_IDS: readonly ErosionRegisterId[] = [
  'muscle',
  'finance',
  'intel',
  'infrastructure',
  'leadership',
];

// ── RegisterValueBucket domain ────────────────────────────────────────────────────────────────────

export type RegisterValueBucket = 'crippled' | 'weakened' | 'standard' | 'strong' | 'dominant';

/** Ordered steps for the RegisterValueBucket — highest to lowest. */
const REGISTER_BUCKET_STEPS: ReadonlyArray<RegisterValueBucket> = [
  'dominant',
  'strong',
  'standard',
  'weakened',
  'crippled',
];

/**
 * Decrement a RegisterValueBucket one step (dominant→strong→standard→weakened→crippled).
 * At the floor 'crippled', returns 'crippled' (idempotent floor — no further degrade).
 * DETERMINISTIC: pure enum transition, no RNG.
 */
function decrementBucket(current: RegisterValueBucket): RegisterValueBucket {
  const idx = REGISTER_BUCKET_STEPS.indexOf(current);
  if (idx < 0) return 'crippled'; // unknown value → floor
  const nextIdx = Math.min(idx + 1, REGISTER_BUCKET_STEPS.length - 1);
  return REGISTER_BUCKET_STEPS[nextIdx]!;
}

/** Public projection shape for getRegisters (P6 — dominance_rank/vulnerable_axis stripped). */
export interface RegisterView {
  registerId: ErosionRegisterId;
  current_value_bucket: RegisterValueBucket;
}

@Injectable()
export class ErosionRegisterService {
  private readonly logger = new Logger(ErosionRegisterService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly combatRepo: CombatRepository,
    private readonly raidRepo: RaidRepository,
    private readonly regimeSwitching: RegimeSwitchingService,
    private readonly adaptiveSkin: AdaptiveSkinService,
  ) {}

  // ── Public API ────────────────────────────────────────────────────────────────────────────────

  /**
   * `ensureRegisters` — UPSERT the 5 erosion-register rows for (player, rival) at 'standard'.
   * Idempotent (ON CONFLICT DO NOTHING). Called before the first degradeRegister to guarantee rows.
   */
  async ensureRegisters(playerId: string, rivalKey: RivalKey): Promise<void> {
    for (const registerId of EROSION_REGISTER_IDS) {
      await this.db
        .insert(rivalErosionRegister)
        .values({
          player_id:            playerId,
          rival_key:            rivalKey,
          register_id:          registerId,
          current_value_bucket: 'standard',
        })
        .onConflictDoNothing();
    }
  }

  /**
   * `resetRegistersToStandard` — RESET the 5 erosion-register rows for (player, rival) to 'standard'.
   * Uses onConflictDoUpdate to OVERWRITE any prior degraded value (sticky-accumulator isolation).
   * TEST-ONLY: called from combat-test.controller.ts `reset-erosion-registers` route.
   */
  async resetRegistersToStandard(playerId: string, rivalKey: RivalKey): Promise<void> {
    for (const registerId of EROSION_REGISTER_IDS) {
      await this.db
        .insert(rivalErosionRegister)
        .values({
          player_id:            playerId,
          rival_key:            rivalKey,
          register_id:          registerId,
          current_value_bucket: 'standard',
        })
        .onConflictDoUpdate({
          target: [rivalErosionRegister.player_id, rivalErosionRegister.rival_key, rivalErosionRegister.register_id],
          set:    { current_value_bucket: 'standard' },
        });
    }
  }

  /**
   * `degradeRegister` — the core §2.4 Erosion Register degrade mechanic.
   *
   * 1. Ensures registers exist (idempotent UPSERT).
   * 2. Reads the current bucket for registerId.
   * 3. For MUSCLE/INFRASTRUCTURE: REUSES the raid path (DIV-B2) on the rival's first held block
   *    (via resolveTargetsOnBlock + executeRaid). The assault degrades the rival's infrastructure
   *    by targeting a block the rival holds.
   * 4. Always calls A's recordAttack with patternHash='erosion:'+registerId (per-register accrual).
   * 5. If registerId === vulnerable_axis: calls A's recordPressure('revenue', 'mounting') — the
   *    regime shift trigger (combat_mechanics.md :204).
   * 6. Decrements the bucket one step (deterministic).
   * 7. Writes the new bucket to the DB.
   * 8. Inserts a combat_event of type 'degrade_register'.
   *
   * DETERMINISM: no Math.random(), no Date.now(). gameMinute = game-time.
   * DIV-B2: REUSES the live executeRaid path for MUSCLE/INFRASTRUCTURE.
   */
  async degradeRegister(
    playerId: string,
    rivalKey: RivalKey,
    registerId: ErosionRegisterId,
    gameMinute: number,
  ): Promise<void> {
    // 1. Ensure rows exist.
    await this.ensureRegisters(playerId, rivalKey);

    // 2. Read current bucket.
    const currentBucket = await this.readRegisterBucket(playerId, rivalKey, registerId);

    // 3. For MUSCLE/INFRASTRUCTURE: REUSE the raid path (DIV-B2).
    //    Read the first rival holding to get a target block.
    if (registerId === 'muscle' || registerId === 'infrastructure') {
      await this.applyRaidForRegister(playerId, rivalKey, gameMinute);
    }

    // 4. Always call A's recordAttack (per-register pattern accrual — §3.6 Adaptive Skin).
    const patternHash = `erosion:${registerId}`;
    await this.adaptiveSkin.recordAttack(playerId, rivalKey, patternHash, gameMinute);

    // 5. If registerId === vulnerable_axis: call A's recordPressure (regime shift trigger).
    const state = await this.combatRepo.readRivalCombatState(playerId, rivalKey);
    if (state?.vulnerable_axis === registerId) {
      // Degrading the vulnerable axis triggers a regime pressure increase (§3.1 integration).
      // Canon (combat_mechanics.md :204) specifies degrading vulnerable_axis "causes regime shifts"
      // but is SILENT on the pressure source and magnitude.
      // [PROV-Y26Q2] source='revenue', magnitude='mounting' — provisional canon-silent mapping;
      // calibration deferred to the conflict-layer calibration TD (lot B closeout).
      await this.regimeSwitching.recordPressure(playerId, rivalKey, 'revenue', 'mounting');
    }

    // 6. Decrement the bucket one step.
    const newBucket = decrementBucket(currentBucket);

    // 7. Write the new bucket.
    await this.db
      .update(rivalErosionRegister)
      .set({ current_value_bucket: newBucket })
      .where(
        and(
          eq(rivalErosionRegister.player_id, playerId),
          eq(rivalErosionRegister.rival_key, rivalKey),
          eq(rivalErosionRegister.register_id, registerId),
        ),
      );

    // 8. Insert a combat_event of type 'degrade_register'.
    // created_at_minute: game-minute provides stable insertion-order sorting
    // (uuid v4 id is random, NOT time-ordered — migration 0093).
    await this.combatRepo.insertCombatEvent({
      player_id:               playerId,
      type:                    'degrade_register',
      target_rival_key:        rivalKey,
      target_block_id:         null, // register-level degrade; block is implementation detail
      target_register_id:      registerId,
      lieutenant_id:           null,
      friction_consumed_bucket: null,
      outcome_bucket:          null,
      heat_increment_bucket:   null, // no heat for non-raid registers (FINANCE/INTEL/LEADERSHIP)
      created_at_minute:       gameMinute,
    });

    this.logger.debug(
      `ErosionRegisterService.degradeRegister: player=${playerId} rival=${rivalKey} ` +
        `register=${registerId} ${currentBucket} → ${newBucket}` +
        (state?.vulnerable_axis === registerId ? ' [VULNERABLE AXIS — recordPressure fired]' : ''),
    );
  }

  /**
   * `getRegisters` — returns the 5 register views for (player, rival).
   *
   * P6 strip: NEVER returns dominance_rank or vulnerable_axis (the hidden ranking + axis are
   * server-side only — the player infers the strategic priority from the register state, §3.4 :206).
   * Returns only: registerId + current_value_bucket.
   *
   * If registers are not seeded yet, returns all 5 at 'standard' (virtual default — ensures the
   * projection never 404s for a player who hasn't attacked yet).
   */
  async getRegisters(playerId: string, rivalKey: RivalKey): Promise<{ registers: RegisterView[] }> {
    // Ensure rows exist so getRegisters never returns an empty list.
    await this.ensureRegisters(playerId, rivalKey);

    const rows = await this.db
      .select({
        register_id:          rivalErosionRegister.register_id,
        current_value_bucket: rivalErosionRegister.current_value_bucket,
      })
      .from(rivalErosionRegister)
      .where(
        and(
          eq(rivalErosionRegister.player_id, playerId),
          eq(rivalErosionRegister.rival_key, rivalKey),
        ),
      );

    // Sort in the canonical order (muscle, finance, intel, infrastructure, leadership).
    const bucketMap = new Map<string, string>(rows.map((r) => [r.register_id, r.current_value_bucket]));
    const registers: RegisterView[] = EROSION_REGISTER_IDS.map((id) => ({
      registerId:           id,
      current_value_bucket: (bucketMap.get(id) ?? 'standard') as RegisterValueBucket,
    }));

    // P6 strip: the response object ONLY carries registers (no dominance_rank, no vulnerable_axis).
    return { registers };
  }

  /**
   * `degradeRegisterIntel` — forward slot for C lot (intelligence / info-warfare degradation).
   *
   * [STUB / forward slot — C5 scope is MUSCLE + INFRASTRUCTURE + the per-register pattern.
   *  INTEL degradation via info-warfare is a C-lot mechanic (ReconnaissanceRegimeClassifierService).
   *  This stub registers the interface so C can wire it without a new method.]
   */
  async degradeRegisterIntel(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<void> {
    // C9 — info-warfare INTEL register degradation (the C-lot forward slot landing).
    // Degrades the 'intel' register one bucket step (dominant→strong→standard→weakened→crippled).
    // Signature stable (param names no longer prefixed with _ — forward slot landed).
    const currentBucket = await this.readRegisterBucket(playerId, rivalKey, 'intel');
    const newBucket = decrementBucket(currentBucket);
    if (newBucket === currentBucket) {
      // Already at floor 'crippled' — no write needed (write-amplification discipline).
      return;
    }
    await this.db
      .update(rivalErosionRegister)
      .set({ current_value_bucket: newBucket })
      .where(
        and(
          eq(rivalErosionRegister.player_id, playerId),
          eq(rivalErosionRegister.rival_key, rivalKey),
          eq(rivalErosionRegister.register_id, 'intel'),
        ),
      );
    this.logger.debug(
      `ErosionRegisterService.degradeRegisterIntel: player=${playerId} rival=${rivalKey} ` +
      `intel: ${currentBucket} → ${newBucket} (game-minute=${gameMinute})`,
    );
  }

  // ── Internals ─────────────────────────────────────────────────────────────────────────────────

  /**
   * Read the current RegisterValueBucket for (player, rival, register).
   * If no row (not yet seeded), returns 'standard' (the default nominal capacity).
   */
  private async readRegisterBucket(
    playerId: string,
    rivalKey: RivalKey,
    registerId: ErosionRegisterId,
  ): Promise<RegisterValueBucket> {
    const rows = await this.db
      .select({ current_value_bucket: rivalErosionRegister.current_value_bucket })
      .from(rivalErosionRegister)
      .where(
        and(
          eq(rivalErosionRegister.player_id, playerId),
          eq(rivalErosionRegister.rival_key, rivalKey),
          eq(rivalErosionRegister.register_id, registerId),
        ),
      )
      .limit(1);
    if (rows.length === 0) return 'standard';
    return (rows[0]!.current_value_bucket ?? 'standard') as RegisterValueBucket;
  }

  /**
   * `applyRaidForRegister` — REUSES the live raid path for MUSCLE/INFRASTRUCTURE degrade (DIV-B2).
   *
   * Reads the first rival_holding for (player, rival) to get a target block.
   * If no holding exists → dry raid (no-op for the raid path; the pattern accrual still fires).
   * Calls resolveTargetsOnBlock + executeRaid on the rival's held block.
   */
  private async applyRaidForRegister(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<void> {
    // Read from rival_holding to find the first held block for the target degrade.
    const { rivalHolding } = await import('../../../db/schema/conflict_rival');
    const holdings = await this.db
      .select({
        block_id:    rivalHolding.block_id,
        district_id: rivalHolding.district_id,
      })
      .from(rivalHolding)
      .where(
        and(
          eq(rivalHolding.player_id, playerId),
          eq(rivalHolding.rival_key, rivalKey),
        ),
      )
      .limit(1);

    if (holdings.length === 0) {
      this.logger.debug(
        `ErosionRegisterService.applyRaidForRegister: no rival_holding for player=${playerId} rival=${rivalKey} — dry raid (skipped).`,
      );
      return;
    }

    const { block_id: targetBlockId, district_id: districtId } = holdings[0]!;

    // REUSE the raid path (DIV-B2 — the same resolveTargetsOnBlock + executeRaid the patrol uses).
    const targets = await this.raidRepo.resolveTargetsOnBlock(playerId, targetBlockId);
    if (targets.length === 0) {
      this.logger.debug(
        `ErosionRegisterService.applyRaidForRegister: dry raid — no targets on block ${targetBlockId}.`,
      );
      return;
    }

    await this.raidRepo.executeRaid({
      playerId,
      districtId,
      targetBlockId,
      raidedAtTick: gameMinute,
      seizureFraction: 1.0,
      targets,
    });
  }
}
