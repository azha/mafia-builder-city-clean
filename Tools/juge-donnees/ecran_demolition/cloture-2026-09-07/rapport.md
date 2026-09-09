# Juge données ⊥ — ㉝ « Raser un site » — clôture — 2026-09-07

Contexte vierge. Je n'ai ni dessiné la maquette ni construit l'écran, et je n'ai ouvert aucun rapport
de juge, aucune note d'implémentation, aucun inventaire de dette. Toutes les mesures B viennent d'un
**compte frais** (`jd-1788755035`) créé par `POST /v1/auth/signup` sur la pile locale entre 04:23 et
04:26 UTC, conteneur recréé le 07/09. Commandes et sorties : `mesures/COMMANDES.md`, `mesures/B/`.

## En une phrase

L'écran rend au joueur **17 clés de succès sur les 80 que le back sert** pour cet écran (les 17 :
`friction_bucket`, `penalty_active`, `friction_node_count`, les 4 bandes + `neighbor_count` de la fiche,
`rank`, `candidate_building_type`, les 2 bandes `projected`, `freed_block_id`, `operational_type`,
`lieutenant_ids`, `name_i18n.params.enseigne`, `structural_budget` — hors cardinal dérivé « VOS N SITES »
et hors `error.message`) ; j'ai relevé **11 défauts** — dont un dans
lequel le joueur, en suivant le chemin que l'écran lui propose, **perd sa parcelle ET ses deux offres**
(mesuré, 409 + `options: []`) — et **12 questions « passé à côté ? »** pour l'user ; les trois nombres de
la question 1 se reproduisent sur compte frais sous une forme plus nette (**0 affiché pour 4 sites
possédés**), et le correctif additif `perimeter_site_count` est **servi** mais **ne change aucun nombre**
et **n'est lu par personne**.

---

## Réponses aux questions prioritaires

### Q1 — 13 / 17 / 20 · la clé neuve est-elle servie ? les deux clés portent-elles le même nombre ?

**Servie : OUI, mesuré deux fois.** Sur le conteneur recréé, `GET /v1/friction/state` rend **4 clés** :

    04:24:14  {"friction_bucket":"light","penalty_active":false,"friction_node_count":0,"perimeter_site_count":0}
    04:25:25  {"friction_bucket":"balanced","penalty_active":false,"friction_node_count":3,"perimeter_site_count":3}

(`mesures/B/10-friction-state.json`, `mesures/B/24-state-apres.json`.) L'archive du 04/09 (back
`6ff684db`) n'en portait que **3** — `{"balanced",false,9}` (`corps-reels-04-09/GET_friction_state.json`) :
le delta de clé est donc réel et daté.

**Même nombre : OUI, par construction, et ce n'est pas une coïncidence de mesure.** Une seule
expression alimente les deux :

    friction-projection.service.ts:102-103
      friction_node_count:   row.friction_org_size,
      perimeter_site_count:  row.friction_org_size,

⇒ **CONFIRMÉ** sur les deux points que le dossier demandait.

**DIVERGENT avec f2 sur ce que le correctif ferme, et sur la population du « 17 ».**

1. **Le correctif ajoute un NOM, pas un NOMBRE — et le nom neuf promet ce que la valeur n'a pas.**
   `friction_org_size` n'est pas le périmètre : c'est un **cache** du périmètre, écrit uniquement par
   `reevaluateAndTransitionLocked` (`friction-budget.repository.ts:366-399`, `frictionOrgSize = nodes.length`
   à la ligne 398), lui-même appelé par le tick et par la transaction de démolition. `getState` ne
   recalcule jamais (`friction-projection.service.ts:82` — `getRow`), et un joueur **sans ligne** lit
   `0/0` (`:84`).
   **Mesuré sur compte frais, au même instant, même compte** : `friction/state` dit **0**, et le joueur
   possède **4 bâtiments** (`mesures/B/14-batiments-compte.txt`) dont les **4** sont reconnus comme
   membres du périmètre par `GET /v1/friction/nodes/{id}` (4 × 200, `mesures/B/nodes/`) — et la garde de
   cette route porte **les mêmes trois prédicats** que le scan de périmètre, vérifiés ligne à ligne
   (`friction-budget.repository.ts:236-239` : `building_id`, `player_id`, `ownership='player'`,
   `structural_state != 'demolished'`) et non sur la foi de son en-tête.
   ⇒ La route dit « 0 site dans votre périmètre » pendant que la route sœur accepte 4 membres de ce
   même périmètre. La divergence que f2 chiffre à 13↔20 se reproduit ici à **0↔4**, et
   `perimeter_site_count` la porte **à l'identique**. Le vieux nom était vague ; le neuf **affirme**
   une sémantique que la valeur n'a qu'après un tick ou une démolition.
2. **« 17 = bâtiments OPÉRATIONNELS » est réfuté à la source.** Ni `/interior` ni `/me/buildings` ne
   filtrent sur l'état opérationnel. Le commentaire du dépôt le dit verbatim :
   *« the player's non-demolished buildings in this district (D1's filter — `structural_state !=
   'demolished'`, **NOT** `= 'operational'` : a raided/damaged/seized building stays visible) »*
   (`district-interior.repository.ts`, en-tête de `listPlayerBuildings`), et la sœur TD-534 reprend le
   même filtre (`listPlayerBuildingsAllDistricts` : `eq(player_id) AND ne(structural_state,'demolished')`).
   Le périmètre, lui, ajoute un prédicat que ces deux-là n'ont pas : `ownership = 'player'`
   (`friction-budget.repository.ts:189`), sur un enum à **quatre** valeurs
   (`'player','leased','rival','civilian'` — `db/schema/city_state.ts`, `buildingOwnership`).
   ⇒ **Il y a DEUX causes de divergence, pas une** : (a) la péremption du cache — **mesurée ici** ;
   (b) le prédicat `ownership`, **lu en source, non quantifié** (mon compte n'a que des bâtiments
   `player`, les deux comptes ont coïncidé à 3=3 après rafraîchissement). Un correctif qui ne traiterait
   que (a) laisserait (b) ouvert.
3. **« cache en retard de 155 minutes » : non mesurable ici** — `demo_capture` m'est interdit. Le
   **mécanisme** de retard est confirmé ; la valeur ne l'est pas.

**Et le front ne lit ni l'une ni l'autre correctement** : `perimeter_site_count` = **0 lecture**
(`mesures/F/usages-champs.txt` ; contrôle positif : le même motif rend 1 sur `friction_node_count`,
`DemolitionScreenController.cs:427`). Le gros chiffre de l'écran reste `friction_node_count`.

### Q2 — « Ça tient » : quel champ, quel résolveur ? « Ça grince partout » existe-t-il ?

**Champ** : `friction_bucket` (`DemolitionScreenController.cs:428` → `:456`).
**Résolveur** : `DemolitionResolvers.PhraseDeFriction` (`:1488-1498`), via `LireFriction` (`:1475-1486`,
repli **jetant**, pas de valeur par défaut) :

    "light" → « Ça tourne rond »      "balanced" → « Ça tient »
    "strained" → « Ça force »          "overloaded" → « Ça grince partout »   (:1495)

⇒ **« Ça grince partout » EXISTE bien dans le résolveur** — c'est la branche `overloaded`, et c'est celle
que la maquette dessine (cadre 5069 : `<b>Ça grince partout</b>` + gros chiffre en `#d97a6a`). La
planche montre « Ça tient » parce que le compte photographié était `balanced`, pas parce qu'une branche
manque. Le mapping bande→phrase et bande→couleur est **complet et conforme** à la maquette : 4 valeurs
servies (`FrictionBudgetBucket`), 4 branches, aucune valeur orpheline.

**Sur le libellé faux (TD-662) — CONFIRMÉ, et le défaut n'est pas dans le résolveur mais deux lignes
plus bas.** Le nombre est posé sous une glose qui n'a **aucune source** :

    :460   $"{noeuds} endroits se gênent entre eux. Chacun coûte un peu de ce que les autres rapportent."

`noeuds` vaut `friction_node_count` = la taille du périmètre, pas un compte de frictions — le back le
dit désormais lui-même en toutes lettres (`friction-projection.service.ts:38-44` : *« Ce compte n'a
jamais été le nombre d'endroits qui se gênent »*). ⇒ **Le nombre est juste, la phrase est fausse**, et
le correctif back ne l'atteint pas : renommer une clé que le client ne lit pas ne change pas la phrase
que le client écrit.

### Q3 — La liste « VOS N SITES » : d'où vient chaque rangée ? le qualifiant de lieu est-il servi ?

**Source actuelle (mesurée)** : un balayage client de `GET /v1/world/districts` (18) puis
`GET /v1/city/district/{id}/interior` sur **chacun** (`DemolitionScreenController.cs:301-315`), puis
**une fiche par bâtiment** `GET /v1/friction/nodes/{uuid}` (`:325-330`). Sur mon compte : 1 + 18 + 4 =
**23 requêtes au montage** pour 4 rangées. Par rangée :
`NomDuSite` ← `name_i18n.params.enseigne` (`:1001-1003`) · le type ← `operational_type` (`:564`) · le
verdict ← `output_to_friction_ratio_bucket` de la fiche (`:566`) · « libre / quelqu'un y travaille » ←
`lieutenant_ids` (`:537,574`).

**Le qualifiant de lieu EST servi — trois fois, et par trois chemins :**

    interior.buildings[].name_i18n.params.district  = "La Lisière"   (mesuré, B/28-interior16-apres.json)
    interior.buildings[].name_i18n.params.block     = "1501"
    interior.name                                    = "La Lisière"
    /v1/me/buildings[].district_name                 = "La Lisière"   (mesuré, B/30-me-buildings.json)

Il n'est **projeté dans aucun texte de l'écran** : `NomDuSite` ne lit que `params.enseigne`, la parcelle
écrit `« Parcelle libre — bloc 1502 »` (`:780`), et `nomDistrictVise` est **calculé puis jamais affiché**
(déclaré `:103`, écrit `:299,313-314`, **zéro** lecture d'affichage). La maquette, elle, le dessine
**quatre fois** (« — Les Friches, îlot 1604 » dans les trois cadres de fiche, et « Parcelle libre — Les
Friches, îlot 1604 » dans les deux cadres de parcelle).
⇒ Ce n'est **pas** une forme F (la donnée est bien projetée) : c'est un **défaut de front** (D4).

**Et la découverte qui change la nature de cette liste : `GET /v1/me/buildings` EXISTE et est servie.**
Mesuré : `HTTP=200`, 3 bâtiments, **une seule requête**, clés
`['block_id','building','district_id','district_name','lieutenant_ids','name_i18n','operational_type']`
(`mesures/B/30-me-buildings.json`). Contrôleur : `citysim/district_interior/player-buildings.controller.ts:89`,
sous `@UseGuards(JwtAuthGuard)`, en-tête *« IMPLEMENTS: TD-534 … the missing player-facing “list my
buildings across every district” route »*. L'écran ne l'appelle pas, et il **affiche au joueur** l'énoncé
daté devenu faux : *« Aucune route ne liste vos bâtiments — on a ouvert N districts sans en trouver »*
(`:526-528`). ⇒ D3.

### Q4 — Le CTA « VOIR CE QUI COÛTE LE PLUS » ↔ route ? l'action de démolition ↔ CTA ?

- **« VOIR CE QUI COÛTE LE PLUS » : aucune route.** C'est une navigation interne (`:499` →
  `OuvrirFiche(batimentVise)`), et le classement qu'il promet est calculé **côté client**
  (`PireSite()`, `:337-350`) à partir des N fiches déjà chargées. Le back ne sert **aucun** classement
  de sites : il n'y a pas de route « mes sites par rapport ». Le libellé est donc honoré, au prix de
  N requêtes.
- **Démolition ↔ CTA : apparié et correct.** `CONFIRMER — LE RASER` (`:626`) → `POST
  /v1/friction/nodes/{id}/decommission {confirm:true}`. Les deux préconditions que la maquette dessine
  sont mesurées et respectées : `{}` → **422 `DEMOLITION_CONFIRM_REQUIRED`**
  (`mesures/B/20-decomm-sans-confirm.json`) et un bâtiment portant un lieutenant → **409
  `LIEUTENANT_ASSIGNED`** (`B/21-decomm-lieutenant.json`), que l'écran annonce **avant** le geste
  (`:537,570-576,617-620`). Succès mesuré : `{"decommissioned":true,"freed_block_id":1502,"neighbor_count":0}`.
- **Mais l'action SUIVANTE est cassée, et c'est le défaut le plus lourd du lot (D9).** Voir ci-dessous.

---

## Défauts

| # | information | B | M | F | statut | preuve |
|---|---|---|---|---|---|---|
| **D1** | le SENS du gros chiffre (« endroits qui se gênent ») | ● (mais c'est la taille du périmètre) | ● | ● | **affiché sans source** — la phrase décrit une grandeur que rien ne sert | `friction-projection.service.ts:38-44` (« n'a jamais été le nombre d'endroits qui se gênent ») · `friction-budget.repository.ts:398` (`nodes.length`) · `DemolitionScreenController.cs:460` |
| **D2** | la FRAÎCHEUR du compte affiché | ● (cache) | – | ● (muet) | **affiché sans source** — un cache présenté comme un état | mesuré : `friction/state` = `0` à 04:24:14 pendant que le joueur possède **4** sites (`B/10-friction-state.json` + `B/14-batiments-compte.txt`) et que les 4 sont acceptés par `friction/nodes` (4×200) — dont la garde applique **les mêmes trois prédicats** que le scan de périmètre (`friction-budget.repository.ts:236-239` vs `:189`), vérifié ligne à ligne, pas sur la foi de l'en-tête. `last_evaluated_tick` existe en base et n'est projeté nulle part |
| **D3** | la liste des sites du joueur | ● `GET /v1/me/buildings` (1 requête, mesurée 200) | – | ● (23 requêtes, balayage) | **DÉFAUT** — route de lecture du domaine servie et jamais appelée ; l'écran affiche au joueur un énoncé daté faux | `player-buildings.controller.ts:89` · `B/30-me-buildings.json` · `DemolitionScreenController.cs:295-332, 526-528` |
| **D4** | le qualifiant de lieu (« Les Friches, îlot 1604 ») | ● ×3 chemins | ● ×4 | – | **dessiné + disponible + non affiché** | `B/28-interior16-apres.json` (`params.district`) · `B/30-me-buildings.json` (`district_name`) · front `:1001-1003`, `:780` · `nomDistrictVise` 0 lecture d'affichage |
| **D5** | « 3 voisins ont respiré » (voisins touchés par la démolition) | ● `decommission.neighbor_count` | ● (2 cadres) | – | **dessiné + disponible + non affiché** — champ déclaré au DTO, **0 lecture** | `B/22-decomm-ok.json` · `DemolitionDtos.cs:95` · `mesures/F/usages-champs.txt` |
| **D6** | le bâtiment neuf créé par le `pick` | ● `building_id` | – | – (non déclaré au DTO) | **DÉFAUT de contrat** — le DTO affirme « corps de succès non observé (TD-533) », or la source le déclare et un E2E vert le lit | `replacement-option.controller.ts:77,94` · `tests/e2e/core_loops/demolition_replacement_options.spec.ts:311-314` · `DemolitionDtos.cs:145-156` |
| **D7** | le texte des refus | ● `user_facing_i18n_key` + `payload_vars` | – | ● (message **anglais brut**) | **disponible et ignoré** — le joueur lit « decommission requires an explicit {confirm: true} — resend with the flag to proceed. » | corps mesurés `B/20`, `B/21`, `B/25` · `DemolitionClient.cs:216-217` (lit `code` et `message`, rien d'autre) · `Refus.EstMetier` (`DemolitionClient.cs:40`) **0 lecture** |
| **D8** | l'état d'une offre (« DÉJÀ PRISE », « quelqu'un l'a prise avant ») | – (B⁻ `picked_at`/`closed_at`) | ● | ● | **affiché sans source** — l'état est déduit d'un échec de requête, quelle qu'en soit la cause | `DemolitionScreenController.cs:988` (`if (!ok) EtatCourant = Fermee`), `:918`, `:752` · `db/schema/demolition_compression.ts` (`picked_at`, `closed_at` non projetés) |
| **D9** | le CTA « PRENDRE LA PREMIÈRE » après une démolition | ● | ● | ● **actif alors qu'il est certain d'échouer** | **DÉFAUT — perte de données joueur** | **mesuré, compte frais, une session** : décommission 200 (`B/22`) → `pick` **409 `STRUCTURAL_CAP_EXHAUSTED`** (`B/25`) → `replacement-options` = **`{"options":[]}`** (`B/26`) et **aucun bâtiment neuf** (`B/28`, 3 bâtiments). Cause : `resolveAndClosePick` ferme l'offre **et sa sœur** AVANT le gouverneur (`replacement-option.controller.ts:80-92`), et le gouverneur refuse dès qu'une session est ouverte (`structural-decision-governor.service.ts:85-86,97-100`). Le front **détient** la précondition (`JetonDeStructure.Publier(1,true)`, `:967`) mais `JetonDisponible` n'est lu qu'en `:613,615,616,622` — **jamais** dans `RendreParcelle` (`:749-835`) |
| **D10** | qui parle / qui travaille ici | ● `interior.lieutenants[].name` (mesuré « Lt. Ferrand ») + `lieutenant_ids` | ● (« Lt. Rin ») | ● **littéral « Dima »**, « quelqu'un y travaille » | **affiché sans source alors que la source existe** | `B/32-interior-sous-structures.txt` · front `:483,574,608,612,624,811,822` |
| **D11** | « VOS N SITES » et le gros chiffre comptent **deux populations différentes** | ● (deux) | – | ● (côte à côte, sans un mot) | **DÉFAUT** — deux nombres de sens différent à trois centimètres l'un de l'autre | liste : `structural_state != 'demolished'`, **sans** filtre d'ownership (`district-interior.repository.ts`, en-tête de `listPlayerBuildings` ; `listPlayerBuildingsAllDistricts`) · périmètre : `+ ownership = 'player'` (`friction-budget.repository.ts:189`) sur un enum à 4 valeurs (`city_state.ts`, `buildingOwnership`) |

**Observation sur la garde qui accompagne le correctif** (fait, pas finding) : la falsifiable ajoutée le
07/09 épingle l'ensemble de clés **et** l'égalité des deux noms
(`tests/e2e/parcours/04_dashboard.parcours.spec.ts:108-114`). Elle ne peut donc pas rougir sur D2 : rien
n'oppose ce nombre au périmètre **vivant** (que `GET /v1/me/buildings` sert désormais en une requête).

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| 1 | `replacement_option.expires_at_tick` (**B⁻**, jamais projeté) | jusqu'à quand l'offre tient (horizon 7 jours de jeu) | **utile ici, et c'est le trou le plus visible** : la maquette écrit l'urgence **trois fois** (« elles ne restent pas ouvertes longtemps », « tant qu'elle est encore là », « prise, expirée, ou retirée ») et rien ne la sert. Sans elle, l'écran presse le joueur sans pouvoir lui dire combien il lui reste | ★★★ |
| 2 | `friction_budget_state.last_evaluated_tick` (**B⁻**) | à quand remonte le compte affiché en gros | **utile ici** : c'est la seule clé qui permettrait à l'écran de dire « arrêté au jour X » au lieu d'afficher 0 pour 4 sites. Elle transforme D2 d'un mensonge en une propriété assumée | ★★★ |
| 3 | `interior.buildings[].revenue_band` · `activity_band` · `harvest_band` · `condition_band` · `shell_state` (5 clés, **0 lecture**) | ce que chaque site rapporte / fait / son état | **utile ici** : la liste ne porte aujourd'hui que le type et le verdict de rapport. « il ne rapporte rien en ce moment » est précisément l'argument de l'écran — et `harvest_band`/`relance_band` sont **neuves** depuis l'archive du 04/09 | ★★★ |
| 4 | `friction_budget_state.penalty_since_tick` (**B⁻**) | depuis quand « tout produit moins » | **utile ici** : l'encart de pénalité est un état sans durée ; « depuis trois jours » est ce qui pousse à agir | ★★ |
| 5 | `interior.buildings[].lapse_phase_bucket` · `maintenance_in_progress` (**0 lecture**) | l'entretien est en retard / en cours ici | **plutôt ailleurs** (écran entretien), mais ce sont deux raisons de plus de raser un site — à trancher | ★★ |
| 6 | `/v1/me/buildings.district_id` + `district_name` | regrouper la liste par quartier | utile dès qu'un joueur possède dans deux endroits ; l'écran a déjà renoncé à nommer le district pour cette raison (`:514-516`) | ★★ |
| 7 | `replacement_option.source_building_id` (**B⁻**) | ce qu'il y avait là avant | la maquette dit « ce qu'il y avait là n'y est plus » sans le nommer ; le nommer donnerait du poids au geste | ★ |
| 8 | `interior.buildings[].conversion_band` · `revenue_chain` (**0 lecture**) | site converti / raccordé | plomberie ici, sauf à expliquer un « ce qu'il rapporte : presque rien » | ★ |
| 9 | `friction_budget_state.last_decommission_at_tick` (**B⁻**) | la dernière fois qu'on a rasé | « vous avez rasé avant-hier » — de l'histoire, pas de la décision | ★ |
| 10 | `world/districts.control_state` · `block_count` · `profile` · `bank_side` · `precinct_id` · `index` · `name_canonical` (7 clés, **0 lecture**) | le quartier | pas ici : c'est la carte | ○ |
| 11 | `interior.grid` · `blocks[]` · `day_phase` · `district` · `bank_side` · `profile` · `name_canonical` · `district_id` (8 clés, **0 lecture**) | le diorama du quartier | pas ici : c'est la plomberie de l'écran district | ○ |
| 12 | `friction_budget_state.friction_budget_total` (**B⁻**) | le total brut de friction | **non — et c'est délibéré** : R2.2 interdit le scalaire, la bande est la projection correcte. Signalé pour que personne ne le redemande | ○ |

---

## Lots back suggérés (B⁻ dessiné — forme F)

| # | colonne | table | maquette | preuve |
|---|---|---|---|---|
| 1 | `expires_at_tick` | `replacement_option` | MN20 (m-84 « tant qu'elle est encore là », « prise, expirée, ou retirée ») + MN17 (m-82 « elles ne restent pas ouvertes longtemps ») | colonne : `db/schema/demolition_compression.ts` (`expires_at_tick … 7 game-days horizon`) · projection : `replacement-option.service.ts`, `ReplacementOptionDto` = **5 clés**, mesurées identiques dans `B/23-options-apres.json` |
| 2 | `picked_at` / `closed_at` | `replacement_option` | MN19 (m-84 tag « DÉJÀ PRISE », titre « quelqu'un l'a prise avant ») | mêmes ancres ; l'écran fabrique aujourd'hui cet état depuis un échec HTTP (D8) |
| 3 | `last_evaluated_tick` | `friction_budget_state` | M03/M05 (le gros chiffre, dessiné comme un état du monde) | colonne : `db/schema/demolition_compression.ts` · `FrictionStateView` = 4 clés (`friction-projection.service.ts:34-58`), la fraîcheur n'y est pas |

⚠️ **Ce qui n'est PAS un lot back** : la clé `perimeter_site_count`. Elle est déjà projetée ; le défaut
restant est (a) que le front ne la lit pas et (b) que sa valeur est un cache. Un troisième nom ne
fermerait rien.

---

## Actions : routes ↔ CTA

| CTA / geste | route | verdict |
|---|---|---|
| « VOIR CE QUI COÛTE LE PLUS » (m-79) | **aucune** — navigation interne (`:499`), classement client (`PireSite`, `:337-350`) sur N × `GET friction/nodes` | honoré, mais au prix de N requêtes ; aucune route de classement n'existe côté back |
| clic sur une rangée de la liste | **aucune** — `OuvrirFiche` + `GET friction/nodes/{id}` | ✔ (la liste n'est pas dans la maquette — écart assumé, re-vérifié : sa SOURCE est bonne, sa population non — D11) |
| « LE RASER » (m-80) | **aucune** — transition vers m-81 | ✔ conforme au 422 mesuré : le back exige le second écran |
| « CONFIRMER — LE RASER » (m-81) | `POST /v1/friction/nodes/{id}/decommission {confirm:true}` | ✔ apparié, préconditions annoncées avant le geste (409 lieutenant, jeton) |
| « CONFIRMER — LE RASER » éteint (m-83) | — | ✔ gardé par `structural_budget` (`session/open`), mesuré `{used:0,cap_reached:false}` |
| « PRENDRE LA PREMIÈRE » (m-82) | `POST /v1/friction/replacement-options/{id}/pick` | ✘ **D9** — actif dans la seule séquence où il est certain d'échouer, et l'échec **brûle les deux offres** |
| « PRENDRE L'AUTRE » (m-84) | idem | ✘ même défaut ; de plus, après le refus mesuré il n'y a **plus aucune offre** à prendre |
| clic sur une offre | idem (`:923`) | ✘ même défaut, et non gardé |
| — | `GET /v1/me/buildings` | **route sans CTA** — servie, jamais appelée (D3) |
| — | `GET /v1/friction/replacement-options?freed_block_id=` | **filtre sans consommateur** — le paramètre existe (`replacement-option.controller.ts:57`), l'écran ne le passe jamais (`DemolitionClient.cs:106`) ; sans effet visible aujourd'hui (une seule parcelle à la fois), faux dès deux démolitions |
| « réaffecter le lieutenant » | **aucun CTA** | le refus 409 le demande, l'écran le dit en prose (`:618-620`) et n'offre aucun geste — l'écran est une impasse pour le site le plus visible de la liste (celui qui porte les lieutenants) |

---

## Table de couverture complète

**Convention déclarée** : une ligne par **clé B** (80) ; une ligne par **élément M non apparié** (22) ;
une ligne par **rendu F sans source** (3). Un élément M qui couvre deux clés B apparaît sur les deux
lignes sans en créer une. La **copie fixe** de la maquette (titres, sous-titres, répliques, libellés de
geste) est comptée comme M non apparié — elle est ratifiée par la maquette et rendue à l'identique :
`– ● ●` **conforme**, jamais classée défaut.

**Contrôle d'arithmétique : |B| = 80 · |M non apparié| = 22 · |F sans source| = 3 · somme = 105 lignes.**

### R1 · `GET /v1/friction/state` — 4 clés

| clé | B | M | F | statut |
|---|---|---|---|---|
| `friction_bucket` | ● | ● (M04) | ● `:428,456,442` | ✔ (résolveur complet 4/4) |
| `penalty_active` | ● | ● (M06) | ● `:463` | ✔ |
| `friction_node_count` | ● | ● (M03/M05) | ● `:427,441,460` | **D1 + D2 + D11** |
| `perimeter_site_count` | ● | – | – (0 lecture) | **« passé à côté ? » nul** — même valeur que la précédente ; à lire à sa place seulement après le lot 3 |

### R2 · `GET /v1/friction/nodes/{buildingId}` — 5 clés

| clé | B | M | F | statut |
|---|---|---|---|---|
| `output_value_bucket` | ● | ● (M13) | ● `:687-688,898` | ✔ (5/5 résolues) |
| `friction_load_bucket` | ● | ● (M14) | ● `:690-691,899` | ✔ (4/4) |
| `output_to_friction_ratio_bucket` | ● | ● (M15 + verdict M18) | ● `:344,566,693,694,702` | ✔ (4/4) |
| `decommission_cost_bucket` | ● | ● (M16) | ● `:696-697` | ✔ (4/4) |
| `neighbor_count` | ● | ● (M17) | ● `:699` | ✔ (le seul nombre brut, R2.2-safe) |

### R3 · `GET /v1/friction/replacement-options` — 6 clés

| clé | B | M | F | statut |
|---|---|---|---|---|
| `options[].id` | ● | – | ● (logique, `:981`) | ✔ |
| `options[].freed_block_id` | ● | ● (M29, avec le lieu) | ● `:277,780` (bloc seul) | **D4** (moitié lieu manquante) |
| `options[].candidate_building_type` | ● | ● (M33/M37) | ● `:828,891` | ✔ — 12 membres résolus, repli non jetant (`:1665-1683`) ; les 2 valeurs réellement servies (`cash_safehouse`, `front_shop`, mesurées) sont couvertes |
| `options[].rank` | ● | ● (M32/M36 + tags) | ● `:806,840,847,848,875` | ✔ |
| `options[].projected.output_value_bucket` | ● | ● (moitié de M34) | ● `:898` | ✔ |
| `options[].projected.friction_load_bucket` | ● | ● (moitié de M34) | ● `:899` | ✔ |

### R4 · `POST …/decommission` (réponse) — 3 clés

| clé | B | M | F | statut |
|---|---|---|---|---|
| `decommissioned` | ● | – | ● (logique `:962`) | ✔ |
| `freed_block_id` | ● | ● (M29) | ● `:964` | ✔ (au bloc près — D4) |
| `neighbor_count` | ● | ● (M30) | – **0 lecture** | **D5** |

### R5 · `POST …/pick` (réponse) — 2 clés

| clé | B | M | F | statut |
|---|---|---|---|---|
| `picked` | ● | – | – (le client fabrique un objet, `:135`) | à ratifier |
| `building_id` | ● | – | – **non déclaré** | **D6** |

### R6 · `GET /v1/world/districts` — 9 clés

`id` ● / F logique (`:310`) ✔ · `name` ● / F écrit dans `nomDistrictVise`, **jamais affiché** (`:314`) → **D4** ·
`index`, `name_canonical`, `profile`, `bank_side`, `control_state`, `block_count`, `precinct_id` : **7 clés
`● – –`** → question 10. *(`index` n'est même pas déclaré au DTO front.)*

### R7 · `GET /v1/city/district/{id}/interior` — 10 clés de tête + 18 clés de bâtiment

**Tête (10)** : `buildings[]` ● ● ● ✔ (conteneur, développé ci-dessous) — `district_id`, `name`,
`name_canonical`, `profile`, `bank_side`, `day_phase`, `district`, `grid`, `blocks[]` : **9 clés `● – –`**
(question 11) sauf `name` → **disponible, jeté** (D4) ; `lieutenants[]` → **D10** (`{lieutenant_id, name}`,
mesuré « Lt. Ferrand »).

**Bâtiment (18)** :

| clé | B | M | F | statut |
|---|---|---|---|---|
| `building` | ● | – | ● (logique, 6 sites) | ✔ |
| `block_id` | ● | ● (M12, « îlot 1604 ») | ● `:538,1003` (repli seulement) | **D4** |
| `operational_type` | ● | ● (M33 par analogie) | ● `:564` | ✔ |
| `lieutenant_ids` | ● | – | ● `:537,603,604` | ✔ — précondition annoncée avant le geste ; le **nom** manque (D10) |
| `name_i18n.params.enseigne` | ● | ● (M11) | ● `:1001-1002` | ✔ |
| `name_i18n.params.district` | ● | ● (M12) | – | **D4** |
| `name_i18n.params.block` | ● | ● (M12) | – (le bloc vient d'ailleurs) | **D4** |
| `name_i18n.key` | ● | – | – | plomberie ✔ |
| `shell_state`, `condition_band`, `revenue_band`, `activity_band` | ● | – | – **0 lecture** | question 3 |
| `harvest_band`, `relance_band` *(neuves depuis le 04/09)* | ● | – | – **non déclarées** | question 3 |
| `conversion_band`, `revenue_chain` | ● | – | – **non déclarées** | question 8 |
| `lapse_phase_bucket`, `maintenance_in_progress` | ● | – | – **non déclarées** | question 5 |

### R8 · `GET /v1/me/buildings` — 10 clés — **route entière non consommée**

`building`, `block_id`, `district_id`, `district_name`, `operational_type`, `lieutenant_ids`,
`name_i18n.key/params.enseigne/params.district/params.block` : **10 clés `● – –`**, dont
`district_name` **dessiné** dans la maquette (M12/M29) ⇒ **D3 + D4**.

### R9 · `POST /v1/session/open` — 4 clés du domaine

`structural_budget.used` / `.cap_reached` ● ● ● ✔ (M-83, via `JetonDeStructure`) · `friction_glance.friction_bucket`
/ `.penalty_active` **`● – –`** — doublon de R1, consommé par le shell, pas par cet écran. *(Note : après une
démolition, l'écran **publie** `(1, true)` de son propre chef `:967` au lieu de relire la source ; correct
aujourd'hui — cap = 1 — et faux le jour où le cap change.)*

### R10 · enveloppe d'erreur (toutes routes) — 9 clés

`code` ● / F logique (`DemolitionClient.cs:216`) — mais `Refus.EstMetier` **0 lecture** ⇒ un échec réseau
et un refus de jeu s'affichent à l'identique · `message` ● ● (les 3 cadres de refus de la maquette) ● **en
anglais** ⇒ **D7** · `user_facing_i18n_key`, `payload_vars` ● – – ⇒ **D7** · `http_status`, `details`,
`trace`, `retryable_class`, `retry_after_s` : **5 clés `● – –`** (plomberie ✔).

### M non appariés (22)

MN01 titre+sous m-79 · MN02 réplique m-79 · MN03 geste m-79 · MN04 titre+sous m-80 · MN05 étiquette
« fiche du site » · MN06 réplique m-80 · MN07 geste m-80 · MN08 titre+sous m-81 · MN09 réplique m-81 ·
MN10 geste m-81 · MN11 réplique m-83 · MN12 `dm-rien` m-83 · MN13 titre+sous m-82 · MN14 « ce qu'il y
avait là n'y est plus » · MN15 titron m-82 · **MN16 la LOCALISATION de l'offre** (« proche des routes
déjà tenues » / « loin de tout ») — *dessinée sans source, écart déjà consigné par le front `:894-897`* ·
MN17 réplique m-82 (« elles ne resteront pas sur la table ») · MN18 geste m-82 · **MN19 la CAUSE de
fermeture** (« quelqu'un l'a prise avant » + tag « DÉJÀ PRISE ») — *dessinée sans source ⇒ lot back 2* ·
**MN20 l'URGENCE / l'expiration** — *dessinée sans source ⇒ lot back 1* · MN21 réplique m-84 · MN22 geste m-84.

*(Chrome du shell — « Argent $ 24 850 », « Jour 12 », « Matin » — présent dans les 6 cadres : hors
périmètre de cet écran, déclaré et exclu du compte.)*

### F sans source (3)

| # | rendu | ancre | statut |
|---|---|---|---|
| FS01 | « on a ouvert **N** districts sans en trouver. C'est un trou de surface, pas une ville vide. » | `:526-528` | **DÉFAUT** — compteur d'implémentation montré au joueur, et son énoncé est faux depuis `GET /v1/me/buildings` (D3) |
| FS02 | précision du geste : « le plus mauvais rapport » / « site par site » | `:496` | dérivé d'un compteur client (`fichesParSite.Count`) — honnête, à ratifier |
| FS03 | « projection non servie » | `:897` | texte technique montré au joueur si `projected` est absent — jamais observé (le back sert toujours les 2 bandes, mesuré) |

---

## Ce que je n'ai pas pu vérifier

1. **Les nombres 13 / 17 / 20 de `demo_capture`** — compte interdit par le dossier. J'ai vérifié le
   **mécanisme** (cache + prédicat `ownership`) et je l'ai reproduit sur compte frais à **0 / 4**. Ce qui
   trancherait : `GET /v1/friction/state` et `GET /v1/me/buildings` sur ce compte, au même instant.
2. **Le « retard de 155 minutes »** — non mesurable sans `demo_capture` ni lecture de
   `last_evaluated_tick` (non projeté). Ce qui trancherait : un lot back projetant cette colonne (lot 3).
3. **La magnitude du prédicat `ownership`** — mon compte n'a que des bâtiments `ownership='player'`.
   L'asymétrie est **lue en source** (`friction-budget.repository.ts:189` vs `district-interior.repository.ts`),
   sa contribution aux écarts observés n'est **pas mesurée**. Ce qui trancherait : `SELECT ownership,
   count(*) FROM buildings WHERE player_id = <demo> GROUP BY 1` — hors de mes outils.
4. **Le SHA du back dans l'image** — aucune route ne l'imprime ; `main` = `3117f159` d'après le dossier,
   **DÉDUIT** pour l'image. Ce que j'ai mesuré à la place, et qui suffit : la clé `perimeter_site_count`
   est **servie** (elle ne l'était pas dans l'archive du 04/09) ⇒ l'image est postérieure au correctif.
5. **Le corps de succès de `pick`** — je ne l'ai **pas** obtenu sur le chemin joueur : le gouverneur l'a
   refusé (409, mesuré). Je le donne comme **servi** sur la foi de la signature
   (`replacement-option.controller.ts:77,94`) **et** d'un E2E vert qui le lit
   (`demolition_replacement_options.spec.ts:311-314`) — mais ce spec sème son compte en **SQL brut**
   (`:85-90`), passe par un seam **`_test`** (`:177`) et **n'ouvre jamais de session** (0 occurrence de
   `session/open`), donc il ne rencontre jamais le plafond. **Ce qui trancherait D9 dans l'autre sens** :
   un `pick` réussi sur un chemin 100 % joueur — c'est-à-dire dans une session **postérieure** à celle de
   la démolition. Je ne l'ai pas fait : mes deux offres étaient déjà fermées par le refus.
6. **Aucune spec `parcours` ne couvre cet écran** — les 14 fichiers de `tests/e2e/parcours/` n'en portent
   aucune pour la friction/démolition ; `friction/state` n'y est épinglé qu'incidemment
   (`04_dashboard.parcours.spec.ts:103-115`). Constat, pas verdict : ce n'est pas mon mandat de le trancher.
7. **Les valeurs possibles de `projected`** — le DTO back le type `Record<string, unknown>`
   (`replacement-option.service.ts`) : aucune contrainte lisible ne borne ses clés. Les deux bandes
   mesurées correspondent à celles du front, mais **rien ne l'impose** côté serveur.
8. **Les états m-83 (jeton dépensé) et m-84 (offre fermée) tels que dessinés** ne sont pas reproductibles
   proprement sur compte frais : le premier exige une démolition préalable (fait), le second suppose une
   fermeture par un tiers ou par l'expiration — je n'ai observé la fermeture que par le refus du
   gouverneur (D9), qui n'est aucune des trois causes que la maquette annonce.
