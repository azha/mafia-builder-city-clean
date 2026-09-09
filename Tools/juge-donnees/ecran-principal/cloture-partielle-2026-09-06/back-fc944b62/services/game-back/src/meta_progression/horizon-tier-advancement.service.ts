// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C4 ("`HorizonTierAdvancementService`:
//             `POST /v1/meta/horizon/advance-tier {lieutenant_id}` -> counter gate (`≥ script_stability_
//             cycles_tier{2,3}`) -> monotone `UPDATE decision_horizon_tier = :n WHERE = :n-1` -> counter
//             reset -> `HorizonTierAdvancedEvent` (NEW bus event — R8, hazard 4); non-regression invariant
//             (a deviation never lowers the tier).").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md D6 ("validate
//             `counter.consecutive_no_deviation_cycles ≥ script_stability_cycles_tierN` for the target
//             lieutenant ... It is NOT session-cap-gated (the ScriptStabilityCounter IS the ratchet)").
//             REUSE: `ProgressionRepository.getDecisionHorizonTier` (C2 — the SAME read `ExecutionPlanService.
//             createPlan` uses); `ScriptStabilityCountersRepository.readForGate`/`resetOnAdvance` (this
//             chunk's own additive methods); `HorizonTierAdvancementRepository.advanceTier` (this file's
//             own sibling, the D6 monotone WHERE double wall).
//             ★ DISCLOSED DESIGN CHOICE — `targetTier > 3` (already at max): D1's own 1..3 domain has no
//             tier 4; refused BEFORE the counter read (there is no `script_stability_cycles_tier4` getter
//             to gate against — see `meta-progression-tunables.ts`, only `..._tier2`/`..._tier3` exist).
//             ★ DISCLOSED DESIGN CHOICE — a lost race on the monotone UPDATE for the SAME `targetTier`
//             (concurrency, or a genuine replay after a real advance already landed) is NOT surfaced as an
//             error: the caller's INTENT (reach `targetTier`) is, by construction, already satisfied by
//             whichever concurrent request won — this re-reads the NOW-current tier and returns it 200,
//             emitting NO second event (mirrors the concurrency falsifiable's own "single write, one event"
//             requirement from the CALLER'S perspective — never a spurious 409/422 for a race ON THE SAME
//             TARGET the player did nothing wrong to cause).
//             ★ Amendment (C9-fix, ⊥ gate RE-measurement, 2026-08-04 — retracts an earlier, DISPROVEN
//             diagnosis): this "never spurious" guarantee is scoped to the SAME `targetTier`. `targetTier`
//             is itself SERVER-derived (`currentTier + 1`, NEVER a client input — see `advance`'s own
//             JSDoc below), so a request whose OWN `currentTier` read lands AFTER a concurrent winner's
//             commit legitimately computes a HIGHER `targetTier` than that winner reached (its own read
//             already observes the winner's post-commit tier). Refusing THAT request for a genuinely
//             unearned higher tier is HONEST, not a lie: its 422 names the tier it actually asked for,
//             NEVER the tier the winner already holds — `horizon_tier_advancement.spec.ts` test (7)'s own
//             "anti-lie clause" (`target_tier` must never read the tier already reached) is the
//             falsifiable proof of this exact distinction, and a ⊥ measurement (15/15 sampled failures,
//             both pre- and post-C9-fix) found ONLY this honest-refusal shape in practice — never the
//             SAME-target race the paragraph above describes, though that race remains real and possible
//             (see C9-fix below, which closes it) and is why the fix is kept regardless.
//             ★ P3-H C8 fix-in-passing (disclosed, zero behavior change): the local `thresholdForTargetTier`
//             helper is HOISTED to `horizon-tier-ladder.ts#scriptStabilityThresholdForTargetTier` (C8 adds a
//             second consumer — the `StabilityBucketEnum` display derivation on the timeline GET — that
//             needs the IDENTICAL threshold; see that function's own header for the full DRY rationale).
//             This file now imports it instead of defining it locally; the resolved values are unchanged.
//             C9 ADDS (design §11 — the BO surface): `forceAdvance` (the admin `horizon-tier/force-advance`
//             override, SAME domain wall, gate-BYPASSED) + the `performAdvance` hoist (fix-in-passing, zero
//             behavior change to the organic `advance` path — both public methods now share ONE write
//             sequence instead of `forceAdvance` duplicating it).
//             ★ C9-fix (⊥ gate finding, race PRE-DATES C9 — reproduced identically on a pre-C9 image, the
//             hoist above is NOT the cause): `advance`'s counter gate (readForGate, ~L99) was evaluated
//             OUTSIDE `performAdvance`'s atomic write, on a `currentTier` snapshot taken BEFORE the gate
//             read — so a concurrent winner's `resetOnAdvance` landing IN BETWEEN made the loser's gate
//             read observe a freshly-zeroed counter and throw 422 `STABILITY_COUNTER_INSUFFICIENT` even
//             though that same winner had already carried the player to the loser's OWN `targetTier`
//             (`horizon_tier_advancement.spec.ts` test (7), ~50% flake rate pre-fix). Fix: the gate-refusal
//             branch now re-reads the tier and, when it shows `targetTier` already reached, takes the SAME
//             "intent already satisfied" 200-no-event path `performAdvance`'s own lost-race branch already
//             took — never a second write, never a new race window (a plain re-read, no lock, no retry).
//             This re-read is a NARROW, targeted comparison (`nowTier >= targetTier`, MY OWN target) — it
//             does NOT convert every gate refusal to 200: a caller whose OWN `currentTier` read already
//             observed a HIGHER tier (the Amendment two paragraphs above — a genuinely unearned NEXT tier)
//             still falls through to the legitimate 422 unchanged, because `nowTier` there is STILL below
//             `targetTier` — the two cases this file's header now names are handled DIFFERENTLY on purpose.
//             — P3-H C4 — 2026-07-24 (advance) / C8 — 2026-07-24 (threshold hoist, no behavior change) /
//             C9 — 2026-07-25 (forceAdvance + performAdvance hoist) / C9-fix — 2026-08-04 (gate race)

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../protocol/api-error';
import { CityEventBus, type HorizonTierAdvancedEvent } from '../citysim/events/city-event-bus';
import { ProgressionRepository } from '../progression/progression.repository';
import { ScriptStabilityCountersRepository } from './script-stability-counters.repository';
import { HorizonTierAdvancementRepository } from './horizon-tier-advancement.repository';
import { scriptStabilityThresholdForTargetTier, type DecisionHorizonTier } from './horizon-tier-ladder';

/** The player-facing response shape (design's own contract does not name a body — `{tier}` mirrors the
 *  minimal, self-describing shape every OTHER simple mutation in this lot returns). */
export interface AdvanceTierResult {
  readonly tier: number;
}

@Injectable()
export class HorizonTierAdvancementService {
  private readonly logger = new Logger(HorizonTierAdvancementService.name);

  /** In-memory test-probe array (never used in production paths) — mirrors `VocabTierAdvancementService`'s
   *  own `advancedEvents` shape: pushed IN-LINE right where THIS method calls `bus.emit...`. */
  private advancedEvents: HorizonTierAdvancedEvent[] = [];

  constructor(
    private readonly progressionRepo: ProgressionRepository,
    private readonly counterRepo: ScriptStabilityCountersRepository,
    private readonly repo: HorizonTierAdvancementRepository,
    private readonly bus: CityEventBus,
  ) {}

  // ────────────────────────────────── test-probe accessors (TEST-ONLY) ──────────────────────────

  /** Every `HorizonTierAdvancedEvent` fired this process (test-probe — never used in production paths). */
  getAdvancedEvents(): readonly HorizonTierAdvancedEvent[] {
    return this.advancedEvents;
  }

  /** Clear the in-memory advanced-event probe (called by the test reset route). */
  clearAdvancedEvents(): void {
    this.advancedEvents = [];
  }

  // ── the MANUAL, counter-gated advance (design §6.6/D6) ──────────────────────────────────────────

  /**
   * `POST /v1/meta/horizon/advance-tier {lieutenant_id}` (design §6.6/D6). `targetTier = currentTier + 1`
   * (tier is player-shared, D1 — NOT a client input; the client only names WHICH lieutenant's counter
   * gates the advance). Refuses 409 `HORIZON_TIER_ALREADY_MAXIMUM` at tier 3 (nothing left to advance
   * into); 422 `STABILITY_COUNTER_INSUFFICIENT` when `readForGate(playerId, lieutenantId) < threshold` AND
   * the tier is STILL below `targetTier` on re-read (no write) — C9-fix (this file's own header): when the
   * counter reads short ONLY because a concurrent winner already reset it after carrying the player to
   * `targetTier`, that re-read short-circuits to the SAME "intent already satisfied" 200 the lost-race
   * branch below returns, never the 422. On a genuine write: `resetOnAdvance` (D6 — "reset the counter",
   * NEVER on a gate-refusal or a lost race) + `HorizonTierAdvancedEvent`. On a lost race / replay (the
   * monotone WHERE's own zero-write — see this file's own header): re-reads the now-current tier and
   * returns it, no error, no second event.
   */
  async advance(playerId: string, lieutenantId: string): Promise<AdvanceTierResult> {
    const currentTier = (await this.progressionRepo.getDecisionHorizonTier(playerId)) as DecisionHorizonTier;
    if (currentTier >= 3) {
      throw new ApiError('HORIZON_TIER_ALREADY_MAXIMUM', {
        message: `player ${playerId} is already at decision_horizon_tier=${currentTier} (the domain maximum).`,
        payloadVars: { current_tier: currentTier },
      });
    }
    const targetTier = currentTier + 1;

    const threshold = scriptStabilityThresholdForTargetTier(targetTier);
    const counter = await this.counterRepo.readForGate(playerId, lieutenantId);
    if (counter < threshold) {
      // ★ P3-H C9-fix (⊥ gate finding — the gate's OWN race window, distinct from the monotone-WHERE
      // race `performAdvance` already handles below): `readForGate` can observe a counter a CONCURRENT
      // winner already reset via ITS OWN `performAdvance` -> `resetOnAdvance` between OUR `currentTier`
      // read above and THIS read — i.e. the player has, by the time we get here, already BEEN carried to
      // `targetTier` by that winner. Trusting the stale `currentTier` snapshot and throwing here would
      // tell that caller "your stability is insufficient" while their tier in fact already advanced —
      // the exact lie this file's own header (★ DISCLOSED DESIGN CHOICE above) forbids for the monotone-
      // WHERE loser, and there is no principled reason the GATE loser deserves worse: their intent (reach
      // `targetTier`) is, by construction, ALREADY satisfied by whichever concurrent request won. Re-read
      // the tier (a plain SELECT, no write — cannot itself open a new race) and, ONLY when it shows the
      // target already reached, fall back to that SAME lost-race posture: 200 + the now-current tier, NO
      // second event. A counter genuinely short with the tier STILL below target (the common case) falls
      // through unchanged to the legitimate 422 below.
      const nowTier = await this.progressionRepo.getDecisionHorizonTier(playerId);
      if (nowTier >= targetTier) {
        this.logger.log(
          `advance gate no-op (concurrent winner already landed): player=${playerId} lieutenant=${lieutenantId} ` +
            `target_tier=${targetTier} counter=${counter} threshold=${threshold} (current tier is now ${nowTier}).`,
        );
        return { tier: nowTier };
      }
      throw new ApiError('STABILITY_COUNTER_INSUFFICIENT', {
        message: `lieutenant ${lieutenantId}'s counter (${counter}) is below the tier-${targetTier} threshold (${threshold}).`,
        payloadVars: { counter, threshold, target_tier: targetTier },
      });
    }

    return this.performAdvance(playerId, lieutenantId, targetTier);
  }

  // ── P3-H C9 (design §11) — the admin force-advance override ─────────────────────────────────────

  /**
   * `POST /v1/admin/meta/horizon-tier/force-advance` (design §11 — "canon force-advance (compensation/
   * debug)"). The SAME `targetTier = currentTier + 1` + `HORIZON_TIER_ALREADY_MAXIMUM` 409 wall `advance`
   * enforces above (a force-advance still can never overshoot the D1 1..3 domain, and still advances
   * exactly ONE tier per call — "force" bypasses the EARNED-ness gate, not the domain), but SKIPS the
   * `ScriptStabilityCounter` threshold gate entirely (★ DISCLOSED CODER CHOICE — design names no body
   * contract for this route; "force" is read literally as "bypass the counter-earned check", the ONE gate
   * `advance` enforces beyond the domain wall — never a license to jump tiers or violate the monotone
   * WHERE). `lieutenantId` is STILL required (the event's own `lieutenantId` field, D6 — "the target
   * lieutenant whose counter gated this advance"; here it names the lieutenant whose counter gets reset,
   * for state coherence with the organic path — see `performAdvance`'s own header). Shares `performAdvance`
   * with `advance` above (C9 fix-in-passing, zero behavior change to the organic path — the SAME atomic
   * monotone-WHERE + guarded-counter-reset + event-emit sequence, now callable from TWO gates instead of
   * duplicated).
   */
  async forceAdvance(playerId: string, lieutenantId: string): Promise<AdvanceTierResult> {
    const currentTier = (await this.progressionRepo.getDecisionHorizonTier(playerId)) as DecisionHorizonTier;
    if (currentTier >= 3) {
      throw new ApiError('HORIZON_TIER_ALREADY_MAXIMUM', {
        message: `player ${playerId} is already at decision_horizon_tier=${currentTier} (the domain maximum).`,
        payloadVars: { current_tier: currentTier },
      });
    }
    const targetTier = currentTier + 1;
    return this.performAdvance(playerId, lieutenantId, targetTier);
  }

  /**
   * The shared write sequence BOTH `advance` (counter-gated) and `forceAdvance` (gate-bypassed) reduce to
   * once their OWN distinct gating logic has cleared: `ensureRow` (defensive, see `advance`'s own former
   * inline comment, preserved here verbatim) -> the monotone WHERE-guarded `advanceTier` -> on a genuine
   * write, `resetOnAdvance` (D6 — reset the counter, NEVER on a gate-refusal or a lost race) +
   * `HorizonTierAdvancedEvent`; on a lost race / replay, re-read the now-current tier and return it, no
   * error, no second event (the SAME "the caller's intent is already satisfied" posture `advance`'s own
   * header already documented — this is a hoist, not a behavior change).
   */
  private async performAdvance(playerId: string, lieutenantId: string, targetTier: number): Promise<AdvanceTierResult> {
    // Defensive `ensureRow` (idempotent upsert, REUSE Phase-17 — the SAME precedent `structural-decision-
    // governor.service.ts:96`/`budget-recompute.service.ts:110` already establish for every OTHER
    // `player_progression_state` writer): guarantees the monotone UPDATE below always targets a REAL row.
    // Normally a no-op — `getDecisionHorizonTier`'s own `?? 1` fallback already proved a row's ABSENCE is
    // indistinguishable from tier=1 for READS, but the WRITE below is a bare `UPDATE ... WHERE`, which
    // matches ZERO rows (not an error, just silently wrong) against a player who has never opened a
    // session (`SessionRepository.openFresh` calls `ensureRow` before any session is ever opened, so this
    // only matters for the untested "never opened a session yet" edge).
    await this.progressionRepo.ensureRow(playerId);

    const gameMinute = await this.repo.getCurrentGameMinute(playerId);
    const result = await this.repo.advanceTier(playerId, targetTier);
    if (!result.advanced) {
      // Lost the race, or a genuine replay after a concurrent winner already advanced this EXACT
      // transition (this file's own header) — the caller's intent is already satisfied.
      const nowTier = await this.progressionRepo.getDecisionHorizonTier(playerId);
      this.logger.log(
        `advance no-op (monotone WHERE): player=${playerId} lieutenant=${lieutenantId} target_tier=${targetTier} ` +
          `(a concurrent winner or a replay already landed — current tier is now ${nowTier}).`,
      );
      return { tier: nowTier };
    }

    await this.counterRepo.resetOnAdvance(playerId, lieutenantId, gameMinute);

    const event: HorizonTierAdvancedEvent = {
      type: 'horizon_tier_advanced',
      playerId,
      lieutenantId,
      newTier: result.newTier,
      gameMinute,
    };
    this.bus.emitHorizonTierAdvanced(event);
    this.advancedEvents.push(event);

    this.logger.log(`HORIZON_TIER_ADVANCE COMMITTED: player=${playerId} lieutenant=${lieutenantId} tier=${result.newTier}`);
    return { tier: result.newTier };
  }
}
