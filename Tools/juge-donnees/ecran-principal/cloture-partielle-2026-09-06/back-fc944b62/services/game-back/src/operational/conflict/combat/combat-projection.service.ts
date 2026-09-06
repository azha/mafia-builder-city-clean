// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 12 (C-proj)
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §11.1
//             Canon: combat_mechanics.md §11 (CombatProjectionService — P6 wall)
//             Pattern: rival-projection.service.ts (A's C8 — the direct precedent to mirror)
//             — Combat & Escalation B C-proj — 2026-06-25 —
//
// `CombatProjectionService` — the ONLY path from B's hidden combat state to the player client.
//
// P6 wall invariant (§11.1 / R2.2):
//   `toCombatClientView(playerId, rivalKey)` reads the HIDDEN server-side combat scalars via
//   B's mechanic services and derives EXACTLY 8 player-facing closed bands. NO raw scalar
//   (base_friction_load / cumulative_pressure_index / system_criticality / familiarity_index /
//   conflict_memory_depth / dead_hand_reserve / trigger_threshold / cache_script_ref /
//   dominance_rank / vulnerable_axis / active_link_fraction / operational_graph_node_count /
//   resource_pressure) ever leaves this service. The returned `CombatClientView` shape is the
//   frozen projection contract C builds on.
//
// The 8 player-facing fields (§11.1 table):
//   1. activeLinkBand              — from PercolationService.getActiveLinkBand (P6 — raw fraction stripped)
//   2. registers[].valueBand       — from ErosionRegisterService.getRegisters (P6 — 5 registers, stripped)
//   3. sandpileBand                — from SandpileStateService.getSandpileCriticalityBand (raw criticality stripped)
//   4. flowRegime                  — from DownstreamGateService.getConflictFlowRegime (P5 exception — shown explicitly)
//   5. conflictMemoryBand          — from MaladaptiveMemoryService.getEscalationDepth (depth int stripped)
//   6. familiarityBand             — from FamiliarityDiscountService.getFamiliarityBucket (index float stripped)
//   7. deadHandIntelligenceRevealed— from CombatRepository.readDeadHand (boolean only — reserve/threshold stripped)
//   8. lastOutcomeBucket           — from the most recent combat_event outcome_bucket for (player, rival) (nullable)
//
// The rival is read via A's `toClientView` ONLY for the rival portion. B NEVER queries
// rival_state directly on the player path (the §13 contract / P6 wall held).
//
// C4 (determinism): NO Math.random(). NO Date.now(). Pure function of DB state + getters.
// R2.2: all raw scalar reads stay server-side; the returned CombatClientView has ZERO raw scalars.
// Zero-regression: PURELY ADDITIVE — reads from existing services; no live mechanic modified.

import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { combatEvent } from '../../../db/schema/conflict_combat';
import { PercolationService } from './percolation.service';
import { ErosionRegisterService } from './erosion-register.service';
import { SandpileStateService } from './sandpile-state.service';
import { DownstreamGateService } from './downstream-gate.service';
import { MaladaptiveMemoryService } from './maladaptive-memory.service';
import { FamiliarityDiscountService } from './familiarity-discount.service';
import { CombatRepository } from './combat.repository';
import type { RivalKey } from '../rival/rival-ai.types';
// Type import stays `from './combat.types'` — DELIBERATELY not repointed to `./combat-tunables`
// (design §6 B-1 geste 2): repointing would leave the `combat.types.ts` re-export with zero
// importers, so the FIRST cleanup pass could drop it, and the guard against a future re-declaration
// in that module would disappear with it. `combat.types.ts` now re-exports the SAME type
// (`combat-tunables.ts`'s `COMBAT_OUTCOME_BUCKETS`-derived one) — this import is unaffected.
import type { CombatOutcomeBucket } from './combat.types';
// The narrowing predicate lives only in `combat-tunables.ts` (never re-exported as a VALUE by
// `combat.types.ts`, which re-exports the TYPE only) — a second, separate import, not a repoint.
import { isCombatOutcomeBucket } from './combat-tunables';

// ─── CombatClientView — the frozen player-facing shape (P6 wall) ─────────────────────────────
//
// EXACTLY 8 keys. NO raw scalar. NO combat field (HP/attack/defense/damage).
// This is the ONLY object shape allowed to leave the service for the player path.

export type ActiveLinkBand = 'fragmented' | 'sparse' | 'standard' | 'dense' | 'saturated';
export type RegisterValueBand = 'depleted' | 'degraded' | 'standard' | 'fortified' | 'reinforced';
export type SandpileBand = 'stable' | 'elevated' | 'critical';
export type ConflictMemoryBand = 'none' | 'low' | 'moderate' | 'deep';
export type FamiliarityBand = 'stranger' | 'acquainted' | 'familiar' | 'calibrated';

export interface RegisterBandView {
  registerId: string;
  valueBand: RegisterValueBand;
}

export interface CombatClientView {
  /** Qualitative band for active_link_fraction — NEVER the raw float (P6). */
  activeLinkBand: ActiveLinkBand;
  /** 5 erosion-register views — valueBand only, dominance_rank/vulnerable_axis stripped (P6). */
  registers: RegisterBandView[];
  /** Qualitative band for system_criticality — NEVER the raw float (P6). */
  sandpileBand: SandpileBand;
  /** The conflict flow regime (P5 exception — shown explicitly as it gates player strategy). */
  flowRegime: string;
  /** Qualitative band for conflict_memory_depth — NEVER the raw integer (P6). */
  conflictMemoryBand: ConflictMemoryBand;
  /** Qualitative band for familiarity_index — NEVER the raw float (P6). */
  familiarityBand: FamiliarityBand;
  /** Whether the dead-hand cache presence is revealed (boolean only — reserve/threshold stripped). */
  deadHandIntelligenceRevealed: boolean;
  /** Most recent combat event outcome bucket, or null if no assault has occurred yet (P6-safe). */
  lastOutcomeBucket: CombatOutcomeBucket | null;
}

@Injectable()
export class CombatProjectionService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly percolation: PercolationService,
    private readonly erosionRegister: ErosionRegisterService,
    private readonly sandpile: SandpileStateService,
    private readonly downstreamGate: DownstreamGateService,
    private readonly maladaptiveMemory: MaladaptiveMemoryService,
    private readonly familiarityDiscount: FamiliarityDiscountService,
    private readonly combatRepo: CombatRepository,
  ) {}

  /**
   * `toCombatClientView` — the ONLY path from B's hidden combat state to the player client.
   *
   * Reads the HIDDEN server-side scalars via B's mechanic services; derives the 8 closed
   * player-facing bands. STRIPS every hidden field — the returned object's keys are EXACTLY
   * the 8 CombatClientView fields listed above.
   *
   * NO raw scalar (base_friction_load / cumulative_pressure_index / system_criticality /
   * familiarity_index / conflict_memory_depth / dead_hand_reserve / trigger_threshold /
   * cache_script_ref / dominance_rank / vulnerable_axis / active_link_fraction /
   * operational_graph_node_count / resource_pressure) ever leaves this method.
   *
   * NO HP / attack / defense / damage field anywhere (the forbidden-list invariant).
   *
   * C4: NO Math.random(). NO Date.now(). Pure function of DB state + getter-sourced tunables.
   * R2.2: zero raw combat scalar in the returned CombatClientView.
   */
  async toCombatClientView(playerId: string, rivalKey: RivalKey): Promise<CombatClientView> {
    // ── 1. activeLinkBand — from PercolationService (raw active_link_fraction stripped) ──────
    const { band: activeLinkBand } = await this.percolation.getActiveLinkBand(playerId, rivalKey);

    // ── 2. registers[] — from ErosionRegisterService.getRegisters (P6 — dominance_rank/axis stripped) ──
    const { registers: rawRegisters } = await this.erosionRegister.getRegisters(playerId, rivalKey);
    // Map from RegisterView (registerId + current_value_bucket) to RegisterBandView (registerId + valueBand).
    // The rename from current_value_bucket → valueBand is the P6 mapping (the public name hides the DB column).
    const registers: RegisterBandView[] = rawRegisters.map((r) => ({
      registerId: r.registerId,
      valueBand:  r.current_value_bucket as RegisterValueBand,
    }));

    // ── 3. sandpileBand — from SandpileStateService.getSandpileCriticalityBand (raw criticality stripped) ──
    const globalRow = await this.combatRepo.readEscalationGlobal();
    const criticality = globalRow?.system_criticality ?? 0;
    const sandpileBand = this.sandpile.getSandpileCriticalityBand(criticality) as SandpileBand;

    // ── 4. flowRegime — from DownstreamGateService.getConflictFlowRegime (P5 exception — shown explicitly) ──
    const { flow_regime: flowRegime } = await this.downstreamGate.getConflictFlowRegime(playerId, rivalKey);

    // ── 5. conflictMemoryBand — from MaladaptiveMemoryService.getEscalationDepth (depth integer stripped) ──
    const pairRow = await this.combatRepo.readEscalationPair(playerId, rivalKey);
    const depth = pairRow?.conflict_memory_depth ?? 0;
    const conflictMemoryBand = this.maladaptiveMemory.getEscalationDepth(depth) as ConflictMemoryBand;

    // ── 6. familiarityBand — from FamiliarityDiscountService.getFamiliarityBucket (index float stripped) ──
    const { bucket: familiarityBand } = await this.familiarityDiscount.getFamiliarityBucket(playerId, rivalKey);

    // ── 7. deadHandIntelligenceRevealed — boolean only (reserve/threshold/cache_script_ref stripped) ──────
    const deadHandRow = await this.combatRepo.readDeadHand(playerId, rivalKey);
    const deadHandIntelligenceRevealed = deadHandRow?.intelligence_revealed ?? false;

    // ── 8. lastOutcomeBucket — most recent combat_event outcome_bucket for (player, rival) ─────────────
    // Queries the combat_event table for the most recent event with a non-null outcome_bucket.
    // Returns null when no assault has resolved yet (P3 — scheduled events have outcome_bucket=NULL).
    // P6: only the bucket string is forwarded (not any other combat_event column).
    const lastEventRows = await this.db
      .select({ outcome_bucket: combatEvent.outcome_bucket })
      .from(combatEvent)
      .where(
        and(
          eq(combatEvent.player_id, playerId),
          eq(combatEvent.target_rival_key, rivalKey),
        ),
      )
      .orderBy(desc(combatEvent.created_at_minute), desc(combatEvent.id))  // most recent first (created_at_minute is game-tick order; id tiebreak for same-minute events)
      .limit(10);  // small scan — we pick the first non-null outcome

    // Design §6 B-1: narrowed via `isCombatOutcomeBucket`, never an `as` cast — a stray non-domain
    // value on the column (should never happen; belt-and-suspenders) surfaces as `null`, not a lie.
    const rawOutcomeBucket = lastEventRows.find((r) => r.outcome_bucket !== null)?.outcome_bucket ?? null;
    const lastOutcomeBucket: CombatOutcomeBucket | null =
      rawOutcomeBucket !== null && isCombatOutcomeBucket(rawOutcomeBucket) ? rawOutcomeBucket : null;

    // ── Return ONLY the 8 closed bands — the P6 wall ─────────────────────────────────────────
    // The object literal has EXACTLY the 8 CombatClientView keys. No hidden field escapes.
    return {
      activeLinkBand:              activeLinkBand as ActiveLinkBand,
      registers,
      sandpileBand,
      flowRegime,
      conflictMemoryBand,
      familiarityBand:             familiarityBand as FamiliarityBand,
      deadHandIntelligenceRevealed,
      lastOutcomeBucket,
    };
  }
}
