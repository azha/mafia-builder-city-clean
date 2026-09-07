# Juge données ⊥ — ㊳ Le journal & la rue — clôture — 2026-09-07

> ⊥ : je n'ai ni dessiné la maquette ni construit l'écran. Je n'ai ouvert aucun rapport de juge,
> aucune note d'implémentation, aucun inventaire de dette. Toutes les mesures de ce rapport sont
> dans `mesures/` (commande + sortie). Back mesuré sur **compte FRAIS** créé par moi
> (`mesures/compte-frais.txt`), conteneur `game-back` recréé le 07/09 — **le SHA de l'image n'est
> pas imprimé par une route : DÉDUIT**, jamais opposé à une valeur.

## En une phrase

L'écran montre **7 informations** sur les **49 clés** que le back sert pour ce domaine (6 routes de
lecture), en rend **5 lignes visibles sur les 35 qu'il annonce lui-même**, et il affiche des clés
brutes alors que **le bundle porte le texte français des 7 clés de la planche** : **11 défauts**
(dont 3 majeurs), **12 questions « passé à côté ? »**, **4 lots back** suggérés.

---

## Réponses aux 4 questions prioritaires du dossier

### Q1 — Les 10 clés i18n brutes en titre : trou de contenu ou artefact d'image ?

**Ni l'un ni l'autre exactement : la déclaration de f2 est CONFIRMÉE, et le finding reste ouvert
pour une AUTRE cause que celle supposée.**

**a) La déclaration de f2 est confirmée, au chiffre près** (`mesures/i18n_bundle_fr_prefixes.txt`) :

```
GET /v1/i18n/bundle?locale=fr  →  http=200, 82 145 octets, JSON valide
  n_messages   = 886        (f2 déclarait 886 après recréation) ✅ CONFIRMÉ
  news_beat.*  = 154        (f2 déclarait 154)                  ✅ CONFIRMÉ
  press.*      =   9        (f2 déclarait 9)                    ✅ CONFIRMÉ
```

**b) Les clés de la planche sont TOUTES dans le bundle** (`mesures/Q1-cles-planches-vs-bundle.txt`) :
les deux planches affichent **10 occurrences** de clé brute chacune, soit **6** et **7** clés
distinctes ; **13/13 sont PRÉSENTES**, avec leur texte français. Contrôle négatif :
`news_beat.digest.ambient_micro.journal_inexistant.headline` → ABSENT (le motif sait rendre faux).

| clé affichée brute sur la planche | valeur servie aujourd'hui par le bundle `fr` |
|---|---|
| `press.outlet.free_weekly.name` | `The Free Weekly` |
| `press.outlet.tilbey_weekly.name` | `The Tilbey Weekly` |
| `press.outlet.brennar_daily_star.name` | `Brennar Daily Star` |
| `news_beat.digest.ambient_micro.free_weekly.headline` | `Pendant ce temps, à {district}` |
| `news_beat.digest.ambient_micro.tilbey_weekly.headline` | `Petites nouvelles de {district}, qui restent des nouvelles` |
| `news_beat.digest.ambient_micro.brennar_daily_star.headline` | `Faits mineurs consignés à {district}` |
| `news_beat.hindsight.op_ed.free_weekly.headline` | `Les avertissements étaient là. Et tout le monde qui les ignorait aussi` |

**c) MAIS le front n'a AUCUN chemin de code pour les résoudre — mesuré, pas supposé.**
`JournalScreenController.cs:654-655` : `Lib(x) => Libelle.De("journal","bloc", x)`. Les **33** appels
de `Lib(` ne reçoivent QUE des littéraux français (`mesures/F-litteraux-affiches-sans-champ.txt`) ;
les clés du serveur sont passées **telles quelles** en titre à `Ligne(…)` (`:344`, `:349`, `:358`),
et le docblock `:649-653` le dit en toutes lettres (« N'Y PASSENT PAS … Elles s'affichent TELLES
QUELLES »).

⇒ **Verdict** : le **trou de CONTENU est refermé** (le texte existe, 13/13). Le finding « clés brutes
en titre » n'est **pas** un artefact d'image : il survit à la recréation du conteneur, parce que sa
cause n'est pas le bundle mais **l'absence de résolveur côté front**. Une capture refaite
aujourd'hui, sur le même code, réafficherait les mêmes clés. ⇒ **D1 (BLOQUANT)**.
⚠️ Reste vrai côté maillon L2 : `headline_i18n_key` est un **gabarit ICU à trous** (`{district}`) —
mais le back sert désormais **`headline_params_fields`** (objet à 4 champs DÉCLARÉS, lisible par
`JsonUtility`) que le DTO du front **ne déclare pas** ⇒ **D2**.

### Q2 — « 20 + 13 + 02 = 35 annoncés contre 5 cartes » : où passent les 31 autres ?

**Trois routes confirmées. Le front n'en tronque aucune : il les rend TOUTES puis les CLIPPE.**

**a) Les routes et leurs cardinaux, mesurés sur mon compte frais** (`mesures/B-ensembles-de-cles.txt`) :

| compteur de l'écran | route | cardinal mesuré (compte frais) | portée |
|---|---|---|---|
| À LA UNE | `GET /v1/news/feed` | **20** beats, `nextCursor = null` | **ville entière** (D14, aucun scoping joueur) |
| DANS LA RUE | `GET /v1/ambient/feed` | **3** events (`total`=3, `limit`=20, `offset`=0) | quartiers où le joueur possède ≥1 bâtiment |
| EN COURS | `GET /v1/random-world/active` | **1** event | idem |
| — | `GET /v1/random-world/known-couplings` | **0** (mesuré à vide) | par joueur |

**b) Confrontation à la déclaration f2 « le back en sert 36 sur trois routes » : DIVERGENCE.**
Je mesure **24** (20+3+1) sur mon compte frais, et les deux planches annoncent **35** chacune
(20+13+02 sous chrome ; **15+16+04** sur l'écran seul — le dossier ne cite que la première).
Ni 36 ni 35 ne sont reproductibles ici : `news/feed` est **city-wide** donc partagé, mais
`ambient/feed` et `random-world/active` sont **scopés aux quartiers possédés**, donc dépendants du
compte photographié (`demo_capture`, que je n'ai pas le droit de toucher). **« 36 » n'est pas
mesurable depuis ma position ; « 3 routes » est CONFIRMÉ.**

**c) Où passent les autres — mécanisme, mesuré à la source, ni troncature ni pagination :**

1. **Le front ne pagine pas et ne filtre pas** : `JournalClient.cs:30/74/128` construisent des URL
   **nues** — `mesures/F-parametres-de-requete-jamais-passes.txt` : `limit`/`offset`/`cursor`/
   `category`/`?` = **0** occurrence dans les 7 URL construites.
2. **Le front rend TOUTES les entrées** : `RendreListe` (`:341-360`) boucle sur `breves`, puis `rue`,
   puis `monde`, sans borne — 35 `Ligne` construites.
3. **Le CADRE les coupe** : `ConstruireListe` (`:558-582`) pose `RectMask2D` + `flexibleHeight = 1`
   sur le cadre, et un contenu ancré en haut avec `ContentSizeFitter`. Le commentaire `:554-557` le
   déclare : « *Ce n'est PAS un défilement : les brèves du bas ne sont pas atteignables. C'est un
   manque ASSUMÉ* ».

⇒ **Réponse : CLIPPING**, assumé et documenté. **Mais la conséquence ne l'est pas** : l'ordre de
rendu est news → rue → monde, donc dès qu'il y a ≥5 beats, **« DANS LA RUE » et « EN COURS » sont
structurellement invisibles**. Les deux planches le prouvent : **5 cartes visibles, 5 beats** —
zéro brève de rue, zéro événement de ville, alors que l'écran en annonce 13+2 et 16+4. ⇒ **D3
(BLOQUANT)**.

**d) Deux mécanismes LATENTS mesurés au passage, non observés aujourd'hui :**
- `FEED_PAGE_SIZE_DEFAULT = 20` (`news.projection.service.ts:172`) et le DTO du front **ne déclare
  pas `nextCursor`** (`JournalDtos.cs:20-23`) ⇒ le jour où la ville produit >20 beats en 48 h, le
  compteur « À LA UNE » **plafonne à 20** sans que rien ne le dise. Contrôle fait :
  `?limit=100` rend **20** et `nextCursor = null` ⇒ **20 est le vrai total aujourd'hui**, pas un cap.
- `ambient/feed` sert `total` (le vrai total) ; le compteur utilise `rue.Length` (la page) ⇒ même
  plafond latent à 20. `total` est **déclaré dans le DTO et lu 0 fois** ⇒ **D8**.

### Q3 — Le bloc « à la une » : le back distingue-t-il une « une » ?

**NON. Aucun rang, aucun poids, aucun `is_headline` — ni en base, ni en projection.**
(`mesures/Q3-existe-t-il-une-une.txt`)

- `news_beat` a **15 colonnes** : `id, game_day, thread_id, template_id, outlet_key, journalist_key,
  district_id, beat_category, frame, headline_i18n_key, body_i18n_key, params, source_attribution,
  fodder_refs, created_at`. Balayage de 12 mots de rang (`salience, rank, priority, weight,
  is_headline, headline_rank, featured, lead, top, score, importance, prominence`) → **0 colonne**.
  Contrôle positif : `categ` → `beat_category` (le motif sait trouver).
- La projection `NewsFeedBeatView` a **9 champs**, aucun de rang.
- L'ordre du feed est **purement chronologique** : `news-beat.repository.ts:974`
  `.orderBy(desc(newsBeat.created_at), desc(newsBeat.id))`.
- La **salience existe** mais c'est un état interne de `news_thread.payload` (jsonb), propre au
  template `three_outlet_storm` (22 occurrences en ligne active dans `brennar-daily.service.ts` /
  `news-beat-generator.service.ts`) — **jamais projetée**, et R2.2 en interdirait le scalaire brut.

⇒ **Ni B ni B⁻ ne portent « la une ».** La maquette M125 dessine pourtant une hiérarchie franche
(bloc `.une` avec `<h5>` + angle, contre trois `.brv` compacts) : c'est **dessiné sans source**.
Les deux axes éditoriaux réellement servis sont `category` (5 valeurs, **filtrable côté serveur** via
`?category=`) et `recency_band` — **tous deux ignorés par le front**. ⇒ **Q-a du tableau des
questions** + ligne « – ● – » de la table de couverture.

### Q4 — `district-13 · fresh` : quel champ, quel résolveur ? Et le CTA ↔ `POST ambient/attend/:id`

**a) `district-13`** — champ `district`, projeté comme un **slug fabriqué côté serveur** :
`` `district-${row.district_id}` `` (`news.projection.service.ts:251`,
`ambient.projection.service.ts:86`, `random-world.projection.service.ts:123` — 3 producteurs,
même forme). Le front l'affiche **tel quel** (`JournalScreenController.cs:393`). **Aucun résolveur**
ni côté front, ni côté bundle : les 26 clés `district.*` du bundle sont **toutes**
`district.type_batiment.*` (types de bâtiment) ; `district.district-13.name`, `district.13.name`,
`district-13` → **3 formes cherchées, 3 ABSENTES** (`mesures/Q4-district-et-recency-dans-le-bundle.txt`).
La maquette, elle, écrit des noms de fiction (« Dépôt-Est », « La Lisière », « Les Bassins »).
⇒ **D5** (front) + **lot back L-B1** (table de noms de quartier).

**b) `fresh`** — champ `recency_band`, union fermée `'fresh' | 'settling' | 'fading'`
(3 producteurs distincts, 3 dérivations différentes : heures réelles pour news
`news.projection.service.ts:279-284`, fraction de fenêtre de décroissance pour ambient `:83`,
jours de jeu pour random-world `:143-147`). **Mot anglais brut = valeur brute, oui** : le front
concatène la bande sans la traduire (`JournalScreenController.cs:394-395`
`dessous = quartier + " · " + fraicheur`), et le bundle n'a **aucune** clé pour ces bandes
(`fresh` → 2 clés, toutes deux `error.auth.refresh_*` ; `fading` → **0**). La maquette dessine
« ce matin » / « hier » **avec une couleur**. ⇒ **D4**.

**c) ★ Trouvaille adjacente, du même balayage : le résolveur de PHASE vise la mauvaise union.**
(`mesures/Q4-resolveur-phase-vs-union-back.txt`, oracle python + contrôles positif/négatif)

```
BACK  random-world.projection.service.ts:47  RandomWorldPhaseBand = onset · unfolding · receding · lingering · permanent
FRONT JournalScreenController.cs:404-415     PhaseEnMots cases    = starting · unfolding · settling · lingering · permanent
      membres back SANS cas front  → ['onset', 'receding']     ⇒ affichés BRUTS, en anglais
      cas front SANS membre back   → ['starting', 'settling']  ⇒ code MORT
      couverture = 3/5
```
`settling` **existe** côté back — mais dans `RandomWorldRecencyBand` (`:48`), **une autre grandeur**.
Le résolveur a été écrit sur le **vocabulaire de la maquette** (les 5 mots du cadre 126), pas sur
l'union servie. Les clés `journal.bloc.ca_commence` et `journal.bloc.ca_retombe` sont dans le
bundle et **ne peuvent jamais être atteintes**. ⇒ **D6 (BLOQUANT)**.

**d) Le CTA « Y PRÊTER ATTENTION » ↔ `POST /v1/ambient/attend/:id` (maillon L3)** :
**la route existe** (`ambient.controller.ts:77-84`, `@Post` + `@HttpCode(200)` + `@UseGuards(JwtAuthGuard)`,
`@Param('id', UuidParam)`, corps vide). **Le client a la méthode** (`JournalClient.cs:94`). **Le
contrôleur ne l'appelle jamais** : `client.PostAmbientAttend` → **0 appel** ; idem
`GetNewsBeats`, `GetRandomWorldKnownCouplings`, `PostRandomWorldHollowAttendFuneral` — **4/7
méthodes du client jamais appelées** (`mesures/F-inventaire-usages-dto.txt`). Aucun CTA n'est
construit dans `BuildLayout` (enseigne, compteurs, liste, panneau — 4 blocs, `:699-703`).
⇒ **L3 confirmé OUVERT** : ce n'est pas « la route manque », c'est **l'appelant** (forme C du socle).
⇒ **D9**. ⚠️ Le dossier annonce que #130 déclare « L1/L3 » ; **le cadre en déclare QUATRE** :
L1 (écrire les titres), L2 (`headline_params` à trous), L3 (aller à un enterrement), **L4 (le détail
d'un article — « aucun écran ne l'ouvre »)** — `mesures/M-maquette-cadres-125-130.txt:489-511`.
Divergence avec le dossier, à consigner.

---

## Défauts

| # | information | B | M | F | statut | preuve |
|---|---|---|---|---|---|---|
| **D1** | **Titre d'une brève (texte)** | ● le bundle porte le texte des 7 clés de la planche | ● « Un corps repêché sous le pont de Stack » (`M-maquette…txt:60`) | ✖ affiche la CLÉ | **DÉFAUT — BLOQUANT** | `Q1-cles-planches-vs-bundle.txt` (13/13 présentes) · aucun appel de résolution sur les clés serveur : `JournalScreenController.cs:344/349/358`, docblock `:649-653` |
| **D2** | **Paramètres du gabarit de titre** (`{district}`) | ● `headline_params_fields` = objet à 4 champs DÉCLARÉS, servi et mesuré | ● le titre en clair | ✖ champ **non déclaré** ⇒ jeté en silence par `JsonUtility` | **DÉFAUT** | mesuré : `B-ensembles-de-cles.txt` (`headline_params_fields` sur 20/20 beats, clés `district/subject/outlet`) · absent de `JournalDtos.cs:41-50` (7 champs déclarés sur 9 servis) |
| **D3** | **Les listes « dans la rue » et « en cours »** | ● 3 + 1 (frais) / 13 + 2 et 16 + 4 (planches) | ● 3 brèves + 3 événements dessinés (cadres 125/126) | ✖ rendues puis **clippées** — 0 visible sur les 2 planches | **DÉFAUT — BLOQUANT** | `ConstruireListe` `:558-582` (`RectMask2D`, `flexibleHeight=1`) ; ordre news→rue→monde `:341-360` ; les 2 planches : 5 cartes, 5 beats |
| **D4** | **Fraîcheur** | ● `recency_band` ∈ {fresh, settling, fading} | ● « ce matin » / « hier » + **pastille colorée** (`:65,71,74,80,83,89`) | ✖ mot **anglais brut**, aucune couleur | **DÉFAUT** | `:394-395` ; aucune clé de bande dans le bundle (`Q4-district…txt` : `fading` → 0 clé) |
| **D5** | **Quartier** | ● `district` = slug `district-N` | ● nom de fiction (« Dépôt-Est », « La Lisière ») | ✖ slug brut | **DÉFAUT** (front) + **lot back** | `:393` ; 3 formes de clé cherchées, 3 absentes (`Q4-district…txt`) |
| **D6** | **Phase d'un événement de ville** | ● `phase_band` ∈ {onset, unfolding, receding, lingering, permanent} | ● 5 mots + 3 couleurs distinctes (cadre 126) | ✖ **3/5** résolus ; `onset`/`receding` **bruts en anglais** | **DÉFAUT — BLOQUANT** | `Q4-resolveur-phase-vs-union-back.txt` (oracle + contrôles) ; back `:47` vs front `:404-415` |
| **D7** | **Sévérité d'un événement** | ● `severity_band` ∈ {faint, noticeable, heavy} | ● jauge à **3 crans** + mot (« à peine » / « on en parle » / « ça pèse ») — `M-maquette…txt:159-167,175-183,191-199` | ✖ champ déclaré, **0 site actif** | **DÉFAUT** | `F-inventaire-usages-dto.txt` : `.severity_band` → 0 |
| **D8** | **Total réel de la rue** | ● `total` (+ `limit`, `offset`) | ● compteur « 04 dans la rue » | ✖ 3 champs déclarés, **0 site actif** — le compteur lit la PAGE | **DÉFAUT** | `.total`/`.limit`/`.offset` → 0 ; compteur `:252` = `rue.Length` |
| **D9** | **Le geste « assister »** | ● `POST ambient/attend/:id` (`ambient.controller.ts:77`) | ● CTA « Y PRÊTER ATTENTION » + note (`M-maquette…txt:92-95`) | ✖ méthode client présente, **0 appel**, aucun CTA construit | **DÉFAUT** (= maillon L3) | `client.PostAmbientAttend` → 0 appel ; `BuildLayout:699-703` = 4 blocs, pas de pied |
| **D10** | **Les couplages découverts** | ● `GET random-world/known-couplings` (4 champs projetés) | ● tout le cadre 128 : source → cible, « ? → ? », compteur « compris » | ✖ **route jamais appelée**, DTO `string[]` non typé | **DÉFAUT** | `client.GetRandomWorldKnownCouplings` → 0 appel ; `JournalDtos.cs:160-171` |
| **D11** | **Le détail d'un article** | ● `GET news/beats/:id` mesuré, **14 clés** (corps + byline + badges + sujet) | ● (déclaré manquant par #130 L4) | ✖ méthode client présente, 0 appel, `GetNewsBeatsResponseDto` **vide** | **DÉFAUT** (= maillon L4) | `mesures/FRAIS_GET_news_beats_id.json` ; `JournalDtos.cs:58-62` |

**Mineurs**
- **m1** — `Lib("Rien ce matin.\nLa ville a passé une nuit tranquille.")` (`:335`) est le **seul** des
  26 littéraux distincts **sans entrée** dans le bundle (25/26 appariés **par valeur**, 0 clé
  orpheline — `mesures/F-litteraux-vs-bundle-journal-bloc.txt`). Il marche par **repli sur le
  littéral** : invisible en français, muet en toute autre langue.
- **m2** — `"(sans clé)"` (`:390`) est affiché sans être ni dessiné ni traduit : **le seul rendu F
  sans aucune source**.
- **m3** — `beat_id`, `event_id` (×2), `kind`, `channel`, `category`, `frame_tag_i18n_key` :
  **7 champs déclarés dans le DTO et lus 0 fois**. Reçus et jetés.

---

## « Passé à côté ? » — pour l'user (disponible, jamais dessiné, jamais affiché)

Classées par intérêt joueur décroissant. **Je propose, l'user tranche.**

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| 1 | `body_i18n_key` + `body_params` (`news/beats/:id`) | **le corps de l'article**, en français dans le bundle (ex. « Les petites choses de {district} cette semaine… ») | **utile ici** : c'est la seule surface où le monde PARLE au joueur ; taper une brève pour lire l'article est le geste naturel de l'écran. C'est le maillon L4, et il est prêt côté back. | ★★★ |
| 2 | `byline_i18n_key` (`news/beats/:id`) | **qui signe** — 6 journalistes nommés dans le bundle (Hettie Dunmore, Juna Marens…) | **utile** : une signature récurrente crée un personnage sans une ligne de code de plus ; c'est ce qui distingue deux articles du même journal. | ★★★ |
| 3 | `sourceless_badge` / `wire_badge` (`news/beats/:id`) | « article **sans source citée** » / « dépêche » | **utile** : c'est le seul signal qui apprend au joueur à ne PAS croire un titre. Thématiquement central pour un jeu où la presse ment. | ★★★ |
| 4 | `category` (`news/feed`, 5 valeurs) + `?category=` | la rubrique (`national`, `brennar_local`, `business`, `arts`, `sports`) — **filtrable côté serveur** | **utile** : c'est le plus proche substitut d'une « une » (Q3), et le filtre est déjà écrit. ⚠️ demande 5 libellés i18n, aucun n'existe. | ★★ |
| 5 | `pair_i18n_key` (`known-couplings`) | le couplage découvert **en fiction française** : « ce que tient votre planque et ce que la rue vient disputer » | **utile ici** : c'est la récompense de long terme que le cadre 128 dessine, et le texte fiction existe déjà (2 paires). ⚠️ **ne PAS afficher** `source_system_label`/`target_system_label` : ce sont des libellés de développeur en anglais (« System 9 — Erlang Stash (saturation) »). | ★★ |
| 6 | `subject_i18n_key` (`news/beats/:id`) | **de quoi ça parle** — une clé `ambient.micro_event.*` traduite (« un tramway en panne ») | **utile** : relie l'article à la brève de rue qui l'a déclenché ; c'est la couture entre les deux listes de l'écran. | ★★ |
| 7 | `frame_tag_i18n_key` (`news/feed` + détail) | **l'angle** — 8 libellés français dans le bundle (« angle corruption », « angle abandon du quartier ») | dessiné (M15 « fait divers ») mais jamais affiché ⇒ déjà en **D**. Mesuré `null` sur 20/20 beats du compte frais : le champ existe, la valeur pas encore. | ★★ |
| 8 | `discovered_recency_band` (`known-couplings`) | depuis quand ce couplage est connu | **pas ici** : sans le couplage lui-même (Q5) ça ne dit rien ; à garder pour un tri. | ★ |
| 9 | `channel` (`ambient/feed`, 3 valeurs) | par quel canal la rumeur circule (`constant_hum`, `trade_channel`, `bar_talk`) | **peut-être** : trois canaux = trois façons d'apprendre une chose ; c'est de la couleur, pas une décision. ⚠️ 0 libellé i18n. | ★ |
| 10 | `kind` (`ambient/feed`, 6 valeurs) | le type de micro-événement | **pas ici** : c'est le doublon brut de `descriptor_i18n_key`, qui est déjà traduit. Plomberie. | — |
| 11 | `nextCursor` (`news/feed`) | « il y a une page suivante » | **utile le jour où il y aura >20 beats** : sans lui le compteur ment en silence (voir Q2-d). | ★ |
| 12 | `beat_id` / `event_id` | l'identifiant opaque | **pas ici** en tant qu'affichage — mais c'est la **clé de tous les gestes** (D9, D11) : sans lui, aucun CTA n'est possible. | — |

---

## Lots back suggérés (B⁻ dessiné, ou libellé manquant — forme F)

| # | colonne / manque | table / route | maquette | preuve |
|---|---|---|---|---|
| **L-B1** | **nom de quartier** — aucune projection ne rend autre chose que le slug `district-N`, et le bundle n'a **aucune** clé de nom de quartier | `districts` (colonne de nom non projetée) → `news/feed`, `ambient/feed`, `random-world/active` | M14/M19/M23 : « Dépôt-Est », « La Lisière », « Les Bassins », « Orsel » | 3 producteurs du slug : `news.projection.service.ts:251`, `ambient.projection.service.ts:86`, `random-world.projection.service.ts:123` ; 3 formes de clé cherchées, 3 absentes (`Q4-district…txt`) |
| **L-B2** | **libellés des BANDES** — `recency_band` (3), `phase_band` (5), `severity_band` (3) : **11 valeurs, 0 clé i18n** | bundle i18n | M12/M20 (« ce matin »/« hier »), M22 (5 phases), M24 (« à peine »/« on en parle »/« ça pèse ») | `Q4-district-et-recency-dans-le-bundle.txt` : `onset/unfolding/receding/lingering/faint/noticeable/heavy/fading` → **0 clé chacun** ; contrôle positif `coupling` → 2 clés |
| **L-B3** | **libellés de `category`** — 5 valeurs d'enum (`national, brennar_local, business, arts, sports`), 0 clé `news_beat.category.*` | bundle i18n | M15 « fait divers » | `i18n_news_beat_keys.txt` : les 154 clés `news_beat.*` se répartissent en 9 sous-préfixes, **aucun n'est `category`** |
| **L-B4** | **`hour_of_week`** (0..167, l'heure FICTIVE de l'événement) — écrite en base, **jamais projetée** | `ambient_micro_event.hour_of_week` (`db/schema/ambient_world.ts:113`) | M12/M20 : le journal dit « ce matin », pas « il y a 4 h » — c'est l'heure de fiction que la maquette raconte | colonne présente au schéma, absente de `AmbientFeedItemView` (`ambient.projection.service.ts:37-44`, 6 champs) |

**Inventaire B⁻ complet** (colonnes du domaine qu'**aucune** projection joueur ne porte) :
`news_beat` → `game_day, thread_id, template_id, fodder_refs` (4/15) ·
`ambient_micro_event` → `game_day, hour_of_week, status, expires_at_game_minute,
attended_by_player_id, attended_at_game_day, created_at` (7/11) ·
`random_world_event_active` → `status, expires_at_game_day, parent_event_id, payload, created_at`
(5/10) · `coupling_discovery_cascade` → `id, source_event_id, created_at` (3/6) ·
`news_thread` et `news_daily_run` → **aucune projection joueur** (admin/diagnostic par conception).

---

## Actions : routes ↔ CTA

| route `@Post` joueur du domaine | garde | CTA maquette | CTA front | statut |
|---|---|---|---|---|
| `POST /v1/ambient/attend/:id` (`ambient.controller.ts:77`) | `JwtAuthGuard` + `UuidParam` | **M29** « Y PRÊTER ATTENTION » (cadre 125) | **aucun** | **DÉFAUT D9** — route sans CTA (maillon L3) |
| `POST /v1/random-world/hollow/:eventId/attend-funeral` (`random-world.controller.ts:84`) | `JwtAuthGuard` + `UuidParam` | **aucun** dans les 6 cadres | **aucun** | **question** — route joueur sans dessin ni écran ; c'est pourtant le **seul geste non économique** du domaine, et un événement `hollow_at_the_corner` est **présent sur mon compte frais** |
| — | — | **M30** « RIEN À FAIRE — C'EST ACQUIS » (cadre 127, `.cta6.eteint`) | aucun | CTA **désactivé** dessiné : c'est l'ABSENCE d'action sur un `phase_band == 'permanent'`. Correctement sans route. |

⚠️ **Aucun POST n'a été exercé**, et c'est délibéré : `ambient_micro_event.attended_by_player_id` est
un état **partagé par toute la ville** — « *the FIRST player to attend wins (city-shared state, D3/D7)* »
(`db/schema/ambient_world.ts:120-123`). Attendre un événement l'aurait retiré du flux `live` de tous
les autres comptes, dont ceux d'une campagne de capture en cours. Les corps de réponse de ces deux
routes restent donc **DÉDUITS** des interfaces (voir *Non vérifié*).

---

## Table de couverture complète

Légende : ● présent · – absent · ✖ présent mais non consommé/non affiché.
« chrome » = barre du shell, hors périmètre ㊳ (`TopBarController`), listée pour mémoire.

### R1 — `GET /v1/news/feed` (11 clés)

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 1 | `beats[]` | ● 20 | ● la liste | ● `:237` | ✔ |
| 2 | `nextCursor` | ● `null` | – | ✖ non déclaré au DTO | **« passé à côté ? » (Q11)** |
| 3 | `beat_id` | ● uuid | – | ✖ 0 site | **« passé à côté ? » (Q12)** |
| 4 | `headline_i18n_key` | ● 4 clés distinctes | ● M13 titre en clair | ● `:344` **mais rendu BRUT** | **D1** |
| 5 | `headline_params` | ● `{district,subject,outlet}` ×20 | ● (les trous du titre) | ✖ non déclaré (assumé : objet libre) | assumé consigné (L2) |
| 6 | `headline_params_fields` | ● 3 champs peuplés ×20 | ● | ✖ non déclaré | **D2** |
| 7 | `category` | ● arts/brennar_local/business | ● M15 « fait divers » | ✖ 0 site | **D-m3 + Q4** |
| 8 | `outlet_i18n_key` | ● 3 outlets | ● M11 « LE CLAIRON DE BRENNAR » | ● `:344` **rendu BRUT** | **D1** |
| 9 | `frame_tag_i18n_key` | ● (mesuré `null` ×20 ; 8 libellés fr au bundle) | ● M15 l'angle | ✖ 0 site | **D-m3 + Q7** |
| 10 | `district` | ● slug `district-N` | ● M14 nom de fiction | ● `:344` slug brut | **D5** |
| 11 | `recency_band` | ● `settling` ×20 | ● M12 mot + couleur | ● `:344` mot **anglais** | **D4** |

### R2 — `GET /v1/news/beats/:id` (14 clés) — **route jamais ouverte par un écran (L4)**

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 12-15 | `beat_id`, `headline_i18n_key`, `headline_params`, `headline_params_fields` | ● | – | ✖ DTO vide | **D11** |
| 16 | `body_i18n_key` | ● texte fr au bundle | – | ✖ | **Q1 ★★★** |
| 17 | `body_params` | ● | – | ✖ | Q (avec 16) |
| 18 | `category` | ● `business` | – | ✖ | Q4 |
| 19 | `frame_tag_i18n_key` | ● `null` | – | ✖ | Q7 |
| 20 | `district` | ● | – | ✖ | D5 |
| 21 | `outlet_i18n_key` | ● | – | ✖ | D1 |
| 22 | `byline_i18n_key` | ● `null` ici ; 6 journalistes au bundle | – | ✖ | **Q2 ★★★** |
| 23 | `sourceless_badge` | ● `false` | – | ✖ | **Q3 ★★★** |
| 24 | `wire_badge` | ● `false` | – | ✖ | **Q3 ★★★** |
| 25 | `subject_i18n_key` | ● `ambient.micro_event.building_inspection` | – | ✖ | **Q6 ★★** |

### R3 — `GET /v1/ambient/feed` (10 clés)

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 26 | `events[]` | ● 3 | ● M18-M20 (3 brèves) | ● `:238` puis **clippé** | **D3** |
| 27 | `total` | ● 3 | ● M07 compteur | ✖ 0 site | **D8** |
| 28 | `limit` | ● 20 | – | ✖ 0 site | plomberie |
| 29 | `offset` | ● 0 | – | ✖ 0 site | plomberie |
| 30 | `event_id` | ● uuid | – | ✖ 0 site | **Q12** (clé du CTA D9) |
| 31 | `district` | ● `district-16` | ● M19 | ● `:349` slug brut | **D5** |
| 32 | `kind` | ● 6 valeurs possibles | – | ✖ 0 site | **Q10** |
| 33 | `channel` | ● 3 valeurs possibles | – | ✖ 0 site | **Q9** |
| 34 | `descriptor_i18n_key` | ● **traduit au bundle** (6/6 `kind`) | ● M18 texte en clair | ● `:349` **rendu BRUT** | **D1** |
| 35 | `recency_band` | ● `fresh` | ● M20 « ce matin » + M17 pastille | ● `:349` **anglais**, sans couleur | **D4** |

### R4 — `GET /v1/random-world/active` (7 clés)

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 36 | `events[]` | ● 1 | ● M21-M25 (3 événements) | ● `:240` puis **clippé** | **D3** |
| 37 | `event_id` | ● uuid | – | ✖ 0 site | **Q12** |
| 38 | `template_i18n_key` | ● **traduit** (14 templates fr) | ● M21 titre en clair | ● `:358` **rendu BRUT** | **D1** |
| 39 | `district` | ● | ● M23 | ● `:358` slug brut | **D5** |
| 40 | `severity_band` | ● `faint` (3 bandes) | ● M24 jauge 3 crans + mot | ✖ **0 site** | **D7** |
| 41 | `phase_band` | ● `lingering` (5 bandes) | ● M22 5 mots + 3 couleurs · M25 cadre `perm` | ● `:357` (logique) + `:358` (rendu) — **3/5 résolus** | **D6** |
| 42 | `recency_band` | ● `fresh` | ● | ● `:359` anglais | **D4** |

### R5 — `GET /v1/random-world/known-couplings` (5 clés) — **route jamais appelée**

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 43 | `couplings[]` | ● **mesuré à vide** (`[]`) | ● M10 compteur « compris » + cadre 128 | ✖ 0 appel | **D10** |
| 44 | `pair_i18n_key` | ● DÉDUIT (interface `:64`) ; 2 clés fiction au bundle | ● M31/M33 | ✖ | **D10 + Q5** |
| 45 | `source_system_label` | ● DÉDUIT ; valeur = libellé DEV anglais | ● M31 en fiction | ✖ | **D10** ⚠️ ne pas afficher tel quel |
| 46 | `target_system_label` | ● DÉDUIT ; idem | ● M33 en fiction | ✖ | **D10** ⚠️ idem |
| 47 | `discovered_recency_band` | ● DÉDUIT | – | ✖ | **Q8** |

### R6 — `GET /v1/i18n/bundle?locale=fr` (2 clés)

| # | clé | B | M | F | statut |
|---|---|---|---|---|---|
| 48 | `locale` | ● `fr` | – | (interne) | plomberie |
| 49 | `messages` | ● **886** clés, dont 25 `journal.bloc.*` | ● toute la copy des 6 cadres | ● 33 appels `Lib(` → **25/26** littéraux appariés, **0 clé orpheline** | ✔ (**m1** : 1 littéral sans entrée) |

### Éléments M **non appariés** à une clé B (3)

| # | élément M | B | M | F | statut |
|---|---|---|---|---|---|
| 50 | **M16** — la « une » typographiquement distincte des brèves (bloc `.une` + `<h5>` vs `.brv`) | – **aucun rang** en base ni en projection (Q3) | ● | – | **dessiné sans source** ⇒ à ratifier ou à retirer (clôture : DÉFAUT non consigné) |
| 51 | **M14b/M19b/M23b** — le **nom de fiction** du quartier | – (slug seulement) | ● ×3 cadres | – | **dessiné sans source** ⇒ **lot back L-B1** |
| 52 | **M34** — la ligne « **? → ?** » + « la maison ne dit pas combien il en reste » | – (aucun compte de couplages non découverts) | ● | – | **dessiné sans source, ASSUMÉ** — c'est un dessin de l'inconnu, pas une donnée manquante ; à consigner tel quel |

### Rendus F **sans source** (1)

| # | rendu | B | M | F | statut |
|---|---|---|---|---|---|
| 53 | `"(sans clé)"` — repli affiché quand la clé de titre est nulle (`JournalScreenController.cs:390`) | – | – | ● | **DÉFAUT mineur (m2)** — ni dessiné, ni traduit |

### Contrôle d'arithmétique (obligatoire)

```
|clés B|                  = 49   (11 + 14 + 10 + 7 + 5 + 2 — mesures/T5-arithmetique-couverture.txt)
|éléments M non appariés| =  3   (lignes 50, 51, 52)
|rendus F sans source|    =  1   (ligne 53)
                          ────
somme                     = 53   =   nombre de lignes de la table  ✅
```

**Hors table** (déclarés, non comptés) : le **chrome du shell** (M01 argent, M02 manomètre chaleur,
M03 « Jour 12 / Matin ») — hors périmètre ㊳ ; et le **cadre 130** (M37-M40, les 4 maillons L1-L4)
qui est une fiche de dette, pas un état d'écran.

---

## Annexes

### 1. Routes du domaine (compte + ancres)

Balayage de **14 motifs** du domaine sur **tous** les `*.controller.ts` du back, **lignes actives
seulement** (`mesures/A1-routes-du-domaine.txt`) : **10 contrôleurs touchés, dont 3 hors
`-test.`/`-admin.`**. Contrôle négatif `zzzz_inexistant` → 0.
⚠️ Un premier balayage sur `news|ambient|random-world|press` rendait **74 routes** : le motif `press`
matche `compression` et `pressure`. Motif resserré, comptage refait.

**7 routes JOUEUR du domaine** (toutes sous `@UseGuards(JwtAuthGuard)`), **+1 route publique** :

| verbe | chemin | ancre | consommée par ㊳ ? |
|---|---|---|---|
| GET | `news/feed` | `operational/news_beat/news.controller.ts:39` | **oui** |
| GET | `news/beats/:id` | `news.controller.ts:54` | non (D11) |
| GET | `ambient/feed` | `operational/ambient/ambient.controller.ts:53` | **oui** |
| POST | `ambient/attend/:id` | `ambient.controller.ts:77` | non (D9) |
| GET | `random-world/active` | `operational/random_world/random-world.controller.ts:46` | **oui** |
| GET | `random-world/known-couplings` | `random-world.controller.ts:59` | non (D10) |
| POST | `random-world/hollow/:eventId/attend-funeral` | `random-world.controller.ts:84` | non |
| GET | `i18n/bundle` (public, **sans garde**) | `i18n/i18n.controller.ts:32` | **oui** (`Charger():169-170`) |

Les deux listes (back / client) **se recouvrent exactement** : les 7 routes joueur sont les 7
méthodes de `JournalClient`; **3 sont appelées, 4 ne le sont pas**.
Le dossier proposait ce périmètre — **vérifié, pas recopié**. Aucun autre contrôleur (ni `me/`, ni
`session/`) ne porte de donnée du domaine.

### 2. Corps réels — `mesures/` + commandes

`compte-frais.txt` (callsign) · `signup.json` (201) · `session_open.json` (200, 12 clés) ·
`FRAIS_GET_news_feed.json` · `FRAIS_GET_news_feed_limit100.json` · `FRAIS_GET_ambient_feed.json` ·
`FRAIS_GET_ambient_feed_limit100.json` · `FRAIS_GET_random-world_active.json` ·
`FRAIS_GET_random-world_known-couplings.json` · `FRAIS_GET_news_beats_id.json` ·
`i18n_bundle_fr.json`. Synthèses : `B-ensembles-de-cles.txt`, `T5-arithmetique-couverture.txt`.
Contrôle que la sortie n'a pas traversé une couche d'affichage : **chaque fichier parse en JSON**
(un corps décoré échouerait) ; tous les comptes viennent d'un oracle `python3`, jamais du terminal.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine | contrainte lue à la source |
|---|---|---|
| `category` | `national, brennar_local, business, arts, sports` | `pgEnum('news_beat_category', …)` `db/schema/news_beat.ts:91-97` |
| `recency_band` (news) | `fresh, settling, fading` | `news.projection.service.ts:35` ; seuils `:279-284` (heures **réelles**) |
| `recency_band` (ambient) | idem | `ambient.projection.service.ts:34` ; seuils `:83` (fraction de fenêtre) |
| `recency_band` (rw) | idem | `random-world.projection.service.ts:48` ; seuils `:143-147` (jours de **jeu**) |
| `phase_band` | `onset, unfolding, receding, lingering, permanent` | `random-world.projection.service.ts:47` ; seuils `:136-141` |
| `severity_band` | `faint, noticeable, heavy` | `random-world.projection.service.ts:46` ; seuils `:130-134` |
| `kind` | `corner_fight, stalled_tram, delayed_shipment, noisy_block, building_inspection, bar_rumor` | `pgEnum('ambient_micro_event_kind', …)` `db/schema/ambient_world.ts:48-56` |
| `channel` | `constant_hum, trade_channel, bar_talk` | `pgEnum('ambient_channel', …)` `ambient_world.ts:58` |
| `frame_tag_i18n_key` | `news_beat.frame_tag.<8 valeurs>` ou `null` | `news.projection.service.ts:45-62` ; **8 clés fr au bundle** |
| `outlet_i18n_key` | 3 outlets | `press-registry.ts` → **3 clés `press.outlet.*` au bundle** |
| `byline_i18n_key` | 6 journalistes ou `null` | **6 clés `press.journalist.*` au bundle** |
| `template_i18n_key` | `random_world.template.<14>` | **14 clés au bundle** |
| `descriptor_i18n_key` | `ambient.micro_event.<6>` | **6 clés au bundle**, 1:1 avec l'enum `kind` |
| `pair_i18n_key` | 2 paires | `tight-coupling-pairs.ts:23` (`TightCouplingPairKey`) ; 2 clés fr au bundle |
| `district` | `district-${id}` | **fabriqué** en projection (3 producteurs) ; aucune contrainte de domaine, aucun libellé |

### 4. Inventaire M (Mxx → représente)

Source : `mesures/M-maquette-cadres-125-130.txt` (extrait de
`/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html`, lignes **6118-6139**, bloc
« LE JOURNAL & LA RUE (NEUF) », **6 cadres**).

| id | cadre | élément | représente |
|---|---|---|---|
| M01-M03 | tous | `barre` : Argent `$ 24 850` · manomètre « tiède / Heat » · « Jour 12 / Matin » | **chrome du shell**, hors ㊳ |
| M04 | tous | enseigne `<b>Le journal</b>` | titre de l'écran |
| M05 | tous | enseigne `<i>…</i>` — **6 valeurs différentes** | **le MODE du cadre** (F n'en a que 4) |
| M06-M08 | 125/129/130 | « 01 à la une » · « 04 dans la rue » · « 03 en cours » | cardinal des 3 listes |
| M09 | 126/127 | « 01 définitif » | nb d'événements `phase_band == permanent` |
| M10 | 126/127/128 | « 02 compris » / « 02 couplages compris » | nb de couplages découverts |
| M11-M16 | 125 | bloc `.une` : outlet · fraîcheur en mots colorée · **titre `<h5>`** · clé · quartier · angle · **hiérarchie typographique** | la « une » |
| M17-M20 | 125 | `.brv` ×3 : pastille colorée · texte · clé · quartier · « ce matin »/« hier » | les brèves de rue |
| M21-M25 | 126 | `.evt` ×3 : titre · phase colorée · clé · quartier · **jauge 3 crans + mot** · cadre `.perm` | les événements de ville |
| M26-M28 | 126-129 | `.pann` : surtitre · titre · texte | le panneau explicatif |
| M29 | 125 | `.cta6` « Y PRÊTER ATTENTION » + note | le geste « assister » |
| M30 | 127 | `.cta6.eteint` « RIEN À FAIRE — C'EST ACQUIS » | l'absence de geste sur un permanent |
| M31-M35 | 128 | `.cpl` ×2 (source → cible) · `.cpl.vide6` « ? → ? » · note « la maison ne dit pas combien il en reste » | les couplages compris |
| M36 | 129 | `.rien` « Rien ce matin. / La ville a passé une nuit tranquille. » | l'état vide |
| M37-M40 | 130 | 4 `.pann` : **L1** écrire les titres · **L2** gabarits à trous · **L3** aller à un enterrement · **L4** le détail d'un article | fiche de dette (≠ état d'écran) |

### 5. Inventaire F (champ → sites → classe)

`mesures/F-inventaire-usages-dto.txt` (lignes ACTIVES seulement, commentaires exclus ; contrôle
positif `.beats` ≥1, contrôle négatif `.champ_qui_nexiste_pas` = 0).
Les deux archives `front-31d8e43/` et `front-fd0e21e/` ont les **3 fichiers Journal
BYTE-IDENTIQUES** (`diff` → identiques) : F est **le même** pour les deux planches.

| champ | sites actifs | classe |
|---|---|---|
| `beats`, `events` (×2) | 1 / 4 | **LOGIQUE** (déballage) |
| `headline_i18n_key`, `outlet_i18n_key`, `descriptor_i18n_key`, `template_i18n_key` | 1 chacun (`:344`,`:344`,`:349`,`:358`) | **RENDU** — en clé brute |
| `district` | 3 (`:344`,`:349`,`:358`) | **RENDU** — slug brut |
| `recency_band` | 3 (`:344`,`:349`,`:359`) | **RENDU** — bande anglaise brute |
| `phase_band` | 2 (`:357` garde `== "permanent"`, `:358` via `PhaseEnMots`) | **LOGIQUE + RENDU**, 3/5 résolus |
| `beat_id`, `category`, `frame_tag_i18n_key`, `total`, `limit`, `offset`, `event_id` (×2), `kind`, `channel`, `severity_band`, `couplings` | **0** | **IGNORÉ** (12 champs) |

**Affiché sans venir d'un champ** : 33 appels `Lib(` → 26 littéraux distincts (25 appariés au bundle
par VALEUR, 1 non) ; `"00"` (format 2 chiffres, `:311` — dessiné aussi par M) ; `" · "` (séparateur,
dessiné aussi) ; `"(sans clé)"` (`:390` — **sans aucune source**).

**Méthodes client jamais appelées (4/7)** : `GetNewsBeats`, `PostAmbientAttend`,
`GetRandomWorldKnownCouplings`, `PostRandomWorldHollowAttendFuneral`.

### 6. Non vérifié

1. **Le SHA du back dans l'image** n'est imprimé par aucune route ⇒ **DÉDUIT**. Je n'ai comparé
   aucune valeur d'aujourd'hui à une valeur du 04/09 ; les corps de `corps-reels-04-09/` n'ont servi
   qu'à constater que **les 4 POST n'y ont jamais été mesurés** (`"non_appelee"` sur les 4).
2. **Les corps de réponse des 2 routes `@Post`** : DÉDUITS des interfaces —
   `AmbientAttendView = {event_id, district, status:'attended', residue_band}`
   (`ambient.projection.service.ts:52-57`, `residue_band ∈ {full, reduced, minimal, none}` `:48`) et
   `{event_id, status:'attended'}` (`random-world.controller.ts:90`). **Non mesurés à dessein** :
   `attended_by_player_id` est un état **partagé par toute la ville** (`ambient_world.ts:120-123`),
   et attendre un événement l'aurait retiré du flux des autres comptes.
   ⇒ *La mesure qui trancherait* : un `POST /v1/ambient/attend/<id>` sur un compte jetable, **une
   fois qu'aucune campagne de capture ne tourne**, et un `POST …/attend-funeral` sur le
   `hollow_at_the_corner` que mon compte frais porte déjà.
3. **La forme d'un couplage** (`KnownCouplingView`) : `couplings` **mesuré à vide** (`[]`) sur compte
   frais ⇒ ses 4 champs sont DÉDUITS de l'interface `random-world.projection.service.ts:63-68`.
   ⇒ *La mesure qui trancherait* : un compte ayant subi un `sideways_failure` (le seul écrivain de
   `coupling_discovery_cascade`), ou un tick de génération — hors de mon mandat (aucun tick).
4. **`frame_tag_i18n_key` mesuré `null` sur 20/20 beats** : le champ existe, sa valeur non. Les
   8 libellés français sont au bundle ; je n'ai pas pu observer un beat qui en porte un.
   ⇒ *La mesure qui trancherait* : un beat `cooper_affair` ou `three_outlet_storm` (les 2 seuls
   templates à frame, `db/schema/news_beat.ts:175-177`).
5. **Les valeurs `onset`, `unfolding`, `receding`, `permanent` de `phase_band`** : seule `lingering`
   observée. La **couverture 3/5 est établie par les unions**, pas par un corps portant `onset`.
   L'affirmation « `onset` s'afficherait brut » est donc une lecture de code exhaustive, pas une
   capture. ⇒ *La mesure qui trancherait* : un événement à `recovery_curve_position >= 0.9`.
6. **`I18nCatalog` / `Libelle.De`** ne sont PAS dans les archives du dossier (seuls `Journal/` et
   `Shell/` y sont) : la **règle de slug** `journal.bloc.<slug>` n'a pas pu être lue. J'ai donc
   apparié les 26 littéraux au bundle **par VALEUR**, pas par clé — plus robuste, et suffisant pour
   le compte 25/26. Le **comportement de repli** de `Libelle.De` sur clé absente est déduit du
   commentaire `JournalScreenController.cs:159-162`, non lu à la source.
7. **Le rendu à l'écran** : je n'ai fait tourner ni Unity, ni capture, ni compilation (contrainte du
   dossier). Tout « F » de ce rapport est lu dans la **source archivée** et corroboré par les deux
   planches fournies. La proposition « 5 lignes visibles sur 35 » est lue **sur les images** et
   expliquée par le code ; je n'ai pas mesuré la hauteur du masque.
8. **Les comptes des planches (20/13/02 et 15/16/04)** portent sur `demo_capture`, un compte auquel
   je n'ai pas le droit de toucher. La divergence avec « 36 » (déclaration f2) n'est donc **pas
   arbitrable depuis ma position** — je la consigne, je ne la tranche pas.
