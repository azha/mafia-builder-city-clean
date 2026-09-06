// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C3 (anti-fomo-validator.ts —
//             boot scan of persisted reskins + the combined bootScan() + OnApplicationBootstrap wiring;
//             design names this class "AntiFOMOValidator" inside `anti-fomo-validator.ts`; it lives in THIS
//             sibling file for a technical reason, see below, never a design deviation)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.5.3
//             — 04g-D C3 — 2026-07-17
//
// `AntiFomoValidator` — the `@Injectable() OnApplicationBootstrap` class. Combines the PURE library-only
// scan (`scanLibraryEntries`, imported from `./anti-fomo-validator`) with the DB-dependent persisted-
// `event_reskin`-rows scan (`scanPersistedReskins`, this file) into `bootScan()` (`GET template-library/
// health`'s `antiFomoBootScan` shape) and enforces strict/lax boot fate via its OWN `onApplicationBootstrap`
// hook.
//
// ★ WHY THIS IS A SEPARATE FILE from `anti-fomo-validator.ts` (verified technical constraint, not a design
// deviation): this class needs `@Inject(DB)` — Playwright's esbuild-based TS transform cannot parse ANY
// parameter decorator ("Decorators cannot be used to decorate parameters", reproduced directly against
// this repo's `playwright.config.ts`). If this class lived in the SAME file as `scanLibraryEntries`/
// `scanComposition`/`findAntiFomoHit`, importing ANY of those pure functions from
// `template_library_validators.spec.ts` (the C3 direct-import pure-module floor) would drag the WHOLE file
// through the same parser and fail. This file is exercised ONLY via the real HTTP stack
// (`template_library_reskin_validate.spec.ts`), never directly imported by any spec. Mirrors the SAME split
// applied to `event-reskin-validator.ts` / `event-reskin-validator.service.ts`.
//
// ★ Ordering (design §3.7 "avant le scan AntiFOMO"): `TemplateLibraryService`'s own 4 arithmetic assertions
// (C1/C2, UNCHANGED by C3 — it does NOT depend on this class, precisely so
// `template_library_registry.spec.ts`'s existing zero-DB direct-import test stays importable) and this
// class's boot scan are now TWO INDEPENDENT `OnApplicationBootstrap` hooks rather than one guaranteed
// sequential call. `TemplateLibraryModule`'s providers array lists `TemplateLibraryService` BEFORE
// `AntiFomoValidator` (NestJS instantiates/bootstraps a module's own providers in array order absent an
// explicit DI dependency between them) — a real, documented ordering, just not a single-method guarantee.
// Either hook throwing fails boot either way, which is the invariant that actually matters (a broken
// library or forbidden-pattern content never serves).
//
// strict_mode: `liveops_templates.anti_fomo_validator_strict_mode` (REUSE gdd/14:1924, default true,
// "Jamais désactivé en production") — lax only softens the boot-scan throw; the composition-time REJECT
// (`scanComposition`, `anti-fomo-validator.ts`) is unconditional either way.

import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { inArray } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { eventReskin } from '../../db/schema/template_library';
import {
  scanLibraryEntries,
  findAntiFomoHit,
  type AntiFomoBootScanHitDetail,
  type AntiFomoBootScanResult,
  type AntiFomoLibraryScanResult,
  type AntiFomoReskinScanResult,
} from './anti-fomo-validator';
import { liveOpsTemplatesReskinTunables } from './template-library.tunables';

@Injectable()
export class AntiFomoValidator implements OnApplicationBootstrap {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** DB-dependent, async — every `committed`/`mounted` `event_reskin` row's authored copy. */
  async scanPersistedReskins(): Promise<AntiFomoReskinScanResult> {
    const rows = await this.db
      .select({ id: eventReskin.id, reskinSpec: eventReskin.reskin_spec })
      .from(eventReskin)
      .where(inArray(eventReskin.status, ['committed', 'mounted']));

    const hitDetails: AntiFomoBootScanHitDetail[] = [];
    for (const row of rows) {
      const spec = row.reskinSpec as { name?: unknown; reskinDescription?: unknown } | null;
      const fields: Array<[string, unknown]> = [
        ['name', spec?.name],
        ['reskinDescription', spec?.reskinDescription],
      ];
      for (const [field, value] of fields) {
        if (typeof value !== 'string' || value.length === 0) continue;
        const hit = findAntiFomoHit(value);
        if (hit) hitDetails.push({ source: 'event_reskin', id: row.id, field, token: hit });
      }
    }
    return { scannedReskins: rows.length, hits: hitDetails.length, hitDetails };
  }

  /** The FULL combined scan (`GET template-library/health`'s own `antiFomoBootScan` shape). Never throws —
   *  pure data return, the CALLER decides strict/lax fate. */
  async bootScan(): Promise<AntiFomoBootScanResult> {
    const library: AntiFomoLibraryScanResult = scanLibraryEntries();
    const reskins = await this.scanPersistedReskins();
    return {
      scannedEntries: library.scannedEntries,
      scannedReskins: reskins.scannedReskins,
      hits: library.hits + reskins.hits,
      hitDetails: [...library.hitDetails, ...reskins.hitDetails],
    };
  }

  private throwOrWarn(result: { hits: number; hitDetails: readonly AntiFomoBootScanHitDetail[] }, scope: string): void {
    if (result.hits === 0) return;
    const summary = result.hitDetails.map((h) => `${h.source}:${h.id}.${h.field}="${h.token}"`).join(', ');
    if (liveOpsTemplatesReskinTunables.antiFomoValidatorStrictMode) {
      throw new Error(`AntiFomoValidator ${scope} scan FAILED: ${result.hits} forbidden-pattern hit(s) — ${summary} (design §3.5.3).`);
    }
    // eslint-disable-next-line no-console
    console.warn(`[AntiFomoValidator] lax mode — ${scope} scan found ${result.hits} forbidden-pattern hit(s), NOT throwing: ${summary}`);
  }

  /** `AntiFomoValidator`'s OWN boot enforcement — the FULL combined scan (library text + persisted
   *  reskins), throws (strict) / warns (lax). At C3, `event_reskin` has zero `committed`/`mounted` rows (no
   *  composer exists yet to write any) — the persisted half is a real, wired no-op today, correctly armed
   *  for C4; the library half is live NOW (proves the 60 entries are clean at every real boot). */
  async onApplicationBootstrap(): Promise<void> {
    const result = await this.bootScan();
    this.throwOrWarn(result, 'boot');
  }
}
