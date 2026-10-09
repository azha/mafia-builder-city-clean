# Juge visuel ⊥ — ENSEMBLE décoré — r5 **BORNÉ (Q1-Q4)** — 2026-10-09

Agent neuf, contexte vierge. Aucun autre répertoire de `Tools/juge-visuel/` n'a été ouvert, aucun
rapport précédent, ni le code client, ni les notes d'implémentation. Périmètre : **les quatre points
Q1-Q4 de `dossier.md` et rien d'autre**.

## Verdict : **APPROUVÉ**

Les quatre points sont **OUI**. Aucun BLOQUANT, aucun MAJEUR. Trois MINEUR consignés (dont un hors
périmètre), tous chiffrés.

| | |
|---|---|
| BLOQUANT | **0** |
| MAJEUR | **0** |
| MINEUR | **3** |

*(compte pris dans la table du § 3, qui est la seule table de findings de ce rapport.)*

### Réponse point par point

| point | réponse | chiffre qui décide |
|---|---|---|
| **Q1** — bande de conséquence sous **chaque** option (④ `_TeteNonRapports`) | **OUI** | **2** bandes, **4** lignes chacune, sous leur option et dans la **même colonne** (centres : option 321,0 / conséquence 320,9 à gauche ; 779,0 / 777,6 à droite) ; casse de phrase (œil/capitale 0,739 vs 0,727 réf) ; encre **(185, 173, 146) = (185, 173, 146)** ; hauteur de capitale 23 vs 22 px img (+4,5 %, dans la tolérance). `_TeteDeuxOptions` propre. |
| **Q2** — libellé + légende du geste ㉞, largeur du bouton et marges | **OUI** | **1 ligne chacun** (une seule rangée de corps dans la boîte, sur les **4** captures E02) ; bouton **988 px img = 274,44 px CSS** vs réf **980 = 272,22** (**+2,22 px CSS, +0,82 %**) ; marges **12,78 px CSS** vs réf **13,89** (**−1,11 px CSS**). |
| **Q3** — famille / graisse / taille du titre de fiche ㉘ | **OUI** | famille **serif** : appariement de forme **IoU 0,748 (2400) / 0,768 (1920) pour DejaVu Serif Bold**, devant Sans Bold 0,585 et Serif Book 0,497 ; graisse **5,08 px img** (Bold synthétique 5,51 · Book synthétique **2,95**) ; taille **24 px img = 24 px img** (Δ 0). |
| **Q4** — graisse du titre de bandeau (㉚ ㉘ ㉛ ㉞ ; ㉝ témoin) | **OUI** | hampes capture **7,76 à 8,63 px img** vs Bold synthétique **7,10-7,26** et Book synthétique **3,98-4,19** ⇒ les quatre sont **Bold** ; rapports capture/réf **1,046 à 1,080**, et le **témoin ㉝ fait 1,038 / 1,064** — l'écart résiduel est l'offset du témoin, pas un défaut d'écran. |

---

## Contrôle positif — ce que l'instrument trouve ÉGAL

Toutes ces grandeurs sont ramenées en **px image** à **×3,6 des deux côtés** (dossier.md) ; les px CSS
sont donnés quand ils éclairent.

| # | grandeur | référence | jeu | écart | script |
|---|---|---|---|---|---|
| 1 | rectangle de la carte de tête ④ (bord à bord du liseré) | x 46..1033, largeur **988** px img (274,44 CSS), centre **539,5** | x 47..1032, largeur **986** px img (273,89 CSS), centre **539,5** | **−2 px img (−0,56 px CSS, −0,2 %)**, centres identiques | `10` |
| 2 | surtitre « CE QU'ON PEUT FAIRE » — hauteur de capitale | **22** px img | **22** px img (2400) · **22** (1920) | **0** | `10` |
| 3 | surtitre « CE QU'ON PEUT FAIRE » — avance | **409** px img | **412** (2400) · **405** (1920) | **+0,7 % / −1,0 %** | `10` |
| 4 | encre des conséquences, colonnes G **et** D | **(185, 173, 146)** | **(185, 173, 146)** aux 2 résolutions et dans les 2 colonnes | **0 / 0 / 0** par canal | `10` |
| 5 | encre du titre de carte (or) — *contrôle négatif de l'échantillonneur* | (242, 201, 107) | (242, 201, 106) | **1** sur le canal B, **et bien ≠ (185,173,146)** : l'échantillonneur sépare l'or du texte courant | `10` |
| 6 | casse des conséquences | phrase (œil/capitale **0,727**) | phrase (**0,739** / **0,773**) | même casse | `10` |
| 7 | milieu du groupe de 2 colonnes, rapporté au **centre de la carte** | **+0,1** px img | **+9,8** px img = **+2,72 px CSS** = **+0,99 % de la carte** | sous la tolérance de position (≤ 1,5 % du parent) — consigné, **pas** un finding | `10` |
| 8 | hauteur de la bande basse ㉞ | **105** px img (29,17 CSS) | **104** px img (28,89 CSS) sur les **4** captures | **−1 px img (−0,28 px CSS)** | `20` |
| 9 | avance du libellé « LANCER LA SOIRÉE » | **395** px img | **394** px img | **−1 px img** | `20` |
| 10 | avance de la légende « une fois partie, on ne la reprend pas » | **423** px img | **423** px img | **0** | `20` |
| 11 | hauteur de capitale du « L » de LANCER | **25** px img (6,94 CSS) | **24** px img (6,67 CSS) | **−1 px img (−4,0 %)** | `20` |
| 12 | hauteur de capitale du titre de fiche ㉘ | **24** px img (6,67 CSS) — cadres 54 **et** 55 | **24** px img aux 2 résolutions | **0** | `30` |
| 13 | hauteur de capitale du surtitre « D'OÙ ÇA PART » | **16** px img | **16** (2400) · **17** (1920) | **0 / +1 px img** | `30` |
| 14 | avance du surtitre « D'OÙ ÇA PART » (même texte) | **186** px img | **168** px img | **−9,7 %** — sous la tolérance d'espacement (≤ 10 %), consigné, **pas** un finding | `30` |
| 15 | papier de la fiche ㉘ | (239, 230, 212) | (234, 224, 200) | **5 / 6 / 12** par canal — B hors tolérance de 6/255, mais hors périmètre Q3 (famille/graisse/taille) et sous l'œil ; consigné | `30` |
| 16 | avance du titre **et** du sous-titre du bandeau ㉚ E03 (**seul couple à texte identique**) | titre **894** px img (248,3 CSS), sous-titre **856** (237,8 CSS) | titre **897** (249,2 CSS), sous-titre **857** (238,1 CSS) — **identiques aux 2 résolutions** | **+0,3 % / +0,1 %** ⇒ **la taille du titre de bandeau est la même**, donc la comparaison de graisse de Q4 est légitime | `40` |
| 17 | retrait gauche du bandeau de titre ㉚ | x = **52** | x = **59** | **+7 px img = +1,94 px CSS** — sous la tolérance de position (≤ 2 px CSS) | `40` |
| 18 | contraste de l'encre des conséquences sur le panneau | **8,75:1** | **8,63:1** | ≥ 4,5:1 des deux côtés (doctrine) | `10` |
| 19 | contrastes de la bande basse ㉞ (état éteint, assumé 4) | 7,91:1 (libellé) · 4,98:1 (légende) | **4,63:1** · **4,64:1** | ≥ 4,5:1 : la doctrine tient **dans le jeu** | `20` |
| 20 | stabilité de l'instrument — largeur du bouton ㉞ sur les **4** captures E02 (2 résolutions × 2 positions de liste) | — | **{988}** : une seule valeur ; et 988 ≠ 1080 ⇒ le détecteur voit un liseré, pas le bord d'image | — | `20` |

### Contrôles négatifs (sans eux, rien de ce qui précède ne discrimine)

- **Graisse** : DejaVu Serif **Book** rendu localement à la même hauteur de capitale donne **2,95 px**
  (cap 24) et **3,98-4,19 px** (cap 32-33) de hampe, contre **5,51** et **7,10-7,26** pour **Bold**.
  L'instrument sépare donc les deux graisses par un facteur ≈ 1,8. (`30`, `40`)
- **Famille** : l'appariement de forme classe Serif Bold 0,748 / **Sans Bold 0,585** / Serif Book 0,497
  / Sans Book 0,427 sur la **même chaîne** à la **même avance** — il sépare les familles. (`30`)
- **Couleur** : l'échantillonneur de cœur de glyphe rend (242, 201, 107) pour l'or du titre et
  (185, 173, 146) pour le texte courant du **même** panneau : il ne renvoie pas une couleur unique. (`10`)
- **Instrument déclaré NON concluant** : le même appariement de forme appliqué à la **référence**
  (fiche **tournée de +2,42°**, angle calculé par le script : base y = 754 au 1ᵉʳ glyphe, y = 724 au
  dernier) donne **Serif Bold 0,261 · Sans Bold 0,238 · Sans Book 0,192 · Serif Book 0,167** — aucun
  candidat ne colle.
  Le classement y est juste (Serif Bold en tête) mais l'écart est du bruit : **la famille de la
  référence n'est PAS établie par ce matcher**, seulement par sa hampe (5,89 px) et par la lecture
  des empattements à ×4. Dit ici parce qu'un instrument qui ne discrimine pas ne mesure pas.

---

## Correspondance des repères (échelle, offsets) — toute mesure du § 3 la cite

| | px image | px CSS | facteur |
|---|---|---|---|
| référence (32 PNG, tous vérifiés 1080×2102) | 1080 | 300 | **×3,6** |
| captures (22 PNG, 1080×2400 et 1080×1920) | 1080 | 300 | **×3,6** |
| rapport capture ÷ référence **en X** | | | **1,000** |

- **Les 22 empreintes sha256 du dossier ont été recalculées : 22/22 correspondent, 0 désaccord**
  (`mesures/01-inventaire.py`, sortie `01-inventaire-sortie.txt`). Le même script ouvre les **54**
  images et imprime leur taille : les 32 références sont **toutes 1080×2102** (une seule taille
  distincte) et **aucune image du dossier n'est en 900×1752** — l'échelle ×3,6 vaut donc partout.
- **En Y il n'y a pas de rapport** : chaque comparaison verticale passe par un **repère commun** :
  - ④ A01 : le surtitre « CE QU'ON PEUT FAIRE » — réf y = 1078, CAP 2400 y = 1317, CAP 1920 y = 872 ;
  - ㉞ E02 : le haut de la boîte du geste — réf y = 1938, CAP 2400 y = 1958, CAP 1920 y = 1478 ;
  - ㉘ E04 : la ligne de base du titre de fiche — réf y = 754, CAP 2400 y = 840, CAP 1920 y = 740 ;
  - bandeaux de titre : la première bande d'encre claire de la fenêtre (réf 440-530, CAP 2400
    520-610, CAP 1920 420-510).
- **Rotation mesurée de la fiche de référence ㉘** : ligne de base y = 754 à x = 95 et y = 724 à
  x = 805 ⇒ **+2,42°**. Les rendus de contrôle de la référence sont tournés d'autant ; les hauteurs
  de capitale y sont prises sur **une seule lettre** (jamais sur un profil de ligne entière, qu'une
  rotation étale).

---

## 3. Écarts — **la seule table de findings du rapport**

| id | écran | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `A01` | `MINEUR` | `INSTRUMENT NEUF` | **interlignage du paragraphe de conséquence trop serré** — le bloc respire moins que dans le cadre 5, alors que la lettre est très légèrement plus grande. Visible **seulement côte à côte** : l'ordre de lecture est inchangé. Même valeur aux deux résolutions ⇒ pas un effet de reflux. | pas moyen entre les hauts de ligne : réf **39,00 px img = 10,83 px CSS** (pas 40/39/38) ; jeu **33,33 px img = 9,26 px CSS** (34/34/32 à 2400, 35/33/32 à 1920). **Δ = −5,67 px img = −1,57 px CSS = −14,5 %**, au-dessus de la tolérance d'espacement (≤ 10 %). Rapport interlignage ÷ hauteur de capitale : réf **39/22 = 1,77** ; jeu **33,33/23 = 1,45** (**−18 %**). Script `mesures/10-Q1-consequences.py`, sortie `10-Q1-sortie.txt`. | — |
| `F2` | `A01` | `MINEUR` | `INSTRUMENT NEUF` | **le libellé d'option ne se distingue plus de sa conséquence** : même graisse, même encre, même corps. Rapport **interne** (invariant d'échelle) : dans le cadre 5 l'option est 2× plus grasse que sa conséquence ; dans le jeu elles sont identiques. *Reste MINEUR* — la position (ligne courte, centrée, isolée) et l'écart vertical doublé continuent de marquer l'option comme un titre, et le CTA or « PRENDRE ACTE » reste le seul geste : le joueur lit toujours « voici les deux choses faisables, et ce que chacune coûte ». *Note* : l'écart naît en partie de l'**assumé 1** (plus de bouton par option, maquette à mettre à jour côté atelier) — un arbitrage DA est sans doute dû, pas un correctif automatique. | hampe moyenne (9 rangées de la zone d'œil, même méthode des deux côtés) — réf : option **6,84 px img**, conséquence **3,29** ⇒ rapport **0,48**. Jeu 2400 : option **3,71**, conséquence **3,89** ⇒ **1,05**. Jeu 1920 : **3,41 / 3,79** ⇒ **1,11**. Encre : option **(185, 173, 146)** = conséquence **(185, 173, 146)**. Hauteurs de capitale : « M » de l'option **22** px img, « C » de la conséquence **23** (2400) / **22** (1920). Écarts verticaux : surtitre→option **24** px img, option→conséquence **12**, interligne du paragraphe **6**. Script `mesures/10-Q1-consequences.py`. | si une graisse « demi-gras » est posée mais rendue identique par le rastériseur : la mesure voit le **rendu**, pas le réglage. Trancherait : le réglage de police du composant de libellé d'option. |
| `F3` | `E04` | `MINEUR` | `INSTRUMENT NEUF` | **hors périmètre** (vu en mesurant Q3, classe A/B « texte ») — le texte de la **fiche** est **centré** dans le jeu, **fer à gauche** dans les cadres 54-58. Les 5 cadres de référence ne montrent aucun état « aucun relais » : le témoin est donc une fiche **remplie**, pas l'état vide — l'écart peut relever d'un parti pris d'état vide. | réf cadre 54 : papier x 53..848 ; titre marge G **32** / D **58** px img ; surtitre x 88..273, marge G **35** / D **575**. Jeu (2400 **et** 1920) : papier x 108..971 ; titre marge G **87** / D **91** (centre 537,5 ≈ centre du papier 539,5) ; surtitre marge G **349** / D **347** (centre 540,5). Script `mesures/30-Q3-titre-fiche.py`, sortie `30-Q3-sortie.txt`. | aucune référence d'état « aucun relais » parmi les cadres 54-58 ⇒ je ne peux pas dire si la maquette centrerait cet état-là. Trancherait : un cadre d'atelier de l'état vide de ㉘. |

### Écarts ASSUMÉS — inventoriés, et rendus proprement ?

| # du dossier | constat mesuré | propre ? |
|---|---|---|
| **1** ④ aucun bouton par option, un seul geste | la carte ne porte qu'un geste, « PRENDRE ACTE », bouton or plein ; les deux options sont du texte. Aucun bouton fantôme, aucun reste de cadre. | **oui** |
| **2** ④ `_TeteDeuxOptions` = carte des RAPPORTS | rangées d'encre de la carte : titre (1454-1512, x 238..842) · PORTÉE/URGENCE (1547-1576) · **un** geste (1625-1716, x 40..981 = **261,7 px CSS**). **Ni** surtitre « CE QU'ON PEUT FAIRE », **ni** option, **ni** conséquence, **ni** libellé de repli. | **oui** |
| **3** ④ soulignement pointillé « proposé, non ratifié » (classe C) | référence : une bande de 3 px sous **chacune** des 4 lignes (1330-1332, 1369-1371, 1408-1410, 1447-1449) **et** sous le surtitre (1103-1104). Jeu : **aucune** bande intercalaire, aux deux résolutions — absence franche, pas de demi-trait ni de reste. | **oui** |
| **4** ㉞ geste principal éteint | encre libellé **(152, 121, 121)** et légende **(150, 122, 122)** sur fond (22, 21, 25) ⇒ **4,63:1** et **4,64:1**, au-dessus du plancher 4,5:1 de la doctrine. Texte entier, une ligne chacun, boîte intacte. *Observation non comptée* : la référence hiérarchise le libellé (7,91:1) par rapport à sa légende (4,98:1) alors que le jeu les rend **au même contraste** (4,63 vs 4,64) — cohérent avec un état désactivé qui éteint les deux, à revoir quand l'état allumé sera capturé. | **oui** |
| **5** ㉞ puces en laiton foncé | hors périmètre Q1-Q4, non mesuré. | non jugé |
| **6** ㉘ état « aucun relais » | le panneau de liège est borné, aucun cadre n'y est épinglé, la fiche porte une phrase de repli **en français** (« Aucune route tendue pour l'instant. »), pas un identifiant technique. Voir toutefois `F3` sur son alignement. | **oui** (alignement mis à part) |
| **7** valeurs du HUD d'un compte neuf | 10 000 €, Froid, JOUR 1, Aube — une valeur n'est pas une forme. | **oui** |

---

## 5. Les deux résolutions

**Les deux sont jugées, sur les quatre points.**

| point | 1080×2400 | 1080×1920 |
|---|---|---|
| **Q1** ④ | tient : 2 bandes × 4 lignes, pas 33,33 px img | **tient** : 2 bandes × 4 lignes, pas 33,33 px img, rien de coupé, le bloc complet est dans la carte (surtitre 872, dernière ligne 1084) |
| **Q2** ㉞ | bouton 988 px img, boîte y 1958..2061 | **tient** : bouton **988** px img (identique), boîte y 1478..1581 — rien de rogné, libellé et légende toujours sur une ligne |
| **Q3** ㉘ | cap 24 px img, IoU Serif Bold 0,748 | **tient** : cap **24** px img, IoU Serif Bold **0,768** — valeurs identiques, fiche entière |
| **Q4** ㉚ ㉘ ㉛ ㉞ ㉝ | hampes 7,76-8,50 | **tient** : hampes 7,87-8,63, rapports au réf 1,046-1,080 (témoin ㉝ 1,064) ; les 5 titres de bandeau sont entiers dans le cadre |

Aucun écart **propre à une résolution** sur le périmètre Q1-Q4. (Les débordements à 1920 que
`dossier.md` signale sur E05/E06/E08 sont hors périmètre et n'ont pas été cherchés.)

---

## 6. Non vérifié

1. **L'animation.** Les captures T et T+1 s ne sont pas fournies ; le dossier le pose comme non
   jugeable. Je n'ai donc pas pu dire **où tombe l'image figée** d'un balayage éventuel sur les
   parties mesurées. *Trancherait* : deux captures du même écran à T et T+1 s, ou la présence de
   `@keyframes` dans la source de la maquette.
2. **L'état ALLUMÉ du geste principal de ㉞** (assumé 4). Je n'ai que l'état éteint ; je ne peux pas
   dire si la couleur allumée rejoint l'or (217, 171, 78) du cadre 85, ni si la hiérarchie
   libellé/légende (7,91:1 vs 4,98:1 en référence) y revient. *Trancherait* : une capture de ㉞ avec
   au moins un ordre posé.
3. **La police réellement embarquée.** J'identifie famille et graisse par **appariement de forme
   contre des rendus locaux** de DejaVu, pas en lisant l'asset du client. Un faux-gras, ou une
   DejaVu Serif Condensed Bold, pourraient rendre des hampes voisines. *Trancherait* : le réglage de
   police (famille + style) du composant de titre de fiche et de titre de bandeau.
4. **La famille du titre de fiche de la RÉFÉRENCE.** L'appariement de forme y est non concluant
   (IoU ≤ 0,26 pour les 4 candidats) à cause de la rotation de +2,42° : je l'établis par la hampe
   (5,89 px img, entre Bold 5,51 et très loin de Book 2,95) et par la lecture des empattements à ×4,
   pas par le matcher. *Trancherait* : `fc-match` sur la règle CSS de `.lieg6 .fiche`.
5. **La taille du titre de bandeau sur ㉘ ㉛ ㉞ ㉝.** Seul ㉚ E03 a le **même texte** des deux côtés
   (avance 894 vs 897 px img, +0,3 %) et ancre donc la taille. Sur les quatre autres le texte diffère
   (㉘ +20,5 %, ㉛ −68,2 %, ㉞ −7,7 %, ㉝ +76,0 % d'avance) : je n'y compare que la **graisse**,
   ramenée à l'échelle. *Trancherait* : une capture d'un de ces écrans portant le texte du cadre.
6. **Les deux gestes du cadre 5 et les boutons par option** (assumé 1) : le dossier interdit
   explicitement de les rapporter — non jugés.
7. **L'état vide de référence pour ㉘** : aucun des cadres 54-58 ne le montre (54, 55 : fiches
   remplies et reliées ; 58 : polaroid de lieutenant). `F3` est donc jugé contre un témoin d'un
   **autre état** ; je le signale dans la ligne elle-même.
8. **Tout ce qui n'est pas Q1-Q4** : fonds, décor, chrome, dock, jauge, HUD, listes, gouttière,
   reste des cadres 56-57, 48-53, 67-72, 79-84, 86-91 — non ouverts, non mesurés, non jugés.

---

## Annexe — scripts

Tous dans `mesures/`, tous impriment **la taille de chaque image ouverte** (et ces tailles sont bien
celles de ce dossier : 1080×2102 pour les références, 1080×2400 / 1080×1920 pour les captures).

| script | ce qu'il mesure | sortie collée |
|---|---|---|
| `00-outils.py` | primitives communes (profils d'encre, bandes, cœur de glyphe, contraste). Aucune mesure. | — |
| `01-inventaire.py` | recalcul des 22 empreintes sha256 + taille des 54 images (contrôle négatif : aucun 900×1752) | `01-inventaire-sortie.txt` |
| `10-Q1-consequences.py` | Q1 : rectangle de carte, surtitre-ancre, structure des rangées, nombre de bandes, colonnes et centres, interlignage, hauteur de capitale et casse, couleurs, soulignement, rapport interne option/conséquence, état `_TeteDeuxOptions` | `10-Q1-sortie.txt` |
| `20-Q2-bande-basse.py` | Q2 : boîte du geste (4 captures E02 + cadre 85), largeur, marges, lignes internes, avances du libellé et de la légende, hauteur de capitale, contrastes | `20-Q2-sortie.txt` |
| `30-Q3-titre-fiche.py` | Q3 : hauteur de capitale, hampe, appariement de forme contre 4 polices locales (avec rotation pour la référence), surtitre, papier/encre, alignement (F3) | `30-Q3-sortie.txt` |
| `40-Q4-graisse-titre-bandeau.py` | Q4 : hampe moyenne du titre de bandeau sur ㉚ ㉘ ㉛ ㉞ et le témoin ㉝, aux 2 résolutions, contre DejaVu Serif Bold/Book rendus localement | `40-Q4-sortie.txt` |
