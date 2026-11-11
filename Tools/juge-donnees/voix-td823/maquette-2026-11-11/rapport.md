# Juge données ⊥ — TD-823 « les VOIX » (㉛ Loi · ㉝ Démolition · ㉓ Boutique) — mode **maquette** — 2026-11-11

# VERDICT : **NON** (non ratifiable en l'état)

**X-Server-Build : avant `8d0184a4` — après `8d0184a4`** (`mesures/build-avant.txt`, `mesures/build-apres.txt`).
Compte jetable : `jd6-1794427008` (`mesures/compte.txt`). Pile intacte : aucun POST d'action, aucun
redémarrage, aucune migration ; les seuls POST sont `auth/signup` et `session/open` sur **mon** compte.
Jetons masqués dans `mesures/01-signup.json`.

## En une phrase

Sur les **25 éléments de voix** que les trois écrans dessinent, **15 ont une source** (servie ou prévue
par le design approuvé `949e5613`) et **10 n'en ont aucune** ; **4 écarts BLOQUANTS** restent, dont deux
qui ne sont pas des trous de couverture mais des **règles fausses** — la règle d'arbitrage de ㉓ contredit
la maquette et rend une des trois répliques ratifiées **inatteignable**, et la désignation du locuteur de
la **fiche** de ㉝ retombe sur un choix **par position** que ce lot existe précisément pour supprimer.

---

## Convention d'indexation des cadres (à lire avant toute vérification)

Les cadres sont indexés **0-based** sur les **170** occurrences de `<div class="cadre">`
(`mesures/balayage-voix.txt` : `Counter({'cadre': 170, 'cadre-b': 5})` — les 5 `cadre-b` sont **exclus**).
Cette base est celle qui reproduit les repères du dossier (㉓ ≈ 98-100 : mesuré **98, 99, 100**).

⚠️ **Piège payé ici, et il annulait la moitié de l'inventaire** : l'étiquette **OUVRE** son cadre
(`<div class="cadre"><div class="etiquette">…`), mais le cadre **suivant** commence souvent sur la
**même ligne physique**. Un appariement « étiquette précédente sur la même ligne » décale **tout de +1**.
Premier passage (`mesures/voix-extraites.txt`) : décalé. Passage retenu
(`mesures/voix-inventaire.txt`) : appariement par **offset de caractère**, cadre par cadre. Les deux
sorties sont gardées pour que l'écart se relise.

---

## A. Écarts à consigner — par écran

### ㉛ Loi — cadres #67 à #72 (L4888-L4900), bande `.pl-dit`, **6** cadres

| # | information | B | M | statut | preuve |
|---|---|---|---|---|---|
| **L-1** | **M8 « la planque »** — l'élément fuité est **nommé** dans la réplique de #69 | **B⁻** | ● | **forme F → lot back** | maquette L4894 « Il a donné **la planque** et le nom de Lt. Hara » · base : `legal.ts:369` `items_leaked: jsonb('items_leaked').notNull().default([])` et `:361` `knowledge_set_ref: jsonb('knowledge_set_ref')` ; **aucune projection joueur** ne les porte (`ActiveCaseView` = 5 clés, `legal.types.ts:147-167`) |
| **L-2** | **M9 « Lt. Hara »** — un **second** lieutenant, distinct de l'accusé | **B⁻** | ● | **forme F → lot back** | même source ; `defendantLabel` (`legal.types.ts:151`) nomme l'**accusé** (maquette #67 : « Lt. Tull »), jamais le lieutenant **fuité** |
| **L-3** | **M6 « À vous de dire. L'accord ferme le dossier… »** (#71) + CTA « **ACCEPTER L'ACCORD** » | – | ● | **dessiné sans source** | la route d'action **existe** (`legal.controller.ts:189` `@Post('me/legal/cases/:id/plea')`) mais **aucune clé de lecture** ne dit qu'un accord est **offert** : `ActiveCaseView` = `caseId, defendantLabel, chargeSeverity, daysRemaining, leak`. Un CTA atteignable dont l'**état d'offre** n'est pas servi. |
| **L-4** | **M7 « Je ne peux pas vous dire s'il va tenir »** (#72) | – | ● | **dessiné sans source** (différé **assumé**) | `BurnRiskBucket` est **déclaré** (`legal.types.ts:77`) et **délibérément non projeté** (`:68` « Decision #6 (RATIFIÉ 2026-06-30) : `burn_risk_score` is NEVER a client scalar »). La maquette **ratifie** le registre au même endroit : « ⛔ Le jeu ne vous donnera jamais de chiffre là-dessus. Vous n'aurez que ce **signe** » (`mesures/gestes.txt`, cadre#72). ⇒ le **signe** doit arriver par une surface ; elle n'est pas nommée (voir « non vérifié » point 3). |
| **L-5** | **M3 « Le commis d'office ne coûte rien… »** (#68) | – | ● | **dessiné sans source** (déclencheur = navigation client) | le design le classe « sous-écran de navigation » ; mesuré, rien dans `me/legal` ne discrimine cet état. **Conforme au design, consigné comme ASSUMÉ.** |
| **L-6** | `loi.dit.*` : **0 clé** dans le registre aujourd'hui | D | ● | prévu, non servi | `mesures/` : `python3` sur `string_table.ts` — `loi.dit.` = **0 ligne** ; `loi.` = **56 lignes**. Design `949e5613` §6.2 en prévoit **3**. |

**Mesuré sur la pile** : `GET /v1/me/legal` → racine **2** clés `['activeCases','lawyerRoster']`, les deux
**vides** sur compte frais (`mesures/brut-me-legal.json`, `mesures/corps-reels.txt`). ⇒ les 5 clés de
`ActiveCaseView` sont lues sur l'**interface** (`legal.types.ts:147-167`), pas sur un corps : **dimensionnement
dû** (voir « non vérifié » point 1). Aucun `speaker` aujourd'hui — **mesuré, pas déduit**.

### ㉝ Démolition — cadres #79 à #84 (L5067-L5077) **+ #149** (L6824), bande `.dm-dit`, **7** cadres

**Les cadres, NOMMÉS** (le dossier le demandait explicitement) :

| cadre | L | étiquette | bande |
|---|---|---|---|
| #79 | 5067 | « L'organisation frotte » | **voix** — Lt. Rin : « On a trop de choses au même endroit… » |
| #80 | 5069 | « Ce bâtiment vous coûte » | **voix** — Lt. Rin : « Celui-là, on le garde par habitude… » |
| #81 | 5071 | « Le raser — confirmer » | **narration, sans orateur** — « Une fois rasé, on ne le remet pas… » |
| #82 | 5073 | « Vous avez déjà tranché aujourd'hui » | **narration, sans orateur** — « Vous avez déjà tranché une chose de structure aujourd'hui. » |
| #83 | 5075 | « La parcelle est libre » | **voix** — Lt. Rin : « Deux propositions… » |
| #84 | 5077 | « L'offre s'est fermée » | **voix** — Lt. Rin : « Trop tard pour celle-là. » |
| **#149** | **6824** | **« Vos 4 sites — la liste qui mène à la fiche »** | **voix** — Lt. Rin : « On a trop de choses au même endroit… » (**même réplique que #79**) |

| # | information | B | M | statut | preuve |
|---|---|---|---|---|---|
| **D-1 ★ BLOQUANT** | **M12 — la réplique de la FICHE (#80) n'a pas de locuteur servi**, et la seule désignation disponible est **une position de tableau** | ●(partiel) | ● | **règle fausse / défaut de design** | Le design `949e5613` §5.1 pose `speaker` sur `GET /v1/friction/state` **seulement**, et décide que « le client **garde** sa préférence pour le lieutenant du site **sur les écrans de fiche** ». Mesuré : la route de la fiche, `GET /v1/friction/nodes/:buildingId`, rend **5 clés** — `output_value_bucket, friction_load_bucket, output_to_friction_ratio_bucket, decommission_cost_bucket, neighbor_count` — **ni `speaker`, ni un id, ni un nom** (`mesures/brut-friction-nodes.json`). Le client doit donc puiser dans `buildings[].lieutenant_ids`, et **sur un compte frais ce tableau en porte DEUX** : `['01a1cc2f-3667-74dd-93f0-5500aa407819','01a1cc2f-3671-7fe7-a78f-ecc82441fd81']` (`mesures/brut-me-buildings.json`) — le grant de bienvenue affecte **les deux** lieutenants au **même** bâtiment (`onboarding-grant.service.ts:529` et `:544`, `assignedBuildingId: labBuildingId` ; `:531` `'primary'` / `:546` `'understudy'`). Et l'ordre de ce tableau est **explicitement sans signification de désignation** : `district-interior.repository.ts:265-266` — « each array **SORTED by `lieutenant_id`** (⛔ ordre stable exigé — D10: without it, two identical reads could render two different orders and turn an equality assertion **intermittent** on a rationed CI slot) ». ⇒ **un tri posé pour la stabilité d'un test devient la règle qui choisit qui parle.** C'est exactement « le client ne choisit pas par position » (TD-952) que le design cite en §2 comme la raison d'être du lot. **Aucun départage n'est écrit pour un site à ≥ 2 lieutenants, et le cas est atteignable sur le compte le plus banal.** |
| **D-2 ★ BLOQUANT** | **la même bande `.dm-dit` porte de la NARRATION** (#81, #82) ; aucune garde n'est nommée | – | ● | **dessiné sans source, sans détecteur** | Le design §3.2 conclut « le client ne doit donc **pas** y poser un nom. **Hors périmètre back.** » — mais `speaker` devient servi et non nul sur `friction/state`, et **rien** (ni falsifiable, ni garde, ni clé distincte) ne sépare les 5 bandes à orateur des 2 bandes de narration. Un rendeur qui préfixe `speaker.name` sur `.dm-dit` met « Lt. Rin : » devant « Une fois rasé, on ne le remet pas. ». La classe est connue du dépôt (`Dit(…)` rend `return` sur un nom vide, cité par le design §5.2) mais **ce patron protège du nom ABSENT, pas du nom EN TROP**. |
| **D-3 IMPORTANT** | **l'inventaire ㉝ du design approuvé est sous-compté** | – | ● | **compte faux dans un document APPROUVÉ** | Design §3.2 : « **4** cadres avec locuteur **+ 2** cadres sans locuteur ». **Mesuré : 7 bandes `.dm-dit`, dont 5 à orateur et 2 de narration** (`mesures/localisation-bandes.txt`, `mesures/voix-inventaire.txt`). La 5ᵉ est **cadre#149, L6826**, un écran `demo6` (`mesures/cadre-6826.txt` : `classes de panneau: ['demo6']`) titré « Vos 4 sites — la liste qui mène à la fiche ». Elle **ne crée pas de clé neuve** (réplique identique à #79) mais c'est un **5ᵉ site de rendu** que `speaker` doit alimenter, et il est absent du périmètre écrit. |
| **D-4 MINEUR (atelier)** | **apostrophe DROITE** dans le titre du cadre #149 | – | ● | défaut de la maquette | `mesures/cadre-6826.txt` : `L 5069 'L’organisation frotte'` (U+2019) **contre** `L 6826 "L'organisation frotte"` (U+0027). Le design §6.1 fait **recopier des littéraux de la maquette** ; recopié depuis ce cadre, R1 (apostrophe droite) rougit. |
| **D-5** | `demolition.dit.*` : **4 clés × 2 locales = 8 valeurs**, **servies** | ● | ● | ✔ | mesuré `python3` sur `string_table.ts` — EN `:2684-2687`, FR `:5593-5596` **sur `main`** / FR `:5600-5603` **sur `dette/b2@949e5613`** (voir M-1 ci-dessous) |

**Mesuré sur la pile** : `GET /v1/friction/state` → racine **5** clés exactement
`['friction_bucket','friction_node_count','last_evaluated_tick','penalty_active','perimeter_site_count']`
(`mesures/brut-friction-state.json`). ⇒ **la racine de 5 du design est CONFIRMÉE sur un corps réel**,
contre le docblock périmé que la v1 du design avait lu. Aucun `speaker`.

### ㉓ Boutique — cadres #98, #99, #100 (L5465-L5473), bande `.voix`, **3** cadres

**La règle d'arbitrage de l'orchestrateur, VÉRIFIÉE sur la maquette et sur les sources.**

Règle à vérifier : *UNE seule réplique à la fois, par priorité* : « **tout claqué** » (solde = 0 **et** ≥ 1
acquis) > « **à vendre** » (solde > 0) > « **Marks dehors** ».

Ce que la maquette dessine, mesuré cadre par cadre (`mesures/boutique-cadres.txt`) :

| cadre | étagère affichée | solde affiché | autre | réplique |
|---|---|---|---|---|
| #98 | **« Les extras — payés en Marks »** | **50** MARKS | — | « Ce qui est là est **à vendre**… » |
| #99 | **« Les Marks — payés au magasin »** | **50** MARKS | — | « Les Marks, c'est **dehors** qu'on les achète… » |
| #100 | **« Les extras — payés en Marks »** | **0** MARKS | pastille **ACQUIS** sur « Couleurs de nom » | « Vous avez **tout claqué** d'un coup… » |

| # | information | B | M | statut | preuve |
|---|---|---|---|---|---|
| **S-1 ★ BLOQUANT** | **la règle de priorité CONTREDIT la maquette sur l'onglet « Marks »** | ● | ● | **règle fausse** | Cadre #99 : étagère **Marks**, solde **50**. Appliquée telle quelle, la priorité met « à vendre » (solde > 0) **au-dessus** de « Marks dehors » ⇒ sur l'onglet Marks le joueur lirait « **Ce qui est là est à vendre** » là où la maquette écrit « **Les Marks, c'est dehors qu'on les achète. Moi je vous les compte, je ne les vends pas.** » — et cette seconde phrase est précisément celle que le design D1 cite (§1, option A **ÉCARTÉE**) comme **la mesure qui prouve que Wexler n'est pas un lieutenant du joueur**. ⇒ **la règle d'arbitrage casse la réplique qui porte la décision f2.** Le discriminant de la maquette est **à deux dimensions** (onglet **×** solde), pas une priorité à une dimension. |
| **S-2 ★ BLOQUANT** | **« Marks dehors » devient INATTEIGNABLE** sous cette priorité | ● | ● | **réplique morte** | Sous la priorité, « Marks dehors » n'est atteint que si `NOT(solde=0 ∧ ≥1 acquis) ∧ NOT(solde>0)` = **solde = 0 ET 0 acquis**. Mesuré : le don de bienvenue vaut **50** (`auth.service.ts:155` `const WELCOME_GRANT_MARKS = 50;`) et le **seul** article à portée du catalogue coûte **50** (`mesures/brut-iap-catalogue.json` : `cosm_callsign_color … "price_marks": 50`, les autres à 80/100/200) ; tout article payé en Marks **est** un `entitlement`. ⇒ **descendre à 0 implique ≥ 1 acquis**, et « solde 0 + 0 acquis » n'a **aucun chemin d'écriture**. La maquette le dit d'elle-même (note ㉗, `mesures/note-boutique.txt`) : « Les **3** écrivains de `economy_states.marks` sont le don de bienvenue (**50**, une fois), un reçu vérifié et une subvention staff. Le don vaut **exactement** le prix du seul article atteignable. » ⇒ une des **trois** répliques ratifiées serait livrée **morte**. |
| **S-3 IMPORTANT** | **la règle du DESIGN est, elle, AMBIGUË sur une case** | D | ● | design incomplet | Design §6.3 : `…a_vendre` ⇐ « étagère extras, `marks_balance > 0` » · `…les_marks_c_est_dehors` ⇐ « étagère **Marks** » · `…tout_claque` ⇐ « `marks_balance === 0` ». Pour (**étagère Marks**, **solde 0**) **deux lignes matchent** et aucune priorité n'est écrite. L'orchestrateur a raison de vouloir un départage ; c'est **l'ordre choisi** qui est faux (S-1). |
| **S-4 IMPORTANT** | le design **omet** la moitié « ≥ 1 acquis » | D | ● | design plus faible que l'arbitrage | Design §6.3 déclenche « tout claqué » sur `marks_balance === 0` **seul**. Un joueur à 0 Mark **sans rien avoir acheté** s'entendrait dire « Vous avez **tout claqué** d'un coup » — un mensonge. ⇒ **la condition « ≥ 1 acquis » de l'orchestrateur est la bonne**, et elle est **servable** : `GET /v1/me/iap/entitlements` → `skus` (mesuré `[]` sur compte frais, `mesures/brut-me-iap-entitlements.json`). **À retenir ; seule la priorité est à refaire.** |
| **S-5** | les **trois** conditions sont-elles distinguables par les clés servies ? | ● | ● | **OUI, à deux dimensions** | `marks_balance` : `GET /v1/me/iap/balance` → `{'marks_balance': 50}` (mesuré). « ≥ 1 acquis » : `GET /v1/me/iap/entitlements` → `skus` (mesuré). **L'étagère n'est PAS une donnée back** : c'est l'onglet du client. ⇒ 2 clés back + 1 état client suffisent **si la règle est (onglet × solde × acquis)**. |
| **S-6** | **M19 — le buste `#buste-homburg`** (portrait du locuteur, ×3) | – | ● | **ASSUMÉ à consigner** | `mesures/voix-inventaire.txt` ; aucun champ back ne désigne un portrait. Acceptable pour un **PNJ fixe** (constante d'asset client), mais ce n'est écrit **nulle part** dans le design — qui ne compte que « 5 clés i18n ». ㉛ et ㉝ n'ont **aucun** portrait d'orateur (le buste de ㉛ est celui de l'**accusé**, `pl-av` / `#buste-casquette`, L4890) : la forme de ㉓ est bien **différente**, et l'écart n'est pas consigné. |
| **S-7** | `boutique.dit.*` et `boutique.locuteur.*` : **0 clé** aujourd'hui | D | ● | prévu, non servi | mesuré : `boutique.dit.` = **0 ligne**, `boutique.locuteur.` = **0 ligne**, `boutique.` = **46 lignes** |

### Transverse

| # | information | statut | preuve |
|---|---|---|---|
| **M-1 IMPORTANT** | **le diagnostic d'ancres §0.2 du design approuvé est FAUX**, et il envoie le `coder` sur une mauvaise ligne | **prémisse fausse dans un document APPROUVÉ** | §0.2 affirme : « `grep -rn` a **décalé** des numéros de ligne de **+7** … `python3` sur le même fichier les lit à `:5600-5603` ⇒ **toute ancre de ce document est issue de `python3`** ». **Mesuré, `python3` dans les DEUX arbres** (`git show <ref>:…` → `.split('\n')`, aucun `grep`) : sur **`main`** (6283 lignes) les FR sont à **`:5593-5596`** et Nestor FR à **`:3623`** ; sur **`dette/b2@949e5613`** (6301 lignes) elles sont à **`:5600-5603`** et Nestor FR à **`:3630`**. ⇒ **le « +7 » n'est pas un artefact de `grep` : c'est l'écart entre deux ARBRES**, exactement la classe que le design nomme lui-même en §0.1 (« une ancre lue dans un autre worktree est périmée par construction ») — **appliquée à lui-même et mal attribuée**. Conséquence concrète : §6.1 ordonne de recopier le gabarit FR depuis **`string_table.ts:5602`** ; sur `main` **aujourd'hui**, `:5602` est `'carnet.bloc.annonce': 'à venir'` — **ni guillemets, ni insécable, ni `{nom}`**. Un `coder` qui travaille avant le merge de b2 recopie une ligne inerte. |
| **M-2** | `speaker` n'est servi **nulle part** aujourd'hui | ✔ (confirme le design) | mesuré : `me/legal` = 2 clés, `friction/state` = 5 clés, `friction/nodes/:id` = 5 clés, `lieutenants` = 7 clés par ligne — **aucune** ne porte `speaker` |
| **M-3** | le **nom** du lieutenant est **déjà servi** | ✔ | `GET /v1/lieutenants` → `lieutenants[].name` = `"Lt. Tovah"`, `"Lt. Tull"` (`mesures/brut-lieutenants.json`). ⇒ le placeholder `'Lieutenant'` passé par le grant (`onboarding-grant.service.ts:525`, `:540`) **est bien remplacé** par le pool. Le design le dit ; **c'est confirmé sur un corps réel**, pas sur une lecture de code. |
| **M-4** | le cas dégénéré « **ex æquo** » du design est **défusé sur le chemin de production** | ✔ | le grant pose **1 `primary` + 1 `understudy`** (`onboarding-grant.service.ts:531` / `:546`), donc **un seul candidat** O2′ sur compte frais — malgré `recruited_at` à `defaultNow()` (`lieutenant.ts:111`) dans **une seule transaction** (`:518` « Both recruits share `tx` »), qui aurait donné deux `recruited_at` **identiques** si les deux avaient été `primary`. **La branche `null` n'est donc pas morte, mais elle ne mord pas le compte neuf** — et le dépôt sait déjà que `recruited_at` peut faire égalité : `lieutenant.repository.ts:1431` « recruited_at **alone could tie** », départagé là-bas par `lieutenant_id`. |

---

## B. « Passé à côté ? » — pour l'user

Clés **servies** (mesurées), qu'**aucune** bande de voix ne dessine. Classées par intérêt joueur décroissant.

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | `activeCases[].daysRemaining` (`GET /v1/me/legal`, `legal.types.ts:161`) | combien de **jours** avant le jugement (le corps de #67 l'affiche : « **9** jours avant le jugement ») | **utile ici** : c'est la seule pression de temps de ㉛, et une voix la porte mieux qu'un chiffre — « il reste trois jours » change le ton de la même scène. **La plus rentable des sept.** | ★★★ |
| **Q2** | `activeCases[].chargeSeverity` (`legal.types.ts:156`, enum fermé `misdemeanor\|felony_low\|felony_high\|major_crime`) | la **gravité** de ce qu'on lui reproche (corps de #67 : « un délit sérieux ») | **utile ici** : 4 valeurs fermées ⇒ 4 tons, et c'est ce qui distingue « un coursier pris » de « on vous tient » sans inventer un chiffre | ★★★ |
| **Q3** | `perimeter_site_count` (`GET /v1/friction/state`, mesuré = 0) | **combien** de sites se gênent | **utile ici** : la voix de ㉝ dit « on a trop de choses au même endroit » **sans jamais dire combien**, alors que le corps du même cadre affiche « **7** endroits se gênent entre eux ». La voix est plus pauvre que l'écran qu'elle commente. | ★★☆ |
| **Q4** | `activeCases[].defendantLabel` (`legal.types.ts:151`) | **qui** a été arrêté | **plutôt pas** : le corps le dit déjà en plaque (#67 : « Lt. Tull »), et la voix parle **de** lui à la 3ᵉ personne. À garder en réserve. | ★★☆ |
| **Q5** | `lawyerRoster[].lawyerNameI18n` / `.tier` (`legal.types.ts:202`, `:218`) | **le nom** de l'avocat, et son rang | **utile sur #68 et #72** : la réplique de #68 parle des **trois rangs** de façon générique, et #72 dit « **votre avocat** » sans le nommer alors que le roster porte « Maître Kelmar ». | ★★☆ |
| Q6 | `output_to_friction_ratio_bucket`, `decommission_cost_bucket` (`GET /v1/friction/nodes/:id`) | ce que le site rend / ce que le raser coûte | **déjà repris** en substance par la réplique de #80 (« il ne rend presque rien ») ; rien à gagner | ★☆☆ |
| Q7 | `last_evaluated_tick` (`friction/state`, mesuré `null`) | quand le calcul a tourné | **pas ici** : c'est de la plomberie | ☆☆☆ |

---

## C. Lots back suggérés (B⁻ dessiné — forme F)

| # | colonne / clé | table / route | maquette | preuve |
|---|---|---|---|---|
| **LB-1** | `items_leaked` **+** `knowledge_set_ref` (jsonb) | `legal_case` (`db/schema/legal.ts:369`, `:361`) → `GET /v1/me/legal` | **M8** « la planque » (#69) — et le corps du même écran dessine la **liste entière** (« où est la planque · qui est le lieutenant · un segment de route · … », `lourd`/`mineur`) | écrit, relu et mis à jour par la production (`legal-case.repository.ts:417` `items_leaked: newItemsLeaked`), **jamais projeté** : `ActiveCaseView` = 5 clés. `KnowledgeItem {id,type,label,importance}` est **déjà typé** (`legal.types.ts:82-91`). ⇒ **forme F exacte.** Rendrait la 2ᵉ réplique de ㉛ **littérale** au lieu de la version **dégradée** que le design §6.2 est obligé de générer. |
| **LB-2** | `primary_or_understudy` | `lieutenant` (`db/schema/lieutenant.ts:118`, enum `:17` `['primary','understudy']`) | **M10** (le locuteur de ㉝) | **mesuré non projeté** : `GET /v1/lieutenants` rend **7** clés par ligne — `lieutenant_id, name, archetype, op_state_band, rule_count_band, tenure_bucket, precursor_stock_band` — **pas** celle-là (`mesures/brut-lieutenants.json`). C'est le **discriminant de la règle O2′** : sans lui, aucun client ni aucun juge ne peut vérifier que le `speaker` servi est bien le bras droit. |
| **LB-3** | **`speaker` sur `GET /v1/friction/nodes/:buildingId`** | `friction-projection` / fiche de site | **M12** (#80, « Celui-là, on le garde par habitude ») | la route de la **fiche** est celle qui porte cette réplique et elle rend **5 clés sans aucun locuteur** (`mesures/brut-friction-nodes.json`). Le design pose `speaker` sur `friction/state` seulement ⇒ **D-1**. Un `speaker` **par site** (ou un `lieutenant` nommé dans la fiche) ferme la plaie sans que le client choisisse. |
| **LB-4** | un **état d'offre d'accord** (`plea_available` ou une bande) | `legal_case` → `GET /v1/me/legal` | **M6** (#71) + CTA « ACCEPTER L'ACCORD » | la route d'action existe (`legal.controller.ts:189`) ; **rien** dans la projection ne dit qu'elle est offerte. Un CTA sans état servi est un geste que le client **devine**. |
| LB-5 | une bande de **nervosité d'avocat** | `lawyers.burn_risk_score` → surface à décider | **M7** (#72) | ⚠️ **bloqué par une décision RATIFIÉE** (`legal.types.ts:68`, décision #6 du 2026-06-30 : jamais un scalaire client ; « the player sees only the qualitative **Exception** »). ⇒ **pas un lot back tant que la surface Exceptions n'a pas été mesurée** (non vérifié, point 3). Listé pour que personne ne le ré-ouvre sans lire cette décision. |

---

## D. Actions : routes `@Post` joueur ↔ CTA de la maquette

Routes d'**écriture** joueur des modules du domaine (sous `@UseGuards(JwtAuthGuard)`, hors `_test` / admin),
**comptées** : ㉛ **5** · ㉝ **2** · ㉓ **2** = **9**.

⚠️ **Motif durci, et il avait raté une route.** Mon premier balayage n'énumérait que
`@Get/@Post/@Patch/@Delete` : il rendait « ㉛ = 4 écritures », un compte **plausible**, donc dangereux.
`@Put` manquait à la liste des verbes ⇒ `PUT me/legal/lawyers/:id/retainer` (`legal.controller.ts:134`)
était **invisible**. Le compte ci-dessous vient d'un balayage sur **les 8 verbes** HTTP, avec la présence
du garde vérifiée dans les 3 lignes suivantes. (Socle §4.2 : un motif qui rend le résultat espéré est le
moment de le durcir.)

| route | ancre | CTA de la maquette (cadre) | statut |
|---|---|---|---|
| `POST me/legal/lawyers` | `legal.controller.ts:102` | « **LUI TROUVER UN AVOCAT** » (#67) · « **PRENDRE LE CABINET** » (#68) · « **LUI PRENDRE UN VRAI AVOCAT** » (#69) | ✔ apparié |
| **`PUT me/legal/lawyers/:id/retainer`** | **`:134`** | **aucun CTA** dans les 6 cadres de ㉛ | **question** : route sans geste dessiné (la « provision mensuelle » n'apparaît nulle part sur l'écran) |
| `POST me/legal/cases/:id/lawyer` | `:161` | « **LE RETIRER DE L'AFFAIRE** / et repartir d'un cabinet » (#72) | ✔ apparié |
| `POST me/legal/cases/:id/plea` | `:189` | « **ACCEPTER L'ACCORD** » (#71) | ⚠️ CTA présent, **état d'offre non servi** ⇒ **LB-4** |
| `POST me/legal/cases/:id/payoff` | `:209` | **aucun CTA** dans les 6 cadres de ㉛ | **question** : route sans geste dessiné |
| `POST friction/nodes/:buildingId/decommission` | `decommission.controller.ts:53` | « **LE RASER** » (#80) · « **CONFIRMER — LE RASER** » (#81, #82) | ✔ apparié |
| `POST friction/replacement-options/:id/pick` | `replacement-option.controller.ts:74` | « **PRENDRE LA PREMIÈRE** » (#83) · « **PRENDRE L'AUTRE** » (#84) | ✔ apparié |
| `POST me/iap/items/purchase` | `iap.controller.ts:100` | les « acheter » de la vitrine (#98, #100) | ✔ apparié (hors bande de voix) |
| `POST iap/purchase/validate` | `iap.controller.ts:159` | **aucun CTA** | **question** ; la maquette le consigne elle-même : « les cinq « acheter » **n'aboutissent dans aucun environnement** — aucun vérificateur de reçu n'est câblé » (`mesures/note-boutique.txt`) |

⇒ **Aucune bande de voix ne porte de CTA** sur les trois écrans : la voix **commente** le geste, elle ne
le déclenche jamais. C'est uniforme sur 25/25 éléments — **une propriété**, pas un hasard, et elle vaut
d'être écrite avant qu'un lot ne la casse.

---

## E. Table de couverture complète

Mode maquette ⇒ **pas de colonne F**. Statuts : `● ●` servi **et** dessiné · `● –` **« passé à côté ? »** ·
`– ●` dessiné sans source (**lot back** si B⁻, sinon **ASSUMÉ à consigner**) · `D` = prévu par le design
approuvé, **pas encore servi**.

| # | information | B | M | statut |
|---|---|---|---|---|
| 1 | `activeCases` (cardinal) | ● | – | passé à côté ? |
| 2 | `activeCases[].caseId` | ● | – | passé à côté ? (plomberie) |
| 3 | `activeCases[].defendantLabel` | ● | – | **Q4** |
| 4 | `activeCases[].chargeSeverity` | ● | – | **Q2** |
| 5 | `activeCases[].daysRemaining` | ● | – | **Q1** |
| 6 | `activeCases[].leak` ↔ **M2** (silent), **M4** (low/significant), **M5** (full_dump) | ● | ● | ✔ |
| 7 | `lawyerRoster` ↔ **Q5** | ● | – | passé à côté ? |
| 8 | `me/legal.speaker{id,name}` ↔ **M1** « Lt. Rin » ×6 | **D** | ● | prévu, non servi |
| 9 | `friction_bucket` ↔ **M11** | ● | ● | ✔ |
| 10 | `penalty_active` ↔ **M11** | ● | ● | ✔ |
| 11 | `friction_node_count` ↔ **M11** | ● | ● | ✔ |
| 12 | `perimeter_site_count` | ● | – | **Q3** |
| 13 | `last_evaluated_tick` | ● | – | **Q7** |
| 14 | `friction/state.speaker{id,name}` ↔ **M10** « Lt. Rin » ×5 | **D** | ● | prévu, non servi — **mais D-1 / D-3** |
| 15 | `friction/nodes` (4 bandes + `neighbor_count`) ↔ **M12** | ● | ● | ✔ (**sans locuteur** ⇒ **D-1**) |
| 16 | `marks_balance` ↔ **M24** (solde 50/50/0) | ● | ● | ✔ |
| 17 | `me/iap/entitlements.skus` ↔ **M25** (pastille ACQUIS) | ● | ● | ✔ |
| 18 | `lieutenants[].name` | ● | – | passé à côté ? (le nom existe ; c'est la **désignation** qui manque) |
| 19 | `buildings[].lieutenant_ids` | ● | – | passé à côté ? — **et c'est le piège D-1** |
| 20 | `demolition.dit.*` (4×2) ↔ **M11, M12, M13, M14** | ● | ● | ✔ |
| 21 | `loi.dit.*` (3) ↔ **M2, M4, M5** | **D** | ● | prévu, non servi |
| 22 | `boutique.dit.*` + `boutique.locuteur.*` (5) ↔ **M17, M18, M20, M22** | **D** | ● | prévu, non servi — **mais S-1 / S-2** |
| 23 | **M3** « Le commis d'office ne coûte rien… » (#68) | – | ● | ASSUMÉ (navigation client) — **L-5** |
| 24 | **M6** « À vous de dire. L'accord ferme… » (#71) | – | ● | **DÉFAUT** → **LB-4** |
| 25 | **M7** « Je ne peux pas vous dire s'il va tenir » (#72) | – | ● | ASSUMÉ différé (décision #6) — **L-4** |
| 26 | **M8** « la planque » (élément fuité nommé) | **B⁻** | ● | **forme F → LB-1** |
| 27 | **M9** « Lt. Hara » (second lieutenant nommé) | **B⁻** | ● | **forme F → LB-1** |
| 28 | **M15** narration sans orateur (#81) | – | ● | ASSUMÉ — **sans détecteur, D-2** |
| 29 | **M16** narration sans orateur (#82) | – | ● | ASSUMÉ — **sans détecteur, D-2** |
| 30 | **M19** buste `#buste-homburg` (portrait de Wexler, ×3) | – | ● | **ASSUMÉ à consigner — S-6** |
| 31 | **M21** « Les Marks, c'est dehors qu'on les achète… » (#99) | – | ● | **DÉFAUT — S-1 / S-2** (déclencheur = onglet client ; rendue morte par la priorité) |
| 32 | **M23** l'étagère affichée (onglet extras / Marks) | – | ● | ASSUMÉ (état client, pas une donnée back) |

**Comptes, recomptés par script** — `mesures/controle-arithmetique.py` :

```
### RUN RÉEL ###
|B|                 = 22
|M non apparies|    = 10   (sur 25 elements M)
|F sans source|     = 0   (mode maquette : pas de colonne F)
somme               = 32
lignes de la table  = 32
appariements orphelins = aucun
VERDICT ARITHMETIQUE : OK
EXIT=0

### CONTRÔLE NÉGATIF (faute injectée : M23 déclaré apparié) ###
somme               = 31
lignes de la table  = 32
VERDICT ARITHMETIQUE : ROUGE
EXIT=1
```

⇒ **|B| 22 + |M non appariés| 10 = 32 = nombre de lignes.** Le script porte aussi une **anti-vacuité**
(B ou M vide ⇒ `AssertionError`) et un **contrôle d'orphelins** (tout appariement cite un id B existant).

---

## F. Ce que je n'ai pas pu vérifier

1. **`GET /v1/me/legal` n'a jamais rendu une affaire.** Sur compte frais, `activeCases` et `lawyerRoster`
   sont **vides** (`mesures/brut-me-legal.json`). Les 5 clés de `ActiveCaseView` et les valeurs possibles de
   `leak` sont donc lues sur l'**interface** (`legal.types.ts:147-167`, `:63`) — **DÉDUIT**, pas compté sur un
   corps. **Dimensionnement** : le chemin d'écriture est `courier-detection.service.ts:740`
   (`buildKnowledgeSetForCourier`) ⇒ il faut une **détection de coursier**, donc des ticks de simulation, pas
   une action joueur directe. **La mesure qui trancherait** : un semis `_test` du module legal
   (`legal-test.controller.ts` existe) puis re-lecture de `me/legal` — **non fait**, le dossier interdit de
   poser quoi que ce soit de partagé et je n'ai pas voulu écrire sur la pile au-delà de mon compte.
2. **Les 4 bandes de `friction/nodes/:buildingId` n'ont été lues que sur UN état** (compte frais :
   `neighbor_count: 0`, `friction_load_bucket: 'light'`). Les valeurs possibles de ces 4 bandes ne sont pas
   recopiées d'une contrainte source dans ce rapport — **non mesuré**.
3. **La surface par laquelle arriverait le « signe » de l'avocat nerveux (M7) n'a pas été mesurée.**
   `legal.types.ts:71` dit que le joueur voit « the qualitative **Exception** » ; je n'ai **pas** interrogé la
   route des exceptions pour vérifier qu'un signal de burn y est servi. **La mesure qui trancherait** :
   lire la projection des exceptions et y chercher un type d'événement d'avocat.
4. **Je n'ai pas vérifié le `dette/b2` au-delà de `string_table.ts`.** Les ancres du design dans
   `friction-projection.service.ts`, `demolition.module.ts`, `lieutenant.repository.ts` sont citées depuis le
   design ; je n'ai re-mesuré **que** `main` pour les routes et le schéma. Un décalage de lignes du même type
   que **M-1** est donc possible sur ces fichiers — **non mesuré**.
   (Contre-mesure partielle : `@Get('friction/state')` est à **`:35`** sur `main` ; le design écrit `:33`.)
5. **`cadre-b`** : 5 cadres portent la classe `cadre-b` et sont **exclus** de mon indexation. Je n'ai pas
   vérifié qu'aucun d'eux ne porte une bande de voix des trois écrans — **le balayage par classe le couvre**
   (`pl-dit`/`voix`/`dm-dit` : 6+3+7 = **16** occurrences, toutes situées), mais l'indexation d'un cadre `cadre-b`
   serait décalée si quelqu'un recompte sur les 175.
6. **`POST /v1/session/open` n'a jamais abouti** (422, `client_version` requis — je n'ai pas inventé une
   valeur de version cliente pour forcer le passage). ⇒ le **seam de réparation** du grant n'a pas été
   exercé, et aucune de mes mesures ne porte sur un état « session ouverte ». **La mesure qui trancherait** :
   relire le DTO de `session.controller.ts` et rejouer avec la version que le client Unity envoie réellement.
7. **Les répliques de ㉓ n'ont pas été passées au `repr()`** pour compter les U+00A0 : elles vivent dans la
   maquette HTML, pas encore dans `string_table.ts`. Le design §6.3 le signale lui-même comme dû avant commit.

---

## Annexes

### 1. Routes du domaine — compte et ancres

**Routes de LECTURE joueur mesurées : 7.** `GET me/legal` (`legal.controller.ts:89`) · `GET friction/state`
(`friction-projection.controller.ts:35`) · `GET friction/nodes/:buildingId` (`:44`) ·
`GET friction/replacement-options` (`replacement-option.controller.ts:54`) · `GET me/iap/balance`
(`iap.controller.ts:83`) · `GET me/iap/entitlements` (`:143`) · `GET iap/catalogue` (`:70`).
**Complétées au-delà des modules du dossier** (le mot du domaine grepé dans tous les contrôleurs) :
`GET lieutenants` (`lieutenant.controller.ts:343`) et `GET me/buildings`
(`player-buildings.controller.ts:111`) — **ce sont elles qui portent le nom et l'affectation du locuteur**,
et elles ne sont dans aucun des trois modules nommés. ⇒ **9 routes de lecture au total**, toutes exercées
sur la pile (plus `session/open`, en échec sur corps vide — voir ci-dessous).
**Routes d'ÉCRITURE joueur du domaine : 9** (annexe D, balayage sur les **8** verbes HTTP ; le premier
balayage, à 4 verbes, en avait manqué une).

⚠️ **`POST /v1/session/open` n'a PAS été ouvert** : sur corps `{}` il rend **422 `VALIDATION_FAILED`
— « `client_version` is required. »** (`mesures/02-session-open.json`). **Toutes mes mesures sont donc
post-`signup` seul.** Conséquence mesurée et favorable : le grant de bienvenue tourne **au signup**
(`auth.service.ts:513` selon le design ; **confirmé par corps réel** — `lieutenants` rend 2 lignes nommées,
`marks_balance` vaut 50, `me/buildings` rend 5 bâtiments). Le **second** déclencheur du grant
(le seam de réparation de `session/open`) n'a donc **pas** été exercé — sans effet sur les ensembles de
clés mesurés ici, mais c'est écrit plutôt que supposé.

### 2. Corps réels — `mesures/`

`01-signup.json` (jetons masqués) · `brut-me-legal.json` · `brut-friction-state.json` ·
`brut-friction-nodes.json` · `brut-friction-replacement-options.json` · `brut-me-iap-balance.json` ·
`brut-me-iap-entitlements.json` · `brut-iap-catalogue.json` · `brut-lieutenants.json` ·
`brut-me-buildings.json` · `corps-reels.txt` (ensembles de clés triés) · en-têtes `hdr-*.txt`.

⚠️ **Piège d'outil payé ici** : `curl` est réécrit par le hook rtk et **sa sortie redirigée dans un fichier
n'est pas le corps** — le premier `signup` a rendu un **schéma** (`access_token: string[423]`) de 537 octets
pour un `Content-Length: 995`. **Toutes** les mesures de ce rapport passent par `rtk proxy curl`.

### 3. Valeurs possibles, avec la contrainte source

`leak` : `'silent' | 'low' | 'significant' | 'full_dump'` — `legal.types.ts:63` (recopié).
`chargeSeverity` : `'misdemeanor' | 'felony_low' | 'felony_high' | 'major_crime'` — `legal.types.ts:42`.
`primary_or_understudy` : `['primary','understudy']` — `db/schema/lieutenant.ts:17` (pgEnum, recopié).
`friction_bucket` : mesuré `"light"` ; les autres valeurs **non recopiées d'une contrainte** (non vérifié, pt 2).
`marks_balance` : entier, `player_economy_state.ts:25` `integer('marks').notNull().default(0)` ;
don de bienvenue `WELCOME_GRANT_MARKS = 50` (`auth.service.ts:155`).

### 4. Inventaire M (25 éléments) — `mesures/controle-arithmetique.py`, liste `M`

Les 25 éléments, leur texte et leur appariement sont **dans l'instrument**, pas recopiés en prose ici :
c'est ce que le script recompte, et c'est ce qui fait que le contrôle négatif mord.
Sources : `mesures/voix-inventaire.txt` (appariement par offset), `mesures/boutique-cadres.txt`,
`mesures/demolition-cadres.txt`, `mesures/cadre-6826.txt`, `mesures/gestes.txt`.

### 5. Inventaire F — **sans objet** (mode maquette)

### 6. Non vérifié — section F ci-dessus.
