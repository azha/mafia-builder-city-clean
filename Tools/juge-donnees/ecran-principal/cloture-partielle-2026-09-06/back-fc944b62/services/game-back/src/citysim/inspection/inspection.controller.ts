// IMPLEMENTS: docs/tech/04_city_simulation/system_6_inspection_queue.md §Invariant 4 + §Player interaction
//             surface (queue-load qualitative + DispatcherRegime ; jamais position/bâtiment/count — the
//             informant-fee READ surface) + 18 envelope/versioning (/v1, ResponseEnvelope) +
//             17 JwtAuthGuard (req.account → player_id)
//             TD-012 (lot-5 L5-T6l): POST /v1/city/inspection/report — FILE false/genuine report action
//             (law_mis §NestJS §175: POST /mis/report/submit). FalseReportLedger + flood backlash.
//             -- session:2026-06-03 (Phase 1 Task 7); updated 2026-06-14 (TD-012 lot-5) --
//             W6a C1.0 (2026-08-08, docs/superpowers/specs/2026-08-07-w6a-authz-remediation-design.md
//             §2bis X9 + §3 C1.0 item 5): the D2 R9 TEST-ONLY `GET /v1/_test/citysim/inspection/
//             mis-inject-counter` probe MOVED OUT of this file into `inspection-test.controller.ts`
//             (gated by `testControllersEnabled()`, `InspectionQueueModule`). It was previously
//             mounted on THIS production controller unconditionally — joignable, unauthenticated,
//             even under NODE_ENV=production (a `_test` route on a prod controller, the exact defect
//             C0 §1.3 documents). No behavior change in dev/test envs; production now correctly 404s.
//
// `InspectionQueueController` — the PLAYER-FACING district-inspection API:
//   GET  /v1/city/district/:id/inspection       — qualitative queue-load projection (Inv 4).
//   POST /v1/city/inspection/report             — FILE a false or genuine report (TD-012).
//
// PLAYER RESOLUTION (same identity bridge as Flow Cells / Sparse Citizens / Police Memory / Patrol / Cohesion /
// GET /v1/me): the JwtAuthGuard verifies the bearer JWT and attaches `req.account` (account_id, kind — from
// verified claims, never the body — R-ID-3). The city sim is keyed by player_id, so we resolve account_id →
// player_id via the 1-1 Player↔Account link (player.account_id UNIQUE — schema_player.md §6), filtered to
// PLAYER accounts.
//
// `:id` is the district id (1..city.district_count = 18). The endpoint returns the qualitative queue-load
// bucket + the dispatcher regime + the type/severity presence-band distribution (Inv 4 — the informant-fee read
// surface) — NEVER building ids, exact positions, or raw counts.
//
// Handlers return plain `data`; the global EnvelopeInterceptor wraps it in a success ResponseEnvelope.

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { IntParam, enumField, intField, rejectUnknownFields, uuidField } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { InspectionQueueService } from './inspection.service';
import {
  InspectionQueueProjectionService,
  type InspectionQueueProjection,
} from './inspection.projection.service';
import { FalseReportLedgerService, type FileReportResult } from './false-report-ledger.service';
import { InspectionQueueRepository } from './inspection.repository';
import type { FalseReportEntryType } from '../../db/schema/false_report_ledger';

/** Body shape for POST /v1/city/inspection/report (TD-012 FILE action). */
interface FileReportBody {
  building_id: number;
  entry_type: FalseReportEntryType;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class InspectionQueueController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly inspection: InspectionQueueService,
    private readonly projection: InspectionQueueProjectionService,
    private readonly ledger: FalseReportLedgerService,
    private readonly queueRepo: InspectionQueueRepository,
  ) {}

  /**
   * `GET /v1/city/district/:id/inspection` — the requesting player's qualitative MIS inspection-queue read for a
   * district (the informant-fee READ surface). Inv 4 / R2.2: returns ONLY the qualitative queue-load bucket +
   * dispatcher regime + the type/severity presence-band distribution — NEVER building ids, exact positions, or
   * raw counts. Requires a PLAYER JWT (JwtAuthGuard). A district id outside 1..18 → VALIDATION error; a district
   * with no seeded queue row (player never ticked the 12h dispatch) → RESOURCE_NOT_FOUND.
   */
  @Get('city/district/:id/inspection')
  @UseGuards(JwtAuthGuard)
  async districtInspection(
    @Param('id', IntParam) districtId: number,
    @Req() req: RequestWithAccount,
  ): Promise<InspectionQueueProjection> {
    // L0.3 (D5) — IntParam precedes, and does not replace, this domain-specific bound (1..city.district_count,
    // a tunable — CLAUDE.md's own "borne dans le contrôleur" caveat, socle 2026-08-26 m6-5).
    if (!this.inspection.isValidDistrict(districtId)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `district id must be an integer in 1..18 (got "${districtId}").`,
      });
    }

    const accountId = req.account!.account_id; // populated by JwtAuthGuard (verified claims, never the body).
    const playerId = await this.resolvePlayerId(accountId);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }

    const state = await this.projection.projectDistrict(playerId, districtId);
    if (state === null) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: 'No inspection queue for this player yet (the city sim has not ticked the 12h dispatch).',
      });
    }
    return state;
  }

  /**
   * `POST /v1/city/inspection/report` — FILE a false or genuine report (TD-012 FalseReportLedger action).
   * Accepts `{ building_id: int, entry_type: 'FALSE_REPORT' | 'GENUINE_REPORT' }`. Returns 201 with the
   * new ledger entry summary (report_id, entry_type, cost_resolved, backlash_triggered).
   *
   * Flood backlash (law_mis §173): if the false:genuine ratio over 30 days >= flood_backlash_threshold
   * (gdd/14 L137 = 8:1), the backlash is activated (backlash_triggered=true in the response) AND a
   * SCHEDULED auto-audit is injected into the player's district 1 queue (the observable consequence
   * the E2E probes via total_queue_length).
   *
   * Requires a PLAYER JWT (JwtAuthGuard). Validates entry_type. Returns VALIDATION_FAILED on unknown type.
   */
  @Post('city/inspection/report')
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  async fileReport(
    @Body() body: FileReportBody,
    @Req() req: RequestWithAccount,
  ): Promise<FileReportResult> {
    // L0.3 (D5) — entry_type: text column, CHECK-enforced closed domain (false_report_ledger.ts:22) ; no
    // pgEnum backs it, so the literal FalseReportEntryType members are the source of truth (DF-11 applies
    // only where a pgEnum's own .enumValues exists). building_id: integer column (false_report_ledger.ts:21).
    // TD-451 — mesuré : le seul appelant de cette route est la suite E2E (le client Unity ne l'appelle
    // nulle part), et elle n'envoie que ces deux champs.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['entry_type', 'building_id']);
    const entryType = enumField(['FALSE_REPORT', 'GENUINE_REPORT'], body as unknown as Record<string, unknown>, 'entry_type') as FalseReportEntryType;

    // Le playerId est résolu ICI, avant toute lecture de la cible : le contrôle d'appartenance en a
    // besoin, et une cible refusée ne doit jamais atteindre la base.
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }

    // ⛔ TD-481 — DEUX FORMES ACCEPTÉES, et ce n'est pas une complaisance :
    //   · un **uuid** désigne un bâtiment RÉEL du joueur (vérifié possédé) — le référent honnête ;
    //   · un **entier** reste accepté parce que 5 sites de spec en envoient (`1001`, `2001`, `3000+i`,
    //     `5001`) et qu'aucun ne pourrait désigner un bâtiment : c'est le proxy synthétique du domaine
    //     inspection. Exiger l'uuid casserait le SEUL appelant existant de cette route pour servir un
    //     client qui ne l'appelle pas encore.
    // ⚠️ Le proxy est DÉPRÉCIÉ, pas béni : il n'écrit plus que `target_building_id` (nullable depuis
    //    mig 0151), et il est le seul chemin où le retour de bâton injecte un audit — parce que la file
    //    d'inspection n'adresse que des entiers (couplage réel = System 7).
    const brut = (body as unknown as Record<string, unknown>)?.building_id;
    let target: { uuid: string } | { legacyProxyId: number };
    if (typeof brut === 'string') {
      const uuidCible = uuidField(body as unknown as Record<string, unknown>, 'building_id');
      // ⛔ CONTRÔLE D'APPARTENANCE — sans lui, la route accepterait l'uuid de N'IMPORTE QUEL bâtiment
      // et remplacerait un mensonge (un entier qui ne désigne rien) par un autre (un bâtiment d'autrui).
      const possede = await this.ledger.buildingBelongsToPlayer(playerId, uuidCible);
      if (!possede) {
        throw new ApiError('VALIDATION_FAILED', {
          message: 'building_id must be a building owned by this player.',
          details: { param: 'building_id' },
        });
      }
      target = { uuid: uuidCible };
    } else {
      const proxy = intField(body as unknown as Record<string, unknown>, 'building_id');
      if (proxy < 0) {
        throw new ApiError('VALIDATION_FAILED', {
          message: `building_id must be a non-negative integer or a uuid (got "${proxy}").`,
          details: { param: 'building_id' },
        });
      }
      target = { legacyProxyId: proxy };
    }

    // Read the player's currently-seeded district ids so the backlash audit has a queue to inject into.
    const queues = await this.queueRepo.listQueues(playerId);
    const districtIds = queues.map((q) => q.district_id);

    return this.ledger.fileReport(playerId, target, entryType, districtIds);
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge). */
  private async resolvePlayerId(accountId: string): Promise<string | null> {
    const rows = await this.db
      .select({ player_id: player.player_id })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .where(and(eq(player.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    return rows[0]?.player_id ?? null;
  }
}
