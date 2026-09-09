// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1b-overlay-engine-design.md §4 chunk C4 (D4)
//             Canon: docs/tech/08c_remaining_screens/screen_c8_first_time_tutorial.md §3/§11
//             (`:165` toggle "Don't show me hints" → `SettingsPayload.tutorials_opt_out`; `:227` —
//             "réactiver ne ré-arme pas les tutorial_id déjà montrés").
//             — W1.1-b C4 — 2026-08-09 —
//
// `TutorialOptOutService` — a SEPARATE, tiny class from `TutorialOverlayService` (deliberately). The
// canon (`:333`) names `TutorialOverlayService` with EXACTLY 2 methods (`getTutorialState`/
// `markShown`, design "LA FRONTIÈRE DE CLASSES") — the opt-out bascule is neither of those, and D4
// redirected its storage OFF the (non-existent) `SettingsPayload` onto `player_progression_state.
// tutorials_opt_out` (a column C1 already declared). Rather than grow `TutorialOverlayService` past
// its canon-named surface for one UPDATE, this bascule gets its own one-method service — same
// `controller → service → repository` shape as the rest of this codebase, zero shortcut.
//
// Structural guarantee this class does NOT need to enforce: `tutorial_state` is append-only
// (`GRANT SELECT, INSERT` / `REVOKE UPDATE, DELETE`, migration 0146) — toggling `tutorials_opt_out`
// can NEVER "re-arm" an already-`shown` row even by accident, because this service touches ONLY
// `player_progression_state` and has no write path onto `tutorial_state` at all (`screen_c8:227`,
// design C4 falsifiable). The non-re-arming guarantee is therefore structural, not a behavior this
// class has to get right.

import { Injectable } from '@nestjs/common';

import { TutorialOverlayRepository } from './tutorial-overlay.repository';

@Injectable()
export class TutorialOptOutService {
  constructor(private readonly repo: TutorialOverlayRepository) {}

  /**
   * Set `player_progression_state.tutorials_opt_out` to the requested value, explicit-SET (never a
   * flip/toggle) — mirrors this codebase's PATCH-idempotent convention (a Settings switch reports its
   * OWN position, not a relative flip a client could double-apply under a retry). Reversible in both
   * directions (`screen_c8:227`); does not touch `tutorial_state` (see file header — the non-re-arming
   * guarantee is structural).
   */
  async setOptOut(playerId: string, optOut: boolean): Promise<void> {
    await this.repo.setOptOut(playerId, optOut);
  }
}
