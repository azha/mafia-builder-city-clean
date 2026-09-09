// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C1 (12-event static catalogue)
//             Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md (12 events, effects,
//             durations, triggers, counter-play, news copy) — invariant #1 category mapping AMENDED 2026-07-05
//             (E-POL-05 = CRACKDOWN, commit 41378b6f, decisions doc §4.6 — the C1-blocking gap this chunk was
//             unblocked on).
//             A1-engine seams: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md §"A1-engine
//             seams verified on c03ce16a" (the 9 live-lever keys + 4 substrate BASE keys, verbatim strings
//             confirmed by direct source read — see each effect's doc comment for the exact file:line).
//             — 04e-A2 C1 — 2026-07-05
//             — 04e-A2 C4 — 2026-07-05 (the 3 C1-deferred sub-effects below RESOLVED — TD-159/160/161,
//             see the C4 doc addendum immediately below; no catalogue field changed, only the resolution)
//
// `POLITICAL_EVENT_CATALOGUE` — the 12 hard-coded `PoliticalEvent` entries (design §3: static config, no DB
// table). Every effect's `tunableKey` is a REAL, already-registered key (REUSE one of the 9 A1 lever keys / 4 A1
// substrate BASE keys / 34 A1 `politicalEventsTunables.*` getters, or a NEW A2 `politicalTunables.*` getter
// registered THIS chunk) — no fabricated key anywhere (falsifiable via `political_catalogue.spec.ts`'s registry
// resolve-check).
//
// SCOPE BOUNDARY (C1 = static catalogue only): this file does NOT wire anything to fire. The REAL
// `TriggerConditionEvaluator` predicates (C2 calendar + C3 state-driven), the calendar tick that calls
// `applyEvent`/`revertExpired` (C2), and the lifecycle service that builds `EffectModifierInput[]` from these
// `EventEffect[]` (C4/C5/C6) are explicitly OUT of scope here — `trigger` below is a DESCRIPTIVE reference
// (`PoliticalEventTrigger`, `political.types.ts`), not a runnable predicate.
//
// C4 RESOLUTION of the 3 C1-deferred sub-effects (plan C4: "map to the live lever if one exists, else
// honest-scaffolding + TD; do NOT fabricate a dangling key") — all 3 genuinely have NO real, already-built
// overlay-composable lever to map onto, so all 3 route as TD (never wired, never a fig-leaf key added):
//   - E-POL-02's "BPD precinct budgets +25%" — searched the codebase for a BPD-budget lever: no such
//     concept exists anywhere (`precinct_review_tick_hours` is a SCHEDULER cadence WIDTH, not an
//     overlay-composable lever — making a core tick cadence overlay-aware would be a NEW engine
//     capability outside the closed 9-lever/4-substrate registry `POLITICAL_VALID_EFFECT_TUNABLE_KEYS`
//     enumerates, not a "map to an existing lever" fix). Routed **TD-160**.
//   - E-POL-03's "BPD precinct review tick ×1.5" — the SAME `precinct_review_tick_hours` non-fit as
//     above (this sub-effect targets the SAME cadence-width concept, just the "slower" direction).
//     Routed **TD-161**.
//   - E-POL-09's "All MIS inspection priorities reshuffled" — a QUALITATIVE re-ordering of existing queue
//     entries, not a scalar shift on `inspectionQueueCap` (a capacity number) or `priorityDecayPerDay` (a
//     decay rate); representing "reshuffle" as an ADD/MULTIPLY/SET modifier on either would fabricate a
//     magnitude/semantics canon never gave. Routed **TD-159** (`docs_int/tech_debt_inventory.md`).
// Each is called out at its event's `effects` array with a comment citing the resolution, not silently omitted.

import { politicalEventsTunables } from '../effect_engine/effect-engine.tunables';
import { politicalTunables, POLITICAL_VALID_EFFECT_TUNABLE_KEYS } from './political.tunables';
import { POLITICAL_TEMPLATE_REGISTRY } from './political-template-id';
import type { PoliticalEvent } from './political.types';

export const POLITICAL_EVENT_CATALOGUE: readonly PoliticalEvent[] = [

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 01 — Electoral campaign season (catalogue.md :52-65)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-POL-01', // template_id binding — see POLITICAL_TEMPLATE_REGISTRY['E-POL-01'] (PoliticalTemplateId)
    name: 'Electoral campaign season',
    category: 'ELECTORAL',
    templateId: POLITICAL_TEMPLATE_REGISTRY['E-POL-01'], // template_id bound (anti-pattern-2)
    durationDaysGetter: () => politicalEventsTunables.epol01ElectoralDurationDays,
    trigger: {
      kind: 'CALENDAR_ELECTORAL',
      description: 'Every electoral_cycle_in_game_months in-game months (fixed schedule).',
    },
    effects: [
      // BPD raid_target_temperature += shift (police-memory-tunables.ts:120,128 — T.city.raid_target_temperature).
      { tunableKey: 'T.city.raid_target_temperature', op: 'ADD',
        magnitudeGetter: () => politicalEventsTunables.epol01BpdRaidTargetTemperatureShift, scope: 'GLOBAL' },
      // MIS "processing" ×1.5 → L4 canon→live mapping onto the LIVE inspectionQueueCap lever
      // (inspection-tunables.ts:64 — T.city.inspection_queue_cap), never the dead inspectionProcessingPerDay getter.
      { tunableKey: 'T.city.inspection_queue_cap', op: 'MULTIPLY',
        magnitudeGetter: () => politicalEventsTunables.epol01MisProcessingMultiplier, scope: 'GLOBAL' },
      // Cohesion permanent_marginal_threshold += shift (cohesion-tunables.ts:100-102).
      { tunableKey: 'T.city.permanent_marginal_threshold', op: 'ADD',
        magnitudeGetter: () => politicalEventsTunables.epol01CohesionMarginalShift, scope: 'GLOBAL' },
    ],
    counterPlayActions: [
      { name: 'Ephemeral Architecture', description: 'Reduce operational visibility (cross-ref 04b §2.3).' },
      { name: 'Bribe campaign coordinators', description: 'High cost via Fixer, +0.3 IA risk (no live cost lever cited by canon).' },
    ],
    newsFeedCopy: "Brennar electoral campaign enters home stretch. Candidates announce 'safer city' platforms.",
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 02 — Budget cycle: enforcement increase (catalogue.md :67-76)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-POL-02', // template_id binding — see POLITICAL_TEMPLATE_REGISTRY['E-POL-02'] (PoliticalTemplateId)
    name: 'Budget cycle: enforcement increase',
    category: 'BUDGET',
    templateId: POLITICAL_TEMPLATE_REGISTRY['E-POL-02'], // template_id bound (anti-pattern-2)
    durationDaysGetter: () => politicalEventsTunables.epol02BudgetIncreaseDurationDays,
    trigger: {
      kind: 'CALENDAR_BUDGET_INCREASE',
      description: 'Quarterly (variable, budget_cycle_in_game_months) — the "increase" phase.',
    },
    effects: [
      // Patrol Doctrine cluster threshold LOWERED TO 3 (an absolute target, not a delta — "lowered to 3,
      // was 5" — SET, not ADD; patrol-tunables.ts:51-52, T.city.cluster_correlation_threshold).
      { tunableKey: 'T.city.cluster_correlation_threshold', op: 'SET',
        magnitudeGetter: () => politicalEventsTunables.epol02PatrolClusterThreshold, scope: 'GLOBAL' },
      // DEFERRED — TD-160 (C4 resolution): "BPD precinct budgets +25%" (epol02_bpd_budget_multiplier IS
      // registered) — NO live BPD-budget lever exists anywhere in the codebase to map onto (searched at
      // C4; the closest candidate, precinct_review_tick_hours, is a scheduler cadence WIDTH outside the
      // closed lever registry — see this file's own header C4 addendum). Not wired; not fabricated.
    ],
    counterPlayActions: [
      { name: 'Reduce operational tempo', description: 'Lieutenant Heat manager pause non-essential cooks.' },
    ],
    newsFeedCopy: 'City Hall approves quarterly budget with expanded enforcement funding. Precinct patrols to intensify through the quarter.',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 03 — Budget cycle: enforcement cut (catalogue.md :78-87)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-POL-03', // template_id binding — see POLITICAL_TEMPLATE_REGISTRY['E-POL-03'] (PoliticalTemplateId)
    name: 'Budget cycle: enforcement cut',
    category: 'BUDGET',
    templateId: POLITICAL_TEMPLATE_REGISTRY['E-POL-03'], // template_id bound (anti-pattern-2)
    durationDaysGetter: () => politicalEventsTunables.epol03BudgetCutDurationDays,
    trigger: {
      kind: 'CALENDAR_BUDGET_CUT',
      description: 'Quarterly (variable, budget_cycle_in_game_months) — the "cut" phase, opposite of event 02.',
    },
    effects: [
      // MIS "processing" ×0.7 → L4 mapping, same live lever as event 01 (T.city.inspection_queue_cap).
      { tunableKey: 'T.city.inspection_queue_cap', op: 'MULTIPLY',
        magnitudeGetter: () => politicalEventsTunables.epol03MisProcessingMultiplier, scope: 'GLOBAL' },
      // DEFERRED — TD-161 (C4 resolution): "BPD precinct review tick ×1.5" (epol03_bpd_review_tick_multiplier
      // IS registered) — the SAME no-live-lever gap as event 02's budget effect (see this file's header C4
      // addendum). Not wired; not fabricated.
    ],
    counterPlayActions: [
      { name: 'None needed', description: 'A window of opportunity for operational expansion (canon explicit).' },
    ],
    newsFeedCopy: 'Enforcement spending falls in a revised quarterly budget. Inspection desks across Brennar expect slower reviews until the next cycle.',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 04 — Substance scheduling change / ordinance (catalogue.md :89-96, PERMANENT)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-POL-04', // template_id binding — see POLITICAL_TEMPLATE_REGISTRY['E-POL-04'] (PoliticalTemplateId)
    name: 'Substance scheduling change',
    category: 'ORDINANCE',
    templateId: POLITICAL_TEMPLATE_REGISTRY['E-POL-04'], // template_id bound (anti-pattern-2)
    // PERMANENT — a game-state shift (design §3): reverts only via explicit BO abort, NOT at the next election
    // (distinct from event 10/12's "permanent-until-election" — a C6 lifecycle distinction, out of C1 scope).
    durationDaysGetter: null,
    trigger: {
      kind: 'RANDOM_WEIGHTED_NOISE',
      description: 'Random, weighted by recent substance-demand-spike noise (scandal_random_weight_per_event_noise).',
    },
    effects: [
      // market.lane_c_lo += shift (market-tunables.ts:76-77).
      { tunableKey: 'market.lane_c_lo', op: 'ADD',
        magnitudeGetter: () => politicalEventsTunables.epol04MarketCLoShift, scope: 'GLOBAL' },
    ],
    counterPlayActions: [
      { name: 'Switch product mix', description: 'Move volume to an unaffected substance.' },
      { name: 'Pay political fixers via corrupt clerks', description: 'Cross-ref 04 §System 3.' },
    ],
    newsFeedCopy: 'A new scheduling ordinance reclassifies a controlled substance citywide. Markets adjust as the revised list takes effect.',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 05 — Lobbying campaign by rival (catalogue.md :98-105)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-POL-05', // template_id binding — see POLITICAL_TEMPLATE_REGISTRY['E-POL-05'] (PoliticalTemplateId)
    name: 'Lobbying campaign by rival',
    // CRACKDOWN — RULED 2026-07-05 (commit 41378b6f, decisions doc §4.6): the canon invariant #1 category-mapping
    // gap this chunk was blocked on until unblocked. See that commit / decisions §4.6 for the full justification
    // (timed targeted-enforcement shape shared with events 06/08/11, not a permanent regulatory shift).
    category: 'CRACKDOWN',
    templateId: POLITICAL_TEMPLATE_REGISTRY['E-POL-05'], // template_id bound (anti-pattern-2)
    durationDaysGetter: () => politicalEventsTunables.epol05LobbyingDurationDays,
    trigger: {
      kind: 'RIVAL_REGIME_TERRITORY_GAIN',
      description: "A rival's regime is BLEEDING or RETRENCH AND the player has gained territory recently.",
    },
    effects: [
      // MIS inspections preferentially target player-affiliated buildings, DISTRICT-scoped over player territory
      // (L4 mapping onto T.city.inspection_queue_cap, scoped variant `inspectionQueueCapFor`).
      { tunableKey: 'T.city.inspection_queue_cap', op: 'MULTIPLY',
        magnitudeGetter: () => politicalEventsTunables.epol05MisTargetPlayerMultiplier, scope: 'DISTRICT' },
    ],
    counterPlayActions: [
      { name: 'Counter-lobbying via Saltline brokers', description: 'Cross-ref 04a §14 Saltline pool.' },
      { name: 'Sustained operational restraint', description: 'Reduces signal.' },
    ],
    newsFeedCopy: 'Business lobbies press City Hall for tighter commercial inspections. Inspectors are expected to focus on districts named in the campaign.',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 06 — Anti-corruption initiative (catalogue.md :107-114)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-POL-06', // template_id binding — see POLITICAL_TEMPLATE_REGISTRY['E-POL-06'] (PoliticalTemplateId)
    name: 'Anti-corruption initiative',
    category: 'CRACKDOWN',
    templateId: POLITICAL_TEMPLATE_REGISTRY['E-POL-06'], // template_id bound (anti-pattern-2)
    durationDaysGetter: () => politicalEventsTunables.epol06AntiCorruptionDurationDays,
    trigger: {
      kind: 'RANDOM_OR_AFTER_SCANDAL',
      description: 'Random OR after a major scandal (the SCANDAL-category event fires).',
    },
    effects: [
      // IA open_investigation_threshold += shift (ia.tunables.ts:98-102 — internal_affairs.open_investigation_threshold).
      { tunableKey: 'internal_affairs.open_investigation_threshold', op: 'ADD',
        magnitudeGetter: () => politicalEventsTunables.epol06IaThresholdShift, scope: 'GLOBAL' },
    ],
    counterPlayActions: [
      { name: 'Pause use of corrupt actors', description: 'Cool-off clerks and Tier-3 lawyers (cross-ref 04d/lawyer_legal_system.md chunk 2, burn_risk_score accumulation).' },
    ],
    newsFeedCopy: 'An anti-corruption initiative opens across city agencies. Clerks and contractors face fresh scrutiny as investigators widen their files.',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 07 — Industrial zoning relaxation (catalogue.md :116-123, PERMANENT, L2)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-POL-07', // template_id binding — see POLITICAL_TEMPLATE_REGISTRY['E-POL-07'] (PoliticalTemplateId)
    name: 'Industrial zoning relaxation',
    category: 'ORDINANCE',
    templateId: POLITICAL_TEMPLATE_REGISTRY['E-POL-07'], // template_id bound (anti-pattern-2)
    // PERMANENT — a game-state shift (design §3, L2): reverts only via explicit BO abort.
    durationDaysGetter: null,
    trigger: {
      kind: 'STACK_UTILIZATION_SUSTAINED',
      description: 'Stack district utilization > epol07_stack_utilization_threshold_pct, sustained epol07_stack_utilization_window_days.',
    },
    effects: [
      // L2 (RULED): genuine Stack zoning gate relax, SET stack_zoning_gated_lot_count TOWARD 0
      // (specialized-lab-tunables.ts:85-87 — real_estate.stack_zoning_gated_lot_count). The target value 0 is a
      // STRUCTURAL constant (the definition of "fully relaxed" — every Stack lot constructible), not a balance
      // magnitude — there is no political_events.* getter for "how relaxed," canon/plan both specify the gate
      // opens fully. Kept as a plain literal (not a fabricated tunable) per this file's header note.
      { tunableKey: 'real_estate.stack_zoning_gated_lot_count', op: 'SET',
        magnitudeGetter: () => 0, scope: 'GLOBAL' },
    ],
    counterPlayActions: [
      { name: 'None', description: 'A windfall for production-focused players (canon explicit).' },
    ],
    newsFeedCopy: 'Zoning boards relax industrial restrictions in the Stack districts. New lots reach the market as construction permits clear.',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 08 — Riverfront crackdown / Threnny (catalogue.md :125-132, L5)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-POL-08', // template_id binding — see POLITICAL_TEMPLATE_REGISTRY['E-POL-08'] (PoliticalTemplateId)
    name: 'Riverfront crackdown',
    category: 'CRACKDOWN',
    templateId: POLITICAL_TEMPLATE_REGISTRY['E-POL-08'], // template_id bound (anti-pattern-2)
    durationDaysGetter: () => politicalEventsTunables.epol08RiverfrontCrackdownDurationDays,
    trigger: {
      kind: 'RANDOM_SEEDED',
      description: 'Seeded-random only (L5 — port-seizure coupling deferred, TD-154).',
    },
    effects: [
      // All bridge/ferry checkpoints inspection_density ×1.6, DISTRICT-scoped over the river-crossing Set
      // (inspection-tunables.ts:114-140 — checkpoint_inspection_density_default, A2-D4 cap-only per C9-M1).
      { tunableKey: 'checkpoint_inspection_density_default', op: 'MULTIPLY',
        magnitudeGetter: () => politicalEventsTunables.epol08InspectionDensityMultiplier, scope: 'DISTRICT' },
    ],
    counterPlayActions: [
      { name: 'Reroute via cohesion-friendly bridges', description: 'Avoid the crackdown-affected crossings.' },
      { name: 'Pause cross-river ops', description: 'Via Dispatch coordinator behavior script.' },
    ],
    newsFeedCopy: 'Checkpoints multiply along the Threnny riverfront. Bridge and ferry crossings face tighter inspection on both banks.',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 09 — City Hall scandal (catalogue.md :134-144)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-POL-09', // template_id binding — see POLITICAL_TEMPLATE_REGISTRY['E-POL-09'] (PoliticalTemplateId)
    name: 'City Hall scandal',
    category: 'SCANDAL',
    templateId: POLITICAL_TEMPLATE_REGISTRY['E-POL-09'], // template_id bound (anti-pattern-2)
    durationDaysGetter: () => politicalEventsTunables.epol09ScandalDurationDays,
    trigger: {
      kind: 'SCANDAL_NOISE_ACCUMULATOR',
      description: 'Accumulated city-event noise (political_calendar_state.scandal_noise_accumulator) ≥ epol09_scandal_noise_threshold (NEW A2 key).',
    },
    effects: [
      // Existing audit pins half-life shortens ×0.6 (unconformity-tunables.ts:129-131 — forensic.audit_pin_half_life_days).
      { tunableKey: 'forensic.audit_pin_half_life_days', op: 'MULTIPLY',
        magnitudeGetter: () => politicalEventsTunables.epol09AuditPinHalfLifeMultiplier, scope: 'GLOBAL' },
      // New audit pins appear at higher rates ×1.4 (unconformity-tunables.ts:146-148 — forensic.audit_pin_emergence_rate).
      { tunableKey: 'forensic.audit_pin_emergence_rate', op: 'MULTIPLY',
        magnitudeGetter: () => politicalEventsTunables.epol09AuditPinEmergenceMultiplier, scope: 'GLOBAL' },
      // DEFERRED — TD-159 (C4 resolution): "All MIS inspection priorities reshuffled" — a QUALITATIVE
      // reshuffle (canon prose), not a scalar shift/multiplier on any registered lever (see this file's
      // header C4 addendum); no fabricated op/magnitude modeled for this half. This event's REAL modeled
      // effects (the audit-pin substrate, above) are wired at C5 — this file's own C1 header note.
    ],
    counterPlayActions: [
      { name: 'Capitalize on chaos', description: 'Launder more aggressively — the lane is more permissive during chaos.' },
    ],
    newsFeedCopy: 'Leaked records pull City Hall into a widening scandal. Auditors reopen old files while officials scramble to answer.',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 10 — Mayor opposition victory (catalogue.md :146-155, PERMANENT UNTIL ELECTION)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-POL-10', // template_id binding — see POLITICAL_TEMPLATE_REGISTRY['E-POL-10'] (PoliticalTemplateId)
    name: 'Mayor opposition victory',
    category: 'REFORM',
    templateId: POLITICAL_TEMPLATE_REGISTRY['E-POL-10'], // template_id bound (anti-pattern-2)
    // PERMANENT UNTIL ELECTION (design §3): reverts when the next ELECTORAL-category event activates (C6).
    durationDaysGetter: null,
    trigger: {
      kind: 'OPPOSITION_VICTORY_ROLL',
      description: 'End of the ELECTORAL-category event, if "opposition" wins — seeded roll, opposition_victory_probability_base weighted by city heat.',
    },
    effects: [
      // Lawyer Tier 3 cost ×1.2 (lawyer.tunables.ts:309-313 — lawyer.tier3_corruption_lawyer_base_cost_cents).
      { tunableKey: 'lawyer.tier3_corruption_lawyer_base_cost_cents', op: 'MULTIPLY',
        magnitudeGetter: () => politicalEventsTunables.epol10LawyerTier3CostMultiplier, scope: 'GLOBAL' },
      // Counter-play actions targeting politicians ×0.7 (-30%) — honest-scaffolding (decisions §4.4, RULED):
      // the NEW A2 BASE lever `political_events.counter_play_politician_cost` (political.tunables.ts), the
      // EXISTING multiplier `epol10_counter_play_cost_multiplier` (A1-C1). C7 proves the composed read-back;
      // the real spend consumer is Unity/action-lot (TD).
      { tunableKey: 'political_events.counter_play_politician_cost', op: 'MULTIPLY',
        magnitudeGetter: () => politicalEventsTunables.epol10CounterPlayCostMultiplier, scope: 'GLOBAL' },
    ],
    counterPlayActions: [
      { name: 'Adjust budget allocation', description: 'Procurement Specialist + Fixer re-prioritize.',
        costGetter: () => politicalTunables.counterPlayPoliticianCost },
    ],
    newsFeedCopy: 'Opposition candidates take City Hall after a hard-fought election. The incoming administration promises a sweeping review of courts and contracts.',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 11 — Federal task force / rare (catalogue.md :157-164, L3, C7-M2)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-POL-11', // template_id binding — see POLITICAL_TEMPLATE_REGISTRY['E-POL-11'] (PoliticalTemplateId)
    name: 'Federal task force',
    category: 'CRACKDOWN',
    templateId: POLITICAL_TEMPLATE_REGISTRY['E-POL-11'], // template_id bound (anti-pattern-2)
    durationDaysGetter: () => politicalEventsTunables.epol11FederalTaskForceDurationDays,
    trigger: {
      kind: 'FEDERAL_BPD_AGGREGATE_AND_ELIMINATIONS',
      description: 'Citywide BPD memory aggregate bucket > epol11_bpd_memory_aggregate_trigger AND 2+ rival eliminations in the past 6 months.',
    },
    effects: [
      // RULED 2026-07-05 (§4.1, ×0.5 downward): police_memory.federal_raid_target_temperature (base 0.3) ×0.5 =
      // 0.15 — in-bounds vs the [0,2.0] CHECK (mig 0108, C7-M2/A2-D3 BLOCKING, live-fire-proven at C5).
      { tunableKey: 'police_memory.federal_raid_target_temperature', op: 'MULTIPLY',
        magnitudeGetter: () => politicalTunables.epol11FederalRaidTemperatureMultiplier, scope: 'GLOBAL' },
      // Immunity to corrupt-clerk mutation (L3, honest-scaffolding) is proven via `federal-investigator.guard.ts`'s
      // REJECTION assertion (federal_investigators.corruption_exempt=true), not an EventEffect modifier — no
      // registered tunable key represents "immunity," it is a structural DB flag set at spawn (C7, out of scope).
    ],
    counterPlayActions: [
      { name: 'Hide / deep restraint', description: 'Sustained pacifist run (cross-ref 04b pacifist_run_viability.md).' },
    ],
    newsFeedCopy: 'Federal investigators arrive in Brennar under a joint task force. City officials pledge full cooperation with the outside team.',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 12 — Sympathetic district representative (catalogue.md :166-176, PERMANENT UNTIL ELECTION, L1)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-POL-12', // template_id binding — see POLITICAL_TEMPLATE_REGISTRY['E-POL-12'] (PoliticalTemplateId)
    name: 'Sympathetic district representative',
    category: 'ORDINANCE',
    templateId: POLITICAL_TEMPLATE_REGISTRY['E-POL-12'], // template_id bound (anti-pattern-2)
    // PERMANENT UNTIL ELECTION (design §3): reverts when the next ELECTORAL-category event activates (C6).
    durationDaysGetter: null,
    trigger: {
      kind: 'DISTRICT_SUSTAINED_GOOD_BEHAVIOR',
      description: 'L1 redefinition (RULED): per-district cohesion ≥ epol12_district_cohesion_floor AND heat ≤ EPOL12_DISTRICT_HEAT_CEILING_BUCKET (WARM), sustained epol12_district_sustain_window_days.',
    },
    effects: [
      // MIS inspections in that district ×0.6 (-40%), DISTRICT-scoped (inspection-tunables.ts, T.city.inspection_queue_cap).
      { tunableKey: 'T.city.inspection_queue_cap', op: 'MULTIPLY',
        magnitudeGetter: () => politicalEventsTunables.epol12MisInspectionMultiplier, scope: 'DISTRICT' },
      // Cohesion recovery_rate_per_day ×1.5, DISTRICT-scoped (cohesion-tunables.ts:76-86 — T.city.cohesion_recovery_rate_per_day).
      { tunableKey: 'T.city.cohesion_recovery_rate_per_day', op: 'MULTIPLY',
        magnitudeGetter: () => politicalEventsTunables.epol12CohesionRecoveryMultiplier, scope: 'DISTRICT' },
    ],
    counterPlayActions: [
      { name: 'None', description: 'A reward for sustained good behavior in that district (canon explicit) — maintain a high Restraint Index there.' },
    ],
    newsFeedCopy: 'A district representative credits local calm and urges lighter oversight. Inspection visits ease where the neighborhood keeps its peace.',
  },
];

/** All 12 canonical event ids, in catalogue order — used by tests to assert full-catalogue coverage. */
export const POLITICAL_EVENT_IDS: readonly string[] = POLITICAL_EVENT_CATALOGUE.map((e) => e.eventId);

/**
 * `POLITICAL_EVENT_BY_ID` — a lookup index derived from `POLITICAL_EVENT_CATALOGUE` (04e-A2 C2). A
 * single source of truth (the array above); this is purely a derived Map for O(1) lookup by the
 * calendar tick / lifecycle activation code (`political-calendar-tick.service.ts`), never a second
 * hand-authored copy of the catalogue.
 */
export const POLITICAL_EVENT_BY_ID: ReadonlyMap<string, PoliticalEvent> = new Map(
  POLITICAL_EVENT_CATALOGUE.map((event) => [event.eventId, event]),
);

/** Look up a catalogue entry by id, throwing loudly if the id is not a real member (anti-fig-leaf — a
 *  caller passing a fabricated/typo'd event id fails immediately, never silently no-ops). */
export function getPoliticalEventById(eventId: string): PoliticalEvent {
  const event = POLITICAL_EVENT_BY_ID.get(eventId);
  if (!event) {
    throw new Error(`getPoliticalEventById: '${eventId}' is not a member of POLITICAL_EVENT_CATALOGUE`);
  }
  return event;
}

// ── Load-time anti-fig-leaf self-check (defense-in-depth ahead of the E2E resolve-check) ──────────────
//
// Every `EventEffect.tunableKey` in the catalogue above MUST be a member of `POLITICAL_VALID_EFFECT_
// TUNABLE_KEYS` (political.tunables.ts) — the closed, independently-verified set of every REAL overlay
// key an effect is allowed to target (the 9 A1 lever keys, the 4 A1 substrate BASE keys, and the 1 NEW
// A2 `counter_play_politician_cost` lever). This throws at module-require time (server boot, or any
// test importing this module) rather than waiting for the E2E spec alone to catch a fabricated/dangling
// key — the strongest form of "no fig-leaf effect," since it is structurally impossible to boot the
// server with a catalogue entry targeting an unregistered key.
for (const event of POLITICAL_EVENT_CATALOGUE) {
  for (const effect of event.effects) {
    if (!POLITICAL_VALID_EFFECT_TUNABLE_KEYS.has(effect.tunableKey)) {
      throw new Error(
        `POLITICAL_EVENT_CATALOGUE anti-fig-leaf violation: ${event.eventId} effect targets ` +
        `'${effect.tunableKey}', which is NOT a member of POLITICAL_VALID_EFFECT_TUNABLE_KEYS ` +
        `(political.tunables.ts) — every effect must target a REAL, already-registered overlay key.`,
      );
    }
  }
  // Anti-pattern-2 (political_templates.md :154-160): every event's `templateId` must be a REAL
  // `PoliticalTemplateId`. Cross-checked against `POLITICAL_TEMPLATE_REGISTRY` (political-template-id.ts)
  // so the two files can never silently drift apart (the registry's own entry is the source of truth
  // this catalogue's per-event `templateId:` literal must match).
  const registryTemplateId = POLITICAL_TEMPLATE_REGISTRY[event.eventId];
  if (registryTemplateId === undefined || registryTemplateId !== event.templateId) {
    throw new Error(
      `POLITICAL_EVENT_CATALOGUE anti-pattern-2 violation: ${event.eventId} templateId ` +
      `('${event.templateId}') does not match POLITICAL_TEMPLATE_REGISTRY['${event.eventId}'] ` +
      `('${registryTemplateId}') — the two must agree (political-template-id.ts is the source of truth).`,
    );
  }
}
