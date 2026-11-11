using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Operational.Marche;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>㉑ « Le marché — l'ardoise du courtier » (design `Tools/marche-ardoise/DESIGN.md` v1.1, approuvé). Hors réseau : les quartiers par
    /// `DistrictsPourTest` (les 18 noms SERVIS, `district-names.ts:21-28`), les lignes par `MarcheClient.ReponsePourTest` (même lecture que le réseau).
    ///   G0a tout Graphic porte son CanvasRenderer (contrôle positif : un Image nu est VU) · G0b tout Graphic sous le masque de l'ardoise est un
    ///   MaskableGraphic · G0c ordre de fratrie (enseigne, compteurs, en-tête, ardoise, phrase du bas, état, pied)
    ///   G1 bijection corps ↔ DTO (3 clés ; contrôle positif : une 4ᵉ clé est NOMMÉE) · G2 ordre des rangées = cadre 106 (contrôle : l'ordre d'id rougit)
    ///   G3 une ligne servie ⇒ UNE case allumée sur 72, à la bonne intersection · G4 domaines fermés (contrôle : domaine amputé)
    ///   G5 compteurs dérivés du cadre 106 (contrôle : 3 lignes dans 2 quartiers ⇒ 16) · G6 états nue / partielle / pleine / erreur
    ///   G7 pieds : case sans ligne « voyant éteint », case ash « HORS DU TABLEAU » (ruling A), case servie = mot de la bande servie.</summary>
    [Category("EcranMarche")]
    public class MarchePlayModeTests
    {
        /// <summary>Les 18 quartiers SERVIS, recopiés de `district-names.ts:21-28` (back main 2ed39589), par id.</summary>
        private static readonly Dictionary<int, string> Noms = new Dictionary<int, string>
        {
            { 1, "Les Bassins" }, { 2, "Quai-Nord" }, { 3, "Sarnes" }, { 4, "La Colonne" }, { 5, "Hautes-Marches" }, { 6, "Verrier" },
            { 7, "Saint-Brand" }, { 8, "Le Treillis" }, { 9, "Marne-Basse" }, { 10, "Orsel" }, { 11, "Les Entrepôts" }, { 12, "Dépôt-Est" },
            { 13, "Le Verre" }, { 14, "Place des Comptes" }, { 15, "La Chancellerie" }, { 16, "La Lisière" }, { 17, "Les Friches" }, { 18, "Pont-Gris" },
        };

        /// <summary>L'ordre des 18 libellés du CADRE 106 (atelier 8f59cf9), recopié du cadre — indépendant de la constante du contrôleur.</summary>
        private static readonly string[] OrdreDuCadre106 =
        {
            "Les Bassins", "Quai-Nord", "Sarnes", "La Colonne", "Hautes-Marches", "Verrier", "Saint-Brand", "Les Entrepôts", "Dépôt-Est",
            "Le Treillis", "Marne-Basse", "Le Verre", "Orsel", "Place des Comptes", "La Lisière", "La Chancellerie", "Les Friches", "Pont-Gris",
        };

        private GameObject bancGo;

        [TearDown]
        public void Nettoyer()
        {
            if (bancGo != null) Object.DestroyImmediate(bancGo);
            bancGo = null;
            LogAssert.ignoreFailingMessages = false;
        }

        private static List<DistrictDto> Quartiers() => Noms.Select(kv => new DistrictDto { id = kv.Key, name = kv.Value }).ToList();

        private static string Corps(params (int d, string s, string b)[] lignes) =>
            "{\"payload\":{\"data\":{\"lanes\":[" + string.Join(",", lignes.Select(l =>
                "{\"district_id\":" + l.d + ",\"substance_type\":\"" + l.s + "\",\"lane_confidence_bucket\":\"" + l.b + "\"}")) + "]}}}";

        private IEnumerator Monter(System.Func<(long, string)> reponse, System.Action<MarcheScreenController> avant = null)
        {
            LogAssert.ignoreFailingMessages = true;   // le `Start` éventuel ne joint aucun réseau ici ; rien d'attendu au journal
            bancGo = new GameObject("BancMarche", typeof(RectTransform), typeof(Canvas));
            var hote = new GameObject("MarcheHote", typeof(RectTransform));
            hote.transform.SetParent(bancGo.transform, false);
            var ecran = hote.AddComponent<MarcheScreenController>();
            ecran.DistrictsPourTest = Quartiers();
            ecran.ClientPourTest.ReponsePourTest = reponse;
            avant?.Invoke(ecran);
            yield return ecran.Charger();
            yield return null;   // les rangées d'un rendu précédent sont détruites en fin d'image
            Courant = ecran;
        }
        private MarcheScreenController Courant;

        private Transform Racine() => bancGo.GetComponentsInChildren<Transform>(true).First(t => t.name == "MarcheRoot");

        // ═══ G0 — structurelles AVANT l'effet ═══════════════════════════════════════════════════════════════════════════

        private static List<string> GraphicsSansRenderer(Transform racine) =>
            racine.GetComponentsInChildren<Graphic>(true).Where(g => g.GetComponent<CanvasRenderer>() == null).Select(g => g.name).ToList();

        [UnityTest]
        public IEnumerator G0a_ToutGraphicPorteSonCanvasRenderer_ControlePositif()
        {
            yield return Monter(() => (200, Corps((12, "crick", "MODERATE"))));
            Transform racine = Racine();
            Assert.Greater(racine.GetComponentsInChildren<Graphic>(true).Length, 72, "anti-vacuité : la grille (72 cases) et le chrome sont bâtis");
            Assert.IsEmpty(GraphicsSansRenderer(racine), "un Graphic sans CanvasRenderer ne dessine rien, et la console est muette");
            // CONTRÔLE POSITIF : un Image ajouté sur un objet SANS CanvasRenderer est VU par la garde
            var nu = new GameObject("ImageNue", typeof(RectTransform));
            nu.transform.SetParent(racine, false);
            nu.AddComponent<Image>();
            Object.DestroyImmediate(nu.GetComponent<CanvasRenderer>());
            CollectionAssert.Contains(GraphicsSansRenderer(racine), "ImageNue", "CONTRÔLE POSITIF : la garde voit un Graphic nu");
        }

        [UnityTest]
        public IEnumerator G0b_SousLeMasqueDeLArdoise_ToutGraphicEstMaskable()
        {
            yield return Monter(() => (200, Corps((12, "crick", "MODERATE"))));
            Transform ardoise = Racine().GetComponentsInChildren<Transform>(true).First(t => t.name == "Ardoise");
            Assert.IsNotNull(ardoise.GetComponent<RectMask2D>(), "précondition : l'ardoise défile sous un masque");
            Graphic[] dessous = ardoise.GetComponentsInChildren<Graphic>(true);
            Assert.GreaterOrEqual(dessous.Length, 72, "anti-vacuité : les 72 cases sont sous le masque");
            Assert.IsEmpty(dessous.Where(g => !(g is MaskableGraphic)).Select(g => g.name).ToList(), "tout Graphic sous le masque est masquable");
        }

        [UnityTest]
        public IEnumerator G0c_OrdreDeFratrie()
        {
            yield return Monter(() => (200, Corps((12, "crick", "MODERATE"))));
            string[] attendu = { "Enseigne", "SousEnseigne", "Compteurs", "EnTete", "Ardoise", "PhraseDuBas", "Etat", "Pied" };
            string[] vus = Enumerable.Range(0, Racine().childCount).Select(i => Racine().GetChild(i).name).ToArray();
            CollectionAssert.AreEqual(attendu, vus, "l'ordre de fratrie de l'écran (cadre 106 de haut en bas, puis l'état et le pied)");
        }

        // ═══ G1 — bijection corps ↔ DTO ═════════════════════════════════════════════════════════════════════════════════

        private static List<string> ClesHorsDto(string element)
        {
            var champs = new HashSet<string>(typeof(LaneConfidenceRowDto).GetFields().Select(f => f.Name));
            return System.Text.RegularExpressions.Regex.Matches(element, "\"(\\w+)\"\\s*:").Cast<System.Text.RegularExpressions.Match>()
                .Select(m => m.Groups[1].Value).Where(k => !champs.Contains(k)).ToList();
        }

        [Test]
        public void G1_LeCorpsServiADuTroisCles_EtUneQuatriemeEstNommee()
        {
            const string element = "{\"district_id\":12,\"substance_type\":\"crick\",\"lane_confidence_bucket\":\"MODERATE\"}";
            CollectionAssert.AreEquivalent(new[] { "district_id", "substance_type", "lane_confidence_bucket" },
                typeof(LaneConfidenceRowDto).GetFields().Select(f => f.Name).ToArray(), "le DTO déclare EXACTEMENT les 3 clés du code back (@ef8be64e)");
            Assert.IsEmpty(ClesHorsDto(element), "chaque clé servie est déclarée (sinon JsonUtility la jette : forme G)");
            var dto = JsonUtility.FromJson<LanesEnvelope>("{\"payload\":{\"data\":{\"lanes\":[" + element + "]}}}").payload.data.lanes[0];
            Assert.AreEqual(12, dto.district_id); Assert.AreEqual("crick", dto.substance_type); Assert.AreEqual("MODERATE", dto.lane_confidence_bucket);
            // CONTRÔLE POSITIF : une 4ᵉ clé (le mur R2.2 du contrôleur l'interdit, `market.controller.ts:16-17`) est NOMMÉE
            CollectionAssert.AreEqual(new[] { "c" }, ClesHorsDto(element.Replace("}", ",\"c\":0.42}")), "CONTRÔLE POSITIF : la clé en trop est vue");
        }

        // ═══ G2 — l'ordre des rangées du cadre 106 ═══════════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator G2_LesRangeesSuiventLeCadre106_PasLOrdreDesIds()
        {
            yield return Monter(() => (200, Corps((12, "crick", "MODERATE"))));
            string[] rendus = Racine().GetComponentsInChildren<Transform>(false).Where(t => t.name.StartsWith("R_"))
                .Select(t => t.Find("Nom").GetComponent<TextMeshProUGUI>().text).ToArray();
            CollectionAssert.AreEqual(OrdreDuCadre106, rendus, "les 18 libellés rendus, DANS L'ORDRE du cadre 106");
            // CONTRÔLE POSITIF : l'ordre d'id (celui de ⑮, à ne pas copier) n'est PAS celui-ci
            string[] parId = Enumerable.Range(1, 18).Select(i => Noms[i]).ToArray();
            CollectionAssert.AreNotEqual(parId, rendus, "CONTRÔLE POSITIF : l'ordre d'id croissant serait vu");
        }

        // ═══ G3 — une ligne servie, une case ═════════════════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator G3_UneLigneServie_UneCaseAllumeeSur72_ALaBonneIntersection()
        {
            yield return Monter(() => (200, Corps((12, "crick", "HIGH"))));
            Assert.AreEqual(72, Courant.CasesRendues, "anti-vacuité : la grille porte ses 72 cases avant qu'on compte les allumées");
            Assert.AreEqual(1, Courant.CasesAllumees, "une ligne servie ⇒ UNE case allumée, 71 éteintes");
            Transform cas = Racine().GetComponentsInChildren<Transform>(false).First(t => t.name == "R_12").Find("C_crick");
            string mot = MarcheScreenController.MotDeBande("HIGH");
            Assert.AreEqual(mot, cas.Find("Mot").GetComponent<TextMeshProUGUI>().text, "la case (Dépôt-Est × crick) dit le mot de la bande SERVIE");
            Transform eteinte = Racine().GetComponentsInChildren<Transform>(false).First(t => t.name == "R_13").Find("C_crick");
            Assert.AreNotEqual(mot, eteinte.Find("Mot").GetComponent<TextMeshProUGUI>().text, "cible INERTE : une case voisine reste éteinte");
        }

        // ═══ G4 — domaines fermés ═════════════════════════════════════════════════════════════════════════════════════════

        [Test]
        public void G4_LesDomainesFermesSontExactementCeuxDuBack_ControleAmpute()
        {
            string[] bandesDuBack = { "LOW", "MODERATE", "HIGH" };                    // `LaneConfidenceBucket`, market-projection.service.ts:38
            string[] substancesDuBack = { "brindle", "crick", "hush", "ash" };       // `SubstanceTypeValue`, lane-collapse-pricing.service.ts:59
            CollectionAssert.AreEquivalent(bandesDuBack, MarcheScreenController.BandeDeLane.Keys.ToArray(), "chaque bande servie a son mot, aucune de plus");
            CollectionAssert.AreEqual(substancesDuBack, MarcheScreenController.Substances, "les 4 colonnes, dans l'ordre de l'en-tête du cadre 106");
            CollectionAssert.AreNotEquivalent(bandesDuBack.Take(2).ToArray(), MarcheScreenController.BandeDeLane.Keys.ToArray(), "CONTRÔLE : un domaine amputé est vu");
        }

        // ═══ G5 — les compteurs du cadre 106 ════════════════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator G5_LesCompteursDuCadre106_ControleDeuxQuartiers()
        {
            yield return Monter(() => (200, Corps((12, "crick", "MODERATE"), (3, "brindle", "HIGH"), (7, "hush", "LOW"))));
            Assert.AreEqual(3, Courant.LignesConnues); Assert.AreEqual(72, Courant.Denominateur);
            Assert.AreEqual(1, Courant.LignesSures); Assert.AreEqual(15, Courant.QuartiersNoirs, "les chiffres du cadre 106 : 03 /72 · 01 sûres · 15 quartiers noirs");
            var deux = MarcheScreenController.Compter(new[]
            {
                new LaneConfidenceRowDto { district_id = 12, substance_type = "crick", lane_confidence_bucket = "MODERATE" },
                new LaneConfidenceRowDto { district_id = 12, substance_type = "hush", lane_confidence_bucket = "HIGH" },
                new LaneConfidenceRowDto { district_id = 7, substance_type = "hush", lane_confidence_bucket = "LOW" },
            }, 18);
            Assert.AreEqual(16, deux.noirs, "CONTRÔLE : 3 lignes dans 2 quartiers ⇒ 16 quartiers noirs (le compte est celui des quartiers DISTINCTS)");
        }

        // ═══ G6 — les états ═════════════════════════════════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator G6_ArdoiseNue_EstUnRenseignement_PasUneErreur_ControleLe500()
        {
            yield return Monter(() => (200, "{\"payload\":{\"data\":{\"lanes\":[]}}}"));
            Assert.AreEqual(MarcheScreenController.Etat.Nue, Courant.EtatRendu);
            Assert.AreEqual(72, Courant.CasesRendues, "l'ardoise nue porte ses 72 cases éteintes");
            Assert.AreEqual(0, Courant.CasesAllumees);
            Assert.AreEqual("", Courant.TexteDeLEtat, "aucune phrase d'erreur sur l'ardoise nue");
            Assert.AreEqual(18, Courant.QuartiersNoirs);
            Nettoyer();
            yield return Monter(() => (500, "{\"payload\":{\"error\":{\"code\":\"INTERNAL_ERROR\",\"message\":\"boom\"}}}"));
            Assert.AreEqual(MarcheScreenController.Etat.Erreur, Courant.EtatRendu, "CONTRÔLE : un 500 est une erreur");
            Assert.AreEqual(0, Courant.CasesRendues, "CONTRÔLE : aucune case sur une erreur");
            Assert.AreEqual(MafiaCleanCity.I18n.Libelle.Gabarit("marche.etat.echec", "Le tableau ne répond pas."), Courant.TexteDeLEtat);
        }

        [UnityTest]
        public IEnumerator G6b_PartiellePuisPleine()
        {
            yield return Monter(() => (200, Corps((12, "crick", "MODERATE"))));
            Assert.AreEqual(MarcheScreenController.Etat.Partielle, Courant.EtatRendu);
            Nettoyer();
            var toutes = new List<(int, string, string)>();
            foreach (int d in Noms.Keys) foreach (string s in MarcheScreenController.Substances) toutes.Add((d, s, "LOW"));
            yield return Monter(() => (200, Corps(toutes.ToArray())));
            Assert.AreEqual(MarcheScreenController.Etat.Pleine, Courant.EtatRendu);
            Assert.AreEqual(18, Courant.LignesAshServies, "les 18 lignes ash servies sont détectées (TD-1018)");
            Assert.AreEqual(54, Courant.CasesAllumees, "72 servies, mais la colonne ash reste éteinte (ruling A) : 72 − 18");
        }

        /// <summary>G6c — revue ⊥ du code : une panne des QUARTIERS (`world/districts`) est une erreur nommée, jamais 18 rangées « — ». CONTRÔLE : quartiers
        /// servis ⇒ pas d'erreur (G6). Et le DÉTECTEUR TD-1018 : une ligne `ash` servie est comptée, la case reste éteinte.</summary>
        [UnityTest]
        public IEnumerator G6c_PanneDesQuartiers_EstUneErreur_EtUneLigneAshServieEstDetectee()
        {
            yield return Monter(() => (200, Corps((12, "crick", "MODERATE"))), e => e.DistrictsPourTest = new List<DistrictDto>());
            Assert.AreEqual(MarcheScreenController.Etat.Erreur, Courant.EtatRendu, "sans les noms des quartiers, le tableau n'est pas dessiné");
            Assert.AreEqual(0, Courant.CasesRendues);
            Assert.IsNotEmpty(Courant.TexteDeLEtat, "l'erreur est DITE");
            Nettoyer();
            yield return Monter(() => (200, Corps((13, "ash", "HIGH"), (12, "crick", "MODERATE"))));
            Assert.AreEqual(1, Courant.LignesAshServies, "DÉTECTEUR TD-1018 : la ligne ash servie est comptée");
            Assert.AreEqual(1, Courant.CasesAllumees, "seule la case crick s'allume : la colonne ash reste éteinte (ruling A)");
        }

        // ═══ G7 — les pieds ═════════════════════════════════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator G7_LesPieds_CaseSansLigne_CaseAsh_CaseServie()
        {
            yield return Monter(() => (200, Corps((12, "crick", "MODERATE"))));
            Courant.Toucher(15, "hush");
            StringAssert.EndsWith(MafiaCleanCity.I18n.Libelle.Gabarit("marche.titre.voyant_eteint", "voyant éteint").ToUpper(System.Globalization.CultureInfo.GetCultureInfo("fr-FR")),
                Courant.TitreDuPied, "une case sans ligne : « voyant éteint » (cadre 108)");
            StringAssert.StartsWith("LA CHANCELLERIE", Courant.TitreDuPied);
            Courant.Toucher(13, "ash");
            StringAssert.EndsWith(MafiaCleanCity.I18n.Libelle.Gabarit("marche.titre.hors_du_tableau", "HORS DU TABLEAU"), Courant.TitreDuPied, "toute case ash : « HORS DU TABLEAU » (ruling A)");
            StringAssert.DoesNotContain("tient", Courant.PhraseDuPied, "la 2ᵉ phrase du cadre 151 est retirée (ash ne s'allume jamais)");
            Courant.Toucher(12, "crick");
            StringAssert.EndsWith(MarcheScreenController.MotDeBande("MODERATE").ToUpper(System.Globalization.CultureInfo.GetCultureInfo("fr-FR")),
                Courant.TitreDuPied, "une case servie : le mot de la bande SERVIE (cadre 107 : DÉPÔT-EST · RECOUPÉ)");
            StringAssert.StartsWith("DÉPÔT-EST", Courant.TitreDuPied);
        }

        [Test]
        public void G8_LaPhraseDuBas_ATrou_LesTroisBranches()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            string zero = MarcheScreenController.PhraseDuBasPour(0, 72), une = MarcheScreenController.PhraseDuBasPour(1, 72), trois = MarcheScreenController.PhraseDuBasPour(3, 72);
            StringAssert.StartsWith("Aucune ligne sur 72", zero);
            StringAssert.StartsWith("Une ligne sur 72", une);
            StringAssert.StartsWith("3 lignes sur 72", trois, "les nombres en chiffres (écart C ratifié)");
            Assert.IsFalse(trois.Contains("{"), "aucune accolade brute : les paramètres sont des entiers de chaîne");
        }
    }
}
