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

        /// <summary>DETTE DATÉE : les clés que le code SAIT demander et que le back ne sert pas — mesurée contre la pile 83b4f291
        /// (2026-09-23), sur ce que le code peut rendre et non sur l'état du compte au moment du run : 42 clés = UNION de
        /// `sites-libelle.py` (littéraux directs : 0), `sites-libelle-flux.py` (littéraux ASSIGNÉS à la variable passée, ou
        /// passés en PARAMÈTRE : 40) et de ce que CETTE garde a vu au rendu (30, dont 2 qu'aucun statique ne voit encore).
        /// Pourquoi l'union : une dette mesurée au seul run dépend de l'état du compte — Distribution rendait « en route »
        /// à 01:34 et « livré » à 01:42, 4 clés de plus. Écrans : Appro, Distribution, Filière, Loi.
        /// Elle ne s'allonge que par décision nommée ; elle RÉTRÉCIT quand le back sert (règle 2).</summary>
        private static readonly HashSet<string> DetteDatee = new HashSet<string>
        {
            "appro.bloc.a_quoi_ca_sert",
            "appro.bloc.ce_qu_il_en_reste",
            "appro.bloc.des_maillons_existent_mais_cet_ecran_ne_sait_pas_encore_les_afficher",
            "appro.bloc.la_commande",
            "appro.bloc.le_fournisseur",
            "appro.bloc.le_prix",
            "appro.bloc.nestor_l_etagere_est_vide_sans_pyralin_je_ne_rallume_pas",
            "appro.bloc.rien_a_remonter_pour_l_instant_la_chaine_ne_connait_aucun_maillon_sur_ce_compte",
            "appro.bloc.votre_lieutenant_on_en_a_besoin_et_il_n_y_en_a_plus",
            "appro.sous_titre.elle_est_payee_et_partie_il_n_y_a_plus_qu_a_attendre",
            "appro.sous_titre.le_stock_est_reconstitue_vous_pouvez_commander_a_nouveau",
            "appro.sous_titre.sans_elle_aucun_labo_ne_rallume_le_fournisseur_lui_a_ses_humeurs",
            "appro.titre.commander_de_la_matiere_premiere",
            "appro.titre.la_commande_est_arrivee",
            "appro.titre.la_commande_est_en_route",
            "distribution.bloc.a_traverser",
            "distribution.bloc.cette_route",
            "distribution.bloc.d_ou_ca_part",
            "distribution.bloc.il_est_parti_a_la_nuit_ca_serpente_mais_c_est_la_seule_qui_evite_le_pont_du_threnny",
            "distribution.bloc.la_marchandise_est_prete_au_labo_dites_moi_qui_part_et_par_ou_et_je_l_enverrai_ce_soir",
            "distribution.bloc.le_chemin",
            "distribution.bloc.livre_le_carton_est_au_comptoir_personne_n_a_rien_vu",
            "distribution.bloc.ou_ca_va",
            "distribution.bouton.envoyer_ce_soir",
            "distribution.bouton.tendre_une_autre_ficelle",
            "distribution.sous_titre.la_marchandise_est_arrivee_voila_ce_que_le_trajet_a_coute_a_la_route",
            "distribution.sous_titre.on_choisit_d_ou_ca_part_ou_ca_va_et_par_quel_chemin",
            "distribution.sous_titre.un_coursier_est_parti_voila_le_chemin_qu_il_prend",
            "distribution.titre.c_est_livre",
            "distribution.titre.ce_qui_est_sur_la_route",
            "distribution.titre.l_envoi_de_ce_soir",
            "filiere.bloc.chaque_etape_rend_l_argent_un_peu_plus_propre_que_la_precedente_seule_la_derniere_credite_le_portefeuille_tant_qu_il_n_y_a_pas_de_sortie_il_n_y_a_pas_d_argent_seulement_une_file_d_attente",
            "loi.badge.a_vos_risques",
            "loi.badge.disponible",
            "loi.badge.en_place",
            "loi.bloc.ca_coute_cher_et_ca_peut_se_retourner",
            "loi.bloc.ca_coute_il_connait_les_juges",
            "loi.bloc.commis_d_office",
            "loi.bloc.gratuit_il_fait_ce_qu_il_peut",
            "loi.bloc.la_filiere",
            "loi.bloc.un_cabinet",
            "loi.bouton.mettre_sous_retention",
            // + 6 (2026-09-23 ~03:00) : apportées par le merge de CLIENT-2 (b909fbae, ⑨/⑩), non servies par 83b4f291 ;
            //   `rien_a_relire` vue par la garde (partie 1 de 02:44), les 6 par sites-libelle.py sur l'arbre fusionné.
            "exception_detail.bloc.appui_long_la_carte_se_ferme",
            "exception_detail.bloc.appui_long_la_carte_se_ferme_le_batiment_lui_se_repare_avec_le_temps",
            "exception_detail.bloc.je_fais_quoi",
            "exceptions.bloc.ce_soir_au_verge_d_or",
            // ⑨-6e (CLIENT-2 1d9a6704, 23/09) : la concaténation devient un gabarit {nom} — `retourne_au_travail` n'est plus
            //   demandée ; `nom_retourne_au_travail` la remplace (non servie par 83b4f291). ⚠️ Elle passe par
            //   `ExceptionBandes.Gabarit`, qui lit le catalogue SANS `Libelle` : la règle (1) ne VOIT PAS son repli ; seule la
            //   règle (2) la tient (rouge quand le back la servira). Trou de la garde, signalé, pas corrigé ici.
            "exceptions.bloc.nom_retourne_au_travail",
            "exceptions.bloc.rien_a_relire",
        };

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
        };

        /// <summary>Les locataires NON mesurés, avec leur raison : aucun site `Libelle` à littéral (mesuré par
        /// sites-libelle.py) — leur texte ne passe pas par le catalogue, une garde de repli n'a rien à y compter.</summary>
        private static readonly HashSet<string> ExclusDeclares = new HashSet<string>
        {
            "InspectionScreenController", "PrecinctScreenController", "TutorialScreenController", "LaunderingController",
            "PipelineOverviewController", "SellingScreenController", "DecisionDetailScreenController",
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
        }
    }
}
