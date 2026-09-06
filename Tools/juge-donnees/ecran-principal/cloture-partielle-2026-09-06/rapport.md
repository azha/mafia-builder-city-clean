# Juge données ⊥ — ① Le HUD de district — clôture PARTIELLE — 2026-09-06

> Contexte vierge. Stack interdite : **B = les corps réels FIGÉS** de `corps-reels/` (base gelée,
> back `fc944b62`, compte `demo_capture@example.test`, jour 50, minute 72 118 — le même monde que
> les planches). Back lu dans `back-fc944b62/services/game-back/src/`, front dans
> `front-43ac9cb/Assets/Scripts/`, maquette dans `/home/erutheone/project/atelier3d-mafia/hud-brennar.html`.
> Toutes les ancres ci-dessous ont été ouvertes dans ces archives. Aucun rapport de juge précédent lu.
>
> ★ **Auto-audit** : la phrase de synthèse portait d'abord « affiche 11 » — un nombre que j'avais
> **écrit avant de compter**. Le dépouillement de ma propre table rend **16** (7 `●●●` + 9 `●–●`).
> Corrigé, et signalé plutôt qu'effacé : c'est exactement la faute que ce rôle traque.

## En une phrase

Sur les **44 clés** que les trois routes du chrome et de la fiche rendent réellement, l'écran en
porte **16** à l'écran (7 comme dessinées + 9 affichées sans l'être dans la maquette) et en **ignore
28** ; **8 défauts** (dont un énoncé daté **faux en production** et une information
**reçue puis jetée**), **17 questions « passé à côté ? »**, et les deux questions prioritaires se
tranchent toutes les deux dans le sens le moins confortable : le ruban est **absent alors que la
donnée est là**, et la barre de ratio est **une piste absente doublée d'un trait plein qui se lit
comme un ratio à 100 %**.

---

# LES DEUX QUESTIONS PRIORITAIRES

## Q1 — `.bandeau-alerte` : **composant ABSENT, donnée PRÉSENTE** — et le hook en place lit la mauvaise grandeur

**(c) Le composant.** Il n'existe pas, et c'est **écrit** :
`TopBarController.cs:1433-1439` — « *Le bandeau éphémère lui-même est **HORS PÉRIMÈTRE** de ce lot
(consigné — voir Deviations : câbler un vrai système de bandeau temporisé/animé est une
fonctionnalité neuve, pas un restyle). Ce qui reste : un hook de DONNÉES headless
(`notificationText`, alpha 0)* ». Mesuré : `notificationText` a **6 sites, tous dans ce fichier**, et
il est construit **à alpha 0** — `TopBarController.cs:1505-1508`,
`WithAlpha(DesignTokens.Current.onSurfacePrimary, **0f**)`, sur un rect de 10×10. Il n'y a donc
**aucun chrome visible** : les 0 px mesurés par le juge visuel sont le comportement écrit.

**(b) La donnée sur le compte gelé.** Le champ que le hook lit vaut **false** :
`_voisin_POST_session_open.json` → `backlog_badge = false` ; `_voisin_GET_exceptions_queue.json` →
`backlog_badge = false`.

**Mais l'information que le ruban DÉCRIT est bel et bien présente**, et sur trois routes :

| ce que la maquette écrit | ce que le compte gelé porte | source |
|---|---|---|
| « ✉ **Sal** a un rapport du soir » | `exceptions/queue` : **6 cartes en attente**, dont `368a88cd` — **Lt. Sallo** (MILD / watching) | `_voisin_GET_exceptions_queue.json` |
| « un rapport du soir — **lire** » | `autonomy-reports` : **1 rapport, 2 issues, `decided: null`** toutes les deux | `_voisin_GET_autonomy-reports.json` |
| l'invite à agir | `session/open` : `hl_card.decision_type_key = **"AUTONOMY_REPORTS_PENDING"**` | `_voisin_POST_session_open.json` |

**(a) Et voici le vrai défaut, qui survivra à la construction du ruban.** `backlog_badge` **n'est pas**
« un lieutenant a un rapport à lire » : c'est un **compteur de VOLUME**. Mesuré à la source —
`core_loops/core-loops-tunables.ts:400-403` : « *exception_backlog_badge_threshold — **pending-count
threshold** for the soft `backlog_badge`. **Default 10**, 4..30* », et
`exceptions/exceptions.controller.ts:65` le décrit comme « the player-wide » badge.
Avec **6** cartes en attente, `false` est **la bonne réponse** — le back ne se trompe pas.

⇒ **Conclusion Q1 : composant absent · donnée PRÉSENTE · et le hook qui tient sa place mesure une
autre grandeur que celle du ruban.** C'est une **forme E** posée d'avance : le jour où le ruban sera
construit sur `backlogBadge`, il restera **muet** pendant que Lt. Sallo a un rapport en attente — il
ne parlera qu'au 11ᵉ. La grandeur juste est `autonomy-reports.reports[]` (ou
`hl_card.decision_type_key`), pas un seuil de volume.
*Classe : **DÉFAUT `● ● –`** pour l'information ; **forme E** pour le câblage prévu.*

## Q2 — La barre de ratio : **piste ABSENTE + largeur EN DUR** — et le rendu certifie une lecture fausse

**(a) La clé du back.** La maquette dit ce qu'elle dessine (`hud-brennar.html:211-212`, annotation ①) :
« *la part **propre** (or) contre **sale** (gris) — le ratio du blanchiment* ». Le back **porte** cette
information, mais **en bande** : `cleanliness_band` = `DIRTY | PARTIAL | MOSTLY_CLEAN | CLEAN`
(`laundering.projection.service.ts:18,47,61,78`), projetée sur
`GET /v1/operational/laundering` **sous `JwtAuthGuard`** (`laundering.controller.ts:170-171`) — le
**même domaine** que le CTA BLANCHIR de cet écran.

⚠️ **Deux nuances que je ne surjoue pas** : cette bande est **par nœud / par étape**, pas un ratio de
portefeuille ; et le **scalaire continu que la maquette dessine est INTERDIT par doctrine** —
`laundering.projection.service.ts:13-15,28-30` : « *the raw [0,1] cleanliness float **NEVER
exposed*** », « *The E2E scans the payload recursively and **rejects any raw scalar*** » (R2.2).

**(b) Sa valeur sur le compte gelé : NON MESURÉE.** `GET /v1/operational/laundering` **n'a pas de corps
capturé** dans `corps-reels/` ⇒ ligne **DÉDUIT**, raison « corps non capturé ». Ce que je sais du
compte : il a **2 planques** (`empreinte-reference.json` → `planques_n: "2"`).

**(c) Comment le front calcule la largeur.** Il ne la calcule pas — **il la fige, et il fige la mauvaise** :

- `TopBarController.cs:354` — `private const float **MoneyUnderlineWidthPx = 74f**;
  // REUSE exact — hud-brennar.html:59 \`.ratio{width:74px}\``
  ⇒ le 74 repris est la largeur du **CONTENEUR** (la piste), **pas** celle du remplissage (68 %).
- `TopBarController.cs:956-965` — **un seul** GameObject `"Underline"`, **un seul** `Image`, couleur
  `hudMoneyUnderlineGold`. **Aucune piste `#5a6376`, aucun second `Image`.**

Cela explique exactement la mesure du juge visuel (**73,68 CSS entièrement en or**, 99,6 % de la
piste) : ce n'est ni un ratio à 100 % ni un bug de rendu — c'est **un trait plein de 74 px**.

**Et le fichier revendique ce choix** (`TopBarController.cs:914-916`) : « *Le soulignement N'ENCODE PAS
un ratio propre/sale — **aucune donnée client ne porte cette information** ... jamais une valeur
dérivée d'**un champ inexistant** (R2.2)* ».
⇒ La **première** moitié est défendable (aucun ratio continu n'existera jamais, R2.2 l'interdit).
La **seconde est fausse** : le champ n'est pas « inexistant » — `cleanliness_band` existe, sur une
route joueur du domaine que l'écran sollicite déjà.

⇒ **Conclusion Q2 : piste absente ET valeur en dur** — les deux à la fois, pas l'un ou l'autre.
Et c'est **le pire des trois cas possibles** : la maquette a appris au joueur à lire ce trait comme
une jauge ; un trait fixe qui a **exactement la largeur et la couleur d'une jauge pleine** est
indiscernable d'un ratio épinglé à 100 %. *Une décoration qui a la forme exacte de la mesure qu'elle
remplace ne se contente pas de ne rien dire — elle **affirme** quelque chose de faux.*
Un rectangle vide ment sur la place prise ; **celui-ci ment sur la valeur portée**.

*Classe : conflit CANON à arbitrer (la maquette demande une grandeur que R2.2 interdit) + **DÉFAUT de
rendu** (la lecture « 100 % » est produite, pas évitée). Fermetures possibles, par coût croissant :
retirer le trait · le rendre visiblement non-jauge (largeur ≠ 74, ou centré) · le piloter en **4 crans
discrets** depuis `cleanliness_band`.*

---

# Défauts

| # | information | B | M | F | statut | preuve |
|---|---|---|---|---|---|---|
| **D1** | ruban « un rapport à lire » | ● (3 routes) | ● `hud-brennar.html:176` | – (alpha 0) | **DÉFAUT `● ● –`** | `TopBarController.cs:1433-1439`, `:1505-1508` |
| **D2** | le hook du ruban lit un **volume**, pas un rapport | ● | ● | hook | **forme E** | `core-loops-tunables.ts:400-403` (seuil 10) vs 6 en attente |
| **D3** | barre de ratio propre/sale | ● (bande) | ● `:59-60,157` | trait or plein | **DÉFAUT + conflit canon** | `TopBarController.cs:354`, `:956-965`, `:914-916` |
| **D4** | **chaleur par bâtiment** — reçue et jetée | ● `heat_bucket="COLD"` | ● « 12% Heat local » `:189` | – | **DÉFAUT `● ● –`** | `WorldDtos.cs:141` déclaré ; **1 occurrence dans tout l'arbre = la déclaration, 0 lecture** |
| **D5** | CTA BLANCHIR — **énoncé daté FAUX en production** | ● 2 planques | ● `:193` | message faux | **DÉFAUT** | voir encadré ci-dessous |
| **D6** | `LibellesBatiment.Type` — les 12 cas sont **morts** | ● minuscules | ● titre | repli cassé | **DÉFAUT** | voir encadré ci-dessous |
| **D7** | pastille or du dock « Famille » | ● (6 en attente) | ● `:199 small.disc` | – | **DÉFAUT `● ● –`** | aucun `.disc` / pastille de dock trouvé dans `front-43ac9cb/` |
| **D8** | CTA COLLECTER inerte | ● route existe | ● `:192` | message | **DÉFAUT (action morte)** | `:2034-2036` — jointure bâtiment→dealer non projetée |

### D5 — l'énoncé daté, mesuré à `fc944b62`

`DistrictInteriorScreenController.cs:2037-2040` affirme, **dans du code de production** :

> « `POST /v1/operational/laundering/inject` … rend **404 POUR TOUT LE MONDE, DANS TOUS LES
> ENVIRONNEMENTS** : rien ne crée jamais de ligne `safehouses` (0 écrivain dans `services/`,
> 0 dans les 147 migrations — chaîne morte TD-358). »

**Réfuté dans l'archive figée du même SHA**, en trois mesures :

1. `operational/laundering_persistence/laundering-persistence.service.ts:82` — `async createSafehouse(`
2. …:104 — `INSERT INTO ${safehouse} (player_id, building_id, slot_count, …)` — **un écrivain réel**
3. `onboarding/onboarding-grant.service.ts:411` —
   `await this.launderingPersistence.createSafehouse(tx, playerId, buildingId, amorce);`
   ⇒ **un appelant de PRODUCTION** (le welcome grant)

Et le compte des planches lui-même porte **`planques_n: "2"`** (`empreinte-reference.json`).
⇒ Le message en dur `:2055` — « **Blanchiment : aucune planque** — la filière n'est pas ouverte. » —
est **faux sur le compte même où les planches ont été prises**.

⚠️ **Piège de mesure à signaler** : les motifs `insert(safehouses)` / `INSERT INTO safehouses`
rendent **0** sur cet écrivain — l'export Drizzle est `safehouse` au **singulier** et la forme est un
**template interpolé**. Un zéro sur le motif au pluriel est le zéro le plus crédible qui soit : c'est
très probablement ainsi que l'affirmation est née, et elle était vraie quand elle a été écrite.
⚠️ **Ce que je n'asserte PAS** : que `inject` rendrait 200. Sa garde exige **aussi** un front-shop
`OPERATIONAL` possédé (`laundering.service.ts:114-118`) et des ids en corps ; la stack est interdite.
**Le PRÉMISSE de la prose est réfuté ; le succès de bout en bout reste non mesuré.**

### D6 — les 12 cas du résolveur de type sont morts (casse **et** vocabulaire)

- Back : `db/schema/operational_chain.ts:27-31` — `pgEnum('building_operational_type', […])`,
  **12 membres, tous en MINUSCULES** : `front_shop, cash_safehouse, stash, lab, grow_house, refinery,
  press_house, distribution_hub, office, dealer_spot_front, money_holding, specialized_lab`.
- Corps réel : `operational_type = "distribution_hub"` — **minuscule**.
- Front : `LibellesBatiment.cs:24-40` switche sur des **MAJUSCULES**, et le site d'appel
  `DistrictInteriorScreenController.cs:1940` **ne normalise pas la casse**.
  ⇒ chute systématique en `default → CasseDeTitre` ⇒ **« Distribution hub » au lieu de « Relais »**.
- Pire que la casse, le **vocabulaire** : 6 membres du résolveur **n'existent pas** au back
  (`SAFEHOUSE, WAREHOUSE, GARAGE, CLUB, BAR, RESTAURANT`) et 6 membres du back **manquent** au
  résolveur (`cash_safehouse, stash, refinery, press_house, dealer_spot_front, specialized_lab`).
  Le docstring dit « 12 membres côté back » : **le compte est juste, les valeurs sont fausses** —
  le nombre a été vérifié, la liste ne l'a pas été.
- **Portée réelle** : c'est le **repli**, pris seulement si `name_i18n` est absent — donc invisible
  sur ce compte, où `name_i18n` est servi. Mais ce repli est écrit précisément pour « *un
  environnement plus ancien, ou un bâtiment que le lot fiction n'a pas encore couvert* »
  (`:1934-1936`) : le seul cas où il doit fonctionner est celui où il échoue.
- ★ Au passage, `LibellesBatiment.cs:10-14` est **périmé** : « `DistrictInteriorBuildingDto` ne porte
  **NI nom** NI montant — ses **13 champs** sont tous des bandes qualitatives ». `name_i18n` a été
  ajouté le 2026-09-02 et **est consommé** (`ResoudreNomBatiment:1937-1951`). *Un texte inchangé dans
  un fichier corrigé devient faux quand la correction déplace ce qu'il référence.*

---

# « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **1** | `district_bucket` (`city/district/:id/heat`) | la chaleur **de ce district-ci** — vaut `COLD` ici pendant que le médaillon affiche `BURNING` (ville) | **Utile, et c'est peut-être le plus gros manque de l'écran** : on est SUR un district, et la seule chaleur montrée est celle de la ville. Le joueur ne peut pas voir que son quartier est calme dans une ville qui brûle. | ★★★★ |
| **2** | `lieutenants[]` (`…/interior`) | **qui** tient ce district, par son nom (« Lt. Rook ») | Utile : l'écran affiche déjà des médaillons de lieutenants par bâtiment via `lieutenant_ids`, mais **jamais un nom**. Le DTO lui-même dit que c'est hors budget faute d'emplacement (`CityProjectionDtos.cs:183-189`) — c'est une **décision de mise en page**, pas une donnée manquante. | ★★★★ |
| **3** | `queue` / `queue_pressure_band` (`session/open`) | **6 cartes en attente**, pression « normal » | Utile ici : c'est la matière du ruban de la Q1. Aujourd'hui elle ne vit que sur ④. | ★★★☆ |
| **4** | `lapse_phase_bucket` (`…/interior`) | le bâtiment approche-t-il d'une **échéance d'entretien** (`WITHIN_WINDOW/SOFT/HARD/CRITICAL`) | Utile : c'est une **urgence datée**, exactement le genre d'information qui justifie d'ouvrir une fiche. La fiche n'a que 3 cases — arbitrage. | ★★★☆ |
| **5** | `activity_band` + `maintenance_in_progress` | le bâtiment **travaille-t-il en ce moment** / est-il en travaux | Utile en marqueur de carte (une animation ou une teinte) plutôt qu'en 4ᵉ case de fiche. | ★★☆☆ |

*Suivent, moins prioritaires :* `escalated` (une escalade a eu lieu au dernier tick — bon candidat
pour un **bandeau éphémère**, cf. Q1), `shell_state`, `grid`, `flag_review`, `settling_glance`,
`onboarding.funnel_step`, `structural_budget`, `hl_card`, `friction_glance`, `compression_glance`,
`session_id` et les identifiants de jointure (plomberie, aucun intérêt joueur).

---

# Lots back suggérés (B⁻ dessiné, forme F)

**Aucun** au sens strict pour les deux questions prioritaires : les informations manquantes de ①
sont **déjà projetées** — le trou est côté front (D1, D4, D7), pas côté back.

| # | colonne | table / route | maquette | preuve |
|---|---|---|---|---|
| 1 | `game_minute` | `city_sim_clock` → **aucune route joueur** | **M8** « 21:40 » | **forme F confirmée** : les clés racine de `session/open` sont **12** et `game_minute` n'y est pas ; la `provenance` des corps le dit elle-même (« *aucune route joueur ne la projette — forme F* »). Le front affiche la **phase** (« Aube ») à la place — substitut honnête, mais l'heure de la maquette reste sans source. |
| 2 | *(à arbitrer, pas à livrer)* ratio propre/sale au niveau **portefeuille** | `cleanliness_band` existe **par nœud** | **M3** | Un ratio de portefeuille n'existe nulle part ; et R2.2 **interdit** le scalaire continu. À trancher en produit avant tout lot. |

---

# Actions : routes ↔ CTA

| CTA / geste (M) | route joueur du back | état livré (F) | verdict |
|---|---|---|---|
| **COLLECTER** `:192` | `POST /v1/operational/dealer/{id}/collect` — existe, joueur | message inerte `:2052` | **DÉFAUT (action morte)** — la route prend un id de **dealer** ; la jointure bâtiment→dealer n'est pas projetée dans `DistrictInteriorBuildingDto`. Le maillon manquant est une **projection**, pas une route. |
| **BLANCHIR** `:193` | `POST /v1/operational/laundering/inject` — existe, joueur, `JwtAuthGuard` | message inerte **et faux** `:2055` | **DÉFAUT (prose datée)** — voir D5. La prémisse « 0 écrivain » est réfutée à `fc944b62` ; le compte a 2 planques. |
| **AMÉLIORER** `:194` | `POST /v1/operational/building/:id/upgrade-money-holding-tier` (`money-holding.controller.ts:64`) | message inerte `:2058` | **à ratifier** — l'écran renvoie vers un autre écran. Décision produit assumée. |
| ouvrir une fiche | — (lecture locale) | `OuvrirFiche` | ✔ |
| onglets du dock | — (navigation) | `Tab.{Empire,Org,Pipeline,More}` | **écart de nom** : la maquette dit « Marché », le dock ratifié dit « Filière » (`AppShell.cs:59-60`). |

★ **La posture du code est bonne et mérite d'être dite** : `:2042-2045` — « *Tant qu'une action n'a
pas son chemin PROUVÉ de bout en bout, elle DIT son état au lieu de faire semblant. Un bouton qui ne
fait rien est pire qu'un bouton absent* ». C'est exactement le `toBe(404)` dans le bon sens — un trou
documenté avec son mode d'emploi. **Le défaut n'est pas la posture, c'est que l'un des trois énoncés
a péri et que rien ne l'a rouvert.**

---

# Table de couverture complète

Portée : les **trois routes** que le chrome et la fiche de ① consomment — `POST /v1/session/open`
(12 clés), `GET /v1/city/district/:id/interior` (11 racine + 13 par bâtiment),
`GET /v1/city/district/:id/heat` (5 racine + 3 par bâtiment). Hors portée et non comptées :
`GET /v1/world/districts`, `GET /v1/i18n/bundle`, et les routes du domaine sans corps capturé.

| # | information | B | M | F | statut | classe | preuve |
|---|---|---|---|---|---|---|---|
| 1 | Jour de jeu | opened_game_day | M7a | JOUR 50 | ●●● | ✔ | TopBar:500 dayLabelText=$"JOUR {N}" ; corps opened_game_day=50 |
| 2 | Badge de retard (volume file) | backlog_badge | M9 | hook alpha 0 | ●●– | **DÉFAUT** | TopBar:1505-1508 alpha 0 ; :1433-1439 ruban hors périmètre |
| 3 | Carte à plus fort levier | hl_card | – | – | ●–– | question | AppShell:3 sites — consommée par ④, pas dessinée sur ① |
| 4 | File d'exceptions | queue | – | – | ●–– | question | AppShell:3 sites ; 6 en attente au corps /exceptions/queue |
| 5 | Pression de la file | queue_pressure_band | – | – | ●–– | question | AppShell:1 site ; corps = 'normal' |
| 6 | Budget structurel | structural_budget | – | – | ●–– | question | AppShell:4 sites — pas sur ① |
| 7 | Friction | friction_glance | – | – | ●–– | question | AppShell:1 site ; corps friction_bucket='balanced' |
| 8 | Semaine de compression | compression_glance | – | – | ●–– | question | AppShell:2 sites → HomeChrome banner, pas ① |
| 9 | Revue de drapeaux | flag_review | – | – | ●–– | question | 0 site (motif nu, contrôle positif OK) |
| 10 | Décantation | settling_glance | – | – | ●–– | question | 0 site (motif nu) |
| 11 | Onboarding | onboarding | – | – | ●–– | question | 0 site (motif nu) ; funnel_step='HOME_FIRST' |
| 12 | Identifiant de session | session_id | – | – | ●–– | plomberie | 0 site (motif nu) |
| 13 | Quart du jour | day_phase | M7b | « Aube » | ●●● | ✔ | DayPhaseResolver:52 DAWN→Aube ; corps day_phase='DAWN' |
| 14 | Nom de fiction du district | name | – | titre district | ●–● | à ratifier | interior name='Les Bassins' ; 3 sites — la maquette ne dessine pas de titre de district |
| 15 | Slug du district | name_canonical | – | – | ●–– | plomberie | 2 sites (identité) |
| 16 | Profil de district | profile | – | teinte | ●–● | à ratifier | DistrictCellView:1 — sous-teintes DA |
| 17 | Rive | bank_side | – | orientation | ●–● | à ratifier | DistrictCellView:1 |
| 18 | Blocs du district | blocks | – | cellules | ●–● | à ratifier | 2 sites ; 37 blocs |
| 19 | Bâtiments du district | buildings | – | marqueurs | ●–● | à ratifier | 4 sites ; 1 bâtiment en district 1 |
| 20 | Identifiant district | district_id | – | – | ●–– | plomberie | 2 sites (DistrictTinted) |
| 21 | Libellé district | district | – | – | ●–– | plomberie | 2 sites |
| 22 | Grille du district | grid | – | – | ●–– | question | 0 site (motif nu) ; 10×4 pour 37 blocs |
| 23 | Lieutenants du district | lieutenants | – | – | ●–– | **question forte** | 0 site de LECTURE ; corps = [] en district 1 ; DTO:183-189 le dit hors budget |
| 24 | Nom propre du bâtiment | name_i18n | M10 | « Colis Kofi » | ●●● | ✔ | ResoudreNomBatiment:1937-1951 ; corps enseigne='Colis Kofi' |
| 25 | Bande de conversion | conversion_band | M11 | « OPÉRATIONNEL » | ●●● | ✔ | fiche:1962 LibellesBatiment.Conversion |
| 26 | Bande de revenu | revenue_band | M12 | « Au repos » | ●●● | ✔ (bande assumée) | fiche:1973 ; corps IDLE |
| 27 | Chaîne de revenu | revenue_chain | M13 | « Coupée » | ●●● | ✔ (bande assumée) | fiche:1977 ; corps UNWIRED |
| 28 | État de l'ouvrage | condition_band | – | « Sain » | ●–● | à ratifier | fiche:1981 — occupe la case du HEAT LOCAL de la maquette |
| 29 | Type opérationnel | operational_type | – | repli titre | ●–● | **DÉFAUT (repli mort)** | LibellesBatiment:24-40 MAJUSCULES vs enum back MINUSCULES ; :1940 sans normalisation |
| 30 | Identité du bâtiment | building | – | – | ●–– | plomberie | 3 sites |
| 31 | Bloc du bâtiment | block_id | – | position | ●–● | à ratifier | 3 sites — jointure géographie |
| 32 | Activité | activity_band | – | – | ●–– | question | 1 site |
| 33 | Coquille | shell_state | – | – | ●–– | question | 0 site de LECTURE (2 sites = commentaires) |
| 34 | Phase de laps | lapse_phase_bucket | – | – | ●–– | question | 1 site |
| 35 | Maintenance en cours | maintenance_in_progress | – | – | ●–– | question | 1 site |
| 36 | Lieutenants affectés | lieutenant_ids | – | médaillons | ●–● | à ratifier | 3 sites ; corps = [] ici |
| 37 | Chaleur de la ville | citywide_bucket | M5/M6 | « BURNING » | ●●● | ✔ (mot, R2.2) | AppShell:675 ; journal chaleur=«BURNING» |
| 38 | Chaleur du district | district_bucket | – | – | ●–– | **question forte** | 0 site sur ① ; corps='COLD' — le médaillon montre la VILLE, pas le district |
| 39 | Chaleur par bâtiment | heat_bucket | M14 | – | ●●– | **DÉFAUT** | WorldDtos:141 déclaré, 1 occurrence arbre = la déclaration, 0 lecture ; corps='COLD' |
| 40 | Escalade de chaleur | escalated | – | – | ●–– | question | déclaré WorldDtos:150, lu par un AUTRE écran seulement |
| 41 | Libellé heat (racine) | district | – | – | ●–– | plomberie | clé 'district' du corps heat |
| 42 | Bâtiments (heat) | buildings | – | – | ●–– | plomberie | conteneur |
| 43 | Identité bâtiment (heat) | building | – | – | ●–– | plomberie | jointure |
| 44 | Nom i18n (heat) | name_i18n | – | – | ●–– | plomberie | doublon de l'interior |
| 45 | Libellé « Argent » | – | M1 | « ARGENT » | –●● | **à ratifier** | TopBar:932 littéral ; pas une clé back |
| 46 | Montant d'argent | – | M2 | « 9 627 820,00 € » | –●● | source hors archive | TopBar:485 CurrentWallet.cash_cents — DashboardClient hors du front archivé |
| 47 | Barre de ratio propre/sale | – | M3 | trait or plein 74px | –●● | **DÉFAUT** | TopBar:354 MoneyUnderlineWidthPx=74 (largeur du CONTENEUR) ; 1 seul Image, pas de piste |
| 48 | Cadran / aiguille | – | M4 | manomètre | –●● | ✔ (piloté par citywide) | TopBar arcs + aiguille |
| 49 | Heure HH:MM | – | M8 | – | –●– | **forme F (game_minute)** | game_minute ABSENT des 12 clés de session/open ; provenance corps le dit |
| 50 | CTA COLLECTER | – | M15 | message inerte | –●● | **DÉFAUT (action morte)** | :2051-2052 ; jointure bâtiment→dealer non projetée |
| 51 | CTA BLANCHIR | – | M16 | message inerte FAUX | –●● | **DÉFAUT (prose datée)** | :2055 « aucune planque » ; empreinte planques_n=2 ; createSafehouse:82 appelé onboarding-grant:411 |
| 52 | CTA AMÉLIORER | – | M17 | message inerte | –●● | à ratifier | :2058 — vit sur un autre écran |
| 53 | Dock Empire (actif) | – | M18 | onglet Empire | –●● | ✔ | AppShell:82 Tab.Empire |
| 54 | Dock Famille + pastille or | – | M19 | onglet Org, sans pastille | –●● | **DÉFAUT (pastille)** | AppShell:82 Tab.Org ; aucun `.disc` trouvé dans le front |
| 55 | Dock Marché | – | M20 | onglet Pipeline | –●● | **écart de nom** | AppShell:59-60 dock ratifié « Filière » ≠ « Marché » de la maquette |
| 56 | Dock Plus | – | M21 | onglet More | –●● | ✔ | AppShell:82 Tab.More |
| 57 | Libellé « JOUR » | – | – | « JOUR » | ––● | littéral | TopBar:500 — habillage du chiffre |
| 58 | Libellés fiche REVENU/CHAÎNE/ÉTAT | – | – | 3 littéraux | ––● | littéral | :1974,:1978,:1982 — ÉTAT remplace HEAT LOCAL du canon |
| 59 | Message d'état des CTA | – | – | 3 littéraux | ––● | **voir DÉFAUT BLANCHIR** | :2052,:2055,:2058 |

**Contrôle d'arithmétique** : |clés B| = 44 · |éléments M non appariés| = 12 · |rendus F sans source| = 3 · somme = 59 · lignes = 59 · ✅ ÉGAL

---

# Annexes

## 1. Routes du domaine (compte, ancres)

**148** contrôleurs non-`_test` dans `back-fc944b62/…/src/`, dont **71** portent `JwtAuthGuard`.
Balayage du domaine de ① (`city|world|session|autonomy|exceptions`, hors `-test`/`admin`) : **25
routes joueur** — ancres complètes dans `mesures/`. Les plus proches de l'écran :

- `citysim/district_interior/district-interior.controller.ts:96` — `@Get('city/district/:id/interior')`
- `citysim/heat/heat.controller.ts:52` — `@Get('city/district/:id/heat')`
- `citysim/world/world.controller.ts:39` — `@Get('world/districts')`
- `session/session.controller.ts:57` — `@Post('session/open')`
- `exceptions/exceptions.controller.ts:69,87,112` — `queue`, `escalations`, `:id/resolve`
- `operational/lieutenant/autonomy/autonomy-reports.controller.ts:41,56`
- `operational/laundering/laundering.controller.ts:79,129,170,183,203` — dont **`@Get('operational/laundering')` :170**
- `operational/money_holding/money-holding.controller.ts:64,85,119`

⚠️ **L'index du dossier n'est pas le domaine** : `_index.json` le dit lui-même — il liste les routes
que **le code de l'écran** appelle, jamais le domaine. Deux routes du domaine directement pertinentes
en sont absentes **par construction** : `GET /v1/operational/laundering` (Q2) et `GET /v1/exceptions/queue`.

## 2. Corps réels — `corps-reels/` + provenance

16 fichiers, base `a0623a5`, back `fc944b62`, 2026-09-06 11:02, minute 72 118, jour 50, district 1.
Empreinte 6 colonnes : `batiments_n=17 · cartes_levier_n=7 · horloge=72118 · lieutenants_n=3 ·
noms="Lt. Halde·Lt. Rook·Lt. Sallo" · planques_n=2`.
Les trois `_voisin_*` (session/open, autonomy-reports, exceptions/queue) viennent du dossier ④,
**même compte, même minute**.

**Routes de lecture du domaine SANS corps ⇒ DÉDUIT** (raison : corps non capturé) :
`GET /v1/operational/laundering` (**et c'est la clé de Q2**), `GET /v1/exceptions/escalations`,
`GET /v1/city/district/:id/{flow,throughput,stash,buffer,unconformity,leks,cohesion,inspection}`,
`GET /v1/city/precinct/:id/{belief,patrol}`, `GET /v1/city/citizens/whisper`, `GET /v1/world/threnny-edges`.
Les trois `POST_*` fournis ont `statut: null` (jamais appelés) : ils donnent la route, pas un ensemble de clés.

## 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine | contrainte lue |
|---|---|---|
| `operational_type` | 12 membres **minuscules** | `db/schema/operational_chain.ts:27-31` (pgEnum) |
| `conversion_band` | NOT_CONVERTED · IN_SETUP · OPERATIONAL | `CityProjectionDtos.cs:138` + corps |
| `condition_band` | SOUND · DAMAGED · REPAIRING · FAILED | `CityProjectionDtos.cs:140` |
| `revenue_band` / `revenue_chain` | IDLE·EARNING / WIRED·UNWIRED | `:141-142` |
| `lapse_phase_bucket` | WITHIN_WINDOW · SOFT · HARD · CRITICAL | `:144` |
| `day_phase` | DAWN · DAY · DUSK · NIGHT | `:181` + `DayPhaseResolver` |
| `heat_bucket` / `district_bucket` / `citywide_bucket` | COLD · WARM · HOT · BURNING | `WorldDtos.cs:141` |
| `cleanliness_band` | DIRTY · PARTIAL · MOSTLY_CLEAN · CLEAN | `laundering.projection.service.ts:18` |
| `backlog_badge` | bool, vrai si pending > seuil **10** (4..30) | `core-loops-tunables.ts:400-403` |

## 4. Inventaire M (Mxx → représente)

`M1` ARGENT (libellé) · `M2` montant · `M3` **barre de ratio 68 %** · `M4` cadran/aiguille ·
`M5` « 37% » · `M6` « Heat » · `M7` « Jour 12 · Soirée » · `M8` « 21:40 » ·
`M9` **`.bandeau-alerte`** · `M10` titre « LE VERGE D'OR » · `M11` « Bar · Quartier général » ·
`M12` « $ 2 400 / À collecter » · `M13` « $ 180/h / Revenus » · `M14` **« 12% / Heat local »** ·
`M15-17` COLLECTER / BLANCHIR / AMÉLIORER · `M18-21` dock Empire / Famille + pastille / Marché / Plus ·
`M22-23` volutes, losange (décor, non comptés).

**Exclus comme échafaudage d'atelier** (le dossier le dit, et le HTML le confirme — pilotés par les
bascules `#bascule`/`#chaudb` du `<script>`) : les 6 pastilles `.co`, `.bascule` 🌙, `.chaudb` 🔥,
`.floater` « + $320 », `.gyro`.
★ Une réserve : le `.floater` **n'est pas que du décor** — l'annotation ① le décrit comme une
intention de jeu (« *les « + $ » ambre montent des bâtiments qui rapportent vers le solde : l'argent
se voit gagner* »). Je le laisse hors table faute de mandat, mais il mérite un arbitrage explicite.
★ Vestige relevé : le CSS `.medaillon .jour/.heure/.phase` (`:51-53`) n'a **plus d'élément** dans le
HTML — l'horloge a migré vers l'aile droite (annotation ③). Sans conséquence, mais c'est du CSS mort.

## 5. Inventaire F (champ → sites → classe)

Comptes complets dans `mesures/F-usages-champs.txt` (motif pointé `\.champ\b`) et
`mesures/F-controle-zeros.txt` (motif **nu**, avec **contrôle positif** `day_phase`=18,
`citywide_bucket`=5 — le motif mord).

⚠️ **Trois « zéros » du motif pointé étaient faux** et le motif nu les a rattrapés : `shell_state` (2),
`lieutenants` (6), `district_id` (2). Vérification au corps : les 6 hits de `lieutenants` sont **tous
des commentaires ou des noms de variables de mise en page**, aucun n'est une lecture de
`DistrictInteriorDto.lieutenants` — le champ reste **IGNORÉ**. Idem `shell_state` (2 commentaires).
*Un hit vu est un fait déduit ; seul un hit classé est un fait compté.*

**Zéros confirmés au motif nu** : `grid`, `district_bucket`, `escalated`, `heat_bucket`, `session_id`,
`flag_review`, `settling_glance`, `onboarding`.

## 6. Non vérifié

1. **`GET /v1/operational/laundering` — corps non capturé.** C'est la mesure qui trancherait
   définitivement Q2 (valeur réelle de `cleanliness_band` sur le compte gelé). *Mesure qui
   trancherait : capturer ce corps à la prochaine fenêtre de stack.*
2. **Le succès réel de `POST …/laundering/inject`.** Prémisse réfutée (D5), mais la garde exige aussi
   un front-shop `OPERATIONAL` possédé ; **non testable sans stack**.
3. **Le montant d'argent (M2) et sa source.** `CurrentWallet.cash_cents` vient de `DashboardClient` /
   `WalletDto`, **hors de l'archive front fournie** (`CityMap/`, `Shell/`, `ShellContracts/` seulement).
   Le journal donne « 9 627 820,00 € » ; la clé back n'a pas été lue.
4. **Le seuil `exception_backlog_badge_threshold` en vigueur.** J'ai lu le **défaut (10)** et la plage
   (4..30) ; un override du `TunablesStore` n'est pas lisible sans la stack. La conclusion de Q1 tient
   quand même : à 6 en attente, tout seuil ≥ 7 donne `false`.
5. **Les 17 bâtiments du compte.** Le district 1 n'en montre **qu'un** (et **0 lieutenant**) : je n'ai
   pas pu vérifier le rendu de la fiche sur un bâtiment `front_shop`, ni le repli D6 en conditions
   réelles (`name_i18n` est servi partout ici).
6. **`grid` (10×4 = 40) contre `blocks` (37).** Écart non expliqué ; `grid` n'est lu nulle part.
   Sans conséquence connue, signalé parce que non élucidé.
7. **Les planches.** Je ne les ai pas ouvertes (mandat données) : tout ce qui précède est mesuré sur
   le **code** et les **corps**, jamais sur une image.
