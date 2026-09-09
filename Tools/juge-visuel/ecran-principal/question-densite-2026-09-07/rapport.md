# Question de juge — densité perçue de la vue de district de nuit — 2026-09-07

> Juge à contexte vierge. Je n'ai pas construit cet écran, je n'ai lu ni son code ni aucun rapport
> le concernant, et je ne corrige rien. Empreinte de l'image vérifiée contre `captures-provenance.md` :
> `sha256 = e77df7980b6e39ee7a997f97afe49beac9893f46ae8d47f3ba993b21a3726d64` (les 16 premiers hex
> correspondent). Image : `1080 x 1920`, RGB, non entrelacée — taille réimprimée par chacun des
> 10 scripts de `mesures/`.

---

## Réponse en trois lignes

1. **ENTRE LES DEUX, penché DENSE — mais la densité ne tient que le milieu.** La ville forme **une
   seule masse bâtie continue de bord à bord** (35,2 % de l'écran, bbox `x[0..1080]`), et dans le
   tiers du milieu **72,5 % des pixels sont bâtis**. Contre cela, **42,8 % de la hauteur d'écran ne
   montre aucune ville** : chrome 19,7 % + plan de sol nu 17,5 % + eau nue 5,6 %. C'est le
   **cadrage** qui est vide, pas le quartier.
2. **Ce qui manque en premier : une lisière.** Le bandeau de lieu annonce « La Lisière » et pointe
   sur **336 px de sol nu** fermés par des volumes gris qui portent **0,00 % de fenêtre allumée** et
   **11,9 % de détail**, quand chaque immeuble du cœur porte **18,8 à 20,7 % de fenêtres** et
   **73,5 à 85,2 % de détail**. La ville ne se prolonge pas : elle s'arrête net sur une dalle vide.
3. **Ce qui manque en second : du trafic sur un fleuve équipé pour ça.** Le quai porte bollards,
   lampadaires, grue, caisses et une péniche à écoutilles ; sous elle, **l'eau occupe 100 % de la
   largeur dès `y=1620`**, sur **9,7 % de l'écran**, avec **une seule embarcation** et rien d'autre
   que trois reflets de lampe.

---

## Composition décrite (masses, vides, ordre de lecture, lumière)

### Ce qui occupe l'espace

L'image est une vue isométrique haute, cadrée en portrait, **sans horizon et sans ciel** : le haut du
cadre est fermé par le bandeau d'interface, et le sol court jusque sous lui. Du haut vers le bas :

- **Un bandeau d'interface** (argent, manomètre « Brûlant / CHALEUR », « JOUR 53 / Aube »), dont le
  médaillon **déborde dans la scène** et dont un petit losange doré pointe vers le bas.
- **Un bandeau de lieu translucide** portant « La Lisière ».
- **Un grand plan de sol nu**, gris-bleu, parcouru de larges ombres portées à bord dur, **sans un
  seul objet**. Il est fermé en haut par deux volumes gris à toit incliné — des bâtiments à l'état de
  boîte : ni fenêtre, ni porte, ni lumière, ni cheminée.
- **Le corps de la ville** : trois immeubles hauts en fond, un immeuble-vitrine central au toit
  rouge portant l'enseigne « LE VERGER D'OR » et une guirlande d'ampoules, une trame serrée de
  petits commerces à store rayé, un marché, des véhicules (taxi jaune, berline grenat, camionnette,
  camion à plateau), un passage piéton, un feu tricolore, des arbres, des bancs.
- **Une usine/halle** au toit vert, à baies vitrées éclairées, adossée au quai.
- **Le quai** : longue dalle claire, alignement de lampadaires et de bollards, une grue en treillis,
  des caisses.
- **Le fleuve**, teinté cyan, uni, avec une péniche amarrée et trois reflets.
- **Le dock d'interface** (EMPIRE · FAMILLE · FILIÈRE · PLUS), précédé d'un voile dégradé qui assombrit
  l'eau sur ~85 px avant l'opacité pleine.

### Où va l'œil

1. **Le médaillon « Brûlant ».** C'est le seul élément fortement saturé de l'image (anneau orange sur
   fond noir), il est centré en x, en haut, et **il empiète sur la scène**. Il capte avant tout le reste.
2. **« LE VERGER D'OR ».** Le bâtiment le plus clair et le plus chaud du cadre, sur la bande
   `y 842–981` qui concentre **47,4 % de pixels chauds** contre 12,7 % pour la scène entière ; sa
   guirlande dessine une ligne de points brillants qui souligne l'angle de la façade. Il est posé au
   centre géométrique de la masse bâtie.
3. **La masse d'eau.** C'est le plus grand aplat d'une couleur unique de l'image, et le seul bloc
   franchement cyan dans une image bleu-gris.

Ce n'est qu'en **quatrième** position que l'œil remonte vers le haut du cadre — et n'y trouve rien.

### Masses, vides, lignes de fuite, lumière

- **Une seule masse bâtie**, pas un semis : les bâtiments se touchent et forment un bloc continu qui
  **sort du cadre à gauche et à droite**. C'est le signal de densité le plus fort disponible dans une
  image unique : la ville continue hors champ.
- **Les vides intérieurs sont des rues**, pas des trous : les plus grandes plages de sol nu à
  l'intérieur de la ville font 2,9 % et 2,4 % de l'écran, en lanières.
- **Le vide extérieur est un seul bloc** : la plus grande plage de sol nu contigu fait **13,5 % de
  l'écran, sur toute la largeur, en haut** (17,9 % en lui rendant la bande coupée par le bandeau de lieu).
- **Lignes de fuite** : deux diagonales parallèles descendant vers la droite (l'axe des rues) et une
  troisième, la ligne du quai, qui traverse tout le bas. Elles convergent hors cadre à droite ; rien ne
  les arrête à gauche.
- **Lumière** : source nocturne bleue et froide en ambiance, contrée par des lumières artificielles
  chaudes strictement localisées dans le corps de la ville. La ville est **1,46× plus lumineuse** que
  le plan vide du haut (L=80,0 contre 54,9).

---

## Mesures — avec la méthode et son contrôle positif

Toutes les valeurs ci-dessous sortent d'un script de `mesures/` ; chaque script réimprime la taille
de l'image. Les comptes ont été re-vérifiés par oracle Python hors couche d'affichage.

### Méthode, et le contrôle qui l'a d'abord réfutée

Le premier réflexe — séparer le bâti du sol **par la couleur** — est faux ici : sur cette image, les
toits d'ardoise et le sol nu rendent la **même** valeur (`RGB≈(70,88,106)`). La grandeur qui sépare
est **l'amplitude locale de luminance** (max−min sur 9×9). Elle a été validée **avant** tout comptage
(`03_grandeur.txt`), et son contrôle décisif n'est pas le sol plat mais **le bord d'ombre à bord dur**,
qui est exactement ce qu'une mesure de contraste local confond avec du bâti :

| contrôle | fraction de pixels à forte amplitude | attendu | verdict |
|---|---|---|---|
| bâti — tour gauche | 0,852 | haut | OK |
| bâti — immeuble central | 0,767 | haut | OK |
| bâti — usine | 0,735 | haut | OK |
| bâti — commerces | 0,782 | haut | OK |
| sol nu plat | 0,239 / 0,223 | bas | OK |
| eau | 0,007 | bas | OK |
| dalle de quai | 0,470 | bas | OK |
| **bord d'ombre sur sol nu** | **0,186 / 0,153** | **bas** | **OK** |

Plancher des positifs **0,735**, plafond des négatifs **0,470** → séparation nette. Seuil de bloc pris
**dans l'écart** (0,60), sur des blocs 24×24. Règle « eau » séparée, par couleur (`g−r ≥ 30` et
`b−r ≥ 45`), validée sur 2 positifs et 5 négatifs (`05_classes.txt`).

**Ce que le classifieur ne fait pas** : il compte comme « bâti » le mobilier de quai et quelques bords
d'ombre isolés du haut (visibles en fines lignes rouges sur `mesures/07_classification.png`). La part
bâtie annoncée est donc un **léger plafond**, jamais un plancher.

### Découpage de l'écran en 5 bandes — frontières mesurées, somme contrôlée

Frontières du chrome mesurées (`04_chrome.txt`) : règle orange du bandeau à `y=141–142` ; voile du
dock amorcé à `y=1684` (x=20) et `y=1687` (x=1060), opacité pleine à `y≈1770`.

| bande | y | hauteur | % de l'écran |
|---|---|---|---|
| bandeau (chrome) | 0–141 | 142 px | **7,40 %** |
| plan vide du haut | 142–477 | 336 px | **17,50 %** |
| bande bâtie (la ville) | 478–1576 | 1099 px | **57,24 %** |
| eau nue | 1577–1683 | 107 px | **5,57 %** |
| dock (chrome) | 1684–1919 | 236 px | **12,29 %** |

Contrôle **somme = total** : `2 073 600 px vs 2 073 600 px → OK`.

### Aires par classe (scène = 1 665 360 px, soit 80,3 % de l'écran)

| classe | px | % de la scène | % de l'écran |
|---|---|---|---|
| bâti | 772 015 | **46,4 %** | 37,2 % |
| sol nu | 644 615 | **38,7 %** | 31,1 % |
| eau | 200 856 | **12,1 %** | 9,7 % |
| chrome empiétant (médaillon, bandeau de lieu, losange) | 47 874 | 2,9 % | 2,3 % |

**Sensibilité au seuil** (le verdict ne doit pas tenir à un réglage) : part bâtie = 52,6 % / 49,0 % /
**46,4 %** / 43,8 % / 41,1 % pour un seuil de 0,50 / 0,55 / 0,60 / 0,65 / 0,70. La conclusion « environ
la moitié de la scène est bâtie » tient sur toute la plage.

### Répartition par tiers de l'écran (640 px chacun)

| tiers | contenu |
|---|---|
| **1** (y 0–639) | **sol nu 52,3 %** · bandeau 22,2 % · bâti 18,5 % · chrome empiétant 6,9 % |
| **2** (y 640–1279) | **bâti 72,5 %** · sol nu 27,4 % |
| **3** (y 1280–1919) | dock 36,9 % · **eau 28,8 %** · bâti 20,7 % · sol nu 13,6 % |

### Composition et luminance par bande

| bande | L moyenne | pixels chauds | composition |
|---|---|---|---|
| bandeau | 29,0 | 7,50 % (texte d'interface) | chrome 100 % |
| plan vide du haut | 51,5 \* | **1,22 %** | **sol nu 77,2 %** · bâti 9,6 % · overlay 13,2 % |
| bande bâtie | 80,0 | **17,08 %** | **bâti 62,1 %** · sol nu 30,7 % · eau 7,2 % |
| eau nue | 75,0 | **0,00 %** | eau 99,7 % |
| dock | 33,0 | 1,13 % | chrome 100 % |

\* 51,5 **overlays compris** (le bandeau de lieu est un aplat sombre). Hors overlays, la même bande
rend **54,9**, et c'est cette valeur qui sert au rapport de contraste ci-dessous — les deux sont
imprimées par `10_zones.py`, sections 3 et 5.

### Masses bâties distinctes, et vides

- **38 composantes** de blocs bâtis, mais **une seule compte** : `1266 blocs = 729 216 px = 35,2 % de
  l'écran`, bbox `x[0..1080] y[406..1534]`. La deuxième fait **0,5 %**. La ville est **un bloc**, pas
  un semis d'objets isolés, et **elle touche les deux bords du cadre**.
- **Plus grande plage de sol nu contigu** : `486 blocs = 279 936 px = 13,5 % de l'écran`, bbox
  `x[0..1080] y[262..718]` — le plan du haut, **sur toute la largeur**. Les deux plages suivantes
  (2,9 % et 2,4 %) sont intérieures à la ville : ce sont des rues.
- **90 % de la matière bâtie** tient entre `y=462` et `y=1462`, soit **52,1 % de la hauteur d'écran**.

### Vie : lumière artificielle, mesurée dans la scène seule

Le fond de nuit est bleu ; un pixel où R dépasse B est éclairé par une lampe ou une fenêtre. Le texte
du bandeau étant chaud lui aussi, il est **exclu de la population** (le compter serait une faute).

| bande | pixels chauds |
|---|---|
| y 142–281 | 2,65 % |
| **y 282–421** | **0,02 %** |
| y 422–561 | 5,27 % |
| y 562–701 | 8,49 % |
| y 702–841 | 34,67 % |
| **y 842–981** | **47,36 %** |
| y 982–1121 | 22,32 % |
| y 1122–1261 | 5,67 % |
| y 1262–1401 | 7,51 % |
| y 1402–1541 | 2,94 % |
| **y 1542–1683** | **0,00 %** |
| **total scène** | **12,72 %** |

- **228 taches lumineuses distinctes** (≥ 25 px, claires et chaudes), dont 150 concentrées entre
  `y=400` et `y=1000`, et **6 seulement** en dessous de `y=1400`.
- **12 marqueurs jouables visibles** — 11 à signature strictement constante (52 px, bbox 14×14,
  recomptés par oracle Python) plus 1 **rogné par le bord droit** du cadre (34 px, bbox 12×14, à
  `x=1021`). Étiquettes lisibles : *Commerce-écran* ×5, *Laboratoire*, *Cache*, *Serre*,
  *Point de vente*, *Planque* ×2.

> **Le premier détecteur de marqueurs rendait 0 et son contrôle positif l'a refusé** : j'avais supposé
> un anneau de 28 px et 110 pixels ; il en fait **14 et 52**. Le zéro venait de mon motif, pas de
> l'image. Le compte publié vient du détecteur réparé, dont les deux contrôles positifs et les deux
> contrôles négatifs passent (`09_marqueurs.txt`).

### Le haut est-il VIDE, ou seulement SOMBRE ?

Question posée explicitement, parce qu'une bande sombre et une bande vide se ressemblent. Deux
mesures : relevé des basses lumières (`11_haut_releve.png`, gamma 0,38) et comparaison de la
**signature d'un bâtiment habité** entre le haut et le cœur.

| zone | L moyenne | **L max** | fenêtres/lampes | détail |
|---|---|---|---|---|
| immeuble central (témoin) | 65,3 | **251** | **20,71 %** | 76,7 % |
| tour gauche (témoin) | 77,4 | **248** | **18,83 %** | 85,2 % |
| usine du quai (témoin) | 67,6 | **246** | 5,84 % | 73,5 % |
| **bloc gris, coin haut-droit** | 45,4 | **80** | **0,00 %** | **11,9 %** |
| bloc gris, coin haut-gauche | 44,3 | 125 | 1,00 % | 18,5 % |
| plan de sol, centre haut | 54,6 | 157 | 0,16 % | 26,8 % |

**Un bloc dont le pixel le plus clair plafonne à 80 et qui porte 0,00 % de fenêtre n'est pas sombre :
il est sans fenêtres et sans détail.** Le relevé des basses lumières le confirme à l'œil : une dalle
lisse, des ombres, deux prismes gris nus.

### Le fleuve

Largeur d'eau nue par ligne : 8,2 % à `y=1400`, 44,5 % à `y=1500`, 84,1 % à `y=1540`, 99,0 % à
`y=1580`, **100,0 % de `y=1620` à `y=1683`**. Aire totale **200 856 px = 9,7 % de l'écran** — recomptée indépendamment par un second
échantillonnage (1 px sur 2) à **200 960 px**, soit un écart de 0,05 %. Objets
posés dessus : **une péniche** et trois taches de reflet. Aucune deuxième embarcation, aucune bouée,
aucun sillage, aucune rive opposée.

---

## Ce qui fait pencher (perçu, séparé du mesuré)

### Du côté DENSE

- **Perçu** : la ville « continue » hors du cadre. C'est l'impression dominante quand on descend au
  milieu de l'écran — les toits se chevauchent, les rues sont étroites, rien ne se détache comme objet
  isolé. — **Mesuré** : une seule masse bâtie de 35,2 % de l'écran, bbox `x[0..1080]` ; part bâtie
  jamais inférieure à 31,8 % sur aucune colonne de 60 px, et comprise entre 47 % et 70 % sur **17
  colonnes sur 18** (la seule exception est la colonne de bord `x 1020–1079`, à 31,8 %).
- **Perçu** : ça vit. Vitrines, stores, marché, camion, taxi, guirlande, passage piéton, feu, quelques
  figurines humaines au sol. — **Mesuré** : 228 taches lumineuses distinctes ; 47,4 % de pixels chauds
  au cœur ; 12 marqueurs jouables.
- **Perçu** : les vides du cœur se lisent comme des rues, pas comme des trous. — **Mesuré** : plus
  grande plage de sol nu **intérieure** = 2,9 % de l'écran, en lanière.

### Du côté VIDE

- **Perçu** : le regard, après avoir lu « La Lisière », tombe sur une dalle grise où il n'y a rien à
  regarder — et c'est l'endroit le plus haut de l'image, donc celui qu'on lit en premier après
  l'interface. — **Mesuré** : bande `y 142–477`, 17,50 % de l'écran, **77,2 % de sol nu**, **1,22 % de
  pixels chauds**, et sur `y 282–421` un plancher à **0,02 %**.
- **Perçu** : la ville ne se prolonge pas vers le fond, elle est bordée par des boîtes grises. —
  **Mesuré** : 0,00 % de fenêtre et L max = 80 sur le bloc du coin haut-droit.
- **Perçu** : le bas de l'écran est une grande étendue morte. — **Mesuré** : eau 9,7 % de l'écran à
  **0,00 % de pixels chauds**, 100 % de la largeur dès `y=1620`, une seule embarcation ; puis 12,29 %
  de dock.
- **Mesuré, cumul** : **42,76 % de la hauteur d'écran** ne porte aucune ville (7,40 + 17,50 + 5,57 +
  12,29).

### Verdict, et de combien

**Entre les deux, du côté DENSE — mais de peu, et par le milieu seulement.** Le quartier lui-même est
dense (72,5 % de bâti dans le tiers du milieu, une masse continue de bord à bord) ; **l'écran** ne
l'est pas (52,3 % de sol nu dans le tiers du haut). L'écart se chiffre : il suffirait que **les 17,5 %
de plan vide du haut** portent ce que porte déjà le reste de l'image pour que la lecture bascule sans
ambiguïté du côté dense — c'est **un sixième de l'écran** qui décide, et il est aujourd'hui à
0,02–1,22 % de lumière contre 17,08 % pour la bande bâtie.

Formulé comme le percevrait un joueur qui ouvre l'écran pour la première fois : **« une ville dense,
photographiée de trop loin par le haut »**.

---

## Si quelque chose manque — nommé par ce que la scène montre déjà

1. **Une lisière sans façades.** Le bandeau dit « La Lisière ». Ce que la scène montre à cet endroit :
   deux prismes gris à toit incliné, sans une seule fenêtre. Ce que la même scène montre 300 px plus
   bas : des immeubles à 6 rangs de fenêtres, cheminées, châteaux d'eau, escaliers de secours,
   enseignes. **Le vocabulaire existe dans l'image ; il n'est pas employé au bord.**
2. **Un fleuve sans trafic, sur des quais équipés pour en avoir.** La scène montre une grue en
   treillis, des caisses empilées, des bollards d'amarrage alignés sur toute la longueur du quai, et
   une péniche à écoutilles ouvertes. **Un seul de ces bollards sert.** Rien d'autre ne flotte sur les
   200 960 px d'eau.
3. **Une rive opposée absente.** La scène montre une berge — dalle, lampadaires, garde-corps — sur un
   seul côté. En face, à partir de `y=1620`, l'eau va au bord du cadre sans rien montrer. **La scène
   sait dessiner une rive ; elle n'en dessine qu'une.**
4. **Un cadre sans horizon.** Il n'y a ni ciel, ni ligne de fuite haute, ni silhouette lointaine : le
   sol court jusque sous le bandeau. Tout ce que la scène met en hauteur — toits, cheminées, châteaux
   d'eau, la grue — n'a **aucun écho dans le fond**.
5. **Un sol de district sans sol de district.** La scène montre, dans le cœur, des trottoirs, un
   passage piéton, des bordures, des plaques d'égout, des arbres en bac. Le plan du haut, à surface
   comparable (13,5 % de l'écran d'un seul tenant), **ne porte aucun de ces éléments** — pas une
   bordure, pas un lampadaire, pas une marque au sol.

*Observation hors du champ de la question (le dossier dit que le chrome n'en est pas l'objet, je la
consigne sans la faire peser sur le verdict) : les quatre pastilles du dock sont des disques sombres
**vides**, sans pictogramme ; elles occupent le bas de l'écran et ajoutent à l'impression de vacance
générale.*

---

## Non vérifié

| point | pourquoi je ne peux pas trancher | la mesure qui trancherait |
|---|---|---|
| **Une seule résolution** (1080×1920) | Les bandes de chrome mesurées (7,40 % et 12,29 %) sont peut-être en pixels fixes ; à 1080×2400 la part de scène changerait, donc aussi le rapport ville/vide. | Rejouer `10_zones.py` sur une capture 1080×2400 et une 720×1280, et comparer le tableau des 5 bandes. |
| **Une seule vue** (ni déplacement ni zoom) | Je ne sais pas si le plan vide du haut est le **bord du district** ou une zone que la caméra cadre mal. Les deux produisent la même image. | Rejouer `05_classes.py` sur une capture après un panoramique vers le haut, puis après un dézoom : si la part « sol nu » de la bande haute reste ≥ 70 %, c'est le monde ; si elle tombe, c'était le cadrage. |
| **La nuit seulement** | Les deux blocs gris pourraient porter un détail que la nuit efface. Mon `L max = 80` est une mesure de nuit. | Rejouer `11_haut_vide_ou_sombre.py` sur la planche de **jour**, sur les **mêmes bbox** : si `fenêtres %` reste à 0,00 et le détail sous 20 %, les blocs sont nus ; sinon c'est un défaut d'éclairage. |
| **Pas de référence ni de maquette** | Je juge la densité *perçue*, pas la densité *visée*. Je ne peux pas dire si ce cadrage est celui qui a été ratifié. | Passer le même découpage en 5 bandes sur la maquette ratifiée de ①, et comparer les cinq pourcentages. |
| **Identité du compte non établie** (le dossier le dit) | Un district à peu de bâtiments possédés et un district plein donnent la même image à mes instruments. Les 12 marqueurs ne me disent pas combien il **devrait** y en avoir. | Le journal du run + l'empreinte du compte (nombre de bâtiments du district en base), confrontés au compte de marqueurs. |
| **Comptage exhaustif des figurines humaines** | J'en ai repéré à l'œil au moins 5 ou 6 sur deux découpes ; je n'ai pas construit de détecteur, donc je n'avance aucun chiffre. | Un détecteur de silhouettes contrôlé sur deux témoins repérés à l'œil, puis balayé sur la scène. |
| **Marqueur rogné au bord droit** | Je constate un marqueur incomplet à `x=1021` ; je ne sais pas s'il y en a d'autres **entièrement** hors cadre. | Le même détecteur sur une capture dézoomée : si le compte monte, le cadrage coupe des marqueurs. |
| **Part bâtie exacte** | 46,4 % au seuil 0,60, mais 41,1 % à 0,70 et 52,6 % à 0,50 ; et le classifieur compte le mobilier de quai comme bâti. | Un masque tracé à la main sur les silhouettes de bâtiments, comparé au masque automatique bloc à bloc. |
| **Ce que le voile du dock cache** | Le voile assombrit 85 px d'eau avant l'opacité pleine ; s'il y avait quelque chose dessous, je ne le verrais pas. | Une capture sans dock, ou la même sonde d'amplitude locale sur la bande `y 1684–1770` après compensation du dégradé. |

---

## Annexes : scripts + sorties (`mesures/`)

| script | ce qu'il fait | sortie |
|---|---|---|
| `01_profil.py` | taille, profil de luminance par ligne, ruptures, 13 sondes de couleur | `01_profil.txt` |
| `02_marque_sondes.py` | marque les sondes pour les **vérifier à l'œil** — a montré qu'une sonde nommée « toit » était sur le **sol** | `02_sondes_*.png` |
| `03_grandeur.py` | **choix de la grandeur avant tout comptage**, avec le négatif discriminant « bord d'ombre » | `03_grandeur.txt`, `03_amplitude_locale.png` |
| `04_chrome.py` | frontières mesurées du bandeau, du médaillon, du bandeau de lieu et du dock | `04_chrome.txt` |
| `05_classes.py` | aires par classe, contrôles eau + blocs, sensibilité au seuil, tiers, luminance | `05_classes.txt` |
| `06_masses.py` | profils vertical et horizontal, bande à 90 % du bâti, masses connexes, vie par bande | `06_masses.txt` |
| `07_annote.py` | rend la classification visible (rouge/jaune/bleu/gris) | `07_classification.png` |
| `08_peuplement.py` | marqueurs (**détecteur refusé par son contrôle positif**), taches lumineuses, eau | `08_peuplement.txt` |
| `09_marqueurs.py` | détecteur de marqueurs **réparé**, 2 contrôles positifs + 2 négatifs | `09_marqueurs.txt`, `09_marqueurs.png` |
| `10_zones.py` | découpage en 5 bandes, contrôle **somme = total**, largeur d'eau par ligne, contraste | `10_zones.txt` |
| `11_haut_vide_ou_sombre.py` | vide ou sombre : relevé des basses lumières + signature « bâtiment habité » | `11_haut.txt`, `11_haut_releve.png` |
| `12_vides.py` | plus grandes plages de sol nu contigu vs plus grandes masses bâties | `12_vides.txt`, `12_vides.png` |

Découpes d'inspection à résolution native dans `mesures/coupes/`.
