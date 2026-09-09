// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-19-autonomy-ceiling-backend-design.md §3.2 (the pre-action gate
//             checkAndConsume — deplete → refuse) + §3.3 (the tick-aligned refresh + the refund-on-noop semantics)
//             -- Phase-19 L1a Task 4 (AutonomyCeilingService) --
//
// `AutonomyCeilingService` — the autonomy-ceiling gate the LIEUTENANT_TICK consults before each delegated EXECUTE_DEFAULT.
// It owns the lazy-seed (getState), the pre-action gate (checkAndConsume — depleted → REFUSED, else decrement), the
// refund-on-noop inverse (refund — net-consume only *taken* actions), and the tick-aligned refresh (refreshIfDue —
// restore every category to its cap + bump cycle_id when the window elapsed). It reuses the T2 pure helpers
// (projectCategory / bucketForCounter / seedBudget / AUTONOMY_CATEGORIES) for all budget math — no inline thresholds
// (R2.3 — the caps/window come from lieutenantTunables.autonomyCeiling). DETERMINISTIC: no Date.now / no Math.random —
// every tick value is the `tick` argument the caller passes (ctx.gameMinute).
//
// THE READ-MODIFY-WRITE NUANCE: checkAndConsume / refund / refreshIfDue mutate the jsonb `budget` object IN PLACE then
// write the whole object back (writeBudget). This is safe because it is a per-lieutenant, per-tick, single-threaded
// read-modify-write (the tick drives a player's lieutenants serially) — there is no concurrent writer to the same row.

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../../protocol/api-error';
import type { LieutenantArchetype } from '../lieutenant-archetype';
import { lieutenantTunables } from '../lieutenant-tunables';
import type { AutonomyCeilingStateRow } from '../../../db/schema/autonomy_ceiling';
import { AutonomyCeilingRepository } from './autonomy-ceiling.repository';
import {
  AUTONOMY_CATEGORIES,
  bucketForCounter,
  projectCategory,
  seedBudget,
  type AutonomyBucket,
  type AutonomyCategory,
  type Budget,
} from './autonomy-category';

/** The 3 player AutonomyDecision kinds applied by applyDecision (Phase-19 L1a T7 — the supported decision verbs). */
export type AutonomyDecisionKind = 'reset_budget' | 'raise_ceiling' | 'override_one_shot';

@Injectable()
export class AutonomyCeilingService {
  constructor(private readonly repo: AutonomyCeilingRepository) {}

  /**
   * Read the lieutenant's autonomy_ceiling_state, lazy-seeding a fresh 7-category budget (seedBudget) on first access.
   * The seed anchors last_refresh_tick at `tick` so the first refresh window is measured from now (not from 0). On a seed
   * the insert RETURNS the canonical persisted row directly (no re-read).
   */
  async getState(
    lieutenantId: string,
    archetype: LieutenantArchetype,
    tick: number,
  ): Promise<AutonomyCeilingStateRow> {
    const existing = await this.repo.getState(lieutenantId);
    if (existing) return existing;
    const budget = seedBudget(archetype);
    return this.repo.insertState(lieutenantId, archetype, budget, tick);
  }

  /**
   * The PRE-ACTION gate: if the lieutenant's primary-category budget is `depleted` → `{ verdict: 'REFUSED' }` (no
   * decrement, no write). Otherwise consume one unit (current − 1, re-bucketed, last_decrement_tick = tick) and persist →
   * `{ verdict: 'ALLOWED', newBucket }` where `newBucket` is the qualitative bucket after the consume (P5/R2.2 — the tick
   * uses it to emit AutonomyCeilingStateUpdatedEvent). The tick calls this BEFORE applyExecuteDefault; a benign no-op (the
   * binding returns 'NOOP') is refunded by `refund` so only net-taken actions consume the budget.
   */
  async checkAndConsume(
    lieutenantId: string,
    archetype: LieutenantArchetype,
    tick: number,
  ): Promise<{ verdict: 'ALLOWED'; newBucket: string } | { verdict: 'REFUSED' }> {
    const state = await this.getState(lieutenantId, archetype, tick);
    const budget = state.budget as Budget;
    const category = projectCategory(archetype);
    const entry = budget.entries[category];
    // PHASE-19 L1a T7 — ONE-SHOT OVERRIDE (AutonomyDecision.override_one_shot): a player-granted single gate-bypass.
    // Checked BEFORE the depleted-check: if armed, HONOR the action WITHOUT decrementing (even when depleted), CLEAR the
    // flag (it is a one-shot), persist the cleared flag, and return ALLOWED with the current bucket (unchanged — no
    // decrement on a one-shot; the player-granted bypass does not reduce the budget). The action runs this tick; the next
    // gate is normal again.
    if (entry.override_next === true) {
      entry.override_next = false;
      await this.repo.writeBudget(lieutenantId, budget, state.cycle_id, state.last_refresh_tick);
      return { verdict: 'ALLOWED', newBucket: entry.bucket };
    }
    if (entry.bucket === 'depleted') return { verdict: 'REFUSED' };
    entry.current = Math.max(0, entry.current - 1);
    entry.bucket = bucketForCounter(entry.current, entry.cap);
    entry.last_decrement_tick = tick;
    await this.repo.writeBudget(lieutenantId, budget, state.cycle_id, state.last_refresh_tick);
    return { verdict: 'ALLOWED', newBucket: entry.bucket };
  }

  /**
   * READ-ONLY raw state access (TD-049 default_on_timeout): the autonomy_ceiling_state row for the lieutenant, or null
   * when no row exists yet (the lieutenant has never been gated). A pure READ — does NOT lazy-seed. Used by the tick's
   * `applyDefaultOnTimeout` to read the current cycle_id for the backlog-age check WITHOUT triggering a seed.
   */
  async getStateReadOnly(lieutenantId: string): Promise<AutonomyCeilingStateRow | null> {
    return this.repo.getState(lieutenantId); // the raw repo read — no seed (mirrors getBudgetBands' getState call).
  }

  /**
   * READ-ONLY band projection (Phase-19 L1a T7; R2.2): the per-category QUALITATIVE bucket map for a lieutenant's autonomy
   * budget — `{ PRODUCTION_OPS: 'full', LOGISTICS_ROUTING: 'nominal', … }` — derived from the persisted budget jsonb. NEVER
   * the raw `current` / `cap` (P5/R2.2 — only the bucket escapes). When NO autonomy_ceiling_state row exists yet (a
   * never-gated lieutenant) → an EMPTY map (`{}`). CRITICAL: a pure READ — it does NOT lazy-seed a row (it reads
   * repo.getState directly, NOT this.getState which seeds), so a GET / projection NEVER creates a budget row. Used by the
   * LieutenantProjectionService for the `budget_bands` field. DETERMINISTIC (no tick argument — the bucket is the persisted
   * derived value).
   */
  async getBudgetBands(lieutenantId: string): Promise<Record<AutonomyCategory, AutonomyBucket> | Record<string, never>> {
    const existing = await this.repo.getState(lieutenantId); // RAW read — NO lazy-seed (the projection must not create a row).
    if (!existing) return {}; // no budget row yet → empty band map (the projection surfaces {}).
    const budget = existing.budget as Budget;
    const bands = {} as Record<AutonomyCategory, AutonomyBucket>;
    for (const cat of AUTONOMY_CATEGORIES) {
      const entry = budget.entries[cat];
      if (entry) bands[cat] = entry.bucket; // defensive: only map categories present in the persisted budget.
    }
    return bands;
  }

  /**
   * Apply a player AutonomyDecision (Phase-19 L1a T7) to a lieutenant's PRIMARY-category budget, with a per-(lieutenant,
   * kind) cooldown:
   *   - reset_budget       — restore the primary category to its cap (bucket = 'full'). The player tops the budget back up.
   *   - raise_ceiling      — lift the primary category's cap by one, BOUNDED by raiseCapMax (Invariant 1 — never above the
   *                          hard ceiling). The bucket re-derives from the (unchanged) counter against the new cap.
   *   - override_one_shot  — arm the entry's `override_next` flag — the NEXT pre-action gate (checkAndConsume) honors one
   *                          action without consuming the budget, then clears the flag.
   * COOLDOWN: a same-kind decision is refused (409 RESOURCE_STATE_CONFLICT) while `tick - last < decisionCooldownTicks`
   * (the per-kind stamp lives in budget.last_decision_ticks). On success the stamp is updated + the whole budget written.
   * Uses this.getState (the lazy-seed) so a decision on a never-gated lieutenant seeds the budget first (the player can
   * pre-emptively raise/reset). DETERMINISTIC (the cooldown is a pure function of the persisted stamp + the `tick`).
   */
  async applyDecision(
    lieutenantId: string,
    archetype: LieutenantArchetype,
    kind: AutonomyDecisionKind,
    tick: number,
  ): Promise<void> {
    const state = await this.getState(lieutenantId, archetype, tick);
    const budget = state.budget as Budget;
    // COOLDOWN: refuse a same-kind decision before the cooldown window has elapsed (the per-kind stamp in the jsonb).
    const last = budget.last_decision_ticks?.[kind];
    if (last !== undefined && tick - last < lieutenantTunables.autonomyCeiling.decisionCooldownTicks) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `autonomy decision '${kind}' is on cooldown for lieutenant ${lieutenantId}.`,
      });
    }
    const category = projectCategory(archetype);
    const entry = budget.entries[category];
    if (kind === 'reset_budget') {
      entry.current = entry.cap;
      entry.bucket = 'full';
    } else if (kind === 'raise_ceiling') {
      entry.cap = Math.min(lieutenantTunables.autonomyCeiling.raiseCapMax, entry.cap + 1);
      entry.bucket = bucketForCounter(entry.current, entry.cap);
    } else {
      // override_one_shot — arm the one-shot flag; the gate honors + clears it on the next EXECUTE_DEFAULT.
      entry.override_next = true;
    }
    budget.last_decision_ticks = { ...(budget.last_decision_ticks ?? {}), [kind]: tick };
    await this.repo.writeBudget(lieutenantId, budget, state.cycle_id, state.last_refresh_tick);
  }

  /** Refund one unit when the taken action turned out to be a benign no-op (NOOP). Capped at cap (never above the cap). */
  async refund(lieutenantId: string, archetype: LieutenantArchetype, tick: number): Promise<void> {
    const state = await this.getState(lieutenantId, archetype, tick);
    const budget = state.budget as Budget;
    const entry = budget.entries[projectCategory(archetype)];
    entry.current = Math.min(entry.cap, entry.current + 1);
    entry.bucket = bucketForCounter(entry.current, entry.cap);
    await this.repo.writeBudget(lieutenantId, budget, state.cycle_id, state.last_refresh_tick);
  }

  /**
   * The TICK-ALIGNED refresh: when `tick - last_refresh_tick >= refreshWindowTicks`, restore EVERY category to its cap
   * (bucket = 'full'), bump cycle_id, and stamp last_refresh_tick = tick. Otherwise a no-op (no write). Returns `true` if
   * a refresh was performed (so the caller can emit AutonomyCeilingStateUpdatedEvent), `false` if the window has not yet
   * elapsed. Called once per delegated lieutenant per tick (after the settling-clear, before the action gate).
   * DETERMINISTIC (the window is a pure function of the persisted last_refresh_tick + the `tick` argument).
   */
  async refreshIfDue(lieutenantId: string, archetype: LieutenantArchetype, tick: number): Promise<boolean> {
    const state = await this.getState(lieutenantId, archetype, tick);
    const last = state.last_refresh_tick ?? 0;
    if (tick - last < lieutenantTunables.autonomyCeiling.refreshWindowTicks) return false;
    const budget = state.budget as Budget;
    for (const cat of AUTONOMY_CATEGORIES) {
      const e = budget.entries[cat];
      e.current = e.cap;
      e.bucket = 'full';
    }
    await this.repo.writeBudget(lieutenantId, budget, state.cycle_id + 1, tick);
    return true;
  }
}
