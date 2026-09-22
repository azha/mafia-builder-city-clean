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
