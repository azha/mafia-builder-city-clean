// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 8 (C8) Step 3
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §3.8
//             Canon: docs/tech/04b_combat_and_conflict/diplomacy_mechanics.md §4.8 (Dispersal Suppression Pact)
//             — Diplomacy & Information Warfare C C8 — 2026-06-26 —
//
// `DispersalSuppressionPactService` — §4.8 Dispersal Suppression Pact.
//
// Purpose:
//   Anti-alliance cooperation mechanic. Two competing parties agree to jointly suppress
//   new third-party entrants in specified districts WITHOUT pausing/mutating the primary rivalry.
//   Each tick: scan suppressed districts for new-entrant signals; if detected, joint response fires.
//
// ★ Canon constraint (HARD INVARIANT):
//   "Pact does NOT pause primary rivalry." (diplomacy_mechanics.md §4.8)
//   DispersalSuppressionPactService MUST NOT write to rival_state.
//   Grep the service for any rival_state write → 0 (the reviewer⊥ will verify).
//   The E2E spec asserts rival_state is byte-unchanged after scanForNewEntrants.
//
// Methods:
//   createPact(playerId, rivalKey, districts)
//     — Inserts a dispersal_suppression_pact row with suppressed_districts.
//     — Returns { pactId, suppressedDistricts, pactDurationTicks }.
//
//   scanForNewEntrants(playerId, rivalKey, pactId, newEntrantDistrictId?)
//     — Check if a new entrant appeared in any suppressed district.
//     — If entrant detected (newEntrantDistrictId ∈ suppressed_districts) → joint response fires.
//     — No primary rivalry mutation — NEVER writes rival_state.
//     — Returns { jointResponseFired, entrantDistrict }.
//
//   readPact(pactId)
//     — Read the dispersal_suppression_pact row. Returns null if not found.
//
// C4 (determinism): NO Math.random(). NO Date.now().
//   The joint response script is derived from the pact data (deterministic).
// R2.3: pactDurationTicks and effectiveness getter-sourced (no inline scalar at compute).
// R9.3: dispersal_suppression_pact table created in migration 0095 (same-commit as C7).
// DD-CREDIBILITY: dispersal pact does NOT write credibility (not a credibility mechanic).
// Anti-rivalry-mutation: zero rival_state writes (grep confirmed — the HARD invariant).

import { Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { dispersalSuppressionPact } from '../../../db/schema/conflict_diplomacy';
import type { RivalKey } from '../rival/rival-ai.types';
import { DiplomacyTunables } from './diplomacy.tunables';

// ── JointResponseResult shape ─────────────────────────────────────────────────────────────────────

/**
 * The result of a joint response firing.
 * Canon: diplomacy_mechanics.md §4.8 — the effectiveness is getter-sourced (composite bucket).
 * R2.2 / P5 wall: the effectiveness float is server-only; the player sees the bucket (B2.2).
 */
interface JointResponseResult {
  jointResponseFired: boolean;
  entrantDistrict: number | null;
}

// ── Service ───────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class DispersalSuppressionPactService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: DiplomacyTunables,
  ) {}

  /**
   * `createPact` — create a dispersal suppression pact.
   *
   * Inserts a dispersal_suppression_pact row with:
   *   - suppressed_districts: the districts agreed to monitor jointly.
   *   - pact_duration_ticks: getter-sourced (dispersalPactDurationTicks, default 12).
   *   - joint_response_script: a deterministic script derived from the pact configuration.
   *
   * Districts are clamped to the tunable max (dispersalSuppressedDistrictsMaxPerPact, default 3).
   * Soft-ref: district ids are integer soft-refs (no FK to districts).
   *
   * @param playerId — the player creating the pact
   * @param rivalKey — the co-signatory rival
   * @param districts — the district soft-ref ids to suppress
   */
  async createPact(
    playerId: string,
    rivalKey: RivalKey,
    districts: number[],
  ): Promise<{
    pactId: string;
    suppressedDistricts: number[];
    pactDurationTicks: number;
  }> {
    // Clamp to tunable max (no inline scalar — getter-sourced)
    const maxDistricts = this.tunables.dispersalSuppressedDistrictsMaxPerPact;
    const suppressedDistricts = districts.slice(0, maxDistricts);

    // Pact duration from tunable (getter-sourced, default 12, range 6..30)
    const pactDurationTicks = this.tunables.dispersalPactDurationTicks;

    // Joint response script: deterministic config (no Math.random)
    // The effectiveness is getter-sourced — the script records the bucket for server-side use.
    const effectivenessBucket = this.tunables.dispersalJointResponseEffectivenessBucket;
    const jointResponseScript = {
      suppressed_districts: suppressedDistricts,
      effectiveness_bucket: effectivenessBucket, // composite:STANDARD ref 0.75 [PROV-Y26Q2]
      response_type:        'coordinated_economic_suppression',
    };

    // Insert pact row (DB PK via defaultRandom)
    const [row] = await this.db
      .insert(dispersalSuppressionPact)
      .values({
        player_id:           playerId,
        rival_key:           rivalKey,
        suppressed_districts: suppressedDistricts,
        joint_response_script: jointResponseScript,
        pact_duration_ticks: pactDurationTicks,
      })
      .returning({ pact_id: dispersalSuppressionPact.pact_id });

    const pactId = row!.pact_id;
    return { pactId, suppressedDistricts, pactDurationTicks };
  }

  /**
   * `scanForNewEntrants` — check for new-entrant signals in suppressed districts.
   *
   * Canon: diplomacy_mechanics.md §4.8 — "Each tick: scan suppressed_districts for new-entrant
   * signals. If detected, both parties' coordinated response scripts fire."
   *
   * ★ HARD INVARIANT: does NOT write rival_state (pact does NOT pause the primary rivalry).
   * Grep this service for any 'rival_state' write → 0 results.
   *
   * W6a C6 (P-A, found via the motif hunt for "playerId received but unused" — same class as
   * F-C6-2 `inferRivalType`) — `playerId` was ALREADY the first argument, but unused in the body:
   * the read below matched on `pact_id` alone, so any caller naming ANY `pactId` could probe a
   * rival's pact (learn whether a chosen `newEntrantDistrictId` is in `suppressed_districts`, via
   * `jointResponseFired`). The read is now joint (`pact_id = ? AND player_id = ?`); a pact
   * belonging to a DIFFERENT player now yields the SAME "pact not found" branch this method already
   * used for "no row at all" (D2 — both cases collapse to the pre-existing
   * `{ jointResponseFired: false, entrantDistrict: null }`, no new throw — this method never threw
   * on absence, so preserving that idiom keeps the two cases byte-identical per D2).
   *
   * @param playerId — the player who created the pact. Must be the ACTUAL owner of `pactId`.
   * @param rivalKey — the co-signatory rival
   * @param pactId — the DB PK of the pact row
   * @param newEntrantDistrictId — the district where a new entrant was detected (null = no entrant)
   */
  async scanForNewEntrants(
    playerId: string,
    rivalKey: RivalKey,
    pactId: string,
    newEntrantDistrictId: number | null,
  ): Promise<JointResponseResult> {
    // Read the pact to get the suppressed districts.
    // W6a C6 — joint WHERE (pact_id, player_id); 0 rows ⇒ same "not found" branch as before.
    const rows = await this.db
      .select({ suppressed_districts: dispersalSuppressionPact.suppressed_districts })
      .from(dispersalSuppressionPact)
      .where(and(eq(dispersalSuppressionPact.pact_id, pactId), eq(dispersalSuppressionPact.player_id, playerId)))
      .limit(1);

    if (rows.length === 0) {
      // Pact not found — no joint response
      return { jointResponseFired: false, entrantDistrict: null };
    }

    const suppressedDistricts = rows[0]!.suppressed_districts as number[];

    // If no new entrant or entrant not in suppressed districts → no joint response
    if (
      newEntrantDistrictId === null ||
      !suppressedDistricts.includes(newEntrantDistrictId)
    ) {
      return { jointResponseFired: false, entrantDistrict: null };
    }

    // New entrant detected in suppressed district → joint response fires.
    // ★ NO rival_state write — pact does NOT pause the primary rivalry.
    // The joint response is fired (signaled) without mutating the A-layer rival_state.
    // The effectiveness is getter-sourced (dispersalJointResponseEffectivenessBucket).
    // The response type (economic suppression) is logged in the pact's joint_response_script.
    return { jointResponseFired: true, entrantDistrict: newEntrantDistrictId };
  }

  /**
   * `readPact` — read the dispersal_suppression_pact row by PK (for _test routes).
   * Returns null if not found.
   */
  async readPact(
    pactId: string,
  ): Promise<{
    pact_id: string;
    player_id: string;
    rival_key: string;
    suppressed_districts: number[];
    pact_duration_ticks: number;
  } | null> {
    const rows = await this.db
      .select()
      .from(dispersalSuppressionPact)
      .where(eq(dispersalSuppressionPact.pact_id, pactId))
      .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      pact_id:              r.pact_id,
      player_id:            r.player_id,
      rival_key:            r.rival_key as string,
      suppressed_districts: r.suppressed_districts as number[],
      pact_duration_ticks:  r.pact_duration_ticks,
    };
  }
}
