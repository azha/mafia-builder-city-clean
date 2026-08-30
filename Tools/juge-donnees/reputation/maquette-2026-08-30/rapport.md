# Juge données ⊥ — ㊲ La réputation (screen_b3) — maquette — 2026-08-30

Dépôt back : `/home/erutheone/project/mafia-clean-city` · stack locale montée, compte frais
`jd-1788118317` (jamais `operational_demo@example.test` ni `citymap_demo`).
Toutes les mesures : `mesures/` (commandes + corps bruts).

## En une phrase

L'écran dessine **11 des 15 informations** que le back sait rendre pour ce domaine ; il en dessine
**9 de plus qui n'ont pas de source** (dont 3 sont en base mais non projetées) ; **10 écarts à
consigner**, dont deux erreurs de lecture de la donnée (les indices de tenue sont ceux du
LIEUTENANT, pas du joueur ; et leur polarité est inversée sur 2 des 4), **4 questions
« passé à côté ? »**, **3 lots back** de forme F.

---

## Écarts à consigner (mode maquette)

| # | information | B | M | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|
| **É1** | **`uniform_tells` attribué au JOUEUR** — la maquette les met sur le portrait « VOUS, TEL QU'ON VOUS LIT » (M07/M08) ; la donnée est **par lieutenant** (les normes que CE lieutenant a absorbées). Le canon met les deux jeux d'indices sur **le même portrait, celui du lieutenant**. | ● | ● | lecture de la donnée à trancher | `db/schema/reputation_state.ts:222-225` (PK `lieutenant_id`) · `reputation-hub.service.ts:465` (`projectUniformTells(lieutenantId, playerId)`) · canon `reputation_mechanics.md:170` (« **Lieutenant portrait** gains small uniform tells ») et `:233` (« Lieutenant portrait : posture cues + uniform tells. **Both** appear on same portrait ») |
| **É2** | **Polarité inversée sur 2 des 4 tells.** La maquette dore `col ouvert` et `gants sales` comme l'état remarquable (`TELLS_ON = {collar:'open', gloves:'dirty'}`). Le back en fait les valeurs **neutres** (flag = false) ; les valeurs actives sont `buttoned` / `clean`. Conséquence mesurée : sur un lieutenant vierge (les 8 flags à false) la maquette **allume 2 bandes sur 4** alors que rien n'a été absorbé. | ● | ● | **erreur de lecture** | `hidden-curriculum.service.ts:76-85` (« Neutral enum values (flag = false or row absent) : 'open', 'down', 'hidden', 'dirty' » / « Active : 'buttoned','rolled','visible','clean' ») · canon `:170` · `generateur-reputation.py:150` · mesures : `me-reputation-frais.json` → `open/down/hidden/dirty` ; `me-reputation-charge.json` (4 flags à true) → `buttoned/rolled/visible/clean` |
| **É3** | **`marginalia` n'est pas des noms.** Mesuré : `["settlement-1","settlement-2","settlement-3"]`. La maquette écrit `Ferrante`, `Wexler`, `la Coil` **et l'affirme en prose** (« Ils donnent leur nom », « la maison sait avec qui vous avez réglé, et le dit »). Le code le dit lui-même : l'entité contrepartie est différée, il n'y a pas de table de noms. Le canon demande des noms ; le code n'y répond pas. | ● | ● | **valeur inventée** → lot back | `restraint-index.service.ts:330-336` (« Since counterparty entity is deferred (no name table), marginalia are represented as positional labels ») · `db/schema/reputation_state.ts:180` (« no FK — counterparty entity is a deferred concept ») · canon `:95` · mesure `me-reputation-charge.json` |
| **É4** | **`marginalia` est per-CONTREPARTIE, pas un palmarès.** Ce sont les ≤3 derniers **règlements avec CETTE contrepartie** (`slots.slice(-3)` d'un ring PK `(player_id, counterparty_id)`), pas 3 contreparties différentes. Et la section `restraint` est **omise** sans `counterparty_id` — or le compteur « RÉGLÉS RÉCEMMENT 03 » est dessiné dans le cadre `canon`, qui n'a **aucun sélecteur de contrepartie**. | ● | ● | dessiné hors de sa portée | `restraint-index.service.ts:335` · `db/schema/reputation_state.ts:175-180` (PK composite) · `reputation-hub.service.ts:454-462` (omission) · `generateur-reputation.py:185` |
| **É5** | **`counterparty_id` non-UUID → 500, pas 404.** Mesuré : `?counterparty_id=inconnu-xyz` → `INTERNAL_ERROR` / HTTP 500. Log back : `invalid input syntax for type uuid: "inconnu-xyz"`. Un UUID inexistant, lui, rend bien `offer_posture:"standard"`, `marginalia:[]`. | ● | – | **défaut back** | `mesures/me-reputation-counterparty.json` + `docker logs` (recopié dans `mesures/00-compte.txt`) · `restraint-index.service.ts:300-310` (aucune validation de forme avant le `eq()`) |
| **É6** | **« ENFREINTES 01 » et la barre verte/ambre par règle n'ont aucune clé.** La donnée existe pourtant en base : `boss_mirror_violation_ring.violation_slots[] = { rule_id, severity }` — le `rule_id` de la règle enfreinte est **écrit** et **jamais projeté**. C'est exactement le maillon L3 que la maquette se déclare à elle-même. | **B⁻** | ● | **forme F → lot back** | `db/schema/reputation_state.ts:91` · `boss-mirror.service.ts` `recordViolation` (slot `{ rule_id, severity }`) · aucune clé dans `ReputationSurfaceProjection` (`reputation-hub.service.ts:247-252`) · `generateur-reputation.py:184, 214, 257` |
| **É7** | **« Salvatore, votre lieutenant ».** `lieutenant.name` (varchar 64, NOT NULL) existe en base ; **aucune** des deux projections joueur mesurées ne le porte (`GET /v1/lieutenants` → 5 clés ; `GET /v1/lieutenants/:id` → 17 clés, pas de nom). | **B⁻** | ● | **forme F → lot back** | `db/schema/lieutenant.ts:91` · mesures `lieutenants.json`, `lieutenant-by-id.json` · `generateur-reputation.py:189` |
| **É8** | **Le plafond de 4 règles n'est nulle part.** Mesuré : la 5ᵉ déclaration rend `409 RESOURCE_STATE_CONFLICT` — « House-rule declaration cap reached (4/4) ». La maquette ne dessine ni « 3/4 », ni un CTA éteint, ni un cadre « plein ». Le joueur découvre le mur en le heurtant. | ● | – | **« passé à côté ? »** (voir Q4) | `reputation.controller.ts:106-111` · `reputation-tunables.ts:43-50` (registre, défaut 4, plage 2..8) · mesure `house-rules-cap.json` |
| **É9** | **Retirer une règle, et savoir lesquelles existent : deux gestes dessinés, zéro route.** `retractRule` a **1 appelant, de test** (`reputation-test.controller.ts:729`) — 0 en production. Aucune route n'énumère les `rule_id` possibles (`rule_id` est une chaîne libre écrite par le joueur). Le compteur « **01 RETIRABLE** » du cadre `regles` chiffre donc un geste impossible. | – | ● | **ASSUMÉ, à consigner** (L2 + L4 confirmés) | `boss-mirror.service.ts:206` + grep appelants (1, de test) · `reputation.controller.ts:84-86` (« free-form, player-authored ») · `generateur-reputation.py:209, 259-260` |
| **É10** | **`declared_at` écrit puis dépouillé.** `declareRule` persiste `{ rule_id, declared_at }` ; la projection ne garde que `rule_id`. Rien ne dit **depuis quand** une règle tient — alors que tout le propos de l'écran est « une règle tient jusqu'à retrait ». La maquette ne le dessine pas non plus : les deux côtés sont muets. | **B⁻** | – | candidat lot back | `boss-mirror.service.ts:179` (écriture) · `reputation-hub.service.ts:301` et `:440` (« Strip declared_at ») |

**Écart déjà consigné au dossier, re-vérifié et corrigé** : le bundle i18n mesuré rend **67 clés**,
dont **63 `error.*` et 4 `game.*`** (`game.lieutenant.assignment.summary`,
`game.lieutenant.recap.actions_taken`, `game.ui_common.confirm_button`, `.cancel_button`) — le
dossier disait « toutes `error.*` ». La substance tient : **zéro libellé de règle, de posture, de
cohérence, d'offre ou de tenue**. Tous les libellés français de la maquette (POSTURE, COHERENCE,
OFFRE, TELLS_LIB) sont des résolveurs à écrire côté front. Mesure : `mesures/i18n-bundle-fr.json`.

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| Q1 | **`restraint` présente/absente** (`GET /v1/me/reputation`, query `counterparty_id`) | « je peux te dire comment TELLE contrepartie te reçoit — mais il faut me dire laquelle ». Le seul écrivain de production du ring est le rappel (`POST /v1/meta/recall`) et il passe **l'id du lieutenant rappelé** comme `counterparty_id` : les « contreparties » sont en fait **vos lieutenants rappelés**. | **Utile ici, et ça change l'écran** : le cadre `gages` n'est pas atteignable sans un choix de contrepartie. Soit l'écran gagne un sélecteur (la liste des lieutenants rappelés), soit `gages` sort de screen_b3 et va sur la fiche de la contrepartie. Le trancher avant l'implémentation, pas pendant. | ★★★ |
| Q2 | **plafond 4/4** (`POST /v1/me/house-rules` → 409, message porteur de `current`/`cap`) | « vous avez donné toutes les cordes que vous pouvez tenir en même temps ». | **Utile ici** : c'est la contrainte qui donne son poids au geste — quatre règles seulement, et pas de retrait. Un compteur « 3/4 » sous le CTA suffirait ; sans lui le seul cadre `plein` possible est un 409 en pleine figure. | ★★★ |
| Q3 | **`declared:true`** (`POST /v1/me/house-rules`, 201) | l'accusé de réception du geste. | **Utile mais mince** : c'est le seul retour ; la maquette ne dessine aucun état d'après-geste (ni la liste rafraîchie, ni un cadre de confirmation). À dessiner comme un retour à `regles`, pas comme un toast. | ★★ |
| Q4 | **`player_id`** (`GET /v1/me/reputation`) | rien au joueur — c'est l'écho de son propre identifiant. | **Pas ici** : plomberie de corrélation. Ne pas dessiner. | ☆ |

---

## Lots back suggérés (B⁻ dessiné, forme F)

| # | colonne | table | maquette | preuve |
|---|---|---|---|---|
| **LB1** | `violation_slots[].rule_id` (+ `severity`) | `boss_mirror_violation_ring` | M04 « ENFREINTES 01 » · M18 barre verte/ambre par règle (cadre `regles`) · lot L1→L3 de la maquette | écrit par `recordViolation` (`boss-mirror.service.ts`), schéma `reputation_state.ts:91` ; absent de `ReputationSurfaceProjection` (`reputation-hub.service.ts:247-252`) et de la mesure `me-reputation-charge.json` (le ring est pourtant chargé) |
| **LB2** | `name` (et `name_locale`) | `lieutenant` | M12 « Salvatore, votre lieutenant » | `db/schema/lieutenant.ts:91-92` ; absent de `lieutenants.json` (5 clés) et de `lieutenant-by-id.json` (17 clés) |
| **LB3** | `marginalia` = de vrais noms de contreparties | `restraint_dispute_ring` (pas de table de contrepartie) | M21 les 3 noms · M22 la prose « ils donnent leur nom » | `restraint-index.service.ts:330-336` (étiquettes positionnelles assumées faute d'entité) vs canon `:95` |
| *(LB4, mineur)* | `declared_rules[].declared_at` | `boss_mirror_declaration_ledger` | non dessiné — mais l'ancienneté d'une règle est le corollaire de « elle tient jusqu'à retrait » | `boss-mirror.service.ts:179` écrit, `reputation-hub.service.ts:301/440` dépouille |

---

## Actions : routes ↔ CTA

**Routes `@Post` joueur du domaine : 1.**

| geste | route | CTA maquette | statut |
|---|---|---|---|
| déclarer une règle | `POST /v1/me/house-rules` (`reputation.controller.ts:92`) | M25 « DONNER UNE RÈGLE » (cadres `canon`, `derive`, `regles`) / « DONNER UNE PREMIÈRE RÈGLE » (cadre `vide`) | ✔ apparié — 1 route, 1 CTA |
| **retirer une règle** | **aucune** (`retractRule` : 1 appelant, de test) | pas de CTA, mais un panneau qui en parle + le compteur « 01 RETIRABLE » | **route manquante, geste chiffré** — É9 |
| **choisir une contrepartie** | **aucune** (`counterparty_id` est un paramètre appelant) | pas de geste ; le cadre `gages` s'affiche sans dire d'où vient la contrepartie | **CTA manquant** — Q1 |
| **connaître les `rule_id` possibles** | **aucune** | le CTA ouvre un formulaire sans vocabulaire | **route manquante** — É9 / L4 |

Le corps du CTA (le formulaire de saisie du `rule_id`) **n'est pas dessiné** dans les six cadres :
c'est le geste central de l'écran et il n'a pas d'écran.

---

## Table de couverture complète

Le bandeau haut (argent, médaillon HEAT, jour + phase) est le **chrome commun du shell** (lot déjà
livré) — traité à part, hors table, conformément au dossier.

### Lignes appariées ou disponibles (côté B)

| # | information | B | M | statut | note |
|---|---|---|---|---|---|
| 1 | `player_id` | ● | – | **« PASSÉ À CÔTÉ ? »** | Q4 — plomberie |
| 2 | `boss_mirror.portrait_posture` | ● | ● | ✔ | M11 portrait incliné + regard + bouche, M13 libellé + couleur ; 4 valeurs, la maquette en dessine 2 (`cautious`, `withdrawn`) |
| 3 | `boss_mirror.declared_rules` (cardinal) | ● | ● | ✔ | M03 « RÈGLES DONNÉES 03 / 00 » |
| 4 | `boss_mirror.declared_rules[].rule_id` | ● | ● | ✔ | M17 (`rule.no_families` sous le libellé de fiction) |
| 5 | `boss_mirror.consistency_cue` | ● | ● | ✔ | M09 libellé + couleur, M02 sous-titre, M23 état vide ; les 3 valeurs sont dessinées |
| 6 | `restraint` (section présente / omise) | ● | – | **« PASSÉ À CÔTÉ ? »** | Q1 — aucun sélecteur de contrepartie |
| 7 | `restraint.offer_posture` | ● | ● | ✔ | M19 + M02 ; 2 valeurs, la maquette dessine `wary` (cadre `gages`) |
| 8 | `restraint.marginalia` (cardinal) | ● | ● | ✔ mais É4 | M05 « RÉGLÉS 03 » — dessiné aussi dans un cadre où `restraint` est omis |
| 9 | `restraint.marginalia[]` (valeurs) | ● | ● | **écart É3** | valeurs mesurées `settlement-N`, maquette : des noms |
| 10 | `hidden_curriculum.uniform_tells.collar` | ● | ● | **écarts É1 + É2** | polarité inversée |
| 11 | `…uniform_tells.sleeves` | ● | ● | ✔ (É1) | polarité juste |
| 12 | `…uniform_tells.watch` | ● | ● | ✔ (É1) | polarité juste |
| 13 | `…uniform_tells.gloves` | ● | ● | **écarts É1 + É2** | polarité inversée |
| 14 | `POST /v1/me/house-rules` → `{declared:true}` | ● | – | **« PASSÉ À CÔTÉ ? »** | Q3 |
| 15 | `POST /v1/me/house-rules` → 409 `(current/cap)` | ● | – | **« PASSÉ À CÔTÉ ? »** | Q2 / É8 |

### Lignes dessinées sans clé B (M non apparié)

| # | élément M | représente | statut |
|---|---|---|---|
| 16 | M04 « ENFREINTES » (compteur) | nombre de règles enfreintes | **B⁻ → lot back LB1** |
| 17 | M18 barre de statut par règle (vert tenue / ambre enfreinte) | quelle règle est enfreinte | **B⁻ → lot back LB1** |
| 18 | M12 « Salvatore » | nom du lieutenant | **B⁻ → lot back LB2** |
| 19 | M16 libellé de fiction des règles (« On ne touche pas aux familles ») | le texte d'une règle | **ASSUMÉ consigné** (L1 — `rule_id` libre, 0 libellé i18n) |
| 20 | M06 « 01 RETIRABLE » (compteur) | combien de règles on peut retirer | **ASSUMÉ à consigner** — aucune route de retrait (É9) |
| 21 | M22 prose « Ils donnent leur nom / la maison sait avec qui vous avez réglé » | affirme une donnée que le back n'a pas | **ASSUMÉ à consigner** (É3) |
| 22 | M10 / M14 / M20 / M24 — prose pédagogique (« quatre choses se remarquent », « il vous mesure à vos propres règles », « on vient vous voir, mais avec des garanties », les 4 panneaux `.pann`) | reformulation du canon, pas de donnée | ASSUMÉ, sans risque |
| 23 | M01 titre « Le miroir » + M27 liseré doré du portrait « moi » | identité d'écran / marque de possession | ASSUMÉ, sans risque |
| 24 | M26 les 4 panneaux « maillon manquant » L1–L4 (cadre `lots`) | méta-cadre de la maquette, pas un écran joueur | hors couverture produit |

**Contrôle d'arithmétique** : `|clés B| = 15` (13 clés du corps `GET` mesuré + 2 surfaces de la route
`POST`) · `|éléments M non appariés| = 9` · pas de colonne F (mode maquette) ·
**15 + 9 = 24 lignes** — la table en compte 24. ✔

---

## Annexes

### 1. Routes du domaine (compte, ancres)

**Balayage** — `grep -rnE "portrait_posture|uniform_tells|marginalia|declared_rules|consistency_cue|offer_posture" services/game-back/src --include='*.controller.ts'` hors `operational/reputation/` : **0 occurrence** sur 146 contrôleurs. Le domaine ne déborde d'aucun `me/` ni `session/`. Le dossier proposait 2 routes, j'en trouve **2**.

| route | garde | fichier:ligne |
|---|---|---|
| `POST /v1/me/house-rules` | `JwtAuthGuard` | `reputation.controller.ts:92` |
| `GET /v1/me/reputation` | `JwtAuthGuard` | `reputation.controller.ts:126` |

Exclus : `reputation-admin.controller.ts` (`GET players/:id/reputation-state`, `POST players/:id/force-rule-violation` — BO/staff) et `reputation-test.controller.ts` (1968 lignes, `_test`).

Routes **adjacentes** exercées pour dimensionner : `POST /v1/auth/signup`, `POST /v1/session/open`,
`GET /v1/lieutenants`, `GET /v1/lieutenants/:id`, `GET /v1/i18n/bundle`.

### 2. Corps réels — `mesures/` + commandes

| fichier | ce qu'il pèse |
|---|---|
| `signup.json` | compte frais ; jeton lu à `payload.data.access_token` |
| `session-open.json` | `session/open` exige `client_version` (422 sans lui) ; rend `hl_card`, `queue` (carte d'exception pré-semée), etc. |
| `lieutenants.json` | **un compte frais possède déjà 2 lieutenants COOK** — le kit de départ en donne, aucune route de recrutement n'est nécessaire. Clés : `lieutenant_id`, `archetype`, `op_state_band`, `rule_count_band`, `tenure_bucket` |
| `lieutenant-by-id.json` | 17 clés, aucune n'est un nom |
| `me-reputation-frais.json` | **compte frais** : `boss_mirror{portrait_posture:"attentive", declared_rules:[], consistency_cue:"indeterminate"}` + `hidden_curriculum.uniform_tells{open,down,hidden,dirty}` ; **`restraint` absente** (pas de `counterparty_id`) — c'est exactement le cadre `vide` de la maquette |
| `house-rules-declare.txt` | 4 × `{declared:true}` |
| `house-rules-cap.json` | 5ᵉ règle → **409**, « cap reached (4/4) » |
| `me-reputation-4regles.json` | `declared_rules` = 4 entrées, **dans l'ordre de déclaration**, chacune `{rule_id}` seul |
| `me-reputation-counterparty.json` | `counterparty_id=inconnu-xyz` → **500 INTERNAL_ERROR** (`invalid input syntax for type uuid`) |
| `me-reputation-counterparty-uuid.json` | UUID inexistant → `restraint{offer_posture:"standard", marginalia:[]}` (ligne absente = neutre) |
| `seed.sql` | dimensionnement : ring de violation chargé (`violation_density=0.9`), `consistency_index=0.3`, ring de litige `wary_active=true` à 3 slots, 4 `norms_flags` à true |
| `me-reputation-charge.json` | **après seed** : `portrait_posture:"hostile"`, `consistency_cue:"drifting"`, `offer_posture:"wary"`, `marginalia:["settlement-1","settlement-2","settlement-3"]`, tells `{buttoned,rolled,visible,clean}` |
| `i18n-bundle-fr.json` | 67 clés : 63 `error.*`, 4 `game.*` |

Squelette employé :

    KEY=$(python3 -c 'import uuid;print(uuid.uuid4())'); CS="jd-$(date +%s)"
    curl -s -X POST http://localhost/v1/auth/signup -H 'Content-Type: application/json' \
      -H "Idempotency-Key: $KEY" -d "{\"callsign\":\"$CS\",\"password\":\"pw-$CS\"}" > signup.json
    TOK=$(python3 -c "import json;print(json.load(open('signup.json'))['payload']['data']['access_token'])")
    curl -s -X POST http://localhost/v1/session/open -H "Authorization: Bearer $TOK" \
      -H 'Content-Type: application/json' -H "Idempotency-Key: $(uuidgen)" \
      -d '{"client_version":"1.0.0","platform":"unity-editor"}'
    curl -s -H "Authorization: Bearer $TOK" "http://localhost/v1/me/reputation?lieutenant_id=$LT" \
      | python3 -m json.tool

### 3. Valeurs possibles par clé, avec la contrainte source

Aucune contrainte n'est un `CHECK` SQL : le domaine range des JSONB et des `real` en base, et les
**bandes** naissent dans trois fonctions de projection. Les valeurs possibles sont donc lues **là**.

| clé | valeurs | contrainte source |
|---|---|---|
| `portrait_posture` | `attentive` \| `cautious` \| `withdrawn` \| `hostile` | union TS `reputation-hub.service.ts:65` ; découpes `densityToPostureBand` (`:181-189`) sur `violation_density` : `<0.2` / `<0.5` / `<0.8` / `≥0.8`. **Non tunables** (« structural presentation tier cuts ») |
| `consistency_cue` | `aligned` \| `drifting` \| `indeterminate` | union TS `:69` ; `consistencyToCue` (`:201-206`) : `null → indeterminate`, `≥0.75 → aligned`, sinon `drifting`. `indeterminate` = **pas encore jugeable**, jamais « moyen » (mesuré sur compte frais) |
| `declared_rules[].rule_id` | **chaîne libre écrite par le joueur** — pas d'énumération | `reputation.controller.ts:84-86`, `:101-103` (non-chaîne / vide → 404). Cardinal ≤ `reputation.boss_mirror_max_public_rules`, **registre, défaut 4, plage 2..8** (`reputation-tunables.ts:43-50`) ; mesuré 4/4 |
| `offer_posture` | `standard` \| `wary` | union TS `:81` ; ligne de ring absente → `standard` (`restraint-index.service.ts:307-315`) ; sinon `wary_active` persisté, ou calcul à la volée si jamais tické |
| `marginalia[]` | `settlement-N` (N = index dans le ring) ; **≤ 3** ; `[]` si pas de ligne | `restraint-index.service.ts:330-336` (`slots.slice(-3)`). Ring ≤ 6 slots (`restraint_window_disputes`) |
| `uniform_tells.collar` | `buttoned` (ledger_hygiene = true) \| `open` (false / pas de ligne) | `hidden-curriculum.service.ts:76-85` + canon `:170` |
| `uniform_tells.sleeves` | `rolled` (fairness_to_subordinates) \| `down` | idem |
| `uniform_tells.watch` | `visible` (punctuality) \| `hidden` | idem |
| `uniform_tells.gloves` | `clean` (discretion_around_civilians) \| `dirty` | idem |
| `player_id` | id opaque (uuid v7) | `player.player_id` |

**R2.2 — aucune clé ne déroge** : rien de scalaire ne sort. La spec E2E épingle 22 clés serveur
interdites (`reputation_surface_route.spec.ts:60-68`) ; le corps mesuré n'en porte aucune.
**Les 4 tells sont des booléens projetés en paires d'énumérés — c'est la seule « bande » du corps
qui n'a que deux crans**, et la maquette la dessine correctement comme un état binaire (bande
allumée / éteinte), pas comme une jauge.

**B⁻ — en base, jamais projeté** (tables du domaine, `db/schema/reputation_state.ts` + `lieutenant.ts`) :

| table | colonnes non projetées |
|---|---|
| `boss_mirror_violation_ring` | `violation_slots[].rule_id` ★, `violation_slots[].severity`, `ring_head`, `violation_density`, `defection_tolerance`, `last_tick_week` |
| `boss_mirror_declaration_ledger` | `declared_rules[].declared_at` ★, `retraction_history` (entier), `consistency_index`, `last_consistency_week` |
| `restraint_dispute_ring` | `counterparty_id` (rendu par `computeOfferTerms` puis **dépouillé** par le hub — `restraint-index.service.ts:103` vs `reputation-hub.service.ts:458-461`), `dispute_slots`, `ring_head`, `restraint_ratio`, `offer_terms`, `wary_active`, `collateral_amount` |
| `hidden_curriculum_norms_vector` | les **4 normes sans tell** : `silence_at_handoffs`, `debt_handling`, `escalation_reflex`, `restraint_with_force` ; `witnessed_event_ring`, `ring_head`, `last_review_week` |
| `lieutenant` | `name` ★, `name_locale` |

★ = dessiné par la maquette ⇒ forme F, lots LB1/LB2/LB4. Les scalaires (`violation_density`,
`consistency_index`, `restraint_ratio`, `collateral_amount`…) sont **interdits de projection par le
mur P5** — ils ne sont pas des candidats, ils sont des murs.

### 4. Inventaire M (Mxx → représente)

Source : `generateur-reputation.py` (le générateur qui a produit la section) + rendus
`m-119` … `m-124` + `ecrans-brennar-6.html:5974-5995`. Cadres : `canon`(119), `regles`(120),
`derive`(121), `gages`(122), `vide`(123), `lots`(124).

| id | texte / valeur tel qu'écrit | représente | ligne |
|---|---|---|---|
| M01 | « Le miroir » | titre d'écran | `:175` |
| M02 | 6 sous-titres, un par cadre | l'état global lu (cohérence / offre / vide) | `:169-174` |
| M03 | « 03 » / « 00 » — RÈGLES DONNÉES | `len(declared_rules)` | `:183, 207, 222, 238, 250` |
| M04 | « 01 » / « 00 » — ENFREINTES | nombre de règles enfreintes | `:184` (`sum(1 for r in REGLES if not r[2])`) |
| M05 | « 03 » / « 00 » — RÉGLÉS (RÉCEMMENT) | `len(marginalia)` | `:185, 223` |
| M06 | « 01 » — RETIRABLE | règles retirables | `:209` |
| M07 | portrait SVG « moi » + liseré doré | le joueur, dessiné par ses tells | `:91-144, 187` |
| M08 | 4 bandes : COL OUVERT · MANCHES ROULÉES · MONTRE VISIBLE · GANTS SALES, dorées si `on` | les 4 `uniform_tells` | `:147-164` |
| M09 | « Vous vous y tenez » (vert) / « Vous vous en écartez » (ambre) / « pas encore jugeable » (muet) | `consistency_cue` | `:51-55` |
| M10 | « quatre choses se remarquent » | littéral | `:188` |
| M11 | portrait SVG lieutenant : inclinaison 0/6/14/20°, décalage du regard, bouche | `portrait_posture` | `:45-50, 102, 136-142` |
| M12 | « Salvatore, votre lieutenant » | nom du lieutenant | `:189` |
| M13 | « il vous écoute » / « il se tient à carreau » / « il se ferme » / « il vous en veut » + couleur | `portrait_posture` (libellé) | `:45-50` |
| M14 | « il vous mesure à **vos propres règles** » | littéral canon | `:194` |
| M15 | liste de 3 lignes `.rg6` | `declared_rules` (le tableau) | `:210-215` |
| M16 | « On ne touche pas aux familles » … | libellé de fiction | `:151-153` |
| M17 | « rule.no_families » … | `declared_rules[].rule_id` | `:151-153, 214` |
| M18 | barre `.sc` verte (tenue) / ambre (enfreinte) | quelle règle est enfreinte | `:213-214` |
| M19 | « On demande des gages » (ambre) / « on vient sans garantie » (vert) | `offer_posture` | `:56-59, 227` |
| M20 | « on vient vous voir, mais avec des garanties » | lecture de `offer_posture` | `:228` |
| M21 | pastilles « Ferrante » « Wexler » « la Coil » | `marginalia[]` | `:154, 235` |
| M22 | « les derniers réglés / **Ils donnent leur nom** / la maison sait **avec qui vous avez réglé**, et le dit » | affirme la nature de `marginalia` | `:230-234` |
| M23 | « Pas encore assez de matière pour vous juger. » | `consistency_cue = indeterminate` | `:240-241` |
| M24 | 4 panneaux `.pann` (la règle du jeu / ce qui a changé / retirer une règle / « pas jugeable » n'est pas « moyen ») | prose canon | `:195-203, 216-218, 242-246` |
| M25 | CTA « DONNER UNE RÈGLE » / « DONNER UNE PREMIÈRE RÈGLE » | `POST /v1/me/house-rules` | `:204, 219, 247` |
| M26 | 4 panneaux L1–L4 « maillon manquant » | méta | `:252-262` |
| M27 | `.prt.moi` bordure `or_filet` | marque de possession | `:65` |

**Aucune valeur en dur de type jauge** dans cet écran (pas de `width:NN%` codé) — le piège mesuré
sur d'autres écrans n'existe pas ici : la maquette n'a chiffré aucun ratio. Les seuls chiffres en
dur sont les compteurs M03–M06, dont deux (M04, M06) n'ont pas de source.

### 5. Inventaire F

Sans objet — **mode maquette**, l'écran Unity n'existe pas.

### 6. Ce que je n'ai pas pu vérifier

1. **Les états non neutres n'ont pas été atteints par un chemin joueur.** Sur compte frais, la route
   rend `attentive` / `indeterminate` / `open,down,hidden,dirty` et pas de `restraint` — soit
   exactement le cadre `vide`. Pour mesurer `hostile` / `drifting` / `wary` / les 4 tells actifs,
   j'ai **semé en SQL** (`mesures/seed.sql`). Le chemin joueur réel est un
   `POST /v1/meta/recall` en conditions de max-extract avec une règle déclarée préfixée
   `settle_fair` — c'est **le seul écrivain de production** des deux rings
   (`promotion-lock.service.ts:476` et `:501`) ; je ne l'ai pas exercé (il faut une catégorie
   déléguée et un verrou de promotion). **La mesure qui trancherait** :
   `npx playwright test tests/e2e/operational/reputation_surface_route.spec.ts` — cette spec exerce
   les cinq changements par le vrai chemin.
2. **`counterparty_id` = un id de lieutenant rappelé.** Déduit du seul site d'écriture
   (`recordDisputeOutcome(playerId, recalledLieutenantId, …, recalledLieutenantId)`,
   `promotion-lock.service.ts:501`) — **je ne l'ai pas mesuré de bout en bout** (voir 1). Aucune
   route joueur ne **liste** les contreparties d'un joueur : je n'ai trouvé aucun moyen, côté
   client, de découvrir un `counterparty_id` valide. C'est le fond de la question Q1.
3. **Les valeurs possibles de `rule_id` n'ont aucune contrainte lisible** — chaîne libre, pas
   d'énumération, pas de `CHECK`, pas de libellé i18n. Rien ne peut trancher : c'est un vide, pas
   une mesure manquante.
4. **`consistency_cue = aligned` non reproduit** : il exige `consistency_index ≥ 0.75`, calculé par
   un tick hebdomadaire (`last_consistency_week`). Je n'ai pas fait tourner le tick ; j'ai semé
   `0.3` (→ `drifting`) et laissé `null` (→ `indeterminate`). La valeur `aligned` reste **déduite de
   `consistencyToCue` (`reputation-hub.service.ts:205`)**, pas mesurée.
5. **`portrait_posture = cautious` et `withdrawn` non mesurés** (j'ai mesuré `attentive` et
   `hostile`, les deux extrêmes) — les découpes intermédiaires sont lues à la source
   (`:181-189`), pas exercées. Ce sont pourtant les deux valeurs que la maquette dessine.
6. **Le générateur `verifier()` / `verifier_palette()` n'a pas été exécuté** — c'est une garde
   visuelle, hors du mandat données.
