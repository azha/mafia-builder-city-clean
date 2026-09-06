// IMPLEMENTS: docs/tech/09_data_model/schema_player_economy_state.md §2 (economy_states.cash_cents — the player wallet,
//             Phase-1/0 table) + docs/tech/04a_operational_systems/precursors_supply_chain.md §Cross-cutting
//             (PrecursorsRepository.getWalletCents — the identical economy_states.cash_cents read this mirrors)
//             -- session:2026-06-04 (economy wallet-band projection) --
//             -- W1.3-C2 (2026-08-13, design §4-D2): getWalletCents REPLACED by getWalletAndMarks — the ONE
//             shared resolver both /v1/economy/wallet (EconomyProjectionService.projectWallet, ignores
//             .marks explicitly) and /v1/me/iap/balance (IapController.getBalance, C2 — review ⊥ M6
//             fixed a wrong symbol name here, "IapBalanceService", which never existed) read through. --
//
// `EconomyRepository` — the persisted access layer for the M1 wallet-band projection AND the C2 Marks
// balance read. Copies the persisted-system repository template (PrecursorsRepository.getWalletCents): a
// thin `*.repository.ts` owning the raw Drizzle read with an EXPLICIT column list.
//
// R9.3: 09 is the source of truth for `economy_states` (a Phase-1/0 table). This file IMPORTS the existing schema and
// NEVER re-declares it. The runtime role app_rw has SELECT on economy_states (0013) — a pure read; this projection
// never mutates the wallet.

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../db/db.module';
import type { DrizzleClient } from '../db';
import { economyState } from '../db/schema/player_economy_state';

@Injectable()
export class EconomyRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Read the player's wallet balance (cash_cents) AND Marks balance in ONE query — the SHARED
   * resolver design §4-D2 requires: /v1/economy/wallet's projection reads this and explicitly
   * IGNORES `.marks` (R2.2 — the wallet endpoint stays cash-only, design §5-A2); /v1/me/iap/balance
   * (C2) reads this and uses ONLY `.marks`. Returns null when the player has no economy_states row
   * (the caller surfaces a clean 404).
   */
  async getWalletAndMarks(playerId: string): Promise<{ cash_cents: bigint; marks: number } | null> {
    const rows = await this.db
      .select({ cash_cents: economyState.cash_cents, marks: economyState.marks })
      .from(economyState)
      .where(eq(economyState.player_id, playerId))
      .limit(1);
    return rows[0] ?? null;
  }
}
