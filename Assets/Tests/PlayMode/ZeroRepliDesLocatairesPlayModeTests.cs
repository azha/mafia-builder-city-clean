using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>⛔ LA GARDE « ZÉRO REPLI » DE TOUS LES LOCATAIRES DU SHELL — UNE FORME, PAS 25 COPIES (2026-09-23).
    ///
    /// `BundleReel_EcranSignerLOrdre_ZeroRepli` ne mesurait que ⑥. Les autres écrans affichaient le littéral français
    /// quand leur clé manquait, sans que rien ne rougisse (dette : `Tools/juge-donnees/i18n/bundle-reel-construction-
    /// 2026-09-23.md`). Ici, par le chemin du JEU : un shell réel acquiert sa session et AMORCE le bundle réel ; puis,
    /// pour chaque locataire, compteurs à zéro → `MonterLocataireEnSurimpression<T>()` (le geste du joueur) → rendu →
    /// relevé de `Libelle.ClesEnRepli` → démontage en immédiat.
    ///
    /// ⛔ DEUX RÈGLES, qui ferment ensemble ce qu'une égalité d'ensembles fermerait si elle était mesurable :
    ///   (1) toute clé en repli OBSERVÉE est dans la DETTE DATÉE — une clé neuve non servie rougit, nommée avec son écran ;
    ///   (2) toute clé de la dette est ENCORE non servie par le bundle chargé — une clé que le back sert désormais rougit
    ///       aussi : on la RETIRE de la dette, qui ne peut que rétrécir.
    ///   L'égalité littérale « observées == dette » n'est pas mesurable sur une pile saine : les états « … n'a pas répondu »
    ///   ne se rendent qu'en panne réseau. La règle (2) les tient quand même : elle interroge le catalogue, pas l'écran.
    /// ⚠️ Ce qui est mesuré est l'ÉTAT D'ARRIVÉE de chaque écran (sans bâtiment, district ou carte choisis) : les libellés
    ///   des états de données (une fiche remplie, un détail ouvert) ne sont vus que si l'arrivée les rend.</summary>
    [Category("BundleReel")]
    public class ZeroRepliDesLocatairesPlayModeTests
    {
        private GameObject shellGo;
        private AppShell shell;

        /// <summary>DETTE DATÉE : les clés que le code SAIT demander et que le back ne sert pas. **Vide depuis le 2026-09-24** (22 → 0,
        /// pile 66060cc1). Avant : **53 → 0** contre la pile reconstruite
        /// sur 368d1420 (2026-09-23, 1112 clés, instantané `Tools/juge-donnees/i18n/string_table-368d1420.ts`) : direct 0, flux A/B/C
        /// 0, et les 53 inscrites toutes servies (y compris les 2 que seule la garde voyait). Histoire : 24 → 26 → 42 → 48 → 53 → 0.
        /// Vide, la garde est un ZÉRO STRICT : tout repli observé rougit, nommé avec son écran. Elle ne se rallonge que par décision
        /// nommée, datée, avec la table qui la mesure.</summary>
        // `internal` : la garde de l'écran lieutenant (`BundleReelZeroRepliPlayModeTests`) applique la MÊME dette — une source.
        internal static readonly HashSet<string> DetteDatee = new HashSet<string>
        {
            // ⚠️ COUPE du 2026-09-26 (créneau CLIENT-1, cumul 9e9704e1) contre la pile reconstruite sur main 256de0f8 (bundle fr 1996
            // clés) : la règle (2) a rougi, 37 des 43 clés de la dette SONT servies (vente.vide, accueil.suite ligne E, filiere.etat, ㉞…)
            // — retirées. Restent 6 clés, non servies à 256de0f8 (7 avec E2a, ci-dessous) :
            "filiere.bloc.blanchir",       // le mot du bouton de ㊵ (clé dérivée) — demandé à l'atelier
            "building.action.blanchir",
            // B5 (table 79 @f81ad7cb) : la ligne de ㉒. (Les trois `demarrage.echec.*` de l'écran d'échec de démarrage ne sont plus une dette : `RepliVoulu`, 12/11.)
            "reglages.bloc.votre_partie_vit_sur_cet_appareil_desinstaller_l_appli_l_efface",
            // E2a (08/10) : la ligne « Mouvement réduit » de ⑲ (REUSE du canon `screen_14`, mot du canon « Mouvement réduit ») — clé dérivée,
            // non servie à 83b4f291 ; voir `Tools/juge-donnees/i18n/cles-neuves-e2a-2026-10-08.md`.
            "reglages.bloc.mouvement_reduit",
            // ⚠️ COUPE du 2026-10-08 (créneau CLIENT-2, pile dev avec le lot de mots de f2) : la règle (2) a rougi, 28 clés de la dette SONT servies — retirées : COLLECTE `vente.caisse.bande.*` (6),
            // ㉓ VITRINE `boutique.bloc.*` (2), ⑭ `compression.tension.calm` / `compression.semaine.none`, ㉛ `loi.bouton.lui_trouver_un_avocat` / `loi.bloc.le_commis_d_office_fait_ce_qu_il_peut`,
            // ㉚ `appro.bouton.ca_part_du_compte_tout_de_suite`, et 15 clés `forensic.bloc.*` de ㊴. Restent, non servies : celles ci-dessous.
            // ⚠️ COUPE du 2026-10-11 (CLIENT-2, cumul back `gate/cumul-2026-10-10` @14ba96b3, `string_table.ts`, fr ET en) : SERVIES, donc retirées — ⑭ `semaine.bloc.tension` / `semaine.bloc.vos_affaires_respirent` et ㊴ Q5 `forensic.bloc.le_train_de_vie_de_nom` (fr `le train de vie de {nom}` · en `{nom}’s lifestyle`, égales au gabarit du client ; le nom lui-même vient de `lifestyle_lieutenant_name`, lot Q5 @d64941bd). Restent, non servies : `journal.bouton.y_preter_attention`, `forensic.enseigne.rien_a_votre_nom`.
            // ㊳ le pied éteint (CAUSES 3 ET 4, CLIENT-1) : mot de la maquette, clé dérivée, non servie. 1 entrée.
            "journal.bouton.y_preter_attention",
            // ④/⑤ l'APRÈS-GESTE (11/11, relevé par CLIENT-1, demandé par f2) : le petit texte du jeton, `ApresGesteHl.PetitTexteDuJeton` (`Lib("jeton", "votre grande décision du jour")`), clé dérivée NON servie à la pile dev
            // (8d0184a4) ; repli = « votre grande décision du jour », octet pour octet le texte ratifié (maquette r2 `01-inventaire-M-b2ceebeb.txt` L803/809, é = U+00E9 NFC). LEVÉE : la clé est servie sur la pile
            // (lot/couts-30 de BACK-1 @87820327, tranche suivante) — la règle (2) rougit alors et la retire d'ici.
            "accueil.jeton.votre_grande_decision_du_jour",
            // TD-1092 (12/11) : la phrase « équipe au complet » de ③ (LieutenantScreenController.PhraseDeBlocage) lit `roster_room_label_key` SERVIE ; sa valeur n'est pas encore servie sur la pile dev (back lot/equipe-pleine @ff076d49,
            // fusion au cumul back 11/14 puis service). Repli = « Votre équipe est au complet. », ratifié f2 11/11 (le même mot que la valeur FR du back). LEVÉE : la clé est servie sur la pile — la règle (2) rougit et la retire.
            "famille.rosterroom.votre_equipe_est_au_complet",
            // TD-954 (12/11) : la raison de « Réaffecter… » en ON_COOLDOWN (LieutenantScreenController.PhraseDeIndisponibilite) lit `reassign_availability_label_key` SERVIE ; sa valeur n'est pas encore servie sur la pile dev
            // (back lot/td-954-reassign @ff5430b2, non fusionné). Repli = « Trop tôt pour le déplacer à nouveau. », ratifié f2 12/11 (le même mot que la valeur FR du back). LEVÉE : la clé est servie sur la pile — la règle (2) la retire.
            "famille.reaffectation.trop_tot_pour_le_deplacer_a_nouveau",
            // TD-847 (12/11) : ㉔ AutonomyInboxController, états d'ARRIVÉE (sans rapport) : le titre et la phrase « la boîte n'a pas répondu » passent par le catalogue (replis ratifiés f2 12/11). Les 21 autres clés neuves de l'écran
            // (`autonomie.entete.*`, `.age.cycles`, `.bouton.*`, `.resultat.*`, `.etat.decide`) ne se voient qu'avec un rapport : non servies non plus, listées dans la page `Tools/autonomie-td847/design-td847.md`. LEVÉE : servies sur la pile.
            "autonomie.titre.rapports_d_autonomie",
            "autonomie.refus.la_boite_n_a_pas_repondu",
            // + les 4 que la garde VOIT à l'arrivée (un rapport monté : en-tête et deux boutons) — mesuré au run1 du 12/11 : `age.cycles`, `entete.de_nom_age`, `bouton.choisir_a`, `bouton.choisir_b`.
            "autonomie.age.cycles",
            "autonomie.entete.de_nom_age",
            "autonomie.bouton.choisir_a",
            "autonomie.bouton.choisir_b",
            // ㊴ LE DOSSIER (CLIENT-2, 08/10 ; DESIGN v5.2, cadres 150-151-135) : une clé restante, non servie à la pile du 08/10 (les 15 autres le sont : retirées ci-dessus). Les statuts et types d'acteur
            // sont lus par la VALEUR servie (`forensic.statut.*`, `forensic.acteur.lawyer|clerk`).
            "forensic.enseigne.rien_a_votre_nom",   // le sous-titre de l'enseigne du cadre 135 (sans point) : son rôle propre, la clé bloc.* est celle du texte `.rien`
            // ㉚ CADRE 154 « La chaîne vue du graphe » (11/11, CLIENT-1, décision f2) : 18 clés, 0 servie sur back main 6040a213 (mesuré dans
            // `string_table.ts`). 11 sont servies par BACK-1 (`lot/chaine-bandes-2` @1845e0e8 : les 8 bandes et les 3 du fournisseur) ; les 7 de
            // structure (noms FIGÉS par BACK-1, design a7df3592) ne le sont pas encore — code BACK-1 en cours. À RETIRER quand la règle (2) rougit.
            "appro.titre.la_chaine", "appro.sous_titre.chaque_maillon_sa_pression_chaque_liaison_son_entretien",
            "appro.titre.les_maillons", "appro.titre.les_liaisons", "appro.etiquette.refoule_vers", "appro.etiquette.contournee",
            "appro.etiquette.un_batiment_detruit",
            // ㉚ « LES DEUX GESTES » (11/11, CLIENT-1, `Tools/gestes-30/DESIGN.md` §6 ; TD-1048) puis V15 « COÛTS PAR MODE » (`Tools/couts-30-v15/DESIGN.md` §2, branche lot/client1-couts-30-v15-2026-11-11) : 24 clés, 0 servie à ce jour
            // sur la pile — les 17 du lot BACK-1 `lot/couts-30` @87820327 (clés RENOMMÉES aux noms SERVIS, FR à l'octet ; pas encore sur la pile : back main 51cece7d, 0/22) et 7 NEUVES du lot précédent. Elles partent au fil du service.
            // Les REUSE ne sont PAS ici : `appro.bouton.ca_part_du_compte_tout_de_suite`, `game.ui_common.cancel_button` (servis), `appro.sinuosite.*` / `appro.effondrement.*` (servis au cumul 74c5a0b0).
            // ⚠️ `accueil.jeton.votre_grande_decision_du_jour` n'est PAS un REUSE servi (0 à back main 51cece7d et au cumul 74c5a0b0 : le lot BACK-1 l'ajoute) — elle est dans la dette, UNE fois : inscrite plus haut par le cumul (c5a66a6b, après-geste ④/⑤), donc retirée de ce bloc à l'intégration (23 entrées ici, la 24ᵉ là-haut).
            // Retirées (13 noms disparus du code) : `appro.geste.*` ×2, `appro.mode.*` ×5, `appro.mode_sous.*` ×5, `appro.bloc.pendant_les_travaux_…` ×1. Non lues par le client : `appro.etiquette.remaniement`,
            // `appro.consequence.remaniement`, `error.funds.insufficient` (par la clé du corps du refus).
            "appro.titre.entretenir_la_liaison", "appro.titre.reconstruire_la_route",
            "appro.etiquette.rafistoler", "appro.etiquette.renforcer", "appro.etiquette.contourner",
            "appro.etiquette.petit_detour", "appro.etiquette.remise_a_plat",
            "appro.etiquette.quelques_minutes", "appro.etiquette.plus_longtemps", "appro.etiquette.tout_de_suite",
            "appro.consequence.rafistoler", "appro.consequence.renforcer", "appro.consequence.contourner",
            "appro.consequence.petit_detour", "appro.consequence.remise_a_plat",
            "appro.sous_titre.pendant_les_travaux_plus_rien_ne_passe_sur_cette_route",
            "appro.cout.on_ne_sait_pas_encore_combien",
            "appro.etiquette.en_entretien", "appro.titre.les_routes",
            "appro.etat_route.active", "appro.etat_route.saturated", "appro.etat_route.severed", "appro.etiquette.en_reconstruction",
            // (TD-1035 : « appro.etiquette.c_est_ici_que_ca_bouche » RETIRÉE de la dette le 12/11, ruling f2 — aucun code n'affiche ce texte ; CLIENT-1 la réinscrit avec son lecteur, la garde de population l'y force.)
            // ⚠️ COUPE du 12/11 (créneau CLIENT-1, run 2 contre la pile de dev 8d0184a4) : la règle (2) a rougi, 42 clés SONT servies — retirées : les 11 bandes de ㉚
            // (`appro.pression.*`, `appro.dette.*`, `appro.fournisseur.*`) et les 31 `marche.*` de ㉑. Restent ci-dessous l'entrée du menu Plus et les clés des lots d'après.
            // ㉑ LE MARCHÉ (CLIENT-1, 11/11 ; TD-1017 BASCULÉE) : les 31 clés `marche.*` SERVIES par BACK-3 sous leurs noms FIGÉS (`lot/marche-mots` @163402f1,
            // recopiées de string_table.ts à ce SHA, V15) — NON servies sur le back `main` tant que ce lot n'y est pas fusionné : la règle (2) rougira le jour
            // où la pile les sert ⇒ les retirer alors. + l'entrée du menu Plus (non servie).
            "plus.entree.le_marche",
            // TD-823 (11/11, CLIENT-1, décision f2) : la voix des lieutenants (㉛) et de Wexler (㉓) — 8 clés, 0 servie sur back main (mesuré dans
            // `string_table.ts`). BACK-2 les sert sur `lot/td-823-voix` (noms à figer pour boutique.dit.* : clés DÉRIVÉES ici jusqu'à son SHA, puis V15).
            "loi.dit.pour_l_instant_il_n_a_rien_dit_ca_ne_durera_pas_tout_seul",
            "loi.dit.il_a_commence_a_parler_ce_qui_est_sorti_ne_rentrera_pas",
            "loi.dit.il_a_tout_vide_il_n_y_a_plus_rien_a_sauver_de_ce_cote",
            // LB-1 (12/11, CLIENT-1, file f2) : la phrase qui nomme l'élément fuité de ㉛ — servie par BACK-3 `lot/loi-31` (cumul back 11-15 @70ea6e07, V15),
            // 0 servie sur la pile de dev 8d0184a4. Les 8 `loi.element.*` ne sont PAS ici : références SERVIES, jamais demandées par un littéral du client.
            "loi.dit.il_a_donne_ce_qui_est_sorti_ne_rentrera_pas",
            "boutique.locuteur.nom", "boutique.locuteur.role",
            "boutique.dit.vous_avez_tout_claque_d_un_coup_ce_qui_reste_au_mur_vous_ne_l_aurez_pas_avec_de_la_bonne_volonte",
            "boutique.dit.ce_qui_est_la_est_a_vendre_ce_qui_est_trop_cher_pour_vous_je_le_laisse_en_vitrine_ca_vous_fera_un_but",
            "boutique.dit.les_marks_c_est_dehors_qu_on_les_achete_moi_je_vous_les_compte_je_ne_les_vends_pas",
            // GARDE STATIQUE DE POPULATION (Tools/garde-population-cles.py, 12/11, décision f2) : clés AFFICHABLES aujourd'hui, non servies à 8d0184a4 (back déployé), que la garde a trouvées HORS de la dette.
            // 17 textes RATIFIÉS par f2 (FR à l'octet du code, EN ratifié : Tools/garde-population-cles/textes-a-servir-2026-11-12.tsv), servis par le lot de mots de BACK-2 — accueil.carte.* (après-geste), accueil.jeton.*, ㊵ Filière (écart actif) :
            "accueil.carte.c_est_note",
            "accueil.carte.deja_tranchee",
            "accueil.carte.la_carte_reste_sur_la_table",
            "accueil.carte.la_carte_vous_attend_encore",
            "accueil.carte.lire_maintenant",
            "accueil.carte.retour_a_l_accueil",
            "accueil.carte.rien_d_autre_a_trancher_pour_l_instant",
            "accueil.carte.tranchee",
            "accueil.carte.vous_avez_tranche",
            "accueil.jeton.fermee_aujourd_hui",
            "accueil.jeton.libre",
            "accueil.jeton.pris",
            "filiere.bloc.ecart",
            "filiere.bloc.la_filiere_s_ecarte_de_son_profil",
            "filiere.bloc.on_vous_dit_oui_ou_non_jamais_de_combien_ni_pourquoi_c_est_le_seul_signal_d_alerte_de_la_filiere_et_il_ne_se_mesure_pas",
            "filiere.bloc.un_seul_voyant",
            "filiere.sous_titre.la_filiere_s_ecarte_de_son_profil",
            // 4 clés du Journal (spec du Journal back, lot/journal-38 de BACK-4) : panneau « sans texte » et quartier sans nom — DetteDatee, levée au service (ruling f2 12/11).
            "journal.bloc.0_breves_sont_arrivees_sans_leur_texte",
            "journal.bloc.leur_cle_est_montree_a_la_place_du_titre_le_reste_du_journal_est_ecrit",
            "journal.bloc.quartier_0",
            "journal.bloc.une_breve_est_arrivee_sans_son_texte",
            // Écran Loi (LoiResolvers.TexteBoutonRetainer) : « LIBÉRER », bouton d'un avocat sous rétention — AFFICHÉ, ni servi ni en dette (trouvé par la garde de population, B1). Mot RATIFIÉ par f2 le 12/11 : FR = le littéral du code à l'octet,
            // EN « RELEASE » (symétrique de « PUT ON RETAINER » / « METTRE SOUS RÉTENTION », majuscules) ; versé au lot de mots du back. DetteDatee, levée au service sur la pile.
            "loi.bouton.liberer",
            // ㉔ (CLIENT-2) : 17 textes RÉELS de la boîte d'autonomie (en-tête « votre lieutenant », état « Décidé », phrases de résultat), affichables dès qu'un rapport est monté — trouvés par la garde statique de population,
            // servis par BACK-2 dans lot/mots-a-servir (approuvé 34e2ea45, ni fusionné ni déployé). Ruling f2 12/11 : DetteDatee ; LEVÉE au SERVICE SUR LA PILE (pas au SHA de BACK-2).
            "autonomie.entete.votre_lieutenant",
            "autonomie.etat.decide",
            "autonomie.resultat.argent_injecte",
            "autonomie.resultat.argent_injecte_prudemment",
            "autonomie.resultat.c_est_fait",
            "autonomie.resultat.cuisson_affinee",
            "autonomie.resultat.cuisson_lancee",
            "autonomie.resultat.depose",
            "autonomie.resultat.depose_en_reserve",
            "autonomie.resultat.envoi_parti",
            "autonomie.resultat.laisse_tel_quel",
            "autonomie.resultat.mis_en_attente",
            "autonomie.resultat.prefixe",
            "autonomie.resultat.ramassage_fait",
            "autonomie.resultat.repare",
            "autonomie.resultat.reporte",
            "autonomie.resultat.rien_n_a_change",
        };

        /// <summary>REPLI VOULU (décision f2 du 12/11/2026, TD-1068) — des clés dont le repli FR est l'état NORMAL et définitif, pas une dette :
        /// elles ne « partiront » jamais avec le service. Chaque entrée porte sa RAISON. Ce n'est pas un second tiroir de dette : une clé n'y
        /// entre que si elle ne PEUT pas être servie, et une entrée que le catalogue se met à servir rougit (règle (4) : la raison est caduque).</summary>
        internal static readonly Dictionary<string, string> RepliVoulu = new Dictionary<string, string>
        {
            // `EcranEchecDeDemarrage` s'affiche quand le serveur ne répond PAS : le catalogue i18n, qui vient du même serveur, n'a pas pu être chargé.
            { "demarrage.echec.la_partie_n_a_pas_pu_commencer", "écran d'échec de démarrage : le serveur ne répond pas, le catalogue n'est pas chargé" },
            { "demarrage.echec.la_ville_ne_repond_pas_verifiez_votre_connexion_puis_reessayez", "écran d'échec de démarrage : le serveur ne répond pas, le catalogue n'est pas chargé" },
            { "demarrage.echec.reessayer", "écran d'échec de démarrage : le serveur ne répond pas, le catalogue n'est pas chargé" },
            // Repli DÉFENSIF d'une clé servie ailleurs (ruling f2 12/11, BACK-2 a pris la même décision côté back) : la phrase affichée est celle de `roster_room_label_key` / du registre d'erreurs ; ce littéral ne sert que si cette clé manque.
            { "famille.ecran.votre_equipe_est_au_complet", "repli défensif de PhraseDeBlocage : la phrase servie vient de roster_room_label_key" },
            { "famille.ecran.votre_decision_de_structure_d_aujourd_hui_est_prise_reprenez_demain", "repli défensif de PhraseDeBlocage : la phrase servie vient du registre d'erreurs (HostBlocage.CleBudgetDepense)" },
            // Repli COMPTÉ de « Réaffecter… » en ON_COOLDOWN (TD-954, ruling f2 12/11) : la phrase servie arrive par `reassign_availability_label_key`, une clé `famille.reaffectation.*` NOMMÉE PAR LE BACK ; cette clé `famille.ecran.*` n'est que le repli du client, personne ne la servira.
            { "famille.ecran.trop_tot_pour_le_deplacer_a_nouveau", "repli défensif de PhraseDeIndisponibilite : la phrase servie vient de reassign_availability_label_key (clé famille.reaffectation.* nommée par le back)" },
        };

        /// <summary>Un repli sur cette clé ne rougit pas : dette datée (provisoire) OU repli voulu (définitif, motivé). Une seule lecture pour les gardes « hors dette ».</summary>
        internal static bool Toleree(string cle) => cle != null && (DetteDatee.Contains(cle) || RepliVoulu.ContainsKey(cle));

        [Test]
        public void RepliVoulu_ChaqueEntreeASaRaison_NEstPasAussiUneDette_EtUneCleInventeeNEstPasToleree()
        {
            Assert.IsNotEmpty(RepliVoulu, "anti-vacuité");
            foreach (KeyValuePair<string, string> kv in RepliVoulu)
            {
                Assert.IsFalse(string.IsNullOrWhiteSpace(kv.Value), kv.Key + " : un repli voulu sans raison est une dette qui ne dit pas son nom");
                Assert.IsFalse(DetteDatee.Contains(kv.Key), kv.Key + " : repli voulu OU dette datée, jamais les deux");
                Assert.IsTrue(Toleree(kv.Key));
            }
            // CONTRÔLE POSITIF : une clé ni due ni voulue n'est pas tolérée (la garde « hors dette » la verrait)
            Assert.IsFalse(Toleree("sonde.repli.cette_cle_n_est_nulle_part"));
            Assert.IsFalse(Toleree(null));
        }

        /// <summary>Clés que le client ATTEND sans les demander : l'écran n'affiche rien à leur place (arbitrage nommé), donc aucun
        /// repli ne les voit. La règle (3) rougit le jour où l'une est servie. Source : le résolveur qui les nomme, jamais recopiées.</summary>
        // VIDE depuis le 2026-09-26 : les initiales des écussons de ㉙ (conflit.initiale.*) sont servies (pile bfd194bc) et BRANCHÉES
        // (ConflitResolvers.InitialeFamille). Le mécanisme reste : une clé attendue qu'on n'affiche pas encore s'inscrit ici, et la
        // règle (3) rougit le jour où le back la sert.
        private static readonly string[] CleesAttenduesNonBranchees = new string[0];

        /// <summary>Les locataires MESURÉS — écrits à la main (anti-tautologie), et leur couverture vérifiée par réflexion.</summary>
        private static readonly (string nom, Func<AppShell, MonoBehaviour> monter)[] Mesures =
        {
            ("ProfileScreenController",          s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Account.Profile.ProfileScreenController>()),
            ("SettingsScreenController",         s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Account.Settings.SettingsScreenController>()),
            ("CityMapController",                s => s.MonterLocataireEnSurimpression<MafiaCleanCity.CityMap.CityMapController>()),
            ("DistrictInteriorScreenController", s => s.MonterLocataireEnSurimpression<MafiaCleanCity.CityMap.DistrictInteriorScreenController>()),
            ("CompressionScreenController",      s => s.MonterLocataireEnSurimpression<MafiaCleanCity.CoreLoops.Compression.CompressionScreenController>()),
            ("ShopScreenController",             s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Economy.Shop.ShopScreenController>()),
            ("AutonomyInboxController",          s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.Autonomy.AutonomyInboxController>()),
            ("BuildingCardController",           s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.BuildingCardController>()),
            ("CarnetScreenController",           s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.CarnetScreenController>()),
            ("ChaineDApproScreenController",     s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.ChaineDApproScreenController>()),
            ("ConflitScreenController",          s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.ConflitScreenController>()),
            ("DashboardController",              s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.DashboardController>()),
            ("DelegationScreenController",       s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.DelegationScreenController>()),
            ("DemolitionScreenController",       s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.DemolitionScreenController>()),
            ("DistributionScreenController",     s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.DistributionScreenController>()),
            ("ExceptionDetailController",        s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.Exceptions.ExceptionDetailController>()),
            ("ExceptionQueueController",         s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.Exceptions.ExceptionQueueController>()),
            ("FiliereScreenController",          s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.FiliereScreenController>()),
            ("ForensicScreenController",         s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.ForensicScreenController>()),
            ("HorizonScreenController",          s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.HorizonScreenController>()),
            ("JournalScreenController",          s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.JournalScreenController>()),
            ("LieutenantScreenController",       s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.Lieutenant.LieutenantScreenController>()),
            ("LoiScreenController",              s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.LoiScreenController>()),
            ("ReputationScreenController",       s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.ReputationScreenController>()),
            ("DailyReviewScreenController",      s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Shell.DailyReviewScreenController>()),
            // RE-CLASSÉS MESURÉS le 2026-09-23 (CLIENT-2 : ils passent par `Libelle` depuis 1053d271, leurs clés servies à d8e41362) —
            // l'exclusion « aucun site Libelle » était PÉRIMÉE ; la garde doit maintenant les voir à 0 repli sur la pile.
            ("PrecinctScreenController",         s => s.MonterLocataireEnSurimpression<MafiaCleanCity.CitySim.Precinct.PrecinctScreenController>()),
            ("SellingScreenController",          s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.Selling.SellingScreenController>()),
            // ㉑ (CLIENT-1, 11/11) : MESURÉ — tous ses mots passent par `Libelle` ; tant que BACK-3 ne les sert pas, ses replis sont dans la DetteDatee ci-dessus.
            ("MarcheScreenController",           s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.Marche.MarcheScreenController>()),
            // MESURÉ depuis le 2026-09-23 : ses 7 clés `tutoriel.ecran.*` sont servies à e7f52351 (7/7) — l'épingle de son exclusion
            // datée était devenue PÉRIMÉE, comme elle le prévoyait.
            ("TutorialScreenController",         s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Onboarding.TutorialScreenController>()),
        };

        /// <summary>Les locataires NON mesurés, avec leur raison : aucun site `Libelle` à littéral (mesuré par
        /// sites-libelle.py) — leur texte ne passe pas par le catalogue, une garde de repli n'a rien à y compter.</summary>
        private static readonly HashSet<string> ExclusDeclares = new HashSet<string>
        {
            "InspectionScreenController",
            // ⑪ et ⑫ retirés du dépôt le 2026-09-23 (code mort) : leurs exclusions partent avec eux.
            // Precinct et Selling : passés aux MESURÉS le 2026-09-23 (voir la liste Mesures).
            "DecisionDetailScreenController",
        };

        [SetUp]
        public void SetUp() { I18nCatalog.Oublier(); Libelle.RemettreLesCompteurs(); }

        [TearDown]
        public void TearDown()
        {
            LogAssert.ignoreFailingMessages = false;
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            shell = null; shellGo = null;
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
        }

        /// <summary>⛔ COUVERTURE : tout `IShellTenant` concret du jeu est MESURÉ ou EXCLU avec sa raison. Un locataire neuf
        /// rougit ici tant qu'il n'est pas classé — sinon la garde vieillirait en silence, comme `RendreTousLesLibelles`.</summary>
        [Test]
        public void Couverture_ToutLocataireEstMesureOuExcluAvecSaRaison()
        {
            var locataires = AppDomain.CurrentDomain.GetAssemblies()
                .Where(a => !a.FullName.Contains("Tests"))
                .SelectMany(a => { try { return a.GetTypes(); } catch (System.Reflection.ReflectionTypeLoadException e) { return e.Types.Where(t => t != null); } })
                .Where(t => t.IsClass && !t.IsAbstract && typeof(IShellTenant).IsAssignableFrom(t) && typeof(MonoBehaviour).IsAssignableFrom(t)
                            && t.Namespace != null && t.Namespace.StartsWith("MafiaCleanCity"))
                .Select(t => t.Name).ToList();
            Assert.GreaterOrEqual(locataires.Count, 30, $"seulement {locataires.Count} locataires lus par réflexion : le balayage ne mord plus");
            var classes = new HashSet<string>(Mesures.Select(m => m.nom));
            classes.UnionWith(ExclusDeclares);
            CollectionAssert.AreEquivalent(classes, locataires,
                "l'ensemble des locataires du shell a divergé de « mesurés ∪ exclus » : classer le nouveau venu (le mesurer, ou " +
                "l'exclure avec sa raison), retirer le disparu.");
        }

        [UnityTest]
        public IEnumerator ChaqueLocataire_NeRetombeQueSurLaDetteDatee_EtLaDetteNeContientQueDuNonServi()
        {
            LogAssert.ignoreFailingMessages = true;   // réseau et identité du shell : bruit attendu, la mesure est le repli
            shellGo = new GameObject("ShellZeroRepli");
            shell = shellGo.AddComponent<AppShell>();
            float t0 = Time.realtimeSinceStartup;
            while ((!I18nCatalog.Charge || shell.CurrentTab != AppShell.Tab.Empire) && Time.realtimeSinceStartup - t0 < 45f)
                yield return null;
            Assert.IsTrue(I18nCatalog.Charge, "le shell n'a pas amorcé le bundle réel en 45 s — rien de ce qui suit ne vaudrait");
            Assert.Greater(I18nCatalog.NbClesServies, 400, $"le bundle ne sert que {I18nCatalog.NbClesServies} clés : la pile n'a pas l'image à jour");

            var horsDette = new List<string>();
            var appelsParEcran = new Dictionary<string, int>();
            foreach (var (nom, monter) in Mesures)
            {
                Libelle.RemettreLesCompteurs();   // APRÈS le bundle, AVANT la construction : l'écran est compté entier
                MonoBehaviour locataire = monter(shell);
                Assert.IsNotNull(locataire, $"{nom} : le shell n'a rien monté");
                float t = Time.realtimeSinceStartup;
                while (Time.realtimeSinceStartup - t < 3f) yield return null;   // construction + premier chargement réseau
                appelsParEcran[nom] = Libelle.NbAppels;
                foreach (string cle in Libelle.ClesEnRepli)
                    if (!Toleree(cle)) horsDette.Add($"{cle} ({nom})");
                if (locataire != null) Object.DestroyImmediate(locataire.gameObject);
                yield return null;
            }

            // ANTI-VACUITÉ : « aucune clé hors dette » est vrai pour des écrans qui n'ont rien demandé.
            int total = appelsParEcran.Values.Sum();
            Assert.Greater(total, 150, $"seulement {total} clés demandées par {Mesures.Length} écrans — ils ne se sont pas construits : " +
                string.Join(", ", appelsParEcran.Select(kv => kv.Key + "=" + kv.Value)));

            // (1) une clé en repli qui n'est pas dans la dette : NEUVE, et non servie.
            Assert.IsEmpty(horsDette, $"{horsDette.Count} clé(s) en repli HORS de la dette datée — le back ne les sert pas et " +
                "l'écran les affiche en français : " + string.Join(" · ", horsDette));
            // (2) une clé de la dette que le back sert désormais : la retirer (la dette ne fait que rétrécir).
            var devenuesServies = DetteDatee.Where(I18nCatalog.Connait).ToList();
            Assert.IsEmpty(devenuesServies, $"{devenuesServies.Count} clé(s) de la dette SONT servies désormais — les retirer de " +
                "DetteDatee : " + string.Join(" · ", devenuesServies));
            // (4) un REPLI VOULU que le catalogue sert : sa raison (« ne peut pas être servie ») est caduque — le sortir de RepliVoulu, ou trancher.
            var voulusServis = RepliVoulu.Keys.Where(I18nCatalog.Connait).ToList();
            Assert.IsEmpty(voulusServis, $"{voulusServis.Count} clé(s) de RepliVoulu SONT servies — la raison ne tient plus : " + string.Join(" · ", voulusServis));
            // (3) une clé ATTENDUE que le code ne demande pas encore (arbitrage : rien d'affiché tant qu'elle manque) et que le back
            // sert désormais : la BRANCHER. Aujourd'hui : l'initiale des écussons de ㉙ (2026-09-24).
            var attenduesServies = CleesAttenduesNonBranchees.Where(I18nCatalog.Connait).ToList();
            Assert.IsEmpty(attenduesServies, $"{attenduesServies.Count} clé(s) ATTENDUE(S) sont servies — les brancher : " +
                string.Join(" · ", attenduesServies) + ". Mode d'emploi (initiales) : `ConflitResolvers.InitialeFamille` rend " +
                "`Libelle.ParValeur(\"conflit\", \"initiale\", cle, \"\")` ; le test E9 passe de « écusson vide » à « initiale = valeur " +
                "servie » ; R8 est réécrit ; l'entrée sort de CleesAttenduesNonBranchees.");
        }
    }
}
