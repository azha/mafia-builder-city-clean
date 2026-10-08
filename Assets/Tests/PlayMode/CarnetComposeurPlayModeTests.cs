using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Operational.Exceptions;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ㉞ LE COMPOSEUR DES ORDRES DU SOIR (commande f2 26/09 ; table 73 @a2c0b2e4, table 83 @903a6a6f ; mesure des sources @1ffb08b4).
    //   K1  éligibilité (TD-764, UN site) : route vers un bâtiment connu ; entretien = operational_type non vide ; ardoise = candidate_actions
    //       d'une carte pending (jamais building.id) ; candidat available ; cibles DISTINCTES ; une cible sans nom n'est pas proposée
    //   K2  Recruter CACHÉ tant que son libellé n'est pas servi, OFFERT dès qu'il l'est (décision f2 B, TD-766)
    //   K3  le brouillon : jamais deux fois la même cible, 8 au plus, « encore n », déplacer ; le corps de compose (5 champs par créneau)
    //   K4  les refus par CODE (table 73) ; hors table : la phrase servie ; jamais le message de développeur
    //   E1  écran, état VIDE : « Il faut au moins quatre… », « Vous pouvez déjà poser » + comptes ; sous 4 cibles : « Pas encore… »
    //   E2  écran, 1 à 3 posés : « Encore n ordres à poser », AUCUN bouton Lancer ; étape 1 : un type sans cible reste lisible, SANS geste
    //   E3  écran, 4 posés : Lancer ⇒ compose PUIS commit, le carnet servi s'affiche
    //   E4  écran, refus 422 : la phrase de la table ; SETTLING : la confirmation servie, « Y aller quand même » renvoie l'acquittement
    [Category("ScreenC3")]
    public class CarnetComposeurPlayModeTests
    {
        private GameObject hote;

        [TearDown]
        public void Nettoyer()
        {
            CarnetClient.SubstitutPourTest = null;
            I18nCatalog.Oublier();
            GameObject reste = GameObject.Find("CarnetRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("CarnetRoot"); }
            if (hote != null) Object.DestroyImmediate(hote);
            hote = null;
        }

        // ── fabriques ──────────────────────────────────────────────────────────────────────────────────────────────────────
        private static BatimentPossedeDto Bat(string id, string enseigne, string type, string quartier = "La Lisière") => new BatimentPossedeDto
        {
            building = id, operational_type = type, district_name = quartier,
            name_i18n = new NomDeBatimentI18nDto { key = "game.fiction.building.name", @params = new NomDeBatimentParamsDto { enseigne = enseigne } },
        };

        private static ExceptionCardDto Carte(string statut, string cible, string batimentDeLaCarte = null) => new ExceptionCardDto
        {
            resolution_status = statut,
            building = new ExceptionBatimentDto { id = batimentDeLaCarte },
            candidate_actions = new[] { new CandidateActionDto { effect = new ExceptionEffectDto { type = "REPAIR", target_building_id = cible } } },
        };

        private static Dictionary<string, List<CibleDuCarnet>> CinqCibles() => ComposeurDuCarnet.CiblesEligibles(
            new[] { Bat("b1", "Outillage Halde", "specialized_lab"), Bat("b2", "Transit Marrek", "distribution_hub"),
                    Bat("b3", "Caves Orme", "stash"), Bat("b4", "Relais Pont", "money_holding") },
            null, new[] { Carte("pending", "b1") }, null);

        // ── K ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
        [Test]
        public void K1_Eligibilite_LesReglesDuBack_EnUnSeulSite()
        {
            var bats = new[] { Bat("b1", "Outillage Halde", "specialized_lab"), Bat("b2", "Transit Marrek", ""), Bat("b3", "Caves Orme", "stash") };
            var routes = new[] { new RouteSauveeDto { route_id = "r1", destination_building_id = "b3" },
                                 new RouteSauveeDto { route_id = "r2", destination_building_id = "inconnu" } };
            var ardoises = new[] { Carte("pending", "b1", null), Carte("pending", "b1"), Carte("resolved", "b3"), Carte("pending", "b2", "b3") };
            var candidats = new[] { new CandidatDto { candidate_id = "k1", pool = "civilian", status = "available" },
                                    new CandidatDto { candidate_id = "k2", pool = "saltline", status = "hired" } };
            var c = ComposeurDuCarnet.CiblesEligibles(bats, routes, ardoises, candidats);

            CollectionAssert.AreEqual(new[] { "r1" }, c[ComposeurDuCarnet.Distribution].Select(x => x.Id), "un itinéraire vers un bâtiment inconnu n'a pas de nom : pas proposé");
            Assert.AreEqual("vers Caves Orme (La Lisière)", c[ComposeurDuCarnet.Distribution][0].Libelle());
            CollectionAssert.AreEquivalent(new[] { "b1", "b3" }, c[ComposeurDuCarnet.Entretien].Select(x => x.Id), "b2 : operational_type vide = aucune ligne d'état");
            CollectionAssert.AreEqual(new[] { "b1" }, c[ComposeurDuCarnet.Ardoise].Select(x => x.Id),
                "la cible est dans candidate_actions (DISTINCTE) ; résolue exclue ; b2 non opérationnel ; building.id jamais lu");
            Assert.AreEqual("à Outillage Halde (La Lisière)", c[ComposeurDuCarnet.Ardoise][0].Libelle());
            CollectionAssert.AreEqual(new[] { "k1" }, c[ComposeurDuCarnet.Recrutement].Select(x => x.Id), "seuls les available");
            Assert.AreEqual("Quelqu’un du quartier", c[ComposeurDuCarnet.Recrutement][0].Libelle(), "table 83, jamais profile.name");
        }

        [Test]
        public void K2_Recruter_CacheTantQueSonLibelleNEstPasServi()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>());
            Assert.IsFalse(ComposeurDuCarnet.TypesOfferts().Contains(ComposeurDuCarnet.Recrutement), "libellé non servi : Recruter caché");
            Assert.AreEqual(3, ComposeurDuCarnet.TypesOfferts().Count());
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { ComposeurDuCarnet.CleQuiRouvreLeRecrutement, "Quelqu’un du quartier" } });
            Assert.IsTrue(ComposeurDuCarnet.TypesOfferts().Contains(ComposeurDuCarnet.Recrutement), "clé servie : Recruter réapparaît");
        }

        [Test]
        public void K3_LeBrouillon_EtLeCorpsDeCompose()
        {
            var cibles = CinqCibles();
            var b = new ComposeurDuCarnet.Brouillon();
            CibleDuCarnet e1 = cibles[ComposeurDuCarnet.Entretien][0];
            Assert.IsTrue(b.Poser(e1));
            Assert.IsFalse(b.Poser(e1), "jamais deux fois la même cible");
            Assert.IsTrue(b.Poser(cibles[ComposeurDuCarnet.Ardoise][0]), "même bâtiment, autre ordre : une autre ligne");
            Assert.AreEqual(2, b.EncoreAPoser);
            Assert.IsFalse(b.PeutLancer);
            b.Poser(cibles[ComposeurDuCarnet.Entretien][1]);
            b.Poser(cibles[ComposeurDuCarnet.Entretien][2]);
            Assert.IsTrue(b.PeutLancer);
            b.Deplacer(3, 0);
            Assert.AreEqual(cibles[ComposeurDuCarnet.Entretien][2].Cle, b.Lignes[0].Cle, "l'ordre des lignes = l'ordre de départ");

            CueStackComposeDto corps = b.Corps();
            Assert.AreEqual(4, corps.slots.Length);
            CollectionAssert.AreEqual(new[] { 0, 1, 2, 3 }, corps.slots.Select(s => s.drag_order));
            Assert.AreEqual(4, corps.slots.Select(s => s.slot_id).Distinct().Count(), "un slot_id par ligne");
            Assert.IsTrue(corps.slots.All(s => System.Guid.TryParse(s.slot_id, out _)), "uuid");
            string json = JsonUtility.ToJson(corps);
            StringAssert.Contains("\"target_ref\":{\"kind\":\"building\",\"id\":\"", json);
            StringAssert.DoesNotContain("status", json, "le back rejette les champs inconnus : les 5 champs seulement");

            for (int i = 0; i < 10; i++) b.Poser(new CibleDuCarnet { SlotType = ComposeurDuCarnet.Entretien, Kind = "building", Id = "x" + i });
            Assert.AreEqual(ComposeurDuCarnet.Maximum, b.Compte, "8 au plus");
        }

        [Test]
        public void K4_LesRefus_ParleParLaTable_JamaisLeMessageDeveloppeur()
        {
            string Corps(string code, string cle = "error.validation.failed") =>
                "{\"payload\":{\"error\":{\"code\":\"" + code + "\",\"message\":\"slot 2 target missing\",\"user_facing_i18n_key\":\"" + cle + "\"}}}";
            Assert.AreEqual("CUE_STACK_SLOT_TARGET_INVALID", ComposeurDuCarnet.Code(Corps("CUE_STACK_SLOT_TARGET_INVALID")));
            Assert.AreEqual("Cette cible ne tient plus : choisissez-en une autre.", ComposeurDuCarnet.PhraseDuRefus(Corps("CUE_STACK_SLOT_TARGET_INVALID")));
            Assert.AreEqual("Cet ordre n’existe pas encore.", ComposeurDuCarnet.PhraseDuRefus(Corps("SLOT_TYPE_RESERVED")));
            Assert.AreEqual("Une soirée est déjà en route : elle finit avant qu’on en compose une autre.",
                ComposeurDuCarnet.PhraseDuRefus(Corps("CUE_STACK_ALREADY_ACTIVE", "error.resource.state_conflict")));
            Assert.AreEqual("Deux ordres s’attendent l’un l’autre", ComposeurDuCarnet.PhraseDuRefus(Corps("CUE_STACK_DEPENDENCY_CYCLE")));
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "error.resource.state_conflict", "La situation a changé." } });
            Assert.AreEqual("La situation a changé.", ComposeurDuCarnet.PhraseDuRefus(Corps("RESOURCE_STATE_CONFLICT", "error.resource.state_conflict")));
            StringAssert.DoesNotContain("slot 2", ComposeurDuCarnet.PhraseDuRefus(Corps("VALIDATION_FAILED")), "jamais le message de développeur");
            StringAssert.DoesNotContain("slot 2", ComposeurDuCarnet.PhraseDuRefus(null));
        }

        // ── E : l'écran ──────────────────────────────────────────────────────────────────────────────────────────────────
        private IEnumerator Monter(Dictionary<string, List<CibleDuCarnet>> cibles, System.Action<CarnetScreenController> apres = null)
        {
            hote = new GameObject("CarnetScreen", typeof(RectTransform));
            ecran = hote.AddComponent<CarnetScreenController>();
            yield return null;
            ecran.RendreComposeurPourTest(cibles);
            apres?.Invoke(ecran);
            yield return null;
            yield return null;
        }

        private CarnetScreenController ecran;

        private static Transform Composeur()
        {
            GameObject r = GameObject.Find("CarnetRoot");
            Assert.IsNotNull(r, "CarnetRoot introuvable");
            Transform c = r.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "Composeur");
            Assert.IsNotNull(c, "le bloc Composeur n'est pas construit");
            return c;
        }

        private static string Texte(string nom) =>
            Composeur().GetComponentsInChildren<TextMeshProUGUI>(true).FirstOrDefault(t => t.name == nom)?.text;

        private static Button Bouton(string nom) =>
            GameObject.Find("CarnetRoot").GetComponentsInChildren<Button>(true).FirstOrDefault(b => b.name == "Bouton" + nom);

        [UnityTest]
        public IEnumerator E1_EtatVide_DitCeQuOnPeutDejaPoser()
        {
            yield return Monter(CinqCibles());
            Assert.AreEqual("Il faut au moins quatre ordres pour une soirée.", Texte("IlFaut"));
            Assert.AreEqual("Vous pouvez déjà poser", Texte("VousPouvez"));
            Assert.AreEqual("Faire l’entretien — 4 cibles", Texte("Posable_" + ComposeurDuCarnet.Entretien));
            Assert.AreEqual("Régler l’ardoise — 1 cible", Texte("Posable_" + ComposeurDuCarnet.Ardoise));
            Assert.IsNull(Texte("Posable_" + ComposeurDuCarnet.Distribution), "un type sans cible n'est pas listé à l'état vide");
            Assert.IsNull(Texte("PasEncore"), "5 cibles : une soirée est possible");
            Assert.IsNull(Bouton("Lancer"), "« Lancer la soirée » n'existe qu'à 4");
            Assert.IsNotNull(Bouton("Poser"), "la première ligne vide devient touchable");

            Nettoyer();
            yield return null;
            yield return Monter(ComposeurDuCarnet.CiblesEligibles(new[] { Bat("b1", "Outillage Halde", "specialized_lab") }, null, null, null));
            Assert.AreEqual("Pas encore de quoi remplir une soirée : il faudra d’autres locaux, des itinéraires ou des candidats.", Texte("PasEncore"));
        }

        [UnityTest]
        public IEnumerator E2_UnATroisPoses_EncoreN_SansLancer_EtUnTypeSansCibleSansGeste()
        {
            var cibles = CinqCibles();
            yield return Monter(cibles);
            Bouton("Poser").onClick.Invoke();
            yield return null;
            Assert.AreEqual("Quel ordre ?", Texte("QuelOrdre"));
            Assert.AreEqual("Envoyer un coursier — rien à viser pour l’instant", Texte("Type_" + ComposeurDuCarnet.Distribution));
            Assert.IsNull(Bouton("Type_" + ComposeurDuCarnet.Distribution), "un type sans cible reste lisible, SANS geste");
            Assert.IsNull(Texte("Type_" + ComposeurDuCarnet.Recrutement), "Recruter caché : libellé du candidat non servi");
            Bouton("Type_" + ComposeurDuCarnet.Entretien).onClick.Invoke();
            yield return null;
            Assert.AreEqual("Sur quoi ?", Texte("SurQuoi"));
            Bouton("Choisir_b1").onClick.Invoke();
            yield return null;
            Assert.AreEqual(1, ecran.Brouillon.Compte);
            Assert.AreEqual("Encore 3 ordres à poser", Texte("Encore"));
            Assert.IsNull(Bouton("Lancer"));

            ecran.OuvrirLeComposeur(); ecran.ChoisirType(ComposeurDuCarnet.Entretien);
            yield return null;
            StringAssert.EndsWith("déjà dans le carnet", Texte("Cible_b1"), "déjà posée : grisée, sans geste");
            Assert.IsNull(Bouton("Choisir_b1"));
            ecran.Choisir(cibles[ComposeurDuCarnet.Entretien][1]);
            ecran.OuvrirLeComposeur(); ecran.ChoisirType(ComposeurDuCarnet.Ardoise); ecran.Choisir(cibles[ComposeurDuCarnet.Ardoise][0]);
            yield return null;
            Assert.AreEqual("Encore un ordre à poser", Texte("Encore"));
            Assert.AreEqual("appui long pour déplacer", Texte("AppuiLong"));
        }

        [UnityTest]
        public IEnumerator E3_QuatrePoses_Lancer_ComposePuisCommit()
        {
            var cibles = CinqCibles();
            var appels = new List<string>();
            string corpsCompose = null;
            CarnetClient.SubstitutPourTest = (m, chemin, corps) =>
            {
                appels.Add(m + " " + chemin);
                if (chemin == "cue-stack/compose") { corpsCompose = corps; return (200, "{\"payload\":{\"data\":{\"cue_stack_id\":\"c\",\"state\":\"pending\",\"slots\":[]}}}"); }
                return (200, "{\"payload\":{\"data\":{\"cue_stack_id\":\"c\",\"state\":\"committed\",\"slots\":[" +
                    "{\"slot_id\":\"s1\",\"slot_type\":\"MAINTENANCE_BATCH\",\"target_ref\":{\"kind\":\"building\",\"id\":\"b2\"},\"drag_order\":1}," +
                    "{\"slot_id\":\"s0\",\"slot_type\":\"EXCEPTION_BATCH_RESOLUTION\",\"target_ref\":{\"kind\":\"building\",\"id\":\"b1\"},\"drag_order\":0}]}}}");
            };
            yield return Monter(cibles, e =>
            {
                foreach (CibleDuCarnet c in cibles[ComposeurDuCarnet.Entretien].Take(3)) e.Brouillon.Poser(c);
                e.Brouillon.Poser(cibles[ComposeurDuCarnet.Ardoise][0]);
                e.FermerLeComposeur();
            });
            Assert.IsNull(Texte("Encore"));
            Assert.AreEqual("une fois partie, on ne la reprend pas", Texte("SansRetour"));
            Bouton("Lancer").onClick.Invoke();
            for (int i = 0; i < 30 && (appels.Count < 2 || ecran.Brouillon.Compte > 0); i++) yield return null;
            yield return null;   // les lignes d'avant partent à la fin de la frame (Destroy différé)
            CollectionAssert.AreEqual(new[] { "POST cue-stack/compose", "POST cue-stack/commit" }, appels, "compose PUIS commit");
            StringAssert.Contains("\"slots\":[", corpsCompose);
            Assert.AreEqual(0, ecran.Brouillon.Compte, "lancée : le brouillon est vidé");
            Assert.IsFalse(Composeur().gameObject.activeSelf, "un carnet SERVI se lit : plus de composeur");
            var titres = GameObject.Find("CarnetRoot").GetComponentsInChildren<TextMeshProUGUI>(true)
                .Where(t => t.name == "Titre" && t.transform.parent.name == "Corps").Select(t => t.text).ToList();
            CollectionAssert.AreEqual(new[] { "Régler l’ardoise", "Faire l’entretien" }, titres, "le carnet servi, dans l'ordre de départ (drag_order)");
        }

        [UnityTest]
        public IEnumerator E4_Refus_EtConfirmationServie()
        {
            var cibles = CinqCibles();
            var appels = new List<string>();
            int commits = 0;
            CarnetClient.SubstitutPourTest = (m, chemin, corps) =>
            {
                appels.Add(chemin + (corps != null && corps.Contains("\"acknowledge_compounding\":true") ? "+acquitte" : ""));
                if (chemin == "cue-stack/compose" && appels.Count == 1)
                    return (422, "{\"payload\":{\"error\":{\"code\":\"CUE_STACK_SLOT_TARGET_INVALID\",\"message\":\"slot 3 dev text\"}}}");
                if (chemin == "cue-stack/compose") return (200, "{\"payload\":{\"data\":{\"cue_stack_id\":\"c\",\"state\":\"pending\",\"slots\":[]}}}");
                commits++;
                if (commits == 1) return (409, "{\"payload\":{\"error\":{\"code\":\"SETTLING_COMPOUND_REQUIRED\",\"details\":{\"settling\":[]}}}}");
                return (200, "{\"payload\":{\"data\":{\"cue_stack_id\":\"c\",\"state\":\"committed\",\"slots\":[{\"slot_id\":\"s\",\"slot_type\":\"MAINTENANCE_BATCH\",\"drag_order\":0}]}}}");
            };
            yield return Monter(cibles, e => { foreach (CibleDuCarnet c in cibles[ComposeurDuCarnet.Entretien]) e.Brouillon.Poser(c); e.FermerLeComposeur(); });

            yield return ecran.LancerLaSoiree();
            Assert.AreEqual("Cette cible ne tient plus : choisissez-en une autre.", Texte("Refus"));
            Assert.AreEqual(4, ecran.Brouillon.Compte, "refusé : le brouillon reste, le joueur choisit une autre cible");

            yield return ecran.LancerLaSoiree();
            yield return null;
            Assert.IsTrue(ecran.ConfirmationDemandee);
            Assert.AreEqual("Un endroit n’a pas fini de se poser", Texte("ConfirmationTitre"));
            Assert.AreEqual("Ce qu’on y a changé n’a pas encore pris.", Texte("ConfirmationPhrase"));
            Assert.AreEqual("j’assume le site qui bouge encore", Texte("ConfirmationSous"));
            Button y = Bouton("YAllerQuandMeme");
            Assert.IsNotNull(y);
            Assert.AreEqual("Y aller quand même", y.GetComponentInChildren<TextMeshProUGUI>().text);
            y.onClick.Invoke();
            for (int i = 0; i < 30 && ecran.ConfirmationDemandee; i++) yield return null;
            CollectionAssert.AreEqual(new[] { "cue-stack/compose", "cue-stack/compose", "cue-stack/commit", "cue-stack/commit+acquitte" }, appels,
                "« Y aller quand même » renvoie commit AVEC l'acquittement");
            Assert.IsFalse(ecran.ConfirmationDemandee);
            Assert.AreEqual(0, ecran.Brouillon.Compte);
        }

        // ═══ juge d'ensemble r3 (08/10) — F7 : le geste principal en CAPITALES ; F8 : la puce « Poser un ordre » ═════════════════
        // ⛔ Garde d'EFFET : on lit ce que le TMP AFFICHE (`textInfo.characterInfo[i].character`, après la casse), pas le paramètre `fontStyle` seul, et le nombre de LIGNES rendues.

        private static string Affiche(TextMeshProUGUI t)
        {
            t.ForceMeshUpdate();
            var sb = new System.Text.StringBuilder();
            for (int i = 0; i < t.textInfo.characterCount; i++) sb.Append(t.textInfo.characterInfo[i].character);
            return sb.ToString();
        }

        private static float Lum(Color c)
        {
            float L(float v) => v <= 0.04045f ? v / 12.92f : Mathf.Pow((v + 0.055f) / 1.055f, 2.4f);
            return 0.2126f * L(c.r) + 0.7152f * L(c.g) + 0.0722f * L(c.b);
        }
        private static float Contraste(Color a, Color b) { float x = Lum(a) + 0.05f, y = Lum(b) + 0.05f; return x > y ? x / y : y / x; }

        [UnityTest]
        public IEnumerator F7_LeGestePrincipal_Lancer_EstAffichePEnCapitales_LaValeurServieIntacte()
        {
            var cibles = CinqCibles();
            yield return Monter(cibles, e =>
            {
                foreach (CibleDuCarnet c in cibles[ComposeurDuCarnet.Entretien].Take(3)) e.Brouillon.Poser(c);
                e.Brouillon.Poser(cibles[ComposeurDuCarnet.Ardoise][0]);
                e.FermerLeComposeur();
            });
            TextMeshProUGUI lib = Bouton("Lancer").transform.Find("Libelle").GetComponent<TextMeshProUGUI>();
            Assert.AreEqual("Lancer la soirée", lib.text, "la valeur servie n'est PAS réécrite (la clé et la valeur restent)");
            Assert.AreEqual("LANCER LA SOIRÉE", Affiche(lib), "affiché en CAPITALES (maquette `.cn-geste` : « LANCER LA SOIRÉE ») — jeu : casse de phrase");
            Assert.IsTrue((lib.fontStyle & FontStyles.Bold) != 0, "`font:700`");
        }

        [UnityTest]
        public IEnumerator F8_LaPuce_PoserUnOrdre_EstUneEtiquetteEnCapitalesSurFilet_UneLigne_SansPaveGris()
        {
            yield return Monter(CinqCibles());
            Button b = Bouton("Poser");
            Assert.IsNotNull(b);
            var racine = (RectTransform)GameObject.Find("CarnetRoot").transform;
            Canvas.ForceUpdateCanvases();
            LayoutRebuilder.ForceRebuildLayoutImmediate(racine);
            TextMeshProUGUI lib = b.transform.Find("Libelle").GetComponent<TextMeshProUGUI>();
            Assert.AreEqual("Poser un ordre", lib.text, "la valeur servie n'est pas touchée");
            Assert.AreEqual("POSER UN ORDRE", Affiche(lib), "affiché en CAPITALES (`.tag` : « REJOUER », « VOUS Y ÉTIEZ »)");
            Assert.AreEqual(1, lib.textInfo.lineCount, "UNE ligne : le libellé ne casse plus sur deux (le pavé gris le cassait)");
            Assert.AreEqual(12f, lib.characterSpacing, 0.01f, "interlettré `.8px` sur 6,6 px ≈ .12em");
            Assert.IsTrue((lib.fontStyle & FontStyles.Bold) != 0, "`font:700`");
            // pas de pavé : le fond du bouton est transparent (le jeu : aplat (209,203,184))
            Assert.AreEqual(0f, b.GetComponent<Image>().color.a, 1e-4f, "aucun aplat plein derrière la puce");
            // le FILET est de la couleur du libellé (`border:1px solid currentColor`) — quatre traits armés de leur CanvasRenderer
            Transform cerne = b.transform.Find("Cerne");
            Assert.IsNotNull(cerne, "la puce a son filet");
            Assert.AreEqual(4, cerne.childCount);
            foreach (Transform f in cerne)
            {
                Assert.IsNotNull(f.GetComponent<CanvasRenderer>(), f.name + " : un Graphic sans CanvasRenderer ne dessine rien");
                Assert.AreEqual(lib.color, f.GetComponent<Image>().color, f.name + " : currentColor");
            }
            // la puce ÉPOUSE son libellé : sa largeur = libellé + 2 × 5 CSS (pas le pavé étiré sur 130 px)
            float css = lib.fontSize / 6.6f;   // 1 CSS px, dans l'échelle de l'écran (le corps de la puce est 6,6 CSS)
            Assert.AreEqual(lib.preferredWidth + 2f * 5f * css, ((RectTransform)b.transform).rect.width, 3f * css, "la puce épouse son libellé (`padding:3px 5px`)");
            // lisible SUR LE PAPIER : ≥ 4,5:1 (l'or `#d9ab4e` de la maquette, posé sur fond sombre, y ferait 1,6:1)
            Color papier = new Color32(0xe5, 0xe0, 0xd0, 255);
            Assert.GreaterOrEqual(Contraste(lib.color, papier), 4.5f, "lisible sur le papier du carnet");
            Assert.Less(Contraste(new Color32(0xd9, 0xab, 0x4e, 255), papier), 3f, "contrôle négatif : l'or de la maquette serait illisible ici — l'instrument discrimine");
        }
    }
}
