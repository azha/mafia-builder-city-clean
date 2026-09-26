# Juge visuel ⊥ — ④ Accueil / « LA SUITE » — r1 — 2026-09-26

Client `mafia-builder-city-clean` @ `b7fb8a8d` · back dev `1ffb08b4` · compte neuf `sha256:a9f313c3`
Référence retenue : **cadre 4 de `ecrans-brennar-accueil.html`** (atelier `25921f4`) — voir
`dossier-reconstitue.md` pour l'identification et l'échelle.

## Verdict : **NON APPROUVÉ**

L'écran a la bonne structure et le bon texte, mais son chrome haut porte trois éléments que la
maquette n'a pas — dont une bande neutre de **90 px** et un filet or pleine largeur — sa
typographie de bandeau est de **20 à 27 %** plus petite alors que celle du panneau est juste, et sa
barre d'onglets a perdu **24 %** de son empan et son fond.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Les trois images faisant 1080 px de large, ces grandeurs sont comparées en px bruts, sans
normalisation (cf. `dossier-reconstitue.md`, § Échelle).

| # | grandeur | référence | jeu | écart | script |
|---|---|---|---|---|---|
| 1 | hauteur de capitale de « ARGENT » | 19 px | 19 px | **0** | `m35` |
| 2 | couleur d'encre de « ARGENT » | (185,173,146) | (185,173,146) | **0/255** par canal | `m32` |
| 3 | couleur d'encre de la phase (« Plein jour » / « Aube ») | (234,224,200) | (234,224,200) | **0/255** | `m32` |
| 4 | bord gauche du montant | x=48 | x=49 | 1 px | `m9` |
| 5 | centre horizontal du médaillon | x=540 | x=540 | **0** | `m11` |
| 6 | centrage de « LA SUITE » | centre 536,5 | centre 539,5 | 3 px (0,3 % de la largeur) | `m21` |
| 7 | hauteur de capitale de « LA SUITE » | 17 px | 16 px | 1 px | `m22` |
| 8 | hauteur de capitale du titre de rangée (« L » de « Le labo ») | 29 px | 27 px | −7 % | `m22` |
| 9 | chasse du titre de rangée, normalisée par la capitale | 508 × 27/29 = **473** px | **473** px | **0** | `m21` |
| 10 | couleur de l'ourlet or de l'onglet actif | (176,141,62) | (176,141,61) | 1/255 | `m28` |
| 11 | alignement pastille ↔ libellé du dock (4 onglets) | ≤ 2 px | ≤ 0,5 px | — | `m26` |
| 12 | retrait du texte depuis le bord du panneau | 53 px | 49 px | 4 px | `m34`+`m21` |
| 13 | contraste de « ARGENT » sur son fond | 8,45:1 | 8,58:1 | +1,5 % | `m32` |
| 14 | contraste de la phase sur son fond | 14,05:1 | 14,28:1 | +1,6 % | `m32` |
| 15 | compte de parties : 3 rangées, 2 séparateurs, 4 onglets, 1 carte de file | 3/2/4/1 | 3/2/4/1 | **0** | `m20`, `m26` |
| 16 | part de pixels clairs (L≥90) sur l'écran entier | 3,8 % | 3,4 % | −0,4 pt | `m31` |
| 17 | gouttière d'écran non couverte (gauche/droite) | aucune | aucune | — | `m36` |
| 18 | couleur d'encre des libellés du dock | (170,159,136) | (161,151,127) | ≤ 9/255 | `m32` |

Le #9 mérite d'être lu : le titre sérif, chaîne pour chaîne, a **exactement** la même chasse une
fois ramené à la même hauteur de capitale. Le rendu de référence a pourtant substitué Georgia par
Noto Serif (`fc-match`). L'instrument discrimine donc bien : il trouve 0 là où c'est 0, et il
trouve −21 % sur « ARGENT » à hauteur de capitale identique.

---

## 0. L'écran, tel que la maquette le dit

**But.** On ouvre la journée. L'écran répond à une seule question : *qu'est-ce que je fais
maintenant ?* Il ne montre pas un tableau de bord de chiffres — il montre une **courte liste de
gestes** (« LA SUITE ») et, en dessous, ce qui **attend une décision** (la file).

**Ordre de lecture.** ① le médaillon-manomètre, gros, cerclé d'or, en haut au centre — c'est
l'élément héros du chrome ; ② le montant en or, à gauche, en chiffres de 37 px ; ③ la plaque « LA
SUITE » et sa première ligne, titre or + bouton or plein — le seul aplat lumineux de l'écran ;
④ la carte de file (« Lt. … attend vos ordres » / TRANCHER) ; ⑤ la barre d'onglets, quatre grands
médaillons sombres, qui occupent toute la largeur.

**Zones.** (a) chrome haut translucide, posé **sur l'art**, sans frontière ; (b) l'art — un quartier
peint en isométrie, fenêtres allumées en or chaud, qui occupe la moitié haute ; (c) la plaque « LA
SUITE », rectangle très arrondi, bleu nuit, avec un **liseré or sur son bord supérieur** ;
(d) la carte de file, plus basse, plus discrète ; (e) le dock.

**Traits d'identité** (ce qui fait que c'est CET écran) :
1. tout est **chaud sur bleu nuit** — un seul crème (185,173,146) et un seul or pour tous les
   textes secondaires et les accents ;
2. **rien ne coupe l'écran horizontalement** : le chrome flotte sur l'art, la plaque flotte sur
   l'art, il n'y a pas une seule règle pleine largeur ;
3. **la ville est peinte**, pas schématisée — lumières, toits, ombres portées ;
4. le **bouton or en pilule** (rayon 17, dégradé) est le seul point lumineux, et il désigne le
   geste unique de la journée ;
5. **quatre grands médaillons** de 164 px qui tiennent 83 % de la largeur : la navigation est du
   mobilier lourd, pas une barre d'icônes.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

La structure est la bonne, le texte est le bon, l'ordre de lecture tient dans ses grandes lignes.
Mais **trois des cinq traits d'identité sont entamés**.

Le trait « rien ne coupe l'écran » est perdu : un **filet or pleine largeur** à y=141, puis une
**bande parfaitement neutre (13,13,13) de 90 px** (écart-type **0,00** sur 31 500 px mesurés),
puis un **losange or**. Le haut de l'écran ne se lit plus comme un chrome posé sur la ville, mais
comme une barre d'outils suivie d'un trou. C'est la première chose qu'on voit après le médaillon.

Le trait « ville peinte » est remplacé par la **carte vectorielle** de la ville (rues, « LE PORT »,
rose des vents, semis de pastilles). Je ne sais pas si c'est voulu — aucun dossier ne le déclare —
mais je peux en mesurer la conséquence : la bande du dock passe de **1 tache claire** à **40**, et
les quatre libellés de navigation se lisent désormais sur un fond de rues.

Le trait « chaud sur bleu nuit » se fissure dans le panneau seulement : « LA SUITE », les
sous-lignes et le titre de la carte de file passent du crème chaud (185,173,146) à un **gris froid**
(138,151,156 / 162,171,180 / 211,214,215) — alors que la MÊME capture rend le jeton chaud à
l'identique dans le bandeau et sous les onglets. L'écart est systématique et de même signe sur
trois rôles de texte sur trois : ce n'est pas trois erreurs, c'est **un jeton mal choisi**.

Enfin, deux changements d'échelle **sélectifs**, et c'est leur sélectivité qui les rend
diagnostiques : dans le **panneau**, hauteurs de capitale à −6 / −7 / −9 % et chasse du titre
exacte au pixel ⇒ ce conteneur est juste. Dans le **bandeau**, montant −27 %, phase −20 %,
« JOUR » −12 % avec −34 % de chasse par caractère, « ARGENT » à hauteur égale mais −21 % de large
⇒ **ce conteneur a perdu son échelle typographique et son interlettrage**. Et dans le **dock**,
pastilles −24 %, empan −24 %, libellés −18 %. Trois conteneurs, trois régimes : celui du milieu va
bien.

**Les trois écarts de tête, par ce qu'un joueur perçoit** : (1) la bande neutre de 90 px et son
filet or, qui coupent l'écran en deux au premier coup d'œil ; (2) le dock rétréci de 24 % et posé
sur la carte, qui fait passer la navigation du mobilier au gadget ; (3) le montant — la valeur la
plus lue de l'écran — à 73 % de sa taille, avec un **ornement gris qui vient mourir dessus**.

---

## 3. Écarts

Un finding par ligne, gravité dans une liste fermée (BLOQUANT / MAJEUR / MINEUR). `critère` vaut
`NOUVEAU` partout : c'est le tour 1 de cet écran, aucun instrument n'existait avant.

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | MAJEUR | NOUVEAU | **Bande neutre EN TROP sous le bandeau.** Un rectangle 1080×90 de couleur **uniforme (13,13,13)**, entre le filet du bandeau et le début de la ville. La maquette n'a rien là : l'art monte jusqu'à y=0 derrière un bandeau translucide. | Jeu : bande **y=142..231 = 90 px**, écart-type de luminance **0,00** sur 31 500 px ; fond du bandeau juste au-dessus (13,20,28) et art juste en dessous (19,31,38) — la bande n'est **ni** l'un **ni** l'autre. Identique aux **deux** résolutions (ancrée en haut). Réf : médiane plate L=19 de y=135 à y=151, aucune discontinuité. `m2`, `m38` | Si la bande est une *safe area* volontaire : elle n'est alors ni de la couleur du bandeau ni de celle du fond, ce qui reste un écart. |
| `F2` | MAJEUR | NOUVEAU | **Filet or pleine largeur EN TROP** sous le bandeau, interrompu derrière le médaillon. | Jeu : y=141, RGB **(176,141,61)**, de x≈20 à x≈1060 ; médiane de ligne **129** contre 19 pour les voisines ⇒ pic **+110**. Réf : pic maximal **+1** sur toute la zone ⇒ **aucun filet**. `m2`, `m12` | — |
| `F3` | MAJEUR | NOUVEAU | **Le fond de l'écran n'est pas le même objet** : carte vectorielle de la ville (grille de rues, « LE PORT », rose des vents, semis de pastilles) au lieu du quartier **peint en isométrie** de la maquette. C'est le trait d'identité n°3. | Conséquence chiffrée : dans la bande du dock, **40 taches claires (≥8 px)** en jeu contre **1** en référence — et cette unique tache de la référence est la pastille de notification (`F8`). Agitation du fond : écart-type **4,91** contre **3,24**, pixels au-dessus de moy+12 : **2,4 %** contre **0,0 %**. `m39` | **Non déclaré ASSUMÉ** (aucun dossier). Le journal du parcours note « locataire monté : CityMapController » : si c'est un choix produit, tout ce finding tombe — mais aucun document ne le dit. **⇒ ARBITRAGE à remonter.** |
| `F4` | MAJEUR | NOUVEAU | **Ornement gris EN TROP dans le bandeau**, qui vient mourir sur le montant. Un trait horizontal terminé par une boucle, gris neutre, à gauche de « 10 000 € ». | Jeu : bbox **(12,57)–(75,72)**, soit **64×16 px**, RGB **(73,75,76)** (gris neutre, max−min canal ≤ 3). Les chiffres occupent x=49..191, y=71..97 : l'ornement **recouvre** x 49..75 et **touche** y 71..72. Sonde « gris neutre, 55≤L≤150 » dans la fenêtre (0,30,160,130) : **264 px** en jeu, **0** dans les **cinq** cadres de ④ (les 33 px trouvés en référence sont la frange d'anti-crénelage de « ARGENT », bbox 54..142 × 44..64). `m8` | La nature de l'objet (ornement mal placé ? glyphe de repli ? élément non mis à l'échelle ?) ne se lit pas dans l'image. |
| `F5` | MAJEUR | NOUVEAU | **Échelle typographique du bandeau perdue, et interlettrage perdu** — alors que celle du panneau est juste. Écart SÉLECTIF ⇒ désigne un conteneur différent. | Chiffres du montant **37 → 27 px** de haut (**−27 %**) · capitale de la phase **35 → 28** (**−20 %**) · « JOUR » capitale **24 → 21** et **20,0 → 13,2 px/caractère** (**−34 %**) · « ARGENT » hauteur de capitale **19 → 19** (identique) mais largeur **133 → 105 px** (**−21 %**) ⇒ pur interlettrage. Pour comparaison, dans le panneau : **−6 %**, **−7 %**, **−9 %**. `m9`, `m22`, `m35`, `m7b` | — |
| `F6` | MAJEUR | NOUVEAU | **Le dock a perdu un quart de sa taille et de son empan** ; les onglets extérieurs se déplacent de ~86 px vers le centre. | Diamètre des pastilles **163 → 123 px** (**−25 %**) · empan bord à bord **897 → 685 px** (**−24 %** ; **83 % → 63 %** de la largeur d'écran) · centres réf 172,5/417/662/906,5 → jeu 258,5/446/633/820,5 (**EMPIRE +86, PLUS −86**) · hauteur de capitale des libellés **22 → 18** (−18 %), largeurs × **0,77** uniformément sur les 4 mots (103/134 · 114/149 · 106/137 · 65/85). `m26` | — |
| `F7` | MAJEUR | NOUVEAU | **Pastille de notification ABSENTE** au-dessus de FAMILLE. | Recherche de composantes connexes or (L≥110, R−B≥60, aire ≥60 px) dans la bande des pastilles : réf **1 blob, 19×18 px à (481,1848)** ; jeu **1 blob, 38×5 px à (240,2312)** — c'est l'ourlet d'EMPIRE, pas une pastille. `m28` | Si aucune notification n'est due sur un compte neuf, l'absence est légitime — la maquette du **joueur neuf** (cadre 4) la dessine pourtant. |
| `F8` | MAJEUR | NOUVEAU | **Le filet or du panneau a changé de nature** : liseré de 3 px **sur le bord supérieur** (réf) → filet de 1 px **flottant 34 px à l'intérieur** (jeu), et 41 % plus long. Il se lit comme un séparateur ajouté au-dessus de « LA SUITE ». | Réf : y=734..736 (**3 px**), x **216..865** = **650 px** = **66 %** de la largeur du panneau (987 px). Jeu : y=**1300** (1 px ; 2 px à 1920), x **81..998** = **918 px** = **91 %** du panneau (1012 px), soit **34 px** sous le bord gris (y=1266). `m30` | — |
| `F9` | MAJEUR | NOUVEAU | **Le bouton principal n'est plus une pilule lustrée** : rayon divisé par 3, dégradé remplacé par un aplat, or plus sombre. | Rayon d'arrondi **17 → 6 px** (mesuré par l'élargissement de la ligne du haut) · réf : dégradé vertical **(231,194,103) → (204,157,59)** ; jeu : **(201,154,56) en haut ET en bas** (aplat) · largeur **323 → 283 px** (−12 %), hauteur 86 → ~78. `m18` | — |
| `F10` | MAJEUR | NOUVEAU | **Les textes secondaires du panneau passent du crème chaud au gris froid**, systématiquement — 3 rôles sur 3, tous de même signe. | « LA SUITE » (185,173,146) → **(138,151,156)** · sous-ligne de rangée (185,173,146) → **(162,171,180)** · titre de la carte de file (208,199,176) → **(211,214,215)**. R−B passe de **+39** à **−18**, **−9**, **−4**. Le même jeton chaud est rendu **à l'identique** ailleurs dans la même capture (« ARGENT » 185,173,146 des deux côtés ; libellés du dock 161,151,127). `m20`, `m29`, `m32` | — |
| `F11` | MINEUR | NOUVEAU | **Losange or EN TROP** sous le médaillon. | Jeu : bbox **(506,196)–(573,231)** = **68×36 px**, or. Réf : **0 pixel** or dans la zone homologue (480,222)–(600,300) — le médaillon s'arrête à y=218 et rien ne suit. `m12` | — |
| `F12` | MINEUR | NOUVEAU | **Le bleu nuit des plaques devient un gris neutre, et leur bordure devient franchement visible.** | Fond du panneau et de la carte de file : **(12,19,30) → (22,22,28)** (R +10, B −2 ; R−B passe de −18 à −6). Bordure gauche du panneau : réf **(33,38,48)**, L=38, sur un fond L=18 ⇒ rapport **2,1** ; jeu **(114,114,115)**, L=114, sur L=22 ⇒ rapport **5,2**. `m16` | — |
| `F13` | MINEUR | NOUVEAU | **Trois ors distincts en jeu là où la maquette en a un.** | Jeu : TRANCHER **(255,210,64)**, titres de rangée **(222,187,101)**, bouton **(201,154,56)** — étendue de 54 sur R, 56 sur G, **45 sur B**. Réf : (231,192,102), (242,201,107), (231,194,103) — étendue de 11, 9, **5**. `m18`, `m20`, `m29` | — |
| `F14` | MINEUR | NOUVEAU | **Médaillon 5 % plus petit** et 13 px plus haut. | Diamètre horizontal **194 → 184 px** ; centre y ≈ 121 → ≈ 108. Centre x identique (540). `m11` | Le décalage vertical n'est pas comparable en px bruts (rapports d'aspect différents) — je ne le chiffre pas comme écart. |
| `F15` | MINEUR | NOUVEAU | **Marges latérales du panneau réduites de 27 %.** | Réf : bords x **47** et **1033** (marges 47/46, largeur **987**). Jeu : x **34** et **1045** (marges 34/34, largeur **1012**). `m34` | — |
| `F16` | MINEUR | NOUVEAU | **Interlettrage de « LA SUITE » réduit.** | Chasse **162 → 134 px** à hauteur de capitale 17 → 16 ⇒ après normalisation **−12 %**. `m21`, `m22` | — |
| `F17` | MINEUR | NOUVEAU | **La sévérité bénigne porte la couleur la plus saturée de la carte de file.** « LÉGÈRE » est en vert-turquoise saturé ; la maquette met « GRAVE » — état **plus** grave — en gris chaud, et ne réserve la couleur qu'à l'alarme (« saturée » en rouge, cadre 3). L'emphase est inversée. | Jeu « LÉGÈRE » **(59,198,169)**, saturation max−min = **139**. Réf « GRAVE » **(182,170,144)**, max−min = **38**. `m29` | **Aucun cadre de la maquette ne montre l'état « LÉGÈRE ».** Je ne peux pas dire ce que la maquette voudrait pour cet état ; je constate l'inversion d'emphase. **⇒ ARBITRAGE.** |
| `F18` | MINEUR | NOUVEAU | **Le panneau pèse moitié moins dans l'écran.** | Hauteur **858 → 591 px** ; part de la hauteur d'écran **40,8 % → 24,6 %**. Le texte occupe **11 lignes** en référence contre **9** en jeu (la rangée 2 tient sur une ligne au lieu de deux, la rangée 3 sur deux au lieu de trois) — conséquence de la plaque plus large. `m34`, `m20` | La part du reflux et celle du rembourrage ne se séparent pas proprement depuis l'image seule. |
| `F19` | MINEUR | NOUVEAU | **La 3ᵉ suggestion n'est pas celle de la maquette.** Maquette : « Vos lieutenants attendent une consigne » / *Une première règle, et ils tiennent sans vous.* / **ÉCRIRE UNE RÈGLE**. Jeu : « De l'argent attend dans la planque » / *Blanchissez-le : il ne rapporte rien tant qu'il dort.* / **BLANCHIR**. Les rangées 1 et 2 sont identiques mot pour mot. | Vérifié par lecture des deux images ; la rangée 1 est identique au pixel près une fois normalisée (contrôle positif #9). | Pas un écart de rendu. **⇒ ARBITRAGE de contenu.** |

**Compte :** 0 BLOQUANT · 10 MAJEUR · 9 MINEUR.

> Note de cause commune : `F1`, `F2` et `F11` sont trois symptômes d'un même endroit — le raccord
> entre le bandeau haut et l'art. `F3` explique à lui seul la moitié de `F6`/`F7` perçue (le dock
> paraît d'autant plus maigre qu'il est posé sur un fond bavard). Je ne fusionne pas les lignes :
> je le dis ici, comme le format l'impose.

---

## 5. Autres résolutions

**1080×1920 (9:16).** Rien de coupé, rien hors cadre, rien qui déborde de son parent ; l'ordre de
lecture est conservé. Tout le chrome haut est **identique au pixel** à celui de 1080×2400 : filet
or à y=141, bande à y=142..231 (**90 px**), losange, ornement gris à (12,57)–(75,72), bbox de
« ARGENT », du montant, de « JOUR » et de la phase toutes identiques. Le dock est également
identique en X (libellés aux mêmes x=208..310 / 390..503 / 581..686 / 789..853) et sa marge basse
vaut **58 px**, comme à 2400. Le panneau et la carte de file remontent (bord haut du panneau
y=859 au lieu de 1266) sans changer de forme : le filet or intérieur y est à **2 px** au lieu de 1,
seule différence mesurée entre les deux captures.
⇒ **Aucun écart propre à cette résolution.** Les findings `F1`,`F2`,`F4`,`F5`,`F6`,`F7`,`F11`
valent identiquement aux deux.

**1080×2400 (9:20).** Jugée comme capture principale ci-dessus.

**Aucune troisième résolution n'était fournie** (le skill en demande au moins deux : c'est
satisfait, mais aucune n'est au format de la référence 9:17,5).

---

## 6. Non vérifié

1. **Le fond (`F3`) est-il un choix produit ?** Il n'existe pas de `dossier.md`, donc pas de table
   d'écarts assumés, donc pas de `juge-donnees` en mode maquette. Ce qui trancherait, hors image :
   la ligne de `front.md` pour ④, ou le dossier de code du `DashboardController`. Je ne les ai pas
   ouverts (le mandat me l'interdit) — c'est une question pour l'user, pas pour moi.
2. **Animation.** Une seule capture par résolution. Je ne peux ni constater ni infirmer un pixel
   qui bouge, ni dire si l'image figée tombe à un mauvais moment d'un balayage. Ce qui trancherait :
   deux captures du même état à T et T+1 s.
3. **Un seul état capturé** (jour 1, Aube, COLD, compte neuf, 1 carte en file). Les cadres 0, 1, 2
   et 3 de la maquette décrivent quatre autres états de ④ (« rien à trancher », « une carte de
   tête », « des rapports à lire », « la file sous pression ») : **aucun n'a de capture**. L'état
   « rien à trancher » est celui qui m'inquiéterait le plus, parce qu'il vide la plaque.
4. **L'état « LÉGÈRE » n'existe pas dans la maquette** (`F17`). Je mesure l'inversion d'emphase,
   je ne peux pas dire quelle couleur est voulue.
5. **Le losange (`F11`) et l'ornement gris (`F4`) : je ne sais pas ce qu'ils sont.** Je constate
   qu'ils n'ont d'homologue dans aucun des cinq cadres. Ce qui trancherait est hors image.
6. **La face sérif du client.** La maquette a rendu avec Noto Serif (substitution de Georgia,
   `fc-match` collé au dossier) ; je ne peux pas lire la police du client dans une image. La chasse
   normalisée tombant exacte (contrôle positif #9), je classe la question comme **sans enjeu
   mesuré** plutôt que comme arbitrage ouvert.
7. **Les positions verticales** ne sont jamais comparées en px bruts : les trois images ont trois
   rapports d'aspect. Tout ce qui, dans ce rapport, est un *écart de position verticale* est donné
   en pourcentage ou en distance depuis le bord ancré. Aucune conclusion n'en est tirée seule.
8. **Je n'ai pas jugé la maquette.** Les soulignés pointillés sont la marque « PROPOSÉ » de
   l'atelier et ont été exclus de toutes mes mesures de hauteur (blocs d'encre contigus, `m22`) :
   ils ne figurent dans aucun finding.

---

## Annexes

### A1. Inventaire de la référence (cadre 4) — fiches

| id | catégorie | parent | bbox | forme | remplissage | bord | texte | relations |
|---|---|---|---|---|---|---|---|---|
| `C` | chrome haut | écran | (0,0)–(1079,~220) | bandeau sans limite inférieure | dégradé sombre translucide **sur** l'art, pas de frontière | **aucun** filet | — | flotte sur `A` |
| `C.argent` | libellé | `C` | (47,45)–(179,63) | texte caps | (185,173,146) | — | « ARGENT », capitale **19 px**, interlettré (133 px pour 6 lettres) | aligné à gauche, marge 47 |
| `C.montant` | valeur | `C` | (48,81)–(228,117) | texte sérif | or (217,175,81 moyen) | — | « 24 850 € », chiffres **37 px** | sous `C.argent` |
| `C.jour` | libellé | `C` | (887,45)–(1026,68) | texte caps | crème | — | « JOUR 12 », capitale **24 px**, **20,0 px/car** | aligné à droite |
| `C.phase` | valeur | `C` | (824,79)–(1032,128) | texte sérif | (234,224,200) | — | « Plein jour », capitale **35 px** | sous `C.jour` |
| `C.medaillon` | médaillon | `C` | centre (540,121), **Ø 194** | disque + anneau or | disque sombre, arc bicolore | anneau or épais | « Tiède » / « CHALEUR » | centré, **chevauche l'art** |
| `A` | fond / décor | écran | plein cadre | quartier **peint** en isométrie, fenêtres or | — | — | — | va jusqu'à y=0 |
| `P` | plaque | écran | (47,734)–(1033,1592), **987×858** | rect. très arrondi | (12,19,30) bleu nuit | filet L=38 (rapport 2,1 sur le fond) + **liseré or 3 px sur le bord haut**, x 216..865 | — | 40,8 % de la hauteur |
| `P.titre` | titre de section | `P` | (456,779)–(617,795) | texte caps interlettré | (185,173,146) | — | « LA SUITE », capitale **17 px**, chasse **162** | centré à 536,5 |
| `P.r1.titre` | titre de rangée | `P` | (99,855)–(606,883) | texte sérif | (242,201,107) | — | « Le labo attend du Pyralin », capitale **29 px**, chasse **508** | retrait 53 du bord |
| `P.r1.sous` | sous-ligne | `P` | (99,915)–(417,936) | texte sans | (185,173,146) | — | « Sans lui, rien ne cuit. », capitale **22 px**, chasse **319** | — |
| `P.r1.cta` | bouton plein | `P` | (654,855)–(976,940), **323×86** | pilule, **rayon 17** | **dégradé** (231,194,103)→(204,157,59) | — | « COMMANDER » | marge droite interne 57 |
| `P.r2.cta` | bouton contour | `P` | (605,1066)–(979,1157), **375×92** | rect. arrondi | transparent (21,26,37) | filet clair | « VOIR LA VENTE » | — |
| `P.sep` | séparateur | `P` | y=982 et y=1241 | trait 1 px | (28,32,44) | — | — | 2 séparateurs |
| `Q` | carte de file | écran | ~(47,1640)–(1033,1790) | rect. arrondi | (11,19,28) | filet discret | « Lt. Tull attend vos ordres » (capitale 27) / « GRAVE » (182,170,144) / « TRANCHER » (231,192,102) | sous `P` |
| `D` | dock | écran | pastilles x 91..988, **empan 897** | 4 disques **Ø 163** | dégradé sombre, aspect bombé | anneau doux | libellés capitale **22 px**, (170,159,136) | fond **calme** : 1 tache claire |
| `D.pip` | pastille de notif. | `D` | (481,1848), **19×18** | disque | or (217,171,78) | — | — | coin haut-droit de FAMILLE |
| `D.actif` | ourlet | `D` | (148,2017)–(197,2023), **50×7** | trait arrondi | (176,141,62) | — | — | au-dessus de EMPIRE |

**Couche globale (réf cadre 4)** : luminance moyenne **26,3** ; pixels clairs (L≥90) **3,8 %** ;
palette quantifiée (somme 100,00 %) : (8,13,21) 23,3 % · (11,17,27) 21,3 % · (25,32,40) 18,6 % ·
(12,20,30) 15,4 % · (17,23,32) 14,4 % · (77,73,62) 7,0 %. Rythme vertical : frontières à
y=734 (plaque), 982, 1241 (séparateurs), 1592 (bas de plaque), ~1640 (file), ~1848 (dock).

### A2. Inventaire de la capture (1080×2400) — fiches

| id | catégorie | bbox | forme | remplissage | texte | statut |
|---|---|---|---|---|---|---|
| `C` | chrome haut | (0,0)–(1079,141) | bandeau **borné** par un filet | (13,20,28) | — | ÉCART (`F2`) |
| `C.filet` | filet or | y=141, x 20..1060 | trait 1 px | (176,141,61) | — | **EN TROP** (`F2`) |
| `C.bande` | bande neutre | (0,142)–(1079,231) | rectangle plein | **(13,13,13)**, σ=0,00 | — | **EN TROP** (`F1`) |
| `C.losange` | losange | (506,196)–(573,231), 68×36 | losange | or | — | **EN TROP** (`F11`) |
| `C.ornement` | ornement | (12,57)–(75,72), 64×16 | trait + boucle | (73,75,76) gris neutre | — | **EN TROP**, recouvre le montant (`F4`) |
| `C.argent` | libellé | (45,27)–(149,45) | caps | (185,173,146) | capitale **19**, chasse **105** | ÉGAL en hauteur, ÉCART en chasse (`F5`) |
| `C.montant` | valeur | (49,71)–(191,97) | sérif | or | chiffres **27 px** | ÉCART −27 % (`F5`) |
| `C.jour` | libellé | (955,28)–(1033,48) | caps | crème | capitale **21**, **13,2 px/car** | ÉCART (`F5`) |
| `C.phase` | valeur | (935,70)–(1033,98) | sérif | (234,224,200) | capitale **28** | ÉCART −20 % (`F5`) |
| `C.medaillon` | médaillon | centre (540,~108), **Ø 184** | disque + anneau | — | « Froid » / « CHALEUR » | ÉCART −5 % (`F14`) |
| `A` | fond | plein cadre à partir de y=232 | **carte vectorielle** | rues, pastilles, « LE PORT », rose des vents | — | ÉCART de nature (`F3`) |
| `P` | plaque | (34,1266)–(1045,1857), **1012×591** | rect. arrondi | **(22,22,28)** neutre | — | ÉCART (`F12`,`F15`,`F18`) |
| `P.filet` | filet or | y=1300, x 81..998 | trait 1 px **flottant** | (201,154,56) | — | ÉCART de position et d'étendue (`F8`) |
| `P.titre` | titre de section | (473,1329)–(606,1344) | caps | **(138,151,156)** froid | capitale **16**, chasse **134** | ÉCART (`F10`,`F16`) |
| `P.r1.titre` | titre de rangée | (83,1384)–(555,1410) | sérif | (222,187,101) | capitale **27**, chasse **473** | **ÉGAL** après normalisation |
| `P.r1.sous` | sous-ligne | (83,1431)–(344,1450) | sans | **(162,171,180)** froid | capitale **20** | ÉCART de couleur (`F10`) |
| `P.r1.cta` | bouton plein | (714,~1379)–(996,1456), **283×78** | rect. **rayon 6** | **aplat** (201,154,56) | « COMMANDER » | ÉCART (`F9`) |
| `P.r2.cta` | bouton contour | (719,1590)–(991,1719), **273×130** | rect. arrondi | (22,22,28) | « VOIR LA VENTE » | ÉCART de proportion |
| `P.sep` | séparateurs | y=1482 et ~1747 | trait | (75,82,85) | — | 2 séparateurs — compte ÉGAL |
| `Q` | carte de file | (34,1912)–(1045,2100) env. | rect. arrondi | (22,22,28) | « Lt. Ilm attend vos ordres » (211,214,215) / « LÉGÈRE » **(59,198,169)** / « TRANCHER » **(255,210,64)** | ÉCARTS (`F10`,`F13`,`F17`) |
| `D` | dock | pastilles x 197..882, **empan 685** | 4 disques **Ø 123** | anneau gris franc (114,114,115) | libellés capitale **18**, (161,151,127) | ÉCART (`F6`) ; fond **bavard** : 40 taches claires (`F3`) |
| `D.pip` | pastille de notif. | — | — | — | — | **ABSENT** (`F7`) |
| `D.actif` | ourlet | (240,2312)–(277,2316), **38×5** | trait | (176,141,61) | — | présent, couleur ÉGALE |

**Couche globale (jeu 1080×2400)** : luminance moyenne **31,9** (+21 % vs réf) ; pixels clairs
**3,4 %** ; palette : (22,22,28) 24,2 % · (29,39,53) 22,4 % · (12,17,25) 19,0 % · (23,30,41) 15,6 % ·
(15,22,32) 11,0 % · (68,77,72) 7,7 % (somme 100,00 %).

### A3. Correspondance des repères

Les trois images font **1080 px de large** : facteur **1,000** en X. Toute mesure horizontale et
toute mesure de TAILLE est donnée en px bruts, directement comparable. Les rapports d'aspect
diffèrent (réf 9:17,5 · jeu 9:16 et 9:20) : les positions verticales ne sont jamais comparées en px
bruts — elles le sont en distance depuis le bord ancré (chrome : haut ; dock : bas) ou en % du
parent. Origine commune : coin supérieur gauche de chaque image, offset (0,0).

### A4. Scripts

Tous dans `mesures/`. **Chaque sonde imprime la taille des images qu'elle ouvre**, et ces tailles
sont celles du dossier (1080×2102 pour la référence, 1080×2400 et 1080×1920 pour les captures).

- `rendre-reference-04.py` — rend les 5 cadres de ④ : index **apparié à son étiquette** avant tout
  rendu, machine vérifiée libre, taille relue sur le fichier écrit. Sortie : les 5 PNG de
  `reference/`.
- `mesures.py` — **l'instrument du verdict**, toutes sections. `python3 mesures.py` rejoue tout ;
  `python3 mesures.py m22 m39` rejoue une section. Sortie complète collée en `sortie-mesures.txt`
  (245 lignes, `EXIT=0`).
- `m1_profil_vertical.py` … `m7_chrome_seuil_absolu.py` — les premières passes, **conservées parce
  que deux d'entre elles ont été réfutées** (voir ci-dessous). Sorties en `sortie-m1.txt` …
  `sortie-m7.txt`.
- `m3_decoupes.py` — vignettes d'inventaire, dans `decoupes/`.

| section de `mesures.py` | ce qu'elle mesure | son contrôle |
|---|---|---|
| `m2` | la bande sombre : pic de filet, borne basse **dérivée de la courbe** | contrôle **négatif** sur les 2 cadres de référence : pic +1 ⇒ aucun filet |
| `m7b` | bbox d'encre du chrome, **seuil absolu** L≥120 | 2 contrôles négatifs (chrome sans texte) ⇒ 0 % |
| `m8` | l'ornement gris : masque « gris neutre » excluant l'or et le crème | balayé sur **3** cadres de référence, tous à 33 px (la frange de « ARGENT ») |
| `m9` | montant : encre or segmentée en chiffres | borne x<440 — **sans elle la sonde remonte à x=636, c'est-à-dire mesure le médaillon** ; le compte de groupes (4 / 6) est le contrôle |
| `m11`, `m12` | médaillon, filet or du bandeau, losange | le filet doit être **absent** en référence (médiane plate) |
| `m16` | couleurs d'aplat + profil de la bordure du panneau | — |
| `m18` | bouton principal : bbox, aplat **haut ET bas** (donc dégradé ou non), rayon par élargissement | le rayon se lit sur la courbe, il n'est pas choisi |
| `m20`, `m21`, `m22`, `m35` | typographie : bandes du panneau, bbox de chaîne, **hauteur de capitale par blocs contigus** | `m22` **sépare explicitement** le glyphe du souligné pointillé « PROPOSÉ » (2 blocs en référence, 1 en jeu) |
| `m26`, `m28` | dock : pastilles (8 bords ⇒ 4 diamètres), libellés (4 groupes), pip par composantes connexes | le **compte** (8 bords, 4 groupes) est le contrôle |
| `m29` | carte de file : textes, sévérité, TRANCHER | — |
| `m30` | filet or du panneau : position et étendue, des deux côtés | balayé ligne par ligne autour du bord |
| `m31` | couche globale, palette quantifiée | **somme des parts = 100,00 %** |
| `m32` | contrastes WCAG texte / fond local | 2 grandeurs attendues **égales** (ARGENT, phase) sortent à ±1,6 % |
| `m34` | bords latéraux et bas du panneau, hauteur | — |
| `m36` | gouttières d'écran, marge basse | — |
| `m38` | nature de la bande : couleur, **uniformité** | écart-type sur 31 500 px ⇒ 0,00 |
| `m39` | agitation du fond du dock, comptage des taches claires | **contrôle sur un aplat** : les deux côtés doivent rendre ~3 — ils rendent 3,10 et 2,94 |

**Instruments réfutés, conservés :** `m4_encre.py` et `m6_chrome_precis.py` dérivaient leur seuil
de la médiane de la fenêtre + 40. Dans une fenêtre qui contient de l'art peint (référence) ou la
carte (jeu), ce seuil tombe **dans le fond** : les deux ont rendu « bbox tronquée » sur **toutes**
les fenêtres. Un résultat **uniforme** n'est pas une mesure sévère, c'est un instrument qui mesure
autre chose — ils ont été remplacés par le seuil absolu de `m7`/`m7b`, lequel porte deux contrôles
négatifs. Les sorties fautives restent en `sortie-m4.txt` et `sortie-m6.txt` : c'est ce qui prouve
que la sonde retenue discrimine.
