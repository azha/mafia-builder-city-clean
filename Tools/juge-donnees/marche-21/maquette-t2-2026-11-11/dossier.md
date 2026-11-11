# Dossier du juge données — ㉑ LE MARCHÉ — maquette — TOUR 2 BORNÉ — 2026-11-11

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-donnees/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/marche-21/maquette-t2-2026-11-11/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (`mesures/` existe, vide).
> **Tu es un juge NEUF : tu n'as pas fait le tour précédent. Tu mesures tout toi-même.**

## Mode : maquette — LECTURE DU CODE SEULEMENT (B = DÉDUIT)
Le back de ce lot n'est pas sur la pile locale : aucune mesure de corps de réponse. Chaque ligne de B porte **DÉDUIT** + `fichier:ligne` (projection TS, mapping, contrainte de valeurs), recevable parce que la pile ne porte pas ce lot. **Interdits : monter, redémarrer, reconstruire ou modifier la pile Docker ; lancer le back ; toucher à une base.**

## L'écran
- **Nom** : ㉑ « Le marché » (tableau du Verge d'Or).
- **Ce qu'on vient y faire** : lire, quartier par quartier, où le marché de la ville est tendu ou calme, avec des voyants (allumé / éteint / ash), sans agir.
- **Domaine** : `services/game-back/src/operational/market/` (route `GET /v1/me/market/lanes`), noms de quartiers `GET /v1/world/districts` (publique) ; 5 specs E2E existent (lecture seule, ne les exécute pas).

## TOUR BORNÉ — la question
Un tour précédent a fait corriger la maquette. L'atelier DÉCLARE quatre corrections. **Tu juges UNIQUEMENT ces quatre + une question de régression**, chacune par la mesure sur la maquette épinglée et sur le code du back ; tu ne rouvres rien d'autre. **Exclus de ce tour : la liste « passé à côté ? » et les lots back** (ne les produis pas). Rends **RATIFIABLE | NON**, avec la table de couverture du cadre recomptée par script (|B| + |M non appariés| = lignes, contrôle négatif rouge).

| # | correction déclarée (À VÉRIFIER, pas à croire) | ce que tu mesures |
|---|---|---|
| P1 | la colonne **ash** est **ÉTEINTE partout** et nommée « **HORS DU TABLEAU** » | dans les cadres 101-106 et 146 (y compris la grille du tableau de région 104) : AUCUNE case ash allumée (donne les classes CSS/les valeurs de chaque case ash) ; le libellé « HORS DU TABLEAU » est-il EXACTEMENT celui de la clé `marche.titre.hors_du_tableau` (`string_table.ts` du lot, FR et EN) ? Le texte apparaît-il dessiné ? (le fait que le back puisse servir une valeur ash allumée par une voie staff est un écart ASSUMÉ, ne pas rouvrir) |
| P2 | le cadre 146 ne porte plus que la **1re phrase** (« une ligne qui tient » et la 2ᵉ phrase retirées) | texte restant du cadre 146 comparé phrase à phrase aux mots ratifiés ; reste-t-il un texte retiré par les mots ratifiés ? |
| P3 | « **3 lignes sur 72** » : nombres en chiffres | le texte dessiné correspond-il à ce que rend la clé `marche.phrase.bilan_lignes` (gabarit, ICU) ? Reste-t-il ailleurs dans ㉑ un nombre écrit en lettres là où une clé le rend en chiffres ? |
| P4 | les cadres **104 et 105** sont marqués « hors lot · TD-1040 » dans leur étiquette | l'étiquette le dit-elle bien ; **n'inventorie pas leur contenu** (hors lot) ; mais un texte hors lot dessiné dans un AUTRE cadre de ㉑ (101-103, 106, 146) sans clé est, lui, dans le périmètre |
| P5 | **régression** : la correction n'a changé que 12 lignes d'un fichier | la maquette dessine-t-elle maintenant, dans les cadres de ㉑ HORS 104/105, une information SANS source (scalaire en dur, clé inexistante) qu'elle ne dessinait pas avant ? |

## Maquette (M) — fichier ÉPINGLÉ par git, jamais l'arbre de travail
- Dépôt : `/home/erutheone/project/atelier3d-mafia-C1` · branche `atelier/marche-21-mots-ratifies-2026-11-11` · **commit `e364496faf8cf0491ce565117bd9208c3d432d1c`** (descend de `4ae50cca`).
- Lecture : `git -C /home/erutheone/project/atelier3d-mafia-C1 show e364496:ecrans-brennar-6.html` (**2,6 Mo, 155 cadres** : redirige vers un fichier de TON dossier `mesures/`, jamais en entier à l'écran).
- **Cadres de ㉑, repérés par le LIBELLÉ de l'étiquette** (index 0-based indicatifs) : « Le tableau — trois voyants sur soixante-douze » (101) · « Une ligne recoupée — Dépôt-Est × crick » (102) · « Voyant éteint — et c'est un renseignement » (103) · « Le tableau de région — six genres d'endroit … hors lot, à venir · TD-1040 » (104) · « Le mur — vous ne dites rien, on ne dit rien … hors lot, à venir · TD-1040 » (105) · « Ce qui manque encore » (106 ; les autres cadres de même libellé sont d'AUTRES écrans) · « ㉑ · la tuile Ash — l'éclat des prismes » (146). **Hors lot : cadres 109 et 110 (TD-1040).**
- **Mots ratifiés** (FR/EN, domaine `marche.*`, 31 clés) : `/home/erutheone/project/mafia-clean-city/scratchpad/MOTS-MARCHE-21.md` — table décisionnelle à CONFRONTER à la maquette ET au `string_table`.

## Back (B) — DÉDUIT
`lot/marche-mots` @`163402f11591f8a321fe67ab0c2df4e3f1b64fdc`, worktree `/home/erutheone/project/mafia-lot-mots` (lecture seule ; ou `git -C … show 163402f1:<chemin>`) : `services/game-back/src/operational/market/market.controller.ts`, `services/game-back/src/i18n/string_table.ts` (31 clés `marche.*`, FR+EN). Valeurs possibles lues à la source qui les contraint.

## Écarts ASSUMÉS — ne pas rouvrir
| information | raison |
|---|---|
| le back peut servir une valeur ash allumée (voie staff / enum) alors que la boucle joueur ne l'allume jamais | TD-966, décision f2 : la colonne reste éteinte et nommée |
| cadres 104, 105, 109, 110 | hors lot (TD-1040) |
| `routes` d'autres domaines, nombres de la grille de 72 lignes | hors cadre |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation du chantier ;
- **tout rapport ou mesure de juge précédent : INTERDITS** — `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/**` SAUF ce répertoire (en particulier `…/marche-21/maquette-2026-11-11/`), `Tools/juge-visuel/**` ;
- la liste « passé à côté ? » et les lots back : hors de ce tour.

## Format du rapport
Celui du mandat (`rapport.md`), avec en tête : le **verdict RATIFIABLE | NON** en une phrase, puis **une ligne par point P1-P5** (VÉRIFIÉ | CONTREDIT | NON VÉRIFIABLE + preuve `fichier:ligne`), puis la table de couverture du périmètre (sans 104/105) avec les trois comptes et la somme recomptés par `mesures/controle-arithmetique.py` (positif rc=0, négatif rc≠0). Chaque ligne de B : DÉDUIT. Section « non vérifié » obligatoire (B jamais mesuré ; ce qui trancherait : pile avec le lot, compte jetable, corps réel).
