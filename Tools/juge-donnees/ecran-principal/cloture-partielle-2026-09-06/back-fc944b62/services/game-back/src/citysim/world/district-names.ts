// IMPLEMENTS: CHANTIER P4 item 2 — les 18 districts ont un NOM.
//             Ratifié par l'user le 2026-09-02 (« on prend toutes tes reco »),
//             `docs/superpowers/plans/2026-09-02-propositions-fiction.md` §CHOISI, choix **4B**.
//             Le canon disait « invent at art-bible time » ; c'est fait, et ces 18 noms sont le canon.
//
// ⛔ ADDITIF : `name_canonical` (« Tidewater-1 ») NE BOUGE PAS. Il est l'identité de travail, cité
//    dans des specs et des documents ; le remplacer casserait ce qui l'asserte. `name` s'ajoute À
//    CÔTÉ, et c'est lui que le joueur lit.
//
// ⛔ PAS DE MIGRATION, ET C'EST DÉLIBÉRÉ : la géographie est IMMUABLE (18 lignes semées une fois,
//    jamais écrites par le jeu) et la projection synthétise déjà `control_state` de la même façon.
//    Persister 18 noms constants coûterait une migration, un backfill et une source de vérité de
//    plus, pour une donnée qui ne varie ni par joueur ni dans le temps. ⇒ R9.3 n'est pas en cause :
//    rien de neuf n'est persisté.
//
// ✅ Les 18 noms sont passés au master regex R4.1 de `forbidden_tropes.md` (lu DEPUIS le document,
//    jamais recopié) : **0 hit**, contrôle positif vert sur la même invocation.

/** Le nom de fiction, par `districts.id` (1..18). L'ordre suit les profils du canon : les 3 Tidewater,
 *  les 4 Spine, les 3 Lattice, les 2 Stack, les 3 Glass, les 3 Verge — vérifié contre la table. */
const NOMS_PAR_ID: Readonly<Record<number, string>> = {
  1: 'Les Bassins',      2: 'Quai-Nord',         3: 'Sarnes',
  4: 'La Colonne',       5: 'Hautes-Marches',    6: 'Verrier',        7: 'Saint-Brand',
  8: 'Le Treillis',      9: 'Marne-Basse',      10: 'Orsel',
  11: 'Les Entrepôts',  12: 'Dépôt-Est',
  13: 'Le Verre',       14: 'Place des Comptes', 15: 'La Chancellerie',
  16: 'La Lisière',     17: 'Les Friches',      18: 'Pont-Gris',
};

/** Le compte attendu — une garde de COMPLÉTUDE, pas une décoration : si la géographie gagne un
 *  district, `nomDeDistrict` rendra `null` pour lui et la projection servira `name_canonical`, ce que
 *  le test de complétude fait rougir plutôt que de laisser passer un district sans nom. */
export const NOMBRE_DE_DISTRICTS_NOMMES = 18;

/**
 * `nomDeDistrict(id)` — le nom de fiction, ou `null` si l'id n'est pas nommé.
 * ⚠️ Rendre `null` plutôt qu'une chaîne vide : la projection doit pouvoir RETOMBER sur
 * `name_canonical`, et une chaîne vide se serait affichée comme un nom manquant côté client.
 */
export function nomDeDistrict(id: number): string | null {
  return NOMS_PAR_ID[id] ?? null;
}

/** Les ids nommés, pour les gardes de complétude. */
export function idsNommes(): readonly number[] {
  return Object.keys(NOMS_PAR_ID).map(Number);
}
