// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C9 (R2.2 player surface)
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §6 ("Player surfaces
//             (R2.2) — qualitative, no timer") + §9 (brand invariants, cross-ref).
//             Canon: docs/tech/04e_political_events_and_liveops/liveops_event_catalogue.md :181
//             ("Event banner in-app: qualitative active event indicator. No countdown timer (FOMO % allowed-mention: canon Forbidden-pattern documentation, not narrative usage
//             interdit).") + :340 ("only qualitative impact visible client") + §Glossary
//             ("AggressionScoreBucket ... exposed only as bucket" — the SAME P5 discipline this file
//             applies to `high_impact`/effect magnitude).
//             R2.2 precedent (grep-zero pattern REUSED): operational/political/political-event-read.
//             service.ts (04e-A2 C8 — the closest sibling: qualitative bands, zero raw scalar, zero
//             `ends_at`, friendly-copy explicitly deferred to a content/Unity pass, never fabricated).
//             P5 BO-inversion cross-ref: live-ops-admin.controller.ts's own C8 header ("the player-facing
//             live-ops surface (C9) will NEVER return a raw effect magnitude, started_at/ends_at, or a
//             raw cohort_key — qualitative bands + effect direction ONLY").
//             — 04e-B C9 — 2026-07-06
//             — 04g-D C4b — 2026-07-17 (★ ONE of the 5 allowlisted 04e files, plan §0.9/design §3.6-B: the
//             1 `getLiveOpsEventById` call-site (`toPlayerEventView`) swaps to `resolveLiveOpsEventById`
//             — catalogue-first, then the mounted-reskin store — so an activated mounted reskin's
//             `effect_modifier` rows resolve to a real player-facing view too, byte-identical for the 10
//             static catalogue ids. `deriveSeverityBand`'s parameter type is ANNOTATION-widened
//             `LiveOpsEvent` → `ResolvedLiveOpsEvent` (it reads only `event.highImpact`, a shared runtime
//             field — a mounted event's `highImpact` is FORCED `true`, DD-RSK5, so it always derives
//             `'major'`). ZERO other behavior change.)
//
// `LiveOpsEventReadService` — the R2.2 player-facing read model for the 10-event live-ops catalogue: for
// the REQUESTING player, which catalogue events are CURRENTLY ACTIVE and affecting them, rendered as
// qualitative bands only. `live-ops.controller.ts`'s `GET /v1/liveops/active` is this service's ONLY
// consumer.
//
// R2.2 (grep-zero, LOAD-BEARING — this is the whole point of C9): this service NEVER returns a raw
// effect magnitude, NEVER returns `started_at`/`ends_at` (or any activation/expiry timestamp), NEVER
// returns a countdown/duration value, NEVER returns the raw `cohort_key`, and NEVER returns the raw % allowed-mention: design comment (R2.2 grep-zero rule statement, not a countdown implementation)
// `high_impact` boolean directly — only the DERIVED `severity` band (see `deriveSeverityBand` below).
// Falsifiable via `liveops_player_surface.spec.ts`'s recursive key-scan (mirrors
// `political_player_surface.spec.ts`'s own `collectAllKeys`/`grepZeroViolations`).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// HOW "the player's currently-active events" IS DETERMINED WITHOUT A MEMBERSHIP TABLE (D1)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// D1 rules "predicate cohorts, not persisted membership" — `evaluateCohortTargeting` resolves a
// `PlayerId[]` ONLY at activation time (cohort-targeting.service.ts), and that resolved list is never
// itself persisted (not even the BO force-trigger response retains it beyond the HTTP call). So THIS
// service cannot re-query "was this player in event X's cohort" from a membership row — none exists, by
// design.
//
// What IS persisted, durably, is the ACTUAL APPLIED RESULT of that resolution: the PLAYER-scoped
// `effect_modifier` rows an activation writes (`scope_type='PLAYER', scope_ref=player_id`,
// `live_ops_active_event_id` FK — DD-B2), plus any `scope_type='GLOBAL'` rows (which match every player
// unconditionally, `EffectOverlayStore.scopeMatches`, `effect-overlay-store.ts:242-251`). This service
// therefore determines "is THIS event currently active FOR THIS PLAYER" by joining
// `live_ops_event_active` (status='ACTIVE') to `effect_modifier` on `live_ops_active_event_id`, keeping
// only rows that are GLOBAL (match everyone) or PLAYER-scoped to THIS player — the same ground-truth
// join `live-ops-admin.controller.ts`'s own `getActive` uses for its (raw, BO-only) listing, narrowed by
// one extra per-player predicate. This is provably correct for the engine's REAL applied state (not a
// guess, not a re-derivation of the static catalogue's `targeting` field, which may have been overridden
// by an operator `filterOverride` at BO force-trigger time anyway — design §3.3/§C4).
//
// HONEST GAP (stated, not fig-leafed): an event whose catalogue `effects` is `[]` (E-LO-09, surface-only
// by canon design, and every C3-TD'd event — E-LO-03/04/05/06/08/10) writes ZERO `effect_modifier` rows
// on activation (`live-ops-event.service.ts`'s own "skip the apply entirely rather than an empty batch"
// note) — so this join can never surface those events to ANY player, even while their
// `live_ops_event_active` row is genuinely ACTIVE. This is the honest consequence of D2 (no fig-leaf
// consumer) + D1 (no persisted membership) intersecting: there is no ground-truth signal this service
// could read to attribute a zero-effect activation to a specific player without either (a) persisting
// membership (which D1 explicitly rules out) or (b) re-running the cohort predicate live per read
// request (a correctness-vs-cost tradeoff out of this chunk's scope). Flagged for a future chunk/TD, not
// silently misrepresented as "this player is unaffected" when the truth is "this service cannot tell."
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Determinism: NO `Math.random()`, NO `Date.now()`. Every branch is a pure function of persisted DB state
// (`live_ops_event_active`/`effect_modifier` rows) + the static catalogue's own registered getters.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { liveOpsEventActive } from '../../db/schema/live_ops_event_active';
import { effectModifier } from '../../db/schema/effect_modifier';
import { resolveLiveOpsEventById, type ResolvedLiveOpsEvent } from './live-ops-mounted-event.store';
import { COUNTER_PLAY_HINT_COPY } from './counter-play-hint-copy';
import type { LiveOpsEffectOp, LiveOpsEffectScope, LiveOpsEventCategory } from './live-ops.types';

/**
 * `LiveOpsEventSeverityBand` — the C9 per-event qualitative severity (design §6 "qualitative bands
 * only", task-cited style "silent/minor/major/dramatic"). A genuine, narrow, coder-chosen convention
 * (the SAME class of choice as `political-event-read.service.ts`'s own `deriveClimateBand` — derived
 * ONLY from REAL, already-observed catalogue state, never `Math.random`/a fabricated number):
 * `'major'` iff the catalogue entry's `highImpact` flag is set (canon `liveops_event_catalogue.md:171`
 * — the 3 events that "block content" — E-LO-01/04/06); `'minor'` otherwise. [PROV-Y26Q2] — this exact
 * 2-band split is a C9 engineering convention (not a canon-cited formula); flagged for
 * reviewer/design confirmation, a calibration TD if a future content pass wants a finer split (e.g.
 * folding `category` in — none of the 3 currently-WIRED events, E-LO-01/02/07, need that finer split to
 * resolve unambiguously today).
 */
export type LiveOpsEventSeverityBand = 'minor' | 'major';

function deriveSeverityBand(event: ResolvedLiveOpsEvent): LiveOpsEventSeverityBand {
  return event.highImpact ? 'major' : 'minor';
}

/**
 * `LiveOpsEffectDirection` — mechanical direction only, mirrors `political-event-read.service.ts`'s
 * `deriveEffectDirection` verbatim (SAME op semantics — `effect_modifier_op` is a REUSED shared enum,
 * live-ops.types.ts header note). Deliberately NOT re-imported from the political module (this codebase's
 * established convention of per-domain-module local duplication for small pure functions over the SAME
 * shared enum shape — mirrors `cohort-targeting.service.ts`'s own `MS_PER_REAL_DAY` "each file defines it
 * locally" precedent) — this keeps `operational/liveops/` structurally independent of
 * `operational/political/`, per the A/B/C module-boundary note (decisions §8).
 *
 * Anti-fabrication (political's own explicit precedent, carried forward verbatim): NO invented
 * per-lever "friendly" flavour text (e.g. a fabricated "enforcement up"/"supply tighter" string) — that
 * is a Unity/content-pass concern (D6, "all Unity = TD"). This service exposes the REAL, verifiable
 * `tunableKey` identifier + its mechanical direction, never fabricated copy.
 */
export type LiveOpsEffectDirection = 'increases' | 'decreases' | 'adjusts';

function deriveLiveOpsEffectDirection(op: LiveOpsEffectOp, rawMagnitude: number | string): LiveOpsEffectDirection {
  const magnitude = Number(rawMagnitude);
  switch (op) {
    case 'ADD':
      return magnitude > 0 ? 'increases' : magnitude < 0 ? 'decreases' : 'adjusts';
    case 'MULTIPLY':
      return magnitude > 1 ? 'increases' : magnitude < 1 ? 'decreases' : 'adjusts';
    case 'SET':
      return 'adjusts';
  }
}

/**
 * `resolveCounterPlayHintCopy` — direct lookup into the authored `COUNTER_PLAY_HINT_COPY` dictionary
 * (`counter-play-hint-copy.ts`, content-epol-hint-copy lot, 2026-07-19 — RESOLVES TD-176). The D6
 * anti-fabrication doctrine this function used to satisfy with a uniform `[PROV-Y26Q2]` placeholder is
 * now SATISFIED by the authored dictionary itself: every one of the 10 events' `counterPlayHintKey`
 * resolves to REAL, canon-grounded copy (design doc §3.2/§4.2), never a fabricated per-key sentence.
 * Throws loudly on an unknown key — mirrors `getLiveOpsEventById`'s anti-fig-leaf throw
 * (`live-ops-event-catalogue.ts:410-416`) — never a placeholder, never a silent fallback.
 */
function resolveCounterPlayHintCopy(hintKey: string): string {
  const copy = (COUNTER_PLAY_HINT_COPY as Record<string, string>)[hintKey];
  if (copy === undefined) {
    throw new Error(
      `resolveCounterPlayHintCopy: '${hintKey}' is not a member of COUNTER_PLAY_HINT_COPY (counter-play-hint-copy.ts)`,
    );
  }
  return copy;
}

/** One effect's qualitative reading, player-facing (mirrors `QualitativeEffectView`, political sibling). */
export interface LiveOpsEffectView {
  readonly tunableKey: string;
  readonly scope: LiveOpsEffectScope;
  readonly direction: LiveOpsEffectDirection;
}

/** One currently-active live-ops event, rendered qualitatively for the requesting player. */
export interface LiveOpsPlayerEventView {
  readonly eventId: string;
  readonly name: string;
  readonly category: LiveOpsEventCategory;
  readonly severity: LiveOpsEventSeverityBand;
  readonly effects: readonly LiveOpsEffectView[];
  /** Always `true` today — every one of the 10 catalogue entries declares a `counterPlayHintKey` (C1);
   *  kept as an explicit field (not inferred from `effects.length`) so a future event that genuinely has
   *  no counter-play at all can flip this honestly without changing the DTO shape. */
  readonly counterPlayAvailable: boolean;
  readonly counterPlayHintKey: string;
  readonly counterPlayHint: string;
}

/** The full player-facing live-ops surface — `live-ops.controller.ts`'s `GET /v1/liveops/active`. */
export interface LiveOpsPlayerSurfaceView {
  readonly active: readonly LiveOpsPlayerEventView[];
}

@Injectable()
export class LiveOpsEventReadService {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Build the requesting player's active live-ops surface. See file header for the join rationale (no
   * persisted membership table, D1) and the honest zero-effect-event gap (E-LO-09 + every C3-TD'd event).
   */
  async getActiveEventsForPlayer(playerId: string): Promise<LiveOpsPlayerSurfaceView> {
    const rows = await this.db
      .selectDistinct({
        activeId: liveOpsEventActive.id,
        eventId: liveOpsEventActive.event_id,
      })
      .from(liveOpsEventActive)
      .innerJoin(
        effectModifier,
        and(
          eq(effectModifier.live_ops_active_event_id, liveOpsEventActive.id),
          or(
            eq(effectModifier.scope_type, 'GLOBAL'),
            and(eq(effectModifier.scope_type, 'PLAYER'), eq(effectModifier.scope_ref, playerId)),
          ),
        ),
      )
      .where(eq(liveOpsEventActive.status, 'ACTIVE'));

    const active = rows.map((row) => this.toPlayerEventView(row.eventId));
    return { active };
  }

  private toPlayerEventView(eventId: string): LiveOpsPlayerEventView {
    // ★ C4b — catalogue-first, then the mounted-reskin store (design §3.6-B DD-RSK1); still throws
    // loudly on a fabricated/dangling event_id, byte-identical for the 10 static catalogue ids.
    const event = resolveLiveOpsEventById(eventId);
    return {
      eventId: event.eventId,
      name: event.name,
      category: event.category,
      severity: deriveSeverityBand(event),
      effects: event.effects.map((effect) => ({
        tunableKey: effect.tunableKey,
        scope: effect.scope,
        direction: deriveLiveOpsEffectDirection(effect.op, effect.magnitudeGetter()),
      })),
      counterPlayAvailable: true,
      counterPlayHintKey: event.counterPlayHintKey,
      counterPlayHint: resolveCounterPlayHintCopy(event.counterPlayHintKey),
    };
  }
}
