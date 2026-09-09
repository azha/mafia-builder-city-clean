// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C7 ("`IsostaticDebtService.
//             applyUpgrade` ← `CapabilityAdoptedEvent` (design §12.1 — event-keyed idempotency guard);
//             active-decay bindings per catalogue (`ScriptAttachedEvent` + the ADD_RULE resolve-hook
//             sibling — R8 site, additive, the P3-F resolve-hook discipline); floor-guarded single-
//             statement decrements; `CapabilityDebtClearedEvent` exactly-once; `decay_path` bookkeeping.").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §12.1 (accrual) +
//             §12.2 (active decay) + §4 (event topology: "`IsostaticDebtService.applyUpgrade` ←
//             `CapabilityAdoptedEvent` (D10)"; "`IsostaticDebtService.applyActiveDecay` ← the catalogue
//             decay bindings (`ScriptAttachedEvent` + the ADD_RULE resolve-hook sibling — D10)").
//             C0-reanchor: docs/superpowers/specs/2026-07-19-p3-G-C0-reanchor.md §7 (R8 — the
//             `ScriptAttachedEvent` payload IS `{playerId, lieutenantId, buildingId, gameMinute}`; the
//             REAL finding: the event fires ONLY on a genuine REVISION (`wasValid===true`, valid→valid
//             re-script), NEVER on the FIRST authoring — `lieutenant.service.ts:554`, inside the `if
//             (wasValid)` block). ★ THIS CHUNK'S OWN ACKNOWLEDGMENT (per the R8 "recommend C7 confirm
//             reading (a) explicitly at dispatch" note): the `ScriptAttachedEvent` active-decay binding
//             therefore does NOT fire on a player's first successful script authoring on a lieutenant —
//             only a SUBSEQUENT re-script (revision) decays debt via this binding. This is never a debt
//             trap: the independent ADD_RULE resolve-hook binding decays debt regardless of scripting
//             activity, so debt is never gated on scripting revisions ALONE (reading (a), the C0-reanchor's
//             own non-blocking resolution — no spec-writer re-anchor needed, D10 itself is untouched).
//             The E2E floor asserts the first-authoring no-decay case explicitly (a falsifiable in its own
//             right, not merely implied by the revision-only proof).
//             Pattern (bus subscribe + per-listener isolation + a public core method the bus handler AND
//             the E2E floor's direct-invocation/hand-emit test route BOTH call, Lesson #3 — ZERO live-vs-
//             test divergence): `vocab-tier-advancement.service.ts` (`handleCapabilityAdopted`, the SAME
//             `CapabilityAdoptedEvent` subscription this service ALSO subscribes) + `recall-debt-session-
//             subscriber.service.ts` (`processSessionClosed` — the SAME "in-memory cleared/crossed-event
//             probe, no raw-bus-tap-in-tests" convention this service's `clearedEvents` mirrors) +
//             `mastery-accumulator.service.ts#onExceptionResolved` (the EXACT resolve-hook sibling shape
//             `ExceptionsService.resolve()` calls this service's own `onExceptionResolved` the SAME way).
//             — P3-G C7 — 2026-07-20
//   C8 (2026-07-23) IMPLEMENTS: plan §C8 ("SCHEDULE row + `registerSystem` `ISOSTATIC_DEBT_TICK` HOURLY/8
//             (re-verified head); set-based elapsed-game-hours decay over the partial index (design §12.3
//             — R9 clock source, never a second ratio); `computePenaltyBucket` constants + `GET /v1/meta/
//             capability-debts` visibility-threshold projection (design §12.4)"). Design §12.3 (passive
//             decay, D11) + §12.4 (penalty buckets + visibility, D12) + §13 (the projection contract).
//             `applyPassiveDecay` is the THIRD `capability_debts` writer — colocated in THIS service (not
//             a separate tick-service file, unlike `PromotionLockTickService`/`PromotionLockService`)
//             because it shares this service's OWN `clearedEvents` in-memory probe with `applyActiveDecay`
//             (a single array observes crossings from EITHER writer in true call order — the Concurrence
//             falsifiable's own needs, see `applyPassiveDecay`'s own header for the full dedup-independence
//             account, mig 0140's own header for the schema-level rationale).
//
// `IsostaticDebtService` — activates `capability_debts` (design §12): THREE independent write paths (C8
// adds the third), each a single atomic statement (0-TOCTOU) via `CapabilityDebtsRepository`:
//   1. `applyUpgrade` ← `CapabilityAdoptedEvent` (bus subscription, D10): the §12.1 accrual — `capacity +=
//      capacity_units_granted`, `structural_debt += ratio × units`, event-keyed idempotent (see that
//      method's own header + the repository's own header for the full WHERE-guard contract).
//   2. `applyActiveDecay` ← TWO catalogue decay bindings (D10): the `ScriptAttachedEvent` bus subscription
//      (scoped by `capabilityCodesForDecayBinding({kind:'bus_event', event:'script_attached'})`) + the
//      ADD_RULE resolve-hook sibling (`onExceptionResolved`, a SYNCHRONOUS call `ExceptionsService.
//      resolve()` awaits directly — the SAME hook point as `progression.onResolution`/`masteryAccumulator.
//      onExceptionResolved`, scoped by `capabilityCodesForDecayBinding({kind:'resolve_hook',
//      method:'ADD_RULE'})`). Both funnel through the SAME `applyActiveDecay` core method — one write
//      path, one crossing-detection formula (mirrors `MasteryAccumulatorService.applyDelta`'s own "every
//      binding funnels through the SAME write path" shape) — `CapabilityDebtClearedEvent` fires EXACTLY
//      once per row whose decrement crosses pre>0 to post=0 THIS call (the repository's own `structural_
//      debt > 0` WHERE arm is both the floor guard AND the re-fire-at-0 guard, see that method's header).
//   C7 remediation -- 2026-07-23 (#25/★#6 RATIFIED, user: DEDUP the compound −4 a REAL ADD_RULE resolve
//   produces down to −2 net -- one player action = one correct decision. `applyActiveDecay` now threads
//   `binding.kind` through to `CapabilityDebtsRepository#applyActiveDecay`'s own new per-tick dedup guard
//   (mig 0139 `last_decay_binding`); see that method's header for the full contract. Decisions: docs/
//   superpowers/specs/2026-07-19-p3-G-budgets-horizon-decisions.md §4 #25 + §6 ★#6.
//   3. `applyPassiveDecay` ← `ISOSTATIC_DEBT_TICK` (HOURLY/8, D11, C8): elapsed-game-hours × `meta.passive_
//      decay_rate`, set-based over `capability_debts_active_idx`. Deliberately independent of #2's dedup
//      guard (own `last_passive_tick` baseline, mig 0140) — see `applyPassiveDecay`'s own header for the
//      full account. `CapabilityDebtClearedEvent` shares the SAME `clearedEvents` probe/crossing-detection
//      shape as #2.
//   4. `forceClear` ← `POST /v1/admin/meta/capability-debt/force-clear` (C10, design §14, canon
//      `isostatic_debt.md:262` "force-clear ... compensation, debug"): the ONLY admin-triggered writer —
//      a full write-off (`structural_debt -> 0` directly, never a decrement), `decay_path` left byte-
//      untouched. Reuses the SAME `clearedEvents` probe/bus-emit shape as #2/#3 — see that method's own
//      header for the narrow documented edge (a row force-cleared before its first-ever decay).
// `getDebtProjection` (C8) — the `GET /v1/meta/capability-debts` player-facing read (design §12.4/§13):
//   visibility-threshold-filtered, bucket-only (P5) — see that method's own header.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import {
  CityEventBus,
  type CapabilityAdoptedEvent,
  type CapabilityDebtClearedEvent,
  type ScriptAttachedEvent,
} from '../citysim/events/city-event-bus';
import { CitySimSchedulerService } from '../citysim/scheduler/city_sim_scheduler.service';
import { CitySystemId, Cadence, type CitySimTickContext } from '../citysim/scheduler/city_sim_system';
import { metaProgressionTunables } from './meta-progression-tunables';
import {
  capabilityCatalogueEntryForCode,
  capabilityCodesForDecayBinding,
  type CapabilityDecayBinding,
  type CapabilityKey,
} from './capability-catalogue';
import { CapabilityDebtsRepository, type ActiveDecayRow, type DecayPath } from './capability-debts.repository';
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { computePenaltyBucket, type PenaltyBucket } from './penalty-bucket';

/** The two catalogue decay bindings this chunk wires (design §6/D10) — module constants so both the bus
 *  subscription and the resolve-hook entry point reference the SAME literal (never two independently-
 *  typed copies). */
const SCRIPT_ATTACHED_BINDING: CapabilityDecayBinding = { kind: 'bus_event', event: 'script_attached' };
const ADD_RULE_RESOLVE_BINDING: CapabilityDecayBinding = { kind: 'resolve_hook', method: 'ADD_RULE' };

@Injectable()
export class IsostaticDebtService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IsostaticDebtService.name);

  // In-memory probe: every `CapabilityDebtClearedEvent` fired this process (test-only — mirrors
  // `VocabTierAdvancementService.advancedEvents`'s own "no raw-bus-tap-in-tests" posture). Lets the C7
  // floor assert "exactly once" / "zero on re-fire at 0" directly.
  private clearedEvents: CapabilityDebtClearedEvent[] = [];

  constructor(
    private readonly repo: CapabilityDebtsRepository,
    private readonly lieutenantRepo: LieutenantRepository,
    private readonly bus: CityEventBus,
    // C8 — the ISOSTATIC_DEBT_TICK HOURLY/8 registration (design §12.3). SchedulerModule is ALREADY
    // imported by BudgetsHorizonModule (C3, for CityEventBus above) — zero new module wiring.
    private readonly scheduler: CitySimSchedulerService,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.onCapabilityAdopted((event: CapabilityAdoptedEvent) => {
      this.applyUpgrade(event).catch((err) =>
        this.logger.error(`capability_adopted isostatic-debt handler failed (contained): ${errMsg(err)}`),
      );
    });
    this.bus.onScriptAttached((event: ScriptAttachedEvent) => {
      this.applyActiveDecay(event.playerId, SCRIPT_ATTACHED_BINDING, event.gameMinute).catch((err) =>
        this.logger.error(`script_attached isostatic-debt handler failed (contained): ${errMsg(err)}`),
      );
    });
    // C8 — ISOSTATIC_DEBT_TICK (HOURLY/8, design §12.3/D11). Mirrors PromotionLockTickService's own
    // registerSystem shape — the THIRD `capability_debts` writer, colocated HERE (not a separate tick
    // service file) because it shares this service's OWN in-memory `clearedEvents` probe (see
    // `applyPassiveDecay`'s own header for why a single shared probe array matters for the Concurrence
    // falsifiable).
    this.scheduler.registerSystem({
      id: CitySystemId.ISOSTATIC_DEBT_TICK,
      cadence: Cadence.HOURLY,
      order: 8,
      run: async (ctx: CitySimTickContext) => {
        await this.applyPassiveDecay(ctx.playerId, ctx.gameMinute);
      },
    });
    this.logger.log(
      'IsostaticDebtService registered ISOSTATIC_DEBT_TICK at HOURLY/8 — next free after PROMOTION_LOCK_' +
        'TICK/7. Each in-game hour, per player: passive-decays every capability_debts row with structural_' +
        'debt > 0 by elapsed-game-hours x meta.passive_decay_rate (set-based, floor 0); idempotent (zero ' +
        'elapsed -> zero write); a player with no outstanding debt -> zero writes, always.',
    );
  }

  // ────────────────────────────────── test-probe accessors (TEST-ONLY) ──────────────────────────

  /** Every `CapabilityDebtClearedEvent` fired this process (test-probe — never used in production paths). */
  getClearedEvents(): readonly CapabilityDebtClearedEvent[] {
    return this.clearedEvents;
  }

  /** Clear the in-memory cleared-event probe (called by the test reset route). */
  clearClearedEvents(): void {
    this.clearedEvents = [];
  }

  // ── accrual: CapabilityAdoptedEvent (design §12.1) ──────────────────────────────────────────────

  /**
   * Public so the E2E floor's replay falsifiable can drive it directly too (Lesson #3 shape) — though
   * every REAL falsifiable in this chunk exercises the bus subscription end-to-end via the REAL C5 adopt
   * endpoint, or the EXISTING `POST /v1/_test/budgets-horizon/emit-capability-adopted` test hook (C4/C6's
   * own hand-emit route, REUSED here — no NEW test route needed for the replay proof).
   *
   * `capacityGranted`/`debtDelta` are derived from the catalogue constant (`capacityUnitsGranted`, 40 for
   * every LIVE `VOCAB_TIER_*` row) and the LIVE `meta.structural_debt_ratio_per_upgrade` getter (never a
   * re-derived/cached constant — a hot-reloaded ratio takes effect on the VERY NEXT adoption, value-
   * sensitive per chunk falsifiable 1). `debtDelta` is formatted `.toFixed(2)` — the column is `numeric
   * (8,2)`, so the JS float multiplication is rounded to the SAME 2-decimal precision the DB itself
   * enforces, never a silent extra-digit drift. `tick` (the repository's `last_upgrade_tick` guard key) is
   * the event's OWN `gameMinute` — STABLE across a bus replay of the SAME event object even though every
   * REAL HTTP-triggered adoption carries `gameMinute: 0` today (see `adoption.service.ts`'s own "player-
   * triggered HTTP — no scheduler ctx" convention): a replay re-fires the IDENTICAL event, so the
   * IDENTICAL `gameMinute` value re-matches the guard's negation and is refused — the guard's job is
   * "has THIS row already been accrued", not "distinguish two different real ticks" (structurally there is
   * only ever ONE real `CapabilityAdoptedEvent` per (player,capability) pair — the `capability_adoptions`
   * PK, design §12.1's own "one CapabilityAdoptedEvent per adoption by construction").
   */
  async applyUpgrade(event: CapabilityAdoptedEvent): Promise<void> {
    const entry = capabilityCatalogueEntryForCode(event.capabilityId);
    if (entry.capacityUnitsGranted === null) {
      // Defensive-only: a LIVE row always carries capacityUnitsGranted (D3 boot strict-check) — a
      // RESERVED capability can never reach an adoption (never surfaced, never adoptable).
      this.logger.warn(
        `ISOSTATIC_DEBT applyUpgrade: capability ${event.capabilityId} carries no capacityUnitsGranted (RESERVED?) — inert no-op.`,
      );
      return;
    }
    const capacityGranted = entry.capacityUnitsGranted;
    const ratio = metaProgressionTunables.structuralDebtRatioPerUpgrade;
    const debtDelta = (ratio * capacityGranted).toFixed(2);

    const result = await this.repo.applyUpgrade(event.playerId, event.capabilityId, capacityGranted, debtDelta, event.gameMinute);
    if (!result.accrued) {
      this.logger.log(
        `ISOSTATIC_DEBT accrual no-op (event-keyed guard): player=${event.playerId} capability=${event.capabilityId} ` +
          `tick=${event.gameMinute} (replay).`,
      );
      return;
    }
    this.logger.log(
      `ISOSTATIC_DEBT accrued: player=${event.playerId} capability=${event.capabilityId} capacity=${result.capacity} ` +
        `structural_debt=${result.structuralDebt}`,
    );
  }

  // ── active decay: ScriptAttachedEvent binding + the ADD_RULE resolve-hook sibling (design §12.2) ──

  /**
   * `ExceptionsService.resolve()` calls this DIRECTLY (awaited, the SAME hook point as `progression.
   * onResolution`/`sessions.recordExceptionResolved`/`masteryAccumulator.onExceptionResolved` — additive,
   * `resolve()`'s own contract byte-untouched, R8 site `exceptions.service.ts:195`). A structured no-op
   * for every OTHER resolution method (most resolutions are not ADD_RULE — mirrors `MasteryAccumulator
   * Service.onExceptionResolved`'s own "not every resolved card is mastery-bound" posture). `gameMinute`
   * has no scheduler-tick context at a player-triggered resolve, so this fetches the REAL current game
   * tick via `LieutenantRepository.getCurrentGameMinute` (deliberately NOT the hardcoded `0` convention
   * the mastery/progression resolve-hook siblings use for THEIR OWN gameMinute field — THIS chunk's
   * `last_decay_tick` feeds C8's future elapsed-hours passive-decay derivation, `(nowGameMinute −
   * last_decay_tick) / 60`; stamping it `0` would manufacture a spurious multi-day "elapsed" window the
   * very first time the HOURLY/8 tick ever runs against this row).
   */
  async onExceptionResolved(playerId: string, method: string): Promise<void> {
    if (method !== 'ADD_RULE') return;
    const now = await this.lieutenantRepo.getCurrentGameMinute(playerId);
    await this.applyActiveDecay(playerId, ADD_RULE_RESOLVE_BINDING, now);
  }

  /**
   * The shared active-decay core (design §12.2) — both the `ScriptAttachedEvent` bus subscription and
   * `onExceptionResolved` funnel through this. Public so the E2E floor's concurrency falsifiable can
   * hand-drive it directly too (via the `POST /v1/_test/budgets-horizon/emit-script-attached` hand-emit
   * hook, mirroring the C4/C6 `emit-capability-adopted` precedent — genuinely concurrent HTTP calls onto
   * the SAME bus subscription this method serves, Lesson #3, zero live-vs-test divergence).
   *
   * Scope = `capabilityCodesForDecayBinding(binding)` — every LIVE capability sharing THIS decay binding
   * (today all 4 `VOCAB_TIER_*` rows share both bindings, design §6's own "idem" column). `amount` is the
   * LIVE `meta.active_debt_reduction_per_decision` getter (never cached). Every row the repository's OWN
   * `structural_debt > 0` WHERE actually matched (and thus decremented) is inspected for a pre>0→post=0
   * crossing — `structuralDebt === 0` in the `RETURNING` set IS that crossing (a row that was ALREADY 0
   * never matched the WHERE at all, so it never appears here — the floor-holds, no-re-fire proof is
   * structural, not a second read).
   *
   * C7 remediation (#25/★#6 RATIFIED 2026-07-23, user: DEDUP → −2) — `binding.kind` is threaded straight
   * through as the repository's own `bindingKind` guard key (never re-derived): a REAL ADD_RULE resolve
   * fires BOTH bindings from ONE player action (`AddRuleHandler` re-attaches an already-valid script), so
   * the repository's WHERE guard skips whichever of the two writes lands SECOND on the SAME (player,
   * capability, tick) — net −2, not the naively-compound −4. See `CapabilityDebtsRepository#applyActive
   * Decay`'s own header for the full symmetric/race-order-independent contract (including why the
   * Concurrence case — two INDEPENDENT `ScriptAttachedEvent`s — is untouched, still −4).
   */
  async applyActiveDecay(playerId: string, binding: CapabilityDecayBinding, gameMinute: number): Promise<readonly ActiveDecayRow[]> {
    const capabilityCodes = capabilityCodesForDecayBinding(binding);
    if (capabilityCodes.length === 0) return [];

    const amount = metaProgressionTunables.activeDebtReductionPerDecision;
    const rows = await this.repo.applyActiveDecay(playerId, capabilityCodes, amount, gameMinute, binding.kind);

    for (const row of rows) {
      this.logger.log(
        `ISOSTATIC_DEBT active decay: player=${playerId} capability=${row.capabilityId} structural_debt=${row.structuralDebt} ` +
          `decay_path=${row.decayPath}`,
      );
      if (row.structuralDebt === 0) {
        const clearedEvent: CapabilityDebtClearedEvent = {
          type: 'capability_debt_cleared',
          playerId,
          capabilityId: row.capabilityId,
          decayPath: row.decayPath as 'ACTIVE' | 'PASSIVE' | 'MIXED', // never 'NONE' — a just-decremented row always carries a real decay_path.
          gameMinute,
        };
        this.bus.emitCapabilityDebtCleared(clearedEvent);
        this.clearedEvents.push(clearedEvent);
        this.logger.log(`CapabilityDebtCleared: player=${playerId} capability=${row.capabilityId} decay_path=${row.decayPath}`);
      }
    }
    return rows;
  }

  // ── passive decay: ISOSTATIC_DEBT_TICK HOURLY/8 (design §12.3) ─────────────────────────────────

  /**
   * The THIRD `capability_debts` writer (design §12.3/D11) — the HOURLY/8 tick's own core method. Public
   * so the E2E floor's direct-invocation falsifiables can drive it too (Lesson #3 shape, mirrors
   * `PromotionLockTickService.runTick`'s own "the SAME method the scheduler AND the `_test` route call"
   * posture) — the `run-isostatic-debt-tick` test hook (`budgets-horizon-test.controller.ts`) calls this
   * DIRECTLY with an arbitrary `nowTick`, exactly like `run-promotion-lock-tick` does for its own HOURLY
   * sibling (no need to actually advance the real scheduler clock 60+ ticks to observe an elapsed-hours
   * effect).
   *
   * ★ DEDUP DECISION (the C8 dispatch instruction's own explicit ask — restated here, the service-layer
   * half; `CapabilityDebtsRepository#applyPassiveDecayBatch`'s own header carries the full account):
   * passive decay does NOT participate in the C7 (player, capability, tick, kind-differs) active-decay
   * dedup guard. It is elapsed-hours-based (N hours → −N), not per-event — there is no "kind" to dedup
   * against, and deduping it against `applyActiveDecay` would be WRONG (an active decrement and a passive
   * decrement on the SAME row at the SAME tick are two genuinely independent effects — one player-action-
   * driven, one clock-driven — and BOTH must land, the plan's own Concurrence falsifiable). The repository
   * method enforces this by construction: it reads/writes `last_passive_tick` ONLY (mig 0140), a column
   * the C7 `applyActiveDecay`/`applyUpgrade` writers never touch — zero shared mutable state, so neither
   * writer can ever spuriously block the other regardless of firing order or tick collision.
   *
   * Rate = the LIVE `meta.passive_decay_rate` getter (never cached, value-sensitive per chunk falsifiable
   * 1). Crossing-detection (pre>0→post=0 this call → `CapabilityDebtClearedEvent`) is the EXACT same shape
   * `applyActiveDecay` above establishes — a deliberate small duplication rather than a shared-refactor of
   * that already-⊥-approved C7 method (this chunk's own scope discipline: extend, never touch, reviewed
   * code). Both methods push into the SAME `clearedEvents` probe array (colocated in this ONE service),
   * so the E2E floor's Concurrence falsifiable observes cleared events from EITHER writer in true call
   * order with zero extra wiring.
   */
  async applyPassiveDecay(playerId: string, nowTick: number): Promise<readonly ActiveDecayRow[]> {
    const rate = metaProgressionTunables.passiveDecayRate;
    const rows = await this.repo.applyPassiveDecayBatch(playerId, nowTick, rate);

    for (const row of rows) {
      this.logger.log(
        `ISOSTATIC_DEBT passive decay: player=${playerId} capability=${row.capabilityId} structural_debt=${row.structuralDebt} ` +
          `decay_path=${row.decayPath}`,
      );
      if (row.structuralDebt === 0) {
        const clearedEvent: CapabilityDebtClearedEvent = {
          type: 'capability_debt_cleared',
          playerId,
          capabilityId: row.capabilityId,
          decayPath: row.decayPath as 'ACTIVE' | 'PASSIVE' | 'MIXED', // never 'NONE' — a just-decremented row always carries a real decay_path.
          gameMinute: nowTick,
        };
        this.bus.emitCapabilityDebtCleared(clearedEvent);
        this.clearedEvents.push(clearedEvent);
        this.logger.log(`CapabilityDebtCleared: player=${playerId} capability=${row.capabilityId} decay_path=${row.decayPath}`);
      }
    }
    return rows;
  }

  // ── force-clear: POST /v1/admin/meta/capability-debt/force-clear (design §14, C10) ─────────────

  /**
   * The 4th `capability_debts` writer — the ONLY admin-triggered one (design §14, canon `isostatic_debt.
   * md:262`: "force-clear la dette d'une capability pour un joueur (compensation, debug)"). Delegates the
   * atomic write to `CapabilityDebtsRepository#forceClear` (see that method's own header for the full
   * floor-guard/Concurrence contract — the SAME `structural_debt > 0` WHERE idiom `applyActiveDecay`/
   * `applyPassiveDecay` use, so a force-clear racing the HOURLY tick on the SAME row resolves to exactly
   * ONE winner by the SAME Postgres row-lock argument those two already rely on).
   *
   * `CapabilityDebtClearedEvent` shape parity with organic clearing (plan C10 falsifiable 4, "the SAME
   * event shape... payload equality modulo tick"): the emitted event has the IDENTICAL 4-field shape
   * (`type`/`playerId`/`capabilityId`/`decayPath`/`gameMinute`) `applyActiveDecay`/`applyPassiveDecay`
   * emit, pushed into the SAME `clearedEvents` probe — never a parallel event class. `decayPath` is the
   * row's OWN `decay_path` AT THE MOMENT of clearing (repository-returned, byte-untouched by the force-
   * clear write itself — see that method's own header) — genuine prior decay history, never synthesized.
   *
   * Narrow documented edge (mirrors `applyPassiveDecayBatch`'s own "documented, not built, non-exploitable"
   * posture, C8's real v1-edge comment): `CapabilityDebtClearedEvent.decayPath` is structurally
   * `'ACTIVE'|'PASSIVE'|'MIXED'` — it can never legitimately be `'NONE'` ("a just-decremented row always
   * carries a real decay_path", `city-event-bus.ts`'s own comment on that type). A debt row CAN still be
   * force-cleared while `decay_path='NONE'` (accrued via `applyUpgrade` but never once decayed — no real
   * gameplay flow makes this UNREACHABLE, just uncommon: any REAL adoption's capability shares both decay
   * bindings, design §6, so ordinary play tends to touch decay before support ever force-clears it). For
   * THAT one case this method clears the debt in the DB (`cleared: true` still returned) but emits NO
   * event — an honest silent no-signal rather than a fabricated `decayPath`, never exercised by this
   * chunk's own falsifiables (which build a decayed fixture first, exactly like a real support scenario
   * would), accept-as-TD-candidate if it is ever actually reached operationally.
   */
  async forceClear(playerId: string, capabilityId: number): Promise<{ cleared: true; decayPath: DecayPath } | { cleared: false }> {
    const result = await this.repo.forceClear(playerId, capabilityId);
    if (!result.cleared) return { cleared: false };

    if (result.decayPath !== 'NONE') {
      const now = await this.lieutenantRepo.getCurrentGameMinute(playerId);
      const clearedEvent: CapabilityDebtClearedEvent = {
        type: 'capability_debt_cleared',
        playerId,
        capabilityId,
        decayPath: result.decayPath,
        gameMinute: now,
      };
      this.bus.emitCapabilityDebtCleared(clearedEvent);
      this.clearedEvents.push(clearedEvent);
      this.logger.log(`CapabilityDebtCleared (force-clear): player=${playerId} capability=${capabilityId} decay_path=${result.decayPath}`);
    } else {
      this.logger.log(
        `ISOSTATIC_DEBT force-clear: player=${playerId} capability=${capabilityId} cleared decay_path=NONE ` +
          '(never decayed — no CapabilityDebtClearedEvent, the honest edge, see this method\'s own header).',
      );
    }
    return { cleared: true, decayPath: result.decayPath };
  }

  // ── player projection: GET /v1/meta/capability-debts (design §12.4/§13) ────────────────────────

  /**
   * `GET /v1/meta/capability-debts` (design §12.4/§13) — the player-facing visibility-threshold
   * projection: every debt row `structural_debt >= meta.debt_visibility_threshold` (the LIVE getter,
   * value-sensitive), `{capability_key, debt_bucket}` ONLY — bucket, never a number (P5). Sub-threshold
   * debt exists, decays, and stays invisible BY CONSTRUCTION (the repository's own WHERE, see
   * `CapabilityDebtsRepository.listVisibleForPlayer`'s own header — never a post-read filter this method
   * could get wrong). `debt_bucket` is derived via `computePenaltyBucket` (design §12.4/D12) — two debts
   * in the same band are byte-identical rows (that function's own "pure fold" guarantee).
   */
  async getDebtProjection(playerId: string): Promise<CapabilityDebtProjectionRow[]> {
    const threshold = metaProgressionTunables.debtVisibilityThreshold;
    const rows = await this.repo.listVisibleForPlayer(playerId, threshold);
    return rows.map((row) => ({
      capability_key: capabilityCatalogueEntryForCode(row.capabilityId).key,
      debt_bucket: computePenaltyBucket(row.structuralDebt),
    }));
  }
}

/** One `GET /v1/meta/capability-debts` row (design §12.4/§13) — the ONLY two ALLOWED_KEYS fields (P5):
 *  never `structural_debt`, `capacity`, or any other raw internal. */
export interface CapabilityDebtProjectionRow {
  readonly capability_key: CapabilityKey;
  readonly debt_bucket: PenaltyBucket;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
