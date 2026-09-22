# Rejeu de la partie 1 du gate client — 2026-09-22 22:59 → 23:05, après les correctifs 5fd5f050

HEAD **5fd5f050** (typecheck 17/17, arbre f4e7a13e = ce commit). Back `X-Server-Build 4841d7ad`. 0 E2E, charge 1,13. Porte prise
22:59:49, rendue 23:05:29 (`--atlas-vus`). Même commande que la partie 1 (runbook 7-ter), liste inchangée (39 catégories), 422 tests
(I18n passe de 15 à 17 avec la garde neuve). Première ligne de la sortie : `MAFIA_DEMO_* absentes (attendu)`.

```
elapsed=323s   (22:59:56 → 23:05:19)   RC_RUN=0
DÉCLARÉS SOUS LE FILTRE : 422
RunPlayModeTests finished — passed=421 failed=0 skipped=1 inconclusive=0 declares=422 comptes=422
catégories RÉELLEMENT exécutées : 42 · segfault 0 · SUITE TRONQUÉE / FILTRE VIDE : aucune
capture refusée 0 · régime capture ON 1 / OFF 1 (le test pur « falsifiable », seul)
```
Seul ignoré : l'`[Ignore]` statique `BLOQUANT_EffectiveBottomOverhangPx_SurvitAUneRepublication`.

## Les quatre rouges de 22:44 (gate-p1.md)
| test | 22:44 | 23:05 | classement |
|---|---|---|---|
| `EcranLoiE1_EtatVide_MessagesHonnetesSurLesDeuxSections` | rouge | **vert** | régression de test (ebf97d1e) — corrigée : le test lit `LoiScreenController.NoteAffaires` |
| `C2_AccueilMonteLes4PanneauxNommes_…` | rouge | **vert** | régression de test (8166447a) — corrigée : le test lit `OrgVitalsPanelController.NomTension` |
| `BLOQUANT2_DashboardMonteEnSurimpression…` | rouge | **vert** | régression de CODE (ffe5fba5) — corrigée : `Nav_{idStable}`, classe entière (18 sites) |
| `Ecran9_ChaqueAttendantOuvreSaPropreCarte` | rouge | **vert** | **co-tenance TD-576** : vert sans changement de son code ni de son test |

⚠️ Ecran9 : le vert est une DISPARITION dans un voisinage identique (même liste, même ordre) — l'orphelin d'une classe voisine,
détruit en différé, n'a pas parlé cette fois. La cause n'est pas retirée ; elle reste dans le dépôt (`Tools/lister-destructions-differees.py`).

La garde neuve : `IdentiteNonDeriveeDuTexteTests.AucunNomDObjet_NeDeriveDUnTexteAffiche` et
`ControlePositif_LaGardeMordSurLesFormesQuiOntCasse` — PASSED.

## Par catégorie — chaque « exécutés » égale le compte attendu
```
résultats lus : 422 · PASS 421 · FAIL 0 · SKIP 1 · non rattachés aux sources : 0
| catégorie | exécutés | verts | rouges | ignorés |
|---|---|---|---|---|
| W4P4a | 7 | 7 | 0 | 0 |
| W3UDA | 48 | 48 | 0 | 0 |
| W3U1 | 38 | 38 | 0 | 0 |
| W3U2 | 98 | 98 | 0 | 0 |
| Charpente | 40 | 39 | 0 | 1 |
| DemoIdentity | 50 | 50 | 0 | 0 |
| ShellSurimpression | 2 | 2 | 0 | 0 |
| CaptureReputation | 1 | 1 | 0 | 0 |
| CaptureFamille | 1 | 1 | 0 | 0 |
| Joignabilite | 13 | 13 | 0 | 0 |
| ScreenCarte | 9 | 9 | 0 | 0 |
| CaptureCarte | 1 | 1 | 0 | 0 |
| EcranAutonomy | 4 | 4 | 0 | 0 |
| EcranExceptions | 19 | 19 | 0 | 0 |
| EcranRegleLieutenant | 4 | 4 | 0 | 0 |
| EcranTenureLieutenant | 4 | 4 | 0 | 0 |
| EcranUiLieutenant | 5 | 5 | 0 | 0 |
| EcranRegleTier2 | 2 | 2 | 0 | 0 |
| EcranAppro | 7 | 7 | 0 | 0 |
| ScreenB7 | 4 | 4 | 0 | 0 |
| EcranLoi | 14 | 14 | 0 | 0 |
| EcranConflit | 9 | 9 | 0 | 0 |
| Ecran10 | 2 | 2 | 0 | 0 |
| I18n | 17 | 17 | 0 | 0 |
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

## Après
15 planches réécrites sans paire et les deux atlas TMP → restaurés. Porcelain : le seul handoff.
