using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Operational.Exceptions;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // ⑨-1 — le tampon qui RÉSOUT, par la vraie route, avec le `method` et l'`id` SERVIS (Lot 0 D4). La garde porte sur la
    // REQUÊTE ÉMISE — route et corps — construite par `ExceptionsClient.ConstruireResolve`, la fonction même de l'envoi réel.
    // Les coutures du client (`Substitut…PourTest`) remplacent le FIL, jamais la construction : aucune requête ne part vers
    // la pile dev.
    // La carte est CONSTRUITE sur les valeurs de la carte réelle `ee5e4798` du corps figé du 06/09 (Lt. Rook, suggestion
    // `teach_idle`, method ONE_TIME, deux issues).
    //   R10     ChoixDuTampon : le method/id servis ; repli MethodFor si `method` manque (pile pré-D4) ; pas de suggestion ⇒ rien
    //   R10bis  ConstruireResolve : la route et le corps EXACTS
    //   R10ter  APPUI LONG ⇒ UNE requête POST …/ee5e4798…/resolve {"method":"ONE_TIME","chosen_action_id":"teach_idle"},
    //           l'issue est lue, la file est rechargée
    //   R10quater TAP ⇒ ouvre sa main, n'émet AUCUNE résolution (la moitié qui mord un tampon qui résoudrait au toucher)
    //   R10quint le sous-titre (N autres issues) et le papier PLEIN (famille du tampon de ⑯)
    [Category("EcranFile")]
    public class ExceptionsTamponPlayModeTests
    {
        private const string Id = "ee5e4798-a892-441a-9066-44574ed4bd6a";
        private GameObject hostGo;
        private ExceptionQueueController ecran;

        // Patron de `ExceptionQueuePlayModeTests` : `DestroyImmediate` arrête les coroutines SYNCHRONEMENT (un orphelin qui
        // parle pendant le test suivant fait accuser un innocent, TD-576) ; le catalogue i18n, global, est rendu ici.
        [TearDown]
        public void TearDown()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            if (ecran != null && ecran.LastNavGameObject != null) Object.DestroyImmediate(ecran.LastNavGameObject);
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            ecran = null; hostGo = null;
        }

        private static CandidateActionDto Action(string id, string method, string dsl = null) =>
            new CandidateActionDto { id = id, label = id, method = method, add_rule_dsl = dsl, effect = new ExceptionEffectDto() };

        private static ExceptionCardDto CarteRook() => new ExceptionCardDto
        {
            exception_id = Id,
            lieutenant_id = "01a075d7-6aed-728e-8f0a-b5dbd5caedee",
            lieutenant = new ExceptionLieutenantDto { id = "01a075d7-6aed-728e-8f0a-b5dbd5caedee", name = "Lt. Rook" },
            event_descriptor = "exc_demo_teach_idle",
            candidate_actions = new[]
            {
                Action("teach_idle", "ONE_TIME", "WHEN STATE(cook_idle,==,true) THEN EXECUTE_DEFAULT @10;"),
                Action("let_ride", "ONE_TIME"),
            },
            suggested_action = Action("teach_idle", "ONE_TIME", "WHEN STATE(cook_idle,==,true) THEN EXECUTE_DEFAULT @10;"),
            confidence_band = "likely", priority_band = "urgent", severity_band = "MODERATE", resolution_status = "pending",
        };

        private ExceptionQueueController NouvelEcran(params ExceptionCardDto[] cartes)
        {
            hostGo = new GameObject("ExceptionQueue", typeof(RectTransform));
            ecran = hostGo.AddComponent<ExceptionQueueController>();
            ecran.RendrePourTest(cartes);   // même frame que AddComponent : `Start` ne lancera pas `Boot` (réseau)
            return ecran;
        }

        [Test]
        public void R10_ChoixDuTampon_LeMethodEtLIdServis()
        {
            Assert.AreEqual(("ONE_TIME", "teach_idle"), ExceptionQueueController.ChoixDuTampon(CarteRook()).Value);

            ExceptionCardDto preD4 = CarteRook();
            preD4.suggested_action.method = "";
            Assert.AreEqual(("ONE_TIME", "teach_idle"), ExceptionQueueController.ChoixDuTampon(preD4).Value,
                "sans `method` servi (pile pré-D4) : repli déclaré sur MethodFor");

            ExceptionCardDto sansSuggestion = CarteRook();
            sansSuggestion.suggested_action = new CandidateActionDto();   // ce que JsonUtility rend pour `null`
            Assert.IsNull(ExceptionQueueController.ChoixDuTampon(sansSuggestion), "pas de suggestion ⇒ rien à résoudre");
        }

        [Test]
        public void R11_LeMarqueurSuitLEffet_JamaisRisquePourLEscalade()
        {
            // ⑩ (table 77 @6ed61816, f2 26/09) : le mot suit le TYPE servi de l'option, plus sa place dans l'éventail
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            var escalade = new CandidateActionDto { id = "esc", method = "ESCALATE", effect = new ExceptionEffectDto { type = "ESCALATE" } };
            var escaladeD4 = new CandidateActionDto { id = "esc2", method = "ESCALATE", effect = new ExceptionEffectDto() };
            var pot = new CandidateActionDto { id = "pot", method = "BRIBE", effect = new ExceptionEffectDto { type = "BRIBE" } };
            var reparer = new CandidateActionDto { id = "rep", method = "ONE_TIME", effect = new ExceptionEffectDto { type = "REPAIR" } };
            Assert.AreEqual("Sans suite", ExceptionDetailController.MarqueurDOption(escalade), "l'escalade archive : aucun aléa");
            Assert.AreEqual("Sans suite", ExceptionDetailController.MarqueurDOption(escaladeD4));
            Assert.AreEqual("Risqué", ExceptionDetailController.MarqueurDOption(pot), "BRIBE peut se retourner");
            Assert.IsNull(ExceptionDetailController.MarqueurDOption(reparer), "sans marqueur de son effet : aucun mot");
            foreach (var o in new[] { escalade, escaladeD4 })
                Assert.AreNotEqual("Risqué", ExceptionDetailController.MarqueurDOption(o), "garde : ESCALATE n'est JAMAIS « Risqué »");
        }

        [Test]
        public void R10bis_LaRequete_RouteEtCorpsExacts()
        {
            var r = ExceptionsClient.ConstruireResolve("http://localhost/", Id, "ONE_TIME", "teach_idle");
            Assert.AreEqual("http://localhost/v1/exceptions/" + Id + "/resolve", r.Url);
            Assert.AreEqual("{\"method\":\"ONE_TIME\",\"chosen_action_id\":\"teach_idle\"}", r.Corps);
        }

        [UnityTest]
        public IEnumerator R10ter_AppuiLong_EmetLaResolutionServie()
        {
            NouvelEcran(CarteRook());
            ExceptionsClient client = ecran.ClientPourTest;
            int envois = 0;
            client.SubstitutResolvePourTest = req => { envois++; return new ResolveResponse { resolved = true, outcome = "TAUGHT" }; };
            client.SubstitutFilePourTest = () => new ExceptionCardDto[0];

            Assert.IsNotNull(ecran.TamponAppuiLong, "une suggestion servie ⇒ le tampon porte l'appui long");
            ecran.TamponAppuiLong.SimulateCompletedLongPress();
            // ⛔ Attendre la FIN (issue lue ET file rechargée), pas seulement l'issue : `ResoudreLaSuggestion` pose l'issue,
            //    PUIS recharge la file dans une coroutine imbriquée, une frame plus tard. La v1 de ce test sortait de la boucle
            //    sur l'issue et lisait la file AVANT son rechargement — rouge au créneau du 22/09 (« Expected: 0 But was: 1 »),
            //    un défaut du TEST, pas du tampon.
            for (int f = 0; f < 10 && (ecran.DerniereIssue == null || ecran.Cards.Length != 0); f++) yield return null;

            Assert.AreEqual(1, envois, "UNE résolution émise");
            Assert.IsTrue(client.DerniereRequeteResolve.HasValue);
            // l'URL émise suit la source du client (ExceptionsClient.BaseUrl = AdresseDuBack.Url — garde de classe du 26/09)
            Assert.AreEqual(MafiaCleanCity.AdresseDuBack.Url.TrimEnd('/') + "/v1/exceptions/" + Id + "/resolve", client.DerniereRequeteResolve.Value.Url);
            Assert.AreEqual("{\"method\":\"ONE_TIME\",\"chosen_action_id\":\"teach_idle\"}", client.DerniereRequeteResolve.Value.Corps);
            Assert.AreEqual("TAUGHT", ecran.DerniereIssue);
            Assert.AreEqual(0, ecran.Cards.Length, "la file est rechargée après la résolution (le serveur fait foi)");
        }

        [UnityTest]
        public IEnumerator R10quater_Tap_OuvreSaMain_SansResoudre()
        {
            NouvelEcran(CarteRook());
            ExceptionsClient client = ecran.ClientPourTest;
            client.SubstitutResolvePourTest = req => new ResolveResponse { resolved = true, outcome = "TAUGHT" };
            Button tap = ecran.TamponAppuiLong.GetComponent<Button>();
            Assert.IsNotNull(tap);
            tap.onClick.Invoke();
            yield return null;
            Assert.IsNotNull(ecran.LastDetail, "le tap ouvre sa main (⑩)");
            Assert.IsFalse(client.DerniereRequeteResolve.HasValue, "un tap n'émet AUCUNE résolution");
        }

        [Test]
        public void R10quint_SousTitreEtPapierPlein()
        {
            Assert.AreEqual("suggéré · appui long — sa main : 5 autres issues ›", ExceptionQueueController.SousTitreTampon(5));
            Assert.AreEqual("suggéré · appui long — sa main : 1 autre issue ›", ExceptionQueueController.SousTitreTampon(1));
            Assert.AreEqual("suggéré · appui long — sa main ›", ExceptionQueueController.SousTitreTampon(0));
            Assert.AreEqual(1, ExceptionQueueController.AutresIssues(CarteRook()), "deux issues, dont la suggérée");

            NouvelEcran(CarteRook());
            Assert.AreEqual("TEACH_IDLE", ecran.TamponLibelleTexte, "le libellé servi, en capitales (ici la prose = l'id de la démo)");
            Assert.AreEqual("suggéré · appui long — sa main : 1 autre issue ›", ecran.TamponSousTexte);
            Image papier = ecran.TamponAppuiLong.GetComponent<Image>();
            Texture2D tex = papier.sprite.texture;
            Assert.Greater(tex.GetPixel(tex.width / 2, tex.height / 2).a, 0.99f, "papier PLEIN, jamais un contour teint");

            // SERVIE, la clé rend « autres issues » SANS l'espace du littéral (le slug le rogne) : l'espace est dans le code
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new System.Collections.Generic.Dictionary<string, string>
            {
                { "exceptions.bloc.autres_issues", "autres issues" }, { "exceptions.bloc.autre_issue", "autre issue" },
            });
            Assert.AreEqual("suggéré · appui long — sa main : 5 autres issues ›", ExceptionQueueController.SousTitreTampon(5));
            Assert.AreEqual("suggéré · appui long — sa main : 1 autre issue ›", ExceptionQueueController.SousTitreTampon(1));
        }
    }
}
