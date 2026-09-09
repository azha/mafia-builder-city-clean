// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 3 (C3) Step 7
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §8 + §8.1
//             DD: DD-MUSCLE-P4-LEGIBLE §8.1.2 (remove the band gate; P4 refuse is script-driven)
//             Canon: docs/tech/04b_combat_and_conflict/design_principles.md:67-73 (P2/P3/P4/P6)
//             — Combat & Escalation B C3 — 2026-06-25 (DD-MUSCLE-P4-LEGIBLE fix) —
//
// `CombatService.requestAssault` — the player-facing assault request (P4 — the Muscle DSL entry).
//
// P2 (non-free): every accepted assault records a non-null `heat_increment_bucket` on the
//   `combat_event` row (the Muscle always pays a heat cost — no free attack).
// P3 (multi-tick): the assault is SCHEDULED for the next daily resolution tick — `outcome_bucket`
//   is NULL at insert time. Resolution fires via `CombatResolutionTickService` (NIGHTLY/13.5,
//   combat-resolution-tick.service.ts, W6.1 C2), which calls ConflictOrchestratorService's
//   §7.1 cascade (`recordAssaultCascade`) for each pending event, in production, every night.
// P4 (legible): on a structural precondition failure (no rival_state row), returns
//   `{ scheduled: false, reason: 'no_rival_state' }`. The ACCEPT/REFUSE decision on whether the
//   player's script fires EXECUTE_DEFAULT vs a blocking rule is the executor's business (§8.1.2);
//   `requestAssault` is called ONLY when the executor has already resolved EXECUTE_DEFAULT — it
//   UNCONDITIONALLY schedules the assault (no service-side band gate). The P4 legibility ref
//   (`script_rule_that_blocked: ScriptRuleRef`) is surfaced by the refuse legibility surface
//   (§8.1.4) in MuscleBindingService, not here.
// P6 / server-side bands: `requestAssault` no longer reads `getRegimePressureBand` to gate the
//   assault (DD-MUSCLE-P4-LEGIBLE §8.1.2(a): the band is a STATE the player's script reads, not a
//   service-side veto). The band read stays in `MuscleBindingService.buildSnapshot` (server↔server,
//   P6 safe — populates the snapshot; never returned to the player).
//
// [C5-DEP] Percolation band stub: the `percolation_band` for the target holding is a C5 concern
//   (PercolationService lands at C4-C5). For C3, the snapshot includes a stubbed band 'standard'.
//   When C5 lands, the Muscle binding's buildSnapshot will populate `state.percolation_band` from
//   PercolationService.getActiveLinkFractionBucket — the stub is removed then.
//
// DETERMINISM (C4): NO Math.random(), NO Date.now() anywhere in this file.
// ADDITIVE: no existing table or service is modified. Inserts into `combat_event` only.

import { Injectable, Logger } from '@nestjs/common';

import { CombatRepository } from './combat.repository';
import { RegimeSwitchingService } from '../rival/regime-switching.service';
import type { RivalKey } from '../rival/rival-ai.types';
// W6.1 C4: the unified, LIVE CombatOutcomeBucket vocabulary + its narrowing predicate (design §6 B-1).
import { isCombatOutcomeBucket, type CombatOutcomeBucket } from './combat-tunables';
// TD-553 (maillon 3) — the rival faction's display name (fiction-names.ts's own header: this route is
// the ONLY player-facing surface exposing `rival_key`, so this is where the name lands).
import { rivalNameRef } from '../../../common/fiction-names';
import type { I18nRef } from '../../../common/i18n-ref';

// ── Assault result types ──────────────────────────────────────────────────────────────────────────

/** The accepted-assault result: a combat_event row was scheduled (P3) at non-zero cost (P2). */
export interface AssaultAccepted {
  scheduled: true;
  /** The `id` of the inserted `combat_event` row. */
  eventId: string;
}

/**
 * The refused-assault result (P4 — DD-MUSCLE-P4-LEGIBLE §8.1.3):
 *
 * Two distinct refuse cases — discriminated by the `reason` field:
 *   - `{ scheduled: false, reason: 'no_rival_state' }`: STRUCTURAL precondition error — no
 *     `rival_state` row exists for this player × rival. Not a P4 script block; a defensive guard.
 *
 * Note: the P4 script-driven refuse (`script_rule_that_blocked: ScriptRuleRef`) is NOT produced
 * here — it is produced by the legibility surface in MuscleBindingService (§8.1.4). The executor
 * refuses to EXECUTE_DEFAULT via a blocking rule BEFORE `requestAssault` is even called (fact 3:
 * the tick only calls `applyExecuteDefault` when the executor resolved EXECUTE_DEFAULT). So this
 * service only ever produces the precondition guard.
 */
export interface AssaultRefused {
  scheduled: false;
  reason: 'no_rival_state';
}

export type AssaultResult = AssaultAccepted | AssaultRefused;

// ── EngagementView — the frozen GET /v1/me/engagements list shape (W6.1 C4, design §4 C4) ──────────
//
// `status` is DERIVED (`outcome_bucket === null ? 'scheduled' : 'resolved'`) — never a raw scalar.
// `created_at_minute` is DELIBERATELY absent (design §4 C4, I-d): `combat-projection.service.ts:51-54`
// freezes "EXACTLY 8 keys. NO raw scalar" for the ONLY other player-facing combat shape in this
// domain, and a `grep` for `created_at_minute` on every non-`_test`/`admin` controller in this repo
// returns ZERO hits — there is no precedent anywhere for a game-minute crossing the player frontier.
// The row's RANK in the returned list carries the order; the value itself never does (§4 C4 note).

export type EngagementStatus = 'scheduled' | 'resolved';

/**
 * `EngagementView` — one projected `combat_event` row. `outcome_bucket` /
 * `friction_consumed_bucket` / `heat_increment_bucket` are ALREADY P6-safe bucket strings on the DB
 * row (`conflict_combat.ts:169-176`, R2.2) — no further banding needed, only the shape freeze.
 * `target_rival_name_i18n` — TD-553 (maillon 3), ADDITIVE: `target_rival_key` alone forced the
 * client to invent a display name; this sits ALONGSIDE it (the key is UNCHANGED, DF-11's own
 * "additive, never renamed" posture) so a client can resolve a real name instead.
 */
export interface EngagementView {
  engagement_id: string;
  target_rival_key: string;
  target_rival_name_i18n: I18nRef;
  status: EngagementStatus;
  outcome_bucket: CombatOutcomeBucket | null;
  friction_consumed_bucket: string | null;
  heat_increment_bucket: string | null;
}

// ── The heat increment bucket for a scheduled assault (P2 — non-free) ───────────────────────────
// [PROV-Y26Q2]: the exact heat cost is a calibration TD (combat conflict-layer calibration TD).
// For C3, a fixed 'medium' heat bucket is the non-free placeholder — falsifiable (not null).
// C4+ mechanic services refine this via the friction budget.
const ASSAULT_HEAT_INCREMENT_BUCKET = 'medium'; // [PROV-Y26Q2] calibration TD

// ── CombatService ─────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class CombatService {
  private readonly logger = new Logger(CombatService.name);

  constructor(
    private readonly repo: CombatRepository,
    private readonly regimeSwitching: RegimeSwitchingService,
  ) {}

  /**
   * `requestAssault` — the Muscle DSL entry (P4). Called by `MuscleBindingService.applyExecuteDefault`
   * when the Muscle lieutenant's behavior script fires `EXECUTE_DEFAULT`.
   *
   * Behavior (DD-MUSCLE-P4-LEGIBLE §8.1.2):
   *   1. Check the structural precondition: a `rival_state` row must exist (the rival has been seeded
   *      for this player). If not → REFUSE with `{ reason: 'no_rival_state' }` (not a P4 script block;
   *      a defensive guard). No `combat_event` is inserted.
   *   2. UNCONDITIONALLY schedule the assault: insert a `combat_event` row (type='assault') with
   *      `outcome_bucket=NULL` (P3 — scheduled for the next `CombatResolutionTickService` NIGHTLY/
   *      13.5 sweep, W6.1 C2, NOT resolved immediately) + a non-null `heat_increment_bucket`
   *      (P2 — the assault is not free).
   *
   * The "should I assault right now?" decision is owned by the player's behavior script (the
   * executor returned EXECUTE_DEFAULT, so the script says "yes, assault"). The service NEVER
   * reads `getRegimePressureBand` to gate (DD-MUSCLE-P4-LEGIBLE §8.1.2(a): the band is a STATE
   * the player's script reads via the snapshot, not a service veto). The P4 legibility ref
   * (`script_rule_that_blocked`) is surfaced by MuscleBindingService's refuse legibility surface
   * (§8.1.4), never minted here.
   *
   * DETERMINISM (C4): no Math.random(), no Date.now().
   *
   * [C5-DEP] The `target_block_id` is null at C3 (no percolation targeting until C5 wires
   * PercolationService). C5 will populate it from the target holding's block assignment.
   *
   * @param playerId     - The player owning the Muscle lieutenant.
   * @param rivalKey     - The target rival key (e.g. 'tarcum').
   * @param lieutenantId - The MUSCLE lieutenant driving the assault.
   * @param gameMinute   - REQUIRED (W6.1 C7, design §8.1 #3): the caller's real in-game clock,
   *                       stamped into `created_at_minute` — load-bearing for C2's resolution ORDER
   *                       (`combat.repository.ts` `listPendingAssaults`, `ORDER BY created_at_minute, id`)
   *                       and C4's projection `orderBy` (`combat-projection.service.ts`). No default:
   *                       a defaulted/omitted clock here silently reproduces the exact bug this
   *                       parameter closes (an un-ordered `created_at_minute=0` on every event), so a
   *                       caller that forgets it is a COMPILE error, never a silent 0.
   * @param targetHoldingId - Optional: the target holding (a building_id); used for P5 targeting.
   */
  async requestAssault(
    playerId: string,
    rivalKey: RivalKey,
    lieutenantId: string,
    gameMinute: number,
    targetHoldingId?: string,
  ): Promise<AssaultResult> {
    // ── Structural precondition: rival_state row must exist ────────────────────────────────────
    // Read the band purely to confirm a rival_state row exists for this player × rival.
    // NOT a gate on the band value (the band is the player's script's decision, not ours).
    const band = await this.regimeSwitching.getRegimePressureBand(playerId, rivalKey);

    if (band === null) {
      // No rival_state row for this player × rival (the rival is not yet seeded for this player).
      // Refuse with the structural precondition guard — do not throw (benign: retries next tick).
      this.logger.debug(
        `requestAssault: no rival_state for player=${playerId} rival=${rivalKey} — refusing (no_rival_state)`,
      );
      return { scheduled: false, reason: 'no_rival_state' };
    }

    // ── ACCEPT: schedule the assault unconditionally (P3) ────────────────────────────────────
    // The player's script resolved EXECUTE_DEFAULT → "assault now". We schedule it.
    // Insert a combat_event row with outcome_bucket=NULL (deferred to C-cas ConflictOrchestratorService).
    // The heat_increment_bucket is non-null (P2 — the assault always costs heat).
    // [C5-DEP] target_block_id is null until C5 wires the percolation block targeting.
    // created_at_minute: game-minute provides stable insertion-order sorting
    // (uuid v4 id is random, NOT time-ordered — migration 0093).
    const event = await this.repo.insertCombatEvent({
      player_id:              playerId,
      type:                   'assault',
      target_rival_key:       rivalKey,
      target_block_id:        null,         // [C5-DEP] percolation targeting lands at C5
      target_register_id:     targetHoldingId ?? null,
      lieutenant_id:          lieutenantId,
      friction_consumed_bucket: null,        // [C4-DEP] friction budget computed at C4
      outcome_bucket:         null,          // P3: NULL = scheduled, not yet resolved
      heat_increment_bucket:  ASSAULT_HEAT_INCREMENT_BUCKET, // P2: non-null = non-free
      created_at_minute:      gameMinute,
    });

    this.logger.log(
      `requestAssault: assault SCHEDULED — event=${event.id} rival=${rivalKey} ` +
        `lieutenant=${lieutenantId} heat=${ASSAULT_HEAT_INCREMENT_BUCKET}`,
    );

    return { scheduled: true, eventId: event.id };
  }

  /**
   * `listEngagements` — W6.1 C4 (`GET /v1/me/engagements`, design §4 C4). Projects the player's own
   * `combat_event` assault rows (`repo.listEngagementsForPlayer` — `WHERE player_id`, the ONLY
   * scoping) into the frozen `EngagementView` shape. `status` is derived from the raw
   * `outcome_bucket IS NULL` fact (P3: NULL = scheduled, not yet resolved by
   * COMBAT_RESOLUTION_TICK). `outcome_bucket` is narrowed through `isCombatOutcomeBucket` — design
   * §6 B-1, the SAME predicate `CombatProjectionService.toCombatClientView` now uses — never an `as`
   * cast, so a stray non-domain column value surfaces as `null`, never a type lie on this new route.
   * `target_rival_name_i18n` — TD-553 (maillon 3): `rivalNameRef` takes `row.target_rival_key`
   * directly (a plain `string`, no cast — `fiction-names.ts`'s own header on why).
   */
  async listEngagements(playerId: string): Promise<EngagementView[]> {
    const rows = await this.repo.listEngagementsForPlayer(playerId);
    return rows.map((row) => ({
      engagement_id: row.id,
      target_rival_key: row.target_rival_key,
      target_rival_name_i18n: rivalNameRef(row.target_rival_key),
      status: row.outcome_bucket === null ? 'scheduled' : 'resolved',
      outcome_bucket:
        row.outcome_bucket !== null && isCombatOutcomeBucket(row.outcome_bucket)
          ? row.outcome_bucket
          : null,
      friction_consumed_bucket: row.friction_consumed_bucket,
      heat_increment_bucket: row.heat_increment_bucket,
    }));
  }
}
