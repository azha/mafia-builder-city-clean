// IMPLEMENTS: docs/superpowers/plans/2026-07-05-04e-A2-political-events-plan.md C0 (PoliticalModule DI shell)
//             Design: docs/superpowers/specs/2026-07-05-04e-A2-political-events-decisions.md (companion)
//             Architecture mirror: services/game-back/src/operational/effect_engine/effect-modifier.service.ts (C0 DI-anchor-stub form)
//             — 04e-A2 C0 — 2026-07-05
//
// `PoliticalEventService` — the DI-anchor stub for `PoliticalModule` (04e-A2, the 12-event political
// catalogue, G7). C0 = EMPTY SCAFFOLD: injects the seams later chunks build on top of
// (`EffectModifierService` for applyEvent/revertEvent/revertExpired, `CitySimSchedulerService` for the
// NIGHTLY calendar-tick registration at C2, `DB`/node-postgres for the C2/C3 repository reads/writes),
// and references `politicalEventsTunables` (the 34 already-registered `political_events.*` getters,
// A1-C1) directly to prove that base tunables layer is reachable from this module — mirrors
// `EffectModifierService`'s own C0 pattern exactly (`void TunablesStore;`).
//
// C1+ chunks will grow the catalogue/trigger/lifecycle logic in SIBLING files (per the plan's
// Architecture section: `political-event-catalogue.ts`, `political-calendar-tick.service.ts`,
// `political-trigger-evaluators.ts`, `political-event-lifecycle.service.ts`,
// `political-event-read.service.ts`, `political-event.repository.ts`) — this stub is the shared C0
// anchor those chunks extend or sit alongside, not a file that itself grows unboundedly.
//
// Zero-regression invariant: purely ADDITIVE at C0 — no existing table, service, tick, or path is
// touched.

import { Inject, Injectable } from '@nestjs/common';

import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { CitySimSchedulerService } from '../../citysim/scheduler/city_sim_scheduler.service';
import { EffectModifierService } from '../effect_engine/effect-modifier.service';
import { politicalEventsTunables } from '../effect_engine/effect-engine.tunables';

@Injectable()
export class PoliticalEventService {
  constructor(
    // C2+: applyEvent/revertEvent/revertExpired the 12-event catalogue's EventEffect[] through the
    // REAL, already-built A1 engine (no re-implementation).
    private readonly effectModifierService: EffectModifierService,
    // C2: registers the political calendar NIGHTLY tick (the exact slot is re-confirmed at C2 —
    // see this chunk's re-anchor findings: NIGHTLY/19 is no longer free, taken by 04d-C's
    // META_MARKET_ANTICHEAT_TICK; C2 must pick a free (cadence, order) slot before the federal
    // reconcile at NIGHTLY/20).
    private readonly scheduler: CitySimSchedulerService,
    // C2/C3: political_calendar_state / rival_elimination_ledger / political_district_signal_state
    // repository reads/writes.
    @Inject(DB) private readonly db: DrizzleClient,
  ) {
    // `politicalEventsTunables` is a plain module-level singleton (not a Nest provider token) —
    // referenced here to prove the 34 already-registered `political_events.*` getters (A1-C1) are
    // reachable from this module, mirroring EffectModifierService's own C0 TunablesStore reference.
    void politicalEventsTunables;
  }

  /** C0 boot-probe placeholder — proves the service constructed successfully (DI graph resolved). */
  ping(): { ok: true } {
    void this.effectModifierService;
    void this.scheduler;
    void this.db;
    return { ok: true };
  }
}
