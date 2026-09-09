// IMPLEMENTS: docs/superpowers/specs/2026-08-09-w1.1b-overlay-engine-design.md §4 chunks C2/C3/C4
//             (D5/D9/D3/D4).
//             Canon: docs/tech/08c_remaining_screens/screen_c8_first_time_tutorial.md §4/§11
//             (`ui.tutorial.state.get` `:177,345`; `ui.tutorial.progress` `:178`, body
//             `{ tutorial_id }` — `shown_at` is a SERVER stamp, `tutorial_state.shown_at DEFAULT now()`
//             migration 0146, never a client-supplied value, see this file's C3 note below; opt-out
//             toggle `:165,227` — REDIRECTED off the non-existent `SettingsPayload` onto `player_
//             progression_state.tutorials_opt_out`, design D4, its OWN NEW route, not `PATCH
//             /v1/me/settings`).
//             Catalogue: docs/tech/18_api_protocol/endpoint_catalogue.md §Domaine ui-state (C1 already
//             added `ui.tutorial.state.get`/`ui.tutorial.progress`; C4 ADDS `ui.tutorial.opt_out.set`
//             — SAME commit as this route, per this dépôt's own "catalogue amended in the commit that
//             ships the route" convention, `p3-D-cue-annealing-decisions.md:154`).
//             Precedent (route form + JWT-derived playerId): `meta_progression/horizon-feed.
//             controller.ts:34,48-54` (`@Controller({version: String(CURRENT_API_MAJOR)})` +
//             `@Get('meta/horizon-feed')` + `resolvePlayerId(req.account!.account_id)` under
//             `@UseGuards(JwtAuthGuard)`).
//             — W1.1-b C2 — 2026-08-09 — C3 — 2026-08-09 — C4 — 2026-08-09 — C5 — 2026-08-09 —
//
// ★ W1.1-c C2 note — `GET /v1/ui/tutorial-state` NOW also composes `DisclosureScheduleService
// .resolveNextTutorialId()` (design docs/superpowers/specs/2026-08-09-w1.1c-disclosure-design.md §4
// chunk C2, D10): a THIRD distinct type, `NextTutorialIdPointer` (`disclosure-schedule.service.ts`),
// merged the SAME way C5 already merges `EligibleOverlaySet` — never a field grafted onto
// `TutorialStateComposite` itself (that type keeps its canon 2 fields, `screen_c8:334`, untouched by
// this chunk too). The pointer is derived from the resolver's OWN `eligible_tutorial_ids` — it never
// re-queries eligibility on its own.
//
// ★ W1.1-c C3 note — `resolveNextTutorialId` is now `async` and takes `playerId` (design §4 chunk C3,
// D4 "le verrou dérivé" — the "au plus un PAR SESSION" cap needs the active session + a `tutorial_state`
// read; see that file's own header for the two reads and why the common case pays neither).
//
// ★ C5 note — `GET /v1/ui/tutorial-state` NOW also composes `OnboardingOverlayResolver
// .resolveEligibleOverlays()` (design D2/D9): a DISTINCT class (`onboarding-overlay.resolver.ts`'s own
// header), never a 3rd field on `TutorialStateComposite` itself — the response merges the composite's
// OWN 2 fields with the resolver's OWN `EligibleOverlaySet` (1 field, `eligible_tutorial_ids`), two
// separate TS types composed at the CONTROLLER boundary, exactly how `SessionOpenSequencePayload`
// composes many distinct glance types into one response (never one interface growing a field per
// producer). Still hors chemin critique cold-open (D9) — this route is the ONLY caller of the resolver,
// `session/open` gains nothing (see that file's own non-regression proof, C6).
//
// ⛔ C4 note — the opt-out bascule was the ONLY route in the v1 design without disclosed authz
// coverage (design §4 C4: "C4 était la SEULE route sans couverture d'autorisation — et c'est une
// ÉCRITURE"). Both mandatory falsifiables (no JWT → 401; player A never bascules player B's opt-out)
// are covered below by the SAME `resolvePlayerId(req.account!.account_id)` + `@UseGuards(JwtAuthGuard)`
// shape every other route in this controller already uses — no special-casing, no shortcut.
//
// `TutorialOverlayController` — the 3 player routes under `/v1/ui/…` (design D5). ⚠️ **Divergence
// disclosed, per this dépôt's own convention** (`cue-stack.controller.ts:4`, `annealing.controller.ts:6`):
// screen_c8 (`:177-179`) writes these routes under `/v1/me/ui/…`; this controller ships them under
// `/v1/ui/…` instead — a house convention tranchée par la mesure, NOT an ad-hoc choice (design §0.8/D5:
// `/v1/me` is identity-only in this codebase, `04f-B-recruitment-decisions.md:363`; player-domain
// controllers live at `/v1/<domain>`, `p3-D-cue-annealing-decisions.md:117-119,154`). The catalogue
// (18) carries the REAL paths — see C1's own amendment of `endpoint_catalogue.md §ui-state`.
//
// ⛔ `playerId` is ALWAYS derived from the verified JWT (`req.account!.account_id` → the 1-1 player
// bridge below), NEVER from a header/param/body. This dépôt carries 8 LIVE unauthenticated IDOR
// handlers via the inverse motif (`@Headers('x-player-id')`, CLAUDE.md) — this controller does not
// add a 9th.
//
// ★ C3 note — `shown_at` is NEVER read from the request body, despite the canon literal `Body: {
// tutorial_id, shown_at }` (`:178`). `tutorial_state.shown_at` is a server-stamped `DEFAULT now()`
// column (migration 0146) — trusting a client-supplied timestamp for security-relevant bookkeeping
// (idempotence auditing) would be a foot-gun this codebase's own "anti-fabrication: no Math.random(),
// no non-deterministic defaults beyond now() at insert time" convention (`tutorial_state.ts`'s own
// header) already rules out. Consigned as a Deviation (implementation-notes.md) — a conservative,
// smaller-surface reading, not a silent narrowing of the canon body.

import { Body, Controller, Get, Inject, HttpCode, Patch, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../protocol/versioning';
import { ApiError } from '../protocol/api-error';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../auth/authenticated-request';
import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { account } from '../db/schema/account';
import { player } from '../db/schema/player';
import { TutorialOverlayService, type TutorialStateComposite } from './tutorial-overlay.service';
import { TutorialOptOutService } from './tutorial-opt-out.service';
import { OnboardingOverlayResolver, type EligibleOverlaySet } from './onboarding-overlay.resolver';
import { DisclosureScheduleService, type NextTutorialIdPointer } from './disclosure-schedule.service';
import { rejectUnknownFields } from '../common/param-pipes';

@Controller({ version: String(CURRENT_API_MAJOR) })
export class TutorialOverlayController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly tutorialOverlay: TutorialOverlayService,
    private readonly tutorialOptOut: TutorialOptOutService,
    private readonly overlayResolver: OnboardingOverlayResolver,
    private readonly disclosureSchedule: DisclosureScheduleService,
  ) {}

  /**
   * `GET /v1/ui/tutorial-state` (`ui.tutorial.state.get`, catalogue 18) — the requesting player's
   * `TutorialStateComposite` (`screen_c8:334`) COMPOSED with the resolver's OWN `EligibleOverlaySet`
   * (C5 — `onboarding-overlay.resolver.ts`, D2) AND the schedule's `NextTutorialIdPointer` (W1.1-c C2 —
   * `disclosure-schedule.service.ts`, D10): THREE DISTINCT TS types merged into one response object,
   * never a field grafted onto `TutorialStateComposite` itself (design closure, C6 asserts this
   * statically). Hors chemin critique cold-open (design D9 — never called from `session/open`);
   * cacheable client-side. Requires a PLAYER JWT (no token → 401). D8-1: recomputed on EVERY call, no
   * caching anywhere in this path — `next_tutorial_id` is derived from the freshly-resolved
   * `eligible_tutorial_ids` PLUS a fresh per-session cap read (W1.1-c C3, D4 — never cached, never a
   * snapshot).
   */
  @Get('ui/tutorial-state')
  @UseGuards(JwtAuthGuard)
  async getState(
    @Req() req: RequestWithAccount,
  ): Promise<TutorialStateComposite & EligibleOverlaySet & NextTutorialIdPointer> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const [composite, eligible] = await Promise.all([
      this.tutorialOverlay.getTutorialState(playerId),
      this.overlayResolver.resolveEligibleOverlays(playerId),
    ]);
    const next_tutorial_id = await this.disclosureSchedule.resolveNextTutorialId(playerId, eligible.eligible_tutorial_ids);
    return { ...composite, ...eligible, next_tutorial_id };
  }

  /**
   * `PATCH /v1/ui/tutorial` (`ui.tutorial.progress`, catalogue 18) — consign ONE `tutorial_id` as
   * shown for the requesting player (`screen_c8:178,344`). Idempotent: a repeated call for the SAME
   * id succeeds again (never 409 — the design's own C3 falsifiable). `tutorial_id` outside the closed
   * catalogue (D3) → 422 `VALIDATION_FAILED` (`TutorialOverlayService.markShown`'s own guard). 200 (a
   * mutation on an existing composite, not a resource creation — mirrors `POST .../defer`'s own
   * `HttpCode(200)` convention, `horizon-feed.controller.ts:64-65`). Requires a PLAYER JWT.
   */
  @Patch('ui/tutorial')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async markShown(
    @Body() body: { tutorial_id?: unknown },
    @Req() req: RequestWithAccount,
  ): Promise<{ tutorial_id: string; shown: true }> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['tutorial_id']);

    if (typeof body?.tutorial_id !== 'string' || body.tutorial_id.length === 0) {
      throw new ApiError('VALIDATION_FAILED', { message: 'tutorial_id is required and must be a non-empty string.', details: { param: 'tutorial_id' } });
    }
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    await this.tutorialOverlay.markShown(playerId, body.tutorial_id);
    return { tutorial_id: body.tutorial_id, shown: true };
  }

  /**
   * `PATCH /v1/ui/tutorial-opt-out` (`ui.tutorial.opt_out.set`, catalogue 18, C4 NEW route — design D4
   * redirected this off the non-existent `/v1/me/settings`). Explicit SET (`{ tutorials_opt_out:
   * boolean }` body), never a flip. Reversible in both directions; does NOT re-arm already-`shown`
   * ids on `false` (`screen_c8:227` — structural, `TutorialOptOutService`'s own header). ⛔ Requires a
   * PLAYER JWT (no token → 401) and is IDOR-safe (`playerId` from the verified JWT, same as every
   * other route here) — the ONE route the v1 design shipped WITHOUT disclosed authz coverage; both
   * falsifiables are mandatory here (design §4 C4).
   */
  @Patch('ui/tutorial-opt-out')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async setOptOut(
    @Body() body: { tutorials_opt_out?: unknown },
    @Req() req: RequestWithAccount,
  ): Promise<{ tutorials_opt_out: boolean }> {
    // TD-451 (chantier P5, lot 4 « le reste de la surface joueur ») — la garde de champs inconnus.
    // Allowlist tirée de la table ratifiée `tests/e2e/conventions/body-field-classes.ts`, jamais d'une
    // lecture à la main. Contrôle de non-régression avant durcissement : 363 sites d'appel reconnus,
    // 0 hors allowlist AU PREMIER NIVEAU — le seul niveau que cette garde regarde.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['tutorials_opt_out']);

    if (typeof body?.tutorials_opt_out !== 'boolean') {
      throw new ApiError('VALIDATION_FAILED', { message: 'tutorials_opt_out is required and must be a boolean.', details: { param: 'tutorials_opt_out' } });
    }
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    await this.tutorialOptOut.setOptOut(playerId, body.tutorials_opt_out);
    return { tutorials_opt_out: body.tutorials_opt_out };
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge —
   *  copied verbatim from `horizon-feed.controller.ts`'s own established per-controller idiom, this
   *  codebase's convention, never a shared helper). 404 if none. */
  private async resolvePlayerId(accountId: string): Promise<string> {
    const rows = await this.db
      .select({ player_id: player.player_id })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .where(and(eq(player.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    const playerId = rows[0]?.player_id;
    if (!playerId) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No player profile for this account.' });
    }
    return playerId;
  }
}
