# ⑯ — créneau client-2 du 2026-09-22 (23:06:03 → 23:07:43) : réimportation + EcranRevue sur `2199b9ad`

Porte prise 23:06:03 (`porte-puis.sh client-2`), rendue 23:07:43 (`release --atlas-vus`). Pile dev non consommée (tests purs). Aucune capture.

## 1. Réimportation (`run-unity-check.sh`, chemin compile)

```
error CS : 0 · « Scripts have compiler errors » : 0 · ^Aborting batchmode : 0
AssetDatabase: script compilation time: 6.428988s
Start importing Assets/Art/Scenes/Resources using Guid(a18ffc2a9b4c49758f8e7e458dd47826) (DefaultImporter) -> (Import Result ID: 'd86cf9b578089d00486e
Start importing Assets/Art/Scenes/Resources/Scenes/sprite_environment_verge_d_or_jour.png using Guid(bb433370d4fb478bb2656fd3654dd3b9) (TextureImporte
Exiting batchmode successfully now!
```
Le PNG du décor est importé sous les GUID écrits à la main (texture `bb433370…`). `git status --porcelain` = 0 après import : aucun .meta réécrit.

## 2. typecheck-hors-porte --tout, SANS --frais (DLL rafraîchies)

17/17 EXIT=0 · Shell 17 sources · CityMap.PlayMode.Tests 132 sources (plus aucun fichier « hors .csproj »).

## 3. EcranRevue (`MAFIA_CI_CATEGORIES=EcranRevue`, `MafiaCI.RunPlayModeTests`)

```
MafiaCI: RunPlayModeTests started — 608 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous) — DÉCLARÉS SOUS LE FILTRE : 21
MafiaCI: RunPlayModeTests finished — passed=21 failed=0 skipped=0 inconclusive=0 declares=21 comptes=21
MafiaCI: catégories RÉELLEMENT exécutées = [EcranRevue]
```

Attendu par `compter-par-categorie.py EcranRevue` : déclarés 21 · exécutés 21 · portées [EcranRevue] — **égal**.

| test | verdict |
|---|---|
| `RevueDuJourBandesPlayModeTests.R0_ChaqueValeurDuTypeBack_RendUneReserveNonVide` | PASSED |
| `RevueDuJourBandesPlayModeTests.R0bis_UneValeurHorsDomaine_NeSeDeguisePasEnBandeConnue` | PASSED |
| `RevueDuJourDecorPlayModeTests.R7_LeDecorEstSousLeComptoir` | PASSED |
| `RevueDuJourDecorPlayModeTests.R7bis_LeZincSuitLEtat_EtLesTabouretsNeViennentQueSurV41` | PASSED |
| `RevueDuJourDecorPlayModeTests.R7quater_LeFondEstMonte_SonCheminResourcesSeCharge` | PASSED |
| `RevueDuJourDecorPlayModeTests.R7ter_LaDecoupeCover_EstLaFenetreDeLAtelier` | PASSED |
| `RevueDuJourPhrasesPlayModeTests.R4_ChaqueGenerateur_ASaPhrase` | PASSED |
| `RevueDuJourPhrasesPlayModeTests.R4bis_UneCleInconnue_DonneLeRepli` | PASSED |
| `RevueDuJourPhrasesPlayModeTests.R4quater_SurUnBillet_LaPhraseEstCelleDuGenerateur` | PASSED |
| `RevueDuJourPhrasesPlayModeTests.R4ter_LesTroisPhrasesRatifiees_Verbatim` | PASSED |
| `RevueDuJourPlaquePlayModeTests.R2_FileVide_LaPlaqueDuMatinPorteLeTexteEtLesSourcesDeV41` | PASSED |
| `RevueDuJourPlaquePlayModeTests.R2bis_DesCartes_PasDePlaqueDuMatin` | PASSED |
| `RevueDuJourTamponPlayModeTests.R1_FileVide_FeuVert_LeTamponEstPoseAvecLaPhraseDeV41` | PASSED |
| `RevueDuJourTamponPlayModeTests.R1bis_FileVide_SansFeuVert_PasDeTampon` | PASSED |
| `RevueDuJourTamponPlayModeTests.R1ter_TroisCartes_FeuVert_LeTamponResteEtLaPhraseChangeDeBranche` | PASSED |
| `RevueDuJourVerdictsPlayModeTests.R3_Rendu_LeBilletResteAttenueEtLeVoisinEstIntact` | PASSED |
| `RevueDuJourVerdictsPlayModeTests.R3bis_Perdu_AuJour12_RemiseDans2Jours` | PASSED |
| `RevueDuJourVerdictsPlayModeTests.R3quater_UnReRendu_NeDefaitPasUnVerdict` | PASSED |
| `RevueDuJourVerdictsPlayModeTests.R3quint_LeLot_SigneLeRegistre_EtUnLotDeZeroNeSigneRien` | PASSED |
| `RevueDuJourVerdictsPlayModeTests.R3sext_LePapierDuTamponEstPlein` | PASSED |
| `RevueDuJourVerdictsPlayModeTests.R3ter_LaRemise_SeptMoinsLeJourModuloSept` | PASSED |

**R7quater (le décor MONTÉ : `Resources.Load` 1728×1080 et la scène de l'écran porte CETTE texture) : PASSED.**
Tests purs : ils prouvent la STRUCTURE et les SOURCES (textes, jetons, états, UV, fond chargé). Ils ne prouvent pas le rendu : la 1080×1920, la 1080×2400 et les juges ⊥ attendent la paire `MAFIA_CAPTURE_*`.

Logs complets (non commités) : `reimport-2199b9ad.log`, `ecranrevue-2199b9ad.log` dans le scratchpad de la session.
