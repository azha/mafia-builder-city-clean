using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑨-6 — les états de la file. Gardes de STRUCTURE et de SOURCE :
    //   R15     personne (cadre 16) : la plaque du soir « Ce soir, au Verge d’Or » / « Personne ne fait la queue » (63 v2) et trois
    //           tabourets vides REMPLACENT la ligne, la file, la bulle et le tampon ; des cartes ⇒ l'inverse
    //   R15bis  la phrase servie (`exceptions.file.ambiance`, branche `=0` du pluriel ICU) l'emporte sur le repli
    //   R15ter  UN seul code pour la plaque : ⑨ et ⑯ portent le même arbre (Verre, Bord, FiletInterieur), masqué, en pile
    // Rangée sous EcranFile : les comptes d'EcranExceptions et d'EcranRevue ne bougent pas.
    [Category("EcranFile")]
    public class ExceptionsEtatsPlayModeTests
    {
        private GameObject hostGo, revueGo;
        private ExceptionQueueController ecran;

        [TearDown]
        public void TearDown()
        {
            I18nCatalog.Oublier();
            PhaseDeSession.Oublier();
            // l'écran se monte sous le Canvas (`BuildLayout`), pas sous `hostGo` : sa racine part à la main
            if (ecran != null && ecran.Decor != null) Object.DestroyImmediate(ecran.Decor.transform.parent.gameObject);
            foreach (GameObject g in new[] { hostGo, revueGo })
                if (g != null) Object.DestroyImmediate(g);
            ecran = null; hostGo = null; revueGo = null;
        }

        private static ExceptionCardDto Carte(string id) => new ExceptionCardDto
        {
            exception_id = id, lieutenant_id = "lt-kane", lieutenant = new ExceptionLieutenantDto { id = "lt-kane", name = "Lt. Kane" },
            severity_band = "SEVERE", priority_band = "critical", confidence_band = "likely",
            candidate_actions = new CandidateActionDto[0], suggested_action = new CandidateActionDto(),
        };

        private void NouvelEcran(params ExceptionCardDto[] cartes)
        {
            hostGo = new GameObject("ExceptionQueue", typeof(RectTransform));
            ecran = hostGo.AddComponent<ExceptionQueueController>();
            ecran.RendrePourTest(cartes);
        }

        private static string[] Enfants(Transform t)
        {
            var n = new string[t.childCount];
            for (int i = 0; i < t.childCount; i++) n[i] = t.GetChild(i).name;
            return n;
        }

        [Test]
        public void R15_Personne_LaPlaqueDuSoirEtLesTabouretsRemplacentLaFile()
        {
            // classe « moment en dur » (1b3fdbe1, table 77) : le surtitre suit day_phase SERVI — au soir, « Ce soir » ; non servie, sans moment
            PhaseDeSession.Publier("DUSK");
            NouvelEcran();
            Assert.IsTrue(ecran.PlaqueDuSoir.activeSelf, "la plaque du soir (cadre 16)");
            Assert.AreEqual("Ce soir, au Verge d\u2019Or", ecran.PlaqueDuSoirSurtitre);
            Assert.AreEqual("Personne ne fait la queue", ecran.PlaqueDuSoirTitre,
                "table 63 v2 (26/09) : « la routine tient » était faux pour un joueur sans routine ; jamais « le comptoir est vide »");
            Assert.IsTrue(ecran.TabouretsVides.activeSelf);
            Assert.AreEqual(3, ecran.TabouretsVides.transform.childCount, "trois tabourets");
            Assert.IsNotNull(ecran.TabouretsVides.transform.GetChild(0).Find("Siege"));
            Assert.IsNotNull(ecran.TabouretsVides.transform.GetChild(0).Find("Pied"));
            Assert.AreEqual(0.85f, ecran.TabouretsVides.GetComponent<CanvasGroup>().alpha, 1e-4f, "`.tabourets.vides .tabouret{opacity:.85}`");
            Assert.IsFalse(ecran.LigneSoir.activeSelf, "le cadre 16 n'a pas de ligne du soir : la phrase est dans la plaque");
            Assert.IsFalse(ecran.FilePourTest.activeSelf);
            Assert.IsFalse(ecran.ParlePourTest.activeSelf);
            Assert.IsFalse(ecran.TamponPourTest.activeSelf);
            Assert.Less(ecran.TabouretsVides.transform.GetSiblingIndex(), ecran.PlaqueDuSoir.transform.GetSiblingIndex(),
                "les tabourets au-dessus de la plaque");

            ecran.RendrePourTest(new[] { Carte("a"), Carte("b") });
            Assert.IsFalse(ecran.PlaqueDuSoir.activeSelf);
            Assert.IsFalse(ecran.TabouretsVides.activeSelf);
            Assert.IsTrue(ecran.LigneSoir.activeSelf);
            Assert.IsTrue(ecran.FilePourTest.activeSelf);
            Assert.IsTrue(ecran.TamponPourTest.activeSelf);
        }

        [Test]
        public void R15bis_LaPhraseServie_BrancheZeroDuPluriel()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "exceptions.file.ambiance",
                  "{count, plural, =0 {Personne au zinc — la routine tient} one {Un seul attend} other {# attendent}}" },
            });
            Assert.AreEqual("Personne au zinc — la routine tient", ExceptionQueueController.AmbianceVide());
            I18nCatalog.Oublier();
            Assert.AreEqual("Personne ne fait la queue", ExceptionQueueController.AmbianceVide(), "le repli (table 63 v2, branche =0)");
        }

        [Test]
        public void R15ter_UnSeulCodePourLaPlaque_NeufEtSeize()
        {
            NouvelEcran();
            revueGo = new GameObject("DailyReviewScreen", typeof(RectTransform));
            var revue = revueGo.AddComponent<DailyReviewScreenController>();
            revue.AppliquerRevue(new FlagReviewResponseDto { cards = new FlagCardDto[0], routine_pending_count = 0 });
            Assert.IsTrue(revue.PlaqueDuMatinPresente);
            Transform matin = revue.PlaqueDuMatinTitre.transform.parent;
            Transform soir = ecran.PlaqueDuSoir.transform;

            CollectionAssert.AreEqual(Enfants(matin), Enfants(soir), "même arbre : Verre, Bord, FiletInterieur, Surtitre, Titre");
            foreach (Transform p in new[] { matin, soir })
            {
                Assert.IsNotNull(p.GetComponent<Mask>(), $"{p.name} : le verre est masqué (coins arrondis)");
                Assert.IsFalse(p.GetComponent<Mask>().showMaskGraphic);
                Assert.IsNotNull(p.GetComponent<VerticalLayoutGroup>(), $"{p.name} : surtitre puis titre, en pile");
                Assert.IsTrue(p.Find("Verre").GetComponent<LayoutElement>().ignoreLayout);
            }
        }
    }
}
