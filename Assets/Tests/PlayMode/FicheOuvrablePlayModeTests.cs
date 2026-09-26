using System.Collections.Generic;
using NUnit.Framework;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Operational.Tests
{
    // « OUVRIR » NE PART JAMAIS AVEC "" (f2 26/09 ; B3-d du suivi ⊥ de l'UX : un bâtiment ACHETÉ est servi operational_type = "",
    // et convert rendait 422). Forme G du lot back « achat-ouvrable » (lot/achat-ouvrable 6b6d7a5a) : purchased_type (toujours
    // présent) et convertible_types (le prédicat des gardes de convert ; [] une fois converti). Tests PURS, hors réseau.
    //   O1  corps brut : champs lus, présence vue ; back antérieur ⇒ absence vue (fiche ET me/buildings)
    //   O2  servis : le type ACHETÉ s'il est ouvrable ; liste vide (converti) ⇒ rien ; hors liste (relais hors du port) ⇒ rien
    //   O4  ② « Blanchir » de la façade : présent seulement si la planque servie tient de quoi blanchir (f2 26/09)
    //   O5  garde de CLASSE : aucun bouton du client à geste vide, hors exceptions NOMMÉES (contrôle positif sur la forme d'avant de ②)
    //   O3  back antérieur : operational_type s'il existe (d'avant) ; "" ⇒ rien, jamais ""
    [Category("FicheBatiment")]
    public class FicheOuvrablePlayModeTests
    {
        private static string Fiche(string champs) =>
            "{\"payload\":{\"data\":{\"building\":\"b-1\",\"operational_type\":\"\"" + champs + "}}}";

        [Test]
        public void O1_LeCorpsBrut_ChampsEtPresence()
        {
            BuildingCardDto f = BuildingCardClient.LireFiche(Fiche(",\"purchased_type\":\"distribution_hub\",\"convertible_types\":[\"distribution_hub\",\"lab\"]"));
            Assert.IsTrue(f.TypesOuvrablesServis);
            Assert.AreEqual("distribution_hub", f.purchased_type);
            CollectionAssert.AreEqual(new[] { "distribution_hub", "lab" }, f.convertible_types);
            Assert.IsFalse(BuildingCardClient.LireFiche(Fiche("")).TypesOuvrablesServis, "back antérieur : absent");

            MesBatimentsData m = MesBatimentsClient.LireCorps("{\"payload\":{\"data\":{\"buildings\":[{\"building\":\"b-1\","
                + "\"operational_type\":\"\",\"purchased_type\":\"dealer_spot_front\",\"convertible_types\":[\"dealer_spot_front\"]}]}}}");
            Assert.IsTrue(m.buildings[0].TypesOuvrablesServis);
            Assert.AreEqual("dealer_spot_front", m.buildings[0].purchased_type);
            Assert.IsFalse(MesBatimentsClient.LireCorps("{\"payload\":{\"data\":{\"buildings\":[{\"building\":\"b-1\"}]}}}")
                .buildings[0].TypesOuvrablesServis);
        }

        [Test]
        public void O2_Servis_LeTypeAchete_SIlEstOuvrable()
        {
            var achete = new BuildingCardDto { operational_type = "", purchased_type = "dealer_spot_front",
                convertible_types = new[] { "dealer_spot_front", "lab" }, TypesOuvrablesServis = true };
            Assert.AreEqual("dealer_spot_front", BuildingCardController.TypeAOuvrir(achete), "B3-d : le coin de vente acheté s'ouvre");
            var converti = new BuildingCardDto { operational_type = "lab", purchased_type = "lab",
                convertible_types = new string[0], TypesOuvrablesServis = true };
            Assert.IsNull(BuildingCardController.TypeAOuvrir(converti), "déjà converti : le geste est retiré");
            var horsPort = new BuildingCardDto { operational_type = "", purchased_type = "distribution_hub",
                convertible_types = new[] { "lab", "stash" }, TypesOuvrablesServis = true };
            Assert.IsNull(BuildingCardController.TypeAOuvrir(horsPort), "un relais hors du port ou des cheminées : pas d'autre type choisi");
        }

        [Test]
        public void O3_BackAnterieur_JamaisVide()
        {
            Assert.AreEqual("lab", BuildingCardController.TypeAOuvrir(new BuildingCardDto { operational_type = "lab" }));
            Assert.IsNull(BuildingCardController.TypeAOuvrir(new BuildingCardDto { operational_type = "" }), "jamais \"\"");
            Assert.IsNull(BuildingCardController.TypeAOuvrir(null));
        }
    
        // ── ② « Blanchir » de la façade (f2 26/09) et la garde de CLASSE « pas de bouton à geste vide » ─────────────────────────────
        [Test]
        public void O4_Blanchir_SurLaFiche_SuitLaPlanqueServie()
        {
            var nominal = new MafiaCleanCity.CityMap.SafehouseDto { safehouse_id = "p", load_bucket = "NOMINAL" };
            var vide = new MafiaCleanCity.CityMap.SafehouseDto { safehouse_id = "p", load_bucket = "EMPTY" };
            Assert.IsTrue(BuildingCardController.BlanchirOffertSurLaFiche("facade", nominal), "l'amorce : le geste est là");
            Assert.IsFalse(BuildingCardController.BlanchirOffertSurLaFiche("facade", vide), "planque vide : pas de bouton");
            Assert.IsFalse(BuildingCardController.BlanchirOffertSurLaFiche("facade", null), "aucune planque servie : pas de bouton");
        }

        private static readonly System.Text.RegularExpressions.Regex LambdaVide = new System.Text.RegularExpressions.Regex(
            @"\(\s*\)\s*=>\s*\{\s*(?:/\*.*?\*/|//[^\n]*\n)?\s*\}", System.Text.RegularExpressions.RegexOptions.Singleline);
        private static readonly System.Text.RegularExpressions.Regex AppelDeBouton = new System.Text.RegularExpressions.Regex(
            @"(AddActionButton|AddListener|Bouton\w*|BuildFicheBouton|AddCycleButton)\s*\(", System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        /// <summary>Les boutons dont le geste est VIDE (ou un commentaire), par « fichier:identifiant stable » visible dans l'appel. Pur.</summary>
        private static List<string> BoutonsVides(string source, string nom)
        {
            var res = new List<string>();
            foreach (System.Text.RegularExpressions.Match m in LambdaVide.Matches(source))
            {
                int debut = System.Math.Max(source.LastIndexOf(';', m.Index), source.LastIndexOf("{\n", m.Index, System.StringComparison.Ordinal));
                string ctx = source.Substring(debut + 1, m.Index - debut - 1);
                if (!AppelDeBouton.IsMatch(ctx)) continue;
                var id = System.Text.RegularExpressions.Regex.Match(ctx, "\"([a-z_]+)\"");
                res.Add(nom + ":" + (id.Success ? id.Groups[1].Value : "?"));
            }
            return res;
        }

        /// <summary>Exceptions EXACTES, nommées : un bouton ÉTEINT qui MONTRE un geste pas encore câblé (décision de f2 attendue).</summary>
        private static readonly string[] ExceptionsNommees = { "BuildingCardController.cs:faire_sortir_la_marchandise" };

        [Test]
        public void O5_AucunBoutonAGesteVide_HorsExceptionsNommees()
        {
            Assert.AreEqual(1, BoutonsVides("        AddActionButton(bar, \"injecter\", \"Injecter\", () => { /* rien */ });", "x.cs").Count,
                "contrôle positif : la forme d'avant de ② est VUE");
            Assert.AreEqual(0, BoutonsVides("        AddActionButton(bar, \"blanchir\", \"Blanchir\", () => StartCoroutine(Inject(p, 1)));", "x.cs").Count);

            string racine = System.IO.Path.Combine(UnityEngine.Application.dataPath, "Scripts");
            var trouves = new List<string>();
            int lus = 0;
            foreach (string f in System.IO.Directory.GetFiles(racine, "*.cs", System.IO.SearchOption.AllDirectories))
            {
                lus++;
                trouves.AddRange(BoutonsVides(System.IO.File.ReadAllText(f), System.IO.Path.GetFileName(f)));
            }
            Assert.Greater(lus, 100, "le balayage lit réellement l'arbre des scripts");
            CollectionAssert.AreEquivalent(ExceptionsNommees, trouves,
                "un bouton sans geste est un bouton qui ment : le câbler, ou le retirer — ou une exception NOMMÉE :\n" + string.Join("\n", trouves));
        }
}
}
