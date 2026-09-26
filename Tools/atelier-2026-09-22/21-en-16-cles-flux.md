# L'en des 16 clés vues par le flux (au-delà des 26 de `20-…`) — Appro 8, Distribution 8

> Atelier / DA, 2026-09-23. **Source** : `~/project/mafia-builder-city-clean`, commit `26c605c5` —
> `Tools/juge-donnees/i18n/bundle-reel-construction-2026-09-23.md`, section « Dette complète : 42 », liste « Nouvelles au-delà des 26
> envoyées : 16 » ; les littéraux fr dans `Tools/juge-donnees/i18n/sites-libelle-flux-83b4f291.json` (le flux suit un littéral ASSIGNÉ à
> une variable avant `Libelle.De`). **fr** = ce littéral, **avec `’`**. Aucune n'est servie au back `d6a747b0`.
> Vérifié : `python3 Tools/atelier-2026-09-22/verifier-21.py`.

## Les 16 clés

| clé | fr (à servir) | en | méthode |
|---|---|---|---|
| `appro.bloc.la_commande` | LA COMMANDE | THE ORDER | `ConstruireLigne` |
| `appro.bloc.nestor_l_etagere_est_vide_sans_pyralin_je_ne_rallume_pas` | Nestor : « L’étagère est vide. Sans pyralin, je ne rallume pas. » | Nestor: “The shelf is empty. Without pyralin, I’m not firing back up.” | `RendrePied` |
| `appro.bloc.rien_a_remonter_pour_l_instant_la_chaine_ne_connait_aucun_maillon_sur_ce_compte` | Rien à remonter pour l’instant — la chaîne ne connaît aucun maillon sur ce compte. | Nothing to trace upstream yet — the chain doesn’t know a single link on this account. | `AppliquerChaine` |
| `appro.bloc.votre_lieutenant_on_en_a_besoin_et_il_n_y_en_a_plus` | Votre lieutenant : « On en a besoin, et il n’y en a plus. » | Your lieutenant: “We need it, and there’s none left.” | `RendrePied` |
| `appro.sous_titre.elle_est_payee_et_partie_il_n_y_a_plus_qu_a_attendre` | Elle est payée et partie. Il n’y a plus qu’à attendre. | It’s paid and on its way. All that’s left is to wait. | `RendreTitre` |
| `appro.sous_titre.sans_elle_aucun_labo_ne_rallume_le_fournisseur_lui_a_ses_humeurs` | Sans elle, aucun labo ne rallume. Le fournisseur, lui, a ses humeurs. | Without it, no lab fires back up. The supplier, meanwhile, has its moods. | `RendreTitre` |
| `appro.titre.commander_de_la_matiere_premiere` | Commander de la matière première | Order raw materials | `RendreTitre` |
| `appro.titre.la_commande_est_en_route` | La commande est en route | The order is on its way | `RendreTitre` |
| `distribution.bloc.la_marchandise_est_prete_au_labo_dites_moi_qui_part_et_par_ou_et_je_l_enverrai_ce_soir` | La marchandise est prête au labo. Dites-moi qui part et par où, et je l’enverrai ce soir. | The product is ready at the lab. Tell me who goes and which way, and I’ll send it tonight. | `RendrePied` |
| `distribution.bloc.livre_le_carton_est_au_comptoir_personne_n_a_rien_vu` | Livré. Le carton est au comptoir, personne n’a rien vu. | Delivered. The box is at the counter, and nobody saw a thing. | `RendrePied` |
| `distribution.bouton.envoyer_ce_soir` | ENVOYER CE SOIR | SEND TONIGHT | `RendrePied` |
| `distribution.bouton.tendre_une_autre_ficelle` | TENDRE UNE AUTRE FICELLE | STRING ANOTHER LINE | `RendrePied` |
| `distribution.sous_titre.la_marchandise_est_arrivee_voila_ce_que_le_trajet_a_coute_a_la_route` | La marchandise est arrivée. Voilà ce que le trajet a coûté à la route. | The product has arrived. Here’s what the trip cost the route. | `RendreTitre` |
| `distribution.sous_titre.on_choisit_d_ou_ca_part_ou_ca_va_et_par_quel_chemin` | On choisit d’où ça part, où ça va, et par quel chemin. | You choose where it leaves from, where it’s going, and which way. | `RendreTitre` |
| `distribution.titre.c_est_livre` | C’est livré | It’s delivered | `RendreTitre` |
| `distribution.titre.l_envoi_de_ce_soir` | L’envoi de ce soir | Tonight’s run | `RendreTitre` |

## Notes

- **Le vocabulaire déjà servi, repris** (back `d6a747b0`) :
  - Appro : « la commande » → *the order* ; « payée et partie » → *paid and on its way* (`appro.bloc.la_commande_est_payee_et_partie`) ;
    « le fournisseur » → *the supplier* ; « en remontant » → *upstream* (`appro.bloc.la_chaine_en_remontant`) ; « maillon » → *link*.
  - Distribution : « la marchandise » → *product* (`exception.lieutenant_logistics.*`) ; « l'envoi de ce soir » → *tonight’s run*
    (`distribution.bloc.aucune_destination_connue_pour_l_envoi_de_ce_soir`) ; « tendre » une route → *string* (`…aucune_route_tendue…` :
    « No route strung yet ») ; « le comptoir » → *the counter* ; « Votre lieutenant » → *Your lieutenant* (`exceptions.locuteur.*`).
  - Les mots de `20-…` : « d’où ça part » → *where it leaves from*, « où ça va » → *where it’s going*, « le chemin » → *the way*,
    « la route » → *the route*. « Le trajet » devient donc *the trip*, pour ne pas donner deux fois *route* dans une même phrase.
- **Sans genre présumé**. Dans « On en a besoin, et il n’y en a plus », le « il » est **impersonnel** (« il n’y en a plus » = *there’s none
  left*) : il ne désigne pas le lieutenant, et aucun pronom de personne ne passe en en. Les autres locuteurs parlent à la première personne
  (*I’ll send it*, *I’m not firing back up*) : pas de genre. « Le fournisseur, lui » → *its moods* : c'est une maison, pas une personne.
  « Qui part » → *who goes* : sans pronom.
- **« rallumer »** (un labo, un four) → *fire back up*, dans les deux phrases.
- **« pyralin »** : nom propre de matière, gardé tel quel.
- Les guillemets « » deviennent “ ” en en, comme l'en déjà servi (`filiere.bloc.ce_n_est_ni_elle_est_vide_…`). En fr, l'espace avant « : »
  est gardée, et l'en n'en a pas.
