// IMPLEMENTS: le maillon L1 de ㉒ (front.md) — `PUT /v1/me/meta-market/visibility` existe sous garde
//             joueur et AUCUNE projection ne rendait la valeur : un interrupteur qu'on peut basculer
//             mais pas afficher. C'est une forme F (défaillance de PROJECTION, pas d'écriture).
//
// ⛔ UN SEUL PRODUCTEUR. La règle « seul FALSE bloque » n'est pas un `!!` : la colonne est NULLABLE et
//    `NULL` signifie « prends le défaut », qui est ON. Écrire `Boolean(raw)` rendrait donc `false` pour
//    un joueur qui n'a jamais touché l'interrupteur — c'est-à-dire l'INVERSE de ce que le lecteur
//    applique. `MetaMarketReadService` consomme cette fonction au lieu de réimplémenter le test, pour
//    que l'affichage ne puisse pas diverger du comportement.

/**
 * `isMetaMarketVisible(raw)` — la visibilité EFFECTIVE depuis la colonne nullable
 * `player.meta_market_visibility_enabled` :
 *   · `false` → opt-out explicite, la seule valeur qui bloque ;
 *   · `null`  → jamais réglé ⇒ défaut du tunable ⇒ **visible** ;
 *   · `true`  → opt-in explicite ⇒ visible.
 */
export function isMetaMarketVisible(raw: boolean | null | undefined): boolean {
  return raw !== false;
}
