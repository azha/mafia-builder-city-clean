# ㊲ — les clés `reputation.*` que le client demande (item 0.6)

> Généré depuis le code : `21` clés, dérivées des littéraux qui passent par
> `Libelle.De`. **À ajouter en ADDITIF, `en` = le littéral EXACT** (colonne de droite).
> Tant qu'elles manquent, l'écran affiche le littéral et ne change pas d'un pixel.

## Ce qui n'y est PAS, et pourquoi

⚠️ `regle.rule_id` et les phrases de verdict passent par le même fabricant de texte mais sont
des valeurs **calculées** : aucune clé n'en est dérivée. *Une clé nomme une phrase fermée.*
C'est pour ça que la conversion est posée SITE PAR SITE et non au point de passage — le
fabricant, lui, ne sait pas distinguer un littéral d'une donnée.

| clé | `en` attendu (byte-identique) |
|---|---|
| `reputation.bloc.ce_qu_il_a_absorbe_de_vos_regles` | `ce qu’il a absorbé de vos règles` |
| `reputation.bloc.donner_une_regle` | `DONNER UNE RÈGLE` |
| `reputation.bloc.le_miroir` | `Le miroir` |
| `reputation.bloc.les_regles_que_vous_avez_donnees` | `LES RÈGLES QUE VOUS AVEZ DONNÉES` |
| `reputation.bloc.vous_n_avez_encore_donne_aucune_regle_rien_ne_peut_donc_etre_enfreint` | `vous n’avez encore donné aucune règle — rien ne peut donc être enfreint` |
| `reputation.etat.coherence_inconnue` | `Cohérence inconnue` |
| `reputation.etat.il_se_ferme` | `Il se ferme` |
| `reputation.etat.il_se_tient_a_carreau` | `Il se tient à carreau` |
| `reputation.etat.il_vous_ecoute` | `Il vous écoute` |
| `reputation.etat.il_vous_en_veut` | `Il vous en veut` |
| `reputation.etat.la_comptabilite_tenue` | `la comptabilité tenue` |
| `reputation.etat.la_discretion_devant_les_civils` | `la discrétion devant les civils` |
| `reputation.etat.la_justice_envers_les_siens` | `la justice envers les siens` |
| `reputation.etat.la_ponctualite` | `la ponctualité` |
| `reputation.etat.offre_inconnue` | `Offre inconnue` |
| `reputation.etat.on_demande_des_gages` | `On demande des gages` |
| `reputation.etat.on_vient_sans_garantie` | `On vient sans garantie` |
| `reputation.etat.pas_encore_jugeable` | `Pas encore jugeable` |
| `reputation.etat.posture_inconnue` | `Posture inconnue` |
| `reputation.etat.vous_vous_en_ecartez` | `Vous vous en écartez` |
| `reputation.etat.vous_vous_y_tenez` | `Vous vous y tenez` |
