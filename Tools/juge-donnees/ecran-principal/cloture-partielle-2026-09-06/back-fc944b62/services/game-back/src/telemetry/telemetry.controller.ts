// IMPLEMENTS: docs/tech/20_telemetry_analytics/telemetry_principles.md §5 NestJS — backend jeu (PRIMARY:
//             ingestion gated + classified) ; §4 RBAC (staff read = aggregate/projection, never raw PII)
//             + 26/consent_flows.md §2.4 (consent gate) + 18 envelope/versioning (/v1, ResponseEnvelope)
//             -- session:2026-06-02 (Phase 0 Task 9) --
//
// `TelemetryController` — the `/v1/telemetry/*` surface.
//
//   - POST /v1/telemetry/events          → ingest one event. PUBLIC (no auth guard): an ANONYMOUS
//                                          technical/legitimate-interest event has no player. A PII
//                                          event carries player_id + a consent scope in the body and
//                                          is consent-gated server-side (26 §2.4). 202 Accepted +
//                                          { event_id } on success; typed ch18 error otherwise.
//   - GET  /v1/telemetry/events/recent   → STAFF-gated read PROJECTION (R2.2 inverted — name/domain/
//                                          class/time, NEVER the raw payload). The PRIMARY observable
//                                          is the DB row (charte 27 DB_STATE); this read is OPTIONAL.
//
// ROLE RECONCILIATION (flagged): the plan's informal "analytics role" has NO canonical equivalent —
// StaffRoleEnum = player|player_support|gm|admin|super_admin (17 authorization_rbac.md). We reconcile
// to "any STAFF account", gated by the existing StaffRoleGuard (same pattern as /health/detailed).

import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../protocol/versioning';
import { StaffRoleGuard } from '../auth/staff-role.guard';
import { TelemetryIngestionService, type IngestRequest, type IngestResult } from './ingestion.service';
import { TelemetryEventRepository, type TelemetryEventProjection } from './telemetry-event.repository';
import { rejectUnknownFields } from '../common/param-pipes';

/** The staff read projection envelope (R2.2 inverted — a bounded list, never a raw row dump). */
interface RecentEventsProjection {
  events: TelemetryEventProjection[];
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class TelemetryController {
  constructor(
    private readonly ingestion: TelemetryIngestionService,
    private readonly repo: TelemetryEventRepository,
  ) {}

  /**
   * `POST /v1/telemetry/events` — ingest one telemetry event. 202 Accepted (the event is queued for
   * the analytic pipeline; the request does not create an addressable REST resource — telemetry is
   * fire-and-observe). The EnvelopeInterceptor wraps the returned `{ event_id, accepted }` in a
   * success ResponseEnvelope. The IdempotencyInterceptor (global, mutations) dedups replays.
   */
  @Post('telemetry/events')
  @HttpCode(202)
  async ingest(@Body() body: IngestRequest): Promise<IngestResult> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['name', 'domain', 'privacy_class', 'schema_version', 'player_id', 'payload', 'consent_scope']);

    return this.ingestion.ingest(body);
  }

  /**
   * `GET /v1/telemetry/events/recent?limit=N` — STAFF-gated recent-events projection (R2.2 inverted).
   * StaffRoleGuard: any verified STAFF account (canonical role; no `analytics` role exists). A player
   * token or a BO_BACK-audience staff token → 403 (lot-1 TD-076 — StaffRoleGuard now requires
   * aud=GAME_BACK). Callers MUST use the `game_back_access_token` from the dual-audience signin.
   * The projection NEVER carries the raw payload (no PII dump).
   */
  @Get('telemetry/events/recent')
  @UseGuards(StaffRoleGuard)
  async recent(@Query('limit') limit?: string): Promise<RecentEventsProjection> {
    const parsed = Number.parseInt(limit ?? '20', 10);
    const bounded = Number.isNaN(parsed) ? 20 : Math.min(Math.max(parsed, 1), 100);
    const events = await this.repo.recent(bounded);
    return { events };
  }
}
