// IMPLEMENTS: docs/tech/09_data_model/schema_player_economy_state.md §2 (economy_states — the wallet read) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — the projection band)
//             -- session:2026-06-04 (economy wallet-band projection) --
//
// `EconomyModule` — wires the M1 wallet-band projection (GET /v1/economy/wallet) into the game-back modular monolith.
// Copies the persisted-read module template (the operational projection modules):
//   - the REPOSITORY (EconomyRepository) owns the raw Drizzle read against economy_states (Phase-1/0) — R9.3, it READS
//     the schema, never redefines it.
//   - the PROJECTION (EconomyProjectionService) maps the raw cash_cents → the qualitative wallet band (R2.2 — the only
//     raw→band mapper; no raw cents leave it).
//   - the player-facing CONTROLLER (EconomyController) exposes the projection under /v1.
//
// Imports AuthModule (EXPORTS JwtAuthGuard — the controller's player resolution). Depends on the @Global() DbModule
// (the repository/controller inject the DB provider). EXPORTS the projection so a later consumer (e.g. a dashboard
// aggregate endpoint) could inject it.
//
// W1.3-C2 (design §4-D2): also EXPORTS EconomyRepository — IapModule imports EconomyModule to inject it directly
// (the SHARED getWalletAndMarks resolver both /v1/economy/wallet and /v1/me/iap/balance read through).

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { EconomyRepository } from './economy.repository';
import { EconomyProjectionService } from './economy.projection.service';
import { EconomyController } from './economy.controller';

@Module({
  imports: [AuthModule],
  controllers: [EconomyController],
  providers: [EconomyRepository, EconomyProjectionService],
  exports: [EconomyProjectionService, EconomyRepository],
})
export class EconomyModule {}
