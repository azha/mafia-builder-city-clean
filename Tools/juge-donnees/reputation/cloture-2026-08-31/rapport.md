# Juge données ⊥ — ㊲ La réputation (`screen_b3`) — clôture — 2026-09-01

## En une phrase

Sur **10 clés** que `GET /v1/me/reputation` peut porter, l'écran en **rend 8**, en **ignore 2**
(tout le groupe `restraint`) et en **jette 1 de plomberie** (`player_id`) ; il **affiche 2 textes
sans source**, dont un nom de lieutenant inventé (« SALVATORE ») et un avertissement
« `lieutenant.name` — non projeté » qui est **factuellement faux depuis que le back projette
`name` sur trois routes**. **4 défauts**, **6 questions « passé à côté ? »**, 3 lots back.

**Verdict : APPROUVÉ SOUS RÉSERVE** — aucun mensonge sur une donnée du domaine (les bandes,
les règles et les quatre poses sont fidèles), mais l'écran nomme le lieutenant d'un nom qu'il
invente tout en affirmant à l'écran que le serveur ne le donne pas. C'est le seul défaut qui
parle au joueur en le trompant ; les trois autres sont des données disponibles laissées au sol.

---

## Compte de mesure

- Compte **frais**, jamais `operational_demo` :
  - passe 1 — `jd-rep-1788286842`, `player_id = 01a05e33-b777-7804-9cba-ee517eadda6c`
  - passe 2 (celle qui fait foi) — `jd-rep-1788287094`, `player_id = 01a05e37-903a-726d-9c38-4454fea5a2c6`
- **Session ouverte puis FERMÉE explicitement** : `90-session-close.json` → `{"closed": true}`.
- ⚠️ **Erreur d'instrument, déclarée** : ma passe 1 envoyait `POST /v1/session/open` avec `{}` →
  **422 `client_version is required`** (`session.controller.ts:63-66`). Aucune session n'a donc
  été ouverte pendant la passe 1, et le `session/close` correspondant a répondu
  `{"closed": false}` — la réponse idempotente correcte, **pas** une session laissée pendante.
  Preuve conservée : `mesures/02-session-open-PASSE1-422.json`.
  ⇒ Instrument corrigé, **passe 2 rejouée sous session réellement ouverte**
  (`session_id = 1d851a4f-…`), et le corps de `me/reputation` est **identique hors `player_id`**
  (contrôle automatisé dans le log de mesure : `identique hors player_id : True`).
  Aucun chiffre de ce rapport ne dépend de la passe 1 seule.
- Aucun dénombrement pris sur une table entière : tout est filtré sur mon `player_id`.
- **Rien détruit** : aucun `DELETE`, aucun reset, aucun script de nettoyage, aucun conteneur touché.
- Stack : `docker ps` → 7 conteneurs **Up 28 hours**. ⚠️ Le dossier annonçait un redémarrage
  « il y a ~9 min » : ce n'est pas l'état observé. Sans conséquence sur mes mesures (je n'utilise
  pas `seed_operational_demo.mjs`), mais la prémisse du dossier sur ce point est périmée.

---

## Défauts, par gravité pour le joueur

| # | information | B | M | F | statut | preuve |
|---|---|---|---|---|---|---|
| **D1** | **le nom du lieutenant** | ● *(3 routes)* | ● | ● **inventé** | **DÉFAUT — valeur affichée sans source** | `ReputationPortrait.cs:56` écrit `"SALVATORE, VOTRE LIEUTENANT"` en dur. Or `name` est projeté par `GET /v1/lieutenants` (mesuré `"Lieutenant"`, `05-…json`), `GET /v1/lieutenants/:id` (`11-…json`) **et** `POST /v1/session/open` (`02-…json`, carte d'exception). |
| **D2** | **l'avertissement « non projeté »** | – | ● | ● | **DÉFAUT — libellé faux affiché au joueur** | `ReputationPortrait.cs:215` affiche `"lieutenant.name — non projeté (L0.4)"`. Le back a **fermé** ce trou : `lieutenant.projection.service.ts:139/212` — « C3 (D7, L0.5) … *defect n°1 of back.md's L0.4 table* ». L'écran publie une dette déjà payée. |
| **D3** | `restraint.offer_posture` | ● | ● (m-123 « les gages ») | – | **DÉFAUT — dessinée, disponible, non affichée** | 0 usage dans l'écran. `OffrePhrase`/`OffreCouleur` (`ReputationResolvers.cs:247,257`) écrits, **0 appelant**. Et `ReputationScreenController.cs:209` fixe `counterpartyId = null` par défaut, sans aucun appelant qui le renseigne ⇒ la section n'est **jamais demandée**. |
| **D4** | `restraint.marginalia[]` | ● | ● (m-123) | – | **DÉFAUT — idem** | 0 usage. `ReglementLibelle` (`ReputationResolvers.cs:237`) écrit, **0 appelant**. |

### Défaut secondaire (hygiène, pas couverture)

**D5 — la règle du fichier de résolveurs est enfreinte par son propre écran.**
`ReputationResolvers.cs` déclare en tête que *toute* correspondance domaine→apparence vit là.
Or `CoherencePhrase` et `CoherenceCouleur` (`:156`, `:167`) ont **0 appelant** : `AppliquerEtat`
(`ReputationScreenController.cs:359-397`) réécrit les trois libellés **et** les trois couleurs en
littéraux inline. La couverture est bonne (`consistency_cue` est bien rendu), mais les deux tables
peuvent diverger sans qu'aucune garde ne le voie — exactement le risque que le fichier dit prévenir.
`RestraintEstPresente` (`ReputationDtos.cs:197`), documenté sur 20 lignes comme « le discriminant
qui remplace un `!= null` qui ne marcherait pas », a lui aussi **0 appelant**.

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | `name` (`GET /v1/lieutenants/:id`) | *qui* est ce lieutenant | **utile ici, et c'est la réparation de D1/D2 en un geste** : l'écran tient déjà un `lieutenant_id`, la route est à un appel. Le miroir n'a de sens que si le reflet a un nom. | ★★★★★ |
| **Q2** | `tenure_bucket` (`…/:id`) | depuis combien de temps il vous sert (`FRESH`…) | **utile ici** : c'est ce qui distingue « il n'a rien absorbé parce qu'il est neuf » de « il n'a rien absorbé parce qu'il vous ignore ». L'écran a **deux** sous-titres pour cette nuance (`:362-364`) et les choisit sur `absorbe == 0`, un proxy — la vraie clé existe. | ★★★★★ |
| **Q3** | `archetype` (`…/:id`) | cuisinier, muscle, comptable… | **utile ici** : les 4 poses nomment des vertus (« la comptabilité tenue », « la ponctualité ») dont la portée dépend du métier. | ★★★★ |
| **Q4** | `drift_phase` (`…/:id`) | `DIRECT_ALIGNED` — s'il dérive de vos ordres | **utile ici** : l'écran a un cadre « dérive » entier bâti sur `consistency_cue`, qui parle de *vous* ; `drift_phase` parle de *lui*. Le miroir aurait ses deux faces. | ★★★★ |
| **Q5** | `flag_frequency_band` / `trust_budget_bucket` (`…/:id`) | à quelle fréquence il vous alerte ; sa marge de confiance | **plutôt oui** : c'est la contrepartie mesurable de « ce qu'il a absorbé ». | ★★★ |
| **Q6** | `player_id` (`me/reputation`) | l'identité de l'appelant | **pas ici** : c'est de la plomberie, l'écran sait déjà qui il est. Déclaré au DTO (`ReputationDtos.cs:171`), 0 usage — le jeter est le bon choix. | ☆ |

---

## Lots back suggérés (B⁻ dessiné — forme F)

| # | colonne | table | maquette | preuve |
|---|---|---|---|---|
| L-a | `violation_slots[] = {rule_id, severity}` | `boss_mirror_violation_ring` | compteur « ENFREINTES » (m-119) **et** « sur quelle règle » (m-121) | `db/schema/reputation_state.ts:91` — écrite, jamais projetée. Le front affiche `—` honnêtement (`ReputationScreenController.cs:313`). |
| L-b | `retraction_history` + **route de retrait** | `boss_mirror_declaration_ledger` | compteur « retirées » (m-122) | `reputation_state.ts:142`. `retractRule` (`boss-mirror.service.ts:206`) a **1 appelant, de test** (`reputation-test.controller.ts:729`), **0 en production** — contrôle positif : `declareRule` en a bien un (`reputation.controller.ts:106`). |
| L-c | table de **noms** de contreparties | *n'existe pas* | « les gages », noms (m-123) | `restraint_dispute_ring.counterparty_id` est un `uuid` **sans FK** (`reputation_state.ts:180`). |

### B⁻ — en base et non projeté (relevé, sans jugement de valeur)

`violation_density`, `defection_tolerance` (`:96-97`) · `consistency_index` (`:145`) ·
`restraint_ratio`, `offer_terms`, `wary_active`, `collateral_amount` (`:188-191`) ·
`norms_flags` (`:228`), `witnessed_event_ring` (`:231`).
⇒ **Tous délibérément retenus** : ce sont les scalaires que le mur P5 interdit de sortir
(`reputation.controller.ts:47-48`), et le back n'en projette que les **bandes**. **R2.2 : conforme,
aucune clé n'y déroge**, et aucun site du front ne reconstruit un scalaire depuis une bande.

⚠️ **Une nuance non-P5, elle** : `norms_flags` porte **8** normes, dont **4 seulement** deviennent
des poses (`hidden-curriculum.service.ts:74-82` ; les 4 muettes sont `silence_at_handoffs`,
`debt_handling`, `escalation_reflex`, `restraint_with_force`). La prose de l'écran — « **chaque**
vertu qu'il vous voit tenir finit sur sa tenue » (`ReputationScreenController.cs:392`) — est donc
vraie pour la moitié des normes. Ce n'est pas un mensonge de donnée, c'est un quantificateur trop
large ; « quatre de ses vertus » le corrigerait.

---

## Actions : routes ↔ CTA

| CTA / geste | route | statut |
|---|---|---|
| « DONNER UNE RÈGLE » / « DONNER UNE PREMIÈRE RÈGLE » (`ReputationScreenController.cs:319`) | `POST /v1/me/house-rules` (`reputation.controller.ts:93`) | ✔ apparié. Bascule sur `declarees == 0`, conforme à la maquette (`generateur-reputation.py:200/211`). |
| — *(aucun bouton de retrait, délibérément)* | *aucune route* | ✔ **JUSTE** : le canon veut le retrait, le code existe sans appelant de production ; l'écran ne dessine pas un geste qui échouerait. |
| « CHOISIR UN RAPPELÉ » (maquette m-123, dessiné **éteint**) | *aucune route ne liste les rappelés* | maquette : cadre déclaré inatteignable par la maquette elle-même (`:250-253`). Le front ne l'implémente pas ⇒ cohérent. |
| plafond de 4 déclarations | 409 `RESOURCE_STATE_CONFLICT` | ✔ mesuré `(4/4)`. Le client lit `current`/`cap` dans le refus et n'écrit pas « 4 » en dur (`ReputationClient.cs:73-74`) — **JUSTE**, le plafond est un tunable de plage 2..8. |

---

## Table de couverture complète

| # | information | B | M | F | statut | classe |
|---|---|---|---|---|---|---|
| 1 | `player_id` | ● | – | – | disponible, ni dessinée ni affichée | « passé à côté ? » (Q6 — non, plomberie) |
| 2 | `boss_mirror.portrait_posture` | ● | ● | ● | phrase + couleur + inclinaison du buste | ✔ |
| 3 | `boss_mirror.declared_rules[].rule_id` | ● | ● | ● | liste + compteur « RÈGLES DONNÉES » | ✔ |
| 4 | `boss_mirror.consistency_cue` | ● | ● | ● | sous-titre + verdict + panneau (3 états) | ✔ (voir D5) |
| 5 | `restraint.offer_posture` | ● | ● | – | **jamais demandée ni affichée** | **DÉFAUT D3** |
| 6 | `restraint.marginalia[]` | ● | ● | – | **jamais demandée ni affichée** | **DÉFAUT D4** |
| 7 | `uniform_tells.collar` | ● | ● | ● | voyant + libellé + dessin du col | ✔ |
| 8 | `uniform_tells.sleeves` | ● | ● | ● | voyant + libellé + dessin | ✔ |
| 9 | `uniform_tells.watch` | ● | ● | ● | voyant + libellé + dessin | ✔ |
| 10 | `uniform_tells.gloves` | ● | ● | ● | voyant + libellé + dessin | ✔ |
| 11 | compteur « ENFREINTES » | – | ● | `—` | dessinée sans source ; **le front affiche un tiret, pas un `00`** | ✔ **JUSTE** (lot L-a) |
| 12 | libellé en clair d'une règle | – | ● | – | maquette écrit « On ne touche pas aux familles » ; le front montre le `rule_id` brut | ✔ **JUSTE** (lot back : aucun libellé n'existe, i18n mesuré 0 clé du domaine) |
| 13 | compteur « retirées » | – | ● | – | dessinée sans source, non affichée | consigné (lot L-b) |
| 14 | cadre « les gages » / rappelé | – | ● | – | la maquette se déclare elle-même inatteignable | consigné (lot L-c) |
| 15 | nom du lieutenant | ●* | ● | ● | *(●\* = disponible sur 3 AUTRES routes, absente de `me/reputation`)* | **DÉFAUT D1** |
| 16 | « lieutenant.name — non projeté (L0.4) » | – | ● | ● | **affichée sans source, et fausse** | **DÉFAUT D2** |
| 17 | dénominateur « /4 » d'ABSORBÉES | – | ● | ● | en dur, mais = nombre de poses (structurel), et le DTO met en garde contre la confusion avec le plafond de règles (`ReputationDtos.cs:148-152`) | ✔ **JUSTE** |

**Contrôle d'arithmétique** : |clés B| = **10** (lignes 1-10) · |éléments M non appariés| = **5**
(lignes 11-14 + 17) · |rendus F sans source| = **2** (lignes 15-16) · **10 + 5 + 2 = 17 lignes** ✔

---

## Ce que j'ai trouvé JUSTE (et qui méritait de l'être)

1. **La polarité des quatre poses.** Neutre = `open/down/hidden/dirty`, actif =
   `buttoned/rolled/visible/clean` (`hidden-curriculum.service.ts:84-85`). **Mesuré sur compte
   frais : `open/down/hidden/dirty`** ⇒ un lieutenant vierge allume **zéro** voyant. Le client
   passe par une **fonction nommée unique** (`ActifEstAbsorbe`), asserttable — pas par des
   littéraux épars.
2. **`indeterminate` traité comme un état à part, jamais comme le cran médian d'une jauge.**
   Mesuré : c'est bien la valeur rendue sur compte frais, donc le **premier** état que tout joueur
   rencontre. Le front lui donne son propre cadre et sa couleur éteinte (`:173`).
3. **Les trous montrés au lieu d'être masqués** : `—` pour les enfreintes (avec, en commentaire,
   la rétractation argumentée d'un `00` qui aurait été un mensonge), `rule_id` affiché brut faute
   de libellé, aucun bouton de retrait.
4. **R2.2 respecté de bout en bout** : que des bandes, aucun scalaire, et aucune reconstruction de
   scalaire côté front.
5. **Le plafond lu dans le refus 409**, jamais écrit en dur — alors que c'est un tunable 2..8.
6. **`GET /v1/me/reputation` refuse proprement** : 404 sans `lieutenant_id`, 404 sur un lieutenant
   non possédé (l'existence n'est pas sondable), 422 sur un `counterparty_id` malformé.

---

## Ce que je n'ai pas pu vérifier

| # | non vérifié | raison | la mesure qui trancherait |
|---|---|---|---|
| N1 | `portrait_posture` ∈ {`cautious`,`withdrawn`,`hostile`} | dérivées de `violation_density`, qu'aucun chemin **joueur** n'incrémente ; seul `reputation-test.controller.ts` y touche. Mesuré : `attentive` uniquement. | exercer `POST /v1/_test/reputation/…` puis relire — hors de mon mandat (route de test). |
| N2 | `consistency_cue` ∈ {`aligned`,`drifting`} | `consistency_index` reste `null` sans rétractation, et **aucune route de production ne rétracte** (lot L-b). Mesuré : `indeterminate` avant **et après** 4 déclarations. | la route de retrait, qui n'existe pas. **C'est donc structurellement inatteignable en jeu aujourd'hui** — l'angle mort A5 du dossier est confirmé, et sa cause est L-b. |
| N3 | `offer_posture: "wary"` et `marginalia` non vide | il faut un `counterparty_id` **réel** ; mesuré : `counterparty_id` n'est **projeté par aucune route joueur** (grep sur tous les `*.controller.ts` — 2 hits, tous deux en **entrée**). Avec un UUID inexistant : `standard` + `[]`. | la table de contreparties (lot L-c). **Angle mort A6 du dossier : confirmé et mesuré.** |
| N4 | `marginalia == ["settlement-1",…]` | affirmé par `ReputationDtos.cs:70` et `ReputationResolvers.cs:229` d'après une mesure du 2026-08-30. **Je n'ai pas pu le reproduire** (voir N3) — je ne le reprends donc pas à mon compte. | idem N3. |
| N5 | le rendu Unity lui-même | pas d'éditeur Unity joignable (MCP `UnityMCP` : ConnectionRefused). Mes constats F sont **lus à la source**, avec `fichier:ligne`, jamais observés à l'écran. | la suite PlayMode `ScreenB3`. |
| N6 | le comportement de `JsonUtility` sur `restraint` omise | non mesurable sans éditeur ; **et sans objet ici**, puisque `RestraintEstPresente` n'a aucun appelant (D3/D4). | un test EditMode désérialisant `10-…json` (sans `restraint`) et `31-…json` (avec). |

---

## Annexes

### Annexe 1 — Routes du domaine (compte et ancres)

⚠️ Le dossier proposait `services/game-back/src/reputation/` et `…/lieutenant/` : **ces chemins
n'existent pas**. Le domaine est sous `operational/` — `operational/reputation/` (11 fichiers) et
`operational/lieutenant/`.

**14 routes joueur** (`@UseGuards(JwtAuthGuard)`, hors `-test`/`-admin`) :

| # | route | ancre | rôle pour ㊲ |
|---|---|---|---|
| 1 | `GET  /v1/me/reputation` | `reputation.controller.ts:127` | **la** route de lecture |
| 2 | `POST /v1/me/house-rules` | `reputation.controller.ts:93` | **la** route d'action |
| 3 | `GET  /v1/lieutenants` | `lieutenant.controller.ts:316` | roster — porte `name` |
| 4 | `GET  /v1/lieutenants/:id` | `lieutenant.controller.ts:333` | détail 18 clés — porte `name` |
| 5-12 | 8 `@Post` lieutenant | `lieutenant.controller.ts:178,220,256,293,357,424,508,546` | hors ㊲ |
| 13-14 | `autonomy-reports` (GET + POST) | `autonomy/autonomy-reports.controller.ts:41,56` | hors ㊲ |

Grep de contrôle sur **tous** les `*.controller.ts` (`reputation|mirror|house-rule|curriculum|
lieutenant|restraint|triad|lek`) : 13 hits hors test/admin, tous ci-dessus, plus
`GET /v1/city/district/:id/leks` (`citysim/deal_lek/deal-lek.controller.ts:50`) — domaine voisin.

**Écart des deux listes (temps 1)** : `ReputationClient.cs` ne connaît que les routes 1 et 2.
Les routes 3-4, qui portent `name`, `tenure_bucket`, `archetype`, `drift_phase`, **ne sont
appelées par aucun client de cet écran** — c'est la matière de Q1-Q5.

⚠️ Le back **ne projette jamais** `lek_memory` ni `forbidden_triad` sur cette route : ils sont
absents de `ReputationSurfaceProjection` **par construction** (`reputation.controller.ts:42-43`,
`reputation-hub.service.ts:233-252` — §0 interdit d'expédier un champ constant). 5 des 7 groupes
du hub, dont un optionnel. Ce n'est **pas** un défaut de couverture : rien ne les dessine non plus.

### Annexe 2 — Corps réels

Instrument : `mesures/00-mesure.sh` (bootstrap) et `mesures/90-close.sh` (fermeture).

| fichier | mesure |
|---|---|
| `01-signup.json` / `02-session-open.json` | compte frais + session (passe 2, valide) |
| `02-session-open-PASSE1-422.json` | **la preuve de mon erreur d'instrument** (422) |
| `03-me.json` / `04-buildings.json` | identité ; `GET /v1/me/buildings` **n'existe pas** (404 `Cannot GET`) |
| `05-lieutenants-avant.json` | `GET /v1/lieutenants` — 6 clés, dont `name` |
| `10-reputation-vierge.json` | `me/reputation` — compte neuf, 0 règle |
| `11-lieutenant-detail.json` | `GET /v1/lieutenants/:id` — **18 clés**, dont `name` |
| `12-reputation-session-ouverte.json` | idem 10, **sous session ouverte** — identique hors `player_id` |
| `20-declare-*.json` | 5 `POST /v1/me/house-rules` : 4×201, 1×**409 `(4/4)`** |
| `21-reputation-apres-regles.json` | `declared_rules` à 4 entrées ; `consistency_cue` **toujours** `indeterminate` |
| `30/31/32/33-*.json` | branches : 422 / 200+`restraint` / 404 / 404 |
| `90-session-close.json` | `{"closed": true}` |

### Annexe 3 — Ensemble de clés et valeurs possibles

`GET /v1/me/reputation`, clés triées (**|B| = 10**) :

```
boss_mirror.consistency_cue
boss_mirror.declared_rules[].rule_id
boss_mirror.portrait_posture
hidden_curriculum.uniform_tells.collar
hidden_curriculum.uniform_tells.gloves
hidden_curriculum.uniform_tells.sleeves
hidden_curriculum.uniform_tells.watch
player_id
restraint.marginalia[]      ┐ présentes SEULEMENT si counterparty_id est fourni
restraint.offer_posture     ┘ (omises, jamais neutralisées — design D-2)
```

| clé | type projeté | valeurs possibles | contrainte **source** |
|---|---|---|---|
| `player_id` | id opaque | uuid | `reputation-hub.service.ts:248` |
| `portrait_posture` | **bande** | `attentive` \| `cautious` \| `withdrawn` \| `hostile` | union TS `:65` ; seuils `densityToPostureBand` `:181-189` |
| `consistency_cue` | **bande** | `aligned` \| `drifting` \| `indeterminate` | union TS `:69` ; seuils `consistencyToCue` `:201-206` |
| `declared_rules[].rule_id` | **texte libre** | ⛔ **aucun enum** — chaîne joueur | `reputation.controller.ts:28` ; mesuré : `settle_fair`, `no_children_harmed`… acceptés tels quels |
| `offer_posture` | **bande** | `standard` \| `wary` | union TS `:81` |
| `marginalia[]` | liste | chaînes | `:83` |
| `uniform_tells.collar` | enum | `buttoned` \| `open` | union TS `:116` |
| `uniform_tells.sleeves` | enum | `rolled` \| `down` | union TS `:117` |
| `uniform_tells.watch` | enum | `visible` \| `hidden` | union TS `:118` |
| `uniform_tells.gloves` | enum | `clean` \| `dirty` | union TS `:119` |

Branches d'erreur **mesurées** :

| cas | attendu (doc du client) | **mesuré** |
|---|---|---|
| `lieutenant_id` absent | 404 | **404** ✔ |
| `lieutenant_id` non possédé | 404 | **404** ✔ |
| `counterparty_id` non-UUID | *le client annonce **500*** | **422 `VALIDATION_FAILED`** ⚠️ **doc périmée** |
| `counterparty_id` UUID inexistant | 200, section neutre | **200**, `standard` + `[]` ✔ |
| 5ᵉ house-rule | 409 | **409**, message `(4/4)` ✔ |

⚠️ **Deux commentaires du front à corriger** : `ReputationClient.cs:26-32` et
`ReputationScreenController.cs:207` affirment tous deux qu'un `counterparty_id` malformé rend
**500**. C'est vrai *pré-C1* et **faux aujourd'hui** — `UuidQuery` a été posé
(`reputation.controller.ts:130-135`) et je mesure **422**. La *règle d'appel* qu'ils en tirent
(« ne jamais fabriquer un identifiant ») reste bonne ; le fait cité ne l'est plus.

### Annexe 4 — Inventaire M (maquette)

Source : `generateur-reputation.py` (301 l.) + `chassis6.py`. 6 cadres → m-119…m-124.

| id | élément | représente | source |
|---|---|---|---|
| M1 | enseigne « Le miroir » + sous-titre | l'état de l'écran | `:190`, sous-titres `:184-189` |
| M2 | compteur « NN règles données » | `len(declared_rules)` | `:193` — **en dur** `len(REGLES)` = 3 |
| M3 | compteur « NN /4 absorbées » | nb de poses actives | `:194` — **en dur** `'02'` |
| M4 | compteur « NN enfreintes » | nb de violations | `:194` — **en dur** `'01'`, **sans source B** |
| M5 | nom du portrait « Salvatore » | `lieutenant.name` | `:156` — **en dur** |
| M6 | mention « lieutenant.name — non projeté (L0.4) » | l'aveu du trou | `:162` |
| M7 | phrase de posture | `portrait_posture` | table `POSTURE` `:52-55` |
| M8 | inclinaison du buste (0/6/14/20°) | `portrait_posture` | `:52-55`, appliqué `:113` |
| M9 | verdict de cohérence | `consistency_cue` | table `COHERENCE` `:58-60` |
| M10-13 | 4 voyants (libellé + sens) | `uniform_tells.*` | `TELLS_LIB` `:64`, `TELLS_SENS` `:66` |
| M14 | panneau de prose | l'état | `:196-210` |
| M15 | CTA « DONNER UNE RÈGLE » | `POST me/house-rules` | `:200`, `:211` |
| M16 | liste des règles + libellés en clair | `declared_rules` | `REGLES` `:173-175` — libellés **en dur** |
| M17 | compteur « retirées » | rétractations | `:226` — **en dur** `'—'`, sans source |
| M18 | « les gages » + noms de règlements | `restraint.*` | `:243-249` — la maquette **dit elle-même** « sans nom » |
| M19 | cadre « lots » (7 maillons L1-L7) | la dette back assumée | `:259-265` |

⚠️ **La maquette est honnête sur ses propres trous** : le cadre m-124 liste les 7 maillons
manquants, et m-123 est dessiné **éteint** avec la mention « ce cadre n'est pas atteignable
aujourd'hui ». Mes défauts D1/D2 ne portent donc **pas** sur la maquette — elle avoue « Salvatore »
comme fiction (`:162`). Ils portent sur le **front**, qui a recopié la fiction *et* l'aveu, sans
re-mesurer que l'aveu était devenu faux (lot L7 de la maquette : **livré côté back**).

### Annexe 5 — Inventaire F (champ → sites → classe)

Grep scopé aux 5 fichiers de l'écran. **Contrôle positif** : `PosturePhrase` → 1 site
(`ReputationScreenController.cs:326`), le site connu ⇒ le motif mord.

| champ DTO | sites | classe |
|---|---|---|
| `boss_mirror` | `:287` | LOGIQUE (déréférencement) |
| `portrait_posture` | `:325` (dessin), `:326` (phrase), `:327` (couleur) | **RENDU** |
| `declared_rules` | `:292` (compteur), `:321` → `:1051-1074` (liste) | **RENDU** |
| `rule_id` | `:1051`, `:1053`, `:1074` | **RENDU** (brut, assumé) |
| `consistency_cue` | `:297` → `AppliquerEtat` `:359-397` | **RENDU** (sous-titre + verdict + panneau) |
| `hidden_curriculum` / `uniform_tells` | `:288-289` | LOGIQUE |
| `collar`/`sleeves`/`watch`/`gloves` | via `ActifEstAbsorbe` (9 sites) + `CompteAbsorbe` (`:291`, `:300`) | **RENDU** (voyants + dessin + compteur) |
| `restraint` | **0** | **IGNORÉ** → D3/D4 |
| `offer_posture` | **0** *(hors `RestraintEstPresente`, lui-même à 0 appelant)* | **IGNORÉ** |
| `marginalia` | **0** | **IGNORÉ** |
| `player_id` | **0** | **IGNORÉ** (acceptable — Q6) |
| `declared` (POST) | `:238` | LOGIQUE |

**Affiché sans venir d'un champ** (avec `fichier:ligne`) :

| texte | site | verdict |
|---|---|---|
| `"SALVATORE, VOTRE LIEUTENANT"` | `ReputationPortrait.cs:56` | **D1 — nom inventé, source disponible** |
| `"lieutenant.name — non projeté (L0.4)"` | `ReputationPortrait.cs:215` | **D2 — affirmation fausse** |
| `"—"` pour ENFREINTES | `ReputationScreenController.cs:313` | ✔ juste (le trou montré) |
| `"/4"` d'ABSORBÉES | `:300` | ✔ juste (= nb de poses, structurel) |
| 3 libellés + 3 couleurs de cohérence | `:363-395` inline | ✔ pour la couverture, **D5** pour l'hygiène |
| prose des 4 panneaux | `:365-396`, `:429-433` | éditorial, repris de la maquette |

**Résolveurs à 0 appelant** (écrits, jamais atteints) : `CoherencePhrase`, `CoherenceCouleur`,
`ReglementLibelle`, `OffrePhrase`, `OffreCouleur` (`ReputationResolvers.cs`) et
`RestraintEstPresente` (`ReputationDtos.cs:197`). **6 correspondances domaine→apparence écrites
et non branchées** — dont 4 constituent le groupe `restraint` (D3/D4) : le front a été **écrit
pour** l'afficher, puis ne l'a jamais câblé.

### Annexe 6 — Hygiène de la pile (constaté, **non touché**)

- `Tools/seed_operational_demo.mjs` : **non exercé** par moi ; je ne confirme ni n'infirme les
  9 tests rouges annoncés par le dossier.
- Mon compte `jd-rep-1788287094` (+ celui de la passe 1) reste en base avec ses 2 lieutenants et,
  pour la passe 1, 4 règles déclarées. **Je ne les supprime pas** (consigne : ne rien détruire).
  Si un nettoyage est souhaité, il doit filtrer sur **ces deux `player_id`** — et sur rien d'autre :
  `01a05e33-b777-7804-9cba-ee517eadda6c` et `01a05e37-903a-726d-9c38-4454fea5a2c6`.
- Les deux sessions ouvertes par ce juge sont **fermées** (passe 1 : jamais ouverte, 422 ;
  passe 2 : `{"closed": true}`).
