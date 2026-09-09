// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C1 (boot keystone guard)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.2 phase 4a
//             Tunables: services/game-back/src/operational/news_beat/news-beat.tunables.ts
//             (`assertKeystoneProbabilityMutexBudget`, `KEYSTONE_PROBABILITY_MUTEX_CEILING`)
//             — 04g-C C1 — 2026-07-16
//
// `NewsBeatBootGuardService` — the REAL enforcement half of the keystone-probability mutex boot guard
// (the pure predicate lives in `news-beat.tunables.ts`, this service is the NestJS lifecycle wiring that
// makes it bite at actual application boot). `onModuleInit` reads the LIVE registry-first values (DB
// override > env > gdd/14 default, via `newsBeatTunables`) and calls `assertKeystoneProbabilityMutexBudget`
// — if a `tunable_overrides` row (or env override) pushes the summed cooper+sourceless probability above
// `KEYSTONE_PROBABILITY_MUTEX_CEILING` (0.30), this throws and NestJS's module bootstrap fails, so the
// process does not start serving with an invalid keystone configuration (mirrors the repo's own
// `MigrationRunner` posture: "isole l'échec ... du démarrage applicatif sur un schéma désynchronisé" —
// same idea applied to a tunable invariant instead of a schema one).
//
// No table/DB access here — this guard is PURE tunable-configuration validation (C1 scope: data
// foundation only, zero tick/generator/reader). Registered as a plain provider (not exported) in
// `NewsBeatModule` so Nest instantiates it eagerly and its `onModuleInit` runs at module init time.

import { Injectable, OnModuleInit } from '@nestjs/common';

import { newsBeatTunables, assertKeystoneProbabilityMutexBudget } from './news-beat.tunables';

@Injectable()
export class NewsBeatBootGuardService implements OnModuleInit {
  onModuleInit(): void {
    assertKeystoneProbabilityMutexBudget(
      newsBeatTunables.cooperFrameOnlyNoIncidentProbability,
      newsBeatTunables.sourcelessBeatPseudoEventProbability,
    );
  }
}
