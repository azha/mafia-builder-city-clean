# Dossier du juge données — ㉚ La chaîne vue du graphe — maquette — 2026-11-11

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-donnees/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/chaine-appro-30/maquette-2026-11-11/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (`mesures/` existe, vide).

## Mode : maquette (deux côtés : B = back, M = maquette ; le front n'existe pas pour cet écran)

## L'écran
- **Nom** : ㉚ « La chaîne vue du graphe » (Chaîne d'appro).
- **Ce qu'on vient y faire** : voir la chaîne d'approvisionnement du joueur comme un graphe de bâtiments reliés (qui pousse, qui est bloqué, où la dette s'accumule), à partir d'UNE seule route.
- **Domaine présumé** : `services/game-back/src/core_loops/supply_chain/` (contrôleur `supply-chain.controller.ts`) — le juge vérifie et complète (grep du mot du domaine dans tous les contrôleurs).
- **QUESTION BORNÉE** : la maquette montre-t-elle quelque chose **sans source** (dessiné, non servi), ou **ignore-t-elle une donnée servie** (disponible, non dessinée) ? Rends **RATIFIABLE** ou **NON**, avec la table de couverture recomptée par script (les trois comptes + la somme = nombre de lignes).

## Maquette (M) — fichier ÉPINGLÉ par git, jamais l'arbre de travail
- Dépôt : `/home/erutheone/project/atelier3d-mafia-c2` · branche `atelier/chaine-appro-graphe-2026-11-11` · **commit `ec35deecc32518025d4bf9ce8ffd00d736cfd461`**.
- Lecture : `git -C /home/erutheone/project/atelier3d-mafia-c2 show ec35deec:ecrans-brennar-6.html` (fichier de ~570 Ko : redirige vers un fichier de ton dossier `mesures/`, n'affiche pas tout).
- **Repère du cadre** : le `<div class="cadre">` dont l'étiquette est « **㉚ La chaîne vue du graphe — GET /v1/supply-chain/graph SEUL (nodes + legs), sans rang ni progression** » (index 154 en 0-based, 155ᵉ des 155 cadres de la page). Repère-le par son LIBELLÉ, pas par l'index ; n'inventorie que CE cadre (les autres cadres de la page ne sont pas ton sujet).
- Pas de rendu PNG fourni : la source HTML est la maquette ; tu peux la rendre toi-même si utile (Chrome sans tête), ce n'est pas requis.

## Back (B)
- **Route** : `GET /v1/supply-chain/graph` — `services/game-back/src/core_loops/supply_chain/supply-chain.controller.ts` (à lire sur le commit main `6040a213` de `/home/erutheone/project/mafia-clean-city`, lignes ~122-150). Clés attendues d'après ce contrôleur : `nodes {bucket, has_arrow, arrow_to_building_id}`, `legs {debt_bucket, bypassed}`, `routes`. À vérifier, pas à recopier.
- **Mots des bandes** : clés `appro.pression.*` / `appro.dette.*` (8 mots ratifiés) dans la branche `lot/chaine-bandes` @`f9d92251` (worktree `/home/erutheone/project/mafia-lot-chaine`, fichier `services/game-back/src/i18n/string_table.ts`). Elles ne sont PAS forcément servies par la pile locale : dis-le.
- **Stack locale** (`docker ps` relevé le 2026-11-11, à relancer par toi avant toute mesure) :

      mafia-clean-city-game-back-1 Up 12 hours (healthy)
      mafia-clean-city-traefik-1 Up 27 hours
      mafia-clean-city-docker-socket-shim-1 Up 27 hours
      mafia-clean-city-bo-back-1 Up 27 hours (healthy)
      mafia-clean-city-bo-front-1 Up 27 hours (healthy)
      mafia-clean-city-pg-1 Up 27 hours (healthy)
      mafia-clean-city-redis-1 Up 27 hours (healthy)

  La route répond 401 sans jeton (elle existe sur cette pile). **Interdits : redémarrer, reconstruire, migrer, ou modifier la pile ; toucher aux comptes existants.** Tu peux créer des comptes JETABLES (`jd-…`) par `POST /v1/auth/signup` puis `POST /v1/session/open`, et lire. Si le build de la pile (`X-Server-Build`) n'est pas celui de `6040a213`, écris-le : B est alors partiellement DÉDUIT du code, marqué comme tel.
- **Compte frais, corps à vide** : un graphe sur compte neuf est probablement vide ou minimal. Si c'est le cas, DIMENSIONNE (`Tools/seed_*.mjs` ou une action réelle de joueur qui construit une chaîne) et re-mesure ; sinon marque les valeurs `DÉDUIT`. **Ne mesure aucun jeton ni mot de passe dans un fichier de `mesures/` : masque-les** (`Authorization: Bearer ***`).
- **B⁻** : colonnes des tables du domaine (`services/game-back/src/db/schema/`) que la projection de cette route ne porte pas — à lister.

## Écarts ASSUMÉS déjà connus (re-vérifie, ne recopie pas)
| information | raison | source |
|---|---|---|
| le **nom de bâtiment** n'est pas servi : la maquette porte un emplacement « libellé à servir » | ticket BACK-1 en cours | décision f2 11/11 — vérifie que l'emplacement est bien marqué comme tel dans la maquette |
| les **`routes`** de la réponse ne sont pas dessinées | dette | décision f2 11/11 — vérifie ce que `routes` contient et si c'est bien tout ce qui manque |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation du chantier ;
- les rapports des juges précédents, visuels ou données (`Tools/juge-visuel/**`, `Tools/juge-donnees/**` sauf ce dossier) ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.

## Format du rapport
Celui du mandat (`rapport.md`), avec en tête : le **verdict RATIFIABLE | NON** en une phrase, et les trois comptes + somme du contrôle d'arithmétique. Une ligne par information dans UNE table de couverture ; le compte se prend dans la table, jamais dans ta synthèse.
