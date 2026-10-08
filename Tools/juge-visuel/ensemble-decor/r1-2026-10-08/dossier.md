# Dossier du juge visuel — JUGE D'ENSEMBLE du décor (E01-E11 + A01) — r1 — 2026-10-08

> Rempli par l'orchestrateur depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back).
> À lire EN PREMIER. Tout chemin est ABSOLU. Ce qui ne peut pas être rempli est dit « non fourni »
> avec sa raison — rien n'a été supprimé du gabarit.

## Ce tour n'est pas un juge d'écran — c'est un juge d'ENSEMBLE

On ne te demande pas de refaire douze tours d'écran. On te demande **une seule chose en plus** :
est-ce que ces douze écrans, **mis côte à côte**, se tiennent comme **un seul jeu** ?

1. **La COHÉRENCE d'abord.** Le chrome (bandeau haut, manomètre, dock), le fond de scène, la matière
   des panneaux, les filets, l'or, l'encre, l'interlettrage des capitales, la grille et les marges,
   le rythme vertical, la voix des libellés : **les mêmes partout, ou pas ?** Un écran qui s'écarte
   des onze autres est un écart **même si, seul, il ressemble à sa maquette**. Inversement, un trait
   que **tous** partagent et qui s'écarte des maquettes est **un** écart, pas douze.
2. **Puis les écarts A / B par écran**, contre la maquette de cet écran : **fond, matière, élément
   absent, texte, geste, lisibilité**. Rien d'autre.
3. **La classe C** — pixel, demi-px d'espacement, nuance de teinte — est **CONSIGNÉE et c'est tout**
   (ruling user 07/10). Pas de correctif, pas de plaidoyer, pas de tour de juge dessus. Mets-la en
   `MINEUR` et **écris « classe C »** dans la colonne écart.

## Les écrans et leurs captures

Toutes les captures sont dans **un seul répertoire** :
`/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-mots/`

Lis d'abord son `LISEZMOI.md` et son **`journal.tsv`** : le journal porte, par écran, **l'état
réellement capturé** et, quand une liste déborde, **de combien** — c'est l'instrument, pas une
glose. **34 fichiers** de capture concernent ce tour (les 6 fichiers `E12_Dossier_*` sont ceux d'un
AUTRE juge, en cours : **ne les juge pas**).

Deux résolutions pour tout le monde : **1080×2400** (20:9, le téléphone visé) et **1080×1920**
(l'art natif). Une planche **`_bas`** existe quand la liste déborde : c'est **le même écran remonté
jusqu'au bout de sa liste**, pas un autre état — et le journal dit de combien ça déborde.

| # | écran | captures (noms de fichier dans le répertoire ci-dessus) | état réellement capturé (journal) |
|---|---|---|---|
| A01 | **④ L'ouverture / Accueil** — ce qu'il y a à trancher ce matin, et ce qui attend derrière | `A01_AccueilFile2Cartes_1080x2400.png`, `_1080x1920.png`, `A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400.png`, `_1080x1920.png` | deux variantes : **file à 2 cartes / raison COURTE** (la raison tient sur 2 lignes), et **tête / raison LONGUE** (3 lignes). Le journal donne pour chacune la hauteur de ligne en u, la colonne voulue, le texte exact de la raison et l'écart à la marge |
| E01 | **㊳ Le journal** — prendre la température de la ville au matin (ce qui fait la une, ce qui se dit dans la rue, ce qui est en cours) et décider d'y prêter attention | `E01_Journal_1080x2400.png`, `_1080x1920.png`, `E01_Journal_bas_1080x2400.png`, `_1080x1920.png` | chargé. **Déborde** : 3190,6 u à 2400 · 3640,5 u à 1920 ⇒ planches `_bas` |
| E02 | **㉞ Le carnet / Les ordres du soir** | `E02_Carnet_1080x2400.png`, `_1080x1920.png`, `E02_Carnet_bas_1080x2400.png`, `_1080x1920.png` | chargé. Déborde de 315,2 u (2400) · 765,1 u (1920) ⇒ `_bas` |
| E03 | **㉚ La chaîne d'appro** — savoir où en est la matière première d'un labo (ce qu'il en reste, ce que ça coûte, de quelle humeur est le fournisseur) et en commander | `E03_Chanedappro_1080x2400.png`, `_1080x1920.png` | chargé, stock à 0. **Tout tient** aux deux résolutions |
| E04 | **㉘ La distribution** — décider d'où part la marchandise, où elle va, par quel chemin, et l'envoyer | `E04_Distribution_1080x2400.png`, `_1080x1920.png` | **ÉTAT D'ERREUR** (voir écarts assumés). Tout tient |
| E05 | **㉛ La loi** — quand la police tient quelqu'un à vous, décider qui le défend, en sachant ce que chaque choix coûte | `E05_Loi_1080x2400.png`, `_1080x1920.png`, `E05_Loi_bas_1080x1920.png` | chargé. Tout tient à **2400** ; déborde de 323,3 u à **1920** ⇒ `_bas` **à 1920 seulement** |
| E06 | **㉝ La démolition** — voir ce que l'accumulation de bâtiments coûte (la friction) et décider d'en raser un | `E06_Dmolition_1080x2400.png`, `_1080x1920.png`, `E06_Dmolition_bas_1080x1920.png` | rendu, friction 0. Tout tient à **2400** ; déborde de 59,5 u à **1920** ⇒ `_bas` **à 1920 seulement** |
| E07 | **㉓ La boutique / La vitrine** — le catalogue, le solde, l'achat, les entitlements, la restauration | `E07_Boutique_1080x2400.png`, `_1080x1920.png`, `E07_Boutique_bas_1080x2400.png`, `_1080x1920.png` | rendu. Déborde de 1125,1 u (2400) · 1575 u (1920) ⇒ `_bas` |
| E08 | **⑭ La semaine** — le tableau des problèmes de la semaine de compression, les décisions, le report | `E08_Lasemaine_1080x2400.png`, `_1080x1920.png` | **état VIDE**. Tout tient |
| E09 | **⑮ Les inspections** — la file d'inspection, la lecture payante, le dépôt de rapport | `E09_Inspections_1080x2400.png`, `_1080x1920.png` | **état VIDE**. Tout tient |
| E10 | **㊵ La filière** — voir où en est chaque étape de la filière de blanchiment, et y faire passer l'argent de la planque | `E10_Filire_1080x2400.png`, `_1080x1920.png` | chargé, aucune filière (aucun nœud) — l'état d'un compte neuf. Tout tient |
| E11 | **⑤ Le détail d'une décision** — lire le détail de LA carte à fort levier du jour (ce qu'elle coûte, ce qu'elle change) et la trancher ou la passer | `E11_DecisionDetail_1080x2400.png`, `_1080x1920.png` | carte **FABRIQUÉE** (voir écarts assumés) : tactique, portée modérée, urgence faible, jeton libre |

**Chemin joueur** : A01 est l'écran d'ouverture (après `session/open`) ; E11 s'ouvre **en
surimpression** depuis l'Accueil (toucher la carte à fort levier) ; **tous les autres** passent par
l'onglet **PLUS** puis le nom de l'écran dans le menu.

## Référence (fait autorité : l'IMAGE) — une par écran, toutes DÉJÀ rendues et ratifiées

**Rien de ce qui suit n'a été re-rendu pour ce tour**, sauf la ligne marquée ⬥. Chemins absolus,
racine `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/`.

| écran | référence NOMINALE (fait autorité) | taille | facteur | cadre, page de l'atelier |
|---|---|---|---|---|
| A01 | `04-accueil/r2-2026-10-07/reference/cadre-4-la-suite.png` | 1080×2102 | **×3,6** | cadre **4**, `ecrans-brennar-accueil.html` |
| A01 ⬥ | `ensemble-decor/r1-2026-10-08/reference/cadre-5-tete-sur-ligne-haute.png` (`sha256:769e3c4e58a5…`) — **la maquette de la carte de TÊTE au-dessus d'une ligne de file haute** : c'est elle qui juge la variante `TeteRaisonLongue` | 1080×2102 | **×3,6** | cadre **5**, `ecrans-brennar-accueil.html` |
| E01 | `screen_c1/reference-1080x2102.png` | 1080×2102 | **×3,6** | cadre **125**, `ecrans-brennar-6.html` |
| E02 | `carnet/reference-1080x2102.png` | 1080×2102 | **×3,6** | cadres **85-91** |
| E03 | `ecran_appro/reference-1080x2102.png` | 1080×2102 | **×3,6** | cadre **48** (« Commander — et il n'y a plus rien ») |
| E04 | `ecran_distribution/reference-1080x2102.png` | 1080×2102 | **×3,6** | cadres **54-58** |
| E05 | `ecran_loi/reference-1080x2102.png` | 1080×2102 | **×3,6** | cadre **67** |
| E06 | `ecran_demolition/reference-1080x2102.png` | 1080×2102 | **×3,6** | cadres **79-84** |
| E07 | `compte/reference-㉓-1080x2102.png` | 1080×2102 | **×3,6** | cadres **98-100** |
| E08 | `compression/reference-1080x2102.png` | 1080×2102 | **×3,6** | cadre **NOMINAL 25**, `ecrans-brennar-4.html` |
| E09 | `police/reference-⑮-1080x2102.png` | 1080×2102 | **×3,6** | cadres **31-35** |
| E10 | `screen_c2/reference-1080x2102.png` | 1080×2102 | **×3,6** | cadres **137-142** |
| E11 | `decision-du-jour/reference-1080x2102.png` | 1080×2102 | **×3,6** | cadre **nominal 4**, `ecrans-brennar-4.html` |

⬥ **La seule référence rendue pour ce tour** : cadre 5 de `ecrans-brennar-accueil.html`. Aucun PNG
n'en existait, alors que la **nouvelle carte de tête** est reconstruite d'après lui. Rendu le
2026-10-08, atelier `master` **`4bd3ea2`**, par
`python3 Tools/rendre-tel.py /home/erutheone/project/atelier3d-mafia/ecrans-brennar-accueil.html 5 <sortie>.png 3.6`
(Chrome sans tête, fenêtre 1368×2394 puis recadrage ; « ✅ non rogné » ; sortie 1080×2102, 39 % de
pixels non noirs). **Déterminisme vérifié : 0 px différent** entre deux rendus successifs.

### Références d'ÉTAT — en plus de la nominale, quand l'état capturé n'est pas le nominal

⚠️ **LIS LA COLONNE « facteur ». Elles ne sont PAS toutes à la même échelle.**

| écran | références d'état disponibles | taille | facteur |
|---|---|---|---|
| E01 | `screen_c1/r-groupe-2026-10-07/ref/cadre-125.png` … `cadre-130.png` ; `cadre-145.png` (**le VOCABULAIRE** du journal) ; et `screen_c1/reference-vocabulaire-1080x2102.png` | 1080×2102 | ×3,6 |
| E02 | `carnet/r-groupe-2026-10-07/ref/cadre-85.png` … `cadre-91.png` | 1080×2102 | ×3,6 |
| E03 | `ecran_appro/r-groupe-2026-10-07/ref/cadre-48.png` … `cadre-53.png` (49 « en route », 50-52 « ça coince », 53 « délégué ») | 1080×2102 | ×3,6 |
| E04 | `ecran_distribution/r-groupe-2026-10-07/ref/cadre-54.png` … `cadre-58.png` | 1080×2102 | ×3,6 |
| E05 | `ecran_loi/reference-avocat-1080x2102.png` (**cadre 68**) ; `ecran_loi/r-groupe-2026-10-07/ref/cadre-67.png` … `cadre-72.png` | 1080×2102 | ×3,6 |
| E07 | `compte/reference-㉓-99-caisse-1080x2102.png`, `compte/reference-㉓-100-zero-mark-1080x2102.png` | 1080×2102 | ×3,6 |
| E09 | `police/r2-⑮-2026-09-22/etats/cadre-31-tableau.png`, `cadre-33-signalement.png`, `cadre-34-retour-de-baton.png`, `cadre-35-lots-back.png` | 1080×2102 | ×3,6 |
| E08 | `compression/v4-25.png` … `v4-30.png` (états 25-30 de `ecrans-brennar-4.html` ; **« au calme » = cadre 29**) | **900×1752** | **×3,0** |
| E11 | `decision-du-jour/v4-4.png` … `v4-8.png` | **900×1752** | **×3,0** |
| E07 | `compte/r2-㉓-2026-09-22/etats/boutique-canon.png`, `profil-canon.png`, `reglages-canon.png`, `tutoriel-canon.png`, `tutoriel-vide.png` | **900×1752** | **×3,0** |
| E08 | `compression/r2-2026-09-22/etats/ecran-canon.png`, `ecran-canon-vide.png` | **900×1752** | **×3,0** |
| E09 | `police/r2-⑮-2026-09-22/etats/inspections-canon.png`, `inspections-vide.png` | **900×1752** | **×3,0** |

⛔ **Les références à 900×1752 sont à ×3,0, pas à ×3,6.** Une mesure prise dessus et comparée telle
quelle à une capture 1080 rend **« tout est 20 % trop grand », avec des mesures exactes** — et le
tour est perdu. Ramène en px CSS : **÷3,0** pour celles-là, **÷3,6** pour les 1080×2102 **et pour les
captures**.

## Échelle — OBLIGATOIRE, jamais déduite par le juge

Trois nombres, toujours les trois :

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE nominale (toutes, 1080×2102) | 1080 | 300 | **×3,6** |
| RÉFÉRENCE d'état à 900×1752 (liste ci-dessus) | 900 | 300 | **×3,0** |
| CAPTURE (toutes, 1080 de large) | 1080 | 300 (le canvas de 1280 u est rendu sur 1080 px) | **×3,6** |
| | | **rapport capture ÷ référence nominale** | **1,000 en X** |

- Ce rapport de 1,000 est **NORMAL**, et **toute mesure se ramène en px CSS avant de conclure**.
- **En Y, il n'y a PAS de rapport** : les références sont un gabarit de **2102** px, les captures font
  **2400** ou **1920**. Comparer en **% de la hauteur utile** ou sur des grandeurs invariantes
  (épaisseur de filet, hauteur de capitale, largeur de colonne) — **jamais** en px Y absolus.
  C'est d'ailleurs ce que ce juge d'ensemble regarde : **1920 n'est pas 2400 avec moins de place**,
  c'est une autre lecture — et c'est là que les débordements mordent (E05, E06 débordent à 1920 et
  pas à 2400).
- ⚠️ Ce que la normalisation **NE couvre pas** : les rapports **INTERNES** (un bloc deux fois trop
  haut par rapport à son voisin) sont **invariants d'échelle** et restent des **défauts réels**.

## Polices — ce qui a RÉELLEMENT rendu

Piles `font-family` **calculées** (Chromium, éléments porteurs de texte) sur l'ensemble des cadres de
référence de ce tour — `ecrans-brennar-6.html` (125, 145, 85-91, 48, 54, 67, 68, 79, 98, 31, 137),
`ecrans-brennar-4.html` (4, 25-30) et `ecrans-brennar-accueil.html` (4, 5) :

      "DejaVu Sans"                               252 éléments
      "DejaVu Serif"                              103
      Georgia, serif                               63 + 74 (série 4) + 3 (accueil)
      "Segoe UI", Roboto, system-ui, sans-serif    57 + 88 (série 4) + 3 (accueil)
      "Courier New", monospace                     12

`fc-match` sur la machine qui a rendu les PNG (2026-10-08), **famille par famille** :

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
      Times New Roman   →  LiberationSerif-Regular.ttf: "Liberation Serif" "Regular"

Le client embarque **DejaVu Sans** et **DejaVu Serif**.
⇒ **« Georgia », « Segoe UI », « Courier New » n'existent pas sur cette machine** : les références les
montrent en **Noto Serif**, **Noto Sans**, **Liberation Mono**. Un écart de **FAMILLE** sur ces
éléments-là est un **ARBITRAGE de substitution**, jamais un défaut du client. Sur tout le reste
(`DejaVu Sans` / `DejaVu Serif`), maquette et jeu ont la **même** fonte : là, un écart de police EST
un écart.
⚠️ Les références de la **série 4** (E08 nominal, E11, états `v4-*`) ne contiennent **que** Georgia et
Segoe UI — donc **entièrement substituées**. Leur **dessin de lettre** ne fait pas foi ; leur
**géométrie** (tailles, graisses, capitales, interlettrage, longueurs de ligne) si.

## Règles de doctrine applicables

- **gouttière** : le contenu d'écran reste dans le rect du fond ; seul le chrome (bandeau haut, dock
  bas) traverse. **C'est une règle d'ensemble** : la même gouttière sur les douze.
- **contraste** : ≥ 3:1 grands textes, ≥ 4,5:1 petits — sur l'art réel, pas un gris choisi. L'atelier
  tient une garde de contraste à 4,5:1 sur les 152 cadres de la série 6 (master `4bd3ea2`) : les
  maquettes sont au vert, **donc un texte sous le seuil dans le JEU est un écart**.
- **langue affichée** : **français**, via résolveurs nommés — aucun enum brut, aucun identifiant
  technique à l'écran.
- **safe area / portrait** : le projet est configuré **portrait seul**.
- **espace de couleur** : le client compose en **linéaire**, les maquettes en **sRGB**. Une opacité CSS
  se **convertit**, elle ne se recopie pas. Un écart de teinte sur un élément translucide se mesure
  sur la **couleur composée**.
- **animation : AUCUNE sur un nouvel écran** (ruling user 2026-08-27). ⚠️ **NON FOURNI** : les captures
  T et T+1 s n'ont pas été prises (le harnais rend une image par écran et par résolution). Le juge
  **ne peut pas** trancher l'animation — à inscrire en « non vérifié ».

## Gardes de capture (ce qui rendrait l'image mensongère) — toutes passées

Harnais `PlanchesParEcranCapturePlayModeTests`, catégorie `ClichePlanchesParEcran`, via
`CaptureSousShell` : compte **NEUF** par salve (inscriptions `sha256:90e1091c`, `8219f746`,
`97e3c935`, `6e1cc689` au journal), **vrai shell**, `signup` + `session/open` réels, back visé
`http://localhost`.

- **l'écran est réellement entré et monté** — un écran non monté fait échouer le test, pas une image
  noire ;
- **un ÉCHEC noté au journal n'est pas un vert** — le test rougit si une planche manque ;
- **contenu INATTEIGNABLE** — une liste qui déborde sans que le défilement atteigne son bout fait
  rougir le test ; c'est ce qui garantit que les planches `_bas` **ferment** le débordement (le
  journal écrit « remonté jusqu'au bout ») ;
- **plancher d'encre** lu sur le PNG — 4 planches du dépôt ont été **vides sous des tests verts** ;
- **échelle du chrome lue sur le PNG** : hauteur de capitale d'« ARGENT ». Un run à **×1,21** a déjà
  coûté **2 BLOQUANT et 8 MAJEUR** à un juge, sur une planche dont les octets étaient pourtant
  identiques à ceux du commit : le défaut vivait dans l'ÉTAT d'un run. Cette garde lit l'image ;
- **variété** : `teintes ≤ 12 ⇒ « c'est un fond, pas un écran »`.

Résultat du run : **5/5, VERDICT code=0** — `Tools/preuves/creneau-2026-10-08g/VERDICTS.txt`, run 2.

**Commit du client au moment des captures** : tête du lot `lot/mots-client-2026-10-08`, fusionné
depuis dans le cumul client `gate/cumul-client-2026-09-22` en **`2912de7d`**. Une capture est une
mesure **DATÉE**, pas une propriété du commit.

## Écarts ASSUMÉS (à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »)

Le juge les **inventorie quand même**, les classe **ASSUMÉ**, et dit pour chacun **s'il est rendu
proprement**. Un trou assumé mal rendu reste un défaut : c'est la seule question posée dessus.

| # | écran | écart | raison | source |
|---|---|---|---|---|
| 1 | **E04 ㉘** | L'écran est montré en **ÉTAT D'ERREUR**, pas au nominal : « *aucun distribution_hub trouvé parmi les districts possédés — la prémisse de cet écran (un hub de distribution) ne tient pas ici* ». | un **compte NEUF** ne possède aucun district avec hub : le nominal est inatteignable en capture. L'état d'erreur est **décoré** exprès. | `journal.tsv` E04 · `LISEZMOI.md` |
| 2 | **E04 ㉘** | Le **sous-titre passe de 2 phrases à 1** au chargement. | comportement connu de l'écran. **Le juge ne voit que l'état d'après chargement** : il ne peut ni confirmer ni infirmer la première forme. À inventorier comme non vérifiable. | transmis par l'orchestrateur |
| 3 | **E01 ㊳** | « **dans la rue** » est à **00** : la brève de rue est **invisible** sur la planche. | aucune donnée de rue sur un compte neuf. Le compteur **est** à 00, ce qui est l'état juste — mais la **partie d'écran** qu'une brève occuperait n'est pas jugeable ici. | planche E01 (compteur lu : « 12 à la une · **00** dans la rue · 00 en cours ») |
| 4 | **E01 ㊳** | **A3 fermé 3/4** : l'**étiquette d'angle n'est pas servie**. | donnée non servie. | transmis par l'orchestrateur |
| 5 | **E01 ㊳** + tous | **Les noms de journaux sont encore en ANGLAIS.** Le lot « mots » du back sert désormais ces noms **en français**, mais **la pile dev qui a servi la capture ne les servait pas encore**. | **MESURÉ sur la planche** `E01_Journal_1080x2400.png` : les bandeaux de brève lisent « **THE TILBEY WEEKLY** » (×3) et « **THE FREE WEEKLY** » — donc la pile de capture **ne sert pas** le cumul back `6cf46324`. **ASSUMÉ.** Un nom de journal en anglais n'est **pas** un finding sur cette planche. ⚠️ Tout **AUTRE** texte en anglais, ou tout enum brut, **reste un finding**. | mesure du 2026-10-08 sur la planche |
| 6 | **E08 ⑭** | **état VIDE**, pas le nominal du cadre 25. | compte neuf. Les 14 mots nouveaux (« sous compression », « critique », « moyenne »…) **n'y sont pas visibles** ; ils sont couverts ailleurs (gardes M2/M3), pas par cette planche. Références d'état : `compression/v4-25.png` … `v4-30.png` (**×3,0**), « au calme » = cadre **29**. | `LISEZMOI.md` · `journal.tsv` E08 |
| 7 | **E09 ⑮** | **état VIDE**, pas le nominal. | idem. Références d'état disponibles ci-dessus. | `LISEZMOI.md` · `journal.tsv` E09 |
| 8 | **E09 ⑮** | « **budget coupé** » est écrit **EN CAPITALES dans une colonne de 52 px**. | **À REGARDER, pas assumé en lisibilité** : l'assumé porte sur le *fait* que le texte soit là ; la question **lisibilité** (césure, troncature, chevauchement, contraste, hauteur de capitale) est **ouverte et t'est posée**. | transmis par l'orchestrateur |
| 9 | **E11 ⑤** | La **carte est FABRIQUÉE**, non servie : tactique, portée modérée, urgence faible, jeton libre ; plaque crème. | aucune carte à fort levier sur un compte neuf. | `journal.tsv` E11 |
| 10 | **A01 ④** | La **carte de tête** est **neuve** (reconstruite sur le cadre 5) : elle n'a pas de tour de juge antérieur sous cette forme. | la forme précédente (ancien widget W3U1) était un **A visible** qu'aucun cadre ne dessinait ; elle a été refaite. **Juge-la contre le cadre 5 ⬥**, pas contre le cadre 1. | `04-accueil/dossier.md`, décision f2 du 08/10 nuit |
| 11 | **tous** | Les **valeurs du HUD** sont celles d'un compte neuf : **10 000 €**, **Froid**, **JOUR 1**, **Aube** — contre 24 850 € / Tiède / JOUR 12 / Plein jour sur les maquettes. | une **valeur** servie n'est pas un écart de **forme**. La **forme** du HUD, elle, se juge. | planches, toutes |

⚠️ Deux avertissements sur cette table, dus :
1. Elle est **incomplète par construction** : elle vient des journaux de capture et de l'orchestrateur,
   **pas** d'un `juge-donnees` en mode maquette sur les douze écrans. Un élément de maquette que le
   back ne sait pas alimenter et qui n'est **pas** listé ici est un **vrai finding**.
2. **Un écart assumé rendu SALEMENT reste un défaut.** « Vide », « en erreur », « éteint » doivent se
   lire comme intentionnels, pas comme cassés ou oubliés — c'est d'ailleurs l'un des rares endroits où
   un juge d'ensemble voit mieux qu'un juge d'écran : **les six états vides de cette série se
   ressemblent-ils ?**

## Format du RAPPORT — imposé, parce que le compte n'est pas défini sans lui

⛔ **Le juge choisit ses catégories et ses instruments ; il ne choisit pas la forme de son verdict.**
Mesuré sur cinq tours d'un même écran : recompter les MÊMES rapports de deux façons légitimes rend
`r3=8 · r4=4` d'un côté et `r3=6 · r4=7` de l'autre — **les deux méthodes s'inversent**. Le
NUMÉRATEUR n'est pas défini tant que la forme varie d'un juge à l'autre.

**Un finding par ligne, dans UNE table, et rien de compté ailleurs :**

| id | écran | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `A01`\|`E01`…`E11`\|**`ENSEMBLE`** | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| **`NOUVEAU`** | <l'écart> | <les nombres> | <ou vide> |

- **écran** : colonne **ajoutée pour ce tour**, parce qu'il y en a douze. La valeur **`ENSEMBLE`** est
  celle d'un écart de **cohérence** : un trait partagé par plusieurs écrans. ⇒ Un défaut commun
  s'écrit **UNE** fois en `ENSEMBLE` **en nommant les écrans touchés**, jamais douze fois.
- **gravité** : liste **fermée** — trois valeurs, pas de synonyme, pas de nuance en prose.
- **critère** : `NOUVEAU` dès que l'instrument ou la grandeur n'existait pas au tour précédent.
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
chiffré pointe un script dans `mesures/` qui **imprime la taille des images lues**, et ces tailles sont
celles de ce dossier (**attention aux 900×1752**) ; la section « non vérifié » existe et n'est pas
vide (ou dit « rien » avec sa raison) ; **les deux résolutions sont jugées**, ou le rapport dit
laquelle ne l'a pas été et pourquoi.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- **le code du client** (`Assets/Scripts`) et ses tests — le juge ne lit pas le code ;
- **les notes d'implémentation** des chantiers (décor de scène, lot « mots », conformité animation) ;
- **les rapports des juges précédents** de ces écrans — en particulier les répertoires
  `r1-2026-09-07/`, `r2-2026-09-22/`, `r3-/r4-/r5-2026-10-07/` et **`r-groupe-2026-10-07/`** de chaque
  écran : **leurs PNG de référence sont repris ci-dessus, leurs RAPPORTS ne sont pas fournis** et ne
  doivent pas être ouverts (un juge qui hérite d'un rapport hérite de ses angles morts) ;
- les `dossier.md` des tours précédents, pour la même raison ;
- **les six planches `E12_Dossier_*`** du même répertoire : elles sont le matériau d'un **autre** juge,
  en cours sur ㊴ Le dossier. **Ne pas les juger** ;
- **les planches des séries antérieures** (`planches-par-ecran-2026-10-07/`,
  `…-2026-10-08-matin/`, `…-apres-midi/`, `…-soir/`, `…-nuit/`) : ce sont des captures **« avant »**,
  d'un autre code, et **aucune n'est listée ci-dessus** ⇒ aucune n'est fournie. Juger contre elles
  ferait varier **deux** variables à la fois ;
- **les captures T / T+1 s** pour la règle d'animation — **non prises** (voir Doctrine).
