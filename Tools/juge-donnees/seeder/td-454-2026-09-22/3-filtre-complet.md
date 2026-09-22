# Créneau de porte du 2026-09-22 13:03:43 → 13:20:59 — session mafia-builder-city-clean-91, cumul 55702bf8

## commande
LOG_FILE=… TIMEOUT_S=5400 WT=… bash Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests   # catégories par défaut de MafiaCI.cs, MAFIA_CI_CATEGORIES non posée ; AUCUNE paire d identité de capture exportée

## verdict
elapsed=979s
DÉCLARÉS SOUS LE FILTRE : 439
RunPlayModeTests finished — passed=430 failed=6 skipped=3 inconclusive=0 declares=439 comptes=439
RC=1

## catégories RÉELLEMENT exécutées
BlocPartage BundleReel Capture CaptureCarte CaptureDetail CaptureDistrict CaptureExceptions CaptureFamille CaptureFiche CaptureForensic CaptureHorizon CaptureReputation CaptureSousChrome CarteIcones Charpente ChassisVente DemoIdentity Ecran10 EcranAppro EcranAutonomy EcranConflit EcranDelegation EcranDemolition EcranExceptions EcranLoi EcranRegleLieutenant EcranRegleTier2 EcranTenureLieutenant EcranUiLieutenant FicheBlanchiment FicheCollecte FicheTete Graisses I18n I18nReseau IconesArchetype Joignabilite JUGE MenuPlus PhotoEcranDelegation PhotoEcranDemolition PhotoScreenC1 PhotoScreenC2 PhotoScreenC3 PhotoScreenC3SousChrome ScreenB3 ScreenB7 ScreenC1 ScreenC2 ScreenC3 ScreenC6 ScreenCarte ShellSurimpression VenteRamassage W3U1 W3U2 W3UDA W4P4a 
(58 catégories)

## les 6 rouges
MafiaCleanCity.Operational.Tests.DelegationScreenPlayModeTests.EcranDelegationC1_CapturerPourLeJugeVisuel_DeuxResolutions —   capture refusée (ecran_delegation) : ni `MAFIA_CAPTURE_IDENTIFIER`/`MAFIA_CAPTURE_PASSWORD` ni `MAFIA_DEMO_IDENTIFIER`/`MAFIA_DEMO_PASSWORD` n'est exportée COMPLÈTE (les
MafiaCleanCity.Operational.Tests.DemolitionScreenPlayModeTests.EcranDemolitionC1_CapturerPourLeJugeVisuel_DeuxResolutions —   capture refusée (ecran_demolition) : ni `MAFIA_CAPTURE_IDENTIFIER`/`MAFIA_CAPTURE_PASSWORD` ni `MAFIA_DEMO_IDENTIFIER`/`MAFIA_DEMO_PASSWORD` n'est exportée COMPLÈTE (les
MafiaCleanCity.Operational.Tests.FiliereScreenPlayModeTests.ScreenC2C1_CapturerPourLeJugeVisuel_DeuxResolutions —   capture refusée (screen_c2) : ni `MAFIA_CAPTURE_IDENTIFIER`/`MAFIA_CAPTURE_PASSWORD` ni `MAFIA_DEMO_IDENTIFIER`/`MAFIA_DEMO_PASSWORD` n'est exportée COMPLÈTE (les deux moitiés d'
MafiaCleanCity.Operational.Tests.JournalScreenPlayModeTests.ScreenC1C1_CapturerPourLeJugeVisuel_DeuxResolutions —   capture refusée (screen_c1) : ni `MAFIA_CAPTURE_IDENTIFIER`/`MAFIA_CAPTURE_PASSWORD` ni `MAFIA_DEMO_IDENTIFIER`/`MAFIA_DEMO_PASSWORD` n'est exportée COMPLÈTE (les deux moitiés d'
MafiaCleanCity.Operational.Tests.ReputationScreenPlayModeTests.B3C1_CapturerPourLeJugeVisuel_DeuxResolutions —   capture refusée (screen_b3) : ni `MAFIA_CAPTURE_IDENTIFIER`/`MAFIA_CAPTURE_PASSWORD` ni `MAFIA_DEMO_IDENTIFIER`/`MAFIA_DEMO_PASSWORD` n'est exportée COMPLÈTE (les deux moitiés d'une
MafiaCleanCity.Shell.Tests.AppShellPlayModeTests.StaleAbandonedShell_NeverLeaksTenantContentUnderReusedCanvas —   prémisse : A a bien une liste de districts vivante avant l'entrée en scène de B

## skipped=3
MafiaCleanCity.Capture.Tests.VuePrincipaleCapturePlayModeTests.Capture_EcranExceptions_FileVide_SousChrome
MafiaCleanCity.Operational.Tests.ReputationScreenPlayModeTests.B3_ContenuDefilant_SertLesDeuxRegimes_EtLesDeuxSontExerces
MafiaCleanCity.Shell.Tests.CharpenteBootScenePlayModeTests.BLOQUANT_EffectiveBottomOverhangPx_SurvitAUneRepublication

## après le run
atlas sales : Assets/Fonts/DejaVuSans SDF.asset, DejaVuSerif SDF.asset → git checkout -- Assets/Fonts/
planches recapturées : 30 PNG sous Assets/Screenshots → restaurées (identité de capture non exportée : elles auraient photographié un autre compte ; la recapture est au créneau du juge)
segfault-lignes=0
