using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Lieutenant;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // LES REPLIS « INCONNU » (règle f2 du 23/09, mots de l'atelier 28 `26c8e265`) : un joueur ne voit JAMAIS une valeur machine brute
    // ni un littéral hors `Libelle`. Chaque résolveur reçoit un test de COUVERTURE DE DOMAINE : tout le domaine servi est mappé HORS de
    // la branche par défaut, et une valeur fabriquée y tombe bien (contrôle positif). La dérive de domaine se voit ICI, par un test —
    // jamais par l'œil du joueur.
    //   R1  les défauts qui MENTAIENT : « Small » et « Deep » (un cran faux affirmé), « do nothing » (anglais, et une action absente
    //       lue comme une action) ; les comparateurs et actions des règles
    //   R2  la couverture de domaine de chaque résolveur, le domaine LU DANS LE BACK (fichier:ligne cité, HEAD 066adae8) ; la DETTE
    //       (valeurs servies sans mot) est une liste EXACTE — un cran neuf la fait rougir, un mot livré aussi (il faut l'en retirer).
    //       23/09 : les 16 valeurs de la dette ont reçu leurs mots (atelier 29, 7746e0bb) ⇒ DETTE À ZÉRO, couverture complète.
    //   R3  les 11 sentinelles « __inconnu__ » de `RendreTousLesLibelles` n'atteignent jamais un texte affiché
    [Category("Replis")]
    public class ReplisPlayModeTests
    {
        [TearDown] public void OublierLeCatalogue() => I18nCatalog.Oublier();

        /// <summary>La couverture d'un domaine : aucune valeur du domaine ne tombe dans le repli, et la valeur fabriquée y tombe.</summary>
        internal static void Couvre(string nom, IEnumerable<string> domaine, System.Func<string, string> resoudre, string repli,
                                    string fabriquee = "__HORS_DOMAINE__", bool sansBrut = true, string[] dette = null)
        {
            string[] d = domaine.ToArray();
            Assert.Greater(d.Length, 0, $"{nom} : anti-vacuité, le domaine est vide");
            string[] tombent = d.Where(v => resoudre(v) == repli).ToArray();
            string[] attendue = dette ?? new string[0];
            CollectionAssert.AreEquivalent(attendue, tombent, $"{nom} : les valeurs du domaine SERVI qui tombent dans le repli doivent être "
                + $"EXACTEMENT la dette déclarée [{string.Join(", ", attendue)}] — trouvé [{string.Join(", ", tombent)}]. Un cran neuf non "
                + "mappé rougit ici ; un mot livré aussi (le retirer de la dette).");
            Assert.AreEqual(repli, resoudre(fabriquee), $"{nom} : contrôle positif, une valeur fabriquée tombe dans le repli");
            if (!sansBrut) return;   // un domaine dont le mot EST le symbole (les comparateurs : « > » se lit « > »)
            string[] bruts = d.Where(v => resoudre(v) == v).ToArray();
            Assert.IsEmpty(bruts, $"{nom} : valeur(s) rendue(s) BRUTE(S) : " + string.Join(", ", bruts));
        }

        // Les domaines, relevés dans `mafia-back-suite/services/game-back/src` (HEAD 066adae8) — fichier:ligne dans chaque appel.
        private static readonly string[] Types12 = { "front_shop", "cash_safehouse", "stash", "lab", "grow_house", "refinery", "press_house",
            "distribution_hub", "office", "dealer_spot_front", "money_holding", "specialized_lab" };   // db/schema/operational_chain.ts:26-30

        [Test]
        public void R2_CouvertureDeDomaine_LaDetteEstExacte()
        {
            string e = Repli.EtatInconnu, t = Repli.TypeInconnu;
            // ② fiche bâtiment — real_estate/real-estate.projection.service.ts
            Couvre("SetupLabel", new[] { "NOT_CONVERTED", "IN_SETUP", "OPERATIONAL" }, BuildingCardController.SetupLabel, e);            // :84
            Couvre("CoverLabel", new[] { "NONE", "WEAK", "STANDARD", "STRONG" }, BuildingCardController.CoverLabel, e);                  // :87
            Couvre("StructuralLabel", new[] { "OPERATIONAL", "DAMAGED", "REPAIRING", "FAILED" }, BuildingCardController.StructuralLabel, e);                                                                                          // :95
            Couvre("SeizedLabel", new[] { "NONE", "LOW", "MODERATE", "HIGH" }, BuildingCardController.SeizedLabel, e);                  // :98
            Couvre("LabTierLabel", new[] { "NONE", "BASIC", "REFINED", "MASTER" }, BuildingCardController.LabTierLabel, e);                                                                                            // :110
            Couvre("HubTierLabel", new[] { "NONE", "SMALL", "MEDIUM", "LARGE", "MAJOR", "MAX" }, BuildingCardController.HubTierLabel, e);                                                                                            // :129
            Couvre("RaidRiskLabel", new[] { "LOW", "ELEVATED", "HIGH", "IMMINENT" }, BuildingCardController.RaidRiskLabel, e);          // enforcement/raid-tunables.ts:74
            Couvre("RosterLabel", new[] { "NONE", "OPEN", "BUSY", "FULL" }, BuildingCardController.RosterLabel, e);                                                                // distribution/distribution.projection.service.ts:215
            // money_holding/money-holding.projection.service.ts
            Couvre("MoneyHoldingTierLabel", new[] { "NONE", "SMALL", "MEDIUM", "LARGE", "MAJOR", "MAX" },
                BuildingCardController.MoneyHoldingTierLabel, e);                                           // :48
            Couvre("HeldLabel", new[] { "NONE", "LOW", "MODERATE", "HIGH", "MASSIVE" }, BuildingCardController.HeldLabel, e);           // :51
            Couvre("CapacityLabel", new[] { "NONE", "OPEN", "BUSY", "FULL" }, BuildingCardController.CapacityLabel, e); // :54
            Couvre("YieldLabel", new[] { "NONE", "IDLE", "EARNING" }, BuildingCardController.YieldLabel, e);    // :57
            Couvre("TemperatureLabel", new[] { "OPTIMAL_COLD", "MODERATE", "HOT" }, BuildingCardController.TemperatureLabel, e);      // coldchain/cold-chain.service.ts:36
            Couvre("PurityLabel", new[] { "CUT", "STANDARD", "PURE", "CRYSTALLINE" }, BuildingCardController.PurityLabel, e);           // ash/ash-purity.service.ts:40
            Couvre("AppointmentStatusLabel", new[] { "SCHEDULED", "HONORED", "EXPIRED" }, BuildingCardController.AppointmentStatusLabel, e); // ash/ash-appointment.service.ts:41
            Couvre("PayoutLabel", new[] { "PENDING", "NONE", "MODEST", "FAIR", "STRONG", "PREMIUM" }, BuildingCardController.PayoutLabel, e); // :53
            Couvre("GrowStageLabel", new[] { "EARLY", "MID", "LATE", "DONE" }, BuildingCardController.GrowStageLabel, e);             // grow/grow.projection.service.ts:45
            Couvre("HusbandryLabel", new[] { "WITHERED", "ON_TRACK", "THRIVING" }, BuildingCardController.HusbandryLabel, e);         // :49
            Couvre("TypeLabel", Types12, BuildingCardController.TypeLabel, t);
            Couvre("SubstanceLabel", new[] { "BRINDLE", "CRICK", "HUSH", "ASH" }, BuildingCardController.SubstanceLabel, t);          // substance/substance-config.ts:36 (majuscules : production.projection.service.ts:232)
            Couvre("VehicleLabel", new[] { "FOOT", "BIKE", "CAR" }, BuildingCardController.VehicleLabel, t);                          // la fiche : distribution.projection.service.ts:411
            Couvre("GrowablePrecursorLabel", new[] { "verdant_root_extract", "lull_resin", "glass_lily" },
                BuildingCardController.GrowablePrecursorLabel, t);                                                                   // substance-config.ts:292-296

            // Lieutenant ⑥/⑦ — lieutenant/lieutenant.projection.service.ts, lieutenant/tenure-inertia.ts
            Couvre("GrantedRoleLabel", new[] { "advisory", "executor", "delegated_owner", "cohort_overseer" }, LieutenantScreenController.GrantedRoleLabel, t); // :87
            Couvre("RuleCountLabel", new[] { "NONE", "FEW", "MANY" }, LieutenantScreenController.RuleCountLabel, e);                  // :102
            Couvre("RevisionCostLabel", new[] { "COST_1", "COST_2", "COST_3", "COST_MAX" }, LieutenantScreenController.RevisionCostLabel, e); // tenure-inertia.ts:27
            Couvre("DisruptionLabel", new[] { "DISRUPT_SHORT", "DISRUPT_MED", "DISRUPT_LONG", "DISRUPT_MAX" }, LieutenantScreenController.DisruptionLabel, e); // :30
            Couvre("EfficiencyBonusLabel", new[] { "BONUS_NONE", "BONUS_LOW", "BONUS_MID", "BONUS_CAP" }, LieutenantScreenController.EfficiencyBonusLabel, e); // :33
            // Famille. ⚠️ `UNKNOWN` est une valeur SERVIE (lieutenant.projection.service.ts:83) dont le mot EST « Inconnu » : il a le mot du
            // repli par construction, il est donc tenu à part.
            string inconnu = MafiaCleanCity.I18n.Libelle.De("famille", "archetype", "Inconnu");
            Couvre("Archetype", new[] { "COOK", "LOGISTICS", "DISTRIBUTION", "LAUNDERING", "SECURITY", "BOOKKEEPER", "MUSCLE", "INTELLIGENCE",
                "FACILITY_MANAGER" }, FamilleLabels.Archetype, inconnu);                                                             // lieutenant-archetype.ts:38
            Assert.AreEqual(inconnu, FamilleLabels.Archetype("UNKNOWN"));
            Couvre("Mode", new[] { "tasked", "delegated" }, FamilleLabels.Mode, MafiaCleanCity.I18n.Libelle.De("famille", "mode", "Mode inconnu")); // :91
            Couvre("Etat", new[] { "SETTLING", "PAUSED", "ACTIVE", "IDLE" }, FamilleLabels.Etat, e);                                  // :98
            Couvre("Anciennete", new[] { "FRESH", "ACCLIMATED", "SEASONED", "SENIOR", "ENTRENCHED" }, FamilleLabels.Anciennete, e);    // tenure-inertia.ts:24

            // Chrome
            Couvre("HeatBucketResolver", new[] { "COLD", "WARM", "HOT", "BURNING" }, HeatBucketResolver.Label, e);                     // citysim/events/city-event-bus.ts:484
            Couvre("DayPhaseResolver", new[] { "DAWN", "DAY", "DUSK", "NIGHT" }, DayPhaseResolver.Label, e);                           // citysim/day-phase-quarter.ts:45
            Couvre("WalletBandResolver", new[] { "BROKE", "LOW", "MODERATE", "HIGH", "FLUSH" }, WalletBandResolver.Label, e);          // economy/economy.projection.service.ts:46
            Couvre("LibellesDecision.Portee", new[] { "minor", "moderate", "major" }, LibellesDecision.Portee, e);                      // progression/loop10/hl-card-projection.ts:44
            Couvre("LibellesDecision.Urgence", new[] { "low", "elevated", "pressing" }, LibellesDecision.Urgence, e);                  // :46
            Couvre("LibellesBatiment.Type", Types12, LibellesBatiment.Type, t);
            Couvre("TissuDeDistrict.Valeur", new[] { "tidewater", "spine", "lattice", "stack", "glass", "verge" }, TissuDeDistrict.Valeur, t); // db/schema/world_geography.ts:14-21
            Couvre("TissuDeDistrict.EnLigne", new[] { "tidewater", "spine", "lattice", "stack", "glass", "verge" }, TissuDeDistrict.EnLigne, t);

            // Distribution — operational/distribution
            Couvre("TexteChemin", new[] { "direct", "meandering", "gnarled" }, DistributionResolvers.TexteChemin, e);                  // route-finder.service.ts:199
            Couvre("TexteTraverser", new[] { "none", "single", "multiple" }, DistributionResolvers.TexteTraverser, e);                // distribution.projection.service.ts:79
            Couvre("TexteRouteState", new[] { "draft", "active", "saturated", "severed" }, DistributionResolvers.TexteRouteState, e);                                                                   // route.service.ts:56
            Couvre("TexteTransitBand", new[] { "IDLE", "IN_TRANSIT", "ARRIVED" }, DistributionResolvers.TexteTransitBand, e);          // distribution.projection.service.ts:200
            Couvre("TexteVehicule", new[] { "FOOT", "BIKE", "CAR", "REFRIGERATED_VAN" }, DistributionResolvers.TexteVehicule, t);      // db/schema/operational_chain.ts:47
            Couvre("NomTypeBatiment", Types12, DistributionScreenController.NomTypeBatiment, Repli.LeBatiment);

            // Chaîne d'appro — operational/precursors ; Loi ; Démolition ; Forensic
            Couvre("TextePrix", new[] { "UP", "STABLE", "DOWN" }, ChaineDApproResolvers.TextePrix, e);                                 // precursor-market.service.ts:67
            Couvre("TexteStock", new[] { "NONE", "LOW", "MEDIUM", "HIGH" }, ChaineDApproResolvers.TexteStock, e);                                                                           // precursors.projection.service.ts:36
            Couvre("TierLabelCourt", new[] { "public_defender", "boutique", "corruption_pipeline" }, LoiResolvers.TierLabelCourt, t);                                                                                 // legal/legal.types.ts:39
            Couvre("NomDeType", Types12, DemolitionResolvers.NomDeType, Repli.UnBatiment);
            Couvre("Forensic.Phrase", new[] { "clean", "watched", "flagged", "audited", "clear", "faint", "visible", "glaring",
                "quiet", "noticed", "subpoenaed" }, ForensicResolvers.Phrase, e);                                                    // forensic/forensic.projection.service.ts:79, :98, :118
        }

        /// <summary>R3 — `RendreTousLesLibelles` appelle chaque résolveur avec la SENTINELLE « __inconnu__ » pour exercer son repli (et
        /// faire demander sa clé à la garde de catalogue). Une sentinelle est un artefact de CODE : elle ne doit jamais atteindre un texte
        /// affiché — ni telle quelle, ni en casse de titre.</summary>
        [Test]
        public void R3_LesSentinellesNAtteignentJamaisUnTexteAffiche()
        {
            const string sentinelle = "__inconnu__";
            System.Func<string, bool> fuit = rendu => rendu != null
                && rendu.IndexOf("inconnu__", System.StringComparison.OrdinalIgnoreCase) >= 0;
            Assert.IsTrue(fuit(sentinelle), "contrôle positif : la sentinelle brute est détectée");
            Assert.IsTrue(fuit("  __Inconnu__"), "contrôle positif : même retouchée");
            Assert.IsFalse(fuit(Repli.EtatInconnu), "contrôle négatif : le mot de la famille ne fuit pas");

            var resolveurs = new (string nom, System.Func<string, string> f)[]
            {
                ("FamilleLabels.Archetype", FamilleLabels.Archetype), ("GrantedRoleLabel", LieutenantScreenController.GrantedRoleLabel),
                ("FamilleLabels.Mode", FamilleLabels.Mode), ("FamilleLabels.Etat", FamilleLabels.Etat),
                ("RuleCountLabel", LieutenantScreenController.RuleCountLabel), ("TenureBucketLabel", LieutenantScreenController.TenureBucketLabel),
                ("RevisionCostLabel", LieutenantScreenController.RevisionCostLabel), ("DisruptionLabel", LieutenantScreenController.DisruptionLabel),
                ("EfficiencyBonusLabel", LieutenantScreenController.EfficiencyBonusLabel), ("CategoryLabel", LieutenantScreenController.CategoryLabel),
                ("BandLabel", LieutenantScreenController.BandLabel),
            };
            Assert.AreEqual(11, resolveurs.Length, "les 11 sentinelles de `RendreTousLesLibelles`");
            string[] fuites = resolveurs.Where(r => fuit(r.f(sentinelle))).Select(r => $"{r.nom} → « {r.f(sentinelle)} »").ToArray();
            Assert.IsEmpty(fuites, "une sentinelle atteint un texte affiché : " + string.Join(" · ", fuites));
        }

        [Test]
        public void R1_LesDefautsQuiMentaient()
        {
            string etat = Repli.EtatInconnu, type = Repli.TypeInconnu;
            Assert.AreEqual("état inconnu", etat);
            Assert.AreEqual("type inconnu", type);

            // Les quatre paliers du sélecteur (le domaine est CELUI DU CLIENT : `TransferAmountStepsCents`, c'est lui qui les propose).
            Couvre("TransferAmountLabel", BuildingCardController.TransferAmountStepsCents.Select(c => c.ToString()),
                v => BuildingCardController.TransferAmountLabel(int.Parse(v)), etat, "5");
            Assert.AreNotEqual("Small", BuildingCardController.TransferAmountLabel(5), "« Small » affirmait un palier faux");

            // Les passes d'affinage : 0 … `MaxRefiningPassesUi` (3, le défaut serveur `production.ash.max_refining_passes`).
            Couvre("RefiningPassesLabel", Enumerable.Range(0, BuildingCardController.MaxRefiningPassesUi + 1).Select(i => i.ToString()),
                v => BuildingCardController.RefiningPassesLabel(int.Parse(v)), etat, "4");
            Assert.AreEqual(etat, BuildingCardController.RefiningPassesLabel(-1));

            // Les comparateurs : `CompareOp` du back (`services/game-back/src/dsl/ast.ts:24` : < <= = != >= >), plus l'alias `==` que son
            // parseur accepte (`dsl/parser.service.ts:71`). ⚠️ `=` n'était PAS mappé : la forme canonique du back sortait brute.
            Couvre("ComparatorWord", new[] { "<", "<=", "=", "==", "!=", ">=", ">" }, RuleModel.ComparatorWord, type, sansBrut: false);
            Assert.AreEqual("—", RuleModel.ComparatorWord(""), "absent : un tiret");

            // Les actions : celles que l'éditeur PROPOSE (`RuleModel.Actions`), les seules qu'une règle du client peut porter.
            Couvre("ActionWord", RuleModel.Actions, RuleModel.ActionWord, type);
            Assert.AreEqual("—", RuleModel.ActionWord(null), "absente : un tiret, plus « do nothing » (une action affirmée, en anglais)");
            Assert.AreEqual("—", RuleModel.ActionWord("  "));

            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string>
                { { "commun.repli.etat_inconnu", "unknown state" }, { "commun.repli.type_inconnu", "unknown type" } });
            Assert.AreEqual("unknown state", BuildingCardController.TransferAmountLabel(5), "la clé servie l'emporte");
            Assert.AreEqual("unknown type", RuleModel.ActionWord("FLEE"));
        }
    }
}
