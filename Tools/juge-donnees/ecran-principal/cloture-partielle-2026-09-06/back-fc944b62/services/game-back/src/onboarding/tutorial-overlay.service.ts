// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1b-overlay-engine-design.md §4 chunks C2/C3 (D2/D3)
//             Canon: docs/tech/08c_remaining_screens/screen_c8_first_time_tutorial.md §11 NestJS —
//             backend jeu (:333-334,344, `TutorialOverlayService` verbatim + `TutorialStateComposite`
//             + "validé contre le registre TutorialIdEnum côté service (jamais une valeur libre
//             non-cataloguée)").
//             — W1.1-b C2 — 2026-08-09 — C3 — 2026-08-09 —
//
// `TutorialOverlayService` — ⛔ EXACTLY the 2 methods the canon names (`:333`): `getTutorialState()`
// (C2) / `markShown()` (C3, ADDED below). "Persiste et lit. N'évalue pas les triggers métier" — this
// class NEVER computes an eligible set; that is `OnboardingOverlayResolver`, a DISTINCT class (C5,
// design §1 D2 "Où vit le résolveur"). If a future diff adds a 3rd method here that evaluates
// anything, the class-separation the design's 3 ⊥ review passes settled has been crossed — see that
// file's "LA FRONTIÈRE DE CLASSES" table.
//
// `TutorialStateComposite` — the canon composite (`:334`) verbatim: `{ tutorials_opt_out: bool,
// shown_tutorial_ids: TutorialIdEnum[] }`. NO 3rd field, ever (design D2 closure — "l'ensemble éligible
// est le type de retour PROPRE du résolveur, jamais un 3ᵉ champ greffé sur le composite"). R2.2: two
// enums-or-booleans, never a scalar.
//
// `markShown` (C3) validates its `tutorialId` against `TUTORIAL_ID_CATALOGUE` (D3 — "jamais une
// valeur libre non-cataloguée") BEFORE writing — a caller-supplied string that is not a catalogued
// `TutorialId` never reaches the repository at all.

import { Injectable } from '@nestjs/common';

import { ApiError } from '../protocol/api-error';
import { TutorialOverlayRepository } from './tutorial-overlay.repository';
import { isKnownTutorialId } from './tutorial-id-catalogue';

/** The canon `TutorialStateComposite` (`screen_c8:334`) — exactly these 2 fields, never extended. */
export interface TutorialStateComposite {
  tutorials_opt_out: boolean;
  shown_tutorial_ids: string[];
}

@Injectable()
export class TutorialOverlayService {
  constructor(private readonly repo: TutorialOverlayRepository) {}

  /**
   * `getTutorialState(player_id)` (`screen_c8:333`) — a pure read, hors chemin critique cold-open
   * (D9): `session/open` never calls this (design §1 D9). Returns the canon composite as-is; a signup-
   * fresh player reads `{ tutorials_opt_out: false, shown_tutorial_ids: [] }` (C1's own defaults).
   */
  async getTutorialState(playerId: string): Promise<TutorialStateComposite> {
    const { optOut, shownTutorialIds } = await this.repo.getState(playerId);
    return { tutorials_opt_out: optOut, shown_tutorial_ids: shownTutorialIds };
  }

  /**
   * `markShown(player_id, tutorial_id)` (`screen_c8:333,178`) — consigns ONE tutorial as shown,
   * idempotently (the repository's `ON CONFLICT DO NOTHING`, design D8-2). Rejects a `tutorial_id`
   * outside the closed catalogue (D3) with `VALIDATION_FAILED` (422 — a well-formed request breaking
   * a business rule, `error-codes.ts`'s own §Taxonomie convention) BEFORE any write is attempted —
   * never a silent no-op on an unknown id.
   */
  async markShown(playerId: string, tutorialId: string): Promise<void> {
    if (!isKnownTutorialId(tutorialId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown tutorial_id: "${tutorialId}" is not in the closed TutorialId catalogue.`,
      });
    }
    await this.repo.insertShown(playerId, tutorialId);
  }
}
