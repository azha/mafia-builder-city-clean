// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C6 (news.controller.ts — GET
//             /v1/news/feed + GET /v1/news/beats/:id)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §6.1 (Player surface)
//             Controller pattern seam: `operational/random_world/random-world.controller.ts` (the SAME
//             JwtAuthGuard idiom) — narrower here: NO player resolution at all (D14 — the feed is
//             city-wide, nothing to scope BY).
//             — 04g-C C6 — 2026-07-16
//
// `NewsController` — the PLAYER-FACING NEWS-BEAT API:
//   - GET /v1/news/feed?category=&cursor=&limit=  → chronological beats in the persistence window
//                                                     (D5), city-wide (D14), band/i18n-projected (R2.2).
//   - GET /v1/news/beats/:id                       → ONE beat's detail (i18n body + qualitative
//                                                     source_attribution — outlet/byline/badges).
//
// "Beats are passive read" (canon news_beat_templates.md :75) — NO POST is exposed on this controller;
// there is no read-receipt, no accusé de lecture (design §6.1).
//
// AUTH: `JwtAuthGuard` alone (no `req.account` resolution needed downstream — UNLIKE
// `RandomWorldController`'s own `resolvePlayerId` bridge, this feed takes no player-scoped parameter at
// all, decisions D14). The guard still gates the route (every player-facing endpoint in this codebase
// requires a valid bearer JWT — no token → 401).

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { UuidParam } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { NewsProjectionService, type NewsBeatDetailView, type NewsFeedBeatView } from './news.projection.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class NewsController {
  constructor(private readonly projection: NewsProjectionService) {}

  /**
   * `GET /v1/news/feed?category=&cursor=&limit=` — the city's paper, SAME for every player (D14). No
   * token → 401 (the guard).
   */
  @Get('news/feed')
  @UseGuards(JwtAuthGuard)
  async feed(
    @Query('category') category: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limitParam: string | undefined,
  ): Promise<{ beats: NewsFeedBeatView[]; nextCursor: string | null }> {
    const parsedLimit = limitParam !== undefined ? Number.parseInt(limitParam, 10) : undefined;
    return this.projection.listFeed(category, cursor, parsedLimit);
  }

  /**
   * `GET /v1/news/beats/:id` — ONE beat's detail (design §6.1). 404 (`RESOURCE_NOT_FOUND`) if `id` is
   * unknown.
   */
  @Get('news/beats/:id')
  @UseGuards(JwtAuthGuard)
  async detail(@Param('id', UuidParam) id: string): Promise<NewsBeatDetailView> {
    const view = await this.projection.getBeatDetail(id);
    if (!view) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No news beat ${id}.` });
    }
    return view;
  }
}
