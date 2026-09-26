# Dettes client — CLIENT-1 (plage TD-751 à TD-759)

Plage attribuée par l'orchestrateur le 2026-09-26 (TD-750 est à CLIENT-2 ; CLIENT-2 tient 760-769). Le back reporte ces lignes au
registre. Une dette vit ici ET au site, en commentaire `⛔ TD-7xx` — jamais seulement dans un handoff non suivi.

| Id | Date | Site | Dette | Pour la fermer |
|---|---|---|---|---|
| TD-751 | 2026-09-26 | `Assets/Editor/MafiaCI.cs` (filtre `MAFIA_CI_TESTS`) | Le compteur de « déclarés » ne lit que des noms de TEST complets. Un filtre par noms de CLASSE, qu'Unity exécute bien, rend `declares=0`, `filtreVide=1` et donc `VERDICT code=1` sur un run tout vert (créneau du 26/09, run 2 : 9 classes, 35/35, recomptés à la main). | Compter aussi les fixtures (déclarés = somme de leurs tests) avant d'accepter un nom de classe comme connu. |

Libres : TD-752 à TD-759.
