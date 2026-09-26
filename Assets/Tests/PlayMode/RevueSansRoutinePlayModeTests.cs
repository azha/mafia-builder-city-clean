using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.I18n;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑯ — ÉTAT VIDE FAUX (passe UX 2026-09-26, table 63 v2) : « Vos lieutenants ont tenu la ligne » flattait un joueur SANS routine.
    // 0 carte ET 0 routine ⇒ « rien à tenir : donnez-leur une première règle », qui mène à ⑧. Hors réseau.
    //   V1  0 carte, 0 routine ⇒ la phrase de la table, et le toucher mène à la Famille (⑥ porte ⑧)
    //   V2  0 carte, des routines en attente ⇒ la phrase d'avant (vraie), et le toucher ne mène nulle part
    [Category("RevueSansRoutine")]
    public class RevueSansRoutinePlayModeTests
    {
        private GameObject hote;

        [TearDown]
        public void TearDown()
        {
            if (hote != null) Object.DestroyImmediate(hote);
            I18nCatalog.Oublier();
        }

        private DailyReviewScreenController Ecran()
        {
            hote = new GameObject("Revue", typeof(RectTransform));
            return hote.AddComponent<DailyReviewScreenController>();
        }

        [Test]
        public void V1_RienATenir_UnePremiereRegle()
        {
            var e = Ecran();
            e.AppliquerRevue(new FlagReviewResponseDto { cards = new FlagCardDto[0], routine_pending_count = 0 });
            Assert.IsTrue(e.RienATenir);
            // U+00A0 avant « : », à l'octet de la table 63 v2 (mesuré au créneau du 26/09 : l'espace ordinaire du littéral rougissait)
            Assert.AreEqual("Vos lieutenants n’ont encore rien à tenir\u00A0: donnez-leur une première règle.", e.PlaqueDuMatinTitre.text);
            e.OuvrirLaFamille();
            Assert.AreEqual(1, e.OuverturesDeLaFamille, "le toucher mène à ⑧ (dans la Famille)");
        }

        [Test]
        public void V2_DesRoutinesEnAttente_LaPhraseDAvant()
        {
            var e = Ecran();
            e.AppliquerRevue(new FlagReviewResponseDto { cards = new FlagCardDto[0], routine_pending_count = 9, batch_confirm_available = true });
            Assert.IsFalse(e.RienATenir);
            Assert.AreEqual("Vos lieutenants ont tenu la ligne — rien ne réclame votre parole", e.PlaqueDuMatinTitre.text);
            e.OuvrirLaFamille();
            Assert.AreEqual(0, e.OuverturesDeLaFamille, "hors de l'état « rien à tenir », le toucher ne mène nulle part");
        }
    }
}
