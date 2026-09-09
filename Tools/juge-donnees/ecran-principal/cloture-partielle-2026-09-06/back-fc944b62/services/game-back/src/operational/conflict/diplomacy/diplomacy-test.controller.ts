// IMPLEMENTS: docs/superpowers/plans/2026-06-24-04b-C-diplomacy-infowar-plan.md Task 1 (C1)
//             Pattern: services/game-back/src/operational/conflict/rival/rival-test.controller.ts
//             Pattern: services/game-back/src/operational/conflict/combat/combat-test.controller.ts
//             — Diplomacy & Information Warfare C C1 — 2026-06-26 —
//
// `DiplomacyTestController` — TEST-ONLY probe routes for C1 persistence verification.
//
// GATING: mounted ONLY when NODE_ENV !== 'production' (registered conditionally in DiplomacyModule
// via testControllersEnabled() — same pattern as RivalTestController / CombatTestController).
// In production this controller is simply not registered → 404.
// The E2E compose stack runs NODE_ENV=development so routes are available.
//
// C1 Routes:
//   POST /v1/_test/diplomacy/reset?playerId=<uuid>
//     — UPSERT all 4 diplomacy_pair_state rows for the player to baseline (onConflictDoUpdate).
//       Also ensures all 4 credibility_state rows exist at 0 (onConflictDoUpdate).
//       Returns { reset: true }.
//       Uses A's ensure route pattern: if player row missing, 400.
//       onConflictDoUpdate: RESETS the values (NOT DoNothing — the sticky-accumulator lesson).
//
//   POST /v1/_test/diplomacy/reset-credibility?playerId=<uuid>&rivalKey=<key>
//     — UPSERT a single credibility_state row for (playerId, rivalKey) to credibility=0.
//       onConflictDoUpdate: RESETS to 0 (NOT DoNothing).
//       Returns { reset: true }.
//
//   GET /v1/_test/diplomacy/read-pair-state?playerId=<uuid>&rivalKey=<key>
//     — read diplomacy_pair_state row for (player_id, rival_key).
//       Returns { pairState: <DiplomacyPairStateRow | null> }.
//       400 if rivalKey is not a valid rival key.
//
//   GET /v1/_test/diplomacy/read-credibility?playerId=<uuid>&rivalKey=<key>
//     — read credibility_state row for (player_id, rival_key).
//       Returns { credibilityState: <CredibilityStateRow | null> }.
//       400 if rivalKey is not a valid rival key.
//
//   POST /v1/_test/diplomacy/insert-ledger-entry
//     — body: { playerId, entryType, targetRivalKey, gameMinute }
//       Inserts a public_ledger_entry. Returns { entryId: string }.
//       400 if entryType is not a valid public_ledger_entry_type.
//       400 if targetRivalKey is not a valid rival key.
//
//   GET /v1/_test/diplomacy/read-ledger-entry?entryId=<uuid>
//     — read public_ledger_entry by PK.
//       Returns { ledgerEntry: <PublicLedgerEntryRow | null> }.
//
// Anti-fabrication: no Math.random(). No Date.now(). Pure deterministic CRUD.
// R2.2 / P6: SERVER-ONLY routes. Not player-facing. Gated by testControllersEnabled().

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Query,
} from '@nestjs/common';

import type { DrizzleClient } from '../../../db';
import { DB } from '../../../db/db.module';
import { CURRENT_API_MAJOR } from '../../../protocol/versioning';
import { ApiError } from '../../../protocol/api-error';
import { DiplomacyRepository } from './diplomacy.repository';
import { diplomacyTunables, clampDiplomacyToRange } from './diplomacy.tunables';
import { infoWarTunables, clampInfowarToRange } from '../infowar/infowar.tunables';
import type { PublicLedgerEntryType, BurnType, CredibilityScoreBucket } from './diplomacy.types';
import type { RivalKey } from '../rival/rival-ai.types';
// C5 DD-CREDIBILITY: CredibilityAccumulatorService _test drivers.
import { CredibilityAccumulatorService } from './credibility-accumulator.service';
// C6: Burn Notice + Vulnerability Display + Potlatch Bind _test drivers.
import { BurnNoticeService } from './burn-notice.service';
import { VulnerabilityDisplayService } from './vulnerability-display.service';
import { PotlatchBindService } from './potlatch-bind.service';
import type { GiftType, InterpretationBadge } from './diplomacy.types';
// C7: Proof of Leverage + Shared Exposure Lock _test drivers.
import { ProofOfLeverageService } from './proof-of-leverage.service';
import { SharedExposureLockService } from './shared-exposure-lock.service';
import type { LeverageType } from './diplomacy.types';
// C8: Revelation Trap + Sealed-Envelope Commitment + Dispersal Suppression Pact _test drivers.
import { RevelationTrapService } from './revelation-trap.service';
import { SealedEnvelopeCommitmentService } from './sealed-envelope-commitment.service';
import { DispersalSuppressionPactService } from './dispersal-suppression-pact.service';
// C10: DiplomacyProjectionService — the DD-P5 diplomacy client-view driver.
import { DiplomacyProjectionService } from './diplomacy-projection.service';
import type { DiplomacyClientView } from './diplomacy.types';

// ─── Valid value sets (for enum domain validation) ─────────────────────────────────────────────

const VALID_RIVAL_KEYS: ReadonlySet<string> = new Set<RivalKey>([
  'coil',
  'tarcum',
  'iron_throat',
  'saltline',
]);

const VALID_ENTRY_TYPES: ReadonlySet<string> = new Set<PublicLedgerEntryType>([
  'potlatch_gift',
  'sealed_commitment',
  'proof_broadcast',
]);

// C5: valid burn types (for enum domain validation of record-backed-commitment route).
const VALID_BURN_TYPES: ReadonlySet<string> = new Set<BurnType>([
  'route_burn',
  'asset_burn',
  'intermediary_burn',
]);

// ─── All 4 rival keys for the full-reset sweep ─────────────────────────────────────────────────

const ALL_RIVAL_KEYS: RivalKey[] = ['coil', 'tarcum', 'iron_throat', 'saltline'];

// ─── Request body types ────────────────────────────────────────────────────────────────────────

interface InsertLedgerEntryBody {
  playerId?: string;
  entryType?: string;
  targetRivalKey?: string;
  gameMinute?: number | string;
}

// ─── Controller ───────────────────────────────────────────────────────────────────────────────

@Controller({ version: String(CURRENT_API_MAJOR) })
export class DiplomacyTestController {
  constructor(
    @Inject(DB) private readonly db: DrizzleClient,
    private readonly diplomacyRepo: DiplomacyRepository,
    // C5 DD-CREDIBILITY: _test drivers for record/read operations.
    private readonly credibilityAccumulator: CredibilityAccumulatorService,
    // C6: Burn Notice + Vulnerability Display + Potlatch Bind _test drivers.
    private readonly burnNoticeService: BurnNoticeService,
    private readonly vulnDisplayService: VulnerabilityDisplayService,
    private readonly potlatchBindService: PotlatchBindService,
    // C7: Proof of Leverage + Shared Exposure Lock _test drivers.
    private readonly proofOfLeverageService: ProofOfLeverageService,
    private readonly sharedExposureLockService: SharedExposureLockService,
    // C8: Revelation Trap + Sealed-Envelope Commitment + Dispersal Suppression Pact _test drivers.
    private readonly revelationTrapService: RevelationTrapService,
    private readonly sealedEnvelopeService: SealedEnvelopeCommitmentService,
    private readonly dispersalPactService: DispersalSuppressionPactService,
    // C10: DiplomacyProjectionService — DD-P5 diplomacy client-view driver.
    private readonly diplomacyProjection: DiplomacyProjectionService,
  ) {}

  /**
   * POST /v1/_test/diplomacy/reset?playerId=<uuid>
   *
   * UPSERT all 4 diplomacy_pair_state rows + all 4 credibility_state rows for the player
   * to baseline (onConflictDoUpdate — RESETS). Idempotent.
   * Returns { reset: true }.
   *
   * Pattern: sticky-accumulator isolation (the C-cas lesson). onConflictDoUpdate
   * is mandatory here — onConflictDoNothing would silently leave stale values.
   */
  @Post('_test/diplomacy/reset')
  @HttpCode(200)
  async resetDiplomacy(
    @Query('playerId') playerId: string,
  ): Promise<{ reset: true }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    for (const rk of ALL_RIVAL_KEYS) {
      await this.diplomacyRepo.upsertPairState(playerId, rk);
      await this.diplomacyRepo.upsertCredibility(playerId, rk);
    }
    return { reset: true };
  }

  /**
   * POST /v1/_test/diplomacy/reset-credibility?playerId=<uuid>&rivalKey=<key>
   *
   * UPSERT a single credibility_state row to credibility=0 (onConflictDoUpdate — RESETS).
   * Returns { reset: true }.
   */
  @Post('_test/diplomacy/reset-credibility')
  @HttpCode(200)
  async resetCredibility(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ reset: true }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(
        `Invalid rivalKey: ${rivalKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.diplomacyRepo.upsertCredibility(playerId, rivalKey as RivalKey);
    return { reset: true };
  }

  /**
   * GET /v1/_test/diplomacy/read-pair-state?playerId=<uuid>&rivalKey=<key>
   *
   * Read diplomacy_pair_state for (player_id, rival_key).
   * Returns { pairState: <row | null> }.
   * 400 if rivalKey is not a valid enum value.
   */
  @Get('_test/diplomacy/read-pair-state')
  async readPairState(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ pairState: unknown }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(
        `Invalid rivalKey: ${rivalKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const row = await this.diplomacyRepo.readPairState(playerId, rivalKey as RivalKey);
    return { pairState: row };
  }

  /**
   * GET /v1/_test/diplomacy/read-credibility?playerId=<uuid>&rivalKey=<key>
   *
   * Read credibility_state for (player_id, rival_key).
   * Returns { credibilityState: <row | null> }.
   * 400 if rivalKey is not a valid enum value.
   */
  @Get('_test/diplomacy/read-credibility')
  async readCredibility(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ credibilityState: unknown }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(
        `Invalid rivalKey: ${rivalKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const row = await this.diplomacyRepo.readCredibility(playerId, rivalKey as RivalKey);
    return { credibilityState: row };
  }

  /**
   * POST /v1/_test/diplomacy/insert-ledger-entry
   *
   * body: { playerId, entryType, targetRivalKey, gameMinute }
   * Inserts a public_ledger_entry. Returns { entryId: string }.
   * 400 if entryType is invalid (DB enum domain guard — the falsifiable assertion).
   * 400 if targetRivalKey is invalid.
   */
  @Post('_test/diplomacy/insert-ledger-entry')
  @HttpCode(200)
  async insertLedgerEntry(
    @Body() body: InsertLedgerEntryBody,
  ): Promise<{ entryId: string }> {
    const { playerId, entryType, targetRivalKey, gameMinute } = body;
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!entryType || !VALID_ENTRY_TYPES.has(entryType)) {
      throw new HttpException(
        `Invalid entryType: ${entryType}. Must be one of: ${[...VALID_ENTRY_TYPES].join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!targetRivalKey || !VALID_RIVAL_KEYS.has(targetRivalKey)) {
      throw new HttpException(
        `Invalid targetRivalKey: ${targetRivalKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const gameMinuteBigInt = BigInt(gameMinute ?? 0);
    const entryId = await this.diplomacyRepo.insertLedgerEntry(
      playerId,
      entryType as PublicLedgerEntryType,
      targetRivalKey as RivalKey,
      gameMinuteBigInt,
    );
    return { entryId };
  }

  /**
   * GET /v1/_test/diplomacy/read-ledger-entry?entryId=<uuid>
   *
   * Read public_ledger_entry by PK. Returns { ledgerEntry: <row | null> }.
   * gameMinute in the row is a bigint → serialized as string in JSON.
   */
  @Get('_test/diplomacy/read-ledger-entry')
  async readLedgerEntry(
    @Query('entryId') entryId: string,
  ): Promise<{ ledgerEntry: unknown }> {
    if (!entryId) {
      throw new HttpException('entryId is required', HttpStatus.BAD_REQUEST);
    }
    const row = await this.diplomacyRepo.readLedgerEntry(entryId);
    // bigint → string serialization for the spec assertion
    if (row) {
      return {
        ledgerEntry: {
          ...row,
          gameMinute: String(row.gameMinute),
        },
      };
    }
    return { ledgerEntry: null };
  }

  // ── C2: Tunables probe routes ──────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/diplomacy/read-tunables
   *
   * Returns all DiplomacyTunables + InfoWarTunables getter values keyed by camelCase getter name.
   * Used by the C2 E2E spec to assert frozen defaults (REAL getter output — not echoed literals).
   * Anti-fabrication: each value is read via TunablesStore (sourced from registry).
   * C4: no Math.random(), no Date.now().
   */
  @Get('_test/diplomacy/read-tunables')
  readTunables(): Record<string, unknown> {
    const d = diplomacyTunables;
    const iw = infoWarTunables;
    return {
      // ── §4.1 Burn Notice ────────────────────────────────────────────────────────────────────
      burnTrustDecayPerFailedBurnBucket: d.burnTrustDecayPerFailedBurnBucket,
      burnThreatAssessmentWeightOfCommittedBurnBucket: d.burnThreatAssessmentWeightOfCommittedBurnBucket,
      burnRivalRetreatThresholdBaseBucket: d.burnRivalRetreatThresholdBaseBucket,
      // ── §4.2 Vulnerability Display ──────────────────────────────────────────────────────────
      vulnCredibilityInterpretationThresholdBucket: d.vulnCredibilityInterpretationThresholdBucket,
      vulnCredibilityAccrualPerBackedCommitmentBucket: d.vulnCredibilityAccrualPerBackedCommitmentBucket,
      vulnProbeProbabilityBelowThresholdBucket: d.vulnProbeProbabilityBelowThresholdBucket,
      // ── §4.3 Potlatch Bind ──────────────────────────────────────────────────────────────────
      potlatchReciprocityDeadlineTicks: d.potlatchReciprocityDeadlineTicks,
      potlatchStandingPenaltyFullRefusalBucket: d.potlatchStandingPenaltyFullRefusalBucket,
      potlatchStandingPenaltyPartialReciprocityBucket: d.potlatchStandingPenaltyPartialReciprocityBucket,
      potlatchTensionDropOnFullReciprocityBucket: d.potlatchTensionDropOnFullReciprocityBucket,
      // ── §4.4 Proof of Leverage ──────────────────────────────────────────────────────────────
      proofSkepticismThresholdCoilSupplyBucket: d.proofSkepticismThresholdCoilSupplyBucket,
      proofSkepticismThresholdTarcumPersonnelBucket: d.proofSkepticismThresholdTarcumPersonnelBucket,
      proofSkepticismThresholdIronThroatFinancialBucket: d.proofSkepticismThresholdIronThroatFinancialBucket,
      proofDeterrenceDurationTicks: d.proofDeterrenceDurationTicks,
      proofSkepticismHardeningPerFailedBluffBucket: d.proofSkepticismHardeningPerFailedBluffBucket,
      // ── §4.5 Shared Exposure Lock ───────────────────────────────────────────────────────────
      sharedExposureThresholdBucket: d.sharedExposureThresholdBucket,
      sharedExposureAutoTruceBreakCostBucket: d.sharedExposureAutoTruceBreakCostBucket,
      sharedExposureMutualExposureDecayPerTick: d.sharedExposureMutualExposureDecayPerTick,
      // ── §4.6 Revelation Trap ────────────────────────────────────────────────────────────────
      revelationOfferOptionsCount: d.revelationOfferOptionsCount,
      revelationInferenceConfidencePerOptionSeparationBucket: d.revelationInferenceConfidencePerOptionSeparationBucket,
      revelationTrapDetectionProbabilityIronThroatBucket: d.revelationTrapDetectionProbabilityIronThroatBucket,
      // ── §4.7 Sealed-Envelope Commitment ────────────────────────────────────────────────────
      sealedEnvelopeRevealDeadlineDefaultTicks: d.sealedEnvelopeRevealDeadlineDefaultTicks,
      sealedEnvelopeTargetHashSetSize: d.sealedEnvelopeTargetHashSetSize,
      sealedEnvelopeFailedRevealCredibilityDamageBucket: d.sealedEnvelopeFailedRevealCredibilityDamageBucket,
      // ── §4.8 Dispersal Suppression Pact ────────────────────────────────────────────────────
      dispersalSuppressedDistrictsMaxPerPact: d.dispersalSuppressedDistrictsMaxPerPact,
      dispersalJointResponseEffectivenessBucket: d.dispersalJointResponseEffectivenessBucket,
      dispersalPactDurationTicks: d.dispersalPactDurationTicks,
      // ── §12 Pacifist ───────────────────────────────────────────────────────────────────────
      pacifistE2eTestPhaseLateThresholdBucket: d.pacifistE2eTestPhaseLateThresholdBucket,
      pacifistE2eTestMaxRealTimeDays: d.pacifistE2eTestMaxRealTimeDays,
      pacifistViolentActionWarningModalEnabled: d.pacifistViolentActionWarningModalEnabled,
      // ── NEW [PROV-Y26Q2] OQ-C2 seed prefixes (diplomacy) ───────────────────────────────────
      vulnDisplayInterpretationSeedPrefix: d.vulnDisplayInterpretationSeedPrefix,
      proofBluffProbeSeedPrefix: d.proofBluffProbeSeedPrefix,
      revelationTrapDetectionSeedPrefix: d.revelationTrapDetectionSeedPrefix,
      // ── NEW [PROV-Y26Q2] OQ-C4 CredibilityScoreBucket cuts ─────────────────────────────────
      credibilityBucketCutVeryLowMax: d.credibilityBucketCutVeryLowMax,
      credibilityBucketCutLowMax: d.credibilityBucketCutLowMax,
      credibilityBucketCutStandardMax: d.credibilityBucketCutStandardMax,
      credibilityBucketCutHighMax: d.credibilityBucketCutHighMax,
      // ── §8.1 Dead Reckoning ─────────────────────────────────────────────────────────────────
      deadReckoningMonitoringRatePerAssignedLieutenantPerTick: iw.deadReckoningMonitoringRatePerAssignedLieutenantPerTick,
      deadReckoningCoilDeceptionCorruptionMagnitudeBucket: iw.deadReckoningCoilDeceptionCorruptionMagnitudeBucket,
      deadReckoningBeliefStateDecayRatePerTick: iw.deadReckoningBeliefStateDecayRatePerTick,
      // ── §8.2 Dual-Use Signal ───────────────────────────────────────────────────────────────
      dualUseFamiliarityInterpretationWeightBucket: iw.dualUseFamiliarityInterpretationWeightBucket,
      dualUseInterpretationLagTicks: iw.dualUseInterpretationLagTicks,
      dualUseAttackBiasDecayPerCleanTick: iw.dualUseAttackBiasDecayPerCleanTick,
      // ── §8.3 Observation-Disturbance Cost ─────────────────────────────────────────────────
      observationDetectionProbabilityPerTickBucket: iw.observationDetectionProbabilityPerTickBucket,
      observationDataCorruptionOnDetectionBucket: iw.observationDataCorruptionOnDetectionBucket,
      observationPulsedDetectionReductionVsSustainedBucket: iw.observationPulsedDetectionReductionVsSustainedBucket,
      // ── §8.4 Purge Trap ───────────────────────────────────────────────────────────────────
      purgeSuspicionIncreasePerSignalBucket: iw.purgeSuspicionIncreasePerSignalBucket,
      purgeThresholdBucket: iw.purgeThresholdBucket,
      purgeCapacityDrainPerTickBucket: iw.purgeCapacityDrainPerTickBucket,
      purgeBluffDetectionProbabilityPerTickBucket: iw.purgeBluffDetectionProbabilityPerTickBucket,
      // ── NEW [PROV-Y26Q2] OQ-C2 seed prefixes (infowar) ────────────────────────────────────
      observationDetectionSeedPrefix: iw.observationDetectionSeedPrefix,
      purgeBluffDiscoverySeedPrefix: iw.purgeBluffDiscoverySeedPrefix,
    };
  }

  /**
   * POST /v1/_test/diplomacy/probe-clamp
   *
   * Body: { key: string, value: number }
   * Returns: { clamped: number }
   *
   * Applies DIPLOMACY_TUNABLE_CAPS or INFOWAR_TUNABLE_CAPS clampToRange(key, value) and returns
   * the result. Routes by key prefix: 'diplomacy.*' / 'pacifist.*' → DIPLOMACY_CAPS;
   * 'info_warfare.*' → INFOWAR_CAPS.
   *
   * FALSIFIABLE: posting { key: 'diplomacy.potlatch_reciprocity_deadline_ticks', value: 9999 }
   * returns { clamped: 16 } because the range cap is 16 (not 9999).
   * C4: no Math.random(), no Date.now().
   */
  @Post('_test/diplomacy/probe-clamp')
  @HttpCode(200)
  probeClamp(@Body() body: { key?: string; value?: number }): { clamped: number } {
    const key = body?.key;
    const value = body?.value;
    if (typeof key !== 'string' || key.length === 0) {
      throw new HttpException('key is required', HttpStatus.BAD_REQUEST);
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new HttpException('value must be a finite number', HttpStatus.BAD_REQUEST);
    }
    const clamped = key.startsWith('info_warfare.')
      ? clampInfowarToRange(key, value)
      : clampDiplomacyToRange(key, value);
    return { clamped };
  }

  // ── C5 DD-CREDIBILITY: CredibilityAccumulatorService _test drivers ────────────────────────────

  /**
   * POST /v1/_test/diplomacy/record-backed-commitment?playerId=<uuid>&rivalKey=<key>&burnType=<type>
   *
   * Calls CredibilityAccumulatorService.recordBackedCommitment (RAISES credibility).
   * Returns { credibilityBucket: CredibilityScoreBucket }.
   *
   * C5 _test driver. Falsifiable: after calling this, getCredibilityScore returns a higher band.
   * Anti-fabrication: NO Math.random(). Deterministic float op (accrual getter-sourced).
   */
  @Post('_test/diplomacy/record-backed-commitment')
  @HttpCode(200)
  async recordBackedCommitment(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('burnType') burnType: string,
  ): Promise<{ credibilityBucket: CredibilityScoreBucket }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    if (!VALID_BURN_TYPES.has(burnType)) {
      throw new HttpException(
        `Invalid burnType: ${burnType}. Must be one of: ${[...VALID_BURN_TYPES].join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const bucket = await this.credibilityAccumulator.recordBackedCommitment(
      playerId,
      rivalKey as RivalKey,
      burnType as BurnType,
    );
    return { credibilityBucket: bucket };
  }

  /**
   * POST /v1/_test/diplomacy/record-failed-reveal?playerId=<uuid>&rivalKey=<key>
   *
   * Calls CredibilityAccumulatorService.recordFailedReveal (LOWERS credibility by -0.25 getter-sourced).
   * Returns { credibilityBucket: CredibilityScoreBucket }.
   *
   * C5 _test driver. Falsifiable: after a raise, calling this lowers the band.
   * The -0.25 comes from `diplomacy.sealed_envelope_failed_reveal_credibility_damage_bucket` (getter).
   */
  @Post('_test/diplomacy/record-failed-reveal')
  @HttpCode(200)
  async recordFailedReveal(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ credibilityBucket: CredibilityScoreBucket }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const bucket = await this.credibilityAccumulator.recordFailedReveal(
      playerId,
      rivalKey as RivalKey,
    );
    return { credibilityBucket: bucket };
  }

  /**
   * POST /v1/_test/diplomacy/record-refused-gift?playerId=<uuid>&rivalKey=<key>
   *
   * Calls CredibilityAccumulatorService.recordRefusedGift (standing penalty getter-sourced).
   * Returns { credibilityBucket: CredibilityScoreBucket }.
   *
   * C5 _test driver. Falsifiable: after a raise, calling this lowers or maintains the band.
   */
  @Post('_test/diplomacy/record-refused-gift')
  @HttpCode(200)
  async recordRefusedGift(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ credibilityBucket: CredibilityScoreBucket }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const bucket = await this.credibilityAccumulator.recordRefusedGift(
      playerId,
      rivalKey as RivalKey,
    );
    return { credibilityBucket: bucket };
  }

  /**
   * GET /v1/_test/diplomacy/get-credibility-score?playerId=<uuid>&rivalKey=<key>
   *
   * Calls CredibilityAccumulatorService.getCredibilityScore (reads credibility_state → band).
   * Returns { credibilityBucket: CredibilityScoreBucket }.
   *
   * C5 _test driver. Falsifiable: the band reflects the SAME accumulator written by
   * recordBackedCommitment / recordFailedReveal (DD-CREDIBILITY single SSOT).
   */
  @Get('_test/diplomacy/get-credibility-score')
  async getCredibilityScore(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ credibilityBucket: CredibilityScoreBucket }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const bucket = await this.credibilityAccumulator.getCredibilityScore(
      playerId,
      rivalKey as RivalKey,
    );
    return { credibilityBucket: bucket };
  }

  // ── C6: Burn Notice + Vulnerability Display + Potlatch Bind _test drivers ─────────────────────

  /**
   * POST /v1/_test/diplomacy/commit-burn?playerId=<uuid>&rivalKey=<key>&burnType=<type>&targetId=<str>&gameMinute=<n>
   *
   * Calls BurnNoticeService.commitBurn — appends to commitment_ledger + RAISES credibility.
   * Returns { commitmentId: string, credibilityBucket: CredibilityScoreBucket }.
   *
   * C6 _test driver. Falsifiable: after calling, getCommitmentLedger returns a new entry
   * and getCredibilityScore returns a higher band.
   * C4: commitmentId is deterministic (makeRng, no Math.random()).
   */
  @Post('_test/diplomacy/commit-burn')
  @HttpCode(200)
  async commitBurn(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('burnType') burnType: string,
    @Query('targetId') targetId: string,
    @Query('gameMinute') gameMinuteStr: string,
  ): Promise<{ commitmentId: string; credibilityBucket: CredibilityScoreBucket }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    if (!VALID_BURN_TYPES.has(burnType)) {
      throw new HttpException(
        `Invalid burnType: ${burnType}. Must be one of: ${[...VALID_BURN_TYPES].join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!targetId) {
      throw new HttpException('targetId is required', HttpStatus.BAD_REQUEST);
    }
    const gameMinute = parseInt(gameMinuteStr ?? '0', 10);
    return this.burnNoticeService.commitBurn(
      playerId,
      rivalKey as RivalKey,
      burnType as BurnType,
      targetId,
      gameMinute,
    );
  }

  /**
   * GET /v1/_test/diplomacy/get-commitment-ledger?playerId=<uuid>&rivalKey=<key>
   *
   * Calls BurnNoticeService.getCommitmentLedger — reads the commitment_ledger jsonb array.
   * Returns { commitmentLedger: unknown[] }.
   *
   * C6 _test driver. Falsifiable: returns the entries appended by commitBurn.
   */
  @Get('_test/diplomacy/get-commitment-ledger')
  async getCommitmentLedger(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ commitmentLedger: unknown[] }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const commitmentLedger = await this.burnNoticeService.getCommitmentLedger(
      playerId,
      rivalKey as RivalKey,
    );
    return { commitmentLedger };
  }

  /**
   * POST /v1/_test/diplomacy/designate-zones?playerId=<uuid>&rivalKey=<key>&gameMinute=<n>
   * Body: { zones: string[] }
   *
   * Calls VulnerabilityDisplayService.designateZones — seeded draw GATES deterrence.
   * Returns { deterred: boolean, credibilityBucket, drawValue: number, interpretationBadge }.
   *
   * C6 _test driver. Falsifiable:
   *   - HIGH credibility + favorable draw (< 0.55) → deterred=true.
   *   - LOW credibility + same draw → deterred=false.
   *   - Same (rivalKey, gameMinute) → same drawValue (deterministic).
   */
  @Post('_test/diplomacy/designate-zones')
  @HttpCode(200)
  async designateZones(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('gameMinute') gameMinuteStr: string,
    @Body() body: { zones?: string[] },
  ): Promise<{
    deterred: boolean;
    credibilityBucket: CredibilityScoreBucket;
    drawValue: number;
    interpretationBadge: InterpretationBadge;
  }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const zones = Array.isArray(body?.zones) ? body.zones : [];
    const gameMinute = parseInt(gameMinuteStr ?? '0', 10);
    return this.vulnDisplayService.designateZones(
      playerId,
      rivalKey as RivalKey,
      zones,
      gameMinute,
    );
  }

  /**
   * POST /v1/_test/diplomacy/compose-gift?playerId=<uuid>&rivalKey=<key>&giftType=<type>&gameMinute=<bigint-str>
   * Body: { qty: number }
   *
   * Calls PotlatchBindService.composeGift — validates stash floor + writes public_ledger_entry.
   * Returns { entryId?, rejected: boolean, reason? }.
   *
   * C6 _test driver. Falsifiable:
   *   - qty >= 1000 → rejected=false, entryId present, public_ledger_entry row written.
   *   - qty < 1000 → rejected=true, reason='below_stash_floor' (Erlang-stash floor P2).
   */
  @Post('_test/diplomacy/compose-gift')
  @HttpCode(200)
  async composeGift(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('giftType') giftType: string,
    @Query('gameMinute') gameMinuteStr: string,
    @Body() body: { qty?: number },
  ): Promise<{ entryId?: string; rejected: boolean; reason?: string }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const VALID_GIFT_TYPES: ReadonlySet<string> = new Set<GiftType>([
      'resource_transfer',
      'territory_concession',
      'supply_route_opening',
    ]);
    if (!giftType || !VALID_GIFT_TYPES.has(giftType)) {
      throw new HttpException(
        `Invalid giftType: ${giftType}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const qty = typeof body?.qty === 'number' ? body.qty : 0;
    const gameMinute = BigInt(gameMinuteStr ?? '0');
    return this.potlatchBindService.composeGift(
      playerId,
      rivalKey as RivalKey,
      giftType as GiftType,
      qty,
      gameMinute,
    );
  }

  /**
   * POST /v1/_test/diplomacy/evaluate-reciprocity?playerId=<uuid>&rivalKey=<key>
   *
   * Calls PotlatchBindService.evaluateReciprocity — A's recordPressure (revenue, mounting).
   * Returns { pressureApplied: boolean, source: string, magnitudeBucket: string }.
   *
   * C6 _test driver. Falsifiable: rival's regime_pressure rises after this call.
   */
  @Post('_test/diplomacy/evaluate-reciprocity')
  @HttpCode(200)
  async evaluateReciprocity(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ pressureApplied: boolean; source: string; magnitudeBucket: string }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    return this.potlatchBindService.evaluateReciprocity(
      playerId,
      rivalKey as RivalKey,
    );
  }

  /**
   * POST /v1/_test/diplomacy/apply-standing-penalty?playerId=<uuid>&rivalKey=<key>
   *
   * Calls PotlatchBindService.applyStandingPenalty — recordRefusedGift → credibility DROPS.
   * Returns { credibilityBucket: CredibilityScoreBucket }.
   *
   * C6 _test driver. Falsifiable: after calling, credibility band is lower than before.
   */
  @Post('_test/diplomacy/apply-standing-penalty')
  @HttpCode(200)
  async applyStandingPenalty(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ credibilityBucket: CredibilityScoreBucket }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    return this.potlatchBindService.applyStandingPenalty(
      playerId,
      rivalKey as RivalKey,
    );
  }

  // ── C7: Proof of Leverage + Shared Exposure Lock _test drivers ────────────────────────────────

  /**
   * POST /v1/_test/diplomacy/proof-broadcast?playerId=<uuid>&rivalKey=<key>&leverageType=<type>&confidence=<n>&gameMinute=<n>
   *
   * Calls ProofOfLeverageService.broadcast — seeded bluff-probe GATES skepticism hardening.
   * Returns { threatened, deterrenceExpiresTick, bluffProbeOccurred, skepticismHardeningApplied, credibilityBucket, drawValue }.
   *
   * C7 _test driver. Falsifiable (BOTH DIRECTIONS):
   *   - gameMinute=0   (day=0, draw=0.036 < 0.5) → bluffProbeOccurred=false, hardening=false.
   *   - gameMinute=2880 (day=2, draw=0.751 >= 0.5) → bluffProbeOccurred=true, hardening=true.
   *   - confidence=0.6 > 0.5 (coil/supply threshold) → threatened=true.
   *   - confidence=0.3 <= 0.5 → threatened=false.
   * DD-BPD-WRITE-SCOPE: appendDeclarationEntry is called (declaration_ledger grows after broadcast).
   * C4: no Math.random(), no Date.now().
   */
  @Post('_test/diplomacy/proof-broadcast')
  @HttpCode(200)
  async proofBroadcast(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('leverageType') leverageType: string,
    @Query('confidence') confidenceStr: string,
    @Query('gameMinute') gameMinuteStr: string,
  ): Promise<{
    threatened:                  boolean;
    deterrenceExpiresTick:       number | null;
    bluffProbeOccurred:          boolean;
    skepticismHardeningApplied:  boolean;
    credibilityBucket:           CredibilityScoreBucket;
    drawValue:                   number;
  }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const VALID_LEVERAGE_TYPES: ReadonlySet<string> = new Set<LeverageType>([
      'supply',
      'personnel',
      'financial',
    ]);
    if (!leverageType || !VALID_LEVERAGE_TYPES.has(leverageType)) {
      throw new HttpException(
        `Invalid leverageType: ${leverageType}. Must be one of: supply, personnel, financial`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const confidence = parseFloat(confidenceStr ?? '0');
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new HttpException('confidence must be a float in [0, 1]', HttpStatus.BAD_REQUEST);
    }
    const gameMinute = parseInt(gameMinuteStr ?? '0', 10);
    return this.proofOfLeverageService.broadcast(
      playerId,
      rivalKey as RivalKey,
      leverageType as LeverageType,
      confidence,
      gameMinute,
    );
  }

  /**
   * GET /v1/_test/diplomacy/read-proof-state?playerId=<uuid>&rivalKey=<key>
   *
   * Calls ProofOfLeverageService.getProofState — reads latest broadcast record + skepticism thresholds.
   * Returns { threatened, deterrenceExpiresTick, skepticismThresholds }.
   *
   * C7 _test driver. Falsifiable: reflects state written by proof-broadcast.
   */
  @Get('_test/diplomacy/read-proof-state')
  async readProofState(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{
    threatened:            boolean;
    deterrenceExpiresTick: number | null;
    skepticismThresholds:  Record<string, number>;
  }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    return this.proofOfLeverageService.getProofState(
      playerId,
      rivalKey as RivalKey,
    );
  }

  /**
   * POST /v1/_test/diplomacy/recompute-auto-truce?playerId=<uuid>&rivalKey=<key>&districtId=<n>
   * Body: { playerBPDAttention: number, rivalBPDAttention: number }
   *
   * Calls SharedExposureLockService.recomputeAutoTruce — BPD-coupled mutual deterrence.
   * Returns { autoTruceActive, mutualExposureFlag }.
   *
   * C7 _test driver. Falsifiable:
   *   - Both attention >= 0.55 (composite:STANDARD ref) → autoTruceActive=true.
   *   - One attention < 0.55 → autoTruceActive=false.
   * READ-ONLY on BPD: declaration_ledger count unchanged after this call.
   */
  @Post('_test/diplomacy/recompute-auto-truce')
  @HttpCode(200)
  async recomputeAutoTruce(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('districtId') districtIdStr: string,
    @Body() body: { playerBPDAttention?: number; rivalBPDAttention?: number },
  ): Promise<{ autoTruceActive: boolean; mutualExposureFlag: boolean }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const districtId = parseInt(districtIdStr ?? '1', 10);
    if (!Number.isInteger(districtId) || districtId < 1) {
      throw new HttpException('districtId must be a positive integer', HttpStatus.BAD_REQUEST);
    }
    const playerBPDAttention = typeof body?.playerBPDAttention === 'number' ? body.playerBPDAttention : 0;
    const rivalBPDAttention  = typeof body?.rivalBPDAttention  === 'number' ? body.rivalBPDAttention  : 0;

    return this.sharedExposureLockService.recomputeAutoTruce(
      districtId,
      playerId,
      rivalKey as RivalKey,
      playerBPDAttention,
      rivalBPDAttention,
    );
  }

  /**
   * GET /v1/_test/diplomacy/read-shared-exposure?playerId=<uuid>&rivalKey=<key>&districtId=<n>
   *
   * Calls SharedExposureLockService.readSharedExposure — reads the shared_exposure_lock row.
   * Returns { sharedExposure: <row | null> }.
   *
   * C7 _test driver. Falsifiable: reflects state written by recompute-auto-truce.
   */
  @Get('_test/diplomacy/read-shared-exposure')
  async readSharedExposure(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('districtId') districtIdStr: string,
  ): Promise<{ sharedExposure: unknown }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const districtId = parseInt(districtIdStr ?? '1', 10);
    if (!Number.isInteger(districtId) || districtId < 1) {
      throw new HttpException('districtId must be a positive integer', HttpStatus.BAD_REQUEST);
    }
    const row = await this.sharedExposureLockService.readSharedExposure(
      playerId,
      rivalKey as RivalKey,
      districtId,
    );
    return { sharedExposure: row };
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // C8 _test routes: Revelation Trap + Sealed-Envelope Commitment + Dispersal Suppression Pact
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * POST /v1/_test/diplomacy/revelation-compose-offer?playerId=<uuid>&rivalKey=<key>&gameMinute=<n>
   *
   * Calls RevelationTrapService.composeOffer.
   * Returns { trapId, offerMenu, offerOptionsCount }.
   *
   * C8 _test driver. Falsifiable: trap is stored in DB with offer_menu non-empty.
   */
  @Post('_test/diplomacy/revelation-compose-offer')
  @HttpCode(200)
  async revelationComposeOffer(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('gameMinute') gameMinuteStr: string,
  ): Promise<{ trapId: string; offerMenu: unknown; offerOptionsCount: number }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const gameMinute = parseInt(gameMinuteStr ?? '0', 10);
    if (!Number.isFinite(gameMinute)) {
      throw new HttpException('gameMinute must be a finite integer', HttpStatus.BAD_REQUEST);
    }
    return this.revelationTrapService.composeOffer(playerId, rivalKey as RivalKey, gameMinute);
  }

  /**
   * POST /v1/_test/diplomacy/revelation-infer-rival-type
   *    ?playerId=<uuid>&rivalKey=<key>&trapId=<uuid>&chosenOptionIndex=<n>&gameMinute=<n>
   *
   * Calls RevelationTrapService.inferRivalType.
   * Returns { rivalTypeInferred: 'honor_intent'|'defect_intent', detected: boolean, drawValue: number }.
   *
   * C8 _test driver. Falsifiable: the seeded detection draw GATES detected (same rival+bucket,
   * two gameDays on opposite sides of the threshold → detected flips).
   */
  @Post('_test/diplomacy/revelation-infer-rival-type')
  @HttpCode(200)
  async revelationInferRivalType(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('trapId') trapId: string,
    @Query('chosenOptionIndex') chosenOptionIndexStr: string,
    @Query('gameMinute') gameMinuteStr: string,
  ): Promise<{ rivalTypeInferred: string; detected: boolean; drawValue: number }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    if (!trapId) {
      throw new HttpException('trapId is required', HttpStatus.BAD_REQUEST);
    }
    const chosenOptionIndex = parseInt(chosenOptionIndexStr ?? '0', 10);
    const gameMinute = parseInt(gameMinuteStr ?? '0', 10);
    return this.revelationTrapService.inferRivalType(
      playerId, rivalKey as RivalKey, trapId, chosenOptionIndex, gameMinute,
    );
  }

  /**
   * GET /v1/_test/diplomacy/read-revelation-trap?playerId=<uuid>&trapId=<uuid>
   *
   * Calls RevelationTrapService.readTrap.
   * Returns { trap: <row> } — 404 `RESOURCE_NOT_FOUND` if `trapId` is absent or owned by another
   * player (D2 — the two cases are indistinguishable).
   *
   * W6a C6 (F-C6-4) — `playerId` is now a required query param. The service keeps returning `null`
   * for "not found" (its own pre-existing idiom, D2-consistent); the throw lives HERE, at the route
   * boundary, because this route's shape (`{ trap: <row> }`, PK read) never had a legitimate
   * 200+null caller to preserve (unlike `boss-mirror/ring`'s C4 fix — see that route's docblock).
   *
   * C8 _test driver.
   */
  @Get('_test/diplomacy/read-revelation-trap')
  async readRevelationTrap(
    @Query('playerId') playerId: string,
    @Query('trapId') trapId: string,
  ): Promise<{ trap: unknown }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!trapId) {
      throw new HttpException('trapId is required', HttpStatus.BAD_REQUEST);
    }
    const trap = await this.revelationTrapService.readTrap(playerId, trapId);
    if (!trap) {
      throw new ApiError('RESOURCE_NOT_FOUND', {
        message: `read-revelation-trap: trap ${trapId} not found for player ${playerId}`,
      });
    }
    return { trap };
  }

  /**
   * POST /v1/_test/diplomacy/sealed-commit?playerId=<uuid>&rivalKey=<key>
   * Body: { targetId: string, deadlineTick: number, gameMinute: number }
   *
   * Calls SealedEnvelopeCommitmentService.commit.
   * Returns { commitmentId, logicalCommitId, targetHash, deadlineTick }.
   *
   * C8 _test driver. Falsifiable: same inputs 5× → same targetHash (DD-SEALED-HASH determinism).
   */
  @Post('_test/diplomacy/sealed-commit')
  @HttpCode(200)
  async sealedCommit(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Body() body: { targetId?: string; deadlineTick?: number; gameMinute?: number },
  ): Promise<{ commitmentId: string; logicalCommitId: string; targetHash: string; deadlineTick: number }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const targetId = body?.targetId ?? 'default_target';
    const deadlineTick = typeof body?.deadlineTick === 'number' ? body.deadlineTick : 6;
    const gameMinute = typeof body?.gameMinute === 'number' ? body.gameMinute : 0;
    return this.sealedEnvelopeService.commit(
      playerId, rivalKey as RivalKey, targetId, deadlineTick, gameMinute,
    );
  }

  /**
   * POST /v1/_test/diplomacy/sealed-reveal-at-deadline
   *    ?playerId=<uuid>&rivalKey=<key>&commitmentId=<uuid>&gameMinute=<n>
   *
   * Calls SealedEnvelopeCommitmentService.revealAtDeadline.
   * Returns { revealed: boolean, penaltyApplied: boolean, credibilityBucket: string }.
   *
   * C8 _test driver. Falsifiable: met deadline → no penalty; missed → penalty fires (-0.25).
   */
  @Post('_test/diplomacy/sealed-reveal-at-deadline')
  @HttpCode(200)
  async sealedRevealAtDeadline(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('commitmentId') commitmentId: string,
    @Query('gameMinute') gameMinuteStr: string,
  ): Promise<{ revealed: boolean; penaltyApplied: boolean; credibilityBucket: string }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    if (!commitmentId) {
      throw new HttpException('commitmentId is required', HttpStatus.BAD_REQUEST);
    }
    const gameMinute = parseInt(gameMinuteStr ?? '0', 10);
    if (!Number.isFinite(gameMinute)) {
      throw new HttpException('gameMinute must be a finite integer', HttpStatus.BAD_REQUEST);
    }
    return this.sealedEnvelopeService.revealAtDeadline(
      playerId, rivalKey as RivalKey, commitmentId, gameMinute,
    );
  }

  /**
   * GET /v1/_test/diplomacy/read-sealed-commitment?commitmentId=<uuid>
   *
   * Calls SealedEnvelopeCommitmentService.readCommitment.
   * Returns { commitment: <row | null> }.
   *
   * C8 _test driver.
   */
  @Get('_test/diplomacy/read-sealed-commitment')
  async readSealedCommitment(
    @Query('commitmentId') commitmentId: string,
  ): Promise<{ commitment: unknown }> {
    if (!commitmentId) {
      throw new HttpException('commitmentId is required', HttpStatus.BAD_REQUEST);
    }
    const commitment = await this.sealedEnvelopeService.readCommitment(commitmentId);
    return { commitment };
  }

  /**
   * POST /v1/_test/diplomacy/dispersal-create-pact?playerId=<uuid>&rivalKey=<key>
   * Body: { districts: number[] }
   *
   * Calls DispersalSuppressionPactService.createPact.
   * Returns { pactId, suppressedDistricts, pactDurationTicks }.
   *
   * C8 _test driver. Falsifiable: pact stored in DB, suppressed_districts match input.
   */
  @Post('_test/diplomacy/dispersal-create-pact')
  @HttpCode(200)
  async dispersalCreatePact(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Body() body: { districts?: number[] },
  ): Promise<{ pactId: string; suppressedDistricts: number[]; pactDurationTicks: number }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const districts = Array.isArray(body?.districts) ? body.districts : [];
    return this.dispersalPactService.createPact(playerId, rivalKey as RivalKey, districts);
  }

  /**
   * POST /v1/_test/diplomacy/dispersal-scan-new-entrants
   *    ?playerId=<uuid>&rivalKey=<key>&pactId=<uuid>
   * Body: { newEntrantDistrictId?: number | null }
   *
   * Calls DispersalSuppressionPactService.scanForNewEntrants.
   * Returns { jointResponseFired: boolean, entrantDistrict: number | null }.
   *
   * C8 _test driver. ★ The primary rivalry is NOT mutated — rival_state is byte-unchanged.
   */
  @Post('_test/diplomacy/dispersal-scan-new-entrants')
  @HttpCode(200)
  async dispersalScanNewEntrants(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
    @Query('pactId') pactId: string,
    @Body() body: { newEntrantDistrictId?: number | null },
  ): Promise<{ jointResponseFired: boolean; entrantDistrict: number | null }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    if (!pactId) {
      throw new HttpException('pactId is required', HttpStatus.BAD_REQUEST);
    }
    const newEntrantDistrictId =
      typeof body?.newEntrantDistrictId === 'number' ? body.newEntrantDistrictId : null;
    return this.dispersalPactService.scanForNewEntrants(
      playerId, rivalKey as RivalKey, pactId, newEntrantDistrictId,
    );
  }

  /**
   * GET /v1/_test/diplomacy/read-dispersal-pact?pactId=<uuid>
   *
   * Calls DispersalSuppressionPactService.readPact.
   * Returns { pact: <row | null> }.
   *
   * C8 _test driver.
   */
  @Get('_test/diplomacy/read-dispersal-pact')
  async readDispersalPact(
    @Query('pactId') pactId: string,
  ): Promise<{ pact: unknown }> {
    if (!pactId) {
      throw new HttpException('pactId is required', HttpStatus.BAD_REQUEST);
    }
    const pact = await this.dispersalPactService.readPact(pactId);
    return { pact };
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // C10 _test route: DiplomacyProjectionService — DD-P5 diplomacy client-view
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  /**
   * GET /v1/_test/diplomacy/client-view?playerId=<uuid>&rivalKey=<key>
   *
   * Calls DiplomacyProjectionService.toDiplomacyClientView — the ONLY player-facing
   * path from diplomacy state. Returns the full DiplomacyClientView (buckets + ONE P5 exception).
   * Returns { clientView: DiplomacyClientView }.
   *
   * C10 _test driver. Falsifiable:
   *   - After reset: credibilityBucket='damaged', trustDecayBucket='pristine', sharedAttentionBucket='low'.
   *   - After record-backed-commitment: credibilityBucket changes band.
   *   - The raw credibility float NEVER appears in the response.
   *
   * P5 gate: the reviewer⊥ grep-zero checks this response for raw float leaks.
   * C4: NO Math.random(), NO Date.now(). Pure DB read via projection service.
   */
  @Get('_test/diplomacy/client-view')
  async getDiplomacyClientView(
    @Query('playerId') playerId: string,
    @Query('rivalKey') rivalKey: string,
  ): Promise<{ clientView: DiplomacyClientView }> {
    if (!playerId) {
      throw new HttpException('playerId is required', HttpStatus.BAD_REQUEST);
    }
    if (!VALID_RIVAL_KEYS.has(rivalKey)) {
      throw new HttpException(`Invalid rivalKey: ${rivalKey}`, HttpStatus.BAD_REQUEST);
    }
    const clientView = await this.diplomacyProjection.toDiplomacyClientView(
      playerId,
      rivalKey as RivalKey,
    );
    return { clientView };
  }
}
