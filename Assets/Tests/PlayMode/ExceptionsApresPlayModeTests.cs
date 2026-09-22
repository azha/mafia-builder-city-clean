using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational.Exceptions;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑨-6 — après le tampon (cadre 17). Gardes de SOURCE et de STRUCTURE :
    //   R17     les 10 issues du back (lues sur `ExceptionBandes.DomaineIssue`) : chacune un mot de cachet non vide, jamais
    //           l'enum brut, jamais « — » ; une issue inconnue rend « — » ; la clé servie l'emporte
    //   R17bis  la carte tranchée garde la première place, `.parti` (sans bouton, .28, rail gris), le suivant s'avance (▼) ;
    //           « Deux attendent encore » ; le bloc de l'après entre la file et la bulle : cachet « EN RÉPARATION »,
    //           « Lt. Kane retourne au travail », « Le bâtiment se remet en marche, avec le temps » ; le cachet HORS du masque
    //   R17ter  pas de phrase inventée : autre issue sans clé ⇒ pas de titre, avec clé servie ⇒ la conséquence servie ; la
    //           ville n'a pas de surtitre ; une carte que le serveur sert encore n'est pas « partie »
    //   R17quater  par la vraie résolution (coutures, aucune requête) : l'après apparaît, puis disparaît au rechargement suivant
    [Category("EcranFile")]
    public class ExceptionsApresPlayModeTests
    {
        private GameObject hostGo;
        private ExceptionQueueController ecran;

        [TearDown]
        public void TearDown()
        {
            I18nCatalog.Oublier();
            if (ecran != null && ecran.LastNavGameObject != null) Object.DestroyImmediate(ecran.LastNavGameObject);
            if (ecran != null && ecran.Decor != null) Object.DestroyImmediate(ecran.Decor.transform.parent.gameObject);
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            ecran = null; hostGo = null;
        }

        private static readonly Dictionary<string, string> Mots = new Dictionary<string, string>
        {
            { "RESOLVED", "RÉGLÉ" }, { "ESCALATED", "ARCHIVÉ" }, { "REPAIRING", "EN RÉPARATION" },
            { "REPAIRING_SLOW", "RÉPARATION LENTE" }, { "BRIBE_SUCCEEDED", "ARRANGÉ" }, { "BRIBE_FAILED", "ÇA S'EST RETOURNÉ" },
            { "LAID_LOW", "PROFIL BAS" }, { "TAUGHT", "RÈGLE APPRISE" }, { "DEFERRED", "REMIS À PLUS TARD" }, { "DEMOLISHED", "RASÉ" },
        };

        private static CandidateActionDto Reparer() => new CandidateActionDto
        {
            id = "repair", label = "Repair", method = "REPAIR",
            effect = new ExceptionEffectDto { type = "REPAIR", target_building_id = "b-1" },
        };

        private static ExceptionCardDto Kane() => new ExceptionCardDto
        {
            exception_id = "k", lieutenant_id = "lt-kane", lieutenant = new ExceptionLieutenantDto { id = "lt-kane", name = "Lt. Kane" },
            event_descriptor = "They turned the building over last night.",
            severity_band = "SEVERE", priority_band = "critical", confidence_band = "confident",
            candidate_actions = new[] { Reparer() }, suggested_action = Reparer(),
        };

        private static ExceptionCardDto Ville() => new ExceptionCardDto
        {
            exception_id = "v", lieutenant_id = "", lieutenant = new ExceptionLieutenantDto(),
            severity_band = "SEVERE", priority_band = "urgent", confidence_band = "confident",
            candidate_actions = new CandidateActionDto[0], suggested_action = new CandidateActionDto(),
        };

        private static ExceptionCardDto Marr() => new ExceptionCardDto
        {
            exception_id = "m", lieutenant_id = "lt-marr", lieutenant = new ExceptionLieutenantDto { id = "lt-marr", name = "Lt. Marr" },
            severity_band = "MODERATE", priority_band = "urgent", confidence_band = "likely",
            candidate_actions = new CandidateActionDto[0], suggested_action = new CandidateActionDto(),
        };

        private void NouvelEcran(params ExceptionCardDto[] cartes)
        {
            hostGo = new GameObject("ExceptionQueue", typeof(RectTransform));
            ecran = hostGo.AddComponent<ExceptionQueueController>();
            ecran.RendrePourTest(cartes);   // même frame que AddComponent : `Start` ne lancera pas `Boot` (réseau)
        }

        [Test]
        public void R17_LesDixIssues_UnMotDeCachetChacune()
        {
            foreach (string v in ExceptionBandes.DomaineIssue)
            {
                string mot = ExceptionBandes.Issue(v);
                Assert.IsFalse(string.IsNullOrWhiteSpace(mot), v);
                Assert.AreNotEqual(ExceptionBandes.Inconnue, mot, v);
                Assert.IsFalse(string.Equals(v, mot, System.StringComparison.OrdinalIgnoreCase), $"{v} : l'enum brut");
                Assert.IsTrue(Mots.TryGetValue(v, out string attendu), $"{v} : sans mot attendu");
                Assert.AreEqual(attendu, mot, v);
            }
            Assert.AreEqual(Mots.Count, ExceptionBandes.DomaineIssue.Length, "aucun mot orphelin");
            Assert.AreEqual(ExceptionBandes.Inconnue, ExceptionBandes.Issue("EXPLODED"), "hors domaine : « — », jamais l'enum");
            Assert.AreEqual(ExceptionBandes.Inconnue, ExceptionBandes.Issue(null));

            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string> { { "exception_detail.outcome.repairing", "UNDER REPAIR" } });
            Assert.AreEqual("UNDER REPAIR", ExceptionBandes.Issue("REPAIRING"), "la clé servie, dérivée de la valeur");
            Assert.AreEqual("RASÉ", ExceptionBandes.Issue("DEMOLISHED"), "clé absente ⇒ le repli");
        }

        [Test]
        public void R17bis_LaCarteTrancheeGardeSaPlace_EtLeBlocDeLApres()
        {
            // Un écran VIDE d'abord : `RendreFile` vide la file par `Destroy`, différé à la fin de la frame — un premier rendu
            // à trois cartes laisserait ses attendants dans l'arbre pendant ce test synchrone.
            NouvelEcran();
            ecran.PoserApresPourTest(Kane(), "REPAIRING", Reparer(), new[] { Ville(), Marr() });

            GameObject parti = ecran.PartiPourTest;
            Assert.IsNotNull(parti, "la carte tranchée garde sa place (cadre 17)");
            Assert.AreEqual(0, parti.transform.GetSiblingIndex(), "la PREMIÈRE place");
            Assert.IsNull(parti.GetComponent<Button>(), "réglée : on ne la rouvre pas");
            Assert.IsNull(parti.transform.Find("Chevron"));
            Assert.AreEqual(0.28f, parti.GetComponent<CanvasGroup>().alpha, 1e-4f, "`.attendant.parti{opacity:.28}`");
            Color rail = parti.transform.Find("Rail").GetComponent<Image>().color;
            Assert.AreEqual(rail.r, rail.g, 1e-4f, "`grayscale(1)` sur le rail");
            Assert.AreEqual(rail.g, rail.b, 1e-4f);

            Assert.AreEqual(2, ecran.AttendantsPourTest().Count, "trois places dessinées, la tranchée en prend une");
            Assert.IsNotNull(ecran.AttendantsPourTest()[0].transform.Find("Chevron"), "le suivant s'avance : ▼");
            Assert.AreEqual("Deux attendent encore", ecran.LigneSoirTexte);

            Assert.IsTrue(ecran.ApresBloc.activeSelf);
            Assert.AreEqual("EN RÉPARATION", ecran.ApresCachet);
            Assert.AreEqual("Lt. Kane retourne au travail", ecran.ApresKicker, "atelier §3.5 : le nom servi, pas l'archétype");
            Assert.AreEqual("Le bâtiment se remet en marche, avec le temps", ecran.ApresTitre);
            Transform apres = ecran.ApresBloc.transform;
            Assert.AreEqual(ecran.FilePourTest.transform.GetSiblingIndex() + 1, apres.GetSiblingIndex(), "juste après la file");
            Assert.AreEqual(apres.GetSiblingIndex() + 1, ecran.ParlePourTest.transform.GetSiblingIndex(), "juste avant la bulle");
            Transform cachet = apres.Find("Cachet");
            Assert.IsNull(cachet.parent.GetComponent<Mask>(), "le cachet déborde (top:-10) : jamais sous le masque du verre");
            Assert.IsNotNull(apres.Find("Verre").GetComponent<Mask>());
            Assert.IsTrue(cachet.GetComponent<LayoutElement>().ignoreLayout);
        }

        [Test]
        public void R17ter_PasDePhraseInventee_LaVilleSansSurtitre_LeServeurFaitFoi()
        {
            Assert.IsNull(ExceptionQueueController.TitreApres("LAID_LOW", new CandidateActionDto { projected_consequence = "You lie low." }),
                "une autre issue sans clé : pas de titre, jamais la prose producteur");
            var avecCle = new CandidateActionDto { projected_consequence_i18n = new I18nRefDto { key = "exception.heat.lay_low.projected_consequence" } };
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
                { { "exception.heat.lay_low.projected_consequence", "on se fait oublier quelques jours" } });
            Assert.AreEqual("On se fait oublier quelques jours", ExceptionQueueController.TitreApres("LAID_LOW", avecCle));
            Assert.IsNull(ExceptionQueueController.KickerApres(Ville()), "la ville ne « retourne » nulle part");

            NouvelEcran(Kane(), Marr());
            ecran.PoserApresPourTest(Kane(), "REPAIRING", Reparer(), new[] { Kane(), Marr() });
            Assert.IsFalse(ecran.ApresPresent, "le serveur sert encore la carte : elle n'est pas partie");
            Assert.IsNull(ecran.PartiPourTest);
            Assert.IsFalse(ecran.ApresBloc.activeSelf);
        }

        [UnityTest]
        public IEnumerator R17quater_ParLaVraieResolution_PuisLeRechargementSuivant()
        {
            NouvelEcran(Kane(), Ville(), Marr());
            ExceptionsClient client = ecran.ClientPourTest;
            client.SubstitutResolvePourTest = r => new ResolveResponse { resolved = true, outcome = "REPAIRING" };
            client.SubstitutFilePourTest = () => new[] { Ville(), Marr() };
            client.SubstitutEscalationsPourTest = () => 0;

            yield return ecran.ResoudreLaSuggestion();
            Assert.AreEqual("REPAIRING", ecran.DerniereIssue);
            Assert.IsTrue(ecran.ApresPresent, "le rechargement de la résolution garde la tranchée");
            Assert.AreEqual("EN RÉPARATION", ecran.ApresCachet);
            Assert.IsNotNull(ecran.PartiPourTest);

            yield return ecran.LoadQueue();
            Assert.IsFalse(ecran.ApresPresent, "le rechargement SUIVANT l'efface : l'après dit ce qui vient d'arriver");
            Assert.IsNull(ecran.PartiPourTest);
            Assert.AreEqual("Deux attendent vos ordres — la file est calme", ecran.LigneSoirTexte);
        }
    }
}
