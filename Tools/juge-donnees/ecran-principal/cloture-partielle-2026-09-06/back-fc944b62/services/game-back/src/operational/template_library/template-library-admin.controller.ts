// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1 (template-library-admin.
//             controller.ts — subset C1: summary/library/health) + C2 (`GET mapping`/`GET unmapped`,
//             health's arithmetic breakdown) + C3 (`POST reskins/validate` — dry-run, zero write)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §6.2 (BO surfaces) +
//             §3.5 (the 3 validators)
//             Pattern: services/game-back/src/operational/random_world/random-world-admin.controller.ts
//             (`requireStaffRole` role-split GET shape, P5 BO-inversion raw payloads).
//             — 04g-D C1/C2/C3 — 2026-07-17
//
// `TemplateLibraryAdminController` — 5 GET endpoints + 1 POST, role `gm` (D9 — canon says `ops`, no
// shipped controller in this codebase uses that role literal; gm ≡ ops, precedent 04g-B header):
//
//   GET /v1/admin/template-library/summary            — counts per category + total (§3.7.1 boot-verified)
//   GET /v1/admin/template-library/library?category=  — entries for one category (RAW, P5 inversion) — 422
//                                                        on an unknown category
//   GET /v1/admin/template-library/health              — boot assertion proof + disposition counts +
//                                                        (C2) the §3.7.4 mapping arithmetic breakdown +
//                                                        (C3) `antiFomoBootScan`
//   GET /v1/admin/template-library/mapping[?eventId=]  — (C2) all 25 `TemplateMappingEntry` instantiations,
//                                                        or ONE via `lookupByEventId` when `eventId` is
//                                                        given — 404 `RESOURCE_NOT_FOUND` if unknown
//   GET /v1/admin/template-library/unmapped            — (C2) the 34 ship-ready + 3 trash backlog + the
//                                                        6 per-category joint count×days alert states
//   POST /v1/admin/template-library/reskins/validate   — (C3) dry-run `TemplateInstantiationValidator.
//                                                        enforce()` (mode-aware, delegates to `EventReskin-
//                                                        Validator`'s 4 rules) + `AntiFomoValidator.
//                                                        scanComposition()` — ZERO write, mount-INDEPENDENT
//                                                        (validates the authored spec, never touches
//                                                        `event_reskin`).
//
// C4a (D1=B RULED) adds, role `admin` (D9 — stricter than the `gm` reads above):
//   POST /v1/admin/template-library/reskins          — commit: `EventReskinComposer.compose()` — persists
//                                                        `committed` on success, `rejected` (+ reason) on
//                                                        EITHER a validator OR an AntiFOMO rejection; the
//                                                        controller maps `outcome:'rejected'` to 422.
//   GET  /v1/admin/template-library/reskins[?status=] — (role gm) authored reskins, optional status filter.
//   POST /v1/admin/template-library/reskins/:id/mount — dispatch (design §3.6/§3.6-B): ★ C4b — LIVE_OPS
//                                                        mounts REALLY (200, via `LiveOpsReskinMountAdapter`
//                                                        — may 422 with ITS OWN typed reasons, design
//                                                        §3.6-B) ; the other 5 categories: 422
//                                                        `mount_unavailable` (row left untouched).
//   GET  /v1/admin/template-library/anti-fomo/status  — (role gm) boot scan + composition-time rejections
//                                                        (derived `event_reskin.status='rejected'` rows
//                                                        whose reason starts with `anti_fomo_rejected:`).
//
// P5 BO INVERSION (R2.2 does NOT apply): every GET below returns RAW library entries (full
// `catalogueRef`/`trashReason`/`registryOnlyReason`/`tdRef`) — an ops-diagnostic surface, zero player
// projection exists in this lot (design §6.1, D14).
//
// requireStaffRole is NON-SPOOFABLE (JWT bearer, server-side) — no token → 401 ; a player token → 403.

import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';

import { requireStaffRole } from '../../auth/staff-role.guard';
import { ApiError } from '../../protocol/api-error';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import type { EventReskinRow } from '../../db/schema/template_library';
import { TemplateLibraryService, type TemplateLibraryHealth, type TemplateLibrarySummary } from './template-library.service';
import type { TemplateLibraryEntry } from './template-library-entry';
import type { TemplateMappingEntry } from './event-template-mapping-registry';
import type { UnmappedCategoryAlertState } from './unmapped-templates-opportunity.registry';
import { TemplateInstantiationValidator } from './template-instantiation-validator';
import { scanComposition } from './anti-fomo-validator';
import { AntiFomoValidator } from './anti-fomo-validator.service';
import { EventReskinComposer, type EventReskinComposeFailureReason, type EventReskinComposeWarning } from './event-reskin-composer';
import type { ReskinSpec, EventReskinValidationFailureReason } from './event-reskin-validator';
import { TemplateCategory } from './template-category';

/** The dry-run request body — a candidate `ReskinSpec` (design §3.5.1). Defensive shape coercion only
 *  (never a deep runtime-validation library, mirrors this controller's own existing `ForceTemplateBody`-
 *  style precedent in `random-world-admin.controller.ts`) — a malformed `crossRefs`/`tunables` degrades to
 *  the empty case, which the rules below reject with their own precise reason, never a generic 400.
 *  `liveOps` (§4.1-B, C4a task 1) passes through AS-IS when present and object-shaped — this chunk never
 *  validates its contents (structurally free jsonb until the C4b mount gate, design §4.1-B); a malformed
 *  shape here simply degrades to `undefined` (absent at commit, same as never having sent it) rather than
 *  a generic 400 — the SAME defensive posture as every other field on this function. */
function coerceReskinSpec(body: Partial<ReskinSpec> & Record<string, unknown>): ReskinSpec {
  return {
    eventId: typeof body.eventId === 'string' ? body.eventId : '',
    templateId: typeof body.templateId === 'string' ? body.templateId : '',
    hostCategory: (body.hostCategory as TemplateCategory) ?? TemplateCategory.LIVE_OPS,
    name: typeof body.name === 'string' ? body.name : '',
    reskinDescription: typeof body.reskinDescription === 'string' ? body.reskinDescription : '',
    tunables: body.tunables && typeof body.tunables === 'object' ? (body.tunables as Record<string, number>) : {},
    crossRefs: Array.isArray(body.crossRefs) ? (body.crossRefs as ReskinSpec['crossRefs']) : [],
    durationRealDays: typeof body.durationRealDays === 'number' ? body.durationRealDays : undefined,
    liveOps: body.liveOps && typeof body.liveOps === 'object' ? (body.liveOps as ReskinSpec['liveOps']) : undefined,
  };
}

/** The `payload.error.details` shape on a 422 rejection — covers the 4 `EventReskinValidationFailure
 *  Reason` values PLUS `anti_fomo_rejected` (a 5th reason this OWN endpoint adds, since `AntiFomoValidator`
 *  is a SEPARATE validator from `EventReskinValidator`, design §3.5.3 — never folded into that union). */
interface ReskinValidationFailureDetailDto {
  readonly validation_failure_reason: EventReskinValidationFailureReason | 'anti_fomo_rejected';
  readonly matchedToken?: string;
  readonly field?: 'name' | 'reskinDescription';
}

/** `POST reskins`'s own 422 detail shape (C4a) — same `EventReskinComposeFailureReason` union `Event-
 *  ReskinComposer.compose()` returns on its `outcome:'rejected'` branch. */
interface ReskinComposeFailureDetailDto {
  readonly validation_failure_reason: EventReskinComposeFailureReason;
  readonly matchedToken?: string;
  readonly field?: 'name' | 'reskinDescription';
  /** The `id` of the `event_reskin` row PERSISTED for this rejection (D10 — rejections are persisted,
   *  never silently dropped) — lets a caller correlate the 422 response with its own audit-trail row. */
  readonly eventReskinId: string;
}

// `POST reskins/:id/mount`'s 422 detail shapes are built AND thrown directly by `EventReskinComposer.
// mount()` (`{validation_failure_reason:'mount_unavailable', hostCategory, seam}`, the 5 non-LIVE_OPS
// categories) or by `LiveOpsReskinMountAdapter.mount()` (★ C4b, `LiveOpsMountFailureReason` — design
// §3.6-B) — this controller method is a pure delegate (`mountReskin` below), no DTO needed on this side.

@Controller('admin')
export class TemplateLibraryAdminController {
  constructor(
    private readonly library: TemplateLibraryService,
    private readonly templateInstantiationValidator: TemplateInstantiationValidator,
    private readonly antiFomo: AntiFomoValidator,
    private readonly composer: EventReskinComposer,
  ) {}

  // ─── GET /admin/template-library/summary — counts per category + total (role gm) ────────────────────
  @Get('template-library/summary')
  @UseGuards(requireStaffRole('gm'))
  summary(): TemplateLibrarySummary {
    return this.library.summary();
  }

  // ─── GET /admin/template-library/library?category= — entries for one category (role gm) ────────────
  @Get('template-library/library')
  @UseGuards(requireStaffRole('gm'))
  libraryByCategory(@Query('category') category: string | undefined): { category: string; entries: readonly TemplateLibraryEntry[] } {
    if (!category) {
      throw new ApiError('VALIDATION_FAILED', { message: 'Query param "category" is required.' });
    }
    const entries = this.library.entriesByCategory(category);
    if (!entries) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown TemplateCategory: ${JSON.stringify(category)}.`,
      });
    }
    return { category, entries };
  }

  // ─── GET /admin/template-library/health — boot assertion proof (role gm) ────────────────────────────
  // (C3) merges `TemplateLibraryService.health()` (C1/C2, unchanged) with `AntiFomoValidator.bootScan()`
  // (this file's own separately-injected provider — see anti-fomo-validator.service.ts header for why
  // `TemplateLibraryService` itself never depends on `AntiFomoValidator`).
  @Get('template-library/health')
  @UseGuards(requireStaffRole('gm'))
  async health(): Promise<TemplateLibraryHealth & { antiFomoBootScan: Awaited<ReturnType<AntiFomoValidator['bootScan']>> }> {
    const base = this.library.health();
    const antiFomoBootScan = await this.antiFomo.bootScan();
    return { ...base, antiFomoBootScan };
  }

  // ─── GET /admin/template-library/mapping[?eventId=] — 25 instantiations, or 1 via lookup (role gm) ───
  @Get('template-library/mapping')
  @UseGuards(requireStaffRole('gm'))
  mapping(
    @Query('eventId') eventId: string | undefined,
  ): { mappings: readonly TemplateMappingEntry[] } | { mapping: TemplateMappingEntry } {
    if (!eventId) {
      return { mappings: this.library.allMappings() };
    }
    const entry = this.library.lookupMappingByEventId(eventId);
    if (!entry) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `Unknown instantiationId: ${JSON.stringify(eventId)} (not one of the 25 mapping entries).`,
      });
    }
    return { mapping: entry };
  }

  // ─── GET /admin/template-library/unmapped — 34 ship-ready + 3 trash + per-category alert (role gm) ───
  @Get('template-library/unmapped')
  @UseGuards(requireStaffRole('gm'))
  unmapped(): {
    shipReady: readonly TemplateLibraryEntry[];
    trash: readonly TemplateLibraryEntry[];
    alerts: readonly UnmappedCategoryAlertState[];
  } {
    return {
      shipReady: this.library.unmappedShipReady(),
      trash: this.library.trashForPosterity(),
      alerts: this.library.unmappedAlertStates(),
    };
  }

  // ─── POST /admin/template-library/reskins/validate — dry-run, ZERO write (role gm) ─────────────────
  // Routes the candidate spec through the SAME pipeline `EventReskinComposer.compose()` (C4) will use:
  // `TemplateInstantiationValidator.enforce()` (mode-aware, delegates to `EventReskinValidator`'s 4 rules)
  // THEN `AntiFomoValidator.scanComposition()`. Never persists — `event_reskin` has zero writer this chunk.
  @Post('template-library/reskins/validate')
  @HttpCode(200)
  @UseGuards(requireStaffRole('gm'))
  async validateReskin(
    @Body() body: Partial<ReskinSpec> & Record<string, unknown>,
  ): Promise<{ valid: true; strictMode: boolean; warnings: readonly EventReskinComposeWarning[] }> {
    const spec = coerceReskinSpec(body);

    // 1. TemplateInstantiationValidator.enforce() — mode-aware, delegates to the 4 EventReskinValidator
    //    rules (crossRefs/templateExists/eventIdFresh always-blocking, tunableRanges mode-gated).
    const enforceResult = await this.templateInstantiationValidator.enforce(spec);
    if (!enforceResult.ok) {
      throw new ApiError('VALIDATION_FAILED', {
        message: enforceResult.message ?? `ReskinSpec rejected: ${enforceResult.reason}`,
        details: {
          validation_failure_reason: enforceResult.reason,
        } satisfies ReskinValidationFailureDetailDto,
      });
    }

    // 2. scanComposition() — ALWAYS active regardless of strict/lax mode (§3.5.3).
    const fomoHit = scanComposition(spec);
    if (fomoHit) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `ReskinSpec.${fomoHit.field} was refused by the AntiFOMO composition-time gate (matched forbidden pattern "${fomoHit.token}").`,
        details: {
          validation_failure_reason: 'anti_fomo_rejected',
          matchedToken: fomoHit.token,
          field: fomoHit.field,
        } satisfies ReskinValidationFailureDetailDto,
      });
    }

    return { valid: true, strictMode: enforceResult.strictMode, warnings: enforceResult.warnings };
  }

  // ─── POST /admin/template-library/reskins — commit (role admin, D9) ─────────────────────────────────
  // `EventReskinComposer.compose()` — SAME pipeline as the dry-run above (enforce() then scanComposition())
  // but PERSISTS: `committed` on success, `rejected` (+ rejection_reason, D10) on EITHER failure. A
  // `rejected` outcome still maps to HTTP 422 here (canon "EventReskin NOT emitted" reads as "not usable",
  // the row nonetheless exists for the BO audit trail / `GET anti-fomo/status`, D10).
  @Post('template-library/reskins')
  @HttpCode(201) // a NEW event_reskin row is created on the committed path → 201 (precedent grow.controller.ts:56).
  @UseGuards(requireStaffRole('admin'))
  async commitReskin(
    @Body() body: Partial<ReskinSpec> & Record<string, unknown>,
    @Req() req: RequestWithAccount,
  ): Promise<{
    eventReskin: EventReskinRow;
    warnings: readonly EventReskinComposeWarning[];
    strictMode: boolean;
    f3_deferred: true;
  }> {
    const spec = coerceReskinSpec(body);
    const staffId = req.account!.account_id;
    const result = await this.composer.compose(spec, staffId);

    if (result.outcome === 'rejected') {
      throw new ApiError('VALIDATION_FAILED', {
        message: result.message,
        details: {
          validation_failure_reason: result.reason,
          matchedToken: result.matchedToken,
          field: result.field,
          eventReskinId: result.row.id,
        } satisfies ReskinComposeFailureDetailDto,
      });
    }

    return { eventReskin: result.row, warnings: result.warnings, strictMode: result.strictMode, f3_deferred: true };
  }

  // ─── GET /admin/template-library/reskins[?status=] — authored reskins (role gm) ──────────────────────
  @Get('template-library/reskins')
  @UseGuards(requireStaffRole('gm'))
  async listReskins(@Query('status') status: string | undefined): Promise<{ reskins: readonly EventReskinRow[] }> {
    if (status !== undefined && status !== 'committed' && status !== 'mounted' && status !== 'rejected') {
      throw new ApiError('VALIDATION_FAILED', { message: `Unknown event_reskin status: ${JSON.stringify(status)}.` });
    }
    return { reskins: await this.composer.listByStatus(status) };
  }

  // ─── POST /admin/template-library/reskins/:id/mount — dispatch (role admin, D9) ─────────────────────
  // ★ C4b (D1=B RULED, design §3.6-B): LIVE_OPS mounts FOR REAL — 200, `LiveOpsReskinMountAdapter` — the
  // reskin becomes schedulable/activatable via the EXISTING `POST admin/liveops/schedule` + scheduler
  // sweep. The other 5 categories still throw 422 `mount_unavailable`; the row is left `committed` either
  // way on failure — the anti-fig-leaf proof (design §3.6).
  @Post('template-library/reskins/:id/mount')
  @HttpCode(200)
  @UseGuards(requireStaffRole('admin'))
  async mountReskin(
    @Param('id') id: string,
    @Req() req: RequestWithAccount,
  ): Promise<{ eventReskin: EventReskinRow; idempotent: boolean; f3_deferred: true }> {
    const staffId = req.account!.account_id;
    const result = await this.composer.mount(id, staffId);
    return { eventReskin: result.row, idempotent: result.idempotent, f3_deferred: true };
  }

  // ─── GET /admin/template-library/anti-fomo/status — boot scan + composition rejects (role gm) ───────
  @Get('template-library/anti-fomo/status')
  @UseGuards(requireStaffRole('gm'))
  async antiFomoStatus(): Promise<{
    bootScan: Awaited<ReturnType<AntiFomoValidator['bootScan']>>;
    compositionRejections: readonly { id: string; eventId: string; rejectionReason: string | null; createdAt: string }[];
  }> {
    const bootScan = await this.antiFomo.bootScan();
    const rejections = await this.composer.listAntiFomoRejections();
    return {
      bootScan,
      compositionRejections: rejections.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        rejectionReason: r.rejection_reason,
        createdAt: r.created_at.toISOString(),
      })),
    };
  }
}
