# Dossier du juge données — ㉚ La chaîne : « les routes » ET leurs gestes (entretenir / reconstruire) — maquette — 2026-11-11

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-donnees/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/chaine-appro-30/maquette-routes-2026-11-11/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (`mesures/` existe, vide).

## Mode : maquette (deux côtés : B = back, M = maquette ; pas de front pour ce cadre)

## L'écran
- **Nom** : ㉚ « La chaîne — les routes » + ses gestes : la liste de la chaîne d'approvisionnement défilée jusqu'à la section des ROUTES, et les deux feuilles d'action « entretenir une liaison » / « reconstruire une route » (leurs refus et leur après-geste).
- **Ce qu'on vient y faire** : lire l'état de chaque route (en préparation, ouverte, saturée, coupée ; usure ; délai avant rupture ; en reconstruction) ET agir : entretenir une liaison, reconstruire une route, choisir un mode, voir le coût, essuyer un refus.
- **Domaine présumé** : `services/game-back/src/core_loops/supply_chain/` (`supply-chain.controller.ts`, service de projection du graphe) et les routes d'ACTION du domaine (`POST …/legs/:legId/maintain`, `POST /operational/routes/:id/rebuild`), plus le nom des bâtiments par `GET /v1/me/buildings` (route du joueur, `citysim/district_interior/player-buildings.controller.ts`) — le juge vérifie et complète.

## Question
**La maquette montre-t-elle quelque chose SANS source (dessiné, non servi), ou ignore-t-elle une donnée servie ?** Rends **RATIFIABLE | NON**, avec la table de couverture recomptée par script (|B| + |M non appariés| = lignes, trois comptes et somme, contrôle négatif rouge).

## Maquette (M) — fichier ÉPINGLÉ par git, jamais l'arbre de travail
- Dépôt : `/home/erutheone/project/atelier3d-mafia-C1` · branche `atelier/chaine-gestes-30-2026-11-11` · **commit `17803d1ee9609afa53397d6bc247bdee141a24f2`** (empile les gestes sur la branche des routes).
- Lecture : `git -C /home/erutheone/project/atelier3d-mafia-C1 show 17803d1:ecrans-brennar-6.html` (**2,7 Mo, 170 cadres** : redirige vers un fichier de TON dossier `mesures/`, jamais en entier à l'écran).
- **Cadres à juger, repérés par le LIBELLÉ de l'étiquette** (index 0-based indicatifs) : « **㉚ La chaîne — les routes (la liste défilée jusqu'aux routes) — GET /v1/supply-chain/graph routes[] + GET /v1/me/buildings** » (159) ; puis les dix cadres de gestes : « **㉚ Entretenir une liaison — …** » : « la feuille (la grande décision du jour est libre) » (160), « … est prise » (161), « refusé : pas assez d'argent » (162), « refusé : un entretien est déjà en cours » (163), « après le geste : « en entretien » » (164) ; « **㉚ Reconstruire une route — …** » : « la feuille (… libre) » (165), « … prise » (166), « refusé : une reconstruction est déjà en cours » (167), « refusé : la catégorie est confiée à un lieutenant » (168), « après le geste : « En reconstruction » » (169). **N'inventorie QUE ces 11 cadres** (le cadre 154 « La chaîne vue du graphe » est un autre cadre, déjà jugé).

## Back (B) — mesurable sur la pile ET lisible dans le code
- **Route** : `GET /v1/supply-chain/graph` — clés de `routes[]` attendues d'après le contrôleur : `state`, `sinuosity_stress_bucket`, `time_to_collapse_bucket`, `rebuilding` (+ identifiants) ; `legs[].leg_id`. À VÉRIFIER, jamais recopié. Code : `/home/erutheone/project/mafia-clean-city`, cumul back `74c5a0b0` (`git show 74c5a0b0:<chemin>`).
- **Mots servis des bandes** : `lot/chaine-bandes-2` @`1845e0e8`, contenu dans le cumul `74c5a0b0` (`string_table.ts`, clés `appro.*`). **Mots NEUFS ratifiés mais PAS encore servis** (TD-1038) : state « En préparation / Ouverte / Saturée / Coupée », rebuilding « En reconstruction », titre « Les routes », `legs[].maintaining` « en entretien », mots des feuilles : ils sont dans le cadre, mais **0 occurrence dans le `string_table` servi** : c'est attendu, vérifie-le (contrôle positif sur une clé `appro.*` qui, elle, est servie) et classe en ASSUMÉ.
- **Pile locale** : `X-Server-Build` observé : **8d0184a4**. **Relève-le AVANT et APRÈS tes mesures dans `mesures/`.** Dis si le module `core_loops/supply_chain/` et le `string_table.ts` diffèrent entre `8d0184a4` et `74c5a0b0` (`git diff --name-only`, contrôle positif sur un fichier qui diffère).
- **Mesure réelle** : comptes JETABLES frais (`jd5-…`) par `POST /v1/auth/signup` (Idempotency-Key requis, jeton à `payload.data.access_token`) puis `POST /v1/session/open` ; `GET /v1/supply-chain/graph` et `GET /v1/me/buildings`. `routes[]` est probablement vide sur compte neuf : DIMENSIONNE par de VRAIES actions de joueur sur TON compte (construire / ouvrir une route) ou marque DÉDUIT. Mesure aussi le CORPS de réponse de chaque action (modes acceptés, refus : codes et textes, après-geste) et confronte chaque cadre de geste à ces corps (ligne par information : mode, coût, refus, après-geste). Cherche si chaque valeur possible de `state` (4) et de chaque bande est atteignable ; une valeur non reproductible se marque non vérifiée avec ce qui la trancherait.
- **INTERDITS** : redémarrer, reconstruire, migrer ou modifier la pile ; toucher aux comptes existants ; **tout POST d'action sur un objet qui n'est pas propre à ton compte jetable** (les POST `…/maintain` et `…/rebuild` sont tes ACTIONS joueur : tu peux les tenter, et seulement sur une liaison / route de TON compte, si le code montre qu'elles sont ownership-scopées ; sinon DÉDUIT ; l'argent, l'état d'un autre joueur et la « grande décision du jour » ne se touchent pas) (les événements ambient/live sont city-global : un juge précédent en a consommé deux pour tout le monde) ; ne pose rien de partagé. **Masque tout jeton et mot de passe dans `mesures/`** (`Bearer ***`).
- **B⁻** : colonnes des tables de routes (`services/game-back/src/db/schema/`) que la projection ne porte pas.

## Écarts ASSUMÉS — re-vérifie, ne rouvre pas
| information | raison |
|---|---|
| le jeu de **5 routes** dessiné est fictif mais cohérent avec le back (comme au cadre 154) | convention de maquette ; vérifie la COHÉRENCE (cardinal, états, bandes dessinés atteignables au back) |
| `legs[].leg_id` non dessiné | dette nommée |
| les **coûts par mode** montrés par les feuilles sont les valeurs PAR DÉFAUT des tunables (le coût réel n'est pas servi) ; le **refus « Pas assez d'argent pour ça. »** ; `legs[].maintaining` (« en entretien ») ; les mots des feuilles | demandés à BACK-1, pas encore servis ; vérifie que le back ne sert PAS ces informations (0 clé) et que les valeurs par défaut dessinées = celles des tunables au code |
| les mots neufs (état des routes, « En reconstruction », titre « Les routes ») ne sont pas encore servis | TD-1038 |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation du chantier ;
- **tout rapport ou mesure de juge précédent : INTERDITS** — `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/**` SAUF ce répertoire (en particulier `…/chaine-appro-30/maquette-2026-11-11/` et `…/maquette-t2-2026-11-11/`), `Tools/juge-visuel/**` ;
- les « choix » non sourcés : s'ils ne sont pas dans le dossier, ils n'existent pas.

## Format du rapport
Celui du mandat (`rapport.md`) : verdict **RATIFIABLE | NON** en tête, trois comptes + somme recomptés par `mesures/controle-arithmetique.py` (positif rc=0, négatif rc≠0), chaque ligne de B : commande + sortie (ou DÉDUIT avec la raison), « passé à côté ? » séparé des défauts, section « non vérifié » obligatoire, X-Server-Build avant/après.
