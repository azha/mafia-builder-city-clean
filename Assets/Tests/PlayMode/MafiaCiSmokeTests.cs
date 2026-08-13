using NUnit.Framework;

namespace MafiaCleanCity.Theme.Tests
{
    // W4.P4a/C2 — sonde de validation du runner MafiaCI lui-même (-executeMethod +
    // batchmode async). Pas la falsifiable finale d'un chunk produit : juste la preuve que
    // le mécanisme tourne avant d'y accrocher C3/C6.
    [Category("W4P4a")]
    public class MafiaCiSmokeTests
    {
        [Test]
        public void Smoke_AlwaysPasses()
        {
            Assert.Pass();
        }
    }
}
