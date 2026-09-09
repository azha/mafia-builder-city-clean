// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C3 (template-instantiation-
//             validator.ts — enforce() strict/lax par home-category tunable)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §3.5.2 (Template-
//             InstantiationValidator — enforcement au COMPOSITION-time)
//             Canon: docs/tech/04g_ambient_world_events_templates/political_templates.md §composition
//             enforcement ("Any hit means a ReskinSpec is constructed without being routed through
//             TemplateInstantiationValidator (whether strict or lax mode) — block").
//             — 04g-D C3 — 2026-07-17
//
// `TemplateInstantiationValidator` — the INTERNAL composition-time gate (gdd/15:1823, distinct from
// `EventReskinValidator`'s SPEC-level dry-run, gdd/15:1918 — "two distinct services", `ReskinValidator` is
// a FORBIDDEN name for either, canon `political_templates.md:256`). `enforce()` RE-EXECUTES the SAME 4
// rules `EventReskinValidator` exposes (defense-in-depth — the HTTP dry-run may have been bypassed) by
// DELEGATING to its rule functions/methods (never re-implementing them — DRY, R2.3) and wraps rule 2
// (tunable ranges) in strict/lax mode-awareness: strict = all 4 rules block ; lax = rule 2 downgrades to a
// journaled WARNING (the response's `warnings[]`) — rule 1 (crossRefs) stays ALWAYS-blocking regardless of
// mode (canon never conditions it, §3.5.2), and so do rules 3/4 (template identity + event-id uniqueness —
// design's lax-mode text names ONLY rule 2 as softened).
//
// Mode is read by the TEMPLATE'S HOME category (never the spec's `hostCategory` — a cross-cat authoring
// choice must still respect the template's OWN namespace's strict/lax posture): `<namespace>.
// template_reskin_validator_strict_mode` — REUSE political + recruitment (04g-D C1 first reader), 4 NEW
// keys (news_beats/random_world/liveops_templates/achievement) — all 6 already live in
// `template-library.tunables.ts` (C1).
//
// `EventReskinComposer.compose()` (C4a) routes EVERY ReskinSpec through `enforce()` — the repository is
// injected ONLY in the composer (structural "block" guarantee, §3.5.2) — this class itself never persists
// anything (pure validation + one read via `EventReskinValidator`'s own DB-backed rule 4).
//
// ★ RESOLVED (04g-D C4a, decisions D18, 2026-07-17 — the C3 ⊥ gate's concern 1): rule 1 splits into two
// sub-rules, applied HERE (never in the pure `validateCrossRefs`, which stays 1a-only): **1a EMPTY**
// (`crossRefs.length === 0` / a blank `system`/`anchor`) is ALWAYS-blocking, any mode — unchanged, still
// `validateCrossRefs`. **1b DANGLING** (a non-empty crossRef whose `anchor` resolves to nothing —
// `findDanglingCrossRefs`, `event-reskin-validator.ts`) is mode-SENSITIVE: strict → block
// `missing_cross_ref` naming the dangling anchor (canon Scenario A) ; lax → WARNING
// `{reason: 'dangling_cross_ref', anchor}` (canon Scenario B — the SAME `warnings[]` channel rule 2's
// lax-downgrade already uses), and enforcement CONTINUES (the `EventReskin` IS emitted on the composer's
// commit path). Applied right after 1a, before rules 3/4 (same "rule 1" family, canon order preserved).

import { Injectable } from '@nestjs/common';

import { TemplateCategory } from './template-category';
import {
  validateCrossRefs,
  validateTemplateExists,
  validateTunableRanges,
  findLibraryEntry,
  findDanglingCrossRefs,
  type EventReskinValidationError,
  type EventReskinValidationFailureReason,
  type ReskinSpec,
} from './event-reskin-validator';
import { EventReskinValidator } from './event-reskin-validator.service';
import {
  politicalTemplatesReskinTunables,
  newsBeatsReskinTunables,
  randomWorldReskinTunables,
  recruitmentQuestReskinTunables,
  achievementReskinTunables,
  liveOpsTemplatesReskinTunables,
} from './template-library.tunables';

/** A lax-mode dangling-crossRef downgrade (design §3.5.1-1b/§3.5.2, decisions D18 — canon Scenario B
 *  verbatim shape `{reason: 'dangling_cross_ref', anchor}`). Deliberately NOT an `EventReskinValidation-
 *  Error` (that type's `reason` is closed to the 7 `EventReskinValidationFailureReason` values, which
 *  `dangling_cross_ref` is NOT one of — it is this class's OWN warning-only concept, never a 422 reason,
 *  same posture as the controller's own `anti_fomo_rejected` "5th reason this endpoint adds" precedent). */
export interface DanglingCrossRefWarning {
  readonly reason: 'dangling_cross_ref';
  readonly anchor: string;
  readonly message: string;
}

/** Discriminated on `ok` — `reason`/`message` are guaranteed present on the `false` branch (never an
 *  optional field TS can't narrow), `warnings` populated when a rule-2 (tunable-range) violation OR a
 *  rule-1b (dangling crossRef) was downgraded under lax mode (design §3.5.2 — warnings are a lax-mode-only
 *  concept, empty on every hard block including the `ok:false` branch itself). */
export type TemplateInstantiationEnforceResult =
  | {
      readonly ok: true;
      readonly warnings: readonly (EventReskinValidationError | DanglingCrossRefWarning)[];
      /** The strict/lax mode actually applied (the template's home-category namespace) — surfaced for
       *  response transparency / falsifiability (plan §C3 acceptance: "réponse warnings[]"). */
      readonly strictMode: boolean;
    }
  | {
      readonly ok: false;
      readonly reason: EventReskinValidationFailureReason;
      readonly message: string;
      readonly warnings: readonly (EventReskinValidationError | DanglingCrossRefWarning)[];
      readonly strictMode: boolean;
    };

/** Home-category → strict-mode getter (design §3.5.2 "Mode lu par home category du template"). Mirrors
 *  `unmapped-templates-opportunity.registry.ts`'s own `COUNT_THRESHOLD_GETTER_BY_CATEGORY` shape (a
 *  Record of getters, one per canon category, registry-first — R2.3). */
const STRICT_MODE_GETTER_BY_CATEGORY: Readonly<Record<TemplateCategory, () => boolean>> = {
  [TemplateCategory.POLITICAL]: () => politicalTemplatesReskinTunables.templateReskinValidatorStrictMode,
  [TemplateCategory.NEWS_BEAT]: () => newsBeatsReskinTunables.templateReskinValidatorStrictMode,
  [TemplateCategory.RANDOM_WORLD]: () => randomWorldReskinTunables.templateReskinValidatorStrictMode,
  [TemplateCategory.RECRUITMENT_QUEST]: () => recruitmentQuestReskinTunables.templateReskinValidatorStrictMode,
  [TemplateCategory.ACHIEVEMENT_STRUCTURE]: () => achievementReskinTunables.templateReskinValidatorStrictMode,
  [TemplateCategory.LIVE_OPS]: () => liveOpsTemplatesReskinTunables.templateReskinValidatorStrictMode,
};

@Injectable()
export class TemplateInstantiationValidator {
  constructor(private readonly rules: EventReskinValidator) {}

  /** Strict-mode for `templateId`'s OWN home category — defaults to `true` (fail-closed) if the
   *  templateId is not found in the library (rule 3 below already rejects that case first in practice). */
  private strictModeFor(templateId: string): boolean {
    const entry = findLibraryEntry(templateId);
    if (!entry) return true;
    return STRICT_MODE_GETTER_BY_CATEGORY[entry.homeCategory]();
  }

  /** Canon order: 1a crossRefs-empty → 1b crossRefs-dangling (mode-gated) → 3 templateExists → 4
   *  eventIdFresh (1a/3/4 ALWAYS-blocking, any mode) → 2 tunableRanges LAST (mode-gated: strict blocks, lax
   *  warns). Delegates every rule to `EventReskinValidator`'s own functions/methods — never a duplicate
   *  re-implementation (DRY, defense-in-depth per design's own framing: SAME rules, a 2nd independent
   *  call-site). */
  async enforce(spec: ReskinSpec): Promise<TemplateInstantiationEnforceResult> {
    const strictMode = this.strictModeFor(spec.templateId);
    const warnings: (EventReskinValidationError | DanglingCrossRefWarning)[] = [];

    const crossRefError = validateCrossRefs(spec);
    if (crossRefError) return { ok: false, reason: crossRefError.reason, message: crossRefError.message, warnings: [], strictMode };

    // 1b — dangling crossRef (D18): strict blocks (missing_cross_ref, anchor named) ; lax warns and
    // enforcement CONTINUES (canon Scenario B — the EventReskin IS emitted on the composer's commit path).
    const dangling = findDanglingCrossRefs(spec);
    if (dangling.length > 0) {
      if (strictMode) {
        const first = dangling[0]!;
        return {
          ok: false,
          reason: 'missing_cross_ref',
          message:
            `ReskinSpec.crossRefs names a dangling anchor '${first.anchor}' (system '${first.system}') — it ` +
            `resolves to no known doc-anchor/tunable-key/templateId/instantiationId (design §3.5.1-1b, decisions D18).`,
          warnings: [],
          strictMode,
        };
      }
      for (const ref of dangling) {
        warnings.push({
          reason: 'dangling_cross_ref',
          anchor: ref.anchor,
          message: `ReskinSpec.crossRefs names a dangling anchor '${ref.anchor}' (system '${ref.system}') — lax mode, WARNING only (design §3.5.1-1b, decisions D18).`,
        });
      }
    }

    const templateError = validateTemplateExists(spec);
    if (templateError) return { ok: false, reason: templateError.reason, message: templateError.message, warnings: [], strictMode };

    const eventIdError = await this.rules.validateEventIdFresh(spec);
    if (eventIdError) return { ok: false, reason: eventIdError.reason, message: eventIdError.message, warnings: [], strictMode };

    const tunableError = validateTunableRanges(spec);
    if (tunableError) {
      if (strictMode) {
        return { ok: false, reason: tunableError.reason, message: tunableError.message, warnings: [], strictMode };
      }
      // lax — WARNING journaled, does NOT block (design §3.5.2, canon "audit-log du switch is the
      // mitigation" — the switch-to-lax event itself is the auditable surface, not each individual pass).
      // eslint-disable-next-line no-console
      console.warn(`[TemplateInstantiationValidator] lax mode — tunable-range violation downgraded to warning: ${tunableError.message}`);
      warnings.push(tunableError);
      return { ok: true, warnings, strictMode };
    }

    // `warnings` MAY already carry lax-mode dangling-crossRef entries (1b, accumulated above) even when
    // rule 2 itself found nothing to warn about — return them (empty array when there were none).
    return { ok: true, warnings, strictMode };
  }
}
