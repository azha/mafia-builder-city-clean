# Dossier du juge données — ㉚ La chaîne vue du graphe — maquette — TOUR 2 BORNÉ — 2026-11-11

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-donnees/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/chaine-appro-30/maquette-t2-2026-11-11/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (`mesures/` existe, vide).
> **Tu es un juge NEUF : tu n'as pas fait le tour précédent. Tu mesures tout toi-même, sur la pile, sur la maquette épinglée.**

## Mode : maquette (deux côtés : B = back, M = maquette ; pas de front)

## L'écran
- **Nom** : ㉚ « La chaîne vue du graphe » (Chaîne d'appro).
- **Ce qu'on vient y faire** : voir la chaîne d'approvisionnement du joueur comme un graphe de bâtiments reliés (qui est bloqué, où la dette s'accumule), à partir de la route `GET /v1/supply-chain/graph`.
- **Domaine** : `services/game-back/src/core_loops/supply_chain/` ; le nom d'un bâtiment peut venir d'une autre route du joueur (cherche : grep du mot « building » dans les contrôleurs joueur, `citysim/district_interior/`).

## TOUR BORNÉ — la question
Un tour précédent a fait corriger la maquette. L'atelier DÉCLARE quatre corrections. **Tu juges UNIQUEMENT ces quatre, chacune contre la mesure sur la pile, plus une question de régression** ; tu ne rouvres ni les écarts assumés ci-dessous, ni les autres lignes de la couverture. Rends **RATIFIABLE | NON** avec la table recomptée par script (comptes + somme = lignes).

| # | correction déclarée par l'atelier (À VÉRIFIER, pas à croire) | ce que tu mesures |
|---|---|---|
| P1 | la flèche de refoulement est dessinée sur **1 maillon sur 5** et suit `has_arrow` | sur un corps réel de la route : quels nœuds ont `has_arrow` vrai ? Est-ce bien ce que la maquette dessine, et la maquette le dit-elle comme une règle liée à la clé `has_arrow` (pas à la bande) ? La cause d'un blocage (nœud sans flèche) est-elle bien traitée sans inventer une clé ? |
| P2 | la maquette dessine **5 maillons + 4 liaisons** dans une liste qui défile | sur compte neuf et sur compte dimensionné, combien de nœuds et de legs la route sert-elle ? Les cardinaux dessinés sont-ils compatibles ? Le conteneur défile-t-il (plus de `overflow:hidden` qui coupe) ? |
| P3 | l'**ordre** est un tri CLIENT, écrit comme règle d'affichage : « bande de la pire à la meilleure, puis nom » | le back donne-t-il un ordre ? (stable ou non, à mesurer deux fois) ; la règle écrite ne dépend-elle que de clés servies (`bucket`) + du nom (voir P4) ? Les 4 valeurs possibles de `bucket` sont-elles toutes ordonnées par la règle ? |
| P4 | les **noms** de bâtiments sont servis par une route du joueur (jointure `building_id`), avec un repli `building.type.*` | la route que l'atelier nomme existe-t-elle sur la pile, donne-t-elle un nom pour CHAQUE `building_id` rencontré dans nodes/legs (compte), de quelle forme (`I18nRef` ? clé à résoudre ?), et le repli `building.type.*` désigne-t-il une clé réelle ? |
| P5 | **régression** : la correction n'a changé que le cadre ㉚ (diff atelier limité à ce cadre : 28 lignes) | la maquette dessine-t-elle maintenant une information SANS source (un scalaire en dur, une clé inexistante) qu'elle ne dessinait pas avant ? Compare le cadre aux champs servis ; ne compare PAS à un rapport précédent (tu n'en as pas). |

## Maquette (M) — fichier ÉPINGLÉ par git, jamais l'arbre de travail
- Dépôt : `/home/erutheone/project/atelier3d-mafia-c2` · branche `atelier/chaine-appro-graphe-2026-11-11` · **commit `943ee47b9a9303d4d2e8fc5ada917087542da374`** (parent `ec35deec`).
- Lecture : `git -C /home/erutheone/project/atelier3d-mafia-c2 show 943ee47b:ecrans-brennar-6.html` (fichier de ~570 Ko : redirige vers un fichier de TON dossier `mesures/`, n'affiche pas tout).
- **Repère du cadre** : le `<div class="cadre">` dont l'étiquette est « **㉚ La chaîne vue du graphe — GET /v1/supply-chain/graph SEUL (nodes + legs), sans rang ni progression** » (index 154 en 0-based dans cette page de 155 cadres ; repère-le par le LIBELLÉ). N'inventorie que CE cadre.

## Back (B)
- **Route** : `GET /v1/supply-chain/graph` — `services/game-back/src/core_loops/supply_chain/supply-chain.controller.ts` et le service qui la projette (dans `/home/erutheone/project/mafia-clean-city`, branche `main`, commit `6040a213` ; lis `git show 6040a213:<chemin>`). Clés attendues d'après le contrôleur : `nodes`, `legs`, `routes` — à vérifier, pas à recopier.
- **Mots des bandes** : clés `appro.pression.*` / `appro.dette.*` dans la branche `lot/chaine-bandes` @`f9d92251` (worktree `/home/erutheone/project/mafia-lot-chaine`). Elles ne sont **pas encore servies** par la pile (tranche suivante) : **écart ASSUMÉ, ne pas rouvrir**.
- **Stack locale** (`docker ps` du 2026-11-11, à relancer toi-même avant toute mesure) :

      mafia-clean-city-game-back-1 Up 13 hours (healthy)
      mafia-clean-city-traefik-1 Up 27 hours
      mafia-clean-city-docker-socket-shim-1 Up 27 hours
      mafia-clean-city-bo-back-1 Up 27 hours (healthy)
      mafia-clean-city-bo-front-1 Up 27 hours (healthy)
      mafia-clean-city-pg-1 Up 27 hours (healthy)
      mafia-clean-city-redis-1 Up 27 hours (healthy)

  `X-Server-Build: 35bdd6cb` (≠ `6040a213` ; si tu en dépends, dis si le module du domaine diffère entre les deux). La route répond 401 sans jeton.
- **Interdits** : redémarrer, reconstruire, migrer ou modifier la pile ; toucher aux comptes existants. Tu peux créer des comptes JETABLES (`jd2-…`) par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open`, lire, et — pour dimensionner un graphe — utiliser les **vraies actions joueur** du domaine. **Masque tout jeton/mot de passe dans `mesures/`** (`Bearer ***`).
- Un graphe sur compte neuf est probablement minimal : DIMENSIONNE ou marque DÉDUIT.

## Écarts ASSUMÉS — NE PAS ROUVRIR
| information | raison |
|---|---|
| `routes[]` et `legs[].leg_id` non dessinés | dette nommée, cadre suivant |
| les mots `appro.pression.*` / `appro.dette.*` non servis par la pile | tranche suivante (`lot/chaine-bandes`) |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation du chantier ;
- **tout rapport ou mesure de juge précédent : INTERDITS** — `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/**` SAUF ce répertoire, `Tools/juge-visuel/**`, et l'ancien répertoire `…/chaine-appro-30/maquette-2026-11-11/` en particulier ;
- les parties du cadre autres que les cinq points ci-dessus.

## Format du rapport
Celui du mandat (`rapport.md`), avec en tête : le **verdict RATIFIABLE | NON** en une phrase, puis **une ligne par point P1-P5** (VÉRIFIÉ | CONTREDIT | NON VÉRIFIABLE + la preuve), puis la table de couverture du cadre (une ligne par information) avec les trois comptes et la somme recomptés par `mesures/controle-arithmetique.py`. Le compte se prend dans la table, jamais dans ta synthèse.
