using System.Collections.Generic;
using NUnit.Framework;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // ㊵ — ÉTAT VIDE FAUX (passe UX 2026-09-26) : « Obtenir une planque » à un joueur qui EN A une (le kit la donne). La planque servie
    // (district/:id/stash) se nomme par l'enseigne que `me/buildings` sert pour son bâtiment. Hors réseau.
    //   V1  l'enseigne servie du bâtiment de la planque ; bâtiment ou enseigne absents ⇒ null (on n'en invente pas)
    //   V2  le mot de la table 63 porte l'enseigne en paramètre (repli à l'octet)
    //   V3  ㊵ (§G, 26/09) : un SEUL maillon manquant ne porte pas de numéro (« MAILLON MANQUANT 2 » seul) ; plusieurs, si
    [Category("PlanqueVide")]
    public class PlanqueVidePlayModeTests
    {
        [TearDown] public void Oublier() => I18nCatalog.Oublier();

        private static BatimentPossedeDto B(string id, string enseigne) => new BatimentPossedeDto
        {
            building = id, name_i18n = new NomDeBatimentI18nDto { key = "game.fiction.building.name", @params = new NomDeBatimentParamsDto { enseigne = enseigne } },
        };

        [Test]
        public void V1_LEnseigneServie_DuBatimentDeLaPlanque()
        {
            var kit = new[] { B("lab", "Atelier Vesk"), B("depot", "Dépôt Oster") };
            Assert.AreEqual("Dépôt Oster", FiliereScreenController.EnseigneDe(kit, "depot"));
            Assert.IsNull(FiliereScreenController.EnseigneDe(kit, "inconnu"));
            Assert.IsNull(FiliereScreenController.EnseigneDe(new[] { B("depot", "  ") }, "depot"), "enseigne vide : rien");
            Assert.IsNull(FiliereScreenController.EnseigneDe(null, "depot"));
        }

        [Test]
        public void V2_LeMotDeLaTable63_PorteLEnseigne()
        {
            I18nCatalog.Oublier();   // clé non servie : le REPLI, paramètre rempli
            string t = Libelle.Gabarit("filiere.vide.votre_planque_enseigne_est_vide", "Votre planque, {enseigne}, est vide.",
                new Dictionary<string, string> { { "enseigne", "Dépôt Oster" } });
            Assert.AreEqual("Votre planque, Dépôt Oster, est vide.", t);
        }

        [Test]
        public void V3_UnSeulMaillonManquant_SansNumero()
        {
            I18nCatalog.Oublier();
            Assert.AreEqual("MAILLON MANQUANT", FiliereScreenController.EtiquetteDeRang("2", 1), "planque servie : un seul manquant");
            Assert.AreEqual("MAILLON MANQUANT   2", FiliereScreenController.EtiquetteDeRang("2", 2), "sans planque : deux, numérotés");
        }
    }
}
