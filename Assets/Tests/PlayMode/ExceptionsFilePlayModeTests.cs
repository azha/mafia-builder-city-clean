using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Operational.Lieutenant;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑨-3 — la file au comptoir, cadre 14. Juge r1 : B2 (médaillons en pavés d'une teinte), M3 (rails gris), M8 (« Cinq
    // attendent » pour trois dessinés), M9 (pas de ▼), m3 (file étirée), m7 (pas de « B »). Gardes de STRUCTURE et de SOURCE.
    //   R12     les médaillons : buste des lieutenants (masqué) ; la ville = un « B », sans buste ; ▼ sur le premier seul ;
    //           les autres à .78 ; rails braise / or / cyan selon la gravité ; le nom servi
    //   R12bis  le rôle par jointure : absent avant, « Cuisinier · Grave · Critique » après ; jamais pour la ville
    //   R12ter  cinq cartes : trois attendants + « +2 » ; la file est tassée à gauche et alignée par le bas
    [Category("EcranFile")]
    public class ExceptionsFilePlayModeTests
    {
        private GameObject hostGo;
        private ExceptionQueueController ecran;

        [TearDown]
        public void TearDown()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            if (ecran != null && ecran.LastNavGameObject != null) Object.DestroyImmediate(ecran.LastNavGameObject);
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            ecran = null; hostGo = null;
        }

        private static ExceptionCardDto Carte(string id, string lieutenantId, string nom, string gravite, string priorite) =>
            new ExceptionCardDto
            {
                exception_id = id, lieutenant_id = lieutenantId,
                lieutenant = new ExceptionLieutenantDto { id = lieutenantId, name = nom },
                severity_band = gravite, priority_band = priorite, confidence_band = "likely",
                candidate_actions = new CandidateActionDto[0], suggested_action = new CandidateActionDto(),
            };

        private static ExceptionCardDto[] Trois() => new[]
        {
            Carte("a", "lt-kane", "Lt. Kane", "SEVERE", "critical"),
            Carte("b", "", "", "SEVERE", "urgent"),                    // la ville
            Carte("c", "lt-marr", "Lt. Marr", "MODERATE", "urgent"),
        };

        private void NouvelEcran(params ExceptionCardDto[] cartes)
        {
            hostGo = new GameObject("ExceptionQueue", typeof(RectTransform));
            ecran = hostGo.AddComponent<ExceptionQueueController>();
            ecran.RendrePourTest(cartes);
        }

        private Transform Attendant(int i) => ecran.AttendantsPourTest()[i].transform;

        [Test]
        public void R12_LesMedaillonsLesRailsLeChevron()
        {
            NouvelEcran(Trois());
            Sprite buste = Resources.Load<Sprite>(MedaillonAuComptoir.CheminBusteLieutenant);
            Assert.IsNotNull(buste);

            Transform kane = Attendant(0), ville = Attendant(1), marr = Attendant(2);
            Transform medKane = kane.Find("Medaillon");
            Assert.IsNotNull(medKane.GetComponent<Mask>(), "`.medl{overflow:hidden}`");
            Assert.AreSame(buste, medKane.Find("Buste").GetComponent<Image>().sprite, "le buste des lieutenants (B2)");
            Transform medVille = ville.Find("Medaillon");
            Assert.IsNull(medVille.Find("Buste"), "la ville n'a pas de buste");
            Assert.AreEqual("B", medVille.Find("VilleB").GetComponent<TextMeshProUGUI>().text, "`.ville-b` (m7)");

            Assert.IsNotNull(kane.Find("Chevron"), "▼ sur le premier (M9)");
            Assert.IsNull(ville.Find("Chevron"));
            Assert.IsNull(kane.GetComponent<CanvasGroup>(), "le premier est pleinement opaque");
            Assert.AreEqual(0.78f, ville.GetComponent<CanvasGroup>().alpha, 1e-4f, "`.attendant{opacity:.78}`");

            Assert.AreEqual(DesignTokens.Current.hudGaugeArcHot, kane.Find("Rail").GetComponent<Image>().color, "grave ⇒ braise (M3)");
            Assert.AreEqual(DesignTokens.Current.hudMoneyUnderlineGold, marr.Find("Rail").GetComponent<Image>().color, "modérée ⇒ or");
            Assert.AreEqual(DesignTokens.Current.hudGaugeArcCold, ExceptionQueueController.CouleurRail("MILD"), "légère ⇒ cyan");

            // ⑨ (atelier D36) : le nom vit dans l'étiquette d'une ligne (nom · métier)
            Assert.AreEqual("Lt. Kane", kane.Find("Etiquette/Nom").GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual("La ville", ville.Find("Etiquette/Nom").GetComponent<TextMeshProUGUI>().text);
        }

        [Test]
        public void R12bis_LeRoleParJointure()
        {
            NouvelEcran(Trois());
            Assert.AreEqual("Grave · Critique", ecran.LigneAttendant(ecran.Cards[0]), "avant la jointure : pas de rôle inventé");

            ecran.PoserRosterPourTest(new[]
            {
                new RosterRow { lieutenant_id = "lt-kane", name = "Lt. Kane", archetype = "COOK" },
                new RosterRow { lieutenant_id = "lt-marr", name = "Lt. Marr", archetype = "LOGISTICS" },
            });
            Assert.AreEqual("Cuisinier · Grave · Critique", ecran.LigneAttendant(ecran.Cards[0]));
            Assert.AreEqual("Logistique · Modérée · Urgente", ecran.LigneAttendant(ecran.Cards[2]));
            Assert.AreEqual("Grave · Urgente", ecran.LigneAttendant(ecran.Cards[1]), "la ville n'a pas de rôle");
        }

        [Test]
        public void R12ter_AuDelaDeTrois_UnPlusN_EtLaFileTasseeAGauche()
        {
            var cinq = new[]
            {
                Carte("a", "l1", "Lt. A", "SEVERE", "critical"), Carte("b", "l2", "Lt. B", "SEVERE", "urgent"),
                Carte("c", "l3", "Lt. C", "MODERATE", "urgent"), Carte("d", "l4", "Lt. D", "MILD", "watching"),
                Carte("e", "l5", "Lt. E", "MILD", "silent"),
            };
            NouvelEcran(cinq);
            Assert.AreEqual(3, ecran.AttendantsPourTest().Count, "trois attendants dessinés");
            Transform file = Attendant(0).parent;
            Transform plus = file.Find("EnPlus");
            Assert.IsNotNull(plus, "M8 : le compte annoncé a sa trace dans la file");
            Assert.AreEqual("+2", plus.GetComponent<TextMeshProUGUI>().text);
            Assert.AreEqual(TextAnchor.LowerLeft, file.GetComponent<HorizontalLayoutGroup>().childAlignment,
                "`.file{align-items:flex-end}` et tassée à gauche (m3, m4)");

            // E04′ — la ligne du soir est DITE : Georgia crème (`.ligne-soir`), reste du r1 M6.
            TextMeshProUGUI ligne = ecran.LigneSoir.GetComponent<TextMeshProUGUI>();
            Assert.AreSame(DesignTokens.Current.hudSerifFont, ligne.font, "`.ligne-soir{font-family:Georgia}`");
            Assert.AreEqual(DesignTokens.Current.hudCreme, ligne.color, "`.ligne-soir{color:var(--creme)}`");
        }
    }
}
