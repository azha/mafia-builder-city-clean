// IMPLEMENTS: docs/superpowers/plans/2026-07-17-04g-D-meta-layer-plan.md C1 (template-library.tunables.ts
//             — registry-first getters, R2.3)
//             Design: docs/superpowers/specs/2026-07-17-04g-D-meta-layer-design.md §5 (tunables)
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md — 7 REUSE rows lifted
//             (`[PROV-Y26Q2]` → 04g-D C1 first code reader) + 9 NEW rows added + 2 `db.event_reskin.*`
//             structural rows added, SAME commit (R2.3 registry-FIRST).
//             Pattern: mirrors services/game-back/src/operational/liveops/live-ops.tunables.ts (CAPS
//             map + clamp function) — 04g-D is spread across namespaces it does NOT own outright
//             (`political_templates.*`/`recruitment_quest.*`/`liveops_templates.*` already have OTHER
//             modules' own tunables files for THEIR keys; this file owns ONLY the reskin/mapping-related
//             keys design §5 lists, one small named export PER namespace — mirrors `live-ops.tunables.ts`'s
//             own `liveOpsBoPushTunables`/`liveOpsBoComposerTunables` "separate small export per distinct
//             namespace" convention).
//             — 04g-D C1 — 2026-07-17
//
// 16 getters total: 7 REUSE (04g-D = FIRST code reader, precedent 04e-B C1 exact) + 9 NEW (design §5,
// D8 — mirror the defaults of their canon namespace siblings, political=3/true). Every default below is
// verbatim from gdd/14 (single source of truth, R9.3). AUCUN scalaire nouveau au-delà des 16 — R2.2.

import { TunablesStore } from '../../config/tunables-store';

/** Min/max clamp range per key (mirrors `NEWS_BEAT_TUNABLE_CAPS`'s shape). */
interface TemplateLibraryTunableRange { readonly min: number; readonly max: number; }

export const TEMPLATE_LIBRARY_TUNABLE_CAPS: Record<string, TemplateLibraryTunableRange> = {
  // ── REUSE numeric (gdd/14, 04g-D C1 first code reader) ─────────────────────────────────────────────
  'template_library.unmapped_opportunity_alert_threshold_days': { min: 30, max: 180 },
  'political_templates.unmapped_opportunity_alert_threshold': { min: 1, max: 10 },
  'recruitment_quest.unmapped_opportunity_alert_threshold_days': { min: 30, max: 180 },
  // ── NEW (design §5, D8) ─────────────────────────────────────────────────────────────────────────────
  'news_beats.unmapped_opportunity_alert_threshold': { min: 1, max: 10 },
  'random_world.unmapped_opportunity_alert_threshold': { min: 1, max: 10 },
  'recruitment_quest.unmapped_opportunity_alert_threshold': { min: 1, max: 10 },
  'liveops_templates.unmapped_opportunity_alert_threshold': { min: 1, max: 10 },
  'achievement.unmapped_opportunity_alert_threshold': { min: 1, max: 10 },
};

function clampTemplateLibraryTunableToRange(key: string, value: number): number {
  const range = TEMPLATE_LIBRARY_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// `template_library.*` — REUSE, 04g-D C1 first code reader (2 keys).
// ════════════════════════════════════════════════════════════════════════════════════════════════════
export const templateLibraryTunables = {
  /** total_templates_canonical — gdd/14:1746 verbatim. Fixed, NO hot-reload (structural invariant — the
   *  boot assertion §3.7.1 compares the library's OWN computed total against this constant, not the
   *  reverse). Default 60. */
  get totalTemplatesCanonical(): number {
    return TunablesStore.resolveInt('template_library.total_templates_canonical', 'TEMPLATE_LIBRARY_TOTAL_TEMPLATES_CANONICAL', 60);
  },
  /** unmapped_opportunity_alert_threshold_days — gdd/14:1747. Default 90, 30..180. The GLOBAL days-gate
   *  (design §3.4) — per-category namespaces override it where their own `_days` key exists
   *  (`recruitment_quest.*` only, honored as an override per D8). */
  get unmappedOpportunityAlertThresholdDays(): number {
    return clampTemplateLibraryTunableToRange('template_library.unmapped_opportunity_alert_threshold_days',
      TunablesStore.resolveInt('template_library.unmapped_opportunity_alert_threshold_days', 'TEMPLATE_LIBRARY_UNMAPPED_OPPORTUNITY_ALERT_THRESHOLD_DAYS', 90));
  },
  /** db.event_reskin.template_category_member_count — structural, tied to the `template_category` pgEnum's
   *  6 members (migration 0131). NEVER DB-overridden (mirrors `liveops_templates.constant_hum_channel_
   *  count`'s own "structural" posture) — read here as a documentation constant, not resolved from the
   *  store, since it is compile-time/DDL-time fixed. */
  get templateCategoryMemberCount(): number {
    return 6;
  },
  /** db.event_reskin.status_member_count — structural, tied to the `event_reskin_status` pgEnum's 3
   *  members (migration 0131). NEVER DB-overridden. */
  get eventReskinStatusMemberCount(): number {
    return 3;
  },
};

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// `political_templates.*` — REUSE, 04g-D C1 first code reader (2 keys).
// ════════════════════════════════════════════════════════════════════════════════════════════════════
export const politicalTemplatesReskinTunables = {
  /** template_reskin_validator_strict_mode — gdd/14:1755. Default true. §3.5.2 strict/lax mode for
   *  `TemplateInstantiationValidator.enforce()` on POLITICAL-home templates. */
  get templateReskinValidatorStrictMode(): boolean {
    return TunablesStore.resolveBool('political_templates.template_reskin_validator_strict_mode', 'POLITICAL_TEMPLATES_TEMPLATE_RESKIN_VALIDATOR_STRICT_MODE', true);
  },
  /** unmapped_opportunity_alert_threshold — gdd/14:1756. Default 3, 1..10. §3.4 count-gate POLITICAL. */
  get unmappedOpportunityAlertThreshold(): number {
    return clampTemplateLibraryTunableToRange('political_templates.unmapped_opportunity_alert_threshold',
      TunablesStore.resolveInt('political_templates.unmapped_opportunity_alert_threshold', 'POLITICAL_TEMPLATES_UNMAPPED_OPPORTUNITY_ALERT_THRESHOLD', 3));
  },
};

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// `news_beats.*` — NEW (design §5, D8), reskin-namespace keys ONLY (the 35 fodder/generation keys live
// in `news-beat.tunables.ts`, owned by 04g-C — this file adds ONLY the 2 reskin-mechanism keys 04g-C
// never needed).
// ════════════════════════════════════════════════════════════════════════════════════════════════════
export const newsBeatsReskinTunables = {
  /** unmapped_opportunity_alert_threshold — NEW. Default 3, 1..10 (mirrors political's default, D8). */
  get unmappedOpportunityAlertThreshold(): number {
    return clampTemplateLibraryTunableToRange('news_beats.unmapped_opportunity_alert_threshold',
      TunablesStore.resolveInt('news_beats.unmapped_opportunity_alert_threshold', 'NEWS_BEATS_UNMAPPED_OPPORTUNITY_ALERT_THRESHOLD', 3));
  },
  /** template_reskin_validator_strict_mode — NEW. Default true (mirrors political's default, D8). */
  get templateReskinValidatorStrictMode(): boolean {
    return TunablesStore.resolveBool('news_beats.template_reskin_validator_strict_mode', 'NEWS_BEATS_TEMPLATE_RESKIN_VALIDATOR_STRICT_MODE', true);
  },
};

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// `random_world.*` — NEW (design §5, D8), reskin-namespace keys ONLY (the 47 generator/curve keys live
// in `random-world.tunables.ts`, owned by 04g-B).
// ════════════════════════════════════════════════════════════════════════════════════════════════════
export const randomWorldReskinTunables = {
  get unmappedOpportunityAlertThreshold(): number {
    return clampTemplateLibraryTunableToRange('random_world.unmapped_opportunity_alert_threshold',
      TunablesStore.resolveInt('random_world.unmapped_opportunity_alert_threshold', 'RANDOM_WORLD_UNMAPPED_OPPORTUNITY_ALERT_THRESHOLD', 3));
  },
  get templateReskinValidatorStrictMode(): boolean {
    return TunablesStore.resolveBool('random_world.template_reskin_validator_strict_mode', 'RANDOM_WORLD_TEMPLATE_RESKIN_VALIDATOR_STRICT_MODE', true);
  },
};

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// `recruitment_quest.*` — REUSE (2 keys, 04g-D C1 first code reader) + NEW (1 key, D8).
// ════════════════════════════════════════════════════════════════════════════════════════════════════
export const recruitmentQuestReskinTunables = {
  /** template_reskin_validator_strict_mode — gdd/14:1873. Default true. REUSE. */
  get templateReskinValidatorStrictMode(): boolean {
    return TunablesStore.resolveBool('recruitment_quest.template_reskin_validator_strict_mode', 'RECRUITMENT_QUEST_TEMPLATE_RESKIN_VALIDATOR_STRICT_MODE', true);
  },
  /** unmapped_opportunity_alert_threshold_days — gdd/14:1874. Default 90, 30..180. REUSE — honored as an
   *  OVERRIDE of the global days-gate for RECRUITMENT_QUEST (design §3.4, D8 — "pas de rename, le
   *  namespace recruitment possède déjà son override"). */
  get unmappedOpportunityAlertThresholdDays(): number {
    return clampTemplateLibraryTunableToRange('recruitment_quest.unmapped_opportunity_alert_threshold_days',
      TunablesStore.resolveInt('recruitment_quest.unmapped_opportunity_alert_threshold_days', 'RECRUITMENT_QUEST_UNMAPPED_OPPORTUNITY_ALERT_THRESHOLD_DAYS', 90));
  },
  /** unmapped_opportunity_alert_threshold — NEW. Default 3, 1..10 (the namespace only had the `_days` key
   *  before this lot, D8). */
  get unmappedOpportunityAlertThreshold(): number {
    return clampTemplateLibraryTunableToRange('recruitment_quest.unmapped_opportunity_alert_threshold',
      TunablesStore.resolveInt('recruitment_quest.unmapped_opportunity_alert_threshold', 'RECRUITMENT_QUEST_UNMAPPED_OPPORTUNITY_ALERT_THRESHOLD', 3));
  },
};

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// `liveops_templates.*` — REUSE (1 key, 04g-D C1 first code reader) + NEW (2 keys, D8). Reskin-namespace
// keys ONLY (the 15 substrate/drift keys live in `ambient.tunables.ts`, owned by 04g-A).
// ════════════════════════════════════════════════════════════════════════════════════════════════════
export const liveOpsTemplatesReskinTunables = {
  /** anti_fomo_validator_strict_mode — gdd/14:1924. Default true. "Jamais désactivé en production" (canon
   *  glossary liveops:280) — lax only softens the BOOT SCAN (WARNING vs throw); composition-time REJECT
   *  stays active regardless of mode (design §3.5.3). REUSE. */
  get antiFomoValidatorStrictMode(): boolean {
    return TunablesStore.resolveBool('liveops_templates.anti_fomo_validator_strict_mode', 'LIVEOPS_TEMPLATES_ANTI_FOMO_VALIDATOR_STRICT_MODE', true);
  },
  /** unmapped_opportunity_alert_threshold — NEW. Default 3, 1..10. */
  get unmappedOpportunityAlertThreshold(): number {
    return clampTemplateLibraryTunableToRange('liveops_templates.unmapped_opportunity_alert_threshold',
      TunablesStore.resolveInt('liveops_templates.unmapped_opportunity_alert_threshold', 'LIVEOPS_TEMPLATES_UNMAPPED_OPPORTUNITY_ALERT_THRESHOLD', 3));
  },
  /** template_reskin_validator_strict_mode — NEW. Default true. */
  get templateReskinValidatorStrictMode(): boolean {
    return TunablesStore.resolveBool('liveops_templates.template_reskin_validator_strict_mode', 'LIVEOPS_TEMPLATES_TEMPLATE_RESKIN_VALIDATOR_STRICT_MODE', true);
  },
};

/** Min/max clamp range for the §5-B C4b mount-policy pair below — DELIBERATELY a SEPARATE tiny registry
 *  from `TEMPLATE_LIBRARY_TUNABLE_CAPS` (never folded into it): that map doubles as (a) the legal-range
 *  check for a STAFF-submitted `ReskinSpec.tunables` override AND (b) a class-(ii) dangling-crossRef
 *  anchor target (`event-reskin-validator.ts`'s `resolveCrossRefAnchor`) — neither role is appropriate for
 *  these 2 keys, which are SYSTEM-wide mount-policy caps the C4b mount validator reads about the MOUNT
 *  ITSELF, never a per-reskin content override a staff author's own `tunables` block could legitimately
 *  reference. Mirrors `live-ops.tunables.ts`'s own established convention of multiple co-existing
 *  range-registries for distinct tunable "families" within one file (`LIVE_OPS_TUNABLE_CAPS` vs
 *  `LIVE_OPS_BO_TWO_PERSON_TUNABLE_CAPS`). */
const MOUNT_POLICY_TUNABLE_CAPS: Record<string, TemplateLibraryTunableRange> = {
  'liveops_templates.mounted_reskin_max_duration_real_days': { min: 1, max: 30 },
  'liveops_templates.mounted_effect_max_magnitude_factor': { min: 1, max: 5 },
};
function clampMountPolicyTunableToRange(key: string, value: number): number {
  const range = MOUNT_POLICY_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// `liveops_templates.*` — §5-B NEW (2 keys, C4b, D1=B). The mount validator's OWN 2 policy caps
// (DD-RSK3 duration / DD-RSK4 rule 3 magnitude band) — registry-first, first code reader =
// `LiveOpsReskinMountAdapter` (this SAME commit, R2.3). Kept as a SEPARATE small export (mirrors this
// file's own "one small named export per distinct namespace concern" convention, e.g.
// `liveOpsBoPushTunables`/`liveOpsBoComposerTunables` in `live-ops.tunables.ts`) rather than folded into
// `liveOpsTemplatesReskinTunables` above, so the C4b-specific §5-B provenance stays visually distinct.
// ════════════════════════════════════════════════════════════════════════════════════════════════════
export const liveOpsMountPolicyTunables = {
  /** mounted_reskin_max_duration_real_days — NEW §5-B. Default 14 `[PROV]`, range 1..30. DD-RSK3 — caps
   *  a mounted reskin's `liveOps.durationRealDays`; default = the MAX of the catalogue's own real
   *  durations (3..14 days, `live-ops.tunables.ts:193-317`) — a mounted event never outlasts the longest
   *  catalogue-proven event. Violation at mount = 422 `mounted_duration_out_of_range`. */
  get mountedReskinMaxDurationRealDays(): number {
    return clampMountPolicyTunableToRange('liveops_templates.mounted_reskin_max_duration_real_days',
      TunablesStore.resolveInt('liveops_templates.mounted_reskin_max_duration_real_days', 'LIVEOPS_TEMPLATES_MOUNTED_RESKIN_MAX_DURATION_REAL_DAYS', 14));
  },
  /** mounted_effect_max_magnitude_factor — NEW §5-B. Default 2.0 `[PROV]`, range 1..5. DD-RSK4 rule 3 —
   *  `|magnitude staff| ≤ factor × |magnitude catalogue du triple|` (the ⊥-reviewed catalogue is the
   *  étalon, never an invented number). Violation at mount = 422 `mounted_effect_invalid`. */
  get mountedEffectMaxMagnitudeFactor(): number {
    return clampMountPolicyTunableToRange('liveops_templates.mounted_effect_max_magnitude_factor',
      TunablesStore.resolveFloat('liveops_templates.mounted_effect_max_magnitude_factor', 'LIVEOPS_TEMPLATES_MOUNTED_EFFECT_MAX_MAGNITUDE_FACTOR', 2.0));
  },
};

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// `achievement.*` — NEW (2 keys, D8). Reskin-namespace keys ONLY (the 7 pattern-detection keys are
// pre-existing ch16 rows, owned by a future 08c PatternDetectionService chunk).
// ════════════════════════════════════════════════════════════════════════════════════════════════════
export const achievementReskinTunables = {
  get unmappedOpportunityAlertThreshold(): number {
    return clampTemplateLibraryTunableToRange('achievement.unmapped_opportunity_alert_threshold',
      TunablesStore.resolveInt('achievement.unmapped_opportunity_alert_threshold', 'ACHIEVEMENT_UNMAPPED_OPPORTUNITY_ALERT_THRESHOLD', 3));
  },
  get templateReskinValidatorStrictMode(): boolean {
    return TunablesStore.resolveBool('achievement.template_reskin_validator_strict_mode', 'ACHIEVEMENT_TEMPLATE_RESKIN_VALIDATOR_STRICT_MODE', true);
  },
};
