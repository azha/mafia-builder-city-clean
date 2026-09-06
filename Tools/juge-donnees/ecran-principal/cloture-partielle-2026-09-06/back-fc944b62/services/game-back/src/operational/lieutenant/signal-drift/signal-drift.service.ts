// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-22-signal-drift-backend-design.md §3.2 (observeOutcome — the
//             per-tick measurement: derive the active cues → tally hits/misses → re-bucket → rank → the primacy
//             transitions DIRECT_ALIGNED / DRIFTING / INCIDENTAL_LOCKED) + §CueReliabilityRegistry / §DriftPhase
//             -- Phase-22 L2a Task 3 (SignalDriftService) --
//
// `SignalDriftService` — the cue-reliability MEASUREMENT service the LIEUTENANT_TICK consults after each delegated
// EXECUTE_DEFAULT runs. It owns the lazy-seed (getState), and the per-observation update (observeOutcome): a sliding-window
// reset, the active-cue tally (hit on TAKEN, miss on NOOP), the per-cue re-bucketing, the primacy ranking, and the drift
// phase transition. It reuses the T2 pure helpers (seedRegistry / deriveActiveCues / bucketForRatio + the CueKind/Bucket
// types) for ALL cue math — no inline thresholds/cuts (R2.3 — the cuts/window/margin/grace come from
// lieutenantTunables.signalDrift). DETERMINISTIC: no Date.now / no Math.random — every tick value is the `tick` argument the
// caller passes (ctx.gameMinute), the snapshot is the per-tick snapshot the binding already built.
//
// THE READ-MODIFY-WRITE NUANCE (mirrors AutonomyCeilingService): observeOutcome mutates the jsonb `registry` object IN
// PLACE then writes the whole object back (writeState). This is safe because it is a per-lieutenant, per-tick,
// single-threaded read-modify-write (the tick drives a player's lieutenants serially) — there is no concurrent writer.
//
// SCOPE: T3 owns the measurement + the phase transitions (observeOutcome); T4 the R2.2 cue-band projection (getCueBands);
// T5 the player decisions (applyDecision — disrupt_cue / reinforce_direct_order / reset_observation_window — with a
// per-(kind,target_cue) cooldown). The RESETTING phase is set by applyDecision (disrupt_cue / reset_observation_window);
// observeOutcome NEVER transitions OUT of a player-set RESETTING until the next window slide (see the holdResetting guard).

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../../protocol/api-error';
import type { LieutenantArchetype } from '../lieutenant-archetype';
import { lieutenantTunables } from '../lieutenant-tunables';
import type { SignalDriftStateRow } from '../../../db/schema/signal_drift';
import { SignalDriftRepository } from './signal-drift.repository';
import {
  bucketForRatio,
  seedRegistry,
  type CueKind,
  type CueRegistry,
  type DriftPhase,
  type ReliabilityBucket,
} from './signal-drift-cues';

/** The drift OUTCOME of a single observation — the binding's applyExecuteDefault verdict (a net-taken action vs a benign no-op). */
export type DriftOutcome = 'TAKEN' | 'NOOP';

/** The 3 player SignalDriftDecision kinds applied by applyDecision (Phase-22 L2a T5 — the supported decision verbs):
 *  disrupt_cue (contaminate an over-relied incidental cue + RESETTING), reinforce_direct_order (re-assert the explicit-order
 *  primacy), reset_observation_window (zero the counters + re-anchor the window + RESETTING). */
export type SignalDriftDecisionKind = 'disrupt_cue' | 'reinforce_direct_order' | 'reset_observation_window';

/**
 * The HITS value `reinforce_direct_order` re-seeds the DIRECT_ORDER entry to (misses:0). `[PROV-Y26Q2]`.
 *
 * RATIONALE: a player reinforcement RE-ASSERTS the explicit-order primacy — the entry must read as a freshly-trusted,
 * unambiguously DIRECT_ALIGNED baseline. We set `hits` to the seedRegistry DIRECT_ORDER baseline strength (its seed is
 * the qualitative `reliable` bucket; the numeric counter the seed carries is 0/0, so we pick a small positive hits so the
 * entry has a live, positive hit-history rather than the 0/0 dormant-equivalent). 3 = a clean, small re-assertion count
 * (≥ 1 so the counter is live; small so it does not over-inflate the window math). CRITICALLY the reliability_bucket is set
 * EXPLICITLY to 'reliable' (NOT via bucketForRatio, which on hits:3/misses:0 = 100% would compute `dominant` and mis-read
 * the reinforced order as a DRIFTED incidental-style lock) — the player reinforcement restores the baseline `reliable`
 * trust, matching the seedRegistry DIRECT_ORDER seed, never an over-stated `dominant`.
 *
 * R2.3 EXEMPTION (lot-5 TD-054): this constant is NOT a gdd/14 balance tunable. The value is structurally entangled with
 * the explicit `reliability_bucket = 'reliable'` override on the same line (see `applyDecision`): `bucketForRatio` is
 * NOT consulted at all for the reinforced entry — the bucket is force-set to `'reliable'` regardless of the hits/misses
 * ratio. The hits value is therefore a fixed load-bearing structural re-assertion constant (like a seed count), not a
 * live-ops balance knob whose tuning semantics can be reasoned about independently. Changing it does not "cross a
 * cut-point" (the cut-point path is bypassed entirely); it changes the magnitude of the re-assertion history, which must
 * remain small and positive (≥ 1 live, ≤ seed-level). No gdd/14 tunable entry is added (R2.3 does not require tunables
 * for structural constants that cannot be changed independently of the force-set bucket override).
 */
const REINFORCE_DIRECT_ORDER_HITS = 3;

/** Reliability-bucket → numeric rank (dormant < partial < reliable < dominant). The primacy comparison is a rank compare. */
const BUCKET_RANK: Record<ReliabilityBucket, number> = {
  dormant: 0,
  partial: 1,
  reliable: 2,
  dominant: 3,
};

@Injectable()
export class SignalDriftService {
  constructor(private readonly repo: SignalDriftRepository) {}

  /**
   * Read the lieutenant's signal_drift_state, lazy-seeding a fresh CueReliabilityRegistry (seedRegistry) on first access.
   * The seed anchors window_start_tick at `tick` so the first observation window is measured from now (not from 0). On a
   * seed the insert RETURNS the canonical persisted row directly (no re-read). Mirrors AutonomyCeilingService.getState.
   */
  async getState(
    lieutenantId: string,
    archetype: LieutenantArchetype,
    tick: number,
  ): Promise<SignalDriftStateRow> {
    const existing = await this.repo.getState(lieutenantId);
    if (existing) return existing;
    const registry = seedRegistry();
    return this.repo.insertState(lieutenantId, archetype, registry, tick);
  }

  /**
   * READ-ONLY cue-band projection (Phase-22 L2a T4; R2.2): the per-cue QUALITATIVE reliability-bucket map + the drift_phase
   * for a lieutenant — `{ cue_bands: { DIRECT_ORDER: 'reliable', RESOURCE_AVAILABILITY: 'dominant', … }, drift_phase:
   * 'INCIDENTAL_LOCKED' }` — derived from the persisted registry jsonb. NEVER the raw per-cue `hits` / `misses` / the
   * `contaminated` flag (P5/R2.2 — only the bucket + the phase escape). When NO signal_drift_state row exists yet (a
   * never-observed lieutenant) → the NEUTRAL defaults: an EMPTY cue map (`{}`) + drift_phase 'DIRECT_ALIGNED'. CRITICAL: a
   * pure READ — it does NOT lazy-seed a row (it reads repo.getState directly, NOT this.getState which seeds), so a GET /
   * projection NEVER creates a drift-state row. Used by the LieutenantProjectionService for the `cue_bands` + `drift_phase`
   * fields. DETERMINISTIC (no tick argument — the bucket/phase are the persisted derived values).
   */
  async getCueBands(lieutenantId: string): Promise<{ cue_bands: Record<string, ReliabilityBucket>; drift_phase: DriftPhase }> {
    const existing = await this.repo.getState(lieutenantId); // RAW read — NO lazy-seed (the projection must not create a row).
    if (!existing) return { cue_bands: {}, drift_phase: 'DIRECT_ALIGNED' }; // no drift row yet → neutral defaults.
    const registry = existing.registry as CueRegistry;
    const cue_bands = {} as Record<string, ReliabilityBucket>;
    for (const kind of Object.keys(registry.entries) as CueKind[]) {
      const entry = registry.entries[kind];
      // R2.2: map cue → its reliability_bucket ONLY. NEVER spread the whole CueEntry (no hits/misses/contaminated leak).
      if (entry) cue_bands[kind] = entry.reliability_bucket;
    }
    return { cue_bands, drift_phase: existing.drift_phase as DriftPhase };
  }

  /**
   * READ-ONLY drift-runtime accessor (Phase-24 L2b T2): the lieutenant's current `drift_phase` + `dominant_cue_kind`,
   * surfaced to the LIEUTENANT_TICK so it can expose `interpretation_drift` (the drift_phase) onto the per-tick snapshot
   * BEFORE the executor resolves — letting a drift-aware DSL rule (`STATE(interpretation_drift, =, …)`) finally match.
   * Mirrors getCueBands EXACTLY: a PURE READ via repo.getState (the RAW, no-lazy-seed path — NOT this.getState which
   * seeds), so reading the runtime on a never-drifted lieutenant NEVER creates a signal_drift_state row. When NO row
   * exists yet (a never-observed lieutenant) → the NEUTRAL defaults (drift_phase 'DIRECT_ALIGNED' / dominant_cue_kind
   * 'DIRECT_ORDER' — the seedRegistry baseline) so an absent drift state reads as the aligned baseline, never undefined.
   * DETERMINISTIC (no tick argument — the phase/dominant are the persisted derived values).
   */
  async getDriftRuntime(lieutenantId: string): Promise<{ drift_phase: DriftPhase; dominant_cue_kind: CueKind }> {
    const state = await this.repo.getState(lieutenantId); // RAW read — NO lazy-seed (a tick read must not create a row).
    if (state === null) return { drift_phase: 'DIRECT_ALIGNED', dominant_cue_kind: 'DIRECT_ORDER' }; // no row → aligned baseline.
    return { drift_phase: state.drift_phase as DriftPhase, dominant_cue_kind: state.dominant_cue_kind as CueKind };
  }

  /**
   * Apply a player SignalDriftDecision (Phase-22 L2a T5) to a lieutenant's cue-reliability registry, with a per-(lieutenant,
   * kind, target_cue) cooldown:
   *   - disrupt_cue              — CONTAMINATE the targeted incidental cue (registry.entries[targetCue].contaminated = true)
   *                                and force the phase to RESETTING. The player flags an over-relied cue as no-longer-trusted;
   *                                observeOutcome HOLDS the RESETTING until the next window slide (the hold guard).
   *   - reinforce_direct_order   — RE-SEED the DIRECT_ORDER entry as a freshly-reasserted baseline ({hits: REINFORCE_DIRECT_
   *                                ORDER_HITS, misses:0, reliability_bucket:'reliable'} — the bucket is set EXPLICITLY, NOT via
   *                                bucketForRatio, see REINFORCE_DIRECT_ORDER_HITS) and pin the phase to DIRECT_ALIGNED with
   *                                dominant_cue_kind = DIRECT_ORDER. The player re-asserts the explicit-order primacy.
   *   - reset_observation_window — ZERO every cue's hits/misses, re-anchor window_start_tick = tick, and force the phase to
   *                                RESETTING. The player wipes the accumulated observation window (not cue-specific).
   * COOLDOWN: a same-(kind,target_cue) decision is refused (409 RESOURCE_STATE_CONFLICT) while `tick - last <
   * decisionCooldownTicks` (the per-key stamp lives in last_decision_ticks). The cooldown key is `${kind}:${targetCue}` for
   * the cue-specific disrupt_cue; the non-cue-specific kinds (reinforce_direct_order / reset_observation_window) key on
   * `${kind}:` (the target is ignored — the cooldown is per-kind for them). On success the stamp is updated + the whole
   * registry/phase written. Uses this.getState (the lazy-seed) so a decision on a never-observed lieutenant seeds the
   * registry first (the player can pre-emptively reinforce/reset). DETERMINISTIC (the cooldown is a pure function of the
   * persisted stamp + the `tick`; no Date.now / Math.random). The endpoint (lieutenant.controller.ts) validates the kind +
   * the target_cue BEFORE calling this.
   */
  async applyDecision(
    lieutenantId: string,
    archetype: LieutenantArchetype,
    kind: SignalDriftDecisionKind,
    targetCue: CueKind,
    tick: number,
  ): Promise<void> {
    const state = await this.getState(lieutenantId, archetype, tick);
    const registry = state.registry as CueRegistry;
    const decisionTicks = (state.last_decision_ticks as Record<string, number> | null) ?? null;

    // The cooldown key: cue-specific for disrupt_cue (`disrupt_cue:RESOURCE_AVAILABILITY`), per-kind for the non-cue kinds
    // (`reinforce_direct_order:` / `reset_observation_window:` — the target is ignored, so they share one stamp per kind).
    const cooldownKey = `${kind}:${kind === 'disrupt_cue' ? targetCue : ''}`;
    const last = decisionTicks?.[cooldownKey];
    if (last !== undefined && tick - last < lieutenantTunables.signalDrift.decisionCooldownTicks) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `signal-drift decision '${kind}' is on cooldown for lieutenant ${lieutenantId}.`,
      });
    }

    // The state to persist — defaults are the current phase/dominant/window; each kind overrides what it changes.
    let driftPhase: DriftPhase = state.drift_phase as DriftPhase;
    let dominantCue: CueKind = state.dominant_cue_kind as CueKind;
    let windowStartTick = state.window_start_tick;

    if (kind === 'disrupt_cue') {
      // CONTAMINATE the over-relied incidental cue + force RESETTING (observeOutcome holds it until the next window slide).
      registry.entries[targetCue].contaminated = true;
      driftPhase = 'RESETTING';
    } else if (kind === 'reinforce_direct_order') {
      // RE-SEED DIRECT_ORDER as a freshly-reasserted baseline. The reliability_bucket is set EXPLICITLY to 'reliable' (NOT
      // via bucketForRatio — on hits/0 = 100% it would compute 'dominant' and mis-read the reinforced order as a drift).
      registry.entries.DIRECT_ORDER.hits = REINFORCE_DIRECT_ORDER_HITS;
      registry.entries.DIRECT_ORDER.misses = 0;
      registry.entries.DIRECT_ORDER.reliability_bucket = 'reliable';
      registry.entries.DIRECT_ORDER.contaminated = false;
      driftPhase = 'DIRECT_ALIGNED';
      dominantCue = 'DIRECT_ORDER';
    } else {
      // reset_observation_window — ZERO every cue counter + re-anchor the window to `tick` + force RESETTING (not cue-specific).
      for (const cueKind of Object.keys(registry.entries) as CueKind[]) {
        registry.entries[cueKind].hits = 0;
        registry.entries[cueKind].misses = 0;
      }
      windowStartTick = tick;
      driftPhase = 'RESETTING';
    }

    // Stamp the per-key cooldown + persist the whole registry/phase/dominant/window (mirror writeState's round-trip).
    const nextDecisionTicks = { ...(decisionTicks ?? {}), [cooldownKey]: tick };
    await this.repo.writeState(
      lieutenantId,
      registry,
      driftPhase,
      dominantCue,
      windowStartTick,
      tick,
      nextDecisionTicks,
    );
  }

  /**
   * The per-observation MEASUREMENT (design §3.2). Called by the LIEUTENANT_TICK after a delegated EXECUTE_DEFAULT runs and
   * its `outcome` (TAKEN | NOOP) is known — ONLY on an acting (non-refused) tick. Steps:
   *   1. Read/seed the state; take the persisted registry.
   *   2. WINDOW SLIDE: if `tick - window_start_tick >= observationWindowTicks`, zero every cue's hits/misses and re-anchor
   *      the window to `tick` (Invariant 3 — the counter bounds the accumulation; the window slides forward).
   *   3. TALLY: the INJECTED `activeCues` Set → the cues ACTIVE this observation; for each active cue,
   *      `outcome === 'TAKEN' ? hits++ : misses++`.
   *   4. RE-BUCKET: recompute every cue's reliability_bucket from its (possibly updated) hits/misses (bucketForRatio).
   *   5. PRIMACY + TRANSITION: rank the best INCIDENTAL cue (rank desc, then hits desc) against DIRECT_ORDER, and pick the
   *      drift phase (respecting driftGraceTicks since the window anchor). RESETTING (a player-set phase, T5) is NOT
   *      transitioned out of by a measurement — only the next window slide clears it.
   *   6. Persist the whole registry + the derived phase/dominant via writeState.
   * DETERMINISTIC (only `tick` + the injected `activeCues`; no Date.now/Math.random). No event emission required for L2a.
   *
   * `activeCues` (P24/L2b review-polish) — the active-cue Set the LIEUTENANT_TICK derived ONCE this tick (deriveActiveCues)
   * and threaded into BOTH resolveSubstitution and here, so the substitution decision and the measurement see EXACTLY the
   * SAME cue set STRUCTURALLY (one derivation), not two coincidentally-identical ones. observeOutcome MUTATES this Set
   * (the `.delete('DIRECT_ORDER')` below), so the tick passes a private COPY (`new Set(activeCues)`) — the mutation here
   * never corrupts the Set resolveSubstitution already read (which ran FIRST, read-only). Behavior is byte-identical to the
   * old internal `deriveActiveCues(archetype, snapshot, tick)` (the tick derives it from the SAME archetype/snapshot/tick).
   *
   * `directOrderFired` (Phase-24 L2b) — TRUE iff the SCRIPT itself produced an EXECUTE_DEFAULT this tick (a real
   * direct-order action). FALSE when the acting EXECUTE_DEFAULT was a drift SUBSTITUTION filling a SILENT script
   * (scriptAction.kind === 'NONE'). On a substituted tick the player gave NO order, so DIRECT_ORDER is dropped from the
   * tally (step 3) — only the incidental cue(s) that drove the reflex are measured. On a normal acting tick this is true →
   * DIRECT_ORDER is tallied exactly as before (zero L2a regression).
   */
  async observeOutcome(
    lieutenantId: string,
    archetype: LieutenantArchetype,
    activeCues: Set<CueKind>,
    outcome: DriftOutcome,
    tick: number,
    directOrderFired: boolean,
  ): Promise<{ newPhase: DriftPhase; dominantCue: CueKind; phaseTransitioned: boolean }> {
    const { observationWindowTicks, primacyMarginMin, driftGraceTicks } = lieutenantTunables.signalDrift;

    const state = await this.getState(lieutenantId, archetype, tick);
    const previousPhase = state.drift_phase as DriftPhase;
    const registry = state.registry as CueRegistry;
    let windowStartTick = state.window_start_tick;
    const decisionTicks = (state.last_decision_ticks as Record<string, number> | null) ?? null;

    // (2) WINDOW SLIDE — the sliding observation window elapsed → zero every cue counter + re-anchor the window to `tick`.
    let windowSlid = false;
    if (tick - windowStartTick >= observationWindowTicks) {
      for (const kind of Object.keys(registry.entries) as CueKind[]) {
        registry.entries[kind].hits = 0;
        registry.entries[kind].misses = 0;
      }
      windowStartTick = tick;
      windowSlid = true;
    }

    // RESETTING is a player-set phase (T5 applyDecision). A measurement does NOT transition out of it — only a window slide
    // clears it. So while in RESETTING and the window did NOT slide this tick, HOLD the phase (still tally + re-bucket the
    // registry below so the counters stay live, but keep the phase/dominant pinned). A window slide falls through to the
    // normal re-derivation (the zeroed counters naturally re-align the phase to DIRECT_ALIGNED).
    const holdResetting = state.drift_phase === 'RESETTING' && !windowSlid;

    // (3) TALLY — the cues ACTIVE this observation get a hit (TAKEN) or a miss (NOOP). A cue not active this tick is untouched.
    // `active` is the injected `activeCues` Set (the tick's ONE deriveActiveCues — P24/L2b review-polish). The tick already
    // handed us a private COPY (`new Set(...)`), so the `.delete('DIRECT_ORDER')` below mutates OUR copy only — it never
    // corrupts the Set resolveSubstitution read earlier this tick (it ran FIRST, read-only). Behavior is byte-identical to
    // the old internal `deriveActiveCues(archetype, snapshot, tick)`.
    const active = activeCues;
    // PHASE-24 L2b FIX: a SUBSTITUTED tick — the script was SILENT (scriptAction.kind === 'NONE') and the drift override
    // injected the EXECUTE_DEFAULT — is NOT a direct-order action. deriveActiveCues ALWAYS adds DIRECT_ORDER (the explicit
    // order is "present" whenever the lieutenant acts), but on a substituted tick the player gave NO order this tick, so
    // crediting DIRECT_ORDER a hit would inflate its reliability and (over sustained substitution) downgrade the lock
    // (INCIDENTAL_LOCKED → DRIFTING), self-terminating the substitution — the opposite of the design intent (the lock
    // HARDENS, spec §3.2). When the script did NOT fire its own EXECUTE_DEFAULT, drop DIRECT_ORDER from the tally so only
    // the incidental cue(s) that actually drove the reflex are measured.
    if (!directOrderFired) active.delete('DIRECT_ORDER');
    for (const kind of active) {
      const entry = registry.entries[kind];
      if (entry === undefined) continue; // defensive — the registry holds every CueKind, but never crash on an unexpected one.
      if (outcome === 'TAKEN') entry.hits += 1;
      else entry.misses += 1;
    }

    // (4) RE-BUCKET — recompute the qualitative reliability bucket for EVERY cue from its current hits/misses (T2 helper).
    for (const kind of Object.keys(registry.entries) as CueKind[]) {
      const entry = registry.entries[kind];
      entry.reliability_bucket = bucketForRatio(entry.hits, entry.misses);
    }

    // (5) PRIMACY — find the best INCIDENTAL cue (every cue except DIRECT_ORDER) by (rank desc, then hits desc). The
    //     incidental cues are the 4 cues a lieutenant may start over-relying on as the script drifts.
    const direct = registry.entries.DIRECT_ORDER;
    const directRank = BUCKET_RANK[direct.reliability_bucket];

    let best: { kind: CueKind; rank: number } | null = null;
    for (const kind of Object.keys(registry.entries) as CueKind[]) {
      if (kind === 'DIRECT_ORDER') continue;
      const entry = registry.entries[kind];
      const rank = BUCKET_RANK[entry.reliability_bucket];
      if (
        best === null ||
        rank > best.rank ||
        (rank === best.rank && entry.hits > registry.entries[best.kind].hits)
      ) {
        best = { kind, rank };
      }
    }

    // The TRANSITION respects the drift grace window: a transition AWAY from the baseline only commits once the drifting
    // primacy has had `driftGraceTicks` ticks since the window anchor to persist (hysteresis — avoids flapping on a single
    // noisy window). Before the grace elapses, the phase stays DIRECT_ALIGNED.
    const graceElapsed = tick - windowStartTick >= driftGraceTicks;

    let driftPhase: DriftPhase;
    let dominantCue: CueKind;
    if (holdResetting) {
      // Player-set RESETTING, no window slide → hold the phase + the persisted dominant (the counters were still updated).
      driftPhase = 'RESETTING';
      dominantCue = state.dominant_cue_kind as CueKind;
    } else if (best !== null && graceElapsed && best.rank === BUCKET_RANK.dominant && best.rank - directRank >= primacyMarginMin) {
      // INCIDENTAL_LOCKED — the best incidental cue is `dominant` AND it out-ranks DIRECT_ORDER by at least the primacy
      // margin: the incidental reliance has displaced the explicit-order primacy.
      driftPhase = 'INCIDENTAL_LOCKED';
      dominantCue = best.kind;
    } else if (best !== null && graceElapsed && best.rank >= BUCKET_RANK.reliable && best.rank >= directRank) {
      // DRIFTING — the best incidental is at least `reliable` and has caught up to (or passed) DIRECT_ORDER, but has not yet
      // locked. The dominant_cue_kind stays DIRECT_ORDER (the order is not yet displaced — only the phase signals the drift).
      driftPhase = 'DRIFTING';
      dominantCue = 'DIRECT_ORDER';
    } else {
      // DIRECT_ALIGNED — the baseline: the explicit order still leads (or the grace window has not elapsed).
      driftPhase = 'DIRECT_ALIGNED';
      dominantCue = 'DIRECT_ORDER';
    }

    // (6) Persist the whole registry + the derived phase/dominant + the (unchanged) decision-cooldown stamp.
    await this.repo.writeState(lieutenantId, registry, driftPhase, dominantCue, windowStartTick, tick, decisionTicks);

    // Return the post-update phase info so the LIEUTENANT_TICK can emit the decoupled bus events (lot-5 TD-051):
    // SignalDriftStateUpdatedEvent (every observation) + SignalDriftPhaseTransitionedEvent (when phase changed).
    return { newPhase: driftPhase, dominantCue, phaseTransitioned: driftPhase !== previousPhase };
  }
}
