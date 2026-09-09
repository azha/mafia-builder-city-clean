# Juge données ⊥ — ① L'intérieur de district (« le HUD de Brennar ») + ② la fiche — clôture — 2026-09-07

**Contexte de mesure.** Compte **FRAIS** créé par moi (`00-compte-frais.txt`), stack `http://localhost`,
back lu en LECTURE seule à `HEAD = b1d61f01` (`3117f159`, le SHA annoncé par le dossier, en est
**ANCÊTRE** — `git merge-base --is-ancestor 3117f159 HEAD` → 0). Le SHA de l'IMAGE reste **DÉDUIT** :
aucune route ne l'imprime. Front = l'archive `front-d5ddc40/` uniquement. **Une** mutation, déclarée
et justifiée (`mesures/00-COMMANDES.md` § mutation). Aucune route `_test`, aucun tick, aucun seed.

## En une phrase

Sur les **51 clés** que les 4 routes de cet écran servent réellement à un joueur frais, le front en
**REND 11**, en consomme **9** en logique invisible, et en **jette 31** ; la maquette dessine
**22 informations** dont **8** ont une source servie et non affichée ⇒ **10 défauts**, **3 lots back**
(dont `game_minute`, forme F exacte : lu par le compositeur de la route et omis de sa réponse) et
**8 questions « passé à côté ? »**. Le défaut le plus grave n'est pas un oubli d'affichage : c'est un
**énoncé daté FAUX dans le code de production** qui désarme un CTA — mesuré, `POST
/v1/operational/laundering/inject` rend **HTTP 200** sur un compte créé il y a trois minutes.

---

## Réponses aux 4 questions prioritaires

### Q1 — « 11 marqueurs pour 17 bâtiments » : la route sert-elle 17, 11, ou moins ?

**Aucun plafond n'existe, ni côté back ni côté front — mesuré des deux côtés.**

- **Back** : `district-interior.repository.ts:142-174` (`listPlayerBuildings`) — filtre exact
  `player_id = $1 AND blocks.district_id = $2 AND structural_state != 'demolished'`,
  `orderBy(block_id, building_id)`, **zéro `limit(`** dans tout le fichier
  (`grep -c 'limit(' district-interior.repository.ts` → **0**) et zéro `slice(` dans la projection
  (**0**). ⚠️ Deux zéros méritent leurs contrôles positifs, dans le MÊME fichier : `orderBy` → **6**,
  `demolished` → **11**. Le motif mord ; les zéros sont vrais.
- **Front** : `DistrictInteriorScreenController.cs:592-614` — `foreach` sur `ordered`, un
  `RenderedBuildingCount++` par entrée (`:613`), **aucun budget** (`MaxAmbientLoops = 4` ne borne que les
  micro-animations, `:1474`, et les marqueurs de lieutenant n'ont explicitement aucun budget, `:1325`).
  La seule porte de sortie est `continue` si `building.block_id` n'est pas dans `blocks[]` (`:594`).

**Mesuré sur mon compte frais** : le kit de départ octroie **4 bâtiments, TOUS dans le district 16**
(`04-interior-16.json` : 4 · les 17 autres districts : 0 chacun · total 4 sur 18 districts,
`05-me-buildings.json` : 4 entrées, `district_id: 16` ×4). Le district 16 est **« La Lisière » /
Verge-A**, grille 10×4, **40 blocs** (`block_id` 1501→1540) ; les 4 bâtiments occupent 1501-1504,
tous présents dans `blocks[]` (4/4). Types servis : `lab`, `stash`, `front_shop`, `cash_safehouse`.
**2 lieutenants** (`Lt. Rin`, `Lt. Hara`), tous deux affectés au MÊME bâtiment (le lab).

**Donc, sur la divergence avec le journal (17 bâtiments / district 16 / 11 pastilles) : je ne peux pas
la trancher, et je dis pourquoi.** Le compte `operational_demo` m'est interdit. Ce que la mesure
établit : `…/interior/:id` est **scopée à UN district** alors que « 17 bâtiments » est, sur mon
compte, un compte **global** (`GET /v1/me/buildings`, toutes divisions confondues). Trois mécanismes
peuvent produire 11 < 17, et ils sont distinguables par **une** commande :

| mécanisme | comment le trancher |
|---|---|
| 6 bâtiments sont dans d'AUTRES districts | `GET /v1/me/buildings` sur le compte de démo, groupé par `district_id` |
| 6 sont `demolished` (seul état filtré, `:161`) | le même appel : `me/buildings` applique le MÊME filtre `!= 'demolished'` ⇒ si `me/buildings` rend 17, aucun n'est démoli |
| 6 sont servis et non rendus (F) | comparer `len(buildings)` de `…/interior/16` au `RenderedBuildingCount` du contrôleur |

⚠️ **Et le corps archivé du 04/09 ne peut pas servir de témoin** : `corps-reels-04-09/GET_city_district_id_interior.json`
a été capturé sur **`/v1/city/district/1/interior`** (`route_appelee`), pas 16 — **1 bâtiment**, et
**13 clés par bâtiment** là où la route en sert **15** aujourd'hui.

### Q2 — Chaque pastille est-elle distinguable par la DONNÉE ?

**OUI, et largement — la donnée discriminante existe, le rendu la jette presque entièrement.**

La route sert par bâtiment (mesuré, 15 clés, `04-interior-16.json`) : `operational_type` (12 membres
fermés), `name_i18n` (enseigne propre : « Mécanique Skeld », « Débarras Nock », « Photo Ilm »,
« Entrepôt Wend » — 4 noms distincts sur 4), `conversion_band`, `shell_state`, `condition_band`,
`revenue_band`, `revenue_chain`, `activity_band`, `relance_band`, `harvest_band`, `lieutenant_ids`,
`lapse_phase_bucket`, `maintenance_in_progress`.

Ce que le front en fait, **lu site par site** :

- **Le médaillon lui-même est une CONSTANTE.** `BadgeDiametrePx = 26f` (`:970`), disque
  `RadialDisc(hudGaugeFaceInner, hudGaugeFaceOuter)` (`:1018`) + anneau `Ring(hudHairlineGold)` (`:1049`) :
  **aucun paramètre du badge ne dépend d'un champ du bâtiment**. Deux bâtiments de types différents
  produisent, au bit près, le même badge.
- Le seul discriminant *par type* est un **texte** de 9 pt collé sous la cellule
  (`TypeLabel(building.operational_type)`, `:886`) — hors du médaillon.
- Les 4 pastilles d'état (`BuildStatePip`, `:1059`) sont **conditionnelles**, et sur un monde frais
  **une seule des quatre s'allume** : `WindowLight` (garde `condition_band == "SOUND"`, `:1128`) est
  vraie sur 4/4 ; `RevenueSign` exige `revenue_chain == "WIRED"` (mesuré `UNWIRED` 4/4 ⇒ jamais) ;
  `ActivitySmoke` exige `activity_band == "ACTIVE"` (mesuré `IDLE` 4/4 ⇒ jamais) ;
  `MaintenanceFlicker` exige `lapse_phase_bucket != "WITHIN_WINDOW"` (mesuré `WITHIN_WINDOW` 4/4 ⇒ jamais).
- **`shell_state` : 0 usage dans TOUT l'arbre front** (contrôle sur motif nu, sans point ni frontière
  de mot : 2 occurrences dans `DistrictInteriorScreenController.cs` — **des commentaires** — et 1 dans
  le DTO). Un bâtiment `GONE` rend donc **exactement** comme un `STANDING`.
- `name_i18n` n'est lu QUE dans la fiche (`:1960-1972`) — **jamais sur le marqueur**.

⇒ **La conclusion « 9/11 pastilles bit-identiques ⇒ défaut F » est fondée par la construction, pas
seulement par la capture** : sur un monde calme, tous les badges *doivent* être identiques, parce que
le seul champ qui varie toujours (`operational_type`, `name_i18n`) n'entre pas dans le médaillon.
C'est le **défaut D7** ci-dessous.

### Q3 — Les trois « ou »

| le « ou » du juge visuel | réponse mesurée |
|---|---|
| **La piste du ratio** : absente ou à 100 % ? | **PRÉSENTE, et à 100 % — et elle n'encode RIEN.** `MoneyUnderlineWidthPx = 74f` (`TopBarController.cs:467`, « REUSE exact — hud-brennar.html:59 `.ratio{width:74px}` »), posée en `sizeDelta = (74, HairlineThicknessPx)` **fixe** (`:1097`), teinte `hudMoneyUnderlineGold` (`:1099`). Le fichier le dit lui-même (`:1049-1051`) : « Le soulignement N'ENCODE PAS un ratio propre/sale — aucune donnée client ne porte cette information ». **Je confirme la prémisse côté back** : `GET /v1/economy/wallet` sert 3 clés (`player_id`, `cash_cents`, `wallet_band`) — aucune propreté ; la SEULE propreté servie au joueur est **par nœud de blanchiment** (`cleanliness_band` ∈ DIRTY \| PARTIAL \| MOSTLY_CLEAN \| CLEAN, `laundering.controller.ts:176-178` ; mesuré `PARTIAL` sur mon nœud, `13-laundering-apres.json`), jamais un ratio de portefeuille. ⇒ **défaut D8** : à largeur et couleur identiques au canon, la barre *ressemble* à la piste de la maquette et un joueur y lit « 100 % propre ». |
| **Le bandeau d'alerte** : absent, ou aucune alerte ? | **ABSENT du front — ce n'est pas « aucune alerte ».** Contrôles : `Banniere`/`bannière`/`Toast`/`Ephemere`/`Alerte` → **0 fichier** ; `alerte` → 1 fichier (`TopBarController.cs:523`, un commentaire sur le rouge d'alarme) ; les 4 fichiers portant « bandeau » désignent la barre haute. Contrôles POSITIFS sur le même motif nu : `OwnershipBadge` → 1, `ficheSortie` → 1. Et la donnée EST là : sur un compte de **3 minutes**, `session/open` porte déjà **1 carte** dans `queue[]` avec `lieutenant.name = "Lt. Rin"` et `event_descriptor_i18n` (`02-session-open.pretty.json`) — exactement la forme « ✉ Sal a un rapport du soir ». Et `backlog_badge` est reçu par la barre et rendu **à alpha 0** (`BuildNotificationHook`, `TopBarController.cs:1661-1664` : `WithAlpha(onSurfacePrimary, 0f)`). ⇒ **défauts D4 et D6**. |
| **La 3ᵉ stat de la fiche en crème : valeur « Sain » ?** | **OUI, exactement.** `ficheStatValeurs[2].text = LibellesBatiment.Etat(b.condition_band)` (`:2002`) et `LibellesBatiment.cs:84` : `case "SOUND": return "Sain";` ; la couleur : `b.condition_band == "SOUND" ? hudCreme : accentDanger` (`:2004-2005`). Mesuré : `condition_band = "SOUND"` sur **4/4** des bâtiments d'un compte frais. ⇒ crème = « Sain », c'est l'état par défaut du monde neuf, pas un bug de teinte. ⚠️ Mais le **libellé** de cette 3ᵉ case est « ÉTAT » là où le canon dit « HEAT LOCAL » — voir **D2**. |

### Q4 — La fiche : 3 bandes, 3 actions, le nom

**Les 3 bandes** (`OuvrirFiche`, `:1976-2006`) :

| case | canon | ce que le front met | clé B | mesuré (compte frais) |
|---|---|---|---|---|
| 1 | `$ 2 400` / **À COLLECTER** | `Au repos` / **REVENU** | `revenue_band` (`IDLE\|EARNING`) | `IDLE` 4/4 |
| 2 | `$ 180/h` / **REVENUS** | `Coupée` / **CHAÎNE** | `revenue_chain` (`WIRED\|UNWIRED`) | `UNWIRED` 4/4 |
| 3 | `12%` / **HEAT LOCAL** | `Sain` / **ÉTAT** | `condition_band` (4 membres) | `SOUND` 4/4 |

⇒ Les trois cases ont **glissé d'un cran** : le canon demande *à collecter · revenus · heat*, le front
sert *revenus · chaîne · état*. « À collecter » et « Heat local » n'ont **aucun porteur** dans la
fiche, et les deux ont une source servie (**D2**, **D3**).

**Le nom** : `ResoudreNomBatiment` (`:1958-1973`) résout `name_i18n` par `I18nCatalog.Traduire`. Le
gabarit existe bien dans le bundle servi : `game.fiction.building.name` → `{enseigne} — {district},
îlot {block}` (`09-i18n-bundle-fr.json`). ⇒ le titre rend « Mécanique Skeld — La Lisière, îlot 1501 ».
Le **sous-titre** (`ficheType`) rend `LibellesBatiment.Conversion(conversion_band)` = « OPÉRATIONNEL »
là où le canon met le **type/rôle** (« Bar · Quartier général ») : `operational_type` est disponible et
n'entre pas dans la fiche (il ne vit que sur le libellé de la carte, `:886`).

**Les 3 actions** — chacune confrontée à sa route :

| CTA | route joueur | verdict mesuré |
|---|---|---|
| **COLLECTER** | `POST /v1/operational/dealer/:id/collect` (`selling.controller.ts:94`, `JwtAuthGuard`) | **la prémisse du front TIENT.** La route prend un id de **dealer**, et `DealerProjection` (`selling.projection.service.ts:85-140`, 13 clés) ne porte **aucun** `building` — alors que `dealer.home_building_id` existe en base et est **indexé** (`operational_chain.ts:228,238`). ⇒ **lot back L2**, pas un défaut de front. |
| **BLANCHIR** | `POST /v1/operational/laundering/inject` (`laundering.controller.ts:79`, `JwtAuthGuard`) | ⛔ **LA PRÉMISSE DU FRONT EST FAUSSE.** Voir **D1** — HTTP **200** mesuré. |
| **AMÉLIORER** | `POST /v1/operational/building/:id/upgrade-tier` (`real-estate.controller.ts:176`, `JwtAuthGuard`) | la route existe, est joueur, et prend **exactement l'id que la fiche tient déjà** (`FicheBuildingId = b.building`, `:1980`). Le front renvoie vers un autre écran. ⇒ **D10**. |

**Ce que la route sert et que la fiche ignore** : `relance_band`, `harvest_band`, `shell_state`,
`activity_band` (rendu en pastille sur la carte, jamais dans la fiche), `lieutenant_ids` +
`lieutenants[].name` (le nom de qui tient la maison), `lapse_phase_bucket` /
`maintenance_in_progress`, `block_id`. Et, hors de cette route, **26 clés** de plus par bâtiment sur
`GET /v1/operational/building/:id` — jamais appelée par cet écran (question Q5 ci-dessous).

---

## Défauts

| # | information | B | M | F | statut | preuve |
|---|---|---|---|---|---|---|
| **D1** | **BLANCHIR est désarmé par un énoncé daté FAUX en production** | ● | ● (M18) | – | **DÉFAUT — le plus grave** | `DistrictInteriorScreenController.cs:2058-2061` affirme : la route « rend **404 POUR TOUT LE MONDE, DANS TOUS LES ENVIRONNEMENTS** : rien ne crée jamais de ligne `safehouses` (0 écrivain dans `services/`, 0 dans les 147 migrations — chaîne morte TD-358) ». **Mesuré, compte de 3 minutes** : `GET /v1/city/district/16/stash` rend **1 safehouse** (`10-stash-16.json`, `safehouse_id 4b29152f…`, `building_id 442c180f…` = le `cash_safehouse` du kit) ; puis `POST /v1/operational/laundering/inject` → **HTTP 200**, `node_id 7866d6ba…` (`12-laundering-inject.txt`). le bouton dit « aucune planque — la filière n'est pas ouverte » (`:2076`) sur un monde où elle EST ouverte au premier clic. |
| **D2** | **chaleur par bâtiment (« HEAT LOCAL »)** | ● | ● (M16) | – | **DÉFAUT** | `GET /v1/city/district/:id/heat` sert `buildings[].heat_bucket` (COLD\|WARM\|HOT\|BURNING) **clé par le MÊME uuid** (`06-heat-16.json`, 4/4 bâtiments) ; le DTO `BuildingHeatDto` **existe déjà** dans la même assembly (`WorldDtos.cs:138-141`) et `WorldApiClient.GetDistrictHeat` aussi (`:66`). **`DistrictInteriorScreenController` ne l'appelle jamais** (les 4 appelants mesurés : `OrgVitalsPanelController:91`, `CityMapController:259,1069`, `AppShell:674`). Le commentaire de la fiche — « ce DTO ne porte AUCUNE chaleur par bâtiment (mesuré : 13 champs, aucun heat) », `:2000-2001` — est vrai **de cette route-là** et lu comme vrai du domaine. |
| **D3** | **« À COLLECTER » (`harvest_band`)** | ● | ● (M14) | – | **DÉFAUT** | `harvest_band` ∈ `NOTHING\|AVAILABLE\|FULL` (`capacity-guard.service.ts:35`), servie par `…/interior` depuis `72d837b2` (2026-09-07) — mesurée `NOTHING` 4/4. **0 occurrence de `harvest_band` dans TOUT l'arbre front** (motif nu, arbre entier). Elle dit exactement ce que la case 1 du canon demande, en bande. |
| **D4** | **bandeau d'alerte éphémère** | ● | ● (M8) | – | **DÉFAUT** | `session/open.queue[]` porte, sur compte frais, 1 carte avec `lieutenant.name` et `event_descriptor_i18n` ; `backlog_badge` est reçu par la barre (`TopBarController.cs:569,605`) et écrit dans un texte **à alpha 0** (`:1661-1664`). Aucun bandeau dans le front (contrôles positifs/négatifs en Q3). Le canon en fait sa doctrine ④ (« zéro badge permanent, des bandeaux éphémères »). |
| **D5** | **`escalated` (le gyrophare)** | ● | ● (M9) | – | **DÉFAUT** | `heat` sert `escalated: bool` (« un bâtiment a franchi le seuil d'escalade au dernier tick », `06-heat-16.json`). Le DTO front le déclare (`WorldDtos.cs:149`) ; **0 lecture** dans l'arbre. Le canon en fait un signal DANS LA VILLE (`.gyro`, annexe ②). |
| **D6** | **pastille or du dock (Famille)** | ● | ● (M21) | – | **DÉFAUT** | `hud-brennar.html:117,199` — `small.disc` sur l'onglet Famille (« point or discret, pas de badge rouge »). `AddTabButton` (`AppShell.cs`) ne construit ni disc ni pastille ; le seul état d'onglet est `ActiveIndicator` (`:1976`). Source disponible : `backlog_badge` / `queue`. |
| **D7** | **le médaillon ne porte aucun champ du bâtiment** | ● | – | ● | **DÉFAUT** | `BadgeDiametrePx = 26f` constant (`:970`), disque (`:1018`) + anneau (`:1049`) à teintes fixes ; **aucun** paramètre dérivé de `operational_type`, `name_i18n` ou `shell_state` (0 usage de `shell_state` dans l'arbre). Deux bâtiments de types différents rendent le même objet. Le fichier a lui-même corrigé le 2026-09-07 le prédicat qui masquait le libellé (`:855-884`) — la correction rend le TEXTE, pas le médaillon. |
| **D8** | **le soulignement de 74 px lu comme un ratio à 100 %** | – | ● (M2) | ● | **DÉFAUT (valeur en dur)** | Largeur fixe 74 px = **exactement** `.ratio{width:74px}` du canon (`TopBarController.cs:467`, REUSE revendiqué), même famille d'or, même position sous le montant (`:1097`), et **aucune donnée** derrière (`:1049-1051`, confirmé côté back : wallet = 3 clés). Un élément qui reprend la géométrie exacte d'une jauge sans en porter la valeur ne se lit pas comme décoratif : il se lit **plein**. |
| **D9** | **`LibellesBatiment.Type` commute sur des valeurs que le back n'émet jamais** | ● | ● (M13) | – (latent) | **DÉFAUT latent** | `LibellesBatiment.cs:22-41` — documenté « `operational_type` — 12 membres côté back » puis `case "GROW_HOUSE"`, `"LAB"`, `"SAFEHOUSE"`, `"WAREHOUSE"`, `"GARAGE"`, `"CLUB"`, `"BAR"`, `"RESTAURANT"`… **en MAJUSCULES**. L'enum réel est **minuscule** : `front_shop, cash_safehouse, stash, lab, grow_house, refinery, press_house, distribution_hub, office, dealer_spot_front, money_holding, specialized_lab` (`operational_chain.ts:27-31`), mesuré tel quel dans les corps. **Les 13 bras sont inatteignables** ; l'appel tombe sur `default: CasseDeTitre(t)` ⇒ « Lab », « Stash », « Cash safehouse ». Latent seulement parce que le seul site d'appel (`:1961`) est le repli d'un `name_i18n` absent — et le back en sert un toujours. |
| **D10** | **AMÉLIORER renvoie ailleurs alors que sa route prend l'id que la fiche tient** | ● | ● (M19) | – | **DÉFAUT (ou arbitrage à ratifier)** | `POST /v1/operational/building/:id/upgrade-tier` (`real-estate.controller.ts:176`, `JwtAuthGuard`) ; la fiche détient `FicheBuildingId` (`:1980`). Le CTA rend « Amélioration : à ouvrir depuis la fiche opérationnelle. » (`:2079`). Trois autres routes de palier existent sur le même id (`upgrade-hub-tier`, `upgrade-equipment-tier`, `upgrade-money-holding-tier`). |

---

## « Passé à côté ? » — pour l'user (disponible, jamais dessiné, jamais affiché)

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| 1 | `lieutenants[].name` (`…/interior`) — mesuré `Lt. Rin`, `Lt. Hara` | **QUI** tient ce bâtiment | **Utile ici, et c'est la plus rentable** : les marqueurs de lieutenant sont aujourd'hui des disques anonymes, et le monde J0 en pose **deux sur le MÊME bâtiment** (mesuré : `lieutenant_ids` de longueur 2 sur le lab) ⇒ deux objets identiques qui ne disent pas qui. Un nom sur la fiche coûte une ligne et la jointure est déjà servie (`lieutenant_ids` ↔ `lieutenants[]`). | ★★★ |
| 2 | `district_bucket` (`…/heat`) | la chaleur **du district où je suis** | **Utile ici** : le manomètre du bandeau montre la chaleur de la VILLE (`citywide_bucket`, `:694`). Un joueur qui entre dans un quartier veut savoir si CE quartier chauffe. La clé est dans le même corps, déjà déclarée au DTO (`WorldDtos.cs:147`), jamais lue. | ★★★ |
| 3 | `relance_band` (`…/interior`, `RUNNING\|RELAUNCHABLE\|NOT_APPLICABLE`) | **où un geste est possible** | **Utile ici** : c'est la seule clé qui sépare « rien ne tourne, on peut relancer » de « ce type ne lancera jamais rien » — la distinction que `activity_band` ne peut pas faire (2 valeurs). Mesuré : `RELAUNCHABLE` sur le lab, `NOT_APPLICABLE` sur les 3 autres ⇒ elle discrimine **dès le J0**. | ★★★ |
| 4 | `GET /v1/operational/building/:id` — **26 clés** par bâtiment, joueur, même id | `raid_risk`, `days_until_maintenance_due` (30), `cover_band`, `yield_band`, `held_band`, `capacity_band`, `roster_band`, `seized_amount`, `repair_cost`, `available_vehicles`, 4 bandes de palier | **Utile ici** : c'est le réservoir de la fiche. `yield_band` et `held_band` sont les candidats naturels de « REVENUS » et « À COLLECTER » du canon ; `raid_risk` et `days_until_maintenance_due` donnent une raison d'agir. Route **jamais appelée** par cet écran (`16-building-card-*.json`). | ★★★ |
| 5 | `wallet_band` (`…/wallet`, mesuré `MODERATE`) | est-ce **beaucoup** ou **peu** ? | **Utile ici, discrètement** : le montant brut ne se qualifie pas tout seul, et la barre n'a pas de place pour une phrase. Une teinte ou une graduation sur la piste de 74 px (qui n'encode rien aujourd'hui, D8) donnerait à cette barre un sens réel au lieu d'un faux ratio. | ★★ |
| 6 | `deviation_bucket` + `audit_pin_active` (`…/unconformity`) | « ce commerce est sous surveillance » | **Utile ici** : mesuré `NOMINAL` / `false` sur un compte frais, mais c'est l'information qui rend la filière de blanchiment lisible **sur la carte** plutôt que dans un menu. | ★★ |
| 7 | `shell_state` (`STANDING\|GONE`) | la coquille tient-elle encore ? | **Utile ici** : voir D7 — c'est l'état le plus grave qu'un bâtiment puisse porter et il est aujourd'hui invisible. | ★★ |
| 8 | `bank_side`, `grid`, `district`, `district_id`, `session_id`, `player_id`, `blocks[].block_id` | rive, dimensions, identifiants | **Pas ici** : de la plomberie, ou de la géographie que le fond pré-rendu porte déjà. | ☆ |

---

## Lots back suggérés (B⁻ dessiné, ou forme F)

| # | colonne / valeur | table / source | maquette | preuve |
|---|---|---|---|---|
| **L1** | **`game_minute`** — **forme F exacte** | `city_sim_clock` via `MaintenanceRepository.getCurrentGameDayAndMinute(playerId)` | **M7** — `#heure` « 21:40 », et l'annexe ③ le nomme (« elle pilote toujours la scène jour/nuit (*game_minute*) ») | `district-interior.controller.ts:116-119` lit `{ gameMinute, currentGameDay }`, `:148` s'en sert (`day_phase: this.dayPhase(gameMinute)`), et **l'objet retourné `:137-151` ne porte ni l'un ni l'autre** — 11 clés mesurées. Écrivain de production, valeur persistée, déjà **en argument du compositeur**, omise par la projection. `session/open` ne la porte pas non plus (12 clés mesurées). |
| **L2** | **`dealer.home_building_id`** | `operational_chain.ts:228` (FK vers `buildings`, **indexée** `:238` `dealer_player_building_idx`) | **M17** — le CTA COLLECTER | `DealerProjection` (`selling.projection.service.ts:85-140`) porte `dealer`, `name_i18n`, 6 bandes, `district_name`, `lane_band` — **aucun `building`**. C'est le seul maillon qui manque pour que la fiche d'un `dealer_spot_front` sache quel dealer collecter. |
| **L3** | **une bande de propreté au niveau JOUEUR** | aujourd'hui : `cleanliness_band` **par nœud** (`laundering.controller.ts:176-178`, mesuré `PARTIAL`) | **M2** — `.ratio i{width:68%}`, « la part propre (or) contre sale (gris) », annexe ① | Rien au niveau portefeuille : `wallet` = `player_id`, `cash_cents`, `wallet_band`. Soit un lot back (agréger les nœuds en une bande de portefeuille), soit **ratifier explicitement** que la piste disparaît — mais pas la laisser pleine et muette (D8). |
| **L4** | **le fait qu'un bâtiment héberge un nœud de blanchiment** | `laundering_node.building_id` (implicite : `inject` prend un `front_shop_id`) | la fiche d'un commerce-écran | **Mesuré** : `15-interior-16-apres.json` vs `04-interior-16.json` après un `inject` réussi ⇒ **aucun champ ne bouge** sur les 4 bâtiments. La fiche ne peut pas dire « ce commerce blanchit », ni proposer BLANCHIR au bon endroit. |
| **L5** | `buildings.acquired_at_tick` | `city_state.ts` (bigint, game-minutes) | non dessiné | Lu par le domaine **uniquement pour le RANG** du nom de fiction (`district-interior.repository.ts:154`), jamais projeté. « Depuis quand je le tiens » — question, pas lot, tant que rien ne le dessine. |

---

## Actions : routes ↔ CTA

| CTA / geste | route joueur | état |
|---|---|---|
| **COLLECTER** (M17) | `POST /v1/operational/dealer/:id/collect` | **CTA sans jointure** — lot back **L2** |
| **BLANCHIR** (M18) | `POST /v1/operational/laundering/inject` | **CTA désarmé à tort** — défaut **D1**, HTTP 200 mesuré |
| **AMÉLIORER** (M19) | `POST /v1/operational/building/:id/upgrade-tier` | **CTA non câblé alors que la route prend son id** — défaut **D10** |
| toucher un bâtiment → fiche | (client) | ✔ câblé (`:604-608`, `Button` + `OuvrirFiche`) |
| pan / zoom sur la carte | (client) | ✔ `DistrictMapNavigation` (hors canon — le canon ne montre pas ce geste) |
| dock : 4 onglets (M20) | (navigation) | ✔ 4 boutons ; libellé **« Filière »** au lieu de **« Marché »** (écart consigné en code, `AppShell.cs:1662`) |
| **routes joueur du domaine sans aucun CTA sur cet écran** | `POST …/building/:id/repair`, `…/schedule-maintenance`, `…/convert`, `…/deposit-cash`, `…/withdraw-cash`, `…/upgrade-hub-tier`, `…/upgrade-equipment-tier`, `…/upgrade-money-holding-tier`, `…/buildings/mass-schedule-maintenance`, `POST …/dealer/assign`, `POST …/laundering/stage` | **11 actions joueur** existantes, prenant un id de bâtiment (ou dérivé), sans geste. `…/repair` et `…/schedule-maintenance` répondent exactement aux deux états que la carte affiche déjà en pastille (`condition_band`, `lapse_phase_bucket`) ⇒ **question pour l'user**, pas un défaut de ce lot. |

---

## Table de couverture complète

Portée B : les **4 routes** dont cet écran consomme le corps pour son propre affichage —
`GET …/interior` (29 informations), `POST /session/open` (12), `GET /economy/wallet` (3),
`GET …/heat` (7). Les conteneurs (`grid`, `blocks`, `buildings`, `lieutenants`) ne comptent pas pour
eux-mêmes : ce sont leurs feuilles qui portent l'information.

Légende F : **R** rendu · **L** logique (conditionne sans être montré) · **–** ignoré.

### R1 — `GET /v1/city/district/16/interior` (29)

| # | clé | valeurs possibles (source) | B | M | F | statut |
|---|---|---|---|---|---|---|
| 1 | `district` | `"district-16"` (`controller:138`) | ● | – | – | « passé à côté ? » (plomberie) |
| 2 | `district_id` | int (param) | ● | – | – | « passé à côté ? » (plomberie) |
| 3 | `profile` | `tidewater\|spine\|lattice\|stack\|glass\|verge` (`world_geography`) | ● | ● | **R** `:437` (choix du fond) | ✔ |
| 4 | `name_canonical` | `"Verge-A"` (`districts`) | ● | – | **L** `:405-406` (repli du titre) | ✔ (repli) |
| 5 | `name` | `"La Lisière"` (`nomDeDistrict`) | ● | – | **R** `:407-408` (titre d'écran) | affichée sans être dessinée → à ratifier |
| 6 | `bank_side` | `north\|south` | ● | – | – | « passé à côté ? » (plomberie) |
| 7 | `day_phase` | `DAWN\|DAY\|DUSK\|NIGHT` (`controller:53,175-186`, exhaustif) | ● | ● (M6/M11) | **R** `:270` (art) + `AppShell:398` → `SetDayPhase` | ✔ |
| 8 | `grid.width` | int | ● | – | – | « passé à côté ? » |
| 9 | `grid.height` | int | ● | – | – | « passé à côté ? » |
| 10 | `blocks[].block_id` | int (PK globale) | ● | – | **L** `:571` (jointure) | ✔ |
| 11 | `blocks[].x` | int | ● | ● (la ville) | **R** `:596` (ancrage) | ✔ |
| 12 | `blocks[].y` | int | ● | ● (la ville) | **R** `:596` | ✔ |
| 13 | `lieutenants[].lieutenant_id` | uuid | ● | – | – | « passé à côté ? » |
| 14 | `lieutenants[].name` | littéral fr (`"Lt. Rin"`) | ● | – | – | **« passé à côté ? » n° 1** |
| 15 | `buildings[].building` | uuid | ● | – | **L** `:1980` | ✔ |
| 16 | `buildings[].block_id` | int | ● | – | **L** `:594` | ✔ |
| 17 | `buildings[].name_i18n` | `game.fiction.building.name` + params (bundle mesuré) | ● | ● (M12) | **R** `:1972` (titre de fiche) | ✔ |
| 18 | `buildings[].operational_type` | 12 membres minuscules (`operational_chain.ts:27-31`) + `''` | ● | ● (M13) | **R** `:886` (libellé de carte) ; **absent de la fiche** | partiel — voir D9 |
| 19 | `buildings[].conversion_band` | `NOT_CONVERTED\|IN_SETUP\|OPERATIONAL` | ● | – | **R** `:1983` (sous-titre de fiche, à la place du type) | affichée sans être dessinée → à ratifier |
| 20 | `buildings[].shell_state` | `STANDING\|GONE` (`projection:45`) | ● | – | **–** (0 usage, arbre entier) | **D7** |
| 21 | `buildings[].condition_band` | `SOUND\|DAMAGED\|REPAIRING\|FAILED` | ● | – | **R** `:2002,2004` + **L** `:1128` | affichée sans être dessinée → à ratifier |
| 22 | `buildings[].revenue_band` | `IDLE\|EARNING` | ● | ● (M15/M10/M22) | **R** `:1994` + **L** `:1164` | ✔ |
| 23 | `buildings[].revenue_chain` | `WIRED\|UNWIRED` | ● | – | **R** `:1998` + **L** `:1163` | affichée sans être dessinée → à ratifier |
| 24 | `buildings[].activity_band` | `IDLE\|ACTIVE` | ● | – | **L→R** `:1210` (pastille) | ✔ |
| 25 | `buildings[].relance_band` | `RUNNING\|RELAUNCHABLE\|NOT_APPLICABLE` (`projection:76`) | ● | – | **–** (0, arbre entier) | **« passé à côté ? » n° 3** |
| 26 | `buildings[].harvest_band` | `NOTHING\|AVAILABLE\|FULL` (`capacity-guard:35`) | ● | ● (M14) | **–** (0, arbre entier) | **D3** |
| 27 | `buildings[].lieutenant_ids` | uuid[] (trié, `[]` jamais `null`) | ● | – | **R** `:1328-1329` (marqueurs) | affichée sans être dessinée → à ratifier |
| 28 | `buildings[].lapse_phase_bucket` | `WITHIN_WINDOW\|SOFT\|HARD\|CRITICAL` | ● | – | **L→R** `:1249` (pastille) | ✔ |
| 29 | `buildings[].maintenance_in_progress` | bool | ● | – | **L** `:1250` | ✔ |

### R2 — `POST /v1/session/open` (12)

| # | clé | B | M | F (sur CET écran) | statut |
|---|---|---|---|---|---|
| 30 | `session_id` | ● | – | **L** (shell) | ✔ |
| 31 | `hl_card` | ● | – | – (rendu sur l'ACCUEIL, pas ici) | « passé à côté ? » (hors écran) |
| 32 | `queue[]` (+ `lieutenant.name`, `event_descriptor_i18n`, 4 bandes) | ● | ● (M8) | – | **D4** |
| 33 | `backlog_badge` | ● | ● (M8/M21) | **texte à alpha 0** `:1661-1664` | **D4 / D6** |
| 34 | `queue_pressure_band` | ● | – | – (Accueil) | « passé à côté ? » |
| 35 | `structural_budget` | ● | – | – (Accueil) | « passé à côté ? » |
| 36 | `flag_review` | ● | – | – | « passé à côté ? » |
| 37 | `settling_glance` | ● | – | – | « passé à côté ? » |
| 38 | `friction_glance` | ● | – | – (Accueil) | « passé à côté ? » |
| 39 | `compression_glance` | ● | – | – (Accueil) | « passé à côté ? » |
| 40 | `onboarding` | ● | – | – | « passé à côté ? » |
| 41 | `opened_game_day` | ● | ● (M6) | **R** `TopBar:613` (« JOUR {N} ») | ✔ |

### R3 — `GET /v1/economy/wallet` (3)

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 42 | `player_id` | ● | – | – | « passé à côté ? » (plomberie) |
| 43 | `cash_cents` (`"1000000"`) | ● | ● (M1) | **R** `TopBar:600` | ✔ (scalaire assumé — chrome) |
| 44 | `wallet_band` (`MODERATE`) | ● | – | – | **« passé à côté ? » n° 5** |

### R4 — `GET /v1/city/district/16/heat` (7)

| # | clé | valeurs | B | M | F | statut |
|---|---|---|---|---|---|---|
| 45 | `district` | `"district-16"` | ● | – | – | « passé à côté ? » |
| 46 | `district_bucket` | `COLD\|WARM\|HOT\|BURNING` | ● | – | – | **« passé à côté ? » n° 2** |
| 47 | `citywide_bucket` | idem | ● | ● (M3/M4/M5) | **R** `TopBar:694` (aiguille + libellé) | ✔ (écart assumé % → mot) |
| 48 | `escalated` | bool | ● | ● (M9) | – | **D5** |
| 49 | `buildings[].building` | uuid | ● | – | – | jointure |
| 50 | `buildings[].heat_bucket` | 4 bandes | ● | ● (M16) | – | **D2** |
| 51 | `buildings[].name_i18n` | I18nRef | ● | – | – | redondant avec #17 |

### Éléments M non appariés (3)

| # | élément M | statut |
|---|---|---|
| M2 | `.ratio i{width:68%}` — part propre / sale | **dessiné sans source** → lot back **L3** *ou* ratification ; rendu **plein** aujourd'hui ⇒ **D8** |
| M7 | `#heure` « 21:40 » — l'heure in-game | **dessiné sans source projetée** → **forme F**, lot back **L1** (`game_minute`) |
| M20 | dock : 4 boutons, actif marqué par `.pointe` | navigation cliente, pas une donnée back — **ASSUMÉ** (libellé « Filière » ≠ « Marché », consigné en code) |

### Rendus F sans source ni maquette (2)

| # | rendu | preuve | statut |
|---|---|---|---|
| F-a | bouton « ← » (retour carte) | `TopBarController.cs:653` — le canon n'a qu'une volute décorative au même endroit | **à ratifier** (consigné en code `:646-655`) |
| F-b | les 3 messages de sortie des actions (« Collecte : ce bâtiment n'expose pas encore son vendeur. » etc.) | `:2068-2080` | **à ratifier** — honnête par construction, mais **le message de BLANCHIR est FAUX** (D1) |

### Contrôle d'arithmétique

```
|clés B|                    = 29 (interior) + 12 (session/open) + 3 (wallet) + 7 (heat) = 51
|éléments M non appariés|   =  3
|rendus F sans source|      =  2
                              ──
somme                       = 56   ==   nombre de lignes de la table (29+12+3+7+3+2 = 56)   ✔
```

Répartition F sur les 51 clés B : **R = 11** · **L = 9** · **– = 31**.
Répartition M sur ses 22 informations : appariées à une clé B servie = **19** ; non appariées = **3**.
Sur ces 19 : **11 affichées** · **8 non affichées** (M8, M9, M14, M16, M21 + les trois bandes glissées).

---

## Annexes

### 1. Routes du domaine — compte et ancres

Balayage des **148** `*.controller.ts` (oracle Python, `mesures/18-routes-domaine.txt`) : **1029**
décorateurs de route, **169** sous `JwtAuthGuard`, dont **36** dans le domaine de cet écran
(hors `_test`/`admin`). Les **8** que le front connaît : `auth/signup`, `auth/signin`, `session/open`,
`world/districts`, `i18n/bundle`, `city/district/:id/interior`, `city/district/:id/heat`,
`economy/wallet` (+ `me`). Les **28 autres** — dont `me/buildings`, `operational/building/:id`,
`operational/dealers`, les 3 lectures de blanchiment, et les 8 autres projections
`city/district/:id/*` — ne sont appelées par aucun fichier de l'archive.

### 2. Corps réels

`mesures/01`…`17` + `mesures/00-COMMANDES.md` (commande exacte pour chaque fichier).

### 3. Valeurs possibles par clé

Chaque valeur ci-dessus est lue à **sa** source (union TS ou `pgEnum`), citée en colonne « valeurs
possibles ». Aucune n'est recopiée d'un design.

### 4. Inventaire M

M1 solde · M2 ratio propre/sale · M3 chaleur en % + arc + aiguille · M4 libellé de chaleur ·
M5 chrome chaud/descente · M6 jour + moment · M7 heure · M8 bandeau d'alerte · M9 gyrophare ·
M10 floater « + $320 » · M11 fond jour/nuit · M12 nom du bâtiment · M13 type/rôle · M14 « à collecter » ·
M15 « revenus » · M16 « heat local » · M17 COLLECTER · M18 BLANCHIR · M19 AMÉLIORER · M20 dock ·
M21 pastille or (Famille) · M22 « néon allumé = ça rapporte ». Source : `/home/erutheone/project/atelier3d-mafia/hud-brennar.html`
(lignes 59-60, 82-85, 88-104, 107-117, 156-204, 210-229 ; base64 retiré pour la lecture).

### 5. Inventaire F

Voir la colonne F de la table (chaque site porte son `fichier:ligne`). Comptages faits sur motif nu
(sans point ni frontière de mot) pour ne pas rater un alias C#, avec contrôles positifs
(`OwnershipBadge` → 1 fichier, `ficheSortie` → 1 fichier) et un contrôle négatif sur la classe
« bandeau éphémère » (`Banniere`/`Toast`/`Alerte`/`Ephemere` → **0**).

### 6. Ce que je n'ai PAS pu vérifier

1. **Le compte de démo** (17 bâtiments / district 16 / 11 pastilles / 314 cartes) — interdit par le
   dossier. **La mesure qui tranche, en une commande** : `GET /v1/me/buildings` avec le jeton de
   `operational_demo`, groupé par `district_id`, comparé à `len(buildings)` de
   `GET /v1/city/district/16/interior`. Tant qu'elle n'est pas faite, « 11 pour 17 » reste **DÉDUIT**.
2. **Le SHA du back dans l'image** — aucune route ne l'imprime. `main` = `b1d61f01` (mesuré) ;
   l'image est **DÉDUITE** ≥ `3117f159`.
3. **`MafiaCleanCity.I18n.Libelle.De` et `I18nCatalog.Traduire`** — hors de l'archive
   (`front-d5ddc40/` ne porte que `CityMap/` et `Shell/`). Je ne peux donc pas dire quelle clé
   `Libelle.De("district","type_batiment","Laboratoire")` construit, ni ce qu'un paramètre manquant
   rend. ⚠️ **Observation liée, mesurée sur le bundle servi** (`09-i18n-bundle-fr.json`) : il porte
   **DEUX familles de libellés pour les mêmes 12 types**, et elles ne disent pas la même chose —
   `district.type_batiment.lab` = « Labo » vs `.laboratoire` = « Laboratoire » ·
   `.stash` = « Réserve » vs `.cache` = « Cache » · `.front_shop` = « Boutique-écran » vs
   `.commerce_ecran` = « Commerce-écran » · `.cash_safehouse` = « Planque à liquide » vs
   `.planque` = « Planque » · `.distribution_hub` = « Plateforme de distribution » vs `.relais` =
   « Relais ». Laquelle le front tire dépend de `Libelle.De`, que je ne peux pas lire.
4. **La carte d'ancrage** (`parcelles[]` du JSON de fond) n'est pas dans l'archive. Je ne peux donc
   pas exclure qu'un bloc porteur d'un bâtiment n'ait **aucune ancre** : le repli est alors la grille
   déterministe `(x·100, −y·100)` (`DistrictInteriorScreenController.cs:756`), qui peut poser un
   marqueur hors du cadre visible. **C'est un 4ᵉ mécanisme candidat pour « 11 < 17 »**, et il se
   tranche en comptant les entrées de `parcelles` du fond `verge` contre les `blocks[]` du district 16
   (40, mesurés).
5. **Le rendu** : aucune capture prise (interdit). Je n'ai ni confirmé ni infirmé « 9 pastilles
   bit-identiques » — j'ai établi le **mécanisme** qui le produit (Q2 / D7).
6. **`harvest_band` / `relance_band` en conditions riches** : je n'ai mesuré que `NOTHING`,
   `RELAUNCHABLE` et `NOT_APPLICABLE`. `AVAILABLE`, `FULL` et `RUNNING` sont lues à la source
   (`capacity-guard.service.ts:35`, `district-interior.projection.service.ts:76`), pas observées.
7. **Les 11 actions joueur sans CTA** : j'ai vérifié leur existence et leur garde, pas qu'elles
   réussissent (une seule mutation autorisée, dépensée sur BLANCHIR).
