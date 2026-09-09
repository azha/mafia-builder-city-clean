// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1 (random-world-template-
//             library.adapter.ts — adapter REUSE, 14 entries imported, zéro copie)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.2 (RANDOM-WORLD —
//             REUSE) + §3.1 (adapter mapping convention)
//             REUSE seam: operational/random_world/random-world-template-registry.ts
//             (`RANDOM_WORLD_TEMPLATE_REGISTRY`, 14 entries — D5/D9, NEVER modified, NEVER re-declared).
//             — 04g-D C1 — 2026-07-17
//
// `RANDOM_WORLD_TEMPLATE_LIBRARY` — the 14 RANDOM-WORLD entries, IMPORTED + MAPPED onto
// `TemplateLibraryEntry` (mirrors `news-beat-template-library.adapter.ts`'s own convention exactly).
// `disposition` is always `ship_ready` (RANDOM-WORLD has no substrate/trash concept, design §3.2).
//
// <!-- LOVED: sideways_failure (4.55 ❤️) — REUSE, already carried by the source file's own comment
//      (random-world-template-registry.ts, design §3.1 "keystone ❤️ Sideways Failure"). Not re-declared
//      here (D9 — additive-only); this comment documents that this adapter forwards that keystone into
//      the unified library without altering it. -->

import { RANDOM_WORLD_TEMPLATE_REGISTRY } from '../random_world/random-world-template-registry';
import { TemplateCategory } from './template-category';
import type { TemplateLibraryEntry } from './template-library-entry';

export const RANDOM_WORLD_TEMPLATE_LIBRARY: readonly TemplateLibraryEntry[] = RANDOM_WORLD_TEMPLATE_REGISTRY.map(
  (entry): TemplateLibraryEntry => ({
    templateId: entry.templateId,
    homeCategory: TemplateCategory.RANDOM_WORLD,
    name: entry.name,
    catalogueRef: entry.catalogueRef,
    flag: entry.flag,
    score: entry.score,
    disposition: 'ship_ready',
    runtime: entry.runtime,
    registryOnlyReason: entry.registryOnlyReason,
    tdRef: entry.tdRef,
  }),
);
