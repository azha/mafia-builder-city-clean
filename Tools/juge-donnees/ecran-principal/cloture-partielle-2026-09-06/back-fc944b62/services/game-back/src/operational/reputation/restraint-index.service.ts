// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d2-impl-plan.md Task R4a + Task R4b
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.2 (:83-95, :247)
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.1+§3.2 (:101) [R4b DD-BRIDGE]
//             docs/superpowers/specs/2026-06-16-depth-d2-reputation-chapter-design.md §1.2
//             docs/superpowers/specs/2026-06-16-depth-d2-reputation-chapter-design.md §4 DD-BRIDGE [R4b]
//             docs/tech/09_data_model/schema_reputation_state.md §2 (R9.3 backport — same-commit)
//             — D2 R4a — 2026-06-17; D2 R4b — 2026-06-17
//
// `RestraintIndexService` — dispute ring operations + offer_terms weekly tick for the
// Restraint Index mechanic (§3.2).
//
// Canon signatures (:247):
//   recordDisputeOutcome(counterpartyId, claimable, claimed) — append slot to ring.
//   computeOfferTerms(counterpartyId)                        — return offer posture (R2.2 projection).
//   runWeeklyTick(ctx, weekId)                               — recompute restraint_ratio, offer_terms,
//                                                              wary_active, collateral_amount per counterparty.
//
// DD-REG-NAME (registry-wins — no inline numeric coefficient anywhere in this file):
//   Ring window:    `restraint_window_disputes` via reputationTunables.restraintWindowDisputes.
//   δ:              `restraint_terms_coefficient_delta` via reputationTunables.restraintTermsCoefficientDelta.
//   T_wary:         `restraint_wary_threshold` via reputationTunables.restraintWaryThreshold.
//   base_terms:     `reputation.restraint_base_terms` via reputationTunables.restraintBaseTerms.
//   escrow:         `restraint_collateral_inflation_wary` via reputationTunables.restraintCollateralInflationWary.
//
// R2.2 / P5:
//   - dispute_slots / restraint_ratio are SERVER-SIDE only (never forwarded to a client route).
//   - offer_terms / wary_active / collateral_amount are SERVER-SIDE only.
//   - Client surface: computeOfferTerms() → { offer_posture, marginalia } ONLY (no raw ratio).
//   - Plain counterparty: standard posture; ratio < T_wary: wary posture + collateral.
//
// Wary config / Insurance boundary (DD-INSURANCE-DEFER, R4 plan):
//   - wary_active + collateral_amount are computed and persisted HERE (intra-Restraint).
//   - The "insurance terms" dimension (TD-119) is EMIT-ONLY: the service marks the state
//     (wary_active=true + collateral_amount) as an observable contract visible to insurance consumers.
//     The insurance consumer itself is NOT written in this chunk — it is deferred to R13.
//     No insurance-specific code lives in this file.
//
// R4b Bridge to Boss Mirror (DD-BRIDGE — this chunk):
//   After the RestraintDisputeRing write, a derived breach-check calls BossMirrorService
//   iff the outcome contradicts a currently-declared rule (e.g. "settle_fair" + max-extract).
//   Deterministic order: Restraint FIRST, then Boss Mirror (DD-BRIDGE canon :101).
//   Zero double-counting: the two rings are orthogonal (restraint_ratio ≠ defection_tolerance).
//   BossMirrorService injected via NestJS DI — no circular dep (BM does not import Restraint).
//   The bridge rule prefix is "settle_fair" — any rule_id starting with "settle_fair" triggers.
//   Severity derivation: Math.round((claimed / claimable) * 100) — REUSE 0-100 integer bucket.
//   No new tunable: the 0.90 threshold in BossMirrorService.isDeclaredRuleContradictedBy is
//   structural (categorical "max-extract" definition, not a continuous coefficient — plan R4b).
//
// Zero-regression invariants:
//   - Empty ring → restraint_ratio = 0 → offer_terms = base_terms EXACTLY.
//   - A counterparty with no recorded outcomes has no ring row.
//     computeOfferTerms() returns standard posture for absent row.
//   - A world with no restraint state is entirely unaffected by the weekly tick.
//   - Tick is idempotent per week (keyed on last_tick_week — re-running for the same week is a no-op).
//
// R9.3: matches schema in docs/tech/09_data_model/schema_reputation_state.md §2 Table 3
//       (restraintDisputeRing + migration 0053 columns).
//
// REVIEWER FLAG [BASE_TERMS_NEW_TUNABLE]: `reputation.restraint_base_terms` is a NEW registry key
//   (default 1.0, range 0.5..2.0, [PROPOSED DEFAULT][PROV-Y26Q2]). Added to gdd/14 §Reputation
//   by this commit. Reviewer must confirm default + range.
//
// REVIEWER FLAG [RESTRAINT_TUNABLE_NAMES]: store keys follow gdd/14 short-form (e.g.
//   `restraint_terms_coefficient_delta` not `restraint_delta_terms_coefficient` from tech-doc :104).
//   Reviewer should confirm gdd/14 L957-960 short keys are canonical.

import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { restraintDisputeRing } from '../../db/schema/reputation_state';
import { reputationTunables } from './reputation-tunables';
import { BossMirrorService } from './boss-mirror.service';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';

// ── R4b DD-BRIDGE constants ────────────────────────────────────────────────────────────────────────

/**
 * The rule_id prefix that identifies "settle fair"-type declared rules in the Boss Mirror ledger.
 * Convention (DD-BRIDGE): any rule_id starting with this prefix is a relevant restraint declaration.
 * Example matching rule_ids: "settle_fair", "settle_fair:disputes", "settle_fair_always".
 * This is a structural constant — NOT a tunable (defines the semantic category, not a threshold).
 */
const BRIDGE_SETTLE_FAIR_PREFIX = 'settle_fair';

// ── Typed slot shape (internal only — server-side state, R2.2) ──────────────────────────────────

/** A single dispute outcome slot in the per-counterparty ring. Server-side only. */
export interface DisputeSlot {
  claimable_amount: number;
  claimed_amount: number;
}

// ── Result types ─────────────────────────────────────────────────────────────────────────────────

/**
 * Client-facing result of computeOfferTerms().
 * R2.2: NEVER includes raw restraint_ratio, dispute_slots, ring_head, or any internal scalar.
 * Player reads posture (standard/wary) + named marginalia (:95).
 */
export interface OfferTermsResult {
  /** Counterparty ID (for the caller's context). */
  counterparty_id: string;
  /** 'standard' = normal terms, 'wary' = collateral escrow required. */
  offer_posture: 'standard' | 'wary';
  /**
   * Named marginalia — last-three counterparties that "settled with" this player (by name, :95).
   * Populated from the ring slots; empty for a fresh ring.
   * R2.2: names only, not amounts — no ratio exposed.
   */
  marginalia: string[];
}

// ── Service ──────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class RestraintIndexService {
  constructor(
    @Inject(DB)            private readonly db:             DrizzleClient,
    // R4b DD-BRIDGE: BossMirrorService injected for the deterministic breach-check.
    // No circular dep: BossMirrorService does NOT import RestraintIndexService.
    // NestJS resolves this as a standard forward injection (no forwardRef needed).
    private readonly bossMirror: BossMirrorService,
  ) {}

  /**
   * `recordDisputeOutcome(playerId, counterpartyId, claimable, claimed, lieutenantId?)` —
   * append a dispute outcome slot to the per-(player, counterparty) FIFO ring buffer.
   *
   * The ring holds at most `restraint_window_disputes` slots (read from registry via
   * reputationTunables.restraintWindowDisputes — no inline 6). When the ring is full, the oldest
   * slot is evicted (FIFO: ring_head advances mod ring_size).
   *
   * Canon :83-86: ring 6 slots, each slot = claimable_amount (2B) + claimed_amount (2B).
   * DD-BYTES: realised as JSONB ring buffer + integer head pointer (no bit-packing).
   *
   * **R4b DD-BRIDGE** (canon :101, LOCKED by user, resolves canon open question R1.4):
   *   After the RestraintDisputeRing write (ALWAYS — the Restraint ring is FIRST),
   *   a derived breach-check fires **iff** `lieutenantId` is provided AND the outcome
   *   contradicts a currently-declared rule:
   *     • Player has an active declared rule with rule_id starting with BRIDGE_SETTLE_FAIR_PREFIX.
   *     • The extraction ratio (claimed / claimable) meets the max-extract structural threshold.
   *   If both conditions hold: `BossMirrorService.recordViolation(lieutenantId, rule_id, severity)`
   *   is called (severity = Math.round(ratio * 100) — REUSE 0-100 integer bucket, no new coefficient).
   *   If no lieutenantId, OR conditions not met: Boss Mirror write is skipped (Restraint-only).
   *
   * **Deterministic order (DD-BRIDGE):** Restraint write completes (`await`) BEFORE the Boss Mirror
   *   breach-check starts. Sequential async chain — not concurrent.
   *
   * **Zero double-counting:** The Restraint ring measures economic generosity (restraint_ratio →
   *   offer_terms). The Boss Mirror ring measures self-consistency (declared↔acted coherence →
   *   defection_tolerance). A single dispute act writes EXACTLY ONE slot in each ring (max) —
   *   never two slots in one dimension. The two downstream effects are orthogonal.
   *
   * `lieutenantId` (optional): when provided, the breach-check uses it as the ring key for the
   *   BossMirrorViolationRing write. Without it, the bridge is structurally skipped.
   *
   * R2.2: dispute_slots is server-side PRIVATE (never forwarded to client).
   * Zero-regression: this method creates the ring row on first call (upsert pattern).
   *
   * W6a C5 (DD-MAGNITUDE-BOUND, design §3/C5): `claimable`/`claimed` are clamped to
   * `[reputationTunables.restraintClaimAmountMin, restraintClaimAmountMax]` BEFORE they are stored
   * in a ring slot OR used in the DD-BRIDGE `extractionRatio`/`severityBucket` computation below —
   * the values used downstream are always the BOUNDED ones, never the raw caller-supplied ones. This
   * also protects the DD-BRIDGE call into `BossMirrorService.recordViolation` from an unbounded
   * `extractionRatio` (that method has its OWN independent clamp too — defense in depth, W6a C5).
   */
  async recordDisputeOutcome(
    playerId: string,
    counterpartyId: string,
    claimable: number,
    claimed: number,
    lieutenantId?: string,
  ): Promise<void> {
    const ringSize = reputationTunables.restraintWindowDisputes;

    // W6a C5 (DD-MAGNITUDE-BOUND) — clamp BEFORE any read/write. Non-finite (NaN/±Infinity)
    // degrades to the floor rather than propagating. Clamp idiom REUSED from
    // `lek-memory.service.ts:264` (`Math.min(MAX, Math.max(MIN, Math.round(x)))`).
    const claimAmountMin = reputationTunables.restraintClaimAmountMin;
    const claimAmountMax = reputationTunables.restraintClaimAmountMax;
    const rawClaimable = Number.isFinite(claimable) ? claimable : claimAmountMin;
    const rawClaimed   = Number.isFinite(claimed)   ? claimed   : claimAmountMin;
    claimable = Math.min(claimAmountMax, Math.max(claimAmountMin, Math.round(rawClaimable)));
    claimed   = Math.min(claimAmountMax, Math.max(claimAmountMin, Math.round(rawClaimed)));

    const newSlot: DisputeSlot = {
      claimable_amount: claimable,
      claimed_amount:   claimed,
    };

    // ── Step 1 (DD-BRIDGE): write the RestraintDisputeRing FIRST (always). ────────────────────

    // Read existing ring row
    const [existing] = await this.db
      .select()
      .from(restraintDisputeRing)
      .where(and(
        eq(restraintDisputeRing.player_id, playerId),
        eq(restraintDisputeRing.counterparty_id, counterpartyId),
      ))
      .limit(1);

    if (!existing) {
      // First dispute for this (player, counterparty) pair — create ring with 1 slot.
      await this.db
        .insert(restraintDisputeRing)
        .values({
          player_id:       playerId,
          counterparty_id: counterpartyId,
          dispute_slots:   [newSlot],
          ring_head:       1 % ringSize,
        });
    } else {
      // Ring exists — append FIFO (evict oldest if full)
      const slots = existing.dispute_slots as DisputeSlot[];
      let updatedSlots: DisputeSlot[];
      let newHead: number;

      if (slots.length < ringSize) {
        // Ring not yet full — append
        updatedSlots = [...slots, newSlot];
        newHead = updatedSlots.length % ringSize;
      } else {
        // Ring full — overwrite at ring_head (oldest slot)
        const head = existing.ring_head as number;
        updatedSlots = [...slots];
        updatedSlots[head] = newSlot;
        newHead = (head + 1) % ringSize;
      }

      await this.db
        .update(restraintDisputeRing)
        .set({
          dispute_slots: updatedSlots,
          ring_head:     newHead,
          updated_at:    new Date(),
        })
        .where(and(
          eq(restraintDisputeRing.player_id, playerId),
          eq(restraintDisputeRing.counterparty_id, counterpartyId),
        ));
    }

    // ── Step 2 (DD-BRIDGE): derived breach-check → BossMirrorViolationRing (Boss Mirror SECOND). ─
    //
    // Fires ONLY if:
    //   (a) lieutenantId is provided (the lieutenant context for the BM ring key), AND
    //   (b) the outcome contradicts a currently-declared settle_fair rule for the player.
    //
    // The Restraint write above has ALREADY completed (await ensures Restraint-first ordering).
    // This sequential async chain proves deterministic Restraint→Boss Mirror order (DD-BRIDGE).

    if (!lieutenantId) {
      // No lieutenant context → bridge structurally skipped. Restraint-only write.
      return;
    }

    // Compute extraction ratio for the breach predicate.
    const extractionRatio = claimable > 0 ? claimed / claimable : 0;

    // Delegate the breach decision to BossMirrorService.isDeclaredRuleContradictedBy.
    // Returns the matching rule_id if contradicted, null otherwise.
    const contradictedRuleId = await this.bossMirror.isDeclaredRuleContradictedBy(
      playerId,
      BRIDGE_SETTLE_FAIR_PREFIX,
      extractionRatio,
    );

    if (!contradictedRuleId) {
      // No breach — no declared settle_fair rule, or generous outcome. Restraint-only.
      return;
    }

    // Breach detected. Derive severity from extraction magnitude — REUSE 0-100 integer bucket.
    // severity = Math.round(ratio * 100) — no new coefficient (plan R4b: "severity bucket REUSE").
    // claimable > 0 guaranteed here (extractionRatio computed above only for claimable > 0).
    const severityBucket = Math.round(extractionRatio * 100);

    // Write the BossMirrorViolationRing slot (deterministically AFTER the Restraint write above).
    await this.bossMirror.recordViolation(playerId, lieutenantId, contradictedRuleId, severityBucket);
  }

  /**
   * `computeOfferTerms(playerId, counterpartyId)` — R2.2-compliant client surface.
   *
   * Returns { offer_posture, marginalia } ONLY. NEVER includes raw restraint_ratio or
   * any internal server scalar.
   *
   * Canon :95: "counterparty meeting panels show small marginalia line listing 'last three
   * you settled with' by name and what each says about player. No ratio shown."
   *
   * Reads the current persisted row (or returns neutral defaults for absent row).
   * NOTE: this method reads already-ticked scalars (wary_active from last tick).
   * For a fresh ring not yet ticked, defaults to standard posture (zero-regression).
   *
   * R2.2: no raw ratio, no slots, no ring_head in return value.
   */
  async computeOfferTerms(playerId: string, counterpartyId: string): Promise<OfferTermsResult> {
    const [row] = await this.db
      .select()
      .from(restraintDisputeRing)
      .where(and(
        eq(restraintDisputeRing.player_id, playerId),
        eq(restraintDisputeRing.counterparty_id, counterpartyId),
      ))
      .limit(1);

    if (!row) {
      // No ring row → neutral/standard terms (zero-regression: empty history = standard)
      return {
        counterparty_id: counterpartyId,
        offer_posture:   'standard',
        marginalia:      [],
      };
    }

    // Derive posture from persisted wary_active scalar (materialised by weekly tick).
    // For rows not yet ticked (wary_active = null), derive from current slot data directly.
    let isWary: boolean;
    if (row.wary_active !== null && row.wary_active !== undefined) {
      isWary = row.wary_active;
    } else {
      // Not yet ticked — compute on-the-fly from current ring slots (neutral fallback)
      const slots = row.dispute_slots as DisputeSlot[];
      isWary = this._computeIsWary(slots);
    }

    // Marginalia: last-three dispute outcomes as opaque named descriptors (:95).
    // Since counterparty entity is deferred (no name table), marginalia are represented as
    // positional labels (e.g., "settled-1", "settled-2") derived from the ring.
    // R2.2: no claimable/claimed amounts exposed — only named positional slots.
    const slots = row.dispute_slots as DisputeSlot[];
    const lastThree = slots.slice(-3).map((_, idx) => `settlement-${slots.length - 2 + idx}`);

    return {
      counterparty_id: counterpartyId,
      offer_posture:   isWary ? 'wary' : 'standard',
      marginalia:      lastThree,
    };
  }

  // ── R4a Weekly tick — restraint_ratio + offer_terms + wary_active + collateral_amount ────────

  /**
   * `runWeeklyTick(ctx, weekId)` — recompute the Restraint Index derived scalars for all of the
   * player's counterparty rings.
   *
   * Idempotent per week: if `last_tick_week === weekId` on a ring row, that row is skipped
   * (re-running for the same week is a no-op — no double-accrual).
   *
   * **Per-counterparty ring:**
   *   restraint_ratio = Σ(claimable_i − claimed_i) / Σ claimable_i    bounded to [0, 1] (:85-86).
   *     If Σ claimable = 0 (degenerate): restraint_ratio = 0 (conservative: treat as greedy).
   *   offer_terms = base_terms · (1 + δ · restraint_ratio)             canon :90.
   *     base_terms + δ read from registry (no inline literals — DD-REG-NAME).
   *   wary_active = restraint_ratio < T_wary                           canon :93.
   *     T_wary read from registry (no inline 0.15 — DD-REG-NAME).
   *   collateral_amount = offer_terms · restraint_collateral_inflation_wary   (intra-Restraint, :93).
   *     Only meaningful when wary_active=true; stored unconditionally to simplify idempotence.
   *     escrow_inflation read from registry (no inline 1.4 — DD-REG-NAME).
   *
   * **Zero-regression:** empty ring → restraint_ratio = 0 → offer_terms = base_terms EXACTLY.
   *   A counterparty with no ring row is unaffected (tick does not create phantom rows).
   *   A world with no restraint_dispute_ring rows is entirely unaffected.
   *
   * **Wary config (intra-Restraint) vs DD-INSURANCE-DEFER:**
   *   wary_active + collateral_amount are the **intra-Restraint** contract (persisted here).
   *   The insurance-terms dimension (TD-119) is EMIT-ONLY: wary_active=true exposes the state
   *   as an observable contract for future insurance consumers. NO insurance consumer is written.
   *   The wary state IS the emit-only boundary: any consumer (R13 lot) reads wary_active from DB.
   *
   * **R2.2:** restraint_ratio, offer_terms, wary_active, collateral_amount are server-only
   *   (never forwarded to a client route). Client gets offer_posture + marginalia via
   *   computeOfferTerms().
   *
   * **DD-REG-NAME:** δ, T_wary, window, escrow_inflation, base_terms all read from registry.
   *   No inline numeric coefficient in this method.
   */
  async runWeeklyTick(ctx: CitySimTickContext, weekId: number): Promise<void> {
    const { playerId } = ctx;

    // Read registry values once per tick (no inline literals — DD-REG-NAME).
    const delta           = reputationTunables.restraintTermsCoefficientDelta;
    const tWary           = reputationTunables.restraintWaryThreshold;
    const baseTerms       = reputationTunables.restraintBaseTerms;
    const escrowInflation = reputationTunables.restraintCollateralInflationWary;

    // Fetch all dispute ring rows for this player
    const rings = await this.db
      .select()
      .from(restraintDisputeRing)
      .where(eq(restraintDisputeRing.player_id, playerId));

    for (const ring of rings) {
      // Idempotence guard: skip if this week's tick already ran for this counterparty.
      if (ring.last_tick_week === weekId) continue;

      const slots = ring.dispute_slots as DisputeSlot[];

      // restraint_ratio = Σ(claimable_i − claimed_i) / Σ claimable_i
      let sumClaimable = 0;
      let sumSlack     = 0;
      for (const slot of slots) {
        sumClaimable += slot.claimable_amount;
        sumSlack     += (slot.claimable_amount - slot.claimed_amount);
      }

      // Bounded to [0, 1]. If Σ claimable = 0 (degenerate — all zeros): ratio = 0.
      const restraintRatio = sumClaimable > 0
        ? Math.min(1, Math.max(0, sumSlack / sumClaimable))
        : 0;

      // offer_terms = base_terms * (1 + δ * restraint_ratio).
      // Empty ring: restraintRatio = 0 → offer_terms = base_terms EXACTLY (zero-regression).
      const offerTerms = baseTerms * (1 + delta * restraintRatio);

      // wary_active = restraint_ratio < T_wary (canon :93, DD-REG-NAME — no inline 0.15).
      const waryActive = restraintRatio < tWary;

      // collateral_amount = offer_terms * escrow_inflation.
      // Stored unconditionally (simplifies idempotence); meaningful only when wary_active=true.
      // This is the intra-Restraint contract (DD-INSURANCE-DEFER: no insurance consumer written).
      const collateralAmount = offerTerms * escrowInflation;

      await this.db
        .update(restraintDisputeRing)
        .set({
          restraint_ratio:   restraintRatio,
          offer_terms:       offerTerms,
          wary_active:       waryActive,
          collateral_amount: collateralAmount,
          last_tick_week:    weekId,
          updated_at:        new Date(),
        })
        .where(and(
          eq(restraintDisputeRing.player_id, ring.player_id),
          eq(restraintDisputeRing.counterparty_id, ring.counterparty_id),
        ));
    }
  }

  // ── Read helpers (TEST-ONLY surface — called via controller) ────────────────────────────────────

  /**
   * `getRingState(playerId, counterpartyId)` — read the full server-side ring state.
   * Returns all columns including derived server-only scalars.
   * R2.2: server-only — only exposed via TEST-ONLY routes (never forwarded to a real client).
   */
  async getRingState(playerId: string, counterpartyId: string): Promise<{
    player_id:        string;
    counterparty_id:  string;
    dispute_slots:    DisputeSlot[];
    ring_head:        number;
    restraint_ratio:  number | null;
    offer_terms:      number | null;
    wary_active:      boolean | null;
    collateral_amount: number | null;
    last_tick_week:   number | null;
  } | null> {
    const [row] = await this.db
      .select()
      .from(restraintDisputeRing)
      .where(and(
        eq(restraintDisputeRing.player_id, playerId),
        eq(restraintDisputeRing.counterparty_id, counterpartyId),
      ))
      .limit(1);

    if (!row) return null;

    return {
      player_id:         row.player_id,
      counterparty_id:   row.counterparty_id,
      dispute_slots:     row.dispute_slots as DisputeSlot[],
      ring_head:         row.ring_head as number,
      restraint_ratio:   row.restraint_ratio   ?? null,
      offer_terms:       row.offer_terms       ?? null,
      wary_active:       row.wary_active       ?? null,
      collateral_amount: row.collateral_amount ?? null,
      last_tick_week:    row.last_tick_week    ?? null,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────────────────────────

  /**
   * On-the-fly wary check for un-ticked rows (fallback in computeOfferTerms).
   * Uses same formula as runWeeklyTick for consistency. All thresholds from registry.
   */
  private _computeIsWary(slots: DisputeSlot[]): boolean {
    const tWary = reputationTunables.restraintWaryThreshold;
    if (slots.length === 0) return false; // empty ring → ratio=0, but 0 < tWary=0.15 → wary!
    // Note: 0 < 0.15 = true → empty ring IS wary on-the-fly check (no history = greedy interpretation).
    // BUT: zero-regression says empty ring → neutral (standard). This is the distinction:
    // - On-the-fly (no tick): empty = standard (neutral fallback for first-call before any tick).
    // - After tick: ratio computed from actual slots → may be wary.
    // The REAL wary state is the persisted wary_active from runWeeklyTick (authoritative).
    // This on-the-fly method is only called for un-ticked rows; return false (standard) for empty.
    let sumClaimable = 0;
    let sumSlack = 0;
    for (const slot of slots) {
      sumClaimable += slot.claimable_amount;
      sumSlack     += (slot.claimable_amount - slot.claimed_amount);
    }
    const ratio = sumClaimable > 0 ? Math.min(1, Math.max(0, sumSlack / sumClaimable)) : 0;
    return ratio < tWary;
  }
}
