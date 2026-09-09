// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1c-disclosure-design.md §4 chunks C2 (D10) + C3
//             (D4, "le verrou dérivé").
//             Canon: docs/tech/11_onboarding/tutorial_system_architecture.md:153 ("au plus une révélation
//             neuve par session […] La ProgressiveDisclosureSchedule garantit qu'un slot révélé est
//             consommé").
//             — W1.1-c C2 — 2026-08-12 — C3 — 2026-08-12 —
//
// `DisclosureScheduleService` — "le service qui les parcourt" (design §4 C2's own words). C2's own pick
// (`pickSmallestScheduleRank`, PURE, unchanged since C2): walks `DISCLOSURE_SLOTS_IN_RANK_ORDER`
// (disclosure-schedule-catalogue.ts, D10) and returns the FIRST slot's `TutorialId` that is currently a
// member of the caller-supplied eligible set (`OnboardingOverlayResolver.resolveEligibleOverlays`'s OWN
// output, C5/C1 — this class never re-derives eligibility). "Au plus un, au plus petit rang, et jamais
// un id 08c-natif" (design §4 C2's own falsifiable title) — 08c-native ids are excluded STRUCTURALLY,
// not by a runtime filter: the pick only ever looks up `DISCLOSURE_SLOT_TUTORIAL_ID`'s 7 values, and
// `TUTORIAL_ID_DISPOSITION`'s `NATIVE_08C` entries are never even reachable from that map.
//
// W1.1-c C3 (design §4 chunk C3, D4 "le verrou dérivé") ADDS the "au plus un PAR SESSION" cap on TOP of
// the C2 pick — `resolveNextTutorialId` is no longer pure, and takes `playerId` as of this chunk (its
// ONLY caller, `TutorialOverlayController#getState`, updated the SAME commit). Two reads, paid ONLY when
// a candidate exists (the common "nothing due" case costs zero extra queries, same "N+1 sériel"
// discipline design §5 asks of the resolver): (1) the player's active session
// (`SessionRepository.findActive`, REUSED — no duplicated query) — none ⇒ `null` unconditionally (D4
// corollary 1: "sans session active, next_tutorial_id est null — la disclosure est un concept
// intra-session"); (2) `TutorialOverlayRepository.hasShownAnySince` — ANY of the 7 SCHEDULE ids (never
// the full 11-id catalogue: D4 v2's own correction, "la restriction n'est pas cosmétique" — an 08c-native
// id shown mid-session, e.g. `tutorial.graduation`, must NOT starve the curriculum) consigned `shown` at
// or after that session's `started_at` ⇒ `null` (corollary 2 — the session already spent its one slot).
//
// R2.2: the return type is a closed `TutorialId` enum member or `null`, never a bare scalar leaking
// server-internal ordering state.

import { Injectable } from '@nestjs/common';

import type { TutorialId } from './tutorial-id-catalogue';
import { DISCLOSURE_SLOT_TUTORIAL_ID, DISCLOSURE_SLOTS_IN_RANK_ORDER } from './disclosure-schedule-catalogue';
import { TutorialOverlayRepository } from './tutorial-overlay.repository';
import { SessionRepository } from '../session/session.repository';

/**
 * The pointer's OWN return type (design §4 C2, explicit closure — "jamais un champ greffé sur
 * TutorialStateComposite"), mirrors `EligibleOverlaySet`'s own convention (C5, `onboarding-overlay.
 * resolver.ts`). Composed at the CONTROLLER boundary alongside `TutorialStateComposite` and
 * `EligibleOverlaySet` — three distinct TS types merged into one response object, never one interface
 * growing a field per producer (the same convention `SessionOpenSequencePayload` and this controller's
 * own C5 composition already use).
 */
export interface NextTutorialIdPointer {
  readonly next_tutorial_id: TutorialId | null;
}

/**
 * The 7 SCHEDULE-slot `TutorialId`s, precomputed ONCE at module load from `DISCLOSURE_SLOT_TUTORIAL_ID`
 * (D10 card 1) — D4's own domain restriction ("restreint aux tutorial_id qui sont des slots de la
 * schedule") needs exactly this set, never the full 11-id catalogue.
 */
const SCHEDULE_TUTORIAL_IDS: readonly TutorialId[] = DISCLOSURE_SLOTS_IN_RANK_ORDER.map(
  (slot) => DISCLOSURE_SLOT_TUTORIAL_ID[slot],
);

@Injectable()
export class DisclosureScheduleService {
  constructor(
    private readonly tutorialOverlayRepo: TutorialOverlayRepository,
    private readonly sessionRepo: SessionRepository,
  ) {}

  /**
   * "Au plus un, au plus petit rang, jamais un id 08c-natif" (C2) — "et au plus un PAR SESSION" (C3,
   * design D4). `eligibleIds` is the caller's own already-computed `EligibleOverlaySet.
   * eligible_tutorial_ids` (D8-1 recomputed-live guarantee lives entirely in the resolver).
   */
  async resolveNextTutorialId(playerId: string, eligibleIds: readonly TutorialId[]): Promise<TutorialId | null> {
    const candidate = this.pickSmallestScheduleRank(eligibleIds);
    if (candidate === null) return null;

    const activeSession = await this.sessionRepo.findActive(playerId);
    if (!activeSession) return null; // D4 corollary 1 — no active session, no pointer.

    const shownThisSession = await this.tutorialOverlayRepo.hasShownAnySince(
      playerId,
      SCHEDULE_TUTORIAL_IDS,
      activeSession.started_at,
    );
    return shownThisSession ? null : candidate;
  }

  /** C2's pick (D10), UNCHANGED and still PURE — kept as its own method so the C3 session-cap above
   *  wraps it rather than rewriting it. */
  private pickSmallestScheduleRank(eligibleIds: readonly TutorialId[]): TutorialId | null {
    const eligibleSet = new Set(eligibleIds);
    for (const slot of DISCLOSURE_SLOTS_IN_RANK_ORDER) {
      const id = DISCLOSURE_SLOT_TUTORIAL_ID[slot];
      if (eligibleSet.has(id)) {
        return id;
      }
    }
    return null;
  }
}
