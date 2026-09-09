// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C3 ("Horizon feed lifecycle
//             (activation of `possibility_horizon_cards`)" — INSERT-if-absent surfacing, regression
//             marking, GET/defer/dismiss transitions) + C5 ("atomic card claim winner gate — single-
//             statement conditional UPDATE" — `claimForAdoption`/`revertClaim`).
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §3 (data model) +
//             §6 (D6 — card lifecycle) + §7.3 (eval flow, the INSERT-if-absent + regression algorithm) +
//             §8 (feed read/defer/dismiss) + §9 (Adoption, D7 — the #27 winner-gate-first shape).
//             Migration 0137+0138 (P3-G C1) — the R10 unique index on `(player_id, capability_id)` + the
//             extended `phc_view_status_adopted_at_chk` (view_status IN unseen/seen/deferred ⟺ BOTH
//             adopted_at AND dismissed_at NULL).
//             Pattern (upsert-first `.onConflictDoNothing({target:[...]})`, the SAME atomic idiom this
//             table's own unique index calls for): `mastery-score.repository.ts#applyDelta`. Pattern
//             (existence-read-informs-error-class, 404 vs 409 disambiguation): `promotion-lock.service.ts
//             #previewRecall`'s own "the option EXISTS (404 otherwise) but the guarded UPDATE matched 0
//             rows" idiom (`error-codes.ts#REPLACEMENT_OPTION_ALREADY_CLOSED`'s own precedent). Pattern
//             (C5 winner gate + compensation, row-lock shape — see `claimForAdoption`'s own header for
//             why the bare-WHERE `flipToDelegated` shape does not fit here): `mastery-score.repository.ts
//             #applyDelta` (SELECT FOR UPDATE + conditional UPDATE, one tx) + `#revertToSelf` (the
//             compensation idiom, scoped by the state the winner gate itself set).
//             — P3-G C3 — 2026-07-20 / C5 — 2026-07-20
//
// `PossibilityHorizonCardsRepository` — the ONLY write path onto `possibility_horizon_cards` (mig
// 0137/0138, ACTIVATED by this chunk). Every mutation here is a SINGLE atomic statement (plan §0.4
// atomic-first): the surfacing INSERT is `ON CONFLICT DO NOTHING` (the R10 unique index is the DB-
// enforced dedup guarantee — this repository never does a read-then-conditional-insert dance); every
// `view_status` transition (seen-marking, defer, dismiss) is a conditional `UPDATE ... WHERE
// view_status IN (...)` — never a read-then-write. `predicate_regressed` is the ONE exception to
// "conditional on current state" (design §7.3's own "set/clear both directions" — the value written is a
// freshly-computed pure function of already-read org state, so a benign concurrent double-write is
// idempotent by construction, never a lost update; see `setPredicateRegressed`'s own header). C5 ADDS
// `claimForAdoption`/`revertClaim` — the ONE exception to "no separate SELECT" (see that method's own
// header for the row-lock rationale), still ONE atomic transaction, never a TOCTOU window.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import {
  possibilityHorizonCardRow,
  type PossibilityHorizonCardRow,
  type PossibilityCardViewStatusEnum,
} from '../db/schema/progression_structural';

/** The 3 non-terminal `view_status` values (design §6/§7.3/§8.4 — capacity-counted, re-evaluated,
 *  regression-marked; ADOPTED/DISMISSED are terminal — never counted, never regression-marked). */
export const NON_TERMINAL_VIEW_STATUSES: readonly PossibilityCardViewStatusEnum[] = ['unseen', 'seen', 'deferred'];

function isNonTerminal(status: PossibilityCardViewStatusEnum): boolean {
  return (NON_TERMINAL_VIEW_STATUSES as readonly string[]).includes(status);
}

/** One clause's persisted verdict inside `surfaced_predicate_snapshot` — keyed by `PredicateType` (the
 *  jsonb column's own `'{}'::jsonb` default is an OBJECT, mig 0137 — never an array). */
export interface PredicateSnapshotEntry {
  readonly threshold: number;
  readonly satisfied: boolean;
}
export type PredicateSnapshot = Readonly<Record<string, PredicateSnapshotEntry>>;

@Injectable()
export class PossibilityHorizonCardsRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** ALL cards (any `view_status`) for a player, capability code ascending — the C3 per-session eval's
   *  own "does a row already exist for this capability" fast-path read (design §7.3 — the app-level
   *  pre-check; the R10 unique index is the DB-enforced guarantee, this read is only the fast path) +
   *  the regression-marking source set (both loops in `HorizonCardSurfacingService.processSessionOpened`
   *  share this ONE read). */
  async listAllForPlayer(playerId: string): Promise<PossibilityHorizonCardRow[]> {
    return this.db
      .select()
      .from(possibilityHorizonCardRow)
      .where(eq(possibilityHorizonCardRow.player_id, playerId))
      .orderBy(possibilityHorizonCardRow.capability_id);
  }

  /** Non-terminal cards (unseen/seen/deferred), surfaced-first — the feed GET's own read set (design
   *  §8.1: "cards view_status IN (unseen, seen, deferred)"). */
  async listNonTerminalForPlayer(playerId: string): Promise<PossibilityHorizonCardRow[]> {
    return this.db
      .select()
      .from(possibilityHorizonCardRow)
      .where(
        and(
          eq(possibilityHorizonCardRow.player_id, playerId),
          inArray(possibilityHorizonCardRow.view_status, [...NON_TERMINAL_VIEW_STATUSES]),
        ),
      )
      .orderBy(possibilityHorizonCardRow.surfaced_at);
  }

  /**
   * INSERT-if-absent (design §7.3) — `ON CONFLICT DO NOTHING` against the R10 unique index on
   * `(player_id, capability_id)`, mirrors `MasteryScoreRepository.applyDelta`'s own upsert-first idiom.
   * ONE atomic statement — no separate existence check, no try/catch on 23505 (unlike the partial-index
   * dedup `DegradedCategoryPressureProducer` needs, THIS table's unique index covers the exact conflict
   * target directly, so Postgres itself silently no-ops the loser). Returns the inserted row, or `null`
   * if a row for this (player, capability) pair ALREADY existed (any status) — a genuine concurrent race
   * loss (the double-session-open hazard, plan §0.4/Concurrence) or a prior surfacing; both cases are
   * correctly a no-op here, and the caller never emits `CapabilityHorizonSurfacedEvent` on `null`.
   */
  async insertIfAbsent(playerId: string, capabilityId: number, snapshot: PredicateSnapshot): Promise<PossibilityHorizonCardRow | null> {
    const inserted = await this.db
      .insert(possibilityHorizonCardRow)
      .values({ player_id: playerId, capability_id: capabilityId, surfaced_predicate_snapshot: snapshot })
      .onConflictDoNothing({ target: [possibilityHorizonCardRow.player_id, possibilityHorizonCardRow.capability_id] })
      .returning();
    return inserted[0] ?? null;
  }

  /**
   * D6 regression overlay — set/clear `predicate_regressed` on an EXISTING non-terminal card (design
   * §7.3: "For each EXISTING non-terminal card: re-evaluate; set/clear predicate_regressed (BOTH
   * directions)"). A plain UPDATE-by-`card_id` — never a read-then-conditional-write in the TOCTOU sense:
   * `regressed` is a freshly-computed pure function of already-read org state (the SAME evaluation the
   * caller just ran), so two concurrent session-open racers computing and writing the SAME boolean is a
   * benign idempotent overwrite, never a lost update. The `!= :value` WHERE clause is a pure no-op-skip
   * optimization (skip an unnecessary write when nothing changed), not a correctness requirement.
   */
  async setPredicateRegressed(cardId: string, regressed: boolean): Promise<void> {
    await this.db
      .update(possibilityHorizonCardRow)
      .set({ predicate_regressed: regressed })
      .where(and(eq(possibilityHorizonCardRow.card_id, cardId), sql`${possibilityHorizonCardRow.predicate_regressed} != ${regressed}`));
  }

  /**
   * The feed GET's own "mark unseen as seen" (design §8.1: "Reading marks unseen → seen (set-based
   * UPDATE on the read set)"). Set-based, player-scoped — every `unseen` card for this player IS, by
   * construction, part of the non-terminal read set the GET just served (a card can never be `unseen`
   * without also being feed-visible), so "the read set" and "all unseen for this player" are the SAME
   * set. No RETURNING needed — the caller (`HorizonFeedService.getFeed`) re-reads via
   * `listNonTerminalForPlayer` immediately after, so the response always reflects POST-transition status.
   */
  async markUnseenAsSeen(playerId: string): Promise<void> {
    await this.db
      .update(possibilityHorizonCardRow)
      .set({ view_status: 'seen' })
      .where(and(eq(possibilityHorizonCardRow.player_id, playerId), eq(possibilityHorizonCardRow.view_status, 'unseen')));
  }

  /** One card, owned by this player — the 404-vs-409 disambiguation read `defer`/`dismiss` both need
   *  BEFORE (dismiss's dismissible-catalogue check) or AFTER (defer's zero-rows-updated case) their own
   *  conditional UPDATE. */
  async findOwnedCard(playerId: string, cardId: string): Promise<PossibilityHorizonCardRow | null> {
    const rows = await this.db
      .select()
      .from(possibilityHorizonCardRow)
      .where(and(eq(possibilityHorizonCardRow.card_id, cardId), eq(possibilityHorizonCardRow.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * §8.2 defer — conditional UPDATE `unseen|seen -> deferred` (design: "GET marks unseen→seen;
   * POST defer" — defer's own WHERE therefore admits BOTH pre-read-and-post-read cards, `unseen` OR
   * `seen`). Never touches `adopted_at`/`dismissed_at` (the `phc_view_status_adopted_at_chk`'s 3rd
   * disjunct already requires both NULL for any non-terminal status, and this statement leaves them
   * byte-untouched). Zero rows returned = the WHERE's own guard refused (already deferred/adopted/
   * dismissed, or a lost race) — the caller (`HorizonFeedService.defer`) disambiguates 404 vs 409 via
   * `findOwnedCard`.
   */
  async deferCard(playerId: string, cardId: string): Promise<PossibilityHorizonCardRow | null> {
    const updated = await this.db
      .update(possibilityHorizonCardRow)
      .set({ view_status: 'deferred' })
      .where(
        and(
          eq(possibilityHorizonCardRow.card_id, cardId),
          eq(possibilityHorizonCardRow.player_id, playerId),
          inArray(possibilityHorizonCardRow.view_status, ['unseen', 'seen']),
        ),
      )
      .returning();
    return updated[0] ?? null;
  }

  /**
   * §8.3 dismiss — conditional UPDATE `unseen|seen|deferred -> dismissed` + `dismissed_at`. The CALLER
   * (`HorizonFeedService.dismiss`) has ALREADY refused a non-dismissible capability with 409
   * `CAPABILITY_NOT_DISMISSIBLE` (D8) before this is ever reached — this statement itself mirrors
   * `deferCard`'s exact shape (conditional UPDATE over the SAME 3 non-terminal statuses, single
   * atomic statement, never a read-then-write). Data-inert v1 (no LIVE capability is dismissible), but
   * the transition genuinely ships end-to-end (design D8: "activates with the first dismissible
   * capability").
   */
  async dismissCard(playerId: string, cardId: string): Promise<PossibilityHorizonCardRow | null> {
    const updated = await this.db
      .update(possibilityHorizonCardRow)
      .set({ view_status: 'dismissed', dismissed_at: sql`now()` })
      .where(
        and(
          eq(possibilityHorizonCardRow.card_id, cardId),
          eq(possibilityHorizonCardRow.player_id, playerId),
          inArray(possibilityHorizonCardRow.view_status, [...NON_TERMINAL_VIEW_STATUSES]),
        ),
      )
      .returning();
    return updated[0] ?? null;
  }

  /**
   * P3-G C5 (design §9 step 2) — the ADOPTION WINNER GATE. UNLIKE `deferCard`/`dismissCard` (a plain
   * conditional UPDATE — mirrors `MasteryScoreRepository.flipToDelegated`'s bare-WHERE shape), this ALSO
   * needs the card's PRE-claim `view_status` for the compensation revert (design §9 step 4 —
   * "compensating card revert" must restore the EXACT prior status, never a guessed fixed value: a card
   * can be non-terminal in any of 3 states — unseen/seen/deferred — reverting to the wrong one would
   * silently lose the player's own view/defer history). Mirrors `MasteryScoreRepository.applyDelta`'s OWN
   * atomic idiom instead (`SELECT ... FOR UPDATE` + a conditional `UPDATE`, ONE transaction, never a
   * separate un-locked read) — `flipToDelegated`'s bare-WHERE shape never needs a pre-image because
   * `mastery_score`'s only valid pre-state is the single value `'SELF'`; this table's 3-way pre-state
   * genuinely needs the row lock. The lock makes this atomic-first (plan §0.4): no window exists between
   * "read status" and "claim" for a concurrent defer/dismiss/adopt to interleave — a second concurrent
   * `claimForAdoption` on the SAME card blocks on the row lock, then re-reads the FIRST caller's
   * already-committed `'adopted'` status and correctly returns `{claimed:false}`.
   */
  async claimForAdoption(
    playerId: string,
    cardId: string,
  ): Promise<{ claimed: true; priorStatus: PossibilityCardViewStatusEnum } | { claimed: false }> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .select({ view_status: possibilityHorizonCardRow.view_status })
        .from(possibilityHorizonCardRow)
        .where(and(eq(possibilityHorizonCardRow.card_id, cardId), eq(possibilityHorizonCardRow.player_id, playerId)))
        .for('update');
      const row = rows[0];
      if (!row || !isNonTerminal(row.view_status)) {
        return { claimed: false };
      }
      await tx
        .update(possibilityHorizonCardRow)
        .set({ view_status: 'adopted', adopted_at: sql`now()` })
        .where(and(eq(possibilityHorizonCardRow.card_id, cardId), eq(possibilityHorizonCardRow.player_id, playerId)));
      return { claimed: true, priorStatus: row.view_status };
    });
  }

  /**
   * P3-G C5 — the `claimForAdoption` COMPENSATION (mirrors `MasteryScoreRepository.revertToSelf`'s own
   * "scoped by the state THIS claim itself set" discipline): a LATER step of the SAME adoption attempt
   * fails (the induced-failure proof — a fault-injector-corrupted post-claim `capability_adoptions`
   * INSERT) → restore the EXACT `priorStatus` `claimForAdoption` returned + clear `adopted_at`. Scoped by
   * `view_status = 'adopted'` (the value ONLY a winning `claimForAdoption` call could have set — no OTHER
   * path ever writes `'adopted'`) so a stale/duplicate compensate is a silent no-op, never a new failure
   * mode (the SAME "compensation must not itself fail" discipline `revertToSelf`/
   * `revertToDelegatedForRecall` document).
   */
  async revertClaim(playerId: string, cardId: string, priorStatus: PossibilityCardViewStatusEnum): Promise<void> {
    await this.db
      .update(possibilityHorizonCardRow)
      .set({ view_status: priorStatus, adopted_at: null })
      .where(
        and(
          eq(possibilityHorizonCardRow.card_id, cardId),
          eq(possibilityHorizonCardRow.player_id, playerId),
          eq(possibilityHorizonCardRow.view_status, 'adopted'),
        ),
      );
  }
}

export { isNonTerminal };
