# Juge données ⊥ — ㊴ Le dossier (piste « train de vie », nom du lieutenant) — maquette, tour r2 BORNÉ — 2026-11-11

**Juge NEUF, contexte vierge.** Je n'ai ni dessiné la maquette ni construit l'écran. Je n'ai ouvert
aucun rapport de juge précédent, aucune note d'implémentation, et pas le répertoire
`maquette-9fa533b5/` (interdit par le dossier ; j'en ai listé les NOMS de fichiers une fois, en
arborescence, sans en lire aucun contenu).

## Ancrages — ce sur quoi tout ce rapport est mesuré

| côté | épingle | vérification |
|---|---|---|
| **M** (maquette) | `atelier3d-mafia-c2` @ `b2ceebeb6ca672f1a367d5e135ddfcc17fbc92d1` (remplace `392643c3`, correction de mi-tour) | `git show <sha>:ecrans-brennar-6.html`, md5 `1616373bf3ca9b32c91df4fdc2704593`, 6869 lignes |
| **M** (rendus) | `reference/cadre-152-piste-nommee.png`, `reference/cadre-153-null.png` | 1080×2102 tous deux, mtime `2026-11-11 02:26:01/02` — **postérieurs** au commit `b2ceebeb` (02:25:21) : rendus depuis ce SHA |
| **B** (back) | `gate/cumul-2026-10-10` @ `7807d6c8`, dépôt `mafia-clean-city`, lu par `git show`/`git grep` sur l'objet de commit | branche jamais changée (`HEAD` reste `main`), rien écrit dans ce dépôt |

**Indices de cadres — 0-based**, convention du littéral exact `<div class="cadre">`
(`Tools/juge-visuel/verifier-indices-cadres.py:5-8`). Compté : 154 cadres ; **cadre 152 = ligne 6860**
(piste nommée), **cadre 153 = ligne 6863** (nom null). Les deux cadres ㊴ Q5 sont donc bien ceux que
le dossier nomme, et non les deux derniers de la page (qui seraient 153/154 en 1-based).

> ⚠️ **Toute la colonne B est DÉDUITE du source**, jamais d'un corps de réponse réel : le dossier
> interdit de toucher la pile (ruling f2 11/11, la pile de dev tourne `main`, le gate arrive). Chaque
> ligne de B ci-dessous porte sa raison. Les corps RÉELS restent à mesurer au moment 2.

## B — ce que le back renvoie pour cet écran (DÉDUIT)

Route joueur du domaine : **1** (`@Get('me/forensic')` + `@UseGuards(JwtAuthGuard)`,
`forensic.controller.ts:55-57`). **0 route d'action** (`@Post`) dans ce contrôleur.
Réponse = `ForensicClientProjection` verbatim (`forensic.controller.ts:57,59`) = **4 clés** :

| clé | type | valeurs possibles (source qui les contraint) | DÉDUIT — raison |
|---|---|---|---|
| `audit_risk_bucket` | bande | `clean`\|`watched`\|`flagged`\|`audited` | `forensic.projection.service.ts:82` (type littéral TS) — pile non montée |
| `effluent_visibility_bucket` | bande | `clear`\|`faint`\|`visible`\|`glaring` | idem `:101` |
| `lifestyle_alarm_bucket` | bande | `quiet`\|`noticed`\|`watched`\|`subpoenaed` | idem `:121` |
| `lifestyle_lieutenant_name` | nom (jamais un id) | `string \| null` | idem `:160` ; règle du null : `forensic-lifestyle-lieutenant.ts:80-92` |

Compté : 3 champs de bande dans l'interface (`:140`, `:146`, `:152`) + 1 nom (`:160`).

**Authz (vérifié, aucun constat)** — le nom d'un lieutenant est une donnée nominative : la route
résout le `player_id` depuis le JWT (`forensic.controller.ts:58,64-76`), la jointure SQL est scopée
(`forensic.projection.service.ts:345-350`, `eq(lieutenant.player_id, playerId)`) **et** le choix du nom
re-vérifie l'appartenance (`forensic-lifestyle-lieutenant.ts:90`). Pas d'IDOR ; une ligne dont le
lieutenant est étranger reste comptée comme concurrente au lieu de disparaître (`:72-73`) — c'est
l'option conservatrice.

## Les 7 points bornés — CORRIGÉ / PARTIEL / NON CORRIGÉ

### 1. « productible après le lot back de l'écrivain lifestyle » — exact ? → **CORRIGÉ**

L'étiquette est **exacte**. Mesure (`mesures/02-B-point1-ecrivain-lifestyle.txt`) :

- Écrivains SQL de `lifestyle_audit_state` dans `src/` : **2** — `forensic.repository.ts:534`
  (`seedLifestyleState`, dont le commentaire `:517` dit « TEST-ONLY ») et
  `standing-gap-heat.service.ts:250` (dans `populateLifestyleState`, 214-285).
- Appelants de `populateLifestyleState` **hors `*-test.controller.ts` : 0**
  (les 2 appels sont `forensic-test.controller.ts:2034` et `:2688`).
- Appelants de `seedLifestyleState` **hors `*-test.controller.ts` : 0** (seul `:984`).
- Le chemin de PROD existe bien (`forensic.module.ts:222,226` chaînent `runMonthlyTick` puis
  `advanceTailRamp` sur le NIGHTLY) **mais aucun des deux ne crée de ligne** : tous deux font un
  `select` puis `return` si `rows.length === 0` (`standing-gap-heat.service.ts:317-328` et
  `:467-479`), et le seul `insert` du fichier est la ligne 250, hors de ces deux méthodes.

⚠️ Piège écarté : le commentaire de schéma `db/schema/forensic.ts:473` affirme « Created lazily by
StandingGapHeatService.runMonthlyTick » — **le code le dément** (`runMonthlyTick` ne fait aucun
`insert`). J'ai suivi le code, pas le commentaire.

### 2. Un seul état « clean » — conforme à `audit_risk_bucket` ? → **CORRIGÉ**

Conforme. `deriveAuditRiskBucket` (`forensic.projection.service.ts:415-430`) rend `'clean'` dans
**deux** cas indiscernables côté client : `chi2 === null && softFlags === 0` (jamais audité, `:421-423`)
et `chi2 < H` (audité, propre, `:429`). Rien dans la réponse ne les sépare. La maquette dessine donc
bien un seul état : comptabilité = 1 cran vert + « rien à signaler », **sans `.cle`** (cadres 152 et
153). « pas encore sur la table » a disparu des deux cadres.

Cohérence des crans (vérifiée sur les deux rendus) : le nombre de crans allumés = le **rang** de la
valeur dans son domaine fermé — `clean` rang 1 → 1 cran ; `visible` rang 3 → 3 ; `watched` rang 3 → 3.
La jauge se remplit par le bas (observé sur les PNG).

### 3. Plus aucune valeur brute d'enum à l'écran → **CORRIGÉ**

Mesuré binairement sur la source **et** vu sur les deux rendus
(`mesures/04-point3-valeurs-brutes.txt`). Test : les 15 valeurs brutes des 3 domaines fermés + les 4
étapes de `tail_ramp_stage`, cherchées parmi les nœuds texte de `.ecran` seul (l'étiquette est une
annotation d'atelier, hors téléphone) :

- **b2ceebeb : cadre 152 → 0 valeur brute ; cadre 153 → 0.**
- **Contrôle positif** (le grep attrape bien cette forme) : sur r1, cadre 152 → **2** (`watched`,
  `visible`), cadre 153 → **2**.

**Doublon « On vous regarde » : supprimé.** Dans `b2ceebeb`, la piste du train de vie n'a plus de
`.cle` dans aucun des deux cadres — vérifié sur la source (le `<b>On vous regarde</b>` n'est plus
suivi d'un `<span class="cle">`) et sur les deux PNG (rien sous « On vous regarde »). La `.cle` des
cuves subsiste et dit « Ça se remarque » (voir constat **D1**).

### 4. Compteur « 02/3 pistes chaudes » ; « 00 franchies » retiré → **CORRIGÉ**

- **Dénominateur 3 : sourcé.** `ForensicClientProjection` porte exactement **3** champs de bande
  (compté : `forensic.projection.service.ts:140,146,152`). 3 pistes = 3 bandes.
- **« franchies » : aucune trace** dans les cadres 152 et 153 — l'inventaire des 33 nœuds texte de
  chacun ne contient ni « franchies » ni le `00` qui l'accompagnait (`mesures/01-M-inventaire-b2ceebeb.txt`).
  Le couple `02/2 … 00 franchies` de r1 a bien disparu (`mesures/03-M-delta-r1-vers-r2.txt`).
- Le **numérateur** reste sans règle écrite côté back : voir constat **D3**.

### 5. La note « Les livres : personne ne regarde par là. » — la clé existe-t-elle ? → **question, répondue : NON, sans clé**

Ce point n'est pas une correction à noter (la note est inchangée depuis r1 — confirmé par le delta) ;
c'est une question. Réponse mesurée (`mesures/07-points-3-5-cles-i18n.txt`) : **la phrase dessinée n'a
aucune clé** — 0 occurrence de « Les livres : » dans `string_table.ts`. La seule clé voisine,
`forensic.bloc.les_livres_et_le_train_de_vie_personne_ne_regarde_par_la_pour_l_instant`
(`string_table.ts:3244` FR, `:307` EN), sert **une autre phrase** : « Les livres **et le train de
vie** : personne ne regarde par là. Pour l'instant. » Conformément au dossier (« ne pas la compter
comme défaut atelier si c'est annoncé ainsi »), ce n'est **pas** un défaut atelier — c'est une ligne
de lot back. Voir constat **D2** pour la précision qui, elle, est neuve.

### 6. Étiquette du 153 : « aucune ligne unique ne porte les trois maxima » → **CORRIGÉ**

Exact. `nomLieutenantTrainDeVie` (`forensic-lifestyle-lieutenant.ts:86`) : `if (auMaximum.length !== 1)
return null` — donc **0 OU ≥ 2** lignes aux trois maxima rendent `null`, ce que la formule « aucune
ligne unique ne porte les trois maxima » dit exactement (elle couvre les deux cas, y compris les
maxima croisés, `:82-85`). La formule de r1 (« plusieurs lignes d'alarme ») était plus faible : elle
ratait le cas 0 et confondait « lignes d'alarme » avec « lignes aux trois maxima ».

« même piste, même bande » est également exact : la bande vient de `maximaTrainDeVie`
(`forensic.projection.service.ts:355,363`), le nom est calculé **après** et séparément (`:365`) —
le choix du nom ne touche jamais la bande (`forensic-lifestyle-lieutenant.ts:5`).

### 7. Les 2 autres pistes (rejets) et la vue acteurs, inchangées côté back → **CONFIRMÉ**

- Côté **M** : les cadres 150 et 151 sont **octet pour octet identiques** entre r1 et r2
  (sha256 tronqué `8d0c41a468e16d6c` et `5fdfddcc8fa9d359`, inchangés). La correction n'a touché que
  152 et 153.
- Côté **B** : le contrat de `effluent_visibility_bucket` est inchangé
  (`forensic.projection.service.ts:101,146`) ; c'est la seule des 3 bandes qui ait une source réelle
  aujourd'hui (`forensic.controller.ts:11-14`).
- Le CTA « ACHETER DU RENSEIGNEMENT » reste sans route (**0** `@Post` joueur dans le domaine) — ce que
  la maquette dit elle-même (« éteint : le prix n'est pas servi »). Cohérent, rien à signaler.

## Table des constats

Tout ce qui est compté dans ce rapport est dans cette table — rien n'est compté ailleurs.
Gravité : **A/B** = ce qu'un joueur perçoit ⇒ à corriger ; **C** = nuance ⇒ consignée, ni correctif ni
tour de juge (ruling user 07/10).

| id | gravité | critère | constat | mesure | non vérifié |
|---|---|---|---|---|---|
| **D1** | C | NOUVEAU | La `.cle` des cuves dit « Ça se remarque » (cadres 152 **et** 153) : mot **introduit par la correction** en remplacement de la valeur brute `visible`, et qui n'a **aucune clé servie**. Il double de surcroît, en quasi-synonyme, le mot de sa propre bande (« ça se voit ») — la correction a retiré le doublon exact du train de vie et laissé ce doublon approché. Couvert par l'écart assumé B2/B3 (« clés servies par BACK-1 ») ⇒ **ligne de lot back, pas défaut atelier**. | `git grep -i -F 'se remarque'` sur `string_table.ts@7807d6c8` → **0 ligne**, alors que les 7 autres textes de l'écran rendent chacun ≥ 1 (contrôle positif, `mesures/07-points-3-5-cles-i18n.txt`). Vocabulaire disponible : 12 mots de bande FR (9 `forensic.cran.*` + 3 `forensic.gravite.*`, `mesures/08-vocabulaire-bandes.txt`), dont `forensic.cran.remarque` = « remarqué » (`:4549`). | Si BACK-1 ratifiera ce mot neuf ou réutilisera `forensic.cran.remarque` ; et quelle information distincte la `.cle` porte, puisque sa bande est déjà nommée. |
| **D2** | C | NOUVEAU | La clé i18n la plus proche de la note dessinée sert une phrase **sémantiquement contraire** à l'état des cadres 152/153 : elle affirme que le train de vie n'est pas regardé, alors que les deux cadres le montrent CHAUD (« On vous regarde », 3 crans). Le fait que la note soit en clair est assumé (B2/B3) ; ce qui est neuf, c'est le **piège de liaison** — réutiliser la clé existante au lieu d'en créer une afficherait une contradiction sous la bande. | Note dessinée : « Les livres : personne ne regarde par là. Pour l'instant. » → `git grep -F 'Les livres :'` sur `string_table.ts@7807d6c8` = **0 ligne**. Clé existante : `forensic.bloc.les_livres_et_le_train_de_vie_personne_ne_regarde_par_la_pour_l_instant` = « Les livres **et le train de vie** : personne ne regarde par là. Pour l'instant. » (`:3244` FR, `:307` EN). | Rien : mesuré binairement. La décision (nouvelle clé vs réemploi) appartient à BACK-1. |
| **D3** | C | NOUVEAU | Le dénominateur « /3 » est sourcé, mais **la règle qui rend une piste « chaude » n'existe nulle part dans le back**. Le numérateur `02` est cohérent avec « chaude = valeur de rang ≥ 2 » (comptabilité `clean` rang 1 → froide ; cuves `visible` rang 3 ; train de vie `watched` rang 3), mais ce seuil est une décision de présentation sans source — le client l'inventera s'il n'est pas tranché. Pas une entorse R2.2 : le compteur résume des bandes déjà affichées, il ne reconstruit aucun scalaire caché. | Dénominateur : **3** champs de bande comptés dans l'interface (`forensic.projection.service.ts:140,146,152`). Aucune clé ni constante back ne définit « chaude » ; `forensic.bloc.pistes_chaudes` (`string_table.ts:4519`) ne sert que le libellé. | La règle que CLIENT-2 retiendra. À noter : `audit_risk_bucket` est CONSTANT pour tout joueur aujourd'hui (`forensic.controller.ts:11-21`, TD-358) ⇒ le compteur ne pourra pas dépasser 02/3 avant la fermeture de TD-358. |
| **D4** | C | NOUVEAU | « Lt. Marrek » est un nom **réellement servable** (donc aucun défaut), mais il vient du pool de **débordement**, servi seulement au-delà de 12 lieutenants : reproduire le cadre 152 au moment 2 demandera un roster > 12, là qu'un nom de `POOL_SEC` serait productible sur un roster ordinaire. | `Marrek` ∈ `POOL_ESTUAIRE` (`lieutenant-name-pool.ts:37`), décrit `:36` comme « le DÉBORDEMENT, servi seulement quand un roster dépasse 12 » ; `POOL_SEC` = « les 12 premiers servis » (`:30-33`). Forme canon « Lt. Nom » (`:44-45`), donc « Lt. Marrek » est bien la valeur stockée. | Le roster réel d'un compte frais au moment 2. |
| **D5** | C | DÉJÀ-APPLIQUÉ | Le **cadre 150** de la même page porte encore tout ce que la correction a retiré des 152/153 : la valeur brute `visible`, « pas encore sur la table » (×2) et « 00 franchies ». Il est antérieur et légitimement conservé (convention d'atelier : on pose en fin de page, on ne réécrit pas l'historique) — mais un implémenteur qui ouvre la page sans l'indice exact peut lire le mauvais cadre. | Inventaire du cadre 150 (ligne 6851) : 37 nœuds texte dont `.cle` « visible », `.cle` « pas encore sur la table » ×2, `00` + « franchies » (`mesures/01-M-inventaire-b2ceebeb.txt`). Cadres 150 et 151 identiques entre r1 et r2 (sha256 `8d0c41a4…`, `5fdfddcc…`). | Lequel des cadres fait foi pour CLIENT-2 — à nommer explicitement dans le dossier de pose (152/153). |

**Comptes : 5 constats — 0 A, 0 B, 5 C. Dont NOUVEAU : 4 (D1–D4) ; DÉJÀ-APPLIQUÉ : 1 (D5).**

## Ce que je n'ai pas pu vérifier

1. **Aucun corps de réponse réel** : la pile est interdite (ruling f2 11/11). Les 4 clés, leurs valeurs
   possibles et l'atteignabilité sont **déduites du source** `@7807d6c8`. La mesure qui trancherait :
   au moment 2, `POST /v1/auth/signup` + `POST /v1/session/open` puis
   `GET /v1/me/forensic` sur compte frais, et après le lot lifestyle.
2. **Les deux états dessinés ne sont pas productibles aujourd'hui** : 0 chemin joueur ne crée de ligne
   `lifestyle_audit_state` (point 1) — c'est l'écart assumé, et les étiquettes le disent désormais.
   Tant que ce lot n'est pas livré, `lifestyle_alarm_bucket` vaut `quiet` et
   `lifestyle_lieutenant_name` vaut `null` pour tout joueur.
3. **La correspondance valeur de bande → mot** n'est écrite nulle part dans le back : 12 mots FR
   existent pour 12 états (3 bandes × 4 valeurs), mais **aucune table ne les apparie** — je n'ai donc
   pas pu vérifier que « On vous regarde » est bien le mot de `watched` plutôt que d'une autre valeur.
   La mesure qui trancherait : la table de correspondance que BACK-1 servira.
4. **Contraste et largeur de « On vous regarde »** : non remesurés (rendu gelé, consigne du dossier).
   Le juge visuel en décide, pas moi.
5. Je n'ai **pas** rouvert la couverture complète B/M (pas de table de couverture, pas de liste
   « passé à côté ? ») : le tour est BORNÉ aux 7 points. Sur les 4 clés de B, les 4 sont dessinées dans
   les cadres 152/153 — aucune clé disponible n'est laissée de côté.

## Verdict

**RATIFIABLE** — 0 constat A, 0 constat B (ni nouveau, ni non corrigé).

Points bornés : **1 CORRIGÉ · 2 CORRIGÉ · 3 CORRIGÉ · 4 CORRIGÉ · 5 question répondue (note sans
clé — non-défaut atelier par le dossier) · 6 CORRIGÉ · 7 CONFIRMÉ.** Aucun point PARTIEL, aucun NON
CORRIGÉ.

Deux lignes à porter au **lot back BACK-1** avant que le client ne câble l'écran — elles ne bloquent
pas la ratification de la maquette, mais aucune n'est tenue par une clé existante aujourd'hui :
« Ça se remarque » (D1) et la note « Les livres : … », qui doit recevoir **sa propre clé** et non
réemployer `forensic.bloc.les_livres_et_le_train_de_vie_…`, laquelle dirait le contraire de ce que la
bande affiche (D2).

### Auto-audit

J'atteste avoir ouvert et lu moi-même chaque fichier cité, au SHA cité : la maquette par
`git show b2ceebeb:…` (jamais l'arbre de travail), le back par `git show`/`git grep` sur l'objet
`7807d6c8` (branche jamais changée, rien écrit dans ce dépôt), et les deux PNG de `reference/`
visuellement. Les comptes qui décident (154 cadres ; indices 152/153 ; 3 champs de bande ; 0 appelant
de production ; 0 occurrence de « se remarque » et de « Les livres : ») sont issus de commandes dont la
sortie est collée dans `mesures/`, jamais d'une lecture au terminal. Le contrôle du point 3 porte un
**contrôle positif** (r1 rend 2 valeurs brutes par cadre, r2 en rend 0) : le test sait rougir. Je n'ai
ni ouvert `maquette-9fa533b5/`, ni aucun fichier `*implementation-notes*`, ni aucun rapport de juge ;
la version r1 de la maquette n'a été lue que dans le dépôt de l'atelier, pour caractériser le delta de
la correction. Là où le commentaire de schéma contredisait le code (`forensic.ts:473`), j'ai suivi le
code et l'ai dit.

## Annexe — mesures

| fichier | contenu |
|---|---|
| `mesures/extraire-cadres-q5.py` | extracteur d'inventaire M (indices 0-based ; balises vides traitées) |
| `mesures/01-M-inventaire-b2ceebeb.txt` | inventaire M épinglé : cadres 150, 151, 152, 153 — crans + nœuds texte |
| `mesures/02-B-point1-ecrivain-lifestyle.txt` | point 1 — écrivains de `lifestyle_audit_state` et comptes d'appelants |
| `mesures/03-M-delta-r1-vers-r2.txt` | ce que la correction a retiré / ajouté sur 152 et 153 |
| `mesures/04-point3-valeurs-brutes.txt` | point 3 — 0 valeur brute en r2, 2 par cadre en r1 (contrôle positif) |
| `mesures/05-points-2-4-6-7.txt` | points 2, 4, 6, 7 — dérivations, comptes de bandes, règle du nom, routes |
| `mesures/06-nom-lieutenant-marrek.txt` | « Lt. Marrek » dans le pool de débordement |
| `mesures/07-points-3-5-cles-i18n.txt` | points 3 et 5 — recherche par valeur servie dans `string_table.ts` |
| `mesures/08-vocabulaire-bandes.txt` | 12 mots de bande FR disponibles pour 12 états |
