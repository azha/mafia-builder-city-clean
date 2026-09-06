# Le casting — 60 pièces livrées (2026-09-06)

**Direction validée par l'user** : « ça c'est mieux » sur le registre **Sopranos / The Wire** — des gens
ordinaires en vêtements ordinaires, **jamais** le costume-cravate. Ère fin 80 – début 90, pays
indéterminé. Postérisation aux 4 encres du canon sur l'aplat `#161c2b` imposé après coup.

## Ce qui est livré

| lot | compte | clé |
|---|---|---|
| lieutenants | **24** — les 24 noms RÉELS de `lieutenant-name-pool.ts` | le **NOM**, jamais l'archétype |
| dealers | **18** — les 18 prénoms de `dealer-names.ts` | prénom seul, jamais « Lt. » |
| Le Don | 1 | le joueur, tête nue, délibérément quelconque |
| frères Tarcum | 1 (deux visages dans le cadre) | le seul rival que le canon dote de visages, et au pluriel |
| opérateur de Gorge-de-Fer | 1 | « il n'y a pas de frères Iron Throat, il y a des opérateurs » |
| marque de La Coil | 1 (**un objet, pas un visage**) | « pas de visage, pas de boss charismatique » — le vide EST la caractérisation |
| avocats | **14** — le pool `lawyer-name-pool.ts`, forme « Maître X » |
| Saltline | **0** | « n'est pas une organisation » — réemploi de la silhouette `UNKNOWN` |

⚠️ **Le pool réel compte 24 noms, pas 48.** Le passage à 48 est un plan, pas du code : les 24 noms
supplémentaires n'existent nulle part. Les générer aurait été **inventer des noms** ; c'est un lot back
(étendre le pool) qui doit précéder, sinon les portraits n'ont personne à qui appartenir.
**Les avocats : 14, pas 3** — ruling user « personnages nommés », et la mesure corrige le compte.
`hire` n'a **aucun plafond par joueur** : nommer par RANG rendrait trois avocats boutique indiscernables.
Le back a écrit aujourd'hui `operational/legal/lawyer-name-pool.ts` — **14 patronymes** (Aldane, Berrow,
Calvane, Tessall, Estave, Farring, Gallow, Hestrom, Ivane, Kelmar, Lorbec, Meridan, Norwan, Prevast),
forme « **Maître X** », attribués par hash + sondage d'unicité comme les deux autres pools, intersection
vide avec les 42 noms existants et une garde qui l'asserte sur les 4 pools. Le portrait suivant le NOM,
il en faut donc **14**, produits ici.
★ Registre des avocats, et c'est une nuance du ruling : le costume n'est pas interdit chez EUX — un
avocat commis d'office en costume froissé EST le registre de ces séries. Ce qui est interdit, c'est
l'élégance : rien de coupé, rien de cher, cravates dénouées, vestes fatiguées.

## Ce que la garde de vision a mesuré, et ce que ça a changé

Contrôles du lot exécutés d'abord à chaque passage (positif « yes », négatif « no »).

**Le registre** — « costume + cravate ? » : **avant** oui / oui / oui · **après** non / non / non.
La bascule demandée par l'user est mesurée, pas affirmée.

**Les emblèmes personnels** — 6 vérifiés sur le premier lot : cicatrice traversante ✓, dent en or ✓,
lunettes épaisses ✓, casquette plate ✓ · oreille en chou-fleur ⛔, appareil auditif ⛔ ⇒ **4 sur 6**.
★ **La règle qui en sort et qui a piloté le second lot** : un emblème tient s'il change la **silhouette**
ou occupe une **surface** (couvre-chef, lunettes, turban, cicatrice traversante, cigarette, lunettes de
soudeur) ; il disparaît s'il vit dans quelques pixels (oreille, appareil derrière l'oreille, bandage,
attelle). Ni le modèle ni la postérisation ni 26 px ne le rendent.

## ⚠️ La limite qu'il faut connaître avant d'utiliser ces portraits

**La postérisation aux 4 encres efface le teint.** Plusieurs sujets écrits noirs ou métis rendent clair
après aplat. ⇒ **La diversité d'origine ne peut pas reposer sur la couleur de peau** — elle passe par les
traits, la coiffure, le couvre-chef et la silhouette. C'est « jamais la couleur seule », appliqué au
casting. Ce qui subsiste après postérisation : l'âge, le sexe, la corpulence, la coiffure, le vêtement.

## Reproductibilité

`fal-ai/flux/dev`, graine **63** sur les 46, 1024², prompt archivé à côté de chaque image, sidecar de
provenance (modèle, graine, durée, coût, request_id). Détourage `fal-ai/birefnet`. Rien n'est écrasé.
Planches : `serie-24-lieutenants.png`, `serie-dealers-et-figures.png`, `arbitrage-registre-vestimentaire.png`.
