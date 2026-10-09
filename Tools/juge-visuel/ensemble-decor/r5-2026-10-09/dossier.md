# Dossier du juge visuel — r5 BORNÉ de l'ENSEMBLE décoré (dernier tour avant clôture) — 2026-10-09

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-visuel/dossier-gabarit.md`. À lire EN PREMIER.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r5-2026-10-09/`
> Tu écris `rapport.md` et `mesures/` ICI. Captures : `captures/` ; références : `reference/` (à côté de ce fichier). Tous les chemins sont ABSOLUS.

## Ce tour est BORNÉ à QUATRE points — il ne rejuge rien d'autre
Des tours précédents (que tu n'as pas et que tu ne cherches pas) ont laissé des points ouverts. **Tu ne vérifies QUE la liste ci-dessous.** Pour chaque point : la partie est-elle, dans la capture, **égale à la référence** (tolérances du mandat) — oui / non / non jugeable, **chiffres à l'appui**, un script par grandeur, contrôle positif et négatif. Hors liste ⇒ hors périmètre : ne le rapporte que si tu le **vois** sans le chercher et que c'est un A/B manifeste (une ligne `MINEUR` nommée « hors périmètre »). MINEUR et classe C sont consignés.

### Les points à vérifier
| id | écran(s) | quoi regarder (en px CSS / % de largeur ; jamais en px bruts d'échelles différentes) |
|---|---|---|
| `Q1` | ④ A01, état `_TeteNonRapports` (carte DAMAGED_BUILDING_REPAIR fabriquée, 2 options) | sous **chaque** option, une ligne/bande de **conséquence** ? Sa position, sa casse, sa couleur, sa hauteur de capitale, le nombre de bandes, contre le cadre 5. (Les **deux gestes** du cadre 5 sont ASSUMÉS absents — voir assumé 1 — ne les rapporte pas.) L'état `_TeteDeuxOptions` (carte des RAPPORTS) est volontairement sans conséquences : vérifie seulement qu'il est propre. |
| `Q2` | ㉞ E02 (état éteint du geste, assumé) | le **libellé du geste principal** et sa **légende** : une ligne chacun ? **La bande basse** (bouton + légende) : largeur du bouton et marges latérales contre le cadre 85 (bouton plein, marges en css). |
| `Q3` | ㉘ E04 | la **famille** (empattement ou non), la **graisse** et la **taille** du titre de la **fiche** « D'OÙ ÇA PART », contre les cadres 54-58 |
| `Q4` | ㉚ E03 · ㉘ E04 · ㉛ E05 · ㉞ E02 (㉝ E06 = témoin) | la **graisse du TITRE du bandeau de titre** (épaisseur des hampes ramenée à l'échelle ; la même mesure sur ㉝ sert de contrôle) |

## Captures — 22 fichiers dans `captures/` (UN seul jeu, un seul run, un seul code)
Deux résolutions : **1080×2400** (20:9) et **1080×1920**. Code : tête du cumul client **`fe6f571e`** (= branche `lot/mots-client-2026-10-08` @ `4d760e8d`, code identique). Pile dev `http://localhost`. Les planches `_bas` sont le même écran remonté au bout de sa liste.
| id | écran | fichiers | état |
|---|---|---|---|
| A01 | ④ | `A01_AccueilFile2Cartes_{…}` : file (raison courte), `_TeteRaisonLongue`, `_TeteDeuxOptions` (carte des RAPPORTS), `_TeteNonRapports` (**carte à comparer au cadre 5**) | 4 états × 2 résolutions |
| E02 | ㉞ Le carnet | `E02_Carnet_*`, `E02_Carnet_bas_*` | chargé ; geste principal ÉTEINT |
| E03 | ㉚ | `E03_Chanedappro_*` | chargé |
| E04 | ㉘ | `E04_Distribution_*` | « aucun relais », avec le geste d'achat |
| E05 | ㉛ | `E05_Loi_*` + `E05_Loi_bas_1080x1920` | chargé |
| E06 | ㉝ (témoin Q4) | `E06_Dmolition_*` + `_bas_1080x1920` | rendu |

**Empreintes sha256 (12 premiers caractères)** — vérifie-les avant de mesurer :

      A01_AccueilFile2Cartes_1080x1920               63a5cfc21fa5
      A01_AccueilFile2Cartes_1080x2400               250e77b16129
      A01_AccueilFile2Cartes_TeteDeuxOptions_1080x1920 bee22ffdb100
      A01_AccueilFile2Cartes_TeteDeuxOptions_1080x2400 5b8a7eb06382
      A01_AccueilFile2Cartes_TeteNonRapports_1080x1920 6a83e8da9a1d
      A01_AccueilFile2Cartes_TeteNonRapports_1080x2400 5cf8817bf4e3
      A01_AccueilFile2Cartes_TeteRaisonLongue_1080x1920 967f67cbf6cf
      A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400 8f32c8a968fa
      E02_Carnet_1080x1920                           80f77dab5d2f
      E02_Carnet_1080x2400                           e8033be20ee1
      E02_Carnet_bas_1080x1920                       737a0d794ad5
      E02_Carnet_bas_1080x2400                       435307ab3857
      E03_Chanedappro_1080x1920                      24785246bf8c
      E03_Chanedappro_1080x2400                      ce199f0e4fb4
      E04_Distribution_1080x1920                     9d6f4205341d
      E04_Distribution_1080x2400                     dcdd3f94228b
      E05_Loi_1080x1920                              35e7708aaaf8
      E05_Loi_1080x2400                              813b79f2f374
      E05_Loi_bas_1080x1920                          027fef5be10e
      E06_Dmolition_1080x1920                        4ad4d42bda5c
      E06_Dmolition_1080x2400                        65b7d5a24181
      E06_Dmolition_bas_1080x1920                    f224cfda995b

## Référence (fait autorité : l'IMAGE) — `reference/`, 32 PNG, tous 1080×2102 à ×3,6
Atelier `master` `4bd3ea2`. Série 6 : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` (index à partir de **0**, le nom de fichier porte l'index) ; accueil : `ecrans-brennar-accueil.html`.
| écran | fichiers | cadres |
|---|---|---|
| A01 ④ | `A01-cadre-4-la-suite.png` · `A01-cadre-5-tete-sur-ligne-haute.png` | **5 = la carte de tête NON-rapports** |
| E02 ㉞ | `E02-cadre-85…91` | nominal 85 |
| E03 ㉚ | `E03-cadre-48…53` | nominal 48 |
| E04 ㉘ | `E04-cadre-54…58` | kraft, 5 cadres |
| E05 ㉛ | `E05-cadre-67…72` | nominal 67 |
| E06 ㉝ | `E06-cadre-79…84` | témoin |

## Échelle — OBLIGATOIRE, jamais déduite par le juge

Trois nombres, toujours les trois :

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE (les 32 de `reference/`) | 1080 | 300 | **×3,6** |
| CAPTURE (les 22 de ce tour) | 1080 | 300 (le canvas de 1280 u est rendu sur 1080 px) | **×3,6** |
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
| 1 | ④ | la carte de tête n'a **aucun bouton par option** : les options sont du TEXTE descriptif et il n'y a qu'**un geste** (« PRENDRE ACTE » ou « Lire maintenant » pour la carte des rapports) ; les **deux gestes** du cadre 5 sont absents | décision f2 du 08-09/10 (la décision du jour n'a pas d'effet par option servi par le back, TD-724) ; la maquette est à mettre à jour côté atelier |
| 2 | ④ | `_TeteDeuxOptions` = carte des RAPPORTS : option[0] en geste, option[1] et conséquences non montrées | décision f2 |
| 3 | ④ | le soulignement pointillé de la référence est « proposé, non ratifié » | classe C |
| 4 | ㉞ | le geste principal est dans son **état éteint** (l'état allumé n'est pas rendu) ; sa couleur est celle de l'état éteint | assumé par le client |
| 5 | ㉞ | l'encre des puces est en laiton foncé (contraste ~4,8:1) au lieu de l'or | choix de lisibilité (l'or fait 1,6:1 sur le papier) |
| 6 | ㉘ | état « aucun relais » (aucun cadre) ; panneau de liège borné ; voix en pied masquée | un compte neuf n'a pas de hub |
| 7 | tous | valeurs du HUD d'un compte neuf (10 000 €, Froid, JOUR 1, Aube) | une valeur n'est pas une forme |
⚠️ Un assumé rendu SALEMENT reste un défaut.

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
- le code du client et ses tests ; les notes d'implémentation ;
- **tout rapport ou dossier de juge précédent**, et leurs nombres : n'ouvre aucun autre répertoire sous `Tools/juge-visuel/` que celui-ci ;
- toute autre planche ; les captures T / T+1 s (animation : non jugeable).
