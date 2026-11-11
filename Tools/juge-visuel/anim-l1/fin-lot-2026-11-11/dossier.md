# Dossier du juge visuel — ANIMATIONS lot L1 (shell.entree · bandeau.entree · bascule.course) — tour BORNÉ — 2026-11-11

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-visuel/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/anim-l1/fin-lot-2026-11-11/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (`mesures/` existe, vide).
> **TOUR BORNÉ : tu juges UNIQUEMENT les trois questions ci-dessous.** Un défaut NOUVEAU et GRAVE vu en passant se signale en une ligne « hors périmètre », sans tour.

## Ce qu'on juge
- **Nature** : du MOUVEMENT, pas un écran neuf. Aucune information neuve n'est affichée (pas de juge-données). Trois entrées de passage du HUD de Unity :
  1. `shell.entree` — fondu d'entrée (160 ms) du contenu d'un onglet qu'on monte (`ContentSlot` : le contenu, hors barres) ;
  2. `bandeau.entree` — le bandeau d'annonce ÉPHÉMÈRE descend du bord haut en fondu (200 ms) ;
  3. `bascule.course` — le curseur d'un interrupteur (réglage on/off) fait sa course d'un bout de la piste à l'autre (140 ms).
- **Il n'y a PAS de maquette de mouvement.** La RÉFÉRENCE est le catalogue de mouvements amendé (`reference/catalogue-extrait.md`, extrait de `catalogue-mouvements.md` @`8429eb08`, entrées `shell.entree`, `bandeau.entree`, `bascule.course`) + le design du lot (`reference/design-l1.md`, une page). Le catalogue dit lui-même (l.93) que le canon ne spécifie aucune courbe d'aisance : les aisances sont des PROPOSITIONS. La référence de forme est donc la spec écrite, pas une image.
- **Chemin joueur** : `shell.entree` = taper un autre onglet ; `bandeau.entree` = une annonce arrive ; `bascule.course` = taper la ligne d'un interrupteur dans un réglage (écrans ⑲ / ㉕).
- **Client** : `lot/td-951` @`eebf0b71`. Captures prises par le banc PlayMode du client, en jeu réel, **1080×2400** (téléphone 20:9), instants dictés par la régie (temps simulé, pas d'horloge réelle).

## Captures — dans `captures/` (11 PNG 1080×2400 + `journal.tsv`)
| scénario | fichiers | instants |
|---|---|---|
| shell.entree | `shell-entree_avant_…`, `_t0_…`, `_t80ms_…`, `_t160ms_…` | « avant » = l'onglet PRÉCÉDENT au repos, avant le geste ; t0 = première image du nouvel onglet ; t80 ms ; t160 ms = fin |
| bandeau.entree | `bandeau-entree_t0_…`, `_t100ms_…`, `_t200ms_…` | t0 ; mi-course ; t200 ms = fin |
| bascule.course | `bascule-course_avant_…`, `_t0_…`, `_t70ms_…`, `_t140ms_…` | « avant » = interrupteur au repos avant le geste ; t0 ; t70 ms ; t140 ms = fin |
- `captures/journal.tsv` : les VALEURS écrites par la régie à chaque instant (alpha, décalage y du bandeau en unités u, x du curseur en u), mesurées dans le jeu, avec la colonne « fichier ». Il porte aussi des échantillons de `shell.entree` tous les 20 ms (sans image). C'est une mesure de l'INSTRUMENT, pas une vérité : tu peux la contredire par les images.
- Garde anti-vide à mesurer par toi (≥ 5 % de pixels non noirs) **sauf** là où l'alpha à 0 rend légitimement l'image presque vide (`shell-entree_t0`, α = 0 : le contenu est invisible PAR CONSTRUCTION — dis-le, ne le compte pas comme un défaut).
- **Limite assumée (ne pas rouvrir)** : les captures des 9 classes de capture à identifiants ne sont pas couvertes ; seuls ces trois scénarios, sur l'écran monté par le banc, sont fournis.
- **Plus de captures sur demande ? NON.** Ce que tu ne peux pas vérifier avec ces 11 images, tu le dis dans la colonne « non vérifié ».

## Échelle — OBLIGATOIRE, jamais déduite par le juge
| | valeur |
|---|---|
| Image | 1080 px de large ; le canvas du client fait **1280 u** de large, rendu sur 1080 px ⇒ **1 u = 0,84375 px** |
| Bandeau | vit sous `TopBarEchelle` (×3,265) : **10 u de canal = 10 × 3,265 × 0,84375 ≈ 27,55 px écran** (le catalogue dit « 27,6 px = px écran ») |
| Curseur de bascule | piste `Px(22)` = 93,9 u ; curseur `Px(10)` = 42,7 u ; retrait `Px(1)` = 4,27 u de chaque bord ⇒ course totale entre les deux bouts = 93,9 − 42,7 − 2×4,27 ≈ **42,67 u ≈ 36,0 px**. Le journal exprime x en **u dans le repère du parent** ; il n'est pas en pixels. |
- La conversion u → px est un fait de CE dossier ; vérifie-la sur les images (largeur de la piste, du curseur) au lieu de la croire.
- ⚠️ La normalisation NE couvre pas les rapports INTERNES (un curseur qui parcourt deux fois la piste, un fondu dont le début et la fin sont inversés) : ils restent des défauts réels.

## Courbe d'aisance
Les trois entrées déclarent `ease-out`, sans autre précision dans le catalogue. Dans le client, `ease-out` = la courbe CSS standard `cubic-bezier(0, 0, 0.58, 1)` (c'est le mot-clé CSS `ease-out`). **Calcule toi-même** les valeurs attendues à chaque instant (script dans `mesures/`, avec contrôle positif et un contrôle NÉGATIF : le même script doit rejeter une courbe linéaire et une `ease-in`), compare-les au journal ET aux images (le pixel doit bouger du même ordre que le journal). Dis si cette courbe est une lecture fidèle de « ease-out ».

## Doctrine applicable
- animation VOULUE : un pixel qui bouge n'est pas un écart ; seul compte où tombe l'image figée à l'instant capturé.
- Un état INTERMÉDIAIRE n'est pas jugé comme un repos : un texte à 0,2 d'alpha est pâle PAR CONSTRUCTION. Il ne devient A/B que s'il est (a) illisible alors qu'il devrait être lisible à cet instant, (b) superposé de façon gênante à un autre élément, (c) coupé, décalé hors de l'écran ou de son cadre.
- contraste ≥ 3:1 grands textes / 4,5:1 petits : jugé **à l'état final** (t = fin), pas en cours de fondu.
- langue affichée : français. Pas de code brut à l'écran.
- Unity compose en LINÉAIRE : un alpha intermédiaire rend plus pâle ou plus sombre que la valeur sRGB naïve. Ne juge pas la valeur de pixel d'un alpha intermédiaire contre un calcul sRGB sans le dire ; ce qui compte : monotone, borné, 0 au début et 1 à la fin.

## LES TROIS QUESTIONS BORNÉES (les seules jugées)
**Q1 — conformité aux valeurs.** À t0, mi-course et fin, les valeurs (α, translation, courbe) suivent-elles le catalogue : `shell.entree` α 0 → 1 en 160 ms, pas de translation ; `bandeau.entree` y +10 u → 0 ET α 0 → 1 en 200 ms ; `bascule.course` x du bout quitté → bout atteint en 140 ms, couleur de piste NON animée (posée à l'arrivée) ? Juge-le sur le journal ET sur les images (le journal seul ne suffit pas : retrouve le mouvement sur les pixels — positions du curseur, présence/pâleur du bandeau, présence/pâleur du contenu).
**Q2 — retour au repos.** À t = fin (`shell-entree_t160ms`, `bandeau-entree_t200ms`, `bascule-course_t140ms`), l'écran est-il identique à son état de repos : rien ne reste décalé, transparent, translaté ? Pour chaque scénario, nomme l'image de repos que tu compares et dis pourquoi elle est la bonne. (Indices fournis, à vérifier : des captures peuvent être identiques octet pour octet — contrôle par sha256 et dis ce que cela prouve ou ne prouve pas.)
**Q3 — états intermédiaires.** Un état intermédiaire (t80 ms de `shell.entree`, t100 ms du bandeau, t70 ms de la bascule, et les t0) produit-il un écart A/B visible : texte illisible alors qu'il devrait être lisible, superposition gênante (le bandeau sur un texte de la barre haute, deux positions du curseur à la fois), élément coupé ou hors cadre ?

Ruling user 07/10 : **A/B** = ce qu'un joueur perçoit ; **C** = pixel ou nuance, **consigné, ni correctif ni tour**. Un écran sans A/B est APPROUVÉ. Rends **APPROUVÉ / NON** en tête du rapport, avec le compte pris DANS la table.

## Écarts ASSUMÉS — à inventorier, classer ASSUMÉ, NE PAS ROUVRIR
| écart | raison |
|---|---|
| La SORTIE de l'écran précédent n'est pas animée : l'ancien contenu disparaît d'un coup (`shell-entree_avant` → t0) | catalogue : « la sortie n'est pas animable sans retouche » ; on anime l'entrée seule |
| Pas de translation sur `shell.entree` (fondu seul) | catalogue : « Pas de translation » |
| Le premier montage de la session et les surimpressions (overlays) ne s'animent pas | exclusions écrites du catalogue (garde cold-open, dette TD-955) ; hors capture |
| Pendant les 160 ms de `shell.entree`, l'écran encore invisible est cliquable | consigné au design §1 |
| La couleur de la piste de l'interrupteur n'est pas animée (elle change à l'arrivée du curseur) | catalogue + design §3 |
| Sous « mouvement réduit », durée 0 | catalogue ; non capturé ici |
| polices de chrome (Georgia → Noto Serif, Segoe UI → Noto Sans) | arbitrage de substitution |
| pixel ou nuance (classe C) | consigné, ni correctif ni tour |

## Format du RAPPORT — imposé
UNE table, un finding par ligne, rien compté ailleurs :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| **`NOUVEAU`** | … | … | … |

- gravité : liste fermée. Le compte se prend dans la table, jamais dans ton résumé.
- Trois lignes de verdict DANS LE RAPPORT : « Q1 : A/B ? oui/non — F… », « Q2 : … », « Q3 : … ». Les C ne sont pas des findings (liste-les à part, sans gravité).
- Pour chaque écart : le script `mesures/*.py` qui imprime les tailles d'images lues, avec contrôle positif.
- Dis explicitement quel cadre/état tu as lu pour chaque conclusion (nom de fichier) et ce que tu n'as PAS pu voir.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation, les messages de commit, les `LISEZ-MOI.md` voisins ;
- les rapports de juges précédents (tout `Tools/juge-visuel/**/rapport*.md`, `Tools/juge-donnees/**`, `/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/**`) : INTERDITS ;
- tout autre répertoire de `/home/erutheone/project/mafia-unity-F/Logs/` que celui copié ici : INTERDIT ;
- toute capture « avant lot » d'un autre écran : il n'y en a pas pour toi.
