# Juge données ⊥ — écran ① « HUD de Brennar » / intérieur de district — mode MAQUETTE — 2026-08-25

## En une phrase

Sur **96 informations distinctes** que les 10 routes joueur de cet écran renvoient réellement
(130 chemins de clés, mesurés sur compte frais), la maquette en montre **11** — plus une 12ᵉ que
porte le scoping de la requête, pas une clé ; elle dessine en
plus **7 informations qui n'ont aucune source projetée** — dont **4 existent en base et ne sont
pas projetées** (forme F : lot back) et **2 sont dessinées en unité continue là où le back ne
sert que des bandes** (arbitrage R2.2) ; et **1 information structurante manque partout** — rien
ne dit au client **quel district ouvrir**.

⇒ **7 écarts à consigner · 20 questions « passé à côté ? » · 5 lots back suggérés.**

---

## Écarts à consigner (mode maquette : B/M seulement)

| # | information | B | M | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|
| **E1** | **l'heure en jeu « 21:40 »** | – | M09 | **dessiné sans source — forme F, lot back** | `city_sim_clock.game_minute` existe (`db/schema/city_sim_clock.ts:15`) et est **lu par la route même** : `district-interior.controller.ts:106-108` déstructure `{ gameMinute, currentGameDay }`, `:135` n'émet que `day_phase: this.dayPhase(gameMinute)` — les deux scalaires sont **jetés**. Balayage : 0 occurrence de `game_minute` dans un contrôleur **non-`_test`/non-admin** (contrôle positif : `day_phase` rend 7 hits dans le contrôleur qui le projette) |
| **E2** | **le district affiché est « le mien »** | – | M27 | **dessiné sans source — aucune route ne le dit** | `player` n'a **aucune** colonne de district (`db/schema/player.ts:24-56`, 15 colonnes lues) ; `session/open` rend **12 clés**, aucune n'est un district (`mesures/02-session-open.json`) ; `world/districts` n'est **pas** scopé joueur (route **sans `@UseGuards`**, `world.controller.ts:39`, HTTP 200 sans token — mesuré). J'ai dû **balayer les 18 districts** pour trouver que le kit de départ vit en **d16 / Verge-A** (`mesures/_int_*.json` : 17 districts à `buildings=0`, d16 à `buildings=4`) |
| **E3** | **le nom du lieutenant « Sal »** | B⁻ | M13 | **en base, non projeté — forme F, lot back** | `lieutenant.name varchar(64) NOT NULL` (`db/schema/lieutenant.ts:91`) ; `GET /v1/lieutenants` rend **5 clés** par lieutenant, aucune n'est le nom (`mesures/07-lieutenants.json`). ★ **Et la valeur est un bouche-trou** : les 2 lieutenants du kit de départ s'appellent tous deux **littéralement `Lieutenant`**, même `role_id=1`, même `archetype: COOK` — **indiscernables** (`mesures/08-lieutenant-names.txt`) |
| **E4** | **le nom du bâtiment « LE VERGE D'OR »** (néon toit + façade, dans l'art) | – | M23 | **dessiné sans source — aucune colonne de nom** | `buildings` a **12 colonnes** et **aucune** n'est un nom (`db/schema/city_state.ts:143-172`) ; la route `interior` rend `building` = un **UUID opaque** (`mesures/05-interior-d16.json`) |
| **E5** | **le fil propre/sale sous le solde (68 %)** | – | M03 | **dessiné sans source — et le terme « sale » n'a AUCUN écrivain** | Le wallet rend **3 clés** : `player_id`, `cash_cents`, `wallet_band` (`mesures/04-wallet.json`) — aucun ratio. Le seul autre pool cash bâtiment, `money_holding.held_cents`, est documenté **« un POOL unique de cash CLEAN »** (`db/schema/operational_chain.ts:488`) — donc pas le terme sale. Le terme sale vit dans `safehouses` : **0 écrivain applicatif** dans `src/` (contrôle positif : `money_holding` en a **4**), 11 dans du SQL brut de spec — **TD-358, chaîne morte** |
| **E6** | **le manomètre en pourcentage (37 % / 78 % / 96 %) et l'aiguille sur un arc continu** | ● (bande) | M04+M05 | **écart d'UNITÉ à consigner — arbitrage R2.2** | Le back ne sert **que** des bandes à 4 crans : `HeatBucket = 'COLD' \| 'WARM' \| 'HOT' \| 'BURNING'` (`citysim/events/city-event-bus.ts:484`), seuils 0,2 / 0,5 / 0,8 **constantes de code non exposées** (`citysim/heat/heat-tunables.ts:89-91`), et la projection dit verbatim que le float **ne quitte pas la méthode** (`heat.projection.service.ts:82`). Mesuré : `district_bucket: "COLD"` (`mesures/06-heat-d16.txt`). **4 crans dessinés en continu** |
| **E7** | **le montant flottant « + $320 »** | ● (bande) | M17 | **écart d'UNITÉ à consigner — arbitrage R2.2** | `money_holding.held_cents` est déclaré **BO-only, JAMAIS surfacé raw client, projeté en bandes** (`db/schema/operational_chain.ts:495`) ; la seule surface joueur est `held_band: 'NONE'\|'LOW'\|'MODERATE'\|'HIGH'\|'MASSIVE'` (`money-holding.projection.service.ts:51`), mesurée `"NONE"` (`mesures/10-building-card.json`). ⚠️ Un précédent d'exemption existe (`cash_cents` est explicitement R2.2-exempt, `economy.controller.ts:38-39`) — **c'est un arbitrage produit, pas un oubli** |

### Deux écarts consignés au dossier que je NE confirme PAS tels quels

| dossier | ce que j'ai mesuré |
|---|---|
| « l'heure … seul `opened_game_day` sort de `session/open` » | **Exact**, et un cran plus fin : `opened_game_day` est **estampillé À L'OUVERTURE** (`session.repository.ts:169`), pas relu. Une session qui traverse une frontière de jour affiche un **jour périmé**. Le jour **courant** est calculé par la route `interior` (`currentGameDay`, `district-interior.controller.ts:106`) et **jeté** — donc « Jour 12 » a **deux** sources possibles, une périmable et une non projetée |
| « le manomètre … le back ne sert que des bandes » | **Exact.** Mais le dossier omet que `escalated` (booléen district, `mesures/06-heat-d16.txt`) **est** une source légitime pour le 3ᵉ état « DESCENTE » de la maquette — cet élément-là n'est PAS sans source |

---

## « Passé à côté ? » — pour l'user

20 informations sont disponibles sur les routes de cet écran et **ne sont ni dessinées ni
affichées**. Classées par intérêt joueur décroissant.

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| Q1 | `buildings[].lapse_phase_bucket` — `WITHIN_WINDOW\|SOFT\|HARD\|CRITICAL` (`interior`) | ce bâtiment est en retard d'entretien, et de combien | **Utile ici, et c'est le trou le plus net** : le dossier annonce « alerte si maintenance en retard » comme un état de la scène, et **la maquette ne dessine rien pour ça** alors que la donnée est déjà dans la charge utile | ★★★ |
| Q2 | `buildings[].condition_band` — `SOUND\|DAMAGED\|REPAIRING\|FAILED` (`interior`) | ce bâtiment a été raidé / est en réparation / est mort | **Utile ici** : c'est la seule clé qui exprime le « raid » que la doctrine veut lire dans les fenêtres éteintes — 4 états, la maquette n'en dessine que 2 | ★★★ |
| Q3 | `citywide_bucket` (`heat`) | la chaleur de **toute la ville**, pas seulement du district où tu es | **Utile ici** : le médaillon est présenté comme « la montre de la **ville** » et il n'affiche que le district — un joueur peut être froid ici et brûlant ailleurs sans le voir | ★★★ |
| Q4 | `queue[].severity_band` / `priority_band` / `confidence_band` (`session/open`, `exceptions/queue`) | à quel point ce que ton lieutenant remonte est grave, urgent, et à quel point il en est sûr | **Utile ici** : le bandeau éphémère est **plat** — trois bandes existent pour le hiérarchiser (couleur, ordre, insistance) | ★★ |
| Q5 | `buildings[].lieutenant_ids` (`interior`) | qui tient ce bâtiment | **Utile ici** : c'est le lien direct « la Famille ↔ la ville » que l'écran ne fait pas ; mesuré non vide (2 ids sur le lab) | ★★ |
| Q6 | `district_bucket` **par bâtiment** — `buildings[].heat_bucket` (`heat`) | quel bâtiment précis est chaud | **Utile ici** : la maquette n'a qu'une chaleur globale ; la chaleur **par bâtiment** est ce qui dit *lequel* planquer | ★★ |
| Q7 | `events[].kind` / `channel` / `descriptor_i18n_key` / `recency_band` (`ambient/feed`) | la rumeur du quartier (bagarre au coin, bruit de bar, tram bloqué) et sa fraîcheur | **Utile ici** : mesuré **4 événements réels sur d16** dès le compte frais — c'est exactement le carburant du bandeau éphémère, et la maquette ne s'en sert pas | ★★ |
| Q8 | `marks_balance` (`me/iap/balance`) | ta monnaie premium | **Utile ici si le produit la veut visible** : le canon §8.2 la déclare joueur (`economy.projection.service.ts:17,23`), et la **route wallet la lit puis la JETTE délibérément** (`:101`). L'aile gauche n'a qu'un chiffre | ★★ |
| Q9 | `queue_pressure_band` + `backlog_badge` (`session/open`) | ta file de décisions déborde | **Utile ici** : c'est la source la plus plausible de la pastille du dock, mais elle parle des **exceptions**, pas de « Famille » — à raccorder explicitement | ★★ |
| Q10 | `buildings[].conversion_band` — `NOT_CONVERTED\|IN_SETUP\|OPERATIONAL` (`interior`) | ce bâtiment est acheté mais pas encore monté | **Utile ici** : un chantier en cours est une chose que la ville devrait montrer | ★★ |
| Q11 | `district_load_band` / `district_tail_band` / `any_overflow` (`…/buffer`) | tes stocks saturent dans ce district | **Peut-être** : très riche mais c'est un écran de gestion, pas un HUD | ★ |
| Q12 | `exposure_band` / `network_cleanliness` (`…/throughput`) | ton réseau est repérable / propre | **Peut-être** : c'est *l'autre* jauge de tension, cousine du heat | ★ |
| Q13 | `district_blocking_band` / `any_high_blocking_alert` (`…/stash`) | tes planques bloquent | **Pas ici** : sous-système sans surface dessinée | ★ |
| Q14 | `audit_pin_presence` (`…/unconformity`) | l'audit t'a épinglé | **Pas ici, mais à surveiller** : la chaîne qui l'alimente est morte (TD-358) | ★ |
| Q15 | `backpressure` (`…/flow`) | tes flux refoulent | **Pas ici** | ★ |
| Q16 | `wallet_band` (`wallet`) | ta tranche de richesse | **Pas ici** : redondant avec le montant, qui est déjà affiché | ○ |
| Q17 | `grid.width/height` + `blocks[].x/y` (`interior`) | la forme réelle du district (10×4, 40 blocs pour d16) | **Pas ici tel quel** : c'est la géométrie que l'art remplace ; ⚠️ mais **si la scène doit un jour être construite** et non peinte, c'est LA source | ○ |
| Q18 | `profile` / `bank_side` / `index` / `block_count` (`interior`, `world/districts`) | l'identité du district (verge, rive sud, A, 40 blocs) | **Pas ici** : la maquette n'affiche **même pas le nom du district** (`Verge-A`, mesuré) — c'est plutôt une **question** : le joueur sait-il où il est ? | ★★ |
| Q19 | `structural_budget` / `flag_review` / `settling_glance` / `friction_glance` / `compression_glance` / `onboarding` (`session/open`) | 6 pastilles d'état méta ouvertes à chaque session | **Pas ici** : ce sont des jauges d'écrans de gestion ; les citer pour mémoire | ○ |
| Q20 | `control_state` (`world/districts`) | qui contrôle ce district | ⛔ **À ne PAS afficher tel quel** : la valeur est un **littéral codé en dur** — `control_state: 'UNCONTESTED' as const` (`world-geography.repository.ts:80`). Une clé qui a l'air d'une donnée et n'en est pas | ⚠ |

---

## Lots back suggérés (B⁻ dessiné, ou forme F)

| # | colonne / valeur | table / source | maquette | preuve |
|---|---|---|---|---|
| **L1** | `game_minute` (et `currentGameDay`) — **projeter** sur `…/interior`, à côté de `day_phase` | `city_sim_clock.game_minute` | M09 « 21:40 », M07 « JOUR 12 » | **Forme F canonique** : lu (`district-interior.controller.ts:106-108`), passé au compositeur, **omis par la projection** (`:135`). Le correctif fait **une ligne** |
| **L2** | `name` — **projeter** sur `GET /v1/lieutenants` et sur `…/interior` (`lieutenant_ids` → objets) | `lieutenant.name` | M13 « Sal » | `db/schema/lieutenant.ts:91` (NOT NULL) vs `mesures/07-lieutenants.json` (5 clés, pas de nom) |
| **L3** | **une TABLE DE NOMS de fiction** pour les lieutenants — la colonne existe mais vaut `"Lieutenant"` | `lieutenant.name` (valeur) | M13 | `mesures/08-lieutenant-names.txt` : **2 lieutenants, même nom, même rôle, même archétype**. Projeter L2 sans L3 affiche deux fois « Lieutenant » |
| **L4** | **une TABLE DE NOMS de bâtiments** — la colonne **n'existe pas** | `buildings` (12 colonnes) | M23 « LE VERGE D'OR » | `db/schema/city_state.ts:143-172`. ⚠️ C'est un **ajout de colonne**, pas une projection : plus lourd que L1-L3 |
| **L5** | **le district d'entrée du joueur** — le dire quelque part (clé sur `session/open`, ou route `GET /v1/me/districts`) | aucune source aujourd'hui | M27 | Voir E2. Sans ça, le client **balaie 18 routes** au démarrage pour trouver son propre district |

### Et un défaut de projection à **ne pas** régler par projection

`buildings.structural_state` a **4 membres** — `operational \| damaged \| seized \| demolished`
(`db/schema/city_state.ts:26`) — et `shell_state` en écrase **trois sur quatre** en `STANDING`
(`district-interior.projection.service.ts:175-183`, `case 'seized': return 'STANDING'` à `:180`).
⇒ La doctrine de la maquette (« fenêtres éteintes = raid/**saisie** ») **ne peut pas** lire la
saisie sur cette clé. Le raid est lisible sur `condition_band` (Q2) ; **la saisie n'est lisible
nulle part**. C'est un choix délibéré et documenté du résolveur, pas un oubli — donc **un
arbitrage à trancher**, pas un lot à lancer sans décision.

---

## Actions : routes ↔ CTA

Le bloc `.fiche` (COLLECTER / BLANCHIR / AMÉLIORER) est **exclu** de ce dossier. Restent :

| geste de la maquette | route joueur correspondante | statut |
|---|---|---|
| taper un bâtiment → ouvrir sa fiche | `GET /v1/operational/building/:id` (`real-estate.controller.ts:204`, sous `JwtAuthGuard`) — **23 clés** mesurées (`mesures/10-building-card.json`) | ✔ apparié |
| bandeau « ✉ … — **lire** » | `GET /v1/exceptions/queue` → `POST /v1/exceptions/:id/resolve` (`exceptions.controller.ts:66,109`) ; les `candidate_actions` portent déjà `id` + `label` + `projected_consequence` | ✔ apparié — ⚠️ voir la réserve i18n ci-dessous |
| dock → Empire / Famille / Marché / Plus | navigation, pas de donnée | hors grille |
| bascules 🌙 / 🔥 | échafaudage de démo | hors produit |
| — | `POST /v1/ambient/attend/:id` (`ambient.controller.ts:76`) : **une action joueur sur les événements d'ambiance, sans aucun CTA dessiné** | **route sans CTA — question** |
| — | `POST /v1/city/inspection/report` (`inspection.controller.ts:115`) : déposer un faux rapport, **sans CTA dessiné** | **route sans CTA — question** |

⚠️ **Réserve i18n sur les actions du bandeau** : les libellés mesurés sont de l'**anglais brut**,
pas des clés — `"label": "Acknowledge the lab status"`, `"projected_consequence": "You note it;
no automatic action is taken."` (`mesures/12-exceptions-queue.json`). Le voisin `ambient/feed`,
lui, sert bien `descriptor_i18n_key: "ambient.micro_event.corner_fight"`. **Deux conventions
coexistent sur le même écran** — c'est exactement le périmètre du lot 0 (« libellés en clés i18n
partout »), et ça concerne cet écran-ci.

---

## Table de couverture complète

**Comptes** (oracle : `mesures/99-B-keyset.txt`, script inclus dans le fichier) :

- `|B|` = **96** informations distinctes (dédupliquées par nom de feuille) sur **130 chemins de
  clés**, réparties sur **10 routes de lecture** — dont **16 conteneurs** (`queue`, `buildings`,
  `blocks`, `grid`, `events`, `districts`, `lieutenants`, `exceptions`, `flag_review`,
  `settling_glance`, `friction_glance`, `compression_glance`, `structural_budget`, `onboarding`,
  `candidate_actions`, `suggested_action`) qui ne portent pas de valeur propre ;
- `|M|` = **28** éléments porteurs d'information dans la maquette, dont **4** hors grille (libellé
  statique « ARGENT », 2 éléments de navigation du dock, bascules de démo) ;
- `|M non apparié|` = **7** (M03, M09, M13, M17, M18, M23, M27) ;
- `|F sans source|` = **n/a** (mode maquette) ;
- **somme = 96 (clés B) + 7 (éléments M sans aucune source) + 1 (M19, apparié à une PROPRIÉTÉ DE
  REQUÊTE et non à une clé) = 104 informations.**

> ⚠️ **Auto-audit du compte** : la table des appariées ci-dessous porte **13 lignes** pour
> **12 informations** — `day_phase` y apparaît **deux fois** (le libellé « SOIRÉE » et le fond
> d'art), gardées séparées pour la lisibilité. Oracle de vérification, rejouable :
> `python3` sur `mesures/99-B-keyset.txt` → `|B| = 96 · dessinées = 11 · non dessinées = 85 ·
> conteneurs = 16 (dont 1, candidate_actions, EST dessiné)`.

### Lignes appariées ● ● (l'information est dessinée ET disponible) — 13 lignes / 12 informations

**11 clés B sur 96 sont dessinées** (oracle : voir ci-dessous) ; la 12ᵉ ligne (« ce bâtiment est
à moi ») n'est pas portée par une clé mais par le **scoping de la requête**.

| ligne | information | clé B (route) | élément M | statut |
|---|---|---|---|---|
| 1 | le solde | `cash_cents` (`wallet`) — `"1000000"` mesuré | M02 « $ 24 850 » | ✔ |
| 2 | le niveau de chaleur du district | `district_bucket` (`heat`) — `"COLD"` | M04 aiguille, M05 « 37 % », M10 filet laiton→braise, M11 boîtier+pouls | ⚠ **unité** (E6) |
| 3 | l'escalade policière | `escalated` (`heat`) — `false` | M06 « DESCENTE », M16 bandeaux états 2/3 | ✔ |
| 4 | le jour en cours | `opened_game_day` (`session/open`) — `1` | M07 « JOUR 12 » | ⚠ **périmable** (estampillé à l'ouverture) |
| 5 | la phase du jour | `day_phase` (`interior`) — `"DAWN"`, 4 membres | M08 « SOIRÉE » | ⚠ **4 phases → 2 libellés** dans la maquette |
| 6 | jour ou nuit dans l'art | `day_phase` (`interior`) | M12 `#fond-jour` / `#fond-nuit` | ⚠ **4 phases → 2 fonds** |
| 7 | la nature de l'événement remonté | `queue[].event_descriptor` — `"onboarding.preseed_exception.card"` | M14 « a un rapport du soir » | ✔ |
| 8 | l'action offerte sur l'événement | `queue[].candidate_actions[]` (2 actions mesurées) | M15 « lire » | ⚠ **libellés en anglais brut** |
| 9 | ce bâtiment est à moi | requête scopée `player_id` (`district-interior.repository.ts:140`) — la route ne rend **que** les miens | M19 fenêtres ambre | ✔ (par construction) |
| 10 | ce bâtiment a été raidé | `buildings[].condition_band` — `"SOUND"` | M20 fenêtres éteintes | ⚠ **partiel** : `seized` non exprimable (voir ci-dessus) |
| 11 | ce bâtiment rapporte | `buildings[].revenue_band` — `"IDLE"` | M21 néon allumé | ⚠ mesuré `IDLE` **sur les 4 bâtiments** — voir « non vérifié » |
| 12 | ce bâtiment travaille | `buildings[].activity_band` — `"IDLE"` | M22 fumée | ⚠ idem |
| 12-bis | quelque chose t'attend | `backlog_badge` (`session/open`) — `false` | M26 pastille or sur « Famille » | ⚠ **rattachement à arbitrer** : la clé parle des exceptions, la pastille dit « Famille » |

### Lignes ● – – (disponible, ni dessiné) — 85

Les **20** à plus fort intérêt sont détaillées dans « Passé à côté ? » ci-dessus (Q1→Q20). Les
**64** restantes sont de la plomberie ou du hors-écran ; l'inventaire exhaustif, clé par clé avec
sa route et son chemin, est dans **`mesures/99-B-keyset.txt`**. Répartition :

| famille | compte | commentaire |
|---|---|---|
| **conteneurs sans valeur propre** | **15** | `queue`, `buildings`, `blocks`, `grid`, `events`, `districts`, `lieutenants`, `exceptions`, `flag_review`, `settling_glance`, `friction_glance`, `compression_glance`, `structural_budget`, `onboarding`, `suggested_action` (le 16ᵉ, `candidate_actions`, EST dessiné → il est dans les 11) |
| **informations réelles non dessinées** | **70** | dont les 20 de « Passé à côté ? » ; les 50 autres sont de la plomberie d'identité (`session_id`, `account_id`, `player_id`, `handle`, `email`, `lifecycle_state`, `locale`, `limit`, `offset`, `total`, `id`, `source`), les 14 sous-clés des 6 jauges méta de `session/open`, la géométrie (`blocks[].x/y`, `grid.*`, `block_count`, `index`), et les sous-clés d'exception/ambiance |
| **total non dessiné** | **85** | 15 + 70 |

### Lignes – ● (dessiné sans source) — 7

E1 (M09 heure) · E2 (M27 mon district) · E3 (M13 nom du lieutenant, **B⁻**) · E4 (M23 nom du
bâtiment) · E5 (M03 ratio propre/sale) · E7 (M17 « + $320 », **B⁻ en bande**) · **M18 le
gyrophare du flic en planque** — détaillé ci-dessous.

**M18 mérite sa propre ligne** : la source plausible est `patrol_heat` sur
`GET /v1/city/precinct/:id/patrol` (`patrol.projection.service.ts:39-43`) — mais **rien ne
donne le precinct d'un district**. `world_geography.ts` (`districts` 7 colonnes, `blocks` 4
colonnes, lignes 30-70) **ne porte aucun `precinct_id`** ; les seules tables qui en ont un sont
`precinct_memory` / `police_belief` (`db/schema/city_state.ts:67,100`), keyées `(player_id,
precinct_id)` **sans lien au district**. Mesuré : `GET /v1/city/precinct/1/patrol` →
**404 « No patrol queue for this player yet »** sur compte frais. ⇒ Le gyrophare est **dessiné,
et sa donnée n'est pas adressable depuis un écran de district**.

---

## Annexes

### 1. Routes du domaine — le compte

**Balayage** : `find services/game-back/src -name '*.controller.ts'` → **144 contrôleurs**.
Les contrôleurs `citysim/**` non-`_test`/non-admin : **15**. Complété par un grep du mot du
domaine (`district`, `building`, `wallet`, `cash`, `heat`, `game_minute`, `day_phase`) sur
**tous** les contrôleurs — ce qui a ajouté `economy/`, `session/`, `auth/`, `onboarding/`,
`operational/{ambient,lieutenant,real_estate,exceptions,money_holding,laundering,selling,reputation}`.

**Routes joueur de lecture retenues pour cet écran (10)** — toutes mesurées :

| route | ancre | guard | clés mesurées |
|---|---|---|---|
| `POST /v1/session/open` | `session.controller.ts:56` | ✅ | 42 chemins / 12 top |
| `GET /v1/me` | `auth.controller.ts:343` | ✅ | 5 |
| `GET /v1/economy/wallet` | `economy.controller.ts:43` | ✅ | 3 |
| `GET /v1/city/district/:id/interior` | `district-interior.controller.ts:87` | ✅ | 26 chemins / 9 top + 12 par bâtiment |
| `GET /v1/city/district/:id/heat` | `heat.controller.ts:51` | ✅ | 7 |
| `GET /v1/world/districts` | `world.controller.ts:39` | ⛔ **AUCUN** | 8 |
| `GET /v1/exceptions/queue` | `exceptions.controller.ts:66` | ✅ | 22 |
| `GET /v1/ambient/feed` | `ambient.controller.ts:52` | ✅ | 10 |
| `GET /v1/lieutenants` | `lieutenant.controller.ts:317` | ✅ | 6 |
| `GET /v1/me/iap/balance` | `iap.controller.ts:82` | ✅ | 1 |

**Les 8 autres feuilles de district** (mesurées, hors table de couverture principale car aucune
n'est dessinée) : `flow` (2 clés), `stash` (4), `leks` (2), `throughput` (4), `unconformity` (3),
`buffer` (6), `cohesion` (**404** sur compte frais), `inspection` (**404** sur compte frais).
Plus `city/precinct/:id/patrol` (**404**) et `city/precinct/:id/belief`, `city/citizens/whisper`.

⚠️ **Observation d'authz, hors mandat mais mesurée** : `GET /v1/world/districts` et
`GET /v1/world/threnny-edges` (`world.controller.ts:39,50`) n'ont **aucun `@UseGuards`** —
vérifié : **HTTP 200 sans token**, contre **401** pour `…/interior` et `…/wallet`. Le docstring
l'assume (« la géographie est publique, le fog-of-war porte sur ce qui ARRIVE dans la ville »).
Je le **constate**, je ne le classe pas.

### 2. Corps réels — `mesures/`

| fichier | contenu |
|---|---|
| `00-compte.txt`, `01-signup.json` | le compte frais (`jd-1787683646`), `POST /v1/auth/signup` avec `Idempotency-Key` |
| `02-session-open.json` | `POST /v1/session/open` — **12 clés** |
| `03-me.json`, `04-wallet.json`, `14-iap-balance.json` | identité, argent, marks |
| `05-interior-d16.json` | la charge utile de la scène — 40 blocs, 4 bâtiments |
| `_int_1.json` … `_int_18.json` | le balayage des 18 districts (preuve de E2) |
| `06-*-d16.txt` | les 9 feuilles de district, code HTTP inclus |
| `07-lieutenants.json`, `15-lieutenant-detail.json`, `08-lieutenant-names.txt` | la Famille : projection, détail, **et la lecture SQL des noms** |
| `09-ambient-feed.json`, `12-exceptions-queue.json`, `13-tutorial-state.json` | les deux sources du bandeau éphémère |
| `10-building-card.json` | la fiche bâtiment (23 clés) — pour la frontière avec le dossier `fiche-batiment` |
| `16-reputation.json` | `GET /v1/me/reputation` — voir l'arbitrage ③ ci-dessous |
| `_probe.json` | `GET /v1/world/districts` — les 18 districts (route **sans guard**) |
| `docker-ps.txt` | l'état de la stack au moment des mesures (7 conteneurs, aucun gate en cours) |
| `99-B-keyset.txt` | **l'oracle de comptage** : script + les 130 chemins + les 96 feuilles |

**Protocole de mesure** — ⛔ piège attrapé en cours de route : `curl` **nu** est proxifié, et la
couche d'affichage **remplace le JSON par un SCHÉMA** (`{payload: {data: {districts: [{...}] (18)}}}`)
**y compris à travers une redirection `>`**. `json.load` échoue dessus. **Toutes** les mesures de
ce rapport passent par `rtk proxy curl … > fichier`, relu par `python3 -m json.tool`.

### 3. Valeurs possibles par clé — avec la contrainte source

| clé | domaine | source de la contrainte |
|---|---|---|
| `heat_bucket`, `district_bucket`, `citywide_bucket` | `COLD \| WARM \| HOT \| BURNING` | `citysim/events/city-event-bus.ts:484` (seuils 0,2/0,5/0,8 — `heat-tunables.ts:89-91`) |
| `day_phase` | `DAWN \| DAY \| DUSK \| NIGHT` | `district-interior.controller.ts:51` + résolveur exhaustif `:161-174` |
| `shell_state` | `STANDING \| GONE` | `district-interior.projection.service.ts:39` — **écrase** `structural_state` à 4 membres (`db/schema/city_state.ts:26`) |
| `condition_band` | `SOUND \| DAMAGED \| REPAIRING \| FAILED` | `district-interior.projection.service.ts:42` |
| `conversion_band` | `NOT_CONVERTED \| IN_SETUP \| OPERATIONAL` | `real-estate.projection.service.ts:79` |
| `revenue_band` | `IDLE \| EARNING` | `district-interior.projection.service.ts:48` |
| `revenue_chain` | `WIRED \| UNWIRED` | `:45` — **`WIRED` seulement pour `money_holding` et `dealer_spot_front`** (`:214-240`) |
| `activity_band` | `IDLE \| ACTIVE` | `:51` |
| `lapse_phase_bucket` | `WITHIN_WINDOW \| SOFT \| HARD \| CRITICAL` | `real-estate.projection.service.ts:114` |
| `wallet_band` | `BROKE \| LOW \| MODERATE \| HIGH \| FLUSH` | `economy.projection.service.ts:46` |
| `held_band` | `NONE \| LOW \| MODERATE \| HIGH \| MASSIVE` | `money-holding.projection.service.ts:51` |
| `operational_type` | 12 membres + `''` | résolveur exhaustif à 13 branches, `district-interior.projection.service.ts:214-240` |
| `control_state` | **littéral `'UNCONTESTED'`** | `world-geography.repository.ts:80` — **pas un domaine, une constante** |
| `cash_cents` | chaîne d'un `bigint` | `db/schema/player_economy_state.ts:22` ; R2.2-exempt assumé `economy.controller.ts:38-39` |
| `opened_game_day` | entier ≥ 0, **figé à l'ouverture** | `db/schema/sessions_and_audit.ts:54` ; écrit `session.repository.ts:169` |

### 4. Inventaire M — 28 éléments

| id | élément (source) | représente | apparié à |
|---|---|---|---|
| M01 | `.aile.gauche .lib` « Argent » (`:156`) | libellé statique | *hors grille* |
| M02 | `.aile.gauche .val` « $ 24 850 » (`:156`) | le solde | `cash_cents` |
| M03 | `.ratio i {width:68%}` (`:157`) | part propre / sale | **rien** (E5) |
| M04 | `#aiguille` `rotate(-42\|34\|52)` (`:163-164`, `:249`) | position de la chaleur sur un arc à 3 zones | `district_bucket` ⚠ unité |
| M05 | `#heatval` « 37% / 78% / 96% » (`:167`, `:254`) | pourcentage de chaleur | `district_bucket` ⚠ unité |
| M06 | `#heatlib` « Heat / Descente » (`:168`, `:255`) | l'état d'escalade | `escalated` |
| M07 | `.aile.droite .lib` « Jour 12 » (`:169`) | le numéro de jour | `opened_game_day` ⚠ |
| M08 | `.aile.droite .lib` « Soirée » (`:169`, `:247`) | la phase du jour | `day_phase` ⚠ 4→2 |
| M09 | `#heure` « 21:40 / 14:10 » (`:169`, `:246`) | l'heure en jeu | **rien** (E1) |
| M10 | `.tel.chaud .barre::after` → braise (`:31`) | la chaleur relayée par le chrome | `district_bucket` |
| M11 | `.tel.chaud/.descente .medaillon .boitier` + `@keyframes pouls` (`:65-70`) | la chaleur / l'escalade relayées par le chrome | `district_bucket`, `escalated` |
| M12 | `#fond-jour` / `#fond-nuit` (`:149-150`, `:22`) | jour ou nuit dans l'art | `day_phase` ⚠ 4→2 |
| M13 | `#alerte` « ✉ **Sal** … » (`:176`) | le **nom** d'un lieutenant | **B⁻** (E3) |
| M14 | `#alerte` « a un rapport du soir » (`:176`) | la nature de l'événement | `event_descriptor` |
| M15 | `#alerte` « **lire** » (`:176`) | l'action offerte | `candidate_actions[]` ⚠ i18n |
| M16 | `#alerte` états 2/3 (`:258-259`) | la montée de pression policière | `escalated`, `heat_bucket` |
| M17 | `.floater` « + $320 » (`:179`) | un montant qui monte d'un bâtiment | **B⁻ en bande** (E7) |
| M18 | `.gyro` (`:72-76`) | le gyrophare du flic en planque | **rien d'adressable** |
| M19 | l'art : fenêtres ambre — ⚠ **claim du `dossier.md:8`, PAS écrit dans la maquette** | bâtiment possédé | scoping `player_id` |
| M20 | l'art : fenêtres éteintes — ⚠ **claim du `dossier.md:8`** | bâtiment raidé / **saisi** | `condition_band` ⚠ partiel |
| M21 | l'art : néon allumé (annexe `:223`) | ça rapporte | `revenue_band` |
| M22 | l'art : fumée — ⚠ **claim du `dossier.md:8`** | activité en cours | `activity_band` |
| M23 | l'art : néon « LE VERGE D'OR » (toit + façade) | le **nom** du bâtiment | **rien** (E4) |
| M24 | `.dockb` ×4 Empire/Famille/Marché/Plus (`:198-201`) | navigation | *hors grille* |
| M25 | `.dockb.actif .pointe` (`:116`) | l'onglet courant | *hors grille* (état client) |
| M26 | `.dockb small.disc` sur Famille (`:117`, `:199`) | quelque chose t'attend | `backlog_badge` ⚠ rattachement |
| M27 | la scène entière | **ce district est le tien** | **rien** (E2) |
| M28 | `#bascule` 🌙 / `#chaudb` 🔥 (`:180-181`) | commandes de démo | *hors produit* |

*(les numéros de ligne renvoient à `hud-brennar.html` lu via `awk 'length($0)<4000'` — les deux
data-URI de fond sont aux lignes 149-150.)*

### 5. Les 3 arbitrages du pied de maquette — ce que la MESURE en dit

Le dossier demande de les traiter comme du dessiné, pas comme des décisions. Je ne tranche pas ;
je verse au dossier ce que la donnée impose.

| arbitrage | ce que la mesure dit |
|---|---|
| ① le médaillon porte l'**horloge** ou le **heat** ? | Les deux sont **non projetés dans l'unité dessinée** : l'heure n'existe sur **aucune** route joueur (E1), le heat n'existe **qu'en 4 crans** (E6). ⇒ **Aucune des deux options n'est gratuite** ; « horloge » demande L1 (une ligne), « heat » demande de renoncer au pourcentage |
| ② dock **4 boutons** ou **tiroir** ? | Sans objet côté données — aucune clé n'en dépend |
| ③ le **respect/influence** entre-t-il dans la barre ? | ⛔ **Il n'existe pas comme grandeur joueur.** `GET /v1/me/reputation` **exige un `lieutenant_id`** (mesuré : sans lui, 404 « lieutenant_id is required ») et rend `boss_mirror` + `hidden_curriculum` — des **tells qualitatifs par lieutenant** (`portrait_posture: "attentive"`, `consistency_cue: "indeterminate"`, `uniform_tells`), jamais un score. Et la colonne qui y ressemble, `economy_states.reputation_legacy`, est marquée **« LEGACY BO-only strict — NEVER surface joueur »** (`db/schema/player_economy_state.ts:27-29`). ⇒ **Mettre « respect » dans la barre demanderait d'inventer la grandeur**, pas de la projeter |

### 6. Ce que je n'ai PAS pu vérifier

1. **Les états non-neutres de la scène.** Sur compte frais, les 4 bâtiments rendent tous
   `revenue_band: IDLE`, `activity_band: IDLE`, `condition_band: SOUND`,
   `lapse_phase_bucket: WITHIN_WINDOW`, `heat_bucket: COLD`. ⇒ **J'ai mesuré le DOMAINE des clés
   (dans le code, résolveurs exhaustifs), jamais les VALEURS non-neutres en vie.** Un état
   « néon allumé » / « fumée » / « fenêtre éteinte » n'a **jamais été observé**. La mesure qui
   trancherait : lancer une cuisson (`lab` + `cook_session`) et un tick, puis re-mesurer — je ne
   l'ai pas fait pour ne pas muter d'état.
2. **`revenue_chain: UNWIRED` sur les 4 bâtiments** — y compris `front_shop` et `cash_safehouse`.
   Le résolveur le documente comme **structurel** (« leur source, `safehouses` /
   `transaction_profile`, a ZÉRO écrivain de production — TD-358 »,
   `district-interior.projection.service.ts:206-212`). J'ai **confirmé le zéro** (0 écrivain
   `insert(safehouse` dans `src/`, contrôle positif : 4 pour `money_holding`) mais **je n'ai pas
   énuméré tous les chemins d'écriture possibles** (SQL brut, triggers de migration).
3. **`cohesion`, `inspection`, `patrol`** rendent **404 sur compte frais** (« le city-sim n'a pas
   tické »). Leurs clés viennent donc du **code**, pas d'un corps mesuré — je les ai marquées
   comme telles dans l'annexe 1. Je ne peux pas dire si leurs corps réels portent d'autres clés.
4. **Le mapping district → precinct** : j'ai cherché dans `world_geography.ts` et par grep
   `precinct` sur les schémas (2 hits, tous deux `(player_id, precinct_id)` sans district).
   **Je n'ai pas prouvé qu'il n'existe nulle part** — seulement qu'il n'est ni dans la géographie
   ni sur une route joueur mesurée.
5. **Le fond de la maquette est un rendu Blender statique** (2 data-URI PNG, lignes 149-150).
   Les états lumineux M19-M23 sont donc **peints**, pas pilotés. Je n'ai **aucun moyen de
   vérifier** que le futur écran Unity saura les rendre depuis les bandes — ma table dit
   seulement que la donnée existe pour les alimenter.
6. **`hl_card: null`** sur compte frais : je n'ai pas pu établir la **forme** de cette clé quand
   elle est peuplée (c'est peut-être une source pour le bandeau).
7. **Je n'ai pas mesuré** `GET /v1/city/precinct/:id/belief`, `GET /v1/city/citizens/whisper`,
   `GET /v1/world/threnny-edges`, ni les routes `laundering` (qui exigent un `nodeId` que rien
   ne fournit sur compte frais).
8. ⚠️ **TROIS des quatre états lumineux de la scène ne sont PAS dans la maquette.** Le seul que
   le fichier `hud-brennar.html` écrit est « **néon allumé = ça rapporte** » (annexe 4, ligne
   223). « fenêtres ambre = possédé », « éteintes = raid/saisie » et « fumée si activité »
   viennent du **`dossier.md:8`**, pas de la maquette. ⇒ Je les ai comptés en M (M19, M20, M22)
   **parce que le dossier les pose comme dessinés**, mais un constructeur qui ne lit que la
   maquette n'a **aucune instruction** pour les implémenter — et le rendu de fond étant peint,
   rien dans l'artefact ne les prouve. **C'est un écart de dossier, pas un écart de données** :
   si ces trois états sont voulus, ils doivent entrer dans la maquette avant sa ratification ;
   les clés qui les alimentent (`condition_band`, `activity_band`, le scoping `player_id`)
   existent et sont mesurées.
