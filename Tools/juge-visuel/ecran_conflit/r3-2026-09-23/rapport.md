# Juge visuel ⊥ — ㉙ Le conflit — r3 — 2026-09-23

## Contrôle positif — ce que l’instrument trouve ÉGAL

Tolérances appliquées : position/taille ≤ 2 px **ou** ≤ 1,5 % du parent ; couleur ≤ 6/255 par canal ; capitale ≤ 1 px ou ≤ 5 % ; espacement ≤ 10 % ; rayon ≤ 2 px.

1. Les trois images font **1080 px de large**.
2. Le papier crème est exactement **(242,236,224)** dans la référence et le jeu, delta **(0,0,0)**.
3. Le crème du titre est exactement **(240,223,196)** des deux côtés.
4. Le crème des noms de famille est exactement **(239,230,212)** des deux côtés.
5. Le trait de la serviette est exactement **(203,191,164)** des deux côtés.
6. L’or du CTA est **(217,171,78)** contre **(217,171,77)**, delta **(0,0,-1)**.
7. Le rouge de cible est **(140,47,54)** contre **(140,46,53)**, delta **(0,-1,-1)**.
8. L’aplat d’une carte normale est **(36,28,20)** contre **(34,28,22)**, delta **(-2,0,+2)**.
9. L’aplat de la carte ciblée est **(46,33,20)** contre **(46,34,22)**, delta **(0,+1,+2)**.
10. La bande basse est **(20,26,33)** contre **(22,28,34)**, delta **(+2,+2,+1)**.
11. L’entête est **(32,24,15)** contre **(34,22,13)**, delta **(+2,-2,-2)**.
12. La largeur d’encre plate de la serviette est **980 px** contre **988 px**, delta **+8 px = +0,74 % de l’écran**, sous 1,5 %.
13. La largeur d’encre plate de la carte ciblée est **974 px** contre **978 px**, delta **+4 px = +0,37 %**.
14. La hauteur d’encre du titre est **41 px** contre **40 px**, delta **-1 px**.
15. La hauteur d’encre de « Tarcum » est **25 px** contre **24 px**, delta **-1 px**.
16. Entre les deux captures, la serviette, la carte ciblée et les deux premières cartes normales ont des boîtes **strictement identiques**.
17. Les contrastes mesurés restent très proches pour le titre (**13,39:1 / 13,51:1**), la phrase (**13,43:1 / 13,33:1**), le rouge sur papier (**6,93:1 / 6,98:1**), les noms de famille (**13,54:1 / 13,60:1**) et le CTA (**7,91:1 / 7,97:1**).

Scripts : `mesures/mesure_geometrie.py`, `mesures/mesure_palette_contraste.py`, `mesures/mesure_parties.py`. Chacun imprime les dimensions lues et porte un contrôle positif ; les deux premiers contrôles négatifs discriminent respectivement l’ancrage vertical et la teinte des métadonnées.

## Verdict : NON APPROUVÉ

Le but et l’ordre général restent lisibles, mais cinq écarts majeurs changent au premier regard le rythme, le chrome, la formulation du coup et la hiérarchie colorée de la maquette.

## 0. L’écran, tel que la maquette le dit

Le joueur vient préparer un coup irrévocable du soir et doit comprendre en une phrase qui part, chez quelle famille et sur quelle cible. L’œil rencontre d’abord « Le coup de ce soir », grand titre crème sur brun. Il tombe ensuite sur la serviette crème, élément héros qui condense l’ordre et souligne la famille en rouge. La seconde moitié de la serviette dit ce qui sera pris si le coup réussit. Vient alors la liste des quatre familles, stable et répétitive, avec La Coil isolée par le laiton et « CE SOIR ». Enfin, la bande bleu nuit fait parler Lt. Kest et porte la confirmation. Les zones sont donc : chrome d’état, entête d’action, ordre papier, registre des familles, réplique/CTA. Les traits d’identité sont la chaleur bois/sépia, le papier crème, le rouge d’accent dans l’ordre, l’écu de chaque famille, le laiton de la cible et la rupture froide du bas. La scène urbaine sombre derrière le chrome et la continuité verticale sans grand trou donnent à l’ensemble son ton de table du fond.

## 4. Lecture globale — l’écran en jeu se lit-il comme la maquette ?

Oui pour le squelette : titre, serviette, quatre familles, réplique et CTA restent identifiables dans cet ordre.
La serviette reste l’élément héros et La Coil reste repérable par sa carte et le badge « CE SOIR ».
Le premier écart de tête est propre au 2400 : **458 px** de vide remplacent les **7 px** de liaison entre la dernière carte et la bande basse.
Ce vide casse le mouvement « familles → réplique → décision » et fait paraître le CTA détaché du dossier.
Le deuxième est le chrome haut : son occupation tombe de **434 px (40,19 % W)** à **233 px (21,57 % W)** et la silhouette urbaine disparaît.
Le troisième est la serviette : la cible détaillée et le butin ratifiés deviennent « leurs installations », tandis que le rouge de « La Coil » disparaît de la phrase.
Le corps des cartes passe en outre d’une métadonnée chaude **(138,127,107)** à un bleu-gris clair **(184,194,204)** ; sa dominance visuelle augmente avec un contraste de **4,26:1 à 9,33:1**.
La couche globale le confirme : au 2400, luminance **9,92 %** et densité résiduelle **14,73 %**, contre **12,75 %** et **19,38 %** dans la référence.
Au 1920, sans le grand vide, ces valeurs remontent à **12,18 %** et **18,33 %** : le défaut principal est donc bien l’ancrage, pas toute la palette.
Le titre, les aplats structurants, les largeurs et les contrastes principaux tiennent ; ce n’est pas un écran reconstruit dans un autre langage.
Il n’y a pas de bloquant : le joueur comprend encore l’action et voit le CTA, mais les écarts majeurs interdisent l’approbation.

## 3. Écarts

| # | partie (id) | classe | réf | jeu | delta | script | note |
|---:|---|---|---|---|---|---|---|
| 1 | `R2400.rythme-bas` | **MAJEUR** | dernière carte → bande basse : **7 px** | **458 px** | **+451 px = +41,76 % W** | `mesure_geometrie.py` | La hauteur 2400 est assumée, mais ce trou incohérent est précisément la condition qui la fait sortir de l’assumé. |
| 2 | `C.scene-haute` | **MAJEUR / ABSENT EN JEU** | scène/chrome jusqu’à **y=434**, soit **40,19 % W**, avec silhouette urbaine | contenu dès **y=233**, soit **21,57 % W**, sans silhouette homologue | **-201 px = -18,61 points W** | `mesure_geometrie.py` + lecture pixels | Le chrome reste sombre et mafieux, mais perd un décor et presque la moitié de son rythme vertical. |
| 3 | `O.cible-et-prise` | **MAJEUR** | « sur l’entrepôt de Dépôt-Est » ; prise « la ferraille de leur dépôt » | « sur leurs installations » ; prise « leurs installations » | contenu sémantique différent | lecture pixels | Le « sur quoi » devient générique et la réponse à « ce qu’on prend » ne désigne plus un butin. Données fabriquées : aucune conclusion back n’en est tirée. |
| 4 | `O.famille-rouge` | **MAJEUR / ABSENT EN JEU** | encre rouge de « La Coil » : bbox **129×26 px** | aucun pixel du token rouge dans la zone de phrase | accent absent | `mesure_parties.py` | Le rouge subsiste dans la valeur basse, mais plus sur la famille dans la phrase héros. |
| 5 | `F.meta-couleur` | **MAJEUR** | chaud **(138,127,107)**, contraste **4,26:1** | bleu-gris **(184,194,204)**, contraste **9,33:1** | **(+46,+67,+97)** | `mesure_palette_contraste.py` | Famille de teinte et hiérarchie changées ; l’exact token de référence pose toutefois un arbitrage de contraste, voir plus bas. |
| 6 | `H/O.rythme` | MINEUR | entête plat **204 px** ; serviette **326 px** ; bord→serviette **+36 px** | **166 px** ; **272 px** ; **-22 px** (chevauchement) | **-38 px**, **-54 px (-16,6 %)**, bascule de **58 px** | `mesure_geometrie.py` | Cause commune probable : composition verticale différente ; l’ordre de lecture reste intact. |
| 7 | `H.sous-titre` | MINEUR | « …un homme, et on l’envoie… », encre sur **53 px** et deux lignes | « …qui y envoyer… », **22 px** et une ligne | **-31 px** d’encre verticale + copie | `mesure_parties.py` | Sens proche, rythme différent. |
| 8 | `O.avatar` | MINEUR | disque d’encre **115×116 px** ; silhouette pâle | **98×90 px** ; buste sombre au chapeau | **-17×-26 px** | `mesure_parties.py` | Élément secondaire, mais forme et poids changent côte à côte. |
| 9 | `F1.meta-texte` | MINEUR | « les ferrailleurs de Spine » | « la ferraille, à Spine » | copie différente | lecture pixels | Même territoire, formulation ratifiée non reprise. |
| 10 | `F*.historique` | MINEUR | « on ne les a pas croisés » | « on n’a jamais croisé leur route » | copie différente, 4 occurrences | lecture pixels | Même sens ; chasse et densité augmentent. |
| 11 | `F.espacement` | MINEUR | écarts d’encre entre cartes normales **24 / 24 px** | **28 / 27 px** | **+4 / +3 px**, soit **+16,7 % / +12,5 %** | `mesure_geometrie.py` | Hors tolérance d’espacement 10 %, sans effet sur l’ordre. |
| 12 | `B.cta-copie` | MINEUR | « L’ENVOYER CE SOIR » ; « on ne pourra plus le rappeler » | « L’envoyer ce soir » ; « pas de rappel possible » | casse et formulation | lecture pixels | Action et irréversibilité restent claires. |
| 13 | `A.argent-jour` | ASSUMÉ | valeurs renseignées | « — » | état sans session | dossier + lecture pixels | Géométrie lisible, aucun libellé de repli cassé. |
| 14 | `A.dock` | ASSUMÉ | hors cadre de la référence | quatre ronds vides ; « FILIÈRE » | hors périmètre de ㉙ | dossier + lecture pixels | Formes régulières, aucun débordement, libellés lisibles. |
| 15 | `A.hauteur-2400` | ASSUMÉ | image **1080×2102** | **1080×2400** | **+298 px** de hauteur | scripts | La hauteur seule est admise ; le trou de la ligne 1 ne l’est pas. |
| 16 | `A.données-ordre` | ASSUMÉ | état ratifié | données déterministes | provenance non live | dossier | Ne prouve aucune valeur du back. |
| 17 | `C.heat/locale` | ARBITRAGE | « tiède » + « HEAT » | « CHALEUR » | langue et niveau affiché diffèrent | lecture pixels | Le canon français favorise « CHALEUR » ; l’absence du niveau et l’angle d’aiguille demandent un état live avant jugement. |
| 18 | `F.meta-contraste` | ARBITRAGE | token chaud mesuré à **4,26:1**, sous le plancher **4,5:1** | bleu-gris à **9,33:1** | gain net de contraste | `mesure_palette_contraste.py` | La dérive froide est un écart, mais revenir exactement au token de référence contredirait la doctrine de contraste. |

## 5. Autres résolutions

### 1080×2400

Ne tient pas : aucune coupe latérale ni débordement de parent, mais le corps extensible crée **458 px** entre la dernière carte et la bande basse, contre **7 px** dans la référence. La bande basse commence à **y=1849** et le dock à **y=2152**. Les familles sont toutes visibles ; le défaut est le vide, non une perte d’accès.

### 1080×1920

Tient sous la doctrine de scroll annoncée dans le dossier. La serviette, la carte cible et les deux premières cartes normales ont exactement les mêmes boîtes que dans le 2400. La bande basse remonte de **480 px**, exactement comme la hauteur d’image : **y=1369** contre **1849**. Dans l’état initial, **22 px** de la quatrième carte que montre le 2400 passent sous la bande basse ; la carte reste partiellement visible et son nom/métadonnée sont lisibles. Aucune preuve fixe ne montre toutefois le déplacement de scroll qui rendrait son bas accessible : ce point reste non vérifié, pas classé défaut.

## 6. Non vérifié

- **Accessibilité complète de Saltline à 1080×1920** : une capture après scroll ou une courte interaction enregistrée doit montrer le bas de la carte et l’absence de cul-de-sac sous la bande basse.
- **Animation en jeu** : aucune paire T/T+1 s n’est fournie. Le bloc source `.cfl6` lu ne déclare ni `animation` ni `@keyframes` propre, mais cela ne prouve pas le comportement du client ; il faut deux captures horodatées du runtime.
- **État réel du manomètre** : la capture déterministe sans session ne permet pas de savoir si « tiède » et l’angle d’aiguille doivent être portés ; il faut une capture live avec provenance d’état.
- **Familles de police au runtime** : les hauteurs d’encre sont mesurées, mais une image ne certifie pas le fichier de police ; un `fc-match`/inventaire des fontes réellement chargées trancherait. Le dossier affirme DejaVu des deux côtés.
- **Valeurs du back** : ARGENT, JOUR, identité, cible et axe sont déterministes ; seule une capture live avec provenance peut les établir.
- **États non fournis** : « pas de gros bras », « en cours », « rentré », historique non vide, erreur et états pressé/confirmé du CTA.
- **Interaction** : zones tactiles, focus, scroll réel, confirmation irrévocable et retour après envoi ne se lisent pas dans un PNG.
- **Étendue exacte des ombres/halos et rayons externes** : l’anti-crénelage et les dégradés les rendent bruités dans l’image ; une capture sur fond uni ou les propriétés de rendu calculées permettraient de les isoler.

## Annexes

### 1. Inventaire de la référence

Échelle établie : **300 CSS → 1080 px, ×3,6**. Toutes les proportions ci-dessous sont rapportées à la largeur 1080.

| id / catégorie / parent | bbox d’encre mesurée | forme, remplissage, bord, effet | texte et relations |
|---|---|---|---|
| `C0` chrome / écran | `(0,0,1080,434)`, **100 % W × 40,19 % W** | bleu-noir, silhouette urbaine, manomètre rond laiton centré ; cadre arrondi | ARGENT à gauche, JOUR à droite, « tiède / HEAT » au centre ; précède directement `H`. |
| `H` entête / écran | aplat `(3,434,1077,638)`, **99,44 % W × 18,89 % W** ; bord y=`638..640` | rect brun **(32,24,15)**, bord **(61,48,36)** de 3 px | titre bbox `(53,480,506,521)`, capitale/encre 41 px ; sous-titre `(52,543,920,596)`, deux lignes. |
| `O` serviette / corps | `(50,677,1030,1003)`, **90,74 % W × 30,19 % W** | rect crème **(242,236,224)**, coins arrondis, ombre visible ; trait **(203,191,164)** de 3 px | avatar `(93,716,208,832)` ; phrase `(243,733,817,816)` ; famille rouge `(679,733,808,759)` ; prise gauche `(92,903,426,943)`, valeur `(662,896,990,962)`. |
| `L` titre de liste / corps | `(53,1038,685,1058)`, **58,52 % W × 1,85 % W** | sans fond propre, capitales espacées, brun-gris chaud | « LES QUATRE FAMILLES DE BRENNAR », aligné sur la gouttière des cartes. |
| `F1` carte ciblée / liste | aplat `(53,1087,1027,1246)`, **90,19 % W × 14,72 % W** | rect arrondi brun **(46,33,20)**, bord/halo laiton ; écu bouclier | nom `(214,1133,343,1159)` ; meta chaude `(214,1178,658,1195)` ; historique à droite ; badge bbox d’encre/bord `(824,1141,995,1192)`. |
| `F2` Tarcum / liste | `(53,1270,1027,1428)`, **90,19 % W × 14,63 % W** | rect brun **(36,28,20)**, bord **(61,48,36)**, écu | nom crème, meta chaude, historique à droite. |
| `F3` Gorge-de-Fer / liste | `(53,1452,1027,1611)`, **90,19 % W × 14,72 % W** | même gabarit normal | nom plus large sans collision ; rythme homologue. |
| `F4` Saltline / liste | `(53,1635,1027,1780)`, **90,19 % W × 13,43 % W** visible | même gabarit normal ; rejoint le séparateur bas | texte lisible ; bas proche de `B`. |
| `B` bande basse / écran | `(3,1787,1077,2085)`, **99,44 % W × 27,59 % W** ; séparateur `(3,1780,1077,1787)` | rect bleu nuit **(20,26,33)**, trait froid 7 px ; CTA brun sombre bord laiton | réplique `(51,1827,1004,1893)` ; nom blanc `(52,1828,203,1850)` ; CTA or `(97,1976,508,2001)` ; alerte `(649,1985,987,2002)`. |

Couche globale, quantification à 6 tons : **(39,29,20) 32,29 %**, **(12,14,18) 19,75 %**, **(28,25,22) 17,19 %**, **(240,234,221) 13,83 %**, **(28,31,36) 10,76 %**, **(87,77,63) 6,16 %**. Luminance moyenne **12,75 %** ; densité résiduelle **19,38 %**. Grandes frontières verticales : **434 / 641 / 677 / 1003 / 1087 / 1246 / 1270 / 1428 / 1452 / 1611 / 1635 / 1780 / 1787 / 2085**. Contrastes principaux listés au contrôle positif ; métadonnée chaude **4,26:1**.

### 2. Inventaire de la capture principale 1080×2400

| id / catégorie / parent | bbox d’encre mesurée | forme, remplissage, bord, effet | texte et relations |
|---|---|---|---|
| `C0g` chrome / écran | `(0,0,1080,233)`, **100 % W × 21,57 % W** | bleu-noir plat, manomètre rond laiton ; pas de silhouette urbaine homologue | ARGENT/JOUR « — » ; « CHALEUR » au centre ; doctrine assumée partiellement. |
| `Hg` entête / écran | aplat `(1,233,1079,399)`, **99,81 % W × 15,37 % W** ; bord jusqu’à y=403 | brun **(34,22,13)**, bord proche de la référence | titre `(49,280,484,320)`, 40 px ; sous-titre `(49,328,874,350)`, une ligne. |
| `Og` serviette / corps | `(46,381,1034,653)`, **91,48 % W × 25,19 % W** | crème exact, arrondi ; chevauche le bord d’entête de 22 px | avatar `(91,421,189,511)` ; phrase `(226,438,939,502)` ; aucun token rouge sur « La Coil » ; trait `(86,550,994,554)` ; valeur rouge `(666,586,992,609)`. |
| `Lg` titre de liste | `(50,660,706,685)`, **60,74 % W × 2,31 % W** | capitales chaudes, sans fond propre | aligné sur les cartes. |
| `F1g` ciblée | `(51,711,1029,861)`, **90,56 % W × 13,89 % W** | brun **(46,34,22)**, bord laiton, écu | nom `(207,760,337,784)` ; meta bleu-gris `(207,796,679,818)` ; historique et badge lisibles. |
| `F2g` Tarcum | `(51,888,1029,1037)`, **90,56 % W × 13,80 % W** | brun **(34,28,22)** | nom 24 px d’encre, meta bleu-gris. |
| `F3g` Gorge-de-Fer | `(51,1065,1029,1214)`, **90,56 % W × 13,80 % W** | même gabarit | aucune collision. |
| `F4g` Saltline | `(51,1241,1029,1391)`, **90,56 % W × 13,89 % W** | même gabarit | complète au 2400. |
| `Vg` vide / corps | y=`1391..1848`, **458 px = 42,41 % W** entre les encres plates | gradient sombre sans contenu | rompt la relation `F4g → Bg`. |
| `Bg` bande basse | `(0,1849,1080,2152)`, **100 % W × 28,06 % W** | bleu nuit **(22,28,34)** ; CTA brun sombre | réplique `(46,1880,985,1938)` ; CTA `(90,2014,433,2047)` ; alerte `(713,2018,992,2041)`. |
| `Dg` dock | zone visuelle y=`2152..2399` ; aplat exact principal y=`2252..2399` | bleu-noir, quatre cercles vides réguliers | EMPIRE, FAMILLE, FILIÈRE, PLUS, lisibles et centrés. |

Couche globale, quantification à 6 tons : **(34,22,19) 30,02 %**, **(20,20,27) 20,51 %**, **(31,28,25) 15,48 %**, **(53,43,33) 13,37 %**, **(206,199,186) 11,30 %**, **(23,17,24) 9,31 %**. Luminance moyenne **9,92 %** ; densité résiduelle **14,73 %**. Grandes frontières : **233 / 403 / 381 / 653 / 711 / 861 / 888 / 1037 / 1065 / 1214 / 1241 / 1391 / 1849 / 2152 / 2252 / 2400**. Les valeurs non monotones 381/403 matérialisent le chevauchement serviette/entête.

Pour 1080×1920, la couche globale vaut : **(35,28,20) 31,33 %**, **(18,18,27) 16,68 %**, **(32,24,21) 14,04 %**, **(216,209,196) 13,77 %**, **(22,28,35) 12,81 %**, **(59,49,37) 11,37 %** ; luminance **12,18 %**, densité **18,33 %**.

### 3. Correspondance des repères

- Échelle de référence et de contenu jeu : **300 CSS → 1080 px, ×3,6**.
- Les racines plates donnent la correspondance horizontale **`x_jeu = 1,003724 × x_ref - 2,011`** (`x=3..1077` vers `x=1..1079`). Elle explique pourquoi les largeurs de serviette et de cartes sont égales en proportion malgré quelques pixels bruts.
- Correspondance verticale locale au début de l’entête : **`y_jeu = y_ref - 201`**.
- Il n’existe pas de facteur vertical global valide : l’entête, la serviette, le corps extensible et la bande basse divergent séparément. Les écarts verticaux sont donc exprimés en pixels **et** en pourcentage de la largeur 1080, jamais par une mise à l’échelle de la hauteur d’image.
