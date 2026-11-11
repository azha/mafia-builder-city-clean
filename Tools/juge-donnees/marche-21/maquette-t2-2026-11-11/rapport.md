# Juge données ⊥ — ㉑ Le marché — maquette — TOUR 2 BORNÉ — 2026-11-11

Maquette épinglée : `/home/erutheone/project/atelier3d-mafia-C1` @ `e364496faf8cf0491ce565117bd9208c3d432d1c`
(parent `4ae50cca`), `ecrans-brennar-6.html` — 2 661 973 octets, 6 907 lignes, **155 cadres** (`<div
class="cadre">`), copie dans `mesures/maquette-e364496.html`.
Back : `lot/marche-mots` @ `163402f11591f8a321fe67ab0c2df4e3f1b64fdc` — **lecture du code seulement,
toute ligne de B porte DÉDUIT** (la pile locale ne porte pas ce lot ; aucun corps de réponse mesuré).
Cadres repérés par le libellé de l'étiquette, index 0-based vérifiés : 101, 102, 103, 104, 105, 106,
146 (`mesures/index-cadres.txt`).

## VERDICT : **RATIFIABLE**

Les quatre corrections déclarées sont **mesurées et tenues**, et la régression est négative : les
12 lignes changées n'introduisent aucune information sans source. Trois écarts sont **consignés**
(aucun ne touche les quatre points ; deux sont antérieurs à la correction, un est le choix d'écriture
du cadre 106).

## Les cinq points

| # | verdict | preuve |
|---|---|---|
| **P1** | **VÉRIFIÉ** | **0 case ash allumée sur 84** dans les cadres 101-106 + 146 (grille de région du 104 comprise) : `mesures/mesure-ash.py` → `mesures/mesure-ash.txt`, `rc=0`, « TOTAL cases ash AVEC .on = 0 », chaque case ash dessinée `[class="vy"]` sans style en ligne. 11 `.vy.on` au total, toutes en colonne 0 (brindle) ou 1 (crick). **Contrôle négatif** : `mesures/controle-negatif/` (un `on` injecté dans la 4ᵉ `.vy` de la 1re rangée) → `rc=1`, « ash AVEC .on = 1 ». CSS : `.mar6 .vy{…background:#16191b…}` et `.mar6 .vy.on{…}` sont les **seules** règles touchant `.vy` (8 occurrences = 2 blocs `<style>` identiques, `mesures/css-mar6-vy-complet.txt`) — aucune ne peut allumer une case sans `.on` + fond en ligne. Libellé : `marche.titre.hors_du_tableau` = `'HORS DU TABLEAU'` (`string_table.ts:3331`, FR) et `'OFF THE BOARD'` (`:361`, EN) ; **dessiné, à l'octet**, 1 occurrence dans tout le fichier, cadre 146 `div.pt > b` : `LE VERRE · HORS DU TABLEAU` (`mesures/compare-mots.txt:74-76`) |
| **P2** | **VÉRIFIÉ** | `div.pt` du cadre 146 = **1 `<i>`, 1 `<b>`, 1 `<small>`** (`mesures/compare-mots.txt:72-73`). Le `<small>` est **exactement** `marche.phrase.case_ash` (`string_table.ts:3324`), U+00A0 avant « : » compris (`compare-mots.txt:80-82`). Les textes retirés par les mots ratifiés sont absents de **toute** la maquette : `'UNE LIGNE QUI TIENT'` **0**, `'une ligne qui tient'` **0**, `'Le tableau dit seulement si la ligne'` **0**, `'jamais ce qu'elle vaut'` **0** (`mesures/P2-retraits.txt`) |
| **P3** | **VÉRIFIÉ** | Cadre 101, `div.bulle > p` : `'3 lignes sur 72. Le reste, personne des nôtres n'y a jamais traité.'` = **à l'octet** la branche `other` de `marche.phrase.bilan_lignes` (`string_table.ts:3323`) avec `n=3`, `{total}=72` (`compare-mots.txt:66-69`) ; `'Trois lignes sur soixante-douze'` : **0** occurrence. Balayage des nombres en lettres sur les 5 cadres du périmètre (`mesures/balayage-nombres.txt`, 22 occurrences) : dans l'écran (`div.tel`), **aucun** nombre en lettres là où une clé le rend en chiffres — « deux sources », « une rumeur », « zéro », « un dealer » sont les valeurs ratifiées elles-mêmes (contrôles positif/négatif d'appartenance : 12 sondes, toutes conformes) ; restent « trois mesures de plus » (cadre 106, **aucune clé ne rend ce texte** → écart E-b) et l'étiquette du cadre 101 « trois voyants sur soixante-douze » (**légende d'atelier, hors `div.tel`** → écart E-c) |
| **P4** | **VÉRIFIÉ** | `cadre 104` étiquette : `Le tableau de région — six genres d'endroit <span class="m21-hors-lot">hors lot, à venir · TD-1040</span>` ; `cadre 105` : `Le mur — vous ne dites rien, on ne dit rien <span class="m21-hors-lot">hors lot, à venir · TD-1040</span>` (`mesures/P2-retraits.txt`). Texte exact = « hors lot, **à venir** · TD-1040 » (déclaré « hors lot · TD-1040 » : la substance y est, « à venir » en plus). Contenu de 104/105 **non inventorié**. Dans le reste du périmètre, le marqueur n'apparaît pas (`m21-hors-lot=0`, `TD-1040=0`, `hors lot=0` pour 101, 102, 103, 106, 146) — **mais le cadre 106 dessine 6 textes de maillon hors lot (L2, L4) sans aucune clé** → écart E-b, lignes R25-R30 |
| **P5** | **VÉRIFIÉ (pas de régression)** | `git diff --numstat 4ae50cca e364496` → **`7 5 ecrans-brennar-6.html`** = **12 lignes, 1 fichier**, 5 hunks (`mesures/diff-4ae50cca-e364496.patch`). Les seuls textes **neufs** dessinés : les 2 légendes « hors lot, à venir · TD-1040 » (marquage de P4, dans `div.etiquette`, **hors** `div.tel`), `3` et `72` (clé `bilan_lignes`), `HORS DU TABLEAU` (clé `titre.hors_du_tableau`). Aucun scalaire en dur neuf, aucune clé inexistante. Le compteur du cadre 104 suit la case éteinte : `03/24` → `02/24` (hunk `@@ -5656,2 +5658,2 @@`) — cohérence interne tenue |

## Écarts à consigner (maquette)

| # | information | B | M | statut | preuve (fichier:ligne / mesure) |
|---|---|---|---|---|---|
| **E-a** | espace avant « : » dans deux phrases de bande | `lane_confidence_bucket` (DÉDUIT) | cadre 102 `div.pt > small` · cadre 103 `div.pt > small` | **écart typographique, classe C** — la maquette dessine U+0020, la valeur ratifiée et le `string_table` portent **U+00A0** ; **antérieur à la correction** (le patch ne touche pas ces lignes : hunks en 5613, 5649, 5656, 5658, 6724 seulement) ; le cadre 146, corrigé, porte bien le U+00A0 | `mesures/compare-mots.txt:89-92` (divergence à l'index 108 : dessiné `' : seulement'`, attendu `'\xa0: seulement'`) et `:100-103` (index 77) vs `string_table.ts:3322` et `:3325` |
| **E-b** | les 6 textes du cadre 106 (maillons manquants L2 / L4) | aucune clé B, aucune clé i18n | M26 `L2`/`L4` · M27 « maillon manquant » ×2 · M28 · M29 « trois mesures de plus… » · M30 · M31 | **ASSUMÉ à consigner** : dessinés **dans** `div.tel > div.ecran`, sans clé (sondes `'maillon manquant'`, `'mesures de plus'`, `'hors lot'`, `'TD-1040'` : **absentes des 31 valeurs FR**, contrôle positif/négatif joint). Trou honnêtement documenté — à garder, mais il n'a ni clé ni péremption écrite | `mesures/cadre-106.lisible.html` (`div.pann > span.lot`/`i`/`b`/`small`) ; `mesures/balayage-nombres.txt` (cadre 106, « trois », clé = NON) |
| **E-c** | aucun cadre ne dessine QUELLE case le panneau décrit | — | cadre 146 : **0 `.qn.on` sur 18 rangées** alors que le panneau nomme `LE VERRE` | **consigné, antérieur** : le cadre 103 décrit déjà `LA CHANCELLERIE` sans marquer sa rangée (3 `.qn.on` = les 3 quartiers qui portent une ligne, pas la case décrite). La correction a retiré les 3 `.qn.on` du 146 avec ses cases ash — la convention « case décrite » n'existe dans aucun cadre mesuré | `mesures/P2-retraits.txt` (« .qn on par cadre » : 101/102/103 = 3, 104 = 6, 105/106/146 = 0) |

Aucun de ces trois écarts n'est un A/B sur les quatre corrections : E-a est une nuance typographique
que le **client lira depuis le `string_table`** (`string_table.ts:332` : « Aucun site back n'émet ces
clés : le client les lit seules »), E-b et E-c sont antérieurs au commit jugé.

## « Passé à côté ? » et lots back

**Non produits** : exclus de ce tour borné (dossier § TOUR BORNÉ). Les lignes `● – –` de la table
(R07-R15) sont consignées avec leur statut, sans avis d'usage ni classement.

## Actions : routes ↔ CTA

Aucune route `@Post` dans le domaine : `market.controller.ts` ne déclare que deux `@Get`
(`:60` et `:104`), `world.controller.ts` deux `@Get` (`:39`, `:50`, publiques, sans
`JwtAuthGuard`). Aucun CTA ni geste dessiné dans les 5 cadres du périmètre (l'écran est en
lecture : `div.og` sont des onglets de substance, `.og.pris` = l'onglet actif, R23). **Rien à
apparier, rien qui manque.** `market-admin.controller.ts` et `market-test.controller.ts` sont
exclus (BO/staff et `_test`).

## Table de couverture complète (périmètre : cadres 101, 102, 103, 106, 146 — sans 104/105)

Table de données : `mesures/couverture.tsv` (30 lignes, 7 colonnes).
Recompte : `python3 -I mesures/controle-arithmetique.py` → **`|B| = 15`, `|M non appariés| = 15`,
somme = 30, lignes = 30, CONTROLE OK, `rc=0`**.
Contrôle négatif : `--casser` (une clé B dupliquée) → « clé(s) B répétée(s) : ['lanes'] »,
CONTROLE EN ECHEC, **`rc=2`**.

| # | information | B (DÉDUIT) | M | statut |
|---|---|---|---|---|
| R01 | les lignes qui EXISTENT (absence = jamais observée), cardinal ≤ 72 | `lanes` | M03 « 03/72 » · M12 3 cases allumées · M14 3 quartiers marqués | ● ● |
| R02 | le quartier d'une ligne | `lanes[].district_id` | M11 rangée · M12 position | ● ● |
| R03 | la substance d'une ligne (+ forme, origine, matière) | `lanes[].substance_type` | M10 · M12 colonne · M13 couleur · M15 · M17 · M19 | ● ● |
| R04 | la confiance de la ligne (bande) | `lanes[].lane_confidence_bucket` | M12 opacité (0,54 / 0,75 / 1,00) · M05 « 01 sûres » · M20 · M21 · M22 · M23 | ● ● |
| R05 | les 18 quartiers (collection) | `districts` | M11 18 rangées · M07 « 15 quartiers noirs » | ● ● |
| R06 | le nom de fiction du quartier | `districts[].name` | M11 | ● ● |
| R07-R15 | id · index · profile · block_count · bank_side · control_state · name_canonical · precinct_id · openable_types | 9 clés de `districts[]` | – | ● – – (hors tour) |
| R16-R21 | titre · sous-titre · 3 libellés de compteur · en-tête « quartier » | – | M01 M02 M04 M06 M08 M09 | – ● libellés statiques, source = clé i18n |
| R22 | la phrase de bilan (n sur total) | – | M16 | – ● clé ICU ; `n` et `total` **dérivés** du cardinal de `lanes` et de la borne 18×4 |
| R23 | la substance choisie (onglet actif) | – | M18 `.og.pris` | – ● état d'interface, aucune source back |
| R24 | le traitement de la colonne ash | – | M24 · M25 | – ● **ÉCART ASSUMÉ** (TD-966), clés i18n |
| R25-R30 | les 6 textes de maillon du cadre 106 | – | M26…M31 | – ● **ASSUMÉ à consigner** (écart E-b) |

Rappel R2.2 : aucune clé mesurée ne déroge (les 2 valeurs non-id des `lanes` sont un enum et une
bande ; `control_state` est une bande). Les **3 scalaires** dessinés (« 03/72 », « 01 », « 15 ») sont
**dérivés côté client** du cardinal de `lanes`, de `lane_confidence_bucket` et de la borne
18 × 4 = 72 (`market.controller.ts:98`) — aucun n'est projeté par le back.

## Annexes

### 1. Routes du domaine (compte, ancres)

**2 routes joueur** sous `@UseGuards(JwtAuthGuard)` dans
`services/game-back/src/operational/market/market.controller.ts` :
- `@Get('me/market/lanes/:districtId/:substanceType')` — `:60-61`, rend `LaneConfidenceRow` (3 clés)
- `@Get('me/market/lanes')` — `:104-105`, rend `{ lanes: LaneConfidenceRow[] }` (l'énumérateur de ㉑)

**2 routes publiques** dans `services/game-back/src/citysim/world/world.controller.ts` :
`@Get('world/districts')` `:39` et `@Get('world/threnny-edges')` `:50` — **sans** `JwtAuthGuard`
(la carte est publique, `:5`). Seule `world/districts` porte une information de ㉑ (les noms).

Exclus : `market-admin.controller.ts` (BO/staff), `market-test.controller.ts` (`_test`). Le module
contient 12 fichiers (`git ls-tree -r --name-only 163402f1 -- …/market/`). 148 fichiers
`*.controller.ts` portent une route dans tout le back (`mesures/liste-controleurs.txt`).

### 2. Corps réels

**Aucun** : la pile locale ne porte pas `lot/marche-mots` et le dossier interdit de la monter. Tout
B est **DÉDUIT** des projections TypeScript et des enums/seuils cités. Voir § Non vérifié.

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | type | valeurs possibles | contrainte source |
|---|---|---|---|
| `lanes` | collection | 0 à 72 éléments ; **l'absence d'un élément = jamais observé** (jamais d'entrée neutre fabriquée) | `market.controller.ts:94-98` (« the FK to `districts` + the PK bound the table to 18 × 4 = 72 rows ») |
| `lanes[].district_id` | id (entier > 0) | les ids de `districts` | `market.controller.ts:66-69` (garde `Number.isInteger` + `> 0`) |
| `lanes[].substance_type` | enum (4) | `brindle` · `crick` · `hush` · `ash` | `db/schema/operational_chain.ts:40` — `pgEnum('substance_type', [...])` |
| `lanes[].lane_confidence_bucket` | bande (3) | `LOW` · `MODERATE` · `HIGH` | `market-projection.service.ts:38` ; seuils `:137-140` (`c >= laneCHi` → HIGH, `c < laneCLo` → LOW, sinon MODERATE) |
| `districts[].control_state` | bande (4) | `UNCONTESTED` · `CONTESTED` · `PLAYER_HELD` · `RIVAL_HELD` (jour 1 : `'UNCONTESTED'` en dur, `:96`) | `world-geography.repository.ts:58` |
| `districts[].name` | texte | nom de fiction ; **repli sur `name_canonical`** si non nommé | `world-geography.repository.ts:43-45`, `:99` |
| `marche.*` | 31 clés × 2 langues | **31 FR** (`string_table.ts:3303-3333`) + **31 EN** (`:333-363`), 62 occurrences | compte mesuré ; `:332` « Aucun site back n'émet ces clés : le client les lit seules » |

`DistrictProjection` porte **10 clés** mesurées (`world-geography.repository.ts:35-55`) — le
commentaire d'entête (`:28`) n'en liste que 7 : `name`, `precinct_id` et `openable_types` sont
additifs et absents de la liste écrite. Compte lu sur l'interface, pas sur le commentaire.

### 4. Inventaire M (Mxx → représente)

M01 titre · M02 sous-titre · M03 compteur lignes connues (`03` + `/72`) · M04 son libellé ·
M05 compteur sûres (`01`) · M06 son libellé · M07 compteur quartiers noirs (`15`) · M08 son libellé ·
M09 en-tête « quartier » · M10 4 en-têtes de substance · M11 18 noms de quartier ·
M12 72 cases de voyant (éteinte / allumée, 3 opacités) · M13 couleur de case = substance ·
M14 `.qn.on` = quartier portant au moins une ligne · M15 « substance · origine » ·
M16 phrase de bilan ICU · M17 4 onglets (substance + forme) · M18 onglet actif ·
M19 illustration de la substance · M20 titre « QUARTIER · BANDE » (102) · M21 phrase de bande (102) ·
M22 titre « QUARTIER · VOYANT ÉTEINT » (103) · M23 phrase de case sans ligne (103) ·
M24 titre « LE VERRE · HORS DU TABLEAU » (146) · M25 phrase ash (146) ·
M26-M31 les 6 textes de maillon du cadre 106.

Inventaires bruts : `mesures/M-textes.txt` (439 lignes, 5 cadres, tous les `<svg>` retirés et
**comptés** : 10/10/10/5/10 retirés, 0 restant) et `mesures/M-textes-condense.txt`.
Composition des titres mesurée identique dans les 3 cadres de détail : nom de quartier en capitales
+ « · » + libellé de clé (`DÉPÔT-EST · RECOUPÉ`, `LA CHANCELLERIE · VOYANT ÉTEINT`,
`LE VERRE · HORS DU TABLEAU`) — le 2ᵉ membre est à l'octet la valeur de clé (`.upper()` pour
`confiance.recoupe` et `titre.voyant_eteint`, déjà capitale pour `titre.hors_du_tableau`).
**26 textes conformes à l'octet, 2 écarts** (E-a) : `mesures/compare-mots.txt:108`.

### 5. Inventaire F

Sans objet (mode maquette : le front n'existe pas encore).

### 6. Non vérifié

1. **B n'a jamais été mesuré** — aucun corps de réponse. Ce qui trancherait : la pile montée **avec
   `lot/marche-mots`**, un compte jetable, `GET /v1/me/market/lanes` et `GET /v1/world/districts`
   sur compte frais puis après une transaction réelle qui « ensure » une ligne (sur compte frais
   `lanes` est probablement `[]`, et un corps vide n'est pas un ensemble de clés).
2. **Les 3 opacités de case (0,54 / 0,75 / 1,00) ↔ les 3 bandes** : l'appariement est mon **avis de
   lecture**, aucune légende ne l'écrit dans la maquette. Ce qui trancherait : une légende dessinée,
   ou le résolveur du front en clôture.
3. **Les valeurs EN** ne sont **pas** dessinées (`'OFF THE BOARD'` : 0 occurrence ; la maquette est
   FR seule). La conformité EN est vérifiée **côté `string_table` uniquement** (31 clés, `:333-363`).
4. **Les seuils `laneCHi` / `laneCLo`** sont lus par nom dans `market-tunables.ts` (non ouvert) :
   la bande est bien à 3 valeurs, mais la frontière numérique n'est pas mesurée ici.
5. **Le rendu réel** : tout est lu dans la source HTML/CSS. Aucune capture, aucun pixel compté — une
   case `.vy` sans `.on` est déclarée éteinte **sur son fond `#16191b` et l'absence de toute autre
   règle**, pas sur un pixel mesuré. Ce qui trancherait : un rendu du cadre 146 à t=0 et le compte
   des pixels de la colonne ash (le juge visuel ⊥).
6. **Les cadres 104, 105, 109, 110** : hors lot (TD-1040), contenu non inventorié. 104/105 n'entrent
   ici que par le compte des cases ash de P1 (12 cases, 0 allumée) et par leur étiquette (P4).

---

### Auto-audit du verdict

J'atteste avoir **ouvert et lu** : la maquette épinglée par `git show` (jamais l'arbre de travail),
les 7 cadres extraits par équilibrage de `<div>` (`mesures/extraire-cadres.py`), `string_table.ts`,
`market.controller.ts`, `market-projection.service.ts`, `world.controller.ts`,
`world-geography.repository.ts`, `operational_chain.ts` au SHA `163402f1`, et les mots ratifiés.
Tous les comptes de ce rapport viennent d'un script dont la sortie est dans `mesures/` ; **aucun
compte n'a été lu au terminal via `rtk read`/`cat`** (le seul affichage RTK rencontré, sur
`grep -n "marche\."`, a élidé les valeurs — d'où la relecture par `python3` + `Read`).
Les trois gardes qui décident portent leur **contrôle négatif rouge** : ash (`rc=1`),
arithmétique (`rc=2`), appartenance aux clés (12 sondes). Je n'ai lu **ni** notes d'implémentation,
**ni** rapport ou mesure de juge précédent (`…/marche-21/maquette-2026-11-11/` et
`Tools/juge-visuel/**` jamais ouverts).
Je n'ai **pas** monté, redémarré ni touché la pile Docker, ni lancé le back, ni touché une base.
