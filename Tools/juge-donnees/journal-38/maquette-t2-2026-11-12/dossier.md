# Dossier du juge données — ㊳ Le journal REDESSINÉ — maquette, tour 2 — 2026-11-12

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-donnees/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/journal-38/maquette-t2-2026-11-12/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (`mesures/` existe, vide).

## Mode : maquette (deux côtés : B = back, M = maquette ; le front de cet écran n'existe pas)

## L'écran
- **Nom** : ㊳ « Le journal » — la page du journal de la ville (ce qui se dit ce matin : brèves de quartier et unes du journal), et son état APRÈS que le joueur a posé le geste « Y PRÊTER ATTENTION » (4 bandes : `full | reduced | minimal | none`).
- **Ce qu'on vient y faire** : lire ce qui se dit, « prêter attention » à une brève, voir ce que ce geste a produit.
- **Domaine présumé** (le juge vérifie et complète, il ne s'y limite pas) : `services/game-back/src/operational/ambient/` (`ambient.controller.ts`, `ambient-attend.service.ts`, `ambient-attend-view.ts`, `ambient.projection.service.ts`, `ambient-micro-event.repository.ts`) ; `services/game-back/src/news/` (`news.controller.ts`, `news.projection.service.ts`) ; les clés `ambient.*`, `journal.*`, `news_beat.*` de `services/game-back/src/i18n/string_table.ts` (FR + EN).
- **Routes à confronter** : `GET /v1/ambient/feed` · `GET /v1/news/feed` · `GET /v1/random-world/active` · `POST /v1/ambient/attend/:id` (voir « Interdits » pour ce dernier).

## Question
**La maquette montre-t-elle quelque chose SANS source (dessiné, non servi), ou ignore-t-elle une donnée servie ?** Rends **RATIFIABLE | NON**, avec la table de couverture recomptée par script (|B| + |M non appariés| = lignes ; trois comptes et somme ; contrôle négatif rouge).

## Maquette (M) — fichier ÉPINGLÉ par git, jamais l'arbre de travail
- Dépôt : `/home/erutheone/project/atelier3d-mafia` · branche `master` · **commit `a3e02c2a6b2a1c53f5ba709d3f2b79dc7da0707e`**.
- Lecture : `git -C /home/erutheone/project/atelier3d-mafia show a3e02c2a:ecrans-brennar-6.html > <fichier de TON dossier mesures/>` (**~2,6 Mo, 171 cadres** : ne l'affiche jamais en entier).
- **Cadres, repérés par le LIBELLÉ de l'étiquette** (`<div class="etiquette">`, les index 0-based sont indicatifs ; vérifie-les) :
  « **Le journal — ce qui se dit ce matin** » (125, AVANT le geste) ; « **Le journal — après « Y PRÊTER ATTENTION » · bande full** » (155) ; « … **bande reduced** » (156) ; « … **bande minimal** » (157) ; « … **bande none** » (158) ; « **Le journal — les trois fraîcheurs** » (170, cadre NEUF). **N'inventorie que ces six cadres.** Nomme-les dans ton rapport par libellé ET index trouvé.
- Pas de rendu PNG fourni : la source HTML est la maquette. (Il existe dans l'atelier un `generateur-journal.py` marqué PÉRIMÉ : ne le lis pas, la page fait foi.)

## Back (B) — mesurable sur la pile, ET lisible dans le code
- **Code de référence** : le cumul back `gate/cumul-2026-11-14` @`44a645a286cbd3c982d500fe0a590230dd6d8c80`, worktree **en LECTURE SEULE** `/home/erutheone/project/mafia-cumul-1114` (tu n'y écris rien, tu n'y changes pas de branche). Dépôt principal : `/home/erutheone/project/mafia-clean-city` (`git show 44a645a2:<chemin>`).
- **Pile locale** : `http://localhost/v1/...`. `X-Server-Build` observé avant ce dossier : **8d0184a4** (la pile n'est PAS au SHA du cumul). **Relève `X-Server-Build` AVANT et APRÈS tes mesures (dans `mesures/`).** Mesuré par l'orchestrateur : entre `8d0184a4` et `44a645a2`, seul `services/game-back/src/i18n/string_table.ts` diffère parmi `operational/ambient/`, `news/` et `i18n/` ; **à toi de le re-mesurer** (`git diff --name-only`, avec contrôle positif sur un fichier qui diffère) et de dire, pour chaque ligne de B, si elle est mesurée sur la pile (build 8d0184a4) ou lue au cumul (DÉDUIT). Les libellés servis se lisent dans le `string_table.ts` **du cumul** (FR + EN).
- **Mesure réelle** : compte JETABLE frais (`jd3-…`) par `POST /v1/auth/signup` (Idempotency-Key requis ; jeton dans `payload.data.access_token`) puis `POST /v1/session/open` ; GET des trois routes ci-dessus. Cherche si le corps change avec la bande de fraîcheur (`fresh|settling|fading`) et avec les 6 `descriptor_i18n_key`.
- ⚠️ **Piège outil (mesuré)** : un hook réécrit `curl` en `rtk curl`, et une sortie redirigée n'est PAS le corps de la réponse (537 octets écrits pour `Content-Length: 995`). Utilise `rtk proxy curl` ou Python (`urllib`), et **compare la taille écrite à `Content-Length`** pour chaque corps.
- **Assistance « PAR JOUEUR »** : à ce jour, `POST /v1/ambient/attend/:id` agit sur un événement de la VILLE (global : tous les joueurs voient le même événement, et un geste le consomme pour tous). Un lot back en cours (`lot/ambient-attend-par-joueur`, commit `d1f93ebe`, dépôt `/home/erutheone/project/mafia-clean-city`, **PAS dans le cumul `44a645a2`, PAS sur la pile**) rend l'assistance par joueur. Décris B **tel que servi aujourd'hui** (pile + cumul) ; tu peux lire ce lot à titre INFORMATIF, marqué « hors cumul — DÉDUIT », et dire ce qui change pour la maquette (ce qui reste vrai, ce qui devient possible), sans le mêler au compte de B.
- **Interdits** : redémarrer, reconstruire, migrer ou modifier la pile ; toucher aux comptes existants ; **ne fais AUCUN `POST /v1/ambient/attend/:id`** : les événements du journal sont globaux, un geste de ta part les consommerait pour tous les joueurs de la pile partagée. La réponse du POST se DÉDUIT du code (contrôleur, service, vue, specs E2E) et se marque DÉDUIT avec la raison. Aucune action hors du domaine du journal. **Masque tout jeton et mot de passe dans `mesures/`** (`Bearer ***`) ; n'écris jamais le jeton dans un fichier versionnable.
- **B⁻** : colonnes des tables du domaine ambient / news / random-world (`services/game-back/src/db/schema/`) que la projection des routes ne porte pas.

## À RE-VÉRIFIER — dix écarts relevés sur la maquette de la veille
La maquette a été redessinée depuis. Ces dix points viennent d'un tour sur l'ANCIENNE page ; **tu n'en connais ni la preuve ni le verdict, et tu ne dois pas les chercher** (le rapport est interdit). Établis ton inventaire de ZÉRO sur les six cadres, d'abord ; **puis**, pour chacun des dix, dis dans une table à part s'il est **FERMÉ** (la nouvelle maquette ne le porte plus : preuve), **OUVERT** (toujours là : preuve), **REFORMULÉ** (l'écart a changé de forme), ou **NON APPLICABLE**. Un écart que tu retrouves hors de cette liste est NEUF.
| id | l'affirmation à contrôler |
|---|---|
| E1 | les brèves de la page portent des PHRASES entières dessinées, alors que le back sert un descripteur court par brève (`descriptor_i18n_key`) |
| E2 | les `kind` des brèves (et la clé i18n de la une) dessinés ne sont pas ceux du back (6 valeurs d'enum fermé ; namespace servi à lire) |
| E3 | l'étiquette d'angle des unes (« fait divers ») n'est pas une valeur servie par `frame_tag_i18n_key` |
| E4 | un compteur « à la une » dessiné sans source de compte (la route `news/feed` ne sert pas de total) |
| E5 | les compteurs dessinés ne sont pas cohérents avec le nombre d'éléments rendus dans le même cadre |
| E6 | les noms de quartier dessinés ne sont pas servis par les routes du journal (slug seulement) |
| E7 | après le geste, la liste, les compteurs et la fraîcheur sont dessinés identiques à avant, alors que la route ne ressert plus l'événement une fois consommé |
| E8 | le bouton d'assistance est unique (global) alors que la route prend UN événement par id ; la maquette ne dit pas lequel |
| E9 | la 3ᵉ bande de fraîcheur (`fading`) n'est jamais dessinée |
| E10 | la pastille de couleur répète la fraîcheur sans 2ᵈ information (gravité non servie par les routes du journal) |

## Décisions déjà prises — à INVENTORIER, classer ASSUMÉ avec leur source, vérifier que la maquette les applique ; NE PAS rouvrir
| décision | portée |
|---|---|
| la pastille de couleur = la fraîcheur (classe C, consignée) | E10 |
| le compteur « à la une » = le compte de la page, en attendant un total servi | E4 |
| pas de phrases riches : on n'affiche que les 6 descripteurs servis | E1 |
| le bouton d'assistance reste ALLUMÉ après le geste s'il reste une brève à assister | E7/E8 |
| la brève visée est marquée par sa FORME (pas par un nom ni une couleur seule) | E8 |
Tu **vérifies** que chaque cadre applique bien ces décisions (une décision non appliquée par la maquette est un écart) ; tu ne contestes pas la décision.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation du chantier, les messages de commit (sauf le SHA cité), les `LISEZ-MOI.md` voisins ;
- tout rapport ou mesure de juge précédent (visuel ou données) : `Tools/juge-visuel/**`, `Tools/juge-donnees/**` (y compris `Tools/juge-donnees/journal-38/maquette-2026-11-11/`) et `/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/**` : INTERDITS ;
- les « choix » non sourcés : s'ils ne sont pas dans ce dossier, ils n'existent pas.

## Format du rapport
Celui du mandat (`rapport.md`), avec en tête le **verdict RATIFIABLE | NON** en une phrase et les trois comptes + somme recomptés par `mesures/controle-arithmetique.py` (positif rc=0, négatif rc≠0). Chaque ligne de B : commande + sortie collée (ou DÉDUIT avec la raison). Ensuite : (1) la table de couverture ; (2) la table des dix écarts (FERMÉ/OUVERT/REFORMULÉ/NON APPLICABLE) ; (3) les écarts NEUFS (dessiné sans source ; servi non dessiné = « passé à côté ? », classé par intérêt joueur) ; (4) la section « non vérifié » obligatoire. « Passé à côté ? » reste séparé des défauts.
