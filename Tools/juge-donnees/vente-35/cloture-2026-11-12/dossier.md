# Dossier du juge données — ㉟ La vente — clôture (B / M / F), à FRAIS — 2026-11-12

> Rempli par l'orchestrateur (JUGE) depuis `.claude/skills/juge-donnees/dossier-gabarit.md`. À lire EN PREMIER. Tout chemin est ABSOLU.
> Répertoire du dossier : `/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/vente-35/cloture-2026-11-12/` — tu écris `rapport.md` et `mesures/` dans CE répertoire (`mesures/` existe, vide).

## Mode : clôture, trois côtés — B = back, M = maquette de l'atelier, F = front construit
Le front de cet écran existe depuis plusieurs mois et le dernier audit de couverture est ancien : **tu pars de ZÉRO**, comme si personne n'avait rien mesuré.

## L'écran
- **Nom** : ㉟ « La vente » — qui vend (les points de vente, « dealers ») et ce qu'il y a dans la caisse de chacun ; ramasser la caisse.
- **Ce qu'on vient y faire** : voir les gens qui vendent pour soi, ce que chacun a en caisse, ce qui risque d'aller mal (arrestation, caisse pleine), et ramasser.
- **Domaine présumé** (le juge vérifie et complète, il ne s'y limite pas) : `services/game-back/src/operational/selling/` (`selling.controller.ts` : `POST operational/dealer/assign`, `POST operational/dealer/:id/collect`, `GET operational/dealer/:id`, `GET operational/dealers` ; `selling.projection.service.ts`, `selling.service.ts`, `selling-sell.service.ts`, `selling.repository.ts`, `selling-tunables.ts`) ; les clés i18n liées (`string_table.ts`, FR + EN) ; les colonnes du schéma (`services/game-back/src/db/schema/`) des tables liées aux points de vente. Cherche aussi par grep (`dealer`, `selling`, `caisse`, `lane`, `lek`, `loyalty`, `addiction`) dans les contrôleurs joueur.

## Question
**Qu'est-ce qui est SERVI et non affiché ? AFFICHÉ sans source ? DESSINÉ à l'atelier sans source ?** (grille du mandat : dessiné+disponible+non affiché ; affiché sans source ; dessiné sans source ; « passé à côté ? » = disponible non montré ni dessiné, classé par intérêt joueur). Rends **CLÔTURABLE | NON**, avec la table de couverture recomptée par script (|B| + |M non appariés| + |F sans source| = lignes ; trois comptes et somme ; contrôle négatif rouge).

## Front (F) — le client Unity construit
- Dépôt : `/home/erutheone/project/mafia-builder-city-clean`, branche `gate/cumul-client-2026-09-22`, **commit `c98cef3dff734a8d18d7b22f1de3325aa24ab627`**. Lis au SHA épinglé (`git show c98cef3d:<chemin>`), pas l'arbre de travail.
- Fichiers : `Assets/Scripts/Operational/Selling/SellingScreenController.cs` (écran), `SellingDtos.cs` (ce que le client déclare), `SellingClient.cs` (routes appelées), `PointsDeVente.cs`. Complète : les résolveurs de libellés, les clés i18n utilisées, tout ce que le contrôleur lit d'un DTO. **Pour chaque clé du DTO : lue par combien de lignes, et où.** Une clé déclarée mais lue par 0 ligne n'est pas « affichée » ; une clé affichée sans clé servie correspondante est une valeur en dur ou inventée (R2.2 : le back projette des BANDES, jamais des scalaires).
- Pas de capture fournie : tu juges l'information, pas les pixels.

## Maquette (M) — fichier ÉPINGLÉ par git
- Dépôt : `/home/erutheone/project/atelier3d-mafia` · branche `master` · **commit `a3e02c2a6b2a1c53f5ba709d3f2b79dc7da0707e`**.
- Lecture : `git -C /home/erutheone/project/atelier3d-mafia show a3e02c2a:ecrans-brennar-6.html > <fichier de TON dossier mesures/>` (~2,6 Mo, 171 cadres : ne l'affiche jamais en entier).
- **Cadres de ㉟, repérés par le LIBELLÉ de l'étiquette** (`<div class="etiquette">`, index 0-based indicatifs ; vérifie) : « **La vente — qui vend et ce qu'il y a dans la caisse** » (107) ; « **La caisse de Oskar — pleine à ras** » (108) ; « **Ramasser — nulle part où la porter** » (109) ; « **Ilse s'est fait prendre** » (110) ; « **Aucun dealer — rien ne rentre** » (111) ; « **Ce qui manque encore** » (112, la liste des manques de l'écran — **à toi de vérifier qu'il appartient bien à ㉟** et de le dire). Les cadres suivants (113 « L'horizon… ») sont un AUTRE écran : hors périmètre. N'inventorie que ces cadres. Nomme-les dans ton rapport par libellé ET index trouvé.
- Pas de rendu PNG fourni : la source HTML est la maquette.

## Back (B) — mesurable sur la pile, ET lisible dans le code
- **Code de référence** : le cumul back `gate/cumul-2026-11-14` @`44a645a286cbd3c982d500fe0a590230dd6d8c80`, worktree en **LECTURE SEULE** `/home/erutheone/project/mafia-cumul-1114` (tu n'y écris rien, tu n'y changes pas de branche). Dépôt principal : `/home/erutheone/project/mafia-clean-city` (`git show 44a645a2:<chemin>`).
- **Pile locale** : `http://localhost/v1/...`. `X-Server-Build` observé avant ce dossier : **8d0184a4** (la pile n'est PAS au SHA du cumul). **Relève `X-Server-Build` AVANT et APRÈS tes mesures (dans `mesures/`).** Mesuré par l'orchestrateur : entre `8d0184a4` et `44a645a2`, `operational/selling/` est identique ; `db/schema/` diffère sur `conflict_combat.ts` et `sparse_citizens.ts` ; **à toi de le re-mesurer** (`git diff --name-only`, avec contrôle positif sur un fichier qui diffère) et de dire, pour chaque ligne de B, si elle est mesurée sur la pile ou lue au cumul (DÉDUIT).
- **Mesure réelle** : compte JETABLE frais (`jd3-…`) par `POST /v1/auth/signup` (Idempotency-Key requis ; jeton dans `payload.data.access_token`) puis `POST /v1/session/open` ; `GET /v1/operational/dealers` et `GET /v1/operational/dealer/:id`. Sur un compte neuf la liste est probablement vide : DIMENSIONNE par une action réelle de joueur sur TON compte (assigner un point de vente) **si c'est faisable sans prérequis hors de ton compte**, sinon marque la ligne DÉDUIT en disant ce qui la trancherait, et lis les specs E2E du back (`services/game-back/tests/e2e/**`, grep `dealer`) pour les corps de réponse attendus.
- ⚠️ **Piège outil (mesuré)** : un hook réécrit `curl` en `rtk curl`, et une sortie redirigée n'est PAS le corps de la réponse (537 octets écrits pour `Content-Length: 995`). Utilise `rtk proxy curl` ou Python (`urllib`), et **compare la taille écrite à `Content-Length`** pour chaque corps.
- **Interdits** : redémarrer, reconstruire, migrer ou modifier la pile ; toucher aux comptes existants ; **un POST (assign / collect) seulement sur un objet qui appartient à TON compte jetable** (jamais sur un objet d'un autre compte ou de la ville) ; aucune action hors du domaine de la vente. **Masque tout jeton et mot de passe dans `mesures/`** (`Bearer ***`) ; n'écris jamais le jeton dans un fichier versionnable.
- **B⁻** : colonnes des tables du domaine (schéma) que la projection des routes ne porte pas.

## À CONFIRMER OU INFIRMER — une affirmation de l'orchestrateur du chantier
Il a été affirmé (par un grep, non revérifié par moi) que **quatre clés sont servies par le back, déclarées dans le DTO du client, et lues par 0 ligne** : `withdrawn`, `addiction_loyalty_status`, `lane_band`, `lek_band`. Établis ton inventaire de ZÉRO (toutes les clés de B, tous les éléments de M, toutes les lectures de F) ; **puis** dis dans une table à part, pour chacune des quatre : **CONFIRMÉ / INFIRMÉ / NUANCÉ**, avec la commande (grep avec contrôle positif sur une clé que le client lit) et la preuve de B (servie ? sur la pile ou DÉDUIT), de F (déclarée ? lue ? par quelles lignes ?) et de M (dessinée ? où ?). Une clé hors de cette liste, dans le même cas, est NEUVE : signale-la.

## Écarts ASSUMÉS déjà connus
Aucun consigné pour cet écran. Tout écart que tu trouves se classe par la grille du mandat.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché
- les notes d'implémentation du chantier, les messages de commit (sauf les SHA cités), les `LISEZ-MOI.md` voisins ;
- tout rapport ou mesure de juge précédent (visuel ou données), notamment **`Tools/juge-donnees/vente/**`** (le tour de clôture de septembre), `Tools/juge-visuel/**`, le reste de `Tools/juge-donnees/**` et `/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/**` : INTERDITS. (Une copie de l'ancien front est dans `Tools/juge-donnees/vente/…/front-fd0e21e/` : INTERDITE aussi.)
- le rapport `juge-visuel` APPROUVÉ de l'écran : non fourni (le dernier date de septembre ; ce tour ne juge pas les pixels).

## Format du rapport
Celui du mandat (`rapport.md`), avec en tête le **verdict CLÔTURABLE | NON** en une phrase et les trois comptes + somme recomptés par `mesures/controle-arithmetique.py` (positif rc=0, négatif rc≠0). Chaque ligne de B : commande + sortie collée (ou DÉDUIT avec la raison). Ensuite : (1) la table de couverture B/M/F ; (2) la table des quatre clés (CONFIRMÉ / INFIRMÉ / NUANCÉ) ; (3) les défauts de couverture (dessiné+disponible+non affiché ; affiché sans source ; dessiné sans source), chacun avec preuve ; (4) « passé à côté ? » séparé des défauts, classé par intérêt joueur avec un avis d'usage en une ligne ; (5) la section « non vérifié » obligatoire.
