// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C7 (counter-play backend
//             hooks — honest-scaffolding + E-POL-10 counter_play_politician_cost)
//             Canon: docs/tech/04e_political_events_and_liveops/political_event_catalogue.md (§1.2
//             `counter_play_actions` per event) + Decisions §4.4 (E-POL-10 honest-scaffolding, RULED).
//             Source data: political-event-catalogue.ts's own `counterPlayActions[]` per event (C1) —
//             this file does NOT re-author the actions, it classifies each one's REAL backend disposition.
//             — 04e-A2 C7 — 2026-07-06
//
// `COUNTER_PLAY_DISPOSITIONS` — for each of the 12 events' `counterPlayActions[]` (already authored at C1,
// `political-event-catalogue.ts`), records whether the mitigation is:
//
//   'REAL_WIRED'     — a genuine, ALREADY-BUILT backend system the counter-play maps onto (a real keyed
//                       state a caller can drive and read back). The Unity/action-lot UI that lets a player
//                       INVOKE it in direct response to a political event is TD-152 (out of scope, backend-
//                       first per plan) — but the backend seam itself is real, not fabricated: this file
//                       cites the exact service/mechanism + the existing test-only drive route that proves it
//                       (`political_counter_play_hooks.spec.ts`, C7, drives each REAL_WIRED seam directly).
//   'HONEST_SCAFFOLD' — canon describes a mitigation, but the codebase has NO live consumer/lever for it
//                       today (searched exhaustively — mirrors the C1/C4 TD-159/160/161 discipline: do NOT
//                       fabricate a lever/consumer that doesn't exist). Carries a `tdRef`.
//   'NONE_NEEDED'    — either canon explicitly says "None"/"None needed" for this event, OR the mitigation
//                       is achievable through ordinary EXISTING player-facing gameplay with no NEW
//                       political-specific backend state required (ordinary production/behavior choices —
//                       e.g. "switch product mix" is just choosing what to cook, already fully live).
//
// Anti-fig-leaf: the load-time self-check below (mirrors `political-event-catalogue.ts`'s own pattern)
// throws if this registry and `POLITICAL_EVENT_CATALOGUE.counterPlayActions[]` ever drift apart — every
// catalogue action MUST have exactly one disposition entry (by `[eventId, actionName]`), and vice versa.
//
// SCOPE NOTE (task framing — Ephemeral/Fixer/Saltline/Dispatch): these 4 named systems recur across
// several events' counter-play descriptions. Their disposition here:
//   - Ephemeral Architecture (E-POL-01)      → REAL_WIRED (EphemeralOperationService, 04b §2.3).
//   - Fixer (E-POL-01 bribe / E-POL-10 budget) → MIXED: E-POL-10 REAL_WIRED (counter_play_politician_cost,
//     already wired C1/C4/C6 — THIS chunk adds the dedicated end-to-end read-back proof); E-POL-01's Fixer
//     bribe has NO live IA-risk/cost lever cited by canon → HONEST_SCAFFOLD (TD-164).
//   - Saltline brokers (E-POL-05)            → HONEST_SCAFFOLD (TD-165 — no "Saltline broker pool" system
//     exists anywhere; `Saltline` in the codebase is only a rival-AI archetype key, never a lobbying pool).
//   - Dispatch coordinator (E-POL-08)        → REAL_WIRED both halves (RouteStance='evasive' reroute +
//     PAUSE_OPS via the System-9c Courier coordinator).

import { POLITICAL_EVENT_CATALOGUE } from './political-event-catalogue';

export type CounterPlayDisposition = 'REAL_WIRED' | 'HONEST_SCAFFOLD' | 'NONE_NEEDED';

export interface CounterPlayDispositionEntry {
  /** Matches `PoliticalEvent.eventId` verbatim. */
  readonly eventId: string;
  /** Matches one of that event's `counterPlayActions[].name` verbatim (self-checked below). */
  readonly actionName: string;
  readonly disposition: CounterPlayDisposition;
  /** One-line justification — always present regardless of disposition. */
  readonly note: string;
  /** REAL_WIRED only — the real service/mechanism + file reference + the test-only drive route that
   *  proves it (`political_counter_play_hooks.spec.ts`, C7). */
  readonly backingRef?: string;
  /** HONEST_SCAFFOLD only — the tech-debt inventory entry tracking the gap. */
  readonly tdRef?: string;
}

export const COUNTER_PLAY_DISPOSITIONS: readonly CounterPlayDispositionEntry[] = [
  // ── E-POL-01 — Electoral campaign season ──────────────────────────────────────────────────────
  {
    eventId: 'E-POL-01', actionName: 'Ephemeral Architecture', disposition: 'REAL_WIRED',
    note: 'Maps onto the REAL 04b §2.3 Ephemeral Architecture toggle (combat_operation.ephemeral_mode) — ' +
      'already built + tested in 04b-B; this chunk drives it directly to prove the seam is real, not fabricated.',
    backingRef: 'EphemeralOperationService.setOperationEphemeralMode ' +
      '(operational/conflict/combat/ephemeral-operation.service.ts:73) — test seam: ' +
      'POST /_test/combat/drive-set-ephemeral-mode + GET /_test/combat/read-operation (combat-test.controller.ts).',
  },
  {
    eventId: 'E-POL-01', actionName: 'Bribe campaign coordinators', disposition: 'HONEST_SCAFFOLD',
    note: 'Canon gives a descriptive "+0.3 IA risk" with NO registered tunable/getter behind it — no live ' +
      'IA-risk/cost lever exists to hook onto (searched — distinct from any registered ia.tunables.ts key). ' +
      "CounterPlayAction.costGetter is intentionally left undefined for this action (political.types.ts).",
    tdRef: 'TD-164',
  },

  // ── E-POL-02 — Budget cycle: enforcement increase ─────────────────────────────────────────────
  {
    eventId: 'E-POL-02', actionName: 'Reduce operational tempo', disposition: 'NONE_NEEDED',
    note: 'Ordinary, already-live capability: a COOK lieutenant\'s existing heat-triggered PAUSE_OPS rule ' +
      '(cook-binding.ts salient card, e.g. "WHEN EVENT(heat,>=,X) THEN PAUSE_OPS") already lets the player ' +
      'pause non-essential cooks — no NEW political-specific seam required.',
  },

  // ── E-POL-03 — Budget cycle: enforcement cut ──────────────────────────────────────────────────
  {
    eventId: 'E-POL-03', actionName: 'None needed', disposition: 'NONE_NEEDED',
    note: 'Canon explicit: "A window of opportunity for operational expansion" — no mitigation to wire.',
  },

  // ── E-POL-04 — Substance scheduling change ────────────────────────────────────────────────────
  {
    eventId: 'E-POL-04', actionName: 'Switch product mix', disposition: 'NONE_NEEDED',
    note: 'Ordinary, already-live capability: choosing which substance to cook/sell is standard production ' +
      'gameplay — no NEW political-specific seam required.',
  },
  {
    eventId: 'E-POL-04', actionName: 'Pay political fixers via corrupt clerks', disposition: 'HONEST_SCAFFOLD',
    note: '⚠️ CORRIGÉ 2026-08-08 — la prémisse « `clerk` is RESERVED-INERT (no live caller) » qui fondait ce ' +
      'HONEST_SCAFFOLD est FAUSSE depuis 04f-B : `clerk` a un appelant de PRODUCTION ' +
      '(recruitment-quest.service.ts:336, via @Post(recruitment/quests/:id/advance) + JwtAuthGuard). ' +
      'La DISPOSITION de cet item est donc à réévaluer par son lot propriétaire (04e political) — ce ' +
      'commit ne corrige que le fait, pas le classement. Root cause historiquement partagée avec TD-155 pour ' +
      'E-POL-11\'s federal-immunity honest-scaffolding. Cross-referenced (TD-155 extended this chunk), not ' +
      'a fresh gap.',
    tdRef: 'TD-155',
  },

  // ── E-POL-05 — Lobbying campaign by rival ─────────────────────────────────────────────────────
  {
    eventId: 'E-POL-05', actionName: 'Counter-lobbying via Saltline brokers', disposition: 'HONEST_SCAFFOLD',
    note: 'Searched the codebase exhaustively: no "Saltline broker pool" / lobbying-counter mechanic exists ' +
      'anywhere — `Saltline` is ONLY a rival-AI archetype key (rival-ai.types.ts / rival-seed.service.ts), ' +
      'never a lobbying-pool concept. The canon cross-ref "04a §14 Saltline pool" does not correspond to any ' +
      'real numbered section or built system (04a has no §14 / no Saltline pool schema/service). Per the C1 ' +
      'discipline (TD-159/160/161): do NOT fabricate a lever for a concept that does not exist — TD instead.',
    tdRef: 'TD-165',
  },
  {
    eventId: 'E-POL-05', actionName: 'Sustained operational restraint', disposition: 'NONE_NEEDED',
    note: 'Ordinary, already-live capability: reducing heat/territory-gain signal via existing restraint ' +
      'play is standard gameplay (the E-POL-05 trigger itself reads real rival-regime + territory-gain state, ' +
      'political-trigger-evaluators.ts) — no NEW political-specific seam required.',
  },

  // ── E-POL-06 — Anti-corruption initiative ─────────────────────────────────────────────────────
  {
    eventId: 'E-POL-06', actionName: 'Pause use of corrupt actors', disposition: 'HONEST_SCAFFOLD',
    note: '⚠️ CORRIGÉ 2026-08-08 — voir E-POL-04 : `clerk` n\'est PLUS reserved-inert (appelant de production ' +
      'depuis 04f-B), donc « genuinely un-invokable today » est faux et la disposition est à réévaluer par ' +
      '04e political. The "Tier-3 lawyers" half is NONE_NEEDED (the real, ' +
      'already-modeled `burn_risk_score` accumulation/decay, 04d lawyer_legal_system.md, requires no NEW ' +
      'seam — the player simply stops spending on Tier-3 lawyer actions). Classified HONEST_SCAFFOLD overall ' +
      'since part of the described mitigation cannot be genuinely invoked.',
    tdRef: 'TD-155',
  },

  // ── E-POL-07 — Industrial zoning relaxation ───────────────────────────────────────────────────
  {
    eventId: 'E-POL-07', actionName: 'None', disposition: 'NONE_NEEDED',
    note: 'Canon explicit: "A windfall for production-focused players" — no mitigation to wire.',
  },

  // ── E-POL-08 — Riverfront crackdown ────────────────────────────────────────────────────────────
  {
    eventId: 'E-POL-08', actionName: 'Reroute via cohesion-friendly bridges', disposition: 'REAL_WIRED',
    note: 'Maps onto the REAL System-9b `RouteStance=\'evasive\'` A* reroute weighting (already built + ' +
      'tested) — distinct astarWPatrol/astarWDetection weights genuinely lower the caught-rate vs. ' +
      '\'fastest\'/\'balanced\' for the SAME endpoints; this chunk drives the existing stance-divergence ' +
      'harness directly to re-prove the seam is real in the political counter-play context.',
    backingRef: 'RouteFinderService stance weighting (operational/distribution/route-finder.service.ts:187, ' +
      '981-1008, astarWDistance/astarWPatrol/astarWDetection/astarWDebt per RouteStance) — test seam: ' +
      'POST /_test/route-lifecycle/evasive-contract-harness (distribution-test.controller.ts).',
  },
  {
    eventId: 'E-POL-08', actionName: 'Pause cross-river ops', disposition: 'REAL_WIRED',
    note: 'Maps onto the REAL System-9c Courier coordinator\'s PAUSE_OPS resolved action (dsl/signals.ts) — ' +
      'a coordinator whose script resolves PAUSE_OPS takes NO dispatch action this tick, leaving the pending ' +
      'route_request \'pending\' (never \'fulfilled\'); this chunk drives the real coordinator directly to ' +
      'prove the pause seam is real, not a fabricated no-op flag.',
    backingRef: 'LogisticsBindingService.applyResolvedAction PAUSE_OPS branch ' +
      '(operational/lieutenant/logistics-binding.ts:423-430) via CoordinatorExecutionService — test seam: ' +
      'POST /_test/coordinator/recruit-assign (script) + /_test/coordinator/fire-request + ' +
      'GET /_test/coordinator/read-request (distribution-test.controller.ts).',
  },

  // ── E-POL-09 — City Hall scandal ──────────────────────────────────────────────────────────────
  {
    eventId: 'E-POL-09', actionName: 'Capitalize on chaos', disposition: 'NONE_NEEDED',
    note: 'Ordinary, already-live capability: using the existing laundering pipeline more aggressively is ' +
      'standard gameplay — no NEW political-specific seam required.',
  },

  // ── E-POL-10 — Mayor opposition victory ───────────────────────────────────────────────────────
  {
    eventId: 'E-POL-10', actionName: 'Adjust budget allocation', disposition: 'REAL_WIRED',
    note: 'THE C7 headline seam (decisions §4.4, RULED honest-scaffolding): the composed ' +
      '`political_events.counter_play_politician_cost` lever genuinely shifts ×0.7 while E-POL-10 is active ' +
      'and reverts to base on deactivation (dedicated read-back proof this chunk) — a REAL, already-registered ' +
      'BASE lever an EventEffect genuinely composes through EffectOverlayStore. The player-facing SPEND action ' +
      '(actually invoking this counter-play) is Unity/action-lot (TD-152) — never faked here; only the read-' +
      'back-provable BACKEND lever is claimed real.',
    backingRef: 'politicalTunables.counterPlayPoliticianCost (operational/political/political.tunables.ts:154) ' +
      '× politicalEventsTunables.epol10CounterPlayCostMultiplier — composed via EffectOverlayStore.applyModifiers, ' +
      'wired at C1 (catalogue effect) / C4 (activate) / C6 (autonomous opposition-victory trigger); dedicated ' +
      'end-to-end (activate → ×0.7 → deactivate → back to base) read-back proof: political_counter_play_hooks.spec.ts (C7).',
  },

  // ── E-POL-11 — Federal task force ─────────────────────────────────────────────────────────────
  {
    eventId: 'E-POL-11', actionName: 'Hide / deep restraint', disposition: 'NONE_NEEDED',
    note: 'Ordinary, already-live capability: a sustained pacifist/low-heat run is standard gameplay ' +
      '(cross-ref 04b pacifist_run_viability.md) — no NEW political-specific seam required.',
  },

  // ── E-POL-12 — Sympathetic district representative ───────────────────────────────────────────
  {
    eventId: 'E-POL-12', actionName: 'None', disposition: 'NONE_NEEDED',
    note: 'Canon explicit: "A reward for sustained good behavior in that district" — no mitigation to wire.',
  },
];

/** eventId → dispositions for that event (derived index, O(1) lookup). */
export const COUNTER_PLAY_DISPOSITIONS_BY_EVENT: ReadonlyMap<string, readonly CounterPlayDispositionEntry[]> =
  (() => {
    const map = new Map<string, CounterPlayDispositionEntry[]>();
    for (const entry of COUNTER_PLAY_DISPOSITIONS) {
      const list = map.get(entry.eventId) ?? [];
      list.push(entry);
      map.set(entry.eventId, list);
    }
    return map;
  })();

// ── Load-time anti-drift self-check (mirrors political-event-catalogue.ts's own pattern) ───────────────
//
// Every `[eventId, actionName]` pair in POLITICAL_EVENT_CATALOGUE's counterPlayActions[] MUST have exactly
// one COUNTER_PLAY_DISPOSITIONS entry, and vice versa — the two lists can never silently drift apart.
{
  const catalogueKeys = new Set<string>();
  for (const event of POLITICAL_EVENT_CATALOGUE) {
    for (const action of event.counterPlayActions) {
      catalogueKeys.add(`${event.eventId}::${action.name}`);
    }
  }
  const dispositionKeys = new Set<string>();
  for (const entry of COUNTER_PLAY_DISPOSITIONS) {
    const key = `${entry.eventId}::${entry.actionName}`;
    if (dispositionKeys.has(key)) {
      throw new Error(`COUNTER_PLAY_DISPOSITIONS anti-drift violation: duplicate entry for ${key}.`);
    }
    dispositionKeys.add(key);
    if (!catalogueKeys.has(key)) {
      throw new Error(
        `COUNTER_PLAY_DISPOSITIONS anti-drift violation: '${key}' does not match any ` +
        `POLITICAL_EVENT_CATALOGUE counterPlayActions[] entry (political-event-catalogue.ts) — ` +
        `rename/remove this disposition entry to match.`,
      );
    }
  }
  for (const key of catalogueKeys) {
    if (!dispositionKeys.has(key)) {
      throw new Error(
        `COUNTER_PLAY_DISPOSITIONS anti-drift violation: catalogue counter-play action '${key}' ` +
        `(political-event-catalogue.ts) has NO disposition entry in this file — every counter-play action ` +
        `must be classified REAL_WIRED / HONEST_SCAFFOLD / NONE_NEEDED (C7 anti-fig-leaf discipline).`,
      );
    }
  }
}
