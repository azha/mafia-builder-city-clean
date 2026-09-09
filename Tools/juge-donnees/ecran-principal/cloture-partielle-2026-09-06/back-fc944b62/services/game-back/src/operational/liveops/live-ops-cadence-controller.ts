// IMPLEMENTS: docs/superpowers/plans/2026-07-06-04e-B-liveops-plan.md C5 (★ LiveOpsCadenceController —
//             anti-FOMO cadence enforcement, REPLACES the C4 `enforceCadenceLimitsStub`) % allowed-mention: design comment naming the invariant this controller enforces, not narrative usage
//             + C8 (★ `getCadenceStatus` — the read-only BO diagnostic source, D5)
//             Design: docs/superpowers/specs/2026-07-06-04e-B-liveops-design.md §2 (architecture, "the
//             plain provider — not a Nest @Controller" note) + §5 (Determinism, real-time scheduling).
//             Canon: gdd/04e_political_events_and_liveops.md §2.5 (`:283-287` — max 3 simultaneous, max 1
//             high-impact per real week, no event chains) + `liveops_event_catalogue.md:168-174,192`. % allowed-mention: canon citation, not narrative usage
//             Pattern (cap → 409 RESOURCE_STATE_CONFLICT, pre-write read, no side effect on reject):
//             services/game-back/src/operational/distribution/distribution.service.ts:195-203 (roster-cap
//             gate) + operational/lieutenant/autonomy/autonomy-ceiling.service.ts:145 (decision cooldown).
//             — 04e-B C5 — 2026-07-06
//             — 04e-B C8 — 2026-07-06 (★ `getCadenceStatus` added — `GET /v1/admin/liveops/cadence-status`,
//             `live-ops-admin.controller.ts`, calls this directly; the 2 counting queries rules (a)/(b)
//             already ran are extracted into private helpers so `enforceCadenceLimits` and
//             `getCadenceStatus` share ONE query implementation each, never two copies of the same COUNT)
//             — 04g-D C4b — 2026-07-17 (★ ANNOTATION-ONLY widen, plan §0.9/design §3.6-B allowlist:
//             `enforceCadenceLimits`'s parameter type widens `LiveOpsEvent` → `ResolvedLiveOpsEvent` — the
//             caller, `live-ops-event.service.ts`, now passes a `resolveLiveOpsEventById` result, which may
//             be a `MountedLiveOpsEvent`. ZERO behavior change: this method only reads `event.eventId` /
//             `event.highImpact` — runtime fields BOTH union members share structurally; a mounted event's
//             `highImpact` is FORCED `true` at construction (DD-RSK5, design), so it correctly consumes
//             the weekly high-impact cadence slot like any other high-impact activation.)
//
// `LiveOpsCadenceController` — despite the canon name, this is a PLAIN INJECTABLE PROVIDER, NOT a Nest
// `@Controller` (design §2's own explicit note; there is no HTTP route here). `enforceCadenceLimits(event)`
// is the anti-FOMO gate `LiveOpsEventService.activateLiveOpsEvent` (C4) calls BEFORE targeting/apply, % allowed-mention: design comment naming the invariant, not narrative usage
// REPLACING the C4 `enforceCadenceLimitsStub` pass-through (live-ops-event.service.ts). Three rules
// (gdd/04e §2.5, verbatim):
//
//   (a) MAX 3 SIMULTANEOUS — reject the 4th+ activation while `liveops.max_active_simultaneous` (default 3)
//       events already have `status='ACTIVE'` in `live_ops_event_active`.
//   (b) MAX 1 HIGH-IMPACT / REAL WEEK — reject a HIGH-IMPACT activation (E-LO-01/04/06,
//       `LiveOpsEvent.highImpact`) while `liveops.max_high_impact_per_week` (default 1) high-impact
//       activations already have `started_at` within the trailing REAL week — window =
//       `[clock.now() - 7 real days, clock.now()]`, via the injected `LiveOpsClockPort` (DD-B3), NEVER an
//       inline `Date.now()`. A NON-high-impact activation is never blocked by this rule (per canon: only
//       high-impact events count against/are gated by this cap).
//   (c) NO CHAINS — reject an activation that declares a required-predecessor (canon "No event chains that % allowed-mention: canon Forbidden-pattern documentation, not narrative usage
//       require sequential participation" — the anti-FOMO invariant, gdd/04e §2.5:287). See % allowed-mention: canon Forbidden-pattern documentation, not narrative usage
//       `assertNoEventChain` below for the structural + runtime reasoning.
//
// REJECTION = ZERO SIDE EFFECTS (anti-fig-leaf): every check here is a pure SELECT (or a pure in-memory
// key inspection for (c)) — nothing is written before the throw. `activateLiveOpsEvent` calls this gate
// FIRST, before `evaluateCohortTargeting`/the `live_ops_event_active` INSERT/`applyLiveOpsEvent`/
// `reloadNow` — so a rejected activation inserts NO row and changes NO overlay (mirrors
// `distribution.service.ts`'s own "pre-tx read BEFORE any state change" roster-cap gate discipline).
//
// ERROR SURFACE (mirrors the codebase's own established domain-error convention — `protocol/api-error.ts`
// + `protocol/error-codes.ts`, consumed by the app-wide `GlobalExceptionFilter`, NOT a bespoke
// try/catch here): a cap/cooldown-style rejection ((a)/(b), "the CURRENT world state blocks this action")
// throws `ApiError('RESOURCE_STATE_CONFLICT')` → 409 (verbatim precedent:
// `distribution.service.ts`'s roster-cap-gate 409 + `autonomy-ceiling.service.ts`'s decision-cooldown 409).
// The (c) chain guard is a MALFORMED-INPUT-shaped rejection (the object itself violates an invariant, not
// a state-vs-request conflict) → `ApiError('VALIDATION_FAILED')` → 422 (mirrors
// `political-admin.controller.ts`'s own `VALIDATION_FAILED` usage for a structurally-invalid event
// reference). Both codes are already registered in `protocol/error-codes.ts` — no new code added.
//
// R2.2/R-EH-4: the raw `activeCount`/`highImpactCount` + the numeric caps appear ONLY in the dev-facing
// `message` string (never in `payloadVars`/`details`) — mirrors `distribution.service.ts`'s own comment on
// why a raw count never crosses into the client-facing surface.
//
// R2.3 (tunables registry-FIRST, REUSE — never re-register): `liveOpsTunables.maxActiveSimultaneous` /
// `.maxHighImpactPerWeek` are READ HERE (not registered here) — both getters already exist, registered at
// C1 (`live-ops.tunables.ts:139,145`) specifically annotated "C5 consumer". Read via the getter on every
// call (never cached) — a DB-override flip is observed immediately (falsifiable, `liveops_cadence.spec.ts`).
//
// Determinism: NO `Math.random()`, NO inline `Date.now()`/`new Date()` — the ONLY real-time read is
// `this.clock.now()` (`LiveOpsClockPort`, DD-B3); the trailing-week boundary is computed from it.

import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gte, lte, ne } from 'drizzle-orm';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { ApiError } from '../../protocol/api-error';
import { liveOpsEventActive } from '../../db/schema/live_ops_event_active';
import { LIVE_OPS_CLOCK, type LiveOpsClockPort } from './live-ops-clock.port';
import { liveOpsTunables } from './live-ops.tunables';
import type { ResolvedLiveOpsEvent } from './live-ops-mounted-event.store';

/** Real-time-day → millisecond conversion — mirrors `live-ops-event.service.ts`'s own local `MS_PER_REAL_DAY`
 *  constant (and `unconformity.service.ts`'s own `MS_PER_DAY` precedent, same file-local-constant convention;
 *  no shared time-utils module exists in this codebase — each real-time consumer defines its own). */
const MS_PER_REAL_DAY = 24 * 60 * 60 * 1000;

/**
 * The trailing-week WINDOW LENGTH for rule (b) — a fixed structural constant (canon "1 high-impact event per
 * REAL-TIME WEEK", gdd/04e §2.5), NOT a `liveops.*` tunable: only the CAP COUNT
 * (`liveops.max_high_impact_per_week`) is registry-driven; the week's length itself is not one of the 29
 * registered keys (`live-ops.tunables.ts` — no `elo0x_..._window_days`-style key exists for THIS rule; the
 * two `*_aggression_threshold_window_days`-shaped keys belong to the UNRELATED C6 aggression-bucket window).
 */
const HIGH_IMPACT_WINDOW_REAL_DAYS = 7;

/**
 * (c) NO CHAINS — anti-FOMO structural + runtime guard (gdd/04e §2.5:287, `liveops_event_catalogue.md:172` % allowed-mention: design comment naming the invariant, not narrative usage
 * "No 'event chains' requiring sequential participation (FOMO pattern interdit)"). % allowed-mention: canon Forbidden-pattern documentation, not narrative usage
 *
 * STRUCTURAL: `LiveOpsEvent` (`live-ops.types.ts`) declares NO predecessor/chain field by design — every one
 * of the 10 static catalogue entries (`live-ops-event-catalogue.ts`) is therefore structurally chain-free.
 * `liveops_cadence.spec.ts`'s own grep over both files proves zero hits for any chain/predecessor-shaped
 * identifier — the structural half of this guard lives in the TEST FLOOR, not here (there is nothing to
 * assert on the TS type at runtime beyond the object-shape check below).
 *
 * RUNTIME (defense-in-depth — never expected to fire against the static catalogue as it exists today; a
 * genuinely malformed `LiveOpsEvent` cannot occur through normal TS construction, since the interface has no
 * such field): reject an activation whose event object carries ANY of the forbidden chain-declaring keys
 * below. This catches a FUTURE accidental reintroduction (e.g. a careless `as LiveOpsEvent` cast, or a spread
 * from an untyped source, smuggling an extra field past the compiler's structural check) that the TS type
 * alone would not catch at runtime — the same "belt + suspenders" reasoning the DD-B2 `effect_modifier` CHECK
 * constraint applies to its own exactly-one-parent invariant (a DB-level backstop for a TS-level guarantee).
 */
const FORBIDDEN_CHAIN_FIELDS = [
  'predecessorEventId',
  'requiredPredecessorEventId',
  'chainId',
  'chainedEventId',
  'requiresEventId',
  'prerequisiteEventId',
] as const;

function assertNoEventChain(event: ResolvedLiveOpsEvent): void {
  const raw = event as unknown as Record<string, unknown>;
  for (const field of FORBIDDEN_CHAIN_FIELDS) {
    if (field in raw) {
      throw new ApiError('VALIDATION_FAILED', {
        message:
          `LiveOpsEvent '${event.eventId}' declares a forbidden chain/predecessor field '${field}' — event ` +
          `chains requiring sequential participation are FORBIDDEN (anti-FOMO, gdd/04e §2.5:287). ` + // % allowed-mention: runtime rejection-message text naming the canon invariant this defense-in-depth guard enforces, not shipped narrative copy
          `live-ops.types.ts's LiveOpsEvent carries no such field by design; this is a defense-in-depth ` +
          'runtime check.',
      });
    }
  }
}

@Injectable()
export class LiveOpsCadenceController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    @Inject(LIVE_OPS_CLOCK) private readonly clock: LiveOpsClockPort,
  ) {}

  /**
   * The anti-FOMO gate (plan §C5). Throws `ApiError` (never returns a value) on ANY of the 3 rules — % allowed-mention: design comment naming the invariant, not narrative usage
   * `activateLiveOpsEvent` (C4) calls this FIRST, before targeting/INSERT/apply, so a rejection leaves the
   * DB and the effect overlay byte-unchanged (no `live_ops_event_active` row, no `effect_modifier` row, no
   * `reloadNow`).
   */
  async enforceCadenceLimits(event: ResolvedLiveOpsEvent): Promise<void> {
    // (c) — cheapest check first, no I/O: reject a chain-declaring event before touching the DB at all.
    assertNoEventChain(event);

    // (a) — max 3 (default) simultaneous ACTIVE events.
    const maxActiveSimultaneous = liveOpsTunables.maxActiveSimultaneous; // fresh read every call (R2.3).
    const activeCount = await this.countActive();
    if (activeCount >= maxActiveSimultaneous) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `cadence refused: ${activeCount} live-ops event(s) already ACTIVE ` +
          `(liveops.max_active_simultaneous=${maxActiveSimultaneous}) — cannot activate '${event.eventId}'. ` +
          'Deactivate an existing event or wait for one to auto-revert (anti-FOMO cadence, gdd/04e §2.5).', // % allowed-mention: runtime rejection-message text naming the invariant, not shipped narrative copy
      });
    }

    // (b) — max 1 (default) high-impact activation per trailing real week. Non-high-impact events skip
    // this rule entirely (canon: only E-LO-01/04/06 count against/are gated by this cap).
    if (event.highImpact) {
      const now = this.clock.now(); // DD-B3 — the ONLY real-time read in this method.
      const maxHighImpactPerWeek = liveOpsTunables.maxHighImpactPerWeek; // fresh read every call (R2.3).
      const highImpactCount = await this.countHighImpactInWindow(now);
      if (highImpactCount >= maxHighImpactPerWeek) {
        throw new ApiError('RESOURCE_STATE_CONFLICT', {
          message:
            `cadence refused: ${highImpactCount} high-impact live-ops event(s) already started within the ` +
            `trailing real week (liveops.max_high_impact_per_week=${maxHighImpactPerWeek}) — cannot activate ` +
            `high-impact '${event.eventId}'. Wait for the real-time week to roll over (anti-FOMO cadence, ` + // % allowed-mention: runtime rejection-message text naming the invariant, not shipped narrative copy
            'gdd/04e §2.5).',
        });
      }
    }
  }

  /**
   * `getCadenceStatus` — ★ C8 NEW (D5): the read-only BO diagnostic surface
   * (`GET /v1/admin/liveops/cadence-status`, `live-ops-admin.controller.ts`, role `gm`). Returns the
   * SAME 2 counts + caps rules (a)/(b) above gate on — a plain SELECT, NO side effects, NO throw (unlike
   * `enforceCadenceLimits`, which rejects; this method only reports). Rule (b)'s high-impact count is
   * ALWAYS computed here (unconditionally, unlike the gate above which only checks it for a highImpact
   * candidate event) — the BO wants to see the live count/cap regardless of what an operator might
   * activate next. Same registered getters (fresh every call, R2.3) and the same trailing-real-week
   * window as the enforcement gate — the counting queries are shared via the 2 private helpers below,
   * never a second, drifting copy of the same COUNT.
   */
  async getCadenceStatus(): Promise<{
    activeCount: number;
    maxActiveSimultaneous: number;
    highImpactCount: number;
    maxHighImpactPerWeek: number;
  }> {
    const maxActiveSimultaneous = liveOpsTunables.maxActiveSimultaneous; // fresh read every call (R2.3).
    const maxHighImpactPerWeek = liveOpsTunables.maxHighImpactPerWeek; // fresh read every call (R2.3).
    const activeCount = await this.countActive();
    const highImpactCount = await this.countHighImpactInWindow(this.clock.now());
    return { activeCount, maxActiveSimultaneous, highImpactCount, maxHighImpactPerWeek };
  }

  /** Rule (a)'s count — extracted so `enforceCadenceLimits`/`getCadenceStatus` share ONE query. */
  private async countActive(): Promise<number> {
    const [row] = await this.db
      .select({ activeCount: count() })
      .from(liveOpsEventActive)
      .where(eq(liveOpsEventActive.status, 'ACTIVE'));
    return Number(row?.activeCount ?? 0);
  }

  /** Rule (b)'s count (trailing real week ending at `now`) — extracted so
   *  `enforceCadenceLimits`/`getCadenceStatus` share ONE query. */
  private async countHighImpactInWindow(now: Date): Promise<number> {
    const windowStart = new Date(now.getTime() - HIGH_IMPACT_WINDOW_REAL_DAYS * MS_PER_REAL_DAY);
    const [row] = await this.db
      .select({ highImpactCount: count() })
      .from(liveOpsEventActive)
      .where(and(
        eq(liveOpsEventActive.high_impact, true),
        gte(liveOpsEventActive.started_at, windowStart),
        lte(liveOpsEventActive.started_at, now),
        ne(liveOpsEventActive.status, 'SCHEDULED'),
      ));
    return Number(row?.highImpactCount ?? 0);
  }
}
