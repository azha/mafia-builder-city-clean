# ecran_appro « La chaîne d'appro » (㉚) — notes d'implémentation, 2026-09-03

Régime de la semaine : PAS de suite complète, PAS de revue ⊥, PAS de gate. Preuve exigée :
compilation 0 erreur avec contrôles positifs (`Tools/verifier-compilation-sans-unity.sh` +
`Tools/verifier-references-asmdef.py`, chacun avec `--controle-positif`). **L'éditeur Unity n'a
PAS été lancé** (consigne du chantier — un second éditeur aurait cassé le créneau tenu par
l'user) : rien de ce qui suit n'a été vérifié visuellement en Play Mode.

## Fichiers touchés

- `Assets/Scripts/Operational/ChaineDAppro/ChaineDApproScreenController.cs` — métier complet.
- `Assets/Scripts/Operational/ChaineDAppro/ChaineDApproClient.cs` — `GetOperationalPrecursors`
  prend désormais `buildingId` (paramètre obligatoire côté back, mesuré) ; docs des 4 routes
  corrigées sur ce qui a été mesuré le 2026-09-03.
- `Assets/Scripts/Operational/ChaineDAppro/ChaineDApproDtos.cs` — les 9 clés de la fiche, le
  corps/la réponse de la commande, la forme mesurée de `supply-chain/graph` (`nodes`/`legs`/
  `routes`, avec deux types placeholders pour `nodes`/`routes` dont la forme n'a jamais été
  observée non vide).
- `Assets/Tests/PlayMode/ChaineDApproScreenPlayModeTests.cs` — plancher de la garde structurelle
  relevé, + 1 test de PARCOURS réel (signup → découverte du bâtiment → route), 3 tests d'ÉTAT
  (`RendrePourTest`/`RendrePourTestChaine`), 2 tests de résolveur (positif + négatif sur le seul
  domaine fermé confirmé).
- `Assets/Scripts/Shell/AppShell.cs` — une ligne ajoutée dans `DestinationsPlus()` ; rien
  d'autre touché.
- `Tools/juge-visuel/ecran_appro/dossier.md` — sections statiques remplies (nom, chemin joueur
  réel, routes) ; sections dépendant d'une capture marquées « non fourni », bannière en tête.

## Clés servies (AFFICHÉES) vs non affichées

Les 9 clés de `GET /v1/operational/precursors` :

| clé | affichée ? | où |
|---|---|---|
| `precursor_type` | oui | titre de la fiche (`ChaineDApproResolvers.TitreLisible`) |
| `stock_band` | oui | ligne « CE QU'IL EN RESTE » (texte) |
| `stock_liters_label` | oui | même ligne, TEL QUEL (label déjà formaté par le back) |
| `price_trend_bucket` | oui | ligne « LE PRIX » |
| `supplier_pressure_bucket` | oui | ligne « LE FOURNISSEUR » |
| `has_pending_order` | oui (pilote l'état) | titre, 5e ligne « LA COMMANDE », pied |
| `has_arrived_order` | oui (pilote l'état) | titre, pied |
| `scarcity_active` | oui | bannière « pénurie en ville » |
| `building` | NON affiché | consommé seulement comme identité de requête |

`GET /v1/supply-chain/graph` : seule la LONGUEUR de `nodes` est consommée (vide/non-vide) pour
choisir le message de la section « chaîne » — R2.2 respecté (pas de scalaire affiché, un état
booléen interne pilote un texte, comme la garde `RestraintEstPresente` de ㊲). `legs`/`routes` ne
sont ni affichés ni utilisés cette passe.

## Éléments DESSINÉS SANS SOURCE, avec leur pis-aller

1. **« À QUOI ÇA SERT » → « pour le brindle »** (m-48). Aucune des 9 clés ne porte l'usage d'un
   précurseur. Pis-aller : le texte verbatim de la maquette n'est affiché QUE si
   `precursor_type == "PYRALIN"` (le seul cas mesuré) ; tout autre type reçoit un texte générique
   (« sert à la production ») plutôt que la copie Pyralin-spécifique, qui serait activement fausse
   pour, par exemple, THALMITE. Site : `ChaineDApproScreenController.RendreFiche`.
2. **La réplique de lieutenant** (« Nestor : « L'étagère est vide… » », m-48). Même trou : aucune
   clé ne porte de nom ni de réplique de lieutenant. Même traitement (verbatim si PYRALIN,
   générique sinon). Site : `ChaineDApproScreenController.RendrePied`.
3. **Le titre/sous-titre et le pied de l'état « livrée »** (`has_arrived_order == true`).
   ⛔ **AUCUNE MAQUETTE NE COUVRE CET ÉTAT** — m-48/49/53 couvrent repos/en cours/délégué, mais pas
   « livrée », alors que le brief demande explicitement les TROIS états pilotés par la donnée.
   Copie entièrement inventée (« La commande est arrivée. » / « Livraison réceptionnée. »), dans
   le registre des deux autres titres. **À valider par l'user ou une vraie maquette dès qu'une
   `m-XX.png` existe pour ce cas.**
4. **La section chaîne, cas `nodes` non vide** (« Des maillons existent, mais cet écran ne sait
   pas encore les afficher. »). Jamais observé sur le compte de démo — texte de repli honnête,
   pas un rendu réel des maillons (aucune maquette ni forme de nœud mesurée pour ce cas).

## Ce qui a été TRANCHÉ

### Découverte du bâtiment (§4/§5 du brief)

Aucune route ne liste les bâtiments du joueur. Deux options offertes par le brief :
`supply-chain/graph` (`legs[].origin_building_id`) ou un balayage districts → interior.

**Choix : balayage districts → interior**, via REUSE de `MafiaCleanCity.CityMap.WorldApiClient`/
`CityProjectionsClient` (DRY — pas de second client HTTP réécrit). `GET /v1/world/districts`
(sans auth) → filtrer `control_state == "PLAYER_HELD"` → `GET .../interior` sur le premier
district possédé → premier `buildings[].building`.

Raison du choix : le statut de POPULATION de `legs[]` sur le compte de démo n'a jamais été
mesuré (contrairement à `nodes`, confirmé VIDE) — construire la découverte du bâtiment sur le
même graphe qui sert par ailleurs à PROUVER l'absence de données aurait été fragile par
construction, et la forme `legs[].origin_building_id` n'a même pas été confirmée non vide.

**Coût** : 1 appel `GET /v1/world/districts` + 1 appel `.../interior` par district `PLAYER_HELD`
rencontré, dans l'ordre, jusqu'au premier qui porte un bâtiment. Cas courant (mesuré ailleurs
dans ce dépôt : un compte frais n'a qu'un district possédé) : **2 appels**. Pire cas non observé :
1 + N si plusieurs districts possédés sont vides de bâtiments.

### Maquette source (largeur CSS de référence)

Le squelette généré posait `EchelleMaquette.LargeurEcransBrennar` (300) par défaut, avec une
consigne explicite de vérifier laquelle des maquettes est la source. Les mockups vivent dans
`Tools/juge-visuel/v6/` (`m-48.png`..`m-53.png`) — ce nom de dossier ne recoupe AUCUN des 4 noms
de fichiers HTML déjà cités dans `EchelleMaquette.cs` (`hud-brennar.html`=392,
`ecrans-brennar.html`=300, `ecrans-brennar-6.html`=300, `ecrans-brennar-4.html`=300). Lire la
source HTML pour trancher aurait exigé de sortir de l'arbre `mafia-unity-C` (elle vit dans
`atelier3d-mafia`, hors périmètre de ce chantier — règle absolue du brief). **Conservé le
défaut du squelette (300)** : les 3 candidats à 300 valent aujourd'hui le même nombre, donc ce
choix ne change RIEN tant qu'ils ne divergent pas. Si un futur lot mesure la vraie source et
qu'elle diverge, ce fichier devra être corrigé (et potentiellement une 4e constante nommée créée).

## Prémisses du brief trouvées FAUSSES

1. **« SetAsLastSibling() dans SetMountParent ET dans OnTransformParentChanged »** — FAUX. Le
   commit le plus récent du dépôt au moment de l'écriture de ce fichier
   (`ShopScreenController.cs`, `3f5d60f`, 2026-09-02 16:03 — postérieur de 10h à
   `ReputationScreenController`, 06:42 le même jour) documente NOMMÉMENT que
   `OnTransformParentChanged` ne peut JAMAIS tirer : au moment où le shell re-parente le host, le
   composant tenant n'existe pas encore (`AddComponent&lt;T&gt;()` arrive après). Le vrai patron,
   mesuré dans le corps de Shop : un second appel à `SetAsLastSibling()` dans `Start()`. C'est
   celui-ci que ce fichier suit — voir le commentaire de `SetMountParent`/`Start()` dans
   `ChaineDApproScreenController.cs`.
2. **Le générateur a imprimé un `case Tab.More:` désigné comme périmé par le brief lui-même** —
   confirmé : aucune trace de ce switch n'existe dans `AppShell.cs` (mesuré par `grep`). La
   navigation réelle passe par `DestinationsPlus()` (un menu, depuis le 2026-09-02), et c'est là
   qu'a été posée la ligne demandée.
3. **Le contrat de `GET /v1/operational/precursors` et `GET /v1/supply-chain/graph`** — le brief
   lui-même prévenait que sa propre note se trompait sur ces deux contrats (`building_id`
   obligatoire, 9 clés et non 5, préfixe `operational/` absent du 2e). Suivi la mesure donnée par
   le brief, pas la note qui la précédait — comportement demandé, pas une correction de ma part.

## Ce qui reste À FAIRE / À MESURER

- Couleurs `RougeMauvais`/`VertBon` réutilisent `DesignTokens.accentDanger`/`accentSuccess`
  (accents sémantiques génériques, documentés comme réutilisables) plutôt qu'un hex local — leur
  teinte exacte n'a PAS été comparée pixel à pixel à la maquette. `Creme`/`CremeSecondaire`/`Or`
  sont des hex locaux repris du voisin le plus proche (`ShopScreenController`, même famille de
  maquette) ; `EncreSombre` (#241804) est une ESTIMATION VISUELLE, non échantillonnée au pixel —
  aucun outil de lecture de pixel n'était disponible cette passe.
- `price_trend_bucket`/`stock_band` : seule UNE valeur de chacun est mesurée (`UP`/`NONE`). Les
  littéraux `STABLE`/`DOWN` sont des hypothèses de clé (le TEXTE associé, lui, est confirmé par le
  design — m-49/m-53). Repli GRACIEUX sur la valeur brute si le nom réel diverge — voir
  `ChaineDApproResolvers`.
- État « livrée » (point 3 ci-dessus) : copie à valider dès qu'une maquette existe.
- `quantity_units` de la commande : posé à 1 (pis-aller — aucune UI de quantité dans la
  maquette). À confirmer/ajuster si le produit veut une quantité différente par défaut.
- `Tools/juge-visuel/ecran_appro/dossier.md` : sections capture/échelle/écarts non remplies
  (éditeur non lancé). À invoquer via le skill `juge-visuel` dès qu'une capture réelle existe.
- Aucun test n'a pu être EXÉCUTÉ (l'éditeur n'a pas tourné) — seule la COMPILATION est prouvée
  cette passe (voir le rapport de session pour la sortie des 4 commandes).
