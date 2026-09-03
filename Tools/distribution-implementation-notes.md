# ecran_distribution « La distribution » (㉘) — notes d'implémentation, 2026-09-03

Régime de la semaine : PAS de suite complète, PAS de revue ⊥, PAS de gate. Preuve exigée :
compilation 0 erreur avec contrôles positifs (`Tools/verifier-compilation-sans-unity.sh` +
`Tools/verifier-references-asmdef.py`, chacun avec `--controle-positif`). **L'éditeur Unity n'a
PAS été lancé** (consigne du chantier) : rien de ce qui suit n'a été vérifié visuellement en Play
Mode ni jugé par `juge-visuel`/`juge-données`.

## Fichiers touchés

- `Assets/Scripts/Operational/Distribution/DistributionScreenController.cs` — métier complet
  (+~640 lignes depuis le squelette généré).
- `Assets/Scripts/Operational/Distribution/DistributionClient.cs` — docs des 4 routes corrigées
  sur ce qui a été mesuré le 2026-09-03 (le squelette avait la mécanique HTTP juste, seuls les
  commentaires « TODO(MÉTIER ICI) » ont été remplacés).
- `Assets/Scripts/Operational/Distribution/DistributionDtos.cs` — les 5 clés de `couriers[]`, les
  5 clés de `routes[]`, le corps de `dispatch` (3 champs, mesurés par énumération successive de
  422), le corps/la réponse de `vehicles/purchase` (mesurée en SUCCÈS RÉEL).
- `Assets/Tests/PlayMode/DistributionScreenPlayModeTests.cs` — plancher de garde structurelle,
  DEUX tests de PARCOURS réel (un compte frais SANS distribution_hub, le compte de démo AVEC),
  5 tests d'ÉTAT (`RendrePourTest`), 6 tests de résolveur (positifs + repli gracieux — aucun
  domaine n'est confirmé fermé ici, donc aucun test négatif « doit lever »).
- `Assets/Scripts/Shell/AppShell.cs` — une ligne ajoutée dans `DestinationsPlus()` ; rien d'autre
  touché.
- `Assets/Editor/MafiaCI.cs` — `EcranDistribution`/`PhotoEcranDistribution` ajoutées à
  `Categories` (TD-490 : sans ça, la suite compile et ne tourne jamais, en silence).
- `Tools/juge-visuel/ecran_distribution/dossier.md` — généré par `nouvel-ecran.py`, NON rempli
  (aucune capture prise cette passe, éditeur non lancé).

## Prémisses du brief RÉFUTÉES OU CORRIGÉES PAR LA MESURE (`rtk proxy curl`, 2026-09-03)

Un `curl` NU sur cet arbre ne rend PAS le corps JSON réel : il rend un SCHÉMA DE TYPES
(`{code: string, http_status: int, …}` à la place des valeurs). Toutes les mesures ci-dessous
sont passées par `rtk proxy curl` après avoir découvert ce piège sur le premier appel (signin) —
piège NOUVEAU, non documenté dans le socle avant cette session, à y ajouter.

1. **`POST .../dispatch` ne prend NI `vehicle_type` NI `route_id`** — corps mesuré par 422
   successifs : `{from_building_id, to_building_id, cargo_grams}`, dans cet ordre de validation.
   Conséquence structurelle : **la « route » affichée sur le liège
   (`sinuosity_bucket`/`river_crossings_count_bucket`/`route_state`) et le couple de bâtiments
   que `dispatch` exige ne partagent AUCUNE clé de jointure.** `GET .../projection` ne porte
   aucun identifiant de bâtiment. Impossible de savoir, depuis les 4 routes données, QUEL couple
   (from,to) produit QUELLE des 3 routes affichées. Voir § Deviations.
2. **« Le labo de Spine-B » / « Le comptoir de Lattice-A » ne sont pas de la fiction pure.**
   `Spine-B` et `Lattice-A` sont des `name_canonical` RÉELS de `GET /v1/world/districts`
   (districts 5 et 8 sur ce compte, profils `spine`/`lattice`). Mais le joueur de démo ne
   possède AUCUN bâtiment dans ces deux districts précis — ses 4 bâtiments vivent en
   `Tidewater-1` (le hub de distribution), `Stack-1`, `Glass-1`, `Verge-A`. La maquette montre
   donc un exemple à valeurs FIXES d'un autre compte/scénario, pas ce compte-ci. `LabelBatiment`
   construit le MÊME GENRE de libellé (type de bâtiment + `name_canonical` réel) plutôt que de
   recopier les littéraux de la maquette tels quels ou d'inventer un nom sans rapport.
3. **`available_vehicles` n'est PAS incohérent avec les 2 courriers BIKE déjà possédés** — c'est
   la flotte de véhicules ACHETÉE (`POST .../vehicles/purchase`, un pool par joueur) qui le
   peuple, pas les courriers existants. Mesuré en direct : avant tout achat, les 3 routes
   rendaient `available_vehicles: ["FOOT"]` ; après UN `POST .../vehicles/purchase
   {vehicle_type:"bike"}` réel (succès, `{ok:true}`), les 3 routes sont passées d'un coup à
   `["FOOT","BIKE"]`. Les 2 courriers BIKE existants ont donc été seedés autrement que par cette
   route d'achat — `available_vehicles` ne les « voit » jamais.
4. **⛔⛔ UN COMPTE FRAÎCHEMENT SIGNÉ N'A AUCUN `distribution_hub`.** Mesuré via un vrai `POST
   /v1/auth/signup` + balayage des 18 districts : le kit de départ (4 bâtiments, district
   `Verge-A`) est `lab`, `stash`, `front_shop`, `cash_safehouse`. **Zéro `distribution_hub`.**
   La prémisse de cet écran entier (un hub de distribution) NE TIENT DONC PAS au jour 1 sur ce
   back — c'est le compte de démo `operational_demo@example.test`, nommément fourni par le
   brief, qui EN possède un (district `Tidewater-1`, enseigne non mesurée côté nom mais type
   confirmé). Voir `EcranDistributionP1` (test auto-invalidant : il rougira si le starter kit
   change) et `EcranDistributionP2` (le compte de démo, qui réussit).
   ⇒ **Ce n'est pas un défaut de ce lot.** Même famille que « insurance mort à 3 maillons » du
   socle (`CLAUDE.md`) : un distribution_hub doit s'acquérir en jeu (achat/conversion/quête —
   mécanisme non mesuré, hors des 4 routes données), et cet écran restera « La distribution est
   indisponible » pour tout joueur qui n'a pas encore ce bâtiment.

## Clés servies (AFFICHÉES) vs non affichées

`GET /v1/operational/couriers` (5 clés) :

| clé | affichée ? | où |
|---|---|---|
| `courier` | non affiché | clé de nommage du GameObject seulement |
| `vehicle_type` | oui | ligne courrier, résolveur `TexteVehicule` |
| `transit_band` | oui (pilote l'état du board ET la ligne courrier) | titre, pied (bouton), résolveur `TexteTransitBand` |
| `temperature_status` | oui SI non-null (jamais observé) | note sous la ligne courrier, valeur BRUTE |
| `degrading` | oui SI true (jamais observé) | note sous la ligne courrier, texte fixe |

`GET /v1/operational/distribution/projection` (5 clés, route `[0]` seulement — voir § Deviations) :

| clé | affichée ? | où |
|---|---|---|
| `route_id` | NON affiché | aucun usage — sert de clé de jointure théorique, inatteignable (voir point 1 ci-dessus) |
| `sinuosity_bucket` | oui | ligne « LE CHEMIN », résolveur `TexteChemin` |
| `river_crossings_count_bucket` | oui | ligne « À TRAVERSER », résolveur `TexteTraverser` |
| `route_state` | oui | ligne « CETTE ROUTE », résolveur `TexteRouteState` |
| `available_vehicles` | NON affiché | mesuré et documenté (point 3), mais aucune UI de sélection de véhicule n'existe dans la maquette pour l'exploiter |

## Éléments DESSINÉS SANS SOURCE, avec leur pis-aller

1. **« Le labo de Spine-B » / « Le comptoir de Lattice-A »** — voir point 2 ci-dessus. Pis-aller :
   `LabelBatiment` compose « [Type de bâtiment réel] de [district réel] » depuis le bâtiment
   DÉCOUVERT (districts + interior), jamais les littéraux fixes de la maquette. Site :
   `DistributionScreenController.LabelBatiment`/`NomTypeBatiment`.
2. **« Dima / LA RÉGULATION · J9 »** — aucune des 5+5 clés mesurées ne porte de nom, de rôle ni
   de jour de lieutenant. Pis-aller EN DEUX TEMPS : (a) si le bâtiment hub possède un lieutenant
   assigné (`lieutenant_ids[0]`, joint à `district.lieutenants[]`), son nom RÉEL est affiché
   (mesuré sur le compte de démo : « Lt. Hara ») ; (b) sinon, repli sur le littéral EXACT de la
   maquette (« Dima »). Le rôle (« LA RÉGULATION ») et le jour (« · J9 ») restent des littéraux
   fixes, aucune source dans aucun des 4 corps. Site : `RendrePied`.
3. **Les 3 répliques de lieutenant** (repos/en-transit/livré) — verbatim de m-54/m-55/m-56,
   flavor text statique, aucune tentative de les rendre dynamiques (rien à sourcer).
4. **Le panneau de liège lui-même (texture pointillée) et la ficelle** — approximation
   volontaire : un rectangle brun uni (`Liege`, couleur ESTIMÉE visuellement, non échantillonnée
   au pixel, même trou que ㉚) et DEUX étiquettes empilées, sans tracé de corde point-à-point. Le
   lien « ça part d'ici, ça va là » est porté par le TEXTE (D'OÙ ÇA PART / OÙ ÇA VA) et l'ordre
   visuel haut→bas, pas par une géométrie de corde. `juge-visuel` tranchera si c'est assez.
5. **« ACHETER UN VÉLO »** — aucune maquette (m-54..m-58) ne montre de contrôle d'achat de
   véhicule. Ajouté pour câbler `POST .../vehicles/purchase` (mesurée en succès réel) comme le
   demandait le brief (« mesure-les toi-même avant de les câbler »). Type fixé à `"bike"` — pas
   de sélecteur, aucune UI de choix dans la maquette.
6. **Section « VOS COURRIERS »** — aucune maquette ne montre de liste de courriers ; m-54..m-58 ne
   portent qu'UN fil narratif (un seul courrier à la fois). Ajoutée pour satisfaire le brief §2.

## Ce qui a été TRANCHÉ

### Découverte du hub de distribution et d'une destination (§ Deviations, point 1)

Aucune route ne liste les bâtiments du joueur (même trou que ㉚). Balayage districts → interior
(REUSE `WorldApiClient`/`CityProjectionsClient`), filtré cette fois sur `operational_type ==
"distribution_hub"` pour le « from » — filtre JUSTIFIÉ ici (contrairement à ㉚ qui l'a
explicitement évité) parce que cet écran EST la distribution, et que le type existe et a été
mesuré une fois sur ce compte.

Le « to » (destination) est en revanche un pur HEURISTIQUE, pas une lecture de donnée sourcée :
le premier bâtiment `front_shop`/`dealer_spot_front` trouvé, hors du hub, dans le MÊME balayage
séquentiel (districts 1→18). Si aucun n'existe, `ToBuildingId` reste `null` et l'écran le dit
honnêtement (pas de bouton fabriqué sur un id inventé — voir `RendrePied`).

**Ce heuristique est fragile et NE DOIT PAS être considéré comme un contrat.** Rien dans les 4
routes ne prouve qu'envoyer du hub vers CE point de vente précis est le geste que le jeu attend
(le maquette pourrait très bien vouloir un point de vente choisi par le joueur, ou déterminé par
une règle serveur non observée). Signalé explicitement — pas deviné en silence.

### État du board — piloté par l'agrégat `transit_band`, PAS par `route_state`

Puisque courriers et routes ne partagent aucune clé (point 1), le TITRE/bouton du board est
piloté par l'agrégat des `transit_band` des courriers (in-transit prioritaire > arrivé > repos),
tandis que les 3 lignes de détail (LE CHEMIN/À TRAVERSER/CETTE ROUTE) restent TOUJOURS sourcées
sur `route.route_state` etc., indépendamment de l'état du board. C'est une DÉCISION DE DESIGN
faite ici, pas une lecture de la maquette (qui, elle, présente 4 états comme s'ils étaient tous
la même chose vue à des moments différents — ce que les données ne permettent pas de reconstruire
fidèlement). m-57 (route rompue) et m-58 (coursier arrêté, mécanique de dilemme à 3 choix
entièrement différente) NE SONT PAS construits : aucune clé mesurée ne les porte.

### `route_state` : "active" → "tient"

Seule valeur mesurée sur les 3 routes du compte de démo. Aucune maquette ne nomme "active"
littéralement — la lecture retenue (m-55, « tient », vert) est une INFÉRENCE documentée, pas une
mesure. `severed`/`saturated`, annoncés par le brief comme des CLÉS, sont confirmés absents du
corps ; s'ils existent comme VALEURS de `route_state`, ils n'ont jamais été observés ici.

## Ce qui reste ouvert (à trancher par l'user ou une revue ⊥)

- Le heuristique de destination (« premier point de vente trouvé ») est-il le bon geste produit,
  ou l'écran doit-il plutôt laisser le joueur CHOISIR une destination parmi ses bâtiments ? Rien
  dans la maquette (pas de liste, pas de sélecteur) ne tranche.
- `cargo_grams: 1` (pis-aller minimal) vs « ça vide le stock du labo » (texte de la maquette, qui
  suggère un envoi total) — jamais mesurable : le hub de distribution du compte de démo a un
  stock à zéro (`dispatch` échoue en 409 dès `cargo_grams: 1`).
- m-58 (coursier arrêté) ressemble à un ÉCRAN/ÉVÉNEMENT SÉPARÉ (mugshot, 3 choix moraux) plutôt
  qu'un état de CET écran — aucune des 4 routes données ne le sert. À confirmer avec le
  chantier : appartient-il à ㉘ ou à un autre écran non encore scaffoldé ?
