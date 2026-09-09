// IMPLEMENTS: TD-012 (lot-5 L5-T6l) — FalseReportLedger service: FILE action + flood backlash.
//             Canon: docs/tech/02_fictional_world/law_mis.md §NestJS — backend jeu
//               - FalseReportLedger flood detection (law_mis §173): ratio false:genuine sur 30 jours
//                 via {{tunable:flood_backlash_threshold}} (REUSE).
//               - Flood backlash: si dépassé → backlash event: prochains N rapports ignorés +
//                 auto-audit des bâtiments joueur ajouté en queue avec source SCHEDULED
//                 (law_mis §NestJS backend jeu line 173: cross-ref gdd/04 §System 6 §Edge cases +
//                 gdd/04c — audits forensic forcés).
//             -- session:2026-06-14 (TD-012 lot-5 L5-T6l) --
//
// `FalseReportLedgerService` — the FILE false-report action + flood-backlash mechanic.
//   - FILE: insert a FalseReportLedger entry (FALSE_REPORT or GENUINE_REPORT); check flood ratio.
//   - FLOOD: when window_false_count / max(window_genuine_count, 1) >= flood_backlash_threshold
//     (gdd/14 L137: 8:1/30d) → activate backlash: (a) mark backlash_penalty_active=true;
//     (b) inject a SCHEDULED auto-audit entry into the player's district queues (the backlash
//     consequence that the E2E asserts — law_mis §173 "auto-audit des bâtiments joueur ajouté en
//     queue avec source SCHEDULED").
//   - The economy CHARGE (false_report_base_cost $50) is accepted as a log entry day-1; the actual
//     currency deduction is player economy P2 (future — deferred with the economy layer). The
//     cost value is resolved from the tunable for observability.

import { Injectable, Logger } from '@nestjs/common';

import { inspectionTunables } from './inspection-tunables';
import { FalseReportLedgerRepository, type LedgerEntryResult } from './false-report-ledger.repository';
import { InspectionQueueRepository } from './inspection.repository';
import type { FalseReportEntryType } from '../../db/schema/false_report_ledger';
// W1.2-a C4 — the ONE `cheat_flag` writer this lot adds (C1 decoy-spam signal). Evaluated on EVERY
// FILE action (this service's OWN `fileReport`, below) — best-effort, see that method's own comment.
import { CheatFlagService } from '../../anti_cheat/cheat_flag/cheat-flag.service';

/** The result of a successful FILE action. */
export interface FileReportResult {
  report_id: string;
  entry_type: FalseReportEntryType;
  /** Cost resolved from false_report_base_cost tunable (economy deduction P2-future). */
  cost_resolved: number;
  /** Whether the flood backlash was activated by this submission. */
  backlash_triggered: boolean;
}

@Injectable()
export class FalseReportLedgerService {
  private readonly logger = new Logger(FalseReportLedgerService.name);

  constructor(
    private readonly ledgerRepo: FalseReportLedgerRepository,
    private readonly queueRepo: InspectionQueueRepository,
    // W1.2-a C4.
    private readonly cheatFlag: CheatFlagService,
  ) {}

  /**
   * FILE a false or genuine report for a player. Inserts a FalseReportLedger entry, evaluates the
   * flood_backlash_threshold (false:genuine ratio), and — if exceeded — activates the backlash:
   *   (a) mark backlash_penalty_active = true in the summary row;
   *   (b) inject a SCHEDULED auto-audit entry into district 1's queue (the canonical backlash
   *       consequence — law_mis §173; a single district is chosen as the backlash sentinel; a
   *       full-district sweep is the P2 enhancement).
   *
   * @param playerId       The player's player_id (resolved from JWT account_id).
   * @param targetBuildingId The building_id targeted by the report.
   * @param entryType      'FALSE_REPORT' | 'GENUINE_REPORT'.
   * @param districtIds    The player's current district ids (from inspection_queues — the queues that
   *                       exist after the lazy seed). Used to inject the auto-audit on backlash.
   *                       Pass [] if no queues are seeded yet (the backlash audit won't be injected
   *                       without seeded queues — the player has no districts yet).
   */
  async fileReport(
    playerId: string,
    target: { uuid: string } | { legacyProxyId: number },
    entryType: FalseReportEntryType,
    districtIds: number[],
  ): Promise<FileReportResult> {
    // 1. Insert the ledger entry + upsert the summary (atomic in the repo transaction).
    const { entry, summary } = await this.ledgerRepo.insertEntryAndGetSummary(playerId, target, entryType);

    // W1.2-a C4 — evaluate the C1 decoy-spam signal on EVERY FILE action (the appelant de production
    // this lot's périmètre spec §12 C3 names). Best-effort BY DESIGN: a detector fault must never break
    // the report the player just filed — caught and logged here, never rethrown. Deliberately AFTER the
    // ledger write (not inside its transaction — this lot's C4 does not require atomicity with the
    // ledger insert, unlike the two-person consume+enforcement_action pair in C3).
    try {
      await this.cheatFlag.evaluateDecoySpam(playerId);
    } catch (err) {
      this.logger.warn(
        `W1.2-a C4 evaluateDecoySpam failed for player ${playerId} (report still filed): ${(err as Error).message}`,
      );
    }

    const cost = inspectionTunables.falseReportBaseCost;
    const threshold = inspectionTunables.floodBacklashThreshold;

    // 2. Flood check: false:genuine ratio (use max(genuine,1) to avoid divide-by-zero; a genuine count
    //    of 0 means ratio = false_count which is either 0 or > threshold).
    const ratio = summary.window_false_count / Math.max(summary.window_genuine_count, 1);
    const thresholdExceeded = ratio >= threshold && summary.window_false_count > 0;

    let backlash_triggered = false;

    if (thresholdExceeded && !summary.backlash_penalty_active) {
      // Activate backlash. The remaining_count is set to the threshold (N more submissions are
      // suppressed = the backlash window; future decay clears it). Law_mis §173: "prochains N
      // rapports ignorés" — N = threshold value from the registry.
      await this.ledgerRepo.activateBacklash(playerId, threshold);
      backlash_triggered = true;

      this.logger.log(
        `flood backlash activated for player ${playerId}: false=${summary.window_false_count} ` +
          `genuine=${summary.window_genuine_count} ratio=${ratio.toFixed(2)} ` +
          `threshold=${threshold} — injecting SCHEDULED auto-audit (law_mis §173).`,
      );

      // Inject a SCHEDULED auto-audit entry into one of the player's inspection queues (the backlash
      // consequence the E2E asserts). We use district 1 as the canonical backlash district (the first
      // seeded queue; a full-district injection is the P2 enhancement). The building_id used for the
      // audit entry is the targetBuildingId of the triggering report — the backlash targets the
      // offending building (law_mis §NestJS §173: "auto-audit des bâtiments joueur").
      // ⚠️ TD-481 — LE RETOUR DE BÂTON VISE TOUJOURS UN PROXY. La file d'inspection ne porte que des
      // `building_id` ENTIERS, synthétisés par hash (`inspection.service.ts#scheduledBuildingId`) ; le
      // couplage à l'état RÉEL d'un bâtiment est le lot System 7. Quand le rapport désigne un bâtiment
      // réel (uuid), il n'existe donc AUCUN entier légitime à injecter — et en fabriquer un (un hash de
      // l'uuid) créerait l'identifiant de plus que l'arbitrage TD-481 refuse. ⇒ On n'injecte l'audit
      // que sur le chemin LEGACY, et on le DIT dans le journal plutôt que de simuler un ciblage.
      if (districtIds.length > 0 && 'legacyProxyId' in target) {
        await this.injectBacklashAudit(playerId, districtIds[0], target.legacyProxyId);
      } else if (districtIds.length > 0) {
        this.logger.log(
          `backlash actif pour ${playerId} sur un rapport à référent RÉEL (uuid) : aucun audit injecté — ` +
            `la file d'inspection n'adresse que des proxies entiers (couplage System 7, TD-481).`,
        );
      }
    }

    return {
      report_id: entry.report_id,
      entry_type: entry.entry_type,
      cost_resolved: cost,
      backlash_triggered,
    };
  }

  /**
   * Inject ONE SCHEDULED auto-audit entry into a district's inspection queue (the backlash consequence).
   * Reuses InspectionQueueRepository.getQueue + applyQueues (the SAME mutation path the dispatch tick
   * uses — no parallel pathway). The injected entry is source=SCHEDULED, priority_bucket=HIGH (the
   * backlash audit is a high-priority forced inspection — law_mis §173 cross-ref gdd/04 §System 6
   * §Edge cases). decay_accumulator=0, age_in_ticks=0 (fresh entry).
   *
   * If the district queue doesn't exist yet (no rows seeded — e.g. race between first FILE and first
   * tick), this is a NO-OP (the queue will be seeded on the next tick; the audit can be re-injected
   * then). The flood_backlash_threshold activation is persisted regardless.
   */
  private async injectBacklashAudit(playerId: string, districtId: number, buildingId: number): Promise<void> {
    const state = await this.queueRepo.getQueue(playerId, districtId);
    if (state === null) {
      this.logger.warn(
        `backlash audit for player ${playerId} district ${districtId}: no queue row yet (lazy seed not run) — skipping audit injection.`,
      );
      return;
    }

    // 04e-A1 C5 (§6.1 live MIS-cap lever, additional consumer beyond the plan's explicit citation — found
    // during C5 wiring: this is the SAME `T.city.inspection_queue_cap` key the dispatch tick's overflow policy
    // reads, so it must reflect the same overlay for internal consistency): thread this district's own id.
    const cap = inspectionTunables.inspectionQueueCapFor({ districtId: String(districtId) });
    const auditEntry = {
      building_id:       buildingId,
      priority_bucket:   'HIGH' as const,
      age_in_ticks:      0,
      source:            'SCHEDULED' as const,
      decay_accumulator: 0,
    };

    // Apply the same overflow policy as the dispatch tick (Inv 3): if the queue is at the cap, drop
    // the oldest LOW entry first before inserting the audit.
    let entries = [...state.entries];
    if (entries.length >= cap) {
      const firstLowIdx = entries.findIndex((e) => e.priority_bucket === 'LOW');
      if (firstLowIdx >= 0) {
        entries.splice(firstLowIdx, 1);
      } else {
        // No LOW entries — drop from the tail (oldest, FIFO — least-harmful overflow).
        entries = entries.slice(1);
      }
    }
    entries.push(auditEntry);

    await this.queueRepo.applyQueues(playerId, [
      {
        district_id:             districtId,
        entries,
        length:                  entries.length,
        processing_rate_per_day: state.processing_rate_per_day,
        budget_modifier:         state.budget_modifier,
      },
    ]);

    this.logger.log(
      `backlash SCHEDULED audit injected into player=${playerId} district=${districtId} ` +
        `building=${buildingId} queue_length_after=${entries.length}.`,
    );
  }
  /**
   * TD-481 — le bâtiment désigné appartient-il bien à ce joueur ? Sans ce contrôle, la route
   * accepterait l'uuid de N'IMPORTE QUEL bâtiment : on aurait remplacé un identifiant qui ne désigne
   * rien par un identifiant qui désigne le bâtiment d'un AUTRE.
   */
  async buildingBelongsToPlayer(playerId: string, buildingUuid: string): Promise<boolean> {
    return this.ledgerRepo.buildingBelongsToPlayer(playerId, buildingUuid);
  }

}
