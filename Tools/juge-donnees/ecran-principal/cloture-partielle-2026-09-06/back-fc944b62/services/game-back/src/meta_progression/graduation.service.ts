// IMPLEMENTS: docs/superpowers/plans/2026-07-18-p3-F-delegation-ratchet-plan.md C5 ("GraduationService.
//             executeGraduation per design §8.1/§8.2 (governor-wrapped tx: validate → C4 pipeline →
//             service-level attachScript `:491` → state flip + graduated_at → graduation_events
//             GRADUATION row → tenure stamp (R2 branch) → post-commit GraduationCommittedEvent);
//             successor row install (§8.4); lock-delay state on the row read path (divergence #25)").
//             Design: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-design.md §8 (Graduation)
//             + D4/D5/D6.
//             Decisions: docs/superpowers/specs/2026-07-18-p3-F-delegation-ratchet-decisions.md
//             divergence #25 (retirement_lock_delay_h — recorded on the row read path, no timer process).
//             C0 re-anchor: docs/superpowers/specs/2026-07-18-p3-F-C0-reanchor.md §4 R2 (tenure reset —
//             SEE the ★ TENURE-STAMP DIVERGENCE note below) + §3 R1 (n/a here, C8's own).
//             Pattern (governed-site service, validate-then-mutate): `core_loops/demolition/decommission.
//             service.ts` (confirm guard FIRST, zero DB touch, then the tx). Pattern (atomic reserve +
//             compensate-on-failure): `progression/loop10/structural-decision-governor.repository.ts`
//             (`reserveStructuralSlot`/`compensateStructuralSlot`) — THIS service's own `flipToDelegated`/
//             `revertToSelf` mirror that EXACT idiom at the NEW mastery_score site (see the ★ STEP-
//             ORDERING DIVERGENCE note below).
//             — P3-F C5 — 2026-07-19
//
// `GraduationService.executeGraduation` — the `mutateFn` `MetaProgressionController#graduate` wraps in
// `governor.commit(playerId, TASK_RETIREMENT, ctx, mutateFn)`.
//
// ★ STEP-ORDERING DIVERGENCE (LOUD — vs design §8.2's literal step list, coder discretion within the
// design's envelope, per this chunk's own plan mandate "design-first atomicity... redesign before
// coding" if a SELECT-then-write shape is found): design §8.2 lists (4) attachScript BEFORE (5) the
// mastery_score state flip. Followed LITERALLY, BOTH racers in a same-category concurrent-graduation
// scenario would reach attachScript BEFORE either reaches the state flip — meaning BOTH would
// successfully attach a script, violating the plan's own concurrency falsifiable ("no double attach")
// and leaving an orphaned script on the LOSING lieutenant. This implementation REORDERS: the atomic
// conditional `flipToDelegated` (mastery_score WHERE delegation_state='SELF') runs FIRST, immediately
// after validate — THIS is the winner gate (mirrors `reserveStructuralSlot`'s exact "one atomic
// conditional UPDATE, never a separate SELECT" shape). Only the WINNER proceeds to compile+attach+record.
// A LATER failure (attach 404 on a corrupted id; the induced-failure proof) triggers `revertToSelf` —
// the SAME "atomic claim + compensate-on-failure" idiom the governor itself uses for its OWN reservation
// — so `mastery_score` nets UNTOUCHED (never DELEGATED) on any failure path, satisfying BOTH falsifiables
// (no double attach AND zero net writes on induced failure) that design §8.2's literal order cannot
// satisfy simultaneously under real concurrency. See `mastery-score.repository.ts#flipToDelegated`/
// `#revertToSelf` for the mechanism.
//
// ★ TENURE-STAMP DIVERGENCE (LOUD — design §8.2 step 7 "tenure/lifecycle stamp via the REAL ch07 surface
// found at C0 (takeover note)"): NO separate call exists for this step. `LieutenantService.attachScript`
// (REUSED verbatim at the compile+attach step below) ALREADY carries the REAL ch07 surface this refers
// to — its OWN Phase-11 A3 logic (`lieutenant.service.ts` — "the RE-script settling window... Opens a
// settling window ONLY on a genuine REVISION (`wasValid===true`)... The FIRST authoring (false→true)
// opens NO window (no-regression contract — a brand-new delegation must act immediately)"). EMPIRICALLY
// VERIFIED while wiring this chunk (a bare-recruited COOK's `behavior_script` row: `valid=false,
// source=''` — the 09 schema DEFAULT, NOT an auto-authored archetype default for every archetype
// universally): a candidate graduated straight off recruitment hits the `wasValid=false` branch (no
// window — honest, "must act immediately"); a candidate the player already scripted/re-scripted before
// reaching ELIGIBLE mastery (the more seasoned, arguably more REALISTIC graduation candidate — mastery
// accrues over many real actions, plausibly alongside player-authored scripting) hits `wasValid=true` →
// attachScript itself opens the tenure-scaled settling window via `LieutenantRepository.setSettlingUntil`
// — the "takeover note" IS this settling window on THAT branch, arrived at for free by REUSING
// attachScript wholesale (design's own mandate — never a parallel implementation); on the other branch it
// is honestly absent, matching attachScript's own no-regression contract rather than a fabricated stamp.
// The C0-reanchor's R2 finding (no standalone tenure-RESET
// helper; C8 must add one) is a DIFFERENT concern for a DIFFERENT chunk (recall UNBINDS a lieutenant from
// a category and must reset tenure WITHOUT a building move — genuinely no callable helper exists for
// that yet); graduation never resets tenure, it only (conditionally) ARMS a settling window via the
// EXISTING, already-callable `attachScript` surface. No new repository method is added here for this step.

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { ApiError } from '../protocol/api-error';
import { CityEventBus } from '../citysim/events/city-event-bus';
import { LieutenantRepository } from '../operational/lieutenant/lieutenant.repository';
import { LieutenantService } from '../operational/lieutenant/lieutenant.service';
import { archetypeForRoleId } from '../operational/lieutenant/lieutenant-archetype';
import { TASK_CATEGORY_CATALOGUE, type TaskCategoryCatalogueEntry } from './task-category-catalogue';
import { metaProgressionTunables } from './meta-progression-tunables';
import { deriveMasteryBucket } from './mastery-bucket';
import { MasteryScoreRepository } from './mastery-score.repository';
import { PromotionLocksRepository } from './promotion-locks.repository';
import { CategoryDecisionLogRepository } from './category-decision-log.repository';
import { GraduationSeedMapper } from './graduation-seed-mapper';
import { GraduationEventsRepository } from './graduation-events.repository';
import { GraduationLieutenantFaultInjector } from './graduation-lieutenant-fault-injector';

export interface GraduationResult {
  readonly graduated: true;
  readonly category_id: number;
  readonly lieutenant_id: string;
}

@Injectable()
export class GraduationService {
  private readonly logger = new Logger(GraduationService.name);

  constructor(
    private readonly lieutenantRepo: LieutenantRepository,
    private readonly lieutenantService: LieutenantService,
    private readonly masteryScoreRepo: MasteryScoreRepository,
    private readonly promotionLocksRepo: PromotionLocksRepository,
    private readonly decisionLog: CategoryDecisionLogRepository,
    private readonly seedMapper: GraduationSeedMapper,
    private readonly graduationEventsRepo: GraduationEventsRepository,
    private readonly faultInjector: GraduationLieutenantFaultInjector,
    private readonly bus: CityEventBus,
  ) {}

  /**
   * `POST /v1/meta/graduation`'s `mutateFn` (design §8.1/§8.2). `categoryId` is the `TaskCategoryCatalogue`
   * code (§6); `lieutenantId` is the player-picked candidate. Validation is ALWAYS server-re-derived
   * (never trusted from the client, design §8.2 step 1). Throws `ApiError` on any refusal — the governor's
   * OWN catch-and-compensate (structural cap slot) fires regardless of which step throws.
   */
  async executeGraduation(playerId: string, categoryId: number, lieutenantId: string): Promise<GraduationResult> {
    const entry = await this.validateGraduationEligible(playerId, categoryId, lieutenantId);

    // ★ Fault-injector hook (post-validate — the request GENUINELY passed every real precondition above).
    // Armed → substitute an unowned UUID for every subsequent step's lieutenant id (the induced-failure
    // proof shape — see file header). Unarmed (the overwhelming common case) → a pure no-op, `effective
    // LieutenantId === lieutenantId`.
    const effectiveLieutenantId = this.faultInjector.consumeIfArmed(playerId) ? randomUUID() : lieutenantId;

    // ★ THE WINNER GATE (see file header's step-ordering divergence note): the ONE atomic conditional
    // UPDATE. A concurrent SAME-category graduation that already won leaves this as a genuine, real 409 —
    // NO attach, NO decision-log read, NO seed compile ever runs for the loser.
    const flip = await this.masteryScoreRepo.flipToDelegated(playerId, entry.code, effectiveLieutenantId);
    if (!flip.flipped) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'Category is no longer SELF-managed (a concurrent graduation won the race, or the row changed underneath this request).',
        payloadVars: { category_id: entry.code },
      });
    }

    try {
      // C4 seam (D5) — the last-N REAL decisions, compiled through the REAL DSL pipeline. The archetype
      // is derived from the CANDIDATE lieutenant's own persisted role_id (never a catalogue-level
      // affinity — `task-category-catalogue.ts`'s own `archetypeAffinity` field stays undefined on every
      // row, design note: "reserved for a later need" — graduation shapes the seed for WHICHEVER
      // lieutenant the player actually picked, not a category-fixed archetype).
      const archetype = archetypeForRoleId(entry.candidateRoleId);
      if (archetype === null) {
        // Defensive-only (should not occur for a real, recruited lieutenant — every recruit path sets
        // role_id via roleIdForArchetype over the closed 9-archetype registry): never silently continue
        // with an unclassifiable archetype into the seed pipeline.
        throw new ApiError('VALIDATION_FAILED', {
          message: `lieutenant ${effectiveLieutenantId} has an unrecognized role_id=${entry.candidateRoleId} (no archetype mapping).`,
        });
      }
      const seedDepthN = metaProgressionTunables.graduationScriptSeedDepth;
      const decisions = await this.decisionLog.extractCategoryDecisions(playerId, entry.code, seedDepthN);
      const seedScript = this.seedMapper.mapPlayerDecisionsToSeedScript(decisions, entry.code, archetype);

      // C7-seam attach (D4 step 4 / D5) — REUSE the SERVICE-LEVEL call (never the governed controller
      // route — the cap is consumed ONCE by TASK_RETIREMENT, decisions §3). This is ALSO the tenure-stamp
      // step (see file header's tenure-stamp divergence note) — no separate call.
      await this.lieutenantService.attachScript(playerId, effectiveLieutenantId, seedScript.source);

      // Append-only GRADUATION row + successor install (§8.2 step 6 / §8.4), ONE transaction.
      await this.graduationEventsRepo.recordGraduation({
        playerId,
        categoryId: entry.code,
        lieutenantId: effectiveLieutenantId,
        seedDecisionsN: seedScript.seedDecisionsN,
        scriptSeedHash: seedScript.scriptSeedHash,
        masteryAtEvent: flip.masteryAtEvent,
        successorCategoryId: entry.successorCode,
        sessionRef: null, // BO-forensics-only field; no session-lookup coupling added this chunk (disclosed).
        gameTick: await this.lieutenantRepo.getCurrentGameMinute(playerId),
      });
    } catch (err) {
      // ★ Compensation (mirrors the governor's OWN compensateStructuralSlot — see file header): a failure
      // AFTER the winner gate must leave mastery_score net-UNTOUCHED, never a half-graduated row.
      await this.masteryScoreRepo.revertToSelf(playerId, entry.code, effectiveLieutenantId);
      throw err;
    }

    this.bus.emitGraduationCommitted({
      type: 'graduation_committed',
      playerId,
      categoryId: entry.code,
      lieutenantId: effectiveLieutenantId,
      masteryAtEvent: flip.masteryAtEvent,
      successorCategoryId: entry.successorCode,
      gameMinute: 0, // player-triggered HTTP — no scheduler ctx (the SAME convention governor.commit's own emit uses).
    });

    this.logger.log(
      `graduation COMMITTED: player=${playerId} category=${entry.code} lieutenant=${effectiveLieutenantId} ` +
        `mastery_at_event=${flip.masteryAtEvent} successor=${entry.successorCode ?? 'none'}`,
    );

    return { graduated: true, category_id: entry.code, lieutenant_id: effectiveLieutenantId };
  }

  /**
   * Design §8.2 step 1 — re-validate SELF + ELIGIBLE + candidate lieutenant + no blocking lock, entirely
   * server-side. Returns the catalogue entry (carrying the candidate's derived archetype role) on success;
   * throws `ApiError` on the FIRST violation.
   *
   * Divergence #25 (retirement_lock_delay_h): this row-read path is where the design records the delay's
   * consumption target — v1 the ONLY BO mutation is `force-close-window`/tunables PUT (C8/C10), so there
   * is no override-graduation surface for the delay to guard YET (decisions §4 #25 — "the check ships with
   * the surface that exists"). Recorded here, honestly inert until that surface lands (never a fig-leaf
   * check against nothing): `metaProgressionTunables.retirementLockDelayH` is NOT consulted in this
   * method — there is no override path on this base for it to gate.
   */
  private async validateGraduationEligible(
    playerId: string,
    categoryId: number,
    lieutenantId: string,
  ): Promise<TaskCategoryCatalogueEntry & { candidateRoleId: number }> {
    const entry = TASK_CATEGORY_CATALOGUE.find((e) => e.code === categoryId);
    if (!entry || !entry.live) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `category ${categoryId} is not a LIVE TaskCategory.`,
        payloadVars: { category_id: categoryId },
      });
    }

    const masteryRow = await this.masteryScoreRepo.getRow(playerId, entry.code);
    const delegationState = masteryRow?.delegation_state ?? 'SELF';
    if (delegationState !== 'SELF') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `category ${categoryId} is not SELF-managed (delegation_state=${delegationState}).`,
        payloadVars: { category_id: categoryId },
      });
    }

    const rawScore = masteryRow?.mastery_score ?? 0;
    const threshold = metaProgressionTunables.masteryRetirementThreshold;
    if (deriveMasteryBucket(rawScore, threshold) !== 'ELIGIBLE') {
      throw new ApiError('VALIDATION_FAILED', {
        message: `category ${categoryId} is not ELIGIBLE for graduation (raw < threshold).`,
        payloadVars: { category_id: categoryId },
      });
    }

    // Candidate lieutenant: the SAME ownership query the guarded attach path enforces (§8.2 step 1 "REUSE
    // its validation, never a parallel one") — `getOwnedLieutenant`, widened with `role_id` this chunk
    // (additive column, zero behavior change for its 3 pre-existing callers).
    const owned = await this.lieutenantRepo.getOwnedLieutenant(playerId, lieutenantId);
    if (!owned) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `lieutenant ${lieutenantId} is not owned by this player.`,
      });
    }

    const activeLock = await this.promotionLocksRepo.findActiveForCategory(playerId, entry.code);
    if (activeLock !== null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `category ${categoryId} has an ACTIVE promotion lock — graduation refused until it closes.`,
        payloadVars: { category_id: categoryId },
      });
    }

    return { ...entry, candidateRoleId: owned.role_id };
  }
}
