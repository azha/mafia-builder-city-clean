# Dossier du juge données — ㊳ Le journal, après « Y PRÊTER ATTENTION » — maquette — 2026-11-11

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-donnees/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/journal-38/maquette-2026-11-11/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (`mesures/` existe, vide).

## Mode : maquette (deux côtés : B = back, M = maquette ; le front de cet écran n'existe pas)

## L'écran
- **Nom** : ㊳ « Le journal » — l'état d'un événement du journal APRÈS que le joueur a posé le geste « Y PRÊTER ATTENTION ».
- **Ce qu'on vient y faire** : lire le journal de la ville (ce qui se dit ce matin), « prêter attention » à un événement, et voir ce que ce geste a produit ; l'après-geste existe en quatre bandes (`full | reduced | minimal | none`).
- **Domaine présumé** : `services/game-back/src/operational/ambient/` (contrôleur `ambient.controller.ts` : `GET /v1/ambient/feed`, `POST /v1/ambient/attend/:id`), clés i18n `ambient.apres_assister.*` — le juge vérifie et complète (grep des mots « ambient », « attend » dans tous les contrôleurs joueur).

## Question
**La maquette montre-t-elle quelque chose SANS source (dessiné, non servi), ou ignore-t-elle une donnée servie ?** Rends **RATIFIABLE | NON**, avec la table de couverture recomptée par script (|B| + |M non appariés| = lignes, trois comptes et somme, contrôle négatif rouge).

## Maquette (M) — fichier ÉPINGLÉ par git, jamais l'arbre de travail
- Dépôt : `/home/erutheone/project/atelier3d-mafia-C1` · branche `atelier/journal-38-apres-geste-2026-11-11` · **commit `2355cb4b8482347bf6d1ce2f1d8c0c8363292f94`**.
- Lecture : `git -C /home/erutheone/project/atelier3d-mafia-C1 show 2355cb4:ecrans-brennar-6.html` (**2,6 Mo, 159 cadres** : redirige vers un fichier de TON dossier `mesures/`, jamais en entier à l'écran).
- **Cadres, repérés par le LIBELLÉ de l'étiquette** (`<div class="etiquette">`, index 0-based indicatifs) : « **Le journal — ce qui se dit ce matin** » (125, la source, AVANT le geste) ; les quatre cadres neufs « **Le journal — après « Y PRÊTER ATTENTION » · bande full** » (155) · « … **bande reduced** » (156) · « … **bande minimal** » (157) · « … **bande none** » (158). N'inventorie que ces cinq cadres.
- Pas de rendu PNG fourni : la source HTML est la maquette.

## Back (B) — mesurable sur la pile, ET lisible dans le code
- **Code** : branche `dette/b2-fin-tranche-2026-11-11` @`b7e418eb`, contenue dans le cumul back `74c5a0b0` (dépôt `/home/erutheone/project/mafia-clean-city`, lis `git show 74c5a0b0:<chemin>`) : `POST /v1/ambient/attend/:id` (`services/game-back/src/operational/ambient/ambient.controller.ts`), clés `ambient.apres_assister.*` (`services/game-back/src/i18n/string_table.ts`, FR + EN). Pour chaque clé de réponse : type tel que projeté, **valeurs possibles lues à la source qui les contraint** (union TS, enum, CHECK) — notamment les quatre bandes.
- **Pile locale** : `GET http://localhost/v1/...` ; `X-Server-Build` observé avant ce dossier : **8d0184a4**. **Relève `X-Server-Build` AVANT et APRÈS tes mesures (dans `mesures/`).** Dis si le module `operational/ambient/` et le `string_table` diffèrent entre `8d0184a4` et `74c5a0b0` (`git diff --name-only`, avec contrôle positif sur un fichier qui diffère).
- **Mesure réelle** : compte JETABLE frais par `POST /v1/auth/signup` (Idempotency-Key requis ; jeton dans `payload.data.access_token`) puis `POST /v1/session/open` ; `GET /v1/ambient/feed`, puis le geste `POST /v1/ambient/attend/:id` sur un événement réel, et une 2ᵉ fois (idempotence / refus). Si le feed est vide sur compte neuf : DIMENSIONNE par une action réelle de joueur (ou un `Tools/seed_*.mjs`) ; sinon marque la ligne DÉDUIT. Cherche si le corps de réponse change selon la **bande** (`full|reduced|minimal|none`) : tente de produire chaque bande (ce qui les détermine est à lire dans le code) ; une bande non reproductible se marque non vérifiée avec ce qui la trancherait.
- **Interdits** : redémarrer, reconstruire, migrer ou modifier la pile ; toucher aux comptes existants ; aucune action hors du domaine ambient. **Masque tout jeton et mot de passe dans `mesures/`** (`Bearer ***`), comptes jetables nommés `jd3-…`.
- **B⁻** : colonnes des tables du domaine ambient (`services/game-back/src/db/schema/`) que la projection de la route ne porte pas.

## Écarts ASSUMÉS déjà connus
Aucun consigné pour ce cadre. Tout écart que tu trouves est à classer par la grille du mandat (dessiné+disponible ; dessiné sans source ; disponible non dessiné = « passé à côté ? »).

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation du chantier ;
- tout rapport ou mesure de juge précédent (visuel ou données) : `Tools/juge-visuel/**`, `Tools/juge-donnees/**` sauf ce répertoire : INTERDITS ;
- les « choix » non sourcés : s'ils ne sont pas dans le dossier, ils n'existent pas.

## Format du rapport
Celui du mandat (`rapport.md`), avec en tête le **verdict RATIFIABLE | NON** en une phrase et les trois comptes + somme recomptés par `mesures/controle-arithmetique.py` (positif rc=0, négatif rc≠0). Chaque ligne de B : commande + sortie collée (ou DÉDUIT avec la raison). « Passé à côté ? » séparé des défauts ; section « non vérifié » obligatoire.
