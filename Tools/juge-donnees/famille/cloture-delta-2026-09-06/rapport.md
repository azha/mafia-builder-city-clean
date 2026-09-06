# Juge données ⊥ — ⑥ La Famille — clôture en **DELTA** — 2026-09-06

> Front jugé : `front-8e982ab/Assets/Scripts/Operational/Lieutenant/` (blobs `18fd483a…` /
> `efeed89e…` / `9d8dbce1…` re-hachés, conformes à `dossier.md`). B et M non re-mesurés (mandat).
> « F avant » = le code `76ee3cc`, extrait par plomberie et re-haché (M1). Aucune stack, aucun
> test. Toutes les mesures : `mesures/commandes-et-sorties.md` + les 3 diffs.

## En une phrase

**7 lignes bougent sur 42, plus 1 ligne nouvelle** ; sur les six défauts nommés, **quatre sont
FERMÉS** (D-1, D-2/D-3/D-3b — la classe « deux résolveurs pour une grandeur » —, D-6),
**un est OUVERT** (D-1b : `name` est servi par `GET /v1/lieutenants/:id` et `LieutenantBands` ne
le déclare toujours pas — le correctif a fermé l'instance ROSTER sans repasser la classe sur les
DEUX routes qui servent `name`), et **deux DÉFAUTS NEUFS naissent dans le correctif** : ⓐ
l'archétype (`M08`, le mot que la maquette écrit dans le slot `.nom`) n'est plus affiché **nulle
part** sur l'organigramme, et le commentaire qui prétend qu'il « descend sur la ligne d'état » est
faux ; ⓑ la consolidation des résolveurs fait demander **trois clés i18n que le back ne sert pas**
et **supprime la seule clé servie pour `UNKNOWN`**, une valeur réelle du domaine projeté.

---

## Table des lignes qui bougent

| # | information | B | M | F avant (`76ee3cc`) | F après (`8e982ab`) | preuve (`fichier:ligne` / mesure) | statut |
|---|---|---|---|---|---|---|---|
| **2** | `name` (roster, `GET /v1/lieutenants`) | ● | – | **–** — champ absent du DTO, `JsonUtility` le jetait en silence | **● RENDU** — slot `.nom` de chaque rangée | `LieutenantDtos.cs:136` (`public string name;`) · `LieutenantScreenController.cs:2334-2337, 2341` · planche : « Lt. Oster / Lt. Brasse / Lt. Sallo » (M9) | `● – ●` → **à faire ratifier** (affichée sans être dessinée). D-1 **FERMÉE** |
| **3** | `archetype` (roster) | ● | ● **M08** | **●** — c'ÉTAIT le contenu du slot `.nom` (`OLD:2352`, `string nom = FamilleLabels.Archetype(row.archetype)`) | **◐ repli seulement** : rendu **si et seulement si** `name` est vide (`:2335`). Sur le corps mesuré les 3 lignes ont un `name` ⇒ **0 rendu**. Le seul autre site (`:2564`) est dans `BuildRosterRow`, qui a **0 appelant** | `:2334-2336` · M4 (`rtk proxy grep -n BuildRosterRow` → définition seule) · planche : aucun mot d'archétype sur les 3 rangs (M9) | `● ● –` ⇒ **DÉFAUT NEUF** |
| **4** | `op_state_band` (roster) | ● | ● **M10** | ● « **Repos** » — littéral **EN DUR** dans `FamilleLabels.Etat` (`OLD FamilleLabels.cs`, `case "IDLE": return "Repos";`) | ● « **Au repos** » — clé de catalogue `famille.opstate.au_repos` | `FamilleLabels.cs:120` · `:2404` · planche « Au repos » (M9) · maquette `reference-source.html:171` : `<b>Repos</b>` | triplet inchangé, **source ET mot changés** ; le mot ne colle plus à M10 |
| **8** | `archetype` (détail, `GET /v1/lieutenants/:id`) | ● | – | ● **partiel** — `ArchetypeLabel`, **7** cas ; `UNKNOWN` → clé **servie** `famille.archetype.inconnu` (« Inconnu ») ; MUSCLE/INTELLIGENCE/FACILITY_MANAGER → valeur **brute** | ● — `FamilleLabels.Archetype`, **9** cas, **mais** : `UNKNOWN` n'appelle plus `Libelle.De` du tout et rend « **Unknown** » ; et 3 cas neufs demandent `gros_bras` / `renseignement` / `intendant`, **absentes des deux bundles** | `:866` · `FamilleLabels.cs:38-56` · `Libelle.cs:51-72` (la clé est le **slug du littéral**) · `string_table.ts` : `.inconnu` PRÉSENTE, les 3 autres ABSENTES (M7) · `lieutenant.projection.service.ts:83,242,492` (`UNKNOWN` est une valeur réelle) | F change de source ⇒ **DÉFAUT NEUF (i18n)** |
| **10** | `mode` (détail) | ● | – | ● `ModeLabel` (`OLD:855`) → `famille.mode.delegue` / `.missionne` | ● `FamilleLabels.Mode` (`:870`) → **les mêmes deux clés**, les mêmes deux mots | `:870` · `FamilleLabels.cs:71-86` · M7 | source changée, **rendu strictement identique** — signalée pour l'exactitude, sans effet observable |
| **11** | `op_state_band` (détail) | ● | – | ● `OpStateLabel` (`OLD:857`) → `famille.opstate.*` | ● `FamilleLabels.Etat` (`:872`) → **les mêmes 4 clés**, les mêmes 4 mots | `:872` · `FamilleLabels.cs:115-125` · M7 | source changée, **rendu identique** |
| **18** | `reassign_availability` | ● | – | **–** — **0 site** dans tout `Assets/Scripts` (M6, contrôle positif à l'appui) | **● LOGIQUE** — garde de `ReassignChosen` : un POST est refusé côté client si la valeur est explicitement ≠ `AVAILABLE` | `LieutenantDtos.cs:100` · `:589-594` | `● – ●` → D-6 **FERMÉE** (voir la réserve au verdict) |

### Lignes nouvelles

| # | information | B | M | F avant | F après | preuve | statut |
|---|---|---|---|---|---|---|---|
| **nouveau** | message « Ce lieutenant ne peut pas être réaffecté pour l'instant. » | ● (dérivé de `reassign_availability`) | – | n'existait pas | **● RENDU**, conditionnel | `:592` (`SetOutcome(Lib("Ce lieutenant ne peut pas être réaffecté pour l'instant."), AccentModerate)`) | `● – ●` → **à faire ratifier** (rendu sans être dessiné) — pas un défaut : sa source est la clé #18 |

### Contrôle d'arithmétique

```
lignes changées ......... 7   (#2, #3, #4, #8, #10, #11, #18)
lignes nouvelles ........ 1
lignes rapportées ....... 8
lignes de la couverture . 42
lignes NON rapportées ... 34
```
**Pourquoi les 34 autres ne peuvent pas avoir bougé** — ce n'est pas une déduction, c'est de la
byte-identité : le delta compte **11 hunks** dans `LieutenantScreenController.cs` (plages
anciennes en M2) et **2 hunks** dans `FamilleLabels.cs` (`Archetype`, `Mode`, `Etat`) ; tout le
reste des 5 fichiers est bit-identique, et `git diff --name-only 76ee3cc 8e982ab` ne liste aucun
autre fichier qu'une ligne de couverture de ⑥ référence. J'ai ré-ancré une à une les ancres de la
couverture précédente sur les décalages de hunk (`+15` puis `+1` puis `−24` puis `−16` puis `−10`)
et elles retombent toutes sur le même contenu : `:2431→2421` (#1), `:2369→2359` (#6),
`:853→868` (#9), `:864→879` / `:2684→2674` (#13), `:867→882` (#14), `:869→884` (#15),
`:871→886` (#16), `:873→888` (#17), `:2948-2966→2938-2956` (#25), `RefreshFamilySubtitle
:1617→1593` (#32), `:2300→2276` (#33), `:2308/2314→2284/2290` (#34), `:2425→2415` (#37),
`:2481→2471` (#39), `:1874→1850` (#42). **Déplacement d'ancre seul ⇒ non rapporté.**

---

## Défauts de la clôture précédente — FERMÉ / OUVERT / DÉPLACÉ

> ⚠️ `dossier.md` **nomme** les défauts sans les décrire, et le rapport précédent est hors mandat.
> Je les ai identifiés par une source autorisée et vérifiable : **les sujets des trois commits**
> (M3), qui portent « D-1 », « D-2/D-3/D-3b » et « D-6 » en toutes lettres. **D-1b n'est
> revendiqué par aucun commit** — je le traite ci-dessous par sa classe, et je dis explicitement
> ce qui reste DÉDUIT.

### D-1 — `name` servi par le roster et jeté par le client — **FERMÉ (INSTANCE)**
Le DTO déclare le champ (`LieutenantDtos.cs:136`), la rangée l'affiche
(`LieutenantScreenController.cs:2334-2337`), la planche montre trois noms distincts au lieu de
« Cuisinier » trois fois (M9). **C'est l'INSTANCE qui est fermée, pas la classe** — voir D-1b.
★ Le DTO juste existait déjà dans le dépôt : `DelegationDtos.cs:224` déclarait `name`, avec la
docstring « ⚠️ `name` est bien SERVI ici (« Lt. Vesk ») » (`:217-219`). *Le bon outil à portée ne
se choisit pas tout seul.*

### D-1b — la même classe sur le DÉTAIL — **OUVERT**
`GET /v1/lieutenants/:id` sert `"name": "Lt. Oster"`
(`corps-reels/GET_lieutenants_id.json`, `payload.data.name`) et le back en fait un contrat
explicite : `lieutenant.projection.service.ts:139` (« a REAL varchar(64) column, round-tripped »)
avec sa propre falsifiable écrite aux lignes `:136-137` — *« carte.lieutenant.name ==
lieutenants/:id .name : le MÊME lieutenant doit se nommer identiquement sur la carte d'exception
ET sur son GET de détail »*.
Côté client : **`LieutenantBands` ne déclare pas `name`** (`LieutenantDtos.cs:89-112`, oracle
Python en M5 : 0 occurrence de `public string name;` dans le corps de la classe) et `RenderBands`
(`:857-895`) n'affiche aucun nom — la fiche de détail ne nomme personne.
⇒ **Le correctif a fermé les instances que le juge nommait sans repasser la CLASSE sur la
population.** La classe est « quelles réponses servent `name`, et lesquelles de mes DTO le
déclarent ? » ; la population compte **2** routes, le correctif en a traité **1**.
*(La partie DÉDUITE : que « D-1b » désigne bien ce cas-là. Ce que je MESURE, indépendamment du
numéro : le `name` du détail est servi, non déclaré, non affiché.)*

### D-2 / D-3 / D-3b — « UN producteur par grandeur » — **FERMÉS pour la divergence**
Le commit `3e57e98` les traite ensemble ; les trois grandeurs qui portaient deux résolveurs sont
`archetype`, `mode` et `op_state_band`. Mesure :
`ArchetypeLabel` / `ModeLabel` / `OpStateLabel` → **0 occurrence** dans le contrôleur, contre 7 et
6 pour `GrantedRoleLabel` / `TenureBucketLabel` (contrôle positif, M4). Un seul producteur par
grandeur, adossé au catalogue. Le compte revendiqué « 26 appels repointés » est **exact** — recompté
sur le diff par script : **27** appels `FamilleLabels.*(` ajoutés en net, dont **1** appartient à
`33ffa6a` (le repli de nom, `:2335`) ⇒ **26** pour `3e57e98` ; et **29** occurrences des anciens
résolveurs supprimées = 26 appels + 3 déclarations. Les deux comptes se referment.
Trois réserves, toutes mesurées :

1. **La prémisse écrite de D-3b est FAUSSE.** `FamilleLabels.cs:66` affirme, à propos de `Mode`,
   « **Les deux étaient appelés** ». Mesuré sur `76ee3cc` :
   `rtk proxy grep -c 'FamilleLabels\.' OLD_LieutenantScreenController.cs` → **3**, et les trois
   sont `Anciennete:1080`, `Archetype:2352`, `Etat:2414`. **`FamilleLabels.Mode` avait ZÉRO site
   d'appel** : « DÉLÉGUÉ » / « DIRECT » n'a jamais été à l'écran. Le correctif est bon, sa
   justification est fausse — et elle est désormais **en production, dans un commentaire**, où
   elle deviendra un fait rapporté. *(La réserve symétrique n'existe pas pour l'état : là,
   `Etat` était bien appelé à `OLD:2414` ET `OpStateLabel` à `OLD:857` — la divergence
   « Repos »/« Au repos » était réelle et visible.)*
2. **4 des 26 repointages sont morts** : `:2564, :2569, :2580, :2581` vivent dans
   `BuildRosterRow`, **0 appelant** (M4). Ils ne peuvent rien fermer ni rien casser.
3. **Le correctif rouvre un défaut un cran plus bas — voir le DÉFAUT NEUF ⓑ ci-dessous.**

### D-6 — `reassign_availability` servie et lue par personne — **FERMÉE, avec une réserve**
Fermée sur ce qu'elle disait : le champ est déclaré (`LieutenantDtos.cs:100`), lu, et il arrête le
POST (`:589-594`) avec un message lisible plutôt qu'un 409. Le « 0 site avant » de la docstring
est **vérifié** (M6, avec contrôle positif).
⚠️ **Réserve, et elle est de classe** : la docstring du DTO (`:98-99`) pose la règle *« un geste
impossible qu'on laisse cliquer n'est pas une erreur de serveur : c'est une promesse que l'écran
n'avait pas le droit de faire »*. Or **le geste reste offert** : rien dans le delta ne désactive
ni ne grise le bouton de réaffectation en fonction de `reassign_availability` — seul le POST est
arrêté, après le clic. La garde est de surcroît **permissive par conception** (`:585-588` :
bandes non chargées ou champ vide ⇒ on laisse passer). ⇒ **L'INSTANCE est fermée (plus de 409) ;
la CLASSE que la docstring énonce ne l'est pas** (la promesse visuelle est intacte).

### Les défauts que le delta ne pouvait pas toucher
Tout défaut vivant hors des 13 hunks est **OUVERT, inchangé, par byte-identité** — c'est vrai
sans que j'aie à savoir son numéro. Les lignes de la couverture précédente concernées :
`#19` (`budget_bands` via un 2ᵉ GET + regex — la table le note « D-9 »), `#29`/`M05` (le nom du
Don, `B⁻`), `#34`/`M06` (le rôle du Don déplacé), `#36`/`M09` (la puce porte l'ancienneté, pas le
mode), `#38`/`M12` (`.rang.actif` sans source), `#40`/`M14` (« Voir l'équipe »), `#42`
(« Aucun lieutenant recruté » affiché sans source ni maquette).

---

## Les deux DÉFAUTS NEUFS, en clair

### ⓐ L'archétype a disparu de l'organigramme — et le commentaire qui l'explique est faux
La maquette met l'archétype dans le slot `.nom` : `reference-source.html:164, 170, 176` →
`<div class="nom">Comptable</div>`, `Sécurité`, `Blanchiment`. C'est **M08**.
Le correctif remplace ce contenu par `name` et laisse l'archétype en **repli** (`:2335`), donc
invisible dès que le serveur envoie un nom — c'est-à-dire toujours, sur le corps mesuré.
Son commentaire (`:2330-2331`) écrit : « *L'archétype reste visible — il **descend sur la ligne
d'état**, à sa place, comme qualificatif et non comme identité.* »
**Mesuré : c'est faux.** Le bloc d'état (`:2396-2419`) ne contient que
`FamilleLabels.Etat(row.op_state_band)` et le libellé `Lib("ÉTAT")`. Contrôle binaire (oracle
Python, lignes 2396-2425) : **0** occurrence de `row.archetype`, et **0** occurrence de la
sous-chaîne `archetype` toutes casses confondues ; contrôle positif sur la fonction entière
(2300-2425) : **1** — celle du repli. La planche le confirme : aucun mot d'archétype sur les trois
rangs (M9).
⇒ L'information *archétype* n'est pas perdue pour l'écran — elle survit sur la **fiche de détail**
(`:866`, ligne de couverture **#8**), qui ne s'ouvre qu'après un tap et n'est pas à l'image. Mais
la ligne de couverture **#3** (la clé `archetype` du ROSTER, dessinée en M08) passe de
`● ● ●` à `● ● –` : **disponible, dessinée, non affichée**.
*C'est le motif que le socle décrit : le défaut vit dans le correctif du tour précédent — ici, la
réparation du nom a évincé le seul porteur du mot que la maquette dessine.*

### ⓑ La consolidation des résolveurs déplace le trou dans le catalogue i18n
`Libelle.De(domaine, role, litteral)` construit sa clé en **sluggant le littéral**
(`Libelle.cs:54-56`) ; si la clé n'est pas servie, il rend le littéral et incrémente `NbReplis`.
En passant les 9 `case` de `FamilleLabels.Archetype` par `Lib()`, le correctif :
- **demande 3 clés que le back ne sert pas** : `famille.archetype.gros_bras`, `.renseignement`,
  `.intendant` — absentes de `EN_MESSAGES` **et** de `FR_MESSAGES` (M7, oracle Python, 25 clés
  `famille.*` distinctes énumérées) ;
- **cesse de demander la seule clé servie pour `UNKNOWN`** : l'ancien `ArchetypeLabel` appelait
  `Libelle.De("famille","archetype","Inconnu")` → `famille.archetype.inconnu`, **présente**
  (« Inconnu » en FR). Le nouveau résolveur n'a pas de `case "UNKNOWN"` : il tombe sur
  `CasseDeTitre("UNKNOWN")` = « **Unknown** ».
  Or `UNKNOWN` est une valeur **réelle** du domaine projeté (`lieutenant.projection.service.ts:83`,
  la valeur de `NEUTRAL_LIEUTENANT_BANDS` à `:242`, le repli de `archetypeBand()` à `:492`).
  ⇒ un lieutenant à `role_id` non mappé affiche désormais un mot **anglais** sur un écran français,
  là où le catalogue avait la réponse.
- **Et la garde ne peut pas le voir.** `RendreTousLesLibelles` (`:948-957`) est le crochet qui
  « rejoue CHAQUE résolveur sur CHAQUE valeur de son domaine » et dont la docstring (`:939-942`)
  affirme : « *les valeurs de domaine ci-dessous ont été **LUES dans les `case`** de ces
  résolveurs* ». **Cette affirmation est maintenant fausse** : le résolveur appelé a **9** `case`,
  le crochet en énumère **6** (+ `UNKNOWN` + une sentinelle). `MUSCLE`, `INTELLIGENCE` et
  `FACILITY_MANAGER` **entrent dans la population et n'y contribuent rien** — les 3 replis neufs
  sont exactement les 3 que la garde « zéro repli » ne peut pas atteindre.
- **Effet arithmétique prévisible sur le plancher d'appels** : sur la famille archétype, le crochet
  faisait **7** appels à `Libelle.De` (6 + `UNKNOWN`) et n'en fait plus que **6** (`UNKNOWN` et la
  sentinelle ne passent plus par `De`). ⇒ `Libelle.NbAppels` baisse de **1**. La docstring `:945-947`
  prévoit de *relever* le plancher quand la méthode grossit ; personne n'avait prévu qu'elle
  **maigrisse à longueur constante**. Non exécuté (aucun PlayMode dans mon mandat) — c'est une
  prédiction, et la mesure qui trancherait est écrite en « Non vérifié ».

---

## Ce que je n'ai PAS pu vérifier

1. **Aucun run.** Ni PlayMode, ni stack, ni `curl`, ni compilation. Tout verdict ci-dessus est de
   la lecture de code + la planche + les corps commités. En particulier :
   - la baisse de 1 sur `Libelle.NbAppels` (ⓑ) est **prédite, non exécutée**. La mesure qui
     trancherait : lancer le test de bundle réel (`BundleReel_…_ZeroRepli`) et lire le compteur
     d'appels et `DernierRepli` ; et, pour les 3 clés absentes, ajouter
     `FamilleLabels.Archetype("MUSCLE"/"INTELLIGENCE"/"FACILITY_MANAGER")` au crochet — ce qui
     doit faire **rougir** la garde. *Une garde qui reste verte après cet ajout mesure autre chose.*
   - je n'ai pas vérifié que le projet **compile** après la suppression des trois résolveurs privés.
2. **La locale réellement servie à la capture.** La planche montre « Au repos » ; or `EN_MESSAGES`
   mappe `famille.opstate.au_repos` → « Idle » et `FR_MESSAGES` → « Au repos », **et** le repli de
   `Libelle` rend le littéral « Au repos ». Le mot affiché est donc compatible avec « bundle FR
   servi » **comme avec** « clé inconnue, repli sur le littéral » : **la capture ne discrimine pas**.
   C'est exactement ce que la docstring de `Libelle.cs:61-68` annonce (« un écran entièrement non
   traduit et un écran entièrement traduit rendent le MÊME nombre de pixels valides »). Trancherait :
   `Libelle.NbReplis` sur un montage avec le bundle réel.
3. **`UNKNOWN` n'a pas été observé en jeu.** Le corps mesuré ne contient que `COOK`. Que le back
   puisse projeter `UNKNOWN` est établi par le code (`:83, :242, :492`) ; sa **fréquence réelle** ne
   l'est pas. ⓑ est donc un défaut de **domaine**, pas un défaut observé à la capture.
4. **`GET /v1/autonomy-reports` n'a aucune ligne dans la couverture précédente**, alors que
   `corps-reels/_index.json` la classe « appelée / 200 » pour le dossier ⑥ (avec ses clés
   `report_id`, `backlog_age_cycles`, `issues[].category / refused_action / decided /
   option_a|b.{label_key, effect_kind, projected_outcome}`). B est déclaré inchangé et hors de mon
   mandat delta ; **je signale le trou sans le combler** — c'est un « passé à côté ? » potentiel que
   seule une clôture complète peut trancher. Le code de cette zone est bit-identique entre les deux
   commits, donc aucun de ces champs ne peut être une ligne NOUVELLE de ce delta.
5. **Le rôle de `BuildRosterRow`.** Je mesure 0 appelant **dans ce fichier**. Une invocation par
   réflexion ou depuis un test n'apparaîtrait pas ; je n'ai pas balayé `Assets/Tests/`. Le fait qui
   décide reste : cette rangée n'est pas construite par `RenderRoster`, seul chemin d'affichage de
   l'écran (`:1827-1886`).
6. **`M08` / `M10` : je reprends la numérotation de la couverture précédente sans avoir refait
   l'inventaire M** (mandat). Je l'ai seulement **ré-ancrée** dans la source de la maquette
   (`reference-source.html:163-177`) pour être sûr de ce dont je parle : `.nom` = l'archétype,
   `.chip` = le mode, `.etat b` = l'état, `.etat span` = « État ».
7. **Écart de provenance non expliqué** : `dossier.md` annonce `LieutenantScreenController.cs`
   « +130/−87 » ; deux méthodes indépendantes donnent **+60/−70** (net, et somme des 3 commits —
   M2). Je n'ai pas trouvé de comptage qui produise +130/−87 et je ne prétends pas savoir d'où il
   vient.
8. **Je n'ai lu ni `../cloture-2026-09-06/rapport.md`, ni le rapport visuel `r2`** (interdits par
   le mandat). Le prix payé : l'identité des défauts D-x est reconstruite depuis les **sujets de
   commit** (M3) et non depuis leur énoncé d'origine ; `D-1b` en particulier reste **DÉDUIT**.

---

## Annexe — pourquoi une ligne non rapportée ne peut pas avoir bougé

Le seul risque d'un rapport en delta est de déclarer « inchangé » ce qu'on n'a pas regardé. Ici la
preuve est structurelle et non déclarative : les 5 fichiers de l'écran ne diffèrent qu'en
**13 hunks** (11 + 2), tous lus intégralement et reproduits dans `mesures/diff-*.txt` ; et un
`git diff --name-only 76ee3cc 8e982ab` (plomberie, pas `git log`) confirme qu'aucun autre fichier
référencé par une ligne de couverture de ⑥ n'a changé — en particulier
`Assets/Scripts/Operational/Delegation/` et `.../Conflit/`, ce qui rend valides les mesures de
classe faites sur l'arbre de travail.
