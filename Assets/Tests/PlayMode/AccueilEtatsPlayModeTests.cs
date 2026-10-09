using System.Linq;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Operational.Exceptions;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    /// <summary>④ L'ACCUEIL — la MÉCANIQUE des états de la maquette (atelier 25 §2.2, `ecrans-brennar-accueil.html`), sans figer le visuel
    /// (non ratifiée). Gardes de VALEUR par état, sur des corps fabriqués (pas de réseau) :
    /// 1. rien à trancher — « Rien à signaler », « Aucune décision en attente », l'ambiance « Personne ne fait la queue » (63 v2) ;
    /// 2. une carte de tête — ses deux options SERVIES en TEXTE sous « Ce qu’on peut faire », JAMAIS sur un bouton (mesuré par le back :
    ///    descriptives, commit ne fait aucun effet — `hl-card-types.ts:99-102`) ; bouton [Prendre acte] (table 45 ; [Pas maintenant] RETIRÉ le 08/10) ;
    /// 3. des rapports à lire — [Lire maintenant] OUVRE les rapports sans tampon ([Laisser en attente] = skip, RETIRÉ le 08/10) ;
    /// 4. la file sous pression — la ligne `backlog_badge` ;
    /// 5. la suivante sous la carte — queue[0] : « {nom} attend vos ordres · gravité · trancher ».</summary>
    [Category("EcranAccueil")]
    public class AccueilEtatsPlayModeTests
    {
        private GameObject hote;

        [TearDown]
        public void TearDown()
        {
            if (hote != null) Object.DestroyImmediate(hote);
            hote = null;
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
        }

        private T Monter<T>() where T : Component
        {
            hote = new GameObject(typeof(T).Name, typeof(RectTransform));
            return hote.AddComponent<T>();
        }

        private static HlCardDto Carte(string type, string opt0, string opt1) => new HlCardDto
        {
            card_id = "carte-1", decision_type_key = type, impact_bucket = "moderate", urgency_bucket = "low", structural = false,
            options = new[] { new DecisionOptionDto { label = opt0 }, new DecisionOptionDto { label = opt1 } },
        };

        [Test]
        public void Etat1_RienATrancher_LaCarteEtLaFileDisentLeCalme()
        {
            var hl = Monter<HighestLeverageCardController>();
            hl.SetPayload(null, null, null);
            Assert.AreEqual(HighestLeverageCardController.CardState.NoCard, hl.RenderedState);
            Assert.IsTrue(hl.RenderedTexts.Contains(MafiaCleanCity.I18n.Libelle.De("accueil", "carte", "Rien à signaler")));
            Assert.IsTrue(hl.RenderedTexts.Contains(MafiaCleanCity.I18n.Libelle.De("accueil", "carte", "Aucune décision en attente")));
            Assert.IsEmpty(hl.OptionsRendues, "sans carte, aucune recommandation");
            Object.DestroyImmediate(hote);

            var file = Monter<ExceptionQueuePanelController>();
            file.SetQueue("jeton", new ExceptionCardDto[0]);
            Assert.AreEqual(ExceptionQueueController.AmbianceVide(), file.TexteAmbiance, "file vide : la phrase de ⑨, servie");
            Assert.IsNull(file.TexteSuivante, "file vide : pas de suivante");
        }

        [Test]
        public void Etat2_CarteDeTete_LesOptionsSontUneRecommandation_JamaisUnBouton()
        {
            var hl = Monter<HighestLeverageCardController>();
            var carte = Carte("DAMAGED_BUILDING", "hl.option.damaged_building.repair_via_queue", "hl.option.damaged_building.leave_damaged");
            hl.SetPayload(null, carte, null);
            Assert.AreEqual(HighestLeverageCardController.CardState.Available, hl.RenderedState);
            string agir = MafiaCleanCity.I18n.Libelle.Gabarit(carte.options[0].label, "—");
            string laisser = MafiaCleanCity.I18n.Libelle.Gabarit(carte.options[1].label, "—");
            CollectionAssert.AreEqual(new[] { agir, laisser }, hl.OptionsRendues.ToList(), "les deux options SERVIES, dans l'ordre");
            CollectionAssert.DoesNotContain(hl.LibellesDesBoutons.ToList(), agir, "le bouton du tampon ne porte PAS l'option : elle ne fait rien");
            CollectionAssert.DoesNotContain(hl.LibellesDesBoutons.ToList(), laisser, "aucun bouton ne porte l'option non plus");
            // Table 45 : le bouton dit ce qu'il FAIT. [Pas maintenant] (= skip) est RETIRÉ (f2 08/10 nuit : un geste mort, la carte restait).
            CollectionAssert.AreEqual(new[] { MafiaCleanCity.I18n.Libelle.De("accueil", "carte", "Prendre acte") },
                hl.LibellesDesBoutons.ToList(), "[Prendre acte] = commit, seul");
            Assert.IsTrue(hl.RenderedTexts.Contains(MafiaCleanCity.I18n.Libelle.De("accueil", "carte", "Ce qu’on peut faire")),
                "le surtitre des options");
            Assert.IsTrue(hl.TamponVisible, "une carte ordinaire se tamponne");
            Assert.IsNull(hl.LibelleLire, "pas de [Lire maintenant] hors de la carte des rapports");

            // Pas exactement deux options : aucune recommandation (jamais une moitié de choix).
            var boiteuse = Carte("DAMAGED_BUILDING", "a", "b");
            boiteuse.options = new[] { new DecisionOptionDto { label = "a" } };
            hl.SetPayload(null, boiteuse, null);
            Assert.IsEmpty(hl.OptionsRendues);
        }

        /// <summary>④ F1(b) (juge d'ensemble r4, 09/10 ; f2 : élément ABSENT, classe A) — SOUS CHAQUE OPTION de la carte non-rapports, sa CONSÉQUENCE : la clé servie `<label>.projected_consequence`, lue au catalogue (jamais en dur).
        /// Témoins : une clé NON servie ne produit rien (aucun repli inventé) ; la carte des rapports garde ses conséquences non montrées (option[1] jetée = voulu, f2 09/10).</summary>
        [Test]
        public void Etat2b_F1b_LesConsequencesServies_SousChaqueOption_ParLaCleDuCatalogue()
        {
            string cleA = "hl.option.damaged_building.repair_via_queue", cleB = "hl.option.damaged_building.leave_damaged";
            const string phraseA = "Chaque réparation se paie tout de suite, tant que l’argent suit.", phraseB = "Rien n’est payé, mais ce qui est endommagé reste à l’arrêt.";
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new System.Collections.Generic.Dictionary<string, string>
            {
                { cleA, "Mettre en réparation" }, { cleB, "Laisser en l’état" },
                { cleA + ".projected_consequence", phraseA }, { cleB + ".projected_consequence", phraseB },
            });
            var hl = Monter<HighestLeverageCardController>();
            hl.SetPayload(null, Carte("DAMAGED_BUILDING_REPAIR", cleA, cleB), null);
            TMPro.TextMeshProUGUI Texte(string nom) => hl.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true).First(t => t.name == nom);
            TMPro.TextMeshProUGUI ca = Texte("RecommandationConsequence"), cb = Texte("AlternativeConsequence");
            Assert.AreEqual(phraseA, ca.text, "sous l'option 1 : SA conséquence servie");
            Assert.AreEqual(phraseB, cb.text, "sous l'option 2 : SA conséquence servie");
            Assert.IsTrue(ca.gameObject.activeSelf && cb.gameObject.activeSelf, "les deux conséquences sont montrées");
            Assert.AreEqual(Texte("Recommandation").transform.parent, ca.transform.parent, "la conséquence est DANS la colonne de son option (dessous)");
            Assert.Greater(Texte("Recommandation").transform.GetSiblingIndex(), -1);
            Assert.Less(Texte("Recommandation").transform.GetSiblingIndex(), ca.transform.GetSiblingIndex(), "dessous : après l'option dans la colonne");
            CollectionAssert.IsSupersetOf(hl.RenderedTexts.ToList(), new[] { phraseA, phraseB }, "les conséquences sont des textes rendus (suivis)");

            // témoin : clé non servie ⇒ rien (le catalogue ne sert que la conséquence de l'option 1)
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new System.Collections.Generic.Dictionary<string, string>
            {
                { cleA, "Mettre en réparation" }, { cleB, "Laisser en l’état" }, { cleA + ".projected_consequence", phraseA },
            });
            hl.SetPayload(null, Carte("DAMAGED_BUILDING_REPAIR", cleA, cleB), null);
            Assert.AreEqual(phraseA, Texte("RecommandationConsequence").text);
            Assert.AreEqual("", Texte("AlternativeConsequence").text, "clé non servie : aucune phrase inventée");
            Assert.IsFalse(Texte("AlternativeConsequence").gameObject.activeSelf, "et le texte vide est retiré (il prendrait sa ligne)");

            // témoin : la carte des rapports ne montre pas de conséquences
            string rA = "hl.option.autonomy_reports.review_now", rB = "hl.option.autonomy_reports.leave_pending";
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new System.Collections.Generic.Dictionary<string, string>
            {
                { rA, "Lire maintenant" }, { rB, "Laisser en attente" }, { rA + ".projected_consequence", "x" }, { rB + ".projected_consequence", "y" },
            });
            hl.SetPayload(null, Carte("AUTONOMY_REPORTS_PENDING", rA, rB), null);
            Assert.AreEqual("", Texte("RecommandationConsequence").text, "carte des rapports : inchangée, aucune conséquence");
            Assert.AreEqual("", Texte("AlternativeConsequence").text);
        }

        [Test]
        public void Etat3_LaCarteDesRapportsEstReconnue()
        {
            var hl = Monter<HighestLeverageCardController>();
            var carte = Carte("AUTONOMY_REPORTS_PENDING", "hl.option.autonomy_reports.review_now", "hl.option.autonomy_reports.leave_pending");
            hl.SetPayload(null, carte, null);
            Assert.IsTrue(hl.EstCarteDesRapports);
            // Table 45 : [Lire maintenant] OUVRE les rapports (pas le tampon, caché). [Laisser en attente] (= skip) est RETIRÉ (f2 08/10 nuit).
            Assert.AreEqual(MafiaCleanCity.I18n.Libelle.Gabarit(carte.options[0].label, "—"), hl.LibelleLire);
            CollectionAssert.DoesNotContain(hl.LibellesDesBoutons.ToList(), MafiaCleanCity.I18n.Libelle.Gabarit(carte.options[1].label, "—"),
                "[Laisser en attente] n'est plus un bouton");
            Assert.IsFalse(hl.TamponVisible, "la carte des rapports ne se tamponne pas d'ici");
            int tampons = hl.CommitRequestCount;
            hl.OuvrirLesRapports();
            Assert.IsTrue(hl.RapportsOuverts, "[Lire maintenant] ouvre les rapports");
            Assert.AreEqual(tampons, hl.CommitRequestCount, "…sans AUCUN tampon");
            Assert.IsNull(hl.NomDuRapport, "sans jeton, la route des rapports n'est pas lue : pas de nom, jamais un nom inventé");
            hl.SetPayload(null, Carte("DAMAGED_BUILDING", "a", "b"), null);
            Assert.IsFalse(hl.EstCarteDesRapports);
        }

        [Test]
        public void Etat3b_LaCarteDesRapportsSansOptions_LeGesteDitQuandMemeCeQuIlFait()
        {
            var hl = Monter<HighestLeverageCardController>();
            var avec = Carte("AUTONOMY_REPORTS_PENDING", "hl.option.autonomy_reports.review_now", "hl.option.autonomy_reports.leave_pending");
            hl.SetPayload(null, avec, null);
            string servi = MafiaCleanCity.I18n.Libelle.Gabarit(avec.options[0].label, "—");
            Assert.AreEqual(servi, hl.LibelleLire, "avec ses deux options, le geste porte l'option servie (inchangé)");

            // Sans options (carte fabriquée du harnais, ou back qui n'en sert pas) : jamais une pilule SANS mot (planche A01 du 08/10).
            var sans = Carte("AUTONOMY_REPORTS_PENDING", "a", "b");
            sans.options = null;
            hl.SetPayload(null, sans, null);
            Assert.IsTrue(hl.EstCarteDesRapports);
            string repli = MafiaCleanCity.I18n.Libelle.De("accueil", "carte", "Lire maintenant");
            Assert.IsFalse(string.IsNullOrWhiteSpace(hl.LibelleLire), "la pilule de la carte des rapports a un libellé");
            Assert.AreEqual(repli, hl.LibelleLire, "le repli nommé : « Lire maintenant »");
            Assert.AreNotEqual(servi, hl.LibelleLire, "le libellé de la carte précédente ne survit pas à un rendu sans options");
        }

        [Test]
        public void Etat4_LaLigneDuBacklogSuitBacklogBadge()
        {
            var chrome = Monter<HomeChromeController>();
            string ligne = MafiaCleanCity.I18n.Libelle.De("accueil", "file", "d’autres attendent au-delà de ce que la file montre");
            chrome.SetBacklogBadge(true);
            Assert.IsTrue(chrome.RenderedTexts.Contains(ligne), "backlog_badge vrai : la ligne est dite");
            chrome.SetBacklogBadge(false);
            Assert.IsFalse(chrome.RenderedTexts.Contains(ligne), "backlog_badge faux : la ligne se tait");

            // « Plusieurs attendent encore » : SANS compte, pilotée par la bande (addendum à la 45), dans les deux sens.
            string plusieurs = MafiaCleanCity.I18n.Libelle.De("accueil", "file", "Plusieurs attendent encore");
            chrome.SetPressureBand("saturated");
            Assert.IsTrue(chrome.RenderedTexts.Contains(plusieurs), "saturée : la phrase est dite");
            foreach (string bande in new[] { "warning", "normal", null })
            {
                chrome.SetPressureBand(bande);
                Assert.IsFalse(chrome.RenderedTexts.Contains(plusieurs), $"bande « {bande} » : la phrase se tait");
            }
        }

        [Test]
        public void Etat5_LaSuivanteSousLaCarte_NommeQuiAttend()
        {
            var file = Monter<ExceptionQueuePanelController>();
            var c = new ExceptionCardDto
            {
                exception_id = "e1", lieutenant_id = "lt-1", lieutenant = new ExceptionLieutenantDto { id = "lt-1", name = "Lt. Quist" },
                severity_band = "SEVERE", event_descriptor = "x",
            };
            file.SetQueue("jeton", new[] { c });
            Assert.AreEqual(ExceptionQueuePanelController.Suivante(c), file.TexteSuivante);
            StringAssert.Contains("Lt. Quist", file.TexteSuivante, "la suivante NOMME le lieutenant servi");
            Assert.IsNull(file.TexteAmbiance, "une file non vide n'a pas l'ambiance du vide");
        }
    }
}
