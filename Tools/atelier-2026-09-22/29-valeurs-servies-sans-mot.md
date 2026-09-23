# Les 16 valeurs servies sans mot — relevées par le test de couverture de domaine de CLIENT-2 (proposé, non ratifié)

> Atelier / DA, 2026-09-23. Source : `Assets/Tests/PlayMode/ReplisPlayModeTests.cs` à `10d32c75` (arbre `mafia-unity-F`) — 49 résolveurs,
> domaines lus dans le back `066adae8`, la « dette » déclarée de chacun. Vérifié : `python3 Tools/atelier-2026-09-22/verifier-29.py`.
> **La clé exacte** : pour ② (`BuildingCardController`), les bandes passent par `Bande(famille, valeur)` → `building.<famille>.<valeur>`, et
> `StructuralLabel` par `Cle("structural", <mot anglais>)` → `building.structural.<slug>`. Pour Distribution, Chaîne d'appro et Loi, les
> résolveurs (`TexteRouteState`, `NomTypeBatiment`, `TexteStock`, `TierLabelCourt`) rendent aujourd'hui des **littéraux sans clé** — même
> pour leurs valeurs déjà nommées (« tient », « la raffinerie », « il n'y a plus rien », « cabinet ») : la clé est celle que
> `Libelle.De(<domaine>, "bloc", fr)` dérivera quand CLIENT-2 les y fera passer (domaine du fichier : `distribution`, `appro`, `loi`).

## 1. ② la fiche bâtiment

`NONE` est, au back, la convention « neutre » d'un bâtiment **auquel la bande ne s'applique pas** (`distribution.projection.service.ts:210`
« the SAME neutral-NONE convention hub_tier_band uses for a non-hub building », `real-estate.projection.service.ts:117`,
`money-holding.projection.service.ts:18` « BYTE-MIRROR of hub_tier_band / lab_tier_band »). À l'écran, c'est donc « il n'y a pas de … ici » ;
une clé par famille, donc chacun s'accorde avec sa ligne.

| clé | fr | en | valeur servie · ligne de ② |
|---|---|---|---|
| `building.structural.failed` | Hors service | Out of service | `structural_state` FAILED · « Structure » — le mot que ① emploie déjà pour la même bande (`LibellesBatiment.cs:93`, `condition_band` FAILED) |
| `building.lab_tier.none` | Pas de labo | No lab | `lab_tier_band` NONE · « Taille du labo » |
| `building.hub_tier.none` | Pas de relais | No hub | `hub_tier_band` NONE · « Taille du relais » |
| `building.roster.none` | Pas d’équipe | No crew | `roster_band` NONE · « Équipe » (servi `building.row.equipe` / « Crew ») |
| `building.money_holding_tier.none` | Pas de banque | No vault | `money_holding_tier_band` NONE · « Taille de la banque » |
| `building.capacity.none` | Pas de banque | No vault | `capacity_band` NONE · « Capacité » (la capacité est celle de la banque) |
| `building.yield.none` | Pas de banque | No vault | `yield_band` NONE · « Rendement » (le rendement de la banque) |

Mieux encore, côté client : ces lignes ne devraient pas s'afficher sur un bâtiment où elles ne s'appliquent pas ; les mots sont le filet.

## 2. Distribution (`DistributionScreenController`)

| clé | fr | en | valeur servie |
|---|---|---|---|
| `distribution.bloc.pas_encore_tendue` | pas encore tendue | not strung yet | `route_state` draft — le mot de la maison, « tendre » une route (`distribution.bloc.aucune_route_tendue_pour_l_instant` / « No route strung yet ») |
| `distribution.bloc.saturee` | saturée | jammed | `route_state` saturated — servi pour le trajet : `revue.phrase.l_ancien_trajet_ne_passait_plus_sature_ou_coupe` « saturé, ou coupé » / « jammed, or cut » |
| `distribution.bloc.coupee` | coupée | cut | `route_state` severed — idem ; et ㉘, série 6 cadre 57 « La route est coupée » |
| `distribution.bloc.tient` | tient | holding | `route_state` active — **déjà écrit** « tient » (m-55) mais SANS clé : l'en montre le français |
| `distribution.bloc.l_imprimerie` | l’imprimerie | the print shop | `NomTypeBatiment` press_house — le mot servi `building.type.press_house` « Imprimerie » (`28`… `22` §7.1 B), dans la forme « la … » des autres |
| `distribution.bloc.l_agence` | l’agence | the agency | `NomTypeBatiment` office — `building.type.office` « Agence » |

## 3. Chaîne d'appro (`ChaineDApproScreenController.TexteStock`)

Dans la voix de la valeur déjà nommée, `NONE` → « il n’y a plus rien » (m-48, mesuré) :

| clé | fr | en | valeur servie |
|---|---|---|---|
| `appro.bloc.il_en_reste_peu` | il en reste peu | running low | `stock_band` LOW |
| `appro.bloc.il_en_reste` | il en reste | some left | `stock_band` MEDIUM |
| `appro.bloc.il_y_en_a_assez` | il y en a assez | plenty left | `stock_band` HIGH |
| `appro.bloc.il_n_y_a_plus_rien` | il n’y a plus rien | nothing left | `stock_band` NONE — **déjà écrit** SANS clé |

## 4. Loi (`LoiScreenController.TierLabelCourt`) — aucune clé neuve

`public_defender` : le mot est **déjà servi** sous la clé exacte que `Libelle.De("loi", "bloc", "Commis d’office")` dérive —
**`loi.bloc.commis_d_office`** = « Commis d’office » / « Public Defender » (servi depuis `20-…`). `game.legal.lawyer_tier.public_defender`
est une AUTRE clé, aux mêmes valeurs (le fr y porte encore l'apostrophe droite : décision D10). ⚠️ Les deux autres valeurs de ce résolveur
(« cabinet », « filière », minuscules) sont aussi des littéraux sans clé ; les faire passer par `Libelle` donnerait `loi.bloc.cabinet`,
`loi.bloc.filiere` (non servies) — ou réutiliser les formes servies du même écran (`loi.bloc.un_cabinet` « Un cabinet », `loi.bloc.la_filiere`
« La filière »), au choix de CLIENT-2.

## 5. Au `28-…`

« Tissu » (`TissuDeDistrict`, le profil du district : tidewater, spine, lattice, stack, glass, verge) → **type inconnu** (choix confirmé) :
ligne ajoutée au §3 du `28-…`.
