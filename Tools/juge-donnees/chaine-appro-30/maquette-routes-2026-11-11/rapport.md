# Juge données ⊥ — ㉚ « La chaîne — les routes » + les deux gestes (entretenir / reconstruire) — maquette — 2026-11-11

**Verdict : NON**

Maquette épinglée : `atelier3d-mafia-C1` @ `17803d1ee9609afa53397d6bc247bdee141a24f2`, `ecrans-brennar-6.html`
(md5 `28ddb122e119e9185cd32c8e1e8acac4`, 2 730 084 o, **170 cadres / 170 étiquettes**), cadres **159 à 169**
(11 cadres, découpés dans `mesures/cadres/`).
Back : cumul `74c5a0b0`. Pile locale : **X-Server-Build `8d0184a4` AVANT et APRÈS** (`mesures/x-server-build-avant.txt`,
`mesures/x-server-build-apres.txt`) — pile intacte, rien redémarré, rien migré.

## En une phrase

Des **35 clés** que le back sert réellement pour cet écran et ses deux gestes, la maquette en dessine **19** et en
laisse **16** de côté ; elle dessine **37 éléments sans clé B** (dont 27 couverts par les ASSUMÉS déjà déclarés
ou par un mot servi) ; **1 lot back forme F** (`legs[].maintaining`) ; **3 écarts propres au chunk** et
**5 questions « passé à côté ? »** d'intérêt joueur.

---

## Pile vs cumul — ce qui diffère (demandé par le dossier)

`git diff --name-only 8d0184a4 74c5a0b0` : **4 fichiers** en tout.

| chemin | diffère ? |
|---|---|
| `services/game-back/src/core_loops/supply_chain/**` | **NON** (0 fichier) |
| `services/game-back/src/operational/distribution/**` | **NON** (0 fichier) |
| `services/game-back/src/i18n/string_table.ts` | **OUI** — `+14 / -0` |
| `docs_int/tech_debt_inventory.md`, `tests/e2e/conventions/_en-egal-fr.py`, `tests/unit/i18n/table_structure_mots_unit.spec.ts` | OUI (hors code servi) |

⇒ **Les corps mesurés sur la pile valent pour le cumul** (le code du domaine est identique aux deux SHA).
⇒ **Les 7 clés `appro.*` du lot `chaine-bandes-2` (× 2 langues = 14 lignes) ne sont PAS sur la pile** : elles
existent au cumul `74c5a0b0` seulement (`appro.titre.la_chaine`, `…sous_titre.chaque_maillon…`,
`…titre.les_maillons`, `…titre.les_liaisons`, `…etiquette.refoule_vers`, `…etiquette.contournee`,
`…etiquette.un_batiment_detruit`). Les verdicts « servi » ci-dessous sont rendus **au cumul**.

Contrôle (`mesures/mots-deux-sha.txt`) — **positif** : `La route est coupée` (= `appro.sinuosite.severed`)
compte **1 aux DEUX SHA** ; `appro.titre.la_chaine'` compte **0 à 8d0184a4, 2 à 74c5a0b0** ;
`Les routes` / `En reconstruction` / `En préparation` / `Saturée` comptent **0 aux deux** (TD-1038, conforme).
⚠️ zsh : `$sha:services/…` est mangé comme modificateur — le 1er passage a rendu **10 faux zéros** ;
refait en `${sha}:…`, la note est gardée dans le fichier de mesure.

---

## Écarts à consigner (maquette)

| # | information | B | M | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|
| **E1** | **« En préparation » : un état dessiné qu'aucun chemin de PRODUCTION n'écrit** | ● (`state`, union à 4) | ● cadres 159 (5ᵉ ligne) et 169 (5ᵉ ligne) | **ÉCART — propre au chunk** | `mesures/etats-de-route-ecrivains.txt` : `state='draft'` → **0 site d'écriture** au cumul (hors `*.spec.ts` / `*-test.controller.ts`), contre `severed` **10** et `saturated` **2** (contrôle positif). Le seul calculateur d'état ne produit que 3 valeurs : `route.service.ts:340-345` et `:471-477` (`newState = 'severed' \| 'saturated' \| 'active'`). Défaut de colonne `'active'` : `db/schema/operational_chain.ts:298` (`state: routeState('state').notNull().default('active')`). **Mesure vivante** : route créée par `POST /v1/operational/routes` → `"state": "active"` (`mesures/06-graph-apres-creation.json`). Le dossier demandait explicitement « Cherche si chaque valeur possible de `state` (4) … est atteignable » : **3/4 le sont**. |
| **E2** | **L'après-geste énoncé au cadre 169 (« les bandes se relisent au tick suivant : le cadre garde les précédentes ») est contredit par la mesure** | ● `time_to_collapse_bucket` | ● cadre 169, bandes de la route reconstruite | **ÉCART — propre au chunk** | Les deux bandes sont **re-dérivées à CHAQUE lecture**, jamais figées : `supply-chain-graph.service.ts:181-187` (`sinuosityStressBucket(...)` / `timeToCollapseBucket(r.state, history.totalCount > 0, history.recentCount)`). **Mesuré** : avant le geste `"time_to_collapse_bucket": "na"` (`06-graph-apres-creation.json`) → `POST …/rebuild {MINIMAL_REROUTE}` (`08-…json`, 200) → **dans la lecture qui suit immédiatement** `"time_to_collapse_bucket": "approaching"` (`10-graph-APRES-GESTE.json`). Le rebuild archive une ligne `route_version_history`, donc `recentEventCount` passe de 0 à 1 (`time-to-collapse-bucket.ts:50-52`). ⚠️ **Le cadre 169 lui-même tombe JUSTE** (il dessine « Ça va lâcher » = `imminent`, et `imminent` reste `imminent` quand le compte ne fait que croître) — mais la **règle écrite** est fausse pour toute route qui n'est pas déjà à `imminent`, et c'est elle que le client codera. |
| **E3** | **« en entretien » et « contournée » sont dessinés comme exclusifs ; au back ils sont posés et levés ENSEMBLE** | B⁻ `supply_chain_legs.maintenance_mode` | ● « en entretien » cadre 164 ; « contournée » cadre 160 (2ᵉ liaison) | **ÉCART — propre au chunk, sur la SPEC du lot back** | `leg-maintenance.repository.ts:97-99` : la prise pose `maintenance_mode: mode` **et** `bypassed: mode === 'reroute_bypass'` — donc une liaison contournée porte TOUJOURS `maintenance_mode = 'reroute_bypass'`. La sortie les efface des deux côtés dans la même instruction : `leg.repository.ts:333-338` (`bypassed = … false`, `maintenance_mode = … NULL`). ⇒ si BACK-1 définit `legs[].maintaining` comme `maintenance_mode IS NOT NULL`, **le 3ᵉ choix de la feuille (« Contourner ») produit une liaison qui porte les DEUX marques**, ce qu'aucun cadre ne montre. La définition sûre est `maintenance_completes_at_tick IS NOT NULL` (`supply_chain_loops.ts:71` — « NULL for reroute_bypass (state, not timer) »). |

### ASSUMÉS du dossier — re-vérifiés, non rouverts

| information | vérification |
|---|---|
| jeu de **5 routes** fictif, cardinal/états/bandes « atteignables » | cardinal libre (le back rend `routes[]` tel quel) ; **bandes** : les 8 textes dessinés comptent **1 occurrence chacun** dans le `string_table` du cumul (`mesures/mots-servis-74c5a0b0.txt`) et correspondent 1-1 aux 4+4 valeurs d'énumération (`sinuosity-stress-bucket.ts:34`, `time-to-collapse-bucket.ts:24`) ; **cohérence `severed`** : le code garantit bien `severed ⇒ sinuosité « La route est coupée » ET effondrement « On ne sait pas encore »` (`sinuosity-stress-bucket.ts:49`, `time-to-collapse-bucket.ts:49`) ✔ ; **brouillon sans historique ⇒ « On ne sait pas encore »** ✔ (`time-to-collapse-bucket.ts:50`). Seul **`draft` ne passe pas** → E1. |
| `legs[].leg_id` servi, non dessiné | confirmé : clé présente (`supply-chain.controller.ts:139`, épinglée `tests/e2e/core_loops/supply_chain_player_projection.spec.ts:403-408`), jamais dessinée. Dette nommée, gardée. |
| **coûts par mode = valeurs par défaut des tunables** | **exact, 6/6** : entretenir 50/300/50 € ↔ `core-loops-tunables.ts:800` (`5000`), `:806` (`30000`), `:751` (`5000`) ; reconstruire 100/400/1 000 € ↔ `:642` (`10000`), `:648` (`40000`), `:654` (`100000`). Tous `[PROV-Y26Q2]`. **Aucun coût n'est servi avant le geste** : les deux corps de réponse mesurés (`08-…json`) ne portent aucun montant, et aucune route de lecture n'en porte. ✔ |
| refus « Pas assez d'argent pour ça. » non servi | **confirmé, 0 occurrence** (`mots-servis-74c5a0b0.txt`). Le back rend `RESOURCE_STATE_CONFLICT` (`leg-maintenance.service.ts:128`, `route-rebuild.service.ts:203`) → `user_facing_i18n_key: "error.resource.state_conflict"` → « La situation a changé depuis votre dernier coup d'œil. Rechargez et décidez à nouveau. » (`string_table.ts:6365`). |
| mots neufs (états, « En reconstruction », « Les routes ») non servis | **confirmé, 0 occurrence aux DEUX SHA**. Les homonymes trouvés sont d'un autre domaine : « Coupée » = `building.purity.cut` (`:5517`), « Ouverte » = `building.roster.open` / `building.capacity.open` (`:5587`, `:5593`), « Remaniement » = `'Remaniement de l'organigramme'` (`:5350`). |

### À saluer (vérifié, conforme)

- **Le refus « catégorie confiée à un lieutenant » n'est dessiné QUE sur la feuille de reconstruction** (cadre 168) — et c'est exactement là qu'il existe : `CategoryDelegationGuard.assertNotDelegated` est appelé par `route.controller.ts:208` (rebuild) mais **jamais** par `supply-chain.controller.ts` (maintain, 0 occurrence de `delegationGuard`).
- **4 refus sur 5 sont servis mot pour mot** : `error.supply_chain.maintenance_in_progress` (`:6384`) ↔ cadre 163 ; `error.sinuosity.rebuild_in_progress` (`:6376`) ↔ cadre 167 — **mesuré en vrai** (`09-rebuild-2e-REFUS.json`, HTTP 409, `user_facing_i18n_key: "error.sinuosity.rebuild_in_progress"`) ; `error.meta_progression.category_delegated` (`:6336`) ↔ cadre 168 ; `error.core_loops.structural_cap_exhausted` (`:6282`) ↔ cadres 161 / 166.
- **« ça part du compte tout de suite » et « Annuler » sont SERVIS** (`appro.bouton.ca_part_du_compte_tout_de_suite` `:3726` ; `game.ui_common.cancel_button` `:3091`) — le dossier les classait avec « les mots des feuilles » non servis : ils le sont.
- **Le libellé de bâtiment dessiné est le format servi** : `'game.fiction.building.name': '{enseigne} — {district}, îlot {block}'` (`:3586`) ↔ « Soudure Varne — La Lisière, îlot 1501 ». Mesuré sur compte frais : `name_i18n.params = {enseigne, district, block}` (`04-me-buildings.json`).
- **Les deux gestes sont ownership-scopés** (contrôle IDOR) : `maintain` → `findOwnedLeg(playerId, legId)` sinon 404 (`leg-maintenance.service.ts:113-118`, **mesuré** : 404 `RESOURCE_NOT_FOUND` sur un `legId` tiré au hasard) ; `rebuild` → `row.player_id !== playerId` ⇒ 404 (`route-rebuild.service.ts:157-159`). Aucune des deux ne lit d'identifiant de joueur dans le corps ou un en-tête.
- **Le jeton « grande décision du jour » est bien UN SEUL compteur partagé** entre les deux gestes : `structural-decision-governor.service.ts:97-98` (`reserveStructuralSlot(playerId, cap)` sur `player_progression_state.structural_decisions_this_session`), appelé par `leg-maintenance.service.ts` (`MYCELIAL_STRUCTURAL_REINFORCE`) et `route-rebuild.service.ts` (`SINUOSITY_FULL_RESET`). Marquer les deux modes « votre grande décision du jour » est juste.

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | `next_stressed_leg {leg_id, origin_building_id, destination_building_id, debt_bucket}` — réponse de `POST /v1/supply-chain/legs/:legId/maintain` (`supply-chain.controller.ts:182-190`) | « vous venez d'en soigner une ; voilà la prochaine qui souffre le plus, et à quel point » | **Utile ici, et c'est la seule information conçue POUR l'après-geste** : le back la calcule exprès (le « P2 chain reveal », design §5.5) et la maquette ne la montre nulle part. Un geste qui désigne le geste suivant, c'est ce qui transforme une liste en chaîne. | **fort** |
| **Q2** | `buildings[].lieutenant_ids` (`GET /v1/me/buildings`, mesuré) | qui tient le bout de la route | **Utile ici** : la feuille de reconstruction peut refuser parce que « cette catégorie est confiée à un lieutenant » (cadre 168) — le joueur voit le refus sans jamais voir QUI. Mettre le nom sur le bout de route fermerait la boucle. | **fort** |
| **Q3** | `buildings[].operational_type` (mesuré : `lab`, `stash`, `front_shop`, `cash_safehouse`, `dealer_spot_front`) | le métier de chaque bout de route | **Utile ici** : cinq enseignes de fiction se ressemblent toutes ; le métier dit pourquoi cette route-là compte (labo → planque n'est pas vitrine → vitrine). | moyen |
| **Q4** | `maintenance_completes_at_tick` (maintain) et `rebuildCompletesAtTick` (rebuild, **mesuré** : `1512`) | quand le chantier finit | **Pas tel quel** : c'est un tick absolu, et la maquette a raison de dire la durée en mots. Mais le back SAIT la fin et le joueur ne sait rien : une bande (« ça finit dans la nuit ») vaudrait mieux que rien. ⚠️ au passage, un tick brut sur une route joueur **déroge à R2.2**. | moyen |
| **Q5** | `structural_budget.used` (`POST /v1/session/open`, mesuré `{"used":0,"cap_reached":false}`) | combien de grandes décisions vous avez déjà prises aujourd'hui | **Pas ici** : `cap_reached` suffit à la feuille. Mais voir **E4** ci-dessous : l'information n'est servie qu'à l'ouverture de session. | faible |

*(les 11 autres lignes `● – –` — `building_id`, `leg_id`, `route_id`, `building`, `district_id`,
`purchased_type`, `convertible_types`, `maintain.leg_id`, `rebuild.routeId`, `rebuild.version` — sont de la
plomberie : des ancres et des échos, rien à montrer.)*

---

## Lots back suggérés

| # | colonne / constat | table / route | maquette | preuve |
|---|---|---|---|---|
| **L1 — forme F** | `maintenance_mode` (et son pendant `maintenance_completes_at_tick`) : **écrits, relus par le tick, jamais projetés** — `legs[]` ne porte que `{bypassed, debt_bucket, destination_building_id, leg_id, origin_building_id}` | `supply_chain_legs` → `GET /v1/supply-chain/graph` | « **en entretien** » (cadre 164) | schéma `supply_chain_loops.ts:70-71` ; projection `supply-chain.controller.ts:134-140` ; jeu de clés épinglé `tests/e2e/core_loops/supply_chain_player_projection.spec.ts:403-408`. **Spec à cadrer : voir E3** (définir `maintaining` par `maintenance_completes_at_tick IS NOT NULL`, pas par `maintenance_mode IS NOT NULL`). |
| **L2** | **Le jeton structurel n'est servi qu'à l'ouverture de session.** `structural_budget {used, cap_reached}` n'est produit que par `session-open-sequence.service.ts:361` ; **mesuré** : la réponse du rebuild est `{routeId, mode, version, rebuildCompletesAtTick}` — **aucun budget** ; `GET /v1/supply-chain/graph` n'en porte pas non plus. Après le PREMIER geste structurel de la session, la feuille repasse « libre » à tort jusqu'à la prochaine ouverture, sauf décrément local du client. | `POST /v1/session/open` / les 2 routes d'action | cadres 160/161 et 165/166 (libre vs prise) | `08-rebuild-MINIMAL_REROUTE.json` ; grep `structural_budget` hors specs : 1 seul producteur joueur + `structural_budget_band` sur `lieutenant.controller.ts:354` (autre écran). |
| **L3** | **Fuite R2.2 sur une route JOUEUR** : `GET /v1/operational/routes` (`route.controller.ts:133-140`, `@UseGuards(JwtAuthGuard)`) renvoie **la ligne brute entière** — `sinuosity_index`, `straight_line_distance`, `patch_count`, `last_rebuilt_at_tick`, `rebuild_completes_at_tick`, `mycelial_transit_stress_multiplier`, `path_blocks`, `player_id`. Tous commentés « **server-only R2.2** » au schéma. | `GET /v1/operational/routes` | **aucun cadre ne la lit** — ce n'est pas un défaut de maquette | **mesuré** : `mesures/07-operational-routes-LISTE-BRUTE.json`. Contraste : `supply-chain.controller.ts:113-119` déclare ces mêmes noms comme « the leak-scan floor », et `supply_chain_player_projection.spec.ts:346-360` les interdit — sur l'AUTRE route seulement. |
| **L4** | les **coûts par mode** et la **durée** avant le geste (règle TD-891) ; la phrase « **Pas assez d'argent pour ça.** » | les 2 routes d'action | feuilles 160-168 | déjà demandés à BACK-1 (ASSUMÉS du dossier) — re-vérifiés : 0 clé, 0 mot. |
| **L5** | les **mots neufs** : 4 états de route, « En reconstruction », titre « Les routes », « en entretien », les 6 libellés de mode et leurs 6 gloses, les 2 titres de feuille, « Pendant les travaux… », « votre grande décision du jour » | `string_table.ts` | 159-169 | TD-1038 + mots des feuilles — 0 occurrence (`mots-servis-74c5a0b0.txt`). |

---

## Actions : routes ↔ CTA

Routes `@Post` **joueur** du domaine (hors `_test`, hors admin) : **5**.

| route `@Post` | ancre | CTA de la maquette | statut |
|---|---|---|---|
| `POST /v1/supply-chain/legs/:legId/maintain` (`supply-chain.controller.ts:163`) | `legs[].leg_id` (servi) | feuille « Entretenir la liaison », 3 choix (cadres 160-164) | **✔ apparié** — 3 modes dessinés ↔ 3 membres de `mycelialMaintenanceMode` (`supply_chain_loops.ts:52-57`) : `quick_patch`/`structural_reinforce`/`reroute_bypass`. |
| `POST /v1/operational/routes/:id/rebuild` (`route.controller.ts:193`) | `routes[].route_id` (servi) | feuille « Reconstruire la route », 3 choix (cadres 165-169) | **✔ apparié** — 3 modes dessinés ↔ `VALID_MODES` (`route-rebuild.service.ts:93`). **Geste exécuté en vrai**, 200. |
| `POST /v1/supply-chain/nodes/:buildingId/trace-step` (`:217`) | — | aucun | **route sans CTA** — hors écran (cadres 50-52), consigné par la maquette. |
| `POST /v1/supply-chain/nodes/:buildingId/resolve` (`:236`) | — | aucun | **route sans CTA** — consigné par la maquette (« il ne change rien en jeu — question produit »). Question ouverte, pas un défaut. |
| `POST /v1/operational/routes/:id/replan` (`route.controller.ts:161`) | `routes[].route_id` | **aucun** | **route sans CTA — NON consignée par la maquette.** `replan` re-calcule le trajet avec la dette courante, remet `state='active'`, incrémente `version` — **et ne coûte rien** (aucun `debitWallet` dans `replanRoute`). Du point de vue joueur c'est « reconstruire, gratuitement, en moins bien » : soit elle double « Petit détour » (100 €) et il faut trancher laquelle le joueur voit, soit elle n'est pas un verbe joueur. **À trancher — une ligne pour l'user.** |
| *(`POST /v1/operational/routes`, `DELETE …/:id`)* | — | aucun | créer / effacer une route : hors écran ㉚ (la chaîne ne crée pas de route), pas de défaut. |

**CTA sans route : 0.** « Annuler » ferme la feuille (pas d'appel).

---

## Table de couverture complète

**Comptes recomptés par script** — `mesures/controle-arithmetique.py` :
`|clés B| = 35`, `|éléments M non appariés| = 37`, **somme = 72**, **nombre de lignes = 72** → **rc 0**.
Contrôle **négatif** (`--negatif`, une ligne qui ne porte ni B ni M) → **rc 2**, « ÉCHEC : la somme ne retombe
pas sur le nombre de lignes (écart 1) ». Mode maquette ⇒ pas de colonne F, pas de `|F sans source|`.

**Périmètre de B, déclaré** : les corps réellement mesurés des routes qui servent cet écran et ses deux gestes
(`GET /v1/supply-chain/graph`, `GET /v1/me/buildings`, les 2 réponses d'action, `structural_budget` de
`POST /v1/session/open`). **Hors B, déclaré** : `GET /v1/operational/routes` (aucun cadre ne la lit — rapportée
comme **L3**) et la barre de HUD (ARGENT / CHALEUR / JOUR 12), chrome global hors domaine ㉚.

### Appariées (B ● M ●) — 19 lignes, toutes ✔

| # | information | clé B | M | statut |
|---|---|---|---|---|
| 1 | pression du maillon | `nodes[].bucket` (4 val., `backpressure-bucket.ts:22`) | état du maillon, cadres 160-164 | ✔ (repris du cadre 154, déjà jugé) |
| 2 | « ce maillon refoule » | `nodes[].has_arrow` | « ↳ refoule vers » (mot servi `appro.etiquette.refoule_vers`) | ✔ |
| 3 | vers quel maillon | `nodes[].arrow_to_building_id` | le nom cible | ✔ |
| 4-5 | les deux bouts de la liaison | `legs[].origin_building_id`, `…destination_building_id` | « A → B », cadres 160-164 et sous-titre de la feuille | ✔ |
| 6 | entretien de la liaison | `legs[].debt_bucket` (4 val., `debt-bucket.ts:23`) | Entretenu / L'entretien prend du retard / Tient à peine / Rompu | ✔ (4 mots servis `appro.dette.*`) |
| 7 | liaison au repos | `legs[].bypassed` | « contournée » (`appro.etiquette.contournee`) | ✔ |
| 8-9 | les deux bouts de la route | `routes[].origin_building_id`, `…destination_building_id` | « A → B », cadres 159/169 et sous-titre de la feuille | ✔ |
| 10 | détours de la route | `routes[].sinuosity_stress_bucket` (4 val.) | Droit au but / Ça fait des détours / Que des détours / La route est coupée | ✔ (`appro.sinuosite.*`) |
| 11 | rupture à venir | `routes[].time_to_collapse_bucket` (4 val.) | Ça tient encore / … pas longtemps / Ça va lâcher / On ne sait pas encore | ✔ (`appro.effondrement.*`) — **voir E2** |
| 12 | état de la route | `routes[].state` (4 val., `operational_chain.ts:88`) | Ouverte / Saturée / Coupée / **En préparation** | ✔ pour 3 — **voir E1** |
| 13 | chantier en cours | `routes[].rebuilding` | « En reconstruction » | ✔ — **mesuré** `true` après le geste |
| 14-16 | le nom du bâtiment | `buildings[].name_i18n`, `…block_id`, `…district_name` | « Enseigne — District, îlot N » | ✔ |
| 17 | la grande décision est prise | `session_open.structural_budget.cap_reached` | option structurelle éteinte (161, 166) | ✔ — **voir L2** |
| 18-19 | le mode choisi | `maintain.mode`, `rebuild.mode` | les 3 + 3 choix | ✔ (CTA) |

### Disponibles, ni dessinées (● – –) — 16 lignes, « PASSÉ À CÔTÉ ? »

`nodes[].building_id` · `legs[].leg_id` · `routes[].route_id` · `buildings[].building` ·
`buildings[].district_id` · **`buildings[].operational_type` (Q3)** · `buildings[].purchased_type` ·
`buildings[].convertible_types` · **`buildings[].lieutenant_ids` (Q2)** · `maintain.leg_id` ·
**`maintain.maintenance_completes_at_tick` (Q4)** · **`maintain.next_stressed_leg` (Q1)** ·
`rebuild.routeId` · `rebuild.version` · **`rebuild.rebuildCompletesAtTick` (Q4)** ·
**`session_open.structural_budget.used` (Q5)**.

### Dessinées sans clé B (– ● –) — 37 lignes

| classe | n | éléments | verdict |
|---|---|---|---|
| **lot back, forme F** | 1 | « en entretien » (M34) | **L1** + **E3** |
| **mot servi** (libellé sans clé — source = `string_table`) | 10 | « ça part du compte tout de suite » · « Annuler » · les 4 phrases de refus servies · entête « La chaîne » + sous-titre · « Les maillons » · « Les liaisons » | ✔ libellé |
| **ASSUMÉ déjà déclaré au dossier** | 16 | titre « Les routes » · l'ordre des lignes · le cardinal 5 · les **6 coûts** (= défauts des tunables, vérifiés 6/6) · les **6 gloses de mode** · « Pas assez d'argent pour ça. » | re-vérifié, non rouvert |
| **ASSUMÉ NEUF à consigner** | 10 | les 2 titres de feuille · les **6 libellés de mode** (Rafistoler / Renforcer / Contourner / Petit détour / Remaniement / Remise à plat) · « Pendant les travaux, plus rien ne passe sur cette route. » · « votre grande décision du jour » (× 1 ligne, 2 occurrences — **quel mode est STRUCTUREL n'est servi par aucune clé**) | à consigner |

---

## Ce que je n'ai pas pu vérifier

1. **`legs[]` mesuré VIDE.** Sur compte frais : `legs: []` (`03-…json`), et encore `[]` après création de route et après le geste (`06-`, `10-`). Une ligne `supply_chain_legs` n'est créée que par `LegRepository.upsertThroughput` à l'**arrivée d'un coursier** (`leg-accrual.service.ts:111`) — hors de portée d'un compte jetable sans production ni coursier. **Aucun `Tools/seed_*.mjs` n'existe** dans le dépôt back (vérifié). ⇒ les 5 clés de `legs[]` sont **DÉDUITES** du contrôleur (`supply-chain.controller.ts:134-140`) **et épinglées par une spec E2E** (`tests/e2e/core_loops/supply_chain_player_projection.spec.ts:403-408`, jeu de clés exact). **Ce qui trancherait** : un dispatch réel jusqu'à l'arrivée, ou un `_test` de la surface distribution (non utilisé ici — hors mandat).
2. **`POST …/legs/:legId/maintain` jamais exercé en succès** (pas de leg). Son corps de réponse (`leg_id`, `mode`, `maintenance_completes_at_tick`, `next_stressed_leg`) est **DÉDUIT** de `supply-chain.controller.ts:174-192`. Seul le **404 de propriété** a été mesuré. ⇒ **les cadres 160-164 (modes, coût, refus « entretien déjà en cours », après-geste) reposent sur du code lu, pas sur un corps mesuré** — à la différence des cadres 165-169, mesurés.
3. **États de route non reproduits** : `saturated` et `severed` ne sont atteints que par le balayage nocturne `ROUTE_SEVER_SWEEP` / le producteur d'effondrement / une démolition d'extrémité — aucun déclenchable sans toucher la pile ou un autre joueur. **`draft` : non pas « non reproduit » mais SANS ÉCRIVAIN** (E1, compte binaire). **Ce qui trancherait** pour `saturated`/`severed` : faire avancer l'horloge de la ville (interdit) ou démolir un de MES bâtiments d'extrémité (effet de bord lourd sur mon compte, non tenté).
4. **Bandes non toutes atteintes** : mesurées `sinuosity_stress_bucket = pristine` et `time_to_collapse_bucket ∈ {na, approaching}` seulement. `stressed`/`critical` et `imminent`/`distant` sont **DÉDUITES** des seuils (`sinuosity-stress-bucket.ts:49-52`, `time-to-collapse-bucket.ts:49-53`) et de la spec E2E qui les épingle une à une (`supply_chain_player_projection.spec.ts:467-479`).
5. **Les refus 162 (pas assez d'argent), 163 (entretien en cours), 166/161 (cap), 168 (catégorie déléguée) n'ont pas été provoqués** : vider le portefeuille, consommer le jeton structurel ou déléguer une catégorie sont des effets lourds sur mon compte jetable, et le cap est session-scopé. Les **codes d'erreur et leurs clés i18n** sont lus à la source (`leg-maintenance.service.ts:128,139` ; `route-rebuild.service.ts:203` ; `structural-decision-governor.service.ts:97-98` ; `error-codes.ts:264,277,315,485`) ; **seul 167 (`REBUILD_IN_PROGRESS`) a été mesuré de bout en bout.**
6. **Les 7 clés `appro.*` neuves ne sont pas sur la pile** (8d0184a4) : « servi » est rendu **au cumul `74c5a0b0`**, pas sur la pile interrogée.
7. **Je n'ai pas jugé la barre de HUD** (ARGENT 24 850 € / CHALEUR Tiède / JOUR 12 — Plein jour), chrome global présent sur les 11 cadres mais hors domaine ㉚, ni le contenu repris du **cadre 154** au-delà de ce que ma table en dit (maillons et liaisons : déjà jugé ailleurs, non rouvert).

---

## Annexes

### 1. Routes du domaine (compte, ancres)

`grep` du mot du domaine dans **tous** les `*.controller.ts` du cumul, puis lecture : **9 routes joueur**
(`@UseGuards(JwtAuthGuard)`, hors `*-test.controller.ts` et hors admin/BO).

| # | route | fichier:ligne | lue par l'écran ? |
|---|---|---|---|
| 1 | `GET /v1/supply-chain/graph` | `core_loops/supply_chain/supply-chain.controller.ts:122` | **oui** |
| 2 | `POST /v1/supply-chain/legs/:legId/maintain` | `…:163` | **oui (geste 1)** |
| 3 | `GET /v1/supply-chain/nodes/:buildingId/backpressure` | `…:199` | non |
| 4 | `POST /v1/supply-chain/nodes/:buildingId/trace-step` | `…:217` | non (consigné) |
| 5 | `POST /v1/supply-chain/nodes/:buildingId/resolve` | `…:236` | non (consigné) |
| 6 | `POST /v1/operational/routes/:id/rebuild` | `operational/distribution/route.controller.ts:193` | **oui (geste 2)** |
| 7 | `GET /v1/operational/routes` | `…:133` | non — **L3** |
| 8 | `GET /v1/operational/routes/:id` | `…:119` | non |
| 9 | `POST /v1/operational/routes/:id/replan` | `…:161` | non — **route sans CTA, non consignée** |
| + | `POST /v1/operational/routes` · `DELETE /v1/operational/routes/:id` | `…:77`, `…:142` | hors écran |
| + | `GET /v1/me/buildings` | `citysim/district_interior/player-buildings.controller.ts:111` | **oui** (les noms) |
| + | `POST /v1/session/open` | `session/session.controller.ts:57` | **oui** (`structural_budget` seul) |

Exclus : `supply-chain-admin.controller.ts`, `supply-chain-test.controller.ts`, `distribution-test.controller.ts`.

### 2. Corps réels

`mesures/00-commandes.sh` (commandes), `mesures/01-…` à `mesures/10-…` (sorties, **jetons masqués `***`**),
`mesures/x-server-build-{avant,apres}.txt`. Compte jetable `jd5-…`, 5 bâtiments du kit de départ
(îlots 1501-1505, « La Lisière »), 1 route créée et reconstruite — **aucun POST sur un objet qui n'est pas
propre à ce compte**, aucun événement ambient/live consommé, rien de partagé posé.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | valeurs | contrainte |
|---|---|---|
| `routes[].state` | `draft` · `active` · `saturated` · `severed` | `pgEnum('route_state', …)`, `db/schema/operational_chain.ts:88` — **`draft` : 0 écrivain** (E1) |
| `routes[].sinuosity_stress_bucket` | `pristine` · `stressed` · `critical` · `severed` | `sinuosity-stress-bucket.ts:34`, seuils `:49-52` |
| `routes[].time_to_collapse_bucket` | `distant` · `approaching` · `imminent` · `na` | `time-to-collapse-bucket.ts:24`, règles `:49-53` (fenêtre 60 ticks `:28`, seuil 2 `:33`) |
| `routes[].rebuilding` | booléen | `supply-chain-graph.service.ts:189` : `rebuildCompletesAtTick != null && > gameMinute` |
| `legs[].debt_bucket` | `fresh` · `accruing` · `stressed` · `fractured` | `debt-bucket.ts:23`, seuils `:32-35` |
| `legs[].bypassed` | booléen | `supply_chain_loops.ts:72` |
| `nodes[].bucket` | `silent` · `mild` · `warm` · `critical` | `backpressure-bucket.ts:22`, seuils `:35-38` |
| `maintain.mode` | `quick_patch` · `structural_reinforce` · `reroute_bypass` | `pgEnum('mycelial_maintenance_mode', …)`, `supply_chain_loops.ts:52-57` |
| `rebuild.mode` | `MINIMAL_REROUTE` · `MODERATE_RESTRUCTURE` · `FULL_GEOMETRIC_RESET` | `route-rebuild.service.ts:91-93` ; **mesuré** : hors liste → 422 `VALIDATION_FAILED` |
| `structural_budget` | `{used: entier, cap_reached: booléen}` | `session-open-sequence.service.ts:240,361` |
| `buildings[].operational_type` | mesuré : `lab`, `stash`, `front_shop`, `cash_safehouse`, `dealer_spot_front` | `pgEnum('building_operational_type', …)`, `operational_chain.ts:27` |

### 4. Inventaire M

`mesures/controle-arithmetique.py` (M01-M54, un identifiant par élément porteur d'information) et
`mesures/cadres/cadre-159.html` … `cadre-169.html` (les 11 cadres, texte exact).

### 5. Inventaire F

Sans objet — **mode maquette**, le front de cet écran n'existe pas.

### 6. Non vérifié

Section « Ce que je n'ai pas pu vérifier » ci-dessus, 7 points.

---

## Auto-audit

J'atteste avoir : lu la maquette **au commit épinglé** (jamais l'arbre de travail) et découpé les **11 cadres
nommés**, sans en inventorier d'autre ; **monté un compte jetable et mesuré les corps réels** sur la pile
(`X-Server-Build 8d0184a4` relevé **avant et après**, identique) ; **exécuté un vrai geste** (`rebuild
MINIMAL_REROUTE`) et son refus sur **ma** route ; relevé chaque compte qui décide par `$( )` ou script
(jamais lu au terminal), avec un contrôle **positif** (`La route est coupée` = 1 aux deux SHA ; `severed` = 10
écrivains) **et** un contrôle **négatif** rouge (`controle-arithmetique.py --negatif` → rc 2) ; corrigé et
documenté un faux comptage dû à `$sha:` en zsh. Je **n'ai lu ni les notes d'implémentation, ni aucun rapport
ou mesure de juge précédent** (`Tools/juge-donnees/**` hors ce répertoire, `Tools/juge-visuel/**`). Les trois
écarts E1-E3 reposent chacun sur une mesure ou un compte binaire cité, pas sur une lecture d'intention.
