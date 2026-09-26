# Clés i18n NEUVES — B3, ㉟ La vente (CLIENT-2, 2026-09-26)

Produite par `Libelle.De` + le `slug` de `orphelines.py` sur `SellingScreenController.cs` ; toutes NON servies à la tête back `5e792a3c`.
Le français est le REPLI du client (typographie D10/D17) ; l'anglais et les mots définitifs reviennent à l'atelier et au back.
Inscrites dans `ZeroRepliDesLocatairesPlayModeTests.DetteDatee` (règle 2 : retirées dès qu'elles sont servies).

| clé | fr (repli client) | où |
|---|---|---|
| `vente.geste.un_dealer_tient_ce_point_de_vente` | Un dealer tient ce point de vente. | geste ou retour de geste |
| `vente.geste.le_dealer_n_a_pas_ete_poste` | Le dealer n’a pas été posté | geste ou retour de geste |
| `vente.geste.aucun_bloc_libre_dans_votre_quartier` | Aucun bloc libre dans votre quartier. | geste ou retour de geste |
| `vente.geste.point_de_vente_achete_ouvrez_le_depuis_sa_fiche` | Point de vente acheté — ouvrez-le depuis sa fiche. | geste ou retour de geste |
| `vente.geste.l_achat_n_a_pas_abouti` | L’achat n’a pas abouti | geste ou retour de geste |
| `vente.vide.aucun_dealer_au_travail` | Aucun dealer au travail. | état vide quand un point de vente attend son dealer |
| `vente.geste.point_de_vente_sans_dealer` | Point de vente sans dealer | geste ou retour de geste |
| `vente.geste.poster_un_dealer` | POSTER UN DEALER | geste ou retour de geste |
| `vente.geste.vous_n_avez_aucun_point_de_vente` | Vous n’avez aucun point de vente | geste ou retour de geste |
| `vente.geste.acheter_un_point_de_vente` | ACHETER UN POINT DE VENTE | geste ou retour de geste |
| `vente.geste.coute_de_l_argent_et_la_decision_de_structure_de_cette_session_il_faudra_ensuite_l_ouvrir_depuis_sa_fiche` | coûte de l’argent et la décision de structure de cette session ; il faudra ensuite l’ouvrir depuis sa fiche | geste ou retour de geste |

## Remplacée par les mots de l'atelier (même jour)

Les 11 clés sont gardées ; leurs valeurs sont celles de la table 62 de l'atelier (`Tools/atelier-2026-09-22/62-vente-gestes-b3-2026-09-26.tsv`,
client `2648d19d` : D12 « coin de vente », D13, D17 U+202F), et l'addendum (`62-addendum-vente-vides-2026-09-26.tsv`) en keye deux de plus
(`vente.vide.les_coins_de_vente_n_ont_pas_repondu`, `vente.vide.aucun_coin_de_vente`). La colonne « fr » ci-dessus est l'ANCIEN repli : la
source est désormais la table 62. Le client passe par `Libelle.Gabarit(clé, repli)` (clé explicite : la valeur n'est plus le slug), replis
égaux à l'octet à la table (vérifié par script, 13/13).
