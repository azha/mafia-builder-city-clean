# Dossier du juge visuel — r4 BORNÉ de l'ENSEMBLE décoré — 2026-10-09

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-visuel/dossier-gabarit.md`. À lire EN PREMIER.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r4-2026-10-09/`
> Tu écris `rapport.md` et `mesures/` ICI. Tout chemin est ABSOLU. Les captures sont dans `captures/`, les références dans `reference/` (à côté de ce fichier).

## Ce tour est BORNÉ — il ne rejuge pas les douze écrans

Un tour d'ensemble précédent (que tu n'as pas et que tu ne cherches pas) a laissé des points ouverts. **Tu ne vérifies QUE la liste ci-dessous.** Pour chaque point : la partie en question est-elle, dans la capture, **égale à la référence** (dans la tolérance du mandat) — oui / non / non jugeable, **chiffres à l'appui**, un script par grandeur. Tout ce qui est hors liste est **hors périmètre** : ne le rapporte pas, sauf si tu le **vois** sans le chercher et que c'est un A/B manifeste (alors une ligne `MINEUR` nommée « hors périmètre »). Les MINEUR et la classe C sont consignés, pas poursuivis.

### Les points à vérifier (rien d'autre)
| id | écran(s) | quoi regarder (en px CSS / % de la largeur, jamais en px bruts d'images d'échelles différentes) |
|---|---|---|
| `P1` | ㉚ E03 · ㉘ E04 · ㉛ E05 · ㉞ E02 (㉝ E06 = témoin) | le **sous-titre du bandeau de titre** : hauteur de capitale, rapport titre/sous-titre, nombre de lignes, contre la référence de chaque écran |
| `P2` | ㉘ E04 | la **planche** qui porte la fiche : matière (grain, couleur), **encadrement** (nombre de filets), contre les cadres 54-58 |
| `P3` | ⑭ E08 | le **filet d'or pleine largeur** entre la scène et le corps : présent ? couleur, épaisseur, largeur, contre le cadre 18 |
| `P4` | ⑤ E11 | l'**eyebrow** « CE QUI PÈSE LE PLUS… » : où il se pose (sur le tapis ou sur la carte), couleur d'encre, centrage, contraste |
| `P5` | ⑤ E11 | le **liseré intérieur de la carte** : couleur et épaisseur contre le cadre 4 |
| `P6` | ㊳ E01 | la **bande du bas** du chrome (« … attend vos ordres — trancher ») : recouvre-t-elle un élément du chrome (anneau du manomètre, losange) comparé à un autre écran ? |
| `P7` | ㉞ E02 | le **geste principal** : casse, couleur, hauteur de capitale contre les cadres 85-91 ; ses **états** (allumé / éteint) |
| `P8` | ㉞ E02 | la **puce de geste** (« Poser un ordre » et sœurs) : forme, remplissage, encre, casse, lignes |
| `P9` | ㊵ E10 | le **libellé du geste** : alignement horizontal (centre de l'encre contre le centre du cadre) contre les cadres 140/141 |
| `P10` | ④ A01 | **quatre états** (voir ci-dessous) : la **ligne de file** (hauteur de carte, part de vide, taille et interlettrage de l'étiquette de gravité) contre le cadre 4 ; la **carte de tête NON-rapports** contre le cadre 5 |
| `P11` | ㉘ E04 | la police de la **fiche** « D'OÙ ÇA PART » (famille, taille) et les **rangées « LE CHEMIN… »** |
| `P12` | ⑭ E08 | le cran **« écrasante »** de la jauge de tension (il n'a aucun cadre : dis seulement s'il est rendu proprement) |
| `P13` | ㊳ E01 · ㉞ E02 | les **états éteints** (gestes mort / grisés) : lisibles et propres ? contraste ≥ 4,5:1 |
| `P14` | tous | **animation** : non jugeable (pas de captures T/T+1) — dis-le |

## Les écrans et leurs captures (33 fichiers dans `captures/`)
Deux résolutions : **1080×2400** (20:9) et **1080×1920** (art natif). `_bas` = le même écran remonté au bout de sa liste. Commit du client au moment des captures : branche `lot/mots-client-2026-10-08`, tête **`aa6f8d25`** (NON fusionnée au cumul) ; back visé : pile dev `http://localhost`. Le client déclare avoir joué ce jeu de planches ; **4 gardes de pixels du client sont rouges** sur ⑭ (filet d'or), ㉘, ⑤ (feutre 8,5 %), ⑤ (eyebrow) : ne t'y fie pas, **mesure les planches**.

| id | écran | fichiers | état |
|---|---|---|---|
| A01 | ④ | `A01_AccueilFile2Cartes_{1080x2400,1080x1920}.png` (file, raison courte) · `…_TeteRaisonLongue_…` (raison 3 lignes) · `…_TeteDeuxOptions_…` (carte des RAPPORTS : option[0] en geste, option[1] volontairement non montrée) · `…_TeteNonRapports_…` (**carte « DAMAGED_BUILDING_REPAIR » fabriquée, 2 options : c'est elle qu'on compare au cadre 5**) | 4 états × 2 résolutions |
| E01 | ㊳ Le journal | `E01_Journal_*`, `E01_Journal_bas_*` | chargé, déborde (planches `_bas`) |
| E02 | ㉞ Le carnet | `E02_Carnet_*`, `E02_Carnet_bas_*` | chargé |
| E03 | ㉚ La chaîne d'appro | `E03_Chanedappro_*` | chargé, stock à 0 |
| E04 | ㉘ La distribution | `E04_Distribution_*` | « aucun relais », AVEC le geste d'achat |
| E05 | ㉛ La loi | `E05_Loi_*` + `E05_Loi_bas_1080x1920` | chargé |
| E06 | ㉝ La démolition (témoin P1) | `E06_Dmolition_*` + `_bas_1080x1920` | rendu |
| E08 | ⑭ La semaine | `E08_Lasemaine_*` + `_bas_1080x1920` | **état VIDE** |
| E10 | ㊵ La filière | `E10_Filire_*` | chargé, aucun nœud |
| E11 | ⑤ Le détail d'une décision | `E11_DecisionDetail_*` | carte FABRIQUÉE (tactique, portée modérée, urgence faible, jeton libre) |

**Empreintes sha256 (12 premiers caractères)** — vérifie-les avant de mesurer :

      A01_AccueilFile2Cartes_1080x1920               54d32415bc2f
      A01_AccueilFile2Cartes_1080x2400               9d684464a720
      A01_AccueilFile2Cartes_TeteDeuxOptions_1080x1920 61c22d40adc7
      A01_AccueilFile2Cartes_TeteDeuxOptions_1080x2400 54f7a48092fc
      A01_AccueilFile2Cartes_TeteNonRapports_1080x1920 b52b2e76e095
      A01_AccueilFile2Cartes_TeteNonRapports_1080x2400 7bbca2203b01
      A01_AccueilFile2Cartes_TeteRaisonLongue_1080x1920 beb14c00ab64
      A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400 2c385c46cdb5
      E01_Journal_1080x1920                          d2ecd89cd491
      E01_Journal_1080x2400                          bdd1611bb59c
      E01_Journal_bas_1080x1920                      52403b42fb16
      E01_Journal_bas_1080x2400                      ae3bd7a5f242
      E02_Carnet_1080x1920                           930d9059fed8
      E02_Carnet_1080x2400                           13de20f78a75
      E02_Carnet_bas_1080x1920                       a7de6d521eb4
      E02_Carnet_bas_1080x2400                       45959a90f17e
      E03_Chanedappro_1080x1920                      74b5186d191a
      E03_Chanedappro_1080x2400                      6030ad262b04
      E04_Distribution_1080x1920                     c0f2ab17f1ed
      E04_Distribution_1080x2400                     67c3dd012ffe
      E05_Loi_1080x1920                              4ba05417d31d
      E05_Loi_1080x2400                              52f7afa9f99d
      E05_Loi_bas_1080x1920                          07a6ea0e3a4a
      E06_Dmolition_1080x1920                        3bf279d99163
      E06_Dmolition_1080x2400                        5b6538449adb
      E06_Dmolition_bas_1080x1920                    7e636f0c3674
      E08_Lasemaine_1080x1920                        de31c16b1a57
      E08_Lasemaine_1080x2400                        3bcb07477e63
      E08_Lasemaine_bas_1080x1920                    825ecafc44a1
      E10_Filire_1080x1920                           2287739205bb
      E10_Filire_1080x2400                           6b31161ba245
      E11_DecisionDetail_1080x1920                   067d6a2c56ac
      E11_DecisionDetail_1080x2400                   866d416afabb

## Référence (fait autorité : l'IMAGE) — `reference/`, 48 PNG, tous 1080×2102 à ×3,6
Séries : atelier `master` `4bd3ea2` ; série 6 de `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` (index à partir de **0**, le nom de fichier porte l'index), accueil de `ecrans-brennar-accueil.html`.
| écran | fichiers | cadres |
|---|---|---|
| A01 ④ | `A01-cadre-4-la-suite.png` · `A01-cadre-5-tete-sur-ligne-haute.png` | 4 = la file ; **5 = la carte de tête NON-rapports au-dessus d'une ligne de file haute** (re-rendus 08/10 depuis l'atelier : les anciens étaient périmés) |
| E01 ㊳ | `E01-cadre-125…130`, `E01-cadre-145-vocabulaire` | nominal 125 |
| E02 ㉞ | `E02-cadre-85…91` | nominal 85 ; 88-91 = « REJOUER », « VOUS Y ÉTIEZ »… |
| E03 ㉚ | `E03-cadre-48…53` | nominal 48 |
| E04 ㉘ | `E04-cadre-54…58` | **du kraft**, 5 cadres ; l'état capturé « aucun relais » n'a aucun cadre |
| E05 ㉛ | `E05-cadre-67…72` | nominal 67 |
| E06 ㉝ | `E06-cadre-79…84` | témoin |
| E08 ⑭ | `E08-cadre-14…19` | **état vide ⇒ cadre 18 « au calme »** ; la jauge est dessinée dans 14-19, mais le cran « écrasante » n'a aucun cadre |
| E10 ㊵ | `E10-cadre-140`, `141` | état vide ⇒ 140 (frère 141) |
| E11 ⑤ | `E11-cadre-04-la-carte-distribuee.png` | série 6 (pas la série 4) |

## Échelle — OBLIGATOIRE, jamais déduite par le juge

Trois nombres, toujours les trois :

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE (les 48 de `reference/`) | 1080 | 300 | **×3,6** |
| CAPTURE (les 33 de ce tour) | 1080 | 300 (le canvas de 1280 u est rendu sur 1080 px) | **×3,6** |
| | | **rapport capture ÷ référence** | **1,000 en X** |

- Ce rapport de 1,000 est **NORMAL**, et **toute mesure se ramène en px CSS avant de conclure**
  (1 px CSS = 3,6 px d'image, **des deux côtés**).
- ✅ **Il n'y a AUCUNE référence à 900×1752 (×3,0) dans ce dossier** — vérifié fichier par fichier. Si
  tu ouvres une image qui ne fait pas 1080×2102, c'est qu'elle vient d'ailleurs : ne l'utilise pas.
- **En Y, il n'y a PAS de rapport** : les références sont un gabarit de **2102** px, les captures font
  **2400** ou **1920**. Comparer en **% de la hauteur utile** ou sur des grandeurs invariantes
  (épaisseur de filet, hauteur de capitale, largeur de colonne) — **jamais** en px Y absolus. C'est
  d'ailleurs ce que ce juge d'ensemble regarde : **1920 n'est pas 2400 avec moins de place**, c'est une
  autre lecture — et c'est là que les débordements mordent (E05, E06, E08 débordent à 1920 et pas à
  2400).
- ⚠️ Ce que la normalisation **NE couvre pas** : les rapports **INTERNES** (un bloc deux fois trop
  haut par rapport à son voisin) sont **invariants d'échelle** et restent des **défauts réels**.
- ⚠️ Le pire faux écart est celui qui est chiffré, reproductible, et **entièrement dû à l'instrument**.

## Polices — ce qui a RÉELLEMENT rendu

Piles `font-family` **calculées** (Chromium, éléments porteurs de texte) sur les cadres de référence
de la série 6 et de la page d'accueil, mesurées le 2026-10-08 sur ces mêmes pages (atelier `4bd3ea2`) :

      "DejaVu Sans"                               le gros du corps de texte
      "DejaVu Serif"                              titres et chiffres sérif
      Georgia, serif                              3 éléments par cadre — chrome du HUD
      "Segoe UI", Roboto, system-ui, sans-serif   3 éléments par cadre — chrome du HUD
      "Courier New", monospace                    quelques étiquettes techniques

`fc-match` **relancé le 2026-10-08** sur la machine qui a rendu les PNG, famille par famille :

      DejaVu Sans       →  DejaVuSans.ttf: "DejaVu Sans" "Book"
      DejaVu Serif      →  DejaVuSerif.ttf: "DejaVu Serif" "Book"
      Georgia           →  NotoSerif-Regular.ttf: "Noto Serif" "Regular"
      serif             →  NotoSerif-Regular.ttf: "Noto Serif" "Regular"
      Segoe UI          →  NotoSans-Regular.ttf: "Noto Sans" "Regular"
      Roboto            →  NotoSans-Regular.ttf: "Noto Sans" "Regular"
      system-ui         →  NotoSans-Regular.ttf: "Noto Sans" "Regular"
      sans-serif        →  NotoSans-Regular.ttf: "Noto Sans" "Regular"
      Courier New       →  LiberationMono-Regular.ttf: "Liberation Mono" "Regular"
      monospace         →  DejaVuSansMono.ttf: "DejaVu Sans Mono" "Book"

Le client embarque **DejaVu Sans** et **DejaVu Serif**.
⇒ **« Georgia », « Segoe UI », « Courier New » n'existent pas sur cette machine** : les références les
montrent en **Noto Serif**, **Noto Sans**, **Liberation Mono**. Un écart de **FAMILLE** sur ces
éléments-là est un **ARBITRAGE de substitution**, jamais un défaut du client. Sur tout le reste
(`DejaVu Sans` / `DejaVu Serif`), maquette et jeu ont la **même** fonte : là, un écart de police EST
un écart.

## Règles de doctrine applicables

- **gouttière** : le contenu d'écran reste dans le rect du fond ; seul le chrome (bandeau haut, dock
  bas) traverse. **C'est une règle d'ensemble** : la même gouttière sur les douze.
- **contraste** : ≥ 3:1 grands textes, ≥ 4,5:1 petits — sur l'art réel, pas un gris choisi. L'atelier
  tient une garde de contraste à 4,5:1 sur les 152 cadres de la série 6 (master `4bd3ea2`) : les
  maquettes sont au vert, **donc un texte sous le seuil dans le JEU est un écart**.
- **langue affichée** : **français**, via résolveurs nommés — aucun enum brut, aucun identifiant
  technique, aucun texte anglais à l'écran.
- **safe area / portrait** : le projet est configuré **portrait seul**.
- **espace de couleur** : le client compose en **linéaire**, les maquettes en **sRGB**. Une opacité CSS
  se **convertit**, elle ne se recopie pas. Un écart de teinte sur un élément translucide se mesure
  sur la **couleur composée**.
- **animation** : voulue sur les écrans neufs (ruling user 2026-08-27, version du SOIR) ; un pixel qui bouge n'est pas un écart ; la capture est figée à t=0 ; seul compte où tombe l'image figée. Les captures T et T+1 s ne sont PAS fournies : l'animation est « non vérifié ».

## Écarts ASSUMÉS (inventorie, classe ASSUMÉ, dis s'ils sont rendus proprement)
| # | écran | écart | raison |
|---|---|---|---|
| 1 | ㉘ | état « aucun relais » (aucun cadre) : panneau de liège borné « D'OÙ ÇA PART » ; le geste « ACHETER UN RELAIS » **est présent** dans cet état ; la voix en pied est masquée ; sous-titre 2→1 phrase au chargement (non vérifiable) | un compte neuf n'a pas de hub de distribution |
| 2 | ㊳ | compteur « en cours » à 00 ; noms de journaux servis en FRANÇAIS (pas un trou) ; l'étiquette d'angle **est** servie ; trois titres de une sur le même sujet = contenu servi | compte neuf ; contenu servi |
| 3 | ⑭ | état VIDE (cadre 18) ; deux libellés de jauge en repli sur un littéral (clés non servies) : leur forme se juge, pas leur présence | compte neuf ; clés demandées au back |
| 4 | ⑤ | carte FABRIQUÉE ; geste « passer » RETIRÉ exprès (aucune conséquence servie) | décision f2 08/10 |
| 5 | ㊵ | aucun nœud : panneau « en trou » = parti pris des cadres 140/141 | compte neuf |
| 6 | ④ | `_TeteDeuxOptions` = carte des RAPPORTS : option[0] en geste « Lire maintenant », option[1] et conséquences volontairement NON montrées ; le soulignement pointillé de la référence est « proposé, non ratifié » (classe C, non appliqué) | décisions f2 08/10 |
| 7 | tous | valeurs du HUD d'un compte neuf (10 000 €, Froid, JOUR 1, Aube) | une valeur n'est pas une forme |
| 8 | ㉞ ㉝ ㉛ ㉘ | voix en pied absente (㉛ aucune réplique servie ; ㉝ état « light » ; ㉞ phrase servie non lue) | dettes TD-823 / TD-882 |
| 9 | ㊳ | le **toast** canonique (bande éphémère de 5 s) est effacé avant chaque cliché : à t=0 il n'est pas à l'image | position du client à vérifier : la bande basse ne doit rien recouvrir |
| 10 | ㉞ | le geste principal est dans son **état éteint** ; sa couleur est celle de l'état éteint, l'or n'étant que l'état allumé | position du client à vérifier (P7 : forme et casse se jugent) |
| 11 | ㉞ | l'encre des puces de geste est en **laiton foncé** (contraste ~4,8:1) au lieu de l'or (1,6:1 sur le papier) | choix de lisibilité du client ; vérifie le contraste réel et le rendu |
⚠️ Un assumé rendu SALEMENT reste un défaut. Cette table est incomplète par construction.

## Format du RAPPORT — imposé, parce que le compte n'est pas défini sans lui

⛔ **Le juge choisit ses catégories et ses instruments ; il ne choisit pas la forme de son verdict.**
Mesuré sur cinq tours d'un même écran : recompter les MÊMES rapports de deux façons légitimes rend
`r3=8 · r4=4` d'un côté et `r3=6 · r4=7` de l'autre — **les deux méthodes s'inversent**. Le
NUMÉRATEUR n'est pas défini tant que la forme varie d'un juge à l'autre.

**Un finding par ligne, dans UNE table, et rien de compté ailleurs :**

| id | écran | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `A01`\|`E01`…`E11`\|**`ENSEMBLE`** | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DOCTRINE` \| **`INSTRUMENT NEUF`** | <l'écart> | <les nombres> | <ou vide> |

- **écran** : la valeur **`ENSEMBLE`** est celle d'un écart de **cohérence** : un trait partagé par
  plusieurs écrans. ⇒ Un défaut commun s'écrit **UNE** fois en `ENSEMBLE` **en nommant les écrans
  touchés**, jamais douze fois.
- **gravité** : liste **fermée** — trois valeurs, pas de synonyme, pas de nuance en prose.
- **critère** : tu n'as **pas** accès au tour précédent (c'est volontaire), donc la colonne se remplit
  depuis **ce** dossier : `DOCTRINE` quand l'écart tombe sous une règle écrite en « Règles de doctrine
  applicables » ; `INSTRUMENT NEUF` quand la grandeur vient d'un instrument que **tu** as construit.
  *Un élargissement du critère doit se lire comme tel, jamais se déguiser en régression — ni en
  progrès.*
- ⛔ **Ne PAS geler le jeu d'instruments pour rendre le compte comparable.** Le tour qui a trouvé le
  seul BLOQUANT d'une série de cinq (un trou noir occupant **54,7 %** d'un panneau) est **exactement**
  celui où le jeu est passé de 17 à 18 instruments. ***Optimiser la lisibilité d'une tendance au
  détriment de ce qu'elle mesure, c'est fabriquer une bonne courbe sur un mauvais écran.*** On gèle la
  FORME, jamais la portée.
- ⚠️ **Le résumé rendu à l'orchestrateur n'est pas une mesure du rapport** : deux résumés d'une même
  série annonçaient 6 et 3 majeurs là où leurs rapports en portent 8 et 8. **Le compte se prend dans
  la table.**

**Classement A / B / C** (ruling user 07/10, en vigueur) :
- **A / B** — fond, matière, élément absent, texte, geste, lisibilité : **remontés pleinement**.
- **C** — pixel, nuance, demi-px : **consignés**, ni correctif ni tour de juge. `MINEUR`, et **écris
  « classe C »** dans la colonne écart.

**Contrôles de forme attendus** : le rapport **s'ouvre sur un contrôle positif** (ce que l'instrument
trouve ÉGAL — sans lui, un instrument qui rendrait tout faux passerait pour sévère) ; chaque écart
chiffré pointe un script dans `mesures/` (à créer dans **ce** répertoire) qui **imprime la taille des
images lues**, et ces tailles sont celles de ce dossier ; la section « non vérifié » existe et n'est
pas vide (ou dit « rien » avec sa raison) ; **les deux résolutions sont jugées**, ou le rapport dit
laquelle ne l'a pas été et pourquoi.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- le code du client (`Assets/Scripts`) et ses tests ; les notes d'implémentation ;
- **tout rapport ou dossier de juge précédent**, et les nombres qu'ils portaient : n'ouvre aucun autre répertoire sous `Tools/juge-visuel/` que celui-ci ;
- les planches `E07`, `E09`, `E12_*` et toute autre planche : hors périmètre ;
- les captures T / T+1 s.
