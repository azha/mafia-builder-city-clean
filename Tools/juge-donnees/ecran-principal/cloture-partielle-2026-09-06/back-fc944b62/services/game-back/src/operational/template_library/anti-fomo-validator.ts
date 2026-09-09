// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C3 (anti-fomo-validator.ts —
//             import brand-gate, ANTI_FOMO_EXTENDED_TOKENS, the PURE half of the boot scan + composition
//             scan)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.5.3 (AntiFOMO-
//             Validator — boot + composition, ÉTEND le brand-gate, jamais un doublon)
//             Canon: docs/tech/04g_ambient_world_events_templates/liveops_templates.md §Anti-FOMO enforce
//             ("boot-time … parcourt l'intégralité du registry … REFUSE le boot si un template re-skin
//             example contient un forbidden pattern" + "composition-time … Tout hit dans le payload =
//             REJECT").
//             — 04g-D C3 — 2026-07-17
//
// EXTENDS `operational/liveops/live-ops-brand-gate.ts` BY IMPORT, never a re-implemented/duplicated token
// list (D7 — the token array is the byte-identical runtime mirror of `scripts/ci/check-political-brand-
// gate.sh`'s own `PATTERN=`, pinned by `liveops_composer_page2.spec.ts`'s "source-sync" test; ANY drift
// here without a matching CI-script change fails that OTHER test, not this one). Day-1 effective token set
// = the 11 base tokens (already cover gdd/15:1825's "countdowns, 'last chance', event-only currency");
// `ANTI_FOMO_EXTENDED_TOKENS` is a NAMED extension point that ships EMPTY (additive, never touches the
// CI-pinned mirror) — a future lot can populate it without editing `live-ops-brand-gate.ts`.
//
// This file holds ONLY the PURE, zero-DB, zero-I/O half:
//   - `findAntiFomoHit(text)` — base (D7-protected) ∪ extended token scan, delegates to `findLiveOpsBrand-
//     GateHit` (never a second regex).
//   - `scanComposition(spec)` — composition-time (canon: "Tout hit dans le payload = REJECT"), ALWAYS
//     active regardless of strict/lax mode (§3.5.3 "le composition-time REJECT reste actif même en lax").
//   - `scanLibraryEntries()` — the 60 library entries' `name`/`registryOnlyReason`/`trashReason` text
//     fields — the library-only half of the boot scan (canon: "parcourt l'intégralité du registry").
//
// ★ File split (deliberate, not design drift): the `AntiFomoValidator` INJECTABLE CLASS (the DB-dependent
// persisted-`event_reskin`-rows half of the boot scan + the combined `bootScan()` + `OnApplicationBootstrap`
// wiring) lives in the SIBLING file `anti-fomo-validator.service.ts`, NOT here — for the SAME reason
// `event-reskin-validator.service.ts` is split from `event-reskin-validator.ts` (see that file's header):
// Playwright's esbuild-based TS transform cannot parse ANY `@Inject(...)`-decorated constructor parameter
// ("Decorators cannot be used to decorate parameters", reproduced directly against this repo's Playwright
// config). Keeping this file 100% decorator-free keeps it importable by the direct-import pure-module test
// `template_library_validators.spec.ts`; the DB-dependent class is exercised ONLY via the real HTTP stack
// (`template_library_reskin_validate.spec.ts`).

import { LIVE_OPS_BRAND_GATE_TOKENS, findLiveOpsBrandGateHit } from '../liveops/live-ops-brand-gate';
import type { ReskinSpec } from './event-reskin-validator';
import type { TemplateLibraryEntry } from './template-library-entry';
import { POLITICAL_TEMPLATE_LIBRARY } from './political-template-library';
import { LIVE_OPS_TEMPLATE_LIBRARY } from './live-ops-template-library';
import { RECRUITMENT_QUEST_TEMPLATE_LIBRARY } from './recruitment-quest-template-library';
import { ACHIEVEMENT_TEMPLATE_LIBRARY } from './achievement-template-library';
import { NEWS_BEAT_TEMPLATE_LIBRARY } from './news-beat-template-library.adapter';
import { RANDOM_WORLD_TEMPLATE_LIBRARY } from './random-world-template-library.adapter';

/** Named extension point (design §3.5.3) — ships EMPTY. Adding a token here is ADDITIVE (never edits
 *  `live-ops-brand-gate.ts`'s own CI-pinned mirror) — a future lot can extend the effective set without
 *  touching the D7-protected base array. */
export const ANTI_FOMO_EXTENDED_TOKENS: readonly string[] = [];

function findExtendedTokenHit(text: string): string | null {
  const lower = text.toLowerCase();
  for (const token of ANTI_FOMO_EXTENDED_TOKENS) {
    if (lower.includes(token.toLowerCase())) return token;
  }
  return null;
}

/** Base (D7-protected) ∪ extended — the FULL effective scan, base checked first. Re-exported (not a
 *  second regex) for callers that only need "is this text clean" without the field-attribution shape. */
export function findAntiFomoHit(text: string): string | null {
  return findLiveOpsBrandGateHit(text) ?? findExtendedTokenHit(text);
}

export { LIVE_OPS_BRAND_GATE_TOKENS };

export interface AntiFomoCompositionHit {
  readonly field: 'name' | 'reskinDescription';
  readonly token: string;
}

export interface AntiFomoBootScanHitDetail {
  readonly source: 'library_entry' | 'event_reskin';
  /** templateId (library_entry) or event_reskin.id (event_reskin). */
  readonly id: string;
  readonly field: string;
  readonly token: string;
}

export interface AntiFomoLibraryScanResult {
  readonly scannedEntries: number;
  readonly hits: number;
  readonly hitDetails: readonly AntiFomoBootScanHitDetail[];
}

export interface AntiFomoReskinScanResult {
  readonly scannedReskins: number;
  readonly hits: number;
  readonly hitDetails: readonly AntiFomoBootScanHitDetail[];
}

export interface AntiFomoBootScanResult {
  readonly scannedEntries: number;
  readonly scannedReskins: number;
  readonly hits: number;
  readonly hitDetails: readonly AntiFomoBootScanHitDetail[];
}

// ── the 60 entries, flat (SAME per-consumer-file idiom this module already uses in event-template-
// mapping-registry.ts / unmapped-templates-opportunity.registry.ts / event-reskin-validator.ts) ─────────
const ALL_LIBRARY_ENTRIES: readonly TemplateLibraryEntry[] = [
  ...POLITICAL_TEMPLATE_LIBRARY,
  ...NEWS_BEAT_TEMPLATE_LIBRARY,
  ...RANDOM_WORLD_TEMPLATE_LIBRARY,
  ...RECRUITMENT_QUEST_TEMPLATE_LIBRARY,
  ...ACHIEVEMENT_TEMPLATE_LIBRARY,
  ...LIVE_OPS_TEMPLATE_LIBRARY,
];

/** Composition-time (canon: "Tout hit dans le payload = REJECT") — ALWAYS active, no mode gate. Checks
 *  `name` first (short-circuits without needing to also inspect the description, mirrors `assertLiveOps-
 *  BrandGateClean`'s own "subject first" convention). */
export function scanComposition(spec: Pick<ReskinSpec, 'name' | 'reskinDescription'>): AntiFomoCompositionHit | undefined {
  const nameHit = findAntiFomoHit(spec.name);
  if (nameHit) return { field: 'name', token: nameHit };
  const descHit = findAntiFomoHit(spec.reskinDescription);
  if (descHit) return { field: 'reskinDescription', token: descHit };
  return undefined;
}

/** PURE, sync, zero DB — the 60 library entries' text fields (canon: "parcourt l'intégralité du
 *  registry"). Consumed by `anti-fomo-validator.service.ts`'s `bootScan()`/`assertLibraryScanClean()`. */
export function scanLibraryEntries(): AntiFomoLibraryScanResult {
  const hitDetails: AntiFomoBootScanHitDetail[] = [];
  for (const entry of ALL_LIBRARY_ENTRIES) {
    const fields: Array<[string, string | undefined]> = [
      ['name', entry.name],
      ['registryOnlyReason', entry.registryOnlyReason],
      ['trashReason', entry.trashReason],
    ];
    for (const [field, value] of fields) {
      if (!value) continue;
      const hit = findAntiFomoHit(value);
      if (hit) hitDetails.push({ source: 'library_entry', id: entry.templateId, field, token: hit });
    }
  }
  return { scannedEntries: ALL_LIBRARY_ENTRIES.length, hits: hitDetails.length, hitDetails };
}
