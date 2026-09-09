// Pure config + helpers for Signal Drift (#? — Phase-22 L2a). Values [PROV-Y26Q2] — calibrate via gdd/14 / live-ops.
//
// IMPLEMENTS: projects/mafia_city_game/gdd/14_tunable_constants.md
//             §Lieutenants behavior — Signal Drift (namespace `T.lieutenant.signal_drift.*`)
//             docs/superpowers/specs/2026-06-10-phase-22-signal-drift-backend-design.md
//             §3.2 (deriveActiveCues) + §CueKindEnum / §CueReliabilityRegistry / §ReliabilityBucket / §DriftPhase
//             — Phase-22 L2a Task 2 (signal-drift pure cue helpers + tunables)
//
// R2.3: no inline numeric balance/config. All threshold values come from `lieutenantTunables.signalDrift`.
// PURE: no DB / I/O / RNG / Date.now / Math.random. Only imports from sibling lieutenant modules + the DSL
// SignalSnapshot contract type (no NestJS DI). DETERMINISTIC — a pure function of its arguments only.
import type { SignalSnapshot } from '../../../dsl/signals';
import type { LieutenantArchetype } from '../lieutenant-archetype';
import { lieutenantTunables } from '../lieutenant-tunables';

/**
 * The 5 canonical cue kinds (design §CueKindEnum — verbatim, in canonical order). `DIRECT_ORDER` is the player's explicit
 * script signal (always active when a rule matched); the other 4 are INCIDENTAL cues the lieutenant may start over-relying
 * on as the script drifts (Signal Drift — the L2a behaviour this slice measures).
 */
export const CUE_KINDS = [
  'DIRECT_ORDER',
  'TERRITORY_STATE',
  'RESOURCE_AVAILABILITY',
  'TIME_SLOT',
  'PEER_BEHAVIOR',
] as const;

export type CueKind = (typeof CUE_KINDS)[number];

/** Qualitative reliability bucket for a cue's observed hit-ratio (design §ReliabilityBucket). Rank: dormant < partial < reliable < dominant. */
export type ReliabilityBucket = 'dormant' | 'partial' | 'reliable' | 'dominant';

/** The drift phase of a lieutenant's signal-reliance (design §DriftPhase). Surfaced qualitatively (R2.2) by the projection (T4). */
export type DriftPhase = 'DIRECT_ALIGNED' | 'DRIFTING' | 'INCIDENTAL_LOCKED' | 'RESETTING';

/** One per-cue reliability entry (observed hits/misses over the window + derived bucket + a contamination flag). */
export interface CueEntry {
  hits: number;
  misses: number;
  reliability_bucket: ReliabilityBucket;
  /**
   * The contamination flag (design §CueReliabilityRegistry). True once an INCIDENTAL cue's reliance has been judged to have
   * displaced the DIRECT_ORDER primacy (set by the service in T3 when the drift phase locks). A fresh seed is never
   * contaminated. Never surfaced raw (R2.2 — a private BO detail; the projection exposes only the qualitative band).
   */
  contaminated: boolean;
}

/** The full cue-reliability registry for a lieutenant (one entry per CueKind + the seeding strategy). */
export interface CueRegistry {
  generation_strategy: 'SEEDED' | 'OBSERVED';
  entries: Record<CueKind, CueEntry>;
}

/**
 * Derives the qualitative `ReliabilityBucket` from a cue's observed hits/misses, against the reliability cuts in
 * `lieutenantTunables.signalDrift` (gdd/14 §Signal Drift — reliability_cut_low / _mid / _high; defaults 25 / 50 / 75).
 *
 * Boundary scheme (HALF-OPEN, load-bearing for the T3 DRIFT E2E — an incidental cue must be able to reach `dominant`):
 *   - 0 observations (hits + misses === 0)  → `dormant` (nothing observed yet)
 *   - else ratio = 100 * hits / (hits + misses), a percent in [0, 100]:
 *       ratio <  cutLow                  → `dormant`    (e.g. 10% < 25)
 *       [cutLow, cutMid)                 → `partial`    (e.g. 30% ∈ [25, 50))
 *       [cutMid, cutHigh)                → `reliable`   (e.g. 60% ∈ [50, 75))
 *       [cutHigh, 100]                   → `dominant`   (e.g. 90% ∈ [75, 100])
 * Half-open + the explicit zero-observation guard make every percent fall in exactly ONE bucket (no overlap / no gap), and
 * `[cutHigh, 100]` is reachable (a cue with a high enough hit-ratio CAN lock `dominant`). `[PROV-Y26Q2]`.
 */
export function bucketForRatio(hits: number, misses: number): ReliabilityBucket {
  const total = hits + misses;
  if (total === 0) return 'dormant';
  const ratio = (100 * hits) / total;
  const { reliabilityCutLow, reliabilityCutMid, reliabilityCutHigh } = lieutenantTunables.signalDrift;
  if (ratio < reliabilityCutLow) return 'dormant';
  if (ratio < reliabilityCutMid) return 'partial';
  if (ratio < reliabilityCutHigh) return 'reliable';
  return 'dominant';
}

/**
 * Seeds a fresh cue-reliability registry on first observation (generation_strategy = 'SEEDED', from
 * `lieutenantTunables.signalDrift.cueGenerationStrategy`). Every cue starts at {hits:0, misses:0, contaminated:false}.
 * `DIRECT_ORDER` seeds to `reliable` (the player's explicit order is the trusted baseline the lieutenant starts aligned
 * to — design §CueReliabilityRegistry); every incidental cue seeds to `dormant` (nothing observed). The registry's
 * cardinality is the 5 CueKinds (== `lieutenantTunables.signalDrift.cuesTrackedMax`).
 */
export function seedRegistry(): CueRegistry {
  const entries = {} as Record<CueKind, CueEntry>;
  for (const kind of CUE_KINDS) {
    entries[kind] = {
      hits: 0,
      misses: 0,
      reliability_bucket: kind === 'DIRECT_ORDER' ? 'reliable' : 'dormant',
      contaminated: false,
    };
  }
  return {
    generation_strategy: lieutenantTunables.signalDrift.cueGenerationStrategy,
    entries,
  };
}

/**
 * The night-slot bucket boundaries for the `TIME_SLOT` cue (design §3.2 — "créneau « nuit »"). `[PROV-Y26Q2]`.
 *
 * Boundaries chosen (HALF-OPEN, on the minute-of-day = `gameMinute % 1440` ∈ [0, 1439]): the night slot is
 * `[NIGHT_START_MIN, 1440) ∪ [0, NIGHT_END_MIN)` — i.e. 22:00 (1320) through 05:59, wrapping midnight. This is the
 * canonical "graveyard" window when scripted ops are quieter, so a lieutenant operating in it leans more on the clock
 * (the TIME_SLOT incidental cue). 22:00 = 22 * 60 = 1320; 06:00 = 6 * 60 = 360. Calibrate downstream.
 */
const NIGHT_START_MIN = 22 * 60; // 1320 (22:00 inclusive)
const NIGHT_END_MIN = 6 * 60; //    360  (06:00 exclusive — night runs up to but not including 06:00)

/** True iff the minute-of-day falls in the wrap-around night window `[NIGHT_START_MIN, 1440) ∪ [0, NIGHT_END_MIN)`. */
function isNightSlot(gameMinute: number): boolean {
  const minuteOfDay = ((gameMinute % 1440) + 1440) % 1440; // normalise to [0, 1439] (handles a negative input defensively)
  return minuteOfDay >= NIGHT_START_MIN || minuteOfDay < NIGHT_END_MIN;
}

/**
 * Derives the SET of cues ACTIVE this observation, from the per-tick `SignalSnapshot` the binding already builds (design
 * §3.2). PURE + DETERMINISTIC — a function of (archetype, snapshot, gameMinute) only.
 *
 * - `DIRECT_ORDER` — ALWAYS active (the player's script matched a rule this tick — the explicit-order baseline).
 * - `TERRITORY_STATE` — active iff `snapshot.state.heat_high` (the qualitative heat band the COOK binding surfaces;
 *   design §3.2 — "state.heat_high (ou bande de heat)").
 * - `RESOURCE_AVAILABILITY` — active iff a stock/precursor signal is present. For COOK, the L2a proxy that the lab is
 *   READY (precursor/stock available) is `snapshot.state.cook_idle === true` — the same `state.cook_idle` the COOK
 *   binding resolves from `ProductionRepository` (services/.../dsl/signals.ts §SignalSnapshot). `[PROV-Y26Q2]` PROXY:
 *   `cook_idle` (the lab is idle ⇒ ready to start ⇒ its precursor/stock input is available) stands in for an explicit
 *   precursor-availability signal until a dedicated stock signal lands. Only consulted for the COOK archetype.
 * - `TIME_SLOT` — active iff `gameMinute` (mod 1440) falls in the night window — see NIGHT_START_MIN / NIGHT_END_MIN
 *   (the boundaries are documented above). `[PROV-Y26Q2]`.
 * - `PEER_BEHAVIOR` — active iff the snapshot carries a paused-peer flag (`snapshot.state.peer_paused === true`, the
 *   REUSE-P18 peer-read signal a future binding may set — design §3.2 "un pair en delegation_paused"). L2a does not yet
 *   wire a peer read, so absent the flag this stays inactive (false). `[PROV-Y26Q2]`.
 *
 * A cue with no corresponding snapshot field for the archetype is simply never added (it stays `dormant` in the registry).
 */
export function deriveActiveCues(
  archetype: LieutenantArchetype,
  snapshot: SignalSnapshot,
  gameMinute: number,
): Set<CueKind> {
  const active = new Set<CueKind>();
  const state = snapshot.state ?? {};

  // DIRECT_ORDER — always active (the explicit-order baseline; the script matched a rule this tick).
  active.add('DIRECT_ORDER');

  // TERRITORY_STATE — the qualitative heat band (state.heat_high) the binding surfaces.
  if (state.heat_high === true) active.add('TERRITORY_STATE');

  // RESOURCE_AVAILABILITY — COOK L2a proxy: state.cook_idle === true ⇒ the lab is ready (precursor/stock available).
  if (archetype === 'COOK' && state.cook_idle === true) active.add('RESOURCE_AVAILABILITY');

  // TIME_SLOT — the night-window bucket of gameMinute (mod 1440). Boundaries documented above.
  if (isNightSlot(gameMinute)) active.add('TIME_SLOT');

  // PEER_BEHAVIOR — a paused-peer flag (REUSE-P18 peer read). Absent in L2a unless a binding sets it.
  if (state.peer_paused === true) active.add('PEER_BEHAVIOR');

  return active;
}
