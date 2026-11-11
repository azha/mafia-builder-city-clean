# TD-985 — ㉚ « La chaîne d'appro », les nœuds non silencieux — DESIGN v1, 2026-11-11

Arbre `/home/erutheone/project/mafia-unity-C1`, br. `lot/client1-td879-2026-11-11`. Back lu en lecture seule,
`/home/erutheone/project/mafia-clean-city` `main` = **`2ed39589`**. Maquette `~/project/atelier3d-mafia/ecrans-brennar-6.html`
(**159 cadres**, index 0-based, relus par leur TEXTE). Tout fait porte `fichier:ligne` relu ici, lignes collées ; le reste est
**non mesuré**. Rien de commité, ni Unity ni PlayMode.

## ⛔ VERDICT : le design s'ARRÊTE ici — rien n'est sourçable pour cet état
La maquette **dessine** bien la section chaîne avec des maillons (cadres **50, 51, 52**), mais **aucun** de ses textes n'est
servi, et ce qu'elle dessine n'est **pas** alimenté par la route que ㉚ lit. Les trois faits, mesurés, sont indépendants : il
suffirait qu'un seul tienne pour bloquer le rendu, et les trois tiennent. ⇒ **TD-985 devient une demande à l'ATELIER et au
BACK, via f2** (§5). Le détecteur reste en place (§4). Une seule option intermédiaire est sourçable et ne demande rien à
personne : §3bis.

## 1. Ce que le back SERT — recopié (V15)
`GET /v1/supply-chain/graph` (`supply-chain.controller.ts:122-124` @`main 2ed39589`), **buckets seulement** :
```
 79:  nodes: Array<{ building_id: string; bucket: BackpressureBucket; has_arrow: boolean; arrow_to_building_id: string | null; }>
 85:  legs:  Array<{ leg_id; origin_building_id; destination_building_id; debt_bucket: DebtBucket; bypassed: boolean }>
 92:  routes: Array<{ route_id; origin_building_id; destination_building_id; sinuosity_stress_bucket; time_to_collapse_bucket; state: 'draft'|'active'|'saturated'|'severed'; rebuilding: boolean }>
```
- **Domaines fermés** : `BackpressureBucket = 'silent' | 'mild' | 'warm' | 'critical'` (`backpressure-bucket.ts:22`) ·
  `DebtBucket = 'fresh' | 'accruing' | 'stressed' | 'fractured'` (`debt-bucket.ts:23`).
- **`has_arrow` est REDONDANT** : `hasArrow: n.arrowToBuildingId != null` (`supply-chain-graph.service.ts:115-116`) ⇒ il ne
  porte aucune information que `arrow_to_building_id` ne porte pas. Le client ne doit pas le traiter comme un second fait.
- **AUCUN nom de bâtiment n'est servi** : la projection du graphe ne porte aucun champ de libellé (grep `name|building_name`
  sur `supply-chain-graph.service.ts` : **0**). Un maillon ne peut être désigné que par son `building_id`, référence **nue**.
- Le contrôleur l'écrit lui-même : « BUCKETS ONLY … NEVER a raw scalar (R2.2 …) » (`:114-118`) ; compte neuf ⇒
  `{nodes: [], legs: [], routes: []}` (`:119-120`).
- **Écart relevé, hors TD-985** : le client déclare `SupplyChainRouteDto` **vide** (`ChaineDApproDtos.cs:95-99`) alors que le
  back sert **7 clés** de route (`:92`, ci-dessus) ⇒ `JsonUtility` les jette en silence ⇒ **TD-1013**.
- Les DTO de nœuds et de tronçons du client (`ChaineDApproDtos.cs:70-75`, `:85-92`) sont **conformes** clé pour clé.

## 2. Ce que la maquette dessine — cadres 50, 51, 52, relus par leur TEXTE
Un maillon est une rangée de **quatre** champs : **rang** · **NOM** · **rôle** · **mot de bande**. Collé du cadre 52 :
```
1 | Atelier Vesk — Hautes-Marches, îlot 412 | là où ça devait arriver | à sec
2 | Réserve Nock — Le Treillis, îlot 708    | le relais du milieu     | engorgé
3 | Le quai 4                               | là où on décharge       | bloqué depuis trois jours
! | Le fournisseur                          | tout au bout            | ne livre plus
```
et, pour un cran non encore révélé (cadres 50/51) : `4 | Encore un cran plus loin | on ne sait pas encore | ?`.
L'ordre « en remontant » va du point d'ARRIVÉE (rang 1, « là où ça devait arriver ») vers le fournisseur (« tout au bout »).
La section vit dans un écran qui porte aussi un titre d'état (« Ça coince quelque part », « On a trouvé où ça coince »), une
voix de lieutenant, un geste **« REMONTER D'UN CRAN »** et une progression **« 2 sur 4 déjà remontés »**.

### 2a. Les trois raisons de ne rien rendre
1. **Aucun mot de bande n'est servi.** Recherche dans `string_table.ts` @main d'une clé portant un bucket de contre-pression
   ou de dette (`grep -nE "'[a-z_]+\.(backpressure|pression|dette|debt)\."`) : **0 résultat**. « à sec », « engorgé »,
   « bloqué depuis trois jours », « ne livre plus » n'ont **aucune** clé ; les traduire de `critical`/`stressed` serait un mot
   dérivé — interdit.
2. **Aucun nom n'est servi, et l'ATELIER le dit lui-même.** Cadre **147** (« Où en est chaque maillon », état **MANQUE**) :
   « **Nommer les nœuds et les bâtiments** | ce sont des références nues : **zéro libellé servi, mesuré** — septième écran à
   buter sur les noms ». « Atelier Vesk », « Réserve Nock », « Le quai 4 », « Le fournisseur » sont de la **fiction de
   maquette**. Le rôle (« là où ça devait arriver », « le relais du milieu ») est de la fiction au même titre.
3. **Les cadres 50-52 ne sont pas alimentés par la route que ㉚ lit.** Ils dessinent la **TRACE** (un cran à la fois, une
   progression, un geste de remontée) = les trois routes Loop 3 `GET …/nodes/:buildingId/backpressure` + `POST …/trace-step` +
   `POST …/resolve` (`supply-chain.controller.ts:2-3`, `:195`), que le client **n'appelle pas** et qui sont **« écartées par
   le brief »** (`ChaineDApproClient.cs:115`, dont les seules méthodes sont `GetOperationalPrecursors` `:32`,
   `PostOperationalPrecursorsOrder` `:60`, `GetSupplyChainGraph` `:93`, `PostSupplyChainLegsMaintain` `:122`).
   `GET /supply-chain/graph` ne porte ni rang, ni progression, ni cran révélé/non révélé.
Le dépôt porte déjà les deux constats : `Tools/juge-visuel/ecran_appro/dossier.md:95` « la chaîne n'apparaît qu'aux cadres
50-52 (« ça coince ») … **pas de cadre « chaîne vide »** » et `ChaineDApproScreenPlayModeTests.cs:392-394`
« Anti-fabrication : aucun des libellés de crans de la maquette (**m-50/51/52, jamais sourcés**) ne doit apparaître ».

## 3. Ce qui était « à trancher » — et pourquoi chaque point reste SUSPENDU
1. **Quoi rendre par nœud / par tronçon** : **rien de sourçable**. Il faudrait, par maillon, un nom (non servi), un rôle (non
   servi) et un mot de bande (aucune clé) ; par tronçon, un mot de `debt_bucket` (aucune clé). Le seul fait affichable sans
   invention serait le `building_id` **nu**, que le cadre 147 classe explicitement en **MANQUE**.
2. **L'ordre « en remontant »** : `arrow_to_building_id` est le seul lien de chaînage servi (`:79`, sémantique
   `supply-chain-graph.service.ts:115-116`) et il **pourrait** porter un ordre — **non mesuré** : aucun compte observé ne
   porte de nœud (`nodes: []` mesuré le 2026-09-03, `ChaineDApproDtos.cs:64-68` ; `ChaineDApproScreenController.cs:26-27`
   « `nodes` de `GET /v1/supply-chain/graph` est VIDE sur le compte de démo — confirmé »). Trancher un ordre sur une forme
   jamais observée serait deviner. ⇒ **TD-1014** : mesurer la forme réelle de `nodes` sur un compte qui en porte, avant toute
   décision d'ordre (acyclicité, racine, cycles, nœud sans flèche).
3. **Les deux messages existants** : **inchangés** tant que (1) tient — `vide` ⇒ `appro.bloc.rien_a_remonter_pour_l_instant_…`
   (servi, `string_table.ts:704`) ; tout `silent` ⇒ `appro.vide.rien_ne_circule_encore_…` (servi, `:2655` EN / `:5564` FR).
   Les retirer ou les étendre au cas non silencieux les rendrait faux.
4. **Garde d'effet et effet de bord sur 106** : voir §4.
5. **Dettes** : §5.

### 3bis. La SEULE option sourçable, et elle ne demande rien à personne — à trancher par f2
Le silence du cas non silencieux (`message = null`, `ChaineDApproScreenController.cs:625-631`) peut être remplacé par une
phrase **SERVIE** qui dit exactement cela :
`appro.bloc.des_maillons_existent_mais_cet_ecran_ne_sait_pas_encore_les_afficher` — **servie** :
`string_table.ts:701` (EN « There are links, but this screen can't show them yet. ») et **`:3621`** (FR « Des maillons
existent, mais cet écran ne sait pas encore les afficher. »).
⚠️ **C'est précisément la phrase retirée par la passe UX du 26/09**, et le code dit pourquoi
(`ChaineDApproScreenController.cs:622-624`) :
```
622:            // ⛔ ÉTAT VIDE FAUX (passe UX 2026-09-26, table 63) : « Des maillons existent, mais cet écran ne sait pas encore les afficher »
623:            // était un texte de CHANTIER, montré au joueur neuf dont les maillons sont tous `silent`. Ce qui est vrai alors : rien ne
624:            // circule. Des nœuds non silencieux : l'écran n'a pas de rendu dédié — il se TAIT plutôt que de parler de lui.
```
Le motif du retrait était qu'elle s'affichait **au joueur neuf dont tout est `silent`** — un cas où elle est **fausse**. Dans
le cas non silencieux elle est **vraie**, mot pour mot. ⇒ **Q1 pour f2** : la remettre **dans ce seul cas** (jamais dans le
cas `silent`, qui garde sa phrase), ou laisser le silence ? **Reco : la remettre.** Un écran qui se tait là où il y a quelque
chose à voir est le défaut même de TD-985 ; cette phrase est servie, vraie dans ce cas, et n'invente rien. Elle ne **ferme
pas** TD-985 (aucun maillon n'est rendu) : elle en retire la part « muet ». ⇒ si f2 dit oui, c'est un lot d'une ligne + sa
garde (§4, G0), et TD-985 reste ouverte sur le rendu.

## 4. Gardes — ce qui est dû maintenant, ce qui ne l'est pas
Le **détecteur existe et reste** : `ChaineDApproScreenPlayModeTests.EcranApproTD985_Detecteur_UnNoeudNonSilencieux_LaSectionChaineNeMontreQueSonTitre`
(**`:403`**), qui asserte `Assert.AreEqual(1, chaine.childCount, "TD-985 SE FERME : …")` (**`:416`**) avec son **contrôle
positif** (tout `silent` ⇒ titre **et** message, `:420-425`). ⇒ **il ne se remplace PAS dans ce lot** : il n'y a pas de rendu
à garder, et le remplacer par une garde d'effet vide reviendrait à fabriquer une cible inerte.
- **G0 (seulement si f2 retient §3bis)** : un nœud `critical` ⇒ `chaine.childCount == 2` **et** `RenderedTexts` contient la
  **valeur servie** de `appro.bloc.des_maillons_existent_mais_cet_ecran_ne_sait_pas_encore_les_afficher` (lue par
  `ValeurAttendue.De`, patron `:390`), **et** le cas tout-`silent` contient **toujours** `appro.vide.rien_ne_circule_encore_…`
  et **jamais** la phrase de chantier. *Contrôle positif* : le même écran avec un nœud `silent` ⇒ la phrase de chantier
  **absente** (`CollectionAssert.DoesNotContain`) — c'est exactement le défaut que la passe UX du 26/09 a corrigé, donc la
  garde rougit si on le réintroduit. L'anti-fabrication de `:394` (`DoesNotContain "Le labo de Spine-B"`) est **conservée** et
  **étendue** aux quatre noms de fiction mesurés au §2 (« Atelier Vesk », « Réserve Nock », « Le quai 4 », « Le fournisseur »)
  et aux quatre mots de bande (« à sec », « engorgé », « bloqué depuis trois jours », « ne livre plus ») : une garde
  structurelle contre l'invention, qui vaut quel que soit le rendu futur.
- ⚠️ *PÉRIMÉ le 11/11 : 106 mène à ㉚ depuis `lot/client1-106-appro-2026-11-11` (TD-981 fermée) — énoncé conservé pour l'histoire.*
- **Carte 106 — l'effet de bord est NUL dans ce lot, et c'est à écrire** : `supply_chain_trace` reste dans
  `EcransInconnusAssumes` de `NavigationApresGeste` (design TD-938 §4), puisque ㉚ ne rend toujours aucun maillon. La **G1 de
  TD-938** (bijection : les 4 valeurs du back **classées**, 3 menées + 1 assumée) **reste verte sans retouche** — elle ne
  force le déplacement que si quelqu'un déclare 106 mené. ⇒ ne pas y toucher.
- **Et si un jour ㉚ mène 106** : il devrait recevoir les `building_ids` servis par `commit` (TD-982), or ㉚ **découvre son
  propre bâtiment** (`ChaineDApproScreenController.cs:192 DecouvrirBuildingId`, `:98 BuildingIdDecouvert`, aucun setter) ⇒
  **TD-1015** : donner à ㉚ un point d'entrée qui accepte les ids, sans quoi mener 106 à ㉚ ouvrirait un écran qui ignore la
  raison pour laquelle on l'a ouvert. À faire **avec** le rendu, pas avant.

**V19 — huit questions, sur G0 (la seule garde due, et seulement si f2 retient §3bis).** (1) ÉVÉNEMENT : la phrase de chantier
réapparaissant dans le cas `silent`, ou disparaissant du cas non silencieux ⇒ G0 rougit ; classe DONNÉE (textes rendus).
(2) DÉGÉNÉRÉ : un `childCount == 2` serait vrai pour **n'importe quel** second enfant ⇒ G0 asserte en plus la **valeur servie**
de la clé, dans la grandeur assertée (le corpus `RenderedTexts`). (3) EFFET : le compte d'enfants **et** le texte rendu, pas
un réglage. (4) CONTRÔLE POSITIF : nœud `silent` ⇒ phrase de chantier **absente** (le défaut corrigé le 26/09) ; anti-vacuité :
la section « Chaine » doit exister (`:415`, conservé). (5) VALEUR d'une clé PRÉSENTE : la **valeur servie** lue par
`ValeurAttendue.De`, jamais le littéral de repli ni une absence. (6) DIMENSIONNÉ : 3 états de la section (vide, tout `silent`,
≥ 1 non `silent`) × les 4 buckets du domaine fermé = 6 cas nommés. (7) LIGNES ACTIVES : G0 lit `RenderedTexts`, le corpus que
l'écran alimente par `TrackText` (`:619`), jamais un commentaire ni la maquette. (8) MÊME CLÉ : les deux comptes d'enfants
portent sur le **même** `Transform` nommé `"Chaine"`, trouvé par le même balayage (`:413-414`).

## 5. Demandes à router par f2, et dettes (plage TD-1013/1019)
**Demande ATELIER** (sans quoi le rendu reste infabricable) : un cadre de la section « LA CHAÎNE, EN REMONTANT » alimenté par
`GET /supply-chain/graph` **seul** — c'est-à-dire sans nom, sans rôle, sans rang, sans progression : ce que l'on peut dessiner
avec, par maillon, un `bucket` ∈ {silent, mild, warm, critical} et une flèche vers un autre maillon ; et par tronçon un
`debt_bucket` ∈ {fresh, accruing, stressed, fractured} et un `bypassed`. Les cadres 50-52 répondent à une **autre** question
(la trace, §2a-3).
**Demande BACK** (une seule suffit à débloquer les mots) : les clés des deux domaines fermés — `appro.*` (ou le domaine que
BACK-1 choisira) pour les 4 `BackpressureBucket` et les 4 `DebtBucket`. Aucun mot ne sera dérivé côté client.
**Demande BACK, seconde** : un libellé de bâtiment dans la projection du graphe — c'est le **septième** écran à buter dessus
selon le cadre 147 de l'atelier ; elle dépasse ㉚.

- **TD-1013** (NEW) `SupplyChainRouteDto` est un placeholder **vide** (`ChaineDApproDtos.cs:95-99`) alors que `routes` sert
  **7** clés (`supply-chain.controller.ts:92`, `:141-148`) ⇒ `JsonUtility` les jette en silence. Classe C tant qu'aucun écran
  ne les lit ; à déclarer avant tout usage.
- **TD-1014** (NEW) la forme réelle de `nodes` / `legs` n'a **jamais** été observée peuplée (`nodes: []` mesuré le 2026-09-03,
  `ChaineDApproDtos.cs:64-68`) : acyclicité, racine, nœud sans flèche, cycles — **non mesuré**. Bloque la décision d'ordre
  (§3-2). Se ferme par une mesure sur un compte porteur.
- **TD-1015** (NEW) ㉚ découvre son propre bâtiment (`ChaineDApproScreenController.cs:192`, `:98`) et n'a aucun point d'entrée
  acceptant des ids ⇒ mener 106 à ㉚ (fermeture de TD-981) exige ce point d'entrée, sinon l'écran ignore la raison de son
  ouverture (TD-982). À livrer **avec** le rendu.
- **TD-1016** (NEW) les mots des deux domaines fermés (`BackpressureBucket`, `DebtBucket`) ne sont **servis par aucune clé**
  (mesuré : 0 résultat dans `string_table.ts` @`2ed39589`) ⇒ **liste des mots**, à router à BACK-1 par f2. **C'est la dette
  bloquante de TD-985** : tant qu'elle est ouverte, aucun maillon ne peut porter de mot.
- **TD-985 reste OUVERTE**, inchangée, avec son détecteur `:403`/`:416` en place. Elle se ferme quand l'atelier a sourcé un
  cadre alimentable par `graph` **et** que TD-1016 est servie — pas avant, et pas par ce design.
