# Juge données ⊥ — ㊴ Le dossier (« ce qu'ils ont sur vous ») — mode **maquette** — 2026-09-06

Juge à contexte vierge. Aucune stack montée (gate E2E en cours) : B vient du **corps réel déjà
capturé** que le dossier désigne + de la **lecture du back** (`mafia-clean-city`, `main` au
2026-09-06). Aucun `curl`, `docker`, `npm`, `tsc`, ni test lancé. Le front n'est pas lu (mode maquette).

## En une phrase

L'écran dessine **7 des 10 clés que les 3 routes joueur du domaine servent** — mais seulement **5 des
12 valeurs** que ces clés peuvent prendre — et il dessine **15 informations de plus qu'aucune clé ne porte** : **13 écarts** à consigner — dont **quatre majeurs**
(la 3ᵉ piste attribue au JOUEUR l'état d'un de ses LIEUTENANTS · **7 des 12 valeurs de bande n'ont
aucun libellé dessiné, dont `glaring`, la valeur MESURÉE sur le compte de démo** · les 3 pistes sont
des agrégats-du-pire dont le sujet est jeté · le cadre 133 asserte du back une propriété **fausse**) —
et **9 questions « passé à côté ? »**.

---

## Écarts à consigner (mode maquette — B vs M)

Cette table est la **table des écarts ASSUMÉS** du dossier `juge-visuel` qui suit : chaque ligne porte
sa raison **mesurée** et sa source.

| # | information | B | M | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|
| **E1** | « votre train de vie » attribue au **joueur** l'état d'un de ses **lieutenants** | ● | ● | **MAJEUR — sens faux** | `db/schema/forensic.ts:473` « *One row per lieutenant (per player)* » ; `:530` « *declared_cut_cents — cash on the books for **this lieutenant*** » ; `:460` « *sedan sprite passive → tailing → subpoena* ». M : `ecrans-brennar-6.html` cadre 131 `<i>votre train de vie</i>`, cadre 132 `<b>convoqué</b>`. L'identité (`lifestyle_audit_state.lieutenant_id`, la **PK**) n'est jamais projetée |
| **E2** | **7 des 12** valeurs de bande n'ont **aucun libellé dessiné** | ● | – | **MAJEUR** | mesuré par colonne, `mesures/valeurs-dessinees.txt` : audit `clean`,`flagged` · effluent `clear`,`faint`,**`glaring`** · lifestyle `noticed`,`watched`. Domaines lus à la source : `forensic.projection.service.ts:79,98,118`. **`glaring` est la valeur MESURÉE** du corps réel (`corps-reels/GET_me_forensic.json`, `effluent_visibility_bucket: "glaring"`, 2026-09-04) |
| **E3** | les 3 pistes sont des **agrégats du pire** ; la maquette les présente comme 3 propriétés du joueur | ● | ● | **MAJEUR** | `forensic.projection.service.ts:270-292` (χ² = **max** d'une ligne, `soft_flag_count` = **SOMME** de toutes) · `:295-315` (deviation = max, `block_id`/`district_id` **jamais sélectionnés** — 0 hit du motif dans ce fichier) · `:317-350` (stage, consecutive et gap maximisés **CHAMP PAR CHAMP sur des lignes différentes** : `:338`, `:342`, `:346`) ⇒ le bucket peut décrire un monde qu'**aucune ligne ne porte** |
| **E4** | cadre 133 asserte « **cinq achetables** » — c'est **faux** | ● | ● | **MAJEUR — assertion réfutée** | `ia-target.service.ts:592-598` : `case 'port_inspector': case 'broker': case 'judge_aide': return false;` **inconditionnel** ⇒ `resolveOwnedTarget` → `null` (`:471-472`) ⇒ `RESOURCE_NOT_FOUND` **avant tout débit** (`ia-intel-purchase.service.ts:192-196`). Épinglé : `tests/e2e/operational/internal_affairs/ia_player_intel_purchase.spec.ts:251` « *port_inspector deny-by-default* … `toBe(404)` ». M : cadre 133 `<small>la route accepte d'acheter du renseignement sur <u>cinq types</u></small>` |
| **E5** | le CTA « ACHETER DU RENSEIGNEMENT » est offert **là où il n'a pas de cible**, et absent **là où il en a une** | ● | ● | **MAJEUR — action sans argument** | route : `internal-affairs.controller.ts:75-96` — exige `:ref` (UUID d'un référent **possédé**, `UuidParam`) **et** `actor_type`. Mesuré sur les 6 cadres : `pied`/`cta6` présents en **131 et 132** (la vue **pistes**, aucun acteur sélectionné, aucun sélecteur dessiné) et **absents en 133/134** (la vue **acteurs**). La note du CTA le dit elle-même : « *sur un acteur, pas sur une piste* » |
| **E6** | le prix du renseignement — l'écart assumé du dossier est **à moitié faux** | ● | – | MOYEN | `IAIntelPurchaseResult.costCents` **EXISTE** : `ia-intel-purchase.service.ts:132` (`readonly costCents: number`), alimenté `:244`, retourné `:291`. Le vrai trou : **aucune route JOUEUR ne sert le prix AVANT l'achat** — la seule surface pré-achat est `_test/ia/read-tunables` (`ia-test.controller.ts:311`), une route de test. ⇒ le lot L3 du cadre 136 (« *aucun champ ne le porte* ») est **faux à la lettre** |
| **E7** | L4 est mal formulé de la même façon | ● | – | MOYEN | la route **retourne** bien la bande (`band`, `ia-intel-purchase.service.ts:127`). Ce qui manque est une **LECTURE** : **0** route lit `ia_intel_purchases` hors `_test` (mesuré : le seul `from(iaIntelPurchase)` de l'arbre est `ia-test.controller.ts:600`) |
| **E8** | la liste d'acteurs n'est **ni filtrée ni bornée** | ● | ● | MOYEN | `ia-projection.service.ts:265-273` : les deux `select` n'ont **que** `eq(player_id)` — **aucun filtre sur `recruitment_candidates.status`** (domaine `available\|in_quest\|hired\|expired\|declined`, `db/schema/recruitment.ts`) ⇒ candidats **expirés/déclinés** listés comme « Greffier » ; et **tous** les `lawyers`, défenseur public Tier-1 auto-assigné compris. M : 4 lignes dans `.dos6 .acteurs{…overflow:hidden}` — ni défilement ni pagination ni cardinal borné |
| **E9** | l'état vide « Rien à votre nom » n'a **aucun discriminant** | ● | ● | MOYEN | la projection rend des **valeurs sûres** pour un joueur sans état : `clean`/`clear`/`quiet` (`forensic.projection.service.ts:413`, `:442`, `:485`). « aucune donnée » et « tout au plus bas » sont **le même corps**. La copie du cadre 135 affirme « *vous n'avez pas encore commencé* » — affirmation que la réponse **ne permet pas** de faire |
| **E10** | la référence d'acteur dessinée n'est pas ce que le back rend | ● | ● | MINEUR | M : `<span>ia.actor.4f21</span>` (cadres 133/134). B : `actorRef` = un **UUID** (`lawyers.lawyer_id` / `recruitment_candidates.candidate_id`, `ia-projection.service.ts:109`, `:267-271`). Motif `ia\.actor` dans `services/game-back/src` : **0 fichier** — contrôle positif `actorRef` : **5 fichiers** (le motif fonctionne) |
| **E11** | la 3ᵉ fenêtre de compteurs **change de sens** d'un cadre à l'autre | – | ● | MINEUR | « qui tiennent NN/4 » (131,132) → « partis » (133,134) → « acteurs connus » (135) → « acteurs » (136), pour un composant à **3 fenêtres fixes** (`.dos6 .compteurs{display:flex}` — 3 `.fen`). La règle de choix n'est écrite nulle part |
| **E13** | les pistes portent leur **clé brute**, les acteurs **non** — le mapping libellé↔valeur d'enum n'est écrit nulle part pour les acteurs | ● | ● | MINEUR | mesuré : `<span class="cle">` existe dans les cadres 131/132 (`watched`, `visible`, `quiet`, `audited`, `subpoenaed`) et **0 fois** dans les cadres 133/134. ⇒ « il tient / il a peur / injoignable / parti » ↔ `steady/nervous/unavailable/gone` est **ma lecture**, pas une correspondance que la maquette écrit. Le domaine est lu à la source (`ia-projection.service.ts:77`) ; l'appariement, lui, est DÉDUIT |
| **E12** | l'état « fonds insuffisants » n'est pas dessiné | ● | – | MINEUR | la route peut rendre **402** (`ia-intel-purchase.service.ts:260-264`, `HttpStatus.PAYMENT_REQUIRED`). Le CSS ㊴ définit `.dos6 .cta6.eteint` — **0 usage** dans les 6 cadres (mesuré). *(Possible boilerplate de série : `.bln6 .cta6.eteint` porte la même règle.)* |

### Les trois écarts ASSUMÉS du dossier — re-mesurés, pas recopiés

Le dossier les datait du 2026-08-27 et demandait de les re-mesurer. Résultat : **un tenu, un aggravé,
un à moitié faux.**

| écart assumé (2026-08-27) | verdict 2026-09-06 | mesure |
|---|---|---|
| « le contrôleur accepte 5 types de cible, la projection n'en liste que 2 » | **TENU, et AGGRAVÉ** | la validation d'entrée accepte bien les 5 (`internal-affairs.controller.ts:96`, `enumField(iaTargetType.enumValues, …)`), mais les 3 réservés sont **structurellement inatteignables**, pas seulement non listés : `ia-target.service.ts:592-598` rend `false` **inconditionnellement** ⇒ 404 avant tout débit. ⇒ « la projection est en retard sur la route » est **faux** : les deux disent la même chose, et le lot L1 de la maquette prescrit à côté (cf. **E4**) |
| « le PRIX du renseignement n'est jamais servi — aucune clé de prix » | **À MOITIÉ FAUX** | `IAIntelPurchaseResult.costCents` **existe** (`ia-intel-purchase.service.ts:132`) et est retourné par le POST (`:291`). Le trou réel : aucune route **joueur** ne le sert **avant** le débit (cf. **E6**) |
| « `gone` ≠ `unavailable` — le back distingue, l'écran doit distinguer » | **TENU — et la maquette le fait déjà** | back : `ia-projection.service.ts:214` (`discovered_at` → `gone`) vs `:218` (`investigation_id` → `unavailable`). M : le cadre **134** est consacré à cette distinction (« parti n'est pas injoignable … un acteur **injoignable** revient. Un acteur **parti** est une perte définitive »), avec un traitement visuel dédié (`.ac.parti{opacity:.45;border-style:dashed}`). **Aucun écart à consigner ici** — c'est le seul des trois qui n'en est plus un |

### Observation côté B (pas un écart de maquette — une **prose datée** à re-mesurer)

**O1 — le commentaire de tête du contrôleur est un énoncé daté que la mesure contredit.**
`forensic.controller.ts:12-15` (daté W6.2, **2026-08-13**) : « *`audit_risk_bucket` … and
`lifestyle_alarm_bucket` … **stay CONSTANT for every player*** ». Le corps réel du **2026-09-04**
(`corps-reels/GET_me_forensic.json`, `back_main 6ff684db`) rend `audit_risk_bucket: "watched"` —
**pas** le `clean` que ce commentaire appelle constant.
Chaîne de production qui l'explique (comptée, non exécutée) : `laundering.service.ts:60,92` injecte
`LeadingDigitAuditService` → `recordReceipt` → `insert(ledgerEntryRing)`
(`leading-digit-audit.service.ts:195`) ; le tick **WEEKLY/9** `runWeeklyAuditTick` est enregistré à
l'`onApplicationBootstrap` (`forensic.module.ts:117` ; `city_sim_scheduler.service.ts:727`) ; et le
seeder de démo exerce la **route joueur** d'injection (`mafia-unity-J/Tools/seed_operational_demo.mjs:860`, `:888` — `POST /v1/operational/laundering/inject`).
⇒ **La piste « la comptabilité » n'est plus morte.** Cet énoncé (et l'épingle d'anti-péremption
`operational/forensic_projection_route.spec.ts:240,280`) est à re-mesurer après le gate — voir §Non vérifié.

---

## « Passé à côté ? » — pour l'user

Deux familles. **(a)** clés servies que la maquette ne dessine pas. **(b)** colonnes **en base, non
projetées** (B⁻) — pour chacune je dis si le mur P5 l'interdit **explicitement** ou non, parce que
c'est ce qui décide s'il s'agit d'un lot ou d'un refus.

| # | clé / colonne (route ou table) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q1** | **`band`** — `POST me/…/:ref/intel` (`ia-intel-purchase.service.ts:127`, domaine `silent\|watching\|investigating\|revealing` `:82`) | ce que le renseignement **payé** a révélé sur l'acteur | **utile ici, et c'est le trou le plus cher** : le joueur débite ~$8 k et **aucun cadre** ne dessine la réponse. Sans surface, l'action est un débit sans retour | ★★★★★ |
| **Q2** | **`lifestyle_audit_state.lieutenant_id`** (B⁻, la **PK** de la table) | **quel lieutenant** est suivi / convoqué | **utile ici** : c'est la seule chose actionnable de la 3ᵉ piste — « convoqué » sans nom ne se joue pas. **Pas dans la liste P5** du fichier (`forensic.projection.service.ts:126` : la liste interdite ne cite que des **scalaires**, pas des identités) | ★★★★★ |
| **Q3** | **`block_effluent_register.block_id` / `district_id`** (B⁻) | **quel bloc** rejette trop | **utile ici** : la piste s'appelle « ce qui sort des cuves » et le joueur ne peut agir que sur un bloc nommé. **Pas dans la liste P5**. (0 hit de `block_id` dans la projection) | ★★★★☆ |
| **Q4** | **`ledger_entry_ring.front_id`** (B⁻) | **quelle façade** est signalée | **utile ici**, même raison que Q3. **Pas dans la liste P5** | ★★★★☆ |
| **Q5** | **`lawyers.name`** (B⁻ sur CETTE route ; `db/schema/legal.ts:168`, `varchar(64) notNull`) | le **nom** de l'acteur, au lieu d'un UUID | **utile ici** : c'est le lot L2 de la maquette, et il est **déjà résolu ailleurs** — `GET /v1/me/legal` projette `lawyerLabel` **et** `lawyerLabelI18n` sur `lawyerId` (`legal-projection.service.ts:250` docstring, `:265-266` code), or `ActorSummary.actorRef` **EST** ce `lawyer_id`. ⚠️ **Pour `clerk`, il n'y a aucun nom en base** : `recruitment_candidates` n'a pas de colonne de nom, son `profile` est un « *brief qualitatif … NO stats* » et `rich_citizens` n'a pas de nom non plus (18 colonnes, mesuré) | ★★★★☆ |
| **Q6** | **`costCents`** — `POST …/:ref/intel` (`:132`) | ce que le renseignement **coûte** | **utile ici**, mais servi **trop tard** (après le débit) : cf. E6. La demande réelle est une route de **tarif** | ★★★☆☆ |
| **Q7** | **`internal_affairs_targets.discovered_at`** (B⁻) | **quand** l'acteur a été perdu (« parti ») | utile pour le cadre 134 (« il ne reviendra pas ») : une date rend la perte lisible. Pas dans `FORBIDDEN_KEYS` (`ia_player_actors.spec.ts:97`) | ★★★☆☆ |
| **Q8** | **`ia_investigations.closes_at`** (B⁻) | **jusqu'à quand** l'acteur est « injoignable » | utile : la maquette distingue `injoignable` (revient) de `parti` (définitif) — sans échéance, « revient » n'est pas jouable. ⚠️ `investigation_id` **est** interdit ; `closes_at` ne l'est pas | ★★★☆☆ |
| **Q9** | **`ia_intel_purchases`** — `purchased_at`, `revealed_band`, `cost_cents` (B⁻, 0 lecteur joueur) | l'**historique** des renseignements achetés | utile : sans lecture, le joueur repaie pour relire. C'est le lot L4 **bien formulé** | ★★☆☆☆ |
| — | `purchaseId` (`:122`) | — | **pas ici** : plomberie (« *for E2E assertion — row existence proof* », son propre docblock) | ☆ |
| — | les **25 scalaires** de `ledger_entry_ring` / `block_effluent_register` / `lifestyle_audit_state` (χ², déviation, gap, soft flags, mois consécutifs, stage brut, ticks) | — | **pas ici, et c'est un refus, pas un oubli** : R2.2/P5 les nomme un par un (`forensic.projection.service.ts:126`). Ne pas les proposer en lot | ☆ |

---

## Lots back suggérés (B⁻ dessiné ou nécessaire — forme F)

| # | colonne | table | maquette | preuve |
|---|---|---|---|---|
| **LB1** | `lieutenant_id` | `lifestyle_audit_state` | cadre 131/132, piste « votre train de vie » (M18-M21) | PK de la table (`forensic.ts:471`), jetée par l'agrégat `:317-350`. Ferme **E1** — sans elle la 3ᵉ piste ment sur son sujet |
| **LB2** | `name` (+ `name_i18n`) | `lawyers` | cadres 133/134, `<b>Avocat</b>` + `<span>ia.actor…</span>` (M24-M25) | `legal.ts:168` (`notNull`) ; **précédent maison** déjà livré : `lawyerLabel`/`lawyerLabelI18n` (`legal-projection.service.ts:250,265`). ⚠️ le volet `clerk` **n'a pas de source** — c'est un lot de **fiction** (table de noms), pas de projection |
| **LB3** | `block_id`, `district_id` | `block_effluent_register` | cadre 131/132, piste « ce qui sort des cuves » (M14-M17) | colonnes existantes (`forensic.ts`, 8 colonnes mesurées) ; 0 hit dans la projection |
| **LB4** | `front_id` | `ledger_entry_ring` | cadre 131/132, piste « la comptabilité » (M10-M13) | idem LB3 |
| **LB5** | route de **tarif** (pré-achat) | tunable `internal_affairs.intel_purchase_cost_cents` | CTA (M33) | getter existant `ia.tunables.ts:155-158` ; **seule** surface actuelle = `_test/ia/read-tunables` (`ia-test.controller.ts:311`). Ferme **E6/L3** |
| **LB6** | route de **lecture** des achats | `ia_intel_purchases` (6 colonnes) | rien de dessiné | 0 lecteur hors `_test` (`ia-test.controller.ts:600`). Ferme **E7/L4** |
| **LB7** | filtre `status` sur les candidats | `recruitment_candidates` | liste d'acteurs (M23-M28) | `ia-projection.service.ts:268-271` : aucun prédicat de `status`. Ferme **E8** |

⛔ **Ne PAS prescrire le lot L1 du cadre 136** (« lister les cinq types d'acteurs ») : les 3 types
réservés n'ont **aucune table de référent** et le refus est **délibéré et documenté**
(`ia-target.service.ts:592-598` + son docblock C3-bis.1.3 : « *le jour où quelqu'un câble un
appelant live pour l'un d'eux SANS écrire son cas ici, son PROPRE nouveau chemin rend 404
immédiatement* »). Le lot juste serait *créer les référents*, pas *lister*.

---

## Actions : routes ↔ CTA

| geste | route | verdict |
|---|---|---|
| CTA « ACHETER DU RENSEIGNEMENT » (cadres 131, 132) | `POST /v1/me/internal-affairs/actors/:ref/intel` (`internal-affairs.controller.ts:76`) | **DÉFAUT (E5)** — le CTA est sur la vue **pistes** ; la route exige un `:ref` d'acteur + `actor_type`. Aucun sélecteur d'acteur n'est dessiné en 131/132 |
| *(aucun CTA)* sur la vue **acteurs** (cadres 133, 134) | la même route | **DÉFAUT (E5, l'autre moitié)** — mesuré : `pied` = 0 dans les cadres 133/134, alors que c'est le seul endroit où un `:ref` existe |
| *(aucun geste)* | `GET /v1/me/forensic` (lecture) | ✔ lecture seule, pas d'action attendue |
| *(aucun geste)* | `GET /v1/me/internal-affairs/actors` (lecture) | ✔ idem |
| **Aucune route sans CTA** | — | les **3** routes joueur du domaine sont comptées (`mesures/routes-domaine.txt`) ; la seule `@Post` est celle ci-dessus |

---

## Table de couverture complète

**Comptes** — `|clés B| = 10` · `|éléments M non appariés| = 15` · `|rendus F sans source| = 0`
(mode maquette, F non mesuré) · **somme = 25 lignes**. Vérifié : 10 + 15 + 0 = **25**. ✔

**Exclus explicitement, avec leur compte** (et pourquoi) :
- **4 clés de protocole** — `response_meta.{request_id_echo, server_processed_at, api_version, correlation_id_echo}` (corps réel) : enveloppe, pas de l'information de jeu.
- **7 éléments de la `barre`** (Argent `$ 24 850` · manomètre + « tiède » + « Heat » · « Jour 12 » · « Matin ») : c'est le **shell**, servi par `session/open`, hors domaine ㊴ — voir §Non vérifié (6).
- **4 lots L1-L4 du cadre 136** : cadre de **planification**, pas un écran joueur ; ils sont jugés dans les écarts E4/E6/E7 et §Lots back.

### Lignes B (10)

| # | information | B | M | statut | classe |
|---|---|---|---|---|---|
| B1 | `audit_risk_bucket` (`clean\|watched\|flagged\|audited`) | ● MESURÉ (`"watched"`) | ● piste 1 (crans + « on regarde » + clé) | apparié — **2 valeurs sur 4 dessinées** | ✔ / E2 |
| B2 | `effluent_visibility_bucket` (`clear\|faint\|visible\|glaring`) | ● MESURÉ (`"glaring"`) | ● piste 2 | apparié — **1 valeur sur 4**, et **la valeur mesurée n'en fait PAS partie** | **E2** |
| B3 | `lifestyle_alarm_bucket` (`quiet\|noticed\|watched\|subpoenaed`) | ● MESURÉ (`"quiet"`) | ● piste 3 | apparié — **2 sur 4**, et le **sujet** est faux | **E1 + E2** |
| B4 | `actors` (la liste ⇒ son cardinal) | ● DÉDUIT | ● « 04 acteurs connus », 4 lignes | apparié — non borné, non filtré | **E8** |
| B5 | `actors[].actorRef` | ● DÉDUIT | ● `ia.actor.4f21` | apparié — **transformé sans source** | **E10** |
| B6 | `actors[].actorType` (`lawyer\|clerk`) | ● DÉDUIT | ● « Avocat » / « Greffier » + silhouette | apparié — **2/2 valeurs dessinées** | ✔ |
| B7 | `actors[].status` (`steady\|nervous\|unavailable\|gone`) | ● DÉDUIT | ● « il tient / il a peur / injoignable / parti » + couleur + `.parti` | apparié — **4/4 valeurs dessinées** | ✔ *(le seul domaine intégralement couvert)* |
| B8 | `purchaseId` | ● DÉDUIT | – | disponible, non dessiné | « passé à côté ? » (plomberie, sans intérêt) |
| B9 | `band` (`silent\|watching\|investigating\|revealing`) | ● DÉDUIT | – | **disponible, jamais dessiné** | **Q1 ★★★★★** |
| B10 | `costCents` | ● DÉDUIT | – | disponible **après le débit**, non dessiné | **E6 / Q6** |

*(B4-B10 sont **DÉDUITS** : les deux routes d'internal-affairs n'ont **aucun corps capturé** dans
`corps-reels/` — `_index.json` ne liste qu'une route. Source de la déduction : les interfaces
`ActorSummary` (`ia-projection.service.ts:108-112`) et `IAIntelPurchaseResult`
(`ia-intel-purchase.service.ts:120-133`), plus les deux specs qui exercent les routes
(`ia_player_actors.spec.ts:191-224`, `ia_player_intel_purchase.spec.ts:197-217`). ⚠️ **aucune des
deux specs n'épingle l'ENSEMBLE DE CLÉS** — mesuré : `Object.keys` = **0 occurrence** dans les deux
fichiers ; seule une liste **négative** (`FORBIDDEN_KEYS`, `:97`) est asserée. Pour `me/forensic`
l'épingle d'ensemble existe : `tests/e2e/parcours/36_42_horizon_forensic.parcours.spec.ts:52-54`.)*

### Lignes M non appariées (15)

| # | information dessinée | source | statut | classe |
|---|---|---|---|---|
| M-a | sous-titre d'état de l'enseigne (6 valeurs : « trois pistes… », « ils sont venus », « qui parle, et qui a peur », « il ne reviendra pas », « rien à votre nom », « ce qui manque encore ») | dérivable de B1-B3 + B7 | **ASSUMÉ** — règle de dérivation non écrite | à consigner |
| M-b | compteur « NN**/3** pistes chaudes » (131:01 · 132:03 · 135:00 · 136:02) | dérivable : nombre de pistes de rang ≥ 3 (vérifié cohérent sur 131/132/135) | **ASSUMÉ** — la règle n'est écrite nulle part | à consigner |
| M-c | compteur « NN franchies » (131:00 · 132:02 · 135:00) | dérivable : nombre de pistes de rang **4** | **ASSUMÉ** | à consigner |
| M-d | compteur « NN**/4** qui tiennent » | dérivable de B7 (`steady` / total) | **ASSUMÉ** | à consigner |
| M-e | compteur « NN qui ont peur » | dérivable de B7 (`nervous`) | **ASSUMÉ** | à consigner |
| M-f | compteur « NN partis » | dérivable de B7 (`gone`) | **ASSUMÉ** | à consigner |
| M-g | `.pi.bout` — « le dernier cran est un **ÉVÉNEMENT** » (bordure rouge) | dérivable : rang 4 | **ASSUMÉ** | à consigner |
| M-h | **nom** de l'acteur | **aucune** pour `clerk` ; `lawyers.name` pour `lawyer` | **lot back** | **LB2** |
| M-i | référence courte `ia.actor.4f21` | **aucune** (0 hit du motif dans le back) | **DÉFAUT de forme** | **E10** |
| M-j | **identité du sujet** de chaque piste (quel front / quel bloc / quel lieutenant) | **B⁻** — colonnes en base, non projetées | **lot back** | **LB1, LB3, LB4** |
| M-k | **prix** du renseignement avant achat | aucune route joueur | **lot back** | **LB5 / E6** |
| M-l | surface du **résultat** du renseignement | `band` existe, aucun cadre ne le dessine | **DÉFAUT de maquette** | **E7 / Q1** |
| M-m | discriminant de l'état vide « Rien à votre nom » | **aucune clé** — les valeurs sûres rendent les deux mondes identiques | **DÉFAUT** | **E9** |
| M-n | copie statique : 3 intitulés de piste (« la comptabilité », « ce qui sort des cuves », « votre train de vie ») + **5** panneaux didactiques + note du CTA + texte de l'état vide | copie d'écran | ✔ légitime — **sauf** le panneau du cadre 133, qui asserte du back une propriété **fausse** | **E4** |
| M-o | CTA « ACHETER DU RENSEIGNEMENT » posé sur la vue **pistes** | route existante, **argument absent** | **DÉFAUT** | **E5** |

---

## Annexes

### 1. Routes du domaine — compte et ancres

Balayage **exhaustif** des décorateurs de route de `services/game-back/src` :
**148** fichiers `*.controller.ts` · **1030** décorateurs · **53** dont le chemin porte un mot du
domaine (`forensic|internal-affairs|intel|actor|effluent|lifestyle|audit|suspicion|dossier`, insensible
à la casse). Sortie complète : `mesures/routes-domaine.txt`.

**Routes JOUEUR du domaine = 3** (PROD + `JwtAuthGuard`, contrôleurs `_test` exclus) :

| méthode | chemin | ancre | enregistrement production |
|---|---|---|---|
| `GET` | `/v1/me/forensic` | `operational/forensic/forensic.controller.ts:52` | `forensic.module.ts:98` (always-on) ← `app.module.ts:486` |
| `GET` | `/v1/me/internal-affairs/actors` | `operational/internal_affairs/internal-affairs.controller.ts:61` | `internal-affairs.module.ts:87` (always-on) ← `app.module.ts:509` |
| `POST` | `/v1/me/internal-affairs/actors/:ref/intel` | `…/internal-affairs.controller.ts:76` | idem |

**Exclues** : 2 routes BO/admin (`forensic-admin.controller.ts:159`, `:281`) et **48** routes `_test`.

**Contrôle de complétude au-delà des chemins** (le mandat : *grep le mot du domaine dans TOUS les
contrôleurs*) : les clés et types du domaine ne vivent que dans leurs 2 dossiers — `audit_risk_bucket`
/ `effluent_visibility_bucket` / `lifestyle_alarm_bucket` : **5 fichiers** chacun, tous sous
`operational/forensic/` ; `ActorSummary` : **2** ; `IAIntelPurchaseResult` : **2** ; `ActorStatusIndicator` :
**4** — tous sous `operational/internal_affairs/`. **Aucune route de `me/` ou `session/` ne porte cette donnée.**

### 2. Corps réels — provenance

| route | fichier | état |
|---|---|---|
| `GET /v1/me/forensic` | `…/juge-visuel/screen_b7/corps-reels/GET_me_forensic.json` | **appelée**, 200. Provenance : 2026-09-04T10:15:48, `back_main 6ff684db`, compte `operational_demo@example.test`, `X-Request-Id 2901e9b7-33a0-4467-8a39-ab1cb9d56a49`. Corps : `payload.data = {audit_risk_bucket:"watched", effluent_visibility_bucket:"glaring", lifestyle_alarm_bucket:"quiet"}` |
| `GET /v1/me/internal-affairs/actors` | **absent** | non capturé — `_index.json` ne liste qu'**1** route (`appelées:1, sans instance:0, mutations:0, erreurs:0`) ⇒ B **DÉDUIT** |
| `POST …/:ref/intel` | **absent** | mutation, jamais appelée ⇒ B **DÉDUIT** |

Fraîcheur : le dossier atteste 238 corps opposables sur 240 au 2026-09-06, les 2 périmés étant des
`GET_i18n_bundle_locale.json` d'autres dossiers ⇒ **celui-ci est opposable**.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine | contrainte lue à la source |
|---|---|---|
| `audit_risk_bucket` | `clean` `watched` `flagged` `audited` | union TS `forensic.projection.service.ts:79` ; dérivation `:405-420` (seuils = `benfordChi2ThresholdH` × {1,0 / 1,5 / 3,0}) ; **défaut sans donnée = `clean`** (`:413`) |
| `effluent_visibility_bucket` | `clear` `faint` `visible` `glaring` | union TS `:98` ; dérivation `:437-446` (σ = `effluentSigmaInspectorThreshold`, `glaring` ≥ 2,0 σ) ; **défaut = `clear`** (`:442`) |
| `lifestyle_alarm_bucket` | `quiet` `noticed` `watched` `subpoenaed` | union TS `:118` ; dérivation `:467-486` (`standingGapConsecutiveMonths`, enum `tail_ramp_stage` `db/schema/forensic.ts:469`) ; **défaut = `quiet`** (`:485`) |
| `actors[].actorType` | `lawyer` `clerk` | union TS `ia-projection.service.ts:110` — **2 des 5** membres du pgEnum `ia_target_type` (`db/schema/internal_affairs.ts:103-109` : `clerk, port_inspector, lawyer, broker, judge_aide`) ; les 3 autres sont structurellement inatteignables (`ia-target.service.ts:592-598`) |
| `actors[].status` | `steady` `nervous` `unavailable` `gone` | union TS `ia-projection.service.ts:77` ; précédence `:211-225` (`discovered_at` → `gone` ; `investigation_id` → `unavailable` ; `suspicion_level ≥ intelBandCutWatching` → `nervous`) |
| `actors[].actorRef` | uuid opaque | `:109` ; alimenté par `lawyer.lawyer_id` / `recruitmentCandidates.candidate_id` (`:267-271`) |
| `band` | `silent` `watching` `investigating` `revealing` | union TS `ia-intel-purchase.service.ts:82` ; **miroir** du pgEnum `ia_suspicion_band` (`db/schema/internal_affairs.ts:137-142`) ; coupes registry `:240-242` |
| `costCents` | entier (cents) | `:132` ; source `:244` = `intelPurchaseCostCents` ; borne registry **400000..2000000**, défaut **800000** (`ia.tunables.ts:59`, `:155-158`) |
| `purchaseId` | uuid | `:122` |

### 4. Inventaire M (Mxx → ce que ça représente)

Portée : le corps de l'écran (`.dos6`, dans `.panneau`) des cadres **131-136** de
`/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` (lignes 6221, 6224, 6227, 6230, 6233,
6236 ; **143** cadres dans le fichier). CSS : bloc `<style>` `.dos6` à la ligne **6149**.

| id | élément | représente |
|---|---|---|
| M01 | `.enseigne b` « Le dossier » | titre — constant |
| M02 | `.enseigne i` (6 valeurs) | sous-titre d'**état** — dérivé |
| M03-M09 | `.compteurs .fen` × 3 | 7 compteurs distincts selon le cadre (« pistes chaudes /3 », « franchies », « qui tiennent /4 », « acteurs connus », « qui ont peur », « partis », « acteurs ») |
| M10-M13 | `.pi` #0 | piste **audit** : intitulé « la comptabilité » · 4 crans · libellé d'état · clé brute |
| M14-M17 | `.pi` #1 | piste **effluent** : « ce qui sort des cuves » · 4 crans · libellé · clé |
| M18-M21 | `.pi` #2 | piste **lifestyle** : « votre train de vie » · 4 crans · libellé · clé |
| M22 | `.pi.bout` | bordure rouge = le dernier cran est un **événement** |
| M23-M28 | `.ac` × 4 | silhouette (couleur = statut, forme = type) · type · référence courte · libellé de statut · `.ac.parti` (opacité .45 + tirets) · cardinal de la liste |
| M29-M31 | `.pann` (5 occurrences) | copie didactique : sur-titre · titre · corps |
| M32 | `.rien` | état vide « Rien à votre nom. Personne n'a encore eu de raison de vous ouvrir un dossier. » |
| M33-M34 | `.pied` | CTA « ACHETER DU RENSEIGNEMENT » + note « sur un acteur, pas sur une piste » |
| M35-M38 | cadre 136, `.pann` + `.lot` | **L1-L4** — cadre de planification, pas un écran joueur |

Mesure de couverture des valeurs : `mesures/valeurs-dessinees.txt` — **5/12** valeurs de bande
dessinées, colonne par colonne.

### 5. Inventaire F

**Non applicable** — mode maquette. Chaque ligne porte « F : non mesuré (mode maquette) ».

### 6. Non vérifié — et la mesure qui trancherait

1. **B des deux routes d'internal-affairs.** Aucun corps capturé. La mesure : après le gate,
   `python3 Tools/juge-visuel/capturer-corps-reels.py` sur `screen_b7` — ou, à la main,
   `curl -s -H "Authorization: Bearer $TOKEN" http://localhost/v1/me/internal-affairs/actors | python3 -m json.tool`
   sur un compte **ayant au moins un lawyer et un candidat**. Le `POST …/intel` reste une **mutation** :
   son corps ne doit pas être capturé sur un compte partagé.
2. **O1 — l'énoncé daté du contrôleur.** Ce qui trancherait : rejouer
   `npx playwright test tests/e2e/operational/forensic_projection_route.spec.ts` (l'épingle
   d'anti-péremption `:240` et `:280`) **et** lire, sur le compte de démo,
   `SELECT last_chi_square, soft_flag_count FROM ledger_entry_ring WHERE player_id = …` — c'est le seul
   moyen de dire si `"watched"` vient d'un χ² ≥ H ou d'un `soft_flag_count > 0`.
3. **Cardinal réel de la liste d'acteurs.** Non mesurable sans base. Ce qui trancherait :
   `SELECT count(*) FROM lawyers WHERE player_id=…` + `SELECT status, count(*) FROM recruitment_candidates
   WHERE player_id=… GROUP BY status`. Décide si `.acteurs{overflow:hidden}` (E8) est théorique ou visible.
4. **Ensemble de clés des 2 routes déduites.** Aucune spec ne l'épingle (`Object.keys` = 0 dans les deux
   fichiers). Une clé ajoutée demain ne ferait rougir aucune garde. Ce qui trancherait : ajouter l'épingle
   sur le modèle de `parcours/36_42_horizon_forensic.parcours.spec.ts:52-54`.
5. **Le rendu PNG de référence.** `reference-1080x2102.png` n'a **pas** été ouvert : ce juge lit la
   **source** (HTML/CSS), et le PNG relève du `juge-visuel`. Si le rendu diverge du HTML (polices
   substituées, cadre tronqué), cet inventaire M porte sur le HTML, pas sur l'image ratifiée.
6. **La `barre` (topbar) — 7 éléments exclus.** Argent / manomètre « tiède » / « Jour 12 » / « Matin ».
   C'est le shell, servi par `session/open`, hors domaine ㊴ et hors des corps de ce dossier. Ce qui
   trancherait pour « Jour 12 / Matin » : l'ensemble de clés de `session/open` (précédent connu : la
   forme F de W3.U1, `game_minute` absent des clés) — à mesurer dans le dossier du shell, pas ici.
7. **Le compte de démo est-il représentatif ?** `operational_demo` a été fabriqué par
   `mafia-unity-J/Tools/seed_operational_demo.mjs` (1129 lignes), qui emploie **4** appels à des routes
   `_test` (`_test/citysim/advance`, `_test/citysim/raid` — `:234`, `:937`) et un `INSERT INTO safehouses`
   en SQL brut (`:845`). Les injections de blanchiment, elles, passent par la **route joueur**
   (`:860`, `:888` — `POST /v1/operational/laundering/inject`). ⇒ le corps mesuré est un **fait daté** sur ce compte ; je n'ai **pas** prouvé qu'un
   joueur de production atteint les mêmes bandes. Ce qui trancherait : une spec **parcours** sur
   `/v1/me/forensic` avec des actions joueur seules.
8. **Les 3 types réservés pourraient-ils être achetables par un AUTRE chemin ?** Chemins énumérés :
   (a) la route joueur → `resolveOwnedTarget` → `_hasReferentAccess` → `false` ; (b) `POST /v1/_test/ia/buy-intel`
   (`ia-test.controller.ts:1157`) → **le même** service, **la même** garde ; (c) aucun autre appelant —
   `buyApproxBandReveal` compte **2** sites d'appel dans tout `src` (`internal-affairs.controller.ts:94`,
   `ia-test.controller.ts:1157`), le reste des 16 hits étant des commentaires. ⇒ E4 est mesuré sur
   **tous** les chemins connus, sans exécution.
