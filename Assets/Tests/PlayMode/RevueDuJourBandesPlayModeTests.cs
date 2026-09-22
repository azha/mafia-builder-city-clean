using NUnit.Framework;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑯-0 — la réserve de jetons d'un billet, contre le DOMAINE du back et non contre un exemple.
    //
    // Le domaine est le type, pas un corps : `TrustBudgetBucket = 'low' | 'standard' | 'high'`
    // (`services/game-back/src/core_loops/flag_discipline/convergence.ts:39`). La table du client
    // attendait `"normal"`, une valeur que le back ne sert JAMAIS : la bande du milieu tombait dans le
    // `default` et s'affichait 0 pastille · « RÉSERVE · — ». Rien ne rougissait, parce qu'une
    // réserve vide ressemble à une réserve qui l'est.
    //
    // ⇒ Garde positive : CHAQUE valeur du type rend une réserve non vide, avec son libellé.
    // ⇒ Garde négative : une valeur hors domaine, dont l'ancienne `"normal"`, NE se déguise PAS en
    //   bande connue. C'est elle qui prouve que la première ne passe pas par un `default` complaisant.
    // Tests purs ([Test], sans back ni scène) : ils ne consomment pas la pile dev.
    [Category("EcranRevue")]
    public class RevueDuJourBandesPlayModeTests
    {
        private static readonly string[] DomaineDuBack = { "low", "standard", "high" };

        [Test]
        public void R0_ChaqueValeurDuTypeBack_RendUneReserveNonVide()
        {
            int[] pastillesAttendues = { 1, 2, 3 };
            string[] libellesAttendus = { "FAIBLE", "NORMALE", "ÉLEVÉE" };
            for (int i = 0; i < DomaineDuBack.Length; i++)
            {
                string v = DomaineDuBack[i];
                Assert.AreEqual(pastillesAttendues[i], DailyReviewScreenController.ReservePastilles(v),
                    $"`{v}` est servie par le back : elle doit allumer {pastillesAttendues[i]} pastille(s)");
                Assert.AreEqual(libellesAttendus[i], DailyReviewScreenController.ReserveLibelle(v),
                    $"`{v}` est servie par le back : son libellé ne doit pas être le repli");
            }
        }

        [Test]
        public void R0bis_UneValeurHorsDomaine_NeSeDeguisePasEnBandeConnue()
        {
            foreach (string horsDomaine in new[] { "normal", "HIGH", "", null })
            {
                Assert.AreEqual(0, DailyReviewScreenController.ReservePastilles(horsDomaine),
                    $"`{horsDomaine ?? "null"}` n'est pas servie : aucune pastille");
                Assert.AreEqual("—", DailyReviewScreenController.ReserveLibelle(horsDomaine),
                    $"`{horsDomaine ?? "null"}` n'est pas servie : le libellé est le repli visible");
            }
        }
    }
}
