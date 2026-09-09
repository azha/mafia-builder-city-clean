// IMPLEMENTS: P4 item 7 — les noms de DEALERS et de ROUTES (TD-485, trouvée par le 7ᵉ parcours).
//             Tranché par délégation le 2026-09-02 (l'user a délégué la fiction le matin même),
//             `docs/superpowers/plans/2026-09-02-propositions-fiction.md` §8 — **révisable**.
//
// ⛔ POURQUOI UN PRÉNOM SEUL, ET PAS « Lt. Nom ». Les deux populations sont visibles côte à côte sur
//    les mêmes écrans. Une même grammaire les rendrait indiscernables : un dealer n'est pas un
//    lieutenant, et la FORME du nom doit porter cette différence sans qu'aucun libellé ne l'explique.
//    ⇒ Lieutenant = « Lt. Nom » (pool Sec/Estuaire) · Dealer = **prénom seul** (pool des 20 prénoms
//    du §2).
//
// ⚠️ L'HISTOIRE DE CE POOL, gardée parce qu'elle explique sa forme. En l'écrivant j'allais noter
//    « les deux pools sont disjoints par construction » — la mesure a montré que **`Rin` et `Tovah`
//    figuraient dans les DEUX**. Je n'ai pas retiré ces prénoms de moi-même : la liste venait d'une
//    ratification, et l'élaguer en silence aurait été une décision éditoriale déguisée en correctif.
//    La garde assertait donc la propriété alors VRAIE (les noms RENDUS ne collisionnent pas), et le
//    recouvrement est remonté comme arbitrage. **Tranché le 2026-09-02 : les deux sont retirés.**
//    ⇒ La disjonction est désormais RÉELLE et la garde l'asserte directement.
//
// ⚠️ MÊME hachage et MÊME sondage que `lieutenant-name-pool.ts` : le hash choisit le point de départ,
//    la sonde garantit l'unicité dans la population d'un joueur. C'est la forme qui réconcilie
//    « déterministe par id » et « unique dans le roster », qu'un hash seul ne peut pas tenir.

/**
 * Les **18** prénoms du pool des dealers — les 20 du §2 MOINS `Tovah` et `Rin`.
 * ⛔ CE RETRAIT EST UNE DÉCISION, PAS UN OUBLI. Les deux figuraient AUSSI dans le pool « Sec » des
 * lieutenants, si bien qu'un joueur pouvait avoir « Lt. Rin » et « Rin » en même temps. Le §8 d'origine
 * ne fixait que la FORME (« jamais Lt. ») et ne disait rien du recouvrement ; il a été amendé le
 * 2026-09-02 après que la mesure a montré l'intersection. ⇒ Les deux pools sont désormais DISJOINTS
 * pour de bon, et la garde peut l'asserter — ce qu'elle ne pouvait pas faire avant sans être fausse.
 */
export const PRENOMS_DEALERS = [
  'Oskar', 'Mira', 'Joran', 'Ilse', 'Dov', 'Tamsin', 'Nell', 'Pim', 'Casimir',
  'Ines', 'Teo', 'Lucía', 'Adaeze', 'Yusuf', 'Sunniva', 'Amara', 'Kofi', 'Yael',
] as const;

/** FNV-1a 32 bits — identique aux autres pools de fiction (stable dans le temps et entre machines,
 *  sensible à TOUT l'identifiant : ni la longueur, ni la somme des octets). */
function hachage(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * `prenomPourDealer(dealerId, dejaPris)` — le prénom stable de ce dealer, unique parmi ceux du joueur.
 * @param dejaPris les prénoms déjà portés par les AUTRES dealers du même joueur.
 */
export function prenomPourDealer(dealerId: string, dejaPris: ReadonlySet<string> = new Set()): string {
  const depart = hachage(dealerId) % PRENOMS_DEALERS.length;
  for (let i = 0; i < PRENOMS_DEALERS.length; i += 1) {
    const candidat = PRENOMS_DEALERS[(depart + i) % PRENOMS_DEALERS.length]!;
    if (!dejaPris.has(candidat)) return candidat;
  }
  // Au-delà de 20 dealers : on suffixe plutôt que de rendre un doublon en silence.
  let rang = 2;
  for (;;) {
    const candidat = `${PRENOMS_DEALERS[depart]} ${rang}`;
    if (!dejaPris.has(candidat)) return candidat;
    rang += 1;
  }
}
