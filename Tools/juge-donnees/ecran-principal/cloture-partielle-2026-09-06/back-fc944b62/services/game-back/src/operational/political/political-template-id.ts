// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C1 (template_id binding)
//             Canon: docs/tech/04g_ambient_world_events_templates/political_templates.md (11 POLITICAL templates,
//             §11 templates table :26-40 — canonical slug examples ":254" `selective_notice`/`stack_of_authorities`)
//             + anti-pattern-2 enforcement (:154-160) + §Mapping coverage matrix (template_launch_event_mapping.md).
//             Cross-cat sources: liveops_templates.md §7 (Distribution Day, E-POL-02) /
//             recruitment_quest_templates.md §5 (The Cousin's Vouch, E-POL-05) /
//             news_beat_templates.md §3 (The Documented Moment, E-POL-09).
//             — 04e-A2 C1 — 2026-07-05
//
// `PoliticalTemplateId` — the canonical per-template string id (political_templates.md glossary :254: "Per
// template canonical name (e.g., `selective_notice`, `stack_of_authorities`)"). 14 members: the 11 POLITICAL-
// domain templates (political_templates.md's own table, canonical CATALOGUE_REPORT order — including the 3
// templates NOT used by any A2 launch event: `standing_reorganization` [cross-cat-only, used by 04e-B's E-LO-03],
// `bench_rotation` / `repeated_lesson` [both fully unmapped — political_templates.md invariant #6, a future
// content-authoring opportunity, NOT this chunk's job to map]) + the 3 cross-category templates 3 launch events
// borrow from OTHER 04g domains (E-POL-02/05/09 — political_templates.md invariant #4/#5: "9 launch events use
// POLITICAL templates directly ... +1 cross-category" — but per THIS catalogue's own per-event `**Template**`
// lines, E-POL-02/05/09 ALSO cite templates, from LIVE-OPS/RECRUITMENT-QUEST/NEWS-BEAT respectively; these 3 are
// the templates listed alongside the 8 in-domain bindings so every one of the 12 launch events has a template_id,
// satisfying anti-pattern-2 for the FULL catalogue, not just the 9 POLITICAL-domain-template events).
//
// Slug convention (canon-confirmed for 2 of 11 — political_templates.md:254): drop a leading "The", snake_case
// the rest, drop parenthetical/slash alt-names (e.g. "The Stack of Authorities / Eleven Chairs" → the canon
// example itself gives `stack_of_authorities`, confirming the alt-name is dropped). Applied consistently to the
// remaining 9 (not individually canon-confirmed, but the SAME rule the 2 confirmed examples both follow).
//
// This is the FULL 04g-authoring-scope registry the plan calls for (political-template-id.ts, C1): the
// `PoliticalTemplateReskinComposer` / `TemplateInstantiationValidator` / full NestJS `PoliticalTemplateRegistry`
// service political_templates.md describes are explicitly OUT of A2 scope — deferred to 04e-C ("04g runtime
// reskin-composer / TemplateInstantiationValidator", plan §Deferred). A2 only needs the id union + a plain
// event→template lookup so anti-pattern-2 passes; no composer, no validator, no reskin-spec machinery here.

/** The 11 POLITICAL-domain templates (political_templates.md table, canonical order) + the 3 cross-category
 *  templates A2's launch catalogue borrows from other 04g domains. */
export type PoliticalTemplateId =
  // ── 11 POLITICAL-domain templates (political_templates.md :26-40) ──────────────────────────────
  | 'selective_notice'            // #1 ❤️ 4.65 — E-POL-03, E-POL-04 (canon-confirmed slug, :254)
  | 'stack_of_authorities'        // #2 ✓ 4.70 — E-POL-10 (canon-confirmed slug, :254)
  | 'vision_that_cannot_adjust'   // #3 ✓ 4.60 — E-POL-07
  | 'levee'                       // #4 ✓ 4.55 — E-POL-08
  | 'methane_year'                // #5 ✓ 4.50 — E-POL-06
  | 'standing_reorganization'     // #6 ✓ 4.30 — unmapped in THIS catalogue (used cross-cat by 04e-B's E-LO-03)
  | 'bench_rotation'              // #7 ✓ 4.30 — unmapped (political_templates.md invariant #6)
  | 'stalled_permit'              // #8 ✓ 4.25 — E-POL-11
  | 'permit_carousel'             // #9 ○ 4.20 — E-POL-12
  | 'listening_period'            // #10 ○ 4.40 — E-POL-01
  | 'repeated_lesson'             // #11 ○ 4.40 — unmapped (political_templates.md invariant #6)
  // ── 3 cross-category templates borrowed by A2 launch events (other 04g domains) ─────────────────
  | 'distribution_day'            // LIVE-OPS §7 — E-POL-02
  | 'cousins_vouch'                // RECRUITMENT-QUEST §5 — E-POL-05
  | 'documented_moment';           // NEWS-BEAT §3 — E-POL-09

/**
 * `POLITICAL_TEMPLATE_REGISTRY` — the anti-pattern-2 event→template_id lookup (political_templates.md :154-160:
 * "block until refactored to query `PoliticalTemplateRegistry` by `PoliticalTemplateId`"). Every one of the 12
 * launch events is bound — removing an entry (or adding an event_id key without a template_id) fails the
 * `political_catalogue.spec.ts` falsifiable resolve assertion.
 *
 * Each entry line below carries an inline `template_id`/`PoliticalTemplateId` marker so it also satisfies the
 * anti-pattern-2 grep LITERALLY (`rg -nP '\bE-POL-\d{2}\b' src/ | rg -v 'PoliticalTemplateId|template_id|registry'`
 * — a per-PHYSICAL-LINE match; a bare `'E-POL-01': 'listening_period',` line with no token on the same line would
 * still surface as a grep hit even though the binding is semantically present one file over).
 */
export const POLITICAL_TEMPLATE_REGISTRY: Readonly<Record<string, PoliticalTemplateId>> = {
  'E-POL-01': 'listening_period',          // template_id (PoliticalTemplateId) — registry entry, canon :54
  'E-POL-02': 'distribution_day',          // template_id (PoliticalTemplateId) — registry entry, canon :69 (cross-cat LIVE-OPS)
  'E-POL-03': 'selective_notice',          // template_id (PoliticalTemplateId) — registry entry, canon :80
  'E-POL-04': 'selective_notice',          // template_id (PoliticalTemplateId) — registry entry, canon :91 (reuse, canonical twice-use)
  'E-POL-05': 'cousins_vouch',              // template_id (PoliticalTemplateId) — registry entry, canon :100 (cross-cat RECRUITMENT-QUEST)
  'E-POL-06': 'methane_year',              // template_id (PoliticalTemplateId) — registry entry, canon :109
  'E-POL-07': 'vision_that_cannot_adjust', // template_id (PoliticalTemplateId) — registry entry, canon :118
  'E-POL-08': 'levee',                     // template_id (PoliticalTemplateId) — registry entry, canon :127
  'E-POL-09': 'documented_moment',         // template_id (PoliticalTemplateId) — registry entry, canon :136 (cross-cat NEWS-BEAT)
  'E-POL-10': 'stack_of_authorities',      // template_id (PoliticalTemplateId) — registry entry, canon :148
  'E-POL-11': 'stalled_permit',            // template_id (PoliticalTemplateId) — registry entry, canon :159
  'E-POL-12': 'permit_carousel',           // template_id (PoliticalTemplateId) — registry entry, canon :168
};
