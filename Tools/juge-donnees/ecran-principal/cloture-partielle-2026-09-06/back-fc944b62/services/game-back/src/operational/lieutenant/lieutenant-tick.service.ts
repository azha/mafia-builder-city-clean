// IMPLEMENTS: docs/superpowers/specs/2026-06-07-phase-06-lieutenants-dsl-slice1-design.md §4-T6/§6 (the LIEUTENANT_TICK
//             delegation tick — each in-game minute it evaluates every delegated lieutenant's compiled script + applies
//             the resolved action) + §isolation (per-lieutenant try/catch — one bad lieutenant never breaks the tick or
//             another lieutenant) + §no-regression (organically a no-op for a player with no delegated lieutenant —
//             byte-identical) +
//             docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Implications par couche §NestJS — game-back
//             ("Module dsl/executor : sandboxed interpreter de l'IR, PAR TICK PAR LIEUTENANT … write uniquement via
//             `side_effects` déclarés") — the executor decides, the binding adapts, THIS tick orchestrates + applies +
//             docs/tech/04_city_simulation/composition_overview.md §NestJS — backend jeu (the CitySimSystem hook
//             contract — an operational tick-hook plugs into the SAME scheduler at a declared (cadence, order) slot) +
//             docs/tech/09_data_model/schema_lieutenant.md §2/§4 (lieutenant.delegation_paused — R9.3 READ + the
//             write-on-transition mutate; the compiled IR lives in behavior_script.rules)
//             -- session:2026-06-08 (Phase 6 vector #6 lieutenants+DSL — Task 6, delegation tick) --
//
// `LieutenantTickService` — the LIEUTENANT_TICK delegation tick (Phase-6 vector #6 T6 — the vector's ONE NEW TICK, the
// RISK task: the new tick joins the shared city-sim DAG, so the byte-identical no-regression guarantee + per-lieutenant
// isolation are paramount). It is an operational-chain tick-hook (NOT one of the 11 city-sim systems) registered on the
// EXISTING CitySimScheduler at {MINUTE, order 19 = LIEUTENANT_TICK} — LAST in the minute band, after GROW_ADVANCE/18 (the
// next free slot). It mirrors the MoneyHoldingAuditService / GrowAdvanceService registration shape EXACTLY
// (OnApplicationBootstrap → registerCadence via the SAME registerSystem path), REPLACING the no-op placeholder there.
// Placed LAST so the existing minute-band DAG is unperturbed; it runs AFTER COOK_ADVANCE/8 in the same minute, which is
// the natural ordering (the cook-advance has already completed/advanced any in-progress cook → the binding's cook_idle
// signal reflects the freshest cook state when the lieutenant decides whether to restart one).
//
// THE TICK (per player, each MINUTE; deterministic, NO RNG): select the player's DELEGATED, executor-granted lieutenants
// with a VALID behavior_script (listDelegatedForPlayer — the organic no-op: a player with none → empty → ZERO writes,
// the no-regression guarantee). For EACH lieutenant, in a PER-LIEUTENANT try/catch (a fault on one lieutenant is logged
// and MUST NOT break the tick or another lieutenant — spec §isolation):
//   1. build the per-tick SignalSnapshot from real game state (the COOK binding T5 — cook_idle / heat).
//   2. resolve the stored compiled IR (behavior_script.rules) against the snapshot (the DSL executor T3 — pure,
//      deterministic; highest-priority matched rule wins, tie-break lowest IR index; the executor is total — it never
//      throws, falling back to EXECUTE_DEFAULT on budget exhaustion / any internal fault).
//   3. APPLY the resolved token (the clean state model — delegation_paused MIRRORS the resolved action, written ONLY on a
//      transition; the write-amplification discipline):
//        - newPaused = (resolved.kind === 'PAUSE_OPS'); if it differs from the persisted delegation_paused → write it.
//        - EXECUTE_DEFAULT → restart the cook (the binding's applyExecuteDefault; its benign-409 catch handles
//          already-cooking / no-precursor — those are NOT faults).
//        - NONE / PAUSE_OPS → no operational action (NONE = no rule matched, e.g. a cook is already running with low
//          heat; PAUSE_OPS = heat high → don't start a new cook).
//
// RATIONALE (why delegation_paused MIRRORS, not controls): the executor is STATELESS and re-evaluates the whole script
// every tick, so delegation_paused is the OBSERVABLE reflection of the LAST resolution (consumed by T7's projection as
// the PAUSED band), NOT a control input — which is why it simply mirrors `resolved.kind === 'PAUSE_OPS'` and is written
// only on change. The resume is automatic: once heat drops, PAUSE_OPS no longer matches → EXECUTE_DEFAULT (or NONE) wins
// → newPaused=false → the transition clears delegation_paused + the cook restarts on the SAME tick.
//
// REUSE (never reimplement): the per-archetype bindings (buildSnapshot + applyExecuteDefault) resolved through the
// `BindingRegistry` (Phase-7 generalization — the tick no longer hardcodes the COOK binding; it dispatches by
// role_archetype), the DSL executor (resolve — T3), the scheduler registry contract (registerSystem). NO signal reads /
// no resolution logic here (this is the orchestrator ONLY). NO projection / band logic / GET endpoint (T7). NO schema
// change (T0 owns it). NO new recruit/attach logic. Set-based where it matters: the common case (no delegated lieutenant,
// or a steady state with no transition) writes NOTHING. Deterministic (NO RNG — a fixed function of the persisted IR + the
// resolved snapshot + the persisted delegation_paused).
//
// PHASE-7 GENERALIZATION (the COOK path is byte-identical): per delegated lieutenant the tick derives the role_archetype
// from the persisted role_id (archetypeForRoleId) and resolves the binding via registry.get(role_archetype). For a COOK
// lieutenant this resolves the SAME CookBindingService the Phase-6 tick injected directly → the SAME snapshot, the SAME
// resolve, the SAME write-on-transition + apply. A lieutenant whose role_archetype has no registered binding (it should
// never happen — a recruited archetype is always registered) is skipped + logged (defensive isolation).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import { DslExecutorService } from '../../dsl/executor.service';
import type { CompiledScript, IrCondition } from '../../dsl/ir';
import type { ResolvedAction, SignalSnapshot } from '../../dsl/signals';
import { BindingRegistry } from './binding-registry.service';
import type { DelegationLieutenant } from './archetype-binding';
import { archetypeForRoleId, archetypeForDslRole, roleIdForArchetype } from './lieutenant-archetype';
import { LieutenantRepository, type DelegatedLieutenant } from './lieutenant.repository';
import { AutonomyCeilingService } from './autonomy/autonomy-ceiling.service';
import { AutonomyReportRepository } from './autonomy/autonomy-report.repository';
import { AutonomyReportsService } from './autonomy/autonomy-reports.service';
import { lieutenantTunables } from './lieutenant-tunables';
import { projectCategory } from './autonomy/autonomy-category';
import { SignalDriftService } from './signal-drift/signal-drift.service';
import { resolveSubstitution, combineByPriority } from './signal-drift/signal-drift-substitution';
import { deriveActiveCues, type CueKind } from './signal-drift/signal-drift-cues';
import { StandingOrderService } from './standing-order/standing-order.service';
import { ExceptionsRepository } from '../../exceptions/exceptions.repository';

@Injectable()
export class LieutenantTickService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LieutenantTickService.name);

  constructor(
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: LieutenantRepository,
    private readonly registry: BindingRegistry,
    private readonly executor: DslExecutorService,
    // PHASE-14: the shared CityEventBus (EXPORTED by SchedulerModule, ALREADY imported by LieutenantModule for
    // registerSystem). The tick emits a LieutenantSalientUncoveredEvent onto it when a delegated lieutenant faces a
    // salient signal its script does not cover — the exceptions producer (decoupled) subscribes. ONE-WAY: this tick
    // imports the BUS (the shared seam), NEVER the exceptions module.
    private readonly bus: CityEventBus,
    // PHASE-19 L1a: the autonomy ceiling gate. The tick refreshes the budget (refreshIfDue) once per delegated lieutenant
    // per tick, then GATES each resolved EXECUTE_DEFAULT through checkAndConsume — a depleted budget REFUSES the action
    // (emitting an AutonomyCeilingRefusalEvent the decoupled report producer subscribes to) instead of running it; a
    // benign no-op (the binding returns 'NOOP') is REFUNDED so only net-taken actions consume the budget.
    private readonly autonomy: AutonomyCeilingService,
    // PHASE-22 L2a: the signal-drift cue-reliability measurement service. After a delegated EXECUTE_DEFAULT runs in the
    // non-refused branch (and its TAKEN|NOOP outcome is known), the tick calls observeOutcome to tally the active cues +
    // update the lieutenant's drift phase. NOT consulted on a REFUSED/settling/non-acting tick. One call, no logic inline.
    private readonly signalDrift: SignalDriftService,
    // PHASE-25 L3: the standing-order service. On the acting path, BEFORE the executor resolves, the tick reads the
    // lieutenant's active-or-injecting order rule (getActiveRule — RAW, no seed; re-stamped to STANDING_ORDER_PRIORITY) and
    // PREPENDS it to the compiled script so the order WINS the executor's resolution when its trigger matches (the override
    // of the default script). When there is NO order, getActiveRule returns null and the tick resolves `lt.rules`
    // byte-identically (the no-regression path). The evaluate/lapse lifecycle (EXPIRES_SOON/LAPSE/pattern) is T3.
    private readonly standingOrder: StandingOrderService,
    // PHASE-19 L1a T6g — TD-049 default_on_timeout (§3.6 design): the backlog-cap auto-default. On each tick, AFTER
    // refreshIfDue, the tick checks whether the lieutenant's open report has aged beyond `backlogCapCycles` cycles; if so,
    // it auto-applies option A on every undecided issue (the design's default option) and closes the report. The report
    // repository supplies the stale-open-report look-up; the reports service owns the per-issue apply + record-decision.
    private readonly autonomyReportRepo: AutonomyReportRepository,
    private readonly autonomyReports: AutonomyReportsService,
    // D1 C7 — TD-031 REQUEST_PLAYER_INPUT sink (DELIVERY-FORM=(i) — no circular dep: ExceptionsModule imports
    // LieutenantModule, so LieutenantModule cannot import ExceptionsModule; instead inject ExceptionsRepository
    // directly, available via the @Global() DbModule without a module import). The tick imports NOTHING from
    // ExceptionsModule — only the repository (a plain injectable). NO circular.
    private readonly exceptionsRepo: ExceptionsRepository,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadence();
    this.logger.log(
      'LieutenantTickService registered at MINUTE/19 (LIEUTENANT_TICK) — the lieutenants+DSL vector\'s ONE NEW TICK. ' +
        'Each in-game minute (LAST in the minute band, after GROW_ADVANCE/18 → the existing DAG is unperturbed) it ' +
        'selects the player\'s DELEGATED executor-granted lieutenants with a VALID behavior_script, and for EACH ' +
        '(per-lieutenant try/catch — one bad lieutenant never breaks the tick or another) builds the per-tick ' +
        'SignalSnapshot (COOK binding), resolves the stored compiled IR (DSL executor — highest-priority rule, tie-break ' +
        'lowest IR index), and applies the token: PAUSE_OPS → delegation_paused mirrors the resolution (written ONLY on ' +
        'a transition — write-amplification); EXECUTE_DEFAULT → restart the cook (benign-409 handled); NONE/PAUSE_OPS → ' +
        'no operational action. Organically a no-op (no delegated lieutenant → ZERO writes — byte-identical ' +
        'no-regression). Deterministic (NO RNG).',
    );
  }

  /** Register the MINUTE/19 = LIEUTENANT_TICK slot (the SAME registerSystem path the grow hook uses at MINUTE/18). */
  private registerCadence(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.LIEUTENANT_TICK,
      cadence: Cadence.MINUTE,
      order: 19,
      run: (ctx) => this.runTick(ctx),
    });
  }

  // ───────────────────────────── the registered MINUTE/19 tick (delegation evaluation) ─────────────────────────────

  /**
   * {MINUTE, order 19} — the per-player delegation tick, evaluated every in-game minute. Selects the player's delegated
   * valid-script lieutenants; for each, builds the snapshot (binding), resolves the IR (executor), and applies the token
   * (write-on-transition). Deterministic (NO RNG). Organically a no-op (no delegated lieutenant → ZERO writes — the
   * byte-identical no-regression guarantee). Each lieutenant runs in its OWN try/catch so a fault on one is contained.
   */
  private async runTick(ctx: CitySimTickContext): Promise<void> {
    const lts = await this.repo.listDelegatedForPlayer(ctx.playerId);
    if (lts.length === 0) return; // no delegated valid-script lieutenant → clean no-op (the common case / no-regression).

    for (const lt of lts) {
      try {
        await this.applyForLieutenant(ctx.playerId, lt, ctx.gameMinute);
      } catch (err) {
        // ISOLATION (spec §isolation): a fault on ONE lieutenant is logged and contained — it never breaks the tick or
        // another lieutenant. (The executor itself is total — it never throws — so a fault here is from the binding's
        // snapshot read / the cook apply; it is swallowed per-lieutenant, the loop continues with the next lieutenant.)
        this.logger.error(
          `LIEUTENANT_TICK: lieutenant=${lt.lieutenant_id} (player=${ctx.playerId}, gm=${ctx.gameMinute}) failed — ` +
            `contained, the tick continues: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /**
   * Evaluate + apply ONE delegated lieutenant (called inside the per-lieutenant try/catch). Derive the role_archetype from
   * the persisted role_id (archetypeForRoleId) → resolve the binding (registry.get) → build the snapshot → resolve the
   * stored IR (T3) → apply the token. delegation_paused MIRRORS `resolved.kind === 'PAUSE_OPS'` and is written ONLY on a
   * transition (write-amplification). EXECUTE_DEFAULT runs the archetype's default action (the binding owns it + its
   * benign-409 no-op). NONE / PAUSE_OPS take no operational action. The COOK path is BYTE-IDENTICAL to Phase-6 (the
   * registry resolves the SAME CookBindingService — same snapshot, same action, same transition write).
   *
   * PHASE-11 TENURE INERTIA (Idea #38, A2 — gates the Phase-6/7 body):
   *   - SETTLING (the disruption window after a reassign — A4 arms it): while `settling_until_tick > now` the delegation
   *     is SUSPENDED — the tick returns EARLY (no snapshot, no resolve, no delegation_paused write, no accrual). When the
   *     window has passed (`settling_until_tick <= now`) the tick CLEARS it (settling → NULL → delegation resumes) and
   *     proceeds to the normal body THIS tick.
   *   - ACCRUAL: a NON-settling, NON-paused delegated lieutenant accrues +1 streak this tick (incrementTenureScore — the
   *     uninterrupted-occupancy counter; the bucket is DERIVED from it, never stored — canon Invariant 4). A lieutenant
   *     that resolved PAUSE_OPS this tick does NOT accrue (the streak counts only ACTIVE delegation minutes).
   * `now` is ctx.gameMinute (the monotonic absolute in-game-minute tick; the SAME clock the settling window lives in).
   */
  private async applyForLieutenant(playerId: string, lt: DelegatedLieutenant, now: number): Promise<void> {
    // (1) SETTLING gate — while strictly in the future, the delegation is SUSPENDED: no resolve, no snapshot, no accrual,
    //     no delegation_paused write (the lieutenant is mid-disruption after a reassign — A4). Return EARLY.
    const settling = lt.settling_until_tick;
    if (settling !== null && settling > now) return;

    // (2) The settling window has PASSED (settling was armed and is now at/before `now`) → CLEAR it (delegation resumes).
    //     We then proceed to the normal Phase-6/7 body THIS tick (resolve + accrue) — the resume is immediate.
    if (settling !== null) {
      await this.repo.clearSettling(lt.lieutenant_id);
    }

    // Derive the archetype from the persisted role_id (the single source-of-truth map; COOK ⇒ role_id 1). A role_id with
    // no derivable archetype is skipped (defensive — a recruited lieutenant always has a derivable, registered archetype).
    const roleArchetype = archetypeForRoleId(lt.role_id);
    if (roleArchetype === null) {
      this.logger.warn(
        `LIEUTENANT_TICK: lieutenant=${lt.lieutenant_id} has a non-derivable role_id=${lt.role_id} — skipped (no archetype).`,
      );
      return;
    }

    const binding = this.registry.get(roleArchetype);
    if (binding === undefined) {
      // A recruited archetype is always registered (recruit's registry.require gate guarantees it), so this is purely
      // defensive — never expected at runtime. Skip + log; the per-lieutenant isolation contains it regardless.
      this.logger.warn(
        `LIEUTENANT_TICK: lieutenant=${lt.lieutenant_id} archetype=${roleArchetype} has NO registered binding — skipped.`,
      );
      return;
    }

    // System 9c C5 — OQ-T1 NARROW SKIP: a LOGISTICS lieutenant assigned to a distribution_hub is
    // coordinator/event-driven (CoordinatorExecutionService handles its RouteRequestEvent). It MUST NOT
    // be driven by the MINUTE/19 tick too (double-drive prohibition). NARROW: only skip when the
    // assigned building is a distribution_hub; a LOGISTICS lieutenant on a stash/lab (the old path —
    // used by lieutenant_logistics_delegation.spec.ts) stays tick-driven unchanged.
    if (roleArchetype === 'LOGISTICS' && lt.assigned_building_id !== null) {
      const isHub = await this.repo.isDistributionHub(lt.assigned_building_id);
      if (isHub) {
        this.logger.debug(
          `LIEUTENANT_TICK: lieutenant=${lt.lieutenant_id} is a LOGISTICS coordinator ` +
            `(hub=${lt.assigned_building_id}) — skipped from tick (event-driven, OQ-T1, System 9c C5).`,
        );
        return;
      }
    }

    // PHASE-19 L1a — TICK-ALIGNED AUTONOMY REFRESH: once per delegated lieutenant that reaches the action body (past the
    // settling gate, with a derivable+registered archetype), regenerate the autonomy budget if the refresh window has
    // elapsed (a no-op write when it has not). Placed BEFORE the action gate so a refused→refreshed lieutenant resumes the
    // SAME tick. NOT run for a settling/early-returned lieutenant (those returned above) — matching the existing flow.
    // Returns true if a refresh was performed (the budget was restored to full for all categories). On a refresh, emit
    // AutonomyCeilingStateUpdatedEvent (design §3.9) so any BO/projection consumer can react to the new bucket without
    // reading the raw counter (P5/R2.2). No subscriber in L1a — the seam a consumer plugs into later.
    const refreshed = await this.autonomy.refreshIfDue(lt.lieutenant_id, roleArchetype, now);
    if (refreshed) {
      this.bus.emitAutonomyCeilingStateUpdated({
        type: 'autonomy_ceiling_state_updated',
        playerId,
        lieutenantId: lt.lieutenant_id,
        archetype: roleArchetype,
        category: projectCategory(roleArchetype),
        bucket: 'full', // refreshIfDue restores every category to its cap → bucket = 'full' (deterministic).
        gameMinute: now,
      });
    }

    // PHASE-19 L1a T6g — TD-049 default_on_timeout (§3.6): after the refresh (which may have just bumped cycle_id),
    // check if the lieutenant's OPEN report has aged beyond `backlogCapCycles` cycles without player resolution. If so,
    // auto-apply option A on every undecided issue (the design's `autonomy_report_default_option = 1 = A`) and close the
    // report. The check uses the CURRENT cycle_id from the just-refreshed state. A no-op when no stale report exists.
    // Audit-logged inside autonomyReports.autoDefault (§3.6: "Audit-loggé").
    await this.applyDefaultOnTimeout(playerId, lt.lieutenant_id, roleArchetype, lt.assigned_building_id, lt.target_building_id);

    // The binding row — the canonical DelegationLieutenant the binding reads (it consults only the fields it needs; COOK
    // reads assigned_building_id, LOGISTICS will read target_building_id, …). role_archetype is the derived archetype.
    const bindingRow: DelegationLieutenant = {
      lieutenant_id: lt.lieutenant_id,
      assigned_building_id: lt.assigned_building_id,
      target_building_id: lt.target_building_id,
      role_archetype: roleArchetype,
      delegation_paused: lt.delegation_paused,
      // The delegated lieutenant's BO-only streak (Phase-11) — the COOK binding derives the tenure yield bonus captured at
      // startCook from it (Phase-11b C1); other archetypes ignore it. listDelegatedForPlayer already carries it (A2).
      tenure_score: lt.tenure_score,
      rules: lt.rules,
    };

    const snapshot = await binding.buildSnapshot(playerId, bindingRow);

    // PHASE-24 L2b T2 — DRIFT EXPOSURE: read the lieutenant's persisted drift runtime (drift_phase + dominant_cue_kind,
    // RAW/no-lazy-seed — getDriftRuntime mirrors getCueBands) and EXPOSE the drift_phase onto the snapshot as the
    // `interpretation_drift` enum-string STATE signal BEFORE the executor resolves. This lets a drift-aware DSL rule
    // (`STATE(interpretation_drift, =, INCIDENTAL_LOCKED) THEN PAUSE_OPS`) finally MATCH — before this, the binding never
    // populated the field, so an absent operand made the trigger a non-match (signals.ts §ABSENCE CONTRACT). A
    // never-drifted lieutenant reads the neutral 'DIRECT_ALIGNED' baseline (and creates NO drift row from this read).
    // `driftRuntime` is held in scope for Task 3 (the substitution resolver) — read ONCE per tick, never twice.
    const driftRuntime = await this.signalDrift.getDriftRuntime(lt.lieutenant_id);
    snapshot.state.interpretation_drift = driftRuntime.drift_phase; // enum-string; the executor can now read it.

    // PHASE-24 L2b (review-polish) — DERIVE THE ACTIVE-CUE SET ONCE. The active cues are a pure function of
    // (archetype, snapshot, tick); compute them HERE (after the snapshot is built + enriched) and thread the SAME Set into
    // BOTH the substitution resolver (which READS `.has(dominantCue)`) and the measurement (observeOutcome, which TALLIES +
    // `.delete('DIRECT_ORDER')`). Previously each call derived its own — the "same cue set" contract was a coincidence of
    // two identical derivations; now it is STRUCTURAL (one derivation). deriveActiveCues ignores `interpretation_drift` (it
    // reads heat_high / cook_idle / the night slot / peer_paused), so deriving it before vs after that enrichment is
    // identical — but we derive it here, after enrichment, so the tick holds ONE canonical Set for the rest of the tick.
    const activeCues: Set<CueKind> = deriveActiveCues(roleArchetype, snapshot, now);

    // PHASE-18 PEER READS: a PEER_STATE leaf reads ANOTHER lieutenant's snapshot. Pre-scan the compiled IR for the
    // distinct (role, zone) peer references, resolve each peer (role→archetype→role_id; SAME_ZONE = same district [derived
    // from this lieutenant's building], SAME_BUILDING = same building; self excluded; deterministic lowest-id), build its
    // snapshot via its own binding, and key it `${role}@${zone}`. A reference that resolves to no peer is simply absent →
    // the executor reads the leaf as false. The common case (no PEER_STATE) yields an empty map → byte-identical to before.
    const peerSnapshots = await this.buildPeerSnapshots(playerId, lt, bindingRow);

    // PHASE-25 L3 — STANDING-ORDER INJECTION: BEFORE the executor resolves, read the lieutenant's active-or-injecting
    // order rule (RAW, no lazy-seed; already re-stamped to the reserved STANDING_ORDER_PRIORITY + index=-1 by orderRule) and
    // PREPEND it to the compiled script. The order's rule then WINS the executor's resolution (priority desc, tie-break
    // lowest index) whenever its trigger matches — the override of the default script. When there is NO order, getActiveRule
    // returns null → `effectiveScript === lt.rules` (BYTE-IDENTICAL — the no-regression path). `behavior_script.rules` is
    // NEVER mutated (the override is a runtime injection, not a script edit — spec §5 Invariant). The L2b substitution +
    // observeOutcome downstream operate on `scriptAction`/`finalAction` (unchanged — they see the order-injected resolution).
    const orderRuleInj = await this.standingOrder.getActiveRule(lt.lieutenant_id);
    const effectiveScript = orderRuleInj ? { rules: [orderRuleInj, ...lt.rules.rules] } : lt.rules;

    // (A) THE SCRIPT TOKEN — the executor resolves the (order-injected) IR against the snapshot (highest-priority matched
    // rule wins, tie-break lowest IR index; total — never throws). Named `scriptAction` distinctly from the AUTONOMY
    // `verdict` below.
    const scriptAction = this.executor.resolve(effectiveScript, snapshot, peerSnapshots);

    // PHASE-24 L2b T3 — RUNTIME SUBSTITUTION: when this delegated lieutenant is INCIDENTAL_LOCKED and the dominant
    // incidental cue is PRESENT this tick but the script produced NO action (scriptAction = NONE), inject an
    // EXECUTE_DEFAULT impulse (the override fills the script's silence). The resolver is PURE (no DB/IO/RNG/Date) and reads
    // the SAME `activeCues` Set the measurement (observeOutcome) tallies — derived ONCE above (review-polish); it also reads
    // the `driftRuntime` already fetched ONCE above (T2). resolveSubstitution only READS `activeCues` (`.has`) — it runs
    // FIRST + never mutates it (observeOutcome later mutates a COPY). combineByPriority then merges: an explicit PAUSE_OPS /
    // a script-driven EXECUTE_DEFAULT WINS (the override never overrides a directive); the impulse applies ONLY when the
    // script was silent. `finalAction` (NOT the raw scriptAction) drives the PAUSE/EXECUTE_DEFAULT/NONE branch below, so a
    // substituted EXECUTE_DEFAULT reaches the autonomy gate + applyExecuteDefault exactly like a script-driven one.
    // `substituted` is parked in scope for Task 4 (the audit event).
    const subImpulse = resolveSubstitution({
      mode: 'delegated', // the only delegated-tick mode today (the tick already filtered to delegated executors).
      driftPhase: driftRuntime.drift_phase,
      dominantCue: driftRuntime.dominant_cue_kind,
      activeCues, // READ-ONLY here (`.has(dominantCue)`); the tick derived it ONCE above.
    });
    const { action: finalAction, substituted } = combineByPriority(scriptAction, subImpulse);

    const resolved = finalAction; // downstream branches (delegation_paused mirror + the EXECUTE_DEFAULT gate) read this.

    // PHASE-17 EXCEPTION PRODUCER (generalized): for each salient signal this archetype declares, if it is salient in the
    // snapshot AND the script has no rule covering it, emit the spec's card. The producer (decoupled) dedups + inserts.
    // (Phase-14's COOK heat is now the COOK binding's first spec — byte-identical.) The tick imports nothing from exceptions.
    for (const spec of binding.salientSignals?.() ?? []) {
      if (spec.isSalient(snapshot) && !scriptCoversSignal(lt.rules, spec.kind, spec.signal)) {
        this.bus.emitLieutenantSalientUncovered({
          type: 'lieutenant_salient_uncovered',
          playerId,
          lieutenantId: lt.lieutenant_id,
          signal: spec.signal,
          card: spec.card,
          gameMinute: now,
        });
      }
    }

    // (3) delegation_paused mirrors the resolved action; write ONLY on a transition (the steady state writes nothing).
    const newPaused = resolved.kind === 'PAUSE_OPS';
    if (newPaused !== lt.delegation_paused) {
      await this.repo.setDelegationPaused(lt.lieutenant_id, newPaused);
    }

    // D1 C7 — REQUEST_PLAYER_INPUT sink (TD-031, DD4-b=(b), DELIVERY-FORM=(i)): when the script resolved
    // REQUEST_PLAYER_INPUT, insert ONE generic `pending` exception_queue entry (the player must decide what to do).
    // Dedup: hasPendingForLieutenant prevents double-fire until the player resolves the existing card. The tick
    // neither touches delegation_paused (no pause) nor stops accrual — it only enqueues the notification.
    if (resolved.kind === 'REQUEST_PLAYER_INPUT') {
      const alreadyPending = await this.exceptionsRepo.hasPendingForLieutenant(playerId, lt.lieutenant_id);
      if (!alreadyPending) {
        await this.exceptionsRepo.insert({
          player_id: playerId,
          lieutenant_id: lt.lieutenant_id,
          event_descriptor: 'operator_input_requested',
          candidate_actions: [],
          suggested_action: {},
          confidence: 0,
          priority: 50,
          severity: 50,
          resolution_status: 'pending',
        });
      }
    }

    // (4) ACCRUAL (Phase-11 A2): a NON-settling (gated above), NON-paused delegated lieutenant accrues +1 streak THIS
    //     tick — the uninterrupted-occupancy counter (the bucket is DERIVED from it, never stored — canon Invariant 4).
    //     UNLIKE delegation_paused, this is NOT transition-gated — the active steady state writes the +1 EVERY tick (the
    //     streak is the count of active-delegation minutes). A PAUSE_OPS resolution this tick does NOT accrue.
    if (!newPaused) {
      await this.repo.incrementTenureScore(lt.lieutenant_id);
    }

    // EXECUTE_DEFAULT → GATE through the autonomy ceiling, then run the archetype's default action. NONE = no rule matched
    // → nothing to do. PAUSE_OPS = pause → no op action. Neither takes an op action (so neither consumes the budget).
    //
    // PHASE-19 L1a AUTONOMY GATE: checkAndConsume optimistically consumes one budget unit BEFORE the action (the gate is
    // pre-action). When the primary category is depleted it REFUSES (no decrement) — the action does NOT run; instead the
    // tick emits an AutonomyCeilingRefusalEvent (the decoupled report producer subscribes + appends an issue). When
    // ALLOWED, the binding runs; a benign no-op (the binding returns 'NOOP') is REFUNDED so only net-*taken* actions
    // consume the budget (the decrement-on-TAKEN nuance: consume optimistically, refund the no-op).
    if (resolved.kind === 'EXECUTE_DEFAULT') {
      const consumeResult = await this.autonomy.checkAndConsume(lt.lieutenant_id, roleArchetype, now);
      if (consumeResult.verdict === 'REFUSED') {
        // REFUSAL: the budget is depleted — the action does not run. The decoupled AutonomyReportProducer (subscriber)
        // opens/appends a report issue (per-archetype A/B pair, deduplicated per cycle/category). The backlog-cap
        // auto-default (default_on_timeout — §3.6) runs BEFORE the gate (see `applyDefaultOnTimeout` above): if a stale
        // open report has aged beyond `backlogCapCycles`, it is auto-closed THIS tick; a new refusal (this line) then
        // opens a fresh report for the new cycle. Both are correct: auto-default closes the old, refusal opens the next.
        this.bus.emitAutonomyCeilingRefusal({
          type: 'autonomy_ceiling_refusal',
          playerId,
          lieutenantId: lt.lieutenant_id,
          archetype: roleArchetype,
          category: projectCategory(roleArchetype),
          gameMinute: now,
        });
      } else {
        // ALLOWED: the budget was consumed — emit AutonomyCeilingStateUpdatedEvent (design §3.9) so any BO/projection
        // consumer can react to the new qualitative bucket without reading the raw counter (P5/R2.2). No subscriber in L1a
        // (the seam a consumer plugs into later — same loosely-coupled pattern as DriftSubstitutionEvent / StandingOrderLapsedEvent).
        this.bus.emitAutonomyCeilingStateUpdated({
          type: 'autonomy_ceiling_state_updated',
          playerId,
          lieutenantId: lt.lieutenant_id,
          archetype: roleArchetype,
          category: projectCategory(roleArchetype),
          bucket: consumeResult.newBucket,
          gameMinute: now,
        });

        let outcome: 'TAKEN' | 'NOOP';
        try {
          outcome = await binding.applyExecuteDefault(playerId, bindingRow, now);
        } catch (e) {
          // refund-on-throw: a faulting binding took no action, so net-consume stays = TAKEN actions only
          await this.autonomy.refund(lt.lieutenant_id, roleArchetype, now);
          throw e;
        }
        if (outcome === 'NOOP') await this.autonomy.refund(lt.lieutenant_id, roleArchetype, now);

        // PHASE-19 L1a §3.9 — DECISION EMITTED: a net-TAKEN action (the action ran and the binding returned TAKEN, not a
        // benign no-op) emits AutonomyDecisionEmittedEvent — the BO decision-audit / timeline trace of "the lieutenant
        // acted autonomously on the player's behalf". No subscriber in L1a (same loosely-coupled seam). NOOP refunded
        // above: no event for a NOOP (it consumed then was refunded — net-zero, not a real decision taken).
        if (outcome === 'TAKEN') {
          this.bus.emitAutonomyDecisionEmitted({
            type: 'autonomy_decision_emitted',
            playerId,
            lieutenantId: lt.lieutenant_id,
            archetype: roleArchetype,
            category: projectCategory(roleArchetype),
            gameMinute: now,
          });
        }

        // PHASE-22 L2a SIGNAL DRIFT — observe the cue reliability outcome of this ACTING tick. Hooked ONLY in the
        // non-refused (ALLOWED) branch, AFTER the action ran and its outcome (TAKEN | NOOP) is known — NEVER on a REFUSED
        // (autonomy ceiling) tick and NEVER for a settling/non-acting lieutenant (those returned earlier). The service
        // tallies the active cues (hit on TAKEN, miss on NOOP), re-buckets, and updates the drift phase. Deterministic
        // (the `now` tick + the active-cue set). A faulting binding re-threw above → no observation for a fault.
        //
        // PHASE-24 L2b (review-polish) — observeOutcome takes the SAME `activeCues` the tick derived ONCE (threaded into
        // resolveSubstitution too — the "same cue set" contract is now STRUCTURAL). observeOutcome MUTATES the Set (it
        // `.delete('DIRECT_ORDER')` on a substituted tick), so we hand it a PRIVATE COPY (`new Set(activeCues)`): the
        // copy's mutation can NEVER corrupt the Set resolveSubstitution already read above (it ran FIRST, read-only). The
        // canonical `activeCues` stays pristine for the rest of the tick. (resolveSubstitution runs strictly before this,
        // so even sharing would be safe — but the copy makes the no-aliasing guarantee structural, not order-dependent.)
        //
        // PHASE-24 L2b — directOrderFired = (the SCRIPT's OWN EXECUTE_DEFAULT). TRUE on a normal acting tick (the script
        // fired EXECUTE_DEFAULT → a real direct order); FALSE on a SUBSTITUTED tick (scriptAction was NONE — the drift
        // override filled the silence) so observeOutcome must NOT credit DIRECT_ORDER a hit (the lock hardens, spec §3.2).
        const directOrderFired = scriptAction.kind === 'EXECUTE_DEFAULT';
        const driftResult = await this.signalDrift.observeOutcome(lt.lieutenant_id, roleArchetype, new Set(activeCues), outcome, now, directOrderFired);

        // PHASE-24 L2b T4 — DRIFT SUBSTITUTION AUDIT: if THIS acting tick was driven by the override (combineByPriority
        // filled the script's NONE silence with the cue-driven EXECUTE_DEFAULT), emit the decoupled audit trace (no L2b
        // subscriber — the BO seam a consumer plugs into later). The interlock is FREE: a substituted EXECUTE_DEFAULT
        // already flowed through checkAndConsume above, so a budget-REFUSED substitution never reached here (no action,
        // no event — the AutonomyCeilingRefusalEvent already covers that case).
        if (substituted) {
          this.bus.emitDriftSubstitution({
            type: 'drift_substitution',
            playerId,
            lieutenantId: lt.lieutenant_id,
            dominantCueKind: driftRuntime.dominant_cue_kind,
            substitutedAction: 'EXECUTE_DEFAULT',
            outcome,
            gameMinute: now,
          });
        }

        // LOT-5 TD-051 / F-13.A — SIGNAL DRIFT BUS EVENTS: emit after every observeOutcome (state updated) and on
        // phase transitions. No subscriber at this slice (the BO timeline / Unity refresh consumer plugs in later —
        // the same loosely-coupled seam every CityEvent uses; one-way coupling: the tick imports the BUS, never a consumer).
        this.bus.emitSignalDriftStateUpdated({
          type: 'signal_drift_state_updated',
          playerId,
          lieutenantId: lt.lieutenant_id,
          driftPhase: driftResult.newPhase,
          dominantCueKind: driftResult.dominantCue,
          gameMinute: now,
        });
        if (driftResult.phaseTransitioned) {
          this.bus.emitSignalDriftPhaseTransitioned({
            type: 'signal_drift_phase_transitioned',
            playerId,
            lieutenantId: lt.lieutenant_id,
            previousPhase: driftRuntime.drift_phase, // the phase BEFORE observeOutcome (read before the tick ran the observation).
            newPhase: driftResult.newPhase,
            dominantCueKind: driftResult.dominantCue,
            gameMinute: now,
          });
        }
      }
    } else if (resolved.kind === 'SCHEDULE_MAINTENANCE') {
      // 04f-A C7 (D9) — NARROW, ADDITIVE dispatch: `SCHEDULE_MAINTENANCE` is a BRAND-NEW resolved-action kind
      // (this chunk), so this branch NEVER fires for any pre-existing archetype/script — 100% byte-identical
      // for every archetype that shipped before C7 (the 9c additive invariant). Only
      // `FacilityManagerBindingService` implements the extra `applyResolvedAction` method (the
      // LogisticsBindingService/CoordinatorExecutionService precedent, `logistics-binding.ts:319` — NOT part
      // of the generic `ArchetypeBinding` interface, since `schedule_maintenance` is meaningless for every
      // other archetype); resolved duck-typed here rather than importing the concrete binding class (keeps
      // this tick archetype-agnostic, the SAME boundary the rest of this file maintains). No autonomy-ceiling
      // gate (out of scope for this action; D9 names no budget), no delegation_paused interaction beyond the
      // mirror already applied above.
      const applyResolvedAction = (
        binding as Partial<{
          applyResolvedAction(
            playerId: string,
            lt: DelegationLieutenant,
            action: ResolvedAction,
          ): Promise<'TAKEN' | 'NOOP'>;
        }>
      ).applyResolvedAction;
      if (typeof applyResolvedAction === 'function') {
        await applyResolvedAction.call(binding, playerId, bindingRow, resolved);
      }
    }

    // PHASE-25 L3 — STANDING-ORDER EXPIRY EVALUATION. The order's TTL is a property of the order + the clock, INDEPENDENT of
    // whether this tick produced (or was allowed) an EXECUTE_DEFAULT. So it runs here, on the per-lieutenant ACTING body
    // (past the settling gate, AFTER observeOutcome ran in execution order), NOT inside the EXECUTE_DEFAULT/ALLOWED branch:
    // gating it on EXECUTE_DEFAULT would mean an order whose rule does not match this tick — or whose action was autonomy-
    // REFUSED — never expires (the order would outlive its TTL until the lieutenant next acted-and-was-allowed). evaluate is
    // a single cheap read when there is no active order (the common case → no-op). When the order's TTL has elapsed (now >=
    // expires_at_tick) the lifecycle lapses it (active→lapsed), increments the per-signature consecutive_lapse_count (the
    // lapse-pattern ledger), and — for an ESCALATE_TO_PLAYER order — emits a StandingOrderLapsedEvent on the bus. A
    // REVERT_DEFAULT / ESCALATE lapsed order then STOPS injecting (getActiveOrInjecting excludes it) → the lieutenant reverts
    // to the default script; a HOLD_LAST order keeps injecting. IDEMPOTENT — getActiveForExpiry returns only the 'active'
    // row, so the active→lapsed transition is counted EXACTLY ONCE (a lapsed row is never re-processed). Deterministic (only
    // `now` + the persisted state). A settling/early-returned lieutenant returned above → its suspended order does not tick.
    await this.standingOrder.evaluate(lt.lieutenant_id, playerId, now);
  }

  /**
   * TD-049 default_on_timeout (§3.6): check if the lieutenant's OPEN report has aged beyond the backlogCapCycles cap.
   * Reads the current cycle_id from the autonomy state (post-refresh, so a just-refreshed cycle is already accounted for),
   * then queries for an OPEN report with cycle_id <= (currentCycle - backlogCapCycles). If found, calls autoDefault on it
   * (auto-applies option A on all undecided issues, closes the report, audit-logs). A no-op when no state row exists yet
   * (never gated), or when no stale open report exists (the common case — the player resolved it in time). CONTAINED: a
   * fault in autoDefault is caught and logged so it never breaks the tick or another lieutenant. DETERMINISTIC (the
   * comparison is a pure function of the persisted state + the fixed tunable).
   */
  private async applyDefaultOnTimeout(
    _playerId: string,
    lieutenantId: string,
    _roleArchetype: string,
    assignedBuildingId: string | null,
    targetBuildingId: string | null,
  ): Promise<void> {
    const state = await this.autonomy.getStateReadOnly(lieutenantId);
    if (!state) return; // no ceiling state row (never gated) → no open report to age-check.
    const currentCycle = state.cycle_id;
    const cap = lieutenantTunables.autonomyCeiling.backlogCapCycles;
    const maxStaleCycleId = currentCycle - cap;
    if (maxStaleCycleId < 0) return; // not enough cycles have elapsed yet (currentCycle < cap → no report can be stale).
    const report = await this.autonomyReportRepo.findStaleOpenReport(lieutenantId, maxStaleCycleId);
    if (!report) return; // no stale open report — the player resolved it in time (the common case).
    try {
      await this.autonomyReports.autoDefault(report, assignedBuildingId, targetBuildingId);
    } catch (err) {
      this.logger.error(
        `LIEUTENANT_TICK: auto-default (§3.6) for lieutenant=${lieutenantId} report=${report.report_id} faulted — ` +
          `contained: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Collect the distinct (role, zone) PEER_STATE references in a compiled script (walks every rule's condition tree). */
  private collectPeerRefs(rules: CompiledScript): Array<{ role: string; zone: 'SAME_ZONE' | 'SAME_BUILDING' }> {
    const seen = new Set<string>();
    const out: Array<{ role: string; zone: 'SAME_ZONE' | 'SAME_BUILDING' }> = [];
    const walk = (c: IrCondition | undefined): void => {
      if (!c) return;
      switch (c.kind) {
        case 'PEER_STATE': {
          const key = `${c.role}@${c.zone}`;
          if (!seen.has(key)) { seen.add(key); out.push({ role: c.role, zone: c.zone }); }
          return;
        }
        case 'AND':
        case 'OR': walk(c.left); walk(c.right); return;
        case 'NOT': walk(c.operand); return;
        default: return; // MY_STATE — no peer ref.
      }
    };
    for (const rule of rules.rules) walk(rule.condition);
    return out;
  }

  /** Resolve each (role, zone) peer reference to a snapshot, keyed `${role}@${zone}`. Empty when the script has no peer
   *  refs. A reference resolving to no peer is omitted (→ false at eval). Reuses the peer's own binding for its snapshot. */
  private async buildPeerSnapshots(
    playerId: string,
    lt: DelegatedLieutenant,
    selfBindingRow: DelegationLieutenant,
  ): Promise<ReadonlyMap<string, SignalSnapshot>> {
    const refs = this.collectPeerRefs(lt.rules);
    const map = new Map<string, SignalSnapshot>();
    if (refs.length === 0) return map;

    // Derive the self lieutenant's district ONCE (only if a SAME_ZONE ref exists + the self has a building).
    let selfDistrict: number | null = null;
    if (refs.some((r) => r.zone === 'SAME_ZONE') && selfBindingRow.assigned_building_id !== null) {
      selfDistrict = await this.repo.getBuildingDistrict(playerId, selfBindingRow.assigned_building_id);
    }

    for (const ref of refs) {
      const archetype = archetypeForDslRole(ref.role);
      if (archetype === null) continue; // unknown role (the compiler also diagnoses it) → no peer.
      const roleId = roleIdForArchetype(archetype);

      let peer: DelegatedLieutenant | null = null;
      if (ref.zone === 'SAME_BUILDING') {
        if (selfBindingRow.assigned_building_id !== null) {
          peer = await this.repo.findPeerByRoleInBuilding(playerId, roleId, selfBindingRow.assigned_building_id, lt.lieutenant_id);
        }
      } else {
        if (selfDistrict !== null) {
          peer = await this.repo.findPeerByRoleInDistrict(playerId, roleId, selfDistrict, lt.lieutenant_id);
        }
      }
      if (peer === null) continue; // no such peer → omit (→ false at eval).

      const peerArchetype = archetypeForRoleId(peer.role_id);
      if (peerArchetype === null) continue; // defensive.
      const peerBinding = this.registry.get(peerArchetype);
      if (peerBinding === undefined) continue; // defensive.
      const peerRow: DelegationLieutenant = {
        lieutenant_id: peer.lieutenant_id,
        assigned_building_id: peer.assigned_building_id,
        target_building_id: peer.target_building_id,
        role_archetype: peerArchetype,
        delegation_paused: peer.delegation_paused,
        tenure_score: peer.tenure_score,
        rules: peer.rules,
      };
      map.set(`${ref.role}@${ref.zone}`, await peerBinding.buildSnapshot(playerId, peerRow));
    }
    return map;
  }
}

/** True iff the compiled script has a rule whose trigger reads (kind, field) — so that signal is already covered. */
function scriptCoversSignal(ir: CompiledScript, kind: 'STATE' | 'EVENT', field: string): boolean {
  return ir.rules.some((r) => r.trigger.kind === kind && r.trigger.field === field);
}
