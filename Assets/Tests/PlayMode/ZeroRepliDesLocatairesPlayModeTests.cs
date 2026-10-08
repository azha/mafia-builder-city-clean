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
            // B5 (table 79 @f81ad7cb) : l'écran d'échec de démarrage et la ligne de ㉒.
            "demarrage.echec.la_partie_n_a_pas_pu_commencer",
            "demarrage.echec.la_ville_ne_repond_pas_verifiez_votre_connexion_puis_reessayez",
            "demarrage.echec.reessayer",
            "reglages.bloc.votre_partie_vit_sur_cet_appareil_desinstaller_l_appli_l_efface",
            // E2a (08/10) : la ligne « Mouvement réduit » de ⑲ (REUSE du canon `screen_14`, mot du canon « Mouvement réduit ») — clé dérivée,
            // non servie à 83b4f291 ; voir `Tools/juge-donnees/i18n/cles-neuves-e2a-2026-10-08.md`.
            "reglages.bloc.mouvement_reduit",
            // ⚠️ COUPE du 2026-10-08 (créneau CLIENT-2, pile dev avec le lot de mots de f2) : la règle (2) a rougi, 28 clés de la dette SONT servies — retirées : COLLECTE `vente.caisse.bande.*` (6),
            // ㉓ VITRINE `boutique.bloc.*` (2), ⑭ `compression.tension.calm` / `compression.semaine.none`, ㉛ `loi.bouton.lui_trouver_un_avocat` / `loi.bloc.le_commis_d_office_fait_ce_qu_il_peut`,
            // ㉚ `appro.bouton.ca_part_du_compte_tout_de_suite`, et 15 clés `forensic.bloc.*` de ㊴. Restent, non servies : celles ci-dessous.
            // ⑭ LA JAUGE DE TENSION (CLIENT-2, 08/10 ; juge d'ensemble r1, F3 : l'élément héros était absent) : l'onglet « TENSION » et la légende du cadre calme (`.lampe-rouge`, cadres 14-19 de la
            // série 6) — clés dérivées par `Libelle.De("semaine", "bloc", …)`, NON servies à la pile du 08/10 ; f2 les fait servir (FR « Tension » / « vos affaires respirent »). 2 entrées.
            "semaine.bloc.tension", "semaine.bloc.vos_affaires_respirent",
            // ㊳ le pied éteint (CAUSES 3 ET 4, CLIENT-1) : mot de la maquette, clé dérivée, non servie. 1 entrée.
            "journal.bouton.y_preter_attention",
            // ㊴ LE DOSSIER (CLIENT-2, 08/10 ; DESIGN v5.2, cadres 150-151-135) : une clé restante, non servie à la pile du 08/10 (les 15 autres le sont : retirées ci-dessus). Les statuts et types d'acteur
            // sont lus par la VALEUR servie (`forensic.statut.*`, `forensic.acteur.lawyer|clerk`).
            "forensic.enseigne.rien_a_votre_nom",   // le sous-titre de l'enseigne du cadre 135 (sans point) : son rôle propre, la clé bloc.* est celle du texte `.rien`
            // ㊴ Q5 (CLIENT-2, 08/10 ; décision f2 « fr littéral client, en généré ») : la phrase à trou du titre de la piste du train de vie quand le back sert le nom
            // du lieutenant (`lifestyle_lieutenant_name`) — fr `le train de vie de {nom}` · en `{nom}’s lifestyle` ; f2 la fait servir. NE SE RENDRA qu'avec la clé du back.
            "forensic.bloc.le_train_de_vie_de_nom",















        };

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
