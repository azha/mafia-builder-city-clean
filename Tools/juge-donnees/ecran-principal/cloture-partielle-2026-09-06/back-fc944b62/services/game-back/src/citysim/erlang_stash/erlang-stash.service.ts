// IMPLEMENTS: docs/tech/04_city_simulation/system_9_erlang_stash.md
//             §Invariants canoniques (Inv 1 Erlang-B formula B(C,A) HARD — numerically-stable recursion; Inv 2
//                                     knee of the curve = the whole mechanic; Inv 3 5-sec cash-arrivals tick;
//                                     Inv 4 minute tick Erlang-B recompute; Inv 5 current_fill per-slot percent
//                                     never exposed → StashLoadBucket; Inv 6 raid drain order deterministic;
//                                     Inv 7 over-provisioning past the knee = dead capital)
//             §États Safehouse + §StashLoadBucket enum + §RaidDrainPolicy enum
//             §Update tick chaque minute in-game (Erlang-B recompute Phase A/B/C) + §Tick par police event (raids)
//             -- session:2026-06-03 (Phase 1 Task 10) --
//
// `ErlangStashService` — System 9 (Erlang Stash Capacity). The MINUTE-cadence, input-starved system (the
// dwell-time precedent — closest sibling): every in-game minute it recomputes the per-safehouse Erlang-B
// blocking_probability from the persisted state (slot_count = C, arrival_rate = λ), holds it IN MEMORY per
// safehouse (there is NO persisted blocking column — the schema has no such field; the curve is server-truth
// working state, rebuilt on restart), maps it to the qualitative StashBlockingBand, and emits
// StashHighBlockingAlertEvent when it exceeds stash.blocking_alert_threshold. It registers at MINUTE/1 =
// ERLANG_STASH slot — it runs FIRST in the minute band (the canonical DAG System 9 → System 8 → System 10 → Heat).
//
// ERLANG-B (Inv 1 — HARD, NON-NEGOTIABLE): B(C, A) = (A^C / C!) / Σ_{k=0}^C (A^k / k!). Implemented via the
// NUMERICALLY-STABLE Jagerman recursion (NEVER the factorial/power direct form — it overflows for C > ~12 and
// is the linear-approximation trap Inv 1 forbids):
//     B(0, A) = 1
//     B(j, A) = (A · B(j-1, A)) / (j + A · B(j-1, A))
// The knee (Inv 2) is the whole mechanic: blocking collapses steeply for the first slots then flattens — adding
// slots past the knee is dead capital (Inv 7). The recursion reproduces the knee EXACTLY (it IS the Erlang-B
// curve), so a few-slots-high-λ safehouse blocks markedly MORE than a many-slots-same-λ one (the E2E ordering).
//
// A = λ/μ TRAFFIC INTENSITY (the offered load in erlangs — documented + deterministic): λ = arrival_rate
// (parcels/min in-game, read from the row). μ = NORMALIZED_SERVICE_RATE = 1.0 (spec §Update tick Phase A: "μ =
// service_rate … Valeur typique : 1.0 si on normalise les slots comme unités de service" — the M/M/c unit-rate
// normalization). So A = arrival_rate / 1.0 = arrival_rate. A FIXED function of the row's arrival_rate — no RNG,
// no invented tunable (the E2E determinism assertion). C = slot_count (the per-safehouse Erlang-B parameter).
//
// 5-SEC ARRIVALS → MINUTE RECONCILIATION (the cadence note): the spec describes a "5-second in-game cash-arrivals
// tick" (Inv 3 — Poisson arrivals incrementing current_fill). The scheduler's finest cadence is 2 Hz (one real
// step every 15 in-game-sec), and ERLANG_STASH occupies ONLY the MINUTE slot. So the 5-sec arrivals tick is
// DEFERRED ENTIRELY (P2 — cash inflow comes from operations/deals, a P2 producer; there is no Phase-1 cash
// source to drive Poisson arrivals). The MINUTE tick recomputes blocking_probability from the CURRENT persisted
// state (Inv 4 — "blocking_probability recalculée depuis l'état courant current_fill"); current_fill is the INPUT
// the recompute reads (set at build / by P2 operations), never invented or mutated by the minute tick. When P2
// routes cash inflow, the arrivals fold into the per-row current_fill the build/operations flow writes — the
// minute Erlang-B recompute then reflects it organically without a System-9 change.
//
// IN-MEMORY BLOCKING (per safehouse, keyed by safehouse_id): the recomputed blocking_probability + the derived
// band, held per safehouse (lazily rebuilt each tick). ~a few bytes per safehouse × ≤10 safehouses/player (the
// spec's 640 B / 10-safehouse budget). Server-truth working state (rebuilt on restart — the dwell-time aggregate
// precedent; the PERSISTED truth is the safehouses row state, blocking is DERIVED).
//
// CROSS-SYSTEM BLOCKING ACCESSOR (the convention note — magnitude vs band): System 8 (Dwell-Time, built) reads
// System 9's blocking curve as a per-safehouse-node THROUGHPUT CONSTRAINT (system_8 §Cross-cutting: throughput cap
// = (1 - blocking_probability) × nominal — System 8 DEFERRED this). Per the cross-system accessor convention, an
// internal system→system seam may return a MAGNITUDE when the consumer needs PROPORTIONALITY: System 8's cap is
// (1 - blocking) × nominal — it needs the blocking VALUE, not a band (a band would lose the proportional cap). So
// getBlockingProbability(safehouseId) returns the raw [0,1] MAGNITUDE (the internal seam — documented), while the
// PLAYER-facing projection returns ONLY the StashBlockingBand (the qualitative knee). The accessor is the read
// seam System 8 wires to later (P2 — no Phase-1 throughput producer); the seam is exposed + tested.
//
// DETERMINISM (NO RNG): erlangB(C, A) is a fixed function of (C, A); the band map + bucket map + the alert gate
// are fixed functions of the persisted floats. Two players with identical seeded safehouses + identical advances
// land on identical bands (the E2E determinism assertion). The 5-sec Poisson arrivals (which WOULD be random) are
// deferred, so day-1 there is no RNG anywhere in System 9.

import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { blocks as blocksTable } from '../../db/schema/world_geography';
import { CitySimSchedulerService } from '../scheduler/city_sim_scheduler.service';
import { Cadence, CitySystemId, type CitySimTickContext } from '../scheduler/city_sim_system';
import { CityEventBus, type StashLoadBucket, type StashBlockingBand } from '../events/city-event-bus';
import { erlangStashTunables, NORMALIZED_SERVICE_RATE } from './erlang-stash-tunables';
import {
  ErlangStashRepository,
  type SafehouseState,
  type RaidDrainPolicy,
} from './erlang-stash.repository';

/** The in-memory per-safehouse blocking working state (the recomputed Erlang-B float + derived band). */
interface SafehouseBlockingState {
  /** The recomputed Erlang-B blocking_probability ∈ [0,1] (the MAGNITUDE — System 8's cross-system read). */
  blockingProbability: number;
  /** The qualitative band (the player-facing knee signal — the raw float never escapes). */
  band: StashBlockingBand;
  /** Whether blocking exceeds stash.blocking_alert_threshold (the alert gate). */
  alertActive: boolean;
}

@Injectable()
export class ErlangStashService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ErlangStashService.name);

  /**
   * Per-safehouse in-memory blocking working state, keyed by safehouse_id (lazily rebuilt each minute tick). The
   * recomputed Erlang-B float + band — there is NO persisted blocking column (the schema has none); this is the
   * server-truth derived state (the dwell-time aggregate precedent — rebuilt empty on restart). ~a few bytes ×
   * ≤10 safehouses/player (the spec's 640 B / 10-safehouse budget).
   */
  private readonly blocking = new Map<string, SafehouseBlockingState>();

  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly scheduler: CitySimSchedulerService,
    private readonly repo: ErlangStashRepository,
    private readonly bus: CityEventBus,
  ) {}

  // ───────────────────────────── bootstrap: registration ─────────────────────────────

  onApplicationBootstrap(): void {
    this.registerCadences();
    this.logRamBudget();
  }

  /**
   * Register the single MINUTE cadence slot System 9 occupies (one CitySimSystem — the registry contract).
   * MINUTE/1 (ERLANG_STASH) replaces the no-op placeholder the SCHEDULE seeded; it runs FIRST in the minute band
   * (before System 8 Throughput Trilemma at MINUTE/2) per the canonical DAG (System 9 → System 8 → System 10 →
   * Heat) — System 8 reads System 9's blocking curve as a throughput cap.
   */
  private registerCadences(): void {
    this.scheduler.registerSystem({
      id: CitySystemId.ERLANG_STASH,
      cadence: Cadence.MINUTE,
      order: 1,
      run: (ctx) => this.runMinuteTick(ctx),
    });
  }

  /** F4 RAM budget log (system_9 §RAM budget): ~64 B Safehouse × ≤10 safehouses ≈ 640 B/player (blocking in-memory). */
  private logRamBudget(): void {
    this.logger.log(
      `Erlang Stash per-player RAM budget ≈ 640 B (Safehouse state PERSISTED on safehouses, ~64 B × ≤10 safehouses; ` +
        `blocking_probability DERIVED in-memory per safehouse, a few bytes each). MINUTE/1 tick (Inv 4). Erlang-B ` +
        `HARD via the numerically-stable Jagerman recursion (Inv 1 — never factorial/power). A = λ/μ, μ=1.0 ` +
        `(normalized service rate). The 5-sec cash-arrivals tick (Inv 3) is DEFERRED Phase 1 (cash inflow = P2); ` +
        `the minute tick recomputes blocking from current state. Emits StashHighBlockingAlert (emit-only day-1). ` +
        `Raid drain (Inv 6) deterministic; raids = P2. System 8 reads getBlockingProbability (cross-system seam).`,
    );
  }

  // ───────────────────────────── the registered MINUTE tick ─────────────────────────────

  /**
   * {MINUTE, order 1} — the Erlang-stash per-minute tick (system_9 §Update tick chaque minute Phases A–C). For
   * each of the player's safehouses: derive A = λ/μ (Phase A), recompute blocking_probability = B(C, A) via the
   * stable Erlang-B recursion (Phase B), map it to the qualitative band + gate the alert (Phase C), and emit
   * StashHighBlockingAlertEvent when blocking exceeds the threshold. Holds the recomputed blocking IN MEMORY per
   * safehouse (no persisted blocking column). Deterministic (NO RNG — the 5-sec Poisson arrivals are deferred).
   * A no-op for a player with zero safehouses — was every player's reality organically before LOT PLANQUE gave
   * the table its first application writer; today a fresh player's welcome grant seeds one, so this branch is
   * the genuine edge case (important at MINUTE cadence regardless — it still must be cheap).
   */
  private async runMinuteTick(ctx: CitySimTickContext): Promise<void> {
    const safehouses = await this.repo.listSafehouses(ctx.playerId);
    if (safehouses.length === 0) {
      // No safehouses for this player → drop any stale in-memory blocking. (We only ever hold keys we
      // recomputed; with none to recompute, leave the map untouched per-player — but a player whose
      // safehouses were removed should not retain stale bands. Cheap to no-op: the projection reads fresh per call.)
      return;
    }

    for (const s of safehouses) {
      // ── Phase A — TRAFFIC INTENSITY A = λ/μ (μ = 1.0 normalized service rate; A = arrival_rate erlangs). ──
      const A = this.trafficIntensity(s.arrival_rate);

      // ── Phase B — ERLANG-B recompute B(C, A) via the numerically-stable recursion (Inv 1 — the knee). ──
      const blockingProbability = this.erlangB(s.slot_count, A);

      // ── Phase C — band map + alert gate (Inv 5 — the raw float stays in-memory; only the band escapes). ──
      const band = this.blockingBand(blockingProbability);
      const alertActive = blockingProbability > erlangStashTunables.blockingAlertThreshold;

      this.blocking.set(s.safehouse_id, { blockingProbability, band, alertActive });

      // ── Phase C step 3 — emit StashHighBlockingAlert when blocking exceeds the threshold (emit-only day-1). ──
      if (alertActive) {
        this.bus.emitStashHighBlockingAlert({
          type: 'stash_high_blocking_alert',
          playerId: ctx.playerId,
          districtId: s.district_id,
          buildingId: s.building_id,
          safehouseId: s.safehouse_id,
          blockingBand: band,
          gameMinute: ctx.gameMinute,
        });
      }
    }
  }

  // ───────────────────────────── Erlang-B math (deterministic, INTERNAL) ─────────────────────────────

  /**
   * Traffic intensity A = λ / μ (the offered load in erlangs — §Update tick Phase A). λ = arrival_rate; μ =
   * NORMALIZED_SERVICE_RATE = 1.0 (the M/M/c unit-rate normalization — see the header). Clamped to >= 0 (a
   * negative arrival_rate is impossible — the DB CHECK sh_arrival_rate_chk: arrival_rate >= 0). INTERNAL.
   */
  trafficIntensity(arrivalRate: number): number {
    const mu = NORMALIZED_SERVICE_RATE > 0 ? NORMALIZED_SERVICE_RATE : 1; // defensive (the constant is 1.0).
    const A = arrivalRate / mu;
    return A >= 0 ? A : 0;
  }

  /**
   * Erlang-B B(C, A) (Inv 1 — HARD) via the NUMERICALLY-STABLE Jagerman recursion (never the factorial/power
   * direct form — it overflows for C > ~12 and is the linear-approximation trap Inv 1 forbids):
   *     B(0, A) = 1
   *     B(j, A) = (A · B(j-1, A)) / (j + A · B(j-1, A))
   * Returns the blocking_probability ∈ [0,1]. A pure function (no RNG, no state) — the determinism guarantee. C is
   * coerced to a non-negative integer (slot_count is DB-CHECK > 0, but defensive). A == 0 → B = 0 (no offered
   * traffic → no blocking, for any C >= 1). C == 0 → B = 1 (no slots → everything blocks; degenerate, the schema
   * forbids it via slot_count > 0, but the recursion base handles it).
   */
  erlangB(slotCount: number, A: number): number {
    const C = Math.max(0, Math.floor(slotCount));
    if (!(A > 0)) return C >= 1 ? 0 : 1; // no offered traffic → no blocking (or all-blocked if zero slots).
    let b = 1; // B(0, A) = 1.
    for (let j = 1; j <= C; j += 1) {
      const num = A * b;
      b = num / (j + num);
    }
    // Clamp to [0,1] defensively against float drift (the recursion stays in [0,1] mathematically).
    if (b < 0) return 0;
    return b > 1 ? 1 : b;
  }

  /**
   * Map a raw blocking_probability ∈ [0,1] → its closed StashBlockingBand (Inv 5 — the raw float never escapes;
   * R2.2). The bands make the Erlang-B knee visible qualitatively (Inv 2): LOW = far below the knee (< 0.05);
   * MODERATE = approaching the alert threshold (0.05–blocking_alert_threshold); HIGH = over the alert threshold but
   * not yet collapsed (blocking_alert_threshold–0.5); SATURATED = the curve has collapsed onto near-certain
   * blocking (>= 0.5). The alert (alertActive) fires strictly on blocking > blocking_alert_threshold — so a HIGH or
   * SATURATED band is the alerting region (a MODERATE band sits just under the threshold; documented).
   */
  blockingBand(blockingProbability: number): StashBlockingBand {
    const threshold = erlangStashTunables.blockingAlertThreshold;
    if (blockingProbability >= 0.5) return 'SATURATED';
    if (blockingProbability > threshold) return 'HIGH';
    if (blockingProbability >= 0.05) return 'MODERATE';
    return 'LOW';
  }

  /**
   * Map a safehouse's raw per-slot current_fill[] → its closed StashLoadBucket (Inv 5 — the raw per-slot percent
   * never escapes; R2.2). §enum thresholds on avg_fill over the active slots: EMPTY all 0%; LOW < 25%; NOMINAL
   * 25–75%; HIGH 75–95%; FULL >= 95% OR open_parcels > 0 (saturation — parcels held in the open). open_parcels is
   * DERIVED from current_fill (a slot recorded above 100% = a parcel held in the open — the deferred 5-sec arrivals
   * spill; day-1 current_fill is build-seeded so open_parcels is 0 unless a seed records > 100%). The bucket is
   * computed over the FIRST slot_count slots (the active set — extra/short array entries are tolerated defensively).
   */
  loadBucket(currentFill: number[], slotCount: number): StashLoadBucket {
    const active = currentFill.slice(0, Math.max(0, Math.floor(slotCount)));
    if (active.length === 0) return 'EMPTY';
    const openParcels = active.some((f) => f > 100);
    if (openParcels) return 'FULL'; // parcels held in the open → saturation (forces FULL regardless of avg).
    const avg = active.reduce((acc, f) => acc + (Number.isFinite(f) ? f : 0), 0) / active.length;
    if (avg <= 0) return 'EMPTY';
    if (avg >= 95) return 'FULL';
    if (avg >= 75) return 'HIGH';
    if (avg >= 25) return 'NOMINAL';
    return 'LOW';
  }

  /**
   * The deterministic raid DRAIN ORDER (Inv 6 — top_down / random / bottom_up). Returns the slot indices in the
   * order they are drained when a raid seizes cash (§Tick par police event step 3). TOP_DOWN drains highest index
   * first (protects low slots); BOTTOM_UP drains lowest first; RANDOM uses a DETERMINISTIC pseudo-shuffle keyed by
   * the safehouse id (NO RNG — the determinism guarantee; the "random" policy is unpredictable to the PLAYER, but
   * reproducible server-side from the safehouse identity, so two identical seeds drain identically — the E2E
   * determinism premise). Raids are P2 — this is the deterministic ordering helper applyRaid uses; wiring optional.
   */
  drainOrder(policy: RaidDrainPolicy, slotCount: number, safehouseId: string): number[] {
    const C = Math.max(0, Math.floor(slotCount));
    const idx = Array.from({ length: C }, (_, i) => i);
    if (policy === 'bottom_up') return idx; // 0,1,2,…  (lowest first).
    if (policy === 'top_down') return idx.reverse(); // C-1,…,1,0  (highest first — the default protects low slots).
    // RANDOM — a deterministic FNV-1a-keyed sort (reproducible from the safehouse id; no Math.random — no RNG).
    return idx
      .map((i) => ({ i, k: this.deterministicKey(`${safehouseId}:${i}`) }))
      .sort((a, b) => a.k - b.k)
      .map((e) => e.i);
  }

  /** Deterministic 32-bit FNV-1a hash → a stable per-key sort weight (NO RNG — the determinism guarantee). */
  private deterministicKey(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /**
   * applyRaid — execute the raid drain (Inv 6) on ONE safehouse deterministically + persist the post-drain
   * current_fill (the ONLY write path System 9 has). Drains slots in drainOrder(policy) until `seizureFraction`
   * (0..1 of the safehouse's total fill) is removed, zeroing each fully-drained slot. Raids are P2 (no Phase-1
   * police-event producer), so this is the deterministic mechanic the P2 RaidService calls; wiring is optional
   * Phase 1. Returns the post-drain fill. NO RNG (deterministic drain order + fixed seizure math).
   */
  applyDrainToFill(state: SafehouseState, seizureFraction: number): number[] {
    const fill = [...state.current_fill];
    const order = this.drainOrder(state.raid_drain_policy, state.slot_count, state.safehouse_id);
    const total = fill.reduce((acc, f) => acc + Math.max(0, f), 0);
    let toSeize = Math.max(0, Math.min(1, seizureFraction)) * total;
    for (const slot of order) {
      if (toSeize <= 0) break;
      const have = Math.max(0, fill[slot] ?? 0);
      const take = Math.min(have, toSeize);
      fill[slot] = have - take;
      toSeize -= take;
    }
    return fill;
  }

  // ───────────────────────────── projection-facing + cross-system reads ─────────────────────────────

  /**
   * The safehouses for ONE district (the projection read). Returns the raw safehouse rows (slot_count / fill /
   * arrival_rate); the projection derives the StashLoadBucket / StashBlockingBand / alert flag from them + the
   * in-memory blocking state, never forwarding the raw floats (R2.2). Empty for a district with none of this
   * player's safehouses — a genuinely ongoing case (a given district may simply host no `cash_safehouse`
   * building for this player), not because the table itself is empty (LOT PLANQUE gave it its first
   * application writer).
   */
  async listSafehousesForDistrict(playerId: string, districtId: number): Promise<SafehouseState[]> {
    return this.repo.listSafehousesForDistrict(playerId, districtId);
  }

  /**
   * The in-memory blocking working state for a safehouse (recomputed by the last minute tick). Returns undefined
   * if the safehouse has not been ticked yet (a fresh seed before the first advance) — the projection falls back to
   * recomputing on the fly from the row (so a projection read right after a seed, before a tick, is still correct;
   * but the E2E always advances first). INTERNAL band/float — the projection maps it; never surfaced raw.
   */
  blockingStateFor(safehouseId: string): SafehouseBlockingState | undefined {
    return this.blocking.get(safehouseId);
  }

  /**
   * Recompute the blocking working state for a safehouse ON THE FLY from its row (the projection's fallback when
   * the in-memory state is absent — e.g. a projection read before the first minute tick). A pure function of the
   * row (slot_count, arrival_rate) — identical to what the minute tick would compute (determinism). This keeps the
   * projection correct without forcing a tick, and avoids the projection reading a stale/missing in-memory entry.
   */
  computeBlockingState(state: SafehouseState): SafehouseBlockingState {
    const A = this.trafficIntensity(state.arrival_rate);
    const blockingProbability = this.erlangB(state.slot_count, A);
    return {
      blockingProbability,
      band: this.blockingBand(blockingProbability),
      alertActive: blockingProbability > erlangStashTunables.blockingAlertThreshold,
    };
  }

  /**
   * getBlockingProbability — the CROSS-SYSTEM READ accessor (System 8 Dwell-Time reads this as a throughput cap:
   * cap = (1 - blocking) × nominal, per system_8 §Cross-cutting; System 8 DEFERRED this). Returns the raw [0,1]
   * blocking MAGNITUDE — NOT a band — because System 8 needs PROPORTIONALITY (a band would lose the proportional
   * cap), per the cross-system accessor convention (an internal system→system seam may return a magnitude when the
   * consumer genuinely needs proportionality; the player-facing projection always returns the qualitative band).
   * Returns 0 for a safehouse whose blocking has not been ticked yet. INTERNAL — never surfaced to the player.
   */
  getBlockingProbability(safehouseId: string): number {
    return this.blocking.get(safehouseId)?.blockingProbability ?? 0;
  }

  /**
   * 04g-B C3 — the S8 cross-system predicate seam: every district id with ≥1 safehouse CITY-WIDE (any
   * player) currently in the `FULL` `StashLoadBucket` band (design §3.6 P1 pair `erlang_stash__deal_lek`:
   * "≥ 1 (player, district X) stash en band FULL", S8 :244-253). Reuses `listAllSafehouses` (the
   * player-unscoped read, additive C3) + this service's OWN `loadBucket` (Inv 5 — the same band mapping
   * the player-facing projection uses; the raw per-slot fill never escapes this method). Deterministic:
   * `current_fill` only mutates via a raid drain (P2, unwired day-1) — a pure function of persisted state,
   * no RNG. Sorted ascending, deduplicated (a district can host multiple FULL safehouses; it appears once).
   */
  async listDistrictsWithFullBand(): Promise<number[]> {
    const rows = await this.repo.listAllSafehouses();
    const full = new Set<number>();
    for (const r of rows) {
      if (this.loadBucket(r.current_fill, r.slot_count) === 'FULL') full.add(r.district_id);
    }
    return Array.from(full).sort((a, b) => a - b);
  }

  /** Whether a district id is in the canonical 1..districtCount set (used by the controller for a clean 422). */
  isValidDistrict(districtId: number): boolean {
    return Number.isInteger(districtId) && districtId >= 1 && districtId <= erlangStashTunables.districtCount;
  }

  /** Whether a district id exists in the seeded geography (a real district — the controller's existence guard). */
  async districtExists(districtId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: blocksTable.district_id })
      .from(blocksTable)
      .where(eq(blocksTable.district_id, districtId))
      .limit(1);
    return rows.length > 0;
  }
}
