// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C8 ("BO : 5 endpoints groupés
//             + 2 forces (f3_deferred) + 6 SFCs Vue (T9) — rôle ops requireStaffRole REUSE").
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §17 (the 5-bullet
//             endpoint list + 2 canon forces, verbatim below).
//             Pattern: `supply-chain-admin.controller.ts` (P3-C C9 — the closest sibling: SAME 2-loop
//             BO-condensation shape, `requireStaffRole`/`f3_deferred`/`AdminAuditLogService.emit`, "drives
//             the REAL transition then calls the REAL producer" force shape) + `flag-discipline-admin.
//             controller.ts` (P3-B C7 — the 5-endpoint precedent this file's own endpoint COUNT mirrors).
//             — P3-D C8 — 2026-07-15
//
// `CueAnnealingAdminController` — the BO production routes for the ch05 Loops 6-7 surface (design §17's
// own 5 grouped endpoints + 2 forces):
//
//   GET  /v1/admin/players/:id/cue-stacks            — role gm    — this player's cue-stacks (récents),
//                                                                    RAW scalars (P5 inversion): FULL slot
//                                                                    outcome.detail verbatim (the SAME
//                                                                    fields the player-facing GET current
//                                                                    strips, `cue-stack.service.ts`'s own
//                                                                    C8 header) + server-only bookkeeping
//                                                                    columns.
//   GET  /v1/admin/cue-stack-cascade-events           — role gm    — cross-player CUE_CASCADE-tagged
//                                                                    Exception cards, paginated (mirrors
//                                                                    `supply-chain-admin.controller.ts#
//                                                                    getCriticalEvents`'s own shape, ONE
//                                                                    source tag instead of 3).
//   GET  /v1/admin/named-sequences/popularity         — role gm    — cross-player aggregate: save-name
//                                                                    frequency + slot-type frequency across
//                                                                    EVERY saved `NamedSequence` (genuine,
//                                                                    non-fabricated real-data aggregate).
//   GET  /v1/admin/players/:id/annealing-state        — role gm    — this player's `annealing_state` rows,
//                                                                    RAW scalars (P5 inversion): `settling_
//                                                                    ends_at`/`changes_during_settling`/
//                                                                    `throughput_multiplier`/`compounding_
//                                                                    history` verbatim (`AnnealingRepository.
//                                                                    listStatesForPlayer` REUSE, C6).
//   GET  /v1/admin/annealing-compounding-events       — role gm    — cross-player timeline flattened from
//                                                                    EVERY row's `compounding_history` jsonb
//                                                                    array, paginated.
//   POST /v1/admin/cue-stacks/:id/force-cascade       — role admin — f3_deferred, audited — forces the
//                                                                    stack's own first `pending` slot into
//                                                                    `failed_collision` (`CueStackExecution
//                                                                    Repository.forceFailFirstPendingSlot`,
//                                                                    NEW this chunk) then drives the REAL
//                                                                    `CueCascadeExceptionProducer.
//                                                                    raiseIfClear` (the SAME producer the
//                                                                    tick's own §6.2 path calls) — never a
//                                                                    fabricated separate card.
//   POST /v1/admin/nodes/:id/force-settling-end       — role admin — f3_deferred, audited — `:id` =
//                                                                    building_id (owning player resolved via
//                                                                    `building.player_id`, mirrors
//                                                                    `force-backpressure`'s own lookup) —
//                                                                    drives the REAL I6 completion shape,
//                                                                    scoped to ONE row (`AnnealingRepository.
//                                                                    forceSettleOne`, NEW this chunk).
//
// P5 BO INVERSION (R2.2): every GET below returns the RAW scalars the player-facing surfaces
// (`CueStackService#toView`/`AnnealingRollingQueueService`) deliberately bucket away or strip entirely —
// `SlotOutcome.detail`/`estimated_execution_time_minutes`(bucketed player-side)/`settling_ends_at`/
// `changes_during_settling`/`throughput_multiplier`/`compounding_history`. NEVER forwarded to any
// player-facing endpoint (the leak-scan floor, this SAME chunk, proves the player side stays clean; this
// file is the deliberate BO-only inversion of that same wall).
//
// F3 two-person-rule: DEFERRED (TD-107 join, the SAME honest marker every sibling admin controller in this
//   codebase carries). The 2 force endpoints are gated by `requireStaffRole('admin')` ONLY until F3 lands;
//   each response carries `f3_deferred: true`.
//
// AUDIT (R9.3 — REUSE `AdminAuditLogService`, never a parallel audit path): each of the 2 force endpoints
//   writes exactly one `admin_audit_log` row. The 3 GET endpoints are read-only diagnostics and do NOT audit
//   (mirrors every sibling BO controller).
//
// MODULE HOME (D12, "tranché au C8 par taille" — mirrors `supply-chain-admin.controller.ts`'s own note):
//   this file lives in `core_loops/cue_stack/` (not a NEW top-level file) — of its 7 concerns, 4
//   (cue-stacks/cascade-events/named-sequences-popularity + force-cascade) are natively cue_stack domain;
//   the 3 annealing concerns (annealing-state/compounding-events + force-settling-end) need ONLY
//   `AnnealingRepository` (exported by `AnnealingModule`, imported here — leaf-safe, no cycle: neither
//   module imports the other back, `annealing.module.ts`'s own header).
//
// NOT conditional on NODE_ENV — these are real production BO routes (always-on). Registered in
// `CueStackModule.controllers`.

import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { ApiError } from '../../protocol/api-error';
import { requireStaffRole } from '../../auth/staff-role.guard';
import type { RequestWithAccount } from '../../auth/authenticated-request';
import { AdminAuditLogService } from '../../db/admin-audit-log.service';
import { building } from '../../db/schema/city_state';
import { cueStack, exceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';
import { namedSequenceRow } from '../../db/schema/cue_annealing';
import { AnnealingRepository } from '../annealing/annealing.repository';
import { CueCascadeExceptionProducer, CUE_CASCADE_SOURCE } from './cue-cascade-exception-producer.service';
import { CueStackExecutionRepository } from './cue-stack-execution.repository';
import type { CueStackSlot } from './slot-type-executor.interface';

const CROSS_PLAYER_DEFAULT_LIMIT = 20;
const CROSS_PLAYER_MAX_LIMIT = 100;

function clampLimit(limitParam: string | undefined): number {
  const parsed = Number.parseInt(limitParam ?? '', 10);
  return Number.isNaN(parsed) ? CROSS_PLAYER_DEFAULT_LIMIT : Math.min(Math.max(parsed, 1), CROSS_PLAYER_MAX_LIMIT);
}

function clampOffset(offsetParam: string | undefined): number {
  const parsed = Number.parseInt(offsetParam ?? '', 10);
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

@Controller('admin')
export class CueAnnealingAdminController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly annealingRepo: AnnealingRepository,
    private readonly executionRepo: CueStackExecutionRepository,
    private readonly cascadeProducer: CueCascadeExceptionProducer,
    private readonly auditLog: AdminAuditLogService,
  ) {}

  // ─── GET /admin/players/:id/cue-stacks — RAW scalars + outcome.detail verbatim (role `gm`) ────────────

  /**
   * `GET /v1/admin/players/:id/cue-stacks` (design §17) — every `cue_stacks` row for this player (active
   * non-terminal one first, then historical `resolved` ones newest-first — no `created_at` column exists on
   * this table, `cue_stacks` schema's own comment; ordering degrades gracefully via `committed_at`). RAW
   * (P5 inversion): `slots` verbatim (INCLUDING each slot's own `outcome.detail` — the SAME field the
   * player-facing `GET /v1/cue-stack/current` strips, `cue-stack.service.ts`'s own C8 header) + the 4
   * server-only bookkeeping columns (`session_ref`/`executing_slot_index`/`executing_slot_started_minute`/
   * `last_executed_game_minute`).
   */
  @Get('players/:id/cue-stacks')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerCueStacks(@Param('id') playerId: string) {
    const rows = await this.db
      .select()
      .from(cueStack)
      .where(eq(cueStack.player_id, playerId))
      .orderBy(sql`(${cueStack.state} = 'resolved') ASC, ${cueStack.committed_at} DESC NULLS LAST`);

    return {
      playerId,
      stacks: rows.map((r) => ({
        cueStackId: r.cue_stack_id,
        state: r.state,
        committedAt: r.committed_at,
        sessionRef: r.session_ref,
        executingSlotIndex: r.executing_slot_index,
        executingSlotStartedMinute: r.executing_slot_started_minute,
        lastExecutedGameMinute: r.last_executed_game_minute,
        slots: (r.slots as unknown as CueStackSlot[]) ?? [],
      })),
    };
  }

  // ─── GET /admin/cue-stack-cascade-events — cross-player CUE_CASCADE timeline (role `gm`) ──────────────

  /**
   * `GET /v1/admin/cue-stack-cascade-events?limit=&offset=` (design §17) — cross-player timeline of
   * `CueCascadeExceptionProducer`'s own cards (`source: 'CUE_CASCADE'`, `cue-cascade-exception-producer.
   * service.ts`), mirrors `supply-chain-admin.controller.ts#getCriticalEvents`'s own condensed-timeline
   * shape (ONE source tag here, not 3). `limit` defaults 20, clamped [1,100]; `offset` defaults 0, clamped
   * ≥0.
   */
  @Get('cue-stack-cascade-events')
  @UseGuards(requireStaffRole('gm'))
  async getCascadeEvents(
    @Query('limit') limitParam: string | undefined,
    @Query('offset') offsetParam: string | undefined,
  ) {
    const limit = clampLimit(limitParam);
    const offset = clampOffset(offsetParam);

    const matchesProducer = sql`${exceptionQueueRow.candidate_actions}->0->>'source' = ${CUE_CASCADE_SOURCE}`;

    const [{ count: totalRaw }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(exceptionQueueRow)
      .where(matchesProducer);
    const total = Number(totalRaw);

    const rows = await this.db
      .select({
        exceptionId: exceptionQueueRow.exception_id,
        playerId: exceptionQueueRow.player_id,
        eventDescriptor: exceptionQueueRow.event_descriptor,
        candidateActions: exceptionQueueRow.candidate_actions,
        resolutionStatus: exceptionQueueRow.resolution_status,
        emittedAt: exceptionQueueRow.emitted_at,
        resolvedAt: exceptionQueueRow.resolved_at,
      })
      .from(exceptionQueueRow)
      .where(matchesProducer)
      .orderBy(desc(exceptionQueueRow.emitted_at))
      .limit(limit)
      .offset(offset);

    const events = rows.map((r) => {
      const first = (r.candidateActions as Array<Record<string, unknown>> | null)?.[0] ?? {};
      return {
        exceptionId: r.exceptionId,
        playerId: r.playerId,
        eventDescriptor: r.eventDescriptor,
        slotId: (first.slot_id as string | undefined) ?? null,
        slotType: (first.slot_type as string | undefined) ?? null,
        targetRefKind: (first.target_ref_kind as string | undefined) ?? null,
        targetRefId: (first.target_ref_id as string | undefined) ?? null,
        resolutionStatus: r.resolutionStatus,
        emittedAt: r.emittedAt,
        resolvedAt: r.resolvedAt,
      };
    });

    return { events, total, limit, offset };
  }

  // ─── GET /admin/named-sequences/popularity — cross-player aggregate (role `gm`) ────────────────────────

  /**
   * `GET /v1/admin/named-sequences/popularity` (design §17) — a genuine, non-fabricated real-data
   * aggregate over EVERY saved `NamedSequence` (`named_sequences`, C5): (1) save-NAME frequency
   * (`GROUP BY name`), (2) slot-TYPE frequency across every template's `slots_template` jsonb array
   * (`jsonb_array_elements` + `GROUP BY elem->>'slot_type'`). Both DESC by count.
   */
  @Get('named-sequences/popularity')
  @UseGuards(requireStaffRole('gm'))
  async getNamedSequencePopularity() {
    const [{ count: totalRaw }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(namedSequenceRow);
    const totalSequences = Number(totalRaw);

    const nameRows = await this.db
      .select({ name: namedSequenceRow.name, count: sql<number>`count(*)::int` })
      .from(namedSequenceRow)
      .groupBy(namedSequenceRow.name)
      .orderBy(sql`count(*) DESC`);

    const slotTypeResult = await this.db.execute(sql`
      SELECT elem->>'slot_type' AS slot_type, count(*)::int AS count
      FROM ${namedSequenceRow}, jsonb_array_elements(slots_template) AS elem
      GROUP BY elem->>'slot_type'
      ORDER BY count(*) DESC
    `);
    const slotTypeRows = (slotTypeResult as { rows?: Array<Record<string, unknown>> }).rows ?? (slotTypeResult as unknown as Array<Record<string, unknown>>);

    return {
      totalSequences,
      names: nameRows.map((r) => ({ name: r.name, count: r.count })),
      slotTypeFrequency: slotTypeRows.map((r) => ({ slotType: String(r.slot_type), count: Number(r.count) })),
    };
  }

  // ─── GET /admin/players/:id/annealing-state — RAW scalars (role `gm`) ──────────────────────────────────

  /**
   * `GET /v1/admin/players/:id/annealing-state` (design §17) — every `annealing_state` row for this player
   * (`AnnealingRepository.listStatesForPlayer` REUSE, C6/C7 — a plain read, no new query). RAW (P5
   * inversion): `settling_started_at`/`settling_ends_at`/`changes_during_settling`/`throughput_multiplier`/
   * `compounding_history`/`settled`/`last_sweep_at` verbatim — the SAME fields the player-facing rolling-
   * queue bucket-derives (`annealing-rolling-queue.service.ts`). `isCurrentlySettling` is a server-computed
   * convenience alongside the raw fields (design §9.1's own derived predicate), never a REPLACEMENT for them.
   */
  @Get('players/:id/annealing-state')
  @UseGuards(requireStaffRole('gm'))
  async getPlayerAnnealingState(@Param('id') playerId: string) {
    const rows = await this.annealingRepo.listStatesForPlayer(playerId);
    const now = Date.now();
    return {
      playerId,
      nodes: rows.map((r) => ({
        buildingId: r.building_id,
        initiatingChange: r.initiating_change,
        settlingStartedAt: r.settling_started_at,
        settlingEndsAt: r.settling_ends_at,
        changesDuringSettling: r.changes_during_settling,
        throughputMultiplier: r.throughput_multiplier,
        compoundingHistory: r.compounding_history,
        settled: r.settled,
        lastSweepAt: r.last_sweep_at,
        isCurrentlySettling: !r.settled && new Date(r.settling_ends_at).getTime() > now,
      })),
    };
  }

  // ─── GET /admin/annealing-compounding-events — cross-player timeline (role `gm`) ───────────────────────

  /**
   * `GET /v1/admin/annealing-compounding-events?limit=&offset=` (design §17) — cross-player timeline
   * flattened from EVERY `annealing_state` row's own `compounding_history` jsonb array (`{change_type, ref,
   * at}` entries, `annealing.repository.ts#initiateOrCompound`'s own append shape), newest-first, paginated.
   */
  @Get('annealing-compounding-events')
  @UseGuards(requireStaffRole('gm'))
  async getCompoundingEvents(
    @Query('limit') limitParam: string | undefined,
    @Query('offset') offsetParam: string | undefined,
  ) {
    const limit = clampLimit(limitParam);
    const offset = clampOffset(offsetParam);

    const countResult = await this.db.execute(sql`
      SELECT count(*)::int AS count
      FROM annealing_state, jsonb_array_elements(compounding_history) AS elem
    `);
    const countRows = (countResult as { rows?: Array<Record<string, unknown>> }).rows ?? (countResult as unknown as Array<Record<string, unknown>>);
    const total = Number(countRows[0]?.count ?? 0);

    const result = await this.db.execute(sql`
      SELECT player_id, building_id, elem->>'change_type' AS change_type, elem->>'ref' AS ref,
             (elem->>'at')::timestamptz AS at
      FROM annealing_state, jsonb_array_elements(compounding_history) AS elem
      ORDER BY (elem->>'at')::timestamptz DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const rows = (result as { rows?: Array<Record<string, unknown>> }).rows ?? (result as unknown as Array<Record<string, unknown>>);

    return {
      events: rows.map((r) => ({
        playerId: String(r.player_id),
        buildingId: String(r.building_id),
        changeType: String(r.change_type),
        ref: String(r.ref),
        at: r.at,
      })),
      total,
      limit,
      offset,
    };
  }

  // ─── POST /admin/cue-stacks/:id/force-cascade — admin override (role `admin`, F3 DEFERRED) ─────────────

  /**
   * `POST /v1/admin/cue-stacks/:id/force-cascade` (design §17) — `:id` = `cue_stack_id`, unknown/already-
   * `resolved`/no-`pending`-slot-left → 409 (nothing eligible to force). Forces the FIRST still-`pending`
   * slot into `failed_collision` (`CueStackExecutionRepository.forceFailFirstPendingSlot`, NEW this chunk —
   * tagged `detail.forcedByAdmin: true`), then drives the REAL `CueCascadeExceptionProducer.raiseIfClear`
   * (the SAME producer the tick's own §6.2 collision path calls) — a genuine card, never fabricated.
   *
   * Returns: `{ cueStackId, slotId, slotType, cascadeOutcome, f3_deferred: true }`. Role: `admin`.
   */
  @Post('cue-stacks/:id/force-cascade')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 join).
  @UseGuards(requireStaffRole('admin'))
  async forceCascade(@Param('id') cueStackId: string, @Req() req: RequestWithAccount) {
    const forced = await this.executionRepo.forceFailFirstPendingSlot(cueStackId, { forcedByAdmin: true });
    if (!forced) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `cue stack ${cueStackId} does not exist, is already resolved, or has no pending slot left to force.`,
      });
    }

    const cascadeOutcome = await this.cascadeProducer.raiseIfClear(forced.playerId, {
      slot_id: forced.slotId,
      slot_type: forced.slotType as CueStackSlot['slot_type'],
      target_ref: forced.targetRef,
    });

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'cue_stacks',
      targetEntityId: cueStackId,
      beforeState: { slotId: forced.slotId, status: 'pending' },
      afterState: { slotId: forced.slotId, status: 'failed_collision', cascadeOutcome },
    });

    return { cueStackId, slotId: forced.slotId, slotType: forced.slotType, cascadeOutcome, f3_deferred: true };
  }

  // ─── POST /admin/nodes/:id/force-settling-end — admin override (role `admin`, F3 DEFERRED) ─────────────

  /**
   * `POST /v1/admin/nodes/:id/force-settling-end` (design §17) — `:id` = `building_id`, owning player
   * resolved via `building.player_id` (mirrors `supply-chain-admin.controller.ts#forceBackpressure`'s own
   * lookup). Unknown building → 404. No `annealing_state` row for this building → 404. Already `settled`
   * → 409 (nothing to force). Otherwise drives the REAL I6 completion write, scoped to ONE row
   * (`AnnealingRepository.forceSettleOne`, NEW this chunk).
   *
   * Returns: `{ buildingId, playerId, settled: true, f3_deferred: true }`. Role: `admin`.
   */
  @Post('nodes/:id/force-settling-end')
  @HttpCode(200)
  // F3 two-person-rule DEFERRED — this route is not wired to the ch17 approval workflow (TD-107 join).
  @UseGuards(requireStaffRole('admin'))
  async forceSettlingEnd(@Param('id') buildingId: string, @Req() req: RequestWithAccount) {
    const [buildingRow] = await this.db
      .select({ playerId: building.player_id })
      .from(building)
      .where(eq(building.building_id, buildingId))
      .limit(1);
    if (!buildingRow) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No such building: ${buildingId}.` });
    }

    const before = await this.annealingRepo.findState(buildingRow.playerId, buildingId);
    if (!before) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `No annealing_state row for building ${buildingId}.` });
    }
    if (before.settled) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `building ${buildingId} is already settled.` });
    }

    const result = await this.annealingRepo.forceSettleOne(buildingRow.playerId, buildingId);
    if (!result) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `building ${buildingId} is already settled.` });
    }

    await this.auditLog.emit({
      adminUserId: req.account!.account_id,
      actionType: 'UPDATE',
      targetEntityType: 'annealing_state',
      targetEntityId: buildingId,
      beforeState: { settled: false },
      afterState: { settled: true },
    });

    return { buildingId, playerId: buildingRow.playerId, settled: true as const, f3_deferred: true };
  }
}
