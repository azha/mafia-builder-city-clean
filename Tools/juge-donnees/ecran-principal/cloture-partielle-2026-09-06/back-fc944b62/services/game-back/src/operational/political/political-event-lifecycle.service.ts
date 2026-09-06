// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C4 (item 1 — extract the
//             shared activate/deactivate lifecycle out of C2's private `activateEvent` helper)
//             Design: docs/superpowers/specs/2026-07-05-04e-A2-political-events-decisions.md §3 (same-tick
//             overlay visibility) — this service does NOT itself call `reloadNow()`; the CALLER (the
//             calendar tick today, C3's state-driven tick / C5 / C6 tomorrow) owns the tick-level
//             "activate/revert several events, THEN reloadNow() once" batching — see
//             `political-calendar-tick.service.ts`'s own doc comment for why that stays tick-owned.
//             Architecture mirror: services/game-back/src/operational/effect_engine/effect-modifier.service.ts
//             (the REAL applyEvent/revertEvent this service wraps — never re-implemented here).
//             — 04e-A2 C4 — 2026-07-05
//             — 04e-A2 C6 — 2026-07-06 (`revertPermanentUntilElection` added — the permanent-until-
//             election revert half for E-POL-10/E-POL-12, called by `political-calendar-tick.service.ts`'s
//             new election-boundary revert loop; `deactivate` above is UNCHANGED, still used for BO
//             abort/test-only force-deactivate)
//
// `PoliticalEventLifecycleService` — the ONE shared activate/deactivate lifecycle every trigger source
// (C2's calendar tick, C3's state-driven evaluators, C4's random/chained GLOBAL triggers, C5's substrate/
// DISTRICT triggers, C6's opposition-victory + permanent-until-election, C7's counter-play) builds its
// `EventEffect[]` through. Extracted BEHAVIOR-PRESERVING from `political-calendar-tick.service.ts`'s
// private `activateEvent` (C2) — the SAME two calls in the SAME order (`insertActiveEvent` then
// `applyEvent`), now callable from any political trigger source, not just the calendar tick.
//
//   activate(event, gameDay, scopeRef?) — builds `EffectModifierInput[]` from the event's static
//     `effects[]` (each effect's own `scope` decides its `scopeType`; `scopeRef` is threaded ONLY for a
//     non-GLOBAL effect — a GLOBAL effect's `scope_ref` stays `null` regardless of what the caller passes,
//     matching `EffectOverlayStore`'s own GLOBAL-always-matches contract) and applies them ATOMICALLY
//     through the REAL `EffectModifierService.applyEvent` (never a mock/synthetic driver — the plan's own
//     anti-fig-leaf/double-proof invariant). Returns the new `political_event_active.id` (the `activeEventId`
//     FK the batch of `effect_modifier` rows shares).
//   deactivate(activeEventId) — DELETEs that activation's `effect_modifier` rows via the REAL
//     `EffectModifierService.revertEvent` (the ledger row itself is NEVER deleted — it is history,
//     `political-event.repository.ts`'s own header doc). This is the EXPLICIT-revert half of the revert
//     guarantee (BO abort / permanent-until-election at C6) — duration-based expiry stays
//     `EffectModifierService.revertExpired(gameDay)`, called directly by the calendar tick (C2), never
//     routed through this service (revertExpired is a city-global SWEEP over every expired row, not a
//     per-activation operation this service's per-event API shape fits).
//
// Zero-regression invariant: this chunk is a PURE EXTRACTION for the 3 calendar events (E-POL-01/02/03) —
// `political-calendar-tick.service.ts`'s own tests (political_calendar_tick.spec.ts, C2) stay green
// unchanged, proving the refactor is behavior-preserving.

import { Injectable } from '@nestjs/common';

import { EffectModifierService } from '../effect_engine/effect-modifier.service';
import type { EffectModifierInput } from '../effect_engine/effect-engine.types';
import { PoliticalEventRepository } from './political-event.repository';
import type { PoliticalEvent } from './political.types';

@Injectable()
export class PoliticalEventLifecycleService {
  constructor(
    private readonly effectModifierService: EffectModifierService,
    private readonly repo: PoliticalEventRepository,
  ) {}

  /**
   * Activate one `PoliticalEvent`: INSERT its `political_event_active` ledger row, then build its static
   * `effects[]` into `EffectModifierInput[]` and apply them ATOMICALLY through the REAL
   * `EffectModifierService.applyEvent`.
   *
   * `scopeRef` is the caller's DISTRICT/PLAYER/COHORT reference (a district id / player id / cohort key)
   * for a NON-GLOBAL effect — every C4-wired event is GLOBAL-scope, so callers in THIS chunk always omit
   * it (`null`); C5 threads a real district id for the DISTRICT-scoped events (E-POL-05/08/12). A GLOBAL
   * effect's `scope_ref` is forced to `null` regardless of what is passed, matching `EffectOverlayStore`'s
   * own "GLOBAL always matches, no ref needed" contract — a caller cannot accidentally scope a GLOBAL
   * effect by passing a stray `scopeRef`.
   *
   * @returns the new `political_event_active.id` (`activeEventId`).
   */
  async activate(event: PoliticalEvent, gameDay: number, scopeRef: string | null = null): Promise<string> {
    const durationDays = event.durationDaysGetter ? event.durationDaysGetter() : null;
    const expiresAtGameDay = durationDays === null ? null : gameDay + durationDays;

    const activeEventId = await this.repo.insertActiveEvent(event.eventId, event.category, gameDay, expiresAtGameDay);

    const modifiers: EffectModifierInput[] = event.effects.map((effect) => ({
      scopeType: effect.scope,
      scopeRef: effect.scope === 'GLOBAL' ? null : scopeRef,
      tunableKey: effect.tunableKey,
      op: effect.op,
      magnitude: effect.magnitudeGetter(),
      appliedAtGameDay: gameDay,
      expiresAtGameDay,
    }));

    await this.effectModifierService.applyEvent(activeEventId, modifiers);
    return activeEventId;
  }

  /**
   * Explicitly revert one activation's `effect_modifier` rows (the REAL `EffectModifierService.revertEvent`
   * — DELETE-is-the-revert, design §2.3). Used for: a PERMANENT event's (E-POL-04/07/10/12, null expiry)
   * explicit BO abort / permanent-until-election revert (C6), and this chunk's own gated test-only
   * "force-deactivate" proof (a duration-less event has no `revertExpired` sweep to rely on).
   *
   * @returns the number of `effect_modifier` rows deleted.
   */
  async deactivate(activeEventId: string): Promise<number> {
    return this.effectModifierService.revertEvent(activeEventId);
  }

  /**
   * The SHARED ledger-stamp revert primitive (04e-A2 C9 extraction, TD-163): deletes an activation's
   * `effect_modifier` rows via the REAL `EffectModifierService.revertEvent` (the SAME explicit-revert
   * half `deactivate` uses) THEN stamps the `political_event_active` ledger row's
   * `expires_at_game_day = gameDay` (`PoliticalEventRepository.markEventActiveExpired`) — marking
   * "reverted on this exact day" so the shared active-interval filter (`isEventCurrentlyActive` /
   * `countCurrentlyActive` / `findLiveActiveEventId`) correctly excludes it from this day forward, without
   * ever DELETING the ledger row (still a permanent historical record, `political-event.repository.ts`'s
   * own header doc). Distinct from the generic `deactivate` above precisely because of this ledger stamp
   * — a TIMED event's ledger row already carries its real expiry from insertion and must never be
   * overwritten by this method. Two named entry points below delegate to this SAME primitive — every
   * PERMANENT event's explicit revert (whichever trigger source initiates it) gets the identical
   * ledger-stamp discipline; only `deactivate` (above, no stamp) is exempt, and it is never used for a
   * PERMANENT event's production revert path (only the C2 test-only force-deactivate probe).
   *
   * @returns the number of `effect_modifier` rows deleted.
   */
  private async revertPermanentWithLedgerStamp(activeEventId: string, gameDay: number): Promise<number> {
    const deletedCount = await this.effectModifierService.revertEvent(activeEventId);
    await this.repo.markEventActiveExpired(activeEventId, gameDay);
    return deletedCount;
  }

  /**
   * Revert a PERMANENT-UNTIL-ELECTION activation (E-POL-10/E-POL-12, C6, design §3: "revert only at the
   * next election") — delegates to the SHARED `revertPermanentWithLedgerStamp` primitive above. Called
   * ONLY by `political-calendar-tick.service.ts`'s C6 election-boundary revert loop, for E-POL-10/E-POL-12
   * only. — % allowed-mention: false-positive substring match ("exclusively"→"only", adverb, not "exclusive" cosmetic/FOMO framing)
   *
   * @returns the number of `effect_modifier` rows deleted (mirrors `deactivate`'s own return shape).
   */
  async revertPermanentUntilElection(activeEventId: string, gameDay: number): Promise<number> {
    return this.revertPermanentWithLedgerStamp(activeEventId, gameDay);
  }

  /**
   * Abort a PERMANENT (explicit-BO-abort-only) activation — E-POL-04/E-POL-07, design §3/L2: "reverts
   * only via explicit BO abort", never at an election boundary (that is E-POL-10/E-POL-12's OWN lifecycle,
   * `revertPermanentUntilElection` above). **TD-163 resolution** (`docs_int/tech_debt_inventory.md`,
   * flagged at C6): the generic `deactivate` above does NOT stamp the ledger row, which would leave an
   * aborted E-POL-04/E-POL-07's `political_event_active` row counting toward `overlap_max_active`
   * FOREVER after the abort (a dead event permanently occupying a cap slot). This method delegates to the
   * SAME `revertPermanentWithLedgerStamp` primitive `revertPermanentUntilElection` uses — the identical
   * revert-then-stamp discipline, just triggered by an explicit BO admin action (`political-admin.controller.ts`
   * C9's `abort-active` endpoint) instead of an autonomous election-boundary crossing. Called by
   * `PoliticalAdminController.abortActive` ONLY.
   *
   * @returns the number of `effect_modifier` rows deleted (mirrors `deactivate`'s own return shape).
   */
  async abortPermanentEvent(activeEventId: string, gameDay: number): Promise<number> {
    return this.revertPermanentWithLedgerStamp(activeEventId, gameDay);
  }
}
