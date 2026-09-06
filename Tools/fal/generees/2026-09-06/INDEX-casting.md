# Le casting — 46 pièces livrées (2026-09-06)

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
| Saltline | **0** | « n'est pas une organisation » — réemploi de la silhouette `UNKNOWN` |

⚠️ **Le pool réel compte 24 noms, pas 48.** Le passage à 48 est un plan, pas du code : les 24 noms
supplémentaires n'existent nulle part. Les générer aurait été **inventer des noms** ; c'est un lot back
(étendre le pool) qui doit précéder, sinon les portraits n'ont personne à qui appartenir.
⚠️ **Les 3 avocats ne sont pas produits** : la base ne sert que des étiquettes de rang, en anglais, et la
question préalable — *personnage nommé ou fonction anonyme ?* — appartient à l'user.

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
