# Bilan du tour de juges ⊥ — nuit du 2026-09-06 (session `mafia-juge`)

> **Question posée** (mandat de `mafia-clean-city-f2`) : *les écrans sont-ils fidèles aux maquettes ratifiées ?*
> **Matériel** : les 15 planches du client `main` `76ee3cc` (2026-09-04 11:22, même bundle, compte de démo
> `operational_demo@example.test` gelé à la minute 71309), les 28 références §DA-3 (1080×2102, ×3,6, rendues à
> l'atelier `3c02f72`), les 240 corps réels §DA-4 (`back_main 6ff684db`, 238 opposables).
> **Méthode** : un `reviewer` NEUF par écran (skills `juge-visuel` / `juge-donnees`), jamais l'orchestrateur ; tout
> chiffre a son script dans `mesures/` ; branche `juge/conformite-2026-09-06`, worktree `~/project/mafia-unity-J`.
> **Comptes** : pris dans les TABLES par `compter-findings-tour.py`, jamais dans les synthèses.

## 1. Verdicts — 10 juges visuels, 3 juges-données (mode maquette)

| écran | tour | verdict | B | M | m | rapport |
|---|---|---|---|---|---|---|
| ⑥ La Famille | r1 | **APPROUVÉ** | 0 | 0 | 10 | `famille/r1-2026-09-06/` |
| ㊲ La réputation | r9 | NON APPROUVÉ | 1 | 0 | 12 | `reputation/r9-2026-09-06/` |
| ① Le HUD de district (+ ② la fiche) | r3 | NON APPROUVÉ | 1 | 5 | 9 | `ecran-principal/r3-2026-09-06/` |
| ③ La carte | r1 | NON APPROUVÉ | 1 | 5 | 4 | `carte/r1-2026-09-06/` |
| ⑯ La revue du jour | r1 | NON APPROUVÉ | 2 | 3 | 10 | `revue-du-jour/r1-2026-09-06/` |
| ㊴ Le dossier | r1 | NON APPROUVÉ | 3 | 11 | 5 | `screen_b7/r1-2026-09-06/` |
| ㊵ La filière | r1 | NON APPROUVÉ (planche = état d'ERREUR) | 4 | 11 | 9 | `screen_c2/r1-2026-09-06/` |
| ⑤ La décision du jour | r1 | NON APPROUVÉ | 5 | 7 | 10 | `decision-du-jour/r1-2026-09-06/` |
| ⑱ Le menu Plus | r1 | NON APPROUVÉ | 6 | 8 | 1 | `plus/r1-2026-09-06/` |
| ㉔ L'autonomie | r1 | NON APPROUVÉ | 8 | 5 | 1 | `autonomie/r1-2026-09-06/` |
| **total** | | **1 / 10 approuvé** | **31** | **55** | **71** | 157 findings |

Juges-données maquette (B ↔ M, sans front) : ③ `Tools/juge-donnees/carte/maquette-2026-09-06/` (19/50 infos, 17 routes) ·
㊴ `screen_b7/maquette-2026-09-06/` (7/10 clés, 5/12 valeurs) · ㊵ `screen_c2/maquette-2026-09-06/` (4/11, 12 écarts).
Ces trois tables ont servi d'écarts ASSUMÉS aux juges visuels correspondants — sans elles, un juge juge contre une supposition.

**Non jugeables cette nuit (arbitrage produit, pas d'orchestration)** : ④ Accueil, ⑪ Coffre (`planche_le_pipeline`,
`planche_la_filiere` onglet) — aucune maquette ratifiée de série 4/6 (`coffre/ecran-canon.png` est une série 2 au
rattachement DÉDUIT, décision C). *Pas de maquette, pas de juge* : juger contre un rattachement déduit produirait des
écarts chiffrés contre une référence que personne n'a ratifiée. Pour les rendre jugeables : une maquette de série 6, ou
acter qu'ils sortent du canon.

## 2. Classes transversales — comptées UNE fois, avec leur dénominateur

| classe | dénominateur | écrans | nature → destinataire |
|---|---|---|---|
| **Décor de scène série 6 absent** (scène peinte lisible dans la maquette, noir/aplat en jeu) | **4 / 4** écrans à scène lisible | ⑯ ⑱ ㉔ ⑤ | `Assets/Scripts` : 0 fichier ne dessine la scène de série 6 ⇒ **lot front « décor derrière les écrans »**, arbitrage user (doctrine v3.3 « garde le bâtiment derrière » ratifiée, jamais portée). ㊲ ㊴ ㊵ : scène à brightness .18-.24 dans la maquette, indécidable ⇒ hors classe. ① ③ : l'art/la peinture EST le décor, présent. |
| **L'écran est un autre objet que la maquette** | 4 / 10 | ⑱ (liste nue vs Bureau) · ㉔ (pas de téléphone à clapet) · ⑤ (carte inversée, table absente) · ㊴ (12 crans → 3 filets, compteurs absents) | **arbitrage user** : construire l'objet, ou ratifier l'écran réduit |
| **Inset haut non consommé** (symptôme ; causes différentes) | 2 / 10 | ⑱ F3 (anneau sur « LA RÉPUTATION » — `Tab.More` ne publie pas les insets) · ㉔ F6-8 (98 px sous le bandeau — chemin qui les publie, autre cause) | correcteur, cause par écran |
| **Copie / langue inventée ou brute** | 4 / 10 | ⑤ (enum brut anglais en titre) · ㉔ (clés i18n brutes, « Choose A/B », UUID pour nom) · ㊴ (« Ce qui se voit », 0 occurrence dans la série 6) · ㊲ (paragraphe qui contredit l'état, sous-titre hors des 6 cadres) | correcteur ; ㊲ F12 et ㊴ B1 : la maquette ne dessine pas l'état ⇒ blender aussi |
| **Le gras ne rend pas** (700 → normal) | 2 / 10 | ⑯ F5 · ㊵ F12 (4 runs, même signe) | correcteur — cause commune probable (variante SDF / `fontStyle`), à mesurer sur la population |
| **Or** | 2 / 10 | ㊵ *plus jaune* (jeton `accentGold #ffd240` au lieu de `hudMoneyGold #f2c96b`) · ⑯ *plus gris* (désaturation 234,194,104 → 177,165,139) | deux causes distinctes, deux correctifs |
| **Chrome partagé** (gate du shell, pas des écrans) | 10 / 10 | ronds du dock VIDES (arbitrage « j'aime pas les icônes », connu) · JOUR à « — » (6 écrans) · bandeau NON ALIMENTÉ (« Unknown », « ARGENT — ») : ⑱ ③ · **flèche retour qui DÉPLACE l'aile gauche de +48 CSS** (① F3, ㉔ A3) · bouton retour sans cercle (⑥ F2) | shell / protocole de capture |
| **Écarts RÉCURRENTS (≥ 2 tours, jamais corrigés)** | — | ㊲ buste hors axe −3,2 CSS (r6, r8, r9) · ㊲ CTA −7 % (r8, r9) · ① manomètre : anneau 1,33 → 2,90 CSS, arc +43 % (r2, r3) | correctifs à rouvrir NOMMÉMENT (le débord du manomètre sous le bandeau, lui, est CANON — ne pas y toucher) |
| **sRGB ↔ linéaire** | 2 mesurés | ⑥ (3 translucidités à ≤ 4/255 sur la prédiction sRGB) · ① (4 à Δ ≤ 4/255) | **résultat POSITIF** : la conversion livrée le 22/08 tient |

## 3. Ce qui n'est PAS l'écran — et où ça va

- **Planches à reprendre (resync)** : ㊵ = état d'erreur « LA FILIÈRE NE RÉPOND PAS » (corps 200 / 4 nœuds 1 h 07 avant) ⇒ la
  garde de capture doit REFUSER d'écrire sur un état d'erreur (celle de ㊳ le fait) · ⑱ ③ = bandeau non alimenté (attendre le
  chrome peuplé, pas N frames) · ⑯ = l'état GARNI n'est capturé nulle part sur ce build (la majorité de l'écran non jugée) ·
  tous : **une seule résolution** (doctrine : deux) et **aucune paire T/T+1 s** (ruling « sans animation » invérifiable).
- **Références à re-rendre / maquettes en retard (blender)** : ㊵ (atelier `70c8f23` 04:03 a corrigé la prémisse fausse ;
  la référence date de `3c02f72`) · tout cadre à « HEAT » / « $ 24 850 » (ruling « fr réel ») · ㊴ : 7 valeurs de bande sur 12
  sans témoin (dont `glaring`, mesuré) et « votre train de vie » attribué au joueur (E1) · ㊲ : l'état « indéterminé +
  absorbé > 0 » non dessiné · ⑯ : CTA en état vide dessiné, contredit par un choix écrit dans le code (arbitrage) ·
  **la série 6 ANIME** (`bln6-scan` 7,5 s) contre le ruling 27/08 — à trancher une fois pour toute la série.
- **Instruments** : `Tools/juge-visuel/capturer-corps-reels.py:233` **injecte `home_district_id`** dans le corps de
  `session/open` (13 clés pour 12 émises, épinglées) — à corriger AVANT de rejouer les 240 corps · « sans instance » sur
  `/:nodeId` = artefact (sonde `nodeId`, clé `node`) · `POST …/stage` absente de `_index.json`.
- **Spec back fausse** : `tests/e2e/parcours/03_carte.parcours.spec.ts:132` asserte 404 sur `GET /v1/me/buildings`, route
  existante (200 dans `me_buildings_td534.parcours.spec.ts:73`) → `mafia-back`, au retour du gate.
- **Prose datée en production** : ㊴ panneau « au 2 septembre 2026 · valeur par défaut du serveur » affiché au joueur ;
  `forensic.controller.ts:12-15` « CONSTANT » contredit par le corps réel (`watched`).
- **Défauts de DOSSIER (les miens), tous attrapés par des juges qui ont jugé contre l'IMAGE plutôt que le texte** :
  ⑤ Référence série 4 / Échelle « série 6 » · ⑥ « même police sans-sérif » faux (`Segoe UI,Roboto` ⇒ Noto Sans) ·
  ㊴ renvoi à un `etats/` inexistant. Les trois sont corrigés dans `preparer-tour-2026-09-06.py`.
  ⇒ *Le dossier est une carte, l'image est le territoire — pour mes propres artefacts aussi.*

## 4. Arbitrages pour l'user (rien n'est tranché ici)

1. ④ ⑪ (+ `le_pipeline`, `la_filiere`) : maquette de série 6, ou hors canon ?
2. Décor de scène derrière les écrans (4/4 absents) : lot front, ou la doctrine v3.3 est-elle retirée ?
3. ⑱ ㉔ ⑤ ㊴ « autre objet » : construire l'objet de la maquette, ou ratifier l'écran réduit ?
4. ⑯ CTA « CONFIRMER LA ROUTINE » en état vide : la maquette (le dessine) ou le code (refuse de confirmer 156 routines
   jamais vues, `DailyReviewScreenController.cs:233-256`) ?
5. Format monétaire « 406 653,08 € » vs « $ 24 850 » (conditionne ① F3/F4 avant tout correctif).
6. Ronds du dock sans icônes (ouvert depuis le 25/08).
7. Animation : la série 6 anime, le ruling 27/08 l'interdit.
8. ① : les 3 grandeurs de la fiche ont changé de sens (REVENU/CHAÎNE/ÉTAT vs À COLLECTER/REVENUS/HEAT LOCAL).

## 5. Amendements de skill proposés (protocole ratifié par l'user — il arbitre)

- `juge-visuel` : joindre au juge la **liste des GRANDEURS mesurées du tour précédent** (jamais les verdicts) pour que la
  colonne `DÉJÀ APPLIQUÉ / NOUVEAU` soit remplissable sans transmettre d'angle mort — cas ㊲ r9 : F2 revenu 3 fois à la même
  valeur, invisible sans les mesures d'avant.
- Protocole de capture : (a) refuser d'écrire une planche sur un état d'ERREUR (garde « chargé OU erreur » ⇒ erreur =
  pas d'image, à consigner) ; (b) attendre le chrome ALIMENTÉ, pas un nombre de frames ; (c) deux résolutions + paire
  T/T+1 s obligatoires (0/10 cette nuit).
- `juge-donnees` : la sonde de « sans instance » se contrôle POSITIVEMENT (un id connu doit être retrouvé) ; un instrument
  de capture ne complète JAMAIS un corps (D1 ③).

## 6. Suite

- ⑥ : image validée ⇒ `juge-donnees` mode **clôture** dû — tenu jusqu'au top de f2 (après la resync sur `demo_capture`,
  jamais avant : l'horloge du compte a avancé de +599 min à 01:42Z).
- Tout correctif ⇒ nouvelle capture ⇒ NOUVEAU juge (r<N+1>) ; jamais deux juges sans correctif entre eux.

## 7. Addendum (2026-09-06, après le bilan) — menu « Plus » non démonté sous les écrans (`15a0da7`)

Fait rapporté par f2 : depuis le 02/09, toute destination ouverte depuis le menu « Plus » se montait PAR-DESSUS le menu sans
le démonter. Planches de ce tour prises par ce chemin : **㊲ ㊴ ㊵** (`ActivateTab(More)` puis clic d'entrée) ; ⑯ ⑤ ㉔ ⑥
(montés en surimpression par le test), ① ③ (onglet Empire) et ⑱ (le menu lui-même) ne le sont pas.
- **8 findings marqués « À REMESURER après recapture », 3 rapports touchés, aucun retiré** : ㊲ F7 F11 · ㊴ F12 F14 F18 ·
  ㊵ F1 F8 F9 (ceux qui portent sur le fond COMPOSITE). Instrument : `mesurer-fantome-menu-plus.py` (autocorrélation
  du profil de luminance au pas des bandes du menu, 123 px ; contrôle positif ⑱ +0,90, négatif ⑥ −0,26) — **aucune bande
  du menu n'est visible** dans les trois planches (+0,08 / −0,02 / +0,24) ; un texte fantôme isolé n'est pas testé.
- ⑱ : le correcteur mesure **21 entrées** (contenu 3 035,8 pour une fenêtre de 390,6, glissé 2 645,2) là où le r1 en
  comptait 19 — les 2 manquantes étaient hors cadre, comme le juge l'avait écrit en non-vérifié. F1/F2 tiennent, en pire.
