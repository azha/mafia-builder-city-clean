// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C1 (10-event static catalogue)
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §3.1 (LiveOpsEvent shape),
//             §3.3 (CohortTargetingFilter), §3.4 (cohort-key convention), §3.8 (NEW enums).
//             Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md (10 events, §Glossary
//             LiveOpsEventCategory/AggressionScoreBucket/HighImpactFlag) + gdd/04e_political_events_and_liveops.md
//             §2.3 (the 10 events) + §2.6 (tunables).
//             Mirror: services/game-back/src/operational/political/political.types.ts (04e-A2 C1 form).
//             — 04e-B C1 — 2026-07-06
//
// Types for the 10-event static `LiveOpsEvent` catalogue (`live-ops-event-catalogue.ts`). Pure data shapes — no
// logic here. The catalogue itself is hard-coded config (design §3.1: "TS, not a DB table in B"); the REAL
// targeting engine (`evaluateCohortTargeting`, C2), lifecycle (`activateLiveOpsEvent`/`deactivateLiveOpsEvent`,
// C4), cadence (C5), aggression ledger (C6), and notifications (C7) land in later chunks, consuming this shape.
//
// R2.3 (registry-first): `LiveOpsEventEffect.magnitudeGetter` and `LiveOpsEvent.durationRealDaysGetter` are always
// a reference to an ALREADY-REGISTERED getter (`liveOpsTunables.*`, `live-ops.tunables.ts`, this chunk) — NEVER an
// inline numeric literal.
//
// DIFFERENCE FROM PoliticalEvent (deliberate, not an oversight): `PoliticalEvent` carries a `trigger`
// (`PoliticalEventTrigger`, descriptive-only — A2's calendar tick auto-evaluates it). `LiveOpsEvent` carries NO
// such field — 04e-B builds no autonomous trigger evaluator; every one of the 10 events activates exclusively via % allowed-mention: false-positive substring match ("exclusively", adverb, not "exclusive" cosmetic/FOMO framing)
// the C8 thin ops-BO `force-trigger` endpoint (design §4 "every event is still live-fire-proven ... via the BO
// force-trigger", decisions §1 D5). Conversely `PoliticalEvent` carries no per-player `targeting` field (A2 never
// exercised PLAYER/COHORT scope) — `LiveOpsEvent.targeting: CohortTargetingFilter` is B's own addition (D1, the
// first real per-player A1 consumer).
//
// `effectScope`/`effectModifierOp` are REUSED from the shared A1 `effect_modifier` schema (never re-declared by
// hand — mirrors political.types.ts's own narrowing of the SAME two pgEnums).

import type { effectScope, effectModifierOp } from '../../db/schema/effect_modifier';
import type { LiveOpsTemplateId } from './live-ops-template-id';

/** The `effect_scope` pgEnum member set, narrowed from the schema (never re-declared by hand). REUSE — same enum
 *  A1/A2 already share (`effect_modifier.ts`); B is the first real PLAYER-scope consumer (D1). */
export type LiveOpsEffectScope = (typeof effectScope.enumValues)[number];

/** The `effect_modifier_op` pgEnum member set, narrowed from the schema (never re-declared by hand). REUSE. */
export type LiveOpsEffectOp = (typeof effectModifierOp.enumValues)[number];

/**
 * `LiveOpsEventCategory` — the canon 7-member enum (`liveops_event_catalogue.md §Glossary`, gdd/16 backport):
 * `CITYWIDE | RIVAL_ACTION | MARKET_SHIFT | GLASS_EVENT | COMPRESSION_PREP | SALTLINE_WINDFALL |
 * AUDIT_OPPORTUNITY`. Plain TS union (NOT narrowed from a DB pgEnum) — unlike `political_event_category`, the
 * `live_ops_event_category` Postgres enum does not exist yet (lands at C2, migration 0114, AFTER this chunk); C2's
 * enum values MUST match this union verbatim (R9.3, same-commit reconcile at C2).
 */
export type LiveOpsEventCategory =
  | 'CITYWIDE'          // E-LO-01, E-LO-07
  | 'RIVAL_ACTION'      // E-LO-03, E-LO-06
  | 'MARKET_SHIFT'      // E-LO-02, E-LO-04
  | 'GLASS_EVENT'       // E-LO-05
  | 'COMPRESSION_PREP'  // E-LO-09
  | 'SALTLINE_WINDFALL' // E-LO-08
  | 'AUDIT_OPPORTUNITY'; // E-LO-10

/**
 * `RegionId` — soft-ref string to the `region` table (04d-C, `operational/meta_market/region.service.ts` /
 * `db/schema` — `player.region_id: text`, PG-FK-enforced, no TS enum anywhere in the codebase). Aliased here
 * (not re-declared as a literal union) because no dedicated `RegionId` type exists yet outside GDD prose
 * (`gdd/15:6105`) — this alias is the honest reflection of the ACTUAL runtime representation, not an invented
 * enum of region names.
 */
export type RegionId = string;

/**
 * `TierPredicate` — a minimum-tier filter (`player.tier: integer` NOT NULL default 1, `db/schema/player.ts`; no
 * TS tier-name enum exists — tier is a plain integer column). E-LO-05 ("Tier 3+") → `{ minTier: 3 }`; E-LO-10
 * ("Tier 2+") → `{ minTier: 2 }`.
 */
export interface TierPredicate {
  readonly minTier: number;
}

/**
 * `ActivityWindow` — a recent-activity filter (design §3.3 composite dimension). Forward-declared for shape
 * completeness (`CohortTargetingFilter.recentActivity`) — NONE of the 10 launch events actually need this
 * dimension today (E-LO-06's "4+ violent ops in 7 days" is captured by `AggressionScoreBucket` instead, design
 * §4/decisions §3 — the R2.2-safe composite form, not a raw activity-window count). Unused-but-typed, exactly
 * like `PoliticalEvent`'s own precedent of carrying fields ahead of their first consumer.
 */
export interface ActivityWindow {
  readonly withinDays: number;
}

/**
 * `AggressionScoreBucket` — the D6 composite (`peaceful | active | aggressive | violent_spree`,
 * `liveops_event_catalogue.md §Glossary`). R2.2: the raw aggression scalar is FORBIDDEN as a player/BO-facing
 * value (`:117` "Note R2.2-borderline") — only the bucket ever escapes. TYPE ONLY at C1 (needed to type
 * `CohortTargetingFilter.aggression` for E-LO-06's targeting field) — the ledger-backed derivation service
 * (`AggressionScoreBucketService`, `live_ops_aggression_ledger`) lands at C6 (D6, decisions §1). Mirrors the A1-era
 * precedent of `politicalEventsTunables.epol11BpdMemoryAggregateTrigger` registering a composite key well before
 * its resolver was consumed.
 */
export type AggressionScoreBucket = 'peaceful' | 'active' | 'aggressive' | 'violent_spree';

/**
 * `PushConsentClass` — D4: `SERVICE` (operational-pressure state change, contract/legitimate-interest, always
 * sendable subject to cap+cooldown) vs `MARKETING` (beneficial windfall/opportunity inducement, gated by
 * `marketing_optin`, Art.6(1)(a) consent). Per-event classification RULED verbatim in decisions §3 — never a
 * coder guess (decisions §3, closing note: "a change to it is a controller decision, not a coder guess").
 */
export type PushConsentClass = 'SERVICE' | 'MARKETING';

/**
 * `CohortTargetingFilter` (design §3.3, D1) — the STATIC predicate baked into each catalogue entry (no runtime
 * override surface exists in B — no composer, D5/§8: B's ops-BO is force-trigger/deactivate-early only, no
 * per-activation cohort customization). `evaluateCohortTargeting(eventId, filter)` (C2) resolves this to a
 * `PlayerId[]` at activation via a single batched query.
 *
 * HONEST GAP (flagged, not fig-leafed): 2 of the 10 events' canon targeting criteria do not fit ANY of these 4
 * dimensions — E-LO-03 ("active Coil rivalry") and E-LO-09 ("stress_accumulator ≥ threshold"). Both are encoded
 * as `{}` (no additional composite constraint) with an inline comment on the catalogue entry; C2/C3 either extend
 * this composite or route an explicit TD — never silently misrepresented via a loosely-fitting existing field.
 */
export interface CohortTargetingFilter {
  readonly tier?: TierPredicate;
  readonly region?: readonly RegionId[];
  readonly recentActivity?: ActivityWindow;
  readonly aggression?: AggressionScoreBucket;
}

/**
 * One effect a `LiveOpsEvent` applies while active — the `EventEffect`-equivalent for live-ops (mirrors
 * `political.types.ts`'s `EventEffect` field-for-field). `magnitudeGetter` is ALWAYS a reference to a registered
 * `liveOpsTunables.*` getter (R2.3) — never an inline number.
 */
export interface LiveOpsEventEffect {
  /** The overlay-registered tunable key this effect targets — one of the 8 REUSE A1 substrate getters
   *  (`live-ops.tunables.ts` header note) or a C3-newly-wired key. Never fabricated (anti-fig-leaf, C1 test
   *  floor's resolve-check). */
  readonly tunableKey: string;
  /** ADD | MULTIPLY | SET (effect_modifier_op, EffectOverlayStore's fixed compose order). */
  readonly op: LiveOpsEffectOp;
  /** The compose operand getter — ALWAYS a registered tunable, never an inline literal (R2.3). */
  readonly magnitudeGetter: () => number | string;
  /** GLOBAL | DISTRICT | PLAYER | COHORT (effect_scope) — PLAYER for 8 of the 10 events (D1, the cohort-resolved
   *  per-player targets); GLOBAL for E-LO-07/E-LO-08 (canon "all players", no per-player differentiation). */
  readonly scope: LiveOpsEffectScope;
}

/**
 * `NotifiableEvent` (04e-C C5, DD-C5) — the MINIMAL shape `LiveOpsNotificationService.sendNotifications`
 * actually reads (`eventId` for the cooldown_key, `noticeCopy` for the E-LO-09 "no notice" skip,
 * `pushConsentClass` for the (a) consent gate) — narrower than the full `LiveOpsEvent` catalogue-entry
 * interface below (which also carries `category`/`templateId`/`targeting`/`durationRealDaysGetter`/
 * `effects`/`highImpact`/`counterPlayHintKey`, none of which that method reads). Every real
 * `LiveOpsEvent` catalogue entry already structurally satisfies this (TS structural typing — zero call-
 * site change for the 10-event catalogue's own `sendNotifications` callers, `live-ops-event.service.ts`).
 *
 * Extracted so a genuinely non-catalogue notice (the composer's own ad-hoc `push/send`, which is NOT a
 * scheduled/cadence-gated/effect-applying `LiveOpsEvent`) can be passed WITHOUT fabricating fake
 * catalogue fields (`category`, `targeting`, `durationRealDaysGetter`, ...) or an unsafe type-escape
 * cast on a bogus `templateId` — the WIP's fabricated-event shape this decision replaces (decisions
 * §2.5 DD-C5).
 */
export interface NotifiableEvent {
  readonly eventId: string;
  readonly noticeCopy: string | null;
  readonly pushConsentClass: PushConsentClass;
}

/**
 * One static `LiveOpsEvent` catalogue entry — the canon `LiveOpsEvent` composite
 * (`liveops_event_catalogue.md §Glossary` "Static config + dynamic composer entries"; B ships the 10 static
 * launch entries only — composer-created entries are 04e-C). Hard-coded, no DB table (design §3.1).
 */
export interface LiveOpsEvent {
  /** Soft-ref id, e.g. 'E-LO-01' — matches `live_ops_event_active.event_id` (C2, text soft-ref, no DB FK). */
  readonly eventId: string;
  /** Player-facing name (canon `gdd/04e §2.3` event header). */
  readonly name: string;
  /** One of the 7 canonical categories (design §3.1 mapping, canon `liveops_event_catalogue.md:298`). */
  readonly category: LiveOpsEventCategory;
  /** Anti-pattern-2 binding — the 04g structural template this event re-skins (`live-ops-template-id.ts`). */
  readonly templateId: LiveOpsTemplateId;
  /** The STATIC cohort predicate this event targets at activation (design §3.3, D1). `{}` = all players (no
   *  additional filter beyond "every player" — E-LO-02/07/08's canon "all players" targeting). */
  readonly targeting: CohortTargetingFilter;
  /** Duration getter (REAL-TIME days, DD-B3 — NOT in-game days like `PoliticalEvent.durationDaysGetter`).
   *  `null` = E-LO-09 ONLY (threshold-exit lifecycle: `stress_accumulator ≥ exit_threshold` reconciles it, not a
   *  clock — design §3.2/§5). */
  readonly durationRealDaysGetter: (() => number) | null;
  /** The modifiers this event applies while active — REAL registered tunable keys only, or EMPTY when the
   *  canon-named lever has no real base getter yet (honest, not fig-leafed — flagged per-entry for the C3 audit,
   *  D2). Always empty for E-LO-09 (canon: "NO state change — hint UI only"). */
  readonly effects: readonly LiveOpsEventEffect[];
  /** Cadence rule input (C5): counts against `liveops.max_high_impact_per_week`. TRUE for E-LO-01/04/06 ONLY
   *  (canon `liveops_event_catalogue.md:171` cadence rules — "high-impact = events blocking content like
   *  E-LO-01 + E-LO-04 + E-LO-06"). */
  readonly highImpact: boolean;
  /** SERVICE | MARKETING (D4) — RULED verbatim, decisions §3. */
  readonly pushConsentClass: PushConsentClass;
  /** Push notice copy (canon `gdd/04e §2.3`, verbatim). `null` for E-LO-09 ONLY (canon: "None — it's just hint
   *  copy, no push notification"); C7's `sendNotifications` skips any entry with `noticeCopy === null`. */
  readonly noticeCopy: string | null;
  /** Stable counter-play-hint lookup key (present for all 10) — the COPY behind this key is authored
   *  (content-epol-hint-copy lot, 2026-07-19 — RESOLVES TD-176): `counter-play-hint-copy.ts`'s
   *  `COUNTER_PLAY_HINT_COPY` dictionary maps every one of the 10 keys to real, canon-grounded copy. This
   *  field stays plain `string` (the stable lookup id) — the dictionary lookup itself lives in
   *  `live-ops-read.service.ts`'s `resolveCounterPlayHintCopy`. */
  readonly counterPlayHintKey: string;
}
