using NUnit.Framework;
using MafiaCleanCity.Account.Profile;
using MafiaCleanCity.I18n;

namespace MafiaCleanCity.CityMap.Tests
{
    // ㉒ — BRUT (passe UX 2026-09-26, table 63 v2) : l'état du compte s'affichait « Active », la langue « fr », et 8 caractères de
    // l'identifiant du compte. Désormais des MOTS, par la valeur servie (ParValeur), replis de la table. Hors réseau, catalogue vide.
    [Category("ProfilEnMots")]
    public class ProfilEnMotsPlayModeTests
    {
        [TearDown] public void Oublier() => I18nCatalog.Oublier();

        [Test]
        public void M1_EtatEtLangue_EnMots()
        {
            I18nCatalog.Oublier();
            Assert.AreEqual("en règle", ProfileScreenController.EtatDuCompte("ACTIVE"));
            Assert.AreEqual("Français", ProfileScreenController.LangueDuCompte("fr"));
            Assert.AreEqual("Anglais", ProfileScreenController.LangueDuCompte("en"));
            Assert.AreEqual("—", ProfileScreenController.EtatDuCompte(null));
            Assert.AreEqual("—", ProfileScreenController.LangueDuCompte(""));
        }
    }
}
