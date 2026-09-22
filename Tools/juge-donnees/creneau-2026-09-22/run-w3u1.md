# Rejeu de W3U1 seul — 2026-09-22, session mafia-builder-city-clean-91

Étape 3-bis du runbook (`Tools/CRENEAU-2026-09-22.md`), sur le signal « E2E fini » de l'orchestrateur : mcc-e2e = 0, charge 1,19,
aucun consommateur de la pile dev. Gouverneur CPU : **powersave** (relevé avant le run).
Objet : les deux rouges W3U1 du créneau de 16:26 (558289a0) — `C6F2` (garde vide révélée par 8166447a, correctif 7f842428) et
`C6F4` (délai du runner à 180 s sous E2E parallèle, `Timeout(300000)` e791546d) — plus le lot « conforme partout » (9212663d) et le
mode capture (2d2b41ff), qu'aucun run n'avait encore exercés.

## 0-2. Départ, typecheck
`gate/cumul-client-2026-09-22 · cd33ecf0 · 1` (seule ligne : le handoff) · 0 Unity · porte LIBRE.
Typecheck de fin de lot : **17/17, RC=0** (19:09:09 → 19:09:45), commit 86467fae.

## 1. Porte
`take mafia-builder-city-clean-91` → `PRIS … 2026-09-22 19:10:09` · RC_TAKE=0.

## 3-bis. Le run
```bash
env -u MAFIA_CAPTURE_IDENTIFIER -u MAFIA_CAPTURE_PASSWORD -u MAFIA_DEMO_IDENTIFIER -u MAFIA_DEMO_PASSWORD \
  LOG_FILE=… TIMEOUT_S=3600 WT=… MAFIA_CI_CATEGORIES="W3U1" \
  bash Tools/run-unity-check.sh -executeMethod MafiaCI.RunPlayModeTests
```
Attendu, lu dans les sources (`python3 Tools/compter-par-categorie.py W3U1`) : 38 déclarés / 38 exécutés, catégories PORTÉES = [W3U1].

```
elapsed=247s   (19:10:20 → 19:14:27)   RC_RUN=0
DÉCLARÉS SOUS LE FILTRE : 38
RunPlayModeTests finished — passed=38 failed=0 skipped=0 inconclusive=0 declares=38 comptes=38
MafiaCI: catégories RÉELLEMENT exécutées = [W3U1]
SUITE TRONQUÉE / FILTRE VIDE : aucune ligne · segfault-lignes=0
```
**38/38 VERTS.** Les trois tests visés :
- `C6F2_CohesionDetector_NamedUnavailable_PlusCitywideFieldOracleWithCapacityGuard` — PASSED. Le prédicat vise le texte de COHÉSION ;
  ses trois mondes dégénérés (autre texte porteur, cohésion anglaise, cohésion sans état) rendent faux, le contrôle positif vrai.
- `C6F4_CohesionProbe_SuccessBodyRequired_TickDimensioned_CapacityGuarded` — PASSED, **169 s** (19:11:29 → 19:14:18), gouverneur CPU
  **powersave**. Le test cite 134-135 s au repos ; 169 s tient sous l'ancienne limite de 180 s du runner, mais à 9 s près. C'est cette
  falaise que `Timeout(300000)` (e791546d) retire ; elle avait mordu pendant l'E2E de f7 (72 % CPU sur game-back).
- `StaleAbandonedShell_NeverLeaksTenantContentUnderReusedCanvas` — PASSED (le rouge de co-tenance du 22/09 ne s'est pas reproduit).

## Ce que ce run n'exerce PAS
`régime capture ON` : 0 · `OFF` : 0 · `IGNORÉE hors mode capture` : 0 — attendu : W3U1 ne contient aucune capture. Le mode capture
(2d2b41ff) et la garde d'effet posée dans les dix captures (9212663d) sont COMPILÉS (typecheck 86467fae) mais pas encore EXÉCUTÉS ;
ils le seront au créneau de recapture (étape 8).

## 4-6. Après le run
Atlas TMP sales (`Assets/Fonts/DejaVu{Sans,Serif} SDF.asset`) → `git checkout -- Assets/Fonts/`. **Aucune planche touchée.**
`release mafia-builder-city-clean-91 --atlas-vus` → `LIBRE (rendu par …)` · RC_REL=0 · 19:14:55. Porcelain : la seule ligne du handoff.
