# Spec — le décor de scène derrière les écrans (2026-09-06, mesurée)

Écrite sans rien exécuter. Elle répond aux quatre questions posées par l'orchestration, et **laisse
ouvert ce que l'user s'est explicitement réservé**.

## Le constat qui déclenche le lot

Les juges relèvent « décor de scène absent » sur **4 écrans jugés sur 4**, et la doctrine v3.3 le
prescrit (`front.md:308`). Mesuré : **ce n'est pas un manque d'asset, c'est un trou de câblage.**

| | mesure |
|---|---|
| scènes rendues par l'atelier | **5**, chacune en jour + nuit |
| en portrait 1080×1920 | District-D, District-ZO |
| en paysage 1728×1080 | Docks, Verge, Verge3 |
| importées dans le client | **1 seule** — `VERGE_D_{JOUR,NUIT}_FINAL.png`, **md5 identique** à `DISTRICT_D_*` de l'atelier (même image, deux noms) |
| contrôleurs qui en chargent une | **1** (`DistrictInteriorScreenController` via `DistrictBackgroundSlots`) |
| écrans neufs vérifiés qui en chargent | **0 sur 7** (Conflit, Distribution, ChaîneDAppro, Carnet, Loi, Démolition, Délégation) |
| rendus à 1080×2400 | **aucun** — or `AppShell.cs:1082` cite les deux résolutions de travail |

⚠️ Je n'ai **pas** identifié le script d'atelier qui produit les `*_FINAL` : deux fichiers les citent
(`export_ancres_depuis_blend.py`, `parcelles.py`) sans les rendre. À demander à la session Blender.

## (a) L'emplacement partagé — un, pas sept

**Où il vit.** `AppShell` possède le Canvas racine, les deux barres et un **`ContentSlot`** ; chaque
locataire y parente sa racine via `IShellTenant.SetMountParent(ContentSlot)` **avant** son `Start()`.
Le fichier le dit déjà (`AppShell.cs:38-45`) : *« un locataire qui étire un fond plein écran DANS
ContentSlot reste toujours sous les deux barres »*. ⇒ Le décor est **un `Image` premier enfant de
`ContentSlot`, possédé par `AppShell`**, dessiné avant tout locataire. Aucun locataire n'est modifié.

**Pourquoi pas sept copies.** Sept copies, c'est sept endroits où l'oublier — et le trou mesuré (0 sur
7) est exactement ce que produit l'absence de propriétaire unique. Un écran neuf hérite du décor du
seul fait d'être monté ; c'est la seule forme qui ne se dégrade pas à chaque écran ajouté.

**Le registre existe : le réutiliser, ne pas en inventer un.** `DistrictBackgroundSlots` est un
`ScriptableObject` (`profil → {fond, ancre}`) chargé par `Resources.Load` avec un cache statique
`Current` — le patron maison, explicitement aligné sur `DesignTokens.Current` et
`BuildingSpriteSlots.Current` (sa docstring le dit). Il porte aujourd'hui `vergeNuit` / `vergeJour` ;
le lot l'**étend** aux scènes importées, il ne le remplace pas.

## (b) Quelle scène pour quel écran — **arbitrage réservé par l'user, à ne pas trancher**

Le canon ne dit pas « un décor », il dit **une matière par écran** (registre papier, ardoise, liège,
bois…). Deux lectures coexistent **par décision de l'user, le même jour** (`front.md:313-315`) :
la **série 4** = la ville derrière du verre, la **série 5** = les matières nues ; ruling verbatim :
« *garde-en quand même avec le bâtiment derrière en fond d'écran* » et « *garde un peu tout, on
tranchera tout à la fin en gardant une cohérence* ».

⇒ **Le décor est donc, au mieux, le fond DERRIÈRE la matière — et le choix écran par écran est
explicitement différé.** La spec fournit le mécanisme et **aucune correspondance** :
1. **défaut** — la scène du profil de district du joueur, dans le mode jour/nuit courant ;
2. **surcharge par écran** — un champ optionnel dans le registre ;
3. **exception** — un écran peut n'avoir aucun décor, mais **nommément** (voir (d)).
Livrer le mécanisme sans la table permet à l'user de trancher à la fin sans re-toucher au code.

## (c) Les deux résolutions — la seule opération sûre est celle qui préserve le pivot

Les rendus portrait font **1080×1920** ; l'écran de travail fait aussi **1080×2400**. L'image est donc
**plus courte que l'écran**, pas plus longue : il n'y a rien à rogner verticalement.

| opération | effet | verdict |
|---|---|---|
| étirer en Y | la ville peinte change de proportions | ⛔ non |
| laisser des bandes | le décor ne couvre plus le cadre — le défaut qu'il devait fermer | ⛔ non |
| **mettre à l'échelle sur la HAUTEUR puis rogner X symétriquement** | ×1,25 ⇒ 1350 de large, 270 px retirés, **135 de chaque côté** | ✅ recommandé |
| re-rendre en 20:9 | le seul qui rende du contenu neuf dans les 480 px | ✅ si l'atelier peut, pour les 3 scènes paysage de toute façon |

⚠️ **Contrainte de pivot, déjà payée sur ce dépôt** : *un recadrage déplace le pivot dès que le pivot
est ancré sur le FICHIER et non sur le CONTENU*. La règle mécanique qui a sauvé le pivot du fond
pré-rendu : **rogner symétriquement en X et jamais le bas**. L'opération recommandée ci-dessus la
respecte par construction ; toute autre découpe doit re-mesurer le pivot (dX, dY) et le prouver.
★ Coût de détail : la mise à l'échelle ×1,25 perd 25 % de résolution native. Mesurable avant de
décider, sur une capture des deux versions à la même taille d'écran.

## (d) La garde — structurelle, et son ensemble ne grandit pas en silence

Reprendre la forme que le correcteur a écrite pour `ShellChrome` (4 non-lecteurs **nommés**) :

> **Tout locataire monté sous le shell résout un décor, ou figure dans une liste d'exceptions NOMMÉE.**

Trois exigences, sans lesquelles la garde est décorative :
1. l'assertion porte sur l'**ensemble exact** des exceptions, jamais sur leur **nombre** — un test qui
   compte laisse ajouter une exception en en retirant une autre ;
2. elle énumère les locataires **depuis `AppShell`** (la source qui monte), jamais depuis une liste
   recopiée — une liste recopiée périme au premier écran ajouté ;
3. **contrôle positif obligatoire** : retirer le décor d'un locataire non exempté doit faire ROUGIR la
   garde. Sans lui, elle peut passer pour n'avoir rien énuméré.

⚠️ Et une garde de **couverture**, distincte : le décor résolu doit couvrir le cadre à la résolution
courante (aucun pixel de `ContentSlot` laissé au vide) — c'est la propriété que le lot existe pour
tenir, et elle ne se déduit pas de « un sprite est assigné ».
★ Précédent maison à ne pas répéter : une garde spatiale **solidaire de la transformation qu'elle
surveille** ne tient qu'à l'arrêt (le panneau plein écran enfant de la scène, 2026-08-21). Le décor
étant enfant de `ContentSlot` et non d'une vue déplaçable, la couverture reste structurelle — **à
condition qu'aucun pan/zoom ne s'applique à `ContentSlot`**, ce qu'il faut vérifier, pas supposer.

## Ce que le lot coûte, en pièces

1. étendre le registre `DistrictBackgroundSlots` aux scènes importées ;
2. **importer 2 rendus déjà faits** (District-ZO jour/nuit) ;
3. **re-rendre 3 scènes** au format haut (Docks, Verge, Verge3) — dépend de la session Blender ;
4. poser l'`Image` de décor dans `ContentSlot` et sa résolution profil→scène ;
5. les deux gardes ci-dessus, avec leurs contrôles positifs.
La correspondance écran→scène n'en fait **pas** partie : elle est à l'user.
