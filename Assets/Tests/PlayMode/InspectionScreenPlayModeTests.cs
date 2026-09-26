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
        private const string BaseUrl = "http://localhost";
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

        /// <summary>⛔ RÈGLE INVERSÉE LE 2026-09-26 (passe UX, table 63 v2, consigne f2) : « ne jamais cibler un bâtiment du joueur ».
        /// Les deux tests d'avant prouvaient l'inverse (D3 du 22/09 : la cible = le premier bâtiment du joueur, dépôt FONDÉ qui passe).
        /// La route n'accepte QUE les bâtiments du joueur (contrôle d'appartenance) : le geste n'a plus aucune cible légitime, il est
        /// CACHÉ, et aucune requête ne part. Le dépôt lui-même reste éprouvé côté back (suite E2E de la route).</summary>
        [UnityTest]
        public IEnumerator Depot_CompteSeme_JamaisUnBatimentDuJoueur_LeDepotEstCache()
        {
            yield return SeConnecterAuCompteSeme();
            var ecran = Monter();
            ecran.SetToken(token);
            yield return AttendreLeRendu(ecran);

            Assert.IsNull(ecran.Cible, "jamais un bâtiment du joueur : pas de cible");
            Assert.IsFalse(ecran.PeutDeposer, "sans cible, le geste est fermé");
            Assert.IsFalse(ecran.DepotVisible, "et CACHÉ — un geste sans cible légitime ne se montre pas");
            yield return ecran.DeposerPourTest("GENUINE_REPORT");
            Assert.IsNull(ecran.DernierRapport, "aucune requête ne part");
        }

        [UnityTest]
        public IEnumerator Depot_CompteFrais_AucuneFileOuverte_LeDepotEstCache()
        {
            yield return OuvrirUnCompteFrais();
            var ecran = Monter();
            ecran.SetToken(token);
            yield return AttendreLeRendu(ecran);

            Assert.IsTrue(ecran.EtatVide, "compte frais : aucune file ouverte");
            Assert.IsFalse(ecran.DepotVisible, "table 63 v2 : le dépôt est caché tant qu'aucune file n'est ouverte");
            Assert.IsNull(ecran.Cible, "et jamais un bâtiment du joueur");
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
