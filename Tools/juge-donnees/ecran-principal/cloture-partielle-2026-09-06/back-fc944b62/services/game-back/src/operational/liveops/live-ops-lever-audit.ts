// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C3 (Lever/substrate AUDIT + wire-or-TD, D2)
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §4 (per-event lever table) +
//             §11 (double-proof test strategy, "any lever C3 cannot honestly wire is TD'd with a read-back/
//             rejection assertion, never a fake consumer").
//             Catalogue: services/game-back/src/operational/liveops/live-ops-event-catalogue.ts (the per-event
//             `effects[]` this audit cross-references — see that file's header for the full C3 finding writeup).
//             — 04e-B C3 — 2026-07-06
//
// `live-ops-lever-audit.ts` — the COMMITTED, falsifiable C3 audit verdict table (D2: "the honest live-fire
// count is stated, not overclaimed"). This is the single source of truth `liveops_lever_audit.spec.ts` (the
// C3 test floor) asserts against directly — NOT a prose-only claim, a real TS data structure the anti-fig-leaf
// resolve-check can walk.
//
// Every one of the 10 events' target lever(s) was audited against A1's overlay-wired set (§seams) by DIRECT
// source read (never trusted from the plan's own "starting point" hand-off without re-verification — the
// hand-off explicitly named E-LO-01 "fully A1-WIRED, just prove live-fire"; C3's own audit found and fixed a
// genuine dead-wire defect in HALF of that claim — see LIVE_OPS_LEVER_AUDIT below, `mis_inspection_queue_cap`).
//
// HONEST FINAL SPLIT (this chunk, supersedes C1's assumed "3 fully + 1 partially + 1 surface + 5 not-yet"):
//   WIRED (3 events, 4 sub-effects, ALL genuinely observable through their REAL production consumer):
//     E-LO-01 (raid_target_temperature PLAYER + inspection_queue_cap GLOBAL, the latter a C3 scope-bug fix),
//     E-LO-02 (front_shop_legit_baseline_cents GLOBAL, also a C3 scope-bug fix), E-LO-07 (cohesion_recovery_
//     rate_per_day GLOBAL, unchanged — was already correct).
//   SURFACE_ONLY (1 event, correct-by-canon-design, NOT a gap): E-LO-09 (no state change) — but its
//     AUTONOMOUS-EXIT lifecycle sub-concern is separately TD'd below (org_stress has no producer).
//   TD (6 events, 9 sub-effects total — every one proven inert/absent, never a fabricated consumer):
//     E-LO-03 (lek-contest-rate absent; regime-pressure — a REAL mechanic exists but cannot be honestly
//     scoped/mapped, see rationale), E-LO-04 (substance-demand absent), E-LO-05 (audit-pin — a REAL,
//     already-A1-wired getter, but its Tier-3+ targeting cannot be honored without a production-service change;
//     laundering-yield absent), E-LO-06 (retaliation-aggressiveness absent), E-LO-08 (Saltline pool +
//     recruitment-cost both absent — 04f/04g are doc-only), E-LO-09's autonomous-exit (org_stress has zero
//     producers), E-LO-10 (free-audit-grant — no capability consumer exists).
//
// Anti-fig-leaf discipline (D2): a `tdMarker` is a STABLE, grep-able tag that ALSO appears verbatim as an
// inline comment at the exact catalogue site the TD applies to (`live-ops-event-catalogue.ts`) — so this table
// and the source comment can never silently drift apart (falsifiable: `liveops_lever_audit.spec.ts` greps the
// catalogue file for every `tdMarker` string and asserts it is present). The `tdMarker` STRING VALUES below stay
// exactly as-is (the grep-consistency check depends on the literal string) — the CONCRETE ledger numbers were
// allocated at C10 closeout (docs_int/tech_debt_inventory.md, head was TD-168): TD-LO-03-lek-contest/
// TD-LO-03-regime-pressure → TD-169 · TD-LO-04-substance-demand → TD-170 · TD-LO-05-audit-pin-tier-scope/
// TD-LO-05-laundering-yield → TD-171 · TD-LO-06-retaliation-aggressiveness → TD-172 ·
// TD-LO-08-saltline-pool-recruitment-cost → TD-173 · TD-LO-10-free-audit-grant → TD-174 ·
// TD-LO-09-autonomous-exit → TD-175 (see the catalogue file's own updated inline comments for the same mapping).

/** WIRED = genuinely observable through the real production consumer. TD = cannot be honestly wired (no real
 *  base getter/producer, or a real getter that cannot represent the canon effect without misrepresenting
 *  population/semantics). SURFACE_ONLY = canon explicitly specifies no state change — not a gap. */
export type LeverAuditVerdict = 'WIRED' | 'TD' | 'SURFACE_ONLY';

/** One row per canon-named sub-effect (an event may name 1-2 distinct levers). */
export interface LeverAuditEntry {
  /** The event this sub-effect belongs to ('E-LO-01'..'E-LO-10'). */
  readonly eventId: string;
  /** Stable slug identifying WHICH of the event's named sub-effects this row audits (an event with 2 canon
   *  sub-effects gets 2 rows). */
  readonly subEffect: string;
  /** The overlay-registered tunable key this sub-effect targets, iff WIRED. `null` for TD/SURFACE_ONLY (no
   *  fabricated key — anti-fig-leaf). */
  readonly tunableKey: string | null;
  /** The `effect_scope` this sub-effect fires at, iff WIRED. `null` for TD/SURFACE_ONLY. */
  readonly scope: 'GLOBAL' | 'DISTRICT' | 'PLAYER' | 'COHORT' | null;
  readonly verdict: LeverAuditVerdict;
  /** Stable grep-able TD tag (matches an inline comment at the catalogue site), or `null` for WIRED/
   *  SURFACE_ONLY rows (nothing to grep — there is no TD to mark). */
  readonly tdMarker: string | null;
  /** Human-readable rationale — WHY this verdict, cross-referenced by the catalogue's own inline comments. */
  readonly rationale: string;
}

export const LIVE_OPS_LEVER_AUDIT: readonly LeverAuditEntry[] = [
  // ── E-LO-01 — Citywide crackdown (WIRED, 2 sub-effects) ──────────────────────────────────────────
  {
    eventId: 'E-LO-01',
    subEffect: 'bpd_raid_temperature',
    tunableKey: 'T.city.raid_target_temperature',
    scope: 'PLAYER',
    verdict: 'WIRED',
    tdMarker: null,
    rationale: 'Already A1-WIRED + genuinely PLAYER-scoped: police_memory.service.ts threads ctx.playerId '
      + 'via raidTargetTemperatureFor({ playerId }) — confirmed by direct source read, no C3 change needed.',
  },
  {
    eventId: 'E-LO-01',
    subEffect: 'mis_inspection_queue_cap',
    tunableKey: 'T.city.inspection_queue_cap',
    scope: 'GLOBAL',
    verdict: 'WIRED',
    tdMarker: null,
    rationale: 'C3 FIX: was declared PLAYER-scoped (C1) but InspectionService.effectiveQueueCapFor (the sole '
      + 'production consumer) constructs its scope with districtId ONLY, never playerId — a PLAYER row would '
      + 'be silently inert. Corrected to GLOBAL: zero semantic loss (B\'s E-LO-01 static targeting is {} = '
      + 'every player already; GLOBAL rows match unconditionally).',
  },
  // ── E-LO-02 — Tidewater dock strike (WIRED, 1 sub-effect) ────────────────────────────────────────
  {
    eventId: 'E-LO-02',
    subEffect: 'front_shop_baseline',
    tunableKey: 'laundering.front_shop_legit_baseline_cents',
    scope: 'GLOBAL',
    verdict: 'WIRED',
    tdMarker: null,
    rationale: 'C3 FIX: was declared PLAYER-scoped (C1) but launderingTunables.frontShopLegitBaselineCents() '
      + 'calls EffectOverlayStore.applyModifiers(key, base) with ZERO scope argument for every caller (no '
      + 'scoped variant exists) — only GLOBAL rows could ever match. Corrected to GLOBAL: zero semantic loss '
      + '(E-LO-02 targeting is {} = every player). District-profile GRANULARITY (Tidewater-only) is lost — '
      + 'tracked as a separate TD, not blocking the wire.',
  },
  // ── E-LO-03 — Coil aggressive expansion campaign (TD, 2 sub-effects) ─────────────────────────────
  {
    eventId: 'E-LO-03',
    subEffect: 'lek_contest_rate',
    tunableKey: null,
    scope: null,
    verdict: 'TD',
    tdMarker: 'TD-LO-03-lek-contest',
    rationale: 'No real "lek CONTEST-RATE" getter exists. deal_lek (System 11) models contest/control-state '
      + 'but its only contest-shaped tunable (contest_threshold_presence_ratio) is a THRESHOLD not a rate, and '
      + 'the system has no per-rival-faction axis — not Coil-specific, not a rate. No fabricated mapping.',
  },
  {
    eventId: 'E-LO-03',
    subEffect: 'regime_pressure',
    tunableKey: null,
    scope: null,
    verdict: 'TD',
    tdMarker: 'TD-LO-03-regime-pressure',
    rationale: 'A REAL regime_pressure mechanic EXISTS (rival-ai.tunables.ts regimePressureDecayRatePeacefulPerDay '
      + '+ regimePressureWeightTerritory|Casualty|Revenue, RegimeSwitchingService — genuinely consumed, not '
      + 'absent). Declined to wire for 2 reasons: (a) rival-key-agnostic — no per-rival getter isolates "Coil '
      + 'only" (wiring the shared getter would shift every rival, contradicting canon\'s Coil-only scoping); '
      + '(b) canon\'s "accumulates x0.7" reads as an ACCRUAL change but the only multipliable getter is the '
      + 'DECAY rate — mapping one onto the other is an unverified semantic reinterpretation, not a confirmed '
      + 'match. This is a genuine mechanic found (not "absent" as C1 originally believed) but honestly declined.',
  },
  // ── E-LO-04 — Substance market anomaly (TD, 1 sub-effect) ────────────────────────────────────────
  {
    eventId: 'E-LO-04',
    subEffect: 'substance_demand',
    tunableKey: null,
    scope: null,
    verdict: 'TD',
    tdMarker: 'TD-LO-04-substance-demand',
    rationale: 'market.lane_c_lo (the only market getter A1 wired) is a LANE-COLLAPSE price threshold, '
      + 'semantically distinct from "substance demand pattern". Re-grepped operational/hush/ (a LOYALTY model, '
      + 'no demand lever) + operational/substance/ + operational/precursors/ — confirmed no substance-demand '
      + 'base getter exists anywhere.',
  },
  // ── E-LO-05 — Glass district investor day (TD, 2 sub-effects — downgraded from C1 "partially wired") ─
  {
    eventId: 'E-LO-05',
    subEffect: 'audit_pin_half_life',
    tunableKey: null,
    scope: null,
    verdict: 'TD',
    tdMarker: 'TD-LO-05-audit-pin-tier-scope',
    rationale: 'forensic.audit_pin_half_life_days IS a real, already-A1-WIRED base getter — but it is '
      + 'GLOBAL-only (UnconformityLedgerService\'s nightly tick never threads any scope) and E-LO-05 targets '
      + 'Tier 3+ ONLY (not everyone, unlike E-LO-01/02). A PLAYER declaration would be silently inert (no '
      + 'consumer ever supplies a matching playerId); a GLOBAL declaration would incorrectly shift Tier-1/2 '
      + 'players canon explicitly excludes (a population overclaim, not a mere granularity loss). Correctly '
      + 'wiring requires threading playerId through the shared nightly-tick consumer — out of C3\'s minimal-'
      + 'risk audit scope. Downgrades E-LO-05 from C1\'s "partially wired" to fully TD.',
  },
  {
    eventId: 'E-LO-05',
    subEffect: 'laundering_yield',
    tunableKey: null,
    scope: null,
    verdict: 'TD',
    tdMarker: 'TD-LO-05-laundering-yield',
    rationale: 'No real "laundering yield" overlay getter exists (front_shop_legit_baseline_cents is a REVENUE '
      + 'BASELINE, not a yield-percentage lever — reusing it would misrepresent the effect).',
  },
  // ── E-LO-06 — Rival counter-operation (TD, 1 sub-effect) ─────────────────────────────────────────
  {
    eventId: 'E-LO-06',
    subEffect: 'retaliation_aggressiveness',
    tunableKey: null,
    scope: null,
    verdict: 'TD',
    tdMarker: 'TD-LO-06-retaliation-aggressiveness',
    rationale: 'Re-grepped operational/conflict/rival/ + operational/conflict/combat/ in full: no real '
      + 'rival.retaliation_aggressiveness_multiplier (or any rival retaliation-AGGRESSIVENESS) overlay getter '
      + 'exists. combat-tunables.ts retaliation.* keys are the Dead Hand Cache (a binary pre-committed-response '
      + 'trigger, not a continuous aggressiveness multiplier); downstream-gate\'s retaliation_suspended is a '
      + 'boolean flag, not a magnitude lever.',
  },
  // ── E-LO-07 — Cohesion thaw alert (WIRED, 1 sub-effect) ──────────────────────────────────────────
  {
    eventId: 'E-LO-07',
    subEffect: 'cohesion_recovery_rate',
    tunableKey: 'T.city.cohesion_recovery_rate_per_day',
    scope: 'GLOBAL',
    verdict: 'WIRED',
    tdMarker: null,
    rationale: 'Already A1-WIRED, correctly declared GLOBAL (canon: "all districts", no per-player '
      + 'differentiation) — GLOBAL matches unconditionally regardless of the districtId scope '
      + 'cohesion.service.ts threads. No C3 change needed.',
  },
  // ── E-LO-08 — Saltline labor surplus (TD, 2 sub-effects) ─────────────────────────────────────────
  {
    eventId: 'E-LO-08',
    subEffect: 'saltline_pool_size',
    tunableKey: null,
    scope: null,
    verdict: 'TD',
    tdMarker: 'TD-LO-08-saltline-pool-recruitment-cost',
    rationale: 'Re-grepped operational/lieutenant/ fully: NO recruitment-quest/candidate-pool implementation '
      + 'exists (04f/04g canon docs are doc-only, zero code). Naming-collision note: "Saltline" is ALSO a real '
      + '04b RIVAL faction (RivalKey), a DIFFERENT concept — neither has a pool-size lever, so the TD holds '
      + 'either way.',
  },
  {
    eventId: 'E-LO-08',
    subEffect: 'saltline_recruitment_cost',
    tunableKey: null,
    scope: null,
    verdict: 'TD',
    tdMarker: 'TD-LO-08-saltline-pool-recruitment-cost',
    rationale: 'Same TD as saltline_pool_size (one shared marker, canon lists both as one Saltline-surplus '
      + 'effect pair) — no recruitment-cost lever exists anywhere either.',
  },
  // ── E-LO-09 — Compression Week prep (SURFACE_ONLY by design + 1 TD sub-concern) ──────────────────
  {
    eventId: 'E-LO-09',
    subEffect: 'surface_only_no_state_change',
    tunableKey: null,
    scope: null,
    verdict: 'SURFACE_ONLY',
    tdMarker: null,
    rationale: 'Canon explicit: "NO state changes — pure informational". This is NOT a gap — the event '
      + 'structurally has no lever by design, unlike E-LO-03/04/06/08/10 where the omission is because a '
      + 'lever is MISSING.',
  },
  {
    eventId: 'E-LO-09',
    subEffect: 'autonomous_exit',
    tunableKey: null,
    scope: null,
    verdict: 'TD',
    tdMarker: 'TD-LO-09-autonomous-exit',
    rationale: 'org_stress / compression_week_state COLUMNS exist (player_progression_state.ts:23-24, real '
      + 'schema, not missing) but grepping the entire codebase for any WRITER of either column returns ZERO '
      + 'hits outside this file\'s own comments — no producer exists (ch05 Compression Week is doc-only). '
      + 'Verified by a real DB read-back after advancing game time (liveops_lever_audit.spec.ts): org_stress '
      + 'stays at its default 0.',
  },
  // ── E-LO-10 — Annual structural audit window (TD, 1 sub-effect) ─────────────────────────────────
  {
    eventId: 'E-LO-10',
    subEffect: 'free_audit_grant',
    tunableKey: null,
    scope: null,
    verdict: 'TD',
    tdMarker: 'TD-LO-10-free-audit-grant',
    rationale: 'Not a modifier effect at all — a CAPABILITY GRANT (free Structural Audit, one-time). '
      + 'Re-grepped for any "audit slot"/"weekly slot"/"structural audit" consumer anywhere — confirmed zero '
      + 'hits outside this catalogue\'s own files. Honest-scaffolding TD, mirrors A2\'s E-POL-10 cost precedent.',
  },
];

/** Per-event rollup verdict (an event's OVERALL status — WIRED iff it has >=1 WIRED sub-effect). */
export interface EventAuditSummary {
  readonly eventId: string;
  readonly verdict: LeverAuditVerdict;
}

/** The 10 events' rollup verdicts, INDEPENDENTLY hand-authored here (not derived from LIVE_OPS_LEVER_AUDIT by
 *  code) so a spec can cross-check the two never silently drift apart. */
export const LIVE_OPS_EVENT_VERDICT: readonly EventAuditSummary[] = [
  { eventId: 'E-LO-01', verdict: 'WIRED' },
  { eventId: 'E-LO-02', verdict: 'WIRED' },
  { eventId: 'E-LO-03', verdict: 'TD' },
  { eventId: 'E-LO-04', verdict: 'TD' },
  { eventId: 'E-LO-05', verdict: 'TD' },
  { eventId: 'E-LO-06', verdict: 'TD' },
  { eventId: 'E-LO-07', verdict: 'WIRED' },
  { eventId: 'E-LO-08', verdict: 'TD' },
  { eventId: 'E-LO-09', verdict: 'SURFACE_ONLY' },
  { eventId: 'E-LO-10', verdict: 'TD' },
];

/** The honest, falsifiable live-fire count (D2 — "stated, not overclaimed"). 3 WIRED + 1 SURFACE_ONLY
 *  (correct, not a gap) + 6 TD = 10. */
export const LIVE_OPS_WIRED_EVENT_COUNT = 3;
export const LIVE_OPS_TD_EVENT_COUNT = 6;
export const LIVE_OPS_SURFACE_ONLY_EVENT_COUNT = 1;
