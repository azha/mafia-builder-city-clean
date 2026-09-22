using System.Collections.Generic;
using NUnit.Framework;
using MafiaCleanCity.I18n;

namespace MafiaCleanCity.I18nTests
{
    /// <summary>⛔ CONTRÔLE POSITIF DE LA GARDE DE SORTIE « CATALOGUE » DE MAFIACI (TD-576, 2026-09-23) — HORS GATE, EXPRÈS.
    /// Cette classe laisse le catalogue CHARGÉ en sortie, volontairement : lancée SEULE
    /// (`MAFIA_CI_CATEGORIES=SondeFuiteCatalogue`), le run doit finir `passed=1 failed=0` MAIS avec la ligne
    /// « ⛔ CATALOGUE i18n SURVIVANT en sortie de 1 classe(s) : [SondeFuiteCataloguePlayModeTests] » et un code de
    /// sortie 1. Sans ce contrôle, une garde qui ne se déclencherait jamais (mauvais nœud, mauvais champ) serait
    /// indiscernable d'une suite propre. ⚠️ Ne JAMAIS l'inscrire au filtre par défaut : elle rougirait chaque gate.</summary>
    [Category("SondeFuiteCatalogue")]
    public class SondeFuiteCataloguePlayModeTests
    {
        [Test]
        public void LaisseLeCatalogueChargeEnSortie_PourQueLaGardeLeVoie()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "sonde.fuite.catalogue", "fuite" } });
            Assert.IsTrue(I18nCatalog.Charge, "la sonde doit charger le catalogue, sinon elle ne contrôle rien");
        }
    }
}
