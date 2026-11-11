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

        /// <summary>REMPLACE « LesOptionsSontUneRecommandation_JamaisUnBouton » : cette propriété n'était vraie que tant que `commit` ne recevait aucune option (TD-724).
        /// Cause : le chunk 3 poste `chosen_option` ; les deux options servies SONT désormais les libellés des deux gestes (cadre 5 : « Mettre en réparation »
        /// / « Laisser en l'état »), chacun en appui long. Garde d'EFFET : les gestes DISENT les options servies, dans l'ordre ; le mot « Prendre acte » du
        /// client ne revient QUE sans deux options (seul geste, option 1).</summary>
        [Test]
        public void Etat2_CarteDeTete_LesDeuxOptionsSontLesDeuxGestes()
        {
            var hl = Monter<HighestLeverageCardController>();
            var carte = Carte("DAMAGED_BUILDING", "hl.option.damaged_building.repair_via_queue", "hl.option.damaged_building.leave_damaged");
            hl.SetPayload(null, carte, null);
            Assert.AreEqual(HighestLeverageCardController.CardState.Available, hl.RenderedState);
            string agir = MafiaCleanCity.I18n.Libelle.Gabarit(carte.options[0].label, "—");
            string laisser = MafiaCleanCity.I18n.Libelle.Gabarit(carte.options[1].label, "—");
            CollectionAssert.AreEqual(new[] { agir, laisser }, hl.OptionsRendues.ToList(), "les deux options SERVIES, dans l'ordre");
            CollectionAssert.AreEqual(new[] { agir, laisser }, hl.LibellesDesBoutons.ToList(), "les deux gestes DISENT les deux options : agir d'abord");
            CollectionAssert.DoesNotContain(hl.LibellesDesBoutons.ToList(), MafiaCleanCity.I18n.Libelle.De("accueil", "carte", "Prendre acte"), "pas de mot du client quand deux options sont servies");
            Assert.IsTrue(hl.RenderedTexts.Contains(MafiaCleanCity.I18n.Libelle.De("accueil", "carte", "Ce qu’on peut faire")),
                "le surtitre des options");
            Assert.IsTrue(hl.TamponVisible, "une carte ordinaire se tranche");
            Assert.IsNull(hl.LibelleLire, "pas de [Lire maintenant] hors de la carte des rapports");

            // Pas exactement deux options : jamais une moitié de choix — le SEUL geste « Prendre acte » (option 1 : il n'agit pas).
            var boiteuse = Carte("DAMAGED_BUILDING", "a", "b");
            boiteuse.options = new[] { new DecisionOptionDto { label = "a" } };
            hl.SetPayload(null, boiteuse, null);
            Assert.IsEmpty(hl.OptionsRendues);
            CollectionAssert.AreEqual(new[] { MafiaCleanCity.I18n.Libelle.De("accueil", "carte", "Prendre acte") }, hl.LibellesDesBoutons.ToList(),
                "sans deux options : le seul geste d'avant, « Prendre acte » (LAISSER, option 1)");
            Assert.IsFalse(hl.AgirButton.gameObject.activeInHierarchy, "AGIR n'est jamais montré sans option à agir");
            Assert.AreEqual("PRENDRE ACTE", hl.MotCle, "la saisie dit le mot du seul geste");
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
            Assert.AreEqual(ca.transform.parent, cb.transform.parent, "les deux conséquences sont dans UNE rangée (`.csq4-rang`)");
            Assert.AreEqual(hl.AgirButton.transform.parent.parent, ca.transform.parent.parent, "la rangée des conséquences est dans le verre, comme celle des gestes");
            Assert.Less(hl.AgirButton.transform.parent.GetSiblingIndex(), ca.transform.parent.GetSiblingIndex(), "dessous : la rangée des conséquences suit celle des gestes");
            Assert.AreEqual(hl.AgirButton.transform.parent, hl.LaisserButton.transform.parent, "les deux gestes sont côte à côte (`.gestes`)");
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

        /// <summary>V20 (juge-données moment 2, 11/11) — `options[].projected_consequence` est servi : le DTO le DÉCLARE (JsonUtility ne remplit que ce qui est déclaré) et le client lit la clé SERVIE, jamais
        /// la concaténation. DÉTECTEUR : une clé servie qui DIFFÈRE de `<label>.projected_consequence` doit gagner (avec la concaténation seule, la phrase de la clé reconstruite s'afficherait) ; le CONTRÔLE POSITIF
        /// (sans le champ) retombe sur la concaténation — sinon le détecteur ne distinguerait rien.</summary>
        [Test]
        public void V20_LaCleServieDeLaConsequence_GagneSurLaCleReconstruite()
        {
            string cleA = "hl.option.damaged_building.repair_via_queue", cleB = "hl.option.damaged_building.leave_damaged";
            string servieA = "hl.option.damaged_building.repair_via_queue.autre_consequence";
            const string phraseServie = "La phrase de la clé SERVIE.", phraseReconstruite = "La phrase de la clé RECONSTRUITE.";
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new System.Collections.Generic.Dictionary<string, string>
            {
                { cleA, "Mettre en réparation" }, { cleB, "Laisser en l’état" },
                { cleA + ".projected_consequence", phraseReconstruite }, { servieA, phraseServie },
            });
            // le DTO déclare le champ : un corps réel le remplit (sinon la clé servie est jetée, la faute d'origine)
            var dto = JsonUtility.FromJson<DecisionOptionDto>("{\"label\":\"" + cleA + "\",\"projected_consequence\":\"" + servieA + "\"}");
            Assert.AreEqual(servieA, dto.projected_consequence, "le champ servi est LU par le DTO");
            var hl = Monter<HighestLeverageCardController>();
            HlCardDto carte = Carte("DAMAGED_BUILDING_REPAIR", cleA, cleB);
            carte.options[0].projected_consequence = servieA;
            hl.SetPayload(null, carte, null);
            TMPro.TextMeshProUGUI Texte(string nom) => hl.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true).First(t => t.name == nom);
            Assert.AreEqual(phraseServie, Texte("RecommandationConsequence").text, "la clé SERVIE gagne sur la clé reconstruite");
            // CONTRÔLE POSITIF : sans le champ, la concaténation reste le repli (le détecteur distingue les deux sources)
            carte.options[0].projected_consequence = null;
            hl.SetPayload(null, carte, null);
            Assert.AreEqual(phraseReconstruite, Texte("RecommandationConsequence").text, "sans champ servi : la clé reconstruite (compatibilité)");
        }

        /// <summary>Les violations de « chaque conséquence est SOUS son option » : le rect (x min / x max) de la conséquence doit être celui de la colonne de SON bouton, à `tolerance` u près. Pure sur des rects monde.</summary>
        private static System.Collections.Generic.List<string> ConsequencesHorsDeLeurColonne(HighestLeverageCardController hl, float tolerance)
        {
            (float min, float max) X(Transform t) { var c = new Vector3[4]; ((RectTransform)t).GetWorldCorners(c); return (c[0].x, c[2].x); }
            TMPro.TextMeshProUGUI Texte(string nom) => hl.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true).First(x => x.name == nom);
            var v = new System.Collections.Generic.List<string>();
            foreach (var (bouton, nom) in new[] { (hl.AgirButton.transform, "RecommandationConsequence"), (hl.LaisserButton.transform, "AlternativeConsequence") })
            {
                var b = X(bouton); var c = X(Texte(nom).transform);
                if (Mathf.Abs(c.min - b.min) > tolerance || Mathf.Abs(c.max - b.max) > tolerance)
                    v.Add($"{nom} [{c.min:0.#}..{c.max:0.#}] hors de la colonne de son bouton [{b.min:0.#}..{b.max:0.#}]");
            }
            return v;
        }

        /// <summary>F1 du juge visuel ⊥ tour 2 (11/11, MAJEUR) — la couture entre les deux options passait de x=528 (boutons) à x=670,5 (conséquences) : le bloc de gauche (552 px, texte long) courait sous le bouton de droite,
        /// on pouvait lire la MAUVAISE conséquence. Garde STRUCTURELLE : le rect de chaque conséquence est contenu dans la colonne de son bouton (même x min / x max). CONTRÔLE POSITIF : la forme d'avant (largeur préférée du
        /// texte comme base, `preferredWidth` libre) avec un texte long à gauche DOIT être vue par la même garde.</summary>
        [Test]
        public void F1T2_ChaqueConsequence_EstDansLaColonneDeSonBouton_ControlePositifTexteLongAGauche()
        {
            string cleA = "hl.option.damaged_building.repair_via_queue", cleB = "hl.option.damaged_building.leave_damaged";
            string longue = string.Concat(Enumerable.Repeat("Chaque réparation se paie tout de suite, tant que l’argent suit ; les travaux finis, l’activité reprend. ", 3)).Trim();
            const string courte = "Rien n’est payé.";
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new System.Collections.Generic.Dictionary<string, string>
            {
                { cleA, "Mettre en réparation" }, { cleB, "Laisser en l’état" }, { cleA + ".projected_consequence", longue }, { cleB + ".projected_consequence", courte },
            });
            hote = new GameObject("CanvasF1T2", typeof(Canvas));
            hote.GetComponent<Canvas>().renderMode = RenderMode.ScreenSpaceOverlay;
            var go = new GameObject("HL", typeof(RectTransform));
            go.transform.SetParent(hote.transform, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = rt.pivot = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(1280f, 1400f);
            var hl = go.AddComponent<HighestLeverageCardController>();
            hl.SetPayload(null, Carte("DAMAGED_BUILDING_REPAIR", cleA, cleB), null);
            Canvas.ForceUpdateCanvases();
            UnityEngine.UI.LayoutRebuilder.ForceRebuildLayoutImmediate(hl.Bloc);
            TMPro.TextMeshProUGUI Texte(string nom) => hl.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true).First(x => x.name == nom);
            var ca = Texte("RecommandationConsequence"); var cb = Texte("AlternativeConsequence");
            // anti-vacuité : la mise en page est réalisée (des largeurs réelles) et les deux textes sont là
            Assert.AreEqual(longue, ca.text); Assert.AreEqual(courte, cb.text);
            var wb = new Vector3[4]; ((RectTransform)hl.AgirButton.transform).GetWorldCorners(wb);
            Assert.Greater(wb[2].x - wb[0].x, 100f, "anti-vacuité : le bouton a une largeur réelle");
            // `.g{flex:1}` : les deux BOUTONS sont à parts égales (leurs libellés n'ont pas la même longueur : « Mettre en réparation » / « Laisser en l’état »)
            var wg = new Vector3[4]; var wg2 = new Vector3[4];
            ((RectTransform)hl.AgirButton.transform).GetWorldCorners(wg); ((RectTransform)hl.LaisserButton.transform).GetWorldCorners(wg2);
            Assert.AreEqual(wg[2].x - wg[0].x, wg2[2].x - wg2[0].x, 2f, "les deux gestes ont la MÊME largeur (flex:1), quelle que soit la longueur de leur libellé");
            Assert.IsEmpty(ConsequencesHorsDeLeurColonne(hl, 2f), "chaque conséquence est SOUS son option, dans la colonne de son bouton (texte long à gauche)");
            // la couture : les deux conséquences ont la MÊME largeur que les deux boutons (parts égales), donc la même couture
            var wa = new Vector3[4]; var wl = new Vector3[4];
            ((RectTransform)ca.transform).GetWorldCorners(wa); ((RectTransform)cb.transform).GetWorldCorners(wl);
            ((RectTransform)hl.LaisserButton.transform).GetWorldCorners(wb);
            Assert.AreEqual(wb[0].x, wl[0].x, 2f, "la couture entre les conséquences est celle des boutons");

            // CONTRÔLE POSITIF : la forme d'AVANT (la largeur préférée du texte sert de base) avec le même texte long à gauche — la garde la voit
            foreach (var t in new[] { ca, cb }) { var le = t.GetComponent<UnityEngine.UI.LayoutElement>(); le.preferredWidth = -1f; }
            UnityEngine.UI.LayoutRebuilder.ForceRebuildLayoutImmediate(hl.Bloc);
            var violations = ConsequencesHorsDeLeurColonne(hl, 2f);
            Assert.IsNotEmpty(violations, "CONTRÔLE POSITIF : sans `preferredWidth = 0`, un texte long à gauche fait glisser la couture et la garde le voit");
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
