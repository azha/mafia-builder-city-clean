// IMPLEMENTS: docs/superpowers/specs/2026-08-12-w6.1-combat-production-design.md §1 D3/D6/D9, §4 C2
//             Canon: docs/tech/04b_combat_and_conflict/combat_mechanics.md :32,:73 ("Outcomes resolve
//             on next daily resolution tick") + :101,:365 (deterministic divergence lookup, no random
//             roll) + docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §601-603
//             — W6.1 C2 — 2026-08-13 —
//
// `CombatResolutionTickService` — registers COMBAT_RESOLUTION_TICK (NIGHTLY / order 13.5) on the
// shared scheduler (city_sim_system.ts / city_sim_scheduler.service.ts). This is the tick M6/M7/M8
// of the design's §0.0 chain never had: before this chunk, `combat_event.outcome_bucket` had ZERO
// non-null writers anywhere (prod or test) — every scheduled assault stayed scheduled forever.
//
// THE TICK, per player, each in-game night: select every pending assault (`combat_event`
// type='assault' AND outcome_bucket IS NULL, ordered (created_at_minute, id) ASC — CombatRepository.
// listPendingAssaults). For EACH, in a PER-EVENT try/catch (a fault on one event is logged and
// contained — it never breaks the tick or another event):
//
// D6 ordering (crash-safe) — friction ACCRUAL, then the CASCADE, then the GUARDED UPDATE LAST:
//   1. FrictionBudgetService.commitActionWithFriction(playerId, rivalKey, type, gameMinute)
//      → { poolBand, outcome }. Accrues combat_operation.shared_friction_pool FIRST, THEN derives
//      the divergence outcome from the NEW band (friction-budget.service.ts:107→:115 — the exact
//      order the anti-fig-leaf falsifiable below depends on: a first assault accrues 0.15→'low'→
//      'hold'; a second on the SAME pair accrues 0.30→'medium'→'contested' — a DIFFERENT outcome,
//      never a constant one). Deterministic registry lookup — NO Math.random anywhere in this file.
//   2. ConflictOrchestratorService.recordAssaultCascade({ assaultEventId: event.id, playerId,
//      rivalKey, patternHash, gameMinute }) — the §9.1 5-layer SERIALIZABLE cascade. Idempotent on
//      assaultEventId (assault_cascade_dedup): a crash-recovered re-run of an event whose cascade
//      already committed is a dedup no-op, never a double-apply.
//   3. CombatRepository.markAssaultResolved(event.id, outcome, poolBand) — the GUARDED UPDATE
//      (`WHERE id = $1 AND outcome_bucket IS NULL`), LAST. A crash between (2) and (3) leaves the
//      event unresolved: the NEXT night re-selects it (still outcome_bucket IS NULL), the cascade
//      dedupes (no-op), the UPDATE lands then. The REVERSE order — UPDATE before the cascade commits
//      — would mark an event resolved whose cascade never ran: a state that lies. `outcome_bucket`
//      is therefore NEVER written before the cascade has committed (design §1 D6).
//   Dette assumée (DF-3, design §2 HORS): a crash between (1) and (2) re-accrues friction the next
//   night (at-least-once). Monotone + bounded (Math.min(1.0, …), friction-budget.service.ts:107) —
//   never divergent.
//
// D9 — patternHash is DERIVED, never fabricated: `assault:${target_rival_key}:${lieutenant_id}`,
// deterministic, <=64 chars (varchar(64), migration 0084), no clock, no RNG. Precedent of form:
// `elimination_leakage:${rivalKey}` (rival-elimination.service.ts:146).
//
// L1 empty-state skip: zero pending assaults for the player → ZERO writes (byte-identical
// no-regression guarantee — combat_event existed long before this chunk with nothing resolving it;
// a player with no scheduled assault is completely unperturbed).
//
// Discipline transactionnelle (design §1 D6, socle "aucune tx ambiante" rule): this tick opens NO
// db.transaction of its own. commitActionWithFriction and recordAssaultCascade each open their OWN
// (the second at SERIALIZABLE) — wrapping them in an outer transaction here would reproduce exactly
// the no-op-guarded-UPDATE / XID-wait failure pair the socle documents for a repository joining a
// transaction it did not open. The tick body is a plain sequence of calls on `this.db` (via the two
// injected services), never a `db.transaction` that contains them.
//
// Determinism: NO Math.random(), NO Date.now() anywhere in this file. Game-time only via
// ctx.gameMinute (the SAME clock the friction accrual and the cascade both key on).
// Zero-regression: ADDITIVE only — reads combat_event, writes only through the two REUSEd services
// + the guarded UPDATE on combat_event.outcome_bucket/friction_consumed_bucket.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId } from '../../../citysim/scheduler/city_sim_system';
import type { CitySimTickContext } from '../../../citysim/scheduler/city_sim_system';
import { CombatRepository } from './combat.repository';
import { FrictionBudgetService } from './friction-budget.service';
import { ConflictOrchestratorService } from './conflict-orchestrator.service';
import type { CombatEventRow } from './combat.types';
import type { RivalKey } from '../rival/rival-ai.types';

@Injectable()
export class CombatResolutionTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CombatResolutionTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly combatRepo: CombatRepository,
    private readonly frictionBudget: FrictionBudgetService,
    private readonly conflictOrchestrator: ConflictOrchestratorService,
  ) {}

  /**
   * Register COMBAT_RESOLUTION_TICK on the shared scheduler at application boot.
   * Cadence: NIGHTLY / order 13.5 (design §1 D3 — between RIVAL_DAILY_TICK/13 and
   * COMBAT_DAILY_TICK/14; a FRACTIONAL slot, the SAME precedent as POLITICAL_CALENDAR_TICK/19.5).
   */
  onApplicationBootstrap(): void {
    this.scheduler.registerSystem({
      id:      CitySystemId.COMBAT_RESOLUTION_TICK,
      cadence: Cadence.NIGHTLY,
      order:   13.5,
      run:     (ctx) => this.runCombatResolutionTick(ctx),
    });
  }

  // ─── Private scheduler entry point ────────────────────────────────────────────────────────────

  private async runCombatResolutionTick(ctx: CitySimTickContext): Promise<void> {
    await this.runCombatResolutionTickForPlayer(ctx.playerId, ctx.gameMinute);
  }

  // ─── Shared per-entity method ─────────────────────────────────────────────────────────────────

  /**
   * `runCombatResolutionTickForPlayer` — the per-entity body run by the scheduler each NIGHTLY
   * boundary. L1 empty-state skip: zero pending assaults → ZERO writes. Per-event try/catch: a
   * fault on one event is logged and contained; the tick continues for the remaining events.
   *
   * @param playerId   - the player whose nightly resolution tick fires
   * @param gameMinute - the in-game minute (from ctx) — passed through to both REUSEd services
   */
  async runCombatResolutionTickForPlayer(playerId: string, gameMinute: number): Promise<void> {
    const pending = await this.combatRepo.listPendingAssaults(playerId);

    if (pending.length === 0) {
      // L1 empty-state skip — ZERO writes (byte-identical no-regression).
      return;
    }

    for (const event of pending) {
      try {
        await this.resolveOne(event, gameMinute);
      } catch (err) {
        // Per-event isolation: one bad event never breaks the tick or another event.
        this.logger.error(
          `COMBAT_RESOLUTION_TICK: resolution failed for player=${playerId} event=${event.id} ` +
            `at gameMinute=${gameMinute}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /**
   * Resolve ONE pending assault — design §1 D6 crash-safe ordering (accrue → cascade → guarded
   * UPDATE last). D9: patternHash is derived from (target rival, executing lieutenant), never
   * fabricated.
   */
  private async resolveOne(event: CombatEventRow, gameMinute: number): Promise<void> {
    const rivalKey = event.target_rival_key as RivalKey;
    const patternHash = `assault:${event.target_rival_key}:${event.lieutenant_id}`;

    // 1. Friction Budget — accrue THEN derive (friction-budget.service.ts:107→:115). The order the
    //    C2 anti-fig-leaf falsifiable depends on: a constant/pre-accrual read would make every
    //    outcome on a pair identical, which the falsifiable is built to catch.
    const { poolBand, outcome } = await this.frictionBudget.commitActionWithFriction(
      event.player_id,
      rivalKey,
      event.type,
      gameMinute,
    );

    // 2. Cascade — SERIALIZABLE tx, dedup on assaultEventId (design §1 D6 / §0.5).
    await this.conflictOrchestrator.recordAssaultCascade({
      assaultEventId: event.id,
      playerId:       event.player_id,
      rivalKey,
      patternHash,
      gameMinute,
    });

    // 3. Guarded UPDATE — LAST, strictly after the cascade has committed (design §1 D6).
    await this.combatRepo.markAssaultResolved(event.id, outcome, poolBand);
  }
}
