# Des mots, pas de rendu — ⑯ (10 clés `revue.*`, 11 clés `flag_discipline`, phrases de v4-3), et six états sans mot (㊴ ㊳ ㉘)

> Atelier / DA, 2026-09-22 (23:55). Documents seulement : aucun rendu, aucune capture, rien sous `Assets/`.
> **Sources** : client-2 `d745a577` (`~/project/mafia-unity-F/Tools/juge-donnees/revue-du-jour/i18n-2026-09-23.md`, le fr fait foi à
> l'octet) ; back `4841d7ad` (types, projections, `string_table.ts`) ; mesure du back `scratchpad/S5-v4-3-maillons-2026-09-23.md` ;
> maquettes atelier `8509195` — `ecrans-brennar-4.html` (⑯, cadre **v4-3**) et `ecrans-brennar-6.html` (cadres **57**, **132**, **143**, **145**).
> Ensembles de clés vérifiés par script (§6).

---

## 1. ⑯ — l'`en` des 10 clés `revue.*` que le client demande

Le fr est celui du fichier de CLIENT-2, à l'octet (apostrophe `’` U+2019, tiret `—` U+2014). L'en suit les mêmes conventions : `’` et
`—`, casse identique au fr (les capitales du fr sont dans la donnée, elles le restent en en).

| clé | fr (fait foi) | en |
|---|---|---|
| `revue.bloc.ce_matin_au_verge_d_or` | Ce matin, au Verge d’Or | This morning, at the Verge d’Or |
| `revue.bloc.vos_lieutenants_ont_tenu_la_ligne_rien_ne_reclame_votre_parole` | Vos lieutenants ont tenu la ligne — rien ne réclame votre parole | Your lieutenants held the line — nothing needs your word |
| `revue.bloc.appui_long_rien_d_autre_ne_vous_attend` | appui long — rien d’autre ne vous attend | long press — nothing else is waiting for you |
| `revue.verdict.rendu` | RENDU | RETURNED |
| `revue.verdict.il_garde_sa_confiance` | il garde sa confiance | their trust stays intact |
| `revue.verdict.perdu` | PERDU | LOST |
| `revue.verdict.jusqu_a_la_remise_hebdomadaire` | jusqu’à la remise hebdomadaire | until the weekly reset |
| `revue.verdict.remise_demain` | remise demain | reset tomorrow |
| `revue.bloc.routines_signees` | ` ROUTINES SIGNÉES` | ` ROUTINES SIGNED` |
| `revue.bloc.d_un_seul_appui_le_registre_est_clos_pour_aujourd_hui` | d’un seul appui — le registre est clos pour aujourd’hui | one press — the register is closed for today |

- **`revue.bloc.routines_signees` garde son espace initiale en en aussi** : le client écrit `lotSigne + Lib(…)` (`:681`), le compte
  précède ⇒ « 17 ROUTINES SIGNED ». L'ordre « nombre, nom, participe » tient dans les deux langues, sans paramètre.
- **« il garde sa confiance » → « their trust stays intact »** : le fr dit « il » parce que la phrase est au masculin générique ; les
  lieutenants de ⑯ sont aussi des femmes (Lt. Tovah, « NOUVELLE »). L'en n'a pas à choisir un genre : « their » couvre les deux.
- **« Verge d’Or »** reste en français dans l'en : c'est le nom du bar (une enseigne), pas une description.
- « remise » = la remise des jetons de confiance (`week_epoch`, le tick hebdomadaire) ⇒ « reset », comme « weekly reset ».
- Les deux concaténations à nombre (« appui long — les N signalements… », « remise dans N jours ») restent hors table, comme chez
  CLIENT-2 : pas d'en tant que `Libelle.De` ne prend aucun paramètre.

---

## 2. ⑯ — les 11 clés `core_loops.flag_discipline.*` : l'`en` réel, et `stash_reorder` réécrit dans les deux langues

Aujourd'hui l'en est le fr à l'octet (`EN_MESSAGES`, `string_table.ts:580-603` ; `FR_MESSAGES`, `:2176-2199`). Les placeholders sont **exactement** ceux du fr
(garde TD-457 : params émis = placeholders du gabarit) — vérifié par script, §6.

| clé | fr servi | fr proposé | en proposé |
|---|---|---|---|
| `…reason.courier_scheduling` | Tournée à recaler sur la route {route_id}. | *(inchangé)* | Round to reschedule on route {route_id}. |
| `…reason.deviation_detected` | Écart relevé par {generator}. | *(inchangé)* | Deviation flagged by {generator}. |
| `…reason.front_shop_reconciliation` | Caisse à rapprocher sur {building_id}. | *(inchangé)* | Till to reconcile at {building_id}. |
| `…reason.lek_rotation` | Rotation à décider pour {dealer_id}. | *(inchangé)* | Rotation to decide for {dealer_id}. |
| `…reason.precursor_order` | Commande de {precursor_type} à passer pour {building_id}. | *(inchangé)* | {precursor_type} order to place for {building_id}. |
| `…reason.stash_reorder` | Réassort de {substance_type} à prévoir sur {building_id}. | **Stock de {substance_type} à alléger sur {building_id}.** | {substance_type} stock to lighten at {building_id}. |
| `…routine.courier_scheduling.descriptor` | Tournées — route {route_id} | *(inchangé)* | Rounds — route {route_id} |
| `…routine.front_shop_reconciliation.descriptor` | Caisse — {building_id} | *(inchangé)* | Till — {building_id} |
| `…routine.lek_rotation.descriptor` | Rotation — {dealer_id} | *(inchangé)* | Rotation — {dealer_id} |
| `…routine.precursor_order.descriptor` | Précurseurs — {precursor_type}, {building_id} | *(inchangé)* | Precursors — {precursor_type}, {building_id} |
| `…routine.stash_reorder.descriptor` | Réassort — {substance_type}, {building_id} | **Stock à alléger — {substance_type}, {building_id}** | Stock to lighten — {substance_type}, {building_id} |

- **Pourquoi « alléger »** : le score de `stash_reorder` monte avec le **remplissage** (grammes ÷ point de remplissage) et la **chaleur**
  du bâtiment (`deviation-scores.ts:82`) ; le canon dit « stash beyond rotation fill point ». Un réassort remplit une réserve vide :
  c'est l'inverse. « Alléger » est vrai dans les deux cas (trop plein : on sort du stock ; trop chaud : on réduit ce qui s'y trouve), et
  c'est le verbe de la phrase de ⑯ déjà livrée (`08-…` §1 : « J'ai allégé le stock »). Le registre du back reste le sien — un intitulé
  d'item, pas une phrase de lieutenant.
- `lek_rotation.descriptor` est identique en fr et en en (« Rotation » est un mot des deux langues) : ce n'est pas un oubli.
- ⚠️ Ces valeurs portent encore des **identifiants** (`{route_id}`, `{building_id}`, `{dealer_id}`) : c'est S5-a, hors de ce lot.

---

## 3. ⑯ v4-3 — une phrase par valeur de `deviation_condition`, avec le nom du sujet

Deux champs neufs sur la carte (orchestrateur, mesuré par le back) : `subject_name_i18n` (le nom du sujet) et `deviation_condition`
(bande fermée : `audit_pinned`, `buffer_loaded`, `route_saturated_or_severed`, `route_meandering`, `baseline`). Les phrases gardent le
registre de v4-0 : le lieutenant à la 1ʳᵉ personne, le motif en italique après `— `, et désormais le **nom du sujet en gras** dans le
titre, comme v4-3 le dessine.

### Le nom du sujet, tel que le back le rend — et comment la phrase l'accueille

| sujet | forme servie | exemple servi | dans la phrase fr | dans la phrase en |
|---|---|---|---|---|
| tournée nommée par le joueur | `route.route_name` (texte libre, facultatif) | « Le Circuit » | la tournée **Le Circuit** | the **Le Circuit** run |
| tournée, cas principal | `game.fiction.route.named` = `{depart} → {arrivee}` | « Quai-Nord → Verrier » | la tournée **Quai-Nord → Verrier** | the **Quai-Nord → Verrier** run |
| tournée, repli | `game.fiction.route.indexed` = **`n° {index}`** (réécrit, ci-dessous ; servi aujourd'hui : `Route {index}`) | « n° 7 » | la tournée **n° 7** | the **No. 7** run |
| façade | `game.fiction.building.name` = `{enseigne} — {district}, îlot {block}` | « Laverie du Quai — Sarnes, îlot 12 » | les comptes de **Laverie du Quai — Sarnes, îlot 12** | the books at **Laverie du Quai — Sarnes, block 12** (si l'en du gabarit est servi, ci-dessous) |

- ⚠️ **Au back** : le gabarit `game.fiction.building.name` est servi **identique en en** (`EN_MESSAGES`, `string_table.ts:478` et `.rang` `:483` ;
  le fr est à `:2093` et `:2098`) : « {enseigne} — {district}, îlot {block} » et « …, n° {rang} » : un joueur anglophone lira « îlot » et « n° ». En proposé : « {enseigne} — {district},
  block {block} » et « {enseigne} — {district}, block {block}, no. {rang} », mêmes placeholders. Les deux gabarits `route` sont neutres.
- Le nom est inséré **nu, sans article**, après un nom commun (« la tournée », « les comptes de ») : c'est ce qui permet à un nom libre,
  à « A → B » et à « Route 7 » d'entrer dans la même phrase sans accord à calculer. Le gras le signale comme un nom propre.
- ⚠️ **Deux tirets dans la même phrase de façade** : le nom servi contient `—` (« Laverie du Quai — Sarnes… ») et le motif commence par
  `— `. Le gras (le nom) et l'italique (le motif) les séparent à l'œil. **Au client** : garder les deux styles, sinon la phrase se lit
  mal ; et ne jamais couper la ligne entre le nom et son tiret.

### Le gabarit de repli de la tournée — réécrit (orchestrateur, 2026-09-22 : « sa valeur est encore libre »)

`routeNameRef` (`common/fiction-names.ts:210-222`) n'a **aucun appelant** dans le back à `4841d7ad` (0 site hors sa définition), ni
le client côté cumul : ses deux gabarits sont encore libres, ⑯ sera le premier consommateur. Servi aujourd'hui, le repli donnerait
« la tournée **Route 7** » : le nom de la chose, deux fois. On garde la phrase (« la tournée **{sujet}** », « the **{sujet}** run »),
qui se lit juste avec un nom libre et avec « départ → arrivée », et on réécrit le repli pour qu'il se lise juste aussi :

| clé exacte | placeholders | fr servi | **fr proposé** | en servi | **en proposé** |
|---|---|---|---|---|---|
| `game.fiction.route.indexed` | `{index}` (inchangé) | `Route {index}` | **`n° {index}`** | `Route {index}` | **`No. {index}`** |

- fr : « J’ai réacheminé la tournée **n° 7** — … » ; en : « I rerouted the **No. 7** run — … ». Les deux se lisent comme on dit « la
  ligne n° 9 », « the No. 9 bus ».
- `game.fiction.route.named` (`{depart} → {arrivee}`) **ne change pas** : sans article, il reste réutilisable seul comme libellé.
- Coût du choix, dit d'avance : un écran qui montrerait un jour ce repli **seul**, sans nom commun devant, lirait « n° 7 ». C'est
  lisible sous un titre « Tournées », pas ailleurs ; un tel écran devra écrire son nom commun, comme ⑯ le fait.

### Les phrases

`{sujet}` = `subject_name_i18n` résolu, en gras. Le titre et le motif sont deux runs, comme en v4-0.

| `deviation_condition` | générateur | ce que le back mesure | fr | en |
|---|---|---|---|---|
| `route_saturated_or_severed` | `courier_scheduling` | `route.state ∈ {saturated, severed}`, score 0,9 | J’ai réacheminé la tournée **{sujet}** *— l’ancien trajet ne passait plus : saturé, ou coupé.* | I rerouted the **{sujet}** run *— the old route wasn’t getting through: jammed, or cut.* |
| `route_meandering` | `courier_scheduling` | `sinuosity_index ≥ sinuosityMeanderingMax`, score 0,4 (ne signale que pour un lieutenant FRESH) | J’ai replanifié la tournée **{sujet}** *— le trajet fait plus de détours que d’habitude.* | I rescheduled the **{sujet}** run *— the route takes more detours than usual.* |
| `audit_pinned` | `front_shop_reconciliation` | `building.audit_pin_activated_at` posé (tick nocturne), score 0,9 | J’ai rapproché les comptes de **{sujet}** *— la façade est épinglée pour un contrôle.* | I reconciled the books at **{sujet}** *— the front is pinned for an audit.* |
| `buffer_loaded` | `front_shop_reconciliation` | `laundering_node.buffer_load` (la charge du tampon), score = la charge | J’ai rapproché les comptes de **{sujet}** *— il passe plus d’argent par la caisse que la façade ne peut en justifier.* | I reconciled the books at **{sujet}** *— more money is going through the till than the front can explain.* |
| `baseline` | tout générateur | aucune condition : le plancher 0,1 | J’ai suivi la routine pour **{sujet}** *— rien d’anormal que je puisse vous montrer, mais je préfère vous le soumettre.* | I kept to the routine for **{sujet}** *— nothing out of the ordinary I can show you, but I’d rather put it to you.* |

- **`route_meandering` dit « plus que d'habitude », pas « trop »** : l'indice est comparé à une coupe fixe, et v4-0 a ratifié le
  registre de l'habitude pour ce générateur (« l'horaire habituel n'a pas été tenu »).
- **`baseline` ne naît pas en production aujourd'hui** : 0,1 < 0,40, le seuil minimal (FRESH). Même statut que `precursor_order` et
  `stash_reorder` (`08-…` §1) : sa falsifiable est un test de la table, pas une capture. La phrase ne prétend rien : elle dit qu'il n'y a
  rien à montrer.
- **Sans `subject_name_i18n`** (champ absent, ou lot S5-a pas encore servi) : la carte garde la phrase de v4-0 de son générateur
  (`08-…` §1). Ce repli existe déjà ; il ne faut pas en inventer un troisième.

### Le Lek — la carte reste dessinée, mais elle attend TD-359 et TD-360

- **La carte ne naît pas en production** (mesure du back) : ses deux conditions ont 0 écrivain — dealer `compromised` (TD-359) et
  `lambda_weight` sans ligne (TD-360) ⇒ score figé à 0,1 sous le seuil 0,40. Pas de valeur de `deviation_condition` pour elle dans la
  bande livrée : **ses phrases s'écriront avec ses conditions**, quand elles auront un écrivain.
- **« le coin du Lek » n'a pas de source** : un coin est un îlot (`dealer.coverage_lek_tile_id`), et `blocks` n'a pas de colonne de nom.
  **Étiquette de repli, sans inventer de nom** — la forme maison de l'îlot, celle de `buildingNameRef` sans l'enseigne :
  - fr : **le coin de l'îlot {block}, {district}** → « le coin de l'îlot 14, Marne-Basse »
  - en : **the corner on block {block}, {district}** → « the corner on block 14, Marne-Basse »
  Deux données servies (l'îlot et le district du dealer), aucun nom propre fabriqué. Si un jour les îlots ont un nom, il remplace
  « l'îlot {block} » ; la forme ne change pas.

### La maquette v4-3 — corrigée dans l'atelier (`30c8374`)

| carte | avant | après | pourquoi |
|---|---|---|---|
| coursiers | « J’ai réacheminé **la tournée 7** — le nouveau trajet passe à deux rues du commissariat. » | « J’ai réacheminé **la tournée n° 7** — l’ancien trajet ne passait plus : saturé, ou coupé. » | le motif devient celui de `route_saturated_or_severed` : le back ne sait rien d'un commissariat |
| Lek | « Je tiens **le coin du Lek** malgré la surenchère — le droit de place a doublé — la recette peut y passer. » | « Je tiens **le coin de l’îlot 14, Marne-Basse** malgré la surenchère — … » + note « attend TD-359/360 » | l'étiquette de repli ; la carte reste, annotée |
| façade | « J’ai rapproché les comptes **du lavomatic** — les recettes déclarées dépassent celles d’une laverie. » | « J’ai rapproché les comptes **de Laverie du Quai — Sarnes, îlot 12** — il passe plus d’argent par la caisse que la façade ne peut en justifier. » | le motif devient celui de `buffer_loaded`, vrai pour toute enseigne |

- **« la tournée 7 » → « la tournée n° 7 »** (atelier `9e8a3e3`) : le repli tel qu'il sera servi avec le gabarit réécrit ci-dessus.
  La maquette montre le repli, pas le cas principal (« Quai-Nord → Verrier ») ; c'est le choix de l'orchestrateur.
- **« du lavomatic » → « de Laverie du Quai — Sarnes, îlot 12 »** (atelier `9e8a3e3`) : « lavomatic » n'était pas une enseigne
  servie. « Laverie du Quai » est dans la liste du back pour une façade (`common/building-signs.ts`), « Sarnes » est un district servi,
  et la forme est celle de `game.fiction.building.name`.
- **Re-rendu de la référence de ⑯** : après le signal de l'orchestrateur.

---

## 4. Six états sans mot — ils ont TOUS déjà un mot dans une maquette ratifiée

CLIENT-2 a mesuré six valeurs du back affichées « Inconnu » ou brutes. Lues dans le back (types et projections), puis cherchées dans les
maquettes : **les six sont déjà dessinées**, dans les cadres-témoins « tous les crans » de la série 6 (atelier `4efe14f`, 06/09 : « pour
qu'aucune valeur servie ne soit sans dessin »). Le fr est donc celui de la maquette ; l'en est à écrire.

| écran | valeur | ce qu'elle veut dire (back) | fr (maquette) | cadre | en |
|---|---|---|---|---|---|
| ㊴ | `audit_risk_bucket = flagged` | χ² de Benford ≥ 1,5 × H (= 21) : les chiffres de la comptabilité dessinent une anomalie nette (`forensic.projection.service.ts:188` — ⚠️ le commentaire `:170` dit encore 2,0 × H, le code dit 1,5) | un dossier est ouvert | **143** | a file is open |
| ㊴ | `audit_risk_bucket = audited` | χ² ≥ 3,0 × H (= 42), `:189` (le commentaire `:173` dit 3,5) : « extreme anomaly » — le dernier cran de la piste | ils sont venus | **132**, **143** | they came |
| ㊴ | `lifestyle_alarm_bucket = subpoenaed` | l'étape de filature est `subpoena` : « most severe; MIS subpoena territory » (`:112`) — le dernier cran | convoqué | **132**, **143** | summoned |
| ㊳ | `phase_band = onset` | position ≥ 0,9 sur la courbe de récupération : l'événement diffuse encore, contamination presque pleine (`random-world.projection.service.ts:18-22`, `:137`) | ça commence | **145** | it’s starting |
| ㊳ | `phase_band = receding` | 0,15 ≤ position < 0,5 : ça reflue (`:139`) | ça retombe | **145** | it’s easing off |
| ㉘ | `sinuosity_bucket = gnarled` | indice ≥ `sinuosityMeanderingMax` : « highly circuitous path » (`route-finder.service.ts:196-199`) | tordu — beaucoup de détours | **57** | twisted — lots of detours |

**Ce que le client doit savoir en câblant** :
- **㊴ — les derniers crans sont des ÉVÉNEMENTS, pas une gravité de plus.** Le cadre 143 le dit en toutes lettres : « Le dernier de
  chaque piste est un événement, pas un cran de plus — ils sont venus · ça saute aux yeux · convoqué — on ne vous surveille plus. » Le
  cadre 132 le redit (« quelque chose a eu lieu », le compteur « franchies »). Aujourd'hui le client range `glaring` en « Criant » et laisse
  `audited` / `subpoenaed` en « Inconnu » (`ForensicScreenController.cs:491-503`) : les trois appartiennent à la même classe, celle que la
  maquette compte « franchies ». Et `flagged` est un cran de surveillance, sous `audited`, sur la piste comptable.
- **㊳ — casse** : le client écrit ses phases en capitales dans le littéral (`Lib("ÇA SE DÉPLOIE")`, `JournalScreenController.cs:409-412`).
  Même forme pour les deux neuves : **« ÇA COMMENCE »**, **« ÇA RETOMBE »** ; en : « IT’S STARTING », « IT’S EASING OFF ».
- **㉘ — ce n'est pas un mot qui manque, c'est une clé** : le client a écrit `"tortuous"` comme hypothèse (`DistributionScreenController.cs:1054`,
  « m-57 — hypothèse ») ; le back sert **`gnarled`**. Le libellé du client est déjà celui de la maquette (« tordu — beaucoup de détours »,
  cadre 57) : seule la valeur du `case` est fausse.

---

## 5. Ce qui part d'ici

- **Au back (f7)** : §1 (10 `en`, avec l'espace initiale de `routines_signees`) ; §2 (11 `en`, et le fr de `stash_reorder` réécrit deux fois,
  placeholders inchangés) ; les deux gabarits `route` et `building` sont déjà servis.
- **À CLIENT-2** : §3 (la table `deviation_condition` × langue, et le repli sur la phrase de v4-0 sans `subject_name_i18n`) ; §4 (six mots,
  la classe « franchie » de ㊴, la clé `gnarled` de ㉘).
- **À l'user** : aucune de ces phrases n'est ratifiée. Les six mots du §4 le sont déjà (cadres 57, 132, 143, 145 de la série 6) ; seul
  leur `en` est neuf.

## 6. Contrôles

Rejouables : `python3 Tools/atelier-2026-09-22/verifier-10-mots.py`. Il compare l'ensemble des clés du §1 au fichier de CLIENT-2 à
`d745a577`, l'ensemble des clés du §2 aux clés `core_loops.flag_discipline.*` du registre fr de `string_table.ts` à `4841d7ad`, les
placeholders de chaque valeur (fr servi, fr proposé, en proposé) entre eux, et l'espace initiale de `routines_signees` dans les deux langues.

---

## 7. ⑯ — la chip de fréquence : `none` n'a PAS de chip (tranché le 2026-09-23)

`flag_frequency_band` = `none | occasional | frequent` (`convergence.ts:35`, `:96-99`) : le nombre de signalements **levés** par ce
lieutenant sur les 7 derniers jours de jeu, **en attente compris** (`flag-discipline.repository.ts:581-591`, `game_day > jour − 7`).
La maquette v4-0 dessine deux mots ; le client range aujourd'hui `none` sous « rarement » (`DailyReviewScreenController.cs:881`, arbre F).

**Décision : pour `none`, pas de chip.** Sur ⑯, chaque carte EST un signalement de ce lieutenant, et il compte dans la fenêtre s'il a
moins de 7 jours ; `none` n'arrive donc que pour une carte **vieille de plus d'une semaine** — ce que la chip du jour (`J11`,
`flagged_game_day`) dit déjà. « rarement » y serait faux (il ne signale plus rien dans la fenêtre), et un troisième mot (« ne signale
plus ») affirmerait une intention que la donnée n'a pas.

| valeur | fr | en | clé (dérivée par le client, `Lib("chip", …)`) |
|---|---|---|---|
| `frequent` | signale souvent | flags often | `revue.chip.signale_souvent` |
| `occasional` | signale rarement | rarely flags | `revue.chip.signale_rarement` |
| `none` | *(pas de chip)* | *(no chip)* | — |

- Les deux clés ne sont servies par **aucun** registre aujourd'hui (`FR_MESSAGES` et `EN_MESSAGES` à `4841d7ad`, 0 clé `revue.chip.*`) :
  fr et en ci-dessus, pour le lot i18n de ⑯. La maquette écrit en minuscules ; les capitales de l'écran sont le rendu (CSS), pas la donnée.
- ⚠️ Ce n'est vrai QUE pour ⑯. Un écran qui montrerait la bande d'un lieutenant SANS carte (⑦, la fiche) verrait `none` au sens propre
  (« rien levé en 7 jours ») : là, un mot serait dû — proposé : « ne signale rien » / « hasn't flagged anything ».
