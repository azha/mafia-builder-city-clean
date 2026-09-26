# Dettes client — CLIENT-1 (plage TD-751 à TD-759)

Plage attribuée par l'orchestrateur le 2026-09-26 (TD-750 est à CLIENT-2 ; CLIENT-2 tient 760-769). Le back reporte ces lignes au
registre. Une dette vit ici ET au site, en commentaire `⛔ TD-7xx` — jamais seulement dans un handoff non suivi.

| Id | Date | Site | Dette | Pour la fermer |
|---|---|---|---|---|
| TD-751 | 2026-09-26 | `Assets/Editor/MafiaCI.cs` (filtre `MAFIA_CI_TESTS`) | Le compteur de « déclarés » ne lit que des noms de TEST complets. Un filtre par noms de CLASSE, qu'Unity exécute bien, rend `declares=0`, `filtreVide=1` et donc `VERDICT code=1` sur un run tout vert (créneau du 26/09, run 2 : 9 classes, 35/35, recomptés à la main). | Compter aussi les fixtures (déclarés = somme de leurs tests) avant d'accepter un nom de classe comme connu. |
| TD-754 | 2026-09-26 | l'éditeur Unity en batchmode (rendu URP), `Tools/run-unity-check.sh` | SIGSEGV natif dans le rendu (`Camera.Render` → `RenderPipelineManager.DoRenderLoop_Internal`) pendant `ReputationScreenPlayModeTests.B3H1_SondeDEffet_LeHaloDesCompteurs_RendDesPixelsOuNEnRendPas`, après 423 tests lancés (420 verts) d'une liste de 599, à 352 s. **Ne se reproduit PAS seul** : `ScreenB3` seule, 16/16 + 1 ignoré. Classe environnement / ordre, pas le test. Journal : run 1 du créneau CLIENT-1 du 26/09 (pile 1ffb08b4, cumul 386e4a38). | Si ça revient : découper la liste en deux runs (orchestrateur) ; relever la signature (test en cours, nombre de tests avant) à chaque occurrence. |

Libres : TD-752, TD-753, TD-755 à TD-759. (TD-752 : Keystore pour B5, réservée ; TD-753 : sans objet depuis les noms de l'atelier, table 79.)
