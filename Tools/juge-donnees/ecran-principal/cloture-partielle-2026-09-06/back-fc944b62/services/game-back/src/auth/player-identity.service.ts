// IMPLEMENTS: docs/superpowers/specs/2026-08-07-w6a-authz-remediation-design.md §1 P-B (dérivation
//             d'identité) + §3 C1.0 (D0 option (c): C1.0 CRÉE ce service ; C1 l'ADOPTE plus tard)
//             -- W6a C1.0 (2026-08-08) --
//
// `PlayerIdentityService` — the SHARED account_id → player_id resolver (P-B, the geste-B primitive).
// Body REUSED VERBATIM from the maison étalon `operational/lieutenant/lieutenant.controller.ts:567`
// (F2/D4 of the design: 54 pre-existing copies of this exact query, in 2 non-equivalent variants — 42
// throwing `Promise<string>`, 12 nullable `Promise<string | null>`). This is where that body now lives
// for the files C1.0 touches (`route.controller.ts`, `vehicle-roster.controller.ts`,
// `distribution.controller.ts`). C7 (a separate, later chunk) converges the other ~44 copies — this
// chunk does NOT touch them (D0 §"Le point de couplage").
//
// Two explicit methods, the semantics carried in the NAME — never a single method with a boolean flag
// (a flag a call-site can flip silently is exactly the kind of vacuous-guard risk D1/D4 warn about):
//   - resolvePlayerId(accountId)       — THROWS ApiError('RESOURCE_NOT_FOUND') when no PLAYER profile
//     exists for this account. The default (matches D2's existence-masking 404 convention — absence of
//     a player profile behaves exactly like "the object you asked for doesn't exist").
//   - resolvePlayerIdOrNull(accountId) — returns `null` instead of throwing (the 12-copy nullable
//     variant), for call-sites that need to branch before erroring.
//
// The join: player.account_id → account.account_id, filtered account.kind = 'PLAYER' — the SAME 1-1
// Player↔Account bridge GET /v1/me and every other resolvePlayerId copy in this codebase uses.

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { account } from '../db/schema/account';
import { player } from '../db/schema/player';
import { ApiError } from '../protocol/api-error';

@Injectable()
export class PlayerIdentityService {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /** Resolve account_id → player_id via the 1-1 Player↔Account link (the GET /v1/me identity bridge). 404 if none. */
  async resolvePlayerId(accountId: string): Promise<string> {
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

  /** Same resolution as resolvePlayerId, but returns `null` instead of throwing when no PLAYER profile exists. */
  async resolvePlayerIdOrNull(accountId: string): Promise<string | null> {
    const rows = await this.db
      .select({ player_id: player.player_id })
      .from(player)
      .innerJoin(account, eq(account.account_id, player.account_id))
      .where(and(eq(player.account_id, accountId), eq(account.kind, 'PLAYER')))
      .limit(1);
    return rows[0]?.player_id ?? null;
  }
}
