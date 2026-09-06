// IMPLEMENTS: docs/tech/04a_operational_systems/laundering_pipeline.md §Implications par couche / Unity
//             ("barre qualitative par-pipeline montrant cleanliness_bucket du cash actuelle" + "badge qualitatif
//              deviation_score_aggregate_bucket sur chaque front shop") + §Stage 1 injection UI (qualitative
//              deviation impact — never the raw cents) +
//             docs/tech/04_city_simulation/system_8_dwell_time_tax.md §Inv 6 (CleanlinessBucket — the raw [0,1]
//              cleanliness float NEVER exposed) + system_7_unconformity_ledgers.md §Inv 1 (deviation = AUDIT_PIN_
//              ACTIVE binary + bucket, never the raw sigma) +
//             docs/tech/01_pillars_and_vision/P5_information_asymmetry.md (R2.2 — no raw scalar to client)
//             -- session:2026-06-03 (Phase 2 Task 6) --
//
// `LaunderingProjectionService` — the player-facing projection for a front-shop's Stage-1 laundering node (the
// pipeline cleanliness bar + the front-shop deviation badge). Maps the RAW persisted node + front-shop state →
// QUALITATIVE bands: a cleanliness BAND (the [0,1] cleanliness_at_output System 8 produces — CONSUMED, never the
// float) + a deviation FLAG (the front-shop's AUDIT_PIN_ACTIVE binary — System 7's persisted output, observed not
// recomputed). It NEVER forwards a raw scalar — no buffer_load, no cleanliness float, no cents, no sigma. R2.2.
//
// THE BANDS (closed qualitative domains — the only Stage-1 signals exposed):
//   - cleanliness_band: DIRTY | PARTIAL | MOSTLY_CLEAN | CLEAN — REUSE System 8's CleanlinessBucket mapping
//     (DwellTimeService.cleanlinessBucket — the SAME bucket boundaries; the laundering surface reuses System 8's
//     band, never a parallel mapping). The raw [0,1] cleanliness_at_output is the INPUT, mapped HERE; it never
//     leaves this method (Inv 6 / R2.2).
//   - deviation_active: the front-shop's AUDIT_PIN_ACTIVE binary (System 7's persisted audit_pin_expires_at in the
//     future). The ONE permitted boolean (the "front-shop under audit" badge — the qualitative deviation signal). An
//     injection that exceeded the legitimate baseline feeds System 7's nightly tick, which (on a CRITICAL deviation)
//     activates this pin — so the flag surfaces the deviation THROUGH System 7's own observable, never a raw flag I
//     compute (Inv 1 / R2.2 — the deviation sigma stays inside System 7).
//
// R2.2 RAW-LEAK GUARANTEE: each payload contains ONLY closed-domain strings + the node uuid identity + the ONE
// AUDIT_PIN_ACTIVE boolean — NEVER the buffer_load, the cleanliness float, the buffered cents, or the deviation
// sigma. The E2E scans the payload recursively and rejects any raw scalar.

import { Injectable } from '@nestjs/common';

import type { CleanlinessBucket } from '../../citysim/events/city-event-bus';
import { DwellTimeService } from '../../citysim/dwell_time/dwell-time.service';
import { LaunderingRepository } from './laundering.repository';
import { pipelineCleanlinessForStage } from './laundering-tunables';

/** The PLAYER-FACING per-node Stage-1 laundering projection (qualitative bands only — R2.2). */
/**
 * LOT PLANQUE C3 — one entry of the player's laundering-node LIST (the re-discovery surface). Same qualitative
 * discipline as `LaunderingPipelineStage`: ids + `stage_index` + a BAND + presence flags, never a raw cent (R2.2).
 */
export interface LaunderingNodeListEntry {
  node: string;
  stage_index: number;
  cleanliness_band: CleanlinessBucket;
  terminal: boolean;
  has_cash: boolean;
}

/** The laundering-node list payload — a bounded list of qualitative projections (R2.2 inverted). */
export interface LaunderingNodeListProjection {
  nodes: LaunderingNodeListEntry[];
}

export interface LaunderingNodeProjection {
  /** The Stage-1 node identity (a uuid string — echoed for the client's pipeline panel; NOT a sim scalar). */
  node: string;
  /** The qualitative cleanliness band (DIRTY/PARTIAL/MOSTLY_CLEAN/CLEAN — never the raw [0,1] float; Inv 6 / R2.2). */
  cleanliness_band: CleanlinessBucket;
  /**
   * The deviation flag (the front-shop AUDIT_PIN_ACTIVE binary — System 7's observable; an injection over the
   * legitimate baseline feeds System 7's nightly tick, which activates this pin). Never the raw sigma (Inv 1 / R2.2).
   */
  deviation_active: boolean;
}

/** One stage of the pipeline overview — qualitative bands + structural flags only (R2.2; Phase 2b). */
export interface LaunderingPipelineStage {
  /** The stage node identity (a uuid string — echoed for the client's pipeline panel; NOT a sim scalar). */
  node: string;
  /**
   * The PIPELINE cleanliness BAND the cash AT this stage carries (DIRTY/PARTIAL/MOSTLY_CLEAN/CLEAN), derived from the
   * node's stage_index via the canonical per-stage progression (pipelineCleanlinessForStage), mapped through System 8's
   * CleanlinessBucket. NEVER the raw [0,1] float (Inv 6 / R2.2). This is the band the player watches RISE per stage.
   */
  cleanliness_band: CleanlinessBucket;
  /** TRUE when this is the chain's TERMINAL/release stage (no outgoing edge — the node that credits the wallet). */
  terminal: boolean;
  /** Whether cash is currently buffered AT this stage — a presence flag only; never the raw cents (R2.2). */
  has_cash: boolean;
}

/** The PLAYER-FACING pipeline OVERVIEW projection — the ordered stages of a chain (qualitative only — R2.2; Phase 2b). */
export interface LaunderingPipelineProjection {
  /**
   * The stages of the chain, ORDERED head→tail (by stage_index). Each carries its own qualitative band + flags. The
   * chain LENGTH is `stages.length` (a structural ordinal derived client-side) — it is NOT surfaced as a raw number
   * field so the whole payload stays strings + booleans (the recursive no-leak scan passes; R2.2).
   */
  stages: LaunderingPipelineStage[];
}

@Injectable()
export class LaunderingProjectionService {
  constructor(
    private readonly repo: LaunderingRepository,
    // System 8 (Dwell-Time Tax) — CONSUMED for the CleanlinessBucket mapping (never reimplemented). Its module
    // exports DwellTimeService; LaunderingModule imports DwellTimeModule for this read-only coupling.
    private readonly dwell: DwellTimeService,
  ) {}

  /**
   * Project a Stage-1 laundering node (by node id) → a fully-qualitative payload (R2.2). Reads the node's raw
   * cleanliness_at_output (System 8's float — the INPUT, mapped to a BAND via System 8's own cleanlinessBucket; the
   * float never leaves this method) + the host front-shop's audit_pin_expires_at (System 7's persisted pin → the
   * deviation flag). Returns null when the node is not the player's (the controller 404s).
   */
  async projectNode(playerId: string, nodeId: string): Promise<LaunderingNodeProjection | null> {
    const row = await this.repo.getNodeProjectionInput(playerId, nodeId);
    if (!row) return null;
    const now = Date.now();
    return {
      node: row.node_id,
      // REUSE System 8's CleanlinessBucket mapping — the raw float is the INPUT, mapped HERE (R2.2 — Inv 6).
      cleanliness_band: this.dwell.cleanlinessBucket(row.cleanliness_at_output),
      // The deviation flag IS System 7's AUDIT_PIN_ACTIVE binary (observed, never recomputed — Inv 1).
      deviation_active: row.audit_pin_expires_at !== null && row.audit_pin_expires_at.getTime() > now,
    };
  }

  /**
   * Project the PIPELINE that contains `nodeId` → the ordered stages, each fully qualitative (Phase 2b; R2.2). For each
   * stage the cleanliness BAND is derived from its stage_index via the canonical per-stage progression
   * (pipelineCleanlinessForStage — Stage1 base + per-stage gain, e.g. 0.40/0.60/0.80/1.00) and mapped through System 8's
   * CleanlinessBucket: the band the player watches RISE stage-by-stage along the chain. NOTE the band is the PIPELINE
   * cleanliness model (stage_index-derived — a STABLE per-stage progression), distinct from the per-node
   * cleanliness_at_output float System 8 recomputes every minute (which the terminal RELEASE gate consumes — projectNode
   * surfaces THAT for the head/terminal node). `terminal` = no outgoing edge; `has_cash` = a presence flag off the raw
   * occupancy (never the cents). Returns null when the node is not the player's (the controller 404s).
   */
  /**
   * LOT PLANQUE C3 — the player's laundering nodes, for RE-DISCOVERY. `inject` hands back a `node_id` exactly once;
   * nothing replayed it, so a screen reopened later could not reach `…/:nodeId` at all (design §2.a, B8 = 0 upstream
   * routes — measured). Returns an EMPTY list for a player with no node (never a 404: an empty list is a value, an
   * absent key is a hole). Band derivation is the SAME call `projectPipeline` uses — one derivation, two surfaces.
   */
  async projectOwnedNodes(playerId: string): Promise<LaunderingNodeListProjection> {
    const nodes = await this.repo.listOwnedNodes(playerId);
    return {
      nodes: nodes.map((n) => ({
        node: n.node_id,
        stage_index: n.stage_index,
        cleanliness_band: this.dwell.cleanlinessBucket(pipelineCleanlinessForStage(n.stage_index)),
        terminal: n.is_terminal,
        has_cash: n.occupancy_cents > 0,
      })),
    };
  }

  async projectPipeline(playerId: string, nodeId: string): Promise<LaunderingPipelineProjection | null> {
    const nodes = await this.repo.getPipelineNodes(playerId, nodeId);
    if (nodes.length === 0) return null; // not the player's node → 404 upstream.
    const stages: LaunderingPipelineStage[] = nodes.map((n) => ({
      node: n.node_id,
      // The stage_index-derived PIPELINE cleanliness, mapped through System 8's CleanlinessBucket (R2.2 — Inv 6; the
      // raw progression float is the INPUT, never surfaced). Rises per stage (e.g. PARTIAL → MOSTLY_CLEAN → CLEAN).
      cleanliness_band: this.dwell.cleanlinessBucket(pipelineCleanlinessForStage(n.stage_index)),
      terminal: n.is_terminal,
      // A presence flag only — whether cash is buffered at this stage (never the raw cents; R2.2).
      has_cash: n.occupancy_cents > 0,
    }));
    return { stages };
  }
}
