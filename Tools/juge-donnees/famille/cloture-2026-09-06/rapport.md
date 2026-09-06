# Juge données ⊥ — ⑥ La Famille (l'organigramme) — clôture — 2026-09-06

Convention des colonnes : **●** = présent / rendu · **◐** = consommé sans être montré (LOGIQUE) ·
**–** = absent / ignoré · **B⁻** = en base, aucune projection joueur.

## En une phrase

Sur les **28 clés** que le back sert aux 3 routes de cet écran, il en **rend 15**, en consomme **1**
sans la montrer, et **12 sont reçues et jetées** (15 + 1 + 12 = 28). **12 défauts** (14 lignes avec
les deux sous-défauts D-1b et D-3b), dont un qui se voit sur la planche : le back sert **trois noms
distincts** (`Lt. Oster` / `Lt. Brasse` / `Lt. Sallo`) et l'écran affiche **trois fois le même mot**
(« Cuisinier » — masques d'encre identiques, mesurés). Plus **11 questions « passé à côté ? »** et
**3 lots back** suggérés.

---

## Défauts

| # | information | B | M | F | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|---|
| **D-1** | **le NOM du lieutenant** | ● | – | – | **DÉFAUT** — le nom de fiction ratifié n'atteint pas l'écran | Servi : `corps-reels/GET_lieutenants.json` → `name` = `Lt. Oster` / `Lt. Brasse` / `Lt. Sallo`. Projeté : `lieutenant.projection.service.ts:207-224` (`RosterRow`, `name` à `:212`), épinglé par `tests/e2e/operational/lieutenant_roster_list.spec.ts:376-378` (6 clés `toEqual`). Front : `LieutenantDtos.cs:113-120` — `RosterRow` déclare **5** champs, `name` **absent** ⇒ `JsonUtility` le jette au parse ; `grep -rn '\.name\b' Assets/Scripts/Operational/Lieutenant/*.cs` → **2 hits, tous deux `gameObject.name`**. Le rang affiche `FamilleLabels.Archetype(row.archetype)` (`LieutenantScreenController.cs:2352`). **Mesure sur la planche** : les trois bandes de nom (x 290→700, y 761/1140/1519, hauteur 80) ont la **même bbox d'encre `x=13..204`**, ~1900 px d'encre, hamming 83 et 156 sur 32 800 (anti-crénelage) ⇒ **le même mot trois fois**. |
| **D-1b** | le commentaire qui justifie D-1 est **périmé** | — | — | — | **DÉFAUT** (énoncé daté) | `LieutenantScreenController.cs:2321-2323` : « *le nom (le libellé FR de l'archétype — la mesure Phase 1 a établi que le back ne projette AUCUN nom personnel)* » et `:2360-2363` : « *un champ que `RosterRow` NE PORTE PAS (`LieutenantDtos.cs:113-120` : lieutenant_id, archetype, op_state_band, rule_count_band, tenure_bucket)* ». La première clause est **réfutée** par le corps mesuré ; la seconde décrit le DTO **du client**, pas le contrat du back, et se lit comme une mesure du back. |
| **D-2** | `archetype` sur la carte de DÉTAIL | ● | – | ● **partiel** | **DÉFAUT** — 6 archétypes sur 9 | `ArchetypeLabel` (`LieutenantScreenController.cs:990-1003`) : `case` pour COOK, SECURITY, LOGISTICS, BOOKKEEPER, LAUNDERING, DISTRIBUTION, UNKNOWN — `default: return a` ⇒ **jeton brut**. Domaine réel : `lieutenant-archetype.ts:38-51` = **9** archétypes (+ `UNKNOWN`), et le front le SAIT : `FamilleLabels.cs:29-33` énumère les 9 et `FamilleLabels.Archetype` les traduit tous les 9 (`:43-52`). `MAPPER_KNOWN_ARCHETYPES` (`recruitment-quest-outcome-mapper.ts:171-181`) = les 9. ⇒ MUSCLE / INTELLIGENCE / FACILITY_MANAGER : « Gros bras » dans l'organigramme, **`MUSCLE`** en majuscules sur la carte ouverte deux centimètres plus bas. |
| **D-3** | `op_state_band` — **deux résolveurs concurrents sur le même écran, libellés divergents** | ● | ● | ● | **DÉFAUT** | Organigramme : `FamilleLabels.Etat` (`FamilleLabels.cs:89-99`) — `IDLE`→**« Repos »**, `SETTLING`→**« Stabilisation »**. Détail : `OpStateLabel` (`LieutenantScreenController.cs:1040-1047`) — `IDLE`→**« Au repos »**, `SETTLING`→**« Prend ses marques »**. Même valeur de domaine, deux mots. ⇒ *La correspondance domaine→libellé de cet écran est portée par DEUX fonctions ; aucune garde ne peut les tenir accordées.* |
| **D-3b** | l'organigramme **ne passe pas par le catalogue servi** | — | — | — | **DÉFAUT** | `grep -c 'Libelle\.De' FamilleLabels.cs` → **0** ; `… LieutenantScreenController.cs` → **51**. Les trois seules chaînes de DONNÉE visibles sur l'écran livré (« Cuisinier », « RÉCENT », « Repos ») sont des littéraux C# hors catalogue, alors que **101 clés `famille.*` distinctes** que l'écran demande sont **toutes servies** (mesure : 0 absente, 0 repli — annexe 3). Un changement de formulation servi par le back ne les atteindra pas, et le compteur anti-repli `Libelle.NbAppels` ne les voit pas. |
| **D-4** | CTA « Recruter un nouveau lieutenant » → `POST /v1/lieutenants` | route ● | ● (M15) | ● mais **inaboutissable** | **DÉFAUT d'action** | `assignedBuildingId` n'a **aucune source joueur** : `LieutenantScreenController.cs:56` `[SerializeField] private string assignedBuildingId = "";`, un seul autre site (`:169`, propriété publique = crochet de test). `AppShell.cs:244` monte le locataire **par code** (`MountTenant<LieutenantScreenController>()`) ⇒ 0 scène/prefab ne renseigne le champ (`grep -rln LieutenantScreenController Assets --include=*.unity --include=*.prefab` → vide). La ligne « Bâtiment affecté » est un **libellé**, pas un sélecteur (`:1390`). `RecruitChosen` (`:382-395`) ne garde rien et POSTe `""` ⇒ `uuidField(...)` (`lieutenant.controller.ts:199`) → **422 VALIDATION_FAILED**. ⚠ `GET /v1/me/buildings` **existe** (`player-buildings.controller.ts:89-90`, `JwtAuthGuard`) et n'est appelé nulle part par cet écran. |
| **D-5** | CTA « Réaffecter… » → `POST /v1/lieutenants/:id/reassign` | route ● | – | ● mais **inaboutissable** | **DÉFAUT d'action** | Même mécanisme : `reassignBuildingId` n'existe qu'en champ privé + propriété publique (`:259`, `:262`) ; aucun sélecteur (`:2618` « Nouveau bâtiment » est un `NewSectionLabel`). `ReassignChosen:579` s'arrête sur un message honnête — « Choisissez un bâtiment de destination. » — **que rien ne permet de satisfaire**. |
| **D-6** | `reassign_availability` (détail) | ● | – | – | **DÉFAUT** — le champ qui décide si D-5 pourrait aboutir | Servi : `corps-reels/GET_lieutenants_id.json` → `"reassign_availability": "AVAILABLE"` ; domaine `AVAILABLE \| ON_COOLDOWN` (`lieutenant.projection.service.ts:124`). Front : `grep -rn reassign_availability Assets/Scripts --include=*.cs` → **0**. Le bloc de confirmation (`:2667-2689`) montre le coût du transfert mais **jamais s'il est possible** ; un `ON_COOLDOWN` part en 409 après confirmation. |
| **D-7** | `rule_count_band` sur le ROSTER | ● | – | – | **DÉFAUT** (reçu et jeté) | Déclaré `LieutenantDtos.cs:118`, servi dans chaque ligne du roster. `grep -n '\.rule_count_band' LieutenantScreenController.cs` → **1 seul site, `:859`**, qui lit `b.rule_count_band` (le DÉTAIL), pas `row.`. ⇒ le champ du roster n'a **aucun lecteur**. |
| **D-8** | `BuildRosterRow` — **code mort** | — | — | — | **DÉFAUT** | `LieutenantScreenController.cs:2549-2592` (44 lignes) lit `row.archetype`, `row.op_state_band`, `row.lieutenant_id` et construit une ligne complète avec un bouton « Ouvrir ». `grep -rn 'BuildRosterRow' Assets/Scripts --include=*.cs` → **1 hit : sa propre déclaration**, 0 site d'appel. ⇒ 3 des 11 « usages de champ » que compte un balayage naïf sont inertes ; toute mesure de couverture qui les compte est fausse. |
| **D-9** | la route de détail est appelée **deux fois** par ouverture | — | — | — | DÉFAUT (efficience + parseur double) | `RefreshBands:444` → `client.GetBands` = `GET /v1/lieutenants/{id}` ; puis `RefreshAutonomy:2834` → `autonomyClient.GetBudgetBands` = **la même URL** (`AutonomyClient.cs:115`), re-téléchargée pour en extraire `budget_bands` **par regex** (`AutonomyClient.cs:137-146`) parce que `JsonUtility` ne sait pas lire une map. Un corps, deux requêtes, deux parseurs. |
| **D-10** | `progress_to_next` | ● | – | – | **DÉFAUT** (désérialisé, stocké, jamais rendu) | `LieutenantScreenController.cs:483` `if (band != null) ProgressToNext = band;` ; `grep -rn ProgressToNext Assets/Scripts --include=*.cs` → **2 hits : la déclaration `:157` et cette affectation**. Aucun site de rendu. |
| **D-11** | libellés **anglais hors catalogue** dans un écran à 102 clés servies | — | – | ● | DÉFAUT (mineur, mais isolé) | `RenderReassignConfirm` (`:2676`, `:2680`, `:2682`, `:2684`, `:2685`) : `"Confirm reassignment? It resets tenure and starts a settling window."`, `$"Projected settling: …"`, `$"Tenure forfeited: …"`, `$"Yield bonus lost: …"`, `"Loading lieutenant… reopen Reassign once the card has loaded."` — 5 littéraux sans `Lib(...)`. Idem `RecruitButtonText` (`:1438`) : `"Recruit " + ArchetypeLabel(archetype)`. |
| **D-12** | `.rang.actif` — le rang sélectionné | – | ● (M12) | – | ÉCART | La maquette distingue un rang « actif » (`family-organigramme-reference-source.html:78` : `border-color:#d9ab4e55; background:#101a2ae0`). `BuildFamilyLieutenantRow:2327-2328` pose `bord.a = 0f` pour **tous** les rangs, sans variante. **Mesuré sur la planche** : les 3 plaques (y 731‑919, 1110‑1298, 1489‑1677) démarrent toutes à `(20,27,41)` et finissent à `(14,18,27)` — signature identique, aucun rang n'a d'état sélectionné. |

### Écarts ASSUMÉS re-mesurés sur les corps — **1 périmé sur 9**

| écart (dossier) | verdict de cette passe | preuve |
|---|---|---|
| nom du lieutenant | **PÉRIMÉ ⇒ devenu D-1** | le nom EST projeté (roster + détail) et non affiché |
| « Loyauté 82 % » | **TIENT, avec une précision** | `loyalty_seed_bucket` existe en base (`db/schema/lieutenant.ts:164`) et n'est projeté **que** sur la réponse de `POST /v1/recruitment/quests/:id/hire` (`recruitment.controller.ts:164`) — **jamais relisible** ; ni le roster ni le détail ne le portent ⇒ lot back **LB-3** |
| rattachement → hommes / noms / résumé d'équipe | **TIENT** | `grep "lieutenant_id: uuid('lieutenant_id')" db/schema/*.ts` → 4 hits, **aucun** sur une entité « homme ». `courier` (`operational_chain.ts:249-262`) n'a **ni `name` ni `lieutenant_id`**. Aucune table `dealer`. |
| chip « Retiré » / rang grisé | **TIENT** | `grep -rn extinction_state --include=*.ts` hors `schema/`, migrations et tests → **2 hits, tous deux des LECTURES** (`constraint-evaluators.ts:91`, `lieutenant.repository.ts:305-307`). 0 écrivain de production ⇒ la colonne reste à `'STABLE'`. `.chip.ret` n'est d'ailleurs pas instancié dans le markup ratifié. |
| chip « Délégué / Direct » | **TIENT, et le correctif est une clé** | `mode` est **absent** du roster (6 clés mesurées) et **présent** sur le détail (`"mode": "delegated"`). L'afficher dans l'organigramme demanderait N requêtes ⇒ lot back **LB-2** |
| district du Don | **TIENT** (non re-mesuré en profondeur — voir « non vérifié ») | |
| lieu de l'homme | **TIENT** (pas d'entité « homme », a fortiori pas de lieu) | |
| bandeau « un siège libre à la table » | **TIENT** | aucun plafond de roster projeté sur les 28 clés mesurées |
| archétypes en français | **TIENT, mais le résolveur du DÉTAIL n'en couvre que 6** ⇒ D-2 | |

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| Q1 | `reports[]` (`GET /v1/autonomy-reports`) — **1 rapport, 2 arbitrages en attente sur le lieutenant du 1ᵉʳ rang** | « ce lieutenant attend que tu tranches deux fois » | **utile ici** : c'est le seul signal qui distingue trois lieutenants identiques ; un badge sur le rang, et l'organigramme devient une file d'attente. La route est **déjà consommée** par ⑬ et ① (`AutonomyInboxController.cs:170`, `DashboardController.cs:269`) — pas de lot back | ★★★ |
| Q2 | `lieutenant: {id, name}` + `queue_pressure_band` (`GET /v1/exceptions/queue`) | « N exceptions pendantes sous lui, et la pression est haute/basse » | **utile ici** : même geste que Q1, sur l'autre file. `exceptions.projection.service.ts:134` porte déjà le couple id+nom, et `:174` la bande de pression **par lieutenant** | ★★★ |
| Q3 | `standing_order` (détail) — `{freshness, promotion_suggested}` | « son ordre permanent expire bientôt » / « il mérite d'être promu en défaut » | **utile ici** : `EXPIRES_SOON` est une raison d'ouvrir la carte ; `promotion_suggested` est une proposition du jeu au joueur, jamais montrée | ★★★ |
| Q4 | `drift_phase` (détail) — `DIRECT_ALIGNED \| DRIFTING \| INCIDENTAL_LOCKED \| RESETTING` | « il commence à interpréter tes ordres à sa façon » | **utile ici** : c'est la fiction centrale de la délégation ; sur un organigramme, c'est ce qu'on vient lire | ★★★ |
| Q5 | `rule_count_band` sur le ROSTER — `NONE \| FEW \| MANY` | « celui-ci a des consignes, celui-là aucune » | **utile ici, et gratuit** : la clé est déjà servie, déjà déclarée dans le DTO (`LieutenantDtos.cs:118`), jamais lue (D-7). Un lieutenant à `NONE` est un lieutenant qu'on n'a pas encore configuré | ★★★ |
| Q6 | `reassign_availability` (détail) | « tu ne peux pas le déplacer maintenant » | **utile ici** : sinon la confirmation promet une action qui part en 409 (D-6) | ★★ |
| Q7 | `trust_budget_bucket` + `flag_frequency_band` (détail) | « on lui fait confiance / il se fait épingler souvent » | **utile ailleurs** : déjà rendus sur ⑯ (`Shell/DailyReviewScreenController.cs`). Sur ⑥ ce serait une redite, sauf en pastille de rang | ★★ |
| Q8 | `cue_bands` (détail) — map `<cue> → dormant\|partial\|reliable\|dominant` | « sur quel signal il se fie vraiment » | **utile mais dense** : 7 clés ; relève d'une carte de détail, pas d'un rang | ★★ |
| Q9 | `lieutenant_id` (`GET /v1/meta/horizon/execution-plans`) | « il exécute un plan d'horizon » | **plutôt ailleurs** : c'est le sujet de l'écran Horizon | ★ |
| Q10 | `backlog_age_cycles` (autonomy-reports) | « ça traîne depuis 2 cycles » | **chrome** : n'a de sens qu'accolé à Q1 | ★ |
| Q11 | `recruit_poll: {consistency_bucket, house_norm_flag_count, gate_ran}` (réponse de `POST /v1/lieutenants`, `lieutenant.controller.ts:184`) | retour d'embauche | **pas ici** — et ⚠ `house_norm_flag_count` est un **entier brut** dans une réponse joueur (à confronter à R2.2) | ★ |

*(`name` sur le roster n'est PAS listé ici : ce n'est pas une question, c'est D-1.)*

---

## Lots back suggérés

| # | colonne / clé | table / route | maquette | preuve |
|---|---|---|---|---|
| **LB-1** | `player.callsign` (varchar 24, unique) | `player` — **B⁻ : aucune projection joueur** | **M05 « Don V. »** | `db/schema/player.ts:34` + `:60` (unique). `grep -rl callsign --include=*.controller.ts --include=*.projection*.ts` → 8 fichiers, **7 sont `_test`**, le 8ᵉ est `auth.controller.ts` où c'est un champ d'ENTRÉE (`:264`, `:298`) ; `signup` rend `Promise<{ locale: string }>` (`:396`). ⇒ le Don n'a **aucun nom** à afficher ; le front écrit « VOUS » (`LieutenantScreenController.cs:2308`), ce qui est la bonne conduite en l'état. **Forme F.** ⚠ arbitrage user : `callsign` est un identifiant de connexion, pas forcément un nom de fiction. |
| **LB-2** | `mode` (`tasked \| delegated`) **sur la ligne de roster** | `lieutenant.mode` — projeté sur `GET /v1/lieutenants/:id`, absent de `GET /v1/lieutenants` | **M09 puce « DÉLÉGUÉ » / « DIRECT »** | 6 clés mesurées sur la ligne de roster ; `lieutenant.projection.service.ts:207-238` ne porte pas `mode`. La puce est le **seul** élément de la maquette que le front a dû remplacer (par l'ancienneté). Une 7ᵉ clé sur le roster ferme l'écart — et le détecteur existe déjà (`lieutenant_roster_list.spec.ts:376`, `toEqual` exact). |
| **LB-3** | `loyalty_seed_bucket` **relisible** | `lieutenant.loyalty_seed_bucket` — servi **une seule fois**, dans la réponse de `hire` | (E2 « Loyauté 82 % ») | `db/schema/lieutenant.ts:156-164` (« *R2.2-clean by construction — the composite IS the player-facing surface* ») ; `recruitment.controller.ts:164` le rend au moment de l'embauche. Ni le roster ni le détail ne le reprojettent ⇒ un joueur qui ferme l'écran perd la valeur pour toujours. |
| *(hors lot back)* | `assigned_building_id` → sélecteur de bâtiment | — | — | **lot FRONT** : `GET /v1/me/buildings` existe déjà (`player-buildings.controller.ts:89`). Ferme D-4 et D-5. |
| *(hors périmètre d'un écran)* | modèle « hommes » | 0 table, 0 colonne | M13 / M14 | un lot de domaine entier, pas une clé |

---

## Actions : routes ↔ CTA

**Routes `@Post` joueur du domaine** (`operational/lieutenant/**`) : **10** dans `lieutenant.controller.ts`
(dont 8 POST) + **2** dans `autonomy/autonomy-reports.controller.ts` — les **12 sous `JwtAuthGuard`**
(comptes en `$( )` : routes = 10 / guards = 10 / autonomy = 2).

| # | route | CTA / geste | verdict |
|---|---|---|---|
| A1 | `POST /v1/lieutenants` | « Recruter un nouveau lieutenant » (M15) → déplie le panneau → bouton « Recruit *x* » | **DÉFAUT D-4** — aucune source pour `assigned_building_id` |
| A2 | `POST /v1/lieutenants/:id/reassign` | « Réaffecter… » + confirmation | **DÉFAUT D-5** — aucune source pour le bâtiment de destination |
| A3 | `POST /v1/lieutenants/:id/behavior-script` | « Attacher » (`:732`) | ✔ câblé — hors maquette |
| A4 | `POST /v1/lieutenants/:id/behavior-script/validate` | « Valider » (`:706`) | ✔ câblé — hors maquette |
| A5 | `POST /v1/lieutenants/:id/autonomy/decision` | 3 boutons de plafond (`:2850`) | ✔ câblé — hors maquette |
| A6 | `POST /v1/lieutenants/:id/signal-drift/decision` | — | **route sans CTA** : `grep -rl 'signal-drift' Assets/Scripts --include=*.cs` → **vide** (0 fichier dans tout le client) |
| A7 | `POST /v1/lieutenants/:id/standing-order` | — | **route sans CTA** : idem, `grep -rl 'standing-order'` → **vide** |
| A8 | `POST /v1/lieutenants/:id/standing-order/decision` | — | **route sans CTA** : idem |
| A9 | `GET /v1/autonomy-reports` | — | consommée par ⑬ et ①, **pas par ⑥** (`AutonomyInboxController.cs:170`, `DashboardController.cs:269`) → voir Q1 |
| A10 | `POST /v1/autonomy-reports/:r/issues/:i/resolve` | — | consommée par ⑬ (`AutonomyInboxController.cs:196`) |
| C1 | — | « Voir l'équipe » (M14) | **CTA sans route** — et sans modèle (écart assumé re-vérifié) ; le front rend l'encart vide sur **tous** les rangs |
| C2 | — | tap sur un rang | ✔ `BuildFamilyLieutenantRow:2431-2434` → `OpenLieutenant(id)` → `MajVisibiliteDetail` + `RefreshBands` (`:531-540`) |
| C3 | — | « ‹ » retour (M01) | chrome de navigation du shell — hors domaine |

---

## Table de couverture complète

### Bloc 1 — `GET /v1/lieutenants` (le roster : c'est l'organigramme) — 6 clés

| # | information | B | M | F | statut |
|---|---|---|---|---|---|
| 1 | `lieutenant_id` | ● | – | ◐ (fermeture du `Button`, `:2431`) | ✔ plomberie |
| 2 | `name` | ● | – | – | **DÉFAUT D-1** |
| 3 | `archetype` | ● | ● M08 | ● (`:2352`, slot `.nom`) | ✔ |
| 4 | `op_state_band` | ● | ● M10 | ● (`:2414`) | ✔ (⚠ D-3) |
| 5 | `rule_count_band` | ● | – | – | **DÉFAUT D-7** / Q5 |
| 6 | `tenure_bucket` | ● | – | ● (`:2369`, la puce) | affichée sans être dessinée → **à ratifier** |

### Bloc 2 — `GET /v1/lieutenants/{id}` (la carte ouverte) — 18 clés · **aucune maquette pour ces 5 sections**

| # | information | B | M | F | statut |
|---|---|---|---|---|---|
| 7 | `name` | ● | – | – | **« PASSÉ À CÔTÉ ? »** (la carte ouverte ne nomme pas non plus) |
| 8 | `archetype` | ● | – | ● partiel | à ratifier — **D-2** (6/9) |
| 9 | `granted_role` | ● | – | ● (`:853`) | à ratifier |
| 10 | `mode` | ● | – | ● (`:855`) | à ratifier |
| 11 | `op_state_band` | ● | – | ● (`:857`) | à ratifier — **D-3** |
| 12 | `rule_count_band` | ● | – | ● (`:859`) | à ratifier |
| 13 | `tenure_bucket` | ● | – | ● (`:864`, `:2684`) | à ratifier |
| 14 | `script_revision_cost` | ● | – | ● (`:867`) | à ratifier |
| 15 | `reassignment_disruption` | ● | – | ● (`:869`, `:2682`) | à ratifier |
| 16 | `role_efficiency_bonus` | ● | – | ● (`:871`, `:2685`) | à ratifier |
| 17 | `script_source` | ● | – | ● (`:873`) | à ratifier |
| 18 | `reassign_availability` | ● | – | – | **DÉFAUT D-6** / Q6 |
| 19 | `budget_bands` | ● | – | ● (via 2ᵉ GET + regex, D-9) | à ratifier |
| 20 | `cue_bands` | ● | – | – | « PASSÉ À CÔTÉ ? » Q8 |
| 21 | `drift_phase` | ● | – | – | « PASSÉ À CÔTÉ ? » Q4 |
| 22 | `standing_order` (`freshness`, `promotion_suggested`) | ● | – | – | « PASSÉ À CÔTÉ ? » Q3 |
| 23 | `trust_budget_bucket` | ● | – | – | « PASSÉ À CÔTÉ ? » Q7 |
| 24 | `flag_frequency_band` | ● | – | – | « PASSÉ À CÔTÉ ? » Q7 |

### Bloc 3 — `GET /v1/progression` — 4 clés

| # | information | B | M | F | statut |
|---|---|---|---|---|---|
| 25 | `vocabulary_tier` | ● | – | ● (`:2948-2966`) + ◐ (palette de règles) | à ratifier |
| 26 | `progress_to_next` | ● | – | – | **DÉFAUT D-10** |
| 27 | `next_tier` | ● | – | – | « passé à côté ? » — lu par ⑫ Horizon (`HorizonScreenController.cs:243`), pas ici |
| 28 | `tier_label_i18n` | ● | – | – | idem (`HorizonScreenController.cs:251-262`) |

### Bloc 4 — B⁻ dessiné (forme F) — 1

| # | information | B | M | F | statut |
|---|---|---|---|---|---|
| 29 | nom du Don — `player.callsign` | **B⁻** | ● M05 « Don V. » | – (« VOUS ») | **lot back LB-1** |

### Bloc 5 — éléments M non appariés à une clé B — 12

| # | élément | B | M | F | statut |
|---|---|---|---|---|---|
| 30 | M01 « ‹ » retour | – | ● | ● | ✔ chrome |
| 31 | M02 titre « La Famille » | – | ● | ● | ✔ |
| 32 | M03 « 3 lieutenants » | ◐ cardinal du tableau | ● | ● (`RefreshFamilySubtitle:1617-1629`) | ✔ — **mesuré** : 4 plaques sur la planche (1 Don + 3 rangs) pour `lieutenants.length == 3` |
| 33 | M04 médaillon Don (anneau or-vif + halo) | – | ● | ● (`:2300`, `BuildMedaillon(… don: true)`) | ✔ marqueur de rang |
| 34 | M06 rôle du Don « Vous » | – | ● | ● **déplacé** : « VOUS » en slot NOM (`:2308`), « LE DON » en slot RÔLE (`:2314`) | à ratifier |
| 35 | M07 médaillon lieutenant (anneau laiton) | – | ● | ● (`:2344`) | ✔ |
| 36 | M09 puce « DÉLÉGUÉ / DIRECT » | roster – / détail ● | ● | – (la puce porte l'ancienneté) | écart assumé re-vérifié → **LB-2** |
| 37 | M11 libellé « État » | – | ● | ● (`:2425`) | ✔ |
| 38 | M12 `.rang.actif` | – | ● | – | **D-12** |
| 39 | M13 « Aucune équipe rattachée » | – | ● | ● (`:2481`) | assumé re-vérifié (0 modèle) |
| 40 | M14 « Voir l'équipe » | – | ● | – | assumé re-vérifié (0 modèle, 0 route) |
| 41 | M16 filets de l'arbre (3 niveaux) | – | ● | ● (`BuildRailVertical`, `BuildRailTick`) | ✔ hiérarchie |

### Bloc 6 — F rendu sans source B ni M — 1

| # | élément | B | M | F | statut |
|---|---|---|---|---|---|
| 42 | « Aucun lieutenant recruté » (roster vide) | – | – | ● (`:1874`) | à ratifier — la maquette ne dessine pas l'état à 0 lieutenant |

### Contrôle d'arithmétique

```
|B| (clés des 3 routes consommées)      = 6 + 18 + 4   = 28
|B⁻ dessiné|                                            =  1
|M non apparié à une clé B|                             = 12
|F sans source|                                         =  1
                                            somme       = 42
lignes de la table (1..42)                              = 42     ✅
```

*(M15 « Recruter un nouveau lieutenant » n'est pas dans la table : c'est une ACTION, comptée en A1.)*

---

## Ce que je n'ai pas pu vérifier

1. **Aucune stack montée, aucun `curl`, aucun test** (contrainte du mandat). Ce qui trancherait :
   `docker compose up` + le squelette du mandat, et `mcp__UnityMCP__run_tests` pour la suite PlayMode.
2. **Aucune suite PlayMode lancée ce tour** (le dossier le déclare non fourni). Les crochets
   (`RenderedTexts`, `Libelle.NbReplis`, `TenureBucketShown`) existent mais n'ont pas été exercés ici.
   ⇒ *« Une garde qui n'a jamais tourné est une prose datée avec un `[Test]` devant »* : je ne peux
   dire de **aucune** garde de cet écran qu'elle est verte.
3. **Les 8 mutations n'ont pas de corps réel** (`non_appelee` dans chaque fichier). Les verdicts D-4 /
   D-5 reposent donc sur la **lecture du code des deux côtés** (`uuidField` → 422), pas sur un 422
   observé. La mesure qui trancherait : un parcours joueur `signup → session/open → POST /v1/lieutenants`
   avec un corps `assigned_building_id: ""`.
4. **`MUSCLE / INTELLIGENCE / FACILITY_MANAGER` dans un roster réel** : mesuré que le domaine les
   contient (9) et que le résolveur de détail n'en couvre que 6 ; **non mesuré** qu'un joueur peut
   aujourd'hui en embaucher un de bout en bout (il faudrait le parcours de recrutement par quête).
   D-2 est donc un défaut **de couverture de résolveur**, pas une régression observée à l'écran.
5. **Les 44 clés `famille.*` orphelines** : le back en sert **145** (`i18n/string_table.ts`), l'écran
   en demande **101 distinctes** ; les 44 restantes portent des slugs dérivés de littéraux **anglais**
   (`famille.archetype.cook`, `famille.opstate.idle`, …) et leur valeur FR **est** l'anglais. Elles ne
   sont demandées par **aucun** résolveur de cet écran (mesure : 101 demandées, 0 absente du bundle). Je n'ai pas
   vérifié qu'aucun **autre** écran ne les demande — `grep -rn 'famille\.' Assets/Scripts` le trancherait.
6. **Écart assumé « district du Don »** : je l'ai laissé à son verdict d'origine ; je n'ai pas ré-énuméré
   les routes « mes districts ». `grep -rn "district" --include="*.controller.ts"` sur les routes
   `JwtAuthGuard` le trancherait.
7. **Le libellé « État » sort en casse de titre** (`famille.ecran.etat` FR = `État`) là où la maquette
   applique `text-transform:uppercase` ; la puce, elle, force `.ToUpperInvariant()` (`:2369`). Casse
   incohérente entre deux libellés du même rang — **relève du juge visuel**, signalé sans être classé.
8. **Le dossier annonce « 3 349 lignes » pour `LieutenantScreenController.cs`** ; le fichier en fait
   **3 572** (`git show 76ee3cc:… | wc -l` = 3572, blob `e4a976e4…` identique à l'arbre de travail).
   Sans conséquence sur ce rapport, mais l'écart est réel.

---

## Annexes

### 1. Routes du domaine — comptes et ancres

| périmètre | compte | ancre |
|---|---|---|
| `operational/lieutenant/lieutenant.controller.ts` | **10** routes, **10** `@UseGuards(JwtAuthGuard)` | `:178`, `:226`, `:268`, `:311`, `:340`, `:357`, `:381`, `:454`, `:544`, `:588` |
| `operational/lieutenant/autonomy/autonomy-reports.controller.ts` | **2** routes, 2 guards | `:41`, `:56` |
| `grep -ril lieutenant --include=*.controller.ts` | **39** fichiers ; hors `_test`/admin et porteurs d'un champ scopé lieutenant sur une route joueur : `exceptions.controller.ts` (3), `recruitment.controller.ts` (7), `execution-plan.controller.ts` (2), `reputation.controller.ts` (2) | |
| `progression/progression.controller.ts` | `@Get('progression')` `:28` | |

**Recouvrement des deux listes** (back ↔ client) : le client appelle **10 sites** pour **9 routes
distinctes** (`LieutenantScreenController.cs:394, 444, 477, 507, 516, 586, 706, 732, 2834, 2850` —
`:444` et `:2834` visent la **même** URL). Dans le back et pas dans le client : `signal-drift/decision`,
`standing-order`, `standing-order/decision` (**0 référence dans tout `Assets/Scripts`**). Dans le
client et hors du module : `GET /v1/progression`, `GET /v1/i18n/bundle` (`:507`), `POST /v1/auth/signin`.

### 2. Corps réels — provenance et intégrité

`corps-reels/` (copie de `da/corps-reels` `bff35d6`), compte `demo_capture@example.test`,
`horloge_game_minute 72013` (jour 50), `back_main **b357e7a4**`.
⚠ Le back que j'ai LU est `main` à **`effde26a`**. Contrôle exécuté :
`git merge-base --is-ancestor b357e7a4 HEAD` → **vrai**, et
`rtk proxy git diff b357e7a4 HEAD -- services/game-back/src/operational/lieutenant/ …/progression.controller.ts …/i18n/ | wc -l` → **0**.
⇒ *le code lu est byte-identique à celui qui a produit les corps.*

Le front lu est `76ee3cc` : blob de `LieutenantScreenController.cs` = `e4a976e4…` **des deux côtés**
(`git rev-parse 76ee3cc:… ` == `git hash-object <arbre de travail>`), `git diff 76ee3cc HEAD -- Assets/Scripts/Operational/Lieutenant/` → **0 ligne**.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine | source lue |
|---|---|---|
| `archetype` | `COOK \| LOGISTICS \| DISTRIBUTION \| LAUNDERING \| SECURITY \| BOOKKEEPER \| MUSCLE \| INTELLIGENCE \| FACILITY_MANAGER \| UNKNOWN` | `lieutenant-archetype.ts:39-52` + `lieutenant.projection.service.ts:83` |
| `op_state_band` | `SETTLING \| PAUSED \| ACTIVE \| IDLE` | `lieutenant.projection.service.ts:98` |
| `rule_count_band` | `NONE \| FEW \| MANY` | `:102` |
| `tenure_bucket` | `FRESH \| ACCLIMATED \| SEASONED \| SENIOR \| ENTRENCHED` | `tenure-inertia.ts:59` (via `:107`) |
| `granted_role` | `advisory \| executor \| delegated_owner \| cohort_overseer` | `:87` |
| `mode` | `tasked \| delegated` | `:91` |
| `reassign_availability` | `AVAILABLE \| ON_COOLDOWN` | `:124` |
| `script_revision_cost` | `COST_1 \| COST_2 \| COST_3 \| COST_MAX` | `tenure-inertia.ts` (`ActionCostComposite`) |
| `reassignment_disruption` | `DISRUPT_SHORT \| DISRUPT_MED \| DISRUPT_LONG \| DISRUPT_MAX` | idem |
| `role_efficiency_bonus` | `BONUS_NONE \| BONUS_LOW \| BONUS_MID \| BONUS_CAP` | idem |
| `budget_bands` valeurs | `depleted \| low \| nominal \| full` ; 7 clés de catégorie | `lieutenant.projection.service.ts:165-168` + `AutonomyClient.cs:132-135` |
| `name` | `varchar(64)` NOT NULL, forme « Lt. *Nom* », pools de 12+12 noms, unique par roster | `db/schema/lieutenant.ts:91` ; `lieutenant-name-pool.ts:30-39`, `:46` (`PREFIXE = 'Lt. '`), `:72-79` |
| `progress_to_next` | `LOCKED \| IN_PROGRESS \| UNLOCKED` | `ProgressionClient.cs:41` (commentaire) — **contrainte back non relue**, voir « non vérifié » |

**Clés i18n** : les **102 paires (clé, littéral)** que l'écran dérive de ses littéraux
(`Libelle.De` ×51 + `Lib(...)`, slug `Libelle.cs:81-91`) — soit **101 clés distinctes**,
`famille.ecran.etat` étant demandée deux fois (`Lib("ÉTAT")` `:2425` et `Lib("État")`) — sont
**toutes présentes** dans `EN_MESSAGES`/`FR_MESSAGES` (`i18n/string_table.ts`) → **0 repli**. Contrôle positif : la clé
`famille.ecran.etat` rend `État` en FR et `State` en EN, ce qui explique la casse observée sur la planche.

### 4. Inventaire M (`family-organigramme-reference-source.html`, rendu ratifié `reference-1120.png`)

| id | élément (sélecteur) | représente |
|---|---|---|
| M01 | `.retour` « ‹ » `:158` | retour |
| M02 | `.tete h3` « La Famille » `:158` | titre |
| M03 | `.tete .sous` « 3 lieutenants » `:158` | cardinal du roster |
| M04 | `.medl.don` `:160` (`:61` anneau `--or-vif` + halo) | rang du Don |
| M05 | `.don-rang .nom` « Don V. » `:161` | nom du Don |
| M06 | `.don-rang .role` « Vous » `:161` | rôle du Don |
| M07 | `.rang .medl` ×3 `:163,169,175` | rang lieutenant |
| M08 | `.rang .nom` « Comptable / Sécurité / Blanchiment » `:164,170,176` | identité du lieutenant |
| M09 | `.chip.del` / `.chip.self` « Délégué » / « Direct » `:164,170,176` | mode d'exercice |
| M10 | `.rang .etat b` « Actif » / « Repos » `:165,171,177` | état opérationnel |
| M11 | `.rang .etat span` « État » | libellé de la valeur |
| M12 | `.rang.actif` `:163` (`:78`) | rang sélectionné |
| M13 | `.equipe .vide` « Aucune équipe rattachée » ×2 `:167,179` | absence d'équipe |
| M14 | `.eq-resume .eq-chip` « Voir l'équipe » ×1 `:173` | accès à l'équipe |
| M15 | `.vide` « Recruter un nouveau lieutenant » `:182` | CTA de recrutement |
| M16 | `.arbre::before` / `.rang::before` / `.equipe::before` `:72,77,90` | hiérarchie à 3 niveaux |

⚠ `.chip.ret` « Retiré » (`:88`) et `.homme` / `.homme .ou` (`:95-101`) sont **déclarés en CSS et non
instanciés** dans le markup ratifié — ils ne sont donc pas des éléments M de cette passe.
⚠ Cette source est un extrait **déjà amendé** : son `.nom` porte un libellé d'archétype et son
en-tête écrit « *la maquette affiche "3 lieutenants · 11 hommes" mais aucune donnée d'effectifs
n'existe côté back … jamais de compte fabriqué* » (`:155-157`). Le rendu ratifié `reference-1120.png`
correspond à cet état.

### 5. Inventaire F (champ → sites → classe)

**`RosterRow` (DTO front, `LieutenantDtos.cs:113-120`, 5 champs)** — comptes `grep -c '\.<champ>\b'`
scopés à `LieutenantScreenController.cs`, **puis chaque site lu et classé** :

| champ | hits | sites VIVANTS | classe |
|---|---|---|---|
| `lieutenant_id` | 2 | `:2431` | **LOGIQUE** (`:2586` = code mort `BuildRosterRow`) |
| `archetype` | 11 | `:2352` | **RENDU** (`:851` = détail ; `:2564/2574/2589/2590` = code mort ; le reste = `pickedArchetype`/prose) |
| `op_state_band` | 5 | `:2414` | **RENDU** (`:857` = détail ; `:2579/2580/2591` = code mort) |
| `rule_count_band` | 1 | — | **IGNORÉ** (le seul hit `:859` lit le détail) |
| `tenure_bucket` | 4 | `:2369` | **RENDU** (`:864/865` détail, `:2684` confirmation) |
| *(`name`)* | — | — | **non déclaré** ⇒ jeté au parse |

**`LieutenantBands` (DTO front, `:89-102`, 11 champs)** : `archetype`, `granted_role`, `mode`,
`op_state_band`, `rule_count_band`, `script_source`, `tenure_bucket`, `script_revision_cost`,
`reassignment_disruption`, `role_efficiency_bonus` → **RENDU** (`RenderBands:851-873`) ;
`archetype` aussi **LOGIQUE** (palette de règles). **7 clés servies ne sont pas déclarées** :
`name`, `reassign_availability`, `cue_bands`, `drift_phase`, `standing_order`, `trust_budget_bucket`,
`flag_frequency_band` (`grep -rl` sur tout `Assets/Scripts` : les 4 premières → **0 fichier** ;
`trust_budget_bucket`/`flag_frequency_band` → `Shell/DailyReview*` uniquement).
`budget_bands` est consommé **hors DTO**, par extraction regex sur le corps brut (`AutonomyClient.cs:137-146`).

**`ProgressionDto` (`ProgressionClient.cs:39-45`)** : `vocabulary_tier` **RENDU + LOGIQUE** ;
`progress_to_next` **IGNORÉ** ; `next_tier`, `tier_label_i18n` non lus ici.

**Affiché sans venir d'un champ** : `"VOUS"` (`:2308`) · `Lib("LE DON")` (`:2314`) ·
`Lib("ÉTAT")` (`:2425`) · `Lib("Aucune équipe rattachée")` (`:2481`) ·
`Lib("Recruter un nouveau lieutenant")` (`:2514`) · `Lib("Aucun lieutenant recruté")` (`:1874`) ·
`n + " LIEUTENANTS"` (`:1627`, dérivé du cardinal) · les 5 phrases anglaises de
`RenderReassignConfirm` (`:2676`, `:2680`, `:2682`, `:2684`, `:2685`) · `"Recruit " + …` (`:1436`) ·
`$"Palier de vocabulaire {VocabularyTier} — …"` (`:2963`).

**Résolveurs nommés** : `FamilleLabels.Archetype` (9 archétypes + repli brut), `FamilleLabels.Etat`
(4 bandes), `FamilleLabels.Anciennete` (5 paliers), `FamilleLabels.Mode` (**déclaré `:60-68`,
0 appel dans tout `Assets/Scripts`**) — **aucun** ne passe par `Libelle.De` (compte : 0).
Côté détail : `ArchetypeLabel` (**6/9**), `GrantedRoleLabel` (4/4), `ModeLabel` (2/2),
`OpStateLabel` (4/4), `RuleCountLabel` (3/3), `TenureBucketLabel` (délègue à `FamilleLabels`),
`RevisionCostLabel` / `DisruptionLabel` / `EfficiencyBonusLabel` (4/4 chacun),
`CategoryLabel` (7/7), `BandLabel` (4/4) — tous via `Libelle.De`.

### 6. Non vérifié

Voir la section « Ce que je n'ai pas pu vérifier » ci-dessus (8 points).
