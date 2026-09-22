# TD-690 — ㊲ Le miroir : les 21 clés `reputation.*` dont le bundle anglais sert du français

> Atelier / DA, 2026-09-23. Classement du back : `tests/e2e/conventions/_en-egal-fr-classement.txt` (`e75cf69d`, branche
> `back/s5-revue-du-jour`, TD-690) — 21 clés `DEFAUT_FR_DANS_EN`, 0 `DEFAUT_EN_DANS_FR`. Le fr est la valeur servie (`FR_MESSAGES`),
> recopiée à l'octet ; l'en est la proposition. Placeholders : aucun. Les 21 ont un demandeur dans les deux arbres client (littéral
> `Lib(…)` mesuré à `gate/cumul-client-2026-09-22` et à l'arbre F `b82c3b9e`).
> Vérifié : `python3 Tools/atelier-2026-09-22/verifier-en-egal-fr.py <ce fichier> "## TD-690" reputation.`

**Conventions de l'en** : apostrophe `’` (U+2019), comme l'en déjà servi ; capitales là où le fr en a (la donnée, pas le rendu).
**Le lieutenant du miroir n'a pas de genre dans l'en** : le fr dit « il » (le masculin générique d'un lieutenant anonyme) ; l'en dit
« they », parce que la bande ne dit pas qui c'est.

## TD-690 — les 21 clés

| clé | classe | fr (servi) | en (proposé) |
|---|---|---|---|
| `reputation.bloc.le_miroir` | `DEFAUT_FR_DANS_EN` | Le miroir | The mirror |
| `reputation.bloc.ce_qu_il_a_absorbe_de_vos_regles` | `DEFAUT_FR_DANS_EN` | ce qu’il a absorbé de vos règles | what they’ve taken in of your rules |
| `reputation.bloc.donner_une_regle` | `DEFAUT_FR_DANS_EN` | DONNER UNE RÈGLE | GIVE A RULE |
| `reputation.bloc.les_regles_que_vous_avez_donnees` | `DEFAUT_FR_DANS_EN` | LES RÈGLES QUE VOUS AVEZ DONNÉES | THE RULES YOU’VE GIVEN |
| `reputation.bloc.vous_n_avez_encore_donne_aucune_regle_rien_ne_peut_donc_etre_enfreint` | `DEFAUT_FR_DANS_EN` | vous n’avez encore donné aucune règle — rien ne peut donc être enfreint | you haven’t given any rules yet — so nothing can be broken |
| `reputation.etat.pas_encore_jugeable` | `DEFAUT_FR_DANS_EN` | Pas encore jugeable | Too early to judge |
| `reputation.etat.vous_vous_y_tenez` | `DEFAUT_FR_DANS_EN` | Vous vous y tenez | You’re sticking to it |
| `reputation.etat.vous_vous_en_ecartez` | `DEFAUT_FR_DANS_EN` | Vous vous en écartez | You’re straying from it |
| `reputation.etat.coherence_inconnue` | `DEFAUT_FR_DANS_EN` | Cohérence inconnue | Consistency unknown |
| `reputation.etat.il_vous_ecoute` | `DEFAUT_FR_DANS_EN` | Il vous écoute | They’re listening to you |
| `reputation.etat.il_se_tient_a_carreau` | `DEFAUT_FR_DANS_EN` | Il se tient à carreau | They’re keeping their head down |
| `reputation.etat.il_se_ferme` | `DEFAUT_FR_DANS_EN` | Il se ferme | They’re closing off |
| `reputation.etat.il_vous_en_veut` | `DEFAUT_FR_DANS_EN` | Il vous en veut | They hold it against you |
| `reputation.etat.posture_inconnue` | `DEFAUT_FR_DANS_EN` | Posture inconnue | Posture unknown |
| `reputation.etat.on_vient_sans_garantie` | `DEFAUT_FR_DANS_EN` | On vient sans garantie | They come with no guarantees |
| `reputation.etat.on_demande_des_gages` | `DEFAUT_FR_DANS_EN` | On demande des gages | They ask for pledges |
| `reputation.etat.offre_inconnue` | `DEFAUT_FR_DANS_EN` | Offre inconnue | Offer unknown |
| `reputation.etat.la_comptabilite_tenue` | `DEFAUT_FR_DANS_EN` | la comptabilité tenue | books kept straight |
| `reputation.etat.la_justice_envers_les_siens` | `DEFAUT_FR_DANS_EN` | la justice envers les siens | fairness to their own |
| `reputation.etat.la_ponctualite` | `DEFAUT_FR_DANS_EN` | la ponctualité | punctuality |
| `reputation.etat.la_discretion_devant_les_civils` | `DEFAUT_FR_DANS_EN` | la discrétion devant les civils | discretion around civilians |

## Notes

- **Les quatre postures** (`boss_mirror.portrait_posture` : attentive · cautious · withdrawn · hostile) se lisent en montée : « listening
  to you » → « keeping their head down » → « closing off » → « hold it against you ». « se tenir à carreau » est « rester prudent, ne pas
  se faire remarquer » : *keep one’s head down*, pas *behave*.
- **Les deux offres** (« On vient sans garantie », « On demande des gages ») : le « on » français est impersonnel — ce sont les autres, ceux
  qui traitent avec vous. « They » en anglais garde cet impersonnel. « gages » = des gages de confiance : *pledges*, pas *wages*.
- **Les quatre normes** sont des étiquettes de tuile, sous un indice visible (« col ouvert », « manches basses »…) : l'en garde la forme
  nominale et la minuscule du fr.
- « Pas encore jugeable » → « Too early to judge » : la bande dit un manque d'observation (« il n'a pas assez vu »), pas une impossibilité.
