# Vérification exhaustive de `INDEX.md` contre ses SOURCES — 2026-09-07 (demande f2 après trois attributions fausses)

Instrument : `verifier-index-source.py` (contrôle positif intégré : ⑮/⑰ doivent sortir FAUX). Critère de CONTENU : routes citées dans le cadre
de l'atelier ∩ routes du contrôleur (`corps-reels/_index-<sym>.json`), puis mots de route à frontière de mot (mots présents dans ≥ 15 cadres
exclus), puis mots FRANÇAIS du titre (« … » de front.md + nom du dossier). Planche : `CapturerLocataire<T>`/`Capturer<T>(shell, "nom")` ⇒
`planche_{nom}` ; sinon le `<XController>` le plus proche (≤ 60 lignes) du littéral de fichier dans la suite.

Limites déclarées : (1) 7 lignes sans maquette ⇒ NON ÉTABLI par construction ; (2) les captures `screen_*` de `VuePrincipaleCapturePlayModeTests`
montent le locataire par le CHEMIN JOUEUR (menu Plus), aucun `<XController>` à moins de 150 lignes ⇒ NON ÉTABLI — trancherait le journal du run
(locataire monté) ; (3) un score de titre n'est qu'une présence de mots : CONFIRMÉ (titre) est plus faible que CONFIRMÉ (routes) ; (4) le
gabarit `page()` rattache l'annotation `<!-- N : … -->` au cadre qu'elle décrit — sans ça, ⑮ sortait CONFIRMÉ (le commentaire de #32 vivait dans
le segment de #31).

```
sym contrôleur                       | NOMINAL          | détail
③   CityMapController                | CONFIRMÉ (titre) | #22 : aucune route ni mot de route discriminant ; mots du titre présents ['brennar', 'carte']
④   DashboardController              | NON ÉTABLI       | aucune maquette de série 4/6 ou aucun nominal dans le mandat
⑤   DecisionDetailScreenController   | FAUX             | #4 désigne DashboardController (score 5 contre 2, porté par []) ; bon cadre pour DecisionDetailScreenController : #8 (score 11)
⑥   LieutenantScreenController       | NON ÉTABLI       | aucune maquette de série 4/6 ou aucun nominal dans le mandat
⑪   LaunderingController             | NON ÉTABLI       | aucune maquette de série 4/6 ou aucun nominal dans le mandat
⑯   DailyReviewScreenController      | CONFIRMÉ (titre) | #0 : aucune route ni mot de route discriminant ; mots du titre présents ['revue']
㊲   ReputationScreenController       | CONFIRMÉ (titre) | #120 : aucune route ni mot de route discriminant ; mots du titre présents ['miroir']
㉟   SellingScreenController          | CONFIRMÉ         | #107 : score 1 pour SellingScreenController (routes ∩ [], mots [])
㉓   ShopScreenController             | NON ÉTABLI       | #98 : ni route, ni mot de route, ni mot du titre (meilleur score ExceptionQueueController=0)
⑮   InspectionScreenController       | FAUX             | #31 désigne PrecinctScreenController (score 9 contre 0, porté par ['city/precinct/:id/belief']) ; bon cadre pour InspectionScreenController : #33 (score 3)
⑰   PrecinctScreenController         | FAUX             | #32 désigne DistributionScreenController (score 3 contre 0, porté par []) ; bon cadre pour PrecinctScreenController : #31 (score 9)
⑭   CompressionScreenController      | CONFIRMÉ         | #25 : score 4 pour CompressionScreenController (routes ∩ ['compression/state'], mots [])
㊴   ForensicScreenController         | CONFIRMÉ (titre) | #131 : aucune route ni mot de route discriminant ; mots du titre présents ['dossier']
㊳   JournalScreenController          | CONFIRMÉ         | #125 : score 4 pour JournalScreenController (routes ∩ [], mots [])
㊵   FiliereScreenController          | CONFIRMÉ (titre) | #137 : aucune route ni mot de route discriminant ; mots du titre présents ['filiere']
㉕   TutorialScreenController         | NON ÉTABLI       | aucune maquette de série 4/6 ou aucun nominal dans le mandat
㉒   ProfileScreenController          | CONFIRMÉ (titre) | #95 : aucune route ni mot de route discriminant ; mots du titre présents ['compte']
⑲   SettingsScreenController         | NON ÉTABLI       | aucune maquette de série 4/6 ou aucun nominal dans le mandat
㊱   HorizonScreenController          | CONFIRMÉ         | #113 : score 1 pour HorizonScreenController (routes ∩ [], mots [])
㉜   DelegationScreenController       | CONFIRMÉ (titre) | #73 : aucune route ni mot de route discriminant ; mots du titre présents ['confie']
㉚   ChaineDApproScreenController     | CONFIRMÉ (titre) | #48 : aucune route ni mot de route discriminant ; mots du titre présents ['commande']
㉘   DistributionScreenController     | CONFIRMÉ (titre) | #54 : aucune route ni mot de route discriminant ; mots du titre présents ['ficelle']
㉛   LoiScreenController              | NON ÉTABLI       | #67 : ni route, ni mot de route, ni mot du titre (meilleur score ExceptionQueueController=0)
㉝   DemolitionScreenController       | CONFIRMÉ (titre) | #80 : aucune route ni mot de route discriminant ; mots du titre présents ['fiche', 'raser', 'site']
㉞   CarnetScreenController           | CONFIRMÉ (titre) | #85 : aucune route ni mot de route discriminant ; mots du titre présents ['carnet', 'ordres', 'soir']
㉙   ConflitScreenController          | NON ÉTABLI       | #59 : ni route, ni mot de route, ni mot du titre (meilleur score ExceptionQueueController=0)
①   DistrictInteriorScreenController | NON ÉTABLI       | aucune maquette de série 4/6 ou aucun nominal dans le mandat
②   BuildingCardController           | NON ÉTABLI       | aucune maquette de série 4/6 ou aucun nominal dans le mandat
⑨   ExceptionQueueController         | CONFIRMÉ (titre) | #14 : aucune route ni mot de route discriminant ; mots du titre présents ['exception', 'exceptions']
⑩   ExceptionDetailController        | CONFIRMÉ (titre) | #15 : aucune route ni mot de route discriminant ; mots du titre présents ['exception']
㉔   AutonomyInboxController          | CONFIRMÉ (titre) | #25 : aucune route ni mot de route discriminant ; mots du titre présents ['autonomie']
⑬   CueStack (sections)              | CONFIRMÉ (titre) | #19 : aucune route ni mot de route discriminant ; mots du titre présents ['pile']
⑳   Recruitment (sections)           | CONFIRMÉ (titre) | #9 : aucune route ni mot de route discriminant ; mots du titre présents ['recrutement']
㉑   Market (non monté)               | CONFIRMÉ (titre) | #101 : aucune route ni mot de route discriminant ; mots du titre présents ['marche', 'table']
⑱   AppShell.MonterMenuPlus          | NON ÉTABLI       | #20 : ni route, ni mot de route, ni mot du titre (meilleur score CarnetScreenController=1)

sym contrôleur                       | PLANCHE          | détail
③   CityMapController                | NON ÉTABLI       | carte_ville_1080x2400.png : aucune suite ne nomme ce fichier ni ce nom
④   DashboardController              | CONFIRMÉ         | planche_l_accueil_1080x2400.png ← DashboardController (PlancheEcransManquantsCapturePlayModeTests.cs)
⑤   DecisionDetailScreenController   | NON ÉTABLI       | decision_du_jour_1080x2400.png : aucune suite ne nomme ce fichier ni ce nom
⑥   LieutenantScreenController       | NON ÉTABLI       | famille_1080x2400.png : aucune suite ne nomme ce fichier ni ce nom
⑪   LaunderingController             | FAUX             | planche_le_coffre_1080x2400.png est écrite en montant ProfileScreenController (PlancheEcransCapturePlayModeTests.cs), pas LaunderingController
⑯   DailyReviewScreenController      | NON ÉTABLI       | revue_du_jour_seuil-force-0.1_1080x2400.png : aucune suite ne nomme ce fichier ni ce nom
㊲   ReputationScreenController       | NON ÉTABLI       | screen_b3_reputation_sous_chrome_1080x2400.png : aucune suite ne nomme ce fichier ni ce nom
㉟   SellingScreenController          | CONFIRMÉ         | planche_la_vente_1080x2400.png ← SellingScreenController (PlancheEcransCapturePlayModeTests.cs)
㉓   ShopScreenController             | CONFIRMÉ         | planche_la_vitrine_1080x2400.png ← ShopScreenController (PlancheEcransCapturePlayModeTests.cs)
⑮   InspectionScreenController       | CONFIRMÉ         | planche_les_inspections_1080x2400.png ← InspectionScreenController (PlancheEcransCapturePlayModeTests.cs)
⑰   PrecinctScreenController         | CONFIRMÉ         | planche_le_commissariat_1080x2400.png ← PrecinctScreenController (PlancheEcransCapturePlayModeTests.cs)
⑭   CompressionScreenController      | CONFIRMÉ         | planche_la_semaine_1080x2400.png ← CompressionScreenController (PlancheEcransCapturePlayModeTests.cs)
㊴   ForensicScreenController         | NON ÉTABLI       | screen_b7_dossier_sous_chrome_1080x2400.png : aucune suite ne nomme ce fichier ni ce nom
㊳   JournalScreenController          | NON ÉTABLI       | screen_c1_journal_sous_chrome_1080x2400.png : aucune suite ne nomme ce fichier ni ce nom
㊵   FiliereScreenController          | NON ÉTABLI       | screen_c2_filiere_sous_chrome_1080x2400.png : aucune suite ne nomme ce fichier ni ce nom
㉕   TutorialScreenController         | CONFIRMÉ         | planche_la_premiere_fois_1080x2400.png ← TutorialScreenController (PlancheEcransCapturePlayModeTests.cs)
㉒   ProfileScreenController          | CONFIRMÉ         | planche_le_coffre_1080x2400.png ← ProfileScreenController (PlancheEcransCapturePlayModeTests.cs)
⑲   SettingsScreenController         | CONFIRMÉ         | planche_les_reglages_1080x2400.png ← SettingsScreenController (PlancheEcransCapturePlayModeTests.cs)
㊱   HorizonScreenController          | NON ÉTABLI       | screen_c6_horizon_etat-vide_sous_chrome_1080x2400.png : aucune suite ne nomme ce fichier ni ce nom
㉜   DelegationScreenController       | CONFIRMÉ         | planche_ce_que_vous_avez_confie_1080x2400.png ← DelegationScreenController (PlancheEcransCapturePlayModeTests.cs)
㉚   ChaineDApproScreenController     | CONFIRMÉ         | planche_la_chaine_d_appro_1080x2400.png ← ChaineDApproScreenController (PlancheChantierCCapturePlayModeTests.cs)
㉘   DistributionScreenController     | CONFIRMÉ         | planche_la_distribution_1080x2400.png ← DistributionScreenController (PlancheChantierCCapturePlayModeTests.cs)
㉛   LoiScreenController              | CONFIRMÉ         | planche_la_loi_1080x2400.png ← LoiScreenController (PlancheChantierCCapturePlayModeTests.cs)
㉝   DemolitionScreenController       | CONFIRMÉ         | planche_raser_un_site_1080x2400.png ← DemolitionScreenController (PlancheEcransCapturePlayModeTests.cs)
㉞   CarnetScreenController           | FAUX             | planche_signer_l_ordre_1080x2400.png est écrite en montant LieutenantScreenController (PlancheEcransCapturePlayModeTests.cs), pas CarnetScreenController
㉙   ConflitScreenController          | CONFIRMÉ         | planche_le_conflit_1080x2400.png ← ConflitScreenController (PlancheChantierCCapturePlayModeTests.cs)
①   DistrictInteriorScreenController | CONFIRMÉ         | screen_1_district_sous_chrome_1080x2400.png ← DistrictInteriorScreenController (VuePrincipaleCapturePlayModeTests.cs)
②   BuildingCardController           | NON ÉTABLI       | screen_2a_fiche_sous_chrome_1080x2400.png : aucune suite ne nomme ce fichier ni ce nom
⑨   ExceptionQueueController         | NON ÉTABLI       | screen_5_exceptions_sous_chrome_1080x2400.png : aucune suite ne nomme ce fichier ni ce nom
⑩   ExceptionDetailController        | NON ÉTABLI       | screen_5a_detail_main-de-cartes_sous_chrome_1080x2400.png : aucune suite ne nomme ce fichier ni ce nom
㉔   AutonomyInboxController          | CONFIRMÉ         | planche_l_autonomie_1080x2400.png ← AutonomyInboxController (PlancheEcransManquantsCapturePlayModeTests.cs)
⑬   CueStack (sections)              | NON ÉTABLI       | aucune planche
⑳   Recruitment (sections)           | NON ÉTABLI       | aucune planche
㉑   Market (non monté)               | NON ÉTABLI       | aucune planche
⑱   AppShell.MonterMenuPlus          | NON ÉTABLI       | aucune planche

35 lignes · nominal : {'CONFIRMÉ': 21, 'NON': 11, 'FAUX': 3} · planche : {'NON ÉTABLI': 16, 'CONFIRMÉ': 17, 'FAUX': 2} · contrôle positif (⑮/⑰ FAUX) OK
```

## Relecture au CONTENU après la table (2026-09-07 14:15)

- **⑤ : le FAUX de l'instrument est un faux positif.** Les cinq cadres S4 #4–8 sont tous titrés « Décision du jour » (#4 « la carte distribuée » = nominal légitime ; #5 « rien ne se détache » ; #6 « le budget est pris » ; #7 « après le tampon » ; #8 « avec les lots back L-a + L-b + L-c ») ; le score de DashboardController venait de mots de route partagés (`autonomy`, `exceptions`) présents dans le texte des rapports d'autonomie de #4. ⇒ **⑤ #4 CONFIRMÉ au contenu** ; #8 est une variante d'état, pas un autre écran.
- **⑮ : #32 tient** (« dispatch / registre » lu dans la source) ; le #33 proposé par l'instrument (score 3) est un cadre d'état du même groupe — le nominal se tranchera au contenu de la capture au r2.
