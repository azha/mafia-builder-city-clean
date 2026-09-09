// IMPLEMENTS: docs/tech/04_city_simulation/system_6_inspection_queue.md §Invariant 4 (D2 R9 spec-fix
//             2026-06-17 — TEST-ONLY probe for the R9 INFORMANT inject counter, defeats BLOCKING-2's
//             vacuous ≥0 assertion) + 18 envelope/versioning (/v1, ResponseEnvelope) §_test routes
//             (env-gate R-EC-2).
//             W6a C1.0 (2026-08-08, docs/superpowers/specs/2026-08-07-w6a-authz-remediation-design.md
//             §2bis X9 + §3 C1.0 item 5): this route MOVED HERE, unchanged in behavior, from
//             `inspection.controller.ts`. It used to be mounted on the production
//             `InspectionQueueController` UNCONDITIONALLY (C0 §1.3 — "`_test` on a PRODUCTION
//             controller, joignable even in NODE_ENV=production"). The route's OWN comment admitted
//             the contradiction: "NOT registered in production" directly above code that registered it
//             unconditionally. Moving it into its own `*-test.controller.ts`, gated by
//             `testControllersEnabled()` like the other 34 test controllers in this codebase, closes
//             that gap — no NEW authentication is added (this is a read of an in-memory, server-only
//             counter; option (a) of the design's two, chosen because it matches the established
//             convention rather than inventing a new "test route with a JWT" shape).
//
// `InspectionQueueTestController` — the TEST-ONLY inject-count probe:
//   GET /v1/_test/citysim/inspection/mis-inject-counter — TEST-ONLY inject-count probe (D2 R9 spec-fix).
//
// Mounted ONLY when NODE_ENV != 'production' (InspectionQueueModule.controllers,
// `testControllersEnabled()` — the same production-gating as heat-test.controller.ts /
// deal-lek-test.controller.ts / the other 34 `*-test.controller.ts` files). In NODE_ENV=production the
// route is not registered → 404.

import { Controller, Get, HttpCode, Post, Query } from '@nestjs/common';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { InspectionQueueService } from './inspection.service';
import { FalseReportWindowDecayService } from './false-report-window-decay.service';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class InspectionQueueTestController {
  constructor(private readonly inspection: InspectionQueueService,
    private readonly decay: FalseReportWindowDecayService,
  ) {}

  /**
   * `GET /v1/_test/citysim/inspection/mis-inject-counter?playerId=<id>` — D2 R9 TEST-ONLY inject probe.
   *
   * Returns the number of times a HiddenCurriculumLeakMIS INFORMANT entry was ACTUALLY APPLIED
   * (enqueueWithOverflow called with source=INFORMANT inside runDispatchTick) for the given player
   * since this game-back process started. Read via InspectionQueueService.getMISInjectCount().
   *
   * Returns { playerId: string, injectCount: number }.
   *   injectCount === 0 → the inject path has NEVER fired for this player.
   *   injectCount >= 1  → the inject path ran ≥1× (inject genuinely exercised).
   *
   * Fresh-UUID players always start at 0 (counter is per-process, per-playerId). Used by D2 R9 spec
   * to defeat the vacuous `informantCount ≥ 0` assertion that passes even when the queue was empty.
   *
   * R2.2: server-only counter — never forwarded to a real client. TEST-ONLY.
   */
  @Get('_test/citysim/inspection/mis-inject-counter')
  misInjectCounter(
    @Query('playerId') playerId: string,
  ): { playerId: string; injectCount: number } {
    if (!playerId) {
      throw new ApiError('VALIDATION_FAILED', {
        message: '_test/citysim/inspection/mis-inject-counter requires playerId query param',
      });
    }
    return { playerId, injectCount: this.inspection.getMISInjectCount(playerId) };
  }

  /**
   * TD-517 — exécute le décai de fenêtre pour UN joueur, sans faire passer une nuit entière.
   *
   * ⚠️ POURQUOI CE SEAM EXISTE, et ce qu'il NE prouve pas. Faire franchir une frontière NIGHTLY par
   * l'ordonnanceur demande ~1440 ticks, chacun exécutant TOUS les systèmes enregistrés du joueur :
   * mesuré, l'appel HTTP dépasse largement la minute et deviendrait un point lent et fragile du gate.
   * Ce seam appelle donc la MÊME méthode publique que le tick (`decayForPlayer`) — zéro divergence de
   * calcul entre le chemin de test et le chemin réel.
   * ⛔ Mais il ne prouve RIEN du câblage : qu'il réponde ne dit pas que le système est enregistré à
   * NIGHTLY/34. C'est `GET /v1/_test/citysim/schedule` qui le dit, et la falsifiable interroge les
   * DEUX — la méthode par ici, l'inscription par là.
   */
  @Post('_test/citysim/false-report-window-decay')
  @HttpCode(200)
  async runFalseReportWindowDecay(
    @Query('player_id') playerId?: string,
  ): Promise<{ playerId: string; change: boolean }> {
    if (!playerId || !/^[0-9a-f-]{36}$/.test(playerId)) {
      throw new ApiError('VALIDATION_FAILED', { message: 'player_id must be a UUID' });
    }
    const r = await this.decay.decayForPlayer(playerId);
    return { playerId, change: r.change };
  }
}
