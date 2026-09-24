# Épingles fr d’une valeur servie — lot typographique f2-D10/D17 (2026-09-24)

Propriété balayée (Assets/Tests, toutes les assertions) : un littéral d’assertion égal — typographie normalisée — à une valeur fr
servie (back 66060cc1 ou lot 5b4ee759), en entier, en gabarit (`{x}`) ou en fragment de `Contains`.

**Avant** : 438 épingles, 60 fichiers (409 égales, 24 gabarits, 5 fragments) ; **22** violent R1-R4 (+1 message d’assertion, Demolition:266, pas un attendu).
**Après** : 0 attendu ne viole R1-R4 ; les 409 égales sont égales OCTET POUR OCTET à la valeur servie du lot ; 29 gabarits/fragments sans caractère touché.

Forme corrigée : `ValeurAttendue.De(domaine, role, littéral)` / `.Cle(clé, repli, params)` — le catalogue CHARGÉ s’il connaît la clé, sinon le repli
du client (Assets/Tests/PlayMode/ValeurAttendue.cs). Le repli du client passe en D10/D17 : clé inchangée (le slug ignore la ponctuation), et
repli == valeur servie du lot, vérifié clé par clé.

| site (avant) | clé | règle | servi à 66060cc1 == épingle | forme |
|---|---|---|---|---|
| `BandeauEphemerePlayModeTests.cs:83` | `chrome.bandeau.les_indics_parlent` | R2 | oui | ValeurAttendue |
| `ChaineDApproScreenPlayModeTests.cs:331` | `appro.bloc.rien_a_remonter_pour_l_instant_la_chaine_ne_connait_aucun_maillon_sur_ce_compte` | R1 | NON (déjà divergente ⇒ inerte si verte) | ValeurAttendue |
| `ConflitScreenPlayModeTests.cs:281` | `conflit.bloc.aucun_de_vos_lieutenants_n_est_du_genre_gros_bras` | R1 | oui | ValeurAttendue |
| `ConflitScreenPlayModeTests.cs:318` | `conflit.bloc.aucun_de_vos_lieutenants_n_est_du_genre_gros_bras` | R1 | oui | ValeurAttendue |
| `ConflitScreenPlayModeTests.cs:495` | `conflit.bloc.le_compte_des_envois_precedents_n_a_pas_repondu` | R1 | NON (déjà divergente ⇒ inerte si verte) | ValeurAttendue |
| `DelegationScreenPlayModeTests.cs:603` | `delegation.bloc.plus_de_decision_aujourd_hui` | R1 | NON (déjà divergente ⇒ inerte si verte) | typographie des deux côtés (littéral HORS Libelle — dette N2/N3) |
| `DelegationScreenPlayModeTests.cs:719` | `delegation.bloc.vous_avez_deja_tranche_aujourd_hui` | R1 | NON (déjà divergente ⇒ inerte si verte) | typographie des deux côtés (littéral HORS Libelle — dette N2/N3) |
| `DelegationScreenPlayModeTests.cs:720` | `delegation.bloc.plus_de_decision_aujourd_hui` | R1 | NON (déjà divergente ⇒ inerte si verte) | typographie des deux côtés (littéral HORS Libelle — dette N2/N3) |
| `DistributionScreenPlayModeTests.cs:297` | `distribution.titre.l_envoi_de_ce_soir` | R1 | NON (déjà divergente ⇒ inerte si verte) | ValeurAttendue |
| `DistributionScreenPlayModeTests.cs:321` | `distribution.bloc.il_est_en_chemin_on_ne_le_rappelle_pas_on_saura_a_l_arrivee` | R1 | oui | ValeurAttendue |
| `DistributionScreenPlayModeTests.cs:334` | `distribution.titre.c_est_livre` | R1 | NON (déjà divergente ⇒ inerte si verte) | ValeurAttendue |
| `DistributionScreenPlayModeTests.cs:347` | `distribution.bloc.aucune_route_tendue_pour_l_instant` | R1 | oui | ValeurAttendue |
| `DistributionScreenPlayModeTests.cs:363` | `distribution.bloc.aucune_destination_connue_pour_l_envoi_de_ce_soir` | R1 | oui | ValeurAttendue |
| `ExceptionsEnseignePlayModeTests.cs:100` | `exceptions.apres.deferred.enseigne` | R2 | NON (déjà divergente ⇒ inerte si verte) | ValeurAttendue |
| `ExceptionsMainDessinPlayModeTests.cs:156` | `exception_detail.bloc.appui_long_la_carte_se_ferme_le_batiment_lui_se_repare_avec_le_temps` | R4 | oui | ValeurAttendue |
| `LoiScreenPlayModeTests.cs:210` | `loi.bloc.vous_n_avez_encore_engage_personne` | R1 | oui | ValeurAttendue |
| `LoiScreenPlayModeTests.cs:381` | `game.legal.lawyer_tier.public_defender` | R1 | oui | ValeurAttendue |
| `RevueDuJourConditionPlayModeTests.cs:43` | `revue.phrase.l_ancien_trajet_ne_passait_plus_sature_ou_coupe` | R2 | oui | ValeurAttendue |
| `RevueDuJourConditionPlayModeTests.cs:102` | `revue.phrase.l_ancien_trajet_ne_passait_plus_sature_ou_coupe` | R2 | oui | ValeurAttendue |
| `TissuDeDistrictPlayModeTests.cs:86` | `carte.tissu.l_avenue` | R1 | NON (déjà divergente ⇒ inerte si verte) | garde de source : le mot cherché passe à ’ (avec ' elle ne cherchait rien) |
| `TutorielPlayModeTests.cs:50` | `tutorial.queue_runs_dry` | R2 | NON (déjà divergente ⇒ inerte si verte) | fixture et attendu en typographie D10/D17 |
| `TutorielPlayModeTests.cs:55` | `tutorial.queue_runs_dry` | R2 | NON (déjà divergente ⇒ inerte si verte) | fixture et attendu en typographie D10/D17 |

Hors lot, nommés : DemolitionScreenController.cs:626 et :645, « plus de décision aujourd'hui » en littéral brut (aucune épingle) ;
les ~390 autres littéraux d’assertion égaux à une valeur servie SANS caractère R1-R4 : forme recopiée, inertes pour ce lot.
