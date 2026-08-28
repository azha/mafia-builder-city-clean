# Juge données ⊥ — Le compte (tutoriel screen_c8 · profil screen_c1 · réglages screen_14) — mode maquette — 2026-08-25

## En une phrase

Les trois cadres canon montrent **13 des 19 clés** que les 8 routes du domaine servent réellement,
et j'ai mesuré **9 écarts à consigner** (dont deux qui contredisent l'annexe de la maquette : le
texte de la bulle n'a **aucune** clé i18n derrière lui, et `lifecycle_state` est une **constante**)
plus **7 questions « passé à côté ? »** — la première étant une route de réglage joueur qui existe,
`PUT /v1/me/meta-market/visibility`, que la maquette ne dessine nulle part.

---

## Écarts à consigner (mode maquette)

Classés par ce qu'un joueur ou un implémenteur subirait. `B` = le back sert · `M` = la maquette
montre · `B⁻` = en base, non projeté.

| # | information | B | M | statut | preuve (mesure / `fichier:ligne`) |
|---|---|---|---|---|---|
| **E1** | **le texte de la bulle de tutoriel** | – | ● | **dessiné sans source — et l'annexe se trompe sur la source** | L'annexe dit « *Le texte de la bulle est une clé i18n rendue ici en français* ». Mesuré : `GET /v1/i18n/bundle` rend **67 clés**, dont **63 `error.*` et 4 `game.*`** (`game.lieutenant.assignment.summary`, `game.lieutenant.recap.actions_taken`, `game.ui_common.confirm_button`, `game.ui_common.cancel_button`) — `mesures/13-i18n-fr.json`. **`grep -rin 'tutorial' services/game-back/src/i18n/` → 0** ; contrôle positif sur le même répertoire : `grep -rin 'lieutenant'` → **8**. La route ne rend qu'un **identifiant** (`tutorial.exception_card.onboarding_preseed`) ; **le texte n'existe ni en base, ni dans le registre i18n, ni nulle part dans le back.** ⇒ soit un lot back (clés i18n), soit un ASSUMÉ « le client embarque les textes », mais pas « une clé i18n ». |
| **E2** | **`lifecycle_state` — « compte actif »** | ● | ● | **affiché, mais la valeur est une CONSTANTE** | `auth.service.ts:333` : `.values({ kind: 'PLAYER', lifecycle_state: 'ACTIVE' })` — **le seul écrivain de production**. Balayage **exhaustif** : `grep -rn 'lifecycle_state' --include='*.ts' services/game-back/src` → **88** hits ; hors `db/schema/`, hors `*-test.controller.ts`, hors `.spec.` → **7**, et les voici tous : 1 commentaire (`protocol/error-codes.ts:189`), 1 déclaration de type (`auth.service.ts:158`), **1 INSERT** (`:333`), **4 lectures** (`:512`, `:530`, `:542`, `:585`). **Zéro `UPDATE`.** Les 81 hits restants sont des contrôleurs `_test` qui insèrent `'ACTIVE'` et le schéma. Le `JwtAuthGuard` ne lit pas cette colonne — il vérifie l'état de la **session** (`jwt-auth.guard.ts:189` : `if (state !== null && state !== 'ACTIVE')`). ⇒ la ligne « compte **actif** » est vraie pour **100 % des joueurs, pour toujours** ; elle occupe deux emplacements (profil + réglages) et ne porte **aucune information**. L'enum en porte 9, dont **6 côté joueur** (`account.ts:75-85` : `PENDING_VERIFICATION, ACTIVE, DORMANT, SUSPENDED, BANNED, DELETED_TOMBSTONE`) — 5 ne sont **jamais** atteignables. |
| **E3** | **`progress_to_next` — la 3ᵉ valeur n'est pas dessinée** | ● | ● (2/3) | **valeur possible sans rendu** | Le type est `'LOCKED' \| 'IN_PROGRESS' \| 'UNLOCKED'` (`progression.projection.service.ts:7`) et les trois branches sont **atteignables** (`:26-32` : `tier ≥ 2 → UNLOCKED` ; sinon `taught_signals.length > 0 \|\| handled > 0 → IN_PROGRESS` ; sinon `LOCKED`). L'annexe n'en déclare que **deux** (« *verrouillé · déverrouillé* ») et le cadre ne dessine que « Prochain · **verrouillé** ». ⇒ **`IN_PROGRESS` n'a pas de libellé** ; le front l'inventera au premier joueur qui résout une exception. |
| **E4** | **`email` non nul — le cas n'est pas dessiné** | ● | ● (cas `null` seul) | **la moitié du domaine n'a pas de rendu** | Mesuré sur un compte créé **avec** adresse : `GET /v1/me` rend `"email": "jd-loc-1787686296@example.test"` — **en clair** (`mesures/15-me-locale-zz.json`, projection `auth.service.ts:514,529`). Le cadre canon ne dessine que `null` (« absente »), et le masquage `r•••@•••.fr` est **relégué au cadre L2**. ⇒ aujourd'hui, un joueur qui a donné son adresse voit un écran que la maquette ne spécifie pas. Le masquage n'est pas un « lot back » : le back **peut** déjà rendre l'adresse, c'est le rendu qui manque. |
| **E5** | **`locale` — « Français » n'est pas le défaut, et l'ensemble n'est pas clos** | ● | ● | **la valeur dessinée n'est pas celle d'un compte frais ; aucune contrainte côté back** | (a) `auth.service.ts:328` : `const locale = params.locale ?? 'en'` — **le défaut est `en`**. Compte frais sans `locale` au signup ⇒ `"locale": "en"` (`mesures/02-pre-me.json`). La maquette dessine « Français » aux trois endroits ; c'est donc conditionné à ce que **le client envoie `locale` au signup** — une exigence qui n'est écrite nulle part. (b) Le signup ne valide `locale` **que sur la longueur** (`auth.controller.ts:262-264` : `localeRaw.length > 8`) : mesuré, `"locale":"zz-ZZ"` est **accepté** et `/v1/me` le rend tel quel (`mesures/15-me-locale-zz.json`). Le back ne connaît que `en` et `fr` (`i18n/string_table.ts:33` : `SUPPORTED_LOCALES = ['en','fr']`), mais **il ne les impose pas sur `player.locale`**. ⇒ le front peut recevoir une valeur qu'il ne sait pas afficher. |
| **E6** | **`tutorials_opt_out` — l'interrupteur est INVERSÉ par rapport à la clé** | ● | ● | **correct, mais tacite** | La clé est un **opt-OUT** (`tutorials_opt_out: false` sur compte frais, `mesures/02-pre-ui_tutorial-state.json`) ; la maquette dessine un interrupteur « Bulles de tutoriel » en position **ON** (`class="tog on"`). L'appariement est juste, mais **rien n'écrit l'inversion** : c'est exactement le genre de correspondance que le socle demande de porter par un résolveur nommé plutôt que par une convention de position. |
| **E7** | **l'ANCRE de la bulle** | – | ● | **dessiné sans source** | La bulle porte une flèche (`.tuto::before { left: 34px }`) qui la rattache visuellement à la carte d'exception. La route ne rend **qu'un identifiant** — `eligible_tutorial_ids: ["tutorial.exception_card.onboarding_preseed"]`, un tableau de chaînes nues (`mesures/02-pre-ui_tutorial-state.json`) — **aucun champ d'ancrage, aucune cible, aucun ordre**. La cible n'est lisible que par **convention de nommage** dans l'id (`…exception_card…`, `…city_map_heat…`). ⇒ ASSUMÉ à consigner : « le client déduit la cible du préfixe de l'id ». |
| **E8** | **`i18n/bundle` ne couvre aucun libellé de ces trois écrans** | ● | – | **la route existe et n'est utilisable par aucun de ces écrans** | Les 4 cadres canon portent **64 littéraux français** (hors étiquettes de cadre — comptés par extraction des nœuds texte). Le bundle sert **67 clés**, dont **4 seulement** hors `error.*`, et **aucune** ne correspond à un libellé de ces écrans (« Confirmer »/« Annuler » n'y figurent pas). Par ailleurs `?locale=fr` rend `locale: "fr"` mais **63 des 67 valeurs sont identiques à l'anglais** (mesuré : 4 clés diffèrent). ⇒ la convention « libellés en clés i18n partout » du lot 0 **n'a rien à consommer ici** ; c'est un lot back en soi. |
| **E9** | **`opened_game_day` — « Jour 26 » n'est pas servi par les routes du profil** | ● | ● | **source correcte, mais hors de la liste déclarée** | L'annexe déclare que « le profil réunit **quatre routes** » (`me`, `wallet`, `progression`, `iap/balance` + `entitlements`). Le « Jour 26 » du bandeau n'est dans **aucune** : le seul jour de jeu servi au joueur est `opened_game_day`, dans le corps de `POST /v1/session/open` (`mesures/03-session-open.json`, valeur mesurée **1**). Balayage : `grep -rnE 'game_day\|gameDay' --include='*.controller.ts'` hors `test`/`admin` → **1 hit, un commentaire**. ⇒ le profil dépend d'une valeur que le **shell** détient, pas d'un appel à lui ; à écrire, sinon l'écran sera monté avec un appel manquant. |

---

## « Passé à côté ? » — pour l'user

Les 6 clés servies que la maquette ne dessine pas, plus la route de réglage sans surface.
Classées par intérêt joueur décroissant. Je propose, vous tranchez.

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | **`PUT /v1/me/meta-market/visibility {enabled}`** (route d'action, pas une clé) | « je partage, ou non, mes prix avec le marché de région » — un **réglage de vie privée** que le joueur contrôle, et qui a une conséquence de jeu : à `false`, `GET /v1/me/meta-market/signal` rend `insufficient_signal` (`meta-market-read.service.ts:184`) | **Utile ici, et c'est le seul vrai réglage joueur du back qui manque à l'écran.** La colonne se déclare elle-même comme « *NOT a hidden scalar — this is a preference setting that the player controls* » (`db/schema/player.ts:52` (le commentaire ; la colonne est `:53`)). Il tient en une ligne `.reg` + `.tog` dans la section « Jeu ». ⚠️ **Mais il n'est pas affichable en l'état** : voir L1 ci-dessous — aucune route ne rend la valeur courante. | ★★★ |
| **Q2** | `next_tutorial_id` (`ui/tutorial-state`) | « la prochaine explication programmée » — le pointeur de la *disclosure schedule* (au plus une par session, au plus petit rang) | **Pas sur ces écrans, mais à ne pas confondre avec `eligible_tutorial_ids`.** Mesuré : sur compte frais **avec session ouverte**, il vaut **`null`** alors qu'`eligible_tutorial_ids` en contient un — parce que le seul id éligible est classé `NATIVE_08C` et non `SCHEDULE` (`disclosure-schedule-catalogue.ts` : `'tutorial.exception_card.onboarding_preseed': { kind: 'NATIVE_08C', … }` ; `disclosure-schedule.service.ts:73-84` rend `null` si le candidat n'est pas un slot). ⇒ **le cadre 36 a raison de piloter la bulle sur `eligible_tutorial_ids`** ; si quelqu'un « corrige » vers `next_tutorial_id`, la bulle ne s'affichera jamais. À écrire noir sur blanc. | ★★★ |
| **Q3** | `shown_tutorial_ids` (`ui/tutorial-state`) | « les explications déjà vues » | Pas ici — c'est le substrat de l'éligibilité, déjà consommé côté back (mesuré : après `PATCH ui/tutorial`, `eligible_tutorial_ids` passe de 1 à **0**, `mesures/06-state-after-shown.json`). Deviendrait intéressant le jour où on offre « revoir les explications » — une fonction que rien n'empêche (`PATCH ui/tutorial` est **idempotent**, et l'opt-out `false` **ne ré-arme pas** les ids déjà `shown`, mesuré `mesures/07-state-optout-false.json`). | ★★ |
| **Q4** | `messages` (`i18n/bundle`) | les gabarits ICU des libellés | Pas ici tant que E8 tient. Mais **la clé `locale` de cette même route** est la seule chose du back qui dise quelles langues existent (`en`, `fr`) — utile le jour où « Langue » devient modifiable. | ★★ |
| **Q5** | `player_id` (`economy/wallet`) | un identifiant opaque | Pas ici : plomberie. Il n'est même pas le même identifiant que `account_id` de `/v1/me` (mesuré : `01a03a66-0762-…` vs `01a03a66-075f-…`) — ⇒ **ne jamais les traiter comme interchangeables** côté client. | ★ |
| **Q6** | `account_id` (`me`) | un identifiant opaque | Pas ici : plomberie. Sauf si vous voulez un « code de compte » à donner au support — c'est le seul identifiant stable que le joueur possède. | ★ |
| **Q7** | `skus` (`iap/entitlements`) — le **contenu**, pas le cardinal | quels extras je possède | La maquette n'en tire que le **cardinal** (« 0 · extras »). Le corps rend la **liste** (`{"skus": []}`, `mesures/02-pre-me_iap_entitlements.json`). Lister les noms sur le profil éviterait un aller-retour vers la Boutique. | ★ |

---

## Lots back suggérés

### A. Réel et bloquant pour un réglage qui existe déjà

| # | colonne | table | dessiné ? | preuve |
|---|---|---|---|---|
| **L1** | `meta_market_visibility_enabled` | `player` | **non** (Q1) | **Forme F pure, et la pire variante : la valeur est ÉCRIVABLE par une route joueur et n'est LUE par aucune projection.** Écriture : `meta-market.controller.ts:112-127` (`PUT /v1/me/meta-market/visibility`, sous `JwtAuthGuard`) — mesuré 200, `{"visibilityEnabled": false}` (`mesures/12-put-visibility.json`). Lecture : `/v1/me` **ne la porte pas** (5 clés, inchangées après le PUT — `mesures/12-me-after-visibility.json`), et `GET /v1/me/meta-market/signal` rend un signal, jamais le drapeau (`meta-market.controller.ts:75-105`). ⇒ **un interrupteur qu'on peut basculer mais pas afficher.** Le lot est d'ajouter la clé à une projection joueur (le plus naturel : `/v1/me`). |

### B. Ce que les cadres « avec les lots back L1 → L4 » proposent — vérifié colonne par colonne

| # | ligne dessinée (cadre) | colonne / table | verdict mesuré |
|---|---|---|---|
| **L2** | « depuis le jour 1 » · chip « 26 jours » (profil L1) | `player.created_at` | **VALIDE.** `notNull().defaultNow()` (`db/schema/player.ts:36`) ⇒ toujours peuplée. Non projetée (1 seul hit hors schéma, un commentaire). Lot = ajouter la clé. |
| **L3** | *(cité par l'annexe comme substrat L1)* | `player.last_seen_at` | ⛔ **INVALIDE — chaîne morte forme A.** `grep -rn 'last_seen_at' --include='*.ts' services/game-back/src` rend **2 hits au total**, tous deux dans `db/schema/player.ts` (`:37` la déclaration, `:63` l'index). **Zéro écrivain, zéro lecteur.** La projeter projetterait `null` pour toujours. Le lot n'est pas « ajouter la clé », c'est **écrire la colonne d'abord**. |
| **L4** | *(cité par l'annexe comme substrat L1)* | `player.tier` | ⚠️ **INVALIDE en l'état.** `grep -rn 'player\.tier'` → **3 hits au total**, **tous en lecture ou en commentaire** (`cohort-targeting.service.ts:54` commentaire, `:183` un `gte(player.tier, …)`, `live-ops.types.ts:66` commentaire) — **aucun écrivain**. Confirmé par l'autre bout : les **4** `.update(player)` du dépôt (`region.service.ts:85,111`, `meta-market.controller.ts:123`, `meta-market-test.controller.ts:1234`) n'en touchent aucun. Vaut donc `1` pour tout le monde (défaut `.notNull().default(1)`, `db/schema/player.ts:54`). Même famille qu'E2. ⚠️ Et **ce n'est pas le « Palier 1 » dessiné** : celui-ci vient de `progression.vocabulary_tier` (1..6), `player.tier` est le *Pressure Inverse tier* (1..4) — **deux grandeurs différentes**, à ne pas fusionner. |
| **L5** | « 12 · décisions · session » (profil L4) | `gameplay_sessions.decisions_made`, `.exceptions_resolved`, `.structural_commits` | **VALIDE.** Écrivains de production réels : `session.repository.ts:231-238` (les trois deltas), appelé par `session.service.ts:182` (résolution d'exception : `{exceptions_resolved: 1, decisions_made: 1}`) et par `structural-decision-governor.repository.ts:138` (`structural_commits + 1`). Jamais projetés. Lot = ajouter la clé. |
| **L6** | « r•••@•••.fr » (profil L2) | `player.email` | **PAS un lot back** — voir E4 : la donnée est déjà servie, en clair. C'est un lot de **rendu**, plus un arbitrage produit (masquer côté back, ou côté client). |
| **L7** | « modifier › » sur nom / adresse / mot de passe (profil L3) | — | **VALIDE comme lot de routes.** Aucune route n'écrit `player.callsign`, `player.email` ni `account_credential.password_hash` après le signup : les **4 seuls** `.update(player)` du dépôt sont `region.service.ts:85,111` (region_id), `meta-market.controller.ts:123` (visibility) et `meta-market-test.controller.ts:1234`. ★ À signaler au passage : `account_credential.updated_at` existe (`account.ts:144`) mais restera égal à `created_at` tant qu'aucune route ne change le mot de passe — la ligne « changé il y a 12 jours » n'a **pas encore** de substrat honnête. |
| **L8** | « Langue › » modifiable (réglages L1) | `player.locale` | **VALIDE, avec une nuance** : la colonne est **écrite au signup** (`auth.service.ts:356`, et `:379` pour la reprise sans adresse), pas « jamais écrite ». Ce qui manque est une route de **mise à jour** — et, tant qu'à faire, la validation contre `SUPPORTED_LOCALES` (cf. E5b). |
| **L9** | les 3 notifications (réglages L2) | — | **VALIDE comme lot** : aucune colonne, aucune table, aucune route. `live_ops_notification` existe en schéma mais est un domaine live-ops serveur, pas une préférence joueur. |
| **L10** | « Supprimer mon compte » (réglages L3) | — | **VALIDE comme lot** : `DELETED_TOMBSTONE` est un membre d'enum sans écrivain (cf. E2) ; `grep -rli 'gdpr'` sur les contrôleurs → **0**. |
| **L11** | « Se déconnecter partout » (réglages L4) | `auth_session` | **VALIDE comme lot, et la maquette a raison** : mesuré, `POST /v1/auth/signout` révoque **la session du jeton présenté** (`auth.controller.ts:294-298` : `req.account!.session_id`), après quoi `/v1/me` rend **401 `AUTH_TOKEN_INVALID_SIGNATURE`** (`mesures/14-me-after-signout.json`). Rien ne révoque les autres. |
| **L12** | *(non dessiné — l'annexe le signale)* | `player.save_state_version`, `player.active_branches` | ⛔ **Confirmé mort.** `save_state_version` : **1 seule occurrence dans tout `src/`** — sa déclaration (`db/schema/player.ts:56`). Jamais lue, jamais écrite. `active_branches` : **70** occurrences ; filtrées de `db/schema/`, `*-test.controller.ts` et `.spec.`, il en reste **0** (compte pris dans un `$( )`). ⇒ les 2 SKU `SAVE_SLOT` du catalogue (`save_slot_2`, `save_slot_3`, mesurés dans `mesures/02-pre-iap_catalogue.json`) sont **achetables et ne matérialisent rien** — l'annexe a raison de l'appeler un défaut de production. |

---

## Actions : routes ↔ CTA

Routes d'écriture joueur du domaine, mesurées, confrontées aux gestes des cadres **canon**.

| route | garde | CTA du cadre canon | verdict |
|---|---|---|---|
| `PATCH /v1/ui/tutorial {tutorial_id}` | `JwtAuthGuard` (`tutorial-overlay.controller.ts:130`) | bulle → « **Compris** » | ✔ apparié. Mesuré 200, `{tutorial_id, shown:true}` ; **idempotent** ; fait tomber `eligible_tutorial_ids` à `[]` |
| `PATCH /v1/ui/tutorial-opt-out {tutorials_opt_out}` | `JwtAuthGuard` (`:154`) | réglages → interrupteur « **Bulles de tutoriel** » | ✔ apparié. Mesuré **dans les deux sens** ; à `true`, `eligible_tutorial_ids` passe à `[]` **côté back** (compte n°2, `mesures/11-state-optout.json`) ⇒ **le front n'a pas à filtrer lui-même** — le cadre 37 « rien à montrer » est donc atteignable par les deux chemins qu'il annonce |
| `POST /v1/auth/signout` | `JwtAuthGuard` (`auth.controller.ts:293`) | profil **et** réglages → « **Se déconnecter** · cette session seulement » | ✔ apparié, et le sous-titre est **exact** (cf. L11) |
| **`PUT /v1/me/meta-market/visibility {enabled}`** | `JwtAuthGuard` (`meta-market.controller.ts:113`) | **aucun** | ⛔ **route sans CTA** → Q1 / L1 |
| `POST /v1/session/open` · `/close` | `JwtAuthGuard` | aucun (plomberie shell) | ✔ attendu — mais c'est la source de « Jour 26 » (E9) |
| `POST /v1/auth/signup` · `signin` · `refresh` | public | aucun (écrans d'entrée, hors périmètre) | ✔ attendu |
| `POST /v1/me/iap/items/purchase` · `POST /v1/iap/purchase/validate` | `JwtAuthGuard` | Boutique (screen_c2, hors périmètre) | hors périmètre — le profil n'y renvoie que par un lien |

**CTA sans route** — zéro dans les cadres canon. Dans les cadres « avec lots back » : **9**
(« modifier › » ×3, « Langue › », 3 interrupteurs de notification, « Se déconnecter partout »,
« Supprimer mon compte ») — tous couverts par L7 à L11.

---

## Table de couverture complète

### Périmètre et comptes

- **Cadres jugés dans cette table** : les 4 cadres **canon** — « Tutoriel — la première carte »,
  « Tutoriel — rien à montrer », « Profil — le compte », « Réglages — ce qui existe ». Les cadres
  « avec les lots back L1 → L4 » sont **par construction** des propositions sans source : ils sont
  jugés dans la section *Lots back* ci-dessus, pas ici.
- **`|B|` = 19** : 5 (`me`) + 3 (`wallet`) + 2 (`progression`) + 4 (`tutorial-state`) + 1
  (`iap/balance`) + 1 (`iap/entitlements`) + 2 (`i18n/bundle`) + 1 (`session/open` → `opened_game_day`).
  ⚠️ **Exclusion déclarée** : `session/open` rend **12 clés** (`mesures/03-session-open.json`) ; les
  11 autres (`hl_card`, `queue`, `backlog_badge`, `queue_pressure_band`, `structural_budget`,
  `flag_review`, `settling_glance`, `friction_glance`, `compression_glance`, `onboarding`,
  `session_id`) appartiennent aux écrans 1 / 5 / 8 / 13 et sont hors périmètre.
  `GET /v1/iap/catalogue` (1 clé, 9 SKU) appartient à la Boutique — hors périmètre, cité en L12.
- **`|M non apparié|` = 6** : E1 (texte de la bulle), E7 (ancre de la bulle), le médaillon/avatar du
  profil, et les 3 interrupteurs d'accessibilité déclarés locaux à l'appareil.
  *(Les libellés statiques — titres d'écran, en-têtes de section — ne sont pas comptés : ils ne
  portent aucune information sur le joueur.)*
- **`|F sans source|`** : **sans objet** (mode maquette, le front n'existe pas).
- **Contrôle d'arithmétique : 19 + 6 + 0 = 25 lignes.** La table en compte 25.

### Les 25 lignes

| # | information | B | M | statut | classe |
|---|---|---|---|---|---|
| 1 | `handle` — le nom de joueur (`me`) | ● | ● | affichée comme dessinée (3 rendus : nom du profil, ligne « Nom de joueur », sous-titre des réglages) | ✔ |
| 2 | `email` (`me`) | ● | ● | affichée — **cas `null` seulement** | **écart E4** |
| 3 | `lifecycle_state` (`me`) | ● | ● | affichée — **valeur constante** | **écart E2** |
| 4 | `locale` (`me`) | ● | ● | affichée — **défaut `en`, ensemble non clos** | **écart E5** |
| 5 | `account_id` (`me`) | ● | – | disponible, ni dessinée ni affichée | question **Q6** |
| 6 | `cash_cents` (`wallet`) | ● | ● | affichée comme dessinée (« $ 10 000 » = `"1000000"` ÷ 100) | ✔ |
| 7 | `wallet_band` (`wallet`) | ● | ● | affichée comme dessinée (« modéré ») — les 5 valeurs ont un libellé | ✔ |
| 8 | `player_id` (`wallet`) | ● | – | disponible, ni dessinée ni affichée | question **Q5** |
| 9 | `vocabulary_tier` (`progression`) | ● | ● | affichée comme dessinée (« Palier 1 ») | ✔ |
| 10 | `progress_to_next` (`progression`) | ● | ● | affichée — **1 des 3 valeurs sans libellé** | **écart E3** |
| 11 | `tutorials_opt_out` (`tutorial-state`) | ● | ● | affichée comme dessinée — **inversion tacite** | **écart E6** |
| 12 | `eligible_tutorial_ids` (`tutorial-state`) | ● | ● | affichée comme dessinée (présence/absence de la bulle) | ✔ |
| 13 | `shown_tutorial_ids` (`tutorial-state`) | ● | – | disponible, ni dessinée ni affichée | question **Q3** |
| 14 | `next_tutorial_id` (`tutorial-state`) | ● | – | disponible, ni dessinée ni affichée — **et `null` dans le scénario dessiné** | question **Q2** |
| 15 | `marks_balance` (`iap/balance`) | ● | ● | affichée comme dessinée (2 rendus : grille, lien Boutique) | ✔ |
| 16 | `skus` (`iap/entitlements`) | ● | ● | affichée — **cardinal seulement** | question **Q7** |
| 17 | `locale` (`i18n/bundle`) | ● | – | disponible, ni dessinée ni affichée | question **Q4** |
| 18 | `messages` (`i18n/bundle`) | ● | – | disponible, **inutilisable pour ces écrans** | **écart E8** |
| 19 | `opened_game_day` (`session/open`) | ● | ● | affichée (« Jour 26 ») — **route non déclarée par l'annexe** | **écart E9** |
| 20 | texte de la bulle de tutoriel | – | ● | dessinée sans source | **écart E1** |
| 21 | ancre / cible de la bulle | – | ● | dessinée sans source | **écart E7** |
| 22 | médaillon / buste du profil | – | ● | dessinée sans source — aucun champ d'avatar en base ni en projection | **ASSUMÉ à consigner** |
| 23 | accessibilité — « Mouvement réduit » | – | ● | dessinée sans source, **déclarée locale** (pointillés) | ASSUMÉ (consigné par la maquette) |
| 24 | accessibilité — « Grand texte » | – | ● | idem | ASSUMÉ (consigné) |
| 25 | accessibilité — « Couleurs adaptées » | – | ● | idem | ASSUMÉ (consigné) |

**Récapitulatif** : 13 ✔ appariées · 6 clés disponibles non dessinées · 6 éléments dessinés sans
source (dont 3 déclarés locaux et assumés). **9 écarts** classés E1→E9, **7 questions** Q1→Q7,
**12 lots back** L1→L12 (dont **3 réfutés** : L3, L4, L12).

---

## Annexes

### 1. Routes du domaine — compte et ancres

**Balayage.** Le dossier proposait `onboarding/`, `auth/`, `economy/`, `progression/`, `iap/`,
`i18n/`. J'ai complété en balayant **les 144 fichiers `*.controller.ts`** du back (109 hors `_test`)
sur les mots du domaine (`locale`, `settings`, `profile`, `handle`, `callsign`, `display_name`,
`notification`, `privacy`, `gdpr`, `export`, `consent`, `avatar`) puis en énumérant **toutes** les
routes de chemin `me/…` hors `_test`/`admin` (**21 routes**, dont 3 hors des modules du dossier).

**8 routes joueur retenues** (toutes sous `@UseGuards(JwtAuthGuard)` sauf `i18n/bundle`, publique) :

| # | route | ancre | garde |
|---|---|---|---|
| 1 | `GET /v1/me` | `auth/auth.controller.ts:343-344` (`MeController`) | `JwtAuthGuard` |
| 2 | `GET /v1/economy/wallet` | `economy/economy.controller.ts:43-44` | `JwtAuthGuard` |
| 3 | `GET /v1/progression` | `progression/progression.controller.ts:28-29` | `JwtAuthGuard` |
| 4 | `GET /v1/ui/tutorial-state` | `onboarding/tutorial-overlay.controller.ts:106-107` | `JwtAuthGuard` |
| 5 | `GET /v1/me/iap/balance` | `economy/iap/iap.controller.ts:82-83` | `JwtAuthGuard` |
| 6 | `GET /v1/me/iap/entitlements` | `economy/iap/iap.controller.ts:135-136` | `JwtAuthGuard` |
| 7 | `GET /v1/i18n/bundle` | `i18n/i18n.controller.ts:32` | **publique** (assumé : dictionnaire, pas donnée joueur) |
| 8 | `POST /v1/session/open` | `session/session.controller.ts:56-58` | `JwtAuthGuard` |

**Routes d'écriture du domaine (5)** : `PATCH /v1/ui/tutorial` (`:128-130`), `PATCH /v1/ui/tutorial-opt-out`
(`:152-154`), `POST /v1/auth/signout` (`auth.controller.ts:291-293`), **`PUT /v1/me/meta-market/visibility`**
(`operational/meta_market/meta-market.controller.ts:112-113` — **trouvée hors des modules du dossier**),
`POST /v1/session/close` (`session.controller.ts:69-71`).

**Ce que le balayage a écarté** : `POST /v1/telemetry/events` (`telemetry.controller.ts:46`) — sans
garde, mais c'est de l'ingestion, pas un réglage ; aucune route de consentement n'existe.
`GET /v1/iap/catalogue` — Boutique (screen_c2), hors périmètre.

### 2. Corps réels

Tous dans `mesures/` ; les commandes exactes sont dans `mesures/commandes.md`. Trois comptes frais
(aucun compte de démo, aucun conteneur touché), corps validés par `json.load`.

Ensembles de clés mesurés (triés) :

- `me` → `{account_id, email, handle, lifecycle_state, locale}` (5)
- `economy/wallet` → `{cash_cents, player_id, wallet_band}` (3)
- `progression` → `{progress_to_next, vocabulary_tier}` (2)
- `ui/tutorial-state` → `{eligible_tutorial_ids, next_tutorial_id, shown_tutorial_ids, tutorials_opt_out}` (4)
- `me/iap/balance` → `{marks_balance}` (1)
- `me/iap/entitlements` → `{skus}` (1)
- `i18n/bundle` → `{locale, messages}` (2)
- `session/open` → `{backlog_badge, compression_glance, flag_review, friction_glance, hl_card,
  onboarding, opened_game_day, queue, queue_pressure_band, session_id, settling_glance,
  structural_budget}` (12)

Valeurs sur compte frais : `cash_cents: "1000000"` · `wallet_band: "MODERATE"` ·
`vocabulary_tier: 1` · `progress_to_next: "LOCKED"` · `marks_balance: 50` · `skus: []` ·
`locale: "en"` · `email: null` · `lifecycle_state: "ACTIVE"` · `opened_game_day: 1` ·
`eligible_tutorial_ids: ["tutorial.exception_card.onboarding_preseed"]` · `next_tutorial_id: null`.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine | contrainte lue à la source |
|---|---|---|
| `lifecycle_state` | `PENDING_VERIFICATION, ACTIVE, DORMANT, SUSPENDED, BANNED, DELETED_TOMBSTONE` (+ 3 staff) | `pgEnum('account_lifecycle_state', […])`, `db/schema/account.ts:75-85` — **9 membres, 1 seul atteignable** (E2) |
| `wallet_band` | `BROKE, LOW, MODERATE, HIGH, FLUSH` | union TS `economy.projection.service.ts:46` ; seuils `:84-86` (5 000 $ / 50 000 $ / 500 000 $) |
| `progress_to_next` | `LOCKED, IN_PROGRESS, UNLOCKED` | union TS `progression.projection.service.ts:7` — **3 atteignables** (E3) |
| `vocabulary_tier` | entier 1..6 | `progression.projection.service.ts:10` (« *the player-facing vocabulary tier LEVEL (1..6)* ») |
| `locale` (`me`) | **non contraint** — `varchar(8)` libre | `db/schema/player.ts:39` + `auth.controller.ts:264-267` (longueur seule). Le back ne connaît que `en`/`fr` : `i18n/string_table.ts:33` (E5) |
| `locale` (`i18n/bundle`) | `en, fr` | `SUPPORTED_LOCALES`, `i18n/string_table.ts:33` ; `normalizeLocale` (`:111-120`) replie tout le reste sur `en` |
| `eligible_tutorial_ids` / `shown_tutorial_ids` / `next_tutorial_id` | 11 ids | union `TutorialId`, `onboarding/tutorial-id-catalogue.ts` ; **1 est catalogué `eligible: false`** (`tutorial.vacancy`, sans substrat de déclencheur) ; `next_tutorial_id` est restreint aux **7** ids `SCHEDULE` (`disclosure-schedule-catalogue.ts`) |
| `tutorials_opt_out` | booléen | `db/schema/player_progression_state.ts:80` (`notNull().default(false)`) |
| `cash_cents` | chaîne (BigInt sérialisé) | `economy.projection.service.ts:60` — « *NEVER `Number(bigint)`* » ⇒ **le client doit diviser une chaîne**, jamais parser en flottant |
| `marks_balance` | entier | `iap.controller.ts:84` |
| `skus` (entitlements) | sous-ensemble des 9 `sku_id` du catalogue | `mesures/02-pre-iap_catalogue.json` |

### 4. Inventaire M — cadres canon (Mxx → ce que ça représente)

**Tutoriel (« la première carte » / « rien à montrer »)** — la bulle seule ; la carte d'exception
derrière appartient à screen_5.
`MT1` présence/absence de la bulle → *une explication est due* · `MT2` texte de la bulle →
*le contenu de l'explication* · `MT3` flèche d'ancrage → *à quoi l'explication se rapporte* ·
`MT4` bouton « Compris » → *action, `PATCH ui/tutorial`*.

**Profil.** `MP1` « Jour 26 » → *le jour de jeu* · `MP2` « compte actif » → *l'état du compte* ·
`MP3` médaillon/buste → *l'identité visuelle du joueur* · `MP4` « Le Renard » → *le nom de joueur* ·
`MP5` chip « Palier 1 » → *le palier de vocabulaire* · `MP6` chip « Prochain · verrouillé » →
*la progression vers le palier suivant* · `MP7` chip « Français » → *la langue* · `MP8` « $ 10 000 » →
*l'argent propre exact* · `MP9` « argent · modéré » → *la bande d'argent* · `MP10` « 50 · Marks » →
*le solde de Marks* · `MP11` « 0 · extras » → *le nombre d'extras possédés* · `MP12` « Adresse de
courriel · absente » → *l'adresse du compte* · `MP13` « Nom de joueur · Le Renard » → *(2ᵉ rendu de
MP4)* · `MP14` « La Boutique · 50 Marks » → *navigation + (2ᵉ rendu de MP10)* · `MP15` « Les
Réglages » → *navigation* · `MP16` « Se déconnecter · cette session seulement » → *action*.

**Réglages.** `MR1` « Le Renard · compte actif » → *(rendus de MP4 + MP2)* · `MR2` « Langue ·
Français · ne se change pas encore » → *(rendu de MP7) + un ASSUMÉ écrit dans l'écran* ·
`MR3` interrupteur « Bulles de tutoriel » ON → *les explications sont activées* ·
`MR4`/`MR5`/`MR6` « Mouvement réduit » / « Grand texte » / « Couleurs adaptées », en pointillés →
*réglages d'appareil* · `MR7` « Se déconnecter » → *(2ᵉ rendu de MP16)*.

★ La maquette **fusionne** délibérément plusieurs rendus d'une même clé (`handle` ×3,
`marks_balance` ×2, `lifecycle_state` ×2, `locale` ×2) : comptés une fois dans la table.

### 5. Inventaire F

**Sans objet** — mode maquette. À rejouer en mode clôture une fois l'écran monté.

### 6. Non vérifié

1. **`next_tutorial_id` non nul.** Je n'ai jamais obtenu autre chose que `null` : les 7 ids `SCHEDULE`
   exigent des planchers ordinaux ou des événements hors de portée d'un compte frais. La mesure qui
   trancherait : faire progresser un compte jusqu'à rendre `tutorial.cue_stack_intro` éligible, puis
   relire `ui/tutorial-state`. ⇒ **je n'ai donc pas pu vérifier que ce champ est vivant** ; je n'affirme
   pas qu'il est mort.
2. **`progress_to_next: 'IN_PROGRESS'` et `'UNLOCKED'`** n'ont pas été observés — seulement lus dans le
   résolveur (`progression.projection.service.ts:26-32`). La mesure : résoudre une exception (chemin
   joueur) puis relire `/v1/progression`.
3. **`wallet_band`** n'a été observé qu'à `MODERATE` (1 valeur sur 5). Les seuils sont lus au code, pas
   mesurés en jeu.
4. **`account.lifecycle_state` ≠ ACTIVE.** J'affirme qu'aucun `UPDATE` de production n'existe, sur la
   base d'un balayage de tout `services/game-back/src` hors `db/schema/` et hors `.spec.` — mais je
   n'ai **pas** balayé les migrations SQL ni le back-office (`services/bo-back/`). Un chemin staff BO
   qui suspendrait un compte me démentirait ; la mesure qui trancherait est un balayage de `bo-back`.
5. **`player.created_at`** : je conclus « toujours peuplée » depuis `.notNull().defaultNow()` en
   schéma Drizzle — **je n'ai pas lu la ligne en base** (pas d'accès psql, consigne de ne pas toucher
   aux conteneurs). Un `SELECT created_at FROM player` trancherait.
6. **Le corps après `session/open`.** Les 5 routes relues après ouverture de session rendent des corps
   **identiques** à ceux d'avant (`04-post-*` vs `02-pre-*`) : la session ne change aucune des clés du
   domaine du compte. C'est mesuré, mais sur **un seul** compte et **une seule** ouverture.
7. **La carte d'exception derrière la bulle** (cadres 36/37) porte un titre français (« Le labo est
   prêt — votre cuisinier attend un mot ») et un rôle (« Cuisinier ») que le corps mesuré de
   `session/open` **ne contient pas** : l'entrée de file rend `event_descriptor:
   "onboarding.preseed_exception.card"` et aucun libellé humain. **Hors périmètre** (screen_5), mais à
   transmettre au juge de cet écran-là.
8. **`GET /v1/iap/catalogue`** n'a pas été confronté à la Boutique (screen_c2, hors périmètre) : seul
   le lien « La Boutique · 50 Marks » du profil et le constat L12 sur les `SAVE_SLOT` en relèvent.
9. **L'email silencieusement abandonné.** `auth.service.ts:372-379` documente que le signup **retente
   sans l'adresse** en cas de collision `player_email_uq` — donc un joueur peut avoir saisi une
   adresse et se retrouver avec `email: null`. **Je ne l'ai pas reproduit** (il faudrait deux signups
   sur la même adresse). Si c'est confirmé, la ligne « aucune — le compte n'en a pas » peut mentir.
