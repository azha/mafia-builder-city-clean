# Dossier du juge visuel — ④ L'ouverture (Accueil au repos) — tour BORNÉ « retour d'appui » r2 (planches corrigées) — GABARIT 2026-11-11, À COMPLÉTER

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-visuel/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-retour-appui/fin-ecran/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (le répertoire `mesures/` existe, vide).
> **TOUR BORNÉ : tu juges UNIQUEMENT les deux questions ci-dessous. Tout autre constat n'est PAS rouvert.** Un défaut NOUVEAU et GRAVE vu en passant se signale en une ligne « hors périmètre », sans tour.

## L'écran
- **Nom** : ④ L'ouverture (Accueil), au REPOS (aucun geste fait).
- **Ce qu'on vient y faire** : voir d'un coup d'œil la décision du jour (carte de tête), la file des autres décisions, et la suite à faire ; trancher.
- **Chemin joueur** : ouverture de session → Accueil. Le banc monte le VRAI shell du jeu (session fixe, régie figée à t = 0).
- **États capturés** : 6 états × 2 résolutions = 12 PNG, un par cadre ④ de la maquette (même ordre : c1 = cadre 1 de la maquette … c6 = cadre 6).

## Référence (fait autorité : l'IMAGE) — rendue depuis l'atelier master `8f59cf9409546bc9a078dbb91ca48f91be68da95` (page épinglée, `git show 8f59cf94:ecrans-brennar-accueil.html`, pas l'arbre de travail), `Tools/rendre-tel.py … 3.6`, « non rogné » vérifié
| fichier | cadre ④ de la maquette (index 0-based du rendu → nom du fichier) | taille px |
|---|---|---|
| `reference/cadre-1.png` | 1 « rien à trancher » | 1080×2102 |
| `reference/cadre-2.png` | 2 « une carte de tête » | 1080×2102 |
| `reference/cadre-3.png` | 3 « des rapports à lire » | 1080×2102 |
| `reference/cadre-4.png` | 4 « la file sous pression » | 1080×2102 |
| `reference/cadre-5.png` | 5 « un joueur neuf : la suite » | 1080×2102 |
| `reference/cadre-6.png` | 6 « carte de tête au-dessus d'une ligne de file haute » | 1080×2102 |
- Source HTML (aide de lecture, ne prime jamais sur l'image) : `/tmp/claude-1000/-home-erutheone-project-mafia-builder-city-clean/df180ef7-bd03-45c8-bca4-a4c3c6f0b99f/scratchpad/pin/ecrans-brennar-accueil.html` (copie épinglée @8f59cf94).
- **Polices — ce qui a RÉELLEMENT rendu** (`fc-match` relancé le 2026-11-11) :

      DejaVu Sans   →  DejaVuSans.ttf
      DejaVu Serif  →  DejaVuSerif.ttf
      Georgia       →  NotoSerif-Regular.ttf   (substitution : chrome du HUD)
      Segoe UI      →  NotoSans-Regular.ttf    (substitution : chrome du HUD)
      Courier New   →  LiberationMono-Regular.ttf

  Le client embarque DejaVu Sans / DejaVu Serif. ⇒ Un écart de FAMILLE de police du chrome est un ARBITRAGE, pas un défaut.

## Captures en jeu — dans `captures/` (12 PNG, noms = `<état>-<largeur>x<hauteur>.png`)
| état | donnée montée | cadre |
|---|---|---|
| `c1-rien-a-trancher` | session sans carte, file vide, pas de suite | 1 |
| `c2-une-carte-de-tete` | carte de tête « local à remettre en état », portée modérée / urgence faible | 2 |
| `c3-des-rapports-a-lire` | carte « des rapports à lire » | 3 |
| `c4-la-file-sous-pression` | 4 cartes en file, pas de carte de tête | 4 |
| `c5-joueur-neuf-la-suite` | « La suite » (palier 1), file vide | 5 |
| `c6-carte-de-tete-au-dessus-de-la-file` | carte de tête + 4 cartes en file | 6 |
Résolutions : **1080×1920** (art natif) et **1080×2400** (téléphone 20:9). Le test imprime les rects ; garde anti-vide à mesurer par toi (≥ 5 % de pixels non noirs). **À COMPLÉTER à la réception des planches corrigées** : SHA du client, du back/bundle servi, banc utilisé, chemin des captures, photo retenue par cadrage.
- Pour c2, c3 et c6 en 1080×1920, la photo fournie est la 2ᵉ : la 1ʳᵉ portait une bande de texte pas encore composée. Si tu vois un texte tronqué ou en cours de composition, dis-le.

## Échelle — OBLIGATOIRE, jamais déduite par le juge
| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE | 1080 | 300 | **×3,6** |
| CAPTURE | 1080 | 300 (canvas 1280 u rendu sur 1080 px) | **×3,6** |
| | | **rapport capture ÷ référence** | **1,000 en X** (tailles relues sur les fichiers) |
- Ce rapport est NORMAL ; toute mesure se ramène en px CSS avant de conclure (1 px CSS = 3,6 px d'image des deux côtés). **En Y il n'y a PAS de rapport** : références 2102, captures 1920 ou 2400 ; comparer en % de hauteur utile ou sur des grandeurs invariantes ; 1920 n'est pas 2400 avec moins de place.
- ⚠️ La normalisation NE couvre pas les rapports INTERNES (un bloc deux fois trop haut par rapport à son voisin) : ils restent des défauts réels.

## Règles de doctrine applicables
- gouttière : le contenu d'écran reste dans le rect du fond ; seul le chrome traverse
- contraste : ≥ 3:1 grands textes, ≥ 4,5:1 petits (sur l'art réel)
- langue affichée : français, via résolveurs / clés servies (aucun code brut, aucun enum à l'écran)
- animation VOULUE sur les écrans neufs : un pixel qui bouge n'est pas un écart ; capture figée à t=0
- Unity compose en LINÉAIRE, la maquette HTML en sRGB : ne pas juger une opacité/ombre/dégradé recopié comme un écart de valeur sans le mesurer

## LES DEUX QUESTIONS BORNÉES (les seules jugées)
Un lot de code vient de toucher l'Accueil. **Deux changements visibles sont attendus** ; un troisième point vérifie qu'il n'y a rien d'autre.

**Q1 — la rangée TRANCHER.** Dans la ligne de la carte de la file (« Lt. … attend vos ordres … TRANCHER »), le bouton TRANCHER épouse désormais la hauteur de sa rangée au lieu d'une hauteur nulle. Cette rangée, telle qu'elle est capturée, introduit-elle un écart A/B par rapport à la MAQUETTE (cadres 2, 3, 4, 6 selon l'état : position, taille, alignement, lisibilité du mot TRANCHER, zone de toucher plausible, débordement) ?

**Q2 — le Pied de la carte retiré de l'Accueil.** L'Accueil n'affiche plus le « Pied » de la carte. L'absence de ce pied, telle que capturée sur les six états, introduit-elle un écart A/B par rapport à la MAQUETTE (élément absent que la maquette dessine, trou, vide anormal, texte coupé, bloc voisin qui ne se range plus comme dans la maquette) ?

**Q3 — rien d'autre au repos.** Y a-t-il un écart A/B **NOUVEAU** (un élément en trop, déplacé, coupé, de teinte autre, de texte autre) sur les 12 captures, par rapport à la MAQUETTE, qui ne soit ni dans les écarts ASSUMÉS ci-dessous ni dans Q1/Q2 ? (Tu n'as pas d'« avant » : tu compares chaque capture à sa référence.)

Ruling user 07/10 : **A/B** = ce qu'un joueur perçoit (fond, matière, élément absent, texte, geste, lisibilité) ; **C** = pixel ou nuance, **consigné, ni correctif ni tour**. Un écran sans A/B est APPROUVÉ.

## Écarts ASSUMÉS — à inventorier, classer ASSUMÉ, vérifier « rendu proprement » (NE PAS ROUVRIR) — liste RESSERRÉE au r2 (la liste du r1 était recopiée d'un autre écran)
| écart | raison |
|---|---|
| carte de tête c2/c3/c6 : un seul bouton « Prendre acte » (pas de « Pas maintenant », pas de ligne de conséquence) | l'annotation du cadre 2 de la maquette dit « en attendant, le client garde Prendre acte / Pas maintenant, sans ligne de conséquence » : état courant vs état cible, arbitré |
| la rangée TRANCHER : la touche sur le mot ouvre désormais la carte ⑩ (avant : l'appui tombait sur la plaque dessous) | correction de geste voulue, classe B, arbitrée f2 ; ne se juge pas sur image, ne se rouvre que si le RENDU au repos change |
| données montées par le banc : le contenu d'une carte (lieutenant, texte de « La suite ») peut différer de celui dessiné par la maquette | donnée du banc, pas un défaut du client : tu juges la MISE EN PAGE, pas la donnée |
| polices de chrome (Georgia → Noto Serif, Segoe UI → Noto Sans) | arbitrage de substitution |
| pointillé `.prop` sous « CE QU'ON PEUT FAIRE » et sous les conséquences | annotation de DA « proposé, non ratifié », NON rendue |
| pixel ou nuance (classe C) | consigné, ni correctif ni tour |
- **Pas** dans cette liste : étiquettes PORTÉE/URGENCE, filets-or, tampon, losange ♦, passe-partout, « proportions de la carte » : ils ne concernent pas ces cadres ; s'ils te paraissent écarts, mesure-les.

## Format du RAPPORT — imposé
UNE table, un finding par ligne, rien compté ailleurs :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| **`NOUVEAU`** | … | … | … |

- gravité : liste fermée. Le compte se prend dans la table, jamais dans ton résumé.
- Ajoute DANS LE RAPPORT trois lignes de verdict : « Q1 : A/B ? oui/non — F… », « Q2 : … », « Q3 : … ». Les C ne sont pas des findings (liste-les à part, sans gravité).
- Pour chaque écart : le script `mesures/*.py` qui imprime les tailles d'images lues, avec contrôle positif.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation, les messages de commit, les `LISEZ-MOI.md` voisins ;
- les rapports de juges précédents (tout `Tools/juge-visuel/**/rapport*.md`, `Tools/juge-donnees/**`, `Tools/juge-visuel/retour-appui-v5-accueil/` et `/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/**`) : INTERDITS ;
- toute capture « avant » : il n'y en a pas pour toi.
