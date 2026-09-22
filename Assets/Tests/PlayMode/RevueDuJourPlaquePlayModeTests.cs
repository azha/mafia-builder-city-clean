using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ⑯-2 — la plaque du matin, cadre v4-1 « personne au comptoir ».
    //
    // Le juge ⊥ r1 (2026-09-06) a mesuré, contre le cadre ratifié : plaque et surtitre absents (F3),
    // or devenu gris chaud (F4), hauteur de capitale −18,9 % (F6), texte centré au lieu d'être ferré
    // à gauche (F7). Ces gardes portent sur la STRUCTURE et les SOURCES (quel jeton, quelle police,
    // quel alignement, quel texte), jamais sur des pixels : elles tiennent à toute résolution.
    //   R2    file vide ⇒ plaque présente, masquée (coins arrondis), surtitre en capitales crème-2,
    //         titre = texte de v4-1, or-vif, serif, ferré à gauche, plus grand que le surtitre
    //   R2bis des cartes ⇒ pas de plaque (la moitié qui mord : une plaque toujours posée passerait R2)
    [Category("EcranRevue")]
    public class RevueDuJourPlaquePlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            if (hostGo != null) Object.Destroy(hostGo);
        }

        private DailyReviewScreenController NouvelEcran()
        {
            hostGo = new GameObject("DailyReviewScreen");
            hostGo.AddComponent<RectTransform>();
            return hostGo.AddComponent<DailyReviewScreenController>();
        }

        private static FlagReviewResponseDto Revue(int cartes)
        {
            var liste = new FlagCardDto[cartes];
            for (int i = 0; i < cartes; i++)
                liste[i] = new FlagCardDto { flag_id = "f" + i, flagged_game_day = 11, trust_budget_bucket = "low" };
            return new FlagReviewResponseDto { cards = liste, routine_pending_count = 9, batch_confirm_available = true };
        }

        private static bool Gauche(TextAlignmentOptions a) =>
            a == TextAlignmentOptions.Left || a == TextAlignmentOptions.TopLeft ||
            a == TextAlignmentOptions.BottomLeft || a == TextAlignmentOptions.BaselineLeft;

        [Test]
        public void R2_FileVide_LaPlaqueDuMatinPorteLeTexteEtLesSourcesDeV41()
        {
            var ecran = NouvelEcran();
            ecran.AppliquerRevue(Revue(0));

            Assert.IsTrue(ecran.PlaqueDuMatinPresente, "F3 : la plaque existe sur une file vide");
            TextMeshProUGUI titre = ecran.PlaqueDuMatinTitre;
            TextMeshProUGUI surtitre = ecran.PlaqueDuMatinSurtitre;
            Assert.IsNotNull(titre);
            Assert.IsNotNull(surtitre);

            // la plaque est un verre arrondi : un masque, sinon le dégradé sort en carré
            Mask masque = titre.transform.parent.GetComponent<Mask>();
            Assert.IsNotNull(masque, "le titre est porté par la plaque masquée");
            Assert.AreSame(titre.transform.parent, surtitre.transform.parent, "surtitre et titre sur la même plaque");

            Assert.AreEqual("Vos lieutenants ont tenu la ligne — rien ne réclame votre parole", titre.text,
                "mot pour mot le cadre v4-1");
            Assert.AreEqual("Ce matin, au Verge d’Or", surtitre.text);
            Assert.IsTrue((surtitre.fontStyle & FontStyles.UpperCase) != 0, "`.kicker` : text-transform uppercase");

            Assert.AreEqual(DesignTokens.Current.hudMoneyGold, titre.color, "F4 : `--or-vif`, pas le gris chaud");
            Assert.AreEqual(DesignTokens.Current.hudCremeSecondary, surtitre.color, "`--creme-2`");
            Assert.AreSame(DesignTokens.Current.hudSerifFont, titre.font, "`.titre` : Georgia ⇒ la serif du projet");
            Assert.IsTrue(Gauche(titre.alignment), $"F7 : ferré à gauche, pas {titre.alignment}");
            Assert.IsTrue(Gauche(surtitre.alignment), $"F7 : ferré à gauche, pas {surtitre.alignment}");
            Assert.Greater(titre.fontSize, surtitre.fontSize * 1.8f, "15 px contre 8 px dans la CSS");
        }

        [Test]
        public void R2bis_DesCartes_PasDePlaqueDuMatin()
        {
            var ecran = NouvelEcran();
            ecran.AppliquerRevue(Revue(2));

            Assert.AreEqual(2, ecran.RenderedCardCount);
            Assert.IsFalse(ecran.PlaqueDuMatinPresente, "la plaque dit « personne au comptoir » : pas avec des billets");
        }
    }
}
