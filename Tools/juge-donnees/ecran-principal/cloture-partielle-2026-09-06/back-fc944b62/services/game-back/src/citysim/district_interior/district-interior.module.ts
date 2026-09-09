// IMPLEMENTS: docs/superpowers/plans/2026-08-17-w3u2-district-nuit-design.md §C2 (B-3 — route + guard +
//             wiring) -- session:2026-08-17 (W3.U2 C2) --
//
// `DistrictInteriorModule` — wires the district-interior diorama screen into the game-back modular
// monolith. Copies the HeatModule/RealEstateModule template: a thin module wiring C1's repository +
// projection service (consumed AS-IS, not re-opened) + this chunk's controller. Imports AuthModule
// (EXPORTS JwtAuthGuard — the controller's player resolution) + MaintenanceModule (EXPORTS
// MaintenanceRepository + MaintenancePhaseService — binding 5 + day_phase's shared current-tick read, the
// SAME cross-module-read shape `RealEstateModule` already uses for the SAME two providers, so no new
// coupling shape is introduced). Depends on the @Global() DbModule (the repository/controller inject DB).
//
// R9.3: no schema owned here, no persisted system — a pure READ projection + its route. Not registered in
// SchedulerModule (no tick-hook to register); a standalone module, the SAME shape HeatModule/RealEstateModule
// use.

import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { MaintenanceModule } from '../../operational/maintenance/maintenance.module';
import { DistrictInteriorRepository } from './district-interior.repository';
import { DistrictInteriorProjectionService } from './district-interior.projection.service';
import { DistrictInteriorController } from './district-interior.controller';
// TD-534 — GET /v1/me/buildings, additive: same repository (the sister query
// `listPlayerBuildingsAllDistricts`), same AuthModule-exported JwtAuthGuard, no new provider.
import { PlayerBuildingsController } from './player-buildings.controller';

@Module({
  imports: [AuthModule, MaintenanceModule],
  controllers: [DistrictInteriorController, PlayerBuildingsController],
  providers: [DistrictInteriorRepository, DistrictInteriorProjectionService],
})
export class DistrictInteriorModule {}
