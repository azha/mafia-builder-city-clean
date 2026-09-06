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

## 8. Addendum — la journée du 2026-09-06 (tours r<N+1> sur correctifs commités + planches signées)

Protocole figé avec f2 à midi : un tour ne part que sur une ligne « GO <écran> r<N> : correctif <SHA> · planche <nom> ».
Base de preuve refondée à 11:10 (`empreinte-reference.json`, minute 72 118, compte `demo_capture` gelé, 326 corps `a0623a5`,
50 planches `1b887e3`) ; `origin/correcteur/ecrans` est resté PÉRIMÉ sur GitHub — les commits jugés vivent dans le worktree
local `~/project/mafia-unity-correcteur`, d'où les blobs ont été lus.

| écran | tour | verdict | B | M | m | ce qui a bougé |
|---|---|---|---|---|---|---|
| ⑥ La Famille | r2 (`8e982ab`) | NON APPROUVÉ | 1 | 1 | 11 | le correctif D-1 a mis le nom dans la fente de l'archétype : **l'archétype a disparu** (défaut déplacé d'un cran) |
| ⑥ | clôture données delta (`77bd229`) | 4 fermés · 1 ouvert · **2 neufs nés dans le correctif** | | | | archétype disparu (confirmé par la donnée) ; 3 clés i18n non servies + `UNKNOWN` → « Unknown », garde à 6/9 |
| ⑥ | r3 (`5349ac2`/`77bd229`) | **APPROUVÉ** | 0 | 0 | 14 | 5 écarts fermés au chiffre ; sRGB exact ; les 14 MINEUR en dette groupée |
| ⑥ | clôture données delta 2 (base refondée) | **0 défaut de couverture** | | | | 3 lignes bougent / 43 ; réserve de classe ⓑ (docstring de garde vraie pour 1/9 résolveurs) ; le « vérifié à 0 » de `5349ac2` non reproductible (phrase citée dans sa réfutation) — **⑥ CLOS par le skill** (`01321d77` au plan) |
| ㊲ La réputation | r10 (paire sans chrome `0da8895`) | NON APPROUVÉ | 0 | 3 | 10 | faits du correcteur VÉRIFIÉS (portrait procédural ; l'ovale = GANT, 0 px d'or) ; calotte MESURÉE (4 nombres) ; buste hors axe −3,2 CSS pour la 4ᵉ fois ; défaut de dossier hérité 4 tours : l'ancrage du cadre est INVERSÉ maquette/client |
| ㊲ | r11 (paire SOUS chrome `3b0ffae`) | NON APPROUVÉ | 2 | 5 | 9 | axe/interligne/tuiles/bouche FERMÉS ; **gouttière tranchée : au 16:9 le cadre fixe déborde de 141 px sous le bandeau, le titre disparaît** (zone libre 1556 < cadre 1698) — la maquette n'est pas conçue pour le 16:9 : arbitrage ; calotte reformée, les 4 nombres toujours faux ; gras −20-33 % de fût |
| ① Le HUD | r5 (`4ccd806`) | NON APPROUVÉ | 2 | 11 | 11 | **chrome ×1,19 sur ① seul** (témoin ⑥ exact) → aile droite hors écran ; F5-rayon CONFIRMÉ (0,4497 R) ; aiguille RÉFUTÉE (même facteur que l'arc) |
| ① | r6 (`b85acfc`) | NON APPROUVÉ | 0 | 10 | 12 | **F1 FERMÉ** ; **×1,19 NON reproduit** (artefact d'état de run, sonde `[CHROME-CAPTURE]`) ; médaillon ≠ cadran (pivot inversé, 26° de recouvrement, lunette absente) ; laiton devenu orange (200,126,66) ×2 d'épaisseur ; dock sans indicateur ; **classe : l'arc composé en LINÉAIRE** (sRGB d=2/8,6 vs linéaire 17,9/34,6) ; ARGENT à 2,90 CSS du médaillon |

**Ce que la journée a établi** :
- **Un correctif ferme l'instance et déplace le défaut** — mesuré deux fois sur ⑥ (nom → archétype disparu ; résolveur unique → 3 clés
  non servies + « Unknown ») et sur ㊲ (calotte reformée sans remesurer les nombres). Le remède qui a marché : **la clôture données en
  DELTA** juste après le correctif, qui voit ce que le visuel ne voit pas (D-1 « Cuisinier ×3 »), et les **grandeurs du tour précédent
  jointes au juge suivant** (colonne `critère` remplissable, ㊲ F3 attrapé 4 fois à la même valeur).
- **Un écart qui revient N fois à la même valeur n'est plus un finding** : ㊲ buste −3,2 CSS (r6→r10) — fermé au r11 dès qu'il a été
  nommé comme correctif et non remesuré.
- **Les faits d'un correcteur se vérifient et tiennent souvent** : ㊲ portrait procédural / gant (2/2 vrais) ; ① ×1,19 « réel sur les
  planches, absent de l'arbre » (vrai : non reproduit au r6) ; ① F5-rayon (vrai) ; ① « l'aiguille dépasse » (faux — réfuté au pixel).
- **Trois classes neuves** : la composition LINÉAIRE d'un dégradé/arc (⑥ r2 F3 rampe du filet, ① r6 l'arc du manomètre) ; **la
  hauteur FIXE d'une maquette 9:17,5 qui ne tient pas au 16:9** (㊲ r11) — arbitrage de résolutions cibles avant tout correctif ;
  **l'ancrage inversé** d'un bloc entre maquette et client, absorbé 4 tours par un assumé faux.
- **Défauts de mes dossiers, attrapés par les juges** : 6 (⑤ série 4/6 · ⑥ police · ㊴ `etats/` · ⑥ « 3 349 lignes » · stats de diff
  fausses ×2 · ㊲ « sous le cadre, c'est le dock » + texte commun `operational_demo`) ⇒ règles : plus de stats de diff, `compte` par
  écran, et **`[ -f dossier.md ] && git commit`** (3 commits partis sans dossier sur une chaîne shell rompue).
- **Instruments de sonde** : `capturer-corps-reels.py` injectait `home_district_id` ; le dossier `famille` n'avait pas le roster et
  `reputation/GET_lieutenants.json` était un DÉTAIL ; « sans instance » sur `/:nodeId` = sonde `nodeId` vs clé `node` — les trois
  fermés dans la resync (`a0623a5` porte le roster de famille).
- **Comptes** (`compter-findings-tour.py`, ids `F/B/M` + gravité, `C` exclu) : **15 rapports · 241 findings · 34 B / 80 M / 127 m**.

### 8.bis — Après-midi (15:00) : ③ r2 et ① r7, sur planches signées `régime=env` (compte gelé)

| écran | tour | GO (SHA correctif · planches) | verdict | ce qui a bougé |
|---|---|---|---|---|
| ③ | r2 | `d6c851d` · sous chrome + `carte_ville` (2400) | NON APPROUVÉ 0B/3M/4m (r1 1B/5M/4m) | la CARTE tient (peinture 2/255, 18 angles ≤ 0,53° sauf 1, capitale ×1,000, F1-F7/F10 tenues) ; le LETTRAGE non : famille romaine→linéale, tracking 0,24 em absent, halo de SIGNE inversé (la maquette creuse), encre −22,5 L, F8 réfuté comme artefact (+7,5 px 13/13) |
| ① | r7 | `d495284` · fiche 1920/2400, district 2400, témoin ⑥ | NON APPROUVÉ 1B/7M/15m (r6 0B/10M/12m) | FERMÉ : pivot, couleurs des arcs, indicateur de dock, boîtier/filet braise, chrome alimenté. OUVERT : nom du district 1,58:1 à 2400 (aucun fond garanti sur l'art), dock sans voile (3,6:1 à 1920), COLLECTER à angles droits (NOUVEAU), cadran (neutre 12° vs 38°, arcs ×1,7 fuselés, cerclage en halo, lunette absente, fond directionnel perdu), `.chaud` sur 2/4 |

**Ce que l'après-midi a établi**
- **QUAI-NORD tranché en nommant l'objet** : le r1 mesurait le mot ET le libellé « CHASSE » de l'écusson voisin (résidu 10,59 px contre 1,39 pour le mot seul) — la maquette suit sa source (−10,25°). *Un résidu de régression imprimé partout dit si la mesure a porté sur un seul objet.*
- **Une cible reprise d'un instrument n'est pas une propriété de la maquette** : le correctif ③ a bâti un halo CLAIR « +20 L » à partir d'une grandeur du r1 ; la maquette, mesurée directement, CREUSE (`paint-order:stroke`, −10..−20 L). Signe inversé — même famille que l'aiguille inversée.
- **Deux instruments, deux nombres sur la même image** : segment neutre du cadran ① mesuré ~24° par le correcteur (29,45° au SVG) et 12° par le juge (38° sur le PNG canon). Les embouts des arcs mangent le vide ; c'est le VIDE VISIBLE à mi-hauteur qui se compare, pas l'angle des chemins. Désaccord de grandeur à trancher avant tout r8.
- **Corriger le nombre, pas la propriété** (③ m1) : F9 visait r−b 39 → atteint (identique sur 18 mots) ; la maquette pose l'encre à `opacity:.9`, plus claire de 22 L.
- **Défaut de dossier (le mien)** : `carte_ville_1080x2400.png` déclarée « hors chrome » — elle porte le même bandeau et le même dock (5 105 px de delta, tous dans le chrome). Générateur corrigé. Et **JOUR 50 → 51 entre deux planches du même run** (aiguille bougée) ⇒ le compte « gelé » ne l'est pas à l'intérieur du run — mesure prioritaire chez f2 (chemin de capture non signé ?).
- **Chrome partagé** : la phase est alimentée sur ① (« Aube ») et pas sur ③ (« — »), même compte, à 6 min ⇒ dépend de l'écran. **Tranché par f2 (mesuré ce matin) : état VOULU** — la phase est vidée à chaque activation d'onglet et n'est alimentée qu'en district, pour ne jamais montrer la valeur d'un district quitté. Doctrine amendée : hors ①, un tiret de phase seul = ASSUMÉ, le chrome se juge (③ r2 l'avait écarté à tort — à rejuger au r3).
- **TD-615 (vraie Bold, `6aadd9e` 14:45) est POSTÉRIEURE aux deux planches** ⇒ ③ r2 M1 « fût ×1,41 » à remesurer après recapture (la famille tient) ; ① r7 ne porte aucun finding de graisse ; les grandeurs de gras des tours antérieurs (㊲ r11) ne sont plus comparables entre elles.
- **Compteur** : deux formes d'id non comptées (minuscules `m1`, gras `**B1**`) — corrigé ; 18 rapports · 286 findings · 37 B / 95 M / 154 m.
- **Course de capture du bandeau (correcteur `9fa198a`, relayé par f2 15:30)** : ARGENT, JOUR et le bucket de CHALEUR arrivent par trois réponses asynchrones que la capture n'attendait pas — 4 runs, même commande, même compte, arbre inchangé ⇒ 3 états (tout alimenté / tirets + cadran vide anneau or / montant et jour sans cadran). ⇒ Sur toute planche antérieure à `9fa198a`, un cadran VIDE (aiguille neutre, anneau or, pas de mot) ou un ARGENT/JOUR à « — » est un défaut de CAPTURE, pas d'écran. Balayage des 18 rapports (motifs : anneau or · cadran vide · aiguille neutre · tirets · Unknown) : **⑱ r1 F13 (« Unknown ») et F14 (bandeau vide de ses 4 valeurs) → À REMESURER après recapture, non retirés** ; ③ r1 avait écarté le chrome (non compté) ; ① r7 est tombé sur un run « tout alimenté » (jugé à raison) ; aucun autre rapport ne porte de finding sur un cadran vide. Piège nommé par le correcteur : la PHASE (aile droite, sous JOUR) n'est pas le mot du cadran (bucket de chaleur, serif au centre) — une garde qui attend la phase passe verte sur un cadran vide. Garde livrée : `ChromeAlimenteOuEchoue` (18 captures sous shell / 37).
- **Le jour d'écart de ③ r2 est expliqué** : `carte_ville_1080x2400.png` était sur `operational_demo` (catégorie lancée sans la paire d'identité, 15 runs sur 16) — deux comptes, pas une horloge qui avance dans le run. Le compte gelé reste gelé ; la règle « exiger la ligne `régime=env` PAR PLANCHE » vaut pour chaque fichier du GO, pas pour le run. Les deux planches ③ sont recapturées post-Bold sur le bon compte (GO ③ r3 à venir).
- **Le « désaccord d'instruments » du cadran ① n'en était pas un — c'étaient DEUX GRANDEURS** (correcteur, en rejouant `m11_secteurs.py` du r7 tel quel : mêmes chiffres, 12° en jeu / 37° au canon pour le VIDE VISIBLE à mi-hauteur ; 29,45° des deux côtés pour les bornes des CHEMINS embouts exclus). Le finding est leur ÉCART : le canon a des embouts qui RECULENT (coupé net ⇒ montre plus que déclaré), le jeu des embouts qui AVANCENT (fuselés ⇒ montre moins). C'est la mesure de FORME du trait (1,02 → 3,16 → 0,94 contre 2,46–2,52 constant) qui commande la réparation (primitive d'arc à épaisseur constante, embouts francs) — aucun réglage d'angle. *Quand deux instruments donnent deux nombres, demander d'abord s'ils mesurent la même grandeur ; si non, l'écart entre les deux EST le finding.* Ordre chez le correcteur : classe B1+M5 (mesure d'EFFET sur l'art réel pour tout élément posé sur l'art), puis cadran, puis GO ① r8.
- **Planches VIDES avec tests verts (TD-541)** : quatre planches de la base (㉒ démolition, ㉑ délégation…) n'avaient **0 pixel > 110** — l'amorce ne pose jamais de jeton. Plancher d'encre posé par le correcteur aux 17 sites d'écriture de PNG (seuil 0,10 %, dérivé de la plus pauvre des 48 non vides : 0,518 %). **Côté juge : `Tools/juge-visuel/verifier-encre-planche.py`** (même seuil, contrôle négatif intégré) passe sur toute planche AVANT de lancer un juge — les 6 planches de l'après-midi : 2,41 % à 59,4 %. Régime croisé « suite complète + paire de capture » (41 rouges) : runbook back §4.12.
- **③ r2 m4 reclassé ASSUMÉ** (f2, à la source) : `.pin-esc` est le tracé de descente, membre de la couche d'état `ecusson · pin-esc · moi · nappe · lueur` que `rendre-ville-peinte.py:82` retire de la peinture — même lot à part que les écussons et lavis. ③ r2 = **0B/3M/3m**. Les cinq noms entrent dans les assumés du générateur pour le r3.
- **GO ① r8 : refusé puis accepté.** Première ligne (`48992d2`) : les trois planches ① étaient byte-identiques aux blobs de `03efb90` (14:56), tous les correctifs (15:48 → 17:03) postérieurs, `git diff --name-only 5a3ad92^ 48992d2 -- Assets/Screenshots` vide — cause nommée par le correcteur : un `git checkout -- Assets/Screenshots/` avant chaque commit (garde anti-contamination d'un run ROUGE appliquée sans critère aux planches d'un run VERT ; ses mesures « sur planche » étaient réelles, jamais publiées). Seconde ligne (`43ac9cb`, 17:08) : 4 planches à `git log -1` = `43ac9cb`, blobs changés, `48992d2` ancêtre — juge lancé (dossier `c1e618c`). **Contrôle pré-GO désormais dans les deux routines** : pour chaque planche, commit qui la touche POSTÉRIEUR au dernier correctif ET blob ≠ campagne précédente ET `diff --name-only` non vide.
- **① r8 rendu (18:00, planches `43ac9cb`) : NON APPROUVÉ 0B/3M/20m** (r7 1B/7M/15m). FERMÉS : voile du dock (pire 3,54 → 6,17), fond sous le nom (1,58 → 7,98 à 1920 ; 4,32 pire colonne à 2400 = m12), interstice (12° → 34°), étendues des arcs exactes et fuselage, `.chaud` ×4, COLLECTER arrondi (rayon 5,7–6 pour 9 = m14), lunette (**la déclaration « 2,9× trop faible » n'est PAS confirmée** — même rayon, même amplitude : l'oracle TD-654 mesure autre chose), volute gauche. OUVERTS : **M1 cerclage = halo (3ᵉ tour)**, **M2 arcs ×1,6–1,8 trop épais** (+ anneau 14 % trop petit, 5 CSS trop haut, piste neutre dans l'interstice), **M3 NOUVEAU : voile du bandeau +29/255 = alpha recopié sans conversion sRGB→linéaire** — contrôle : 5 surfaces translucides, **3 converties (plaque, 2 arcs) et 2 recopiées (voile, volute)** ⇒ pas une erreur de modèle uniforme, une conversion appliquée à une partie de la population ; ARGENT à **0,07 CSS** du cerclage à 2400 (clause de sortie de l'assumé atteinte).
- **L'interstice : le « désaccord » était DEUX CONVENTIONS** (centre du boîtier vs pivot) — le 34° du correcteur tombe sur la conv. A du jeu, mais le canon y vaut 40°, pas 29,45 (conv. B : canon 28,5°, source 29,45, jeu 25°). Résidu −15 % dans les deux ⇒ m4.
- **La référence ① porte de l'échafaudage d'atelier** (6 pastilles `.co`, bascules 🌙/🔥, `.floater` animé) — non compté, deux sondes corrigées pour l'écarter ⇒ **destinataire blender** : rendre le canon sans l'échafaudage. **Défaut de dossier (le mien)** : la note de polices « série 6 » ne s'applique pas à `hud-brennar.html` (`Segoe UI, Roboto` / `Georgia` → Noto Sans / Noto Serif) — à corriger au générateur pour ①.
- **③ r3 rendu (18:20, planches `43ac9cb`/`d779d50`) : NON APPROUVÉ 1B/2M/6m** — effectif **1B/1M/6m** (M2 pastilles du dock vides = arbitrage user connu ; défaut de mon dossier, doctrine amendée `f4993e8`). **B1 NOUVEAU : à 1080×1920 la carte est plein cadre** (contenu y 16..1892 ; « LE PORT » sous le bandeau, LA CHANCELLERIE / LES FRICHES / PONT-GRIS sous le dock) — à 2400 encadrée. **M1 : le contour sombre déclaré n'est pas dans l'image** (+14,4 L à d=1 contre −12,8 au canon ; THRENNY peint −18,9 = contrôle positif) ⇒ le correcteur mesure le signe sur sa planche avant tout GO. m1 encre opaque bit-exacte (« opacity .9 » réfuté par la variance) ; m3 trait d'union écrasé (DÉPÔT-EST 18→3, PONT-GRIS 18→2, sélectif) ; m4/m6 chrome : **deux juges, deux nombres** (ARGENT capitale 6,90 vs 6,25 en ① r8 ; dock +8,8 % vs −3,2 %) — à confronter (échelle CSS-HUD), non routés. Fermés : angles (max 0,35°), interlettrage, famille/graisse, contraste ≥ 6,59.
- **F8 corroboré par un instrument qui ne connaissait pas l'hypothèse** : annexe des 18 — dy +7,16 px médian, 15/15 même signe, σ 1,73 (profils : +7,25, 18/18) ; dx σ 4,72 signes mélangés ⇒ translation verticale CONSTANTE ; net +6,0 px après biais de recalage. Le juge exclut « le sens de l'ancre » (centroïde) — exactement la lecture de source (`9f7076a` : y = ligne de base `alphabetic`, capitales centrées ⇒ cap/2 ≈ 8 px). r4 en `Baseline` : dy attendu ≈ 0.
- **C25** : les deux planches 2400 de ③ (17:08 / 17:15) diffèrent de 596 px à ≤ 3/255 ⇒ la carte hors chrome est la même carte, le monde n'a pas bougé (le compte gelé l'est, cette fois).

