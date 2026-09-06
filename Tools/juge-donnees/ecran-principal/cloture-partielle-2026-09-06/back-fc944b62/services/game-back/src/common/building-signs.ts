// IMPLEMENTS: CHANTIER P4 item 3 — les ENSEIGNES des bâtiments.
//             Ratifié par l'user le 2026-09-02 (« on prend toutes tes reco »),
//             `docs/superpowers/plans/2026-09-02-propositions-fiction.md` §CHOISI, choix **3A** :
//             6 enseignes par type, nom = `{enseigne} — {district}, îlot {block}`, enseigne choisie
//             par hash de `building_id`.
//
// ⛔ POURQUOI LE HASH PORTE SUR `building_id` ET PAS SUR LE RANG. Le rang (`rankByTypeAndBlock`) est
//    RELATIF aux voisins : il change quand un bâtiment du même type apparaît dans le même îlot. Une
//    enseigne indexée sur lui **changerait de nom** au fil des acquisitions — un bâtiment que le
//    joueur connaît sous « Pressing Varne » deviendrait « Laverie du Quai » sans que rien ne l'ait
//    touché. L'id, lui, est immuable. ⇒ Le rang reste dans le gabarit pour DÉSAMBIGUÏSER deux
//    bâtiments qui tirent la même enseigne, jamais pour la choisir.
//
// ⚠️ 6 enseignes pour 12 types = 72 chaînes, et ce sont des NOMS PROPRES de fiction : elles ne se
//    traduisent pas. Elles voyagent donc en `params` de l'`I18nRef`, pas comme des clés à traduire —
//    c'est le gabarit `game.fiction.building.name` qui porte la seule partie traduisible (« îlot »).

import { buildingOperationalType } from '../db/schema/operational_chain';

/** Les 6 enseignes par type — les 3 du §3A puis les 3 du complément, dans l'ordre du document ratifié.
 *  ⛔ Les clés sont les 12 membres du pgEnum `building_operational_type`, jamais une liste réécrite :
 *  une divergence d'orthographe donnerait un type sans enseigne, et le repli est silencieux. */
const ENSEIGNES: Readonly<Record<string, readonly string[]>> = {
  front_shop:        ['Pressing Varne', 'Tabac-Presse Kest', 'Laverie du Quai', 'Photo Ilm', 'Clés-Minute Rook', 'Cordonnerie Sarre'],
  cash_safehouse:    ['Garde-meubles Sallo', 'Consigne de la Threnny', 'Box Halde', 'Entrepôt Wend', 'Garde Quist', 'Dépôt Oster'],
  stash:             ['Cave Marr', 'Réserve Nock', 'Remise du 3', 'Débarras Nock', 'Réserve Ferrand', 'Cellier Marrek'],
  lab:               ['Atelier Vesk', 'Ferblanterie Tull', 'Réparation Ilm', 'Mécanique Skeld', 'Soudure Varne', 'Outillage Halde'],
  grow_house:        ['Serres Brasse', 'Jardinerie Oster', 'Pépinière du Verre', 'Fleurs Kaldor', 'Serres du Treillis', 'Horticulture Tegg'],
  refinery:          ['Distillerie Dorne', 'Traitement Quist', 'Filtration Kane', 'Épuration Brenn', 'Traitement des eaux Dorn', 'Recyclage Ruel'],
  press_house:       ['Imprimerie Skeld', 'Presse Rook', 'Reprographie Wend', 'Sérigraphie Oduya', 'Étiquettes Adaeze', 'Papeterie Yusuf'],
  distribution_hub:  ['Messagerie Sarre', 'Transit Marrek', 'Coursiers Ferrand', 'Fret Sunniva', 'Livraisons Amara', 'Colis Kofi'],
  office:            ['Cabinet Kaldor', 'Agence Tegg', 'Comptoir Brenn', 'Conseil Yael', 'Gestion Tovah', 'Études Kest'],
  dealer_spot_front: ['Kiosque Dorn', 'Snack Ruel', 'Salle de jeux Oduya', 'Café du Quai', 'Billard Marr', 'Épicerie de nuit Vesk'],
  money_holding:     ['Change Voss', 'Crédit Hara', 'Caisse Rin', 'Prêts Dorne', 'Épargne Sallo', 'Change du Verre'],
  specialized_lab:   ['Laboratoire Tovah', 'Analyses Kest', 'Chimie fine Halde', 'Contrôle Brasse', 'Mesures Tull', 'Optique Rin'],
};

/** Le repli d'un type HORS DOMAINE (`buildingTypeFromRawInt` rend `unknown_<n>` pour un int inconnu —
 *  mesuré : des fixtures sèment des `building_type` arbitraires). Jamais une chaîne vide : le client
 *  afficherait un blanc là où il attend un nom. */
const ENSEIGNE_INCONNUE = 'Local sans enseigne';

/** Le nombre d'enseignes attendu par type — garde de COMPLÉTUDE (voir la spec dédiée). */
export const ENSEIGNES_PAR_TYPE = 6;

/** Les 12 types du pgEnum, pour les gardes de complétude — lus depuis le schéma, jamais recopiés. */
export const TYPES_AVEC_ENSEIGNES: readonly string[] = buildingOperationalType.enumValues;

/** FNV-1a 32 bits — MÊME fonction que le pool de noms de lieutenants, pour la même raison : stable
 *  dans le temps et entre machines, et sensible à TOUT l'identifiant (ni la longueur, ni la somme). */
function hachage(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * `enseignePour(buildingId, buildingType)` — l'enseigne stable de ce bâtiment.
 * Un type hors domaine rend `ENSEIGNE_INCONNUE` plutôt que de jeter : cette fonction est sur un
 * chemin de PROJECTION, et une exception y transformerait un nom manquant en écran vide.
 */
export function enseignePour(buildingId: string, buildingType: string): string {
  const liste = ENSEIGNES[buildingType];
  if (!liste || liste.length === 0) return ENSEIGNE_INCONNUE;
  // Un id vide (appelant sans `building_id`) donnerait toujours la MÊME enseigne — un biais muet.
  // On rend le repli VISIBLE plutôt que de laisser tout un type porter « Pressing Varne ».
  if (buildingId === '') return ENSEIGNE_INCONNUE;
  return liste[hachage(buildingId) % liste.length]!;
}

/** Les enseignes d'un type, pour les gardes (unicité, complétude). */
export function enseignesDuType(buildingType: string): readonly string[] {
  return ENSEIGNES[buildingType] ?? [];
}
