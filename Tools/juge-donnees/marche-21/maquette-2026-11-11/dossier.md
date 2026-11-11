# Dossier du juge données — ㉑ LE MARCHÉ — maquette — 2026-11-11

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-donnees/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/marche-21/maquette-2026-11-11/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (`mesures/` existe, vide).

## Mode : maquette — LECTURE DU CODE SEULEMENT (B = DÉDUIT)
Le back de ce lot n'est PAS sur la pile locale et n'a aucun E2E : **aucune mesure de corps de réponse n'est possible**. Chaque ligne de B porte donc **DÉDUIT** avec le `fichier:ligne` de la projection (interface TypeScript, mapping, contrainte de valeurs) — recevable ici parce que la pile ne peut pas être montée, et marqué comme tel. **Interdits : monter, redémarrer, reconstruire ou modifier la pile Docker ; lancer le back ; toucher à une base.** Le build actuellement servi (`35bdd6cb`) ne contient PAS ce lot : ne mesure rien dessus.

## L'écran
- **Nom** : ㉑ « Le marché » (tableau du Verge d'Or).
- **Ce qu'on vient y faire** : lire, quartier par quartier et genre d'endroit par genre d'endroit, où le marché de la ville est tendu ou calme, avec des voyants (allumé / éteint / ash), sans que le joueur n'agisse.
- **Domaine présumé** : `services/game-back/src/operational/market/` (contrôleur `market.controller.ts`, route `GET /v1/me/market/lanes`), plus la route des quartiers `GET /v1/world/districts` ; grep du mot « market » / « marche » dans tous les contrôleurs : le juge vérifie et complète.

## Question
**La maquette montre-t-elle quelque chose SANS source (dessiné, non servi), ou ignore-t-elle une donnée servie ?** Rends **RATIFIABLE | NON**, avec la table de couverture recomptée par script (|B| + |M non appariés| = lignes ; trois comptes et somme).

## Maquette (M) — fichier ÉPINGLÉ par git, jamais l'arbre de travail
- Dépôt : `/home/erutheone/project/atelier3d-mafia` · branche master · **commit `4ae50cca50565c813e81778ba74a800a52cc1fe6`**.
- Lecture : `git -C /home/erutheone/project/atelier3d-mafia show 4ae50cca:ecrans-brennar-6.html` (**2,6 Mo, 155 cadres** : redirige vers un fichier de TON dossier `mesures/`, n'affiche jamais le fichier entier).
- **Repère des cadres de ㉑ — par le LIBELLÉ de l'étiquette (`<div class="etiquette">`), pas par l'index seul.** Les cadres de ㉑ sont ceux dont le corps porte « LE MARCHÉ » / « tableau du Verge d'Or » : à partir de l'index 0-based 101 (indications à VÉRIFIER, elles peuvent être incomplètes) : « Le tableau — trois voyants sur soixante-douze » (101), « Une ligne recoupée — Dépôt-Est × crick » (102), « Voyant éteint — et c'est un renseignement » (103), « Le tableau de région — six genres d'endroit » (104), « Le mur — vous ne dites rien, on ne dit rien » (105), « Ce qui manque encore » (106 ; **les autres cadres « Ce qui manque encore » appartiennent à d'autres écrans**, à vérifier par leur corps), « Les onze crans, tous » (145), « ㉑ · la tuile Ash — l'éclat des prismes » (146). Cherche aussi la **case ash** et le **voyant éteint**. **Hors lot, ne pas inventorier : les cadres d'index 109 et 110 (TD-1040).**
- Les mots ratifiés de l'écran (FR/EN, domaine `marche.*`, 31 clés) : `/home/erutheone/project/mafia-clean-city/scratchpad/MOTS-MARCHE-21.md` — table décisionnelle, à CONFRONTER à la maquette et au `string_table`, pas à croire.

## Back (B) — DÉDUIT
- **Branche** : `lot/marche-mots` @`163402f11591f8a321fe67ab0c2df4e3f1b64fdc` (contient `lot/marche-ardoise-enumerateur` @`49f10ab4`), worktree `/home/erutheone/project/mafia-lot-mots` (lecture seule ; tu peux aussi lire `git -C … show 163402f1:<chemin>`).
- **Route** : `GET /v1/me/market/lanes` (`services/game-back/src/operational/market/market.controller.ts`) ; **les 31 clés `marche.*`** dans `services/game-back/src/i18n/string_table.ts` (FR + EN) ; **les noms de quartiers** servis par `GET /v1/world/districts` (à localiser).
- Pour chaque clé de la réponse : son type tel que projeté, ses **valeurs possibles** lues à la source qui les contraint (union TS, `CHECK`, enum) — jamais recopiées d'un design.
- **B⁻** : colonnes des tables du domaine marché (`services/game-back/src/db/schema/`) que la projection ne porte pas.

## Écarts ASSUMÉS — re-vérifie, ne rouvre pas
| information | raison |
|---|---|
| colonne **ash** présente, ÉTEINTE, nommée « HORS DU TABLEAU » — jamais allumée | TD-966 ; vérifie qu'aucune valeur servie ne peut l'allumer, et que le libellé est bien dans les 31 clés |
| les nombres sont écrits en **chiffres** (« soixante-douze » n'est pas écrit en lettres à l'écran) | classe C, consigné |
| les cadres **109 et 110** | hors lot (TD-1040) |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation du chantier ;
- les rapports ou mesures de juges précédents (visuels ou données) : `Tools/juge-visuel/**`, `Tools/juge-donnees/**` sauf ce dossier : INTERDITS ;
- les « choix » non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.

## Format du rapport
Celui du mandat (`rapport.md`), avec en tête le **verdict RATIFIABLE | NON** en une phrase et les trois comptes + somme recomptés par `mesures/controle-arithmetique.py` (avec contrôle négatif rouge). Chaque ligne de B porte **DÉDUIT** + `fichier:ligne`. Un compte se prend dans la table, jamais dans ta synthèse. Ta section « non vérifié » doit dire que B n'a jamais été mesuré et ce qui le trancherait (pile avec le lot, compte jetable, corps réel).
