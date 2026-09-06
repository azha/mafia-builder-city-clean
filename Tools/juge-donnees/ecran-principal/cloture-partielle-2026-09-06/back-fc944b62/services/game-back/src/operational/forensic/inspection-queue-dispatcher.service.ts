// IMPLEMENTS: docs/superpowers/plans/2026-06-19-depth-forensic-signaling-plan.md Task 22 (C22)
//             docs/tech/04c_market_reputation_insurance/forensic_signaling_mechanics.md §4.3 routing map
//             — Forensic C22 — 2026-06-20
//
// `InspectionQueueDispatcherService` — System 6 forensic dispatcher: routes FORENSIC queue entries by
// `forensic_kind` to their §4.3 consequence (DD-MIS-DISPATCHER / DIV-2).
//
// This service subscribes to `ForensicEntryDispatchedEvent` (emitted by `InspectionQueueService` at
// dispatch-time when `source === 'FORENSIC'`) and routes per the §4.3 map:
//
//   forensic_kind       | Consequence
//   --------------------|------------------------------------------------------------
//   hard_audit          | LeadingDigitAuditService.triggerHardAudit (seizure + front dark) — C9 REUSE
//                       | The dispatcher queries ledger_entry_ring to resolve the player's front_id
//                       | (a UUID string) before calling triggerHardAudit (which takes frontId: string).
//   effluent_inspection | heat bump via emitHeatInjection (LOW magnitude, FLOW_CONGESTION source)
//                       | + (fine + §4.1 premium deferred TD — canon-silent magnitude)
//   tail_passive        | observation only — log, no hard consequence
//   tail_active         | heat bump via emitHeatInjection (LOW magnitude, FLOW_CONGESTION source)
//                       | + visible escalation (logged; full escalation deferred)
//   tail_subpoena       | emit + log only — MIS subpoena legal hook deferred TD
//
// DB TRACES (the reviewer's falsifiability requirement):
//   - hard_audit:           `front_dark_until_tick` non-null + wallet debit (via triggerHardAudit, C9)
//                           The front_id is resolved from ledger_entry_ring by playerId (first row).
//   - effluent_inspection:  `HeatInjectionEvent` emitted on the canonical bus seam (FLOW_CONGESTION source);
//                           the heat service flushes to buildings.heat next MINUTE/4 tick
//   - tail_active:          `HeatInjectionEvent` emitted on the canonical bus seam (FLOW_CONGESTION source)
//   - tail_passive:         log only (no hard consequence per §4.3 — sedan parks, no action yet)
//   - tail_subpoena:        log only (legal-case path deferred TD)
//
// HARD-AUDIT FRONT-ID RESOLUTION:
//   `triggerHardAudit(playerId, frontId, currentTick)` requires a UUID `frontId` (the ledger_entry_ring PK).
//   The FORENSIC queue entry only carries an INTEGER `building_id` (the queue's hash-deterministic sentinel).
//   The dispatcher resolves the player's `front_id` UUID by querying `ledger_entry_ring` WHERE player_id = e.playerId.
//   The test route `push-queue-entry?forensicKind=hard_audit` seeds a `ledger_entry_ring` row for the test player
//   (using TEST_FRONT_ID sentinel), so this query always finds one row in E2E.
//   In production, the FORENSIC/hard_audit entry is created by C9 only after a soft-flag ring row exists
//   (recordSoftFlag always pre-seeds the ring), so the resolver also always finds a row in prod.
//
// HEAT-BUMP RE-ANCHOR: mirrors the EXISTING `emitHeatInjection` seam (heat_contrib.service.ts:206,
//   city-event-bus.ts:1498). The dispatcher calls `this.bus.emitHeatInjection(...)` DIRECTLY (no HeatContribService
//   injection — the bus seam is the canonical write path). Magnitude = 'LOW' (same as LEK_DEAL — a modest exposure).
//   Source = 'FLOW_CONGESTION' (the nearest existing HeatSource for systemic forensic pressure; avoids adding a new
//   HeatSource domain value). No new scalar invented.
//
// Anti-fabrication: no Math.random. No inline balance-relevant scalar. The hard_audit seizure fraction is
//   owned by triggerHardAudit (C9, forensicTunables.hardAuditSeizurePct). The effluent/tail heat magnitude
//   is 'LOW' (REUSE of the existing HeatInjectionMagnitude domain — not a new scalar; LEK_DEAL precedent).
// Zero-regression: the service only SUBSCRIBES to `ForensicEntryDispatchedEvent` (never emits it);
//   the non-forensic dispatch path (SCHEDULED/INFORMANT/etc.) is unaffected.
// DIV-2 invariant: System 6 is NOT rebuilt — only the FORENSIC-source branch is added (additive).
// R2.2: no raw scalar surfaces to the client — all consequences are server-internal.
// No Math.random.

import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { ForensicEntryDispatchedEvent } from '../../citysim/events/city-event-bus';
import { CityEventBus } from '../../citysim/events/city-event-bus';
import type { DrizzleClient } from '../../db';
import { DB } from '../../db/db.module';
import { ledgerEntryRing } from '../../db/schema/forensic';
import { LeadingDigitAuditService } from './leading-digit-audit.service';

@Injectable()
export class InspectionQueueDispatcherService {
  private readonly logger = new Logger(InspectionQueueDispatcherService.name);

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly bus: CityEventBus,
    private readonly leadingDigitAudit: LeadingDigitAuditService,
  ) {}

  /**
   * onForensicEntryDispatched — route a FORENSIC queue entry to its §4.3 consequence.
   *
   * Called by the `ForensicEntryDispatchedEvent` bus subscriber (wired in
   * `ForensicSignalingModule.onApplicationBootstrap` via `bus.onForensicEntryDispatched`).
   * Returns a Promise so the caller (the async IIFE wrapper in the module) can await the consequence.
   *
   * Routing table (§4.3):
   *   hard_audit          → resolve front_id from ledger_entry_ring → triggerHardAudit (C9 REUSE) — DB trace
   *   effluent_inspection → heat bump (emitHeatInjection LOW/FLOW_CONGESTION) — DB trace via bus
   *   tail_passive        → observation log only — no hard consequence
   *   tail_active         → heat bump (emitHeatInjection LOW/FLOW_CONGESTION) — DB trace via bus
   *   tail_subpoena       → emit + log only (MIS subpoena legal hook deferred TD)
   *
   * NOTE: the bus dispatch method is synchronous (the `dispatch` private method in CityEventBus
   * iterates listeners synchronously). The SUBSCRIBER registered in onApplicationBootstrap wraps
   * this method in a void async IIFE to avoid blocking the synchronous dispatch loop (the same
   * pattern as other async bus consumers). Errors are caught in the IIFE wrapper (module-level).
   *
   * @param e - the ForensicEntryDispatchedEvent emitted by InspectionQueueService at drain-time.
   */
  async onForensicEntryDispatched(e: ForensicEntryDispatchedEvent): Promise<void> {
    this.logger.log(
      `forensic dispatch kind=${e.forensicKind} consequence=routing playerId=${e.playerId} ` +
        `districtId=${e.districtId} buildingId=${e.buildingId} priority=${e.priorityBucket}`,
    );

    switch (e.forensicKind) {
      case 'hard_audit': {
        // §4.3: hard_audit → triggerHardAudit (C9 REUSE — seizure + front dark 2-4 weeks).
        //
        // FRONT-ID RESOLUTION: `triggerHardAudit` requires (playerId, frontId: string, currentTick).
        // `frontId` is the UUID PK of `ledger_entry_ring`. The FORENSIC queue entry only carries an
        // INTEGER `building_id` (the queue's hash-deterministic sentinel — NOT a UUID). The dispatcher
        // resolves the player's first `ledger_entry_ring.front_id` UUID from DB.
        //
        // In the E2E: the `push-queue-entry?walletCents=N` route seeds a `ledger_entry_ring` row
        // with `front_id = TEST_FRONT_ID` before seeding the queue entry.
        // In production: the FORENSIC/hard_audit entry is created by C9 only when `recordSoftFlag`
        // finds the threshold met — and recordSoftFlag always pre-seeds the ring row (C6 path).
        // Both paths guarantee at least one `ledger_entry_ring` row exists for the player.
        //
        // If no ring row is found (defensive edge case — impossible in organic prod), log and skip
        // (no crash; the single-fire guard in triggerHardAudit is the production-path safety net).
        const ringRows = await this.db
          .select({ front_id: ledgerEntryRing.front_id })
          .from(ledgerEntryRing)
          .where(eq(ledgerEntryRing.player_id, e.playerId))
          .limit(1);

        if (!ringRows[0]) {
          this.logger.warn(
            `forensic dispatch kind=hard_audit consequence=SKIPPED (no ledger_entry_ring row for ` +
              `player=${e.playerId} — impossible in organic prod; check E2E seed path)`,
          );
          break;
        }

        const frontId = ringRows[0].front_id as string;

        // currentTick = e.gameMinute (the dispatch tick game-minute — DD-FLAGTICK-UNIT: game-tick).
        // RE-ANCHOR: REUSES the EXISTING triggerHardAudit (C9, leading-digit-audit.service.ts:515).
        // DB trace: front_dark_until_tick non-null + wallet debit (economy_states.cash_cents reduced).
        await this.leadingDigitAudit.triggerHardAudit(e.playerId, frontId, e.gameMinute);
        this.logger.log(
          `forensic dispatch kind=hard_audit consequence=fired playerId=${e.playerId} ` +
            `frontId=${frontId} currentTick=${e.gameMinute}`,
        );
        break;
      }

      case 'effluent_inspection': {
        // §4.3: effluent_inspection → inspector-action: heat bump (+ fine + §4.1 premium deferred TD).
        //
        // HEAT-BUMP RE-ANCHOR: mirrors the EXISTING `emitHeatInjection` seam (heat_contrib.service.ts:206).
        // Magnitude = 'LOW' (REUSE — same as LEK_DEAL source, a modest exposure, no new scalar).
        // Source = 'FLOW_CONGESTION' (the nearest existing HeatSource for forensic systemic pressure;
        // avoids adding a new HeatSource domain value to the closed union).
        //
        // NOTE: The fine (a monetary penalty) is deferred — the canon §4.3 says "fine" but gives no
        // amount, making this a canon-silent magnitude. Per the implementation instructions: "If the
        // effluent fine amount is a balance-relevant magnitude the canon is silent on AND you cannot
        // reuse an existing tunable/path for it, STOP and report." — the fine is DEFERRED here (TD).
        // Only the heat bump fires as the observable consequence (via the canonical bus seam).
        //
        // DB trace: HeatInjectionEvent is emitted on CityEventBus; HeatPropagationService (MINUTE/4)
        // buffers it in-memory and flushes to buildings.heat on the next tick.
        this.bus.emitHeatInjection({
          type: 'heat_injection',
          playerId: e.playerId,
          districtId: e.districtId,
          buildingId: String(e.buildingId),
          magnitude: 'LOW',
          source: 'FLOW_CONGESTION', // REUSE of existing HeatSource (nearest systemic-pressure analog)
          gameMinute: e.gameMinute,
        });
        this.logger.log(
          `forensic dispatch kind=effluent_inspection consequence=fired (heat LOW) ` +
            `playerId=${e.playerId} districtId=${e.districtId} buildingId=${e.buildingId} ` +
            `(fine deferred TD — canon-silent magnitude)`,
        );
        break;
      }

      case 'tail_passive': {
        // §4.3: tail_passive → observation only. Sedan parks; no hard consequence yet.
        // Log only — no DB write, no event emission. Confirmed non-consequence by §4.3 table.
        this.logger.log(
          `forensic dispatch kind=tail_passive consequence=observation_only (no hard consequence yet) ` +
            `playerId=${e.playerId} districtId=${e.districtId}`,
        );
        break;
      }

      case 'tail_active': {
        // §4.3: tail_active → heat bump + visible escalation.
        //
        // HEAT-BUMP RE-ANCHOR: same seam as effluent_inspection (emitHeatInjection, 'LOW' magnitude).
        // Source = 'FLOW_CONGESTION' (REUSE — same analog; the tail heat is systemic pressure).
        // The "visible escalation" (sedan sprite change) is Unity-side — the bus event is the seam
        // (the ForensicEntryDispatchedEvent itself is the signal; full escalation deferred to C24).
        this.bus.emitHeatInjection({
          type: 'heat_injection',
          playerId: e.playerId,
          districtId: e.districtId,
          buildingId: String(e.buildingId),
          magnitude: 'LOW',
          source: 'FLOW_CONGESTION', // REUSE of existing HeatSource (tail-active systemic pressure)
          gameMinute: e.gameMinute,
        });
        this.logger.log(
          `forensic dispatch kind=tail_active consequence=fired (heat LOW + escalation) ` +
            `playerId=${e.playerId} districtId=${e.districtId} buildingId=${e.buildingId}`,
        );
        break;
      }

      case 'tail_subpoena': {
        // §4.3: tail_subpoena → log only in the dispatcher.
        //
        // The legal-case hook is wired on the BUS SIDE in LegalCaseService.onModuleInit
        // (LawyerModule subscribes to ForensicEntryDispatchedEvent and handles tail_subpoena).
        // This avoids the circular dependency:
        //   ForensicSignalingModule → LawyerModule → LieutenantModule → ProductionModule → ForensicSignalingModule
        //
        // The bus seam is the canonical inter-module coupling point. Both subscribers coexist:
        //   - InspectionQueueDispatcherService (here): logs + handles forensic-side bookkeeping.
        //   - LegalCaseService (LawyerModule): creates the legal case (MIS subpoena → legal referral).
        // ADDITIVE: neither subscriber interferes with the other (CityEventBus multi-listener safe).
        this.logger.log(
          `forensic dispatch kind=tail_subpoena consequence=log+legal_case_via_bus ` +
            `(LegalCaseService.onModuleInit tail_subpoena subscriber fires independently) ` +
            `playerId=${e.playerId} districtId=${e.districtId} buildingIdHash=${e.buildingId}`,
        );
        break;
      }

      default: {
        // Defensive: unknown forensic_kind — log and skip (no crash).
        // The union is exhaustive at compile time; this branch catches runtime mismatches.
        this.logger.warn(
          `forensic dispatch kind=${String((e as { forensicKind: unknown }).forensicKind)} UNKNOWN — skipped ` +
            `playerId=${e.playerId} districtId=${e.districtId}`,
        );
        break;
      }
    }
  }
}
