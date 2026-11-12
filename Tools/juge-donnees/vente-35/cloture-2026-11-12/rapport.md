# Juge données ⊥ — ㉟ La vente — clôture (B / M / F) — 2026-11-12

## VERDICT : **NON CLÔTURABLE**

**Six des douze clés servies par `GET /v1/operational/dealers` sont dessinées à la maquette et lues
par ZÉRO ligne du front** : `district_name`, `lek_band`, `lane_band`, `addiction_loyalty_status`,
`withdrawn`, et le prénom (`name_i18n`, rendu seulement dans la phrase d'un geste, jamais dans la
rangée). Le back a refermé sa forme F le 2026-09-07 — c'est le client qui ne branche pas.

## En une phrase

L'écran affiche **4 informations de projection** (`activity_band`, `cash_band`, `substance`,
`margin_band`) sur **12 servies et mesurées** ; la maquette 73806af8 en dessine **10** ; **6 défauts**
de couverture, **0 question « passé à côté ? »** restante sur la projection (la maquette les a toutes
ratifiées), **0 lot back de forme F**.

## Comptes recomptés par script

`mesures/controle-arithmetique.py` — positif `rc=0`, négatif `rc=2` :

    |B| ................ 17  (12 clés de la projection + 5 clés de la collecte)
    |M non appariés| ... 17
    |F sans source| .... 6
    somme .............. 40
    lignes annoncées ... 40
    VERT : somme == lignes annoncées.          rc=0
    ROUGE : la somme (39) ne vaut pas 40.      rc=2   (--negatif)

## Quel SHA pour quelle conclusion de M

| conclusion | SHA lu |
|---|---|
| inventaire des cadres 107-112 et 171, mots de bandes, marges, compteurs, jauges | **73806af8** (`ecrans-brennar-6.html`, blob `06460ca0f6752eec608ccf1a477d8a7b1614e81b`, 2 742 533 o, **172** étiquettes) |
| diff a3e02c2a → 73806af8 (ce que la bougée a changé) | les **deux** (`mesures/M-cadre-1*.html` = a3e02c2a, `mesures/N-cadre-1*.html` = 73806af8) |

Toutes les conclusions de M du rapport portent sur **73806af8**. Blobs vérifiés par `sha1("blob
<len>\0" + contenu)` == `git rev-parse <sha>:ecrans-brennar-6.html` pour les deux SHA.

### Ce que a3e02c2a → 73806af8 a changé (mesuré par diff des cadres)

    cadre 107 : MODIFIÉ   cadre 108 : MODIFIÉ   cadre 109 : MODIFIÉ
    cadre 110 : MODIFIÉ   cadre 111 : IDENTIQUE cadre 112 : IDENTIQUE   cadre 171 : NEUF

1. **Marges recalées** (107-110 et 171) : Oskar (brindle) passe de « cher » (3/4) à « au tarif »
   (1/4) ; Mira/Joran (crick) de « au-dessus »/« au tarif » à « cher » (3/4) ; Ilse/Dov (hush) à
   « au-dessus » (2/4). ⇒ **fermé par 73806af8** : la maquette colle désormais au back
   (`substance-tunables.ts:92,109,127,145` — brindle 1 / hush 1,5 / crick 3 / ash 20) et au résolveur
   du front (`SellingScreenController.cs:588-589` : STANDARD « AU TARIF », ELEVATED « AU-DESSUS »,
   PREMIUM « CHER », HIGH_PREMIUM « TRÈS CHER »). Sous a3e02c2a, Oskar portait l'icône brindle ET le
   mot « cher » : je l'aurais rapporté en écart — **il n'est pas à reporter**.
2. **Cadre 110** : « Grillé, et il s'est retiré » → « **Grillé** » ; « quand il a décroché » → « quand
   il **s'est fait prendre** ». ⇒ **fermé par 73806af8** : sous a3e02c2a je ne pouvais pas trancher si
   « il s'est retiré » dessinait `withdrawn` (sevrage du coin Hush) ou paraphrasait `COMPROMISED` ;
   l'ambiguïté est levée, et la ligne « M-n18 » de ma table disparaît (18 → 17 éléments M non appariés).
3. **Cadre 109** : « Il n'existe aujourd'hui **aucun moyen d'en obtenir une** » → « **Tant que vous
   n'en avez pas**, l'argent reste chez le dealer ». ⇒ **fermé par 73806af8**, et c'était faux : j'ai
   mesuré une planque sur mon compte jetable NEUF (`mesures/08-stash-d16.json` :
   `safehouse_id: 746804d9-75fd-421a-b3a1-7c56abdd9b72`, `load_bucket: LOW`).
4. **Cadre 171 NEUF** « La vente — l'écoulement et la clientèle » : dessine `lane_band`,
   `addiction_loyalty_status` et `withdrawn` (détail plus bas).

## Les 11 mots du cadre 171 — ratifiés, **PAS servis** par le back

La maquette porte sa propre légende (`maquette-73806af8…html:7086-7099`), qui nomme les familles de
clés : « **Les 11 mots sont RATIFIÉS (f2, 12/11)** ».

| famille | valeurs | mots dessinés (mesurés) | servi par le back ? |
|---|---|---|---|
| `vente.ecoulement.bande.*` (`lane_band`) | FAST / STEADY / SCATTERED | « ça part vite » · « ça s'écoule » · « ça se disperse » | **NON — 0 ligne** |
| `vente.clientele.bande.*` (`addiction_loyalty_status`) | LOW / STABLE / HIGH | « clientèle neuve » · « des habitués » · « clientèle accrochée » | **NON — 0 ligne** |
| `vente.clientele.perdue` (`withdrawn = true`) | true | « resté à sec : la clientèle a décroché » | **NON — 0 ligne** |
| `vente.coin.bande.*` (`lek_band`) | ABSENT / LOW / MEDIUM / HIGH | « pas de coin ici » · « coin mort » · « du passage » · « coin animé » | **NON — 0 ligne** |

3 + 3 + 1 + 4 = **11**, compte reproduit.

Mesure (cumul back `44a645a2`, puis build de la pile `8d0184a4`) :

    for k in vente.ecoulement.bande vente.clientele.bande vente.clientele.perdue vente.coin.bande; do
      git show 44a645a2:services/game-back/src/i18n/string_table.ts | grep -cE "'${k}"; done
    → 0 / 0 / 0 / 0        (idem au build 8d0184a4)
    CONTRÔLE POSITIF, même grep, famille qu'on sait servie :
      grep -cE "'vente\.caisse\.bande"  → 12

⇒ Les onze mots se classent **« dessiné, source à venir (ASSUMÉ par décision, dette datée) »**,
source : ratification f2 du 12/11 citée dans `maquette-73806af8…html:7087`. **Ce ne sont PAS des
« dessinés sans source ».** Et ils ne bloquent pas le câblage : le client pose des clés avant
qu'elles soient servies et affiche le repli de l'atelier (précédent maison :
`CollecteMots.cs:71-76`, « tant que le back ne les sert pas, le repli ÉCRIT PAR L'ATELIER s'affiche,
et il se compte »).

⚠️ **La DONNÉE, elle, est servie.** `lane_band`, `addiction_loyalty_status` et `withdrawn` sont
mesurés dans le corps réel (`mesures/11-dealers-deux.json`). Le mot manquant est un habillage ; la
clé non lue est un défaut de couverture. Les deux se traitent séparément.

---

## 1. Table des quatre clés annoncées — CONFIRMÉ / INFIRMÉ / NUANCÉ

Inventaire refait de ZÉRO (12 clés de B mesurées, 7 porteurs de M comptés par script, toutes les
lectures de F greppées au SHA `c98cef3d` avec contrôle positif).

| clé | B — servie ? | F — déclarée ? lue ? | M — dessinée ? | verdict |
|---|---|---|---|---|
| `withdrawn` | **OUI, mesuré** `false` (`11-dealers-deux.json`) | déclarée `SellingDtos.cs:20` · **0 lecture dans ㉟** · **2 lectures hors ㉟** : `Shell/LaSuite.cs:150` et `:162` (LOGIQUE, filtre la ligne « la suite » de ㊴ ; vivante — `LaSuite.Lignes` appelée par `LaSuitePanelController.cs:49`) | **OUI** — cadre 171, rangée Ilse, « resté à sec : la clientèle a décroché », en braise `#ff5a4d` | **NUANCÉ** — « lue par 0 ligne » est vrai **dans ㉟**, faux dans le dépôt |
| `addiction_loyalty_status` | **OUI, mesuré** `null` (dealer BRINDLE) | déclarée `SellingDtos.cs:19` · **0 lecture** (seule autre occurrence : une chaîne JSON de test, `CollecteMotsPlayModeTests.cs:211`) | **OUI** — cadre 171, 3 mots sur 3 rangées Hush | **CONFIRMÉ** |
| `lane_band` | **OUI, mesuré** `"FAST"` | déclarée `SellingDtos.cs:45` · **0 lecture** (idem, test `:212`) | **OUI** — cadre 171, 3 mots | **CONFIRMÉ** |
| `lek_band` | **OUI, mesuré** `"LOW"` | déclarée `SellingDtos.cs:44` · **0 lecture** (idem, test `:212`) | **OUI** — 2ᵉ segment du `<small>` de **chaque** rangée, cadres 107/108/109/110/171 ; 4 valeurs distinctes comptées | **CONFIRMÉ** |

### Clé NEUVE, dans le même cas, hors de la liste annoncée

| clé | B | F | M | verdict |
|---|---|---|---|---|
| **`district_name`** | **OUI, mesuré** `"La Lisière"` | déclarée `SellingDtos.cs:43` · **0 lecture sur un `DealerDto`** | **OUI** — 1ᵉʳ segment du `<small>` de **chaque** rangée, et répété dans la fiche des cadres 108/110 | **NEUVE — même cas que les quatre** |

⚠️ **Le piège qui fabrique un faux négatif ici** : `grep district_name` sur le contrôleur d'écran
rend **2 lignes** (`SellingScreenController.cs:478,479`) — mais elles lisent `p.district_name` sur un
**`BatimentPossedeDto`** (la rangée « Coin de vente sans dealer »), pas sur le `DealerDto`. Le motif
qui décide est `\bd\.district_name` :

    git grep -nE '\bd\.district_name' c98cef3d -- 'Assets/Scripts/*.cs'   → aucune ligne
    CONTRÔLE POSITIF, même motif sur des clés qu'on sait lues :
    git grep -nE '\bd\.(cash_band|substance|activity_band)' …             → 11 lignes
      SellingScreenController.cs:409,414,415,418(×2),421,434,699,700,701 ; LaSuite.cs:150,162

---

## 2. Défauts de couverture

| # | information | B | M | F | statut | preuve |
|---|---|---|---|---|---|---|
| **D1** | **le quartier du point de vente** (`district_name`) | ● `"La Lisière"` | ● 1ᵉʳ segment du `<small>` de chaque rangée (107,108,109,110,171) | – 0 lecture | **DÉFAUT** | `mesures/11-dealers-deux.json` · `SellingDtos.cs:43` · `git grep -E '\bd\.district_name'` = 0 |
| **D2** | **la vitalité du coin** (`lek_band`) | ● `"LOW"` | ● 2ᵉ segment, 4 valeurs : « coin animé », « du passage », « coin mort », « pas de coin ici » | – 0 lecture | **DÉFAUT** | idem · `SellingDtos.cs:44` · `mesures/N-inventaire.txt` |
| **D3** | **le prénom du dealer** (`name_i18n.params.prenom`) | ● `"Amara"`, `"Tamsin"` | ● **en tête de chaque rangée** (`<div class="qui"><b>Oskar</b>`), et la légende le dit : « La tête de rangée : le prénom servi » (`:7097`) | ◐ lu `:302`, rendu **seulement** dans la phrase d'un geste de collecte (`:335`, `:346`) — **aucune rangée ne le porte** | **DÉFAUT** | à la place du prénom, le front met la **substance** : `SellingScreenController.cs:409` `Texte(tete.transform, "Nom", NomDeSubstance(d.substance), …)` |
| **D4** | **l'écoulement du coin** (`lane_band`) | ● `"FAST"` | ● cadre 171, `<small class="suite">` | – 0 lecture | **DÉFAUT** (mots = dette datée) | `SellingDtos.cs:45` · `mesures/N-cadre-171-bandes.txt` |
| **D5** | **la clientèle du coin** (`addiction_loyalty_status`) | ● `null` (Brindle) | ● cadre 171, 3 rangées Hush | – 0 lecture | **DÉFAUT** (mots = dette datée) | `SellingDtos.cs:19` |
| **D6** | **le coin resté à sec** (`withdrawn`) | ● `false` | ● cadre 171, rangée Ilse | – 0 lecture **dans ㉟** (2 hors ㉟) | **DÉFAUT** (mots = dette datée) | `SellingDtos.cs:20` · `LaSuite.cs:150,162` |

### D7 — sept littéraux français rendus hors de tout résolveur

Affichés sans passer par `Libelle` : invisibles au cliquet i18n, intraduisibles. Tous dans
`SellingScreenController.cs` :

| texte rendu | ligne |
|---|---|
| `"LES POINTS DE VENTE"` (titre de l'enseigne) | `:649` |
| `"qui vend, et ce qu'il y a dans la caisse"` (sous-titre) | `:654` |
| `"Caisse"` (libellé du rang de crans — c'est le nom du paramètre C#) | `:418` → `:534` |
| `"Marge"` (idem) | `:425` → `:534` |
| `"RAMASSER"` (libellé du bouton) | `:461` |
| `"caisse vide"` / `"aucune planque disponible"` (raison du bouton éteint) | `:465-466` |
| `"au travail"` / `"caisses pleines"` / `"grillés"` (libellés des 3 compteurs) | `:703-705` |

⚠️ Classe de défaut **IMPORTANTE, pas bloquante pour la couverture** : l'information est bien
affichée, c'est son adressage i18n qui manque. Je la sépare de D1-D6.

### Écarts de la maquette (côté M, pas du front)

- **M-E1 — la jauge de caisse a 4 crans pour une bande à 5 valeurs.** Compté sur les 6 rangées des 5
  cadres : `<span class="jg">` porte **4** `<i>`, toujours (`mesures/N-inventaire.txt`, colonne
  `jauge x/4`). Or `DealerCashBand` = `NONE|LOW|MODERATE|HIGH|FULL`
  (`cash-band.ts:37`). **Le front est le fidèle** : `Crans(…, Caisse(d.cash_band), 5, …)`
  (`SellingScreenController.cs:418`). À consigner côté atelier, **ce n'est pas un défaut du front**.
- **M-E2 — trois nombres pour la même chose au cadre 107.** Compteur « **03** caisses pleines », note
  « **deux** caisses sont déjà en haut de l'échelle », et **une seule** jauge mesurée à 4/4 (Oskar).
  Côté M. (Le cadre 171 est cohérent : « 01 caisse pleine », une jauge à 4/4.)

---

## 3. « Passé à côté ? » — pour l'user

**Sur la projection : plus aucune question.** Les 12 clés servies sont toutes soit rendues, soit
dessinées à la maquette (donc en défaut D1-D6), soit de la plomberie d'identité. Ce qui reste :

| # | clé (route) | ce qu'elle dit au joueur | avis d'usage | intérêt |
|---|---|---|---|---|
| 1 | `dealer_spot_id` (`/dealers`) | de quel bâtiment ce dealer tient le coin | **pas ici** : c'est de la plomberie — le front s'en sert déjà pour savoir quel point de vente est vacant (`PointsDeVente.cs:25`), et le joueur lit le quartier, pas un uuid | faible |
| 2 | `dealer` (`/dealers`) | l'identité du dealer | **pas ici** : un uuid ne se montre pas | faible |
| 3 | `dealer_id` + `safehouse_id` (réponse de collecte) | ce qui a bougé et où | **pas ici** : le joueur vient de désigner les deux ; les écrire serait du bruit. Déclarés et jamais lus (`SellingDtos.cs:73-74`), à garder pour l'épingle de contrat | faible |

---

## 4. Lots back suggérés (B⁻ dessiné, forme F)

**AUCUN.** Les deux trous de forme F du 2026-09-07 (`district_name`, `lek_band`) sont **refermés côté
back** — ils sont projetés et je les ai mesurés. C'est le client qui ne les lit pas ⇒ D1 et D2, pas un
lot back.

Colonnes de `dealer` (`db/schema/operational_chain.ts:223-245`) qu'aucune projection joueur ne porte :

| colonne | ligne | dessinée à la maquette ? | lecture |
|---|---|---|---|
| `operating_hours_start` / `_end` | `:230-231` | non | B⁻ pur, pas de forme F |
| `successful_deal_count` | `:238` | non | B⁻ pur |
| `coverage_lek_tile_id` | `:227` | non | interdit par R2.2 (le commentaire de la projection le dit : « never the covered tile ») |
| `float_cents` | `:235` | **oui, en creux** — cadre 112, maillon **L2** « Savoir combien il y a dans la caisse » | ⚠️ **ce n'est pas un lot de plomberie : c'est un arbitrage de canon.** Projeter le montant viole R2.2 frontalement. À faire trancher par l'user, pas par un lot back. |
| `hush_addiction.loyalty_score`, `last_hush_deal_tick` | `:389+` | non | internes, R2.2 |

Le maillon **L4** du cadre 112 (« Ce que devient la caisse d'un dealer grillé ») n'a **aucune colonne
qui le porte** : c'est une mécanique absente, pas une projection oubliée.

---

## 5. Actions : routes ↔ CTA

Routes `@Post` joueur du domaine : **2** (`selling.controller.ts:66` et `:100`, toutes deux sous
`@UseGuards(JwtAuthGuard)`).

| route | maquette | front | état |
|---|---|---|---|
| `POST /v1/operational/dealer/assign` | CTA « AFFECTER UN DEALER » (cadres 107, 111, 171) | bouton « Poster un dealer » par point de vente vacant (`:481`) → `BuildingCardClient.cs:184` | ✔ apparié. ⚠️ **placement différent** : M en fait UN bouton de pied de page, F une rangée par point de vente. La légende de M le sait : « Cité, inchangé : AFFECTER UN DEALER (**aucune route ne sert les points libres**) » (`:7103`) |
| `POST /v1/operational/dealer/:id/collect` | CTA « RAMASSER LA CAISSE » (108) / « RAMASSER — IMPOSSIBLE » éteint (109) | bouton « RAMASSER » par rangée, éteint si `cash_band == "NONE"` ou sans planque (`:429-469`) | ✔ apparié, **mesuré** : refus réel `SELLING_CASH_EMPTY` 409 (`mesures/09-collect-refus.json`) |
| `POST /v1/operational/building/purchase` (**hors domaine de la vente**) | **aucun CTA** | bouton « Acheter un coin de vente » (`:491`) | **à faire ratifier** : un geste du front sans contrepartie en maquette |

---

## 6. Table de couverture complète (40 lignes)

### B — les 12 clés de `GET /v1/operational/dealers` et `GET /v1/operational/dealer/:id`

Toutes **MESURÉES** sur la pile (`X-Server-Build: 8d0184a4`, relevé avant et après), compte jetable
`jd3-9ac333d0bf`, corps `mesures/11-dealers-deux.json` (2 dealers, `Content-Length: 1056` ==
1056 octets écrits).

| # | clé B | valeur mesurée | valeurs possibles (source de la contrainte) | M | F | statut |
|---|---|---|---|---|---|---|
| B01 | `dealer` | `917e277b-…` | uuid opaque | – | LOGIQUE `:391,:458` + `:302` | ✔ |
| B02 | `dealer_spot_id` | `e3e6afc7-…` | uuid opaque | – | LOGIQUE `PointsDeVente.cs:25` | ✔ |
| B03 | `name_i18n` | `{key:"game.fiction.dealer.name", params:{prenom:"Amara"}}` | prénom tiré sur la population du joueur (`dealer-name-refs.ts`) | ● tête de rangée | ◐ phrase de geste seulement | **D3** |
| B04 | `activity_band` | `"WORKING"` | `WORKING\|IDLE\|ABSENT\|COMPROMISED` (`selling.projection.service.ts:48`, `pgEnum('dealer_state')` `operational_chain.ts:52`) | ● | ● RENDU `:414-415`, LOGIQUE `:699,:701` | ✔ |
| B05 | `cash_band` | `"NONE"` | `NONE\|LOW\|MODERATE\|HIGH\|FULL` (`cash-band.ts:37`) | ● (4 crans, cf. M-E1) | ● RENDU `:418` (5 crans), `:421-423`, LOGIQUE `:434,:700` | ✔ |
| B06 | `substance` | `"BRINDLE"` | `BRINDLE\|CRICK\|HUSH\|ASH` (`:90`) | ● icône SVG | ● RENDU `:409` (le mot) | ✔ |
| B07 | `margin_band` | `"STANDARD"` | `STANDARD\|ELEVATED\|PREMIUM\|HIGH_PREMIUM` (`:70`, coupes `:284-290`) | ● mot + 4 traits | ● RENDU `:425` | ✔ |
| B08 | `addiction_loyalty_status` | `null` | `LOW\|STABLE\|HIGH\|null` (`hush-addiction.service.ts:31`) | ● (171) | – | **D5** |
| B09 | `withdrawn` | `false` | booléen (`operational_chain.ts` `hush_addiction.withdrawn`) | ● (171) | – dans ㉟ | **D6** |
| B10 | `district_name` | `"La Lisière"` | chaîne de fiction ou `null` (`nomDeDistrict`) | ● | – | **D1** |
| B11 | `lek_band` | `"LOW"` | `ABSENT\|LOW\|MEDIUM\|HIGH` (`:87`, coupes `:248-253` sur `LEK_SCORE_MAX`) | ● | – | **D2** |
| B12 | `lane_band` | `"FAST"` | `FAST\|STEADY\|SCATTERED\|null` (`lane-clearing-zone.ts:31`, seuils `laneCLo`/`laneCHi`) | ● (171) | – | **D4** |

### B — les 5 clés de `POST /v1/operational/dealer/:id/collect` — **DÉDUIT**

Corps de **succès non mesuré** : sur compte frais la caisse est `NONE` et la remplir exige le tick
`DEALER_SELL` (stock au point de vente + lek), hors de portée sans route `_test` (interdite par le
dossier). **Mesuré, lui** : le refus réel `409 SELLING_CASH_EMPTY` (`mesures/09-collect-refus.json`,
`user_facing_i18n_key: "error.selling.cash_empty"`). Source des 5 clés :
`selling.controller.ts:107-113`, épinglées par
`tests/e2e/operational/selling_collecte_partielle.engine.spec.ts:184`
(`COLLECT_KEYS = ['collected_band','dealer_id','dealer_name_i18n','remaining_band','safehouse_id']`).

| # | clé B | F | statut |
|---|---|---|---|
| B13 | `collect.dealer_id` | déclarée `SellingDtos.cs:73`, **0 lecture** | IGNORÉ (question 3) |
| B14 | `collect.safehouse_id` | déclarée `:74`, **0 lecture dans ㉟** | IGNORÉ (question 3) |
| B15 | `collect.collected_band` | ● RENDU `:345` → `CollecteMots.PhraseDeSucces` | ✔ |
| B16 | `collect.remaining_band` | ● RENDU `:345` | ✔ |
| B17 | `collect.dealer_name_i18n` | ● RENDU `:346` (`resultat.Prenom`) | ✔ |

### M — 17 porteurs d'information que nulle clé B du domaine ne fournit

| id | élément (maquette 73806af8) | F | lecture |
|---|---|---|---|
| M-n1 | compteur « 03/6 au travail » | ● `:703` | dérivé des rangées affichées |
| M-n2 | compteur « 03 caisses pleines » | ● `:704` | dérivé |
| M-n3 | compteur « 01 grillés » | ● `:705` | dérivé |
| M-n4 | note « deux caisses sont déjà en haut de l'échelle » | – | dérivé (et cf. M-E2) |
| M-n5 | rangée sélectionnée `.dl.pris` | – | état d'interface |
| M-n6 | état vide « Aucun dealer sur un point de vente » | ● `:378-381` | dérivé (liste vide) |
| M-n7 | CTA « AFFECTER UN DEALER » | ● `:481` | route d'action |
| M-n8 | CTA « RAMASSER LA CAISSE » | ● `:461` | route d'action |
| M-n9 | CTA éteint + raison « nulle part où la porter » | ● `:463-468` | source hors ㉟ (`GET /v1/city/district/:id/stash`) |
| M-n10 | panneau d'aide 111 « un point de vente et la case qu'il couvre » | – | chrome |
| M-n11 | enseigne « La vente » | ● `:649` | chrome |
| M-n12 | sous-titre contextuel de l'enseigne | ● `:654` | chrome |
| M-n13 | barre de shell ARGENT « 24 850 € » | hors ㉟ | ⚠️ **scalaire brut** — c'est le shell, pas ㉟ |
| M-n14 | barre de shell CHALEUR « Tiède » | hors ㉟ | shell |
| M-n15 | barre de shell « JOUR 12 / Plein jour » | hors ㉟ | shell |
| M-n16 | cadre 112, maillon **L2** | – | manque DÉCLARÉ par l'atelier |
| M-n17 | cadre 112, maillon **L4** | – | manque DÉCLARÉ par l'atelier |

### F — 6 rendus sans clé B **ni** élément de maquette

| id | rendu | ligne |
|---|---|---|
| F-s1 | libellé de rang « Caisse » | `:418` → `:534` |
| F-s2 | libellé de rang « Marge » | `:425` → `:534` |
| F-s3 | illustration d'état vide (`EtatsVidesIllustres`, sujet « vente ») | `:677` |
| F-s4 | rangée d'achat « Vous n'avez aucun coin de vente » + le coût | `:489-493` |
| F-s5 | ligne de retour des gestes poster/acheter (`actionTexte`) | `:235-237`, `:261-263` |
| F-s6 | rangée « Coin de vente sans dealer » + son quartier (source `me/buildings`) | `:476-479` |

---

## 7. Ce que je n'ai pas pu vérifier

1. **Le corps de SUCCÈS de la collecte** — non mesuré (caisse `NONE` sur compte frais). Les 5 clés
   sont DÉDUITES du contrôleur + de l'épingle E2E. **Ce qui trancherait** : un
   `UPDATE dealer SET float_cents` en SQL — interdit par le dossier.
2. **Les valeurs non observées** : `activity_band` ≠ WORKING, `cash_band` ≠ NONE, `lek_band` ≠ LOW,
   `lane_band` ≠ FAST, `addiction_loyalty_status` ≠ `null`, `withdrawn` = `true`, `substance` ≠
   BRINDLE, `margin_band` ≠ STANDARD. Mon compte jetable est Brindle-seul, sans stock, sans tick.
   Les domaines sont lus à la source, pas observés. ⇒ Les lignes B04-B12 portent leur **ensemble de
   clés** comme MESURÉ et leurs **valeurs possibles** comme LU-À-LA-SOURCE.
3. **La pile n'est pas au SHA du cumul.** Re-mesuré avec contrôle positif :
   `git diff --name-only 8d0184a4 44a645a2 -- services/game-back/src/operational/selling/` → **0
   fichier** ; idem pour les 6 dépendances de la projection (`cash-band.ts`,
   `hush-addiction.service.ts`, `lane-clearing-zone.ts`, `district-names.ts`,
   `substance-config.ts`, `dealer-name-refs.ts`). `db/schema/` diffère sur `conflict_combat.ts` et
   `sparse_citizens.ts` (contrôle positif : le diff ciblé sur `conflict_combat.ts` rend bien ce
   fichier) — hors domaine. `i18n/string_table.ts` diffère sur **104** lignes, dont **0** touche une
   clé `vente.*`/`dealer` (contrôle positif : les 8 premières lignes du diff sont des clés `appro.*`
   et `famille.*`). ⇒ **Toutes les lignes de B sont mesurées sur la pile et valides pour le cumul.**
4. **Je n'ai pas rendu l'écran.** La classification F est lue dans le code au SHA `c98cef3d`, pas
   observée en pixels. Un champ lu peut être rendu invisible (couleur, masque, ordre de fratrie) :
   mes `●` de F disent « le code le peint », pas « le joueur le voit ». C'est le juge visuel qui le dit.
5. **Les icônes de substance de la maquette ne sont pas légendées.** Seule celle d'Oskar est nommée
   (« il vend **brindle** », fiche du cadre 108). J'ai mesuré 2 remplissages distincts au cadre 171
   (`#f2c96b` rect = Oskar/Dov, `#c9a8e0` rect+disque = Mira/Joran/Tamsin/Ilse) et la cohérence avec
   les segments de clientèle dit que `#c9a8e0` = HUSH — **c'est une déduction, pas une légende lue**.
6. **Le cadre 112 « Ce qui manque encore » appartient bien à ㉟** : vérifié — son enseigne porte
   « La vente » + « ce qu'on saurait, si le back le disait », et ses deux maillons (L2 caisse, L4
   dealer grillé) sont du domaine. (L'étiquette homonyme à l'index **106** appartient à l'écran
   précédent.) Les indices 107-112 proposés par le dossier sont **exacts** sur les deux SHA.
7. **`vente.geste.planque_pleine_le_reste_attend_dans_la_caisse`** est servi par le back
   (`string_table.ts:2974`) et n'a **aucun lecteur** dans le client (contrôle positif sur
   `vente.refus.la_caisse_de_prenom_est_vide`, qui en a deux). Mineur : la nuance « la planque est
   pleine, le reste attend » n'est jamais dite sur une collecte partielle.

---

## Annexes

### A1. Routes du domaine — compte

**4 routes joueur** dans `services/game-back/src/operational/selling/selling.controller.ts`, toutes
sous `@UseGuards(JwtAuthGuard)` : `POST operational/dealer/assign` (`:66`),
`POST operational/dealer/:id/collect` (`:100`), `GET operational/dealer/:id` (`:139`),
`GET operational/dealers` (`:156`).

Balayage au-delà du module nommé : `grep -rlEi 'dealer|selling|lek|loyalt|addict' --include='*.controller.ts'`
rend **29** contrôleurs ; après exclusion des `*-test`/`*-admin` et des simples mentions en
commentaire, **aucun autre contrôleur joueur ne porte la donnée dealer de ㉟**.

Côté client (`c98cef3d`), les routes que l'écran appelle vraiment : les 4 de `SellingClient.cs` **+ 4
hors domaine** — `GET /v1/world/districts` (`:276`), `GET /v1/city/district/:id/stash` (`:283`),
`GET /v1/me/buildings` (`:213`), `GET /v1/city/district/:id/interior` (`:248`) — plus
`POST /v1/operational/building/purchase` (`:258`). Les deux listes se recouvrent sur les 4 du domaine.

⚠️ **㉟ n'est pas le seul consommateur de ces routes** : l'intérieur de district réutilise les deux
mêmes (`CityProjectionsClient.cs:97` et `:104`) avec son **propre** DTO (`DistrictDealerDto`), et le
bloc « la suite » de l'Accueil lit `DealerDto` (`LaSuite.cs:150,162`). ⇒ Retirer une clé du DTO de ㉟
sous prétexte qu'il ne la lit pas casserait `withdrawn` chez le voisin : c'est la nuance de la
table §1.

### A2. Corps réels — `mesures/`

11 corps, **tous conformes** (octets écrits == `Content-Length`, le piège outil du dossier), tous au
build `8d0184a4` : voir `mesures/build-pile.txt`. Script : `mesures/mesurer.py` (`urllib`, pas `curl`).
Jeton et mot de passe masqués — vérifié par `grep -rF "<jeton>" mesures/` → **0 fichier**, avec
contrôle positif du même grep sur un fichier témoin hors dépôt.

Gestes réels sur mon seul compte jetable : `POST /session/open` ; `POST /operational/dealer/assign`
sur **mon** point de vente `e3e6afc7-…` (201, `dealer_id: 150e167f-…`) ; `POST
/operational/dealer/…/collect` sur **mon** dealer vers **ma** planque (409 attendu).

### A3. Scripts du dossier

| fichier | rôle |
|---|---|
| `mesures/mesurer.py` | mesure de B (signup → session → GET/POST), masquage, contrôle de taille |
| `mesures/indexer-cadres.py` | index des 171/172 étiquettes de la maquette |
| `mesures/extraire-cadres.py` | extraction des cadres par équilibrage explicite des `<div>` (jamais `html.parser` : les balises vides y font disparaître un enfant direct) |
| `mesures/compter-maquette.py`, `-n.py` | inventaire compté de M (a3e02c2a, puis 73806af8) |
| `mesures/controle-arithmetique.py` | le contrôle d'arithmétique, positif `rc=0` / négatif `rc=2` |

### A4. Inventaire M — `mesures/M-inventaire.txt` (a3e02c2a), `mesures/N-inventaire.txt` (73806af8), `mesures/N-cadre-171-bandes.txt`

### A5. Inventaire F — champ → sites → classe

`GET /dealers` (`DealerDto`, 12 champs) : **4 RENDUS** (`activity_band`, `cash_band`, `substance`,
`margin_band`), **2 LOGIQUE** (`dealer`, `dealer_spot_id`), **1 RENDU PARTIEL** (`name_i18n` →
`Prenom`, phrase de geste seulement), **5 IGNORÉS dans ㉟** (`district_name`, `lek_band`,
`lane_band`, `addiction_loyalty_status`, `withdrawn` — ce dernier lu 2 fois hors ㉟).

`POST /collect` (`CollectData`, 5 champs) : **3 RENDUS**, **2 IGNORÉS**.

Résolveurs lus : `SellingScreenController.Caisse/Marge/Activite/NomDeSubstance` (`:577-602`),
`I18n/CollecteMots.cs` (121 lignes). **Aucune valeur de domaine sans libellé** pour les 4 bandes
rendues ; **aucun résolveur** pour les 5 clés ignorées — c'est exactement ce que D1/D2/D4/D5/D6 disent.
