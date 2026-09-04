# Les catégories hors du juge — triage §F-4, 2026-09-04

**Ce que ce document est** : la liste des catégories PlayMode qu'AUCUN filtre exécutable ne peut
demander, chacune avec son verdict et la SOURCE de ce verdict. Un rouge de la suite de demain n'est
lisible que si l'on sait ce qui n'a pas tourné et pourquoi.

## Les comptes, et leurs dénominateurs

| grandeur | valeur |
|---|---|
| entrées du filtre `MafiaCI.Categories` | 28 |
| catégories PORTÉES par un test PlayMode | 64 |
| dont inscrites exactement | 28 |
| dont joignables PAR PRÉFIXE | **0** |
| **dont ORPHELINES** | **36** |
| entrées du filtre SANS porteur | **0** |

⚠️ **Le filtre d'Unity matche par PRÉFIXE, pas exactement** — piège déjà payé ici (`"HUD"` ne prenait
que `HUDv31` et laissait le test décisif dehors). Le compte ci-dessus l'intègre : une catégorie n'est
déclarée orpheline que si AUCUNE entrée du filtre n'en est un préfixe. Mesuré : 0 catégorie n'est
sauvée par le préfixe, donc l'orphelinat est réel et non un artefact de motif.

⚠️ **ÉNONCÉ DATÉ DU RUNBOOK, CORRIGÉ ICI** : §4.3 dit « **les huit** `Photo*` ». Elles sont
**14**. Six ont été ajoutées depuis, chacune de bonne foi, aucune n'a rouvert la phrase
qui les compte. *Un nombre écrit dans une prose ne se met pas à jour tout seul* — et celui-ci
gouverne une politique d'exclusion, donc son vieillissement se paie en couverture qu'on croit avoir.

⚠️ **Ce que ce triage NE dit PAS** : une catégorie « À MESURER » n'est ni verte ni rouge — elle n'a
jamais été lancée seule. Les verdicts marqués (runbook §4.x) sont RECOPIÉS d'une mesure d'autrui et
non refaits : ils portent la date de cette mesure, pas celle de ce document.

## ⛔⛔ LA RÈGLE D'EXCLUSION VISE UN NOM LÀ OÙ SA RAISON DÉSIGNE UNE PROPRIÉTÉ

Le runbook §4.3 exclut les `Photo*` avec une raison écrite : « elles écrivent des PNG dans
`Assets/Screenshots` à chaque exécution ; sous le juge, l'arbre se salit à chaque run ». La raison
est juste. **Le critère ne l'est pas** : il porte sur le PRÉFIXE DU NOM, pas sur l'écriture.

Mesuré le 2026-09-04 (motif : `EncodeToPNG|WriteAllBytes|CapturerLocataire|CapturerA|ScreenCapture`
sur le fichier porteur) :

| population | écrivent des images |
|---|---|
| les 14 `Photo*` (exclues par la règle) | 14 / 14 |
| **les 28 entrées DÉJÀ INSCRITES au filtre** | **14 / 28** |
| les 15 catégories orphelines encore à mesurer | 8 / 15 |

⇒ **La règle écarte quatorze écrivains et en admet quatorze autres.** `Charpente`, `ScreenB3`,
`CaptureDistrict`, `CaptureReputation`, `CaptureFamille`, `ScreenCarte`, `CaptureCarte`, `ScreenB7`,
`ScreenC1`, `ScreenC6`, `EcranDelegation`, `ScreenC2`, `EcranDemolition`, `ScreenC3` sont dans le
filtre et écrivent des PNG à chaque run du juge. La propriété que l'exclusion invoque pour se
justifier est donc **déjà vraie de la moitié de ce qu'elle laisse passer**.

★ Et ce n'est pas une hypothèse : je l'ai subi ce matin. Un run de la seule catégorie
`PhotoManquants` a re-rendu **quatre planches d'autres écrans** et fait grossir **les trois atlas de
police** — tous restaurés à la main par `git checkout` avant commit. Un run du juge sur `Charpente`
ou `CaptureDistrict` fait exactement la même chose, sans que rien ne le signale.

⇒ **Ce qui doit être arbitré (98 tient le runbook §4)** : soit le critère devient la PROPRIÉTÉ —
mesurable, et l'instrument est écrit — et alors 14 entrées inscrites en sortent ; soit l'exclusion
des `Photo*` a une autre raison que celle qui est écrite, et c'est cette raison-là qu'il faut
écrire. *Une règle dont la raison est déjà fausse de la moitié de sa population n'est pas une
règle, c'est une convention de nommage.*
⚠️ Je ne tranche pas ici : la politique appartient au runbook, pas à ce triage. Ce document apporte
la mesure et son dénominateur.

## Le triage

| catégorie | tests | fichiers | où | verdict | source / raison |
|---|---|---|---|---|---|
| `Screenshot` | 38 | 11 | `AshLuxuryPlayModeTests.cs`, `BuildingCardPlayModeTests.cs`, `BuildingCardRaidPlayModeTests.cs`, `CrickColdChainPlayModeTests.cs`, `DashboardPlayModeTests.cs`, `DistributionHubPlayModeTests.cs`, `GrowHousePlayModeTests.cs`, `LaunderingPlayModeTests.cs`, `MoneyHoldingPlayModeTests.cs`, `OperationalLoopPlayModeTests.cs`, `PipelineOverviewPlayModeTests.cs` | **A MESURER** |  |
| `Capture` | 37 | 4 | `ForensicScreenPlayModeTests.cs`, `HorizonScreenPlayModeTests.cs`, `ReputationScreenPlayModeTests.cs`, `VuePrincipaleCapturePlayModeTests.cs` | **EXCLUE** | SIGSEGV sous le pilote Mesa (runbook 4.3, déjà documentée) |
| `HUDv31` | 19 | 4 | `ChromeMultiResolutionPlayModeTests.cs`, `ChromeSafeAreaPlayModeTests.cs`, `ChromeTabBarPlayModeTests.cs`, `TopBarDoctrineV31PlayModeTests.cs` | **EXCLUE** | 12 tests verts puis SIGSEGV core dumped, process pendu jusqu au plafond 904s (runbook 4.2) |
| `EcranDistribution` | 19 | 1 | `DistributionScreenPlayModeTests.cs` | **ROUGE** | capture 1080x1920 entierement UNIFORME — l ecran n a rien rendu (runbook 4.2) |
| `CaptureDetail` | 16 | 1 | `VuePrincipaleCapturePlayModeTests.cs` | **A MESURER** |  |
| `CaptureDossier` | 16 | 1 | `VuePrincipaleCapturePlayModeTests.cs` | **EXCLUE** | TD-576 : idem |
| `CaptureExceptions` | 16 | 1 | `VuePrincipaleCapturePlayModeTests.cs` | **A MESURER** |  |
| `CaptureFiche` | 16 | 1 | `VuePrincipaleCapturePlayModeTests.cs` | **A MESURER** |  |
| `CaptureFiliere` | 16 | 1 | `VuePrincipaleCapturePlayModeTests.cs` | **EXCLUE** | TD-576 : idem |
| `CaptureJournal` | 16 | 1 | `VuePrincipaleCapturePlayModeTests.cs` | **EXCLUE** | TD-576 : passe SEULE, tombe EN GROUPE ; 5 runs, aucune addition unique ne reproduit |
| `CaptureSousChrome` | 16 | 1 | `VuePrincipaleCapturePlayModeTests.cs` | **A MESURER** |  |
| `MutationDeCarte` | 16 | 1 | `VuePrincipaleCapturePlayModeTests.cs` | **A MESURER** |  |
| `EcranLoi` | 14 | 1 | `LoiScreenPlayModeTests.cs` | **A MESURER** |  |
| `EcranConflit` | 9 | 1 | `ConflitScreenPlayModeTests.cs` | **A MESURER** |  |
| `Ecran10` | 8 | 1 | `ExceptionQueuePlayModeTests.cs` | **A MESURER** |  |
| `I18n` | 8 | 1 | `I18nCatalogPlayModeTests.cs` | **A MESURER** |  |
| `I18nReseau` | 8 | 1 | `I18nCatalogPlayModeTests.cs` | **A MESURER** |  |
| `PhotoEcranDelegation` | 7 | 1 | `DelegationScreenPlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
| `CaptureHorizon` | 6 | 1 | `HorizonScreenPlayModeTests.cs` | **A MESURER** |  |
| `ManometreOracle` | 5 | 1 | `ManometreOraclePlayModeTests.cs` | **EXCLUE** | SIGSEGV Mesa — 360 angles de rendu, 315 % CPU, 15 min avant de tomber (runbook 4.3) |
| `PhotoScreenC3` | 4 | 1 | `CarnetScreenPlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
| `PhotoScreenC3SousChrome` | 4 | 1 | `CarnetScreenPlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
| `CaptureForensic` | 4 | 1 | `ForensicScreenPlayModeTests.cs` | **A MESURER** |  |
| `BundleReel` | 2 | 1 | `BundleReelZeroRepliPlayModeTests.cs` | **A MESURER** |  |
| `PhotoEcranDemolition` | 2 | 1 | `DemolitionScreenPlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
| `JUGE` | 2 | 1 | `DistrictSocleFootprintPlayModeTests.cs` | **A MESURER** |  |
| `PhotoScreenC2` | 2 | 1 | `FiliereScreenPlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
| `PhotoScreenC1` | 2 | 1 | `JournalScreenPlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
| `PhotoDecision` | 1 | 1 | `DecisionDetailCapturePlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
| `PhotoVente` | 1 | 1 | `LaVenteCapturePlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
| `PhotoVitrine` | 1 | 1 | `LaVitrineCapturePlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
| `PhotoChantierC` | 1 | 1 | `PlancheChantierCCapturePlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
| `PhotoPlanche` | 1 | 1 | `PlancheEcransCapturePlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
| `PhotoManquants` | 1 | 1 | `PlancheEcransManquantsCapturePlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
| `PhotoEditeurRegles` | 1 | 1 | `PlancheEditeurDeReglesCapturePlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
| `PhotoRevue` | 1 | 1 | `RevueDuJourCapturePlayModeTests.cs` | **EXCLUE** | ecrit des PNG dans Assets/Screenshots a chaque execution — se lance a la main (runbook 4.3) |
