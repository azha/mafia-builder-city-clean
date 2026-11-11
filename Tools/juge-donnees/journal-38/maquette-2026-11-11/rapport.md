# Juge données ⊥ — ㊳ « Le journal », après « Y PRÊTER ATTENTION » — maquette — 2026-11-11

**VERDICT : NON** — le *delta gaté* est juste (les 4 phrases de bande sont servies au byte près et le
CTA éteint rend vraiment), mais les cadres portent un panneau dont l'essentiel du contenu est
**dessiné sans source** (texte des brèves, 4 `kind` inventés, angle hors domaine, 2 compteurs sur 3),
et l'**après-geste contredit la mesure** : le back retire l'événement assisté du feed, la maquette
montre la liste inchangée.

## En une phrase

L'écran montre **17 informations servies sur 27 disponibles** (10 clés « passé à côté ? »), avec
**10 écarts à consigner** dont 1 propre à l'après-geste, et **4 lots back** suggérés ; |B| = 27,
|M non appariés| = 9, somme = 36 = lignes (`mesures/controle-arithmetique.py`, positif rc 0 / négatif rc 1).

- `X-Server-Build` **avant = 8d0184a4**, **après = 8d0184a4** (`mesures/journal-des-commandes.txt`).
- Module `operational/ambient/` **identique** entre la pile `8d0184a4` et le cumul back `74c5a0b0`
  (`git diff --name-only` vide) ; `string_table.ts` diffère mais **seulement sur des clés `appro.*`** —
  les 8 lignes `apres_assister` sont identiques entre les deux (`mesures/build-8d0184a4-vs-74c5a0b0.txt`,
  contrôle positif : `string_table.ts` est bien dans la liste des 4 fichiers qui diffèrent).

## Ce qui est juste dans le chunk gaté (attesté)

Le diff des 4 cadres contre le cadre 125 (avant-geste) ne porte que **3 deltas** : l'étiquette, la
classe `cta6` → `cta6 eteint`, et le texte de `note6` (`mesures/` cadres extraits, diff en Annexe 4).

- Les **4 phrases de bande** sont **égales au byte** aux valeurs FR servies, **U+202F compris**
  (`mesures/phrases-maquette-vs-string-table.txt`, rc 0) :
  `string_table.ts:6057-6060` @`74c5a0b0` ↔ `<div class="note6">` des cadres 155-158.
- Le **CTA éteint rend** : `.jrn6 .cta6.eteint{border-color:#2a3648;color:#7a838d;background:#111823}`
  existe bien dans la feuille (2 règles `.jrn6`+`eteint`) — ce n'est pas une classe morte.
- La **casse n'est pas un écart** : `text-transform:uppercase` est porté par `.jrn6 .cta6`,
  `.jrn6 .une .jrn b`, `.jrn6 .une .angle`, `.jrn6 .brv .qd`, `.jrn6 .fen>span`, `.jrn6 .enseigne i` ⇒
  « Y prêter attention », « Le Clairon de Brennar », « à la une » rendent en capitales **sans** que la
  maquette dévie des mots servis.

## Écarts à consigner (mode maquette)

| # | information | B | M | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|
| **E1** | **texte des brèves** : 3 phrases entières dessinées | ● `descriptor_i18n_key` | ● M16 | **dessiné sans source** | servi = 6 groupes nominaux courts (`ambient.micro_event.*` FR : « une livraison en retard », « un pâté de maisons bruyant »…), `string_table.ts:5205-5216`. Aucune des 3 phrases dessinées n'en est une |
| **E2** | **4 `kind` inventés** + mauvais namespace | ● `kind` | ● M17/M13 | **dessiné sans source** | `ambient.queue_pharmacy`, `ambient.night_trucks`, `ambient.church_closed`, `news.beat.body_found` → **0 occurrence** dans `string_table.ts` ; 0 dans le pgEnum fermé à 6 membres `ambient_micro_event_kind` (`db/schema/ambient_world.ts:48-55`). **Contrôle positif** : `bar_rumor` = 1. Namespace servi = `ambient.micro_event.<kind>`, dessiné = `ambient.<kind>` |
| **E3** | **angle « fait divers »** | ● `frame_tag_i18n_key` | ● M15 | **dessiné sans source** | les 8 valeurs servies lisent toutes « angle … » (`news_beat.frame_tag.*` FR : « angle accident », « angle humain », « angle de fond »…) ; « fait divers » = **0** dans `string_table.ts`. Mesuré : `frame_tag_i18n_key` **null sur 10/16** beats, et null sur les **3** beats `digest.ambient_micro` |
| **E4** | **compteur « à la une » = 01** | **–** | ● M07 | **dessiné sans source** | `GET /v1/news/feed` sert `{beats, nextCursor}` — **pas de `total`** (`news.controller.ts:39-48`). Mesuré : 16 beats, `nextCursor: null` |
| **E5** | **compteurs incohérents avec le cadre** | ● `total` / `events` | ● M08/M09 | **valeurs en dur** | compte binaire des 5 cadres : `une=1 brv=3 fen=3`, compteurs `01/04/03` — « 04 dans la rue » pour **3** brèves rendues, « 03 en cours » pour **0** liste « en cours » rendue. `ambient/feed.total` mesuré = 2 puis 0 |
| **E6** | **nom de district absent des routes du journal** | ● `district` (slug) | ● M18/M14 | **forme F → lot back** | les 4 noms dessinés **sont le canon** (`citysim/world/district-names.ts` : 16 La Lisière, 11 Les Entrepôts, 9 Marne-Basse, 12 Dépôt-Est) et sont servis par `GET /v1/world/districts.name` + `GET /v1/me/buildings.district_name` (mesuré `'La Lisière'`), **mais** `ambient/feed` et `news/feed` ne servent que `district-<id>`. Pire : le gabarit substitue sur le **param nommé `district`** dont la valeur **est le slug** (`news.projection.service.ts:83-86`) ⇒ « Pendant ce temps, à **district-2** : … » |
| **E7** | ⚠️ **après-geste : la liste ne bouge pas** (propre au chunk gaté) | ● `events`/`total` | ● M22/M08/M19 | **DÉFAUT après-geste** | mesuré : feed **avant** = 2 events / `total` 2 ; feed **après** les 2 gestes = `events: []` / `total` 0. Le feed filtre `status='live'` et l'attend passe la ligne à `attended` (`ambient-micro-event.repository.ts:151-157, 203`). Les 4 cadres montrent la liste, les compteurs et la fraîcheur **identiques** au cadre 125 |
| **E8** | **geste global vs route par événement** | ● `attend/:id` | ● M20 | **à faire ratifier** | le CTA est unique, dans le `pied`, sans prise par brève ; la route prend **un id** (`ambient.controller.ts:77-83`). La maquette ne dit pas **quel** événement a été assisté, et `event_id`/`district` de la réponse ne sont pas dessinés |
| **E9** | **bande `fading` jamais dessinée** | ● `recency_band` | ● M19 (2 valeurs sur 3) | **bande non dessinée** | 3 valeurs servies avec 3 libellés ratifiés (`journal.fraicheur.fresh/settling/fading` = « ce matin » / « hier » / **« la semaine passée »**) ; la maquette ne dessine que les 2 premières. Mesuré : 16/16 beats en `settling` |
| **E10** | **pastille redondante** | – | ● M19 | **ASSUMÉ à consigner** | les couleurs `pt` (`#f2c96b, #f2c96b, #b9ad92`) sont **exactement** celles de `qd` ⇒ le point répète la fraîcheur, sans 2ᵈ information. Si la gravité était visée : `journal.gravite.*` (« à peine »/« on en parle »/« ça pèse ») est ratifié mais **aucune** des 2 routes du journal ne projette de `severity_band` (seuls `exceptions` et `random_world` en projettent) |

## « Passé à côté ? » — pour l'user (10 lignes ● –, par intérêt joueur décroissant)

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| 1 | `channel` (`ambient/feed`) | **où** la rumeur circule : `constant_hum` \| `trade_channel` \| `bar_talk` (pgEnum, `ambient_world.ts:58`) | **utile ici** : c'est ce qui distingue deux brèves de même fraîcheur — la texture même du journal (le comptoir, le négoce, le bruit de fond). Rien ne la dessine | ★★★ |
| 2 | `category` (`news/feed`) | la **rubrique** du canard : `national`/`brennar_local`/`business`/`arts`/`sports` (pgEnum, `news_beat.ts:91-97`) | **utile ici** : un vrai journal a des rubriques ; mesuré 4 des 5 présentes. ⚠️ exige le lot L2 — **aucun libellé i18n servi** | ★★★ |
| 3 | `district` (`ambient/attend`) | **où** le geste a porté | **utile ici** : la note dit « La rue s'en souviendra » sans dire **quelle** rue ; la réponse le sait | ★★ |
| 4 | `nextCursor` (`news/feed`) | il y a **une suite** à la une | **utile si la une s'allonge** : 16 beats servis pour 1 dessiné — aucune prise « plus » n'est dessinée | ★★ |
| 5 | `limit` / `offset` (`ambient/feed`) | le feed **est paginé** (défaut 20, plafond 100) | **pas ici** : plomberie — mais note qu'aucune pagination n'est dessinée pour une liste qui en a une | ★ |
| 6 | `beat_id` (`news/feed`) | l'id opaque d'une une | **pas ici** : plomberie — nécessaire pour `GET /v1/news/beats/:id`, écran de détail non dessiné | ★ |
| 7 | `event_id` (`ambient/feed`) | l'id opaque d'une brève | **pas ici** : plomberie — c'est l'argument du geste | ★ |
| 8 | `event_id` (`ambient/attend`) | corréler la réponse et la ligne | **pas ici** : plomberie | ★ |
| 9 | `headline_params_fields` (`news/feed`) | le frère **déclaré** de `headline_params` | **pas ici** : plomberie de typage client | ★ |

*(9 entrées pour 10 clés : `limit` et `offset` sont regroupées à la ligne 5.)*

## Lots back suggérés (B⁻ dessiné / forme F)

| # | colonne / manque | table / source | maquette | preuve |
|---|---|---|---|---|
| **L1** | **nom de district** sur les routes du journal (`ambient/feed.district`, `news/feed.district`, et le param `headline_params.district`) | `districts.name_canonical` (`world_geography.ts:37`) + le nom de **fiction** `nomDeDistrict` (`district-names.ts`, 18 noms) | M14, M18 | **forme F** : la donnée existe et est servie ailleurs (`world/districts.name`, `me/buildings.district_name` mesurés) ; les 2 routes du journal ne portent que `district-<id>`. Précédent connu : `lieutenant.name` |
| **L2** | **libellés i18n des 5 catégories** `news_beat_category` | `news_beat.ts:91-97` | M15 (rubrique/angle) | **0** clé servie pour les 5 membres ; **contrôle positif** du motif : `journal.fraicheur.*` = 3 clés. `category` est servi brut ⇒ inaffichable en FR |
| **L3** | **texte par brève** plus riche que les 6 groupes nominaux — **ou** ratifier le trou | `ambient.micro_event.*` (6 valeurs) | M16 | le canon **a déjà les mots du trou** : `journal.bloc.aucune_de_ces_breves_n_a_de_texte` et `journal.bloc.les_breves_sont_arrivees_sans_leur_texte_…_titres_a_trous` ⇒ un trou honnêtement documenté se garde ; c'est la maquette qui doit choisir l'un ou l'autre |
| **L4** | un **`total`** sur `news/feed`, et un compte pour « en cours » | `news.controller.ts:39-48` ; `random-world/active` | M07, M09 | E4/E5 : deux compteurs dessinés sans source de compte |

**B⁻ mesuré (en base, non projeté) — `ambient_micro_event`** (`ambient_world.ts:105-134`) : `game_day`,
`hour_of_week`, `status` (hors feed), `expires_at_game_minute` (**omission délibérée R2.2** → `recency_band`),
`attended_by_player_id`, `attended_at_game_day`, `created_at`. **Aucune n'est dessinée** ⇒ aucune n'est forme F.

## Actions : routes ↔ CTA

| route `@Post` joueur | CTA / geste de la maquette | statut |
|---|---|---|
| `POST /v1/ambient/attend/:id` (`ambient.controller.ts:77`) | « Y PRÊTER ATTENTION » (`journal.bloc.y_preter_attention` servi) | **apparié**, mais global vs par-id (**E8**) ; l'après-geste rend via `cta6 eteint` ✓ |
| son **409** `RESOURCE_STATE_CONFLICT` (2ᵉ attend du même événement, **mesuré**) | — | **route sans CTA** : aucun des 4 cadres ne dessine l'état « déjà assisté / plus là » (`error.resource.state_conflict`) |
| `POST /v1/random-world/hollow/:eventId/attend-funeral` (`random-world.controller.ts:84`) | — | **route sans CTA** : 2ᵈ geste « assister » du jeu, hors de ces cadres — à trancher s'il appartient au journal |
| `GET /v1/news/beats/:id` (route de détail) | — | **route sans prise** : taper une « une » n'est pas dessiné |

## Table de couverture complète

Comptes recomptés par `mesures/controle-arithmetique.py` : **|B| = 27**, **|M non appariés| = 9**,
**somme = 36 = lignes** (positif **rc 0**, négatif **rc 1** — le négatif retire une clé B **non appariée** ;
retirer une clé *appariée* ne contrôlait rien et rendait rc 0, première version corrigée).

### Les 27 clés B (une ligne par clé de route, mesurée sur la pile 8d0184a4)

| # | route | clé | M | statut |
|---|---|---|---|---|
| B01 | `ambient/feed` | `events` | M22 | ✔ liste rendue (mais **E7**) |
| B02 | `ambient/feed` | `total` | M08 | ✔ apparié, valeur en dur (**E5**) |
| B03 | `ambient/feed` | `limit` | – | « passé à côté ? » |
| B04 | `ambient/feed` | `offset` | – | « passé à côté ? » |
| B05 | `ambient/feed` | `event_id` | – | « passé à côté ? » (plomberie) |
| B06 | `ambient/feed` | `district` | M18 | ✔ apparié, slug vs nom (**E6**) |
| B07 | `ambient/feed` | `kind` | M17b | ✔ apparié, kinds inventés (**E2**) |
| B08 | `ambient/feed` | `channel` | – | **« passé à côté ? » ★★★** |
| B09 | `ambient/feed` | `descriptor_i18n_key` | M16 | ✔ apparié, texte sans source (**E1**) |
| B10 | `ambient/feed` | `recency_band` | M19 | ✔ apparié, `fading` non dessinée (**E9**) |
| B11 | `ambient/attend` | `event_id` | – | « passé à côté ? » |
| B12 | `ambient/attend` | `district` | – | **« passé à côté ? » ★★** |
| B13 | `ambient/attend` | `status` | M20 | ✔ rendu par `cta6 eteint` |
| B14 | `ambient/attend` | `residue_band` | M21 | ✔ **exact** |
| B15 | `ambient/attend` | `residue_i18n_key` | M21 | ✔ **exact au byte** |
| B16 | `news/feed` | `beats` | M23 | ✔ la une rendue |
| B17 | `news/feed` | `nextCursor` | – | « passé à côté ? » |
| B18 | `news/feed` | `beat_id` | – | « passé à côté ? » |
| B19 | `news/feed` | `category` | – | **« passé à côté ? » ★★★** + L2 |
| B20 | `news/feed` | `district` | M14 | ✔ apparié, slug vs nom (**E6**) |
| B21 | `news/feed` | `frame_tag_i18n_key` | M15 | ✔ apparié, valeur hors domaine (**E3**) |
| B22 | `news/feed` | `headline_i18n_key` | M12 | ✔ apparié, gabarit ≠ phrase dessinée |
| B23 | `news/feed` | `headline_params` | M12 | ✔ apparié, `{district}` = slug (**E6**) |
| B24 | `news/feed` | `headline_params_fields` | – | « passé à côté ? » (plomberie) |
| B25 | `news/feed` | `outlet_i18n_key` | M10 | ✔ **servi** (« Le Clairon de Brennar ») |
| B26 | `news/feed` | `recency_band` | M11 | ✔ apparié |
| B27 | `random-world/active` | `events` | M09 | ✔ apparié, **mesuré vide** (non vérifié) |

### Les 9 éléments M non appariés

| # | élément M | ce que ça représente | classe |
|---|---|---|---|
| M01 | « ARGENT / 24 850 € » | trésorerie | **hors domaine** (barre partagée) |
| M02 | manomètre + « Tiède » / CHALEUR | chaleur | **hors domaine** (barre partagée) |
| M03 | « JOUR 12 » | jour de jeu | **hors domaine** (servi par `session/open.opened_game_day`) |
| M04 | « Plein jour » | phase du jour | **hors domaine** (servi par `session/open.day_phase`) |
| M05 | « Le journal » | titre du panneau | ✔ **libellé statique ratifié** `journal.bloc.le_journal` |
| M06 | « ce qui se dit ce matin » | sous-titre | ✔ ratifié (`journal.bloc.ce_qui_se_dit_ce_matin` / `journal.moment.titre.dawn`) — **1 des 5 variantes de phase** dessinée |
| M07 | compteur « à la une » = 01 | compte des unes | **DESSINÉ SANS SOURCE** (**E4**) |
| M13 | clé annotée `news.beat.body_found` | clé i18n de la une | **DESSINÉ SANS SOURCE** (**E2**) |
| M17 | clés annotées `ambient.queue_pharmacy` / `night_trucks` / `church_closed` | clés i18n des brèves | **DESSINÉ SANS SOURCE** (**E2**) |

## Annexes

### 1. Routes du domaine — compte trouvé

Le dossier proposait `ambient/` seul ; **le grep du domaine dans tous les contrôleurs en a donné
12** (`git grep -lE "ambient|attend|journal|news\.|beat" -- '**/*.controller.ts'` @`74c5a0b0`).
Après exclusion des `_test` et des `-admin` (BO/staff), les **routes joueur** qui portent cet écran :

| route | ancre | rôle dans ㊳ |
|---|---|---|
| `GET /v1/ambient/feed` | `ambient.controller.ts:53` | **les brèves** (« dans la rue ») |
| `POST /v1/ambient/attend/:id` | `ambient.controller.ts:77` | **le geste** gaté |
| `GET /v1/news/feed` | `news.controller.ts:39` | **la une** — *domaine que le dossier ne nommait pas* |
| `GET /v1/news/beats/:id` | `news.controller.ts:54` | détail d'une une (non dessiné) |
| `GET /v1/random-world/active` | `random-world.controller.ts:46` | candidat « en cours » (mesuré vide) |
| `GET /v1/random-world/known-couplings` | `random-world.controller.ts:59` | hors cadres |
| `POST /v1/random-world/hollow/:eventId/attend-funeral` | `random-world.controller.ts:84` | 2ᵈ geste « assister », hors cadres |

Exclus : `ambient-admin` (3 `@Get`), `ambient-test` (5), `news-admin`, `news-test`, `random-world-admin`,
`random-world-test`, `core-loops-test`, `effect-engine-test`, `vertical-horizon-admin`.

### 2. Corps réels — `mesures/`

- `journal-des-commandes.txt` — commandes + sorties, **jeton masqué** (`Bearer ***`), `X-Server-Build` avant/après.
- `run/` — compte jetable **traçable** `jd3-1794423683` (sub `01a1cbfc-7909-…`) : `signup.json`,
  `session-open.json`, `ambient-feed-VIDE-compte-neuf.json`, `me-buildings.json` (5 bâtiments, district 16),
  `news-feed.json` (16 beats), `world-districts.json` (18), `random-world-active.json` (vide).
- `ambient-avant-consommation/` — le feed **à 2 événements**, les 2 attends (`residue_band: none`), le **409**
  répété, et le feed **vide après les 2 gestes**. ⚠️ provenance : réponses réelles de cette session au build
  `8d0184a4`, mais leur `signup` n'a pu être re-rattaché (le fichier de jeton a été réécrit en cours de
  séquence) ; le **jeu de clés est recoupé champ par champ** sur `AmbientFeedItemView`
  (`ambient.projection.service.ts:38-45`, 6 champs) et `AmbientAttendView` (`ambient-attend-view.ts:13-19`, 5 champs).
- `build-8d0184a4-vs-74c5a0b0.txt`, `phrases-maquette-vs-string-table.txt`, `controle-arithmetique.py`,
  `comparer-phrases.py`, `maquette-2355cb4b.html` (2 673 557 o, md5 `cf61271698f64b293ad6d0f62d70cde3`),
  `cadre-125-avant-geste.html`, `cadre-155-full.html`, `cadre-156-reduced.html`, `cadre-157-minimal.html`,
  `cadre-158-none.html`.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | valeurs | contrainte lue |
|---|---|---|
| `residue_band` | `full` \| `reduced` \| `minimal` \| `none` | union TS `AmbientResidueBand` (`ambient-attend-view.ts:8`) ; `none` **iff** aucune ligne `district_cohesion` (`attendOutcomeView`, ligne 44) ; tier→bande : ≤1 full, =2 reduced, ≥3 minimal (`residueBandForTier:35-39`) |
| `residue_i18n_key` | 4 littéraux `ambient.apres_assister.<band>` | `AMBIENT_RESIDUE_I18N_KEYS` (`ambient-attend-view.ts:24-29`), servis FR+EN (`string_table.ts:3066-3069` / `6057-6060`) |
| `status` (attend) | `'attended'` seul | littéral de `AmbientAttendView` (le contrôleur jette avant sur 404/409) |
| `recency_band` | `fresh` \| `settling` \| `fading` | union TS (`ambient.projection.service.ts:31`) ; seuils fraction > 2/3, > 1/3 (ligne 76) |
| `kind` | 6 : `corner_fight`, `stalled_tram`, `delayed_shipment`, `noisy_block`, `building_inspection`, `bar_rumor` | pgEnum `ambient_micro_event_kind` (`ambient_world.ts:48-55`) |
| `channel` | 3 : `constant_hum`, `trade_channel`, `bar_talk` | pgEnum `ambient_channel` (`ambient_world.ts:58`) |
| `category` | 5 : `national`, `brennar_local`, `business`, `arts`, `sports` | pgEnum `news_beat_category` (`news_beat.ts:91-97`) ; `sports` sans producteur jour-1 (commentaire ligne 89) |
| `frame_tag_i18n_key` | 8 `news_beat.frame_tag.*` + **null** | clés servies (`string_table.ts`) ; null mesuré 10/16 |
| `district` | `district-<id>`, id 1..18 | `districts.id` (`world_geography.ts:34`) ; noms de fiction : `district-names.ts` |
| `limit` / `offset` | 1..100 / ≥0 | clamp `ambient.controller.ts:62-65` (défaut 20, plafond `FEED_MAX_LIMIT`) |

### 4. Inventaire M — le diff qui délimite le chunk gaté

`diff` cadre 125 → chacun des 4 cadres (sortie en Annexe 2) : **3 deltas**, rien d'autre.

    3c3   < Le journal — ce qui se dit ce matin
          > Le journal — après « Y PRÊTER ATTENTION » · bande full
    122c122 < <span class="cta6">          > <span class="cta6 eteint">
    125c125 < on peut assister à ce qui se passe — c'est le seul geste que la rue accepte
            > On vous a vu. La rue s'en souviendra.

Les 5 cadres sont repérés par le **libellé** de `<div class="etiquette">` (159 étiquettes, 159 cadres) et
retrouvés aux index **0-based 125 / 155 / 156 / 157 / 158**, conformes au dossier. Compte binaire par
cadre, identique aux 5 : `une=1 brv=3 fen=3`, compteurs `01/04/03`, pastilles `#f2c96b #f2c96b #b9ad92`,
`qd = ce matin / ce matin / hier`.

Les 23 éléments M (M01-M23) sont encodés dans `mesures/controle-arithmetique.py` ; les 9 non appariés
sont détaillés dans la table de couverture ci-dessus.

### 5. Inventaire F

**Sans objet** — mode maquette, le front de cet écran n'existe pas.

### 6. Non vérifié

1. **Les bandes `full` / `reduced` / `minimal` — non reproductibles.** `residue_band` vaut `none` dès que
   le joueur n'a aucune ligne `district_cohesion`, ce qu'un compte neuf n'a jamais (le semis paresseux
   `ensureSeeded` est **privé**, aucune entrée publique — en-tête de `ambient-attend.service.ts`). **Mesuré
   2 fois `none`**, y compris au **2ᵉ** attend du même `game_day` (tier 2 ⇒ `reduced` si une ligne existait) :
   c'est bien `cohesionApplied=false` qui décide, pas le tier. **Ce qui trancherait** : un compte ayant
   franchi une frontière NIGHTLY, puis 1ᵉʳ/2ᵉ/3ᵉ attend du même jour. **Non fait délibérément** : exige une
   action d'horloge **hors du domaine ambient** (interdit du dossier).
2. **`GET /v1/news/beats/:id`** — non exercée (aucun détail dessiné).
3. **Clés d'item de `random-world/active`** — corps mesuré **vide** (`{events: []}`) ⇒ la forme de la source du
   compteur « en cours » reste inconnue. Trancherait : un compte avec un événement random-world actif.
4. **`recency_band` `fresh` / `fading` sur `news/feed`** — 16/16 beats mesurés en `settling`.
5. **La barre partagée (M01-M04)** — hors domaine du dossier ; sources non mesurées (argent et chaleur
   viennent de routes hors `ambient`/`news`).
6. **Un feed `ambient` non vide sur compte *traçable*.** Mes 2 attends ont consommé les 2 événements `live`
   **de ville** du district 16 (`ambient_micro_event` n'a **pas** de `player_id` ; la table est du contenu
   city-global) ⇒ le compte neuf du run voit `total: 0` alors qu'il possède bien **5 bâtiments** en district 16
   (`me-buildings.json`) : la garde qui ferme est `status='live'`, **pas** la garde de bâtiments
   (`ambient-micro-event.repository.ts:184-209`). **Effet de bord à déclarer** : 2 événements de ville sont
   passés à `attended` définitivement. Trancherait : re-mesurer après le prochain tick de génération.
7. **Les 5 variantes de phase** `journal.moment.titre.*` et les 5 `journal.moment.vide.*` — la maquette fige
   la variante `dawn` ; ni le titre dépendant de la phase ni les 5 états vides ne sont dessinés dans ces cadres.
8. **Aucun rendu PNG** n'était fourni : tout M est lu dans la source HTML épinglée, jamais sur des pixels.
