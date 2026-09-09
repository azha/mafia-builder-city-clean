// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C1 (`BudgetsHorizonModule`
//             scaffold — module + repositories, NO runtime logic yet, C2+ fills it in, DD-G1) + C7
//             ("`IsostaticDebtService.applyUpgrade` ← `CapabilityAdoptedEvent` (event-keyed idempotency
//             guard); active-decay bindings ... floor-guarded single-statement decrements; `decay_path`
//             bookkeeping (ACTIVE marker)").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §3 (`capability_
//             debts` — Isostatic Debt ledger, PK composite mirrors `mastery_score`'s own shape) + §12.1
//             (accrual — upsert, `capacity += capacity_units_granted`, `structural_debt += ratio × units`,
//             event-keyed idempotency guard on `last_upgrade_tick`) + §12.2 (active decay — floor-guarded
//             `GREATEST(0, structural_debt − reduction)`, `decay_path` ACTIVE/MIXED bookkeeping).
//             Pattern (`INSERT … ON CONFLICT DO UPDATE … WHERE <idempotency guard>`, mirrors the P3-F
//             `last_accrued_session_id IS DISTINCT FROM` in-WHERE guard, here keyed on the adopting
//             `CapabilityAdoptedEvent`'s own `gameMinute` stamped into `last_upgrade_tick`): `cue-stack.
//             repository.ts#composeUpsert` (the SAME trailing `WHERE` on a `DO UPDATE` this codebase
//             already uses, `ON CONFLICT (...) DO UPDATE SET ... WHERE ...`). Pattern (floor-guarded
//             single-statement `GREATEST(0, col − amount)` decrement, set-based over a WHERE-matched row
//             set, query-builder `.set({col: sql\`...\`})` + `inArray`): `mastery-score.repository.ts
//             #applyDelta` (`LEAST(100, GREATEST(0, mastery_score + delta))`) + `supply-node-pressure.
//             repository.ts#applyRelief` (`GREATEST(0, backpressure_index - reliefPerTick)`).
//             -- P3-G C1 -- 2026-07-20 (scaffold) / C7 -- 2026-07-20 (applyUpgrade/applyActiveDecay) /
//             C7 remediation -- 2026-07-23 (#25/★#6 RATIFIED, user: DEDUP compound active-decay -4 -> -2 --
//             mig 0139 `last_decay_binding` + `applyActiveDecay`'s own new `bindingKind` guard arm, see
//             that method's own header for the full contract; decisions doc §4 #25 + §6 ★#6) / C8 --
//             2026-07-23 (`applyPassiveDecayBatch` — design §12.3, mig 0140 `last_passive_tick`, the
//             THIRD `capability_debts` writer, deliberately NOT participating in the C7 active-decay
//             dedup pair — see that method's own header; `listVisibleForPlayer` — design §12.4/§13, the
//             `GET /v1/meta/capability-debts` visibility-threshold read).
//
// `CapabilityDebtsRepository` — the ONLY write path onto `capability_debts` (mig 0137). Two C7 writers,
// each a SINGLE atomic statement (0-TOCTOU, no read-then-write):
//   1. `applyUpgrade` — the §12.1 accrual upsert: `INSERT ... ON CONFLICT (player_id, capability_id) DO
//      UPDATE SET capacity += EXCLUDED.capacity, structural_debt += EXCLUDED.structural_debt, last_
//      upgrade_tick = :tick WHERE last_upgrade_tick IS DISTINCT FROM :tick`. The first accrual for a
//      (player,capability) pair is a plain INSERT (no conflict — the WHERE guard only ever gates the
//      UPDATE branch); a bus replay of the SAME `CapabilityAdoptedEvent` (identical `gameMinute`) matches
//      the guard's negation and is a zero-write (`RETURNING` empty — the caller's own no-double-accrual
//      proof). `capacityGranted`/`debtDelta` are caller-derived (catalogue constant / the live `meta.
//      structural_debt_ratio_per_upgrade` getter) — this method performs zero business arithmetic.
//   2. `applyActiveDecay` — the §12.2 active-decay decrement: ONE set-based `UPDATE ... WHERE player_id=
//      :playerId AND capability_id IN (:capabilityCodes) AND structural_debt > 0` — every debt row this
//      player holds whose capability shares the firing decay binding (`IsostaticDebtService`'s own
//      `capabilityCodesForDecayBinding` scope), decremented in ONE statement (mirrors `PlayerProficiency
//      Repository#accrueForSession`'s own "every DELEGATED category, one statement" set-based shape —
//      never a per-capability loop). The `structural_debt > 0` WHERE arm is the floor guard AND the
//      re-fire-at-0 guard in one: a row already at 0 never matches, so `RETURNING` is empty for it — the
//      caller's own "no re-emit `CapabilityDebtClearedEvent`, floor holds" proof. `decay_path` bookkeeping:
//      'NONE'→'ACTIVE', 'PASSIVE'→'MIXED' (C8-forward-compatible — passive decay doesn't exist yet, but
//      the CASE already handles it correctly the day it does), any other value untouched. Two concurrent
//      calls on the SAME row serialize at the Postgres row lock (the SAME `flipToDelegated`/`advanceTier`
//      bare-WHERE atomicity this codebase's every other guarded-UPDATE repository relies on) — the
//      concurrency falsifiable's own "-4 total, no lost update" proof needs zero extra locking here.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { capabilityDebt } from '../db/schema/budgets_horizon';

/** Defensive dual-shape read for a raw `db.execute` result (this codebase's own established idiom —
 *  `player-proficiency.repository.ts#rowsOf`, copied verbatim per convention: no shared extraction
 *  across repositories). */
function rowsOf(result: unknown): Array<Record<string, unknown>> {
  return (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as Array<Record<string, unknown>>);
}

/** `capability_debts.decay_path` (design §3/§12 — the canon `DebtDecayModeEnum`, BO audit field). */
export type DecayPath = 'ACTIVE' | 'PASSIVE' | 'MIXED' | 'NONE';

/** `capability_debts.last_decay_binding` (mig 0139, C7 remediation #25/★#6) — mirrors `CapabilityDecay
 *  Binding.kind` (capability-catalogue.ts) verbatim; the per-resolve dedup guard's own marker, see
 *  `applyActiveDecay`'s own header. */
export type DecayBindingKind = 'bus_event' | 'resolve_hook';

/** `applyUpgrade`'s success shape — the post-write row values (`RETURNING`), so the caller (`Isostatic
 *  DebtService`) never needs a second read to log/probe what actually landed. */
export type ApplyUpgradeResult = { readonly accrued: true; readonly capacity: number; readonly structuralDebt: number } | { readonly accrued: false };

/** One `applyActiveDecay`-touched row's post-write state (`RETURNING`) — the caller's own `CapabilityDebt
 *  ClearedEvent` crossing-detection surface (`structuralDebt === 0` ⇒ this decrement crossed pre>0→post=0
 *  THIS call). */
export interface ActiveDecayRow {
  readonly capabilityId: number;
  readonly structuralDebt: number;
  readonly decayPath: DecayPath;
}

@Injectable()
export class CapabilityDebtsRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Design §12.1 — the accrual upsert (see file header for the full WHERE-guard contract). `debtDelta` is
   * a numeric-string (Drizzle `numeric()` string-mode, no float drift — the caller formats
   * `(ratio * capacityGranted).toFixed(2)`). `tick` is the adopting `CapabilityAdoptedEvent.gameMinute`
   * (the event-keyed idempotency guard's own key — STABLE across a bus replay of the SAME event object,
   * see `IsostaticDebtService.applyUpgrade`'s own header for why this is correct even though every
   * HTTP-triggered adoption today carries `gameMinute: 0`).
   */
  async applyUpgrade(playerId: string, capabilityId: number, capacityGranted: number, debtDelta: string, tick: number): Promise<ApplyUpgradeResult> {
    const result = await this.db.execute(sql`
      INSERT INTO ${capabilityDebt} (player_id, capability_id, capacity, structural_debt, last_upgrade_tick)
      VALUES (${playerId}::uuid, ${capabilityId}::integer, ${capacityGranted}::smallint, ${debtDelta}::numeric, ${tick}::bigint)
      ON CONFLICT (player_id, capability_id) DO UPDATE SET
        capacity = ${capabilityDebt.capacity} + EXCLUDED.capacity,
        structural_debt = ${capabilityDebt.structural_debt} + EXCLUDED.structural_debt,
        last_upgrade_tick = ${tick}::bigint
      WHERE ${capabilityDebt.last_upgrade_tick} IS DISTINCT FROM ${tick}::bigint
      RETURNING capacity, structural_debt
    `);
    const row = rowsOf(result)[0];
    if (!row) return { accrued: false };
    return { accrued: true, capacity: Number(row.capacity), structuralDebt: Number(row.structural_debt) };
  }

  /**
   * Design §12.2 — the active-decay decrement (see file header for the full set-based/floor-guard
   * contract). `capabilityCodes` is `IsostaticDebtService`'s own catalogue-derived scope (every LIVE
   * capability sharing the firing decay binding) — an empty array is a defensive no-op (never reachable
   * on the REAL catalogue today, every LIVE row shares both decay bindings, but the caller never assumes
   * that here).
   *
   * `bindingKind` (mig 0139, C7 remediation #25/★#6 RATIFIED 2026-07-23 — user: DEDUP → −2) — the FIRING
   * `CapabilityDecayBinding.kind` (`IsostaticDebtService.applyActiveDecay`'s own caller, threaded through
   * verbatim, never re-derived here). Guards against the compound −4 a REAL ADD_RULE resolve produces:
   * `AddRuleHandler.apply` re-attaches an ALREADY-valid script → `ScriptAttachedEvent` (kind='bus_event')
   * fires AND the ADD_RULE resolve-hook sibling (kind='resolve_hook') ALSO fires, from ONE player action,
   * onto the SAME row. The added WHERE arm skips a row whose `last_decay_tick` already equals THIS tick
   * AND whose `last_decay_binding` is a DIFFERENT kind — i.e. the OTHER binding already decremented this
   * exact row at this exact tick, so this write would double-count the SAME compound action.
   * NULL-safe (`IS [NOT] DISTINCT FROM`, mirrors `applyUpgrade`'s own event-keyed guard idiom above) and
   * deliberately SYMMETRIC — both `bindingKind` values carry the SAME guard, not just the resolve-hook
   * write — so the arithmetic is race-order-independent: whichever of the two writes actually lands FIRST
   * on this row (the fire-and-forget `ScriptAttachedEvent` bus handler genuinely races the AWAITED
   * resolve-hook call, `IsostaticDebtService`'s own header) claims the tick; the SECOND write is a no-op.
   * Still ONE atomic UPDATE statement, no read-then-write. The SAME-kind case is NEVER blocked by this
   * guard (`last_decay_binding IS DISTINCT FROM :bindingKind` is FALSE when they match) — TWO GENUINELY
   * INDEPENDENT `ScriptAttachedEvent`s at the SAME tick (the Concurrence falsifiable, two real script
   * revisions, different actions) both decrement, −4 legitimately, ★#6 explicitly keeps this case
   * untouched.
   *
   * ★ CORRECTED 2026-07-23 (P3-G C8 fix-in-passing, decisions §4 #25 amendment (iii) — this docstring
   * previously misdescribed the v1 edge case; disclosed as a citation drift too, see the C8 handoff: the
   * decisions doc routes this fix to "the C7 test-file `KNOWN v1 EDGE` comment", but the actual wrong text
   * always lived HERE, not in `tests/e2e/meta_progression/isostatic_debt_accrual.spec.ts` — grep-verified
   * before editing, never trusted from the citation alone). The WRONG claim: "two DIFFERENT real ADD_RULE
   * resolves (two different lieutenants) compounding in the EXACT same game-minute would also dedup down
   * to −2". FALSE — both writes there share `bindingKind='resolve_hook'` (SAME kind), so `last_decay_
   * binding IS DISTINCT FROM :bindingKind` is FALSE for the second write too — the guard NEVER blocks a
   * same-kind pair, exactly like the Concurrence case just above — that scenario nets −4 legitimately (2
   * real, unrelated player actions), NOT −2.
   * THE REAL v1 EDGE (documented, not built, no falsifiable exercises it — psql-confirmed, player-
   * DISFAVORING, non-exploitable, accept-as-TD candidate C11): a standalone script REVISION
   * (`bindingKind='bus_event'`) and an UNRELATED ADD_RULE resolve (`bindingKind='resolve_hook'`) — TWO
   * DISTINCT player actions — sharing ONE game-tick, resolve_hook landing first: the revision's OWN
   * `bus_event` write then finds `last_decay_tick` already stamped THIS tick by the resolve_hook write, a
   * DIFFERENT kind → ITS OWN guard blocks it → the revision's decrement is skipped, net −2 total instead
   * of the "genuinely" correct −4 (2 real, unrelated player actions). The marker is per-(player,
   * capability, tick, kind-differs), not per-action/per-resolve-id (mig 0139) — see decisions §4 #25 (i)/
   * (ii) for the full account.
   */
  async applyActiveDecay(
    playerId: string,
    capabilityCodes: readonly number[],
    reduction: number,
    tick: number,
    bindingKind: DecayBindingKind,
  ): Promise<ActiveDecayRow[]> {
    if (capabilityCodes.length === 0) return [];
    const rows = await this.db
      .update(capabilityDebt)
      .set({
        structural_debt: sql`GREATEST(0, ${capabilityDebt.structural_debt} - ${reduction}::numeric)`,
        decay_path: sql`CASE
          WHEN ${capabilityDebt.decay_path} = 'NONE' THEN 'ACTIVE'
          WHEN ${capabilityDebt.decay_path} = 'PASSIVE' THEN 'MIXED'
          ELSE ${capabilityDebt.decay_path}
        END`,
        last_decay_tick: tick,
        last_decay_binding: bindingKind,
      })
      .where(
        and(
          eq(capabilityDebt.player_id, playerId),
          inArray(capabilityDebt.capability_id, [...capabilityCodes]),
          sql`${capabilityDebt.structural_debt} > 0`,
          sql`NOT (
            ${capabilityDebt.last_decay_tick} IS NOT DISTINCT FROM ${tick}::bigint
            AND ${capabilityDebt.last_decay_binding} IS DISTINCT FROM ${bindingKind}
          )`,
        ),
      )
      .returning({
        capability_id: capabilityDebt.capability_id,
        structural_debt: capabilityDebt.structural_debt,
        decay_path: capabilityDebt.decay_path,
      });
    return rows.map((r) => ({
      capabilityId: r.capability_id,
      structuralDebt: Number(r.structural_debt),
      decayPath: r.decay_path as DecayPath,
    }));
  }

  /**
   * Design §12.3 (D11) — the HOURLY/8 passive-decay batch, the THIRD `capability_debts` writer. ONE
   * set-based `UPDATE ... WHERE player_id = :playerId AND structural_debt > 0 AND :nowTick > COALESCE
   * (last_passive_tick, last_upgrade_tick)` — mirrors `applyActiveDecay`'s own set-based, floor-guarded,
   * no-read-then-write shape, over the SAME `capability_debts_active_idx` partial index.
   *
   * ★ DEDUP DECISION (stated per the C8 dispatch instruction — read the full account in mig 0140's own
   * header before touching this method): passive decay is elapsed-hours-based (N hours → −N), NOT
   * per-event, so it deliberately does NOT participate in the C7 (player, capability, tick, kind-differs)
   * active-decay dedup guard (`applyActiveDecay`'s own `last_decay_tick`/`last_decay_binding` WHERE arm,
   * mig 0139/#25/★#6) — this writer reads/writes `last_passive_tick` ONLY (mig 0140), a column EXCLUSIVE
   * to this method. Had this writer touched `last_decay_tick` instead (the C7 comment's original,
   * pre-mig-0139 assumption), a genuinely-concurrent active-decay write racing the SAME row at the SAME
   * tick would find `last_decay_tick` already stamped by THIS write with no matching `last_decay_binding`
   * → the active write's OWN guard would spuriously skip it, silently swallowing an unrelated player
   * action. The separate column makes that structurally impossible: `applyActiveDecay`'s guard never reads
   * `last_passive_tick`, and this method never reads/writes `last_decay_tick`/`last_decay_binding` — zero
   * shared mutable state between the two writers, by construction. This is exactly what the plan's own
   * Concurrence falsifiable needs ("tick racing an active-decay event on the SAME row → BOTH apply, floor
   * holds, final exact") — see that test for the empirical proof, not just this reasoning.
   *
   * Elapsed-game-hours: `(:nowTick − COALESCE(last_passive_tick, last_upgrade_tick)) / 60`, numeric
   * division (never integer floor — R9, C0-reanchor: "elapsed-game-hours = plain gameMinute/60", the
   * ambient-clock 60-min/hour structural constant, NEVER a second real-time ratio). `last_upgrade_tick` is
   * the correct FIRST-window baseline (always non-NULL once a debt row exists — `applyUpgrade`'s own
   * INSERT, D3-equivalent invariant for this table): the debt starts accruing at the moment of adoption,
   * so the very first passive tick decays exactly the elapsed hours since THEN, not since some earlier
   * unrelated active-decay write. The WHERE's `:nowTick > COALESCE(...)` arm is the idempotency guard: an
   * immediate re-run at the SAME tick computes zero elapsed hours → excluded from the WHERE entirely → a
   * TRUE zero-write (never a zero-effect write), mirroring `applyUpgrade`'s own event-keyed guard idiom.
   *
   * `decay_path` bookkeeping is the exact mirror of `applyActiveDecay`'s own CASE, reverse direction:
   * 'NONE'→'PASSIVE', 'ACTIVE'→'MIXED', else unchanged (this method's own comment in `applyActiveDecay`'s
   * header already predicted this exact CASE, C7: "C8-forward-compatible — passive decay doesn't exist
   * yet, but the CASE already handles it correctly the day it does").
   */
  async applyPassiveDecayBatch(playerId: string, nowTick: number, ratePerHour: number): Promise<ActiveDecayRow[]> {
    const rows = await this.db
      .update(capabilityDebt)
      .set({
        structural_debt: sql`GREATEST(0, ${capabilityDebt.structural_debt} - (
          (${nowTick}::bigint - COALESCE(${capabilityDebt.last_passive_tick}, ${capabilityDebt.last_upgrade_tick}))::numeric / 60
        ) * ${ratePerHour}::numeric)`,
        decay_path: sql`CASE
          WHEN ${capabilityDebt.decay_path} = 'NONE' THEN 'PASSIVE'
          WHEN ${capabilityDebt.decay_path} = 'ACTIVE' THEN 'MIXED'
          ELSE ${capabilityDebt.decay_path}
        END`,
        last_passive_tick: nowTick,
      })
      .where(
        and(
          eq(capabilityDebt.player_id, playerId),
          sql`${capabilityDebt.structural_debt} > 0`,
          sql`${nowTick}::bigint > COALESCE(${capabilityDebt.last_passive_tick}, ${capabilityDebt.last_upgrade_tick})`,
        ),
      )
      .returning({
        capability_id: capabilityDebt.capability_id,
        structural_debt: capabilityDebt.structural_debt,
        decay_path: capabilityDebt.decay_path,
      });
    return rows.map((r) => ({
      capabilityId: r.capability_id,
      structuralDebt: Number(r.structural_debt),
      decayPath: r.decay_path as DecayPath,
    }));
  }

  /**
   * Design §12.4/§13 — the `GET /v1/meta/capability-debts` visibility-threshold read (P5): every debt row
   * this player holds whose `structural_debt >= threshold` — sub-threshold rows are ABSENT from the
   * RESULT SET itself (a WHERE arm, never a post-read filter) — canon's "vulnerability-window" invisibility
   * is structural here, not a display convention a caller could bypass. Returns the RAW `structural_debt`
   * numeric value — this repository performs ZERO business arithmetic (mirrors `applyUpgrade`/
   * `applyActiveDecay`'s own "caller-derived amounts, repository never buckets" discipline); the caller
   * (`IsostaticDebtService.getDebtProjection`) derives the band via `computePenaltyBucket` and the
   * catalogue key via `capabilityCatalogueEntryForCode` — this method never does.
   */
  async listVisibleForPlayer(playerId: string, threshold: number): Promise<Array<{ capabilityId: number; structuralDebt: number }>> {
    const rows = await this.db
      .select({ capability_id: capabilityDebt.capability_id, structural_debt: capabilityDebt.structural_debt })
      .from(capabilityDebt)
      .where(and(eq(capabilityDebt.player_id, playerId), sql`${capabilityDebt.structural_debt} >= ${threshold}::numeric`));
    return rows.map((r) => ({ capabilityId: r.capability_id, structuralDebt: Number(r.structural_debt) }));
  }

  /**
   * P3-H C3 (design §7.1/D13 — ★H-2 WIRE-LIVE, `DeviationEvaluatorService`'s own `CAPABILITY_DEBT_BELOW`
   * read). Every `capability_debts` row this player holds, RAW, NO threshold filter — the SAME query shape
   * as `listVisibleForPlayer` above MINUS its `structural_debt >= threshold` WHERE arm (C0-reanchor
   * §6/R4 ★ DEFINITIVE: `listVisibleForPlayer` is visibility-threshold-gated, wrong for the evaluator,
   * which needs the FIXED `>10` SEVERE cut — a different axis entirely from the player-visibility
   * threshold). Named DISTINCT from `listAllForAdmin`/`listVisibleForPlayer` (and deliberately NOT
   * `listAllForPlayer` — that name collides with `PossibilityHorizonCardsRepository.listAllForPlayer`, a
   * DIFFERENT repository in this same module, C0 MINOR note). Returns the RAW `structural_debt` — this
   * repository performs ZERO bucket arithmetic (mirrors every other reader in this file); the caller
   * (`constraint-evaluators.ts`'s `CAPABILITY_DEBT_BELOW` evaluator) folds via `computePenaltyBucket`. A
   * READ — no state change, zero mutation of P3-G's debt ledger (the D13 ① READ-ONLY discipline).
   */
  async getRawBucketsForPlayer(playerId: string): Promise<Array<{ capabilityId: number; structuralDebt: number }>> {
    const rows = await this.db
      .select({ capability_id: capabilityDebt.capability_id, structural_debt: capabilityDebt.structural_debt })
      .from(capabilityDebt)
      .where(eq(capabilityDebt.player_id, playerId));
    return rows.map((r) => ({ capabilityId: r.capability_id, structuralDebt: Number(r.structural_debt) }));
  }

  /**
   * P3-G C10 (design §14 — `GET /v1/admin/meta/capability-debts`: "Raw structural_debt/capacity/decay_path
   * per player × capability; bucket distribution per cohort"). Every `capability_debts` row, RAW, NO
   * threshold filter (the P5 inversion of `listVisibleForPlayer` above — unfiltered ADMIN read vs the
   * visibility-gated PLAYER read; both READ the SAME table, the wall is which caller reaches which method,
   * never a shared query with a role flag). Optionally scoped to ONE player (`playerId` undefined = every
   * row across the whole cohort — the admin controller's own "raw per-player list" AND "bucket distribution
   * per cohort" both derive from ONE unfiltered call, filtered/aggregated in the controller, never two
   * separate DB round-trips for what is the SAME row set).
   */
  async listAllForAdmin(playerId?: string): Promise<AdminDebtRow[]> {
    const rows = await this.db
      .select({
        player_id: capabilityDebt.player_id,
        capability_id: capabilityDebt.capability_id,
        capacity: capabilityDebt.capacity,
        structural_debt: capabilityDebt.structural_debt,
        decay_path: capabilityDebt.decay_path,
        last_upgrade_tick: capabilityDebt.last_upgrade_tick,
        last_decay_tick: capabilityDebt.last_decay_tick,
      })
      .from(capabilityDebt)
      .where(playerId ? eq(capabilityDebt.player_id, playerId) : undefined);
    return rows.map((r) => ({
      playerId: r.player_id,
      capabilityId: r.capability_id,
      capacity: r.capacity,
      structuralDebt: Number(r.structural_debt),
      decayPath: r.decay_path as DecayPath,
      lastUpgradeTick: r.last_upgrade_tick,
      lastDecayTick: r.last_decay_tick,
    }));
  }

  /**
   * P3-G C10 (design §14 — `POST /v1/admin/meta/capability-debt/force-clear`, canon `isostatic_debt.
   * md:262` "force-clear la dette d'une capability pour un joueur (compensation, debug)"). ONE floor-
   * guarded single-statement UPDATE — the SAME `structural_debt > 0` WHERE idiom `applyActiveDecay`/
   * `applyPassiveDecayBatch` above use (belt-and-suspenders with the admin controller's own pre-read 404/
   * 409 disambiguation): sets `structural_debt` DIRECTLY to 0 (a force-clear is a full write-off, never a
   * decrement) and returns `false` (no row matched — already 0, or a concurrent racer already cleared it)
   * vs the post-write `decay_path` when it DID match — this repository performs zero business logic beyond
   * the guarded write, mirroring every other writer in this file. `decay_path` is left BYTE-UNTOUCHED (a
   * force-clear is not itself a decay event — it never stamps ACTIVE/PASSIVE/MIXED it did not earn); the
   * caller (`IsostaticDebtService.forceClear`) reads the RETURNED `decay_path` to decide whether the
   * `CapabilityDebtClearedEvent`'s closed `'ACTIVE'|'PASSIVE'|'MIXED'` union can honestly be populated (see
   * that method's own header for the narrow, documented `'NONE'` edge). The `structural_debt > 0` WHERE arm
   * is ALSO the Concurrence proof: a force-clear racing the SAME row as the HOURLY passive tick (or an
   * active-decay event) serializes at the Postgres row lock exactly like `applyPassiveDecayBatch` vs
   * `applyActiveDecay` already do — whichever UPDATE lands first on the row wins the WHERE, the second
   * statement re-evaluates against the now-current (already-guarded) value and is a genuine zero-write.
   */
  async forceClear(playerId: string, capabilityId: number): Promise<{ cleared: true; decayPath: DecayPath } | { cleared: false }> {
    const rows = await this.db
      .update(capabilityDebt)
      .set({ structural_debt: '0' })
      .where(and(eq(capabilityDebt.player_id, playerId), eq(capabilityDebt.capability_id, capabilityId), sql`${capabilityDebt.structural_debt} > 0`))
      .returning({ decay_path: capabilityDebt.decay_path });
    const row = rows[0];
    if (!row) return { cleared: false };
    return { cleared: true, decayPath: row.decay_path as DecayPath };
  }
}

/** One raw `capability_debts` row (P3-G C10, `listAllForAdmin`) — the BO-only, P5-inverted shape: every
 *  column the player-facing `CapabilityDebtProjectionRow` deliberately omits (`capacity`/`structural_debt`/
 *  `decay_path`/the raw tick columns), never forwarded to any player-facing endpoint. */
export interface AdminDebtRow {
  readonly playerId: string;
  readonly capabilityId: number;
  readonly capacity: number;
  readonly structuralDebt: number;
  readonly decayPath: DecayPath;
  readonly lastUpgradeTick: number | null;
  readonly lastDecayTick: number | null;
}
