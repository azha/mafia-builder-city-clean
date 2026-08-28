# Juge données ⊥ — La fiche de bâtiment (screen_2a) — mode MAQUETTE — 2026-08-25

## En une phrase

La fiche dessine **10 informations** ; sa route **en projette 23** dont **une seule** est
dessinée (`operational_type`) — et **les 3 statistiques de la maquette sont des SCALAIRES que
l'architecture du back interdit structurellement** (R2.2 : bandes uniquement). Bilan :
**9 écarts à consigner** (dont 3 conflits de doctrine et 2 CTA branchés sur des chaînes mortes
re-mesurées ce jour) et **23 questions « passé à côté ? »**.

---

## Écarts à consigner (mode maquette)

Rappel de classement : `– ●` = dessiné sans source. **CONFLIT** = la valeur existe en base mais
une règle dure du dépôt (R2.2) interdit de la projeter ⇒ ce n'est pas un lot back, c'est un
arbitrage. **ASSUMÉ** = aucune source, même en base. **LOT BACK** = source projetable existante.

| # | information | B | M | statut | classe | preuve |
|---|---|---|---|---|---|---|
| **E1** | `LE VERGE D'OR` — nom propre du bâtiment | – | M1 | dessiné sans source | **ASSUMÉ** (ou lot back « table de noms ») | Balayage exhaustif du schéma : **12** colonnes `%name%` dans tout `public`, **0** sur un bâtiment (`districts.name_canonical`, `lawyers.name`, `lieutenant.name`, `lieutenant.name_locale`, `named_sequences.name`, `region.display_name`, `route.route_name`, `staff_account.full_name_for_audit`, `telemetry_event*.name` ×4). `buildings` = 12 colonnes, aucune de nom. |
| **E2** | `Quartier général` — rôle du bâtiment dans l'empire | – | M3 | dessiné sans source | **ASSUMÉ** | `grep -rniE "headquarter\|\bhq\b\|quartier.general"` hors tests → **2 hits**, tous deux des commentaires de `operational/lieutenant/muscle-binding.ts:94,205` décrivant le *host* d'un lieutenant. Aucun concept de QG, aucune colonne, aucune route. |
| **E3** | `$ 2 400` — « À collecter » (montant exact) | – | M4 | dessiné sans source | **⛔ CONFLIT DE DOCTRINE** | Le montant existe en base (`money_holding.held_cents bigint`) mais la projection le rend **en bande** : `held_band: 'NONE'\|'LOW'\|'MODERATE'\|'HIGH'\|'MASSIVE'` (`money-holding.projection.service.ts:51`), avec la consigne écrite « *NEVER the raw cents (R2.2)* » (`real-estate.projection.service.ts:196`). Et le pool n'existe **que** sur un `money_holding` — aucun des 4 bâtiments du kit de départ n'en est un (mesuré : `held_band='NONE'` ×4). |
| **E4** | `$ 180/h` — « Revenus » (taux horaire) | – | M5 | dessiné sans source | **ASSUMÉ** (aucune colonne, même en base) | Balayage des colonnes `%cents%\|%yield%\|%income%\|%revenue%` sur les tables portant `building_id` → **5 hits**, aucun n'est un taux : `building_raid.seized_cents`, `equipment_failure_log.repair_cost_cents`, `money_holding.held_cents`, `money_holding.last_yield_tick`, `safehouses.slot_capacity_cents`. **Il n'existe aucun revenu par heure et par bâtiment dans ce dépôt.** Le plus proche est une bande binaire (voir L2). |
| **E5** | `12%` — « Heat local » (pourcentage) | – | M6 | dessiné sans source | **⛔ CONFLIT DE DOCTRINE** | `buildings.heat` est un `real` en base, lu par la requête de la fiche (`real-estate.repository.ts:434`) et **bucketé puis jeté** : le commentaire à la même ligne dit « *the RAW heat float … NEVER forwarded (R2.2)* ». Le domaine projeté est `HeatBucket = 'COLD'\|'WARM'\|'HOT'\|'BURNING'` (`citysim/events/city-event-bus.ts:484`), décrit à `:477` comme « *the ONLY heat signal* », coupures à `:481` (COLD < 0.2 ; WARM 0.2–0.5 ; HOT 0.5–0.8 ; BURNING ≥ 0.8). ⇒ 12 % ne sera jamais rendu ; il tomberait dans `COLD`. |
| **E6** | la **couleur braise** du chiffre de heat (bande de sévérité) | B+ | M10 | source existante, sur une AUTRE route | **LOT BACK (ajout additif)** | `heat_bucket` est déjà projeté par bâtiment — mais par `GET /v1/city/district/:id/heat` (`mesures/11-heat-d16.json`), pas par la fiche. La fiche ne porte que le dérivé `raid_risk` (`'LOW'\|'ELEVATED'\|'HIGH'\|'IMMINENT'`, `raid-tunables.ts:74`). ★ **Et la boucle se referme** : pour appeler la route de heat il faut l'**id de district**, que la fiche ne projette pas (E9). |
| **E7** | CTA **COLLECTER** | – | M7 | CTA sans route utilisable | **⛔ CHAÎNE MORTE (forme A) + objet différent** | La seule route « collect » du dépôt est `POST /v1/operational/dealer/:id/collect` (`selling.controller.ts:81`) — elle porte sur un **dealer**, pas sur un bâtiment. Elle exige un **safehouse possédé** (`selling.service.ts:95-100`). Or `safehouses` n'a **aucun écrivain de production**, re-mesuré ce jour (voir §Mesure de clôture). Mesuré en direct : `POST /v1/operational/dealer/assign` → `RESOURCE_NOT_FOUND — dealer_spot … is not a player-owned OPERATIONAL dealer_spot_front` (`mesures/33-dealer-assign.json`) ; le kit de départ ne contient aucun `dealer_spot_front`. |
| **E8** | CTA **BLANCHIR** | – | M8 | CTA sans route utilisable | **⛔ CHAÎNE MORTE (forme A)** | `POST /v1/operational/laundering/inject` (`laundering.controller.ts:75`) exige un safehouse possédé (`laundering.service.ts:118-123`). **Appelé en direct avec le front_shop et le cash_safehouse du kit** → `RESOURCE_NOT_FOUND — safehouse d8aec6c0… is not a player-owned safehouse` (`mesures/31-launder-inject.json`). |
| **E9** | CTA **AMÉLIORER** | – | M9 | 1 bouton ↔ 4 routes, inapplicable sur 3 bâtiments/4 | **DÉFAUT de maquette** | **Matrice 4 bâtiments × 4 routes, 16/16 mesurée** (`mesures/30-upgrade-matrix.txt`). Les 4 routes d'upgrade sont typées : `upgrade-tier` (specialized_lab), `upgrade-hub-tier` (distribution_hub), `upgrade-equipment-tier` (lab/refinery/press_house), `upgrade-money-holding-tier` (money_holding). Sur `stash`, `front_shop`, `cash_safehouse` : **4 refus WRONG_TYPE sur 4**. Sur `lab` : seule `upgrade-equipment-tier` passe le contrôle de type (elle refuse ensuite pour cash insuffisant). ⇒ un CTA unique « AMÉLIORER » est **inerte sur 3 des 4 bâtiments que le jeu donne au joueur**. |

### Deux défauts de robustesse trouvés en mesurant (hors grille B/M)

| # | fait mesuré | preuve |
|---|---|---|
| **R1** | **`GET /v1/operational/building/:id` rend `500 INTERNAL_ERROR` sur un id non-UUID** — c'est la route de la fiche elle-même. | `mesures/34-building-nonuuid.json` : `GET /v1/operational/building/not-a-uuid` → `http=500 INTERNAL_ERROR \| Unexpected internal error.` Aucun `ParseUUIDPipe` sur `@Param('id')` (`real-estate.controller.ts:207`). |
| **R2** | `POST /v1/operational/laundering/stage` rend **500** sur un corps vide (au lieu de 422). | `mesures/32c-launder-stage-empty.json` : corps `{}` → `http=500`. Le contrôleur coerce en `String(body.x ?? '')` (`laundering.controller.ts:117-118`) et passe deux chaînes vides au service. Contrôle : le **même** appel avec le bon nom de champs et de vrais uuid rend proprement `404` (`mesures/32b-launder-stage-ok.json`). |

---

## Mesure de clôture sur `safehouses` — le maillon qui tue COLLECTER *et* BLANCHIR

Re-mesuré aujourd'hui (l'affirmation du socle datait du 2026-08-11 ; je ne l'ai pas recopiée) :

| balayage | portée | compte |
|---|---|---|
| `.insert(safehouse)` / `.update(safehouse)` — regex `\.(insert\|update)\(\s*safehouse\s*\)` | `services/game-back/src/` (arbre) | **2 hits, tous deux `.update`** : `selling.repository.ts:428`, `laundering.repository.ts:411`. **0 `.insert`.** |
| `INSERT INTO safehouses` (insensible à la casse) | `src/` \| `scripts/` \| `migrations/` \| `tests/e2e/` | **0 \| 0 \| 0 \| 9** — les 9 sont des specs E2E qui sèment en SQL brut. |
| fichiers important le symbole `safehouse` (aucun alias) | arbre `src/` | **4** : `selling.repository.ts:42`, `lieutenant.repository.ts:44`, `laundering.repository.ts:62`, `erlang-stash.repository.ts:36`. Leurs **8** `.insert(...)` visent `dealer`, `behaviorScript`, `lieutenant`, `launderingNode` ×2, `launderingEdge`, `tailRiskEstimate` ×2 — **aucun** ne vise `safehouse`. |
| lignes réelles en base | base locale entière | **1** au total (résidu de spec), **0** pour mon compte frais. |

**Contrôle positif du motif** : le même patron `\.insert\(building\b` rend **5 fichiers non nuls**
(`onboarding-grant.repository.ts`, `real-estate.repository.ts`, +3 contrôleurs `_test`) — le motif
mord bien. **Contrôle négatif** : le grep initial `pgTable('safehouses'` rendait 0 pour une mauvaise
raison (le symbole Drizzle est `safehouse`, au **singulier** — `pipeline_and_laundering.ts:89-90`) ;
c'est ce faux zéro qui m'a fait poser le contrôle positif.

**Corroboration indépendante, écrite dans le back lui-même** —
`citysim/district_interior/district-interior.projection.service.ts:18-21`, verbatim :

> `front_shop`/`cash_safehouse` résolvent toujours IDLE ici : leur seule source possible
> (safehouses/transaction_profile, TD-358) n'a AUCUN écrivain de production

⇒ Et `transaction_profile` a bien **un seul** écrivain (`laundering.repository.ts:473`), lui-même
derrière la garde safehouse. **La chaîne est morte des deux côtés.**

⇒ **Conséquence directe pour la fiche** : « LE VERGE D'OR » est un `front_shop`. Son `revenue_band`
vaut **IDLE pour toujours**, ses deux CTA principaux (COLLECTER, BLANCHIR) ne peuvent aboutir pour
aucun joueur, dans aucun environnement.

---

## « Passé à côté ? » — pour l'user

### A. Sur la route de la fiche (22 clés projetées, jamais dessinées)

Classées par intérêt joueur décroissant. `pertinence` = ce que la clé vaut **sur cet écran**.

| # | clé | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| Q1 | `raid_risk` (`LOW\|ELEVATED\|HIGH\|IMMINENT`) | « les flics regardent ce bâtiment » — dérivé du heat + épingle d'audit | **Utile ici, et c'est le vrai remplaçant de M6** : c'est la conséquence du heat, celle qui fait agir. La maquette dessine la cause en pourcentage ; le back offre l'effet en bande. | ★★★ |
| Q2 | `structural_state` (`OPERATIONAL\|DAMAGED\|REPAIRING\|FAILED`) + `repair_cost` (`NONE\|MINOR\|MODERATE\|MAJOR`) | le bâtiment est cassé, et ce que coûte la réparation | **Utile ici** : c'est un état qui change ce que le joueur peut faire, et il a sa route (`POST …/repair`). Un CTA RÉPARER conditionnel remplacerait avantageusement un AMÉLIORER inerte. | ★★★ |
| Q3 | `days_until_maintenance_due` (entier **signé**, négatif = en retard) + `lapse_phase_bucket` (`WITHIN_WINDOW\|SOFT\|HARD\|CRITICAL`) | « entretien dû dans N jours » | **Utile ici** — et c'est le **seul signal numérique que la fiche a le droit d'afficher** (`real-estate.projection.service.ts:232-236` : « *the ONLY numeric maintenance signal exposed* »). Si l'écran veut un chiffre, c'est celui-là. | ★★★ |
| Q4 | `setup_state` (`NOT_CONVERTED\|IN_SETUP\|OPERATIONAL`) + `operational` | le bâtiment est-il en travaux ou en service | **Utile ici** : un bâtiment `IN_SETUP` ne peut rien faire ; sans ça les 3 CTA mentent. | ★★★ |
| Q5 | `cover_band` (`NONE\|WEAK\|STANDARD\|STRONG`) | la qualité de la couverture légale | **Utile ici** : c'est le levier défensif que le joueur a acheté à la conversion. | ★★ |
| Q6 | `recently_raided` + `seized_amount` (`NONE\|LOW\|MODERATE\|HIGH`) | « on s'est fait descendre récemment, voilà ce qu'on a perdu » | **Utile ici** : c'est de la fiction gratuite et de la conséquence lisible. | ★★ |
| Q7 | `maintenance_in_progress` | un entretien est armé | Utile en pastille discrète, pas en statistique. | ★★ |
| Q8 | `held_band` / `capacity_band` / `yield_band` / `forfeiture_band` / `money_holding_tier_band` | l'état du coffre (rempli, saturé, rapporte, menacé de saisie) | **Utile — mais seulement sur un `money_holding`.** C'est la version R2.2-légale de « À collecter » (E3). `forfeiture_band='IMMINENT'` est un signal d'urgence fort. | ★★ |
| Q9 | `lab_tier_band` / `hub_tier_band` | le standing d'un labo / d'un hub | Utile pour montrer **ce que AMÉLIORER améliore** — et pour savoir s'il faut afficher le bouton. | ★★ |
| Q10 | `cold_storage_capable` | ce bâtiment tient la chaîne du froid | Plutôt sur l'écran de stockage que sur la fiche. | ★ |
| Q11 | `roster_band` / `available_vehicles` | capacité de coursiers, modes de transport débloqués | Plomberie logistique — pas ici. | ★ |
| Q12 | `building` (l'uuid) | identité | Plomberie. | – |

### B. Sur les routes voisines du même bâtiment (non dessinées, non projetées par la fiche)

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| Q13 | `revenue_band` (`IDLE\|EARNING`) — `GET /v1/city/district/:id/interior` | « ça rapporte / ça dort » | **Le vrai substitut de M5 « Revenus »**, et il existe déjà. Binaire, donc moins riche que `$ 180/h` — mais c'est ce que le back sait dire. | ★★★ |
| Q14 | `activity_band` (`IDLE\|ACTIVE`) + `revenue_chain` (`WIRED\|UNWIRED`) — même route | « il travaille » / « il n'est branché sur rien » | **`UNWIRED` est un diagnostic joueur de premier ordre** : il dit *pourquoi* ça ne rapporte pas. Les 4 bâtiments du kit sont `UNWIRED`. | ★★★ |
| Q15 | `lieutenant_ids` — même route | qui tient la boutique | **Utile ici** : la fiction du jeu est la famille ; un visage sur la fiche vaut mieux qu'un pourcentage. (Mesuré : le labo du kit en a **2**, les 3 autres **0**.) | ★★ |
| Q16 | `heat_bucket` — `GET /v1/city/district/:id/heat` | la chaleur du bâtiment, en bande | **C'est E6.** Déjà projeté, déjà R2.2-légal, sur la mauvaise route. | ★★★ |
| Q17 | `condition_band` (`SOUND\|DAMAGED\|REPAIRING\|FAILED`) + `shell_state` (`STANDING\|GONE`) — interior | l'état du bâti | Redondant avec `structural_state` de la fiche — mais **les deux projections divergent** (voir L1). | ★ |
| Q18 | `output_value_bucket` (`very_low…very_high`) — `GET /v1/friction/nodes/:buildingId` | la classe de rendement **nominale** du type | ⚠️ **Ce n'est pas un revenu** : c'est une constante par type (`replacement-option-scorer.ts:67-79` — un `Record<M1OperationalType, CapacityBucket>`). Utile comme « ce que ce type de bâtiment vaut », jamais comme « ce qu'il rapporte maintenant ». | ★ |
| Q19 | `friction_load_bucket`, `output_to_friction_ratio_bucket`, `decommission_cost_bucket`, `neighbor_count` — même route | la friction du réseau autour de ce nœud | Écran de démolition, pas la fiche. | ★ |
| Q20 | `substance_type` + `cook_stage_band` (`IDLE\|EARLY\|MID\|LATE\|DONE`) — `GET /v1/operational/lab/:id` | ce qu'on cuisine et où en est la cuisson | **Utile sur la fiche d'un labo** : c'est l'information vivante que le joueur vient chercher. | ★★ |
| Q21 | `substance_type`, `product_band` (`NONE\|LOW\|MEDIUM\|HIGH`), `temperature_status`, `degrading`, `purity_band` — `GET /v1/operational/storage/:id` | ce qu'il y a en stock, s'il se dégrade, sa pureté | **Utile sur la fiche d'un labo/raffinerie.** Corps mesuré : `mesures/21b-storage-lab.json` (6 clés). | ★★ |
| **Q23** | **rien** — le `stash` n'a **aucune route de lecture** | — | ⚠️ **Trou mesuré.** Malgré son nom, `GET /v1/operational/storage/:id` est réservé aux **cook buildings** : « *A building that is not the player's OPERATIONAL cook building (a lab or a refinery) → RESOURCE_NOT_FOUND* » (`production.controller.ts:120-121`), confirmé en direct (404 sur le `stash` du kit, `mesures/21-storage.json` ; 200 sur le labo, `mesures/21b-storage-lab.json`). ⇒ **la fiche d'un `stash` ne peut rien montrer d'autre que les 23 clés génériques**, dont 21 valent `NONE` sur ce type. | ★★★ |
| Q22 | `bucket` (`silent\|…`) + `has_arrow` — `GET /v1/supply-chain/nodes/:buildingId/backpressure` | ce nœud est engorgé | Écran chaîne d'appro. | ★ |

---

## Lots back suggérés

| # | ce qui manque | forme | preuve | additif ? |
|---|---|---|---|---|
| **L1** | **`block_id` + `district_id` sur la fiche** — la requête les LIT, la ligne les PORTE, la projection les JETTE | **★ forme F caractérisée** | `real-estate.repository.ts:413-414` (`block_id: building.block_id`, `district_id: blocks.district_id`) → `:439` (`innerJoin(blocks, …)`) → `:447-448` (renvoyés dans la ligne) → type `OperationalBuildingState` `:47,49-50` (`block_id: number; district_id: number;`) → **`real-estate.projection.service.ts` : `grep -cF 'block_id'` = 0** (contrôles positifs sur le même fichier : `heat` = 9, `building` = 73). Unique consommateur de `state.block_id` dans tout le domaine : `specialized-lab.service.ts:104`, une garde de zonage — **jamais une surface joueur**. | oui (2 clés) |
| **L2** | **Harmoniser les deux projections par bâtiment.** `GET /v1/city/district/:id/interior` rend **12 clés** par bâtiment dont **7 que la fiche n'a pas** : `block_id`, `conversion_band`, `shell_state`, `condition_band`, `revenue_band`, `revenue_chain`, `activity_band`, `lieutenant_ids`. | divergence de surface | Corps mesuré : `mesures/06-d16-interior.json` (4 bâtiments, 12 clés chacun). Domaines : `district-interior.projection.service.ts:40-52`. | oui |
| **L3** | **`heat_bucket` sur la fiche** (E6/Q16) | clé manquante | Déjà projeté par bâtiment sur `city/district/:id/heat` (`mesures/11-heat-d16.json`), déjà R2.2-légal (`city-event-bus.ts:484`). Aujourd'hui inaccessible depuis la fiche **parce que** L1 n'est pas fait (il faut le district pour appeler la route). | oui (1 clé) |
| **L4** | **`ParseUUIDPipe` sur `@Param('id')` de la fiche** (R1) | 500 sur entrée joueur | `mesures/34-building-nonuuid.json`. Déjà au périmètre du lot 0 (CLAUDE.md : « `ParseUUIDPipe` sur toute route à id »). | oui |
| **L5** | **Libellés i18n des 12 `operational_type` et des libellés de statistiques** | absent | `GET /v1/i18n/bundle` mesuré : **67 clés** = 63 `error.*` + 4 `game.*` (`game.lieutenant.assignment.summary`, `game.lieutenant.recap.actions_taken`, `game.ui_common.cancel_button`, `game.ui_common.confirm_button`). **0** clé contenant `front_shop`, `operational` ou un type de bâtiment. ⇒ sans ce lot, le front code en dur les 12 libellés. | oui |
| **L6** | *(si l'user veut le nom propre — E1)* **table de noms de fiction** pour les bâtiments | absent en base | Balayage exhaustif `%name%` : 12 colonnes, 0 sur un bâtiment. | oui |

⛔ **Ce qui n'est PAS un lot back** : E3, E4, E5. Projeter `held_cents`, un taux horaire ou
`buildings.heat` en clair **viole R2.2**, que le code nomme explicitement à chacune de ces trois
lignes. Ce sont des **arbitrages produit**, pas de la plomberie.

---

## Actions : routes ↔ CTA

**33 routes joueur** (`@UseGuards(JwtAuthGuard)`, contrôleurs non-`_test`) touchent le domaine du
bâtiment — dont **19 `@Post`**. La maquette en expose **3**.

| CTA maquette | route(s) back | verdict |
|---|---|---|
| **COLLECTER** (M7) | `POST /v1/operational/dealer/:id/collect` | **objet différent** (dealer ≠ bâtiment) **+ chaîne morte** (E7) |
| **BLANCHIR** (M8) | `POST /v1/operational/laundering/inject` | **chaîne morte** (E8) |
| **AMÉLIORER** (M9) | 4 routes typées | **inerte sur 3 des 4 bâtiments du kit** (E9) |

### Routes sans CTA — questions

| route | ce que le joueur pourrait faire | avis |
|---|---|---|
| `POST /v1/operational/building/:id/repair` | réparer un bâtiment `DAMAGED` | **★★★ Le CTA qui manque.** Il a son état projeté (`structural_state`) ET son coût projeté (`repair_cost`) — les deux déjà sur la fiche, non dessinés. |
| `POST /v1/operational/building/:id/schedule-maintenance` | programmer l'entretien | **★★★** Appairé à `days_until_maintenance_due` (Q3) : quand le chiffre passe négatif, le bouton a un sens. |
| `POST /v1/operational/building/:id/deposit-cash` · `withdraw-cash` | déposer / retirer du cash propre (`money_holding`) | **★★★ C'est le vrai « COLLECTER »** — sur le bon objet, avec une chaîne vivante. |
| `POST /v1/operational/lab/:id/cook` | lancer une cuisson | **★★** Sur la fiche d'un labo, appairé à `cook_stage_band` (Q20). |
| `POST /v1/operational/building/:id/convert` | convertir un bâtiment non converti | **★★** Le CTA d'un bâtiment `setup_state='NOT_CONVERTED'`. |
| `POST /v1/friction/nodes/:buildingId/decommission` | démolir | ★ Écran dédié plus probable (corps `{confirm:true}`, plafond structurel 1/session). |
| `POST /v1/operational/building/purchase` · `mass-schedule-maintenance` · `dealer/assign` · `laundering/stage` · `supply-chain/legs/:legId/maintain` · `supply-chain/nodes/:buildingId/trace-step` · `supply-chain/nodes/:buildingId/resolve` | — | ★ Hors fiche (achat = carte ; le reste = écrans de réseau). |

---

## Table de couverture complète

Mode maquette : deux colonnes, B = `GET /v1/operational/building/:id` (la route de la fiche).

| # | information | B | M | statut |
|---|---|---|---|---|
| 1 | type opérationnel | `operational_type` | M2 « Bar » | **✔ apparié** — seule ligne appariée. ⚠️ le domaine n'a pas de membre « bar » : les 12 membres sont `front_shop, cash_safehouse, stash, lab, grow_house, refinery, press_house, distribution_hub, office, dealer_spot_front, money_holding, specialized_lab` (`db/schema/operational_chain.ts:27-32`). « Bar » est une **fiction de surface** sur `front_shop` — et sans clé i18n (L5). |
| 2 | identité | `building` | – | ● – question (Q12) |
| 3 | état de conversion | `setup_state` | – | ● – question (Q4) |
| 4 | opérationnel | `operational` | – | ● – question (Q4) |
| 5 | couverture légale | `cover_band` | – | ● – question (Q5) |
| 6 | chaîne du froid | `cold_storage_capable` | – | ● – question (Q10) |
| 7 | état structurel | `structural_state` | – | ● – question (Q2) |
| 8 | descente récente | `recently_raided` | – | ● – question (Q6) |
| 9 | saisie | `seized_amount` | – | ● – question (Q6) |
| 10 | coût de réparation | `repair_cost` | – | ● – question (Q2) |
| 11 | standing labo | `lab_tier_band` | – | ● – question (Q9) |
| 12 | standing hub | `hub_tier_band` | – | ● – question (Q9) |
| 13 | occupation coursiers | `roster_band` | – | ● – question (Q11) |
| 14 | véhicules débloqués | `available_vehicles` | – | ● – question (Q11) |
| 15 | standing coffre | `money_holding_tier_band` | – | ● – question (Q8) |
| 16 | cash détenu | `held_band` | – | ● – question (Q8) — *et c'est la version légale de M4* |
| 17 | remplissage coffre | `capacity_band` | – | ● – question (Q8) |
| 18 | rendement coffre | `yield_band` | – | ● – question (Q8) — *et c'est la version légale de M5, mais `money_holding` seulement* |
| 19 | saisie imminente | `forfeiture_band` | – | ● – question (Q8) |
| 20 | risque de descente | `raid_risk` | – | ● – question (Q1) |
| 21 | phase de retard d'entretien | `lapse_phase_bucket` | – | ● – question (Q3) |
| 22 | jours avant entretien | `days_until_maintenance_due` | – | ● – question (Q3) |
| 23 | entretien en cours | `maintenance_in_progress` | – | ● – question (Q7) |
| 24 | nom propre | – | M1 | **– ● E1** ASSUMÉ |
| 25 | rôle « QG » | – | M3 | **– ● E2** ASSUMÉ |
| 26 | montant à collecter | – | M4 | **– ● E3** CONFLIT R2.2 |
| 27 | revenu horaire | – | M5 | **– ● E4** ASSUMÉ (rien en base) |
| 28 | heat en % | – | M6 | **– ● E5** CONFLIT R2.2 |
| 29 | bande de sévérité du heat (couleur) | B+ | M10 | **– ● E6** LOT BACK L3 |
| 30 | CTA COLLECTER | – | M7 | **– ● E7** chaîne morte |
| 31 | CTA BLANCHIR | – | M8 | **– ● E8** chaîne morte |
| 32 | CTA AMÉLIORER | – | M9 | **– ● E9** défaut de maquette |

### Contrôle d'arithmétique

```
|clés B|                = 23   (mesuré, 4 corps réels, ensembles de clés identiques)
|éléments M non appariés| =  9   (10 éléments M − 1 apparié)
somme                   = 32
lignes de la table      = 32   ✅
```

---

## Annexes

### Annexe 1 — Routes joueur du domaine (compte et ancres)

**33 routes** sous `@UseGuards(JwtAuthGuard)`, contrôleurs `_test`/`admin` exclus. Le dossier en
proposait 6 modules ; **le balayage en a ajouté 4** (`district_interior`, `demolition/friction`,
`supply_chain`, et la confirmation que `citysim/heat` n'a **aucune** route joueur « heat » hors
`city/district/:id/heat` — l'unique autre est `_test/citysim/heat-inject`).

| module | fichier:ligne | route |
|---|---|---|
| real_estate | `real-estate.controller.ts:89` | `POST operational/building/purchase` |
| real_estate | `:117` | `POST operational/building/:id/convert` |
| real_estate | `:153` | `POST operational/building/:id/upgrade-tier` |
| real_estate | `:172` | `POST operational/building/:id/upgrade-hub-tier` |
| real_estate | `:190` | `POST operational/building/:id/upgrade-equipment-tier` |
| real_estate | `:204` | **`GET operational/building/:id`** ← la fiche |
| enforcement | `repair.controller.ts:54` | `POST operational/building/:id/repair` |
| maintenance | `maintenance.controller.ts:67` | `POST operational/building/:id/schedule-maintenance` |
| maintenance | `:84` | `POST operational/buildings/mass-schedule-maintenance` |
| money_holding | `money-holding.controller.ts:63` | `POST operational/building/:id/upgrade-money-holding-tier` |
| money_holding | `:84` | `POST operational/building/:id/deposit-cash` |
| money_holding | `:105` | `POST operational/building/:id/withdraw-cash` |
| production | `production.controller.ts:75` | `POST operational/lab/:id/cook` |
| production | `:104` | `GET operational/lab/:id` |
| production | `:123` | `GET operational/storage/:id` |
| selling | `selling.controller.ts:62` | `POST operational/dealer/assign` |
| selling | `:81` | `POST operational/dealer/:id/collect` |
| selling | `:99` | `GET operational/dealer/:id` |
| selling | `:116` | `GET operational/dealers` |
| laundering | `laundering.controller.ts:75` | `POST operational/laundering/inject` |
| laundering | `:107` | `POST operational/laundering/stage` |
| laundering | `:134` | `GET operational/laundering/:nodeId` |
| laundering | `:154` | `GET operational/laundering/:nodeId/pipeline` |
| citysim/heat | `heat.controller.ts:51` | `GET city/district/:id/heat` |
| citysim/district_interior | `district-interior.controller.ts:87` | `GET city/district/:id/interior` |
| demolition | `decommission.controller.ts:52` | `POST friction/nodes/:buildingId/decommission` |
| demolition | `friction-projection.controller.ts:34` | `GET friction/state` |
| demolition | `:43` | `GET friction/nodes/:buildingId` |
| supply_chain | `supply-chain.controller.ts:121` | `GET supply-chain/graph` |
| supply_chain | `:162` | `POST supply-chain/legs/:legId/maintain` |
| supply_chain | `:192` | `GET supply-chain/nodes/:buildingId/backpressure` |
| supply_chain | `:210` | `POST supply-chain/nodes/:buildingId/trace-step` |
| supply_chain | `:229` | `POST supply-chain/nodes/:buildingId/resolve` |

Dont **9 routes de LECTURE par bâtiment** : `operational/building/:id`, `operational/lab/:id`,
`operational/storage/:id`, `operational/laundering/:nodeId`, `…/:nodeId/pipeline`,
`friction/nodes/:buildingId`, `supply-chain/nodes/:buildingId/backpressure`,
`city/district/:id/heat` (tableau par bâtiment), `city/district/:id/interior` (tableau par bâtiment).

### Annexe 2 — Corps réels

Compte **frais** créé pour cette mesure (`mesures/00-account.txt` — jamais le compte de démo).
Chaîne : `POST /v1/auth/signup` (Idempotency-Key requis) → `POST /v1/session/open`
(`{"client_version":"jd-1.0.0"}`) → kit de départ = **4 bâtiments** (`lab`, `stash`, `front_shop`,
`cash_safehouse`), blocs 1501-1504, district **16**, `heat=0`, `structural_state='operational'`.

| fichier | route |
|---|---|
| `mesures/01-signup.json` · `01b-signin.json` | auth |
| `mesures/02-session-open.json` | `POST /v1/session/open` |
| `mesures/03-world-districts.json` | `GET /v1/world/districts` |
| `mesures/05-d1-interior.json` · `06-d16-interior.json` | `GET /v1/city/district/:id/interior` |
| `mesures/10-building-<uuid>.json` ×4 | **`GET /v1/operational/building/:id`** — les 4 bâtiments |
| `mesures/10b-building-shop-proxy.json` | **contre-mesure `rtk proxy`** de la même route |
| `mesures/11-heat-d1.json` · `11-heat-d16.json` | `GET /v1/city/district/:id/heat` |
| `mesures/20-lab.json` · `21-storage.json` · `22-laundering-node.json` · `23-dealers.json` · `24-friction-node.json` · `25-backpressure.json` | routes voisines par bâtiment |
| `mesures/30-upgrade-matrix.txt` | matrice 4×4 des routes d'upgrade |
| `mesures/31-launder-inject.json` · `32b/32c-launder-stage*.json` · `33-dealer-assign.json` | CTA COLLECTER / BLANCHIR |
| `mesures/34-building-nonuuid.json` | R1 (500 sur non-UUID) |
| `mesures/40-i18n-bundle.json` | `GET /v1/i18n/bundle` |

⚠️ **Piège d'instrument rencontré, et sa contre-mesure.** `curl -s … > fichier.json` **nu** a
produit, pour la réponse volumineuse de `city/district/16/interior`, **non pas du JSON mais un
résumé de SCHÉMA** (`{ payload: { data: { bank_side: string, blocks: [{…}] (40) …`) — la couche
d'affichage du proxy s'applique aussi à une **redirection**. Les corps concernés ont été **repris
via `rtk proxy curl`**. ★ Et j'ai posé le contrôle qui décide : la fiche re-mesurée via `rtk proxy`
rend **exactement les mêmes 23 clés** que la prise initiale (`identical: True`, `only in proxy: []`,
`only in earlier: []`) — donc la mesure qui porte tout ce rapport n'a **pas** été tronquée.

### Annexe 3 — Valeurs possibles par clé, avec la contrainte source

| clé | domaine | source |
|---|---|---|
| `setup_state` | `NOT_CONVERTED\|IN_SETUP\|OPERATIONAL` | `real-estate.projection.service.ts:79` |
| `cover_band` | `NONE\|WEAK\|STANDARD\|STRONG` | `:82` |
| `structural_state` | `OPERATIONAL\|DAMAGED\|REPAIRING\|FAILED` | `:90` |
| `seized_amount` | `NONE\|LOW\|MODERATE\|HIGH` | `:93` |
| `repair_cost` | `NONE\|MINOR\|MODERATE\|MAJOR` | `:96` |
| `lab_tier_band` | `NONE\|BASIC\|REFINED\|MASTER` | `:105` |
| `lapse_phase_bucket` | `WITHIN_WINDOW\|SOFT\|HARD\|CRITICAL` | `:114` |
| `hub_tier_band` | `NONE\|SMALL\|MEDIUM\|LARGE\|MAJOR\|MAX` | `:124` |
| `roster_band` | `NONE\|OPEN\|BUSY\|FULL` | `distribution.projection.service.ts:199` |
| `money_holding_tier_band` | `NONE\|SMALL\|MEDIUM\|LARGE\|MAJOR\|MAX` | `money-holding.projection.service.ts:48` |
| `held_band` | `NONE\|LOW\|MODERATE\|HIGH\|MASSIVE` | `:51` |
| `capacity_band` | `NONE\|OPEN\|BUSY\|FULL` | `:54` |
| `yield_band` | `NONE\|IDLE\|EARNING` | `:57` |
| `forfeiture_band` | `NONE\|PENDING\|IMMINENT` | `:60` |
| `raid_risk` | `LOW\|ELEVATED\|HIGH\|IMMINENT` | `operational/enforcement/raid-tunables.ts:74` |
| `operational_type` | 12 membres (enum PG `building_operational_type`) | `db/schema/operational_chain.ts:27-32` |
| `days_until_maintenance_due` | entier **signé** (négatif = en retard) | `real-estate.projection.service.ts:232-236` |
| `operational` · `cold_storage_capable` · `recently_raided` · `maintenance_in_progress` | booléens | `:135,143,151,242` |
| `available_vehicles` | tableau d'étiquettes de mode (`FOOT`, `BIKE`, `CAR`) | `:179-185` |
| `building` | uuid opaque | `:129` |
| *(B+)* `heat_bucket` · `district_bucket` · `citywide_bucket` | `COLD\|WARM\|HOT\|BURNING` (coupures 0.2 / 0.5 / 0.8) | `citysim/events/city-event-bus.ts:477-484` |
| *(B+)* `revenue_band` | `IDLE\|EARNING` | `district-interior.projection.service.ts:49` |
| *(B+)* `revenue_chain` | `WIRED\|UNWIRED` | `:46` |
| *(B+)* `activity_band` | `IDLE\|ACTIVE` | `:52` |
| *(B+)* `condition_band` | `SOUND\|DAMAGED\|REPAIRING\|FAILED` | `:43` |
| *(B+)* `shell_state` | `STANDING\|GONE` | `:40` |
| *(B+)* `output_value_bucket` | `very_low\|low\|medium\|high\|very_high` — **constante par type**, pas une mesure | `replacement-option-scorer.ts:65,67-79` |
| *(B+)* `cook_stage_band` | `IDLE\|EARLY\|MID\|LATE\|DONE` | `production.projection.service.ts:64-65` |
| *(B+)* `product_band` | `NONE\|LOW\|MEDIUM\|HIGH` | `production.projection.service.ts:74-75` — **corps mesuré**, `mesures/21b-storage-lab.json` |
| *(B+)* `cleanliness_band` | `DIRTY\|PARTIAL\|MOSTLY_CLEAN\|CLEAN` | `laundering.controller.ts:130-131` |

### Annexe 4 — Inventaire M (le bloc `.fiche`, `hud-brennar.html:183-196`)

| id | ligne | texte / valeur | ce que ça représente |
|---|---|---|---|
| M1 | 184 | `LE VERGE D'OR` (`.serif`, or vif, 16 px) | nom propre du bâtiment |
| M2 | 184 | `Bar` (`.type`, crème-2, 9 px, capitales) | type de bâtiment |
| M3 | 184 | `Quartier général` (même élément, après `·`) | rôle du bâtiment dans l'empire |
| M4 | 187 | `$ 2 400` en `var(--or-vif)` + libellé `À collecter` | montant exact en attente de collecte |
| M5 | 188 | `$ 180/h` (crème) + libellé `Revenus` | taux de revenu horaire |
| M6 | 189 | `12%` + libellé `Heat local` | chaleur du bâtiment, en pourcentage |
| M7 | 192 | `COLLECTER` (`.btn.or` — l'unique CTA coloré) | action primaire |
| M8 | 193 | `BLANCHIR` (`.btn.ligne`) | action secondaire |
| M9 | 194 | `AMÉLIORER` (`.btn.ligne`) | action secondaire |
| M10 | 189 | la **couleur** `var(--braise)` portée par M6 | bande de sévérité du heat (état visuel porteur de sens) |

*Note de lecture* : la doctrine de la maquette réserve l'or à l'argent
(`hud-brennar.html:210-211`, annexe ① : « L'argent — seul or de l'écran ») ; M4 et M7 en héritent.
⚠️ M10 est **incohérent avec sa propre valeur** : `12 %` tomberait dans la bande `COLD`
(coupure `< 0.2`), et la maquette le peint en braise. À trancher avec la DA.

### Annexe 5 — Non vérifié

| # | ce qui n'a pas pu être mesuré | ce qui trancherait |
|---|---|---|
| ~~N1~~ | **LEVÉ pendant la rédaction.** Le 404 de `GET /v1/operational/storage/:id` sur le `stash` n'est pas une chaîne morte : la route est **scopée aux cook buildings** par contrat (`production.controller.ts:120-121`). Re-mesuré sur le **labo** → **200, 6 clés** (`mesures/21b-storage-lab.json`). ⇒ ce n'est pas un non-vérifié, c'est le finding **Q23** (le `stash` n'a aucune route de lecture). | *(fait — j'ai failli classer en « non vérifié » ce qui se tranchait par un second appel sur le bon type d'objet.)* |
| N2 | **Les 21 clés constantes.** Sur un compte frais, 21 des 23 clés valent `NONE`/`false`/une constante ; seuls `building` et `operational_type` varient (4 corps comparés). Je n'ai donc **pas** observé les bandes hautes (`raid_risk='IMMINENT'`, `held_band='MASSIVE'`, `structural_state='DAMAGED'`…) **en corps réel**. Leurs domaines sont **comptés** (types TS, annexe 3) ; leur **atteignabilité** est **DÉDUITE**. | Un scénario dimensionné : tick de heat jusqu'à `BURNING`, une descente pour `DAMAGED`+`seized_amount`, un `money_holding` converti + `deposit-cash` pour la famille `held_band`. Non fait : cela demandait de faire tourner le monde, hors du mandat « ne rien monter, ne rien redémarrer ». |
| N3 | **Le mécanisme exact des deux `500`** (R1, R2). J'ai la reproduction et le contrôle, pas la pile d'appel. | Lire les logs du conteneur `game-back` sur la requête fautive — non fait pour ne pas toucher aux conteneurs. |
| N4 | **Les 8 clés de `district/:id/interior`** listées en L2 sont mesurées en corps (`mesures/06-d16-interior.json`) mais **sur un seul état du monde** (tout `IDLE`/`UNWIRED`/`SOUND`). Que `revenue_band` puisse valoir `EARNING` sur un bâtiment du kit est **DÉDUIT** — et le back écrit lui-même que pour `front_shop`/`cash_safehouse` c'est **impossible** (`district-interior.projection.service.ts:18-21`). | Un `money_holding` alimenté, ou un `lab` avec cuisson active. |
| N5 | **Je n'ai pas classé les 683 routes `_test`** du dépôt : le mandat porte sur les routes joueur. Une route `_test` peut créer un `safehouses` (les 9 specs E2E le font en SQL brut) — cela ne change **rien** au verdict E7/E8, qui porte sur ce qu'un **joueur** peut atteindre. | — (hors périmètre, dit ici pour que le lecteur ne le lise pas comme un balayage exhaustif du dépôt) |
| N6 | **`GET /v1/operational/laundering/:nodeId/pipeline`** non exercé (le nœud amont n'existe pas). | Nécessite un `laundering_nodes` vivant, donc la chaîne safehouse — indisponible. |
