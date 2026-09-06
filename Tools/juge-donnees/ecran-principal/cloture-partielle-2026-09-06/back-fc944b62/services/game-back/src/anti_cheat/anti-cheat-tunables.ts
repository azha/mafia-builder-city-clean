// IMPLEMENTS: docs/superpowers/specs/2026-09-02-w12a-two-person-perimetre.md §12 C4 ("severity dérivée
//             du ratio par deux tunables neufs (…_severity_medium_multiplier, …_high_multiplier).
//             Aucune valeur inline.")
//             -- W1.2-a C4 — 2026-09-02 --
//
// Anti-cheat (ch13) tunables — `T.anti_cheat.*`. NEW namespace: measured before writing (M2 of the
// périmètre spec — 0 `pgTable` named `approv`/`two`/`person` — and separately, 0 hit for `T.anti_cheat`
// anywhere in this codebase or in `docs/tech/13_anti_exploit_balance/`). Two keys, both consumed ONLY
// by `CheatFlagService#deriveSeverity` (C4): the C1 decoy-spam ratio (`false_n / max(genuine_n, 1)`)
// is compared against `T.city.flood_backlash_threshold` (REUSE, `inspection-tunables.ts` —
// `floodBacklashThreshold`) × each multiplier to pick LOW / MEDIUM / HIGH (R2.3 — no inline numeric
// balance value; the SERVICE resolves, callers never hardcode a ratio band).
//
// [PROPOSED DEFAULT][PROV-Y26Q2] — canon silent on an exact severity curve for C1
// (`signature_detection.md` names the C1 signal and the flood ratio, never a severity band). Defaults
// chosen so the predicate's OWN pass/fail boundary (ratio == threshold) is LOW, 1.5× the threshold is
// MEDIUM, 3× is HIGH — a conservative, monotonic spread, not a canon value. Consigned in
// `implementation-notes.md` §Deviations (D-C4-severity).

import { TunablesStore } from '../config/tunables-store';

export const antiCheatTunables = {
  c1: {
    /**
     * `T.anti_cheat.c1_severity_medium_multiplier` — the C1 ratio (false:genuine over 30 real days)
     * reaches MEDIUM once it is at least `threshold × this` (below it, and above the raw
     * `flood_backlash_threshold` the predicate itself already gates on, severity is LOW).
     * Env override: `ANTI_CHEAT_C1_SEVERITY_MEDIUM_MULTIPLIER`. (DB-override > env > default — Phase-23).
     */
    get severityMediumMultiplier(): number {
      return TunablesStore.resolveFloat(
        'T.anti_cheat.c1_severity_medium_multiplier',
        'ANTI_CHEAT_C1_SEVERITY_MEDIUM_MULTIPLIER',
        1.5,
      );
    },
    /**
     * `T.anti_cheat.c1_severity_high_multiplier` — the C1 ratio reaches HIGH once it is at least
     * `threshold × this`. MUST stay >= `severityMediumMultiplier` for the band to make sense (not
     * enforced in code — an override that inverts the two bands degrades gracefully to "never HIGH",
     * never a crash: `deriveSeverity` checks HIGH first).
     * Env override: `ANTI_CHEAT_C1_SEVERITY_HIGH_MULTIPLIER`. (DB-override > env > default — Phase-23).
     */
    get severityHighMultiplier(): number {
      return TunablesStore.resolveFloat(
        'T.anti_cheat.c1_severity_high_multiplier',
        'ANTI_CHEAT_C1_SEVERITY_HIGH_MULTIPLIER',
        3.0,
      );
    },
  },
};
