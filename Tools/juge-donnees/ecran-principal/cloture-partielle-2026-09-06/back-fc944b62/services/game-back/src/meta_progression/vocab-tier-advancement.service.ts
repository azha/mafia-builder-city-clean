// IMPLEMENTS: docs/superpowers/plans/2026-07-19-p3-G-budgets-horizon-plan.md C6 ("`VocabTierAdvancementService`
//             ← `CapabilityAdoptedEvent` (design D9/§11): monotone WHERE-guarded single-statement advance;
//             `VocabTierAdvancedEvent` on actual write only. ZERO edits to compiler/lieutenant/Phase-17/
//             NamedSequence (REUSE proofs).").
//             Design: docs/superpowers/specs/2026-07-19-p3-G-budgets-horizon-design.md §11 ("`VocabTier
//             AdvancementService` ← `CapabilityAdoptedEvent` where the capability's effect is `VOCAB_TIER_
//             ADVANCE`... The gate chain is then wholly live with ZERO edits: editor/validate path
//             (`lieutenant.service.ts:576`) and attach path (`:514`) read the column per compile...") + §4
//             (event topology: "`VocabTierAdvancementService` ← `CapabilityAdoptedEvent` (D9)").
//             Pattern (bus subscribe + per-listener isolation + a public core method for the E2E floor's
//             replay/idempotency falsifiables to drive directly, ZERO live-vs-test divergence — the SAME
//             Lesson #3 shape every OTHER P3-G subscriber service uses): `budget-recompute.service.ts`
//             (`onApplicationBootstrap` + `bus.onCapabilityAdopted((e) => this.recompute(...).catch(...))`)
//             / `horizon-card-surfacing.service.ts` (the in-memory event-probe convention — mirrors
//             `AdoptionService.getAdoptedEvents`/`clearAdoptedEvents`).
//             — P3-G C6 — 2026-07-20
//
// `VocabTierAdvancementService` — the KEYSTONE runtime this chunk exists to prove: adoption of a
// `VOCAB_TIER_*` capability unlocks the ALREADY-LIVE compiler tier gate with ZERO edits to
// `compiler.service.ts`/`lieutenant.service.ts`/`progression.service.ts`/`named-sequence.service.ts`
// (design §11's own "the gate chain is then wholly live with ZERO edits" — every one of those 4 files
// only ever READS `rule_vocabulary_tier` live, per compile/gate-check; this service is the SECOND writer
// of that column, for values 3-6 only, see `vocab-tier-advancement.repository.ts`'s own header for why
// it is a genuinely NEW writer rather than a reuse of Phase-17's `setVocabularyTier`).
//
// Subscribes `CapabilityAdoptedEvent` (D13's shared event — the SAME one `BudgetRecomputeService`/future
// `IsostaticDebtService.applyUpgrade` (C7) subscribe). Looks up the adopted capability's catalogue entry;
// a capability whose `adoptionEffect.kind !== 'VOCAB_TIER_ADVANCE'` is a genuine no-op (future capability
// classes may carry a different effect kind — the v1 LIVE set happens to be 100% vocab-tier capabilities,
// but this service checks the effect kind rather than assuming every `CapabilityAdoptedEvent` is one).
// For a `VOCAB_TIER_ADVANCE` effect, calls the repository's WHERE double-wall UPDATE; a genuine write
// (RETURNING non-empty) emits `VocabTierAdvancedEvent` post-write — a replay or an out-of-order hand-emit
// (the WHERE's own `= targetTier - 1` guard failing to match) is a SILENT, LOGGED no-op: never an event,
// never a throw (a subscriber must never turn a bus replay into a NEW failure mode).

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { CityEventBus, type CapabilityAdoptedEvent, type VocabTierAdvancedEvent } from '../citysim/events/city-event-bus';
import { capabilityCatalogueEntryForCode } from './capability-catalogue';
import { VocabTierAdvancementRepository } from './vocab-tier-advancement.repository';

@Injectable()
export class VocabTierAdvancementService implements OnApplicationBootstrap {
  private readonly logger = new Logger(VocabTierAdvancementService.name);

  // In-memory probe: every `VocabTierAdvancedEvent` fired this process (test-only — mirrors
  // `AdoptionService.adoptedEvents`'s own "no raw-bus-tap-in-tests" posture). Lets the C6 floor assert
  // "zero event on replay/out-of-order" and "exactly one event under a concurrent replay race" directly.
  private advancedEvents: VocabTierAdvancedEvent[] = [];

  constructor(
    private readonly repo: VocabTierAdvancementRepository,
    private readonly bus: CityEventBus,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.onCapabilityAdopted((event: CapabilityAdoptedEvent) => {
      this.handleCapabilityAdopted(event).catch((err) =>
        this.logger.error(`capability_adopted vocab-tier-advancement handler failed (contained): ${errMsg(err)}`),
      );
    });
  }

  // ────────────────────────────────── test-probe accessors (TEST-ONLY) ──────────────────────────

  /** Every `VocabTierAdvancedEvent` fired this process (test-probe — never used in production paths). */
  getAdvancedEvents(): readonly VocabTierAdvancedEvent[] {
    return this.advancedEvents;
  }

  /** Clear the in-memory advanced-event probe (called by the test reset route). */
  clearAdvancedEvents(): void {
    this.advancedEvents = [];
  }

  // ── the CapabilityAdoptedEvent handler ──────────────────────────────────────────────────────────

  /**
   * Public so the E2E floor's replay/idempotency/out-of-order/concurrency falsifiables can drive it
   * directly too (Lesson #3 shape) — though every REAL falsifiable in this chunk exercises the bus
   * subscription end-to-end via the REAL `CapabilityAdoptedEvent` (fired by the REAL C5 adopt endpoint,
   * or hand-emitted through the EXISTING `POST /v1/_test/budgets-horizon/emit-capability-adopted` test
   * hook — no NEW test route is needed for replay/out-of-order, that hook already emits the exact real
   * event shape onto the SAME bus this service subscribes).
   */
  async handleCapabilityAdopted(event: CapabilityAdoptedEvent): Promise<void> {
    const entry = capabilityCatalogueEntryForCode(event.capabilityId);
    if (!entry.adoptionEffect || entry.adoptionEffect.kind !== 'VOCAB_TIER_ADVANCE') {
      return; // a non-vocab-tier capability effect (none exist in the v1 LIVE set) — genuine no-op.
    }
    const targetTier = entry.adoptionEffect.tier;

    const result = await this.repo.advanceTier(event.playerId, targetTier);
    if (!result.advanced) {
      this.logger.log(
        `VOCAB_TIER_ADVANCE no-op (WHERE double wall): player=${event.playerId} target_tier=${targetTier} ` +
          `capability=${event.capabilityId} (replay, out-of-order, or stale/regressed current tier).`,
      );
      return;
    }

    const advancedEvent: VocabTierAdvancedEvent = {
      type: 'vocab_tier_advanced',
      playerId: event.playerId,
      newVocabTier: result.newTier,
      capabilityId: event.capabilityId,
      gameMinute: event.gameMinute,
    };
    this.bus.emitVocabTierAdvanced(advancedEvent);
    this.advancedEvents.push(advancedEvent);

    this.logger.log(
      `VOCAB_TIER_ADVANCE COMMITTED: player=${event.playerId} tier=${result.newTier} capability=${event.capabilityId}`,
    );
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
