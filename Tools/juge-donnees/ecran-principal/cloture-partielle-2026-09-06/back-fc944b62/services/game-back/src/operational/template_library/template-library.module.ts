// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1 (DI shell)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3 (architecture —
//             module operational/template_library/)
//             — 04g-D C1 — 2026-07-17
//
// `TemplateLibraryModule` — the Template meta-layer + library module (DERNIER sous-lot du chapitre 04g).
// C1 = FOUNDATION ONLY:
//   - migration 0131 (`event_reskin` table + 2 pgEnums, `db/schema/template_library.ts`) — schema-only,
//     zero consumer yet (no repository/composer/validator this chunk).
//   - `TemplateCategory` (6) + `TemplateLibraryEntry` (design §3.1) — plain exported types.
//   - The 6 registries (4 NEW `operational/template_library/*-template-library.ts` + 2 REUSE adapters
//     `*.adapter.ts`) — plain exported consts, NOT Nest-injectable (mirrors `RANDOM_WORLD_TEMPLATE_
//     REGISTRY`/`ambient.tunables.ts`'s own posture).
//   - `template-library.tunables.ts` (16 getters, 7 namespace-scoped exports) — same posture, plain
//     exported consts.
//   - `TemplateLibraryService` — the ONE real NestJS provider this chunk ships: an `OnApplicationBootstrap`
//     lifecycle hook aggregating the 6 registries + enforcing the §3.7.1-2 boot contract.
//   - `TemplateLibraryAdminController` — 3 GET endpoints (`summary`/`library`/`health`), always registered
//     (real production BO surface, mirrors `RandomWorldAdminController`'s own "NOT conditional on
//     NODE_ENV" posture).
//
// C2 (DONE): `event-template-mapping-registry.ts` (25 instantiations) + `unmapped-templates-opportunity.
// registry.ts` (34+3 derivation + joint alert) + `GET mapping`/`GET unmapped` + health's arithmetic
// breakdown (§3.7.3-4) — both are plain exported consts/functions, same posture as the 6 registries
// (no new provider, `TemplateLibraryService` delegates).
// C3 (DONE): the 3 validators, EACH split pure-functions/types file + `.service.ts` DI-class file (a
// verified Playwright/esbuild parameter-decorator parse constraint forced the split — see `event-reskin-
// validator.service.ts` / `anti-fomo-validator.service.ts` headers for the full writeup):
//   - `event-reskin-validator.ts` (pure: `ReskinSpec` + rules 1-3) / `event-reskin-validator.service.ts`
//     (`EventReskinValidator`, DB-backed rule 4 + `validate()`).
//   - `template-instantiation-validator.ts` (`TemplateInstantiationValidator`, mode-aware composition gate
//     — delegates to the rule functions + `EventReskinValidator`'s rule 4, never a duplicate).
//   - `anti-fomo-validator.ts` (pure: token scan + `scanComposition`/`scanLibraryEntries`) / `anti-fomo-
//     validator.service.ts` (`AntiFomoValidator`, DB-backed persisted-reskins scan + combined `bootScan()`
//     + its OWN `OnApplicationBootstrap`, extends `live-ops-brand-gate.ts` BY IMPORT, never a duplicate).
//   - `POST reskins/validate` (dry-run, zero write) on the controller, which ALSO composes `GET health`'s
//     `antiFomoBootScan` field (`TemplateLibraryService` itself stays UNCHANGED by C3 — see that file's own
//     header note).
// Provider order below: `TemplateLibraryService` BEFORE `AntiFomoValidator` — NestJS bootstraps a module's
// own providers in array order absent an explicit DI dependency, giving the §3.7 "library assertions before
// AntiFOMO scan" ordering note a real (if soft) guarantee across the 2 independent bootstrap hooks.
// C4a (DONE, D1=B RULED): `event-reskin.repository.ts` (`EventReskinRepository` — the ONLY injector of the
// `event_reskin` table for WRITES — C3's validators only ever READ it) + `event-reskin-composer.ts`
// (`EventReskinComposer` — compose()/mount()/findById()/listByStatus()/listAntiFomoRejections(), the
// controller's ONE delegate for everything `event_reskin`) + `POST reskins` (commit) + `GET reskins?status=`
// + `POST reskins/:id/mount` (422 ×6 stub — LIVE_OPS included, C4b replaces ONLY that branch) + `GET
// anti-fomo/status`.
// C4b (DONE, D1=B RULED, design §3.6-B): `live-ops-reskin-mount.adapter.ts` (`LiveOpsReskinMountAdapter` —
// the REAL LIVE_OPS mount ; the composer's `mount()` delegates to it, `EventReskinRepository` now also
// injected here for the mount-time `markMounted` UPDATE) + `mounted-live-ops-event-boot-warmer.service.ts`
// (`MountedLiveOpsEventBootWarmer` — the ONLY consumer of `operational/liveops/live-ops-mounted-event.
// store.ts`'s `reloadNow()` at boot; the store itself is a plain module-level singleton, NOT a provider
// here). ZERO migration (confirmed R9.3-note: `live_ops_event_active.event_id` is a soft-ref text column,
// no FK — the mount is a status transition + jsonb `mount_ref` on the EXISTING `event_reskin` table).
//
// Zero-regression invariant: purely ADDITIVE — no existing table/service/tick/path touched. No module
// import needed: the 2 REUSE adapters import their source registries DIRECTLY (plain TS consts, not via
// another module's exported provider — `NEWS_BEAT_TEMPLATE_REGISTRY`/`RANDOM_WORLD_TEMPLATE_REGISTRY`
// are plain exported consts, same posture this module's own registries use). `LiveOpsModule` (04e-B/C) is
// NOT imported here — the C4b LIVE_OPS surface this module reaches (`resolveLiveOpsEventById`'s catalogue
// half, the brand-gate, the lever audit) is all plain-exported consts/functions, same posture.

import { Module } from '@nestjs/common';

import { TemplateLibraryService } from './template-library.service';
import { TemplateLibraryAdminController } from './template-library-admin.controller';
import { EventReskinValidator } from './event-reskin-validator.service';
import { TemplateInstantiationValidator } from './template-instantiation-validator';
import { AntiFomoValidator } from './anti-fomo-validator.service';
import { EventReskinRepository } from './event-reskin.repository';
import { EventReskinComposer } from './event-reskin-composer';
import { LiveOpsReskinMountAdapter } from './live-ops-reskin-mount.adapter';
import { MountedLiveOpsEventBootWarmer } from './mounted-live-ops-event-boot-warmer.service';

@Module({
  controllers: [TemplateLibraryAdminController],
  providers: [
    TemplateLibraryService,
    EventReskinValidator,
    TemplateInstantiationValidator,
    AntiFomoValidator,
    EventReskinRepository,
    LiveOpsReskinMountAdapter,
    EventReskinComposer,
    MountedLiveOpsEventBootWarmer,
  ],
})
export class TemplateLibraryModule {}
