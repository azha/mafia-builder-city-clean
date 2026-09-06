// IMPLEMENTS: docs/superpowers/plans/2026-07-17-p3-E-demolition-compression-plan.md §C7 (`ProblemAggregator`
//             — snapshot the live problems, dedup by `problem_key`, map each to its tier)
//             Design: docs/superpowers/specs/2026-07-17-p3-E-demolition-compression-design.md §10.1
//             (the 9-source table, snapshot-at-fire D11, "Severity ≥ 100 : tier initial +1 cran").
//             Decisions: D11 (snapshot, not a live view) ; D1 (source_kind = registry, not a pgEnum).
//             Pattern: `CompressionStressReaderService` (the SAME "resolve every getter ONCE, reduce raw
//             repository counts to a domain shape" orchestration shape — the SERVICE layer resolves
//             tunables, the REPOSITORY stays plain-number-in/plain-row-out, R2.3).
//             — P3-E C7 — 2026-07-18
//
// `ProblemAggregatorService.seedBoard` — the ONE call every engage/forced/severity-fire transition makes
// (compression-board.service.ts) right after `compression_events.state` flips to `'active'` (a SEPARATE,
// immediately-following step — NOT inside that SAME guarded UPDATE's transaction, see
// `problem-aggregator.repository.ts`'s own header for the accepted trade-off). Reads the persisted
// carryover (§10.1 last row) FIRST, then the 8 live sources, tier-maps each via `problem-tier.ts`'s pure
// functions, applies the severity +1 crank (§9.2c) to every FRESHLY-seeded entry (carryover entries keep
// their ALREADY-degraded tier from the prior finalize, never double-bumped), and inserts the whole batch.

import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { citySimTunables } from '../../citysim/citysim-tunables';
import { deriveGameDay } from '../../operational/political/political-trigger-evaluators';
import { coreLoopsTunables } from '../core-loops-tunables';
import { sinuosityStressBucket } from '../supply_chain/sinuosity-stress-bucket';
import { debtBucket } from '../supply_chain/debt-bucket';
import { FrictionBudgetRepository } from '../demolition/friction-budget.repository';
import { frictionLoadForNode, ageDaysFromAcquiredAtTick } from '../demolition/friction-formula';
import {
  ProblemAggregatorRepository,
  type RawProblem,
} from './problem-aggregator.repository';
import {
  bumpTierBy,
  exceptionPriorityEntryTier,
  flagAgeEntryTier,
  backpressureEntryTier,
  sinuosityBucketEntryTier,
  debtBucketEntryTier,
  cueStackFailedSlotEntryTier,
  cueCascadeEntryTier,
  settlingOverloadEntryTier,
  frictionPenaltyEntryTier,
} from './problem-tier';

export interface SeedBoardResult {
  readonly seededCount: number;
  readonly carriedOverCount: number;
}

@Injectable()
export class ProblemAggregatorService {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly repo: ProblemAggregatorRepository,
    // DemolitionModule EXPORT (ONE-WAY, ALREADY consumed by `compression-stress-reader.service.ts` — the
    // SAME cross-module read, zero NEW edge).
    private readonly frictionRepo: FrictionBudgetRepository,
  ) {}

  /**
   * Seed `compressionEventId`'s board for `playerId`. `severityBump=true` (§9.2c, fire at stress=100)
   * applies `compressionSeverityMultiplierAt100Stress` (default 1) extra tier-cranks to every FRESH
   * (non-carryover) entry — the design's OWN "toutes entries seedées 1 tier au-dessus du mapping
   * nominal". Carryover entries (already degraded at the PRIOR finalize) are inserted UNCHANGED.
   */
  async seedBoard(playerId: string, compressionEventId: string, severityBump: boolean): Promise<SeedBoardResult> {
    const gameMinute = await this.currentGameMinute(playerId);
    const currentGameDay = deriveGameDay(gameMinute, citySimTunables.inGameDayLengthMinutes);
    const severityCrank = severityBump ? coreLoopsTunables.compressionSeverityMultiplierAt100Stress : 0;

    const carryover = await this.repo.readPersistedCarryover(playerId);
    const fresh = await this.scanLiveSources(playerId, currentGameDay, gameMinute);
    const bumpedFresh = fresh.map((p) => (severityCrank > 0 ? { ...p, tier: bumpTierBy(p.tier, severityCrank) } : p));

    const seeded = await this.repo.insertEntries(compressionEventId, playerId, [...carryover, ...bumpedFresh]);
    return { seededCount: seeded, carriedOverCount: carryover.length };
  }

  /**
   * D14 — "reveals secondary problem": a NARROW re-scan of ONE source_kind, filtered to problem_keys not
   * already on THIS board, returning at most 1 (the design's own "bornée à 1 révélation par décision").
   * Called by `compression-decide.service.ts` AFTER a successful (non-'skip') resolution, targeting the
   * JUST-resolved entry's OWN `source_kind`. `null` when nothing new exists (the honest, common case —
   * D14 forbids fictional generation).
   */
  async revealSecondary(playerId: string, resolvedEntry: { sourceKind: string }, alreadySeededKeys: ReadonlySet<string>): Promise<RawProblem | null> {
    const gameMinute = await this.currentGameMinute(playerId);
    const currentGameDay = deriveGameDay(gameMinute, citySimTunables.inGameDayLengthMinutes);
    const all = await this.scanLiveSources(playerId, currentGameDay, gameMinute);
    return all.find((p) => p.sourceKind === resolvedEntry.sourceKind && !alreadySeededKeys.has(p.problemKey)) ?? null;
  }

  // ───────────────────────────── the 8 live-source scans, tier-mapped ─────────────────────────────────

  private async scanLiveSources(playerId: string, currentGameDay: number, gameMinute: number): Promise<RawProblem[]> {
    const out: RawProblem[] = [];

    for (const card of await this.repo.scanExceptionCards(playerId)) {
      out.push({
        problemKey: `exception:${card.exception_id}`,
        sourceKind: 'exception_card',
        tier: exceptionPriorityEntryTier(card.priority),
        targetRef: { kind: 'exception', id: card.exception_id, lieutenant_id: card.lieutenant_id },
      });
    }

    for (const f of await this.repo.scanPendingFlags(playerId)) {
      out.push({
        problemKey: `flag:${f.flagId}`,
        sourceKind: 'flag',
        tier: flagAgeEntryTier(f.gameDay, currentGameDay),
        targetRef: { kind: 'flag', id: f.flagId },
      });
    }

    const backpressureCriticalThreshold = coreLoopsTunables.backpressureCriticalThreshold;
    for (const n of await this.repo.scanBackpressureCriticalNodes(playerId, backpressureCriticalThreshold)) {
      out.push({
        problemKey: `backpressure:${n.buildingId}`,
        sourceKind: 'backpressure_node',
        tier: backpressureEntryTier(n.index, backpressureCriticalThreshold),
        targetRef: { kind: 'building', id: n.buildingId },
      });
    }

    const stressedCriticalCut = coreLoopsTunables.sinuosityStressedBucketUpperBound;
    for (const r of await this.repo.scanBadRoutes(playerId, stressedCriticalCut)) {
      const bucket = sinuosityStressBucket(r.state as 'draft' | 'active' | 'saturated' | 'severed', r.sinuosityIndex, coreLoopsTunables.sinuosityPristineBucketUpperBound, stressedCriticalCut);
      if (bucket !== 'critical' && bucket !== 'severed') continue; // defensive — the scan's own WHERE already guarantees this
      out.push({
        problemKey: `route:${r.routeId}`,
        sourceKind: 'severed_route',
        tier: sinuosityBucketEntryTier(bucket),
        targetRef: { kind: 'route', id: r.routeId, origin_building_id: r.originBuildingId, destination_building_id: r.destinationBuildingId },
      });
    }

    const mycelialStressThreshold = coreLoopsTunables.mycelialStressThreshold;
    const mycelialDebtCap = coreLoopsTunables.mycelialDebtCap;
    for (const l of await this.repo.scanBadLegs(playerId, mycelialStressThreshold)) {
      const bucket = debtBucket(l.debtLoad, mycelialStressThreshold, mycelialDebtCap);
      if (bucket !== 'stressed' && bucket !== 'fractured') continue; // defensive — same WHERE-already-guarantees note
      out.push({
        problemKey: `leg:${l.legId}`,
        sourceKind: 'stressed_leg',
        tier: debtBucketEntryTier(bucket),
        targetRef: { kind: 'leg', id: l.legId, origin_building_id: l.originBuildingId, destination_building_id: l.destinationBuildingId },
      });
    }

    for (const s of await this.repo.scanFailedCueStackSlots(playerId)) {
      out.push({
        problemKey: `cue_slot:${s.cueStackId}:${s.slotId}`,
        sourceKind: 'cue_stack_failed_slot',
        tier: cueStackFailedSlotEntryTier(),
        targetRef: { kind: 'cue_slot', cue_stack_id: s.cueStackId, slot_id: s.slotId },
      });
    }

    for (const c of await this.repo.scanCueCascadeCards(playerId)) {
      out.push({
        problemKey: `cue_cascade:${c.exceptionId}`,
        sourceKind: 'cue_cascade_card',
        tier: cueCascadeEntryTier(),
        targetRef: { kind: 'exception', id: c.exceptionId },
      });
    }

    for (const n of await this.repo.scanSettlingOverload(playerId)) {
      out.push({
        problemKey: `settling:${n.buildingId}`,
        sourceKind: 'settling_overload',
        tier: settlingOverloadEntryTier(n.changesDuringSettling),
        targetRef: { kind: 'building', id: n.buildingId },
      });
    }

    if (await this.repo.readFrictionPenaltyActive(playerId)) {
      const worstBuildingId = await this.worstFrictionNode(playerId, gameMinute);
      out.push({
        problemKey: 'friction:penalty_active',
        sourceKind: 'friction_penalty',
        tier: frictionPenaltyEntryTier(),
        targetRef: worstBuildingId ? { kind: 'building', id: worstBuildingId } : { kind: 'friction', id: playerId },
      });
    }

    return out;
  }

  /**
   * The friction-penalty entry's `target_ref` — the perimeter node (§4.1) with the HIGHEST derived
   * `friction_load` (the natural "worst offender" a decommission-via-board choice should target). Reuses
   * the EXISTING pure formula (`frictionLoadForNode`, D4 — never re-derived) over
   * `FrictionBudgetRepository.fetchPerimeterNodes` (the SAME périmètre query C2/C4 already use). `null`
   * only in the degenerate case of zero perimeter nodes (unreachable while `efficiency_penalty_active`
   * is true — the penalty requires >=1 node to have accrued friction at all — kept as a defensive,
   * honestly-typed fallback rather than a non-null assertion).
   */
  private async worstFrictionNode(playerId: string, gameMinute: number): Promise<string | null> {
    const nodes = await this.frictionRepo.fetchPerimeterNodes(playerId);
    if (nodes.length === 0) return null;
    const baseFrictionPerNode = coreLoopsTunables.demolitionBaseFrictionPerNode;
    const ageDecayFactorPerTick = coreLoopsTunables.demolitionAgeDecayFactorPerTick;
    const perConnectionFrictionModifier = coreLoopsTunables.demolitionPerConnectionFrictionModifier;
    let worst: { buildingId: string; load: number } | null = null;
    for (const n of nodes) {
      const ageDays = n.acquiredAtTick == null ? 0 : ageDaysFromAcquiredAtTick(gameMinute, n.acquiredAtTick);
      const load = frictionLoadForNode(baseFrictionPerNode, ageDecayFactorPerTick, ageDays, n.connectionCount, perConnectionFrictionModifier);
      if (!worst || load > worst.load) worst = { buildingId: n.buildingId, load };
    }
    return worst!.buildingId;
  }

  /** The player's current game-minute (`city_sim_clock`), the SAME `COALESCE(..., 0)` fallback
   *  `decommission.repository.ts` already establishes for a player with no clock row yet. */
  private async currentGameMinute(playerId: string): Promise<number> {
    const rows = await this.db.select({ game_minute: citySimClock.game_minute }).from(citySimClock).where(eq(citySimClock.player_id, playerId)).limit(1);
    return rows[0]?.game_minute ?? 0;
  }
}
