# Juge visuel ⊥ — ENSEMBLE décoré — r4 BORNÉ (P1-P14) — 2026-10-09

Dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r4-2026-10-09/`
Scripts : `mesures/00-empreintes.py` … `mesures/23-resolutions.py` (chacun imprime la taille des images
qu'il ouvre). Aucun autre répertoire de `Tools/juge-visuel/` n'a été ouvert ; aucun rapport précédent,
aucune source Unity, aucune note d'implémentation.

**Intégrité du dossier vérifiée avant toute mesure** (`mesures/00-empreintes.py`) :
33/33 captures à l'empreinte sha256[:12] annoncée, **0 écart** ; nom de fichier et pixels concordants
sur les 33 ; 48/48 références à **1080×2102**, aucune autre taille. Contrôle négatif : une empreinte
bidon est bien signalée en écart.

---

## Verdict : **NON APPROUVÉ**

La carte de tête non-rapports de ④ ne se lit pas comme le cadre 5 : les **deux gestes** et leurs
**deux conséquences** y sont remplacés par deux libellés inertes et un geste générique unique
(`F1`, BLOQUANT) ; deux écarts se voient au premier regard (`F2` le geste principal de ㉞ cassé en
deux lignes, `F3` la police de la fiche de ㉘ passée de serif à sans). **Les onze autres points de la
liste sont verts**, plusieurs au byte près.

| gravité | nombre |
|---|---|
| **BLOQUANT** | **1** |
| **MAJEUR** | **2** |
| **MINEUR** | **10** |

(Compte pris dans la table « Findings » ci-dessous, une ligne par finding, et nulle part ailleurs.)

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Sans cette section un instrument qui rendrait tout faux passerait pour sévère. Toutes les valeurs
sont ramenées en px CSS (**1 px CSS = 3,6 px d'image, des deux côtés**).

| # | grandeur | référence | jeu | script |
|---|---|---|---|---|
| 1 | Hauteur d'x du **sous-titre** du bandeau, 5 écrans | 15 px = **4,17 css** sur les 5 références | 15 px (2400) / 16 px (1920) | `03` |
| 2 | Hauteur de capitale du sous-titre | 21 px = **5,83 css** (4 réf/5 ; E05 = 25 px, « À » accentué) | 20–22 px | `03` |
| 3 | Nombre de lignes du sous-titre | 1 sur les 5 références | 1 sur les 5 captures, aux 2 résolutions | `03` |
| 4 | **Filet d'or** de ⑭ : couleur | RGB **(176, 141, 62)** | RGB **(176, 141, 61)** — Δ ≤ 1/255 | `12` |
| 5 | Filet d'or de ⑭ : épaisseur et largeur | 14 px = **3,89 css**, x 3..1076 (99,4 %) | 14 px = 3,89 css, x 0..1079 (100 %) ; idem à 1920 (y 672..685) | `12` |
| 6 | **Encre de l'eyebrow** de ⑤ | RGB **(241, 200, 105)** | RGB **(242, 201, 106)** — Δ ≤ 1/255 | `14` |
| 7 | Centrage de l'eyebrow de ⑤ | centre d'encre à −4,5 px du centre d'écran | centre d'encre **exactement** 539,5 (écart 0,00 px), 2400 et 1920 | `14`,`15` |
| 8 | **Liseré intérieur** de la carte de ⑤ : couleur | RGB **(176, 141, 62)** | RGB **(176, 141, 62)** — identique au byte | `15` |
| 9 | Liseré intérieur de ⑤ : épaisseur | 2–3 px = 0,56–0,83 css | 3 px = 0,83 css | `15` |
| 10 | **Encadrement** de la planche de ㉘ : nombre de filets | 4 paliers, identiques sur les cadres 54 à 58 | **4 paliers**, même ordre | `05` |
| 11 | Les deux filets intérieurs de ㉘ | 3 px RGB **(42,30,18)** · 18 px RGB **(74,55,34)** | 3 px **(42,30,18)** · 18 px **(74,55,34)** — identiques au byte | `05` |
| 12 | **Grain** du liège de ㉘ : période des pois | 21,2 px = **5,89 css** | 21,7 px (6,02 css) / 22,3 px (6,20 css) — +2 % / +5 % | `07` |
| 13 | **Centrage du libellé** du geste de ㊵ | centre encre − centre cadre = −1,0 px = **−0,10 %** | +1,0 px = **+0,10 %**, à 2400 comme à 1920 | `19` |
| 14 | **Hauteur** de la ligne de file de ④ | 294 px = **81,67 css** | 296 px (82,22 css) 2400 · 291 px (80,83 css) 1920 | `21` |
| 15 | **Part de vide** de la ligne de file de ④ | **93,90 %** | **94,09 %** (91,70 % sur l'état « raison longue », qui porte plus de texte) | `21` |
| 16 | **Étiquette de gravité** de ④ : hauteur de capitale | 21 px = **5,83 css** | 21 px = **5,83 css** | `21` |
| 17 | Étiquette de gravité de ④ : interlettrage | 8 px = **2,22 css** | 8 px = **2,22 css** | `21` |
| 18 | Label **« D'OÙ ÇA PART »** de ㉘ : hauteur de capitale | 17–18 px = 4,72–5,00 css | 17–18 px = 4,72–5,00 css | `11` |
| 19 | Label « D'OÙ ÇA PART » : largeur d'encre totale | 171 px = **47,5 css** | 169 px = **46,9 css** (−1,2 %) | `11` |
| 20 | **Puce de geste** de ㉞ : hauteur de capitale, casse, lignes | 18 px = 5,00 css · CAPITALES · 1 ligne | 18 px = 5,00 css · CAPITALES · 1 ligne | `16`,`17` |
| 21 | **Chrome haut** de ㊳ (anneau + losange) contre ㉚/㉞/㉛ | — | **0 / 48 400** px différents sur l'anneau, **0 / 3 500** sur le losange, écart max 2/255 ; idem à 1920 | `18` |
| 22 | **Ligne de file** de ④ entre les 4 états capturés | — | **0 / 307 200** px différents : composant strictement identique | `20` |
| 23 | Aucun contenu coupé au bord bas | — | **0,00 %** d'encre sur les 4 dernières rangées des **33** planches | `23` |

---

## 0. Ce que la liste P1-P14 met en jeu, pour un joueur

Le tour est borné : il ne rejuge pas les douze écrans, il demande si quatorze parties précises
sont, dans la capture, **égales à la référence**. Ces quatorze parties ne pèsent pas pareil pour qui
joue : trois d'entre elles portent ce que le joueur peut **faire** (P7 et P8, les gestes de ㉞ ;
P10 (b), les gestes de la carte de tête de ④) ; trois portent ce qu'il peut **lire** (P1 le
sous-titre, P11 la fiche de ㉘, P13 les états éteints) ; les autres portent la **matière** qui dit
quel écran on regarde (P2 le liège, P3 le filet d'or, P4/P5 le tapis vert et la carte distribuée,
P12 le cadran). C'est cette grille qui classe les écarts ci-dessous : un geste qui disparaît pèse
plus qu'un liège de six points trop sombre, même si le liège couvre mille fois plus de pixels.

---

## Verdict point par point — oui / non / non jugeable

| point | écran(s) | verdict | les chiffres |
|---|---|---|---|
| **P1** | ㉚ ㉘ ㉛ ㉞ (témoin ㉝) | **OUI** | Sous-titre : hauteur d'x 15 px = 4,17 css sur les 5 références, 15 px (2400) / 16 px (1920) en jeu, soit Δ ≤ 1 px image = **0,28 px CSS**. Hauteur de capitale 21 px (5,83 css) vs 20–22 px. **1 ligne** partout, des deux côtés, aux deux résolutions. Rapport titre/sous-titre (hauteur d'x) : **1,600** sur les 5 références, **1,600 à 1,733** en jeu (écart max +8,3 %, soit +2 px image = +0,56 px CSS sur le titre). |
| **P2** | ㉘ | **OUI** (encadrement + grain) | Encadrement : **4 filets** des deux côtés, même ordre, les deux filets intérieurs identiques au byte (42,30,18) et (74,55,34) ; bois extérieur 14→15 px, filet clair 3→4 px. Grain : période 21,2 px (5,89 css) vs 21,7/22,3 px (+2 %/+5 %), dans la tolérance d'espacement. Couleur du liège : −4 à −15/255 par décile (`F5`), bois extérieur +15 à +26/255 (`F6`) → classe C. Largeur de la planche hors liste (`F7`). |
| **P3** | ⑭ | **OUI** | Présent. RGB (176,141,62) vs (176,141,61). Épaisseur **14 px = 3,89 css** des deux côtés. Pleine largeur : réf x 3..1076 (99,4 % — les 3 px manquants sont l'arrondi d'écran de la maquette), jeu x 0..1079 (100 %). À 1920 : y 672..685, 14 px, 1080 colonnes. ⇒ **la garde de pixels rouge annoncée par le client sur ⑭ (filet d'or) ne correspond à aucun écart mesurable sur la planche.** |
| **P4** | ⑤ | **OUI** | Posé sur **le tapis** (distance de son support au vert du tapis = 13, au crème de la carte = 450 ; le contrôle positif sépare tapis et carte de 463). Encre (242,201,106) vs réf (241,200,105). **Centré** : centre de l'encre = 539,5 = centre d'écran, écart **0,00 px**, aux deux résolutions. Contraste **6,70:1** (réf 6,44:1) ≥ 4,5:1. Interlettrage +6 à +13 % (`F11`, classe C). ⇒ **la garde rouge du client sur ⑤ (eyebrow) ne correspond à aucun écart A/B mesurable.** |
| **P5** | ⑤ | **OUI** (le liseré lui-même) | Couleur **(176,141,62) identique au byte**, épaisseur 2–3 px (0,56–0,83 css) vs 3 px (0,83 css). Son **retrait** depuis le bord extérieur change (`F9`) et le bord extérieur de la carte change (`F10`). |
| **P6** | ㊳ | **NON JUGEABLE** pour la bande · **OUI** pour le chrome | La bande « … attend vos ordres — trancher » n'est sur **aucune** des 4 planches E01 : les seules bandes de texte du bas sont le geste (y 1928..2020) et son indice (y 2042..2065). Couvert par l'assumé n° 9 (toast effacé avant chaque cliché). La moitié mesurable est verte : chrome de E01 **pixel pour pixel identique** à celui de ㉚, ㉞ et ㉛ — anneau 0/48 400, losange 0/3 500, écart max 2/255, aux deux résolutions ⇒ **rien ne le recouvre**. |
| **P7** | ㉞ | **NON** | Casse CAPITALES des deux côtés ✓. Hauteur de capitale **égale** (la ligne du jeu qui porte le « É », comme la référence : 33 px vs 32 px, +3 %). Couleur = état éteint, assumé n° 10. **Mais le libellé passe sur DEUX lignes** là où la maquette le tient sur une (`F2`). États : seul l'**éteint** est capturé ⇒ l'**allumé n'est pas jugeable**. |
| **P8** | ㉞ | **OUI** sauf l'arrondi | Forme : rectangle des deux côtés, mais rayon **3 px** (cadre 88) / 2 px (cadre 90) = 0,83 / 0,56 css → **0 px, angle vif** en jeu (`F13`, classe C ; contrôle négatif : un angle vif connu rend bien 0). Remplissage transparent des deux côtés. Encre : réf (123,99,51) sur (33,30,25) = **2,90:1** ; jeu (122,90,22) sur (229,224,208) = **4,82:1** ⇒ assumé n° 11 **rendu proprement et au-dessus du seuil 4,5:1**. Casse CAPITALES, hauteur de capitale 18 px = 5,00 css, **1 ligne** : égaux. Filet 3 px → 4 px. Identique à 1920 (bbox 311×48, rayon 0, filet 4 px, (122,90,22)). |
| **P9** | ㊵ | **OUI** | Centre de l'encre − centre du cadre : **−1,0 px = −0,28 css = −0,10 %** de la largeur du cadre en maquette, **+1,0 px = +0,10 %** en jeu ; identique à 1920. Marges intérieures 400/402 px (réf) vs 391/389 px (jeu). Le cadre **141 ne porte pas de bouton de geste** (0 px d'or dans la bande du geste) : le témoin est le 140. |
| **P10** | ④ | **(a) OUI · (b) NON** | (a) Ligne de file : hauteur 294 px (81,67 css) vs 296/291 px (82,22/80,83 css) ; part de vide 93,90 % vs 94,09 % ; étiquette de gravité **hauteur de capitale 21 px et interlettrage 8 px, identiques au pixel** ; contraste 4,87:1 → 6,86:1. L'interligne du bloc est resserré de 20 % (`F12`). (b) Carte de tête non-rapports contre le cadre 5 : **`F1`, BLOQUANT**. |
| **P11** | ㉘ | **NON** (titre de fiche) · **OUI** (label) · **NON JUGEABLE** (rangées) | Titre de fiche : indice d'empattement **1,57 → 1,00** (`F3`) — étalons mesurés dans la même série : DejaVu Serif Bold = 1,56, DejaVu Sans = 1,00. Label « D'OÙ ÇA PART » : hauteur de capitale 17–18 px et largeur d'encre 171 → 169 px (−1,2 %) ⇒ **égal**. Rangées « LE CHEMIN / À TRAVERSER / CETTE ROUTE » : **absentes de l'état capturé**, couvert par l'assumé n° 1 (« panneau de liège borné ») ⇒ non jugeables. |
| **P12** | ⑭ | **OUI, rendu proprement** | Le cran est un disque d'or dégradé, à demi couvert par l'arc rouge **exactement comme dans le cadre 18** (qui, contrairement à ce qu'annonce le dossier, le montre) : aire d'or exposée **1 675 px (réf) → 1 620 px (jeu), −3,3 %** ; ses trois frères mesurent 30–31 px de diamètre des deux côtés. Seule nuance : l'**ombre portée** sous le cran est absente (`F8`). |
| **P13** | ㊳ · ㉞ | **OUI** | ㊳ « Y PRÊTER ATTENTION » : encre (122,131,141) sur (14,18,24) = **4,88:1**, hauteur de capitale 30 px (8,33 css) vs réf 29 px (8,06 css) ; **identique à 1920** (4,88:1). ㉞ « LANCER LA SOIRÉE » : encre (152,121,121) sur (22,21,25) = **4,63:1**, aux deux résolutions. Les deux ≥ **4,5:1**. Propres : aucun trou, aucun libellé de repli. |
| **P14** | tous | **NON JUGEABLE** | Aucune capture T / T+1 s n'est fournie, et aucune source HTML/CSS n'est au dossier pour dire si des `@keyframes` sont déclarées. Ce qui reste jugeable — **où tombe l'image figée** — est vert : 0,00 % d'encre sur les 4 dernières rangées des 33 planches, aucune ligne de texte coupée par un balayage. |

---

## Findings — une ligne par finding, et rien de compté ailleurs

| id | écran | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `A01` | `BLOQUANT` | `DOCTRINE` | **P10 (b)** — carte de tête non-rapports : les **deux gestes** du cadre 5 et leurs **deux conséquences** ont disparu. Le jeu met à leur place deux **libellés inertes en bas-de-casse** sur une seule ligne, puis un **geste générique unique « PRENDRE ACTE »** dont l'indice dit lui-même « prendre acte n'agit pas à votre place ». Le joueur ne choisit plus entre deux actes et ne voit plus ce que chacun coûte : le sens de l'écran change. | Cadre 5 : bouton **plein** 420×129 px = **116,7 × 35,8 css**, aplat d'or 47 195 px, libellé « METTRE EN RÉPARATION » capH = xH = 56 px ⇒ **CAPITALES** · bouton **creux** « LAISSER EN L'ÉTAT » capH = xH = 24 px ⇒ CAPITALES · puis **3 bandes de conséquence** (y 1300..1332, 1339..1371, 1378..1399). Capture : **1 seul** bouton plein 878×87 px = **243,9 × 24,2 css**, aplat d'or 72 030 px, « PRENDRE ACTE » capH = xH = 24 px · libellés d'option y 1503..1532 **capH 24 / xH 17 ⇒ bas-de-casse, hors de tout bouton** · **0 bande de conséquence**. Contrôle négatif : la même détection sur le bandeau PORTÉE/URGENCE rend 0 bouton. (`mesures/22-P10-tete.py`) | Si une interaction (appui long, dépliage) révèle les deux gestes : une capture de l'écran après ce geste trancherait. |
| `F2` | `E02` | `MAJEUR` | `INSTRUMENT NEUF` | **P7** — le libellé du geste principal « LANCER LA SOIRÉE » passe sur **deux lignes** (et son indice « une fois partie, on ne la reprend pas » aussi), là où la maquette tient chacun sur **une**, dans un bouton pourtant large de 970 px dont le milieu reste vide. | Cadre 85 : **1 bande** y 1969..2001, encre x 95..599 (fenêtre bornée). Capture 2400 : **2 bandes** y 1956..1981 et 1989..2021, encre x 134..362 puis 134..280 ; **identique à 1920** (y 1476..1501 et 1509..1541). Hauteur de capitale : ligne 2 du jeu (porte le « É », comme la référence) 33 px vs 32 px, **+3 %** ⇒ la taille n'est pas en cause, c'est le retour à la ligne. (`mesures/17-E02-v2.py`) | — |
| `F3` | `E04` | `MAJEUR` | `INSTRUMENT NEUF` | **P11** — la police du **titre de la fiche** passe de **DejaVu Serif** (maquette) à **DejaVu Sans** (jeu). Les deux familles sont embarquées par le client : ce n'est pas une substitution de la machine de rendu, donc pas un arbitrage. | **Indice d'empattement** (médiane des segments d'encre sur les 3 rangées au-dessus de la ligne de base ÷ médiane au milieu de la bande d'x) : fiche de la référence **1,57**, fiche du jeu **1,00**, aux deux résolutions. Étalons pris dans la **même** série : titre DejaVu Serif Bold de ㉚ = **1,56**, sous-titre DejaVu Sans de ㉚ = **1,00**. Hauteur de capitale 28 px (7,78 css) → 25–26 px (6,94–7,22 css). (`mesures/09`, `10`) | La hauteur de capitale de la référence est mesurée sur une fiche **inclinée** : le −7 à −11 % de taille est moins sûr que le changement de famille, qui, lui, est net. |
| `F4` | **`ENSEMBLE`** (㉞ ㉚ ㉘ ㉛ ; ㉝ indemne) | `MINEUR` | `INSTRUMENT NEUF` | **hors périmètre** — le **titre du bandeau** perd sa graisse : **DejaVu Serif Bold** dans les 5 références, **Regular** dans 4 captures sur 5. Écart **sélectif** : ㉝ (le témoin de P1) garde le gras — ce qui désigne un composant de titre différent sur les quatre autres. *Par la table de gravité du mandat cet écart se lirait MAJEUR ; il est classé MINEUR parce que dossier.md impose cette classe pour tout A/B vu hors de la liste P1-P14.* | Fût médian **9 px = 2,50 css** dans les 5 références ; **6 px = 1,67 css** sur ㉞/㉚/㉘/㉛ ; **9 px** sur ㉝. Couple à contenu **identique** (㉚, « Commander de la matière première » des deux côtés) : encre **11 973 → 9 335 px (−22,0 %)**, densité **0,557 → 0,458 (−17,9 %)** à hauteur d'x égale (24 → 25 px). Contrôle : la même mesure sur le **sous-titre** de ㉚, lui aussi identique des deux côtés, ne bouge pas de graisse (3 px → 3 px). (`mesures/03`, `04`) | — |
| `F5` | `E04` | `MINEUR` | `INSTRUMENT NEUF` | **classe C** — le liège de la planche est plus sombre, d'un écart systématique de même signe sur toute la largeur. | Profil par **décile de la largeur du liège** (le liège est dégradé : comparer une fenêtre à une fenêtre ne comparerait rien) : Δ = **−15, −9, −7, −6, −6, −5, −4, −4, −5, −7** sur R ; médiane **−6/255**, max **−15/255** au premier décile. Contrôle positif : cadre 54 contre cadre 57, écart max **1/255** par canal. (`mesures/08`) | — |
| `F6` | `E04` | `MINEUR` | `INSTRUMENT NEUF` | **classe C** — la bande de bois **extérieure** de l'encadrement est plus claire. | Haut : réf **(118, 90, 55)** → jeu **(144, 110, 69)**, Δ (+26, +20, +14). Gauche : (114, 86, 53) → (139, 106, 65). Bas : (88, 65, 38) → (103, 76, 45). Le dégradé haut→bas existe des deux côtés ; c'est son niveau qui est décalé. Les filets **intérieurs**, eux, sont identiques au byte. (`mesures/05`) | La planche du jeu est bien plus courte que celle de la maquette (431 px contre 824 px de haut) : un dégradé défini sur la hauteur de l'élément n'est pas échantillonné au même endroit. |
| `F7` | `E04` | `MINEUR` | `INSTRUMENT NEUF` | **hors périmètre** — la planche n'est plus pleine largeur : la maquette la pose bord à bord, le jeu la rentre d'une gouttière de chaque côté. | Liège : **994 px = 276,1 css** (réf) → **864 px = 240,0 css** (jeu), **−36,1 css = −13,1 %**. Bord extérieur de la planche : x 3 (réf, soit 0,8 css du bord d'écran) → x 57 (jeu, **15,8 css**). (`mesures/05`, `08`) | — |
| `F8` | `E08` | `MINEUR` | `INSTRUMENT NEUF` | **classe C** — **P12** : l'**ombre portée** sous le cran « écrasante » est absente en jeu. Le cran lui-même est rendu proprement. | Sous le cran : réf **(21, 23, 26)** contre fond de cadran **(38, 42, 48)** ⇒ assombrissement **−17/255** ; jeu **(38, 42, 47)** contre **(39, 43, 48)** ⇒ **−1/255**, soit aucune ombre. (`mesures/13` + relevé joint) | — |
| `F9` | `E11` | `MINEUR` | `INSTRUMENT NEUF` | **classe C** — **P5** : le liseré intérieur est **collé** au bord de la carte ; la maquette le fait flotter. Le liseré lui-même (couleur, épaisseur) est égal. | Crème entre le bord extérieur et le liseré : **14 px = 3,89 css** (réf) → **5 px = 1,39 css** (jeu), soit **−2,5 css (−64 %)**. Mesuré à deux hauteurs de la même carte, mêmes valeurs. (`mesures/15`) | — |
| `F10` | `E11` | `MINEUR` | `INSTRUMENT NEUF` | **classe C** — le **bord extérieur** de la carte distribuée s'épaissit et s'éclaircit. | **3 px = 0,83 css**, RGB **(107, 74, 18)** (réf) → **5 px = 1,39 css**, RGB **(138, 106, 44)** (jeu) ; Δ couleur (+31, +32, +26). Contrôle négatif : un profil pris hors de la carte ne montre aucun palier crème. (`mesures/15`) | — |
| `F11` | `E11` | `MINEUR` | `INSTRUMENT NEUF` | **classe C** — **P4** : l'eyebrow est plus **chassé** (interlettrage plus large) à hauteur de capitale égale. | Comparaison **mot à mot** sur les mots communs (la segmentation lettre à lettre fusionne différemment des deux côtés, elle est écartée) : « CE » 52 → 57 px (**+9,6 %**), « QUI » 80 → 87 px (**+8,8 %**), « PÈSE » 109 → 123 px (**+12,8 %**), « LE » 50 → 53 px (**+6,0 %**) ; écarts entre mots 31–34 px → 36–37 px. Hauteur de capitale 32 → 33 px (+3 %). (`mesures/14` + relevé joint) | — |
| `F12` | `A01` | `MINEUR` | `INSTRUMENT NEUF` | **P10 (a)** — l'**interligne** des 5 lignes de la ligne de file est resserré, alors que la hauteur de la carte et la part de vide sont, elles, égales. | Écarts entre hauts de ligne successifs : réf **47 / 53 / 43 / 50 px** (moyenne 48,3 px = **13,4 css**) ; jeu **39 / 40 / 36 / 39 px** (moyenne 38,5 px = **10,7 css**), **−20 %** ; identique à 1920 (38/40/36/39). La première ligne descend aussi de +22 px (+6,1 css) sous le haut de la carte, la dernière remonte de −17 px. (`mesures/21` + relevé joint) | — |
| `F13` | `E02` | `MINEUR` | `INSTRUMENT NEUF` | **classe C** — **P8** : la puce de geste perd son arrondi (angle vif en jeu). | Rayon mesuré par l'écart, le long du bord haut, entre la colonne la plus à gauche du filet et la première qui atteint sa rangée la plus haute : **3 px = 0,83 css** (cadre 88, deux puces concordantes) et **2 px = 0,56 css** (cadre 90) → **0 px** en jeu, aux deux résolutions. Contrôle négatif : un angle vif connu (le coin du carnet crème) rend bien **0 px**. (`mesures/17`) | — |

---

## Autres résolutions

Les **deux** résolutions ont été jugées sur **tous** les points mesurables (`mesures/23-resolutions.py`
balaie les 33 planches ; chaque script de point a été rejoué sur la planche 1920 correspondante).

| résolution | tient ? | ce qui a été vérifié |
|---|---|---|
| **1080×2400** | oui | Les 14 points. Aucune encre sur les 4 dernières rangées (0,00 % sur les 17 planches). |
| **1080×1920** | oui, **aucun écart propre à cette résolution** | P1 (hauteur d'x 16 px au lieu de 15, soit +0,28 css), P3 (filet d'or y 672..685, 14 px, 1080 colonnes), P4 (encre et centrage identiques), P5 (liseré (176,141,62), 3 px), P8 (puce 311×48, rayon 0, filet 4 px), P9 (centrage +0,10 %), P10 (hauteur 291 px, vide 94,04 %, étiquette 21 px / 8 px), P13 (4,88:1 et 4,63:1), P6 (chrome 0/48 400 px). Aucune encre sur les 4 dernières rangées des 16 planches. ⑭ et ⑤ **défilent** à 1920 : leur fin est hors écran sans défilement, et c'est ce que montrent les planches `_bas` fournies — rien n'est **coupé** au bord, c'est un reflux, et il garde l'ordre de lecture. ㉚, ㉘, ㊵ et ④ montrent leur geste **et** le dock dans l'image à 1920. |

---

## Non vérifié

1. **P14 — animation.** Les captures T et T+1 s ne sont pas fournies, et le dossier ne contient
   **aucune source HTML/CSS** : je ne peux dire ni qu'un pixel bouge, ni si des `@keyframes` sont
   déclarées. *Ce qui trancherait* : les deux captures à T et T+1 s, et un `grep '@keyframes'` sur
   `ecrans-brennar-6.html` au SHA `4bd3ea2`.
2. **P6 — la bande « … attend vos ordres — trancher » de ㊳.** Absente des 4 planches E01 (assumé
   n° 9). *Ce qui trancherait* : une capture de ㊳ prise **à t < 5 s**, le toast à l'écran.
3. **P7 — l'état ALLUMÉ du geste principal de ㉞.** Seul l'éteint est capturé (assumé n° 10).
   *Ce qui trancherait* : une capture de ㉞ avec au moins un ordre posé.
4. **P11 — les rangées « LE CHEMIN / À TRAVERSER / CETTE ROUTE ».** Absentes de l'état « aucun
   relais » (assumé n° 1). *Ce qui trancherait* : une capture de ㉘ **avec** un relais.
5. **Les familles de police, depuis une image.** L'indice d'empattement sépare très proprement
   serif et sans (1,56 contre 1,00 sur deux lignes de la **même** planche), mais il ne nomme pas une
   fonte. *Ce qui trancherait* : la pile `font-family` calculée sur l'élément, côté maquette, et la
   `TMP_FontAsset` effectivement assignée, côté jeu.
6. **`F1` — l'interaction.** Je juge une image figée : si un appui long ou un dépliage révèle les
   deux gestes du cadre 5, l'image ne peut pas le dire. *Ce qui trancherait* : une capture après ce
   geste.
7. **La hauteur de capitale de la fiche de ㉘ (`F3`).** La fiche de la maquette est **inclinée** :
   la ligne de base y est oblique, et la hauteur mesurée en est gonflée. Je retiens le changement de
   **famille**, pas le −7 à −11 % de **taille**.
8. **Deux assumés du dossier que je ne peux pas confirmer depuis l'image** : le sous-titre de ㉘
   « 2→1 phrase au chargement » (assumé n° 1, explicitement non vérifiable) et la valeur « 1,6:1
   sur le papier » citée par l'assumé n° 11 — je mesure la puce de la maquette sur **son** support
   (fond sombre) à **2,90:1**, pas sur du papier.
9. **Instruments écartés en route, et pourquoi** — à ne pas réutiliser tels quels :
   `02-P1-sous-titre.py` (hauteur d'x par seuil à 50 % du profil : rendait 3 px sur un sous-titre de
   15 px) ; `06-P2-grain.py` (fenêtres de liège contaminées — son contrôle négatif, une fenêtre de
   fiche crème, rendait une amplitude de 195/255) ; `16-E02-P7-P8-P13.py` pour la puce de référence
   (prédicat R > 130 alors que le filet vaut (123, 99, 50)) ; `20-P10-accueil.py` pour l'étiquette de
   gravité (ordonnée reprise de la référence sans la ramener à la hauteur de la capture). Chacun est
   laissé en place **avec son contrôle qui échoue** : c'est lui qui a dit qu'il fallait le refaire.

---

## Annexes

### A. Correspondance des repères (échelle), telle que `dossier.md` l'impose

| | px de l'image | largeur CSS | facteur |
|---|---|---|---|
| Référence (48 PNG, **tous vérifiés à 1080×2102**) | 1080 | 300 | **×3,6** |
| Capture (33 PNG, 1080×2400 et 1080×1920) | 1080 | 300 | **×3,6** |
| Rapport capture ÷ référence **en X** | | | **1,000** |

En Y il n'y a **pas** de rapport (gabarit 2102 contre 2400 / 1920) : aucune grandeur n'est comparée
en px Y absolus. Toutes les comparaisons portent sur des grandeurs invariantes (épaisseur de filet,
hauteur de capitale, période de grain, rayon, largeur de colonne), sur des **rapports internes**
(centre d'encre contre centre de cadre, part de vide, rapport titre/sous-titre), ou sur des
**pourcentages de la largeur du parent**. Offset : aucun — les deux séries partent de x = 0 et la
largeur est la même ; les ordonnées sont rattachées, de chaque côté, à un repère lu dans l'image
même (haut de la planche, haut du panneau, filet du bouton), jamais reportées d'une image à l'autre.

### B. Scripts — `mesures/`

| script | ce qu'il mesure | contrôles |
|---|---|---|
| `00-empreintes.py` | sha256[:12] et taille des 33 captures + 48 références | positif : 48/48 à 1080×2102 · négatif : empreinte bidon détectée |
| `outils.py` · `seg.py` · `metrique.py` | socle : ouverture (imprime la taille), médiane de fenêtre, contraste WCAG, segmentation en bandes/lettres, métrique typographique par **mode** des lignes de base | `seg.py` : négatif, 0 bande sur un pavé de ciel · `metrique.py` : capH > xH |
| `01-bandes-texte.py` | instrument de segmentation (démonstration) | négatif : fond pur → 0 bande |
| `02-P1-sous-titre.py` | **écarté** (heuristique 50 % non fiable) | son contrôle positif échoue : c'est ce qui l'a écarté |
| `03-P1.py` | P1 : hauteur d'x, hauteur de capitale, rapport titre/sous-titre, lignes, 5 écrans × 3 planches | positif : les 5 références rendent la même hauteur d'x de sous-titre (15 px) · négatif : titre ≠ sous-titre |
| `04-graisse-titre.py` | `F4` : fût et compte d'encre du titre, dont le couple à contenu identique de ㉚ | positif : le sous-titre de ㉚, même texte, ne change pas de graisse · négatif : ㉝ rend bien 9 px, pas 6 |
| `05-P2-planche.py` | P2 : profil du bord gauche, paliers de l'encadrement, couleur du liège | positif : cadres 54 à 58 identiques · négatif : liège ≠ fiche crème |
| `06-P2-grain.py` | **écarté** (fenêtres contaminées) | son contrôle négatif rend 195/255 sur un aplat crème |
| `07-P2-grain-v2.py` | P2 : période et amplitude du grain, fenêtres bornées au profil | négatif : aplat crème pur → amplitude 0,0, 0 pois |
| `08-P2-couleur-liege.py` | `F5`, `F7` : couleur du liège par décile de largeur | positif : cadre 54 contre cadre 57, écart max 1/255 par canal |
| `09` · `10-P11-v2.py` | P11, `F3` : indice d'empattement | positif/négatif : DejaVu Sans = 1,00 et DejaVu Serif Bold = 1,56 sur la même planche |
| `11-P11-label.py` | P11 : « D'OÙ ÇA PART », hauteur de capitale sur les capitales **à sommet plat** | positif : les lettres de « PART » tiennent à ±1 px |
| `12-P3-filet-or.py` | P3 : présence, couleur, épaisseur, largeur du filet d'or | négatif : 0 colonne dorée sur une rangée de ciel |
| `13-P12-crans.py` | P12 : les crans de la jauge, diamètre et encre | positif : les crans de la référence sont égaux à 0 px près |
| `14-P4-eyebrow.py` | P4 : support, encre, centrage, contraste | positif : tapis et carte séparés de 463 — **et c'est ce contrôle qui a signalé une fenêtre 1920 mal posée** |
| `15-P5-lisere-carte.py` | P5, `F9`, `F10` + reprise de P4 à 1920 | positif : deux hauteurs de la même carte concordent · négatif : hors carte, aucun palier crème |
| `16` · `17-E02-v2.py` | P7, P8, P13 : rayon, filet, encre, casse, lignes, contrastes | négatif : un angle vif connu rend 0 px de rayon |
| `18-P6-chrome.py` | P6 : diff pixel du chrome de ㊳ contre 4 autres écrans | positif : ㉛ contre ㉞ = 0 px · négatif : anneau contre décor = 99,3 % |
| `19-P9-alignement.py` | P9 : centre d'encre contre centre de cadre | positif : le cadre est lui-même centré · négatif : fenêtre décalée de 40 px, centre inchangé |
| `20` · `21-P10-v2.py` | P10 (a), `F12` : hauteur, part de vide, étiquette, interlignes | positif : ligne de file identique entre les 4 états (0 px) · négatif : fond pur → vide 1,0000 |
| `22-P10-tete.py` | P10 (b), `F1` : gestes, conséquences, casse | négatif : bandeau PORTÉE/URGENCE → 0 bouton |
| `23-resolutions.py` | bord bas, bord droit, dock, sur les 33 planches | négatif : une bande du milieu d'écran porte bien de l'encre |

### C. Deux remarques pour qui corrigera (elles ne sont comptées nulle part)

- **`F4` est un écart sélectif** : quatre bandeaux sur cinq perdent le gras, ㉝ le garde. Le mandat
  dit qu'un écart sélectif désigne un **conteneur différent** — ici, un composant de titre distinct
  sur ㉞/㉚/㉘/㉛.
- **Trois des quatre gardes de pixels que le client déclare rouges sont contredites par la planche** :
  ⑭ filet d'or (égal à 1/255 près, épaisseur et largeur comprises) et ⑤ eyebrow (encre à 1/255,
  centrage exact, contraste 6,70:1). Ce sont les gardes qu'il faut relire, pas l'écran. La quatrième,
  ⑤ feutre 8,5 %, n'est dans aucun des quatorze points : elle n'a pas été mesurée.
