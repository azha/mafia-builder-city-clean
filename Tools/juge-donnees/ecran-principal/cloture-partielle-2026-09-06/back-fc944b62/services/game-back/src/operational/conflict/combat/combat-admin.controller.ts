// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-B-combat-escalation-plan.md Task 12 (C-proj)
//             Design: docs/superpowers/specs/2026-06-24-04b-B-combat-escalation-design.md §11.2
//             Canon: combat_mechanics.md §BO-endpoints
//             Pattern: rival-admin.controller.ts (A's C9 — the direct precedent to mirror)
//             — Combat & Escalation B C-proj — 2026-06-25 —
//
// `CombatAdminController` — BO true-state endpoints for the B combat lot (P5 BO inversion).
//
// GET true-state endpoints (ops, role `gm`):
//   GET /v1/admin/rivals/:id/combat-state       — true-state: friction float + CPI + criticality +
//                                                  dead-hand reserve/threshold + dominance_rank +
//                                                  vulnerable_axis, BO-only scalars.
//   GET /v1/admin/escalation/global-state        — true-state: system_criticality raw float +
//                                                  cascade_threshold, BO-only.
//   GET /v1/admin/rivals/:id/dead-hand           — true-state: dead-hand cache (reserve/threshold/
//                                                  cache_script_ref), BO-only.
//   GET /v1/admin/conflict/interlock-state       — true-state: interlock cascade stats, BO-only.
//
// Action endpoints (admin, F3 DEFERRED):
//   POST /v1/admin/conflict/force-hazard-shift   — admin, F3 DEFERRED (TD-107 extend).
//   POST /v1/admin/conflict/simulate-cascade     — admin, F3 DEFERRED.
//
// 9c-C13 LESSON (anti-exploit): `requireStaffRole` is JWT-based — NOT the `x-staff-role` header.
//   A spoofed `x-staff-role` header WITHOUT a valid JWT must return 401/403.
//   The JWT guard in `staff-role.guard.ts` checks the JWT claims; the header has no effect.
//
// R2.2 / P5 inversion: the GET endpoints expose raw hidden scalars to ops/gm staff.
//   Player routes NEVER expose friction float, CPI, criticality, familiarity, or dead-hand scalars.
//
// F3 two-person rule: DEFERRED — same precedent as rival-admin/insurance-admin/reputation-admin.
//   The 2 action endpoints are gated by `requireStaffRole('admin')` only for now.
//   When ch17 TwoPersonApproval is implemented, replace with the F3 guard.
//
// NOT conditional on NODE_ENV — real production BO routes (same precedent as all other *-admin.controller.ts).

import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';

import { requireStaffRole } from '../../../auth/staff-role.guard';
import { CombatRepository } from './combat.repository';

const ALL_RIVAL_KEYS = ['coil', 'tarcum', 'iron_throat', 'saltline'] as const;

interface ForceHazardShiftBody {
  playerId: string;
  rivalKey: string;
}

interface SimulateCascadeBody {
  playerId: string;
}

@Controller('admin')
export class CombatAdminController {
  constructor(
    private readonly combatRepo: CombatRepository,
  ) {}

  /**
   * `GET /v1/admin/rivals/:id/combat-state`
   *
   * P5 BO INVERSION: returns the raw true combat state for ALL 4 rivals for a given player.
   * Exposed: system_criticality (global), per-rival CPI + resource_pressure + dominance_rank +
   * vulnerable_axis + partition_state + active_link_fraction + node_count (BO-only scalars).
   * Role: gm (≡ ops).
   *
   * 9c-C13 lesson: this guard is JWT-based (requireStaffRole). A spoofed x-staff-role header
   * WITHOUT a valid JWT returns 401/403 — the header has no effect on the guard.
   */
  @Get('rivals/:id/combat-state')
  @UseGuards(requireStaffRole('gm'))
  async getCombatState(@Param('id') playerId: string) {
    // Global escalation row (system_criticality — BO-only raw float).
    const globalRow = await this.combatRepo.readEscalationGlobal();

    // Per-rival true state (dead-hand scalars + B-owned rival_state combat columns).
    const rivals = await Promise.all(
      ALL_RIVAL_KEYS.map(async (rivalKey) => {
        const deadHand    = await this.combatRepo.readDeadHand(playerId, rivalKey);
        const combatCols  = await this.combatRepo.readRivalCombatState(playerId, rivalKey);
        const escalPair   = await this.combatRepo.readEscalationPair(playerId, rivalKey);
        const deescPair   = await this.combatRepo.readDeescalationPair(playerId, rivalKey);
        const flowState   = await this.combatRepo.readConflictFlow(playerId, rivalKey);

        return {
          rival_key: rivalKey,
          // B-owned rival_state combat columns (BO-only raw scalars — NEVER to player).
          active_link_fraction:         combatCols?.active_link_fraction ?? null,
          operational_graph_node_count: combatCols?.operational_graph_node_count ?? null,
          partition_state:              combatCols?.partition_state ?? null,
          // CPI + resource_pressure + dominance_rank from the B-owned rival_state columns.
          // (All are BO-only raw floats/ints — readRivalCombatState now includes them.)
          cumulative_pressure_index:    combatCols?.cumulative_pressure_index ?? null,
          resource_pressure:            combatCols?.resource_pressure ?? null,
          dominance_rank:               combatCols?.dominance_rank ?? null,
          vulnerable_axis:              combatCols?.vulnerable_axis ?? null,
          // Dead-hand true-state (BO-only — NEVER projected to player).
          dead_hand: deadHand
            ? {
                dead_hand_reserve:       deadHand.dead_hand_reserve,
                trigger_threshold:       deadHand.trigger_threshold,
                cache_script_ref:        deadHand.cache_script_ref,
                intelligence_revealed:   deadHand.intelligence_revealed,
              }
            : null,
          // Escalation pair (BO-only raw depth integer).
          conflict_memory_depth: escalPair?.conflict_memory_depth ?? null,
          resonance_factor:      escalPair?.resonance_factor ?? null,
          // De-escalation pair (BO-only raw familiarity float).
          familiarity_index:     deescPair?.familiarity_index ?? null,
          // Flow state (flow regime + raw downstream condition float).
          flow_regime:               flowState?.flow_regime ?? null,
          downstream_condition_raw:  flowState?.downstream_condition ?? null,
        };
      }),
    );

    return {
      player_id:         playerId,
      system_criticality: globalRow?.system_criticality ?? null,
      cascade_threshold:  globalRow?.cascade_threshold ?? null,
      rivals,
    };
  }

  /**
   * `GET /v1/admin/escalation/global-state`
   *
   * Returns the escalation_global_state true-state: system_criticality raw float +
   * cascade_threshold. BO-only (player never sees these scalars).
   * Role: gm (≡ ops).
   */
  @Get('escalation/global-state')
  @UseGuards(requireStaffRole('gm'))
  async getEscalationGlobalState() {
    const row = await this.combatRepo.readEscalationGlobal();
    return {
      seeded:             row !== null,
      system_criticality: row?.system_criticality ?? null,
      cascade_threshold:  row?.cascade_threshold ?? null,
    };
  }

  /**
   * `GET /v1/admin/rivals/:id/dead-hand`
   *
   * Returns the dead-hand cache true-state for all 4 rivals for a given player.
   * BO-only: dead_hand_reserve / trigger_threshold / cache_script_ref are NEVER exposed to players.
   * Role: gm (≡ ops).
   */
  @Get('rivals/:id/dead-hand')
  @UseGuards(requireStaffRole('gm'))
  async getDeadHandState(@Param('id') playerId: string) {
    const rivals = await Promise.all(
      ALL_RIVAL_KEYS.map(async (rivalKey) => {
        const row = await this.combatRepo.readDeadHand(playerId, rivalKey);
        return {
          rival_key: rivalKey,
          seeded:    row !== null,
          // BO-only true-state (NEVER to player):
          dead_hand_reserve:     row?.dead_hand_reserve ?? null,
          trigger_threshold:     row?.trigger_threshold ?? null,
          cache_script_ref:      row?.cache_script_ref ?? null,
          intelligence_revealed: row?.intelligence_revealed ?? null,
        };
      }),
    );

    return { player_id: playerId, rivals };
  }

  /**
   * `GET /v1/admin/conflict/interlock-state`
   *
   * Returns the interlock cascade stats for ops diagnostics.
   * BO-only: the escalation global + cascade dedup counts (no player scalars).
   * Role: gm (≡ ops).
   */
  @Get('conflict/interlock-state')
  @UseGuards(requireStaffRole('gm'))
  async getInterlockState() {
    const global = await this.combatRepo.readEscalationGlobal();
    return {
      system_criticality: global?.system_criticality ?? null,
      cascade_threshold:  global?.cascade_threshold ?? null,
      // Interlock diagnostics (forward slot — C fills the full interlock introspection).
      interlock_version: 'B',
    };
  }

  /**
   * `POST /v1/admin/conflict/force-hazard-shift`
   *
   * Admin force-shift the hazard regime for a rival (F3 DEFERRED — this route is not wired to the ch17 approval workflow).
   * Body: { playerId: string, rivalKey: string }
   * Role: admin only.
   *
   * F3 DEFERRED — same TD-107 precedent as D1b/D1c/D2/rival-admin.
   * Returns the f3_deferred marker so the spec can assert the role guard fires.
   */
  @Post('conflict/force-hazard-shift')
  @HttpCode(200)
  @UseGuards(requireStaffRole('admin'))
  async forceHazardShift(@Body() body: ForceHazardShiftBody) {
    // F3 DEFERRED — no actual DB write until F3 is implemented.
    return {
      playerId:    body.playerId,
      rivalKey:    body.rivalKey,
      f3_deferred: true,
    };
  }

  /**
   * `POST /v1/admin/conflict/simulate-cascade`
   *
   * Admin simulate a cascade (F3 DEFERRED).
   * Body: { playerId: string }
   * Role: admin only.
   */
  @Post('conflict/simulate-cascade')
  @HttpCode(200)
  @UseGuards(requireStaffRole('admin'))
  async simulateCascade(@Body() body: SimulateCascadeBody) {
    // F3 DEFERRED — no actual cascade simulation until F3 is implemented.
    return {
      playerId:    body.playerId,
      f3_deferred: true,
    };
  }
}
