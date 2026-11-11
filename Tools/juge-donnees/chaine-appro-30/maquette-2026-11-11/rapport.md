# Juge données ⊥ — ㉚ « La chaîne vue du graphe » — maquette — 2026-11-11

## Verdict : **NON** (ratifiable après correction de 3 écarts dessinés que la mesure CONTREDIT)

Contrôle d'arithmétique (script `mesures/controle-arithmetique.py`, `RC=0`, clés relues du corps
mesuré et non du rapport) : **|clés B| = 19** · **|éléments M non appariés| = 10** · **|F sans
source| = 0** (mode maquette) · **somme = 19 + 10 + 0 = 29 = nombre de lignes de la table**.

## En une phrase

L'écran dessine **10 des 19 clés** que `GET /v1/supply-chain/graph` sert (9 clés disponibles non
dessinées, dont les 8 de `routes`), il ne porte **aucun scalaire en dur** (mesuré : 0 chiffre dans
le corps du panneau — le mur R2.2 tient des deux côtés), et ses 8 mots d'état sont les 8 mots
ratifiés **à l'octet** ; mais il dessine **3 informations sans source**, dont **2 que la mesure
contredit** (la flèche de refoulement corrélée à la couleur ; le cardinal 4/4) — et l'un des deux
écarts assumés du dossier repose sur une **prémisse fausse** (le nom de bâtiment **est** servi).

## Défauts / Écarts à consigner (maquette)

| # | information | B | M | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|
| **E1** | **« un maillon chaud refoule vers un autre »** — la maquette met « ↳ refoule vers … » sur **3/3** des maillons non verts (nœud 1 vert = sans flèche ; nœuds 2/3/4 colorés = avec flèche) | `nodes[].has_arrow` servi, mais **décorrélé de `bucket`** | ● | **dessiné sans source — modèle CONTREDIT** | M : `mesures/cadre30-indente.html:39-84` (4 nœuds, `gr30-fl` sur 3 — mesuré `fleches_refoule = 3`). B : `mesures/graph-dim2.json` — **3 nœuds `warm`, `has_arrow` vrai sur 1 seul** ; les 2 autres sont la CAUSE (`mesures/raw-nodes.json` : `isBlockedOutput: true`, `arrowToBuildingId: null`). Dérivation : `supply-chain-graph.service.ts:115` `hasArrow: n.arrowToBuildingId != null` — rien ne la lie à la bande |
| **E2** | **le cardinal dessiné : 4 maillons, 4 liaisons** | `nodes`/`legs` sans limite ni pagination | ● | **dessiné sans source — CONTREDIT dès le compte frais** | M : `mesures/cadre30-source.html` — mesuré `noeuds = 4`, `liaisons_gr30_l = 4` ; boîte `height:462px` + `.appr6 .abody{…overflow:hidden}` (maquette l.4534) ⇒ **aucun défilement**. B : `mesures/graph-frais.json` — **5 maillons sur un compte NEUF** ; aucun `limit`/`offset`/pagination (`supply-node-pressure.repository.ts:278-284` et `leg.repository.ts:424-448` : `SELECT … WHERE player_id = …`, rien d'autre) |
| **E3** | **l'ordre d'affichage** (maillons ET liaisons rangés du vert au rouge) | **aucune clé** | ● | **dessiné sans source** | M : couleurs des pastilles dans l'ordre du DOM `#8fb59a, #d9ab4e, #e08a4a, #d97a6a` (vert→rouge) et mêmes 4 couleurs dans le même ordre pour les 4 liaisons (`mesures/cadre30-source.html`). B : **aucun `ORDER BY`** au back, et l'ordre **mesuré instable** — `graph-frais.json` `[3addd2b3, cf5c00a5, 89acce10, 1c7fba73, b2681989]` vs `graph-dim2.json` `[cf5c00a5, 89acce10, 3addd2b3, 1c7fba73, b2681989]` → `MEME_ORDRE = False` |
| **E4** | **écart assumé #1 du dossier — « le nom de bâtiment n'est pas servi »** | **FAUX : il EST servi** | ● | **prémisse à corriger** (l'emplacement, lui, est bien marqué) | L'emplacement est honnête : **15** `<i class="gr30-aservir">libellé à servir</i>`, bordure pointillée (maquette l.6873 `border:1px dashed #5a5444`) — et 15 = exactement le nombre de références que la route sert pour 4 maillons + 4 liaisons (4 + 3 + 4 + 4). **Mais** `GET /v1/me/buildings` (route JOUEUR sous `JwtAuthGuard`, `player-buildings.controller.ts:111`) sert `name_i18n: I18nRef` (`:88`) — mesuré `mesures/me-buildings.json` : `{"key":"game.fiction.building.name","params":{"enseigne":"Soudure Varne","district":"La Lisière","block":"1501"}}` ; **jointure sur `building_id` : 5/5, 0 nœud du graphe sans nom**. L'en-tête de ce contrôleur nomme **explicitement l'écran ㉚** (`:1-6`) comme l'un de ceux qui balayaient 18 districts faute de cette route. ⇒ c'est un **2ᵉ appel client**, pas un ticket back |
| **E5** | **écart assumé #2 du dossier — « les `routes` ne sont pas dessinées »** | ● (8 lignes) | – | **vrai, mais ce n'est PAS « tout ce qui manque »** | `routes` mesuré non vide (`mesures/graph-dim3.json` : 2 lignes, 7 champs chacune) et **0** élément du cadre ne le rend. Manque AUSSI `legs[].leg_id` (ci-dessous). L'étiquette du cadre **déclare** le périmètre (« GET …/graph SEUL (nodes + legs), sans rang ni progression ») — l'omission est auto-documentée côté M, ce qui est à saluer |
| **E6** | **aucun geste** : 4 routes `@Post` joueur dans le domaine, **0 CTA** dans le cadre | ● (`legs[].leg_id`) | – | **omission non consignée au dossier** | Mesuré sur `mesures/cadre30-source.html` : `0` `<button>`/`<a>`, `0` `<input>/<select>/<textarea>`, `0` `.geste`, `0` `.bas`, `0` `.dit`, `0` `.rien` (les classes existent dans le CSS `.appr6`, maquette l.4570-4580 — non employées ici). Or `POST /v1/supply-chain/legs/:legId/maintain` (`supply-chain.controller.ts:163`) est le **seul verbe joueur du domaine** et sa poignée (`leg_id`) est servie |
| **E7** | **les 8 mots de bande ne sont pas servis par la pile** | enum servi, **mot absent du catalogue** | ● | **consigné — prérequis, pas un écart de maquette** | Les 8 FR du cadre sont **identiques à l'octet** aux 8 valeurs ratifiées (`mesures/comparaison-mots.txt` : `MOTS_SERVIS_PRESENTS_DANS_LE_CADRE = 8 / 8`, `ETATS_CADRE_NON_COUVERTS = []`, apostrophe U+2019 comprise), lues dans `lot/chaine-bandes` @`f9d92251` `string_table.ts:3655-3662`. **Mais** `appro.pression.*`/`appro.dette.*` : **0 occurrence** dans `string_table.ts` au build de la pile (`35bdd6cb`) **et** sur `main` (`6040a213`). Dérivation 1:1 possible (`appro.pression.<bucket>` ↔ `BackpressureBucket`, `appro.dette.<debt_bucket>` ↔ `DebtBucket` — suffixes identiques aux unions, vérifié valeur par valeur) : la fusion du lot est le prérequis |
| **E8** | **le HUD du cadre** (ARGENT / CHALEUR / JOUR / phase) | hors périmètre de la route | ● | **consigné — chrome partagé** | Mesuré : `class="barre"` dans **155/155** cadres de la page, `>Tiède<` 155 fois, `JOUR 12` 122 fois. Valeur en dur `'24 850 €'` (**U+202F fine insécable**, 158 occurrences dans la page). Sources ailleurs, mesurées ou ancrées : `GET /v1/economy/wallet` (`economy.controller.ts:43`), `GET /v1/city/district/:id/heat` (`heat.controller.ts:7`), `day_phase`/`family_day`/`opened_game_day` du corps de `POST /v1/session/open` (`mesures/session-open.json` : `DAWN` / `1` / `1`) |

**Ce qui est propre et mérite d'être dit** : mesuré `chiffres_dans_le_corps = []` — **aucun scalaire,
aucun pourcentage, aucune jauge chiffrée** dans le panneau de la chaîne. Le mur R2.2 que le back
revendique (`supply-chain.controller.ts:114-120`) n'a **rien** à refuser à cette maquette, et la
maquette n'a rien à inventer : les 8 états sont des **mots de bande**, et les 15 emplacements de
libellé sont **déclarés** au lieu d'être remplis de faux noms.

## « Passé à côté ? » — pour l'user

Les 9 lignes `● – ` (servi, non dessiné), par intérêt joueur décroissant.

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| 1 | `routes[].time_to_collapse_bucket` — `distant \| approaching \| imminent \| na` (`time-to-collapse-bucket.ts:24`) | « dans combien de temps ce tracé lâche » | **Utile ici, et c'est la plus utile** : c'est la seule clé de toute la réponse qui dit *quand*, pas seulement *dans quel état*. Un écran qui montre la pression et la dette sans dire laquelle va rompre la première laisse le joueur choisir au hasard | ★★★ |
| 2 | `routes[].state` — `draft \| active \| saturated \| severed` (pgEnum, `operational_chain.ts:88`) | « ce tracé est saturé / coupé » | **Utile ici** : `saturated` et `severed` sont des états *actionnables*, et le cadre n'a aucun endroit où une livraison absente s'explique. Précédent connu dans la même réponse : `legs[].bypassed` est déjà dessiné (« contournée ») — même nature, même valeur d'usage | ★★★ |
| 3 | `routes[].rebuilding` — booléen (`supply-chain-graph.service.ts:70-71`, « jamais le compte à rebours brut ») | « ce tracé est en travaux » | **Utile ici** : c'est la réponse à « pourquoi rien n'arrive » qui n'est pas une mauvaise nouvelle. Bon marché : un mot, pas une ligne de plus | ★★☆ |
| 4 | `routes[].sinuosity_stress_bucket` — `pristine \| stressed \| critical \| severed` (`sinuosity-stress-bucket.ts:34`) | « l'usure du tracé lui-même » | **Utile, mais après #2** : `severed` double `state`, et sans #1 la bande dit l'état sans dire l'urgence | ★★☆ |
| 5 | `legs[].leg_id` | la poignée du **seul** verbe joueur du domaine | **Pas pour l'affichage — pour le geste.** Un id opaque ne se montre pas ; mais il est servi, l'écran dessine la liaison, et il n'y a aucun geste (E6). C'est la clé qui transforme cet écran de tableau de bord en écran de jeu | ★★☆ |
| 6 | `routes` (conteneur : le cardinal) | « combien de tracés sauvegardés » | Suit #1-#4 : sans eux, un compte seul ne dit rien | ★☆☆ |
| 7-9 | `routes[].route_id`, `routes[].origin_building_id`, `routes[].destination_building_id` | identité et extrémités du tracé | **Pas ici : c'est de la plomberie** (ids opaques + jointure sur `/v1/me/buildings`, comme les liaisons déjà dessinées) | ☆☆☆ |

## Lots back suggérés (B⁻ dessiné → forme F ; et B⁻ non dessiné à fort intérêt)

Aucune colonne **B⁻ dessinée par la maquette** : la forme F stricte (en base, non projeté, **dessiné**)
est **vide** ici — mesuré, la maquette ne dessine rien que la base porte et que la projection omet.
Les candidats ci-dessous sont des B⁻ **non dessinés** dont la valeur joueur est mesurable.

| # | colonne | table | maquette (Mxx) | preuve |
|---|---|---|---|---|
| L1 | `blocked_sources` (jsonb, jeu **fermé** de 6 étiquettes atteignables) | `supply_node_pressure` (`supply_chain_loops.ts:106`) | **rien** — aucun élément ne dit *pourquoi* ça bloque | **0** site de données dans un contrôleur joueur (mesuré). Valeurs : `BlockedOutputSource` = 7 membres dont 1 réservé inerte (`blocked-output-detector.ts:22-31`), **6 détecteurs** enregistrés (6 fichiers dans `detectors/`, compté). Mesuré en vrai : `mesures/raw-nodes.json` → `['LEG_STRESSED_ORIGIN']`. ⇒ une bande « pourquoi » clé en main, déjà fermée, déjà remplie |
| L2 | `is_blocked_output` (bool) | `supply_node_pressure:105` | **rien** — et c'est l'origine de E1 | **0** site de données joueur (la seule occurrence, `supply-chain.controller.ts:233`, est un commentaire). Mesuré : 2 nœuds `true`, **sans** flèche ; 1 nœud `false`, **avec** flèche ⇒ complémentaire de `has_arrow`, pas redondant. Sans elle, l'écran ne peut pas distinguer « je suis la cause » de « je subis » — exactement ce que E1 dessine de travers |
| L3 | `source_distance_hops` (smallint) | **rien** | `supply_node_pressure:108` — **0** site joueur. Mesuré `1` sur le nœud porteur de flèche. En **bande** (« à côté » / « plus haut dans la chaîne ») : dit si la cause est à un pas ou à quatre. Scalaire interdit R2.2 ⇒ **bande**, pas le compte |
| L4 | `stress_streak` (smallint) | **rien** | `supply_chain_legs:67` — **0** site joueur (l'unique occurrence `supply-chain.controller.ts:117` est le commentaire du mur R2.2). En **bande** : « ça empire depuis plusieurs nuits » vs « c'est arrivé cette nuit ». Déclencheur d'Exception à `>= 2` — déjà un seuil qualitatif |
| L5 | `maintenance_mode` (enum 3 valeurs) | **rien** | `supply_chain_legs:70` — **0** site joueur **sur le graphe** ; le joueur vient de le choisir (`POST …/maintain`) et ne le revoit nulle part. Candidat additif à `legs[]` (enum fermé : `quick_patch \| structural_reinforce \| reroute_bypass`, `supply_chain_loops.ts:53-56`) |
| L6 | *(clé i18n servie)* | — | les 8 mots (E7) | La maison sert désormais la **clé** et non la bande seule (précédents du cumul client : `residue_i18n_key`, `blocked_reason_i18n`, `outcome_i18n_key`). `GraphResponse` n'a **aucun** `*_i18n_key` (`supply-chain.controller.ts:78-101`). À trancher : clé servie, ou dérivation `appro.<famille>.<bande>` (mesurée possible 8/8) |

**Dérogation R2.2 relevée dans le domaine** (hors route du dossier, à signaler) :
`maintenance_completes_at_tick` est projeté **brut** (tick absolu) par `POST …/maintain`
(`supply-chain.controller.ts:49` et `:182`) — précédent connu de scalaire sur une route joueur de ce
domaine ; 2 autres sites comptés dans le même contrôleur, tous des commentaires. Le graphe, lui, ne
le porte pas.

## Actions : routes ↔ CTA

| route `@Post` joueur du domaine | ancre | CTA de la maquette | statut |
|---|---|---|---|
| `POST /v1/supply-chain/legs/:legId/maintain` | `supply-chain.controller.ts:163` | **aucun** | **question** (E6) — le seul verbe de jeu du domaine ; `legs[].leg_id` est servi, la liaison est dessinée, le geste manque |
| `POST /v1/supply-chain/nodes/:buildingId/trace-step` | `:217` | **aucun** | **question** — verbe de diagnostic *un saut à la fois* ; la maquette montre déjà le graphe entier, le pas-à-pas y est sans objet. **Avis : pas ici** |
| `POST /v1/supply-chain/nodes/:buildingId/resolve` | `:236` | **aucun** | **question** — « à la source » ; inexploitable tant que l'écran ne dit pas *quel* nœud est la source (→ L2) |
| *(hors domaine, cité pour mémoire)* `POST /v1/operational/routes/:id/rebuild` | `route.controller.ts:193` | **aucun** | cohérent avec E5 : `routes` n'est pas dessiné, donc son verbe non plus |
| **CTA sans route** | — | — | **aucun** : 0 bouton / 0 lien / 0 champ mesurés dans le cadre ⇒ **rien à ratifier de ce côté** |

## Table de couverture complète

Mode maquette : pas de colonne F. Convention de comptage (explicite, auditée par
`mesures/controle-arithmetique.py`) : **une clé B = un chemin de clé du corps réel**, les 3
conteneurs compris (chacun porte le **cardinal** de sa liste, que la maquette dessine).

| # | information | B | M | statut | preuve |
|---|---|---|---|---|---|
| 1 | cardinal des maillons | `nodes` | M19 « 4 nœuds dessinés » | **ASSUMÉ à consigner — E2** | `graph-frais.json` 5 nœuds sur compte neuf ; `noeuds = 4` |
| 2 | identité du maillon (→ son libellé) | `nodes[].building_id` | M09 (4 emplacements) | ✔ *(libellé via `/v1/me/buildings`, E4)* | `graph-dim3.json` ; jointure 5/5 |
| 3 | bande de pression du maillon | `nodes[].bucket` | M08 pastille + M10 mot | ✔ | 4 valeurs `silent\|mild\|warm\|critical` (`backpressure-bucket.ts:22`) ↔ 4 mots, 4 couleurs ; mesuré `{silent, warm}` |
| 4 | le maillon refoule-t-il | `nodes[].has_arrow` | M11 (3/4) | **ASSUMÉ à consigner — E1** | `has_arrow` vrai sur 1 des 3 `warm` |
| 5 | cible du refoulement | `nodes[].arrow_to_building_id` | M12 (3 emplacements) | ✔ *(libellé, E4)* | `graph-dim2.json` : `cf5c00a5` |
| 6 | cardinal des liaisons | `legs` | M20 « 4 liaisons » | **ASSUMÉ à consigner — E2** | 3 legs mesurés ; aucune pagination |
| 7 | **identité de la liaison** | `legs[].leg_id` | – | **« PASSÉ À CÔTÉ ? »** | poignée de `…/maintain` ; 0 CTA (E6) |
| 8 | origine de la liaison | `legs[].origin_building_id` | M14 + M15 flèche → | ✔ *(libellé, E4)* | `graph-dim3.json` |
| 9 | destination de la liaison | `legs[].destination_building_id` | M16 | ✔ *(libellé, E4)* | `graph-dim3.json` |
| 10 | bande de dette de la liaison | `legs[].debt_bucket` | M17 mot + couleur | ✔ | 4 valeurs `fresh\|accruing\|stressed\|fractured` (`debt-bucket.ts:23`) ↔ 4 mots ; mesuré `{accruing, fractured}` |
| 11 | liaison contournée | `legs[].bypassed` | M18 « contournée » + pointillés | ✔ | mesuré `bypassed` vrai sur 1 leg après `POST …/maintain {"mode":"reroute_bypass"}` |
| 12 | cardinal des tracés | `routes` | – | **« PASSÉ À CÔTÉ ? »** | 2 tracés mesurés |
| 13 | identité du tracé | `routes[].route_id` | – | **« PASSÉ À CÔTÉ ? »** | plomberie |
| 14 | origine du tracé | `routes[].origin_building_id` | – | **« PASSÉ À CÔTÉ ? »** | plomberie |
| 15 | destination du tracé | `routes[].destination_building_id` | – | **« PASSÉ À CÔTÉ ? »** | plomberie |
| 16 | usure du tracé | `routes[].sinuosity_stress_bucket` | – | **« PASSÉ À CÔTÉ ? »** | `pristine\|stressed\|critical\|severed` ; mesuré `pristine` |
| 17 | délai avant rupture | `routes[].time_to_collapse_bucket` | – | **« PASSÉ À CÔTÉ ? » (★★★)** | `distant\|approaching\|imminent\|na` ; mesuré `na` |
| 18 | état du tracé | `routes[].state` | – | **« PASSÉ À CÔTÉ ? » (★★★)** | `draft\|active\|saturated\|severed` ; mesuré `active` |
| 19 | tracé en travaux | `routes[].rebuilding` | – | **« PASSÉ À CÔTÉ ? »** | mesuré `false` |
| 20 | argent du joueur | – | M01 `24 850 €` | **ASSUMÉ — E8** (chrome 155/155 ; source `/v1/economy/wallet`) | U+202F mesuré |
| 21 | chaleur (jauge + mot) | – | M02 « Tiède » | **ASSUMÉ — E8** (source `/v1/city/district/:id/heat`) | 155/155 |
| 22 | jour de jeu | – | M03 « JOUR 12 » | **ASSUMÉ — E8** (`session/open.opened_game_day`) | mesuré `1` |
| 23 | phase du jour | – | M04 « Plein jour » | **ASSUMÉ — E8** (`session/open.day_phase`) | mesuré `DAWN` |
| 24 | titre de l'écran | – | M05 « La chaîne » | **ASSUMÉ** — libellé i18n à servir | statique |
| 25 | sous-titre de l'écran | – | M06 « Chaque maillon, sa pression ; … » | **ASSUMÉ** — libellé i18n à servir | statique |
| 26 | intertitre « maillons » | – | M07 | **ASSUMÉ** — libellé i18n à servir | statique |
| 27 | intertitre « liaisons » | – | M13 | **ASSUMÉ** — libellé i18n à servir | statique |
| 28 | **libellé lisible d'une référence de bâtiment** | – (pas sur CETTE route) | M22 (15 emplacements) | **ASSUMÉ à consigner — E4** (prémisse du dossier à corriger) | `name_i18n` servi par `/v1/me/buildings` ; jointure 5/5 |
| 29 | **ordre d'affichage par gravité** | – | M21 | **ASSUMÉ à consigner — E3** | aucun `ORDER BY` ; ordre mesuré instable |

**Comptes** : |B| = 19 (lignes 1-19) · |M non apparié| = 10 (lignes 20-29) · |F sans source| = 0 ·
**somme = 29 = nombre de lignes**. Dont : ✔ = 7 · « passé à côté ? » = 9 · assumés/à consigner = 13.

## Annexes

### 1. Routes du domaine (compte, ancres)

**Compte trouvé : 5 routes joueur** dans `services/game-back/src/core_loops/supply_chain/` sous
`@UseGuards(JwtAuthGuard)` — 1 lecture graphe, 1 lecture nœud, 3 `@Post` :

- `@Get('supply-chain/graph')` — `supply-chain.controller.ts:122` ← **la route du dossier**
- `@Post('supply-chain/legs/:legId/maintain')` — `:163`
- `@Get('supply-chain/nodes/:buildingId/backpressure')` — `:199`
- `@Post('supply-chain/nodes/:buildingId/trace-step')` — `:217`
- `@Post('supply-chain/nodes/:buildingId/resolve')` — `:236`

Exclus : `supply-chain-test.controller.ts` (4 routes, montées seulement si `NODE_ENV !== production`)
et `supply-chain-admin.controller.ts`.

**Complément au-delà du module nommé** — grep des mots du domaine dans **tous** les
`*.controller.ts` (`supply-chain`, `backpressure`, `leg`, `debt`, `graph`, `chain`), contrôles
positifs compris : les motifs `leg` et `debt` ont **bien** ramené des faux positifs d'autres domaines
(`me/legal` ×6, `meta/capability-debts`) — la preuve que le motif n'était pas trop serré. **Aucune
autre route ne porte la donnée du graphe.** Mais une route **hors domaine** porte ce que la maquette
dessine : `@Get('me/buildings')` — `citysim/district_interior/player-buildings.controller.ts:111`
(le nom de bâtiment, E4).

### 2. Corps réels — `mesures/` + commandes

Toutes les commandes : `mesures/commandes.sh`. **Jetons et mots de passe masqués `***`** — vérifié,
`0` fichier de `mesures/` contenant `eyJ`, un `access_token` non masqué ou `pw-jd-`.

| fichier | contenu mesuré |
|---|---|
| `graph-frais.json` | compte NEUF après `session/open` : **nodes 5** (tous `silent`, `has_arrow` false, `arrow_to_building_id` null), **legs 0**, **routes 0** |
| `graph-dim1.json` | après 3 `recordThroughput` : **legs 3**, `debt_bucket` ∈ {`accruing`, `fractured`}, `bypassed` false |
| `graph-dim2.json` | après 16 ticks `BACKPRESSURE_UPDATE` + `maintain reroute_bypass` : buckets {`silent`,`warm`}, `has_arrow` vrai ×1, `bypassed` vrai ×1 |
| `graph-dim3.json` | après 2 `POST /v1/operational/routes` (201, **route joueur**) : **routes 2**, `pristine`/`na`/`active`/`false` → **les 3 listes mesurées non vides, les 19 clés mesurées et non déduites** |
| `raw-nodes.json` | lecture brute (route `_test`) : 2 nœuds `isBlockedOutput: true` **sans** flèche, 1 nœud `false` **avec** flèche + `sourceDistanceHops: 1` ⇒ fonde E1 et L2 |
| `me-buildings.json` | 5 entrées, 9 clés, `name_i18n` + `district_name` + `purchased_type` |
| `cadre30-source.html` / `cadre30-indente.html` | le cadre épinglé, extrait **par son libellé** |
| `comparaison-mots.txt` | les 8 mots, comparaison à l'octet |
| `controle-arithmetique.py` | le contrôle §5, `RC=0` |

**Build de la pile** : `X-Server-Build: 35bdd6cb` sur **chaque** réponse — **ce n'est pas**
`6040a213` (le commit que le dossier donne à lire). Mesuré : `35bdd6cb` **n'est pas** un ancêtre de
`6040a213` (`merge-base --is-ancestor` → `RC=1`), base commune `f1f5ebf8`, 7 commits d'un côté et 2
de l'autre. **Mais** `git diff --name-only 35bdd6cb 6040a213 -- …/supply_chain/` = **0 fichier** :
le module du domaine est identique aux deux commits, donc **B est MESURÉ, pas déduit**. Seul l'i18n
diffère (1 fichier) — d'où E7.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | type projeté | valeurs possibles | contrainte source |
|---|---|---|---|
| `nodes[].building_id` | id opaque (uuid) | — | `buildings.building_id` (`city_state.ts:146`) |
| `nodes[].bucket` | **bande** (4) | `silent` `mild` `warm` `critical` | union TS `backpressure-bucket.ts:22` ; seuils `backpressureMild/Warm/CriticalThreshold` (`core-loops-tunables.ts:582-594`) — **jamais** l'index (`CHECK 0 ≤ x ≤ 1`, `supply_chain_loops.ts:104`) |
| `nodes[].has_arrow` | booléen **dérivé** | `true` `false` | `supply-chain-graph.service.ts:115` `hasArrow: n.arrowToBuildingId != null` ⇒ **redondant** avec la clé suivante : 2 clés, 1 information |
| `nodes[].arrow_to_building_id` | id opaque \| `null` | — | `supply_node_pressure.arrow_to_building_id`, SOFT-REF sans FK (`supply_chain_loops.ts:107`) |
| `legs[].leg_id` | id opaque (uuid) | — | PK `supply_chain_legs.leg_id` (`:62`) |
| `legs[].origin_building_id` / `destination_building_id` | id opaque | — | FK CASCADE vers `buildings` (`:64-65`) ; `UNIQUE (player_id, origin, destination)` (`:87`) |
| `legs[].debt_bucket` | **bande** (4) | `fresh` `accruing` `stressed` `fractured` | union TS `debt-bucket.ts:23` ; coupures `debtLoad <= 0` → `fresh`, `>= debtCap` → `fractured` (`:32-33`) ; `CHECK >= 0` sur `debt_load` (`supply_chain_loops.ts:66`) |
| `legs[].bypassed` | booléen | `true` `false` | `supply_chain_legs.bypassed NOT NULL DEFAULT false` (`:72`) |
| `routes[].route_id` | id opaque | — | `route` (`operational_chain.ts:281`) |
| `routes[].sinuosity_stress_bucket` | **bande** (4) | `pristine` `stressed` `critical` `severed` | union TS `sinuosity-stress-bucket.ts:34` |
| `routes[].time_to_collapse_bucket` | **bande** (4) | `distant` `approaching` `imminent` `na` | union TS `time-to-collapse-bucket.ts:24` ; `na` si `severed` **ou** si aucun historique (`:49-50`) — mesuré `na` sur un tracé `active` neuf : **`na` n'implique pas `severed`** |
| `routes[].state` | **enum fermé** (4) | `draft` `active` `saturated` `severed` | `pgEnum('route_state', …)` (`operational_chain.ts:88`) |
| `routes[].rebuilding` | booléen | `true` `false` | `supply-chain-graph.service.ts:70-71` (« NEVER the raw `rebuild_completes_at_tick` countdown ») |

Conformité **R2.2** sur cette route : **aucune dérogation**. Mesuré — `debt_load`,
`backpressure_index` et `stress_streak` n'apparaissent dans **aucun** contrôleur joueur autrement que
dans des commentaires (`supply-chain.controller.ts:117`, `:160`, `:196`, `:233`), et le corps réel ne
porte aucun scalaire continu.

### 4. Inventaire M (Mxx → représente)

Mesuré par `mesures/` (script d'inventaire, comptes entre crochets).

| Mxx | élément / texte tel qu'écrit | représente |
|---|---|---|
| M01 | `<span class="val">24 850 €</span>` | argent du joueur (HUD) |
| M02 | svg 3 `<path>` + aiguille `rotate(-40 20 22)` + « Tiède » | bande de chaleur (HUD) |
| M03 | « JOUR 12 » | jour de jeu (HUD) |
| M04 | « Plein jour » | phase du jour (HUD) |
| M05 | `<h3>La chaîne</h3>` | titre d'écran |
| M06 | « Chaque maillon, sa pression ; chaque liaison, son entretien. » | sous-titre d'écran |
| M07 | titron « Les maillons » | intertitre |
| M08 | `gr30-pt` background **[4]** : `#8fb59a` `#d9ab4e` `#e08a4a` `#d97a6a` | bande de pression (couleur) |
| M09 | « libellé à servir » dans `.noeud .n b` **[4]** | nom du maillon — **emplacement déclaré** |
| M10 | `.etat` **[4]** : « Rien ne bloque » / « Ça commence à s'accumuler » / « Engorgé » / « Ne livre plus » | bande de pression (mot) |
| M11 | `gr30-fl` « ↳ refoule vers » **[3]** | le maillon refoule |
| M12 | « libellé à servir » dans `gr30-fl` **[3]** | nom de la cible du refoulement |
| M13 | titron « Les liaisons » | intertitre |
| M14 | « libellé à servir », 1ᵉʳ de `gr30-t` **[4]** | origine de la liaison |
| M15 | `gr30-fleche` « → » **[4]** | sens de la liaison |
| M16 | « libellé à servir », 2ᵉ de `gr30-t` **[4]** | destination de la liaison |
| M17 | `.etat` **[4]** : « Entretenu » / « L'entretien prend du retard » / « Tient à peine » / « Rompu » (mêmes 4 couleurs) | bande de dette |
| M18 | `gr30-ctn` « contournée » **[1]** + `gr30-contourne` bordure pointillée **[1]** | liaison contournée |
| M19 | `.noeud gr30-n` **[4]** | cardinal des maillons |
| M20 | `gr30-l` **[4]** | cardinal des liaisons |
| M21 | ordre du DOM : vert → jaune → orange → rouge (maillons **et** liaisons) | gravité croissante |
| M22 | `gr30-aservir` **[15 au total]** = 4 (M09) + 3 (M12) + 4 (M14) + 4 (M16) | **15 emplacements = 15 références servies** pour 4 maillons + 4 liaisons |

Classes du bloc `.appr6` **non employées** par ce cadre (mesuré 0 occurrence) : `.bon`, `.penurie`,
`.tuyau`, `.pic`, `.trouve`, `.flou`, `.bas`, `.dit`, `.geste`, `.rien` — c'est-à-dire tout
l'appareil d'action et de narration du bloc parent (fonde E6).

### 5. Inventaire F

**Sans objet — mode maquette** (le front de cet écran n'existe pas ; `|F sans source| = 0`).

### 6. Non vérifié

1. **Bandes jamais observées sur la pile** : `nodes[].bucket` = `mild` et `critical` (mesuré
   `{silent, warm}`) ; `legs[].debt_bucket` = `stressed` (mesuré `{accruing, fractured}`) ;
   `sinuosity_stress_bucket` ≠ `pristine` ; `time_to_collapse_bucket` ∈
   {`distant`,`approaching`,`imminent`} ; `state` ∈ {`draft`,`saturated`,`severed`} ; `rebuilding`
   = `true`. Les valeurs sont **épinglées à la source** (unions TS + pgEnum, annexe 3), pas au corps.
   **Mesure qui trancherait** : viser les coupures (`debt_load` entre `mycelialStressThreshold` et
   `mycelialDebtCap` pour `stressed`) ; pour `time_to_collapse`, écrire ≥ 2 lignes de
   `route_version_history` dans la fenêtre de 60 ticks (`TIME_TO_COLLAPSE_RECENT_WINDOW_TICKS`) puis
   relire `/graph`.
2. **`BlockedOutputSource`** : 1 des 6 étiquettes atteignables observée (`LEG_STRESSED_ORIGIN`) ;
   `BUYER_LEK_COLD` est documentée **réservée inerte** et n'apparaît jamais — non vérifié par un run,
   pris au commentaire (`blocked-output-detector.ts:29-31`).
3. **Le libellé réellement rendu** : `name_i18n.key = game.fiction.building.name` est une clé à
   **paramètres** (`enseigne`/`district`/`block`) ; je n'ai pas vérifié que cette clé est servie par
   `string_table.ts` au build de la pile, ni la forme du gabarit FR. **Mesure** : chercher
   `game.fiction.building.name` dans `string_table.ts` @`35bdd6cb` — à faire avant de clore E4.
4. **Dimensionnement partiellement hors route joueur** : `legs` et les bandes de pression ont été
   remplis via `POST /v1/_test/supply-chain/record-throughput` et `…/run-backpressure-update`
   (contrôleur `_test`, gated `NODE_ENV !== production`, qui invoque le **code de production réel** :
   `LegAccrualService.recordThroughput` et le **même** `runTick` que l'ordonnanceur). `routes` et
   `bypassed`, eux, viennent de **vraies routes joueur** (`POST /v1/operational/routes` 201,
   `POST …/legs/:legId/maintain` 200). La chaîne joueur complète (cook → dispatch → arrivée) n'a
   **pas** été exercée : un leg né d'un vrai `dispatch` pourrait porter d'autres valeurs de
   `routeSinuosityIndex`, jamais d'autres **clés**.
5. **E2 / capacité d'affichage** : j'affirme l'absence de défilement sur la lecture du CSS
   (`.appr6 .abody{…overflow:hidden}`, `height:462px`) — **je n'ai pas rendu la page**. Le compte
   (5 servis > 4 dessinés) est mesuré ; le **débordement visuel** reste à confirmer par un rendu —
   c'est du ressort du juge visuel.
6. **E8 / sources du HUD** : `/v1/economy/wallet` et `/v1/city/district/:id/heat` sont **ancrées,
   non appelées** (hors périmètre de la question bornée). Le lien entre « JOUR 12 » et
   `opened_game_day`/`family_day` est une lecture de nom, pas une mesure d'équivalence.
7. **Ordre (E3)** : deux appels suffisent à montrer que l'ordre **n'est pas garanti** ; ils ne
   montrent pas qu'il est aléatoire. Il n'y a **aucun** `ORDER BY` — c'est l'ordre du tas Postgres,
   donc non spécifié par contrat. C'est ce que j'asserte, rien de plus.

---

### Auto-audit du verdict

J'ai bien : lu le mandat en entier avant toute commande ; lu `dossier.md` en premier ; extrait le
cadre **par son libellé** (index 154 en 0-based, 155ᵉ de 155 — concordant avec le dossier) depuis le
commit **épinglé** `ec35deec` et non l'arbre de travail ; mesuré les 19 clés sur un **corps réel non
vide pour les 3 listes** ; relevé le build de la pile et **prouvé** que le module du domaine y est
identique au commit du dossier avant de dire « mesuré » ; comparé les 8 mots **à l'octet** contre le
fichier du lot (jamais contre ma frappe) ; recompté la table **par script** depuis le corps mesuré
(`RC=0`, 19 + 10 + 0 = 29) ; vérifié qu'aucun jeton ne figure dans `mesures/`.

Je n'ai lu **ni** notes d'implémentation **ni** rapport de juge antérieur : `Tools/juge-donnees/` et
`Tools/juge-visuel/` n'ont été ouverts que pour ce dossier.

Les trois affirmations qui portent le verdict **NON** sont chacune une **mesure**, pas un argument :
`has_arrow` vrai sur **1** des **3** nœuds `warm` (E1) ; **5** maillons servis sur un compte **neuf**
contre **4** dessinés (E2) ; **deux ordres différents** pour le même jeu de données et **aucun**
`ORDER BY` au back (E3). Si l'auteur les réfute avec une mesure contraire, je les lâche.

**Ce que je n'ai pas tranché** : si BACK-1 (E4) visait en réalité à porter le nom **dans la réponse
du graphe** (pour économiser le 2ᵉ appel) plutôt qu'à « servir le nom », alors le ticket garde son
objet et seule sa formulation au dossier est à corriger. Je le signale, l'user tranche.
