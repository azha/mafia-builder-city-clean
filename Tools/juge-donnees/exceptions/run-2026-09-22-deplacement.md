# Créneau client-2 du 2026-09-22 (23:39:53 → 23:43:43) : valider le déplacement LongPressButton → ShellContracts (`0201b883`) sur `87240ae1`

## 1. Réimportation

error CS 0 · « Scripts have compiler errors » 0 · ^Aborting 0 · compilation 6,48 s. Log d'import : **0** ligne `Missing` / `could not be found` / conflit de GUID / nom des deux types (contrôle positif du même grep : 5 lignes `Start importing|Refresh`). `ShellContracts.csproj` cite `LongPressButton` (1), `Shell.csproj` ne le cite plus (0) ; `ShellContracts.dll` recompilée (log l.511).

## 2. typecheck --tout SANS --frais : 17/17 (ShellContracts 17 · Operational 66 · Shell 16 · Tests 138, aucun hors .csproj).

## 3. Run — filtre calculé AVANT le take (fichiers de test qui nomment LongPressButton/UiTimingTunables ou un type qui en pose un)

```
MafiaCI: RunPlayModeTests started — 626 test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous) — DÉCLARÉS SOUS LE FILTRE : 252
MafiaCI: RunPlayModeTests finished — passed=249 failed=2 skipped=1 inconclusive=0 declares=252 comptes=252
MafiaCI: catégories RÉELLEMENT exécutées = [Charpente, Ecran10, EcranExceptions, EcranFile, EcranRevue, Joignabilite, MenuPlus, Palette, W3U1, W3U2]
```

Attendu (`compter-par-categorie`) : 252 · 252 dont 1 [Ignore] · portées 10 (les 9 + MenuPlus) — **égal** (skipped=1 = le [Ignore]).
Exclues avec raison : 12 Capture* + 3 Photo* (paire d'identité non posée, aucune capture ce soir), MutationDeCarte (mute le compte de démo) — **non validées pour ce déplacement**.

## 4. Les 2 rouges, classés sur leur texte — tous deux de CLIENT-2, aucun du déplacement

| test | texte | classe | correctif |
|---|---|---|---|
| `ExceptionsTamponPlayModeTests.R10ter_AppuiLong_EmetLaResolutionServie` | « la file est rechargée après la résolution — Expected: 0 But was: 1 » | **défaut du TEST** : la boucle sortait sur l'issue, avant le rechargement (coroutine imbriquée, une frame plus tard). La requête émise (route + corps) et l'issue passaient. | attendre issue ET file rechargée |
| `LitterauxDeCouleurPlayModeTests.AucunLitteralDeCouleurNeRecopieUnTokenNomme` (Palette) | « TD-612 — 49 littéral(aux) … dans 11 fichier(s) » | **15 de CLIENT-2** (RevueDuJourDecor ×14 ⑯-7, DailyReviewScreenController:690 ⑯-3) · **34 ANTÉRIEURS** (9 fichiers, commits du 02-03/09, ancêtres de 569e3534 : la garde était déjà rouge avant ces lots) | les 15 passent par leurs tokens |

Porte rendue 23:43:43 (`--atlas-vus`) après `git checkout -- Assets/Fonts/ Assets/Screenshots/` (réécrits par Charpente : DejaVuSerif SDF.asset + 3 planches accueil_panneaux).
