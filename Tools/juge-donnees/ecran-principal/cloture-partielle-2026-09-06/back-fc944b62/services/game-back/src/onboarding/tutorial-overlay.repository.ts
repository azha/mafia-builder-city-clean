// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1b-overlay-engine-design.md §4 chunks C2/C3/C4
//             (D2/D3/D4/D8-2).
//             Canon: docs/tech/08c_remaining_screens/screen_c8_first_time_tutorial.md §11 NestJS —
//             backend jeu (:333-346, `TutorialOverlayService` — "persiste et lit", n'évalue rien).
//             — W1.1-b C2 — 2026-08-09 — C3 — 2026-08-09 — C4 — 2026-08-09 —
//
// `TutorialOverlayRepository` — the DB layer under BOTH `TutorialOverlayService` (C2/C3) AND
// `TutorialOptOutService` (C4 — a SEPARATE service, see that file's own header for why). Reads/writes
// `tutorial_state` (C1, migration 0146) + reads/writes `player_progression_state.tutorials_opt_out`
// (C1, SAME migration). This repository is deliberately NOT `TutorialOverlayService` itself — the
// canon's "exactement 2 méthodes" constraint (`:333`) binds THAT class, not its repository; keeping
// the split let the repository grow (C3 added `insertShown`, C4 ADDS `setOptOut` below) without ever
// pushing `TutorialOverlayService` past its canon-named surface (design "LA FRONTIÈRE DE CLASSES").
//
// `getState` is a pure READ — no write, no evaluation of triggers (design D2/`:333`): it returns
// EXACTLY what is already persisted, never a computed "eligible" set (that is `OnboardingOverlayResolver`,
// C5, a DIFFERENT class entirely). `insertShown` (C3) is the ONLY writer of `tutorial_state` — an
// `ON CONFLICT DO NOTHING` INSERT, the SAME idiom `mastery-score.repository.ts:60`/`possibility-
// horizon-cards.repository.ts:107` already use for their own composite-PK upserts. The catalogue
// membership check (D3) lives in the SERVICE, not here (this repository trusts its caller — mirrors
// every other repository in this codebase, which never re-validates what its service already checked).
//
// W1.1-c C3 (docs/superpowers/specs/2026-08-09-w1.1c-disclosure-design.md §4 chunk C3, D4) ADDS
// `hasShownAnySince` — a THIRD reader of `tutorial_state`, alongside `getState`. Its caller is NOT
// `TutorialOverlayService`: it is `DisclosureScheduleService` (`disclosure-schedule.service.ts`, a
// DIFFERENT class in this SAME module — "LA FRONTIÈRE DE CLASSES" still holds, this repository is
// shared DB plumbing, not owned by any one service above it), which needs a `shown_at`-filtered read
// `getState`'s plain id array cannot answer.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { playerProgressionState } from '../db/schema/player_progression_state';
import { tutorialState } from '../db/schema/tutorial_state';

/** The two persisted halves of `TutorialStateComposite` (`screen_c8:334`), read as plain values —
 *  the SERVICE (not this repository) shapes them into the canon composite's exact field names. */
export interface TutorialPersistedState {
  optOut: boolean;
  shownTutorialIds: string[];
}

@Injectable()
export class TutorialOverlayRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Read `tutorials_opt_out` (`player_progression_state`) + every `tutorial_id` EVER shown
   * (`tutorial_state`, append-only — design D8-2, PK `(player_id, tutorial_id)`) for this player. A
   * missing `player_progression_state` row defends to the schema default (`false`) — mirrors
   * `OnboardingFunnelRepository.getCurrentState`'s own "should not happen in practice, but a defensive
   * default is free" convention; the row is guaranteed to exist by signup (C1's own migration note).
   * Zero `tutorial_state` rows for a player who was never shown anything is the ordinary, expected case
   * — not a fallback.
   */
  async getState(playerId: string): Promise<TutorialPersistedState> {
    const [progressionRow] = await this.db
      .select({ tutorials_opt_out: playerProgressionState.tutorials_opt_out })
      .from(playerProgressionState)
      .where(eq(playerProgressionState.player_id, playerId))
      .limit(1);

    const shownRows = await this.db
      .select({ tutorial_id: tutorialState.tutorial_id })
      .from(tutorialState)
      .where(eq(tutorialState.player_id, playerId));

    return {
      optOut: progressionRow?.tutorials_opt_out ?? false,
      shownTutorialIds: shownRows.map((row) => row.tutorial_id),
    };
  }

  /**
   * `markShown`'s writer (C3) — `INSERT … ON CONFLICT (player_id, tutorial_id) DO NOTHING`
   * (`screen_c8:178,344` — "shown at most once" is the PK, not an application promise, design D8-2).
   * A second call for the SAME `(player_id, tutorial_id)` is a documented no-op: it does not throw,
   * does not re-stamp `shown_at`, and the caller (the service) reports success either way (idempotent
   * — the design's own C3 falsifiable: "le second appel RÉUSSIT, surtout pas 409").
   */
  async insertShown(playerId: string, tutorialId: string): Promise<void> {
    await this.db
      .insert(tutorialState)
      .values({ player_id: playerId, tutorial_id: tutorialId })
      .onConflictDoNothing({ target: [tutorialState.player_id, tutorialState.tutorial_id] });
  }

  /**
   * `TutorialOptOutService`'s writer (C4) — an explicit SET of `player_progression_state.
   * tutorials_opt_out` (never a flip). Touches ONLY this column: no write path onto `tutorial_state`
   * exists in this method, which is what makes "opt-out false does not re-arm the already-`shown`
   * ids" structural rather than a behavior this method has to get right (`screen_c8:227`).
   * `player_progression_state` is already UPDATE-granted (`0013:64`) — no new GRANT needed (design
   * D4).
   */
  async setOptOut(playerId: string, optOut: boolean): Promise<void> {
    await this.db
      .update(playerProgressionState)
      .set({ tutorials_opt_out: optOut })
      .where(eq(playerProgressionState.player_id, playerId));
  }

  /**
   * W1.1-c C3 (design §4 chunk C3, D4 "le verrou dérivé") — ANY of `tutorialIds` consigned `shown` at
   * or after `since`, for this player. A plain, generic "any of these ids since this timestamp" read —
   * it carries NO schedule-specific knowledge; the caller (`DisclosureScheduleService`) is the one that
   * restricts `tutorialIds` to the 7 SCHEDULE slots (D4's own domain restriction — an 08c-native id
   * consigned mid-session must NOT cap the schedule pointer, design §1 D4 v2 correction) and `since` to
   * the player's active session's `started_at` (`SessionRepository.findActive`).
   */
  async hasShownAnySince(playerId: string, tutorialIds: readonly string[], since: Date): Promise<boolean> {
    const rows = await this.db
      .select({ one: sql<number>`1` })
      .from(tutorialState)
      .where(
        and(
          eq(tutorialState.player_id, playerId),
          inArray(tutorialState.tutorial_id, [...tutorialIds]),
          gte(tutorialState.shown_at, since),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
}
