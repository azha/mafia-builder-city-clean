// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C1 (template_id binding)
//             Canon (per-event **Template** lines): docs/tech/04e_political_events_and_liveops/
//             liveops_event_catalogue.md :57,69,78,89,99,110,121,130,141,150.
//             Cross-check / RESOLUTION authority: docs/tech/04g_ambient_world_events_templates/
//             template_launch_event_mapping.md §"04e §2.3 Live-ops events (10) → templates" (:63-78) + Example 2
//             (:101-106, E-LO-06) — the canon-tier reconciliation doc for 2 of the 10 events where the 04e
//             catalogue's own per-event **Template** line is vaguer than the resolved 04g consensus (see the two
//             per-member notes below).
//             Source-domain tables: liveops_templates.md §7 templates table (:25-35), random_world_templates.md
//             §14 templates table (:28-41), recruitment_quest_templates.md §10 templates table (:29-38),
//             political_templates.md §11 templates table (:36-47, REUSE cross-cat).
//             Mirror: services/game-back/src/operational/political/political-template-id.ts (04e-A2 C1 form).
//             — 04e-B C1 — 2026-07-06
//
// `LiveOpsTemplateId` — the canonical per-template string id (political_templates.md glossary :254 convention:
// "Per template canonical name" — drop a leading "The", snake_case the rest, drop parenthetical/slash alt-names;
// applied identically here). 9 distinct members bind the 10 launch events (`inspection_week` is shared by
// E-LO-01/E-LO-10 — canon-confirmed reuse, `template_launch_event_mapping.md:78`).
//
// 2 CROSS-CATEGORY BORROWS from OTHER 04g domains (mirrors A2's own 3 cross-category borrows):
//   - `standing_reorganization` — POLITICAL domain (political_templates.md #6) — E-LO-03. This is the SAME slug
//     `political-template-id.ts` already declares as "unmapped in [the political] catalogue (used cross-cat by
//     04e-B's E-LO-03)" — not re-declared there, just independently re-declared here (each catalogue's template
//     union is self-contained per its own file, mirrors how A2 declared `distribution_day` in ITS OWN union even
//     though live-ops also uses it).
//   - `coordinated_hush` — RECRUITMENT-QUEST domain (#8) — E-LO-06.
//   - `distribution_day` — LIVE-OPS domain, but ALSO used cross-cat by E-POL-02 (political-template-id.ts already
//     has this exact member) — E-LO-08 is the NATIVE LIVE-OPS use of this template (not itself a cross-cat borrow
//     from B's perspective; listed here because it needs to appear in THIS union too).
//
// 2 RESOLVED DIVERGENCES (04e canon vs 04g consensus — flagged honestly, not silently overridden):
//   - E-LO-06: 04e canon (`liveops_event_catalogue.md` E-LO-06 **Template** line) says verbatim "Composite
//     (multiple — cross-category)" — no single slug. `template_launch_event_mapping.md:72,101-106` (the 04g-side
//     canon-tier reconciliation doc) resolves this explicitly to `coordinated_hush` as "the template principal"
//     (RECRUITMENT-QUEST #8, "Costly-silence-as-bond ordeal", semantically INVERTED — applied against the
//     aggressive player by his rivals, not toward a recruit candidate). The mapping doc itself flags this as a
//     "Divergence corpus ... cohérence corpus à propager backport 04e (Vague D dette)" — i.e. the 04e catalogue.md
//     prose is stale/vaguer and is TD to reconcile; the concrete binding is already settled by 04g's own
//     resolution authority, so THIS chunk encodes the resolved slug rather than re-deferring an already-resolved
//     question.
//   - E-LO-07: 04e canon says "Composite (Constant Hum substrate + selective notice)" — `selective_notice` is a
//     REAL POLITICAL slug, but `template_launch_event_mapping.md:73` records that the 04g consensus SUBSTITUTES
//     `The Off-Hours Drift` for "selective notice" (a minor semantic drift the mapping doc itself calls out: the
//     168-cell weekly heat-pattern drift mechanic fits Off-Hours Drift, not the POLITICAL selective-notice
//     template) — "Constant Hum" itself is a SUBSTRATE, not an event template (`liveops_templates.md:29,57`:
//     "substrate for ALL events, not directly mapped to single event" — excluded from the template-id union
//     entirely, same treatment `template_launch_event_mapping.md:139` gives it). Same "Vague D dette" flag as
//     E-LO-06 — resolved here, stale 04e prose is the TD.
//
// This is the FULL 04g-authoring-scope registry the plan calls for (`live-ops-template-id.ts`, C1): the runtime
// `EventTemplateMappingRegistry`/`EventReskinValidator`/`EventReskinComposer` machinery `template_launch_event_
// mapping.md` describes is explicitly OUT of B scope (04e-C, mirrors A2's own precedent) — B only needs the id
// union + a plain event→template lookup so anti-pattern-2 passes.

/** The 9 distinct 04g templates the 10 live-ops launch events bind to (2 native LIVE-OPS reuse pairs/cross-cat
 *  borrows collapse the 10 events onto 9 ids — `inspection_week` used twice). */
export type LiveOpsTemplateId =
  | 'inspection_week'           // LIVE-OPS #3 (liveops_templates.md:31) — E-LO-01, E-LO-10 (shared, canon-confirmed reuse)
  | 'halgren_tannery_hailstorm' // RANDOM-WORLD #3 (random_world_templates.md:30,135, literal `template_id` string) — E-LO-02
  | 'standing_reorganization'   // POLITICAL #6 cross-cat (political_templates.md:42) — E-LO-03
  | 'apparent_recovery'         // RANDOM-WORLD #5 (random_world_templates.md:32, "Apparent Recovery / Halgren Bounce") — E-LO-04
  | 'festival_misread'          // RANDOM-WORLD #6 (random_world_templates.md:33, "The Festival Misread") — E-LO-05
  | 'coordinated_hush'          // RECRUITMENT-QUEST #8 cross-cat (recruitment_quest_templates.md:36) — E-LO-06 (RESOLVED, see header)
  | 'off_hours_drift'           // LIVE-OPS #4 (liveops_templates.md:32, "The Off-Hours Drift") — E-LO-07 (RESOLVED, see header)
  | 'distribution_day'          // LIVE-OPS #2 (liveops_templates.md:30) — E-LO-08 (also cross-cat E-POL-02)
  | 'cry_wolf_fatigue';         // RANDOM-WORLD #13 (random_world_templates.md:40, "Cry-Wolf Fatigue / The Quiet Beacon") — E-LO-09

/**
 * `LIVE_OPS_TEMPLATE_REGISTRY` — the anti-pattern-2 event→template_id lookup (mirrors
 * `POLITICAL_TEMPLATE_REGISTRY`). Every one of the 10 launch events is bound — removing an entry (or adding an
 * event_id key without a template_id) fails the `liveops_catalogue.spec.ts` falsifiable resolve assertion.
 *
 * Each entry line carries an inline `template_id`/`LiveOpsTemplateId` marker so it also satisfies the
 * anti-pattern-2 grep LITERALLY (mirrors the political registry's own per-physical-line convention).
 */
export const LIVE_OPS_TEMPLATE_REGISTRY: Readonly<Record<string, LiveOpsTemplateId>> = {
  'E-LO-01': 'inspection_week',           // template_id (LiveOpsTemplateId) — registry entry, canon :59
  'E-LO-02': 'halgren_tannery_hailstorm', // template_id (LiveOpsTemplateId) — registry entry, canon :69 (cross-cat RANDOM-WORLD)
  'E-LO-03': 'standing_reorganization',   // template_id (LiveOpsTemplateId) — registry entry, canon :80 (cross-cat POLITICAL)
  'E-LO-04': 'apparent_recovery',         // template_id (LiveOpsTemplateId) — registry entry, canon :91 (cross-cat RANDOM-WORLD)
  'E-LO-05': 'festival_misread',          // template_id (LiveOpsTemplateId) — registry entry, canon :101 (cross-cat RANDOM-WORLD)
  'E-LO-06': 'coordinated_hush',          // template_id (LiveOpsTemplateId) — registry entry, canon :110 (RESOLVED — see file header)
  'E-LO-07': 'off_hours_drift',           // template_id (LiveOpsTemplateId) — registry entry, canon :121 (RESOLVED — see file header)
  'E-LO-08': 'distribution_day',          // template_id (LiveOpsTemplateId) — registry entry, canon :130
  'E-LO-09': 'cry_wolf_fatigue',          // template_id (LiveOpsTemplateId) — registry entry, canon :141 (cross-cat RANDOM-WORLD)
  'E-LO-10': 'inspection_week',           // template_id (LiveOpsTemplateId) — registry entry, canon :150 (reuse, E-LO-01's template)
};
