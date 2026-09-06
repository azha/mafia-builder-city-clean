// IMPLEMENTS: docs/superpowers/plans/2026-06-16-depth-d2-impl-plan.md Task R8a + Task R8b
//             docs/tech/04c_market_reputation_insurance/reputation_mechanics.md §3.5 (:194-250)
//             docs/superpowers/specs/2026-06-16-depth-d2-reputation-chapter-design.md §1.5, §4 DD-REG-NAME, §5.1
//             docs/tech/09_data_model/schema_reputation_state.md §2 Table 5 (R9.3 backport — D2 R8b fixup commit)
//             — D2 R8a — 2026-06-17; D2 R8b — 2026-06-17
//
// `ForbiddenTriadDetectionService` — builds and maintains the forbidden-triad mechanic state.
//
// Canon signature (:250):
//   updateStrongTieMembership(playerId, contactId, interactionsCount)
//   → promote to strong-tied iff interactionsCount ≥ triad_strong_tie_threshold (from registry, no inline).
//   → maintain the strong-tie set (ordered by join time ASC, oldest first) with N_strong cap.
//   → evict the OLDEST contact when the 13th qualifies.
//   → when the set changes (new member added / evicted), maintain the pair-state rows in DB.
//
// ── Strong-tie set storage design (R8a decision) ─────────────────────────────────────────────────
//
// The ordered strong-tie membership (which contacts are in the set + when they joined, for eviction)
// is stored as JSONB on a sentinel row in the `forbidden_triad_pair_state` table:
//
//   Sentinel row: PK (player_id, pair_key = player_id)
//   Column: strong_tie_members = Array<{ contact_id: string, joined_at: number (epoch ms) }>
//           ordered by joined_at ASC (oldest first) for O(1) eviction.
//
// RATIONALE: keeps the strong-tie set co-located with its pair-state rows in the same table.
//   The sentinel pair_key = player_id is deterministic (no UUID generation needed, never a pair key).
//   Non-sentinel rows (pair-state rows) have strong_tie_members = NULL.
//   Pattern keeps migration 0056 additive (one new JSONB column on existing table — R9.3).
//
// ── Pair-state CRUD ───────────────────────────────────────────────────────────────────────────────
//
// When a new contact joins the strong-tie set (size was N before, now N+1 ≤ N_strong_cap):
//   → Create C(N, 1) = N new pair-state rows (new_contact ↔ each existing member).
//   → Each new pair starts with triadic_state=UNMET (0), anomaly_pressure=0, last_event_tick=0.
//
// When a contact is evicted (set was at N_strong_cap, 13th qualified):
//   → Evict the OLDEST contact (joined_at ASC first).
//   → Delete all pair-state rows containing the evicted contact's UUID in their pair_key.
//   → The pair_key is a canonical UUID5(sorted(id_a, id_b)). To delete, we must find all
//     pair-state rows with pair_key that contains the evicted contact — we do this by storing
//     the contact_id directly in the pair_key derivation and deleting the matching rows.
//
// ── Pair key derivation ───────────────────────────────────────────────────────────────────────────
//
// pair_key = canonical_pair_uuid(id_a, id_b):
//   → sort the two contact UUIDs lexicographically (canonical ordering for dedup).
//   → The pair_key stored in DB is used as a lookup for pair-state retrieval.
//   → We derive pair_key using a deterministic approach:
//       sorted = [id_a, id_b].sort()   (lexicographic)
//       seed string = sorted[0] + ':' + sorted[1]
//       pair_key = UUID v5 of seed (namespace = DNS / fixed constant)
//     But since we also need to find all pairs containing a contact, we maintain a secondary
//     index via JSONB search — we query by pair_key but must enumerate pairs on eviction.
//     At R8a (no weekly tick), we enumerate pairs by looking up the pair_key for each
//     combination of (evictedId, remainingId) and deleting them.
//
// ── Quadratic bound ───────────────────────────────────────────────────────────────────────────────
//
// With N_strong_cap = 12: max pairs = C(12, 2) = 12 × 11 / 2 = 66.
// The service enforces this by:
//   (a) Capping the set at N_strong_cap (oldest evicts at 13th).
//   (b) Only creating pair rows for the new contact ↔ existing set members.
// This is structural enforcement — NOT an explicit "≤66" check.
//
// ── R2.2 / P5 ────────────────────────────────────────────────────────────────────────────────────
//
// anomaly_pressure_bucket, triadic_state, last_event_tick: server-only (never forwarded to client).
// strong_tie_members (sentinel): server-only (never forwarded to client).
// Client surface: dashed lines thickening (:208) — exposed via R8b/R12b (not this chunk).
//
// ── DD-REG-NAME ──────────────────────────────────────────────────────────────────────────────────
//
// N_strong cap:           `reputation.forbidden_triad_n_strong_cap`  — NEW registry-add (R8a, gdd/14 D2-R8a).
// Strong-tie threshold:   `triad_strong_tie_threshold`               — REUSE pre-existing gdd/14 L975.
// NO inline 12 anywhere in this service for either value.
//
// ── R8b additions ────────────────────────────────────────────────────────────────────────────────
//
// evaluatePairs(playerId, ctx, weekId)   — weekly tick: for each UNMET pair, accrue
//   anomaly_pressure_bucket += Δ/week (triad_observer_attention_share from registry).
//   If anomaly_pressure_bucket >= H_observer (triad_H_observer_weeks from registry):
//     → flip observer_interest_flag = true for that pair.
//     → call triggerObserverProbe(pairKey, gameMinute) to emit ForbiddenTriadInterestFlag.
//   Idempotent per week via last_eval_week guard on each pair row.
//
// triggerObserverProbe(playerId, pairKey, gameMinute)
//   — emits ForbiddenTriadInterestFlag on the CityEventBus (the MIS routing seam for R9).
//   TD-120: observer-NPC actor itself has no real producer at D2 scope. The flag transition
//   happens in DB (observer_interest_flag = true); the bus event is the canonical MIS seam.
//   The NPC behavior (routing to MIS investigation queue) is deferred to R13 (Insurance+MIS lot).
//   Emit+defer is the honest contract per the plan.
//
// introducePair(playerId, contactIdA, contactIdB)  — dissolve action: transition the pair to
//   BONDED (triadic_state = BONDED) and decay pressure by triad_pressure_decay_acknowledged_weekly
//   (from registry). Canon :210: "Introducing the pair (after which they may bond and start
//   cutting side deals player can't see)."
//
// dropContact(playerId, contactId)  — dissolve action: removes the contact from the strong-tie
//   set and deletes all its pair-state rows. REUSE R8a eviction path
//   (_deleteContactPairs + _saveStrongTieMembers).
//
// ── R8b tunables (all from registry — no inline) ─────────────────────────────────────────────────
//
//   triadHObserverWeeks               — H_observer threshold (default 14). Registry-FIRST.
//   triadObserverAttentionShare       — Δ_per_week accrual (default 0.12). Registry-FIRST.
//   triadPressureDecayAcknowledgedWeekly — decay on introduction (default 0.06). Registry-FIRST.
//
// ── Zero-regression invariants ───────────────────────────────────────────────────────────────────
//
// - A player with no strong-tied contacts is unaffected (empty set → no pair rows → no pressure).
// - A world with only 1 strong-tied contact has 0 pairs (C(1,0) = 0 — no pair formed yet).
// - interactionsCount < threshold → no change to set or pairs.
// - Re-adding an already-present contact is a no-op (idempotent, no duplicate in set, no new pairs).
// - Re-running evaluatePairs for the same weekId on a pair → skipped (last_eval_week guard).
// - BONDED/COLLABORATING pairs are not affected by the weekly pressure tick (:201 — only UNMET).
//
// R9.3: matches schema in docs/tech/09_data_model/schema_reputation_state.md §2 Table 5
//       (forbidden_triad_pair_state including migrations 0056 + 0057 additive columns).

import { Injectable, Inject } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { createHash } from 'node:crypto';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { forbiddenTriadPairState } from '../../db/schema/reputation_state';
import { reputationTunables } from './reputation-tunables';
import type { CitySimTickContext } from '../../citysim/scheduler/city_sim_system';
import {
  CityEventBus,
  type ForbiddenTriadInterestFlagEvent,
} from '../../citysim/events/city-event-bus';

// ── TriadicState enum ─────────────────────────────────────────────────────────────────────────────

/** Canon :197 — TriadicState enum for a strong-tied pair. */
export enum TriadicState {
  UNMET         = 0,
  MET_ONCE      = 1,
  BONDED        = 2,
  COLLABORATING = 3,
}

// ── Strong-tie set types ──────────────────────────────────────────────────────────────────────────

/** A single member of the strong-tie set. */
export interface StrongTieMember {
  /** UUID of the contact. */
  contact_id: string;
  /** Epoch ms timestamp of when this contact joined the strong-tie set (for eviction ordering). */
  joined_at:  number;
}

/** The result of updateStrongTieMembership(). */
export interface UpdateMembershipResult {
  /** Whether the contact was newly promoted to strong-tied (false if below threshold or already present). */
  promoted:   boolean;
  /** Current size of the strong-tie set after the update. */
  setSize:    number;
  /** Current pair count for this player after the update. */
  pairCount:  number;
}

// ── Pair key derivation ───────────────────────────────────────────────────────────────────────────

/**
 * Derive a canonical pair key UUID for two contact IDs.
 *
 * Algorithm: sort the two contact UUIDs lexicographically, then derive a deterministic UUID
 * from the concatenated seed string `sorted[0] + ':' + sorted[1]` using SHA-256, truncated
 * to 16 bytes and formatted as a UUID v4-shaped string (no real namespace needed — just uniqueness).
 *
 * Zero-collision guarantee: different contact pairs → different sorted seeds → different keys.
 * Symmetry guarantee: pairKey(A, B) === pairKey(B, A) for any A, B.
 */
function derivePairKey(contactIdA: string, contactIdB: string): string {
  const sorted = [contactIdA, contactIdB].sort();
  const seed   = `${sorted[0]!}:${sorted[1]!}`;
  const hash   = createHash('sha256').update(seed).digest('hex');
  // Format as UUID: take first 32 hex chars, insert hyphens at positions 8, 12, 16, 20.
  // Set version nibble (position 12) to 5, variant nibble (position 16) to 8.
  const h = hash.slice(0, 32);
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    '5' + h.slice(13, 16),
    '8' + h.slice(17, 20),
    h.slice(20, 32),
  ].join('-');
}

// ── ForbiddenTriadDetectionService ───────────────────────────────────────────────────────────────

@Injectable()
export class ForbiddenTriadDetectionService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly cityEventBus: CityEventBus,
  ) {}

  /**
   * Canon signature (:250): `updateStrongTieMembership(playerId, contactId, interactionsCount)`.
   *
   * Promotes `contactId` to the strong-tied set for `playerId` iff:
   *   interactionsCount ≥ triad_strong_tie_threshold  (registry, REUSE gdd/14 L975)
   *
   * If promoted:
   *   (a) If the contact is already in the set → no-op (idempotent).
   *   (b) If the set is at N_strong_cap (from registry: `reputation.forbidden_triad_n_strong_cap`):
   *       → evict the OLDEST contact (joined_at ASC first).
   *       → delete all pair-state rows containing the evicted contact.
   *   (c) Add the new contact to the set (joined_at = now).
   *   (d) Create pair-state rows for (new_contact ↔ each remaining member) with triadic_state=UNMET.
   *
   * The N_strong cap + pair deletion together enforce the ≤66 pair bound quadratically.
   *
   * Returns { promoted, setSize, pairCount } after the update.
   *
   * R2.2: strong_tie_members is server-only (never forwarded to client).
   * DD-REG-NAME: N_strong cap + threshold both read from registry (no inline numeric literals).
   */
  async updateStrongTieMembership(
    playerId: string,
    contactId: string,
    interactionsCount: number,
  ): Promise<UpdateMembershipResult> {
    // DD-REG-NAME: read from registry — no inline numeric literals.
    const threshold  = reputationTunables.triadStrongTieThreshold;
    const nStrongCap = reputationTunables.forbiddenTriadNStrongCap;

    // Below threshold → no promotion.
    if (interactionsCount < threshold) {
      const setSize  = await this._getSetSize(playerId);
      const pairCount = await this._getPairCount(playerId);
      return { promoted: false, setSize, pairCount };
    }

    // Load the current strong-tie set.
    const currentMembers = await this._loadStrongTieMembers(playerId);

    // Already in set → idempotent no-op (re-promote at threshold is valid, no duplicate).
    const alreadyPresent = currentMembers.some((m) => m.contact_id === contactId);
    if (alreadyPresent) {
      const pairCount = await this._getPairCount(playerId);
      return { promoted: false, setSize: currentMembers.length, pairCount };
    }

    // Determine if eviction is needed.
    let survivingMembers = [...currentMembers];
    let evictedContactId: string | null = null;

    if (survivingMembers.length >= nStrongCap) {
      // Evict the OLDEST member (first in joined_at ASC order — members stored oldest-first).
      const oldest = survivingMembers[0]!;
      evictedContactId = oldest.contact_id;
      survivingMembers = survivingMembers.slice(1);
    }

    // Add the new contact with current timestamp.
    const newMember: StrongTieMember = {
      contact_id: contactId,
      joined_at:  Date.now(),
    };
    const updatedMembers = [...survivingMembers, newMember];

    // Persist the updated set on the sentinel row.
    await this._saveStrongTieMembers(playerId, updatedMembers);

    // If a contact was evicted, delete its pair-state rows.
    if (evictedContactId !== null) {
      await this._deleteContactPairs(playerId, evictedContactId, survivingMembers);
    }

    // Create pair-state rows for (new_contact ↔ each surviving member).
    await this._createPairsForNewContact(playerId, contactId, survivingMembers);

    const pairCount = await this._getPairCount(playerId);
    return { promoted: true, setSize: updatedMembers.length, pairCount };
  }

  /**
   * Read the current strong-tie set for a player.
   * Returns the ordered members array (oldest first) and the set size.
   * TEST-ONLY surface (exposed via _test routes in the controller).
   * R2.2: server-only — never forwarded to real client.
   */
  async getStrongTieSet(
    playerId: string,
  ): Promise<{ members: string[]; setSize: number }> {
    const members = await this._loadStrongTieMembers(playerId);
    return {
      members: members.map((m) => m.contact_id),
      setSize: members.length,
    };
  }

  /**
   * Read all pair-state rows for a player (TEST-ONLY assertion surface).
   * Returns the pair rows and the total pair count (excluding the sentinel row).
   * R2.2: anomaly_pressure_bucket etc. are server-only — exposed TEST-ONLY for DB assertion.
   */
  async getPairStates(
    playerId: string,
  ): Promise<{ pairs: Array<Record<string, unknown>>; pairCount: number }> {
    // Exclude the sentinel row (pair_key = player_id) from the pair list.
    const allRows = await this.db
      .select()
      .from(forbiddenTriadPairState)
      .where(eq(forbiddenTriadPairState.player_id, playerId));

    const pairRows = allRows.filter((r) => r.pair_key !== playerId);

    return {
      pairs: pairRows.map((r) => ({
        pair_key:                r.pair_key,
        triadic_state:           r.triadic_state,
        anomaly_pressure_bucket: r.anomaly_pressure_bucket,
        last_event_tick:         r.last_event_tick,
        // R8b fields (may be null/false before first weekly tick).
        observer_interest_flag:  r.observer_interest_flag ?? false,
        last_eval_week:          r.last_eval_week ?? null,
      })),
      pairCount: pairRows.length,
    };
  }

  // ── R8b: weekly tick + dissolve actions ──────────────────────────────────────────────────────

  /**
   * `evaluatePairs(playerId, ctx, weekId)` — the weekly tick.
   *
   * For each non-sentinel pair row where `triadic_state = UNMET (0)`:
   *   1. Idempotence check: skip if `last_eval_week === weekId` (one accrual per week, per pair).
   *   2. Accrue: `anomaly_pressure_bucket += Δ_per_week`
   *              where Δ = `triadObserverAttentionShare` (registry, no inline).
   *   3. If `anomaly_pressure_bucket >= triadHObserverWeeks` (H_observer, registry, no inline):
   *      → Set `observer_interest_flag = true` for this pair.
   *      → Call `triggerObserverProbe(playerId, pairKey, ctx.gameMinute)`.
   *   4. Persist: update anomaly_pressure_bucket + observer_interest_flag + last_eval_week.
   *
   * DD-REG-NAME: all thresholds/Δ from registry (no inline numeric literals).
   * R2.2: anomaly_pressure_bucket + observer_interest_flag are server-only (never to client).
   * Canon :201-206.
   *
   * TD-120: observer-NPC actor itself has no real producer at D2 scope — triggerObserverProbe
   * emits the canonical MIS seam event; NPC behavior deferred to R13 (Insurance+MIS lot).
   */
  async evaluatePairs(
    playerId: string,
    ctx: CitySimTickContext,
    weekId: number,
  ): Promise<void> {
    // DD-REG-NAME: read from registry — no inline numeric literals.
    const deltaPerWeek = reputationTunables.triadObserverAttentionShare;
    const hObserver    = reputationTunables.triadHObserverWeeks;

    // Fetch all rows for this player (excluding the sentinel row pair_key = player_id).
    const allRows = await this.db
      .select()
      .from(forbiddenTriadPairState)
      .where(eq(forbiddenTriadPairState.player_id, playerId));

    for (const row of allRows) {
      // Skip the sentinel row (pair_key = player_id — strong-tie set storage).
      if (row.pair_key === playerId) continue;

      // Zero-regression: only accrue for UNMET pairs (:201 — "for each pair where triadic_state = UNMET").
      if (row.triadic_state !== TriadicState.UNMET) continue;

      // Idempotence guard: skip if this week's tick already ran for this pair.
      if (row.last_eval_week === weekId) continue;

      // Accrue pressure.
      const newPressure = (row.anomaly_pressure_bucket ?? 0) + deltaPerWeek;

      // H_observer threshold check: flip interest_flag if newly crossed.
      const wasAlreadyFlagged = row.observer_interest_flag === true;
      const newFlag = wasAlreadyFlagged || (newPressure >= hObserver);

      // Persist the updated state.
      await this.db
        .update(forbiddenTriadPairState)
        .set({
          anomaly_pressure_bucket: newPressure,
          observer_interest_flag:  newFlag,
          last_eval_week:          weekId,
          updated_at:              new Date(),
        })
        .where(and(
          eq(forbiddenTriadPairState.player_id, playerId),
          eq(forbiddenTriadPairState.pair_key,  row.pair_key),
        ));

      // Emit the ForbiddenTriadInterestFlag event when the flag NEWLY flips.
      // TD-120: observer-NPC actor without real producer — emit+defer (R13 wires NPC behavior).
      if (!wasAlreadyFlagged && newFlag) {
        this.triggerObserverProbe(playerId, row.pair_key, ctx.gameMinute);
      }
    }
  }

  /**
   * `triggerObserverProbe(playerId, pairKey, gameMinute)` — emits `ForbiddenTriadInterestFlag` on
   * the CityEventBus (the MIS routing seam for R9).
   *
   * The observer NPC's `interest_flag` has been set in DB by `evaluatePairs()` before this call.
   * This method emits the canonical cross-system event that R9 (MIS routing acceptor) subscribes to.
   *
   * TD-120: the observer-NPC actor itself (the NPC that routes this into MIS investigation queues)
   * has no real producer at D2 scope. Emit+defer is the honest contract per the plan: the DB flag
   * transitions, the bus event fires, the NPC behavior (MIS routing) is deferred to R13
   * (Insurance+MIS lot). No consumer subscribes in R8b — no-op delivery until R9 wires the acceptor.
   *
   * P5/R2.2: the event carries ONLY qualitative identity (playerId + pairKey + gameMinute) — never
   * the raw anomaly_pressure_bucket float (server-only; player sees dashed lines + NPC cues :208).
   */
  triggerObserverProbe(playerId: string, pairKey: string, gameMinute: number): void {
    const event: ForbiddenTriadInterestFlagEvent = {
      type:        'forbidden_triad_interest_flag',
      playerId,
      pairKey,
      gameMinute,
    };
    this.cityEventBus.emitForbiddenTriadInterestFlag(event);
  }

  /**
   * `introducePair(playerId, contactIdA, contactIdB)` — dissolve action: introduce the pair.
   *
   * Canon :210: "Introducing the pair (after which they may bond and start cutting side deals
   * player can't see)."
   *
   * Sets the pair's `triadic_state` to BONDED (2) and applies the pressure decay:
   *   new_pressure = current_pressure * (1 - triadPressureDecayAcknowledgedWeekly)
   * where the decay factor is read from the registry (no inline).
   *
   * A pair that is already BONDED or COLLABORATING is unaffected (no double-bond).
   *
   * DD-REG-NAME: decay factor from registry (`triadPressureDecayAcknowledgedWeekly`).
   * R2.2: anomaly_pressure_bucket is server-only (never to client).
   * Canon :210.
   */
  async introducePair(
    playerId: string,
    contactIdA: string,
    contactIdB: string,
  ): Promise<void> {
    const pairKey = derivePairKey(contactIdA, contactIdB);

    // DD-REG-NAME: decay factor from registry — no inline 0.06.
    const decayFactor = reputationTunables.triadPressureDecayAcknowledgedWeekly;

    // Read the current row.
    const rows = await this.db
      .select()
      .from(forbiddenTriadPairState)
      .where(and(
        eq(forbiddenTriadPairState.player_id, playerId),
        eq(forbiddenTriadPairState.pair_key,  pairKey),
      ))
      .limit(1);

    if (rows.length === 0) return; // No pair to introduce (no-op — pair doesn't exist yet).

    const row = rows[0]!;

    // Zero-regression: only apply introduction on UNMET or MET_ONCE pairs (not already BONDED+).
    // For BONDED/COLLABORATING, this is a no-op per canon intent.
    if (row.triadic_state === TriadicState.BONDED || row.triadic_state === TriadicState.COLLABORATING) {
      return;
    }

    // Apply pressure decay on introduction.
    const currentPressure = row.anomaly_pressure_bucket ?? 0;
    const decayedPressure = currentPressure * (1 - decayFactor);

    await this.db
      .update(forbiddenTriadPairState)
      .set({
        triadic_state:           TriadicState.BONDED,
        anomaly_pressure_bucket: decayedPressure,
        updated_at:              new Date(),
      })
      .where(and(
        eq(forbiddenTriadPairState.player_id, playerId),
        eq(forbiddenTriadPairState.pair_key,  pairKey),
      ));
  }

  /**
   * `dropContact(playerId, contactId)` — dissolve action: quietly retire a contact.
   *
   * Canon :212: "Quietly retiring one of the contacts."
   *
   * Removes the contact from the strong-tie set and deletes all pair-state rows containing
   * this contact. REUSE R8a eviction path (_deleteContactPairs + _saveStrongTieMembers).
   *
   * R2.2: server-only operation — the client surface change (dashed lines disappear) is at R12b.
   */
  async dropContact(
    playerId: string,
    contactId: string,
  ): Promise<void> {
    // Load the current strong-tie set.
    const currentMembers = await this._loadStrongTieMembers(playerId);

    // Find and remove the contact from the set.
    const newMembers = currentMembers.filter((m) => m.contact_id !== contactId);

    if (newMembers.length === currentMembers.length) {
      // Contact not in the set → no-op (idempotent).
      return;
    }

    // Persist the updated set (without the dropped contact).
    await this._saveStrongTieMembers(playerId, newMembers);

    // Delete all pair-state rows involving the dropped contact.
    await this._deleteContactPairs(playerId, contactId, newMembers);
  }

  // ── Private helpers ───────────────────────────────────────────────────────────────────────────

  /** Load the ordered strong-tie members from the sentinel row. Empty array if no row exists. */
  private async _loadStrongTieMembers(playerId: string): Promise<StrongTieMember[]> {
    const rows = await this.db
      .select({ strong_tie_members: forbiddenTriadPairState.strong_tie_members })
      .from(forbiddenTriadPairState)
      .where(and(
        eq(forbiddenTriadPairState.player_id, playerId),
        eq(forbiddenTriadPairState.pair_key,  playerId),  // sentinel: pair_key = player_id
      ))
      .limit(1);

    if (rows.length === 0 || rows[0]!.strong_tie_members === null) {
      return [];
    }

    const raw = rows[0]!.strong_tie_members as StrongTieMember[];
    return Array.isArray(raw) ? raw : [];
  }

  /** Upsert the sentinel row with the updated members array. */
  private async _saveStrongTieMembers(
    playerId: string,
    members: StrongTieMember[],
  ): Promise<void> {
    await this.db
      .insert(forbiddenTriadPairState)
      .values({
        player_id:               playerId,
        pair_key:                playerId,   // sentinel: pair_key = player_id
        triadic_state:           0,          // ignored on sentinel row
        anomaly_pressure_bucket: 0,          // ignored on sentinel row
        last_event_tick:         0,          // ignored on sentinel row
        strong_tie_members:      members as unknown as null,
      })
      .onConflictDoUpdate({
        target:  [forbiddenTriadPairState.player_id, forbiddenTriadPairState.pair_key],
        set:     {
          strong_tie_members: members as unknown as null,
          updated_at:         new Date(),
        },
      });
  }

  /**
   * Delete all pair-state rows in DB for the evicted contact.
   *
   * For each surviving member, compute the pair_key(evictedId, survivorId) and delete
   * the corresponding row from the DB. This removes the evicted contact's pairs.
   */
  private async _deleteContactPairs(
    playerId: string,
    evictedContactId: string,
    survivingMembers: StrongTieMember[],
  ): Promise<void> {
    if (survivingMembers.length === 0) return;

    const keysToDelete = survivingMembers.map((m) =>
      derivePairKey(evictedContactId, m.contact_id),
    );

    await this.db
      .delete(forbiddenTriadPairState)
      .where(and(
        eq(forbiddenTriadPairState.player_id, playerId),
        inArray(forbiddenTriadPairState.pair_key, keysToDelete),
      ));
  }

  /**
   * Create pair-state rows for (new contact ↔ each existing surviving member).
   * Each new pair starts with triadic_state=UNMET (0), anomaly_pressure=0, last_event_tick=0.
   */
  private async _createPairsForNewContact(
    playerId: string,
    newContactId: string,
    existingMembers: StrongTieMember[],
  ): Promise<void> {
    if (existingMembers.length === 0) return;

    const newRows = existingMembers.map((m) => ({
      player_id:               playerId,
      pair_key:                derivePairKey(newContactId, m.contact_id),
      triadic_state:           0 as number,   // UNMET (zero-regression: new pairs start unmet)
      anomaly_pressure_bucket: 0 as number,
      last_event_tick:         0 as number,
      strong_tie_members:      null,          // not the sentinel row
    }));

    // Use INSERT ... ON CONFLICT DO NOTHING for idempotence (re-runs don't fail).
    for (const row of newRows) {
      await this.db
        .insert(forbiddenTriadPairState)
        .values(row)
        .onConflictDoNothing();
    }
  }

  /** Count the number of pair-state rows for the player (excluding the sentinel row). */
  private async _getPairCount(playerId: string): Promise<number> {
    const allRows = await this.db
      .select({ pair_key: forbiddenTriadPairState.pair_key })
      .from(forbiddenTriadPairState)
      .where(eq(forbiddenTriadPairState.player_id, playerId));

    // Exclude sentinel row (pair_key = player_id).
    return allRows.filter((r) => r.pair_key !== playerId).length;
  }

  /** Read the current set size from the sentinel row. */
  private async _getSetSize(playerId: string): Promise<number> {
    const members = await this._loadStrongTieMembers(playerId);
    return members.length;
  }
}
