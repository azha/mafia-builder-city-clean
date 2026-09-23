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

## Addendum (f2, 23/09) : les heurts FR tranchés par D12 — `31-addendum-fr-d12-2026-09-23.tsv`

Les colonnes : clé → fr → en, puis la clé et le fr servis. L'en ne change pas : il disait déjà « front » et « stash ».

| clé | fr |
|---|---|
| `revue.phrase.j_ai_rapproche_les_comptes_du_commerce_ecran` | J’ai rapproché les comptes du commerce-écran |
| `revue.phrase.il_passe_plus_d_argent_par_la_caisse_que_le_commerce_ecran_ne_peut_en_justifier` | — il passe plus d’argent par la caisse que le commerce-écran ne peut en justifier. |
| `revue.phrase.le_commerce_ecran_est_epingle_pour_un_controle` | — le commerce-écran est épinglé pour un contrôle. |
| `random_world.coupling.pair.erlang_stash__deal_lek` (clé inchangée) | ce que tient votre réserve et ce que la rue vient disputer |

- Les trois `revue.phrase.*` sont **renommées**, puisque la clé suit le slug du fr. Leurs émetteurs, au back ou au client, doivent suivre.
- La clé du couplage est nommée par le couplage lui-même, pas par son texte : elle ne change pas.
- La table principale est servie depuis le back `73ca76df` : ses 36 lignes y sont désormais toutes « inchangé ».
