# Juge données ⊥ — ㊴ Le dossier, piste « train de vie » (cadres 152 / 153) — mode MAQUETTE — 2026-11-11

Juge NEUF, contexte vierge. Ni la maquette ni l'écran ne sont de moi. Aucun rapport de juge
précédent ni note d'implémentation n'a été ouvert (un fichier
`docs/superpowers/specs/2026-10-09-q5-forensic-lieutenant-implementation-notes.md` existe au back :
il est apparu dans une sortie de `git grep` par son chemin, il n'a **pas** été lu).

## Ancrage et contraintes de mesure

| côté | épingle | contrôle |
|---|---|---|
| **B** (back) | `gate/cumul-2026-10-10` **@ 7807d6c8** (dépôt `~/project/mafia-clean-city`), lu par `git show`/`git grep` **sans checkout, sans écriture** | ⚠️ la branche a avancé : son sommet est **`0cfa6a7d`**, 3 commits plus loin. `git diff --stat 7807d6c8 gate/cumul-2026-10-10` sur `operational/forensic/`, `operational/internal_affairs/`, `i18n/`, `db/schema/forensic.ts`, `db/schema/lieutenant.ts` est **VIDE** ⇒ le B de ce rapport vaut aussi pour le sommet (`mesures/01-ancrage-sha.txt`) |
| **M** (maquette) | `ecrans-brennar-6.html` @ `9fa533b5` — cadres **152** et **153** | le SHA relayé en cours de tour (`8b79f946`) donne le **même blob** `8faa8018…`, 2 650 936 octets, pour ce fichier : vérifié, pas déduit (`mesures/01-ancrage-sha.txt`) |
| **F** | sans objet (moment 1) | |

**Aucune pile montée** (ruling f2 du 11/11 : la pile de dev tourne `main`) : **toute la colonne B est
DÉDUITE du source**, chaque ligne porte `fichier:ligne`. Aucun corps de réponse réel n'a été obtenu —
c'est le travail du moment 2. Aucun Unity, aucune porte, aucun docker n'a été touché.

## En une phrase

Les cadres 152/153 montrent **9 informations** sur les **8 clés** que les deux routes de lecture du
domaine servent ; la clé `lifestyle_lieutenant_name` est servie **exactement** comme la maquette la
dessine (nom seul, `string | null`, bande inchangée) — mais **aucun parcours joueur ne produit
l'état dessiné** (ni le nom, ni même la bande `watched`), et **5 textes ou comptes dessinés n'ont
aucune source servie**. 1 constat A, 5 constats B, 6 constats C.

## Réponse à la question centrale

| question | réponse MESURÉE | preuve |
|---|---|---|
| quelle clé ? | `lifestyle_lieutenant_name`, 4ᵉ clé de `GET /v1/me/forensic` (la route rend la projection verbatim) | `forensic.projection.service.ts:160`, `forensic.controller.ts:55-60` |
| quel type ? | `string | null` — le **nom tel que stocké** (forme « Lt. Nom »), jamais un id, jamais un scalaire | `forensic.projection.service.ts:154-160` ; mur P5 listé `:373-382` |
| nullable quand ? | **5 causes closes** : bande `quiet` · aucune ligne · `auMaximum.length !== 1` (0 ou ≥2 lignes aux trois maxima) · lieutenant d'un autre joueur · nom absent **ou** égal à `PLACEHOLDER_NOM_LIEUTENANT` (`'Lieutenant'`) | `forensic-lifestyle-lieutenant.ts:80-92` ; placeholder `lieutenant-name-pool.ts:27` |
| règle de choix quand plusieurs lignes ? | **option B** : les trois maxima (stage, consecutive, gap) sont calculés **indépendamment** (`maximaTrainDeVie:52-63`), puis on garde les lignes qui atteignent **les trois à la fois** ; **une seule** ⇒ son nom, sinon `null`. Une ligne incohérente **compte comme concurrente** (elle ne disparaît pas du décompte). **Aucun changement de bande** | `forensic-lifestyle-lieutenant.ts:82-86` + en-tête `:5` |
| jointure scopée au joueur ? | **oui, deux fois** : `leftJoin(lieutenant, and(lieutenant_id = …, lieutenant.player_id = playerId))` dans la clause **ON** (un `WHERE` aurait mangé les lignes et changé la bande), puis re-vérification `seule.lieutenant_player_id !== playerId → null` dans le module pur | `forensic.projection.service.ts:344-351` ; `forensic-lifestyle-lieutenant.ts:88-90` |
| IDOR / authz | **aucune faille trouvée**. `playerId` vient du JWT via `resolvePlayerId(req.account!.account_id)`, jamais d'un paramètre ; la route d'action `POST …/actors/:ref/intel` résout la propriété **avant tout débit** | `forensic.controller.ts:57-76` ; `internal-affairs.controller.ts:76-94` ; `ia-intel-purchase.service.ts:196-199` |

La maquette dessine donc **exactement** ce que le back sert pour cette clé : cadre 152 = phrase à trou
`forensic.bloc.le_train_de_vie_de_nom` (« le train de vie de {nom} », `string_table.ts:4525`) avec
`{nom}` ← `lifestyle_lieutenant_name` ; cadre 153 = `forensic.bloc.le_train_de_vie_d_un_lieutenant`
(`:4524`) quand la clé est `null`. **Le seul écart de contenu entre les deux cadres est ce titre** —
diff recollé, bande, crans, compteurs, note et CTA **byte-identiques** (`mesures/03`).

## Écarts à consigner (mode maquette) — gravités fermées

**A** = le joueur verrait un état que le jeu ne produit pas · **B** = le joueur lit/voit une
information sans source servie · **C** = nuance, annotation ou précision d'un écart déjà assumé
(consigné, pas de correctif).

| # | grav. | information | B | M | statut | preuve |
|---|---|---|---|---|---|---|
| **A1** | **A** | **l'état dessiné par les DEUX cadres n'est pas atteignable** : `lifestyle_audit_state` n'est **jamais créée** sur un chemin joueur. Seuls `populateLifestyleState` (`standing-gap-heat.service.ts:214`, insert `:250-267`) et `ForensicRepository.seedLifestyleState` (`forensic.repository.ts:530`) insèrent, et leurs **seuls** appelants dans `src/` sont des routes `_test` (`forensic-test.controller.ts:984, 2034, 2688`). `runMonthlyTick` est bien câblé au tick prod (`forensic.module.ts:222`) mais ne fait que des **UPDATE** et sort en no-op sans ligne (`standing-gap-heat.service.ts:315-328`). ⇒ pour un joueur réel : bande `quiet`, nom `null` — donc **ni « On vous regarde », ni « Lt. Marrek »** | ● (clé servie, **valeur inatteignable**) | ● | **état non productible** | `mesures/02` ; épinglé côté back : `tests/e2e/parcours/36_42_horizon_forensic.parcours.spec.ts:65-66` (« joueur neuf : bande quiet » / « aucun lieutenant nommé ») ; la spec moteur le dit elle-même : « le semis SQL pose des lignes qu'**aucune route joueur ne sait encore écrire à ce grain** » (`forensic_lifestyle_lieutenant_name.engine.spec.ts:5-8`) |
| **B1** | **B** | piste « la comptabilité » dessinée **éteinte**, 0/4 crans, libellé « — », `.cle` « pas encore sur la table » : **aucune valeur servie ne porte cet état**. `audit_risk_bucket` a 4 valeurs et rend `'clean'` aussi bien pour « jamais audité » (χ² `null`, 0 soft-flag) que pour « audité et propre » (χ² < H) | – (pas de discriminant) | ● | **dessiné sans source** | `forensic.projection.service.ts:421-429` ; domaine `:82` |
| **B2** | **B** | les `.cle` rendus **en clair au joueur** : « **visible** » et « **watched** » — les valeurs BRUTES des bandes. Vérifié sur le rendu (texte gris sous le libellé, `reference/cadre-152-piste-nommee.png`), convention systématique de l'atelier (cadre 131 : « watched / visible / quiet »). Aucune clé i18n ne porte ces mots : les 3 seules valeurs nues de la table sont `forensic.cran.remarque`:'noticed', `filiere.bloc.propres`:'clean', `filiere.proprete.clean`:'clean' (toutes EN) | – | ● | **dessiné sans source** — à consigner explicitement comme annotation NON rendue, sinon le front affichera « watched » | `mesures/03` ; CSS `.pi .cle{display:block;…}` (page de l'atelier) |
| **B3** | **B** | note du bloc : « **Les livres : personne ne regarde par là. Pour l'instant.** » — **aucune clé**. La seule clé voisine dit « Les livres **et le train de vie** : personne ne regarde par là… » (`string_table.ts:3244`), phrase **devenue fausse** dans cet état puisque le train de vie y est à `watched` | – | ● | **dessiné sans source** (+ clé servie périmée pour cet état) | `mesures/03`, contrôle positif du motif joint |
| **B4** | **B** | compteur « **02/2** pistes chaudes » : le **dénominateur 2** n'a aucune source — 3 pistes sont dessinées et la route sert **3** bandes. Il suppose qu'une piste « n'est pas sur la table », distinction que le back ne sert pas (cf. B1). Le numérateur, lui, est dérivable des 3 bandes | – (dénominateur) | ● | **dessiné sans source** | `forensic.projection.service.ts:135-161` (4 clés, aucun compteur) |
| **B5** | **B** | compteur « **00 franchies** » : aucune clé ; dérivable seulement si « franchie » = bande au 4ᵉ cran — définition **non écrite** côté back | – | ● | **dessiné sans source** (dérivable sous convention à ratifier) | idem |
| **C1** | C | étiquette du cadre 153 : « null : **plusieurs lignes d'alarme**, option B ». La règle servie est plus étroite : plusieurs lignes **ne suffisent pas** — il faut qu'**aucune ligne unique ne porte les trois maxima**. Contre-exemple lu au code : A(tailing, 3, 0.4) + B(none, 0, null) ⇒ A porte les trois ⇒ **le nom EST servi** | ● | ● | précision d'étiquette (non vue du joueur) ; **la règle à implémenter est « une seule ligne porte les TROIS maxima »** | `forensic-lifestyle-lieutenant.ts:82-86` |
| **C2** | C | **deux libellés servis pour la même bande `watched`** : `forensic.gravite.on_vous_regarde` = « On vous regarde » (`:3228`, celui que la maquette dessine) et `forensic.cran.on_regarde` = « on regarde » (`:4522`). Le front devra trancher | ● ● | ● | à consigner | `string_table.ts:3228, 4522` |
| **C3** | C | écart assumé « prix du renseignement **jamais servi** » — **à préciser** : `costCents` **est** projeté, mais seulement dans la réponse du `POST` (`readonly costCents: number`, valeur `intelPurchaseCostCents` = 800000). **Aucune route de lecture joueur ne le sert** ⇒ la note dessinée (« éteint : le prix n'est pas servi ») tient pour l'avant-achat | ● (route d'action seulement) | ● | écart assumé **confirmé avec sa vraie raison** | `ia-intel-purchase.service.ts:121-133, 248` |
| **C4** | C | écart assumé « acteurs : `actorRef` seul, aucun nom » — **CONFIRMÉ au back** : `ActorSummary` = `{ actorRef, actorType, status }`, rien d'autre | ● | ● | écart assumé confirmé | `ia-projection.service.ts:118-122` |
| **C5** | C | « **Lt. Marrek** » vient de `POOL_ESTUAIRE`, le pool de **débordement**, servi seulement au-delà de 12 lieutenants dans un roster ; le plus gros roster mesuré du dépôt en compte **5**. Un nom du pool « Sec » (Hara, Rin, Voss…) serait plus représentatif d'un rendu de référence | ● | ● | nuance de maquette | `lieutenant-name-pool.ts:18-20, 29-39` |
| **C6** | C | barre HUD (ARGENT 24 850 €, CHALEUR « Tiède » + aiguille, JOUR 12 / « Plein jour ») : **hors domaine ㊴**, non mesurée ici. « Tiède » et « Plein jour » ont bien des clés servies (`heat.bucket.warm`, `chrome.phase.plein_jour`) ; les **valeurs** (montant, jour) n'ont pas été tracées | n/m | ● | hors saisine | `mesures/03` |

## « Passé à côté ? » — pour l'user (questions, jamais des défauts)

La route `GET /v1/me/forensic` est couverte **4 clés sur 4** : rien de ce qu'elle sert n'est oublié par
ces deux cadres. Les questions portent donc sur ce qui est **en base et non projeté** (B⁻, forme F) :

| # | colonne / clé | ce que ça dit au joueur | avis d'usage (une ligne) | intérêt |
|---|---|---|---|---|
| 1 | `lifestyle_audit_state.consecutive_flag_months` (`forensic.ts:552`) | **depuis combien de mois ça dure** | **utile ici, en BANDE** : c'est ce qui sépare « on vient de vous remarquer » de « ça dure depuis des mois » — la bande seule ne le dit pas | **élevé** |
| 2 | option A (bande **par ligne**, lieutenant = argmax), consignée en dette `forensic-lifestyle-lieutenant.ts:5` | **lequel de mes lieutenants** quand plusieurs sont suivis | **utile ici** : c'est exactement l'état du cadre 153 — avec option B, 3 lieutenants sous surveillance ⇒ le joueur n'en voit **aucun** | **élevé** |
| 3 | `declared_cut_cents` + `visible_standard_index` (`forensic.ts:535, 543`) | **l'écart lui-même** : ce qu'il déclare contre ce qui se voit | utile **en bande** (« il dépense trois fois ce qu'il déclare ») : c'est le contenu de la piste, pas sa température | moyen-élevé |
| 4 | `tail_started_tick` (`forensic.ts:579`) | **depuis quand** on le suit | utile en bande (« depuis des semaines ») ; redondant avec 1 si 1 est servi | moyen |
| 5 | `actors[].actorRef` / `actorType` (servis) | **qui** sont les acteurs | **pas ici** : la fenêtre des acteurs est une autre vue (cadre 151, hors saisine) ; ces deux cadres n'en montrent que le compte | faible pour 152/153 |
| 6 | un prix **en lecture** pour le renseignement (n'existe pas : cf. C3) | **combien ça coûte**, avant de cliquer | **utile** : c'est la seule chose qui sépare le CTA éteint d'un CTA vivant | moyen-élevé |

`last_gap` (`forensic.ts:560`) et `tail_ramp_stage` brut restent **interdits** (R2.2 — scalaire / état
interne) : ce sont des non-questions.

**Précédent de la forme F à mettre à jour** : le mandat cite « `lieutenant.name` existe en base,
jamais projeté ». **C'est périmé** — le nom est projeté à plusieurs endroits joueur
(`lieutenant.projection.service.ts:138-141`, `lieutenant.repository.ts:409, 455, 502`,
`district-interior.repository.ts:276`), et Q5 est précisément le lot qui ferme ce trou-là ici.

## Actions : routes ↔ CTA

| CTA / geste (M) | route joueur | verdict |
|---|---|---|
| « ACHETER DU RENSEIGNEMENT », dessiné **éteint** (M19) | `POST /v1/me/internal-affairs/actors/:ref/intel` (`internal-affairs.controller.ts:76-78`, `JwtAuthGuard`) | **la route existe** ; le CTA est éteint faute de **prix en lecture** (C3), pas faute de route. Authz saine : `:ref` est un référent du joueur, `playerId` vient du JWT, la propriété est résolue **avant tout débit** (`ia-intel-purchase.service.ts:196-199`) |
| fenêtre « acteurs qui tiennent », porte `›` (M07) | `GET /v1/me/internal-affairs/actors` (`:61-62`) | route présente, geste dessiné ✔ |
| aucune autre | — | **1 seule** route `@Post` joueur dans les deux modules : aucune route d'action sans CTA |

## Table de couverture complète (mode maquette : B / M)

Inventaire M : **20** éléments porteurs d'information dans le cadre 152 (le cadre 153 porte le même
inventaire, un seul texte change — M14). Appariés à une clé B : **5** (M07, M09, M12, M14, M15).

| # | information | B | M | statut | preuve |
|---|---|---|---|---|---|
| L1 | risque d'audit (piste « la comptabilité ») | ● `audit_risk_bucket` | ● M09 (0/4 crans, « — ») | **dessiné sans source pour CET état** (B1) | `projection:140, 421-429` |
| L2 | visibilité des rejets (piste « ce qui sort des cuves ») | ● `effluent_visibility_bucket` | ● M12 (3/4, « ça se voit ») | ✔ dessiné comme servi (crans = rang dans le domaine à 4 valeurs) | `projection:146, 447-456` ; `forensic.cran.ca_se_voit` `:4552` |
| L3 | alarme du train de vie (bande) | ● `lifestyle_alarm_bucket` | ● M15 (3/4, « On vous regarde ») | ✔ dessiné comme servi — **mais valeur inatteignable** (A1) | `projection:152, 477-496` ; `forensic.gravite.on_vous_regarde` `:3228` |
| L4 | **nom du lieutenant du train de vie** | ● `lifestyle_lieutenant_name` | ● M14 (152 : « de Lt. Marrek » / 153 : « d'un lieutenant ») | ✔ **servi exactement comme dessiné**, les deux états compris | `projection:160` ; `forensic-lifestyle-lieutenant.ts:75-92` ; clés `:4525` / `:4524` |
| L5 | nombre d'acteurs (dénominateur « /4 ») | ● `actors[]` (cardinal) | ● M07 | ✔ dérivable du tableau servi | `internal-affairs.controller.ts:63-67` |
| L6 | acteurs qui tiennent (numérateur « 01 ») | ● `actors[].status` (`steady\|nervous\|unavailable\|gone`) | ● M07 | ✔ dérivable (compte des `steady`) | `ia-projection.service.ts:77` |
| L7 | référence d'un acteur | ● `actors[].actorRef` | – | « passé à côté ? » (question 5) | `ia-projection.service.ts:119` |
| L8 | type d'un acteur | ● `actors[].actorType` (`lawyer\|clerk`) | – (dessiné au cadre 151, hors saisine) | « passé à côté ? » (question 5) | `ia-projection.service.ts:120` |
| L9 | titre de la piste 1 « la comptabilité » | – | ● M08 | texte **servi** par i18n (`:3240`), pas par une clé de données | `string_table.ts:3240` |
| L10 | `.cle` « pas encore sur la table » | – | ● M10 | i18n servi (`:3247`) mais **sans valeur de bande correspondante** (B1) | `string_table.ts:3247` |
| L11 | titre de la piste 2 « ce qui sort des cuves » | – | ● M11 | i18n servi | `:4523` |
| L12 | `.cle` « visible » | – | ● M13 | **dessiné sans source** (B2) | `mesures/03` |
| L13 | `.cle` « watched » | – | ● M16 | **dessiné sans source** (B2) | `mesures/03` |
| L14 | compteur « 02/2 pistes chaudes » | – | ● M05 | **dessiné sans source** (B4) | `mesures/03` |
| L15 | compteur « 00 franchies » | – | ● M06 | **dessiné sans source** (B5) | `mesures/03` |
| L16 | note « Les livres : personne ne regarde par là… » | – | ● M17 | **dessiné sans source** (B3) | `mesures/03` |
| L17 | enseigne « Le dossier » + « trois pistes, et elles ne se mélangent pas » | – | ● M04 | i18n servi | `:3242`, `:4518` |
| L18 | bloc « pourquoi trois colonnes » (3 textes) | – | ● M18 | i18n servi (dont la phrase à trous `:3241`) | `:3248, 3246, 3241` |
| L19 | CTA « ACHETER DU RENSEIGNEMENT » (éteint) | – (route d'action, § Actions) | ● M19 | i18n servi `:4527` ; route présente | `internal-affairs.controller.ts:76` |
| L20 | note « sur un acteur… le prix n'est pas servi » | – | ● M20 | i18n servi (phrase à trous) | `:3250` |
| L21 | HUD — ARGENT 24 850 € | n/m | ● M01 | hors domaine (C6) | `mesures/03` |
| L22 | HUD — CHALEUR « Tiède » + aiguille | n/m | ● M02 | hors domaine (C6) ; libellé servi `heat.bucket.warm` (`string_table.ts:4026`) | `mesures/03` |
| L23 | HUD — JOUR 12 / « Plein jour » | n/m | ● M03 | hors domaine (C6) ; libellé servi `chrome.phase.plein_jour` (`:4196`) | `mesures/03` |

**Contrôle d'arithmétique (obligatoire)** : |clés B| = **8** (4 de `GET /v1/me/forensic` + 4 de
`GET /v1/me/internal-affairs/actors` : enveloppe/cardinal, `actorRef`, `actorType`, `status`) ·
|éléments M non appariés| = **15** (20 − 5 appariés) · |rendus F sans source| = **0** (pas de F au
moment 1). **8 + 15 + 0 = 23 lignes** — la table en compte **23** (L1→L23). ✔
Les 3 champs de la réponse du `POST …/intel` (`purchaseId`, `band`, `costCents`) sont une route
**d'action** : ils sont traités au § Actions et en C3, hors de ce décompte, comme le prévoit le mandat.

## Annexes

### 1. Routes du domaine — compte trouvé, pas recopié

**149** `*.controller.ts` balayés au SHA épinglé. Contrôleurs citant `forensic|lifestyle|audit_risk|effluent` : **5**,
dont 3 `_test`/`admin` ⇒ **une seule** route joueur pour les pistes. Routes **joueur** de l'écran (sous
`@UseGuards(JwtAuthGuard)`, ni `_test` ni BO) : **3**.

| route | ancre | rôle |
|---|---|---|
| `GET /v1/me/forensic` | `forensic.controller.ts:55-56` | les 3 bandes + le nom |
| `GET /v1/me/internal-affairs/actors` | `internal-affairs.controller.ts:61-62` | la liste des acteurs |
| `POST /v1/me/internal-affairs/actors/:ref/intel` | `internal-affairs.controller.ts:76-78` | l'achat (action) |

### 2. Corps réels — **néant au moment 1**

`mesures/01` à `04` portent les commandes et leurs sorties collées. **Aucun corps de réponse n'a été
mesuré** : pile non touchée, B entièrement DÉDUIT. Ce qu'il faudra mesurer au moment 2, dans cet ordre :
`POST /v1/auth/signup` (Idempotency-Key requis) → `POST /v1/session/open` → `GET /v1/me/forensic`
(attendu d'après le source : `{clean, clear, quiet, null}`) → **puis** un semis `_test`
(`POST /v1/_test/forensic/populate-lifestyle` + `run-monthly-tick`) pour produire l'état du cadre 152,
puisque aucun chemin joueur ne le produit (A1).

### 3. Valeurs possibles par clé, avec la contrainte **source**

| clé | domaine | contrainte lue |
|---|---|---|
| `audit_risk_bucket` | `clean` `watched` `flagged` `audited` | **type TS fermé** `forensic.projection.service.ts:82` — *pas* de CHECK SQL |
| `effluent_visibility_bucket` | `clear` `faint` `visible` `glaring` | type TS fermé `:101` |
| `lifestyle_alarm_bucket` | `quiet` `noticed` `watched` `subpoenaed` | type TS fermé `:121` ; dérivé de `tail_ramp_stage`, lui **pgEnum** réel (`db/schema/forensic.ts:469`) |
| `lifestyle_lieutenant_name` | `string` (varchar(64), forme « Lt. Nom ») ou `null` | colonne `db/schema/lieutenant.ts:91` ; forme et pools `lieutenant-name-pool.ts:29-46` ; exclusions `forensic-lifestyle-lieutenant.ts:80-92` |
| `actors[].status` | `steady` `nervous` `unavailable` `gone` | type TS fermé `ia-projection.service.ts:77` |
| `actors[].actorType` | `lawyer` `clerk` | type TS fermé `ia-projection.service.ts:120` |

### 4. Inventaire M (Mxx → ce que ça représente)

M01 argent · M02 chaleur (bande + aiguille) · M03 jour + phase · M04 enseigne de l'écran ·
M05 « 02/2 pistes chaudes » · M06 « 00 franchies » · M07 « 01/4 acteurs qui tiennent » (+ porte `›`) ·
M08 titre piste 1 · M09 état piste 1 (0/4 crans, « — », éteinte) · M10 `.cle` piste 1 ·
M11 titre piste 2 · M12 état piste 2 (3/4, « ça se voit ») · M13 `.cle` piste 2 ·
M14 **titre piste 3 — le seul texte qui change entre 152 et 153** · M15 état piste 3 (3/4,
« On vous regarde ») · M16 `.cle` piste 3 · M17 note du bloc · M18 bloc « pourquoi trois colonnes » ·
M19 CTA éteint · M20 note du CTA.
Les crans sont le **rang de la bande dans son domaine à 4 valeurs** (confirmé par le cadre 131 :
`quiet` ⇒ 1/4) : dérivables de la bande, donc sourcés.

### 5. Inventaire F — sans objet (moment 1)

### 6. Ce que je n'ai **pas** pu vérifier

1. **Aucun corps réel** : toute la colonne B est DÉDUITE du source (pile non touchée, ruling f2).
   La mesure qui trancherait : les `curl` de l'annexe 2, au moment 2.
2. **`tests/e2e/operational/forensic_lifestyle_lieutenant_name.engine.spec.ts` déclare dans son
   en-tête (`:5`) être « ÉCRITE, NON EXÉCUTÉE »** : je n'ai **aucune preuve d'exécution verte** de
   cette spec, et je ne l'ai pas jouée. Elle épingle pourtant l'ensemble de clés (`:36`) et les
   5 états d'option B (`:95-145`) — c'est le gate qui devra la rendre verte.
3. **Atteignabilité organique des deux AUTRES pistes non tranchée.** Mesuré : leurs écrivains sont
   bien sur des chaînes de tick **prod** (`runWeeklyAuditTick` WEEKLY/9 `forensic.module.ts:183` pour
   χ² ; `runEnvironmentalInspectorScan` NIGHTLY/9 `:216` pour l'effluent) — contrairement au train de
   vie, dont la **création de ligne** n'existe que sous `_test` (A1). Non mesuré : si la chaîne de
   blanchiment alimente réellement `ledger_entry_ring` (le commentaire `forensic.controller.ts:11-16`,
   **daté du 2026-08-13**, annonce « 1 bucket réel sur 3 » et TD-358 — je ne l'ai pas re-mesuré).
   La mesure qui trancherait : remonter les appelants joueur de `recordReceipt`/`recordThroughput`.
4. **Les deux cadres n'ont pas été reproduits** : aucun état de maquette n'est productible sur compte
   frais pour la piste du train de vie (A1).
5. **Pixels** : hors mandat. J'ai seulement lu le rendu `cadre-152-piste-nommee.png` pour vérifier que
   les `.cle` sont bien du **texte rendu** (B2) et la 3ᵉ piste de `cadre-153-null.png` pour le titre
   sans nom. Aucun contrôle de couleur ni de métrique.
6. **Barre HUD** (M01-M03) : hors domaine ㊴, non tracée jusqu'à sa route.
7. **La table i18n** a été lue pour l'**existence** des clés et leur valeur FR/EN, **pas** pour leur
   statut de ratification (plusieurs blocs ㊴ sont annotés « PROPOSÉ, NON RATIFIÉ » dans le fichier).
