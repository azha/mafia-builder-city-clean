// IMPLEMENTS: docs/tech/08c_remaining_screens/screen_c2_iap_shop.md §2 (endpoint table — `GET
//             /v1/iap/catalogue`, C1; `GET /v1/me/iap/balance`, C2; `POST
//             /v1/me/iap/items/purchase`, C3; `POST /v1/iap/purchase/validate`, C4; `GET
//             /v1/me/iap/entitlements`, C3) + IapController §10.
// -- W1.3-C1 -- 2026-08-13 -- (GET /v1/iap/catalogue)
// -- W1.3-C2 -- 2026-08-13 -- (GET /v1/me/iap/balance — resolvePlayerId bridge added, verbatim
//    `PrecursorsController.resolvePlayerId` / `economy.controller.ts`'s own copy of it — "each
//    controller keeps its own copy" convention, not shared, per that file's own header.)
// -- W1.3-C3 -- 2026-08-13 -- (POST /v1/me/iap/items/purchase — the body does NOT accept
//    cost_marks, the server resolves the price from the catalogue, design §3-C3 anti-tamper
//    deviation; GET /v1/me/iap/entitlements — not itemized verbatim in C3's own "Livre" bullet,
//    added as the only reader of a table that would otherwise have zero, consigned as a Deviation
//    in implementation-notes.md.)
// -- W1.3-C4 -- 2026-08-13 -- (POST /v1/iap/purchase/validate — the real-money receipt-validate
//    route. Fail-closed by construction: an unverified receipt never reaches the credit path,
//    §1.8. Statut par environnement écrit noir sur blanc, design §3-C4 table.)
//
// `IapController` — the PLAYER-FACING IAP surface. One controller accreting routes chunk by chunk
// (mirrors `LiveOpsAdminController`'s own incremental-route convention) rather than one file per
// route, since every route here shares the SAME identity bridge (`resolvePlayerId`) and the SAME
// catalogue/tunables dependencies.

import { Body, Controller, Get, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { CURRENT_API_MAJOR } from '../../protocol/versioning';
import { ApiError } from '../../protocol/api-error';
import { Idempotent } from '../../protocol/idempotent.decorator';
import { enumField, rejectUnknownFields } from '../../common/param-pipes';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { account } from '../../db/schema/account';
import { player } from '../../db/schema/player';
import { iapPlatformPg, type IapPlatformEnumTs } from '../../db/schema/player_economy_state';
import { IapCatalogueService, type IapCatalogueEntryView } from './iap-catalogue.service';
import { EconomyRepository } from '../economy.repository';
import { findIapSku } from './iap-sku-catalogue';
import { IapSkuOverrideRepository } from './iap-sku-override.repository';
import { IapEntitlementRepository } from './iap-entitlement.repository';
import { IapPurchaseService } from './iap-purchase.service';
import { IapPurchaseValidateService } from './iap-purchase-validate.service';

interface PurchaseItemBody {
  sku_id?: string;
}

interface PurchaseValidateBody {
  platform?: IapPlatformEnumTs;
  receipt?: string;
}

@Controller({ version: String(CURRENT_API_MAJOR) })
export class IapController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly catalogue: IapCatalogueService,
    private readonly economyRepo: EconomyRepository,
    private readonly overrideRepo: IapSkuOverrideRepository,
    private readonly entitlementRepo: IapEntitlementRepository,
    private readonly purchaseService: IapPurchaseService,
    private readonly purchaseValidateService: IapPurchaseValidateService,
  ) {}

  /**
   * `GET /v1/iap/catalogue` — every ENABLED SKU (design F-C1). JWT required (any authenticated
   * player — the catalogue itself carries no per-player data, unlike the balance route below).
   */
  @Get('iap/catalogue')
  @UseGuards(JwtAuthGuard)
  async getCatalogue(): Promise<{ skus: IapCatalogueEntryView[] }> {
    return { skus: await this.catalogue.listEnabled() };
  }

  /**
   * `GET /v1/me/iap/balance` — `{ marks_balance }` (design F-C2). Reads through the SAME shared
   * resolver `/v1/economy/wallet` uses (`EconomyRepository.getWalletAndMarks`, design §4-D2) and
   * uses ONLY `.marks` — `cash_cents` is discarded here (the mirror image of `projectWallet`
   * discarding `.marks`). A player with no economy_states row → 404 (same convention as the wallet
   * projection; unreachable via signup in practice, R9.3-consistent with that route's own 404).
   */
  @Get('me/iap/balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@Req() req: RequestWithAccount): Promise<{ marks_balance: number }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const row = await this.economyRepo.getWalletAndMarks(playerId);
    if (!row) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: 'No wallet for this player.' });
    }
    return { marks_balance: row.marks };
  }

  /**
   * `POST /v1/me/iap/items/purchase` — Body: `{ sku_id }` ONLY (design §3-C3: NOT `cost_marks` —
   * a client-supplied price on a money route is a vulnerability by construction; the server
   * resolves the price from the catalogue). COSMETIC/SAVE_SLOT SKUs only (MARKS_PACK/SUPPORT are
   * real-money, C4's route). `@Idempotent({ required: true })` — a real mutation on a money path.
   */
  @Post('me/iap/items/purchase')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Idempotent({ required: true })
  async purchaseItem(
    @Body() body: PurchaseItemBody | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<{ sku_id: string }> {
    // TD-451 (chantier P5, lot 1 « l'argent ») — la garde de champs inconnus. Sans elle un corps
    // portant un nom de champ PLAUSIBLE mais faux est accepté en silence et la mutation part quand
    // même : mesuré sur l'achat en jetons, qui rendait 200 ET débitait. Allowlist tirée de la table
    // ratifiée `tests/e2e/conventions/body-field-classes.ts` (les champs de CETTE route), pas d'une
    // lecture à la main.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['sku_id']);

    const skuId = body?.sku_id;
    if (typeof skuId !== 'string' || skuId === '') {
      throw new ApiError('VALIDATION_FAILED', { message: 'Body must be { sku_id: string }.' });
    }
    const sku = findIapSku(skuId);
    if (!sku || (sku.kind !== 'COSMETIC' && sku.kind !== 'SAVE_SLOT')) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown or non-Marks-purchasable sku_id: ${JSON.stringify(skuId)}.`,
      });
    }
    const enabled = await this.overrideRepo.getEnabled(skuId);
    if (!enabled) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `SKU ${skuId} is currently disabled.` });
    }

    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const priceMarks = sku.resolveMarksPrice!();
    const result = await this.purchaseService.purchaseItemWithMarks(playerId, skuId, priceMarks);
    if (result === 'ALREADY_OWNED') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `Player already owns ${skuId}.` });
    }
    if (result === 'INSUFFICIENT_MARKS') {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `Insufficient marks to purchase ${skuId}.` });
    }
    return { sku_id: skuId };
  }

  /** `GET /v1/me/iap/entitlements` — every SKU this player owns (Marks-purchased, C3). */
  @Get('me/iap/entitlements')
  @UseGuards(JwtAuthGuard)
  async getEntitlements(@Req() req: RequestWithAccount): Promise<{ skus: string[] }> {
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    return { skus: await this.entitlementRepo.listForPlayer(playerId) };
  }

  /**
   * `POST /v1/iap/purchase/validate` — Body: `{ platform, receipt }`. Fail-closed by construction
   * (§1.8): production has NO verifier wired (`NullIapReceiptVerifier`, always null) — this route
   * is joignable (JWT, a real production controller) but NEVER credits there. In every other
   * environment, the SAME holds unless a `_test` route registered the exact (platform, receipt)
   * pair first (`FakeIapReceiptVerifier`'s allow-list is EMPTY by default). `@Idempotent` PLUS the
   * `iap_transactions_platform_receipt_uq` constraint (the REAL anti-replay — never a SELECT
   * first) both guard this route; a duplicate receipt replays the SAME success envelope.
   */
  @Post('iap/purchase/validate')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Idempotent({ required: true })
  async validatePurchase(
    @Body() body: PurchaseValidateBody | undefined,
    @Req() req: RequestWithAccount,
  ): Promise<{ marks_credited: number; sku_id: string }> {
    // TD-451 (chantier P5, lot 1 « l'argent ») — la garde de champs inconnus. Sans elle un corps
    // portant un nom de champ PLAUSIBLE mais faux est accepté en silence et la mutation part quand
    // même : mesuré sur l'achat en jetons, qui rendait 200 ET débitait. Allowlist tirée de la table
    // ratifiée `tests/e2e/conventions/body-field-classes.ts` (les champs de CETTE route), pas d'une
    // lecture à la main.
    rejectUnknownFields(body as unknown as Record<string, unknown>, ['platform', 'receipt']);

    // L0.3 (D5) — platform: enum, iapPlatformPg.enumValues (DF-11) — persisted at
    // `iap-purchase-validate.service.ts:67`; fail-closed today (NullIapReceiptVerifier never reaches
    // that write), so a garbage platform is latent, not yet observable as a 500 — it becomes one the
    // day a real verifier is wired, which is exactly the class this pipe closes. receipt: LIBRE
    // (opaque string, verifier-checked, never itself a typed column).
    const rawBody = (body ?? {}) as unknown as Record<string, unknown>;
    const platform = enumField(iapPlatformPg.enumValues, rawBody, 'platform') as IapPlatformEnumTs;
    const receipt = rawBody['receipt'];
    if (typeof receipt !== 'string' || receipt === '') {
      throw new ApiError('VALIDATION_FAILED', { message: 'Body must be { platform, receipt }.', details: { param: 'receipt' } });
    }
    const playerId = await this.resolvePlayerId(req.account!.account_id);
    const result = await this.purchaseValidateService.validatePurchase(playerId, platform, receipt);
    if (result.outcome === 'REJECTED') {
      throw new ApiError('VALIDATION_FAILED', { message: 'Receipt could not be verified.' });
    }
    return { marks_credited: result.marksCredited, sku_id: result.skuId };
  }

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity
   *  bridge — verbatim copy, `economy.controller.ts`'s own precedent). 404 if none. */
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
