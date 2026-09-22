# Partie 1 du cumul regroupé — 2026-09-23 00:16, session mafia-builder-city-clean-91

Arbre : `94d65a50` (merges atelier d65ac811 + CLIENT-2 8d632ebd, EcranRevue/EcranFile inscrites). Pile dev : back `40128b53`
(branche non gatée ; sert les 3 gestes de ㉔ et les clés de ⑨-4). Sans la paire (`env -u` des quatre), `MAFIA_DEMO_*` absentes
vérifiées dans le même `bash -c`. 37 catégories (liste du runbook, étape 7-ter).

| | |
|---|---|
| lancement → fin | 00:16:56 → 00:22:08 (elapsed=312s) · RC_RUN=1 |
| DÉCLARÉS SOUS LE FILTRE | 500 |
| fin | `passed=497 failed=2 skipped=1 inconclusive=0 declares=500 comptes=500` |
| catégories non demandées | `[MenuPlus]` (préfixe, attendu) |
| « capture refusée » | 0 |
| régime capture | UNE paire ON/OFF, « (falsifiable) » — attendu |
| segfault | 0 |
| BundleReel | VERT — construction de ⑥ comptée, 0 repli contre 40128b53 |

Rouges (2), tous deux de MES lots, aucun de CLIENT-2 ni de l'atelier :
1. `I18nCatalogPlayModeTests.ArchetypeServi_RendLeTexteDuCatalogue("MUSCLE")` — précondition absente : la classe d'avant
   (`InspectionScreenPlayModeTests`) laisse le bundle réel chargé ; clé servie ⇒ aucun repli ⇒ `DernierRepli` null.
   Corrigé en 92c13af7 (SetUp : Oublier + RemettreLesCompteurs).
2. `HudPlayModeTests.F2_SeverityTokenAccesses_…` — 41 contre 40 : `ForensicScreenController.cs:565`, `case Gravite.Franchi`,
   ajouté par ae661b46 (㊴). Usage légitime ; allowlist amendée nommément en dc36459e.

Après le run : Fonts et 5 Screenshots de sondes restaurés (`git checkout`), porte rendue 00:22:27 (RC_REL=0).
Rejeu dû, au créneau court après le gate du back : `I18n,W3U2` (les deux classes corrigées) — compte à lire au compteur avant le run.
