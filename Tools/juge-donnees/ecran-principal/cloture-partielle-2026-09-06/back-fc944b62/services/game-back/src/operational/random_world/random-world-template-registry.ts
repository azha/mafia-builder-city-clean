// IMPLEMENTS: docs/superpowers/plans/2026-07-15-04g-B-random-world-plan.md C1 (random-world-template-
//             registry.ts, 14 entries)
//             Design: docs/superpowers/specs/2026-07-15-04g-B-random-world-design.md §3.1 (the
//             14-template registry — 6 LIVE / 8 registry-only, D1)
//             Canon: projects/mafia_city_world_events/CATALOGUE_REPORT.md §RANDOM-WORLD (:552-863,
//             14 templates, canonical order + verbatim flag/score — freshly re-grepped 2026-07-15,
//             per-entry `catalogueRef` cites the EXACT heading-to-next-heading line range)
//             docs/tech/04g_ambient_world_events_templates/random_world_templates.md :24-41 (the
//             14-row summary table this file mirrors structurally)
//             — 04g-B C1 — 2026-07-15
//             — 04g-B C5 — 2026-07-15 (`tdRef: 'TD-246'` filled on all 8 `registry_only` entries — the
//               ONE multi-item TD enumerating all 8 with their individual reason, pattern TD-240;
//               `docs_int/tech_debt_inventory.md` TD-246)
//
// `RandomWorldTemplateRegistry` (glossary gdd/15:1851) — the static 14-entry catalogue, form mirrors
// `POLITICAL_EVENT_CATALOGUE` (political-event-catalogue.ts) / `RANDOM_WORLD` precedent: a hard-coded
// TS array, NO DB-side RandomWorldTemplate table (`random_world_event_active.template_id` is a soft-ref
// text column, design §4.1). `RandomWorldTemplateId` (gdd/15:1854) is the canon snake_case string set
// — NEVER `world_template_id`.
//
// D1 (design §3.1, ruling user, umbrella §1 row B): the LIVE/registry-only split is the EXACT frontier
// of the 6 Flows the tech-doc adapter documents (`random_world_templates.md §R3.11 :72-112`) — the 6
// LIVE templates cover 100% of the mobilizable canon composites for this category (tech-doc §R3.12
// :114-116 verbatim: the 7 remaining ○-flagged templates "consume exclusively the same canon
// composites … no new composite nor tunable"). The 8 registry-only entries are STATIC catalogue rows +
// BO visibility ONLY (`<UnmappedRandomWorldOpportunityRegistry>`, C5) — NEVER a runtime code-path
// (anti-fig-leaf, precedent "04e-B 6/10 honest TD"). `registryOnlyReason` is the per-entry honesty note
// (design §3.1's own reasoning column); `tdRef` was intentionally left `undefined` at C1 — TD numbers
// are allocated at the C5 closeout (design §11), never fabricated ahead of the actual routing. **C5**:
// all 8 now carry `tdRef: 'TD-246'` (`docs_int/tech_debt_inventory.md` TD-246 — the single multi-item
// row enumerating all 8 with their individual reason, pattern TD-240).

/**
 * The 14 canon `RandomWorldTemplateId` strings (gdd/15:1854 — snake_case, verbatim
 * `random_world_templates.md`/`CATALOGUE_REPORT.md` template identity). This union is the
 * closed domain `randomWorldTemplateById` validates against (AC7 — any id outside this set is
 * rejected, never silently accepted).
 */
export type RandomWorldTemplateId =
  // ── 6 LIVE (design §3.1) ──────────────────────────────────────────────────────────────────────
  | 'sideways_failure'
  | 'halgren_tannery_hailstorm'
  | 'permanent_residue'
  | 'apparent_recovery'
  | 'hollow_at_the_corner'
  | 'quorum_on_stadler_row'
  // ── 8 registry-only (design §3.1) ────────────────────────────────────────────────────────────
  | 'festival_misread'
  | 'absconding'
  | 'standing_ground'
  | 'risk_compensation'
  | 'trough_cycle'
  | 'triage_night'
  | 'cry_wolf_fatigue'
  | 'dialect_drift';

/** The 3 canon LOVED/LIKE/neutral flags (design §3.1: "flag (loved|liked|neutral)"). */
export type RandomWorldTemplateFlag = 'loved' | 'liked' | 'neutral';

/** One static catalogue entry (design §3.1 shape: `{ templateId, name, catalogueRef, flag, score,
 *  runtime, tdRef? }`). */
export interface RandomWorldTemplateEntry {
  readonly templateId: RandomWorldTemplateId;
  /** Canon display name (`CATALOGUE_REPORT.md` heading, minus the flag/score bracket). */
  readonly name: string;
  /** `CATALOGUE_REPORT.md:<start>-<end>` — the exact heading-to-next-heading line range (freshly
   *  re-grepped 2026-07-15, C1). */
  readonly catalogueRef: string;
  readonly flag: RandomWorldTemplateFlag;
  /** The canon LOVED-ideas score (`CATALOGUE_REPORT.md` bracket, e.g. `[4.55]`). */
  readonly score: number;
  /** 'live' = this lot builds a real runtime trigger/effect/curve for it (the 6, design §3.5).
   *  'registry_only' = catalogue entry + BO visibility ONLY, zero code-path (D1, the 8). */
  readonly runtime: 'live' | 'registry_only';
  /**
   * `true` = ce template ne repasse JAMAIS à `resolved` : il n'a pas d'expiration dure et aucun chemin
   * de résolution ne le lit. Aujourd'hui `permanent_residue` seul (design §3.5.2 « il n'y a pas de
   * résolution, le résidu est permanent »).
   *
   * Sert de discriminant au cap de concurrence D6 (`countConcurrencyCapOccupancy`) : un template qui ne
   * peut jamais libérer son slot ne doit pas en occuper un — sinon le cap se referme définitivement.
   * Voir TD-255 et le bloc doc de `random-world-event.repository.ts`.
   *
   * ⚠️ Le discriminant est CE FLAG, pas `expires_at_game_day IS NULL` : `hollow_at_the_corner`,
   * `apparent_recovery` et `quorum_on_stadler_row` ont eux aussi une expiration nulle et **se
   * résolvent** (par état). Les exclure du cap serait faux.
   *
   * Absent = `false`. Poser ce flag sur un nouveau template le rend automatiquement pris en compte —
   * c'est le but : ne jamais redéclarer la liste en dur ailleurs (R2.3, même esprit que le compte du
   * registre dérivé de sa propre longueur).
   */
  readonly neverResolves?: boolean;
  /** The per-entry honesty note (design §3.1's own reasoning column) — REQUIRED for every
   *  `registry_only` entry (never a silent omission of why it isn't live), absent for `live` entries. */
  readonly registryOnlyReason?: string;
  /** Allocated at the C5 closeout (design §11) — intentionally `undefined` at C1 (a registry_only entry
   *  without a `tdRef` yet is NOT a fig-leaf, it is simply not-yet-routed; routing happens once, at
   *  closeout, never fabricated ahead of time). **C5**: all 8 now carry `'TD-246'`
   *  (`docs_int/tech_debt_inventory.md` — the single multi-item row enumerating all 8). */
  readonly tdRef?: string;
}

/**
 * The 14-entry static registry, CATALOGUE_REPORT.md canonical order (design §3.1's own table order —
 * NOT alphabetical, NOT LIVE-then-registry_only; matches `random_world_templates.md:24-41`'s own
 * canonical-order framing, mirrored here 1:1 against the freshly re-grepped catalogue headings).
 */
export const RANDOM_WORLD_TEMPLATE_REGISTRY: readonly RandomWorldTemplateEntry[] = [
  {
    templateId: 'sideways_failure',
    name: 'The Sideways Failure / Coupling Discovery',
    catalogueRef: 'CATALOGUE_REPORT.md:552-573',
    flag: 'loved',
    score: 4.55,
    runtime: 'live',
  },
  {
    templateId: 'hollow_at_the_corner',
    name: 'Hollow at the Corner / The Closing Over',
    catalogueRef: 'CATALOGUE_REPORT.md:574-595',
    flag: 'liked',
    score: 4.55,
    runtime: 'live',
  },
  {
    templateId: 'halgren_tannery_hailstorm',
    name: 'The Halgren Tannery Hailstorm',
    catalogueRef: 'CATALOGUE_REPORT.md:596-617',
    flag: 'liked',
    score: 4.50,
    runtime: 'live',
  },
  {
    templateId: 'quorum_on_stadler_row',
    name: 'Quorum on Stadler Row / The Threshold Block',
    catalogueRef: 'CATALOGUE_REPORT.md:618-639',
    flag: 'liked',
    score: 4.50,
    runtime: 'live',
  },
  {
    templateId: 'apparent_recovery',
    name: 'Apparent Recovery / The Halgren Bounce',
    catalogueRef: 'CATALOGUE_REPORT.md:640-661',
    flag: 'liked',
    score: 4.40,
    runtime: 'live',
  },
  {
    templateId: 'festival_misread',
    name: 'The Festival Misread',
    catalogueRef: 'CATALOGUE_REPORT.md:662-683',
    flag: 'liked',
    score: 4.30,
    runtime: 'registry_only',
    registryOnlyReason:
      'Already CONSUMED as the re-skin source for the shipped E-LO-05 launch event (template_launch_event_mapping.md:123) — its own runtime (paper-frame 4-frame distribution) needs the 04g-C press system, premature before news-beat.',
    tdRef: 'TD-246',
  },
  {
    templateId: 'permanent_residue',
    name: 'The Permanent Residue',
    catalogueRef: 'CATALOGUE_REPORT.md:684-705',
    flag: 'liked',
    score: 4.30,
    runtime: 'live',
    // TD-255 — le SEUL template qui ne se résout jamais (design §3.5.2). Exclu du cap de concurrence.
    neverResolves: true,
  },
  {
    templateId: 'absconding',
    name: 'The Absconding / Quiet Migration',
    catalogueRef: 'CATALOGUE_REPORT.md:706-727',
    flag: 'neutral',
    score: 4.55,
    runtime: 'registry_only',
    registryOnlyReason:
      'Demographic regime-shift template — requires population displacement + a per-district recruit-pool model; no honest day-1 lever.',
    tdRef: 'TD-246',
  },
  {
    templateId: 'standing_ground',
    name: 'The Standing Ground / Margate Corner',
    catalogueRef: 'CATALOGUE_REPORT.md:728-749',
    flag: 'neutral',
    score: 4.55,
    runtime: 'registry_only',
    registryOnlyReason:
      'Anchor-sites template — requires a cross-faction encounter-diversity index; substrate absent.',
    tdRef: 'TD-246',
  },
  {
    templateId: 'risk_compensation',
    name: 'Risk Compensation / Mirrored Course',
    catalogueRef: 'CATALOGUE_REPORT.md:750-771',
    flag: 'neutral',
    score: 4.50,
    runtime: 'registry_only',
    registryOnlyReason:
      'Requires a compensation budget acting on NPC behavior modes; substrate absent.',
    tdRef: 'TD-246',
  },
  {
    templateId: 'trough_cycle',
    name: 'The Trough / Cycle',
    catalogueRef: 'CATALOGUE_REPORT.md:772-793',
    flag: 'neutral',
    score: 4.50,
    runtime: 'registry_only',
    registryOnlyReason:
      'Per-district trust-in-BPD oscillator — needs the ribbon graph + a per-district trust scalar that does not exist (R2.2: never a fabricated scalar).',
    tdRef: 'TD-246',
  },
  {
    templateId: 'triage_night',
    name: 'Triage Night / The Long Triage',
    catalogueRef: 'CATALOGUE_REPORT.md:794-815',
    flag: 'neutral',
    score: 4.50,
    runtime: 'registry_only',
    registryOnlyReason:
      'Requires ≥3 overlapping incidents inside a 4-hour window — the day-1 generator granularity is NIGHTLY (D4); multi-incident intra-night is an extension.',
    tdRef: 'TD-246',
  },
  {
    templateId: 'cry_wolf_fatigue',
    name: 'Cry-Wolf Fatigue / The Quiet Beacon',
    catalogueRef: 'CATALOGUE_REPORT.md:816-837',
    flag: 'neutral',
    score: 4.45,
    runtime: 'registry_only',
    registryOnlyReason:
      'Per-district alert-credibility erosion from no-charge BPD sweeps — the "false-positive sweep outcome" producer is not cleanly queryable day-1; already consumed in INVERSION by the E-LO-09 launch event prep (mapping :75).',
    tdRef: 'TD-246',
  },
  {
    templateId: 'dialect_drift',
    name: 'The Dialect Drift / Drift on Halgren Row',
    catalogueRef: 'CATALOGUE_REPORT.md:838-863',
    flag: 'neutral',
    score: 4.35,
    runtime: 'registry_only',
    registryOnlyReason:
      'Per-boundary drift index over auto-generated MIS vocabularies — the cant-tokens substrate is absent.',
    tdRef: 'TD-246',
  },
];

const REGISTRY_BY_ID: ReadonlyMap<RandomWorldTemplateId, RandomWorldTemplateEntry> = new Map(
  RANDOM_WORLD_TEMPLATE_REGISTRY.map((entry) => [entry.templateId, entry]),
);

/**
 * Look up a template by id. Rejects (throws) any id outside the 14-entry closed domain (AC7 —
 * `RandomWorldTemplateId` is a soft-ref text column with no DB enum, D10; this is the single
 * validation gate every caller — generator, BO force-template, projection — MUST route through).
 */
export function randomWorldTemplateById(id: string): RandomWorldTemplateEntry {
  const entry = REGISTRY_BY_ID.get(id as RandomWorldTemplateId);
  if (!entry) {
    // Derived from the registry's own length (never a hardcoded restatement of it, R2.3 — the count
    // would silently drift out of sync with the array the moment an entry is added/removed).
    throw new Error(
      `Unknown RandomWorldTemplateId '${id}' — not one of the ${RANDOM_WORLD_TEMPLATE_REGISTRY.length} entries in RANDOM_WORLD_TEMPLATE_REGISTRY.`,
    );
  }
  return entry;
}

/** The 6 `runtime: 'live'` entries (design §3.1). */
export function liveRandomWorldTemplates(): readonly RandomWorldTemplateEntry[] {
  return RANDOM_WORLD_TEMPLATE_REGISTRY.filter((entry) => entry.runtime === 'live');
}

/** The 8 `runtime: 'registry_only'` entries (design §3.1, D1) — the BO
 *  `<UnmappedRandomWorldOpportunityRegistry>` (C5) data source. */
export function registryOnlyRandomWorldTemplates(): readonly RandomWorldTemplateEntry[] {
  return RANDOM_WORLD_TEMPLATE_REGISTRY.filter((entry) => entry.runtime === 'registry_only');
}

/**
 * Les `templateId` qui ne se résolvent JAMAIS — dérivés du registre, jamais redéclarés en dur.
 *
 * TD-255 (W0.2) : c'est la liste que le cap de concurrence D6 doit exclure de son comptage. Un
 * template incapable de libérer son slot ne doit pas en occuper un, sinon le cap se referme
 * définitivement au fil des accumulations et la génération d'événements meurt.
 *
 * Dérivé plutôt qu'écrit à la main pour la raison que ce fichier énonce déjà à propos de son propre
 * compte : une redéclaration dérive en silence. Poser `neverResolves: true` sur un futur template
 * suffit — aucun autre fichier n'est à toucher.
 */
export function neverResolvingRandomWorldTemplateIds(): readonly string[] {
  return RANDOM_WORLD_TEMPLATE_REGISTRY.filter((t) => t.neverResolves === true).map((t) => t.templateId);
}
