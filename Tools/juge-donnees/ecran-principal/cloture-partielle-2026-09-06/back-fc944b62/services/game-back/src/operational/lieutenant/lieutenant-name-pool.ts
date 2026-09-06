// IMPLEMENTS: CHANTIER P4 item 1 — la fiction des noms de lieutenants.
//             Ratifié par l'user le 2026-09-02 10:25 (« on prend toutes tes reco »),
//             `docs/superpowers/plans/2026-09-02-propositions-fiction.md` §CHOISI, choix **2**.
//             Ferme TD-046 : `lieutenant.service.ts` écrivait la constante `'Lieutenant'` — mesuré
//             le 2026-09-02 : **19 068 lignes sur 19 544 portaient ce placeholder**, et le corpus
//             entier ne comptait que **4 noms distincts**.
//
// ⛔ DEUX EXIGENCES QUI SE CONTREDISENT EN APPARENCE, et la façon dont elles sont réconciliées :
//   · « attribution DÉTERMINISTE par `lieutenant_id` » — le même id doit toujours donner le même nom,
//     sans état ni migration ;
//   · « UNIQUE dans le roster d'un joueur » — deux lieutenants d'un même joueur ne peuvent pas
//     partager un nom.
// Un hash seul ne peut pas garantir l'unicité (deux ids peuvent tomber sur le même index). La forme
// retenue : le hash choisit le POINT DE DÉPART, puis on avance dans la séquence des 24 noms en
// sautant ceux que le roster porte déjà. ⇒ déterministe **à roster donné**, et unique par
// construction. Le nom d'un lieutenant existant ne change jamais : on ne recalcule que les neufs.
//
// ⚠️ Mesuré avant d'écrire : le plus gros roster du dépôt compte **5** lieutenants, pour 24 noms —
// le débordement est donc théorique aujourd'hui, mais il est traité, et le comportement au-delà de
// 24 est explicite (suffixe numérique) plutôt que laissé à une collision silencieuse.

/**
 * Le placeholder historique (TD-046). ⚠️ Il reste NÉCESSAIRE : il est le DISCRIMINANT qui distingue
 * « ce lieutenant attend un nom de fiction » de « l'appelant a fourni un vrai nom » (des fixtures en
 * portent). Le supprimer ferait renommer des lieutenants que des specs assertent nommément.
 */
export const PLACEHOLDER_NOM_LIEUTENANT = 'Lieutenant';

/** Pool « Sec » — la signature Brennar (choix 2, les 12 premiers servis). */
export const POOL_SEC = [
  'Hara', 'Rin', 'Voss', 'Kane', 'Tovah', 'Marr',
  'Vesk', 'Dorne', 'Sallo', 'Tull', 'Brasse', 'Kest',
] as const;

/** Pool « Estuaire » — le DÉBORDEMENT, servi seulement quand un roster dépasse 12. */
export const POOL_ESTUAIRE = [
  'Halde', 'Skeld', 'Varne', 'Marrek', 'Rook', 'Sarre',
  'Wend', 'Quist', 'Oster', 'Nock', 'Ferrand', 'Ilm',
] as const;

/** La séquence servie, dans l'ordre : Sec d'abord, Estuaire en débordement. */
export const NOMS_LIEUTENANTS: readonly string[] = [...POOL_SEC, ...POOL_ESTUAIRE];

/** Le préfixe de la forme canon « Lt. Nom ». `lieutenant.name` est un `varchar(64)` — mesuré ; le
 *  plus long nom servi fait 11 caractères préfixe compris, donc aucune troncature possible. */
const PREFIXE = 'Lt. ';

/**
 * Hash déterministe et STABLE d'un identifiant vers un entier positif (FNV-1a 32 bits).
 * ⛔ Pas `Math.random`, pas `Date.now` : le même `lieutenant_id` doit rendre le même index dans dix
 * ans et sur toute machine. Pas non plus la longueur ni la somme des octets — deux ids de même
 * longueur tomberaient au même endroit.
 */
function hachage(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * `nomPourLieutenant(lieutenantId, nomsDejaPris)` — la forme servie « Lt. Nom ».
 *
 * @param nomsDejaPris les noms COMPLETS (« Lt. Hara ») déjà portés par le roster de ce joueur.
 *        Passer un ensemble vide donne le nom de départ du hash, sans sondage.
 */
export function nomPourLieutenant(lieutenantId: string, nomsDejaPris: ReadonlySet<string> = new Set()): string {
  const depart = hachage(lieutenantId) % NOMS_LIEUTENANTS.length;
  for (let i = 0; i < NOMS_LIEUTENANTS.length; i += 1) {
    const candidat = `${PREFIXE}${NOMS_LIEUTENANTS[(depart + i) % NOMS_LIEUTENANTS.length]}`;
    if (!nomsDejaPris.has(candidat)) return candidat;
  }
  // Roster de plus de 24 : on suffixe plutôt que de rendre un doublon en silence. Le suffixe repart
  // du nom de DÉPART pour rester déterministe, et il ne peut pas dépasser le varchar(64).
  let rang = 2;
  for (;;) {
    const candidat = `${PREFIXE}${NOMS_LIEUTENANTS[depart]} ${rang}`;
    if (!nomsDejaPris.has(candidat)) return candidat;
    rang += 1;
  }
}
