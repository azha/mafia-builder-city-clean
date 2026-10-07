# Juge données ⊥ — ④ Accueil (« LA SUITE ») — mode CLÔTURE — 2026-10-07

Juge à contexte vierge. Je n'ai ni dessiné la maquette ni construit l'écran. Je n'ai lu **ni** les notes
d'implémentation **ni** aucun rapport de juge (visuel ou données) de cet écran — seulement
`Tools/juge-visuel/04-accueil/dossier.md` (le manifeste de l'orchestrateur, qui nomme la maquette et porte
la table des écarts ASSUMÉS que je dois re-vérifier), le code du back, le code du client, la source HTML de
la maquette, et des corps de réponse que j'ai mesurés moi-même.

## Ce que je mesure, exactement

| côté | source | état |
|---|---|---|
| **B** | pile dev locale, `http://localhost` (Traefik), **compte NEUF** créé par moi (`POST /v1/auth/signup` → `POST /v1/session/open`) | corps RÉELS, dans `mesures/`, commandes dans `commandes.sh` |
| **M** | `~/project/atelier3d-mafia/ecrans-brennar-accueil.html` **@ d84c6eb**, 5ᵉ `div.cadre` (lignes **789-791**), étiquette « ④ L'ouverture — un joueur neuf, planque non vide : la suite, ordre réel A · B\|C · E · D plafonné à 3 (PROPOSÉ) » | source HTML + CSS lue à l'octet |
| **F** | client Unity `gate/cumul-client-2026-09-22` @ `f533b91b`, planches `Tools/juge-visuel/04-accueil/captures-2026-10-07-apres-r4b/p1_lancement_1080x{1920,2400}.png` | code lu + les deux planches |

**QUEL BACK : le back de `main` 71fd2125**, pas le cumul non fusionné. Mesuré, pas déduit :

- image `mafia-clean-city-game-back` bâtie **2026-09-26T14:36:56+02:00** ; dernier commit de `main` touchant
  `services/game-back/src` = **`ac8d3e01` (2026-09-26 14:34:08)** — `rtk proxy git log -- services/game-back/src`
  (les commits de `main` du 07/10 ne touchent que `tests/` et la doc) ;
- contrôle **positif** : `LAUNDERING_SAFEHOUSE_SHORT` (chaîne introduite par les commits du 26/09) présente
  dans **5** fichiers de `dist/` du conteneur ; contrôle **négatif** : chaîne bidon → **0** ;
- `GET /v1/me/clock` → **404**. C'est la route que le cumul back ajoute (7 clés). Elle n'existe pas ici.

Conteneurs au moment de la mesure : **7** (`docker ps`), charge 0,96 — **aucun gate en cours**
(`pgrep -f 'run-parallel|run-gate'` vide, corroboré par le compte de conteneurs et la charge).

## En une phrase

**④ MONTRE 11 des 101 clés que le back lui sert** (10 observées sur la planche, la 11ᵉ dans un état qu'un
compte neuf n'atteint pas), en CONSOMME 24 de plus en logique sans les montrer, et en laisse **66** de côté ;
**1 DÉFAUT**, mineur, de consignation (l'écart assumé du fond de ville décrit un comportement que le code ne
fait pas) ; **0 défaut de couverture** au sens strict — aucun « dessiné + disponible + non affiché », aucun
« affiché sans source ». 5 questions « passé à côté ? » remontées en tête, 66 au total.

*(Comptes recomptés par un oracle indépendant sur la table du §7 : 103 lignes numérotées 1→103, sans trou ni
doublon ; 12 ✔ · 24 LOG · 66 Q · 1 D. Des 12 ✔, une — #103 — est un état de navigation du client, pas une clé
back : d'où « 11 clés montrées ».)*

---

## 1. Défauts

| # | information | B | M | F | statut | preuve |
|---|---|---|---|---|---|---|
| **D1** | **le quartier peint, et sa phase** | – | ● (`.scene.district` + `.voile-scene`, maquette L.789) | ● (planches P1) | **DÉFAUT MINEUR — écart assumé MAL CONSIGNÉ** | `Tools/juge-visuel/04-accueil/dossier.md` écrit, en raison de l'écart assumé F3 : « le quartier PEINT (diorama du district, profil verge, **jour/nuit selon la phase servie**) ». Le code ne le fait pas : `DashboardController.cs:190` → `public static string ModeDuFond(string dayPhase) => "nuit";` — **le paramètre est jeté**, la nuit est posée en dur. Et l'art de jour EXISTE et a un consommateur ailleurs (`DistrictBackgroundSlots.cs:58` `vergeJour`, `:72` `case "jour"`, consommé par `DistrictInteriorScreenController.cs:395` `RenderDayDiorama`). |

**Pourquoi MINEUR et pas BLOQUANT** : le RENDU est juste — la maquette pose la nuit dans les cinq cadres, et
`DashboardController.cs:117-121` documente que le diorama de jour a été mesuré comme cassant l'écran. C'est la
**raison écrite au dossier** qui est fausse, pas le pixel. Elle importe quand même : c'est la phrase qu'un
prochain lot lira pour décider si le fond doit suivre `day_phase`, et elle dit l'inverse du code. Le joueur,
lui, voit « Aube » écrit en grand (servi : `day_phase: "DAWN"`) au-dessus d'une ville de nuit.

**Classe du défaut, pour ne pas le refermer sur l'instance** : toute entrée de la table des écarts assumés
dont la RAISON décrit un comportement conditionnel (« selon X ») doit citer la ligne qui lit X. Ici il n'y en
a pas — la fonction a la bonne signature et ignore son argument.

### Ce que j'ai cherché et NE trouve PAS (contrôles négatifs)

- **« dessiné + disponible + non affiché » (● ● –) : ZÉRO.** Les 20 éléments porteurs de données du cadre 4
  sont tous affichés, y compris ceux dont l'état diffère sur la planche (voir §2).
- **« affiché sans source » (– ● ● ou – – ●) : ZÉRO**, hors D1. Toutes les chaînes de ④ passent par des
  résolveurs i18n dont j'ai vérifié que les clés sont **SERVIES** (voir §5) ; aucune valeur en dur, aucun
  scalaire reconstruit depuis une bande. Contrôle sur le point le plus exposé — l'aiguille du manomètre :
  `HeatBucketResolver.cs:170-183` rend **4 angles discrets** (60 / 20 / −20 / −60), un par bande, repli
  explicite à 0 pour `Unknown` ; ce n'est pas une interpolation (R2.2 tenue).
- **`cash_cents` affiché en clair (« 10 000 € ») n'est pas une fuite de scalaire** : le back le SERT
  (`GET /v1/economy/wallet` → `cash_cents: "1000000"`, mesuré) ; `TopBarController.cs:601-604` le formate à la
  locale servie (`/v1/me` → `locale: "fr"`) sans symbole en dur.

---

## 2. La pastille FAMILLE — pourquoi ce n'est PAS un défaut (je l'ai câblée à la source)

La maquette cadre 4 dessine un point or sur FAMILLE : `<small class="disc"></small>` (L.791), CSS
`.disc{…background:#d9ab4e…}`. **La planche P1 ne le montre pas.** Ce n'est pas un écart de rendu :

- la source est `GET /v1/autonomy-reports` — `AppShell.cs:1079-1081` passe les rapports à
  `PoserPastilleFamille`, et `AppShell.cs:620-625` allume le point ssi `rapports.Count(r => r != null) > 0` ;
  l'objet est construit sous le seul onglet `Tab.Org` (`AppShell.cs:2408-2427`) ;
- **mesuré sur mon compte neuf** : `GET /v1/autonomy-reports` → `{"reports": []}` ⇒ 0 ⇒ éteint.

Statut : **● ● ●**, affichée comme dessinée, dans un état que le compte neuf ne produit pas. La maquette
montre un état avec rapport, la planche un état sans. **Non vérifié** : je n'ai pas observé la pastille
ALLUMÉE en jeu (il aurait fallu dimensionner un rapport d'autonomie).

---

## 3. « Passé à côté ? » — les 5 premières, pour l'user

Classées par ce qu'un joueur y gagnerait. Je propose, l'user tranche.

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | `queue[0].event_descriptor` + `event_descriptor_i18n` (`session/open`) | **de quoi parle la carte** qui attend | **utile ici, et c'est le trou le plus visible** : ④ dit « Lt. Wend attend vos ordres » et ne dit JAMAIS pourquoi. La réplique servie existe, le client sait déjà la rendre (`ExceptionBandes.Replique(TexteServeur(card), …)`, utilisée par la forme LISTE du même fichier, `ExceptionQueuePanelController.cs:233-237`) — elle est retirée de la forme ligne-d'Accueil, pas absente du code | ★★★ |
| **Q2** | `queue` (cardinal), `session/open` | **combien** de décisions attendent | utile : la ligne est identique avec 1 carte et avec 7. `RenderedCardCount` porte déjà le compte (`ExceptionQueuePanelController.cs:186`) et n'est lu que par une garde ; les libellés sont même SERVIS (`accueil.file.plusieurs_attendent_encore`, `accueil.file.d_autres_attendent_au_dela_de_ce_que_la_file_montre`, mesurés dans le bundle fr) et leur seul porteur, `HomeChromeController`, n'est plus monté sur ④ (`AppShell.cs:1731-1734`) | ★★★ |
| **Q3** | `wallet_band` (`GET /v1/economy/wallet`) | l'**appréciation** du magot (« Fauché » … « Bien garni ») à côté du chiffre | à trancher : ④ montre le montant exact et jette la bande. Les 5 libellés sont SERVIS (`accueil.etat.fauche/juste/correct/a_flot/bien_garni`…, bundle fr) et un résolveur existe (`Shell.WalletBandResolver`). Mon avis : redondant avec le chiffre pour un joueur qui sait lire un montant — mais c'est le seul endroit où le jeu donne un JUGEMENT sur l'argent | ★★ |
| **Q4** | `exception_queue.emitted_at` (**en base, non projeté**) | **depuis quand** la carte attend | utile : « attend vos ordres » sans ancienneté ne crée aucune urgence. Le back s'en sert DÉJÀ — `priority` y est documenté « severity × age » (`db/schema/queues_exceptions_cuestack.ts:60`) — mais ne le projette pas (`exceptions.projection.service.ts:278-318`). C'est une **forme F** : colonne lue (`select()` nu, `exceptions.repository.ts:235-241`), jamais servie | ★★ |
| **Q5** | `queue[0].priority_band` + `confidence_band` + `suggested_action` (`session/open`) | ce que le système **pense** de cette carte (urgence, confiance, geste conseillé) | à trancher : ④ sert les trois (mesuré : `priority_band:"watching"`, `confidence_band:"confident"`, `suggested_action` = « Acknowledge the lab status ») et n'en montre aucun ; ils vivent en ⑩, à un toucher. Un seul d'entre eux sur la ligne (l'urgence) suffirait à hiérarchiser | ★★ |

### Les autres questions, groupées (60 lignes)

*(66 lignes `Q` au total ; les cinq questions ci-dessus en couvrent 6 — Q1 porte sur #18 et #19, Q5 sur #22,
#23 et #24, Q3 sur #36 ; Q2 porte sur le CARDINAL de #3, qui est une ligne ✔, et Q4 sur une colonne B⁻ qui
n'est dans aucune des 103 lignes. Reste 60.)*

- **`session/open`, 9 clés servies qu'AUCUN site du client ne lit** (balayage sur tout `Assets/Scripts`, motif
  `\.<clé>\b`, contrôle positif `.day_phase` → 6 sites) : `queue_pressure_band` **0**, `flag_review` **0**,
  `settling_glance` **0**, `friction_glance` **0**, `compression_glance` **0**, `onboarding` **0**,
  `opened_game_minute` **0** (déclaré et délibérément jamais affiché, `SessionDtos.cs:114-118`),
  `session_id` (1 site, garde de non-vacuité), `structural_budget` (publié par `JetonDeStructure`, invisible
  sur ④ joueur neuf). *Note* : `friction_glance`/`compression_glance` AVAIENT un consommateur —
  `OrgVitalsPanelController.cs:80-81` — qui n'est plus monté sur l'Accueil depuis le 26/09.
- **La carte de file, 6 clés de plus non montrées sur ④** : `building` (null ici), `candidate_actions`,
  `resolution_status`, `lieutenant_id`, et les deux de Q5.
- **`/v1/me`, 5 clés sur 7 non montrées** : `account_id`, `email`, `lifecycle_state`, `player_id`,
  `meta_market_visibility_enabled`. `handle` est **consommé et rendu INVISIBLE** (alpha 0,
  `TopBarController.cs:979-983` : « le callsign n'existe pas dans `.barre` de la maquette »). Idem
  `backlog_badge` → `notificationText` à alpha 0 (`TopBarController.cs:1720-1727`).
- **La chaleur, 5 clés sur 8 non montrées** : `district_bucket`, `escalated`, et les 3 de `buildings[]`.
  `escalated` est délibérément hors ④ — `AppShell.cs:1084` : « Jamais la descente ici : l'`escalated` de la
  sonde est celui d'un district que le joueur ne regarde pas » ; il n'est posé qu'EN district
  (`AppShell.cs:435-436`).
- **La progression, 3 clés sur 4** : `progress_to_next` (`"LOCKED"` mesuré), `next_tier`, `tier_label_i18n`.
  Seule `vocabulary_tier` est lue, en LOGIQUE (`LaSuite.cs:66` — le bloc n'existe qu'au palier 1).
- **Les précurseurs, 4 clés sur 9** : `stock_liters_label` (`"0 L"`), `price_trend_bucket` (`"UP"`),
  `scarcity_active`, `supplier_pressure_bucket` (`"FRESH"`). ④ dit « Commander » sans dire que le prix monte.
- **Les lieutenants, 4 clés sur 6** : `name`, `archetype`, `op_state_band`, `tenure_bucket`. La ligne D
  (« Vos lieutenants attendent une consigne ») ne nomme personne alors que `name` est servi.
- **La planque, 7 clés sur 10** : `district_blocking_band`, `any_high_blocking_alert`, `safehouse_id`,
  `building_id`, `slot_count`, `blocking_band`, `high_blocking_alert`. ④ dit « De l'argent attend » sans dire
  si la planque bloque.
- **Les dealers, 8 clés sur 12** (corps DATÉ, voir §7) : `dealer`, `dealer_spot_id`, `substance`,
  `margin_band`, `addiction_loyalty_status`, `district_name`, `lek_band`, `lane_band`.
- **Les bâtiments, 5 clés sur 9** : `block_id`, `district_name`, `purchased_type`, `convertible_types`,
  `name_i18n`, `lieutenant_ids`.

### Deux lignes de LA SUITE sont écrites, servies, et jamais rendues

Mesuré dans le bundle fr : `accueil.suite.recruter`, `accueil.suite.un_lieutenant_du_blanchiment`,
`accueil.suite.un_lieutenant_de_la_distribution`, `accueil.suite.il_ramasse_la_caisse_a_votre_place_une_decision_de_structure`,
`accueil.suite.il_fait_passer_l_argent_par_la_filiere_a_votre_place_une_decision_de_structure` — **5 clés
SERVIES** pour les lignes F et G de la table 76. Le client les documente comme différées :
`LaSuite.cs:76-77` — « F (recruter BLANCHIMENT) et G (recruter DISTRIBUTION) … ATTENDENT le lot back B7
(éligibilité au recrutement par rôle, forme F le 26/09) : rien n'est simulé ici ». Ce n'est pas un défaut de
cet écran ; c'est un différé **honnêtement documenté**, et il porte son mode d'emploi (le lot back qui le
ferme est nommé). Je le salue plutôt que de le compter.

---

## 4. Lots back suggérés (B⁻ dessiné, forme F)

**Compte : 0 au sens strict.** La maquette cadre 4 ne dessine AUCUNE information qui exigerait une colonne non
projetée : tout ce qu'elle montre a une clé servie. Je ne fabrique pas de lot pour remplir la case.

Les colonnes B⁻ ci-dessous sont des **candidates** (en base, atteignant le compositeur, jamais servies), à
ouvrir seulement si l'user répond « oui » à une question du §3. Mesurées, et j'ai re-lu moi-même les deux
tables les plus porteuses :

| # | colonne | table | pourquoi c'est une forme F | question liée |
|---|---|---|---|---|
| 1 | `emitted_at` | `exception_queue` (`db/schema/queues_exceptions_cuestack.ts:62`, **vérifié à la source**) | lue par un `select()` nu (`exceptions.repository.ts:235-241`), jetée par `projectCard` (`exceptions.projection.service.ts:278-318`) | Q4 |
| 2 | `resolution`, `resolved_at` | idem (`:63`, `:64`) | mêmes lecture et omission | — |
| 3 | `slot_capacity_cents`, `arrival_rate`, `raid_drain_policy` | `safehouses` (`db/schema/pipeline_and_laundering.ts:96`, `:98`, `:99`, **vérifié à la source**) | les trois sont SÉLECTIONNÉES par le repo (`erlang-stash.repository.ts:151,153,154`) et omises par la projection (`erlang-stash.projection.service.ts:126-145`) | planque |
| 4 | `coverage_lek_tile_id` | `dealer` (`db/schema/operational_chain.ts:229`) | sélectionnée (`selling.repository.ts:540`), portée jusqu'au mapper, jamais projetée | vente |
| 5 | 15 colonnes de `lieutenant` | `db/schema/lieutenant.ts:79` | ni sur le roster ni sur le détail `GET /v1/lieutenants/:id` | famille |

**Provenance de ce tableau, et ce qu'elle vaut.** Le balayage B⁻ sur les 5 tables du domaine a été fait par
un agent de mesure que j'ai mandaté, avec ses ancres. **J'ai re-lu moi-même, à la source, les deux lignes qui
portent une conclusion** : `db/schema/pipeline_and_laundering.ts:85-105` (les 8 colonnes de `safehouses`,
dont les 3 citées) et `db/schema/queues_exceptions_cuestack.ts:45-70` (les 14 colonnes d'`exception_queue`,
dont `emitted_at:62`, `resolved_at:63`, `resolution:64`, et le commentaire de `priority:60` « severity × age »
qui fonde Q4) — **les deux correspondent à l'octet près**. Les lignes **4** et **5** (dealer, lieutenant), je
ne les ai **pas** re-ouvertes : elles restent **DÉDUITES** d'un rapport d'agent, et aucune décision de ce
rapport n'en dépend.

⚠️ Plusieurs de ces colonnes sont des **scalaires de simulation** (`arrival_rate`, `current_fill`,
`confidence`, `priority`, `severity`, `float_cents`) : R2.2 interdit de les projeter telles quelles. La forme
F légitime serait une **bande** ou un **libellé** de plus, jamais la colonne.

---

## 5. Les chaînes de ④ sont toutes SERVIES (contrôle i18n)

`GET /v1/i18n/bundle?locale=fr` → `locale: "fr"`, **1998 entrées** (sans `?locale`, le back rend **`en`** —
le client passe toujours `?locale=`, `I18nClient.cs:33`). Les **16** clés que ④ consomme (10 + 1 + 2 + 1 + 2,
somme vérifiée), une à une :

- `accueil.suite.la_suite` · `…le_labo_attend_du_precurseur` · `…sans_lui_rien_ne_cuit` · `…commander` ·
  `…personne_ne_vend_encore` · `…un_dealer_sur_un_coin_de_vente_et_la_marchandise_part` · `…voir_la_vente` ·
  `…de_l_argent_attend_dans_la_planque` · `…blanchissez_le_il_ne_rapporte_rien_tant_qu_il_dort` · `…blanchir`
  → **10/10 SERVIES**, texte identique au mot près à ce que montre la planche ;
- `building.precursor.pyralin` = « Pyralin » → **SERVIE**. ⚠️ La clé est construite par
  `Libelle.ParValeur` (`I18n/Libelle.cs:91-103`) qui **slugifie** la valeur servie `PYRALIN` ;
  `building.precursor.PYRALIN` (non slugifié) est ABSENTE. Le repli du client vaut « Pyralin » lui aussi,
  donc une erreur de slug serait **invisible à l'œil** — ici le slug marche, mesuré ;
- `chrome.bandeau.attend_vos_ordres` = « {nom} attend vos ordres » · `chrome.bandeau.trancher` = « trancher »
  → **SERVIES** ;
- `exceptions.gravite.mild` = « légère » → **SERVIE** (le `.g-mild` de la maquette, L.791) ;
- `heat.bucket.cold` = « Froid », `chrome.phase.aube` = « Aube » → **SERVIES**.

---

## 6. Actions : routes ↔ CTA

**ZÉRO `@Post` n'est appelé depuis ④.** Les cinq gestes de l'écran NAVIGUENT, ils n'agissent pas — vérifié au
code, pas déduit :

| CTA (M · F) | ce qu'il fait | ancre |
|---|---|---|
| **COMMANDER** (M11) | monte ㉚ `ChaineDApproScreenController` | `LaSuitePanelController.cs:399-400` |
| **VOIR LA VENTE** (M14) | monte ㉟ `SellingScreenController` | `:403-405` |
| **BLANCHIR** (M17) | monte ㊵ `FiliereScreenController` | `:408-409` |
| **TRANCHER** (M20) | monte ⑩ `ExceptionDetailController`, initialisé avec la carte | `ExceptionQueuePanelController.cs:372-381` |
| la ligne elle-même (surface sous TRANCHER) | `ViewAll()` → re-GET `/v1/exceptions/queue` **puis** monte ⑨ | `:137-151` ; la surface est posée par `PoserEnLigneDeLAccueil`, `:93-101` |

C'est délibéré et écrit : « le geste de la ligne est “trancher” : il OUVRE la carte (⑩), où le joueur
choisit » (`ExceptionQueuePanelController.cs:240-243`). **Aucun CTA sans route, aucune route du domaine sans
CTA** : les `@Post` du domaine (`exceptions/:id/resolve`, `operational/precursors/order`,
`operational/dealer/:id/collect`, `operational/laundering/inject`) sont tous à **un** écran de distance, et
chacun de ces écrans est atteint par un CTA de ④.

⚠️ Une **asymétrie mesurée** entre les deux surfaces de file : `GET /v1/exceptions/queue` sert deux clés que
`session/open.queue` ne sert pas (`script_complexity_band`, délibérément non calculée —
`session-open-sequence.service.ts:499-500` ; et le tag interne `source` des actions, retiré par
`stripInternalSourceTag`, `:524-532`). ④ est nourri par `session/open` ; ⑨, ouvert par la même ligne, par
l'autre route. Les deux surfaces **ne portent pas le même ensemble de clés**. Sans conséquence sur ④ (il
n'affiche ni l'une ni l'autre), à savoir pour ⑨.

---

## 7. Table de couverture complète

Légende : **●** présent · **–** absent · **◐** consommé en LOGIQUE sans être montré.
Statuts : **✔** affichée comme dessinée · **LOG** consommée, non montrée (légitime : elle décide) ·
**Q** « passé à côté ? » · **D** défaut.

### B1 · `POST /v1/session/open` — 14 clés + 12 clés de carte (mesuré : `mesures/POST_session_open.json`)

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 1 | `session_id` | ● | – | ◐ | LOG (garde de non-vacuité, `SessionClient.cs:51`) |
| 2 | `hl_card` (`null` ici) | ● | – | ◐ | LOG — décide la mise en page (`AppShell.cs:1698`) ; le cadre 4 EST l'état sans carte |
| 3 | `queue` | ● | ● M18-M20 | ● | ✔ (son **cardinal** n'est pas montré → **Q2**) |
| 4 | `backlog_badge` | ● | – | ◐ | **Q** — rendu à alpha 0 (`TopBarController.cs:1725`) |
| 5 | `queue_pressure_band` | ● | – | – | **Q** — 0 site dans tout `Assets/Scripts` |
| 6 | `structural_budget` | ● | – | ◐ | LOG (`AppShell.cs:666-667`) ; invisible sur ④ sans carte de tête |
| 7 | `flag_review` | ● | – | – | **Q** — 0 site |
| 8 | `settling_glance` | ● | – | – | **Q** — 0 site |
| 9 | `friction_glance` | ● | – | – | **Q** — porteur non monté sur ④ |
| 10 | `compression_glance` | ● | – | – | **Q** — idem |
| 11 | `onboarding` | ● | – | – | **Q** — 0 site |
| 12 | `opened_game_day` | ● | ● M06 « JOUR 12 » | ● « JOUR 1 » | ✔ |
| 13 | `opened_game_minute` | ● | – | – | **Q** (différé documenté, `SessionDtos.cs:114-118`) |
| 14 | `day_phase` | ● | ● M07 « Plein jour » | ● « Aube » | ✔ |
| 15 | carte · `exception_id` | ● | – | ◐ | LOG (nom d'objet + cible du geste) |
| 16 | carte · `lieutenant_id` | ● | – | ◐ | LOG (`ParleUnLieutenant`) |
| 17 | carte · `lieutenant{id,name}` | ● | ● M18 | ● « Lt. Wend… » | ✔ |
| 18 | carte · `event_descriptor` | ● | – | – | **Q1** |
| 19 | carte · `event_descriptor_i18n` | ● | – | – | **Q1** |
| 20 | carte · `building` (`null`) | ● | – | – | **Q** |
| 21 | carte · `candidate_actions` | ● | – | – | **Q** (visible en ⑩) |
| 22 | carte · `suggested_action` | ● | – | – | **Q5** |
| 23 | carte · `confidence_band` | ● | – | – | **Q5** |
| 24 | carte · `priority_band` | ● | – | – | **Q5** |
| 25 | carte · `severity_band` | ● | ● M19 « légère » | ● « LÉGÈRE » | ✔ |
| 26 | carte · `resolution_status` | ● | – | – | **Q** |

### B2 · `GET /v1/me` — 7 clés

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 27 | `account_id` | ● | – | – | **Q** (plomberie) |
| 28 | `handle` | ● | – | ◐ | **Q** — alpha 0 (`TopBarController.cs:982`) |
| 29 | `email` (`null`) | ● | – | – | **Q** (plomberie) |
| 30 | `lifecycle_state` | ● | – | – | **Q** |
| 31 | `locale` | ● | – | ◐ | LOG — format du montant (`TopBarController.cs:600-602`) |
| 32 | `player_id` | ● | – | – | **Q** (plomberie) |
| 33 | `meta_market_visibility_enabled` | ● | – | – | **Q** (réglage, pas ④) |

### B3 · `GET /v1/economy/wallet` — 3 clés

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 34 | `player_id` | ● | – | – | **Q** (doublon de #32) |
| 35 | `cash_cents` | ● | ● M02 « 24 850 € » | ● « 10 000 € » | ✔ |
| 36 | `wallet_band` (`MODERATE`) | ● | – | – | **Q3** |

### B4 · `GET /v1/city/district/16/heat` — 5 clés + 3 par bâtiment

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 37 | `district` | ● | – | – | **Q** (écho) |
| 38 | `district_bucket` | ● | – | – | **Q** |
| 39 | `citywide_bucket` | ● | ● M03 aiguille + M04 « Tiède » | ● aiguille + « Froid » | ✔ |
| 40 | `escalated` | ● | – | – | **Q** (délibéré, `AppShell.cs:1084`) |
| 41 | `buildings` | ● | – | – | **Q** |
| 42 | `buildings[].building` | ● | – | – | **Q** |
| 43 | `buildings[].heat_bucket` | ● | – | – | **Q** |
| 44 | `buildings[].name_i18n` | ● | – | – | **Q** |

### B5 · `GET /v1/autonomy-reports` — 1 clé

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 45 | `reports` (cardinal) | ● (`[]`) | ● M22 `.disc` | ● (éteinte) | ✔ (voir §2) |

### B6 · `GET /v1/progression` — 4 clés

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 46 | `vocabulary_tier` (`1`) | ● | – | ◐ | LOG — le bloc n'existe qu'au palier 1 (`LaSuite.cs:66`) |
| 47 | `progress_to_next` (`LOCKED`) | ● | – | – | **Q** |
| 48 | `next_tier` (`2`) | ● | – | – | **Q** |
| 49 | `tier_label_i18n` | ● | – | – | **Q** |

### B7 · `GET /v1/me/buildings` — 1 + 9 clés

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 50 | `buildings` | ● | – | ◐ | LOG |
| 51 | `building` | ● | – | ◐ | LOG — `laboId` (`LaSuite.cs:262-266`) |
| 52 | `block_id` | ● | – | – | **Q** |
| 53 | `district_id` | ● | – | ◐ | LOG — quels quartiers interroger (`LaSuite.cs:280`) |
| 54 | `district_name` | ● | – | – | **Q** |
| 55 | `operational_type` | ● | – | ◐ | LOG — `EstUnLabo` (`LaSuite.cs:227`) |
| 56 | `purchased_type` | ● | – | – | **Q** |
| 57 | `convertible_types` | ● | – | – | **Q** |
| 58 | `name_i18n` | ● | – | – | **Q** |
| 59 | `lieutenant_ids` | ● | – | – | **Q** |

### B8 · `GET /v1/operational/lab/:id` — 3 clés

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 60 | `building` | ● | – | ◐ | LOG (écho) |
| 61 | `substance_type` (`BRINDLE`) | ● | – | – | **Q** |
| 62 | `cook_stage_band` (`IDLE`) | ● | – | ◐ | LOG — décide la ligne A (`LaSuite.cs:93`) |

### B9 · `GET /v1/operational/precursors` — 9 clés

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 63 | `building` | ● | – | ◐ | LOG |
| 64 | `precursor_type` (`PYRALIN`) | ● | ● M09 « Pyralin » | ● « Pyralin » | ✔ |
| 65 | `stock_band` (`NONE`) | ● | – | ◐ | LOG (`LaSuite.cs:94`) |
| 66 | `has_pending_order` | ● | – | ◐ | LOG (`:105`) |
| 67 | `has_arrived_order` | ● | – | ◐ | LOG (`:105`) |
| 68 | `stock_liters_label` (`"0 L"`) | ● | – | – | **Q** |
| 69 | `price_trend_bucket` (`UP`) | ● | – | – | **Q** |
| 70 | `scarcity_active` | ● | – | – | **Q** |
| 71 | `supplier_pressure_bucket` (`FRESH`) | ● | – | – | **Q** |

### B10 · `GET /v1/operational/dealers` — 1 + 12 clés ⚠️ corps d'item DATÉ (voir §8)

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 72 | `dealers` (`[]` mesuré) | ● | – | ◐ | LOG (`LaSuite.cs:147`) |
| 73 | `dealer` | ● | – | – | **Q** |
| 74 | `dealer_spot_id` | ● | – | – | **Q** |
| 75 | `name_i18n.params.prenom` | ● | – | ● (ligne C) | ✔ — état non atteint sur compte neuf |
| 76 | `activity_band` | ● | – | ◐ | LOG (`LaSuite.cs:162`) |
| 77 | `cash_band` | ● | – | ◐ | LOG (`:150`) |
| 78 | `substance` | ● | – | – | **Q** |
| 79 | `margin_band` | ● | – | – | **Q** |
| 80 | `addiction_loyalty_status` | ● | – | – | **Q** |
| 81 | `withdrawn` | ● | – | ◐ | LOG (`:150`) |
| 82 | `district_name` | ● | – | – | **Q** |
| 83 | `lek_band` | ● | – | – | **Q** |
| 84 | `lane_band` | ● | – | – | **Q** |

### B11 · `GET /v1/lieutenants` — 1 + 6 clés

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 85 | `lieutenants` | ● | – | ◐ | LOG |
| 86 | `lieutenant_id` | ● | – | – | **Q** |
| 87 | `name` (`Lt. Skeld`) | ● | – | – | **Q** — la ligne D ne nomme personne |
| 88 | `archetype` (`COOK`) | ● | – | – | **Q** |
| 89 | `op_state_band` (`IDLE`) | ● | – | – | **Q** |
| 90 | `rule_count_band` (`NONE`) | ● | – | ◐ | LOG — décide la ligne D (`LaSuite.cs:215`) |
| 91 | `tenure_bucket` (`FRESH`) | ● | – | – | **Q** |

### B12 · `GET /v1/city/district/16/stash` — 4 + 6 clés

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 92 | `district` | ● | – | – | **Q** (écho) |
| 93 | `district_blocking_band` (`LOW`) | ● | – | – | **Q** |
| 94 | `any_high_blocking_alert` | ● | – | – | **Q** |
| 95 | `safehouses` | ● | – | ◐ | LOG |
| 96 | `safehouse_id` | ● | – | – | **Q** |
| 97 | `building_id` | ● | – | – | **Q** |
| 98 | `slot_count` (`4`) | ● | – | – | **Q** |
| 99 | `load_bucket` (`NOMINAL`) | ● | ● M15 | ● « De l'argent attend… » | ✔ |
| 100 | `blocking_band` (`LOW`) | ● | – | – | **Q** |
| 101 | `high_blocking_alert` | ● | – | – | **Q** |

### M non appariés (2) et F sans source (0)

| # | élément | B | M | F | statut |
|---|---|---|---|---|---|
| 102 | le quartier peint + sa phase (profil `verge`, mode `nuit`, tous deux en dur) | – | ● M25 | ● | **D1** (§1) |
| 103 | l'onglet actif (`.pt` sous EMPIRE) | – | ● M21 | ● | ✔ — état de NAVIGATION du client, pas une donnée back ; nommé plutôt qu'omis |

### Contrôle d'arithmétique

```
|clés B|                         = 101   (89 mesurées sur compte neuf + 12 clés d'item dealer, corps daté)
|éléments M non appariés|        =   2   (#102, #103)
|rendus F sans source|           =   0
                           somme = 103   =  nombre de lignes de la table (#1 … #103)   ✅
```

Répartition des 103 lignes, **recomptée par un oracle Python indépendant** sur le texte de la table (et pas
à la main : j'avais écrit une première répartition fausse, qui se contredisait elle-même) —
`python3` sur la section §7, extraction `^\|\s*\d+\s*\|`, classement sur la DERNIÈRE colonne :

```
lignes numérotées trouvées : 103      min 1   max 103   distincts 103   manquants: []
✔ = 12 · LOG = 24 · Q = 66 · D = 1                                      somme = 103  ✅
```

Les deux lignes marquées `◐` **et** `Q` (#4 `backlog_badge`, #28 `handle` — consommées puis rendues à
alpha 0) sont comptées dans **Q**, jamais deux fois. Des 12 ✔, **#103 n'est pas une clé back** (l'onglet
actif est un état de navigation du client) : **11 clés servies sont montrées**, et **#75** (le prénom du
dealer de la ligne C) l'est dans un état qu'un compte neuf n'atteint pas ⇒ **10 observées sur la planche**.

Inventaire M, pour mémoire : **20 éléments porteurs de données** (M02, M03, M04, M06, M07, M09-M20, M21,
M22, M25) + **7 libellés de chrome fixes** (M01 « ARGENT », M05 « CHALEUR », M08 « La suite », les 4 noms
d'onglets) + **2 volutes** sans information. 18 des 20 éléments de données sont appariés à une clé B ;
les 2 restants sont #102 et #103.

---

## 8. Ce que je n'ai PAS pu vérifier

1. **`GET /v1/operational/dealers` rend `{"dealers": []}` sur compte neuf.** L'ensemble de clés d'un dealer
   (12) vient d'un corps réel **DATÉ** : `Tools/juge-donnees/vente/forme-G-2026-09-22/GET_operational_dealers.json`,
   pris le **2026-09-22** sur le back **03cf564c** (bâti 2026-09-14) — **antérieur** au back que je mesure.
   Je ne l'ai pas re-mesuré ; la mesure qui trancherait est de placer un dealer par le chemin joueur (㉟) puis
   de refaire le GET. Conséquence : les lignes #73-#84 sont **DÉDUITES de ce corps daté**, pas comptées ici.
2. **Quatre des sept états de LA SUITE ne sont pas reproductibles sur un compte neuf** : A2 (« Le {precurseur}
   est en route »), A3 (« Le {precurseur} est là »), C (« La caisse de {prenom} se remplit »), E-pleine (« La
   planque est pleine »), et D (« Vos lieutenants attendent une consigne », vraie mais écartée par le plafond
   de 3 lignes — `LaSuite.cs:80`). Je les ai vérifiées **au code**, jamais à l'écran.
3. **La pastille FAMILLE allumée** : 0 rapport servi ⇒ non observée en jeu (§2). Seul le câblage est mesuré.
4. **Le bandeau éphémère de ④** : non déclenché sur compte neuf (chaleur `COLD`, carte déjà sur la ligne —
   `AppShell.cs:598` la retire —, 0 rapport). Dans d'autres états il PARLE sur ④ (« La ville brûle », une
   descente, un rapport) et **la maquette cadre 4 n'en dessine aucun** : ce serait un « affiché sans être
   dessiné » à faire ratifier. **Non vérifiable ici** ; la mesure qui trancherait est de porter la chaleur de
   la ville à `HOT` et de recapturer.
5. **`GET /v1/me/clock` → 404 sur le back servi.** La boucle d'horloge légère
   (`AppShell.cs:709-721`, `HorlogeLegere.cs:108`) ne lit donc jamais rien et espace ses réessais à 10 min
   (`HorlogeLegereIndisponible`). Conséquence sur ④ — le jour de jeu affiché (« JOUR 1 ») ne peut pas
   changer en cours de session, et le basculement de jour par l'horloge ne se déclenche jamais — **non
   mesurée** : il faudrait faire avancer l'horloge du monde, ce que je refuse de faire sur une pile partagée.
6. **« N'importe quel district rend le même `citywide_bucket` »** (l'hypothèse qui justifie la sonde câblée en
   dur sur le district 16, `DashboardController.cs:63-64`) : mesuré **identique sur 4 districts** (1, 5, 16,
   18 → tous `COLD`). ⚠️ **Ce contrôle NE DISCRIMINE PAS** : sur un compte neuf toutes les valeurs valent
   `COLD`, donc l'égalité est vraie pour une raison sans rapport avec ce que je teste. L'hypothèse reste
   **non réfutée et non confirmée**.
7. **L'état « avec carte de tête » (`hl_card` non null, cadres 1 et 2 de la maquette)** : la mise en page de ④
   change entièrement — LA SUITE disparaît (`LaSuite.cs:66`), `HighestLeverageCardController` prend la bande
   de tête et `structural_budget` devient visible. **Hors de ma mesure** ; un juge données de ④ sur cet état
   reste dû.
8. **`RosterRow.precursor_stock_band` est DÉCLARÉ côté client** (`LieutenantDtos.cs:191`) et **absent des 6
   clés servies** par `GET /v1/lieutenants` (mesuré). Il vaudra donc toujours `null`. Hors du chemin de ④ (④
   ne l'affiche pas) ; signalé parce que c'est l'inverse exact de la forme G et que personne ne le voit.
9. **`GET /v1/i18n/bundle` sans `?locale` rend `en`.** Le client passe toujours le paramètre
   (`I18nClient.cs:33`), donc ④ n'est pas touché — mais le défaut de repli existe côté back et aucune garde
   de ④ ne le verrait.
10. **Je n'ai pas exercé les 5 CTA en jeu.** Leurs cibles sont vérifiées au code (§6), pas à l'écran.

---

## Annexes

- `mesures/` — les 22 corps réels + `compte.txt` (le callsign du compte neuf ; les jetons ont été **retirés**
  du fichier d'inscription avant copie).
- `commandes.sh` — les commandes exactes, rejouables.
- Inventaire M : maquette `ecrans-brennar-accueil.html` @ **d84c6eb**, lignes **789-791** (le 5ᵉ `div.cadre`),
  CSS `.acc4 .suite4 *`, `.acc4 .suivant *`, `.dock9 .disc`, `.dock9 .pt`.
- Inventaire F : `Shell/LaSuite.cs`, `Shell/LaSuitePanelController.cs`, `Shell/ExceptionQueuePanelController.cs`,
  `Shell/TopBarController.cs`, `Shell/AppShell.cs` (§`MonterPanneauxAccueil` `:1688-1735`),
  `Operational/Dashboard/DashboardController.cs` (la feuille propre de ce contrôleur est **ÉTEINTE** sur ④ —
  `MasquerLaFeuille`, `:103-108`, appelée par `AppShell.cs:508` : tout ce qu'elle rendait — bande de
  portefeuille, lignes chaleur/descente/palier, alertes, « ALLER À » — est hors écran, et c'est la raison
  pour laquelle `wallet_band`, `escalated` et `progress_to_next` n'apparaissent nulle part).
