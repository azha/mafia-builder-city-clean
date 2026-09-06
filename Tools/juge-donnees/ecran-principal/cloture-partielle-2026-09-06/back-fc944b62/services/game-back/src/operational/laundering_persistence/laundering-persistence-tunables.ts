// IMPLEMENTS: docs/tech/09_data_model/schema_pipeline_and_laundering.md §11-12 (les tunables du canon)
//             + projects/mafia_city_game/gdd/14_tunable_constants.md (le registre)
//             -- LOT PLANQUE C1 -- 2026-08-31 --
//
// Les tunables que l'écrivain de `safehouses` CONSOMME. R2.3 : aucune valeur de balance en dur, la
// résolution vit dans le module de l'écrivain — JAMAIS dans `erlang-stash-tunables.ts`, dont l'en-tête
// déclare délibérément `slot_count_C` / `slot_capacity_S_cents` NON résolus « parce que le tick lit la
// valeur PAR LIGNE ». Cette prose reste VRAIE après ce lot : elle désigne déjà le flux de BUILD comme
// leur consommateur légitime, et ce lot EST ce flux. (Une revue ⊥ a demandé de l'amender ; une autre a
// réfuté la demande, en la relisant à la source. La rétractation est la bonne.)
//
// ⛔ LE PIÈGE DU SÉPARATEUR, mesuré avant d'écrire une ligne : le registre porte `top-down` (TRAIT
// D'UNION) et le `pgEnum` de la colonne porte `top_down` (TIRET BAS). Écrire la valeur du tunable
// telle quelle dans la colonne VIOLE la contrainte. C'est le précédent `delegation_state` du socle —
// une valeur d'enum recopiée de design en design, jamais vérifiée avant que du code ne touche la
// contrainte. La correspondance ci-dessous est donc EXHAUSTIVE, et une valeur inconnue JETTE.

import { TunablesStore } from '../../config/tunables-store';

/** Les membres du `pgEnum('raid_drain_policy', …)` — la seule vérité de la colonne. */
export type RaidDrainPolicyMember = 'top_down' | 'random' | 'bottom_up';

/**
 * Traduit la valeur du REGISTRE (séparateur `-`) vers le membre d'ENUM (séparateur `_`).
 * ⛔ Exhaustive et sans `default` silencieux : une valeur inconnue JETTE, plutôt que d'écrire une
 * chaîne que la contrainte refusera à l'insertion — un `default` transformerait une faute de registre
 * en violation de contrainte à l'exécution, loin de sa cause.
 *
 * ⚠️ CHANGEMENT DE RAYON (mineur m3, revue ⊥ r1) : son seul appelant (`createSafehouse`) tourne
 * DANS la transaction du grant, appelée depuis `signup` (`auth.service.ts`) ET depuis le seam de
 * réparation de `session/open` (C6) — jamais depuis une simple LECTURE. Un registre mal écrit ne
 * jette donc plus dans un contexte de PROJECTION inoffensif : il fait échouer TOUTE la transaction
 * du grant (buildings + roster + safehouse, tout roule en arrière). Mesuré : `signup()` capture
 * cette exception dans son propre `try/catch` (`WELCOME_GRANT_REPAIR_FAILED`) et rend quand même
 * 201 — la création de COMPTE ne casse pas — mais le joueur reste SANS grant, silencieusement, et
 * le seam de réparation de `session/open` retombera sur la MÊME valeur mal écrite à chaque tentative
 * tant qu'un opérateur ne corrige pas le registre. Consigné en déviation (implementation-notes.md),
 * pas de TD ouverte ici (une plage d'ids doit être demandée à la session d'orchestration, socle
 * "plages d'ids" — jamais un id `max+1` deviné dans une branche isolée).
 */
export function raidDrainPolicyMember(registryValue: string): RaidDrainPolicyMember {
  switch (registryValue) {
    case 'top-down':
    case 'top_down':
      return 'top_down';
    case 'random':
      return 'random';
    case 'bottom-up':
    case 'bottom_up':
      return 'bottom_up';
    default:
      throw new Error(
        `raid_drain_order_default = "${registryValue}" n'est pas un membre de raid_drain_policy ` +
          `(top_down | random | bottom_up). Le registre porte le séparateur "-", la colonne "_" : ` +
          `toute valeur neuve doit être ajoutée ICI, jamais écrite directement dans la colonne.`,
      );
  }
}

/**
 * Les tunables de l'écrivain. ⚠️ Ce lot est leur PREMIER consommateur — `slot_count_C` et
 * `slot_capacity_S_cents` n'étaient résolus nulle part (mesuré : 0 site), et le cap non plus.
 *
 * ⚠️ MÊME CLASSE QUE `raidDrainPolicyMember` (mineur m4, revue ⊥ r1) : `slot_count` et
 * `slot_capacity_cents` portent chacun une contrainte `CHECK (… > 0)` en base
 * (`sh_slot_count_chk`, `sh_slot_capacity_chk` — migration 0006). `TunablesStore.resolveInt` ne
 * borne PAS sa valeur de retour aux plages documentées ci-dessous (elles sont descriptives, pas
 * appliquées) : un registre ou un env var mis à `0` (ou négatif) fait donc violer la contrainte
 * PAR L'INSERT de `createSafehouse`, DANS la transaction du grant — même conséquence mesurée que
 * pour `raidDrainPolicyMember` : le grant entier roule en arrière, `signup` le capture et rend
 * quand même 201 (compte + session valides), et le joueur reste sans planque ni bâtiments jusqu'à
 * ce qu'un opérateur corrige la valeur. Consigné en déviation (implementation-notes.md), pas de TD
 * ouverte ici (plage d'ids à demander à la session d'orchestration).
 */
export const laundringPersistenceTunables = {
  /** T.city.slot_count_C — le nombre de slots C (paramètre Erlang-B), plage 1..12. */
  get slotCount(): number {
    return TunablesStore.resolveInt('T.city.slot_count_C', 'CITY_SLOT_COUNT_C', 4);
  },
  /** T.city.slot_capacity_S_cents — la capacité par slot en cents, plage 1000..100000. */
  get slotCapacityCents(): number {
    return TunablesStore.resolveInt('T.city.slot_capacity_S_cents', 'CITY_SLOT_CAPACITY_S_CENTS', 10000);
  },
  /** T.city.raid_drain_order_default — la politique de drainage par défaut (valeur de REGISTRE, à traduire). */
  get raidDrainOrderDefault(): string {
    return TunablesStore.resolveString('T.city.raid_drain_order_default', 'RAID_DRAIN_ORDER_DEFAULT', 'top-down');
  },
  /**
   * T.db.pipeline.safehouses_cap_per_player — cap applicatif SOFT (50, plage 10..200). Le canon nomme
   * `LaunderingPersistenceService.createSafehouse()` comme son `used_by` : ce lot en est le premier
   * consommateur. SOFT ⇒ au plafond, l'écrivain ne crée rien et ne JETTE PAS (voir le service).
   */
  get safehousesCapPerPlayer(): number {
    return TunablesStore.resolveInt('T.db.pipeline.safehouses_cap_per_player', 'DB_PIPELINE_SAFEHOUSES_CAP_PER_PLAYER', 50);
  },
};
