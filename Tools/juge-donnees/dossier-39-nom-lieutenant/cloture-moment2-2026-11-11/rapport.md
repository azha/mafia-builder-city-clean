# Juge données ⊥ — ㊴ « Le dossier » (les pistes) — CLÔTURE (moment 2) — 2026-11-11

**VERDICT : NON** — deux défauts de couverture non consignés (D1, D2). Le périmètre nommé du tour
(le NOM du lieutenant, les trois `*_label_key`, la bande `lifestyle_alarm_bucket`, l'état
« watched ») est, lui, **tenu de bout en bout et mesuré** : c'est ailleurs que la couverture rompt.

- **X-Server-Build AVANT** : `8d0184a4` (`mesures/00-build-avant.txt`)
- **X-Server-Build APRÈS** : `8d0184a4` (`mesures/14-build-apres.txt`) — aucun redémarrage, aucune
  reconstruction, aucune migration. Pile intacte.
- **Comptes** : `|clés B| = 14` + `|M non appariés| = 9` + `|F sans source| = 1` = **24 lignes**.
  Recomptés par `mesures/controle-arithmetique.py` : positif **rc=0**, négatif **rc=1**
  (`mesures/13-controle-arithmetique.txt`).

> ⚠️ **Le back lu n'est PAS `main`.** `main` du back est à `6040a213` et son module forensic **diffère**
> de la pile : `git diff --stat 8d0184a4..6040a213 -- …/operational/forensic …/db/schema/forensic.ts`
> rend 7 fichiers, dont `forensic-bandes-i18n.ts` **absent de `main`** (les trois `*_label_key` n'y
> existent pas). **Tout B de ce rapport est lu à `8d0184a4`**, le SHA que la pile sert, via
> `git show 8d0184a4:<chemin>`. Lire `main` aurait rendu une projection à 4 clés et fait conclure
> « 3 clés servies sans source ».

---

## En une phrase

L'écran montre **10 informations sur les 14 que le back sert** pour ses trois routes (2 reçues puis
jetées — la piste comptable éteinte ; 2 jamais désérialisées) ; **2 défauts** (un prix servi dont
l'écran affirme au joueur qu'il « n'est pas servi » ; un mot de cran ratifié que la clé servie
écrase par un doublon) ; **3 questions « passé à côté ? »** ; 1 repli sans cadre.

---

## Défauts

| # | information | B | M | F | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|---|
| **D1** | `intelCostCents` — le PRIX d'un renseignement (800 000 c = 8 000 €) | ● | – | – | **DÉFAUT** : la clé est servie **avant** l'achat, et l'écran AFFIRME au joueur le contraire | **B mesuré** : `mesures/04-acteurs-quiet.txt` → `"intelCostCents": 800000` sur `GET /v1/me/internal-affairs/actors`, compte jetable frais, build `8d0184a4`. **Source** : `internal-affairs.controller.ts:63,66` @8d0184a4 — `Promise<{ actors: ActorSummary[]; intelCostCents: number }>` … `return { actors, intelCostCents: this.intelPurchase.intelCostCents() }`. **F affiche la phrase contraire** : `ForensicScreenController.cs:258` `Riche("sur un acteur, pas sur une piste — éteint : {le prix n’est pas servi}")` et `:257` (vue acteurs) ; **vu sur la planche servie** : `captures/E13_Dossier_watched_fr_1080x2400.png` « sur un acteur, pas sur une piste — éteint : **le prix n'est pas servi** » ; EN : `…_watched_en_…png` « on a player, not on a trail — off: **the price isn't known** ». **M dessine la même phrase** : cadre 152 `<div class="note6">… éteint : <u>le prix n’est pas servi</u></div>`, cadre 151 « éteint tant que <u>le prix n'est pas servi</u> : on n'achète pas sans savoir combien ». **Le DTO ne déclare pas le champ** (`ForensicDtos.cs:45` `GetActeursResponseDto { public ActeurDto[] actors; }`) et `grep -oE '\.intelCostCents\b'` sur les deux fichiers de l'écran rend **0** (`mesures/11-F-usages-champs.txt`). |
| **D2** | le MOT de la piste « ce qui sort des cuves » au cran `visible` | ● | ● | ● (faux) | **DÉFAUT** : à `visible`, le mot **et** la ligne sous le mot rendent la MÊME chaîne « Ça se remarque » ; le mot ratifié du cran (« ça se voit ») n'est jamais affiché | **B (source qui contraint)** : `forensic-bandes-i18n.ts:35` @8d0184a4 — `visible: 'forensic.gravite.ca_se_remarque'` dans un `Readonly<Record<EffluentVisibilityBucket,string>>` gelé et total. **F — le mot** : `ForensicScreenController.cs:1205` `MotDeLaPiste` préfère la clé SERVIE dès que le catalogue la connaît. **F — la ligne sous le mot** : `:1194-1195` `CleDeLaPiste` rend `Libelle.De("forensic","gravite","Ça se remarque")` pour exactement cette piste à exactement cette bande. **Catalogue mesuré** : `GET /v1/i18n/bundle?locale=fr` → `forensic.gravite.ca_se_remarque = "Ça se remarque"` ; `locale=en` → `"It's getting noticed"` (2 172 clés par bundle). Les deux chemins rendent donc la même chaîne, **servie ou en repli** — et sur une planche EN, soit le même doublon (« It's getting noticed » deux fois) soit, si le slug de `Libelle.De` ne retombait pas sur cette clé, le **littéral français** « Ça se remarque » sous un mot anglais : les deux issues sont fautives. **M dessine DEUX textes différents** : cadre 152 `<b style="color:#ff9e3d">ça se voit</b><span class="cle">Ça se remarque</span>`. Le mot ratifié existe et est servi : `forensic.cran.ca_se_voit` = « ça se voit » / « it shows » (mesuré au bundle), et `Phrase("visible")` le rend encore (`:1231`) — mais la clé servie passe avant. |

**Pourquoi D2 est invisible sur les planches** : les trois comptes des captures ont un effluent
`clear` (`captures/journal.tsv`, et `mesures/03-forensic-quiet.txt` → `effluent_visibility_bucket:
"clear"`). La ligne `.cle` n'apparaît qu'à `visible` : **aucune des 12 planches ne peut montrer ce
cas**. C'est exactement l'écart que le dossier demandait de vérifier « dans F (résolveur
`CleDeLaPiste`) et au back » — fait : les deux côtés se contredisent.

---

## Écarts à consigner (sourcés, non comptés comme défauts)

| # | écart | source |
|---|---|---|
| E1 | **La même maquette épinglée dessine la piste « la comptabilité » dans deux états** : cadre 150 l'éteint (« — » + « pas encore sur la table »), cadre 152 la rend vivante (« rien à signaler », cran vert). F suit **150**, et pour une raison mesurée : `DossierCalculs.PistesConstantes = { "audit_risk_bucket" }` (`ForensicScreenController.cs:890`) parce que `ledger_entry_ring` n'a aucun écrivain de production (TD-358). **Mesuré** : la table du joueur jetable compte 0 ligne (`ledger_entry_ring=0`, `mesures/15-B-moins.txt`). L'user tranche quel cadre fait foi. |
| E2 | **dénominateur « /2 » côté F, « /3 » côté M** — dette TD-883 **déclarée ouverte** par le dossier. Vérifié : `PistesVivantes()` (`:923-928`) rend 2 (audit éteinte), et la planche affiche « 01**/2** PISTES CHAUDES » (`captures/E13_Dossier_watched_fr_1080x2400.png`) contre « 02**/3** » au cadre 152. |
| E3 | **chrome du shell en français sur les planches EN** (ARGENT / CHALEUR) — déclaré hors ㊴. Vérifié sur `…_watched_en_…png` : « ARGENT 10 000 € », « CHALEUR », mais « Cold » et « Dawn » traduits. |
| E4 | **la piste train de vie n'est plus tenue pour constante côté client** — *à vérifier* disait le dossier. **Vérifié et tenu** : `PistesConstantes` ne contient plus que `audit_risk_bucket` (`:890`), donc `TitreAffiche` (qui exige `piste.Vivante`, `:733`) pose le nom servi. Planche FR : « LE TRAIN DE VIE DE **LT. RIN** » ; planche EN : « **LT. RIN'S** LIFESTYLE ». |
| E5 | **cadres 152/153 n'ont que DEUX fenêtres de compteur**, F en rend trois (« franchies » au milieu). Le cadre 150, le 131 et le 135 en dessinent bien trois : F a une source dans la même maquette. |
| E6 | **repli de bande divergent entre back et front sur la piste comptable** : le back apparie `flagged → forensic.cran.des_traces` (`forensic-bandes-i18n.ts:28`) quand `Phrase("flagged")` rend « Un dossier est ouvert » (`:1224`, clé `forensic.cran.un_dossier_est_ouvert`, que le back réserve à `audited`). Sans effet aujourd'hui : la clé servie passe avant, et la piste est éteinte. À rouvrir le jour où TD-358 ferme. |

---

## « Passé à côté ? » — pour l'user

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| 1 | `intelCostCents` (`GET /v1/me/internal-affairs/actors`) | combien coûte un renseignement sur un acteur : **8 000 €** sur la pile | **utile ici, et tout de suite** : c'est la seule chose qui manquait pour allumer le CTA. L'écran porte déjà le geste, la route d'achat existe et est scopée au propriétaire (`buyIntel` → `resolveOwnedTarget`, 404 avant tout débit) ; il ne manquait que le prix — qui est servi. Tant qu'on ne l'affiche pas, l'écran **ment** au joueur (D1) | ★★★ |
| 2 | `lieutenant.name_locale` (colonne, non projetée) | dans quelle langue le nom du lieutenant a été tiré | **pas ici** : sur la planche EN, « Lt. Rin » reste « Lt. Rin » et ça se lit très bien. À garder pour le jour où un nom serait localisable | ★ |
| 3 | `activeCases` (`GET /v1/me/legal`) | les affaires judiciaires en cours du joueur | **pas ici** : c'est l'écran du juridique. ㊴ n'appelle cette route que pour nommer les avocats du roster | ★ |

*(Mesuré à vide sur compte frais : `activeCases: []`, `lawyerRoster: []` — `mesures/05-legal-quiet.txt`.)*

---

## Lots back suggérés (B⁻ dessiné, forme F)

**Aucun.** Le précédent connu — `lieutenant.name` en base, jamais projeté — est **FERMÉ par ce lot** :
`lifestyle_lieutenant_name` sort désormais le nom (`mesures/06-…`, `07-…`, `09-forensic-…txt`).

Les colonnes restées non projetées des trois tables du domaine (`mesures/15-B-moins.txt`) sont les
scalaires internes du mur P5 — `last_chi_square`, `soft_flag_count`, `ring`, `ring_head`,
`last_audit_tick`, `front_dark_until_tick`, `last_deviation`, `baseline_effluent`,
`effluent_window`, `last_scan_tick`, `district_id`, `last_gap`, `consecutive_flag_months`,
`tail_ramp_stage`, `tail_started_tick`, `last_month_id`, `declared_cut_cents`,
`visible_standard_index` — et **aucune n'est dessinée** dans un cadre ㊴ : pas de forme F.

---

## Actions : routes ↔ CTA

| route / geste | côté back | côté maquette | côté front | verdict |
|---|---|---|---|---|
| `POST /v1/me/internal-affairs/actors/:ref/intel` | existe, `@UseGuards(JwtAuthGuard)`, **ownership résolue AVANT tout débit** (`internal-affairs.controller.ts:76-95` : « 404 before any debit if `playerId` does not own `:ref` ») | CTA `.cta6.eteint` « ACHETER DU RENSEIGNEMENT » (cadre 152) + `.rg` « renseignement » par ligne (cadre 151) — **dessinés éteints** | `boutonAcheter` éteint (`:676-688`), `.rg` éteint non cliquable (`:359-370`), **aucune requête** (`RequetesEmises` ne bouge pas) | **route sans CTA actif** — la raison affichée (« le prix n'est pas servi ») est **fausse** sur la pile ⇒ **D1** |
| la porte (bascule pistes ↔ acteurs) | — | `.fen.porte` avec « › » / « ‹ » (cadres 150/151/152) | `Basculer()` (`:142-147`), **locale, aucune requête** | ✔ geste sans route, assumé et dessiné |
| `GET /v1/me/forensic` | 1 route joueur, le seul `@Get` du contrôleur forensic sous `JwtAuthGuard` (`forensic.controller.ts:55-56`) | — | `ForensicClient.GetForensic` (`:28-47`) | ✔ |
| `GET /v1/me/internal-affairs/actors` | `:61-62` | — | `GetActeurs` (`:51-68`) | ✔ |
| `GET /v1/me/legal` | `legal.controller.ts:89-90` | — | `GetNomsAvocats` (`:73-90`), appelée **seulement s'il y a un avocat au roster** (`:110`) | ✔ |
| les 5 autres routes `@Post`/`@Put` de `legal` | existent (`:102, :134, :161, :189, :209`) | aucun CTA ㊴ | aucun appel | hors écran — noté, pas une ligne de défaut |
| `@Post` joueur du module forensic | **aucun** (seul `@Get me/forensic` ; `forensic-admin.controller.ts` est `@Controller('admin')` + `requireStaffRole`, `forensic-test.controller.ts` est `_test`) | — | — | ✔ |

---

## Table de couverture complète

Comptes : **|B| = 14**, **|M non apparié| = 9**, **|F sans source| = 1**, **somme = 24 = lignes**
(`mesures/controle-arithmetique.py`, positif rc=0 / négatif rc=1).

### Lignes de clé B (14)

| # | information | B | M | F | statut |
|---|---|---|---|---|---|
| L01 | `audit_risk_bucket` — niveau (crans) de « la comptabilité » | ● | ● (150 éteinte / 152 vivante) | ● éteinte | ✔ contre 150 — **E1** |
| L02 | `effluent_visibility_bucket` — niveau de « ce qui sort des cuves » | ● | ● | ● | ✔ — mesuré `clear` → 1 cran vert sur la planche |
| L03 | `lifestyle_alarm_bucket` — niveau de « le train de vie » | ● | ● | ● | ✔ — **4/4 valeurs mesurées** (`quiet`, `noticed`, `watched`, `subpoenaed`) |
| L04 | `lifestyle_lieutenant_name` — le NOM dans le titre de la piste | ● | ● (152 nommée / 153 null) | ● | ✔ — **le cœur du tour, tenu** |
| L05 | `audit_risk_label_key` — le mot de « la comptabilité » | ● | ● | – (piste éteinte : « — ») | ✔ contre 150 — **E1** |
| L06 | `effluent_visibility_label_key` — le mot de « ce qui sort des cuves » | ● | ● | ● (faux à `visible`) | **DÉFAUT D2** |
| L07 | `lifestyle_alarm_label_key` — le mot de « le train de vie » | ● | ● | ● | ✔ — « On vous regarde » / « You're being watched » sur la planche |
| L08 | `actors[]` — le roster et son cardinal | ● | ● (151) | ● | ✔ (mesuré vide : `actors: []`) |
| L09 | `actors[].actorRef` — la référence sous le type | ● | ● (« ia.actor.4f21 ») | ● | ✔ — règle des 4 premiers caractères **PROPOSÉE** (`:1019-1026`), la maquette ne la dit pas |
| L10 | `actors[].actorType` — « Avocat » / « Greffier » | ● | ● | ● | ✔ (`forensic.acteur.lawyer` servi FR/EN) |
| L11 | `actors[].status` — mot, encre, silhouette, opacité du « parti » | ● | ● | ● | ✔ (`forensic.statut.steady` servi FR/EN) |
| L12 | `intelCostCents` — le PRIX d'un renseignement | ● | – | – | **DÉFAUT D1** (et question n°1) |
| L13 | `activeCases` — les affaires en cours | ● | – | – | « PASSÉ À CÔTÉ ? » n°3 |
| L14 | `lawyerRoster` → le NOM de l'avocat | ● | – (151 dessine la référence) | ● | affichée sans être dessinée — **tour Q1 antérieur, non rouvert ici** |

### Éléments M non appariés (9)

| # | élément | M | F | statut |
|---|---|---|---|---|
| N1 | dénominateur « /3 » du compteur « pistes chaudes » (**codé en dur** dans la maquette) | ● | ● « /2 » | écart **E2** consigné (TD-883) |
| N2 | « Ça se remarque » sous la piste des cuves | ● | ● | **DÉFAUT D2** (doublon avec le mot) |
| N3 | « pistes chaudes » — numérateur dérivé des bandes | ● | ● | ✔ (`PistesChaudes`, `:931-936`) |
| N4 | « franchies » — pistes au dernier cran | ● (150/131/135) | ● | ✔ — **E5** (absent de 152/153) |
| N5 | « acteurs qui tiennent » / « connus » | ● | ● | ✔ (`ActeursQuiTiennent`, `:946`) |
| N6 | « qui ont peur » (vue acteurs) | ● | ● | ✔ (`ActeursQuiOntPeur`, `:947`) |
| N7 | geste « renseignement » par ligne d'acteur, **éteint** | ● | ● éteint | ✔ dessiné éteint — la raison affichée relève de **D1** |
| N8 | CTA « ACHETER DU RENSEIGNEMENT », **éteint** | ● | ● éteint | ✔ dessiné éteint — idem **D1** |
| N9 | l'état « Rien à votre nom » (vue Vide) | ● (135) | ● | ✔ — `EtatVide` (`:958-963`), **vu sur les planches `quiet`** |

### Rendus F sans source (1)

| # | rendu | preuve | statut |
|---|---|---|---|
| F1 | le panneau de repli « **Pas de réponse** / on n'a pas eu de réponse. Ce n'est pas "tout va bien" : c'est "on ne sait pas" » sur échec réseau | `ForensicScreenController.cs:242-243`. **Mesuré** : « Pas de réponse » apparaît **0 fois** dans la maquette ; le patron « on ne sait pas » y est dessiné **3 fois**, mais aux cadres **50, 51, 64** — jamais dans un cadre ㊴ | **ASSUMÉ** : repli nommé, patron ㊲, dessiné ailleurs dans la MÊME maquette. À ratifier pour ㊴, pas un défaut |

---

## Annexes

### 1. Routes du domaine (compte, ancres)

**Balayage** (`git grep -lE 'forensic|lifestyle|effluent' 8d0184a4 -- '…/*.controller.ts'`) : **5
fichiers**, dont 3 exclus (`combat-test`, `maintenance-test`, `forensic-test` : `_test`) et 1 exclu
BO/staff (`forensic-admin.controller.ts` → `@Controller('admin')` + `requireStaffRole('gm'|'admin')`).
Reste **1** contrôleur joueur du domaine forensic.

**Côté client** (ce que le contrôleur d'écran appelle, `ForensicClient.cs:12-15` et les URL
construites) : `GET /v1/me/forensic` (`:31`), `GET /v1/me/internal-affairs/actors` (`:53`),
`GET /v1/me/legal` (`:75`). **Les deux listes se recouvrent** : le mot « forensic » seul ne trouvait
pas les deux autres routes — c'est le départ par le client qui les a données.

| route joueur | ancre @8d0184a4 | garde | exercée |
|---|---|---|---|
| `GET /v1/me/forensic` | `forensic.controller.ts:55-56` | `JwtAuthGuard` | oui, 6 corps |
| `GET /v1/me/internal-affairs/actors` | `internal-affairs.controller.ts:61-62` | `JwtAuthGuard` | oui, vide |
| `POST /v1/me/internal-affairs/actors/:ref/intel` | `:76-78` | `JwtAuthGuard` + ownership | **non** (aucun geste de l'écran ne l'appelle) |
| `GET /v1/me/legal` | `legal.controller.ts:89-90` | `JwtAuthGuard` | oui, vide |

### 2. Corps réels — `mesures/` + commandes

Compte **jetable frais** `jd4-1794423905` (`POST /v1/auth/signup` avec `Idempotency-Key`, jeton à
`payload.data.access_token`, puis `POST /v1/session/open`). **Jetons et mots de passe masqués**
(`Bearer ***`). Aucun compte existant touché. Un second jetable `jd4b-…` pour le contrôle M2.

| fichier | ce qu'il contient |
|---|---|
| `00-build-avant.txt` / `14-build-apres.txt` | `X-Server-Build: 8d0184a4` avant et après |
| `01-signup.txt`, `02-session-open.txt` | création du jetable (secrets masqués) |
| `03-forensic-quiet.txt` | état NATUREL : `clean` / `clear` / `quiet`, nom `null`, 3 clés |
| `04-acteurs-quiet.txt` | `actors: []` **et `intelCostCents: 800000`** ← D1 |
| `05-legal-quiet.txt` | `activeCases: []`, `lawyerRoster: []` |
| `06-forensic-noticed.txt` | SQL borné + corps : `noticed`, `"Lt. Marrek"`, `forensic.cran.remarque` |
| `07-forensic-watched.txt` | `watched`, `"Lt. Marrek"`, `forensic.gravite.on_vous_regarde` |
| `08-forensic-watched-egalite.txt` | **contrôle négatif option B** : les DEUX lignes aux trois maxima ⇒ nom `null`, **bande inchangée** (`watched`) |
| `09-forensic-subpoenaed.txt` | `subpoenaed`, `forensic.evenement.convocation_recue` |
| `12-forensic-lt-etranger.txt` | tentative de poser un lieutenant étranger (voir annexe 6) |
| `13-controle-arithmetique.txt` | positif rc=0 / négatif rc=1 |
| `15-B-moins.txt` | colonnes non projetées, PK, FK et déclencheur de `lifestyle_audit_state` |
| `16-inventaire-M-cadres.txt` | les 6 cadres ㊴ de la maquette épinglée, bruts |

**Dimensionnement des corps vides** : sur compte frais, `ledger_entry_ring = 0` et
`block_effluent_register = 0` lignes (`15-B-moins.txt`) — d'où `clean` et `clear`, qui sont les
défauts sûrs de la projection, pas un trou. `lifestyle_audit_state = 2` lignes dès l'ouverture de
session (une par lieutenant recruté : **Lt. Marrek**, **Lt. Dorne**) — c'est ce qui rend les
quatre bandes du train de vie atteignables par `UPDATE` borné.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | type projeté | valeurs possibles | contrainte source | mesurées sur la pile |
|---|---|---|---|---|
| `audit_risk_bucket` | bande (domaine clos) | `clean` · `watched` · `flagged` · `audited` | union TS `forensic.projection.service.ts:84` @8d0184a4 | 1/4 (`clean`) |
| `effluent_visibility_bucket` | bande | `clear` · `faint` · `visible` · `glaring` | union TS `:103` | 1/4 (`clear`) |
| `lifestyle_alarm_bucket` | bande | `quiet` · `noticed` · `watched` · `subpoenaed` | union TS `:123` | **4/4** |
| `lifestyle_lieutenant_name` | nom (`string \| null`) | le `lieutenant.name` servi tel que stocké, ou `null` | `forensic-lifestyle-lieutenant.ts:75-93` — `null` si bande `quiet`, aucune ligne, **maxima croisés ou partagés**, lieutenant d'un autre joueur, nom absent, ou nom = `PLACEHOLDER_NOM_LIEUTENANT` (`'Lieutenant'`, `lieutenant-name-pool.ts:27`) | nom servi 3×, `null` 2× (dont le contrôle d'égalité) |
| `audit_risk_label_key` | clé i18n | 4 valeurs | `Record` gelé et total `forensic-bandes-i18n.ts:25-30` | `forensic.cran.rien_a_signaler` |
| `effluent_visibility_label_key` | clé i18n | 4 valeurs | `:32-37` | `forensic.cran.invisible` |
| `lifestyle_alarm_label_key` | clé i18n | 4 valeurs | `:39-44` | **4/4** |
| `actors[].actorType` | enum | `lawyer` · `clerk` | `ia-projection.service.ts:120` | 0 (roster vide) |
| `actors[].status` | enum | `steady` · `nervous` · `unavailable` · `gone` | `ia-projection.service.ts:77` | 0 (roster vide) |
| `intelCostCents` | **scalaire** | entier de centimes | `ia-intel-purchase.service.ts:334` → `tunables.intelPurchaseCostCents` | `800000` |

**R2.2 — une clé qui déroge à la bande** : `intelCostCents` est un **scalaire nu** (pas une bande).
Il n'est pas un scalaire de *simulation* (c'est un prix affichable), mais il est le seul de la
surface de cet écran à ne pas être banded — à noter pour la ratification.

**Appariement bande → clé, mesuré 6 fois sur 12** : les six entrées du `Record` que la pile a eu
l'occasion de servir (`audit.clean`, `effluent.clear`, `lifestyle.quiet/noticed/watched/subpoenaed`)
sont **identiques à l'octet** à la table du source. C'est ce qui autorise à lire la 7ᵉ
(`effluent.visible`) au source pour D2, et c'est aussi la limite honnête de D2 (annexe 6).

### 4. Inventaire M (cadre → ce que ça représente)

Maquette `atelier3d-mafia-c2 @b2ceebeb6ca672f1a367d5e135ddfcc17fbc92d1`, `ecrans-brennar-6.html`,
extraite dans `mesures/10-maquette-ecrans-brennar-6.html` (md5 `1616373bf3ca9b32c91df4fdc2704593`).

**Compte de cadres MESURÉ : 154**, pas ~159. Le 159 du dossier est le nombre d'occurrences de
`class="cadre`, dont **5 sont des `class="cadre-b"`** — un sous-élément SVG, pas un cadre. Les index
0-based du dossier (131, 150-153) sont **confirmés par libellé**.

| cadre | libellé | ce qu'il apporte |
|---|---|---|
| 131 | « Le dossier — trois pistes qui ne se mélangent pas » | **source** : porte encore la bande BRUTE en `.cle` (`watched`, `visible`, `quiet`) — l'état que le lot a corrigé |
| 135 | « Rien à votre nom » | la vue **Vide** : 3 fenêtres, « 00/3 pistes chaudes » |
| 150 | ㊴ · les pistes — deux pistes éteintes (PROPOSÉ) | l'état **éteint** (« — » + « pas encore sur la table ») ; porte encore `.cle` = `visible` (bande brute) sous les cuves |
| 151 | ㊴ · les acteurs | la liste : silhouette, type, référence, statut, `.rg` éteint, `.ac.parti{opacity:.45}` |
| **152** | ㊴ · les pistes — « le train de vie de **Lt. Marrek** » | **l'état cible Q5** : titre nommé, bande « On vous regarde », `.cle` = « Ça se remarque » sous les cuves |
| **153** | ㊴ · les pistes — le nom n'est PAS servi (null) | même piste, même bande, **titre sans nom** (« le train de vie d'un lieutenant ») |

### 5. Inventaire F (champ → sites → classe)

Front lu à `c35c325068f636c986590965d371bfa38e57ec8f` (`git show c35c3250:<chemin>`).
Comptes bruts : `mesures/11-F-usages-champs.txt`
(`grep -oE '\.<champ>\b'` sur `ForensicScreenController.cs` + `ForensicClient.cs`).

| champ | usages | sites | classe |
|---|---|---|---|
| `audit_risk_bucket` | 1 | `:908` (`BandeDe`) | **reçu, puis JETÉ** pour l'affichage (piste éteinte, `:269-283`) ; ni `PistesChaudes` ni `PistesFranchies` ni `EtatVide` ne le comptent (tous filtrent `p.Vivante`) |
| `effluent_visibility_bucket` | 1 | `:909` | **RENDU** (crans `:278`, mot `:286`, ligne `.cle` `:287`) |
| `lifestyle_alarm_bucket` | 1 | `:910` | **RENDU** + **LOGIQUE** (`CranDe > 0` conditionne le titre nommé, `:734`) |
| `lifestyle_lieutenant_name` | 1 | `:732` | **RENDU** — gabarit `forensic.bloc.le_train_de_vie_de_nom` (`:736-737`), **phrase entière à trou** : FR « le train de vie de {nom} », EN « {nom}'s lifestyle » (mesuré au bundle). Jamais une concaténation |
| `audit_risk_label_key` | 3 | `:1204` | **jamais atteint** (piste éteinte) |
| `effluent_visibility_label_key` | 3 | `:1205` | **RENDU** — et c'est D2 |
| `lifestyle_alarm_label_key` | 3 | `:1206` | **RENDU** |
| `actorRef` | 3 | `:1033, :1034, :1036` | **RENDU** (via `RefAffichee`) + **LOGIQUE** (clé du dictionnaire des noms) |
| `actorType` | 3 | `:343, :1033, :1058` | **RENDU** + **LOGIQUE** (déclenche `GET /v1/me/legal`) |
| `status` | 5 | `:312, :326, :329, :351, :952` | **RENDU** (mot, encre, silhouette, opacité) + **LOGIQUE** (compteurs) |
| `intelCostCents` | **0** | — | **non déclaré au DTO** ⇒ D1 |

**Aucun champ déclaré n'est jamais lu** : les 10 champs des DTO ont au moins un site.

**Affiché sans venir d'un champ** (littéraux / dérivés, `fichier:ligne`) : titre « Le dossier »
(`:459`) · sous-titres (`:168, :171, :172`) · libellés des compteurs (`:188-201`) · titres des pistes
(`:896-898`) · « pas encore sur la table » (`:282`) · « — » du trou (`:521-523`, délibéré : « un 0
dirait mesuré à zéro ») · note des pistes (`:571-572`) · les trois panneaux (`:230-247`) · texte de la
vue Vide (`:587-588`) · libellé du CTA (`:685`) · les deux notes du pied (`:256-258`) · « renseignement »
(`:367`) · « ia.actor. » (`:1025`). **Tous passent par un résolveur nommé** `Libelle.De("forensic",
"bloc"|"enseigne"|…, littéral)` avec repli sur le littéral.

**Résolveurs de chaînes lus** (temps 4) : `Phrase` (`:1214-1241`) couvre les **12 entrées** des trois
domaines clos (11 chaînes distinctes — `watched` appartient à deux échelles), **toutes présentes**,
plus **4** alias hors domaine (`dormant`, `elevated`, `critical`, `exposed`) ; 7 par le premier
`switch` (`flagged`, `audited`, `glaring`, `clear`, `faint`, `visible`, `subpoenaed`), les 4
restantes (`clean`, `quiet`, `watched`, `noticed`) par la phrase de leur gravité ;
`RepliDuStatut` (`:976-986`) couvre les **4** valeurs de
`ActorStatusIndicator` ; `RepliDuType` (`:1009-1017`) couvre les **2** de `actorType`. **Aucune valeur
d'enum du back n'est absente d'un résolveur.** Un mot inconnu s'affiche tel quel, jamais rabattu
(`:1239`, `:984`, `:1015`).

### 6. Ce que je n'ai PAS pu vérifier

1. **`effluent_visibility_bucket` ailleurs que `clear`** — donc le corps réel de
   `effluent_visibility_label_key` à `visible`, qui est le **seul maillon non mesuré de D2**.
   `block_effluent_register` a 0 ligne sur compte frais et la licence du dossier porte sur un
   `UPDATE` borné, pas sur un `INSERT`. **La mesure qui trancherait** : insérer une ligne
   `block_effluent_register` pour le jetable avec `last_deviation ≥ 1.5` (σ,
   `effluentSigmaInspectorThreshold`), puis relire `GET /v1/me/forensic` — attendu
   `"effluent_visibility_bucket":"visible"`, `"effluent_visibility_label_key":"forensic.gravite.ca_se_remarque"`.
   **Ce qui tient quand même** : les deux chemins de F (`MotDeLaPiste` et `CleDeLaPiste`) rendent la
   même chaîne que la clé soit servie **ou** en repli — D2 ne dépend donc pas de ce corps pour la
   partie « doublon », seulement pour la partie « c'est bien cette clé que le back sert ».
2. **`audit_risk_bucket` ailleurs que `clean`** — `ledger_entry_ring` a 0 ligne et aucun écrivain de
   production (TD-358). Sans effet sur ce tour : la piste est éteinte côté F.
3. **Le lieutenant d'un AUTRE joueur (branche M2 de `nomLieutenantTrainDeVie`)** — **tentée et
   mesurée impossible** : la PK de `lifestyle_audit_state` porte sur `lieutenant_id` **seul**, donc
   le lieutenant d'un second jetable a déjà sa ligne (`ERROR: duplicate key value violates unique
   constraint "lifestyle_audit_state_pkey"`), **et** un déclencheur
   `lifestyle_audit_state_ownership_immutable BEFORE UPDATE … forbid_ownership_reassignment()`
   interdit la réassignation (`mesures/15-B-moins.txt`). Conclusion positive : **le nom ne peut pas
   fuir d'un joueur à l'autre par ce chemin** — trois gardes (jointure scopée au `playerId`,
   re-vérification dans `nomLieutenantTrainDeVie:90`, déclencheur en base). La branche de code
   reste non exercée sur la pile ; seul un test unitaire la couvre.
4. **L'atteinte RÉELLE de `noticed`/`watched`/`subpoenaed`** — le tick `standing-gap-heat` n'a pas
   été exercé ; les trois états viennent d'un `UPDATE` SQL borné à mon jetable (SQL collé dans
   chaque mesure). Ce qui est prouvé : la projection et l'écran réagissent à l'état de la table.
   Ce qui ne l'est pas : qu'un chemin JOUEUR y mène.
5. **Le nom = `PLACEHOLDER_NOM_LIEUTENANT`** (`'Lieutenant'`) — non reproduit : les deux lieutenants
   du jetable portent des noms tirés (`Lt. Marrek`, `Lt. Dorne`). La mesure qui trancherait :
   `UPDATE lieutenant SET name='Lieutenant' WHERE lieutenant_id=<le mien>`, puis relire — attendu
   `lifestyle_lieutenant_name: null`.
6. **La vue Acteurs avec un roster non vide** — `actors: []` **et** `lawyerRoster: []` sur tout compte
   frais, donc L09-L11, L14 et N5-N7 sont lus au source et aux cadres, **pas vus rendus**. Aucune des 12 planches ne la montre
   non plus (les 3 comptes ont un roster vide ⇒ `quiet` tombe même en vue **Vide**). La mesure qui
   trancherait : un seed d'acteurs IA, puis une planche de la vue Acteurs.
7. **La pile porte désormais mes 2 comptes jetables** (`jd4-1794423905`, `jd4b-…`) avec des lignes
   `lifestyle_audit_state` modifiées. Build, schéma et comptes existants : **intacts**.

---

*Juge ⊥ à contexte vierge. Je n'ai lu ni les notes d'implémentation, ni aucun rapport ou mesure de
juge précédent (les chemins interdits par le dossier n'ont pas été ouverts). Tout ce que j'affirme
ci-dessus, je l'ai soit mesuré sur la pile `8d0184a4` avec la commande et la sortie collées dans
`mesures/`, soit lu dans un fichier à son SHA épinglé avec la ligne citée — sauf les sept points de
l'annexe 6, nommés comme non vérifiés.*
