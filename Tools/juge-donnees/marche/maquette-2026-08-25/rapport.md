# Juge données ⊥ — Le Marché (screen_b1 « Substance Market ») — mode MAQUETTE — 2026-08-25

## En une phrase

La maquette montre **18 informations**, dont **5 seulement** ont une clé dans les **27 clés** que
les 4 routes de lecture joueur du domaine renvoient réellement : **13 éléments dessinés n'ont
aucune source** (dont la LISTE elle-même, la taxonomie Matières/Services/Influence, le NOM des
articles et le PRIX d'achat) et **19 clés disponibles ne sont pas dessinées** — le tout sur un
écran qui, côté maquette, ne porte **aucune action** alors que le domaine expose **4 routes de
mutation joueur**.

⚠️ **Écart de NATURE, à trancher avant tout le reste** : le canon `screen_b1_substance_market.md`
décrit un écran de **lecture d'inférence** par *district × substance*, en **buckets uniquement**
(« sans jamais voir le prix modal P … ni le scalaire de confiance c brut », `:126`). La maquette
est un **catalogue d'achat** avec prix en dollars et variations en pourcentage. Ce ne sont pas deux
présentations du même écran : ce sont deux écrans.

---

## Écarts à consigner (mode maquette — pas de colonne F)

Classement : **A** = dessiné, rien en base ni en projection · **B** = dessiné, existe en base, non
projeté (**forme F**, lot back) · **C** = dessiné, projeté mais sur une autre clé / un autre axe.

| # | information | B | M | statut | classe | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|---|
| E1 | **La LISTE des articles** (composition, ordre, cardinal 5) | – | M16 | dessiné sans source | **A** | 0 route d'énumération : sur **163** routes joueur, **3** portent `market` dans leur chemin et aucune n'énumère (`market.controller.ts:60` exige le couple `:districtId/:substanceType`). ASSUMÉ du dossier **CONFIRMÉ**. |
| E2 | **Taxonomie « Matières / Services / Influence »** (+ « Tout ») | – | M04–M07 | dessiné sans source | **A** | Aucune table, aucun enum de catégorie. `substance_type` = 4 membres (`operational_chain.ts:40`), `precursor_type` = 6 (`operational_chain.ts:37`) — deux domaines fermés, aucun ne se découpe ainsi. |
| E3 | **Nom de fiction** de l'article (« Alcool de contrebande », « Faveur du greffe »…) | – | M09b | dessiné sans source | **A** | `GET /v1/i18n/bundle?locale=fr` → **67** clés, dont **0** contenant `precursor\|substance\|market\|brindle\|crick\|hush\|ash\|price\|trend` (contrôle positif sur `auth\|lieutenant` : **14**). `substance-config.ts:173` ne porte **aucun** champ de libellé. Zéro colonne de nom en base. |
| E4 | **Prix d'ACHAT en dollars** (`$ 340`, `$ 85`, `$ 61`, `$ 1 200`) | – | M11 | dessiné, projeté sur un AUTRE axe | **C** | Aucune route joueur du domaine ne renvoie un prix d'achat. Le seul montant en dollars-jeu projeté sur une lecture, dans les **24 corps mesurés** : `cash_cents` (`03-wallet.json`). Le seul prix *de marché* projeté est `signal.medianCents` — un **prix de VENTE médian**, agrégé entre joueurs (`meta-market.controller.ts:95-101`), pas un tarif d'achat. |
| E5 | **Variation en pourcentage** (`▲ 4%`, `▼ 2%`, `▲ 9%`, `▲ 12%`) | – | M13 | dessiné sans source | **A** | Aucune magnitude n'est projetée : les deux tendances existantes sont **ternaires** — `price_trend_bucket` ∈ `UP\|STABLE\|DOWN` (`precursor_market_state.ts:48`) et `signal.trend` ∈ `up\|stable\|down` (`meta-market-read.service.ts:63`). Un pourcentage est un scalaire ⇒ **interdit par R2.2** sur le principe même. |
| E6 | **Unité de vente** (« La caisse de 12 », « Le sac de 50 kg », « La rame ») | – | M10 | dessiné sans source | **A** | La seule légende d'unité jamais projetée est `stock_liters_label` (mesuré `"0 L"`, `12-precursors-lab.json`) — et c'est une légende de **stock**, pas de lot de vente. `yieldGrams` / `precursorUnitsPerBatch` sont des tunables serveur (`substance-config.ts:174-224`), jamais projetés. |
| E7 | **Délai « Discrète, sous 48 h »** | B⁻ | M17 | en base, non projeté | **B (forme F)** | `precursor_order.arrives_at_tick : bigint` existe (mesuré `\d precursor_order`) ; la projection ne porte que le booléen `has_pending_order` (`precursors.projection.service.ts:47`). |
| E8 | **Raison de l'indisponibilité** (« descente en cours ») | B⁻ | M15 | en base, non projeté sur ce domaine | **B (forme F)** | `scarcity_active` est projeté (booléen, mesuré `false`) mais **sans sa cause ni sa fin** : `disruption_event_id` et `disruption_start_day` restent en base (`precursor_market_state.ts:101,109`). La « descente » policière, elle, vit sur une AUTRE route : `recently_raided` / `structural_state` / `seized_amount` (`22-building-lab.json`, 24 clés). |
| E9 | **« Prix du soir »** (l'époque de cotation) | – | M03a | dessiné sans source | **A** | Aucune clé d'époque projetée. Les cadences existent (clearing de lane **HOURLY/1**, `city_sim_scheduler.service.ts:317` ; inférence précurseurs **NIGHTLY**), mais rien ne les expose. `session/open` ne rend que `opened_game_day` (mesuré, `02-session-open.json`). |
| E10 | **Fraîcheur de la donnée sur la route de LANE** (« MAJ il y a 2 h ») | B⁻ | M03b | en base, non projeté | **B (forme F)** | `lane_pricing_state.updated_at` et `precursor_market_state.updated_at` existent (`\d`) ; ni l'une ni l'autre n'apparaît dans les corps mesurés (`11-market-lane-16-brindle.json` = **3 clés**, `12-precursors-lab.json` = **9 clés**). Seul `meta-market/signal` porte un horodatage (`lastAggregatedAt`). |
| E11 | **Aucune notion de DISTRICT dans la maquette** | ● | – | disponible et structurant, non dessiné | **C** | Les deux surfaces de marché sont **obligatoirement** scopées : `:districtId/:substanceType` (`market.controller.ts:60`) et `?substance=&district_profile=` (**422** si absent — mesuré `08-meta-market-signal.json`). Un écran de marché sans axe district ne peut appeler **ni l'une ni l'autre**. |
| E12 | **Aucune action** sur la maquette | ● | – | 4 routes de mutation sans CTA | **C** | Le cadre L306-328 ne contient ni `cta`, ni `SIGNER`, ni `href`, ni `bouton` (contrôle : 4 motifs → `False` chacun). Côté back : `POST operational/precursors/order` (`precursors.controller.ts:60`), `POST operational/dealer/assign` (`:62`), `POST operational/dealer/:id/collect` (`:81`), `PUT me/meta-market/visibility` (`:112`). |
| E13 | **Le pictogramme** par article | – | M08 | dérivable, sans domaine à parcourir | **A (mineur)** | Un picto par article est dérivable d'une identité fermée — mais il n'existe **aucune** liste d'articles à mapper (E1/E2). Le picto est donc dessiné sur une population indéfinie. |

---

## « Passé à côté ? » — pour l'user (les 19 clés disponibles et non dessinées, par intérêt)

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| Q1 | `signal.p10Cents` / `signal.p90Cents` (`GET /v1/me/meta-market/signal`) | La **fourchette** réelle des prix pratiqués, pas seulement la médiane : « entre X et Y » | **Utile ici, et c'est la vraie information de marché** — une médiane seule ne dit pas s'il faut vendre maintenant. C'est aussi ce qui remplace honnêtement le « ▲ 4% » inventé : une fourchette est un fait, un pourcentage est un scalaire interdit. | ★★★ |
| Q2 | `signal.sampleCount` (idem) | Sur combien de transactions réelles la cotation repose | **Utile** : c'est la confiance de la cotation, en clair. Un prix issu de 5 ventes ne se lit pas comme un prix issu de 200. | ★★★ |
| Q3 | `signal` = `'insufficient_signal'` (idem) | « Trop peu de monde a vendu ça pour que je te donne un prix » | **Utile, et incontournable** : c'est l'état par DÉFAUT (mesuré sur compte frais : `insufficient_signal`). La maquette n'a aucun état pour ça — elle suppose toujours un prix. | ★★★ |
| Q4 | `lane_confidence_bucket` (`GET /v1/me/market/lanes/:d/:s`) | Si la lane écoule vite ou se bouche : `LOW` / `MODERATE` / `HIGH` | **Utile ici** : c'est LE signal que le canon B1 met au centre, et c'est la seule des 4 mécaniques marché qui soit vivante en production. | ★★★ |
| Q5 | `margin_band` (`GET /v1/operational/dealers`) | Quelle substance rapporte le plus : `STANDARD` / `ELEVATED` / `PREMIUM` / `HIGH_PREMIUM` | **Utile ici** : c'est « qu'est-ce qui vaut le coup », en une bande, sans exposer un multiplicateur. | ★★☆ |
| Q6 | `price_trend_bucket` sur les **6** types de précurseurs | La tendance d'achat, par matière première | **Utile mais bloqué** : `GET /v1/operational/precursors` la rend **par BÂTIMENT** (un seul type à la fois, mesuré : le labo et le stash rendent tous deux `PYRALIN`). Il n'existe aucune lecture « les 6 tendances ». En base : **5 lignes vivantes, toutes `UP`** — donnée réelle, inatteignable en liste. | ★★★ |
| Q7 | `district_id` (`GET /v1/me/market/lanes/:d/:s`) | Que le marché est un fait **local**, district par district | **Utile ici** — voir E11. Sans lui l'écran n'a rien à appeler. | ★★★ |
| Q8 | `stock_band` + `stock_liters_label` (`GET /v1/operational/precursors`) | Ce qu'il reste en réserve, avant d'acheter | **Utile ici** : acheter sans savoir ce qu'on a est la décision aveugle typique. | ★★☆ |
| Q9 | `has_pending_order` / `has_arrived_order` (idem) | Une commande est déjà en route / est arrivée | **Utile ici** : évite la double commande. | ★★☆ |
| Q10 | `supplier_pressure_bucket` (idem) | `FRESH` / `USED` / `STRAINED` — l'usure de la relation fournisseur | **Peut-être** : c'est de la couleur relationnelle, pas une décision. À garder pour une fiche fournisseur. | ★☆☆ |
| Q11 | `scarcity_active` (idem) | Une rupture d'approvisionnement est en cours | Déjà apparié à M14, mais **la maquette la traite comme un état de l'ARTICLE** alors que le back la porte **par type de précurseur, globalement**. | ★★☆ |
| Q12 | `activity_band` / `cash_band` / `withdrawn` / `addiction_loyalty_status` / `dealer` / `dealers` (`GET /v1/operational/dealers`) | L'état du réseau de vente : qui travaille, qui a de la caisse à ramasser | **Pas ici** : c'est l'écran « mes dealers », pas le marché. À router. | ★☆☆ |
| Q13 | `building` (`GET /v1/operational/precursors`) | Le bâtiment auquel la commande est rattachée | **Pas ici** en tant qu'affichage, mais **obligatoire en paramètre** : sans bâtiment choisi, la route ne répond pas. | ★☆☆ |
| Q14 | `substance` (`GET /v1/operational/dealers`) | Doublon d'identité avec `substance_type` / `precursor_type` | **Pas ici** : plomberie. | ★☆☆ |

---

## Lots back suggérés (B⁻ dessiné, ou dessiné sans source — forme F et au-delà)

| # | manque | table / source | maquette | preuve | geste |
|---|---|---|---|---|---|
| L1 | **Une route d'ÉNUMÉRATION du marché** | — | M16 (la liste) | 0/163 routes joueur n'énumère ; `market.controller.ts:60` exige le couple | Le canon la prévoit déjà : `substance_market.lane_summary.get` — `GET /v1/me/substance-market/lanes`, marquée **[à ajouter au catalogue 18]** (`screen_b1_substance_market.md:273`). C'est le maillon manquant, pas une route de confort. |
| L2 | **Une TABLE DE NOMS** (article → clé i18n) | aucune | M09b | 67 clés i18n, 0 pour le domaine | Même trou que « bâtiments et dealers n'ont aucune table de noms » (lot 0 conventions). |
| L3 | `updated_at` non projeté | `lane_pricing_state.updated_at`, `precursor_market_state.updated_at` | M03b « MAJ il y a 2 h » | `\d lane_pricing_state` (8 colonnes) vs corps mesuré (3 clés) | Ajouter une **bande de fraîcheur**, pas l'horodatage brut — précédent maison : `recency_band` sur `news/feed` (mesuré, `19-news-feed.json`). |
| L4 | `arrives_at_tick` non projeté | `precursor_order.arrives_at_tick` | M17 « sous 48 h » | `\d precursor_order` vs 9 clés projetées | Bande de délai (R2.2), jamais le tick. |
| L5 | Tendance précurseurs **par type**, pas par bâtiment | `precursor_market_state` (5 lignes vivantes) | M12 sur 5 lignes | mesure SQL : 5 lignes, toutes `price_trend=UP` | Une lecture « les N types et leur bande » — la donnée existe déjà et bouge. |
| L6 | Cause / fin d'une indisponibilité | `precursor_market_state.disruption_event_id`, `disruption_start_day` | M15 | `precursor_market_state.ts:101,109` | Projeter une **raison** en clé i18n, jamais l'id d'événement. |

⚠️ **L1 est bloquant pour l'écran, les autres ne le sont pas** : sans énumération, la maquette n'a
littéralement rien à peupler — chaque ligne dessinée exige aujourd'hui que le joueur ait DÉJÀ
choisi un district et une substance.

---

## Actions : routes ↔ CTA

**CTA / gestes de la maquette : 0.** Vérifié sur le cadre L306-328 : aucun `cta`, `SIGNER`,
`bouton`, `href`, `onclick`, `data-` (6 motifs, tous `False`). Le seul contrôle est le retour
« ‹ » (`ecrans-brennar.html:309`).

| geste | route back | statut |
|---|---|---|
| — | `POST /v1/operational/precursors/order` (`precursors.controller.ts:60`) | **route sans CTA** — c'est l'achat que l'écran devrait porter |
| — | `POST /v1/operational/dealer/assign` (`selling.controller.ts:62`) | route sans CTA (relève d'un écran « dealers ») |
| — | `POST /v1/operational/dealer/:id/collect` (`selling.controller.ts:81`) | route sans CTA (idem) |
| — | `PUT /v1/me/meta-market/visibility` (`meta-market.controller.ts:112`) | route sans CTA — **et c'est elle qui allume ou éteint le prix** : opt-out ⇒ `insufficient_signal` immédiat (`meta-market-read.service.ts:219-221`) |
| « ‹ » retour | — | contrôle de navigation, hors couverture données |

**Hors domaine mais de même famille** (un « marché » au sens large) : `POST /v1/operational/building/purchase`
(`real-estate.controller.ts:89`) et `POST /v1/operational/vehicles/purchase` (`vehicle-roster.controller.ts:53`)
achètent, eux aussi, **sans qu'aucune route ne publie leur prix au préalable** — le montant
n'apparaît que dans le message du **409** (`vehicle-roster.controller.ts:72`). Si « Planque du port »
est bien un bien immobilier, c'est le même trou une troisième fois.

---

## Table de couverture complète

### Comptes

- **|B| = 27** clés distinctes, réparties sur les 4 routes de lecture joueur du domaine : **3** (R1) + **9** (R2) + **7** (R3) + **8** (R4).
  *R1 et R2 sont comptées sur le corps MESURÉ (3 et 9 clés) ; R3 = `signal` + les 6 clés de la branche de succès ; R4 = le conteneur `dealers` + les 7 clés de `DealerProjection` (`selling.projection.service.ts:63-88`).*
- **|M| = 18** éléments porteurs d'information (M01 « retour » exclu — contrôle de navigation, comptabilisé dans Actions).
- **M appariés à au moins une clé B = 5** (M03b, M09a, M11, M12, M14) ; **8** clés B les couvrent.
- **Clés B non dessinées = 27 − 8 = 19.**
- **|M non apparié| = 18 − 5 = 13.**
- **Somme = 27 + 13 = 40 lignes.** ✔ (mode maquette : pas de colonne F, donc pas de terme « rendus F sans source »).

> Ce contrôle a mordu : ma première rédaction annonçait `|B| = 28` en créditant R4 de 9 clés.
> `DealerProjection` en porte **7** (+ le conteneur `dealers`) = **8**. Corrigé ici, et le compte
> par route est écrit à côté du total pour que l'écart soit relisible.

### Lignes

#### Clés B appariées (8 clés → 5 éléments M)

| # | information | clé B (route) | M | statut |
|---|---|---|---|---|
| 1 | identité de l'article | `substance_type` (R1) | M09a | ● ● affiché comme dessiné (identité seulement — le NOM manque, E3) |
| 2 | identité de l'article | `precursor_type` (R2) | M09a | ● ● idem |
| 3 | identité de l'article | `substance` (R4) | M09a | ● ● idem |
| 4 | tendance de prix | `price_trend_bucket` (R2) | M12 | ● ● direction OK, magnitude sans source (E5) |
| 5 | tendance de prix | `signal.trend` (R3) | M12 | ● ● idem |
| 6 | indisponibilité | `scarcity_active` (R2) | M14 | ● ● axe différent (par précurseur, pas par article) |
| 7 | prix | `signal.medianCents` (R3) | M11 | ● ● **prix de VENTE médian ≠ prix d'ACHAT** (E4) |
| 8 | fraîcheur | `signal.lastAggregatedAt` (R3) | M03b | ● ● OK sur cette route seule (E10 pour les deux autres) |

#### Clés B non dessinées (19) — « passé à côté ? »

| # | clé B | route | renvoi |
|---|---|---|---|
| 9 | `district_id` | R1 | Q7 / E11 |
| 10 | `lane_confidence_bucket` | R1 | Q4 |
| 11 | `building` | R2 | Q13 |
| 12 | `stock_band` | R2 | Q8 |
| 13 | `has_pending_order` | R2 | Q9 |
| 14 | `has_arrived_order` | R2 | Q9 |
| 15 | `stock_liters_label` | R2 | Q8 |
| 16 | `supplier_pressure_bucket` | R2 | Q10 |
| 17 | `signal` (discriminant `insufficient_signal`) | R3 | Q3 |
| 18 | `signal.p10Cents` | R3 | Q1 |
| 19 | `signal.p90Cents` | R3 | Q1 |
| 20 | `signal.sampleCount` | R3 | Q2 |
| 21 | `dealers` (conteneur) | R4 | Q12 |
| 22 | `dealer` | R4 | Q12 |
| 23 | `activity_band` | R4 | Q12 |
| 24 | `cash_band` | R4 | Q12 |
| 25 | `margin_band` | R4 | Q5 |
| 26 | `addiction_loyalty_status` | R4 | Q12 |
| 27 | `withdrawn` | R4 | Q12 |

Répartition : R1 **2** · R2 **6** · R3 **4** · R4 **7** = **19**.
**8 appariées + 19 non dessinées = 27 = |B|.** ✔

#### Éléments M sans clé B (13)

| # | M | contenu | statut | renvoi |
|---|---|---|---|---|
| 28 | M02 | titre « Le Marché » | libellé statique — aucune source requise | — |
| 29 | M03a | « Prix du soir » | dessiné sans source | E9 |
| 30 | M04 | filtre « Tout » (+ état sélectionné) | dessiné sans source | E2 |
| 31 | M05 | filtre « Matières » | dessiné sans source | E2 |
| 32 | M06 | filtre « Services » | dessiné sans source | E2 |
| 33 | M07 | filtre « Influence » | dessiné sans source | E2 |
| 34 | M08 | pictogramme par article | dessiné sans population à mapper | E13 |
| 35 | M09b | nom de fiction de l'article | dessiné sans source | E3 |
| 36 | M10 | unité de vente (« La caisse de 12 »…) | dessiné sans source | E6 |
| 37 | M13 | magnitude de variation (`4%`, `2%`, `9%`, `12%`) | dessiné sans source, et interdit R2.2 | E5 |
| 38 | M15 | « Indisponible — descente en cours » | en base, non projeté | E8 |
| 39 | M16 | la LISTE (composition, ordre, cardinal 5) | dessiné sans source — **bloquant** | E1 |
| 40 | M17 | « Discrète, sous 48 h » (délai) | en base, non projeté | E7 |

---

## Annexes

### 1. Routes du domaine (compte, ancres)

Balayage : **1017** décorateurs de route dans `services/game-back/src/**/*.controller.ts` ;
**163** portent `JwtAuthGuard` hors `-test.controller.ts` / `-admin.controller.ts`.
⚠️ *Caveat d'instrument* : mon extracteur attribue le préfixe `@Controller` du **premier** contrôleur
d'un fichier à tous ses contrôleurs ; il a rendu `/auth/me` pour ce qui est en réalité `/v1/me`
(`auth.controller.ts:339` déclare un SECOND contrôleur sans préfixe). **Les 9 routes du domaine
ci-dessous sont donc lues directement dans les fichiers, pas dérivées de l'extracteur** — et 5 des 9
sont vérifiées par une mesure HTTP réelle.

| # | route | ancre | garde | mesurée |
|---|---|---|---|---|
| R1 | `GET /v1/me/market/lanes/:districtId/:substanceType` | `operational/market/market.controller.ts:60` | `:61` | ✅ 200 (`11-…json`) |
| R2 | `GET /v1/operational/precursors?building_id=` | `operational/precursors/precursors.controller.ts:80` | `:81` | ✅ 200 ×2 (`12-`, `13-`) |
| R3 | `GET /v1/me/meta-market/signal?substance=&district_profile=` | `operational/meta_market/meta-market.controller.ts:75` | `:76` | ✅ 200 + 422 (`21-`, `08-`) |
| R4 | `GET /v1/operational/dealers` | `operational/selling/selling.controller.ts:116` | `:117` | ✅ 200 (`07-`) |
| R5 | `GET /v1/operational/dealer/:id` | `operational/selling/selling.controller.ts:99` | `:100` | ❌ (0 dealer sur compte frais) |
| A1 | `POST /v1/operational/precursors/order` | `operational/precursors/precursors.controller.ts:60` | `:62` | ❌ (non exercée — mutation) |
| A2 | `POST /v1/operational/dealer/assign` | `operational/selling/selling.controller.ts:62` | `:64` | ❌ (idem) |
| A3 | `POST /v1/operational/dealer/:id/collect` | `operational/selling/selling.controller.ts:81` | `:83` | ❌ (idem) |
| A4 | `PUT /v1/me/meta-market/visibility` | `operational/meta_market/meta-market.controller.ts:112` | `:113` | ❌ (idem) |

**Routes du CANON absentes du back (4 motifs, tous à 0 sur les 1017)** :
`markets/` → 0 · `market/book` → 0 · `market/orders` → 0 · `market/transactions` → 0 ·
`substance-market` → 0. Les 3 routes `market.*` déclarées REUSE par
`screen_b1_substance_market.md:270-276` et les 3 projections `substance_market.*` n'existent donc
**dans aucune forme**. *(Contrôle positif du même balayage : `me/market/lanes` → 1 hit, mesuré 200.)*

**Routes portant `market` dans leur chemin, toutes catégories : 74** — dont **3** joueur, **9**
admin, **62** `_test`.

### 2. Corps réels — `mesures/` + commandes

Compte frais `jd-marche-1787683812`, créé par `POST /v1/auth/signup` (`Idempotency-Key` requis,
`auth.controller.ts:229-262`) puis `POST /v1/session/open {"client_version":"juge-donnees-1.0"}`.
Le compte de démo n'a **pas** été touché. Aucun conteneur monté ni redémarré.
Script de mesure : `mesures/fetch.sh`.

| fichier | route | code | clés |
|---|---|---|---|
| `01-signup.json` | `POST /v1/auth/signup` | 201 | 9 |
| `02-session-open.json` | `POST /v1/session/open` | 200 | 12 |
| `03-wallet.json` | `GET /v1/economy/wallet` | 200 | 3 (`player_id`, `cash_cents`, `wallet_band`) |
| `06-iap-catalogue.json` | `GET /v1/iap/catalogue` | 200 | `skus[]` — **le seul catalogue du back**, mais en **Marks** (monnaie premium), pas en dollars-jeu |
| `07-dealers.json` | `GET /v1/operational/dealers` | 200 | `{dealers: []}` — vide, compte frais |
| `08-meta-market-signal.json` | `GET /v1/me/meta-market/signal` (sans params) | **422** | `substance and district_profile query params are required.` |
| `10-market-lanes-probe.txt` | `GET …/me/market/lanes/{1..18}/{4 substances}` | **71×404, 1×200** | voir §6 |
| `11-market-lane-16-brindle.json` | `GET /v1/me/market/lanes/16/brindle` | 200 | **3** : `district_id`, `substance_type`, `lane_confidence_bucket=HIGH` |
| `12-precursors-lab.json` | `GET /v1/operational/precursors?building_id=<labo>` | 200 | **9** (voir §3) |
| `13-precursors-stash.json` | idem, `<stash>` | 200 | **9**, identiques — `PYRALIN` dans les deux cas |
| `21-metamarket-brindle-verge.json` | `GET /v1/me/meta-market/signal?substance=brindle&district_profile=verge` | 200 | **1** : `signal: "insufficient_signal"` |
| `22-building-lab.json` | `GET /v1/operational/building/<labo>` | 200 | 24 (hors domaine — porte `recently_raided`, `structural_state`, `seized_amount`) |
| `23-storage-lab.json` | `GET /v1/operational/storage/<labo>` | 200 | 6 (`product_band`, `purity_band`, `temperature_status`, `degrading`) |
| `24-lab.json` | `GET /v1/operational/lab/<labo>` | 200 | 3 |

**Contrôle « aucun prix en dollars-jeu »** : balayage des 24 corps mesurés sur
`cents\|price\|marks` → **4 fichiers**, et un seul montant en dollars-jeu : `cash_cents`
(`03-wallet.json`). Les autres hits sont `price_trend_bucket` (une bande) et `price_store_product_id` /
`marks_*` (magasin réel).

**Dimensionnement de R1 (compte frais insuffisant)** : sur compte frais **72/72 → 404**.
`lane_pricing_state` ne contient qu'**une** ligne dans toute la base (`16 | brindle`), et
l'unique écrivain de production est `selling-sell.service.ts:370` (`ensureLane`), atteint
uniquement quand un dealer assigné vend réellement — chaîne à 4 préconditions que le spec E2E
énumère lui-même (`tests/e2e/operational/market_lane_confidence_route.spec.ts:210-227` : dealer-spot
opérationnel + lek vivant + produit en stock + un tick MINUTE). **J'ai mesuré sur la ligne
préexistante plutôt que d'en semer une** — `lane_pricing_state` est une table **globale** partagée,
et un semis y aurait laissé une trace permanente.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine | source de la contrainte |
|---|---|---|
| `substance_type` | `brindle` · `crick` · `hush` · `ash` | `pgEnum('substance_type', …)` — `db/schema/operational_chain.ts:40` |
| `lane_confidence_bucket` | `LOW` · `MODERATE` · `HIGH` | `market-projection.service.ts:37` ; seuils `laneCHi`/`laneCLo` (`:125-127`) |
| `district_id` | entier 1..18 | FK `lane_pricing_state_district_id_fkey → districts(id)` ; `SELECT count(*) FROM districts` → **18** |
| `precursor_type` (projeté) | `PYRALIN` · `THALMITE` · `GARNET_SALT` · `VERDANT_ROOT_EXTRACT` · `LULL_RESIN` · `GLASS_LILY` | enum majuscule — `precursorEnumLabel`, `precursors.projection.service.ts:44-46` ; enum source `operational_chain.ts:37` (6 membres) |
| `stock_band` | `NONE` · `LOW` · `MEDIUM` · `HIGH` | `precursors.projection.service.ts:36` ; coupures 10 / 50 unités (`:98-99`) |
| `stock_liters_label` | légende de bande, ex. `"0 L"` | `:38` + `stockLitersLabel` (`:184`) |
| `price_trend_bucket` | `UP` · `STABLE` · `DOWN` | `pgEnum('price_trend', …)` — `db/schema/precursor_market_state.ts:48` |
| `scarcity_active` | booléen | `precursor_market_state.scarcity_active NOT NULL DEFAULT false` |
| `supplier_pressure_bucket` | `FRESH` · `USED` · `STRAINED` | `precursor-supplier-pressure.service.ts:56` |
| `has_pending_order` / `has_arrived_order` | booléens | dérivés de `precursor_order.status` ∈ `pending\|in_transit\|delivered\|seized` (`operational_chain.ts:35`) |
| `signal` | `'insufficient_signal'` **ou** l'objet à 6 clés | `meta-market.controller.ts:44-51` |
| `signal.trend` | `up` · `stable` · `down` | `meta-market-read.service.ts:63` |
| `signal.medianCents` / `p10Cents` / `p90Cents` | chaîne (bigint sérialisé), en **cents** | `meta-market.controller.ts:97-99` ; colonnes `bigint` (`\d meta_market_signals`) |
| `signal.sampleCount` | entier ≥ `sampleFloor` (défaut **5**) | `meta-market-read.service.ts:123-129` |
| `signal.lastAggregatedAt` | ISO-8601 | `meta-market.controller.ts:100` |
| `activity_band` | `WORKING` · `IDLE` · `ABSENT` · `COMPROMISED` | `selling.projection.service.ts:40` |
| `cash_band` | `NONE` · `LOW` · `MODERATE` · `HIGH` · `FULL` | `selling.projection.service.ts:43` |
| `margin_band` | `STANDARD` · `ELEVATED` · `PREMIUM` · `HIGH_PREMIUM` | `selling.projection.service.ts:57` |
| `substance` (dealer) | `BRINDLE` · `CRICK` · `HUSH` · `ASH` | `selling.projection.service.ts:60` |
| `addiction_loyalty_status` | `LOW` · `STABLE` · `HIGH` · `null` | `hush-addiction.service.ts:31` |
| `withdrawn` | booléen | `selling.projection.service.ts:87` |

**B⁻ — en base, non projeté** (colonnes lues à `\d`, confrontées aux corps mesurés) :

| table | colonnes non projetées | interdites R2.2 ? |
|---|---|---|
| `lane_pricing_state` (8 col.) | `p_cents`, `w_cents`, `c`, `t_refractory_minutes`, `created_at`, `updated_at` | les 4 premières **oui** (`market.controller.ts:16-17`) ; `updated_at` **non** → E10/L3 |
| `precursor_market_state` (8 col.) | `demand_accumulator`, `disruption_event_id`, `disruption_start_day`, `last_inference_day`, `created_at`, `updated_at` | `demand_accumulator` **oui** (`:84`) ; les autres **non** → E8/E10 |
| `precursor_order` (8 col.) | `order_id`, `quantity_units`, `status`, `ordered_at_tick`, `arrives_at_tick` | `quantity_units`/ticks **oui** en brut ; une **bande de délai** ne l'est pas → E7/L4 |
| `product_storage` (8 col.) | `quantity_grams`, `age_in_storage_hours` (bruts) — `purity_grade` est projeté en `purity_band` sur `GET /operational/storage/:id` | — |
| `meta_market_signals` (8 col.) | `region_id` seul (masqué volontairement — `meta_market_privacy_wall.spec.ts:658`) | oui, par conception |

### 4. Inventaire M (Mxx → représente)

Source : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar.html`, cadre « Marché — le patron
« table » », **lignes 306-328** (la ligne 363 du fichier est le data-URI de 4 Mo ; le cadre n'y est
pas). Rendu ratifié : `Tools/juge-visuel/marche/ecran-canon.png` — confronté au HTML, **identique**
(5 lignes, 4 chips, en-tête à 2 niveaux, aucun bouton).

| id | ancre | texte / valeur | représente |
|---|---|---|---|
| M01 | `:309` `.retour` | `‹` | retour (contrôle, → Actions) |
| M02 | `:309` `h3` | « Le Marché » | titre d'écran |
| M03a | `:309` `.sous` | « Prix du soir » | l'époque de cotation |
| M03b | `:309` `.sous` | « MAJ il y a 2 h » | l'âge de la donnée |
| M04 | `:311` `.filtre .on` | « Tout » | catégorie active (état sélectionné) |
| M05 | `:311` | « Matières » | catégorie |
| M06 | `:311` | « Services » | catégorie |
| M07 | `:311` | « Influence » | catégorie |
| M08 | `:312,315,318,321,324` `.picto svg` | 5 pictos (bouteille, sac, rame, pièce, mallette) | nature de l'article |
| M09a | `:313,316,319,322,325` `.nom` | — | identité de l'article |
| M09b | idem | « Alcool de contrebande », « Sucre raffiné », « Encre & papier », « Faveur du greffe », « Planque du port » | **nom** de l'article |
| M10 | `:313,316,319` `small` | « La caisse de 12 », « Le sac de 50 kg », « La rame » | unité / lot de vente |
| M17 | `:322` `small` | « Discrète, sous 48 h » | délai de livraison |
| M15 | `:325` `small` | « Indisponible — descente en cours » | raison de l'indisponibilité |
| M11 | `:314,317,320,323,326` `b` | `$ 340`, `$ 85`, `$ 61`, `$ 1 200`, `—` | prix unitaire |
| M12 | `:314,317,320,323` `.tend.h` / `.tend.b` | `▲` (vert `--vert`) / `▼` (braise `--braise`) | sens de la variation |
| M13 | idem | `4%`, `2%`, `9%`, `12%` | ampleur de la variation |
| M14 | `:324` `style="opacity:.6"` + `:326` `<b>—</b>` + `.tend` vide | — | article indisponible |
| M16 | `:312-326` | 5 `.ligne-m` | la liste, son ordre, son cardinal |

### 5. Inventaire F

Sans objet — mode **maquette**, le front n'existe pas.

### 6. Non vérifié

1. **La branche de SUCCÈS de `GET /v1/me/meta-market/signal`.** Mesurée en `insufficient_signal`
   seulement. Cause exacte : la seule clé peuplée de la base est
   `(unknown, brindle, verge)` avec `sample_count = 1`, sous le plancher (`sampleFloor`, défaut
   **5** — `meta-market-read.service.ts:123-129`). Les 6 clés de la branche de succès sont donc
   **DÉDUITES du code** (`meta-market.controller.ts:95-101`), **corroborées** par un E2E qui exerce
   la **route de production** après un vrai chemin de vente
   (`tests/e2e/operational/meta_market/meta_market_player_signal.spec.ts:165-176`) et par deux specs
   qui épinglent l'ensemble de clés (`meta_market_privacy_wall.spec.ts:645-650`,
   `meta_market_read_floor.spec.ts:234-237`). **Mesure qui trancherait** : 5 ventes réelles dans la
   même clé + un tick d'agrégation, puis relire la route — non fait, cela écrit dans une table
   partagée.
2. **`GET /v1/operational/dealer/:id`** (R5) : non exercée, le compte frais n'a aucun dealer
   (`07-dealers.json` = `{dealers: []}`). Sa forme est celle d'une entrée de R4 (`selling.controller.ts:104-108`).
3. **Les 4 routes de mutation** (A1-A4) : non exercées. Mesurer A1 débiterait le portefeuille et
   créerait une commande ; A4 modifierait une préférence de confidentialité. Leurs corps de réponse
   sont lus dans le code (`{order_id}`, `{dealer_id}`, `{dealer_id, safehouse_id}`,
   `{visibilityEnabled}`) — **DÉDUITS**.
4. **Le prix d'achat réel d'un précurseur.** Il existe (`PrecursorService.order` débite
   `qty × prix unitaire ancré`, `precursors.controller.ts:55-57`) mais n'est projeté nulle part ;
   je n'ai pas mesuré sa valeur, seulement son absence de la surface joueur.
5. **La lecture de `GET /v1/operational/storage/:id` sur un `stash`** → **404** (mesuré) alors que
   le même appel sur le `lab` → 200. Je n'ai pas cherché la garde qui l'explique : hors domaine.
6. **Le rattachement des 5 articles de la maquette à des entités back.** Faute de taxonomie et de
   table de noms (E2/E3), l'appariement « Sucre raffiné → un précurseur », « Planque du port → un
   bâtiment », « Faveur du greffe → un acteur d'affaires internes » est une **lecture de ma part**,
   pas une mesure. C'est précisément l'arbitrage que l'user doit rendre, et il commande L1/L2.
7. **Le sens de « Prix du soir ».** Je n'ai pas pu déterminer si la maquette décrit une cotation
   quotidienne (qui existerait côté back : l'inférence de tendance est NIGHTLY) ou une simple
   couleur d'ambiance.
