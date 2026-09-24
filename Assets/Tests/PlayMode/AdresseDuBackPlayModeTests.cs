using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // L'URL DU BACK, UNE SOURCE (2026-09-24) — l'APK du 24/09 appelait localhost : 69 fichiers portaient leur propre défaut, le build
    // ne posait l'URL que sur l'AppShell de la scène, et la vérification lisait la scène. Garde de CLASSE, en trois temps :
    //   A1  contrôles de l'instrument (fixtures inertes)
    //   A2  aucune URL littérale sur les lignes actives d'Assets/Scripts hors la source (`AdresseDuBack.cs`, 1 : le défaut éditeur)
    //   A3  aucune ressource d'URL laissée dans le dépôt (un reste de build redirigerait les tests vers le VPS)
    //   A4  L'EFFET : sous une URL posée à la source, les écrans montés par le shell envoient leurs requêtes vers ELLE — un écouteur
    //       HTTP local les capture, écran par écran
    // Le quatrième temps, au build, est dans BuildScript.VerifierLApk (balayage de l'APK produit).
    [Category("AdresseDuBack")]
    public class AdresseDuBackPlayModeTests
    {
        private static readonly Regex Url = new Regex(@"localhost|https?://");
        private const string Source = "AdresseDuBack.cs";

        internal static List<string> Sites(string texte, string fichier)
        {
            var res = new List<string>();
            string[] lignes = MafiaCleanCity.CityMap.Tests.LitterauxNommesPlayModeTests.SansCommentaires(texte).Split('\n');
            for (int i = 0; i < lignes.Length; i++)
                if (Url.IsMatch(lignes[i])) res.Add($"{fichier}:{i + 1} {lignes[i].Trim()}");
            return res;
        }

        [Test]
        public void A1_LInstrumentVoitUneUrlLitterale()
        {
            Assert.AreEqual(1, Sites("public string BaseUrl = \"http://localhost\";", "x.cs").Count, "contrôle positif : le défaut client");
            Assert.AreEqual(1, Sites("[SerializeField] private string baseUrl = \"https://api.exemple.test\";", "x.cs").Count,
                "contrôle positif : une autre URL, en https");
            Assert.AreEqual(1, Sites("var c = new AuthClient { BaseUrl = \"http://127.0.0.1:8080\" };", "x.cs").Count,
                "contrôle positif : une URL posée à l'appel");
            Assert.AreEqual(0, Sites("// public string BaseUrl = \"http://localhost\";", "x.cs").Count, "contrôle négatif : un commentaire");
            Assert.AreEqual(0, Sites("/* http://localhost */ public string BaseUrl = AdresseDuBack.Url;", "x.cs").Count,
                "contrôle négatif : un commentaire de bloc, et la lecture de la source");
        }

        [Test]
        public void A2_AucuneUrlLitteraleHorsLaSource()
        {
            string[] fichiers = Directory.GetFiles(Path.Combine(Application.dataPath, "Scripts"), "*.cs", SearchOption.AllDirectories);
            Assert.Greater(fichiers.Length, 100, "anti-vacuité : le balayage voit le client");
            var sites = fichiers.SelectMany(f => Sites(File.ReadAllText(f), Path.GetFileName(f))).ToList();
            var hors = sites.Where(s => !s.StartsWith(Source + ":", StringComparison.Ordinal)).ToList();
            Assert.IsEmpty(hors, $"{hors.Count} URL littérale(s) hors de la source — un client ou un écran lit `AdresseDuBack.Url`, jamais " +
                                 "un défaut à lui : " + string.Join(" · ", hors));
            Assert.AreEqual(1, sites.Count(s => s.StartsWith(Source + ":", StringComparison.Ordinal)),
                "la source porte UN littéral, le défaut de l'éditeur (compilé sous UNITY_EDITOR seulement)");
        }

        [Test]
        public void A3_AucuneRessourceDUrlLaisseeDansLeDepot()
        {
            string chemin = Path.Combine(Application.dataPath, "Resources", AdresseDuBack.NomRessource + ".txt");
            Assert.IsFalse(File.Exists(chemin), chemin + " existe : un reste de build — les tests partiraient vers l'URL qu'elle porte");
            Assert.AreEqual("http://localhost", AdresseDuBack.Url, "l'éditeur, sans URL posée, lit son défaut");
        }

        // ── A4 : l'effet ────────────────────────────────────────────────────────────────────────────────────────────────

        private HttpListener ecouteur;
        private readonly List<string> recues = new List<string>();
        private GameObject shellGo;
        private AppShell shell;
        private HashSet<GameObject> racinesAvant;
        private (float haut, float bas)? insetsAvant;

        /// <summary>Toutes les racines vivantes : scène active ET `DontDestroyOnLoad` (lue par un témoin posé puis retiré).</summary>
        private static List<GameObject> Racines()
        {
            var r = UnityEngine.SceneManagement.SceneManager.GetActiveScene().GetRootGameObjects().ToList();
            var temoin = new GameObject("TemoinDDOL");
            Object.DontDestroyOnLoad(temoin);
            r.AddRange(temoin.scene.GetRootGameObjects().Where(g => g != temoin));
            Object.DestroyImmediate(temoin);
            return r;
        }

        [TearDown]
        public void TearDown()
        {
            LogAssert.ignoreFailingMessages = false;
            AdresseDuBack.Oublier();
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            shell = null; shellGo = null;
            // ⛔ TOUT CE QUE LE SHELL A CRÉÉ PART — mesuré au créneau du 24/09 : sans ce balayage, A4 laissait une racine à Canvas, et
            // l'écran ㉙ monté HORS shell juste après (EcranConflitE12, vert seul) bâtissait sous ELLE : « le bouton reste dans la
            // fenêtre masquée » rougissait. Un test qui monte le shell rend la scène comme il l'a trouvée, et nomme ce qu'il retire.
            // ⛔ ET SES STATIQUES : le shell PUBLIE ses marges (ShellChrome.PublierInsets) ; un écran monté hors shell ensuite (㉙
            // bâtit son corps entre `BottomInsetPx` et `TopInsetPx`) héritait des marges d'un shell détruit. Mesuré : la racine
            // retirée seule (EventSystem) laissait E12 rouge ; ce sont les marges. Rendues à leur valeur d'AVANT.
            if (insetsAvant.HasValue)
            {
                MafiaCleanCity.Shell.ShellChrome.PublierInsets(insetsAvant.Value.haut, insetsAvant.Value.bas);
                insetsAvant = null;
            }
            if (racinesAvant != null)
            {
                var restes = Racines().Where(g => g != null && !racinesAvant.Contains(g)).ToList();
                if (restes.Count > 0) Debug.Log("[AdresseDuBack] racines laissées par le shell, retirées : " + string.Join(", ", restes.Select(g => g.name)));
                foreach (GameObject g in restes) Object.DestroyImmediate(g);
                racinesAvant = null;
            }
            if (ecouteur != null) { try { ecouteur.Close(); } catch (ObjectDisposedException) { } ecouteur = null; }
            I18nCatalog.Oublier();
        }

        private static int PortLibre()
        {
            var l = new TcpListener(IPAddress.Loopback, 0);
            l.Start();
            int p = ((IPEndPoint)l.LocalEndpoint).Port;
            l.Stop();
            return p;
        }

        private void Ecouter()
        {
            if (ecouteur == null || !ecouteur.IsListening) return;
            try { ecouteur.BeginGetContext(Recu, null); } catch (Exception) { }
        }

        private void Recu(IAsyncResult ar)
        {
            try
            {
                HttpListenerContext ctx = ecouteur.EndGetContext(ar);
                string route = ctx.Request.Url.AbsolutePath;
                lock (recues) recues.Add(ctx.Request.HttpMethod + " " + route);
                // ⛔ LA SIGNATURE RÉUSSIT (jeton de test) : 9 écrans ne chargent RIEN sans session (`if (string.IsNullOrEmpty(token))
                // yield break`) — mesuré au premier run (Réputation muette). Le régime du téléphone est « signé » : on le reproduit.
                // Tout le reste rend 503 sans corps : chaque écran rend son état d'échec NOMMÉ, la mesure est la requête.
                if (ctx.Request.HttpMethod == "POST" && route == "/v1/auth/signin")
                {
                    byte[] corps = System.Text.Encoding.UTF8.GetBytes("{\"payload\":{\"data\":{\"access_token\":\"jeton-de-test\"}}}");
                    ctx.Response.StatusCode = 200;
                    ctx.Response.ContentType = "application/json";
                    ctx.Response.OutputStream.Write(corps, 0, corps.Length);
                }
                else ctx.Response.StatusCode = 503;
                ctx.Response.Close();
            }
            catch (Exception) { return; }
            Ecouter();
        }

        private int Nb() { lock (recues) return recues.Count; }
        private List<string> Vider() { lock (recues) { var c = recues.ToList(); recues.Clear(); return c; } }

        private static readonly (string nom, Func<AppShell, MonoBehaviour> monter)[] Ecrans =
        {
            ("LoiScreenController",          s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.LoiScreenController>()),
            ("ConflitScreenController",      s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.ConflitScreenController>()),
            ("DistributionScreenController", s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.DistributionScreenController>()),
            ("ReputationScreenController",   s => s.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.ReputationScreenController>()),
        };

        [UnityTest]
        public IEnumerator A4_LesEcransMontesParLeShell_EnvoientLeursRequetesALaSource()
        {
            racinesAvant = new HashSet<GameObject>(Racines());
            insetsAvant = (MafiaCleanCity.Shell.ShellChrome.TopInsetPx, MafiaCleanCity.Shell.ShellChrome.BottomInsetPx);
            LogAssert.ignoreFailingMessages = true;   // 503 partout : les erreurs réseau sont le bruit attendu, la mesure est la requête
            int port = PortLibre();
            ecouteur = new HttpListener();
            ecouteur.Prefixes.Add("http://127.0.0.1:" + port + "/");
            ecouteur.Start();
            Ecouter();
            AdresseDuBack.PoserPourTest("http://127.0.0.1:" + port);

            shellGo = new GameObject("ShellAdresseDuBack");
            shell = shellGo.AddComponent<AppShell>();
            float t0 = Time.realtimeSinceStartup;
            while (Nb() == 0 && Time.realtimeSinceStartup - t0 < 15f) yield return null;
            // Le shell lui-même : il signe vers la source (contrôle positif de l'écouteur — sans lui, « 0 requête » ne dirait rien).
            Assert.Greater(Nb(), 0, "le SHELL n'a émis aucune requête vers la source en 15 s — l'écouteur ne mesure rien");
            t0 = Time.realtimeSinceStartup;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup - t0 < 10f) yield return null;
            Assert.AreEqual("jeton-de-test", shell.Token, "le shell a signé auprès de l'écouteur : les écrans montés recevront SA session");
            t0 = Time.realtimeSinceStartup;
            int avant = -1;
            while (Time.realtimeSinceStartup - t0 < 10f && Nb() != avant) { avant = Nb(); float t = Time.realtimeSinceStartup; while (Time.realtimeSinceStartup - t < 1.5f) yield return null; }
            List<string> duShell = Vider();

            var muets = new List<string>();
            var vus = new List<string>();
            foreach (var (nom, monter) in Ecrans)
            {
                Vider();
                MonoBehaviour ecran = monter(shell);
                Assert.IsNotNull(ecran, nom + " : le shell n'a rien monté");
                float t = Time.realtimeSinceStartup;
                while (Nb() == 0 && Time.realtimeSinceStartup - t < 10f) yield return null;
                List<string> r = Vider();
                if (r.Count == 0) muets.Add(nom); else vus.Add(nom + " → " + string.Join(", ", r.Distinct()));
                Object.DestroyImmediate(ecran.gameObject);
                yield return null;
            }
            Debug.Log("[AdresseDuBack] shell → " + string.Join(", ", duShell.Distinct()) + " ‖ " + string.Join(" ‖ ", vus));
            Assert.IsEmpty(muets, $"{muets.Count} écran(s) monté(s) par le shell n'ont envoyé AUCUNE requête à la source (port {port}) — " +
                                  "ils lisent une autre URL : " + string.Join(", ", muets) + ". Vus : " + string.Join(" ‖ ", vus));
            Assert.GreaterOrEqual(vus.Count, 3, "au moins trois écrans montés à l'exécution sont mesurés");
        }
    }
}
