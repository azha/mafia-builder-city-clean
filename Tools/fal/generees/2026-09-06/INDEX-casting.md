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

---

# Le pool de VISAGES — 150, clé par identifiant (2026-09-06/07)

**Ruling user** : « il en faut beaucoup plus vu le côté aléatoire des profils, et il faut de la
diversité, éviter de revoir 2× la même image ». Mesuré : `lieutenant_state` porte **22 408 lignes**,
un joueur en voit **13 simultanément**, et il n'y a que **24 noms** — donc le visage se répétait, pas
le nom.

## Deux décisions, prises avec l'orchestration

**1. Le portrait suit l'IDENTIFIANT, plus le nom.** L'identifiant est encore plus stable (un lieutenant
ne change jamais de visage) et il y en a 22 408 ⇒ le nombre de visages se **découple** du nombre de
noms, et le lot back « 24 → 48 noms » sort du chemin critique.
⚠️ **Ce que ça coûte, écrit pour que personne ne le rouvre comme un bug** : « Lt. Kane » cesse d'être
un visage reconnaissable d'une partie à l'autre. Le ruling demande une variété de POPULATION, pas des
personnages récurrents — la perte est acceptée.

**2. Le volume ne suffit pas — c'est le SONDAGE qui supprime les doublons.** Pour 13 visages
simultanés tirés par hachage seul : **98,2 %** de chance de doublon à 24 visages, **49,0 %** à 120,
**41,4 %** à 150, 12,3 % à 600. ⇒ Le mécanisme qui règle ça existait déjà à côté :
`nomPourLieutenant` **sonde** (le hachage donne le point de départ, on avance jusqu'au premier libre).
Le même sondage sur les visages donne **zéro doublon par construction**, dès que le pool dépasse
l'ensemble visible. Le volume redevient un cadran de variété : **150 suffit largement**.
⚠️ Propriété à préserver côté client : le sondage rend le visage stable **à ensemble visible donné** —
un visage déjà attribué ne se recalcule pas quand l'ensemble change, comme pour les noms.

## La variété est CONSTRUITE, pas improvisée

`campagne-visages.py` croise **sept axes** — sexe · âge (7) · corpulence (7) · coiffure (14) ·
couvre-chef (9) · visage (10, +6 réservés aux hommes) · vêtement (15) — avec un tirage semé
reproductible, et refuse deux combinaisons identiques. **150 prompts vérifiés distincts.**
⛔ Le **teint n'est pas un axe** : il ne survit pas à l'aplat aux quatre encres (ruling user
« accepter »). La diversité vit dans l'âge, la corpulence, la coiffure, le couvre-chef, le vêtement.
⚠️ Garde-fou trouvé **avant** de dépenser un centime : le croisement brut produisait « une femme avec
un bouc ». La pilosité faciale et le pronom sont liés au sexe — *un croisement d'axes est une
combinatoire, pas une licence.*

## Deux défauts de pipeline trouvés en exécutant

1. ⚠️ **Un lot long traverse MINUIT, et le dossier d'archive est DATÉ.** `generer.py` écrit dans le
   dossier du jour ; la campagne cherchait dans celui figé au départ ⇒ **5 « ÉCHEC de génération »
   alors que les images existaient**, rangées dans `2026-09-07/`. Corrigé : le script cherche
   désormais dans **tous** les dossiers datés. *Un chemin qui dépend de l'heure est un piège pour tout
   travail qui dure.*
2. ⚠️ **Trois aplats étaient faux et le compte disait 150/150.** Postérisés sans matte (le glob avait
   échoué en silence), ils portaient du laiton dans les coins au lieu du jeton. Trouvé en mesurant
   **le coin de chacun des 150** — pas en comptant les fichiers. Recomposés : **150/150 au jeton exact
   `(22,28,43)`**. *Compter les fichiers n'est pas vérifier leur contenu.*

Planche : `planches/pool-150-visages.png`. Coût du pool : ~150 générations + 150 détourages.


---

## ⚠️ « C'est pixelisé » — ce n'était pas la résolution (retour user, 2026-09-07)

Mesuré sur un portrait : la source fait **1024×1024** et porte **121 994 couleurs** ; l'aplat en portait
**4**. Le crénelage ne venait donc pas d'un manque de pixels mais de l'absence de **tons intermédiaires** :
à quatre encres, chaque dégradé devient une frontière franche, et l'œil lit l'escalier.

**Ce qui aurait été de mauvaises réponses** : ajouter des encres (on perd l'aplat qui fait la DA), ou
flouter l'image (on perd la netteté des à-plats). **Le remède est un suréchantillonnage** : postériser à
2× puis réduire. Les frontières tombent sur une grille deux fois plus fine et la réduction les moyenne —
**les aplats restent des aplats, seuls les bords gagnent des pixels intermédiaires** (4 couleurs → 15 421,
toutes concentrées sur les contours). C'est le défaut du script depuis ; `--franc` rend l'ancien
comportement.

**Les 210 pièces ont été repassées** (150 visages + 60 du casting) et les fonds re-vérifiés : **150/150
au jeton exact**. Le contrôle utile n'est pas le nombre de fichiers mais la **valeur d'un coin**.
