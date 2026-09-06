// IMPLEMENTS: docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C0 (DI shell) + C4 (★ Apply/revert engine)
//             Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §2.2 (architecture) + §2.3 (apply/revert lifecycle)
//             Architecture mirror: services/game-back/src/operational/meta_market/meta-market-stub.service.ts (C0)
//             SERIALIZABLE-tx-loop precedent: services/game-back/src/operational/conflict/combat/rival-elimination.service.ts
//               (`db.transaction` + `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` as the FIRST statement +
//               a test-only forced-throw to prove whole-tx rollback)
//             — 04e-A1 C0 — 2026-07-04
//             — 04e-A1 C4 — 2026-07-04 (applyEvent/revertEvent/revertExpired + notify)
//             — 04e-B C2 — 2026-07-06 (DD-B2: applyLiveOpsEvent/revertLiveOpsEvent siblings ADDED —
//             applyEvent/revertEvent/revertExpired above are UNTOUCHED, byte-unchanged)
//             — 04g-B C1 — 2026-07-15 (DD-RW1: applyRandomWorldEvent/revertRandomWorldEvent/
//             reapplyRandomWorldEvent siblings ADDED — applyEvent/revertEvent/revertExpired/
//             applyLiveOpsEvent/revertLiveOpsEvent above are UNTOUCHED, byte-unchanged. Design:
//             docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3.3)
//
// `EffectModifierService` — the thick, revert-guaranteed effect-modifier engine's apply/revert core
// (design §2.3, "the revert guarantee"). Owns exactly 3 operations, each a single SERIALIZABLE
// transaction against the `effect_modifier` table (schema: db/schema/effect_modifier.ts, migration
// 0106, C2) followed by a `pg_notify('effect_modifiers_changed')` AFTER the transaction has committed
// (never inside a still-open tx, and never at all if the tx rolled back — the `await` on
// `this.db.transaction(...)` throws past the `notify()` call on any failure).
//
//   applyEvent(activeEventId, modifiers[])  — INSERT one effect_modifier row per effect, ALL in ONE
//     SERIALIZABLE transaction. All-or-nothing: a mid-batch failure (e.g. a row that violates a DB
//     constraint — invalid enum literal, NOT NULL violation, etc.) rolls the WHOLE batch back, so
//     ZERO rows persist for `activeEventId` — never a partial set (design §2.3, plan C4 falsifiable
//     clause (c)).
//   revertEvent(activeEventId)              — DELETE every effect_modifier row for that event
//     (SERIALIZABLE) + notify. The inverse is DERIVED from the persisted rows themselves — the DELETE
//     *is* the revert, never a recompute from a remembered "before" baseline (design §2.3).
//   revertExpired(currentGameDay)           — DELETE every row whose `expires_at_game_day` is NOT
//     NULL and `<= currentGameDay` (SERIALIZABLE) + notify. A pure function of `(persisted rows,
//     currentGameDay)` — no `Math.random`/`Date.now()` (design "Determinism"). The NIGHTLY political-
//     engine reconciliation tick (A2) calls this; because the persisted column is authoritative (not
//     a floating baseline), calling it after any downtime reconciles whatever should have expired
//     while the process was down — "a crash mid-event can never leave a permanent shift" (design §2.3).
//
// Crash-recovery (design §2.3 / plan C4 falsifiable clause (b)): this service does NOT hold any
// in-memory state of its own — every call reads/writes `effect_modifier` directly. The in-memory
// snapshot that DOES need rebuilding after a crash lives in `EffectOverlayStore` (C3), which already
// reloads from this SAME table on boot (`main.ts:67`, `EffectOverlayStore.init()`) and on every
// `effect_modifiers_changed` notification — so C4 needs no new recovery code, only proof (the E2E
// drops the store's in-memory snapshot + re-inits it via the gated test-only
// `EffectOverlayStore.dropSnapshotForTest()` hook added in `config/effect-overlay-store.ts`, then
// re-invokes the SAME `init()` boot entrypoint `main.ts` calls — no bespoke test-only reload path).
//
// Zero-regression invariant stays intact: this service only ever writes to the NEW `effect_modifier`
// table (migration 0106); no existing table/service/tick/path is touched by C4.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull, lte, sql } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { TunablesStore } from '../../config/tunables-store';
import { effectModifier } from '../../db/schema/effect_modifier';
import type { EffectModifierInput } from './effect-engine.types';

/** The channel `EffectOverlayStore`'s dedicated LISTEN client subscribes to (C3, effect-overlay-store.ts:39). */
const EFFECT_MODIFIERS_CHANGED_CHANNEL = 'effect_modifiers_changed';

@Injectable()
export class EffectModifierService {
  constructor(
    // C4: runs the SERIALIZABLE apply/revert transactions + the post-commit pg_notify through this client.
    @Inject(DB) private readonly db: DrizzleClient,
    // A2/C6-C9 will register the revertExpired NIGHTLY reconciliation + substrate ticks via this scheduler.
    private readonly scheduler: CitySimSchedulerService,
  ) {
    // TunablesStore is a plain module-level singleton (not a Nest provider token) — referenced here to
    // prove the base tunables layer is reachable from this service. C3's EffectOverlayStore (a separate
    // singleton mirroring TunablesStore) is what the 9 lever getters actually compose on top of
    // TunablesStore's base value (C5); this service's own C4 apply/revert reads/writes go through
    // `this.db`.
    void TunablesStore;
  }

  /** C0 boot-probe placeholder — proves the service constructed successfully (DI graph resolved). */
  ping(): { ok: true } {
    void this.scheduler;
    return { ok: true };
  }

  /**
   * `applyEvent` — INSERT one `effect_modifier` row per entry in `modifiers`, ALL in a SINGLE
   * SERIALIZABLE transaction (design §2.3). All-or-nothing: if ANY insert in the loop fails (a
   * constraint violation — e.g. an invalid `effect_scope`/`effect_modifier_op` enum literal, a NOT
   * NULL violation, or an FK violation against a non-existent `activeEventId`), Drizzle rolls the
   * WHOLE transaction back — ZERO rows persist for `activeEventId`, never a partial set.
   *
   * Notifies `effect_modifiers_changed` ONLY after the transaction has committed (the `await` below
   * throws past the `notify()` call if the transaction rolled back, so a failed apply never notifies).
   *
   * @returns the number of modifier rows applied (== `modifiers.length` on success).
   */
  async applyEvent(activeEventId: string, modifiers: readonly EffectModifierInput[]): Promise<number> {
    await this.db.transaction(async (tx) => {
      // FIRST statement: SERIALIZABLE isolation (mirrors rival-elimination.service.ts:95-96).
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      for (const m of modifiers) {
        await tx.insert(effectModifier).values({
          active_event_id: activeEventId,
          scope_type: m.scopeType,
          scope_ref: m.scopeRef ?? null,
          tunable_key: m.tunableKey,
          op: m.op,
          magnitude: String(m.magnitude), // Drizzle numeric() string-mode — no float rounding drift.
          applied_at_game_day: m.appliedAtGameDay,
          expires_at_game_day: m.expiresAtGameDay ?? null,
        });
      }
    });

    await this.notify();
    return modifiers.length;
  }

  /**
   * `revertEvent` — DELETE every `effect_modifier` row whose `active_event_id` matches
   * `activeEventId` (SERIALIZABLE) + notify. The inverse is derived from the persisted rows
   * themselves — the DELETE *is* the revert (design §2.3), so this is idempotent: reverting an event
   * with zero remaining rows deletes zero rows and still notifies (a harmless no-op reload downstream).
   *
   * @returns the number of rows deleted.
   */
  async revertEvent(activeEventId: string): Promise<number> {
    const deleted = await this.db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
      return tx
        .delete(effectModifier)
        .where(eq(effectModifier.active_event_id, activeEventId))
        .returning({ id: effectModifier.id });
    });

    await this.notify();
    return deleted.length;
  }

  /**
   * `revertExpired` — DELETE every `effect_modifier` row whose `expires_at_game_day` IS NOT NULL and
   * `<= currentGameDay` (SERIALIZABLE) + notify. A pure function of `(persisted rows, currentGameDay)`
   * — no `Math.random`/`Date.now()` (design "Determinism"). Rows with a NULL expiry ("permanent-
   * until-election", design §3) are never touched by this sweep. The NIGHTLY political-engine
   * reconciliation tick (A2) calls this; because `expires_at_game_day` is the authoritative revert
   * boundary (never a floating in-memory baseline), calling it after ANY downtime reconciles whatever
   * lapsed while the process was down — "a crash mid-event can never leave a permanent shift".
   *
   * @returns the number of rows deleted.
   */
  async revertExpired(currentGameDay: number): Promise<number> {
    const deleted = await this.db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
      return tx
        .delete(effectModifier)
        .where(
          and(
            isNotNull(effectModifier.expires_at_game_day),
            lte(effectModifier.expires_at_game_day, currentGameDay),
          ),
        )
        .returning({ id: effectModifier.id });
    });

    await this.notify();
    return deleted.length;
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 04e-B C2 (DD-B2) — live-ops siblings. These are GENUINELY SEPARATE methods, not a refactor of
  // applyEvent/revertEvent above (which stay byte-unchanged — zero lines touched). Same SERIALIZABLE
  // all-or-nothing contract, same post-commit notify discipline, targeting the NEW
  // `live_ops_active_event_id` parent column (db/schema/effect_modifier.ts, DD-B2 dual-FK, migration
  // 0114) instead of `active_event_id`. `expiresAtGameDay` for a live-ops modifier MUST always resolve
  // to `null` (enforced by the caller, C4's `activateLiveOpsEvent` / C2's test-hook) — live-ops revert
  // is real-clock-driven (`LiveOpsSchedulerService`, DD-B3) via `revertLiveOpsEvent`'s targeted DELETE
  // or CASCADE from the `live_ops_event_active` parent row, NEVER via `revertExpired`'s game-day NIGHTLY
  // sweep (which only ever matches rows with `expires_at_game_day IS NOT NULL` — a live-ops row with a
  // null expiry is structurally invisible to that sweep, regardless of what `appliedAtGameDay` value it
  // carries). `appliedAtGameDay` itself is a write-only/never-queried audit column on this shared table
  // (grepped: no consumer anywhere reads it) — live-ops has no single meaningful in-game-day axis (each
  // player runs their own city-sim clock), so callers pass a fixed sentinel (0); this is harmless
  // precisely because the column is never read back by any logic.
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `applyLiveOpsEvent` — the live-ops sibling of `applyEvent` (DD-B2). INSERT one `effect_modifier`
   * row per entry in `modifiers`, ALL in a SINGLE SERIALIZABLE transaction, setting
   * `live_ops_active_event_id` (never `active_event_id`) as the parent FK. Same all-or-nothing
   * guarantee as `applyEvent`: a constraint violation anywhere in the batch rolls the WHOLE
   * transaction back — zero rows persist for `liveOpsActiveEventId`.
   *
   * @returns the number of modifier rows applied (== `modifiers.length` on success).
   */
  async applyLiveOpsEvent(
    liveOpsActiveEventId: string,
    modifiers: readonly EffectModifierInput[],
  ): Promise<number> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      for (const m of modifiers) {
        await tx.insert(effectModifier).values({
          live_ops_active_event_id: liveOpsActiveEventId,
          scope_type: m.scopeType,
          scope_ref: m.scopeRef ?? null,
          tunable_key: m.tunableKey,
          op: m.op,
          magnitude: String(m.magnitude), // Drizzle numeric() string-mode — no float rounding drift.
          applied_at_game_day: m.appliedAtGameDay,
          expires_at_game_day: m.expiresAtGameDay ?? null,
        });
      }
    });

    await this.notify();
    return modifiers.length;
  }

  /**
   * `revertLiveOpsEvent` — the live-ops sibling of `revertEvent` (DD-B2). DELETE every
   * `effect_modifier` row whose `live_ops_active_event_id` matches `liveOpsActiveEventId`
   * (SERIALIZABLE) + notify. Same idempotent "the DELETE is the revert" guarantee as `revertEvent`.
   *
   * @returns the number of rows deleted.
   */
  async revertLiveOpsEvent(liveOpsActiveEventId: string): Promise<number> {
    const deleted = await this.db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
      return tx
        .delete(effectModifier)
        .where(eq(effectModifier.live_ops_active_event_id, liveOpsActiveEventId))
        .returning({ id: effectModifier.id });
    });

    await this.notify();
    return deleted.length;
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════
  // 04g-B C1 (DD-RW1) — random-world siblings. These are GENUINELY SEPARATE methods, not a refactor of
  // applyEvent/revertEvent/revertExpired/applyLiveOpsEvent/revertLiveOpsEvent above (which stay
  // byte-unchanged — zero lines touched). Same SERIALIZABLE all-or-nothing contract, same post-commit
  // notify discipline, targeting the NEW `random_world_event_active_id` parent column
  // (db/schema/effect_modifier.ts, DD-RW1 triple-FK, migration 0128) instead of `active_event_id` /
  // `live_ops_active_event_id`. `expiresAtGameDay` for a random-world modifier carries the SAME
  // game-day axis as the political path (design §3.3 "Axe temporel" — NOT the live-ops real-clock
  // axis): a crash-safety-in-depth consequence is that the political NIGHTLY `revertExpired` sweep
  // (:148 above) ALSO reaps expired random-world rows (parent-agnostic on `expires_at_game_day`) even
  // if the random-world daily tick itself never runs — `reapplyRandomWorldEvent` below is the ONLY
  // sibling shape NEW to this family (design D3): a single-transaction DELETE-then-INSERT (never a
  // separate revert+apply pair), so an active random-world event's effect rows are NEVER observably
  // absent between two consecutive magnitudes on a `RecoveryCurve` day-over-day update.
  // ════════════════════════════════════════════════════════════════════════════════════════════════

  /**
   * `applyRandomWorldEvent` — the random-world sibling of `applyEvent`/`applyLiveOpsEvent` (DD-RW1).
   * INSERT one `effect_modifier` row per entry in `modifiers`, ALL in a SINGLE SERIALIZABLE
   * transaction, setting `random_world_event_active_id` (never `active_event_id` /
   * `live_ops_active_event_id`) as the parent FK. Same all-or-nothing guarantee as `applyEvent`: a
   * constraint violation anywhere in the batch rolls the WHOLE transaction back — zero rows persist
   * for `randomWorldEventActiveId`.
   *
   * @returns the number of modifier rows applied (== `modifiers.length` on success).
   */
  async applyRandomWorldEvent(
    randomWorldEventActiveId: string,
    modifiers: readonly EffectModifierInput[],
  ): Promise<number> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      for (const m of modifiers) {
        await tx.insert(effectModifier).values({
          random_world_event_active_id: randomWorldEventActiveId,
          scope_type: m.scopeType,
          scope_ref: m.scopeRef ?? null,
          tunable_key: m.tunableKey,
          op: m.op,
          magnitude: String(m.magnitude), // Drizzle numeric() string-mode — no float rounding drift.
          applied_at_game_day: m.appliedAtGameDay,
          expires_at_game_day: m.expiresAtGameDay ?? null,
        });
      }
    });

    await this.notify();
    return modifiers.length;
  }

  /**
   * `revertRandomWorldEvent` — the random-world sibling of `revertEvent`/`revertLiveOpsEvent`
   * (DD-RW1). DELETE every `effect_modifier` row whose `random_world_event_active_id` matches
   * `randomWorldEventActiveId` (SERIALIZABLE) + notify. Same idempotent "the DELETE is the revert"
   * guarantee as `revertEvent`.
   *
   * @returns the number of rows deleted.
   */
  async revertRandomWorldEvent(randomWorldEventActiveId: string): Promise<number> {
    const deleted = await this.db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
      return tx
        .delete(effectModifier)
        .where(eq(effectModifier.random_world_event_active_id, randomWorldEventActiveId))
        .returning({ id: effectModifier.id });
    });

    await this.notify();
    return deleted.length;
  }

  /**
   * `reapplyRandomWorldEvent` — NEW shape (D3, no `applyEvent`/`applyLiveOpsEvent` equivalent): the
   * vehicle for `RecoveryCurve` day-over-day magnitude updates. DELETE every existing
   * `effect_modifier` row for `randomWorldEventActiveId`, THEN INSERT the new `modifiers` batch, BOTH
   * in ONE SERIALIZABLE transaction, followed by exactly ONE post-commit notify. Never a separate
   * revert-then-apply pair: there is no instant at which a concurrent reader could observe ZERO effect
   * rows for an event that is still active — either the pre-reapply magnitude set or the post-reapply
   * magnitude set is visible, never neither (design §3.3 "jamais une fenêtre inter-tx où les effets
   * d'un event actif sont absents").
   *
   * @returns `{ deletedCount, appliedCount }` — the number of rows removed and the number of rows
   *   inserted (== `modifiers.length` on success).
   */
  async reapplyRandomWorldEvent(
    randomWorldEventActiveId: string,
    modifiers: readonly EffectModifierInput[],
  ): Promise<{ deletedCount: number; appliedCount: number }> {
    const result = await this.db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);

      const deleted = await tx
        .delete(effectModifier)
        .where(eq(effectModifier.random_world_event_active_id, randomWorldEventActiveId))
        .returning({ id: effectModifier.id });

      for (const m of modifiers) {
        await tx.insert(effectModifier).values({
          random_world_event_active_id: randomWorldEventActiveId,
          scope_type: m.scopeType,
          scope_ref: m.scopeRef ?? null,
          tunable_key: m.tunableKey,
          op: m.op,
          magnitude: String(m.magnitude),
          applied_at_game_day: m.appliedAtGameDay,
          expires_at_game_day: m.expiresAtGameDay ?? null,
        });
      }

      return { deletedCount: deleted.length, appliedCount: modifiers.length };
    });

    await this.notify();
    return result;
  }

  /**
   * `pg_notify('effect_modifiers_changed', '')` — fired AFTER a transaction has committed (never from
   * inside one), so `EffectOverlayStore`'s dedicated LISTEN client (C3) only ever reloads
   * already-durable state. A plain (non-transactional) query on the shared pool — never rolled back,
   * never delayed by an open transaction.
   */
  private async notify(): Promise<void> {
    await this.db.execute(sql`SELECT pg_notify(${EFFECT_MODIFIERS_CHANGED_CHANNEL}, '')`);
  }
}
