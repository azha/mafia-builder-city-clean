using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Lieutenant;
using MafiaCleanCity.Operational.Tests;   // AdresseDuBackPlayModeTests.Racines
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Tests
{
    // E-R6 (design retour d'appui v5, §4) — GP, lot C : les SCÉNARIOS qui relèvent la population RÉELLE de boutons, hors réseau, sur les
    // écrans du lot C (inventaire §1 du design). Même squelette que `RetourGpLotAPlayModeTests` / `RetourGpLotBPlayModeTests` : un test par
    // écran / état ; chacun monte l'écran, appelle `RetourGpReleve.Relever` (un seul relevé, un seul verdict par bouton), publie, puis asserte
    //   · aucun rouge (0 / 2 attachements, handle nul, effet sous le plancher, hors cadre) ;
    //   · l'anti-vacuité : N pressables relevés > 0, N LU du relevé (jamais écrit à une valeur devinée) et journalisé.
    // Écrans montés (tous par leur couture `RendrePourTest` / `AllerA` / `…PourTest` existante, jamais par le réseau) :
    //   Lieutenant (7 sites) : organigramme vide, organigramme garni (cuisinier au repos), recrutement déplié, détail ouvert (règles), détail
    //     en dérive (signal + ordre qui expire), repères à brouiller dépliés, éditeur en mode ordre, réaffectation ouverte ;
    //   Carnet (3) : composeur vide, étape « quel ordre », étape « sur quoi », quatre ordres posés, une ligne en main, confirmation servie ;
    //   Conflit (3) : table + hommes + axes, sans gros bras, envoi en route, dernier retour, ordre prêt ; Distribution (3) : repos, aucun relais ;
    //   Loi (3) : roster vide, avocat sous rétention ; Delegation (1) : tableau, confier, reprendre, réserve ; Demolition (1) : global, fiche,
    //   confirmation, parcelle ; Filiere (1) : planque nominale ; Forensic (1) : la porte des pistes.
    //
    // NON MONTÉ — le relevé n'invente rien ; la ligne « couverture sites k / N » (`PublicationGp`) nommera les sites que ces écrans portent :
    // // NON MONTÉ : Operational/Selling/SellingScreenController (`Ramasser` :441, `BoutonDeGeste` :503) — les rangées ne naissent que dans `Rendre()`,
    //    privé, appelé par `Charger()` / `Recharger()` / `Collecter()` seuls (réseau + authentification) ; `Dealers` et `Possedes` ont un setter privé ;
    //    aucune couture `…PourTest`. Monté nu, l'écran n'a aucune rangée, donc aucun de ces deux boutons.
    // // NON MONTÉ : Operational/Autonomy/AutonomyInboxController (`Btn_A` / `Btn_B`, :370) — le bouton « Choose » naît dans `Render()`, privé, appelé
    //    par `LoadReports()` seul (réseau + authentification) ; `Reports` a un setter privé ; aucune couture `…PourTest`.
    // // NON COUVRABLE : Operational/Reputation/ReputationScreenController (`CtaDonnerRegle`, :1429) — `interactable = false` par construction
    //    (arbitrage Q1 du 24/09 : aucun listener, le catalogue des règles n'est pas servi) ; aucun chemin du code ne le rallume. Monté et relevé NON
    //    PRESSABLE (`GP_Reputation_CtaEteint`), jamais « couvert ».
    //
    // Les tests rendent par `RenderTexture` à la résolution des vrais écrans : ils exigent un périphérique graphique (pas `-nographics`).
    // ⚠️ À LIRE AU RUN : le détail de Lieutenant (une feuille qui DÉFILE) porte plus de boutons que la fenêtre n'en montre ; un bouton sous la
    // coupe (hors du masque du défilement) se lit « effet nul » ou « hors cadre » au relevé — c'est un constat de population (le bouton existe,
    // pressable, et n'est pas visible tel quel), à trancher au gate, pas une erreur du montage.
    [Category("RetourAppui")]
    public class RetourGpLotCPlayModeTests
    {
        /// <summary>La résolution à laquelle les vrais écrans se rendent (les captures de contrôle sont à 1080 × 1920).</summary>
        private const int LargeurEcran = 1080, HauteurEcran = 1920;
        /// <summary>L'attente d'un rendu qui détruit puis recrée ses enfants (`Destroy` est DIFFÉRÉ d'une frame : sans attente, la génération
        /// précédente est encore dans l'arbre et serait relevée avec la neuve).</summary>
        private const int FramesDAttente = 3;
        /// <summary>L'adresse d'un port FERMÉ : aucune requête n'aboutit.</summary>
        private const string PortFerme = "http://127.0.0.1:9";

        private readonly List<GameObject> montes = new List<GameObject>();
        private HashSet<GameObject> racinesAvant;
        private Regie regie;

        [SetUp]
        public void Monter()
        {
            racinesAvant = new HashSet<GameObject>(AdresseDuBackPlayModeTests.Racines());
            AdresseDuBack.PoserPourTest(PortFerme);
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
            RegieMouvement.Oublier();
            regie = RegieMouvement.PourTest();   // AVANT le montage : les contrôleurs attachent leurs ambiances à la régie courante
        }

        [TearDown]
        public void Demonter()
        {
            DetruireMontes();
            RegieMouvement.Oublier();
            if (racinesAvant != null)
            {
                foreach (GameObject g in AdresseDuBackPlayModeTests.Racines().Where(g => g != null && !racinesAvant.Contains(g)).ToList())
                    Object.DestroyImmediate(g);   // le Canvas et l'EventSystem créés par un écran nu
                racinesAvant = null;
            }
            CarnetClient.SubstitutPourTest = null;
            JetonDeStructure.OublierPourTest();
            AdresseDuBack.Oublier();
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
        }

        private void DetruireMontes()
        {
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
        }

        private static IEnumerator Attendre(int frames = FramesDAttente)
        {
            for (int i = 0; i < frames; i++) yield return null;
        }

        // ------------------------------------------------------------------------------ le verdict commun
        /// <summary>Publie, puis asserte l'anti-vacuité (N pressables lu du relevé, journalisé) et l'absence de rouge.</summary>
        private static void Verifier(string scenario, List<LigneGp> lignes, List<string> rougesSupplementaires = null)
        {
            PublicationGp.Publier(lignes);
            int n = RetourGpReleve.Pressables(lignes);
            Debug.Log("[GP] " + scenario + " : N pressables relevés = " + n + " sur " + lignes.Count + " boutons montés");
            Assert.Greater(n, 0, scenario + " — anti-vacuité : " + n + " pressable relevé sur " + lignes.Count + " boutons montés");
            List<string> rouges = RetourGpReleve.Rouges(lignes);
            if (rougesSupplementaires != null) rouges.AddRange(rougesSupplementaires);
            Assert.IsEmpty(rouges, scenario + " — " + rouges.Count + " rouge(s) sur " + n + " pressables :\n" + string.Join("\n", rouges));
        }

        private List<LigneGp> Relever(string ecran, string etat, Canvas canvas) =>
            RetourGpReleve.Relever(ecran, etat, canvas.gameObject, canvas, regie, LargeurEcran, HauteurEcran);

        /// <summary>Un bouton nommé est MONTÉ (actif ou non) sous le canvas : la précondition de l'état, lue sur l'arbre, jamais supposée.</summary>
        private static void Monte(Canvas canvas, string etat, string description, System.Func<Button, bool> quel) =>
            Assert.IsTrue(canvas.GetComponentsInChildren<Button>(true).Any(quel), "précondition (" + etat + ") : " + description + " n'est pas monté");

        private static bool SousParent(Button b, string nomDuParent) => b.transform.parent != null && b.transform.parent.name == nomDuParent;

        // ------------------------------------------------------------------------------ montage : un canvas à nous, un écran dessous
        private Canvas NouveauCanvas(string nom)
        {
            var racine = new GameObject(nom + "Canvas", typeof(RectTransform), typeof(Canvas));
            montes.Add(racine);
            Canvas canvas = racine.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            return canvas;
        }

        /// <summary>L'écran `T` monté SOUS un canvas neuf, étiré à lui : un contrôleur nu (hôte à la racine) ne dessinerait rien. Le gabarit des
        /// écrans bâtit sa feuille sous le canvas RACINE de l'hôte (`CanvasRacine.Resoudre`) : le relevé porte donc sur le canvas entier.</summary>
        private T MonterSousCanvas<T>(string nom, out Canvas canvas) where T : Component
        {
            canvas = NouveauCanvas(nom);
            var hote = new GameObject(nom, typeof(RectTransform));
            hote.transform.SetParent(canvas.transform, false);
            var rt = (RectTransform)hote.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one; rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            return hote.AddComponent<T>();
        }

        // ================================================================================ Lieutenant (La Famille)
        private static RosterRow Rang(string id, string nom, string archetype, string etat) => new RosterRow
        {
            lieutenant_id = id, name = nom, archetype = archetype, op_state_band = etat, rule_count_band = "NONE", tenure_bucket = "FRESH",
        };

        /// <summary>Un cuisinier AU REPOS (COOK + IDLE : sa case se touche, elle renvoie à la chaîne d'appro) et un gros bras actif.</summary>
        private static RosterRow[] Roster() => new[]
        {
            Rang("lt-tull", "Lt. Tull", "COOK", "IDLE"),
            Rang("lt-kest", "Lt. Kest", "MUSCLE", "ACTIVE"),
        };

        private static LieutenantBands Bandes(string phase, string fraicheur, bool promouvoir) => new LieutenantBands
        {
            name = "Lt. Tull", archetype = "COOK", granted_role = "executor", mode = "delegated", op_state_band = "ACTIVE", rule_count_band = "FEW",
            tenure_bucket = "ACCLIMATED", script_revision_cost = "COST_1", reassignment_disruption = "DISRUPT_SHORT", role_efficiency_bonus = "BONUS_LOW",
            reassign_availability = "AVAILABLE", drift_phase = phase, script_source = "",
            standing_order = new StandingOrderBandDto { freshness = fraicheur, promotion_suggested = promouvoir },
        };

        /// <summary>La Famille montée SANS `Start` : `Start` lancerait `Boot()` (connexion → réseau, un `Debug.LogError` à l'échec) ; un composant
        /// DÉSACTIVÉ avant sa première frame ne l'appelle jamais, et ses coroutines (lancées par ses gestes) restent permises. Les frames
        /// d'attente servent donc seulement à VIDER les générations détruites (`Destroy` différé).</summary>
        private LieutenantScreenController MonterLieutenant(out Canvas canvas)
        {
            LieutenantScreenController ecran = MonterSousCanvas<LieutenantScreenController>("LieutenantGp", out canvas);
            ecran.enabled = false;
            ecran.ClearRules();   // construit l'écran (EnsureInitialized) — `RendreRosterDepuis` ne l'appelle pas
            return ecran;
        }

        private LieutenantScreenController OuvrirLeDetail(LieutenantBands bandes, out Canvas canvas)
        {
            LieutenantScreenController ecran = MonterLieutenant(out canvas);
            ecran.RendreRosterDepuis(Roster());
            ecran.OpenLieutenant("lt-tull");   // non authentifié : `RefreshBands` rend aussitôt (« Connectez-vous d'abord »), aucun réseau
            ecran.RendreBandesPourTest(bandes);
            Assert.AreEqual("lt-tull", ecran.LastRecruitedId, "précondition : le détail est ouvert");
            return ecran;
        }

        [UnityTest]
        public IEnumerator GP_Lieutenant_OrganigrammeVide()
        {
            LieutenantScreenController ecran = MonterLieutenant(out Canvas canvas);
            ecran.RendreRosterDepuis(new RosterRow[0]);
            yield return Attendre();
            Monte(canvas, "organigramme vide", "le retour de l'en-tête (:1606)", b => b.name == "Retour");
            Monte(canvas, "organigramme vide", "le CTA « Recruter un nouveau lieutenant » (:2887)", b => b.name == "RecruterCta");
            Verifier("Lieutenant/organigramme vide", Relever("Lieutenant", "organigramme vide", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Lieutenant_OrganigrammeGarni()
        {
            LieutenantScreenController ecran = MonterLieutenant(out Canvas canvas);
            ecran.RendreRosterDepuis(Roster());
            yield return Attendre();
            Monte(canvas, "organigramme garni", "un rang de roster (:2732)", b => b.name.StartsWith("RosterRow_"));
            Monte(canvas, "organigramme garni", "la case du cuisinier au repos (:2846)", b => b.name.StartsWith("EquipeSlot_"));
            Verifier("Lieutenant/organigramme garni, cuisinier au repos", Relever("Lieutenant", "organigramme garni, cuisinier au repos", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Lieutenant_RecrutementDeplie()
        {
            LieutenantScreenController ecran = MonterLieutenant(out Canvas canvas);
            ecran.RendreRosterDepuis(new RosterRow[0]);
            ecran.BasculerRecrutement();   // le CTA du bas de l'organigramme : le geste de production
            Assert.IsTrue(ecran.RecrutementDeplie, "précondition : le panneau de recrutement est déplié");
            yield return Attendre();
            Monte(canvas, "recrutement déplié", "le sélecteur d'archétype (:1496)", b => b.name == "Cycle_Archetype");
            Monte(canvas, "recrutement déplié", "le bouton « Recruter » (:1516)", b => b.name == "Action_recruter");
            Verifier("Lieutenant/recrutement déplié", Relever("Lieutenant", "recrutement déplié", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Lieutenant_DetailOuvert_AvecRegles()
        {
            LieutenantScreenController ecran = OuvrirLeDetail(Bandes("DIRECT_ALIGNED", "NONE", false), out Canvas canvas);
            // une règle booléenne (STATE) et une numérique (EVENT) : « Field » / « Cmp » / « Val » / « Action » + ✕ (:3978, :3999)
            ecran.SetRules(new List<RuleRow>
            {
                new RuleRow("STATE", "cook_idle", "==", "true", "EXECUTE_DEFAULT", 10),
                new RuleRow("EVENT", "heat", ">=", "0.5", "PAUSE_OPS", 50),
            });
            Assert.AreEqual(2, ecran.Rules.Count, "précondition : deux règles");
            yield return Attendre();
            Monte(canvas, "détail ouvert", "un cycle de règle (:3978)", b => b.name == "Cycle_Field");
            Monte(canvas, "détail ouvert", "le ✕ d'une règle (:3999)", b => b.name == "Compact_supprimer_la_regle");
            Monte(canvas, "détail ouvert", "« Donner un ordre » (aucun ordre ⇒ offert)", b => b.name == "Action_donner_un_ordre");
            Verifier("Lieutenant/détail ouvert, deux règles", Relever("Lieutenant", "détail ouvert, deux règles", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Lieutenant_DetailEnDerive_OrdreQuiExpire()
        {
            LieutenantScreenController ecran = OuvrirLeDetail(Bandes("DRIFTING", "EXPIRES_SOON", true), out Canvas canvas);
            Assert.IsTrue(ecran.SectionSignalVisible, "précondition : le cadre du signal (dérive) paraît");
            Assert.IsTrue(ecran.SectionOrdreVisible, "précondition : le cadre de l'ordre qui expire paraît");
            Assert.IsTrue(ecran.PromouvoirVisible, "précondition : « En faire la règle » est offert");
            yield return Attendre();
            Verifier("Lieutenant/détail en dérive, ordre qui expire", Relever("Lieutenant", "détail en dérive, ordre qui expire", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Lieutenant_DetailEnDerive_ReperesDeplies()
        {
            LieutenantScreenController ecran = OuvrirLeDetail(Bandes("DRIFTING", "NONE", false), out Canvas canvas);
            Button brouiller = canvas.GetComponentsInChildren<Button>(true).FirstOrDefault(b => b.name == "Action_brouiller_un_repere");
            Assert.IsNotNull(brouiller, "« Brouiller un repère » n'est pas monté");
            brouiller.onClick.Invoke();   // le geste de production : déplie la liste des repères
            yield return Attendre();
            Monte(canvas, "repères dépliés", "un repère à brouiller (:4132)",
                  b => b.name.StartsWith("Action_brouiller_") && b.name != "Action_brouiller_un_repere" && b.gameObject.activeInHierarchy);
            Verifier("Lieutenant/dérive, repères dépliés", Relever("Lieutenant", "dérive, repères dépliés", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Lieutenant_EditeurEnModeOrdre()
        {
            LieutenantScreenController ecran = OuvrirLeDetail(Bandes("DIRECT_ALIGNED", "NONE", false), out Canvas canvas);
            Assert.IsTrue(ecran.DonnerOrdreVisible, "précondition : « Donner un ordre » est offert");
            ecran.OuvrirModeOrdre();   // le geste de production : l'éditeur passe en mode ORDRE (une règle, « Signer l'ordre », les lapses)
            Assert.IsTrue(ecran.ModeOrdre, "précondition : l'éditeur est en mode ordre");
            yield return Attendre();
            Monte(canvas, "mode ordre", "« Signer l'ordre »", b => b.name == "Action_signer_l_ordre");
            Monte(canvas, "mode ordre", "un choix de lapse", b => b.name.StartsWith("Action_lapse_"));
            Verifier("Lieutenant/éditeur en mode ordre", Relever("Lieutenant", "éditeur en mode ordre", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Lieutenant_ReaffectationOuverte()
        {
            LieutenantScreenController ecran = OuvrirLeDetail(Bandes("DIRECT_ALIGNED", "NONE", false), out Canvas canvas);
            ecran.SetToken("jeton-de-test");   // APRÈS l'ouverture : `OpenReassign` exige l'authentification, et aucun appel réseau ne part ensuite
            ecran.OpenReassign();
            Assert.IsTrue(ecran.ReassignConfirmOpen, "précondition : la confirmation de réaffectation est ouverte");
            yield return Attendre();
            Monte(canvas, "réaffectation ouverte", "« Confirmer la réaffectation » (:3050)", b => b.name == "Action_confirmer_la_reaffectation");
            Verifier("Lieutenant/réaffectation ouverte", Relever("Lieutenant", "réaffectation ouverte", canvas));
        }

        // ================================================================================ Carnet
        private static BatimentPossedeDto Bat(string id, string enseigne, string type) => new BatimentPossedeDto
        {
            building = id, operational_type = type, district_name = "La Lisière",
            name_i18n = new NomDeBatimentI18nDto { key = "game.fiction.building.name", @params = new NomDeBatimentParamsDto { enseigne = enseigne } },
        };

        /// <summary>Quatre locaux (type ENTRETIEN) et un itinéraire vers l'un d'eux (type DISTRIBUTION) : cinq cibles, deux types posables.</summary>
        private static Dictionary<string, List<CibleDuCarnet>> Cibles() => ComposeurDuCarnet.CiblesEligibles(
            new[] { Bat("b1", "Outillage Halde", "specialized_lab"), Bat("b2", "Transit Marrek", "distribution_hub"),
                    Bat("b3", "Caves Orme", "stash"), Bat("b4", "Relais Pont", "money_holding") },
            new[] { new RouteSauveeDto { route_id = "r1", destination_building_id = "b2" } }, null, null);

        private CarnetScreenController MonterCarnet(out Canvas canvas)
        {
            CarnetScreenController ecran = MonterSousCanvas<CarnetScreenController>("CarnetGp", out canvas);
            ecran.RendreComposeurPourTest(Cibles());
            return ecran;
        }

        [UnityTest]
        public IEnumerator GP_Carnet_ComposeurVide()
        {
            MonterCarnet(out Canvas canvas);
            yield return Attendre();
            Monte(canvas, "composeur vide", "la puce « Poser un ordre » (:606)", b => b.name == "BoutonPoser");
            Verifier("Carnet/composeur vide", Relever("Carnet", "composeur vide", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Carnet_QuelOrdre()
        {
            CarnetScreenController ecran = MonterCarnet(out Canvas canvas);
            ecran.OuvrirLeComposeur();
            yield return Attendre();
            Monte(canvas, "quel ordre", "un type d'ordre (:578)", b => b.name.StartsWith("BoutonType_"));
            Verifier("Carnet/étape « quel ordre »", Relever("Carnet", "étape « quel ordre »", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Carnet_SurQuoi()
        {
            CarnetScreenController ecran = MonterCarnet(out Canvas canvas);
            ecran.OuvrirLeComposeur();
            ecran.ChoisirType(ComposeurDuCarnet.Entretien);
            Assert.AreEqual(ComposeurDuCarnet.Entretien, ecran.EtapeDuComposeur, "précondition : l'étape « sur quoi » est ouverte");
            yield return Attendre();
            Monte(canvas, "sur quoi", "une cible à choisir (:578)", b => b.name.StartsWith("BoutonChoisir_"));
            Verifier("Carnet/étape « sur quoi »", Relever("Carnet", "étape « sur quoi »", canvas));
        }

        /// <summary>Quatre ordres posés : le carnet peut partir (« Lancer la soirée », :563), chaque ligne se retire (:578) et la cinquième est une puce.</summary>
        private IEnumerator PoserQuatreOrdres(CarnetScreenController ecran)
        {
            foreach (CibleDuCarnet c in Cibles()[ComposeurDuCarnet.Entretien].Take(4)) ecran.Brouillon.Poser(c);
            Assert.AreEqual(4, ecran.Brouillon.Compte, "précondition : quatre ordres posés");
            ecran.FermerLeComposeur();
            yield return Attendre();
        }

        [UnityTest]
        public IEnumerator GP_Carnet_QuatreOrdresPoses()
        {
            CarnetScreenController ecran = MonterCarnet(out Canvas canvas);
            yield return PoserQuatreOrdres(ecran);
            Monte(canvas, "quatre ordres", "« Lancer la soirée » (:563)", b => b.name == "BoutonLancer");
            Monte(canvas, "quatre ordres", "« Retirer » d'une ligne (:578)", b => b.name == "BoutonRetirer");
            Verifier("Carnet/quatre ordres posés", Relever("Carnet", "quatre ordres posés", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Carnet_UneLigneEnMain()
        {
            CarnetScreenController ecran = MonterCarnet(out Canvas canvas);
            yield return PoserQuatreOrdres(ecran);
            ecran.PrendreEnMain(0);   // l'appui long de production : les autres lignes deviennent des cibles de dépôt (:648)
            Assert.AreEqual(0, ecran.LigneEnMain, "précondition : la première ligne est en main");
            yield return Attendre();
            Verifier("Carnet/une ligne en main", Relever("Carnet", "une ligne en main", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Carnet_ConfirmationServie()
        {
            // compose accepté, commit refusé par la confirmation servie (SETTLING_COMPOUND_REQUIRED) : « Y aller quand même » (:578) paraît
            CarnetClient.SubstitutPourTest = (methode, chemin, corps) =>
            {
                if (chemin == "cue-stack/compose") return (200, "{\"payload\":{\"data\":{\"cue_stack_id\":\"c\",\"state\":\"pending\",\"slots\":[]}}}");
                return (409, "{\"payload\":{\"error\":{\"code\":\"SETTLING_COMPOUND_REQUIRED\",\"details\":{\"settling\":[]}}}}");
            };
            CarnetScreenController ecran = MonterCarnet(out Canvas canvas);
            yield return PoserQuatreOrdres(ecran);
            yield return ecran.LancerLaSoiree();
            yield return Attendre();
            Assert.IsTrue(ecran.ConfirmationDemandee, "précondition : la confirmation est demandée");
            Monte(canvas, "confirmation servie", "« Y aller quand même »", b => b.name == "BoutonYAllerQuandMeme");
            Verifier("Carnet/confirmation servie", Relever("Carnet", "confirmation servie", canvas));
        }

        // ================================================================================ Conflit
        private static LieutenantRowDto GrosBras() => new LieutenantRowDto
        {
            lieutenant_id = "lt-kest", name = "Lt. Kest", archetype = "MUSCLE", op_state_band = "IDLE", rule_count_band = "NONE", tenure_bucket = "FRESH",
        };

        private static EngagementDto Envoi(string id, string statut, string issue) => new EngagementDto
        {
            engagement_id = id, target_rival_key = "tarcum",
            target_rival_name_i18n = new RivalNomI18nDto { key = "game.fiction.rival.name", @params = new RivalNomParamsDto { nom = "Tarcum" } },
            status = statut, outcome_bucket = issue, friction_consumed_bucket = issue == null ? null : "low", heat_increment_bucket = issue == null ? null : "medium",
        };

        private ConflitScreenController MonterConflit(string etat, LieutenantRowDto[] hommes, EngagementDto[] envois, out Canvas canvas)
        {
            ConflitScreenController ecran = MonterSousCanvas<ConflitScreenController>("ConflitGp", out canvas);
            ecran.RendrePourTest(new GetLieutenantsResponseDto { lieutenants = hommes }, new GetEngagementsResponseDto { engagements = envois });
            return ecran;
        }

        [UnityTest]
        public IEnumerator GP_Conflit_TableHommesEtAxes()
        {
            // un gros bras, aucun envoi, rien de choisi : les quatre familles (:726), l'homme et les cinq axes (:1142) ; « L'envoyer » est éteint
            MonterConflit("table", new[] { GrosBras() }, new EngagementDto[0], out Canvas canvas);
            yield return Attendre();
            Monte(canvas, "table", "une famille de la table (:726)", b => b.name.StartsWith("Famille_"));
            Monte(canvas, "table", "l'homme à envoyer (:1142)", b => b.name.StartsWith("Homme_"));
            Monte(canvas, "table", "un axe (:1142)", b => b.name.StartsWith("Axe_"));
            Verifier("Conflit/table, hommes et axes", Relever("Conflit", "table, hommes et axes", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Conflit_SansGrosBras()
        {
            MonterConflit("sans gros bras", new LieutenantRowDto[0], new EngagementDto[0], out Canvas canvas);
            yield return Attendre();
            Monte(canvas, "sans gros bras", "« Recruter un nouveau lieutenant » (:1111)", b => b.name == "Recruter");
            Verifier("Conflit/sans gros bras", Relever("Conflit", "sans gros bras", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Conflit_EnvoiEnRoute()
        {
            MonterConflit("envoi en route", new[] { GrosBras() }, new[] { Envoi("e1", "scheduled", null) }, out Canvas canvas);
            yield return Attendre();
            Monte(canvas, "envoi en route", "« Envoyer quelqu'un d'autre » (:1111)", b => b.name == "EnEnvoyerUnAutre");
            Verifier("Conflit/envoi en route", Relever("Conflit", "envoi en route", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Conflit_DernierRetour()
        {
            MonterConflit("dernier retour", new[] { GrosBras() }, new[] { Envoi("e1", "resolved", "hold") }, out Canvas canvas);
            yield return Attendre();
            Monte(canvas, "dernier retour", "« Y retourner » (:1111)", b => b.name == "YRetourner");
            Verifier("Conflit/dernier retour", Relever("Conflit", "dernier retour", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Conflit_OrdrePret()
        {
            ConflitScreenController ecran = MonterConflit("ordre prêt", new[] { GrosBras() }, new EngagementDto[0], out Canvas canvas);
            ecran.ChoisirLieutenant("lt-kest");
            ecran.ChoisirAxe("infrastructure");
            ecran.ChoisirFamille("coil");   // les trois choix faits : « L'envoyer » s'allume (:1111)
            Assert.IsTrue(ecran.EnvoiPossible, "précondition : l'envoi est possible");
            yield return Attendre();
            Monte(canvas, "ordre prêt", "« L'envoyer » (:1111)", b => b.name == "LEnvoyerCeSoir");
            Verifier("Conflit/ordre prêt", Relever("Conflit", "ordre prêt", canvas));
        }

        // ================================================================================ Distribution
        private static CourierDto Coursier(string bande) => new CourierDto
        {
            courier = System.Guid.NewGuid().ToString(), vehicle_type = "FOOT", transit_band = bande, degrading = false, temperature_status = null,
        };

        private static GetOperationalDistributionProjectionResponseDto Projection() => new GetOperationalDistributionProjectionResponseDto
        {
            routes = new[]
            {
                new DistributionRouteDto { route_id = System.Guid.NewGuid().ToString(), sinuosity_bucket = "meandering", river_crossings_count_bucket = "single",
                                           route_state = "active", available_vehicles = new[] { "FOOT" } },
            },
        };

        [UnityTest]
        public IEnumerator GP_Distribution_Repos()
        {
            DistributionScreenController ecran = MonterSousCanvas<DistributionScreenController>("DistributionGp", out Canvas canvas);
            ecran.RendrePourTest(new GetOperationalCouriersResponseDto { couriers = new[] { Coursier("IDLE"), Coursier("IDLE") } }, Projection());
            yield return Attendre();
            Monte(canvas, "repos", "« Acheter un vélo » (:718)", b => b.name == "BoutonAcheterVehicule");
            Monte(canvas, "repos", "« Envoyer » (:827)", b => b.name == "BoutonEnvoyer");
            Verifier("Distribution/repos", Relever("Distribution", "repos", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Distribution_AucunRelaisAvecGeste()
        {
            DistributionScreenController ecran = MonterSousCanvas<DistributionScreenController>("DistributionRelaisGp", out Canvas canvas);
            ecran.MontrerAucunRelaisPourTest(gesteOffert: true);
            yield return Attendre();
            Monte(canvas, "aucun relais", "« Acheter un relais » (:922)", b => b.name == "BoutonAcheterRelais");
            Verifier("Distribution/aucun relais, geste d'achat offert", Relever("Distribution", "aucun relais, geste d'achat offert", canvas));
        }

        // ================================================================================ Loi
        [UnityTest]
        public IEnumerator GP_Loi_RosterVide()
        {
            LoiScreenController ecran = MonterSousCanvas<LoiScreenController>("LoiGp", out Canvas canvas);
            ecran.RendrePourTest(new GetLegalResponseDto { lawyerRoster = new LawyerDto[0], activeCases = new LegalCaseDto[0] });
            yield return Attendre();
            Monte(canvas, "roster vide", "le geste du pied (:238)", b => b.name == "BoutonDuPied");
            Monte(canvas, "roster vide", "une carte de recrutement (:513)", b => b.name.StartsWith("Carte_"));
            Verifier("Loi/roster vide", Relever("Loi", "roster vide", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Loi_AvocatSousRetention()
        {
            LoiScreenController ecran = MonterSousCanvas<LoiScreenController>("LoiAvocatGp", out Canvas canvas);
            ecran.RendrePourTest(new GetLegalResponseDto
            {
                lawyerRoster = new[] { new LawyerDto { lawyerId = "av-1", lawyerLabel = "Maître Norwan", tier = "boutique", retainer = true, activeCaseCount = 0 } },
                activeCases = new LegalCaseDto[0],
            });
            yield return Attendre();
            Monte(canvas, "avocat sous rétention", "le geste de rétention (:366)", b => b.name == "BoutonRetainer");
            Verifier("Loi/avocat sous rétention", Relever("Loi", "avocat sous rétention", canvas));
        }

        // ================================================================================ Delegation
        private static readonly GetLieutenantsResponseDto UnLieutenant =
            new GetLieutenantsResponseDto { lieutenants = new[] { new LieutenantRowDto { lieutenant_id = "lt-1", name = "Lt. Vesk" } } };

        /// <summary>Une charge PRÊTE (SELF + ELIGIBLE), une charge CONFIÉE (DELEGATED), une charge qui n'est pas prête : le tableau offre les trois lectures.</summary>
        private static GetMetaTaskCategoriesResponseDto Charges() => new GetMetaTaskCategoriesResponseDto
        {
            task_categories = new[]
            {
                new TaskCategoryRowDto { category_key = "ROUTE_ASSIGNMENT", category_id = 1, mastery_bucket = "ELIGIBLE", progress_band = "HIGH", delegation_state = "SELF" },
                new TaskCategoryRowDto { category_key = "SUPPLY_SOURCING", category_id = 4, mastery_bucket = "PRACTICED", progress_band = "MEDIUM",
                                         delegation_state = "DELEGATED", delegated_lieutenant_ref = "lt-1" },
                new TaskCategoryRowDto { category_key = "HEAT_MANAGEMENT", category_id = 5, mastery_bucket = "NASCENT", progress_band = "LOW", delegation_state = "SELF" },
            },
            delegated = new DelegatedSummaryDto[0],
        };

        private DelegationScreenController MonterDelegation(out Canvas canvas)
        {
            DelegationScreenController ecran = MonterSousCanvas<DelegationScreenController>("DelegationGp", out canvas);
            ecran.RendrePourTest(Charges(), UnLieutenant, jetonDepense: false);
            return ecran;
        }

        [UnityTest]
        public IEnumerator GP_Delegation_Tableau()
        {
            MonterDelegation(out Canvas canvas);
            yield return Attendre();
            Monte(canvas, "tableau", "la plaque d'une charge (:1528)", b => b.name == "Touche" && b.transform.parent != null && b.transform.parent.name.StartsWith("Plaque_"));
            Monte(canvas, "tableau", "« En confier une » (:1528)", b => b.name == "Touche" && SousParent(b, "Geste"));
            Verifier("Delegation/tableau", Relever("Delegation", "tableau", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Delegation_Confier()
        {
            DelegationScreenController ecran = MonterDelegation(out Canvas canvas);
            ecran.AllerA(DelegationScreenController.EtatEcran.Confier, "ROUTE_ASSIGNMENT");
            yield return Attendre();
            Monte(canvas, "confier", "« La lui confier » (:1528)", b => b.name == "Touche" && SousParent(b, "Geste"));
            Monte(canvas, "confier", "la réplique qui fait défiler les candidats (:1528)", b => b.name == "Touche" && SousParent(b, "Dit"));
            Verifier("Delegation/confier", Relever("Delegation", "confier", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Delegation_Reprendre()
        {
            DelegationScreenController ecran = MonterDelegation(out Canvas canvas);
            ecran.AllerA(DelegationScreenController.EtatEcran.Reprendre, "SUPPLY_SOURCING");   // l'aperçu du coût se lit au réseau : non servi ici
            yield return Attendre();
            Monte(canvas, "reprendre", "« La reprendre quand même » (:1528)", b => b.name == "Touche" && SousParent(b, "Geste"));
            Verifier("Delegation/reprendre, aperçu non lu", Relever("Delegation", "reprendre, aperçu non lu", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Delegation_Reserve()
        {
            DelegationScreenController ecran = MonterDelegation(out Canvas canvas);
            ecran.AllerA(DelegationScreenController.EtatEcran.Reserve);
            yield return Attendre();
            Monte(canvas, "réserve", "le titron de retour (:1528)", b => b.name == "Touche" && SousParent(b, "Titron"));
            Verifier("Delegation/réserve", Relever("Delegation", "réserve", canvas));
        }

        // ================================================================================ Demolition
        private static DistrictBuildingDto Site(string id, int bloc, params string[] lieutenants) => new DistrictBuildingDto
        {
            building = id, block_id = bloc, operational_type = "lab", district_name = "La Lisière", lieutenant_ids = lieutenants,
        };

        /// <summary>Le premier site est LIBRE (c'est lui que la fiche vise), le second est tenu par un lieutenant (sa ligne ne se touche pas).</summary>
        private static DistrictBuildingDto[] Sites() => new[] { Site("b1", 1501), Site("b2", 1502, "lt-1") };

        private DemolitionScreenController MonterDemolition(out Canvas canvas)
        {
            DemolitionScreenController ecran = MonterSousCanvas<DemolitionScreenController>("DemolitionGp", out canvas);
            ecran.RendrePourTest(
                new GetFrictionStateResponseDto { friction_bucket = "strained", penalty_active = true, friction_node_count = 3 },
                new GetFrictionNodesResponseDto { output_value_bucket = "low", friction_load_bucket = "strained", output_to_friction_ratio_bucket = "poor",
                                                  decommission_cost_bucket = "moderate", neighbor_count = 3 },
                new GetFrictionReplacementOptionsResponseDto
                {
                    options = new[]
                    {
                        new ReplacementOptionDto { id = "o1", freed_block_id = 1501, candidate_building_type = "stash", rank = 1 },
                        new ReplacementOptionDto { id = "o2", freed_block_id = 1501, candidate_building_type = "front_shop", rank = 2 },
                    },
                },
                Sites(), jetonDepense: false);
            return ecran;
        }

        [UnityTest]
        public IEnumerator GP_Demolition_Global()
        {
            MonterDemolition(out Canvas canvas);
            yield return Attendre();
            Monte(canvas, "global", "la ligne d'un site libre (:1458)", b => b.name == "Touche" && SousParent(b, "Site_1501"));
            Monte(canvas, "global", "« Voir ce qui coûte le plus » (:1458)", b => b.name == "Touche" && SousParent(b, "Geste"));
            Verifier("Demolition/global", Relever("Demolition", "global", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Demolition_Fiche()
        {
            DemolitionScreenController ecran = MonterDemolition(out Canvas canvas);
            ecran.AllerA(DemolitionScreenController.EtatEcran.Fiche);
            yield return Attendre();
            Monte(canvas, "fiche", "« Le raser » (:1458)", b => b.name == "Touche" && SousParent(b, "Geste"));
            Verifier("Demolition/fiche", Relever("Demolition", "fiche", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Demolition_Confirmation()
        {
            DemolitionScreenController ecran = MonterDemolition(out Canvas canvas);
            ecran.AllerA(DemolitionScreenController.EtatEcran.Demolir);
            yield return Attendre();
            Monte(canvas, "confirmation", "« Confirmer — le raser » (:1458)", b => b.name == "Touche" && SousParent(b, "Geste"));
            Verifier("Demolition/confirmation", Relever("Demolition", "confirmation", canvas));
        }

        [UnityTest]
        public IEnumerator GP_Demolition_Parcelle()
        {
            DemolitionScreenController ecran = MonterDemolition(out Canvas canvas);
            ecran.AllerA(DemolitionScreenController.EtatEcran.Parcelle);
            yield return Attendre();
            Monte(canvas, "parcelle", "« Prendre la première » (:1458)", b => b.name == "Touche" && SousParent(b, "Geste"));
            Verifier("Demolition/parcelle libre, deux offres", Relever("Demolition", "parcelle libre, deux offres", canvas));
        }

        // ================================================================================ Filiere
        [UnityTest]
        public IEnumerator GP_Filiere_PlanqueNominale()
        {
            FiliereScreenController ecran = MonterSousCanvas<FiliereScreenController>("FiliereGp", out Canvas canvas);
            // la planque servie (charge NOMINAL, façade et planque connues) : le geste BLANCHIR est offert au pied (:766)
            ecran.PoserLaPlanquePourTest("NOMINAL", "facade-1", "planque-1");
            ecran.RendrePourTest(
                new LaunderingPipelineDto
                {
                    stages = new[]
                    {
                        new LaunderingStageDto { node = "n1", cleanliness_band = "PARTIAL", terminal = false, has_cash = false },
                        new LaunderingStageDto { node = "n2", cleanliness_band = "CLEAN", terminal = true, has_cash = false },
                    },
                },
                new LaunderingNodesDto
                {
                    nodes = new[] { new LaunderingNodeRefDto { node = "n1", stage_index = 1 }, new LaunderingNodeRefDto { node = "n2", stage_index = 2 } },
                },
                null);
            yield return Attendre();
            Monte(canvas, "planque nominale", "« Blanchir » (:766)", b => b.name == "BoutonBlanchir");
            Verifier("Filiere/planque nominale", Relever("Filiere", "planque nominale", canvas));
        }

        // ================================================================================ Forensic
        [UnityTest]
        public IEnumerator GP_Forensic_PorteDesPistes()
        {
            ForensicScreenController ecran = MonterSousCanvas<ForensicScreenController>("ForensicGp", out Canvas canvas);
            ecran.RendrePourTest(
                new GetForensicResponseDto { audit_risk_bucket = "clean", effluent_visibility_bucket = "visible", lifestyle_alarm_bucket = "quiet" },
                new[]
                {
                    new ActeurDto { actorType = "lawyer", status = "steady", actorRef = "4f21aaaa" },
                    new ActeurDto { actorType = "clerk", status = "nervous", actorRef = "9c07bbbb" },
                });
            yield return Attendre();
            Assert.AreEqual(VueDossier.Pistes, ecran.Vue, "précondition : la vue des pistes (la porte est interactive hors état vide)");
            Monte(canvas, "pistes", "la porte vers les acteurs (:505)", b => b.name == "Fenetre2");
            Verifier("Forensic/pistes, la porte", Relever("Forensic", "pistes, la porte", canvas));
        }

        // ================================================================================ Reputation
        [UnityTest]
        public IEnumerator GP_Reputation_CtaEteint()
        {
            // ⚠️ Le seul `Button` de la Réputation (CtaDonnerRegle) est NON INTERACTIF par construction (arbitrage Q1 du 24/09). Ce test ne peut donc PAS
            // passer par `Verifier` (N pressables > 0 est faux ici, et l'écrire autrement serait ajuster l'assertion pour passer) : il asserte ce qui est
            // vrai — le bouton est MONTÉ et relevé, NON PRESSABLE, sans rouge — et le publie. Le site n'est jamais « couvert ».
            ReputationScreenController ecran = MonterSousCanvas<ReputationScreenController>("ReputationGp", out Canvas canvas);
            ecran.RendrePourTest(new ReputationSurfaceDto
            {
                boss_mirror = new BossMirrorDto { consistency_cue = "aligned", declared_rules = new DeclaredRuleDto[0], portrait_posture = "attentive" },
            });
            yield return Attendre();
            List<LigneGp> lignes = Relever("Reputation", "pied (DONNER UNE RÈGLE)", canvas);
            PublicationGp.Publier(lignes);
            Debug.Log("[GP] Reputation/pied : " + lignes.Count + " bouton(s) monté(s), " + RetourGpReleve.Pressables(lignes) + " pressable(s)");
            Assert.Greater(lignes.Count, 0, "Reputation/pied — anti-vacuité : le bouton du pied est monté et relevé");
            Assert.AreEqual(0, RetourGpReleve.Pressables(lignes),
                "Reputation/pied — le bouton du pied est non interactif (arbitrage Q1) : s'il devient pressable, ce test doit passer par `Verifier`");
            List<string> rouges = RetourGpReleve.Rouges(lignes);
            Assert.IsEmpty(rouges, "Reputation/pied — " + rouges.Count + " rouge(s) :\n" + string.Join("\n", rouges));
        }
    }
}
