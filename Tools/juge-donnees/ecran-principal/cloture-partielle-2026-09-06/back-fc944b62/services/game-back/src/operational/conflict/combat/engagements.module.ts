// IMPLEMENTS: docs/superpowers/specs/2026-08-12-w6.1-combat-production-design.md §4 C3, §5 (rayon —
//             Modules Nest: "nouveau EngagementsController dans CombatModule (ou un module dédié
//             important CombatModule + LieutenantModule)")
//             — W6.1 C3 — 2026-08-13 —
//
// `EngagementsModule` — the DEDICATED module for `EngagementsController` (`POST /v1/me/engagements`).
//
// NOT folded into `CombatModule`: `LieutenantModule` already imports `CombatModule` (so
// `MuscleBindingService` can inject `CombatService` — `lieutenant.module.ts:63,263`). Had
// `CombatModule` imported `LieutenantModule` back (for `LieutenantRepository`), that would be a
// 2-module cycle. A SIBLING module importing BOTH is cycle-free — neither `CombatModule` nor
// `LieutenantModule` imports this one.
//
// Zero-regression: ADDITIVE only — a brand-new module, registered once in `AppModule`. No existing
// module's imports/exports/providers/controllers changed.

import { Module } from '@nestjs/common';

import { CombatModule } from './combat.module';
import { LieutenantModule } from '../../lieutenant/lieutenant.module';
import { EngagementsController } from './engagements.controller';

@Module({
  imports: [CombatModule, LieutenantModule],
  controllers: [EngagementsController],
})
export class EngagementsModule {}
