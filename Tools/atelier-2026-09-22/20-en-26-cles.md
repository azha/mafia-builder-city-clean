# L'en des 26 clés trouvées par la garde « zéro repli » en vrai rendu — Appro 7, Distribution 8, Filière 1, Loi 10

> Atelier / DA, 2026-09-23. **Source** : `~/project/mafia-builder-city-clean/Tools/juge-donnees/i18n/bundle-reel-construction-2026-09-23.md`
> au commit `641fae6c`, section « Correction : la dette n'est pas 0, elle est de 26 » (26 clés, contrôleur nommé ; le fichier ne porte
> pas le fr). **fr** = le littéral que le client passe à `Libelle.De`, lu dans le contrôleur au même commit (`641fae6c`), **avec
> l'apostrophe `’`** (toute valeur fr servie la prend ; la clé dérivée ignore la ponctuation). Aucune n'est servie au back `6f6dc8f6`.
> Vérifié : `python3 Tools/atelier-2026-09-22/verifier-20.py`.

## Les 26 clés

| clé | fr (à servir) | en | site (`641fae6c`) |
|---|---|---|---|
| `appro.titre.la_commande_est_arrivee` | La commande est arrivée | The order has arrived | `ChaineDApproScreenController.cs:365` |
| `appro.sous_titre.le_stock_est_reconstitue_vous_pouvez_commander_a_nouveau` | Le stock est reconstitué. Vous pouvez commander à nouveau. | Stock is back up. You can order again. | `:366` |
| `appro.bloc.a_quoi_ca_sert` | À QUOI ÇA SERT | WHAT IT’S FOR | `:415` |
| `appro.bloc.ce_qu_il_en_reste` | CE QU’IL EN RESTE | WHAT’S LEFT | `:419` |
| `appro.bloc.le_prix` | LE PRIX | THE PRICE | `:422` |
| `appro.bloc.le_fournisseur` | LE FOURNISSEUR | THE SUPPLIER | `:425` |
| `appro.bloc.des_maillons_existent_mais_cet_ecran_ne_sait_pas_encore_les_afficher` | Des maillons existent, mais cet écran ne sait pas encore les afficher. | There are links, but this screen can’t show them yet. | `:581` |
| `distribution.titre.ce_qui_est_sur_la_route` | Ce qui est sur la route | What’s on the road | `DistributionScreenController.cs:393` |
| `distribution.sous_titre.un_coursier_est_parti_voila_le_chemin_qu_il_prend` | Un coursier est parti. Voilà le chemin qu’il prend. | A courier has set off. Here’s the way they’re taking. | `:394` |
| `distribution.bloc.d_ou_ca_part` | D’OÙ ÇA PART | WHERE IT LEAVES FROM | `:471` |
| `distribution.bloc.ou_ca_va` | OÙ ÇA VA | WHERE IT’S GOING | `:474` |
| `distribution.bloc.le_chemin` | LE CHEMIN | THE WAY | `:519` |
| `distribution.bloc.a_traverser` | À TRAVERSER | TO CROSS | `:522` |
| `distribution.bloc.cette_route` | CETTE ROUTE | THIS ROUTE | `:525` |
| `distribution.bloc.il_est_parti_a_la_nuit_ca_serpente_mais_c_est_la_seule_qui_evite_le_pont_du_threnny` | Il est parti à la nuit. Ça serpente, mais c’est la seule qui évite le pont du Threnny. | Left at nightfall. It winds, but it’s the only one that avoids the Threnny bridge. | `:681` |
| `filiere.bloc.chaque_etape_rend_l_argent_un_peu_plus_propre_que_la_precedente_seule_la_derniere_credite_le_portefeuille_tant_qu_il_n_y_a_pas_de_sortie_il_n_y_a_pas_d_argent_seulement_une_file_d_attente` | chaque étape rend l’argent un peu plus propre que la précédente. Seule la DERNIÈRE crédite le portefeuille — tant qu’il n’y a pas de sortie, il n’y a pas d’argent, seulement une file d’attente. | each stage leaves the money a little cleaner than the one before. Only the LAST one credits the wallet — as long as there’s no exit, there’s no money, only a queue. | `FiliereScreenController.cs:322-324` |
| `loi.bouton.mettre_sous_retention` | METTRE SOUS RÉTENTION | PUT ON RETAINER | `LoiScreenController.cs:735` |
| `loi.bloc.commis_d_office` | Commis d’office | Public Defender | `:332` |
| `loi.badge.en_place` | EN PLACE | IN PLACE | `:333` |
| `loi.bloc.gratuit_il_fait_ce_qu_il_peut` | gratuit — il fait ce qu’il peut | free — does what they can | `:333` |
| `loi.bloc.un_cabinet` | Un cabinet | Boutique Counsel | `:334` |
| `loi.badge.disponible` | DISPONIBLE | AVAILABLE | `:335` |
| `loi.bloc.ca_coute_il_connait_les_juges` | ça coûte — il connaît les juges | it costs — knows the judges | `:335` |
| `loi.bloc.la_filiere` | La filière | Corruption Pipeline | `:337` |
| `loi.badge.a_vos_risques` | À VOS RISQUES | AT YOUR OWN RISK | `:338` |
| `loi.bloc.ca_coute_cher_et_ca_peut_se_retourner` | ça coûte cher — et ça peut se retourner | it costs a lot — and it can turn on you | `:338` |

## Notes

- **Une traduction par mot, reprise de ce qui est déjà servi** : « le fournisseur » → *the supplier* (`appro.bloc.rien_a_faire_de_plus_…`) ;
  « étape » → *stage*, « la sortie » → *the exit*, « lave » → *cleans* (`filiere.bloc.*`, `19-…`) ; « maillon » → *link*
  (`filiere.bloc.maillon_manquant`). Les trois avocats reprennent **à l'octet** l'en de `game.legal.lawyer_tier.*`, dont le fr est le même
  mot : *Public Defender*, *Boutique Counsel*, *Corruption Pipeline*. Un même mot fr n'a qu'un en, même si « La filière » se dit *The
  pipeline* dans une phrase (`loi.bloc.la_filiere_fait_classer_…`) : ici c'est le nom de l'offre.
- **Sans genre présumé** : le coursier et l'avocat sont « il » en fr (le nom est masculin), mais en anglais un « he » les ferait homme. D'où
  *they’re taking*, et des phrases sans sujet quand le sujet serait « he » : *does what they can*, *knows the judges*, *Left at nightfall*.
- **« METTRE SOUS RÉTENTION »** → *PUT ON RETAINER* : « rétention » est ici le *retainer* de l'avocat (le code l'appelle `retainer`), pas une
  détention. Son contraire, « LIBÉRER », n'est pas dans le paquet.
- **« la seule »** (la route) → *the only one* ; « à la nuit » → *at nightfall*.
- La casse du fr est conservée : les capitales restent capitales, et la phrase de la filière commence en minuscule, parce qu'elle suit son
  titre (« CE QUE LA CHAÎNE FAIT DE VOTRE ARGENT »).
- ⚠️ **Vu en préparant, hors paquet** : `distribution.bloc.il_est_en_chemin_on_ne_le_rappelle_pas_on_saura_a_l_arrivee` sert en en
  « **He**’s on his way. You don’t call **him** back… », un coursier genré. En à redire, fr inchangé : « On the way. You don’t call them back —
  you’ll know on arrival. »
