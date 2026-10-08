# 52 — La table de noms de la fiction : ce qui existe, la structure, un échantillon

Commande f2 du 23/09 (ruling user du 25/08 : « une TABLE DE NOMS pour la fiction, les bâtiments et les dealers n'en ont
aucune »). Document statique : **mesure → structure → échantillon de 10 par catégorie, tout PROPOSÉ**, pour que l'user
tranche le ton. Pas de liste complète tant que le ton n'est pas tranché.

Sources mesurées : back `~/project/mafia-back-suite` HEAD `117fdec4` (chemins relatifs à `services/game-back/src/`),
GDD `projects/mafia_city_game/gdd/02_fictional_world.md`, `front.md`, `back.md` §L0.5,
`docs/superpowers/plans/2026-09-06-lot-vie-des-lieutenants.md` (lot 6), atelier `fiction/vocabulaire-servi.json`
(relevé du 03/09, back `032bb944`), corps réels capturés sous `Tools/juge-donnees/` et `Tools/juge-visuel/`.
Contrôle : `controle-52-noms.py` (code 0).

---

## 1. Mesure : la table EXISTE déjà pour quatre catégories sur six

★ Le constat de départ (« les bâtiments et les dealers n'en ont aucune », 25/08) **n'est plus vrai depuis le 02/09** :
le back a livré L0.5 (`back.md` : « LIVRÉE pour buildings + lieutenants », 27/08), puis les réservoirs de noms
(commit `a07147e9`, 02/09). Tous suivent le même mécanisme : une empreinte de l'identifiant choisit un point de départ
dans une liste fixe, puis on avance tant que le nom est déjà pris chez ce joueur.

| catégorie | colonne en base | qui écrit | servi au client | réservoir | registre actuel |
|---|---|---|---|---|---|
| **lieutenant** | `lieutenant.name varchar(64) NOT NULL` (+ `name_locale`) | `LieutenantRepository.recruit` remplace le gabarit `'Lieutenant'` par `nomPourLieutenant` dans la même transaction (`operational/lieutenant/lieutenant.repository.ts:880-889`) — y compris les **deux lieutenants de départ** (`onboarding/onboarding-grant.service.ts:448-476`) | `name` en clair (pas de clé) : `GET /v1/lieutenants`, `/:id`, cartes d'exception, rapports d'autonomie, revue des drapeaux | `operational/lieutenant/lieutenant-name-pool.ts:30-39` — **24** (« Sec » 12 + « Estuaire » 12), forme `Lt. {nom}`, un numéro au-delà de 24 | Hara, Rin, Voss, Kane, Tovah, Marr, Vesk, Dorne, Sallo, Tull… |
| **dealer** | **aucune** (`db/schema/operational_chain.ts:223-235`) | rien n'est stocké : `dealerNameRef` calculé à chaque projection (`common/fiction-names.ts:190-195`) | `DealerProjection.name_i18n` = `game.fiction.dealer.name` + `{prenom}` | `common/dealer-names.ts:31-34` — **18** prénoms | Oskar, Mira, Joran, Ilse, Dov, Tamsin, Nell, Pim, Casimir, Ines… |
| **bâtiment** | **aucune** (`db/schema/city_state.ts:143+`) | rien n'est stocké : `buildingNameRef` (`common/fiction-names.ts:68-96`) | `name_i18n` = `game.fiction.building.name[.rang]` + `{enseigne, district, block[, rang]}` sur 5 routes | `common/building-signs.ts:23-36` — **72** enseignes (6 × 12 types) ; repli « Local sans enseigne » | Pressing Varne, Tabac-Presse Kest, Laverie du Quai, Photo Ilm… |
| **nœud de filière** | **aucune** (`laundering_nodes` : `node_id, building_id, stage_index…`) | — | **aucun nom**, et même pas le `building_id` (`operational/laundering/laundering.projection.service.ts:44-92`) — TD-610 | **absent** | la maquette ㊵ écrit « Le comptoir », « La blanchisserie », « Le garage », « Le notaire » |
| avocat | `lawyers.name NOT NULL` | `nomPourAvocat` (`operational/legal/legal-case.repository.ts:92-105`) | `lawyerNameI18n` | `operational/legal/lawyer-name-pool.ts:80-82` — 14, forme `Maître {nom}` | Aldane, Berrow, Calvane… |
| district | `name_canonical` = « Tidewater-1 »… | `nomDeDistrict` (`citysim/world/district-names.ts:21-28`) | `name` | 18 | Les Bassins, Quai-Nord, Sarnes… |

Autres entités **sans nom** : les précincts (entier ; la 51 a proposé `police.bloc.precinct_n` « Précinct {n} »), les
enquêteurs, les citoyens, les **chefs rivaux** (le lot 6 le relève : « un nom, aucun visage ») ; les **candidats au
recrutement** portent un gabarit **anglais** dans le JSON `profile` : `Saltline Candidate #${slot}`
(`operational/recruitment/saltline-recruitment.service.ts:190`), `Defector Contact (${rivalKey})`
(`defector-recruitment.service.ts:126`).

### 1.1 « Les lieutenants de départ s'appellent Lieutenant » : mesuré, c'est l'ARRIÉRÉ, pas le code

- Le code actuel ne laisse **jamais** un lieutenant nommé `'Lieutenant'`, les deux de départ compris (renommés dans
  la transaction du recrutement).
- Dans les corps réels du client, `"name": "Lieutenant"` n'apparaît que dans **3 fichiers, tous du 31/08**
  (`Tools/juge-donnees/reputation/cloture-2026-08-31/mesures/`) — avant l'arrivée du réservoir (02/09). Les captures
  suivantes portent des noms : Lt. Quist (35 occurrences), Varne, Rook, Marr, Sallo, Rin, Oster, Ferrand, Hara…
- Les lignes créées avant le 02/09 gardent `'Lieutenant'` tant que `scripts/backfill-noms-lieutenants.mjs` n'a pas
  tourné avec `--vraiment` sur la base (le commit `a07147e9` comptait 19 068 lignes sur 19 544). *Non mesuré ici : je
  n'interroge pas la base.* Un `SELECT count(*) FROM lieutenant WHERE name = 'Lieutenant'` en lecture tranche.
- Un contrôleur de test écrit encore `name: 'Lieutenant'` sans passer par le renommage
  (`operational/insurance/insurance-test.controller.ts:4661-4665`).

### 1.2 Hara, Nestor, Salvatore, Wexler : quatre noms écrits en dur, et ils ne désignent personne de réel dans la partie

| nom | où | problème |
|---|---|---|
| **Lt. Hara** | clés servies `tutorial.exception_card.onboarding_preseed` et `onboarding.preseed_exception.card` (EN 529, 552 · FR 2882, 2905) | la carte d'accueil nomme « Lt. Hara », mais le lieutenant de départ réel reçoit son nom par l'empreinte : **il ne s'appelle presque jamais Hara**. Le joueur lit un nom qu'aucune fiche ne porte. |
| **Nestor** | clé servie `appro.bloc.nestor_l_etagere_est_vide_sans_pyralin_je_ne_rallume_pas` (EN 671 · FR 3006) ; maquette du labo (`front.md` l. 900) | même défaut : le cuisinier du joueur a un nom tiré du réservoir, pas « Nestor ». |
| **Salvatore** | maquette ⑦ (`front.md` l. 1396, « Lieutenant Detail · Salvatore ») et locuteur de l'état délégué (l. 907) | **absent du back** (mesuré : `services/`, `tests/`, `scripts/`, `tools/`). |
| **Wexler** | maquette de la boutique, « derrière le comptoir » (`front.md` l. 900) | absent du back. |

⇒ **Structure proposée (§2.5)** : ces répliques prennent le nom du **vrai** lieutenant en paramètre. Contrat i18n
additif : les clés servies gardent leur slug (`…nestor_l_etagere…`), seule la **valeur** change
(« {lieutenant} : l'étagère est vide… »). *À la charge du back ; ici, seulement signalé.*

---

## 2. Structure proposée

### 2.1 Le cadre de ton, tel qu'il est RATIFIÉ (registres lus avant de poser une question)

- **Ruling user du 2026-09-06 soir** : style « **sombre / napolitain / mafieux** », **ère 1B = fin des années 1980 –
  début des années 1990** (`README-decision-type-hl-option.md:45`, dossiers du juge visuel, lot 6 l. 273).
- ⚠️ Le lot 6 relève que l'user a écrit « fin 90 » en posant ce ruling ; lecture retenue : **1B**. *Pas tranché en
  silence ici non plus* — pour les noms, l'écart ne change presque rien (les prénoms d'adultes nés entre 1940 et
  1970 sont les mêmes).
- **GDD 02, toujours en vigueur** : aucun cartel réel, aucune personne réelle ; pas de clichés de la mafia
  italo-américaine des années 1950. Brennar « n'est situé dans aucun pays réel ». ⇒ Le napolitain s'entend comme
  **une couleur de noms**, pas comme Naples : pas de clan réel, pas de figure réelle, pas de nom de fiction célèbre.
- **La toponymie servie est française** (18 districts : Les Bassins, Quai-Nord…). Les enseignes restent donc en
  français (« Pressing », « Tabac-Presse ») ; seul le **nom propre** porte la couleur.
- **D13 (épicène)** porte sur l'**accord** des valeurs, pas sur les noms : le back n'a **aucune colonne de genre**
  (mesuré, `lieutenant.ts`, `operational_chain.ts`). Un prénom peut être féminin ou masculin sans qu'aucune phrase
  servie ne s'accorde. D13 tient.

### 2.2 ⚖️ La question de ton pour l'user, et une seule

Les réservoirs servis (24 + 18 + 14 + 72) ont été écrits le **02/09**, **avant** le ruling du 06/09. Ils sont d'un
autre registre : **nordique-anglo inventé** pour les lieutenants et les avocats (Hara, Voss, Skeld ; Maître Berrow),
**international** pour les dealers (Oskar, Adaeze, Kofi, Sunniva, Lucía). Aucun n'est napolitain.

| option | ce qu'elle garde | ce qu'elle coûte |
|---|---|---|
| **A — tout napolitain** (échantillons §3) | le ruling du 06/09 ; la maquette (Salvatore) | les noms **stockés** des lieutenants existants ne changent pas seuls (rétro-remplissage, comme `backfill-noms-lieutenants.mjs`) ; les dealers et les enseignes, **calculés**, changent d'un coup pour tous les joueurs |
| **B — mélange de port** : lieutenants et dealers napolitains, avocats et enseignes gardés | une ville portuaire mêlée ; moins de noms à réécrire | deux registres côte à côte dans le même écran (« Lt. Ciro » à côté de « Pressing Varne ») |
| **C — garder le servi** | zéro réécriture | contredit le ruling du 06/09 ; Salvatore reste seul de son registre |

**Reco : A**, **avant la campagne de portraits du lot 6**. Le lot 6 attache le portrait au **nom** (« la clé
d'attribution est le nom, jamais l'archétype ») : changer les noms après les portraits oblige à tout refaire.

### 2.3 Par catégorie : forme, nombre nécessaire, noms canon à garder

| catégorie | forme servie (proposée) | nombre nécessaire | canon à garder | notes |
|---|---|---|---|---|
| **lieutenant** | `{prénom}` stocké dans `name` ; chip `Lt. {prénom}` (glossaire 15 : « Lt. » seulement en chip) | **48** (lot 6 : 24 → 48) ; unicité par équipe, déjà codée | **Salvatore** (maquette ⑦), **Nestor** (clé servie, maquette du labo) | prénoms d'adultes nés entre 1940 et 1970 ; environ un tiers de prénoms féminins (aucun accord, D13) ; au besoin, un **surnom** en plus (`'o …`), à trancher avec le ton |
| **dealer** | `{prénom}` (forme servie `game.fiction.dealer.name`, inchangée) | **18** servis ; le plafond de dealers par joueur n'a **pas été trouvé** dans les constantes (à mesurer avant de fixer le nombre) | — | **diminutifs** de rue, plus jeunes (nés entre 1965 et 1975) : Lello, Nando, Ninetta… ; ne pas recouper les prénoms de lieutenants (règle déjà codée) |
| **bâtiment** | `{enseigne} — {district}, îlot {bloc}[, n° {rang}]` (servie, inchangée) ; l'enseigne = **métier en français + nom de famille** | **72** = 6 × 12 types (servi) | les enseignes **sans nom propre** : Laverie du Quai, Consigne de la Threnny, Pépinière du Verre, Serres du Treillis, Change du Verre, Café du Quai, Remise du 3 | seul le nom de famille change de registre ; les métiers restent ceux de 1B (pas de « cybercafé », pas de « téléphonie mobile ») |
| **nœud de filière** | **pas de nom propre** : un nœud **est** un bâtiment (`laundering_nodes.building_id`) ⇒ le back sert au nœud le `name_i18n` **de son bâtiment** (`buildingNameRef` existe) | **0 nom neuf** | — | les quatre mots de la maquette (« Le comptoir », « La blanchisserie », « Le garage », « Le notaire ») sont des **exemples** : ils tombent si l'enseigne est servie (TD-610) ; les nœuds du canon sont bar, restaurant, comptable, coopérative de taxis (GDD 04a, Stage 3) |

### 2.4 Hors des quatre, à noter (sans échantillon)

- **Avocats** (14, `Maître {nom}`) : même question de ton ; avec A, des noms napolitains **de notable** (Maître
  Sanseverino…) — à écrire avec la liste complète.
- **Chefs rivaux** (4, lot 6) et **le Don** : un nom, aucun visage. Hors de cette commande.
- **Candidats au recrutement** : gabarit anglais `Saltline Candidate #n` / `Defector Contact (…)` ⇒ ils tireraient
  leur nom dans le réservoir des lieutenants **dès la candidature**. Sinon, le nom affiché change à l'embauche.
- **Précincts** : `Précinct {n}` (table 51). Le numéro suffit ; pas de nom propre.

### 2.5 Quatre règles pour le back (signalées, pas écrites ici)

1. Les répliques en dur (Hara ×2, Nestor ×1) prennent le nom réel en paramètre `{lieutenant}` ; la clé garde son slug.
2. Un seul module de hachage (`nomPour…`) au lieu de quatre copies (mesuré : « each one copies the same hash function »).
3. Le rétro-remplissage des noms stockés se lance une fois par base, et se mesure par comptage, jamais par valeur.
4. Le nœud de filière sert `building_id` + `name_i18n` (TD-610).

---

## 3. Échantillon — 10 par catégorie, TOUT EST PROPOSÉ (option A)

Contraintes appliquées : aucun nom de clan réel ni de personne publique (liste d'exclusion dans
`controle-52-noms.py`, contrôlée) ; aucun recoupement avec les réservoirs servis (pour qu'un mélange reste lisible) ;
aucun nom de fiction célèbre (Gomorra, Les Soprano, Le Parrain) ; pas de doublon entre catégories.
⚠️ La liste d'exclusion est **la mienne** (noms de clans et de figures connus), pas un registre : elle est à
revérifier avant la liste complète. Un nom de famille courant peut être porté par des personnes réelles ; la règle
du GDD vise une **personne** identifiable, pas un patronyme.

### 3.1 Lieutenants (prénom ; chip « Lt. {prénom} »)

| # | nom | statut | note |
|---|---|---|---|
| 1 | Salvatore | canon (maquette ⑦) | gardé |
| 2 | Nestor | canon (clé servie) | gardé ; pas napolitain, mais servi : un étranger dans l'équipe |
| 3 | Gennaro | proposé | |
| 4 | Carmine | proposé | |
| 5 | Assunta | proposé | |
| 6 | Ciro | proposé | |
| 7 | Nunzia | proposé | |
| 8 | Raffaele | proposé | |
| 9 | Immacolata | proposé | chip possible « Lt. Titina » (diminutif) si la place manque |
| 10 | Pasquale | proposé | |

### 3.2 Dealers (diminutif ; forme servie `{prenom}`)

| # | nom | statut |
|---|---|---|
| 1 | Lello | proposé |
| 2 | Nando | proposé |
| 3 | Ninetta | proposé |
| 4 | Peppe | proposé |
| 5 | Titti | proposé |
| 6 | Gigino | proposé |
| 7 | Rosetta | proposé |
| 8 | Mimmo | proposé |
| 9 | Carmela | proposé |
| 10 | Tonino | proposé |

### 3.3 Bâtiments (enseigne ; le nom servi complet ajoute « — {district}, îlot {bloc} »)

| # | type | enseigne | statut |
|---|---|---|---|
| 1 | front_shop | Pressing Improta | proposé |
| 2 | front_shop | Tabac-Presse Capuozzo | proposé |
| 3 | cash_safehouse | Garde-meubles Vitiello | proposé |
| 4 | stash | Cave Sannino | proposé |
| 5 | lab | Mécanique Tufano | proposé |
| 6 | refinery | Distillerie Carotenuto | proposé |
| 7 | distribution_hub | Transports Formisano | proposé |
| 8 | office | Cabinet Iannone | proposé |
| 9 | dealer_spot_front | Billard Balzano | proposé |
| 10 | money_holding | Change Scognamiglio | proposé |

Exemple servi complet : « Pressing Improta — La Lisière, îlot 12 ».

### 3.4 Nœuds de filière (aucun nom neuf : l'enseigne du bâtiment qui porte le nœud)

| # | étape (`stage_index`) | nœud du canon (GDD 04a) | ce que le joueur lirait | statut |
|---|---|---|---|---|
| 1 | 1 | boutique de façade | Laverie du Quai — Les Bassins, îlot 4 | proposé (enseigne servie) |
| 2 | 1 | boutique de façade | Pressing Improta — Quai-Nord, îlot 9 | proposé |
| 3 | 2 | sortie de la façade | Tabac-Presse Capuozzo — Orsel, îlot 2 | proposé |
| 4 | 3 | restaurant | Trattoria Vitiello — Le Treillis, îlot 7 | proposé (type « restaurant » : pas d'enseigne servie, à écrire) |
| 5 | 3 | bar | Bar Sannino — Marne-Basse, îlot 3 | proposé |
| 6 | 3 | comptable | Cabinet Iannone — Place des Comptes, îlot 5 | proposé |
| 7 | 3 | coopérative de taxis | Taxis Formisano — Pont-Gris, îlot 1 | proposé |
| 8 | 3 | bar | Café Tufano — Saint-Brand, îlot 6 | proposé |
| 9 | 4 | dépôt d'argent propre | Change Scognamiglio — Le Verre, îlot 2 | proposé |
| 10 | 4 | dépôt d'argent propre | Change du Verre — La Chancellerie, îlot 8 | proposé (enseigne servie) |

⚠️ Les enseignes « Trattoria », « Bar », « Taxis » supposent des **types** de bâtiment que le catalogue n'a pas
(12 types servis ; le GDD en nomme plus). Un nœud posé sur un type servi prend l'enseigne de ce type. Les numéros
d'îlot ci-dessus sont des **exemples**.

---

## 4. Ce qui reste à trancher par l'user

1. **Le ton** : A (tout napolitain), B (mélange de port) ou C (garder le servi). Reco A, avant les portraits.
2. **Surnoms** (`'o …`) pour les lieutenants : oui ou non. Ils rendent le napolitain mais allongent les chips.
3. **« fin 80 » ou « fin 90 »** (lot 6) : sans effet sur les noms, avec effet sur les objets.

Tout le reste est mesuré ou déjà tranché par un registre. Après le choix de ton : liste complète (48 + 18 + 72, plus
14 avocats si A), avec la même vérification.
