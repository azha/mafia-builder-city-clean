// IMPLEMENTS: docs/superpowers/specs/2026-07-19-epol-hint-copy-design.md §3.2 (the 10 authored EN hint
//             strings, byte-for-byte) + §4.2 (this dictionary shape + the load-time bijection check) —
//             content-epol-hint-copy (coder), 2026-07-19. Closes TD-176.
//
// `COUNTER_PLAY_HINT_COPY` — the authored counter-play-hint copy dictionary keyed by
// `LiveOpsEvent.counterPlayHintKey` (`live-ops-event-catalogue.ts`). Replaces the D6 uniform
// `'[PROV-Y26Q2] Content pending.'` placeholder `resolveCounterPlayHintCopy` (`live-ops-read.service.ts`)
// used to return for every one of the 10 events — this lot's whole deliverable is this per-key dictionary
// the D6 doctrine comment explicitly named as "the eventual shape".
//
// Compile-time completeness: `CounterPlayHintKey` is `keyof typeof COUNTER_PLAY_HINT_COPY` — a missing
// dictionary entry is unrepresentable in the type. `LiveOpsEvent.counterPlayHintKey` itself stays plain
// `string` (`live-ops.types.ts`) — narrowing it to `CounterPlayHintKey` would require an `as const`
// refactor of the catalogue's literal inference, out of scope for a content-only lot (design §4.2).
//
// Every string below is a byte-for-byte transcription of design doc §3.2 — zero creative writing on the
// coder side (design header, locked decision 8). FR tone-preview lines in the design are NOT shipped
// (§3.0 note 1) — only the EN strings appear in source.

import { LIVE_OPS_EVENT_CATALOGUE } from './live-ops-event-catalogue';

export const COUNTER_PLAY_HINT_COPY = {
  elo01_crackdown_hint:
    "Every precinct's got overtime money this month. Keep the kitchens dark, keep the runs short — wait it out.",
  elo02_dock_strike_hint:
    'The docks are quiet and every till in Tidewater shows it. Move the wash to shops across the river and keep the deposits modest until the cranes turn again.',
  elo03_coil_expansion_hint:
    "The Coil is pushing into every corner at once. Hold the spots you can't live without, and if you want them calmer, let them see you're not hungry.",
  elo04_substance_anomaly_hint:
    'The street wants something different this week. Cook what sells today, not what sold last season, and send it where the buyers went.',
  elo05_glass_investor_day_hint:
    'Glass is wall-to-wall investors and the inspectors are on their best behavior. Push the wash through Glass and clear the heavy deposits while the suits are in town.',
  elo06_rival_counter_op_hint:
    "You've been loud lately, and the other families compared notes. Put the guns away for a while and let them see you mean it.",
  elo07_cohesion_thaw_hint:
    'The whole city is on edge and the neighborhoods forgive nothing right now. Go easy street by street — whatever heat you pick up will linger.',
  elo08_saltline_surplus_hint:
    'Half of Saltline is out of work and asking around for a patron. Open your door and take your pick of the good ones.',
  elo09_compression_prep_hint:
    "You're stretched thin and it shows at every seam. Lighten the supply lines, settle the crew disputes, square away the routines — and make sure the seconds know their jobs before the hard week lands.",
  elo10_structural_audit_hint:
    'The city is offering a free look at your own foundations. Take it — schedule the big teardowns and the reshuffles while the audit costs you nothing.',
} as const satisfies Record<string, string>;

export type CounterPlayHintKey = keyof typeof COUNTER_PLAY_HINT_COPY;

// ── Load-time anti-fig-leaf self-check (bijection, both directions) ─────────────────────────────────
//
// Mirrors `live-ops-event-catalogue.ts`'s own load-time self-check (:418-446): throws at module-require
// time (server boot, or any test importing this module) rather than waiting for an E2E spec alone —
// (i) every catalogue event's `counterPlayHintKey` must resolve to a dictionary entry (no uncovered
// event), and (ii) every dictionary key must be some event's `counterPlayHintKey` (no orphan copy).
{
  const dictionaryKeys = new Set<string>(Object.keys(COUNTER_PLAY_HINT_COPY));
  const catalogueKeys = new Set<string>(LIVE_OPS_EVENT_CATALOGUE.map((event) => event.counterPlayHintKey));

  for (const event of LIVE_OPS_EVENT_CATALOGUE) {
    if (!dictionaryKeys.has(event.counterPlayHintKey)) {
      throw new Error(
        `COUNTER_PLAY_HINT_COPY anti-fig-leaf violation: ${event.eventId}'s counterPlayHintKey ` +
        `'${event.counterPlayHintKey}' is NOT a member of COUNTER_PLAY_HINT_COPY (counter-play-hint-copy.ts) ` +
        `— every catalogue event must have authored hint copy.`,
      );
    }
  }
  for (const key of dictionaryKeys) {
    if (!catalogueKeys.has(key)) {
      throw new Error(
        `COUNTER_PLAY_HINT_COPY anti-fig-leaf violation: dictionary key '${key}' is NOT any event's ` +
        `counterPlayHintKey in LIVE_OPS_EVENT_CATALOGUE (live-ops-event-catalogue.ts) — no orphan copy allowed.`,
      );
    }
  }
}
