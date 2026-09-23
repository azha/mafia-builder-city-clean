using System;
using NUnit.Framework;

namespace MafiaCleanCity.Tests
{
    /// <summary>⛔ CONTRÔLE POSITIF DU CHIEN DE GARDE DE GEL de `Tools/run-unity-check.sh` (2026-09-23) — HORS GATE, EXPRÈS, INERTE.
    /// Ce test GÈLE le fil principal de l'éditeur, volontairement : une boucle synchrone qui ne rend jamais la main, donc que le
    /// `[Timeout]` d'Unity ne peut pas interrompre (NUnit ne reprend jamais la main — la forme exacte du gel mesuré sur
    /// `ManometreOracle.Oracle1`). Lancé SEUL, avec sa variable, le harnais doit rendre RC=5 (RC_GEL) et écrire
    /// « ⛔ TEST GELÉ … pendant « MafiaCleanCity.Tests.SondeGelVolontairePlayModeTests.GeleLeFilPrincipal_SiDemande » » :
    ///   MAFIA_SONDE_GEL=1 STALL_S=60 MAFIA_CI_TESTS=MafiaCleanCity.Tests.SondeGelVolontairePlayModeTests.GeleLeFilPrincipal_SiDemande
    /// ⛔ DÉDIÉ, jamais Oracle1 : un contrôle positif appuyé sur un défaut tomberait le jour où le défaut serait corrigé.
    /// ⛔ INERTE sans `MAFIA_SONDE_GEL=1` : il sort Inconclusive et ne gèle rien — un filtre qui l'emporterait par erreur ne perd pas
    ///    son run. ⚠️ Ne JAMAIS l'inscrire au filtre par défaut (raison écrite dans MafiaCI) ; sa catégorie n'est le préfixe de rien.</summary>
    [Category("SondeGelVolontaire")]
    public class SondeGelVolontairePlayModeTests
    {
        [Test]
        public void GeleLeFilPrincipal_SiDemande()
        {
            if (Environment.GetEnvironmentVariable("MAFIA_SONDE_GEL") != "1")
                Assert.Inconclusive("sonde de gel INERTE : MAFIA_SONDE_GEL=1 non posée — rien n'est gelé (contrôle du chien de garde, lancé seul)");
            long n = 0;
            while (n >= 0) n = (n + 1) & long.MaxValue;   // ne rend JAMAIS la main : n reste ≥ 0 à jamais
        }
    }
}
