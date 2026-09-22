# Créneau de porte du 2026-09-22 — session mafia-builder-city-clean-91, cumul client 35021b3a

Runbook : `Tools/CRENEAU-2026-09-22.md` (4b197582), joué étape par étape. Pile dev : `X-Server-Build ea215ce9267c105cbe6c41f6b2a6f8b0ac1290a6`
(bundle fr 1017 clés, lu le Tue, 22 Sep 2026 14:31:39 GMT par `GET /v1/i18n/bundle?locale=fr`). Un E2E scopé de f7 tournait en parallèle (3 conteneurs), prévu.

## 0-1. Départ et porte
`gate/cumul-client-2026-09-22 · 35021b3a · 1` (seule ligne : `?? HANDOFF-2026-09-22-client.md`) · 0 processus Unity · porte LIBRE.
`creneau-unity.sh take mafia-builder-city-clean-91` → `PRIS par mafia-builder-city-clean-91 2026-09-22 16:26:37` · RC_TAKE=0.

## 2. Typecheck
Fait AVANT la porte, sur le signal « gate terminé » : 35021b3a (17/17). Premier passage rouge (㉝ `rang`), correctif 16cabe79.

## 3. Le run
```
env -u MAFIA_CAPTURE_IDENTIFIER -u MAFIA_CAPTURE_PASSWORD -u MAFIA_DEMO_IDENTIFIER -u MAFIA_DEMO_PASSWORD \
  LOG_FILE=… TIMEOUT_S=3600 WT=… \
  MAFIA_CI_CATEGORIES="EcranAppro,EcranDistribution,EcranDemolition,I18n,BundleReel,W3U1,EcranAutonomy,EcranExceptions,Ecran10,EcranUiLieutenant,ScreenCarte,DemoIdentity,EcranRegleLieutenant" \
  bash Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```

```
elapsed=529s   (16:26:59 → 16:35:48)   RC_RUN=1
DÉCLARÉS SOUS LE FILTRE : 173
RunPlayModeTests finished — passed=170 failed=3 skipped=0 inconclusive=0 declares=173 comptes=173
MafiaCI: catégories RÉELLEMENT exécutées = [BundleReel, DemoIdentity, Ecran10, EcranAppro, EcranAutonomy, EcranDemolition, EcranDistribution, EcranExceptions, EcranRegleLieutenant, EcranUiLieutenant, I18n, I18nReseau, PhotoEcranDemolition, ScreenCarte, W3U1]
SUITE TRONQUÉE / FILTRE VIDE : aucune ligne · segfault-lignes=0
```

### Par catégorie — le journal ventilé par `par-categorie-du-journal.py` (catégories lues dans les sources, règle Unity)
`python3 Tools/juge-donnees/creneau-2026-09-22/par-categorie-du-journal.py <journal> <les 13>` :
```
résultats lus : 173 · PASS 170 · FAIL 3 · SKIP 0 · non rattachés aux sources : 0
| catégorie | exécutés | verts | rouges | ignorés |
|---|---|---|---|---|
| EcranAppro | 7 | 7 | 0 | 0 |
| EcranDistribution | 19 | 19 | 0 | 0 |
| EcranDemolition | 3 | 2 | 1 | 0 |
| I18n | 15 | 15 | 0 | 0 |
| BundleReel | 2 | 2 | 0 | 0 |
| W3U1 | 38 | 36 | 2 | 0 |
| EcranAutonomy | 4 | 4 | 0 | 0 |
| EcranExceptions | 19 | 19 | 0 | 0 |
| Ecran10 | 2 | 2 | 0 | 0 |
| EcranUiLieutenant | 5 | 5 | 0 | 0 |
| ScreenCarte | 9 | 9 | 0 | 0 |
| DemoIdentity | 48 | 48 | 0 | 0 |
| EcranRegleLieutenant | 4 | 4 | 0 | 0 |
rattachés par leur CLASSE (nom de cas personnalisé) : 11
```
Chaque ligne « exécutés » égale le compte attendu du runbook (7 · 19 · 3 · 15 · 2 · 38 · 4 · 19 · 2 · 5 · 9 · 48 · 4 = 173).

### ⚠️ Écart au runbook : 15 catégories listées, pas 14 — ma prédiction, pas le filtre
MafiaCI imprime l'UNION des catégories portées par les tests exécutés, pas les catégories que le filtre a prises. `EcranDemolitionC1`
(prise par sa classe `EcranDemolition`) porte aussi `PhotoEcranDemolition` au niveau de la méthode. L'union calculée dans les sources
pour les 173 résultats du journal vaut exactement ces 15. `declares == comptes == 173` : aucun test pris en trop. Le runbook annonçait
« les 13 + I18nReseau (14) » en confondant les deux définitions.

## Les 3 rouges
1. `DemolitionScreenPlayModeTests.EcranDemolitionC1_CapturerPourLeJugeVisuel_DeuxResolutions` — « capture refusée (ecran_demolition) :
   ni MAFIA_CAPTURE_* ni MAFIA_DEMO_* n'est exportée COMPLÈTE ». **Attendu** : la paire n'est pas exportée, à dessein (`env -u`).
2. `OrgVitalsPanelControllerPlayModeTests.C6F2_CohesionDetector_NamedUnavailable_PlusCitywideFieldOracleWithCapacityGuard` (W3U1) —
   « the rendered text carries the NAMED state, never just an absent 4th bar · Expected: True But was: False ».
   **Causé par 8166447a (lot D, chrome), et c'est une garde vide qui se révèle.** La garde cherche « Unavailable » dans N'IMPORTE QUEL
   texte rendu du panneau. Le texte de cohésion est français depuis a4b2afa6 (07/09) : « Cohésion : indisponible pour l'ensemble de la
   ville ». Le test ne restait vert que parce que le texte de CHALEUR valait « Heat: Unavailable (…) ». 8166447a l'a traduit en
   « Chaleur : — (…) » : plus aucun texte ne contient le mot anglais, et la garde mesure enfin ce qu'elle nomme. Correctif proposé
   (test seul, à valider) : viser le texte de la cohésion et son état nommé (« Cohésion » et « indisponible »), pas l'ensemble du panneau.
3. `OrgVitalsPanelControllerPlayModeTests.C6F4_CohesionProbe_SuccessBodyRequired_TickDimensioned_CapacityGuarded` (W3U1) — « Timeout
   value of 180000 ms was exceeded ». **Classe environnement** : le test appelle `POST /v1/_test/citysim/advance?ticks=2000`, mesuré à
   134-135 s sur backend au repos (commentaire du test, 2026-08-21) ; pendant ce run, un E2E de f7 tournait (game-back 72 % CPU, pg 34 %,
   `docker stats` à 16:34:59). ⚠️ Défaut latent du test, indépendant de ce run : le délai de requête a été porté à 240 s le 21/08, mais
   le délai par défaut d'un test Unity est 180 s, qui coupe avant. Le « 240 » ne peut jamais servir.
`StaleAbandonedShell_NeverLeaksTenantContentUnderReusedCanvas` (W3U1) : VERT.

## 4. Après le run
```
 M "Assets/Fonts/DejaVuSans SDF.asset"
 M "Assets/Fonts/DejaVuSerif SDF.asset"
 M Assets/Screenshots/carte_ville_1080x2400.png
 M Assets/Screenshots/carte_ville_hors_chrome_1080x2400.png
```
→ `git checkout -- Assets/Fonts/` et `git checkout -- Assets/Screenshots/` ; porcelain = la seule ligne du handoff.
⚠️ Écart au runbook : il annonçait « aucune planche modifiée ». Les deux planches de la carte sont écrites par `CarteVillePlayModeTests`
(catégorie `ScreenCarte`, lignes `[CAPTURE] Assets/Screenshots/carte_ville_1080x2400.png … marqueurs=18` au journal), sans paire
d'identité : restaurées, jamais commitées.

## 6. Porte
`creneau-unity.sh release mafia-builder-city-clean-91 --atlas-vus` → `LIBRE (rendu par mafia-builder-city-clean-91)` · RC_REL=0 · 16:36:44.
Reste un `VBCSCompiler` (serveur Roslyn d'Unity), pas un éditeur (`éditeurs : 0`).

## Libelle.NbReplis de ② et du chrome — mesure par ENSEMBLES DE CLÉS, pas le compteur d'exécution
Aucun test ne monte ② ni le chrome avec le bundle réel : `Libelle.NbReplis` n'est exercé à l'exécution que sur « Signer l'ordre »
(`BundleReel`, vert ici : 2/2). À la place, pour chaque site `Libelle` à arguments littéraux de ces fichiers, la clé qu'il demande,
contre le bundle de l'ancienne image (`bundle-fr-2026-09-22.json`, 03cf564c) et celui de la pile reconstruite
(`bundle-fr-ea215ce9.json`, lu le Tue, 22 Sep 2026 14:31:39 GMT, `X-Server-Build ea215ce9…`). C'est ce que `NbReplis` compterait si chaque site était rendu une fois.
`python3 Tools/juge-donnees/creneau-2026-09-22/replis-par-ensembles.py Tools/juge-donnees/i18n/bundle-fr-2026-09-22.json Tools/juge-donnees/i18n/bundle-fr-ea215ce9.json` :
```
bundle AVANT Tools/juge-donnees/i18n/bundle-fr-2026-09-22.json : 886 clés · APRÈS Tools/juge-donnees/i18n/bundle-fr-ea215ce9.json : 1017 clés

② la fiche du bâtiment : 92 clés demandées (sites littéraux) · sites non littéraux : 2
   manquantes AVANT : 68   ·   manquantes APRÈS : 0

chrome partagé : 6 clés demandées (sites littéraux) · sites non littéraux : 0
   manquantes AVANT : 4   ·   manquantes APRÈS : 1
     reste manquante : accueil.vitals.cohesion_indisponible_pour_l_ensemble_de_la_ville
```
La clé restante du chrome est une orpheline ANTÉRIEURE aux lots : littéral réécrit par a4b2afa6 (07/09, ancêtre de main 9b5d6117) ;
le bundle sert encore l'ancienne clé `accueil.vitals.cohesion_indisponible_pas_d_agregat_pour_la_ville`. Pour f7 : la clé neuve, texte
FR « Cohésion : indisponible pour l'ensemble de la ville ».
⚠️ Hors du compte : `building.yield.idle` / `.earning` sont SERVIES (donc pas des replis) mais valent encore « Idle » / « Earning »
(item 6 de f7) — visibles en anglais, invisibles à cette mesure comme au compteur.
