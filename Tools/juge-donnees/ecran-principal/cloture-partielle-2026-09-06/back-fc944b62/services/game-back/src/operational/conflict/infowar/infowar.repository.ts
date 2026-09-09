// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 9 (C9)
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §9.5
//             Canon: docs/tech/04b_combat_and_conflict/information_warfare_mechanics.md §4.1-§4.4
//             Pattern: conflict/diplomacy/diplomacy.repository.ts (mirror)
//             — Diplomacy & Information Warfare C C9 — 2026-06-26 —
//
// `InformationWarfareRepository` — the persistence layer for the 4 info-warfare tables.
//
// Methods:
//   upsertBelief(playerId, rivalKey, belief)         — onConflictDoUpdate (ALL 8 columns)
//   readBelief(playerId, rivalKey)                   — SELECT or null
//   listBeliefRows(playerId)                         — SELECT all belief rows for player (L1 list)
//   upsertDualUseState(playerId, rivalKey, state)    — onConflictDoUpdate
//   readDualUseState(playerId, rivalKey)             — SELECT or null
//   upsertSurveillanceOp(playerId, rivalKey, state)  — onConflictDoUpdate
//   readSurveillanceOp(playerId, rivalKey)           — SELECT or null
//   upsertPurgeTrapState(playerId, rivalKey, state)  — onConflictDoUpdate
//   readPurgeTrapState(playerId, rivalKey)           — SELECT or null
//   hasAnyInfoWarRows(playerId)                      — L1 skip check: count > 0 in dead_reckoning_belief
//
// R2.2 / P6: raw scalars (detection_probability, rival_interpretation_bias,
//   suspected_infiltration_level) are SERVER-ONLY. This repository is consumed by
//   server-side mechanics services only.
// Anti-fabrication: no Math.random(), no Date.now(). Purely deterministic CRUD.
// Sticky-accumulator lesson (D2 §3.3): ALWAYS onConflictDoUpdate — NEVER doNothing.
// Zero-regression: ADDITIVE only. No existing tables touched.

import { Injectable, Inject } from '@nestjs/common';
import { and, eq, count } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import {
  deadReckoningBelief,
  dualUseSignalState,
  surveillanceOp,
  purgeTrapState,
} from '../../../db/schema/conflict_infowar';
import type { RivalKey } from '../rival/rival-ai.types';

// ─── Row types (the shape returned by reads) ─────────────────────────────────────────────────────

export interface DeadReckoningBeliefRow {
  player_id: string;
  rival_key: string;
  operational_tempo_band: string;
  resource_mobilization_band: string;
  personnel_concentration_band: string;
  communication_pattern_band: string;
  territorial_reach_band: string;
  logistics_intensity_band: string;
  coil_corruption_applied: boolean;
  last_updated_tick: number;
}

export interface DualUseSignalStateRow {
  player_id: string;
  rival_key: string;
  action_type: string;
  rival_interpretation_bias: number;
  interpretation_badge: string;
  last_bpd_prior_mass: number;
  last_updated_tick: number;
}

export interface SurveillanceOpRow {
  player_id: string;
  rival_key: string;
  active: boolean;
  detection_probability: number;
  last_detection_game_day: number;
  last_disinfo_landed: boolean;
  last_updated_tick: number;
}

export interface PurgeTrapStateRow {
  player_id: string;
  rival_key: string;
  suspected_infiltration_level: number;
  internal_purge_active: boolean;
  bluff_active: boolean;
  bluff_discovered: boolean;
  last_updated_tick: number;
}

// ─── Update payload types (plain objects matching DB columns — camelCase = drizzle output) ───────

export interface BeliefUpdate {
  operational_tempo_band: string;
  resource_mobilization_band: string;
  personnel_concentration_band: string;
  communication_pattern_band: string;
  territorial_reach_band: string;
  logistics_intensity_band: string;
  coil_corruption_applied: boolean;
  last_updated_tick: number;
}

export interface DualUseUpdate {
  action_type: string;
  rival_interpretation_bias: number;
  interpretation_badge: string;
  last_bpd_prior_mass: number;
  last_updated_tick: number;
}

export interface SurveillanceUpdate {
  active: boolean;
  detection_probability: number;
  last_detection_game_day: number;
  last_disinfo_landed: boolean;
  last_updated_tick: number;
}

export interface PurgeUpdate {
  suspected_infiltration_level: number;
  internal_purge_active: boolean;
  bluff_active: boolean;
  bluff_discovered: boolean;
  last_updated_tick: number;
}

// ─── Repository ──────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class InformationWarfareRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ─── dead_reckoning_belief ───────────────────────────────────────────────────────────────────

  /**
   * UPSERT dead_reckoning_belief (onConflictDoUpdate — ALL 8 non-PK columns).
   * Sticky-accumulator discipline: never doNothing — always write the full belief.
   */
  async upsertBelief(
    playerId: string,
    rivalKey: RivalKey,
    belief: BeliefUpdate,
  ): Promise<DeadReckoningBeliefRow> {
    const values = {
      player_id: playerId,
      rival_key: rivalKey,
      ...belief,
    };
    const [row] = await this.db
      .insert(deadReckoningBelief)
      .values(values)
      .onConflictDoUpdate({
        target: [deadReckoningBelief.player_id, deadReckoningBelief.rival_key],
        set: {
          operational_tempo_band:       belief.operational_tempo_band,
          resource_mobilization_band:   belief.resource_mobilization_band,
          personnel_concentration_band: belief.personnel_concentration_band,
          communication_pattern_band:   belief.communication_pattern_band,
          territorial_reach_band:       belief.territorial_reach_band,
          logistics_intensity_band:     belief.logistics_intensity_band,
          coil_corruption_applied:      belief.coil_corruption_applied,
          last_updated_tick:            belief.last_updated_tick,
        },
      })
      .returning();
    return row as DeadReckoningBeliefRow;
  }

  /**
   * SELECT a single dead_reckoning_belief row. Returns null if no row exists.
   */
  async readBelief(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<DeadReckoningBeliefRow | null> {
    const rows = await this.db
      .select()
      .from(deadReckoningBelief)
      .where(
        and(
          eq(deadReckoningBelief.player_id, playerId),
          eq(deadReckoningBelief.rival_key, rivalKey),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      player_id:                    r.player_id,
      rival_key:                    r.rival_key as string,
      operational_tempo_band:       r.operational_tempo_band,
      resource_mobilization_band:   r.resource_mobilization_band,
      personnel_concentration_band: r.personnel_concentration_band,
      communication_pattern_band:   r.communication_pattern_band,
      territorial_reach_band:       r.territorial_reach_band,
      logistics_intensity_band:     r.logistics_intensity_band,
      coil_corruption_applied:      r.coil_corruption_applied,
      last_updated_tick:            r.last_updated_tick,
    };
  }

  /**
   * SELECT all dead_reckoning_belief rows for a player (L1 orchestrator list).
   * Returns empty array if no rows exist.
   */
  async listBeliefRows(playerId: string): Promise<DeadReckoningBeliefRow[]> {
    const rows = await this.db
      .select()
      .from(deadReckoningBelief)
      .where(eq(deadReckoningBelief.player_id, playerId));
    return rows.map((r) => ({
      player_id:                    r.player_id,
      rival_key:                    r.rival_key as string,
      operational_tempo_band:       r.operational_tempo_band,
      resource_mobilization_band:   r.resource_mobilization_band,
      personnel_concentration_band: r.personnel_concentration_band,
      communication_pattern_band:   r.communication_pattern_band,
      territorial_reach_band:       r.territorial_reach_band,
      logistics_intensity_band:     r.logistics_intensity_band,
      coil_corruption_applied:      r.coil_corruption_applied,
      last_updated_tick:            r.last_updated_tick,
    }));
  }

  // ─── dual_use_signal_state ───────────────────────────────────────────────────────────────────

  /**
   * UPSERT dual_use_signal_state (onConflictDoUpdate — all 5 non-PK columns).
   */
  async upsertDualUseState(
    playerId: string,
    rivalKey: RivalKey,
    state: DualUseUpdate,
  ): Promise<DualUseSignalStateRow> {
    const values = {
      player_id: playerId,
      rival_key: rivalKey,
      ...state,
    };
    const [row] = await this.db
      .insert(dualUseSignalState)
      .values(values)
      .onConflictDoUpdate({
        target: [dualUseSignalState.player_id, dualUseSignalState.rival_key],
        set: {
          action_type:               state.action_type,
          rival_interpretation_bias: state.rival_interpretation_bias,
          interpretation_badge:      state.interpretation_badge,
          last_bpd_prior_mass:       state.last_bpd_prior_mass,
          last_updated_tick:         state.last_updated_tick,
        },
      })
      .returning();
    return row as DualUseSignalStateRow;
  }

  /**
   * SELECT a single dual_use_signal_state row. Returns null if no row exists.
   */
  async readDualUseState(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<DualUseSignalStateRow | null> {
    const rows = await this.db
      .select()
      .from(dualUseSignalState)
      .where(
        and(
          eq(dualUseSignalState.player_id, playerId),
          eq(dualUseSignalState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      player_id:                 r.player_id,
      rival_key:                 r.rival_key as string,
      action_type:               r.action_type,
      rival_interpretation_bias: r.rival_interpretation_bias,
      interpretation_badge:      r.interpretation_badge,
      last_bpd_prior_mass:       r.last_bpd_prior_mass,
      last_updated_tick:         r.last_updated_tick,
    };
  }

  // ─── surveillance_op ─────────────────────────────────────────────────────────────────────────

  /**
   * UPSERT surveillance_op (onConflictDoUpdate — all 5 non-PK columns).
   */
  async upsertSurveillanceOp(
    playerId: string,
    rivalKey: RivalKey,
    state: SurveillanceUpdate,
  ): Promise<SurveillanceOpRow> {
    const values = {
      player_id: playerId,
      rival_key: rivalKey,
      ...state,
    };
    const [row] = await this.db
      .insert(surveillanceOp)
      .values(values)
      .onConflictDoUpdate({
        target: [surveillanceOp.player_id, surveillanceOp.rival_key],
        set: {
          active:                  state.active,
          detection_probability:   state.detection_probability,
          last_detection_game_day: state.last_detection_game_day,
          last_disinfo_landed:     state.last_disinfo_landed,
          last_updated_tick:       state.last_updated_tick,
        },
      })
      .returning();
    return row as SurveillanceOpRow;
  }

  /**
   * SELECT a single surveillance_op row. Returns null if no row exists.
   */
  async readSurveillanceOp(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<SurveillanceOpRow | null> {
    const rows = await this.db
      .select()
      .from(surveillanceOp)
      .where(
        and(
          eq(surveillanceOp.player_id, playerId),
          eq(surveillanceOp.rival_key, rivalKey),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      player_id:               r.player_id,
      rival_key:               r.rival_key as string,
      active:                  r.active,
      detection_probability:   r.detection_probability,
      last_detection_game_day: r.last_detection_game_day,
      last_disinfo_landed:     r.last_disinfo_landed,
      last_updated_tick:       r.last_updated_tick,
    };
  }

  // ─── purge_trap_state ─────────────────────────────────────────────────────────────────────────

  /**
   * UPSERT purge_trap_state (onConflictDoUpdate — all 5 non-PK columns).
   */
  async upsertPurgeTrapState(
    playerId: string,
    rivalKey: RivalKey,
    state: PurgeUpdate,
  ): Promise<PurgeTrapStateRow> {
    const values = {
      player_id: playerId,
      rival_key: rivalKey,
      ...state,
    };
    const [row] = await this.db
      .insert(purgeTrapState)
      .values(values)
      .onConflictDoUpdate({
        target: [purgeTrapState.player_id, purgeTrapState.rival_key],
        set: {
          suspected_infiltration_level: state.suspected_infiltration_level,
          internal_purge_active:        state.internal_purge_active,
          bluff_active:                 state.bluff_active,
          bluff_discovered:             state.bluff_discovered,
          last_updated_tick:            state.last_updated_tick,
        },
      })
      .returning();
    return row as PurgeTrapStateRow;
  }

  /**
   * SELECT a single purge_trap_state row. Returns null if no row exists.
   */
  async readPurgeTrapState(
    playerId: string,
    rivalKey: RivalKey,
  ): Promise<PurgeTrapStateRow | null> {
    const rows = await this.db
      .select()
      .from(purgeTrapState)
      .where(
        and(
          eq(purgeTrapState.player_id, playerId),
          eq(purgeTrapState.rival_key, rivalKey),
        ),
      )
      .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      player_id:                    r.player_id,
      rival_key:                    r.rival_key as string,
      suspected_infiltration_level: r.suspected_infiltration_level,
      internal_purge_active:        r.internal_purge_active,
      bluff_active:                 r.bluff_active,
      bluff_discovered:             r.bluff_discovered,
      last_updated_tick:            r.last_updated_tick,
    };
  }

  // ─── L1 skip check ───────────────────────────────────────────────────────────────────────────

  /**
   * L1 skip check: returns true if the player has ANY dead_reckoning_belief rows.
   * Used by the infowar orchestrator to skip the entire info-war system for new players
   * (write-amplification discipline: only run if state exists).
   */
  async hasAnyInfoWarRows(playerId: string): Promise<boolean> {
    const [result] = await this.db
      .select({ cnt: count() })
      .from(deadReckoningBelief)
      .where(eq(deadReckoningBelief.player_id, playerId));
    return (result?.cnt ?? 0) > 0;
  }
}
