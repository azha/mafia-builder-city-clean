// IMPLEMENTS: docs/superpowers/plans/2026-07-24-p3-H-vertical-horizon-plan.md C6 ("`GET /v1/meta/benchmark`
//             (drift buckets only — §9.2, `DriftBucketEnum`)") + C7 ("`POST /v1/meta/benchmark/reanchor
//             {metric_kinds[]}`").
//             Design: docs/superpowers/specs/2026-07-24-p3-H-vertical-horizon-design.md §10 (`GET /v1/meta/
//             benchmark` — "per LIVE metric `{metric_key, drift_bucket}` ... never the raw drift pct, never
//             baseline values" + the C7 quota fields) + §9.3 (`POST .../reanchor`).
//             C0-reanchor: docs/superpowers/specs/2026-07-24-p3-H-C0-reanchor.md §15/R14 ("player routes:
//             ... every `meta/*` path segment is a PER-HANDLER decorator" — the SAME convention followed
//             here).
//             Pattern (player identity bridge `resolvePlayerId`, duplicated per-controller — this
//             codebase's own established convention, NEVER a shared helper): `pressure-tier.controller.ts
//             #resolvePlayerId` (copied verbatim).
//             Pattern (a NEW POST route folded into the SAME controller as its sibling GET when they share
//             the identical immediate resource segment — `meta/benchmark` here, `meta/horizon/execution-
//             plans` there): `execution-plan.controller.ts` (`POST`+`GET .../execution-plans` in ONE file);
//             CONTRASTS with `horizon-tier-advancement.controller.ts`'s own "separate file" posture, which
//             applies when the immediate segment DIFFERS (`advance-tier` vs `execution-plans`) — here it does
//             NOT (`reanchor` is a sub-action of `benchmark`, not a sibling resource).
//             — P3-H C6 — 2026-07-24 (GET /v1/meta/benchmark) / C7 — 2026-07-24 (POST .../reanchor)
//
// `BenchmarkDriftController` — the PLAYER-FACING `GET /v1/meta/benchmark` + `POST /v1/meta/benchmark/reanchor`
// routes (design §9.3/§10), a SIBLING controller inside `VerticalHorizonModule` (mirrors `PressureTierController`'s
// own "a DIFFERENT base path gets its OWN controller file" posture). Requires a PLAYER JWT. Always registered
// (a real player surface).

import { Body, Controller, Get, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../protocol/versioning';
import { ApiError } from '../protocol/api-error';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../auth/authenticated-request';
import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { account } from '../db/schema/account';
import { player } from '../db/schema/player';
import { BenchmarkDriftService, type BenchmarkProjection, type ReAnchorResult } from './benchmark-drift.service';
import { rejectUnknownFields } from '../common/param-pipes';

/** `POST /v1/meta/benchmark/reanchor` body (design §9.3 verbatim — `{metric_kinds[]}`). */
export interface ReAnchorBody {
  metric_kinds?: unknown;
}

function requireMetricKindsArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError('VALIDATION_FAILED', { message: `${field} must be a non-empty array of strings.` });
  }
  return value.map((v, i) => {
    if (typeof v !== 'string' || v.trim() === '') {
      throw new ApiError('VALIDATION_FAILED', { message: `${field}[${i}] must be a non-empty string.` });
    }
    return v;
  });
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class BenchmarkDriftController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly benchmarkDrift: BenchmarkDriftService,
  ) {}

  /**
   * `GET /v1/meta/benchmark` — the per-LIVE-metric drift-bucket projection + the C7 quota fields (design
   * §9.2/§9.4/§10): `{metrics: [{metric_key, drift_bucket}, ...], quota_remaining, quota_max}`. Requires a
   * PLAYER JWT.
   */
  @Get('meta/benchmark')
  @UseGuards(JwtAuthGuard)
  async getBenchmark(@Req() req: RequestWithAccount): Promise<BenchmarkProjection> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.benchmarkDrift.getProjection(playerId);
  }

  /**
   * `POST /v1/meta/benchmark/reanchor` — re-anchor 1..`metrics_simultaneous_reanchor` LIVE metrics (design
   * §9.3). Body: `{metric_kinds: string[]}`. 422 `VALIDATION_FAILED` (malformed body / a non-LIVE kind); 422
   * `METRICS_SIMULTANEOUS_REANCHOR_EXCEEDED` (too many metrics, no write); 409 `REANCHOR_QUOTA_EXHAUSTED`
   * (0 uses remaining this week, nothing written); 200 `{metric_kinds, lagging_revealed, quota_remaining,
   * quota_max}` on success. Requires a PLAYER JWT. Idempotency-Key supported (the global interceptor).
   */
  @Post('meta/benchmark/reanchor')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async reAnchor(@Body() body: ReAnchorBody, @Req() req: RequestWithAccount): Promise<ReAnchorResult> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['metric_kinds']);

    const metricKinds = requireMetricKindsArray(body.metric_kinds, 'metric_kinds');
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return this.benchmarkDrift.reAnchor(playerId, metricKinds);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (copied verbatim from
   *  `pressure-tier.controller.ts`'s own established idiom, this codebase's per-controller convention,
   *  never a shared helper). 404 if none. */
  private async resolvePlayerId(accountId: string): Promise<string> {
    const rows = await this.db
      .select({ player_id: player.player_id })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .where(and(eq(player.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    const playerId = rows[0]?.player_id;
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }
    return playerId;
  }
}
