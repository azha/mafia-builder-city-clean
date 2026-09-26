# TD-690 — ㊱ L'horizon : les 7 clés `horizon.*` dont le bundle anglais sert du français, et 6 clés demandées que rien ne sert

> Atelier / DA, 2026-09-23. Classement du back : `_en-egal-fr-classement.txt` (`e75cf69d`, TD-690) — 7 clés `DEFAUT_FR_DANS_EN`. Le fr
> est la valeur servie (`FR_MESSAGES`), recopiée à l'octet ; l'en est la proposition. Demandeurs mesurés sur
> `HorizonScreenController.cs` (arbre F `b82c3b9e`, commentaires exclus), clés dérivées par le slug de `Libelle`.
> Vérifié : `python3 Tools/atelier-2026-09-22/verifier-en-egal-fr.py <ce fichier> "## TD-690" horizon.`

## TD-690 — les 7 clés

| clé | classe | fr (servi) | en (proposé) |
|---|---|---|---|
| `horizon.bloc.l_horizon` | `DEFAUT_FR_DANS_EN` | L'horizon | The horizon |
| `horizon.bloc.rien_a_l_horizon` | `DEFAUT_FR_DANS_EN` | Rien à l'horizon | Nothing on the horizon |
| `horizon.bloc.a_portee` | `DEFAUT_FR_DANS_EN` | À PORTÉE | WITHIN REACH |
| `horizon.bloc.deja_prises` | `DEFAUT_FR_DANS_EN` | DÉJÀ PRISES | ALREADY TAKEN |
| `horizon.bloc.ont_recule` | `DEFAUT_FR_DANS_EN` | ONT RECULÉ | SLIPPED BACK |
| `horizon.bloc.c_etait_a_portee_ca_s_est_eloigne` | `DEFAUT_FR_DANS_EN` | C'était à portée. Ça s'est éloigné. | It was within reach. It’s drifted away. |
| `horizon.bloc.ce_que_le_serveur_ne_dit_pas` | `DEFAUT_FR_DANS_EN` | CE QUE LE SERVEUR NE DIT PAS | RETIRER — orpheline : le mot « serveur » est sorti de l'écran (classe B, 22/09) ; il ne reste que dans deux commentaires (`HorizonScreenController.cs:132`, `:422`), 0 `Lib(…)` |

## Demandées par le client, servies par AUCUN registre (même passe, hors TD-690)

| clé | fr (le littéral du client) | en |
|---|---|---|
| `horizon.bloc.ce_qui_manque_encore` | ce qui manque encore | what’s still missing |
| `horizon.bloc.pourquoi_c_est_vide` | pourquoi c’est vide | why it’s empty |
| `horizon.bloc.les_cartes_viennent_du_monde_pas_du_menu` | Les cartes viennent du monde, pas du menu | Cards come from the world, not from a menu |
| `horizon.bloc.rien_ne_s_ouvre_pour_l_instant` | Rien ne s’ouvre pour l’instant. | Nothing is opening up for now. |
| `horizon.bloc.l_horizon_se_remplit_en_jouant` | L’horizon se remplit en jouant. | The horizon fills up as you play. |
| `horizon.bloc.indisponible` | indisponible | unavailable |

## Notes

- « ONT RECULÉ » (les cartes qui se sont éloignées) → « SLIPPED BACK », dans le même mouvement que « It’s drifted away » : rien n'est
  perdu, c'est plus loin. C'est le sens ratifié des états de l'horizon (« ça plafonne et ça bloque, rien n'est jamais perdu »).
- « DÉJÀ PRISES » (les cartes, au féminin pluriel) → « ALREADY TAKEN ».
- `horizon.bloc.rien_a_l_horizon` est servie avec une capitale (« Rien à l'horizon ») alors que le client écrit « rien à l'horizon » :
  même clé (le slug ignore la casse) ; l'en suit la valeur servie.
