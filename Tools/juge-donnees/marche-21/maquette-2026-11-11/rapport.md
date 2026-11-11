# Juge données ⊥ — ㉑ « Le marché » (tableau du Verge d'Or) — mode maquette — 2026-11-11

> **VERDICT : NON.** La maquette épinglée (`atelier3d-mafia` @`4ae50cca`) et les mots ratifiés du
> 11/11 (`MOTS-MARCHE-21.md`) décrivent **deux écrans différents sur la colonne ash** — la maquette
> y allume **4 voyants mesurés** là où les mots ratifient « HORS DU TABLEAU, ash ne s'allume jamais »
> (TD-966) — et **~10 textes dessinés du tableau de région et du mur n'ont aucune des 31 clés**.
> Auto-audit : chaque ● de la colonne B a été ouvert à la ligne citée ; chaque « 0 occurrence » est un
> compte binaire doublé d'un contrôle positif vert sur le même appel.

## En une phrase

Sur **54 clés servies**, la maquette en dessine **33** et en laisse **21 servies-non-dessinées**, et elle
dessine **17 éléments sans aucune source** ; **5 écarts** sortent de la table des écarts assumés et
**2 trous sont honnêtement documentés par la maquette elle-même** (cadre 106, à jour au 11/11 : L1 et L3
livrés).

> Les trois comptes de cette phrase sont pris **dans la table** (annexe 7), recomptés par
> `mesures/controle-arithmetique.py` : 54 lignes B, dont 33 avec un M apparié et 21 avec `–`
> (33 + 21 = 54, vérifié) ; 17 lignes M non appariées ; 54 + 17 = 71 lignes.
> *Correction d'auto-audit : une première rédaction de cette phrase annonçait « 36 appariées et 18
> servies-non-dessinées » — un compte estimé, pas lu. Il était faux ; il est remplacé par le compte lu.*

## Mode et recevabilité de B

B est **DÉDUIT sur chaque ligne** : la pile ne porte pas ce lot (build servi `35bdd6cb`), interdiction
de la monter. Chaque ligne porte son `fichier:ligne` de projection. **Correction au dossier** : il
affirme que ce back « n'a aucun E2E » — **faux, mesuré** : 5 fichiers de spec touchent la route, dont
`tests/e2e/operational/marche_ardoise_enumerateur.engine.spec.ts:60` qui **épingle l'ensemble de clés
à l'égalité** (`CLES_DE_LIGNE = ['district_id','lane_confidence_bucket','substance_type']`, assert
`Object.keys(l).sort()` :191) et le domaine fermé de la bande (:192). B est donc déduit **de
l'interface ET d'une spec qui épingle**, le cas le plus fort que permette un gate.

## Écarts à consigner — les 5 qui sortent de la table des écarts assumés

| # | information | B | M | statut | preuve (mesure) |
|---|---|---|---|---|---|
| **E1** | **la colonne ash est ALLUMÉE** | – | ● | **ÉCART — TD-966 contredit** | 4 cases mesurées : cadre 146 `Le Verre` opacity **1.00**, `Place des Comptes` **0.75**, `La Lisière` **0.54** (col. 4 = ash, entête `cadre-146.html`) ; cadre 104 `glass × ash` = « ▼ DESCEND ». `mesures/voyants-allumes.txt` |
| **E2** | `marche.titre.hors_du_tableau` dessiné nulle part | ● | – | **DÉFAUT** | `string_table.ts:3331` = `'HORS DU TABLEAU'` / `:361` = `'OFF THE BOARD'` ; **0 occurrence** de « HORS DU TABLEAU » dans les 2 662 051 octets du fichier, contrôles positifs verts sur le même appel (`LE MARCHÉ` 15, `tableau du Verge` 8, `quartiers noirs` 2). `mesures/confrontation-textes.txt` |
| **E3** | le titre de la case ash dit autre chose | – | ● | **ÉCART — mots ratifiés contraires** | `cadre-146.html` `.pann.pp>b` = `'LE VERRE · UNE LIGNE QUI TIENT'`, et `.pann.pp>small` ajoute `'Le tableau dit seulement si la ligne tient — jamais ce qu'elle vaut.'` — **tous deux RETIRÉS** par `MOTS-MARCHE-21.md:33` ; `marche.confiance.sur` (`'sûr'`, `string_table.ts:3309`) reste **0 occurrence** |
| **E4** | le bilan du bas ne peut pas venir de la clé qui le sert | ● | ● | **DÉFAUT** | servi : `marche.phrase.bilan_lignes` ICU `other {# lignes sur {total}. …}` (`string_table.ts:3323`) ⇒ rendu **« 3 lignes sur 72 »**, **ABSENT** du contenu d'écran ; dessiné : `'Trois lignes sur soixante-douze. Le reste, …'` (`cadre-101.html` `.bulle p`, **dans `.ecran`**). ⚠️ l'écart assumé n°2 du dossier pose l'inverse (« les nombres sont écrits en chiffres ; soixante-douze n'est pas écrit en lettres à l'écran ») : **sa prémisse est fausse**, le classement C ne tient donc pas sur le motif énoncé |
| **E5** | le tableau de région et le mur n'ont pas de mots | – | ● | **ÉCART à consigner** | 10 textes dessinés, **aucune des 31 clés** : entête `'genre'` (104/105), compteurs `'signaux de région'`, `'genres d'endroit'`, `'substances'` (104), `'vous ne dites rien'` / `'on ne dit rien'` (105), les 3 directions `'▲ MONTE'` / `'= TIENT'` / `'▼ DESCEND'` (104), les panneaux `'Six genres d'endroit, pas dix-huit quartiers'` (104) et `'Vous ne dites pas vos prix…'` (105). Les 31 clés couvrent **le seul tableau 18 × 4** |

### Lecture de l'écart central (E1-E3) — ce que je crois qu'il s'est passé

La maquette est **antérieure** aux mots : son en-tête HTML est `㉑ LE MARCHÉ (2026-08-27)` et la tuile
ash `(2026-10-07)` ; les mots ont été ratifiés le **11/11** avec deux décisions explicites
(`MOTS-MARCHE-21.md` ligne 27, « 24a titre de toute case ash (**RÉÉCRIT, ruling A**) » et ligne 33,
« le titre *une ligne qui tient* et la 2ᵉ phrase … sont **RETIRÉS** (ash ne s'allume jamais, TD-966) »).
La tuile ash **n'a pas été régénérée après le ruling**. Ce n'est pas un défaut de jugement, c'est un
artefact non resynchronisé — mais le gate porte sur **ce commit**, et sur ce commit les deux pièces
sont incompatibles pour un joueur (voyant allumé vs éteint). D'où **NON**.

### La vérification que le dossier demandait sur TD-966 : « aucune valeur servie ne peut l'allumer »

**Partiellement faux, mesuré.** Le libellé, lui, est bien dans les 31 clés (E2 ✔).

| maillon | mesure |
|---|---|
| le type | `substanceType = pgEnum('substance_type', ['brindle','crick','hush','ash'])` — `db/schema/operational_chain.ts:40` |
| la table | `lane_pricing_state.substance_type` **réutilise cet enum**, sans `CHECK` restrictif — `db/schema/market_lane_pricing_state.ts:35` ; les 2 seuls CHECK portent sur `c` et `t_refractory` (:77-81) |
| la route | `listLanes()` mappe **toute** ligne existante sans filtre de substance — `market.controller.ts:106-115` ; la garde unitaire `isSubstanceTypeDomain` **accepte** `'ash'` (:40-42, :70-72) |
| l'écrivain de production | **ne peut pas** écrire ash : `selling-sell.service.ts:138` filtre `(d) => !isLuxurySubstance(d.substance_type)` ; `ash.luxuryChannel: true` (`substance-config.ts:220`) et `LUXURY_SUBSTANCE_TYPES` est **dérivé du registre** (:370-374) ⇒ `processDealAttempt`/`ensureLane` (:217, :418) ne voient jamais ash |
| les autres écrivains | `market-admin.controller.ts:254` `ensureLane(dId, substanceType)` sous `@UseGuards(requireStaffRole('admin'))` (:243) — **staff**, pas joueur — et `insurance-test.controller.ts:4391` (`_test`) |

⇒ **La boucle joueur n'allume jamais ash** (l'hypothèse tient là où elle compte) ; **le type, la table
et la route l'acceptent**, et un geste staff (`force-lane-jam` sur ash) suffit à produire une ligne
ash que la route servira comme une autre. Un client qui dessine **un voyant par ligne servie**
l'allumerait alors sous un libellé « HORS DU TABLEAU » — contradiction visible. À trancher : soit la
route exclut les substances `luxuryChannel` (lot back 2 ci-dessous), soit le client ignore les lignes
ash, soit le libellé change. **Je propose, l'user tranche.**
## « Passé à côté ? » — pour l'user, par intérêt joueur décroissant

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| Q1 | `signal.trend` **des 23 autres couples** (`GET /v1/me/meta-market/signal`) | la direction du marché pour chaque (genre × substance) | **utile ici, et déjà dessiné** : le cadre 104 dessine la grille 6 × 4 entière, mais la route n'en sert qu'**une case par appel** (`substance` + `district_profile` obligatoires, `meta-market.controller.ts:79-86`) ⇒ 24 appels pour un écran. C'est le **même manque** que l'énumérateur L1 vient de combler pour les lignes | ●●●● |
| Q2 | `districts[].control_state` (`GET /v1/world/districts`) | qui tient le quartier (`UNCONTESTED`/`CONTESTED`/`PLAYER_HELD`/`RIVAL_HELD`) | **utile ici** : « où je peux traiter » et « où le marché est tendu » se lisent ensemble ; une ligne sûre dans un quartier `RIVAL_HELD` n'est pas la même information qu'ailleurs. Domaine fermé déjà servi (`world-geography.repository.ts:58`) | ●●●● |
| Q3 | `marche.etat.chargement` + `marche.etat.echec` | « On interroge le tableau… » / « Le tableau ne répond pas. » | **utile ici** : deux chaînes **ratifiées et servies** (`string_table.ts:3310-3311`) pour lesquelles **la maquette n'a aucun cadre** (0 occurrence). Un écran qui lit une route a ces deux états ; sans cadre, le front les inventera | ●●● |
| Q4 | `marche.confiance.oui_dire` + `marche.phrase.bande_low` | la bande basse (« ouï-dire », « une seule source, jamais recoupée — un bruit de comptoir ») | **utile ici** : la maquette dessine le panneau de détail en MODERATE (102) et la case vide (103), **jamais LOW ni HIGH non-ash**. Les mots existent, l'état n'est pas dessiné ⇒ le front devra deviner la mise en page de 2 bandes sur 3 | ●●● |
| Q5 | `signal.sampleCount` | combien de maisons ont parlé | **pas ici, et c'est le bon choix** : le canon b1 interdit le chiffre, et la prose du back se contredit elle-même — `meta-market-read.service.ts:11` jure que `sample_count` n'est **jamais** exposé, le contrôleur `:101` le renvoie sur une route **joueur**. La maquette ne l'imprime pas : l'option conservatrice. À signaler au back comme **contradiction prose/code**, pas comme manque d'écran | ●● |
| Q6 | `signal.medianCents` / `p10Cents` / `p90Cents` | le prix médian de région et sa fourchette | **pas ici** : c'est le lot **L4** que la maquette consigne elle-même (cadre 106) et un **arbitrage produit**, pas un lot technique | ●● |
| Q7 | `districts[].block_count`, `bank_side` | la taille du quartier, la rive | **pas ici** : géographie, pas marché. `bank_side` pourrait regrouper les 18 lignes en 2 blocs si l'ordre doit se justifier (cf. N04) | ● |
| Q8 | `districts[].id`, `index`, `name_canonical`, `precinct_id`, `openable_types` | identité de travail, précinct, types ouvrables | **pas ici : de la plomberie** (ou le domaine d'autres écrans) | ○ |
| Q9 | `signal.lastAggregatedAt` | l'heure du dernier agrégat | **pas ici** sauf si l'écran doit dire « ce matin » ; aucune clé `marche.*` ne porte de date | ○ |

## Lots back suggérés

| # | objet | forme | preuve |
|---|---|---|---|
| **L-A** | **énumérateur du signal de région** : `GET /v1/me/meta-market/signals` rendant les (substance × district_profile) qui existent, `trend` seul (sans cents) | même forme que l'énumérateur des lignes qui vient d'être livré (`market.controller.ts:104`) | la grille 6 × 4 est **dessinée** (24 cases mesurées, `cadre-104`) et la route ne sert qu'une case par appel (`meta-market.controller.ts:76-86`) ⇒ ligne **N12** |
| **L-B** | **exclure les substances `luxuryChannel` de `GET /v1/me/market/lanes`** (ou le décider explicitement) | une garde dérivée du registre, le motif déjà employé en vente | `isLuxurySubstance` / `LUXURY_SUBSTANCE_TYPES` existent (`substance-config.ts:370-384`) et la route ne les consulte pas (`market.controller.ts:106-115`) ⇒ ligne **E1** |
| **L-C** | **trancher la contradiction `sample_count`** : la prose dit « jamais exposé », la route joueur l'expose | une décision, puis la prose OU le contrôleur corrigé | `meta-market-read.service.ts:11` vs `meta-market.controller.ts:101` (route `me/…` sous `JwtAuthGuard:77`) |

**Aucun lot de forme F (B⁻ dessiné) n'est à ouvrir.** B⁻ mesuré et **non dessiné** :
`lane_pricing_state` → `p_cents`, `w_cents`, `c`, `t_refractory_minutes`, `created_at`, `updated_at`
(6 colonnes sur 8 non projetées — `market_lane_pricing_state.ts:45-73`) : **c'est le mur R2.2 et il est
juste** ; `meta_market_signals` → `region_id`, `substance`, `district_profile` (la clé n'est pas
renvoyée en écho — `meta-market.controller.ts:96-105`) : plomberie, le client la connaît déjà puisqu'il
la passe en requête. Les 4 tables des 3 autres mécaniques (`buyer_roster_entry`,
`district_capacity_state`, `lot_handling_vector`, `district_wear_mark_demographics`) sont **entièrement
non projetées** — c'est le lot **L2 que la maquette consigne elle-même** (cadre 106).

## Actions : routes ↔ CTA

| route joueur `@Post`/`@Put` du domaine | CTA / geste de la maquette | statut |
|---|---|---|
| `PUT /v1/me/meta-market/visibility` (`meta-market.controller.ts:113`, `JwtAuthGuard:114`) | **aucun CTA ici** — le cadre 105 **renvoie** à l'écran ㉖ Le Coffre (« Ça se rouvre au Coffre, tiroir « le jeu » ») | **correct** : un seul jeton pour deux écrans, et ㉑ est un écran de lecture (le dossier le dit : « sans que le joueur n'agisse ») |
| — | les 4 onglets de substance (`.og` / `.og.pris`, cadre 101) | **sélection locale**, aucune route : l'énumérateur sert les 4 substances d'un coup ⇒ le filtre est client. À consigner (**N06**) |
| — | aucun autre geste | **0 CTA, 0 route d'action manquante** |

Compte : **1 route d'action du domaine, 0 CTA, 1 renvoi inter-écran** — aucune route sans CTA à
reprocher (la route appartient à ㉖), aucun CTA sans route.

## Ce que la maquette fait bien, et qu'il faut garder

- **Le cadre 103 « Voyant éteint — et c'est un renseignement »** dessine l'absence comme information,
  exactement ce que le contrôleur écrit (`market.controller.ts:23-25,94-96` : « ABSENCE = never
  observed … never a fabricated neutral entry ») et sa phrase est servie **à l'octet**
  (`marche.phrase.case_sans_ligne`, `string_table.ts:3325`).
- **Le cadre 106 « Ce qui manque encore »** est un **trou honnêtement documenté** : il nomme L2 et L4,
  et il a été **corrigé le 11/11** pour retirer L1 et L3, livrés (commentaire HTML de la région). Il se
  **garde**. ⚠️ Un seul commentaire de péremption manque : **l'`<aside>` de la région dit encore
  « AUCUN ÉNUMÉRATEUR … aucune ne LISTE »** alors que `GET /v1/me/market/lanes` existe
  (`market.controller.ts:104`) — prose périmée dans le même document que le cadre corrigé.
- **Le mur R2.2 est respecté** : aucun prix, aucun pourcentage, aucun graphe sur les 7 cadres ; les
  phrases servies le disent trois fois (« On ne vous dira pas le prix »).
- **Les 72 cases et les 18 noms sont justes** : 72 cellules `.vy` et 18 `.rg` mesurés dans chacun des
  cadres 101/102/103/146 = la borne `18 × 4 = 72` du contrôleur (`market.controller.ts:98`) ; les 18
  noms dessinés sont **exactement** `NOMS_PAR_ID` (`district-names.ts:23-29`).
- **Les 3 crans d'opacité** (0.54 / 0.75 / 1.00) sont **3 pour 3 bandes** (`LOW|MODERATE|HIGH`,
  `market-projection.service.ts:38`) — pas de cran en trop, pas de cran manquant.
## Délimitation mesurée — et 2 corrections au dossier

**Les cadres de ㉑ sont 101, 102, 103, 104, 105, 106 et 146 — sept, pas huit.** Mesuré par les bornes
HTML de la série, pas par l'index :

| région (commentaire borne) | offsets | cadres 0-based | octets |
|---|---|---|---|
| `<!-- ═══ ㉑ LE MARCHÉ (2026-08-27) ═══ -->` → `fin ㉑ LE MARCHÉ` | 2 375 028 → 2 425 759 | **101-106** (6) | 51 302 |
| `<!-- ═══ ㉑ LE MARCHÉ — LA TUILE ASH (2026-10-07) ═══ -->` → sa fin | 2 594 806 → 2 611 331 | **146** (1) | 16 683 |

- **Correction 1 — le cadre 145 n'est pas de ㉑.** Le dossier l'annonce (« Les onze crans, tous »
  (145)) ; sa borne précédente est `<!-- ═══ TÉMOIN — ㊳ LE JOURNAL ═══ -->` et son corps porte
  `Le journal` / `recency_band` / `severity_band` (`mesures/cadre-145.txt:46-117`). Le 143 (« Les douze
  crans ») est sous `TÉMOIN — ㊴ LE DOSSIER`. Aucun des deux ne porte `LE MARCHÉ` ni `Verge d`.
  Le compte total de cadres du fichier est **155** (`mesures/index-cadres.txt`), conforme au dossier.
- **Correction 2 — les 18 noms sont servis par `GET /v1/world/districts`**, que le commentaire de la
  maquette ne cite pas (il crédite `district-interior.controller.ts:50` et
  `player-buildings.controller.ts:45`, tous deux réels mais **non énumérateurs**) :
  `world-geography.repository.ts:99` — `name: nomDeDistrict(r.id) ?? r.name_canonical`. ⚠️ Cette route
  est **PUBLIQUE** : `world.controller.ts:39-40` n'a **aucun `@UseGuards(JwtAuthGuard)`**, délibérément
  (`:5-7` « La géographie est connue »). Elle est donc hors de la règle « routes sous JwtAuthGuard » du
  mandat, et je la compte en la signalant.
- Les cadres **109 et 110** (hors lot, TD-1040) ne portent ni `LE MARCHÉ` ni `Verge d` : ils
  appartiennent à `LA VENTE`. Aucun recouvrement avec ㉑, l'exclusion est sans effet sur ce rapport.

### Annexe 1 — routes du domaine (compte et ancres)

`find … -name '*.controller.ts'` = **149** fichiers (**80** hors `-test`/`_test`/`-admin`).
`grep -rnE "@(Get|Post|Put|Patch|Delete)\(['\"][^'\"]*market"` sur **tous** les contrôleurs : **74**
routes portent `market` dans leur chemin, dont **4 joueur** (hors `_test`, hors BO/staff) :

| # | route | ancre | garde |
|---|---|---|---|
| 1 | `GET /v1/me/market/lanes` | `market.controller.ts:104` | `JwtAuthGuard` :105 |
| 2 | `GET /v1/me/market/lanes/:districtId/:substanceType` | `market.controller.ts:60` | `JwtAuthGuard` :61 |
| 3 | `GET /v1/me/meta-market/signal` | `meta-market.controller.ts:76` | `JwtAuthGuard` :77 |
| 4 | `PUT /v1/me/meta-market/visibility` | `meta-market.controller.ts:113` | `JwtAuthGuard` :114 |

\+ **`GET /v1/world/districts`** (`world.controller.ts:39`) — **publique**, hors du mot « market »,
trouvée par le grep `district` : c'est elle qui porte les noms, et le dossier avait raison de la citer.
**Le dossier nommait un seul module (`operational/market/`) ; le grep en a ramené un second,
`operational/meta_market/`, qui porte la moitié de l'écran** (le tableau de région et le mur). Les
routes 2 et 1 rendent le **même type** (`LaneConfidenceRow`), égalité épinglée par l'E2E (:251) ⇒ une
seule information dans la table, pas deux.

### Annexe 2 — corps réels : AUCUN

**B n'a jamais été mesuré sur un corps réel.** Aucun `mesures/<route>.json` : la pile locale ne porte
pas ce lot (build `35bdd6cb`) et la monter est interdit par le dossier. Ce qui le trancherait, dans
l'ordre de force : (a) une pile montée sur `163402f1` + compte jetable + `session/open`, puis
`curl -H "Authorization: Bearer $TOKEN" …/v1/me/market/lanes` sur un compte **frais** (attendu :
`{lanes: []}` + 200, par `market.controller.ts:95-96`), puis une vente réelle pour ouvrir une ligne et
re-mesurer ; (b) à défaut, l'exécution des 5 specs listées en annexe 6, qui épinglent les clés, l'ordre,
les 3 valeurs de bande et la disparition d'une ligne retirée.

### Annexe 3 — valeurs possibles par clé, avec la contrainte source

| clé | valeurs possibles | contrainte lue à la source |
|---|---|---|
| `lanes[].substance_type` | `brindle`, `crick`, `hush`, `ash` | `pgEnum` — `db/schema/operational_chain.ts:40` |
| `lanes[].lane_confidence_bucket` | `LOW`, `MODERATE`, `HIGH` | union TS — `market-projection.service.ts:38` ; coupures `c >= laneCHi` → HIGH, `c < laneCLo` → LOW, sinon MODERATE (:137-141) |
| `lanes[].district_id` | entier ≥ 1 | FK `districts.id` (1..18) — `market_lane_pricing_state.ts:30-32`, `world_geography.ts:33` ; garde `Number.isInteger && > 0` — `market.controller.ts:67` |
| `districts[].profile` | `tidewater`, `spine`, `lattice`, `stack`, `glass`, `verge` | `pgEnum` — `world_geography.ts:14-21` (6 membres) |
| `districts[].control_state` | `UNCONTESTED`, `CONTESTED`, `PLAYER_HELD`, `RIVAL_HELD` | union TS — `world-geography.repository.ts:58` (jour-1 : toujours `UNCONTESTED`, :96) |
| `districts[].bank_side` | `north`, `south` | `pgEnum` — `world_geography.ts:23` |
| `districts[].name` | 18 noms de fiction, repli `name_canonical` | `district-names.ts:23-29` + `NOMBRE_DE_DISTRICTS_NOMMES = 18` (:34) |
| `signal` | `'insufficient_signal'` \| objet 6 clés | union TS — `meta-market.controller.ts:46-57` ; 3 causes d'`insufficient_signal` : visibilité `false` (`meta-market-read.service.ts:220-224`), aucune ligne (:111-116), `sample_count < sampleFloor` défaut 5 (:124-130) |
| `signal.trend` | `up`, `stable`, `down` | union TS — `meta-market.controller.ts:55` ; calcul fenêtre 7 j (`meta-market-read.service.ts:24-30`) |
| `signal.medianCents` / `p10Cents` / `p90Cents` | **chaînes** (bigint sérialisé) | `meta-market.controller.ts:51-53,98-100` + en-tête :26-27 |
| les 31 `marche.*` | FR et EN épinglés **à l'octet** | `string_table.ts:3303-3333` (FR) / `:333-363` (EN) ; `tests/unit/i18n/marche_mots_21_unit.spec.ts:53-57` (anti-vacuité 31, 31 clés distinctes, aucune clé `marche.*` en plus) + contrôle positif rouge (:60-73) |

**R2.2** : aucune clé servie ne déroge à la règle des bandes **sauf les trois cents de région**
(`medianCents`, `p10Cents`, `p90Cents` — des scalaires) et `sampleCount` (un compteur). La maquette
n'en dessine aucun : **conforme**, et c'est le lot L4 qu'elle consigne.

### Annexe 4 — inventaire M (Mxx → ce que ça représente)

| Mxx | élément dessiné | représente | cadre(s) |
|---|---|---|---|
| M01-M03 | barre `ARGENT 24 850 €` / `CHALEUR Tiède` / `JOUR 12 · Plein jour` | HUD partagé, hors domaine ㉑ | tous |
| M04 | `.enseigne b` « LE MARCHÉ » | le titre | tous |
| M05 | `.enseigne i` « tableau du Verge d'Or » | le sous-titre | tous |
| M06 | `.fen` « 03 /72 · lignes connues » | cardinal de `lanes[]` sur la borne 72 | 101, 106 |
| M07 | `.fen` « 01 · sûres » | combien de bandes HIGH | 101, 106 |
| M08 | `.fen` « 15 · quartiers noirs » | 18 − quartiers portant ≥ 1 ligne | 101, 106 |
| M09 | `.entete span[0]` « quartier » | l'axe des lignes | 101, 102, 103, 146 |
| M10 | 4 entêtes de colonne + couleur + picto | les 4 substances | 101, 102, 103, 104, 105, 146 |
| M11 | `.grid` 18 `.rg` × 4 `.vy` = **72** | la liste des couples (mesuré) | 101, 102, 103, 146 |
| M12 | 18 `.qn` nommés | les noms de quartier | 101, 102, 103, 146 |
| M13 | l'**ordre** des 18 lignes | quel quartier à quelle ligne | 101, 102, 103, 146 |
| M14 | `.vy` vs `.vy.on` | une ligne existe / n'a jamais été ouverte | 101, 102, 103, 146 |
| M15 | `opacity` 0.54 / 0.75 / 1.00 | la bande de confiance | 101, 102, 103, 146 |
| M16 | `background` du voyant | la substance de la colonne | 101, 102, 103, 146 |
| M17 | `.qn.on` | ce quartier porte au moins une ligne | 101, 102, 103, 146 |
| M18 | `.bulle i` / `.pann.pp i` « crick · extrait de racine » | substance · origine | 101, 102 (crick), 103 (hush), 146 (ash) |
| M19 | `.bulle p` « Trois lignes sur soixante-douze… » | le bilan | 101 |
| M20 | `<em>` surligné dans la bulle | la moitié de phrase mise en avant | 101 |
| M21 | 4 `.og` (`b` substance + `small` forme) | les 4 substances et leur forme | tous sauf 105 |
| M22 | `.og.pris` | la substance choisie | tous sauf 105 |
| M23 | `.pann.pp b` « DÉPÔT-EST · RECOUPÉ » | nom · bande | 102 |
| M24 | `.pann.pp small` phrase de bande | ce que la bande veut dire | 102 |
| M25 | `<u>` « pas le prix » | relief dans la phrase | 102 |
| M26 | `.pann.pp b` « LA CHANCELLERIE · VOYANT ÉTEINT » | nom · absence | 103 |
| M27 | `.pann.pp small` + 2 `<u>` | ce que l'absence veut dire | 103 |
| M28 | `.pann.pp b` « LE VERRE · UNE LIGNE QUI TIENT » | nom · bande ash | 146 |
| M29 | `.pann.pp small` phrase ash (+ 1 phrase en trop) | le canal de l'ash | 146 |
| M30 | **4 voyants ash allumés** | une ligne ash existe | 104, 146 |
| M31 | `.entete span[0]` « genre » | l'axe des lignes de région | 104, 105 |
| M32 | 6 `.qn` (tidewater…verge) | les 6 genres d'endroit | 104, 105 |
| M33 | `.grid` 6 × 4 = **24** | la liste des (genre × substance) | 104, 105 |
| M34-M36 | `.fen` « 03 /24 signaux de région », « 06 genres d'endroit », « 04 substances » | les cardinaux de région | 104 |
| M37 | « ▲ MONTE » / « = TIENT » / « ▼ DESCEND » | la direction du marché | 104 |
| M38 | les 3 couleurs de direction | la direction, redite en couleur | 104 |
| M39 | `.pann` du 104 (3 textes + `<u>`) | la règle du tableau de région | 104 |
| M40 | `.fen` « 00 /24 » | aucun signal | 105 |
| M41-M42 | `.fen` « ✕ vous ne dites rien » / « ✕ on ne dit rien » | les 2 côtés du mur | 105 |
| M43 | `.pann` du 105 | la réciprocité + le renvoi au ㉖ | 105 |
| M44-M45 | « L2 / L4 maillon manquant » | auto-documentation des trous | 106 |
| M46 | `.scene.district` (brightness .24), `.voile-scene`, `.cerne` | décor — **non inventorié** (aucune information) | tous |
| M47-M48 | `svg.prod` (19 enfants), `svg.pas` (2 enfants) | l'objet-matière et le picto de la substance | tous |

### Annexe 5 — inventaire F : SANS OBJET (mode maquette, le front n'existe pas)

### Annexe 6 — ce que je n'ai pas pu vérifier

1. **B n'a jamais été mesuré** (annexe 2) : zéro corps réel, zéro `mesures/*.json` de route. Tout B est
   **DÉDUIT** d'interfaces TS, d'enums PG et de specs. Un corps réel pourrait démentir une projection
   (un champ ajouté hors interface, une enveloppe différente) — la mesure qui trancherait est en
   annexe 2.
2. **Les 5 specs ne sont pas exécutées** (lecture seule, pas de pile) :
   `tests/e2e/operational/marche_ardoise_enumerateur.engine.spec.ts`,
   `tests/e2e/operational/market_lane_confidence_route.spec.ts`,
   `tests/e2e/parcours/marche_ardoise.parcours.spec.ts`,
   `tests/e2e/parcours_horloge/marche_ardoise_horloge.parcours.spec.ts`,
   `tests/unit/e2e_infra/marche_ardoise_suite_unit.spec.ts` (+ `tests/unit/i18n/marche_mots_21_unit.spec.ts`
   et `tests/e2e/operational/meta_market/meta_market_player_signal.spec.ts`). Je les ai **lues**, pas
   fait rougir. Un vert non vu n'est pas un vert.
3. **Les états de la maquette ne sont pas reproductibles sur compte frais** : les 3 lignes du cadre 101
   supposent 3 ventes déjà faites dans 3 quartiers ; un compte frais rend `{lanes: []}`, dont la
   maquette ne dessine **aucun** cadre pour le tableau 18 × 4 (seul le cadre 105 montre un 00/24, et
   c'est le mur, une autre cause). **La clé `marche.phrase.bilan_lignes` a une branche `=0`
   (`string_table.ts:3323`) sans cadre.** À consigner avec Q3/Q4.
4. **Le `region_id` du signal n'est pas observable côté joueur** : dérivé serveur
   (`meta-market.controller.ts:90`, `player.region_id ?? REGION_FALLBACK`). Impossible de savoir, sans
   pile, combien de couples (substance × district_profile) sont réellement peuplés pour une région —
   donc impossible de vérifier que « 03 /24 » est un état atteignable.
5. **La provenance des mots ratifiés n'est pas le commit épinglé** : `MOTS-MARCHE-21.md:3` relève les
   littéraux FR sur `atelier master 8f59cf9, cadres 106/107/108/151`, pas sur `4ae50cca` (où les cadres
   sont 101-106 et 146). J'ai confronté les 31 valeurs au **commit épinglé** ; les écarts E1-E4 peuvent
   donc, en partie, venir de ce décalage de commits plutôt que d'une divergence de fond. **La mesure qui
   trancherait** : rejouer la même confrontation sur `8f59cf9` et comparer les deux jeux d'écarts.
6. **Les valeurs possibles de `marche.phrase.*` en tant que gabarits ICU ne sont pas rendues** : je n'ai
   pas exécuté le formateur ICU, j'ai lu le motif. « 3 lignes sur 72 » est le rendu **attendu** du motif
   `other {# lignes sur {total}…}`, pas un rendu mesuré. Un formateur configuré autrement (locale
   `fr` avec un style `spellout`) produirait des lettres — ce qui annulerait E4. **La mesure qui
   trancherait** : formater la clé avec `n=3, total=72` dans le formateur réel du client.
7. **`openable_types` et `precinct_id`** sont déclarés dans `DistrictProjection` mais je n'ai pas vérifié
   que `openableTypesForProfile` et `districtToPrecinct` rendent bien une valeur pour les 18 ids — leur
   contenu ne change aucune ligne de la table (tous deux non dessinés).

### Annexe 7 — table de couverture complète

Comptes **recomptés par script** (`mesures/controle-arithmetique.py`, contrôle positif `rc=0` /
contrôle négatif `rc=1` dans `mesures/controle-negatif.txt`) :

**|B| = 54 · |M non appariés| = 17 · somme = 71 · nombre de lignes = 71 · IDENTITÉ VERTE**

(En mode maquette la colonne F n'existe pas.)

| # | information | B | M | statut | classe | preuve |
|---|---|---|---|---|---|---|
| B01 | lanes[] (cardinal) | ● | M06,M11,M14 | affichee comme dessinee | OK | market.controller.ts:106-115 ; cles epinglees e2e marche_ardoise_enumerateur.engine.spec.ts:60,191 ; enveloppe payload.data.lanes :120 |
| B02 | lanes[].district_id | ● | M12 | affichee comme dessinee | OK | market.controller.ts:111 ; LaneConfidenceRow market-projection.service.ts:47 |
| B03 | lanes[].substance_type | ● | M10,M16,M21,M36,M47,M48 | affichee comme dessinee | OK | market.controller.ts:112 ; enum operational_chain.ts:40 [brindle,crick,hush,ash] |
| B04 | lanes[].lane_confidence_bucket | ● | M07,M15,M23,M24 | affichee comme dessinee | OK | market.controller.ts:113 ; LOW / MODERATE / HIGH market-projection.service.ts:38 ; seuils :137-141 |
| B05 | districts[] (cardinal 18) | ● | M08,M11 | affichee comme dessinee | OK | world-geography.repository.ts:77-105 ; ordre asc(id) :88 |
| B06 | districts[].id | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:36,90 |
| B07 | districts[].profile | ● | M32,M35 | affichee comme dessinee | OK | world-geography.repository.ts:37,91 ; enum world_geography.ts:14-21 (6 membres) |
| B08 | districts[].index | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:38,92 |
| B09 | districts[].name_canonical | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:39,93 |
| B10 | districts[].block_count | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:40,94 |
| B11 | districts[].bank_side | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:41,95 ; enum world_geography.ts:23 |
| B12 | districts[].control_state | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:42,96 ; domaine ferme :58 |
| B13 | districts[].name (les 18 noms de fiction) | ● | M12 | affichee comme dessinee | OK | world-geography.repository.ts:45,99 ; district-names.ts:23-29 |
| B14 | districts[].precinct_id | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:49,101 |
| B15 | districts[].openable_types | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:54,103 |
| B16 | signal (discriminant 'insufficient_signal') | ● | M34,M40,M42 | affichee comme dessinee | OK | meta-market.controller.ts:46-57,93-95 ; mur de visibilite meta-market-read.service.ts:220-224 ; plancher :124-130 |
| B17 | signal.medianCents | ● | – | disponible, ni dessinee ni affichee | QUESTION | meta-market.controller.ts:51,98 |
| B18 | signal.p10Cents | ● | – | disponible, ni dessinee ni affichee | QUESTION | meta-market.controller.ts:52,99 |
| B19 | signal.p90Cents | ● | – | disponible, ni dessinee ni affichee | QUESTION | meta-market.controller.ts:53,100 |
| B20 | signal.sampleCount | ● | – | disponible, ni dessinee ni affichee | QUESTION | meta-market.controller.ts:53,101 ; prose contraire meta-market-read.service.ts:11 |
| B21 | signal.lastAggregatedAt | ● | – | disponible, ni dessinee ni affichee | QUESTION | meta-market.controller.ts:54,102 |
| B22 | signal.trend ('up' / 'stable' / 'down') | ● | M37 | affichee comme dessinee | OK | meta-market.controller.ts:55,103 ; calcul meta-market-read.service.ts:24-30,147 |
| B23 | visibilityEnabled | ● | M41 | affichee comme dessinee | OK | meta-market.controller.ts:118,129 ; colonne player.meta_market_visibility_enabled :127 |
| B24 | marche.titre.le_marche | ● | M04 | affichee comme dessinee | OK | string_table.ts:3332 / :362 |
| B25 | marche.sous_titre.tableau_du_verge_d_or | ● | M05 | affichee comme dessinee | OK | string_table.ts:3326 / :356 |
| B26 | marche.colonne.quartier | ● | M09 | affichee comme dessinee | OK | string_table.ts:3303 / :333 |
| B27 | marche.compteur.lignes_connues | ● | M06 | affichee comme dessinee | OK | string_table.ts:3304 / :334 |
| B28 | marche.compteur.sures | ● | M07 | affichee comme dessinee | OK | string_table.ts:3306 / :336 |
| B29 | marche.compteur.quartiers_noirs | ● | M08 | affichee comme dessinee | OK | string_table.ts:3305 / :335 |
| B30 | marche.substance.brindle | ● | M10,M21 | affichee comme dessinee | OK | string_table.ts:3328 / :358 |
| B31 | marche.substance.crick | ● | M10,M21 | affichee comme dessinee | OK | string_table.ts:3329 / :359 |
| B32 | marche.substance.hush | ● | M10,M21 | affichee comme dessinee | OK | string_table.ts:3330 / :360 |
| B33 | marche.substance.ash | ● | M10,M21 | affichee comme dessinee | OK | string_table.ts:3327 / :357 |
| B34 | marche.forme.briques | ● | M21 | affichee comme dessinee | OK | string_table.ts:3312 / :342 |
| B35 | marche.forme.cristaux | ● | M21 | affichee comme dessinee | OK | string_table.ts:3313 / :343 |
| B36 | marche.forme.plaque | ● | M21 | affichee comme dessinee | OK | string_table.ts:3314 / :344 |
| B37 | marche.forme.prismes | ● | M21 | affichee comme dessinee | OK | string_table.ts:3315 / :345 |
| B38 | marche.origine.extrait_de_racine | ● | M18 | affichee comme dessinee | OK | string_table.ts:3316 / :346 |
| B39 | marche.origine.resine_de_lull | ● | M18 | affichee comme dessinee | OK | string_table.ts:3319 / :349 |
| B40 | marche.origine.lys_de_verre | ● | M18 | affichee comme dessinee | OK | string_table.ts:3318 / :348 |
| B41 | marche.origine.herbe_des_friches | ● | – | servie, aucun cadre brindle | QUESTION | string_table.ts:3317 / :347 ; 0 occurrence maquette (confrontation-textes.txt) |
| B42 | marche.confiance.oui_dire | ● | – | servie, aucun cadre LOW | QUESTION | string_table.ts:3307 / :337 ; 0 occurrence maquette |
| B43 | marche.confiance.recoupe | ● | M23 | affichee comme dessinee | OK | string_table.ts:3308 / :338 ; dessine cadre 102 |
| B44 | marche.confiance.sur | ● | – | servie, le cadre HIGH dit autre chose | DEFAUT | string_table.ts:3309 / :339 ; 0 occurrence (le 146 dit « UNE LIGNE QUI TIENT ») |
| B45 | marche.titre.voyant_eteint | ● | M26 | affichee comme dessinee | OK | string_table.ts:3333 / :363 ; dessine cadre 103 |
| B46 | marche.titre.hors_du_tableau | ● | – | servie+ratifiee (MOTS 24a), jamais dessinee | DEFAUT | string_table.ts:3331 / :361 ; 0 occurrence dans TOUT le fichier (controle positif vert) |
| B47 | marche.phrase.bande_low | ● | – | servie, aucun cadre LOW | QUESTION | string_table.ts:3321 / :351 ; 0 occurrence |
| B48 | marche.phrase.bande_moderate | ● | M24 | affichee comme dessinee | OK | string_table.ts:3322 / :352 ; dessine a l octet cadre 102 |
| B49 | marche.phrase.bande_high | ● | – | servie, aucun cadre HIGH non-ash | QUESTION | string_table.ts:3320 / :350 ; 0 occurrence |
| B50 | marche.phrase.case_sans_ligne | ● | M27 | affichee comme dessinee | OK | string_table.ts:3325 / :355 ; dessine a l octet cadre 103 |
| B51 | marche.phrase.case_ash | ● | M29 | affichee comme dessinee | OK | string_table.ts:3324 / :354 ; dessine cadre 146 (+1 phrase en trop) |
| B52 | marche.phrase.bilan_lignes (ICU plural) | ● | M19 | dessinee en LETTRES, servie en CHIFFRES | DEFAUT | string_table.ts:3323 / :353 ; rendu attendu « 3 lignes sur 72 » ABSENT, dessine « Trois lignes sur soixante-douze » |
| B53 | marche.etat.chargement | ● | – | servie, aucun cadre de chargement | QUESTION | string_table.ts:3310 / :340 ; 0 occurrence |
| B54 | marche.etat.echec | ● | – | servie, aucun cadre d echec | QUESTION | string_table.ts:3311 / :341 ; 0 occurrence |
| N01 | M01 — barre « ARGENT / 24 850 € » — l argent du joueur | – | ● | dessinee sans source DANS CE LOT | HORS DOMAINE | cadre-101.html, .barre .aile |
| N02 | M02 — barre « CHALEUR / Tiede » + jauge — la chaleur policiere | – | ● | dessinee sans source DANS CE LOT | HORS DOMAINE | cadre-101.html, .barre .mano |
| N03 | M03 — barre « JOUR 12 / Plein jour » — le jour et la phase | – | ● | dessinee sans source DANS CE LOT | HORS DOMAINE | cadre-101.html, .barre .aile.droite |
| N04 | M13 — l ORDRE des 18 lignes — quel quartier est a quelle ligne | – | ● | dessinee sans source | ASSUME A CONSIGNER | mesure : 1,2,3,4,5,6,7,11,12,8,9,13,10,14,16,15,17,18 (cadre-101.txt:110-331) vs asc(id) world-geography.repository.ts:88 et district_id ASC market.controller.ts:97 |
| N05 | reliefs typographiques dans 5 chaines servies — la moitie de phrase mise en avant | – | ● | dessinee sans source | ASSUME A CONSIGNER | 6 occurrences mesurees : <em> 101 ; <u> 102 « pas le prix » ; <u>x2 103 « a zero »/« jamais ouverte » ; <u> 104 « genre » ; <u> 146 « tient » (relief-et-compteurs.txt) — les 31 valeurs servies sont PLATES |
| N06 | M22 — l onglet actif (.og.pris) — la substance choisie | – | ● | dessinee sans source | ASSUME A CONSIGNER | cadre-101.html .onglets .og.pris (crick) |
| N07 | le gabarit « NOM · BANDE » — la composition titre du panneau | – | ● | dessinee sans source | ASSUME A CONSIGNER | cadres 102/103/146 .pann.pp>b ; aucune cle marche.gabarit.* parmi les 31 |
| N08 | M28 — titre « LE VERRE · UNE LIGNE QUI TIENT » — la bande de la case ash | – | ● | dessinee sans source | ECART (mots ratifies contraires) | cadre-146.html .pann.pp>b ; RETIRE par MOTS-MARCHE-21.md:33, remplace par 24a « HORS DU TABLEAU » |
| N09 | M29b — 2e phrase ash — « Le tableau dit seulement si la ligne tient — jamais ce qu elle vaut. » | – | ● | dessinee sans source | ECART (mots ratifies contraires) | cadre-146.html .pann.pp>small ; RETIREE par MOTS-MARCHE-21.md:33 ; absente des 31 cles |
| N10 | M30 — les voyants ASH ALLUMES — une ligne ash existe et sa bande | – | ● | dessinee sans source | ECART (TD-966 contredit) | 4 cases mesurees : 146 Le Verre 1.00, Place des Comptes 0.75, La Lisiere 0.54 ; 104 glass x ash « DESCEND » (voyants-allumes.txt) |
| N11 | M31 — entete « genre » — la colonne de gauche du tableau de region | – | ● | dessinee sans source | ASSUME A CONSIGNER | cadres 104:84 / 105 ; aucune cle (marche.colonne.quartier seule existe) |
| N12 | M33 — le tableau de region 6x4 — la liste des (genre x substance) | – | ● | dessinee sans source | LOT BACK (enumerateur) | 24 cases mesurees, 6 rg (voyants-allumes.txt) ; aucun enumerateur : GET me/meta-market/signal exige substance+district_profile (meta-market.controller.ts:79-86) |
| N13 | M38 — les 3 couleurs de direction — monte / tient / descend | – | ● | dessinee sans source | ASSUME A CONSIGNER | #43e0c0 / #ffd23f / #ff5a4d (cadre-104.html) |
| N14 | M39 — le panneau du cadre 104 — « Six genres d endroit, pas dix-huit quartiers » + « elles disent une direction, jamais un chiffre » | – | ● | dessinee sans source | ASSUME A CONSIGNER | cadre-104.txt:183-197 ; 3 textes, aucune cle parmi les 31 |
| N15 | M43 — le panneau du cadre 105 (le mur) — « Vous ne dites pas vos prix / alors on ne vous dit pas les notres. Ca se rouvre au Coffre, tiroir le jeu » | – | ● | dessinee sans source | ASSUME A CONSIGNER | cadre-105 .pann ; aucune cle parmi les 31 ; renvoi a l ecran ㉖ (PUT me/meta-market/visibility) |
| N16 | M44 — « L2 maillon manquant » — auto-documentation : 3 mesures en projection sans ecrivain | – | ● | dessinee sans source | TROU DOCUMENTE (se garde) | cadre-106 ; q_inferred/realised_price_multiplier/lambda market-projection.service.ts:71-76, absentes de la route (market.controller.ts:11-14) |
| N17 | M45 — « L4 maillon manquant » — auto-documentation : la region connait un prix, l ecran ne le montre pas | – | ● | dessinee sans source | TROU DOCUMENTE (se garde) | cadre-106 ; medianCents/p10/p90 meta-market.controller.ts:98-100 |

### Annexe 8 — fichiers de mesure de ce dossier

| fichier | ce qu'il prouve |
|---|---|
| `mesures/maquette-4ae50cca.html` | la maquette au commit épinglé (2 662 051 octets, 155 cadres) |
| `mesures/extrait-cadres.py` | l'indexeur de cadres (découpe par comptage de `<div>`, pas par `html.parser`) |
| `mesures/aplatir.py` | le lecteur de cadre (n'avale aucune balise vide) |
| `mesures/index-cadres.txt` | les 155 cadres et leurs étiquettes |
| `mesures/recherche-cadres-marche.txt` | le balayage des 155 cadres par marqueur |
| `mesures/delimitation-m.txt` | les 2 régions de ㉑ et leurs cadres (101-106, 146) |
| `mesures/ou-sont-143-145.txt` | 143 → ㊴, 145 → ㊳ : ni l'un ni l'autre n'est de ㉑ |
| `mesures/cadre-1*.html` / `.txt` | les 7 cadres de ㉑ (+ 143, 145) bruts et aplatis |
| `mesures/voyants-allumes.txt` | 72 et 24 cases, et les voyants allumés avec leur opacité |
| `mesures/textes-hors-grille.txt` | tous les textes des 7 cadres |
| `mesures/confrontation-textes.txt` | les 31 valeurs servies confrontées au contenu d'écran |
| `mesures/relief-et-compteurs.txt` | les 6 reliefs typographiques et les 12 compteurs |
| `mesures/aside-et-css-21.txt`, `commentaires-region-21.txt` | la documentation de la maquette (prose, non dessinée) |
| `mesures/temps1-routes.txt`, `temps1b-profils-districts.txt` | le balayage des 149 contrôleurs |
| `mesures/cles-marche-brut.txt`, `cles-marche-valeurs.txt` | les 31 clés et leurs 62 valeurs FR/EN |
| `mesures/noms-de-quartier.txt` | les 18 noms et tous leurs sites de projection |
| `mesures/bmoins-tables.txt` | les tables du domaine et leurs colonnes |
| `mesures/is-luxury.txt`, `ash-chemin-ecriture.txt`, `ash-verdict-ecriture.txt` | la chaîne complète « ash peut-il s'allumer ? » |
| `mesures/gardes-et-specs.txt`, `specs-epingles.txt`, `spec-i18n-et-mots.txt` | les gardes des 5 routes et les specs qui épinglent |
| `mesures/meta-market-read.txt` | le mur de visibilité et le plancher d'échantillon |
| `mesures/controle-arithmetique.py`, `table-couverture.md`, `controle-negatif.txt` | les trois comptes, la table et le rouge du contrôle négatif |
