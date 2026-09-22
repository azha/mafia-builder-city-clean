# Gate client, PARTIE 1 (sans la paire) — 2026-09-22 22:38 → 22:44, session mafia-builder-city-clean-91

Runbook étape 7-ter, listes de de9e9e6d (`gate-deux-parties.md`). HEAD **de9e9e6d** ; code sous Assets identique à celui du typecheck
vert 86467fae (0 fichier). Back : `X-Server-Build 4841d7ad` (conteneur game-back créé 2026-09-22T20:31:07Z). 0 E2E, gate de nuit du back
terminé, charge 1,62, gouverneur powersave. Porte : prise 22:38:56, rendue 22:44:57 (`--atlas-vus`).

## Commande (telle que jouée)
```bash
env -u MAFIA_CAPTURE_IDENTIFIER -u MAFIA_CAPTURE_PASSWORD -u MAFIA_DEMO_IDENTIFIER -u MAFIA_DEMO_PASSWORD \
  LOG_FILE="$S/gate-p1.log" TIMEOUT_S=5400 WT="$PWD" MAFIA_CI_CATEGORIES="<partie 1 : 39 catégories>" \
  systemd-inhibit --what=sleep:idle:handle-lid-switch --why="gate client partie 1" bash -c '
    for v in MAFIA_DEMO_IDENTIFIER MAFIA_DEMO_PASSWORD; do [ -z "${!v}" ] || { echo "⛔ $v POSÉE — FAUTE, STOP"; exit 3; }; done
    echo "MAFIA_DEMO_* absentes (attendu)"; bash Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests'
```
Première ligne de la sortie : `MAFIA_DEMO_* absentes (attendu)`.

## Verdict
```
elapsed=331s   (22:39:04 → 22:44:35)   RC_RUN=1
DÉCLARÉS SOUS LE FILTRE : 420
RunPlayModeTests finished — passed=415 failed=4 skipped=1 inconclusive=0 declares=420 comptes=420
catégories RÉELLEMENT exécutées : 42 (= la ligne « PORTÉES » du compteur, 42)
SUITE TRONQUÉE / FILTRE VIDE : aucune · segfault 0
capture refusée : 0 · régime capture ON : 1 · OFF : 1 · IGNORÉE hors mode capture : 0 · ⛔ DIFFÉRENTE : 0
```
La paire ON/OFF est celle du test pur `LeModeCapture_SePoseEtSeLeve_EtDeclareSonRegimeAuJournal` (DemoIdentity), étiquetée
« (falsifiable) » — lignes 33911 et 33960 du journal. Aucun autre mode capture n'a été posé. Le seul ignoré est l'`[Ignore]` statique
`BLOQUANT_EffectiveBottomOverhangPx_SurvitAUneRepublication`.

## Par catégorie — chaque « exécutés » égale le compte attendu (39/39)
```
résultats lus : 420 · PASS 415 · FAIL 4 · SKIP 1 · non rattachés aux sources : 0
| catégorie | exécutés | verts | rouges | ignorés |
|---|---|---|---|---|
| W4P4a | 7 | 7 | 0 | 0 |
| W3UDA | 48 | 48 | 0 | 0 |
| W3U1 | 38 | 38 | 0 | 0 |
| W3U2 | 98 | 98 | 0 | 0 |
| Charpente | 40 | 37 | 2 | 1 |
| DemoIdentity | 50 | 50 | 0 | 0 |
| ShellSurimpression | 2 | 2 | 0 | 0 |
| CaptureReputation | 1 | 1 | 0 | 0 |
| CaptureFamille | 1 | 1 | 0 | 0 |
| Joignabilite | 13 | 13 | 0 | 0 |
| ScreenCarte | 9 | 9 | 0 | 0 |
| CaptureCarte | 1 | 1 | 0 | 0 |
| EcranAutonomy | 4 | 4 | 0 | 0 |
| EcranExceptions | 19 | 18 | 1 | 0 |
| EcranRegleLieutenant | 4 | 4 | 0 | 0 |
| EcranTenureLieutenant | 4 | 4 | 0 | 0 |
| EcranUiLieutenant | 5 | 5 | 0 | 0 |
| EcranRegleTier2 | 2 | 2 | 0 | 0 |
| EcranAppro | 7 | 7 | 0 | 0 |
| ScreenB7 | 4 | 4 | 0 | 0 |
| EcranLoi | 14 | 13 | 1 | 0 |
| EcranConflit | 9 | 9 | 0 | 0 |
| Ecran10 | 2 | 1 | 1 | 0 |
| I18n | 15 | 15 | 0 | 0 |
| I18nReseau | 1 | 1 | 0 | 0 |
| BundleReel | 2 | 2 | 0 | 0 |
| JUGE | 2 | 2 | 0 | 0 |
| CaptureDetail | 1 | 1 | 0 | 0 |
| CaptureForensic | 1 | 1 | 0 | 0 |
| FicheTete | 2 | 2 | 0 | 0 |
| Graisses | 1 | 1 | 0 | 0 |
| CarteIcones | 2 | 2 | 0 | 0 |
| IconesArchetype | 2 | 2 | 0 | 0 |
| BlocPartage | 4 | 4 | 0 | 0 |
| ChassisVente | 1 | 1 | 0 | 0 |
| FicheBlanchiment | 1 | 1 | 0 | 0 |
| FicheCollecte | 1 | 1 | 0 | 0 |
| VenteRamassage | 1 | 1 | 0 | 0 |
| Inspection | 5 | 5 | 0 | 0 |
rattachés par leur CLASSE (nom de cas personnalisé) : 29
```

## Les 4 rouges, classés sur leur texte
1. **CO-TENANCE** — `ExceptionQueuePlayModeTests.Ecran9_ChaqueAttendantOuvreSaPropreCarte` (EcranExceptions, Ecran10) :
   « Unhandled log message: '[Error] [ExceptionQueue] load failed: 401: Missing or invalid bearer token.' ». Signature exacte de TD-576
   (`Tools/lister-destructions-differees.py`) : un contrôleur d'un test PRÉCÉDENT, détruit en différé, dont la requête revient pendant
   ce test. Attribution : le code de la file d'exceptions et ce test sont INCHANGÉS depuis 35021b3a (0 fichier), où EcranExceptions
   était 19/19 (558289a0), et le test était vert au filtre complet du matin ; le TearDown de sa propre classe détruit en IMMÉDIAT
   (:83-84) — l'orphelin vient d'une classe voisine. Non prouvé par disparition : contrôle proposé, EcranExceptions seul.
2. **RÉGRESSION (test)** — `LoiScreenPlayModeTests.EcranLoiE1_EtatVide_MessagesHonnetesSurLesDeuxSections` (EcranLoi) :
   « Expected: collection containing "Une affaire naît d'une descente — rien sur cet écran n'en crée." ». Le lot C (ebf97d1e,
   « ㉛ la loi : rien ici n'en crée ») a réécrit ce texte en « … — rien ici n'en crée. » (LoiScreenController.cs:420) ; le test
   (LoiScreenPlayModeTests.cs:338) asserte l'ancien. EcranLoi n'était pas dans le créneau de 16:26.
3. **RÉGRESSION (test)** — `CharpenteAccueilPanneauxPlayModeTests.C2_AccueilMonteLes4PanneauxNommes_SEEDE_OperationalDemo_ChacunDeclareSonMonde`
   (Charpente) : « Stress doit avoir été RENDU … Expected: True But was: False ». 8166447a (lot D, chrome) rend la barre « Tension: … »
   (`RenderBar` : `$"{name}: {label}"`, OrgVitalsPanelController.cs:167) ; le test cherche `StartsWith("Stress:")` (:435).
4. **RÉGRESSION (code)** — `CharpenteOuvertureSessionOverlayPlayModeTests.BLOQUANT2_DashboardMonteEnSurimpressionAuDemarrage_SaChaineDeNavEstAtteignableJusquADetail`
   (Charpente) : « le bouton Nav_CityMap du Dashboard doit exister dans ContentSlot · Expected: not null But was: null ».
   `AddNavButton` nomme le bouton `"Nav_" + label.Replace(" ", "")` (DashboardController.cs:696) : le NOM du bouton — son identité de
   navigation, convention `Nav_{target}` d'IShellNavigator — dérive du LIBELLÉ AFFICHÉ. ffe5fba5 (lot D t1, ④) a traduit les libellés
   (« City Map » → « La carte », « Building Card » → « La fiche », …) : les boutons se sont renommés `Nav_Lacarte`, `Nav_Lafiche`, … alors
   que le test (et le contrat) attend `Nav_CityMap`, `Nav_BuildingCard`, `Nav_Filière`, `Nav_Exceptions`, `Nav_Autonomy`.
   *Une traduction a changé une identité.* Charpente n'était pas dans le créneau de 16:26.

## Après
16 planches réécrites sans paire (accueil_panneaux_geometrie ×3, carte_ville ×2, famille, menu_plus, screen_2_carte_sous_chrome ×2,
screen_5a_detail_main-de-cartes, screen_b3_reputation_sous_chrome ×2, screen_b7 ×2, screen_b7_forensic) et les deux atlas TMP →
`git checkout -- Assets/Screenshots/ Assets/Fonts/`. Porte rendue. Porcelain : le seul handoff (non commité, règle en vigueur).
