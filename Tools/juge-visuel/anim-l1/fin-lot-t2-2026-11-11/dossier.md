# Dossier du juge visuel — ANIMATIONS lot L1 (shell.entree · bandeau.entree · bascule.course) — tour 2 BORNÉ — 2026-11-11

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-visuel/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/anim-l1/fin-lot-t2-2026-11-11/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (`mesures/` existe, vide).
> **TOUR BORNÉ : tu juges UNIQUEMENT les trois questions ci-dessous.** Un défaut NOUVEAU et GRAVE vu en passant se signale en une ligne « hors périmètre », sans tour.
> Tu es un juge NEUF : tu n'as aucun « avant ». Tu compares chaque capture à la spec écrite et aux autres captures du même scénario.

## Ce qu'on juge
- **Nature** : du MOUVEMENT, pas un écran neuf. Aucune information neuve n'est affichée. Trois entrées de passage du HUD :
  1. `shell.entree` — fondu d'entrée (160 ms) du contenu d'un onglet qu'on monte (`ContentSlot` : le contenu, hors barres) ;
  2. `bandeau.entree` — le bandeau d'annonce ÉPHÉMÈRE descend du bord haut en fondu (200 ms) ;
  3. `bascule.course` — le curseur d'un interrupteur (réglage on/off) fait sa course d'un bout de la piste à l'autre (140 ms), sur l'écran de réglages ⑲ (lignes « Marche » et « Tutoriels »).
- **Il n'y a PAS de maquette de mouvement.** La RÉFÉRENCE est le catalogue de mouvements amendé (`reference/catalogue-extrait.md`, extrait de `catalogue-mouvements.md` @`8429eb08`) + le design du lot (`reference/design-l1.md`). Les aisances sont des propositions (catalogue l.93) ; `ease-out` = la courbe CSS standard `cubic-bezier(0, 0, 0.58, 1)`.
- **Client** : `lot/td-951` @`010ed4ad` (harnais de capture v2). Captures prises par le banc PlayMode du client en jeu réel, instants dictés par la régie (temps simulé).
- **Pourquoi un 2ᵉ tour** : les captures d'un tour précédent de la bascule ont été jugées non concluantes ; elles ont été reprises avec un harnais corrigé. Tu n'as pas à connaître le détail : tu juges ce que montrent CES images. Une conclusion qui ne s'appuie que sur le journal, sans retrouver l'effet sur les pixels, n'est pas une conclusion.

## Captures — dans `captures/` (32 PNG + 6 PNG dans `captures/reduit/` + `captures/journal.tsv`)
Noms : `<scénario>_<instant>_<largeur>x<hauteur>.png`, deux résolutions : **1080×1920** et **1080×2400** (téléphone 20:9).
| scénario | instants |
|---|---|
| `shell-entree` | `avant` (onglet précédent au repos), `t0`, `t80ms`, `t160ms` (fin) |
| `bandeau-entree` | `t0`, `t50ms`, `t70ms`, `t100ms`, `t200ms` (fin) |
| `bascule-course-marche-sens1` | `avant`, `t0`, `t70ms`, `t140ms` — ligne « Marche », interrupteur dans un sens |
| `bascule-course-marche-sens2` | `t0`, `t70ms`, `t140ms` — le sens inverse (pas de « avant » : c'est l'état d'arrivée du sens 1) |
| `reduit/` : `reduit-shell-entree_apres-montage`, `reduit-bandeau-entree_apres-annonce`, `reduit-bascule-course_avant / _t0 / _t70ms / _t140ms` | état « mouvement réduit » (durée 0), 1080×2400 seulement |
- `captures/journal.tsv` : les VALEURS écrites par la régie à chaque instant (alpha du bandeau et son décalage y en unités u, x du curseur en u, alpha du contenu et état de la piste `shell.entree`). Il n'a pas de lignes pour `reduit/`. Le journal est une mesure de l'INSTRUMENT ; tu peux le contredire par les images.
- Garde anti-vide à mesurer par toi (≥ 5 % de pixels non noirs) **sauf** là où α = 0 rend légitimement l'image presque vide (`shell-entree_t0`) — dis-le, ne le compte pas comme un défaut.
- **Limite assumée (ne pas rouvrir)** : pas de capture des 9 classes de capture à identifiants ; seuls ces scénarios sont fournis.

## Échelle — OBLIGATOIRE, jamais déduite par le juge
| | valeur |
|---|---|
| Image | 1080 px de large dans les deux résolutions ; le canvas du client fait **1280 u** de large ⇒ **1 u = 0,84375 px** (horizontal, identique à 1920 et 2400) |
| Bandeau | sous `TopBarEchelle` (×3,265) : **10 u de canal ≈ 27,55 px écran** |
| Curseur de bascule | piste 93,9 u, curseur 42,7 u, retrait 4,27 u de chaque bord ⇒ course totale ≈ **42,67 u ≈ 36,0 px** ; le journal donne x en **u dans le repère du parent** |
- Vérifie la conversion sur les images. En **Y**, 1920 n'est pas 2400 avec moins de place : compare en grandeurs invariantes, en % de hauteur utile, ou par rapport à un élément fixe de la barre haute.
- ⚠️ La normalisation NE couvre pas les rapports INTERNES : ils restent des défauts réels.

## Doctrine applicable
- animation VOULUE : un pixel qui bouge n'est pas un écart ; seul compte où tombe l'image figée à l'instant capturé.
- Un état INTERMÉDIAIRE n'est pas jugé comme un repos : un élément à α 0,4 est pâle PAR CONSTRUCTION. Il n'est A/B que s'il est illisible alors qu'il devrait être lisible, superposé de façon gênante à un autre élément, coupé, ou hors cadre.
- Contraste ≥ 3:1 (grands textes) / 4,5:1 (petits) : jugé **à l'état final**, pas en cours de fondu.
- Unity compose en LINÉAIRE : ne juge pas la valeur de pixel d'un alpha intermédiaire contre un calcul sRGB naïf sans le dire ; ce qui compte : monotone, borné, 0 au début, 1 à la fin.

## LES TROIS QUESTIONS BORNÉES (les seules jugées)
**Q1 — la bascule, sur l'écran entier.** Pendant `bascule.course` (les 2 sens, les 2 résolutions, t0 / t70 / t140 et, pour le sens 1, `avant`), le reste de l'écran de réglages reste-t-il STABLE — aucun fondu plein cadre, aucune variation de luminosité du contenu hors interrupteur, aucun décalage ? Mesure l'alpha/la luminosité du contenu hors interrupteur sur chaque capture (script, contrôle positif : le même script doit retrouver le fondu connu de `shell-entree_t0 → t80ms → t160ms` ; contrôle négatif : il doit rendre ~1,000 sur deux captures identiques). Puis, sur la course elle-même : x du curseur à t0/t70/t140 (36,0 px de course, courbe ease-out à 140 ms, sens 1 ET sens 2) et couleur de piste (non animée, posée à l'arrivée).
**Q2 — la descente du bandeau, de 0 à 200 ms, surtout 50 et 70 ms.** À `t50ms` et `t70ms` (les deux instants où le bord haut du bandeau est encore proche de la barre haute), la descente est-elle conforme (`y +10 u → 0` ET `α 0 → 1`, ease-out, 200 ms) ? Où est le BORD HAUT du bandeau par rapport à la barre haute ; recouvre-t-il le médaillon central ou un texte de la barre, et si oui, de façon gênante (illisible, coupé) ou de façon admissible (voile translucide transitoire) ? Mesure sur les pixels : position verticale du bord haut à chaque instant (script, contrôle positif/négatif), alpha apparent, emprise horizontale, et comparaison au journal.
**Q3 — l'état Réduit (durée 0).** Sur `reduit/` : aucun mouvement, l'état FINAL dès t0 ? Attendu par le design : `shell.entree` pleinement visible (α 1) dès le montage ; bandeau à son repos (α 1, décalage 0) dès l'annonce ; bascule : curseur à son bout d'arrivée dès t0, identique à t70 et t140 (une image à l'ancienne couleur de piste pendant UNE frame est admise et consignée). Les 4 captures de la bascule en Réduit doivent être identiques à t0 / t70 / t140 ; par octets (sha256) ET par pixels ; dis ce que l'identité par octets prouve et ne prouve pas. Compare aussi l'arrivée au `t140ms` du mode normal.

Ruling user 07/10 : **A/B** = ce qu'un joueur perçoit ; **C** = pixel ou nuance, **consigné, ni correctif ni tour**. Un écran sans A/B est APPROUVÉ. Rends **APPROUVÉ / NON** en tête du rapport, avec le compte pris DANS la table.

## Écarts ASSUMÉS — à inventorier, classer ASSUMÉ, NE PAS ROUVRIR
| écart | raison |
|---|---|
| La SORTIE de l'écran précédent n'est pas animée : l'ancien contenu disparaît d'un coup | catalogue : la sortie n'est pas animable sans retouche ; on anime l'entrée seule |
| Pas de translation sur `shell.entree` (fondu seul) | catalogue |
| Le premier montage de la session et les surimpressions ne s'animent pas | exclusions écrites du catalogue (garde cold-open, dette TD-955) ; hors capture |
| Pendant les 160 ms de `shell.entree`, l'écran encore invisible est cliquable | consigné au design §1 |
| La couleur de la piste de l'interrupteur n'est pas animée (posée à l'arrivée du curseur) | catalogue + design §3 |
| Sous Réduit, une image à ancienne couleur / curseur arrivé est admise (1 frame) | design §3 |
| polices de chrome (Georgia → Noto Serif, Segoe UI → Noto Sans) | arbitrage de substitution |
| pixel ou nuance (classe C) | consigné, ni correctif ni tour |

## Format du RAPPORT — imposé
UNE table, un finding par ligne, rien compté ailleurs :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| **`NOUVEAU`** | … | … | … |

- gravité : liste fermée. Le compte se prend dans la table, jamais dans ton résumé. Si la table est vide : écris « 0 finding » en toutes lettres.
- Trois lignes de verdict DANS LE RAPPORT : « Q1 : A/B ? oui/non — F… », « Q2 : … », « Q3 : … ». Les C ne sont pas des findings (liste-les à part, sans gravité).
- Pour chaque conclusion : nom du fichier lu, et le script `mesures/*.py` qui imprime les tailles d'images lues, avec contrôle positif ET négatif. Un instrument rejeté par son propre témoin se remplace, il ne se corrige pas à la main.
- Dis ce que tu n'as PAS pu voir.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation, les messages de commit, les `LISEZ-MOI.md` voisins ;
- les rapports et mesures de juges précédents : INTERDITS — tout `Tools/juge-visuel/**/rapport*.md`, **tout le répertoire `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/anim-l1/fin-lot-2026-11-11/`**, `Tools/juge-donnees/**`, `/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/**` ;
- tout autre répertoire de `/home/erutheone/project/mafia-unity-F/Logs/` que celui copié ici : INTERDIT.
