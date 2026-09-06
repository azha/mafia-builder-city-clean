// IMPLEMENTS: docs/superpowers/plans/2026-07-16-04g-C-news-beat-plan.md C1 (press-registry.ts, 3
//             outlets + 6 journalists)
//             Design: docs/superpowers/specs/2026-07-16-04g-C-news-beat-design.md §3.6 (the minimal
//             press substrate, D3)
//             Decisions: docs/superpowers/specs/2026-07-16-04g-C-news-beat-decisions.md D3 (★
//             LOAD-BEARING, invented [PROV] content — ratified in block per user convention)
//             Districts: services/game-back/src/db/schema/world_geography.ts (18 districts, ids 1..18,
//             seeded migration 0016) + migration 0016_world_geography_seed.sql (id→name mapping)
//             — 04g-C C1 — 2026-07-16
//
// `PressRegistry` (glossary gdd/15, NEW 04g-C C1) — the static press substrate: outlets + journalists,
// ZERO DB table (D3 — the canon exigence is IDENTITY: bylines, a queryable "framing track record"
// (CATALOGUE_REPORT.md :288 "queryable later"), series continuity — NOT a simulated journalist NPC
// system with dynamic cohesion/source relationships, which would be its own lot, TD family design §11.4).
// Track record is entirely QUERY-DERIVED from `news_thread` rows (`journalist_key` + `outcome`) — zero
// scalar stored here beyond the 2 static properties below. Form mirrors `tight-coupling-pairs.ts` (04g-B)
// — a hard-coded TS array, no registry table.
//
// ★ INVENTED CONTENT [PROV] (D3, ratified in block): `brennar_daily_star` is canon-verbatim
// (news_beat_templates.md Scénario 3 — "Brennar Daily Star"); `tilbey_weekly`/`free_weekly` are COMPOSED
// from canon fragments ("a Tilbey weekly" CATALOGUE_REPORT.md :360; "the Free Weekly" :514). The 6
// journalist names have NO canon source (CATALOGUE never names a NEWS-BEAT journalist outside 2 re-skin
// examples — 'Tellan'/'Marens', CATALOGUE_REPORT.md :514/:504) — REUSED here + 4 neutral composed names,
// all flagged [PROV], all i18n keys (never player-facing raw strings). `selfCensorCoefficient` /
// `cohesionWithBeat` are likewise static NPC properties [PROV] (D3 does not enumerate exact numbers — the
// values below are this chunk's own invention, chosen so the LIVE templates that depend on them remain
// structurally REACHABLE: at least one outlet clears `folded_page_suppression_threshold_severity`
// (0.6, gdd/14) and at least one journalist per multi-journalist outlet clears
// `cooper_journalist_cohesion_threshold` (0.5, gdd/14) — never a value that would silently make a LIVE
// template dead-on-arrival).

/** The 3 canon outlet keys (D3 — the count itself is canon: Folded Page "outlet count tracked
 *  (default 3)" CATALOGUE_REPORT.md :340; Wire Day "all three remaining city outlets" :528). */
export type PressOutletKey = 'brennar_daily_star' | 'tilbey_weekly' | 'free_weekly';

/** broadsheet (largest, most institutional) vs weekly (smaller, scrappier) — design §3.6. */
export type PressOutletKind = 'broadsheet' | 'weekly';

export interface PressOutletEntry {
  readonly outletKey: PressOutletKey;
  /** i18n key — never a raw display string (F1). */
  readonly nameI18nKey: string;
  /** 1 (smallest) .. 3 (largest/most institutional) — CITATION-CHAIN tier semantics are DISTINCT from
   *  this field (design §3.6 note): `SourceAttribution.tier` (per-beat, news_beat/news_thread payload)
   *  encodes citation directness (1 = direct, unlaundered), never this outlet-size tier. */
  readonly tier: 1 | 2 | 3;
  readonly kind: PressOutletKind;
  /** 0..1 static NPC property (D3, [PROV] — NOT a tunable, R2.3 scope: gameplay balance tunables live in
   *  `news-beat.tunables.ts`; this is press-NPC identity, mirrors `TightCouplingPair`'s own static
   *  properties). The `folded_page` trigger (design §3.5.5) compares an outlet's coefficient here
   *  against `newsBeatTunables.foldedPageSuppressionThresholdSeverity` (0.6) — `brennar_daily_star`'s
   *  0.65 is deliberately ≥ 0.6 so the LIVE `folded_page` template is reachable. */
  readonly selfCensorCoefficient: number;
}

/** The 3-entry static outlet registry (D3). */
export const PRESS_OUTLET_REGISTRY: readonly PressOutletEntry[] = [
  {
    outletKey: 'brennar_daily_star',
    nameI18nKey: 'press.outlet.brennar_daily_star.name',
    tier: 3,
    kind: 'broadsheet',
    selfCensorCoefficient: 0.65,
  },
  {
    outletKey: 'tilbey_weekly',
    nameI18nKey: 'press.outlet.tilbey_weekly.name',
    tier: 2,
    kind: 'weekly',
    selfCensorCoefficient: 0.35,
  },
  {
    outletKey: 'free_weekly',
    nameI18nKey: 'press.outlet.free_weekly.name',
    tier: 1,
    kind: 'weekly',
    selfCensorCoefficient: 0.15,
  },
];

const OUTLET_BY_KEY: ReadonlyMap<PressOutletKey, PressOutletEntry> = new Map(
  PRESS_OUTLET_REGISTRY.map((entry) => [entry.outletKey, entry]),
);

/** Look up an outlet by key. Rejects (throws) any key outside the 3-entry closed domain. */
export function pressOutletByKey(key: string): PressOutletEntry {
  const entry = OUTLET_BY_KEY.get(key as PressOutletKey);
  if (!entry) {
    throw new Error(
      `Unknown PressOutletKey '${key}' — not one of the ${PRESS_OUTLET_REGISTRY.length} entries in PRESS_OUTLET_REGISTRY.`,
    );
  }
  return entry;
}

/** The 6 canon journalist keys (2 per outlet, D3). */
export type JournalistKey =
  | 'journalist_tellan'
  | 'journalist_marens'
  | 'journalist_okonkwo'
  | 'journalist_vasse'
  | 'journalist_praile'
  | 'journalist_dunmore';

export interface JournalistEntry {
  readonly journalistKey: JournalistKey;
  /** i18n key — never a raw display string (F1). */
  readonly nameI18nKey: string;
  readonly outletKey: PressOutletKey;
  /** Exactly 3 district ids — one of the 6 disjoint beats partitioning the 18 districts (design §3.6).
   *  Sequential-id partition (districts.ts ids 1..18, migration 0016 seed): [1,2,3], [4,5,6], [7,8,9],
   *  [10,11,12], [13,14,15], [16,17,18] — a deterministic, content-neutral split (never tied to district
   *  `profile` groupings, which are uneven: tidewater=3, spine=4, lattice=3, stack=2, glass=3, verge=3). */
  readonly beatDistrictIds: readonly [number, number, number];
  /** 0..1 static (D3, [PROV]). The `cooper_affair` trigger (design §3.5.1) requires a covering
   *  journalist with `cohesionWithBeat ≥ cooper_journalist_cohesion_threshold` (0.5, gdd/14) — 4 of the
   *  6 journalists below clear it, so `cooper_affair` stays reachable across most beats without being
   *  guaranteed trivially everywhere. */
  readonly cohesionWithBeat: number;
}

/** The 6-entry static journalist registry (2 per outlet, D3). Names: 'Tellan'/'Marens' REUSE the only 2
 *  reporter names CATALOGUE_REPORT.md ever cites for this category (:504/:514, Burned Source re-skin
 *  examples) — the other 4 are neutral composed [PROV] names. */
export const JOURNALIST_REGISTRY: readonly JournalistEntry[] = [
  {
    journalistKey: 'journalist_tellan',
    nameI18nKey: 'press.journalist.tellan.name',
    outletKey: 'brennar_daily_star',
    beatDistrictIds: [1, 2, 3],
    cohesionWithBeat: 0.62,
  },
  {
    journalistKey: 'journalist_marens',
    nameI18nKey: 'press.journalist.marens.name',
    outletKey: 'brennar_daily_star',
    beatDistrictIds: [4, 5, 6],
    cohesionWithBeat: 0.55,
  },
  {
    journalistKey: 'journalist_okonkwo',
    nameI18nKey: 'press.journalist.okonkwo.name',
    outletKey: 'tilbey_weekly',
    beatDistrictIds: [7, 8, 9],
    cohesionWithBeat: 0.42,
  },
  {
    journalistKey: 'journalist_vasse',
    nameI18nKey: 'press.journalist.vasse.name',
    outletKey: 'tilbey_weekly',
    beatDistrictIds: [10, 11, 12],
    cohesionWithBeat: 0.58,
  },
  {
    journalistKey: 'journalist_praile',
    nameI18nKey: 'press.journalist.praile.name',
    outletKey: 'free_weekly',
    beatDistrictIds: [13, 14, 15],
    cohesionWithBeat: 0.51,
  },
  {
    journalistKey: 'journalist_dunmore',
    nameI18nKey: 'press.journalist.dunmore.name',
    outletKey: 'free_weekly',
    beatDistrictIds: [16, 17, 18],
    cohesionWithBeat: 0.38,
  },
];

const JOURNALIST_BY_KEY: ReadonlyMap<JournalistKey, JournalistEntry> = new Map(
  JOURNALIST_REGISTRY.map((entry) => [entry.journalistKey, entry]),
);

/** Look up a journalist by key. Rejects (throws) any key outside the 6-entry closed domain. */
export function journalistByKey(key: string): JournalistEntry {
  const entry = JOURNALIST_BY_KEY.get(key as JournalistKey);
  if (!entry) {
    throw new Error(
      `Unknown JournalistKey '${key}' — not one of the ${JOURNALIST_REGISTRY.length} entries in JOURNALIST_REGISTRY.`,
    );
  }
  return entry;
}

/** The 2 journalists staffing a given outlet. */
export function journalistsForOutlet(outletKey: PressOutletKey): readonly JournalistEntry[] {
  return JOURNALIST_REGISTRY.filter((entry) => entry.outletKey === outletKey);
}

/** The journalist(s) whose beat covers a given district (0, 1, or more — beats are disjoint by
 *  construction so this is 0 or 1 in practice; returns an array defensively, never assumes the
 *  invariant rather than proving it). */
export function journalistsCoveringDistrict(districtId: number): readonly JournalistEntry[] {
  return JOURNALIST_REGISTRY.filter((entry) => entry.beatDistrictIds.includes(districtId));
}
