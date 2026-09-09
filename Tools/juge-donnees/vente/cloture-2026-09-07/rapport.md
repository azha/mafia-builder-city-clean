# Juge données ⊥ — ㉟ La vente (« les points de vente ») — clôture — 2026-09-07

> Juge à contexte vierge. Ni auteur de l'écran, ni juge visuel, ni lecteur d'un rapport précédent.
> Compte FRAIS créé pour cette passe (`mesures/00-compte.txt`) — jamais `operational_demo@…` ni
> `demo_capture@…`. Aucune route `_test`, aucun `advance`/tick. Commandes et sorties : `mesures/`.

## En une phrase

Le back sert **11 clés par dealer** ; le front en **affiche 4** (`activity_band`, `cash_band`,
`substance`, `margin_band`), en lit **1 en logique** (`dealer`, nom d'objet), en **déclare 2 sans
jamais les lire** (`addiction_loyalty_status`, `withdrawn`) et en **désérialise 0** sur les 4
dernières (`name_i18n`, `district_name`, `lek_band`, `lane_band` — absentes du DTO, donc jetées en
silence par `JsonUtility`), dont le **NOM du dealer** que la maquette met en tête de chaque rangée —
**10 défauts**, dont **2 BLOQUANTS mesurés** : l'écran affiche « aucune planque
n'existe encore » alors qu'un compte frais **en possède une** (mesuré), et le seul geste de l'écran
(`RAMASSER`) est un décor qui n'appelle rien — et n'aurait pas pu réussir, le client postant un
corps que la route refuse en 422. **9 questions « passé à côté ? »** pour l'user.

---

## Réponses aux 5 questions prioritaires du dossier

### Q1 — Les clés servies par `/v1/operational/dealers` : **DIVERGENT** (8 déclarées → **11** mesurées/établies)

f2 déclare 8 clés (`dealer · name_i18n · activity_band · cash_band · substance · margin_band ·
addiction_loyalty_status · withdrawn`). **Ce n'est plus l'état du dépôt ni, selon toute la preuve
disponible, celui du conteneur.**

**Ce que j'ai MESURÉ.** Sur compte frais, `GET /v1/operational/dealers` → **200**, corps
`{"dealers":[]}` (`mesures/03-dealers.json`). L'enveloppe porte **1 clé** (`dealers`) ; la liste est
**vide**, donc **je n'ai pas pu lire l'ensemble de clés d'un dealer par mesure directe**.

**Pourquoi je n'ai pas pu dimensionner.** Créer un dealer exige un `dealer_spot_front`
**`conversion_stage='operational'`** — je l'ai lu dans le corps de la garde, pas déduit du nom :
`selling.repository.ts:172` `eq(buildingOperationalState.conversion_stage, 'operational')`. Le
welcome grant ne donne que `lab / stash / front_shop / cash_safehouse`
(`onboarding-grant.service.ts:142-147`), et la conversion la plus courte vaut
`2 jours × 1440 min = 2880 ticks` (`conversion-tunables.ts:130` + `:444-450`) — **jamais 0**. Le
seul levier est `POST /v1/_test/citysim/advance`, que la spec de ratification emploie explicitement
et que mon mandat m'interdit (`vente_ensemble_de_cles.engine.spec.ts:88-95`, et son propre §10-14 :
« *faire mûrir une conversion demande d'avancer l'HORLOGE, et le seul levier est un seam `_test`* »).

**Ce que j'ai établi à la place — une sonde de MILLÉSIME, mesurée.** Les en-têtes ne portent aucun
tampon de build (`mesures/04-headers-dealers.txt` : ni SHA, ni date d'image ⇒ datation par en-tête
impossible). J'ai donc cherché une clé qu'un commit **postérieur** aux deux lots ㉟ ajoute sur une
route qu'un compte frais atteint :

| commit | date | ce qu'il fait |
|---|---|---|
| `a71e64a8` | 07/09 05:20 +0200 | ajoute `district_name` + `lek_band` (8 → 10 clés) |
| `ef7a4095` | 07/09 05:30 +0200 | ajoute `lane_band` (10 → 11 clés) |
| `7b0e6ea3` | 07/09 **05:38** +0200 | ajoute **`perimeter_site_count`** à `GET /v1/friction/state` |

Mesure : `GET /v1/friction/state` sur mon compte frais rend
`{friction_bucket, friction_node_count, penalty_active, perimeter_site_count}`
(`mesures/05-sonde-millesime.json`) — **`perimeter_site_count` est présente**. Ancestralité vérifiée
en plomberie, avec contrôle négatif :

```
a71e64a8 EST ancêtre de 7b0e6ea3      (git merge-base --is-ancestor)
ef7a4095 EST ancêtre de 7b0e6ea3
e6b84b9d PAS ancêtre — contrôle négatif OK
```

⇒ **L'image contient un commit strictement postérieur aux deux lots ㉟.** Les 11 clés sont donc
servies. **Statut : DÉDUIT, par sonde mesurée** — la mesure qui trancherait est un `advance` de
2880 ticks puis un `assign`, hors de mon mandat.

**Ensemble de clés établi** (source `selling.projection.service.ts:85-141`, ratifié par
`vente_ensemble_de_cles.engine.spec.ts:81-86` en **égalité d'ensembles**, pas en `contains`) :

```
addiction_loyalty_status · activity_band · cash_band · dealer · district_name ·
lane_band · lek_band · margin_band · name_i18n · substance · withdrawn        (11)
```

**Le contrôleur n'ajoute effectivement rien** : `dealers()` (`selling.controller.ts:140-144`) rend
`{ dealers }` tel quel ; `dealer()` (`:123-131`) rend l'entrée de la MÊME liste. **Cette moitié de
la déclaration f2 est CONFIRMÉE.**

### Q2 — « Brindle » : **CONFIRMÉE**

- Le back sert la **majuscule** : `substanceLabel()` (`selling.projection.service.ts:268-279`) rend
  `'BRINDLE' | 'CRICK' | 'HUSH' | 'ASH'` (type `DealerSubstanceLabel`, `:82`).
- L'enum est **fermée à la source** : `CREATE TYPE "substance_type" AS ENUM ('brindle','crick','hush','ash')`
  (`db/migrations/0017_operational_chain.sql:19`), colonne
  `substance_specialization substanceType(...).notNull().default('brindle')`
  (`db/schema/operational_chain.ts:230`). Le corps du 04/09 le confirme en valeur :
  `"substance": "BRINDLE"` (`corps-reels-04-09/GET_operational_dealers.json`).
- **La capitale d'affichage vient bien du CLIENT** : `Lisible()`
  (`SellingScreenController.cs:271-276`) fait `ToLowerInvariant()` puis remet la 1ʳᵉ lettre en
  capitale ⇒ `BRINDLE` → **`Brindle`**, exactement ce que la planche montre.
- ⚠️ **Ce n'est PAS un résolveur i18n**, et le fichier le dit lui-même (`:269-270`). Voir Q5/D6 : la
  prémisse de ce pis-aller (« 0 clé servie ») est **aujourd'hui fausse, mesurée**.

### Q3 — District et lek : **CONFIRMÉE côté BACK, RÉFUTÉE côté FRONT** (les formes F sont refermées… et non consommées)

- `district_name: string | null` (`selling.projection.service.ts:121`), alimenté par
  `nomDeDistrict(r.district_id)` (`:204`) — **le NOM de fiction, jamais l'id**.
- `lek_band: DealerLekBand` (`:125`), domaine **`'ABSENT' | 'LOW' | 'MEDIUM' | 'HIGH'`** (`:79`) —
  **4 valeurs là où le canon en pose 3**, divergence écrite en toutes lettres au-dessus du type
  (`:66-77`) et portée dans le canon par `ef7a4095`. **Confirmée.**
- Le conteneur les sert : voir la sonde de millésime de Q1.
- ⛔ **Mais le client ne les lit pas.** `DealerDto` (`SellingDtos.cs:11-20`) déclare **7 champs** et
  ni `district_name`, ni `lek_band`, ni `lane_band`, ni `name_i18n`. Balayage large (motif sans
  point, 3 fichiers de l'écran) : **0 occurrence** pour chacun des quatre
  (`mesures/11-inventaire-F.txt`). `JsonUtility` **ignore en silence** un champ non déclaré.
  ⇒ **La forme F est refermée côté back et rouverte côté écran** : la donnée arrive dans le corps et
  meurt au désérialiseur.

### Q4 — Tarif : **CONFIRMÉE côté BACK, et la maquette dessine autre chose que ce qui existe**

- `p_cents` est bien en **forme B** — la colonne a un écrivain (l'INSERT de graine), la
  **transition** n'est jamais écrite. Le back le porte désormais dans son propre code :
  `lane-clearing-zone.ts:19-25` (« *un seul écrivain de production, l'INSERT de graine (`ensureLane`,
  `onConflictDoNothing`), et AUCUN UPDATE nulle part ; les deux lanes de la base de dev valent
  exactement la graine* ») et `selling.projection.service.ts:130-136`. **Confirmée.**
- La clé livrée à la place est bien **`lane_band`**, domaine
  **`'FAST' | 'STEADY' | 'SCATTERED'`** (`lane-clearing-zone.ts:31`), résolue par `zoneDeLane(c, tRefractory)`
  (`:33-39`) — seuils `market.lane_c_lo` / `lane_c_hi`, **empruntés au moteur de prix**, pas
  recopiés. **Confirmée.**
- Le conteneur la sert : sonde de millésime, Q1. **Le client ne la lit pas** : 0 occurrence.
- ⛔ **Et c'est le finding** : `lane_band` dit **comment le coin ÉCOULE**, la maquette écrit
  **« cher / au-dessus / au tarif / très cher »**, qui dit **ce que ça coûte**. **Deux grandeurs
  différentes.** Le tarif de la maquette (M10) n'a **aucune source** et ne peut pas en avoir tant
  que `p_cents` est en forme B. C'est un **arbitrage produit**, pas un câblage.

### Q5 — Ce que la planche affiche : champ, résolveur ou dur ?

| ce qu'on lit sur la planche | d'où ça vient | classe |
|---|---|---|
| « LES POINTS DE VENTE » | littéral `SellingScreenController.cs:298` | **en dur** |
| pastille dorée | `ProceduralUI.RadialDisc(…, Or, …)` `:202` — **une seule couleur, jamais fonction de `substance`** | **en dur** |
| « Brindle » | `Lisible(d.substance)` `:206`, résolveur `:271-276` — placé dans l'objet nommé **`"Nom"`** | champ `substance` |
| « AU POSTE » | `Activite(d.activity_band)` `:211`, résolveur `:265-267` (`WORKING→AU POSTE`) | champ `activity_band` |
| « Caisse » + **5 crans** + « Moderate » | `Crans(…, d.cash_band, 5, CaisseRang(d.cash_band))` `:215` ; libellé = `Lisible(bande)` `:256` | champ `cash_band` |
| « Marge » + **4 crans** + « Standard » | `Crans(…, d.margin_band, 4, MargeRang(d.margin_band))` `:217` | champ `margin_band` |
| « RAMASSER » | littéral `:227` | **en dur** |
| **« impossible — aucune planque n'existe encore »** | littéral `:229` | **en dur — et RÉFUTÉ, voir D1** |

**Les jauges à 5 carrés** : c'est le front qui a raison contre la maquette. `cash_band` a **5**
valeurs (`NONE|LOW|MODERATE|HIGH|FULL`, `selling.projection.service.ts:48`) ; la maquette dessine
**4** crans (`.jg` porte 4 `<i>`, mesuré sur les 6 cadres). Une jauge à 4 crans **ne peut pas
exprimer** les 5 paliers servis. La marge, elle, coïncide : 4 crans pour 4 paliers.

**« Moderate » / « Standard »** ne sont **pas** des buckets inventés : ce sont les bandes servies,
passées au pis-aller `Lisible()`. Ce ne sont **pas des traductions** — le fichier le dit lui-même
(`:269-270`), et cette prémisse est aujourd'hui périmée (D6).

**« aucune planque n'existe encore » contre 2 planques** : voir **D1**, c'est le défaut le plus dur
de cette passe, et il est mesuré sur un compte frais.

---

## Défauts

| # | information | B | M | F | statut | preuve |
|---|---|---|---|---|---|---|
| **D1** | « aucune planque n'existe encore » | ● (la planque EXISTE) | ● (#110 dit l'inverse) | ● | **BLOQUANT — affiché sans source, et réfuté par la mesure** | `mesures/08-planque-stash.json` : `GET /v1/city/district/16/stash` sur **compte frais, 0 tick** → `safehouses:[{safehouse_id:"3f6ac000-…", slot_count:4, load_bucket:"NOMINAL"}]`. Écrivain de prod : `onboarding-grant.service.ts:408-412` (`createSafehouse` sur le `cash_safehouse` du grant). Littéral fautif : `SellingScreenController.cs:229` |
| **D2** | le geste RAMASSER | ● `POST …/collect` | ● (#109 `RAMASSER LA CAISSE`) | ● (décor) | **BLOQUANT — affiché sans source** | `client.Collect` **0 appel** dans le contrôleur (`mesures/11-inventaire-F.txt`) ; aucun `Button` n'est ajouté dans `Rangee()` (`:220-231`) ; `CollectTentatives` (`:49`) : **0 site d'écriture**. Et si on le câblait tel quel : le client poste `"{}"` (`SellingClient.cs:77`) → **mesuré 422** `safehouse_id must be a UUID (got "undefined")` (`mesures/09-collect-corps-vide.json`), **contrôle positif** : le même appel AVEC `safehouse_id` rend 404 sur le dealer (`09b`), donc l'erreur change bien de nature |
| **D3** | le **nom** du dealer | ● `name_i18n` | ● M07 (`Oskar`… en tête de rangée, le plus gros texte) | – | **DÉFAUT** | Servi : `selling.projection.service.ts:90,189-193` + corps du 04/09 (`{"key":"game.fiction.dealer.name","params":{"prenom":"Ilse"}}`). Non déclaré dans `SellingDtos.cs` ; **0** occurrence de `name_i18n` / `prenom` dans les 3 fichiers de l'écran. **Et la clé i18n EST servie** : `game.fiction.dealer.name = '{prenom}'`, `mesures/10-i18n-fr.json`. L'emplacement existe : l'objet est déjà nommé `"Nom"` (`:206`) — il porte la substance |
| **D4** | le **district** du point de vente | ● `district_name` | ● M08 (`La Lisière`, `Dépôt-Est`…) | – | **DÉFAUT** (forme F rouverte au désérialiseur) | `:121,204` servi ; 0 occurrence côté client |
| **D5** | la **vitalité du coin** | ● `lek_band` | ● M09 (`lek 12`) | – | **DÉFAUT** + arbitrage | `:79,125,205` servi ; 0 occurrence côté client. ⚠️ M09 dessine un **NUMÉRO**, B sert une **BANDE** — voir Q-A1 |
| **D6** | résolution i18n des libellés | ● bundle 886 clés | – | ● pis-aller `Lisible()` | **DÉFAUT — énoncé daté devenu faux** | `SellingScreenController.cs:269-270` : « *aucune clé i18n n'est servie par ce back (178 référencées, 0 servie)* ». Mesuré : `GET /v1/i18n/bundle?locale=fr` → **886 clés**, contrôle positif `district.type_batiment.dealer_spot_front` = « Façade de point de vente » (`mesures/10-i18n-fr.json`). ⇒ « Brindle », « AU POSTE », « Moderate » sont produits par un pis-aller dont la prémisse est morte |
| **D7** | l'écoulement du coin | ● `lane_band` | – (M10 dessine un **tarif**, autre grandeur) | – | **DÉFAUT** (côté F) | `:140,209` servi ; 0 occurrence côté client |
| **D8** | le **détail** d'un point de vente | ● `GET /v1/operational/dealer/:id` | ● M18 (fiche #109) | – | **DÉFAUT** | `client.GetDealer` implémenté (`SellingClient.cs:43-62`) et **0 appel** dans le contrôleur ; aucune sélection de rangée n'existe (M15 `.dl.pris` non implémenté) |
| **D9** | les 3 compteurs de tête | ● dérivables de `activity_band` / `cash_band` | ● M03/M04/M05 (`03/6 au travail`, `03 caisses pleines`, `01 grillés`) | – | **DÉFAUT** | La maquette met ces 3 nombres au-dessus de la liste ; le front ne les calcule ni ne les affiche (aucun agrégat dans `Rendre()` `:167-184`) |
| **D10** | la jauge de caisse ne peut pas dire ce que B dit | ● 5 paliers | ● **4 crans** | ● 5 crans | **DÉFAUT de MAQUETTE** | `cash_band` = 5 valeurs (`:48`) ; `.jg` de la maquette porte **4** `<i>` sur les 6 cadres (`mesures/07-maquette-cadres.txt`). Le front (5 crans) est le fidèle ; c'est la maquette qui ne peut pas exprimer le domaine |

> **D1 et D2 portent sur la même chaîne et se renforcent** : l'écran déclare impossible un geste
> dont la précondition est désormais satisfaite, et le bouton qui le dirait n'est de toute façon
> branché sur rien. Le commentaire de `SellingClient.cs:66-73` (« *0 écrivain dans `services/` et
> `scripts/`, re-mesuré le 2026-09-02* ») est un **énoncé daté** qui n'a pas été relu au merge du
> lot planque.

---

## « Passé à côté ? » — pour l'user (classées par intérêt joueur décroissant)

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| **Q-A1** | `lek_band` **vs** `coverage_lek_tile_id` (B⁻) | La bande dit « ce coin porte-t-il de la vie ? » ; le NUMÉRO de tuile dit « lequel ». La maquette écrit `lek 12`, le back **refuse** l'id : `coverage_lek_tile_id` est **lu** (`selling.repository.ts:512`), **passé au compositeur**, **omis de la projection**, et la falsifiable l'interdit nommément (`vente_ensemble_de_cles.engine.spec.ts:203`) | **Arbitrage à prendre, pas un câblage.** Soit la maquette abandonne le numéro et affiche la bande (`ABSENT` est l'information actionnable : ce dealer ne vendra **jamais**), soit R2.2 s'amende pour cet id. Mon avis : la bande suffit et dit **plus** — un numéro de tuile n'aide aucun joueur | ★★★ |
| **Q-A2** | `withdrawn` (`/dealers`) | Ce point de vente Hush s'est **retiré** — sa clientèle a décroché | **Utile ici, et rien ne le remplace.** C'est le seul signal « ce point de vente est mort de faim » ; le confondre avec `IDLE` refait la faute que `lek_band:ABSENT` a corrigée ailleurs. La maquette a un état `.dl.mort` qui pourrait le porter | ★★★ |
| **Q-A3** | `addiction_loyalty_status` (`/dealers`) | La fidélité de la clientèle d'un point Hush : `LOW` / `STABLE` / `HIGH` (`hush-addiction.service.ts:31`), `null` hors Hush | **Utile ici** : c'est ce qui distingue deux points de vente qui affichent par ailleurs les mêmes bandes. Reçu par le DTO (`SellingDtos.cs:18`) et **jamais lu** : 0 occurrence | ★★★ |
| **Q-A4** | `lane_band` (`/dealers`) | Le coin écoule vite / normalement / se disperse — et **le moteur bascule au même endroit** (`zoneDeLane` est appelée par `getRealisedPriceCents`) | **Utile, et c'est déjà la bonne réponse à la mauvaise question de la maquette.** À afficher **sous son vrai nom** (l'écoulement), jamais recyclé en « tarif » | ★★☆ |
| **Q-A5** | `home_building_id` (B⁻, `dealer`) | *Quel* point de vente ce dealer occupe | **Question de lot, pas d'écran.** C'est la moitié de ce que L3 réclame (« affecter exige un identifiant de point et une case ») ; sans route qui liste les points **libres**, la projeter ne débloque pas le CTA | ★★☆ |
| **Q-A6** | les 3 compteurs agrégés | « 3 sur 6 travaillent, 3 caisses pleines, 1 grillé » | **Utile, et gratuit** : entièrement dérivable de `activity_band` + `cash_band` côté client, zéro lot back. C'est le seul endroit de l'écran qui donne une **vue d'ensemble** | ★★☆ |
| **Q-A7** | `district_name` en **groupement** | Regrouper les points de vente par district | **Pas une clé de plus** — un usage de D4 une fois câblée. Avec 6 points sur 6 districts la liste plate suffit ; au-delà, non | ★☆☆ |
| **Q-A8** | `operating_hours_start` / `operating_hours_end` (B⁻, `dealer`) | Les heures d'ouverture du point de vente | **Pas ici, et pas maintenant.** Mesuré : **2 sites dans tout le back**, tous deux la déclaration de schéma (`db/schema/operational_chain.ts:232-233`) — **0 lecteur, 0 écrivain** hors défaut. Les projeter rendrait `0`–`23` pour tout le monde : un dispositif décoratif (forme B) | ★☆☆ |
| **Q-A9** | le devenir de la caisse d'un dealer grillé (M22 / L4) | « sa caisse était bien remplie quand il a décroché — la bande ne dit pas ce qu'il en a fait » | **Question produit, pas de données.** Aucune clé du domaine ne porte cette information, et `float_cents` est interdit de surface. À trancher avant d'être câblé | ★☆☆ |

---

## Lots back suggérés (B⁻ dessiné, forme F)

| # | colonne | table | maquette | preuve |
|---|---|---|---|---|
| L-B1 | `coverage_lek_tile_id` | `dealer` | **M09** (`lek 12`) | Lu `selling.repository.ts:512`, passé au compositeur, **omis** de `DealerProjection` — la définition de la forme F. ⚠️ **Refus délibéré** (`vente_ensemble_de_cles.engine.spec.ts:203` l'interdit nommément) ⇒ **ne pas livrer sans l'arbitrage Q-A1** |
| L-B2 | `home_building_id` | `dealer` | – (réclamé par **L3** du cadre #113) | Lu `selling.repository.ts:526`, utilisé pour deux jointures, **jamais projeté**. Seul, il ne débloque pas le CTA : il faut **la route qui liste les points de vente libres**, qui n'existe pas |
| — | `operating_hours_*` | `dealer` | – | **PAS un lot** : 0 lecteur / 0 écrivain (`mesures/12-B-moins.txt`). Ce serait une constante projetée |

> **Aucun autre lot back n'est nécessaire pour cet écran.** Les trois trous que la maquette
> réclamait (nom, district, coin) sont **déjà refermés côté back** — ce qui reste est **un lot
> CLIENT** : déclarer 4 champs de plus dans `DealerDto` et les rendre.

---

## Actions : routes ↔ CTA

Balayage du mot du domaine sur **148** `*.controller.ts` : **5** le mentionnent, **3** non-`_test`
(`market`, `political`, `selling`) — les deux premiers **uniquement en commentaire**, lus et classés
(`market.controller.ts:23`, `political.controller.ts:14`). ⇒ **4 routes joueur, toutes dans
`selling.controller.ts`, toutes sous `JwtAuthGuard`** (4 décorateurs / 4 gardes, comptés).

| route back | CTA maquette | client `SellingClient` | contrôleur d'écran | verdict |
|---|---|---|---|---|
| `GET /v1/operational/dealers` (`:138`) | la liste elle-même | `ListDealers` ✔ | **1 appel** (`:162`) | ✔ |
| `GET /v1/operational/dealer/:id` (`:121`) | **M18** fiche détail (#109) | `GetDealer` ✔ | **0 appel** | **DÉFAUT D8** — route servie, client écrit, jamais emprunté |
| `POST /v1/operational/dealer/:id/collect` (`:94`) | **M19/M21** `RAMASSER` | `Collect` ✔ mais poste `"{}"` | **0 appel** | **DÉFAUT D2** — et le corps est refusé en 422 (mesuré + contrôle positif) |
| `POST /v1/operational/dealer/assign` (`:63`) | **M16** `AFFECTER UN DEALER` | **absent** | – | **écart ASSUMÉ confirmé** (L3 du cadre #113, tranché f2 07/09) — mais ⚠️ voir ci-dessous |

⚠️ **La raison de l'écart assumé mérite d'être reformulée.** Le dossier écrit « *aucune route ne
sert la liste des dealers affectables* ». **La route `assign` EXISTE** et n'attend que
`{dealer_spot_id, lek_tile_id}` : ce qui manque est la route qui **liste les points de vente
possédés et libres** + la case couverte. L'écart est réel, mais il porte sur un **inventaire**, pas
sur l'action. ★ Et le docstring de `SellingClient.cs:8` annonce « **les 4 routes joueur** » alors
que le fichier en implémente **3** — `assign` n'y est pas.

---

## Table de couverture complète

Légende — B : servi par le back · M : dessiné dans la maquette · F : affiché par le client à
`fd0e21e`. `◐` = présent mais **LOGIQUE** (conditionne, n'est pas montré).

| # | information | B | M | F | statut |
|---|---|---|---|---|---|
| 1 | enveloppe `dealers` (le tableau) | ● | ● (la liste) | ◐ (`SellingClient.cs:35`) | ✔ plomberie |
| 2 | `dealer` (uuid) | ● | – | ◐ (nom d'objet, `:188`) | ✔ plomberie |
| 3 | `name_i18n` — le nom | ● | ● M07 | – | **DÉFAUT D3** |
| 4 | `activity_band` — l'état | ● | ● M12 | ● F04 | ✔ |
| 5 | `cash_band` — la caisse | ● | ● M13 (4 crans) | ● F05 (5 crans) | ✔ / **D10** sur la maquette |
| 6 | `substance` — la marchandise | ● | ● M06 (glyphe ×4) | ● F03 (texte ; pastille invariante) | ✔ partiel |
| 7 | `margin_band` — la marge | ● | ● M11 | ● F06 | ✔ |
| 8 | `addiction_loyalty_status` | ● | – | – | **QUESTION Q-A3** |
| 9 | `withdrawn` | ● | – | – | **QUESTION Q-A2** |
| 10 | `district_name` | ● | ● M08 | – | **DÉFAUT D4** |
| 11 | `lek_band` — la vitalité du coin | ● | ● M09 (numéro ≠ bande) | – | **DÉFAUT D5** + Q-A1 |
| 12 | `lane_band` — l'écoulement | ● | – | – | **DÉFAUT D7 / QUESTION Q-A4** |
| 13 | tarif qualitatif (« cher », « au tarif ») | – | ● M10 | – | **dessiné sans source** — `p_cents` forme B, arbitrage produit |
| 14 | numéro de tuile de lek | B⁻ | ● M09 | – | **forme F refusée** → L-B1 (arbitrage Q-A1) |
| 15 | point de vente occupé | B⁻ | – (L3) | – | → L-B2 |
| 16 | heures d'ouverture | B⁻ (dormante) | – | – | **QUESTION Q-A8** — colonne morte |
| 17 | compteur « au travail / total » | ● dérivable | ● M03 | – | **DÉFAUT D9** |
| 18 | compteur « caisses pleines » | ● dérivable | ● M04 | – | **DÉFAUT D9** |
| 19 | compteur « grillés » | ● dérivable | ● M05 | – | **DÉFAUT D9** |
| 20 | titre de l'écran | – | ● M01 | ● F01 | ✔ (littéraux des deux côtés) |
| 21 | sous-titre « qui vend, et ce qu'il y a dans la caisse » | – | ● M02 | – | ASSUMÉ à consigner |
| 22 | note « rien ne les vide » | – | ● M17 | – | ASSUMÉ (constat éditorial, vrai : `collect` inutilisable) |
| 23 | sélection d'une rangée (`.dl.pris`) | – | ● M15 | – | interaction non implémentée → D8 |
| 24 | grisé du dealer inactif (`.dl.mort`) | ● (dérivable de `activity_band`/`withdrawn`) | ● M14 | – | **DÉFAUT** (fusionné D3-D9 : la rangée ne varie pas) |
| 25 | fiche détail | ● (`dealer/:id`) | ● M18 | – | **DÉFAUT D8** |
| 26 | CTA `RAMASSER` | ● (`collect`) | ● M19/M21 | ● F07 décor | **DÉFAUT D2** |
| 27 | raison « aucune planque » | ● (la planque existe) | ● M20 (faux) | ● F08 (faux) | **DÉFAUT D1 — BLOQUANT** |
| 28 | CTA `AFFECTER UN DEALER` | ● (`assign`) mais pas d'inventaire | ● M16 | – | écart **ASSUMÉ** (L3) |
| 29 | état vide | – | ● M23 | ● F09 (`:177-178`) | ✔ (littéraux) |
| 30 | caisse d'un dealer grillé | – | ● M22 (L4) | – | ASSUMÉ déclaré → Q-A9 |
| 31 | résolution i18n | ● (886 clés) | – | ● pis-aller | **DÉFAUT D6** |

### Contrôle d'arithmétique (obligatoire)

Chaque ligne reçoit **exactement une** classe (classes disjointes, aucun double compte) :

```
|clés B|                    = 12   lignes 1–12    (11 clés par dealer + la clé d'enveloppe `dealers`)
|colonnes B⁻|               =  3   lignes 14,15,16 (coverage_lek_tile_id · home_building_id · operating_hours_*)
|éléments M non appariés|   = 15   lignes 13,17,18,19,20,21,22,23,24,25,26,27,28,29,30
|rendus F sans source|      =  1   ligne 31        (le pis-aller `Lisible()`, ni servi ni dessiné comme tel)
                              ──
                     somme  = 31
       lignes du tableau    = 31   ✔
```

⚠️ **Une note que l'arithmétique ne doit PAS absorber** : **M09 (`lek 12`) porte DEUX informations**
— une vitalité (appariée à `lek_band`, ligne 11) et un **identifiant de tuile** (ligne 14, B⁻).
Je le compte **une seule fois**, côté B⁻, parce que c'est là que se prend la décision ; mais c'est
précisément ce dédoublement qui fait l'arbitrage **Q-A1**, et il disparaîtrait d'un décompte qui se
contenterait d'apparier les éléments un à un.

---

## Annexes

### 1. Routes du domaine (compte, ancres)

`mesures/13-routes-domaine.txt`. **148** `*.controller.ts` balayés ; **5** contiennent `dealer` ;
**3** non-`_test` ; **2 sur 3 en commentaire seul** (classés en lisant la ligne, pas le compte).
**4 routes joueur**, toutes `selling.controller.ts`, toutes `@UseGuards(JwtAuthGuard)` :
`:63` `POST operational/dealer/assign` · `:94` `POST operational/dealer/:id/collect` ·
`:121` `GET operational/dealer/:id` · `:138` `GET operational/dealers`.
Côté client, `SellingClient.cs` construit 3 URL (`ListDealers`, `GetDealer`, `Collect`) — **`assign`
manque**. Les deux listes ne se recouvrent donc **pas** : la différence est déjà une information.

### 2. Corps réels

| mesure | fichier | résultat |
|---|---|---|
| `GET /v1/operational/dealers` (compte frais) | `mesures/03-dealers.json` | 200, `{"dealers":[]}` — **mesuré à vide**, dimensionnement hors mandat (Q1) |
| `GET /v1/friction/state` (sonde de millésime) | `mesures/05-sonde-millesime.json` | 200, `perimeter_site_count` **présente** |
| `GET /v1/city/district/16/stash` | `mesures/08-planque-stash.json` | 200, **1 planque, 4 slots** |
| `POST …/collect` corps `{}` | `mesures/09-collect-corps-vide.json` | **422** `safehouse_id must be a UUID (got "undefined")` |
| `POST …/collect` corps complet (contrôle +) | `mesures/09b-collect-avec-safehouse.json` | **404** dealer — l'erreur CHANGE ⇒ la sonde mord |
| `GET /v1/i18n/bundle?locale=fr` | `mesures/10-i18n-fr.json` | 200, **886 clés**, dont `game.fiction.dealer.name` |
| corps du 04/09 (ancien monde, **8 clés**) | `corps-reels-04-09/GET_operational_dealers.json` | témoin de FORME uniquement, **non opposable en valeur** |

### 3. Valeurs possibles par clé, avec la contrainte source

| clé | domaine | contrainte lue à la source |
|---|---|---|
| `dealer` | uuid | `dealer_id uuid primaryKey defaultRandom` — `db/schema/operational_chain.ts:226` |
| `name_i18n` | `{key, params:{prenom}}` | `dealerNameRef` (`common/fiction-names.ts`) ; clé **servie** `game.fiction.dealer.name='{prenom}'` |
| `activity_band` | `WORKING\|IDLE\|ABSENT\|COMPROMISED` | `CREATE TYPE "dealer_state" AS ENUM ('working','idle','absent','compromised')` — `0017:35` ; mappage `selling.projection.service.ts:218-223` |
| `cash_band` | `NONE\|LOW\|MODERATE\|HIGH\|FULL` | type `:48` ; coupes dérivées d'une unité de transaction `:231-243` (paliers de présentation, pas de tunable gdd/14) |
| `substance` | `BRINDLE\|CRICK\|HUSH\|ASH` | `CREATE TYPE "substance_type" AS ENUM ('brindle','crick','hush','ash')` — `0017:19` ; mappage `:268-279` (défaut `BRINDLE`) |
| `margin_band` | `STANDARD\|ELEVATED\|PREMIUM\|HIGH_PREMIUM` | type `:62` ; coupes 1× / 2× / 4× sur `marginMultiplierVsBrindle` `:293-300` |
| `addiction_loyalty_status` | `LOW\|STABLE\|HIGH\|null` | `hush-addiction.service.ts:31` ; `null` hors Hush `:200` |
| `withdrawn` | `true\|false` | `:201` — `false` hors Hush |
| `district_name` | chaîne \| `null` | `nomDeDistrict(district_id)` `:204` — **une CHAÎNE, pas un `I18nRef`**, convention justifiée `:117-119` |
| `lek_band` | `ABSENT\|LOW\|MEDIUM\|HIGH` | type `:79` ; coupes en tiers de `LEK_SCORE_MAX` `:257-262`. **4 valeurs, canon 3** — divergence déclarée `:66-77` |
| `lane_band` | `FAST\|STEADY\|SCATTERED\|null` | `lane-clearing-zone.ts:31,33-39` ; seuils `market.lane_c_lo` / `lane_c_hi` **du moteur** ; `null` = aucune lane formée |

### 4. Inventaire M (`Mxx → représente`)

Source : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html`. ⚠️ **Le dossier annonce
les cadres #107–112 ; mesuré, ce sont les cadres #108–#113** (6 cadres portant `class="vnt6"`, comptés :
`class="vnt6"` × **6**). Le cadre **#107** appartient à ㉗ La boutique — ses 47 occurrences de
`vnt6` sont le **bloc `<style>`** de la vente, pas un cadre de vente. Aucune section `<h2>` ㉟
n'existe dans le fichier (0 fichier de l'atelier contient `㉟`) ; les 6 cadres vivent sous le `<h2>`
㉑ Le marché. Le cadre **nominal est #108** — il correspond à `reference-1080x2102.png`, vérifié en
regardant l'image.

| id | cadre | élément | représente |
|---|---|---|---|
| M01 | tous | `.enseigne b` « La vente » | titre |
| M02 | tous | `.enseigne i` (variable par cadre) | sous-titre / état de l'écran |
| M03 | tous | `.fen` « 03**/6** AU TRAVAIL » | nb `WORKING` sur total |
| M04 | tous | `.fen` « 03 CAISSES PLEINES » | nb au palier max de caisse |
| M05 | tous | `.fen` « 01 GRILLÉS » | nb `COMPROMISED` |
| M06 | liste | pastille SVG (4 glyphes distincts) | la substance |
| M07 | liste | `.qui b` (`Oskar`,`Mira`,`Joran`,`Tamsin`,`Ilse`,`Dov`) | **le nom du dealer** |
| M08 | liste | `.qui small` §1 (`La Lisière`…) | le district |
| M09 | liste | `.qui small` §2 (`lek 12`) | **le numéro de tuile** (≠ la bande) |
| M10 | liste | `.qui small` §3 (`cher`,`au-dessus`,`au tarif`,`très cher`) | **un tarif** |
| M11 | liste | `.marge` — **4** `<u>` allumés/éteints | la marge |
| M12 | liste | `.et` (`au travail`/`au repos`/`grillé`/`pas là`), coloré | l'activité |
| M13 | liste | `.jg` — **4** `<i>` | la caisse |
| M14 | liste | `.dl.mort` (opacité .5) | rangée éteinte |
| M15 | #109/#110/#111 | `.dl.pris` (bord doré) | rangée sélectionnée |
| M16 | #108/#112 | `.cta6` « AFFECTER UN DEALER » | CTA principal |
| M17 | #108 | `.note6` « deux caisses sont déjà en haut de l'échelle — et rien ne les vide » | constat |
| M18 | #109 | `.fiche` « Oskar · La Lisière · lek 12 » + « Caisse pleine à ras » + « il vend brindle au lek 12, cher, et il travaille » | fiche détail |
| M19 | #109 | `.cta6` « RAMASSER LA CAISSE » | CTA de collecte |
| M20 | #110 | panneau rouge « Nulle part où la porter » + « planque — et vous n'en avez aucune » | raison du blocage |
| M21 | #110 | `.cta6.eteint` « RAMASSER — IMPOSSIBLE » | CTA éteint |
| M22 | #111 | « Grillé, et il s'est retiré » + « sa caisse était bien remplie quand il a décroché » | devenir de la caisse |
| M23 | #112 | `.rien` « Aucun dealer sur un point de vente. Rien ne rentre. » + panneau « Il faut poser quelqu'un quelque part » | état vide |
| M24 | #113 | L1 planque · L2 montant de la caisse · L3 choisir le point de vente · L4 caisse d'un grillé | **les 4 manques déclarés par la maquette elle-même** |

### 5. Inventaire F (champ → sites → classe)

Archive `front-fd0e21e/`, 3 fichiers de l'écran. Comptes par **occurrence** (le `grep -c` compte des
LIGNES — recompté, `mesures/11-inventaire-F.txt`), contrôle positif sur 5 champs lus, contrôle
négatif (motif large sans point) sur les 4 champs absents.

| champ DTO | déclaré | occurrences | sites | classe |
|---|---|---|---|---|
| `dealer` | ✔ | 1 | `:188` nom de GameObject | **LOGIQUE** |
| `activity_band` | ✔ | 2 | `:211` texte, `:212` couleur | **RENDU** |
| `cash_band` | ✔ | 2 | `:215` (bande + rang) | **RENDU** |
| `substance` | ✔ | 1 | `:206` texte (dans l'objet nommé `"Nom"`) | **RENDU** |
| `margin_band` | ✔ | 2 | `:217` (bande + rang) | **RENDU** |
| `addiction_loyalty_status` | ✔ | **0** | — | **IGNORÉ** — reçu et jeté |
| `withdrawn` | ✔ | **0** | — | **IGNORÉ** — reçu et jeté |
| `safehouse_id` (`CollectData`) | ✔ | **0** | — | **IGNORÉ** (et jamais envoyé, D2) |
| `name_i18n` | **✗** | 0 | — | **NON DÉSÉRIALISÉ** |
| `district_name` | **✗** | 0 | — | **NON DÉSÉRIALISÉ** |
| `lek_band` | **✗** | 0 | — | **NON DÉSÉRIALISÉ** |
| `lane_band` | **✗** | 0 | — | **NON DÉSÉRIALISÉ** |

**Affiché sans venir d'un champ** : `:298` « LES POINTS DE VENTE » · `:227` « RAMASSER » ·
`:229` « impossible — aucune planque n'existe encore » · `:177-178` les 2 textes d'état vide ·
`:202` pastille dorée invariante · `:242` libellés « Caisse » / « Marge ».

**Résolveurs nommés** (aucun n'est i18n — tous des `switch` ternaires locaux) : `Activite()`
`:265-267` (4 valeurs, couvre l'enum) · `CaisseRang()` `:259-260` (5 valeurs + défaut 0) ·
`MargeRang()` `:262-263` (4 valeurs + défaut 0) · `Lisible()` `:271-276` (**générique**, ne connaît
aucune valeur du domaine ⇒ une 5ᵉ valeur d'enum passerait sans rougir).

**Méthodes du client jamais appelées** : `GetDealer` **0**, `Collect` **0** (`ListDealers` : 1).
**Compteur public jamais écrit** : `CollectTentatives` (`:49`), **0 site d'écriture**.

**Montage** : l'écran est bien monté par le shell — `AppShell.cs:781` « LA VENTE » →
`MountTenant<SellingScreenController>()`.

### 6. Ce que je n'ai PAS pu vérifier

1. **L'ensemble de clés d'UN dealer, par mesure directe.** Compte frais = liste vide ; dimensionner
   exige `POST /v1/_test/citysim/advance` (≥ **2880** ticks), interdit par mon mandat. Établi par
   **sonde de millésime mesurée + ancestralité en plomberie** (Q1), pas par lecture du corps.
   ⇒ *La mesure qui tranche* : `advance` 2880 ticks sur un compte frais après achat + conversion
   `dealer_spot_front/weak`, puis `assign`, puis relire `/v1/operational/dealers` — c'est exactement
   ce que fait `vente_ensemble_de_cles.engine.spec.ts`.
2. **Le SHA réel de l'image.** Aucune route ni en-tête ne l'imprime
   (`mesures/04-headers-dealers.txt`). Le dossier annonce une recréation « 07/09 ~13:50 » alors que
   le back lui-même horodate mes appels à **04:2x UTC le 07/09** — **cette heure n'est pas encore
   passée**. Je n'ai pas cherché à réconcilier : j'ai daté l'image par son **comportement**.
   ⇒ *La mesure qui tranche* : une route `/v1/_meta/build` imprimant le SHA, ou `docker inspect`.
3. **Les valeurs réelles servies pour `lek_band` et `lane_band`.** Domaines lus à la source ;
   **aucune valeur observée en corps**. En particulier `lane_band: null` (aucune lane formée) est le
   cas le plus probable sur un compte neuf, et la maquette n'a **aucun état pour `null`**.
4. **`addiction_loyalty_status` / `withdrawn` non `null`** : exigent un point de vente **Hush** ayant
   vendu — hors de portée sans horloge.
5. **Le rendu réel des 4 glyphes de substance de la maquette** : je les ai vus dans l'image de
   référence (4 formes distinctes), mais je n'ai pas ouvert chaque `<svg>` pour établir la
   correspondance glyphe → substance.
6. **Le comportement d'affichage sur une liste à plusieurs dealers** : la planche n'en montre
   **qu'un**. Je ne peux rien dire du défilement, de l'ordre, ni de la tenue de l'`elast` de la
   maquette (la liste y est bornée à 6).
7. **Que la planche du dossier corresponde à l'archive `fd0e21e`** : je l'ai supposé sur la foi du
   dossier (sha256 annoncé non recalculé — hors périmètre de mesure des données).
8. **Le cadre de maquette réellement ratifié.** Le dossier dit #107 nominal ; j'ai mesuré que la
   vente occupe #108–#113 et que `reference-1080x2102.png` est le **#108**. Je n'ai trouvé
   **aucune trace de ratification** (et je n'ai pas le droit d'ouvrir les rapports de juge) ; le
   contrôleur lui-même écrit « **MAQUETTE NON RATIFIÉE au 2026-09-02** »
   (`SellingScreenController.cs:31-33`). ⇒ Les écarts M/F de cette table se lisent contre un dessin
   dont je ne peux pas établir le statut.
