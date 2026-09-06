// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 8 (C8) Step 3
//             Design: docs/superpowers/specs/2026-06-24-04b-C-diplomacy-infowar-design.md §3.6
//             Canon: docs/tech/04b_combat_and_conflict/diplomacy_mechanics.md §4.6 (Revelation Trap)
//             — Diplomacy & Information Warfare C C8 — 2026-06-26 —
//
// `RevelationTrapService` — §4.6 Revelation Trap — mechanism-design offer that reveals rival intent.
//
// Purpose:
//   A structured offer designed so that the rival's choice reveals their private type
//   (honor_intent vs defect_intent) without the rival realizing the offer is a test.
//   The detection draw GATES whether the rival detects the trap (seeded, not Math.random).
//   Iron Throat has a higher detection probability (composite:HIGH vs STANDARD for others).
//
// Methods:
//   composeOffer(playerId, rivalKey, gameMinute)
//     — Creates a revelation_trap row with an offer_menu (OfferOption[]).
//     — Returns { trapId, offerMenu, offerOptionsCount }.
//
//   inferRivalType(playerId, rivalKey, trapId, chosenOptionIndex, gameMinute)
//     — The rival chose an option. Infers honor_intent or defect_intent from the choice.
//     — The seeded detection draw GATES whether the trap was detected by the rival.
//       draw = makeRng(`${seedPrefix}:${rivalKey}:${gameDay}`).next()
//       detected = draw < detectionProbability
//     — Updates the revelation_trap row (rival_type_inferred).
//     — Returns { rivalTypeInferred, detected, drawValue }.
//
// Detection:
//   - Iron Throat (rival_key='iron_throat'): uses revelationTrapDetectionProbabilityIronThroatBucket
//     (composite:HIGH ref 0.30).
//   - All other rivals: fixed lower threshold (composite:STANDARD ref 0.20 [PROV-Y26Q2]).
//     OQ-C3: only Iron Throat has a named tunable; others use STANDARD-equivalent.
//   - draw < detection_probability → detected (rival recognized the trap)
//   - draw >= detection_probability → not detected (trap invisible to rival)
//
// Canon:
//   - offer_menu: 3 options (revelationOfferOptionsCount getter = 3, range 2..5).
//   - honored option (index 0): indicates honor_intent.
//   - defected option (index 1): indicates defect_intent.
//
// C4 (determinism): NO Math.random(). NO Date.now().
//   Seed: `${seedPrefix}:${rivalKey}:${gameDay}` where gameDay = floor(gameMinute / 1440).
//   seedPrefix: from revelationTrapDetectionSeedPrefix getter (default 'reveal_trap').
//
// R2.3: detection thresholds getter-sourced via DiplomacyTunables. No inline scalar at compute.
// R9.3: revelation_trap table created in migration 0095 (same-commit as C7).

import { Injectable, Inject } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { revelationTrap } from '../../../db/schema/conflict_diplomacy';
import { makeRng } from '../../../common/seeded-rng';
import { ApiError } from '../../../protocol/api-error';
import type { RivalKey } from '../rival/rival-ai.types';
import { DiplomacyTunables } from './diplomacy.tunables';
import type { RivalIntentType } from './diplomacy.types';

// ── Composite ref-float map for detection probability ─────────────────────────────────────────────
// Canon: diplomacy_mechanics.md :203
//   Iron Throat: composite:HIGH ref 0.30 (highest sophistication — more likely to detect the trap)
//   Other rivals: [PROV-Y26Q2] composite:STANDARD ref 0.20 (lower detection probability)

/** Ref floats for revelation trap detection probability. */
const DETECTION_PROB_REF_MAP: Record<string, number> = {
  'composite:standard': 0.20,
  'composite:high':     0.30,
  'composite:low':      0.10,
};

/** Translate a composite bucket string to its ref float. Defensive: falls back to 0. */
function resolveCompositeRef(bucketString: string, refMap: Record<string, number>): number {
  const key = bucketString.toLowerCase().trim();
  if (key in refMap) return refMap[key]!;
  const parsed = Number(bucketString);
  if (!Number.isNaN(parsed)) return parsed;
  return 0;
}

// ── OfferOption shape ─────────────────────────────────────────────────────────────────────────────

/**
 * An option in the revelation offer menu.
 * Option index 0 → honoring option (honor_intent).
 * Option index 1 → defecting option (defect_intent).
 * Additional options (if offerOptionsCount > 2) → ambiguous decoys.
 */
interface OfferOption {
  index: number;
  label: string;
  /** The intent branch this option reveals (null for decoy options). */
  reveals: 'honor' | 'defect' | 'decoy';
}

// ── Service ───────────────────────────────────────────────────────────────────────────────────────

@Injectable()
export class RevelationTrapService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tunables: DiplomacyTunables,
  ) {}

  /**
   * `composeOffer` — create a revelation trap with a structured offer menu.
   *
   * The offer menu is designed so that:
   *   - option 0 = the honoring option → if chosen → honor_intent inferred
   *   - option 1 = the defecting option → if chosen → defect_intent inferred
   *   - option 2+ = decoy options (if offerOptionsCount > 2)
   *
   * The offer menu is stored in the revelation_trap row.
   * Returns { trapId, offerMenu, offerOptionsCount }.
   *
   * @param playerId — the player composing the offer
   * @param rivalKey — the target rival
   * @param gameMinute — current game time (deterministic seed input)
   */
  async composeOffer(
    playerId: string,
    rivalKey: RivalKey,
    gameMinute: number,
  ): Promise<{
    trapId: string;
    offerMenu: OfferOption[];
    offerOptionsCount: number;
  }> {
    // Get the option count from the tunable (default 3, range 2..5)
    const offerOptionsCount = this.tunables.revelationOfferOptionsCount;

    // Build the offer menu
    const offerMenu: OfferOption[] = [
      { index: 0, label: 'honor_cooperation_offer', reveals: 'honor' },
      { index: 1, label: 'defect_side_deal_offer',  reveals: 'defect' },
    ];
    // Add decoy options if offerOptionsCount > 2
    for (let i = 2; i < offerOptionsCount; i++) {
      offerMenu.push({ index: i, label: `decoy_option_${i}`, reveals: 'decoy' });
    }

    // Insert the revelation_trap row — PK uuid generated by DB
    const [row] = await this.db
      .insert(revelationTrap)
      .values({
        player_id:   playerId,
        rival_key:   rivalKey,
        offer_menu:  offerMenu,
        rival_type_inferred: null,
      })
      .returning({ trap_id: revelationTrap.trap_id });

    const trapId = row!.trap_id;
    return { trapId, offerMenu, offerOptionsCount };
  }

  /**
   * `inferRivalType` — the rival chose an option; infer their intent + check detection.
   *
   * Steps:
   * 1. Read the trap row (offers + current state).
   * 2. Infer rivalTypeInferred from the chosenOptionIndex:
   *    - index 0 → honor_intent
   *    - index 1 (or any non-0 non-decoy) → defect_intent
   * 3. Compute the seeded detection draw:
   *    - seedPrefix from revelationTrapDetectionSeedPrefix getter (default 'reveal_trap').
   *    - gameDay = floor(gameMinute / 1440).
   *    - draw = makeRng(`${seedPrefix}:${rivalKey}:${gameDay}`).next()
   * 4. Get detection probability:
   *    - Iron Throat → revelationTrapDetectionProbabilityIronThroatBucket (composite:HIGH ref 0.30)
   *    - Others → composite:STANDARD ref 0.20 [PROV-Y26Q2]
   * 5. ★ GATE: detected = draw < detectionProbability
   * 6. Update revelation_trap row with rival_type_inferred.
   * 7. Return { rivalTypeInferred, detected, drawValue }.
   *
   * W6a C6 (P-A, F-C6-2) — `playerId` was ALREADY the first argument, but unused in the body: the
   * UPDATE below matched on `trap_id` alone, so any caller naming ANY `trapId` could overwrite
   * `rival_type_inferred` on a trap composed by a different player. The WHERE is now joint
   * (`trap_id = ? AND player_id = ?`, single round-trip) and the affected-row count is checked:
   * 0 rows ⇒ the trap is either absent or belongs to another player — both collapse to the SAME
   * 404 `RESOURCE_NOT_FOUND` (D2 existence-masking, no new error code).
   *
   * @param playerId — the player who composed the offer. Must be the ACTUAL owner of `trapId`.
   * @param rivalKey — the target rival
   * @param trapId — the trap row PK
   * @param chosenOptionIndex — the option the rival chose (0=honor, 1=defect, 2+=decoy)
   * @param gameMinute — current game time (deterministic seed input)
   * @throws ApiError('RESOURCE_NOT_FOUND') if `trapId` does not resolve to a `playerId`-owned trap.
   */
  async inferRivalType(
    playerId: string,
    rivalKey: RivalKey,
    trapId: string,
    chosenOptionIndex: number,
    gameMinute: number,
  ): Promise<{
    rivalTypeInferred: RivalIntentType;
    detected: boolean;
    drawValue: number;
  }> {
    // 1. Infer intent from chosen option
    const rivalTypeInferred: RivalIntentType =
      chosenOptionIndex === 0 ? 'honor_intent' : 'defect_intent';

    // 2. Compute the seeded detection draw (the GATE — C4 deterministic, NOT Math.random)
    const seedPrefix = this.tunables.revelationTrapDetectionSeedPrefix; // 'reveal_trap'
    const gameDay = Math.floor(gameMinute / 1440);
    const drawValue = makeRng(`${seedPrefix}:${rivalKey}:${gameDay}`).next();

    // 3. Get detection probability (getter-sourced, no inline scalar at compute)
    const detectionBucket = rivalKey === 'iron_throat'
      ? this.tunables.revelationTrapDetectionProbabilityIronThroatBucket // composite:HIGH → 0.30
      : 'composite:standard'; // [PROV-Y26Q2] — other rivals use STANDARD ref 0.20
    const detectionProbability = resolveCompositeRef(detectionBucket, DETECTION_PROB_REF_MAP);

    // 4. ★ GATE: detected = draw < detectionProbability
    //    FALSIFIABLE: same rival+bucket, day=4 draw=0.05607196 < 0.30 → detected=true
    //                             same rival+bucket, day=0 draw=0.68516846 >= 0.30 → detected=false
    const detected = drawValue < detectionProbability;

    // 5. Update the revelation_trap row with the inferred intent.
    // W6a C6 (F-C6-2) — joint WHERE (trap_id, player_id); 0 rows affected ⇒ 404 (see docblock).
    const [updated] = await this.db
      .update(revelationTrap)
      .set({ rival_type_inferred: rivalTypeInferred })
      .where(and(eq(revelationTrap.trap_id, trapId), eq(revelationTrap.player_id, playerId)))
      .returning({ trap_id: revelationTrap.trap_id });
    if (!updated) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `inferRivalType: trap ${trapId} not found for player ${playerId}`,
      });
    }

    return { rivalTypeInferred, detected, drawValue };
  }

  /**
   * `readTrap` — read the revelation_trap row by PK (for _test routes).
   * Returns null if not found.
   *
   * W6a C6 (P-A, F-C6-4) — `playerId` is now a required FIRST argument (pre-fix, `readTrap(trapId)`
   * took no `playerId` at all: ANY caller naming ANY `trapId` got back the full row — `offer_menu`
   * + `rival_type_inferred`, the honor/defect intent this mechanic exists to keep hidden from the
   * player composing a DIFFERENT trap). The read is joint (`trap_id = ? AND player_id = ?`); a trap
   * belonging to a DIFFERENT player now yields the SAME `null` this method already returned for
   * "no row at all" — the service keeps its pre-existing null-on-absence idiom (D2: both cases are
   * indistinguishable to the caller). The `_test` route (`readRevelationTrap`,
   * `diplomacy-test.controller.ts`) converts this `null` to a 404 `RESOURCE_NOT_FOUND` — see that
   * route's own docblock for why the throw lives there and not here.
   *
   * @param playerId — the caller's player uuid. Must be the ACTUAL owner of `trapId`.
   * @param trapId — the trap row PK.
   */
  async readTrap(
    playerId: string,
    trapId: string,
  ): Promise<{
    trap_id: string;
    player_id: string;
    rival_key: string;
    offer_menu: unknown;
    rival_type_inferred: string | null;
  } | null> {
    const rows = await this.db
      .select()
      .from(revelationTrap)
      .where(and(eq(revelationTrap.trap_id, trapId), eq(revelationTrap.player_id, playerId)))
      .limit(1);
    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      trap_id:             r.trap_id,
      player_id:           r.player_id,
      rival_key:           r.rival_key as string,
      offer_menu:          r.offer_menu,
      rival_type_inferred: r.rival_type_inferred,
    };
  }
}
