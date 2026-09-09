// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-22-signal-drift-backend-design.md §3.1 (the signal_drift_state
//             persistence — 1-1 lieutenant, the per-cue CueReliabilityRegistry jsonb + drift_phase + dominant_cue_kind +
//             the sliding-window anchor window_start_tick + last_update_tick + the per-decision-kind cooldown stamp jsonb)
//             -- Phase-22 L2a Task 3 (signal-drift state repository) --
//
// `SignalDriftRepository` — the persisted access layer for the Phase-22 L2a signal_drift_state entity (the per-lieutenant
// cue-reliability registry + drift phase). Mirrors `AutonomyCeilingRepository` EXACTLY: a thin `*.repository.ts` owning the
// raw Drizzle reads/writes with EXPLICIT columns, the `@Inject(DB)` Drizzle client, paired with the service that holds the
// measurement logic. R9.3: 09's schema (signal_drift.ts — migration 0032) is the source of truth; this file IMPORTS the
// schema and NEVER re-declares it. PARAMETERIZED binds (no string interpolation), DETERMINISTIC (no RNG, no Date.now —
// updated_at is the SQL `now()`, the only clock, exactly as the autonomy-ceiling repo does it).

import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { signalDriftState, type SignalDriftStateRow } from '../../../db/schema/signal_drift';
import type { CueRegistry, DriftPhase, CueKind } from './signal-drift-cues';

@Injectable()
export class SignalDriftRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Read the signal_drift_state row for a lieutenant by its PK (the 1-1 lieutenant_id), or null when no row exists yet (the
   * service lazy-seeds on first access). NOT player-scoped: the tick has already resolved the player-owned lieutenant, so
   * this is an internal post-ownership read (the SAME convention AutonomyCeilingRepository.getState uses). A READ — no
   * state change.
   */
  async getState(lieutenantId: string): Promise<SignalDriftStateRow | null> {
    const rows = await this.db
      .select()
      .from(signalDriftState)
      .where(eq(signalDriftState.lieutenant_id, lieutenantId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * INSERT a fresh signal_drift_state row (the lazy-seed on first observation): the lieutenant_id (PK), the archetype_key
   * (the archetype this registry was seeded from — provenance/audit), the seeded `registry` (the T2 `CueRegistry` →
   * jsonb), and the window_start_tick anchor (so the first observation window is measured from the seed tick, not 0). The
   * drift_phase / dominant_cue_kind keep their schema DEFAULTs ('DIRECT_ALIGNED' / 'DIRECT_ORDER'); last_update_tick is
   * stamped to the seed tick. Returns the inserted row via `.returning()` (the canonical DB shape, incl. the DEFAULTed
   * columns + created_at/updated_at) so the caller needs no re-read. PARAMETERIZED. DETERMINISTIC.
   */
  async insertState(
    lieutenantId: string,
    archetypeKey: string,
    registry: CueRegistry,
    tick: number,
  ): Promise<SignalDriftStateRow> {
    const [created] = await this.db
      .insert(signalDriftState)
      .values({
        lieutenant_id: lieutenantId,
        // archetype_key is SEED-PROVENANCE / audit ONLY — the cue math (deriveActiveCues) always uses the caller's
        // `archetype` argument, NEVER state.archetype_key. It records which archetype seeded this registry.
        archetype_key: archetypeKey,
        registry,
        window_start_tick: tick,
        last_update_tick: tick,
      })
      .returning();
    return created;
  }

  /**
   * UPDATE the state read-modify-write: set the whole `registry` jsonb (the in-place-mutated T2 `CueRegistry` object), the
   * derived drift_phase + dominant_cue_kind, the sliding-window anchor window_start_tick, the last_update_tick, and the
   * per-decision-kind cooldown-stamp jsonb (last_decision_ticks). Keyed by lieutenant_id (the PK). This is a per-lieutenant
   * per-tick single-row write (the tick is single-threaded over a player's lieutenants), so writing the whole object is
   * safe. PARAMETERIZED. DETERMINISTIC (updated_at = SQL now()).
   */
  async writeState(
    lieutenantId: string,
    registry: CueRegistry,
    driftPhase: DriftPhase,
    dominantCue: CueKind,
    windowStartTick: number,
    lastUpdateTick: number,
    lastDecisionTicks: Record<string, number> | null,
  ): Promise<void> {
    await this.db
      .update(signalDriftState)
      .set({
        registry,
        drift_phase: driftPhase,
        dominant_cue_kind: dominantCue,
        window_start_tick: windowStartTick,
        last_update_tick: lastUpdateTick,
        last_decision_ticks: lastDecisionTicks,
        updated_at: sql`now()`,
      })
      .where(eq(signalDriftState.lieutenant_id, lieutenantId));
  }
}
