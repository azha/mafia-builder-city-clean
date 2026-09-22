using NUnit.Framework;
using UnityEngine;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑯ B05 — la chip « signale rarement / souvent », servie SUR LA CARTE par le lot back S5-e (71ae6f89) :
    // `flag_frequency_band` ∈ `FlagFrequencyBand = 'none' | 'occasional' | 'frequent'` (convergence.ts:35).
    //   R8     chacune des trois valeurs du TYPE rend une chip non vide (souvent / rarement / rarement)
    //   R8bis  champ absent (pile sans S5) ou valeur hors domaine ⇒ PAS de chip, jamais « — »
    //   R8ter  sur un billet : la chip est posée pour `frequent`, absente quand le corps ne porte pas le champ
    [Category("EcranRevue")]
    public class RevueDuJourFrequencePlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            if (hostGo != null) Object.Destroy(hostGo);
        }

        [Test]
        public void R8_ChaqueValeurDuType_RendUneChip()
        {
            Assert.AreEqual("signale souvent", DailyReviewScreenController.FrequenceChip("frequent"));
            Assert.AreEqual("signale rarement", DailyReviewScreenController.FrequenceChip("occasional"));
            Assert.AreEqual("signale rarement", DailyReviewScreenController.FrequenceChip("none"),
                "`none` = aucun signalement sur 7 jours : « rarement » le couvre (la maquette dessine deux mots)");
        }

        [Test]
        public void R8bis_ChampAbsentOuHorsDomaine_PasDeChip()
        {
            foreach (string v in new[] { null, "", "FREQUENT", "rare", "—" })
                Assert.IsNull(DailyReviewScreenController.FrequenceChip(v), $"`{v ?? "null"}` n'est pas servie : aucune chip");
        }

        [Test]
        public void R8ter_SurUnBillet_LaChipSuitLeCorps()
        {
            hostGo = new GameObject("DailyReviewScreen");
            hostGo.AddComponent<RectTransform>();
            var ecran = hostGo.AddComponent<DailyReviewScreenController>();
            ecran.AppliquerRevue(new FlagReviewResponseDto
            {
                cards = new[]
                {
                    new FlagCardDto { flag_id = "servi", flagged_game_day = 11, trust_budget_bucket = "low",
                                      flag_frequency_band = "frequent" },
                    new FlagCardDto { flag_id = "absent", flagged_game_day = 11, trust_budget_bucket = "low" },
                },
                routine_pending_count = 17, batch_confirm_available = true,
            });
            Assert.AreEqual("SIGNALE SOUVENT", ecran.BilletFrequence("servi"), "`.chip{text-transform:uppercase}`");
            Assert.IsNull(ecran.BilletFrequence("absent"), "la pile sans S5 ne sert pas le champ : pas de chip");
        }
    }
}
