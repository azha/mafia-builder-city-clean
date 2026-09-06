// IMPLEMENTS: docs/tech/07_lieutenants_and_behavior/behavior_script_dsl.md §Implications par couche §NestJS — game-back
//             (the per-archetype binding RESOLVES the signal snapshot from real game state + MAPS the resolved action
//             token to the archetype's real side-effect — "Module dsl/executor : … write uniquement via `side_effects`
//             déclarés"; the executor stays archetype-agnostic, the binding is the ONLY archetype-specific code) +
//             docs/tech/07_lieutenants_and_behavior/lieutenant_definition.md §Archetype projection (BOOKKEEPER is the
//             "transverse — TBD" archetype; this DELEGATED binding grounds it on the 04a `Cash custodian` cash-custody
//             role — see lieutenant-archetype.ts BOOKKEEPER_ROLE_ID for the role_id grounding) +
//             docs/superpowers/specs/2026-06-08-phase-07-lieutenant-archetypes-design.md §Architecture (the BOOKKEEPER
//             binding — `wallet_cents` signal + `EXECUTE_DEFAULT` → MoneyHoldingService.deposit the assigned holding) +
//             docs/superpowers/specs/2026-06-07-phase-05-money-holding-design.md §4-T3 (MoneyHoldingService.deposit — the
//             reused wallet→held transfer: atomic guarded debit, OVER_CAPACITY / INSUFFICIENT_FUNDS → 409) +
//             docs/tech/09_data_model/schema_operational_chain.md §7.13 (money_holding — money_holding_tier / held_cents,
//             both the bigint held_cents the greedy math reads) + schema_player_economy_state.md §2 (economy_states.
//             cash_cents — the wallet, the bigint the greedy math reads) +
//             projects/mafia_city_game/gdd/14_tunable_constants.md §Lieutenants + DSL (lieutenant.bookkeeper_wallet_
//             reserve_cents — the greedy reserve floor, NEW Phase-7 T0)
//             -- session:2026-06-08 (Phase 7 vector #7 lieutenant archetypes — Task 3, BOOKKEEPER binding) --
//
// `BookkeeperBindingService` — the BOOKKEEPER-archetype adapter the delegation tick + recruit dispatch through. The THIRD
// `ArchetypeBinding` (after COOK + SECURITY, whose SHAPE this MIRRORS): the SAME three methods — `buildSnapshot` (resolve
// THIS archetype's signal from real state), `applyExecuteDefault` (map `EXECUTE_DEFAULT` to its real action), and
// `validateAssignment` (the recruit-time assignment gate) — and the DSL engine is unchanged.
//
// The BOOKKEEPER default is AUTO-DEPOSIT clean cash: when the player's wallet has surplus cash, the delegated BOOKKEEPER
// lieutenant runs the SAME player-driven deposit (MoneyHoldingService.deposit — atomic guarded wallet→held transfer) to
// sweep it into the money_holding it manages. The lieutenant simply calls the action the player would have called by hand
// — it reimplements NOTHING (no debit, no capacity guard, no last_yield_tick stamp here).
//
//   - `buildSnapshot` resolves the one BOOKKEEPER signal: `state.wallet_cents` = the player's economy_states.cash_cents
//     (a RAW internal engine read — NOT a player projection, so the bare number is correct here; the rule
//     `WHEN STATE(wallet_cents,>=,<threshold>) THEN EXECUTE_DEFAULT` compares it). OMITTED when the wallet (the player's
//     economy_states row) cannot be resolved, per the absence contract.
//   - `applyExecuteDefault` consumes MoneyHoldingService.deposit(playerId, assigned_building_id, amount) — the BOOKKEEPER
//     archetype's default action — with a GREEDY amount (see the policy below).
//
// THE GREEDY DEPOSIT POLICY (documented):
//   amount = min( wallet_cents − reserve ,  capacityCentsForTier(tier) − held_cents )
// i.e. deposit as much as FITS in the holding while KEEPING `lieutenant.bookkeeper_wallet_reserve_cents` (default 0 — the
// whole wallet is swept) in the wallet. If `amount <= 0` (nothing above the reserve, or the holding is already full), the
// apply is a benign no-op (no deposit attempted). The overflow above the holding's capacity STAYS in the wallet (the
// greedy amount is capped at the remaining capacity, never forced over it). The amount is a PURE function of (wallet,
// reserve, capacity, held) — DETERMINISTIC, no RNG. The cents are BIGINT (economy_states.cash_cents /
// money_holding.held_cents are both `bigint` columns), so the min/subtraction is BigInt math with NO precision loss; the
// final positive amount is narrowed to a Number for MoneyHoldingService.deposit's number param (a deposit amount is well
// within Number.MAX_SAFE_INTEGER — the holding capacity caps it far below 2^53).
//
// REUSE (never reinvent): `MoneyHoldingService.deposit` (the wallet→held action — owns the positive-amount validation +
// the atomic guarded debit + the OVER_CAPACITY/INSUFFICIENT_FUNDS guards + the last_yield_tick anchor; consumed exactly as
// the player's POST /deposit-cash does), `capacityCentsForTier` (the per-tier holding capacity — the SAME function the
// deposit's OVER_CAPACITY guard uses; never a re-derived cap), `LieutenantRepository.getWalletCents` +
// `getMoneyHoldingState` (the wallet + (tier, held) reads — the repo boundary, NOT a duplicated query),
// `LieutenantRepository.getOwnedOperationalBuilding` (the SAME owned-operational gate COOK/SECURITY use). DETERMINISTIC.

import { Injectable, Logger } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import type { SignalSnapshot } from '../../dsl/signals';
import { MoneyHoldingService } from '../money_holding/money-holding.service';
import { capacityCentsForTier } from '../money_holding/money-holding-tunables';
import { LieutenantRepository } from './lieutenant.repository';
import { lieutenantTunables } from './lieutenant-tunables';
import type { ArchetypeBinding, DelegationLieutenant } from './archetype-binding';
import type { LieutenantArchetype } from './lieutenant-archetype';

/** The operational_type a BOOKKEEPER lieutenant assigns to — only a `money_holding` hosts the cash a BOOKKEEPER deposits. */
const BOOKKEEPER_HOST_OPERATIONAL_TYPE = 'money_holding';

/**
 * C10/DIV-1/OQ-1: the BOOKKEEPER archetype gains a SECOND capability when assigned to a front:
 *   - money_holding → cash-deposit (existing path, BYTE-IDENTICAL, unchanged).
 *   - front_shop   → Benford noise-injection (NEW capability; the deposit path is NOT called).
 *
 * The noise-injection is driven INLINE by `LeadingDigitAuditService.recordReceipt` (not by the
 * delegation tick). When a BOOKKEEPER is assigned to a `front_shop`, the delegation tick's
 * `applyExecuteDefault` is a NO-OP (no deposit attempted — the front holds no cash for deposit).
 *
 * The delegation tick still calls `applyExecuteDefault` for the BOOKKEEPER lieutenant's tick
 * slot; when the assigned building is a `front_shop` (not `money_holding`), the method returns
 * 'NOOP' without attempting a deposit (no OVER_CAPACITY / INSUFFICIENT_FUNDS for a front).
 */
const BOOKKEEPER_FRONT_OPERATIONAL_TYPE = 'front_shop';

@Injectable()
export class BookkeeperBindingService implements ArchetypeBinding {
  private readonly logger = new Logger(BookkeeperBindingService.name);

  /** The archetype this binding serves — its registry key (BindingRegistry indexes by it). REUSE LieutenantArchetype. */
  readonly archetype: LieutenantArchetype = 'BOOKKEEPER';

  constructor(
    private readonly moneyHolding: MoneyHoldingService,
    private readonly repo: LieutenantRepository,
  ) {}

  /**
   * The RECRUIT-time assignment gate for a BOOKKEEPER lieutenant: the assigned building must be the player's OWN
   * OPERATIONAL building (not owned / not operational → 404) of either the `money_holding` type (cash-deposit
   * capability) OR the `front_shop` type (Benford noise-injection capability, C10/DIV-1/OQ-1); any OTHER type → 409
   * (a lab/stash holds no cash and is not a front). The SAME owned-operational read COOK/SECURITY
   * use (getOwnedOperationalBuilding); only the type restriction differs (money_holding|front_shop here, like COOK's lab restriction).
   * The BOOKKEEPER archetype ignores `targetBuildingId` (it has no dispatch destination — that is the LOGISTICS
   * archetype's column). NO mutation — a pure validation read.
   */
  async validateAssignment(
    playerId: string,
    assignedBuildingId: string,
    _targetBuildingId: string | null,
  ): Promise<void> {
    const owned = await this.repo.getOwnedOperationalBuilding(playerId, assignedBuildingId);
    if (!owned) {
      // Not owned / not converted / not operational → 404 (cross-player invisible too).
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `building ${assignedBuildingId} is not a player-owned operational building for this player.`,
      });
    }
    // C10/DIV-1/OQ-1: BOOKKEEPER now accepts TWO building types:
    //   - money_holding → cash-deposit capability (existing path, UNCHANGED).
    //   - front_shop    → Benford noise-injection capability (NEW, C10).
    // Any OTHER type → 409 (same as before for types other than money_holding or front_shop).
    if (
      owned.operational_type !== BOOKKEEPER_HOST_OPERATIONAL_TYPE &&
      owned.operational_type !== BOOKKEEPER_FRONT_OPERATIONAL_TYPE
    ) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message:
          `building ${assignedBuildingId} has operational_type='${owned.operational_type}' — ` +
          'a BOOKKEEPER lieutenant assigns to a money_holding (cash-deposit) or front_shop (Benford noise-injection, C10).',
      });
    }
  }

  /**
   * BUILD the per-tick signal snapshot for a delegated BOOKKEEPER lieutenant from REAL game state (07 §NestJS — the binding
   * fills the snapshot the executor reads). Resolves the one BOOKKEEPER signal:
   *   - `state.wallet_cents` = the player's economy_states.cash_cents (a RAW internal engine read — NOT a player
   *     projection, so the bare number is correct here; the rule `WHEN STATE(wallet_cents,>=,<threshold>) THEN
   *     EXECUTE_DEFAULT` compares it). Read via the repository boundary (LieutenantRepository.getWalletCents). The bigint
   *     wallet is narrowed to a Number for the snapshot (the executor compares `number | boolean`; a wallet balance is well
   *     within Number.MAX_SAFE_INTEGER).
   * Per the ABSENCE CONTRACT (signals.ts): a signal the binding cannot resolve is OMITTED (not set to `undefined`) so the
   * executor treats it as a non-matching trigger. If the player has no economy_states row, the signal is OMITTED → the
   * executor takes no script-driven action this tick. NO mutation — a pure read.
   */
  async buildSnapshot(
    playerId: string,
    _lieutenant: DelegationLieutenant,
  ): Promise<SignalSnapshot> {
    const state: Record<string, number | boolean> = {};
    const events: Record<string, number | boolean> = {};

    const walletCents = await this.repo.getWalletCents(playerId);
    if (walletCents !== null) {
      // RAW wallet balance (internal engine read — NOT a player projection; the bare number is correct here). Narrowed to
      // a Number for the executor's `number | boolean` comparison (a wallet balance is well within 2^53).
      state.wallet_cents = Number(walletCents);
    }
    // (a missing economy_states row → `wallet_cents` OMITTED, per the absence contract — never set to undefined.)

    return { state, events };
  }

  /**
   * APPLY the BOOKKEEPER archetype's `EXECUTE_DEFAULT` (07 §NestJS — the binding maps the resolved token to the archetype's
   * real side-effect; the executor never acts itself). The BOOKKEEPER default is AUTO-DEPOSIT clean cash into the assigned
   * money_holding with a GREEDY amount:
   *   amount = min( wallet_cents − reserve ,  capacityCentsForTier(tier) − held_cents )
   * (deposit what FITS while keeping `lieutenant.bookkeeper_wallet_reserve_cents` in the wallet — default 0, the whole
   * wallet swept). `amount > 0` → call MoneyHoldingService.deposit (the SAME guarded action the player's POST /deposit-cash
   * runs — it owns the positive-amount validation + the atomic guarded debit + the OVER_CAPACITY/INSUFFICIENT_FUNDS guards
   * + the last_yield_tick anchor). `amount <= 0` (nothing above the reserve, or the holding is full) → a benign no-op
   * (nothing to deposit). NOTHING is reimplemented here; the cap is computed only to size the deposit (the server re-guards
   * it). The cents are BIGINT (parity with the held_cents/cash_cents columns) so the min/subtraction is BigInt math; the
   * positive amount is narrowed to a Number for deposit's number param (a deposit amount is well within 2^53). DETERMINISTIC.
   *
   * BENIGN 409 NO-OP: a `RESOURCE_STATE_CONFLICT` from deposit (OVER_CAPACITY or INSUFFICIENT_FUNDS — a RACE where the
   * wallet/held changed between this binding's read and the deposit's guarded debit, e.g. a concurrent player withdraw or
   * another deposit) is EXPECTED-rare in normal delegation, so it is CAUGHT here and logged as a benign no-op (the tick
   * proceeds normally — the lieutenant simply retries next tick on the fresh state). Any OTHER error PROPAGATES to the
   * tick's per-lieutenant try/catch (T6) — a genuine fault must not be swallowed. If the assigned building is null, or has
   * no money_holding row, or the wallet is absent, the apply is a benign no-op (nothing to deposit — defensive; a delegated
   * BOOKKEEPER lieutenant always has a money_holding building).
   */
  async applyExecuteDefault(
    playerId: string,
    lieutenant: DelegationLieutenant,
    _gameMinute: number, // unused — BOOKKEEPER's requestDeposit path carries no created_at clock (W6.1 C7, archetype-binding.ts)
  ): Promise<'TAKEN' | 'NOOP'> {
    const buildingId = lieutenant.assigned_building_id;
    if (buildingId === null) {
      return 'NOOP'; // no delegated building → nothing to deposit (defensive — a delegated BOOKKEEPER lieutenant always has one).
    }

    // C10/DIV-1/OQ-1: if the BOOKKEEPER is assigned to a front_shop, the delegation tick
    // is a NO-OP for deposit (the Benford noise-injection is driven INLINE by recordReceipt,
    // not by the tick). No deposit attempted for a front (it holds no clean cash for deposit).
    // The money_holding deposit path below is BYTE-IDENTICAL (only this branch ADDED above it).
    const owned = await this.repo.getOwnedOperationalBuilding(playerId, buildingId);
    if (owned?.operational_type === BOOKKEEPER_FRONT_OPERATIONAL_TYPE) {
      this.logger.debug(
        `applyExecuteDefault: BOOKKEEPER assigned to front_shop=${buildingId} → NO-OP ` +
          `(noise-injection is inline at recordReceipt, not driven by the tick — C10/OQ-1)`,
      );
      return 'NOOP';
    }

    const walletCents = await this.repo.getWalletCents(playerId);
    if (walletCents === null) {
      return 'NOOP'; // the player's wallet vanished → nothing to deposit (benign no-op).
    }

    const holding = await this.repo.getMoneyHoldingState(buildingId);
    if (holding === null) {
      return 'NOOP'; // the building / its money_holding row vanished → nothing to deposit (benign no-op).
    }

    // GREEDY amount (BigInt — parity with the bigint cents columns; no precision loss): deposit what fits in the holding
    // while keeping the wallet reserve. Both terms can be ≤ 0 (no surplus above the reserve, or the holding is full); the
    // min then is ≤ 0 → the no-op branch below.
    const reserveCents = BigInt(lieutenantTunables.bookkeeperWalletReserveCents);
    const walletSurplus = walletCents - reserveCents; // what the wallet can spare above the reserve floor.
    const capacityLeft = capacityCentsForTier(holding.money_holding_tier) - holding.held_cents; // what the holding can still take.
    const amount = walletSurplus < capacityLeft ? walletSurplus : capacityLeft; // min(surplus, capacityLeft).

    if (amount <= 0n) {
      // Nothing above the reserve to sweep, or the holding is already at capacity → a benign no-op (no deposit attempted).
      return 'NOOP';
    }

    try {
      // deposit() takes a `number` (it validates a positive integer then converts to BigInt internally). The greedy amount
      // is capped at the holding capacity, so it is far below Number.MAX_SAFE_INTEGER — the Number() narrowing is exact.
      await this.moneyHolding.deposit(playerId, buildingId, Number(amount));
      return 'TAKEN';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESOURCE_STATE_CONFLICT') {
        // Benign: a RACE — the wallet/held changed between this binding's read and the deposit's guarded debit (a
        // concurrent player deposit/withdraw), so the deposit hit OVER_CAPACITY or INSUFFICIENT_FUNDS. The delegated
        // lieutenant simply takes no action this tick (the tx rolled back, nothing moved) — NOT an error to propagate.
        this.logger.debug(
          `applyExecuteDefault: benign no-op for lieutenant=${lieutenant.lieutenant_id} ` +
            `building=${buildingId} amount=${amount} (${err.message})`,
        );
        return 'NOOP';
      }
      throw err; // any other fault propagates to the tick's per-lieutenant try/catch (T6).
    }
  }
}
