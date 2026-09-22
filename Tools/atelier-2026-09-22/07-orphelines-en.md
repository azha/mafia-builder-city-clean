# 07 — Les 43 clés orphelines : la valeur `en`, réécrite pour coller au nouveau `fr`

Atelier / DA, 2026-09-22. Source : `mafia-builder-city-clean/Tools/juge-donnees/i18n/orphelines-2026-09-22.{md,json}` (client `4bddb0aa`). Le texte `fr` est celui de la table (colonne « texte FR exact du littéral ») ; ce fichier donne l'`en` de la **nouvelle** clé, pour que f7 applique `fr` et `en` en une passe. Contrôle fait à l'écriture : l'ensemble des 28 clés ci-dessous est ÉGAL à l'ensemble des clés « nouvelle » du JSON (script, pas relecture).

## Les 28

| clé | en |
|---|---|
| `carnet.bloc.ce_qu_on_sait_pour_l_instant` | WHAT WE KNOW SO FAR |
| `carnet.bloc.ce_qu_on_sait_vraiment` | WHAT WE ACTUALLY KNOW |
| `carnet.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_la_soiree_est_vide_c_est_on_ne_sait_pas_ce_qui_est_prevu` | no answer came back. That's not “the evening is empty” — it's “we don't know what's planned”. |
| `carnet.bloc.une_suite_d_ordres_qu_on_met_de_cote_et_qu_on_relance_d_un_geste_cette_facon_de_faire_s_ouvre_plus_tard_il_faut_d_abord_monter_d_un_palier` | a sequence of orders you set aside and replay in one move. This way of doing things opens up later — you have to move up a tier first. |
| `carnet.bloc.ce_que_la_ville_prepare_personne_ne_vous_le_rapporte_encore_ce_sera_ici_le_jour_ou_quelqu_un_le_fera` | what the city is preparing, no one reports to you yet. It will show up here the day someone does. |
| `conflit.bloc.dessinees_pas_renseignees_personne_ne_vous_dit_ce_qu_elles_preparent_ni_ce_qu_elles_possedent_on_frappe_a_l_aveugle` | Drawn, not informed: no one tells you what they're preparing or what they own — we strike blind. |
| `conflit.bloc.vous_avez_l_homme_personne_pour_lui_dire_ou_frapper_on_ne_sait_pas_encore_ou_ils_sont` | You have the man. No one to tell him where to strike — we don't know where they are yet. |
| `filiere.bloc.ce_qu_on_sait_vraiment` | WHAT WE ACTUALLY KNOW |
| `filiere.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_la_filiere_est_vide_c_est_on_ne_sait_pas_ou_elle_en_est` | no answer came back. That's not “the pipeline is empty” — it's “we don't know where it stands”. |
| `filiere.bloc.le_premier_maillon_sans_elle_rien_n_entre_dans_la_filiere_et_rien_ne_se_ramasse_chez_les_dealers_non_plus` | the first link: without it, nothing enters the pipeline — and nothing gets collected from the dealers either. |
| `filiere.bloc.on_ne_vous_dira_que_si_c_est_propre_ni_combien_ni_depuis_quand_ni_a_quel_prix_c_est_voulu` | you'll only be told whether it's clean: not how much, not since when, not at what price. That's deliberate. |
| `filiere.bloc.ce_n_est_pas_une_panne_c_est_un_etat_il_n_y_a_rien_a_montrer_tant_qu_il_n_y_a_rien_de_monte_il_faut_une_planque_pour_que_la_filiere_commence_quelque_part` | this isn't a failure, it's a state: there's nothing to show while nothing is set up. You need a safehouse for the pipeline to start somewhere. |
| `filiere.bloc.ce_qu_on_sait_pour_l_instant` | WHAT WE KNOW SO FAR |
| `forensic.bloc.une_piste_posee_par_habitude_ressemble_a_une_piste_relevee` | A trail laid down out of habit looks just like a trail that was tracked |
| `forensic.bloc.ce_qu_on_sait_vraiment` | WHAT WE ACTUALLY KNOW |
| `horizon.bloc.ce_qu_on_sait_vraiment` | WHAT WE ACTUALLY KNOW |
| `horizon.bloc.aucune_de_ces_cartes_n_a_encore_de_nom` | None of these cards has a name yet |
| `horizon.bloc.on_ne_sait_pas_encore_ce_qui_manque_pour_y_arriver` | we don't know yet what's missing to get there |
| `journal.bloc.ce_qu_on_sait_vraiment` | WHAT WE ACTUALLY KNOW |
| `journal.bloc.les_breves_sont_arrivees_sans_leur_texte_le_journal_de_ce_matin_n_a_que_des_titres_a_trous_voila_ce_qu_on_peut_vous_montrer_aujourd_hui` | the briefs came in without their text: this morning's paper only has headlines with blanks. Here's what we can show you today. |
| `journal.bloc.ce_qu_on_sait_pour_l_instant` | WHAT WE KNOW SO FAR |
| `journal.bloc.on_n_a_pas_eu_de_reponse_ce_n_est_pas_la_ville_est_calme_c_est_on_ne_sait_pas_ce_qu_elle_a_fait_cette_nuit` | no answer came back. That's not “the city is quiet” — it's “we don't know what it did last night”. |
| `loi.bloc.une_affaire_nait_d_une_descente_rien_ici_n_en_cree` | A case is born of a raid — nothing here creates one. |
| `distribution.bloc.aucune_route_tendue_pour_l_instant` | No route strung yet. |
| `autonomie.etat.consequence_minime` | minor consequence |
| `autonomie.etat.un_compromis` | a trade-off |
| `autonomie.etat.on_s_expose` | we're exposed |
| `autonomie.etat.on_laisse_passer_quelque_chose` | we let something slip by |

## Ce qui guide l'anglais (et pourquoi ce n'est pas une recopie)

- L'`en` servi aujourd'hui traduit l'ANCIEN texte, celui de l'architecture (« WHAT THE SERVER ACTUALLY SENDS », « the route returned nothing », « no route says… »). Le recopier rendrait à la locale `en` exactement ce que le lot C a retiré du `fr`. Les lignes 14, 15, 16, 17, 25 servent même le français tel quel en `en` (copie de la valeur `fr` d'origine).
- Même registre que le `fr` : le sujet des trous est **we / no one / the city** (on / personne / la ville), jamais *the server* ni *the route*. Les titres de panneau restent en CAPITALES comme en `fr` ; les lignes de corps gardent leur minuscule initiale.
- Vocabulaire aligné sur l'`en` déjà servi par ces écrans : *pipeline* (filière), *safehouse* (planque), *briefs* (brèves, `journal.bloc.aucune_de_ces_breves_n_a_de_texte`), *tier* (palier), *raid* (descente). « piste » (㊴) n'avait aucun anglais : tout l'écran `forensic` est servi en français sous la locale `en` ; *trail* est posé ici. « tendue » (㉘) : *strung*, la ficelle du liège (㉘·54).
- Guillemets typographiques “ ” et tiret — en `en`, comme l'`en` servi.

## ⚠️ Lignes 25 à 28 (㉔) — la valeur `fr` de la table porte encore le glyphe

La table fixe le `fr` au littéral de `75ac1001` : « [~] conséquence minime », « [<>] un compromis », « [!] on s'expose », « [$] on laisse passer quelque chose ». L'annexe c4 de `04-libelles-anglais.md` retire ces glyphes (une seule couleur pour les quatre, le mot porte le sens). **La clé ne change pas** avec ou sans glyphe (le slug l'ignore), mais la VALEUR servie est ce que `Libelle.De` affiche : si f7 sert le `fr` avec glyphe, le glyphe revient à l'écran même après que la tranche 2 l'a retiré du littéral.

| clé | fr à servir si c4 s'applique | en |
|---|---|---|
| `autonomie.etat.consequence_minime` | conséquence minime | minor consequence |
| `autonomie.etat.un_compromis` | un compromis | a trade-off |
| `autonomie.etat.on_s_expose` | on s'expose | we're exposed |
| `autonomie.etat.on_laisse_passer_quelque_chose` | on laisse passer quelque chose | we let something slip by |

⇒ À trancher par l'orchestrateur avant la passe de f7 : c4 appliqué (`fr` et `en` sans glyphe, ci-dessus) ou pas (`fr` de la table, et l'`en` prend le même glyphe devant : `[~] minor consequence`…). L'`en` de ce fichier est écrit SANS glyphe, parce que c4 est la décision de l'atelier.

## Complément du 2026-09-22 — les 15 `building.row.*` (table régénérée, 43 clés, client `7d675f9c`)

Contrôle fait à l'écriture : l'ensemble des 28 clés ci-dessus + les 15 ci-dessous est ÉGAL à l'ensemble des 43 clés « nouvelle » du JSON régénéré (script, pas relecture). Mesuré par le client : les 25 `building.row.*` sont servies en ANGLAIS dans les deux locales aujourd'hui ; le `fr` est celui de la table.

| clé | fr (table) | en |
|---|---|---|
| `building.row.mise_en_place` | Mise en place | Setup |
| `building.row.en_service` | En service | In service |
| `building.row.couverture` | Couverture | Cover |
| `building.row.risque_de_descente` | Risque de descente | Raid risk |
| `building.row.alerte` | Alerte | Alert |
| `building.row.chaine_du_froid` | Chaîne du froid | Cold chain |
| `building.row.taille_du_labo` | Taille du labo | Lab size |
| `building.row.purete` | Pureté | Purity |
| `building.row.rendez_vous` | Rendez-vous | Appointment |
| `building.row.gain` | Gain | Payout |
| `building.row.culture` | Culture | Crop |
| `building.row.pousse` | Pousse | Growth |
| `building.row.soin` | Soin | Care |
| `building.row.taille_du_relais` | Taille du relais | Hub size |
| `building.row.equipe` | Équipe | Crew |

**Même clé, valeur servie périmée** (section à part de la table) :

| clé | fr (table) | en |
|---|---|---|
| `building.row.temperature` | Température | Temperature |

- L'`en` change là où le `fr` a changé de sens, pas seulement de langue : *tier* → **size** (« Taille du labo / du relais » : la bande dit une taille, pas un rang), *Operational* → **In service** (« En service »), *Grow stage* → **Growth** (« Pousse »), *Husbandry* → **Care** (« Soin »), *Roster* → **Crew** (« Équipe »). Ailleurs l'`en` servi disait déjà ce que dit le `fr`, et il est gardé (Setup, Cover, Raid risk, Alert, Cold chain, Purity, Appointment, Payout, Crop) — garder n'est pas recopier : chaque ligne a été relue contre son `fr`.
- Titres de ligne : majuscule initiale, sans point, comme les 25 servis.
