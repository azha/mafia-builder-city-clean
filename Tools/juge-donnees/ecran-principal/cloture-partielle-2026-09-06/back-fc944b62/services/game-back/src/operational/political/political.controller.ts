// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C8 (player surfaces —
//             read-only political-calendar API) + 18 envelope/versioning (/v1, ResponseEnvelope)
//             Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md §Player UI
//             (:177-196 "Political calendar" read-only surface).
//             Pattern mirror: citysim/world/world.controller.ts (a public, city-global, qualitative-only
//             read surface — no player-scoping needed; handlers return plain `data`, the global
//             EnvelopeInterceptor wraps it in a ResponseEnvelope, handlers never build the envelope).
//             — 04e-A2 C8 — 2026-07-06
//
// `PoliticalController` — the PLAYER-FACING R2.2 read-only political-calendar API:
//   GET /v1/political-events/calendar → the qualitative calendar view (banner + active/upcoming/recent).
//
// The political calendar is CITY-GLOBAL (design §5.2, "one shared active-event set" — the SAME view for
// every player, unlike a per-player projection such as SellingController's dealer bands). It carries no
// player-identifying or player-scoped data, so — exactly like `WorldController`'s public map surface — no
// JWT/player resolution is needed: this is a read-only, R2.2-safe, qualitative city fact any authenticated
// client session can render (the app's own auth gate happens upstream of this route in production, mirrors
// `world/districts` / `world/threnny-edges`).

import { Controller, Get } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { PoliticalEventReadService, type PoliticalCalendarView } from './political-event-read.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class PoliticalController {
  constructor(private readonly readService: PoliticalEventReadService) {}

  /**
   * `GET /v1/political-events/calendar` — the read-only political calendar (catalogue.md §Player UI):
   * the qualitative `politicalClimate` banner (silent/minor/major/dramatic, NO countdown timer — L6) — % allowed-mention: design comment (L6 brand-safe "no countdown" choice)
   * `active` (full qualitative detail: effects direction + counter-play + news copy) + `upcoming`
   * (the 3 calendar-driven events only, WITH an explicit in-game due day — a calendar DATE, not a
   * countdown) + `recentlyEnded` (last 30 game-days). R2.2 grep-zero: no raw effect magnitude, no — % allowed-mention: design comment (R2.2 grep-zero rule statement, not a countdown implementation)
   * `expires_at_game_day`/activation timestamp, ever.
   */
  @Get('political-events/calendar')
  async calendar(): Promise<PoliticalCalendarView> {
    return this.readService.getCalendar();
  }
}
