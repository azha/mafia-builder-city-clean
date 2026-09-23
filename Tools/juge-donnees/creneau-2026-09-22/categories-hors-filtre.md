# Catégories de test HORS du filtre par défaut de MafiaCI — mesure statique (2026-09-23)

Outil : `hors-filtre.py` (ce dossier) — toute `[Category("…")]` d'`Assets/Tests` qu'AUCUNE entrée du filtre n'emporte par préfixe ; compte au compteur ; raison = 1ʳᵉ ligne de commentaire de `MafiaCI.cs` qui la nomme ; dernier run = preuve versionnée sous `Tools/` (motif `MAFIA_CI_CATEGORIES=` ou « RÉELLEMENT exécutées ») ou journal local de la session CLIENT UNITY du 22-23/09.

Décision de l'orchestrateur (23/09) : lancer au prochain créneau les candidates SANS raison ni run — HUDv31, ManometreOracle, CarteActions, IconesDispatcher, PoliceGras, VideChezLeNouveau (pas CaptureNuit : capture, exige la paire) ; `MutationDeCarte` : lire son corps d'abord. Verte ⇒ inscrite avec compte et provenance ; rouge ⇒ classée, non inscrite ; toute catégorie qui reste dehors reçoit une raison écrite dans MafiaCI.

```
87 catégories dans Assets/Tests · filtre : 55 · HORS filtre (aucune entrée du filtre n'en est préfixe) : 32
Capture | 21 | Capture (1). Quatre d'entre elles restent DÉLIBÉRÉMENT hors filtre — `Screenshot`, | aucune trace versionnée · journal local rejeu-p1.log (2026-09-22 23:05, passed=421 failed=0)
CaptureDossier | 1 | ⛔⛔ `CaptureJournal` / `CaptureFiliere` / `CaptureDossier` NON INSCRITES — elles passent | aucune trace versionnée
CaptureFiliere | 1 | ⛔⛔ `CaptureJournal` / `CaptureFiliere` / `CaptureDossier` NON INSCRITES — elles passent | aucune trace versionnée
CaptureJournal | 1 | ⛔⛔ `CaptureJournal` / `CaptureFiliere` / `CaptureDossier` NON INSCRITES — elles passent | 2026-09-22 — Tools/juge-visuel/screen_c1/r2-2026-09-22/dossier.md
CaptureNuit | 1 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée
CarteActions | 3 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée
HUDv31 | 32 | W3U1 (10), HUDv31 (5), Charpente (5), W4P4a (3), W3UDA (3), ScreenB3 (1), JUGE (1), | aucune trace versionnée
IconesDispatcher | 1 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée
ManometreOracle | 5 | ⇒ Le fichier fautif est sorti de `HUDv31` (catégorie `ManometreOracle`, hors filtre, même | aucune trace versionnée
MenuPlus | 3 | (aucune raison écrite dans MafiaCI.cs) | 2026-09-22 — Tools/juge-donnees/exceptions/run-2026-09-22-deplacement.md · journal local p1-533.log (2026-09-23 03:57, passed=532 failed=0)
MutationDeCarte | 1 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée
PhotoChantierC | 1 | 8 `Photo*` dehors et 2 dedans (`PhotoChantierC`, `PhotoEcranAppro`), pendant que je refusais | 2026-09-22 — Tools/juge-visuel/ecran_loi/r2-2026-09-22/dossier.md
PhotoDecision | 1 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée
PhotoEcranDelegation | 1 | ⚠️ `PhotoEcranDelegation` n'est PAS inscrite, et c'est délibéré : les catégories `Photo*` | aucune trace versionnée
PhotoEcranDemolition | 1 | (aucune raison écrite dans MafiaCI.cs) | 2026-09-22 — Tools/juge-donnees/creneau-2026-09-22/run.md · journal local creneau.log (2026-09-22 16:35, passed=170 failed=3)
PhotoEditeurRegles | 1 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée
PhotoManquants | 1 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée
PhotoPlanche | 1 | run. Même régime que `PhotoPlanche`/`PhotoRevue`. | 2026-09-22 — Tools/juge-visuel/vente/r2-2026-09-22/dossier.md
PhotoRevue | 1 | run. Même régime que `PhotoPlanche`/`PhotoRevue`. | aucune trace versionnée
PhotoScreenB3 | 1 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée
PhotoScreenB7 | 1 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée · journal local rejeu-p1.log (2026-09-22 23:05, passed=421 failed=0)
PhotoScreenC1 | 1 | (aucune raison écrite dans MafiaCI.cs) | 2026-09-22 — Tools/juge-visuel/screen_c1/r2-2026-09-22/dossier.md
PhotoScreenC2 | 1 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée
PhotoScreenC3 | 1 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée
PhotoScreenC3SousChrome | 1 | (aucune raison écrite dans MafiaCI.cs) | 2026-09-22 — Tools/juge-visuel/carnet/r2-2026-09-22/dossier.md
PhotoScreenC6 | 1 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée
PhotoVente | 1 | [FicheBlanchiment, FicheCollecte, Graisses, PhotoVente, VenteRamassage]. | 2026-09-22 — Tools/juge-visuel/vente/r2-2026-09-22/dossier.md
PhotoVitrine | 1 | (aucune raison écrite dans MafiaCI.cs) | 2026-09-22 — Tools/juge-visuel/compte/r2-㉓-2026-09-22/dossier.md
PoliceGras | 1 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée
Screenshot | 11 | l'ajouter — les catégories réellement portées par la suite sont W3U2 (17), Screenshot (11), | 2026-09-22 — Tools/CRENEAU-2026-09-22.md
SondeFuiteCatalogue | 3 | (aucune raison écrite dans MafiaCI.cs) | 2026-09-22 — Tools/CRENEAU-2026-09-22.md · journal local sonde3.log (2026-09-23 03:58, passed=3 failed=0)
VideChezLeNouveau | 1 | (aucune raison écrite dans MafiaCI.cs) | aucune trace versionnée
```

## Créneau du 2026-09-23 05:18-05:58 — le verdict des candidates (tête 8d689a75, sans la paire)
Journaux locaux : `creneau-hf{,2,3,4}.log` (passages 1 à 4). Déclarés == comptés partout.
| catégorie | décl. | résultat | passage | décision |
|---|---|---|---|---|
| HUDv31 | 32 | 32/32 | 2 (05:51, VERDICT 0) | **inscrite** |
| CarteActions | 3 | 3/3 | 2 | **inscrite** |
| PoliceGras | 1 | 1/1 | 2 | **inscrite** |
| VideChezLeNouveau | 1 | 1/1 | 2 | **inscrite** |
| IconesDispatcher | 1 | 1/1 | 1 | **inscrite** |
| EcranDistrict (non listée plus haut : ⑬ de CLIENT-2, entrée au merge de ada52db4) | 10 | 10/10 | 1 | **inscrite** |
| ManometreOracle | 5 | `Oracle1` GÈLE, reproduit SEUL (passage 4, par nom) ; les 4 autres jamais exécutés | 1 et 4 | dehors, raison écrite dans MafiaCI ; les 4 autres à mesurer par nom |
| MutationDeCarte | 1 | non lancée (elle mute le compte de capture) | — | dehors par construction, raison écrite (5248e117) |
| Screenshot (DashboardPlayModeTests, par nom) | 1 | ROUGE : détruit la planche commitée avant une capture qui n'écrit rien | 3 | dehors (TD-625), dette dans `dette-captures.md` |
| CaptureNuit | 1 | non lancée (capture, exige la paire) | — | inchangée |
Filtre par défaut : 55 catégories / 591 tests → **61 / 639**.

