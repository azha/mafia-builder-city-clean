// IMPLEMENTS: docs/superpowers/plans/2026-07-13-04g-A-constant-hum-plan.md C1 (ambient.tunables.ts,
//             registry-first getters, S7 pattern)
//             Design: docs/superpowers/specs/2026-07-13-04g-A-constant-hum-design.md §5 (tunables)
//             Registry: projects/mafia_city_game/gdd/14_tunable_constants.md §"Ambient World Event
//             Templates — Live-ops" (6 keys pre-registered ch16, 2026-05-23 — 3 of which this chunk is
//             the FIRST code reader for) + "Note 04g-A C1 (2026-07-13)" (the 9 NEW keys this chunk ADDS,
//             SAME commit — R2.3 registry-FIRST).
//             Pattern: mirrors services/game-back/src/operational/liveops/live-ops.tunables.ts (CAPS map +
//             clamp function; ALL getters for the whole 04g-A design built upfront at C1, even though most
//             are not consumed until C2/C3 — the SAME "29 getters at C1, consumers land later" precedent).
//             — 04g-A C1 — 2026-07-13
//
// `ambient.tunables.ts` — registry-mirrored getters for the `liveops_templates.*` keys this 04g-A lot
// (Constant Hum substrate) needs. R2.3 (NO inline numeric balance/config): every default below is
// verbatim from gdd/14 §"Ambient World Event Templates — Live-ops". If a registry value changes, update
// gdd/14 + this file in the SAME commit (R9.3).
//
// Keys shipped at C1 (12 total, namespace `liveops_templates.*` — NOT `liveops.*`, disjunction load-
// bearing, design §1):
//   3 REUSE keys (ch16-pre-registered, this chunk is their FIRST code reader):
//     `constant_hum_cells_per_week` (STRUCTURAL — see `structuralInt` below), `off_hours_drift_
//     detection_window_days` (C3 consumer), `off_hours_drift_threshold_pct` (composite `drift_significant`
//     — resolved via the `OFF_HOURS_DRIFT_SIGNIFICANT_RELATIVE_THRESHOLD`/`OFF_HOURS_DRIFT_MIN_CELLS_
//     FALLBACK` code constants below, mirrors `EPOL12_DISTRICT_HEAT_CEILING_BUCKET`'s "not a registry key"
//     composite-resolution precedent, political.tunables.ts).
//   9 NEW keys (design §5): `constant_hum_events_per_ward_per_day`, `constant_hum_decay_window_hours`,
//     `constant_hum_attended_residue_magnitude`, `constant_hum_channel_count` (STRUCTURAL),
//     `constant_hum_cell_ema_alpha` (★ C1's OWN consumer — constant-hum.service.ts), `constant_hum_
//     micro_events_per_district_daily_clamp`, `constant_hum_attend_diminishing_factor`, `off_hours_hour_
//     band_end`, `off_hours_drift_min_cells`.
//
// STRUCTURAL keys (hot_reloadable: NO, Scenario 1 canon — liveops_templates.md §Scenario 1): the tick
// cadence is `structural`. `constantHumCellsPerWeek`/`constantHumChannelCount` NEVER honor a DB/env
// override — the getter reads the store ONLY to detect + log a divergence attempt (canon: "Validator
// REFUSE ... alert log 'structural tunable not reloadable'"), then ALWAYS returns the hardcoded
// structural constant. This is the strongest form of "refused": even a real override row in
// `tunable_overrides` cannot shift the 168-cell grid or the 3-channel domain (both are load-bearing DB
// invariants — the composite PK cap + the pgEnum member count — not just a convention).

import { TunablesStore } from '../../config/tunables-store';

/** Min/max clamp range per key (mirrors `LIVE_OPS_TUNABLE_CAPS`'s shape). Only NON-structural numeric
 *  keys are listed — the 2 structural keys are never DB/env-overridable (see `structuralInt` below), so
 *  no range clamp applies to them. */
interface AmbientTunableRange { readonly min: number; readonly max: number; }

export const AMBIENT_TUNABLE_CAPS: Record<string, AmbientTunableRange> = {
  'liveops_templates.off_hours_drift_detection_window_days':              { min: 14,   max: 90   },
  'liveops_templates.constant_hum_events_per_ward_per_day':               { min: 0.5,  max: 4.0  },
  'liveops_templates.constant_hum_decay_window_hours':                    { min: 24,   max: 72   },
  'liveops_templates.constant_hum_attended_residue_magnitude':            { min: 0.005, max: 0.05 },
  'liveops_templates.constant_hum_cell_ema_alpha':                        { min: 0.05, max: 0.5  },
  'liveops_templates.constant_hum_micro_events_per_district_daily_clamp': { min: 4,    max: 20   },
  'liveops_templates.constant_hum_attend_diminishing_factor':             { min: 0.25, max: 1.0  },
  'liveops_templates.off_hours_hour_band_end':                            { min: 3,    max: 7    },
  'liveops_templates.off_hours_drift_min_cells':                          { min: 1,    max: 10   },
};

/** Clamp a numeric value to the registered range for the given key. Used internally by every
 *  non-structural numeric getter below. Returns the value unchanged if no range is registered. */
export function clampAmbientTunableToRange(key: string, value: number): number {
  const range = AMBIENT_TUNABLE_CAPS[key];
  if (!range) return value;
  return Math.min(range.max, Math.max(range.min, value));
}

/**
 * Read a STRUCTURAL (hot_reloadable: NO) int tunable: detects + logs an override attempt (Scenario 1
 * canon "alert log 'structural tunable not reloadable'") but ALWAYS returns `structuralValue` — a DB
 * override row for this key can never change the returned value. No env-var knob either (structural
 * means structural for every environment, including tests — the ONE exception the codebase makes for
 * "test-only env override" does not apply to a value load-bearing to a DB CHECK/pgEnum shape).
 */
function structuralInt(key: string, structuralValue: number): number {
  const attempted = TunablesStore.resolveInt(key, `__AMBIENT_STRUCTURAL_NEVER_READ_${key}`, structuralValue);
  if (attempted !== structuralValue) {
    // eslint-disable-next-line no-console
    console.warn(
      `[ambient.tunables] structural tunable not reloadable: '${key}' override attempt (${attempted}) ` +
        `ignored — staying at ${structuralValue} (Scenario 1 canon, liveops_templates.md).`,
    );
  }
  return structuralValue;
}

/**
 * `OFF_HOURS_DRIFT_SIGNIFICANT_RELATIVE_THRESHOLD` — the resolved NUMERIC half of the composite
 * `liveops_templates.off_hours_drift_threshold_pct = composite:drift_significant` registry row (D10,
 * design §3.4/§5). NOT a `TunablesStore`-resolved registry key itself (mirrors
 * `EPOL12_DISTRICT_HEAT_CEILING_BUCKET`'s "PAS une clé registry" precedent, political.tunables.ts) —
 * R2.2/R2.3: the composite string stays the registry's source of truth for WHICH resolution scheme is
 * active; the scalar magnitude the C3 `OffHoursDriftDetector` actually compares against is this code
 * constant, resolved here per gdd/14's "Note 04g-A C1" documentation. The companion cell-count component
 * (`≥ 3 cells`) IS its own registry key (`off_hours_drift_min_cells`, getter below) — distinct from this
 * relative-magnitude half.
 */
export const OFF_HOURS_DRIFT_SIGNIFICANT_RELATIVE_THRESHOLD = 0.25;

/** Registry-mirrored getters for the `liveops_templates.*` keys this 04g-A lot needs (12 total — 3 REUSE
 *  + 9 NEW, C1). */
export const ambientTunables = {

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Constant Hum — the 168-cell weekly grid (§3.1, C1 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** constant_hum_cells_per_week — STRUCTURAL (Scenario 1 canon). Default 168 = 24 × 7, hot_reloadable:
   *  NO. ALWAYS 168 regardless of any DB override — see `structuralInt` above. */
  get constantHumCellsPerWeek(): number {
    return structuralInt('liveops_templates.constant_hum_cells_per_week', 168);
  },

  /** constant_hum_cell_ema_alpha — the EMA fold coefficient (design §3.1/D11). Default 0.2, 0.05..0.5.
   *  First fold always inits at the observation (no alpha applied); every subsequent fold uses this. */
  get constantHumCellEmaAlpha(): number {
    return clampAmbientTunableToRange('liveops_templates.constant_hum_cell_ema_alpha',
      TunablesStore.resolveFloat('liveops_templates.constant_hum_cell_ema_alpha', 'AMBIENT_CONSTANT_HUM_CELL_EMA_ALPHA', 0.2));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Ambient micro-events — the Poisson stream (§3.2, C2 consumer — getters built now, R2.3 registry-first)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** constant_hum_events_per_ward_per_day — Poisson λ (CATALOGUE_REPORT.md :1230 verbatim). Default 1.5,
   *  0.5..4.0. "ward" ≡ district (D2). */
  get constantHumEventsPerWardPerDay(): number {
    return clampAmbientTunableToRange('liveops_templates.constant_hum_events_per_ward_per_day',
      TunablesStore.resolveFloat('liveops_templates.constant_hum_events_per_ward_per_day', 'AMBIENT_EVENTS_PER_WARD_PER_DAY', 1.5));
  },

  /** constant_hum_decay_window_hours — micro-event lifetime, CATALOGUE_REPORT.md :1222/:1230 verbatim
   *  ("decay 24-72h"). Default 36, 24..72. */
  get constantHumDecayWindowHours(): number {
    return clampAmbientTunableToRange('liveops_templates.constant_hum_decay_window_hours',
      TunablesStore.resolveInt('liveops_templates.constant_hum_decay_window_hours', 'AMBIENT_DECAY_WINDOW_HOURS', 36));
  },

  /** constant_hum_attended_residue_magnitude — the attend outcome's cohesion residue, CATALOGUE_REPORT.md
   *  :1230 verbatim. Default 0.01, 0.005..0.05. */
  get constantHumAttendedResidueMagnitude(): number {
    return clampAmbientTunableToRange('liveops_templates.constant_hum_attended_residue_magnitude',
      TunablesStore.resolveFloat('liveops_templates.constant_hum_attended_residue_magnitude', 'AMBIENT_ATTENDED_RESIDUE_MAGNITUDE', 0.01));
  },

  /** constant_hum_channel_count — STRUCTURAL (tied to the `ambient_channel` pgEnum's 3 members, design
   *  §5). Default 3. ALWAYS 3 regardless of any DB override — see `structuralInt` above. */
  get constantHumChannelCount(): number {
    return structuralInt('liveops_templates.constant_hum_channel_count', 3);
  },

  /** constant_hum_micro_events_per_district_daily_clamp — the F4 hard clamp on the Poisson draw (D5).
   *  Default 8, 4..20. */
  get constantHumMicroEventsPerDistrictDailyClamp(): number {
    return clampAmbientTunableToRange('liveops_templates.constant_hum_micro_events_per_district_daily_clamp',
      TunablesStore.resolveInt('liveops_templates.constant_hum_micro_events_per_district_daily_clamp', 'AMBIENT_MICRO_EVENTS_DAILY_CLAMP', 8));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // The attend loop (§3.3, C2/C3 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** constant_hum_attend_diminishing_factor — intra-day diminishing-returns multiplier (D8). Default 0.5,
   *  0.25..1.0 (1.0 = disabled). */
  get constantHumAttendDiminishingFactor(): number {
    return clampAmbientTunableToRange('liveops_templates.constant_hum_attend_diminishing_factor',
      TunablesStore.resolveFloat('liveops_templates.constant_hum_attend_diminishing_factor', 'AMBIENT_ATTEND_DIMINISHING_FACTOR', 0.5));
  },

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // Off-Hours Drift (§3.4, C3 consumer)
  // ════════════════════════════════════════════════════════════════════════════════════════════

  /** off_hours_drift_detection_window_days — REUSE (ch16 pre-registered), this chunk is its FIRST code
   *  reader. Default 30, 14..90. */
  get offHoursDriftDetectionWindowDays(): number {
    return clampAmbientTunableToRange('liveops_templates.off_hours_drift_detection_window_days',
      TunablesStore.resolveInt('liveops_templates.off_hours_drift_detection_window_days', 'AMBIENT_OFF_HOURS_DRIFT_WINDOW_DAYS', 30));
  },

  /** off_hours_drift_threshold_pct — REUSE composite (ch16 pre-registered) `composite:drift_significant`.
   *  This getter returns the RAW composite string (BO diagnostic / registry parity) — the RESOLVED
   *  numeric magnitude is `OFF_HOURS_DRIFT_SIGNIFICANT_RELATIVE_THRESHOLD` above, never this string
   *  parsed as a number. */
  get offHoursDriftThresholdPct(): string {
    return TunablesStore.resolveString('liveops_templates.off_hours_drift_threshold_pct', 'AMBIENT_OFF_HOURS_DRIFT_THRESHOLD_PCT', 'composite:drift_significant');
  },

  /** off_hours_hour_band_end — off-hours = hourOfDay ∈ [0..N] (D12). Default 5, 3..7. */
  get offHoursHourBandEnd(): number {
    return clampAmbientTunableToRange('liveops_templates.off_hours_hour_band_end',
      TunablesStore.resolveInt('liveops_templates.off_hours_hour_band_end', 'AMBIENT_OFF_HOURS_HOUR_BAND_END', 5));
  },

  /** off_hours_drift_min_cells — the composite `drift_significant`'s cell-count component (D10). Default
   *  3, 1..10. */
  get offHoursDriftMinCells(): number {
    return clampAmbientTunableToRange('liveops_templates.off_hours_drift_min_cells',
      TunablesStore.resolveInt('liveops_templates.off_hours_drift_min_cells', 'AMBIENT_OFF_HOURS_DRIFT_MIN_CELLS', 3));
  },
};
