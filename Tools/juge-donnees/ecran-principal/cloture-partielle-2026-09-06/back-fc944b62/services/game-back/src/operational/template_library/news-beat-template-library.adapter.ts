// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1 (news-beat-template-
//             library.adapter.ts — adapter REUSE, 12 entries imported, zéro copie)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.2 (NEWS-BEAT —
//             REUSE) + §3.1 ("Les adapters NEWS-BEAT/RANDOM-WORLD mappent les entries existantes vers ce
//             shape en ajoutant `homeCategory` + `disposition: 'ship_ready'` — ZÉRO copie des données")
//             REUSE seam: operational/news_beat/news-beat-template-registry.ts
//             (`NEWS_BEAT_TEMPLATE_REGISTRY`, 12 entries — D5/D9, NEVER modified, NEVER re-declared).
//             — 04g-D C1 — 2026-07-17
//
// `NEWS_BEAT_TEMPLATE_LIBRARY` — the 12 NEWS-BEAT entries, IMPORTED + MAPPED onto `TemplateLibraryEntry`
// (design §3.1). ZERO copy of `name`/`catalogueRef`/`flag`/`score`/`runtime`/`registryOnlyReason`/`tdRef`
// — every field is READ from the existing registry, never re-typed. `disposition` is always `ship_ready`
// (NEWS-BEAT has no substrate/trash concept — all 12 are either mapped or unmapped-ship-ready, design
// §3.2).
//
// <!-- LOVED: cooper_affair (4.70 ❤️) + sourceless_beat (4.60 ❤️) — REUSE, already carried by the source
//      file's own LOVED comment (news-beat-template-registry.ts:18-19). Not re-declared here (D9 —
//      additive-only, the source file is never touched); this comment documents that this adapter
//      forwards those 2 keystones into the unified library without altering them. -->

import { NEWS_BEAT_TEMPLATE_REGISTRY } from '../news_beat/news-beat-template-registry';
import { TemplateCategory } from './template-category';
import type { TemplateLibraryEntry } from './template-library-entry';

export const NEWS_BEAT_TEMPLATE_LIBRARY: readonly TemplateLibraryEntry[] = NEWS_BEAT_TEMPLATE_REGISTRY.map(
  (entry): TemplateLibraryEntry => ({
    templateId: entry.templateId,
    homeCategory: TemplateCategory.NEWS_BEAT,
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
