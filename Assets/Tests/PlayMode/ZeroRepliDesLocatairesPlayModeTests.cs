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

        /// <summary>DETTE DATÉE : les clés que le code SAIT demander et que le back ne sert pas. **53 → 0** contre la pile reconstruite
        /// sur 368d1420 (2026-09-23, 1112 clés, instantané `Tools/juge-donnees/i18n/string_table-368d1420.ts`) : direct 0, flux A/B/C
        /// 0, et les 53 inscrites toutes servies (y compris les 2 que seule la garde voyait). Histoire : 24 → 26 → 42 → 48 → 53 → 0.
        /// Vide, la garde est un ZÉRO STRICT : tout repli observé rougit, nommé avec son écran. Elle ne se rallonge que par décision
        /// nommée, datée, avec la table qui la mesure.</summary>
        private static readonly HashSet<string> DetteDatee = new HashSet<string>
        {
            // ⑦ LES DEUX DÉCISIONS (2026-09-23) — 28 clés PROPOSÉES par l'atelier (26, page `ecrans-brennar-7-lieutenant.html` ; 41 §4, fd34321c), non
            // ratifiées, NON servies au back d8e41362 (vérifié sur `string_table.ts` à d8e41362 : 0 sur 28). La dette ne fait que
            // rétrécir : la règle (2) rougit dès qu'une est servie, pour la retirer d'ici.
            "famille.ecran.signal",
            "famille.ecran.ordre_permanent",
            "famille.signal.a_l_ecoute",
            "famille.signal.derive",
            "famille.signal.n_ecoute_que_le_terrain",
            "famille.signal.se_recale",
            "famille.ordre.aucun_ordre",
            "famille.ordre.expire_bientot",
            "famille.repere.l_etat_du_terrain",
            "famille.repere.ce_qu_il_reste",
            "famille.repere.l_heure",
            "famille.repere.ce_que_font_les_autres",
            "famille.ecran.il_ecoute_autre_chose_que_vos_ordres",
            "famille.ecran.rappeler_l_ordre_direct",
            "famille.ecran.remettre_l_ecoute_a_zero",
            "famille.ecran.brouiller_un_repere",
            "famille.ecran.ce_qu_il_ecoute_a_la_place",
            "famille.question.en_faire_la_regle",
            "famille.ecran.son_ordre_du_moment_a_tenu_vous_pouvez_le_renouveler_le_retirer_ou_en_faire_sa_regle_par_defaut",
            "famille.ecran.en_faire_la_regle",
            "famille.ecran.renouveler",
            "famille.ecran.retirer",
            "famille.ordre.en_cours",
            "famille.ordre.echu",
            "famille.refus.trop_tot_pour_refaire_ce_geste",
            "famille.refus.il_n_y_a_pas_d_ordre_en_cours",
            "famille.refus.cet_ordre_n_a_pas_encore_fait_ses_preuves",
            "famille.refus.ce_geste_n_est_pas_reconnu",
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
            // RE-CLASSÉS MESURÉS le 2026-09-23 (CLIENT-2 : ils passent par `Libelle` depuis 1053d271, leurs clés servies à d8e41362) —
            // l'exclusion « aucun site Libelle » était PÉRIMÉE ; la garde doit maintenant les voir à 0 repli sur la pile.
            ("PrecinctScreenController",         s => s.MonterLocataireEnSurimpression<MafiaCleanCity.CitySim.Precinct.PrecinctScreenController>()),
            ("SellingScreenController",          s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.Selling.SellingScreenController>()),
        };

        /// <summary>Les locataires NON mesurés, avec leur raison : aucun site `Libelle` à littéral (mesuré par
        /// sites-libelle.py) — leur texte ne passe pas par le catalogue, une garde de repli n'a rien à y compter.</summary>
        private static readonly HashSet<string> ExclusDeclares = new HashSet<string>
        {
            "InspectionScreenController",
            // ⛔ EXCLU AVEC UNE RAISON DATÉE (2026-09-23) : ㉕ passe par l'i18n depuis 049a863e (CLIENT-2), mais ses 7 clés
            //    `tutoriel.ecran.*` (ClesDuTutoriel ci-dessous) ne sont PAS servies avant le back d8e41362 — le mesurer ferait rougir
            //    la garde sur un trou connu du back. La garde VÉRIFIE ce fait à chaque run : le jour où l'une est servie, elle rougit
            //    (« ÉPINGLE PÉRIMÉE ») et dit de le passer aux MESURÉS.
            "TutorialScreenController",
            // ⑪ et ⑫ retirés du dépôt le 2026-09-23 (code mort) : leurs exclusions partent avec eux.
            // Precinct et Selling : passés aux MESURÉS le 2026-09-23 (voir la liste Mesures).
            "DecisionDetailScreenController",
        };

        /// <summary>Les clés de ㉕ (049a863e), NON servies avant le back d8e41362 — la raison DATÉE de l'exclusion du Tutoriel.</summary>
        private static readonly string[] ClesDuTutoriel =
        {
            "tutoriel.ecran.a_decouvrir",
            "tutoriel.ecran.compris",
            "tutoriel.ecran.decochez_le_jour_ou_vous_n_avez_plus_besoin_qu_on_vous_tienne_la_main",
            "tutoriel.ecran.on_vous_explique_encore",
            "tutoriel.ecran.rien_de_nouveau_pour_aujourd_hui",
            "tutoriel.ecran.vous_avez_demande_qu_on_vous_laisse_tranquille",
            "tutoriel.ecran.vous_avez_tout_vu",
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

            // ⛔ LA RAISON DATÉE DE L'EXCLUSION DU TUTORIEL, VÉRIFIÉE : si l'une de ses clés est servie, l'exclusion est PÉRIMÉE.
            var tutorielServies = ClesDuTutoriel.Where(I18nCatalog.Connait).ToList();
            Assert.IsEmpty(tutorielServies, $"ÉPINGLE PÉRIMÉE : {tutorielServies.Count} clé(s) du tutoriel SONT servies désormais — " +
                "passer TutorialScreenController aux MESURÉS et retirer son exclusion : " + string.Join(" · ", tutorielServies));

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
