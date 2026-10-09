# Dossier du juge données — ④ L'ouverture / Accueil — clôture — 2026-10-09

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-donnees/dossier-gabarit.md`. Lis-le en premier.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/04-accueil/r2-2026-10-09/`
> Écris `rapport.md` et `mesures/` ici. Aucune référence à un autre répertoire de rapport.

## Mode : clôture (B back réel · M maquette · F front)

## L'écran
- **Nom** : ④ L'ouverture / Accueil.
- **Ce qu'on vient y faire** : ce qu'il y a à trancher ce matin (la carte de TÊTE : la décision à fort levier du jour, ou à défaut le rapport d'autonomie à lire) et ce qui attend derrière (« la suite » : une file de lignes, chacune une raison + un geste).
- **Domaine présumé** : `~/project/mafia-clean-city/services/game-back/src/session/` (session/open, qui porte la décision du jour), `.../exceptions/` (file d'exceptions), l'autonomie (rapports d'autonomie), la chaleur du district, le portefeuille. Le juge vérifie et complète.

## LA QUESTION POSÉE CE TOUR (priorité absolue)
La maquette dessine la carte de TÊTE (cadre 5) avec : titre, niveaux (portée / urgence), un libellé « CE QU'ON PEUT FAIRE », des lignes de conséquence par option (4 dans le cadre) et **deux gestes** de même poids. Le jeu, sur le compte capturé (compte neuf par salve, vrai shell), rend : titre, niveaux, **un seul geste**, et rien entre les niveaux et le geste, rien dessous.
1. **Sur un compte neuf (l'état capturé), que sert exactement le back pour la carte de tête** ? Corps réel de `POST /v1/session/open` (clés de la décision du jour, présence ou non d'une liste d'options, leurs clés, ce qu'elle porte : libellés, conséquences projetées…) — commande + sortie collées.
2. **Le back sait-il servir une décision à EXACTEMENT 2 options** (et plus) ? Dans quelles conditions (quel état de jeu, quelle action joueur la fait apparaître) ? Source : le code back et ses specs E2E ; si une action joueur réelle la fait naître, dis-le et donne la séquence de requêtes, **sans** modifier la stack partagée au-delà d'un compte frais à toi.
3. **Que fait le front (lecture du code)** quand la décision porte 0, 1, 2 options : quel libellé de geste, combien de gestes, la zone « CE QU'ON PEUT FAIRE » et les lignes de conséquence apparaissent-elles, d'où vient chaque mot affiché ?
4. **Ce que la maquette dessine sur la carte de tête et que le back ne sert pas** (dessiné sans source), et **ce que le back sert et que ni la maquette ni le front n'affichent** (« passé à côté ? »).
Ne tranche pas le produit ; mesure et classe.

## Maquette (M)
| fichier | rôle |
|---|---|
| `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-accueil.html` | source HTML/CSS (cadres 0-4 en 0-based ; **cadre 4** = la file, **cadre 5** = la carte de tête au-dessus d'une ligne de file haute) |
| `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/reference/A01-cadre-4-la-suite.png` et `…/A01-cadre-5-tete-sur-ligne-haute.png` | rendus à jour (atelier master 4bd3ea2, 1080×2102) |

## Back (B)
- **Stack locale** : montée, gate FINI, personne ne la modifie pendant ton run. `docker ps` du jour :

      mafia-clean-city-game-back-1 Up 19 hours (healthy)
      mafia-clean-city-traefik-1 Up 19 hours
      mafia-clean-city-docker-socket-shim-1 Up 19 hours
      mafia-clean-city-bo-back-1 Up 19 hours (healthy)
      mafia-clean-city-bo-front-1 Up 19 hours (healthy)
      mafia-clean-city-pg-1 Up 19 hours (healthy)
      mafia-clean-city-redis-1 Up 19 hours (healthy)

- **Compte** : frais, par `POST /v1/auth/signup` (Idempotency-Key requis) puis `POST /v1/session/open`. Back visé : `http://localhost` (Traefik). Dépôt back : `/home/erutheone/project/mafia-clean-city` (HEAD cf54e9eb à la préparation du dossier).
- **Seed si nécessaire** : action joueur RÉELLE seulement (pas d'écriture directe en base) ; sinon « corps à vide ».
- ⛔ N'ouvre ni gate, ni suite E2E complète, ni Unity. Un compte frais et des requêtes HTTP suffisent.

## Front (F)
| fichier | rôle |
|---|---|
| `/home/erutheone/project/mafia-builder-city-clean/Assets/Scripts/Shell/HighestLeverageCardController.cs` | la carte de tête (décision à fort levier / rapports) |
| `.../Assets/Scripts/Shell/LaSuitePanelController.cs`, `LaSuite.cs` | la file « la suite » et le verre de la carte |
| `.../Assets/Scripts/Shell/LibellesDecision.cs`, `DailyReviewDtos.cs` | libellés, DTO de la revue du jour |
| `.../Assets/Scripts/Shell/AppShell.cs` | câblage de l'écran |
(Cherche aussi les DTO de `session/open` ; le juge complète la liste.)
- **SHA du client** : tête de `gate/cumul-client-2026-09-22` à la préparation (`git rev-parse HEAD`). **Rapport juge-visuel APPROUVÉ : AUCUN** (il n'est pas APPROUVÉ ; ne le cherche pas — la question ci-dessus en est issue).

## Écarts ASSUMÉS déjà connus (re-vérifie, ne recopie pas)
| information | raison | source |
|---|---|---|
| Les options de la carte de tête sont en TEXTE descriptif, sans bouton par option ; un seul geste principal. | la décision du jour n'a pas d'effet par option servi côté back (dette TD-724) | décision de l'orchestrateur 08/10 |
| Le libellé du geste vaut « Lire maintenant » quand la carte est celle des rapports sans exactement 2 options servies. | libellé voulu de l'état « rapports » (table 45) | décision 08/10 |
| La pastille FAMILLE de la file n'est allumée que par ≥ 1 rapport d'autonomie servi. | donnée absente sur un compte neuf | décision 26/09 |
| Valeurs du HUD d'un compte neuf (10 000 €, Froid, JOUR 1, Aube) vs maquette (24 850 €, Tiède, JOUR 12) | une valeur servie n'est pas une forme | — |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation du chantier ;
- les rapports de juges précédents, visuels ou données (en particulier `Tools/juge-donnees/04-accueil/r1-2026-10-07/`, `Tools/juge-visuel/04-accueil/`) : n'ouvre pas ces répertoires ;
- les choix non sourcés : s'ils ne sont pas dans la table ci-dessus, ils n'existent pas.

## Format de rapport
Celui du mandat (table de couverture B × M × F, section « passé à côté ? » séparée des défauts, non-vérifiés non vide). **Ajoute en tête une section « Réponse à la question posée » (≤ 15 lignes, avec les commandes et sorties).**
