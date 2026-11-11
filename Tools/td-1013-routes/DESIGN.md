# TD-1013 — ㉚ `SupplyChainRouteDto` déclare les 7 clés servies (forme G) — design d'UNE page, 2026-11-11

**Problème.** `GET /v1/supply-chain/graph` sert `{nodes, legs, routes}`. Côté client, `SupplyChainRouteDto`
(`Assets/Scripts/Operational/ChaineDAppro/ChaineDApproDtos.cs:96-99`) est VIDE : `JsonUtility` jette en silence les 7 clés de chaque
route (forme G : servi puis jeté). Aucun écran ne les lit aujourd'hui.

**Contrat — RECOPIÉ DU CODE (V15), back `main` 6040a213.** `services/game-back/src/core_loops/supply_chain/supply-chain.controller.ts`
`:92-99` (type de réponse) et `:141-148` (mapping) : `route_id: string`, `origin_building_id: string`, `destination_building_id: string`,
`sinuosity_stress_bucket: SinuosityStressBucket`, `time_to_collapse_bucket: TimeToCollapseBucket`, `state: 'draft'|'active'|'saturated'|'severed'`,
`rebuilding: boolean`. Domaines : `SinuosityStressBucket = 'pristine'|'stressed'|'critical'|'severed'` (`sinuosity-stress-bucket.ts:34`),
`TimeToCollapseBucket = 'distant'|'approaching'|'imminent'|'na'` (`time-to-collapse-bucket.ts:24`). Le mur R2.2 du contrôleur (`:115-120`) :
jamais `sinuosity_index` ni `rebuild_completes_at_tick` bruts.

**Changement.** Les 7 champs dans `SupplyChainRouteDto`, mêmes noms, `bool rebuilding`, doc des domaines. Aucun rendu neuf, aucun lecteur
neuf (le rendu de la chaîne attend TD-985). L'énoncé daté « FORME JAMAIS MESURÉE » est paraphrasé (V17).

**Falsifiable.** Garde `EcranApproTD1013_RouteDto_EpingleDesSeptCles` (catégorie `EcranAppro`, déjà inscrite) : (1) l'ensemble des champs de
`SupplyChainRouteDto` = EXACTEMENT les 7 clés écrites à la main dans le test (recopiées du contrôleur, anti-tautologie) ; (2) un corps réel
à 7 clés se lit, chaque champ à sa valeur (dont `rebuilding: true`) ; (3) CONTRÔLE POSITIF : la même épingle rejouée sur l'ensemble amputé
d'un champ rougit (la clé manquante est NOMMÉE), et une 8ᵉ clé du corps est nommée hors DTO.

**Statiques.** typecheck Operational + PlayMode.Tests (`--frais Operational`), `--controle` ; `--tout` ; cliquet. Revue ⊥ courte. Rien joué.
