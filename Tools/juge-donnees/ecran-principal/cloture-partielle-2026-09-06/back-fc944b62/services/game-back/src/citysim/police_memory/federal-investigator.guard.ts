// IMPLEMENTS: docs/superpowers/plans/2026-07-04-04e-A-political-engine-plan.md C7 (★ Substrate 2 — federal investigator)
//             Design: docs/superpowers/specs/2026-07-04-04e-A-political-engine-design.md §4.2 (federal investigator)
//               + §9 item 3 (E-POL-11 honest-scaffolding immunity — RULED, locked: "immunity proven by a
//               rejection assertion, not a live contest")
//             — 04e-A1 C7 — 2026-07-04
//
// `attemptCorruptClerkMutation` — the HONEST-SCAFFOLDING guard the plan's C7 detail + design §9 item 3
// specify. ⚠️ CORRIGÉ 2026-08-08 : la prémisse « `clerk` is a RESERVED IATargetType with no live
// caller » qui figurait ici est FAUSSE depuis 04f-B — `clerk` a un appelant de PRODUCTION
// (recruitment-quest.service.ts:336, via @Post('recruitment/quests/:id/advance') + JwtAuthGuard).
// Ce qui reste VRAI, et qui est le seul point porteur pour cette garde : `recordCorruptUse` (:258) mutate
// `internal_affairs_targets`, never `precinct_memory.suspicion_map` (nor, now, `federal_investigators`).
// Building a LIVE corruption-vs-investigator contest is explicitly OUT of scope here — plan §Deferred:
// "the general corrupt-clerk↔federal live contest (§4.2, inert today)".
//
// What THIS function proves instead: a single, REAL guard gated on an investigator structure's
// `corruption_exempt` flag.
//   - `corruption_exempt=true`  (every `federal_investigators` row, C7 — ALWAYS true, the honest-
//     scaffolding immunity flag, design §9 item 3) → REJECTED, unconditionally.
//   - `corruption_exempt=false` (what the LOCAL `precinct_memory` model would be, IF its own —
//     separately still-inert — mutation path were gated by this SAME guard) → ACCEPTED.
// Both branches are exercised by THIS ONE function (never two divergent code paths), so the guard
// cannot be a fig-leaf that rejects regardless of the flag — `substrate_federal_investigator.spec.ts`
// calls it with both flag values (one read from a REAL spawned `federal_investigators` row, one as the
// explicit counter-proof) and asserts opposite outcomes.
//
// Pure, no DB, no scheduler, no production call site (that IS the honest scaffolding — see the design
// note above: this is a targeted rejection ASSERTION, not a live mutation pathway). Exposed to the E2E
// via the test-only `POST /_test/effect-engine/federal-investigator/attempt-clerk-mutation` route
// (effect-engine-test.controller.ts, R-EC-2).

/** The investigator-structure fact this guard gates on (the ONLY input it needs). */
export interface CorruptClerkMutationTarget {
  /** `federal_investigators.corruption_exempt` (or the LOCAL model's hypothetical equivalent). */
  readonly corruptionExempt: boolean;
}

export interface CorruptClerkMutationResult {
  readonly accepted: boolean;
  readonly reason: string;
}

export function attemptCorruptClerkMutation(target: CorruptClerkMutationTarget): CorruptClerkMutationResult {
  if (target.corruptionExempt) {
    return {
      accepted: false,
      reason:
        'corruption_exempt=true — the federal investigator structure rejects the corrupt-clerk suspicion ' +
        'mutation attempt (design §9 item 3, honest-scaffolding immunity).',
    };
  }
  return {
    accepted: true,
    reason:
      'corruption_exempt=false — a non-exempt (local-shaped) suspicion structure would accept the mutation; ' +
      'the general clerk path itself stays inert elsewhere (ia-target.service.ts:28,34,258).',
  };
}
