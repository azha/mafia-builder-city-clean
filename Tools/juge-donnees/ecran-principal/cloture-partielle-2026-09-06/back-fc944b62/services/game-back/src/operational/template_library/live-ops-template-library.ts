// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1 (live-ops-template-
//             library.ts — 7 entries, 3 ids REUSE + `constant_hum` canon-assigned + 3 new-to-code)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.2 (LIVE-OPS
//             table, 7 entries) + decisions D3 (id derivation)
//             Canon: projects/mafia_city_world_events/CATALOGUE_REPORT.md §LIVE-OPS (:1214-1353, 7
//             templates, canonical order + verbatim flag/score — freshly re-grepped 2026-07-17)
//             docs/tech/04g_ambient_world_events_templates/liveops_templates.md :25-35,281,34-35
//             REUSE seam: operational/liveops/live-ops-template-id.ts (`LiveOpsTemplateId`, 9 members =
//             3 home + 6 cross-cat borrowed — D5, NEVER modified).
//             — 04g-D C1 — 2026-07-17
//
// `LIVE_OPS_TEMPLATE_LIBRARY` — the 7 home-LIVE-OPS entries. 3 ids REUSE (`distribution_day`/
// `inspection_week`/`off_hours_drift`, typed `satisfies LiveOpsTemplateId`, D5); `constant_hum` is
// canon-assigned (`liveops_templates.md:281`) but deliberately NOT typed `satisfies LiveOpsTemplateId` —
// it is EXPLICITLY EXCLUDED from that union (`live-ops-template-id.ts:41-48` header: "constant_hum
// explicitly excluded from the template-id union" — it is a substrate, never a launch-event-instantiable
// id); the other 3 (`three_against_four`/`punishment_drift`/`quiet_week`) are new-to-code [PROV],
// mechanical rule (D3 priority 4).
//
// <!-- LOVED: constant_hum (4.50 ❤️) — the keystone entry below carries the ❤️ flag. -->
//
// ★ flag discrepancy noted (mirrors `political-template-library.ts`'s own header note): `three_against_
// four`'s raw CATALOGUE_REPORT.md heading glyph (:1306) is ✓ (byte-verified), naively "liked" — but this
// design's own table (§3.2) resolves it to `neutral`, consistent with the SAME "trailing ○ (not 🎯) ⇒
// downgraded" pattern `permit_carousel` (political) already established. This file follows the already-
// resolved design table, not the raw leading glyph in isolation.

import type { LiveOpsTemplateId } from '../liveops/live-ops-template-id';
import { TemplateCategory } from './template-category';
import type { TemplateLibraryEntry } from './template-library-entry';

const NO_LAUNCH_EVENT_REASON =
  'No launch event and no BO force-* entry point exists for this template this lot — registry entry + ' +
  'BO visibility only; part of the 34-item ship-ready unmapped backlog (C2).';

export const LIVE_OPS_TEMPLATE_LIBRARY: readonly TemplateLibraryEntry[] = [
  {
    templateId: 'constant_hum', // canon-assigned, liveops_templates.md:281 — NOT in LiveOpsTemplateId (excluded)
    homeCategory: TemplateCategory.LIVE_OPS,
    name: 'Constant Hum / The Standing Calendar',
    catalogueRef: 'CATALOGUE_REPORT.md:1218-1239',
    flag: 'loved',
    score: 4.50,
    disposition: 'substrate',
    runtime: 'live', // 04g-A hum substrate (ConstantHumService) IS its own runtime
  },
  {
    templateId: 'distribution_day' satisfies LiveOpsTemplateId,
    homeCategory: TemplateCategory.LIVE_OPS,
    name: 'Distribution Day',
    catalogueRef: 'CATALOGUE_REPORT.md:1240-1261',
    flag: 'liked',
    score: 4.45,
    disposition: 'ship_ready',
    runtime: 'live', // E-LO-08 + cross-cat E-POL-02
    tdRef: 'TD-173', // DistributionDayAllocator (Flow 4) not built — the launch event fires, the monthly Flow doesn't
  },
  {
    templateId: 'inspection_week' satisfies LiveOpsTemplateId,
    homeCategory: TemplateCategory.LIVE_OPS,
    name: 'Inspection Week',
    catalogueRef: 'CATALOGUE_REPORT.md:1262-1283',
    flag: 'liked',
    score: 4.40,
    disposition: 'ship_ready',
    runtime: 'live', // E-LO-01 + E-LO-10 (reuse)
    tdRef: 'TD-173', // InspectionWeekScheduler (Flow 3) not built — TD-173-adjacent
  },
  {
    templateId: 'off_hours_drift' satisfies LiveOpsTemplateId,
    homeCategory: TemplateCategory.LIVE_OPS,
    name: 'The Off-Hours Drift',
    catalogueRef: 'CATALOGUE_REPORT.md:1284-1305',
    flag: 'liked',
    score: 4.35,
    disposition: 'ship_ready',
    runtime: 'live', // E-LO-07 (substrateComposed constant_hum) — OffHoursDriftDetector (04g-A) is real
  },
  {
    // Design §3.2 / liveops_templates.md:34 (raw glyph ✓, trailing ○) — resolved `neutral` (see file
    // header discrepancy note, mirrors `permit_carousel`).
    templateId: 'three_against_four',
    homeCategory: TemplateCategory.LIVE_OPS,
    name: 'The Three-Against-Four',
    catalogueRef: 'CATALOGUE_REPORT.md:1306-1321',
    flag: 'neutral',
    score: 4.20,
    disposition: 'ship_ready',
    runtime: 'registry_only',
    registryOnlyReason: NO_LAUNCH_EVENT_REASON,
  },
  {
    templateId: 'punishment_drift',
    homeCategory: TemplateCategory.LIVE_OPS,
    name: 'The Punishment Drift',
    catalogueRef: 'CATALOGUE_REPORT.md:1322-1337',
    flag: 'neutral',
    score: 4.20,
    disposition: 'trash',
    // Verbatim (parenthetical), liveops_templates.md:34.
    trashReason: 'CUT — outside scope',
    runtime: 'registry_only',
  },
  {
    templateId: 'quiet_week',
    homeCategory: TemplateCategory.LIVE_OPS,
    name: 'Quiet Week / Structural Silence',
    catalogueRef: 'CATALOGUE_REPORT.md:1338-1353',
    flag: 'neutral',
    score: 4.10,
    disposition: 'trash',
    // Verbatim (parenthetical), liveops_templates.md:35.
    trashReason: 'CUT — boring',
    runtime: 'registry_only',
  },
];
