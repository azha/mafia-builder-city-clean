# ⑦ Le lieutenant et ⑧ L'ordre permanent — inventaire de la maquette, l'art qui existe, les mots, et pourquoi il faut re-ratifier

> Atelier / DA, 2026-09-23 (01:40). Côté atelier seulement : **CLIENT-2 fera l'écart avec le contrôleur.** Aucun rendu.
> **Cadre cité** : `ecrans-brennar.html` (série 1) cadre **1** « Lieutenant — fiche + formulaire » — ⑦ en haut (la fiche), ⑧ en bas
> (le formulaire d'ordre) — atelier `0ccd8d5`. **Image ratifiée** : `Tools/juge-visuel/lieutenant/ecran-canon.png` (900×1752, `fe00b0a1`,
> 2026-08-25). **Juge-données du 25/08** : `Tools/juge-donnees/lieutenant/maquette-2026-08-25/rapport.md` (E1-E21, L1-L10). Back `4841d7ad`
> (`string_table.ts` lu **registre par registre**, `lieutenant.projection.service.ts`). Client : cumul `443489ec` et arbre F `b82c3b9e`.
> ⚠️ ⑦ et ⑧ n'ont **pas de ligne dans l'INDEX** (la TABLE les range comme « sections du même contrôleur » que ⑥) : leur premier dossier
> de juge demandera une ligne, avec ce cadre et cette image.

---

## 1. Les blocs du cadre

| bloc | écran | nature | source dans la maquette |
|---|---|---|---|
| **le fond** : la ville de nuit, floutée | ⑦ ⑧ | **ART** (image) | `.ville.fond-ville` : PNG embarqué dans un `<style>` **en fin de page** (`ecrans-brennar.html:372`), `cover`, `center 40%`, `blur(7px) brightness(.5) saturate(.85)` (`:27`) |
| le voile | ⑦ ⑧ | CSS | `.voile` (`:29`), dégradé radial 0,72 → 0,95 |
| l'en-tête : retour, nom, « archétype · mode · effectif » | ⑦ | CSS + mots | `.tete`, `.retour`, `.sous` |
| le portrait : médaillon + buste, surnom, « lieu · ancienneté » | ⑦ | CSS + **ART** (buste) | `.portrait .medl` (`:88`), `<use href="#buste-fedora">` |
| la grille : loyauté · autonomie · signal | ⑦ | CSS + mots | `.grille` |
| les caractéristiques : curriculum (barre), probation, préfère, rejette, veto | ⑦ | CSS + mots | `.carac`, `.cbar` |
| l'ordre permanent : segmenté à 3 verbes, un segment éteint + sa raison | ⑧ | CSS + mots | `.segmente` (`:98-100`) |
| la cible : un sélecteur | ⑧ | CSS + mots | `.selecteur` |
| la durée : une glissière | ⑧ | CSS | `.glissiere` (`:104-109`) — position codée en dur à 62 % |
| « SIGNER L'ORDRE » · « Relever de ses fonctions » | ⑧ ⑦ | CSS (le tampon de la doctrine) | `.cta` (`:110`, `:172`), `.cta.secondaire` (`:112`, `:176`) |

⇒ **Deux blocs d'art : le fond et le buste.** Le reste est du CSS. Couleurs CSS = **sRGB**.

---

## 2. L'art

### 2.1 Le fond : `DISTRICT_ZO_NUIT_FINAL.png` — il EXISTE, et sa version 1080×2400 aussi ; aucune n'est dans le client

Preuve par les pixels (`apparier-fond-maquette.py`, étendu ce soir aux sélecteurs complets, ici `.fond-ville`) :

```
fond `.fond-ville` de ecrans-brennar.html : 1080x1920, 3040151 octets
contrôle POSITIF (le fond contre lui-même) : 0.00/255
  p2_fonds/VERGE_D_NUIT_FINAL.png      1080x1920  écart gris  34.08/255
  DISTRICT_D_NUIT_FINAL.png            1080x1920  écart gris  35.33/255
  DISTRICT_ZO_NUIT_FINAL.png           1080x1920  écart gris   0.00/255  échelle 1.000  boîte source (0, 0, 1080, 1920)
meilleur : DISTRICT_ZO_NUIT_FINAL.png  — vérification RVB 0.00/255 ; VOISINS 9.66 et 6.22 ; NÉGATIF (VERGE_D_JOUR_FINAL) 61.25
```

| | |
|---|---|
| source | `~/project/atelier3d-mafia/DISTRICT_ZO_NUIT_FINAL.png` — 1080×1920, 3 040 151 octets, sha256 `a8418765cededbf5…`, commit `22af573` (2026-08-20). **Embarqué tel quel** (0,00 : pas même un ré-encodage). |
| **la version d'écran** | `Tools/fal/generees/2026-09-06/decors/DISTRICT_ZO_NUIT_1080x2400.png` (client, non monté) — mesuré : ses **1920 px du bas sont la source à l'identique** (écart 0, max 0) ; les 480 px du haut sont l'extension de la campagne du 06/09 (`MANIFESTE-MONTAGE.md` §5). ⇒ **montable tel quel, à la résolution native du téléphone.** |
| dans le client | **non** : aucun fichier sous `Assets/` de l'arbre F n'a ce sha256 ; le client n'a que `VERGE_D_*` (une autre image : 34,08). |

⚠️ **Ce fond se voit à peine** : flou de 7 px, luminosité ×0,5, voile à 72-95 %. Sur l'image ratifiée, il ne reste qu'un bleu nuit presque
uni. Et **⑥, le même contrôleur, ne le dessine pas** (voile procédural seul, `LieutenantScreenController.cs:1605`, `:2295`) — son
juge r3 ne l'a pas relevé, sa référence étant une autre source. ⇒ **Même règle que les bustes : pour les quatre écrans de la série 1
(⑥ ⑦ ⑧, et le coffre / le marché qui portent le même `.fond-ville`), ou pour aucun.** C'est une décision de DA, pas un manque d'art.

### 2.2 Le buste — existe, déjà monté ; l'image ratifiée est en retard

- La maquette pose `#buste-fedora`, alias de `#buste-lieutenant` (la **capuche**) depuis `ebea368` (02/09) : c'est le bon buste, par la règle
  du rôle. Asset : `ui_element_buste_lieutenant` (256×256, `7bfd1968`), déjà lu par ⑥ et ①.
- Le médaillon porte une bordure **laiton** (`.medl`, `border:1px solid var(--laiton)`, `:41-43`), **pas** l'anneau or vif du Don
  (`.medl.don`, `:45`) : rien à retirer ici.
- ⚠️ **L'image ratifiée `lieutenant/ecran-canon.png` (25/08) montre encore le CHAPEAU** de 1950 : rendue une semaine avant la règle. Elle ne
  peut pas servir de référence au juge telle quelle (§4, point 1).

---

## 3. Les mots — registre par registre

### 3.1 Les valeurs servies que la maquette dessine : leurs mots existent

| maquette | clé servie (projection `GET /v1/lieutenants/:id`) | fr (`FR_MESSAGES`) | en (`EN_MESSAGES`) |
|---|---|---|---|
| « Comptable » | `archetype` → `famille.archetype.comptable` | Comptable | Bookkeeper |
| « Délégué » | `mode` → `famille.mode.delegue` (et `missionne`) | Délégué · Missionné | Delegated · Tasked |
| « Salvatore » | `name` (servi depuis L0.4) | *(donnée : « Lt. Hara »… du vivier de 24)* | *(idem)* |

### 3.2 Les libellés de la maquette : **aucun n'est servi, dans aucun registre** — et la plupart n'ont pas de donnée derrière

Seuls ceux dont la donnée est **servie aujourd'hui** reçoivent un mot ; pour les autres, ce qui manque est la donnée, pas le mot.

| libellé (maquette) | donnée derrière (back `4841d7ad`) | fr proposé | en proposé |
|---|---|---|---|
| Autonomie « 3/8 » | `budget_bands` : **7 catégories × 4 paliers** (servi) ; « 3/8 » n'a pas de source (E18) | **Autonomie** (le titre) ; les paliers ont déjà leurs mots (`famille.band.{plein,normal,bas,epuise}`) | Autonomy |
| Signal « Stable » | `drift_phase` (servi) : `DIRECT_ALIGNED \| DRIFTING \| INCIDENTAL_LOCKED \| RESETTING` — « Stable » n'est pas dans le domaine (E21) ; **le client n'a aucun mot** pour ces 4 valeurs | **Signal** · à l'écoute · dérive · n'écoute que le terrain · se recale | Signal · listening · drifting · only reads the street · resetting |
| Ordre permanent (état) | `standing_order.freshness` (servi depuis le 25/08) : `NONE \| FRESH \| EXPIRES_SOON \| EXPIRED` ; `promotion_suggested` — **aucun mot client** | aucun ordre · ordre frais · expire bientôt · expiré ; « en faire la règle ? » (pour `promotion_suggested`, geste `PROMOTE_TO_DEFAULT`) | no order · fresh order · expires soon · expired ; “make it the rule?” |
| SIGNER L'ORDRE | `POST /v1/lieutenants/:id/standing-order` (existe ; prend du DSL, pas un verbe) | SIGNER L'ORDRE | SIGN THE ORDER |
| Loyauté « 82 % » | `loyalty_seed_bucket` **non projeté** (L1) ; un pourcentage est interdit (P5, E17) | — (pas de donnée) | — |
| Caractéristiques · Curriculum « 8/12 » | `hidden_curriculum.uniform_tells` : 4 indices binaires, servis par `GET /v1/me/reputation`, **pas** sur la fiche (E19) ; ㊲ les montre déjà (« col ouvert », « manches basses »…) | — (la donnée vit sur ㊲) | — |
| Probation « ACCOMPLIE » | aucune colonne (E11) | — | — |
| Préfère · Rejette | `lieutenant_task_exposure` : **0 écrivain** (E5, E6) | — | — |
| Veto « Aucun en cours » | `veto_assignment` : **0 écrivain** (E7) | — | — |
| Collecte · Blanchir · Surveiller | aucun domaine : la route prend un script DSL (E12, L9) | — | — |
| Cible « Lavomatic du bloc médian » | `target_entity_id` écrit en **constante inerte** (E15) ; la forme de nom servie est `{enseigne} — {district}, îlot {block}` | — | — |
| Durée « 12 jours » | `duration_class` **ignoré** par la route (E16) | — | — |
| Relever de ses fonctions | **aucune route** (S4-f) | — | — |
| « Sal » · « LE VERGE » · « DEPUIS 34 JOURS » | surnom : aucune colonne (E10) ; lieu : non projeté (E2) ; ancienneté : `recruited_at` non projeté, et des jours bruts sont interdits (P5) — `tenure_bucket` est servi et le client a ses mots (« Récent » … « Enraciné », `FamilleLabels.cs:137-141`) | — | — |

- **Proposé, pas ratifié** : les 4 mots de `drift_phase` et les 4 de `freshness`. « n'écoute que le terrain » dit `INCIDENTAL_LOCKED` : le
  lieutenant ne suit plus que les signaux du terrain (heure, voisins, territoire, ressources — les 5 `cue_bands`), plus vos ordres.

### 3.3 Au back : 48 clés `famille.*` dont la valeur FR est de l'anglais

`FR_MESSAGES` porte 48 clés `famille.*` à slug anglais (`famille.archetype.bookkeeper = 'Bookkeeper'`, `famille.band.full = '[####] Full'`,
`famille.category.laundering_flow`, `famille.grantedrole.delegated_owner`, `famille.mode.tasked`…), jumelles des clés à slug français
qui, elles, sont traduites. **Aucune n'est demandée aujourd'hui** (mesuré dans les deux arbres client : les libellés passent par des
littéraux français, `Libelle.ParValeur` n'est pas appelé sur `famille`). Ce sont des orphelines — et un piège : le jour où un écran
dérivera sa clé de la VALEUR servie (`ParValeur`, `a1abef8a`), un joueur français lira « Bookkeeper ». À retirer au lot i18n.

---

## 4. ⚠️ Pourquoi il faut re-ratifier ⑦ et ⑧ — ce qui a changé depuis la maquette du 25/08 (pour l'user)

La maquette et son image ont été ratifiées le **25/08**, contre un back qui ne servait que 67 messages anglais. Depuis, des **décisions**
ont été prises et des **valeurs** sont servies qu'elles ne connaissent pas. Chaque ligne est mesurée.

| # | ce qui a changé | depuis | ce que la maquette montre | ce qu'il faudrait montrer |
|---|---|---|---|---|
| 1 | **Le buste** : les silhouettes vont par RÔLE, ère 2000-2010 | décision 02/09 (`7bfd196`) | l'image ratifiée : le **chapeau** de 1950 (le HTML, lui, est déjà passé à la capuche) | la capuche — l'image est à re-rendre |
| 2 | **L'anneau or vif** est la marque du Don seul | décision 02/09, confirmée le 22/09 | rien à changer : le portrait a une bordure laiton | — (vérifié) |
| 3 | **Les noms** : les lieutenants s'appellent par le vivier servi (« Lt. Hara », « Lt. Sallo »…) | `name` projeté (L0.4) | « Salvatore » et le surnom « Sal » | le nom servi ; **le surnom n'a pas de colonne** : il disparaît, ou il faut une colonne |
| 4 | **Pas de scalaire brut** (P5) : loyauté, autonomie, curriculum, ancienneté en jours | règle du canon, relevée le 25/08 (E17-E20) | « 82 % », « 3/8 », « 8/12 », « depuis 34 jours », « 12 jours » | des **paliers** : `budget_bands` (7 × 4), `tenure_bucket` (5), `uniform_tells` (4 indices, sur ㊲) — la loyauté n'est pas servie du tout |
| 5 | **Le signal** a un domaine fermé à 4 valeurs, et « Stable » n'en fait pas partie | E21 | « Stable » | une des 4 phases (§3.2) |
| 6 | **Ce qui est servi depuis le 25/08 et que la maquette ignore** | lots P3 (flag discipline), ordre permanent | rien | `trust_budget_bucket` (la réserve de confiance, déjà sur ⑯), `flag_frequency_band` (« signale souvent… », sur ⑯), `standing_order.freshness` + `promotion_suggested`, `rule_count_band`, les effets de l'ancienneté (coût de révision, perturbation, bonus) |
| 7 | **⑧ tel qu'il est construit n'est pas dessiné** : le client livre un éditeur de règles DSL (jetons `TIME`, `LIFECYCLE`…, le cycleur `AND_IF` « aucune », les cadenas « 🔒 palier {n} » / « 🔒 pas encore », `a3404347`) | construit (`LieutenantScreenController.cs:186`, `RuleModel.cs`) | un segmenté à 3 verbes, une cible, une durée — **aucun des trois n'a de donnée** (E12, E15, E16) | **à trancher** : ratifier l'éditeur DSL construit (et le dessiner), ou commander le formulaire à 3 verbes **et** son domaine au back (L9) |
| 8 | **Les gestes** : la maquette a un bouton sans route, le back a des routes sans bouton | S4-f ; routes livrées | « Relever de ses fonctions » (aucune route) | les routes sans CTA : réaffecter (construit, dialogue en français `f1bcd5d3`), renouveler / révoquer / rendre permanent l'ordre, décisions d'autonomie et de signal, confier une catégorie |
| 9 | **Les noms de lieux** ont une forme servie | `buildingNameRef` (02/09) | « LE VERGE », « Lavomatic du bloc médian » | `{enseigne} — {district}, îlot {block}` — et « lavomatic » n'est pas une enseigne servie |
| 10 | **La langue visuelle** : la série 1 précède le registre des séries 4/6 (le comptoir, les scènes, les mots de la maison) et le chrome du shell (bandeau ARGENT · CHALEUR · JOUR, dock) | séries 4 (25-26/08) et 6 (03/09) | un en-tête « ‹ SALVATORE » sans chrome, un fond de ville flouté | au minimum le chrome réel ; le reste est un choix de DA |

**Ce que l'user a à décider** : (a) redessiner ⑦ autour des valeurs **servies** (lignes 3-6, 9) — c'est un travail d'atelier, chiffrable ;
(b) pour ⑧, **quel écran on ratifie** : l'éditeur DSL qui existe, ou le formulaire à 3 verbes qui n'a pas de back (ligne 7) ; (c) le fond
de ville pour toute la série 1, ou pour aucun écran (§2.1).
