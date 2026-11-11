# Juge données ⊥ — ④ L'ouverture, la carte de tête QUI AGIT — mode MAQUETTE — tour r3 BORNÉ — 2026-11-11

**Épingles.** Maquette `atelier3d-mafia-c2` @ `8f59cf9409546bc9a078dbb91ca48f91be68da95`
(`ecrans-brennar-accueil.html`, 811 l / 572 991 o) + `reference/variantes-textes-8f59cf94.txt` (13 lignes).
Design `mafia-design-aprespgeste` @ `464defd1d209a2d1f24f3074d9a5228acc44a84d`
(`docs/superpowers/specs/2026-11-11-hl-card-apres-geste-servi-design.md`, 1 186 l / 108 844 o, **lu en
entier**). Back `mafia-clean-city` @ `7807d6c8` (lu par `git show`/`git grep`, **aucun checkout, aucune
écriture, docker/porte/Unity non touchés**). Aucun rapport de juge ni de revue n'a été ouvert ; les
répertoires `maquette-9fa533b5/` et `maquette-r2-392643c3/` n'ont pas été lus.

**Le lot n'est PAS codé.** Chaque ligne porte **DESIGN** (ce qui SERA servi, lu dans le design) ou
**DÉDUIT du source** (mesuré sur `7807d6c8`).

## En une phrase

Les 9 clés du lot sont cohérentes avec le source qu'elles modifient (7 sites d'émission mesurés, enveloppe
200 et registre d'erreur vérifiés) et les 9 textes du design sont **identiques à l'octet** à l'atelier
`8f59cf94` aux 3 transformations nommées près ; les 8 points du tour borné sont **7 CORRIGÉ / 1 PARTIEL** ;
il reste **1 constat B** (le 409 d'`already_resolved` couvre `superseded`, donc une phrase fausse) et
**8 constats C**. ⇒ **NON RATIFIABLE** (0 A, **1 B**).

---

## Points du tour BORNÉ — verdict et preuve

| # | point | verdict | preuve |
|---|---|---|---|
| 1 | Discernabilité : cadre 7 vs variante 8 sans lire `message` ; une issue ↔ un cadre/variante ↔ **UN SEUL** texte | **PARTIEL** | **Distinction : OUI.** `renderError` lit la clé **dans le registre, par `code`** (`envelope.interceptor.ts:157`, clé à `:170`) ; cadre 7 = E16, l'erreur de la route relancée telle quelle (`hl-card.service.ts:305-307`, mesuré : la branche `executed.length === 0` ne contient que `compensate` + `throw err`) ⇒ code de la route ; variante 8 = `HL_CARD_ALREADY_RESOLVED` (design §3.1). Codes distincts ⇒ `RefusServi.Code` (`RefusServi.cs:43`) les sépare, et `error.hl_card.*` est **hors** des 6 familles génériques (`RefusServi.cs:27`) ⇒ la phrase passe devant **sans une ligne de client**. **UN SEUL texte : NON** pour E9/E11/E14 ⇒ constat **B1**. Les 5 sites d'émission couverts sont vérifiés un à un : 7 `new ApiError(` dans le fichier, à `:270/:382/:385/:389/:400/:424/:427` (mesure 01) — somme = 7, exactement la population de F2.1. |
| 2 | Après-geste servi : une clé par texte, texte du design = texte de la maquette **à l'octet** | **CORRIGÉ** | **5 paires FR+EN identiques à l'octet** (apostrophes `U+2019` comprises) : `hl.outcome.{damaged_building,severed_route,legal_case,mycelial_stressed_leg}.executed` + `hl.after_choice.noted` (mesure 03, `-> 5/5`). `hl.after_choice.partial_stop` : identique **après les 2 transformations nommées** — T1 (`U+0020`→`U+00A0` avant `:`, **imposée** par `occR2`, `typographie_fr_classe_unit.spec.ts:44-48`, `NBSP = 0xa0` à `:33`) et T2 (le placeholder final retiré) ; mesuré : `design FR avec U+0020 au lieu de NBSP == prefixe atelier ? True`, `design EN == prefixe atelier EN ? True`. **Cadre 6 reconstitué** : l'ICU `{n, plural … other {# locaux}}` à `n = 2` rend exactement `'Les travaux sont lancés et payés pour 2 locaux. L'activité reprend à la fin du chantier.'` = le `.mot-or` du cadre 6 (mesure 03, `IDENTIQUE ? True`). Les 4 segments de fournisseur sont **recopiés** de la table existante (`hl-option-table.ts:72-95`). Les 6 clés n'existent dans **aucun** registre aujourd'hui (3 × 0 occurrence, mesure 01). |
| 3 | Arrêt partiel : `stopped_at_i18n_key` existe, un texte par code possible ; plus de code brut à l'écran | **CORRIGÉ** | DESIGN D7 : `stopped_at_i18n_key = ERROR_CODES[stopped_at_error].user_facing_i18n_key`. **Lookup TOTAL, mesuré** : `stoppedAtError = err instanceof ApiError ? err.code : 'INTERNAL_ERROR'` (`hl-card.service.ts:310`) et `ApiError.code` est typé `ErrorCode` (`api-error.ts:15`) ⇒ tout code porté est membre du registre. **Un texte existe pour les 68 codes** : `errorKeyTemplates` dérive une entrée de bundle **par code**, texte ratifié d'abord, humanisation en repli (`string_table.ts:6216-6231`), et le compte des codes « au repli » est épinglé à `[]` (`i18n_staging_pont.spec.ts:80`). ⇒ **aucun chemin où le code brut doive atteindre l'écran**. `stopped_at_error` reste sur le fil (dev/BO) : non dessiné, volontaire. Qualité de la phrase pour 4 codes sur 6 ⇒ constat **C3**. |
| 4 | Pluriel ICU sur `executed_ids.length` ; `n` ne vaut jamais 0 sur un 200 ; clés ICU | **CORRIGÉ** | Deux verrous **relus au source** : `planCommit` rend `conflict` dès `targets.length === 0` (`hl-commit-plan.ts:71`) ⇒ aucune exécution sans cible ; la boucle **relance** si la 1ʳᵉ cible échoue (`hl-card.service.ts:305-307`) ⇒ on n'atteint le `return` de `:319` qu'avec `executed.length ≥ 1`. ⇒ domaine de `n` sur un 200 = `[1, +∞[`, **aucune branche `=0` due**. Comptes recomptés sur les 6 clés du design : **4 paramétrées, 3 plurielles** (101, 102, 107) — `legal_case` et `noted` sans paramètre, `partial_stop` avec `{n}`/`{total}` **sans** `plural` (mesure 03/05). Le résolveur client tient : `#` formaté par locale (`I18nCatalog.cs:245`), `one` seulement à `n == 1` (`:241`), argument absent ⇒ accolade brute (`:212`) — trou documenté TD-927 (a). |
| 5 | « maillon » pour 107, aligné sur le servi | **CORRIGÉ** | Servi aujourd'hui : titre `decision.type.MYCELIAL_STRESSED_LEG` = `'{n, plural, one {Un maillon sous tension} other {Des maillons sous tension}}'` (`string_table.ts:5185-5186`, EN `:2277-2278` « link ») et conséquence d'option `hl.option.mycelial_stressed_leg.maintain_now.projected_consequence` = « … pour chaque **maillon** … » (`:5484`). Le texte neuf du design dit « maillon » / « link ». « tronçon » subsiste à 3 sites **étrangers** à 107 (`:3422`, `:5881` compression, `:6202`) — hors lot. |
| 6 | Le jeton : `used` et `cap_reached` suffisent-ils aux 3 états ? | **CORRIGÉ** | DÉDUIT du source : `structural_budget: { used, cap_reached: used >= cap }` (`session-open-sequence.service.ts:361`, type `:240`). ⇒ libre = `!cap_reached` · pris = `cap_reached && used > 0` · fermée aujourd'hui = `cap_reached && used === 0` (cap 0 en T4 ⇒ `0 >= 0` vrai). Les 3 états sont **séparables sans chiffre**, les 2 champs suffisent. Forme dessinée ⇒ constat **C5**. |
| 7 | 404 et 409 « rien à agir » : clés distinctes servies | **CORRIGÉ** | DESIGN D1 : `HL_CARD_NOT_FOUND` → `error.hl_card.not_found` = `'Cette carte n'est plus là.'` / `'This card is gone.'` — **identique à l'octet** à la variante 11 ; `HL_CARD_NOTHING_TO_ACT_ON` → `error.hl_card.nothing_to_act_on` = `'Plus rien à faire sur cette carte.'` / `'Nothing left to do on this card.'` — **identique** à la variante 12 (mesure 03). Codes **distincts** : exigence structurelle vérifiée — la clé n'est **jamais** passée par appel, elle est lue par `code` (`envelope.interceptor.ts:170`) ⇒ une clé distincte **exige** un code distinct. `http_status`/`retryable_class` recopiés du fichier (`error-codes.ts:103-107` et `:108-112`). Registre à 68 entrées, aucune `HL_CARD_*` ⇒ additif pur. |
| 8 | Liste exhaustive du servi SANS cadre ni variante, avec compte | **CORRIGÉ** (liste rendue) | mesure **05** : `commit` a **18** chemins à l'épingle du dossier (19 au design : E3 n'existe qu'à partir de `0cfa6a7d`, cf. **C9**) — **8 couverts** sur 5 sites (E8, E9, E11, E12, E13, E14, E16, E17), **10 sans cadre ni variante** (E1 401 · E2/E4/E5/E6 422 · E7 404 du COMPTE · E10 409 cap structurel, **assumé** · E15 500 inatteignable · **E18 500 après exécution des cibles**, TD-927 b · E19 non-chemin de réponse) ; `skip` : 404 couvert par la variante 11, **2 × 409 sans cadre** (**assumé**). Côté 200 : des 10 clés, **9** portent un élément ; `stopped_at_error` n'est dessiné nulle part (volontaire) et `committed` est la constante `true` (`hl-card.service.ts:136`), sans information. **Total : 12 chemins + 1 clé = 13, dont 3 écarts assumés au dossier.** |

---

## Table de constats — **la seule du rapport, rien n'est compté ailleurs**

| id | gravité | critère | constat | mesure | non vérifié |
|---|---|---|---|---|---|
| **B1** | **B** | **NOUVEAU** (point 1) | **Le 409 « déjà tranchée » couvre AUSSI `superseded` : le joueur lit « C'était déjà tranché » sur une carte qui n'a jamais été tranchée, mais remplacée.** `requireActionable` refuse `status !== 'active' && status !== 'skipped'`, soit **`committed` OU `superseded`** ; `claimOrConflict` idem par sa garde SQL. Le design mappe les **trois** sites sur une clé et **un** texte. Le texte ratifié qui dit cette issue existe déjà (variante 11, « Cette carte n'est plus là. ») mais n'est câblé que sur le 404. | `hl_card_status` = pgEnum **4 membres** `active\|committed\|skipped\|superseded` (`services/game-back/src/db/schema/core_loops.ts:28-33`) · `hl-card.service.ts:426` `if (card.status !== 'active' && card.status !== 'skipped') {` → `:427` `throw new ApiError('RESOURCE_STATE_CONFLICT', …)` · `markCommitted` garde `AND prev.status IN ('active', 'skipped')` (`hl-card.repository.ts:192`) ⇒ 0 ligne sur `superseded` ⇒ `:400` même 409 · **chemin ORDINAIRE, pas une course** : `markSuperseded` est appelé à **chaque** ouverture où le gagnant change (`hl-card.service.ts:195` et `:212` → `hl-card.repository.ts:168-175`) · design §3.1 l.281 : `HL_CARD_ALREADY_RESOLVED` → `error.hl_card.already_resolved` = `C'était déjà tranché`, sites « E9 (`:427`), E11 **et** E14 (`:400`) ». ⚠️ **Le design VOIT les deux statuts et route quand même sur un texte** : `grep -c superseded` sur le design ⇒ **1** occurrence, l.118, la ligne E9 elle-même — « statut déjà terminal (`committed`/`superseded`) … **OUI** → `HL_CARD_ALREADY_RESOLVED` *(variante 8)* ». Les deux statuts sont donc nommés côte à côte, et l'écart de texte n'est discuté nulle part ailleurs dans les 1 186 lignes. | La **fréquence** réelle (taux de cartes supersédées entre une lecture d'ouverture et un commit) : non mesurable sans la pile. La mesure qui trancherait : un cas engine « carte semée `superseded` puis `commit` » lisant `code` **et** `user_facing_i18n_key` du corps. |
| **C1** | C | NOUVEAU | **Les ancres du design sur les 2 specs E2E qu'il rouvre sont périmées au sommet du cumul.** Le design épingle `0cfa6a7d` ; le sommet `gate/cumul-2026-10-10` est `5734e7b2`, **1 commit plus loin**, et ce commit réécrit **exactement** `hl_card_agit.engine.spec.ts` et `hl_card_agit.parcours.spec.ts`. Les 4 ancres engine (`:273`, `:306`, `:327`, `:482`) et l'ancre `parcours:251` **ne portent plus** l'assertion citée. La **substance** (les 2 survivantes, la table `CLES_COMMIT`, les 2 IDOR) tient ; ce sont les **numéros** qui ont bougé. | `git diff --name-only 0cfa6a7d 5734e7b2` ⇒ ces 2 fichiers **seuls** (mesure 01) · mesure 05, colonnes `0cfa6a7d` vs `5734e7b2` : engine `:273` « test N = 2 bâtiments… » → `// ═══` ; `:306` assertion `stopped_at_error` → assertion « l'arrêt est un 200 PARTIEL » ; `:327` « le code de la route, non remplacé » → « ANTI-VACUITÉ : une session active existe » ; `:482` test navigate → `];` ; parcours `:251` `expect(cles(agit.data), …)` → un commentaire sur la version de route. **Tiennent au sommet** : `parcours:51/:224/:226/:237`, `hl_card.spec.ts:969` et `:1104-1106`. | Si les 5 assertions citées existent encore **ailleurs** dans les 2 fichiers du sommet : non balayé (hors périmètre juge-données ; c'est au chunk de les re-piner). |
| **C2** | C | NOUVEAU (point 8) | **E18 est le chemin non couvert qui coûte le plus au joueur, et aucun cadre ne le dessine** : si l'incrément du compteur de session lève **après** l'exécution, le joueur reçoit un 500 alors que ses cibles sont traitées et la carte `committed`. Honnêtement consigné par le design (TD-927 b, « aucun détecteur à ce jour ») ⇒ **se garde, ne disparaît pas**. Les 9 autres chemins non couverts sont des 401/422/404-de-compte/500-inatteignable, sans enjeu d'écran. | `hl-card.service.ts:318` `await this.sessions.recordAdvisoryDecision(playerId);` posé **après** la boucle d'exécution et **après** `commitResponse` des cibles ; liste complète des 12 chemins + 1 clé en mesure 05. | Qu'aucun autre écrivain ne lève après ce point : non balayé plus profond que le corps de `commit`. |
| **C3** | C | DÉJÀ-APPLIQUÉ (point 3) | **`stopped_at_i18n_key` désigne une phrase GÉNÉRIQUE pour 4 des 6 codes réellement levés.** Lue derrière « Fait pour 1 sur 2 : », elle ne dit rien du geste. Le design le mesure, sert la clé **telle quelle**, et donne au chunk client le critère **et** le repli ratifié de l'atelier ⇒ trou documenté, avec détecteur (TD-927 c). La maquette dessine **déjà** le cas du repli (variante 6), donc B et M concordent. | 6 familles génériques `error.envelope. error.idempotency. error.http. error.internal. error.resource. error.validation.` (`Assets/Scripts/I18n/RefusServi.cs:27`) ; des 6 codes de §1.2, `error.resource.not_found`, `error.resource.state_conflict`, `error.validation.failed`, `error.internal.unexpected` y tombent, `error.sinuosity.rebuild_in_progress` (`error-codes.ts:315-318`) et `error.supply_chain.maintenance_in_progress` (`:277-280`) non ⇒ **4/6**. | Le choix final du client (phrase résolue vs repli) : hors mode maquette. |
| **C4** | C | NOUVEAU | **Trois espaces pour un même rôle avant `:`.** La maquette écrit `U+202F` dans sa propre typographie (`24 850 €` et « tant que l'argent suit␟; » au cadre 1), l'atelier rend `U+0020` dans la variante 6, et le back **doit** servir `U+00A0` (la garde ne connaît que lui). Le texte servi ne portera donc pas l'espace fine de la maquette. Nuance typographique, transformation **nommée** par le design (T1). | `04-inventaire-M-cadres-8f59cf94.txt` l.22 `'24 850 €'`, l.35 `'…tant que l'argent suit ; …'` · variante 6 : `'Fait pour {n} sur {total} : …'` (`U+0020`, mesure 02) · `occR2` : `if (v[i] === ':' && v[i - 1] !== NBSP) n++` avec `NBSP = String.fromCharCode(0xa0)` (`typographie_fr_classe_unit.spec.ts:33`, `:44-48`), liste d'exclusion épinglée à 0 (`:132`). | Le rendu de `U+00A0` vs `U+202F` dans la boîte : rendu gelé pendant le gate (consigne du dossier). |
| **C5** | C | NOUVEAU (point 6) | **Le jeton : 1 état dessiné sur 3, 2 classes CSS sur 3.** Les 3 états sont **ratifiés en texte** (variante 10) et **séparables côté back** (point 6), mais la page ne rend que « libre », et le CSS ne définit qu'un second état (`.pris`) : « fermée aujourd'hui » n'a **aucune** forme. | `grep -o '\.jeton-or[.a-z]*'` ⇒ `.jeton-or`, `.jeton-or.pris` (2) · `'>libre<'` = 2, `'>pris<'` = 0, `'fermée aujourd'` = 0 · `.jeton-or` présent aux cadres 6 et 7 seulement, **absent du cadre 1** (mesure 05, tableau des 8 cadres). | L'apparence des états 2 et 3 : non reproductible sur cette planche. |
| **C6** | C | NOUVEAU | **La pastille `.deja` « Déjà tranchée » de la variante 8 n'existe pas dans la maquette.** La variante la décrit (« la pastille `.deja` … dans la carte »), aucune classe `deja` n'est présente dans le fichier, et aucun cadre ne la place. Son texte est par ailleurs **un second texte** pour l'issue `already_resolved` (le titre servi est « C'était déjà tranché ») — complémentaires, non ambigus, et le design tranche explicitement « une valeur pour cette clé » (§9.4 (2)). | `grep -c 'class="[^"]*deja'` sur `ecrans-brennar-accueil.html` @ 8f59cf94 ⇒ **0** (mesure 05) · variante 8, champ 2. | Le placement de la pastille : non reproductible (aucun cadre). |
| **C7** | C | NOUVEAU | **Deux ancres CLIENT du design sont décalées d'une à deux lignes** — celles-là même que la v3 dit avoir corrigées (M1). La substance est juste ; le numéro ne l'est pas. | Design D7-bis : « tableau `FamillesGeneriques` ouvert à `:24`, les 6 familles à `:26` » ; mesuré dans l'arbre client : déclaration à **`:25`**, les 6 familles à **`:27`** (`Assets/Scripts/I18n/RefusServi.cs`). Design §1.4 : « `Libelle.cs:23-28` » ; mesuré : l'interdiction est à **`:25-27`**. Vérifiés **justes** : `HlCardClient.cs:8` (2 champs), `I18nCatalog.cs:212/:241/:245`, `envelope.interceptor.ts:157/:170-172`, `envelope.ts:113-123`, `api-error.ts:15`, `hl-option-table.ts:71-96`, `hl-card-types.ts:118/:121/:128`, `string_table.ts:5175-5176/5185-5186/2267-2268/2277-2278/6216-6231/6234-6240`, `typographie…:131/:132`, `i18n_staging_pont…:80`, les 7 sites `new ApiError(`. | — |
| **C8** | C | NOUVEAU | **7 textes dessinés ou ratifiés n'ont ni clé servie ni affectation écrite** dans le design : « Retour à l'accueil », « Rien d'autre à trancher pour l'instant. », « La carte vous attend encore. », « **Rien n'est parti : ** », « votre grande décision du jour », « Rien à faire ici pour l'instant. », « TRANCHÉE ». Ce sont des **phrases fermées**, donc dérivables par `Libelle.De` — le mécanisme sanctionné — et le design dit explicitement que la liste des clés dérivées se **génère** depuis l'arbre client plutôt que de s'inventer dans un design (§7). ⇒ à consigner, pas un défaut. **Asymétrie à signaler** : « Rien n'est parti : » est le pendant exact de « Fait pour {n} sur {total} : », que le lot sert **depuis le back** ; la raison de la différence tient (le second porte `{n}`/`{total}`, le premier aucun paramètre). | Occurrences dans `string_table.ts` @ 7807d6c8 : les 7 ⇒ **0** chacun. Nommés par le design §7 et donc affectés : « Vous avez tranché », « La carte reste sur la table », « Déjà tranchée », « tactique », « libre/pris/fermée aujourd'hui », « ça n'a pas pu se faire pour l'instant. » (6). **Déjà servis** : « C'est noté » (1 occurrence), « Plusieurs attendent encore » (2 occurrences). Mesure 05, bloc « Textes de M ». | Quelles clés `domaine.role.slug` le client produira : non mesurable (l'écran n'est pas construit — mode maquette). |
| **C9** | C | NOUVEAU | **Le design n'est pas périmé, il est en AVANCE sur l'épingle du dossier** : sa base `0cfa6a7d` est un **descendant** de `7807d6c8`, donc son chemin E3 (`rejectUnknownFields` au 1ᵉʳ niveau du contrôleur) existe chez lui et **pas** à l'épingle du dossier ⇒ 19 chemins au design, **18** à `7807d6c8`. Aucune conséquence sur les clés ni les textes. Les 2 ancres de ligne du contrôleur (`:49` `@Post`, `:54` `@Body()`) et le docblock à 9 lignes (`:40-48`) **tiennent sur les deux SHA** : l'édition à nombre de lignes constant que C4 impose est vérifiable. | `git merge-base --is-ancestor 7807d6c8 0cfa6a7d` ⇒ **rc=0** · `git diff --name-only 7807d6c8 0cfa6a7d` ⇒ 4 fichiers, dont `hl-card.controller.ts` (le `rejectUnknownFields` ajouté) · `back.md:746` ancre `hl-card.controller.ts:41` à `7807d6c8` et `:49` à `0cfa6a7d` **et au sommet** ⇒ la revendication M4 du design est exacte sur sa base (mesure 01, mesure 05). | — |

**Comptes de la table : 1 B · 8 C · 0 A. NOUVEAU = 8, DÉJÀ-APPLIQUÉ = 1.**

---

## Écarts ASSUMÉS re-vérifiés (dossier) — aucun n'est rouvert

| écart assumé | re-vérification |
|---|---|
| `noted` sur la branche STRUCTURELLE, inatteignable en v1 (TD-929 b) | **tient** : `catalogueStructuralEntryFor` n'apparie que des codes `STRUCTURAL_DECISION_CATALOGUE` **live** (`hl-card-types.ts:170-171`) et les 8 codes de la table sont 101-108 (`hl-option-table.ts:72-95`) ⇒ `structuralEntry` toujours `undefined` pour une carte de fournisseur réel. |
| `skip` sans cadre, « Pas maintenant » retiré | **tient** : 3 chemins mesurés (`:382`, `:385`, `:389`) ; le 404 prend la même clé que E8 (design §1.3), les 2 × 409 restent en `RESOURCE_STATE_CONFLICT`. |
| carte structurelle, 409 `STRUCTURAL_CAP_EXHAUSTED` | **tient** : clé propre `error.core_loops.structural_cap_exhausted` **déjà** servie (`error-codes.ts`), non producible en v1 (ci-dessus). |
| noms des cibles (forme F), `status: skipped` | **tient** : hors du périmètre de ce lot, aucune clé du design ne les touche. |
| 2 gestes = `commit {0}` / `commit {1}`, 2 options | **tient** : `parseChosenOption` n'accepte que 0 ou 1 (`hl-commit-plan.ts:30-32`), défaut = 1 (`:20`, `:57-58`). |
| le lot n'est pas codé ; un amendement DOC suivra | **tient** : les 9 clés sont absentes des 3 registres (3 × 0 occurrence). |

---

## Actions : routes ↔ CTA

| route joueur | CTA / geste de la maquette | statut |
|---|---|---|
| `POST /v1/session/hl-card/:id/commit` `{chosen_option: 0}` (`hl-card.controller.ts:49`, sous `JwtAuthGuard` `:51`) | cadre 1, `.gestes .g.or` « Mettre en réparation » | apparié |
| `POST …/commit` `{chosen_option: 1}` (ou corps absent) | cadre 1, `.gestes .g` « Laisser en l'état » | apparié |
| `POST /v1/session/hl-card/:id/skip` (`:66`) | **aucun CTA** | ÉCART ASSUMÉ (dossier) |
| — | `.ligne-or` « Retour à l'accueil » (cadres 6, 7) | navigation locale, aucune route — apparié par construction |
| — | variante 13 : le bouton devient « Voir » + l'écran cible | servi par `navigate_screen`/`navigate_ids` (DESIGN D6 : `outcome_i18n_key = null`, TD-929 a) |

**IDOR, vérifié sur le source** : `requireActionable` passe par `findOwned(playerId, cardId)` (`hl-card.service.ts:422`) et `resolvePlayerId` borne le compte au `player` lié (`hl-card.controller.ts:76-87`) ⇒ la carte d'un autre joueur rend un 404 indiscernable d'une carte inexistante, ce que le texte servi respecte (« Cette carte n'est plus là. »). Les 2 assertions croisées existent et tiennent au sommet du cumul (`hl_card_agit.parcours.spec.ts:224`, `:226`).

---

## Table de couverture complète (inventaire — **aucun constat n'y est compté**)

Mode maquette : 2 colonnes, B et M. `DESIGN` = servi après le lot ; `SOURCE` = servi aujourd'hui.

| # | information | B | M | statut |
|---|---|---|---|---|
| 1 | `hl_card.card_id` (SOURCE) | ● | – | « passé à côté ? » — plomberie |
| 2 | `hl_card.decision_type_key` (SOURCE) | ● | ● `.titre` cadres 1/6/7 | ✔ |
| 3 | `hl_card.impact_bucket` (SOURCE) | ● | ● « Portée modérée » | ✔ |
| 4 | `hl_card.urgency_bucket` (SOURCE) | ● | ● « Urgence faible » | ✔ |
| 5 | `hl_card.options[].label` (SOURCE) | ● | ● `.gestes` cadre 1 | ✔ |
| 6 | `hl_card.options[].projected_consequence` (SOURCE) | ● | ● `.csq4` cadre 1 | ✔ |
| 7 | `hl_card.structural` (SOURCE) | ● | ● `.coin small` « tactique » | ✔ |
| 8 | `hl_card.target_count` (SOURCE) | ● | ● le `{n}` du titre pluriel ; le `{total}` de l'arrêt | ✔ (N11 classe C, TD-928) |
| 9 | `structural_budget.used` (SOURCE) | ● | ● jeton : sépare « pris » de « fermée » | ✔ |
| 10 | `structural_budget.cap_reached` (SOURCE) | ● | ● jeton : sépare « libre » | ✔ |
| 11 | `queue` (cardinal) (SOURCE) | ● | ● `.ligne-or small` | ✔ |
| 12 | `commit.committed` (SOURCE) | ● | ● `.tampon-diag` « TRANCHÉE » (absent au cadre 7) | ✔ (constante `true`) |
| 13 | `commit.structural` (SOURCE) | ● | – | ÉCART ASSUMÉ (TD-929 b) |
| 14 | `commit.outcome` (SOURCE) | ● | ● cadre 6 / variantes 5, 13 | ✔ |
| 15 | `commit.executed_ids` (SOURCE) | ● | ● « 2 locaux » cadre 6 | ✔ |
| 16 | `commit.stopped_at_id` (SOURCE) | ● | ● variante 6 | ✔ |
| 17 | `commit.stopped_at_error` (SOURCE) | ● | – | volontaire (dev/BO) — la maquette écrit « jamais le code brut » |
| 18 | `commit.navigate_screen` (SOURCE) | ● | ● variante 13 | ✔ |
| 19 | `commit.navigate_ids` (SOURCE) | ● | ● variante 13 | ✔ |
| 20 | `commit.outcome_i18n_key` (**DESIGN**) | ● | ● `.mot-or` cadre 6 + variantes 1-6 | ✔ — ferme N1 |
| 21 | `commit.stopped_at_i18n_key` (**DESIGN**) | ● | ● variante 6 | ✔ — ferme N3 (cf. C3) |
| 22 | `error.code` + `user_facing_i18n_key`, 3 codes (**DESIGN**) | ● | ● variantes 8, 11, 12 | ✔ — ferme N2/N8 (cf. **B1**) |
| 23 | `error.details.reason` 2 membres (**DESIGN**) | ● | – | discriminant client/BO/télémétrie, 1 texte (V1 assumée) |
| 24-29 | 6 littéraux dessinés, **affectés** au client par le design §7 : « Vous avez tranché », « La carte reste sur la table », « Déjà tranchée », « tactique », « libre/pris/fermée », « ça n'a pas pu se faire pour l'instant. » | – | ● | ASSUMÉ à consigner (dérivation `Libelle.De`) |
| 30-36 | 7 littéraux dessinés, **non affectés** : « Retour à l'accueil », « Rien d'autre à trancher pour l'instant. », « La carte vous attend encore. », « Rien n'est parti : », « votre grande décision du jour », « Rien à faire ici pour l'instant. », « TRANCHÉE » | – | ● | **C8** |

**Contrôle d'arithmétique** : `|clés B| = 23` · `|éléments M non appariés| = 13` · F n'existe pas (mode
maquette) · **somme = 36 = nombre de lignes** (1-23 puis 24-29 et 30-36 détaillés ci-dessus).
Deux textes de M sont appariés à une source **déjà servie** et comptent dans les lignes ✔ : « C'est noté »
(1 occurrence dans `string_table.ts`) et « Plusieurs attendent encore » (2 occurrences).

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| 1 | `status: 'superseded'` (en base, jamais distingué en projection ni en erreur) | « la carte que vous aviez a été remplacée par une plus urgente » | **utile ici** : c'est exactement ce qui sépare « vous avez déjà tranché » de « on vous a changé la carte », et c'est le cœur de **B1** | haut |
| 2 | E18 — l'incrément de session qui lève après exécution | « vos travaux sont lancés, mais l'écran vous dit non » | **utile ici** : un 500 derrière un geste réussi est la pire combinaison ; mais la réparation est **back**, pas un texte (TD-927 b) | haut |
| 3 | `details.reason` (`no_option_zero` / `no_target`) | rien au joueur ; tout au BO | **pas ici** : c'est de la télémétrie, et V1 tranche bien (un seul texte ratifié) | bas |
| 4 | `card_id` | rien | **pas ici** : plomberie | bas |
| 5 | `stopped_at_error` (code brut) | rien au joueur | **pas ici** : la maquette l'interdit à l'écran, le design l'y laisse pour le dev/BO | bas |

---

## Lots back suggérés (B⁻ dessiné, forme F)

Aucun. Les colonnes du domaine lues en base (`db/schema/core_loops.ts:42-74`) sont toutes projetées ou
délibérément retenues (`impact_internal`/`urgency_internal` : R2.2, BO seul, `hl-card-projection.ts:134-143`).
`status` est le **seul** candidat et il n'est pas de forme F (il n'est pas dessiné) : il est **DÉDUIT**
comme la cause de **B1**, qui se ferme par une clé, pas par une projection.

---

## Annexes

1. **Routes du domaine (compte, ancres).** `hl-card.controller.ts` : **2** routes joueur, toutes deux
   `@Post` sous `@UseGuards(JwtAuthGuard)` — `session/hl-card/:id/commit` (`:49-51`) et `…/skip` (`:66-68`).
   Complément hors module : la clé `hl_card` et `structural_budget` sont servies par `session/open`
   (`session-open-sequence.service.ts:355-361`), 1 route de lecture. Aucune route BO ni `_test` retenue
   (le diagnostic C8 `GET /v1/admin/players/:id/hl-card` est exclu : route staff).
2. **Corps réels.** **Aucun** — ruling f2 : la pile de dev tourne `main`, le gate arrive, la pile n'est pas
   touchée. Tout B est donc **DÉDUIT du source** ou **DESIGN**, et chaque ligne le porte.
3. **Valeurs possibles par clé, avec la contrainte source.** `outcome` ∈ `{'executed','navigate','noted'}`
   (union TS, `hl-card-types.ts:118`) · `status` ∈ `{active,committed,skipped,superseded}` (pgEnum,
   `core_loops.ts:28-33`) · `impact_bucket` ∈ `{minor,moderate,major}` et `urgency_bucket` ∈
   `{low,elevated,pressing}` (`hl-card-projection.ts:45-47`) · `stopped_at_error` ∈ `ErrorCode` ∪
   `{'INTERNAL_ERROR'}` (`hl-card.service.ts:310` + `api-error.ts:15`) · `cap_reached` booléen dérivé
   `used >= cap` (`session-open-sequence.service.ts:361`) · `details.reason` ∈
   `{'no_option_zero','no_target'}` (**DESIGN** D3).
4. **Inventaire M.** `mesures/04-inventaire-M-cadres-8f59cf94.txt` — les 8 cadres de la page, chaque nœud
   de texte avec son chemin de classes ; cadres 1, 5, 6, 7 lus élément par élément.
5. **Inventaire F.** Sans objet (mode maquette).
6. **Non vérifié.**
   - Aucun corps réel : **toutes** les clés et valeurs sont lues à la source, jamais mesurées sur une
     réponse vivante (ruling f2 sur la pile).
   - La **fréquence** du chemin `superseded` (B1) et celle d'E18 (C2) : non mesurables sans la pile.
   - L'apparence des états 2 et 3 du jeton et le placement de la pastille `.deja` : non reproductibles sur
     cette planche (C5, C6).
   - Le rendu de `U+00A0` vs `U+202F` dans la boîte (C4) : rendu gelé pendant le gate, consigne du dossier.
   - Les clés `domaine.role.slug` que le client produira pour les 13 littéraux dérivés : l'écran n'est pas
     construit ; la liste se **génère** (`Tools/cles-i18n-du-client.py`), elle ne se devine pas (C8).
   - Si les 5 assertions dont l'ancre a bougé (C1) existent encore ailleurs dans les 2 specs du sommet :
     non balayé — c'est au chunk de les re-piner.
   - Les comptes d'oracle du design (§4 C3-ter : 405→414, 561/47, 68→71, 21→24, 128 lignes) : **pas
     rejoués ici** (ils exigent d'exécuter les oracles sur une copie patchée du dépôt back ; la consigne
     interdit d'écrire hors de ce dossier). Les trois comptes **statiques** qu'ils supposent ont été
     re-mesurés et concordent : `ERROR_TEXT_RATIFIED` fr = 68 et en = 68 ; `new ApiError(` dans
     `hl-card.service.ts` = 7 ; `commitResponse` dans `tests/` = 5, un seul fichier.

---

## Verdict

**NON RATIFIABLE** — 0 A, **1 B** (B1), 8 C. Le tour est borné : les 8 points du dossier sont
**7 CORRIGÉ / 1 PARTIEL**, et le seul B est l'autre moitié du point 1 — une issue qui reçoit un texte
faux, pas une issue sans texte. Les 8 C sont consignés, aucun n'appelle de tour de juge.

**Auto-audit.** J'ai lu le design `464defd1` en entier (1 186 lignes) et la maquette au SHA `8f59cf94` par
`git show`, jamais par `cat`/`head`. Chaque compte asserté ici vient d'un `$( )` ou d'un `grep -c` dont la
commande et la sortie sont dans `mesures/` : les 7 sites `new ApiError(`, les 5 `commitResponse`, les 68+68
textes ratifiés, les 4 membres du pgEnum, les 3 × 0 occurrences des clés neuves, les 2 classes de jeton, les
0 occurrences de `deja`, les 4 paramétrées / 3 plurielles, les 5/5 paires identiques à l'octet. Je n'ai
touché ni la pile docker, ni la porte Unity, ni Unity ; je n'ai écrit que dans
`…/carte-4-agit/maquette-r3-8f59cf94/`. Je n'ai ouvert **aucun** rapport de juge ni de revue, ni aucune note
d'implémentation. Ce que je n'ai **pas** vérifié est en annexe 6, nommément.
