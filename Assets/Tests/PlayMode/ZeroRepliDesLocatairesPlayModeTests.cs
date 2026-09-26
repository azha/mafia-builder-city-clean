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
            // ⚠️ COUPE du 2026-09-24 contre la pile 66060cc1 : les 22 clés de ⑦ (famille.*) SERVIES (règle 2 rouge au créneau, tête
            // 92bfb1ba ; vérifié sur string_table.ts à 66060cc1 : 22 sur 22, fr et en) — retirées. Dette VIDE : zéro strict.
            // ⚠️ RALLONGÉE le 2026-09-26 — B3 de la passe UX (CLIENT-2) : les 11 mots des gestes de ㉟ (mots de l'atelier, table 62,
            // client 2648d19d — replis alignés à l'octet) (poster un dealer, acheter un
            // point de vente), NEUFS, non servis à la tête back 5e792a3c. Table : `Tools/juge-donnees/i18n/cles-neuves-b3-2026-09-26.md`
            // (fr ; en et mots définitifs à l'atelier et au back). La règle (2) les retire dès qu'elles sont servies.
            "vente.geste.un_dealer_tient_ce_point_de_vente",
            "vente.geste.le_dealer_n_a_pas_ete_poste",
            "vente.geste.aucun_bloc_libre_dans_votre_quartier",
            "vente.geste.point_de_vente_achete_ouvrez_le_depuis_sa_fiche",
            "vente.geste.l_achat_n_a_pas_abouti",
            "vente.vide.aucun_dealer_au_travail",
            "vente.geste.point_de_vente_sans_dealer",
            "vente.geste.poster_un_dealer",
            "vente.geste.vous_n_avez_aucun_point_de_vente",
            "vente.geste.acheter_un_point_de_vente",
            "vente.geste.coute_de_l_argent_et_la_decision_de_structure_de_cette_session_il_faudra_ensuite_l_ouvrir_depuis_sa_fiche",
            // + 2 le 2026-09-26 : l'addendum de l'atelier (table 62) keye les deux littéraux bruts de l'état vide de ㉟.
            "vente.vide.les_coins_de_vente_n_ont_pas_repondu",
            "vente.vide.aucun_coin_de_vente",
            // ⚠️ RALLONGÉE le 2026-09-26 — C8 (CLIENT-2) : ㉞ montre « Ce qui arrive » (calendrier politique servi). Les 5 mots du panneau,
            // table 65 de l'atelier (20d9be5f), NON servis @5e792a3c. Les noms d'événements sont SERVIS (`political.event.E-POL-*`) :
            // aucune dette pour eux.
            "carnet.bloc.ce_qui_arrive",
            "carnet.bloc.le_calendrier_n_a_pas_repondu",
            "carnet.bloc.rien_n_est_annonce",
            "carnet.bloc.en_cours",
            "carnet.bloc.annonce",
            // ⚠️ RALLONGÉE le 2026-09-26 — états vides de la passe UX (CLIENT-2), mots de l'atelier table 63 (client 8979d626), PROPOSÉS,
            // non servis @5e792a3c. Retirées par la règle (2) dès qu'elles sont servies.
            "police.vide.le_commissariat_n_a_encore_rien_sur_vous",
            "police.vide.tant_que_vous_ne_faites_pas_de_bruit_ca_peut_durer",
            "filiere.vide.votre_planque_enseigne_est_vide",
            "filiere.vide.l_argent_y_entre_quand_vous_ramassez_la_caisse_d_un_dealer",
            // ㉝ : tables 63 (état light, compte accordé) et 64 (les 4 répliques, {nom} = le lieutenant réel), non servies @5e792a3c.
            "demolition.vide.rien_ne_se_gene_vos_sites_tournent_sans_se_marcher_dessus",
            "demolition.vide.rien_a_raser_pour_l_instant",
            "demolition.ecran.n_endroits_se_genent",
            "demolition.dit.on_a_trop_de_choses_au_meme_endroit_il_va_falloir_en_enlever_une",
            "demolition.dit.celui_la_on_le_garde_par_habitude_il_gene_les_voisins_et_il_ne_rend_presque_rien",
            "demolition.dit.trop_tard_pour_celle_la",
            "demolition.dit.deux_propositions_la_premiere_est_mieux_placee_elles_ne_resteront_pas_sur_la_table",
            // ㉚ : table 63 (tous les maillons silencieux), non servie @5e792a3c. (La réplique du labo, elle, est SERVIE : pas de dette.)
            "appro.vide.rien_ne_circule_encore_vos_maillons_attendent_une_premiere_commande",
            // ㉘ : table 63 (aucun relais possédé), non servies @5e792a3c.
            "distribution.vide.pas_encore_de_relais",
            "distribution.vide.sans_relais_rien_ne_part_c_est_de_la_que_vos_coursiers_livrent",
            "distribution.vide.un_relais_s_achete_sur_un_bloc_libre_puis_s_ouvre_depuis_sa_fiche",   // addendum 63 : remplace la reconversion
            // table 63 v2 (client 34beb6e7), non servies @5e792a3c.
            "inspection.vide.aucune_inspection_en_cours",   // addendum 63 : remplace « rien à faire ici »
            "revue.vide.vos_lieutenants_n_ont_encore_rien_a_tenir_donnez_leur_une_premiere_regle",
            "autonomie.vide.aucun_rapport_pour_l_instant_il_en_viendra_quand_vous_aurez_confie_une_tache_a_un_lieutenant",
            "famille.vide.au_repos_rien_a_cuire_pour_l_instant",
            "famille.vide.commandez_de_la_matiere_depuis_la_chaine_d_appro",
            "tutoriel.vide.une_premiere_lecon_vous_attend",
            "famille.ecran.recruter_archetype",
            "famille.ecran.nouvelle_recrue_archetype",
            "profil.etat.active",
            "profil.langue.fr",
            "profil.langue.en",
            "boutique.bloc.bientot",
            // ㉓ : table 69 (client 06a500d4), non servies @bfd194bc — mesuré au créneau du 26/09 (BundleReel monte la VRAIE vitrine).
            // boutique.bloc.pas_assez_de_marks n'y figure pas : le compte de mesure a un solde nul, seul « plus aucun Mark » s'affiche.
            "boutique.bloc.n_marks",
            "boutique.bloc.donne_n_marks",
            "boutique.bloc.bonus_de_marks_par_euro",
            "boutique.bloc.plus_aucun_mark_et_rien_n_en_redonne",
            "boutique.sku.marks_pack_small",
            "boutique.sku.marks_pack_med",
            "boutique.sku.marks_pack_large",
            "boutique.sku.marks_pack_xl",
            "boutique.sku.cosm_callsign_color",
            "boutique.sku.cosm_dashboard_theme_1",
            "boutique.sku.save_slot_2",
            "boutique.sku.save_slot_3",
            "boutique.sku.support_pack",
        };

        /// <summary>Clés que le client ATTEND sans les demander : l'écran n'affiche rien à leur place (arbitrage nommé), donc aucun
        /// repli ne les voit. La règle (3) rougit le jour où l'une est servie. Source : le résolveur qui les nomme, jamais recopiées.</summary>
        private static readonly string[] CleesAttenduesNonBranchees =
            MafiaCleanCity.Operational.ConflitResolvers.DomaineFamilles.Select(MafiaCleanCity.Operational.ConflitResolvers.CleInitiale).ToArray();

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
                    if (!DetteDatee.Contains(cle)) horsDette.Add($"{cle} ({nom})");
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
