# Juge données ⊥ — ㊳ « Le journal » — mode **maquette** (tour 2) — 2026-11-12

## Verdict : **RATIFIABLE**

La maquette ne dessine **rien que le back contredise**, et **aucune** de ses 22 chaînes n'est inventée :
19 sont la chaîne FR servie **au caractère près** (7 après la règle `text-transform:uppercase` du CSS),
3 ne diffèrent que par la **capitale initiale**. Le seul élément dessiné qu'**aucune route du journal**
ne porte est le **nom de quartier** — et ce nom existe au back (`district-names.ts`, 18 noms canon),
déjà projeté par 7 autres services : c'est un **lot back** (ou un câblage sur `/v1/world/districts`),
pas une invention. Ratifiable **sous réserve de consigner les 4 écarts** ci-dessous.

## En une phrase

La maquette montre **12 informations** sur les **56 clés** que les 7 routes joueur du domaine servent
(16 clés appariées, dont 4 doublons) ; **0 défaut dur**, **4 écarts à consigner**, **1 lot back suggéré**,
**13 questions « passé à côté ? »**.

---

## 0. Ce sur quoi tout repose (vérifié avant de mesurer)

| fait | mesure |
|---|---|
| Maquette = le blob épinglé | `git cat-file -s a3e02c2a:ecrans-brennar-6.html` = **2 733 270** o ; sha1 du fichier extrait = `7de05cc64c13283ded568b24d7d0a982a5da5ddf` = `git rev-parse a3e02c2a:ecrans-brennar-6.html` (`mesures/sortie-extraire-cadres.txt`) |
| 171 étiquettes, 6 cadres du journal | indices **0-based** trouvés : **125, 155, 156, 157, 158, 170** — identiques à l'annonce du dossier, libellé **relu dans le fragment extrait** (contrôle positif rc 0, contrôle négatif : libellé absent → 0 occurrence) |
| Pile ≠ cumul | `X-Server-Build` **8d0184a4** AVANT (`mesures/build-avant.txt`) **et** APRÈS (`mesures/build-apres.txt`) mes mesures — aucun redémarrage |
| Écart pile↔cumul sur le domaine | `git diff --name-only 8d0184a4 44a645a2 -- operational/ambient news i18n random-world` → **1 fichier : `i18n/string_table.ts`** (186 fichiers diffèrent au total). Contrôle positif : `--stat` sur ce fichier = 104 insertions. Contrôle négatif : `44a645a2..44a645a2` = 0 ligne. ⇒ **la FORME des réponses mesurées sur la pile vaut pour le cumul** ; seuls les **libellés** se lisent au cumul |
| Corps = corps | les 9 corps mesurés ont `bytes_read == Content-Length` (colonne `length_match: true`, `mesures/sortie-mesurer-B.txt`) — le piège `rtk curl` est contourné par `urllib` |
| Aucun POST d'assistance | `mesures/mesurer-B.py` ne poste que `auth/signup` et `session/open` ; `POST /v1/ambient/attend/:id` **jamais appelé** (interdit du dossier : l'événement est global) |

---

## 1. Écarts à consigner (mode maquette)

> Aucun n'est un « dessiné sans source » au sens strict : pour chacun, la source existe — ailleurs, ou
> en moins fin. Ce sont des **câblages à décider**, pas des inventions.

| # | information | B | M | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|
| **A1** | **nom de quartier** (3 emplacements : `.cle` de la une, `span` de chaque brève, et la fente ICU `{district}` du titre) | ● **slug** | ● **nom** | **lot back** (forme F élargie) | Servi : `"district": "district-16"` et `"district": "district-7"` (`mesures/02-ambient-feed.json`, `03-news-feed.json`). Le back **remplit lui-même** la fente avec le slug : `params: { district: \`district-${districtId}\`, … }` — `news-beat-generator.service.ts:636`. Dessiné : `Dépôt-Est`, `La Lisière`, `Les Entrepôts`, `Marne-Basse` (`mesures/inventaire-M.json`). Ces 4 noms sont le **canon** : `citysim/world/district-names.ts:21-28` (ids 12, 16, 11, 9), et `/v1/world/districts` les sert (`mesures/09-world-districts-HORS-DOMAINE.json`, 18 districts, clé `name`) |
| **A2** | **compteur « en cours »** (00) | – | ● | **ASSUMÉ à consigner** (aucune décision ne le couvre) | `GET /v1/random-world/active` ne sert **aucun total** : corps mesuré `{"events": []}` (`mesures/04-random-world-active.json`), interface `listActive(): Promise<{ events: … }>` — `random-world.projection.service.ts:79`. Même forme que E4 (« à la une »), mais E4 **a** sa décision et celui-ci **non** |
| **A3** | **pastille de fraîcheur** : 3 bandes, **2 teintes** | ● 3 bandes | ● 2 teintes | **écart NEUF, classe C** | Mesuré sur les 14 brèves des 6 cadres : `'ce matin' → ['#f2c96b']`, `'hier' → ['#b9ad92']`, `'la semaine passée' → ['#b9ad92']` ⇒ *« 3 mots de fraîcheur dessinés, 2 teintes de pastille distinctes »* (`mesures/sortie-inventaire-M.txt`). **La teinte du MOT aussi** est confondue. La bande reste entièrement portée par le **texte** — aucune information perdue |
| **A4** | **descripteurs de brève** : capitale initiale ajoutée | ● minuscule | ● Majuscule | **MINEUR à consigner** | `ambient.micro_event.stalled_tram` FR = `'un tramway en panne'` ; dessiné `'Un tramway en panne'`. Idem `delayed_shipment`, `bar_rumor` — 3 verdicts `DIFFERENT` sur 22, **uniquement** sur la capitale (`mesures/sortie-appariement.txt`). `.jrn6 .brv b` **n'a pas** de `text-transform` (bloc CSS §SÉRIE 6) : le client devra capitaliser, ou une 2ᵈ clé sera nécessaire |

### Décisions du dossier — **toutes appliquées** par la maquette (vérifié, non rouvert)

| décision | appliquée ? | preuve |
|---|---|---|
| pastille = la fraîcheur (classe C) | **oui**, à 2 bandes sur 3 → voir **A3** | ci-dessus |
| compteur « à la une » = compte de la page | **oui** | `01` vs 1 une rendue, dans les **6** cadres (`sortie-inventaire-M.txt`, bloc CONTROLE E5) ; `news/feed` ne sert pas de total (clés de `data` mesurées = `['beats','nextCursor']`) |
| pas de phrases riches : seulement les 6 descripteurs servis | **oui** | les 3 descripteurs dessinés sont 3 des 6 valeurs de l'enum `ambient_micro_event_kind` (`db/schema/ambient_world.ts:48-55`) et leurs chaînes FR servies |
| CTA reste **allumé** s'il reste une brève | **oui** | cadres 155-158 : 2 brèves restantes, `cta6` **sans** la classe `eteint` (`cta_classes` = `''` dans les 6 cadres) ; la classe `.cta6.eteint` existe pourtant au CSS |
| la brève visée est marquée par sa **FORME** | **oui** | `<div class="brv visee">` sur 6 brèves, et la règle existe : `.jrn6 .brv.visee{border-color:#b08d3e;box-shadow:inset 2px 0 0 #f2c96b}` — bloc CSS **en fin de page** (offset 2 714 851, après les cadres : classe neuve seule). Cerne laiton + liseré or de 2 px : une forme, pas un nom ni une couleur de pastille |

---

## 2. Les dix écarts du tour précédent

| id | verdict | preuve |
|---|---|---|
| **E1** phrases entières vs descripteur court | **FERMÉ** | les 3 descripteurs dessinés **sont** les chaînes FR servies, à la capitale près (voir A4) — `sortie-appariement.txt` |
| **E2** `kind` et clé i18n de la une hors domaine | **FERMÉ** | `stalled_tram`, `delayed_shipment`, `bar_rumor` ∈ les 6 valeurs de `ambientMicroEventKind` (`ambient_world.ts:48-55`). Titre de la une = `news_beat.cooper_affair.accident.brennar_daily_star.headline`, servie **EN et FR** ; FR = `'Un enchaînement de circonstances à {district}, actuellement à l'étude'` — identique au `<h5>` dessiné, fente comprise |
| **E3** « fait divers » hors `frame_tag_i18n_key` | **FERMÉ** | dessiné « angle accident » = `news_beat.frame_tag.accident` FR, verdict **EGAL**. Les 8 valeurs du namespace sont servies EN+FR |
| **E4** compteur « à la une » sans source de compte | **FERMÉ par décision** (ASSUMÉ) | confirmé que `news/feed` ne sert pas de total ; le compteur vaut le compte de la page (01 vs 1) |
| **E5** compteurs incohérents avec les éléments rendus | **FERMÉ** | 6 cadres × 3 compteurs = **18 comparaisons, 18 OK** (`sortie-inventaire-M.txt`) |
| **E6** noms de quartier non servis | **OUVERT — REFORMULÉ** | les noms ne sont **pas** inventés (ce sont les 4 noms canon), mais **aucune des 7 routes du domaine** ne les sert : slug seul, mesuré. ⇒ **A1 / lot back** |
| **E7** après le geste, liste et compteurs identiques | **FERMÉ** | 125 → 155-158 : brèves **3 → 2**, compteur « dans la rue » **03 → 02**, la brève attendue (`Un tramway en panne`) a disparu |
| **E8** bouton unique, la maquette ne dit pas quel événement | **FERMÉ** (décision appliquée) | la classe `visee` + sa règle CSS désignent la brève ciblée ; après le geste la marque passe à la brève suivante |
| **E9** la 3ᵉ bande `fading` jamais dessinée | **FERMÉ** | cadre **170** dessine les trois mots servis : `journal.fraicheur.fresh` / `.settling` / `.fading` = « ce matin » / « hier » / « la semaine passée », les trois **EGAL** |
| **E10** la pastille répète la fraîcheur sans 2ᵈ information | **FERMÉ par décision**, mais **REFORMULÉ** en **A3** | la gravité est bien hors des brèves — mais elle **est** servie par `random-world/active` (`severity_band`), et `journal.gravite.{faint,noticeable,heavy}` est **déjà au catalogue** (voir Q2) |

---

## 3. « Passé à côté ? » — pour l'user (questions, pas défauts)

| # | clé (route) | ce que ça dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | `body_i18n_key`, `byline_i18n_key`, `sourceless_badge`, `wire_badge`, `subject_i18n_key` — **`GET /v1/news/beats/:id`** | le **texte** de la une, **qui** l'a écrite, et deux badges : « sans source citée », « dépêche » | **utile ici, et c'est le plus gros manque** : une route entière du domaine n'a **aucun geste** dans les six cadres — on dessine le titre d'un article qu'on ne peut pas ouvrir. Un « badge sans source » est précisément ce qui apprend au joueur à se méfier d'un journal | ★★★★★ |
| **Q2** | `severity_band`, `phase_band`, `template_i18n_key` — `GET /v1/random-world/active` | ce qui est **en cours** dans la ville, sa gravité et où il en est | **utile ici** : le compteur « en cours » reste à **00** dans les six cadres, alors que **8 libellés sont déjà servis** pour ces bandes — `journal.gravite.{faint,noticeable,heavy}` (« à peine / on en parle / ça pèse ») et `journal.bloc.{ca_commence, ca_se_deploie, ca_retombe, ca_traine, ca_ne_partira_pas}` (5 = les 5 `phase_band`). Le catalogue a été écrit pour ça | ★★★★★ |
| **Q3** | `beats[].category` — `news/feed` | la **rubrique** (national / local / affaires / culture / sport) | **utile** : 4 rubriques distinctes mesurées sur 20 beats (`brennar_local` 11, `arts` 4, `business` 4, `national` 1) ; c'est ce qui distingue « la ville » de « le monde ». ⚠ **aucun libellé i18n servi** (`news_beat.category.*` = 0 clé) : à afficher demande 5 clés neuves | ★★★★ |
| **Q4** | `events[].channel` — `ambient/feed` | **par où** la brève est arrivée : rumeur de fond, canal commercial, comptoir | **utile** : 2 valeurs distinctes mesurées sur 3 événements (`constant_hum`, `trade_channel`) ; c'est la 2ᵈ information que la pastille pourrait porter au lieu de répéter la fraîcheur (cf. A3/E10). ⚠ **aucun libellé i18n servi** (`ambient.channel.*` = 0 clé) | ★★★★ |
| **Q5** | `pair_i18n_key`, `source_system_label`, `target_system_label`, `discovered_recency_band` — **`GET /v1/random-world/known-couplings`** | les **causes de la ville que le joueur a comprises** | **utile** : `journal.bloc.couplages_compris` (« couplages compris »), `journal.bloc.la_ville_a_des_causes_et_vous_les_apprenez` et `journal.bloc.et_tout_ce_que_vous_n_avez_pas_encore_compris…` sont **déjà servis** — le texte existe, les six cadres ne le montrent pas. ⚠ `source_system_label`/`target_system_label` sont des **libellés EN en dur dans le back** (`random-world.projection.service.ts:110-111` : `'Unknown system'`), ce qui heurte F1/R-EH-2 | ★★★★ |
| **Q6** | `headline_params_fields.subject` — `news/feed` | **de quoi** parle la une (clé i18n du sujet, p. ex. `ambient.micro_event.stalled_tram`) | utile : c'est le lien explicite entre la une et les brèves de la rue — « le journal parle de ce que vous avez vu dans la rue ». Mesuré sur 20 beats : présent sur 18, absent sur les 2 `wire_day` | ★★★ |
| **Q7** | `total` / `limit` / `offset` (ambient) et `nextCursor` (news) | qu'il y a **plus** que ce qui est montré | question d'ergonomie : `ambient/feed` sert `total: 3` pour une page de 20, `news/feed` renvoie un `nextCursor` **non nul** sur 20 beats — la maquette ne dessine **aucun geste de page**. À trancher : page unique assumée, ou « voir plus » | ★★★ |
| **Q8** | `frame_tag_i18n_key` = `null` | une une **sans angle** | la maquette ne dessine que le cas « avec angle » : **15 des 20 beats mesurés ont `frame_tag_i18n_key: null`**. L'état sans étiquette est le cas **majoritaire** et n'est pas dessiné | ★★★ |
| **Q9** | `district` = `null` (news) | une une **nationale**, sans quartier | mesuré : 1 beat `national` sur 20 ; `district: null` est légal (`news.projection.service.ts:131`). Non dessiné | ★★ |
| **Q10** | `recency_band` = `fading` **sur la une** | une une d'il y a plus de 24 h | la une est dessinée « ce matin » dans les **six** cadres ; `fading` n'est jamais dessiné **pour la une** (il l'est pour une brève, cadre 170) | ★★ |
| **Q11** | `POST /v1/random-world/hollow/:eventId/attend-funeral` | un **2ᵈ geste** du domaine : assister à un enterrement | hors de l'écran tel que dessiné, mais c'est la **seule autre action joueur** du domaine ; à dire explicitement qu'elle n'appartient pas au journal | ★★ |
| **Q12** | `event_id` / `beat_id` | — | **pas ici** : poignées opaques, plomberie (mais `beat_id` est la clé du détail de Q1) | ☆ |
| **Q13** | `district` du `POST attend`, `status: 'attended'` | — | **pas ici** : la réponse du geste est déjà entièrement rendue par `residue_i18n_key` | ☆ |

---

## 4. Lots back suggérés

| # | ce qui manque | où c'est déjà au back | maquette | preuve |
|---|---|---|---|---|
| **L1** | `district_name` sur `AmbientFeedItemView`, `NewsFeedBeatView`, `RandomWorldActiveEventView` (et le param ICU `{district}`) | `citysim/world/district-names.ts` — 18 noms canon, **déjà projetés par 7 services** (`selling`, `player-buildings`, `real-estate`, `district-interior`, `world-geography`, `heat`, `flag-discipline`) | **M15, M19**, et la fente `{district}` de **M14** | Précédent exact à imiter : `PlayerBuildingListEntry.district_name` — `citysim/district_interior/player-buildings.controller.ts:66-69` : *« The district's fiction name (P4 item 2) — so the client can say "à La Lisière" without re-balayer les 18 districts »*. **Même phrase, même besoin, autre écran.** Repli déjà conventionné : `nomDeDistrict(id) ?? name_canonical` |

**Alternative sans lot back** : le client appelle `GET /v1/world/districts` une fois et joint sur le slug
(mesuré : 18 districts, clé `name`, `mesures/09-world-districts-HORS-DOMAINE.json`). Mais la fente ICU
`{district}` du **titre** reste remplie par le back avec le slug — le client devrait **ré-écrire** un
paramètre que le serveur a posé. C'est l'argument pour L1.

### B⁻ — en base, non projeté (candidats)

**B⁻ ∩ M = ∅** : aucune colonne non projetée n'est dessinée. Le lot L1 **ne vient donc pas d'une colonne**
mais d'un **registre serveur déjà projeté ailleurs** — forme F élargie, pas forme F stricte.

| table | colonnes qu'**aucune** projection joueur du domaine ne porte | dessiné ? |
|---|---|---|
| `ambient_micro_event` (11 col.) | `game_day`, `hour_of_week`, `status`, `expires_at_game_minute` (brut), `attended_by_player_id`, `attended_at_game_day`, `created_at` | non (7/7) |
| `news_beat` (15 col.) | `game_day`, `thread_id`, `template_id`, `fodder_refs` | non (4/4) — `thread_id` est le plus intéressant : un beat appartient à une **histoire qui court**, et rien ne l'expose |
| `random_world_event_active` (10 col.) | `status`, `expires_at_game_day`, `parent_event_id`, `payload`, `created_at` | non (5/5) |

---

## 5. Actions : routes ↔ CTA

| geste / route | côté maquette | côté back | verdict |
|---|---|---|---|
| CTA « Y PRÊTER ATTENTION » (M23) | 1 bouton par cadre, cible marquée par la classe `visee` | `POST /v1/ambient/attend/:id` — **un id par appel** (`ambient.controller.ts:77-84`) | **apparié**. La maquette désigne bien la cible ; elle ne dit pas **comment** elle est choisie (dans les 6 cadres c'est toujours la **1ʳᵉ** brève) → à trancher dans la spec front, pas un défaut |
| — | aucun geste d'ouverture d'une une | `GET /v1/news/beats/:id` | **route sans CTA** → **Q1** |
| — | aucun geste de pagination | `news/feed?cursor=`, `ambient/feed?limit=&offset=` | **route sans CTA** → **Q7** |
| — | aucun geste | `POST /v1/random-world/hollow/:eventId/attend-funeral` | **route sans CTA** → **Q11** (hors journal, à dire) |
| note de pied après geste (M24) | 4 textes, un par bande | `residue_band` × `residue_i18n_key` (4 littéraux, `ambient-attend-view.ts:24-29`) | **apparié, 4/4 EGAL** — les 4 phrases FR de la maquette sont **mot pour mot** les 4 chaînes servies |

---

## 6. Table de couverture complète

Fichier recomposable : `mesures/table-couverture.json` — recomptée par `mesures/controle-arithmetique.py`.

**Convention** (mandat §5) : une ligne par **clé B** (appariée ou non) + une ligne par **élément M non
apparié**. Deux clés B qui portent la même information gardent chacune leur ligne (doublon noté), sinon
l'équation ne ferme pas.

```
$ python3 -I controle-arithmetique.py            # CONTRÔLE POSITIF
|clés B|                  = 56
|éléments M|              = 24   (dont appariés : 12)
|éléments M non appariés| = 12
SOMME = 56 + 12           = 68 lignes
B appariés à un M : 16  |  B sans M : 40
VERT : 68 = 68  — table-couverture.json écrite
RC_POSITIF=0

$ python3 -I controle-arithmetique.py --negatif  # CONTRÔLE NÉGATIF
lignes recomptées = 67  |  annoncé dans le rapport = 68
ROUGE comme attendu
RC_NEGATIF=1
```

**|B| = 56, |M non appariés| = 12, somme = 68 lignes.**

### 6.1 Les 7 routes joueur du domaine (compte trouvé : **7**, dont **3 au-delà de la liste du dossier**)

Méthode : `grep -rn -E "@(Get|Post|...)\(" --include='*.controller.ts'` sur **tout** `services/game-back/src`,
filtré sur `ambient|news|random|journal`, puis exclusion des `@Controller('admin')` et des `*-test.controller.ts`.

| route | ancre | dans la liste du dossier ? | B |
|---|---|---|---|
| `GET /v1/ambient/feed` | `operational/ambient/ambient.controller.ts:53` | oui | **MESURÉE** |
| `POST /v1/ambient/attend/:id` | `ambient.controller.ts:77` | oui | **DÉDUIT** (POST interdit) |
| `GET /v1/news/feed` | `operational/news_beat/news.controller.ts:39` | oui | **MESURÉE** |
| `GET /v1/news/beats/:id` | `news.controller.ts:54` | **NON — trouvée en plus** | DÉDUIT (non exercée) |
| `GET /v1/random-world/active` | `operational/random_world/random-world.controller.ts:46` | oui | MESURÉE **à vide** |
| `GET /v1/random-world/known-couplings` | `random-world.controller.ts:59` | **NON — trouvée en plus** | MESURÉE **à vide** |
| `POST /v1/random-world/hollow/:eventId/attend-funeral` | `random-world.controller.ts:84` | **NON — trouvée en plus** | DÉDUIT |

Les 7 portent `@UseGuards(JwtAuthGuard)` (lu ligne à ligne). Les modules réels sont
`operational/news_beat/` et `operational/random_world/` — **pas** `src/news/` ni `src/random-world/`
annoncés par le dossier (`ls` : *No such file or directory*).

### 6.2 Les 56 clés B

| id | route | clé | M | statut | note |
|---|---|---|---|---|---|
| B01 | ambient/feed | `events[].event_id` | – | ● – plomberie | id opaque |
| B02 | ambient/feed | `events[].district` | M19 | ● ● **slug ≠ nom** | → **A1** |
| B03 | ambient/feed | `events[].kind` | M18 | ● ● ✔ | doublon de B05 |
| B04 | ambient/feed | `events[].channel` | – | ● – **« passé à côté ? »** | **Q4** — 0 libellé i18n |
| B05 | ambient/feed | `events[].descriptor_i18n_key` | M18 | ● ● ✔ | capitale → **A4** |
| B06 | ambient/feed | `events[].recency_band` | M20 (+M17, M22) | ● ● ✔ | pastille → **A3** |
| B07 | ambient/feed | `total` | M08 | ● ● ✔ | **le seul total servi des 3 listes** |
| B08 | ambient/feed | `limit` | – | ● – plomberie | **Q7** |
| B09 | ambient/feed | `offset` | – | ● – plomberie | **Q7** |
| B10 | news/feed | `beats[].beat_id` | – | ● – plomberie | clé du détail (**Q1**) |
| B11 | news/feed | `beats[].headline_i18n_key` | M14 | ● ● ✔ | |
| B12 | news/feed | `beats[].headline_params` | M14 | ● ● ✔ | objet libre, doublon B13-B16 |
| B13 | news/feed | `…headline_params_fields.district` | M14 | ● ● **slug ≠ nom** | mesuré `"district-7"` → **A1** |
| B14 | news/feed | `…headline_params_fields.subject` | – | ● – **« passé à côté ? »** | **Q6** |
| B15 | news/feed | `…headline_params_fields.outlet` | M12 | ● ● ✔ | doublon B18 |
| B16 | news/feed | `…headline_params_fields.frame` | M16 | ● ● ✔ | doublon (brut) B19 |
| B17 | news/feed | `beats[].category` | – | ● – **« passé à côté ? »** | **Q3** — 0 libellé i18n |
| B18 | news/feed | `beats[].outlet_i18n_key` | M12 | ● ● ✔ | |
| B19 | news/feed | `beats[].frame_tag_i18n_key` | M16 | ● ● ✔ | `null` sur 15/20 → **Q8** |
| B20 | news/feed | `beats[].district` | M15 | ● ● **slug ≠ nom** | `null` possible → **Q9** |
| B21 | news/feed | `beats[].recency_band` | M13 | ● ● ✔ | `fading` jamais dessiné sur la une → **Q10** |
| B22 | news/feed | `nextCursor` | – | ● – plomberie | non nul mesuré → **Q7** |
| B23-B28 | random-world/active | `event_id`, `template_i18n_key`, `district`, `severity_band`, `phase_band`, `recency_band` | – | ● – ×6 **« passé à côté ? »** | **Q2** — 8 libellés déjà servis |
| B29-B31 | POST attend | `event_id`, `district`, `status` | – | ● – ×3 plomberie | **Q13** |
| B32-B33 | POST attend | `residue_band`, `residue_i18n_key` | M24 | ● ● ✔ ×2 | 4 bandes = cadres 155-158 |
| B34-B50 | news/beats/:id | 17 clés (dont `body_i18n_key`, `byline_i18n_key`, `sourceless_badge`, `wire_badge`, `subject_i18n_key`) | – | ● – ×17 **« passé à côté ? »** | **Q1** |
| B51-B54 | known-couplings | `pair_i18n_key`, `source_system_label`, `target_system_label`, `discovered_recency_band` | – | ● – ×4 **« passé à côté ? »** | **Q5** |
| B55-B56 | POST attend-funeral | `event_id`, `status` | – | ● – ×2 | **Q11** |

### 6.3 Les 24 éléments M (et les 12 non appariés)

| id | élément (6 cadres) | B | statut |
|---|---|---|---|
| M01 | barre : ARGENT « 24 850 € » | – | **HORS DOMAINE** (barre commune à tous les écrans) |
| M02 | barre : CHALEUR « Tiède » + jauge | – | **HORS DOMAINE** |
| M03 | barre : « JOUR 12 » / « Plein jour » | – | **HORS DOMAINE** |
| M04 | enseigne « Le journal » | – | copie statique — `journal.bloc.le_journal` **EGAL** |
| M05 | enseigne « ce qui se dit ce matin » | – | copie statique — `journal.bloc.ce_qui_se_dit_ce_matin` **EGAL/CSS** |
| M06 | compteur « à la une » (01) | – | **ASSUMÉ** (décision E4) |
| M07 | libellé « à la une » | – | copie statique — `journal.bloc.a_la_une` **EGAL/CSS** |
| M08 | compteur « dans la rue » (03/02) | B07 | ✔ |
| M09 | libellé « dans la rue » | – | copie statique — `journal.bloc.dans_la_rue` **EGAL/CSS** |
| M10 | compteur « en cours » (00) | – | **ÉCART NEUF → A2** |
| M11 | libellé « en cours » | – | copie statique — `journal.bloc.en_cours` **EGAL/CSS** |
| M12 | une : nom du journal | B18 | ✔ `press.outlet.brennar_daily_star.name` **EGAL/CSS** |
| M13 | une : mot de fraîcheur + teinte | B21 | ✔ `journal.fraicheur.fresh` **EGAL** |
| M14 | une : titre (gabarit ICU rempli) | B11, B12, B13 | ✔ gabarit **EGAL** ; fente `{district}` → **A1** |
| M15 | une : NOM de quartier (`.cle`) | B20 | **A1** |
| M16 | une : étiquette d'angle | B19, B16 | ✔ `news_beat.frame_tag.accident` **EGAL** |
| M17 | brève : pastille (teinte) | B06 | **A3** (2 teintes / 3 bandes) |
| M18 | brève : descripteur | B05, B03 | ✔ sauf capitale → **A4** |
| M19 | brève : NOM de quartier | B02 | **A1** |
| M20 | brève : mot de fraîcheur + teinte | B06 | ✔ 3/3 **EGAL** |
| M21 | brève : marque « visée » | – | **ASSUMÉ** (décision) — aucune clé ne désigne la brève |
| M22 | cardinal de la liste (3 / 2) | B07 | ✔ 18/18 cohérent |
| M23 | CTA « Y PRÊTER ATTENTION » | – | copie statique — `journal.bloc.y_preter_attention` **EGAL/CSS** ; geste → route 4 |
| M24 | note de pied (1 + 4 bandes) | B33, B32 | ✔ 5/5 **EGAL** |

---

## 7. Hors cumul, à titre informatif — `lot/ambient-attend-par-joueur` (**DÉDUIT**)

`git merge-base --is-ancestor d1f93ebe 44a645a2` → **rc 1** : le lot est **hors du cumul**, et la pile est
au build 8d0184a4. Diff vs son point de divergence (`af6c3645`), limité à `operational/ambient/` : **3
fichiers, 91 insertions** — `ambient-attend.service.ts`, `ambient-micro-event.repository.ts`,
`ambient.projection.service.ts`.

**Ce que ça change pour la maquette : rien dans l'ensemble de clés.** Le seul changement de la projection
est le **cadrage** : `listLiveEventsForDistricts(playerId, districtIds, limit, offset, nowGameMinute)` au
lieu de `(districtIds, limit, offset)`, et le commentaire passe à *« …that THEY have not attended yet (the
attend is per-player) »*. `AmbientFeedItemView` et `AmbientAttendView` sont **inchangés**.

⇒ Les cadres 155-158 (liste 3 → 2, compteur 03 → 02) sont **vrais dans les deux mondes** ; ce qui change
est **pour qui** : aujourd'hui la brève disparaît **pour tous les joueurs**, avec le lot elle ne disparaît
que pour celui qui a posé le geste. Aucune conséquence sur ce que la maquette dessine.

---

## 8. Ce que je n'ai **pas** pu vérifier

1. **`POST /v1/ambient/attend/:id` jamais appelé** — interdit du dossier (événement global : le geste le
   consommerait pour tous). B29-B33 sont **DÉDUITS** de `ambient-attend-view.ts:13-29` + du contrôleur.
   *Ce qui trancherait* : un `POST` sur une pile jetable, ou une spec E2E qui épingle l'ensemble de clés
   de la réponse (le précédent du skill : `tutorial_overlay_session_open_non_regression.spec.ts:177-187`).
2. **`GET /v1/news/beats/:id` non exercée** — je n'ai pas appelé le détail. Ses 17 clés (B34-B50) sont
   **DÉDUITES** de `news.projection.service.ts:137-170`. *Ce qui trancherait* : un GET avec un `beat_id`
   mesuré (`379b4c3b-…` est dans `mesures/03-news-feed.json`). Je ne l'ai pas fait pour rester au
   périmètre de routes du dossier ; c'est un GET, donc sans effet — à relancer si l'user le veut.
3. **`random-world/active` et `known-couplings` mesurées À VIDE** sur compte frais
   (`{"events": []}`, `{"couplings": []}`) : un compte neuf n'a ni événement actif ni couplage découvert.
   **Un corps vide n'est pas un ensemble de clés** — B23-B28 et B51-B54 sont DÉDUITS de l'interface.
   *Ce qui trancherait* : `POST /v1/_test/random-world/run-daily-tick` ou un seed — **non fait**, c'est
   une écriture sur une pile partagée.
4. **Les 4 bandes de résidu ne sont pas reproductibles sur compte frais** : `residue_band` dépend du
   palier de rendement décroissant (`residueBandForTier`) et `none` exige qu'aucune ligne de cohésion
   n'existe — il faudrait 3 gestes successifs, donc 3 événements consommés pour toute la pile.
5. **L'atteignabilité exacte de la une dessinée** : `cooper_affair` × `frame: accident` est bien tirée
   uniformément sur les 4 frames (`cooper-affair.ts:31-33`) et `beatCategory` y est **toujours**
   `brennar_local`, mais le choix de l'**outlet** dépend de `journalistKey`
   (`news-beat-generator.service.ts:610`) : je n'ai pas vérifié que `brennar_daily_star` est tirable pour
   cette frame. La clé i18n de la combinaison **est** servie (EN+FR), ce qui rend la combinaison
   ratifiée côté copie. Aucun `cooper_affair` parmi les 20 beats mesurés.
6. **Les couleurs** : j'ai lu les hex de la source, **pas** rendu la page. Un juge **visuel** reste dû —
   en particulier sur **A3** (deux teintes `#f2c96b` / `#b9ad92` distinguables ?) et sur le liseré `visee`
   de 2 px. *Ce n'est pas mon mandat* : je juge l'information, pas les pixels.
7. **`X-Server-Build` = 8d0184a4 ≠ cumul 44a645a2** : j'ai mesuré que seul `string_table.ts` diffère sur
   le domaine, donc les **formes** mesurées valent. Je n'ai **pas** vérifié qu'aucun fichier **hors** de
   ces 4 chemins (p. ex. un intercepteur d'enveloppe) ne change une réponse du journal — 186 fichiers
   diffèrent au total.
8. **`journal.*` n'est servi par aucune route** : les 56 clés `journal.*` sont des clés **dérivées côté
   client**, résolues au bundle i18n. J'ai vérifié qu'elles existent **EN et FR** à la source (registres
   interrogés séparément, 2138 clés chacun), pas qu'un endpoint de bundle les sert au client.

---

## Annexes — `mesures/`

| fichier | quoi |
|---|---|
| `mesurer-B.py`, `sortie-mesurer-B.txt` | les 9 appels (signup jetable `jd3-…`, session/open, 7 GET) ; jetons **masqués** (`Bearer ***`, scrub récursif sur `token`/`password`/`secret`/`refresh`) |
| `00-signup.json` … `08-news-feed-brennar-local.json` | corps réels + `Content-Length` vs octets lus |
| `09-world-districts-HORS-DOMAINE.json` | `/v1/world/districts` — mesure qui tranche la source du **nom** de quartier |
| `build-avant.txt`, `build-apres.txt` | `X-Server-Build` = **8d0184a4** aux deux bouts |
| `maquette-a3e02c2a.html` | le blob épinglé (sha1 vérifié) |
| `extraire-cadres.py`, `cadre-{125,155,156,157,158,170}.{html,txt}` | extraction par **libellé**, div équilibrées, libellé relu (contrôles ± ) |
| `inventorier-M.py`, `inventaire-M.json`, `sortie-inventaire-M.txt` | inventaire M, appariement pastille×fraîcheur, contrôle E5 (18/18) |
| `lire-string-table.py`, `string-table-extrait.json`, `string_table-cumul-44a645a2.ts` | registres EN/FR **du cumul**, interrogés séparément (contrôles ± ) |
| `apparier-M-vs-servi.py`, `appariement-M-vs-servi.json`, `sortie-appariement.txt` | 22 chaînes dessinées vs servies : 12 EGAL, 7 EGAL/CSS, 3 DIFFERENT, 0 CLE-ABSENTE |
| `controle-arithmetique.py`, `table-couverture.json`, `sortie-controle-{positif,negatif}.txt` | 56 + 12 = 68 ; positif **rc 0**, négatif **rc 1** |

### Auto-audit du verdict

J'affirme avoir **ouvert et lu** chaque fichier cité : les 3 contrôleurs joueur ligne à ligne, les 3
projections, `ambient-attend-view.ts`, les 3 schémas, `district-names.ts`, `player-buildings.controller.ts`,
`news-beat-generator.service.ts` (composition `cooper_affair`), et les deux registres i18n du **cumul**.
Chaque compte de ce rapport (171 étiquettes, 6 cadres, 7 routes, 56 clés, 22 chaînes, 14 brèves, 18
comparaisons de compteurs, 2 teintes / 3 bandes, 18 districts) vient d'un `$( )` ou d'un script dont la
sortie est collée — **aucun n'est lu dans un affichage de terminal**. Je me suis trompé une fois en cours
de route (j'ai cru la règle `.jrn6 .brv.visee` absente parce qu'elle n'est pas dans le bloc CSS qui
précède les cadres) : le comptage sur **tout** le CSS de la page l'a trouvée, et le finding a été retiré
avant d'être écrit. Je n'ai lu **ni** les notes d'implémentation, **ni** aucun rapport de juge précédent,
**ni** `generateur-journal.py`, **ni** `Tools/juge-donnees/journal-38/maquette-2026-11-11/`.
Je n'ai **rien écrit** hors de ce dossier, **rien posté** sur la pile hors `signup`/`session/open`, et
**aucun** jeton n'est dans un fichier.
