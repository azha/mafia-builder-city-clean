// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C7 (engage
//             volontaire+FORCÉ+severity-fire ; `decide` I7 ; budget-exhausted/all-addressed auto-finalize)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §9.2
//             (b/c) + §10.2 (decide, verb dispatch D12) + §10.3 (reveal-secondary D14) + §10.4 (finalize
//             triggers) + §10.5 (annealing interaction — emergent via the governor's OWN seam).
//             Decisions: D12 (each choice maps an EXISTING verb — zero new write-path) ; D13 (triage ≠
//             structural cap — EXCEPT the verbs that ARE structural, which pass the governor normally) ;
//             D14 (≤1 revelation/decide) ; D15 (abandon housekeeping, N/31 — `friction-budget-tick.
//             service.ts`, NOT this file).
//             — P3-E C7 — 2026-07-18
//
// `CompressionBoardService` — the ONE orchestrator every board endpoint calls: engage (voluntary/
// forced/severity-fire, each → `ProblemAggregatorService.seedBoard`), `GET board`, and `decide` (I7
// budget-guard → verb dispatch, EXACTLY the 5 D12-named categories — everything else is 'skip'-only,
// see `dispatchResolve`'s own header note → D14 reveal → decide-triggered auto-finalize).

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { ApiError } from '../../protocol/api-error';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { exceptionQueueRow } from '../../db/schema/queues_exceptions_cuestack';
import type { CompressionProblemEntryRow } from '../../db/schema/demolition_compression';
import { coreLoopsTunables } from '../core-loops-tunables';
import { ExceptionsService, type ResolveMethod } from '../../exceptions/exceptions.service';
import type { CandidateActionView } from '../../exceptions/exceptions.projection.service';
import { FlagDisciplineService } from '../flag_discipline/flag-discipline.service';
import { LegMaintenanceService } from '../supply_chain/leg-maintenance.service';
import { StructuralDecisionGovernorService } from '../../progression/loop10/structural-decision-governor.service';
import { StructuralDecisionType } from '../../progression/loop10/structural-decision-catalogue';
import { DecommissionService, type DecommissionServiceResult } from '../demolition/decommission.service';
import { CompressionBoardRepository } from './compression-board.repository';
import { ProblemAggregatorRepository } from './problem-aggregator.repository';
import { ProblemAggregatorService } from './problem-aggregator.service';
import { CompressionFinalizeService } from './compression-finalize.service';

export interface EngageOutcome {
  readonly engaged: boolean;
  readonly compressionEventId: string | null;
}

export interface BoardEntryView {
  readonly id: string;
  readonly source_kind: string;
  readonly tier: string;
  readonly target_ref: Record<string, unknown>;
  readonly addressed: boolean;
}

export interface BoardView {
  readonly entries: BoardEntryView[];
  readonly decisions_used: number;
  readonly decisions_remaining: number;
}

export type DecideChoice = 'skip' | 'resolve' | 'dismiss';

export interface DecideOutcome {
  readonly decided: true;
  readonly choice: DecideChoice;
  readonly decisions_used: number;
  readonly decisions_remaining: number;
  readonly revealed_secondary: boolean;
  readonly finalized: boolean;
}

/** The ONLY 5 source_kinds D12 names a resolve verb for (design §10.2: "resolve spine card / valider-
 *  dismiss flag / mode maintenance mycelial / ack cascade / décommission"). Every OTHER source_kind
 *  (`backpressure_node`/`severed_route`/`settling_overload`/`cue_stack_failed_slot`) is 'skip'-only v1 —
 *  the board surfaces them for AWARENESS/triage; their actual fix is playing the underlying P3-C/P3-D
 *  mechanics elsewhere, not a NEW board-invented write-path (D12's own "n'invente AUCUN write-path").
 */
const RESOLVABLE_SOURCE_KINDS = new Set(['exception_card', 'cue_cascade_card', 'flag', 'stressed_leg', 'friction_penalty']);

@Injectable()
export class CompressionBoardService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly boardRepo: CompressionBoardRepository,
    private readonly aggregatorRepo: ProblemAggregatorRepository,
    private readonly aggregator: ProblemAggregatorService,
    private readonly finalizeService: CompressionFinalizeService,
    private readonly exceptionsService: ExceptionsService,
    private readonly flagDiscipline: FlagDisciplineService,
    private readonly legMaintenance: LegMaintenanceService,
    private readonly governor: StructuralDecisionGovernorService,
    private readonly decommission: DecommissionService,
  ) {}

  // ───────────────────────────── §9.2(b) engage — voluntary + forced ─────────────────────────────────

  /** `POST /v1/compression/engage` (§9.2b, voluntary). 404 if no open `'warning'` cycle. */
  async engageVoluntary(playerId: string): Promise<EngageOutcome> {
    const gameMinute = await this.currentGameMinute(playerId);
    const result = await this.boardRepo.engageVoluntary(playerId, gameMinute);
    if (!result.engaged) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `no open compression cycle to engage for player ${playerId}.` });
    }
    await this.aggregator.seedBoard(playerId, result.compressionEventId!, false);
    return { engaged: true, compressionEventId: result.compressionEventId };
  }

  /** Session-open FORCED check (§9.2b) — `SessionOpenedEvent` subscriber calls this. A no-op (`null`)
   *  when the player has no 'warning' cycle at/above the force threshold — NEVER an error (this is a
   *  background check, not a player-initiated action). */
  async checkForcedEngage(playerId: string, gameMinute: number): Promise<EngageOutcome | null> {
    const result = await this.boardRepo.engageForced(playerId, gameMinute, coreLoopsTunables.compressionForceEngagementThreshold);
    if (!result.engaged) return null;
    await this.aggregator.seedBoard(playerId, result.compressionEventId!, false);
    return { engaged: true, compressionEventId: result.compressionEventId };
  }

  /** §9.2(c) severity-fire check — called by `compression-stress-subscriber.service.ts`/`compression-
   *  defer.service.ts` (C6 files, additive call sites) immediately after EITHER writes a NEW `org_stress`
   *  value. A no-op (`null`) unless stress just reached the max-severity threshold WHILE still
   *  `'warning'` (a board already `'active'` never matches — the guard's own `state='warning'` clause). */
  async checkFireAtMaxSeverity(playerId: string, gameMinute: number): Promise<EngageOutcome | null> {
    const result = await this.boardRepo.fireAtMaxSeverity(playerId, gameMinute, coreLoopsTunables.compressionMaxSeverityThreshold);
    if (!result.engaged) return null;
    await this.aggregator.seedBoard(playerId, result.compressionEventId!, true);
    return { engaged: true, compressionEventId: result.compressionEventId };
  }

  // ───────────────────────────── `GET /v1/compression/board` ─────────────────────────────────────────

  async getBoard(playerId: string): Promise<BoardView> {
    const event = await this.boardRepo.getActiveEvent(playerId);
    if (!event) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `no active compression board for player ${playerId}.` });
    }
    const entries = await this.aggregatorRepo.listEntries(event.id);
    return {
      entries: entries.map((e) => this.projectEntry(e)),
      decisions_used: event.decisions_used,
      decisions_remaining: event.decisions_budget - event.decisions_used,
    };
  }

  private projectEntry(e: CompressionProblemEntryRow): BoardEntryView {
    return {
      id: e.id,
      source_kind: e.source_kind,
      tier: e.tier,
      target_ref: (e.target_ref as Record<string, unknown>) ?? {},
      addressed: e.addressed_at != null,
    };
  }

  // ───────────────────────────── `POST .../decide` (I7 + D12 + D14) ──────────────────────────────────

  async decide(playerId: string, entryId: string, choice: DecideChoice): Promise<DecideOutcome> {
    // I7 — budget FIRST (design §10.2 literal ordering: the decision is consumed regardless of what it
    // targets, the SAME "skip = zero-effect but still costs a decision" honesty).
    const claim = await this.boardRepo.consumeDecisionBudget(playerId);
    if (!claim.claimed) {
      if (claim.reason === 'NO_ACTIVE_BOARD') {
        throw new ApiError('RESOURCE_NOT_FOUND', { message: `no active compression board for player ${playerId}.` });
      }
      throw new ApiError('COMPRESSION_BUDGET_EXHAUSTED', { message: 'this compression cycle has used its full decision budget.' });
    }
    const eventId = claim.compressionEventId!;
    const gameMinute = await this.currentGameMinute(playerId);

    const entry = await this.aggregatorRepo.getOwnedEntry(eventId, playerId, entryId);
    if (!entry) {
      // The decision is ALREADY consumed above (design's own literal ordering) — an invalid entryId is a
      // wasted decision, not a free retry.
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `no board entry ${entryId} for this player's active cycle.` });
    }
    if (entry.addressed_at != null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `board entry ${entryId} was already addressed.` });
    }

    const verbOutcome = await this.applyChoice(playerId, entry, choice);

    const marked = await this.boardRepo.markEntryAddressed(eventId, playerId, entryId, { choice, ...verbOutcome });
    if (!marked) {
      // A genuinely concurrent 2nd decide on THIS SAME entry won the race between our own read above and
      // this UPDATE — the budget stays consumed either way (see file header).
      throw new ApiError('RESOURCE_STATE_CONFLICT', { message: `board entry ${entryId} was addressed by a concurrent request.` });
    }

    // D14 — reveal-secondary, ONLY on a real (non-'skip') resolution, bounded to 1.
    let revealedSecondary = false;
    if (choice !== 'skip') {
      const existingKeys = new Set((await this.aggregatorRepo.listEntries(eventId)).map((e) => e.problem_key));
      const revealed = await this.aggregator.revealSecondary(playerId, { sourceKind: entry.source_kind }, existingKeys);
      if (revealed) {
        await this.aggregatorRepo.insertEntries(eventId, playerId, [revealed]);
        revealedSecondary = true;
      }
    }

    // §10.4 auto-finalize triggers: budget exhausted (THIS decide's own claim) OR all entries addressed.
    let finalized = false;
    const unaddressedCount = await this.aggregatorRepo.countUnaddressed(eventId);
    if (claim.decisionsUsed === claim.decisionsBudget || unaddressedCount === 0) {
      const outcome = await this.finalizeService.finalize(playerId, gameMinute, null);
      finalized = outcome.finalized;
    }

    return {
      decided: true,
      choice,
      decisions_used: claim.decisionsUsed!,
      decisions_remaining: claim.decisionsBudget! - claim.decisionsUsed!,
      revealed_secondary: revealedSecondary,
      finalized,
    };
  }

  /**
   * D12 verb dispatch. `'skip'` is ALWAYS valid (zero write-path, addressed-no-fix). `'dismiss'` is
   * valid ONLY for `source_kind='flag'` (the "valider-dismiss" pair D12 names — `'resolve'` on a flag
   * validates, `'dismiss'` dismisses, BOTH the SAME existing `FlagDisciplineService` verb pair).
   * `'resolve'` dispatches per `RESOLVABLE_SOURCE_KINDS` — any OTHER source_kind's `'resolve'`/`'dismiss'`
   * is a 422 (no write-path exists for it, D12's own "n'invente AUCUN write-path" — the player's only
   * valid choice for those entries is `'skip'`).
   */
  private async applyChoice(playerId: string, entry: CompressionProblemEntryRow, choice: DecideChoice): Promise<Record<string, unknown>> {
    if (choice === 'skip') {
      return { applied: false };
    }
    if (choice === 'dismiss') {
      if (entry.source_kind !== 'flag') {
        throw new ApiError('VALIDATION_FAILED', { message: `'dismiss' is only valid for source_kind='flag' (got '${entry.source_kind}').` });
      }
      const targetRef = entry.target_ref as { id: string };
      const r = await this.flagDiscipline.dismissFlag(playerId, targetRef.id);
      return { applied: true, verb: 'dismiss_flag', result: r };
    }
    // choice === 'resolve'
    if (!RESOLVABLE_SOURCE_KINDS.has(entry.source_kind)) {
      throw new ApiError('VALIDATION_FAILED', {
        message: `no resolve verb exists for source_kind='${entry.source_kind}' — 'skip' is the only valid choice for this entry.`,
      });
    }
    return this.dispatchResolve(playerId, entry);
  }

  private async dispatchResolve(playerId: string, entry: CompressionProblemEntryRow): Promise<Record<string, unknown>> {
    const targetRef = entry.target_ref as Record<string, unknown>;

    switch (entry.source_kind) {
      case 'exception_card':
      case 'cue_cascade_card': {
        const exceptionId = String(targetRef['id']);
        const { method, actionId } = await this.suggestedResolution(exceptionId);
        const outcome = await this.exceptionsService.resolve(playerId, exceptionId, method, actionId);
        return { applied: true, verb: 'resolve_exception', outcome };
      }
      case 'flag': {
        const flagId = String(targetRef['id']);
        const r = await this.flagDiscipline.validateFlag(playerId, flagId);
        return { applied: true, verb: 'validate_flag', result: r };
      }
      case 'stressed_leg': {
        const legId = String(targetRef['id']);
        // The board's own "resolve" default mode (§10.2 "mode maintenance mycelial") — quick_patch is
        // the cheapest/fastest of the 3 EXISTING modes (`LegMaintenanceService.maintain`'s own registry);
        // exposing the full mode CHOICE from the board is deferred (TD candidate, C9 closeout).
        const r = await this.legMaintenance.maintain(playerId, legId, 'quick_patch');
        return { applied: true, verb: 'leg_maintain_quick_patch', result: r };
      }
      case 'friction_penalty': {
        const buildingId = String(targetRef['id']);
        const result = await this.governor.commit<DecommissionServiceResult>(
          playerId,
          StructuralDecisionType.NODE_DECOMMISSION,
          {
            before: { entity: 'building', id: buildingId },
            after: (r: DecommissionServiceResult) => ({ entity: 'building', id: r.buildingId, freed_block_id: r.freedBlockId }),
          },
          () => this.decommission.decommission(playerId, buildingId, true),
        );
        return { applied: true, verb: 'decommission', result };
      }
      default:
        // Unreachable — RESOLVABLE_SOURCE_KINDS above already excludes every other source_kind.
        throw new ApiError('VALIDATION_FAILED', { message: `no resolve verb wired for source_kind='${entry.source_kind}'.` });
    }
  }

  /** The exception card's OWN `suggested_action` (the SAME "smart default" the queue/session-open views
   *  already surface, `ExceptionCardProjection.suggested_action` — the board's "resolve" choice applies
   *  it directly rather than exposing a full candidate-action picker, v1 scope). */
  private async suggestedResolution(exceptionId: string): Promise<{ method: ResolveMethod; actionId: string }> {
    const rows = await this.db.select({ suggested_action: exceptionQueueRow.suggested_action }).from(exceptionQueueRow).where(eq(exceptionQueueRow.exception_id, exceptionId)).limit(1);
    const suggested = rows[0]?.suggested_action as CandidateActionView | undefined;
    if (!suggested) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `exception ${exceptionId} has no suggested_action (already resolved?).` });
    }
    return { method: (suggested.effect?.type ?? 'ONE_TIME') as ResolveMethod, actionId: suggested.id };
  }

  private async currentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db.select({ game_minute: citySimClock.game_minute }).from(citySimClock).where(eq(citySimClock.player_id, playerId)).limit(1);
    return rows[0]?.game_minute ?? 0;
  }
}
