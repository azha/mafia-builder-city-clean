# Juge données ⊥ — ⑮ Les inspections (MIS Inspection Queue) — clôture — 2026-09-07

Juge à contexte vierge. Ni auteur de l'écran, ni juge visuel, ni lecteur d'un rapport précédent.
Mesures et commandes : `mesures/` (scripts `01-b-compte-frais.sh`, `02-b-action-report.sh`,
`03-m-inventaire.py`, sorties `.txt` / `.json`).

## En une phrase

L'écran affiche **13 des 13 clés** que sa route de lecture sert — et **rien d'autre** : les
**4 clés de son action** (`POST …/report`, dont le tarif `cost_resolved` = 50 **mesuré**) sont
déclarées dans le DTO et **jamais lues**, le **nom du district** est servi par `GET /v1/world/districts`
(mesuré, 18 lignes, 9 clés) et **jamais affiché** — l'écran écrit `district district-1` —, et les
**11 valeurs affichées sont des enums anglais bruts** faute de la moindre clé i18n (`0` clé
police/inspection sur les **886** du bundle `fr`). **7 défauts, 9 questions, 3 lots back.**

---

## Réponses aux 4 questions prioritaires du dossier

### Q1 — Les onze valeurs affichées : clé, contrainte, résolveur

**Le compte de f2 est CONFIRMÉ** : sur la planche, `None` ×8 · `Predominant` ×2 · `Moderate` ×1
= **11**, plus `district district-1 · Nominal`. Recompté sur l'image livrée (3 `None` en gravité,
5 en provenance ; `Predominant` sur *Faible* et sur *Programmée*).

| # | valeur affichée | clé B | contrainte des valeurs (source) | résolveur client |
|---|---|---|---|---|
| 1 | `Moderate` | `queue_load` | union TS 5 membres `EMPTY\|LIGHT\|MODERATE\|HEAVY\|SATURATED` — `inspection.projection.service.ts:42`. **Aucune contrainte DB** : la valeur est **dérivée** à l'appel (`loadBucket`, `:114-122`), jamais persistée | `Lisible()` — `InspectionScreenController.cs:269-274` |
| 2 | `Nominal` | `dispatcher_regime` | union TS 4 membres `NOMINAL\|BACKLOGGED\|BUDGET_CUT\|SURGE` — `inspection.service.ts:93`. Dérivée (`dispatcherRegime`, `:860-866`), jamais persistée | `Lisible()` idem |
| 3-6 | `None` ×3 + `Predominant` ×1 | `severity_distribution.{CRITICAL,HIGH,MEDIUM,LOW}` | clés = `PriorityBucket`, union TS 4 membres — `inspection.repository.ts:45` ; valeurs = `PresenceBand`, union TS 4 membres `NONE\|SOME\|MANY\|PREDOMINANT` — `inspection.projection.service.ts:52`. **jsonb, aucun pgEnum ni CHECK** (dit verbatim `inspection.repository.ts:51`) | `Lisible()` idem |
| 7-12 | `Predominant` ×1 + `None` ×5 | `type_distribution.{SCHEDULED,INFORMANT,FALSE_REPORT,GENUINE_REPORT,CASCADE,FORENSIC}` | clés = `QueueEntrySource`, union TS **6** membres — `inspection.repository.ts:56-63` (`FORENSIC` ajouté en C21, additif) ; valeurs = `PresenceBand` idem | `Lisible()` idem |
| — | `district-1` | `district` | **format littéral** `` `district-${districtId}` `` — `inspection.projection.service.ts:101`. Domaine = 1..18 (`isValidDistrict`, `inspection.service.ts:869` ; borne écrite `inspection.controller.ts:86`) | aucun — concaténé tel quel |

**Les 11 sont des enums bruts, et `Lisible()` n'est pas un résolveur** : il remplace `_` par une
espace, minusculise, remet une capitale (`:272-273`). `NONE`→`None`, `PREDOMINANT`→`Predominant`,
`FALSE_REPORT`→`False report`. **Aucune table de traduction.**

**« 4 écrans » (f2) — DIVERGENCE de nature, pas de compte.** Dans l'archive fournie, `Lisible`
apparaît dans **4 fichiers** (compte confirmé) : mais `DecisionDetailScreenController.cs:215` est un
**commentaire**, pas un appel, et les deux autres porteurs sont d'une **forme différente** —
`LibellesDecision.cs:48` est `return traduit == cle ? Lisible(cle) : traduit`, c'est-à-dire un
**repli derrière une table de traduction**. ⑮ est le seul des trois où `Lisible()` est **le seul
chemin**, sans table. Le compte de 4 tient ; l'assimilation des quatre ne tient pas.
*(Portée : l'archive `front-03efb90/` de ce dossier — 19 `.cs` —, pas l'arbre vivant.)*

**Et il n'y a rien à traduire VERS** — mesuré sur le bundle servi (`mesures/04-i18n-couverture.txt`,
886 clés, contrôle positif `error.resource.not_found` présent) : `queue_load` → **0** clé,
`dispatcher` → **0**, `presence`/`predominant`/`severity` → **0**, préfixe `police`/`inspection` →
**0** parmi **39 préfixes d'écran**. La convention existe pourtant et sert ailleurs :
`famille.band.*` (**10** clés), `*.etat.*` (**45**), `building.raid_risk.low/high`.
⇒ ce n'est pas une traduction oubliée côté client : **la clé n'existe pas côté back**. Lot L1.

### Q2 — Vue d'ensemble → district unique

**a) Le back ne sert AUCUN agrégat ville d'inspection.** Une seule projection existe,
`projectDistrict(playerId, districtId)` — `inspection.projection.service.ts:97`, **1** occurrence ;
`InspectionQueueProjection` n'est référencé que par elle et le contrôleur (balayage arbre `src/`).
La méthode qui rendrait l'agrégat **existe déjà** : `InspectionQueueRepository.listQueues(playerId)`
(`inspection.repository.ts:157`) — elle rend les 18 files en **une** requête, et elle est **déjà
appelée en production** par `inspection.controller.ts:174`, dans le POST, sans qu'aucune route ne
l'expose en lecture. **L'agrégat est à une projection de distance.** Lot L2.

**b) Le nom du district EST servi — deux fois — et l'écran ne l'appelle pas.**
`GET /v1/world/districts` (`world.controller.ts:39`, public) : **mesuré 200, 18 lignes, 9 clés**
`['bank_side','block_count','control_state','id','index','name','name_canonical','precinct_id','profile']`.
`name` est la **fiction française** (`Les Bassins`, `Quai-Nord`, `Sarnes`, `La Colonne`…),
`name_canonical` la forme canon (`Tidewater-1` … `Verge-A`). Dans l'archive : `world/districts` →
**0** hit, `name_canonical` → **0**, `precinct_id` → **0**. ⇒ ce n'est **pas** une forme F (la
projection porte le nom) : c'est un **défaut de câblage client**. D1.

**c) L'écran appelle 1 district, pas 18** — et toujours le même : `districtId` est un
`[SerializeField]` initialisé à `1` (`InspectionScreenController.cs:44`), **sans accesseur**, et
`LireFile` est appelé **1** fois (`:146`). **17 districts sur 18 sont inatteignables.** D2.

**d) Les chaînes déclarées par f2 sont ABSENTES de la maquette — DIVERGENCE.** Comptes `grep -cF`
sur `ecrans-brennar-6.html` (contrôle positif `LES BASSINS` = 4 ; contrôle négatif = 0) :
`SOUS CHARGE` = **0** · `AU CALME` = **0** · `Verge-A` = **0** · `VERGE-A` = **0**.
Le cadre #32 ne dit pas « 2 DISTRICTS SOUS CHARGE · 16 AU CALME » mais
**« 18 DISTRICTS · TOUT OU RIEN : LA POLICE OUVRE SES FILES PARTOUT À LA FOIS »**, et il ne nomme
pas « Verge-A » : il nomme les **18 fictions françaises**. `JOUR 26` = 4 (barre du shell, pas
l'écran). ⇒ la maquette ne demande **pas** un résumé chiffré de la ville ; elle demande le
**registre des 18 lignes**.

### Q3 — L'action `POST /v1/city/inspection/report`

**Paramètres** (`inspection.controller.ts:129-171`) : `rejectUnknownFields(['entry_type','building_id'])` ·
`entry_type` ∈ `{FALSE_REPORT, GENUINE_REPORT}` — **seule contrainte DB réelle du domaine** :
`0036_false_report_ledger.sql:54` `CHECK (entry_type IN ('FALSE_REPORT','GENUINE_REPORT'))` ·
`building_id` accepte **deux formes** : un **uuid** (bâtiment possédé, contrôle d'appartenance
`:154-160`) ou un **entier** (proxy hérité, `:163-170`).

**Le tarif EST servi — mesuré, pas déduit** (`mesures/POST-report-GENUINE_REPORT.json`, mon compte
frais, HTTP **201**) :
`{report_id, entry_type, cost_resolved: 50, backlash_triggered: false}` — 4 clés.
`cost_resolved` = `inspectionTunables.falseReportBaseCost`, défaut **50** (`inspection-tunables.ts:77`).
La maquette #33 affiche « PRIX **50** — *annoncé par le serveur, rien n'est débité aujourd'hui* » :
**exact des deux côtés** (le back le dit aussi : « economy deduction P2-future »,
`false-report-ledger.service.ts` §`FileReportResult`).

**L'action est totalement absente de l'écran.** `client.Deposer` → **0** appel ·
`Button`/`onClick`/`AddListener`/`LongPressButton` → **0** chacun (contrôle positif
`TextMeshProUGUI` = 7) · `DernierRapport` déclaré `:47`, **jamais assigné** · `batonTexte` créé
`:305`, `SetActive(false)` `:308`, **jamais réactivé** (les 3 `SetActive` du fichier sont
`:157,308,316`). ⇒ **les 4 clés de la réponse sont reçues par personne**, et le retour de bâton —
que le code appelle lui-même « visible une seule fois, le rater c'est le perdre »
(`InspectionClient.cs:52-56`) — est **structurellement inatteignable**. D3.

### Q4 — Les 8 rangées « rien » : projection ou client ?

**C'est le CLIENT.** Le back sert **toujours** les zéros, par construction : la projection boucle
sur les domaines fermés — `for (const b of ALL_BUCKETS) out[b] = …` (`:130`) et
`for (const s of ALL_SOURCES) out[s] = …` (`:147`) — donc **4 + 6 clés toujours présentes**, à
`NONE` quand le compte est nul (`presenceBand`, `:152-158`). C'est délibéré et c'est **bien** : un
ensemble de clés stable est ce qui rend une épingle de clés possible.

La **maquette**, elle, compresse : la colonne `ORIGINES` rend `—` quand rien n'est présent
(**10 lignes sur 18**), et n'affiche que les origines vivantes (`PROGRAMMEE ▓▓▓ INDIC ▓`).
Le **front** rend les 11 rangées, `None` compris, en les grisant (`r == 0 ? Eteint : Creme`,
`:218` et `:235`). ⇒ ni la projection ni un défaut : un **écart de rendu** entre ce que la maquette
demande (compresser) et ce que le client fait (tout lister). D6.

---

## Défauts

| # | information | B | M | F | statut | preuve |
|---|---|---|---|---|---|---|
| **D1** | **nom du district** | ● `world/districts.name` (`world.controller.ts:39` ; mesuré 18×9 clés, `name`=`Les Bassins`…) | ● colonne `DISTRICT`, 18 fictions (`03-m-sortie.txt`) | – | **dessiné + disponible + non affiché** | archive : `world/districts` 0 hit, `name_canonical` 0 hit |
| **D2** | **les 17 autres districts** | ● 1..18 (`isValidDistrict`, `inspection.service.ts:869`) ; `listQueues` rend les 18 (`inspection.repository.ts:157`) | ● 18 lignes + pied « 18 DISTRICTS · TOUT OU RIEN » | – (1 seul, figé) | **dessiné + disponible + non affiché** | `districtId=1` `[SerializeField]` sans accesseur `:44` ; `LireFile` ×1 `:146` |
| **D3** | **l'action + son retour de bâton** (`report_id`, `entry_type`, `cost_resolved`=50, `backlash_triggered`) | ● 4 clés **mesurées** 201 | ● cadres #33 (`DÉPOSER`, `PRIX 50`) et #34 (`LE RETOUR DE BÂTON`) | – | **dessiné + disponible + non affiché** | `Deposer` 0 appel · 0 `Button`/`onClick` · `DernierRapport` jamais assigné `:47` · `batonTexte` jamais réactivé `:305-308` |
| **D4** | **les 11 valeurs en anglais brut** | ● bandes d'un domaine fermé | ● en **français** (`LEGERE`, `ARRIERE`, `PROGRAMMEE`, `FORENSIQUE`) | ● en **anglais** (`None`, `Predominant`, `Moderate`, `Nominal`) | **affiché sans source de libellé** | `Lisible()` `:269-274` ; bundle : 0 clé sur 886, 0 préfixe police/inspection sur 39 |
| **D5** | **`district district-1`** — le libellé double le slug | ● `district` = `district-1` (format serveur, `:101`) | ● un **nom**, jamais un slug | ● **doublé** | **affiché sans source** (littéral + slug) | `sousTitre.text = $"district {File.district} · …"` `:170` ; planche : « district district-1 · Nominal » |
| **D6** | **les 8 rangées à `None`** | ● servies (domaines fermés, `:130`/`:147`) | ● **compressées** en `—` (10/18 lignes) | ● **toutes listées**, grisées | dessiné ≠ affiché (rendu) | `03-m-sortie.txt` colonne `sr` ; `:218`,`:235` |
| **D7** | **la colonne `N` (compte brut 0..4)** | – **aucune source, et interdite** | ● 18 valeurs `0..4` | – | **dessiné sans source** — conflit **Inv 4 / R2.2** | projection : 5 clés, toutes des bandes (`:100-106`) ; `total_queue_length` = **1** hit, dans un **commentaire** (`inspection.controller.ts:113`) — donc pas même un seam `_test` ne le projette |

> **D7 est un conflit de canon, pas un lot back.** La projection refuse le compte exact en toutes
> lettres (« NEVER building ids, exact positions, or raw counts », `inspection.projection.service.ts:12`).
> Le servir demanderait de rouvrir Inv 4 — c'est un arbitrage produit, pas une omission. **Je le
> signale, je ne le tranche pas.**

---

## « Passé à côté ? » — pour l'user (questions, pas défauts)

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| 1 | `precinct_id` (`world/districts`) | quel commissariat instruit ce district | **utile ici** : c'est le pont vers ⑰ ; « qui vous inspecte » est la question que l'écran pose sans y répondre | ★★★ |
| 2 | `age_in_ticks` (colonne `QueueEntry`, jamais projetée) | depuis combien de temps la file attend | **utile ici**, en **bande** : une file vieille et une file neuve à charge égale ne veulent pas dire la même chose. Ne viole pas Inv 4 (ni position ni compte) | ★★★ |
| 3 | `control_state` (`world/districts`) | qui tient le district (mesuré `UNCONTESTED` ×18) | **utile ici** : recoupe la pression policière avec la pression rivale sur la même ligne | ★★ |
| 4 | `forensic_kind` (`QueueEntry`, 5 valeurs, jamais projeté) | *quel* type de médico-légal arrive (`hard_audit`, `effluent_inspection`, `tail_*`) | **utile ici** : la rangée « Médico-légal » est la plus menaçante et la moins parlante ; la qualifier change la décision | ★★ |
| 5 | `backlash_penalty_active` / `_remaining_count` (`false_report_ledger_summary`) | la police vous a-t-elle grillé, et pour combien de temps encore | **utile ici** : aujourd'hui l'état ne se lit **qu'à l'instant** du dépôt et se perd ; c'est la seule façon de le relire | ★★ |
| 6 | `block_count` (`world/districts`) | la taille du district (mesuré 37..58) | *pas ici* : dénominateur utile sur la carte, pas dans un registre de dispatch | ★ |
| 7 | `profile` / `index` / `name_canonical` | la famille du district (`tidewater`, `spine`…) | *pas ici* : identité, déjà portée par le nom de fiction | ★ |
| 8 | `bank_side` (`world/districts`) | rive nord / sud | *pas ici* : pertinent pour un tri, pas pour la charge | ★ |
| 9 | `source_confirmed` / `verified_false_at` (`false_report_ledger`) | votre signalement a-t-il été confirmé | *pas ici* mais **ailleurs** : c'est l'issue du geste de #33, et rien ne la rend | ★★ |

---

## Lots back suggérés

| # | quoi | pourquoi | preuve |
|---|---|---|---|
| **L1** | **clés i18n du domaine police** — 5 `queue_load` + 4 `dispatcher_regime` + 4 `PresenceBand` + 6 `QueueEntrySource` + 4 `PriorityBucket` = **23 clés** sous un préfixe `police.*` | sans elles le client **ne peut pas** traduire : il n'y a pas de cible. La convention existe déjà (`famille.band.*` 10 clés, `*.etat.*` 45) | bundle `fr` mesuré : **886** clés, **0** sur ces 23 valeurs sous un préfixe du domaine ; **39** préfixes d'écran, aucun `police`/`inspection` |
| **L2** | **projection d'agrégat** `GET /v1/city/inspection` → les 18 districts en une réponse | la maquette #32 EST cet écran ; le repository le fait déjà en une requête, et le contrôleur l'appelle déjà | `listQueues` `inspection.repository.ts:157`, appelée en prod `inspection.controller.ts:174` ; sinon 18 appels (le client le dit : `InspectionClient.cs:11-15`) |
| **L3** | **forme F** — `age_in_ticks` (bande) et `forensic_kind` ajoutés à la projection | écrits en base, relus par le tick, **passés au compositeur** (`state.entries`, `:128`/`:145`) et **omis par la projection** : la définition même de la forme F | `age_in_ticks` et `forensic_kind` : **0** contrôleur joueur, **0** projection (contrôle positif : `queue_load` → 1 projection) |

> **Ce qui n'est PAS un lot back** : `length`, `processing_rate_per_day`, `budget_modifier`,
> `entries`, `building_id`, `decay_accumulator` — colonnes réelles de `inspection_queues` /
> `QueueEntry`, **jamais projetées** et **délibérément** : Inv 4 / R2.2, écrit dans le fichier
> (`inspection.projection.service.ts:11-25`). Elles sont B⁻ **par doctrine**, pas par oubli.

---

## Actions : routes ↔ CTA

| route joueur (`JwtAuthGuard`) | CTA maquette | CTA front | verdict |
|---|---|---|---|
| `GET city/district/:id/inspection` (`inspection.controller.ts:76-77`) | la vue #32 elle-même | chargement auto (`SetToken`→`Charger` `:141-148`) | ✔ appelée (1 district sur 18 — D2) |
| `POST city/inspection/report` (`:117-119`) | ● « **DÉPOSER** » (#33) + avertissement « au bout de plusieurs, la police se retourne » | **aucun** | **DÉFAUT D3** — route sans geste |
| `GET world/districts` (`world.controller.ts:39`) | ● les 18 noms (#32) | **aucun** | **DÉFAUT D1** — route servie, jamais appelée |

**Aucun CTA sans route** (il n'y a aucun CTA). Les 2 routes du domaine sont bien sous
`JwtAuthGuard` ; `inspection-test.controller.ts` est un seam non câblé — hors périmètre, non compté.

---

## Table de couverture complète

Légende : ● présent · – absent · B⁻ en base non projeté.

### Route de lecture — `GET /v1/city/district/:id/inspection` (13 clés-feuilles)

| # | information | B | M(#32) | F | statut |
|---|---|---|---|---|---|
| 1 | `district` | ● | ● (nom) | ● (slug doublé) | **DÉFAUT D5** + D1 |
| 2 | `queue_load` | ● | ● `CHARGE` | ● crans ×5 + `Moderate` | ✔ (libellé D4) |
| 3 | `dispatcher_regime` | ● | ● `REGIME` | ● texte + couleur | ✔ (libellé D4) |
| 4 | `severity_distribution.CRITICAL` | ● | – | ● « Critique » | ● – ● **à ratifier** |
| 5 | `severity_distribution.HIGH` | ● | – | ● « Élevée » | ● – ● **à ratifier** |
| 6 | `severity_distribution.MEDIUM` | ● | – | ● « Moyenne » | ● – ● **à ratifier** |
| 7 | `severity_distribution.LOW` | ● | – | ● « Faible » | ● – ● **à ratifier** |
| 8 | `type_distribution.SCHEDULED` | ● | ● `PROGRAMMEE` | ● « Programmée » | ✔ |
| 9 | `type_distribution.INFORMANT` | ● | ● `INDIC` | ● « Indicateur » | ✔ |
| 10 | `type_distribution.FALSE_REPORT` | ● | – (`—` si nul) | ● « Faux rapport » | ✔ / D6 |
| 11 | `type_distribution.GENUINE_REPORT` | ● | – (`—` si nul) | ● « Rapport fondé » | ✔ / D6 |
| 12 | `type_distribution.CASCADE` | ● | ● `CASCADE` | ● « Cascade » | ✔ |
| 13 | `type_distribution.FORENSIC` | ● | ● `FORENSIQUE` | ● « Médico-légal » | ✔ |

> **4-7 (la gravité)** : dessinée par le **canon de série 2** que le client implémente, **absente**
> du cadre #32 de série 6. C'est le seul endroit où l'écart de direction (série 2 rejetée / série 6
> ratifiée) devient un écart de **données**. Non tranché ici : arbitrage produit.

### Route d'action — `POST /v1/city/inspection/report` (4 clés, mesurées)

| # | information | B | M | F | statut |
|---|---|---|---|---|---|
| 14 | `report_id` | ● | – | – | ● – – question (plomberie) |
| 15 | `entry_type` | ● | ● #33 | – | **DÉFAUT D3** |
| 16 | `cost_resolved` (=50) | ● | ● #33 « PRIX 50 » | – | **DÉFAUT D3** |
| 17 | `backlash_triggered` | ● | ● #34 | – | **DÉFAUT D3** |

### Route voisine servie — `GET /v1/world/districts` (9 clés × 18)

| # | information | B | M | F | statut |
|---|---|---|---|---|---|
| 18 | `name` | ● | ● | – | **DÉFAUT D1** |
| 19 | `precinct_id` | ● | – | – | question ★★★ |
| 20 | `control_state` | ● | – | – | question ★★ |
| 21 | `block_count` | ● | – | – | question ★ |
| 22 | `name_canonical` | ● | – | – | question ★ |
| 23 | `profile` | ● | – | – | question ★ |
| 24 | `index` | ● | – | – | question ★ |
| 25 | `bank_side` | ● | – | – | question ★ |
| 26 | `id` | ● | – | – | plomberie (le `:id` de la route) |

### Éléments M non appariés (3)

| # | élément | source ? | statut |
|---|---|---|---|
| 27 | colonne `N` — compte brut `0..4` ×18 | **aucune**, et interdite par Inv 4 | **DÉFAUT D7** (conflit de canon) |
| 28 | pied « 18 DISTRICTS · TOUT OU RIEN… » | dérivable (cardinal **18** mesuré sur `world/districts`) | assumable si D2 est réparé |
| 29 | tête « 12H · JOUR 26 » (cycle de dispatch) | le `12H` est la cadence du tick (`runDispatchTick`) ; le jour vient de la session, **pas** de cette route | à consigner |

### Éléments F sans source (2)

| # | élément | preuve | statut |
|---|---|---|---|
| 30 | `districtId = 1` **en dur** — choisit la donnée montrée | `InspectionScreenController.cs:44` | **DÉFAUT D2** |
| 31 | préfixe littéral `"district "` devant un slug déjà préfixé | `:170` (et `:165`, `:300`) | **DÉFAUT D5** |

### Contrôle d'arithmétique

```
|clés B|                  = 26   (13 GET + 4 POST + 9 world/districts)
|éléments M non appariés| =  3   (N brut · pied 18-districts · tête 12H/JOUR)
|rendus F sans source|    =  2   (districtId en dur · préfixe littéral)
                    somme = 31   = nombre de lignes de la table   ✔
```

Éléments **volontairement exclus** du dénominateur (déclaré pour que le compte soit auditable) :
la barre du shell (`ARGENT 24 850,00 €`, `CHALEUR Tiède`, `JOUR 26 · Nuit`) et le dock — chrome
d'autres écrans, servis par d'autres routes ; les 12 libellés purement littéraux de F (titre,
2 en-têtes de section, 10 noms de rangée, 2 phrases d'état vide) — inventoriés en **annexe 5**,
sans sémantique de donnée.

---

## Annexes

### 1. Routes du domaine — compte et ancres

Balayage `@Get|@Post` du mot du domaine dans **tous** les contrôleurs (`grep -ril "inspection"
--include="*.controller.ts"` → **19** fichiers, dont **15** `_test`/`admin` écartés ⇒ **4** restants :
`inspection.controller.ts` — le seul qui porte les routes du domaine —, plus `appeal`, `deal-lek`,
`unconformity` qui citent le mot sans servir la file) :

- `inspection.controller.ts:76` `@Get('city/district/:id/inspection')` + `@UseGuards(JwtAuthGuard)` `:77`
- `inspection.controller.ts:117` `@Post('city/inspection/report')` + `:118` guard + `:119` `@HttpCode(201)`
- `inspection-test.controller.ts` — seam, non câblé, **exclu**

Élargissement prescrit par le mandat (grep du mot `district` dans tous les contrôleurs) → **12**
routes joueur portant `district` dans leur chemin, dont **`world.controller.ts:39`
`@Get('world/districts')`** (public, sans guard) : c'est elle qui porte le nom que la maquette
dessine. Les 10 autres appartiennent à d'autres systèmes (heat, leks, throughput, buffer,
unconformity, stash, flow, interior, cohesion, market lanes) — hors périmètre.

Les deux listes (back ↔ client) se recouvrent exactement sur les 2 routes d'`InspectionClient.cs`
(`LireFile` `:32`, `Deposer` `:64`) ; **`world/districts` est dans la liste back et pas dans la
liste client** — c'est D1.

### 2. Corps réels — `mesures/`

| fichier | commande | résultat |
|---|---|---|
| `signup.json` | `01-b-compte-frais.sh` | **201**, compte frais `jd15-1788755111` |
| `session-open.json` | idem | **200**, 12 clés |
| `GET-inspection-d1.json` | idem | **404** `RESOURCE_NOT_FOUND` — « the city sim has not ticked the 12h dispatch » |
| `POST-report-GENUINE_REPORT.json` | `02-b-action-report.sh` | **201**, `{report_id, entry_type, cost_resolved:50, backlash_triggered:false}` |
| `POST-report-FALSE_REPORT.json` | idem | **201** |
| `GET-inspection-d1-apres-report.json` | idem | **404** — déposer un rapport **ne crée pas** la file |
| `GET-inspection-d1-relecture.json` | ~5 min plus tard | **404** — aucun tick sur la pile dev dans la fenêtre observée |
| `GET-world-districts.json` | `01-…sh` (ajout) | **200**, **18** lignes, **9** clés |
| `GET-i18n-bundle-fr.json` | — | **200**, **886** clés |

**Dimensionnement assumé et déclaré** : les 2 `POST report` sont des mutations que j'ai faites
**sur mon seul compte frais**, jamais sur `operational_demo` ni `demo_capture`. Elles étaient
nécessaires : la mutation n'avait **aucun** corps réel au 04/09 (« pas de corps réel sans changer
l'état du compte de démo ») et Q3 demande si le tarif est servi. Aucune route `_test`, aucun
`advance`, aucun tick.

**Chaîne de préconditions du 404, remontée jusqu'à l'écrivain** : `inspection_queues` n'a
**qu'un** chemin d'écriture — `InspectionQueueRepository.seedDistricts` (`inspection.repository.ts:140`),
appelée **uniquement** par `ensureSeeded` (`inspection.service.ts:812-819`), appelée **uniquement**
par `runDispatchTick` (`:386`). ⇒ le 404 n'est pas une chaîne morte : c'est un état légitime
« aucun tick 12h encore », que le client traite comme tel (`:160-164`). *Mon premier motif
(`insert(inspectionQueue)`) rendait **0** — l'écriture est un `sql` interpolé ; c'est la lecture du
corps qui l'a trouvée, pas le grep.*

### 3. Valeurs possibles par clé — contrainte source

| domaine | membres | source | contrainte DB |
|---|---|---|---|
| `QueueLoadBucket` | 5 : `EMPTY LIGHT MODERATE HEAVY SATURATED` | `inspection.projection.service.ts:42` | **aucune** (dérivé, non persisté) |
| `DispatcherRegime` | 4 : `NOMINAL BACKLOGGED BUDGET_CUT SURGE` | `inspection.service.ts:93` | **aucune** (dérivé ; ordre de précédence `:861-865` — `BUDGET_CUT`/`SURGE` priment sur `BACKLOGGED`) |
| `PresenceBand` | 4 : `NONE SOME MANY PREDOMINANT` | `inspection.projection.service.ts:52` | **aucune** (dérivé) |
| `PriorityBucket` | 4 : `LOW MEDIUM HIGH CRITICAL` | `inspection.repository.ts:45` | **aucune** — jsonb, dit verbatim `:51` |
| `QueueEntrySource` | 6 : `SCHEDULED INFORMANT FALSE_REPORT GENUINE_REPORT CASCADE FORENSIC` | `inspection.repository.ts:56-63` | **aucune** — jsonb |
| `FalseReportEntryType` | 2 : `FALSE_REPORT GENUINE_REPORT` | `false_report_ledger.ts:31` | ✅ `0036_false_report_ledger.sql:54` |
| `district` | `district-1` … `district-18` | format `:101` ; borne `inspection.service.ts:869` | — |

**Seuils** (jamais exposés, mais ils décident des bandes) : charge `.25` / `.60` / `1.0` du cap
(`:74-76`) ; présence `.25` / `.50` de la file (`:80-81`) ; `BACKLOGGED` à **80 %** du cap
(`inspection.service.ts:108`) ; cap par défaut **32** (`inspection-tunables.ts:70-73`).

**Non-dérive de forme** : l'ensemble de clés du corps du 04/09 (`corps-reels-04-09/`, image d'un
autre monde) est **identique** à l'interface d'aujourd'hui — 5 clés de 1er niveau, 4 sous
`severity_distribution`, 6 sous `type_distribution`. La forme n'a pas bougé entre les deux images.

### 4. Inventaire M — cadre #32, série 6 (`03-m-sortie.txt`)

`ecrans-brennar-6.html`, ancre `<!-- 32 :` → `<!-- 33 :`, **4 959** octets, **18** lignes extraites.

| id | élément | représente | domaine observé |
|---|---|---|---|
| M01 | tête `BPD · REGISTRE DE DISPATCH` | identité de l'écran | littéral |
| M02 | tête `12H · JOUR 26` | cycle de dispatch + jour de jeu | 1 valeur |
| M03 | colonne `DISTRICT` ×18 | nom de fiction du district | **18** distincts |
| M04 | colonne `N` ×18 | **compte brut** d'entrées | **5** distincts (`0 1 2 3 4`) |
| M05 | colonne `CHARGE` ×18 | bande de charge | **2** (`VIDE`, `LEGERE`) |
| M06 | colonne `REGIME` ×18 | régime du répartiteur | **2** (`NOMINAL`, `ARRIERE`) |
| M07 | colonne `ORIGINES` ×18 | présence par origine, en `▓` | **8** formes, dont `—` (10/18) |
| M08 | pied `18 DISTRICTS · TOUT OU RIEN…` | cardinal + doctrine | littéral |
| M09 | barre (`ARGENT`, `CHALEUR`, `JOUR`, `Nuit`) | chrome du shell | hors périmètre |

Cadres voisins du même domaine (le dossier n'en nomme qu'un ; ils portent l'action) :
**#33** « déposer un signalement » — `SUR : un bâtiment de La Lisière` · `PRIX : 50` · `EFFET : une
entrée de plus dans leur file` · tampon `DÉPOSER` · `⚠ au bout de plusieurs, la police se retourne` ;
**#34** « le retour de bâton ».

⚠️ **Le PNG de référence livré dans ce dossier n'est pas celui de ⑮.**
`reference-reference-⑮-1080x2102.png` montre « CE QU'ILS SAVENT — six commissariats » et six fiches
`PRÉCINCT 1..6` : c'est le **cadre #31**, l'écran ⑰. Le dossier l'annonçait comme un risque
(« le dossier visuel rendait #31 par erreur ») — **confirmé par lecture de l'image**. Mon
inventaire M vient donc du **HTML**, pas de ce PNG.

### 5. Inventaire F — champ → sites → classe

Portée : `front-03efb90/Assets/Scripts/CitySim/Inspection/` (SHA `03efb90`).
*Les comptes sont des comptes de **lignes** (`grep -c`) : la ligne `:175` porte deux occurrences de
`.queue_load`.*

| champ DTO | lignes | sites | classe |
|---|---|---|---|
| `FileData.district` | 1 | `:170` | **RENDU** (sous-titre, slug doublé) |
| `FileData.queue_load` | 1 | `:175` (×2) | **RENDU** (5 crans + texte) |
| `FileData.dispatcher_regime` | 3 | `:170` texte, `:171-172` couleur | **RENDU + LOGIQUE** |
| `severity_distribution` (4 clés) | 5 | `:178` garde, `:182-185` | **RENDU** |
| `type_distribution` (6 clés) | 7 | `:189` garde, `:191-196` | **RENDU** |
| `RapportData.report_id` | **0** | — | **IGNORÉ** |
| `RapportData.entry_type` | **0** | — | **IGNORÉ** |
| `RapportData.cost_resolved` | **0** | — | **IGNORÉ** |
| `RapportData.backlash_triggered` | **0** | — | **IGNORÉ** |

*Contrôle positif : `.queue_load` → 1 ligne (`:175`, vraie). Contrôle négatif : un champ inventé
→ 0. Le motif `\.<champ>\b` ne peut pas confondre `.district` et `districtId` (pas de frontière de
mot avant `I`) — vérifié.*

**Affiché sans champ** (littéraux et valeurs en dur) :

| valeur | site | jugement |
|---|---|---|
| `districtId = 1` | `:44` | **D2** — décide de la donnée montrée |
| `"district "` (préfixe) | `:165`, `:170`, `:300` | **D5** — double le slug |
| `"LES INSPECTIONS"` | `:296` | titre, légitime |
| `"Charge"` | `:175` | légitime |
| `"PAR GRAVITÉ"`, `"PAR PROVENANCE"` | `:177`, `:188` | légitimes |
| `"Critique" "Élevée" "Moyenne" "Faible"` | `:182-185` | légitimes (traductions de `PriorityBucket`) |
| `"Programmée" "Indicateur" "Faux rapport" "Rapport fondé" "Cascade" "Médico-légal"` | `:191-196` | légitimes (traductions de `QueueEntrySource`) |
| `"Ce district n'a pas encore de file d'inspection."` / `"La file n'a pas répondu."` | `:162-164` | légitimes — 404 traité en **état**, pas en panne |
| `5` crans / `3` paliers | `:175`, `:224` | fidèles aux domaines (5 charges, 4 bandes ⇒ 3 paliers allumables) |

★ **Les 10 noms de rangée sont traduits en dur, les 11 valeurs ne le sont pas.** Le même fichier
sait donc parler français pour les **clés** et ne le sait pas pour les **valeurs** — c'est ce qui
rend D4 visible à l'écran (« Faible … **Predominant** »).

### 6. Non vérifié

1. **La route ⑮ n'a jamais rendu 200 pour moi.** 404 au signup, 404 après le dépôt, 404 ~5 min plus
   tard. Dimensionner exigeait un tick 12h — **interdit par le dossier**. ⇒ l'ensemble de clés et
   les valeurs possibles sont **comptés à la source** (projection + unions + migration) et
   **corroborés** par le corps du 04/09 (forme identique), mais **aucune valeur d'aujourd'hui n'a
   été mesurée sur un corps de succès**. La mesure qui trancherait : un tick 12h sur un compte
   jetable, puis re-GET.
2. **Le SHA de l'image back est DÉDUIT** (`3117f159` d'après le dossier) : aucune route ne
   l'imprime, et `docker` m'est interdit. Toutes mes lectures de source viennent de l'arbre
   `mafia-clean-city` d'aujourd'hui — **cohérentes** avec le back joignable (les 4 clés de la
   réponse POST mesurées correspondent exactement à `FileReportResult`), mais l'égalité n'est pas
   prouvée.
3. **Le débit réel des 50 $** n'est pas mesuré : je n'ai pas relevé le solde avant/après. La source
   dit « economy deduction P2-future » et la maquette « rien n'est débité aujourd'hui » — les deux
   concordent, mais c'est **lu**, pas **compté**. Mesure qui trancherait : `GET /v1/me` avant/après
   un dépôt sur compte frais.
4. **La branche uuid de `building_id`** (`:150-161`, contrôle d'appartenance) n'est pas exercée : il
   m'aurait fallu l'uuid d'un bâtiment possédé. J'ai mesuré la branche **entier** — celle que le
   client enverrait (`InspectionClient.cs:63`).
5. **`backlash_triggered: true`** n'a pas été observé : il demande 8 faux rapports pour 1 fondé
   (`floodBacklashThreshold` = **8**, `inspection-tunables.ts:79`) — soit ≥ 8 mutations de plus. Je
   me suis arrêté à 2. La valeur `false` est donc mesurée, `true` est **déduit du code**.
6. **« 4 écrans » pour `Lisible()`** est mesuré **sur l'archive de ce dossier seule** (19 `.cs`).
   L'arbre vivant du client m'est interdit : le compte peut être plus grand ailleurs.
7. **Le canon de série 2** (`police/inspections-canon.png`) n'a pas été ouvert — le dossier le
   décrit comme la direction **rejetée** que le client implémente, et le PNG de référence livré
   est celui de ⑰. La colonne M de mes lignes 4-7 (la gravité) est donc jugée sur la **série 6**
   seule ; leur statut « à ratifier » signale exactement ce trou.
8. **Le tunable est lu à son défaut** : `falseReportBaseCost` = 50 est la valeur de repli
   (`TunablesStore.resolveInt(..., 50)`). Le **corps mesuré** rend bien 50 sur cette pile, donc
   aucun override DB n'est actif ici — mais un autre environnement pourrait servir autre chose.
