// IMPLEMENTS: docs/superpowers/specs/2026-06-11-phase-25-standing-order-expiry-design.md §3.1 (the standing_order
//             ALTER — rule jsonb / signature text / status text — emit writes the row; the tick reads the active/injecting
//             order RAW, no lazy-seed) + §4 (`order = standingOrder.getActive(...)` — the RAW read of the order that is
//             'active' OR ('lapsed' + HOLD_LAST)) + §5 Invariants (Single-active — one status='active' per lieutenant)
//             -- Phase-25 L3 (Standing Order Expiry) Task 2 (standing-order DB access layer) --
//
// `StandingOrderRepository` — the persisted access layer for the Phase-25 L3 standing_order entity (the runtime
// rule-injection surface). Mirrors `SignalDriftRepository` / `AutonomyCeilingRepository` EXACTLY: a thin `*.repository.ts`
// owning the raw Drizzle reads/writes with EXPLICIT columns, the `@Inject(DB)` Drizzle client, paired with the service
// that holds the issue/getActiveRule logic. R9.3: 09's schema (lieutenant.ts — the ALTERed standingOrder, migration 0034)
// is the source of truth; this file IMPORTS the schema and NEVER re-declares it. PARAMETERIZED binds (no string
// interpolation), DETERMINISTIC (no RNG, no Date.now — issued_at is the SQL DEFAULT now(); expires_at is computed in
// tick-space from the caller's `now` via `to_timestamp` so the comparison T3 makes is deterministic, NOT a wall clock).
//
// T2 SCOPE: ONLY the two methods T2 needs — getActiveOrInjecting (the tick's RAW read) + insertOrder (issue's write). The
// standing_order_state repo methods (the lapse-pattern ledger) + the status mutators (lapse/revoke/promote/renew) come in
// T3/T4. The legacy GDD-canonical columns (instruction_type / target_entity_id) are NOT NULL but UNUSED by M2 (the order
// is driven purely by the compiled DSL `rule`, spec §2) — insertOrder fills them with inert placeholders so the NOT NULL
// constraints are satisfied without inventing a polymorphic-target semantics M2 does not use.

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, or, sql } from 'drizzle-orm';

import { DB } from '../../../db/db.module';
import type { DrizzleClient } from '../../../db';
import { behaviorScript, lieutenant, standingOrder, type StandingOrderRow } from '../../../db/schema/lieutenant';
import { standingOrderState, type StandingOrderStateRow } from '../../../db/schema/standing_order_state';
import type { CompiledScript, IrRule } from '../../../dsl/ir';
import type { LapseActionEnum } from '../../../db/schema/lieutenant';

/** The inert all-zero UUID for the legacy `target_entity_id` NOT NULL column (M2 drives the order from the compiled DSL
 *  `rule`, NOT the GDD-canonical polymorphic target — spec §2 keeps the column but the runtime ignores it). */
const INERT_TARGET_ENTITY_ID = '00000000-0000-0000-0000-000000000000';

/**
 * A `standing_order` row PROJECTED with `expires_at_tick` — the CENTRALIZED tick-space read of `expires_at`. T2 persists the
 * expiry as a `timestamptz` (`to_timestamp(now + duration)`); rather than have T3/T4/T5 each hand-roll the
 * `extract(epoch …)` translation, every active-order read SELECTs `extract(epoch from expires_at)::int AS expires_at_tick`
 * so callers compare `row.expires_at_tick` (an int tick in city_sim game-minute space) against `now`, NEVER the raw
 * timestamp. ONE place owns the timestamp→tick mapping. The raw `expires_at` column is omitted from this shape (callers
 * read the tick, not the timestamp).
 */
export type StandingOrderRowWithTick = Omit<StandingOrderRow, 'expires_at'> & { expires_at_tick: number };

@Injectable()
export class StandingOrderRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Read the lieutenant's single ACTIVE-OR-INJECTING standing_order row, or null when none. "Injecting" = the order is
   * still applied at the tick: `status='active'` OR (`status='lapsed'` AND `lapse_action='HOLD_LAST'`) — a HOLD_LAST order
   * keeps being injected after it lapses (the instruction is maintained until RENEW/REVOKE, spec §3.1). A revoked /
   * promoted / reverted-lapsed order does NOT inject → not selected here. Ordered `issued_at desc limit 1` (the single
   * active order per lieutenant — the Single-active invariant — so at most one row matches the active arm; the ordering is
   * a defensive tie-break). NOT player-scoped: the tick/endpoint has already resolved the player-owned lieutenant, so this
   * is an internal post-ownership read (the SAME convention SignalDriftRepository.getState uses). A READ — no state change.
   */
  async getActiveOrInjecting(lieutenantId: string): Promise<StandingOrderRowWithTick | null> {
    const rows = await this.db
      .select(this.activeOrderColumns())
      .from(standingOrder)
      .where(
        and(
          eq(standingOrder.lieutenant_id, lieutenantId),
          or(
            eq(standingOrder.status, 'active'),
            and(eq(standingOrder.status, 'lapsed'), eq(standingOrder.lapse_action, 'HOLD_LAST')),
          ),
        ),
      )
      .orderBy(desc(standingOrder.issued_at))
      .limit(1);
    return (rows[0] as StandingOrderRowWithTick | undefined) ?? null;
  }

  /**
   * Read the lieutenant's single `status='active'` standing_order row PROJECTED with `expires_at_tick` (the centralized
   * timestamp→tick read), or null when none. This is the T3+ EXPIRY read: ONLY the 'active' arm (a HOLD_LAST lapsed row is
   * NOT re-processed — the active→lapsed transition is counted EXACTLY ONCE; once setStatus(…, 'lapsed') runs, the next
   * tick's getActiveForExpiry returns null → no re-count). evaluate compares `row.expires_at_tick` against `now`. Ordered
   * `issued_at desc limit 1` (the Single-active invariant — at most one active row; the ordering is a defensive tie-break).
   * NOT player-scoped (the tick already resolved the player-owned lieutenant). A READ — no state change.
   */
  async getActiveForExpiry(lieutenantId: string): Promise<StandingOrderRowWithTick | null> {
    const rows = await this.db
      .select(this.activeOrderColumns())
      .from(standingOrder)
      .where(and(eq(standingOrder.lieutenant_id, lieutenantId), eq(standingOrder.status, 'active')))
      .orderBy(desc(standingOrder.issued_at))
      .limit(1);
    return (rows[0] as StandingOrderRowWithTick | undefined) ?? null;
  }

  /**
   * Read the lieutenant's CURRENT decidable order PROJECTED with `expires_at_tick` (Phase-25 L3 T4 — the RENEW/REVOKE/
   * PROMOTE target). "Current" = the most-recent order that is still in a decidable state: `status IN ('active','lapsed')`
   * (a revoked / promoted order is terminal — it is no longer the lieutenant's standing order, so a decision on it returns
   * null → the endpoint/service treats it as "no order"). Ordered `issued_at desc limit 1` (the most-recent — covers a
   * chronic re-issue sequence where the latest order is the one the player decides on). This is BROADER than
   * getActiveForExpiry (which is 'active'-only for the idempotent lapse transition): a player may RENEW a HOLD_LAST lapsed
   * order, REVOKE an active/lapsed order, or PROMOTE after the order lapsed (promotion_suggested is raised by the lapse
   * itself). NOT player-scoped (the endpoint already resolved the player-owned lieutenant). A READ — no state change.
   */
  async getCurrentOrder(lieutenantId: string): Promise<StandingOrderRowWithTick | null> {
    const rows = await this.db
      .select(this.activeOrderColumns())
      .from(standingOrder)
      .where(
        and(
          eq(standingOrder.lieutenant_id, lieutenantId),
          or(eq(standingOrder.status, 'active'), eq(standingOrder.status, 'lapsed')),
        ),
      )
      .orderBy(desc(standingOrder.issued_at))
      .limit(1);
    return (rows[0] as StandingOrderRowWithTick | undefined) ?? null;
  }

  /**
   * RE-ARM an order's expiry + set its lifecycle status (Phase-25 L3 T4 — RENEW). Writes `expires_at = to_timestamp(
   * expiresAtTick)` (the centralized tick-space mapping — mirror insertOrder's `to_timestamp(now + duration)`) and the new
   * `status`. Keyed by order_id (the PK the service resolved via getCurrentOrder). RENEW pushes `expiresAtTick = now +
   * durationStandardTicks` and `status='active'` (a lapsed HOLD_LAST order RENEWed re-arms back to active). PARAMETERIZED.
   * DETERMINISTIC — `expiresAtTick` is a pure function of the caller's `now` + the TTL; no Date.now / wall clock.
   */
  async setExpiry(orderId: string, expiresAtTick: number, status: string): Promise<void> {
    await this.db
      .update(standingOrder)
      .set({ expires_at: sql`to_timestamp(${expiresAtTick})`, status })
      .where(eq(standingOrder.order_id, orderId));
  }

  /**
   * The explicit column projection for an active-order read: EVERY standingOrder column EXCEPT the raw `expires_at`
   * timestamp, PLUS the computed `expires_at_tick = extract(epoch from expires_at)::int` (the CENTRALIZED tick-space
   * translation — callers read the int tick, never the timestamp). Shared by getActiveOrInjecting + getActiveForExpiry +
   * getCurrentOrder so the timestamp→tick mapping lives in ONE place (T2 review follow-up). Returns the Drizzle
   * select-shape map.
   */
  private activeOrderColumns() {
    return {
      order_id: standingOrder.order_id,
      lieutenant_id: standingOrder.lieutenant_id,
      instruction_type: standingOrder.instruction_type,
      target_entity_id: standingOrder.target_entity_id,
      issued_at: standingOrder.issued_at,
      lapse_action: standingOrder.lapse_action,
      lapse_count: standingOrder.lapse_count,
      rule: standingOrder.rule,
      signature: standingOrder.signature,
      status: standingOrder.status,
      // The CENTRALIZED read: the persisted `expires_at` timestamptz → its epoch second → an int tick (city_sim game-minute
      // space). expires_at was written as `to_timestamp(now + duration)`, so this recovers `now + duration` deterministically.
      expires_at_tick: sql<number>`extract(epoch from ${standingOrder.expires_at})::int`,
    };
  }

  /**
   * INSERT a freshly-issued standing_order row (the emit write): the lieutenant_id, the compiled `rule` (jsonb IR — the
   * single validated rule the order injects), its deterministic `signature`, `status='active'`, the `lapse_action`, and
   * `expires_at` computed in tick-space from the caller's `now` (`to_timestamp(expiresAt)` — `expiresAt = now +
   * durationStandardTicks`, a deterministic game-minute → epoch-second mapping, so the T3 expiry comparison is a function
   * of the persisted tick + `now`, never a wall clock). The legacy NOT NULL `instruction_type` / `target_entity_id` are
   * filled with inert placeholders (M2 drives the order from `rule`, not these — spec §2). `issued_at` keeps the schema
   * DEFAULT now() (the issue timestamp — not read by the tick-space lifecycle; only `expires_at`/`now` are compared in T3).
   * Returns the inserted row via `.returning()` (the canonical DB shape incl. the DEFAULTed columns) so the caller needs
   * no re-read. PARAMETERIZED. DETERMINISTIC.
   */
  async insertOrder(
    lieutenantId: string,
    rule: IrRule,
    signature: string,
    lapseAction: LapseActionEnum,
    expiresAt: number,
    _now: number,
  ): Promise<StandingOrderRow> {
    const [created] = await this.db
      .insert(standingOrder)
      .values({
        lieutenant_id: lieutenantId,
        instruction_type: 0, // legacy GDD-canonical column (NOT NULL); inert in M2 — the order is the compiled `rule`.
        target_entity_id: INERT_TARGET_ENTITY_ID, // legacy polymorphic target (NOT NULL); inert in M2.
        // expires_at lives in tick-space: the caller's `expiresAt` (= now + durationStandardTicks) mapped to an epoch
        // second deterministically. T3's evaluate compares `now` (game-minute) against extract(epoch from expires_at).
        expires_at: sql`to_timestamp(${expiresAt})`,
        rule: rule as unknown as Record<string, unknown>,
        signature,
        status: 'active',
        lapse_action: lapseAction,
      })
      .returning();
    return created;
  }

  /**
   * Mutate a standing_order row's lifecycle `status` (text — active|lapsed|revoked|promoted|renewed) by its PK. The
   * active→lapsed transition (T3 evaluate) and the RENEW/REVOKE/PROMOTE decisions (T4) call this. Keyed by order_id (the
   * PK). PARAMETERIZED. DETERMINISTIC — a pure status write, no clock. The caller has already resolved the order (the
   * tick read it via getActiveForExpiry / the decision endpoint owned the lieutenant).
   */
  async setStatus(orderId: string, status: string): Promise<void> {
    await this.db.update(standingOrder).set({ status }).where(eq(standingOrder.order_id, orderId));
  }

  /**
   * P3-H C2 (ADDITIVE — `docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md` C2; C0-reanchor
   * §4/R2 pinned this exact join: "a plan's 'belongs to the player' check ... must join through
   * `lieutenant.player_id`, not a direct column read" — `standing_order` carries NO `player_id` column at
   * all). Read a standing_order row BY ITS ID (not by lieutenant), joined to `lieutenant` for the OWNING
   * `player_id` + PROJECTED with `expires_at_tick` (the SAME centralized tick-space read
   * `activeOrderColumns()` uses elsewhere in this file). `ExecutionPlanService.createPlan` uses this ONE
   * read for its `standing_order_id` existence (null -> 404) + ownership (`player_id` mismatch -> 403,
   * decisions §6.1) + liveness (`status`/`expires_at_tick` -> 409) checks — a single round-trip covering
   * all three. Zero mutation, zero P3-H behavior added to the standing-order lifecycle itself (R9.3 — this
   * class stays the sole owner of the `standing_order` table). PARAMETERIZED. A READ — no state change.
   */
  async getByIdWithOwner(orderId: string): Promise<{
    order_id: string;
    lieutenant_id: string;
    player_id: string;
    status: string;
    rule: unknown;
    expires_at_tick: number;
  } | null> {
    const rows = await this.db
      .select({
        order_id: standingOrder.order_id,
        lieutenant_id: standingOrder.lieutenant_id,
        player_id: lieutenant.player_id,
        status: standingOrder.status,
        rule: standingOrder.rule,
        expires_at_tick: sql<number>`extract(epoch from ${standingOrder.expires_at})::int`,
      })
      .from(standingOrder)
      .innerJoin(lieutenant, eq(lieutenant.lieutenant_id, standingOrder.lieutenant_id))
      .where(eq(standingOrder.order_id, orderId))
      .limit(1);
    return rows[0] ?? null;
  }

  // ───────────────────────────── behavior_script.rules (the PROMOTE append surface) ─────────────────────────────
  // PROMOTE_TO_DEFAULT (T4) is the ONLY explicit mutation of behavior_script.rules in this feature: it APPENDS the order's
  // IR rule to the lieutenant's default script (read-modify-write the `{ rules: IrRule[] }` jsonb). This writes the SAME
  // `behavior_script.rules` column the attach path (LieutenantRepository.updateBehaviorScript) writes — NOT a parallel
  // writer / not a second table. It touches ONLY `rules` (+ the audit columns), NOT `source` / `valid`: the appended IR is
  // an embedded rule with no DSL source text (the source/rules divergence — the compile_hash evolving — is the explicit,
  // intended PROMOTE mutation, spec §3.1 / §5). `valid` is already true (the lieutenant was a delegated, valid-script COOK).

  /**
   * Read a lieutenant's default behavior_script `{ rules: IrRule[] }` (the compiled IR) + its `script_id` (the PROMOTE
   * read-modify-write target), or null when the lieutenant / its 1-1 script is absent. ONE inner join over the 1-1
   * behavior_script (the BYTE-MIRROR of LieutenantRepository's joins). NOT player-scoped (the decision endpoint already
   * resolved the player-owned lieutenant). A READ — no state change. The service appends the order's re-clamped/re-indexed
   * rule to `rules.rules` then writes it back via appendBehaviorScriptRule (same `behavior_script` table the attach path uses).
   */
  async getBehaviorScript(lieutenantId: string): Promise<{ scriptId: string; rules: CompiledScript } | null> {
    const rows = await this.db
      .select({ scriptId: behaviorScript.script_id, rules: behaviorScript.rules })
      .from(lieutenant)
      .innerJoin(behaviorScript, eq(behaviorScript.script_id, lieutenant.behavior_script_id))
      .where(eq(lieutenant.lieutenant_id, lieutenantId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { scriptId: row.scriptId, rules: row.rules as CompiledScript };
  }

  /**
   * WRITE the PROMOTE-appended `{ rules: IrRule[] }` back onto an existing behavior_script row (the read-modify-write the
   * service computed): UPDATE ONLY `rules` (+ last_modified_at=now / last_modified_by='player' — the player's PROMOTE
   * decision is the author). Keyed by script_id (the caller read it via getBehaviorScript). The SAME `behavior_script`
   * table + the SAME audit-column convention the attach path (updateBehaviorScript) uses — NOT a parallel writer. `source`
   * / `valid` are deliberately UNTOUCHED (the embedded rule carries no DSL source; the script stays valid). PARAMETERIZED.
   * DETERMINISTIC (last_modified_at = SQL now() — an audit stamp, not read by the deterministic tick lifecycle).
   */
  async appendBehaviorScriptRule(scriptId: string, rules: CompiledScript): Promise<void> {
    await this.db
      .update(behaviorScript)
      .set({
        rules: rules as unknown as Record<string, unknown>,
        last_modified_at: sql`now()`,
        last_modified_by: 'player',
      })
      .where(eq(behaviorScript.script_id, scriptId));
  }

  // ───────────────────────────── standing_order_state (the lapse-pattern ledger) ─────────────────────────────
  // Mirrors SignalDriftRepository.getState/insertState/writeState (the lazy-seed jsonb read-modify-write to MIRROR). The
  // state is a 1-1 CHILD of lieutenant (PK = FK lieutenant_id, ON DELETE CASCADE — migration 0034); the service lazy-seeds
  // it on the first lapse. `pattern` is the per-signature lapse ledger ({ [signature]: { consecutive_lapse_count,
  // promotion_suggested } }); `last_decision_ticks` is the per-kind decision cooldown stamp (T4 — null until a decision runs).

  /**
   * Read the standing_order_state row for a lieutenant by its PK (the 1-1 lieutenant_id), or null when no row exists yet
   * (the service lazy-seeds on the first lapse). RAW — NO lazy-seed (the seed is the service's insertState). NOT
   * player-scoped (the tick already resolved the player-owned lieutenant). A READ — no state change.
   */
  async getState(lieutenantId: string): Promise<StandingOrderStateRow | null> {
    const rows = await this.db
      .select()
      .from(standingOrderState)
      .where(eq(standingOrderState.lieutenant_id, lieutenantId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * INSERT a fresh standing_order_state row (the lazy-seed on the first lapse): the lieutenant_id (PK) + an EMPTY pattern
   * ledger ({}). created_at/updated_at keep the schema defaultNow(); last_decision_ticks stays null (no decision yet). The
   * `now` (the lapse tick) is accepted for symmetry with SignalDriftRepository.insertState (which anchors its window) but
   * standing_order_state has no tick anchor column — the lapse ledger is tick-free (it counts events, not windows), so
   * `now` is currently inert here (kept in the signature so a future tick-anchored column needs no call-site change).
   * Returns the inserted row via `.returning()` (the canonical shape) so the caller needs no re-read. DETERMINISTIC.
   */
  async insertState(lieutenantId: string, _now: number): Promise<StandingOrderStateRow> {
    const [created] = await this.db
      .insert(standingOrderState)
      .values({ lieutenant_id: lieutenantId, pattern: {} })
      .returning();
    return created;
  }

  /**
   * UPDATE the standing_order_state read-modify-write: set the whole `pattern` jsonb (the in-place-mutated per-signature
   * lapse ledger) + the per-kind decision-cooldown stamp jsonb (last_decision_ticks — T4; T3's evaluate passes the
   * unchanged value through). Keyed by lieutenant_id (the PK). A per-lieutenant single-row write (the tick is
   * single-threaded over a player's lieutenants), so writing the whole object is safe. PARAMETERIZED. DETERMINISTIC
   * (updated_at = SQL now()).
   */
  async writeState(
    lieutenantId: string,
    pattern: Record<string, unknown>,
    lastDecisionTicks: Record<string, number> | null,
  ): Promise<void> {
    await this.db
      .update(standingOrderState)
      .set({ pattern, last_decision_ticks: lastDecisionTicks, updated_at: sql`now()` })
      .where(eq(standingOrderState.lieutenant_id, lieutenantId));
  }
}
