// IMPLEMENTS: docs/superpowers/plans/2026-06-30-04d-A-lawyer-legal-plan.md C6
//             Canon: docs/tech/04d_meta_market_lawyer_and_internal_affairs/lawyer_legal_system.md §2 (G5)
//             — 04d-A C6 — 2026-06-30
//
// `InfoLeakService` — the BPD declaration-ledger write seam for legal-case leaks.
//
// C6 scope (STRICTLY):
//   recordLeakedItem(caseId, playerId, gameMinute, item, chargeSeverity)
//     → appendDeclarationEntry(playerId, precinctId=1, 'legal_case_leak', severity, caseId, gameMinute)
//     Reuses the ALREADY ACTIVE public BPD seam (mig 0052, slot reserved police_memory.service.ts:168).
//     NOT a rebuild — consumes the existing interface.
//
// Severity derivation [PROV-Y26Q2] (0-100 scale, matches forensic precedent):
//   misdemeanor → 25, felony_low → 40, felony_high → 65, major_crime → 80.
//   These are STRUCTURAL orderings (higher severity charge → higher declaration severity).
//   Not balance tunables (ratification by reviewer ⊥ expected for the scale mapping).
//
// PrecinctId: 1 (city-wide canonical first precinct — same as 'courier_caught_leak' path).
//   Legal cases don't have a specific precinct; precinct 1 is the city-wide BPD channel.
//
// Anti-fabrication: no Math.random. No Date.now(). The seeded draw is done by the CALLER
//   (tickLeakAccumulation in LegalCaseService) — this service only writes the chosen item.
// R2.2 / P5: this service writes to declaration_ledger (BPD side-channel only; never exposed
//   to the player client via the projection seam — P5 wall is in LegalProjectionService C9).
// Zero-regression: ADDITIVE — no existing path is modified.
// [PROV-Y26Q2]: severity scale values (25/40/65/80) pending reviewer ⊥ ratification.

import { Injectable, Logger } from '@nestjs/common';

import { PoliceMemoryService } from '../../citysim/police_memory/police_memory.service';
import type { KnowledgeItem } from './legal.types';

// Precinct 1 — the canonical city-wide BPD channel for legal-case leaks.
// Same precinct used by the 'courier_caught_leak' declaration path (System-9 9a).
// [PROV-Y26Q2]: no per-case precinct context in legal_cases; 1 is the safe city-wide default.
const LEGAL_LEAK_PRECINCT = 1;

// Severity scale [PROV-Y26Q2] — structural ordering matching charge gravity.
// Scale: misdemeanor=25, felony_low=40, felony_high=65, major_crime=80 (0-100 BPD severity).
// Higher severity charge → higher BPD attention when a knowledge item leaks.
// Ratification by reviewer ⊥ expected (not inline balance tunable — structural ordering).
const CHARGE_SEVERITY_TO_BPD_SEVERITY: Record<string, number> = {
  misdemeanor:  25,
  felony_low:   40,
  felony_high:  65,
  major_crime:  80,
};

@Injectable()
export class InfoLeakService {
  private readonly logger = new Logger(InfoLeakService.name);

  constructor(
    private readonly policeMemory: PoliceMemoryService,
  ) {}

  /**
   * recordLeakedItem — write ONE leaked knowledge item to the BPD declaration_ledger.
   *
   * Called by LegalCaseService.tickLeakAccumulation after a seeded-RNG hit on info_leak_rate.
   * The item selection (from unleaked items) and idempotency guard (items_leaked set) are handled
   * by the CALLER — this service only writes the BPD declaration for the given item.
   *
   * Pattern: reuses the SAME public seam as System-9 'courier_caught_leak' and §5 forensic signals:
   *   PoliceMemoryService.appendDeclarationEntry(playerId, precinctId, declarationType, severity,
   *     sourceOriginId, gameMinute) — active since mig 0052; slot reserved at :168.
   *
   * Declaration payload:
   *   declarationType = 'legal_case_leak'
   *   severity        = derived from chargeSeverity [PROV-Y26Q2] (25/40/65/80)
   *   sourceOriginId  = caseId (the legal_case that owns this leak)
   *   building_id     = 0 (city-wide channel — same as boss_mirror/courier_caught_leak pattern)
   *
   * Anti-fabrication: no Math.random. No Date.now(). Pure delegation to the active seam.
   *
   * @param caseId        — the legal_cases UUID (used as sourceOriginId for BPD tracing).
   * @param playerId      — the player who owns the case.
   * @param gameMinute    — current in-game minute (written_at in the ledger entry).
   * @param item          — the KnowledgeItem being leaked (for logging; the id is the key).
   * @param chargeSeverity — the case's charge_severity (drives BPD severity band).
   */
  async recordLeakedItem(
    caseId: string,
    playerId: string,
    gameMinute: number,
    item: KnowledgeItem,
    chargeSeverity: string,
  ): Promise<void> {
    const bpdSeverity = CHARGE_SEVERITY_TO_BPD_SEVERITY[chargeSeverity] ?? 25;

    await this.policeMemory.appendDeclarationEntry(
      playerId,
      LEGAL_LEAK_PRECINCT,
      'legal_case_leak',
      bpdSeverity,
      caseId,
      gameMinute,
    );

    this.logger.debug(
      `InfoLeakService.recordLeakedItem: ` +
        `caseId=${caseId} playerId=${playerId} itemId=${item.id} itemType=${item.type} ` +
        `importance=${item.importance} chargeSeverity=${chargeSeverity} ` +
        `bpdSeverity=${bpdSeverity} gameMinute=${gameMinute}`,
    );
  }
}
