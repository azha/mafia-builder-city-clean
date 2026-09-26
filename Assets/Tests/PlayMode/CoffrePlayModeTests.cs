using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Account.Profile;
using MafiaCleanCity.Account.Settings;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Onboarding;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // ⑲ « FERMER LE COFFRE », puis « ROUVRIR LE COFFRE » (décision f2 du 23/09 : aucune maquette ne dessine l'entrée — forme minimale) :
    //   K1  sans réseau : le shell FERME — plus de jeton, plus aucun locataire, la barre d'onglets éteinte, l'onglet au sentinel, et UN
    //       seul geste « Rouvrir le coffre » : aucun appel authentifié ne peut partir tant qu'il n'est pas touché
    //   K2  RÉEL (pile dev) : la sortie par ⑲ (`signed_out: true`) ferme le coffre ; « Rouvrir » rejoue le lancement, et le jeton est NEUF
    //   K3  D17 : les deux lignes « pas encore » portent l'INSÉCABLE U+00A0 servi, à l'octet (repli aligné sur la table 38 de l'atelier)
    [Category("Reglages")]
    public class CoffrePlayModeTests
    {
        private GameObject shellGo;
        private AppShell shell;
        private static int callsignSeq;
        private readonly List<GameObject> montes = new List<GameObject>();

        [TearDown]
        public void TearDown()
        {
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
            shell = null; shellGo = null;
            I18nCatalog.Oublier();
        }

        private static T Enfant<T>(Component racine, string nom) where T : Component =>
            racine.GetComponentsInChildren<Transform>(true).Where(t => t.name == nom).Select(t => t.GetComponent<T>())
                  .FirstOrDefault(c => c != null);

        /// <summary>SANS RÉSEAU : `CoffreFerme()` est appelé dans la MÊME frame que la création du shell — son `Start()` (qui signe)
        /// ne tourne jamais, le TearDown le détruit avant.</summary>
        [Test]
        public void K1_LeShellFermeLeCoffre_PlusAucunAppelNePeutPartir()
        {
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            shell.CoffreFerme();

            Assert.IsTrue(shell.CoffreFermeAffiche);
            Assert.IsNull(shell.Token, "le jeton révoqué est OUBLIÉ : aucun locataire ne peut plus le recevoir");
            Assert.IsNull(shell.MountedTenantGameObject, "aucun locataire ne vit");
            Assert.AreEqual((AppShell.Tab)(-1), shell.CurrentTab, "l'onglet revient au sentinel que le lancement rejoué attend");
            CanvasGroup barre = shell.TabBarRoot.GetComponent<CanvasGroup>();
            Assert.IsNotNull(barre);
            Assert.IsFalse(barre.interactable || barre.blocksRaycasts,
                "la barre d'onglets est éteinte : un onglet monterait un locataire qui, sans jeton, signerait lui-même");
            Transform panneau = shell.ContentSlot.Find("CoffreFerme");
            Assert.IsNotNull(panneau, "le coffre fermé se DIT");
            Assert.AreEqual(1, shell.ContentSlot.childCount, "rien d'autre dans la zone de contenu");
            CollectionAssert.Contains(panneau.GetComponentsInChildren<TextMeshProUGUI>(true).Select(t => t.text).ToArray(),
                "Le coffre est fermé.");
            Assert.IsNotNull(Enfant<Button>(panneau, "RouvrirLeCoffre"), "UN geste : « Rouvrir le coffre »");
            Assert.AreEqual(1, panneau.GetComponentsInChildren<Button>(true).Length, "et un seul");
        }

        /// <summary>RÉEL, au créneau : la sortie passe par ⑲ et le back ; la réouverture rejoue le lancement.</summary>
        [UnityTest]
        public IEnumerator K2_SortieReelle_PuisRouvrir_UnJetonNeuf()
        {
            // ⛔ UN COMPTE NEUF, JAMAIS LE COMPTE DE DÉMO (orchestrateur, créneau de 08:00) : ce test fait une VRAIE sortie
            // (`POST /v1/auth/signout`). Sur `operational_demo`, partagé par les suites qui tournent EN SÉRIE dans le même
            // processus, il changerait le régime d'un autre lot par un compte partagé. Compte jetable (classe C de la garde
            // `DemoIdentityResolverGuardPlayModeTests`), posé AVANT `Start()` ; le lancement rejoué le re-signe.
            var auth = new MafiaCleanCity.CityMap.AuthClient { BaseUrl = MafiaCleanCity.AdresseDuBack.Url };
            string callsign = MafiaCleanCity.Tests.SeederSupport.SafeCallsign("coffre", ref callsignSeq);
            const string password = "coffre-k2-pw";
            string err = null;
            yield return auth.SignUp(callsign, password, t => { }, e => err = e);
            Assert.IsNull(err, $"signup du compte jetable : {err}");

            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity(callsign, password);   // AVANT Start() — même frame que AddComponent
            float fin = Time.realtimeSinceStartup + 45f;
            while ((string.IsNullOrEmpty(shell.Token) || shell.MountedTenantGameObject == null) && Time.realtimeSinceStartup < fin)
                yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le lancement n'a pas signé : rien à fermer");
            string ancien = shell.Token;

            SettingsScreenController reglages = shell.MonterLocataireEnSurimpression<SettingsScreenController>();
            fin = Time.realtimeSinceStartup + 30f;
            while (reglages != null && reglages.RendusEffectues == 0 && Time.realtimeSinceStartup < fin) yield return null;
            Button fermer = Enfant<Button>(shell.ContentSlot, "FermerLeCoffre");
            Assert.IsNotNull(fermer, "⑲ montre « Fermer le coffre »");
            fermer.onClick.Invoke();
            fin = Time.realtimeSinceStartup + 20f;
            while (!shell.CoffreFermeAffiche && Time.realtimeSinceStartup < fin) yield return null;
            Assert.IsTrue(shell.CoffreFermeAffiche, "le back a répondu `signed_out: true` et le shell a fermé le coffre");
            Assert.AreEqual(ancien, shell.JetonAvantFermeture);
            Assert.IsNull(shell.Token);

            Button rouvrir = Enfant<Button>(shell.ContentSlot, "RouvrirLeCoffre");
            Assert.IsNotNull(rouvrir);
            rouvrir.onClick.Invoke();
            fin = Time.realtimeSinceStartup + 45f;
            while ((string.IsNullOrEmpty(shell.Token) || shell.MountedTenantGameObject == null) && Time.realtimeSinceStartup < fin)
                yield return null;
            Assert.IsFalse(shell.CoffreFermeAffiche);
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le lancement rejoué a signé");
            Assert.AreNotEqual(ancien, shell.Token, "le jeton est NEUF : l'ancien est révoqué");
            Assert.IsNotNull(shell.MountedTenantGameObject, "l'Accueil est remonté");
        }

        [Test]
        public void K3_LesLignesPasEncore_PortentLInsecableServi_ALOctet()
        {
            var go = new GameObject("Reglages", typeof(RectTransform));
            montes.Add(go);
            var e = go.AddComponent<SettingsScreenController>();
            e.RendrePourTest(new ProfilData { locale = "fr", meta_market_visibility_enabled = true }, new TutorielData());
            string ligne = e.GetComponentsInChildren<TextMeshProUGUI>(true).Select(t => t.text)
                            .First(t => t.Contains("toutes les sessions ouvertes"));
            string attendu = "pas encore : toutes les sessions ouvertes n’ont pas encore de guichet";
            Assert.AreEqual(BitConverter(attendu), BitConverter(ligne),
                "D17 : U+00A0 (c2 a0) avant « : », comme le fr servi (atelier 38) — un repli à espace ordinaire réintroduit la coupure");
            string effacer = e.GetComponentsInChildren<TextMeshProUGUI>(true).Select(t => t.text)
                              .First(t => t.Contains("ne plus jamais revenir"));
            StringAssert.Contains("« et ne plus jamais revenir »", effacer, "l'insécable à l'INTÉRIEUR des « »");
        }

        private static string BitConverter(string s) => string.Join(" ", Encoding.UTF8.GetBytes(s).Select(b => b.ToString("x2")));
    }
}
