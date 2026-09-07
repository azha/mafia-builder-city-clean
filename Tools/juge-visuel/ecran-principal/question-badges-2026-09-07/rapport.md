# Question de juge — badges de ① (nuit) — 2026-09-07

Juge à contexte vierge. Image jugée : `capture-nuit-1080x1920.png`, **1080×1920 RGB**,
`sha256 = e77df7980b6e39ee7a997f97afe49beac9893f46ae8d47f3ba993b21a3726d64` (concorde avec le
préfixe de `captures-provenance.md`). Aucun code lu, aucune scène ouverte, aucun run.
Tous les chiffres ci-dessous sont produits par un script de `mesures/` sauf ceux explicitement
marqués **« lu à l'œil »**.

---

## Réponse en trois lignes

1. **« Planque » sur le trottoir : CONFIRMÉ pour G9** — l'ancrage `(539,5 ; 957)` tombe sur le
   pavage clair devant la devanture du « Verge d'Or », **27,5 px sous** la ligne où la façade
   rejoint le trottoir — droite ajustée `y = 0,2559·x + 791,43` sur **36 colonnes** hors badge (script `37`),
   soit `y = 929,5` à l'aplomb du badge ; un étal
   vert est bien à sa gauche. **Mais l'autre « Planque » (G7) INFIRME la même phrase** : son
   ancrage `(923,5 ; 765)` est **sur le corps d'un étal/comptoir en bois** (boîte ≈ (896,750)-(930,782),
   lue à l'œil sur `mesures/tuile-G7b.png`, zoom 9 gradué) — ni trottoir (l'étal descend jusqu'à `y≈782`, le pavage commence là,
   **17 px sous l'ancrage**), ni façade.
2. **« Serre » sur un toit vide : INFIRMÉ, à 4 px près** — l'ancrage `(347,5 ; 765)` est sur le
   **sol sombre de la rue** (`rgb(47,53,63)`, plan lisse et continu sur ±40 px), et le bord de toit
   du commerce voisin passe à **3,9 px** au sud-ouest (premier pixel de toit : `(345,768)`, carte
   ASCII `mesures/cartes-ascii.txt`). Le badge n'est pas *sur* un toit ; il **frôle** le bord d'un
   toit **occupé** (souche de cheminée à ~25 px), pas d'une zone de toit vide.
3. **Compte : 8 badges sur 12 tombent sur une façade ou un toit de bâtiment.** Et je ne compte
   **pas 13 badges mais 12** : **11 marqueurs** (deux oracles indépendants concordent exactement),
   dont **un porte DEUX libellés superposés** (G1 = « Commerce-écran » **+** « Cache »). Les 4 qui
   ne sont pas sur un bâtiment : G5 (rue), G7 (étal bas), G9 (trottoir), **G10 (bord de quai, au ras
   de l'eau, à 234 px du bâtiment le plus proche)**.

> ⚠️ Le disque du badge est **opaque** (9 empreintes 14×14 **identiques bit à bit** sur 11, sur des
> fonds très différents — script `32`). Donc **deux badges au même endroit avec le même libellé
> seraient indétectables** : 12 est un **plancher**, pas un compte fermé. C'est la seule lecture
> compatible avec « 13 bâtiments ».

---

## Méthode déclarée

### Détection des badges — deux oracles sans critère commun

| oracle | critère | contrôle positif | contrôle négatif | sortie |
|---|---|---|---|---|
| **A — gabarit annulaire** (`05_detect_badges.py`) | fraction de l'anneau `6,0 ≤ d ≤ 7,2` couverte par la couleur d'anneau `(176,141,62) ± 30` **et** intérieur `d ≤ 4,5` sombre | badge « Laboratoire » : anneau **0,63**, intérieur **0,86** | 5 ampoules de guirlande du « Verge d'Or » : **0,08 – 0,27** ; ciel/façade : **0,00** | 13 groupes ≥ (0,45 / 0,60) |
| **B — point intérieur** (`06_oracle_point.py`) | couleur **exacte** `(255,183,38)`, 88 px dans toute l'image | — (le compte total est l'oracle) | — | **11 amas de 8 px exactement** |

Les **2 groupes de A absents de B** ont été ouverts et rejetés à l'image : `(233,920)` = **camionnette
jaune** (`mesures/crop-D8.png`), `(682,1302)` = **façade** (`mesures/crop-D11.png`). Reste **11**, et
B est exactement ce sous-ensemble. Les deux oracles ne partagent **aucun** critère (couleur d'anneau
vs couleur de point ; forme annulaire vs amas exact).

> *Uniformité — la question que je me suis posée avant de conclure.* Les 11 scores de A sont
> identiques (0,63) et les 11 amas de B font exactement 8 px : un résultat parfaitement uniforme,
> donc suspect par principe. Trois raisons de le retenir quand même : (i) c'est la signature
> attendue d'un **même sprite** répété, corroborée par les empreintes 14×14 identiques bit à bit ;
> (ii) l'instrument **n'est pas bloqué** — il a produit 2 faux positifs hétérogènes que j'ai dû
> arbitrer, et le détecteur de pastilles (script `25`) rend 37 groupes tous différents ; (iii) les
> **deux** badges qui s'écartent de l'empreinte (G5, G6) sont trouvés par la même comparaison, à
> 10 et 20 px près (script `35`) — l'instrument sait donc rendre du non-uniforme.

### Lecture et identification des libellés

Bitmap binaire de l'encre (`min(r,g,b) ≥ 150` **et** `max−min ≤ 25`) dans la bande `[cy+13, cy+24]`,
en repère **relatif au centre d'anneau** (`11_bitmaps.py`).
**Contrôle positif** : les trois « Commerce-écran » propres (G4, G8, G11) sur trois fonds différents
→ Jaccard **0,890 / 0,899 / 0,926** (plancher « même libellé »).
**Contrôle négatif** : libellés différents → **0,234 – 0,317**.

### Classification du sol (bâtiment / toit / rue / trottoir / végétation / eau)

**Je n'ai pas trouvé de segmentation automatique honnête** et je le dis plutôt que de fabriquer une
garde décorative : la couleur ne sépare pas (script `15` : toit ardoise `(77,94,114)` et rue éclairée
`(77,93,113)` sont **indiscernables**) ; l'énergie de gradient ne sépare pas non plus (script `14` :
façade éclairée **E=10**, toit plat **E=8**). La carte de contours produite (`mesures/carte-structure.png`)
sert donc à **délimiter**, pas à classer.

**La méthode retenue est donc explicitement mixte, et son instrument est publié :**
1. **Découpe zoomée mesurée** — pour chaque badge, une vignette 200×200 px zoom 4 (`ancrage-G*.png`)
   et, pour les cas litigieux, 100×100 px zoom 8 (`zoom-G*.png`), **avec la croix d'ancrage et le
   cercle de 40 px tracés aux coordonnées calculées**. Le lecteur voit exactement ce que j'ai jugé.
2. **Carte ASCII de luminance** (`22`/`23`/`27` → `mesures/cartes-ascii.txt`) autour des 11 ancrages :
   `#` L≥80 · `:` 60-79 · `.` <60 · `T` clair neutre · `A` ancrage. C'est elle qui donne les
   **frontières au pixel** (bord de toit sous G5, arête de silhouette sous G1/G2/G3).
3. **Profils de colonne** (`19`, `24`, `28`, `29`) pour les jonctions façade/sol.
4. **Tuiles graduées** tous les 50 px (`16_grille_reperes.py` → `tuile-NO/NE/SO/SE/quai/G7*.png`) :
   c'est sur elles que sont **lues à l'œil** les boîtes de masses bâties.

⚠️ **Limite structurelle que je pose d'emblée** : le badge est opaque et mesure ~64 × 27 px. Il
**occulte le sol qu'on lui demande de juger**. Le pixel exact sous l'ancrage est, pour 6 badges sur
11, un pixel de glyphe du badge lui-même. La classification porte donc sur le **voisinage immédiat
hors encre**, jamais sur le pixel d'ancrage. Cas extrême : sous G9, la jonction façade/trottoir tombe
**pile derrière le disque** (colonne x=539, y 927-945) — j'ai dû la mesurer sur x=515 et x=520.

---

## Table par badge

`Boîte d'encre` = anneau (14×14) + libellé. `Ancrage` = milieu du bord inférieur = **centre d'anneau
+ (0 ; +20,5)** sur les 9 badges dont le libellé n'est pas pollué par le fond (script `12`).

| # | libellé | centre anneau | boîte d'encre | ancrage bas-centre | sous l'ancrage (et disque 40 px) | bâtiment le plus proche + distance | verdict |
|---|---|---|---|---|---|---|---|
| **G1** | **« Commerce-écran » + « Cache »** (2 libellés superposés) | (347,5 ; 552,5) | (316,546)-(379,573) | **(347,5 ; 573)** | façade de **T1** (angle, faces claire+sombre) ; disque : façade T1 + fond de colline à droite | **T1 = 0** ; arête droite de silhouette à `x=363/364` (ligne 580) ⇒ **16 px à l'intérieur** | **SUR BÂTIMENT** |
| **G2** | Laboratoire | (539,5 ; 552,5) | (519,546)-(560,573) | **(539,5 ; 573)** | paroi latérale **à l'ombre** de **T2** (`rgb(25,30,36)`) ; disque : mur T2 + toit et château d'eau de T19 en bas | **T2 = 0** ; bord droit de la paroi à `x≈566/567` ⇒ **~27 px à l'intérieur** | **SUR BÂTIMENT** |
| **G3** | Cache | (731,5 ; 552,5) | (721,546)-(748,576) | **(731,5 ; 573)** | face gauche à l'ombre de **T3** ; disque : moitié sol pâle vide à gauche, moitié façade T3 *(proportions estimées à l'œil)* | **T3 = 0** ; arête gauche à `x≈722/723` (ligne 578) ⇒ **9 px à l'intérieur** | **SUR BÂTIMENT** (de justesse : la moitié gauche du libellé déborde dans le vide) |
| **G4** | Commerce-écran | (155,5 ; 744,5) | (124,738)-(187,766) | **(155,5 ; 766)** | façade bleue à fenêtres de **T5** ; disque : entièrement T5 | **T5 = 0** | **SUR BÂTIMENT** |
| **G5** | Serre | (347,5 ; 744,5) | (338,738)-(357,765) | **(347,5 ; 765)** | **sol sombre de rue**, `rgb(47,53,63)`, plan lisse (`+40 px` en H : 47→53 ; en V : 47→84, dégradé continu) ; disque : toit de T7 au SO (avec souche) sur ~⅓, rue sur le reste *(estimé à l'œil)* | **T7 = 3,9 px** (premier pixel de toit `(345,768)`) | **PAS SUR BÂTIMENT — RUE** |
| **G6** | Point de vente | (539,5 ; 744,5) | (513,738)-(573,765) | **(539,5 ; 765)** | **toit-terrasse** rosé de **T8** (« LE VERGE D'OR ») ; disque : terrasse + bloc technique + enseigne | **T8 = 0** | **SUR BÂTIMENT** (toit **occupé**, pas vide) |
| **G7** | Planque | (923,5 ; 744,5) | (909,738)-(938,765) | **(923,5 ; 765)** | **étal/comptoir en bois T10** (panneaux bruns, joint vertical visible) ; disque : étal + trottoir en bas + façade olive T9 à droite | **T10 = 0** (6-7 px du bord droit de l'étal, `x≈930`) ; **façade de T3 ≈ 15 px au-dessus** *(lu à l'œil)* ; **trottoir 17 px en dessous** | **AUTRE — structure basse (étal), ni façade ni trottoir** |
| **G8** | Commerce-écran | (155,5 ; 936,5) | (124,930)-(187,957) | **(155,5 ; 957)** | **toit d'ardoise** de **T11** ; disque : toit T11 en entier | **T11 = 0** | **SUR BÂTIMENT** (toit) |
| **G9** | Planque | (539,5 ; 936,5) | (526,930)-(554,957) | **(539,5 ; 957)** | **trottoir** clair uniforme `rgb(220,210,192)` (toute la carte ASCII ±34 px est `#`) ; disque : trottoir, étal vert à gauche, voiture en bas | **T8 = 27,5 px** (base ajustée sur 36 colonnes, `y = 929,5` sous le badge) ; étal vert à **~16 px** *(lu à l'œil)* | **PAS SUR BÂTIMENT — TROTTOIR** |
| **G10** | Commerce-écran | (155,5 ; 1320,5) | (124,1314)-(207,1343) | **(155,5 ; 1343)** | **bord de quai** : 9 px sous l'arête blanche (`y≈1334`), `rgb(41,53,70)`, bande sombre qui devient l'eau (teal continu de `y≈1364`) ; disque : environ moitié eau, moitié dalle de quai *(estimé à l'œil)* | **T13 (entrepôt brique) ≈ 234 px** au NO | **PAS SUR BÂTIMENT — QUAI / LIGNE D'EAU** |
| **G11** | Commerce-écran | (731,5 ; 1320,5) | (700,1314)-(763,1341) | **(731,5 ; 1341)** | **façade** de **T16** (« BRENNAR COAL & ICE »), baie vitrée sombre ; disque : façade T16 + quai en bas | **T16 = 0** | **SUR BÂTIMENT** |

### Preuve de la superposition sur G1

`11_bitmaps.py` / `17_superposition2.py`, gabarit `COM = G4 ∩ G8` (143 px) :

| hypothèse testée pour G1 | Jaccard | px de G1 inexpliqués |
|---|---|---|
| « Commerce-écran » **seul** | **0,727** | **51** |
| « Commerce-écran » **+ Cache** | **0,863** | **10** |
| « Commerce-écran » + Serre | 0,810 | 30 |
| « Commerce-écran » + Planque | 0,753 | 30 |
| « Commerce-écran » + Laboratoire | 0,716 | 28 |
| trois libellés (meilleure combinaison) | ≤ 0,843 | ≥ 5 |

0,727 est **très en dessous** du plancher « même libellé » (0,890) ⇒ G1 n'est pas un seul
« Commerce-écran ». `+ Cache` remonte au voisinage du plancher et divise le résidu par 5 ; aucun
triplet ne fait mieux en Jaccard. **G1 = deux libellés, au même pixel.** Visible à l'œil sur
`mesures/crop-G1.png` (zoom 14).

### Deux faux soupçons écartés

- **G10 n'est pas une superposition** : ses 80 colonnes d'encre viennent du **quai clair** qui passe
  sous la moitié droite du texte. Restreint aux colonnes de fond sombre (`dx ≤ −12`), G10 vs COM →
  **J = 0,907**, dans le plancher « même libellé ». Un seul « Commerce-écran ».
- **G9 n'est pas dégradé au point d'être un autre mot** : `G9 ⊂ G7` **exactement** (0 px de G9 hors
  de G7). Même libellé « Planque », simplement moins contrasté sur fond ocre.

### Ce que porte le badge en plus du libellé

- Tous : anneau doré Ø 14 px `(176,141,62)`, disque intérieur sombre, **point doré 4×3 px
  `(255,183,38)`** en haut du disque.
- **G5** : une marque grise supplémentaire **4×3 px** en `(346,747)-(349,749)`, dans le disque.
- **G6** : la même marque grise **+** une marque crème `(248,230,185)` **3×4 px** en `(535,743)-(537,746)`.
  Nature de ces deux marques : **non identifiable depuis l'image** (elles sont dans l'empreinte du badge,
  qui est opaque).
- **G2 seul** porte une rangée de **3 pastilles** (anneau doré Ø 10 px + cadenas blanc), centres
  `(526,5 ; 529,5)`, `(539,5 ; 529,5)`, `(552,5 ; 529,5)` — espacées de 13 px, centrées sur la colonne du badge,
  **23 px au-dessus** du centre d'anneau. Vérifié sur les 11 bandes équivalentes (`26_bande_au_dessus.py`
  + planche `bande-dessus-contact.png`) : **aucun autre badge n'en porte**.

---

## Table par bâtiment

⚠️ **Ces boîtes sont LUES À L'ŒIL** sur les tuiles graduées publiées (`tuile-NO/NE/SO/SE.png`,
graduation 50 px), précision estimée **±10 px**. Elles sont tracées sur `mesures/overview-annote.png` :
une boîte fausse s'y voit. **L'inventaire n'est pas exhaustif** — voir « non vérifié ». Les
distances de la colonne précédente qui valent 0 ou < 40 px ont toutes été **recontrôlées au pixel**
sur les cartes ASCII ; seule la distance de G10 (234 px) dépend d'une boîte lue à l'œil.

| # | boîte (x0,y0)-(x1,y1) | nature / base au sol lisible | badge(s) porté(s) |
|---|---|---|---|
| T1 | (222,492)-(366,715) | immeuble-tour bleu ; base à `y≈705` (perron) | **G1** (2 libellés) |
| T2 | (398,404)-(578,612) | immeuble olive, escalier de secours ; base masquée par T19 | **G2** |
| T3 | (714,448)-(1008,792) | grand immeuble bleu, 2 châteaux d'eau ; base `y≈780` | **G3** |
| T4 | (0,588)-(126,742) | immeuble coupé par le bord gauche | — |
| T5 | (30,678)-(214,832) | immeuble bleu + commerce éclairé au RDC | **G4** |
| T6 | (352,648)-(474,742) | commerce à store rayé bleu/blanc | — |
| T7 | (196,742)-(346,872) | commerce, toit d'ardoise + souche ; store vert au RDC | — (G5 le frôle à 3,9 px) |
| T8 | (428,686)-(702,930) | « LE VERGE D'OR », toit-terrasse rosé, guirlandes ; **base au trottoir `y = 929,5` (mesurée, script `37`)** | **G6** (toit) — (G9 est 27,5 px sous sa base) |
| T9 | (940,636)-(1080,838) | immeuble olive, bord droit | — |
| T10 | (896,750)-(930,782) *(lue au zoom 9 sur `tuile-G7b.png`, ±3 px)* | **étal / comptoir en bois** au pied de T3 | **G7** |
| T11 | (58,884)-(302,1064) | bâtiment bas, toit d'ardoise, corps vert | **G8** |
| T12 | (196,912)-(344,1040) | bâtiment bas gris | — |
| T13 | (0,996)-(100,1116) | entrepôt brique « ENTREPÔT 5 », rideaux métalliques ; base `y≈1112` | — (le plus proche de G10, **234 px**) |
| T14 | (806,888)-(1002,1036) | « CHEZ MARA », auvent rouge | — |
| T15 | (1000,884)-(1080,1064) | immeuble, bord droit | — |
| T16 | (540,1050)-(900,1400) | « BRENNAR COAL & ICE », grand toit ; base sur le quai `y≈1395` | **G11** |
| T18 | (940,1120)-(1080,1330) | immeubles du bord droit bas | — |
| T19 | (430,586)-(560,700) | immeuble à château d'eau, sous T2 | — |

**Non bâtis, identifiés et écartés** (ils auraient pu être comptés comme masses) : la **camionnette
verte** en (0,1100)-(120,1160) (`tuile-G10nw.png`), la **grue** de quai, la **péniche** amarrée en
(245,1375)-(350,1460) (`tuile-quai.png`), les **étals de marché** et les **voitures**.

---

## L'hypothèse d'ancrage : **RÉFUTÉE**

> *« bas-centre, posé sur un `pivot_px` du bâtiment, indépendant de la largeur de cellule ; si les
> points d'ancrage tombent tous à la même hauteur relative des bâtiments, l'hypothèse tient. »*

**Ce que la mesure montre : les 11 centres d'anneau tombent EXACTEMENT sur une maille écran de
192 px, résidu 0,0 px sur les deux axes** (`31_appariement.py`) :

```
x = 155,5 + 192·i   i ∈ {0,1,2,3,4}   →  155,5  347,5  539,5  731,5  923,5   (écarts 192,0 ×4)
y = 552,5 + 192·j   j ∈ {0,1,2,4}     →  552,5  744,5  936,5  1320,5          (écarts 192,0 / 192,0 / 384,0)
résidu maximal sur 11 badges : |dx| = 0,0 px   |dy| = 0,0 px
```

5 colonnes × 192 = **960 px centrés dans 1080** (marges 60 px à gauche et à droite). La **rangée
j=3** (`y = 1128,5`) est **vide**, la rangée j=4 est occupée : l'occupation est irrégulière, la
**maille** ne l'est pas.

Onze points issus de la projection perspective de pivots 3-D distincts ne peuvent pas tomber sur un
réseau régulier de 192 px **dans les deux axes avec un résidu nul**. La position du badge ne porte
donc **aucune information** sur la géométrie écran de son bâtiment.

**Le corollaire « même hauteur relative » est réfuté séparément, et sans dépendre des boîtes :**
G1, G2 et G3 sont à la **même ordonnée** `552,5` alors que leurs immeubles n'ont ni le même sommet
(492 / 404 / 448) ni la même base (715 / 612 / 792). Sur les boîtes déclarées :

| badge | masse | ancrage au-dessus de la base | fraction depuis le sommet |
|---|---|---|---|
| G1 | T1 | **+142 px** | 0,36 |
| G2 | T2 | **+39 px** | 0,81 |
| G3 | T3 | **+219 px** | 0,36 |
| G4 | T5 | +66 px | 0,57 |
| G5 | T7 (frôlée) | +107 px | 0,18 |
| G6 | T8 | **+165 px** | 0,32 |
| G7 | T10 (étal) | +17 px | 0,47 |
| G8 | T11 | +107 px | 0,41 |
| G9 | T8 | **−27 px** (sous la base) | 1,11 |
| G10 | *aucune* | — | — |
| G11 | T16 | +59 px | 0,83 |

Dispersion **+17 → +219 px** et **0,18 → 1,11** : rien de constant. L'erreur de lecture des boîtes
(±10 px) est d'un ordre de grandeur inférieur à cet écart.

**Quatrième argument, indépendant** : G1 porte **deux** badges au **même pixel**. Deux bâtiments
distincts ne se projettent pas au même pixel.

**Ce que je ne peux PAS dire depuis l'image** : *pourquoi*. Je ne sais pas si les `pivot_px`
transmis sont eux-mêmes quantifiés sur cette maille (repli de mise en page), si le badge ignore
`pivot_px`, ou si un conteneur de grille écrase la position. **La mesure hors image qui trancherait
en une ligne : imprimer les 13 `pivot_px` du run et les confronter à mes 11 centres d'anneau** — s'ils
valent eux aussi `155,5 + 192·i`, le défaut est en amont du badge ; s'ils sont dispersés, il est dans
le placement.

---

## Non vérifié

1. **Le compte de badges est un PLANCHER, pas un total.** Le disque est opaque (9 empreintes 14×14
   identiques bit à bit sur 11 fonds différents) ⇒ **deux badges superposés portant le MÊME libellé
   sont rigoureusement indétectables**. Je mesure **12 libellés / 11 marqueurs** ; le dossier annonce
   13 bâtiments. L'écart est exactement de la taille d'un doublon invisible. Mesure qui trancherait :
   la liste des badges instanciés par le run, ou une capture avec les badges en semi-transparence.
2. **Une rangée de la maille est occultée.** `y = 552,5 + 192·6 = 1704,5` passe **derrière le dock**
   (les 4 pastilles rondes du bas). Un badge y serait masqué. Les rangées `360,5`, `1128,5` et
   `1512,5` sont, elles, visibles et vides — vérifié par l'oracle du point sur **toute** l'image.
3. **L'identité n'est pas établie** (journal du run non joint) : je ne sais pas quel bâtiment de jeu
   porte quel badge, donc **je ne juge jamais « le badge est sur le BON bâtiment »** — seulement
   « sur *un* bâtiment ». Un badge posé sur la façade du voisin serait compté ici comme « sur
   bâtiment ».
4. **Les boîtes T\* sont lues à l'œil (±10 px)** sur les tuiles graduées, et l'inventaire **n'est pas
   exhaustif** : les masses du bord droit bas, du fond sud-est et celles coupées par les bords n'ont
   pas toutes été recensées. Seule la distance **G10 = 234 px** en dépend (toutes les autres distances
   décisives sont mesurées au pixel sur les cartes ASCII).
5. **Aucune segmentation automatique n'a été trouvée** pour séparer bâtiment / toit / rue / trottoir :
   ni la couleur (toit `(77,94,114)` ≈ rue éclairée `(77,93,113)`), ni l'énergie de gradient (façade
   10 vs toit plat 8). La classification est donc **visuelle sur découpes publiées**, avec les
   frontières mesurées au pixel. Un lecteur qui conteste un verdict peut ouvrir la vignette nommée.
6. **Le badge occulte le sol qu'il désigne** (~64 × 27 px opaques). Pour G9 la jonction
   façade/trottoir tombe **exactement** derrière le disque ; je l'ai ajustée sur les **36 colonnes**
   voisines hors badge (pente mesurée 0,256, script `37`). Non vérifié : que cette pente se prolonge
   bien SOUS le badge.
7. **Une seule résolution, une seule heure.** 1080×1920, nuit. Rien ne dit ce que devient la maille
   de 192 px à une autre résolution ou un autre ratio — c'est pourtant la question qui décide si le
   défaut est visible sur téléphone. Mesure qui trancherait : la même capture en 720×1280 et en
   paysage.
8. **Les catégories « végétation » et « eau »** du dossier : la végétation (arbres en (60,880),
   (830,960)) n'est sous aucun ancrage ; l'eau n'est sous aucun ancrage **mais occupe ~50 % du
   disque de 40 px de G10**. Aucun badge n'est *dans* l'eau.
9. **Les deux marques intérieures de G5 et G6** (4×3 px grise ; 3×4 px crème) ne sont pas identifiées.
10. **Le libellé de G6 (« Point de vente ») est lu à l'œil**, sa moitié droite étant noyée dans
    l'enseigne au néon : le contrôle par bitmap n'est pas applicable (aucun second exemplaire de ce
    libellé dans l'image).

---

## Annexes — `mesures/`

**Scripts** (chacun imprime la taille de l'image qu'il ouvre) : `00_apercu` · `01_crop` ·
`02_sonde_couleur` · `03_couleurs_ui` · `04_detect_anneaux` · **`05_detect_badges`** (oracle A + ses
contrôles) · **`06_oracle_point`** (oracle B) · `07_sonde_texte` · `08/09_libelles` ·
`10/17_superposition` · **`11_bitmaps`** (contrôles ± sur les libellés) · **`12_boite_encre`**
(boîtes + ancrages) · `13/18` vignettes · `14_structure` · `15_sonde_points` ·
**`16_grille_reperes`** (tuiles graduées) · `19_profils` · `20_masque_local` · `21_bord_toit_G5` ·
`22/23/27` cartes ASCII · `24/28/29/37` profils de colonne et ajustement de la base de T8 · `25/26/36` pastilles ·
**`30_overview_batiments`** · **`31_appariement`** (maille + distances) · **`32_opacite`** ·
`33/34/35` disques.

**Images de preuve** : `overview-annote.png` (11 ancrages + 18 boîtes) · `ancrage-G1..G11.png`
(vignettes zoom 4, croix + cercle 40 px) · `zoom-G3/G5/G6/G7/G8/G9/G10.png` (zoom 8) ·
`libelles-contact2.png` (les 11 libellés) · `crop-G1.png` (la superposition, zoom 14) ·
`disques-contact.png` (les 11 disques) · `bande-dessus-contact.png` (les pastilles) ·
`tuile-NO/NE/SO/SE/quai/G7/G7b/G10nw.png` (graduées 50 px) · `crop-D8/D11.png` (les 2 faux positifs) ·
`masque-G5.png` · `carte-structure.png`.

**Données** : `cartes-ascii.txt` (11 cartes de luminance autour des ancrages) · `batiments.json`
(les 18 boîtes déclarées).
