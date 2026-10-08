# L'en de 23 clés (demandées « 24 ») — 18 relevées par le back, 6 par CLIENT-2 pour ⑨, dont une en commun

> Atelier / DA, 2026-09-23. **Sources** : la table BundleReel de CLIENT-1 (`Tools/juge-donnees/i18n/bundle-reel-construction-2026-09-23.md`,
> `d69e64d1`, 20 clés non servies, l.29-48) moins les 2 que le back a servies (`8c83da27`, `back/s5-revue-du-jour`, arbre
> `~/project/mafia-back-suite` : `carnet.bloc.ce_que_la_ville_ne_dit_pas`, `revue.bloc.personne_au_comptoir_ce_matin`) = **18** ; et les 6 de ⑨
> (`~/project/mafia-unity-F/Tools/juge-donnees/exceptions/i18n-2026-09-23.md`, l.22-27). **`exceptions.bloc.le_comptoir_n_a_pas_repondu` est
> dans les deux** ⇒ **23 clés**, pas 24.
> **fr** = le littéral du client lu au site (cumul `14eb2454`), **avec l'apostrophe typographique `’`** (tranché le 2026-09-23 : toute valeur fr
> servie prend `’` ; le repli littéral du client garde la droite, la clé dérivée ignore la ponctuation).
> Vérifié : `python3 Tools/atelier-2026-09-22/verifier-19.py`.

## Les 23 clés

| clé | fr (à servir) | en | site (client) |
|---|---|---|---|
| `carnet.bloc.le_carnet_n_a_pas_repondu` | le carnet n’a pas répondu | the order book didn’t answer | `CarnetScreenController.cs:251` |
| `appro.etat.vous_ne_tenez_encore_aucun_site` | Vous ne tenez encore aucun site. | You don’t hold any site yet. | `ChaineDApproScreenController.cs:198` |
| `appro.etat.rien_a_commander_vous_ne_tenez_pas_encore_de_labo` | Rien à commander — vous ne tenez pas encore de labo. | Nothing to order — you don’t have a lab yet. | `:207` |
| `appro.titre.la_chaine_d_appro_n_a_pas_repondu` | La chaîne d’appro n’a pas répondu | The supply chain didn’t answer | `:596` |
| `conflit.bloc.le_compte_des_envois_precedents_n_a_pas_repondu` | Le compte des envois précédents n’a pas répondu. | The tally of earlier sends didn’t answer. | `ConflitScreenController.cs:342` |
| `conflit.titre.le_conflit_n_a_pas_repondu` | Le conflit n’a pas répondu | The conflict didn’t answer | `:535` |
| `distribution.titre.la_distribution_n_a_pas_repondu` | La distribution n’a pas répondu | Distribution didn’t answer | `DistributionScreenController.cs:782` |
| `exceptions.bloc.le_comptoir_n_a_pas_repondu` | Le comptoir n’a pas répondu. | The counter didn’t answer. | `ExceptionQueueController.cs:510` (cumul) · `:857` (arbre F) |
| `filiere.bloc.la_chaine_de_la_tete_a_la_sortie` | LA CHAÎNE, DE LA TÊTE À LA SORTIE | THE CHAIN, FROM HEAD TO EXIT | `FiliereScreenController.cs:300` |
| `filiere.bloc.ce_que_la_chaine_fait_de_votre_argent` | CE QUE LA CHAÎNE FAIT DE VOTRE ARGENT | WHAT THE CHAIN DOES WITH YOUR MONEY | `:320` |
| `filiere.bloc.elle_le_lave_par_paliers_pas_d_un_coup` | Elle le lave par paliers, pas d’un coup | It cleans it in stages, not all at once | `:321` |
| `filiere.bloc.etape` | ÉTAPE | STAGE | `:344` |
| `filiere.bloc.la_sortie` | LA SORTIE | THE EXIT | `:345` |
| `filiere.bloc.de_l_argent_attend_a_cette_etape` | de l’argent attend à cette étape | money is waiting at this stage | `:354` |
| `filiere.bloc.rien_n_attend_a_cette_etape` | rien n’attend à cette étape | nothing is waiting at this stage | `:355` |
| `filiere.bloc.la_filiere_n_a_pas_repondu` | LA FILIÈRE N’A PAS RÉPONDU | THE PIPELINE DIDN’T ANSWER | `:365` |
| `journal.bloc.rien_ce_matin_la_ville_a_passe_une_nuit_tranquille` | Rien ce matin.\nLa ville a passé une nuit tranquille. | Nothing this morning.\nThe city had a quiet night. | `JournalScreenController.cs:335` |
| `loi.titre.le_parloir_n_a_pas_repondu` | Le parloir n’a pas répondu | The visiting room didn’t answer | `LoiScreenController.cs:459` |
| `exceptions.bloc.ouvrir_sa_main` | OUVRIR SA MAIN | OPEN THEIR HAND | `ExceptionQueueController.cs:690` (arbre F) |
| `exceptions.bloc.suggere_appui_long_sa_main` | suggéré · appui long — sa main | suggested · long press — their hand | `:758` (arbre F) |
| `exceptions.bloc.autre_issue` | autre issue | other option | `:761` (arbre F) |
| `exceptions.bloc.autres_issues` | autres issues | other options | `:761` (arbre F) |
| `exceptions.locuteur.votre_lieutenant` | Votre lieutenant | Your lieutenant | `ExceptionBandes.cs:189` (arbre F) |

## Notes

- **« n’a pas répondu »** (9 états d'indisponibilité) → « didn’t answer », partout : un seul mot pour un seul état, dans les deux langues.
- **filière / chaîne** : l'écran distingue la **filière** (le tout, `pipeline` dans les clés du back et dans l'en déjà servi de
  `game.legal.lawyer_tier.corruption_pipeline`) et la **chaîne** (ses étapes, de la tête à la sortie). L'en garde la distinction : *pipeline* /
  *chain*. « Elle le lave » : *cleans*, pas *launders* — le verbe maison du fr est « laver », et l'en de ㉘/㉚ dit déjà « clean » (`pipeline.etat.clean`).
- **« sa main »** (les cartes du lieutenant) → *their hand* : sans genre, comme « Teach them » (§3.8 du `11-…`). **« issue »** d'une carte →
  *option*, comme « their hand: {n} other options » (§3.5 du `11-…`).
- **« le carnet »** (㉞, les ordres du soir) → *the order book* ; **« le parloir »** (㉛, la loi) → *the visiting room*.
- `journal.bloc.rien_ce_matin_…` garde son **saut de ligne** `\n` dans les deux langues (le client l'écrit ainsi, `:335`).
- ⚠️ **Au back, sans rapport avec ce paquet mais vu en le préparant** : la table de CLIENT-2 (l.79 et l.83) montre deux valeurs fr servies qui portent
  ma **justification** au lieu du mot — `exceptions.gravite.mild` = « légère — la suite naturelle de « grave · modérée » » et
  `exceptions.priorite.silent` = « sans urgence — « silencieuse » décrit la carte… ». La faute est à ma table (`11-…` §3.2, le mot et sa raison dans
  la même cellule), corrigée dans le même commit : les valeurs à servir sont **« légère »** et **« sans urgence »**.

## `error.*` servies en anglais dans le bundle fr — 1 clé (ajout du 2026-09-23, back `f97a138d`)

> **Mesure**, par nom, dans le back à `f97a138d` : `resolveBundle('fr')` = `errorKeyTemplates('fr')` ⊕ `EN_MESSAGES` ⊕ `FR_MESSAGES`.
> `ERROR_CODES` (`protocol/error-codes.ts`) déclare **64** clés `error.*` ; `ERROR_TEXT_RATIFIED` en couvre **63** en `en` et **63** en `fr`
> (le registre des erreurs déjà servies en fr) ; `EN_MESSAGES` et `FR_MESSAGES` n'en surchargent **aucune**. ⇒ Une seule clé tombe au
> **REPLI** (l'humanisation du dernier segment, en anglais machine, identique dans les deux bundles) ; les 63 autres servent un fr ratifié
> **différent** de son en. Aucune autre `error.*` n'a un fr en anglais.

| clé | fr servi aujourd'hui | fr (à servir) | en servi aujourd'hui | en (à servir) |
|---|---|---|---|---|
| `error.engagements.muscle_lieutenant_required` | Muscle lieutenant required. | Seul un lieutenant du genre Gros bras peut partir sur ce coup. Envoyez-en un, ou recrutez-en un. | Muscle lieutenant required. | Only a Muscle-type lieutenant can go out on this one. Send one, or recruit one. |

- **L'en n'était pas bon non plus** : « Muscle lieutenant required. » est le repli, pas un texte — un identifiant machine mis en phrase, qui ne
  dit ni pourquoi ni quoi faire. Les 63 textes ratifiés tiennent tous en deux temps (**le constat, puis le geste** : « A lieutenant is still
  assigned there. Reassign them first. ») ; celui-ci aussi.
- **Le cas** (commentaire du code, TD-553) : le joueur a choisi un lieutenant **à lui** mais **du mauvais archétype** pour un conflit ;
  le remède est d'en envoyer un Gros bras, ou d'en recruter un. D'où les deux gestes.
- **Les mots du canon** : l'archétype se dit **« Gros bras »** / **« Muscle »** (`famille.archetype.gros_bras`), et l'écran du conflit le dit
  déjà « du genre Gros bras » / « the Muscle type » (`conflit.bloc.aucun_de_vos_lieutenants_n_est_du_genre_gros_bras`) ; le conflit, c'est
  « partir » la nuit (`conflit.bloc.dites_moi_qui_j_envoie_…` : « Dites-moi qui j'envoie… je pars ce soir ») ⇒ « partir sur ce coup »,
  « Envoyez-en un ». Sans genre présumé : aucun pronom pour le lieutenant, « en un » renvoie au mot « lieutenant », comme dans le canon.
- **Vouvoiement**, comme les 63 : « Envoyez », « recrutez ».
- **Apostrophe** : la valeur fr n'en porte pas (« Seul un… ») — la question de `’` contre `'` (les 63 ratifiés ont la droite) ne se pose pas ici.
- **Où poser le texte** : dans `ERROR_TEXT_RATIFIED` (`en` et `fr`), et dans sa source `docs/content/i18n-staging/error.{en,fr}.json`
  (« recopiés, jamais réécrits ») ; le repli reste le filet des codes neufs.
- ⚠️ **Vu en mesurant, hors paquet** : `conflit.bloc.c_est_lui_qui_part_la_nuit_…` (`ConflitScreenController.cs:447` au cumul `14eb2454`)
  sert en en « **He**'s the one who goes out at night ». En fr, « lui » reprend **le Gros bras** — l'archétype, un nom masculin — et se tient ;
  en anglais, « He » donne un genre à une personne, contre la règle (aucun genre présumé). En à redire, fr inchangé (la clé en dérive) :
  « **That's** the one who goes out at night. You're missing one — nothing is broken, you simply don't have one yet. »
