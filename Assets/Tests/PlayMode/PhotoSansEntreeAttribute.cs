using NUnit.Framework;
using NUnit.Framework.Interfaces;
using MafiaCleanCity.Mouvements;

namespace MafiaCleanCity.Tests
{
    /// <summary>
    /// L1 (design Tools/anim-l1/design-l1.md §1 R1, ratifié f2 11/11) — `shell.entree` fond l'écran d'un onglet en 160 ms RÉELS (`Time.unscaledTime`) : un test qui monte un
    /// `AppShell`, ouvre un 2ᵉ onglet et PHOTOGRAPHIE aussitôt verrait l'écran à α ≈ 0. Ces tests posent « Mouvement réduit » (`PolitiqueMouvement.Reduit`) AVANT de monter le shell :
    /// l'entrée est de durée 0, elle n'écrit jamais α < 1 (le comportement d'avant). Posée sur la classe de chaque test qui monte un `AppShell` ET photographie
    /// (recensement de la phase 0 : `Logs/anim-l1/phase0.txt`). Les tests qui montent leur propre régie (`RegieMouvement.PourTest()`) la remettent à `Plein` : `Oublier()`.
    /// </summary>
    [System.AttributeUsage(System.AttributeTargets.Class | System.AttributeTargets.Method)]
    public sealed class PhotoSansEntreeAttribute : System.Attribute, ITestAction
    {
        // `AppShell.CreerLaRegie` appelle `MouvementReduit.Appliquer()`, qui RELIT le réglage du joueur et le système et pose la politique : poser la politique seule
        // serait écrasé à la création du shell. On force donc la lecture du SYSTÈME (« animations désactivées » d'Android) — la source que ces tests contrôlent déjà ailleurs.
        private System.Func<bool> lectureAvant;   // champ d'INSTANCE : posé sur la classe ET une méthode, chaque attribut restaure SA lecture (revue ⊥ mineur 3)
        public ActionTargets Targets => ActionTargets.Test;
        public void BeforeTest(ITest test)
        {
            lectureAvant = MouvementReduit.LectureDuSysteme;
            MouvementReduit.LectureDuSysteme = () => true;
            RegieMouvement.PoserPolitique(PolitiqueMouvement.Reduit);
        }
        public void AfterTest(ITest test)
        {
            if (lectureAvant != null) MouvementReduit.LectureDuSysteme = lectureAvant;
            lectureAvant = null;
            RegieMouvement.PoserPolitique(PolitiqueMouvement.Plein);
        }
    }
}
