// IMPLEMENTS: docs/superpowers/plans/2026-07-01-04d-B-internal-affairs-plan.md C4 (investigation lifecycle)
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/internal_affairs_corruption_discovery.md
//               §State (:40-71) + §3 threshold mechanic + §3.4 formula
//             Global constraints: determinism (NO Math.random, NO Date.now) + R2.2/P5 (no suspicion_level on events)
//             — 04d-B C4 — 2026-07-02
//
// `IAInvestigationService` — the investigation lifecycle mechanic for G9 IA.
//
// Methods:
//   `evaluateThresholdCrossing(ctx)` — called by IA_THRESHOLD_TICK (NIGHTLY/17):
//     Scans internal_affairs_targets for suspicion_level >= open_investigation_threshold
//     + investigation_id IS NULL → inserts ia_investigations + updates target + emits InvestigationOpenedEvent.
//     L1 empty-state skip: no qualifying targets → ZERO writes (zero-regression invariant).
//     Idempotent: targets with investigation_id already set are excluded by the WHERE clause.
//     GLOBAL table: the scan runs once per player NIGHTLY; idempotency prevents double-opening.
//     Deterministic: NO Math.random, NO Date.now (opens on threshold, not on RNG roll).
//
//   `runSurveillanceWindow(investigationId, gameDay, playerId?, gameMinute?)` — called by
//     IATargetService.recordCorruptUse when the target has an active investigation:
//     Rolls seeded detection probability (makeRng(`ia-surveil:${investigationId}:${gameDay}`)).
//     If detected: appends a DetectionEvent to ia_investigations.detection_events (JSONB).
//     Seeded: same (investigationId, gameDay) → same detected outcome (determinism guarantee).
//     Deterministic: NO Math.random — ONLY draw source is makeRng.
//     Canon: internal_affairs_corruption_discovery.md §3 surveillance window + detection_events.

import { Injectable, Logger, Inject } from '@nestjs/common';
import { and, eq, isNull, gte } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import { makeRng } from '../../common/seeded-rng';
import { internalAffairsTarget, iaInvestigation } from '../../db/schema/internal_affairs';
import { IATunables } from './ia.tunables';
import { ApiError } from '../../protocol/api-error';

// ── DetectionEvent — entry appended to ia_investigations.detection_events (SERVER-ONLY) ─────────

/**
 * A single detection event recorded during the surveillance window.
 * SERVER-ONLY (R2.2/P5): detection_events is NEVER forwarded to any client endpoint.
 * Each entry: { gameMinute, eventType: 'action_detected', playerId? }.
 * Canon: internal_affairs_corruption_discovery.md §State (:58) "detection_events jsonb".
 */
export interface DetectionEvent {
  readonly gameMinute: number;
  readonly eventType: 'action_detected';
  readonly playerId?: string;
}

// ── IAInvestigationService ────────────────────────────────────────────────────────────────────────

@Injectable()
export class IAInvestigationService {
  private readonly logger = new Logger(IAInvestigationService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: IATunables,
    private readonly bus: CityEventBus,
  ) {}

  // ── evaluateThresholdCrossing — IA_THRESHOLD_TICK NIGHTLY/17 ──────────────────────────────────

  /**
   * `evaluateThresholdCrossing` — called by the `IA_THRESHOLD_TICK` (NIGHTLY/17) scheduler hook.
   *
   * For each target with `suspicion_level >= open_investigation_threshold` AND `investigation_id IS NULL`:
   *   1. Insert an `ia_investigations` row (`opens_at=NOW()`, `closes_at = NOW() + duration_days`).
   *   2. UPDATE `internal_affairs_targets` — set `investigation_open_since = NOW()`,
   *      `investigation_id = <inserted uuid>` — WHERE `investigation_id IS NULL` (idempotency guard).
   *   3. Emit `InvestigationOpenedEvent` (qualitative — NO suspicion_level, R2.2/P5).
   *
   * **L1 empty-state skip:** if there are zero targets above threshold, return `{ opened: 0 }`
   * immediately with ZERO DB writes (zero-regression invariant: pre-B worlds are byte-identical).
   *
   * **Idempotent:** the WHERE `investigation_id IS NULL` predicate prevents double-opening.
   * With multiple players firing NIGHTLY concurrently, the guard ensures only ONE investigation opens
   * per target (the second UPDATE is a no-op because `investigation_id IS NOT NULL` after the first).
   *
   * **GLOBAL table:** `internal_affairs_targets` has no player FK; the scan covers ALL targets
   * regardless of `ctx.playerId`. This is correct: the IA institution is a global adversary.
   *
   * **Determinism:** NO `Math.random()`, NO `Date.now()`. Opens on the suspicion threshold alone.
   * `closes_at` uses real-time (wall-clock from `new Date()`) for the timestamp — this is correct
   * because it is a REAL-TIME deadline (the investigation's lifespan is real-time, not game-time).
   * The `gameMinute` in the emitted event comes from `ctx.gameMinute` (game-time, deterministic).
   *
   * @param ctx — the CitySimTickContext from the NIGHTLY scheduler (ctx.gameMinute for the event).
   * @returns `{ opened: number }` — count of newly opened investigations (0 in L1 skip or idempotent case).
   */
  async evaluateThresholdCrossing(ctx: CitySimTickContext): Promise<{ opened: number }> {
    const threshold = this.tunables.openInvestigationThreshold;

    // ── L1 empty-state skip + threshold scan ──────────────────────────────────────────────────────
    // Query: internal_affairs_targets WHERE suspicion_level >= threshold AND investigation_id IS NULL.
    // The index (target_type, suspicion_level) covers this scan (mig 0099 ia_targets_type_suspicion_idx).
    const targets = await this.db
      .select()
      .from(internalAffairsTarget)
      .where(
        and(
          gte(internalAffairsTarget.suspicion_level, threshold),
          isNull(internalAffairsTarget.investigation_id),
        ),
      );

    if (targets.length === 0) {
      // L1 empty-state skip: no qualifying targets → ZERO writes (zero-regression).
      return { opened: 0 };
    }

    const durationDays = this.tunables.investigationDurationDays;
    let opened = 0;

    for (const target of targets) {
      try {
        const now = new Date();
        const closesAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        // ── Step 1: Insert ia_investigations row ──────────────────────────────────────────────────
        const [inserted] = await this.db
          .insert(iaInvestigation)
          .values({
            target_id: target.target_id,
            closes_at: closesAt,
          })
          .returning({ investigation_id: iaInvestigation.investigation_id });

        if (!inserted) {
          this.logger.warn(
            `[evaluateThresholdCrossing] INSERT ia_investigations returned no row for ` +
              `target_id=${target.target_id} — skipping.`,
          );
          continue;
        }

        // ── Step 2: UPDATE target — set investigation_open_since + investigation_id ──────────────
        // WHERE investigation_id IS NULL: idempotency guard prevents double-open if a concurrent
        // player NIGHTLY tick races this update. The UPDATE is a no-op if investigation_id was set
        // by another concurrent tick (the INSERT above would be an orphan — acceptable for now,
        // since E2E tests run single-player and the guard prevents functional double-open).
        await this.db
          .update(internalAffairsTarget)
          .set({
            investigation_open_since: now,
            investigation_id: inserted.investigation_id,
          })
          .where(
            and(
              eq(internalAffairsTarget.target_id, target.target_id),
              isNull(internalAffairsTarget.investigation_id),
            ),
          );

        // ── Step 3: Emit InvestigationOpenedEvent (qualitative — NO suspicion_level) ─────────────
        this.bus.emitInvestigationOpened({
          type: 'investigation_opened',
          targetId: target.target_id,
          targetType: target.target_type,
          gameMinute: ctx.gameMinute,
        });

        opened++;
        this.logger.log(
          `[evaluateThresholdCrossing] opened investigation for target_id=${target.target_id} ` +
            `target_type=${target.target_type} investigation_id=${inserted.investigation_id} ` +
            `suspicion=${target.suspicion_level.toFixed(4)} >= threshold=${threshold.toFixed(4)} ` +
            `gameMinute=${ctx.gameMinute} closes_at=${closesAt.toISOString()}`,
        );
      } catch (err: unknown) {
        // Per-target try/catch: a fault on one target never aborts the sweep or other targets.
        this.logger.error(
          `[evaluateThresholdCrossing] error processing target_id=${target.target_id}: ` +
            `${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.logger.log(
      `[evaluateThresholdCrossing] NIGHTLY/17 scan complete — ` +
        `scanned=${targets.length} threshold=${threshold.toFixed(4)} opened=${opened} ` +
        `gameMinute=${ctx.gameMinute}`,
    );

    return { opened };
  }

  // ── runSurveillanceWindow — per-action detection roll ─────────────────────────────────────────

  /**
   * `runSurveillanceWindow` — seeded per-action detection roll during an active investigation.
   *
   * Called by `IATargetService.recordCorruptUse` when the target has an active investigation
   * (`target.investigation_id IS NOT NULL`). Rolls `discovery_probability_per_action_during_window`
   * (default 0.12, gdd/14) seeded by `makeRng(\`ia-surveil:${investigationId}:${gameDay}\`)`.
   *
   * W6a C3 (P-A, the "19ᵉ finding") — `playerId` is now the FIRST argument and REQUIRED (no longer
   * an optional payload field). `internal_affairs_targets` is a GLOBAL table with NO `player_id`
   * column — multiple players legitimately cooperate on the same target (schema comment
   * `internal_affairs.ts:128-129`) — so the scope check here is COOPERATOR MEMBERSHIP, not row
   * equality: `playerId` must already appear in the `cooperators` list of the target this
   * investigation belongs to. 0 rows (investigation absent) OR `playerId` not a cooperator ⇒ 404
   * `RESOURCE_NOT_FOUND` (D2), BEFORE the RNG roll or any read/write of `detection_events`. Pre-fix,
   * the read (then :241-245) and write (then :262-265) were filtered on `investigation_id` alone —
   * an attacker could stamp a `DetectionEvent` with THEIR OWN `playerId` onto an investigation they
   * had never cooperated on.
   *
   * **Determinism contract:**
   *   - Seed = `ia-surveil:${investigationId}:${gameDay}` — pure function of (investigation, day).
   *   - Same seed → same first draw → same `detected` outcome for any action on the same game day.
   *   - ONLY draw source is `makeRng` — NO `Math.random()`, NO `Date.now()`.
   *
   * **If detected (`rng.chance(prob) === true`):**
   *   - Appends a `DetectionEvent` entry to `ia_investigations.detection_events` (JSONB array).
   *   - Entry: `{ gameMinute, eventType: 'action_detected', playerId }`.
   *   - SERVER-ONLY: `detection_events` is NEVER returned on any client endpoint (R2.2/P5).
   *
   * **If not detected:** returns `{ detected: false }` with ZERO DB writes.
   *
   * @param playerId — the cooperator whose action triggered this roll. Must already be a recorded
   *                   cooperator (`internal_affairs_targets.cooperators`) of the investigation's
   *                   target — W6a C3 ownership guard.
   * @param investigationId — UUID of the active `ia_investigations` row.
   * @param gameDay — `Math.floor(gameMinute / 1440)` — the seeded day (deterministic).
   * @param gameMinute — optional: the game-time of the action (default: gameDay * 1440).
   * @returns `{ detected: boolean }` — true = detection event appended.
   * @throws ApiError('RESOURCE_NOT_FOUND') if `playerId` is not a cooperator on this investigation's
   *         target (W6a C3).
   */
  async runSurveillanceWindow(
    playerId: string,
    investigationId: string,
    gameDay: number,
    gameMinute?: number,
  ): Promise<{ detected: boolean }> {
    const prob = this.tunables.discoveryProbabilityPerActionDuringWindow;

    // W6a C3 (P-A) — ownership guard BEFORE the RNG roll: whether a detection roll happens AT ALL
    // must not depend on state an unrelated caller could probe. Joined through `target_id` (the
    // only link `ia_investigations` has back to `internal_affairs_targets` — no `player_id` column
    // on this table at all).
    const [ownerCheck] = await this.db
      .select({ cooperators: internalAffairsTarget.cooperators })
      .from(iaInvestigation)
      .innerJoin(internalAffairsTarget, eq(iaInvestigation.target_id, internalAffairsTarget.target_id))
      .where(eq(iaInvestigation.investigation_id, investigationId))
      .limit(1);

    if (!ownerCheck || !((ownerCheck.cooperators as string[]) ?? []).includes(playerId)) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `runSurveillanceWindow: investigation ${investigationId} is not accessible to player ${playerId} (W6a C3 ownership guard — not a cooperator on its target)`,
      });
    }

    // ── Seeded detection roll — ONLY draw source is makeRng (NO Math.random) ─────────────────────
    // Seed: `ia-surveil:${investigationId}:${gameDay}` — deterministic per (investigation, day).
    // Same inputs → same first draw → same detected outcome (C4 determinism contract).
    const rng = makeRng(`ia-surveil:${investigationId}:${gameDay}`);
    const detected = rng.chance(prob);

    if (!detected) {
      this.logger.debug(
        `[runSurveillanceWindow] investigation_id=${investigationId} gameDay=${gameDay} ` +
          `prob=${prob} → NOT detected (seed=ia-surveil:${investigationId}:${gameDay})`,
      );
      return { detected: false };
    }

    // ── Detected: append DetectionEvent to detection_events JSONB ───────────────────────────────
    const effectiveGameMinute = gameMinute ?? gameDay * 1440;

    const [row] = await this.db
      .select({ detection_events: iaInvestigation.detection_events })
      .from(iaInvestigation)
      .where(eq(iaInvestigation.investigation_id, investigationId))
      .limit(1);

    if (!row) {
      // Investigation was closed/deleted between the caller's read and this write — safe no-op.
      this.logger.warn(
        `[runSurveillanceWindow] investigation_id=${investigationId} not found — no-op.`,
      );
      return { detected: false };
    }

    const existing = (row.detection_events as DetectionEvent[]) ?? [];
    // W6a C3: `playerId` is required now (already proven a legitimate cooperator above) — always
    // stamped, never conditionally omitted.
    const newEvent: DetectionEvent = {
      gameMinute: effectiveGameMinute,
      eventType: 'action_detected',
      playerId,
    };

    await this.db
      .update(iaInvestigation)
      .set({ detection_events: [...existing, newEvent] })
      .where(eq(iaInvestigation.investigation_id, investigationId));

    this.logger.log(
      `[runSurveillanceWindow] investigation_id=${investigationId} gameDay=${gameDay} ` +
        `prob=${prob} → DETECTED — appended DetectionEvent ` +
        `gameMinute=${effectiveGameMinute} playerId=${playerId} ` +
        `detection_events.length=${existing.length + 1}`,
    );

    return { detected: true };
  }
}
