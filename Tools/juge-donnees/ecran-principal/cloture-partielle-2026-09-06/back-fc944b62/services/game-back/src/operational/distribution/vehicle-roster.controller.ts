// IMPLEMENTS: docs/superpowers/specs/2026-06-22-system9-route-lifecycle-9b-design.md §5.1 DD-ROSTER
//             System 9b C11 — `POST /v1/operational/vehicles/purchase`
//
// Player-facing endpoint to purchase a vehicle by paying the diegetic equipment cost.
// DIV-R1: cash-only (debitWallet). NO hub-tier gating (9c-deferred).
// Returns 409 RESOURCE_STATE_CONFLICT on insufficient cash.
// Returns 422 VALIDATION_FAILED on unknown vehicle type.
//
// Player resolution: JwtAuthGuard + PlayerIdentityService (req.account.account_id → player_id, P-B) —
// W6a C1.0 (2026-08-08, docs/superpowers/specs/2026-08-07-w6a-authz-remediation-design.md §2bis X1):
// this was THE worst finding of the whole audit — `purchaseVehicle(playerId, …)` debits up to
// $25,000 (refrigerated_van) on the say-so of an unauthenticated `x-player-id` header, no credential
// required at all. Now guarded + the header is gone from the signature entirely.

import { Body, Controller, Post, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { ApiError } from '../../protocol/api-error';
import { enumField, rejectUnknownFields } from '../../common/param-pipes';
import { vehicleType as vehicleTypePg } from '../../db/schema/operational_chain';
import { VehicleRosterService } from './vehicle-roster.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { PlayerIdentityService } from '../../auth/player-identity.service';
import { CURRENT_API_MAJOR } from '../../protocol/versioning';

// ★ W6a C1.0 (2026-08-08) — PATH BUG, found by the first test that ever called this route.
// This was `@Controller('v1/operational/vehicles')`: a LITERAL path containing `v1`, while
// `main.ts:47` enables URI versioning with `defaultVersion: '1'` (`protocol/versioning.ts:34-36`).
// A controller with no explicit `version` therefore gets the `/v1` prefix ON TOP of its literal
// path — the route actually served was `/v1/v1/operational/vehicles/purchase`, contradicting this
// file's own header (`POST /v1/operational/vehicles/purchase`) and the §5.1 DD-ROSTER design.
// Nothing in the repo ever called it (`grep -rEn "vehicles/purchase" tests/` → only the C1.0 spec
// written today), which is exactly why a "player-facing endpoint" could sit unreachable at its own
// documented path without anyone noticing. Aligned onto the form both siblings in this directory
// already use (`route.controller.ts:56`, `distribution.controller.ts:53`): version on the
// controller, full path on the method. Breaks no caller — there were none.
@Controller({ version: String(CURRENT_API_MAJOR) })
export class VehicleRosterController {
  constructor(
    private readonly vehicleRoster: VehicleRosterService,
    // W6a C1.0 — the P-B identity resolver (req.account.account_id → player_id). REUSE, not a 55th copy.
    private readonly playerIdentity: PlayerIdentityService,
  ) {}

  /**
   * `POST /v1/operational/vehicles/purchase`
   * Body: { vehicle_type: string }
   * Player resolution: JwtAuthGuard + PlayerIdentityService (W6a C1.0).
   *
   * Purchases a vehicle by debiting the canon equipment cost (DIV-R1 cash-only).
   * foot = $0 (always purchasable). Other vehicles cost $400/$8k/$25k.
   * 409 on insufficient cash. 422 on unknown vehicle type.
   */
  @Post('operational/vehicles/purchase')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async purchaseVehicle(
    @Body() body: { vehicle_type?: string },
    @Req() req: RequestWithAccount,
  ): Promise<{ ok: boolean }> {
    // TD-451 (chantier P5, lot 1 « l'argent ») — la garde de champs inconnus. Sans elle un corps
    // portant un nom de champ PLAUSIBLE mais faux est accepté en silence et la mutation part quand
    // même : mesuré sur l'achat en jetons, qui rendait 200 ET débitait. Allowlist tirée de la table
    // ratifiée `tests/e2e/conventions/body-field-classes.ts` (les champs de CETTE route), pas d'une
    // lecture à la main.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['vehicle_type']);

    const playerId = await this.playerIdentity.resolvePlayerId(req.account!.account_id);

    // L0.3 (D5) — vehicle_type: enum, `vehicleTypePg.enumValues` (DF-11) — replaces the hand-mirrored
    // `VALID_VEHICLE_TYPES` array, same 4-member domain (`db/schema/operational_chain.ts:47`).
    const vehicleTypeName = enumField(vehicleTypePg.enumValues, body as unknown as Record<string, unknown>, 'vehicle_type');

    const result = await this.vehicleRoster.purchaseVehicle(playerId, vehicleTypeName);
    if (!result.ok) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `purchase refused: insufficient cash for ${vehicleTypeName} (cost: ${vehicleTypeName === 'foot' ? 0 : vehicleTypeName === 'bike' ? 40000 : vehicleTypeName === 'car' ? 800000 : 2500000} cents).`,
      });
    }

    return { ok: true };
  }
}
