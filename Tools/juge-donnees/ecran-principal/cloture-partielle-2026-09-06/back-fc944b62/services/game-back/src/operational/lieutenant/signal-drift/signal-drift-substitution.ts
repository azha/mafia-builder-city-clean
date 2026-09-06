// IMPLEMENTS: docs/superpowers/specs/2026-06-10-phase-24-signal-drift-substitution-backend-design.md §3.3 (the runtime
//             SUBSTITUTION core — when a delegated lieutenant is INCIDENTAL_LOCKED and the dominant incidental cue is
//             present this tick but the script produced NO action, inject an EXECUTE_DEFAULT impulse the override; an
//             explicit PAUSE / a script-driven EXECUTE_DEFAULT still wins) + §Invariant 8 (no substitution in `tasked`
//             mode) + signal-drift-cues.ts §deriveActiveCues / §CueKind / §DriftPhase + dsl/signals.ts §ResolvedAction
//             -- Phase-24 L2b Task 3 (the substitution resolver + the combine-by-priority merge) --
//
// PURE + DETERMINISTIC: a function of (mode, driftPhase, dominantCue, activeCues) ONLY — NO DB / I/O / RNG /
// Date.now / Math.random. The active-cue set is INJECTED by the LIEUTENANT_TICK (P24/L2b review-polish): the tick derives
// `deriveActiveCues` ONCE per tick and threads the SAME Set into BOTH resolveSubstitution (the cue-presence test here) and
// observeOutcome (the measurement tally), so the substitution fires on EXACTLY the cue set the measurement observed — now
// STRUCTURALLY (one derivation), not as a coincidence of two independent calls with identical args. resolveSubstitution
// only READS the Set (`.has`); it never mutates it. The LIEUTENANT_TICK (T3 wiring) imports these two pure functions
// directly (no provider — YAGNI for pure fns); the executor stays archetype-agnostic and the binding is untouched. This
// module owns the DECISION ONLY — the tick still routes the chosen token through the EXISTING autonomy gate + the
// binding's applyExecuteDefault (the substituted EXECUTE_DEFAULT is budget-gated + applied exactly like a script-driven one).

import type { CueKind, DriftPhase } from './signal-drift-cues';
import type { ResolvedAction } from '../../../dsl/signals';

/**
 * The PURE substitution decision: should drift SUBSTITUTE an EXECUTE_DEFAULT this tick? Returns the impulse
 * (`{ kind: 'EXECUTE_DEFAULT' }`), or `null` when no substitution applies. The gates (ALL must hold for an impulse):
 *   - `mode === 'delegated'`            — Invariant 8: NO substitution in `tasked` mode (the player drives a tasked
 *                                         lieutenant manually; drift never overrides a tasked script).
 *   - `driftPhase === 'INCIDENTAL_LOCKED'` — only a LOCKED lieutenant substitutes; DIRECT_ALIGNED / DRIFTING / RESETTING
 *                                         take no impulse (the reliance has not displaced the explicit-order primacy).
 *   - `dominantCue !== 'DIRECT_ORDER'`  — defensive: a LOCKED drift's dominant is always an INCIDENTAL cue (by
 *                                         construction observeOutcome only locks on an incidental). DIRECT_ORDER as the
 *                                         dominant cannot occur under LOCKED, but we guard it so the override never
 *                                         "substitutes" the explicit order with itself.
 *   - the dominant cue is ACTIVE this tick — the INJECTED `activeCues` Set (the tick's ONE deriveActiveCues result) must
 *                                         contain `dominantCue` (e.g. RESOURCE_AVAILABILITY is present iff
 *                                         snapshot.state.cook_idle === true). The override fires ONLY when the over-relied
 *                                         cue the lieutenant locked onto is actually present this tick — it injects the
 *                                         action the lieutenant WOULD take by reflex on that cue, not an unconditional cook.
 * `activeCues` is the SAME Set the measurement (observeOutcome) tallies — threaded in by the tick so the "same cue set"
 * contract is STRUCTURAL (one derivation), not two coincidentally-identical derivations. This function only READS the Set
 * (`.has`) — it NEVER mutates it (observeOutcome's `.delete('DIRECT_ORDER')` is fine: that runs LATER, and the tick passes
 * observeOutcome a COPY anyway — see lieutenant-tick.service.ts).
 * The caller (combineByPriority) decides whether the impulse actually wins — it only FILLS A SILENCE (the script
 * resolved to NONE). DETERMINISTIC: every input is an argument; no ambient clock / RNG.
 */
export function resolveSubstitution(args: {
  mode: 'delegated' | 'tasked';
  driftPhase: DriftPhase;
  dominantCue: CueKind;
  activeCues: Set<CueKind>;
}): ResolvedAction | null {
  const { mode, driftPhase, dominantCue, activeCues } = args;
  if (mode !== 'delegated') return null; // Invariant 8: no substitution in tasked mode.
  if (driftPhase !== 'INCIDENTAL_LOCKED') return null; // only a LOCKED lieutenant substitutes.
  if (dominantCue === 'DIRECT_ORDER') return null; // defensive — won't happen under LOCKED by construction.
  if (!activeCues.has(dominantCue)) return null; // the dominant cue isn't present this tick → no impulse (READ only, no mutate).
  return { kind: 'EXECUTE_DEFAULT' };
}

/**
 * Combine the script's resolved verdict with an optional substitution impulse. The substitution only FILLS A SILENCE: if
 * the script already produced an action (PAUSE_OPS or its OWN EXECUTE_DEFAULT), that WINS — the override never overrides an
 * explicit directive (PAUSE / an explicitly-commanded EXECUTE_DEFAULT both beat the impulse). The impulse applies ONLY when
 * the script resolved to NONE (no rule's trigger matched → the script is silent this tick). Returns `{ action, substituted }`
 * so the caller knows whether a substitution actually occurred (and thus whether to emit the T4 substitution audit). PURE.
 *
 *   scriptVerdict.kind !== 'NONE'  → the script spoke → it wins  → { action: scriptVerdict, substituted: false }
 *   scriptVerdict.kind === 'NONE' && subImpulse !== null → silence filled → { action: subImpulse, substituted: true }
 *   scriptVerdict.kind === 'NONE' && subImpulse === null → still silent → { action: scriptVerdict (NONE), substituted: false }
 */
export function combineByPriority(
  scriptVerdict: ResolvedAction,
  subImpulse: ResolvedAction | null,
): { action: ResolvedAction; substituted: boolean } {
  // The override fills ONLY a silence: it fires iff the script resolved to NONE AND an impulse exists. Otherwise the script
  // verdict stands (a non-NONE directive wins; a NONE with no impulse stays silent — both are { scriptVerdict, false }).
  if (scriptVerdict.kind === 'NONE' && subImpulse !== null) return { action: subImpulse, substituted: true };
  return { action: scriptVerdict, substituted: false };
}
