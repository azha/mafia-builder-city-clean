// IMPLEMENTS: docs/tech/04a_operational_systems/laundering_pipeline.md §Stage 1 — cash into front shop
//             (LaunderingService.injectCash(safehouseId, frontShopId, amountCents) — "Amount ajouté à
//              front.actual_weekly_cents" → the front-shop's declared revenue stream) + §Contrainte fondamentale
//              Unconformity (injection ≤ front.expected_weekly_cents[slot] sinon deviation_score spike → audit pin) +
//             §Stage 2 — front shop output (cash absorbé devient legitimate revenue, cleanliness saturates) +
//             docs/tech/04_city_simulation/system_8_dwell_time_tax.md §Update tick (the cleanliness/dwell the node
//              already models — CONSUMED) + system_9_erlang_stash.md §États Safehouse (the percent slot model the
//              drain CONSUMES) + system_7_unconformity_ledgers.md §Update tick (the audit-pin nightly job the
//              deviation feeds) + docs/tech/09_data_model/schema_pipeline_and_laundering.md §2 (R9.3)
//             -- session:2026-06-03 (Phase 2 Task 6) --
//
// `LaunderingService` — the player-triggered INJECT action of the M1 Stage-1 laundering slice (the tick-driven
// clean-output release is the LAUNDER_OUTPUT tick-hook, LaunderingOutputService). It owns the action LOGIC; the
// repository owns the raw reads/writes (the persisted-system service/repository split).
//
// ── inject(playerId, frontShopId, safehouseId, amountCents): the Stage-1 cash injection (laundering_pipeline.md
//    §Stage 1). Move `amountCents` from the safehouse (System 9 percent slot model — DRAINED) into the front-shop's
//    Stage-1 laundering node (the in-process buffered cash, held in `tail_risk_estimates.current_occupancy` — the
//    cash in cents, System 10's cash field).
//    Three couplings, all CONSUMED (never rebuilt):
//      · System 9 — DRAIN the safehouse's per-slot percent fill by `amountCents` (the inverse of T5's deposit fill),
//        guarded: the safehouse must hold at least `amountCents` (reconstructed cents Σ round((pct/100)×cap)) else 409.
//      · System 8 — MINUTE/2 recomputes cleanliness_at_output over dwell (CONSUMED — see LaunderingOutputService for
//        the release). The inject does NOT recompute dwell. The inject seeds the node's tail_risk_estimate row with
//        drain_rate = 0 (so System 10's drain-to-next-stage does NOT leak the cash) + capacity ≥ held cents (so
//        System 10's overflow cap never drops cash). System 10 then keeps buffer_load synced from current_occupancy;
//        this service CONSUMES System 10's occupancy/capacity fields, never recomputes its tail-risk math.
//      · System 7 — if `amountCents` exceeds the front-shop's legitimate baseline → DEVIATION: write a deviation-
//        bearing transaction_profile so System 7's NIGHTLY tick scores it CRITICAL → audit pin. Within baseline →
//        write a conforming (NOMINAL) profile. The deviation DECISION is System 7's (its z-score); the inject only
//        feeds the declared-revenue input it scores.
//    Validation/guards: front-shop not the player's / not an operational front_shop → 404; safehouse not the player's
//    → 404; amountCents not a positive integer → 422; insufficient safehouse cash → 409; the post-credit node
//    current_occupancy would exceed the node's capacity (inventory_cap_per_node) → 409 (a single inject can't overflow
//    the node).
//
// THE PERCENT-SLOT DRAIN (System 9 CONSUMED — the inverse of T5's fillSlots, the SAME unit): `safehouses.current_fill`
// is per-slot PERCENT (0..100), NOT cents (the System-9 unit — selling.service.ts fillSlots header). To drain
// `amountCents` we reconstruct each slot's cents (round((pct/100)×capacity)), subtract the amount highest-index-first
// (the inverse of the deposit's lowest-index-first fill — deterministic, no RNG), and convert back to percent. The
// reconstructed total cents is the authoritative "can the safehouse cover this" guard. For EXACT cash conservation in
// the capstone the inject amount lands on whole-percent boundaries of slot_capacity_cents (the T5 forward-note), so
// the drain round-trips with zero drift — drain N cents → the safehouse represents exactly N cents less.
//
// THE CASH STORE (the second conservation surface): the injected cents live in `tail_risk_estimates.current_occupancy`
// (a float4 column holding integer cents — System 10's cash field). The release reads `current_occupancy` for the
// exact cents (a float4 holding an integer < ~16.7M cents — exact for M1 amounts), credits the wallet, and zeroes
// `current_occupancy`. `laundering_nodes.buffer_load` (= clamp(occupancy/capacity, 0, 1)) is NOT the cash store —
// System 10 SYNCs it from `current_occupancy` each MINUTE/3 tick; the release does NOT read buffer_load. For EXACT
// conservation the inject amount is a whole-integer cent value within the node's capacity (a float4 with integer < 16M
// is exact), so the round-trip is lossless: inject N cents → the node releases N cents (minus the deterministic
// integer dwell-tax cut).

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { dwellTimeTunables } from '../../citysim/dwell_time/dwell-time-tunables';
import { LaunderingRepository, type SafehouseSlotRow } from './laundering.repository';
import { launderingTunables } from './laundering-tunables';
import { LeadingDigitAuditService } from '../forensic/leading-digit-audit.service';

/** The outcome of an inject — ids echoed; no raw cents surfaced (R2.2). */
export interface InjectResult {
  frontShopId: string;
  safehouseId: string;
  /** The front-shop's Stage-1 laundering node (created on the first inject) — the projection identity. */
  nodeId: string;
  /** Whether this injection exceeded the front-shop's legitimate baseline (a deviation fed to System 7). */
  deviation: boolean;
}

/** The outcome of an addStage — the new node's identity + its stage index (no raw cents/floats surfaced; R2.2). */
export interface AddStageResult {
  /** The node the new stage was appended AFTER (the former tail). */
  fromNodeId: string;
  /** The newly-created downstream laundering node (the new tail of the pipeline). */
  nodeId: string;
  /** The building hosting the new stage node. */
  buildingId: string;
  /** The new node's stage index (fromNode.stage_index + 1) — the pipeline ordinal. */
  stageIndex: number;
}

@Injectable()
export class LaunderingService {
  private readonly logger = new Logger(LaunderingService.name);

  constructor(
    private readonly repo: LaunderingRepository,
    // C6 — ADDITIVE: recordReceipt feeds the Benford ring (§5.1 forensic seam).
    // The laundering throughput / declared baseline / all return values are UNCHANGED.
    private readonly forensic: LeadingDigitAuditService,
  ) {}

  /**
   * inject — the Stage-1 cash injection (laundering_pipeline.md §Stage 1). Drains `amountCents` from the safehouse
   * (System 9 CONSUMED) into the front-shop's Stage-1 node buffer (the in-process cash), and feeds the deviation
   * input to System 7 (CONSUMED) if the amount exceeds the front-shop's legitimate baseline. Atomic + guarded.
   */
  async inject(
    playerId: string,
    frontShopId: string,
    safehouseId: string,
    amountCents: number,
  ): Promise<InjectResult> {
    if (!Number.isInteger(amountCents) || amountCents < 1) {
      // r2/m4 — details.param was missing here, same gap as money-holding.service.ts's own check.
      throw new ApiError('VALIDATION_FAILED', {
        message: `amountCents must be a positive integer (got "${amountCents}").`,
        details: { param: 'amount_cents' },
      });
    }

    const frontShop = await this.repo.getOwnedOperationalFrontShop(playerId, frontShopId);
    if (!frontShop) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `front-shop ${frontShopId} is not a player-owned OPERATIONAL front_shop for this player.`,
      });
    }
    const safehouseRow = await this.repo.getOwnedSafehouse(playerId, safehouseId);
    if (!safehouseRow) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `safehouse ${safehouseId} is not a player-owned safehouse.`,
      });
    }

    // CONSUME System 9: reconstruct the safehouse's held cents + compute the post-drain per-slot fill. A drain that
    // exceeds the held cents is refused (can't inject more than the safehouse holds — the exact-cents guard).
    const drain = this.drainSlots(safehouseRow, amountCents);
    if (!drain) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `safehouse ${safehouseId} holds less than the requested inject amount — inject blocked.`,
      });
    }

    // CONSUME System 10: the injected cents land in the node's tail_risk_estimate current_occupancy (System 10's cash
    // field). The node's CENTS capacity = inventory_cap_per_node × 100 (System 8 treats inventory_cap_per_node as
    // DOLLARS — cashMagnitude = buffer_load × inventory_cap_per_node yields a $ figure, dwell-time.service.ts). The
    // post-credit occupancy must stay within the capacity (so System 10's overflow cap never drops cash); a single
    // inject that would overflow the node is refused (M1 — no overflow split).
    const capacityCents = Math.max(1, dwellTimeTunables.inventoryCapPerNode * 100);
    const existing = await this.repo.getStage1Node(playerId, frontShopId);
    const currentOccupancy = existing?.occupancy_cents ?? 0;
    if (currentOccupancy + amountCents > capacityCents) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `front-shop ${frontShopId} Stage-1 node is at capacity — this injection would overflow it.`,
      });
    }

    // CONSUME System 7: decide deviation-vs-conforming against the legitimate baseline, and build the declared-revenue
    // transaction_profile System 7's NIGHTLY tick scores (the deviation DECISION — z-score → pin — is System 7's).
    const baseline = Math.max(1, launderingTunables.frontShopLegitBaselineCents);
    const deviation = amountCents > baseline;
    const transactionProfile = this.buildTransactionProfile(amountCents, baseline, deviation);

    const nodeId = await this.repo.applyInject(playerId, {
      safehouse_id: safehouseId,
      preDrainFill: safehouseRow.current_fill,
      postDrainFill: drain,
      front_shop_id: frontShopId,
      node_id: existing?.node_id ?? null,
      amountCents,
      capacityCents,
      transactionProfile,
    });
    if (nodeId === null) {
      // The safehouse fill changed between the read and the guarded drain (a concurrent op) → ask the caller to retry.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `safehouse ${safehouseId} fill changed during inject — retry.`,
      });
    }

    this.logger.log(
      `inject: player=${playerId} safehouse=${safehouseId} → front_shop=${frontShopId} ` +
        `(cash drained into Stage-1 node=${nodeId} buffer; deviation=${deviation})`,
    );
    // C6 — §5.1 Forensic Benford ring: ADDITIVE emit AFTER the inject body (the "front receipts
    // feed BOTH laundering AND Benford audit" seam, canon :213). The laundering throughput /
    // declared baseline / nodeId / deviation return value are BYTE-IDENTICAL — this call only
    // pushes firstDigit(amountCents) into the FIFO ring; it never mutates nodes/safehouses.
    await this.forensic.recordReceipt(playerId, frontShopId, amountCents);
    return { frontShopId, safehouseId, nodeId, deviation };
  }

  /**
   * addStage — append a downstream laundering stage to the pipeline (Phase 2b — laundering_pipeline.md §Stage 3 /
   * §NestJS PipelineService.addStageNode). Creates a new laundering_node on a player-owned OPERATIONAL building at
   * stage_index = fromNode.stage_index + 1 + a laundering_edge fromNode → the new node, so the cash routes one stage
   * further before it can reach the wallet (the new node becomes the pipeline TAIL — the terminal release node — until
   * a further stage is appended). The pipeline is LINEAR (parallel branches DEFERRED — YAGNI): a stage can only be
   * appended to the current TAIL (a node with no outgoing edge). Atomic + guarded.
   *
   * Guards: fromNode not the player's → 404; the host building not a player-owned OPERATIONAL building → 404; fromNode
   * is NOT the tail (already has a downstream stage) → 409 (the chain forks otherwise — DEFERRED); the building already
   * hosts a laundering node → 409 (one node per building per chain — an unambiguous linear chain).
   */
  async addStage(playerId: string, fromNodeId: string, buildingId: string): Promise<AddStageResult> {
    const fromNode = await this.repo.getOwnedPipelineNode(playerId, fromNodeId);
    if (!fromNode) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `from-node ${fromNodeId} is not a player-owned laundering node.`,
      });
    }
    const host = await this.repo.getOwnedOperationalBuilding(playerId, buildingId);
    if (!host) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${buildingId} is not a player-owned OPERATIONAL building (cannot host a laundering stage).`,
      });
    }
    if (!fromNode.is_terminal) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `node ${fromNodeId} already has a downstream stage — append onto the pipeline tail (linear chain only).`,
      });
    }
    const existingOnBuilding = await this.repo.getNodeOnBuilding(playerId, buildingId);
    if (existingOnBuilding !== null) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `building ${buildingId} already hosts a laundering node — one node per building per pipeline.`,
      });
    }

    // The node CENTS capacity = inventory_cap_per_node × 100 (System 8 treats inventory_cap_per_node as DOLLARS —
    // dwell-time.service.ts cashMagnitude). The routed cash must stay within this so System 10's overflow cap never
    // drops it. The SAME capacity the inject path pins on the Stage-1 node — uniform across stages (M1/2b).
    const capacityCents = Math.max(1, dwellTimeTunables.inventoryCapPerNode * 100);

    const newNodeId = await this.repo.addStageNode(playerId, {
      from_node: fromNodeId,
      building_id: buildingId,
      from_stage_index: fromNode.stage_index,
      capacityCents,
    });
    if (newNodeId === null) {
      // A concurrent addStage advanced the tail between the read and the guarded insert → ask the caller to retry.
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: `node ${fromNodeId} acquired a downstream stage concurrently — retry against the new tail.`,
      });
    }

    const stageIndex = fromNode.stage_index + 1;
    this.logger.log(
      `addStage: player=${playerId} appended stage ${stageIndex} (node=${newNodeId} on building=${buildingId}) ` +
        `after node=${fromNodeId} (the new pipeline tail).`,
    );
    return { fromNodeId, nodeId: newNodeId, buildingId, stageIndex };
  }

  /**
   * Drain `amountCents` from a safehouse's per-slot percent fill (System 9 CONSUMED — the inverse of T5's fillSlots),
   * returning the post-drain per-slot percent array — OR null if the safehouse holds LESS than `amountCents` (the
   * exact-cents guard; M1 requires the whole amount to be available).
   *
   * The slot model: each of `slot_count` slots holds up to `slot_capacity_cents`; current_fill[i] is slot i's percent
   * (0..100). We reconstruct per-slot cents (round((pct/100)×capacity)), check the total covers the amount, drain the
   * amount HIGHEST-index-first (the inverse of the deposit's lowest-index-first fill — deterministic, no RNG), and
   * convert back to percent. The Erlang-B blocking is NOT recomputed (that is ErlangStashService's job); this is the
   * raw slot bookkeeping the safehouse schema owns. Identical unit + round-trip discipline as selling.service.ts.
   */
  private drainSlots(safehouse: SafehouseSlotRow, amountCents: number): number[] | null {
    const slotCount = Math.max(0, Math.floor(safehouse.slot_count));
    const capacity = Math.max(0, safehouse.slot_capacity_cents);
    if (slotCount === 0 || capacity === 0) return null; // a degenerate safehouse holds nothing.

    // Per-slot cents from the current percent fill (clamped to [0, capacity]).
    const slotCents: number[] = [];
    for (let i = 0; i < slotCount; i += 1) {
      const pct = Math.max(0, Math.min(100, safehouse.current_fill[i] ?? 0));
      slotCents.push(Math.round((pct / 100) * capacity));
    }

    // The safehouse must HOLD at least the amount (reconstructed cents — the authoritative guard).
    const held = slotCents.reduce((acc, c) => acc + c, 0);
    if (held < amountCents) return null; // less cash than requested → refuse.

    // Drain slots highest-index-first (the inverse of the deposit fill; deterministic) until the amount is removed.
    let remaining = amountCents;
    for (let i = slotCount - 1; i >= 0 && remaining > 0; i -= 1) {
      const take = Math.min(slotCents[i], remaining);
      slotCents[i] -= take;
      remaining -= take;
    }

    // Back to per-slot percent (0..100) for the jsonb current_fill column.
    return slotCents.map((c) => Math.round((c / capacity) * 100));
  }

  /**
   * Build the front-shop transaction_profile (System 7's deviation input — `{ revenue_samples, latest_revenue }`).
   * System 7's z-score = |latest - mean(samples)| / stddev(samples) (unconformity.service.ts deviationZScore):
   *   - CONFORMING (amount ≤ baseline): latest sits AT the baseline mean of a flat profile → z = 0 → NOMINAL → no pin.
   *   - DEVIATION (amount > baseline): a flat sample history AT the baseline + a SPIKING latest (= the injected
   *     amount, far above the baseline mean with near-zero spread) → a large z → CRITICAL → an immediate audit pin
   *     (CRITICAL pins on the first nightly tick, unconditionally — unconformity.service.ts §Phase D). We seed a flat
   *     history with a TINY spread (not exactly zero) so the z-score is large-but-finite (a zero-stddev flat profile
   *     with an off latest yields +Infinity, which is still CRITICAL — but a tiny spread is the more faithful "noisy
   *     baseline" model and keeps the z deterministic/large). The deviation DECISION is System 7's; this only feeds it.
   */
  private buildTransactionProfile(
    amountCents: number,
    baselineCents: number,
    deviation: boolean,
  ): { revenue_samples: number[]; latest_revenue: number } {
    if (!deviation) {
      // Conforming: a flat history at the baseline + a latest AT the mean → z = 0 → NOMINAL (no pin).
      const samples = [baselineCents, baselineCents, baselineCents, baselineCents];
      return { revenue_samples: samples, latest_revenue: baselineCents };
    }
    // Deviation: a flat baseline history (tiny spread for a finite, large z) + a spiking latest = the injected amount.
    const jitter = Math.max(1, Math.round(baselineCents * 0.01)); // ~1% noise → a small but non-zero stddev.
    const samples = [
      baselineCents - jitter,
      baselineCents,
      baselineCents + jitter,
      baselineCents,
    ];
    return { revenue_samples: samples, latest_revenue: amountCents };
  }
}
