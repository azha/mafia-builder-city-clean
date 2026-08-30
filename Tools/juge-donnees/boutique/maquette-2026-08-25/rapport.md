# Juge données ⊥ — La Boutique (screen_c2) — mode MAQUETTE — 2026-08-25

## En une phrase

La maquette dessine **10 informations sur les 10 clés que le back projette** — c'est
effectivement la surface la mieux servie du jeu — mais **4 écarts à consigner** (dont 2 que
l'annexe ne consigne pas), **1 défaut de couverture mesuré** (`marks_granted` dessiné pour 4
packs sur 5), et surtout **une chaîne de préconditions morte à deux endroits** : aucun chemin de
jeu ne crédite de Marks (le don de bienvenue de 50 est le seul, et il vaut exactement le prix du
seul article achetable), et **les 5 boutons « Acheter » du magasin ne peuvent aboutir dans aucun
environnement** — aucun vérificateur de reçu n'est câblé nulle part. **8 questions « passé à
côté ? »**, **0 lot back de forme F** (rien de dessiné n'attend une colonne non projetée).

---

## Écarts à consigner (mode maquette)

| # | information | B | M | statut | preuve |
|---|---|---|---|---|---|
| **É1** | **`marks_granted` du `support_pack` (500 Marks) non dessiné** — les 4 packs affichent leur contenu **dans leur nom** (« 100 Marks », « 600 Marks »…), le pack de soutien affiche « Pack de soutien au studio » et rien d'autre. Le joueur ne sait pas qu'il reçoit 500 Marks. | ● | ✗ | **DÉFAUT de couverture** (4/5 dessinés) | B : `mesures/03-catalogue.json` → `{"sku_id":"support_pack",…,"marks_granted":500}` · canon `docs/tech/10_economy_monetization/iap_catalogue.md:149` « 500 Marks + small cosmetic » · M : `ecrans-brennar-2.html:1308` et `:1326` — la ligne ne porte que `<div class="nom">Pack de soutien au studio</div><small>prix affiché par le magasin</small>` |
| **É2** | **Les libellés sont traduits en français alors que `display_name` est servi en anglais littéral, et il n'existe AUCUNE clé i18n** pour les produits. « Couleurs de nom » ⇄ `"Callsign Color Pack"`, « Thème « Nuit au sodium » » ⇄ `"Theme: Sodium Night"`, « Pack de soutien au studio » ⇄ `"Studio Support Pack"`. | ● (EN) | ● (FR) | **ASSUMÉ à consigner** — non consigné aujourd'hui ; contredit la convention lot 0 « libellés en clés i18n partout » | B : `iap-sku-catalogue.ts:56,63,71,79,87,93,99,108,117` (`display_name` = littéral anglais) · **mesure** : `GET /v1/i18n/bundle?locale=fr` rend **67 messages, 0 clé produit** (`mesures/07-i18n-fr.json`) — le bundle est **dérivé de `protocol/error-codes.ts`**, il ne porte que des `error.*` |
| **É3** | **Le sous-titre descriptif de chaque article n'a aucune source** — « pour votre nom de joueur », « l'habillage du tableau ». Aucune colonne, aucune clé, aucun champ de projection ne porte de description. | ✗ | ● | **ASSUMÉ à consigner** — non consigné | B : `IapCatalogueEntryView` porte 7 champs et **aucun** n'est une description (`iap-catalogue.service.ts:36-45`) ; mesuré identique dans le corps réel · M : `ecrans-brennar-2.html:1305,1306` |
| **É4** | **« +20 % » est dessiné sans le terme auquel il se rapporte.** `bonus_pct` est un **bonus de Marks-par-dollar** face au pack de base (~101 /$ → ~120 /$), pas un bonus sur la quantité affichée. Collé à « 600 Marks » sans prix visible, il se lit « 600 + 20 % ». | ● | ● | **ASSUMÉ à consigner** — non consigné ; risque de lecture, pas d'absence | B : `mesures/03-catalogue.json` `"bonus_pct":20` · sens fixé par `iap_catalogue.md:161-164` (table `$ / Marks / bonus / Marks-par-$`) et `iap-sku-catalogue.ts:38-43` « DISPLAY-ONLY tier-bonus percentage … the DISPLAYED ratio, not a runtime multiplier » · M : `ecrans-brennar-2.html:1301` `<span class="chip bonus">+20 %</span>` |

### Écarts déjà consignés dans l'annexe — RE-VÉRIFIÉS, tous exacts, un à ÉTENDRE

| annexe | verdict | mesure |
|---|---|---|
| « prix affiché par le magasin » : le corps ne porte pas le prix | **CONFIRMÉ, et c'est la bonne posture** | le corps mesuré ne porte que `price_store_product_id` ; le canon l'exige : `iap_catalogue.md:118` — « **store-side exclusif** … Aucun prix réel hardcodé serveur/client ». Le placeholder est canon-correct ; il **exige** que le client passe `price_store_product_id` au SDK du magasin |
| les 2 emplacements de sauvegarde non dessinés, « SKU achetable qui ne matérialise rien » | **CONFIRMÉ** | **0** table du schéma dont le nom porte `save`/`slot` (contrôle positif : **180** `pgTable` au total) ; `save_slot` n'apparaît que dans le catalogue et ses tunables — **0** consommateur |
| absence de « Restaurer les achats » : aucune route | **CONFIRMÉ** | 5 routes joueur au total dans `IapController`, aucune ne restaure ; `validate` traite **un** couple `(platform, receipt)` (`iap.controller.ts:151-169`) |
| « il vous manque 80 Marks » = dérivation client | **CONFIRMÉ** | `marks_balance` (0) et `price_marks` (80) sont tous deux projetés ; mesuré `mesures/09-balance-after.json` + `03-catalogue.json` |
| « Possédé ✓ » = `entitlements.skus` contient le `sku_id` | **CONFIRMÉ, mesuré de bout en bout** | après achat réel : `{"skus":["cosm_callsign_color"]}` (`mesures/10-entitlements-after.json`) |
| « le SKU est achetable et ne matérialise rien » — **dit des seuls emplacements de sauvegarde** | **À ÉTENDRE : c'est vrai des 4 SKU en Marks** | `iap_entitlement` a **exactement un lecteur** dans tout le back — `IapEntitlementRepository.listForPlayer` (`iap-entitlement.repository.ts:34-40`), appelé par la seule route `GET /v1/me/iap/entitlements`. Aucune autre projection, aucune table `player` ne porte de couleur ni de thème. ⚠️ **Nuance qui compte** : pour un **cosmétique**, ça reste implémentable **côté client seul** (il lit `entitlements` et peint) ; pour un **emplacement de sauvegarde**, non — il n'y a pas de domaine serveur à ouvrir. **Les deux ne sont pas le même défaut.** |

---

## ⛔ Deux chaînes de préconditions mortes — la mesure qui commande la maquette

Ce n'est pas un écart de dessin : c'est ce que la maquette **promet** et que le back ne peut pas
tenir. Méthode du socle : remonter chaque maillon jusqu'à un écrivain de production réel.

### Chaîne 1 — **aucun chemin de jeu ne crédite de Marks**

Les **3** écrivains de `economy_states.marks`, énumérés et classés :

| # | écrivain | déclencheur | atteignable par un joueur ? |
|---|---|---|---|
| 1 | `auth.service.ts:399` — `WELCOME_GRANT_MARKS = 50` (`auth.service.ts:151`) | signup | **oui, une seule fois** |
| 2 | `MarksWalletRepository.creditUnconditional` (`marks-wallet.repository.ts:83`) — **seul appelant** `iap-purchase-validate.service.ts:78` | un reçu **vérifié** | **non** (chaîne 2 ci-dessous) |
| 3 | `MarksWalletRepository.applyDelta` (`:104`) — subvention BO | `PATCH /admin/players/:id/economy/marks`, `requireStaffRole('admin')` | **non** (route staff) |

⇒ **Un joueur possède 50 Marks à vie.** Or les prix mesurés sont **50 / 80 / 100 / 200**.
**Le don de bienvenue vaut exactement le prix du seul article atteignable**, et après cet achat
**les 3 autres articles en Marks sont hors d'atteinte pour toujours**. Le cadre 41 (« 0 Mark ·
1 extra ») n'est pas un cas limite choisi pour illustrer : **c'est l'état terminal de tout
joueur non payeur**, atteint en un geste. Mesuré de bout en bout : 50 → achat → 0.

### Chaîne 2 — **les 5 boutons « Acheter » n'aboutissent dans aucun environnement**

`POST /v1/iap/purchase/validate` ne crédite que si `IAP_RECEIPT_VERIFIER.verify()` rend non-null.

- **Production** (`NODE_ENV=production`) : `NullIapReceiptVerifier` est **la seule** liaison
  (`iap.module.ts:56-61`), et elle « resolves null for EVERY receipt, unconditionally »
  (`iap-receipt-verifier.port.ts:55-60`) — **zéro capacité de sortie HTTP dans ce back**.
- **Tout autre environnement, staging compris** (`testControllersEnabled()` = `env !== 'production'`,
  `protocol/test-routes-gate.ts:25-27`) : `FakeIapReceiptVerifier`, **liste d'autorisation vide par
  défaut**, mutée uniquement par `POST /_test/iap/receipts/register`.
- **Mesuré** : `{"platform":"google","receipt":"jd-bogus-receipt"}` → **422** « Receipt could not be
  verified » (`mesures/14-validate-bogus.json`).

⇒ **Aucun des 4 packs ni le pack de soutien ne peut créditer un seul Mark aujourd'hui, où que ce
soit.** Ce n'est pas un défaut de la maquette — c'est le maillon manquant (un adaptateur de
magasin) que le lot d'écran devra soit livrer, soit assumer par écrit.

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| 1 | `marks_granted` = 500 sur `support_pack` (`iap/catalogue`) | « ce pack de soutien vous rend aussi 500 Marks » | **Utile ici, et c'est É1** : c'est la seule ligne du magasin dont on ignore ce qu'on reçoit. Les 4 autres packs le disent dans leur nom. | ★★★ |
| 2 | `marks_ledger.*` — `delta_marks`, `reason_sku`, `created_at` (**B⁻ : aucune route, joueur NI staff**) | « d'où viennent vos 50 Marks, où sont-ils partis » | **Utile ici** — dans une économie à un seul crédit et un seul débit, un « historique de vos Marks » explique le solde en trois lignes. C'est aussi le seul endroit où un joueur verrait la trace du don de bienvenue. | ★★★ |
| 3 | `iap_transactions.*` — `amount_cents`, `currency_code`, `platform`, `purchased_at`, `refunded_at` (**B⁻ côté joueur** ; lu par le seul `GET /admin/players/:id/iap-history`) | « vos achats réels, leur montant, leur date » | **Utile, mais pas day-1** : sans adaptateur de magasin la table reste vide. À reprendre quand la chaîne 2 sera fermée — **et c'est probablement une obligation de plateforme**, pas un ornement. | ★★ |
| 4 | `iap_entitlement.granted_at` (**B⁻** — `listForPlayer` ne sélectionne que `sku_id`, `iap-entitlement.repository.ts:36`) | « possédé depuis le … » | **Pas ici.** Une date d'acquisition sur un cosmétique n'aide personne dans un magasin. | ★ |
| 5 | `price_store_product_id` (`iap/catalogue`) | rien — c'est l'identité du produit côté magasin | **Ne pas afficher, mais NE PAS PERDRE** : c'est la clé que le client passe au SDK pour obtenir le prix localisé. Sans elle, « prix affiché par le magasin » ne peut jamais devenir un prix. Plomberie **indispensable**. | — (vital, non affichable) |
| 6 | `sku_id` (`iap/catalogue`, `entitlements`) | rien — id opaque | Plomberie. Sert de clé d'appariement catalogue ⇄ entitlements. | — |
| 7 | *(absent des deux côtés)* « Restaurer les achats » | « je change de téléphone, je récupère ce que j'ai payé » | **Question produit à trancher** : aucune route, aucun CTA. Pour des non-consommables (cosmétiques, emplacements), les magasins l'exigent en général. À arbitrer **maintenant**, pas au moment du lot. | ★★ |
| 8 | *(absent de la maquette)* la confirmation d'achat | — | Le canon prévoit `T.ui.iap.purchase_confirm_longpress_ms` (cité hors périmètre, `iap.tunables.ts:22-24`). **La maquette dépense 50 Marks — la totalité du patrimoine du joueur — sur une seule tape, sans confirmation.** | ★★ |

---

## Lots back suggérés (B⁻ dessiné, forme F)

**Aucun.** Table vide, et c'est un résultat, pas un oubli : les 3 colonnes non projetées que j'ai
trouvées (`iap_entitlement.granted_at`, tout `marks_ledger`, tout `iap_transactions` côté joueur)
**ne sont dessinées nulle part** dans les deux cadres. Rien dans la maquette n'attend une clé que
la projection omettrait ⇒ **aucune forme F ici**. Les trois vivent en questions 2-4 ci-dessus.

⚠️ Les colonnes `economy_states.bo_analytics_rollup`, `lifetime_iap_value_cents` et `last_iap_at`
sont **explicitement marquées BO-only, jamais surface joueur** (`player_economy_state.ts:27` « NEVER surface joueur » · `:40` `bo_analytics_rollup` · `:42-43` `lifetime_iap_value_cents` « BO-only ABSOLU » · `:45-46` `last_iap_at` « BO-only »)
— ce ne sont pas des candidates, et les compter en B⁻ serait une erreur de classement.

---

## Actions : routes ↔ CTA

| route joueur `@Post` | CTA maquette | verdict |
|---|---|---|
| `POST /v1/me/iap/items/purchase` (`iap.controller.ts:99`) — corps `{sku_id}` **seulement** (le prix est résolu serveur, anti-tamper `:94-98`) | `.btn-filet.marks` « 50 Marks » / « 80 Marks » (`:1305,1306`) | **apparié** pour les 2 COSMETIC |
| la **même** route accepte `save_slot_2` / `save_slot_3` (`:112` — `kind === 'COSMETIC' \|\| kind === 'SAVE_SLOT'`) | **aucun** | **route sans CTA** — cohérent avec l'écart assumé, mais la route reste ouverte : un joueur à 100+ Marks pourrait acheter par l'API un emplacement qui n'existe pas |
| `POST /v1/iap/purchase/validate` (`:151`) | `.btn-filet.store` « Acheter » ×5 | **apparié en intention seulement** — le CTA ouvre le SDK du magasin, dont la maquette ne montre rien, et la route **ne peut pas aboutir** (chaîne 2) |
| *(aucune)* | *(aucun)* « Restaurer les achats » | **absent des deux côtés** — question 7 |

### Trois observations sur les réponses d'action, mesurées

1. **`POST items/purchase` ne rend que `{ sku_id }`** (`mesures/08-purchase-cosm-ok.json`) — ni le
   nouveau solde, ni la liste d'entitlements. Le client doit **re-tirer 2 routes** après chaque
   achat pour rafraîchir l'en-tête et la pastille « Possédé ✓ ». Un `marks_balance` dans la réponse
   supprimerait deux allers-retours sur le geste le plus visible de l'écran.
2. **« solde insuffisant » et « déjà possédé » sont indiscernables pour le client.** Les deux
   rendent `RESOURCE_STATE_CONFLICT` / **409** / `user_facing_i18n_key: "error.resource.state_conflict"`
   / `payload_vars: null` ; seule la clé `message`, **en anglais littéral**, les sépare
   (« Insufficient marks to purchase … » vs « Player already owns … » —
   `mesures/11-…json`, `12-…json`). La maquette distingue bien les deux états **en amont**
   (elle les dérive de `marks_balance` et `entitlements`), mais si un achat échoue **quand
   même** — course, solde changé ailleurs — l'écran ne peut pas dire pourquoi en français.
3. **`POST items/purchase` refuse un `MARKS_PACK`** → 422 `VALIDATION_FAILED`
   (`mesures/13-…json`) : les deux chemins d'achat sont bien étanches.

---

## Table de couverture complète

Comptes : **|clés B| = 10** (3 routes de lecture IAP) · **|éléments M non appariés| = 4** ·
**somme = 14 lignes**. ✔ vérifié ligne à ligne ci-dessous.

*(Le titre « La Boutique » et la flèche « ‹ » sont du **chrome de navigation**, pas de
l'information — exclus, et déclarés ici pour que le compte soit reproductible. Les CTA sont
traités au §Actions, jamais comptés deux fois.)*

| # | information | B | M | statut | note |
|---|---|---|---|---|---|
| 1 | `catalogue.skus[]` — la collection et son cardinal (**9** mesurés) | ● | ● **7/9** | **partiel** | `save_slot_2` et `save_slot_3` non dessinés — écart assumé, re-vérifié |
| 2 | `sku_id` | ● | – | **« passé à côté ? »** (Q6) | id opaque, plomberie d'appariement |
| 3 | `display_name` | ● | ● | ✔ **avec É2** | servi en anglais, dessiné en français, aucune clé i18n |
| 4 | `kind` (`MARKS_PACK` / `COSMETIC` / `SAVE_SLOT` / `SUPPORT`) | ● | ● **3/4** | **partiel** | rendu en titres de section ; `SAVE_SLOT` n'a **pas de section** ⇒ c'est le mécanisme exact par lequel les 2 SKU disparaissent |
| 5 | `price_store_product_id` | ● | – | **« passé à côté ? »** (Q5) | non affichable, mais **vital** : sans elle « prix affiché par le magasin » ne peut pas devenir un prix |
| 6 | `price_marks` (50 / 80 / 100 / 200) | ● | ● **2/4** | **partiel** | dessiné sur les 2 cosmétiques ; les 2 emplacements sont hors dessin |
| 7 | `marks_granted` (100 / 600 / 1400 / 3500 / **500**) | ● | ● **4/5** | **DÉFAUT É1** | le `support_pack` (500) est le seul dont le contenu n'est pas dit |
| 8 | `bonus_pct` (20 / 40 / 75 ; absent sur small et support) | ● | ● | ✔ **avec É4** | absence correctement dessinée (aucune pastille sur le pack de base ni le soutien) |
| 9 | `marks_balance` | ● | ● | ✔ | en-tête, « **50** Marks » / « **0** Mark » — le singulier est géré |
| 10 | `entitlements.skus[]` | ● | ● | ✔ | double emploi : la pastille « Possédé ✓ » **et** le cardinal en en-tête (« aucun extra » / « 1 extra ») |
| 11 | *le prix réel du pack* — « prix affiché par le magasin » | ✗ | ● | **ASSUMÉ, consigné** | canon `iap_catalogue.md:118` : store-side exclusif. Dépend de la clé 5 + du SDK |
| 12 | *la description d'un article* | ✗ | ● | **É3 — ASSUMÉ, non consigné** | aucune colonne, aucun champ, aucune clé |
| 13 | *l'abordabilité* — bouton grisé (`.btn-filet.dim`, `opacity:.42`) + « il vous manque 80 Marks » | ✗ (dérivé de 6 et 9) | ● | **dérivation légitime** | ⚠️ **appliquée de façon incohérente** : cadre 40, solde 50 vs prix 80 ⇒ il manque **30**, et la ligne affiche la description ; cadre 41, solde 0 ⇒ elle affiche « il vous manque 80 Marks ». **Le bouton est grisé dans les DEUX cas.** Quelle règle ? |
| 14 | *le repli de liste* — « … et 2 autres packs » | ✗ (dérivé de 1) | ● | **dérivation légitime** | 4 packs, 2 dessinés, 2 repliés — l'arithmétique est juste |

---

## Annexes

### 1. Routes du domaine — compte et ancres

**Balayage** : `services/game-back/src/**/*.controller.ts` sur `marks|entitlement|cosmetic|save_slot|iap`
(insensible à la casse) → **15 fichiers**, dont **11 faux positifs** (« marks » verbe anglais :
`horizon-feed.controller.ts:42` « Marks unseen→seen », `tutorial-overlay.controller.ts:131`
`markShown`, etc. — chacun ouvert et classé). ⚠️ Le dossier annonçait `services/game-back/src/iap/` :
**ce répertoire n'existe pas**, le module est `services/game-back/src/economy/iap/`.

**Routes joueur (`@UseGuards(JwtAuthGuard)`) — 6 comptées :**

| # | route | ancre | rôle pour cet écran |
|---|---|---|---|
| 1 | `GET /v1/iap/catalogue` | `iap.controller.ts:69-73` | le catalogue |
| 2 | `GET /v1/me/iap/balance` | `:82-91` | le solde de Marks |
| 3 | `POST /v1/me/iap/items/purchase` | `:99-132` (`@Idempotent({required:true})`) | achat en Marks |
| 4 | `GET /v1/me/iap/entitlements` | `:135-140` | ce qu'on possède |
| 5 | `POST /v1/iap/purchase/validate` | `:151-169` (`@Idempotent({required:true})`) | reçu du magasin |
| 6 | `GET /v1/economy/wallet` | `economy.controller.ts:43-52` | **adjacent** : partage le résolveur `getWalletAndMarks` mais **jette `.marks` délibérément** (`economy.repository.ts:29-35`) ⇒ il projette `cash_cents`/`wallet_band`, pas les Marks. La boutique **doit** appeler la route 2. Décision de conception documentée, **pas** un défaut. |

**Hors périmètre joueur, énumérées pour que le compte soit fermé** — 4 routes staff
(`iap-catalogue-admin.controller.ts:41` `PATCH /admin/iap/skus/:sku_id` ·
`iap-economy-admin.controller.ts:115` `PATCH /admin/players/:id/economy/marks` · `:175`
`GET /admin/players/:id/iap-history` · `:220` `POST /admin/iap-transactions/:txn_id/refund`) et
2 routes `_test` (`iap-test.controller.ts:43,57` — `receipts/register`, `receipts/reset`).

**Autorisation** : les 5 routes IAP sont bien gardées — `GET /v1/iap/catalogue` et
`GET /v1/me/iap/entitlements` rendent **401** sans jeton (mesuré). Le `player_id` vient du JWT via
`resolvePlayerId` (`iap.controller.ts:173-185`), **jamais du corps** ⇒ pas d'IDOR sur ce domaine.

### 2. Corps réels

`mesures/03-catalogue.json` · `04-balance.json` · `05-entitlements.json` · `06-economy-wallet.json` ·
`07-i18n-fr.json` · `08-purchase-cosm-ok.json` · `09-balance-after.json` ·
`10-entitlements-after.json` · `11-…insufficient` · `12-…already-owned` · `13-…markspack-refused` ·
`14-validate-bogus` · `15-catalogue-noauth`. Commandes et contrôles positifs : `mesures/commandes.md`.

Ensembles de clés (triés) :
- `GET /v1/iap/catalogue` → `{ skus: [...] }`, chaque entrée ⊆ `{bonus_pct, display_name, kind, marks_granted, price_marks, price_store_product_id, sku_id}` — **clés optionnelles omises, jamais nulles** (`iap-catalogue.service.ts:112-115`, spread conditionnel).
- `GET /v1/me/iap/balance` → `{marks_balance}` — **1 clé**.
- `GET /v1/me/iap/entitlements` → `{skus: string[]}` — **1 clé**.
- `POST /v1/me/iap/items/purchase` → `{sku_id}` · `POST /v1/iap/purchase/validate` → `{marks_credited, sku_id}`.

⚠️ **La spec E2E épingle les 9 `sku_id`** (`tests/e2e/operational/iap_catalogue.spec.ts:134-136`)
mais **pas l'ensemble de clés d'une entrée** — ajouter ou retirer `bonus_pct` passerait au vert.
C'est exactement le détecteur que la convention lot 0 (b) réclame.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | type | valeurs possibles | contrainte source (lue, pas recopiée d'un design) |
|---|---|---|---|
| `sku_id` | id opaque, `varchar(64)` | **9 exactement**, ensemble clos | `iap-catalogue.service.ts:20-30` (`EXPECTED_SKU_IDS`) — **asserté au boot**, le processus refuse de démarrer si l'ensemble dérive (`:61-67`) |
| `kind` | enum | `MARKS_PACK` \| `COSMETIC` \| `SAVE_SLOT` \| `SUPPORT` | `iap-sku-catalogue.ts:19` (union TS) + `VALID_KINDS` asserté au boot `iap-catalogue.service.ts:32,69` |
| `display_name` | texte libre EN | 9 littéraux | `iap-sku-catalogue.ts:56,63,71,79,87,93,99,108,117` |
| `price_store_product_id` | id de produit magasin | présent **ssi** `kind ∈ {MARKS_PACK, SUPPORT}` | invariant **asserté au boot** (XOR strict avec `resolveMarksPrice`) `iap-catalogue.service.ts:76-85` |
| `price_marks` | compteur | 50 / 80 / 100 / 200 · tunables `T.ui.iap.cost_callsign_color_marks`, `T.ui.iap.cost_theme_sodium_marks`, `T.econ.marks.save_slot_price` ; **`save_slot_3` = 200 en dur, et c'est canon** (`iap-sku-catalogue.ts:110-113`, `iap_catalogue.md §6` : le prix EST le contenu de la ligne) | `iap.tunables.ts:59-72` — résolus **à chaque lecture** (R2.3), donc une édition BO change le prix affiché sans redéploiement |
| `marks_granted` | compteur | 100 / 600 / 1400 / 3500 / 500 · plages BO `iap_catalogue.md:267-274` (50..500, 100..2000, 500..5000, 1000..10000, 100..2000) | `iap.tunables.ts:32-55` |
| `bonus_pct` | pourcentage | 20 / 40 / 75 · **absent** pour `marks_pack_small` et `support_pack` · plages 0..100, 0..150, 0..200 | `iap.tunables.ts:44-52` + `iap_catalogue.md:271-273` |
| `marks_balance` | compteur ≥ 0 | 0..∞ ; **jamais négatif** — débit gardé `WHERE marks >= amount` (`marks-wallet.repository.ts:66-73`), subvention BO refusée si elle passe sous 0 (`:114`), remboursement **clampé** à 0 (`:120-128`) | ⚠️ **exception R2.2 assumée** : c'est un **scalaire**, pas une bande. Cohérente avec `cash_cents` (`economy.controller.ts:38-39` « R2.2-exempt — monetary balance is player-facing ») |
| `entitlements.skus[]` | liste de `sku_id` | sous-ensemble des 4 SKU en Marks ; **jamais de doublon** — PK composite `(player_id, sku_id)` (`iap_entitlement.ts:32`), et la migration **RÉVOQUE `UPDATE`/`DELETE`** (`0149:33`) ⇒ **un entitlement ne peut jamais être retiré** | `iap-entitlement.repository.ts:34-40` |

### 4. Inventaire M (Mxx → représente)

Cadre 40 « Boutique — le catalogue » (`ecrans-brennar-2.html:1293-1310`), état mesuré : solde 50, entitlements `[]`.

| id | ancre | texte / valeur | représente |
|---|---|---|---|
| M01 | `:1297` `.retour` | « ‹ » | chrome de navigation (exclu du compte) |
| M02 | `:1297` `h3` | « La Boutique » | titre (chrome, exclu) |
| M03 | `:1297` `.sous b` | « **50** » + « Marks » | `marks_balance` |
| M04 | `:1297` `.sous` | « · aucun extra » | cardinal de `entitlements.skus` = 0 |
| M05 | `:1299` `.section-t` | « Packs de Marks » | `kind = MARKS_PACK` |
| M06 | `:1300-1303` `.sku .nom` | « 100 Marks », « 600 Marks », « 1 400 Marks », « 3 500 Marks » | `marks_granted` (ou `display_name` amputé de « Pack — ») |
| M07 | `:1300-1303,1308` `.sku small` | « prix affiché par le magasin » ×5 | placeholder du prix magasin — **sans source** |
| M08 | `:1300-1303,1308` `.btn-filet.store` | « Acheter » ×5 | CTA magasin (→ §Actions) |
| M09 | `:1301-1303` `.chip.bonus` | « +20 % », « +40 % », « +75 % » | `bonus_pct` |
| M10 | `:1304` `.section-t` | « Cosmétiques » | `kind = COSMETIC` |
| M11 | `:1305` `.sku .nom` | « Couleurs de nom » | `display_name` de `cosm_callsign_color` (FR) |
| M12 | `:1305` `.sku small` | « pour votre nom de joueur » | description — **sans source** |
| M13 | `:1305` `.btn-filet.marks` | « 50 Marks » | `price_marks` + CTA |
| M14 | `:1306` `.sku .nom` | « Thème « Nuit au sodium » » | `display_name` de `cosm_dashboard_theme_1` (FR) |
| M15 | `:1306` `.sku small` | « l'habillage du tableau » | description — **sans source** |
| M16 | `:1306` `.btn-filet.marks.dim` | « 80 Marks » + `opacity:.42` (`:436`) | `price_marks` + **abordabilité** (50 < 80) |
| M17 | `:1307` `.section-t` | « Soutien » | `kind = SUPPORT` |
| M18 | `:1308` `.sku .nom` | « Pack de soutien au studio » | `display_name` de `support_pack` (FR) — **et rien sur les 500 Marks (É1)** |

Cadre 41 « un extra possédé, plus de Marks » (`:1312-1328`), état mesuré : solde 0, entitlements `["cosm_callsign_color"]`.

| id | ancre | texte / valeur | représente |
|---|---|---|---|
| M19 | `:1316` `.sous b` | « **0** » + « Mark » | `marks_balance` = 0 (**singulier géré**) |
| M20 | `:1316` `.sous` | « · 1 extra » | cardinal de `entitlements.skus` = 1 |
| M21 | `:1321` `.et-autres` | « … et 2 autres packs » | repli — cardinal dérivé (4 − 2) |
| M22 | `:1323` `.chip.possede` | « Possédé ✓ » | `entitlements.skus` contient `cosm_callsign_color` |
| M23 | `:1324` `.sku small` | « il vous manque 80 Marks » | dérivation `price_marks − marks_balance` = 80 − 0 |

### 5. Inventaire F

**Sans objet — mode maquette.** Le front de cet écran n'existe pas ; aucune colonne F n'a été
jugée, et aucune ligne de la table de couverture n'en porte.

### 6. Non vérifié

| # | ce que je n'ai pas pu trancher | la mesure qui trancherait |
|---|---|---|
| 1 | **Le comportement d'un SKU désactivé.** `IapCatalogueService.listEnabled` **retire** l'entrée du corps (`:106-108`) plutôt que d'y poser un drapeau. Je n'ai pas exercé ce chemin — il exige `PATCH /admin/iap/skus/:sku_id` sous `requireStaffRole('admin')`, hors de mon périmètre (aucune mutation d'état partagé). **La maquette ne dessine aucun état « indisponible »** — et n'en a peut-être pas besoin, puisque l'article **disparaît**. À confirmer : un article qui s'évanouit entre deux ouvertures de l'écran est-il acceptable ? | basculer un SKU en BO sur une base jetable, puis relire `iap/catalogue` |
| 2 | **Le chemin de crédit réel** (`purchase/validate` → succès). Il exige `POST /_test/iap/receipts/register` — un **seam `_test`**. Je ne l'ai pas emprunté : la couche 2 du socle interdit de compter une route `_test` comme une atteignabilité, et j'aurais mesuré une capacité de test, pas de production. **Ce que le corps de succès contient (`{marks_credited, sku_id}`) est donc lu dans le code** (`iap.controller.ts:158,168`), **pas mesuré** — c'est un point **DÉDUIT**, et je le marque comme tel. | enregistrer un reçu par le seam `_test`, valider, relire le solde — en écrivant dans le nom du test que c'est un seam |
| 3 | **La règle d'affichage de l'abordabilité** (ligne 13 de la table) : la maquette grise le bouton dans les deux cadres mais n'affiche « il vous manque … » que dans un seul. Je ne peux pas savoir si c'est une règle (« seulement à solde nul ») ou une omission. | question à l'auteur de la maquette — pas mesurable |
| 4 | **Le prix réel d'un pack.** Il n'existe **nulle part** dans ce dépôt (canon : store-side exclusif). Les `$0.99/$4.99/$9.99/$19.99` de `iap_catalogue.md:141-144,161-164` sont des **prix cibles soumis aux magasins**, pas des valeurs servies. Je ne peux donc pas vérifier que « +20 % » est juste — seulement que le nombre servi correspond au tunable. | une console Play/App Store — hors dépôt |
| 5 | **Ce que valent 50 Marks ailleurs dans le jeu.** J'ai borné mon balayage au domaine IAP + `economy`. Si un autre domaine dépensait des Marks, le cadran de la chaîne 1 changerait. **Mesuré partiellement** : les **3** écrivains de `economy_states.marks` sont énumérés et classés (annexe §Chaînes) ⇒ côté **crédit**, la chaîne est fermée. Côté **débit**, `debitGuarded` n'a qu'un appelant (`iap-purchase.service.ts:46`) — donc les Marks ne se dépensent **que** dans cette boutique. C'est **compté**, pas déduit. | — (fermé) |
| 6 | ⚠️ **Piège de mesure, signalé au dossier suivant** : la commande de lecture que le dossier recommande — `awk 'length($0)<4000'` — **supprime des lignes et décale donc TOUS les numéros**. Le cadre 40 commence à **1293** dans le vrai fichier et à 1285 dans le fichier filtré. J'ai d'abord relevé mes 23 ancres M sur le fichier filtré : **les 23 étaient fausses de 8**. Elles sont ici **re-mesurées sur `ecrans-brennar-2.html` lui-même** (`awk 'NR>=1293 && NR<=1328'`). Le filtrage reste nécessaire pour LIRE ; il ne doit jamais servir à CITER. | `awk 'NR>=N && NR<=M {printf "%d\t%s\n", NR, substr($0,1,150)}'` sur le fichier d'origine |
| 7 | **Les PNG de référence** (`boutique-canon.png`, `boutique-extra-possede.png`) : je ne les ai pas ouverts. Mon inventaire M vient de la **source HTML**, qui est le territoire ; un PNG en est un rendu, et le dossier les dit **non ratifiés**. Si le PNG montrait un élément absent du HTML, je l'aurais manqué. | diff visuel — c'est le travail du juge visuel, pas le mien |
