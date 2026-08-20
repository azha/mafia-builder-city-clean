# Design — PIVOT « fond pré-rendu » pour l'écran district (v1, 2026-08-20)

Auteur : spec-writer. Relecteur ⊥ : autre agent. **Aucun fichier de code ni de scène touché par ce document.**
Déclencheur : ruling user en trois énoncés — « il faut du pixel perfect » · « le juge final c'est que ça ressemble comme sur les
screenshots que tu as faits » · « là tout est cropé de partout, pixelisé ».

**Forme choisie, et je la dis** : fichier **séparé**. `Tools/nav-hud-design-v1.md` reste la loi pour ses chunks 2 (navigation) et
5 (HUD), que ce pivot ne touche pas ; ses chunks 1, 3 et 4 sont **remplacés** par le présent document et y reçoivent un avis de
péremption. Un seul document mi-périmé se ferait exécuter par erreur.

**Producteur** : `/home/erutheone/project/atelier3d-mafia` — dépôt git autonome (tip `a026f50`, « sauvetage » du scratchpad
volatil), qui porte `map_district.py` (222 l.), `sprites_batch.py` (96 l.), `rendu_cam.py` (11 l.), `brennar_style.py` et les
`.blend`. **Toute référence d'atelier de ce document pointe ce chemin ; le scratchpad `/tmp` n'est plus une source.**
**Juges** : `mafia-clean-city/projects/mafia_city_game/art_reference/` — 4 PNG commités + README, **tous 1080×1920**
(vérifié : `DISTRICT_{D,ZO}_{JOUR,NUIT}_FINAL.png`). Autres sources lues : `district_nuit.blend` **interrogé par Blender
headless**, dépôt back (`world_geography.ts`, migration `0016`), dépôt Unity.

---

## 1. Le diagnostic, mesuré — et il a TROIS causes, pas une

### 1.1 L'écrasement ~10× (confirmé)

`DistrictInteriorScreenController.cs:401` : `k = CellSize / (metresParBloc · 56)`. Aux valeurs livrées
(`CellSize ≈ 87,7 px` mesuré sur `diorama_nuit_r8.png`, `metresParBloc = 16` dans
`Assets/Resources/BuildingSpriteSlots.asset`) ⇒ `k = 87,7 / 896 = 0,0979`, soit une **réduction de 10,2×**. Un sprite rendu à
56 px/m s'affiche donc à **5,5 px/m**. L'énoncé « écrasés ~10× » est exact.

### 1.2 Les sprites livrés sont DÉJÀ coupés au rendu — cause indépendante, jamais diagnostiquée

`sprites_batch.py:89` réserve pourtant une marge (`×1,10` en largeur, `×1,14` en hauteur). Mesure sur les 12 `*_nuit.png`
livrés, **pixels solides** (α ≥ 128) touchant le bord :

| famille | px | orientation | bords solides touchés (G/D/H/B) |
|---|---|---|---|
| barbier, hotel | 255×299, 405×480 | **PORTRAIT** | **les 4** |
| laverie | 291×295 | **PORTRAIT** | G/D/B |
| entrepot, epicerie | 566×363, 299×283 | paysage | G/D/B |
| residentiel2/3/4/5 | 385×302 | paysage | D/H/B |
| bar_hero, usine | 683×580, 1227×855 | paysage | G/H/B |
| diner | 355×293 | paysage | G/B |

⇒ **12 templates sur 12 sont coupés sur au moins 2 côtés.** La marge prévue n'arrive jamais dans le fichier.
**Mécanisme prouvé pour les 3 PORTRAIT** : `sprites_batch.py:92` pose `ortho_scale = max(w, h·res_x/res_y)`, et comme
`res = (w·PPM, h·PPM)` ce terme se simplifie en `w`. Or `S.camera` (`brennar_style.py:162-171`) ne fixe jamais `sensor_fit`, qui
reste **AUTO** — vérifié sur les caméras du `.blend` : `sensor_fit=AUTO`. En AUTO, `ortho_scale` s'applique à la **plus grande**
dimension du rendu. Pour un rendu portrait la plus grande est **Y** ⇒ l'étendue verticale vaut `w` au lieu de `h`, soit une
coupe de `h/w` (hotel : 480/405 = **1,185**, donc 18,5 % perdus). Le commentaire de `:92` (« ortho_scale couvre la dimension X »)
n'est vrai qu'en paysage.
**Pour les 9 paysage, je n'ai PAS le mécanisme** : l'arithmétique y est correcte. L'asymétrie des côtés touchés (residentiel
touche à DROITE et pas à gauche, usine à GAUCHE et pas à droite) désigne le **centrage** (`shift_x`/`shift_y`, `:93-94`) plutôt
que l'échelle — **c'est une piste, pas une mesure**, et §5 la traite par un contrôle plutôt que par un correctif deviné.

⇒ **Conséquence dure : re-rendre les sprites au PPM du fond sans corriger le cadrage reproduirait la coupe à la nouvelle
échelle.** Le contrôle de cadrage (§5.3) est un livrable du pivot, pas une option.

### 1.3 La direction de caméra des sprites n'est pas celle du district — 20,4° d'écart

`sprites_batch.py:21` : `DIR = (9,0 ; −11,0 ; 5,9)` normalisée ⇒ `(0,585 ; −0,715 ; 0,383)`.
Caméras du district (`map_district.py:208-209`) : `CAM_D` œil (26,0 ; −64,0 ; 52,0) et `CAM_ZO` œil (13,3 ; −31,3 ; 26,5), même
cible (0,5 ; 1,5 ; 1,0) ⇒ direction œil→cible normalisée **(0,294 ; −0,755 ; 0,587)** pour les deux.
Produit scalaire = 0,937 ⇒ **20,4° d'écart**. Coller un sprite vu sous 20° de différence à côté de bâtiments ambiants baqués
donne deux trois-quarts incompatibles dans la même image. **La nouvelle passe doit rendre à la direction du district**, pas à la
direction héritée.

---

## 2. Le socle géométrique — mesuré dans le `.blend`, pas déduit

Interrogation Blender headless de `district_nuit.blend` (résolution forcée 1080×1920, `world_to_camera_view`) :

| | `CAM_D` | `CAM_ZO` |
|---|---|---|
| `ortho_scale` · `sensor_fit` | 80,0 · AUTO | 34,0 · AUTO |
| **px/m dans le plan caméra** | **24,000** | **56,471** |
| couverture (plan caméra) | 45,00 m × 80,00 m | 19,12 m × 34,00 m |
| pixel de l'origine monde | (515,76 ; 996,57) | (482,90 ; 1046,00) |
| `ex` (1 m monde en X) | (22,365 ; 5,113) px | (52,607 ; 12,042) px |
| `ey` (1 m monde en Y) | (8,707 ; −13,134) px | (20,529 ; −30,857) px |
| `ez` (1 m monde en Z) | (0,000 ; −19,425) px | (0,000 ; −45,736) px |

Quatre faits qui commandent tout le reste :

1. **`ez` a une composante X nulle sur les deux caméras** ⇒ aucune roulis : la hauteur d'un bâtiment monte **verticalement** à
   l'écran. Un sprite au pivot-sol se pose donc sans cisaillement.
2. **Il n'existe pas de « px/m » scalaire pour ancrer** : 10 m en X monde font 539,7 px et 10 m en Y monde 370,7 px sur `CAM_ZO`
   (le sol est vu en oblique). **La carte d'ancrage doit porter la base `(origine, ex, ey, ez)`, jamais un PPM.**
3. **`CAM_ZO` = `CAM_D` à un zoom ortho pur près** : rapports des bases 2,352 (ex) / 2,358 (ey) / 2,354 (ez) pour un rapport de
   ppm de 2,353 — **même direction à 0,2 % près**. Le ruling « zoom ortho, jamais de changement de perspective » est donc
   satisfait par ces deux caméras, et par elles seules (`CAM_Z`, `map_district.py:216`, est en **perspective** `lens=40` :
   **exclue par le ruling**).
4. **Le PPM du fond ZO (56,471) est à 0,8 % du PPM des sprites (56,0)**, `sprites_batch.py:20`. L'échelle historique était donc
   la bonne — c'est l'écran qui la détruisait (§1.1).

**Étendue de sol visible au cadre `D`** (inversion de la base) : parallélogramme de sommets (−45,7 ; 58,1), (−3,7 ; 74,4),
(45,7 ; −52,5), (3,7 ; −68,9), aire **6 131 m²**. Ce n'est pas un rectangle : le champ de parcelles doit être **inscrit** dedans,
et deux coins de la bbox des bâtiments actuels tombent dehors (mesuré : (−25,5 ; −34) → u = −350 px ; (22 ; 28) → u = 1 252 px).


### 2.1 Le contrat d'écran — traité MAINTENANT, pas au premier rendu (prédictions ⊥ P1 et F-cadre)

**P1 — le canvas rééchantillonne, et c'est rouge d'office.** `AppShell.cs:159-161` pose `ScaleWithScreenSize` avec
`referenceResolution = (1280, 720)` et ne touche jamais `matchWidthOrHeight` (défaut **0** = appariement sur la largeur).
Sur la vue de recette 1100×577 ⇒ `scaleFactor = 1100/1280 = **0,859375**`. Une `Image` dimensionnée en unités canvas est donc
rendue à **0,859×** : rééchantillonnage garanti, **F-transport rouge sans qu'aucun pixel d'art soit en cause**.

⇒ **Mécanisme 1:1 spécifié ici** — *compensation par le facteur d'échelle*, pas `ConstantPixelSize`, pas de rendu hors canvas :

```
rt.sizeDelta = new Vector2(tex.width, tex.height) / canvas.scaleFactor;   // fond ET chaque sprite joueur
```

La taille physique rendue vaut alors `(tex / scaleFactor) × scaleFactor = tex`, **exactement**. Pourquoi pas les deux autres :
`ConstantPixelSize` casserait la mise à l'échelle de tout le shell (TabBar, TopBar, les 9 écrans) ; un rendu hors canvas
perdrait l'invariant de confinement `childCount == 3` que **trois** falsifiables livrées assertent (§7 du design nav-hud).
**pp-F1 vérifie l'égalité `rect × scaleFactor == tex`**, jamais `rect == tex` — c'était le piège.

**F-cadre — la décision de cadrage, et je m'écarte de l'hypothèse du mandat.** L'écart est réel : aspect artefact
`1080/1920 = 0,5625`, aspect de la vue de recette `1100/577 = 1,9064`, **rapport 3,389** qu'aucun réglage n'absorbe. Le mandat
suggérait un **nouveau cadrage de rendu à l'aspect écran**. **Mesuré, je tranche l'inverse : l'écran passe en PORTRAIT 9:16.**

- Les **4 artefacts juges** sont 1080×1920, aspect **0,5625**. Les brouillons de la même chaîne (`DI2_D_*_d1.png`) sont
  720×1280 — **aspect 0,5625 encore**. Toute la direction artistique validée est en 9:16, et le ruling user désigne ces
  images-là comme juge : re-cadrer la scène en paysage **contredirait le juge**.
- `1100×577` n'est pas une décision produit : c'est la vue Game de l'éditeur. `ProjectSettings.asset:44-45` porte
  `defaultScreenWidth: 1024 / defaultScreenHeight: 768` — un défaut d'éditeur, pas davantage.
- ⚠️ **Le trou réel** : `ProjectSettings.asset:11` pose `defaultScreenOrientation: 4` (**AutoRotation**) et `:61-64` autorisent
  **les quatre** orientations. Le projet n'est donc épinglé sur rien. **Ce trou est à fermer par ce lot** (portrait), et c'est
  un geste de configuration, pas d'art.
- ⇒ **La capture de recette se prend à 1080×1920**, et F-cadre y trouve les 4 coins. Sur un appareil dont l'aspect n'est pas
  9:16, il n'y a pas de rescale (ruling) : le fond est ancré au centre et **la fraction visible est déclarée en chiffres**,
  ce que F-cadre prévoit explicitement.

### 2.2 Ce que le pivot fait mourir (prédiction ⊥ P3)

Dès que la carte d'ancrage bloc→pixel existe, **`metresParBloc` et `CellSize` cessent d'être des grandeurs de mise en page** :
l'échelle et la position viennent du fond. Aujourd'hui `CellSize` est calculé à `DistrictInteriorScreenController.cs:290` et
consommé comme facteur d'échelle `k = CellSize / (MetresParBloc · 56f)` en **quatre** sites (`:414`, `:454`, `:524`, `:712`) —
tous supprimés par P3 du plan de livraison. **Corollaire : l'arbitrage 16-vs-22 remonté à l'user cesse de décider quoi que ce
soit** et n'a plus à être tranché pour cet écran.
*(Trace du même piège : le commentaire de `:712` cite l'ancre « `:401` » d'une version antérieure de ce design — un numéro
recopié vieillit ; les ancres ci-dessus ont été **re-mesurées** au moment d'écrire cette v2.)*

---

## 3. Le contrat parcelles — l'a priori du mandat est CORRECT, et le delta de scène est plus gros qu'annoncé

**Mesuré : `map_district.py` n'a aucune notion de parcelle, de bloc, ni de grille.** Les 40+ bâtiments y sont posés à des
coordonnées métriques écrites à la main (`:54-56`, `:70-73`, `:93-98`, `:118-127`), organisées par quartier narratif (docks sud,
rue du Verge au centre, rangées nord). Rien ne dit « ce volume-ci est possédable ». Le delta n'est donc pas « vider des
parcelles » : c'est **introduire la notion**.

**Décision** : un module neuf `parcelles.py`, **propriétaire unique** de la correspondance logique↔physique.

- Le back donne la grille logique : `blocks.coordinates = {x: (n−1) % 10, y: (n−1) / 10}` (migration `0016`, commentaire du bloc
  d'insertion) ⇒ **10 colonnes**, nombre de rangs variable.
- `parcelles.py` place ces (x,y) en mètres dans la scène — **un pas de parcelle, une origine, une orientation**, choisis pour que
  le champ s'inscrive dans le parallélogramme visible de `CAM_D` (§2).
- Il **retire** de la scène tout volume qui recouvre une parcelle, et laisse le sol + trottoir déjà rendus par la scène
  (`map_district.py:79-88` pose rues, trottoirs, placette, marquages : ces éléments **restent**).
- Il **exporte** la carte d'ancrage (§4).

**Ce que le fond porte** : sol, rues, trottoirs, mobilier, véhicules, piétons, bâtiments **ambiants** (ceux hors parcelles),
enseignes ambiantes, brume, ville au loin — c'est-à-dire le look exact des artefacts. **Ce que le fond ne porte pas** : aucun
bâtiment sur une parcelle. Unity dessine par-dessus, et **rien d'autre**.

**Pas de parcelle — dérivé, pas choisi.** Champ 10 colonnes × R rangs inscrit dans 6 131 m² d'oblique : pour R = 6 (le maximum du
profil `verge`, §6) un pas de **6,5 m** donne 65 m × 39 m, qui s'inscrit. Et c'est le bon ordre de grandeur : la largeur moyenne
pondérée des façades du jeu vaut **6,41 m** (mesure §1.2 du design nav-hud). ⇒ **à 24 px/m, une parcelle fait 156 px et un
residentiel 165 px : le bâtiment remplit sa parcelle et déborde un peu, comme une maison de rang.** À comparer à l'existant :
cellule 88 px, sprite 38 px. C'est là, chiffré, que le pivot répare le rendu.

⚠️ **Le pas de parcelle rend `metresParBloc` sans objet pour l'écran district** : l'échelle n'est plus un réglage Unity, c'est
celle du fond. Je ne rouvre pas l'axe « échelle » scellé en r5-r6 — je signale que le pivot **en supprime l'objet** côté écran
district, et je laisse le ⊥ trancher si cela vaut re-ratification.

---

## 4. La carte d'ancrage — un JSON produit par le rendu, jamais une constante C#

Produit par `parcelles.py` **au moment du rendu**, à côté du PNG, même nom de base :

```json
{ "schema": 1, "district_key": "verge-a", "profil": "verge", "mode": "nuit", "camera": "D",
  "image": {"w": 1080, "h": 1920},
  "base_px_par_m": { "origine": [515.76, 996.57], "ex": [22.365, 5.113],
                     "ey": [8.707, -13.134], "ez": [0.0, -19.425] },
  "pas_parcelle_m": 6.5, "ppm_plan": 24.0,
  "parcelles": [ {"x":0,"y":0,"monde":[-31.0,12.5,0.0],"pivot_px":[188.4,842.1],"largeur_px":145.4} ]
}
```

- `pivot_px` = le pixel du **point sol** de la parcelle : le pivot bas-centre du sprite s'y pose.
- `largeur_px` = `pas_parcelle_m × |ex|`, pour qu'Unity **vérifie** l'échelle sans la recalculer.
- La base est écrite **telle que Blender l'a rendue** (`world_to_camera_view` sur (0,0,0), (1,0,0), (0,1,0), (0,0,1)) — c'est la
  mesure, pas une formule réimplémentée. Unity ne fait qu'une lecture ; il ne dérive rien.
- Le JSON accompagne **chaque** fond (une caméra × un mode × un profil). Un fond sans son JSON est inutilisable : c'est ce que
  pp-F2 vérifie.

---

## 5. La passe sprites au PPM du fond

### 5.1 Ce qui change dans `sprites_batch.py`

Trois paramètres, aucun mécanisme neuf : **`PPM`** (`:20`) devient un argument ; **`DIR`** (`:21`) devient un argument et prend
la direction du district `(0,294 ; −0,755 ; 0,587)` ; **`sensor_fit`** est posé **explicitement** (jamais AUTO) pour que
`ortho_scale` s'applique à l'axe que le calcul de `:92` suppose.

### 5.2 Le compte de rendus et le coût machine — mesuré, et l'estimation du mandat vise le mauvais objet

Registre `sprites_batch.py:42-60` : **27 couples (template, état)** — bar_hero 4, hotel 3, 4 commerces × 2, 4 residentiels × 2,
entrepot 2, usine 2.

| lot | rendus | coût |
|---|---|---|
| sprites, **nuit**, 2 PPM (24 et 56,47) | 27 × 1 × 2 = **54** | ~8 s/rendu (`sprites_batch.py:3`) ⇒ **~7 min** |
| sprites, + **jour** | +54 | +7 min |
| **fonds** district 1080×1920 | 1 par (profil × mode × caméra) | **~23 à 28 min chacun** |

⚠️ **Le « ~8 s/rendu » du mandat est le coût d'un SPRITE**, pas d'un fond. Mesuré dans les logs de l'atelier :
`fin_dn.log` → `Time: 22:41.65`, `fin_zn.log` → `Time: 27:37.09`. Un fond coûte **170× un sprite**. Toute la planification en
dépend, et c'est le chiffre que je pose : **12 fonds (6 profils × 2 modes, caméra D) ≈ 5 h de machine** ; ajouter la caméra ZO
double. **Vague 1 = `verge-a` seul, 2 fonds.** ⚠️ **Ruling ressources user : 100 % machine pour Blender — la bride `-t 6`/`-t 8` des
en-têtes de scripts (`map_district.py:5`, `sprites_batch.py:7`) ne s'applique plus.** Machine mesurée : **16 threads**
(Intel Core Ultra 7 265H, 30 Go). Les 22-28 min ci-dessus sont des mesures **à `-t 6`** ; à 16 threads j'attends 10-15 min
par fond (Cycles CPU scale sous-linéairement, et ce cœur mêle P-cores et E-cores) — **DÉDUIT P6**, détecteur = le `Time:`
du premier fond. Vague 1 ≈ **20-50 min** selon le gain réel.

### 5.3 Le contrôle de cadrage — le livrable qui manque aujourd'hui

Après chaque rendu de sprite, le script **vérifie** que l'alpha solide (≥ 128) est nul sur les 4 bordures de 2 px ; sinon il
élargit la marge et **re-rend**, jusqu'à 3 tentatives, puis échoue bruyamment. C'est un contrôle **exécuté**, pas une marge
espérée — mesure de départ : **12/12 des sprites actuels échoueraient ce contrôle** (§1.2), donc il n'est pas vide.

---

## 6. Granularité des fonds et poids — le « par profil » ne marche pas tel quel, et voici pourquoi

**Mesuré** : `block_count = 30 + ((id × 7) % 51)` (migration `0016`, la ligne de calcul de l'INSERT). Les 18 districts ont donc
**18 comptes différents**, de **33 à 79 blocs**, soit 4 à 8 rangs :

`1:37 2:44 3:51 4:58 5:65 6:72 7:79 8:35 9:42 10:49 11:56 12:63 13:70 14:77 15:33 16:40 17:47 18:54`

Les trois `verge` valent **40 / 47 / 54** : un fond « par profil » ne peut pas servir trois champs de parcelles différents…
**sauf que la grille est un préfixe** : `x = (n−1) % 10`, `y = (n−1) / 10` ⇒ un district de 40 blocs occupe exactement les
4 premiers rangs du champ d'un district de 54. ⇒ **un fond par profil, autorisé au rang MAXIMAL du profil, et chaque district
n'utilise que le préfixe de ses N ancres.** Les parcelles en trop restent du sol nu — ce que l'écran fait déjà des blocs non
possédés, et ce que la fiction accepte (un district pas entièrement bâti).

| profil | districts | max blocs | rangs à autoriser |
|---|---|---|---|
| tidewater | 1-3 | 51 | 6 |
| spine | 4-7 | 79 | 8 |
| lattice | 8-10 | 49 | 5 |
| stack | 11-12 | 63 | 7 |
| glass | 13-15 | 77 | 8 |
| verge | 16-18 | 54 | 6 |

**Poids, mesuré** : `DISTRICT_ZO_NUIT_FINAL.png` = 1080×1920, **2,9 Mo** en PNG. Un fond est **opaque** ⇒ JPEG légitime :
**q95 = 0,44 Mo · q90 = 0,29 Mo · q85 = 0,23 Mo**. Budget à q90 : **12 fonds ≈ 3,5 Mo** (caméra D seule), **24 ≈ 7 Mo** avec ZO.
Négligeable devant les 464 fichiers LFS déjà livrés. **Décision : JPEG q90**, et le PNG reste l'artefact d'atelier.

⚠️ **Une seule scène existe** (`district_nuit.blend` / `district_jour.blend`, le Verge). Les 5 autres profils n'ont **aucune
scène**. C'est le vrai coût du pivot, et il est d'authoring, pas de machine.

---

## 7. Ce qui survit du design nav-hud, ce qui meurt

| élément | sort | raison |
|---|---|---|
| **Chunk 2 — navigation** (`Entrer`/`← Carte`, insets, protocole r9) | **SURVIT INTÉGRALEMENT** | il ne porte que `AppShell`/`TopBar`/`CityMapController` ; le pivot ne touche aucun des trois. **Confirmé explicitement.** |
| **Chunk 5 — HUD v3.1** | **SURVIT** | idem, aucune intersection |
| **Chunk 1 — remplissage ambiant** | **REMPLACÉ** | l'ambiant est baqué dans le fond |
| **Chunk 3 — rues** · **Chunk 4 — hors-district** | **SUPPRIMÉS** | rues, trottoirs, flaques, ville au loin et brume sont **déjà** dans la scène (`map_district.py:34-36`, `:79-91`, `:141-159`) et donc dans le fond |
| `AmbientSet` / `AmbientTemplate` (§2.2 nav-hud) | **retirés** | plus d'ambiant dessiné par Unity |
| amb-F1, amb-F4, amb-F5, amb-F8 | **retirés** | ils portent sur des objets ambiants qui n'existent plus |
| amb-F2 (priorité joueur) | **transformé → pp-F2** | la propriété survit : sur une parcelle, on voit le bâtiment joueur et rien d'autre |
| amb-F3 (inertie) | **transformé → pp-F6** | la propriété survit : le fond ne porte ni bouton ni état |
| amb-F6 (parcellaire) | **transformé → pp-F7** | le parcellaire vit dans le JSON, il s'y vérifie |
| **amb-F7 (51 tokens)** | **SURVIT tel quel** | les 4 axes scellés restent la loi pour **ce qu'Unity dessine** (calques d'état, marqueurs, HUD). **Le fond, lui, EST l'artefact : il n'a pas de tokens et n'en a pas besoin** (question 8 du mandat, confirmée) |

---

## 8. Falsifiables de la nouvelle forme

Toutes `[Category("W3U2")]`, PlayMode. Mondes dégénérés en §9.

- **pp-F1 — résolution native du fond.** Le `RectTransform` du fond a `rect.width == texture.width` et
  `rect.height == texture.height` ; **et** `texture.width == 1080 && texture.height == 1920` ; **et** l'`Image` n'a ni
  `preserveAspect` ni parent à `LayoutGroup` qui la redimensionne.
- **pp-F2 — calage.** Pour un bloc de test connu, le pivot du sprite joueur tombe à **≤ 2 px** de `pivot_px` **lu dans le JSON**
  (valeur produite par Blender, jamais recalculée côté Unity) ; **et** l'écart entre les ancres des blocs (0,0) et (9,0) vaut
  `9 × pas_parcelle_m × ex` à ≤ 2 px près.
- **pp-F3 — zéro rescale du sprite joueur.** `rect.size == sprite.texture.size` exactement (facteur 1,000) ; **et**
  `sprite.texture.width / largeur_monde_m` est égal à `ppm_plan` du JSON à **±1 %**.
- **pp-F4 — zéro crop du sprite.** Pour chacun des sprites livrés, l'alpha solide (≥ 128) est **nul** sur les bordures de 2 px
  des 4 côtés. *(Mesure de départ : 12/12 échouent — la falsifiable n'est pas vide.)*
- **F-transport — MAE ≤ 1,0** sur les **3 000 pixels de plus fort gradient** de l'artefact. C'est le juge du ruling user, et il
  **remplace** l'égalité stricte que proposait la v1 de ce document : une égalité au pixel serait rouge pour une raison sans
  rapport avec le transport (ré-encodage JPEG, compression de texture Unity). Elle **remplace aussi** toute idée de SSIM —
  réfutée par le ⊥ : une similarité globale vaut ≈ 1 par construction quand le fond EST l'artefact.
- **F-nocalque — MAE ≤ 0,5** sur les **3 000 pixels les plus plats**. Une brume à 5 % posée par-dessus coûte **1,16** : elle
  rougit.
- **F-cadre** — les **4 coins** de l'artefact sont présents dans la capture, **ou** la fraction visible est **déclarée en
  chiffres**.
- **Discriminateur de panne, à lire avec les trois** : le rapport `MAE_arêtes / MAE_plat` vaut **~90:1** pour un
  rééchantillonnage et **~1,5:1** pour un calque teinté. Le triplet ne dit donc pas seulement *rouge*, il dit *pourquoi*.
- **pp-F5 — les calques Unity au-dessus du fond sont RETIRÉS (prédiction ⊥ P2).** `OutOfDistrictBackdrop`
  (`DistrictInteriorScreenController.cs:245`) et `Haze` (`:379`) recouvrent tout `root` et coûteraient **1,16 à 1,70 de MAE
  uniforme** ⇒ F-nocalque rouge. Ils n'ont plus d'objet : le fond porte déjà sa ville au loin (`map_district.py:34-36`) et sa
  brume (`:26`). **Amendement explicite d'une falsifiable SCELLÉE** :
  `DistrictInteriorDioramaPlayModeTests.cs:241` asserte aujourd'hui `ScreenRoot.childCount == 4` (backdrop / titre / grille /
  brume, construits à `:245`, `:251`, `:292`, `:379`). Après retrait des deux calques il en reste **2**, et l'assertion passe à
  **`== 2`** avec la liste nommée mise à jour. **Jamais un contournement silencieux** : l'assertion garde sa forme — un compte
  POSITIF qui prouve la composition exacte, jamais une recherche d'absence (c'est la raison d'être que son propre commentaire
  `:236-240` documente).
- **pp-F6 — le fond est inerte.** L'`Image` de fond a `raycastTarget == false`, ne porte ni `Button` ni composant d'état, et
  aucun enfant nommé `*Ov`/`LieutenantMarker` n'est parenté sous elle.
- **pp-F7 — le parcellaire est complet et dans le cadre.** Les `block_count` ancres du district existent dans le JSON, sont
  **deux à deux distinctes**, et projettent toutes dans `[0,1080] × [0,1920]` avec ≥ 8 px de marge.
- **pp-F8 — l'ancrage vient bien de Blender.** Le JSON du fond livré porte une base dont `ez[0] == 0` et dont le rapport
  `|ex| / ppm_plan` vaut `0,956 ± 0,005` — la signature géométrique **mesurée** de ces caméras (§2). Un JSON fabriqué à la main
  ou recalculé par une formule Unity ne la reproduit pas par accident.

---

## 9. Mondes dégénérés

| id | monde le plus dégénéré qui la rendrait VRAIE, et ce qui le tue |
|---|---|
| pp-F1 | une texture 1×1 satisfait `rect == texture` ⇒ tué par l'égalité explicite à 1080×1920 |
| pp-F2 | si Unity recalculait l'ancre par la même formule que l'export, l'assertion serait une **tautologie** ⇒ tué en comparant à une valeur **lue dans le JSON produit par Blender**, plus le contrôle d'écart inter-blocs |
| pp-F3 | un sprite rendu au mauvais PPM satisfait encore « rect == natif » ⇒ tué par le contrôle `px/m == ppm_plan ± 1 %` |
| pp-F4 | un sprite **vide** a des bordures transparentes ⇒ tué en exigeant d'abord une aire opaque non nulle |
| F-transport | un échantillonnage **non pondéré par le gradient** noie les arêtes dans les aplats et **sous-déclare d'un facteur ~90** (chiffré par le ⊥ : un simple ×0,95 coûte déjà **5,26** sur les arêtes) ⇒ tué en n'échantillonnant QUE les 3 000 plus forts gradients de l'artefact |
| F-nocalque | une capture **noire** (fond pas encore chargé) a des aplats parfaits ⇒ tué en exigeant que pp-F1 et F-cadre passent sur la même capture |
| F-cadre | un cadre **vide** n'a pas de coins discordants ⇒ tué par la conjonction avec F-transport, qui exige de vrais gradients |
| pp-F5 | retirer les calques mais laisser l'assertion à 4 la rendrait **rouge pour la bonne raison au mauvais endroit** ⇒ tué en amendant `:241` à 2 dans le MÊME commit que le retrait |
| pp-F6 | un fond **absent** satisfait « ne porte ni bouton ni état » ⇒ tué en exigeant d'abord que pp-F1 passe sur la même instance |
| pp-F7 | un JSON **vide** rend « toutes les ancres sont dans le cadre » vrai à vide ⇒ tué par « exactement `block_count` ancres » et par la distinction deux à deux |
| pp-F8 | une base **nulle** aurait aussi `ez[0] == 0` ⇒ tué par le rapport `\|ex\|/ppm_plan` qui vaut 0,956 et non 0 |

---

## 10. DÉDUIT vs COMPTÉ

**COMPTÉ** : les 3 causes du §1 (facteur 10,2 ; 12/12 sprites coupés avec les côtés ; 20,4° d'écart de direction) · les deux
caméras, leurs `ortho_scale`, `sensor_fit=AUTO`, leurs bases `(origine, ex, ey, ez)` et leurs ppm 24,000 / 56,471 · la
couverture 45×80 m et 19,12×34 m · le parallélogramme de sol visible et son aire 6 131 m² · l'absence totale de notion de
parcelle dans `map_district.py` · les 6 profils · `block_count = 30 + ((id×7) % 51)` et ses 18 valeurs · le pas de 6,5 m
inscrit · les 27 couples (template, état) · **~23-28 min par fond** contre ~8 s par sprite · les poids PNG 2,9 Mo et
JPEG 0,44/0,29/0,23 Mo · l'existence d'une seule scène de district.

**DÉDUIT** — test « si ça se résolvait défavorablement, une décision changerait-elle ? » :

| # | déduit | ça décide ? | traitement |
|---|---|---|---|
| P1 | le mécanisme de coupe des **9 sprites paysage** (piste : le centrage `:93-94`) | **non** — le contrôle de §5.3 ferme la classe entière quelle qu'en soit la cause | contrôle exécuté, pas correctif deviné |
| P2 | pas de parcelle **6,5 m** | oui pour le cadrage | dérivé de l'aire visible ; **pp-F7 le mesure** sur les ancres réelles |
| P3 | un fond par **profil** avec préfixe d'ancres suffit visuellement | oui pour le budget (12 fonds vs 36) | prouvé arithmétiquement (grille préfixe) ; le résiduel est esthétique ⇒ **arbitrage user** au premier fond livré |
| P4 | JPEG q90 tient la qualité que l'user juge | **oui** — c'est le juge du ruling | **F-transport le tranche** : la MAE sur les 3 000 plus forts gradients est exactement l'endroit où un artefact de compression se voit. Si q90 dégrade, elle rougit ; on remonte à q95 (0,44 Mo) ou au PNG |
| P6 | le passage de `-t 6` à **16 threads** accélère un fond de **1,8 à 2,4×** | non — il change le calendrier, pas une décision | mesuré à `-t 6` : 22:41 et 27:37 ; le `Time:` du **premier** fond rendu à pleine machine est le détecteur, et il arrive au chunk P2 |
| P5 | les 5 autres profils sont authorables au même coût | non pour la vague 1 | vague 1 = `verge-a` seul, le reste est chiffré (§5.2/§6) et planifiable |

**Point faible nommé** : P4 est le seul déduit qui touche au verdict de l'user, et **il est mesurable dès le premier fond** —
pp-F5 en égalité stricte le tranche sans discussion. Si elle rouge à q90, on remonte à q95 (0,44 Mo) ou au PNG.

---

## 11. Ordre de livraison

| chunk | contenu | preuve |
|---|---|---|
| **P0** | `parcelles.py` : champ de parcelles `verge`, export JSON, retrait des volumes sur parcelles | JSON produit, pp-F7, pp-F8 |
| **P1** | contrôle de cadrage des sprites (§5.3) + re-rendu **nuit** aux 2 PPM (54 rendus, ~7 min) | pp-F4 sur les 27 couples |
| **P2** | 2 fonds `verge` (jour + nuit, caméra D, ~50 min) | l'artefact lui-même |
| **P3** | Unity : `DistrictInteriorScreenController` rend fond + sprites ancrés, plus aucune grille procédurale | pp-F1, pp-F2, pp-F3, pp-F6 |
| **P4** | boucle ⊥ finale sur la ressemblance | **pp-F5**, égalité stricte hors parcelles |

Les chunks 2 (navigation) et 5 (HUD) du design nav-hud restent **en vol et non bloqués** par ce pivot.

---

## 12. Reprises explicites du design nav-hud

- **nav-F4 étendue au district 3, en ROUGE ÉPINGLÉ ATTENDU.** Le geste est celui du ⊥, et je le retiens : la falsifiable est
  écrite maintenant, elle **échoue maintenant**, et elle porte **son mode d'emploi de péremption** — précédent maison du test
  qui épinglait un bug ratifié par `toBe(404)` et qui a rougi le jour où le bug fut réparé. Le test déclare, en toutes lettres :
  *ce rouge est attendu tant que le district 3 n'a pas de fond ; le jour où il en a un, ce test devient vert et cette note
  doit être supprimée.* Une épingle sur un rouge attendu est un **différé avec détecteur**, pas un différé nu.
- **Le plafond de texture survit, scopé.** La contrainte de taille de texture ne porte plus sur le fond (qui **est** l'artefact,
  1080×1920, et n'a pas de tokens — §7) mais **uniquement sur les sprites joueur et leurs calques d'état, dans leur emprise**.
  C'est la même règle qu'avant, rétrécie à ce qu'Unity dessine encore.
- **Les 4 axes scellés** (palette / contrastes / échelle / calques) restent la loi pour ce qu'Unity dessine. Le fond en est
  exempt par nature. Voir §7 pour le sort ligne à ligne des amb-F*.
