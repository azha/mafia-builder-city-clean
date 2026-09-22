using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑯-9 — UN seul code pour le médaillon au comptoir. ⑯-5 le dessinait avec son propre code, ⑨-3 avec `MedaillonAuComptoir` :
    // deux codes du même dessin divergent au premier correctif. La garde compare le médaillon d'un billet de ⑯ à un appel DIRECT
    // de `MedaillonAuComptoir` avec les MÊMES paramètres (40 px CSS, rayon 14, trait 1, le buste des lieutenants) : même arbre,
    // mêmes INSTANCES de sprites (le cache procédural rend la même instance pour la même clé), même géométrie du buste.
    // Et ⑨ porte le même arbre (Face, Buste, Bord), à ses propres paramètres.
    // Rangée sous EcranFile : le compte d'EcranRevue ne bouge pas.
    [Category("EcranFile")]
    public class MedaillonAuComptoirPlayModeTests
    {
        // ⛔ TD-576, CLASSE « CATALOGUE » (2026-09-23) — cette classe charge le catalogue i18n (directement, ou en montant un
        // écran / le shell / la scène du build qui l'amorce) et ne le rendait JAMAIS : global statique, il passait à la classe
        // suivante. Mesuré : le 1er cas d'`ArchetypeServi_…` a hérité d'un bundle réel laissé en amont. Rendu à chaque test ;
        // la garde de sortie de MafiaCI nomme toute classe qui le laisserait encore chargé.
        [TearDown] public void OublierLeCatalogue() => MafiaCleanCity.I18n.I18nCatalog.Oublier();

        private const float K = 1280f / 300f;
        private GameObject revueGo, fileGo, temoinGo;

        [TearDown]
        public void TearDown()
        {
            foreach (GameObject g in new[] { revueGo, fileGo, temoinGo })
                if (g != null) Object.DestroyImmediate(g);
        }

        private static string[] Enfants(Transform t)
        {
            var n = new string[t.childCount];
            for (int i = 0; i < t.childCount; i++) n[i] = t.GetChild(i).name;
            return n;
        }

        [Test]
        public void M9_SeizeEtNeufRendentLeMemeMedaillon()
        {
            Sprite buste = Resources.Load<Sprite>(MedaillonAuComptoir.CheminBusteLieutenant);
            Assert.IsNotNull(buste);

            revueGo = new GameObject("DailyReviewScreen", typeof(RectTransform));
            var revue = revueGo.AddComponent<DailyReviewScreenController>();
            revue.AppliquerRevue(new FlagReviewResponseDto
            {
                cards = new[] { new FlagCardDto { flag_id = "f0", flagged_game_day = 11, trust_budget_bucket = "high",
                                                  lieutenant = new LieutenantRefDto { id = "l", name = "Lt. Hara" } } },
                routine_pending_count = 17, batch_confirm_available = true,
            });
            Transform medRevue = revue.BilletBuste("f0").transform.parent;

            temoinGo = new GameObject("Temoin", typeof(RectTransform));
            Transform medTemoin = MedaillonAuComptoir.Construire(temoinGo.transform, "Medaillon", 40f * K, 14f * K, 1f * K, buste).transform;

            CollectionAssert.AreEqual(Enfants(medTemoin), Enfants(medRevue), "même arbre (Face, Buste, Bord)");
            Assert.AreSame(medTemoin.GetComponent<Image>().sprite, medRevue.GetComponent<Image>().sprite, "même masque arrondi");
            Assert.AreEqual(medTemoin.GetComponent<Image>().color, medRevue.GetComponent<Image>().color, "même fond (bord du radial)");
            Assert.AreSame(medTemoin.Find("Face").GetComponent<Image>().sprite, medRevue.Find("Face").GetComponent<Image>().sprite, "même face");
            Assert.AreSame(medTemoin.Find("Bord").GetComponent<Image>().sprite, medRevue.Find("Bord").GetComponent<Image>().sprite, "même bord laiton");
            var bT = (RectTransform)medTemoin.Find("Buste"); var bR = (RectTransform)medRevue.Find("Buste");
            Assert.AreEqual(bT.sizeDelta, bR.sizeDelta, "buste à 74 %");
            Assert.AreEqual(bT.anchoredPosition, bR.anchoredPosition, "buste posé sur le bord intérieur");

            fileGo = new GameObject("ExceptionQueue", typeof(RectTransform));
            var file = fileGo.AddComponent<ExceptionQueueController>();
            file.RendrePourTest(new[] { new ExceptionCardDto { exception_id = "a", lieutenant_id = "l",
                lieutenant = new ExceptionLieutenantDto { id = "l", name = "Lt. Kane" }, severity_band = "SEVERE",
                priority_band = "critical", candidate_actions = new CandidateActionDto[0], suggested_action = new CandidateActionDto() } });
            Transform medFile = file.AttendantsPourTest()[0].transform.Find("Medaillon");
            CollectionAssert.AreEqual(Enfants(medTemoin), Enfants(medFile), "⑨ porte le même arbre, à ses paramètres");
        }
    }
}
