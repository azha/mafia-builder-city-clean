# Manifeste de montage — les 235 pièces produites, et sous quelle clé les demander

Écrit pour `mafia-unity`. **Rien de ce qui suit n'est aujourd'hui dans `Assets/`** : tout vit sous
`Tools/fal/generees/`, qu'Unity ne charge pas. C'est la **forme A appliquée à l'art** — l'artefact
existe, il n'a aucun consommateur — et un inventaire d'assets compterait ces pièces comme livrées.
⚠️ Ce n'est pas propre à ce lot : sur `main`, les **83 icônes SVG ont 0 consommateur** dans 137 `.cs`
et les **129 tuiles Kenney sont référencées 0 fois**. La question « et qui l'affiche ? » vaut pour tout
l'art du dépôt.

Toutes les pièces sont en **PNG, RGB opaque, 1024×1024** sauf les décors (**1080×2400**). Aucune n'a de
canal alpha : le fond fait partie de l'image (aplat au jeton `#161c2b` pour les visages, matière pleine
pour les textures). ⇒ `alphaIsTransparency` est **sans objet**, et un `Image` suffit — pas de masque.

---

## 1. Les visages de lieutenants — 150 · la clé est l'**identifiant**

`generees/2026-09-06/aplat/visage-001.png` … `visage-150.png` · 1024² · RGB · 67 Mo

**Clé** : l'**`id` du lieutenant**, jamais le nom, jamais l'archétype. Décidé le 2026-09-06 : l'id est
plus stable que le nom (un lieutenant ne change jamais de visage) et il y en a 22 408, donc le nombre de
visages est **découplé** du vivier de 24 noms.
⚠️ **Ce que ça coûte, à ne pas rouvrir comme un bug** : « Lt. Kane » n'est plus un visage reconnaissable
d'une partie à l'autre. Le ruling user demande une variété de POPULATION, pas des personnages récurrents.

**⛔ L'attribution DOIT sonder, pas seulement hacher.** Pour 13 visages simultanés tirés par hachage
seul, la probabilité d'un doublon dans la vue est de **41 %** à 150 visages (98 % à 24, 12 % à 600).
Le pool de noms résout déjà exactement ce problème et sa forme est à recopier :

```
nomPourLieutenant(id, dejaPris)   // lieutenant-name-pool.ts — le hachage donne le POINT DE DÉPART,
                                  // puis on avance jusqu'au premier libre
```
⇒ `visagePourLieutenant(id, dejaPrisDansLaVue)` : **zéro doublon par construction**, quel que soit le
hasard, dès que le pool dépasse l'ensemble visible.
⚠️ **Propriété à préserver** : le visage doit être stable **à ensemble visible donné** — un visage déjà
attribué ne se recalcule pas quand l'ensemble change, exactement comme les noms.

**Tailles réelles à l'écran** (mesurées dans le client) : **26 px** (rangées de ㉙ Conflit et ㉘
Distribution, `AddLayoutElement(portrait, preferredWidth: Px(26f))`), ~40 px (rangée d'organigramme),
**71 px** (médaillon de fiche, `RefMedaillonDiametre = 71`). Les 150 ont été jugés à ces trois tailles.

**Titulaire ↔ doublure** (ruling user « B ») : la doublure se rend **en deux encres** au lieu de quatre —
elle perd le laiton, le titulaire le garde. C'est une différence de **matière**, jamais de teinte seule.
Outil : `posteriser.py <src> <dst> <matte> "#161c2b,#8a8069"`.

## 2. Les personnages nommés — 57

| famille | fichiers | clé de demande |
|---|---|---|
| lieutenants du pool de noms | `aplat/lt-<nom>.png` — 24 (hara, rin, voss, kane, tovah, marr, vesk, dorne, sallo, tull, brasse, kest, halde, skeld, varne, marrek, rook, sarre, wend, quist, oster, nock, ferrand, ilm) | le **nom** servi par `nomPourLieutenant` — utilisables si on veut qu'un nom ait un visage fixe |
| dealers | `aplat/dl-<prénom>.png` — 18 (oskar…yael) | le **prénom** dérivé de l'id à la projection (`dealerNameRef`) |
| avocats | `aplat/av-<nom>.png` — 14 (aldane…prevast) | le nom **persisté** dans `lawyers.name` par `lawyer-name-pool.ts`, forme « Maître X » |
| le Don | `aplat/don.png` | le joueur (⑥ « VOUS / LE DON ») |
| frères Tarcum | `aplat/tarcum-freres.png` | rival `tarcum` — deux visages dans le cadre, le canon dit « des frères » |
| opérateur de Gorge-de-Fer | `aplat/gorge-operateur.png` | rival `iron_throat` — un opérateur, **jamais un chef** |
| marque de La Coil | `aplat/coil-marque.png` | rival `coil` — **un objet, pas un visage** : le canon lui refuse un boss |
| Saltline | *(aucun)* | réemploi de la silhouette `UNKNOWN` — « n'est pas une organisation » |

## 3. Les matières d'écran — 20 · la clé est l'**écran**

`generees/2026-09-06/matieres/<nom>.png` · 1024² · RGB

| écran | fichier | encre à poser dessus | tuilable ? |
|---|---|---|---|
| ⑯ Revue | `registre.png` | sombre `#241804` | **non — c'est une PAGE** |
| ⑨ Exceptions | `ardoise.png` | crème `#eae0c8` | oui |
| ⑭ Compression | `chaufferie.png` | crème | oui |
| ② Fiche bâtiment | `cyanotype.png` | crème | oui |
| ⑥ Famille | `photos.png` | sombre | oui |
| Lieutenant | `identite.png` | sombre | **non — c'est une CARTE** |
| ㉑ Marché | `volets.png` | crème | oui |
| ㉔ Autonomie | `telegramme.png` | sombre | oui |
| ⑮⑰ Police | `kraft.png` | sombre | oui |
| ⑱ Bureau | `acajou.png` | crème | oui |
| ㉖ Compte | `coffre.png` | crème | oui |
| ㉗ Boutique | `vitrine.png` | crème | oui |
| ㉘ Distribution | `liege.png` | crème | oui |
| ㉙ Conflit | `table.png` | crème | oui |
| ㉚ Chaîne d'appro | `pelure.png` | sombre | oui |
| ㉛ Loi | `parloir.png` | crème | oui |
| ㉜ Ce qu'on a confié | `feutrine.png` | crème | oui |
| ㉝ Raser un site | `fiche.png` | sombre | oui |
| ㉞ Ordres du soir | `carnet.png` | sombre | oui |
| ㉟ Vente | `console.png` | crème | oui |

**Import** : `wrapMode: Repeat` pour les tuilables, `Clamp` pour les deux pages. Le filet du chrome est
le laiton `#b08d3e`.
⚠️ **Panneaux, pas fonds plein écran** : la couture est invisible, la **périodicité** ne l'est pas — au
delà de 2×2 tuiles l'œil suit la répétition (`mesurer-periodicite.py` la chiffre ; le papier pelure est
le plus périodique, 7,6 contre 1,6 pour le liège).
⚠️ **Le contraste du texte est vérifié** : pire carreau contre l'encre de **4,89 à 11,75:1**, plancher
canon 4,5 (`T.asset.contrast_wcag_floor`). Changer l'encre ou la teinte invalide cette mesure.

## 4. Les états vides — 22 · la clé est l'**écran + « aucune donnée »**

`generees/2026-09-06/aplat/vide-<écran>.png` · 1024² · RGB

`appro · autonomie · batiment · bureau · carnet · coffre · compression · confie · conflit · distribution ·
exceptions · famille · journal · lieutenant · loi · marche · police · raser · recrutement · revue ·
vente · vitrine`

⚠️ **Contrainte de SENS, pas de forme** (ruling user « ça plafonne et ça BLOQUE, rien n'est jamais
perdu ») : un état vide doit se lire « **il n'y a rien encore** », jamais « tu as raté quelque chose ».
Un état vide lu comme une perte est un **défaut**, même s'il est joli. Les 22 sont dessinés dans ce ton.

## 5. Les décors de scène — 4 · la clé est le **profil de district + jour/nuit**

`generees/2026-09-06/decors/DISTRICT_{D,ZO}_{JOUR,NUIT}_1080x2400.png` · **1080×2400** · RGB

Étendus depuis les rendus d'atelier 1080×1920 par **+480 px EN HAUT** (jamais en bas : le sol et
l'horizon ne bougent pas d'un pixel). **Ce n'est pas un provisoire** — le re-rendu 20:9 a été annulé
après mesure (il coupe 20 % de largeur sans donner de hauteur).
⛔ **Les 6 autres rendus sont en PAYSAGE** (1728×1080 : DOCKS, VERGE, VERGE3) et ne deviennent pas des
fonds portrait par extension — ils demandent un recadrage, donc l'atelier.
**Où le poser** : un `Image` **premier enfant de `ContentSlot`**, possédé par `AppShell` — voir
`Tools/spec-decor-de-scene.md` pour le mécanisme, la garde et ce qui n'y est pas tranché.

---

## Réponse directe au blocage de `mafia-unity` : « quel écran demande quoi »

Le montage bute sur l'**intention**, pas sur la mécanique. Pour mes familles, l'intention est écrite et
opposable :

| ce qu'un écran veut afficher | ce qu'il demande | avec quelle clé |
|---|---|---|
| le visage d'un lieutenant | `visage-NNN.png` | `visagePourLieutenant(lieutenant.id, dejaPrisDansLaVue)` — **hachage + sondage** |
| le visage d'un dealer | `dl-<prénom>.png` | le prénom que `dealerNameRef` dérive déjà de l'id |
| le visage d'un avocat | `av-<nom>.png` | `lawyers.name` (persisté, « Maître X ») |
| le visage du joueur | `don.png` | constante |
| un rival | `tarcum-freres.png` · `gorge-operateur.png` · `coil-marque.png` | `rival_key` — et **Saltline n'en a pas** |
| le fond de matière d'un écran | `matieres/<nom>.png` | **l'écran lui-même** — table §3, une ligne par écran |
| l'écran est vide | `aplat/vide-<écran>.png` | **l'écran + « aucune donnée »**, table §4 |
| le décor derrière tout | `decors/DISTRICT_*_1080x2400.png` | profil de district + jour/nuit |

⇒ **`planches/reference-par-ecran.png` est la version visuelle de ce tableau** : pour les 20 écrans, la
matière, l'état vide et l'encre. C'est la cible à confronter aux captures après montage.

## Ce qu'il reste à décider, et qui n'est pas à moi

1. **Le chemin de destination** sous `Assets/` et la convention de nom (`import_settings.md` impose
   `^icon_…`, `^ui_…`, `sprite_environment_*` selon la catégorie — aucun de mes noms n'y répond encore).
2. **Le mode de chargement** : `Resources.Load` (patron maison, cf. `DistrictBackgroundSlots`) ou
   registre `ScriptableObject`. Le second est le précédent le plus récent.
3. **Le poids** : 235 pièces à 1024² font ~120 Mo en PNG. Un APK n'a pas besoin de 1024 pour un
   médaillon de 71 px — la réduction à l'import est la **seule** source de variants autorisée
   (`ui_assets.md:169-175`), et c'est une décision de budget, pas d'art.

**Ma planche `planches/reference-par-ecran.png` dit à quoi chaque écran doit ressembler une fois
monté** : elle est la cible opposable, à confronter aux captures après montage.
