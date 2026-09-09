// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d2-impl-plan.md Task R2a + Task R2b + Task R11
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.1 (:44-75)
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.1 (:53-59,:65) [R2b weekly tick]
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md :180 [R11 divergence observable]
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md :246 (canon signatures)
//             docs/superpowers/specs/2026-06-16-depth-d2-reputation-chapter-design.md §1.1, §1.4
//             — D2 R2a — 2026-06-17; D2 R2b — 2026-06-17; D2 R11 — 2026-06-17
//
// `BossMirrorService` — structural operations (R2a) + weekly tick (R2b) for the Boss Mirror mechanic (§3.1).
//
// Canon signatures (:246):
//   declareRule(playerId, ruleId)        — add a rule to the public declaration ledger.
//   retractRule(playerId, ruleId)        — mark a rule retracted (public observable event).
//   recordViolation(lieutenantId, ruleId, severityBucket) — append a slot to the per-lieutenant ring.
//   runWeeklyTick(ctx)                   — [R2b] recompute violation_density + defection_tolerance per
//                                          lieutenant + consistency_index per player.
//
// R2a scope: structural ops.
// R2b scope: weekly tick + derived scalars (violation_density, defection_tolerance, consistency_index).
//
// DD-REG-NAME (registry-wins):
//   ≤4 cap: `reputation.boss_mirror_max_public_rules` via reputationTunables.bossMirrorMaxPublicRules.
//   Ring size: `reputation.boss_mirror_violation_ring_size` via reputationTunables.bossMirrorViolationRingSize.
//   Recency decay: `reputation.boss_mirror_recency_decay_weekly` via reputationTunables.bossMirrorRecencyDecayWeekly.
//   γ: `reputation.boss_mirror_severity_tolerance_gamma` via reputationTunables.bossMirrorSeverityToleranceGamma.
//   base_tolerance: `reputation.boss_mirror_base_defection_tolerance` via reputationTunables.bossMirrorBaseDefectionTolerance.
//   NO inline numeric literal for any formula coefficient anywhere in this file.
//
// R2.2 / P5:
//   - declared_rules is the PUBLIC observable (:65 "public ledger").
//   - violation_slots is SERVER-SIDE only (per-lieutenant private ring — never forwarded to client).
//   - retraction_history is server-side (influences BPD priors via R3a bridge — not a client scalar).
//   - violation_density, defection_tolerance, consistency_index are SERVER-ONLY derived scalars.
//     The client gets only a posture/band projection (R12b — future). Never in any client shape.
//
// Zero-regression invariants:
//   - A lieutenant with no violations has an empty ring (violation_slots = []).
//   - A player with no declarations has an empty/absent ledger row.
//   - Empty ring → violation_density = 0 → defection_tolerance = base_tolerance EXACTLY.
//   - A world with no Boss Mirror state is unaffected by the weekly tick.
//   - Tick is idempotent per week (keyed on last_tick_week — re-running for the same week is a no-op).
//
// R9.3: matches schema in docs/tech/09_data_model/schema_reputation_state.md §2
//       (bossMirrorDeclarationLedger + bossMirrorViolationRing).

import { Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import {
  bossMirrorDeclarationLedger,
  bossMirrorViolationRing,
} from '../../db/schema/reputation_state';
import { hiddenCurriculumNormsVector } from '../../db/schema/reputation_state';
import { reputationTunables } from './reputation-tunables';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import type { NormsFlags, NormName } from './hidden-curriculum.service';
import { CityEventBus, type RuleViolationEvent } from '../../citysim/events/city-event-bus';
import { ApiError } from '../../protocol/api-error';

// ── R11: Canonical norm names — the 8 norm names that a ruleId can commit to ────────────────────
//
// If a declared ruleId equals one of these norm names, the player has publicly committed to that
// norm. Divergence = committed to the norm but the lieutenant has absorbed it OFF.
// Canon `:180`: "declared rules vs absorbed norms can diverge; divergence itself is observable publicly."
//
// This mapping is FIXED (structural constant — not tunable). The set of valid norm names is closed
// (8 norms defined in the HC schema — see hidden-curriculum.service.ts NormName type).
// ruleId → norm: direct equality (ruleId must exactly match one of the 8 norm names).
//
// R2.2 invariant: the divergence_count scalar is SERVER-ONLY (exposed only via TEST-ONLY routes
// for DB assertion). The public observable is the 'diverging' / 'aligned' / 'indeterminate' cue band.

const CANONICAL_NORM_NAMES: ReadonlySet<string> = new Set<NormName>([
  'punctuality',
  'silence_at_handoffs',
  'debt_handling',
  'escalation_reflex',
  'fairness_to_subordinates',
  'discretion_around_civilians',
  'restraint_with_force',
  'ledger_hygiene',
]);

/** 90-day window in milliseconds for consistency_index computation (:65 "over last 90 days"). */
const CONSISTENCY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

// ── Typed slot shapes (internal only — server-side state, R2.2) ─────────────────────────────────

/** A single declared rule entry in the public ledger. Per-player public observable (:65). */
export interface DeclarationEntry {
  rule_id: string;
  /** Game tick at declaration time. Stored as current epoch ms for E2E determinism. */
  declared_at: number;
}

/** A single retraction event in the retraction history. Server-side — influences BPD priors (:71). */
export interface RetractionEntry {
  rule_id: string;
  /** Game tick at retraction time. */
  retracted_at: number;
}

/** A single violation slot in the per-lieutenant ring. Server-side private (:49-51). */
export interface ViolationSlot {
  rule_id: string;
  severity: number;
}

// ── Result types ─────────────────────────────────────────────────────────────────────────────────

/** Result of declareRule — ok or rejected with reason. */
export type DeclareRuleResult =
  | { ok: true }
  | { ok: false; reason: 'AT_CAP'; cap: number; current: number };

/** Result of retractRule — ok or not_found (rule not in active ledger). */
export type RetractRuleResult =
  | { ok: true }
  | { ok: false; reason: 'NOT_FOUND' };

// ── Service ──────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class BossMirrorService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly bus: CityEventBus,
  ) {}

  /**
   * `declareRule(playerId, ruleId)` — upsert a rule into the public declaration ledger.
   *
   * The ledger accepts up to `boss_mirror_max_public_rules` simultaneous declared rules
   * (read from the registry via reputationTunables.bossMirrorMaxPublicRules — no inline cap).
   *
   * If the player is already at the cap, returns `{ ok: false, reason: 'AT_CAP' }`.
   * If the rule is already in the declared set, this is a no-op (idempotent).
   *
   * Canon: :47 ("publicly commit up to 4 simultaneous operating rules").
   * R2.2: declared_rules IS the public observable (:65) — this is an engagement not a hidden scalar.
   */
  async declareRule(playerId: string, ruleId: string): Promise<DeclareRuleResult> {
    const cap = reputationTunables.bossMirrorMaxPublicRules;
    const now = Date.now();

    // Upsert the ledger row (create if absent, read if present)
    const [row] = await this.db
      .insert(bossMirrorDeclarationLedger)
      .values({
        player_id:          playerId,
        declared_rules:     [],
        retraction_history: [],
      })
      .onConflictDoUpdate({
        target: bossMirrorDeclarationLedger.player_id,
        set:    { updated_at: new Date() },
      })
      .returning();

    if (!row) throw new Error(`BossMirrorService: failed to upsert ledger for player ${playerId}`);

    const declared = row.declared_rules as DeclarationEntry[];

    // Idempotent: already declared
    if (declared.some((e) => e.rule_id === ruleId)) {
      return { ok: true };
    }

    // Cap enforcement: no inline 4 — reads from registry
    if (declared.length >= cap) {
      return { ok: false, reason: 'AT_CAP', cap, current: declared.length };
    }

    // Append the new rule and persist
    const updated: DeclarationEntry[] = [
      ...declared,
      { rule_id: ruleId, declared_at: now },
    ];

    await this.db
      .update(bossMirrorDeclarationLedger)
      .set({
        declared_rules: updated,
        updated_at:     new Date(),
      })
      .where(eq(bossMirrorDeclarationLedger.player_id, playerId));

    return { ok: true };
  }

  /**
   * `retractRule(playerId, ruleId)` — mark a rule retracted in the public ledger.
   *
   * Removes the rule from `declared_rules` and appends a retraction entry to
   * `retraction_history` (server-side — influences BPD priors via R3a bridge :71).
   * The retraction is itself a public observable event (:63 "publicly retracting clears slots
   * referring to that rule but is observable event").
   *
   * If the rule is not in the active ledger, returns `{ ok: false, reason: 'NOT_FOUND' }`.
   *
   * R2.2: retraction_history is server-side (not a client-visible scalar).
   *        The act of retraction IS public — its effect on BPD priors is via R3a bridge.
   */
  async retractRule(playerId: string, ruleId: string): Promise<RetractRuleResult> {
    const now = Date.now();

    // Read the current ledger row
    const [row] = await this.db
      .select()
      .from(bossMirrorDeclarationLedger)
      .where(eq(bossMirrorDeclarationLedger.player_id, playerId))
      .limit(1);

    if (!row) {
      return { ok: false, reason: 'NOT_FOUND' };
    }

    const declared = row.declared_rules as DeclarationEntry[];
    const idx = declared.findIndex((e) => e.rule_id === ruleId);

    if (idx === -1) {
      return { ok: false, reason: 'NOT_FOUND' };
    }

    // Remove from declared_rules
    const updatedDeclared = declared.filter((_, i) => i !== idx);

    // Append retraction to history
    const history = row.retraction_history as RetractionEntry[];
    const updatedHistory: RetractionEntry[] = [
      ...history,
      { rule_id: ruleId, retracted_at: now },
    ];

    await this.db
      .update(bossMirrorDeclarationLedger)
      .set({
        declared_rules:     updatedDeclared,
        retraction_history: updatedHistory,
        updated_at:         new Date(),
      })
      .where(eq(bossMirrorDeclarationLedger.player_id, playerId));

    return { ok: true };
  }

  /**
   * `recordViolation(playerId, lieutenantId, ruleId, severityBucket)` — append a violation slot
   * to the per-lieutenant FIFO ring buffer.
   *
   * The ring holds at most `boss_mirror_violation_ring_size` slots (read from registry via
   * reputationTunables.bossMirrorViolationRingSize — no inline 5). When the ring is full,
   * the oldest slot is evicted (FIFO: ring_head pointer advances mod ring_size).
   *
   * Canon :49-51: "5-slot ring buffer of observed boss-violations, each slot 1 B
   * (rule_id 4 bits + severity 4 bits)."
   * DD-BYTES: realised as JSONB array + integer head pointer (no bit-packing).
   *
   * W6a C3 (P-A) — `playerId` is now the FIRST argument and REQUIRED. Pre-fix, this method took
   * no `playerId` at all: the ring's owner was resolved EITHER from the existing ring row OR (first
   * violation) from a plain `WHERE lieutenant_id = ?` lookup on `lieutenant` — the caller could name
   * ANY lieutenant and land a fabricated violation on it. The fix is a joint read: if a ring row
   * already exists, it must belong to `playerId`; if none exists yet, `lieutenantId` must belong to
   * `playerId` in the `lieutenant` table BEFORE any row is created. 0 rows either way ⇒ 404
   * `RESOURCE_NOT_FOUND` (D2), before any write. This replaces (not supplements) the old
   * "resolve owner from the row" step (design §3/C3: "supprimer la résolution de propriétaire
   * depuis la ligne").
   *
   * R2.2: violation_slots is server-side PRIVATE (per-lieutenant — never forwarded to client).
   * NO violation_density computed here (that is R2b weekly tick).
   *
   * Zero-regression: a lieutenant with no prior recordViolation calls has an empty ring.
   * This method creates the ring row on first call (upsert pattern).
   *
   * W6a C5 (DD-MAGNITUDE-BOUND, design §3/C5): `severityBucket` is clamped to
   * `[reputationTunables.bossMirrorSeverityBucketMin, bossMirrorSeverityBucketMax]` BEFORE it is
   * ever stored in a ring slot or emitted on the bus — the value used downstream is always the
   * BOUNDED value, never the raw caller-supplied one. See `reputation-tunables.ts`'s own
   * ★ DEVIATION note on this pair of getters for why the default ceiling is 100, not the 15 the
   * canon "4 bits" comment 2 lines above would otherwise suggest.
   *
   * @throws ApiError('RESOURCE_NOT_FOUND') if `lieutenantId` is not owned by `playerId` (W6a C3).
   */
  async recordViolation(
    playerId: string,
    lieutenantId: string,
    ruleId: string,
    severityBucket: number,
  ): Promise<void> {
    const ringSize = reputationTunables.bossMirrorViolationRingSize;

    // W6a C5 (DD-MAGNITUDE-BOUND) — clamp BEFORE any read/write. Non-finite (NaN/±Infinity)
    // degrades to the floor rather than propagating. Clamp idiom REUSED from
    // `lek-memory.service.ts:264` (`Math.min(MAX, Math.max(MIN, Math.round(x)))`).
    const severityMin = reputationTunables.bossMirrorSeverityBucketMin;
    const severityMax = reputationTunables.bossMirrorSeverityBucketMax;
    const rawSeverityBucket = Number.isFinite(severityBucket) ? severityBucket : severityMin;
    severityBucket = Math.min(severityMax, Math.max(severityMin, Math.round(rawSeverityBucket)));

    // W6a C3 (P-A) — joint read: the ring row (if any) must already belong to `playerId`.
    const [existing] = await this.db
      .select()
      .from(bossMirrorViolationRing)
      .where(
        and(
          eq(bossMirrorViolationRing.lieutenant_id, lieutenantId),
          eq(bossMirrorViolationRing.player_id, playerId),
        ),
      )
      .limit(1);

    if (!existing) {
      // No ring row scoped to (lieutenantId, playerId) — either this is genuinely the FIRST
      // violation for a lieutenant `playerId` legitimately owns, OR `lieutenantId` belongs to a
      // DIFFERENT player (who may already have a ring — just not one matching `playerId`). Resolve
      // ownership from the `lieutenant` table itself, scoped jointly — 0 rows ⇒ 404 (D2), BEFORE
      // any ring row is created. This is the SAME joint-read guard, just against the parent table
      // (bossMirrorViolationRing has no row yet to guard with).
      const { lieutenant } = await import('../../db/schema/lieutenant');
      const [lt] = await this.db
        .select({ player_id: lieutenant.player_id })
        .from(lieutenant)
        .where(and(eq(lieutenant.lieutenant_id, lieutenantId), eq(lieutenant.player_id, playerId)))
        .limit(1);

      if (!lt) {
        throw new ApiError('RESOURCE_NOT_FOUND', {
          message: `recordViolation: lieutenant ${lieutenantId} is not owned by player ${playerId} (W6a C3 ownership guard)`,
        });
      }

      // Insert fresh ring with 1 slot
      const slots: ViolationSlot[] = [{ rule_id: ruleId, severity: severityBucket }];
      await this.db
        .insert(bossMirrorViolationRing)
        .values({
          lieutenant_id:   lieutenantId,
          player_id:       lt.player_id,
          violation_slots: slots,
          ring_head:       1 % ringSize,
        });
      // Drift C8 — DD-BOSSMIRROR-COUPLE: additive emit AFTER the ring insert.
      // recordViolation return value (void) is BYTE-IDENTICAL. The CoverageInducedDriftService
      // subscriber receives this and applies hazard_shift++ unconditionally on ALL active drift_state rows.
      // gameMinute=0: no scheduler ctx here (player-action path, not a tick). Matches C7 LookoutAssigned.
      this.bus.emitRuleViolation({
        type: 'rule_violation',
        playerId: lt.player_id,
        lieutenantId,
        ruleId,
        severityBucket: String(severityBucket),
        gameMinute: 0,
      });
      return;
    }

    // Ring exists — append FIFO
    const slots = existing.violation_slots as ViolationSlot[];
    const newSlot: ViolationSlot = { rule_id: ruleId, severity: severityBucket };

    let updatedSlots: ViolationSlot[];
    let newHead: number;

    if (slots.length < ringSize) {
      // Ring not yet full — just append
      updatedSlots = [...slots, newSlot];
      newHead = updatedSlots.length % ringSize;
    } else {
      // Ring full — overwrite the oldest slot at ring_head (FIFO eviction)
      const head = existing.ring_head as number;
      updatedSlots = [...slots];
      updatedSlots[head] = newSlot;
      newHead = (head + 1) % ringSize;
    }

    await this.db
      .update(bossMirrorViolationRing)
      .set({
        violation_slots: updatedSlots,
        ring_head:       newHead,
        updated_at:      new Date(),
      })
      .where(eq(bossMirrorViolationRing.lieutenant_id, lieutenantId));
    // Drift C8 — DD-BOSSMIRROR-COUPLE: additive emit AFTER the ring update (BOTH branches emit).
    this.bus.emitRuleViolation({
      type: 'rule_violation',
      playerId: existing.player_id,
      lieutenantId,
      ruleId,
      severityBucket: String(severityBucket),
      gameMinute: 0,
    });
  }

  /**
   * `getLedger(playerId)` — read the public declaration ledger for a player.
   * R2.2: declared_rules is the public observable. The full row (including retraction_history)
   * is returned here only for TEST-ONLY routes. Real client-facing projection is R12b.
   */
  async getLedger(playerId: string): Promise<{
    player_id: string;
    declared_rules: DeclarationEntry[];
    retraction_history: RetractionEntry[];
  } | null> {
    const [row] = await this.db
      .select()
      .from(bossMirrorDeclarationLedger)
      .where(eq(bossMirrorDeclarationLedger.player_id, playerId))
      .limit(1);

    if (!row) return null;

    return {
      player_id:          row.player_id,
      declared_rules:     row.declared_rules as DeclarationEntry[],
      retraction_history: row.retraction_history as RetractionEntry[],
    };
  }

  /**
   * `getRing(lieutenantId, playerId)` — read the per-lieutenant violation ring.
   * R2.2: violation_slots is server-side only. Only exposed via TEST-ONLY routes (never to real client).
   * NOTE: does NOT include derived tick scalars (violation_density / defection_tolerance) — those are
   * on the same row but are only returned by getTickScalars() (TEST-ONLY route, separate surface).
   *
   * W6a C4 (P-A, finding #15) — `playerId` is now a required SECOND argument (this method is a pure
   * read, unlike the write-path findings elsewhere in this lot — see design §1 P-A: the joint read
   * applies uniformly regardless of write/read), and the read is joint (`lieutenant_id = ? AND
   * player_id = ?`, single round-trip). A ring belonging to a DIFFERENT player yields 0 rows ⇒ the
   * SAME pre-existing `null` return this method already used for "no ring row yet" — byte-identical
   * for both cases (D2), and ZERO behavior change for the many legitimate "row doesn't exist yet"
   * callers (this file's other TEST-ONLY reads — `getLedger`, `getConsistencyIndex` — use the exact
   * same null-on-absence idiom; introducing a throw HERE ONLY would diverge from that shared
   * convention for no security gain — a null success payload already masks existence as completely
   * as a 404 would). Pre-fix, `getRing(lieutenantId)` took no `playerId` at all — a pure read-only
   * IDOR: ANY caller naming ANY `lieutenantId` got back `player_id` + the full `violation_slots`
   * ring of a rival.
   *
   * @param lieutenantId — the lieutenant whose ring to read.
   * @param playerId     — the caller's player uuid. Must be the ACTUAL owner of `lieutenantId`.
   */
  async getRing(lieutenantId: string, playerId: string): Promise<{
    lieutenant_id: string;
    player_id: string;
    violation_slots: ViolationSlot[];
    ring_head: number;
  } | null> {
    const [row] = await this.db
      .select()
      .from(bossMirrorViolationRing)
      .where(and(eq(bossMirrorViolationRing.lieutenant_id, lieutenantId), eq(bossMirrorViolationRing.player_id, playerId)))
      .limit(1);

    if (!row) return null;

    return {
      lieutenant_id:   row.lieutenant_id,
      player_id:       row.player_id,
      violation_slots: row.violation_slots as ViolationSlot[],
      ring_head:       row.ring_head as number,
      // R2.2: violation_density / defection_tolerance deliberately excluded from this method's return shape.
      // They are on the same DB row but belong to the getTickScalars() surface (TEST-ONLY derived scalars).
    };
  }

  // ── R2b: Weekly tick — violation_density + defection_tolerance + consistency_index ─────────────

  /**
   * `runWeeklyTick(ctx)` — recompute the Boss Mirror derived scalars for all of the player's lieutenants.
   *
   * Idempotent per week: if `last_tick_week === weekId` on a ring row, that lieutenant is skipped
   * (re-running for the same week is a no-op — no double-accrual).
   *
   * **Per-lieutenant (violation_density + defection_tolerance):**
   *   violation_density  = Σ (severity_i · recency_weight_i) for ring slots, slot 0 = most recent.
   *   recency_weight_i   = (1 − decay)^i   where decay = bossMirrorRecencyDecayWeekly (registry).
   *   defection_tolerance = base_tolerance · (1 + γ · violation_density)
   *     base_tolerance = bossMirrorBaseDefectionTolerance (NEW registry tunable — [PROPOSED DEFAULT] 1.0).
   *     γ              = bossMirrorSeverityToleranceGamma (registry).
   *
   * **Zero-regression:** empty ring → violation_density = 0 → defection_tolerance = base_tolerance EXACTLY.
   *   A lieutenant with no ring row is unaffected (tick does not create phantom rows).
   *   A world with no violation_ring rows is entirely unaffected.
   *
   * **Per-player (consistency_index):**
   *   consistency_index = 1 − (retractions_in_90d / (declarations_in_90d + retractions_in_90d))
   *   where the 90-day window is measured in wall-clock ms (both declared_at and retracted_at are
   *   stored as epoch ms — set in R2a's declareRule/retractRule). If no declarations or retractions
   *   in the window, consistency_index = 1.0 (neutral — fully consistent on empty history).
   *
   * **Storage locations:**
   *   - violation_density + defection_tolerance + last_tick_week → boss_mirror_violation_ring row.
   *   - consistency_index + last_consistency_week              → boss_mirror_declaration_ledger row.
   *
   * **R2.2:** all three scalars are server-only (never forwarded to a client route).
   * **DD-REG-NAME:** γ, recency_decay, base_tolerance read from registry via reputationTunables.
   *   No inline numeric coefficient in this method.
   */
  async runWeeklyTick(ctx: CitySimTickContext, weekId: number): Promise<void> {
    const { playerId } = ctx;

    // Read registry values once per tick (no inline literals — DD-REG-NAME).
    const decay        = reputationTunables.bossMirrorRecencyDecayWeekly;
    const gamma        = reputationTunables.bossMirrorSeverityToleranceGamma;
    const baseTolerance = reputationTunables.bossMirrorBaseDefectionTolerance;

    // ── Per-lieutenant: recompute violation_density + defection_tolerance ──────────────────────
    const rings = await this.db
      .select()
      .from(bossMirrorViolationRing)
      .where(eq(bossMirrorViolationRing.player_id, playerId));

    for (const ring of rings) {
      // Idempotence guard: skip if this week's tick already ran for this lieutenant.
      if (ring.last_tick_week === weekId) continue;

      const slots = ring.violation_slots as ViolationSlot[];
      const head  = ring.ring_head as number;

      // Reorder slots from most-recent to oldest.
      // When ring is full (slots.length === ringSize), oldest = head, newest = (head - 1 + size) % size.
      // When ring not yet full (still filling up), slots are in insertion order — index 0 = oldest, last = newest.
      const ringSize = slots.length; // actual number of slots stored (≤ bossMirrorViolationRingSize)
      let orderedMostRecentFirst: ViolationSlot[];

      if (ringSize === 0) {
        orderedMostRecentFirst = [];
      } else {
        // Determine if the ring is full (all slots written = head wraps around).
        // The ring is "full" when length equals the configured ring capacity.
        const capacity = reputationTunables.bossMirrorViolationRingSize;
        if (ringSize < capacity) {
          // Ring not yet full: slots[0..ringSize-1] are in insertion order (oldest first, newest last).
          // Reverse for most-recent-first.
          orderedMostRecentFirst = [...slots].reverse();
        } else {
          // Ring full: head points to the NEXT write position (oldest slot).
          // Newest = (head - 1 + size) % size, oldest = head.
          // Build most-recent-first: starting from (head - 1) mod size, going backwards.
          orderedMostRecentFirst = [];
          for (let i = 0; i < ringSize; i++) {
            const idx = (head - 1 - i + ringSize) % ringSize;
            orderedMostRecentFirst.push(slots[idx]!);
          }
        }
      }

      // violation_density = Σ (severity_i · recency_weight_i) where recency_weight_i = (1 − decay)^i.
      // slot i=0 = most recent, i=1 = next, etc.
      let violationDensity = 0;
      for (let i = 0; i < orderedMostRecentFirst.length; i++) {
        const slot = orderedMostRecentFirst[i]!;
        const recencyWeight = Math.pow(1 - decay, i);
        violationDensity += slot.severity * recencyWeight;
      }

      // defection_tolerance = base_tolerance * (1 + γ * violation_density).
      // Empty ring: violationDensity = 0 → defection_tolerance = base_tolerance exactly (zero-regression).
      const defectionTolerance = baseTolerance * (1 + gamma * violationDensity);

      await this.db
        .update(bossMirrorViolationRing)
        .set({
          violation_density:   violationDensity,
          defection_tolerance: defectionTolerance,
          last_tick_week:      weekId,
          updated_at:          new Date(),
        })
        .where(eq(bossMirrorViolationRing.lieutenant_id, ring.lieutenant_id));
    }

    // ── Per-player: recompute consistency_index ────────────────────────────────────────────────
    const [ledger] = await this.db
      .select()
      .from(bossMirrorDeclarationLedger)
      .where(eq(bossMirrorDeclarationLedger.player_id, playerId))
      .limit(1);

    if (ledger) {
      // Idempotence guard: skip if this week's consistency_index tick already ran.
      if (ledger.last_consistency_week !== weekId) {
        const now = Date.now();
        const cutoff = now - CONSISTENCY_WINDOW_MS;

        const declared   = ledger.declared_rules     as DeclarationEntry[];
        const retracted  = ledger.retraction_history as RetractionEntry[];

        // Count declarations in the 90-day window (currently active + retracted ones that were declared in window).
        // Approach: ALL declared rules still in declared_rules were declared at their declared_at timestamp.
        // Retracted rules are no longer in declared_rules; their declaration timestamp is not stored separately.
        // Canon :65: "1 − (retractions / declarations) over last 90 days".
        // Interpretation: over the 90-day window, count how many declarations were made vs how many retractions.
        // - declarations_90d: entries in declared_rules with declared_at >= cutoff
        //   + retractions where we infer the declaration was also in the window (declared_at not stored on retraction).
        // Pragmatic approach: use (active declarations in window) + (retractions in window) as total declarations.
        // This is the most faithful reading of "over last 90 days" with the data stored.
        const declaredIn90d  = declared.filter((e)  => e.declared_at  >= cutoff).length;
        const retractedIn90d = retracted.filter((e) => e.retracted_at >= cutoff).length;
        const totalDeclarations = declaredIn90d + retractedIn90d;

        let consistencyIndex: number;
        if (totalDeclarations === 0) {
          // No declarations or retractions in window → neutral (fully consistent on empty history).
          consistencyIndex = 1.0;
        } else {
          consistencyIndex = 1 - retractedIn90d / totalDeclarations;
        }

        await this.db
          .update(bossMirrorDeclarationLedger)
          .set({
            consistency_index:     consistencyIndex,
            last_consistency_week: weekId,
            updated_at:            new Date(),
          })
          .where(eq(bossMirrorDeclarationLedger.player_id, playerId));
      }
    }
  }

  /**
   * `getTickScalars(lieutenantId, playerId)` — read the server-only derived tick scalars for a
   * lieutenant. Returns violation_density + defection_tolerance + last_tick_week from the ring row.
   * R2.2: server-only — only exposed via TEST-ONLY routes (never forwarded to a real client).
   *
   * W6a C4 (P-A, finding #16) — same shape as `getRing` above: `playerId` is now a required SECOND
   * argument, the read is joint, and a mismatched-owner `lieutenantId` yields the SAME pre-existing
   * `null` return this method already used for "no ring row yet" (byte-identical, D2 — see `getRing`'s
   * docblock for the full "why null, not a throw" reasoning, which applies identically here). Pre-fix,
   * `getTickScalars(lieutenantId)` leaked `violation_density`/`defection_tolerance` — SERVER-ONLY
   * scalars (R2.2/P5) — of a rival's lieutenant to any caller naming that `lieutenantId`.
   *
   * @param lieutenantId — the lieutenant whose tick scalars to read.
   * @param playerId     — the caller's player uuid. Must be the ACTUAL owner of `lieutenantId`.
   */
  async getTickScalars(lieutenantId: string, playerId: string): Promise<{
    lieutenant_id: string;
    violation_density: number | null;
    defection_tolerance: number | null;
    last_tick_week: number | null;
  } | null> {
    const [row] = await this.db
      .select()
      .from(bossMirrorViolationRing)
      .where(and(eq(bossMirrorViolationRing.lieutenant_id, lieutenantId), eq(bossMirrorViolationRing.player_id, playerId)))
      .limit(1);

    if (!row) return null;

    return {
      lieutenant_id:       row.lieutenant_id,
      violation_density:   row.violation_density   ?? null,
      defection_tolerance: row.defection_tolerance ?? null,
      last_tick_week:      row.last_tick_week      ?? null,
    };
  }

  // ── R4b: DD-BRIDGE breach predicate ───────────────────────────────────────────────────────────

  /**
   * `isDeclaredRuleContradictedBy(playerId, ruleIdPrefix, extractionRatio)` — DD-BRIDGE helper.
   *
   * Returns `true` iff the player currently has an active declared rule with a `rule_id` that
   * starts with `ruleIdPrefix` AND the `extractionRatio` meets or exceeds the max-extract
   * structural threshold (BRIDGE_MAX_EXTRACT_THRESHOLD = 0.90).
   *
   * Called by `RestraintIndexService.recordDisputeOutcome` AFTER the RestraintDisputeRing write
   * (the "then" half of DD-BRIDGE — deterministic Restraint→Boss Mirror order).
   *
   * **Breach semantics (DD-BRIDGE canon :101):**
   *   - A dispute contradicts a declared rule when:
   *     (a) the player has an **active** declared rule matching the prefix (e.g. "settle_fair"),
   *     (b) the extraction ratio = claimed / claimable ≥ BRIDGE_MAX_EXTRACT_THRESHOLD.
   *   - BRIDGE_MAX_EXTRACT_THRESHOLD = 0.90 — structural constant, NOT a new tunable.
   *     Plan R4b: "severity bucket REUSE — do NOT invent a new coefficient". The bridge is
   *     structural (binary decision gate); the 0.90 threshold encodes the definition of "max-extract"
   *     which is a categorical distinction, not a continuous coefficient. No registry key needed.
   *
   * **R2.2:** declared_rules is the public observable; this method reads only the public part.
   *   The result (breach decision) is server-side computation — not forwarded to any client.
   *
   * Returns the matching declared rule's `rule_id` (the first match) if contradicted, else null.
   * The caller uses this to record the violation with the exact matching rule_id.
   */
  async isDeclaredRuleContradictedBy(
    playerId: string,
    ruleIdPrefix: string,
    extractionRatio: number,
  ): Promise<string | null> {
    // Structural threshold — categorically defines "max-extract" (DD-BRIDGE: no new tunable).
    const BRIDGE_MAX_EXTRACT_THRESHOLD = 0.90;

    if (extractionRatio < BRIDGE_MAX_EXTRACT_THRESHOLD) {
      // Generous outcome — no breach regardless of declared rules.
      return null;
    }

    // Read the player's declaration ledger (the public observable — declared_rules array).
    const [row] = await this.db
      .select()
      .from(bossMirrorDeclarationLedger)
      .where(eq(bossMirrorDeclarationLedger.player_id, playerId))
      .limit(1);

    if (!row) {
      // No ledger row → no declared rules → no breach possible.
      return null;
    }

    const declared = row.declared_rules as DeclarationEntry[];

    // Find the first active declared rule whose rule_id starts with the given prefix.
    // Convention (DD-BRIDGE): "settle_fair" rules are identified by rule_id prefix "settle_fair"
    // (e.g. "settle_fair", "settle_fair:disputes", "settle_fair_always" all match).
    // This keeps the matching deterministic and extensible without inventing new categories.
    const matchingRule = declared.find((e) => e.rule_id.startsWith(ruleIdPrefix));

    if (!matchingRule) {
      // No matching declared rule → no breach.
      return null;
    }

    // Both conditions met: active declared rule + max-extract outcome → breach.
    return matchingRule.rule_id;
  }

  /**
   * `getConsistencyIndex(playerId)` — read the server-only derived consistency_index for a player.
   * Returns consistency_index + last_consistency_week from the declaration ledger row.
   * R2.2: server-only — only exposed via TEST-ONLY routes (never forwarded to a real client).
   */
  async getConsistencyIndex(playerId: string): Promise<{
    player_id: string;
    consistency_index: number | null;
    last_consistency_week: number | null;
  } | null> {
    const [row] = await this.db
      .select()
      .from(bossMirrorDeclarationLedger)
      .where(eq(bossMirrorDeclarationLedger.player_id, playerId))
      .limit(1);

    if (!row) return null;

    return {
      player_id:             row.player_id,
      consistency_index:     row.consistency_index     ?? null,
      last_consistency_week: row.last_consistency_week ?? null,
    };
  }

  // ── R11: Cross-mechanic divergence — declared rules vs absorbed norms observable (:180) ─────────

  /**
   * `getDivergenceCue(playerId, lieutenantId)` — R11 cross-mechanic divergence read.
   *
   * Compares the Boss Mirror declaration ledger (declared rules — public observable) against the
   * Hidden Curriculum norms vector (absorbed norms — per-lieutenant server-side state).
   *
   * **rule_id→norm mapping:**
   *   A declared ruleId that EQUALS one of the 8 canonical norm names commits the player to that norm.
   *   e.g. ruleId = "fairness_to_subordinates" → commits to the `fairness_to_subordinates` norm.
   *   If the lieutenant has absorbed that norm OFF (flag = false) → DIVERGENCE on that norm.
   *
   *   divergence_count = count of declared rules whose ruleId ∈ CANONICAL_NORM_NAMES AND the
   *                      corresponding norm flag in the lieutenant's norms_flags vector is OFF.
   *
   * **Cue derivation (P5 — observable band, NOT raw scalar to real clients):**
   *   - No declared rules at all → cue = 'indeterminate' (no basis for comparison).
   *   - divergence_count ≥ divergenceSalienceMinNorms (registry) → cue = 'diverging'.
   *   - divergence_count < divergenceSalienceMinNorms → cue = 'aligned'.
   *
   * **R2.2 invariant:**
   *   - divergence_count is SERVER-ONLY (never forwarded to a real client).
   *   - The public observable is the cue band ('diverging' | 'aligned' | 'indeterminate').
   *   - This method is called only from TEST-ONLY routes and (future) BO true-state read (R12a).
   *
   * **No fabricated mechanic:** divergence is a DERIVED comparison of two existing DB states:
   *   bossMirrorDeclarationLedger (from R2a) vs hiddenCurriculumNormsVector (from R7a).
   *   No new scalar is invented — divergence_count is computed on-the-fly (not persisted).
   *
   * **Threshold (registry-flagged — R10 lesson):**
   *   `reputation.divergence_salience_min_norms` (reputationTunables.divergenceSalienceMinNorms).
   *   [PROPOSED DEFAULT][PROV-Y26Q2]: 1 — any declared rule contradicted is salient.
   *
   * Canon `:180`: "declared rules vs absorbed norms can diverge; divergence itself is observable publicly."
   * Design §1.4.
   */
  async getDivergenceCue(
    playerId: string,
    lieutenantId: string,
  ): Promise<{
    /** Server-only raw divergence count (never forwarded to real client — R2.2). */
    divergence_count: number;
    /** The public observable cue band (the only form in which divergence reaches a real client). */
    cue: 'diverging' | 'aligned' | 'indeterminate';
  }> {
    // Read salience threshold from registry (no inline — DD-REG-NAME, R10 lesson).
    const salienceThreshold = reputationTunables.divergenceSalienceMinNorms;

    // 1. Read the player's Boss Mirror declaration ledger.
    const [ledgerRow] = await this.db
      .select()
      .from(bossMirrorDeclarationLedger)
      .where(eq(bossMirrorDeclarationLedger.player_id, playerId))
      .limit(1);

    const declaredRules = (ledgerRow?.declared_rules ?? []) as DeclarationEntry[];

    // Filter: only rules whose ruleId is one of the 8 canonical norm names.
    // These are the rules that "commit to" a norm (the rule_id→norm mapping).
    const normCommitments = declaredRules.filter((e) => CANONICAL_NORM_NAMES.has(e.rule_id));

    // No declared rules that map to a norm → no basis for comparison.
    if (normCommitments.length === 0) {
      return { divergence_count: 0, cue: 'indeterminate' };
    }

    // 2. Read the lieutenant's Hidden Curriculum norms vector.
    const [hcRow] = await this.db
      .select()
      .from(hiddenCurriculumNormsVector)
      .where(eq(hiddenCurriculumNormsVector.lieutenant_id, lieutenantId))
      .limit(1);

    // If no HC row exists for this lieutenant: all norms are considered OFF (default state).
    // This is the zero-regression invariant (a lieutenant with no HC state has no absorbed norms).
    const normsFlags = (hcRow?.norms_flags ?? {}) as Partial<NormsFlags>;

    // 3. Count diverging norms: declared rule commits to a norm that is absorbed OFF.
    let divergenceCount = 0;
    for (const entry of normCommitments) {
      const normName = entry.rule_id as NormName;
      // Divergence: committed to the norm (declared it) but the house absorbed it OFF (false or absent).
      if (!normsFlags[normName]) {
        divergenceCount += 1;
      }
    }

    // 4. Derive the cue band from the divergence_count + salience threshold (registry — DD-REG-NAME).
    const cue: 'diverging' | 'aligned' =
      divergenceCount >= salienceThreshold ? 'diverging' : 'aligned';

    return { divergence_count: divergenceCount, cue };
  }
}
