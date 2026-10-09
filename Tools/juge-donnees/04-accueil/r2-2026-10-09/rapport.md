# Juge données ⊥ — ④ L'ouverture / Accueil (carte de TÊTE, cadre 5) — clôture — 2026-10-09

Back mesuré : `http://localhost` (Traefik → `mafia-clean-city-game-back-1`), dépôt
`/home/erutheone/project/mafia-clean-city` HEAD `cf54e9eb`, `server_build_ref.git_sha`
`241a9b6ef7025be65ca51eec30aa44f75f543450` (lu dans `mesures/02-session-open.json`).
Client : `/home/erutheone/project/mafia-builder-city-clean`, branche `gate/cumul-client-2026-09-22`.
Compte frais à moi seul (`mesures/compte.txt`). Aucun Unity, aucune suite E2E, aucun docker touché.

⚠️ Toutes les mesures HTTP sont passées par `rtk proxy curl` : `curl` seul est réécrit par le hook
et rend un **schéma** au lieu du corps (`mesures/01-signup.json` première version : 537 octets de
`{payload:{data:{access_token: string[423], …}}}`). Les corps collés ici sont les corps réels.

## Réponse à la question posée

**1. Ce que le back sert pour la carte de tête sur un compte neuf : `hl_card: null`.**

```
$ rtk proxy curl -s -X POST http://localhost/v1/session/open -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $TOKEN" -d '{"client_version":"jd-2026-10-09"}'
  "hl_card": null,
  "queue": [ { … "candidate_actions": [ 2 éléments … ] } ],
  "structural_budget": { "used": 0, "cap_reached": false },
  "onboarding": { "funnel_step": "HOME_FIRST", "first_decision_recorded": false },
```
(corps entier : `mesures/02-session-open.json`). Aucune liste d'options, aucun libellé, aucune
conséquence : la clé est `null`, pas vide. C'est honnête et conforme — les 8 fournisseurs exigent
tous un état (local endommagé / route coupée / ≥3 remontées escaladées / ≥1 rapport d'autonomie /
affaire active / nœud critique / maillon tendu / cascade) qu'un compte neuf n'a pas.
Vérifié par action joueur RÉELLE : escalade de la seule carte pré-semée, puis `session/close` +
`session/open` (le recompute n'a lieu que sur le chemin d'ouverture FRAÎCHE, `session.service.ts:151`) :

```
$ … /v1/exceptions/$EXC/resolve -d '{"method":"ESCALATE","chosen_action_id":"escalate"}'
  RESOLVE: {"data": {"resolved": true, "outcome": "ESCALATED"}}
  CLOSE:   {"data": {"closed": true}}
  REOPEN hl_card = null        REOPEN queue len = 0
```
1 escaladée < `hlEscalationBacklogMin` = 3 (`core-loops-tunables.ts:463-466`). `mesures/03*`.

**2. Oui — et le back ne sait servir QUE 2 options.** Compté sur les 8 fournisseurs
(`services/game-back/src/progression/loop10/providers/*.ts`) : 8/8 émettent exactement 2 options,
jamais 3 ni 4, toujours « agir » puis « laisser » (`mesures/09-options-par-fournisseur.out`).
Le contrat dit « 2..4 » (`hl-card-types.ts:99`) ; la cardinalité RÉALISÉE est 2 partout. Les options
sont persistées (`hl-card.repository.ts:84` `options: winner.options`, idem `:136` au réactivé),
donc toute carte servie en production porte 2 options. Condition d'apparition = l'état par
fournisseur ci-dessus ; aucune n'est atteignable sur un compte neuf par une action joueur seule.

**3. Ce que fait le front selon le nombre d'options** (`HighestLeverageCardController.cs`) —
`RendreLesOptions` ne s'ouvre QUE sur `o.Length == 2 && o[0] != null && o[1] != null` (`:314`) :

| options | carte ordinaire | carte des rapports (`AUTONOMY_REPORTS_PENDING`) |
|---|---|---|
| 0, 1, ≥3 | titre + niveaux + 1 geste « Prendre acte » (`:340`) ; **ni** surtitre **ni** conséquence **ni** note | titre + niveaux + 1 geste « Lire maintenant » (repli `:283`) |
| **2** | + surtitre « Ce qu'on peut faire » (`:328`), option[0] et option[1] en TEXTE (`:329-330`), note (`:331`) ; 1 geste | 1 geste = option[0] (`:324`) ; **option[1], les 2 conséquences, le surtitre et la note sont JETÉS** (`:320-325`) |

L'écran décrit par le dossier (titre + niveaux + **un** geste, rien entre les niveaux et le geste,
rien dessous) correspond **exactement** à la case bas-droite : carte des rapports à 2 options.
Jamais à `hl_card: null`, qui rend « Rien à signaler » / « Aucune décision en attente », niveaux
masqués (`:304`) et **aucun** geste (`:251-252`). Discriminateur à lire sur la capture : le mot du
geste — « LIRE MAINTENANT » ⇒ carte des rapports à 2 options ; « PRENDRE ACTE » ⇒ carte ordinaire à
options ≠ 2 (inatteignable en production, cf. §2). Provenance de chaque mot : `mesures/08-*.out`
(9 des 10 littéraux sont des clés SERVIES).

**4. Dessiné sans source : RIEN.** Les 8 éléments porteurs du cadre 5 ont tous une source servie —
les 2 gestes et les 2 lignes de conséquence sont **identiques au caractère** aux valeurs du bundle
(`mesures/05-cadre5-vs-bundle.out`, 4/5 paires égales ; la 5ᵉ est le titre, cf. BLOQUANT-1).
**Servi et non affiché** : les 16 `hl.option.*.projected_consequence` (DÉFAUT-2), `target_ref`,
`status`, `surfaced_at` (en base, non projetés).
⚠️ **Le dossier annonce « 4 » lignes de conséquence dans le cadre ; il y en a 2.** `csq4` est le nom
de CLASSE (= cadre 4), pas un compte : `|.csq4| = 2` (`mesures/05-*.out`).

## En une phrase

La carte de tête recense **23** informations ; **11** sont affichées comme dessinées, **6 défauts**
(dont **1 bloquant** : le titre rend les accolades d'un pluriel ICU pour 3 des 8 fournisseurs, y
compris celui que la maquette dessine), **8 questions « passé à côté ? »** (dont 4 colonnes en base
sur 8 non projetées). Rien n'est dessiné sans source et le front n'invente aucun texte : les 2
lignes de conséquence que la maquette dessine sont **déjà servies, au caractère près**, et jamais
lues.

## Défauts

| # | information | B | M | F | statut | preuve |
|---|---|---|---|---|---|---|
| 1 | **titre de la carte** | ● | ● | ✗ | **BLOQUANT** — rend le motif ICU BRUT, accolades à l'écran, pour 3 des 8 fournisseurs | `mesures/06-titres-hl-icu.out` : `decision.type.DAMAGED_BUILDING_REPAIR` = `'{n, plural, one {Un local à remettre en état} other {Des locaux à remettre en état}}'` ; `LibellesDecision.cs:51` appelle `Libelle.Gabarit("decision.type."+cle, null)` — **aucun `n`** ; `I18nCatalog.cs:211-212` `if (!long.TryParse(valeur, out n)) return "{" + corps + "}"`. 3/8 : `DAMAGED_BUILDING_REPAIR`, `SEVERED_ROUTE_REBUILD`, `MYCELIAL_STRESSED_LEG` |
| 2 | **conséquence projetée par option** (2 lignes) | ● | ● | – | **DÉFAUT** — servie, dessinée, jamais affichée | 16 clés `hl.option.*.projected_consequence` servies (`mesures/04-i18n-bundle-fr.json`) ; texte de la maquette **identique** au servi (`mesures/05-*.out`, csq4 #1 et #2 `[OK]`) ; `projected_consequence` lu **0** fois dans `Assets/Scripts/Shell` (contrôle positif même motif/même scope : `decision_type_key` = 9) |
| 3 | **2ᵉ geste / route `skip`** | ● | ● | – | **DÉFAUT (consigné)** — route et CTA existent, aucun geste ne l'appelle | `hl-card.controller.ts:51-57` `POST session/hl-card/:id/skip` ; maquette `.g` « Laisser en l'état », **sans** `prop` (= ratifié) ; `RequestSkip` : 0 appel de production (2 occurrences dans `Assets/Scripts` = sa déclaration `:223` + un commentaire `:89`) — couvert par la table des écarts assumés |
| 4 | **option[1] + conséquences sur la carte des rapports** | ● | ● | – | **DÉFAUT** — les 2 options sont lues puis jetées | `HighestLeverageCardController.cs:320-325` : seul `agir` (option[0]) va sur le geste ; `surtitreText`, `recommandationText`, `alternativeText`, `noteText` restent `""` (`:241-245`) donc masqués (`:302-305`). Maquette cadre 2 : 2 gestes **et** 2 `.csq4` |
| 5 | provenance de « Lire maintenant » | ● | ● | ● | **MINEUR** — la condition de l'écart assumé est inatteignable | L'écart dit « sans exactement 2 options servies » ; mesuré §2 : les 8 fournisseurs en servent toujours 2 ⇒ le repli `:281-285` est mort en production, le libellé vient de `hl.option.autonomy_reports.review_now` = `'Lire maintenant'` (servi). Et la clé de repli `accueil.carte.lire_maintenant` **n'est pas servie** (12 clés `accueil.carte.*`, `mesures/08-*.out`) |
| 6 | `accueil.carte.pas_maintenant`, `accueil.carte.pret` | ● | – | – | **MINEUR** — 2 clés servies que le front ne lit plus | `mesures/08-*.out` (inventaire des 12 `accueil.carte.*`) ; « Prêt » retiré `:289`, « Pas maintenant » retiré `:89` |

### Sur le BLOQUANT-1 — ce qui a laissé passer le trou
`LibellesDecision.cs:50` affirme : « Pas de `n` servi aujourd'hui (target_count viendra avec le lot
HL) : **branche « one »** ». C'est une **déduction, pas une mesure**, et le code la réfute :
`Choisir` (qui porte la règle `one`) n'est atteint qu'**après** un `long.TryParse` réussi
(`I18nCatalog.cs:213-214`). Sans `n`, `Resoudre` sort avant, sur `return "{" + corps + "}"`.
Le test PlayMode qui couvre ce résolveur amorce le catalogue avec
`{ "decision.type.DAMAGED_BUILDING_REPAIR", "§Réparer" }` (`LibellesDecisionPlayModeTests.cs:85`) —
une valeur **simple**, pas la valeur SERVIE. Il prouve la casse de la clé, jamais la résolution du
pluriel : vert en couvrant autre chose. La maquette cadre 5 dessine précisément
`DAMAGED_BUILDING_REPAIR`, l'un des 3 pluriels.

⚠️ **Le signal est inversé — le défaut ne sort que quand l'i18n MARCHE.** Les deux chemins, lus
ligne à ligne :
- **bundle chargé** (cas normal, mesuré : la clé est servie) — `Connait` vrai (`I18nCatalog.cs:142-143`)
  ⇒ `Traduire(cle, null)` ⇒ `Formater(motif, null)` ⇒ bloc ICU brut ⇒ `!IsNullOrWhiteSpace` vrai
  (`Libelle.cs:124`) ⇒ **retourné tel quel**. Accolades à l'écran.
- **bundle en panne** (catalogue vide) — `Connait` faux ⇒ `Gabarit` rend `repli`, ici **`null`**
  (`LibellesDecision.cs:51` passe `null`) ⇒ `LibellesDecision.cs:52` bascule sur
  `Lisible(cle)` = « Damaged building repair » (`:99-105`). Lisible, sans accolade.

Donc un essai fait i18n coupée (ou sur un catalogue de test amorcé à la main) rend un titre
**propre** et innocente le cas. C'est la configuration SAINE qui est cassée.

## « Passé à côté ? » — pour l'user

| # | clé (route / table) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| 1 | `highest_leverage_cards.target_ref` (B⁻, jsonb NOT NULL, `core_loops.ts:48`) | **lequel** : quel local, quelle route, quel rapport | **utile ici, et déjà manquant** : le titre dit « Un local à remettre en état » sans dire lequel ; le front va chercher le nom par une **2ᵉ requête** (`GET /v1/autonomy-reports`, `HighestLeverageCardController.cs:162-170`) faute de l'avoir dans la charge | **fort** |
| 2 | `target_count` / le `n` du pluriel (n'existe nulle part) | un local ou des locaux | **utile ici** : sans lui 3 titres sur 8 sont irrésolubles (BLOQUANT-1). C'est le lot back qui ferme le bloquant | **fort** |
| 3 | `highest_leverage_cards.status` (B⁻, enum `active\|committed\|skipped\|superseded`) | « vous avez déjà mis cette carte de côté » | **utile ici** : une carte reportée est aujourd'hui indistinguable d'une carte neuve — c'est la mémoire du geste `skip` | moyen |
| 4 | `highest_leverage_cards.surfaced_at` (B⁻) | depuis quand elle attend | **utile ici** en bande (jamais en horodatage : R2.2) — l'ancienneté est ce qui fait monter une décision | moyen |
| 5 | `hl_card.structural` (servi, `● – ` en rendu) | cette décision consomme le budget de structure du jour | **pas ici** tant que les 8 fournisseurs sont tous advisory (`structural` = `false` par construction, `hl-card-types.ts:83-85`) — à ressortir quand un fournisseur structurel arrivera | faible |
| 6 | `structural_budget.used` (servi) | combien de décisions de structure déjà prises | **pas sur cette carte** : déjà publié au chrome (`AppShell.cs:709` → `JetonDeStructure`) | faible |
| 7 | `queue[0].candidate_actions[].projected_consequence` (servi **en clair dans le corps**, `mesures/02-*.json`) | ce que chaque geste de la ligne de file ferait | **utile**, hors carte de tête : la ligne `.suivant` ne montre que « trancher » alors que la conséquence est déjà dans la charge | moyen |
| 8 | `highest_leverage_cards.resolved_at` (B⁻) | quand la carte a été tranchée | **pas ici** : plomberie d'historique (surface BO) | faible |

## Lots back suggérés (B⁻ dessiné, forme F)

| # | colonne | table | maquette | preuve |
|---|---|---|---|---|
| 1 | `target_ref` | `highest_leverage_cards` | cadre 2 `.sous` « Lt. Quist a un rapport pour vous » | écrit (`hl-card.repository.ts:84` via `winner.targetRef`), relu (`findCarried`), passé au compositeur (`session-open-sequence.service.ts`), **omis par `projectHlCard`** (`hl-card-projection.ts:126-135` : 6 clés, pas `target_ref`). Le front compense par une 2ᵉ route — forme F caractéristique |
| 2 | le `n` du pluriel (colonne à créer, ou aplatir les 3 clés) | — / `i18n/string_table.ts` | cadre 5 `.titre` | `mesures/06-titres-hl-icu.out` : 3 des 8 titres sont des pluriels ICU, la projection ne porte aucun compte ⇒ accolades à l'écran |
| 3 | `status` | `highest_leverage_cards` | — (non dessiné) | `core_loops.ts:52` ; non projeté (6 clés). Prérequis pour redonner un sens au `skip` du défaut 3 |

## Actions : routes ↔ CTA

| route joueur (`@Post`, `@UseGuards(JwtAuthGuard)`) | CTA maquette (cadre 5) | geste front | statut |
|---|---|---|---|
| `POST /v1/session/hl-card/:id/commit` (`hl-card.controller.ts:41-47`) | `.g.or` « Mettre en réparation » | `CommitButton` appui long, libellé **« Prendre acte »** (`:446-449`) + alternative par SAISIE (`:486-491`) | ✔ branchée ; le **mot** diffère de la maquette (celle-ci met l'option sur le geste) — consigné par la table des écarts |
| `POST /v1/session/hl-card/:id/skip` (`:51-57`) | `.g` « Laisser en l'état » (ratifié, sans `prop`) | **aucun** — `RequestSkip` sans appelant de production | **DÉFAUT 3** (consigné) |
| `POST /v1/session/open` (`session.controller.ts:57`) | — | `AppShell.cs:1836` `hlCard.SetPayload(...)` | ✔ |
| `POST /v1/session/close` (`:76`) | — | hors écran | ✔ |
| — (navigation, aucune route) | surface de la carte | `SurfaceButton` → `OnOuvrirDetail` → ⑤ (`:414-417`) | ✔ geste sans route, par construction |
| — (navigation, aucune route) | cadre 2 `.g.or` « Lire maintenant » | `lireButton` → `OuvrirLesRapports` (`:154-160`) | ✔ |

## Table de couverture complète

Portée : la carte de TÊTE (cadre 5 de la maquette + `HighestLeverageCardController.cs`). Surfaces de
lecture mesurées : `POST /v1/session/open`, `GET /v1/i18n/bundle?locale=fr|en`, `GET /v1/autonomy-reports`.

| # | information | B | M | F | statut | classe |
|---|---|---|---|---|---|---|
| 1 | `hl_card.card_id` | ● | – | ● (logique) | id opaque, porte commit/skip ; jamais montré | ✔ |
| 2 | `hl_card.decision_type_key` → titre | ● | ● | ✗ | **accolades ICU pour 3/8** | **DÉFAUT 1** |
| 3 | `hl_card.impact_bucket` → « Portée » | ● | ● | ● | affichée comme dessinée | ✔ |
| 4 | `hl_card.urgency_bucket` → « Urgence » | ● | ● | ● | affichée comme dessinée | ✔ |
| 5 | `hl_card.options[].label` (2) | ● | ● | ● (texte, pas bouton) | écart de FORME consigné (texte vs geste) | ✔ consigné |
| 6 | `hl_card.structural` | ● | – | ● (logique seule) | disponible, ni dessinée ni montrée | question 5 |
| 7 | `structural_budget.used` | ● | – | ● (hors écran) | publié au chrome | question 6 |
| 8 | `structural_budget.cap_reached` | ● | – | ● (logique) | conditionne `CapBlocked` | ✔ |
| 9 | i18n `decision.type.<PROVIDER>` (8 clés servies sur 24) | ● | ● | ✗ | cf. ligne 2 | **DÉFAUT 1** |
| 10 | i18n `hl.option.<f>.<o>` (16 clés) | ● | ● | ● | les mots des options | ✔ |
| 11 | i18n `hl.option.<f>.<o>.projected_consequence` (16 clés) | ● | ● | **–** | **servie, dessinée, non affichée** | **DÉFAUT 2** |
| 12 | `reports[].lieutenant` (`GET /v1/autonomy-reports`) | ● | ● (cadre 2) | ● | 2ᵉ requête faute de `target_ref` | ✔ (lot back 1) |
| 13 | i18n `accueil.carte.ce_qu_on_peut_faire` | ● | ● (`prop`) | ● | surtitre | ✔ |
| 14 | i18n `accueil.carte.prendre_acte` | ● | – (étiquette seule) | ● | affichée sans être dessinée | à ratifier |
| 15 | i18n `accueil.carte.prendre_acte_n_agit_pas_a_votre_place` | ● | – | ● | affichée sans être dessinée | à ratifier |
| 16 | i18n `accueil.carte.portee` + `…urgence` | ● | ● | ● | libellés des niveaux | ✔ |
| 17 | i18n `accueil.carte.rien_a_signaler` + `…aucune_decision_en_attente` | ● | ● (cadre 0) | ● | état « rien à trancher » | ✔ |
| 18 | i18n `accueil.carte.limite_de_structure_atteinte` | ● | – | ● | affichée sans être dessinée | à ratifier |
| 19 | i18n `accueil.carte.tapez_mot` | ● | – | ● | alternative de saisie (canon, pas la maquette) | à ratifier |
| 20 | i18n `accueil.carte.la_decision_n_a_pas_ete_prise` | ● | – | ● | phrase de refus | à ratifier |
| 21 | i18n `accueil.carte.pas_maintenant` | ● | ● (cadre 2 `.g`) | – | servie + dessinée, plus lue | **DÉFAUT 6** |
| 22 | i18n `accueil.carte.pret` | ● | – | – | servie, ni dessinée ni lue | MINEUR |
| 23 | i18n `chrome.bandeau.rapport` | ● | ● (cadre 2) | ● | entrée du rapport | ✔ |

**Contrôle d'arithmétique** : `|clés B| = 23` · `|éléments M non appariés| = 0` ·
`|rendus F sans source| = 0` · **somme = 23 = nombre de lignes**. ✔

- `|M non apparié| = 0` : les 8 éléments porteurs du cadre 5 (`|.titre|=1`, niveaux 2, `|.sur|=1`,
  `|.g|=2`, `|.csq4|=2` — `mesures/05-*.out`) s'apparient tous à une clé B. **Rien n'est dessiné
  sans source sur le cadre 5.**
- `|F sans source| = 0` : les 10 littéraux du contrôleur passent tous par une clé, et 9 sur 10 sont
  SERVIES (`mesures/08-*.out`). Le front **n'invente aucun texte** et ne code aucun nombre en dur.
  La seule clé non servie est `accueil.carte.lire_maintenant`, sur un chemin de repli mort (défaut 5).

### B⁻ — en base, non projeté (`highest_leverage_cards`, `db/schema/core_loops.ts:41-55`)
11 colonnes en base, 6 clés projetées (`hl-card-projection.ts:114-121`, épinglées par
`tests/e2e/core_loops/hl_card.spec.ts:897`). Non projetées : **8** —
`player_id`, `session_ref` (plomberie d'identité), `impact_internal`, `urgency_internal`
(**délibéré, R2.2** : `hl-card-projection.ts:17-19` « the raw floats NEVER escape past this file »),
`target_ref`, `status`, `surfaced_at`, `resolved_at` (**candidates**, lots back ci-dessus).

## Annexes

### 1. Routes du domaine (compte et ancres)
Grep du mot du domaine sur **tous** les contrôleurs, puis exclusion des `-test`
(`find . -name '*.controller.ts' | wc -l` = **149** ; non-`_test`/`-test` = **113**) : la carte de
tête est portée par **2** contrôleurs, **4** routes joueur, toutes sous `@UseGuards(JwtAuthGuard)` :
- `session/session.controller.ts:57` `@Post('session/open')` — la seule route de **lecture** de la carte.
- `session/session.controller.ts:76` `@Post('session/close')`.
- `progression/loop10/hl-card.controller.ts:41` `@Post('session/hl-card/:id/commit')`.
- `progression/loop10/hl-card.controller.ts:51` `@Post('session/hl-card/:id/skip')`.

**8 fournisseurs LIVE**, pas 7 : `loop10.module.ts:93-102` enregistre 8 entrées dans
`new HlCardProviderRegistry([…])` (`mesures/10-registry-live.out`), et 8 fichiers existent dans
`providers/`. L'en-tête de `hl-card-provider.registry.ts:16` dit encore « the closed set of **7** v1
LIVE HL card providers » — **commentaire périmé** (il précède l'ajout de `CUE_CASCADE_FALLOUT`,
code 108, P3-D C7). MINEUR, mais c'est la phrase qu'on lirait pour compter sans mesurer.

Information du croisement avec le client : la classe `HlCardController` vit dans `progression/loop10/`
alors que son **espace d'URL** est `/v1/session/hl-card/*` — le dossier ne nommait que
`src/session/`, les 2 routes d'action étaient hors de cette liste. Côté client, les 4 mêmes URL,
construites à : `SessionClient.cs:23` (`/v1/session/open`), `:71` (`/v1/session/close`),
`HlCardClient.cs:28` (`/v1/session/hl-card/{cardId}/commit`), `:40` (`…/skip`).
**Recouvrement complet** : aucune route joueur du domaine sans client, aucun client sans route.
Routes de lecture **complémentaires** que le contrôleur d'écran appelle : `GET /v1/i18n/bundle`
(`I18nClient.cs:33`) et `GET /v1/autonomy-reports` (`HighestLeverageCardController.cs:165`).

### 2. Corps réels — `mesures/`
| fichier | commande |
|---|---|
| `01-signup.json` | `POST /v1/auth/signup` (Idempotency-Key requis) |
| `02-session-open.json` | `POST /v1/session/open` — **compte neuf, 1ʳᵉ ouverture** |
| `03a-resolve.json`, `03b-close.json`, `03c-reopen.json` | escalade RÉELLE + close + reopen (recompute) |
| `04-i18n-bundle-fr.json`, `04-i18n-bundle-en.json` | `GET /v1/i18n/bundle?locale=…` — 2088 clés chacun |
| `07-autonomy.json` | `GET /v1/autonomy-reports` → `{"reports": []}` |
| `05-cadre5-vs-bundle.py/.out` | cadre 5 ↔ bundle, égalité binaire |
| `06-titres-hl-icu.py/.out` | les 8 titres HL, détection de pluriel ICU (+ contrôles ± ) |
| `08-mots-du-front.py/.out` | les 10 littéraux du contrôleur → clé dérivée → servie ou en dur |
| `09-options-par-fournisseur.out` | options par fournisseur (8/8 à exactement 2) |
| `.cmd` | la commande de chaque mesure, telle que lancée |

### 3. Valeurs possibles par clé, avec la contrainte source
| clé | valeurs possibles | contrainte lue à la source |
|---|---|---|
| `impact_bucket` | `minor` \| `moderate` \| `major` | union TS `hl-card-projection.ts:44` ; coupures `impactBucket` `:50-54` (<0,4 / [0,4;0,7) / ≥0,7) |
| `urgency_bucket` | `low` \| `elevated` \| `pressing` | union TS `:46` ; coupures `:58-62` |
| `decision_type_key` | les **8** clés du catalogue HL (codes 101-108) ∪ les 14 `StructuralDecisionType` ∪ `'UNKNOWN'` | `HL_CARD_PROVIDER_CATALOGUE` `hl-card-types.ts:86-97` ; `decisionTypeLabelFor` `hl-card-projection.ts:90-96` |
| `options` | tableau de `{label}` ; contrat 2..4 (`hl-card-types.ts:99`), **réalisé : exactement 2**, 16 libellés possibles | compté sur les 8 fournisseurs, `mesures/09-*.out` |
| `structural` | `false` pour **tout** v1 (codes ≥101 jamais dans 1-14) | `hl-card-types.ts:83-85` + `catalogueStructuralEntryFor` |
| `status` (B⁻) | `active` \| `committed` \| `skipped` \| `superseded` | enum PG, `core_loops.ts:88-89` |
| `card_id` | uuid | `core_loops.ts:44` |
| `structural_budget.used` | compteur ≥ 0 | `session-open-sequence.service.ts` (header : « the player's OWN action count ») |

### 4. Inventaire M — cadre 5 (`ecrans-brennar-accueil.html`, dernier `<div class="cadre">`, 6 cadres 0-based)
| id | texte tel qu'écrit | classe | représente |
|---|---|---|---|
| M1 | « Un local à remettre en état » | `.titre` | le type de décision (branche `one` du pluriel servi) |
| M2 | « Portée » + « modérée » | `.niveaux span`+`b` | `impact_bucket` |
| M3 | « Urgence » + « faible » | `.niveaux span`+`b` | `urgency_bucket` |
| M4 | « Ce qu'on peut faire » | `.sur prop` | surtitre de la zone d'options — **PROPOSÉ** |
| M5 | « Mettre en réparation » | `.g or` | option[0], **sur un geste** |
| M6 | « Laisser en l'état » | `.g` | option[1], **sur un geste** |
| M7 | « Chaque réparation se paie tout de suite… » | `.csq4 prop` | conséquence de option[0] — **PROPOSÉ** |
| M8 | « Rien n'est payé, mais ce qui est endommagé… » | `.csq4 prop` | conséquence de option[1] — **PROPOSÉ** |

`.prop` = dessin **proposé**, rendu en souligné pointillé : `ecrans-brennar-accueil.html:725`
`.acc4 .prop{text-decoration:underline dotted #b9ad92…}` ; `:726` nomme la source des mots
(« la ligne de conséquence sous chaque option (design HL v7.6, A9 et §6-C ; mots : client
`57-hl-consequences-2026-09-26.tsv`), PROPOSÉE »). **M5 et M6 ne portent pas `prop`** : les deux
gestes sont dessinés comme ratifiés, ce sont les conséquences et le surtitre qui sont proposés.
Le bloc `.suivant` (la ligne de file haute) est l'affaire du cadre 4, hors carte de tête.

### 5. Inventaire F — champ → sites → classe (`Assets/Scripts/Shell/`)
Comptes par `rtk proxy grep -c '\.<champ>\b'`, scopés aux fichiers de l'écran, puis **chaque site lu** :

| champ `HlCardDto` | HLCC | AppShell | classe | sites |
|---|---|---|---|---|
| `card_id` | 3 | 1 | **LOGIQUE** | `:135` (test de nullité → `NoCard`), `:184` commit, `:230` skip |
| `decision_type_key` | 4 | 0 | **RENDU** + **LOGIQUE** | `:268`/`:286` titre (RENDU) ; `:109-110` `EstCarteDesRapports` (LOGIQUE) |
| `impact_bucket` | 2 | 0 | **RENDU** | `:269`, `:287` → `LibellesDecision.Portee` |
| `urgency_bucket` | 2 | 0 | **RENDU** | `:270`, `:288` → `LibellesDecision.Urgence` |
| `options` | 1 | 0 | **RENDU** (carte ordinaire) / **LOGIQUE** (carte des rapports) | `:313` seul site ; `:329-330` texte, ou `:324` libellé du geste |
| `structural` | 1 | 0 | **LOGIQUE** | `:139` → `CapBlocked` |
| `structural_budget.used` | 0 | 1 | **hors écran** | `AppShell.cs:709` → `JetonDeStructure.Publier` |
| `structural_budget.cap_reached` | 1 | 1 | **LOGIQUE** | `:133` → `CapReached` |

Rendus **sans venir d'un champ** (littéraux par clé, tous dans `HighestLeverageCardController.cs`) :
`:260` « Rien à signaler », `:263` « Aucune décision en attente », `:271` « Limite de structure
atteinte », `:283` « Lire maintenant » (repli mort), `:328` « Ce qu'on peut faire », `:331`
« prendre acte n'agit pas à votre place », `:340`/`:449` « Prendre acte », `:432` « Portée » et
« Urgence », `:480` « tapez {mot} », `:191` « La décision n'a pas été prise. ».
**Aucun nombre en dur, aucune valeur dérivée d'une bande** : la carte ne reconstruit aucun scalaire
(R2.2 respecté côté front).
Résolveurs nommés lus : `LibellesDecision.Type/Portee/Urgence` (`LibellesDecision.cs:44-80`) —
`Portee`/`Urgence` couvrent les **3 valeurs** de chaque union et renvoient une valeur hors domaine
sur `Repli.Etat` (jamais la valeur brute, `:62-64`) : aucun libellé de bande manquant.
`Type` est le résolveur défaillant (DÉFAUT 1).

### 6. Non vérifié
1. **L'état exact de la capture du dossier.** Je n'ai lu aucune capture de jeu (le dossier ne
   fournit que 2 PNG de **maquette**, atelier `4bd3ea2`, et m'interdit les répertoires de juges).
   Sur mon compte frais `hl_card` est `null` ⇒ l'écran décrit (titre + niveaux + 1 geste) **n'est pas
   reproductible sur compte neuf**. Mesure qui trancherait : lire le mot du geste sur la capture
   (« LIRE MAINTENANT » ⇒ carte des rapports à 2 options ; « PRENDRE ACTE » ⇒ carte ordinaire).
2. **Le BLOQUANT-1 n'est pas vérifié à l'écran** : il est établi par lecture de code
   (`I18nCatalog.cs:209-215`) + valeur servie mesurée, pas par un rendu. Mesure qui trancherait :
   un test PlayMode qui amorce le catalogue avec la valeur **SERVIE**
   (`'{n, plural, one {…} other {…}}'`) et asserte que `LibellesDecision.Type("DAMAGED_BUILDING_REPAIR")`
   ne contient ni `{` ni `}` — ou une capture au créneau Unity. Je n'ai ouvert ni Unity ni la porte.
3. **Aucune carte de tête mesurée sur un corps réel.** Les 6 clés de `hl_card` et la cardinalité 2
   des options sont établies par le code + l'épinglage E2E (`hl_card.spec.ts:897`), pas par un
   `hl_card` non nul servi par la stack. Mesure qui trancherait : 3 remontées escaladées (il m'en
   fallait 3, le compte neuf n'en offre qu'1) ou 1 rapport d'autonomie — aucun atteignable par
   action joueur sur un compte neuf ; les specs y arrivent par **écriture directe en base**
   (`seedBuilding`, `seedNodePressure`, `seedRoutesOneSevered`), que le dossier m'interdit.
4. **Le `n` d'un pluriel pourrait venir d'ailleurs** que du site lu : j'ai vérifié le seul appelant
   (`LibellesDecision.cs:51`, `Gabarit(cle, null)` — second argument `null`, aucun dictionnaire),
   mais je n'ai pas audité un éventuel pré-remplissage global du catalogue côté client.
5. **Locale réellement servie au jeu** : j'ai mesuré `?locale=fr` et `?locale=en` (2088 clés
   chacune, les 32 `hl.option.*` dans les deux). Je n'ai pas vérifié quelle locale le shell demande
   au démarrage, donc pas lequel des deux bundles l'écran porte.
6. **Les 16 `.projected_consequence` servies ne sont lues par AUCUN écran**, pas seulement par ④ :
   compté 0 dans `Assets/Scripts/Shell`, et les 15 occurrences de `projected_consequence` du dépôt
   portent sur le champ **inline** du DTO d'exception, jamais sur ces clés i18n. Je n'ai pas audité
   les ~40 autres écrans un par un.
7. **Cardinalité des options côté données persistées anciennes** : `options` a un
   `default '[]'::jsonb` (`core_loops.ts:51`), donc une ligne écrite avant que les fournisseurs ne
   servent 2 options porterait `[]` et rendrait le chemin `o.Length != 2`. Je n'ai lu aucune ligne
   réelle de `highest_leverage_cards` (aucune n'existait sur mon compte).
