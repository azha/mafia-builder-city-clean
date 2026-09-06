# Juge données ⊥ — ③ La Carte de Brennar (city map) — mode **maquette** — 2026-09-06

> Contexte vierge : je n'ai ni dessiné la maquette ni construit l'écran, et je n'ai lu aucun
> rapport de juge. **Aucune stack montée, aucun `curl`, aucun test lancé** (gate E2E en cours) :
> B vient des corps réels déjà capturés + de la lecture du back en lecture seule.
> Back lu : `main` `0775ac98` → `aafdf5fc` (2026-09-06 ; `main` a bougé pendant la passe,
> **0 fichier sous `services/game-back/` ni `tests/e2e/`** — mesuré, `mesures/00-provenance.md`).
> Corps réels : 2026-09-04, back `6ff684db`. **Le dossier annonçait le back src à `b0cbde96` — c'est faux
> pour aujourd'hui**, et les corps sont datés de deux jours plus tôt : traités comme des mesures DATÉES.

## En une phrase

La maquette montre **19 informations sur les 50** que le back sait déjà rendre pour cet écran
(15 complètes + 4 partielles — compté sur la table, pas estimé) ; **0 écart de type « forme F »**
(aucune colonne en base et non projetée n'est dessinée) ; mais **5 défauts mesurés hors table** —
dont un corps réel qui porte une clé que le back n'émet pas, et la spec PARCOURS de cet écran qui
asserte un 404 sur une route qui existe — **13 éléments dessinés sans source** (5 sont le design
ratifié, 8 sont des libellés que le bundle ne sert pas), et **16 questions « passé à côté ? »**
couvrant **31 clés jamais dessinées**, dont quatre qui changent ce que la carte raconte.

---

## Défauts mesurés — hors table B/M (le back et l'instrument, pas la maquette)

| # | défaut | gravité | preuve |
|---|---|---|---|
| **D1** | **Le corps réel de `session/open` porte une 13ᵉ clé, `home_district_id`, que le back n'émet PAS.** L'instrument de capture l'INJECTE. Un lecteur du dossier (juge, coder, design) en conclut que la carte sait quel district est celui du joueur. Elle ne le sait pas. | **BLOQUANT pour toute décision fondée sur ce corps** | corps : 13 clés · interface : **12** (`session-open-sequence.service.ts:231-247`) · l'E2E épingle « EXACTEMENT 12 » (`tests/e2e/onboarding/tutorial_overlay_session_open_non_regression.spec.ts:177`) · injection : `Tools/juge-visuel/capturer-corps-reels.py:233` `pile.corps["session/open"]["payload"]["data"]["home_district_id"] = d` · 0 occurrence de la clé comme clé de réponse dans le back et dans `tests/e2e` (contrôle positif `opened_game_day` → 25 hits). `mesures/03` |
| **D2** | **La spec PARCOURS de CET ÉCRAN asserte `GET /v1/me/buildings` → 404, et la route existe.** `03_carte.parcours.spec.ts:132-134` boucle sur 4 chemins « qui n'existent pas » et exige 404 + `RESOURCE_NOT_FOUND` ; `me/buildings` est déclarée, sous `JwtAuthGuard`, enregistrée dans son module, et le module est importé par l'`AppModule`. Une AUTRE spec parcours asserte **200** sur la même route. Un des deux est rouge — et c'est la falsifiable de couche 2 de cet écran. | **BLOQUANT** (le gate de l'écran) | route : `player-buildings.controller.ts:89-90` · module : `district-interior.module.ts:29` `controllers: [DistrictInteriorController, PlayerBuildingsController]` · `app.module.ts:268` · assertion 404 : `tests/e2e/parcours/03_carte.parcours.spec.ts:132` · assertion 200 : `tests/e2e/operational/me_buildings_td534.parcours.spec.ts:73` · les 3 autres chemins n'existent toujours pas (mesuré). `mesures/04` |
| **D3** | **Deux familles i18n concurrentes pour le MÊME concept.** `district.type_batiment.*` = 26 clés distinctes : 13 dont la clé est une valeur de l'enum `building_operational_type`, 13 dont la clé est un mot français. **9 des 13 concepts portent deux libellés fr DIFFÉRENTS** (`front_shop` → « Boutique-écran » vs `commerce_ecran` → « Commerce-écran » ; `money_holding` → « Dépôt d'argent » vs `coffre` → « Coffre » ; …). Aucune valeur d'enum ne désigne la famille B : seul un client qui code la clé en dur l'atteint — deux écrans peuvent donc nommer différemment le même bâtiment. | **IMPORTANT** | `i18n/string_table.ts` (52 lignes, 26 clés) · 0 référence à `type_batiment` dans le back hors `string_table.ts` · contrôles positifs 2/2. `mesures/05 (a)(b)` |
| **D4** | **`control_state` est un champ CONSTANT qui a l'air vivant.** Le type déclare 4 valeurs, la projection écrit un littéral : `control_state: 'UNCONTESTED' as const`. Le bundle sert pourtant 4 libellés qui ressemblent trait pour trait à ce domaine (`carte.bloc.a_vous` « À vous » / `dispute` « Disputé » / `libre` « Libre » / `rival` « Rival ») — donc 3 libellés vraisemblablement inatteignables. Mesuré : 18/18 `UNCONTESTED` dans le corps réel. ⚠️ **L'appariement libellé↔valeur d'enum est DÉDUIT, pas mesuré** : le back ne référence `carte.bloc.*` **nulle part** hors `string_table.ts` (0 hit ; contrôle positif 7 hits sur `exception.heat_pressure`) — aucun résolveur back ne dit quelle clé va avec quelle valeur, c'est une convention côté client. | **IMPORTANT** | `world-geography.repository.ts:52` (type) et `:90` (littéral) · corps `GET_world_districts.json` · `mesures/05 (d)`, `mesures/06` |
| **D5** | **Le tutoriel servi décrit une granularité que le back ne projette pas.** `tutorial.city_map_heat_intro` : « La carte montre la chaleur **par îlot** ». Le back projette la chaleur par **bâtiment**, par **district** et pour la **ville** — jamais par îlot (`blocks` ne porte aucune chaleur). | MINEUR | `i18n/string_table.ts:512` / `:1367` · `DistrictHeatProjection` (`heat.projection.service.ts:64-75`) |

---

## Écarts à consigner (ce que la maquette dessine sans clé B)

Chacun avec sa raison mesurée. Les 5 premiers sont le **design ratifié** (ruling user cité dans
l'annexe de la maquette l.937 : « rien n'a besoin d'être vrai côté back — il faut des distances…
la géométrie est du design ») ; les 8 suivants sont des **libellés** que le bundle ne sert pas.

| # | élément dessiné | pourquoi il n'a pas de source | statut |
|---|---|---|---|
| **Ma** | la géométrie des 18 quartiers : formes, positions, distances, contours | **mesuré** : la table `districts` ne porte AUCUNE colonne de géométrie (`id, district_key, profile, index_label, name_canonical, bank_side, block_count` — `db/schema/world_geography.ts:30-45`). La seule géométrie du back est `blocks.coordinates` (x,y **dans** un district). | ASSUMÉ — ratifié |
| **Mb** | tissus de rues par profil, îlots, fenêtres allumées, 15 tours, 3 parcs, l'avenue lumineuse | aucune colonne, aucune clé ; `profile` (6 valeurs) est la seule entrée de la variation | ASSUMÉ — ratifié |
| **Mc** | le fleuve + le toponyme « LE THRENNY » | 0 occurrence de « Threnny » dans `string_table.ts` (contrôle positif 2/2 sur le même balayage) ; aucune colonne de nom de fleuve | ASSUMÉ — à consigner |
| **Md** | le port, les jetées, 2 bateaux, « LE PORT » | idem — le port est une lecture du profil `tidewater`, jamais une donnée | ASSUMÉ — à consigner |
| **Me** | rose des vents, vignettage, lune, reflets | décor pur | ASSUMÉ — ratifié |
| **Mf** | le **mot** de la chaleur : « tiède » (manomètre + bande), « froid » | la BANDE a sa source (`district_bucket` / `citywide_bucket`, 4 valeurs) ; **le libellé n'en a pas** : 0 clé i18n pour COLD/WARM/HOT/BURNING (contrôles positifs 2/2) | **lot back i18n** |
| **Mg** | le **mot** de la conviction : « en chasse », « SOUPÇON », « VEILLE » | la bande a sa source (`belief`, 4 valeurs) ; 0 clé i18n pour DORMANT/WATCHFUL/SUSPICIOUS/HUNTING | **lot back i18n** |
| **Mh** | le **mot** du profil : « le port » (bande de Les Bassins) | `profile` a sa source (6 valeurs) ; 0 clé i18n pour les 6 profils | **lot back i18n** |
| **Mi** | « le labo, la planque, la façade, le coffre » | le back sert DEUX familles concurrentes (D3) : « Labo » (A) / « Laboratoire » (B) · « Planque à liquide » (A) / « Planque » (B) · « Dépôt d'argent » (A) / « Coffre » (B) · et **aucune des deux ne dit « la façade »** (A = « Boutique-écran », B = « Commerce-écran ») | **arbitrage + lot back** |
| **Mj** | « VOUS ÊTES ICI », le quartier `mien` en or, « — chez vous » | **aucune clé du back ne dit quel district est celui du joueur.** Dérivable de `GET /v1/me/buildings` (`district_id` par bâtiment) — mais c'est une inférence du client, pas une donnée. Et le corps réel fait croire le contraire (D1). ⚠️ La maquette place `mien` sur **La Lisière** ; c'est le district du kit de départ (`VERGE_A_DISTRICT_ID = 16`, `onboarding-grant.service.ts:141`) — cohérent pour un joueur neuf, **pas** pour le compte de démo mesuré (ses bâtiments sont au district 1). | **lot back** (une clé « votre district ») |
| **Mk** | « ⚑ descente en cours » | le booléen a sa source (`escalated`) ; le libellé n'a pas de clé i18n | lot back i18n |
| **Ml** | « pincez pour approcher, touchez un quartier » | libellé d'aide, 0 clé i18n | à consigner |
| **Mm** | « ENTRER **dans le quartier** » / « ENTRER **dans le district** » | `carte.bloc.entrer` sert « Entrer » ; la maquette écrit deux formulations plus longues, et **deux mots différents pour la même chose** (quartier / district) | à consigner |

---

## « Passé à côté ? » — pour l'user

26 clés disponibles que la maquette ne dessine pas. Classées par intérêt joueur décroissant.
Les cinq premières sont celles qui changeraient ce que la carte RACONTE.

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | `control_state` (`GET /v1/world/districts`) | qui tient ce quartier : libre / disputé / à vous / au rival | **c'est LA phrase d'une carte de mafia, et le bundle sert déjà 4 libellés fr qui lui correspondent** (appariement déduit — D4). ⚠️ Mais aujourd'hui c'est un littéral figé : dessiner ça maintenant, c'est peindre 18 badges identiques. La question n'est donc pas « la dessiner ? » mais « la RENDRE VIVANTE, et alors la dessiner » | ★★★ |
| **Q2** | `edges[]`, `type` (`GET /v1/world/threnny-edges`) | les 6 traversées réelles du fleuve : **4 ponts + 2 BACS**, et ce que chacune relie | le ruling dit « il faut des DISTANCES entre quartiers » — les traversées sont exactement ce que le back sait de la connectivité. La maquette dessine 2 ponts génériques et **aucun bac** : 4 traversées de moins, et un mode de franchissement absent. Route publique, 1 appel, 0 garde | ★★★ |
| **Q3** | `whisper_index` (`GET /v1/city/citizens/whisper`) | l'humeur de la ville : CALM / STIRRING / ALERT | **la seule route citywide du domaine : UN appel, pas dix-huit.** Une carte de nuit qui a une humeur globale la paie une requête | ★★★ |
| **Q4** | `belief` DORMANT (`GET /v1/city/precinct/:id/belief`) | un precinct qui ne sait rien | la maquette a 3 formes d'écusson (CHASSE / SOUPÇON / VEILLE) pour **4** valeurs : **DORMANT n'a pas de forme**, et c'est l'état de départ. Un écusson sans dessin est un écusson que le client inventera | ★★★ |
| **Q5** | `patrol_heat` (`GET /v1/city/precinct/:id/patrol`) | la pression de patrouille du precinct : QUIET / LOW / MEDIUM / HIGH | complète l'écusson : la conviction dit « ils vous soupçonnent », la patrouille dit « ils sont dans la rue ». Même coût que belief (6 appels) | ★★ |
| Q6 | `blocks[] {block_id, x, y}` (`…/interior`) | où sont les îlots, en coordonnées | **la seule géométrie que le back porte.** La carte étant peinte, elle n'en a pas besoin — mais c'est ce qui permettrait un jour d'accorder la peinture et la donnée | ★★ |
| Q7 | `buildings[].heat_bucket` (`…/heat`) | la chaleur de CHACUN de vos bâtiments | les 4 pastilles de bâtiment sont dessinées sans chaleur alors que la carte parle de chaleur partout ailleurs. C'est la même donnée, une granularité plus bas | ★★ |
| Q8 | `queue_load`, `dispatcher_regime` (`…/inspection`) | l'inspection qui s'accumule sur le quartier (EMPTY→SATURATED) | l'annexe de la maquette le demande déjà (« sans compteur — 18 appels par district, lot L1 ») — la donnée existe, c'est l'agrégat qui manque | ★★ |
| Q9 | `cohesion_state`, `permanent_marginal` (`…/cohesion`) | la cohésion sociale du quartier | de la couleur de fond pour un quartier, pas une décision | ★★ |
| Q10 | `audit_pin_presence` (`…/unconformity`) | des épingles d'audit posées ici : NONE / SOME / WIDESPREAD | c'est le `city/audit-pins` que la spec parcours cherchait sous un autre nom — la donnée existe, par district | ★★ |
| Q11 | `revenue_band`, `revenue_chain` (`…/interior`) | ce que rapporte le bâtiment, et si sa chaîne est branchée | utile sur l'écran du district, pas sur la carte de la ville | ★ |
| Q12 | `activity_band`, `conversion_band`, `shell_state`, `condition_band`, `lapse_phase_bucket`, `maintenance_in_progress` (`…/interior`) | l'état de chaque bâtiment | six bandes ; leur place est le diorama du district, pas la carte | ★ |
| Q13 | `lieutenant_ids`, `lieutenants[]` (`…/interior`, `/me/buildings`) | qui tient quoi | intéressant sur la carte le jour où un lieutenant a un visage | ★ |
| Q14 | `leks[]` + ses 3 bandes (`…/leks`) | les accords de terrain, la pression de contestation | profondeur d'ops, pas de carte | ★ |
| Q15 | `district_blocking_band` (`…/stash`), `district_load_band`/`district_tail_band`/`any_overflow` (`…/buffer`), `exposure_band`/`network_cleanliness` (`…/throughput`), `backpressure` (`…/flow`) | l'engorgement, l'exposition, la saturation | plomberie d'ops : ces 4 routes existent et n'ont rien à faire sur une carte de ville | ★ |
| Q16 | `id`, `index`, `name_canonical`, `district` (`…`), `district_id`, `grid` | identités et noms de travail | plomberie — délibérément remplacés par `name` côté joueur | – |

---

## Lots back suggérés

**Aucun lot de « forme F » n'est dû ici.** B⁻ mesuré sur les **3 tables du domaine géographique**
(`db/schema/world_geography.ts` : `districts` 7 colonnes, `blocks` 4, `threnny_edges` 5), colonne par
colonne contre les projections : **3 colonnes ne sont projetées nulle part** —
`districts.district_key`, `blocks.stack_zoning_rank`, `threnny_edges.inspection_queue_district_id` —
et **aucune des trois n'est dessinée** par la maquette.

⚠️ **Portée de ce contrôle, écrite pour qu'on ne le lise pas plus large qu'il n'est** : la table
`buildings` n'a PAS été balayée colonne par colonne. Elle ne le mérite pas ici parce que de tout
`buildings`, la maquette ne dessine que `operational_type` (4 glyphes) et le **cardinal** — les deux
projetés. Un B⁻ complet de `buildings` est dû à l'écran ④ (le diorama du district), pas à celui-ci.

Les lots que la maquette appelle sont d'une autre nature — de l'**agrégation** et des **libellés** :

| # | lot | ce qui manque | preuve |
|---|---|---|---|
| **L-A** | la chaleur des 18 quartiers en UN appel | `world/districts` ne porte pas la chaleur ⇒ peindre les nappes coûte **18 requêtes**. La spec parcours de l'écran le chiffre elle-même | `03_carte.parcours.spec.ts:95-96` ; `world-geography.repository.ts:71-97` |
| **L-B** | la conviction des 6 precincts en UN appel | 6 écussons dessinés = 6 requêtes ; et la route 404 tant que le sim n'a pas tické | `police_memory.controller.ts:51,71-75` |
| **L-C** | **une clé « votre district »** | c'est exactement ce que l'instrument de capture a inventé (D1). Aujourd'hui : dérivable de `me/buildings` uniquement | `session-open-sequence.service.ts:231-247` (12 clés) |
| **L-D** | les libellés manquants + l'arbitrage des deux familles | 0 clé i18n pour : 4 bandes de chaleur, 4 bandes de conviction, 6 profils de district, `escalated`. Et 9 concepts de bâtiment portent 2 libellés fr concurrents | `mesures/05` |
| **L-E** | `day_phase` hors de `interior` | le moment du jour est **global** et n'est servi que par une route **par district** : afficher « Nuit » dans le bandeau oblige à demander l'intérieur d'un quartier. Producteur unique mesuré | `district-interior.controller.ts:148` (1 seul producteur dans tout le back) |

---

## Actions : routes ↔ CTA

| route / geste | côté back | côté maquette | verdict |
|---|---|---|---|
| `POST /v1/city/inspection/report` (JWT, `inspection.controller.ts:117`) | existe | **aucun CTA** | route sans CTA — question (est-ce un geste de cette carte ?) |
| « ENTRER dans le quartier » (cadre 23) | — | CTA | **navigation**, aucun appel back — le tampon mène au diorama du district |
| « ENTRER dans le district » (cadre 24) | — | CTA | idem ; ⚠️ deux libellés pour un même geste (Mm) |
| « touchez un quartier » | — | geste | sélection locale ; déclenche au plus `…/heat` + `…/interior` |
| « pincez pour approcher » | — | geste | zoom local, aucun appel |

⇒ **1 route d'action joueur dans le domaine, 0 CTA ; 2 CTA, 0 route.** La carte est un écran de
**lecture** : c'est cohérent, et ça mérite d'être écrit une fois pour toutes.

*(Le dossier de code du contrôleur client fait aussi voisiner `POST /v1/operational/dealer/:id/collect`
et `POST /v1/operational/laundering/inject` — `corps-reels/_index.json`. Aucun CTA de la maquette ne
les tire ; ce sont des actions d'autres écrans, non classées ici.)*

---

## Table de couverture complète

Statuts en mode maquette (deux colonnes) : `● ●` = dessinée et disponible · `● –` = disponible,
non dessinée (**question**) · `– ●` = dessinée sans source (**écart**).

### Lignes ancrées sur une clé B (50)

| # | information | route | B | M | statut | preuve |
|---|---|---|---|---|---|---|
| B01 | la liste des 18 quartiers | `world/districts` | ● | ● | ✔ | corps : 18 · M : 18 groupes `<g class="q …">` |
| B02 | `id` du quartier | `world/districts` | ● | – | Q16 | clé de jointure, jamais affichée |
| B03 | `profile` (6 valeurs) | `world/districts` | ● | ● | ✔ | 18/18 profils concordants M↔B (`mesures/02`) ; dessiné en tissu + en prose (« le port ») |
| B04 | `index` (`'1'`, `'a'`) | `world/districts` | ● | – | Q16 | suffixe de travail |
| B05 | `name_canonical` | `world/districts` | ● | – | Q16 | nom de travail, remplacé exprès par `name` |
| B06 | `block_count` | `world/districts` | ● | ● | ✔ | « 37 blocs » = district 1 · « 40 blocs » = district 16 |
| B07 | `bank_side` (2) | `world/districts` | ● | ● | ✔ | « rive nord » / « rive sud » ; i18n servi |
| B08 | `control_state` (4 déclarées, **1 servie**) | `world/districts` | ● | – | **Q1** | littéral figé (D4) |
| B09 | `name` — le nom de fiction | `world/districts` | ● | ● | ✔ | **18/18 identiques**, contrôle positif vert (`mesures/02`) |
| B10 | `precinct_id` (1..6) | `world/districts` | ● | ● | ✔ | 6 écussons numérotés 1..6 |
| B11 | `edges[]` (6) | `world/threnny-edges` | ● | ● partiel | **Q2** | 6 traversées semées, 2 ponts dessinés |
| B12 | `edge.type` (bridge/ferry) | `world/threnny-edges` | ● | – | **Q2** | 2 bacs, aucun dessiné |
| B13 | `edge.north/south_district_id` | `world/threnny-edges` | ● | – | Q2 | ce que la traversée relie |
| B14 | `district` (écho `district-N`) | `…/heat` | ● | – | Q16 | plomberie |
| B15 | `district_bucket` (4) | `…/heat` | ● | ● | ✔ | nappes (CSS : warm/hot/burning + COLD implicite) + bande |
| B16 | `citywide_bucket` (4) | `…/heat` | ● | ● | ✔ | le manomètre du bandeau |
| B17 | `escalated` (bool) | `…/heat` | ● | ● | ✔ | 1 `pin-esc` + « ⚑ descente en cours » |
| B18 | `buildings[].heat_bucket` | `…/heat` | ● | – | **Q7** | les 4 pastilles n'ont pas de chaleur |
| B19 | `buildings[].name_i18n` | `…/heat`, `…/interior` | ● | ● partiel | Mi | la maquette écrit 4 mots en clair |
| B20 | `district_id` | `…/interior` | ● | – | Q16 | plomberie |
| B21 | `grid {width,height}` | `…/interior` | ● | – | Q16 | la carte est peinte |
| B22 | `blocks[] {block_id,x,y}` | `…/interior` | ● | – | **Q6** | la seule géométrie du back |
| B23 | `day_phase` (4) | `…/interior` | ● | ● | ✔ | « Nuit » ; producteur unique (L-E) |
| B24 | `buildings[]` du quartier (13 clés) | `…/interior` | ● | ● | ✔ | 4 pastilles au cadre 24 |
| B25 | `operational_type` (12 valeurs) | `…/interior`, `/me/buildings` | ● | ● partiel | Mi | **4 formes dessinées pour 12 valeurs** |
| B26 | `conversion_band` | `…/interior` | ● | – | Q12 | |
| B27 | `shell_state` | `…/interior` | ● | – | Q12 | |
| B28 | `condition_band` | `…/interior` | ● | – | Q12 | |
| B29 | `revenue_band` | `…/interior` | ● | – | Q11 | |
| B30 | `revenue_chain` | `…/interior` | ● | – | Q11 | |
| B31 | `activity_band` | `…/interior` | ● | – | Q12 | |
| B32 | `lieutenant_ids` | `…/interior`, `/me/buildings` | ● | – | Q13 | |
| B33 | `lapse_phase_bucket` | `…/interior` | ● | – | Q12 | |
| B34 | `maintenance_in_progress` | `…/interior` | ● | – | Q12 | |
| B35 | `lieutenants[]` du quartier | `…/interior` | ● | – | Q13 | |
| B36 | `belief` (4 valeurs) | `city/precinct/:id/belief` | ● | ● partiel | **Q4** | 3 formes d'écusson pour 4 valeurs |
| B37 | `district_id`/`district_name` de vos bâtiments | `/me/buildings` | ● | ● | ✔ | c'est ce qui rend `mien` dérivable |
| B38 | le cardinal de vos bâtiments | `/me/buildings` | ● | ● | ✔ | « ⌂ 4 » et « 4 bâtiments » |
| B39 | `opened_game_day` | `session/open` | ● | ● | ✔ | « Jour 26 » (mesuré 37 sur le compte de démo) |
| B40 | `patrol_heat` (4) | `city/precinct/:id/patrol` | ● | – | **Q5** | |
| B41 | `cohesion_state` + `permanent_marginal` | `…/cohesion` | ● | – | Q9 | |
| B42 | `whisper_index` (3) + distribution | `city/citizens/whisper` | ● | – | **Q3** | seule route citywide |
| B43 | `queue_load` (5) + `dispatcher_regime` + 2 distributions | `…/inspection` | ● | – | Q8 | |
| B44 | `audit_pin_presence` (3) | `…/unconformity` | ● | – | Q10 | |
| B45 | `leks[]` + 3 bandes | `…/leks` | ● | – | Q14 | |
| B46 | `district_blocking_band` + `any_high_blocking_alert` | `…/stash` | ● | – | Q15 | |
| B47 | `district_load_band` + `district_tail_band` + `any_overflow` | `…/buffer` | ● | – | Q15 | |
| B48 | `exposure_band` + `network_cleanliness` | `…/throughput` | ● | – | Q15 | |
| B49 | `backpressure` | `…/flow` | ● | – | Q15 | |
| B50 | `cash_cents` + `wallet_band` | `economy/wallet` | ● | ● | ✔ (hors domaine) | « $ 24 850 » — le bandeau du shell ; le back sert le scalaire, R2.2-exempt assumé en commentaire |

### Lignes ancrées sur un élément M sans clé B (13)

| # | élément | B | M | statut |
|---|---|---|---|---|
| Ma | géométrie des 18 quartiers | – | ● | ASSUMÉ ratifié |
| Mb | tissus, îlots, fenêtres, tours, parcs, avenue | – | ● | ASSUMÉ ratifié |
| Mc | le fleuve + « LE THRENNY » | – | ● | ASSUMÉ à consigner |
| Md | le port + « LE PORT » | – | ● | ASSUMÉ à consigner |
| Me | rose des vents, vignettage, lune | – | ● | ASSUMÉ ratifié |
| Mf | libellé de la chaleur (« tiède », « froid ») | – | ● | lot back i18n |
| Mg | libellé de la conviction (« en chasse »…) | – | ● | lot back i18n |
| Mh | libellé du profil (« le port ») | – | ● | lot back i18n |
| Mi | « le labo, la planque, la façade, le coffre » | – | ● | arbitrage + lot back |
| Mj | « VOUS ÊTES ICI » / `mien` / « chez vous » | – | ● | lot back (L-C) |
| Mk | libellé « descente en cours » | – | ● | lot back i18n |
| Ml | « pincez pour approcher, touchez un quartier » | – | ● | à consigner |
| Mm | « ENTRER dans le quartier / dans le district » | – | ● | à consigner |

### Contrôle d'arithmétique

```
|clés B|                = 50
|éléments M non appariés| = 13
(mode maquette : pas de colonne F)
somme                   = 63
nombre de lignes de la table = 50 + 13 = 63   ✔
```

Répartition des 50 lignes B, **comptée sur la table par un oracle** (pas estimée) :

```
statut ✔  (dessinée et disponible)          : 15   B01 B03 B06 B07 B09 B10 B15 B16 B17 B23 B24 B37 B38 B39 B50
statut ✔ partiel (dessinée, forme incomplète):  4   B11 B19 B25 B36
statut ● –  (disponible, JAMAIS dessinée)    : 31
                                        somme = 50   ✔
```

⇒ **19 informations sur 50 sont dessinées** (dont 4 partiellement) ; **31 clés ne le sont pas**,
regroupées en **16 questions** (Q1..Q16) ; **13 éléments dessinés sans source**.
*(B50 — l'argent du bandeau — est hors domaine carte : à périmètre strict, 18 sur 49.)*

⚠️ **Ce compte a corrigé mon propre brouillon** : j'y avais écrit « 21 sur 50 » en énumérant
19 lignes. Le contrôle d'arithmétique passé sur ma propre table l'a réfuté — c'est la seule
raison pour laquelle le chiffre publié est juste.

---

## Annexes

### 1. Routes du domaine (compte, ancres)

**17 routes** portent le domaine de cet écran (`city/*`, `world/*`, `me/buildings`), sur **1029**
routes déclarées dans le back — **15 sous `JwtAuthGuard`**, **2 publiques**, **1 seule en `@Post`**.
Le dossier en proposait 3 ; le balayage en trouve 17. Liste et ancres : `mesures/01-routes-domaine.txt`.

⚠️ `GET /v1/world/districts` et `GET /v1/world/threnny-edges` **n'ont aucune garde** — les 18 noms
et les 6 traversées sont lisibles sans jeton. C'est documenté et voulu (« la géographie est connue »,
`world.controller.ts:5-8`), pas un défaut ; je le signale parce qu'un écran qui les lit n'a pas
besoin d'attendre la session.

### 2. Corps réels — commandes et provenance

Aucun corps n'a été (re)capturé (gate). Les 5 corps `appelée` du dossier ont été relus tels quels ;
leur provenance est dans chaque fichier (date 2026-09-04T10:15:48, `back_main 6ff684db`, image,
X-Request-Id). Voir `mesures/00-provenance.md` pour la datation et l'écart avec `dossier.md`.

Les routes **sans corps mesuré** dont ce rapport parle — et donc **DÉDUITES** de l'interface de
projection + de la spec : `world/threnny-edges`, `me/buildings`, `city/precinct/:id/belief`,
`city/precinct/:id/patrol`, `city/citizens/whisper`, et les 6 autres `city/district/:id/*`.
Chacune porte sa raison dans la table.

### 3. Valeurs possibles par clé, avec la contrainte source

`mesures/06-valeurs-possibles.txt` — chaque domaine fermé recopié de la ligne qui le contraint :
`district_profile` (6, pgEnum), `bank_side` (2, pgEnum), `threnny_edge_type` (2, pgEnum),
`ControlStateBucket` (4 déclarées / **1 servie**), `HeatBucket` (4), `PoliceBeliefBucket` (4),
`DayPhase` (4), `building_operational_type` (12, pgEnum), les 6 traversées semées (4+2),
et le kit de départ (4 bâtiments, district 16).

### 4. Inventaire M

`mesures/07-inventaire-maquette.txt` — compté dans la source des 3 cadres : 18 quartiers, 18 noms,
2 nappes `warm` (0 `hot`, 0 `burning`), 1 `pin-esc`, 6 écussons (3 formes employées : chasse/soup/veille),
1 `mien`, 1 `choisi` (cadres 23/24), 4 pastilles de bâtiment (cadre 24 seulement), 2 ponts, 3 parcs,
15 tours, 1 pied, 1 bande + 1 tampon par cadre de sélection, et le texte de chaque bande.

⚠️ Détail mesuré : la classe `h-warm`/`h-cold` portée par chaque `<g class="q …">` **n'a aucune règle
CSS** — la chaleur visible passe uniquement par les `<path class="nappe …">`. Les 4 bandes sont
néanmoins représentables (CSS l.386 : `.nappe.warm`, `.nappe.hot`, `.nappe.burning`, + COLD = pas de nappe).

### 5. Inventaire F

**Non applicable** — mode maquette. F : non mesuré. À faire au tour de clôture, après le juge visuel.

### 6. Non vérifié

| ce que je n'ai pas pu vérifier | la mesure qui trancherait (à rejouer après le gate) |
|---|---|
| le **corps réel** de `world/threnny-edges`, `me/buildings`, `precinct/:id/belief`, `precinct/:id/patrol`, `citizens/whisper` et des 6 autres `district/:id/*` | `curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/world/threnny-edges \| python3 -m json.tool` (et idem pour chacune), sur compte frais **et** sur le compte de démo |
| **si `03_carte.parcours.spec.ts` est effectivement ROUGE aujourd'hui** (D2) — je l'ai établi statiquement (route déclarée + module + import), pas exécuté | `E2E_TARGET=dev npx playwright test tests/e2e/parcours/03_carte.parcours.spec.ts` — l'assertion `me/buildings → 404` doit rougir |
| **si `precinct/:id/belief` répond autre chose que 404 sur un compte frais** — le contrôleur 404 tant que « le sim n'a pas tické » (`police_memory.controller.ts:71-75`) : les 6 écussons de la maquette pourraient n'avoir aucune donnée au premier lancement | `curl … /v1/city/precinct/1/belief` sur un signup neuf, avant tout tick |
| **si `me/buildings` rend bien 4 bâtiments au district 16 sur compte frais** (ce que la maquette dessine) | `curl … /v1/me/buildings` après signup + `session/open` ; attendu : 4 entrées, `district_id: 16`, types `lab/stash/front_shop/cash_safehouse` |
| **les valeurs** du bundle i18n : le corps `GET_i18n_bundle_locale.json` est l'un des 2 corps PÉRIMÉS du dépôt (`string_table.ts` a bougé). J'ai donc tout relu **dans `string_table.ts` à main** — les clés et valeurs citées ici viennent de la source, pas du corps | `curl -s "http://localhost/v1/i18n/bundle?locale=fr"` et rediffer contre `string_table.ts` |
| **la locale réellement servie au joueur** : le corps a été capturé avec `locale=fr` forcé, le compte de démo étant en `en` (dit par la provenance du corps) | vérifier ce que le client demande et ce que `player.locale` vaut sur un compte frais |
| **le rendu** : rien de la géométrie, du pan/zoom, des couleurs, du contraste — ce n'est pas mon instrument | c'est le `juge-visuel`, qui suit |
| **le côté F** (ce que le client affiche) — hors mandat ce tour-ci | mode clôture, après le juge visuel |
