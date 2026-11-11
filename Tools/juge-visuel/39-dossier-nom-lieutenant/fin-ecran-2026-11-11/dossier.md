# Dossier du juge visuel — ㊴ Le dossier (pistes) — tour BORNÉ « rendu neuf du lot » — 2026-11-11

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-visuel/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/39-dossier-nom-lieutenant/fin-ecran-2026-11-11/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (`mesures/` existe, vide).
> **TOUR BORNÉ : tu juges UNIQUEMENT le rendu neuf listé ci-dessous.** Tout autre constat n'est pas rouvert ; un défaut NOUVEAU et GRAVE vu en passant : une ligne « hors périmètre », sans tour.

## L'écran
- **Nom** : ㊴ « Le dossier » — l'écran des pistes de renseignement qui pèsent sur le joueur.
- **Ce qu'on vient y faire** : lire l'état de chaque piste (audit, effluent, train de vie) ; la piste « train de vie » porte le NOM du lieutenant concerné et un mot de gravité.
- **Chemin joueur** : onglet du dossier ; l'écran se charge lui-même (vue Pistes si des pistes sont lisibles, vue Vide si le roster d'acteurs est vide).
- **États capturés** : 3 (`quiet` = état naturel d'un compte neuf, vue Vide ; `noticed` ; `watched`) × 2 langues (FR, EN) × 2 résolutions = 12 PNG.

## Référence (fait autorité : l'IMAGE) — rendue depuis l'atelier c2 @`b2ceebeb6ca672f1a367d5e135ddfcc17fbc92d1` (page épinglée, `Tools/rendre-tel.py … 3.6`, « non rogné » vérifié)
| fichier | cadre de la maquette (étiquette) | taille |
|---|---|---|
| `reference/cadre-131.png` | « Le dossier — trois pistes qui ne se mélangent pas » | 1080×2102 |
| `reference/cadre-150.png` | « ㊴ · les pistes — la fenêtre des acteurs mène à eux ; deux pistes éteintes, « pas encore sur la table » (PROPOSÉ) » | 1080×2102 |
| `reference/cadre-151.png` | « ㊴ · les acteurs — le renseignement par ligne, éteint ; la fenêtre des pistes ramène … » | 1080×2102 |
| `reference/cadre-152.png` | « ㊴ · les pistes — « le train de vie de Lt. Marrek » : le back sert le NOM (lifestyle_lieutenant_name), piste vivante, … » | 1080×2102 |
| `reference/cadre-153.png` | « ㊴ · les pistes — le nom n'est PAS servi (null …) : la piste garde … » | 1080×2102 |
- Source HTML (aide de lecture, ne prime jamais sur l'image) : `git -C /home/erutheone/project/atelier3d-mafia-c2 show b2ceebeb:ecrans-brennar-6.html` (2,6 Mo : ne l'affiche jamais en entier).
- **Polices — ce qui a RÉELLEMENT rendu** (`fc-match`, 2026-11-11) : `DejaVu Sans → DejaVuSans.ttf` · `DejaVu Serif → DejaVuSerif.ttf` · `Georgia → NotoSerif-Regular.ttf` (substitution) · `Segoe UI → NotoSans-Regular.ttf` (substitution). Le client embarque DejaVu Sans / Serif ⇒ un écart de FAMILLE de police du chrome est un ARBITRAGE.

## Captures en jeu — `captures/` (12 PNG `E13_Dossier_<quiet|noticed|watched>_<fr|en>_<1080x2400|1080x1920>.png`)
Servies par une vraie pile de dev (vrai shell, compte jetable par état, l'écran se charge lui-même, textes issus du bundle i18n SERVI, FR et EN) ; 1080×2400 (téléphone visé 20:9) et 1080×1920 (art natif). Client `c35c325068f636c986590965d371bfa38e57ec8f`. Le jeu n'est livré qu'en français : le chrome FR (ARGENT, CHALEUR, JOUR) sur les planches EN est un artefact du banc, hors périmètre. Aucune planche ne montre le cas « effluent visible » (un mot de gravité sous la piste des cuves) : dis-le en « non vérifié ». Garde anti-vide : à mesurer par toi (≥ 5 % de pixels non noirs).
- `quiet` : le compte n'a aucune piste vivante ni acteur : la vue montrée est la vue Vide.
- `noticed` / `watched` : la vue Pistes avec la piste « train de vie » vivante (états de gravité différents).

## Échelle — OBLIGATOIRE, jamais déduite par le juge
| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE | 1080 | 300 | **×3,6** |
| CAPTURE | 1080 | 300 (canvas 1280 u rendu sur 1080 px) | **×3,6** |
| | | **rapport capture ÷ référence** | **1,000 en X** |
- NORMAL ; toute mesure se ramène en px CSS (1 px CSS = 3,6 px d'image). **En Y il n'y a PAS de rapport** (références 2102, captures 1920/2400) : compare en % de hauteur utile ou sur grandeurs invariantes.
- ⚠️ La normalisation NE couvre pas les rapports INTERNES (un bloc deux fois trop haut par rapport à son voisin).

## Règles de doctrine applicables
- langue affichée : français / anglais, via les textes SERVIS ; **aucun code, aucun nom d'énumération, aucun mot système brut à l'écran** ; mots bannis à l'écran : « session », « structurelle »
- contraste : ≥ 3:1 grands textes, ≥ 4,5:1 petits (sur l'art réel)
- gouttière : le contenu reste dans le rect du fond ; animation voulue (capture figée à t=0, un pixel qui bouge n'est pas un écart)
- Unity compose en LINÉAIRE, la maquette en sRGB : ne juge pas une opacité/ombre recopiée sans la mesurer

## LES QUESTIONS BORNÉES (les seules jugées)
Un lot vient de changer ce que cet écran affiche pour la piste « train de vie ». Pour **`noticed` et `watched`, en FR et en EN, aux deux résolutions**, juge ce que **le joueur voit** :
- **Q1 — le titre nommé** de la piste (« LE TRAIN DE VIE DE LT. … » / EN équivalent) : présent, lisible, bien dans son cadre, homologue du titre « le train de vie de Lt. Marrek » de la maquette (cadre 152) ; rien de coupé, rien qui déborde.
- **Q2 — la piste vivante** : son état d'allumage, ses couleurs, son mot de gravité, comparés à la piste vivante de la maquette (cadre 152) ; les deux pistes voisines restent-elles comme la maquette les dessine ?
- **Q3 — les compteurs** (« 01/2 », etc.) : lisibles, à leur place, cohérents avec ce que la maquette dessine (compare le FORMAT et la place ; le dénominateur affiché peut différer de celui dessiné par la maquette : c'est une dette connue, classe C, ne pas rouvrir).
- **Q4 — tout ce qui s'affiche SOUS la bande de la piste** (sous le titre et le mot de gravité) : lis chaque ligne de texte réellement affichée ; **y a-t-il un texte qu'un joueur ne devrait pas voir** (mot système, valeur brute, code, anglais dans la capture FR ou français non voulu dans la capture EN) ? Le chrome du shell (ARGENT, CHALEUR, JOUR) reste en français dans les planches EN : il est hors ㊴, signale-le seulement en « hors périmètre ».
- **Q5 — l'état `quiet`** : la vue Vide est-elle propre (rien de coupé, pas de trou, texte lisible) et cohérente avec ce que la maquette dessine pour une absence de pistes (cadres 150/151/153) ?
**Ruling user 07/10 : A/B = ce qu'un joueur perçoit (fond, matière, élément absent, texte, geste, lisibilité) ⇒ corrigés fidèlement ; C = pixel ou nuance ⇒ consignés, ni correctif ni tour. Un juge APPROUVE un écran sans A/B.**

## Écarts ASSUMÉS — à inventorier, classer ASSUMÉ (ne pas rouvrir)
| écart | raison |
|---|---|
| dénominateur du compteur « /2 » (la maquette écrit « /3 ») | dette connue, classe C |
| chrome du shell en français sur les planches EN | hors ㊴ |
| polices Georgia → Noto Serif, Segoe UI → Noto Sans | arbitrage de substitution |
| annotations de DA « PROPOSÉ / non ratifié » de la maquette, non rendues | arbitré |
| pixel ou nuance (classe C) | consigné, ni correctif ni tour |

## Format du RAPPORT — imposé
UNE table, un finding par ligne, rien compté ailleurs (le compte se prend dans la table, jamais dans ta synthèse) :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| **`NOUVEAU`** | … | … | … |

Ajoute des lignes de verdict « Q1 : A/B ? oui/non — F… » … « Q5 : … » (les C ne sont pas des findings : liste-les à part). Chaque écart : un script `mesures/*.py` qui imprime les tailles d'images lues, avec contrôle positif. Rapport = mandat (`rapport.md`).

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation, les messages de commit, les journaux d'instrument (`journal.tsv`) ;
- **tout rapport de juge précédent (visuel ou données) : INTERDITS** — `Tools/juge-visuel/**` sauf ce répertoire, `Tools/juge-donnees/**` ;
- toute capture « avant » : il n'y en a pas pour toi.
