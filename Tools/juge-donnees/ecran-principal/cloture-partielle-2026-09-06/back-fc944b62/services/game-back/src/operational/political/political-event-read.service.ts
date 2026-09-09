// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C8 (player surfaces —
//             read-only political-calendar API + R2.2 qualitative projections + banners-NO-timer)
//             Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md §Player UI
//             (:177-196, "Political calendar" — active/upcoming/recent + qualitative banner
//             silent/minor/major/dramatic, no countdown timer). % allowed-mention: design comment (L6 brand-safe "no countdown" choice)
//             R2.2 precedent (grep-zero pattern REUSED): operational/internal_affairs/ia-projection.service.ts
//             (P5 wall — 4-state qualitative bucket derived server-side, never the raw scalar).
//             — 04e-A2 C8 — 2026-07-06
//
// `PoliticalEventReadService` — the R2.2 player-facing read model for the political calendar (C8, the
// ONLY consumer of `POLITICAL_EVENT_CATALOGUE` allowed to build a CLIENT-facing DTO; C9's BO surface is
// the P5-inverted raw-magnitude sibling, out of this chunk's scope).
//
// R2.2 (grep-zero): this service NEVER returns a raw effect magnitude, NEVER returns
// `expires_at_game_day` (or any activation/expiry timestamp), and NEVER returns a countdown/duration % allowed-mention: R2.2 grep-zero rule statement, not a countdown implementation
// value. Every numeric field this service DOES return is `scheduledGameDay` on an `upcoming` entry — an
// explicit, canon-mandated in-game CALENDAR DATE (catalogue.md :181, "Upcoming scheduled events with
// in-game dates"), NOT an expiry/countdown: it is the (fixed, cycle-derived) day a FUTURE calendar-driven % allowed-mention: R2.2 grep-zero rule statement, not a countdown implementation
// event is due to next activate, structurally distinct from "how much time is left on an ACTIVE event"
// (which this service never exposes for any bucket — the L6 brand guard, "banners = state, no timer").
//
// THE 3 CALENDAR BUCKETS (catalogue.md §Player UI):
//   `active`        — every `political_event_active` row currently active (ledger filter, NOT the ledger
//                     row itself: `expires_at_game_day IS NULL OR > gameDay`), rendered through the
//                     static catalogue (full qualitative detail: effects/counter-play/news copy).
//   `upcoming`       — ONLY the 3 CALENDAR-driven events (E-POL-01 electoral, E-POL-02/03 budget) have a
//                      deterministically computable "next due" day (the 9 other events are STATE-DRIVEN —
//                      random/seeded/rival-regime/scandal-noise/district-signal — canon gives no "next
//                      date" for those; showing a fabricated forecast for a probabilistic trigger would
//                      misrepresent the mechanic, so they are simply absent from `upcoming`, never a
//                      guessed placeholder date). An event already `active` is excluded from `upcoming`
//                      (it is not "upcoming", it is happening).
//   `recentlyEnded`  — every `political_event_active` row whose `expires_at_game_day` falls in the last
//                      `RECENTLY_ENDED_WINDOW_DAYS` (30, catalogue.md :182, canon-cited constant — NOT a
//                      registry getter: canon states this window as a fixed UI constant, not a tunable a
//                      designer would rebalance) — rendered through the SAME catalogue detail as `active`.
//
// THE BANNER (`politicalClimate`, catalogue.md :193 — the EXACT 4-state enum quoted verbatim: "silent /
// minor / major / dramatic"). Canon gives the enum but NOT a magnitude-to-band formula (the Unity bullet
// list at :188-196 lists the banner as a SEPARATE UI element from the per-event calendar list/details
// panel — it is a single CITYWIDE indicator, not a per-event severity tag). This is therefore a genuine,
// narrow, coder-chosen convention (the SAME class of choice as `political-trigger-evaluators.ts`'s own
// documented "even cycle index = INCREASE" convention, or `political-event-catalogue.ts`'s E-POL-07
// literal-0 target) — derived ONLY from REAL, already-observed state (`countCurrentlyActive` vs
// `overlap_max_active`, the ALREADY-REGISTERED A1 getter, REUSED not fabricated, R2.3 — never
// Math.random/Date.now, never a NEW invented tunable). Every one of the 4 members is REACHABLE (no dead
// enum value — the same "no dead knob" anti-fig-leaf discipline the plan applies to counter-play cost
// levers, applied here to the banner's own state space) at the default cap of 3:
//   `silent`   — 0 events currently active.
//   `minor`    — active count is below half of `overlap_max_active` (e.g. 1 of 3) — modest live pressure.
//   `major`    — active count is at/above half of `overlap_max_active` but below the cap (e.g. 2 of 3).
//   `dramatic` — active count has REACHED `overlap_max_active` (at the concurrency ceiling) — multiple
//                political crises compounding at once, the citywide maximum the engine ever allows.
// [PROV-Y26Q2] — this exact banding is a C8 engineering convention (not a canon-cited formula); flagged
// for reviewer/design confirmation, calibration TD-166 if a future content pass wants a different split.
//
// Determinism: NO `Math.random()`, NO `Date.now()`. Every branch is a pure function of persisted DB state
// (`political_event_active` ledger rows, `political_calendar_state.last_evaluated_game_day`) + the
// ALREADY-REGISTERED tunable getters (never inlined literals for balance values, R2.3).

import { Injectable } from '@nestjs/common';

import { citySimTunables } from '../../citysim/citysim-tunables';
import { politicalEventsTunables } from '../effect_engine/effect-engine.tunables';
import { PoliticalEventRepository } from './political-event.repository';
import { getPoliticalEventById } from './political-event-catalogue';
import { computeNextCalendarDueDays } from './political-trigger-evaluators';
import type { EventEffect, PoliticalEffectOp, PoliticalEffectScope, PoliticalEventCategoryVal } from './political.types';

/**
 * `RECENTLY_ENDED_WINDOW_DAYS` — catalogue.md :182 "Recent ended events (last 30 game-days)". A
 * canon-cited FIXED UI constant, not a registry tunable (canon states this as a display-window fact, not
 * a rebalance-able magnitude — the same class of literal as E-POL-07's target-0 "fully relaxed" constant,
 * `political-event-catalogue.ts`'s own header note).
 */
export const RECENTLY_ENDED_WINDOW_DAYS = 30;

/** The banner's qualitative 4-state enum — verbatim from catalogue.md :193. */
export type PoliticalClimateBand = 'silent' | 'minor' | 'major' | 'dramatic';

/** A per-effect qualitative direction — mechanically derived from `(op, sign(magnitude))`, NEVER the raw
 *  magnitude value itself (R2.2 grep-zero). `'adjusts'` covers `SET` (no baseline to diff against — a SET
 *  target is a structural constant, not a delta) and the exact-equality edge case for ADD/MULTIPLY. */
export type QualitativeEffectDirection = 'increases' | 'decreases' | 'adjusts';

/** One effect's qualitative reading — the lever's REAL registered identifier + scope (structural, not a
 *  scalar) + its mechanical direction. Friendly display-copy for `tunableKey` (e.g. "police patrol
 *  pressure") is a Unity/content-pass concern (plan D4, "all Unity = TD") — this service exposes the real,
 *  verifiable identifier, never fabricated flavour text. */
export interface QualitativeEffectView {
  readonly tunableKey: string;
  readonly scope: PoliticalEffectScope;
  readonly direction: QualitativeEffectDirection;
}

/** One counter-play mitigation, player-facing — name + description ONLY. `costGetter` (when present on
 *  the catalogue entry, e.g. E-POL-10) is NEVER resolved/exposed here — the raw cost is P5-inverted to
 *  BO only (C9); this bucket answers "is a mitigation available and what is it", not "what does it cost". */
export interface CounterPlaySummary {
  readonly name: string;
  readonly description: string;
}

/** One political-calendar entry (an `active` or `recentlyEnded` event) — full qualitative detail. */
export interface PoliticalCalendarEventView {
  readonly eventId: string;
  readonly name: string;
  readonly category: PoliticalEventCategoryVal;
  readonly effects: readonly QualitativeEffectView[];
  readonly counterPlay: readonly CounterPlaySummary[];
  readonly newsFeedCopy: string;
}

/** One `upcoming` entry — the 3 calendar-driven events only, WITH a computed in-game due day (canon
 *  §Player UI :181 — an explicit calendar DATE, not a countdown; see file header). % allowed-mention: design comment (not a countdown implementation) */
export interface UpcomingPoliticalEventView {
  readonly eventId: string;
  readonly name: string;
  readonly category: PoliticalEventCategoryVal;
  readonly scheduledGameDay: number;
}

/** The full player-facing calendar payload — `political.controller.ts`'s `GET /v1/political-events/calendar`. */
export interface PoliticalCalendarView {
  readonly politicalClimate: PoliticalClimateBand;
  readonly active: readonly PoliticalCalendarEventView[];
  readonly upcoming: readonly UpcomingPoliticalEventView[];
  readonly recentlyEnded: readonly PoliticalCalendarEventView[];
}

/** The 3 CALENDAR-driven event ids `upcoming` ever computes a due-day for (see file header rationale). */
const CALENDAR_DRIVEN_EVENT_IDS = ['E-POL-01', 'E-POL-02', 'E-POL-03'] as const;

@Injectable()
export class PoliticalEventReadService {
  constructor(private readonly repo: PoliticalEventRepository) {}

  /**
   * Build the full player-facing calendar view. "Today" is the city-global
   * `political_calendar_state.last_evaluated_game_day` (nullable before the very first NIGHTLY tick —
   * defaults to gameDay 0, mirroring `PoliticalCalendarTickService`'s own bootstrap-tick convention: no
   * boundary has been evaluated yet, so nothing is active/upcoming-imminent beyond the raw cycle math).
   */
  async getCalendar(): Promise<PoliticalCalendarView> {
    const calendarState = await this.repo.readCalendarState();
    const gameDay = calendarState.lastEvaluatedGameDay ?? 0;

    const activeRows = await this.repo.listCurrentlyActive(gameDay);
    const active = activeRows.map((row) => this.toEventView(row.eventId));

    const endedRows = await this.repo.listRecentlyEnded(gameDay, RECENTLY_ENDED_WINDOW_DAYS);
    const recentlyEnded = endedRows.map((row) => this.toEventView(row.eventId));

    const activeEventIds = new Set(activeRows.map((row) => row.eventId));
    const upcoming = this.computeUpcoming(gameDay, activeEventIds);

    const politicalClimate = this.deriveClimateBand(activeRows.length);

    return { politicalClimate, active, upcoming, recentlyEnded };
  }

  // ── Per-event qualitative rendering (active / recentlyEnded — full detail) ─────────────────────────

  private toEventView(eventId: string): PoliticalCalendarEventView {
    const event = getPoliticalEventById(eventId);
    return {
      eventId: event.eventId,
      name: event.name,
      category: event.category,
      effects: event.effects.map((effect) => this.toEffectView(effect)),
      counterPlay: event.counterPlayActions.map((action) => ({
        name: action.name,
        description: action.description,
      })),
      newsFeedCopy: event.newsFeedCopy,
    };
  }

  private toEffectView(effect: EventEffect): QualitativeEffectView {
    return {
      tunableKey: effect.tunableKey,
      scope: effect.scope,
      direction: deriveEffectDirection(effect.op, effect.magnitudeGetter()),
    };
  }

  // ── `upcoming` — the 3 calendar-driven events only ─────────────────────────────────────────────────

  /**
   * Compute the NEXT due in-game day for each of the 3 CALENDAR-driven events (E-POL-01/02/03), skipping
   * any that is currently active. Delegates the actual cycle math to `computeNextCalendarDueDays`
   * (`political-trigger-evaluators.ts`, extracted 04e-A2 C9 — SHARED with the BO `forecast` endpoint,
   * `political-admin.controller.ts`, so both surfaces derive the SAME due-day numbers from ONE
   * computation) — this method only renders the QUALITATIVE view (name/category via catalogue lookup,
   * R2.2: no raw magnitude) on top of the structural `{eventId, scheduledGameDay}` result.
   */
  private computeUpcoming(gameDay: number, activeEventIds: ReadonlySet<string>): UpcomingPoliticalEventView[] {
    const dueDays = computeNextCalendarDueDays(gameDay, activeEventIds, {
      monthMinutes: politicalEventsTunables.monthMinutes,
      inGameDayLengthMinutes: citySimTunables.inGameDayLengthMinutes,
      electoralCycleInGameMonths: politicalEventsTunables.electoralCycleInGameMonths,
      budgetCycleInGameMonths: politicalEventsTunables.budgetCycleInGameMonths,
    });
    return dueDays.map((entry) => this.toUpcomingView(entry.eventId, entry.scheduledGameDay));
  }

  private toUpcomingView(eventId: (typeof CALENDAR_DRIVEN_EVENT_IDS)[number], scheduledGameDay: number): UpcomingPoliticalEventView {
    const event = getPoliticalEventById(eventId);
    return { eventId: event.eventId, name: event.name, category: event.category, scheduledGameDay };
  }

  // ── The banner (`politicalClimate`) — see file header for the full derivation rationale ────────────

  private deriveClimateBand(activeCount: number): PoliticalClimateBand {
    if (activeCount <= 0) return 'silent';
    const cap = politicalEventsTunables.overlapMaxActive; // REUSED A1 getter (R2.3) — never fabricated.
    if (activeCount >= cap) return 'dramatic';
    return activeCount * 2 >= cap ? 'major' : 'minor';
  }
}

/**
 * `deriveEffectDirection` — mechanical, pure, no invented "good for the player" judgment (see file
 * header: assigning per-lever "good/bad" semantics across ~10 unrelated mechanics would require
 * domain-specific balance calls this chunk is not authorized to invent). Derived ONLY from the effect's
 * OWN op + the sign/ratio of its REAL magnitude (read server-side, never returned):
 *   ADD:      magnitude > 0 → 'increases'; < 0 → 'decreases'; = 0 → 'adjusts'.
 *   MULTIPLY: magnitude > 1 → 'increases'; < 1 → 'decreases'; = 1 → 'adjusts'.
 *   SET:      always 'adjusts' (a SET target is a structural constant, not a delta — no baseline to
 *             compare against, e.g. E-POL-07's target-0 "fully relaxed").
 */
export function deriveEffectDirection(op: PoliticalEffectOp, rawMagnitude: number | string): QualitativeEffectDirection {
  const magnitude = Number(rawMagnitude);
  switch (op) {
    case 'ADD':
      return magnitude > 0 ? 'increases' : magnitude < 0 ? 'decreases' : 'adjusts';
    case 'MULTIPLY':
      return magnitude > 1 ? 'increases' : magnitude < 1 ? 'decreases' : 'adjusts';
    case 'SET':
      return 'adjusts';
  }
}
