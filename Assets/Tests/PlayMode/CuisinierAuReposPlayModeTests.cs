using NUnit.Framework;
using MafiaCleanCity.Operational;

namespace MafiaCleanCity.CityMap.Tests
{
    // ⑦ — ÉTAT VIDE FAUX (passe UX 2026-09-26, table 63 v2) : « Aucune équipe rattachée » s'écrivait sans donnée. Un cuisinier AU REPOS
    // (servi : COOK + IDLE — les deux cuisiniers du kit mesuré, corps/007) dit « au repos : rien à cuire » et renvoie à ㉚. Hors réseau.
    [Category("CuisinierAuRepos")]
    public class CuisinierAuReposPlayModeTests
    {
        [Test]
        public void C1_CuisinierAuRepos_SeulementCookEtIdle()
        {
            Assert.IsTrue(LieutenantScreenController.EstCuisinierAuRepos(new RosterRow { archetype = "COOK", op_state_band = "IDLE" }), "le kit mesuré");
            Assert.IsFalse(LieutenantScreenController.EstCuisinierAuRepos(new RosterRow { archetype = "COOK", op_state_band = "ACTIVE" }));
            Assert.IsFalse(LieutenantScreenController.EstCuisinierAuRepos(new RosterRow { archetype = "MUSCLE", op_state_band = "IDLE" }));
            Assert.IsFalse(LieutenantScreenController.EstCuisinierAuRepos(null));
        }
    }
}
