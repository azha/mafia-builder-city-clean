# BundleReel — le trou de la construction, et la classe (2026-09-23, statique ; table du back `aea5ef7c` = tête de `back/s5-revue-du-jour`)

## Le trou
`BundleReel_EcranSignerLOrdre_ZeroRepli` est la SEULE garde « zéro repli », et elle ne couvre que ⑥. Elle montait l'écran ACTIF : `Start` →
`BuildLayout` partait pendant le chargement du bundle, et les compteurs n'étaient remis à zéro qu'APRÈS. Elle ne voyait donc que le rejeu
(`RendreTousLesLibelles`), jamais ce que la construction demande.

## Le compte (`sites-libelle.py` + `construction-ecran-6.py`, borne BASSE : aides au corps riche non vues)
- Tout le client : **416 sites Libelle à littéral dans 33 fichiers ; 23 clés non servies** par la table `aea5ef7c` (1016 clés).
- ⑥ : 106 sites · **32 rejoués** · **41 sites / 35 clés à la CONSTRUCTION, jamais rejoués** (Build*Section, RenderRoster, RenderAutonomy…)
  · 33 sites / 24 clés au rendu de DONNÉES (réponses réseau : AttachRules, ValidateRules, RenderBands…) — hors garde, toutes servies.
- Les 32 autres fichiers : **aucune garde zéro repli** — 310 sites, 20 clés non servies (ci-dessous).

## La forme retenue — remettre à zéro avant la construction, le bundle chargé AVANT (appliquée)
Hôte INACTIF jusqu'au bundle chargé, compteurs à zéro, PUIS activation : `BuildLayout` est compté contre le catalogue chargé, comme en jeu
(le shell amorce le catalogue avant de monter un locataire). Nouveau plancher : > 30 appels par la CONSTRUCTION, mesuré avant le rejeu.
Écartées : « rejouer les boutons » (une liste tenue à la main — le défaut que `RendreTousLesLibelles` a déjà payé) ; « remettre à zéro
avant BuildLayout » SANS charger le bundle d'abord (rouge par construction : chaque libellé bâti avant le chargement serait un repli).
**Aucun rendu changé** : le code de l'écran est intact ; seul l'ordre du montage de CE test change.

## Ce que la garde demandera en plus
Population : + la construction de ⑥ (jusqu'à 41 sites / 35 clés, statique ; le run donnera le compte exact).
**Clés non servies qui apparaîtront — 3, toutes de ㉔ (servies par le back demain)** : la garde est ROUGE tant qu'elles ne le sont pas.
- `famille.ecran.lui_rendre_sa_marge`
- `famille.ecran.lui_elargir_sa_marge`
- `famille.ecran.laisser_passer_celle_ci`

## Hors de toute garde — 20 clés non servies dans 9 autres écrans (à servir, ou à garder)
- `carnet.bloc.le_carnet_n_a_pas_repondu` — CarnetScreenController.cs:251 (RendreEtatIndisponibleNomme)
- `carnet.bloc.ce_que_la_ville_ne_dit_pas` — CarnetScreenController.cs:296 (AppliquerEtat)
- `appro.etat.vous_ne_tenez_encore_aucun_site` — ChaineDApproScreenController.cs:198 (DecouvrirBuildingId)
- `appro.etat.rien_a_commander_vous_ne_tenez_pas_encore_de_labo` — ChaineDApproScreenController.cs:207 (DecouvrirBuildingId)
- `appro.titre.la_chaine_d_appro_n_a_pas_repondu` — ChaineDApproScreenController.cs:596 (RendreEtatIndisponible)
- `conflit.bloc.le_compte_des_envois_precedents_n_a_pas_repondu` — ConflitScreenController.cs:342 (RendreTable)
- `conflit.titre.le_conflit_n_a_pas_repondu` — ConflitScreenController.cs:535 (RendreEtatIndisponible)
- `distribution.titre.la_distribution_n_a_pas_repondu` — DistributionScreenController.cs:782 (RendreEtatIndisponible)
- `exceptions.bloc.le_comptoir_n_a_pas_repondu` — ExceptionQueueController.cs:510 (RenderError)
- `filiere.bloc.la_chaine_de_la_tete_a_la_sortie` — FiliereScreenController.cs:300 (AppliquerEtat)
- `filiere.bloc.ce_que_la_chaine_fait_de_votre_argent` — FiliereScreenController.cs:320 (AppliquerEtat)
- `filiere.bloc.elle_le_lave_par_paliers_pas_d_un_coup` — FiliereScreenController.cs:321 (AppliquerEtat)
- `filiere.bloc.etape` — FiliereScreenController.cs:344 (Etape)
- `filiere.bloc.la_sortie` — FiliereScreenController.cs:345 (Etape)
- `filiere.bloc.de_l_argent_attend_a_cette_etape` — FiliereScreenController.cs:354 (Etape)
- `filiere.bloc.rien_n_attend_a_cette_etape` — FiliereScreenController.cs:355 (Etape)
- `filiere.bloc.la_filiere_n_a_pas_repondu` — FiliereScreenController.cs:365 (RendreEtatIndisponible)
- `journal.bloc.rien_ce_matin_la_ville_a_passe_une_nuit_tranquille` — JournalScreenController.cs:335 (RendreListe)
- `loi.titre.le_parloir_n_a_pas_repondu` — LoiScreenController.cs:459 (RendreEtatIndisponible)
- `revue.bloc.personne_au_comptoir_ce_matin` — DailyReviewScreenController.cs:282 (Render)

## DETTE — les écrans SANS garde « zéro repli » (2026-09-23)
Seul ⑥ (`LieutenantScreenController`) est mesuré par `BundleReel`. Tous les autres écrans qui passent par `Libelle` — **28 contrôleurs** —
affichent le littéral français quand leur clé manque, sans que rien ne rougisse. Dont **9 avec des clés non servies aujourd'hui**
(table `aea5ef7c`, section précédente) — en tête de liste. Forme à reprendre écran par écran : celle de `BundleReel` (bundle chargé,
compteurs à zéro, PUIS construction ; plancher d'appels ; rejeu des résolveurs) — avec un point d'entrée hors réseau par écran.

| écran (contrôleur) | sites Libelle à littéral | clés non servies (aea5ef7c) |
|---|---|---|
| `FiliereScreenController.cs` | 34 | 8 |
| `ChaineDApproScreenController.cs` | 12 | 3 |
| `CarnetScreenController.cs` | 19 | 2 |
| `ConflitScreenController.cs` | 10 | 2 |
| `JournalScreenController.cs` | 29 | 1 |
| `ExceptionQueueController.cs` | 15 | 1 |
| `DistributionScreenController.cs` | 11 | 1 |
| `LoiScreenController.cs` | 10 | 1 |
| `DailyReviewScreenController.cs` | 2 | 1 |
| `BuildingCardController.cs` | 21 | 0 |
| `HorizonScreenController.cs` | 20 | 0 |
| `ForensicScreenController.cs` | 16 | 0 |
| `DistrictInteriorScreenController.cs` | 13 | 0 |
| `CityMapController.cs` | 9 | 0 |
| `ExceptionDetailController.cs` | 9 | 0 |
| `AutonomyInboxController.cs` | 5 | 0 |
| `ReputationScreenController.cs` | 5 | 0 |
| `HomeChromeController.cs` | 5 | 0 |
| `DashboardController.cs` | 4 | 0 |
| `DemolitionScreenController.cs` | 4 | 0 |
| `HighestLeverageCardController.cs` | 4 | 0 |
| `ProfileScreenController.cs` | 2 | 0 |
| `SettingsScreenController.cs` | 2 | 0 |
| `DelegationScreenController.cs` | 2 | 0 |
| `ExceptionQueuePanelController.cs` | 2 | 0 |
| `CompressionScreenController.cs` | 1 | 0 |
| `ShopScreenController.cs` | 1 | 0 |
| `OrgVitalsPanelController.cs` | 1 | 0 |

Résolveurs partagés hors contrôleur (4 fichiers, sans garde propre ; `FamilleLabels` est rejoué par ⑥) : `FamilleLabels.cs` (16), `ReputationResolvers.cs` (16), `PureteResolvers.cs` (5), `WalletBandResolver.cs` (5).

## La garde générique (23/09, code seulement — run après le gate du back)
`ZeroRepliDesLocatairesPlayModeTests` (catégorie BundleReel) : UNE forme pour les 25 locataires du shell qui passent par `Libelle`
(les 7 autres — Inspection, Precinct, Tutorial, Laundering, PipelineOverview, Selling, DecisionDetail — exclus avec leur raison :
aucun site à littéral ; couverture vérifiée par réflexion, tout nouveau locataire rougit tant qu'il n'est pas classé).
Chemin du jeu : shell réel → bundle amorcé → pour chaque locataire, compteurs à zéro → `MonterLocataireEnSurimpression<T>` → 3 s →
`Libelle.ClesEnRepli` → démontage immédiat. Deux règles : (1) repli observé ⊆ dette datée ; (2) aucune clé de la dette n'est servie.
**Dette datée recalculée contre la pile réelle (40128b53) et l'arbre regroupé : 24 clés, pas 20** — ⑥ (3 gestes) et ⑯ (1) sont
désormais servies ; le merge de CLIENT-2 apporte 5 clés ⑨ non servies (`exceptions.locuteur.votre_lieutenant`, `exceptions.bloc.
ouvrir_sa_main`, `.suggere_appui_long_sa_main`, `.autre_issue`, `.autres_issues`). Hors garde, écrit : les 4 panneaux du chrome
(HomeChrome, OrgVitals, HighestLeverageCard, ExceptionQueuePanel) bâtis par le shell pendant sa propre acquisition.

## Dette 24 → 0 (2026-09-23, pile reconstruite sur 83b4f291)
Instantané versionné `string_table-83b4f291.ts` : 1059 clés ; `sites-libelle.py` : 455 sites à littéral dans 34 fichiers, **0 clé non
servie**. `DetteDatee` est vide : la garde des locataires est un zéro strict. Reste hors garde : les 4 panneaux du chrome.

## Correction : la dette n'est pas 0, elle est de 26 — mesurée par la garde (rejeu 2026-09-23 01:34, pile 83b4f291)
Le « 24 → 0 » précédent venait du compte STATIQUE, qui est une borne basse (il ne voit que les littéraux passés tels quels à une
aide). La garde, sur le vrai rendu, a rougi sur 26 clés non servies, toutes antérieures (aucune nouvelle) — 4 écrans :
- `appro.titre.la_commande_est_arrivee (ChaineDApproScreenController)`
- `appro.sous_titre.le_stock_est_reconstitue_vous_pouvez_commander_a_nouveau (ChaineDApproScreenController)`
- `appro.bloc.a_quoi_ca_sert (ChaineDApproScreenController)`
- `appro.bloc.ce_qu_il_en_reste (ChaineDApproScreenController)`
- `appro.bloc.le_prix (ChaineDApproScreenController)`
- `appro.bloc.le_fournisseur (ChaineDApproScreenController)`
- `appro.bloc.des_maillons_existent_mais_cet_ecran_ne_sait_pas_encore_les_afficher (ChaineDApproScreenController)`
- `distribution.titre.ce_qui_est_sur_la_route (DistributionScreenController)`
- `distribution.sous_titre.un_coursier_est_parti_voila_le_chemin_qu_il_prend (DistributionScreenController)`
- `distribution.bloc.d_ou_ca_part (DistributionScreenController)`
- `distribution.bloc.ou_ca_va (DistributionScreenController)`
- `distribution.bloc.le_chemin (DistributionScreenController)`
- `distribution.bloc.a_traverser (DistributionScreenController)`
- `distribution.bloc.cette_route (DistributionScreenController)`
- `distribution.bloc.il_est_parti_a_la_nuit_ca_serpente_mais_c_est_la_seule_qui_evite_le_pont_du_threnny (DistributionScreenController)`
- `filiere.bloc.chaque_etape_rend_l_argent_un_peu_plus_propre_que_la_precedente_seule_la_derniere_credite_le_portefeuille_tant_qu_il_n_y_a_pas_de_sortie_il_n_y_a_pas_d_argent_seulement_une_file_d_attente (FiliereScreenController)`
- `loi.bouton.mettre_sous_retention (LoiScreenController)`
- `loi.bloc.commis_d_office (LoiScreenController)`
- `loi.badge.en_place (LoiScreenController)`
- `loi.bloc.gratuit_il_fait_ce_qu_il_peut (LoiScreenController)`
- `loi.bloc.un_cabinet (LoiScreenController)`
- `loi.badge.disponible (LoiScreenController)`
- `loi.bloc.ca_coute_il_connait_les_juges (LoiScreenController)`
- `loi.bloc.la_filiere (LoiScreenController)`
- `loi.badge.a_vos_risques (LoiScreenController)`
- `loi.bloc.ca_coute_cher_et_ca_peut_se_retourner (LoiScreenController)`
