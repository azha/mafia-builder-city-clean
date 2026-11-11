# ㉚ — le rendu des maillons (cadre 154 « La chaîne vue du graphe ») — design d'UNE page (11/11, CLIENT-1)

**Mandat** f2 11/11 ; cadre RATIFIÉ atelier master `4ae50cca` (`ecrans-brennar-6.html`, repéré par son libellé). Empilé sur la pile navigate
(`4c674fcd`, qui porte ㉚ TD-985 Q1). Rulings f2 du 11/11 : **(A)** le cadre se rend DANS la section chaîne de ㉚, sous le bon, et
remplace « LA CHAÎNE, EN REMONTANT » ; **(a)** dès ≥ 1 nœud, la liste seule (la phrase de la table 63 et `ToutSilencieux` partent).

## Problème
Un nœud non `silent` : ㉚ dit une phrase de chantier (« Des maillons existent, mais cet écran ne sait pas encore les afficher. », TD-985 Q1). Le
graphe est servi, les mots des bandes aussi (BACK-1), les noms aussi (`me/buildings`) : l'écran peut montrer la chaîne.

## Sources (V15, recopiées du CODE)
- `GET /v1/supply-chain/graph` — `supply-chain.controller.ts:78-150` (main `6040a213`) : `nodes[] {building_id, bucket, has_arrow,
  arrow_to_building_id}`, `legs[] {leg_id, origin_building_id, destination_building_id, debt_bucket, bypassed}`. Domaines :
  `BackpressureBucket` = silent|mild|warm|critical (`backpressure-bucket.ts:22`), `DebtBucket` = fresh|accruing|stressed|fractured (`debt-bucket.ts:23`).
  Aucun ordre servi. DTO client déjà en place (`ChaineDApproDtos.cs:70-112`).
- Noms : `GET /v1/me/buildings` (déjà lu par `DecouvrirBuildingId`), `name_i18n` OBLIGATOIRE (`player-buildings.controller.ts:134`,
  `nomObligatoire`), bâtiments non démolis seulement (`:107`). Rendu : `I18nCatalog.Traduire(key, params)` (patron `BuildingCardController.NomDuBatiment`).
  Absent de la liste ⇒ **bâtiment démoli** ⇒ repli ratifié « un bâtiment détruit ».
- Mots : bandes `appro.pression.*` / `appro.dette.*` (`lot/chaine-bandes` f9d92251) et `appro.fournisseur.*` (`lot/chaine-bandes-2` 1845e0e8),
  lus par `Libelle.ParValeur` (clé = la VALEUR servie). Les 7 mots de structure : noms FIGÉS par BACK-1 (design @a7df3592, code en cours) —
  `appro.titre.{la_chaine,les_maillons,les_liaisons}`, `appro.sous_titre.chaque_maillon_…` (U+202F avant « ; »), `appro.etiquette.{refoule_vers,contournee,
  un_batiment_detruit}` — en `Gabarit(clé, repli)`, repli = FR du design à l'octet. « refoule vers » : étiquette sans paramètre, le nom la suit.

## Changement
1. **`AppliquerChaine`** : en-tête fixe (`.appr6 .entete` : « La chaîne » serif gras 12 px `#f0dfc4`, sous-titre 7 px `#9a8f78`, fond `#1e1b16`,
   filet bas = recette mesurée `ChaineDAppro.Entete`), puis une fenêtre qui DÉFILE (`ListeDefilante.Equiper`, fondu = `Support.CouleurDuBas`) :
   titron « Les maillons » (6,6 px, capitales, `#8a8069`), une ligne par nœud ; titron « Les liaisons » (marge haute 9 px), une ligne par liaison.
   Une section sans ligne n'affiche pas son titron. 0 nœud ET 0 liaison ⇒ « Rien à remonter… » (inchangé). La section prend la hauteur restante.
2. **Maillon** (`.noeud.gr30-n`, filet = recette mesurée `ChaineDAppro.Noeud`) : pastille 9 px de la couleur de bande · nom (serif gras 8,4 px
   `#efe6d4`) · si **`has_arrow`**, et seulement alors : « ↳ refoule vers {nom} » (6,4 / 7 px) · à droite le mot de bande, encadré de sa couleur.
3. **Liaison** (`.gr30-l`, fond `#1d1a16`, filet `#38332a` r 3) : origine, puis « → » destination (sans 7,4 px `#d8cfbb`) · si **`bypassed`** :
   filet TIRETÉ `#6f6656` + « contournée » (italique 7 px `#8a8069`) · à droite le mot de dette, encadré.
4. **Couleurs de bande** (cadre) : critical/fractured `#d97a6a` · warm/stressed `#e08a4a` · mild/accruing = jeton `hudMoneyUnderlineGold`
   (`#d9ab4e`, distance 0 : TD-612) · silent/fresh `#8fb59a`. Valeur hors domaine ⇒ `Repli.Etat` (jamais le mot anglais), triée en dernier.
5. **Tri (règle du CLIENT)** : rang de bande (pire → meilleure), puis nom AFFICHÉ (`fr-FR`), puis l'id (stabilité). Liaisons : rang, origine,
   destination, `leg_id`.
6. **Retraits** : la phrase provisoire (TD-985 FERMÉE), la phrase de la table 63 et `ToutSilencieux` (+ S3) — les clés servies
   `appro.bloc.des_maillons_…` et `appro.vide.rien_ne_circule_…` n'ont plus de lecteur (le back peut les garder, rien ne se renomme).
7. **:462** `TextePressionFournisseur` : `Libelle.ParValeur("appro","fournisseur", valeur, repli)`, repli = l'actuel (égal au FR servi).
8. Filets non mesurés (liaison, tireté, cadres de bande hors `#d97a6a`) : recette LOCALE recopiée du CSS du cadre (patron
   `DistributionScreenController.RecetteCadreB`) — la mesure Chromium indexe les cadres par position, re-mesurer remuerait les autres écrans.

## Falsifiable (gardes, catégorie EcranAppro — à JOUER au créneau)
- **G1 tri + effet** : 5 nœuds + 4 liaisons du cadre (bandes, flèche, contournée) ⇒ ordre exact des noms rendus ; 1 seule « refoule vers ».
- **G2 flèche = `has_arrow`** : deux `warm`, un seul a la flèche ⇒ 1 texte « refoule vers » ; contrôle : `has_arrow=false` partout ⇒ 0.
- **G3 démoli** : un `building_id` absent de `me/buildings` ⇒ « un bâtiment détruit » (contrôle : présent ⇒ son nom).
- **G4 structurel** : la fenêtre est sous un `ListeDefilante`, tout `Graphic` porte son `CanvasRenderer`, le filet tireté existe sur la seule contournée.
- **G5 défile** : 30 nœuds ⇒ `ContenuDepasse` vrai ; 1 nœud ⇒ faux.
- **G6 clés** : chaque mot rendu passe par sa clé (`ValeurAttendue`), et les 18 clés non servies sont en DetteDatee de ZeroRepli.
- **G7 hors domaine** (revue ⊥) : une 5ᵉ valeur ⇒ « état inconnu » (`commun.repli.etat_inconnu`, servie), rang dernier ; jamais la valeur brute.
- Le détecteur TD-985 (2 enfants) est REMPLACÉ par G1 ; E3 (vide) inchangé ; R1 lit `ValeurAttendue` au lieu du littéral.

## Statiques avant commit
`--frais Operational` puis `--tout` (17/17), `--controle` sur le contrôleur et le test, cliquet des chaînes (population mesurée, pas crue),
TD-612 (distance des couleurs neuves aux jetons : mesurée, 1 recopie → jeton). Hors lot : routes (dette du cadre, clés `appro.sinuosite.*` /
`appro.effondrement.*` à câbler quand TD-1013 sera rendu) ; mener 106 `supply_chain_trace` à ㉚ (TD-981) : à décider par f2.
