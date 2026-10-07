# Juge visuel ⊥ — ④ Accueil / « LA SUITE » — r3 — 2026-10-07

Captures : `captures-2026-10-07/p1_lancement_1080x1920.png` et `…_1080x2400.png` (tip client
`dea56042`, compte neuf `sha256:580c1aa7`, P1 prise APRÈS la lecture de LA SUITE — 3 lignes,
10 000 €, jour 1, Aube, COLD).
Référence : `r2-2026-10-07/reference/cadre-4-la-suite.png` (1080×2102, atelier ×3,6 de 300 px CSS,
chrome HUD × 300/392) — **cadre 4 vérifié conforme à l'état capturé** : étiquette de l'atelier
« ④ L'ouverture — un joueur neuf, planque non vide : la suite, ordre réel A · B|C · E · D plafonné
à 3 », 3 rangées, 3ᵉ ligne = la planque / BLANCHIR, carte de file « Lt. … attend vos ordres /
LÉGÈRE ». C'est bien l'homologue.

## Verdict : **NON APPROUVÉ**

Le panneau « LA SUITE » est, en typographie et en or, quasiment la maquette — mais le **fond peint
n'est pas assombri** (×2,5 à ×3,0 de luminance), et à la résolution cible 1080×2400 cela fait
**passer le bouton or du 1ᵉʳ au 13ᵉ rang** des zones les plus claires de l'écran : l'ordre de
lecture est inversé. S'y ajoute un **gris-ardoise unique (73,85,96)** qui a remplacé les quatre
valeurs graduées des surfaces de verre, et qui transforme les boutons secondaires en plaques
pleines dont le libellé tombe à **2,81:1** de contraste.

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Les trois images font **1080 px de large** ⇒ toute mesure horizontale et toute mesure de TAILLE se
compare en px bruts, sans normalisation (`m1`). Les hauteurs diffèrent (2102 / 1920 / 2400) : aucune
position verticale absolue n'est comparée.

| # | grandeur | référence | jeu | écart | script |
|---|---|---|---|---|---|
| 1 | largeur des trois images | 1080 | 1080 / 1080 | **0** | `m1` |
| 2 | luminance moyenne du **bandeau** (y 0..138) | 27,6 | 26,7 / 26,7 | **−0,9** (−3 %) | `m2` |
| 3 | **marges latérales du panneau** | 49 / 49 px | 49 / 49 px | **0** | `m5b`, `m5c` |
| 4 | **largeur du panneau** | 982 px | 982 px | **0** | `m5b`, `m5c` |
| 5 | **filet laiton du bord haut du panneau** (étendue / centre) | 631 px, centre x=539 | 650 px, centre x=540 | +3 % / 1 px | `m4` |
| 6 | **dégradé du bouton OR**, haut → bas | (232,195,105) → (203,157,59) | (231,194,103) → (203,157,59) | **≤ 2/255 par canal** | `m15`, `m22` |
| 7 | **encre des titres de rangée** (jeton `--or-vif`) | (242,201,107) | (242,201,106) | **1/255** | `m7`, `m22` |
| 8 | **encre des sous-lignes** (jeton `--creme-2`) | (185,173,146) | (185,173,146) | **0/255** | `m7` |
| 9 | **encre de « LA SUITE »** | (185,173,146) | (185,173,146) | **0/255** | `m22` |
| 10 | **encre de « Lt. … attend vos ordres »** | (219,210,187) | (218,209,188) | **≤ 1/255** | `m18` |
| 11 | **hauteur de capitale du titre de rangée** (« L » de « Le labo ») | 30 px | 29 / 28 px | −3 % / −7 % | `m8` |
| 12 | **chasse du titre de rangée** (chaîne identique) | 437 px | 417 px | −4,6 % | `m8` |
| 13 | **dock : diamètres des 4 ronds** | 119 px ×4 | 118/119/119/118 | **≤ 1 px** | `m14`, `m14b` |
| 14 | **dock : écarts entre ronds** | 68 / 68 / 68 | 69 / 68 / 69 | **≤ 1 px** | `m14`, `m14b` |
| 15 | **dock : empan bord à bord** | 680 px (x 200..879) | 680 px (x 200..879) | **0** | `m14`, `m14b` |
| 16 | **trait de l'onglet actif** (EMPIRE) | présent, ~36 px | présent, **38 px × 5** | ≈ CSS 38,5 px | `m14` |
| 17 | **épaisseur de l'anneau laiton du médaillon** | 5 px | 5 px | **0** | `m12`, `m13` |
| 18 | **centre horizontal du médaillon** | x = 544 | x = 544 | **0** | `m12` |
| 19 | **gouttière panneau → barre TRANCHER** | 37 px (CSS 10 px ×3,6 = 36) | 41 px (1920) | +4 px | `m1`, `m16` |
| 20 | **marge basse sous les libellés du dock** | — | **58 px aux DEUX résolutions** | ancré en bas | `m1` |
| 21 | **étendue des ors de l'écran** (R / G / B) | 12 / 10 / 6 | **11 / 7 / 2** | plus serrée qu'en réf | `m22` |
| 22 | **compte de parties** : rangées / séparateurs / onglets / carte de file | 3 / 2 / 4 / 1 | 3 / 2 / 4 / 1 | **0** | `m10`, `m14`, `m17` |
| 23 | **séparateurs : étendue** | 880 px (89,6 % du panneau) | 891–916 px (90,7–93,3 %) | ≤ +4 pts | `m10` |
| 24 | **palette : somme des parts** | 100,0 % | 100,0 % / 100,0 % | — | `m25` |

Le #6 et le #7 méritent d'être lus ensemble : le dégradé or est juste **au bit près sur les trois
canaux, en haut comme en bas**. La conversion sRGB → linéaire est donc faite, et faite juste, là où
elle a été faite. C'est ce qui rend les écarts de gris-ardoise ci-dessous diagnostiques : ils ne
sont pas « le moteur compose autrement », ils sont **une valeur**.

---

## 0. L'écran, tel que la maquette le dit

**But.** On ouvre la journée. L'écran répond à une question et une seule : *qu'est-ce que je fais
maintenant ?* Il n'affiche pas un tableau de bord, il affiche **trois gestes** et, en dessous, la
seule chose qui attend une décision.

**Ordre de lecture.** ① le **bouton or plein** — le seul aplat lumineux de tout l'écran, et il
désigne le geste du jour ; ② le médaillon-manomètre cerclé de laiton, en haut au centre ;
③ le montant en or à gauche ; ④ les titres or des trois rangées ; ⑤ la carte de file
(« Lt. … attend vos ordres » / TRANCHER) ; ⑥ le dock, quatre grands médaillons sombres.

**Zones.** (a) chrome haut translucide posé **sur** l'art, clos par un filet laiton ; (b) l'art —
un quartier peint en isométrie, **tenu très sombre**, qui occupe la moitié haute sans jamais
réclamer l'œil ; (c) la plaque « LA SUITE », rectangle très arrondi, bleu nuit, liseré laiton sur
son bord supérieur ; (d) la carte de file, plus basse, plus discrète ; (e) le dock.

**Traits d'identité.**
1. **Un seul point lumineux** : le bouton or. Tout le reste est entre L=8 et L=35.
2. **Chaud sur bleu nuit** : un crème (185,173,146), un or vif (242,201,107), un laiton (176,141,62).
3. La ville est **peinte mais éteinte** — on la devine, on ne la lit pas.
4. Les surfaces de verre sont **graduées** : le fond du bouton fantôme (L=25) < le séparateur
   (L=34) < le liseré du panneau (L=37) < le liseré de la carte de file (L=52). Quatre valeurs,
   quatre rôles.
5. Les boutons secondaires sont des **fantômes** : un voile blanc à 10/255 et un filet, rien de plus.

---

## 4. Lecture globale — l'écran en jeu se lit-il comme la maquette ?

Le panneau, lui, **est** la maquette : mêmes mots, mêmes jetons de couleur au pixel, même dégradé
or au bit, mêmes marges, même dock, même filet laiton. Le travail de typographie et d'or est fait.

Mais deux des cinq traits d'identité sont perdus, et pour deux causes seulement.

**La ville n'est plus éteinte.** La texture est pourtant la bonne (corrélation du profil vertical
texture ↔ image : **+0,98** en réf, **+0,91** / **+0,76** en jeu ; contrôle négatif image retournée
**−0,80 / −0,62 / −0,71**). Ce qui manque, c'est l'assombrissement que la maquette applique
(`filter:brightness(.42)` + le voile `voile-scene`) : le rapport jeu/référence vaut **2,57 · 2,66 ·
2,64** par tiers de bande à 1920 et **2,57 · 2,73 · 3,01** à 2400, contre une prédiction de
**2,38** pour le seul filtre — et l'excédent suit exactement le profil du voile (fort en haut, nul
au milieu, moyen en bas). La luminance moyenne de l'écran passe de **26,2 à 50,6 (×1,9)** et à
**55,0 (×2,1)** ; la part de pixels clairs de **3,9 % à 9,5 % puis 12,8 %**. **Conséquence que
le joueur perçoit : à 1080×2400, le bouton or n'est plus que le 13ᵉ bloc 90×90 le plus clair de
l'écran sur 1144 — les douze premiers sont de la ville.** À 1080×1920 il tient encore le 1ᵉʳ rang
sur 902, parce qu'il y a 406 px de décor en moins ; en référence il est 1ᵉʳ sur 990 et de loin. Le
défaut est donc **pire à la résolution cible du projet**. Et l'eau du quai, au bas de la texture,
ressort en bleu-pétrole saturé sous la barre TRANCHER là où la maquette la rend quasi noire.

**La gradation du verre a été écrasée en une seule valeur.** Le liseré du panneau, les deux
séparateurs de rangée, le liseré de la barre TRANCHER et le remplissage des boutons secondaires
portent en jeu **exactement (73,85,96)** (le remplissage : (66,79,96)) ; la maquette en a quatre
valeurs distinctes — (20,26,36), (29,34,44), (32,37,47), (41,53,70). Un ardoise froid unique,
2,2 à 3,3 fois trop clair, s'est substitué à quatre rôles. Le plus visible : le bouton secondaire
n'est plus un fantôme mais une **plaque pleine** qui concurrence le bouton or, et son libellé, passé
du crème chaud (234,224,200) au blanc froid (238,241,242), tombe à **2,81:1** de contraste sur elle
contre **6,21:1 / 6,70:1** en référence — sous le plancher de doctrine.

**Les trois écarts de tête, par ce qu'un joueur perçoit** : (1) la ville éclairée qui prend l'œil
avant le bouton du jour, et qui le prend *davantage* sur un vrai téléphone 20:9 ; (2) les deux
boutons secondaires devenus des plaques pleines gris-bleu, qui mettent trois boutons au même niveau
là où la maquette en désigne un ; (3) le libellé de ces boutons à 2,81:1, le seul texte de l'écran
sous le plancher.

---

## 3. Écarts

Un finding par ligne ; **gravité dans la liste fermée BLOQUANT / MAJEUR / MINEUR**, rien de compté
ailleurs. `critère` = `NOUVEAU` quand l'instrument ou la grandeur n'existait pas au r1 (le r2 n'a
mesuré aucun écart visuel : pas de capture). La vérification des écarts **ASSUMÉS** et les
**ARBITRAGES** sont dans les deux sections qui suivent la table, et ne sont **pas** comptés ici.

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `G1` | **BLOQUANT** | NOUVEAU | **Le fond peint n'est pas assombri ⇒ l'ordre de lecture s'inverse à 1080×2400.** La maquette tient la ville entre L=8 et L=35 ; le jeu la rend à L=45..90. Le bouton or cesse d'être le point lumineux de l'écran. | Rapport jeu/réf par tiers de la bande de décor : **×2,57 / ×2,66 / ×2,64** (1920) et **×2,57 / ×2,73 / ×3,01** (2400) — prédiction 2,38 pour un `brightness(.42)` absent, l'excédent suivant le profil du voile. Luminance moyenne d'écran **26,2 → 50,6 → 55,0** ; pixels L≥90 **3,9 % → 9,5 % → 12,8 %**. **Rang du bouton or parmi les blocs 90×90 les plus clairs : réf 1/990 · 1920 1/902 · 2400 13/1144.** Même texture des deux côtés : corrélation **+0,975 / +0,911 / +0,760**, contrôle négatif (image retournée) **−0,803 / −0,620 / −0,712**. `m2`, `m19`, `m25` | Je ne peux pas dire, depuis l'image, si la phase servie (**Aube / DAWN**) devrait désigner une **autre** texture que celle du cadre 4 (« Plein jour »). La texture est la même ; l'assombrissement manque. Ce qui trancherait : une capture du même écran à une phase de nuit. |
| `G2` | **MAJEUR** | NOUVEAU | **Un seul gris-ardoise (73,85,96) a remplacé les quatre valeurs graduées des surfaces de verre.** Liseré du panneau, séparateurs de rangée, liseré de la barre TRANCHER, remplissage des boutons secondaires : quatre rôles, une seule couleur. | Réf : liseré panneau **(32,37,47)** L=36,7 · séparateur **(29,34,44)** L=33,7 · liseré TRANCHER **(41,53,70)** L=51,7 (= CSS `#2a3648`) · fond bouton 2 **(20,26,36)** L=25,4. Jeu (identique aux deux résolutions) : **(73,85,96)** L=83,2 pour les trois premiers, **(66,79,96)** L=77,5 pour le quatrième. Rapports : ×2,3 / ×2,5 / ×1,6 / ×3,1. `m21`, `m10`, `m20`, `m6b` | — |
| `G3` | **MAJEUR** | NOUVEAU | **Les boutons secondaires ne sont plus des fantômes mais des plaques pleines** : ils se lisent comme des boutons d'action au même rang que le bouton or, alors que la maquette n'en désigne qu'un. | Remplissage VOIR LA VENTE / BLANCHIR : réf **(20,26,36)** et **(18,23,33)** sur un verre à (10,16,28) ⇒ écart **+10 de luminance** ; jeu **(66,79,96)** sur un verre à (16..25) ⇒ écart **+55**. Rapport des remplissages jeu/réf : **×3,05**. `m6b` | — |
| `G4` | **MAJEUR** | NOUVEAU | **Le libellé des boutons secondaires passe du crème chaud au blanc froid et tombe sous le plancher de contraste.** | Réf **(234,224,200)** = le jeton `--creme` exact, contraste sur le bouton **6,21:1** et **6,70:1**. Jeu **(238,241,242)** (B **+42/255**), contraste **2,81:1** aux deux résolutions. Plancher de doctrine : ≥ 4,5:1 petits textes, ≥ 3:1 grands. `m6b` | Le seuil applicable (grand / petit texte) dépend d'une convention que je n'ai pas : à **2,81:1** le libellé est sous les **deux**. |
| `G5` | **MAJEUR** | NOUVEAU | **Bande d'eau en bleu-pétrole saturé sous la barre TRANCHER**, là où la maquette rend du bleu nuit presque noir. C'est le bas du diorama ; même cause que `G1`. | Palette de la bande sous la barre : réf **6 teintes toutes entre (7,13,20) et (24,33,45)** ; jeu **(38,79,102) 17 % + (33,67,88) 17 % + (41,82,107) 15 % + (23,44,59) 11 % = 60 % de l'aire** en pétrole. Médiane : texture source (53,71,90) → réf **(13,23,34)** L=21,7 → jeu **(28,55,74)** L=50,6 / **(29,59,79)** L=54,1. B−R passe de **+21** à **+46 / +50**. `m18`, `m19` | — |
| `G6` | MINEUR | NOUVEAU | **Les trois boutons ont une largeur FIXE** (324 px, x 661..984) là où la maquette les fait épouser leur libellé et les cale à droite. Le bord gauche de la colonne de boutons devient rectiligne, et BLANCHIR flotte dans 51 px de vide. | Réf : COMMANDER **329 px** (x 651..979) · VOIR LA VENTE **373 px** (x 606..978) · BLANCHIR **273 px** (x 706..978) — bord droit commun x≈978. Jeu : **324 / 324 / 324 px**, x 661..984 pour les trois. `m9` | Si la largeur fixe est un choix produit, ce finding tombe — aucun document du dossier ne le déclare. |
| `G7` | MINEUR | DÉJÀ APPLIQUÉ | **Rayon d'arrondi du bouton or divisé par ~2,4.** (r1 `F9`, partie « rayon » — la partie « dégradé » est fermée, cf. contrôle positif #6.) | Même critère des deux côtés (premier `dy` où la largeur atteint 98 % de la largeur pleine) : réf **dy=16** ⇒ rayon ≈ 16 px ; jeu **dy=6** (1920) et **dy=7** (2400) ⇒ rayon ≈ 6–7 px. Largeur pleine 323 / 324 px (contrôle positif : égale au `m9`). `m23` | — |
| `G8` | MINEUR | DÉJÀ APPLIQUÉ | **Le liseré du panneau reste deux fois trop contrasté sur son verre** (r1 `F12`, partie « bordure » ; le fond de la plaque, lui, est revenu au bleu nuit). | Rapport liseré / verre : réf **36,7 / 17 = 2,16** ; jeu **83,2 / 20 = 4,16** (r1 mesurait 5,2). Épaisseur 3 px (réf) contre 2 px (jeu). Sous-cas de `G2`. `m20`, `m21` | — |
| `G9` | MINEUR | NOUVEAU | **Rythme vertical du panneau comprimé de 22 à 35 %, systématiquement et de même signe** sur trois gouttières indépendantes. | Réf → jeu (C24, résolution la moins bruitée) : haut du panneau → « LA SUITE » **43 → 37 px** · « LA SUITE » → 1ᵉʳ titre **58 → 38 px (−34 %)** · titre → corps **30 → 20 px (−33 %)** · corps → titre suivant **93 → 72 px (−23 %)**. `m17` | La part du rembourrage et celle du reflux (la maquette met la rangée 2 sur 2 lignes, le jeu sur 1) ne se séparent pas depuis l'image. |
| `G10` | MINEUR | DÉJÀ APPLIQUÉ | **Le panneau reste 30 % plus court que la maquette** (r1 `F18`). | Réf **828..1637 = 810 px** ; jeu **886..1449 = 564 px** (1920) et **1292..1855 = 564 px** (2400) ⇒ **−30 %**. Part de la hauteur d'écran : 38,5 % → 29,4 % → 23,5 %. `m16`, `m1` | Même réserve que `G9` : reflux et rembourrage mêlés. |
| `G11` | MINEUR | DÉJÀ APPLIQUÉ | **L'interlettrage du libellé du bandeau reste réduit de moitié, et sa capitale de 14 %** (r1 `F5`, re-mesuré contre la référence re-rendue au chrome HUD — le témoin a changé, le chiffre n'est donc pas comparable à celui du r1). | « ARGENT », chaîne identique : réf **capitale 22 px, chasse 116 px, 6 groupes, gaps [4,7,9,8,7] (moyen 7,0)** ; jeu **capitale 19 px, chasse 107 px, 6 groupes, gaps [3,3,5,4,3] (moyen 3,6)**. Capitale **−14 %**, gap moyen **−49 %**. Premier glyphe de la phase (« P » / « A ») : **31 → 28 px (−10 %)**. `m12`, `m24` | Les chaînes du bandeau diffèrent (24 850 € / 10 000 € · Plein jour / Aube) : **seules les hauteurs de capitale sont comparables**, jamais les chasses. Je n'ai donc pas chiffré « la phase −20 % » comme le r1. |
| `G12` | MINEUR | DÉJÀ APPLIQUÉ | **Médaillon 4 % plus grand et 4 px plus haut — le signe du r1 est inversé** (r1 `F14` : −5 %). | Diamètre vertical mesuré sur la coupe x=544 entre les deux arcs de l'anneau : réf **y 22..198 = 177 px** (CSS 49 px ×3,6 = 176,4 — exact) ; jeu **y 18..201 = 184 px**. Épaisseur de l'anneau 5 px des deux côtés (contrôle positif #17). `m13` | — |
| `G13` | MINEUR | NOUVEAU | **Le losange sous le médaillon est 42 % plus grand.** | Réf **26 × 26 px** (y 201..226, centre x=540) ; jeu **37 × 32 px** (y 200..231, centre x=538). Intention CSS : 5,4 px CSS ×3,6 = 19,4 px de côté, soit 27,5 px de diagonale ⇒ la réf est juste. Je classe MINEUR malgré les 42 % : l'objet fait 0,5 % de la hauteur d'écran. `m13` | — |
| `G14` | MINEUR | DÉJÀ APPLIQUÉ | **« LÉGÈRE » est 19/255 plus clair que le gris chaud de la maquette** (r1 `F17` : la famille, elle, est revenue — c'était du turquoise saturé). | Réf **(138,128,113)** (le dossier annonce (139,129,113) : écart 1/255) ; jeu **(157,149,129)**. Saturation max−min : **25** contre **28** ⇒ même famille, même sobriété. `m18` | Le cadre 4 est le seul à montrer l'état « LÉGÈRE » ; je compare donc au bon témoin, mais à **un seul**. |
| `G15` | MINEUR | DÉJÀ APPLIQUÉ | **La pastille de notification reste absente au-dessus de FAMILLE** (r1 `F7`), alors que la maquette du *joueur neuf* la dessine. | Réf : 1 disque or **12×12 px** (noyau) à (497..508, 1890..1901). Jeu : **0 px or** dans le rond 2 et son pourtour, aux **deux** résolutions. `m14`, `m14b` | **C'est une donnée, pas un rendu.** Le dossier dit la pastille « allumée par ≥ 1 rapport d'autonomie servi » ; le journal du parcours note A4 « Nav_Autonomy absent ou éteint ». Ce qui trancherait, hors image : le compte de rapports d'autonomie servis à ce compte neuf. **⇒ question pour le `juge-donnees`.** |

**Compte : 1 BLOQUANT · 4 MAJEUR · 10 MINEUR.**
Sur les 15, **8 sont `NOUVEAU`** et **7 `DÉJÀ APPLIQUÉ`** — l'élargissement vient de deux
instruments qui n'existaient pas au r1 (`m19`, qui confronte l'image à la **texture source**
extraite de la page de l'atelier, et `m21`, qui compare **quatre surfaces de verre entre elles**).
Le r1 comptait 0 BLOQUANT / 10 MAJEUR / 9 MINEUR ; le r2 n'a mesuré aucun écart visuel (pas de
capture). La comparaison des totaux n'a donc de sens qu'avec la table du § 7.

> **Note de cause commune, comme le format l'impose** (je ne fusionne pas les lignes) :
> `G1` et `G5` sont le même défaut vu par ses deux bouts (le décor non assombri, en haut et en bas
> de l'écran). `G2`, `G3`, `G4` et `G8` sont quatre manifestations d'un seul gris-ardoise.
> `G9` et `G10` sont la même compression verticale.

---

## Vérification des écarts ASSUMÉS du dossier (non comptés ci-dessus)

| assumé | rendu proprement ? | mesure |
|---|---|---|
| **Chrome commun = maquette HUD v3.1** (r1 `F2` filet, `F5` typo, `F6` dock, `F11` losange, `F14` médaillon) | **OUI pour le filet, le dock, le médaillon ; NON pour la typo et le losange** | Filet du bandeau : réf y=143 **853 colonnes**, jeu y=141 **796** — même objet, même place. Dock : **exact** (contrôles positifs #13 à #15). Médaillon : anneau 5 px, centre x=544 des deux côtés. Restent `G11` (interlettrage) et `G13` (losange +42 %). |
| **« LÉGÈRE » en gris chaud éteint** | **OUI** — famille et sobriété respectées | (138,128,113) → (157,149,129), saturation 25 → 28. Reste `G14`, +19/255 de clarté. |
| **3ᵉ ligne de LA SUITE = la planque / BLANCHIR** | **OUI** — rendue proprement, aucun libellé de repli | Titre « De l'argent attend dans la planque » en or **(242,201,106)** = le jeton, 10 226 px d'encre, sur 2 lignes ; bouton BLANCHIR présent. `m18` |
| **Fond = diorama peint du district** | **la TEXTURE oui, l'ASSOMBRISSEMENT non** | La nature est la bonne (c'était le `F3` du r1 : carte vectorielle) — corrélation +0,76 à +0,98 avec la texture source. Mais l'arbitrage dit « **DE NUIT** » et l'écran rend la ville **2,5 à 3,0 fois plus claire** que la maquette ⇒ `G1`. |

## Arbitrages (non comptés)

1. **Les soulignés pointillés de la référence ne sont PAS un élément de design** et ne figurent dans
   aucun de mes findings. Ils viennent de la classe `.prop` de la page de l'atelier
   (`text-decoration:underline dotted #b9ad92`), posée sur **tous** les textes du cadre 4 — titres,
   corps, « La suite » **et les libellés de boutons** — et l'étiquette du cadre se termine par
   « (PROPOSÉ) ». C'est l'annotation « proposition non ratifiée » de l'atelier. Les deux rendus
   indépendants (r1 et r2) la reproduisent, donc le rendu est fidèle ; **c'est la maquette qui porte
   une marque éditoriale**. Un juge qui la compterait remonterait 8 faux écarts d'un coup.
2. **La largeur fixe des boutons** (`G6`) : si c'est un choix produit, le finding tombe. Rien dans
   `dossier.md` ne le dit.
3. **La pastille FAMILLE** (`G15`) : arbitrage de donnée, pas de rendu — à router au `juge-donnees`.

---

## 5. Autres résolutions

**1080×1920 (9:16).** Rien de coupé, rien hors cadre, rien qui déborde de son parent ; l'ordre de
lecture **tient encore** : le bouton or reste le bloc 90×90 le plus clair de l'écran (**1/902**).
Tout le chrome haut est identique au pixel à celui de 2400 (filet à y=141, médaillon y 18..201,
losange, « ARGENT » x 44..150 et capitale 19, bandeau L=26,7). Le dock est identique en X
(ronds 200..317 / 387..505 / 574..692 / 762..879) et sa marge basse vaut **58 px**, comme à 2400.
Le panneau et la carte de file remontent sans changer de forme (panneau 886..1449, **564 px**, le
même qu'à 2400). Les findings `G2`, `G3`, `G4`, `G6`, `G7`, `G8`, `G11`, `G12`, `G13`, `G14`, `G15`
valent **identiquement** aux deux résolutions (mesures citées des deux côtés).

**1080×2400 (9:20) — la résolution cible.** Jugée comme capture principale. **Un écart lui est
propre, et c'est le BLOQUANT** : les 480 px de hauteur supplémentaires vont **tous au décor**
(le panneau garde 564 px, le dock garde sa marge de 58 px, le haut du panneau descend de y=886 à
y=1292, soit **+406 px de ville visible**). Le décor non assombri y pèse donc beaucoup plus :
pixels clairs **12,8 %** contre 9,5 %, et le bouton or **passe du 1ᵉʳ au 13ᵉ rang**. `G1` et `G5`
sont mesurés aux deux résolutions mais ne changent la **lecture** qu'à 2400.

**Aucune troisième résolution fournie**, et aucune au rapport d'aspect de la référence (9:17,5).

---

## 6. Non vérifié

1. **Nuit ou aube ?** La texture du fond est la même que celle de la maquette (mesuré), mais la
   phase servie est **Aube / DAWN** et le cadre 4 montre « Plein jour ». Je ne peux pas dire depuis
   l'image si une autre texture serait due à cette phase. Ce qui trancherait : **une capture du même
   écran à une phase de nuit**, ou la liste des textures que l'écran sait servir.
2. **Animation.** Une seule capture par résolution ⇒ je ne peux ni constater ni infirmer un pixel
   qui bouge, ni dire si l'image figée tombe à un mauvais moment. La source de la maquette déclare
   **6 `@keyframes`** et 3 `animation-delay` ; je n'ai pas vérifié lesquels portent sur le cadre 4.
   Ce qui trancherait : deux captures du même état à T et T+1 s.
3. **Un seul état capturé** (jour 1, Aube, COLD, 3 lignes, 1 carte de file). Les cadres 0 (« rien à
   trancher »), 1 (« une carte de tête »), 2 (« des rapports à lire ») et 3 (« la file sous
   pression ») décrivent quatre autres états de ④ : **aucun n'a de capture**. L'état « rien à
   trancher » est celui qui m'inquiéterait, parce qu'il vide la plaque.
4. **Rayon d'arrondi du PANNEAU.** Non mesurable ici : le décor clair derrière le coin brouille la
   détection du bord (mon `m20` rend des bords gauches erratiques — 63, 57, 0, 1, 0 — alors que la
   référence, sur fond sombre, rend une progression propre). Ce qui trancherait : une capture sur
   un fond uni, ou la mesure du coin **bas** où le décor est plus sombre.
5. **Pastille FAMILLE** (`G15`) : donnée, pas rendu. Hors image.
6. **Police du client.** Je ne peux pas lire une famille de police dans une image. La chasse du
   titre tombant à **−4,6 %** pour une capitale à **−3 %**, je classe la question **sans enjeu
   mesuré** plutôt que comme arbitrage ouvert.
7. **Positions verticales absolues** : jamais comparées en px bruts (trois rapports d'aspect). Tout
   écart vertical de ce rapport est donné en distance depuis un bord ancré ou en % du parent.
8. **Chaînes différentes du bandeau et de la carte de file** (24 850 € / 10 000 € · Plein jour /
   Aube · Lt. Ilm / Lt. Tovah) : je n'ai comparé que des **hauteurs de capitale** et des couleurs,
   jamais des chasses. C'est la raison pour laquelle je ne reprends pas le « phase −20 % » du r1.
9. **La gouttière panneau → barre TRANCHER** vaut 37 px en réf, **41 px à 1920 mais 52 px à 2400**.
   Je ne sais pas si l'écart de 11 px entre les deux captures est réel ou vient de mon repérage du
   bord bas du panneau sur un décor clair ; je ne le classe donc pas en écart.

---

## 7. Correspondance avec le r1 (19 écarts)

| r1 | intitulé | statut au r3 | mesure |
|---|---|---|---|
| `F1` | bande neutre 90 px (13,13,13) sous le bandeau | **FERMÉ** | La ligne la **plus** uniforme de la zone y 148..258 a un écart-type de **14,30** (1920) et **12,01** (2400) ; la bande entière **19,46 / 17,08**. Le r1 mesurait **0,00**. Aucun rectangle plein. `m22` |
| `F2` | filet or pleine largeur en trop | **FERMÉ** (assumé : chrome commun) | La référence re-rendue le porte : réf y=143 **853 colonnes**, jeu y=141 **796**. Même objet. `m3` |
| `F3` | fond = carte vectorielle au lieu du quartier peint | **FERMÉ quant à la NATURE**, remplacé par `G1` | Même texture : corrélation du profil vertical **+0,911 / +0,760**, contrôle négatif **−0,620 / −0,712**. Mais l'assombrissement manque. `m19` |
| `F4` | « ornement gris » dans le bandeau | **PAS UN ÉCART** (volute du canon HUD) | Présente des deux côtés ; le dossier l'avait déjà tranché le 26/09. |
| `F5` | typo du bandeau | **OUVERT** → `G11` | Capitale **22 → 19 px (−14 %)**, gap moyen **7,0 → 3,6 px (−49 %)**. Témoin changé (référence re-rendue) : le chiffre n'est pas comparable à celui du r1. `m12` |
| `F6` | dock −24 % de taille et d'empan | **FERMÉ** | Diamètres **119 / 118-119**, écarts **68 / 68-69**, empan **680 / 680**. `m14`, `m14b` |
| `F7` | pastille FAMILLE absente | **OUVERT** → `G15` | 0 px or dans le rond 2, aux deux résolutions. Donnée, pas rendu. |
| `F8` | filet or du panneau flottant 34 px à l'intérieur | **FERMÉ** | Il est sur le **bord haut** : y=885 pour un panneau à 886 ; étendue 650 px contre 631 en réf, centres x=540 / 539. `m4` |
| `F9` | bouton or : dégradé perdu + rayon ÷3 | **DÉGRADÉ FERMÉ**, **RAYON OUVERT** → `G7` | Dégradé (231,194,103)→(203,157,59) contre (232,195,105)→(203,157,59) : **≤ 2/255**. Rayon **16 → 6-7 px**. `m22`, `m23` |
| `F10` | textes du panneau en gris froid | **FERMÉ** | « LA SUITE » **(185,173,146) = (185,173,146)** · sous-lignes idem · « Lt. … attend vos ordres » (219,210,187) / (218,209,188). `m7`, `m18`, `m22` |
| `F11` | losange en trop sous le médaillon | **ASSUMÉ** (canon HUD, présent en réf) ; **taille OUVERTE** → `G13` | 26×26 → 37×32. `m13` |
| `F12` | plaques gris neutre + bordure trop visible | **FOND FERMÉ**, **BORDURE OUVERTE** → `G8` | Fond du verre réf (13,19,32) / jeu (18,20,29). Bordure : rapport sur le verre **2,16 (réf) contre 4,16 (jeu)** — le r1 mesurait 5,2. `m20`, `m21` |
| `F13` | trois ors distincts en jeu | **FERMÉ** | Étendue des ors R/G/B : **11 / 7 / 2** en jeu contre **12 / 10 / 6** en référence — **plus serrée que la maquette**. Le r1 mesurait 54 / 56 / 45. `m22` |
| `F14` | médaillon 5 % plus petit | **SIGNE INVERSÉ** → `G12` | 177 → **184 px**, soit **+4 %**. `m13` |
| `F15` | marges du panneau réduites de 27 % | **FERMÉ** | **49 / 49 px** des deux côtés, largeur **982 = 982**. `m5b`, `m5c` |
| `F16` | interlettrage de « LA SUITE » réduit de 12 % | **FERMÉ** | Chasse 162 → 147 pour une capitale 18 → 16 ⇒ **+2 %** après normalisation. `m8` |
| `F17` | « LÉGÈRE » en turquoise saturé | **FERMÉ** quant à la famille → reste `G14` | (138,128,113) → **(157,149,129)**, saturation 25 → 28. Le r1 mesurait (59,198,169), saturation 139. `m18` |
| `F18` | le panneau pèse moitié moins | **OUVERT** → `G10` | 810 → 564 px, **−30 %** (le r1 mesurait −31 %). `m16` |
| `F19` | 3ᵉ suggestion différente | **ASSUMÉ**, le jeu a raison | Rendue proprement, titre au jeton or exact. `m18` |

**Bilan : 10 fermés · 1 « pas un écart » · 2 assumés rendus proprement · 5 encore ouverts
(`F5`, `F7`, `F9`-rayon, `F12`-bordure, `F18`) · 1 au signe inversé (`F14`) · 1 remplacé par un
défaut plus grave de la même zone (`F3` → `G1`).**

---

## Annexes

### A1. Inventaire de la référence (cadre 4) — fiches

| id | catégorie | parent | bbox | forme | remplissage | bord | texte | relations |
|---|---|---|---|---|---|---|---|---|
| `C` | chrome haut | écran | (0,0)–(1079,146) | bandeau posé sur l'art | plaque sombre translucide, L=27,6 | filet laiton y=143..145, 853 colonnes | — | flotte sur `A` |
| `C.argent` | libellé | `C` | (47,40)–(162,61) | caps interlettrées | (185,173,146) | — | « ARGENT », capitale **22**, chasse **116**, 6 groupes, gaps [4,7,9,8,7] | marge gauche 47 |
| `C.montant` | valeur | `C` | (40,60)–(205,103) | sérif | or | — | « 24 850 € », 1ᵉʳ chiffre **43 px** | sous `C.argent` |
| `C.phase` | valeur | `C` | (842,72)–(1044,112) | sérif | (234,224,200) | — | « Plein jour », capitale du « P » **31 px** | aligné à droite |
| `C.medaillon` | médaillon | `C` | centre x=544, **Ø 177** (y 22..198) | disque + anneau | disque sombre, arc bicolore | anneau laiton **5 px** | « Tiède » / « CHALEUR » | chevauche l'art |
| `C.losange` | ornement | `C` | (527,201)–(552,226), **26×26** | losange | laiton | — | — | sous le médaillon |
| `A` | fond / décor | écran | plein cadre | quartier **peint**, assombri | L moyenne **18,5 / 26,5 / 29,7** par tiers | — | — | monte derrière le bandeau |
| `P` | plaque | écran | (49,828)–(1030,1637), **982×810** | rect. très arrondi | (13,19,32) bleu nuit | liseré **(32,37,47)** 3 px + **filet laiton 631 px** sur le bord haut | — | 38,5 % de la hauteur |
| `P.titre` | titre de section | `P` | (456,871)–(617,889) | caps interlettrées | (185,173,146) | — | « LA SUITE », capitale **18**, chasse **162** | centré x=539 |
| `P.r1.titre` | titre de rangée | `P` | (163,947)–(599,977) | sérif | **(242,201,107)** | — | capitale **30**, chasse **437** | retrait 49+50 |
| `P.r1.sous` | sous-ligne | `P` | (150,1007)–(417,1032) | sans | **(185,173,146)** | — | — | — |
| `P.r1.cta` | bouton plein | `P` | (651,945)–(979,1037), **329×93** | rect. **rayon 16** | **dégradé** (232,195,105)→(203,157,59) | laiton | « COMMANDER » | calé à droite x=979 |
| `P.r2.cta` | bouton **fantôme** | `P` | (606,1159)–(978,1251), **373×93** | rect. arrondi | **(20,26,36)** — +10 sur le verre | filet clair | « VOIR LA VENTE » (234,224,200), contraste **6,21:1** | calé à droite x=978 |
| `P.r3.cta` | bouton **fantôme** | `P` | (706,1418)–(978,1510), **273×93** | rect. arrondi | **(18,23,33)** | filet clair | « BLANCHIR », contraste **6,70:1** | calé à droite x=978 |
| `P.sep` | séparateur | `P` | y=1075 et y=1335, x 100..979 | trait **3 px** | **(29,34,44)** / (27,31,42) | — | — | 2 séparateurs, 880 px |
| `Q` | carte de file | écran | (49,1674)–(1030,1825), **982×152** | rect. arrondi | sombre | liseré **(41,53,70)** | « Lt. Ilm attend vos ordres » (219,210,187) / « LÉGÈRE » **(138,128,113)** / « TRANCHER » (230,191,101), chasse 218, gaps moyen 7,4 | gouttière 37 px sous `P` |
| `D` | dock | écran | ronds x 200..879, **empan 680** | 4 disques **Ø 119**, écarts **68** | dégradé sombre | liseré doux | libellés crème | fond **calme** |
| `D.pip` | pastille | `D` | (497,1890)–(508,1901) | disque | or | — | — | coin haut-droit de FAMILLE |
| `D.actif` | trait | `D` | sous EMPIRE | trait arrondi | (176,141,62) | — | — | — |

**Couche globale (réf)** : luminance moyenne **26,2** · pixels L≥90 **3,9 %** · L≥140 **3,2 %** ·
palette (somme 100,0 %) : (11,17,26) 23,6 % · (8,13,21) 21,5 % · (27,33,40) 20,9 % · (13,21,31)
14,0 % · (18,24,32) 12,2 % · (62,60,53) 7,8 %. **Le bouton or est le bloc 90×90 le plus clair de
l'écran : rang 1 sur 990.**

### A2. Inventaire de la capture (1080×2400) — fiches

| id | catégorie | bbox | forme | remplissage | texte | statut |
|---|---|---|---|---|---|---|
| `C` | chrome haut | (0,0)–(1079,143) | bandeau | L=26,7 | — | **ÉGAL** (contrôle positif #2) |
| `C.argent` | libellé | (44,27)–(150,45) | caps | (185,173,146) | capitale **19**, chasse **107**, gaps [3,3,5,4,3] | ÉCART d'interlettrage (`G11`) |
| `C.montant` | valeur | (40,57)–(191,97) | sérif | or | 1ᵉʳ chiffre **41 px** | ÉGAL (−5 %) |
| `C.phase` | valeur | (935,69)–(1033,98) | sérif | (234,224,200) | « A » **28 px** | ÉCART −10 % (`G11`) |
| `C.medaillon` | médaillon | centre x=544, **Ø 184** (y 18..201) | disque + anneau | anneau laiton **5 px** | « Froid » / « CHALEUR » | ÉCART +4 % (`G12`) |
| `C.losange` | ornement | (520,200)–(556,231), **37×32** | losange | laiton | — | ÉCART +42 % (`G13`) |
| `A` | fond / décor | plein cadre | quartier **peint, NON assombri** | L moyenne **47,4 / 72,5 / 89,4** par tiers | — | **ÉCART ×2,57 à ×3,01** (`G1`) |
| `A.eau` | bas du diorama | sous la barre TRANCHER | — | **(38,79,103) / (33,69,90) / (41,82,106)** = 60 % de l'aire | — | **ÉCART de famille** (`G5`) |
| `P` | plaque | (49,1292)–(1030,1855), **982×564** | rect. arrondi | (18,20,29) | — | marges **ÉGALES** ; hauteur ÉCART −30 % (`G10`) |
| `P.lisere` | liseré | x=47..48 | 2 px | **(73,85,96)** | — | ÉCART ×2,3 (`G2`, `G8`) |
| `P.filet` | filet laiton | y=1291, x 215..864, **650 px** | trait | laiton | — | **ÉGAL** (contrôle positif #5) |
| `P.titre` | titre de section | (467,1329)–(613,1345) | caps | **(185,173,146)** | capitale **17**, chasse **147** | **ÉGAL** |
| `P.r1.titre` | titre de rangée | (153,1383)–(569,1411) | sérif | **(242,201,106)** | capitale **28**, chasse **417** | **ÉGAL** |
| `P.r1.sous` | sous-ligne | (150,1431)–(…,1450) | sans | **(185,173,146)** | — | **ÉGAL** |
| `P.r1.cta` | bouton plein | (661,1374)–(984,1458), **324×85** | rect. **rayon 7** | dégradé (231,194,103)→(203,157,59) | « COMMANDER » | dégradé **ÉGAL** ; rayon ÉCART (`G7`) |
| `P.r2.cta` | bouton **plein** | (661,1519)–(984,1603), **324×85** | rect. arrondi | **(66,79,96)** | « VOIR LA VENTE » **(238,241,242)**, contraste **2,81:1** | ÉCARTS (`G3`, `G4`, `G6`) |
| `P.r3.cta` | bouton **plein** | (661,1699)–(984,1783), **324×85** | rect. arrondi | **(66,79,96)** | « BLANCHIR », contraste **2,81:1** | ÉCARTS (`G3`, `G4`, `G6`) |
| `P.sep` | séparateurs | y=1482 et y=1640, 891–916 px | trait 2 px | **(73,85,96)** | — | compte ÉGAL ; couleur ÉCART (`G2`) |
| `Q` | carte de file | (49,1908)–(1030,2101), **982×194** | rect. arrondi | sombre | « Lt. Tovah attend vos ordres » (218,209,188) / « LÉGÈRE » **(157,149,129)** / « TRANCHER » (233,197,106) | liseré **(73,85,96)** ÉCART (`G2`) ; textes ÉGAUX ; `G14` |
| `D` | dock | ronds x 200..879, **Ø 118-119**, écarts **68-69**, empan **680** | 4 disques | — | trait actif **38×5** | **ÉGAL** (contrôles positifs #13-#16) |
| `D.pip` | pastille | — | — | — | — | **ABSENTE** (`G15`) |

**Couche globale (jeu 2400)** : luminance moyenne **55,0** (×2,10) · pixels L≥90 **12,8 %** (×3,3) ·
L≥140 **4,8 %** · palette (somme 100,0 %) : (14,19,31) 22,7 % · **(69,86,101) 20,7 %** ·
**(53,65,79) 19,8 %** · (18,26,40) 16,2 % · (31,36,46) 11,9 % · **(125,121,109) 8,8 %**.
**Le bouton or est le 13ᵉ bloc 90×90 le plus clair : rang 13 sur 1144** ; les cinq premiers sont
du décor, en (540,1125), (135,990), (495,1125), (135,1035), (495,1170).

**Couche globale (jeu 1920)** : luminance moyenne **50,6** · L≥90 **9,5 %** · **bouton or rang 1
sur 902**.

### A2bis. Identification de la source de la maquette (avant toute mesure)

Avant d'ouvrir la page de l'atelier, j'ai compté les candidats : un balayage exhaustif de
`/home/erutheone` pour `ecrans-brennar-accueil.html` rend **exactement 1 fichier**,
`/home/erutheone/project/atelier3d-mafia/ecrans-brennar-accueil.html` — celui que
`r2-2026-10-07/mesures/rendre-reference-04.py` nomme (`ATELIER = ~/project/atelier3d-mafia`).
Aucune ambiguïté de cible. C'est de cette page que proviennent (a) les valeurs CSS citées en
« intention » dans mes scripts, (b) la classe `.prop` qui explique les soulignés pointillés, et
(c) la **texture source** `texture-source-district.jpg` déposée dans `mesures/`, extraite du
`data:image/jpeg;base64` de `.scene.district`. La CSS ne contredit jamais le rendu dans ce
rapport : elle **nomme** ce que le rendu montre, et chaque écart est mesuré sur l'image.

### A3. Correspondance des repères

Les trois images font **1080 px de large**. La référence est rendue à **×3,6** de 300 px CSS
(`r2-2026-10-07/mesures/rendre-reference-04.py`, `ECHELLE='3.6'`) ; les captures sont nativement à
1080. **Facteur 1,000 en X : 1 px CSS = 3,6 px dans les trois images.** Toute mesure horizontale et
toute mesure de TAILLE est donnée en px bruts, directement comparable ; `m1` l'imprime comme
contrôle positif. Les rapports d'aspect diffèrent (réf 9:17,5 · jeu 9:16 et 9:20) : les positions
verticales sont données en distance depuis un bord **ancré** (chrome : haut ; dock : bas) ou en %
du parent, jamais en px bruts comparés. Origine : coin supérieur gauche, offset (0,0).

**Ce que la normalisation ne couvre pas**, et que je n'ai donc pas normalisé : les rapports
INTERNES (`G9`, `G10`) sont invariants d'échelle et restent des écarts réels.

### A4. Scripts — `mesures/`

Chaque sonde **imprime la taille de chaque image qu'elle ouvre**, et ces tailles sont celles du
dossier (1080×2102 · 1080×1920 · 1080×2400). Les sorties sont collées en `sortie-<nom>.txt`.

| script | ce qu'il mesure | son contrôle |
|---|---|---|
| `crop.py` | outil de découpe pour l'inventaire visuel | imprime la taille lue |
| `m1_reperes.py` | profils de lignes, sauts de luminance | **positif** : les 3 largeurs = 1080 · **négatif** : les 3 hauteurs diffèrent |
| `m2_fond_peint.py` | luminance et teinte du décor par bandes | **positif** : la bande du bandeau sort à 27,6 / 26,7 / 26,7 ⇒ l'instrument n'est pas biaisé |
| `m3_panneau.py`, `m4_bords_filet.py` | filet laiton (détection par **teinte** laiton) | **positif** : le filet du bandeau sort large partout · **négatif** : une ligne dans le verre rend 0 |
| `m5_marges_panneau.py` | **réfuté, conservé** : bande choisie trop large, elle contenait « LA SUITE » | sa sortie fausse (plage de 10 px) est ce qui prouve que `m5b`/`m5c` discriminent |
| `m5b_marges_mediane.py` | marges par **médiane de colonne** (insensible au texte) | **positif** : réf 49 / 49, largeur 982 = CSS `margin:0 12px` |
| `m5c_marges_ligne_plate.py` | marges sur une **ligne plate choisie, pas supposée** | **négatif** : la ligne la MOINS plate rend un autre résultat |
| `m6_boutons.py` | **réfuté, conservé** : fenêtres de recherche débordant du panneau ⇒ bbox collées au bord de fenêtre | montre pourquoi `m6b`/`m9` bornent au panneau |
| `m6b_boutons.py` | remplissage et libellé des 3 boutons, contrastes | **positif** : l'or sort > 180 des deux côtés · **négatif** : le verre nu sort à 15-25 |
| `m7_typo.py` | **réfuté en partie, conservé** : bandes mal placées (a mesuré le bouton or en croyant lire « LA SUITE ») | ce qui a imposé le repérage par profil du `m17` |
| `m8_capitales.py` | hauteur de capitale et chasse du **premier glyphe** | **positif** : chaîne identique « Le labo… » ⇒ chasse comparable |
| `m9_largeur_boutons.py` | largeur des 3 boutons, bornée au panneau | **positif** : l'or sort identique à 2 seuils · **négatif** : une inter-rangée rend 0 |
| `m10_separateurs_rythme.py` | séparateurs : couleur, épaisseur, étendue | **positif** : les 2 séparateurs d'une même image rendent la même couleur |
| `m11_chrome.py` | **réfuté, conservé** : fenêtre du médaillon trop étroite, bbox collée au bord | remplacé par la coupe verticale du `m13` |
| `m12_chrome_detail.py` | interlettrage de « ARGENT » (chaîne identique) | **positif** : encre (185,173,146) des deux côtés · **négatif** : bande vide ⇒ 0 |
| `m13_medaillon_dock.py` | médaillon par **coupe verticale** (pas par bbox) | **négatif** : coupe à y=400 ⇒ 0 px laiton |
| `m14_dock.py` + `m14b` | dock : polarité **explicite** (ronds sombres / liseré clair) | **positif** : la référence rend 4 ronds de 119 et 3 écarts de 68 = les valeurs CSS |
| `m15_trancher_or_lecture.py` | dégradé du bouton or, **ordre de lecture** par blocs 90×90 | **positif** : le dégradé descend dans les deux images |
| `m16_rythme_vertical.py` | bas du panneau, boîte de la barre TRANCHER | **positif** : marges de la barre = marges du panneau dans chaque image |
| `m17_echelle_verticale.py` | échelle verticale du panneau, un seul détecteur pour toutes les bandes | **positif** : le haut du panneau trouvé = celui du `m4` |
| `m18_assumes_palette.py` | « LÉGÈRE », la 3ᵉ ligne, palettes | **positif** : « Lt. … attend vos ordres » = (219,210,187) / (218,209,188) |
| `m19_fond_meme_texture.py` | **l'instrument du BLOQUANT** : confronte les images à la **texture source** extraite de la page de l'atelier (`texture-source-district.jpg`, commitée ici) | **positif** : corrélation +0,975 / +0,911 / +0,760 · **négatif** : image retournée −0,803 / −0,620 / −0,712 |
| `m20_bord_rayon.py` | liseré du panneau par **maximum local** | **positif** : la réf montre le max local · **négatif** : le milieu du verre est plat |
| `m21_jeton_partage.py` | **l'instrument du MAJEUR `G2`** : les 4 surfaces de verre comparées entre elles | **positif** : la réf rend **4 valeurs distinctes**, le jeu **2** · **négatif** : le centre du verre rend (11,17,28) / (15,17,26) / (26,26,31), pas un liseré |
| `m22_reprise_r1.py` | reprise des grandeurs fausses au r1 | **positif** : titre (242,201,107)/(242,201,106) · **négatif** : l'art n'est jamais uniforme (σ > 12) |
| `m23_rayon_et_bandeau.py` | rayon lu **sur la courbe**, même critère des deux côtés | **positif** : largeur pleine = celle du `m9` |
| `m24_capitale_premier_glyphe.py` | capitale du **premier glyphe** quand les chaînes diffèrent | le glyphe est isolé par contiguïté de colonnes ; « P »/« A » et « 2 »/« 1 » n'ont pas de jambage ⇒ seule grandeur comparable |
| `m25_couche_globale.py` | couche globale, palette, **rang du bouton or** | **positif** : somme des parts = 100,0 % · **négatif** : L≥200 reste < 1,2 % partout |

**Instruments réfutés, conservés** (`m5`, `m6`, `m7`, `m11`) : tous les quatre ont rendu un résultat
**collé aux bords de leur fenêtre de recherche** — c'est-à-dire qu'ils mesuraient la fenêtre, pas
l'objet. Leurs sorties fautives restent dans `mesures/` : c'est ce qui prouve que les sondes
retenues discriminent.
