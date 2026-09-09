// IMPLEMENTS: le maillon S12-e (front.md ⑰ Precinct View) — la correspondance district → precinct
//             existait UNIQUEMENT dans une Map privée en mémoire de `PoliceMemoryService`, construite
//             au bootstrap et exposée par AUCUNE route. Chaque client devait donc la RECALCULER, et
//             deux clients qui la recalculent divergent au premier changement de découpage.
//
// ⛔ UN SEUL PRODUCTEUR. Ce fichier est la seule définition de la règle ; `PoliceMemoryService` la
//    consomme désormais au lieu de la réimplémenter, et la projection `GET /v1/world/districts`
//    la consomme aussi. Extraire sans repointer l'appelant d'origine aurait créé un SECOND
//    producteur — c'est-à-dire exactement le défaut qu'on prétend fermer, un cran plus bas.

/**
 * `districtToPrecinct(districtId, precinctCount)` — regroupement contigu de 3 districts par precinct :
 * le district `d` (1-basé) appartient au precinct `⌈d/3⌉`, borné par `precinctCount` (défensif si la
 * géographie dépasse un jour 18 districts).
 *
 * ⚠️ La borne n'est PAS cosmétique : sans elle, un 19ᵉ district produirait un precinct 7 qui n'existe
 * dans aucune ligne de `precinct_memory` (mesuré : `precinct_id` y vaut 1..6, jamais autre chose).
 */
export function districtToPrecinct(districtId: number, precinctCount: number): number {
  return Math.min(precinctCount, Math.floor((districtId - 1) / 3) + 1);
}
