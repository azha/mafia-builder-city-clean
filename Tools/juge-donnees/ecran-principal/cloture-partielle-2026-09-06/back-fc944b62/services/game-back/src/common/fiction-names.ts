// IMPLEMENTS: docs/superpowers/specs/2026-08-25-lot0-conventions-design.md §1 D7 (L0.5 — the fiction
//             name derivators) + §3 C0/C3.
//             -- Lot 0 "Les conventions", chunk C0 (infrastructure) — 2026-08-26 --
//
// L0.5 (D7) — a PURE derivator library: given the identifying columns a row already has (never a raw
// scalar the player shouldn't see, R2.2), return the `I18nRef` (D1) the client resolves into a display
// name. No DB CONNECTION opens from this file (C3 — `buildingTypeFromRawInt` below reads a pgEnum's
// static `.enumValues` array, a schema SHAPE, not a live query) — the CALLER (C3 for buildings; S2/S3
// for dealers/routes, per the L0.5 registry) still owns every actual READ, orders/ranks the rows, and
// passes the identifying fields in.
//
// Measured (D7, M5 r3): NEITHER buildings NOR dealers have a display name today — `district_id` is
// rendered as the bare integer client-side until `front.md` ships a resolver (indifferent to the back:
// F1, emit the key + the identifier param, the client decides how to print it).

import type { I18nRef } from './i18n-ref';
import type { BUILDING_TYPE_ORDER } from '../operational/real_estate/real-estate.service'; // r2/m2 — type-only: the ONLY use below is `typeof BUILDING_TYPE_ORDER` (a TYPE position, :25), never a value; a value import would pull `real-estate.service.ts` -> `real-estate.repository.ts` -> `db/index.ts`, which opens 2 pg Pools + a Redis client AT MODULE LOAD (measured, r2) — `import type` is erased and closes this structurally, not by relying on TS's import elision.
// C3 — a VALUE import, but a SAFE one: `db/schema/operational_chain.ts` imports only `drizzle-orm`
// (+ 2 sibling schema files) — NO `db/index.ts`, NO pool, NO Redis (verified: `district-interior.
// repository.ts` already imports this SAME symbol as a value, module-load-cheap). `buildingOperationalType
// .enumValues` is the pgEnum's own member ORDER — the ARRAY `BUILDING_TYPE_ORDER` above is contractually
// REQUIRED to match ("ORDER MUST match the pgEnum in db/schema/operational_chain.ts (verified T0)",
// `real-estate.service.ts:57`) and IS byte-identical, measured (`operational_chain.ts:28-30` — front_shop
// … specialized_lab, 12 members, same order). Reading the pgEnum's OWN array here resolves `buildings.
// building_type` (the raw FK-logical int, `city_state.ts:149`) → `FictionBuildingType` WITHOUT a 2nd
// hand-copied literal array (R9.3 — one source, the ch09 schema, never a duplicate).
import { buildingOperationalType } from '../db/schema/operational_chain';
import { enseignePour } from './building-signs'; // P4 item 3 — l'enseigne, tirée de l'id
import { prenomPourDealer } from './dealer-names'; // P4 item 7 — le prénom d'un dealer
// TD-553 (maillon 3, 2026-09-03) — type-only, comme BUILDING_TYPE_ORDER ci-dessus : `RivalKey` est un
// littéral union à 4 membres, la valeur ne traverse jamais cette frontière (le lookup ci-dessous
// indexe par STRING, jamais par ce type — voir `rivalNameRef`'s own header pour pourquoi).
import type { RivalKey } from '../operational/conflict/rival/rival-ai.types';

// ===================================================================================================
// buildingNameRef — the 5 SERVIE interfaces this lot wires (C3): BuildingOperationalProjection,
// DistrictInteriorBuildingContent, BuildingHeatProjection, ExceptionCardProjection (via lieutenant, see
// below), RosterRow.
// ===================================================================================================

/** One of the 12 canonical operational building-type strings (`BUILDING_TYPE_ORDER`, imported — NEVER
 *  recopied, R9.3: one source of truth for the enum order). */
export type FictionBuildingType = (typeof BUILDING_TYPE_ORDER)[number];

export interface BuildingNameRefParams {
  /** `FictionBuildingType` for the 12 known types — OR an opaque fallback string (`buildingTypeFromRawInt`'s
   *  own "unknown_<raw>" sentinel) for an out-of-domain raw int, which the ICU gabarit's own `other` branch
   *  (see `buildingNameRef`'s own comment) is DESIGNED to catch. Never narrowed to `FictionBuildingType`
   *  alone — see that type's caller for why (C3, measured: pre-existing E2E fixtures across this repo seed
   *  arbitrary `buildings.building_type` ints, since the column had ZERO consumer before this chunk). */
  readonly building_type: FictionBuildingType | string;
  /** A world/district identifier — an int, rendered as-is client-side until `front.md` ships a resolver
   *  (D7, indifferent to the back: F1, emit the key + the identifier). */
  readonly district_id: number;
  readonly block_id: number;
  /** 1-based ordinal, intra (player, building_type, block_id) — `rankByTypeAndBlock` below computes it. */
  readonly rank: number;
  /** P4 item 3 — l'id du bâtiment, d'où l'ENSEIGNE est tirée (hash stable). ⚠️ OPTIONNEL à dessein :
   *  les 3 sites d'appel l'ont sous la main (mesuré), mais le rendre requis casserait tout appelant
   *  futur qui projette un bâtiment sans son id — et le gabarit sait se passer d'enseigne. */
  readonly building_id?: string;
  /** P4 item 3 — le NOM du district (item 2). Optionnel : à défaut, l'entier est servi comme avant. */
  readonly district_name?: string | null;
}

/** `game.fiction.building.name` — an ICU `select` gabarit on `type` (12 branches, one per
 *  `BUILDING_TYPE_ORDER` member, + `other`) that the client resolves against `district`/`block`/`rank`. */
export function buildingNameRef(params: BuildingNameRefParams): I18nRef {
  // Le rang n'est un désambiguïsateur que si l'appelant a pu le calculer ET qu'il est > 1 : le
  // rang 1 est le cas normal (un seul bâtiment de ce type dans cet îlot), et il ne se nomme pas.
  const desambigue = params.rank > 1;
  return {
    key: desambigue ? 'game.fiction.building.name.rang' : 'game.fiction.building.name',
    // ⛔ EXACTEMENT les 3 placeholders du gabarit ratifié `{enseigne} — {district}, îlot {block}`,
    // ni plus ni moins. L'instrument de TD-457 asserte que **les params émis == les placeholders du
    // gabarit ICU** : émettre `type` ou `rank` sans les utiliser le ferait rougir, et les émettre
    // « au cas où » serait précisément le genre de params décoratifs que cette garde existe pour
    // attraper. ⚠️ `rank` sort donc de cette ref — `rankByTypeAndBlock` reste exporté pour ses autres
    // usages, mais le nom affiché ne le porte plus.
    // ⚠️ LE RANG NE SERT QU'À DÉSAMBIGUÏSER, jamais à choisir l'enseigne (approuvé le 2026-09-02).
    // Deux bâtiments du MÊME type dans le MÊME îlot tirant la MÊME enseigne (1 chance sur 6)
    // porteraient un nom identique ; `rang` n'apparaît QUE dans ce cas, et vaut alors le rang du
    // bâtiment. ⛔ Il reste ABSENT sinon — l'ajouter systématiquement collerait « n° 1 » à tous les
    // noms du jeu, et l'instrument de TD-457 exige que les params émis soient exactement les
    // placeholders du gabarit employé : c'est pourquoi la COLLISION choisit une AUTRE clé.
    params: {
      // L'enseigne est TOUJOURS émise — jamais conditionnellement : un placeholder absent casse le
      // rendu ICU, et un `enseigne` manquant est plus dangereux qu'un repli visible.
      enseigne: enseignePour(params.building_id ?? '', String(params.building_type)),
      // P4 item 2 — le NOM du district quand on l'a, l'entier sinon : la MÊME position, mieux remplie.
      district: params.district_name ?? String(params.district_id),
      block: String(params.block_id),
      ...(desambigue ? { rang: String(params.rank) } : {}),
    },
  };
}

// ===================================================================================================
// rankByTypeAndBlock — the ordinal helper `buildingNameRef.rank` above needs. A PURE "window function"
// equivalent: partitions the input by (player_id, building_type, block_id) and assigns 1-based ranks IN
// THE ORDER THE ROWS ARRIVE. The caller (C3) is responsible for that order — reading rows sorted by a
// stable chronological key (`acquired_at_tick` NULLS LAST, `building_id` as the final tie-break for
// never-stamped legacy rows, P3-E C1 mig 0132) so an EXISTING building's rank never changes when a NEW
// building of the same (type, block) is added later (epingle moteur, D7: "2ᵉ lab autre bloc ⇒ rang 1 ×2,
// nom du 1ᵉʳ inchangé ; même bloc ⇒ rang 2").
// ===================================================================================================

// r1 m6 — TWO REPRESENTATIONS of the SAME column coexist in this file, never stated together before:
// `RankableBuildingInput.building_type` below is the RAW int (`buildings.building_type integer NOT
// NULL`, `db/schema/city_state.ts:149` — a FK-logical index), while `BuildingNameRefParams.building_type`
// above is the RESOLVED string (`FictionBuildingType`, via `BUILDING_TYPE_ORDER[int]`). Both are correct
// for their own function — `rankByTypeAndBlock` partitions on the raw column a caller reads straight off
// the row (no resolution needed to group buildings), `buildingNameRef` needs the STRING branch key for
// its ICU `select` gabarit. `tsc` prevents conflating them (two distinct types) — this is a readability
// note, not a trap: the caller (C3) reads ONE row and must pass the raw int here, the resolved string
// there (`BUILDING_TYPE_ORDER[row.building_type]`).
export interface RankableBuildingInput {
  readonly building_id: string;
  readonly player_id: string;
  readonly building_type: number;
  readonly block_id: number;
}

/** Returns a map `building_id → 1-based rank`, ordinal intra (player_id, building_type, block_id), in
 *  the INPUT order (the caller orders `buildings` by acquisition — see file header). Buildings in
 *  DIFFERENT (player, type, block) partitions never share a counter — a 2nd `lab` in another block ranks
 *  1, not 2 (D7's own epingle). */
export function rankByTypeAndBlock(buildings: readonly RankableBuildingInput[]): ReadonlyMap<string, number> {
  const counters = new Map<string, number>();
  const ranks = new Map<string, number>();
  for (const b of buildings) {
    const partitionKey = `${b.player_id}:${b.building_type}:${b.block_id}`;
    const next = (counters.get(partitionKey) ?? 0) + 1;
    counters.set(partitionKey, next);
    ranks.set(b.building_id, next);
  }
  return ranks;
}

/**
 * C3 — resolves `buildings.building_type` (the RAW FK-logical int every caller reads straight off the
 * row, `RankableBuildingInput.building_type` above) → `FictionBuildingType` (the STRING `buildingNameRef`
 * needs for its ICU `select` branch key), via the pgEnum's own `.enumValues` (see the import comment
 * above — byte-identical to `BUILDING_TYPE_ORDER`, never a 2nd copy).
 *
 * ⚠️ NEVER THROWS (r1-C3, measured — a real 500 in production evidence): a first version of this function
 * threw on an out-of-range int, reasoning that `buildings.building_type` NOT NULL always holds a value
 * `purchase()` derived FROM this same array. Measured FALSE on a scoped E2E run: `operational_heat.spec.ts`
 * (and, by the same convention, other pre-existing fixtures) SQL-seeds a building directly with an
 * ARBITRARY `building_type` int (11, 12, …) that was NEVER validated against `BUILDING_TYPE_ORDER`'s
 * domain, because before this chunk NOTHING read the column for buildings outside the real purchase()
 * flow — the throw turned a semantically-irrelevant test placeholder into a hard 500 on `GET .../heat`,
 * `.../interior`, and `.../building/:id` alike. The ICU gabarit `buildingNameRef` builds already has an
 * `other` branch for EXACTLY this case (its own docstring: "12 branches … + other") — so an out-of-range
 * int degrades to an opaque `unknown_<raw>` sentinel (never one of the 12 real names, always distinct per
 * raw value so two different out-of-range types never collide) instead of crashing the whole response.
 */
export function buildingTypeFromRawInt(raw: number): FictionBuildingType | string {
  return buildingOperationalType.enumValues[raw] ?? `unknown_${raw}`;
}

// ===================================================================================================
// dealerNameRef / routeNameRef — NOT wired by this lot (D7's registry routes `DealerProjection` → S2,
// `RouteLifecycleBands` / the card's `route_id`/`leg_id` → S3): built here so the CONVENTION is one
// source, not reinvented per future lot (D7 header: "une TABLE DE NOMS pour la fiction — bâtiments et
// dealers n'en ont aucune"). PARAMETER SHAPE IS NOT SPECIFIED BY THE DESIGN beyond `routeNameRef`'s key
// literal (`game.fiction.route.named`, cited verbatim at D3's `FALLBACK_EN_KEYS` — the only place a
// future lot's key is named before that lot exists) — the district/block/rank shape below MIRRORS
// `buildingNameRef` for consistency; S2/S3 measure their own identifying columns at their turn and may
// need to adjust this shape (consigned, `implementation-notes.md` §Deviations — this is not a decision
// C0 is positioned to make with evidence, since neither consumer exists yet).
// ===================================================================================================

export interface DealerNameRefParams {
  /** P4 item 7 — l'id du dealer, d'où le PRÉNOM est tiré (hash stable, comme les lieutenants). */
  readonly dealer_id: string;
  /** Les prénoms déjà portés par les AUTRES dealers du même joueur — l'unicité se calcule à
   *  population donnée, exactement comme le roster des lieutenants. */
  readonly dejaPris?: ReadonlySet<string>;
}

/**
 * `game.fiction.dealer.name` — P4 item 7 (§8, tranché par délégation le 2026-09-02) : un dealer porte
 * un **PRÉNOM SEUL**, jamais « Lt. » — la FORME du nom distingue un dealer d'un lieutenant sans
 * qu'aucun libellé ne l'explique.
 * ⛔ Les params émis sont EXACTEMENT le placeholder du gabarit (`{prenom}`) — l'instrument de TD-457
 * asserte cette égalité, et `district`/`block`/`rank` en sortent : ils n'étaient utilisés par aucun
 * gabarit (la clé n'était servie nulle part, TD-485 : 0 consommateur).
 */
export function dealerNameRef(params: DealerNameRefParams): I18nRef {
  return {
    key: 'game.fiction.dealer.name',
    params: { prenom: prenomPourDealer(params.dealer_id, params.dejaPris) },
  };
}

export interface RouteNameRefParams {
  readonly rank: number;
  /** P4 item 7 — les noms des districts d'EXTRÉMITÉ, quand l'appelant les a. Absents ⇒ repli indexé. */
  readonly district_depart?: string | null;
  readonly district_arrivee?: string | null;
}

/** `game.fiction.route.named` (key literal FIXED by D3's `FALLBACK_EN_KEYS` — EN==FR is allowed for it,
 *  same passe-plat family as `game.i18n.legacy.text`: an identifier-style label, not prose to translate).
 *  A route spans two buildings/blocks (`origin_building_id`/`destination_building_id`) — no single
 *  `block_id` applies the way it does to a building or a dealer's home spot, so this only takes the
 *  ordinal; S3 (route/leg naming inside a card, D7's registry) measures whatever partition it actually
 *  needs and may widen this signature. */
export function routeNameRef(params: RouteNameRefParams): I18nRef {
  // P4 item 7 (§8) — « {départ} → {arrivée} » quand les DEUX extrémités sont servies, « Route {index} »
  // sinon. ⛔ DEUX CLÉS et non un param optionnel : l'instrument de TD-457 exige que les params émis
  // soient exactement les placeholders du gabarit employé, donc une route sans extrémités ne peut pas
  // porter des params vides — elle change de gabarit.
  if (params.district_depart && params.district_arrivee) {
    return {
      key: 'game.fiction.route.named',
      params: { depart: params.district_depart, arrivee: params.district_arrivee },
    };
  }
  return { key: 'game.fiction.route.indexed', params: { index: String(params.rank) } };
}

// ===================================================================================================
// rivalNameRef — TD-553 (maillon 3, chantier "les maillons back des écrans neufs", 2026-09-03). Wired
// this lot into `EngagementView` (`combat.service.ts` — `GET/POST /v1/me/engagements`), the ONLY
// player-facing controller in `operational/conflict/*` (measured: `find` on `*.controller.ts` under
// that tree returns exactly ONE non-admin, non-`_test` hit — `engagements.controller.ts`). Before
// this maillon, the back served the 4 rival factions as bare enum KEYS (`coil`/`tarcum`/
// `iron_throat`/`saltline`, `db/schema/conflict_rival.ts:66-71`) with NO display name anywhere —
// écran ㉙ recopied the maquette's French labels as CLIENT-SIDE literals, exactly the "un littéral,
// jamais un nom sorti du back" trap this dépôt's naming convention exists to close (see
// `buildingNameRef`/`dealerNameRef`/`routeNameRef` above).
//
// UNLIKE those three: the 4 rival factions are a CLOSED, CANON-NAMED domain — nothing is DERIVED
// (no hash, no per-instance data, no rank). Each key maps to exactly ONE fixed proper noun, so this
// mirrors `dealerNameRef`'s shape (a `'{param}'` passthrough template — the whole name IS the param)
// rather than `buildingNameRef`'s ICU-select-by-type shape, which needs a branch to select.
// ===================================================================================================

/**
 * The FR display name per rival key — an ASSUMED, SOURCED choice (measured: 0 hits on
 * `rivalNameRef`/`game.fiction.rival` anywhere in this repo before this maillon — no back-owned
 * runtime table carried these). TWO INDEPENDENT SOURCES AGREE:
 *   1. The maquette the user ratified for écran ㉙ (cadres 63-66, série 6) — "La Coil", "Tarcum",
 *      "Gorge-de-Fer", "Saltline" — copy a player has already SEEN and approved.
 *   2. GDD canon (`projects/mafia_city_game/gdd/15_glossary.md` §Rivals: `"The Coil" / "Tarcum
 *      Brothers" / "Iron Throat" / "Saltline"`, `docs/tech/02_fictional_world/rival_{coil,tarcum,
 *      iron_throat,saltline}.md`) — ENGLISH ONLY, no FR rendering specified there (this repo's own
 *      posture: "le jeu est en français", choix 5A). "Gorge-de-Fer" is a FAITHFUL TRANSLATION of
 *      canon "Iron Throat" (gorge=throat, fer=iron) — not a transliteration of the `iron_throat`
 *      key — and the glossary itself sanctions the shorter casual forms the maquette uses ("'Coil'
 *      or 'Tarcum' alone is acceptable in casual prose", `15_glossary.md` §Rivals).
 * These 4 strings are chosen, not invented, and this comment is their source.
 *
 * `Readonly<Record<RivalKey, string>>` (not a plain object): TS enforces all 4 members present at
 * this declaration — a 5th `rival_key` pgEnum member added upstream is a COMPILE error here, never
 * a silent gap (the resolveur-exhaustif pattern; the ⚠️ caveat is scope, see `rivalNameRef` below —
 * this catches a TYPE change, never a DATA change, CLAUDE.md's own distinction).
 */
const RIVAL_DISPLAY_NAME: Readonly<Record<RivalKey, string>> = {
  coil: 'La Coil',
  tarcum: 'Tarcum',
  iron_throat: 'Gorge-de-Fer',
  saltline: 'Saltline',
};

/**
 * `game.fiction.rival.name` — the closed 4-key rival roster's display name. Takes a plain `string`
 * (not `RivalKey`) so the CALLER never needs a cast: `combat_event.target_rival_key` IS a native
 * Postgres `rival_key` enum column (`conflict_combat.ts:156`, `.notNull()`) — the DB itself cannot
 * hold an out-of-domain value — but this function stays defensive anyway, the SAME "never throws,
 * `unknown_<raw>` sentinel" posture `buildingTypeFromRawInt` documents above: a lookup miss degrades
 * to an opaque, distinct-per-value fallback instead of crashing the whole response. NO new list
 * declared (DF-11) — `RIVAL_DISPLAY_NAME` above is both the source of truth AND the domain check.
 */
export function rivalNameRef(rivalKey: string): I18nRef {
  const nom = Object.prototype.hasOwnProperty.call(RIVAL_DISPLAY_NAME, rivalKey)
    ? (RIVAL_DISPLAY_NAME as Readonly<Record<string, string>>)[rivalKey]
    : `unknown_${rivalKey}`;
  // ⚠️ `{ nom: nom }` EXPLICITE, jamais le raccourci ES6 `{ nom }` : mesuré, l'instrument de TD-457
  // (`_emitted-keys-sweep.py`, motif `([A-Za-z_][A-Za-z0-9_]*)\s*:`) exige un DEUX-POINTS après le
  // nom de champ pour compter un param — le raccourci rendait `game.fiction.rival.name []` (zéro
  // param détecté) alors que le gabarit en attend un. `dealerNameRef`/`routeNameRef` au-dessus
  // écrivent déjà tous en forme explicite ; ceci s'aligne, pas une exception.
  return { key: 'game.fiction.rival.name', params: { nom: nom } };
}
