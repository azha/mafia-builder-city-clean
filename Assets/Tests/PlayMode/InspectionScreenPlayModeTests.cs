using System.Collections;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.CitySim.Inspection;
using MafiaCleanCity.Tests;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CitySim.Inspection.Tests
{
    // ⑮ — D2 (le registre des 18) et D3 (le dépôt), fermés le 2026-09-22.
    //
    // ⛔ CE QUE CES TESTS PROUVENT, ET CE QU'ILS NE PROUVENT PAS. Ils lisent l'ÉTAT du contrôleur après
    // son rendu (18 lignes, 18 files ouvertes, un prix lu dans la réponse) — jamais un pixel. La
    // planche, elle, reste prise par `PlancheEcransCapturePlayModeTests` (catégorie PhotoPlanche),
    // sur le compte de capture, dans le créneau du juge.
    //
    // ⚠️ Le compte SEMÉ (`operational_demo`, le seeder le rend) sert aux deux lectures et au dépôt :
    // ses 18 files existent parce que la pile a déjà vécu le tick de dispatch (mesuré 18 × 200 le
    // 2026-09-22). Sur une pile NEUVE, le premier test échouera avec ce message-là — c'est la réserve
    // du juge (S12-d), pas un défaut du client : « 404 au signup, après dépôt, et 5 min plus tard ».
    [Category("Inspection")]
    public class InspectionScreenPlayModeTests
    {
        private static string BaseUrl => MafiaCleanCity.AdresseDuBack.Url;   // la source du shell (garde de classe, 26/09)
        private static string email;
        private static string password;
        private static int callsignSeq;
        private GameObject host;
        private string token;

        [OneTimeSetUp]
        public void SemerPrecondition()
        {
            string json = SeederSupport.RunSeeder(
                SeederSupport.OperationalSeeder, SeederSupport.OperationalMarker);
            email = SeederSupport.ExtractString(json, "email");
            password = SeederSupport.ExtractString(json, "password");
            Assert.IsNotEmpty(email, "le seeder a rendu l'identité du joueur");
            Assert.IsNotEmpty(password, "le seeder a rendu son mot de passe");
        }

        [TearDown]
        public void Nettoyer()
        {
            if (host != null) Object.Destroy(host);
        }

        private InspectionScreenController Monter()
        {
            host = new GameObject("InspectionHost", typeof(RectTransform));
            return host.AddComponent<InspectionScreenController>();
        }

        private IEnumerator SeConnecterAuCompteSeme()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string err = null;
            token = null;
            yield return auth.SignIn(email, password, t => token = t, e => err = e);
            Assert.IsNull(err, $"connexion du joueur seedé : {err}");
            Assert.IsNotEmpty(token, "la connexion a rendu un bearer");
        }

        private IEnumerator OuvrirUnCompteFrais()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("insp", ref callsignSeq);
            string err = null;
            token = null;
            yield return auth.SignUp(callsign, "inspection-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup a échoué : {err}");
            Assert.IsNotEmpty(token, "le signup a rendu un bearer");
        }

        private static IEnumerator AttendreLeRendu(InspectionScreenController ecran, float secondes = 60f)
        {
            float deadline = Time.realtimeSinceStartup + secondes;
            while (ecran.RendusEffectues == 0 && Time.realtimeSinceStartup < deadline)
                yield return null;
            Assert.Greater(ecran.RendusEffectues, 0,
                "l'écran n'a pas fini son chargement (1 + 18 + 1 appels) dans le délai");
        }

        // ═══ D2 — le registre ═══════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator Registre_18Districts_ToutOuRien_SurLeCompteSeme()
        {
            yield return SeConnecterAuCompteSeme();
            var ecran = Monter();
            ecran.SetToken(token);
            yield return AttendreLeRendu(ecran);

            Assert.IsNull(ecran.DerniereErreur, $"une file a répondu autre chose que 200/404 : {ecran.DerniereErreur}");
            Assert.IsNotNull(ecran.Districts, "les noms (`world/districts`) ne sont pas arrivés");
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecran.Districts.Length,
                "le monde ne sert pas 18 districts — le cardinal du pied serait faux");
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecran.FilesOuvertes,
                "⛔ tout ou rien : le compte semé doit avoir ses 18 files (la pile a-t-elle vécu le tick de " +
                "dispatch de 12 h ? S12-d — sur pile neuve, 18 × 404 est l'état normal, pas un défaut du client)");
            Assert.IsFalse(ecran.EtatVide, "18 files ouvertes et l'écran se dit vide");
            Assert.AreEqual(InspectionScreenController.NombreDeDistricts, ecran.LignesRendues,
                "le registre n'a pas 18 lignes — avant D2, il en avait UNE, toujours le district 1");
            for (int k = 0; k < ecran.Files.Length; k++)
                Assert.IsNotNull(ecran.Files[k], $"district {k + 1} : file absente alors que le registre est ouvert");
        }

        [UnityTest]
        public IEnumerator Registre_CompteFrais_RienNullePart_18Fois404()
        {
            yield return OuvrirUnCompteFrais();
            var ecran = Monter();
            ecran.SetToken(token);
            yield return AttendreLeRendu(ecran);

            Assert.IsNull(ecran.DerniereErreur,
                $"un 404 est un ÉTAT, pas une panne — et l'écran a enregistré : {ecran.DerniereErreur}");
            Assert.AreEqual(0, ecran.FilesOuvertes, "un compte frais n'a aucune file : la police n'a pas encore ouvert");
            Assert.IsTrue(ecran.EtatVide, "0 file ouverte et l'écran ne se dit pas vide");
            Assert.AreEqual(0, ecran.LignesRendues, "tout ou rien : 0 file ⇒ 0 ligne, jamais 18 lignes éteintes");
        }

        // ═══ D3 — le dépôt ══════════════════════════════════════════════════════════════════════

        [UnityTest]
        public IEnumerator Depot_CompteSeme_LePrixEstCeluiDeLaReponse()
        {
            yield return SeConnecterAuCompteSeme();
            var ecran = Monter();
            ecran.SetToken(token);
            yield return AttendreLeRendu(ecran);

            Assert.IsNotNull(ecran.Cible, "le compte semé possède des bâtiments (17 mesurés) : la cible du dépôt doit exister");
            Assert.IsTrue(ecran.PeutDeposer, "avec une cible et un jeton, le geste doit être ouvert");
            int rendusAvant = ecran.RendusEffectues;

            // un signalement FONDÉ, pas le faux du bouton : voir `DeposerPourTest` — le registre des
            // signalements n'est pas purgé par le seeder, et 8 faux pour 1 fondé retournent la police.
            yield return ecran.DeposerPourTest("GENUINE_REPORT");

            Assert.IsNull(ecran.DerniereErreurDepot, $"le dépôt a échoué : {ecran.DerniereErreurDepot}");
            Assert.IsNotNull(ecran.DernierRapport, "la réponse à 4 clés n'est pas arrivée");
            Assert.AreEqual("GENUINE_REPORT", ecran.DernierRapport.entry_type, "le type déposé revient tel quel");
            Assert.Greater(ecran.DernierRapport.cost_resolved, 0, "le prix est SERVI (50 mesuré), jamais deviné");
            Assert.IsFalse(ecran.DernierRapport.backlash_triggered, "un signalement fondé ne retourne jamais la police");
            StringAssert.Contains(ecran.DernierRapport.cost_resolved.ToString(), ecran.TexteDuPrix,
                "le prix affiché est celui de la réponse, pas un littéral");
            Assert.AreEqual("", ecran.TexteDuBaton, "sans retour de bâton, la ligne du bâton reste éteinte");
            Assert.Greater(ecran.RendusEffectues, rendusAvant, "après le dépôt, le registre est relu et redessiné");
        }

        [UnityTest]
        public IEnumerator Depot_CompteFrais_LeKitDeDepartEstLaCible_EtLeDepotPasse()
        {
            // ⛔ PRÉMISSE FAUSSE, PAYÉE AU PREMIER RUN (créneau du 22/09, 13:32) : « un compte frais ne
            //    possède rien ». Faux — la planque est donnée à l'arrivée (㊵·142), donc `me/buildings`
            //    n'est jamais vide et la cible existe dès le signup. L'état « aucun bâtiment à vous »
            //    n'est atteignable par aucun compte réel ; il reste une garde de code, exercée ci-dessous
            //    SANS jeton. Ce test prouve l'inverse de ce que je croyais : le dépôt passe sur un
            //    compte frais (le juge l'avait mesuré : 201 sur son compte frais, 07/09).
            yield return OuvrirUnCompteFrais();
            var ecran = Monter();
            ecran.SetToken(token);
            yield return AttendreLeRendu(ecran);

            Assert.IsNotNull(ecran.Cible, "un compte frais possède son kit de départ : la cible du dépôt existe dès le signup");
            Assert.IsTrue(ecran.PeutDeposer, "avec une cible et un jeton, le geste est ouvert — même le premier jour");
            yield return ecran.DeposerPourTest("GENUINE_REPORT");
            Assert.IsNull(ecran.DerniereErreurDepot, $"le dépôt du premier jour a échoué : {ecran.DerniereErreurDepot}");
            Assert.IsNotNull(ecran.DernierRapport, "la réponse à 4 clés n'est pas arrivée");
            Assert.Greater(ecran.DernierRapport.cost_resolved, 0, "le prix est servi, même à un compte frais");
        }

        [UnityTest]
        public IEnumerator Depot_SansJeton_LeGesteEstRefuse_EtLeRefusEstDit()
        {
            // la garde de code « pas de cible / pas de jeton » : aucune requête ne part, et le refus est dit
            var ecran = Monter();
            yield return null;
            Assert.IsFalse(ecran.PeutDeposer, "sans jeton ni cible, le geste doit être fermé");
            yield return ecran.DeposerPourTest("GENUINE_REPORT");
            Assert.IsNull(ecran.DernierRapport, "aucune requête ne doit partir sans cible");
            Assert.IsNotNull(ecran.DerniereErreurDepot, "le refus est DIT, pas silencieux");
            Assert.AreEqual(0, ecran.RendusEffectues, "aucun chargement n'a eu lieu : le refus n'a pas rendu l'écran");
        }
    }
}
