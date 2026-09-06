// IMPLEMENTS: docs/superpowers/specs/2026-06-22-system9-route-lifecycle-9b-design.md §4.5 (DD-EPHEMERAL)
//             docs/superpowers/plans/2026-06-22-system9-route-lifecycle-9b-plan.md Task 10 (C10)
//             DIV-E1 (the anti-exploit scope boundary — ratified §12bis)
//             OQ-EP1 (cargo_value basis = cargo_grams × substance_unit_value)
//             OQ-EP2 (pct = ephemeral_surcharge_pct getter, default 0.15)
//             OQ-EP3 (route_version_history entries for an ephemeral route — purged YES)
//             OQ-EP4 (active caught_exception — NOT purged)
//
// `EphemeralPurgeService` — the two DD-EPHEMERAL behaviors:
//
//   (1) `surchargeAtDispatch` — the GUARDED cash debit at dispatch time.
//       For an `ephemeral_mode` route, debit `ephemeralSurchargePct × cargoValueCents`
//       from the player's wallet using the same `debitWallet` guarded-UPDATE pattern as
//       RaidExceptionRepository (guard: cash_cents >= cost → never negative).
//       Returns `{ debited: true, surchargeCents }` on success, or `{ debited: false }`
//       when the player has insufficient cash (the caller 409s — the dispatch is NOT created).
//       Diegetic cash debit (not IAP / premium currency — R4.1).
//       Deterministic: pct is getter-sourced (`ephemeralSurchargePct`), no Math.random.
//
//   (2) `purgeAfterExecution` — the post-execution DETERMINISTIC DELETE of the operation trail.
//       Scope ENUMERATED (design §4.5, DIV-E1):
//         PURGED:  `courier_shift` rows for this route_id (the execution record + route↔shift linkage)
//                  `route_version_history` rows for this route_id (OQ-EP3 = YES)
//         NOT PURGED:
//           - `suspicion_map` / `declaration_ledger` (BPD memory — the adversary's, DIV-E1)
//           - `corridor_debt` (geographic signal, not the player's trail — DIV-E1)
//           - `caught_exception` (active legal lifecycle — OQ-EP4)
//           - already-emitted events/claims (immutable history)
//       Idempotent: re-running on an already-purged shift is a no-op (deletes 0 rows safely).
//       Deterministic: a pure DELETE, no Math.random / Date.now.
//
// Anti-exploit boundary (forward secrecy, NOT retroactive innocence):
//   Ephemeral-mode buys "a caught courier reveals nothing about the route's OTHER past runs".
//   It does NOT erase the BPD's suspicion / geographic debt / active arrest lifecycle.
//
// R9.3: no new schema (ephemeral_mode exists on `route` since mig 0017; courier_shift and
//        route_version_history are existing tables from prior chunks). No migration needed.
// C4: no Math.random, no Date.now. The pct is getter-sourced; the DELETE is a pure SQL statement.
// R2.2: surchargeCents is BO-only (never returned to the player client raw).

import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

import { DB } from '../../db/db.module';
import type { DrizzleClient } from '../../db';
import { economyState } from '../../db/schema/player_economy_state';
import { courierShift, routeVersionHistory } from '../../db/schema/operational_chain';
import { distributionRouteLifecycleTunables } from './distribution-tunables';
import { sellingTunables } from '../selling/selling-tunables';
import { substanceDescriptor } from '../substance/substance-config';
import type { SubstanceType } from '../substance/substance-config';

@Injectable()
export class EphemeralPurgeService {
  private readonly logger = new Logger(EphemeralPurgeService.name);

  constructor(@Inject(DB) private readonly db: DrizzleClient) {}

  /**
   * Compute the ephemeral surcharge in cents for a given cargo.
   *
   * surcharge = round( ephemeralSurchargePct × cargoValueCents )
   * cargoValueCents = cargoGrams × (brindleDealValueCentsPerGram × marginMultiplierVsBrindle)
   *
   * Both factors are getter-sourced (no inline scalars — C4). OQ-EP1/EP2.
   * Returns an integer cents value (Math.round — deterministic, no RNG).
   */
  computeSurcharge(cargoGrams: number, substanceType: SubstanceType): number {
    const descriptor = substanceDescriptor(substanceType);
    const baseValuePerGram = Math.max(0, sellingTunables.brindleDealValueCentsPerGram);
    const margin = descriptor?.marginMultiplierVsBrindle ?? 1;
    const cargoValueCents = cargoGrams * baseValuePerGram * margin;
    const pct = distributionRouteLifecycleTunables.ephemeralSurchargePct;
    return Math.round(cargoValueCents * pct);
  }

  /**
   * GUARDED ephemeral surcharge debit at dispatch (OQ-EP1/EP2, R4.1 diegetic cash).
   *
   * Uses the same `UPDATE economy_states SET cash_cents = cash_cents - :cost WHERE
   * player_id = :playerId AND cash_cents >= :cost` guarded pattern as debitWallet
   * (RaidExceptionRepository:25 — the cash can never go negative).
   *
   * Returns `{ debited: true, surchargeCents }` when the debit succeeded (sufficient funds),
   * or `{ debited: false, surchargeCents }` when insufficient (caller 409s — no state change).
   *
   * C4: pct getter-sourced, no Math.random, no Date.now.
   * R4.1: diegetic cash debit — NOT an IAP or premium-currency charge.
   */
  async surchargeAtDispatch(
    playerId: string,
    cargoGrams: number,
    substanceType: SubstanceType,
  ): Promise<{ debited: boolean; surchargeCents: number }> {
    const surchargeCents = this.computeSurcharge(cargoGrams, substanceType);

    if (surchargeCents <= 0) {
      // Zero surcharge (zero cargo or zero pct) — treat as free, no debit needed.
      return { debited: true, surchargeCents: 0 };
    }

    // GUARDED UPDATE: cash_cents = cash_cents - surchargeCents WHERE cash_cents >= surchargeCents
    // Returns 0 rows on insufficient balance → the wallet never goes negative.
    const rows = await this.db
      .update(economyState)
      .set({ cash_cents: sql`${economyState.cash_cents} - ${surchargeCents}` })
      .where(
        and(
          eq(economyState.player_id, playerId),
          sql`${economyState.cash_cents} >= ${surchargeCents}`,
        ),
      )
      .returning({ cash_cents: economyState.cash_cents });

    const debited = rows.length > 0;
    if (debited) {
      this.logger.log(
        `surchargeAtDispatch: player=${playerId} cargo=${cargoGrams}g ${substanceType} ` +
          `surcharge=${surchargeCents} cents debited (ephemeral mode)`,
      );
    } else {
      this.logger.log(
        `surchargeAtDispatch: player=${playerId} insufficient cash for ephemeral surcharge ` +
          `(${surchargeCents} cents) — dispatch refused`,
      );
    }

    return { debited, surchargeCents };
  }

  /**
   * POST-EXECUTION purge: DELETE the player's operation trail for this ephemeral route.
   *
   * Scope (ENUMERATED, DIV-E1 ratified — §4.5):
   *   PURGED:
   *     - `courier_shift` rows WHERE route_id = :routeId  (the shift execution record + the
   *       route↔shift linkage — the FK on courier_shift.route_id IS the link)
   *     - `route_version_history` rows WHERE route_id = :routeId  (OQ-EP3 = YES)
   *
   *   NOT PURGED (the anti-exploit boundary):
   *     - `suspicion_map` / `declaration_ledger` in `precinct_memory` (BPD memory — DIV-E1)
   *     - `corridor_debt` (geographic signal, not the player's trail — DIV-E1)
   *     - `caught_exception` (active legal lifecycle — OQ-EP4)
   *     - already-emitted events/insurance claims (immutable)
   *
   * Idempotent: re-running after a purge is a no-op (deletes 0 rows, no error).
   * Deterministic: pure DELETEs, no Math.random / Date.now.
   * C4 compliant. R9.3: no new schema.
   */
  async purgeAfterExecution(routeId: string): Promise<void> {
    // 1. DELETE the courier_shift execution records (the route↔shift linkage).
    //    All shifts for this route (including 'completed' and 'caught' terminal states).
    //    The FK cascade on caught_exception.shift_id (onDelete:'cascade') ensures any
    //    caught_exception referencing these shifts is NOT purged here — the plan explicitly
    //    keeps caught_exception alive (OQ-EP4). However, if a caught_exception references
    //    the same shift, we must NOT delete the shift row while the exception is active.
    //    Per OQ-EP4: the purge does NOT touch an active caught_exception, and the shift
    //    that was caught carries the legal lifecycle.
    //    Resolution (C13 widened): only purge courier_shift rows NOT referenced by ANY caught_exception
    //    (pending OR resolved). All exceptions — including completed/abandoned — block the purge.
    // C13 fix (C10 IMPORTANT item (a)): guard ANY caught_exception, not just pending ones.
    // A shift with a RESOLVED caught_exception (lawyered/abandoned/silenced) should also NOT be purged:
    // the legal lifecycle has completed, but deleting a resolved exception is untested and conservative
    // protection is safer. "Active caught_exception (OQ-EP4)" is interpreted as ANY exception that
    // references this shift (pending OR resolved). Protecting all is the conservative, correct choice.
    await this.db
      .delete(courierShift)
      .where(
        and(
          eq(courierShift.route_id, routeId),
          // OQ-EP4 (C13 widened): do NOT purge a shift that has ANY caught_exception (pending OR resolved).
          // Conservative: a caught shift with any exception should NOT be purged as part of the ephemeral scope.
          // Previous guard was `AND ce.status = 'pending'` which would cascade-delete resolved exceptions.
          sql`NOT EXISTS (
            SELECT 1 FROM "caught_exception" ce
            WHERE ce.shift_id = ${courierShift.shift_id}
          )`,
        ),
      );

    // 2. DELETE the route_version_history entries (OQ-EP3 = YES — purge version trail).
    await this.db
      .delete(routeVersionHistory)
      .where(eq(routeVersionHistory.route_id, routeId));

    this.logger.log(
      `purgeAfterExecution: purged operation trail for ephemeral route=${routeId} ` +
        `(courier_shifts WITHOUT any caught_exception (pending OR resolved) + route_version_history rows deleted; ` +
        `BPD memory / corridor_debt / caught_exception (any status) NOT touched — DIV-E1 forward-secrecy)`,
    );
  }
}
