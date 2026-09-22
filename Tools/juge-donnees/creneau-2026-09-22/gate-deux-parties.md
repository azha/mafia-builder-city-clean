# Gate client en deux parties — listes mesurées (2026-09-22, arbre HEAD c0790484 + garde d'effet sur les planches)

Produit par `python3 Tools/compter-par-categorie.py <liste> --detail` et par la lecture du corps de chaque méthode de test (appel,
direct ou par une aide du même fichier, de `IdentiteDeCaptureOuEchoue` / `CapturerLocataire` / `ShellConnecteOuEchoue`).
⚠️ Remplace la version de de9e9e6d (39 + 12, 420 + 46) : la garde d'effet posée le 22/09 au soir sur les planches de compte a fait
passer six catégories dans la partie 2 (CaptureCarte, CaptureDetail, CaptureFamille, CaptureForensic, CaptureReputation, ScreenB7).

**Filtre par défaut de MafiaCI : 51 catégories, 468 tests.** Tests qui EXIGENT la paire de capture : **20** —

- `CarnetScreenPlayModeTests.ScreenC3C2_CapturerSousLeChromeReel_ParLeCheminDuJoueur`
- `DelegationScreenPlayModeTests.EcranDelegationC1_CapturerPourLeJugeVisuel_DeuxResolutions`
- `DemolitionScreenPlayModeTests.EcranDemolitionC1_CapturerPourLeJugeVisuel_DeuxResolutions`
- `FamilleCapturePlayModeTests.Capture_Famille_1080x2400`
- `FiliereScreenPlayModeTests.ScreenC2C1_CapturerPourLeJugeVisuel_DeuxResolutions`
- `ForensicScreenPlayModeTests.ScreenB7C2_CapturerParLeReseau`
- `HorizonScreenPlayModeTests.ScreenC6C1_CapturerPourLeJugeVisuel_DeuxResolutions`
- `HorizonScreenPlayModeTests.ScreenC6C2_CapturerEtatVide_ChargeParLeReseau`
- `JournalScreenPlayModeTests.ScreenC1C1_CapturerPourLeJugeVisuel_DeuxResolutions`
- `ReputationScreenPlayModeTests.B3C1_CapturerPourLeJugeVisuel_DeuxResolutions`
- `VuePrincipaleCapturePlayModeTests.Capture_CarteDeVille_SousChromeV31`
- `VuePrincipaleCapturePlayModeTests.Capture_Detail_MainDeCartes_SousChrome`
- `VuePrincipaleCapturePlayModeTests.Capture_EcranExceptions`
- `VuePrincipaleCapturePlayModeTests.Capture_EcranExceptions_FileVide_SousChrome`
- `VuePrincipaleCapturePlayModeTests.Capture_EcranExceptions_SousChrome`
- `VuePrincipaleCapturePlayModeTests.Capture_EcranReputation_SousChrome`
- `VuePrincipaleCapturePlayModeTests.Capture_FicheBatiment`
- `VuePrincipaleCapturePlayModeTests.Capture_FicheBatiment_SousChrome`
- `VuePrincipaleCapturePlayModeTests.Capture_Horizon_SousChrome`
- `VuePrincipaleCapturePlayModeTests.Capture_VuePrincipale_DistrictAvecBatiments_SousChromeV31`

**Partie 2 (avec la paire)** : **18 catégories, 54 tests**. **Partie 1 (sans la paire)** : **33 catégories, 414 tests**.
**Recouvrement : 0 test · 414 + 54 = 468 = le filtre par défaut.**

**Étape 8** = partie 2 ∪ recapture ∪ CaptureFamille, CaptureReputation : **25 catégories, 59 tests, dont 25 exigent la paire**, aucune relation de préfixe.

## Partie 1 — sans la paire

| catégorie | déclarés | exécutés |
|---|---|---|
| W4P4a | 7 | 7 |
| W3UDA | 48 | 48 |
| W3U1 | 38 | 38 |
| W3U2 | 98 | 98 |
| Charpente | 40 | 40 |
| DemoIdentity | 50 | 50 |
| ShellSurimpression | 2 | 2 |
| Joignabilite | 13 | 13 |
| ScreenCarte | 9 | 9 |
| EcranAutonomy | 4 | 4 |
| EcranExceptions | 19 | 19 |
| EcranRegleLieutenant | 4 | 4 |
| EcranTenureLieutenant | 4 | 4 |
| EcranUiLieutenant | 5 | 5 |
| EcranRegleTier2 | 2 | 2 |
| EcranAppro | 7 | 7 |
| EcranLoi | 14 | 14 |
| EcranConflit | 9 | 9 |
| Ecran10 | 2 | 2 |
| I18n | 17 | 17 |
| I18nReseau | 1 | 1 |
| BundleReel | 2 | 2 |
| JUGE | 2 | 2 |
| FicheTete | 2 | 2 |
| Graisses | 1 | 1 |
| CarteIcones | 2 | 2 |
| IconesArchetype | 2 | 2 |
| BlocPartage | 4 | 4 |
| ChassisVente | 1 | 1 |
| FicheBlanchiment | 1 | 1 |
| FicheCollecte | 1 | 1 |
| VenteRamassage | 1 | 1 |
| Inspection | 5 | 5 |

## Partie 2 — avec la paire

| catégorie | déclarés | exécutés |
|---|---|---|
| CaptureCarte | 1 | 1 |
| CaptureDetail | 1 | 1 |
| CaptureDistrict | 1 | 1 |
| CaptureExceptions | 1 | 1 |
| CaptureFamille | 1 | 1 |
| CaptureFiche | 1 | 1 |
| CaptureForensic | 1 | 1 |
| CaptureHorizon | 1 | 1 |
| CaptureReputation | 1 | 1 |
| CaptureSousChrome | 4 | 4 |
| EcranDelegation | 7 | 7 |
| EcranDemolition | 3 | 3 |
| ScreenB3 | 15 | 15 |
| ScreenB7 | 4 | 4 |
| ScreenC1 | 2 | 2 |
| ScreenC2 | 2 | 2 |
| ScreenC3 | 4 | 4 |
| ScreenC6 | 6 | 6 |

⚠️ Les sommes par catégorie dépassent les totaux quand un test porte deux catégories de la même liste : le total compte un test une fois.
