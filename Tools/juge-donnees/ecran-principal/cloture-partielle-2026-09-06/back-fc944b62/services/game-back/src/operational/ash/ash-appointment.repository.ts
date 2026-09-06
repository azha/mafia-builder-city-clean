// IMPLEMENTS: docs/tech/09_data_model/schema_operational_chain.md §7.10.6 (ash_appointment — id / player_id /
//             glass_venue_building_id / status ash_appointment_status / booked_at_tick / expires_at_tick / grams_sold /
//             payout_cents — T0; R9.3 READ + mutate, never redefined; the (status, expires_at_tick) index drives the
//             set-based expiry sweep) +
//             docs/tech/09_data_model/schema_world_geography.md §2 (districts.profile — the Glass-district attribute the
//             venue validation joins through buildings.block_id → blocks.district_id → districts.profile = 'glass') +
//             docs/tech/09_data_model/schema_city_sim_clock.md §2 (city_sim_clock.game_minute — the booking's
//             booked_at_tick, READ-only; the clock row is owned by the scheduler) +
//             docs/superpowers/specs/2026-06-06-phase-02c-ash-luxury-design.md §4-T7 (appointment booking + expiry)
//             -- session:2026-06-06 (Phase 2c vector #2c — Ash — Task 7) --
//
// `AshAppointmentRepository` — the persisted access layer for the Phase-2c Ash APPOINTMENT slice (book + expiry tick).
// Copies the persisted-system repository template (PrecursorsRepository / SpecializedLabRepository): a thin
// `*.repository.ts` owning the raw Drizzle reads/writes with EXPLICIT column lists + set-based UPDATEs (NO RNG, NO
// per-row await loop).
//
// R9.3: 09 is the source of truth for `ash_appointment` (the NEW appointment table — T0, migration 0022) and the GLOBAL
// geography tables `buildings` / `blocks` / `districts` (Phase-1, migrations 0015/0016). This file IMPORTS the existing
// schema and NEVER re-declares it. The runtime role app_rw has SELECT+INSERT+UPDATE on ash_appointment (0022 §grants).
// NO schema change (T0 landed the table + the index + the grant).
//
// ── THE GLASS-VENUE VALIDATION (isGlassVenueOwnedBy) — the booking gate. A venue is a valid Glass appointment venue iff
//    it is (a) the requesting player's OWNED building (buildings.player_id = player AND buildings.ownership = 'player')
//    AND (b) located in the Glass DISTRICT — resolved through the GLOBAL geography graph buildings.block_id →
//    blocks.district_id → districts.profile = 'glass' (districts.profile is the clean district attribute; the Glass
//    profile is the 'glass' enum member of district_profile, the canonical Glass-tier districts glass-1/2/3). The two
//    conditions split the two error cases: not-owned (no owned-building row) → 404; owned but NOT a Glass venue → 422.
//    The validation returns a small {owned, glass} flag pair so the service maps each miss to its canonical code.
//
// ── THE BOOKING (insertScheduled) — a single INSERT of a SCHEDULED ash_appointment (status default 'scheduled',
//    booked_at_tick = the player's current tick, expires_at_tick = booked + window). grams_sold / payout_cents stay NULL
//    (renseignés à honor only — T8). Returns the new appointment id.
//
// ── THE EXPIRY SWEEP (expireScheduledOlderThan) — the APPOINTMENT_EXPIRE tick (MINUTE/17). ONE set-based UPDATE:
//    status = 'expired' WHERE player_id = ? AND status = 'scheduled' AND expires_at_tick < currentTick. Player-scoped,
//    GUARDED by the status + window predicates, NO RNG. Organically a no-op (no SCHEDULED row past its window — the
//    common case). The (status, expires_at_tick) index (T0) makes the sweep an index range scan, not a full table scan.
//
// ── THE PROJECTION READ (getProjection) — the FORMAL T9 projection read: the appointment status enum PLUS the honor
//    figures (grams_sold + payout_cents) — the figures are INTERNAL (BO-only), used ONLY by the service to DERIVE the
//    realized qualitative payout_band; they are NEVER forwarded raw (R2.2). The service maps status → the band
//    (SCHEDULED/HONORED/EXPIRED) and the figures → the payout_band (PENDING/NONE/MODEST/FAIR/STRONG/PREMIUM), dropping
//    every raw scalar (the booked/expires ticks are never even read here).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { ashAppointment, batchPurity, productStorage } from '../../db/schema/operational_chain';
import { building } from '../../db/schema/city_state';
import { blocks, districts } from '../../db/schema/world_geography';
import { citySimClock } from '../../db/schema/city_sim_clock';
import { economyState } from '../../db/schema/player_economy_state';
import type { SubstanceType } from '../substance/substance-config';

/** The Glass-venue validation result — the two flags split the two booking error cases (404 not-owned / 422 not-glass). */
export interface GlassVenueValidation {
  /** The building is the requesting player's OWNED building (player_id = player AND ownership = 'player'). */
  owned: boolean;
  /** The building's block resolves to a Glass-profile district (buildings.block_id → blocks → districts.profile='glass'). */
  glass: boolean;
}

/**
 * A raw appointment PROJECTION read (T9 — the qualitative status + payout_band surface). Carries the status enum PLUS
 * the honor-sale figures (grams_sold + payout_cents) — both INTERNAL (BO-only), used ONLY to DERIVE the realized
 * qualitative payout_band in the service (the realized purity premium of the sale). They are NEVER forwarded raw to the
 * client (R2.2 — the service maps them to a closed band and drops the raw numbers). NULL for a non-honored appointment
 * (the figures are renseignés à honor only — a SCHEDULED/EXPIRED appointment has no realized sale → no payout_band).
 */
export interface AppointmentProjectionRow {
  id: string;
  /** The raw ash_appointment_status enum value (scheduled | honored | expired) — mapped to the status band. */
  status: 'scheduled' | 'honored' | 'expired';
  /** The grams the honor sold (INTERNAL — null until honored). Used ONLY to recover the realized multiplier → band. */
  grams_sold: number | null;
  /** The cents the honor credited (INTERNAL BO-only — null until honored). Used ONLY to recover the band; NEVER raw. */
  payout_cents: number | null;
}

/** The honor-relevant snapshot of an appointment (the venue it reserves + its current status) — the pre-tx 404/409 gate. */
export interface HonorTargetRow {
  id: string;
  /** The Glass venue the appointment reserves — where the Ash to sell must physically be (the honor stock check). */
  glass_venue_building_id: string;
  /** The raw status — SCHEDULED is the only honorable state (EXPIRED/HONORED → 409 RESOURCE_STATE_CONFLICT). */
  status: 'scheduled' | 'honored' | 'expired';
}

/** The result of the atomic honor sale (the grams sold + the cents credited — INTERNAL BO-only; the projection is band-only). */
export interface HonorResult {
  grams_sold: number;
  payout_cents: number;
}

@Injectable()
export class AshAppointmentRepository {
  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  // ───────────────────────────── current tick ─────────────────────────────

  /**
   * The player's CURRENT in-game tick (city_sim_clock.game_minute) — the booking's booked_at_tick. Returns 0 when the
   * player has no clock row yet (the deterministic advance harness lazy-creates it on first advance; a booking placed
   * before any tick is anchored at tick 0, and expires at appointment_window_ticks). NOT a write — the clock row is
   * owned by the scheduler (the SAME read PrecursorsRepository.getCurrentTick uses).
   */
  async getCurrentTick(playerId: string): Promise<number> {
    const rows = await this.db
      .select({ game_minute: citySimClock.game_minute })
      .from(citySimClock)
      .where(eq(citySimClock.player_id, playerId))
      .limit(1);
    return rows[0]?.game_minute ?? 0;
  }

  // ───────────────────────────── Glass-venue validation (the booking gate) ─────────────────────────────

  /**
   * Validate that `buildingId` is a valid Glass appointment venue for `playerId`, returning the two split flags:
   *   - owned: the building is the player's OWNED building (buildings.building_id = ? AND player_id = ? AND ownership =
   *     'player'). A building belonging to another player / not the player's is NOT owned (→ the caller 404s — a
   *     cross-player building is invisible, never a leak).
   *   - glass: the building's block resolves to a Glass-profile district (buildings.block_id → blocks.district_id →
   *     districts.profile = 'glass'). Only meaningful when owned (a non-owned building is also reported not-glass, but the
   *     caller checks owned FIRST so the 404 wins).
   * ONE query — a LEFT-style resolution: select the owned building's district profile (NULL if no owned row), so a
   * single round-trip yields BOTH flags. districts.profile = 'glass' is the clean district attribute (the Glass-tier
   * districts glass-1/2/3 carry profile 'glass'); the join is buildings → blocks (block_id) → districts (district_id).
   */
  async validateGlassVenue(playerId: string, buildingId: string): Promise<GlassVenueValidation> {
    const rows = await this.db
      .select({ profile: districts.profile })
      .from(building)
      .innerJoin(blocks, eq(blocks.id, building.block_id))
      .innerJoin(districts, eq(districts.id, blocks.district_id))
      .where(
        and(
          eq(building.building_id, buildingId),
          eq(building.player_id, playerId),
          eq(building.ownership, 'player'),
        ),
      )
      .limit(1);
    const owned = rows.length > 0;
    const glass = owned && rows[0].profile === 'glass';
    return { owned, glass };
  }

  // ───────────────────────────── booking (the SCHEDULED insert) ─────────────────────────────

  /**
   * INSERT a SCHEDULED ash_appointment for the player at the Glass venue. status defaults 'scheduled' (the column
   * default); booked_at_tick = the player's current tick; expires_at_tick = booked + window. grams_sold / payout_cents
   * stay NULL (renseignés à honor only — T8). Returns the new appointment id. All binds parameterized. NO RNG.
   */
  async insertScheduled(params: {
    playerId: string;
    glassVenueBuildingId: string;
    bookedAtTick: number;
    expiresAtTick: number;
  }): Promise<string> {
    const [row] = await this.db
      .insert(ashAppointment)
      .values({
        player_id: params.playerId,
        glass_venue_building_id: params.glassVenueBuildingId,
        // status defaults to 'scheduled' (the column default) — not set explicitly.
        booked_at_tick: params.bookedAtTick,
        expires_at_tick: params.expiresAtTick,
      })
      .returning({ id: ashAppointment.id });
    return row.id;
  }

  // ───────────────────────────── honor (the Ash sale — T8) ─────────────────────────────

  /**
   * Read the honor-relevant snapshot of an appointment (its reserved Glass venue + its current status), player-scoped.
   * Returns null when no such appointment exists for THIS player (the caller maps that to a 404 — a cross-player /
   * non-existent appointment is invisible). The status drives the 409 gate (only SCHEDULED is honorable); the venue
   * drives the Ash-stock check. The actual honor mutation re-guards the status INSIDE the tx (a `status='scheduled'`
   * predicate in the flip), so this read is the 404-vs-409 disambiguation, NOT the concurrency guard.
   */
  async getHonorTarget(playerId: string, appointmentId: string): Promise<HonorTargetRow | null> {
    const rows = await this.db
      .select({
        id: ashAppointment.id,
        glass_venue_building_id: ashAppointment.glass_venue_building_id,
        status: ashAppointment.status,
      })
      .from(ashAppointment)
      .where(and(eq(ashAppointment.id, appointmentId), eq(ashAppointment.player_id, playerId)))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Resolve, for the Ash to be honored at `venueBuildingId`, BOTH (a) the Ash grams physically present at that venue
   * (the SUM of the venue's Ash product_storage — the grams the honor sells; 0 → the caller rejects 409 NO_STOCK) AND
   * (b) the player's batch purity_score for Ash (the multiplier input — the band of the batch the player cooked).
   *
   * THE PURITY-AT-VENUE MECHANISM (the key T8 integration). Purity is a property of the COOKED BATCH: it is stamped at
   * cook completion onto a batch_purity row keyed to the produced (lab) product_storage row (T6). Distribution moves
   * grams from the lab's product_storage to the venue's product_storage row (a DIFFERENT row) but carries NO purity
   * (the courier_shift has no purity column — carrying it through transit would need a schema change, which R9.3 forbids
   * outside T0; and the weighted-average mixing model is explicitly DEFERRED). So the venue's Ash storage row has no
   * batch_purity of its own. Honor therefore TRACES the band back to the player's batch_purity: it reads the player's
   * most-recently-stamped Ash batch_purity (batch_purity ⋈ product_storage on storage_id, scoped to the player's Ash
   * rows, ordered by batch_purity.updated_at DESC, storage_id DESC — the storage_id secondary makes the pick
   * deterministic if two batches share a timestamp). In the M1/capstone single-batch flow the player cooks ONE Ash batch
   * (one batch_purity row) and distributes it to the venue, so "the most-recent Ash batch_purity" IS that batch — the
   * correct band. With multiple batches the most-recently-cooked one wins (a deterministic, documented policy; per-batch
   * provenance tracking through distribution is DEFERRED with the mixing model). When the player has NO Ash batch_purity
   * at all (e.g. Ash seeded directly into storage with no recorded cook), purity_score is null → the caller defaults the
   * band to the floor (CUT, multiplier 1.0 — the base luxury margin, no purity premium; honest, never a fabricated band).
   *
   * Returns { ash_grams, purity_score } (purity_score null when no batch_purity row). NOT a write. The band derivation
   * (purity_score → CUT/STANDARD/PURE/CRYSTALLINE) + the multiplier live in AshPurityService (the service maps it).
   */
  async getVenueAshStockAndPurity(
    playerId: string,
    venueBuildingId: string,
  ): Promise<{ ash_grams: number; purity_score: number | null }> {
    const ashType: SubstanceType = 'ash';
    const stockRows = await this.db
      .select({ ash_grams: sql<number>`coalesce(sum(${productStorage.quantity_grams}), 0)::int` })
      .from(productStorage)
      .where(
        and(
          eq(productStorage.player_id, playerId),
          eq(productStorage.building_id, venueBuildingId),
          eq(productStorage.substance_type, ashType),
        ),
      );
    const ashGrams = Number(stockRows[0]?.ash_grams ?? 0);

    // The band the honor multiplier reads — the player's most-recently-stamped Ash batch_purity (see the doc above).
    const purityRows = await this.db
      .select({ purity_score: batchPurity.purity_score })
      .from(batchPurity)
      .innerJoin(productStorage, eq(productStorage.storage_id, batchPurity.storage_id))
      .where(and(eq(batchPurity.player_id, playerId), eq(productStorage.substance_type, ashType)))
      .orderBy(sql`${batchPurity.updated_at} desc, ${batchPurity.storage_id} desc`)
      .limit(1);
    const purityScore = purityRows.length > 0 ? Number(purityRows[0].purity_score) : null;

    return { ash_grams: ashGrams, purity_score: purityScore };
  }

  /**
   * The ATOMIC honor sale, in ONE DB transaction (the persisted-system template). Given the grams to sell (already
   * resolved as the venue Ash stock) + the payout cents (already computed by the service = grams × base × margin ×
   * purity-multiplier):
   *   (a) GUARDED STATUS FLIP: `UPDATE ash_appointment SET status='honored', grams_sold=?, payout_cents=? WHERE id=? AND
   *       player_id=? AND status='scheduled'`. The `status='scheduled'` predicate IS the concurrency / double-honor
   *       guard: exactly one honor can win — a racing/replayed second honor matches 0 rows → the whole tx rolls back and
   *       the method returns null (the caller rejects 409 already-honored). NO state change on a loss.
   *   (b) GUARDED VENUE DECREMENT: `UPDATE product_storage SET quantity_grams = quantity_grams - grams WHERE (player,
   *       venue, 'ash') AND quantity_grams >= grams`. If the stock changed between the service read and here (0 rows) →
   *       throw → roll the whole tx back (the appointment is NOT honored without the Ash leaving — atomic).
   *   (c) CREDIT THE WALLET: `UPDATE economy_states SET cash_cents = cash_cents + payout WHERE player_id=?` (the SAME
   *       economy_states.cash_cents the upgrade-tier / purchase debits mutate — the player's wallet; the honor is the
   *       Ash income path, mirroring how DEALER_SELL credits dealer.float_cents for the other substances). A missing
   *       wallet row (0 rows) → throw → roll back (an honor must land its cash).
   * All three run in ONE tx so the sale is all-or-nothing: the appointment never flips HONORED without the Ash leaving
   * AND the wallet rising (and vice-versa). Returns { grams_sold, payout_cents } on success, or null when the guarded
   * status flip matched 0 rows (already honored / expired / not scheduled). DETERMINISTIC, all binds parameterized, NO RNG.
   */
  async executeHonor(params: {
    playerId: string;
    appointmentId: string;
    venueBuildingId: string;
    gramsSold: number;
    payoutCents: number;
  }): Promise<HonorResult | null> {
    const { playerId, appointmentId, venueBuildingId, gramsSold, payoutCents } = params;
    const ashType: SubstanceType = 'ash';
    return this.db.transaction(async (tx) => {
      // (a) GUARDED STATUS FLIP — the double-honor / concurrency guard. Only a SCHEDULED appointment flips; a racing or
      // replayed honor matches 0 rows → return null (the caller 409s already-honored) and the tx rolls back (no change).
      const flipped = await tx
        .update(ashAppointment)
        .set({ status: 'honored', grams_sold: gramsSold, payout_cents: payoutCents })
        .where(
          and(
            eq(ashAppointment.id, appointmentId),
            eq(ashAppointment.player_id, playerId),
            eq(ashAppointment.status, 'scheduled'),
          ),
        )
        .returning({ id: ashAppointment.id });
      if (flipped.length === 0) {
        // Lost the race / already honored / no longer scheduled → refuse (the tx rolls back the no-op).
        return null;
      }

      // (b) GUARDED VENUE DECREMENT — sell the Ash off the venue stock (never go negative). A stock change since the
      // service read → 0 rows → throw → the whole honor (incl. the flip above) rolls back (the sale is atomic).
      const debited = await tx
        .update(productStorage)
        .set({
          quantity_grams: sql`${productStorage.quantity_grams} - ${gramsSold}`,
          updated_at: sql`now()`,
        })
        .where(
          and(
            eq(productStorage.player_id, playerId),
            eq(productStorage.building_id, venueBuildingId),
            eq(productStorage.substance_type, ashType),
            sql`${productStorage.quantity_grams} >= ${gramsSold}`,
          ),
        )
        .returning({ storage_id: productStorage.storage_id });
      if (debited.length === 0) {
        throw new Error('honor: the venue Ash stock changed between read and write — rolled back (the sale is atomic).');
      }

      // (c) CREDIT THE WALLET — the player's economy_states.cash_cents (the SAME wallet the debits mutate). The honor is
      // the Ash income path; a missing wallet row (0 rows) rolls the whole sale back (an honor must land its cash).
      const credited = await tx
        .update(economyState)
        .set({ cash_cents: sql`${economyState.cash_cents} + ${payoutCents}` })
        .where(eq(economyState.player_id, playerId))
        .returning({ cash_cents: economyState.cash_cents });
      if (credited.length === 0) {
        throw new Error('honor: the player has no economy_states wallet row to credit — rolled back.');
      }

      return { grams_sold: gramsSold, payout_cents: payoutCents };
    });
  }

  // ───────────────────────────── expiry sweep (the APPOINTMENT_EXPIRE tick) ─────────────────────────────

  /**
   * The APPOINTMENT_EXPIRE tick (MINUTE/17) for one player — ONE set-based UPDATE flipping every SCHEDULED booking gone
   * past its window to EXPIRED: status = 'expired' WHERE player_id = ? AND status = 'scheduled' AND expires_at_tick <
   * currentTick. NEVER a per-row loop, NO RNG, GUARDED by the status + window predicates (a HONORED/EXPIRED booking is
   * never touched; a SCHEDULED booking still inside its window — expires_at_tick >= currentTick — is preserved). Returns
   * the count of rows expired (for the tick log; 0 = clean no-op — the common case: no SCHEDULED booking, or none past
   * its window). The (status, expires_at_tick) index (T0) serves the predicate as a range scan.
   */
  async expireScheduledOlderThan(playerId: string, currentTick: number): Promise<number> {
    const expired = await this.db
      .update(ashAppointment)
      .set({ status: 'expired' })
      .where(
        and(
          eq(ashAppointment.player_id, playerId),
          eq(ashAppointment.status, 'scheduled'),
          sql`${ashAppointment.expires_at_tick} < ${currentTick}`,
        ),
      )
      .returning({ id: ashAppointment.id });
    return expired.length;
  }

  // ───────────────────────────── projection read (the formal qualitative status + payout_band surface) ─────────────────────────────

  /**
   * Read ONE of the player's appointments for the FORMAL T9 projection (the status band + the qualitative payout_band):
   * the raw status enum PLUS the honor-sale figures (grams_sold + payout_cents). Player-scoped (an appointment belonging
   * to another player is invisible → null, never a cross-player leak). Returns null when no such appointment exists for
   * this player. The grams_sold / payout_cents are INTERNAL (BO-only — null until honored); the service uses them ONLY to
   * recover the realized qualitative payout_band (the purity premium of the sale) and NEVER forwards the raw numbers
   * (R2.2). This is the T9 superset of the original minimal T7 status-only read.
   */
  async getProjection(playerId: string, appointmentId: string): Promise<AppointmentProjectionRow | null> {
    const rows = await this.db
      .select({
        id: ashAppointment.id,
        status: ashAppointment.status,
        grams_sold: ashAppointment.grams_sold,
        payout_cents: ashAppointment.payout_cents,
      })
      .from(ashAppointment)
      .where(and(eq(ashAppointment.id, appointmentId), eq(ashAppointment.player_id, playerId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      grams_sold: row.grams_sold ?? null,
      payout_cents: row.payout_cents === null || row.payout_cents === undefined ? null : Number(row.payout_cents),
    };
  }
}
