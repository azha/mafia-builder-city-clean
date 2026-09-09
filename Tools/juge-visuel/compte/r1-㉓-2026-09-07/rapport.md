# Juge visuel ⊥ — ㉓ La vitrine (IAP Shop) — r1 — 2026-09-07

Dossier : `Tools/juge-visuel/compte/r1-㉓-2026-09-07/` · scripts : `mesures/01-…` à `mesures/26-…`
Références : `reference-㉓-1080x2102.png` (cadre nominal #98) · source lue pour les cadres #99 et #100
(non rendus ce tour) · `etats/boutique-canon.png` et `etats/boutique-extra-possede.png` (série 2)
· `etats/vide-maquette-vitrine.png` (SENS du vide) · `hud-canon-1176.png` (chrome).
Captures : `capture-1080x2400.png` (campagne `cf99604`) et `capture-planche-1080x2400.png` (campagne
`03efb90`). **Chaque planche est comparée à la MAQUETTE, jamais l'une à l'autre.**

## Verdict : NON APPROUVÉ

L'écran en jeu n'est pas la vitrine de la maquette : c'est une liste de packs de monnaie, sur fond
noir uni, dont chaque ligne annonce au joueur qu'aucun vérificateur de reçu n'est câblé.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

L'instrument retrouve **à l'octet** les valeurs écrites dans la CSS de la maquette et dans le canon
HUD ; il n'est donc pas en cause dans les écarts listés plus bas. (Un rapport où tout serait faux
devrait d'abord accuser l'instrument — ce n'est pas le cas ici : 15 grandeurs sortent ÉGALES.)

| # | grandeur | attendu | mesuré | écart | script |
|---|---|---|---|---|---|
| 1 | filet du bandeau, plateau central (capture, état `.chaud`) | `--braise` #e0664a = (224,102,74) | (224,102,73) | **1/255** | `08` |
| 2 | filet du bandeau du CANON HUD, plateau central (étalonnage) | `--laiton` #b08d3e = (176,141,62) | (176,141,62) | **0** | `08` |
| 3 | rampe du filet (transparent → 18 % → 82 % → transparent) | dégradé CSS | 2 %→78, 18 %→214, 25-75 %→224, 82 %→214, 98 %→78 | conforme | `08` |
| 4 | couleur du titre « LA VITRINE » | réf (217,171,78) = `.ens` #d9ab4e | capture (217,171,77) | **1/255** | `09` |
| 5 | réf : `.solde b` « 50 » | #f0dfc4 = (240,223,196) | (240,223,196) | **0** | `09` |
| 6 | réf : `.solde small` « JETONS » | #9a8a6a = (154,138,106) | (154,138,106) | **0** | `09` |
| 7 | réf : filet du comptoir | #6b4f14 = (107,79,20) | (107,79,20) | **0** | `18` |
| 8 | réf : fond du bandeau de voix / son bord | #12100e / #3a2e24 | (18,16,14) / (58,46,36) | **0 / 0** | `24` |
| 9 | réf : tablette de la planche | #3a2e24 = (58,46,36) | (59,47,37) | **1/255** | `18` |
| 10 | réf : bas de la vitre | #0c1015 = (12,16,21) | (12,16,22) | **1/255** | `18` |
| 11 | réf : gouttière entre les 2 colonnes | `gap:8px` × 3,6 = 28,8 px | 28 px (x=526..553) | 0,8 px | `11` |
| 12 | réf : filet du comptoir, épaisseur | `2px` × 3,6 = 7,2 px | 7 px (y=580..586) | 0,2 px | `26` |
| 13 | dock : PAS des 4 ronds, en % de largeur | canon 204/1176 = 17,35 % | capture 187,5/1080 = **17,36 %** | 0,01 pt | `17` |
| 14 | dock : hauteur d'encre du libellé, en % de largeur | canon 2,47 % · couleur (178,167,140) | capture 2,50 % · (185,173,146) | 0,03 pt · ≤7/255 | `17` |
| 15 | hauteur de capitale du titre de carte | `.art .nom` 9 CSS × 3,6 × 0,729 = 23,6 px | 23 px | 0,6 px | `13` |

Contrôles négatifs passés : fenêtre de fond → « aucune encre » (`09`, `13`) ; ligne de fond → 0 segment
(`05`, `20`, `21`) ; image unie fabriquée sur place → 100 % de fond, 0 % d'encre (`19`) ; deux aplats
différents → écart > 6/255 (`06`) ; « 100 » (pas de millier) → aucun blanc large (`23`).

★ **Un instrument corrigé en cours de route** : la v1 de la sonde de cadre (`20`) ne lisait que le
premier et le dernier segment et rendait « trou parfaitement centré, décentrage +0 % » sur **les
7 rails à la fois** — un résultat *uniforme*, donc suspect. La v2 (`21`) imprime tous les segments :
le décentrage réel est **+28,5 %**. Le verdict M5 ci-dessous est celui de la v2.

---

## 0. L'écran, tel que la maquette le dit

**But.** La boutique de Wexler. On y vient pour voir *ce qui est à vendre*, *combien on a de jetons*,
et *ce qui reste hors d'atteinte*. Le parti pris est écrit noir sur blanc dans l'aside du cadre :
« **Les articles sont des objets, pas des lignes** » — une plaque émaillée, une carte encadrée, une clé
numérotée, un pli cacheté, des piles de jetons. « Les Marks sont des jetons de laiton — une monnaie
qu'on voit, pas un nombre. »

**Ordre de lecture.**
1. **Le comptoir de laiton**, en tête (154 px = 42,8 CSS) : « LA VITRINE » en or sérif à **gauche**, et
   **en face**, à droite, la bourse — un boîtier cerclé de laiton, jeton gravé + « **50** » en crème +
   « JETONS ». Le nom et la bourse se regardent : c'est le contrat de l'écran.
2. **Les objets derrière la vitre** : deux colonnes, quatre articles, chacun avec son illustration
   (64×41 CSS), son nom en sérif crème, son sous-titre anglais en gris-bleu, et son **étiquette de prix
   pendue** — un rectangle de papier crème, la seule tache claire de l'écran.
3. **Ce qui est hors d'atteinte**, dit deux fois : l'étiquette passe en fond crème **pointillé**, et un
   « hors d'atteinte » saumon la double.
4. **Wexler**, en pied (278 px = 77,2 CSS) : avatar, nom, « DERRIÈRE LE COMPTOIR », et une phrase en
   italique sérif qui donne le ton — « *Ce qui est là est à vendre. Ce qui est trop cher pour vous, je
   le laisse en vitrine — ça vous fera un but.* »

**Zones.** comptoir 42,8 CSS · vitre 343,6 CSS (dégradé 168° #151b23 → #0c1015, deux reflets obliques,
une tablette de bois qui sépare les étagères) · bandeau de voix 77,2 CSS.

**Traits d'identité** (ce à quoi on reconnaît *cet* écran) : ① le comptoir de laiton qui porte le nom ET
la bourse côte à côte ; ② la vitre — un plateau **bleu nuit** en dégradé avec ses reflets ; ③ les
articles-**objets** posés sur une **tablette de bois** ; ④ l'**étiquette de papier** crème, seul point
clair ; ⑤ **Wexler** qui parle en bas.

**L'état vide, tel que le canon le veut.** `etats/vide-maquette-vitrine.png` montre une vitrine de
laiton **vide mais allumée**, intacte, sur un plancher de bois chaud : *ça plafonne, mais rien n'est
perdu*. Et le cadre #100 (« Zéro jeton — l'état terminal ») garde le « 0 » **en crème dans le même
boîtier** : c'est Wexler, pas une alarme, qui porte le ton du zéro.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Non. Un joueur qui arrive voit, dans l'ordre : (1) un titre centré et seul, (2) **un encadré rouge
pleine largeur « 0 jetons »** dans la couleur exacte de l'alarme BRÛLANT du HUD (mesurée identique au
filet du bandeau de la même image, 224,102,73), (3) quatre lignes de packs de monnaie dont chacune
répète, sur 29 % de sa hauteur, « **aucun vérificateur de reçu n'est câblé — cet achat ne peut
aboutir** ». La boutique n'est pas *fermée* : elle est *en panne*, et elle le dit dans le vocabulaire
de l'implémentation.

Les trois écarts de tête, par ce qu'un joueur perçoit :
1. **Rien de ce que la maquette met en vitrine n'est à l'écran.** Le cadre nominal montre le rayon
   « LES EXTRAS — PAYÉS EN JETONS » (Couleurs de nom, Thème « Nuit au sodium », Deuxième et Troisième
   dossier). L'écran visible n'en montre aucun, ne porte **aucun intitulé de rayon** (30 px de fond nu
   entre la bannière et la première carte) et ne montre que la caisse.
2. **Le solde a changé de nature.** De 338×82 px de crème dans le comptoir, il est passé à 970×154 px
   de braise pleine largeur — surface ×5,4, et il capte le regard avant les articles. C'est
   exactement le vide « qui se lit comme une punition » que le canon interdit.
3. **La matière a disparu.** Le plateau de la maquette est meublé — 26,0 % d'aire pour son fond
   dominant, 14,4 % d'encre, une teinte bleutée, deux reflets, une tablette de bois. La capture est
   **90,9 % d'un seul noir neutre (13,13,13)**, 9,0 % d'encre, luminance moyenne 21,1 contre 33,8. Les
   articles-objets (196 teintes, 230×148 px d'illustration) sont devenus un disque uni de 39 px.

Ce qui tient : la palette d'or est **exacte** (217,171,78 des deux côtés), le chrome est juste (filet
braise au bit près, pas du dock à 0,01 point), les contrastes passent tous le plancher, la police du
contenu est la bonne (la CSS de cet écran demande DejaVu, que le client embarque — aucun arbitrage de
famille n'est ouvert ici), et le cadre de style reste sombre et sobre. Le désaccord n'est pas de
direction : ce sont des matières et des parties **absentes**.

---

## 3. Écarts

`critère` : premier tour ⇒ tout est `NOUVEAU`. `données` : oui = l'observation dépend du contenu servi
par le back au compte photographié ; non = géométrie / palette / typographie / rythme, vrais quelles
que soient les données.

| id | gravité | critère | données | destinataire | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|---|
| `B1` | BLOQUANT | NOUVEAU | en partie | correcteur | Le rayon des **extras** — le contenu du cadre NOMINAL — n'est pas dans l'écran visible, et aucun intitulé de rayon ne dit qu'il existe ailleurs. L'ordre de lecture de la maquette (bourse → objets → hors d'atteinte → Wexler) devient (titre → alarme → caisse). | Réf #98 : 4 articles en 2 colonnes, y 690..1582, intitulé `.etag h3` à y 649..674 (26 px d'encre). Capture : 4 cartes « Pack — N Marks », **0 extra**, **0 intitulé** — bandes d'encre 215-231 (losange), 273-307 (titre), 352-505 (bannière), 535-887 / 917-1320 / 1350-1753 / 1783-2122 (cartes) ; 30 px de fond nu entre 505 et 535. `11`,`19`,`21` | Si les extras sont **sous la ligne de flottaison** : l'image est fixe, aucun indice de défilement (l'encre s'arrête net à y=2122, sans fondu ni ascenseur). Et si le back ne sert que des packs à ce compte — le rapport juge-données ne m'est pas fourni. |
| `B2` | BLOQUANT | NOUVEAU | non | correcteur | **Texte de développement affiché au joueur, 4 fois** : « aucun vérificateur de reçu n'est câblé — cet achat ne peut aboutir ». Vocabulaire d'implémentation (« vérificateur de reçu », « n'est câblé ») là où la maquette pose une étiquette de prix. L'écran se lit comme cassé, pas comme fermé. | Bloc mesuré y=733..855 (122 px) dans une carte de 404 px ⇒ **29 % de la hauteur de chaque carte**, sur les 4 cartes. Homologue maquette : `.etiq.magasin` → « PRIX DU MAGASIN », plaque #1b232c bordée #3f4a57, 7,5 px. `03`,`21` | Rien : les 4 occurrences sont lisibles sur les deux planches. |
| `B3` | BLOQUANT | NOUVEAU | oui (la valeur) / non (la forme) | correcteur | Le **solde** est passé d'un jeton de comptoir à une **alarme pleine largeur**, dans la couleur réservée à l'état BRÛLANT de la ville. Premier objet lu après le titre. Le canon du vide (« ça plafonne et ça bloque, **rien n'est perdu** ») exige l'inverse. | Réf `.solde` : boîte **338×82 px** (x 696..1033), chiffre **crème (240,223,196)** = #f0dfc4 (écart 0). Capture : bannière **970×154 px** (x 60..1029, y 352..505) ⇒ **surface ×5,4** ; « 0 jetons » ET la ligne d'avertissement en **(224,102,73)** = `--braise` #e0664a, **la même couleur, au bit près, que le filet d'alarme du bandeau de la même image** (224,102,73). Le cadre #100 de la maquette garde le « 0 » en crème. `09`,`08` | Que la valeur « 0 » soit juste (identité du compte déclarée par corps de commit, journal non joint) ⇒ la **valeur** va en non vérifié ; la **forme** est jugée. |
| `M1` | MAJEUR | NOUVEAU | non | correcteur | Toutes les **matières** de la vitrine sont remplacées par un aplat noir **neutre** : plus de comptoir de laiton, plus de vitre en dégradé, plus de reflets, plus de tablette de bois. La teinte elle-même disparaît (le plateau de la maquette est bleuté, la capture est exactement grise). | Réf : comptoir #2a231f→#1b1613 (écart 2), vitre #151b23→#0c1015 (7 / 1), 2 reflets (+6/255 mesurés à y=1700), tablette #3a2e24 (écart 1). Capture : **(13,13,13) partout** — 5 fenêtres disjointes, écart 0 entre elles ; fond dominant **90,9 %** de l'aire contre **26,0 %** en réf ; encre **9,0 %** contre **14,4 %** ; luminance moyenne **21,1** contre **33,8**. Teinte : réf B−R = **+14** en haut de vitre, capture B−R = **0**. `06`,`18`,`19` | — |
| `M2` | MAJEUR | NOUVEAU | non | correcteur | Les articles ne sont plus des **objets** : l'illustration (plaque émaillée, carte encadrée, clé numérotée) est remplacée par un **disque uni**. C'est le parti pris nº 1 de l'écran, écrit dans la maquette. | Réf `.art>svg` : 64×41 CSS = **230×148 px**, **196 teintes** distinctes (5 bits/canal), 8 488 px d'encre. Capture : disque **39×39 px** (10,8 CSS), **63 teintes**, aucune gravure. Surface d'illustration **34 040 px² → 1 195 px² (÷28)**. Carte entière : **779 teintes** (réf, 470×310 px) contre **167** (capture, 960×350 px, soit 2,2× l'aire). `10`,`15` | — |
| `M3` | MAJEUR | NOUVEAU | non | correcteur | L'**étiquette de prix** — objet pendu et encadré dans les deux cadres de la maquette — n'existe pas. Aucun prix, aucun cartouche : « en boutique » flotte en petit gris. | Réf `.etiq` : fond crème **#efe6d4**, bord #b9ac92, jeton 11 CSS, chiffre #241f1c ; variante `.etiq.magasin` #1b232c bordée #3f4a57 ; bandes d'encre y 979..1078 et 1457..1516 (**100 px** et 60 px). Capture : aucune plaque ; « en boutique » = texte nu, hauteur d'œil **11 px**, (185,173,146). `24`,`13` | — |
| `M4` | MAJEUR | NOUVEAU | non | correcteur | Le **comptoir de laiton** a disparu ; le titre est **centré et seul** au lieu d'être à gauche face à la bourse. La composition qui fait l'écran (le nom et l'argent se regardent) n'existe plus. | Réf : bande `.compt` y 434..587 (**154 px = 42,8 CSS**), dégradé brun, **filet #6b4f14 de 7 px** (écart 0) ; titre à **gauche**, bbox (48,490)-(390,518). Capture : **aucune bande, aucun filet** (fond (13,13,13) à y 320..345) ; titre bbox (367,273)-(711,307), centre **539** contre centre d'image **540** ⇒ **centré**. `09`,`18`,`26` | — |
| `M5` | MAJEUR | NOUVEAU | non | correcteur | Le **cadre du bloc « DERRIÈRE LA VITRE » est troué** : les deux rails s'interrompent sur 38 % de la largeur et le montant droit est absent. Visible sur les 4 cartes, sur les deux planches. **Ce n'est PAS la classe connue** (bord périodique étiré par un 9-slice) : le trait est **plein**, pas pointillé, et le trou n'est ni symétrique ni central. | Sur les **7 rails** des 4 cartes, identiques aux deux planches : trait x=**89..624**, **trou x=625..967 (343 px = 38 % de la boîte)**, moignon x=**968..990**. Centre de boîte **540**, centre du trou **796** ⇒ **décentrage +256 px = +28,5 %**. Montant gauche (x=74) : y 750..764 puis 790..838 (trou de 25 px) ; montant droit (x=1011) : **rien** au seuil 45. Les extrémités du trou **s'estompent** (dégradé sur ~30 px), elles ne sont pas coupées net. **Contrôle positif sur la même image** : le cadre de carte (y=536, y=886) et celui de la bannière (y=353) sortent en **UN seul segment** continu, coins arrondis correctement tracés. `03`,`04`,`05`,`21`,`22` | La cause hors image (je ne l'ai pas cherchée, comme demandé). |
| `M6` | MAJEUR | NOUVEAU | non | correcteur | **Une seule colonne** au lieu de deux : la densité s'effondre et la liste déborde l'écran. | Réf `.planche` = `grid-template-columns:1fr 1fr` — colonnes mesurées x **40..523** et **554..1040**, gouttière 28 px (CSS : 8 px × 3,6 = 28,8). Capture : **une** colonne x **35..1044** (1010 px = 280 CSS) ⇒ carte **2,08× plus large** ; contrôle négatif : 0 séparation verticale dans la bande d'une carte. Conséquence : 4 packs = **1 648 px** et le 4ᵉ est coupé, là où la maquette loge 4 packs + un pack large « Soutenir le studio » + Wexler dans 2 102 px. `11` | — |
| `M7` | MAJEUR | NOUVEAU | non | correcteur | **Hiérarchie du texte inversée** : le sous-titre anglais de la maquette est devenu le titre, et le nom français est relégué en ligne de service. | Maquette #99 : `.nom` = « **100 jetons** » (700 9 px `DejaVu Serif` #efe6d4) ; `.en` = « Pack — 100 Marks » (6,5 px `DejaVu Sans` **#6f7887**, gris-bleu secondaire). Capture : « **Pack — 100 Marks** » en sérif crème **(234,224,200)**, capitale **23 px** — c'est le texte du `.en` **à la taille du `.nom`** (23,6 px attendus) ; le nom français n'apparaît que comme « donne 100 jetons » en sans gris (185,173,146). S'y ajoute « en boutique », sans homologue dans la maquette. `13`,`23` | — |
| `M8` | MAJEUR | NOUVEAU | non | correcteur | Le **bandeau de voix (Wexler)** est absent de l'écran visible. Il est présent dans les **trois** cadres du groupe (#98, #99, #100) et posé en `flex:none` en pied de panneau : c'est une pièce fixe de l'écran, pas un état. | Réf : y 1825..2102 = **278 px = 77,2 CSS** ; fond #12100e (écart 0), bord #3a2e24 (écart 0) ; encre y 1860..1990 (avatar + nom + rôle) et 2003..2033 (citation). Capture : rien entre la dernière carte et le dock — encre nulle de y=2123 à y=2178. `24`,`12` | S'il est sous la ligne de flottaison (défilement non vérifiable sur une image fixe). |
| `M9` | MAJEUR | NOUVEAU | non | correcteur | **Aucun intitulé de rayon.** Rien ne dit au joueur ce qu'est cette liste, ni qu'il en existe une autre. La maquette distingue explicitement « payés **en jetons** » et « payés **au magasin** ». | Réf `.etag h3` : « LES EXTRAS — PAYÉS EN JETONS » (#98) / « LES JETONS — PAYÉS AU MAGASIN » (#99), 7,5 px, `letter-spacing` 1,6 px, #8d93a0, capitales — bande d'encre y **649..674**. Capture : **aucune bande d'encre** entre la bannière (fin 505) et la carte 1 (début 535) ⇒ 30 px de fond nu. `21`,`26` | — |
| `m1` | MINEUR | NOUVEAU | non | correcteur | **Pas de séparateur de milliers** dans les nombres des articles, alors que le bandeau du **même écran** en met. | Contrôle positif sur la même image : « 9 627 820,00 » → blancs **[16, 4, 7, 16, 5, 6, 4, 5, 5, 14]** ⇒ deux blancs de **16 px** contre une médiane de 5-6. Cartes : « Pack — 1400 Marks » → blancs **[2,3,14,20,6,4,5,17,3,2]** ⇒ chiffres séparés de **6/4/5 px**, aucun blanc large ; idem « 3500 » (6/5/5). Texte de la maquette (#99) : « **1 400** jetons », « **3 500** jetons ». `23` | — |
| `m2` | MINEUR | NOUVEAU | non | correcteur | Le **jeton** n'est plus gravé et il a rétréci. Le sens de l'écart est **plus gris**, pas plus jaune : le haut de lumière est le même, c'est le modelé et la gravure qui manquent. | Réf `.solde svg.jt` : **45×45 px** (12,5 CSS ; CSS : 13), médiane (215,169,77), **creux 53 %** (le T gravé). Capture : **39×39 px** (10,8 CSS), médiane **(151,128,78)**, **creux 20 %**. Maximum de luminance quasi identique : **170,7** contre 174,1. Médiane : ΔR −64, ΔG −41, **ΔB +1**. `15` | — |
| `m3` | MINEUR | NOUVEAU | non | correcteur | La dernière carte est **coupée en plein milieu d'une ligne de texte**, sans aucun indice qu'il y a une suite. | L'encre s'arrête net à **y=2122** (0 px d'encre de 2123 à 2178) ; la ligne visible fait **17 px** là où une ligne entière en fait ~28. La coupe est **56 px au-dessus** des ronds du dock (y=2179) : c'est le rect de contenu, **pas** le dock — aucun contenu ne passe sous le dock. Aucun fondu, aucun ascenseur. `12`,`17` | Si l'écran défile (une image fixe ne le dit pas). |
| `m4` | MINEUR | NOUVEAU | non | correcteur | Le titre est **20,7 % trop haut de capitale**, à largeur rendue identique ⇒ l'interlettrage est nettement plus serré. *(Même sujet que M4 ; grandeur distincte.)* | Réf : capitale **29 px** (= `.ens` 11 CSS × 3,6 × 0,732), largeur **343 px**. Capture : capitale **35 px**, largeur **345 px**. Δ capitale **+6 px = +20,7 %** (tolérance ≤ 5 %) ; Δ largeur **+0,6 %**. Couleur identique (écart 1/255). `09` | — |
| `m5` | MINEUR | NOUVEAU | non | correcteur | L'**onglet actif du dock est EMPIRE** alors que le chemin joueur déclaré est « Plus → LA VITRINE ». | La `pointe` dorée est sous le **premier** rond (x 205..312), sur **les deux** planches. `16`,`17` | Le dossier déclare la couverture (c) « onglet actif asserté : **NON déclaré** » ⇒ je ne peux pas savoir si l'écran a été monté par le vrai chemin ou en surimpression. À trancher avec le journal du run. |

**Compte : 3 BLOQUANT · 9 MAJEUR · 5 MINEUR = 17 findings.** (ASSUMÉ et ARBITRAGE sont dans les tables
à part ci-dessous et ne sont pas comptés ici.)

### Table à part — ASSUMÉ (vérifié « rendu proprement »)

| ce qu'on voit | pourquoi | rendu proprement ? |
|---|---|---|
| Aile droite : « JOUR 50 » puis « — » à la place de la phase | phase vidée hors district — état VOULU (doctrine du dossier) ; ARGENT et JOUR sont alimentés (« 9 627 820,00 € », « JOUR 50 ») | **Oui** — le tiret est centré, aligné sur la ligne de valeur, pas de libellé de repli. |
| Médaillon « Brûlant / CHALEUR », anneau et filet en braise | état `.chaud` ; le témoin est la CSS `.tel.chaud`, pas le PNG calme | **Oui** — filet mesuré **(224,102,73)** contre `--braise` (224,102,74) : écart **1/255**, et la rampe 18 %/82 % est conforme. |
| Losange or sous le médaillon (y 215..231, 17 px) | canonique (dossier) | **Oui.** |
| Bandeau de 143 px et dock plus hauts que l'évocation du cadre de série 6 | chrome partagé, autre échelle (×2,755 contre ×3,6) | **Oui** — pas des ronds du dock à **17,36 %** contre **17,35 %** au canon. |

### Table à part — ARBITRAGE (pas corrigible côté écran)

| ce qu'on voit | pourquoi c'est un arbitrage | destinataire |
|---|---|---|
| Les 4 ronds du dock sont **vides** (aucune icône 20×20) | arbitrage user connu (« j'aime pas les icônes ») | arbitrage user — déjà tranché |
| Flèche retour « ← » présente sur la planche `03efb90`, absente sur `cf99604` | arbitrage user connu. Mesuré : c'est la **seule** différence structurelle entre les deux planches — bbox (44,27)-(159,119) ; partout ailleurs les bandes coïncident à ≤1 px et les 0,88 % de pixels qui diffèrent ont une amplitude locale de **159** contre **19** pour les identiques ⇒ bords de glyphes, anti-crénelage entre deux runs. `25` | arbitrage user |
| Dock « FILIÈRE » là où le canon dit « MARCHÉ » | routé (dossier) | — ne pas compter |
| Anglais dans la **référence** : `HEAT`, `$ 24 850`, « Callsign Color Pack », « Theme: Sodium Night », « Extra Save Slot », « Third Save Slot » | ruling « fr réel » du 2026-09-02 : le client a raison, la maquette est en retard | **blender** — maquette à mettre à jour |
| Police **sérif** du CHROME : la référence a rendu `Georgia,"Times New Roman",serif` en **Noto Serif** (`fc-match` re-joué : `Georgia → NotoSerif-Regular.ttf`), le client embarque DejaVu Serif | substitution au rendu de la référence | arbitrage — non opposable sur le bandeau |
| Police du **CONTENU** : **aucun arbitrage**. La CSS `.vitr6` demande explicitement `'DejaVu Serif'` (titre, nom d'article) et `'DejaVu Sans'` (le reste) ; `fc-match` rend `DejaVu Serif → DejaVuSerif.ttf` et `DejaVu Sans → DejaVuSans.ttf` ⇒ **référence et client partagent la police** sur cet écran, les hauteurs de capitale sont pleinement opposables. `25` | — |

---

## 5. Autres résolutions

- **1080×2400** : les deux planches fournies. Toutes les mesures ci-dessus.
- **1080×1920** : **absente du dossier** — non vérifié (voir §6). Rien ne dit comment la colonne unique
  de M6 se comporte quand la hauteur disponible tombe de 2400 à 1920 ; la seule chose mesurable ici est
  qu'à 2400 la 4ᵉ carte est déjà coupée (m3), donc la marge est nulle.
- **Planche `03efb90` (surimpression) vs planche `cf99604` (suite de l'écran)** : comparées **chacune à
  la maquette**, jamais l'une à l'autre. Toutes deux portent les mêmes 17 findings ; les bandes d'encre
  coïncident (215-231, 273-307/308, 352-505, 535-887, 917-1320, 1350-1753, 1783-2122) et les 7 rails
  troués de M5 sortent aux mêmes abscisses. Rien de coupé latéralement, rien hors cadre, rien sous le
  bandeau, rien sous le dock.

---

## 6. Ce que je n'ai pas pu vérifier

| point | pourquoi | la mesure hors image qui trancherait |
|---|---|---|
| **La 1080×1920** | non fournie (dénominateur GO : « (a) deux résolutions — NON, 2400 seulement ») | une capture 1080×1920 par la même suite |
| **Le défilement** | image fixe ; l'encre s'arrête net à y=2122 sans fondu ni ascenseur. Je ne peux donc pas dire si les extras (B1), le pack « Soutenir le studio » et Wexler (M8) sont **sous la ligne de flottaison** ou **absents** | une capture après défilement jusqu'en bas, ou l'inventaire des enfants du conteneur de liste |
| **Les VALEURS affichées** | identité déclarée par corps de commit, journal non joint (dénominateur GO : « (i) identité — DÉCLARÉE ») ; aucune ligne `[DemoIdentityResolver] régime=env identité=…` dans le dossier | joindre la ligne du journal du run, puis comparer aux corps réels du compte gelé |
| **Le « — jetons » signalé par le corps de commit `1d3d412`** | **VÉRIFIÉ, et il n'est pas là** : les deux planches affichent bien « **0 jetons** », glyphe zéro plein, capitale 38 px, bbox (442,387)-(467,424) — pas un tiret. `09` | — (point fermé) |
| **La ligne `[CHROME-ALIMENTE]`** | non déclarée (dénominateur GO : « (d) — NON déclaré ») ; mesurée sur l'image : ARGENT et JOUR sont alimentés, la phase est le tiret voulu | — (tranché sur l'image) |
| **L'onglet actif** | (c) non déclaré ; la `pointe` est sous EMPIRE sur les deux planches, mais je ne sais pas si le chemin joueur a été exercé | le journal du run, ou une capture prise après « Plus → LA VITRINE » avec l'onglet asserté |
| **L'animation** | aucune paire T/T+1 (dénominateur GO : « (b) — NON »). ⚠️ **Le mandat (amendé le 2026-09-07) et `dossier.md` se contredisent** : le mandat dit que l'animation est VOULUE sur un écran neuf ; le dossier recopie le ruling du 2026-08-27 « AUCUNE ». **Mesuré, et ça tranche pour cet écran** : la CSS de série 6 porte 313 `@keyframes` mais **zéro** sur `.vitr6`, et les trois cadres du groupe ne contiennent **aucun** `animation` ni `<animate>` ⇒ la maquette de CET écran ne demande rien. | une paire T/T+1 s ; et faire corriger la contradiction dans le gabarit de dossier |
| **La cause du cadre troué (M5)** | hors image, et la consigne est de ne pas ré-enquêter | inspection du dispositif qui trace ce cadre |
| **Le catalogue servi** | le rapport juge-données de cet écran ne m'est délibérément pas fourni ; la maquette annonce 9 SKU, l'écran visible en montre 4 | la table de couverture du juge-données sur le compte gelé |
| **Le contraste le plus faible** | mesuré : « DERRIÈRE LA VITRE » = **4,34:1** ((119,119,119) sur (13,13,13)), capitale 23 px. Au-dessus du plancher **3:1** des grands textes, en dessous du 4,5:1 des petits. Je ne tranche pas la classe de taille sur une image ⇒ **pas classé en finding**. Tous les autres textes passent largement : titre 9,15:1 · « 0 jetons » 5,71:1 · titre de carte 14,80:1 · corps 8,75:1. `14` | la taille en points sur l'appareil |

---

## Annexes

### 1. Inventaire de la référence (`reference-㉓-1080x2102.png`, cadre #98)

Échelle **×3,6** (300 CSS = 1080 px). Toutes les valeurs CSS citées viennent des 43 règles `.vitr6` de
`ecrans-brennar-6.html` ; la colonne « mesuré » les confronte à l'image (l'image fait autorité).

| id | catégorie | parent | bbox px (CSS) | forme / remplissage | texte | mesuré |
|---|---|---|---|---|---|---|
| `R.compt` | comptoir | panneau | y 434..587 (42,8 CSS de haut) | dégradé 180° #2a231f→#1b1613, bord bas 2 px #6b4f14 | — | haut (40,33,29) écart 2 · bas (29,23,20) écart 2 · filet (107,79,20) **écart 0**, 7 px |
| `R.compt.ens` | titre | `R.compt` | (48,490)-(390,518) | — | « LA VITRINE », `DejaVu Serif` 700 11 px, ls 2,4 px, capitales | capitale **29 px**, largeur **343 px**, couleur **(217,171,78) écart 0** |
| `R.compt.solde` | bourse | `R.compt` | (696,466)-(1033,547) — **338×82 px** | fond #12100e, bord 1 px #6b4f14, rayon 4 | jeton gravé + « **50** » + « JETONS » | « 50 » **(240,223,196) écart 0** · « JETONS » **(154,138,106) écart 0** · jeton **45×45 px**, médiane (215,169,77), creux **53 %** |
| `R.vitre` | plateau | panneau | y 588..1824 (343,6 CSS) | dégradé 168° #151b23 → #0f141a 46 % → #0c1015 | — | haut (28,34,42) · bas (12,16,22) **écart 1** · **B−R = +14** en haut |
| `R.reflet` a/b | reflet | `R.vitre` | obliques 14°, 52 % et 24 % de large | `#ffffff0a` / `#ffffff07` | — | profil à y=1700 : (13,17,22) au repos → **(19,23,29)** dans le reflet ⇒ **+6/255** |
| `R.etag.h3` | intitulé | `R.vitre` | y 649..674 | — | « LES EXTRAS — PAYÉS EN JETONS », 7,5 px, ls 1,6 px, #8d93a0 | bande d'encre **26 px** |
| `R.planche` | étagère | `R.vitre` | 2 colonnes x **40..523** et **554..1040** | grille 1fr 1fr, gouttière 8 px, bord bas 3 px #3a2e24 + ombre 0 3px #16110d | — | gouttière **28 px** (attendu 28,8) · tablette y 1616..1625, **(59,47,37) écart 1** |
| `R.art` ×4 | article | `R.planche` | ~484 px de large | dégradé #221a20→#1a141a, bord 1 px #3a2530, rayon 4 | — | fond haut **(34,26,32) écart 0**, bas (27,20,26) écart 1 |
| `R.art>svg` | illustration | `R.art` | 64×41 CSS = **230×148 px** | plaque émaillée / carte encadrée / clé numérotée | — | **196 teintes**, 8 488 px d'encre ; bande d'encre y 746..860 (rangée 1), 1240..1345 (rangée 2) |
| `R.art.nom` | nom | `R.art` | y 892..918 | `DejaVu Serif` 700 9 px, #efe6d4, centré | « Couleurs de nom »… | capitale **26 px** (« C », dépassement de ronde) ; attendu 23,6 |
| `R.art.en` | sous-titre | `R.art` | y 930..964 | `DejaVu Sans` 6,5 px, **#6f7887** | « Callsign Color Pack »… | — |
| `R.etiq` | étiquette de prix | `R.art` | y 979..1078 (**100 px**) et 1457..1516 | fond **#efe6d4**, bord #b9ac92, rayon 2 ; variante `.hors` fond #e6dbc9 **pointillé** ; variante `.magasin` fond #1b232c bord #3f4a57 | jeton + « 50 / 80 / 100 / 200 » #241f1c | — |
| `R.manque` | mention | `R.art` | y 1098..1115 et 1536..1554 | — | « hors d'atteinte », 6,5 px, **#d97a6a** | — |
| `R.voix` | bandeau de voix | panneau | y 1825..2102 (**278 px = 77,2 CSS**) | fond #12100e, bord haut 1 px #3a2e24, avatar 32 CSS | « Wexler » / « DERRIÈRE LE COMPTOIR » / citation italique sérif #d8cdb6 | fond **(18,16,14) écart 0** · bord **(58,46,36) écart 0** · encre y 1860..1990 et 2003..2033 |

**Couche globale (réf, zone panneau y 434..2090)** : fond dominant **26,0 %** de l'aire · encre
(|ΔL| > 10) **14,4 %** · luminance moyenne **33,8** · palette : (31,24,29) 19,3 % · (28,21,27) 18,6 % ·
(18,16,15) 15,6 % · (14,18,24) 14,2 % · (33,32,33) 9,8 % · (22,23,28) 8,3 % · (30,26,31) 7,9 % ·
**(148,132,110) 6,2 %** (l'encre claire : illustrations, étiquettes, textes).

### 2. Inventaire de la capture (`capture-1080x2400.png`)

Échelle **×3,6** pour le contenu (300 CSS = 1080 px) ; **×2,755** pour le chrome.

| id | catégorie | bbox px | forme / remplissage | texte | mesuré |
|---|---|---|---|---|---|
| `C.bandeau` | chrome | y 0..142 | verre sombre, filet plein largeur y 141..142 | « ARGENT / 9 627 820,00 € » · médaillon « Brûlant / CHALEUR » · « JOUR 50 / — » | filet **(224,102,73)** = `--braise` écart 1 ; rampe 18/82 % conforme |
| `C.losange` | ornement | y 215..231 (17 px) | losange or | — | canonique |
| `C.titre` | titre | (367,273)-(711,307) | — | « LA VITRINE », sérif or, **centré** (centre 539 / 540) | capitale **35 px**, largeur **345 px**, **(217,171,77)** |
| `C.banniere` | alerte | (60,352)-(1029,505) — **970×154 px** | cadre arrondi continu, bord (117,91,41) | « **0 jetons** » (capitale 38 px) + « le don de bienvenue ne se reçoit qu'une fois — rien ne recrédite en jouant » (15 px) | les deux en **(224,102,73)** = braise |
| `C.carte` ×4 | carte | y 535..887 · 917..1320 · 1350..1753 · 1783..**2122 (coupée)** ; x 35..1044 | cadre arrondi **continu** (106,106,106), rayon ~27 px, **aucun remplissage** — (13,13,13) à l'intérieur | — | écart entre cartes **30 px** ; largeur **1010 px = 280 CSS** |
| `C.carte.jeton` | jeton | 39×39 px (10,8 CSS) | disque à dégradé radial, sans gravure | — | médiane **(151,128,78)**, max L **170,7**, creux **20 %**, **63 teintes** |
| `C.carte.titre` | titre | ex. (134,569)-(521,601) | — | « Pack — 100 / 600 / 1400 / 3500 Marks », sérif **(234,224,200)** | capitale **23 px** ; **aucun séparateur de milliers** (blancs 6/4/5 px) |
| `C.carte.l2` | service | y ~639..649 | — | « en boutique », sans **(185,173,146)** | hauteur d'œil **11 px** |
| `C.carte.l3` | service | y ~689..704 | — | « donne N jetons », sans (185,173,146) | ascendante **16 px** |
| `C.carte.bonus` | bonus | ex. y 1090..1129 | **texte nu**, aucun cartouche | « +20 / +40 / +75 % de jetons par euro », **(217,171,77)** | maquette : chip **plein or #d9ab4e** sur fond #241f1c, en absolu haut-droite |
| `C.carte.bloc` | bloc désactivé | y 733..855 (122 px, **29 %** de la carte) | cadre **TROUÉ** (voir M5) | « DERRIÈRE LA VITRE » (capitale 23 px, **(119,119,119)**) + « aucun vérificateur de reçu n'est câblé — cet achat ne peut aboutir » (12 px, (185,173,146)) | rails x 89..624 / 968..990 ; trou 343 px décentré de +28,5 % |
| `C.dock` | chrome | ronds y 2179..2327 | 4 ronds **vides**, `pointe` or sous le 1ᵉʳ | EMPIRE · FAMILLE · FILIÈRE · PLUS | pas **17,36 %** de la largeur (canon 17,35 %) ; libellé h **2,50 %** (canon 2,47 %), (185,173,146) |
| — | **absents** | — | — | — | comptoir · vitre en dégradé · reflets · tablette · illustrations · étiquettes de prix · intitulés de rayon · bandeau de voix |

**Couche globale (capture, zone contenu y 200..2160)** : fond dominant **90,9 %** · encre **9,0 %** ·
luminance moyenne **21,1** · palette : **(13,13,13) 91,6 %** · (110,108,103) 1,9 % · (200,183,147)
1,6 % · (135,128,112) 1,5 % · (49,47,43) 1,2 % · (147,90,53) 1,0 % · (96,90,81) 0,8 %.

### 3. Correspondance des repères

| | référence | capture | rapport |
|---|---|---|---|
| largeur | 1080 px = 300 CSS | 1080 px = 300 CSS (contenu) | **×1,00** — un écart de taille sur le contenu est RÉEL |
| chrome | évocation à 300 CSS (non opposable) | `hud-brennar.html` 392 CSS × 2,755 | jugé contre `hud-canon-1176.png` (×3) **en % de largeur** |
| haut du contenu | haut du panneau `.vitr6` = y **434** (mesuré : saut de luminance +21,8) | bas du bandeau = y **143** (filet mesuré à 141..142) | aligné sur le bas du bandeau, jamais au pixel absolu |
| bas du contenu | bas du `.tel` = y 2102 | rect de contenu coupé à y **2123** ; ronds du dock à y 2179 | aligné sur le haut du dock |
| hauteur totale | 584 CSS (2102 px, 9:17,5) | 666,7 CSS (2400 px, 9:20) | les 82,7 CSS de plus sont absorbés par la zone de contenu |

Vérifié sur l'image avant usage : largeur du bandeau = 1080 px (filet plein largeur, `08`) ; hauteur du
bandeau = **143 px** mesurée (attendu 52 CSS-HUD × 2,755 = 143,3).

### 4. Scripts — `mesures/*.py`

| script | ce qu'il mesure | contrôles |
|---|---|---|
| `01-bandes.py` | profils de lignes, grandes frontières | CP largeur=1080 ; CN deux lignes distinctes |
| `02-crops.py` | découpes de lecture | — |
| `03-cadre-interne.py` | 1ʳᵉ sonde du cadre troué | CN bande intérieure |
| `04-rails.py` | profil BRUT (non seuillé) du rail haut | localisation verticale explicite |
| `05-cadres-tous.py` | balayage de TOUS les rails horizontaux | CP rails continus ; CN ligne de fond |
| `06-palette.py` | palettes quantifiées, aplats | CP même aplat 2 fenêtres ; CN aplats différents |
| `07-geometrie.py` | bandeau, dock | CP couverture pleine largeur |
| `08-chrome-filet.py` | filet du bandeau vs canon et CSS `.chaud` | **CP canon = #b08d3e écart 0** ; CN 6 px au-dessus |
| `09-titres.py` | titre, bourse, bannière | **CP `.ens`/`.solde` = CSS écart 0** ; CN fenêtre vide |
| `10-articles.py` | richesse chromatique des articles | CP illustration réf 196 teintes ; CN fond pur 1 teinte |
| `11-mise-en-page.py` | colonnes, bandes horizontales | **CP gouttière 28 px** ; CN 1 colonne en capture |
| `12-coupe-dock.py` | ligne de coupe du contenu | encre nulle après y=2123 |
| `13-typo.py` | hauteurs de capitale, couleurs | CP `.ens` 29 px ; CN fenêtre de fond |
| `14-contraste.py` | contrastes WCAG sur l'art réel | CP blanc/noir 21,00 ; CN gris/gris 1,00 |
| `15-jeton.py` | diamètre, couleur, gravure du jeton | CP jeton réf creux 53 % |
| `16-dock-et-planches.py` | dock, diff des deux planches | CP/CN de sonde de ronds |
| `17-dock.py` | pas, diamètre, libellés du dock | **CP pas 17,35 / 17,36 %** ; CN 300 px plus haut |
| `18-matieres.py` | matières contre les hex CSS | **CP 5 valeurs à écart ≤ 2** ; CN matières différentes |
| `19-densite.py` | densité, fond dominant | CP réf meublée ; **CN image unie fabriquée sur place** |
| `20-cadre-troue.py` | **v1 — défectueuse**, conservée pour trace (verdict uniforme « +0 % ») | son CP a révélé le défaut |
| `21-cadre-troue-v2.py` | v2 : tous les segments, plus grand trou | **CP cadres continus en 1 segment** ; CN ligne de fond |
| `22-montants-orphelins.py` | montants verticaux, couleurs des traits | a **réfuté** l'hypothèse « cadre de carte ouvert » (les coins sont bien tracés) |
| `23-nombres.py` | séparateur de milliers | **CP « 9 627 820,00 » → 2 blancs de 16 px** ; CN « 100 » |
| `24-inventaire-ref.py` | inventaire chiffré de la référence | CP 5/7 à écart ≤ 1 (2 fenêtres mal placées, signalées) |
| `25-fleche.py` | différence entre les deux planches, `fc-match` | CP corps/dock ; CN coin haut-gauche ; amplitude locale 159 vs 19 |
| `26-cartes-ref.py` | bandes d'encre de la référence au seuil 55 | CP/CN de critère de teinte (critère **écarté**, trop faible : +2/255) |

Chaque script imprime la taille des images qu'il ouvre. Les sorties sont reproductibles en l'état
(`python3 mesures/<script>.py` depuis `mesures/`).
