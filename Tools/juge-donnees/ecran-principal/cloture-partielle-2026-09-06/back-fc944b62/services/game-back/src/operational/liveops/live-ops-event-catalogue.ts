// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C1 (10-event static catalogue)
//             Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md (10 events, effects,
//             durations, triggers, counter-play, notice copy) + gdd/04e_political_events_and_liveops.md §2.3
//             (canon-verbatim notice copy) + §2.5 (cadence, high-impact set).
//             Push-consent: docs/superpowers/specs/2026-07-06-04e-B-liveops-decisions.md §3 (RULED per event —
//             a change to the classification is a controller decision, not a coder guess).
//             A1-engine seams: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md §"A1/A2-engine seams
//             verified on 7153546c" + design §12 (the 7 physical REUSE getters, verbatim strings confirmed by
//             direct source read — see each effect's doc comment for the exact file:line).
//             — 04e-B C1 — 2026-07-06
//
// `LIVE_OPS_EVENT_CATALOGUE` — the 10 hard-coded `LiveOpsEvent` entries (design §3.1: static config, no DB
// table in B). Every POPULATED effect's `tunableKey` is a REAL, already-registered key (a member of
// `LIVE_OPS_VALID_EFFECT_TUNABLE_KEYS`, live-ops.tunables.ts — REUSE, one of A1's substrate getters) — no
// fabricated key anywhere (falsifiable via `liveops_catalogue.spec.ts`'s registry resolve-check).
//
// SCOPE BOUNDARY (C1 = static catalogue only): this file does NOT wire anything to fire. The REAL
// `evaluateCohortTargeting` predicate engine (C2), `activateLiveOpsEvent`/`deactivateLiveOpsEvent` (C4), the
// cadence controller (C5), the aggression ledger (C6), and `sendNotifications` (C7) are explicitly OUT of scope
// here — `targeting` below is a DESCRIPTIVE/STATIC composite (design §3.3), not a runnable query.
//
// HONEST WIRE-STATUS (D2, decisions §1/§6 — the plan's own "expected split") — ★ C3 AUDIT RESULT (this
// chunk), SUPERSEDES the C1 assumption below the line: of the 10 events, exactly 3 are FULLY wired and
// genuinely live-fireable (E-LO-01, E-LO-02, E-LO-07), 1 is SURFACE-ONLY by canon design (E-LO-09 — "no
// state change", NOT a gap), and 6 are explicit TD (E-LO-03, E-LO-04, E-LO-05, E-LO-06, E-LO-08, E-LO-10 —
// no real base getter/producer, or a real getter that cannot honestly represent the canon effect — see each
// entry's comment + `live-ops-lever-audit.ts` for the full per-event rationale). This is a DOWNGRADE from
// C1's assumed "3 fully + 1 partially + 1 surface + 5 not-yet" — C3 found TWO defects in C1's "fully wired"
// claims and corrected them, and found the "partially wired" E-LO-05 claim does not survive scrutiny:
//   ★ C3 FINDING 1 (E-LO-01 second effect, FIXED): the catalogue declared `T.city.inspection_queue_cap`
//     PLAYER-scoped, but `InspectionService.effectiveQueueCapFor` (the getter's ONLY production consumer)
//     constructs its `EffectScopeContext` with `districtId` ONLY — it NEVER threads `playerId`
//     (`inspection.service.ts:661`: `const scope = districtId !== undefined ? { districtId: String(districtId) }
//     : undefined`). `EffectOverlayStore.scopeMatches` requires `scope.playerId === row.scope_ref` for a
//     PLAYER row to match (`effect-overlay-store.ts:242-251`) — with `playerId` never present in that scope
//     object, a PLAYER-scoped modifier on this key would be SILENTLY INERT in production (a fig-leaf wire
//     that "compiles" and even passes a getter-level test, but never actually shifts anything a real player
//     experiences). FIXED here: scope corrected to GLOBAL. Zero semantic loss — B ships no per-activation
//     region-override composer (D5/§8), so E-LO-01's static `targeting: {}` already resolves to literally
//     every player regardless of scope choice, and GLOBAL rows match unconditionally
//     (`scopeMatches` GLOBAL case returns `true` regardless of what scope object the caller supplies) — so
//     this is genuinely observable through the REAL `InspectionService` consumer, not just a raw getter probe.
//   ★ C3 FINDING 2 (E-LO-02, FIXED): `laundering.front_shop_legit_baseline_cents` has NO scoped variant at
//     all — `launderingTunables.frontShopLegitBaselineCents()` calls
//     `EffectOverlayStore.applyModifiers(key, base)` with ZERO scope argument for EVERY caller
//     (`laundering-tunables.ts`) — so a PLAYER-scoped row could NEVER match (only GLOBAL rows match when
//     `scope` is always `undefined`). Same fix, same zero-loss rationale as E-LO-01 (E-LO-02's targeting is
//     also `{}` = all players) — corrected to GLOBAL.
//   ★ C3 FINDING 3 (E-LO-05, DOWNGRADED to TD): the audit-pin half-life sub-effect has the SAME dead-scope
//     defect as E-LO-02 (`unconformityTunables.pinHalfLifeDays` also never threads scope — GLOBAL-only), BUT
//     E-LO-05's targeting (`{ tier: { minTier: 3 } }`) is NOT "everyone" — GLOBAL-izing would shift Tier 1-2
//     players canon explicitly excludes, a real population overclaim (not just a granularity loss). Fixing
//     this correctly requires threading `playerId` through `UnconformityLedgerService`'s nightly-tick call
//     chain (a production-service change, out of C3's minimal-risk audit scope) — so this sub-effect is TD'd
//     (routed forward, not fig-leafed as PLAYER-scoped-but-dead). The laundering-yield sub-effect was already
//     TD (no real getter). E-LO-05 is therefore FULLY TD (both sub-effects), not "partially wired".
// See `live-ops-lever-audit.ts` for the committed, falsifiable per-event verdict table (WIRED/TD/SURFACE_ONLY
// + rationale + TD marker per sub-effect) — the C3 test floor (`liveops_lever_audit.spec.ts`) asserts against
// it directly. Every omitted sub-effect is a comment, never a fabricated key — mirrors
// `political-event-catalogue.ts`'s own C1 precedent (E-POL-02/03/09/11's deferred sub-effects). No dead knob:
// where C3 could not honestly wire a lever, the event is TD'd — never a fake consumer.

import { liveOpsTunables, LIVE_OPS_VALID_EFFECT_TUNABLE_KEYS } from './live-ops.tunables';
import { LIVE_OPS_TEMPLATE_REGISTRY } from './live-ops-template-id';
import type { LiveOpsEvent } from './live-ops.types';

export const LIVE_OPS_EVENT_CATALOGUE: readonly LiveOpsEvent[] = [

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 01 — Citywide crackdown (catalogue.md :55-65) — FULLY WIRED
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-LO-01', // template_id binding — see LIVE_OPS_TEMPLATE_REGISTRY['E-LO-01'] (LiveOpsTemplateId)
    name: 'Citywide crackdown',
    category: 'CITYWIDE',
    templateId: LIVE_OPS_TEMPLATE_REGISTRY['E-LO-01'], // template_id bound (anti-pattern-2)
    // "All players in selected region" (canon) — the specific region is an operator choice at BO
    // force-trigger time (C4/C8; B ships no per-activation cohort-override composer, D5/§8), not a value baked
    // into the static catalogue. `{}` = no additional composite constraint beyond the cohort resolver's default
    // (every player) — C2's `evaluateCohortTargeting` reads the region argument the force-trigger call supplies.
    targeting: {},
    durationRealDaysGetter: () => liveOpsTunables.elo01CrackdownDurationRealDays,
    effects: [
      // BPD raid_target_temperature × 1.5 (police-memory-tunables.ts:120,128 — T.city.raid_target_temperature).
      { tunableKey: 'T.city.raid_target_temperature', op: 'MULTIPLY',
        magnitudeGetter: () => liveOpsTunables.elo01CrackdownBpdMultiplier, scope: 'PLAYER' },
      // MIS processing × 1.4 → L4 canon→live mapping onto the LIVE inspectionQueueCap lever
      // (inspection-tunables.ts:64 — T.city.inspection_queue_cap), same mapping A2 uses for its own "MIS ×N" effects.
      // ★ C3 FIX (was `scope: 'PLAYER'` — SILENTLY INERT, see file header "C3 FINDING 1"):
      // `InspectionService.effectiveQueueCapFor` (the getter's sole production consumer) constructs its
      // scope with `districtId` ONLY, never `playerId` — a PLAYER row could never match. Corrected to
      // GLOBAL: zero semantic loss (B's static targeting for E-LO-01 is `{}` = every player already, no
      // per-activation region-override composer exists), and GLOBAL rows match unconditionally regardless
      // of the scope object any caller supplies — genuinely observable through the real consumer.
      { tunableKey: 'T.city.inspection_queue_cap', op: 'MULTIPLY',
        magnitudeGetter: () => liveOpsTunables.elo01CrackdownMisMultiplier, scope: 'GLOBAL' },
    ],
    highImpact: true, // canon liveops_event_catalogue.md:171 cadence rule ("...like E-LO-01 + E-LO-04 + E-LO-06")
    pushConsentClass: 'SERVICE', // decisions §3 — operational pressure on active ops
    noticeCopy: 'Citywide crackdown announced. Operations harder for 7 days.',
    counterPlayHintKey: 'elo01_crackdown_hint', // hint copy: counter-play-hint-copy.ts (COUNTER_PLAY_HINT_COPY) — TD-176 resolved
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 02 — Tidewater dock strike (catalogue.md :67-76) — FULLY WIRED (GLOBAL-only getter caveat)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-LO-02', // template_id binding — see LIVE_OPS_TEMPLATE_REGISTRY['E-LO-02'] (LiveOpsTemplateId)
    name: 'Tidewater dock strike',
    category: 'MARKET_SHIFT',
    templateId: LIVE_OPS_TEMPLATE_REGISTRY['E-LO-02'],
    targeting: {}, // "All players" (canon) — no additional composite constraint
    durationRealDaysGetter: () => liveOpsTunables.elo02DockStrikeDurationRealDays,
    effects: [
      // Tidewater-profile front-shop baseline × 0.65 (laundering-tunables.ts:91-92 —
      // laundering.front_shop_legit_baseline_cents). ★ C3 AUDIT RESOLUTION (was `scope: 'PLAYER'` —
      // SILENTLY INERT, see file header "C3 FINDING 2"): this getter is GLOBAL-only — it calls
      // `EffectOverlayStore.applyModifiers(key, base)` with ZERO scope argument for EVERY caller, so a
      // PLAYER-scoped row could never match (only GLOBAL rows match an always-`undefined` scope). Resolved
      // (a) "apply anyway": corrected to GLOBAL — zero semantic loss, since E-LO-02's canon targeting is
      // "all players" (`targeting: {}`, no per-activation region-override composer in B, D5/§8) — the
      // Tidewater-DISTRICT-profile GRANULARITY is lost (every district's front-shop baseline shifts
      // uniformly, not just Tidewater's), but the TARGETED POPULATION is unchanged (everyone, either way).
      // The district-profile granularity gap itself is TD'd (see `live-ops-lever-audit.ts`).
      { tunableKey: 'laundering.front_shop_legit_baseline_cents', op: 'MULTIPLY',
        magnitudeGetter: () => liveOpsTunables.elo02DockStrikeBaselineMultiplier, scope: 'GLOBAL' },
    ],
    highImpact: false,
    pushConsentClass: 'SERVICE', // decisions §3 — supply disruption on laundering ops
    noticeCopy: 'Tidewater dock workers strike. Front-shop baselines depressed.',
    counterPlayHintKey: 'elo02_dock_strike_hint',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 03 — Coil aggressive expansion campaign (catalogue.md :78-87) — NOT WIRED (D2/C3)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-LO-03', // template_id binding — see LIVE_OPS_TEMPLATE_REGISTRY['E-LO-03'] (LiveOpsTemplateId)
    name: 'Coil aggressive expansion campaign',
    category: 'RIVAL_ACTION',
    templateId: LIVE_OPS_TEMPLATE_REGISTRY['E-LO-03'],
    // "Players with active Coil rivalry" — HONEST GAP (flagged, not fig-leafed, live-ops.types.ts header note):
    // no `CohortTargetingFilter` dimension (tier/region/recentActivity/aggression) represents "active rivalry
    // with a specific rival faction." `{}` here, NOT a fabricated loosely-fitting field — C2/C3 either extend
    // the composite (a `rivalry?: RivalKey` dimension) or route an explicit TD for the targeting predicate.
    targeting: {},
    durationRealDaysGetter: () => liveOpsTunables.elo03CoilCampaignDurationRealDays,
    // TD (04e-B C3, TD-LO-03-lek-contest; TD-169, docs_int/tech_debt_inventory.md) — "Coil contests leks × 1.5":
    // grepped, confirmed: no real "lek CONTEST-RATE" getter exists anywhere. `deal_lek` (System 11,
    // `citysim/deal_lek/`) DOES model contest/control-state, but its ONLY contest-shaped tunable is
    // `contest_threshold_presence_ratio` (a THRESHOLD, not a rate) and it is a citywide spatial-territoriality
    // system with no per-rival-faction axis — not "Coil"-specific and not a rate. No fabricated mapping (D2).
    //
    // TD (04e-B C3, TD-LO-03-regime-pressure; TD-169, docs_int/tech_debt_inventory.md) — "Coil's regime_pressure
    // accumulates × 0.7": ★ this is NOT simply absent (unlike C1's original "no such lever exists" claim) —
    // a REAL, live `regime_pressure` mechanic DOES exist (`operational/conflict/rival/rival-ai.tunables.ts`
    // `regimePressureDecayRatePeacefulPerDay`/`regimePressureWeightTerritory|Casualty|Revenue` +
    // `RegimeSwitchingService.recomputeRegimePressure`, a genuinely-consumed per-(player,rival) persisted
    // state). C3 declines to wire it for TWO independent reasons: (a) it is RIVAL-KEY-AGNOSTIC — no
    // per-rival-type getter exists to isolate "Coil only" (`RivalKey = 'coil'|'tarcum'|'iron_throat'|
    // 'saltline'`, `rival-ai.types.ts:24`) — wiring the shared getter would shift EVERY rival's regime
    // pressure for a targeted player, not just Coil's, contradicting canon's explicit "Coil's regime_pressure"
    // scoping; (b) canon's "accumulates × 0.7" reads as an ACCRUAL-rate change, but the only continuously-
    // multipliable regime_pressure getter is the DECAY rate — mapping one onto the other is a semantic
    // reinterpretation, not a verified match (the same anti-fig-leaf discipline that keeps E-LO-04's
    // rejection of `market.lane_c_lo` honest). Both magnitude getters
    // (`liveOpsTunables.elo03CoilLekContestRateMultiplier`/`elo03CoilRegimePressureMultiplier`) STAY
    // registered (registry-first, R2.3); never fabricated here (D2, mirrors A2's E-POL-02/03 TD-160/161
    // precedent: "not wired; not fabricated").
    effects: [],
    highImpact: false,
    pushConsentClass: 'SERVICE', // decisions §3 — rival pressure; targeted at active-rivalry players
    noticeCopy: 'The Coil expanding aggressively. Hold or yield.',
    counterPlayHintKey: 'elo03_coil_expansion_hint',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 04 — Substance market anomaly (catalogue.md :89-96) — NOT WIRED (D2/C3), high-impact
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-LO-04', // template_id binding — see LIVE_OPS_TEMPLATE_REGISTRY['E-LO-04'] (LiveOpsTemplateId)
    name: 'Substance market anomaly',
    category: 'MARKET_SHIFT',
    templateId: LIVE_OPS_TEMPLATE_REGISTRY['E-LO-04'],
    // "All players in region" — same BO-time region-selection caveat as E-LO-01 (see that entry's comment).
    targeting: {},
    durationRealDaysGetter: () => liveOpsTunables.elo04MarketAnomalyDurationRealDays,
    // TD (04e-B C3, TD-LO-04-substance-demand; TD-170, docs_int/tech_debt_inventory.md) — design §4 explicit +
    // C3-reconfirmed by direct grep: `market.lane_c_lo` (the only market getter A1 wired) is a LANE-COLLAPSE
    // PRICE THRESHOLD, semantically distinct from "substance demand pattern" (canon: "Hush demand +30%, OR
    // Brindle wear-cohort preference flips") — reusing `market.lane_c_lo` here would misrepresent the effect
    // (the same anti-fig-leaf discipline that keeps A2's E-POL-04 mapping honest for ITS OWN, actually-matching,
    // lane-collapse effect — this event's semantics simply do not match that lever). C3 re-grepped
    // `operational/hush/` (hush-addiction-tunables.ts: decayPerTick/dependentScore/establishedScore/
    // incrementPerDeal/loyaltyBoostMultiplier/withdrawalPeriodTicks — a LOYALTY model, no "demand" lever) and
    // `operational/substance/`/`operational/precursors/` — confirmed: no substance-demand base getter exists
    // anywhere. The magnitude getter IS registered (`liveOpsTunables.elo04SubstanceDemandShiftMultiplier`,
    // registry-first) for a future chunk to wire once a real demand-lever getter exists; never fabricated
    // here (D2).
    effects: [],
    highImpact: true, // canon liveops_event_catalogue.md:171 — "blocks content adaptation strategies"
    pushConsentClass: 'SERVICE', // decisions §3 — neutral gameplay state change to adapt to, not promotional
    noticeCopy: 'Market shift detected: [substance] demand pattern altered.',
    counterPlayHintKey: 'elo04_substance_anomaly_hint',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 05 — Glass district investor day (catalogue.md :98-106) — TD (04e-B C3, both sub-effects)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-LO-05', // template_id binding — see LIVE_OPS_TEMPLATE_REGISTRY['E-LO-05'] (LiveOpsTemplateId)
    name: 'Glass district investor day',
    category: 'GLASS_EVENT',
    templateId: LIVE_OPS_TEMPLATE_REGISTRY['E-LO-05'],
    targeting: { tier: { minTier: 3 } }, // "Tier 3+ players" (canon)
    durationRealDaysGetter: () => liveOpsTunables.elo05GlassInvestorDayDurationRealDays,
    // TD (04e-B C3, TD-LO-05-audit-pin-tier-scope; TD-171, docs_int/tech_debt_inventory.md) — Audit Pin half-life
    // × 0.7 (unconformity-tunables.ts:131, forensic.audit_pin_half_life_days): this getter is a REAL, already
    // A1-WIRED base getter — but it is GLOBAL-only (its sole production consumer,
    // `UnconformityLedgerService`'s nightly tick, never threads ANY scope) and E-LO-05's canon targeting is
    // Tier 3+ ONLY (not "everyone" — unlike E-LO-01/E-LO-02). Declaring this effect PLAYER-scoped (as C1
    // originally did) would be SILENTLY INERT (no consumer ever supplies a matching playerId — same defect
    // class as C3 FINDING 1/2 above); declaring it GLOBAL would incorrectly shift Tier-1/2 players canon
    // explicitly excludes (a population overclaim, not just a granularity loss — see file header "C3 FINDING
    // 3"). Correctly wiring this requires threading `playerId` through `UnconformityLedgerService`'s nightly
    // tick call chain — a production-service change, out of C3's minimal-risk audit scope. Routed TD, proven
    // inert by `liveops_lever_audit.spec.ts` (a PLAYER-scoped modifier on this key never shifts the plain,
    // unscoped `pinHalfLifeDays` getter ANY caller actually reads).
    //
    // TD (04e-B C3, TD-LO-05-laundering-yield; TD-171, docs_int/tech_debt_inventory.md) — Glass-district laundering
    // yield +15% (canon): grepped, confirmed: no real "laundering yield" overlay getter exists
    // (`laundering.front_shop_legit_baseline_cents` is a REVENUE BASELINE, not a yield-percentage lever —
    // reusing it would misrepresent the effect). Both magnitude getters
    // (`liveOpsTunables.elo05GlassAuditPinHalfLifeMultiplier` / `elo05GlassLaunderingYieldMultiplier`) STAY
    // registered (registry-first, R2.3) for a future chunk to wire iff a real getter lands; never fabricated
    // here (D2). effects: [] — honest, not a fig-leaf (contrast the canon-named levers above, which ARE real
    // but cannot be honestly scoped/mapped within C3's scope).
    effects: [],
    highImpact: false,
    pushConsentClass: 'MARKETING', // decisions §3 — beneficial opportunity inducement (borderline, ruled conservative)
    noticeCopy: 'Glass district hosts an investor event. Reduced scrutiny window.',
    counterPlayHintKey: 'elo05_glass_investor_day_hint',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 06 — Rival counter-operation (catalogue.md :108-117) — NOT WIRED (D2/C3), high-impact
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-LO-06', // template_id binding — see LIVE_OPS_TEMPLATE_REGISTRY['E-LO-06'] (LiveOpsTemplateId)
    name: 'Rival counter-operation',
    category: 'RIVAL_ACTION',
    templateId: LIVE_OPS_TEMPLATE_REGISTRY['E-LO-06'],
    // "Players with high recent aggression score (4+ violent ops in 7 days)" — the R2.2-safe composite form
    // (design §4/decisions §3, canon-note "R2.2-borderline"): the internal violent-ops COUNT is never surfaced,
    // only the `AggressionScoreBucket`. The "4+ ops / 7 days" refinement is the LEDGER-DERIVATION mechanism
    // BEHIND deriving the bucket (`liveOpsTunables.elo06AggressionThresholdViolentOpsCount`/
    // `elo06AggressionThresholdWindowDays`, C6 `AggressionScoreBucketService` consumer) — not a second targeting
    // filter dimension alongside the bucket.
    targeting: { aggression: 'aggressive' },
    durationRealDaysGetter: () => liveOpsTunables.elo06RivalCounterOpDurationRealDays,
    // TD (04e-B C3, TD-LO-06-retaliation-aggressiveness; TD-172, docs_int/tech_debt_inventory.md) — C3 re-grepped
    // `operational/conflict/rival/` + `operational/conflict/combat/` in full: confirmed no real
    // `rival.retaliation_aggressiveness_multiplier` (or any rival retaliation-AGGRESSIVENESS) overlay getter
    // exists anywhere. `combat-tunables.ts`'s `retaliation.*` keys are a DIFFERENT mechanic entirely (the Dead
    // Hand Cache pre-committed-response triggers/thresholds, `retaliation_mechanics.md §7.1` — a binary
    // fire/no-fire cache, not a continuous "aggressiveness" multiplier); `downstream-gate.service.ts`'s
    // `retaliation_suspended` is a boolean suspension flag, not a magnitude lever either. No real base getter
    // for "retaliation aggressiveness" exists. The magnitude getter IS registered
    // (`liveOpsTunables.elo06RetaliationAggressivenessMultiplier`, registry-first) for a future chunk to wire
    // once a real 04b retaliation-aggressiveness getter exists; never fabricated here (D2).
    effects: [],
    highImpact: true, // canon liveops_event_catalogue.md:171
    pushConsentClass: 'SERVICE', // decisions §3 — counter-pressure on the player's campaigns
    noticeCopy: 'Rivals tighten coordination after your campaigns. Expect counter-pressure.',
    counterPlayHintKey: 'elo06_rival_counter_op_hint',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 07 — Cohesion thaw alert (city-wide) (catalogue.md :119-125) — FULLY WIRED, GLOBAL scope
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-LO-07', // template_id binding — see LIVE_OPS_TEMPLATE_REGISTRY['E-LO-07'] (LiveOpsTemplateId)
    name: 'Cohesion thaw alert',
    category: 'CITYWIDE',
    templateId: LIVE_OPS_TEMPLATE_REGISTRY['E-LO-07'],
    targeting: {}, // "All players" (canon) — GLOBAL scope, no per-player differentiation
    durationRealDaysGetter: () => liveOpsTunables.elo07CohesionThawDurationRealDays,
    effects: [
      // Cohesion recovery_rate_per_day × 0.6 (-40%), GLOBAL (cohesion-tunables.ts:73-85 —
      // T.city.cohesion_recovery_rate_per_day). All districts affected uniformly — canon "all districts", not
      // per-player, hence GLOBAL scope (unlike A2's E-POL-12 DISTRICT-scoped use of the SAME base getter).
      { tunableKey: 'T.city.cohesion_recovery_rate_per_day', op: 'MULTIPLY',
        magnitudeGetter: () => liveOpsTunables.elo07CohesionRecoveryMultiplier, scope: 'GLOBAL' },
    ],
    highImpact: false,
    pushConsentClass: 'SERVICE', // decisions §3 — citywide operational tension
    noticeCopy: 'Citywide tension. Cohesion recovers slower than normal.',
    counterPlayHintKey: 'elo07_cohesion_thaw_hint',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 08 — Saltline labor surplus (catalogue.md :127-135) — NOT WIRED (D2/C3), GLOBAL scope
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-LO-08', // template_id binding — see LIVE_OPS_TEMPLATE_REGISTRY['E-LO-08'] (LiveOpsTemplateId)
    name: 'Saltline labor surplus',
    category: 'SALTLINE_WINDFALL',
    templateId: LIVE_OPS_TEMPLATE_REGISTRY['E-LO-08'],
    targeting: {}, // "All players" (canon) — GLOBAL scope
    durationRealDaysGetter: () => liveOpsTunables.elo08SaltlineSurplusDurationRealDays,
    // TD (04e-B C3, TD-LO-08-saltline-pool-recruitment-cost; TD-173, docs_int/tech_debt_inventory.md) — C3 re-grepped
    // `operational/lieutenant/` fully: NO recruitment-quest / candidate-pool implementation exists at all
    // (`docs/tech/04f_maintenance_decay_recruitment/lieutenant_recruitment_quests.md` +
    // `docs/tech/04g_ambient_world_events_templates/recruitment_quest_templates.md` are DOC-ONLY, zero code —
    // matches this project's own tracked chapter status, 04f/04g = doc seule). NOTE (naming-collision, worth
    // flagging): "Saltline" is ALSO the name of a real 04b RIVAL faction
    // (`RivalKey = 'coil'|'tarcum'|'iron_throat'|'saltline'`, `rival-ai.types.ts:24`) — a DIFFERENT concept from
    // canon's "Saltline lieutenant recruitment pool" here; neither has any real pool-size/recruitment-cost
    // lever, so the TD holds regardless of which "Saltline" canon means. Both magnitude getters
    // (`liveOpsTunables.elo08SaltlinePoolMultiplier`/`elo08SaltlineRecruitmentCostMultiplier`) STAY registered
    // (registry-first) for a future chunk to wire once a real 04a/04f recruitment-cost getter lands; never
    // fabricated here (D2).
    effects: [],
    highImpact: false,
    pushConsentClass: 'MARKETING', // decisions §3 — windfall inducement (task-named MARKETING example)
    noticeCopy: 'Saltline operators displaced. Recruitment opportunity.',
    counterPlayHintKey: 'elo08_saltline_surplus_hint',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 09 — Compression Week prep (catalogue.md :137-145) — SURFACE-ONLY (canon: no state change)
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-LO-09', // template_id binding — see LIVE_OPS_TEMPLATE_REGISTRY['E-LO-09'] (LiveOpsTemplateId)
    name: 'Compression Week prep',
    category: 'COMPRESSION_PREP',
    templateId: LIVE_OPS_TEMPLATE_REGISTRY['E-LO-09'],
    // "Players close to compression threshold (stress_accumulator ≥ 70)" — HONEST GAP (flagged, not
    // fig-leafed): no `CohortTargetingFilter` dimension represents a stress-accumulator threshold. ★ C3
    // VERIFIED (re-grepped, per the audit hand-off's own instruction to verify before TD'ing): the
    // `org_stress`/`compression_week_state` COLUMNS DO exist (`db/schema/player_progression_state.ts:23-24`,
    // both NOT NULL with defaults 0/'none') — this is NOT a missing-schema gap. But grepping the ENTIRE
    // codebase for any WRITER of either column (outside this file's own comments and the schema declaration
    // itself) returns ZERO hits — no service anywhere increments `org_stress` or transitions
    // `compression_week_state` (ch05 Compression Week is doc-only, per the project's own chapter-status
    // tracking). The columns exist but are STRUCTURALLY INERT — no producer, so they stay at their defaults
    // forever. `{}` here; the underlying producer does not exist yet — see the autonomous-exit TD marker
    // below (TD-LO-09-autonomous-exit), proven inert by `liveops_lever_audit.spec.ts` (a real DB read-back
    // after advancing significant game time shows `org_stress` unchanged at 0).
    targeting: {},
    // TD (04e-B C3, TD-LO-09-autonomous-exit; TD-175, docs_int/tech_debt_inventory.md) — "Until stress_accumulator ≥
    // 85 (typically 7-14 real-time days)" — threshold-EXIT lifecycle, not a fixed duration (design §3.2/§5:
    // E-LO-09 is the ONE entry with a NULL ends_at boundary — the reconciler sweep would compare
    // `stress_accumulator ≥ exit_threshold`, never a clock). Cannot be honestly built: `org_stress` has no
    // producer (verified above — a real column, zero writers). A future reconciler comparing against a
    // column nothing ever increments would never fire — an honest TD, not a sweep-exit that could be
    // (falsely) claimed to work. `liveOpsTunables.compressionPrepThreshold`/`compressionPrepExitThreshold`
    // STAY registered (registry-first) for that future consumer once a producer lands.
    durationRealDaysGetter: null,
    // Canon explicit: "NO state changes — pure informational." Not a fig-leaf omission (contrast E-LO-03/04/06/08
    // above, where the omission is because a lever is MISSING) — this event structurally has none.
    effects: [],
    highImpact: false,
    // SERVICE / no push (decisions §3): canon notice = NONE — `sendNotifications` (C7) skips any entry with
    // `noticeCopy === null`; `pushConsentClass` is nominal here (no notice is ever sent for this event).
    pushConsentClass: 'SERVICE',
    noticeCopy: null,
    counterPlayHintKey: 'elo09_compression_prep_hint',
  },

  // ══════════════════════════════════════════════════════════════════════════════════════════════
  // event 10 — Annual structural audit window (catalogue.md :147-155) — NOT a lever, honest-scaffolding TD
  // ══════════════════════════════════════════════════════════════════════════════════════════════
  {
    eventId: 'E-LO-10', // template_id binding — see LIVE_OPS_TEMPLATE_REGISTRY['E-LO-10'] (LiveOpsTemplateId)
    name: 'Annual structural audit window',
    category: 'AUDIT_OPPORTUNITY',
    templateId: LIVE_OPS_TEMPLATE_REGISTRY['E-LO-10'],
    targeting: { tier: { minTier: 2 } }, // "All Tier 2+ players" (canon)
    durationRealDaysGetter: () => liveOpsTunables.elo10StructuralAuditDurationRealDays,
    // TD (04e-B C3, TD-LO-10-free-audit-grant; TD-174, docs_int/tech_debt_inventory.md) — NOT a modifier effect:
    // canon grants "free Structural Audit (one-time, doesn't consume normal weekly slot)", a CAPABILITY GRANT,
    // not an ADD/MULTIPLY/SET magnitude on any overlay-composable lever. C3 re-grepped for any "audit
    // slot"/"weekly slot"/"structural audit" consumer anywhere in the codebase (`audit_slot`, `weekly_slot`,
    // `structural_audit` fragments) — confirmed ZERO hits outside this catalogue's own files: no such
    // capability/consumer exists yet (mirrors A2's E-POL-10 cost precedent — honest-scaffolding, not a
    // fabricated magnitude/op).
    effects: [],
    highImpact: false,
    pushConsentClass: 'MARKETING', // decisions §3 — windfall opportunity (task-named MARKETING example)
    noticeCopy: 'Free org-wide structural audit available this week.',
    counterPlayHintKey: 'elo10_structural_audit_hint',
  },
];

/** All 10 canonical event ids, in catalogue order — used by tests to assert full-catalogue coverage. */
export const LIVE_OPS_EVENT_IDS: readonly string[] = LIVE_OPS_EVENT_CATALOGUE.map((e) => e.eventId);

/**
 * `LIVE_OPS_EVENT_BY_ID` — a lookup index derived from `LIVE_OPS_EVENT_CATALOGUE` (mirrors
 * `POLITICAL_EVENT_BY_ID`). Single source of truth (the array above); this is purely a derived Map for O(1)
 * lookup by the future activation code (C4+), never a second hand-authored copy of the catalogue.
 */
export const LIVE_OPS_EVENT_BY_ID: ReadonlyMap<string, LiveOpsEvent> = new Map(
  LIVE_OPS_EVENT_CATALOGUE.map((event) => [event.eventId, event]),
);

/** Look up a catalogue entry by id, throwing loudly if the id is not a real member (anti-fig-leaf — a caller
 *  passing a fabricated/typo'd event id fails immediately, never silently no-ops). */
export function getLiveOpsEventById(eventId: string): LiveOpsEvent {
  const event = LIVE_OPS_EVENT_BY_ID.get(eventId);
  if (!event) {
    throw new Error(`getLiveOpsEventById: '${eventId}' is not a member of LIVE_OPS_EVENT_CATALOGUE`);
  }
  return event;
}

// ── Load-time anti-fig-leaf self-check (defense-in-depth ahead of the E2E resolve-check) ──────────────
//
// Every `LiveOpsEventEffect.tunableKey` in the catalogue above MUST be a member of
// `LIVE_OPS_VALID_EFFECT_TUNABLE_KEYS` (live-ops.tunables.ts) — the closed, independently-verified set of every
// REAL overlay key an effect is allowed to target. This throws at module-require time (server boot, or any test
// importing this module) rather than waiting for the E2E spec alone to catch a fabricated/dangling key — the
// strongest form of "no fig-leaf effect" (mirrors `political-event-catalogue.ts`'s own load-time self-check).

for (const event of LIVE_OPS_EVENT_CATALOGUE) {
  for (const effect of event.effects) {
    if (!LIVE_OPS_VALID_EFFECT_TUNABLE_KEYS.has(effect.tunableKey)) {
      throw new Error(
        `LIVE_OPS_EVENT_CATALOGUE anti-fig-leaf violation: ${event.eventId} effect targets ` +
        `'${effect.tunableKey}', which is NOT a member of LIVE_OPS_VALID_EFFECT_TUNABLE_KEYS ` +
        `(live-ops.tunables.ts) — every effect must target a REAL, already-registered overlay key.`,
      );
    }
  }
  // Anti-pattern-2: every event's `templateId` must be a REAL `LiveOpsTemplateId`. Cross-checked against
  // `LIVE_OPS_TEMPLATE_REGISTRY` (live-ops-template-id.ts) so the two files can never silently drift apart.
  const registryTemplateId = LIVE_OPS_TEMPLATE_REGISTRY[event.eventId];
  if (registryTemplateId === undefined || registryTemplateId !== event.templateId) {
    throw new Error(
      `LIVE_OPS_EVENT_CATALOGUE anti-pattern-2 violation: ${event.eventId} templateId ` +
      `('${event.templateId}') does not match LIVE_OPS_TEMPLATE_REGISTRY['${event.eventId}'] ` +
      `('${registryTemplateId}') — the two must agree (live-ops-template-id.ts is the source of truth).`,
    );
  }
}
