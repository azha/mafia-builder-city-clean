// IMPLEMENTS: docs/superpowers/plans/2026-07-13-p3-D-cue-annealing-plan.md §C5 (`NamedSequenceService` —
//             save/list/apply orchestration + the ruling #2(a) unlock gate)
//             Design: docs/superpowers/specs/2026-07-13-p3-D-cue-annealing-design.md §8 (Loop 6 verbatim —
//             save "depuis le stack pending/committed du joueur", snapshot SANS statuts; apply = "compose
//             §4.3 depuis le template, revalidation COMPLÈTE"; unlock gate) + §15.1 (endpoints, buckets-only
//             — a template carries no status at all, so there is nothing to bucket on save/list; apply's
//             RESPONSE is `CueStackView`, C2's own buckets-only shape, unchanged).
//             Decisions: §1.7 D7 (snapshot template, never a live reference — a vanished target fails
//             CLEANLY per-slot at apply, never a partial apply) + §6.2 #2 RULING (a) (gate on the LIVE
//             Phase-17 `rule_vocabulary_tier >= 2` — the ONLY real meta-progression gate on this base).
//             — P3-D C5 — 2026-07-14
//
// `NamedSequenceService` owns 3 verbs, ALL gated behind `assertUnlocked` (design §8 — the WHOLE Loop 6
// surface is "unlocked via meta-progression", not just save):
//   - `save`   — snapshot the player's CURRENT pending/committed stack (`CueStackRepository.
//     findSaveableStack`, C5-new) into a `slots_template` STRIPPED of status/outcome (D7 — "SANS
//     statuts": a template is a blueprint, not a bound execution instance) → `NamedSequenceRepository.
//     saveAtomic` (I4's own arbiter, C5-new).
//   - `list`   — every saved template, oldest-first.
//   - `apply`  — "one-tap auto-queue" = REUSE `CueStackService.compose` VERBATIM against the template's OWN
//     slots array (design §8: "compose §4.3 depuis le template, revalidation COMPLÈTE"). This is not a
//     re-implementation of compose's validation pipeline — it IS that pipeline: target existence,
//     ownership, actionability, reserved-slot-type, acyclic dependencies are ALL re-checked against
//     TODAY'S state (a template pointing at a route deleted last week throws `CUE_STACK_SLOT_TARGET_INVALID`
//     — the SAME per-slot signal a fresh compose would, C2). Because `validateAndNormalizeSlots` throws
//     BEFORE `CueStackRepository.composeUpsert` is ever called, a template with ANY invalid slot writes
//     ZERO rows — never a partial apply (D7's own "honnête, pas de magie").

import { Injectable } from '@nestjs/common';

import { ApiError } from '../../protocol/api-error';
import { coreLoopsTunables } from '../core-loops-tunables';
import { ProgressionRepository } from '../../progression/progression.repository';
import { ProgressionProjectionService } from '../../progression/progression.projection.service';
import { CueStackRepository } from './cue-stack.repository';
import { CueStackService, type CueStackView } from './cue-stack.service';
import { NamedSequenceRepository } from './named-sequence.repository';
import type { CueStackSlot } from './slot-type-executor.interface';

/** The unlock gate's own tier ordinal (decisions §6.2 #2 ruling (a)) — NOT a tunable (design §14: the
 *  composite canon threshold `named_sequence_unlock_meta_progression_threshold` is explicitly NOT ported;
 *  "2" here is a fixed point on the CLOSED `rule_vocabulary_tier` 1..6 ladder, the same kind of bare tier
 *  literal `ProgressionService.onResolution` itself compares against, `progression.service.ts:29`). */
const NAMED_SEQUENCE_UNLOCK_TIER = 2;

/** The template's own persisted shape (design §8/§13.2 — "types + targets + dépendances + ordre, SANS
 *  statuts"): exactly the 5 AUTHORED `CueStackSlot` fields, `status`/`outcome` deliberately absent. */
export interface NamedSequenceSlotTemplate {
  slot_id: string;
  slot_type: string;
  target_ref: { kind: string; id: string };
  dependencies: string[];
  drag_order: number;
}

/** The player-facing named-sequence view (save/list responses) — a template carries no status, so there is
 *  nothing to bucket (unlike `CueStackView`'s own slots, C2 §15.1). */
export interface NamedSequenceView {
  readonly sequence_id: string;
  readonly name: string;
  readonly created_at: string;
  readonly slots: readonly NamedSequenceSlotTemplate[];
}

@Injectable()
export class NamedSequenceService {
  constructor(
    private readonly repo: NamedSequenceRepository,
    private readonly cueStackRepo: CueStackRepository,
    private readonly cueStackService: CueStackService,
    private readonly progressionRepo: ProgressionRepository,
    private readonly progressionProjection: ProgressionProjectionService,
  ) {}

  /**
   * save (design §8 — "depuis le stack pending/committed du joueur"). 409 `RESOURCE_STATE_CONFLICT` if
   * there is no pending/committed stack to snapshot (never composed, or the current one is
   * executing/resolved — `CueStackRepository.findSaveableStack`'s own narrower-than-`findCurrent` scope).
   * 409 `NAMED_SEQUENCE_CAP_REACHED` / `NAMED_SEQUENCE_NAME_TAKEN` per I4's own disambiguated outcome.
   */
  async save(playerId: string, rawName: unknown): Promise<NamedSequenceView> {
    await this.assertUnlocked(playerId);
    const name = this.requireName(rawName);

    const stackRow = await this.cueStackRepo.findSaveableStack(playerId);
    if (!stackRow) {
      throw new ApiError('RESOURCE_STATE_CONFLICT', {
        message: 'no pending/committed cue stack to save as a named sequence (never composed, or the current one is executing/resolved).',
      });
    }

    const slots = (stackRow.slots as unknown as CueStackSlot[]) ?? [];
    // D7 "SANS statuts" — strip status/outcome, keep the 5 AUTHORED fields (types+targets+deps+order).
    const template: NamedSequenceSlotTemplate[] = slots.map((s) => ({
      slot_id: s.slot_id,
      slot_type: s.slot_type,
      target_ref: s.target_ref,
      dependencies: [...s.dependencies],
      drag_order: s.drag_order,
    }));

    const cap = coreLoopsTunables.cueStackNamedSequencesMax;
    const outcome = await this.repo.saveAtomic(playerId, name, JSON.stringify(template), cap);
    if (outcome.reason === 'duplicate_name') {
      throw new ApiError('NAMED_SEQUENCE_NAME_TAKEN', {
        message: `a named sequence called '${name}' already exists for this player (named_sequences_player_name_unique).`,
      });
    }
    if (outcome.reason === 'cap') {
      throw new ApiError('NAMED_SEQUENCE_CAP_REACHED', {
        message: `this player already has ${cap} saved named sequences (the I4 cap) — delete one before saving another.`,
      });
    }
    return this.toView(outcome.row);
  }

  /** list (design §15.1) — every saved template, oldest-first. */
  async list(playerId: string): Promise<NamedSequenceView[]> {
    await this.assertUnlocked(playerId);
    const rows = await this.repo.listForPlayer(playerId);
    return rows.map((r) => this.toView(r));
  }

  /**
   * apply (design §8 — "one-tap auto-queue" = compose §4.3 depuis le template, revalidation COMPLÈTE).
   * REUSE `CueStackService.compose` VERBATIM against the template's own slots array — see file header.
   * 404 `RESOURCE_NOT_FOUND` if `sequenceId` does not resolve to a template owned by this player.
   */
  async apply(playerId: string, sequenceId: string): Promise<CueStackView> {
    await this.assertUnlocked(playerId);
    const row = await this.repo.findByIdForPlayer(playerId, sequenceId);
    if (!row) {
      throw new ApiError('RESOURCE_NOT_FOUND', { message: `no named sequence '${sequenceId}' for this player.` });
    }
    const template = row.slots_template as unknown as NamedSequenceSlotTemplate[];
    return this.cueStackService.compose(playerId, template);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // The ruling #2(a) unlock gate (decisions §6.2) — REUSE the LIVE Phase-17 read (design: "gate sur
  // rule_vocabulary tier ≥ 2 — LE mécanisme ch06 DÉJÀ LIVE, `progression.service.ts:30-32`").
  // ═══════════════════════════════════════════════════════════════════════════════════════════

  private async assertUnlocked(playerId: string): Promise<void> {
    await this.progressionRepo.ensureRow(playerId);
    const prog = await this.progressionRepo.getProgression(playerId);
    if (prog.rule_vocabulary_tier >= NAMED_SEQUENCE_UNLOCK_TIER) return;

    // R2.2 qualitative-only: `details` mirrors EXACTLY the `ProgressionView` `GET /v1/progression` already
    // surfaces to this SAME player (vocabulary_tier + progress_to_next) — no NEW raw K/N leak, no echo
    // beyond what is already player-visible elsewhere (`progression.controller.ts#progression`).
    const handled = await this.progressionRepo.countHandledExceptions(playerId);
    const view = this.progressionProjection.project({ ...prog, handled });
    throw new ApiError('NAMED_SEQUENCE_UNLOCK_REQUIRED', {
      message: `named sequences require rule_vocabulary_tier >= ${NAMED_SEQUENCE_UNLOCK_TIER} (Phase-17 meta-progression) — this player is at tier ${prog.rule_vocabulary_tier}.`,
      details: view,
    });
  }

  private toView(row: { sequence_id: string; name: string; slots_template: unknown; created_at: Date | string }): NamedSequenceView {
    return {
      sequence_id: row.sequence_id,
      name: row.name,
      created_at: new Date(row.created_at).toISOString(),
      slots: (row.slots_template as NamedSequenceSlotTemplate[]) ?? [],
    };
  }

  private requireName(value: unknown): string {
    const s = typeof value === 'string' ? value.trim() : '';
    if (!s) {
      throw new ApiError('VALIDATION_FAILED', { message: 'name must be a non-empty string.' });
    }
    return s;
  }
}
