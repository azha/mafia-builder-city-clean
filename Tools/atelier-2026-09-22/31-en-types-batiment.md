# 31 — le mot EN du joueur pour les 12 types de bâtiment (après D12)

> Atelier / DA, 2026-09-23. Commande f2 : D12 tient (un mot par type, le catalogue `building.type.*` fait foi). Mais depuis `58d2eaaa`, ① a repris
> l'EN du catalogue, et cet EN sent l'identifiant. Je propose l'EN court et juste de chaque type ; le back change le CATALOGUE et ① suit par la
> garde de relation.
> Table : `31-en-types-batiment-2026-09-23.tsv` (générée par `generer-31-en-types.py`, back HEAD `58d2eaaa`). Elle a 36 clés : les 12 types et leurs
> 24 formes à article de `30-…` v2 (Démolition, Distribution). **15 sont PROPOSÉES, 21 restent inchangées.**
> `verifier-31.py` : 0 défaut. Une fois la table servie, toutes les lignes seront « inchangé ».

## La règle de choix

D'abord le mot que l'EN servi **ailleurs** emploie déjà pour ce type : les lignes de fiche, la revue, la filière. Le joueur l'a déjà lu. À défaut, le mot court du métier.

| type | fr | en servi | **en proposé** | pourquoi |
|---|---|---|---|---|
| `front_shop` | Commerce-écran | Front shop | **Front** | « a front », le mot du métier ; la revue le dit déjà (« the front’s books », « the front is pinned ») |
| `cash_safehouse` | Planque | Cash safehouse | **Safehouse** | le mot de ① avant D12 ; la filière dit déjà « Get a safehouse » |
| `dealer_spot_front` | Coin de vente | Dealer-spot front | **Corner** | le coin de vente est un *corner* ; la revue dit déjà « the sales corner » |
| `distribution_hub` | Relais | Distribution hub | **Hub** | le mot de ① avant D12 ; la fiche dit déjà « Hub size », « No hub » |
| `specialized_lab` | Labo spécialisé | Specialized lab | **Specialist lab** | l'anglais courant ; aucun usage servi ailleurs (choix le plus discutable des cinq) |
| `money_holding` | Banque | Vault | Vault (inchangé) | la fiche dit « Vault size » et « No vault » ×3 ; « Bank » heurterait « North bank » / « South bank » (`carte.bloc.rive_*`) |
| `lab`, `stash`, `refinery`, `grow_house`, `press_house`, `office` | Labo, Réserve, Raffinerie, Serre, Imprimerie, Agence | Lab, Stash, Refinery, Grow house, Print shop, Agency | inchangés | déjà justes (« Print shop » : « Press » voudrait dire les journaux, comme « presse ») |

Les dérivés suivent le mot du type : « A front » / « the front », « A safehouse », « A corner », « A hub », « A specialist lab »…

`verifier-30.py` accepte, pour une clé de 30, l'en de 31 comme le nôtre. Il reste donc à 0 quand le back servira 31. La v1 de 30 n'est plus
qu'un témoin de structure : la v2 est servie depuis `58d2eaaa`.

## Côté FR : le même heurt que D12, vu en passant (signalé, rien réécrit)

- `revue.phrase.*` (×3) dit « **la façade** » pour le commerce-écran : « J’ai rapproché les comptes de la façade »…
- `random_world.coupling.pair.erlang_stash__deal_lek` dit « **votre planque** » pour un couplage sur le *stash*, qui est la Réserve (D12).
