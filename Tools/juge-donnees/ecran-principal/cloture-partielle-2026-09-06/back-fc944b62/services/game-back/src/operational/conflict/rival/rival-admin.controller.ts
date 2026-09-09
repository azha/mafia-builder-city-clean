// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-A-rival-foundation-plan.md Task 9 (C9)
//             Design: docs/superpowers/specs/2026-06-24-04b-A-rival-foundation-design.md §5.2 DD-BO
//             Canon: docs/tech/04b_combat_and_conflict/rival_ai_mechanics.md §BO-endpoints
//             Pattern: reputation-admin.controller.ts (D2 R12a)
//             — Rival AI Foundation C9 — 2026-06-25 —
//
// `RivalAdminController` — BO true-state endpoints for the 7 rival AI mechanics (P5 BO inversion).
//
// 1 GET true-state endpoint, role `gm` (≡ ops):
//   GET /v1/admin/rivals/:id/full-state  — true state: regime + raw floats + tempo + intel_mode + resistance map
//
// 2 action endpoints, role `admin`, F3 DEFERRED:
//   POST /v1/admin/rivals/:id/force-regime   — admin, F3 DEFERRED (TD — same TD-107 precedent)
//   POST /v1/admin/rivals/:id/set-tempo      — admin, F3 DEFERRED
//   PUT  /v1/admin/tunables/rival_ai         — admin, F3 DEFERRED
//
// 9c C13 LESSON (anti-exploit): `requireStaffRole` is JWT-based — NOT the `x-staff-role` header.
//   A spoofed `x-staff-role` header WITHOUT a valid JWT must return 401/403.
//   The JWT guard in `staff-role.guard.ts` checks the JWT claims; the header has no effect.
//
// R2.2 / P5 inversion: the GET endpoint exposes raw hidden scalars to ops/gm staff.
//   Player routes NEVER expose regime, regime_pressure, intel_mode, or resistance floats.
//
// F3 two-person rule: DEFERRED — same precedent as market-admin/reputation-admin/insurance-admin.
//   The 3 action endpoints are gated by `requireStaffRole('admin')` only for now.
//   When ch17 TwoPersonApproval is implemented, replace with the F3 guard.
//
// NOT conditional on NODE_ENV — these are real production BO routes (same precedent as all other *-admin.controller.ts).

import { Body, Controller, Get, HttpCode, Param, Post, Put, UseGuards, Inject } from '@nestjs/common';
import { sql, and, eq } from 'drizzle-orm';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { tunableOverrides } from '../../../db/schema/tunable_overrides';
import { rivalAttackPatternResistance } from '../../../db/schema/conflict_rival';
import { ApiError } from '../../../protocol/api-error';
import { requireStaffRole } from '../../../auth/staff-role.guard';
import { RegimeSwitchingService } from './regime-switching.service';
import { ReconnaissanceRegimeClassifierService } from './reconnaissance-regime-classifier.service';
import { RivalStateRepository } from './rival-state.repository';
import { RivalAiTunables } from './rival-ai.tunables';
import type { RivalKey } from './rival-ai.types';

const ALL_RIVAL_KEYS: readonly RivalKey[] = ['coil', 'tarcum', 'iron_throat', 'saltline'] as const;

// ── BO-allowed tunable keys for PUT /v1/admin/tunables/rival_ai ──────────────────────────────
// Subset of rival_ai.* registry keys writable via BO live-ops.
// Capped to documented ranges (gdd/14 rival_ai.* entries).
const RIVAL_AI_TUNABLE_CAPS: Record<string, (v: number) => number> = {
  // rival_ai.regime_pressure_decay_rate_peaceful_per_day — range -5..0
  'rival_ai.regime_pressure_decay_rate_peaceful_per_day': (v: number) =>
    Math.min(0, Math.max(-5, Number(v))),
  // rival_ai.saturation_passive_decay_rate_per_tick — range 0.02..0.12
  'rival_ai.saturation_passive_decay_rate_per_tick': (v: number) =>
    Math.min(0.12, Math.max(0.02, Number(v))),
  // rival_ai.regime_band_silent_max — range 10..40
  'rival_ai.regime_band_silent_max': (v: number) =>
    Math.min(40, Math.max(10, Math.round(v))),
  // rival_ai.regime_band_mounting_max — range 50..80
  'rival_ai.regime_band_mounting_max': (v: number) =>
    Math.min(80, Math.max(50, Math.round(v))),
};

interface ForceRegimeBody {
  rivalKey: RivalKey;
  regime: string;
}

interface SetTempoBody {
  rivalKey: RivalKey;
  observeIntervalTicks: number;
  orientLatencyTicks: number;
  commitDelayTicks: number;
}

interface PatchTunableBody {
  key: string;
  value: number;
}

@Controller('admin')
export class RivalAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly rivalStateRepo: RivalStateRepository,
    private readonly regimeSvc: RegimeSwitchingService,
    private readonly reconSvc: ReconnaissanceRegimeClassifierService,
    private readonly tunables: RivalAiTunables,
  ) {}

  /**
   * `GET /v1/admin/rivals/:id/full-state`
   *
   * P5 BO INVERSION: returns the raw true state for ALL 4 rivals for a given player.
   * regime (raw enum), regime_pressure (raw float), tempo, intel_mode (raw), resistance_map.
   * Role: gm (≡ ops).
   * The raw scalars returned here are NEVER forwarded to the player (R2.2 P5 invariant).
   *
   * 9c-C13 lesson: this guard is JWT-based (requireStaffRole). A spoofed x-staff-role header
   * WITHOUT a valid JWT returns 401/403 — the header has no effect on the guard.
   */
  @Get('rivals/:id/full-state')
  @UseGuards(requireStaffRole('gm'))
  async getRivalFullState(@Param('id') playerId: string) {
    const rivals = await Promise.all(
      ALL_RIVAL_KEYS.map(async (rivalKey) => {
        const row = await this.rivalStateRepo.readRivalState(playerId, rivalKey);
        if (!row) return { rival_key: rivalKey, seeded: false };

        // Resistance map: all pattern resistance rows for this player × rival
        const resistanceRows = await this.db
          .select()
          .from(rivalAttackPatternResistance)
          .where(
            and(
              eq(rivalAttackPatternResistance.player_id, playerId),
              eq(rivalAttackPatternResistance.rival_key, rivalKey),
            ),
          );

        // intelMode (server-side — BO only, never to player)
        const intelMode = await this.reconSvc.getIntelMode(playerId, rivalKey);

        return {
          rival_key:              rivalKey,
          seeded:                 true,
          // P5 BO inversion — raw hidden scalars exposed to gm/ops only:
          regime:                 row.regime,              // raw enum — BO only
          regime_pressure:        row.regime_pressure,     // raw float — BO only
          flip_threshold:         row.flip_threshold,      // raw float — BO only
          tempo: {
            observe_interval_ticks: row.observe_interval_ticks,
            orient_latency_ticks:   row.orient_latency_ticks,
            commit_delay_ticks:     row.commit_delay_ticks,
          },
          intel_mode:             intelMode,               // raw enum — BO only (C-method)
          mode_stability_ticks:   row.mode_stability_ticks,
          saturation_pressure:    row.saturation_pressure, // raw float — BO only
          route_integrity:        row.route_integrity,     // raw float — BO only (Coil)
          dominance_rank:         row.dominance_rank,
          vulnerable_axis:        row.vulnerable_axis,
          resistance_map: resistanceRows.map((r) => ({
            pattern_hash:   r.pattern_hash,
            resistance:     r.resistance,    // raw float — BO only
            last_used_tick: String(r.last_used_tick),
          })),
        };
      }),
    );

    return { player_id: playerId, rivals };
  }

  /**
   * `POST /v1/admin/rivals/:id/force-regime`
   *
   * Admin force-set a rival's regime (F3 DEFERRED — this route is not wired to the ch17 approval workflow).
   * Body: { rivalKey: RivalKey, regime: string }
   * Role: admin only.
   */
  @Post('rivals/:id/force-regime')
  @HttpCode(200)
  @UseGuards(requireStaffRole('admin'))
  async forceRegime(@Param('id') playerId: string, @Body() body: ForceRegimeBody) {
    // F3 DEFERRED — same TD-107 precedent as D1b/D1c/D2.
    // The actual DB write is a no-op placeholder until F3 is implemented.
    // Returns the f3_deferred marker so the spec can assert the role guard fires.
    return {
      playerId,
      rivalKey:    body.rivalKey,
      regime:      body.regime,
      f3_deferred: true,
    };
  }

  /**
   * `POST /v1/admin/rivals/:id/set-tempo`
   *
   * Admin force-set a rival's tempo intervals (F3 DEFERRED).
   * Body: { rivalKey: RivalKey, observeIntervalTicks: number, orientLatencyTicks: number, commitDelayTicks: number }
   * Role: admin only.
   */
  @Post('rivals/:id/set-tempo')
  @HttpCode(200)
  @UseGuards(requireStaffRole('admin'))
  async setTempo(@Param('id') playerId: string, @Body() body: SetTempoBody) {
    // F3 DEFERRED — same precedent as force-regime above.
    return {
      playerId,
      rivalKey:              body.rivalKey,
      observeIntervalTicks:  body.observeIntervalTicks,
      orientLatencyTicks:    body.orientLatencyTicks,
      commitDelayTicks:      body.commitDelayTicks,
      f3_deferred: true,
    };
  }

  /**
   * `PUT /v1/admin/tunables/rival_ai`
   *
   * Live-ops tunable edit: upserts a rival_ai tunable override.
   * Body: { key: string, value: number }
   * Role: admin only. F3 DEFERRED.
   */
  @Put('tunables/rival_ai')
  @UseGuards(requireStaffRole('admin'))
  async patchRivalAiTunable(@Body() body: PatchTunableBody) {
    const { key, value } = body;
    const capFn = RIVAL_AI_TUNABLE_CAPS[key];
    if (!capFn) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `Unknown rival_ai tunable key: '${key}'. Allowed: ${Object.keys(RIVAL_AI_TUNABLE_CAPS).join(', ')}`,
      });
    }
    const cappedValue = capFn(Number(value));

    await this.db
      .insert(tunableOverrides)
      .values({
        key,
        value: String(cappedValue),
        updated_at: sql`now()`,
        updated_by: 'rival-ai-admin-c9',
      })
      .onConflictDoUpdate({
        target: [tunableOverrides.key],
        set: {
          value: String(cappedValue),
          updated_at: sql`now()`,
          updated_by: 'rival-ai-admin-c9',
        },
      });

    return { key, value: cappedValue, f3_deferred: true };
  }
}
