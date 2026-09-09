// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d2-impl-plan.md Task R7a + Task R7b
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.4 (:150-168, :170)
//             docs/tech/04a_operational_systems/lieutenant_role_mapping.md §Couple `Hidden Curriculum`
//             docs/superpowers/specs/2026-06-16-depth-d2-reputation-chapter-design.md §1.4, §9
//             docs/tech/09_data_model/schema_reputation_state.md §2 Table 4 (R9.3 backport — same-commit)
//             — D2 R7a — 2026-06-17; D2 R7b — 2026-06-17
//
// `HiddenCurriculumService` — BUILD GREENFIELD at its 04a ch14 primary-owner location.
//
// DD-HC-GREENFIELD: This service is built from scratch by D2 R7a. The canon reference
// docs/tech/04c_market_reputation_insurance/reputation_mechanics.md:182 states "REUSE from 04a
// chunk 14" — but no HiddenCurriculumService existed in code at R7a start (confirmed by R0 grep,
// EXIT 1). D2 builds it greenfield in the 04a ch14 ownership location (this file). The 04c spec
// CONSUMES this service as primary-owner and documents its data model + downstream effects;
// 04a ch14 is the primary code location.
//
// Canon signatures (:246-249):
//   readNormsVector(lieutenantId)                    — read the 8 norm flags for a lieutenant.
//   setNormsFlags(lieutenantId, playerId, flags)     — upsert the norms_flags (for test seeding + R10/R11).
//   appendWitnessedEvent(lieutenantId, playerId, eventType) — append a 2-bit event to the FIFO ring.
//   runWeeklyReviewTick(ctx, weekId)                 — for each flag, flip ON/OFF/unchanged per canon ratio.
//
// Witnessed-event type → norm-exhibition mapping (designed for R7a; grounded in the 8 norm names):
//
//   The 8 norms are: punctuality, silence_at_handoffs, debt_handling, escalation_reflex,
//                    fairness_to_subordinates, discretion_around_civilians, restraint_with_force,
//                    ledger_hygiene.
//   Four event types (2-bit, 0-3) each exhibit a pair of related norms:
//
//   event_type 0 (0b00): exhibits `punctuality` + `ledger_hygiene`
//     Rationale: events where the lieutenant is observed being on-time at a handoff AND keeping
//     clean accounts together (both reveal disciplined house habits).
//
//   event_type 1 (0b01): exhibits `silence_at_handoffs` + `debt_handling`
//     Rationale: events where the lieutenant avoids verbose communication during transit AND
//     settles debts promptly (both reveal quiet, transactional professionalism).
//
//   event_type 2 (0b10): exhibits `escalation_reflex` + `fairness_to_subordinates`
//     Rationale: events where the lieutenant surfaces issues to the boss appropriately AND
//     distributes work/pay fairly to their own crew (both reveal leadership calibration).
//
//   event_type 3 (0b11): exhibits `discretion_around_civilians` + `restraint_with_force`
//     Rationale: events where the lieutenant avoids civilian contact escalation AND
//     restrains the use of force when not strictly necessary (both reveal professional restraint).
//
//   This mapping is FIXED (not tuneable). Each event exhibits exactly 2 of the 8 norms (2/8 = 25%).
//   With 16 events (default buffer): each norm can receive 0-8 exhibitions from 4 event types per norm.
//   To flip ON (>60%): need >9.6 events exhibiting the norm → at least 10 out of 16.
//   To flip OFF (<30%): need <4.8 events → at most 4 out of 16.
//
// Weekly review tick logic (canon :162-168):
//   For each of the 8 norm flags:
//     events_exhibiting_norm = count(ring events whose event_type exhibits this norm)
//     events_total           = ring.length (total events in the ring)
//     if events_total === 0: flag unchanged (zero-regression — empty ring → no flip)
//     ratio = events_exhibiting_norm / events_total
//     if ratio > flip_on_threshold  → flag ← ON
//     if ratio < flip_off_threshold → flag ← OFF
//     otherwise                     → flag unchanged (mid-range)
//
// Idempotence: last_review_week guard on each row (per-lieutenant). Skip if this week already ran.
//
// DD-REG-NAME (registry-wins — no inline 0.60/0.30/16 anywhere in this file):
//   flip_on:  `curriculum_flip_on_threshold`     via reputationTunables.curriculumFlipOnThreshold.
//   flip_off: `curriculum_flip_off_threshold`    via reputationTunables.curriculumFlipOffThreshold.
//   buffer:   `curriculum_witnessed_event_buffer` via reputationTunables.curriculumWitnessedEventBuffer.
//   window:   `curriculum_observation_window_days` via reputationTunables.curriculumObservationWindowDays.
//
// R2.2 / P5:
//   - norms_flags + witnessed_event_ring are SERVER-ONLY (never forwarded to a real client).
//   - Client surface: uniform tells (portrait — R7b). `projectUniformTells()` below.
//   - The raw NormsFlags vector NEVER leaves this service to a client; only UniformTellProjection does.
//
// R7b Uniform-Tell Projection (canon :170 — §3.4 Player surface):
//   4 flags map to visible uniform tells (the others are downstream-effect hooks only):
//     collar  → ledger_hygiene              (collar buttoned / collar open)
//     sleeves → fairness_to_subordinates    (sleeves rolled / sleeves down)
//     watch   → punctuality                 (watch visible / watch hidden)
//     gloves  → discretion_around_civilians (gloves clean / gloves dirty)
//
//   The 4 non-tell flags (downstream-effect hooks — no portrait tell):
//     silence_at_handoffs, debt_handling, escalation_reflex, restraint_with_force.
//
//   Neutral enum values (flag = false or row absent): 'open', 'down', 'hidden', 'dirty'.
//   Active enum values (flag = true):                 'buttoned', 'rolled', 'visible', 'clean'.
//
//   `projectUniformTells(lieutenantId)` — returns UniformTellProjection (4 presentation enums) or null.
//   NEVER returns the raw flag vector. NEVER includes any raw NormsFlags key in the response.
//
// Zero-regression invariants:
//   - A lieutenant with an EMPTY witnessed ring has no flags flipped (ratio = 0/0 → skip, no flip).
//   - A world with no hidden_curriculum_norms_vector rows is unaffected by the weekly tick.
//   - Tick is idempotent per week (keyed on last_review_week — re-running for the same week is a no-op).
//
// R9.3: matches schema in docs/tech/09_data_model/schema_reputation_state.md §2 Table 4
//       (hidden_curriculum_norms_vector including migration 0055 last_review_week additive ALTER).

import { Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { hiddenCurriculumNormsVector } from '../../db/schema/reputation_state';
import { reputationTunables } from './reputation-tunables';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';

// ── Norm names (8 canonical norm flags from :151-159) ────────────────────────────────────────────

/** The 8 canonical norm flag names in the hidden_curriculum_norms_vector. */
export type NormName =
  | 'punctuality'
  | 'silence_at_handoffs'
  | 'debt_handling'
  | 'escalation_reflex'
  | 'fairness_to_subordinates'
  | 'discretion_around_civilians'
  | 'restraint_with_force'
  | 'ledger_hygiene';

/** All 8 canonical norms, ordered consistently (matches gdd/14 + :151-159). */
const ALL_NORMS: NormName[] = [
  'punctuality',
  'silence_at_handoffs',
  'debt_handling',
  'escalation_reflex',
  'fairness_to_subordinates',
  'discretion_around_civilians',
  'restraint_with_force',
  'ledger_hygiene',
];

/** The JSONB shape for norms_flags — 8 boolean keys, all false by default. */
export interface NormsFlags {
  punctuality:              boolean;
  silence_at_handoffs:      boolean;
  debt_handling:            boolean;
  escalation_reflex:        boolean;
  fairness_to_subordinates: boolean;
  discretion_around_civilians: boolean;
  restraint_with_force:     boolean;
  ledger_hygiene:           boolean;
}

/** Default norms flags — all false (neutral, zero-regression invariant). */
const DEFAULT_NORMS_FLAGS: NormsFlags = {
  punctuality:              false,
  silence_at_handoffs:      false,
  debt_handling:            false,
  escalation_reflex:        false,
  fairness_to_subordinates: false,
  discretion_around_civilians: false,
  restraint_with_force:     false,
  ledger_hygiene:           false,
};

/** A single witnessed event in the ring buffer. */
export interface WitnessedEvent {
  /** 2-bit type code (0-3). Maps to the norms this event exhibits. */
  event_type: number;
}

// ── R7b: Uniform-tell projection types (canon :170) ──────────────────────────────────────────────
//
// The uniform-tell is a PRESENTATION ENUM derived from 4 of the 8 norm flags.
// The other 4 flags (silence_at_handoffs, debt_handling, escalation_reflex, restraint_with_force)
// are downstream-effect hooks — they have no portrait tell.
//
// R2.2 invariant: UniformTellProjection NEVER exposes any raw NormsFlags key.
// The projection is the ONLY form in which norm information reaches a client route.

/** Collar tell: derived from `ledger_hygiene` flag (canon :170). */
export type CollarTell = 'buttoned' | 'open';

/** Sleeves tell: derived from `fairness_to_subordinates` flag (canon :170). */
export type SleevesTell = 'rolled' | 'down';

/** Watch tell: derived from `punctuality` flag (canon :170). */
export type WatchTell = 'visible' | 'hidden';

/** Gloves tell: derived from `discretion_around_civilians` flag (canon :170). */
export type GlovesTell = 'clean' | 'dirty';

/**
 * R2.2-compliant client projection of the hidden curriculum norms.
 *
 * Contains ONLY presentation enums (4 uniform tells).
 * NEVER includes raw NormsFlags keys.
 * Returned by `HiddenCurriculumService.projectUniformTells()`.
 *
 * Canon :170: collar buttoned = ledger_hygiene, sleeves rolled = fairness_to_subordinates,
 *             watch visible = punctuality, gloves clean = discretion_around_civilians.
 *
 * Neutral (flag = false or row absent):
 *   collar = 'open', sleeves = 'down', watch = 'hidden', gloves = 'dirty'.
 * Active (flag = true):
 *   collar = 'buttoned', sleeves = 'rolled', watch = 'visible', gloves = 'clean'.
 */
export interface UniformTellProjection {
  collar:  CollarTell;
  sleeves: SleevesTell;
  watch:   WatchTell;
  gloves:  GlovesTell;
}

/** Neutral tells returned when the row is absent or all flags are false. */
const NEUTRAL_TELLS: UniformTellProjection = {
  collar:  'open',
  sleeves: 'down',
  watch:   'hidden',
  gloves:  'dirty',
} as const;

// ── Event-type → norms-exhibited mapping ─────────────────────────────────────────────────────────
//
// Each event type (0-3) exhibits exactly 2 of the 8 norms (see DD-HC-GREENFIELD comments above).
// This mapping is FIXED (not tunable) — part of the data model definition.
//
// REVIEWER FLAG [HC_EVENT_TYPE_MAPPING]: this mapping is a D2 design decision for the greenfield
// service. Each type covers exactly 2 norms, chosen by thematic affinity:
//   0 → punctuality + ledger_hygiene    (disciplined house habits)
//   1 → silence_at_handoffs + debt_handling (quiet transactional professionalism)
//   2 → escalation_reflex + fairness_to_subordinates (leadership calibration)
//   3 → discretion_around_civilians + restraint_with_force (professional restraint)

const EVENT_TYPE_TO_NORMS: Readonly<Record<number, ReadonlyArray<NormName>>> = {
  0: ['punctuality', 'ledger_hygiene'],
  1: ['silence_at_handoffs', 'debt_handling'],
  2: ['escalation_reflex', 'fairness_to_subordinates'],
  3: ['discretion_around_civilians', 'restraint_with_force'],
} as const;

// ── Service ──────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class HiddenCurriculumService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
  ) {}

  /**
   * `readNormsVector(lieutenantId, playerId)` — read the full per-lieutenant norms vector.
   *
   * Returns the row (norms_flags + witnessed_event_ring + ring_head + last_review_week)
   * or null if no row exists for this lieutenant.
   *
   * R2.2: server-only — only exposed via TEST-ONLY routes (never forwarded to a real client).
   *
   * W6a C4 (P-A, finding #17) — `playerId` is now a required SECOND argument, and the read is
   * joint (`lieutenant_id = ? AND player_id = ?`, single round-trip). A row belonging to a
   * DIFFERENT player yields the SAME pre-existing `null` return this method already used for
   * "no norms row yet" — byte-identical for both cases (D2), and zero behavior change for the
   * null-coalescing callers below (`projectUniformTells`'s `?? NEUTRAL_TELLS`,
   * `reputation-hub.service.ts`'s `?? {defaults}`) — see `BossMirrorService.getRing`'s docblock
   * for the full "why null, not a throw" reasoning (same file-family convention). Pre-fix,
   * `readNormsVector(lieutenantId)` leaked `norms_flags` + `witnessed_event_ring` — SERVER-ONLY
   * (R2.2/P5) — of a rival's lieutenant to any caller naming that `lieutenantId`.
   *
   * @param lieutenantId — the lieutenant whose norms vector to read.
   * @param playerId     — the caller's player uuid. Must be the ACTUAL owner of `lieutenantId`.
   */
  async readNormsVector(lieutenantId: string, playerId: string): Promise<{
    lieutenant_id:       string;
    player_id:           string;
    norms_flags:         NormsFlags;
    witnessed_event_ring: WitnessedEvent[];
    ring_head:           number;
    last_review_week:    number | null;
  } | null> {
    const [row] = await this.db
      .select()
      .from(hiddenCurriculumNormsVector)
      .where(and(eq(hiddenCurriculumNormsVector.lieutenant_id, lieutenantId), eq(hiddenCurriculumNormsVector.player_id, playerId)))
      .limit(1);

    if (!row) return null;

    return {
      lieutenant_id:       row.lieutenant_id,
      player_id:           row.player_id,
      norms_flags:         row.norms_flags as NormsFlags,
      witnessed_event_ring: row.witnessed_event_ring as WitnessedEvent[],
      ring_head:           row.ring_head,
      last_review_week:    row.last_review_week ?? null,
    };
  }

  /**
   * `projectUniformTells(lieutenantId, playerId)` — R2.2-compliant client projection.
   *
   * Reads the norms vector for the given lieutenant and returns the 4 uniform-tell
   * presentation enums (collar/sleeves/watch/gloves) derived from the 4 canon-mapped flags.
   *
   * Returns `null` if no row exists for this lieutenant (caller decides how to handle absent state;
   * test routes return NEUTRAL_TELLS so the spec can assert neutral-on-absent without 404).
   *
   * W6a C4 (finding #17 cascade) — `playerId` threaded through to the now-scoped `readNormsVector`
   * (design §2.1 #17: "`projectUniformTells` `:296` en dépend ⇒ même fuite par un 2ᵉ chemin").
   *
   * R2.2 invariant: NEVER includes any raw NormsFlags key in the returned object.
   *   The 4 non-tell flags (silence_at_handoffs, debt_handling, escalation_reflex,
   *   restraint_with_force) are downstream-effect hooks — they do NOT appear in this response.
   *
   * Flag → tell enum mapping (canon :170):
   *   collar  ← ledger_hygiene              (true → 'buttoned', false → 'open')
   *   sleeves ← fairness_to_subordinates    (true → 'rolled',   false → 'down')
   *   watch   ← punctuality                 (true → 'visible',  false → 'hidden')
   *   gloves  ← discretion_around_civilians (true → 'clean',    false → 'dirty')
   *
   * NEW tunables: NONE — uniform-tells are a closed qualitative presentation domain
   *   (not sim-balance tunables). Canon :170 defines the mapping as fixed.
   */
  async projectUniformTells(lieutenantId: string, playerId: string): Promise<UniformTellProjection | null> {
    const row = await this.readNormsVector(lieutenantId, playerId);

    if (!row) return null;

    const flags = row.norms_flags;

    // Project: 4 flags → 4 presentation enums.
    // The 4 non-tell flags are intentionally NOT included (R2.2 invariant).
    const projection: UniformTellProjection = {
      collar:  flags.ledger_hygiene              ? 'buttoned' : 'open',
      sleeves: flags.fairness_to_subordinates    ? 'rolled'   : 'down',
      watch:   flags.punctuality                 ? 'visible'  : 'hidden',
      gloves:  flags.discretion_around_civilians ? 'clean'    : 'dirty',
    };

    return projection;
  }

  /**
   * `setNormsFlags(lieutenantId, playerId, flags)` — upsert (create or overwrite) the norms_flags.
   *
   * On INSERT (first call for this lieutenant): creates the row with the provided flags + empty ring.
   * On UPDATE (row exists): overwrites norms_flags only (ring + ring_head untouched unless row is new).
   *
   * Used by:
   *   - TEST-ONLY routes (seeding pre-conditions for E2E specs).
   *   - R10 recruitment poll + R11 cross-mechanic divergence (future — set flags from downstream).
   *
   * R2.2: norms_flags is server-only (never forwarded to real client).
   */
  async setNormsFlags(
    lieutenantId: string,
    playerId: string,
    flags: Partial<NormsFlags>,
  ): Promise<void> {
    // Build the merged flags object — any key not provided falls back to the current row (or default).
    // Read the existing row first to preserve keys not in `flags`.
    // W6a C4: mechanical adaptation forced by `readNormsVector`'s new signature — `playerId` is
    // already this method's own second argument (the row this UPSERT targets is always the
    // CALLER's own lieutenant), so this is not itself a correctness change.
    const existing = await this.readNormsVector(lieutenantId, playerId);

    const currentFlags: NormsFlags = existing?.norms_flags ?? { ...DEFAULT_NORMS_FLAGS };
    const mergedFlags: NormsFlags = { ...currentFlags, ...flags };

    if (!existing) {
      // Insert fresh row
      await this.db
        .insert(hiddenCurriculumNormsVector)
        .values({
          lieutenant_id:       lieutenantId,
          player_id:           playerId,
          norms_flags:         mergedFlags,
          witnessed_event_ring: [],
          ring_head:           0,
        });
    } else {
      // Update norms_flags only
      await this.db
        .update(hiddenCurriculumNormsVector)
        .set({
          norms_flags: mergedFlags,
          updated_at:  new Date(),
        })
        .where(eq(hiddenCurriculumNormsVector.lieutenant_id, lieutenantId));
    }
  }

  /**
   * `appendWitnessedEvent(lieutenantId, playerId, eventType)` — append a witnessed event to the FIFO ring.
   *
   * event_type must be 0-3 (2-bit type code). Each type maps to 2 of the 8 norms
   * (see EVENT_TYPE_TO_NORMS mapping above).
   *
   * Ring is FIFO (evict oldest when full). Buffer size from `curriculum_witnessed_event_buffer`
   * (registry, default 16). No inline 16 — DD-REG-NAME.
   *
   * On first call (no row exists): creates the row with default flags + 1-event ring.
   *
   * R2.2: witnessed_event_ring is server-only (never forwarded to real client).
   * Canon :160: "last 16 events as 2-bit type codes".
   */
  async appendWitnessedEvent(
    lieutenantId: string,
    playerId: string,
    eventType: number,
  ): Promise<{ ringLength: number }> {
    // Buffer size from registry — no inline (DD-REG-NAME)
    const bufferSize = reputationTunables.curriculumWitnessedEventBuffer;

    const [row] = await this.db
      .select()
      .from(hiddenCurriculumNormsVector)
      .where(eq(hiddenCurriculumNormsVector.lieutenant_id, lieutenantId))
      .limit(1);

    const newEvent: WitnessedEvent = { event_type: eventType };

    if (!row) {
      // First event for this lieutenant — create the row
      await this.db
        .insert(hiddenCurriculumNormsVector)
        .values({
          lieutenant_id:       lieutenantId,
          player_id:           playerId,
          norms_flags:         { ...DEFAULT_NORMS_FLAGS },
          witnessed_event_ring: [newEvent],
          ring_head:           1 % bufferSize,
        });
      return { ringLength: 1 };
    }

    const ring = row.witnessed_event_ring as WitnessedEvent[];
    let updatedRing: WitnessedEvent[];
    let newHead: number;

    if (ring.length < bufferSize) {
      // Ring not yet full — append
      updatedRing = [...ring, newEvent];
      newHead = updatedRing.length % bufferSize;
    } else {
      // Ring full — overwrite oldest slot at ring_head (FIFO eviction)
      const head = row.ring_head as number;
      updatedRing = [...ring];
      updatedRing[head] = newEvent;
      newHead = (head + 1) % bufferSize;
    }

    await this.db
      .update(hiddenCurriculumNormsVector)
      .set({
        witnessed_event_ring: updatedRing,
        ring_head:            newHead,
        updated_at:           new Date(),
      })
      .where(eq(hiddenCurriculumNormsVector.lieutenant_id, lieutenantId));

    return { ringLength: updatedRing.length };
  }

  /**
   * `runWeeklyReviewTick(ctx, weekId)` — weekly review: flip norm flags per ratio.
   *
   * For each lieutenant row in the player's scope:
   *   1. Idempotence check: skip if last_review_week === weekId.
   *   2. For each of the 8 norm flags:
   *      events_exhibiting_norm = count(ring events whose event_type exhibits this norm)
   *      events_total           = ring.length
   *      if events_total === 0: flag unchanged (empty ring → zero-regression)
   *      ratio = events_exhibiting_norm / events_total
   *      if ratio > flip_on_threshold:  flag ← ON
   *      if ratio < flip_off_threshold: flag ← OFF
   *      otherwise:                     flag unchanged (mid-range)
   *   3. Persist updated norms_flags + last_review_week.
   *
   * Thresholds from registry — no inline (DD-REG-NAME):
   *   flip_on  = `curriculum_flip_on_threshold`  (default 0.60)
   *   flip_off = `curriculum_flip_off_threshold` (default 0.30)
   *
   * Zero-regression: a lieutenant with an empty ring has all flags unchanged.
   * Idempotent: re-running for the same weekId is a no-op (last_review_week guard).
   * Organically a no-op for players with no hidden_curriculum_norms_vector rows.
   *
   * R2.2: norms_flags is server-only (never forwarded to a real client).
   * Canon :162-168.
   */
  async runWeeklyReviewTick(ctx: CitySimTickContext, weekId: number): Promise<void> {
    const { playerId } = ctx;

    // Read thresholds from registry once per tick — no inline (DD-REG-NAME).
    const flipOn  = reputationTunables.curriculumFlipOnThreshold;
    const flipOff = reputationTunables.curriculumFlipOffThreshold;

    // Fetch all rows for this player
    const rows = await this.db
      .select()
      .from(hiddenCurriculumNormsVector)
      .where(eq(hiddenCurriculumNormsVector.player_id, playerId));

    for (const row of rows) {
      // Idempotence guard: skip if this week's tick already ran for this lieutenant.
      if (row.last_review_week === weekId) continue;

      const ring  = row.witnessed_event_ring as WitnessedEvent[];
      const flags = { ...(row.norms_flags as NormsFlags) };

      const eventsTotal = ring.length;

      for (const norm of ALL_NORMS) {
        if (eventsTotal === 0) {
          // Empty ring: no flip (zero-regression invariant).
          continue;
        }

        // Count events that exhibit this norm
        let exhibiting = 0;
        for (const event of ring) {
          const exhibitedNorms = EVENT_TYPE_TO_NORMS[event.event_type];
          if (exhibitedNorms && exhibitedNorms.includes(norm)) {
            exhibiting++;
          }
        }

        const ratio = exhibiting / eventsTotal;

        if (ratio > flipOn) {
          flags[norm] = true;   // flip ON
        } else if (ratio < flipOff) {
          flags[norm] = false;  // flip OFF
        }
        // otherwise: mid-range → flag unchanged
      }

      await this.db
        .update(hiddenCurriculumNormsVector)
        .set({
          norms_flags:      flags,
          last_review_week: weekId,
          updated_at:       new Date(),
        })
        .where(eq(hiddenCurriculumNormsVector.lieutenant_id, row.lieutenant_id));
    }
  }
}
